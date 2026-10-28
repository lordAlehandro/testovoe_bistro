import type { Field, Values } from '@/card';
import { isValidInn, isValidSnils } from './checksums';
import { today } from './format';

export const isVisible = (field: Field, values: Values) => !field.visibleIf || field.visibleIf(values);
const isRequired = (field: Field, values: Values) =>
  typeof field.required === 'function' ? field.required(values) : Boolean(field.required);
const isEmpty = (value: unknown) => value == null || (typeof value === 'string' && value.trim() === '');

/** Проверяет одно поле. Возвращает текст ошибки или null. */
function checkField(field: Field, value: unknown, values: Values): string | null {
  if (isEmpty(value)) return isRequired(field, values) ? 'Обязательное поле' : null;
  if (field.type === 'switch') return null;

  if (field.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'Введите число';
    if (field.min !== undefined && n < field.min) return `Не меньше ${field.min}`;
    if (field.max !== undefined && n > field.max) return `Не больше ${field.max}`;
    return null;
  }

  const text = String(value).trim();
  if (field.type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return 'Неверная дата';
    if (text < '1900-01-01') return 'Слишком ранняя дата';
    if (field.notFuture && text > today()) return 'Дата не может быть в будущем';
    return null;
  }
  if (text.length > (field.max ?? 200)) return `Не длиннее ${field.max ?? 200} символов`;
  if (field.mask && text.length !== field.mask.length) return 'Заполните полностью';
  if (field.pattern && !field.pattern[0].test(text)) return field.pattern[1];
  if (field.checksum === 'snils' && !isValidSnils(text)) return 'Неверное контрольное число СНИЛС';
  if (field.checksum === 'inn' && !isValidInn(text)) return 'Неверные контрольные цифры ИНН';
  return null;
}

/** Проверяет форму. Скрытые и только для чтения поля не проверяются. Возвращает { код поля: ошибка }. */
export function validate(fields: Field[], values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.readOnly || !isVisible(field, values)) continue;
    const error = checkField(field, values[field.code], values);
    if (error) errors[field.code] = error;
  }
  return errors;
}

/**
 * Данные для отправки на сервер: пустое — null («не указано», а не пустая строка),
 * скрытое условием поле — тоже null (иначе в базе осталось бы, например, дата смерти у живого),
 * числа — числами. Поля только для чтения не отправляются.
 */
export function cleanValues(fields: Field[], values: Values): Values {
  const result: Values = {};
  for (const field of fields) {
    if (field.readOnly) continue;
    const value = values[field.code];
    if (field.type === 'switch') result[field.code] = isVisible(field, values) && value === true;
    else if (!isVisible(field, values) || isEmpty(value)) result[field.code] = null;
    else if (field.type === 'number') result[field.code] = Number(value);
    else result[field.code] = typeof value === 'string' ? value.trim() : value;
  }
  return result;
}

/**
 * Значения для формы: из сохранённой записи или, для новой, значения по умолчанию из описания.
 * null превращается в '' — поля ввода React не умеют показывать null.
 */
export const formValues = (fields: Field[], record?: Values): Values =>
  Object.fromEntries(
    fields.map((f) => [f.code, (record ? record[f.code] : f.defaultValue) ?? (f.type === 'switch' ? false : '')]),
  );
