<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { getCategoryAPI } from '@/apis/layout'
import { onMounted, ref } from 'vue'
const categoryList = ref([])
onMounted(async () => {
  const res = await getCategoryAPI()
  categoryList.value = res.result
})
</script>

<template>
  <div class="category-list">
    <div class="container">
      <div class="bread-container">
        <el-breadcrumb separator=">">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>全部分类</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="list">
        <div v-for="item in categoryList" :key="item.id" class="category-card">
          <RouterLink :to="`/category/${item.id}`">
            <img :src="item.picture" :alt="item.name" />
            <p>{{ item.name }}</p>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.category-list {
  .bread-container {
    padding: 25px 0;
  }

  .list {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    background: #fff;
    padding: 40px;

    .category-card {
      width: 220px;
      height: 260px;
      text-align: center;
      border: 1px solid #f5f5f5;
      border-radius: 4px;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        transform: translateY(-3px);
      }

      a {
        display: block;
        padding: 30px 20px;

        img {
          width: 140px;
          height: 140px;
        }

        p {
          font-size: 16px;
          color: #666;
          margin-top: 15px;
        }
      }
    }
  }
}
</style>
