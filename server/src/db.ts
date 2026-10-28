import pg from 'pg';

// Дата (тип 1082) остаётся строкой '1990-05-01': объект Date «съехал» бы на сутки из-за часового пояса.
pg.types.setTypeParser(1082, (value) => value);
// count(*) и bigint (тип 20) — числом, а не строкой: до 2^53 у нас не дойдёт.
pg.types.setTypeParser(20, (value) => Number(value));

/** Пул соединений: соединения переиспользуются, а не открываются на каждый запрос. */
export const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/registry',
  max: 10,
});

/** Ошибка, которую можно показать пользователю: код ответа + текст. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
