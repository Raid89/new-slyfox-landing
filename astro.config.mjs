// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';

export default defineConfig({
  site: 'https://slyfox.com.co',
  trailingSlash: 'always',
  output: 'static',
  adapter: vercel(),

  // Optimización de imágenes — convierte a WebP/AVIF, comprime
  image: {
    // Formatos modernos con fallback automático
    experimentalLayout: 'responsive',
    domains: ['slyfox.com.co'],
  },

  // Compresión HTML en build
  compressHTML: true,

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@data': path.resolve('./src/data'),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    build: {
      // CSS code splitting para carga más rápida
      cssCodeSplit: true,
    },
    server: {
      fs: { strict: true },
      hmr: true
    },
    esbuild: {
      charset: 'utf8',
      // Eliminar console.log y debugger en producción
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    }
  },

  integrations: [icon(), sitemap()]
});
