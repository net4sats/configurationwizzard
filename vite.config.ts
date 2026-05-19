import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

const base = process.env.VITE_BASE_PATH || '/net4sats/'

export default defineConfig({
  plugins: [
    preact(),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['zimmerframe'],
  },
  server: {
    proxy: {
      '/ubus': {
        target: 'http://192.168.1.1',
        changeOrigin: true,
      },
    },
  },
  base,
})
