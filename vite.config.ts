
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react() as any],
  // PENTING: base './' agar bisa jalan di Android WebView (file://)
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    'process.env': {}
  }
});
