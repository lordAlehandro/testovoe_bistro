import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from './Layout';
import { DashboardPage } from './pages/DashboardPage';
import { NewCitizenPage } from './pages/NewCitizenPage';
import { RegistryPage } from './pages/RegistryPage';
import { theme } from './theme';

/** Кэш серверных данных: 30 с данные считаются свежими, переключение вкладок не дёргает сервер. */
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme} defaultMode="light">
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="citizens" element={<RegistryPage />} />
              <Route path="citizens/new" element={<NewCitizenPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
