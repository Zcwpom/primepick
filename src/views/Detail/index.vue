 <script setup>
import { getDetailAPI } from "@/apis/detail";
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import DetailHot from './components/DetailHot.vue'
import { useCartStore } from '@/stores/cartStore'
import { ElMessage } from 'element-plus'
import { useAsyncData } from '@/composables/useAsyncData'

const route = useRoute()
const cartStore = useCartStore()

const selectedSku = ref({})
const count = ref(1)

const skuChange = (sku) => {
  selectedSku.value = sku
}

const addToCart = () => {
  if (!selectedSku.value.skuId) {
    ElMessage.warning('请选择商品规格')
    return
  }
  cartStore.addCart({
    skuId: selectedSku.value.skuId,
    count: count.value,
    picture: goods.value.mainPictures?.[0] || '',
    name: goods.value.name,
    price: selectedSku.value.price,
    nowPrice: selectedSku.value.price,
    attrsText: selectedSku.value.specsText
  })
}

const { data: goods } = useAsyncData(async () => {
  const res = await getDetailAPI(route.params.id)
  return res.result
}, { default: {} })

/**
 * 面包屑由 categories 推导，而不是在模板里写死 categories[0] / categories[1]。
 * 真实接口返回的顺序是「叶子 → 父级」，而且**可能只有一级**（部分商品没有二级分类），
 * 原来的硬下标一旦越界就会在渲染期抛 TypeError —— 整个页面内容区变成空白。
 * 这类字段缺失在真实数据里很常见，是被 mock 的真实响应暴露出来的。
 */
const breadcrumbs = computed(() => {
  const [leaf, parent] = goods.value?.categories || []
  const items = []
  if (parent?.id) items.push({ id: parent.id, name: parent.name, path: `/category/${parent.id}` })
  if (leaf?.id) items.push({ id: leaf.id, name: leaf.name, path: `/subCategory/sub/${leaf.id}` })
  return items
})

</script>

