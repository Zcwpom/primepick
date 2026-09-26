#!/usr/bin/env node
/**
 * 抓取线上接口的真实响应，生成 MSW fixtures
 *
 * 用法：
 *   node scripts/capture-fixtures.mjs
 *   CAPTURE_API_BASE=https://... node scripts/capture-fixtures.mjs   # 换目标环境
 *
 * 为什么要有这个脚本：
 * 1. 项目原先依赖第三方教学 API，它随时可能下线 —— fixture 必须在它活着的时候抓下来；
 * 2. mock 数据必须是「真实响应结构」，手写的假数据骗不过自己，也骗不过面试官；
 * 3. 抓下来的 fixture 后续还能直接当自建后端（方案 B）的数据库种子数据。
 *
 * 产出：
 *   mocks/fixtures/*.json          每个接口一份真实响应（保留 {code,msg,result} 信封）
 *   mocks/fixtures/_manifest.json  端点 → 文件 的映射，即接口契约清单
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'mocks', 'fixtures')
const API_BASE = process.env.CAPTURE_API_BASE || 'https://pcapi-xiaotuxian-front-devtest.itheima.net'
const ACCOUNT = { account: 'xiaotuxian001', password: '123456' }

const manifest = []
const rows = []
let token = ''

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 发一次请求，成功则落盘；失败不中断整个抓取流程 */
async function capture(file, path, { method = 'GET', query, body, auth = false, note = '' } = {}) {
  const url = new URL(API_BASE + path)
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    let payload
    try {
      payload = JSON.parse(text)
    } catch {
      throw new Error(`响应不是 JSON: ${text.slice(0, 120)}`)
    }

    const ok = res.ok && payload?.result !== undefined
    // 只落盘成功响应：错误响应（参数错误、对象不存在）没有 mock 价值，
    // 留在 fixtures 目录里只会让人误以为那是有效契约
    if (ok) {
      writeFileSync(join(OUT_DIR, `${file}.json`), `${JSON.stringify(payload, null, 2)}\n`)
      manifest.push({ file: `${file}.json`, method, path, query, body, auth, note })
    }

    rows.push({
      file,
      method,
      path,
      status: res.status,
      ok,
      size: `${(text.length / 1024).toFixed(1)} kB`,
      note: ok ? '' : `code=${payload?.code} msg=${payload?.msg}`,
    })
    return payload
  } catch (err) {
    rows.push({ file, method, path, status: 'ERR', ok: false, size: '-', note: err.message })
    return null
  } finally {
    await sleep(150) // 礼貌性限速，别把测试环境打挂
  }
}

