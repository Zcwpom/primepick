<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cartStore'
const router = useRouter()
const cartStore = useCartStore()

const searchKeyword = ref('')

const doSearch = () => {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  router.push({ path: '/search', query: { keyword: kw } })
}

const onKeyEnter = (e) => {
  if (e.key === 'Enter') doSearch()
}
</script>

<template>
  <header class='app-header'>
    <!-- 第一行：促销信息 -->
    <div class="header-top">
      <div class="container">
        <div class="promo-bar">
          <span class="promo-item">
            <i class="iconfont icon-icon-test"></i>
            满99元包邮
          </span>
          <span class="promo-divider">|</span>
          <span class="promo-item">
            🔥
            限时秒杀 每天10点开抢
          </span>
          <span class="promo-divider">|</span>
          <span class="promo-item">
            🎉
            新人专享 首单立减20
          </span>
          <span class="promo-divider">|</span>
          <span class="promo-item">
            📱
            下载APP领5元红包
          </span>
          <span class="promo-divider">|</span>
          <span class="promo-item">
            💰
            会员专享价 折上9.5折
          </span>
          <span class="promo-divider">|</span>
          <span class="promo-item">
            💳
            分期免息 3期0手续费
          </span>
        </div>
        <div class="cart">
          <a class="curr" href="javascript:;">
            <i class="iconfont icon-cart"></i><em>{{ cartStore.allCount }}</em>
          </a>
          <div class="layer">
            <div class="list">
              <div class="item" v-for="i in cartStore.cartList" :key="i.skuId">
                <RouterLink :to="'/detail/' + i.skuId">
                  <img :src="i.picture" alt="" />
                  <div class="center">
                    <p class="name ellipsis-2">{{ i.name }}</p>
                    <p class="attr ellipsis">{{ i.attrsText }}</p>
                  </div>
                  <div class="right">
                    <p class="price">&yen;{{ i.nowPrice }}</p>
                    <p class="count">x{{ i.count }}</p>
                  </div>
                </RouterLink>
                <i class="iconfont icon-close-new" @click="cartStore.delCart(i.skuId)"></i>
              </div>
            </div>
            <div class="foot">
              <div class="total">
                <p>共 {{ cartStore.allCount }} 件商品</p>
                <p>&yen; {{ cartStore.allPrice.toFixed(2) }}</p>
              </div>
              <el-button size="large" type="primary" @click="$router.push('/cartlist')">去购物车结算</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 第二行：Logo + 搜索栏 -->
    <div class="header-bottom">
      <div class="container">
        <h1 class="logo">
          <RouterLink to="/">
            <span class="logo-main">优品购</span>
            <span class="logo-tagline">PrimePick</span>
          </RouterLink>
        </h1>
        <div class="search">
          <!-- aria-label：Element Plus 的 inner input 不会从 placeholder 得到可访问名。
               placeholder 只是视觉提示，读屏软件读不到（Lighthouse 的 label 审计项） -->
          <el-select class="search-select" placeholder="全部" size="large" aria-label="选择搜索分类">
            <el-option label="全部" value="all" />
          </el-select>
          <input v-model="searchKeyword" type="text" placeholder="搜一搜" aria-label="搜索商品" @keydown="onKeyEnter">
          <button class="search-btn" @click="doSearch">搜索</button>
        </div>
      </div>
    </div>
  </header>
</template>


