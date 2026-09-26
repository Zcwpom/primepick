import { describe, expect, it } from 'vitest'
import { formatCountdown } from './useCountDown'

const pad = (n) => String(n).padStart(2, '0')
const serverTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

// 基线要对齐到整秒：后端时间只有秒级精度，而 Date.now() 是毫秒，
// 若基线带毫秒，(deadline - now) 会少掉不到 1 秒，floor 之后就差 1 秒（89 而不是 90）。
// 这个差异是写这组测试时才暴露出来的：真实数据的时间精度与本地时钟精度不是一回事。
const NOW = Math.floor(Date.now() / 1000) * 1000
const deadlineIn = (seconds) => serverTime(new Date(NOW + seconds * 1000))

/**
 * 订单列表里每一行都要显示「付款截止 mm:ss」。
 * 这里只测纯函数版本：列表有 N 个订单，不能每行开一个定时器。
 */
describe('formatCountdown', () => {
  it('把剩余秒数格式化成 mm:ss', () => {
    expect(formatCountdown(deadlineIn(90), NOW)).toBe('01:30')
    expect(formatCountdown(deadlineIn(59), NOW)).toBe('00:59')
    expect(formatCountdown(deadlineIn(3600), NOW)).toBe('60:00')
  })

  it('已过期返回「已超时」，而不是负数或 00:00', () => {
    expect(formatCountdown(deadlineIn(-1), NOW)).toBe('已超时')
    expect(formatCountdown(deadlineIn(0), NOW)).toBe('已超时')
  })

  it('截止时间缺失或非法时返回空串（避免页面出现 NaN:NaN）', () => {
    expect(formatCountdown('', NOW)).toBe('')
    expect(formatCountdown(undefined, NOW)).toBe('')
    expect(formatCountdown('不是时间', NOW)).toBe('')
  })
})
