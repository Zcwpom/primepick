<script setup>
defineProps({
  title: {
    type: String,
  },
  subTitle: {
    type: String,
  }
})
</script>


<template>
  <div class="home-panel">
    <div class="container">
      <div class="head">
         <!-- 主标题和副标题 -->
        <h3>
          {{ title }}<small>{{ subTitle }}</small>
        </h3>
      </div>
      <!-- 主体内容区域 -->
      <slot />
    </div>
  </div>
</template>

<style scoped lang='scss'>
.home-panel {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;

  .head {
    padding: 40px 0 20px;
    display: flex;
    align-items: flex-end;

    h3 {
      flex: 1;
      font-size: 26px;
      font-weight: 500;
      margin-left: 6px;
      height: 35px;
      line-height: 35px;
      color: #2C2C2C;
      letter-spacing: 2px;

      small {
        font-size: 15px;
        color: #8C8C8C;
        margin-left: 16px;
        font-weight: normal;
        letter-spacing: 1px;
      }
    }
  }
}
</style>
