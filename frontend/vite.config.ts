import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 动画库单独拆包，避免普通页面首次加载时被迫带上整块 motion 代码。
          if (id.includes("framer-motion")) {
            return "motion";
          }

          // 框架层依赖合并到稳定 chunk，减少路由页之间的重复代码。
          if (
            id.includes("node_modules/react")
            || id.includes("react-dom")
            || id.includes("react-router-dom")
            || id.includes("@tanstack/react-query")
            || id.includes("axios")
            || id.includes("next-themes")
          ) {
            return "framework";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', 
        changeOrigin: true,
      }
    }
  }
})
