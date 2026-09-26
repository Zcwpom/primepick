<script setup>
</script>

<template>
  <section class="section-brand">
    <div class="container">
      <div class="brand-grid">
        <div class="brand-item">
          <h3>精选好物</h3>
          <p>全球甄选，每一件商品都经过严格品质把控</p>
        </div>
        <div class="brand-item">
          <h3>极速配送</h3>
          <p>城市当日达，乡村次日达，新鲜不等待</p>
        </div>
        <div class="brand-item">
          <h3>无忧售后</h3>
          <p>七天无理由退换，专属客服一对一服务</p>
        </div>
        <div class="brand-item">
          <h3>会员专属</h3>
          <p>积分兑换、生日礼遇、专属折扣一应俱全</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.section-brand {
  padding: 60px 0;
  background: #1A1A1A;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
}

.brand-item {
  text-align: center;
  padding: 20px 32px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);

  &:last-child {
    border-right: none;
  }
}

h3 {
  font-size: 16px;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: 2px;
  font-weight: 400;
}

p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
  line-height: 1.6;
  letter-spacing: 0.5px;
}
</style>
