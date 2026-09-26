//获取轮播图数据相关代码
import { useAsyncData } from '@/composables/useAsyncData'
import { getBannerAPI } from '@/apis/home'

export function useBanner() {
  const { data: bannerList } = useAsyncData(async () => {
    const res = await getBannerAPI({
      distributionSite: '2'
    })
    return res.result
  })

  return {
    bannerList
  }
}
