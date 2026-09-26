import { cartHandlers } from './cart'
import { categoryHandlers } from './category'
import { goodsHandlers } from './goods'
import { homeHandlers } from './home'
import { memberHandlers } from './member'
import { userHandlers } from './user'

/**
 * mock 接口总表
 *
 * 覆盖 src/apis 下全部接口（约 20 个端点），
 * 同一路径不同方法（如 /member/cart 的 GET/POST/DELETE）由 MSW 按 method 区分。
 */
export const handlers = [
  ...homeHandlers,
  ...categoryHandlers,
  ...goodsHandlers,
  ...userHandlers,
  ...cartHandlers,
  ...memberHandlers,
]
