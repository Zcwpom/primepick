import { http } from 'msw'
import { apiPath, fixture, jsonOk, mockDelay } from '../utils'

/** 首页相关：全部直接回放抓取到的真实响应 */
export const homeHandlers = [
  // 顶部导航分类
  http.get(apiPath('/home/category/head'), async () => {
    await mockDelay()
    return jsonOk(fixture('category-head')?.result ?? [])
  }),

  // 轮播图（真实接口按 distributionSite 区分首页/分类页，抓取时两者数据一致）
  http.get(apiPath('/home/banner'), async () => {
    await mockDelay()
    return jsonOk(fixture('home-banner')?.result ?? [])
  }),

  // 新鲜好物
  http.get(apiPath('/home/new'), async () => {
    await mockDelay()
    return jsonOk(fixture('home-new')?.result ?? [])
  }),

  // 人气推荐
  http.get(apiPath('/home/hot'), async () => {
    await mockDelay()
    return jsonOk(fixture('home-hot')?.result ?? [])
  }),

  // 首页商品楼层
  http.get(apiPath('/home/goods'), async () => {
    await mockDelay()
    return jsonOk(fixture('home-goods')?.result ?? [])
  }),

  // 猜你喜欢
  http.get(apiPath('/goods/relevant'), async () => {
    await mockDelay()
    return jsonOk(fixture('goods-relevant')?.result ?? [])
  }),
]
