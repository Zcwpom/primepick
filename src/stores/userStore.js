import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginAPI } from '@/apis/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref({})

  /**
   * 登录
   *
   * 注：原先这里有一段「接口不可用时用本地硬编码账号兜底」的逻辑，已删除。
   * 假数据兜底会掩盖真实错误（比如密码错误也会被兜底逻辑吞掉），
   * 也让 store 承担了本不属于它的职责。接口问题交给 mock 层或 mock 服务解决。
   */
  const getUserInfo = async ({ account, password }) => {
    const res = await loginAPI({ account, password })
    userInfo.value = res.result
  }

  const clearUserInfo = () => {
    userInfo.value = {}
  }

  return {
    userInfo,
    getUserInfo,
    clearUserInfo
  }
}, {
  persist: true,
})
