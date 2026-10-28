import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: string;
  icon: ReactNode;
  /** Цвет иконки из палитры темы. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Пояснение или сравнение под числом. */
  footer?: ReactNode;
};

/**
 * Плитка с одним главным числом. Когда ответ — одно число, график не нужен:
 * число и есть «график» (столбик из одного значения ничего не добавляет).
 */
export function StatTile({ label, value, icon, color = 'primary', footer }: Props) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>{value}</Typography>
        </Box>
        {/* Полупрозрачная подложка через CSS-переменную — сама подстраивается под светлую и тёмную тему. */}
        <Avatar variant="rounded" sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: (t) => t.alpha((t.vars ?? t).palette[color].main, 0.12), color: `${color}.main` }}>
          {icon}
        </Avatar>
      </Stack>
      {footer && <Box sx={{ mt: 1 }}>{footer}</Box>}
    </Card>
  );
}
