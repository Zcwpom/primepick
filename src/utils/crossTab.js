/**
 * 跨标签页通知
 *
 * 场景：用户在标签页 A 完成支付或取消订单，标签页 B 的订单列表还停在旧状态
 * （两个标签页各自的组件状态是独立的，服务端状态变了它们不会自动同步）。
 *
 * 实现：优先用 BroadcastChannel；不支持时退回 localStorage + storage 事件兜底。
 * 注意 BroadcastChannel 不会把消息回传给发送者本身，所以不存在自触发循环。
 */

const CHANNEL_NAME = 'primepick'
const ORDER_CHANGED = 'order:changed'

let channel = null

/** 用 globalThis 取：既避开 ESLint 的 no-undef，也能安全探测不支持的环境 */
const getChannel = () => {
  const Channel = globalThis.BroadcastChannel
  if (typeof Channel !== 'function') return null
  if (!channel) channel = new Channel(CHANNEL_NAME)
  return channel
}

/** 订单状态发生变化时通知其它标签页 */
export function notifyOrderChanged(payload = {}) {
  const message = { type: ORDER_CHANGED, payload, at: Date.now() }
  const bus = getChannel()
  if (bus) {
    bus.postMessage(message)
    return
  }
  try {
    localStorage.setItem(`${CHANNEL_NAME}:${ORDER_CHANGED}`, JSON.stringify(message))
  } catch {
    // 隐私模式等场景下 localStorage 不可用，忽略即可：跨标签同步是增强而非必需
  }
}

/**
 * 监听其它标签页的订单变更
 * @returns {() => void} 取消监听（组件卸载时务必调用，否则会泄漏）
 */
export function onOrderChanged(handler) {
  const bus = getChannel()
  if (bus) {
    const listener = (event) => {
      if (event.data?.type === ORDER_CHANGED) handler(event.data.payload)
    }
    bus.addEventListener('message', listener)
    return () => bus.removeEventListener('message', listener)
  }

  const key = `${CHANNEL_NAME}:${ORDER_CHANGED}`
  const listener = (event) => {
    if (event.key !== key || !event.newValue) return
    try {
      handler(JSON.parse(event.newValue).payload)
    } catch {
      // 脏数据忽略
    }
  }
  globalThis.addEventListener('storage', listener)
  return () => globalThis.removeEventListener('storage', listener)
}
