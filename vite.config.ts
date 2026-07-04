import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'SINUS NOTE',
        short_name: 'SINUS NOTE',
        description: 'Incense Design — Fragrance Journal',
        theme_color: '#F5F1EB',
        background_color: '#F5F1EB',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcuts: [
          { name: '快速記錄', short_name: '記錄', url: '/?quick=note', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: '新增工序', short_name: '工序', url: '/?quick=task', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
});
