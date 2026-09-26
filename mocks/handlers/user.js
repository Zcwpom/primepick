import { http } from 'msw'
import { apiPath, fixture, jsonFail, jsonOk, mockDelay } from '../utils'

/**
 * 本地演示账号（README 里公开）。
 * 必须与登录页预填值（src/views/Login/index.vue 的 DEMO_ACCOUNT）保持一致 ——
 * 冒烟脚本里有一条断言专门盯着这对凭据能不能真的登上。
 */
const MOCK_ACCOUNT = { account: 'demo', password: '123456' }

export const userHandlers = [
  http.post(apiPath('/login'), async ({ request }) => {
    await mockDelay()
    const { account, password } = (await request.json().catch(() => ({}))) || {}

    if (account !== MOCK_ACCOUNT.account || password !== MOCK_ACCOUNT.password) {
      return jsonFail('用户名或密码错误', { code: '10014' })
    }

    const user = fixture('login')?.result ?? {}
    // 抓取下来的 fixture 里带着抓取时刻的真实 token（会过期，也不该进仓库），
    // 这里换成 mock token：mock 层只校验是否携带 Authorization，不校验内容
    return jsonOk({ ...user, token: `mock-token-${Date.now()}` })
  }),
]
