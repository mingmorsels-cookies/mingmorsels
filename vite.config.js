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
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e.test.js']
  },
  build: {
    cssMinify: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        orderConfirmation: resolve(import.meta.dirname, 'order-confirmation.html'),
        product: resolve(import.meta.dirname, 'product.html'),
        experienceCenter: resolve(import.meta.dirname, 'experience-center.html'),
        trackOrder: resolve(import.meta.dirname, 'track-order.html'),
        bulkOrder: resolve(import.meta.dirname, 'bulk-order.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        chatbot: resolve(import.meta.dirname, 'chatbot.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        refund: resolve(import.meta.dirname, 'refund.html'),
        shipping: resolve(import.meta.dirname, 'shipping.html'),
        terms: resolve(import.meta.dirname, 'terms.html')
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
