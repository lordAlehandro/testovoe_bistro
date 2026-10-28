/** Форматирование значений для отображения — в одном месте, чтобы формат был везде одинаковым. */

/** '1990-05-01' или ISO-время → '01.05.1990'. */
export function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

/** Сегодняшняя дата в формате 'YYYY-MM-DD' по местному времени (не UTC). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Полных лет на сегодня. */
export function ageOf(birthDate: string): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  const now = new Date();
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  return now.getFullYear() - y - (hadBirthday ? 0 : 1);
}

/** Правильное окончание: plural(5, ['год', 'года', 'лет']) → 'лет'. */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const formatAge = (birthDate: string) => {
  const age = ageOf(birthDate);
  return `${age} ${plural(age, ['год', 'года', 'лет'])}`;
};

export const formatNumber = (value: number) => value.toLocaleString('ru-RU');

type Person = { last_name: string; first_name: string; middle_name?: string | null };
export const fullName = (p: Person) => [p.last_name, p.first_name, p.middle_name].filter(Boolean).join(' ');
/** Инициалы для аватара: «Иванов Пётр» → «ИП». */
export const initials = (p: Person) => `${p.last_name[0] ?? ''}${p.first_name[0] ?? ''}`;

/**
 * Применяет маску к вводу: 0 — место для цифры, остальные символы вставляются сами.
 * applyMask('11223344595', '000-000-000 00') → '112-233-445 95'.
 */
export function applyMask(raw: string, mask: string): string {
  const digits = raw.replace(/\D/g, '');
  let result = '';
  let i = 0;
  for (const char of mask) {
    if (i >= digits.length) break;
    result += char === '0' ? digits[i++] : char;
  }
  return result;
}

/** Скрывает персональные данные, оставляя последние 2 цифры: '112-233-445 95' → '•••-•••-••• 95'. */
export const maskSensitive = (value: string) => value.slice(0, -2).replace(/\d/g, '•') + value.slice(-2);

/** 'YYYY-MM' → 'окт 25' — подпись месяца на графиках. */
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const name = new Date(year, m - 1, 1).toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
  return `${name} ${String(year).slice(2)}`;
}
