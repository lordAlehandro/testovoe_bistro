import { Alert, Avatar, Box, Card, Chip, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import { MAIN, TABLE_SECTIONS } from '@/card';
import { labelOf, RECORD_STATUS, REGION, STATUS_COLOR } from '@/dicts';
import { useCitizen } from '@/lib/api';
import { formatAge, formatDate, fullName, initials, maskSensitive } from '@/lib/format';
import { MainSection } from './MainSection';
import { SectionTable } from './SectionTable';

/** Карточка гражданина: шапка с главным и вкладки разделов. */
export function CitizenCard({ id }: { id: string }) {
  const { data, isLoading, error } = useCitizen(id);
  const [tab, setTab] = useState('main');

  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (isLoading || !data) return <Skeleton variant="rounded" height={320} />;

  const { citizen: c, counts } = data;
  const section = TABLE_SECTIONS.find((s) => s.key === tab);

  return (
    <Stack spacing={2}>
      {/* Шапка как в Berry profile3: цветная полоса, аватар наполовину заходит на неё. */}
      <Card>
        <Box sx={{ height: 96, background: (t) => `linear-gradient(120deg, ${(t.vars ?? t).palette.primary.dark}, ${(t.vars ?? t).palette.secondary.dark})` }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'flex-end' }} sx={{ px: { xs: 2, md: 3 }, pb: 2.5, mt: -3.5 }}>
          <Avatar sx={{ width: 96, height: 96, fontSize: 32, border: 4, borderColor: 'background.paper', bgcolor: c.sex === 'F' ? 'secondary.main' : 'primary.main' }}>{initials(c)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5">{fullName(c)}</Typography>
              <Chip size="small" color={STATUS_COLOR[c.record_status] ?? 'default'} label={labelOf(RECORD_STATUS, c.record_status)} />
            </Stack>
            <Typography color="text.secondary">
              {formatDate(c.birth_date)} · {formatAge(c.birth_date)} · {labelOf(REGION, c.region_code)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={3}>
            <Info label="Учётный номер" value={String(c.personal_number)} />
            <Info label="СНИЛС" value={c.snils ? maskSensitive(c.snils) : '—'} />
          </Stack>
        </Stack>
      </Card>

      <Card>
        <Tabs value={section ? tab : 'main'} onChange={(_, v: string) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="main" label={MAIN.title} />
          {TABLE_SECTIONS.map((s) => (
            <Tab key={s.key} value={s.key} label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{s.title}</span>
                {Boolean(counts[s.key]) && <Chip size="small" label={counts[s.key]} sx={{ height: 20, fontSize: 12 }} />}
              </Stack>
            } />
          ))}
        </Tabs>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {section ? <SectionTable key={section.key} citizenId={id} section={section} /> : <MainSection citizen={c} />}
        </Box>
      </Card>
    </Stack>
  );
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
  </Box>
);
