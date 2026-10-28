import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import AccessibleIcon from '@mui/icons-material/AccessibleOutlined';
import CakeIcon from '@mui/icons-material/CakeOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddAltOutlined';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { useQuery } from '@tanstack/react-query';
import { ChartCard } from '@/components/ChartCard';
import { StatTile } from '@/components/StatTile';
import { labelOf, REGION, SOCIAL_CATEGORY } from '@/dicts';
import { api } from '@/lib/api';
import { useSeriesColors } from '@/lib/chart-colors';
import { formatNumber, monthLabel } from '@/lib/format';

type Counted = { code: string; count: number };
type Dashboard = {
  kpi: { active: number; total: number; newThisMonth: number; newPrevMonth: number; avgAge: number; disabled: number };
  growth: { month: string; count: number }[];
  agePyramid: { ageFrom: number; male: number; female: number }[];
  regions: Counted[];
  categories: Counted[];
};

const fmt = (value: number | null) => (value === null ? '' : formatNumber(Math.abs(value)));
const ageLabel = (from: number) => (from >= 80 ? '80+' : `${from}–${from + 9}`);
const CATEGORY = [...SOCIAL_CATEGORY, ['none', 'Не указана']] as [string, string][];

// Зелёный «рост»: в светлой теме темнее (иначе мелкий текст плохо читается на белом), в тёмной — обычный.
const growthUp: SxProps<Theme> = (t) => ({
  color: (t.vars ?? t).palette.success.dark,
  ...t.applyStyles('dark', { color: (t.vars ?? t).palette.success.main }),
});

/** Главная: ключевые показатели по картотеке граждан. */
export function DashboardPage() {
  const SERIES = useSeriesColors();
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/dashboard') });
  if (!data) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 10 }} />;

  const { kpi } = data;
  const growth = kpi.newPrevMonth ? Math.round(((kpi.newThisMonth - kpi.newPrevMonth) / kpi.newPrevMonth) * 100) : 0;
  const months = data.growth.map((m) => monthLabel(m.month));
  // Пирамида: сверху старшие, мужчины — влево (отрицательные значения), подписи — по модулю.
  const pyramid = [...data.agePyramid].reverse();

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Дашборд</Typography>
        <Typography color="text.secondary">Сводка по картотеке на {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</Typography>
      </Box>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile label="Граждан в картотеке" value={formatNumber(kpi.active)} icon={<PeopleIcon />}
            footer={<Typography variant="caption" color="text.secondary">действующих из {formatNumber(kpi.total)} записей</Typography>} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile label="Новых записей за месяц" value={formatNumber(kpi.newThisMonth)} icon={<PersonAddIcon />} color="secondary"
            footer={<Typography variant="caption" sx={growth >= 0 ? growthUp : { color: 'error.main' }}>
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% к прошлому месяцу
            </Typography>} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile label="Средний возраст" value={`${kpi.avgAge} лет`} icon={<CakeIcon />} color="success"
            footer={<Typography variant="caption" color="text.secondary">по действующим записям</Typography>} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile label="С инвалидностью" value={formatNumber(kpi.disabled)} icon={<AccessibleIcon />} color="warning"
            footer={<Typography variant="caption" color="text.secondary">
              {((kpi.disabled / Math.max(kpi.active, 1)) * 100).toFixed(1)}% от действующих
            </Typography>} />
        </Grid>

        <Grid size={12}>
          <ChartCard title="Новые записи в картотеке" subtitle="По месяцам за год"
            table={{ columns: ['Месяц', 'Записей'], rows: data.growth.map((m, i) => [months[i]!, m.count]) }}>
            <LineChart height={300} grid={{ horizontal: true }} hideLegend
              xAxis={[{ scaleType: 'point', data: months }]}
              yAxis={[{ width: 56, valueFormatter: fmt }]}
              series={[{ data: data.growth.map((m) => m.count), label: 'Новых записей', color: SERIES[0], area: true, showMark: false, valueFormatter: fmt }]}
              sx={{ '& .MuiAreaElement-root': { fillOpacity: 0.12 } }}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Половозрастной состав" subtitle="Действующие записи"
            table={{ columns: ['Возраст', 'Мужчины', 'Женщины'], rows: data.agePyramid.map((g) => [ageLabel(g.ageFrom), g.male, g.female]) }}>
            <BarChart height={300} layout="horizontal" grid={{ vertical: true }} borderRadius={4}
              yAxis={[{ scaleType: 'band', data: pyramid.map((g) => ageLabel(g.ageFrom)), width: 48, categoryGapRatio: 0.3 }]}
              xAxis={[{ valueFormatter: fmt }]}
              series={[
                { data: pyramid.map((g) => -g.male), label: 'Мужчины', color: SERIES[0], stack: 'sex', valueFormatter: fmt },
                { data: pyramid.map((g) => g.female), label: 'Женщины', color: SERIES[1], stack: 'sex', valueFormatter: fmt },
              ]}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ChartCard title="Социальные категории" subtitle="Действующие записи"
            table={{ columns: ['Категория', 'Граждан'], rows: data.categories.map((c) => [labelOf(CATEGORY, c.code), c.count]) }}>
            <HorizontalBars items={data.categories.map((c) => ({ label: labelOf(CATEGORY, c.code), count: c.count }))} />
          </ChartCard>
        </Grid>

        <Grid size={12}>
          <ChartCard title="Регионы" subtitle="10 регионов с наибольшим числом граждан"
            table={{ columns: ['Регион', 'Граждан'], rows: data.regions.map((r) => [labelOf(REGION, r.code), r.count]) }}>
            <HorizontalBars items={data.regions.map((r) => ({ label: labelOf(REGION, r.code), count: r.count }))} />
          </ChartCard>
        </Grid>
      </Grid>
    </Stack>
  );
}

/** Горизонтальные столбики одной серии: длинные подписи читаются без поворота. */
function HorizontalBars({ items }: { items: { label: string; count: number }[] }) {
  const SERIES = useSeriesColors();
  return (
    <Box>
      <BarChart height={Math.max(220, items.length * 30 + 40)} layout="horizontal" grid={{ vertical: true }} borderRadius={4} hideLegend
        yAxis={[{ scaleType: 'band', data: items.map((i) => i.label), width: 190, categoryGapRatio: 0.45 }]}
        xAxis={[{ valueFormatter: fmt, tickNumber: 6 }]}
        series={[{ data: items.map((i) => i.count), color: SERIES[0], valueFormatter: fmt }]}
      />
    </Box>
  );
}
