import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5174, // Different from main app port
    open: true
  }
}); 