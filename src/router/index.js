import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/userStore'

// Layout 是所有页面的外壳，首屏必然渲染，保持同步引入；
// 其余页面全部路由级懒加载（动态 import），让构建工具按路由拆包，
// 避免所有页面被塞进同一个首屏 chunk。
import Layout from '@/views/Layout/index.vue'

const APP_NAME = '优品购 PrimePick'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/Home/index.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'category',
          name: 'category-list',
          component: () => import('@/views/CategoryList/index.vue'),
          meta: { title: '全部分类' },
        },
        {
          path: 'category/:id',
          name: 'category',
          component: () => import('@/views/Category/index.vue'),
          meta: { title: '分类商品' },
        },
        {
          path: 'subCategory/sub/:id',
          name: 'sub-category',
          component: () => import('@/views/SubCategory/index.vue'),
          meta: { title: '商品筛选' },
        },
        {
          path: 'detail/:id',
          name: 'detail',
          component: () => import('@/views/Detail/index.vue'),
          meta: { title: '商品详情' },
        },
        {
          path: 'cartlist',
          name: 'cart-list',
          component: () => import('@/views/CartList/index.vue'),
          meta: { title: '购物车' },
        },
        {
          path: 'checkout',
          name: 'checkout',
          component: () => import('@/views/Checkout/index.vue'),
          meta: { title: '订单结算', requiresAuth: true },
        },
        {
          path: 'pay',
          name: 'pay',
          component: () => import('@/views/Pay/index.vue'),
          meta: { title: '订单支付', requiresAuth: true },
        },
        {
          path: 'paycallback',
          name: 'pay-callback',
          component: () => import('@/views/PayBack/index.vue'),
          meta: { title: '支付结果', requiresAuth: true },
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/Search/index.vue'),
          meta: { title: '商品搜索' },
        },
        // 兜底路由：未匹配的地址渲染 404 页面，而不是白屏
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/NotFound/index.vue'),
          meta: { title: '页面不存在' },
        },
      ],
    },
    {
      path: '/member',
      // 父路由声明 requiresAuth，子路由通过 to.matched 自动继承，无需逐条重复
      component: () => import('@/views/Member/index.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'member-info',
          component: () => import('@/views/Member/components/UserInfo.vue'),
          meta: { title: '会员中心' },
        },
        {
          path: 'user',
          redirect: '/member',
        },
        {
          path: 'order',
          name: 'member-order',
          component: () => import('@/views/Member/components/UserOrder.vue'),
          meta: { title: '我的订单' },
        },
        {
          path: 'address',
          name: 'member-address',
          component: () => import('@/views/Member/components/UserAddress.vue'),
          meta: { title: '收货地址' },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login/index.vue'),
      meta: { title: '登录' },
    },
  ],

  // 路由滚动行为定制
  scrollBehavior(to, from, savedPosition) {
    // 浏览器前进/后退时恢复原滚动位置，其余情况回到顶部
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

// 需要登录的路由在 meta 里声明 requiresAuth。
// 相比维护一份手写的路径白名单，这样新增页面不会漏配，
// 且父路由的 meta 会被子路由自动继承（to.matched 包含所有匹配到的层级）。
router.beforeEach((to) => {
  const needAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (!needAuth) return

  const userStore = useUserStore()
  if (!userStore.userInfo?.token) {
    ElMessage.warning('请先登录')
    // 用 fullPath 而不是 path，登录后能带着 query / hash 回到原页面
    return { path: '/login', query: { redirectUrl: to.fullPath } }
  }
})

// 根据路由 meta 同步文档标题，配合 index.html 的默认标题使用
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
})

export default router
