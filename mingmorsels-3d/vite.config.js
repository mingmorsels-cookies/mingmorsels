import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  css: {
    transformer: 'postcss',
    minify: 'esbuild'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    cssMinify: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        product: resolve(import.meta.dirname, 'product.html'),
        experienceCenter: resolve(import.meta.dirname, 'experience-center.html'),
        trackOrder: resolve(import.meta.dirname, 'track-order.html'),
        bulkOrder: resolve(import.meta.dirname, 'bulk-order.html'),
        admin: resolve(import.meta.dirname, 'admin.html')
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three')) return 'vendor_three';
          if (id.includes('node_modules/gsap')) return 'vendor_gsap';
        }
      }
    }
  }
});
