import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * 单测配置
 *
 * 刻意与 vite.config.js 分开：构建配置里塞测试配置会让两者互相牵制
 * （构建不需要知道覆盖率、测试也不需要分包策略）。
 *
 * 目前只测纯函数（订单状态机 / 幂集 / 时间格式化），所以用 node 环境；
 * 后续要测组件或组合式函数时再引入 jsdom + @vue/test-utils。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
