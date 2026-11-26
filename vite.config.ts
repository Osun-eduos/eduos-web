import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development, /api is forwarded to the API on port 3000 so cookies stay same-origin.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Libraries in their own files, so they stay cached between releases of the app.
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], leaflet: ['leaflet'] },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
