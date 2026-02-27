import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: '../public',   // Build directly into la carpeta que sirve Express
    emptyOutDir: true,
    sourcemap: false       // No sourcemaps en producción (reduce tamaño)
  }
});
