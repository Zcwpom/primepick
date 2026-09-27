import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
//element-plus配置
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读取 .env / .env.[mode] 中的变量，避免把接口地址硬编码进配置文件
  const env = loadEnv(mode, process.cwd())

  return {
    // 部署到子路径时（例如 GitHub Pages 的 /<仓库名>/）必须设置 base，
    // 否则产物里的资源路径仍是 /assets/... 会全部 404。
    // 路由（createWebHistory）与 MSW 的 Service Worker 注册都读 import.meta.env.BASE_URL，
    // 所以只需要改这一个地方，不用散落地去改代码。
    base: env.VITE_BASE || '/',
    plugins: [
      vue(),
      vueDevTools(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [
          // 1. 配置elementPlus采用sass样式配色系统
          ElementPlusResolver({ importStyle: "sass" }),
        ],
      }),
    ],
    server: {
      // 忽略工具链的原子写临时文件：
      // 部分编辑器/Agent 写文件是「先写 .tmp 再重命名」，Windows 上 chokidar 会在
      // 重命名的间隙抓到该临时文件并抛出 EBUSY，而这是一个**未捕获异常**，
      // 会直接把 dev server 打挂（实测踩过）。这里显式忽略掉。
      watch: {
        ignored: ['**/*.tmp', '**/*.tmpdir/**', '**/.git/**'],
      },
      proxy: {
        '/api': {
          // 只有 VITE_USE_MOCK=false 时才会真的走到这里。
          // 默认值刻意指向本地（将来的自建后端），而不是任何第三方服务器 ——
          // 「默认依赖别人家的接口」是这个项目最初最致命的问题，不能让它悄悄回来。
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // mock 层位于 src 之外（它不属于业务代码，将来切自建后端时可以整个目录删掉）
        '@mocks': fileURLToPath(new URL('./mocks', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // 2. 自动导入定制化样式文件进行样式覆盖
          additionalData: `
            @use "@/styles/element/index.scss" as *;
            @use "@/styles/var.scss" as *;
            @use "sass:color";
          `,
        }
      }
    },
    build: {
      // 单 chunk 超阈值告警，作为「分包策略回退」的哨兵。
      // 演示模式（VITE_USE_MOCK=true）会额外打包 mock 运行时 —— MSW 自带 interceptors、
      // tough-cookie 等依赖，压缩前就有 430 kB 左右，属于第三方体积，
      // 卡 300 只会让告警长期噪声化；关闭 mock 的构建仍按 300 kB 严卡业务分包。
      // 首屏体积另有 scripts/size-report.mjs 的预算门禁（CI 里会失败）。
      chunkSizeWarningLimit: env.VITE_USE_MOCK === 'true' ? 500 : 300,
      // Vite 8 底层使用 Rolldown：用 codeSplitting.groups 取代 rollup 时代的 manualChunks
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // mock 层拆成「数据」与「运行时」两块：
              // fixtures 约 129 kB（真实响应 JSON），MSW 运行时约 432 kB（自带 interceptors 等依赖），
              // 拆开后可分别统计体积，也便于判断「大的是数据还是运行时」
              {
                name: 'mock-fixtures',
                test: /[\\/]mocks[\\/]fixtures[\\/]/,
                priority: 41,
              },
              {
                name: 'mock-runtime',
                test: /[\\/]mocks[\\/](?!fixtures[\\/])/,
                priority: 40,
              },
              // 只把「框架层」单独成 chunk。
              // 注意：这里不按 node_modules 一把梭分组 —— 那样会把只在懒加载页面里
              // 用到的库（如 element-plus 全量组件、@vueuse）强行并入首屏依赖，
              // 实测首屏体积会从 413 kB 反弹到 643 kB。
              // 框架层是首屏必然加载的，单独成 chunk 只赚缓存命中率，不增加下载量。
              {
                name: 'vendor-vue',
                test: /node_modules[\\/](vue|@vue|vue-router|pinia|vue-demi)[\\/]/,
                priority: 30,
              },
            ],
          },
        },
      },
    },
  }
})
