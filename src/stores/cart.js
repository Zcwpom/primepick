// 封装购物车模块

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './user'
import { insertCartAPI, getCartListAPI, delCartAPI } from '@/apis/cart'


export const useCartStore = defineStore('cart', () => {
  const userStore = useUserStore()
  const isLogin = computed(() => userStore.userInfo.token)

  // 1. 定义state - cartList
  const cartList = ref([])
  // 2. 定义action - addCart
  const addCart = async (goods) => {
    const { skuId, count } = goods
    if (isLogin.value) {
      // 登录之后的加入购物车逻辑
      await insertCartAPI({ skuId, count })
      updateNewList()
    } else {
      // 未登录
      const item = cartList.value.find((item) => goods.skuId === item.skuId)
      if (item) {
        item.count++
      } else {
        cartList.value.push({ ...goods, count: goods.count || 1, selected: true })
      }
    }
  }
  // 获取最新购物车列表
  const updateNewList = async () => {
    const res = await getCartListAPI()
    cartList.value = res.result
  }
  // 删除购物车
  const delCart = async (skuId) => {
    if (isLogin.value) {
      await delCartAPI([skuId])
      updateNewList()
    } else {
      const idx = cartList.value.findIndex((item) => skuId === item.skuId)
      cartList.value.splice(idx, 1)
    }
  }
  // 单选功能
  const singleCheck = (skuId, selected) => {
    const item = cartList.value.find((item) => item.skuId === skuId)
    item.selected = selected
  }
  // 全选功能
  const allCheck = (selected) => {
    cartList.value.forEach(item => item.selected = selected)
  }
  // 是否全选
  const isAll = computed(() => cartList.value.every((item) => item.selected))
  // 商品总数
  const allCount = computed(() => cartList.value.reduce((sum, item) => sum + item.count, 0))
  // 总金额
  const allPrice = computed(() => cartList.value.reduce((sum, item) => sum + item.nowPrice * item.count, 0))
  // 已选择数量
  const selectedCount = computed(() => cartList.value.filter(item => item.selected).reduce((a, c) => a + c.count, 0))
  // 已选择商品价钱合计
  const selectedPrice = computed(() => cartList.value.filter(item => item.selected).reduce((a, c) => a + c.count * c.nowPrice, 0))
  return {
    cartList,
    addCart,
    delCart,
    singleCheck,
    allCheck,
    isAll,
    allCount,
    allPrice,
    selectedCount,
    selectedPrice
  }
}, {
  persist: true,
})
