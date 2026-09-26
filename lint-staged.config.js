// lint-staged：只检查本次提交涉及的文件，避免每次 commit 全量 lint
// 与 .husky/pre-commit 配合，构成「提交即门禁」
export default {
  // JS / Vue 源码：ESLint（含 vue 插件）与 oxlint 双跑
  // oxlint 不做格式化，只做规则检查，两者职责不重叠
  '*.{js,mjs,cjs,vue}': ['eslint --fix --cache', 'oxlint --fix'],
}
