<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrderAPI, payOrderAPI } from '@/apis/order'
import { useAsyncData } from '@/composables/useAsyncData'
import { useCountDown } from '@/composables/useCountDown'
import { canPay, isClosed, isPaid } from '@/domain/order-state'
import { EVENTS, track } from '@/utils/analytics'
import { notifyOrderChanged } from '@/utils/crossTab'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.query.id)

const { data: order, loading, execute } = useAsyncData(async () => {
  const res = await getOrderAPI(orderId.value)
  return res.result
}, { immediate: false, default: {} })

// 倒计时基于订单的「支付截止时间」这个绝对时间来算，比接口给的剩余秒数更抗漂移
const {
  remaining,
  formatted: countdownText,
  expired,
  start: startCountDown,
  refresh: refreshCountDown,
} = useCountDown(() => order.value?.payLatestTime)

const payChannel = ref(1) // 1 支付宝 / 2 微信
const paying = ref(false)
const qrCode = ref('')

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

/** 订单状态：1 待付款 / 2 待发货 / 6 已取消（含超时关闭） */
const orderState = computed(() => Number(order.value?.orderState))
/** 支付方式：1 在线支付 / 2 货到付款 —— 货到付款的订单不需要在线支付 */
const isOfflinePay = computed(() => Number(order.value?.payType) === 2)
/**
 * 是否可支付。状态规则统一来自 domain/order-state.js，
 * 页面里不再散落 `order.orderState === 1` 这类判断。
 *
 * 注意：canPay() 内部的超时判定走的是 Date.now()，**不是响应式的**，
 * 所以这里额外与倒计时 composable 的 expired 做与运算 ——
 * 否则倒计时归零后按钮不会消失（这是把纯函数和响应式状态拼在一起时的经典坑）。
 */
const payable = computed(() => canPay(order.value) && !expired.value && !isOfflinePay.value)
const alreadyPaid = computed(() => isPaid(order.value))
const closed = computed(() => isClosed(order.value))
const notFound = computed(() => !loading.value && !order.value?.id)

// 轮询参数：真实网关回调是异步的，点了支付不能立刻认定成功
const POLL_FIRST_DELAY_MS = 800
const POLL_MAX_ATTEMPTS = 5

/**
 * 轮询订单状态以确认支付结果。
 *
 * 为什么这里不能乐观更新：支付是**不可逆**动作，点按钮只代表「提交了支付」，
 * 真正的结果由支付网关异步回调后端决定 —— 在查清楚之前必须保持「确认中」，
 * 不能提前把界面改成「已支付」。这正是支付与购物车的本质区别。
 * 退避策略：首次等 0.8s 给网关一点时间，之后每次多等一个间隔。
 */
async function pollOrderPaid() {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(POLL_FIRST_DELAY_MS * attempt)
    try {
      const res = await getOrderAPI(orderId.value)
      const state = Number(res.result?.orderState)
      if (state === 2) return true
      if (state !== 1) return false // 已关闭等状态：判定为未支付成功
    } catch {
      // 单次查询失败不终止轮询，交给下一次重试
    }
  }
  return false
}

/**
 * 生成与订单绑定的二维码。
 * 原先是一张所有订单共用的静态图（qrcode.jpg），现在把 orderId 编进二维码内容，
 * 「这个码属于这一单」才是可验证的。
 */
async function renderQrCode() {
  if (!order.value?.id) return
  const payUrl = `https://pay.primepick.demo/scan?orderId=${order.value.id}&amount=${order.value.payMoney ?? 0}`
  try {
    // qrcode 只有支付页需要：动态 import 让它单独成 chunk，不占首屏预算
    const mod = await import('qrcode')
    const QRCode = mod.default ?? mod
    qrCode.value = await QRCode.toDataURL(payUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#2C2C2C', light: '#FFFFFF' },
    })
  } catch (error) {
    // 二维码生成失败不阻塞支付流程，界面会退回「二维码生成中」提示
    console.error('[pay] 二维码生成失败：', error)
  }
}

async function loadOrder() {
  const result = await execute()
  if (result?.id) {
    startCountDown()
    renderQrCode()
  }
}

