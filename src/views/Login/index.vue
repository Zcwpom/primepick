<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/theme-chalk/el-message.css'
import { useUserStore } from '@/stores/userStore'
import { useCartStore } from '@/stores/cartStore'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const formRef = ref(null)
const loginMode = ref('password') // password | sms

// 测试账号列表
const testAccounts = [
  { label: '测试1', account: '1311111111', password: '123456' },
]

const userInfo = ref({
  account: '1311111111',
  password: '123456',
  agree: true
})

const selectAccount = (acc) => {
  userInfo.value.account = acc.account
  userInfo.value.password = acc.password
}

const rules = {
  account: [
    { required: true, message: '请输入账号' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, max: 24, message: '密码长度要求6-14个字符' }
  ],
  agree: [
    {
      validator: (rule, val, callback) => {
        return val ? callback() : new Error('请先同意协议')
      }
    }
  ]
}

const doLogin = () => {
  const { account, password } = userInfo.value
  formRef.value.validate(async (valid) => {
    if (!valid) return
    await userStore.getUserInfo({ account, password })
    await cartStore.mergeLocalCart()
    ElMessage({ type: 'success', message: '登录成功' })
    const redirectUrl = route.query.redirectUrl || '/'
    router.replace(redirectUrl)
  })
}
</script>

<template>
  <div class="login-page">
    <!-- 顶栏 -->
    <header class="login-header">
      <div class="header-inner">
        <RouterLink to="/" class="login-logo">PrimePick</RouterLink>
        <RouterLink to="/" class="to-home">进入网站首页</RouterLink>
      </div>
    </header>

    <!-- 登录卡片 -->
    <section class="login-body">
      <div class="login-card">
        <!-- 左侧：扫码 -->
        <div class="card-left">
          <div class="qrcode-area">
            <div class="qrcode-img">
              <img src="@/assets/images/qrcode.jpg" alt="扫码登录" />
            </div>
            <h3 class="qrcode-title">手机扫码登录</h3>
            <p class="qrcode-desc">请使用手机APP扫码登录</p>
          </div>
        </div>

        <!-- 右侧：表单 -->
        <div class="card-right">
          <!-- 选项卡 -->
          <div class="tab-nav">
            <span
              class="tab-item"
              :class="{ active: loginMode === 'password' }"
              @click="loginMode = 'password'"
            >密码登录</span>
            <span class="tab-divider">|</span>
            <span
              class="tab-item"
              :class="{ active: loginMode === 'sms' }"
              @click="loginMode = 'sms'"
            >短信登录</span>
          </div>

          <!-- 密码登录表单 -->
          <el-form
            v-show="loginMode === 'password'"
            ref="formRef"
            :model="userInfo"
            :rules="rules"
            class="login-form"
          >
            <el-form-item prop="account">
              <el-input
                v-model="userInfo.account"
                placeholder="请输入账号"
                size="large"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="userInfo.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
              />
              <div class="field-link">
                <a href="javascript:;" class="forgot-pwd">忘记密码</a>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" size="large" class="login-btn" @click="doLogin">
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 短信登录（占位） -->
          <div v-show="loginMode === 'sms'" class="sms-placeholder">
            <p>短信登录功能开发中</p>
          </div>

          <!-- 快捷测试账号 -->
          <div class="test-accounts">
            <span class="test-label">测试账号：</span>
            <span
              v-for="acc in testAccounts"
              :key="acc.account"
              class="test-chip"
              @click="selectAccount(acc)"
            >
              {{ acc.label }}
            </span>
          </div>

          <!-- 底部链接 -->
          <div class="bottom-links">
            <a href="javascript:;" class="link">忘记账号</a>
            <span class="link-divider">|</span>
            <a href="javascript:;" class="link">免费注册</a>
          </div>

          <!-- 协议勾选 -->
          <el-form>
            <el-form-item prop="agree">
              <el-checkbox v-model="userInfo.agree" size="small">
                <span class="agree-text">我已同意</span>
                <a href="javascript:;" class="agree-link">隐私条款</a>
                <span class="agree-text">和</span>
                <a href="javascript:;" class="agree-link">服务条款</a>
              </el-checkbox>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </section>

    <!-- 页脚 -->
    <footer class="login-footer">
      <p>CopyRight &copy; PrimePick</p>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  background: #F0EDE8;
  display: flex;
  flex-direction: column;
}

