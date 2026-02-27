import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,       // Nu expune codul sursă în producție
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Elimină console.log din producție
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined, // Single bundle pentru SPA simplu
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
