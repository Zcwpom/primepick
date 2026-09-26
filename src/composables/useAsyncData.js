import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 通用异步数据请求 composable
 * 统一管理 loading / data / error 三态
 *
 * @param {() => Promise<any>} fetchFn - 返回数据的异步函数
 * @param {object} [options]
 * @param {boolean} [options.immediate=true] - 是否在 onMounted 时自动执行
 * @param {any} [options.default=null] - data 的初始默认值
 * @returns {{ data, loading, error, execute }}
 *
 * @example
 * const { data: bannerList, loading } = useAsyncData(async () => {
 *   const res = await getBannerAPI()
 *   return res.result
 * })
 */
export function useAsyncData(fetchFn, options = {}) {
  const { immediate = true, default: defaultValue = null } = options

  const data = ref(defaultValue)
  const loading = ref(false)
  const error = ref(null)

  let cancelled = false

  const execute = async (...args) => {
    loading.value = true
    error.value = null
    try {
      const result = await fetchFn(...args)
      if (!cancelled) {
        data.value = result
      }
      return result
    } catch (err) {
      if (!cancelled) {
        error.value = err
      }
      throw err
    } finally {
      if (!cancelled) {
        loading.value = false
      }
    }
  }

  if (immediate) {
    onMounted(() => execute())
  }

  onUnmounted(() => {
    cancelled = true
  })

  return { data, loading, error, execute }
}
