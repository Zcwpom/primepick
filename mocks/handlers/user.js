import { http } from 'msw'
import { apiPath, fixture, jsonFail, jsonOk, mockDelay } from '../utils'

/** 登录：README 里公开的本地演示账号 */
const MOCK_ACCOUNT = { account: 'xiaotuxian001', password: '123456' }

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
