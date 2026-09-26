#!/usr/bin/env node
/**
 * 录制操作演示（首页 → 详情选规格 → 加购 → 购物车 → 结算 → 支付 → 结果页）
 *
 * 用法：
 *   node scripts/record-demo.mjs                     # 自起 preview，抓帧到临时目录
 *   node scripts/record-demo.mjs --base http://127.0.0.1:5173
 *
 * 原理：用 CDP 的 Page.startScreencast 抓取页面视觉变化帧（JPEG），
 * 每帧都落盘并记录时间戳，再由 scripts/frames-to-gif.py 合成 GIF。
 * 之所以不用录屏软件：这样整段演示是可复现的脚本，代码改了重新跑一遍就行。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
const DEBUG_PORT = Number(argOf('debug-port', 9224))
const FPS = Number(argOf('fps', 10))
const MAX_FRAMES = Number(argOf('max-frames', 160))
const VIEWPORT = { width: 1280, height: 800 }
// 固定目录（而不是带时间戳）：下一步合成 GIF 可以直接对着它跑，脚本也可反复执行
const FRAME_DIR = join(tmpdir(), 'primepick-demo-frames')

async function main() {
  const browser = findBrowser()
  if (!browser) {
    console.error('未找到 Edge / Chrome，无法录制')
    process.exit(2)
  }

  rmSync(FRAME_DIR, { recursive: true, force: true })
  mkdirSync(FRAME_DIR, { recursive: true })
  console.log(`浏览器: ${browser}`)
  console.log(`站点:   ${BASE}`)
  console.log(`帧目录: ${FRAME_DIR}\n`)

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
    if (BASE === SERVER) {
      server = startServer(`npm run preview -- --port ${PORT} --host 127.0.0.1`, ROOT)
      if (!(await waitForHttp(`${SERVER}/`, 30000))) {
        console.error(server.readLog())
        throw new Error('preview 服务启动超时')
      }
      console.log('  [OK]   preview 服务就绪')
    }

    browserProc = launchBrowser({ browser, debugPort: DEBUG_PORT, profileDir })
    const target = await waitForTarget(DEBUG_PORT)
    if (!target) throw new Error('浏览器调试端口未就绪')
    client = await connectCdp(target.webSocketDebuggerUrl)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false })

    // ---------- 准备：注入登录态并重载（mock 的购物车 / 结算接口需要 token） ----------
    await client.send('Page.navigate', { url: `${BASE}/` })
    await waitForValue(client, 'document.readyState === "complete"', 20000)
    await evaluate(
      client,
      `localStorage.setItem('user', ${JSON.stringify(JSON.stringify({
        userInfo: { token: 'mock-token-demo', account: 'xiaotuxian001', nickname: '演示用户', avatar: '' },
      }))})`,
    )
    await client.send('Page.navigate', { url: `${BASE}/` })
    await waitForValue(client, 'document.querySelectorAll(".goods-item").length > 0', 60000)
    await sleep(1200)
    console.log('  [OK]   首屏就绪，开始抓帧\n')

    // ---------- 抓帧 ----------
    const frames = []
    let lastKeptAt = 0
    let draining = false

    // 帧必须及时 ack，否则 Chromium 会停止推送
    const drain = setInterval(async () => {
      if (draining) return
      draining = true
      try {
        while (client.events.length > 0) {
          const event = client.events.shift()
          if (event.method !== 'Page.screencastFrame') continue
          const now = Date.now()
          const frame = event.params
          await client.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {})
          if (frames.length >= MAX_FRAMES) continue
          if (now - lastKeptAt < 1000 / FPS) continue
          lastKeptAt = now
          const file = `${String(frames.length).padStart(4, '0')}.jpg`
          writeFileSync(join(FRAME_DIR, file), Buffer.from(frame.data, 'base64'))
          frames.push({ file, t: now })
        }
      } finally {
        draining = false
      }
    }, 40)

    await client.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 62,
      maxWidth: VIEWPORT.width,
      maxHeight: VIEWPORT.height,
      everyNthFrame: 1,
    })

    // ---------- 演示脚本 ----------
    const click = (selector) => evaluate(
      client,
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`,
    )
    const goto = (path) => client.send('Page.navigate', { url: `${BASE}${path}` })
    const scrollTo = (top) => evaluate(client, `window.scrollTo({ top: ${top}, behavior: 'smooth' }), true`)

    const steps = [
      ['首页首屏', async () => { await sleep(1500) }],
      ['滚动浏览首页', async () => {
        await scrollTo(750)
        await sleep(900)
        await scrollTo(1600)
        await sleep(1300)
      }],
      ['打开商品详情', async () => { await click('.goods-link'); await sleep(2500) }],
      ['选择规格', async () => {
        await click('.goods-sku dl:nth-of-type(1) dd > *')
        await sleep(800)
        await click('.goods-sku dl:nth-of-type(2) dd > *')
        await sleep(1200)
      }],
      ['加入购物车', async () => { await click('.spec .btn'); await sleep(1800) }],
      ['查看购物车', async () => {
        await goto('/cartlist')
        await sleep(900)
        await scrollTo(360)
        await sleep(1500)
      }],
      ['去结算', async () => {
        await goto('/checkout')
        await sleep(900)
        await scrollTo(360)
        await sleep(1500)
      }],
      ['提交订单', async () => { await click('.submit .el-button'); await sleep(2000) }],
      ['完成支付', async () => { await click('.pay-btn'); await sleep(2200) }],
    ]

    for (const [label, run] of steps) {
      const before = frames.length
      await run()
      // 每步都打印「当前落在哪个页面 + 关键元素在不在」——
      // 录制脚本最容易出的问题是某次点击其实没生效，只有帧数看不出来
      const state = await evaluate(client, `JSON.stringify({
        path: location.pathname + location.search,
        spec: !!document.querySelector('.spec .btn'),
        sku: !!document.querySelector('.goods-sku'),
        cart: !!document.querySelector('.cart-list, .container'),
        submit: !!document.querySelector('.submit .el-button'),
        pay: !!document.querySelector('.pay-btn')
      })`)
      const info = JSON.parse(state || '{}')
      const flags = [
        info.sku ? 'sku' : '',
        info.spec ? 'addBtn' : '',
        info.submit ? 'submitBtn' : '',
        info.pay ? 'payBtn' : '',
      ].filter(Boolean).join(',')
      console.log(`  [OK]   ${label}（+${frames.length - before} 帧）  ${info.path} ${flags ? `[${flags}]` : ''}`)
    }

    await client.send('Page.stopScreencast').catch(() => {})
    await sleep(300)
    clearInterval(drain)

    // 补一次事件队列的收尾（stop 之后可能还有一帧）
    while (client.events.length > 0) {
      const event = client.events.shift()
      if (event.method !== 'Page.screencastFrame') continue
      const file = `${String(frames.length).padStart(4, '0')}.jpg`
      writeFileSync(join(FRAME_DIR, file), Buffer.from(event.params.data, 'base64'))
      frames.push({ file, t: Date.now() })
    }

    const metaPath = join(FRAME_DIR, 'frames.json')
    writeFileSync(metaPath, JSON.stringify({ width: VIEWPORT.width, height: VIEWPORT.height, frames }, null, 2))

    console.log(`\n  共抓取 ${frames.length} 帧`)
    console.log(`  帧目录: ${FRAME_DIR}`)
    console.log(`  元数据: ${metaPath}`)

    // 传了 --gif 就顺手合成（Python 解释器可用 PYTHON 环境变量覆盖）
    const gifPath = argOf('gif', '')
    if (gifPath) {
      const python = process.env.PYTHON || 'python'
      console.log(`\n  合成 GIF（${python}）...`)
      const result = spawnSync(
        python,
        [join(ROOT, 'scripts', 'frames-to-gif.py'), '--frames', FRAME_DIR, '--out', join(ROOT, gifPath)],
        // 控制台编码在 Windows 上默认是 GBK，显式让 Python 用 UTF-8 输出
        { stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      )
      if (result.status !== 0) throw new Error('GIF 合成失败')
    } else {
      console.log(`\n  下一步合成 GIF：\n    python scripts/frames-to-gif.py --frames "${FRAME_DIR}" --out docs/demo.gif\n`)
    }
  } catch (err) {
    console.error(`\n✗ 录制失败：${err.message}\n`)
    process.exitCode = 1
  } finally {
    cleanup()
  }
}

main()
