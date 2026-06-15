import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update on next reload, no in-app prompt for v1.
      registerType: 'autoUpdate',
      // Plugin handles registration injection; no manual code in main.jsx.
      injectRegister: 'auto',
      // We maintain our own /public/manifest.webmanifest, do not let the plugin generate one.
      manifest: false,
      includeAssets: [
        'favicon.svg',
        'favicon-16.png',
        'favicon-32.png',
        'favicon-48.png',
        'apple-touch-icon-180.png',
        'app-icon-192.png',
        'app-icon-512.png',
        'app-icon-maskable-512.png',
        'og-card-1200x630.png',
        'apple-splash-*.png',
        'robots.txt',
        'manifest.webmanifest'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Single-page-app fallback for client-side routing.
        navigateFallback: '/index.html',
        // Never intercept Supabase or any /api requests; they must hit the network.
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/]
      },
      // Service worker stays off in dev to avoid stale cache during development.
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    // React + Router are visible on first paint so they belong in the entry chunk.
    // Supabase and form libs ship as deferred chunks loaded on auth or form pages.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-forms':    ['react-hook-form', 'zod', '@hookform/resolvers']
        }
      }
    }
  }
})
