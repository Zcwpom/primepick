<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAddressListAPI, delAddressAPI } from '@/apis/address'
import AddressForm from './AddressForm.vue'

const addressList = ref([])
const loading = ref(false)

const showForm = ref(false)
const currentAddress = ref(null)

/** 获取地址列表 */
const getAddressList = async () => {
  loading.value = true
  try {
    const res = await getAddressListAPI()
    addressList.value = res.result || []
  } catch {
    addressList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => getAddressList())

/** 新增地址 */
const onAddAddress = () => {
  currentAddress.value = null
  showForm.value = true
}

/** 编辑地址 */
const onEditAddress = (item) => {
  currentAddress.value = item
  showForm.value = true
}

/** 删除地址 */
const onDelAddress = async (item) => {
  try {
    await ElMessageBox.confirm('确认删除该收货地址？', '提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    await delAddressAPI(item.id)
    ElMessage.success('删除成功')
    getAddressList()
  } catch {
    // 取消删除不做处理
  }
}

/** 表单提交成功回调 */
const onFormSuccess = () => {
  getAddressList()
}

/** 设置默认地址 */
const onSetDefault = async (item) => {
  // 实际项目中会调用API设置默认
  // 这里简单处理UI
  addressList.value.forEach(addr => {
    addr.isDefault = addr.id === item.id
  })
  ElMessage.success('已设为默认地址')
}
</script>

<template>
  <div class="address-page">
    <div class="page-header">
      <h3>收货地址</h3>
      <el-button type="primary" @click="onAddAddress">新增地址</el-button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- 地址列表 -->
    <div v-else-if="addressList.length" class="address-list">
      <div
        v-for="item in addressList"
        :key="item.id"
        class="address-card"
        :class="{ 'is-default': item.isDefault }"
      >
        <div class="address-info">
          <div class="info-top">
            <span class="receiver">{{ item.receiver }}</span>
            <span class="contact">{{ item.contact }}</span>
            <el-tag v-if="item.isDefault" type="success" size="small">默认</el-tag>
          </div>
          <div class="address-detail">
            {{ item.fullLocation }} {{ item.address }}
          </div>
        </div>
        <div class="address-actions">
          <el-button
            v-if="!item.isDefault"
            text
            type="primary"
            size="small"
            @click="onSetDefault(item)"
          >
            设为默认
          </el-button>
          <el-button text type="primary" size="small" @click="onEditAddress(item)">
            编辑
          </el-button>
          <el-button text type="danger" size="small" @click="onDelAddress(item)">
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-else description="暂无收货地址，去添加一个吧">
      <el-button type="primary" @click="onAddAddress">新增地址</el-button>
    </el-empty>

    <!-- 新增/编辑地址弹窗 -->
    <AddressForm
      v-model="showForm"
      :address="currentAddress"
      @success="onFormSuccess"
    />
  </div>
</template>

<style scoped lang="scss">
.address-page {
  padding: 20px 30px;
  min-height: 400px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-size: 20px;
      font-weight: normal;
    }
  }

  .loading-container {
    padding: 40px;
  }

  .address-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .address-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      border-color: $xtxColor;
      box-shadow: 0 2px 8px rgba($xtxColor, 0.1);
    }

    &.is-default {
      background: #f0faf7;
      border-color: $xtxColor;
    }

    .address-info {
      flex: 1;

      .info-top {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;

        .receiver {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .contact {
          color: #666;
        }
      }

      .address-detail {
        color: #999;
        font-size: 14px;
      }
    }

    .address-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }
}
</style>
