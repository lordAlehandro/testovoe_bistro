import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { citizensRouter } from './citizens.js';
import { dashboardRouter } from './dashboard.js';
import { HttpError } from './db.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', citizensRouter);
app.use('/api', dashboardRouter);
app.use((_req, res) => res.status(404).json({ error: { message: 'Маршрут не найден' } }));

/** Все ошибки — в одном формате { error: { message } }, чтобы форма могла показать текст. */
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const send = (status: number, message: string) => res.status(status).json({ error: { message } });
  if (err instanceof HttpError) return send(err.status, err.message);
  if (err instanceof z.ZodError) return send(400, 'Неверные параметры запроса');
  // Коды PostgreSQL: 23505 — нарушена уникальность, 23xxx — другие ограничения, 22xxx — неверный формат значения.
  const code = String((err as { code?: string }).code ?? '');
  if (code === '23505') return send(409, 'СНИЛС, ИНН или полис уже есть у другого гражданина');
  if (code.startsWith('23') || code.startsWith('22')) return send(400, 'Данные не прошли проверку: не заполнено обязательное поле или неверная дата / формат');
  console.error(err);
  return send(500, 'Внутренняя ошибка сервера');
};
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API слушает порт ${port}`));
