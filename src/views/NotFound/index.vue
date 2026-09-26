<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <p class="code">404</p>
    <h1 class="title">页面走丢了</h1>
    <p class="desc">你访问的地址不存在，或者商品已经下架</p>
    <div class="actions">
      <el-button type="primary" size="large" @click="router.replace('/')">回到首页</el-button>
      <el-button size="large" @click="router.back()">返回上一页</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.code {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', SimSun, serif;
  font-size: 96px;
  line-height: 1;
  font-weight: 600;
  color: $xtxColor;
  letter-spacing: 4px;
  margin: 0;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 24px 0 0;
}

.desc {
  color: #999;
  font-size: 14px;
  margin: 12px 0 32px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
