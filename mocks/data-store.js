import { fixture, goodsDetailFixtures, specsText } from './utils'

/**
 * mock 数据仓库
 *
 * 为什么不是「直接把 fixture 返回去」：
 * 静态数据只能看，不能操作 —— 加入购物车、删地址、下单这些交互会立刻露馅。
 * 所以购物车 / 地址 / 订单用 localStorage 维护一份可变状态，并**用真实 fixture 做种子**：
 * 数据形状是真的，交互也是真的，刷新页面还能保留。
 *
 * 这份数据在方案 B（自建后端）落地时会直接变成数据库的 seed，不用重写。
 */
const KEYS = {
  cart: 'primepick_mock_cart',
  address: 'primepick_mock_address',
  order: 'primepick_mock_order',
}

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

const pad = (n) => String(n).padStart(2, '0')
const formatTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

/**
 * 解析后端时间字符串 "YYYY-MM-DD HH:mm:ss"。
 * 空格分隔的格式在部分浏览器（Safari）会被解析成 Invalid Date，
 * 统一替换成 ISO 的 T 分隔再解析（按本地时区）。
 */
const toTimestamp = (value) => {
  if (!value) return Number.NaN
  return new Date(String(value).replace(' ', 'T')).getTime()
}

/**
 * 剩余支付时间（秒），与真实接口保持一致：无截止时间或已过期返回 -1。
 * 必须**动态计算** —— 把抓取时刻的秒数原样存下来，下一秒就过期了。
 */
const countdownOf = (payLatestTime) => {
  const end = toTimestamp(payLatestTime)
  if (!Number.isFinite(end)) return -1
  const remain = Math.floor((end - Date.now()) / 1000)
  return remain > 0 ? remain : -1
}

/** 按 skuId 反查商品与 sku（订单项需要它的规格信息） */
function findSku(skuId) {
  for (const [, data] of goodsDetailFixtures()) {
    const goods = data.result
    const sku = goods.skus.find((item) => String(item.id) === String(skuId))
    if (sku) return { goods, sku }
  }
  return null
}

/** 把商品详情 fixture 里的某个 sku 转成购物车项（形状对齐真实接口） */
function toCartItem(goods, sku, count) {
  return {
    id: goods.id,
    skuId: sku.id,
    name: goods.name,
    attrsText: `${specsText(sku)} `,
    specs: [],
    picture: goods.mainPictures?.[0] || goods.picture,
    price: sku.price,
    nowPrice: sku.price,
    nowOriginalPrice: sku.oldPrice || sku.price,
    selected: true,
    stock: sku.inventory ?? 99,
    count,
    isEffective: true,
    discount: null,
    isCollect: false,
    postFee: 0,
  }
}

/** 按 skuId 反查商品信息，保证加购后的购物车项字段完整（而不是拼一个假对象） */
function buildItemBySkuId(skuId, count) {
  const found = findSku(skuId)
  return found ? toCartItem(found.goods, found.sku, count) : null
}

/** 初始购物车：挑第一个**有库存**的 sku，否则演示时会出现「库存不足无法下单」 */
function seedCart() {
  for (const [, data] of goodsDetailFixtures()) {
    const goods = data.result
    const sku = goods.skus.find((item) => item.inventory > 0)
    if (sku) return [toCartItem(goods, sku, 1)]
  }
  return []
}

export function getCart() {
  const cached = read(KEYS.cart, null)
  if (cached) return cached
  const seeded = seedCart()
  write(KEYS.cart, seeded)
  return seeded
}

export function addToCart({ skuId, count = 1 }) {
  const cart = getCart()
  const existing = cart.find((item) => String(item.skuId) === String(skuId))
  if (existing) {
    existing.count += count
    write(KEYS.cart, cart)
    return existing
  }
  const item = buildItemBySkuId(skuId, count)
  if (!item) return null
  cart.push(item)
  write(KEYS.cart, cart)
  return item
}

/** 删除购物车项：前端传的是 skuId 数组，这里同时兼容购物车项 id */
export function removeFromCart(ids = []) {
  const targets = ids.map(String)
  const cart = getCart().filter(
    (item) => !targets.includes(String(item.skuId)) && !targets.includes(String(item.id)),
  )
  write(KEYS.cart, cart)
  return cart
}

/** 本地购物车合并进服务端：同 skuId 累加数量，与真实接口行为一致 */
export function mergeCart(items = []) {
  for (const { skuId, count = 1 } of items) {
    if (skuId !== undefined) addToCart({ skuId, count })
  }
  return getCart()
}

// ---------------- 收货地址 ----------------

export function getAddresses() {
  const cached = read(KEYS.address, null)
  if (cached) return cached
  const seeded = fixture('member-address')?.result || []
  write(KEYS.address, seeded)
  return seeded
}

