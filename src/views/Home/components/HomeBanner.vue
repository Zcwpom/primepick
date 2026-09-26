<script setup>
import { getBannerAPI } from "@/apis/home";
import { useAsyncData } from "@/composables/useAsyncData";
//轮播图
const { data: bannerList } = useAsyncData(async () => {
  const res = await getBannerAPI();
  return res.result;
})
</script>

<template>
  <div class="home-banner">
    <el-carousel height="500px">
      <el-carousel-item v-for="item in bannerList" :key="item.id">
        <img :src="item.imgUrl" alt="">
      </el-carousel-item>
    </el-carousel>
  </div>
</template>

<style scoped lang='scss'>
.home-banner {
  width: 1240px;
  height: 500px;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 98;
  border-radius: 0 0 12px 12px;
  overflow: hidden;

  img {
    width: 100%;
    height: 500px;
    object-fit: cover;
  }
}
</style>