/** 我已完成支付：提交支付 → 轮询确认结果 → 跳支付结果页 */
async function confirmPaid() {
  if (!payable.value || paying.value) return
  paying.value = true
  try {
    track(EVENTS.PAY_SUBMITTED, { orderId: orderId.value, payChannel: payChannel.value })
    // 把用户选的支付渠道一起提交，支付结果页会回显它
    await payOrderAPI(orderId.value, { payChannel: payChannel.value })
    const paid = await pollOrderPaid()
    if (paid) {
      track(EVENTS.PAY_CONFIRMED, { orderId: orderId.value })
      // 通知其它标签页：这笔订单状态变了，它们的订单列表需要刷新
      notifyOrderChanged({ orderId: orderId.value })
      router.replace({ path: '/paycallback', query: { orderId: orderId.value, payResult: 'true' } })
      return
    }
    track(EVENTS.PAY_FAILED, { orderId: orderId.value, reason: 'poll_timeout' })
    ElMessage.warning('支付结果确认中，请稍后到「我的订单」查看')
    await loadOrder()
  } catch {
    // 失败提示由 axios 拦截器统一给出；重新拉一次让界面反映真实状态
    // （例如订单已超时关闭 / 已被其它标签页支付）
    refreshCountDown()
    await loadOrder()
  } finally {
    paying.value = false
  }
}

onMounted(loadOrder)
watch(orderId, (id) => {
  if (id) loadOrder()
})

// 倒计时归零后重新拉一次订单：后端会把超时未支付的订单关掉（mock 在读取时清扫），
// 前端只负责反映真实状态，不自己猜
watch(expired, async (isExpired) => {
  if (isExpired && orderState.value === 1) await loadOrder()
})
</script>

<template>
  <div class="pay-page">
    <div class="container">
      <el-empty v-if="notFound" description="订单不存在或已被删除">
        <el-button type="primary" @click="router.replace('/member/order')">查看我的订单</el-button>
      </el-empty>

      <div v-else-if="order.id" class="pay-wrapper">
        <!-- 左：订单信息 -->
        <div class="pay-main">
          <h3 class="box-title">订单信息</h3>
          <ul class="order-meta">
            <li><span>订单编号</span><em>{{ order.id }}</em></li>
            <li><span>下单时间</span><em>{{ order.createTime }}</em></li>
            <li><span>商品件数</span><em>{{ order.totalNum }} 件</em></li>
          </ul>

          <h3 class="box-title">商品清单</h3>
          <ul class="goods-list">
            <li v-for="sku in order.skus" :key="sku.id">
              <img class="pic" :src="sku.image" :alt="sku.name" />
              <div class="info">
                <p class="name ellipsis">{{ sku.name }}</p>
                <p class="attr ellipsis">{{ sku.attrsText }}</p>
              </div>
              <p class="price">&yen;{{ Number(sku.realPay || 0).toFixed(2) }}</p>
              <p class="count">x{{ sku.quantity }}</p>
            </li>
          </ul>

          <h3 class="box-title">应付金额</h3>
          <div class="amount">
            <p class="total">&yen;{{ Number(order.payMoney || 0).toFixed(2) }}</p>
            <p class="sub">
              商品 &yen;{{ Number(order.totalMoney || 0).toFixed(2) }}
              <i>+</i> 运费 &yen;{{ Number(order.postFee || 0).toFixed(2) }}
            </p>
          </div>
        </div>

        <!-- 右：支付操作 -->
        <div class="pay-side">
          <template v-if="payable">
            <p class="countdown" :class="{ urgent: remaining <= 60 }">
              支付剩余时间 <b>{{ countdownText }}</b>
            </p>

            <div class="qrcode-box">
              <img v-if="qrCode" :src="qrCode" alt="订单支付二维码" />
              <span v-else class="qrcode-fallback">二维码生成中…</span>
            </div>
            <p class="pay-hint">请使用手机扫码支付</p>

            <el-radio-group v-model="payChannel" class="channel">
              <el-radio-button :value="1">支付宝</el-radio-button>
              <el-radio-button :value="2">微信支付</el-radio-button>
            </el-radio-group>

            <el-button
              type="primary"
              size="large"
              class="pay-btn"
              :loading="paying"
              @click="confirmPaid"
            >
              {{ paying ? '正在确认支付结果…' : '我已完成支付' }}
            </el-button>

            <p class="pay-tip">
              支付完成后订单状态会变为「待发货」，可在「我的订单」中查看
            </p>
          </template>

          <template v-else-if="isOfflinePay">
            <div class="state-block">
              <p class="state-title">货到付款</p>
              <p class="state-desc">该订单无需在线支付，收货时向配送员付款即可</p>
              <el-button type="primary" @click="router.replace('/member/order')">查看订单</el-button>
            </div>
          </template>

          <template v-else-if="alreadyPaid">
            <div class="state-block">
              <p class="state-title paid">该订单已支付</p>
              <p class="state-desc">无需重复支付</p>
              <el-button type="primary" @click="router.replace('/member/order')">查看订单</el-button>
            </div>
          </template>

          <template v-else>
            <div class="state-block">
              <p class="state-title expired">{{ closed ? '订单已关闭' : '订单已超时' }}</p>
              <p class="state-desc">
                {{ closed ? '超时未支付或已取消，该订单已关闭' : '已超过支付截止时间，该订单已关闭' }}
              </p>
              <el-button type="primary" @click="router.replace('/cartlist')">重新下单</el-button>
              <el-button @click="router.replace('/member/order')">查看订单</el-button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pay-page {
  padding: 20px 0 60px;
}

