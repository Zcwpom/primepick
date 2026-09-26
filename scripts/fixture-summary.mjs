#!/usr/bin/env node
/**
 * 打印 fixture 的结构摘要，用于核对接口契约
 *
 * 用法：node scripts/fixture-summary.mjs
 *
 * 输出每个端点返回体的形状（数组长度、对象字段名、列表首项字段名），
 * 写 TS 类型或 MSW handler 时照着这个来，不用反复打开几十个 JSON 文件。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'mocks', 'fixtures')

const keys = (obj, limit = 16) => {
  if (!obj || typeof obj !== 'object') return '-'
  const list = Object.keys(obj)
  return list.slice(0, limit).join(', ') + (list.length > limit ? ` …+${list.length - limit}` : '')
}

function describe(payload) {
  const result = payload?.result
  if (Array.isArray(result)) {
    return `array[${result.length}] of { ${keys(result[0], 12)} }`
  }
  if (result && typeof result === 'object') {
    const parts = [`{ ${keys(result)} }`]
    if (Array.isArray(result.items)) {
      parts.push(`items[${result.items.length}] of { ${keys(result.items[0], 12)} }`)
    }
    return parts.join('  ')
  }
  return `${result === null ? 'null' : typeof result}`
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()
let currentGroup = ''

for (const file of files) {
  const full = join(DIR, file)
  const raw = readFileSync(full, 'utf8')
  const payload = JSON.parse(raw)
  const group = file.split('-')[0]
  if (group !== currentGroup) {
    currentGroup = group
    console.log(`\n── ${group} ${'─'.repeat(Math.max(0, 74 - group.length))}`)
  }
  const size = `${(raw.length / 1024).toFixed(1)} kB`
  console.log(`${file.padEnd(38)} ${size.padStart(8)}  code=${payload?.code ?? '-'}  ${describe(payload)}`)
}

const manifestPath = join(DIR, '_manifest.json')
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  console.log(`\n契约清单：${manifest.endpoints.length} 个端点，抓取于 ${manifest.capturedAt}（来源 ${manifest.apiBase}）`)
} catch {
  console.log('\n未找到 _manifest.json，请先运行 node scripts/capture-fixtures.mjs')
}

// ---------------- handler 引用校验 ----------------
// 防止「handler 里写的 fixture 名字和文件名对不上」这类只有跑起来才会暴露的错误
const handlerDirs = [join(ROOT, 'mocks')]
const handlerFiles = []
const collect = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) collect(join(dir, entry.name))
    else if (entry.name.endsWith('.js')) handlerFiles.push(join(dir, entry.name))
  }
}
handlerDirs.forEach(collect)

const available = new Set(files.map((f) => f.replace(/\.json$/, '')))
const missing = []
const dynamic = new Set()

for (const file of handlerFiles) {
  const source = readFileSync(file, 'utf8')
  const pattern = /fixture(?:s\[)?\(\s*(['`])([^'`]+)\1\s*\]?\)?/g
  for (const match of source.matchAll(pattern)) {
    const name = match[2]
    if (name.includes('${')) {
      dynamic.add(name)
      continue
    }
    if (!available.has(name)) missing.push(`${file.replace(`${ROOT}\\`, '')} → ${name}`)
  }
}

console.log(`\nhandler 引用校验：静态引用均已存在${dynamic.size ? `，另有 ${dynamic.size} 处动态引用跳过校验` : ''}`)
if (missing.length > 0) {
  console.log(`✗ 找不到对应 fixture（${missing.length} 处）：`)
  for (const item of missing) console.log(`  - ${item}`)
  process.exitCode = 1
} else {
  console.log('✓ 全部命中')
}
if (dynamic.size > 0) {
  for (const name of dynamic) console.log(`  · 动态引用：${name}`)
}
