import { http } from 'msw'
import { addToCart, getCart, mergeCart, removeFromCart } from '../data-store'
import { apiPath, isAuthed, jsonFail, jsonOk, mockDelay } from '../utils'

/** 购物车：真实可变状态（localStorage 持久化），加购/删除/合并都能真的生效 */
export const cartHandlers = [
  http.get(apiPath('/member/cart'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    return jsonOk(getCart())
  }),

  http.post(apiPath('/member/cart'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const { skuId, count = 1 } = (await request.json().catch(() => ({}))) || {}
    const item = addToCart({ skuId, count })
    if (!item) return jsonFail('商品不存在', { code: '10004' })
    return jsonOk(item)
  }),

  http.delete(apiPath('/member/cart'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    const { ids } = (await request.json().catch(() => ({}))) || {}
    removeFromCart(ids ?? [])
    return jsonOk(null)
  }),

  // 未登录时的本地购物车合并到服务端
  http.post(apiPath('/member/cart/merge'), async ({ request }) => {
    await mockDelay()
    if (!isAuthed(request)) return jsonFail('请先登录', { status: 401 })
    mergeCart((await request.json().catch(() => [])) || [])
    return jsonOk(null)
  }),
]
