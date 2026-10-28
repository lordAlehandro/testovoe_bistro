import {
  COUNTRY, DOC_TYPE, EDUCATION_LEVEL, MARITAL_STATUS, RECORD_STATUS, REGION, SEX, SOCIAL_CATEGORY, type Option,
} from './dicts';

/**
 * Описание карточки гражданина: разделы и их поля.
 * Форма, просмотр, таблица раздела и проверки строятся по этому описанию одним кодом,
 * поэтому новое поле — это строка здесь и колонка в БД, без новой вёрстки.
 * Коды полей совпадают с колонками таблиц из server/db/01_schema.sql.
 */
export type Values = Record<string, unknown>;

export type Field = {
  code: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'radio' | 'switch' | 'masked';
  options?: Option[];
  /** Маска ввода: 0 — цифра, остальное вставляется само ('000-000-000 00'). */
  mask?: string;
  /** Ширина в колонках сетки из 12. */
  cols?: number;
  required?: boolean | ((values: Values) => boolean);
  /** Поле видно, только если условие выполнено; скрытое поле не проверяется и сохраняется пустым. */
  visibleIf?: (values: Values) => boolean;
  pattern?: [RegExp, string];
  checksum?: 'snils' | 'inn';
  min?: number;
  max?: number;
  notFuture?: boolean;
  /** Персональные данные: в режиме просмотра скрыты точками. */
  sensitive?: boolean;
  readOnly?: boolean;
  /** Колонка в таблице раздела. */
  inList?: boolean;
  defaultValue?: unknown;
  hint?: string;
};

export type Section = {
  /** Имя раздела в API: /api/citizens/:id/<key>. У «Основных сведений» — 'main'. */
  key: string;
  title: string;
  /** true — раздел-таблица (много записей), false — одна форма. */
  table: boolean;
  groups: { title?: string; fields: Field[] }[];
};

/* Короткие помощники, чтобы описание читалось как анкета. */
type Opts = Partial<Field>;
const text = (code: string, label: string, o: Opts = {}): Field => ({ code, label, type: 'text', cols: 4, ...o });
const area = (code: string, label: string, o: Opts = {}): Field => ({ code, label, type: 'textarea', cols: 12, ...o });
const date = (code: string, label: string, o: Opts = {}): Field => ({ code, label, type: 'date', cols: 4, ...o });
const num = (code: string, label: string, o: Opts = {}): Field => ({ code, label, type: 'number', cols: 4, ...o });
const flag = (code: string, label: string, o: Opts = {}): Field => ({ code, label, type: 'switch', cols: 4, ...o });
const list = (code: string, label: string, options: Option[], o: Opts = {}): Field => ({ code, label, type: 'select', options, cols: 4, ...o });
const masked = (code: string, label: string, mask: string, o: Opts = {}): Field => ({ code, label, type: 'masked', mask, cols: 4, ...o });

const CYRILLIC: [RegExp, string] = [/^[А-ЯЁа-яё\- ]+$/, 'Только русские буквы, пробел и дефис'];

export const MAIN: Section = {
  key: 'main', title: 'Основные сведения', table: false,
  groups: [
    {
      title: 'Личные данные',
      fields: [
        text('last_name', 'Фамилия', { required: true, pattern: CYRILLIC }),
        text('first_name', 'Имя', { required: true, pattern: CYRILLIC }),
        text('middle_name', 'Отчество', { pattern: CYRILLIC }),
        { ...list('sex', 'Пол', SEX, { required: true }), type: 'radio' },
        date('birth_date', 'Дата рождения', { required: true, notFuture: true }),
        text('birth_place', 'Место рождения'),
      ],
    },
    {
      title: 'Гражданство и статус',
      fields: [
        list('citizenship_code', 'Гражданство', COUNTRY, { required: true, defaultValue: 'RU' }),
        list('marital_status', 'Семейное положение', MARITAL_STATUS),
        list('region_code', 'Регион проживания', REGION, { required: true }),
        list('social_category', 'Социальная категория', SOCIAL_CATEGORY),
        list('disability_group', 'Группа инвалидности', [['1', 'I группа'], ['2', 'II группа'], ['3', 'III группа']]),
        list('record_status', 'Статус записи', RECORD_STATUS, { required: true, defaultValue: 'active' }),
        date('death_date', 'Дата смерти', {
          notFuture: true,
          visibleIf: (v) => v.record_status === 'deceased',
          required: (v) => v.record_status === 'deceased',
        }),
      ],
    },
    {
      title: 'Идентификаторы',
      fields: [
        num('personal_number', 'Учётный номер', { readOnly: true }),
        masked('snils', 'СНИЛС', '000-000-000 00', { checksum: 'snils', sensitive: true }),
        masked('inn', 'ИНН', '000000000000', { checksum: 'inn', sensitive: true }),
        masked('oms_policy', 'Полис ОМС', '0000000000000000', { sensitive: true }),
      ],
    },
    {
      title: 'Дополнительно',
      fields: [
        area('note', 'Примечание', { max: 2000 }),
      ],
    },
  ],
};

