<script setup>
import { ref } from 'vue'
import { useCartStore } from '@/stores/cartStore'

const props = defineProps({
  goods: {
    type: Object,
    default: () => ({})
  }
})

const cartStore = useCartStore()
const count = ref(1)

const addCart = () => {
  cartStore.addCart({
    skuId: props.goods.id,
    name: props.goods.name,
    picture: props.goods.picture,
    price: props.goods.price,
    nowPrice: props.goods.price,
    count: count.value
  })
}
</script>


<template>
  <div class="goods-item">
    <RouterLink :to="'/detail/' + goods.id" class="goods-link">
      <img v-img-lazy="goods.picture" alt="" />
      <p class="name ellipsis">{{ goods.name }}</p>
      <p class="desc ellipsis">{{ goods.desc }}</p>
      <p class="price">&yen;{{ goods.price }}</p>
    </RouterLink>
    <div class="cart">
      <el-input-number v-model="count" :min="1" :max="99" size="small" />
      <el-button type="primary" size="small" @click="addCart">加入购物车</el-button>
    </div>
  </div>
</template>


<style scoped lang='scss'>
.goods-item {
      display: block;
      width: 220px;
      padding: 20px 30px;
      text-align: center;
      transition: all .5s;

      &:hover {
        transform: translate3d(0, -3px, 0);
        box-shadow: 0 3px 8px rgb(0 0 0 / 20%);
      }

      .goods-link {
        display: block;
      }

      img {
        width: 160px;
        height: 160px;
      }

      p {
        padding-top: 10px;
      }

      .name {
        font-size: 16px;
      }

      .desc {
        color: #999;
        height: 29px;
      }

      .price {
        color: $priceColor;
        font-size: 20px;
      }

      .cart {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
    }
</style>
