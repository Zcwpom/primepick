#!/usr/bin/env node
/**
 * mock 层端到端冒烟测试
 *
 * 用法：
 *   npm run smoke                         # 自起 preview 检查构建产物
 *   node scripts/smoke-mock.mjs --base http://127.0.0.1:5173   # 检查已在运行的 dev server
 *   node scripts/smoke-mock.mjs --base https://<user>.github.io/<repo> --api-base /<repo>/api
 *                                         # 直接对线上（子路径部署）跑同一套断言
 *
 * 为什么需要它：
 * lint / build 只能证明「代码能编译」，证明不了「浏览器里真的有数据」。
 * 这个脚本会真的把页面打开，等商品卡片渲染出来，再断言：
 *   1. 商品卡片渲染成功          → 列表接口返回了数据
 *   2. 图片来自 fixture 里的域名  → 用的确实是 mock 数据
 *   3. <title> 被改写成「首页 ·」 → router.afterEach 正常执行
 *   4. 没有未捕获异常             → mock 层没有运行时报错
 *
 * 浏览器/CDP 相关工具见 scripts/lib/browser.mjs（与截图脚本共用）。
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  connectCdp,
  createBrowserProfile,
  evaluate,
  findBrowser,
  killTree,
  launchBrowser,
  removeProfile,
  sleep,
  startServer,
  waitForHttp,
  waitForTarget,
  waitForValue,
} from './lib/browser.mjs'

/**
 * 在页面上下文里直接调 mock 接口（带登录 token）。
 * 用来验证「后端行为」——DOM 断言只能证明页面渲染了，证明不了状态流转对不对。
 */
