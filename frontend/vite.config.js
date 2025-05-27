import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/generate': {
        target: 'https://evidra-prototype-01.onrender.com',
        changeOrigin: true,
      },
      '/upload': {
        target: 'https://evidra-prototype-01.onrender.com',
        changeOrigin: true,
      }
    }
  }
});
