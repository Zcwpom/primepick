/**
 * 订单状态机（纯函数，无副作用、不依赖 Vue）
 *
 * 为什么单独抽成模块：
 * 1. 状态规则原先散落在页面里（`order.orderState === 1` 判断到处都是），
 *    加一个状态就要改多个文件，而且没人能一眼说清「哪些迁移是合法的」；
 * 2. 纯函数可以直接单测（见 order-state.test.js），不用起组件、不用连后端；
 * 3. mock 层与将来的真实后端可以共用同一套规则语义。
 *
 * 状态含义（与后端 orderState 对齐）：
 *   1 待付款 → 2 待发货 → 3 待收货 → 4 待评价 → 5 已完成
 *   1 待付款 → 6 已取消（用户取消 或 超时未支付被服务端关单）
 */

export const ORDER_STATE = {
  UNPAID: 1,
  UNDELIVERED: 2,
  UNRECEIVED: 3,
  UNCOMMENTED: 4,
  COMPLETED: 5,
  CANCELLED: 6,
}

export const ORDER_STATE_TEXT = {
  [ORDER_STATE.UNPAID]: '待付款',
  [ORDER_STATE.UNDELIVERED]: '待发货',
  [ORDER_STATE.UNRECEIVED]: '待收货',
  [ORDER_STATE.UNCOMMENTED]: '待评价',
  [ORDER_STATE.COMPLETED]: '已完成',
  [ORDER_STATE.CANCELLED]: '已取消',
}

export const ORDER_ACTION = {
  PAY: 'pay',
  CANCEL: 'cancel',
  RECEIVE: 'receive',
}

/** 合法迁移表 —— 唯一的真相来源 */
const TRANSITIONS = {
  [ORDER_ACTION.PAY]: { from: [ORDER_STATE.UNPAID], to: ORDER_STATE.UNDELIVERED },
  [ORDER_ACTION.CANCEL]: { from: [ORDER_STATE.UNPAID], to: ORDER_STATE.CANCELLED },
  [ORDER_ACTION.RECEIVE]: { from: [ORDER_STATE.UNRECEIVED], to: ORDER_STATE.UNCOMMENTED },
}

/** 既接受订单对象，也接受裸状态码（便于测试与后端字段直接比对） */
const stateOf = (orderOrState) =>
  Number(orderOrState !== null && typeof orderOrState === 'object' ? orderOrState.orderState : orderOrState)

/**
 * 解析后端时间字符串 "YYYY-MM-DD HH:mm:ss"。
 * 空格分隔的格式在部分浏览器（Safari）会被解析成 Invalid Date，
 * 因此统一替换成 ISO 的 T 分隔再解析（按本地时区）。
 * mock 层与 useCountDown 都复用这里，避免多处各写一份解析逻辑。
 */
export function parseServerTime(value) {
  if (value === null || value === undefined || value === '') return Number.NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return new Date(String(value).replace(' ', 'T')).getTime()
}

/**
 * 支付是否已超时。
 * 注意：**关单是服务端职责**（真实后端有定时任务），前端只负责不再提供支付入口。
 */
export function isPayExpired(order, now = Date.now()) {
  const deadline = parseServerTime(order?.payLatestTime)
  if (!Number.isFinite(deadline)) return false // 没有截止时间就当作不超时
  return now >= deadline
}

/** 某个迁移是否合法 */
export function canTransition(orderOrState, action) {
  const rule = TRANSITIONS[action]
  if (!rule) return false
  return rule.from.includes(stateOf(orderOrState))
}

/** 迁移后的状态；非法迁移返回 null（调用方据此禁用入口） */
export function nextState(orderOrState, action) {
  if (!canTransition(orderOrState, action)) return null
  return TRANSITIONS[action].to
}

export const isUnpaid = (order) => stateOf(order) === ORDER_STATE.UNPAID
export const isPaid = (order) => stateOf(order) === ORDER_STATE.UNDELIVERED
export const isClosed = (order) => stateOf(order) === ORDER_STATE.CANCELLED

/** 可支付 = 处于待付款 **且** 未超时 */
export const canPay = (order, now = Date.now()) =>
  canTransition(order, ORDER_ACTION.PAY) && !isPayExpired(order, now)

export const canCancel = (order) => canTransition(order, ORDER_ACTION.CANCEL)
export const canReceive = (order) => canTransition(order, ORDER_ACTION.RECEIVE)

export const orderStateText = (order) => ORDER_STATE_TEXT[stateOf(order)] || '未知状态'
