# 迭代 1 报告：止血 + 门面

> 目标：让项目「可被看见、可被信任」。做完这一轮，面试官点开仓库能立刻看到绿色 CI、可访问的线上地址、以及有数据支撑的性能优化。
>
> 状态：**已完成并复核通过**（lint 0 error / 0 warning，build 通过，首屏体积在预算内）

---

## 一、量化结果

| 指标 | 改动前 | 改动后 | 变化 |
| --- | ---: | ---: | ---: |
| ESLint | 11 errors | **0** | 归零 |
| oxlint | 1 error + 7 warnings | **0 / 0** | 归零 |
| 首屏 JS（gzip） | 174.89 kB | **121.70 kB** | −30% |
| 首屏 CSS（gzip） | 33.70 kB | **14.32 kB** | −58% |
| 首屏合计（gzip） | 208.59 kB | **136.01 kB** | −35% |
| 最大单 chunk | 506.67 kB（Vite 告警） | **80.86 kB** | 告警消失 |
| 产物数量 | 1 JS + 1 CSS | **64 个 chunk** | 按需加载 |
| 生产构建耗时 | 14.60 s | **3.58 s** | −75% |
| 未使用的源文件/资源 | 10 个 | **0** | 清理完毕 |

复核命令与结果：

```
npm run lint   → Found 0 warnings and 0 errors.        exit 0
npm run build  → ✓ built in 3.58s                      exit 0（无 chunk 体积告警）
npm run size   → ✓ 首屏体积在预算内                     exit 0
```

---

## 二、修掉的真实缺陷

这一轮不只是「加配置」，顺手挖出了 6 个真实问题，全部可在 git diff 里核对：

| # | 问题 | 位置 | 说明 |
| --- | --- | --- | --- |
| 1 | **ESLint 配置顺序导致规则失效** | `eslint.config.js` | flat config 是「后者覆盖前者」，自定义 `rules` 写在了 `js.configs.recommended` / `pluginVue.configs` **之前**，于是 `vue/multi-word-component-names: 0` 被覆盖回默认值 → 5 个页面文件持续报错。同时补上了 `eslint.config.js` 引用但**根本不存在的** `.oxlintrc.json`，`npm run lint` 由此恢复可信 |
| 2 | **幽灵依赖（phantom dependency）** | `package.json` | 源码 `import dayjs from 'dayjs'`，但 `dayjs` 从未声明为依赖，只是被 `element-plus` 提升到 `node_modules` 顶层才侥幸能跑。换成 pnpm 严格解析或 element-plus 升级后立刻崩 |
| 3 | **自定义指令注册晚于挂载** | `src/main.js` | `app.use(lazyPlugin)` 原先写在 `app.mount('#app')` **之后**。`v-img-lazy` 在 GoodsItem / HomeHero / HomeHot 三处在用，Vue 首次渲染就要解析该指令，属于随时会炸的隐患 |
| 4 | **未使用表达式 + 定时器泄漏** | `src/views/Pay/composables/useCountDown.js` | `timer && clearInterval(timer)` 是 `no-unused-expressions` 违规；且 `start()` 不清理旧定时器（重复调用会泄漏）、倒计时会一直减到负数。已改为 `stop()` 统一收口 + 归零自动停止 |
| 5 | **变量遮蔽 + 拼写错误** | `UserOrder.vue` / `cartStore.js` / `XtxSku/index.vue` | `stateMap` 内外层同名遮蔽（语义完全不同）、`sku =>` / `item =>` 回调参数遮蔽外层变量、`fomartPayState` 拼写错误（已随重命名改为 `formatPayState`） |
| 6 | **Element Plus 全量引入？—— 假设被证伪** | 构建产物 | 原本怀疑 209 kB 的 CSS 是全量引入导致。实测产物里只包含**实际用到**的组件类名（按需引入是正常的），真正的体积大头是 `el-row/el-col` 栅格：**751 条规则、约 36 kB，而全项目只有地址表单一处使用**。<br>结论：不做「伪优化」，改用路由懒加载让这块 CSS 只在地址页加载 |

