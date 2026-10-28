import {
  Box, FormControl, FormControlLabel, FormHelperText, FormLabel, Grid, MenuItem, Radio, RadioGroup, Switch, TextField, Typography,
} from '@mui/material';
import { Controller, useWatch, type Control } from 'react-hook-form';
import type { Field, Section, Values } from '@/card';
import { labelOf } from '@/dicts';
import { applyMask, formatDate, maskSensitive } from '@/lib/format';
import { isVisible } from '@/lib/validate';

/** Значение поля для режима просмотра: подпись из справочника, дата по-русски, «Да/Нет». */
export function displayValue(field: Field, value: unknown): string {
  if (value == null || value === '') return '—';
  if (field.options) return labelOf(field.options, value);
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'switch') return value ? 'Да' : 'Нет';
  if (field.sensitive) return maskSensitive(String(value));
  return String(value);
}

/** Одно поле ввода. Вид поля выбирается по его типу из описания карточки. */
function FieldInput({ field, control }: { field: Field; control: Control<Values> }) {
  return (
    <Controller
      name={field.code}
      control={control}
      render={({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => {
        const required = field.required === true;
        const helper = error?.message ?? field.hint;

        if (field.type === 'switch') {
          return <FormControlLabel label={field.label} control={<Switch checked={value === true} onChange={(e) => onChange(e.target.checked)} />} />;
        }
        if (field.type === 'radio') {
          return (
            <FormControl error={Boolean(error)} required={required}>
              <FormLabel sx={{ fontSize: 13 }}>{field.label}</FormLabel>
              <RadioGroup row value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
                {field.options?.map(([code, label]) => <FormControlLabel key={code} value={code} control={<Radio size="small" />} label={label} />)}
              </RadioGroup>
              {helper && <FormHelperText>{helper}</FormHelperText>}
            </FormControl>
          );
        }

        const common = {
          label: field.label, required, inputRef: ref, onBlur, error: Boolean(error), helperText: helper,
          disabled: field.readOnly, value: value ?? '',
        };
        if (field.type === 'select') {
          return (
            <TextField {...common} select onChange={(e) => onChange(e.target.value)}>
              {!required && <MenuItem value=""><em>Не указано</em></MenuItem>}
              {field.options?.map(([code, label]) => <MenuItem key={code} value={code}>{label}</MenuItem>)}
            </TextField>
          );
        }
        if (field.type === 'masked') {
          return (
            <TextField {...common} placeholder={field.mask?.replace(/0/g, '_')} slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              onChange={(e) => onChange(applyMask(e.target.value, field.mask ?? ''))} />
          );
        }
        return (
          <TextField
            {...common}
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            multiline={field.type === 'textarea'}
            minRows={field.type === 'textarea' ? 2 : undefined}
            onChange={(e) => onChange(e.target.value)}
            // У поля даты подпись всегда сверху: иначе она наезжает на шаблон «дд.мм.гггг».
            slotProps={field.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
          />
        );
      }}
    />
  );
}

/**
 * Поля раздела в сетке, по группам. Видимость полей пересчитывается при каждом изменении формы:
 * например, «Дата смерти» появляется, только когда статус записи — «Умер».
 */
export function FormFields({ section, control, groups }: { section: Section; control: Control<Values>; groups?: number[] }) {
  const values = useWatch({ control }) as Values;
  return (
    <Box>
      {section.groups.map((group, i) =>
        groups && !groups.includes(i) ? null : (
          <Box key={i} sx={{ mb: 2 }}>
            {group.title && <GroupTitle>{group.title}</GroupTitle>}
            <Grid container spacing={2}>
              {group.fields.filter((f) => isVisible(f, values)).map((f) => (
                <Grid key={f.code} size={{ xs: 12, sm: f.cols ?? 4 }}>
                  <FieldInput field={f} control={control} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ),
      )}
    </Box>
  );
}

/** Раздел в режиме просмотра: подпись поля и значение. Пустые условные поля не показываем. */
export function FieldsView({ section, values }: { section: Section; values: Values }) {
  return (
    <Box>
      {section.groups.map((group, i) => (
        <Box key={i} sx={{ mb: 2.5 }}>
          {group.title && <GroupTitle>{group.title}</GroupTitle>}
          <Grid container spacing={2}>
            {group.fields.filter((f) => isVisible(f, values)).map((f) => (
              <Grid key={f.code} size={{ xs: 12, sm: f.type === 'textarea' ? 12 : 4 }}>
                <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{displayValue(f, values[f.code])}</Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

const GroupTitle = ({ children }: { children: string }) => (
  <Typography variant="overline" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 1 }}>{children}</Typography>
);
