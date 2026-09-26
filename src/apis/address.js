import request from '@/utils/http'

/**
 * 获取收货地址列表
 */
export const getAddressListAPI = () => {
  return request({
    url: '/member/address'
  })
}

/**
 * 新增收货地址
 * @param {object} data - 地址信息
 */
export const addAddressAPI = (data) => {
  return request({
    url: '/member/address',
    method: 'POST',
    data
  })
}

/**
 * 编辑收货地址
 * @param {string|number} id - 地址ID
 * @param {object} data - 地址信息
 */
export const editAddressAPI = (id, data) => {
  return request({
    url: `/member/address/${id}`,
    method: 'PUT',
    data
  })
}

/**
 * 删除收货地址
 * @param {string|number} id - 地址ID
 */
export const delAddressAPI = (id) => {
  return request({
    url: `/member/address/${id}`,
    method: 'DELETE'
  })
}
