import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:\d+\/api\/Materials/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'materials-cache' },
          },
          {
            urlPattern: /^https?:\/\/localhost:\d+\/api\/Suppliers/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'suppliers-cache' },
          },
          {
            urlPattern: /^https?:\/\/localhost:\d+\/api\/Dashboard/,
            handler: 'NetworkFirst',
            options: { cacheName: 'dashboard-cache' },
          },
        ],
      },
      manifest: {
        name: 'ScrapFlow SA',
        short_name: 'ScrapFlow',
        description: 'Modern Scrapyard Management System for South Africa',
        theme_color: '#10B981',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
