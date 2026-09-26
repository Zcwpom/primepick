<script setup>
import { ref } from 'vue'
import { useScroll } from '@vueuse/core'
import { useCategoryStore } from '@/stores/categoryStore'

const { y } = useScroll(window)
const categoryStore = useCategoryStore()
const hoverCategory = ref(null)
</script>

<template>
  <div class="app-header-sticky" :class="{show : y>78}">
    <div class="container" >
      <RouterLink class="logo" to="/">
        <span class="logo-main">优品购</span>
        <span class="logo-tagline">PrimePick</span>
      </RouterLink>
      <!-- 导航区域 -->
       <ul class="app-header-nav">
        <li class="home" v-for = "item in categoryStore.categoryList" :key="item.id"
          @mouseenter="hoverCategory = item.id"
          @mouseleave="hoverCategory = null"
        >
         <RouterLink :to="`/category/${item.id}`">{{ item.name }}</RouterLink>
         <!-- 下拉分类面板 -->
         <div class="nav-dropdown" v-if="item.children?.length && hoverCategory === item.id">
           <div class="dropdown-inner">
             <RouterLink
               v-for="sub in item.children"
               :key="sub.id"
               :to="`/subCategory/sub/${sub.id}`"
               class="dropdown-item"
             >
               <img :src="sub.picture" :alt="sub.name" />
               <span>{{ sub.name }}</span>
             </RouterLink>
           </div>
         </div>
        </li>
      </ul>
      <div class="right">
        <RouterLink to="/">品牌</RouterLink>
        <RouterLink to="/">专题</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped lang='scss'>
.app-header-sticky {
  width: 100%;
  height: 80px;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 999;
  background-color: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #EDE9E4;
  // 此处为关键样式!!!
  // 状态一：往上平移自身高度 + 完全透明
  transform: translateY(-100%);
  opacity: 0;

  // 状态二：移除平移 + 完全不透明
  &.show {
    transition: all 0.3s linear;
    transform: none;
    opacity: 1;
  }

  .container {
    display: flex;
    align-items: center;
  }

  .logo {
    width: 200px;
    height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-decoration: none;

    .logo-main {
      font-size: 24px;
      font-weight: 700;
      color: $xtxColor;
      letter-spacing: 6px;
      font-family: 'Noto Serif SC', serif;
      line-height: 1.2;
    }

    .logo-tagline {
      font-size: 11px;
      color: #333;
      letter-spacing: 4px;
      line-height: 1;
      margin-top: 2px;
    }
  }

  .right {
    width: 220px;
    display: flex;
    text-align: center;
    padding-left: 40px;
    border-left: 2px solid $xtxColor;

    a {
      width: 38px;
      margin-right: 40px;
      font-size: 16px;
      line-height: 1;

      &:hover {
        color: $xtxColor;
      }
    }
  }

  .app-header-nav {
    width: 820px;
    display: flex;
    padding-left: 40px;
    position: relative;
    z-index: 998;

    li {
      margin-right: 40px;
      width: auto;
      text-align: center;
      position: relative;
      padding-bottom: 16px;

      a {
        font-size: 16px;
        line-height: 32px;
        height: 32px;
        display: inline-block;

        &:hover {
          color: $xtxColor;
          border-bottom: 1px solid $xtxColor;
        }
      }

      .active {
        color: $xtxColor;
        border-bottom: 1px solid $xtxColor;
      }

      // 下拉分类面板
      .nav-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 999;
        padding-top: 8px;
        opacity: 0;
        animation: fadeIn 0.2s ease forwards;
      }

      .dropdown-inner {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        padding: 8px 0;
        min-width: 100px;
      }

      .dropdown-item {
        display: block;
        padding: 6px 20px;
        text-decoration: none;
        color: #555;
        font-size: 14px;
        text-align: left;
        white-space: nowrap;
        transition: all 0.15s ease;

        &:hover {
          color: $xtxColor;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    }
  }
}
</style>
