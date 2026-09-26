import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginAPI } from '@/apis/user'

// 本地测试账号（API 不可用时使用）
const MOCK_USERS = [
  { account: '1311111111', password: '123456', nickname: '测试用户1', avatar: '' },
]

export const useUserStore = defineStore('user', () => {
  const userInfo = ref({})

  const getUserInfo = async ({ account, password }) => {
    try {
      const res = await loginAPI({ account, password })
      userInfo.value = res.result
    } catch {
      // API 不可用时使用本地模拟登录
      const user = MOCK_USERS.find(u => u.account === account && u.password === password)
      if (user) {
        userInfo.value = {
          account: user.account,
          nickname: user.nickname,
          avatar: user.avatar,
          token: 'mock-token-' + Date.now()
        }
      } else {
        throw new Error('账号或密码错误')
      }
    }
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
