import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

import Layout from '@/views/Layout/index.vue'
import Login from '@/views/Login/index.vue'
import Home from '@/views/Home/index.vue'
import Category from '@/views/Category/index.vue'
import CategoryList from '@/views/CategoryList/index.vue'
import SubCategory from '@/views/SubCategory/index.vue'
import Detail from '@/views/Detail/index.vue'
import CartList from '@/views/CartList/index.vue'
import Checkout from '@/views/Checkout/index.vue'
import Pay from '@/views/Pay/index.vue'
import PayBack from '@/views/PayBack/index.vue'
import Search from '@/views/Search/index.vue'
import Member from '@/views/Member/index.vue'
import MemberInfo from '@/views/Member/components/UserInfo.vue'
import MemberOrder from '@/views/Member/components/UserOrder.vue'
import MemberAddress from '@/views/Member/components/UserAddress.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: '',
          component: Home,
        },
        {
          path: 'category',
          component: CategoryList,
        },
        {
          path: 'category/:id',
          component: Category,
        },
        {
          path: 'subCategory/sub/:id',
          component: SubCategory,
        },
        {
          path: 'detail/:id',
          component: Detail,
        },
        {
          path: 'cartlist',
          component: CartList
        },
        {
          path: 'checkout',
          component: Checkout
        },
        {
          path: 'pay',
          component: Pay
        },
        {
          path: 'paycallback',
          component: PayBack
        },
        {
          path: 'search',
          component: Search
        },
      ]
    },
    {
      path: '/member',
      component: Member,
      children: [
        {
          path: '',
          component: MemberInfo
        },
        {
          path: 'user',
          redirect: '/member'
        },
        {
          path: 'order',
          component: MemberOrder
        },
        {
          path: 'address',
          component: MemberAddress
        }
      ]
    },
    {
      path: '/login',
      component: Login,
    }
  ],
  //路由滚动行为定制
  scrollBehavior() {
    return { top: 0 }
  },
})

// 需要登录才能访问的路由白名单
const authRoutes = ['/checkout', '/pay', '/paycallback', '/member']

router.beforeEach((to, from, next) => {
  const needAuth = authRoutes.some(url => to.path.startsWith(url))
  if (needAuth) {
    const userStore = useUserStore()
    if (!userStore.userInfo?.token) {
      ElMessage.warning('请先登录')
      next(`/login?redirectUrl=${to.path}`)
      return
    }
  }
  next()
})

export default router
