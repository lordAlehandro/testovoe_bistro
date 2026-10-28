import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import { fieldsOf, type Section } from '@/card';
import { useSave, useSectionRows } from '@/lib/api';
import { useSectionForm } from '@/lib/useSectionForm';
import { formValues } from '@/lib/validate';
import { displayValue, FormFields } from './Fields';

/** Раздел-таблица (документы, семья, образование…): список записей и добавление новой. */
export function SectionTable({ citizenId, section }: { citizenId: string; section: Section }) {
  const { data: rows, isLoading } = useSectionRows(citizenId, section.key);
  const [adding, setAdding] = useState(false);
  const columns = fieldsOf(section).filter((f) => f.inList);

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Записей: {rows?.length ?? '…'}</Typography>
        <Button startIcon={<AddIcon />} onClick={() => setAdding(true)}>Добавить</Button>
      </Stack>

      {isLoading ? (
        <Skeleton variant="rounded" height={120} />
      ) : !rows?.length ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Записей пока нет</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((f) => <TableCell key={f.code}>{f.label}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={String(row.id)} hover>
                  {columns.map((f) => <TableCell key={f.code}>{displayValue(f, row[f.code])}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {adding && <RowDialog citizenId={citizenId} section={section} onClose={() => setAdding(false)} />}
    </Box>
  );
}

/** Окно добавления записи раздела. */
function RowDialog({ citizenId, section, onClose }: { citizenId: string; section: Section; onClose: () => void }) {
  const save = useSave(citizenId, section.key);
  const form = useSectionForm(section, formValues(fieldsOf(section)));
  const [error, setError] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle>Новая запись — {section.title}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <FormFields section={section} control={form.control} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" loading={save.isPending}>Сохранить</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
