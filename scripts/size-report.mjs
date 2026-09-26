#!/usr/bin/env node
/**
 * 产物体积报告 + 首屏体积预算门禁
 *
 * 用法：
 *   npm run size              本地查看报告
 *   npm run size -- --markdown  输出 Markdown 表格（CI 写入 Job Summary）
 *
 * 说明：首屏资源 = dist/index.html 里直接引用的入口 chunk、modulepreload 与样式表。
 * 预算一旦超出就以非 0 退出码失败，避免「顺手 new 一个大依赖」导致体积悄悄回退。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const assetsDir = join(distDir, 'assets')

/** 首屏预算（gzip 后，单位 kB） */
const BUDGET = { js: 135, css: 20 }

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`
const gz = (file) => gzipSync(readFileSync(file)).length

let html
try {
  html = readFileSync(join(distDir, 'index.html'), 'utf8')
} catch {
  console.error('找不到 dist/index.html，请先执行 npm run build')
  process.exit(1)
}

// 从 HTML 中提取首屏真正会加载的资源
const initialFiles = [...new Set(
  [...html.matchAll(/\/assets\/([^"']+\.(?:js|css))/g)].map((m) => m[1]),
)]

let jsGzip = 0
let cssGzip = 0
const rows = initialFiles
  .map((file) => {
    const full = join(assetsDir, file)
    const raw = statSync(full).size
    const gzipped = gz(full)
    if (file.endsWith('.js')) jsGzip += gzipped
    else cssGzip += gzipped
    return { file, raw, gzipped }
  })
  .sort((a, b) => b.gzipped - a.gzipped)

// 全部产物，用于发现「忘记懒加载」的巨型 chunk
const allChunks = readdirSync(assetsDir)
  .filter((f) => /\.(js|css)$/.test(f))
  .map((file) => ({ file, gzipped: gz(join(assetsDir, file)) }))
  .sort((a, b) => b.gzipped - a.gzipped)

const exceeded = []
if (jsGzip / 1024 > BUDGET.js) exceeded.push(`首屏 JS ${kb(jsGzip)} 超出预算 ${BUDGET.js} kB`)
if (cssGzip / 1024 > BUDGET.css) exceeded.push(`首屏 CSS ${kb(cssGzip)} 超出预算 ${BUDGET.css} kB`)

const summary = [
  `首屏 JS ${kb(jsGzip)}（gzip）`,
  `首屏 CSS ${kb(cssGzip)}（gzip）`,
  `首屏合计 ${kb(jsGzip + cssGzip)}（gzip）`,
  `产物总数 ${allChunks.length} 个 js/css`,
  `最大 chunk ${allChunks[0]?.file} ${kb(allChunks[0]?.gzipped ?? 0)}`,
]

if (process.argv.includes('--markdown')) {
  const lines = [
    '### 产物体积报告',
    '',
    '| 首屏资源 | 原始体积 | gzip |',
    '| --- | ---: | ---: |',
    ...rows.map((r) => `| \`${r.file}\` | ${kb(r.raw)} | ${kb(r.gzipped)} |`),
    '',
    `**首屏合计 gzip：JS ${kb(jsGzip)} / CSS ${kb(cssGzip)}**（预算 ${BUDGET.js} kB / ${BUDGET.css} kB）`,
    '',
    '体积最大的产物 Top 5：',
    '',
    ...allChunks.slice(0, 5).map((c) => `- \`${c.file}\` — ${kb(c.gzipped)}`),
  ]
  console.log(lines.join('\n'))
} else {
  console.log('\n首屏静态资源（入口 + modulepreload + 样式表）')
  console.log('─'.repeat(74))
  for (const r of rows) {
    console.log(`${r.file.padEnd(44)}${kb(r.raw).padStart(11)}  gzip${kb(r.gzipped).padStart(11)}`)
  }
  console.log('─'.repeat(74))
  for (const line of summary) console.log(`  ${line}`)

  console.log('\n体积最大的产物 Top 5（检查是否有页面忘记懒加载）')
  for (const c of allChunks.slice(0, 5)) {
    console.log(`${c.file.padEnd(44)}${kb(c.gzipped).padStart(11)}  gzip`)
  }

  // mock 层独立统计：它只在 VITE_USE_MOCK=true 时按需加载，
  // 且必须在挂载前启动，所以在演示模式下确实在关键路径上 —— 单独列出来更诚实
  // （chunk 名由 vite.config.js 里的 codeSplitting group 决定）
  const mockChunks = allChunks.filter((c) => /^mock-(fixtures|runtime)-/.test(c.file))
  if (mockChunks.length > 0) {
    const mockGzip = mockChunks.reduce((sum, c) => sum + c.gzipped, 0)
    console.log(
      `\n  mock 数据层：${kb(mockGzip)}（gzip，共 ${mockChunks.length} 个 chunk）` +
        `\n  仅 VITE_USE_MOCK=true 时加载，不计入上面的首屏预算`,
    )
  }
}

if (exceeded.length > 0) {
  console.error('\n✗ 首屏体积预算未通过：')
  for (const item of exceeded) console.error(`  - ${item}`)
  process.exit(1)
}
console.log('\n✓ 首屏体积在预算内\n')
