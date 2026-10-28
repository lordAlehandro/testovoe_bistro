import { Router } from 'express';
import { db } from './db.js';

/**
 * Запросы дашборда: каждый возвращает готовый для графика набор строк.
 * Регионы и категории приходят кодами — подписи к ним подставляет фронт из своих справочников.
 */
const ACTIVE = `record_status = 'active'`;

const QUERIES = {
  kpi: `
    SELECT count(*) FILTER (WHERE ${ACTIVE}) AS active,
           count(*) AS total,
           count(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS "newThisMonth",
           count(*) FILTER (WHERE created_at >= date_trunc('month', now()) - interval '1 month'
                              AND created_at < date_trunc('month', now())) AS "newPrevMonth",
           round(avg(date_part('year', age(birth_date))) FILTER (WHERE ${ACTIVE})::numeric, 1)::float AS "avgAge",
           count(*) FILTER (WHERE ${ACTIVE} AND disability_group IS NOT NULL) AS disabled
    FROM citizen`,

  // Новые записи по месяцам за год. generate_series даёт все месяцы, даже пустые, — на графике не будет дыр.
  growth: `
    SELECT to_char(m, 'YYYY-MM') AS month, count(c.id) AS count
    FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
    LEFT JOIN citizen c ON date_trunc('month', c.created_at) = m
    GROUP BY m ORDER BY m`,

  // Пирамида: десятилетние группы, 80+ — одной группой.
  agePyramid: `
    SELECT least(floor(date_part('year', age(birth_date)) / 10) * 10, 80)::int AS "ageFrom",
           count(*) FILTER (WHERE sex = 'M') AS male, count(*) FILTER (WHERE sex = 'F') AS female
    FROM citizen WHERE ${ACTIVE} GROUP BY 1 ORDER BY 1`,

  regions: `SELECT region_code AS code, count(*) AS count FROM citizen WHERE ${ACTIVE} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,

  categories: `SELECT coalesce(social_category, 'none') AS code, count(*) AS count FROM citizen WHERE ${ACTIVE} GROUP BY 1 ORDER BY 2 DESC`,
};

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', async (_req, res) => {
  const entries = await Promise.all(
    Object.entries(QUERIES).map(async ([key, sql]) => [key, (await db.query(sql)).rows] as const),
  );
  const result = Object.fromEntries(entries);
  res.json({ ...result, kpi: result.kpi?.[0] });
});