<style scoped lang='scss'>
.app-header {
  background: linear-gradient(180deg, #E8E0D5 0%, #fff 100%);

  .header-top {
    height: 36px;

    .container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      position: relative;
    }
  }

  .promo-bar {
    display: flex;
    align-items: center;
    gap: 0;
    font-size: 13px;
    color: #666;
  }

  .promo-item {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;

    i {
      font-size: 14px;
    }
  }

  .promo-divider {
    color: #E0DCD7;
    margin: 0 14px;
    font-size: 12px;
  }

  .header-bottom {
    padding: 12px 0;

    .container {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .search {
      flex: 1;
      max-width: 1000px;
    }
  }

  .logo {
    flex-shrink: 0;

    a {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 40px;
      text-decoration: none;

      .logo-main {
        font-size: 26px;
        font-weight: 700;
        color: $xtxColor;
        letter-spacing: 6px;
        font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', SimSun, serif;
        line-height: 1.2;
      }

      .logo-tagline {
        font-size: 12px;
        color: #333;
        letter-spacing: 4px;
        line-height: 1;
        margin-top: 2px;
      }
    }
  }

  .app-header-nav {
    width: auto;
    display: flex;
    padding: 0;
    position: relative;
    z-index: 998;

    li {
      margin-right: 48px;
      width: auto;
      text-align: center;
      position: relative;
      padding-bottom: 16px;

      a {
        font-size: 15px;
        line-height: 28px;
        height: 28px;
        display: inline-block;

        &:hover {
          color: $xtxColor;
          border-bottom: 1px solid $xtxColor;
        }
      }

      .active {
        color: $xtxColor;
        border-bottom: 1px solid $xtxColor;
      }

      // 下拉分类面板
      .nav-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 999;
        padding-top: 8px;
        opacity: 0;
        animation: fadeIn 0.2s ease forwards;
      }

      .dropdown-inner {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        padding: 8px 0;
        min-width: 100px;
      }

      .dropdown-item {
        display: block;
        padding: 6px 20px;
        text-decoration: none;
        color: #555;
        font-size: 14px;
        text-align: left;
        white-space: nowrap;
        transition: all 0.15s ease;

        &:hover {
          color: $xtxColor;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    }
  }

  .search {
    display: flex;
    align-items: center;
    height: 40px;
    border: 2px solid $xtxColor;
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.3s;

    &:focus-within {
      border-color: color.adjust($xtxColor, $lightness: -10%);
    }

    .search-select {
      width: 80px;
      border: none;
      border-radius: 0;

      :deep(.el-input__wrapper) {
        background: #F8F6F3;
        border-radius: 0;
        box-shadow: none;
        border-right: 1px solid #E8E4DF;
      }

      :deep(.el-input__inner) {
        font-size: 13px;
        color: #555;
      }
    }

    input {
      flex: 1;
      height: 100%;
      border: none;
      padding: 0 12px;
      color: #333;
      font-size: 14px;
      outline: none;
      min-width: 200px;

      &::placeholder {
        color: #bbb;
      }
    }

    .search-btn {
      height: 100%;
      padding: 0 20px;
      background: $xtxColor;
      color: #fff;
      border: none;
      font-size: 15px;
      letter-spacing: 2px;
      cursor: pointer;
      transition: background 0.3s;

      &:hover {
        background: color.adjust($xtxColor, $lightness: -10%);
      }
    }
  }

  .cart {
    width: 50px;
    position: relative;
    z-index: 600;
    position: absolute;
    right: 0;

    .curr {
      height: 28px;
      line-height: 28px;
      text-align: center;
      position: relative;
      display: block;

      .icon-cart {
        font-size: 22px;
        color: #555;
        transition: color 0.3s;
      }

      &:hover .icon-cart {
        color: $xtxColor;
      }

      em {
        font-style: normal;
        position: absolute;
        right: 0;
        top: 0;
        padding: 1px 6px;
        line-height: 1;
        background: $helpColor;
        color: #fff;
        font-size: 12px;
        border-radius: 10px;
        font-family: Arial;
      }
    }

    &:hover {
      .layer {
        opacity: 1;
        transform: none;
      }
    }

    .layer {
      opacity: 0;
      transition: all 0.4s 0.2s;
      transform: translateY(-200px) scale(1, 0);
      width: 400px;
      height: 400px;
      position: absolute;
      top: 50px;
      right: 0;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
      background: #fff;
      border-radius: 4px;
      padding-top: 10px;

      &::before {
        content: "";
        position: absolute;
        right: 14px;
        top: -10px;
        width: 20px;
        height: 20px;
        background: #fff;
        transform: scale(0.6, 1) rotate(45deg);
        box-shadow: -3px -3px 5px rgba(0, 0, 0, 0.1);
      }

      .foot {
        position: absolute;
        left: 0;
        bottom: 0;
        height: 70px;
        width: 100%;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        background: #f8f8f8;
        align-items: center;

        .total {
          padding-left: 10px;
          color: #999;

          p {
            &:last-child {
              font-size: 18px;
              color: $priceColor;
            }
          }
        }
      }
    }

    .list {
      height: 310px;
      overflow: auto;
      padding: 0 10px;

      &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      &::-webkit-scrollbar-track {
        background: #f8f8f8;
        border-radius: 2px;
      }

      &::-webkit-scrollbar-thumb {
        background: #eee;
        border-radius: 10px;
      }

      &::-webkit-scrollbar-thumb:hover {
        background: #ccc;
      }

      .item {
        border-bottom: 1px solid #f5f5f5;
        padding: 10px 0;
        position: relative;

        i {
          position: absolute;
          bottom: 38px;
          right: 0;
          opacity: 0;
          color: #666;
          transition: all 0.5s;
        }

        &:hover {
          i {
            opacity: 1;
            cursor: pointer;
          }
        }

        a {
          display: flex;
          align-items: center;

          img {
            height: 80px;
            width: 80px;
          }

          .center {
            padding: 0 10px;
            width: 200px;

            .name {
              font-size: 16px;
            }

            .attr {
              color: #999;
              padding-top: 5px;
            }
          }

          .right {
            width: 100px;
            padding-right: 20px;
            text-align: center;

            .price {
              font-size: 16px;
              color: $priceColor;
            }

            .count {
              color: #999;
              margin-top: 5px;
              font-size: 16px;
            }
          }
        }
      }
    }
  }
}
</style>