.pay-wrapper {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.pay-main {
  flex: 1;
  background: #fff;
  padding: 0 20px 30px;
}

.box-title {
  font-size: 16px;
  font-weight: normal;
  line-height: 70px;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
}

.order-meta {
  padding: 16px 0;

  li {
    display: flex;
    line-height: 32px;
    font-size: 14px;

    span {
      width: 90px;
      color: #999;
    }

    em {
      font-style: normal;
      color: #2C2C2C;
    }
  }
}

.goods-list {
  padding: 16px 0;

  li {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px dashed #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  .pic {
    width: 70px;
    height: 70px;
    border-radius: 4px;
    margin-right: 16px;
    background: #ebebeb url('@/assets/images/200.png') no-repeat center / contain;
  }

  .info {
    flex: 1;
    min-width: 0;

    .name {
      font-size: 14px;
      color: #2C2C2C;
    }

    .attr {
      font-size: 13px;
      color: #999;
      margin-top: 6px;
    }
  }

  .price {
    width: 100px;
    text-align: right;
    color: $priceColor;
  }

  .count {
    width: 60px;
    text-align: right;
    color: #999;
  }
}

.amount {
  padding: 20px 0;
  text-align: right;

  .total {
    font-size: 28px;
    color: $priceColor;
    font-weight: 600;
  }

  .sub {
    margin-top: 8px;
    font-size: 13px;
    color: #999;

    i {
      margin: 0 6px;
      font-style: normal;
    }
  }
}

.pay-side {
  width: 360px;
  background: #fff;
  padding: 30px 24px 36px;
  text-align: center;
}

.countdown {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;

  b {
    color: $priceColor;
    font-size: 20px;
    margin-left: 6px;
    letter-spacing: 1px;
  }

  &.urgent b {
    animation: pay-blink 1s steps(2, start) infinite;
  }
}

@keyframes pay-blink {
  to {
    opacity: 0.35;
  }
}

.qrcode-box {
  width: 200px;
  height: 200px;
  margin: 0 auto 16px;
  padding: 10px;
  border: 2px solid #EDE9E4;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .qrcode-fallback {
    font-size: 13px;
    color: #bbb;
  }
}

.pay-hint {
  font-size: 15px;
  color: #666;
  letter-spacing: 1px;
}

.channel {
  margin: 20px 0 18px;
}

.pay-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  letter-spacing: 2px;
}

.pay-tip {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.7;
  color: #aaa;
}

.state-block {
  padding: 40px 0;

  .state-title {
    font-size: 20px;
    margin-bottom: 10px;

    &.paid {
      color: $sucColor;
    }

    &.expired {
      color: #999;
    }
  }

  .state-desc {
    font-size: 13px;
    color: #999;
    margin-bottom: 24px;
  }
}
</style>