export function addAddress(payload = {}) {
  const list = getAddresses()
  const address = {
    ...payload,
    id: String(Date.now()),
    // 真实接口由后端根据省市区编码补全 fullLocation，这里做等价的兜底
    fullLocation:
      payload.fullLocation ||
      [payload.provinceCode, payload.cityCode, payload.countyCode].filter(Boolean).join(' '),
  }
  list.push(address)
  write(KEYS.address, list)
  return address
}

export function updateAddress(id, payload = {}) {
  const list = getAddresses()
  const index = list.findIndex((item) => String(item.id) === String(id))
  if (index === -1) return null
  list[index] = { ...list[index], ...payload, id: list[index].id }
  write(KEYS.address, list)
  return list[index]
}

export function removeAddress(id) {
  const list = getAddresses().filter((item) => String(item.id) !== String(id))
  write(KEYS.address, list)
  return list
}

// ---------------- 订单 ----------------

/** 结算预览：由**当前购物车 + 地址**实时算出来，而不是返回一份静态 fixture */
export function getCheckoutPreview() {
  const cart = getCart().filter((item) => item.isEffective !== false)
  const goods = cart.map((item) => {
    const total = Number(item.nowPrice) * item.count
    return {
      skuId: item.skuId,
      count: item.count,
      picture: item.picture,
      name: item.name,
      attrsText: item.attrsText,
      price: item.nowPrice,
      totalPrice: total,
      totalPayPrice: total,
    }
  })
  const totalPrice = goods.reduce((sum, item) => sum + item.totalPrice, 0)
  // 与站点「满 99 元包邮」的口径保持一致
  const postFee = totalPrice > 99 || totalPrice === 0 ? 0 : 5

  return {
    userAddresses: getAddresses(),
    goods,
    summary: {
      goodsCount: goods.reduce((sum, item) => sum + item.count, 0),
      totalPrice,
      postFee,
      totalPayPrice: totalPrice + postFee,
    },
  }
}

export function createOrder(payload = {}) {
  const cart = getCart()
  const orderedGoods = payload.goods || []
  const template = fixture('order-list')?.result?.items?.[0] || {}
  const now = new Date()

  // 订单项以真实订单里的 sku 为模板再覆盖字段。手写字段极易漏：
  // 上一版把 realPay 写成了 realPrice，订单列表金额直接显示为空；
  // 真实契约字段是 realPay / curPrice / properties，而且**没有 skuId，只有 spuId**。
  const skuTemplate = template.skus?.[0] || {}
  const skus = orderedGoods.map(({ skuId, count }) => {
    const cartItem = cart.find((item) => String(item.skuId) === String(skuId)) || {}
    const found = findSku(skuId)
    const price = Number(cartItem.nowPrice ?? found?.sku.price ?? 0)
    return {
      ...skuTemplate,
      id: `mock-sku-${skuId}`,
      spuId: found?.goods.id ?? cartItem.id ?? String(skuId),
      name: cartItem.name ?? found?.goods.name ?? '演示商品',
      quantity: count,
      image: cartItem.picture ?? found?.goods.mainPictures?.[0] ?? '',
      realPay: price,
      curPrice: price,
      totalMoney: price * count,
      properties: (found?.sku.specs ?? []).map((spec) => ({
        propertyMainName: spec.name,
        propertyValueName: spec.valueName,
      })),
      attrsText: cartItem.attrsText ?? specsText(found?.sku),
    }
  })

  const totalMoney = skus.reduce((sum, sku) => sum + sku.realPay * sku.quantity, 0)
  const postFee = totalMoney > 99 ? 0 : 5
  const payMoney = totalMoney + postFee

  const order = {
    // 用真实订单 fixture 当模板，保证字段结构与线上完全一致
    ...template,
    id: String(Date.now()),
    createTime: formatTime(now),
    payType: payload.payType ?? 1,
    payChannel: payload.payChannel ?? 1,
    orderState: 1,
    payLatestTime: formatTime(new Date(now.getTime() + 30 * 60 * 1000)),
    postFee,
    payMoney,
    totalMoney,
    totalNum: orderedGoods.reduce((sum, item) => sum + item.count, 0),
    skus,
    countdown: 30 * 60,
  }

  const created = read(KEYS.order, [])
  created.unshift(order)
  write(KEYS.order, created)

  // 下单成功后移除已下单的 sku（与真实后端行为一致），购物车里其它商品保留
  const orderedIds = orderedGoods.map((item) => String(item.skuId))
  write(
    KEYS.cart,
    cart.filter((item) => !orderedIds.includes(String(item.skuId))),
  )

  return order
}

