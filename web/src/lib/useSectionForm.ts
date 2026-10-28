import { useForm, type Resolver } from 'react-hook-form';
import { fieldsOf, type Section, type Values } from '@/card';
import { cleanValues, validate } from './validate';

/**
 * Форма раздела на React Hook Form. Проверка — по описанию полей (validate),
 * а в обработчик сохранения приходят уже очищенные данные (cleanValues).
 */
export function useSectionForm(section: Section, initial: Values) {
  const fields = fieldsOf(section);
  const resolver: Resolver<Values> = (values) => {
    const errors = validate(fields, values);
    return Object.keys(errors).length
      ? { values: {}, errors: Object.fromEntries(Object.entries(errors).map(([code, message]) => [code, { type: 'validate', message }])) }
      : { values: cleanValues(fields, values), errors: {} };
  };
  return useForm<Values>({ defaultValues: initial, resolver });
}
