import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, ToggleButton, ToggleButtonGroup, Toolbar, Typography,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import DarkIcon from '@mui/icons-material/DarkModeOutlined';
import DashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import HubIcon from '@mui/icons-material/HubOutlined';
import LightIcon from '@mui/icons-material/LightModeOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAddAltOutlined';
import { NavLink, Outlet, useLocation } from 'react-router';

const DRAWER_WIDTH = 248;

const NAV = [
  { to: '/', label: 'Дашборд', icon: <DashboardIcon /> },
  { to: '/citizens', label: 'Картотека', icon: <PeopleIcon /> },
  { to: '/citizens/new', label: 'Новый гражданин', icon: <PersonAddIcon /> },
];

const MODES = [
  { value: 'light', label: 'Светлая тема', icon: <LightIcon fontSize="small" /> },
  { value: 'dark', label: 'Тёмная тема', icon: <DarkIcon fontSize="small" /> },
] as const;

/** Каркас страниц в стиле Berry: меню слева, рабочая область в «рамке», контент в карточках. */
export function Layout() {
  const { pathname } = useLocation();
  // Тема: MUI сам запоминает выбор в localStorage.
  const { mode, setMode } = useColorScheme();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.paper' }}>
      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0, px: 2 } }}>
        <Toolbar disableGutters sx={{ gap: 1.5 }}>
          <HubIcon color="secondary" fontSize="large" />
          <Box>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.1 }}>Картотека</Typography>
            <Typography variant="caption" color="text.secondary">учёт граждан</Typography>
          </Box>
        </Toolbar>
        <List>
          {NAV.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              selected={pathname === item.to}
              sx={{ borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: (t) => t.alpha((t.vars ?? t).palette.secondary.main, 0.12), color: 'secondary.main' } }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <ToggleButtonGroup exclusive fullWidth size="small" value={mode === 'dark' ? 'dark' : 'light'} onChange={(_, next) => next && setMode(next)}
          aria-label="Тема оформления" sx={{ mt: 'auto', mb: 2 }}>
          {MODES.map((m) => (
            // Подсказка — обычным title: обёртка Tooltip ломает стили крайних кнопок группы.
            <ToggleButton key={m.value} value={m.value} aria-label={m.label} title={m.label}>{m.icon}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Drawer>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: 3, bgcolor: 'background.default', borderTopLeftRadius: 16 }}>
        {/* На широком мониторе контент не растягивается: строки таблиц и графики остаются читаемыми. */}
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
