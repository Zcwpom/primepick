// 封装分类相关代码
import { onMounted } from 'vue'
import { onBeforeRouteUpdate, useRoute } from 'vue-router'
import { useAsyncData } from '@/composables/useAsyncData'
import { getCategoryAPI } from '@/apis/category'

export function useCategory() {
  // 获取分类数据
  const route = useRoute()
  const { data: categoryData, execute } = useAsyncData(
    async (id) => {
      const res = await getCategoryAPI(id)
      return res.result
    },
    { immediate: false, default: {} }
  )

  // 首次加载
  onMounted(() => execute(route.params.id))

  // 路由参数变化的时候重新请求分类数据
  onBeforeRouteUpdate((to) => {
    execute(to.params.id)
  })

  return {
    categoryData
  }
}
