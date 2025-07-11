import { defineConfig } from 'vite'
import { copy } from 'fs-extra'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  plugins: [
    {
      name: 'copy-images',
      closeBundle: async () => {
        try {
          await copy(resolve(__dirname, 'images'), resolve(__dirname, 'dist/images'))
        } catch (error) {
          console.error('❌ Error copying images:', error)
        }
      }
    }
  ]
}) 