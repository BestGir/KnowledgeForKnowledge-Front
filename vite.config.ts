import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        changeOrigin: true,
        target: 'http://localhost:5000',
      },
      '/uploads': {
        changeOrigin: true,
        target: 'http://localhost:5000',
      },
    },
  },
});
