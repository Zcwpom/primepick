<script setup>
import { getHotAPI } from '@/apis/home'
import { useAsyncData } from '@/composables/useAsyncData'

const { data: hotList } = useAsyncData(async () => {
  const res = await getHotAPI()
  return res.result
})
</script>

<template>
  <section class="section-hot">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">人气推荐</h2>
        <p class="section-subtitle">BEST SELLERS</p>
      </div>
      <div class="hot-grid" v-if="hotList?.length">
        <RouterLink
          v-for="item in hotList"
          :key="item.id"
          :to="'/detail/' + item.id"
          class="hot-card"
        >
          <div class="hot-image">
            <img v-img-lazy="item.picture" :alt="item.title" />
          </div>
          <div class="hot-info">
            <p class="hot-name">{{ item.title }}</p>
            <p class="hot-desc">{{ item.alt }}</p>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.section-hot {
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
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', SimSun, serif;
}

.section-subtitle {
  font-size: 12px;
  color: #B8B4AD;
  letter-spacing: 6px;
  margin: 0;
  font-weight: 400;
}

.hot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.hot-card {
  text-decoration: none;
  display: block;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  transition: transform 0.4s ease, box-shadow 0.4s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  }
}

.hot-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #F8F6F3;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }
}

.hot-card:hover .hot-image img {
  transform: scale(1.05);
}

.hot-info {
  padding: 20px 24px 24px;
  text-align: center;
}

.hot-name {
  font-size: 17px;
  font-weight: 500;
  color: #2C2C2C;
  margin: 0 0 6px;
  letter-spacing: 1px;
}

.hot-desc {
  font-size: 14px;
  color: #8C8C8C;
  margin: 0;
  letter-spacing: 0.5px;
}
</style>
