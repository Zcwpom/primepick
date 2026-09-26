import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * 启动 mock 服务（基于 Service Worker 在浏览器侧拦截 fetch/XHR）
 *
 * 注意：必须在 app.mount() 之前 await 完成，
 * 否则首屏那几个请求会赶在 worker 生效之前发出去，落到真实网络上。
 */
export function startMockServer() {
  return worker.start({
    // 未匹配到 handler 的请求打警告但放行 —— 方便发现漏配的接口
    onUnhandledRequest: 'warn',
    serviceWorker: {
      // public/ 下的文件会被复制到构建产物根目录
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  })
}
