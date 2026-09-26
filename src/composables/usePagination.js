import { ref, onMounted, readonly } from 'vue'

/**
 * 通用分页 composable
 * 同时支持「无限滚动」和「传统翻页」两种模式
 *
 * @param {Function} apiFn - 分页请求函数，接收 { page, pageSize, ...params } 参数
 * @param {object} [options]
 * @param {number} [options.pageSize=10] - 每页条数
 * @param {object} [options.defaultParams={}] - 额外的请求参数（如排序、筛选等）
 * @param {boolean} [options.immediate=true] - 是否在 onMounted 时自动加载
 * @returns {{ list, loading, total, isFinished, currentPage, refresh, loadMore, onPageChange }}
 *
 * @example 无限滚动（SubCategory）
 * const { list: goodsList, loading, isFinished, loadMore, refresh } = usePagination(
 *   (req) => getSubCategoryAPI(req),
 *   { pageSize: 20, defaultParams: { categoryId: route.params.id, sortField: 'publishTime' } }
 * )
 *
 * @example 传统翻页（UserOrder）
 * const { list: orderList, total, onPageChange, refresh } = usePagination(
 *   (req) => getUserOrder(req),
 *   { pageSize: 2, defaultParams: { orderState: 0 } }
 * )
 */
export function usePagination(apiFn, options = {}) {
  const { pageSize = 10, defaultParams = {}, immediate = true } = options

  const list = ref([])
  const loading = ref(false)
  const total = ref(0)
  const isFinished = ref(false)
  const currentPage = ref(1)
  const params = ref({ ...defaultParams })

  /**
   * 执行数据请求
   * @param {boolean} resetPage - 是否重置到第一页（替换列表）
   */
  const requestData = async (resetPage = false) => {
    loading.value = true
    if (resetPage) {
      currentPage.value = 1
      isFinished.value = false
    }
    try {
      const res = await apiFn({
        ...params.value,
        page: currentPage.value,
        pageSize,
      })
      const items = res.result.items ?? []
      if (resetPage) {
        list.value = items
      } else {
        // 无限滚动：追加数据
        list.value = [...list.value, ...items]
      }
      total.value = res.result.counts ?? 0
      // 无更多数据时标记结束
      if (items.length === 0 && !resetPage) {
        isFinished.value = true
      }
      return items
    } catch (err) {
      console.error(err)
      return []
    } finally {
      loading.value = false
    }
  }

  /** 无限滚动：加载下一页（追加数据） */
  const loadMore = async () => {
    if (isFinished.value || loading.value) return
    currentPage.value++
    await requestData(false)
    if (isFinished.value) {
      currentPage.value-- // 回滚页码
    }
  }

  /** 刷新/重置（替换数据），可传入新的筛选参数 */
  const refresh = async (extraParams) => {
    if (extraParams) {
      params.value = { ...defaultParams, ...extraParams }
    }
    await requestData(true)
  }

  /** 传统翻页：跳转到指定页 */
  const onPageChange = (page) => {
    currentPage.value = page
    requestData(true)
  }

  if (immediate) onMounted(() => requestData(true))

  return {
    list,
    loading,
    total,
    isFinished,
    currentPage: readonly(currentPage),
    refresh,
    loadMore,
    onPageChange,
  }
}
