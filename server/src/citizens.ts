import { Router } from 'express';
import { z } from 'zod';
import { db, HttpError } from './db.js';

/**
 * Таблицы и колонки, которые можно менять через API. Имя колонки попадает в SQL,
 * поэтому подставлять можно только то, что перечислено здесь. Должно совпадать с web/src/card.ts.
 */
const COLUMNS: Record<string, string[]> = {
  citizen: ['last_name', 'first_name', 'middle_name', 'sex', 'birth_date', 'birth_place', 'death_date', 'citizenship_code',
    'marital_status', 'snils', 'inn', 'oms_policy', 'region_code', 'social_category', 'disability_group', 'record_status', 'note'],
  identity_document: ['doc_type', 'series', 'number', 'issued_by', 'division_code', 'issued_date', 'expires_date', 'is_primary'],
  address: ['kind', 'postal_code', 'region_code', 'locality', 'street', 'house', 'apartment'],
  contact: ['kind', 'value', 'is_primary'],
  family_member: ['relation', 'last_name', 'first_name', 'middle_name', 'birth_date', 'phone', 'is_dependent'],
  education: ['level', 'institution', 'specialty_code', 'specialty_name', 'start_year', 'end_year', 'is_completed', 'diploma_number', 'with_honors'],
};

/** Разделы-таблицы карточки: имя в адресе API → таблица в БД. */
const SECTIONS: Record<string, string> = {
  documents: 'identity_document',
  addresses: 'address',
  contacts: 'contact',
  family: 'family_member',
  education: 'education',
};

/**
 * Берёт из тела запроса только известные колонки таблицы. Пустая строка — это «не указано» (null).
 * Остальные проверки (обязательность, формат СНИЛС и т. п.) делает форма и ограничения в БД.
 */
function pickColumns(table: string, body: unknown) {
  const allowed = COLUMNS[table]!;
  const entries = Object.entries(z.record(z.string(), z.unknown()).parse(body))
    .filter(([key]) => allowed.includes(key))
    .map(([key, value]) => [key, value === '' ? null : value] as const);
  if (!entries.length) throw new HttpError(400, 'Нет данных для сохранения');
  return { names: entries.map(([key]) => `"${key}"`), values: entries.map(([, value]) => value) };
}

/** Неверный id — это «не найдено» (404), а не ошибка сервера: иначе PostgreSQL ответит ошибкой приведения типа. */
function parseId(value: string | undefined) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(404, 'Запись не найдена');
  }
  return value;
}
const csv = z.string().transform((v) => v.split(',').filter(Boolean)).optional();

const listQuery = z.object({
  search: z.string().trim().optional(),
  sex: z.enum(['M', 'F']).optional(),
  region: csv,
  category: csv,
  status: z.enum(['active', 'archived', 'deceased', 'moved']).optional(),
  birthFrom: z.iso.date().optional(),
  birthTo: z.iso.date().optional(),
  sort: z.enum(['name', 'birth_date', 'number', 'created']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

const SORT_SQL = { name: 'last_name, first_name', birth_date: 'birth_date', number: 'personal_number', created: 'created_at' };

export const citizensRouter = Router();

/* ------------------------------- картотека ------------------------------- */

citizensRouter.get('/citizens', async (req, res) => {
  const q = listQuery.parse(req.query);
  const where: string[] = [];
  const params: unknown[] = [];
  const param = (value: unknown) => `$${params.push(value)}`;

  if (q.search) {
    // Одна строка поиска: ФИО (по триграммному индексу), СНИЛС или учётный номер.
    const like = param(`%${q.search.toLowerCase()}%`);
    where.push(`(full_name_search LIKE ${like} OR snils LIKE ${like} OR personal_number::text = ${param(q.search)})`);
  }
  if (q.sex) where.push(`sex = ${param(q.sex)}`);
  if (q.region?.length) where.push(`region_code = ANY(${param(q.region)})`);
  if (q.category?.length) where.push(`social_category = ANY(${param(q.category)})`);
  if (q.status) where.push(`record_status = ${param(q.status)}`);
  if (q.birthFrom) where.push(`birth_date >= ${param(q.birthFrom)}`);
  if (q.birthTo) where.push(`birth_date <= ${param(q.birthTo)}`);
  const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Список и общее число — двумя запросами параллельно. id в сортировке делает порядок устойчивым.
  const [items, count] = await Promise.all([
    db.query(
      `SELECT id, personal_number, last_name, first_name, middle_name, sex, birth_date, region_code,
              social_category, record_status, snils,
              (SELECT value FROM contact WHERE citizen_id = c.id AND is_primary LIMIT 1) AS phone
       FROM citizen c ${filter}
       ORDER BY ${SORT_SQL[q.sort]} ${q.order}, id
       LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
      params,
    ),
    db.query(`SELECT count(*) AS total FROM citizen ${filter}`, params),
  ]);
  res.json({ items: items.rows, total: count.rows[0].total });
});

/* ---------------------------- основные сведения ---------------------------- */

// Количество записей в разделах — для счётчиков на вкладках карточки.
const COUNTS_SQL = `SELECT json_build_object(${Object.entries(SECTIONS)
  .map(([key, table]) => `'${key}', (SELECT count(*) FROM ${table} WHERE citizen_id = $1)`)
  .join(', ')}) AS counts`;

citizensRouter.get('/citizens/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const [{ rows }, counts] = await Promise.all([
    db.query('SELECT * FROM citizen WHERE id = $1', [id]),
    db.query(COUNTS_SQL, [id]),
  ]);
  if (!rows[0]) throw new HttpError(404, 'Гражданин не найден');
  res.json({ citizen: rows[0], counts: counts.rows[0].counts });
});

citizensRouter.post('/citizens', async (req, res) => {
  const { names, values } = pickColumns('citizen', req.body);
  const { rows } = await db.query(
    `INSERT INTO citizen (${names.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    values,
  );
  res.status(201).json({ citizen: rows[0] });
});

citizensRouter.put('/citizens/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { names, values } = pickColumns('citizen', req.body);
  const { rows } = await db.query(
    `UPDATE citizen SET ${names.map((n, i) => `${n} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
    [id, ...values],
  );
  if (!rows[0]) throw new HttpError(404, 'Гражданин не найден');
  res.json({ citizen: rows[0] });
});

/* ---------------------------- разделы-таблицы ---------------------------- */

/** Таблица раздела по имени из адреса; неизвестный раздел — 404. */
function sectionTable(name: string | undefined) {
  const table = SECTIONS[name ?? ''];
  if (!table) throw new HttpError(404, 'Раздел не найден');
  return table;
}

citizensRouter.get('/citizens/:id/:section', async (req, res) => {
  const table = sectionTable(req.params.section);
  const { rows } = await db.query(`SELECT * FROM ${table} WHERE citizen_id = $1 ORDER BY created_at, id`, [
    parseId(req.params.id),
  ]);
  res.json({ items: rows });
});

citizensRouter.post('/citizens/:id/:section', async (req, res) => {
  const table = sectionTable(req.params.section);
  const { names, values } = pickColumns(table, req.body);
  const { rows } = await db.query(
    `INSERT INTO ${table} (citizen_id, ${names.join(', ')})
     VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING *`,
    [parseId(req.params.id), ...values],
  );
  res.status(201).json({ item: rows[0] });
});
