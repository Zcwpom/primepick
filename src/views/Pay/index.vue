<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const paySuccess = () => {
  router.push('/')
}
</script>

<template>
  <div class="pay-page">
    <div class="pay-card">
      <div class="qrcode-box">
        <img src="@/assets/images/qrcode.jpg" alt="支付二维码" />
      </div>
      <p class="pay-hint">请使用手机扫码支付</p>
      <el-button type="primary" size="large" class="pay-btn" @click="paySuccess">
        支付成功
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pay-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.pay-card {
  text-align: center;
  background: #fff;
  padding: 48px 64px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.qrcode-box {
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  padding: 12px;
  border: 2px solid #EDE9E4;
  border-radius: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.pay-hint {
  font-size: 16px;
  color: #666;
  margin: 0 0 32px;
  letter-spacing: 1px;
}

.pay-btn {
  width: 240px;
  height: 48px;
  font-size: 16px;
  letter-spacing: 2px;
}
</style>
