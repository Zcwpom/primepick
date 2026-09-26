import request from '@/utils/http'

/**
 * 获取用户订单列表
 * @param {*} params { orderState, page, pageSize }
 */
export const getUserOrder = (params) => {
  return request({
    url: '/member/order',
    method: 'GET',
    params
  })
}
