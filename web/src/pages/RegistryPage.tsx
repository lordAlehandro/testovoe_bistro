import {
  Box, Button, Card, Chip, Drawer, Grid, IconButton, InputAdornment, LinearProgress, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TablePagination, TableRow, TableSortLabel, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/PersonAddAltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ResetIcon from '@mui/icons-material/FilterAltOffOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CitizenCard } from '@/components/CitizenCard';
import { labelOf, RECORD_STATUS, REGION, SEX, SOCIAL_CATEGORY, STATUS_COLOR, type Option } from '@/dicts';
import { useCitizenList } from '@/lib/api';
import { formatAge, formatDate, formatNumber, fullName } from '@/lib/format';

const FILTER_KEYS = ['search', 'sex', 'region', 'category', 'status', 'birthFrom', 'birthTo'];

const COLUMNS: { label: string; sort?: string; width?: number }[] = [
  { label: '№', sort: 'number', width: 80 },
  { label: 'ФИО', sort: 'name' },
  { label: 'Дата рождения', sort: 'birth_date', width: 150 },
  { label: 'Пол', width: 48 },
  { label: 'Регион' },
  { label: 'Категория' },
  { label: 'Телефон / e-mail' },
  { label: 'Статус', width: 120 },
];

/** Картотека: фильтры, таблица с постраничной загрузкой и карточка выбранного гражданина в боковой панели. */
export function RegistryPage() {
  // Фильтры, сортировка и страница — в одном объекте; пустые значения в запрос не уходят.
  const [query, setQuery] = useState<Record<string, string>>({});
  const get = (key: string) => query[key] ?? '';
  /** Меняет фильтры. При смене фильтра или сортировки возвращаемся на первую страницу. */
  const update = (patch: Record<string, string>) =>
    setQuery((prev) => Object.fromEntries(Object.entries({ ...prev, page: '', ...patch }).filter(([, v]) => v)));

  // Открытая карточка — в адресе (?id=…): на неё ведёт мастер создания.
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('id') ?? '';

  const { data, isFetching } = useCitizenList(query);
  const sort = get('sort') || 'name';
  const order = get('order') === 'desc' ? 'desc' : 'asc';
  const page = Number(get('page') || 1);
  const pageSize = Number(get('pageSize') || 25);
  const hasFilters = FILTER_KEYS.some((k) => query[k]);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography variant="h5">Картотека граждан</Typography>
        {data && <Chip color="primary" variant="outlined" label={`${formatNumber(data.total)} человек`} />}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/citizens/new">Добавить</Button>
      </Stack>

      <Card sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><SearchField key={get('search')} value={get('search')} onChange={(v) => update({ search: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MultiSelect label="Регион" options={REGION} value={get('region')} onChange={(v) => update({ region: v })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MultiSelect label="Социальная категория" options={SOCIAL_CATEGORY} value={get('category')} onChange={(v) => update({ category: v })} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <SingleSelect label="Пол" options={SEX} value={get('sex')} onChange={(v) => update({ sex: v })} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <SingleSelect label="Статус записи" options={RECORD_STATUS} value={get('status')} onChange={(v) => update({ status: v })} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.5 }}>
            <TextField type="date" label="Родился с" value={get('birthFrom')} onChange={(e) => update({ birthFrom: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, md: 2.5 }}>
            <TextField type="date" label="по" value={get('birthTo')} onChange={(e) => update({ birthTo: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button fullWidth disabled={!hasFilters} startIcon={<ResetIcon />} sx={{ height: '100%' }}
              onClick={() => setQuery({})}>Сбросить</Button>
          </Grid>
        </Grid>
      </Card>

      <Card>
        {/* Полоска загрузки вместо «мигания» таблицы: пока грузится новая страница, видна прежняя. */}
        <LinearProgress sx={{ visibility: isFetching ? 'visible' : 'hidden' }} />
        <Box sx={{ overflowX: 'auto' }}>
          {/* Строки в одну линию: таблица ровная, при нехватке места появляется прокрутка вбок. */}
          <Table size="small" sx={{ minWidth: 960, '& td': { whiteSpace: 'nowrap' }, '& th, & td': { px: 1.5 } }}>
            <TableHead>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableCell key={c.label} sx={{ width: c.width, whiteSpace: 'nowrap' }}>
                    {c.sort ? (
                      <TableSortLabel active={sort === c.sort} direction={sort === c.sort ? order : 'asc'}
                        onClick={() => update({ sort: c.sort!, order: sort === c.sort && order === 'asc' ? 'desc' : 'asc' })}>
                        {c.label}
                      </TableSortLabel>
                    ) : c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((r) => (
                <TableRow key={r.id} hover selected={r.id === selectedId} sx={{ cursor: 'pointer' }} onClick={() => setParams({ id: r.id })}>
                  <TableCell>{r.personal_number}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{fullName(r)}</TableCell>
                  <TableCell>{formatDate(r.birth_date)} <Typography component="span" variant="caption" color="text.secondary">({formatAge(r.birth_date)})</Typography></TableCell>
                  <TableCell>{r.sex === 'M' ? 'М' : 'Ж'}</TableCell>
                  <TableCell>{labelOf(REGION, r.region_code)}</TableCell>
                  <TableCell>{labelOf(SOCIAL_CATEGORY, r.social_category)}</TableCell>
                  <TableCell>{r.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={labelOf(RECORD_STATUS, r.record_status)} color={STATUS_COLOR[r.record_status] ?? 'default'} />
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 && (
                <TableRow><TableCell colSpan={COLUMNS.length} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  Никого не нашлось — измените или сбросьте фильтры
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page - 1}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(_, p) => update({ page: String(p + 1) })}
          onRowsPerPageChange={(e) => update({ pageSize: e.target.value })}
          labelRowsPerPage="Строк на странице"
          labelDisplayedRows={({ from, to, count }) => `${formatNumber(from)}–${formatNumber(to)} из ${formatNumber(count)}`}
        />
      </Card>

      <Drawer anchor="right" open={Boolean(selectedId)} onClose={() => setParams({})}
        slotProps={{ paper: { sx: { width: { md: '75%', xl: '60%' }, bgcolor: 'background.default', p: 3 } } }}>
        {selectedId && (
          <>
            {/* Крестик лежит на цветной полосе шапки карточки и не занимает отдельную строку. */}
            <Tooltip title="Закрыть">
              <IconButton onClick={() => setParams({})} sx={{ position: 'absolute', top: 32, right: 32, zIndex: 1, color: 'common.white' }}><CloseIcon /></IconButton>
            </Tooltip>
            <CitizenCard key={selectedId} id={selectedId} />
          </>
        )}
      </Drawer>
    </Stack>
  );
}

/** Поиск: запрос уходит по Enter, а не на каждую букву. После «Сбросить» поле пересоздаётся пустым (key). */
function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <TextField placeholder="ФИО, учётный номер или СНИЛС (Enter — найти)" value={text} onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onChange(text.trim())}
      slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
  );
}

type SelectProps = { label: string; options: Option[]; value: string; onChange: (value: string) => void };

function SingleSelect({ label, options, value, onChange }: SelectProps) {
  return (
    <TextField select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value=""><em>Все</em></MenuItem>
      {options.map(([code, text]) => <MenuItem key={code} value={code}>{text}</MenuItem>)}
    </TextField>
  );
}

/** Выбор нескольких значений; в запрос уходит через запятую: region=77,78. */
function MultiSelect({ label, options, value, onChange }: SelectProps) {
  const selected = value ? value.split(',') : [];
  return (
    <TextField select label={label} value={selected}
      onChange={(e) => onChange((e.target.value as unknown as string[]).join(','))}
      slotProps={{ select: { multiple: true, renderValue: (v) => (v as string[]).map((c) => labelOf(options, c)).join(', ') } }}>
      {options.map(([code, text]) => <MenuItem key={code} value={code}>{text}</MenuItem>)}
    </TextField>
  );
}
