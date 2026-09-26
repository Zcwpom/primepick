<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderAPI } from '@/apis/order'
import { useAsyncData } from '@/composables/useAsyncData'
import { getPayDuration } from '@/utils/analytics'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.query.orderId)
const paySuccess = computed(() => route.query.payResult === 'true')

// 与后端 payChannel 字段对齐：1 支付宝 / 2 微信
const PAY_CHANNEL_TEXT = { 1: '支付宝', 2: '微信支付' }

const { data: orderInfo, loading } = useAsyncData(async () => {
  if (!orderId.value) return {}
  const res = await getOrderAPI(orderId.value)
  return res.result
}, { default: {} })

const payChannelText = computed(() => PAY_CHANNEL_TEXT[Number(orderInfo.value?.payChannel)] || '在线支付')
/** 声称支付成功却查不到订单：不能假装成功，要给出可操作的引导 */
const notFound = computed(() => !loading.value && !orderInfo.value?.id)

/** 埋点里取「下单 → 支付确认」的耗时；直接刷新本页时内存事件已清空，则不展示 */
const payDuration = computed(() => {
  const ms = getPayDuration(orderId.value)
  return ms === null ? '' : `${(ms / 1000).toFixed(1)} 秒`
})
</script>

<template>
  <div class="xtx-pay-page">
    <div class="container">
      <!-- 支付结果 -->
      <div class="pay-result">
        <template v-if="notFound">
          <span class="iconfont icon-shanchu red"></span>
          <p class="tit">没查到这笔订单</p>
          <p class="tip">请到「我的订单」确认支付状态，避免重复支付</p>
          <div class="btn">
            <el-button type="primary" style="margin-right:20px" @click="router.replace('/member/order')">查看我的订单</el-button>
            <el-button @click="router.replace('/')">进入首页</el-button>
          </div>
        </template>

        <template v-else>
          <span class="iconfont green" :class="paySuccess ? 'icon-queren2' : 'icon-shanchu'"></span>
          <p class="tit">支付{{ paySuccess ? '成功' : '失败' }}</p>
          <p class="tip">
            {{ paySuccess ? '我们将尽快为您发货，收货期间请保持手机畅通' : '订单未支付成功，可重新发起支付' }}
          </p>
          <p>订单编号：<span>{{ orderInfo.id || orderId }}</span></p>
          <p>支付方式：<span>{{ payChannelText }}</span></p>
          <p>支付金额：<span>¥{{ Number(orderInfo.payMoney || 0).toFixed(2) }}</span></p>
          <p v-if="payDuration">支付耗时：<span>{{ payDuration }}</span>（下单到确认，来自埋点）</p>
          <div class="btn">
            <el-button type="primary" style="margin-right:20px" @click="router.replace('/member/order')">查看订单</el-button>
            <el-button v-if="!paySuccess" style="margin-right:20px" @click="router.replace('/pay?id=' + orderId)">重新支付</el-button>
            <el-button @click="router.replace('/')">进入首页</el-button>
          </div>
          <p class="alert">
            <span class="iconfont icon-tip"></span>
            温馨提示：PrimePick 不会以订单异常、系统升级为由要求您点击任何网址链接进行退款操作，保护资产、谨慎操作。
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pay-result {
  padding: 100px 0;
  background: #fff;
  text-align: center;
  margin-top: 20px;

  >.iconfont {
    font-size: 100px;
  }

  .green {
    color: #1dc779;
  }

  .red {
    color: $priceColor;
  }

  .tit {
    font-size: 24px;
  }

  .tip {
    color: #999;
  }

  p {
    line-height: 40px;
    font-size: 16px;
  }

  .btn {
    margin-top: 50px;
  }

  .alert {
    font-size: 12px;
    color: #999;
    margin-top: 50px;
  }
}
</style>
