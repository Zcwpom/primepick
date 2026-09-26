#!/usr/bin/env node
/**
 * 页面截图脚本（README / 简历用）
 *
 * 用法：
 *   node scripts/screenshots.mjs                                  # 起 preview 截构建产物
 *   node scripts/screenshots.mjs --base http://127.0.0.1:5173     # 截已在运行的 dev server
 *   node scripts/screenshots.mjs --out docs/screenshots --only home,detail
 *
 * 产出：docs/screenshots/*.png + 一个打印出来的清单（文件体积 / 页面标题 / 渲染内容大小），
 * 用于快速判断「是不是截到了一张白屏」。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const argOf = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index === -1 ? fallback : argv[index + 1]
}

const PORT = Number(argOf('port', 4173))
const SERVER = `http://127.0.0.1:${PORT}`
const BASE = (argOf('base', '') || SERVER).replace(/\/$/, '')
const OUT_DIR = join(ROOT, argOf('out', 'docs/screenshots'))
const DEBUG_PORT = Number(argOf('debug-port', 9223))
const VIEWPORT = { width: 1440, height: 900 }

// 支付链路截图需要先下单拿到订单号，用一个模块级变量在页面之间传递
let payOrderId = ''

// 页面清单：wait 是「这个页面渲染完成」的标志选择器；before 用于需要先做交互的页面
const PAGES = [
  { file: '01-home', path: '/', wait: '.goods-item', title: '首页首屏' },
  { file: '02-home-full', path: '/', wait: '.goods-item', title: '首页整页', full: true, jpeg: true },
  { file: '03-category', path: '/category/1005000', wait: '.container', title: '分类页' },
  { file: '04-detail', path: '/detail/4026116', wait: '.g-name', title: '商品详情（SKU 选择器）' },
  { file: '05-search', path: '/search?keyword=%E9%9E%8B', wait: '.goods-item', title: '搜索结果' },
  { file: '06-cart', path: '/cartlist', wait: '.container', title: '购物车' },
  { file: '07-checkout', path: '/checkout', wait: '.box-title', title: '订单结算' },
  {
    file: '07a-pay',
    title: '订单支付页',
    wait: '.pay-btn',
    // 在结算页真的点一次「提交订单」，用真实 UI 走到支付页
    before: async (client) => {
      await client.send('Page.navigate', { url: `${BASE}/checkout` })
      await waitForValue(client, '!!document.querySelector(".submit .el-button")', 25000)
      await sleep(600)
      await evaluate(client, 'document.querySelector(".submit .el-button").click() ?? true')
      await waitForValue(client, 'location.pathname === "/pay"', 20000)
      payOrderId = (await evaluate(client, 'new URLSearchParams(location.search).get("id")')) || ''
      return payOrderId ? `${BASE}/pay?id=${payOrderId}` : null
    },
  },
  {
    file: '07b-paycallback',
    title: '支付结果页',
    wait: '.pay-result',
    // 在支付页点一次「我已完成支付」，走到支付结果页
    before: async (client) => {
      if (!payOrderId) return null
      await client.send('Page.navigate', { url: `${BASE}/pay?id=${payOrderId}` })
      await waitForValue(client, '!!document.querySelector(".pay-btn")', 25000)
      await sleep(400)
      await evaluate(client, 'document.querySelector(".pay-btn").click() ?? true')
      await waitForValue(client, 'location.pathname === "/paycallback"', 20000)
      return `${BASE}/paycallback?orderId=${payOrderId}&payResult=true`
    },
  },
  { file: '08-orders', path: '/member/order', wait: '.order-item', title: '我的订单（首条为刚支付）' },
  { file: '09-login', path: '/login', wait: '.login-card', title: '登录页' },
  { file: '10-notfound', path: '/a-page-that-does-not-exist', wait: '.not-found', title: '404 兜底页' },
]

/** 直接写入 pinia 的持久化状态来「登录」，省掉脚本模拟填表单的脆弱环节 */
async function loginByStorage(client) {
  const persisted = JSON.stringify({
    userInfo: { token: 'mock-token-screenshot', account: 'xiaotuxian001', nickname: '演示用户', avatar: '' },
  })
  await evaluate(client, `localStorage.setItem('user', ${JSON.stringify(persisted)})`)
}

