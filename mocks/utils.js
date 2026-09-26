import { HttpResponse, delay } from 'msw'

/**
 * mock 层公共工具
 *
 * 设计原则：handler 返回的响应体必须与线上接口**完全同构**（{ code, msg, result } 信封），
 * 这样将来把 VITE_USE_MOCK 关掉、切到真实后端时，前端一行都不用改。
 */

// 与 src/utils/http.js 使用同一个 baseURL，避免 handler 和接口层前缀不一致
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '')

/** 把业务路径拼成前端实际请求的地址（含 baseURL） */
export const apiPath = (path) => `${API_BASE}${path}`

// 一次性把 fixtures 目录下所有真实响应收进来（构建期静态分析，无需异步加载）
//
// 排除 _manifest.json：它只是「抓取来源 + 端点清单」的元数据（给 scripts/fixture-summary.mjs 看），
// 没有任何运行时逻辑需要它。放进来会连同**抓取来源域名**一起被打进产物 ——
// 面试官打开 devtools 就能看到数据是从哪个第三方接口抓的。
const modules = import.meta.glob(['./fixtures/*.json', '!./fixtures/_manifest.json'], {
  eager: true,
  import: 'default',
})

export const fixtures = Object.fromEntries(
  Object.entries(modules).map(([path, data]) => [
    path.replace('./fixtures/', '').replace(/\.json$/, ''),
    data,
  ]),
)

/** 按名字取 fixture，缺失时给出可定位的告警而不是静默返回 undefined */
export function fixture(name) {
  const data = fixtures[name]
  if (!data) {
    console.warn(`[mock] 缺少 fixture: ${name}（可用 ${Object.keys(fixtures).length} 个）`)
  }
  return data
}

/** 成功响应，保留真实接口的信封结构 */
export const jsonOk = (result, init) =>
  HttpResponse.json({ code: '1', msg: '操作成功', result }, init)

/**
 * 业务失败响应。
 * 用 HTTP 状态码 + 真实错误结构返回，前端 axios 拦截器会走既有的错误提示 / 401 登出逻辑。
 */
export const jsonFail = (msg, { status = 400, code = '50000' } = {}) =>
  HttpResponse.json({ code, msg, result: null }, { status })

/**
 * 模拟网络延迟：让 loading / 骨架屏 / 按钮 pending 状态在演示时真的能被看到，
 * 否则本地 mock 会在几毫秒内返回，界面看起来像「没有加载过程」。
 */
export const mockDelay = () => delay(120 + Math.floor(Math.random() * 180))

/** 需要登录的接口：真实接口未带 token 时返回 401，前端会清空用户信息并跳登录页 */
export const isAuthed = (request) => Boolean(request.headers.get('Authorization'))

/** 所有商品详情 fixture 的集合（文件名形如 goods-4026116） */
export function goodsDetailFixtures() {
  return Object.entries(fixtures).filter(
    ([name, data]) =>
      name.startsWith('goods-') &&
      !name.startsWith('goods-list') &&
      !name.startsWith('goods-hot') &&
      data?.result?.skus?.length,
  )
}

/** 从某个 sku 的 specs 生成「颜色:蓝色 产地:中国」这样的规格文案，与 XtxSku 的输出格式一致 */
export const specsText = (sku) =>
  (sku?.specs || []).map((spec) => `${spec.name}:${spec.valueName}`).join(' ')
