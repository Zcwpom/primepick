<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import HomeBanner from './components/HomeBanner.vue'
import HomeCategory from './components/HomeCategory.vue'
import HomeHot from './components/HomeHot.vue'
import HomeNew from './components/HomeNew.vue'
import HomeProduct from './components/HomeProduct.vue'
import HomePanel from './components/HomePanel.vue'
</script>

<template>
<div class="container">
<HomeBanner />
<HomeCategory />
</div>
<HomeNew />
<HomeHot />
<HomeProduct />
<!-- 测试面板组件 -->
<HomePanel title="新鲜好物" subTitle="新鲜出炉 品质靠谱">
  <div> 新鲜好物内容 </div>
</HomePanel>
<HomePanel title="最新商品" subTitle="最新出炉 品质靠谱">
  <div> 最新商品内容 </div>
</HomePanel>
</template>
