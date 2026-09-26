<script setup>
import { findNewAPI } from '@/apis/home'
import { useAsyncData } from '@/composables/useAsyncData'

const { data: newList } = useAsyncData(async () => {
  const res = await findNewAPI()
  return res.result
})
</script>

<template>
  <section class="section-new">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">新鲜好物</h2>
        <p class="section-subtitle">FRESH ARRIVALS</p>
      </div>
      <div class="new-grid" v-if="newList?.length">
        <RouterLink
          v-for="item in newList"
          :key="item.id"
          :to="`/detail/${item.id}`"
          class="new-card"
        >
          <div class="card-image">
            <img :src="item.picture" :alt="item.name" />
          </div>
          <div class="card-info">
            <p class="card-name">{{ item.name }}</p>
            <p class="card-price">¥{{ item.price }}</p>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.section-new {
  padding: 80px 0 60px;
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

.new-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.new-card {
  text-decoration: none;
  display: block;
  transition: transform 0.4s ease;

  &:hover {
    transform: translateY(-6px);

    .card-image img {
      transform: scale(1.05);
    }
  }
}

.card-image {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #F8F6F3;
  border-radius: 4px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s ease;
  }
}

.card-info {
  padding: 20px 0 0;
  text-align: center;
}

.card-name {
  font-size: 16px;
  color: #2C2C2C;
  margin: 0 0 8px;
  letter-spacing: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-price {
  font-size: 18px;
  color: $priceColor;
  font-weight: 600;
  margin: 0;
}
</style>
