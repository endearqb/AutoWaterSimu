import path from "node:path"
import mdx from "@mdx-js/rollup"
import { TanStackRouterVite } from "@tanstack/router-vite-plugin"
import react from "@vitejs/plugin-react-swc"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeSlug from "rehype-slug"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    mdx({
      remarkPlugins: [remarkGfm, remarkFrontmatter],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
      // 关键：排除带有 ?raw 查询的导入，确保 import.meta.glob({ as: 'raw' }) 返回字符串
      include: [/\.mdx?$/],
      exclude: [/[\?&]raw\b/],
    }),
    react(),
    TanStackRouterVite(),
  ],
  define: {
    global: "globalThis",
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
    // 暴露 src 绝对路径用于开发态的 /@fs 原文回退加载
    __APP_SRC_ABS__: JSON.stringify(path.resolve(__dirname, "./src")),
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {
          buffer: "Buffer",
        },
      },
    },
  },
})
