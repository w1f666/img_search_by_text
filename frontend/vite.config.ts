import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

/**
 * vite preview 不内置 SPA history fallback，
 * 刷新非根路由时会返回 404。这个小插件让 preview
 * 和 dev 一样，对找不到的路径返回 index.html。
 */
function spaFallback(): PluginOption {
  return {
    name: "spa-fallback",
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "";
        // 跳过带扩展名的静态资源请求和 API / 上传路径
        if (
          url.startsWith("/api/") ||
          url.startsWith("/uploads/") ||
          url.startsWith("/search_uploads/") ||
          /\.\w+$/.test(url)
        ) {
          return next();
        }
        req.url = "/index.html";
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  base: '/',
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
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/search_uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/search_uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
