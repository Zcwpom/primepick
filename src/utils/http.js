// axios基础的封装
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import router from '@/router'

const httpInstance = axios.create({
  // 接口前缀来自环境变量：开发/演示走 /api（由 mock 或代理接管），部署时可指向真实后端
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 5000
})

// 拦截器

// axios请求拦截器
httpInstance.interceptors.request.use(config => {
  // 1. 从pinia获取token数据
  const userStore = useUserStore()
  // 2. 按照后端的要求拼接token数据
  const token = userStore.userInfo.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, e => Promise.reject(e))

// axios响应式拦截器
httpInstance.interceptors.response.use(res => res.data, e => {
  // 后端错误信息字段是 msg，这里同时兼容 message
  ElMessage({ type: 'error', message: e.response?.data?.msg || e.response?.data?.message || '请求失败' })
  if (e.response?.status === 401) {
    const userStore = useUserStore()
    userStore.clearUserInfo()
    router.push('/login')
  }
  return Promise.reject(e)
})


export default httpInstance
