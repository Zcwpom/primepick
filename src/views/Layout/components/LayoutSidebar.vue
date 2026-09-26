<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const showBackTop = ref(false)

const onScroll = () => {
  showBackTop.value = window.scrollY > 400
}

onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const toCart = () => router.push('/cartlist')

const toMember = () => {
  if (!userStore.userInfo?.token) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push('/member')
}

const toFeedback = () => {
  ElMessage.info('感谢您的反馈！')
}

const toTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="layout-sidebar">
    <!-- 购物车 -->
    <div class="sidebar-item" @click="toCart" title="购物车">
      <div class="item-icon">
        <i class="iconfont icon-cart"></i>
        <em class="badge" v-if="cartStore.allCount">{{ cartStore.allCount }}</em>
      </div>
      <span class="item-label">购物车</span>
    </div>

    <!-- 我的 -->
    <div class="sidebar-item" @click="toMember" title="我的">
      <div class="item-icon">
        <i class="iconfont icon-user"></i>
      </div>
      <span class="item-label">我的</span>
    </div>

    <!-- 反馈 -->
    <div class="sidebar-item" @click="toFeedback" title="反馈">
      <div class="item-icon">
        <i class="iconfont icon-question"></i>
      </div>
      <span class="item-label">反馈</span>
    </div>

    <!-- 回顶部 -->
    <div
      class="sidebar-item back-top"
      :class="{ show: showBackTop }"
      @click="toTop"
      title="回顶部"
    >
      <div class="item-icon">
        <span class="arrow-up">↑</span>
      </div>
      <span class="item-label">顶部</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-sidebar {
  position: fixed;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.sidebar-item {
  width: 48px;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: #F8F6F3;

    .item-icon i {
      color: $xtxColor;
    }
    .item-label {
      color: $xtxColor;
    }
  }
}

.item-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  i, .arrow-up {
    font-size: 20px;
    color: #666;
    transition: color 0.2s;
  }

  .arrow-up {
    font-size: 22px;
    font-weight: bold;
    line-height: 1;
  }

  .badge {
    position: absolute;
    top: -6px;
    right: -10px;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    background: $helpColor;
    color: #fff;
    font-size: 11px;
    border-radius: 8px;
    padding: 0 4px;
    font-style: normal;
  }
}

.item-label {
  font-size: 11px;
  color: #999;
  transition: color 0.2s;
  writing-mode: horizontal-tb;
}

.back-top {
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: all 0.3s ease;

  &.show {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}
</style>
