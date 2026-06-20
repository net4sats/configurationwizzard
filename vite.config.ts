import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'path'

const app = process.env.VITE_APP || 'admin'

const inputs = {
  admin: resolve(__dirname, 'index.html'),
  portal: resolve(__dirname, 'splash.html'),
  balance: resolve(__dirname, 'balance.html'),
}

const bases = {
  admin: '/',
  portal: './',
  balance: './',
}

export default defineConfig({
  plugins: [
    preact(),
  ],
  root: '.',
  base: bases[app],
  build: {
    outDir: `dist/${app}`,
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: inputs[app],
    },
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
      '/api': {
        target: 'http://192.168.1.1:2121',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
