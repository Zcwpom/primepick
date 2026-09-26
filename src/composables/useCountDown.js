import { computed, onUnmounted, ref, unref } from 'vue'

/**
 * 倒计时（基于「截止时间」，而不是「剩余秒数」）
 *
 * 为什么按截止时间算：
 * 接口返回的是相对秒数，一旦页面停留、接口延迟或标签页被挂起，
 * 秒数就会和真实时间漂移；用绝对截止时间做基准，每次 tick 重新计算，
 * 无论页面卡多久都能自愈。
 *
 * 用法：
 *   const { formatted, expired, start } = useCountDown(() => order.payLatestTime)
 *   onMounted(start)
 */
export function useCountDown(deadline) {
  const remaining = ref(0)
  let timer = null

  /** 后端返回 "YYYY-MM-DD HH:mm:ss"，空格分隔在部分浏览器会解析失败，统一换成 T */
  const toTimestamp = (value) => {
    if (value === null || value === undefined || value === '') return Number.NaN
    if (value instanceof Date) return value.getTime()
    if (typeof value === 'number') return value
    return new Date(String(value).replace(' ', 'T')).getTime()
  }

  /**
   * deadline 支持三种形态：Ref、getter 函数、原始值。
   * ⚠️ 曾经踩过的坑：这里只写了 unref(deadline)，而最常用的传法是 getter 函数
   * （() => order.payLatestTime）。unref 只解包 Ref、**不会调用函数**，
   * 于是拿到的是函数源码字符串 → Invalid Date → 倒计时永远是 0，支付按钮永远不出现。
   */
  const resolveDeadline = () => (typeof deadline === 'function' ? deadline() : unref(deadline))

  const compute = () => {
    const end = toTimestamp(resolveDeadline())
    remaining.value = Number.isFinite(end) ? Math.max(0, Math.floor((end - Date.now()) / 1000)) : 0
    return remaining.value
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const start = () => {
    // 先清掉旧定时器，避免重复调用 start 导致定时器泄漏
    stop()
    if (compute() <= 0) return
    timer = setInterval(() => {
      // 归零后自动停止，避免出现负数时间
      if (compute() <= 0) stop()
    }, 1000)
  }

  const formatted = computed(() => {
    const total = remaining.value
    const minutes = String(Math.floor(total / 60)).padStart(2, '0')
    const seconds = String(total % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  })

  const expired = computed(() => remaining.value <= 0)

  onUnmounted(stop)

  return { remaining, formatted, expired, start, stop, refresh: compute }
}

/**
 * 把「支付截止时间」格式化成 mm:ss；
 * 列表场景（N 个订单）不适合每个都用 useCountDown（会开 N 个定时器），
 * 所以这里提供纯函数版本，配合父组件里一个共享的每秒 tick 使用。
 */
export function formatCountdown(deadline, now = Date.now()) {
  if (!deadline) return ''
  const end = new Date(String(deadline).replace(' ', 'T')).getTime()
  if (!Number.isFinite(end)) return ''
  const remain = Math.floor((end - now) / 1000)
  if (remain <= 0) return '已超时'
  const minutes = String(Math.floor(remain / 60)).padStart(2, '0')
  const seconds = String(remain % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