async function apiCall(client, path, { method = 'GET', body } = {}) {
  const parts = [`headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token-smoke' }`]
  if (method !== 'GET') parts.push(`method: ${JSON.stringify(method)}`)
  if (body !== undefined) parts.push(`body: ${JSON.stringify(JSON.stringify(body))}`)

  const res = await client.send('Runtime.evaluate', {
    expression: `(async () => {
      const response = await fetch(${JSON.stringify(withApiBase(path))}, { ${parts.join(', ')} })
      return JSON.stringify({ status: response.status, body: await response.json().catch(() => ({})) })
    })()`,
    awaitPromise: true,
    returnByValue: true,
  })
  try {
    return JSON.parse(res?.result?.value || '{}')
  } catch {
    return { status: 0, body: {} }
  }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const baseIndex = argv.indexOf('--base')
const PORT = 4173
const SERVER = `http://127.0.0.1:${PORT}`
const BASE = (baseIndex === -1 ? SERVER : argv[baseIndex + 1]).replace(/\/$/, '')
const DEBUG_PORT = 9222

/**
 * 接口前缀。默认 /api（根路径部署）。
 * 子路径部署（GitHub Pages 的 /<repo>/）下必须传 --api-base /<repo>/api ——
 * 否则请求会落到 Service Worker 作用域之外，mock 拦不住，接口全部 404。
 */
const apiBaseIndex = argv.indexOf('--api-base')
const API_BASE = (apiBaseIndex === -1 ? '/api' : argv[apiBaseIndex + 1]).replace(/\/$/, '')
const withApiBase = (path) => (API_BASE === '/api' ? path : path.replace(/^\/api/, API_BASE))

/**
 * 站点自身的路径前缀（子路径部署时非空，例如 /primepick）。
 * 断言「当前在哪个页面」时必须带上它，否则子路径部署下会全部误报失败 ——
 * 第一版就是写死了 location.pathname === '/pay'，在本地根路径通过、一放到
 * 子路径就报错，而真正的失败原因（页面其实没跳错）被掩盖了。
 */
const BASE_PATH = (() => {
  try {
    return new URL(BASE).pathname.replace(/\/$/, '')
  } catch {
    return ''
  }
})()
const pagePath = (suffix) => `${BASE_PATH}${suffix}`
const HOME_TITLE_HEX = 'e9a696e9a1b5' // 「首页」的 UTF-8 十六进制，避免脚本里硬编码中文

async function main() {
  const browser = findBrowser()
  if (!browser) {
    console.error('未找到 Edge / Chrome，无法执行浏览器冒烟测试')
    process.exit(2)
  }

  const profileDir = createBrowserProfile()
  console.log(`浏览器: ${browser}`)
  console.log(`目标:   ${BASE}\n`)

  let server
  let browserProc
  let client

  const cleanup = () => {
    try {
      client?.close()
    } catch { /* 忽略 */ }
    killTree(browserProc?.pid)
    killTree(server?.proc?.pid)
    removeProfile(profileDir)
  }

  try {
    if (BASE === SERVER) {
      server = startServer(`npm run preview -- --port ${PORT} --host 127.0.0.1`, ROOT)
      if (!(await waitForHttp(`${SERVER}/`, 30000))) {
        console.error('  preview 输出：\n' + server.readLog())
        throw new Error('preview 服务启动超时')
      }
      console.log('  [OK]   preview 服务就绪')
    } else {
      if (!(await waitForHttp(`${BASE}/`, 15000))) throw new Error(`目标站点不可访问: ${BASE}`)
      console.log('  [OK]   目标站点可访问')
    }

    browserProc = launchBrowser({ browser, debugPort: DEBUG_PORT, profileDir })
    const target = await waitForTarget(DEBUG_PORT)
    if (!target) throw new Error('浏览器调试端口未就绪')
    console.log('  [OK]   无头浏览器已启动\n')

    client = await connectCdp(target.webSocketDebuggerUrl)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Page.navigate', { url: `${BASE}/` })

    const cards = await waitForValue(client, 'document.querySelectorAll(".goods-item").length', 30000)

    // 用页面内求值做断言，而不是匹配整份 DOM 字符串 ——
    // 早先的写法（html.includes('app-boot')）被 index.html 里 <style> 的同类名误判过一次
    const probeRes = await client.send('Runtime.evaluate', {
      expression: `JSON.stringify({
        cards: document.querySelectorAll('.goods-item').length,
        bootPlaceholder: !!document.querySelector('#app .app-boot'),
        images: document.images.length,
        fixtureImages: [...document.images].filter((img) => /nosdn\\.127\\.net|aliyuncs\\.com/.test(img.src)).length,
        appRendered: (document.querySelector('#app')?.innerHTML || '').length,
        title: document.title
      })`,
      returnByValue: true,
    })
    const probe = JSON.parse(probeRes?.result?.value || '{}')
    const titleHex = Buffer.from(probe.title || '', 'utf8').toString('hex')
    const errors = client.events.filter(
      (e) => e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error'),
    )

    const checks = [
      { name: `商品卡片渲染成功（.goods-item x${probe.cards ?? cards}）`, pass: (probe.cards ?? 0) > 0 },
      {
        name: 'Vue 已挂载（首屏占位被替换）',
        pass: probe.bootPlaceholder === false && probe.appRendered > 2000,
      },
      { name: `图片来自 fixture 真实数据（${probe.fixtureImages}/${probe.images} 张）`, pass: probe.fixtureImages > 0 },
      { name: '文档标题被 router.afterEach 改写', pass: titleHex.startsWith(HOME_TITLE_HEX) },
      { name: '没有未捕获异常 / console.error', pass: errors.length === 0 },
    ]

    console.log(`  #app 渲染内容 ${((probe.appRendered ?? 0) / 1024).toFixed(1)} kB，<img> ${probe.images ?? 0} 张`)

    // ---------- 详情页健壮性 ----------
    // 这个商品的真实响应里**没有 brand 字段**：原先模板直接取 goods.brand.name，
    // 渲染期抛 TypeError，整个详情页内容区空白（截图/GIF 里表现为「点进商品什么都没有」）。
    // 字段缺失是真实数据的常态，所以这条要固化进冒烟。
    console.log('\n  详情页健壮性：')
    await client.send('Page.navigate', { url: `${BASE}/detail/1369155859933827074` })
    await waitForValue(client, '!!document.querySelector(".goods-sku")', 25000)
    const detailProbe = JSON.parse((await evaluate(client, `JSON.stringify({
      hasName: !!document.querySelector('.g-name'),
      hasSku: !!document.querySelector('.goods-sku'),
      breadcrumbs: document.querySelectorAll('.el-breadcrumb__item').length
    })`)) || '{}')
    checks.push({
      name: `无 brand 字段的商品详情页正常渲染（面包屑 ${detailProbe.breadcrumbs} 项）`,
      pass: Boolean(detailProbe.hasName) && Boolean(detailProbe.hasSku) && detailProbe.breadcrumbs >= 3,
    })

    // ---------- 支付链路 ----------
    // 上一轮就是这里漏检：mock 生成的订单项字段名写错（realPrice ≠ realPay），
    // 首页冒烟完全覆盖不到，直到截图才发现订单列表金额是空的。
    // 现在把「下单 → 支付页 → 点击支付 → 结果页 → 订单状态」整条链路纳入断言。
    // ---------- 演示账号 ----------
    // README / 登录页预填 / mock 校验 三处的凭据必须一致，
    // 否则面试官按 README 输入却登不进去 —— 这种低级失配值得一条断言盯着。
    console.log('\n  演示账号：')
    const loginOk = await apiCall(client, '/api/login', {
      method: 'POST',
      body: { account: 'demo', password: '123456' },
    })
    checks.push({
      name: `演示账号 demo 可以登录（${loginOk.body?.result?.token ? '已签发 token' : '未签发 token'}）`,
      pass: Number(loginOk.body?.code) === 1 && Boolean(loginOk.body?.result?.token),
    })

    const loginBad = await apiCall(client, '/api/login', {
      method: 'POST',
      body: { account: 'demo', password: 'wrong-password' },
    })
    checks.push({
      name: `错误密码被拒绝（HTTP ${loginBad.status}）`,
      pass: loginBad.status >= 400 || Number(loginBad.body?.code) !== 1,
    })

    console.log('\n  支付链路：')
    await evaluate(
      client,
      `localStorage.setItem('user', ${JSON.stringify(JSON.stringify({
        userInfo: { token: 'mock-token-smoke', account: 'demo', nickname: 'smoke', avatar: '' },
      }))})`,
    )

    const pre = await apiCall(client, '/api/member/order/pre')
    const previewGoods = pre.body?.result?.goods ?? []

    // 这一单刻意走**真实 UI** 下单（结算页点「提交订单」），而不是直接 fetch 建单：
    //  1. 埋点里的 order_created 只有走结算页才会被记录，后面要断言支付耗时；
    //  2. 走 UI 是 SPA 路由跳转，**不刷新页面**，所以内存里的埋点事件不会丢 ——
    //     如果这里用 Page.navigate 整页跳转，事件会被清空，断言必然失败。
    await client.send('Page.navigate', { url: `${BASE}/checkout` })
    await waitForValue(client, '!!document.querySelector(".submit .el-button")', 25000)
    await sleep(600)
    await evaluate(client, 'document.querySelector(".submit .el-button").click() ?? true')
    const reachedPayPage = await waitForValue(client, `location.pathname === ${JSON.stringify(pagePath('/pay'))}`, 20000)
    if (!reachedPayPage) {
      // 断言失败时把期望值与实际值都打出来，避免「只有一句未通过」没法排查
      console.log(`  [!!]   未进入支付页：期望 pathname=${pagePath('/pay')}，实际=${await evaluate(client, 'location.pathname')}`)
    }
    const orderId = String((await evaluate(client, 'new URLSearchParams(location.search).get("id")')) || '')
    const before = orderId ? await apiCall(client, `/api/member/order/${orderId}`) : { body: {} }
    console.log(`  [..]   已创建订单 ${orderId}（支付前状态 ${before.body?.result?.orderState}）`)

    // 现在已经在支付页上了（SPA 跳转过来的，不要重新 navigate）
    const payReady = await waitForValue(client, '!!document.querySelector(".pay-btn")', 25000)
    const payProbe = JSON.parse((await evaluate(client, `JSON.stringify({
      url: location.pathname + location.search,
      title: document.title,
      hasOrderId: document.body.innerText.includes(${JSON.stringify(orderId)}),
      hasQrCode: [...document.images].some((img) => img.src.startsWith('data:image/')),
      hasButton: !!document.querySelector('.pay-btn'),
      text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 220)
    })`)) || '{}')
    if (!payReady) {
      // 失败时把「实际落在哪个页面」打出来，否则只有一句「未通过」根本没法排查
      console.log(`  [!!]   支付页未就绪 -> url=${payProbe.url} title=${payProbe.title}`)
      console.log(`         页面文本: ${payProbe.text}`)
    }

    // 点一次「我已完成支付」，等它跳到支付结果页
    await evaluate(client, 'document.querySelector(".pay-btn")?.click() ?? true')
    const reachedCallback = await waitForValue(client, `location.pathname === ${JSON.stringify(pagePath('/paycallback'))}`, 20000)
    if (!reachedCallback) {
      console.log(`  [!!]   未进入支付结果页：期望 pathname=${pagePath('/paycallback')}，实际=${await evaluate(client, 'location.pathname')}`)
    }
    const callbackProbe = JSON.parse((await evaluate(client, `JSON.stringify({
      success: !!document.querySelector('.pay-result .green'),
      // 埋点耗时是否真的渲染出来了（支付结果页的「支付耗时：X.X 秒」）
      durationShown: /\\d+(\\.\\d+)? 秒/.test(document.body.innerText)
    })`)) || '{}')

    const after = orderId ? await apiCall(client, `/api/member/order/${orderId}`) : { body: {} }
    const skuFields = Object.keys(after.body?.result?.skus?.[0] ?? {})

    checks.push(
      { name: `结算预览有商品（${previewGoods.length} 件）`, pass: previewGoods.length > 0 },
      { name: `结算页提交订单后进入支付页（id=${orderId}）`, pass: Boolean(reachedPayPage) && Boolean(orderId) },
      { name: `支付前订单状态为待付款（orderState=${before.body?.result?.orderState}）`, pass: Number(before.body?.result?.orderState) === 1 },
      {
        name: `订单项字段符合线上契约（${skuFields.join(' / ') || '空'}）`,
        pass: ['realPay', 'curPrice', 'properties', 'spuId'].every((key) => skuFields.includes(key))
          && Number(after.body?.result?.skus?.[0]?.realPay) > 0,
      },
      { name: '支付页展示订单编号 + 动态二维码 + 支付按钮', pass: Boolean(payProbe.hasOrderId) && Boolean(payProbe.hasQrCode) && Boolean(payProbe.hasButton) },
      { name: '点击支付后进入支付结果页且显示成功', pass: Boolean(reachedCallback) && Boolean(callbackProbe.success) },
      { name: '支付结果页展示埋点耗时（下单 → 支付确认）', pass: Boolean(callbackProbe.durationShown) },
      { name: `支付后订单状态变为待发货（orderState=${after.body?.result?.orderState}）`, pass: Number(after.body?.result?.orderState) === 2 },
    )

    // ---------- P1：支付渠道 / 取消订单 / 超时关单 ----------
    // 下单会把购物车里已下单的 sku 移除，所以每一单之前都要重新加购
    const addOneToCart = async () => {
      const skuId = previewGoods[0]?.skuId
      if (skuId) await apiCall(client, '/api/member/cart', { method: 'POST', body: { skuId, count: 1 } })
    }
    const createOneOrder = async () => {
      await addOneToCart()
      const res = await apiCall(client, '/api/member/order', {
        method: 'POST',
        body: {
          deliveryTimeType: 1,
          payType: 1,
          payChannel: 1,
          buyerMessage: '',
          goods: previewGoods.map((item) => ({ skuId: item.skuId, count: item.count })),
          addressId: pre.body?.result?.userAddresses?.[0]?.id,
        },
      })
      return String(res.body?.result?.id ?? '')
    }

    // 1) 支付渠道贯通：选微信支付(2) 提交，订单上要记下来（支付结果页会回显）
    const channelOrderId = await createOneOrder()
    const channelPaid = await apiCall(client, `/api/member/order/${channelOrderId}/pay`, {
      method: 'POST',
      body: { payChannel: 2 },
    })
    const channelAfter = await apiCall(client, `/api/member/order/${channelOrderId}`)
    checks.push({
      name: `支付渠道贯通到订单（payChannel=${channelAfter.body?.result?.payChannel}）`,
      pass: channelPaid.status === 200 && Number(channelAfter.body?.result?.payChannel) === 2,
    })

    // 2) 取消订单：状态应变为已取消(6)
    const cancelOrderId = await createOneOrder()
    const cancelled = await apiCall(client, `/api/member/order/${cancelOrderId}/cancel`, { method: 'POST' })
    const cancelAfter = await apiCall(client, `/api/member/order/${cancelOrderId}`)
    checks.push({
      name: `取消订单后状态为已取消（orderState=${cancelAfter.body?.result?.orderState}）`,
      pass: cancelled.status === 200 && Number(cancelAfter.body?.result?.orderState) === 6,
    })

    // 3) 超时关单：抓下来的历史订单支付截止时间早已过期，mock 在读取时会把它关掉；
    //    支付页必须展示「已关闭」而不是继续给一个能点的支付按钮
    const allOrders = await apiCall(client, '/api/member/order?orderState=0&page=1&pageSize=10')
    const closedOrder = (allOrders.body?.result?.items || []).find((item) => Number(item.orderState) === 6)
    let closedProbe = {}
    if (closedOrder) {
      await client.send('Page.navigate', { url: `${BASE}/pay?id=${closedOrder.id}` })
      await waitForValue(client, '!!document.querySelector(".state-block")', 20000)
      closedProbe = JSON.parse((await evaluate(client, `JSON.stringify({
        hasStateBlock: !!document.querySelector('.state-block'),
        hasPayButton: !!document.querySelector('.pay-btn')
      })`)) || '{}')
    }
    checks.push({
      name: `已关闭的订单不显示支付按钮（${closedOrder ? `orderState=${closedOrder.orderState}` : '未找到已关闭订单'}）`,
      pass: Boolean(closedOrder) && Boolean(closedProbe.hasStateBlock) && !closedProbe.hasPayButton,
    })

    console.log('\n  断言：')
    for (const check of checks) console.log(`  ${check.pass ? '[OK]  ' : '[FAIL]'} ${check.name}`)

    if (errors.length > 0) {
      console.log('\n  页面异常：')
      for (const err of errors.slice(0, 6)) {
        const text = err.params?.exceptionDetails?.exception?.description
          || err.params?.args?.map((a) => a.value ?? a.description).join(' ')
          || JSON.stringify(err.params).slice(0, 200)
        console.log(`    - ${String(text).split('\n')[0]}`)
      }
    }

    const failed = checks.filter((c) => !c.pass)
    if (failed.length > 0) {
      console.log(`\n✗ mock 层端到端冒烟未通过（${failed.length} 项）\n`)
      process.exitCode = 1
    } else {
      console.log('\n✓ mock 层端到端冒烟通过：页面数据来自 MSW mock，支付链路状态流转正确\n')
    }
  } catch (err) {
    console.error(`\n✗ 冒烟测试执行失败：${err.message}\n`)
    process.exitCode = 1
  } finally {
    cleanup()
  }
}

main()
