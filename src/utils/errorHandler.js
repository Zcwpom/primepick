import { ElMessage } from 'element-plus'

/**
 * 全局异常兜底
 *
 * 覆盖三类「没人接住」的错误：
 * 1. 组件渲染 / 生命周期内抛出的同步错误   → app.config.errorHandler
 * 2. 未 catch 的 Promise rejection        → unhandledrejection
 * 3. 静态资源（img / script）加载失败      → window error（捕获阶段）
 *
 * 目前只做「统一出口 + 用户提示」，后续接入错误上报平台时
 * 只需要替换 reportError 的实现，调用方无需改动。
 */
const isDev = import.meta.env.DEV

function reportError(error, context) {
  // 迭代 2 计划：这里接入 Sentry / 自建上报接口
  if (isDev) {
    console.error(`[global-error:${context}]`, error)
  }
}

export function setupGlobalErrorHandler(app) {
  app.config.errorHandler = (error, instance, info) => {
    reportError(error, `vue:${info}`)
    ElMessage.error('页面出现异常，请稍后重试')
  }

  window.addEventListener('unhandledrejection', (event) => {
    // 接口错误已在 axios 拦截器里统一提示过，这里只兜底真正没人处理的 rejection
    reportError(event.reason, 'unhandledrejection')
  })

  // 资源加载失败不会冒泡，需要在捕获阶段监听
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target
      if (target && target !== window && (target.src || target.href)) {
        reportError(`资源加载失败: ${target.src || target.href}`, 'resource')
      }
    },
    true,
  )
}
