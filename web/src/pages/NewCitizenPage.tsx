import { Alert, Box, Button, Card, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { fieldsOf, MAIN, type Values } from '@/card';
import { FieldsView, FormFields } from '@/components/Fields';
import { api, type Citizen } from '@/lib/api';
import { useSectionForm } from '@/lib/useSectionForm';
import { cleanValues, formValues } from '@/lib/validate';

const STEPS = [...MAIN.groups.map((g) => g.title ?? ''), 'Проверка'];

/**
 * Мастер «Новый гражданин»: основные сведения по шагам, на каждом шаге проверяются только его поля.
 * После создания открывается карточка в картотеке — там добавляются документы, адреса, семья и образование.
 */
export function NewCitizenPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const form = useSectionForm(MAIN, formValues(fieldsOf(MAIN)));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const last = step === STEPS.length - 1;

  const next = async () => {
    const codes = MAIN.groups[step]?.fields.map((f) => f.code) ?? [];
    if (await form.trigger(codes)) setStep(step + 1);
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      const { citizen } = await api<{ citizen: Citizen }>('/citizens', 'POST', values);
      void client.invalidateQueries({ queryKey: ['citizens'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      void navigate(`/citizens?id=${citizen.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5">Новый гражданин</Typography>
        <Typography color="text.secondary">Основные сведения по шагам. Документы, адреса, семью и образование можно добавить в карточке после создания.</Typography>
      </Box>
      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); void (last ? submit() : next()); }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {last
            ? <FieldsView section={MAIN} values={cleanValues(fieldsOf(MAIN), form.getValues()) as Values} />
            : <FormFields section={MAIN} control={form.control} groups={[step]} />}
          <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ mt: 2 }}>
            <Button disabled={step === 0} onClick={() => setStep(step - 1)}>Назад</Button>
            <Button type="submit" variant="contained" loading={form.formState.isSubmitting}>{last ? 'Создать карточку' : 'Далее'}</Button>
          </Stack>
        </Box>
      </Card>
    </Stack>
  );
}
