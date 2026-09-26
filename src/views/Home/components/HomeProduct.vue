<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getGoodsAPI } from '@/apis/home'
import { getCategoryAPI } from '@/apis/category'
import GoodsItem from './GoodsItem.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAsyncData } from '@/composables/useAsyncData'

const categoryStore = useCategoryStore()

// 首页推荐的商品数据
const { data: goodsData } = useAsyncData(async () => {
  const res = await getGoodsAPI()
  return res.result
})

// 额外分类的商品数据
const extraData = ref([])
const loaded = ref(false)

const { categoryList } = storeToRefs(categoryStore)

// 分类列表和首页商品都就绪后，自动补充缺失分类
const tryLoadExtra = async () => {
  if (loaded.value || !categoryList.value?.length || !goodsData.value) return
  loaded.value = true

  const apiIds = new Set(goodsData.value.map(c => c.id))
  const missing = categoryList.value.filter(c => !apiIds.has(c.id))

  if (missing.length) {
    const results = await Promise.allSettled(
      missing.map(cat => getCategoryAPI(cat.id))
    )
    extraData.value = results
      .filter(r => r.status === 'fulfilled' && r.value?.result)
      .map(r => r.value.result)
  }
}

watch(categoryList, tryLoadExtra, { immediate: true })
watch(goodsData, tryLoadExtra)

// 合并所有分类数据
const mergedCategories = computed(() => {
  const apiMap = {}

  // 首页推荐数据
  if (goodsData.value) {
    goodsData.value.forEach(c => { apiMap[c.id] = c })
  }

  // 额外分类数据：从子分类中提取商品
  extraData.value.forEach(c => {
    if (!apiMap[c.id]) {
      const goods = []
      if (c.children) {
        c.children.forEach(sub => {
          if (sub.goods) sub.goods.forEach(g => goods.push(g))
        })
      }
      apiMap[c.id] = { ...c, goods }
    }
  })

  return categoryList.value.map(cat => {
    const apiCat = apiMap[cat.id]
    const goods = apiCat?.goods || []
    const cover = goods[0]?.picture || cat.picture || ''
    return {
      ...cat,
      goods,
      saleInfo: apiCat?.saleInfo || '',
      coverImg: cover,
      displayItems: goods.length
        ? goods.map(g => ({ type: 'goods', ...g }))
        : (cat.children || []).map(sub => ({ type: 'sub', ...sub }))
    }
  })
})
</script>

<template>
  <section class="section-product">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">精选分类</h2>
        <p class="section-subtitle">CURATED COLLECTIONS</p>
      </div>
      <div v-for="cate in mergedCategories" :key="cate.id" class="cate-block">
        <div class="cate-head">
          <div class="cate-cover">
            <RouterLink :to="'/category/' + cate.id">
              <img :src="cate.coverImg" :alt="cate.name" />
            </RouterLink>
          </div>
          <div class="cate-title">
            <h3>{{ cate.name }} <span v-if="cate.saleInfo">{{ cate.saleInfo }}</span></h3>
            <RouterLink :to="'/category/' + cate.id" class="cate-more">查看全部</RouterLink>
          </div>
        </div>
        <div class="goods-grid" v-if="cate.displayItems[0]?.type === 'goods'">
          <GoodsItem v-for="item in cate.displayItems" :key="item.id" :goods="item" />
        </div>
        <div class="sub-grid" v-else-if="cate.displayItems.length">
          <RouterLink
            v-for="sub in cate.displayItems"
            :key="sub.id"
            :to="`/subCategory/sub/${sub.id}`"
            class="sub-card"
          >
            <div class="sub-img">
              <img :src="sub.picture" :alt="sub.name" />
            </div>
            <span class="sub-name">{{ sub.name }}</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.section-product {
  padding: 60px 0 80px;
  background: #F8F6F3;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  font-size: 32px;
  font-weight: 500;
  color: #2C2C2C;
  letter-spacing: 4px;
  margin: 0 0 8px;
  font-family: 'Noto Serif SC', serif;
}

.section-subtitle {
  font-size: 12px;
  color: #B8B4AD;
  letter-spacing: 6px;
  margin: 0;
  font-weight: 400;
}

.cate-block {
  margin-bottom: 48px;

  &:last-child {
    margin-bottom: 0;
  }
}

.cate-head {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.cate-cover {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #F0EDE8;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cate-title {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 20px;

  h3 {
    font-size: 22px;
    font-weight: 500;
    color: #2C2C2C;
    letter-spacing: 2px;
    margin: 0;

    span {
      font-size: 14px;
      color: #8C8C8C;
      font-weight: normal;
      margin-left: 12px;
    }
  }

  .cate-more {
    font-size: 13px;
    color: #B8B4AD;
    text-decoration: none;
    margin-left: auto;

    &:hover {
      color: $xtxColor;
    }
  }
}

.goods-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;

  > * {
    flex: 0 0 auto;
  }
}

.sub-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.sub-card {
  width: 140px;
  padding: 20px 12px;
  background: #fff;
  border-radius: 8px;
  text-decoration: none;
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    background: #F0EDE8;
    transform: translateY(-3px);
    .sub-name { color: $xtxColor; }
  }
}

.sub-img {
  width: 64px;
  height: 64px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

.sub-name {
  font-size: 14px;
  color: #555;
  letter-spacing: 0.5px;
  transition: color 0.2s;
}
</style>