---

## 三、改动清单

### 1. 工程质量门禁

| 文件 | 内容 |
| --- | --- |
| `eslint.config.js` | 修正配置顺序；页面文件（`src/views/**/*.vue`）关闭多词组件名规则，`src/components/**` 保持强制；新增 Node 上下文文件（`scripts/**`、`*.config.js`）的 globals |
| `.oxlintrc.json` | **新增**（原先被引用但不存在）。`correctness: error` + `suspicious: warn`；`perf` 类规则（如 `no-map-spread`）出于「微优化噪声」考虑未开启，性能以体积/Lighthouse 数据为准 |
| `package.json` | `lint` 改为**只检查不修改**（CI 安全），修复动作拆到 `lint:fix`；新增 `size` 脚本；`dayjs` 补进 dependencies；新增 `prepare: husky` |
| `lint-staged.config.js` | **新增**：仅对本次提交的 `*.{js,mjs,cjs,vue}` 跑 `eslint --fix` + `oxlint --fix` |
| `commitlint.config.js` | **新增**：Conventional Commits，关闭 `subject-case` 以支持中文主题，标题上限 100 |
| `.husky/pre-commit`、`.husky/commit-msg` | **新增**：提交前 lint、提交信息规范校验 |
| `src/components/ImageView/index.vue` | 用 `defineOptions({ name: 'XtxImageView' })` 显式声明组件名，替代 9 处冗余的 `eslint-disable` 注释（全部删除） |

门禁实测（都已验证生效，非纸面配置）：

```
'feat(cart): support local cart merge' | commitlint  → exit 0
'update some files'                    | commitlint  → exit 1（type-empty / subject-empty）
故意写入未使用变量 → lint-staged                      → exit 1（eslint(no-unused-vars)）
```

### 2. CI 与协作

| 文件 | 内容 |
| --- | --- |
| `.github/workflows/ci.yml` | **新增**：`lint` 与 `build` 两个 job、npm 缓存、同分支 `concurrency` 取消、产物体积检查（超预算即失败）、体积明细写入 GitHub Job Summary、dist artifact 上传 |
| `.github/PULL_REQUEST_TEMPLATE.md` | **新增**：变更类型 + 自查清单（lint / 体积 / 主流程回归 / 截图） |
| `.github/dependabot.yml` | **新增**：按 Vue 生态、lint 工具链、构建工具链分组周更，避免 PR 刷屏 |

### 3. 性能

| 文件 | 内容 |
| --- | --- |
| `src/router/index.js` | 12 个页面全部改为动态导入；补齐路由 `name` 与 `meta.title`；新增 `:pathMatch(.*)*` 404 兜底；`scrollBehavior` 支持前进后退还原位置与 hash 锚点；`afterEach` 同步 `document.title` |
| `vite.config.js` | 新增 `build.rolldownOptions.output.codeSplitting`（**仅**框架层 `vendor-vue` 分组）+ `chunkSizeWarningLimit: 300` |
| `scripts/size-report.mjs` | **新增**：解析 `dist/index.html` 得到首屏真实载荷，输出原始/gzip 体积表与最大 chunk Top5，超出预算（JS 135 kB / CSS 20 kB）以非 0 退出码失败，支持 `--markdown` 输出到 CI Summary |

### 4. 健壮性与体验

| 文件 | 内容 |
| --- | --- |
| `src/utils/errorHandler.js` | **新增**：统一接管组件异常、未处理 rejection、资源加载失败；`reportError` 预留上报出口 |
| `src/main.js` | 指令注册移到 `mount` 之前；接入全局错误处理；开发环境开启 `app.config.performance` |
| `index.html` | `lang=""` → `lang="zh-CN"`；补 `description` / `theme-color`；字体改为 `media` 切换异步加载 + `preconnect`（国内访问 Google Fonts 不稳定）；补首屏品牌占位块 |
| `src/views/NotFound/index.vue` | **新增** 404 页面（品牌色 + 返回首页/上一页） |
| `common.scss` 等 7 处 | 字体栈补 CJK 兜底：`'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', SimSun, serif` |
| `src/App.vue` | 删除 60 行脚手架残留样式（选择器在模板里根本不存在） |

