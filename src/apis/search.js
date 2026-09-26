import request from '@/utils/http'

/**
 * 商品搜索
 * @param {object} params - 搜索参数
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} params.sortField - 排序字段: publishTime | orderNum | evaluateNum
 * @returns {Promise}
 */
export const getSearchAPI = (params) => {
  return request({
    url: '/category/goods/temporary',
    method: 'POST',
    data: {
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      sortField: params.sortField || 'publishTime',
      keyword: params.keyword || ''
    }
  })
}

/**
 * 搜索建议（后续接入真实API时可启用）
 */
// export const getSearchSuggestAPI = (keyword) => {
//   return request({
//     url: '/search/suggest',
//     params: { keyword }
//   })
// }
