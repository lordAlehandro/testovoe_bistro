import { createTheme } from '@mui/material/styles';

/**
 * Тема в духе Berry (пример из ТЗ): синий primary, фиолетовый secondary,
 * светло-серый фон страницы и белые карточки со скруглением.
 * Все цвета задаются здесь — в компонентах только theme.palette.*, без «магических» hex.
 *
 * Две схемы — светлая и тёмная. Цвета темы становятся CSS-переменными, а схема
 * переключается классом на <html> (.light / .dark): страница не перерисовывается целиком,
 * меняются только значения переменных. Выбор пользователя MUI хранит в localStorage.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#2196f3' },
        secondary: { main: '#673ab7' },
        background: { default: '#eef2f6', paper: '#ffffff' },
        // Статусные цвета всегда идут вместе с подписью (например, «Умер», «Выбыл»):
        // цвет никогда не единственный признак.
        warning: { main: '#fab219', contrastText: '#0b0b0b' },
        error: { main: '#d03b3b' },
        success: { main: '#0ca30c' },
      },
    },
    // В тёмной схеме цвета светлее: на тёмном фоне у текста и иконок контраст не ниже 4,5:1.
    // На ярких заливках (кнопки, чипы) поэтому тёмный текст, а не белый.
    dark: {
      palette: {
        primary: { main: '#42a5f5', contrastText: '#0b0b0b' },
        secondary: { main: '#b39ddb', contrastText: '#0b0b0b' },
        background: { default: '#121418', paper: '#1c1f26' },
        warning: { main: '#fab219', contrastText: '#0b0b0b' },
        error: { main: '#ef6b6b', contrastText: '#0b0b0b' },
        success: { main: '#3fbf3f', contrastText: '#0b0b0b' },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: 'Roboto, Arial, sans-serif', h5: { fontWeight: 600 } },
  components: {
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { borderRadius: 12 } } },
    // В тёмной теме MUI осветляет «поднятые» панели серой подложкой — у выезжающих панелей она
    // выглядит грязно-серой. Убираем: панели берут цвет фона из палитры, как в светлой теме.
    MuiDrawer: { styleOverrides: { paper: { backgroundImage: 'none' } } },
    // Обычный регистр вместо КАПСА у кнопок и вкладок — как в Berry, так легче читать.
    // Кнопки плоские, без тени — как в Berry.
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500, minHeight: 52 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    // Шапки таблиц приглушённые: заголовок колонки не должен спорить с данными.
    MuiTableCell: { styleOverrides: { head: ({ theme: t }) => ({ fontWeight: 600, color: (t.vars ?? t).palette.text.secondary }) } },
  },
});
