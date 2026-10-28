import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Values } from '@/card';

/** Запрос к API. Путь без /api: api('/citizens'). */
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message ?? 'Сервер недоступен');
  return data as T;
}

/* --------------------------------- типы --------------------------------- */

export type CitizenRow = {
  id: string;
  personal_number: number;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  sex: 'M' | 'F';
  birth_date: string;
  region_code: string;
  social_category: string | null;
  record_status: string;
  snils: string | null;
  phone: string | null;
};

export type Citizen = Values & CitizenRow;

/** Фильтры картотеки — те же имена, что в запросе к API. */
export type ListParams = Record<string, string>;

/* --------------------------------- хуки --------------------------------- */

export function useCitizenList(params: ListParams) {
  return useQuery({
    queryKey: ['citizens', params],
    queryFn: () => api<{ items: CitizenRow[]; total: number }>(`/citizens?${new URLSearchParams(params)}`),
    // Пока грузится следующая страница, показываем предыдущую — таблица не «мигает».
    placeholderData: keepPreviousData,
  });
}

export function useCitizen(id: string) {
  return useQuery({
    queryKey: ['citizen', id],
    queryFn: () => api<{ citizen: Citizen; counts: Record<string, number> }>(`/citizens/${id}`),
  });
}

export function useSectionRows(id: string, section: string) {
  return useQuery({
    queryKey: ['citizen', id, section],
    queryFn: () => api<{ items: Values[] }>(`/citizens/${id}/${section}`).then((r) => r.items),
  });
}

/**
 * Сохранение: правка основных сведений (section = 'main') или новая запись раздела-таблицы.
 * После успеха сбрасываем кэш гражданина (счётчики вкладок) и картотеки — данные перечитаются.
 */
export function useSave(id: string, section: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: Values) =>
      section === 'main' ? api(`/citizens/${id}`, 'PUT', values) : api(`/citizens/${id}/${section}`, 'POST', values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['citizen', id] });
      void client.invalidateQueries({ queryKey: ['citizens'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
