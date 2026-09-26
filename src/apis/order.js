import request from '@/utils/http'

/**
 * 订单相关接口（原先 getOrderAPI 放在 apis/pay.js 里，按业务域归位到这里）
 */

/**
 * 获取用户订单列表
 * @param {object} params { orderState, page, pageSize }
 */
export const getUserOrder = (params) => {
  return request({
    url: '/member/order',
    method: 'GET',
    params
  })
}

/**
 * 获取订单详情
 * @param {string|number} id 订单 id
 */
export const getOrderAPI = (id) => {
  return request({
    url: `/member/order/${id}`
  })
}

/**
 * 支付订单
 * 真实环境由支付网关回调驱动，前端调用后需要**轮询订单状态**确认结果
 * @param {string|number} id 订单 id
 * @param {object} data { payChannel } 用户选择的支付渠道
 */
export const payOrderAPI = (id, data = {}) => {
  return request({
    url: `/member/order/${id}/pay`,
    method: 'POST',
    data
  })
}

/**
 * 取消订单（仅待付款状态可用）
 * @param {string|number} id 订单 id
 */
export const cancelOrderAPI = (id) => {
  return request({
    url: `/member/order/${id}/cancel`,
    method: 'POST'
  })
}

/**
 * 确认收货（仅待收货状态可用）
 * @param {string|number} id 订单 id
 */
export const receiveOrderAPI = (id) => {
  return request({
    url: `/member/order/${id}/receive`,
    method: 'POST'
  })
}
