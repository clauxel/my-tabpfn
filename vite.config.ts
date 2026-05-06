import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      port: 24687,
    },
    proxy: {
      '/api': {
        target: 'https://my-tabpfn.yangdengkui01.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
