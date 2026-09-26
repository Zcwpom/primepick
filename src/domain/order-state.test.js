import { describe, expect, it } from 'vitest'
import {
  ORDER_ACTION,
  ORDER_STATE,
  canCancel,
  canPay,
  canReceive,
  canTransition,
  isPayExpired,
  nextState,
  orderStateText,
  parseServerTime,
} from './order-state'

const pad = (n) => String(n).padStart(2, '0')
/** 生成后端格式的时间字符串 "YYYY-MM-DD HH:mm:ss" */
const serverTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

const minutesFromNow = (minutes) => serverTime(new Date(Date.now() + minutes * 60 * 1000))
const order = (orderState, extra = {}) => ({ orderState, ...extra })

describe('parseServerTime', () => {
  it('能解析空格分隔的后端格式（Safari 直接 new Date 会得到 Invalid Date）', () => {
    const value = parseServerTime('2026-09-26 15:21:54')
    expect(Number.isFinite(value)).toBe(true)
    expect(new Date(value).getHours()).toBe(15)
  })

  it('空值返回 NaN，而不是抛错', () => {
    expect(Number.isNaN(parseServerTime(''))).toBe(true)
    expect(Number.isNaN(parseServerTime(undefined))).toBe(true)
  })
})

describe('订单状态机：合法迁移', () => {
  it('待付款可以支付，迁移到待发货', () => {
    expect(canTransition(ORDER_STATE.UNPAID, ORDER_ACTION.PAY)).toBe(true)
    expect(nextState(ORDER_STATE.UNPAID, ORDER_ACTION.PAY)).toBe(ORDER_STATE.UNDELIVERED)
  })

  it('待付款可以取消，迁移到已取消', () => {
    expect(nextState(ORDER_STATE.UNPAID, ORDER_ACTION.CANCEL)).toBe(ORDER_STATE.CANCELLED)
  })

  it('待收货可以确认收货，迁移到待评价', () => {
    expect(canReceive(ORDER_STATE.UNRECEIVED)).toBe(true)
    expect(nextState(ORDER_STATE.UNRECEIVED, ORDER_ACTION.RECEIVE)).toBe(ORDER_STATE.UNCOMMENTED)
  })

  it('既接受订单对象，也接受裸状态码', () => {
    expect(canTransition(order(ORDER_STATE.UNPAID), ORDER_ACTION.PAY)).toBe(true)
    expect(canTransition({ orderState: '1' }, ORDER_ACTION.PAY)).toBe(true) // 后端可能给字符串
  })
})

describe('订单状态机：非法迁移一律拦住', () => {
  it('已支付的订单不能再支付或取消（否则会重复扣款 / 取消掉已付款单）', () => {
    expect(nextState(ORDER_STATE.UNDELIVERED, ORDER_ACTION.PAY)).toBeNull()
    expect(nextState(ORDER_STATE.UNDELIVERED, ORDER_ACTION.CANCEL)).toBeNull()
  })

  it('已取消的订单不能支付', () => {
    expect(canPay(order(ORDER_STATE.CANCELLED))).toBe(false)
  })

  it('待付款不能确认收货', () => {
    expect(canReceive(ORDER_STATE.UNPAID)).toBe(false)
  })

  it('未知动作返回 false / null', () => {
    expect(canTransition(ORDER_STATE.UNPAID, 'refund')).toBe(false)
    expect(nextState(ORDER_STATE.UNPAID, 'refund')).toBeNull()
  })
})

describe('支付超时', () => {
  it('截止时间已过 → 不可支付，但状态规则本身仍允许取消', () => {
    const expired = order(ORDER_STATE.UNPAID, { payLatestTime: minutesFromNow(-1) })
    expect(isPayExpired(expired)).toBe(true)
    expect(canPay(expired)).toBe(false)
    expect(canCancel(expired)).toBe(true)
  })

  it('截止时间未到 → 可支付', () => {
    const pending = order(ORDER_STATE.UNPAID, { payLatestTime: minutesFromNow(30) })
    expect(isPayExpired(pending)).toBe(false)
    expect(canPay(pending)).toBe(true)
  })

  it('没有 payLatestTime 时不判定为超时', () => {
    expect(isPayExpired(order(ORDER_STATE.UNPAID))).toBe(false)
  })
})

describe('orderStateText', () => {
  it('覆盖全部状态', () => {
    expect(orderStateText(1)).toBe('待付款')
    expect(orderStateText(6)).toBe('已取消')
  })

  it('未知状态给出兜底文案，而不是 undefined', () => {
    expect(orderStateText(99)).toBe('未知状态')
    expect(orderStateText(undefined)).toBe('未知状态')
  })
})
