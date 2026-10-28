import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      // Библиотеки — отдельными файлами: они меняются редко и остаются в кэше браузера.
      output: { manualChunks: { react: ['react', 'react-dom', 'react-router'], mui: ['@mui/material'], charts: ['@mui/x-charts'] } },
    },
  },
  // В режиме разработки запросы /api уходят на сервер — фронт и API на одном адресе, без CORS.
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
