// 提交信息规范：Conventional Commits
// 例：feat(cart): 支持未登录购物车与本地合并
//     fix(pay): 修正倒计时归零后出现负数时间
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 中文提交主题没有大小写概念，关闭大小写校验，其余沿用 conventional 规范
    'subject-case': [0],
    // 提交标题上限放宽到 100，兼容「type(scope): 中文描述」的常见长度
    'header-max-length': [2, 'always', 100],
  },
}