/* 顶栏 */
.login-header {
  background: #fff;
  border-bottom: 1px solid #EDE9E4;

  .header-inner {
    width: 1240px;
    margin: 0 auto;
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.login-logo {
  font-size: 24px;
  font-weight: 700;
  color: $xtxColor;
  letter-spacing: 4px;
  font-family: 'Noto Serif SC', serif;
  text-decoration: none;
}

.to-home {
  font-size: 14px;
  color: #666;
  text-decoration: none;

  &:hover {
    color: $xtxColor;
  }
}

/* 登录卡片 */
.login-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.login-card {
  display: flex;
  width: 800px;
  min-height: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.card-left {
  width: 300px;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qrcode-area {
  text-align: center;
  padding: 40px 20px;
}

.qrcode-img {
  width: 160px;
  height: 160px;
  margin: 0 auto 20px;
  padding: 8px;
  border: 1px solid #EDE9E4;
  border-radius: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.qrcode-title {
  font-size: 16px;
  color: #2C2C2C;
  margin: 0 0 6px;
  font-weight: 500;
  letter-spacing: 1px;
}

.qrcode-desc {
  font-size: 13px;
  color: #8C8C8C;
  margin: 0;
  line-height: 1.5;
}

.card-right {
  flex: 1;
  padding: 36px 48px 24px;
}

/* 选项卡 */
.tab-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0EDE8;
}

.tab-item {
  font-size: 16px;
  color: #8C8C8C;
  cursor: pointer;
  letter-spacing: 1px;
  transition: color 0.2s;

  &.active {
    color: $xtxColor;
    font-weight: 500;
  }

  &:hover {
    color: $xtxColor;
  }
}

.tab-divider {
  color: #ddd;
  font-size: 14px;
}

/* 表单 */
.login-form {
  :deep(.el-input__wrapper) {
    border-radius: 4px;
    box-shadow: 0 0 0 1px #E8E4DF inset;
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: 0 0 0 1px $xtxColor inset;
    }
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px $xtxColor inset;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }
}

.field-link {
  text-align: right;
  margin-top: 4px;
}

.forgot-pwd {
  font-size: 13px;
  color: #999;
  text-decoration: none;

  &:hover {
    color: $xtxColor;
  }
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 2px;
  border-radius: 4px;
  margin-top: 8px;
}

/* 短信登录占位 */
.sms-placeholder {
  padding: 40px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 测试账号 */
.test-accounts {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0 16px;
}

.test-label {
  font-size: 12px;
  color: #999;
}

.test-chip {
  font-size: 12px;
  color: $xtxColor;
  cursor: pointer;
  padding: 2px 10px;
  border: 1px solid $xtxColor;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: $xtxColor;
    color: #fff;
  }
}

/* 底部链接 */
.bottom-links {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 16px 0 20px;
}

.link {
  font-size: 13px;
  color: #666;
  text-decoration: none;

  &:hover {
    color: $xtxColor;
  }
}

.link-divider {
  color: #ddd;
  font-size: 12px;
}

/* 协议勾选 */
.agree-text {
  font-size: 12px;
  color: #999;
}

.agree-link {
  font-size: 12px;
  color: $xtxColor;
  text-decoration: none;
  margin: 0 2px;

  &:hover {
    text-decoration: underline;
  }
}

/* 页脚 */
.login-footer {
  text-align: center;
  padding: 20px 0 30px;

  p {
    color: #999;
    font-size: 13px;
    margin: 0;
  }
}
</style>
