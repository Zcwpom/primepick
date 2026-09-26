/**
 * 无头浏览器 + 静态服务的公共工具
 *
 * 被两个脚本复用：
 *   scripts/smoke-mock.mjs   端到端冒烟（断言页面真的有数据）
 *   scripts/screenshots.mjs  生成 README / 简历用的截图
 *
 * 刻意不引入 puppeteer / playwright：用 Node 内置 fetch + WebSocket 直接讲
 * Chrome DevTools Protocol，复用系统已装的 Edge/Chrome，不下载浏览器。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 系统已安装的浏览器（按优先级），不下载 */
const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/opt/google/chrome/chrome',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

/**
 * 找浏览器：先查常见安装路径，再退回 PATH 里的可执行名。
 * 之所以要有 PATH 兜底：不同环境（本地 Windows / CI 的 ubuntu runner / 各种发行版）
 * 安装位置都不一样，只靠一张路径列表会在换环境时**静默失效** ——
 * 而冒烟脚本找不到浏览器只会报「启动超时」，非常难排查。
 */
export function findBrowser() {
  const byPath = BROWSERS.find((path) => existsSync(path))
  if (byPath) return byPath

  const lookup = process.platform === 'win32' ? 'where' : 'which'
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge']) {
    const result = spawnSync(lookup, [name], { encoding: 'utf8' })
    const candidate = String(result.stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
    if (candidate && existsSync(candidate)) return candidate
  }
  return undefined
}

/** 杀掉整棵进程树（Windows 上 npm / 浏览器都会派生子进程） */
export function killTree(pid) {
  if (!pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      spawnSync('kill', ['-9', String(pid)], { stdio: 'ignore' })
    }
  }
}

export async function waitForHttp(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // 还没起来
    }
    await sleep(300)
  }
  return false
}

/**
 * 起一个前台命令（vite dev / preview），日志缓存在内存里便于失败时打印。
 * 注意：日志一定要接出来 —— stdio: 'ignore' 会把失败原因吞掉，
 * 只留下「启动超时」这种没法排查的报错。
 */
export function startServer(command, cwd) {
  let log = ''
  const proc = spawn(command, {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  })
  proc.stdout.on('data', (chunk) => { log += chunk })
  proc.stderr.on('data', (chunk) => { log += chunk })
  return { proc, readLog: () => log }
}

export function launchBrowser({ browser, debugPort, profileDir }) {
  return spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--disable-extensions',
      // 新版 Chromium 要求显式允许来自任意 Origin 的 CDP 连接
      '--remote-allow-origins=*',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
}

/** 等调试端口就绪并返回页面 target */
export async function waitForTarget(debugPort, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await sleep(400)
    try {
      const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
      const target = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl)
      if (target) return target
    } catch {
      // 端口还没起来
    }
  }
  return undefined
}

/** 极简 CDP 客户端：够用就好，不为一个冒烟测试引入 puppeteer */
export function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map()
    const events = []
    let nextId = 1

    ws.addEventListener('open', () => {
      resolve({
        events,
        send(method, params = {}) {
          const id = nextId++
          return new Promise((res, rej) => {
            pending.set(id, { res, rej })
            ws.send(JSON.stringify({ id, method, params }))
            setTimeout(() => {
              if (pending.delete(id)) rej(new Error(`CDP 超时: ${method}`))
            }, 30000)
          })
        },
        close: () => ws.close(),
      })
    })

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) rej(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? '')})`))
        else res(msg.result)
        return
      }
      if (msg.method) events.push(msg)
    })

    ws.addEventListener('error', () => reject(new Error('无法连接 CDP WebSocket')))
  })
}

/** 在页面里求值并取回结果 */
export async function evaluate(client, expression) {
  const res = await client.send('Runtime.evaluate', { expression, returnByValue: true })
  return res?.result?.value
}

/** 轮询一段表达式直到返回真值（返回最后一次的值） */
export async function waitForValue(client, expression, timeoutMs = 25000, interval = 400) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      last = await evaluate(client, expression)
      if (last) return last
    } catch {
      // 导航过程中执行上下文可能被销毁，重试即可
    }
    await sleep(interval)
  }
  return last
}

export function createBrowserProfile() {
  return mkdtempSync(join(tmpdir(), 'primepick-'))
}

export function removeProfile(dir) {
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    // 忽略
  }
}