### 5. 部署

| 文件 | 内容 |
| --- | --- |
| `vercel.json` | SPA rewrite + `/assets` 一年强缓存 + `index.html` 不缓存 |
| `public/_redirects` | Netlify SPA 回退配置 |
| `public/robots.txt` | 新增 |
| `Dockerfile` + `nginx.conf` + `.dockerignore` | 多阶段构建（node 构建 → nginx 运行）；`ENV HUSKY=0` 跳过容器内无 `.git` 时的钩子安装；nginx 含 SPA 回退、hash 资源强缓存、入口不缓存、gzip、安全响应头 |

### 6. 清理

删除 8 个未被引用的资源（`assets/base.css`、`assets/main.css`、`assets/logo.svg`、`images/{load,loading}.gif`、`images/{logo,login-bg,none}.png`）与 2 个与 `.vscode/` 内容**逐字节相同**的根目录重复配置；`.gitignore` 补上 unplugin 生成的 `auto-imports.d.ts` / `components.d.ts`。

---

## 四、踩坑记录（面试可直接讲）

**分包不是越细越好。** 第一版按 `node_modules` 分了 `vendor-vue` / `vendor-element-plus` / `vendor` 三组，结果首屏从 413 kB **反弹到 643 kB**。原因是：分组会把该组**所有**匹配模块打进一个 chunk，而只要首屏依赖图里有任何一个模块属于该组，整个 chunk 就得跟着首屏加载 —— 于是只在懒加载页面用到的 Element Plus 组件被强行拉回首屏。

改成「只给首屏必然要加载的框架层单独成 chunk」后，首屏 413 kB，且业务入口只剩 80.86 kB（gzip），业务代码变更后用户只需重新下载这 80 kB。

**先量再改。** 关于 209 kB CSS 的假设（全量引入）被实测证伪，避免了把「本来正确的按需引入」改坏 —— 顺手拿到了「751 条 `el-col` 规则只服务一处表单」这个更有价值的结论。

---

## 五、如何验证这一轮成果

```bash
npm install          # 会自动装上 husky 钩子
npm run lint         # 应为 0 error / 0 warning
npm run build        # 应无 chunk 体积告警
npm run size         # 首屏体积应在预算内
npm run dev          # 访问一个不存在的路由，应看到 404 页面而非白屏
git commit -m "随便写" # 应被 commitlint 拦下
```

---

## 六、遗留项（迭代 2 起）

1. **TypeScript 迁移**：`allowJs` 渐进式，优先 `src/apis`、`src/stores`、`src/composables`，定义 `Goods` / `Sku` / `CartItem` / `Order` 等领域模型。
2. **自动化测试**：Vitest 覆盖 `power-set`（幂集边界）、`cartStore` 计算、`usePagination` 竞态；Playwright 跑通「登录 → 选规格 → 加购 → 结算 → 支付」主链路。CI 增设 `test` job。
3. **摆脱教学 API 依赖**：自建 Node 后端或 MSW mock + `VITE_USE_MOCK` 切换 + `.env.*` 分环境配置，让 Demo 不再受外部服务可用性影响。
4. **XtxSku 重构**：去掉对 props 的直接修改（反模式）+ Options API → `<script setup>`，把全量幂集 O(2ⁿ) 改为按维度建索引 O(n·m) 并补单测。
5. **真实上线**：需要先完成第 3 项，否则线上 Demo 数据为空；随后补截图/GIF 与在线链接。
6. **请求层健壮性**：`AbortController` 取消、重复请求合并、幂等 GET 重试、401 静默续期、`useAsyncData` 请求级竞态保护。
7. **骨架屏与响应式**：统一 Skeleton/空状态；补移动端断点（当前 `body { min-width: 1240px }`）。
