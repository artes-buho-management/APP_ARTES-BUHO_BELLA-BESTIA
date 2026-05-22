import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, cookieDomainRewrite: 'localhost' },
      '/login': { target: 'http://localhost:8080', changeOrigin: true, cookieDomainRewrite: 'localhost' },
      '/logout': { target: 'http://localhost:8080', changeOrigin: true, cookieDomainRewrite: 'localhost' },
      '/login-logo.webp': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
