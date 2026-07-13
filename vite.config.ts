import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/lexigraph/',
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'Lexigraph',
      short_name: 'Lexigraph',
      description: '简约、离线的考研英语词汇复习应用',
      theme_color: '#21483b',
      background_color: '#f1f3ef',
      display: 'standalone',
      start_url: '/lexigraph/',
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
  })],
});
