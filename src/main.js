import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import router from './router'

//引入初始样式
import './styles/common.scss'
import { lazyPlugin } from '@/directives'
import { componentPlugin } from '@/components'
import { setupGlobalErrorHandler } from '@/utils/errorHandler'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(componentPlugin)
// 自定义指令必须在 mount 之前注册：Vue 首次渲染时就要解析模板里的 v-img-lazy，
// 注册晚了（原先放在 mount 之后）首屏图片会拿不到指令
app.use(lazyPlugin)

// 开发环境打开 Vue 的性能打点，配合 devtools 时间轴分析组件渲染耗时
app.config.performance = import.meta.env.DEV

// 全局错误兜底：组件异常 / 未处理的 rejection / 资源加载失败
setupGlobalErrorHandler(app)

/**
 * 启动流程
 *
 * 启用 mock 时，必须等 Service Worker 就绪后再挂载，
 * 否则首屏那几个请求会赶在 worker 生效之前发出去、落到真实网络。
 */
async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    try {
      const { startMockServer } = await import('@mocks/browser')
      await startMockServer()
    } catch (error) {
      // 例如非 HTTPS 环境下浏览器不支持 Service Worker：
      // 不阻塞应用启动，退回真实接口请求（问题会在网络面板里直接暴露）
      console.error('[mock] 启动失败，将直接请求真实接口：', error)
    }
  }

  app.mount('#app')
}

bootstrap()
