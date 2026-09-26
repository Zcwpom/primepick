<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { addAddressAPI, editAddressAPI } from '@/apis/address'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  /** 编辑模式时传入的地址数据 */
  address: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const formData = ref({
  receiver: '',
  contact: '',
  province: '',
  city: '',
  county: '',
  address: '',
  isDefault: false
})

const title = ref('新增收货地址')

// 编辑模式：回填数据
watch(() => props.address, (val) => {
  if (val) {
    title.value = '编辑收货地址'
    formData.value = {
      receiver: val.receiver || '',
      contact: val.contact || '',
      province: val.province || '',
      city: val.city || '',
      county: val.county || '',
      address: val.address || '',
      isDefault: val.isDefault || false
    }
  } else {
    title.value = '新增收货地址'
    formData.value = {
      receiver: '',
      contact: '',
      province: '',
      city: '',
      county: '',
      address: '',
      isDefault: false
    }
  }
}, { immediate: true })

const rules = {
  receiver: [
    { required: true, message: '请输入收货人姓名' }
  ],
  contact: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
  ],
  address: [
    { required: true, message: '请输入详细地址' }
  ]
}

const visible = ref(false)
watch(() => props.modelValue, (val) => {
  visible.value = val
})
watch(() => visible.value, (val) => {
  emit('update:modelValue', val)
})

const loading = ref(false)

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const payload = {
      ...formData.value,
      fullLocation: `${formData.value.province} ${formData.value.city} ${formData.value.county}`
    }

    if (props.address?.id) {
      await editAddressAPI(props.address.id, payload)
      ElMessage.success('地址修改成功')
    } else {
      await addAddressAPI(payload)
      ElMessage.success('地址添加成功')
    }

    visible.value = false
    emit('success')
  } catch {
    // 全局 http 拦截器已处理错误提示
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="right"
    >
      <el-form-item label="收货人" prop="receiver">
        <el-input v-model="formData.receiver" placeholder="请输入收货人姓名" />
      </el-form-item>

      <el-form-item label="手机号" prop="contact">
        <el-input v-model="formData.contact" placeholder="请输入手机号" maxlength="11" />
      </el-form-item>

      <el-form-item label="所在地区">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-input v-model="formData.province" placeholder="省" />
          </el-col>
          <el-col :span="8">
            <el-input v-model="formData.city" placeholder="市" />
          </el-col>
          <el-col :span="8">
            <el-input v-model="formData.county" placeholder="区/县" />
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="详细地址" prop="address">
        <el-input
          v-model="formData.address"
          type="textarea"
          :rows="2"
          placeholder="街道、楼牌号、门牌号等"
        />
      </el-form-item>

      <el-form-item label="默认地址">
        <el-switch v-model="formData.isDefault" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submitForm">
        {{ loading ? '保存中...' : '保存' }}
      </el-button>
    </template>
  </el-dialog>
</template>
