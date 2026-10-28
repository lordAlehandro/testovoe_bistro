import { Alert, Box, Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import { useState } from 'react';
import { fieldsOf, MAIN } from '@/card';
import { useSave, type Citizen } from '@/lib/api';
import { useSectionForm } from '@/lib/useSectionForm';
import { formValues } from '@/lib/validate';
import { FieldsView, FormFields } from './Fields';

/** «Основные сведения»: просмотр, по кнопке «Изменить» — форма с проверкой и сохранением. */
export function MainSection({ citizen }: { citizen: Citizen }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <Box>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button startIcon={<EditIcon />} onClick={() => setEditing(true)}>Изменить</Button>
        </Stack>
        <FieldsView section={MAIN} values={citizen} />
      </Box>
    );
  }
  return <MainForm citizen={citizen} onDone={() => setEditing(false)} />;
}

function MainForm({ citizen, onDone }: { citizen: Citizen; onDone: () => void }) {
  const save = useSave(citizen.id, 'main');
  const form = useSectionForm(MAIN, formValues(fieldsOf(MAIN), citizen));
  const [error, setError] = useState<string | null>(null);

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <FormFields section={MAIN} control={form.control} />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onDone}>Отмена</Button>
        <Button type="submit" variant="contained" loading={save.isPending}>Сохранить</Button>
      </Stack>
    </Box>
  );
}
