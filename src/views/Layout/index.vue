<script setup>
import LayoutNav from './components/LayoutNav.vue'
import LayoutHeader from './components/LayoutHeader.vue'
import LayoutFooter from './components/LayoutFooter.vue'
import LayoutFixed from './components/LayoutFixed.vue'
import LayoutSidebar from './components/LayoutSidebar.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/composables/useAuth'
import { onMounted } from 'vue'
const categoryStore = useCategoryStore()
const cartStore = useCartStore()
const { isLogin } = useAuth()
onMounted(() => {
  categoryStore.getCategory()
  // 已登录时（含刷新页面后从持久化状态恢复登录态）主动同步一次服务端购物车。
  // 否则购物车角标与购物车页会显示为空 —— store 原先只在「登录动作」和「加购」时拉取过列表。
  if (isLogin.value) cartStore.fetchCartList()
})
</script>

<template>
 <div> <LayoutFixed /> </div>
 <div> <LayoutNav /> </div>
 <div> <LayoutHeader /> </div>
 <div> <RouterView /> </div>
 <LayoutSidebar />
 <div> <LayoutFooter /> </div>
</template>