/**
 * 超时关单。
 * 真实后端有定时任务扫描过期订单并关单；mock 里在**读取时**顺手清扫，
 * 这样「倒计时归零 → 订单真的被关闭」在演示里会发生，
 * 而不是前端自己变个提示、刷新一下又变回待付款。
 */
function sweepExpiredOrders() {
  const created = read(KEYS.order, [])
  let changed = false

  for (const order of created) {
    if (Number(order.orderState) === 1 && countdownOf(order.payLatestTime) === -1) {
      order.orderState = 6 // 已取消（超时未支付）
      order.countdown = -1
      changed = true
    }
  }

  if (changed) write(KEYS.order, created)
  return created
}

/**
 * 定位订单。
 * `mutable: false` 表示这是抓取下来的历史订单（只读）：它们的支付截止时间早已过期，
 * 正好可以用来验证「订单超时」这条路径，但不应该被 mock 真的改写状态。
 */
function locateOrder(id) {
  const created = sweepExpiredOrders()
  const mutable = created.find((item) => String(item.id) === String(id))
  if (mutable) return { order: mutable, mutable: true }

  const captured = fixture('order-list')?.result?.items || []
  const readOnly = captured.find((item) => String(item.id) === String(id))
  if (readOnly) return { order: readOnly, mutable: false }

  return { order: null, mutable: false }
}

export function getOrders({ orderState = 0, page = 1, pageSize = 2 } = {}) {
  const created = sweepExpiredOrders()
  const captured = fixture('order-list')?.result?.items || []
  // 新建的订单排在前面；countdown 每次读取时按当前时间重算
  const all = [...created, ...captured].map((order) => ({
    ...order,
    countdown: countdownOf(order.payLatestTime),
  }))
  const state = Number(orderState)
  const filtered = state === 0 ? all : all.filter((item) => Number(item.orderState) === state)
  const size = Number(pageSize)
  const start = (Number(page) - 1) * size

  return {
    // 真实接口返回的是该账号的全站订单总数（3 万多），对演示没有意义，
    // 这里按 mock 里实际可翻页的数据量返回，保证分页器与数据一致
    counts: filtered.length,
    pageSize: size,
    pages: Math.max(1, Math.ceil(filtered.length / size)),
    page: Number(page),
    items: filtered.slice(start, start + size),
  }
}

export function getOrder(id) {
  const { order } = locateOrder(id)
  if (order) return { ...order, countdown: countdownOf(order.payLatestTime) }
  const template = fixture('order-list')?.result?.items?.[0] || {}
  return { ...template, id: String(id), countdown: -1 }
}

/** 支付订单：真实环境由支付网关回调驱动，mock 里直接推进状态 */
export function payOrder(id, payChannel) {
  const { order, mutable } = locateOrder(id)
  if (!order) return { ok: false, msg: '订单不存在' }
  if (!mutable) {
    return {
      ok: false,
      msg: countdownOf(order.payLatestTime) === -1 ? '订单已超时关闭，请重新下单' : '演示用的历史订单不支持支付',
    }
  }
  if (Number(order.orderState) !== 1) return { ok: false, msg: '订单状态已变更，请刷新后重试' }
  if (countdownOf(order.payLatestTime) === -1) return { ok: false, msg: '订单已超时关闭，请重新下单' }

  const created = read(KEYS.order, [])
  const target = created.find((item) => String(item.id) === String(id))
  target.orderState = 2 // 待发货
  target.countdown = -1
  // 记录用户实际选择的支付渠道：支付结果页要展示它
  if (payChannel !== undefined && payChannel !== null) target.payChannel = Number(payChannel)
  write(KEYS.order, created)
  return { ok: true, order: target }
}

/** 取消订单：仅待付款可取消 */
export function cancelOrder(id) {
  const { order, mutable } = locateOrder(id)
  if (!order || !mutable) return { ok: false, msg: '订单不存在或不可取消' }
  if (Number(order.orderState) !== 1) return { ok: false, msg: '当前状态不可取消' }

  const created = read(KEYS.order, [])
  const target = created.find((item) => String(item.id) === String(id))
  target.orderState = 6 // 已取消
  target.countdown = -1
  write(KEYS.order, created)
  return { ok: true, order: target }
}

/** 确认收货：仅待收货可确认 */
export function receiveOrder(id) {
  const { order, mutable } = locateOrder(id)
  if (!order || !mutable) return { ok: false, msg: '订单不存在' }
  if (Number(order.orderState) !== 3) return { ok: false, msg: '当前状态不可确认收货' }

  const created = read(KEYS.order, [])
  const target = created.find((item) => String(item.id) === String(id))
  target.orderState = 4 // 待评价
  write(KEYS.order, created)
  return { ok: true, order: target }
}
