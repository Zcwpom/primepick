<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { cancelOrderAPI, getUserOrder, receiveOrderAPI } from '@/apis/order'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePagination } from '@/composables/usePagination'
import { formatCountdown } from '@/composables/useCountDown'
import { canCancel, canReceive, isUnpaid, orderStateText } from '@/domain/order-state'
import { EVENTS, track } from '@/utils/analytics'
import { notifyOrderChanged, onOrderChanged } from '@/utils/crossTab'

const router = useRouter()

// 「付款截止」倒计时：整张列表共用一个每秒 tick，
// 而不是每个订单行各开一个定时器（N 个订单 = N 个 interval）
const now = ref(Date.now())
const tickTimer = setInterval(() => {
  now.value = Date.now()
}, 1000)
onUnmounted(() => clearInterval(tickTimer))

// tab列表
const tabTypes = [
  { name: "all", label: "全部订单" },
  { name: "unpay", label: "待付款" },
  { name: "deliver", label: "待发货" },
  { name: "receive", label: "待收货" },
  { name: "comment", label: "待评价" },
  { name: "complete", label: "已完成" },
  { name: "cancel", label: "已取消" }
]

// tab 名称 → 订单状态码
const orderStateMap = {
  all: 0,
  unpay: 1,
  deliver: 2,
  receive: 3,
  comment: 4,
  complete: 5,
  cancel: 6
}

// 订单状态文案与「能做哪些操作」都来自 domain/order-state.js，
// 这里原先还有一份重复的状态文案映射表，已删除

const PAGE_SIZE = 2

const { list: orderList, total, onPageChange, refresh } = usePagination(
  (req) => getUserOrder(req),
  { pageSize: PAGE_SIZE, defaultParams: { orderState: 0 } }
)

/**
 * 正在处理中的操作：key 为 `${订单id}:${动作}`。
 * 用来做**幂等保护** —— 用户连点两下「取消订单」只会发出一次请求，
 * 否则会产生两次状态变更（真实后端可能因此报错或生成重复流水）。
 */
// 其它标签页支付成功 / 取消订单后，本页的订单列表也要刷新
let offOrderChanged = null
onMounted(() => {
  offOrderChanged = onOrderChanged(() => refresh())
})
onUnmounted(() => offOrderChanged?.())

const acting = ref({})
const isActing = (id, action) => Boolean(acting.value[`${id}:${action}`])

async function runAction(id, action, task) {
  const key = `${id}:${action}`
  if (acting.value[key]) return
  acting.value[key] = true
  try {
    await task()
  } catch {
    // 用户点了弹窗取消，或接口失败（失败提示已由 axios 拦截器统一给出）
  } finally {
    delete acting.value[key]
  }
}

/** 取消订单：不可逆操作，先二次确认 */
const cancelOrder = (order) => runAction(order.id, 'cancel', async () => {
  await ElMessageBox.confirm('取消后订单不可恢复，确定取消这笔订单吗？', '取消订单', {
    confirmButtonText: '确定取消',
    cancelButtonText: '再想想',
    type: 'warning',
  })
  await cancelOrderAPI(order.id)
  track(EVENTS.ORDER_CANCELLED, { orderId: order.id })
  notifyOrderChanged({ orderId: order.id }) // 其它标签页的订单列表同样要刷新
  ElMessage.success('订单已取消')
  await refresh()
})

/** 确认收货：会把订单推进到「待评价」 */
const confirmReceive = (order) => runAction(order.id, 'receive', async () => {
  await ElMessageBox.confirm('请确认已收到全部商品，确认后订单交易完成。', '确认收货', {
    confirmButtonText: '确认收货',
    cancelButtonText: '还没收到',
    type: 'info',
  })
  await receiveOrderAPI(order.id)
  track(EVENTS.ORDER_RECEIVED, { orderId: order.id })
  notifyOrderChanged({ orderId: order.id })
  ElMessage.success('已确认收货')
  await refresh()
})

// tab切换
const tabChange = (type) => {
  refresh({ orderState: orderStateMap[type] })
}

// 页数切换
const pageChange = (page) => {
  onPageChange(page)
}
</script>

