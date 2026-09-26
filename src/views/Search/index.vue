<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSearchAPI } from '@/apis/search'
import { usePagination } from '@/composables/usePagination'
import { useSearchHistory } from '@/composables/useSearchHistory'
import GoodsItem from '@/views/Home/components/GoodsItem.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const { history, addHistory, removeHistory, clearHistory } = useSearchHistory()

// 从 URL query 初始化搜索词
keyword.value = route.query.keyword || ''

const {
  list: goodsList,
  total,
  loading,
  isFinished,
  loadMore,
  refresh
} = usePagination(
  (req) => getSearchAPI(req),
  {
    pageSize: 20,
    defaultParams: { keyword: route.query.keyword || '' },
    immediate: !!route.query.keyword
  }
)

// 搜索结果标题
const resultTitle = computed(() => {
  if (!route.query.keyword) return ''
  return `搜索"${route.query.keyword}"`
})

// 执行搜索
const doSearch = () => {
  const kw = keyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  addHistory(kw)
  router.push({ path: '/search', query: { keyword: kw } })
}

// 回车搜索
const onKeyEnter = (e) => {
  if (e.key === 'Enter') doSearch()
}

// 点击历史词条
const onHistoryClick = (kw) => {
  keyword.value = kw
  router.push({ path: '/search', query: { keyword: kw } })
}

// 监听路由参数变化重新搜索
watch(() => route.query.keyword, (newKw) => {
  if (newKw) {
    keyword.value = newKw
    refresh({ keyword: newKw })
  }
})
</script>

<template>
  <div class="search-page">
    <div class="container">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-input">
          <i class="iconfont icon-search"></i>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜一搜"
            @keydown="onKeyEnter"
          />
          <el-button type="primary" @click="doSearch">搜索</el-button>
        </div>
      </div>

      <!-- 搜索历史 -->
      <div class="section-card" v-if="!route.query.keyword && history.length">
        <div class="section-header">
          <h3>搜索历史</h3>
          <el-button text type="primary" @click="clearHistory">清空</el-button>
        </div>
        <div class="history-tags">
          <el-tag
            v-for="item in history"
            :key="item"
            closable
            @click="onHistoryClick(item)"
            @close.stop="removeHistory(item)"
          >
            {{ item }}
          </el-tag>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="section-card" v-if="!route.query.keyword && !history.length">
        <el-empty description="输入关键词搜索商品" />
      </div>

      <!-- 搜索结果 -->
      <template v-if="route.query.keyword">
        <div class="section-card result-header">
          <h3>{{ resultTitle }}</h3>
          <span class="result-count">共 {{ total }} 件商品</span>
        </div>

        <div class="goods-grid" v-if="goodsList.length">
          <GoodsItem
            v-for="good in goodsList"
            :key="good.id"
            :goods="good"
          />
        </div>

        <el-empty
          v-else-if="!loading"
          description="没有找到相关商品，换个关键词试试"
        />

        <div class="load-more" v-if="goodsList.length">
          <el-button
            v-if="!isFinished"
            :loading="loading"
            @click="loadMore"
          >
            {{ loading ? '加载中...' : '加载更多' }}
          </el-button>
          <span v-else class="finished-text">— 已经到底了 —</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-page {
  min-height: 500px;
  padding-top: 20px;

  .section-card {
    background: #fff;
    margin-top: 20px;
    padding: 20px 30px;
    border-radius: 4px;
  }

  .search-bar {
    background: #fff;
    padding: 30px 40px;
    border-radius: 4px;

    .search-input {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 600px;
      margin: 0 auto;
      position: relative;

      .iconfont {
        font-size: 20px;
        color: #999;
        position: absolute;
        left: 16px;
        z-index: 1;
      }

      input {
        flex: 1;
        height: 46px;
        border: 2px solid $xtxColor;
        border-radius: 4px;
        padding: 0 16px 0 44px;
        font-size: 16px;
        outline: none;
        transition: border-color 0.3s;

        &:focus {
          border-color: color.adjust($xtxColor, $lightness: -10%);
        }
      }

      .el-button {
        height: 46px;
        width: 100px;
        font-size: 16px;
      }
    }
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      font-size: 16px;
      font-weight: normal;
      color: #333;
    }
  }

  .history-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    .el-tag {
      cursor: pointer;
      font-size: 14px;
      padding: 0 16px;
      height: 34px;
      line-height: 34px;
      border-radius: 17px;

      &:hover {
        color: $xtxColor;
        border-color: $xtxColor;
      }
    }
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 16px;

    h3 {
      font-size: 18px;
      font-weight: normal;
    }

    .result-count {
      color: #999;
      font-size: 14px;
    }
  }

  .goods-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
  }

  .load-more {
    text-align: center;
    padding: 40px 0;

    .finished-text {
      color: #ccc;
      font-size: 14px;
    }
  }
}
</style>
