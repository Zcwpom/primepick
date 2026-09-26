import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

/**
 * 用户认证 composable
 * 统一管理登录状态判断
 *
 * @returns {{ isLogin: ComputedRef<boolean>, userInfo: object, getUserInfo: Function, clearUserInfo: Function }}
 */
export function useAuth() {
  const userStore = useUserStore()

  const isLogin = computed(() => !!userStore.userInfo?.token)

  return {
    /** 是否已登录 */
    isLogin,
    /** 用户信息（含 token） */
    userInfo: userStore.userInfo,
    /** 登录 */
    getUserInfo: userStore.getUserInfo,
    /** 退出 */
    clearUserInfo: userStore.clearUserInfo,
  }
}
