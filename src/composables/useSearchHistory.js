import { ref, watch } from 'vue'

const STORAGE_KEY = 'primepick_search_history'
const MAX_HISTORY = 10

/**
 * 搜索历史 composable
 * 使用 localStorage 持久化搜索历史
 */
export function useSearchHistory() {
  // 从 localStorage 恢复历史
  const history = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

  // 持久化到 localStorage
  watch(history, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  /** 添加搜索词（去重，最新的排前面） */
  const addHistory = (keyword) => {
    if (!keyword || !keyword.trim()) return
    const trimmed = keyword.trim()
    const list = history.value.filter(item => item !== trimmed)
    list.unshift(trimmed)
    history.value = list.slice(0, MAX_HISTORY)
  }

  /** 删除单个搜索词 */
  const removeHistory = (keyword) => {
    history.value = history.value.filter(item => item !== keyword)
  }

  /** 清空所有搜索历史 */
  const clearHistory = () => {
    history.value = []
  }

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
  }
}
