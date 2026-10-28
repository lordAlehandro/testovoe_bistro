import { useColorScheme } from '@mui/material/styles';

/**
 * Цвета серий графиков — первые слоты проверенной категориальной палитры.
 * Порядок важен: соседние цвета различимы и при дальтонизме. Цвет закреплён за сущностью, а не за местом.
 * Для тёмной темы — свои ступени тех же оттенков, проверенные на тёмном фоне карточки.
 */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'] as const;
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'] as const;

/** Цвета серий для текущей темы. */
export function useSeriesColors() {
  return useColorScheme().colorScheme === 'dark' ? SERIES_DARK : SERIES_LIGHT;
}
