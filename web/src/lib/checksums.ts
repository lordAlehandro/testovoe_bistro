/**
 * Контрольные суммы СНИЛС и ИНН — ловят опечатку в номере ещё в форме.
 *
 * СНИЛС 'XXX-XXX-XXX YY': каждую из 9 цифр номера умножаем на её позицию с конца (9…1) и складываем.
 * Сумма < 100 — это и есть контрольное число; 100 и 101 — «00»; больше — остаток от деления на 101
 * (если вышло 100 — тоже «00»). Номера до 001-001-998 выдавались без контрольного числа.
 */
export function isValidSnils(value: string): boolean {
  const match = /^(\d{3})-(\d{3})-(\d{3}) (\d{2})$/.exec(value);
  if (!match) return false;
  const number = `${match[1]}${match[2]}${match[3]}`;
  if (Number(number) <= 1_001_998) return true;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(number[i]) * (9 - i);
  const control = sum < 100 ? sum : sum <= 101 ? 0 : sum % 101 === 100 ? 0 : sum % 101;
  return control === Number(match[4]);
}

/**
 * ИНН: 12 цифр у физлица (две контрольные), 10 у организации (одна).
 * Контрольная цифра = (Σ цифра × вес) mod 11 mod 10.
 */
export function isValidInn(value: string): boolean {
  if (!/^\d{10}$|^\d{12}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const control = (weights: number[]) => (weights.reduce((sum, w, i) => sum + w * digits[i]!, 0) % 11) % 10;

  if (digits.length === 10) return control([2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[9];
  return control([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[10] && control([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[11];
}
