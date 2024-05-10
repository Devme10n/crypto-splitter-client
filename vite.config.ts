import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/web_crypto_api_example/',
  plugins: [react()],
  preview: {
    host: true,
    port: 8080,
  },
  define: {
    'process.env': process.env,
  },
});