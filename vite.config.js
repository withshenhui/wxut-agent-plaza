import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/dify': {
        target: 'http://210.28.145.149',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dify/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v2: resolve(__dirname, 'v2.html'),
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        // react 系固定单例 chunk：此前 V2Teacher 双入口共享把 react-dom 拆进 form chunk，
        // 与 v2 主 bundle 各持一份运行时，快速切页时跨实例提交崩溃（TypeError: n is not a function 白屏）
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('axios')) return 'vendor-net';
          }
        }
      }
    }
  }
})