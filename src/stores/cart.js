// 封装购物车模块

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'


export const useCartStore = defineStore('cart', () => {
  // 1. 定义state - cartList
  const cartList = ref([])
  // 2. 定义action - addCart
  const addCart = (goods) => {
    console.log('添加', goods)
    // 添加购物车操作
    // 已添加过 - count + 1
    // 没有添加过 - 直接push
    // 思路：通过匹配传递过来的商品对象中的skuId能不能在cartList中找到，找到了就是添加过
    const item = cartList.value.find((item) => goods.skuId === item.skuId)
    if (item) {
      // 找到了
      item.count++
    } else {
      // 没找到 - 直接push，使用传入的count或默认为1
      cartList.value.push({ ...goods, count: goods.count || 1, selected: true })
    }
  }
  // 删除购物车
  const delCart = (skuId) => {
    const idx = cartList.value.findIndex((item) => skuId === item.skuId)
    cartList.value.splice(idx, 1)
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
