import { http } from 'msw'
import { apiPath, fixtures, goodsDetailFixtures, jsonOk, mockDelay } from '../utils'

/** 商品详情与热榜 */
export const goodsHandlers = [
  http.get(apiPath('/goods'), async ({ request }) => {
    await mockDelay()
    const id = new URL(request.url).searchParams.get('id')
    // 列表里点进来的商品未必在抓取范围内，用已有详情兜底并把 id 对齐，
    // 保证页面自洽（面包屑、加购用的 sku 都来自同一份数据）
    const detail = fixtures[`goods-${id}`]?.result ?? goodsDetailFixtures()[0]?.[1]?.result ?? null
    return jsonOk(detail ? { ...detail, id: id ?? detail.id } : null)
  }),

  http.get(apiPath('/goods/hot'), async ({ request }) => {
    await mockDelay()
    const params = new URL(request.url).searchParams
    const type = params.get('type') || '1'
    const id = params.get('id')

    const data =
      type === '2'
        ? (fixtures['goods-hot-2']?.result ?? [])
        : (fixtures[`goods-hot-1-${id}`]?.result ?? fixtures['goods-hot-1-3994572']?.result ?? [])

    return jsonOk(data)
  }),
]