async function main() {
  const browser = findBrowser()
  if (!browser) {
    console.error('未找到 Edge / Chrome，无法截图')
    process.exit(2)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  console.log(`浏览器: ${browser}`)
  console.log(`站点:   ${BASE}${BASE === SERVER ? '（脚本自起 preview）' : ''}`)
  console.log(`输出:   ${OUT_DIR.replace(ROOT + '\\', '')}\n`)

  const only = argOf('only', '')
  const pages = only ? PAGES.filter((p) => only.split(',').some((k) => p.file.includes(k))) : PAGES

  const profileDir = createBrowserProfile()
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
    // 只有用默认端口（没指定 --base）时才自己起服务
    if (BASE === SERVER) {
      server = startServer(`npm run preview -- --port ${PORT} --host 127.0.0.1`, ROOT)
      if (!(await waitForHttp(`${SERVER}/`, 30000))) {
        console.error('preview 输出：\n' + server.readLog())
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
    await client.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false })

    // 先落到站点同源页面，才能写 localStorage
    await client.send('Page.navigate', { url: `${BASE}/` })
    await waitForValue(client, 'document.readyState === "complete"', 20000)

    // 预热：dev server 首次访问要做依赖预构建，可能几十秒；
    // 这一步单独给足时间，避免第一张截图截到半成品（不计入输出）
    console.log('  [..]   预热首屏（dev 模式下含依赖预构建）...')
    await waitForValue(client, 'document.querySelectorAll(".goods-item").length > 0', 90000)
    console.log('  [OK]   预热完成\n')

    const rows = []
    // 统一注入登录态：mock 的购物车 / 订单数据挂在「已登录」分支上，
    // 不注入的话购物车截图会是空的（未登录走本地购物车，而本地购物车初始为空）
    await loginByStorage(client)
    console.log('  [OK]   已注入登录态（写入 pinia 的 localStorage 持久化）\n')

    for (const page of pages) {
      // before：需要先交互才能拿到目标 URL 的页面（例如支付链路要先提交订单）
      const pageUrl = page.before ? await page.before(client) : `${BASE}${page.path}`
      if (!pageUrl) {
        rows.push({ file: `${page.file}.png`, label: page.title, kb: '-', app: '-', title: '(前置步骤失败，跳过)', ok: false })
        continue
      }
      await client.send('Page.navigate', { url: pageUrl })
      if (page.wait) {
        await waitForValue(client, `!!document.querySelector(${JSON.stringify(page.wait)})`, 25000)
      }
      // 等一帧动画与占位图收尾
      await sleep(1200)

      const info = await evaluate(
        client,
        'JSON.stringify({ title: document.title, app: (document.querySelector("#app")?.innerHTML || "").length })',
      )
      const meta = JSON.parse(info || '{}')

      const shot = await client.send('Page.captureScreenshot', {
        format: page.jpeg ? 'jpeg' : 'png',
        // 整页截图用 JPEG 控体积（PNG 会有 2 MB+，进仓库不划算）
        ...(page.jpeg ? { quality: 82 } : {}),
        ...(page.full ? { captureBeyondViewport: true } : {}),
      })
      const buffer = Buffer.from(shot.data, 'base64')
      const outFile = join(OUT_DIR, `${page.file}.${page.jpeg ? 'jpg' : 'png'}`)
      writeFileSync(outFile, buffer)

      rows.push({
        file: `${page.file}.${page.jpeg ? 'jpg' : 'png'}`,
        label: page.title,
        kb: (buffer.length / 1024).toFixed(0),
        app: (meta.app / 1024).toFixed(1),
        title: meta.title || '-',
        ok: buffer.length > 20000 && meta.app > 2000,
      })
    }

    console.log('  文件'.padEnd(24) + '页面'.padEnd(22) + 'PNG'.padStart(8) + '  渲染内容  标题')
    console.log('  ' + '─'.repeat(88))
    for (const row of rows) {
      console.log(
        `  ${(row.ok ? '[OK] ' : '[!]  ') + row.file}`.padEnd(24)
        + row.label.padEnd(22)
        + `${row.kb} kB`.padStart(9)
        + `${row.app} kB`.padStart(10)
        + `  ${row.title}`,
      )
    }

    const blank = rows.filter((r) => !r.ok)
    console.log(`\n  共 ${rows.length} 张，${blank.length === 0 ? '全部有内容 ✓' : `${blank.length} 张可疑（体积或渲染内容过小）`}\n`)
    if (blank.length > 0) process.exitCode = 1
  } catch (err) {
    console.error(`\n✗ 截图失败：${err.message}\n`)
    process.exitCode = 1
  } finally {
    cleanup()
  }
}

main()