function collectIds(payload, path, limit) {
  const ids = []
  const walk = (node) => {
    if (ids.length >= limit || node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node.id !== undefined && node.name !== undefined) ids.push(node.id)
    for (const value of Object.values(node)) walk(value)
  }
  walk(payload?.[path])
  return [...new Set(ids)].slice(0, limit)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`抓取目标：${API_BASE}\n`)

  // ---------- 公开接口 ----------
  const head = await capture('category-head', '/home/category/head', { note: '顶部导航分类' })
  const categoryIds = collectIds(head, 'result', 3)
  const categoryId = categoryIds[0] ?? 1005000

  await capture('home-banner', '/home/banner', { query: { distributionSite: 1 }, note: '首页轮播' })
  const newGoods = await capture('home-new', '/home/new', { note: '新鲜好物' })
  await capture('home-hot', '/home/hot', { note: '人气推荐' })
  const allGoods = await capture('home-goods', '/home/goods', { note: '全部商品模块（首页楼层）' })
  await capture('goods-relevant', '/goods/relevant', { query: { limit: 4 }, note: '猜你喜欢' })

  // 分类页 / 筛选 / 商品列表
  if (categoryIds.length) {
    for (const id of categoryIds) {
      await capture(`category-${id}`, '/category', { query: { id }, note: `分类页 ${id}` })
      await capture(`sub-filter-${id}`, '/category/sub/filter', { query: { id }, note: `二级筛选 ${id}` })
    }
  }

  const goodsList = await capture('goods-list-category-p1', '/category/goods/temporary', {
    method: 'POST',
    body: { categoryId, page: 1, pageSize: 20, sortField: 'publishTime' },
    note: '分类商品列表 第1页',
  })
  await capture('goods-list-category-p2', '/category/goods/temporary', {
    method: 'POST',
    body: { categoryId, page: 2, pageSize: 20, sortField: 'publishTime' },
    note: '分类商品列表 第2页（无限滚动用）',
  })

  // 搜索：挑一个能搜出结果的词
  for (const keyword of ['手机', '电脑', '连衣裙', '鞋', '美妆']) {
    const res = await capture(`goods-list-keyword-${encodeURIComponent(keyword)}`, '/category/goods/temporary', {
      method: 'POST',
      body: { page: 1, pageSize: 20, sortField: 'publishTime', keyword },
      note: `搜索 ${keyword}`,
    })
    if (res?.result?.items?.length) break
  }

  // 商品详情：给列表里出现的商品各抓一份，mock 才能按 id 返回不同商品
  const goodsIds = [
    ...new Set([
      ...collectIds(newGoods, 'result', 4),
      ...collectIds(allGoods, 'result', 4),
      ...collectIds(goodsList, 'result', 4),
    ]),
  ].slice(0, 6)

  let firstSkuId
  for (const id of goodsIds) {
    const detail = await capture(`goods-${id}`, '/goods', { query: { id }, note: `商品详情 ${id}` })
    if (!firstSkuId && detail?.result?.skus?.length) firstSkuId = detail.result.skus[0].id
    if (detail?.result) {
      await capture(`goods-hot-1-${id}`, '/goods/hot', {
        query: { id, type: 1, limit: 3 },
        note: '24小时热销榜',
      })
    }
  }
  // 热榜与详情无关，抓一份通用兜底即可
  await capture('goods-hot-2', '/goods/hot', { query: { type: 2, limit: 3 }, note: '周热销榜' })

  // ---------- 登录 ----------
  const login = await capture('login', '/login', { method: 'POST', body: ACCOUNT, note: '登录（含 token）' })
  token = login?.result?.token || ''
  if (!token) {
    console.log('\n⚠️  未拿到 token，/member/* 相关接口将全部跳过。')
  }

  // ---------- 需登录接口 ----------
  if (token) {
    await capture('member-cart', '/member/cart', { auth: true, note: '购物车列表' })
    if (firstSkuId) {
      await capture('member-cart-insert', '/member/cart', {
        method: 'POST',
        auth: true,
        body: { skuId: firstSkuId, count: 1 },
        note: '加入购物车',
      })
      await capture('member-cart-after-insert', '/member/cart', { auth: true, note: '加购后的购物车列表' })
    }
    await capture('member-cart-merge', '/member/cart/merge', {
      method: 'POST',
      auth: true,
      body: firstSkuId ? [{ skuId: firstSkuId, count: 1, selected: true }] : [],
      note: '本地购物车合并',
    })
    await capture('member-cart-after-merge', '/member/cart', { auth: true, note: '合并后的购物车列表' })

    const address = await capture('member-address', '/member/address', { auth: true, note: '收货地址列表' })
    const addressId = Array.isArray(address?.result) ? address.result[0]?.id : undefined

    const pre = await capture('order-pre', '/member/order/pre', { auth: true, note: '结算页信息' })
    await capture('order-list', '/member/order', {
      auth: true,
      query: { orderState: 0, page: 1, pageSize: 2 },
      note: '订单列表（全部）',
    })

    // 创建一笔真实订单，以便拿到订单详情 —— 教学测试环境，副作用可接受
    const goods = (pre?.result?.goods || []).map((g) => ({ skuId: g.skuId, count: g.count }))
    if (addressId && goods.length) {
      const order = await capture('order-create', '/member/order', {
        method: 'POST',
        auth: true,
        body: {
          deliveryTimeType: 1,
          payType: 1,
          payChannel: 1,
          buyerMessage: '',
          goods,
          addressId,
        },
        note: '创建订单',
      })
      const orderId = order?.result?.id
      if (orderId) {
        await capture('order-detail', `/member/order/${orderId}`, { auth: true, note: `订单详情 ${orderId}` })
        await capture('order-list-after-create', '/member/order', {
          auth: true,
          query: { orderState: 0, page: 1, pageSize: 2 },
          note: '下单后的订单列表',
        })
      }
    }
  }

  // ---------- 落盘契约清单 ----------
  writeFileSync(
    join(OUT_DIR, '_manifest.json'),
    `${JSON.stringify({ apiBase: API_BASE, capturedAt: new Date().toISOString(), endpoints: manifest }, null, 2)}\n`,
  )

  // ---------- 输出报告 ----------
  const okCount = rows.filter((r) => r.ok).length
  console.log('抓取结果')
  console.log('─'.repeat(96))
  for (const r of rows) {
    const flag = r.ok ? '✓' : '✗'
    console.log(
      `${flag} ${r.file.padEnd(34)} ${String(r.status).padStart(4)}  ${r.size.padStart(8)}  ${r.note}`,
    )
  }
  console.log('─'.repeat(96))
  console.log(`成功 ${okCount} / ${rows.length}，fixtures 输出目录：mocks/fixtures/`)

  const skipped = rows.filter((r) => !r.ok)
  if (skipped.length) {
    console.log(`\n未成功（${skipped.length} 个，多为无数据或该接口不存在，可后续手工补）：`)
    for (const r of skipped) console.log(`  - ${r.method} ${r.path}  ${r.note}`)
  }
}

main().catch((err) => {
  console.error('抓取脚本执行失败：', err)
  process.exit(1)
})
