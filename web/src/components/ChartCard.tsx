import { Box, Card, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import ChartIcon from '@mui/icons-material/InsertChartOutlined';
import TableIcon from '@mui/icons-material/TableRowsOutlined';
import { useState, type ReactNode } from 'react';

export type TableView = { columns: string[]; rows: (string | number)[][] };

type Props = { title: string; subtitle?: string; table: TableView; children: ReactNode };

/**
 * Карточка графика с переключателем «график / таблица».
 * Таблица — обязательная пара к графику: из неё значения можно прочитать точно,
 * без наведения мыши и без опоры на цвет (важно для людей с нарушением цветового зрения).
 */
export function ChartCard({ title, subtitle, table, children }: Props) {
  const [asTable, setAsTable] = useState(false);

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" alignItems="flex-start" sx={{ mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Tooltip title={asTable ? 'Показать график' : 'Показать таблицей'}>
          <IconButton size="small" onClick={() => setAsTable(!asTable)}>
            {asTable ? <ChartIcon fontSize="small" /> : <TableIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>

      {asTable ? (
        <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {table.columns.map((c, i) => <TableCell key={c} align={i ? 'right' : 'left'}>{c}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {table.rows.map((row, r) => (
                <TableRow key={r}>
                  {row.map((cell, i) => (
                    <TableCell key={i} align={i ? 'right' : 'left'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {typeof cell === 'number' ? cell.toLocaleString('ru-RU') : cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        children
      )}
    </Card>
  );
}
