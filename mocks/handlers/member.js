import { http } from 'msw'
import {
  addAddress,
  cancelOrder,
  createOrder,
  getAddresses,
  getCheckoutPreview,
  getOrder,
  getOrders,
  payOrder,
  receiveOrder,
  removeAddress,
  updateAddress,
} from '../data-store'
import { apiPath, isAuthed, jsonFail, jsonOk, mockDelay } from '../utils'

/**
 * 会员相关：收货地址 + 订单
 *
 * ⚠️ 路由顺序很重要：MSW 按注册顺序匹配，
 * `/member/order/pre` 必须写在 `/member/order/:id` 之前，否则会被当成 id = "pre"。
 */
export const memberHandlers = [
  // ---------- 收货地址 ----------
  http.get(apiPath('/member/address'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    return jsonOk(getAddresses())
  }),

  http.post(apiPath('/member/address'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    return jsonOk(addAddress((await request.json().catch(() => ({}))) || {}))
  }),

  http.put(apiPath('/member/address/:id'), async ({ request, params }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    return jsonOk(updateAddress(params.id, (await request.json().catch(() => ({}))) || {}))
  }),

  http.delete(apiPath('/member/address/:id'), async ({ request, params }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    removeAddress(params.id)
    return jsonOk(null)
  }),

  // ---------- 结算与订单 ----------
  // 结算信息由当前购物车实时算出，而不是回放静态 fixture，否则会与购物车内容不一致
  http.get(apiPath('/member/order/pre'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    return jsonOk(getCheckoutPreview())
  }),

  http.post(apiPath('/member/order'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const payload = (await request.json().catch(() => ({}))) || {}
    // 校验放在边界上（真实后端也会这么做）：空购物车不允许下单
    if (!Array.isArray(payload.goods) || payload.goods.length === 0) {
      return jsonFail('购物车为空，无法创建订单', { code: '20004' })
    }
    return jsonOk(createOrder(payload))
  }),

  http.get(apiPath('/member/order'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const params = new URL(request.url).searchParams
    return jsonOk(
      getOrders({
        orderState: params.get('orderState') ?? 0,
        page: params.get('page') ?? 1,
        pageSize: params.get('pageSize') ?? 2,
      }),
    )
  }),

  // ---------- 订单状态流转 ----------
  // 这三个接口既是 mock 的行为，也是方案 B（自建 Node 后端）的路由契约。
  // 真实环境里「支付成功」由支付网关回调驱动，前端只负责轮询订单状态；
  // mock 里直接提供这个动作，才能让整条链路在演示时真的跑通。
  http.post(apiPath('/member/order/:id/pay'), async ({ request, params }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const body = (await request.json().catch(() => ({}))) || {}
    const result = payOrder(params.id, body.payChannel)
    return result.ok ? jsonOk(result.order) : jsonFail(result.msg, { code: '20001' })
  }),

  http.post(apiPath('/member/order/:id/cancel'), async ({ request, params }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const result = cancelOrder(params.id)
    return result.ok ? jsonOk(result.order) : jsonFail(result.msg, { code: '20002' })
  }),

  http.post(apiPath('/member/order/:id/receive'), async ({ request, params }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const result = receiveOrder(params.id)
    return result.ok ? jsonOk(result.order) : jsonFail(result.msg, { code: '20003' })
  }),

  // 注意：必须放在 /member/order/pre 与上面的 :id/xxx 之后
  http.get(apiPath('/member/order/:id'), async ({ request, params }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    return jsonOk(getOrder(params.id))
  }),
]