<template>
  <div class="order-container">
    <el-tabs @tab-change="tabChange">
      <!-- tab切换 -->
      <el-tab-pane v-for="item in tabTypes" :key="item.name" :label="item.label" :name="item.name" />

      <div class="main-container">
        <div class="holder-container" v-if="orderList.length === 0">
          <el-empty description="暂无订单数据" />
        </div>
        <div v-else>
          <!-- 订单列表 -->
          <div class="order-item" v-for="order in orderList" :key="order.id">
            <div class="head">
              <span>下单时间：{{ order.createTime }}</span>
              <span>订单编号：{{ order.id }}</span>
              <!-- 未付款，显示距离支付截止还剩多久（原来直接渲染接口返回的秒数，页面会显示「付款截止: -1」） -->
              <span class="down-time" v-if="order.orderState === 1">
                <i class="iconfont icon-down-time"></i>
                <b>付款截止: {{ formatCountdown(order.payLatestTime, now) }}</b>
              </span>
            </div>
            <div class="body">
              <div class="column goods">
                <ul>
                  <li v-for="item in order.skus" :key="item.id">
                    <a class="image" href="javascript:;" @click="router.push('/detail/' + item.spuId)">
                      <img :src="item.image" alt="" />
                    </a>
                    <div class="info">
                      <p class="name ellipsis-2">
                        {{ item.name }}
                      </p>
                      <p class="attr ellipsis">
                        <span>{{ item.attrsText }}</span>
                      </p>
                    </div>
                    <div class="price">¥{{ item.realPay?.toFixed(2) }}</div>
                    <div class="count">x{{ item.quantity }}</div>
                  </li>
                </ul>
              </div>
              <!-- 只展示状态本身：物流 / 评价 / 售后都需要后端支撑，
                   在接口就绪之前不做「点了只弹提示」的假入口 -->
              <div class="column state">
                <p>{{ orderStateText(order) }}</p>
              </div>
              <div class="column amount">
                <p class="red">¥{{ order.payMoney?.toFixed(2) }}</p>
                <p>（含运费：¥{{ order.postFee?.toFixed(2) }}）</p>
                <p>在线支付</p>
              </div>
              <div class="column action">
                <el-button v-if="isUnpaid(order)" type="primary" size="small" @click="router.push('/pay?id=' + order.id)">
                  立即付款
                </el-button>
                <el-button
                  v-if="canReceive(order)"
                  type="primary"
                  size="small"
                  :loading="isActing(order.id, 'receive')"
                  @click="confirmReceive(order)"
                >
                  确认收货
                </el-button>
                <p>
                  <a href="javascript:;" @click="router.push('/detail/' + (order.skus?.[0]?.spuId || ''))">查看详情</a>
                </p>
                <p v-if="canCancel(order)">
                  <a href="javascript:;" @click="cancelOrder(order)">取消订单</a>
                </p>
              </div>
            </div>
          </div>
          <!-- 分页 -->
          <div class="pagination-container" v-if="total > PAGE_SIZE">
            <el-pagination
              :total="total"
              @current-change="pageChange"
              :page-size="PAGE_SIZE"
              background
              layout="prev, pager, next"
            />
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</template>

<style scoped lang="scss">
.order-container {
  padding: 10px 20px;

  .pagination-container {
    display: flex;
    justify-content: center;
  }

  .main-container {
    min-height: 500px;

    .holder-container {
      min-height: 500px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}

.order-item {
  margin-bottom: 20px;
  border: 1px solid #f5f5f5;

  .head {
    height: 50px;
    line-height: 50px;
    background: #f5f5f5;
    padding: 0 20px;
    overflow: hidden;

    span {
      margin-right: 20px;

      &.down-time {
        margin-right: 0;
        float: right;

        i {
          vertical-align: middle;
          margin-right: 3px;
        }

        b {
          vertical-align: middle;
          font-weight: normal;
        }
      }
    }

    .del {
      margin-right: 0;
      float: right;
      color: #999;
    }
  }

  .body {
    display: flex;
    align-items: stretch;

    .column {
      border-left: 1px solid #f5f5f5;
      text-align: center;
      padding: 20px;

      >p {
        padding-top: 10px;
      }

      &:first-child {
        border-left: none;
      }

      &.goods {
        flex: 1;
        padding: 0;
        align-self: center;

        ul {
          li {
            border-bottom: 1px solid #f5f5f5;
            padding: 10px;
            display: flex;

            &:last-child {
              border-bottom: none;
            }

            .image {
              width: 70px;
              height: 70px;
              border: 1px solid #f5f5f5;
            }

            .info {
              width: 220px;
              text-align: left;
              padding: 0 10px;

              p {
                margin-bottom: 5px;

                &.name {
                  height: 38px;
                }

                &.attr {
                  color: #999;
                  font-size: 12px;

                  span {
                    margin-right: 5px;
                  }
                }
              }
            }

            .price {
              width: 100px;
            }

            .count {
              width: 80px;
            }
          }
        }
      }

      &.state {
        width: 120px;

        .green {
          color: $xtxColor;
        }
      }

      &.amount {
        width: 200px;

        .red {
          color: $priceColor;
        }
      }

      &.action {
        width: 140px;

        a {
          display: block;

          &:hover {
            color: $xtxColor;
          }
        }
      }
    }
  }
}
</style>
