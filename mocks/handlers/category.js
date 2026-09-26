import { http } from 'msw'
import { apiPath, fixtures, jsonOk, mockDelay } from '../utils'

/** 分类页 / 筛选 / 商品列表（分类列表与搜索共用同一个接口） */
export const categoryHandlers = [
  // 分类页数据：抓取时只有部分分类 id 能取到数据，其余用已有分类兜底并保持 id 一致
  http.get(apiPath('/category'), async ({ request }) => {
    await mockDelay()
    const id = new URL(request.url).searchParams.get('id')
    const data = fixtures[`category-${id}`]?.result ?? fixtures['category-1005000']?.result ?? null
    return jsonOk(data ? { ...data, id: id ?? data.id } : null)
  }),

  // 二级分类筛选条件（品牌、属性等）
  http.get(apiPath('/category/sub/filter'), async ({ request }) => {
    await mockDelay()
    const id = new URL(request.url).searchParams.get('id')
    const data = fixtures[`sub-filter-${id}`]?.result ?? fixtures['sub-filter-1008017']?.result ?? null
    return jsonOk(data ? { ...data, id: id ?? data.id } : null)
  }),

  // 商品列表：分类筛选与关键词搜索走同一路径，用请求体区分
  http.post(apiPath('/category/goods/temporary'), async ({ request }) => {
    await mockDelay()
    const body = (await request.json().catch(() => ({}))) || {}
    const { keyword, page = 1, pageSize = 20, sortField = 'publishTime' } = body

    const source = pickGoodsList(keyword)
    const sorted = applySort(source, sortField)
    const size = Number(pageSize)
    const start = (Number(page) - 1) * size
    const items = sorted.slice(start, start + size)

    return jsonOk({
      // 真实接口的 counts 是该分类的全站商品数（上千），mock 里只按实际抓到的数据量返回，
      // 否则「加载更多」会翻出永远不存在的页码
      counts: sorted.length,
      pageSize: size,
      pages: Math.max(1, Math.ceil(sorted.length / size)),
      page: Number(page),
      items,
    })
  }),
]

/**
 * 取商品列表数据源。
 * 抓取时只有「鞋」这个关键词返回了数据（教学库里的商品集中在服饰鞋包），
 * 所以其它关键词回退到完整列表 —— 演示时搜任何词都有结果，而不是一片空白。
 */
function pickGoodsList(keyword) {
  const pools = ['goods-list-category-p1', 'goods-list-category-p2', 'goods-list-keyword-shoes']
    .map((name) => fixtures[name]?.result?.items ?? [])
    .flat()

  // 按 id 去重（同一批数据可能在多个 fixture 里重复出现）
  const unique = [...new Map(pools.map((item) => [String(item.id), item])).values()]

  if (!keyword) return unique
  const matched = unique.filter((item) => item.name?.includes(keyword))
  return matched.length > 0 ? matched : unique
}

function applySort(list, sortField) {
  if (sortField === 'orderNum') {
    return [...list].sort((a, b) => (b.orderNum ?? 0) - (a.orderNum ?? 0))
  }
  // evaluateNum 依赖评价数据，抓取到的列表里没有该字段，保持接口默认顺序
  return list
}