<template>
  <div class="xtx-goods-page">
    <div class="container" v-if="goods.details">
      <!-- 面包屑导航 -->
      <div class="bread-container">
        <el-breadcrumb separator=">">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.id" :to="{ path: item.path }">
            {{ item.name }}
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ goods.name }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <!-- 商品信息 -->
      <div class="info-container">
        <div>
          <div class="goods-info">
            <div class="media">
              <!-- 图片预览区 -->
              <XtxImageView :imageList="goods.mainPictures || []" />
              <!-- 统计数量 -->
              <ul class="goods-sales">
                <li>
                  <p>销量人气</p>
                  <p> {{ goods.salesCount }}+ </p>
                  <p><i class="iconfont icon-task-filling"></i>销量人气</p>
                </li>
                <li>
                  <p>商品评价</p>
                  <p> {{ goods.commentCount }}+ </p>
                </li>
                <li>
                  <p>收藏人气</p>
                  <p> {{ goods.collectCount }}+ </p>
                </li>
                <li>
                  <p>品牌信息</p>
                  <!-- brand 在真实数据里可能整体缺失，直接取 .name 会让整页崩掉 -->
                  <p> {{ goods.brand?.name || '暂无品牌' }} </p>
                </li>
              </ul>
            </div>
            <div class="spec">
              <!-- 商品信息区 -->
              <p class="g-name"> {{ goods.name }}</p>
              <p class="g-desc"> {{ goods.desc }} </p>
              <p class="g-price">
                <span>{{ goods.oldPrice }}</span>
                <span> {{ goods.price }}</span>
              </p>
              <div class="g-service">
                <dl>
                  <dt>促销</dt>
                  <dd>12月好物放送，App领券购买直降120元</dd>
                </dl>
                <dl>
                  <dt>服务</dt>
                  <dd>
                    <span>无忧退货</span>
                    <span>快速退款</span>
                    <span>免费包邮</span>
                  </dd>
                </dl>
              </div>
              <!-- sku组件 -->
               <XtxSku :goods="goods" @change="skuChange" />
              <!-- 数据组件 -->
              <div class="number-box">
                <span class="label">数量</span>
                <el-input-number v-model="count" :min="1" :max="selectedSku.inventory || 99" aria-label="购买数量" />
              </div>
              <!-- 按钮组件 -->
              <div>
                <el-button size="large" class="btn" @click="addToCart">
                  加入购物车
                </el-button>
              </div>

            </div>
          </div>
          <div class="goods-footer">
            <div class="goods-article">
              <!-- 商品详情 -->
              <div class="goods-tabs">
                <nav>
                  <span>商品详情</span>
                </nav>
                <div class="goods-detail">
                  <!-- 属性 -->
                  <ul class="attrs">
                    <li v-for="item in goods.details.properties || []" :key="item.value">
                      <span class="dt">{{ item.name }}</span>
                      <span class="dd">{{ item.value }}</span>
                    </li>
                  </ul>
                  <!-- 图片 -->
                 <img v-for="item in goods.details.pictures || []" :key="item" :src="item" alt="">
                </div>
              </div>
            </div>
            <!-- 24热榜+专题推荐 -->
            <div class="goods-aside">
              <!-- 24热榜 -->
              <DetailHot :hotType="1" />
              <!-- 周热榜 -->
               <DetailHot :hotType="2" />

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang='scss'>
.xtx-goods-page {
  .goods-info {
    min-height: 600px;
    background: #fff;
    display: flex;

    .media {
      width: 580px;
      height: 600px;
      padding: 30px 50px;
    }

    .spec {
      flex: 1;
      padding: 30px 30px 30px 0;
    }
  }

  .goods-footer {
    display: flex;
    margin-top: 20px;

    .goods-article {
      width: 940px;
      margin-right: 20px;
    }

    .goods-aside {
      width: 280px;
      min-height: 1000px;
    }
  }

  .goods-tabs {
    min-height: 600px;
    background: #fff;
  }

  .goods-warn {
    min-height: 600px;
    background: #fff;
    margin-top: 20px;
  }

  .number-box {
    display: flex;
    align-items: center;

    .label {
      width: 60px;
      color: #999;
      padding-left: 10px;
    }
  }

  .g-name {
    font-size: 22px;
  }

  .g-desc {
    color: #999;
    margin-top: 10px;
  }

  .g-price {
    margin-top: 10px;

    span {
      &::before {
        content: "¥";
        font-size: 14px;
      }

      &:first-child {
        color: $priceColor;
        margin-right: 10px;
        font-size: 22px;
      }

      &:last-child {
        color: #999;
        text-decoration: line-through;
        font-size: 16px;
      }
    }
  }

  .g-service {
    background: #f5f5f5;
    width: 500px;
    padding: 20px 10px 0 10px;
    margin-top: 10px;

    dl {
      padding-bottom: 20px;
      display: flex;
      align-items: center;

      dt {
        width: 50px;
        color: #999;
      }

      dd {
        color: #666;

        &:last-child {
          span {
            margin-right: 10px;

            &::before {
              content: "•";
              color: $xtxColor;
              margin-right: 2px;
            }
          }

          a {
            color: $xtxColor;
          }
        }
      }
    }
  }

  .goods-sales {
    display: flex;
    width: 400px;
    align-items: center;
    text-align: center;
    height: 140px;

    li {
      flex: 1;
      position: relative;

      ~li::after {
        position: absolute;
        top: 10px;
        left: 0;
        height: 60px;
        border-left: 1px solid #e4e4e4;
        content: "";
      }

      p {
        &:first-child {
          color: #999;
        }

        &:nth-child(2) {
          color: $priceColor;
          margin-top: 10px;
        }
      }
    }
  }
}

.goods-tabs {
  min-height: 600px;
  background: #fff;

  nav {
    height: 70px;
    line-height: 70px;
    display: flex;
    border-bottom: 1px solid #f5f5f5;

    a, span {
      padding: 0 40px;
      font-size: 18px;
      position: relative;

      &>span {
        color: $priceColor;
        font-size: 16px;
        margin-left: 10px;
      }
    }
  }
}

.goods-detail {
  padding: 40px;

  .attrs {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 30px;

    li {
      display: flex;
      margin-bottom: 10px;
      width: 50%;

      .dt {
        width: 100px;
        color: #999;
      }

      .dd {
        flex: 1;
        color: #666;
      }
    }
  }

  &>img {
    width: 100%;
  }
}

.btn {
  margin-top: 20px;

}

.bread-container {
  padding: 25px 0;
}
</style>
