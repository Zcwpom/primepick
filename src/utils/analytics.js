/**
 * 极简埋点 + 支付漏斗
 *
 * 目的不是做通用 SDK，而是把**支付漏斗**量化出来：
 *   创建订单 → 提交支付 → 支付确认成功（或失败）
 * 每一步的到达次数、相邻步骤的转化率、以及「从下单到确认」的耗时都能算出来，
 * 这样在面试里可以讲「漏斗在哪里流失」而不是干巴巴一句「我加了埋点」。
 *
 * 刻意的取舍：事件只放内存（环形缓冲）+ 开发环境打印，**不上报、不落库** ——
 * 演示项目没有收集端，硬造一个假的网络上报反而更可疑。
 * 将来接真实上报（Sentry / 自建）只需要改 report()。
 */
const MAX_EVENTS = 200
const events = []

export const EVENTS = {
  ORDER_CREATED: 'order_created',
  PAY_SUBMITTED: 'pay_submitted',
  PAY_CONFIRMED: 'pay_confirmed',
  PAY_FAILED: 'pay_failed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_RECEIVED: 'order_received',
}

function report(event) {
  // 接入真实上报时替换这里（Sentry / 自建接口 / sendBeacon）
  if (import.meta.env.DEV) console.debug('[track]', event.name, event.payload)
}

export function track(name, payload = {}) {
  const event = { name, payload, at: Date.now() }
  events.push(event)
  if (events.length > MAX_EVENTS) events.shift()
  report(event)
  return event
}

/** 取某个订单「创建 → 支付确认」的耗时（毫秒）；拿不到返回 null */
export function getPayDuration(orderId) {
  if (orderId === undefined || orderId === null) return null
  const id = String(orderId)
  const created = events.find(
    (event) => event.name === EVENTS.ORDER_CREATED && String(event.payload.orderId) === id,
  )
  const confirmed = [...events]
    .reverse()
    .find((event) => event.name === EVENTS.PAY_CONFIRMED && String(event.payload.orderId) === id)
  if (!created || !confirmed) return null
  return confirmed.at - created.at
}

/** 支付漏斗：各步到达次数 + 转化率（百分比，保留 1 位小数） */
export function getPayFunnel() {
  const count = (name) => events.filter((event) => event.name === name).length
  const created = count(EVENTS.ORDER_CREATED)
  const submitted = count(EVENTS.PAY_SUBMITTED)
  const confirmed = count(EVENTS.PAY_CONFIRMED)
  const failed = count(EVENTS.PAY_FAILED)
  const rate = (from, to) => (from > 0 ? Number(((to / from) * 100).toFixed(1)) : null)

  return {
    steps: { created, submitted, confirmed, failed },
    conversion: {
      createdToSubmitted: rate(created, submitted),
      submittedToConfirmed: rate(submitted, confirmed),
      overall: rate(created, confirmed),
    },
  }
}

export const getEvents = () => [...events]

// 开发环境挂到全局，便于在 devtools 里直接看漏斗数据
if (import.meta.env.DEV) {
  globalThis.__primepickAnalytics = { getEvents, getPayFunnel, getPayDuration, EVENTS, track }
}
