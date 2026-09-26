<!-- eslint-disable vue/multi-word-component-names -->
 <script setup>
import { getCategoryFilterAPI , getSubCategoryAPI } from '@/apis/category'
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import GoodsItem from '../Home/components/GoodsItem.vue'
import { useAsyncData } from '@/composables/useAsyncData'
import { usePagination } from '@/composables/usePagination'


const route = useRoute()

const { data: categoryData, execute: fetchCategory } = useAsyncData(
  async (id) => {
    const res = await getCategoryFilterAPI(id)
    return res.result
  },
  { default: {}, immediate: false }
)

const sortField = ref('publishTime')
const { list: goodsList, isFinished, loadMore, refresh: refreshGoods } = usePagination(
  (req) => getSubCategoryAPI(req),
  { pageSize: 20, defaultParams: { categoryId: route.params.id, sortField: 'publishTime' } }
)

// 初始加载
onMounted(() => fetchCategory(route.params.id))

//tab切换回调
const tabChange = () => {
  refreshGoods({ sortField: sortField.value })
}

// 路由参数变化时重新加载
watch(() => route.params.id, (newId) => {
  fetchCategory(newId)
  refreshGoods({ categoryId: newId, sortField: sortField.value })
})
</script>

<template>
  <div class="container ">
    <!-- 面包屑 -->
    <div class="bread-container">
      <el-breadcrumb separator=">">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: `/category/${categoryData.parentId}` }">{{ categoryData.parentName }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ categoryData.name }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="sub-container" >
      <el-tabs v-model="sortField" @tab-change="tabChange">
        <el-tab-pane label="最新商品" name="publishTime"></el-tab-pane>
        <el-tab-pane label="最高人气" name="orderNum"></el-tab-pane>
        <el-tab-pane label="评论最多" name="evaluateNum"></el-tab-pane>
      </el-tabs>
      <div class="body" v-infinite-scroll="loadMore" :infinite-scroll-disabled="isFinished">
         <!-- 商品列表-->
          <GoodsItem v-for="good in goodsList" :goods="good" :key="good.id" />
      </div>
    </div>
  </div>

</template>



<style lang="scss" scoped>
.bread-container {
  padding: 25px 0;
  color: #666;
}

.sub-container {
  padding: 20px 10px;
  background-color: #fff;

  .body {
    display: flex;
    flex-wrap: wrap;
    padding: 0 10px;
  }

  .goods-item {
    display: block;
    width: 220px;
    margin-right: 20px;
    padding: 20px 30px;
    text-align: center;

    img {
      width: 160px;
      height: 160px;
    }

    p {
      padding-top: 10px;
    }

    .name {
      font-size: 16px;
    }

    .desc {
      color: #999;
      height: 29px;
    }

    .price {
      color: $priceColor;
      font-size: 20px;
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }


}
</style>