/** Разделы-таблицы: у человека может быть несколько документов, адресов, членов семьи… */
export const TABLE_SECTIONS: Section[] = [
  {
    key: 'documents', title: 'Документы', table: true,
    groups: [{
      fields: [
        list('doc_type', 'Вид документа', DOC_TYPE, { required: true, cols: 6, inList: true }),
        text('series', 'Серия', { cols: 3, inList: true }),
        text('number', 'Номер', { required: true, cols: 3, inList: true }),
        area('issued_by', 'Кем выдан', { inList: true }),
        masked('division_code', 'Код подразделения', '000-000'),
        date('issued_date', 'Дата выдачи', { notFuture: true, inList: true }),
        date('expires_date', 'Действителен до'),
        flag('is_primary', 'Основной документ', { inList: true, defaultValue: false }),
      ],
    }],
  },
  {
    key: 'addresses', title: 'Адреса', table: true,
    groups: [{
      fields: [
        list('kind', 'Тип адреса', [
          ['registration', 'Регистрации'], ['residence', 'Проживания'], ['temporary', 'Временной регистрации'], ['postal', 'Почтовый'],
        ], { required: true, inList: true }),
        masked('postal_code', 'Индекс', '000000', { cols: 2 }),
        list('region_code', 'Регион', REGION, { required: true, cols: 6, inList: true }),
        text('locality', 'Населённый пункт', { required: true, inList: true }),
        text('street', 'Улица', { inList: true }),
        text('house', 'Дом', { cols: 2, inList: true }),
        text('apartment', 'Квартира', { cols: 2, inList: true }),
      ],
    }],
  },
  {
    key: 'contacts', title: 'Контакты', table: true,
    groups: [{
      fields: [
        list('kind', 'Тип', [
          ['mobile', 'Мобильный'], ['home_phone', 'Домашний'], ['work_phone', 'Рабочий'], ['email', 'E-mail'], ['telegram', 'Telegram'],
        ], { required: true, inList: true }),
        text('value', 'Значение', { required: true, inList: true }),
        flag('is_primary', 'Основной', { inList: true, defaultValue: false }),
      ],
    }],
  },
  {
    key: 'family', title: 'Семья', table: true,
    groups: [{
      fields: [
        list('relation', 'Степень родства', [
          ['spouse', 'Супруг(а)'], ['child', 'Ребёнок'], ['parent', 'Родитель'], ['sibling', 'Брат / сестра'],
          ['grandparent', 'Бабушка / дедушка'], ['grandchild', 'Внук / внучка'], ['guardian', 'Опекун'], ['ward', 'Подопечный'], ['other', 'Другое'],
        ], { required: true, inList: true }),
        text('last_name', 'Фамилия', { required: true, pattern: CYRILLIC, inList: true }),
        text('first_name', 'Имя', { required: true, pattern: CYRILLIC, inList: true }),
        text('middle_name', 'Отчество', { pattern: CYRILLIC }),
        date('birth_date', 'Дата рождения', { notFuture: true, inList: true }),
        masked('phone', 'Телефон', '+7 (000) 000-00-00'),
        flag('is_dependent', 'На иждивении', { inList: true, defaultValue: false }),
      ],
    }],
  },
  {
    key: 'education', title: 'Образование', table: true,
    groups: [{
      fields: [
        list('level', 'Уровень', EDUCATION_LEVEL, { required: true, cols: 6, inList: true }),
        text('institution', 'Учебное заведение', { required: true, cols: 6, inList: true }),
        masked('specialty_code', 'Код специальности (ОКСО)', '00.00.00', { cols: 6 }),
        text('specialty_name', 'Специальность', { cols: 6, inList: true }),
        num('start_year', 'Год поступления', { min: 1940, max: 2100 }),
        num('end_year', 'Год окончания', { min: 1940, max: 2100, inList: true }),
        flag('is_completed', 'Окончено', { defaultValue: true }),
        text('diploma_number', 'Номер диплома', { visibleIf: (v) => v.is_completed === true }),
        flag('with_honors', 'С отличием', { defaultValue: false, visibleIf: (v) => v.is_completed === true }),
      ],
    }],
  },
];

/** Все поля раздела одним списком. */
export const fieldsOf = (section: Section) => section.groups.flatMap((g) => g.fields);
