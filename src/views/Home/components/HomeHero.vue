<script setup>
import { ref } from 'vue'
import { getBannerAPI, getHotAPI } from '@/apis/home'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAsyncData } from '@/composables/useAsyncData'

const categoryStore = useCategoryStore()

const { data: bannerList } = useAsyncData(async () => {
  const res = await getBannerAPI()
  return res.result
})

const { data: hotList } = useAsyncData(async () => {
  const res = await getHotAPI()
  return res.result
})

const currentSlide = ref(0)
const hoverMainCat = ref(null)

const onSlideChange = (index) => {
  currentSlide.value = index
}
</script>

<template>
  <div class="home-hero">
    <div class="hero-container">
      <!-- 左侧分类栏 -->
      <aside class="hero-left">
        <div class="cat-header">全部分类</div>
        <ul class="cat-list">
          <li
            v-for="item in categoryStore.categoryList"
            :key="item.id"
            class="cat-item"
            @mouseenter="hoverMainCat = item.id"
            @mouseleave="hoverMainCat = null"
          >
            <RouterLink :to="`/category/${item.id}`" class="cat-link">
              <span class="cat-name">{{ item.name }}</span>
              <i class="iconfont icon-angle-right"></i>
            </RouterLink>
            <!-- 二级浮层 -->
            <div class="sub-layer" v-if="item.children?.length && hoverMainCat === item.id">
              <div class="sub-inner">
                <RouterLink
                  v-for="sub in item.children"
                  :key="sub.id"
                  :to="`/subCategory/sub/${sub.id}`"
                  class="sub-item"
                >
                  {{ sub.name }}
                </RouterLink>
              </div>
            </div>
          </li>
        </ul>
        <!-- 底部快捷入口 -->
        <div class="cat-footer">
          <RouterLink to="/member/order" class="footer-link">
            <span class="footer-icon">📋</span>
            <span>我的订单</span>
          </RouterLink>
          <RouterLink to="/member" class="footer-link">
            <span class="footer-icon">👤</span>
            <span>会员中心</span>
          </RouterLink>
        </div>
      </aside>

      <!-- 中间轮播 -->
      <div class="hero-center">
        <el-carousel
          height="480px"
          :interval="4000"
          arrow="always"
          indicator-position="none"
          @change="onSlideChange"
        >
          <el-carousel-item v-for="(item, index) in bannerList" :key="item.id">
            <!-- alt 兜底：banner fixture 里没有 title 字段，直接绑 item.title 会渲染出「无 alt 属性」，
                 读屏软件与 SEO 都会判定为缺失（Lighthouse 的 image-alt 就是这么被点出来的）。
                 fetchpriority 只给首屏第一张 —— 五张全设 high 等于没设优先级。 -->
            <img
              class="banner-img"
              :src="item.imgUrl"
              :alt="item.title || '优品购首页轮播图'"
              :fetchpriority="index === 0 ? 'high' : 'auto'"
            />
          </el-carousel-item>
        </el-carousel>

        <div class="banner-dots" v-if="bannerList?.length">
          <span
            v-for="(item, index) in bannerList"
            :key="item.id"
            class="dot"
            :class="{ active: index === currentSlide }"
          />
        </div>
      </div>

      <!-- 右侧人气推荐 -->
      <aside class="hero-right">
        <div class="hot-header">
          <!-- h2 而非 h3：页面第一个标题是布局里的 h1（logo），跳到 h3 会破坏标题层级
               （Lighthouse 的 heading-order 审计项） -->
          <h2>人气推荐</h2>
          <RouterLink to="/category" class="more-link">更多</RouterLink>
        </div>
        <div class="hot-list" v-if="hotList?.length">
          <RouterLink
            v-for="item in hotList"
            :key="item.id"
            :to="'/detail/' + item.id"
            class="hot-card"
          >
            <div class="hot-img">
              <img v-img-lazy="item.picture" :alt="item.title" />
            </div>
            <div class="hot-info">
              <p class="hot-title">{{ item.title }}</p>
              <p class="hot-desc">{{ item.alt }}</p>
            </div>
          </RouterLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home-hero {
  background: #F8F6F3;
  padding-top: 20px;
}

.hero-container {
  width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 16px;
  height: 480px;
}

/* 左侧分类栏 */
.hero-left {
  width: 230px;
  background: #fff;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.cat-header {
  padding: 12px 16px 4px;
  font-size: 15px;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 1px;
}

.cat-list {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.cat-item {
  position: relative;

  .cat-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    text-decoration: none;
    color: #555;
    font-size: 14px;
    transition: all 0.15s ease;

    i {
      font-size: 12px;
      color: #ccc;
      transition: color 0.15s;
    }

    &:hover {
      background: #F8F6F3;
      color: $xtxColor;
      i { color: $xtxColor; }
    }
  }
}

.sub-layer {
  position: absolute;
  left: 100%;
  top: 0;
  z-index: 99;
  padding-left: 4px;
}

.sub-inner {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(6px);
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  min-width: 240px;
}

.cat-footer {
  border-top: 1px solid #F0EDE8;
  padding: 8px 12px;
  display: flex;
  gap: 4px;
}

.footer-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  text-decoration: none;
  border-radius: 4px;
  transition: background 0.15s;

  .footer-icon {
    font-size: 18px;
    line-height: 1;
  }

  span {
    font-size: 11px;
    color: #999;
  }

  &:hover {
    background: #F8F6F3;
    span { color: $xtxColor; }
  }
}

.sub-item {
  display: block;
  padding: 5px 8px;
  text-decoration: none;
  color: #555;
  font-size: 13px;
  border-radius: 2px;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    background: #F8F6F3;
    color: $xtxColor;
  }
}

/* 中间轮播 */
.hero-center {
  flex: 1;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  background: #1A1A1A;

  :deep(.el-carousel),
  :deep(.el-carousel__container) {
    height: 100% !important;
  }
  :deep(.el-carousel__item) {
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  gap: 8px;

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    transition: all 0.3s ease;
    cursor: pointer;

    &.active {
      width: 24px;
      border-radius: 4px;
      background: #fff;
    }
  }
}

/* 右侧人气推荐 */
.hero-right {
  width: 230px;
  background: #fff;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #F0EDE8;

  h3 {
    font-size: 15px;
    font-weight: 500;
    color: #2C2C2C;
    margin: 0;
    letter-spacing: 1px;
  }

  .more-link {
    font-size: 12px;
    color: #999;
    text-decoration: none;

    &:hover {
      color: $xtxColor;
    }
  }
}

.hot-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hot-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  text-decoration: none;
  border-bottom: 1px solid #F8F6F3;
  transition: background 0.15s;
  flex: 1;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #F8F6F3;

    .hot-title { color: $xtxColor; }
  }
}

.hot-img {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hot-info {
  flex: 1;
  min-width: 0;
}

.hot-title {
  font-size: 13px;
  color: #2C2C2C;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.hot-desc {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
