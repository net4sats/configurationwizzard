import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import refresh from '@prefresh/vite'

export default defineConfig({
  plugins: [
    preact(),
    refresh({
      dev: true,
      reload: true,
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    proxy: {
      '/ubus': {
        target: 'http://192.168.1.1',
        changeOrigin: true,
      },
    },
  },
  base: '/net4sats/',
})
