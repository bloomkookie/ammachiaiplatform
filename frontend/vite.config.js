import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The proxy is no longer needed as we use an absolute base URL
  // defined in .env.local and the apiFetch helper.
});
