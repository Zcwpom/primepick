# PrimePick 优化路线图（面试导向）

> 目标：把这个「跟着教程做完的商城 SPA」升级成「有工程判断力的个人项目」。
> 原则：**不堆功能，堆证据**。面试官只信能测量、能解释、有取舍的东西。

---

## 一、现状体检（实测数据，不是感觉）

### 已经不错的（不用重做，拿来当亮点讲）

| 项 | 证据 |
|---|---|
| 业务链路完整 | 首页 → 分类 → 子分类筛选 → 详情(SKU) → 购物车 → 结算 → 支付 → 支付回调 → 会员中心 |
| Composable 抽象 | `useAsyncData` / `usePagination` / `useAuth` / `useSearchHistory`，统一 data/loading/error 三态 |
| 请求层封装 | `src/utils/http.js`：token 注入 + 401 自动登出 + 全局错误提示 |
| 路由守卫 | `src/router/index.js` 白名单拦截 + `redirectUrl` 回源 |
| 状态持久化 | Pinia + `pinia-plugin-persistedstate` |
| 有难度的算法 | `src/components/XtxSku/power-set.js` 幂集算路径字典，做规格禁用联动 |
| 自定义指令 | `src/directives` 图片懒加载 |
| 文档意识 | README 已写技术栈 / 亮点 / 结构 |

代码量：`src/` 68 个文件、约 6544 行。

### 面试官会当场打问号的 8 点（实测）

| # | 问题 | 实测证据 | 严重度 |
|---|---|---|---|
| 1 | **不是一个"工程"，是一个"页面集合"** | 无 TS、无测试、无 CI、无 husky、无 prettier、无 commitlint | 🔴 致命 |
| 2 | **Lint 是坏的** | `npx eslint .` → **11 errors**；`eslint.config.js` 引用的 `.oxlintrc.json` **文件不存在**，`npm run lint` 直接不可信 | 🔴 致命 |
| 3 | **没有任何代码分割** | 路由全是静态 `import`，构建产物 **单个 JS chunk 506.67 kB（gzip 174.89 kB）**，Vite 自己都警告 "chunks are larger than 500 kB" | 🔴 致命 |
| 4 | **没有线上地址** | 无 remote、无 `vercel.json`/`Dockerfile`、README 无 demo 链接 | 🔴 致命 |
| 5 | **强依赖别人的教学 API** | `vite.config.js` 代理到 `pcapi-xiaotuxian-front-devtest.itheima.net`、`baseURL: '/api'`、无任何 `.env.*`。对方一挂，项目就是死的 | 🔴 致命 |
| 6 | **提交历史暴露"跟教程"** | 56 commits、单 `master`、消息如「购物车-接口对接及详情页加入购物车」；时间线不单调（说明 rebase/amend 过） | 🟠 高 |
| 7 | **有反模式代码** | `XtxSku/index.vue`：唯一一个 Options API 文件 + **直接修改 props**（`specs.forEach(s => s.values.forEach(v => v.disabled = ...))`） | 🟠 高 |
| 8 | **不少"功能开发中"** | 源码里 11 处 `TODO/FIXME/功能开发中`（详情页评价、收藏、品牌主页、服务详情…） | 🟡 中 |

另外还有：`index.html` 的 `<html lang="">` 是空的；字体走 Google Fonts CDN（国内基本加载不出来，品牌 Serif 实际没生效）；iconfont 走 `//at.alicdn.com` 协议相对 URL；无 404 页、无骨架屏、无错误边界；购物车 store 里 `allPrice/selectedPrice` 等 5 个 computed 重复遍历数组。

### 进度速览

| 迭代 | 范围 | 状态 |
| --- | --- | --- |
| 迭代 1 | 止血 + 门面（P0 第 1/2/3/5/7 项） | ✅ 已完成 → [iteration-1-report.md](iteration-1-report.md) |
| 迭代 2A | 数据层：MSW mock 接管全部接口（P0 第 6 项） | ✅ 已完成 → [iteration-2a-mock-report.md](iteration-2a-mock-report.md) |
| 迭代 2B | TypeScript + 单元测试 + 真正上线 | ⏳ 未开始 |
| 迭代 3 | 业务深度（XtxSku 重构、价格引擎、订单状态机）+ 差异化亮点 | ⏳ 未开始 |

对照上表 8 条风险：第 **2、3、5** 条已闭环（第 5 条由迭代 2A 解决 —— 项目现在**不依赖任何后端**即可完整运行）；
第 **1** 条补齐了 CI、提交门禁与浏览器冒烟（TS 与单测仍在迭代 2B）；
第 **4** 条部署配置就绪，且**现在具备真正上线的条件**；第 **6、7、8** 条按计划在迭代 2B/3 处理。

---

## 二、优化清单

### P0 · 地基与门面（不做=白做，约 5~7 天）

- [x] **1. 修好 lint 并让它成为门禁**（已完成）
  - [x] 补 `.oxlintrc.json`（原文件被 `eslint.config.js` 引用，但根本不存在）
  - [x] 修掉 11 个 error：**根因是 flat config 的覆盖顺序** —— 自定义 `rules` 写在 `pluginVue.configs` 之前，被覆盖回默认值。修正顺序后按「页面文件豁免、`src/components` 仍强制多词命名」精确关闭，并删掉 9 处冗余的 `eslint-disable` 注释
  - [x] 决策点：**没有**换成 `@antfu/eslint-config`。理由是它会引入全仓库格式化 diff，而本轮要保持 diff 可审查；`eslint-plugin-oxlint` 已经解决了「两套规则重复检查」的问题，等 TS 迁移时一起做更划算
  - [ ] Prettier：暂缓（同上），当前依赖 `.editorconfig` + 编辑器保存格式化
- [x] **2. Git 提交规范 + 门禁**（已完成，实测生效）
  - [x] `husky` + `lint-staged`（pre-commit 只查本次改动文件）+ `commitlint`（Conventional Commits，关闭 `subject-case` 以支持中文标题）
  - [ ] `cz-git` / `commitizen` 交互式提交（可选，未做）
  - [ ] 分支 + PR 工作流：**依赖先把仓库推到 GitHub**（当前仓库没有 remote）
  - [ ] 本轮改动尚未提交：需要按主题拆成若干次规范提交（我没有替你 commit，避免破坏你的历史）
- [x] **3. CI（GitHub Actions）**（已完成）
  - [x] `.github/workflows/ci.yml`：`lint` + `build` 两个 job、**npm** 缓存（项目用的是 package-lock.json，不是 pnpm）、同分支并发取消、**首屏体积预算门禁**、体积明细写入 Job Summary、dist artifact 上传
  - [x] 额外补上 `.github/PULL_REQUEST_TEMPLATE.md`（含自查清单）与 `.github/dependabot.yml`（依赖分组周更）
  - [ ] README 顶部 CI badge：已写入，但 `<your-github-id>/<repo-name>` 需要你替换
  - [ ] 迭代 2 再追加 `test` job 与 Node 版本矩阵
- [ ] **4. TypeScript 迁移（最大短板，收益最高）**
  - [ ] `jsconfig.json` → `tsconfig.json`（`@vue/tsconfig`，先 `allowJs: true`，渐进迁移）
  - [ ] 定义领域模型：`Goods` / `Sku` / `SpecValue` / `CartItem` / `Order` / `Address` / `UserInfo` / 统一响应 `ApiResult<T>`
  - [ ] 优先改造 **数据层**（`src/apis/*`、`src/stores/*`、`src/composables/*`），view 层最后迁
  - [ ] `vue-tsc --noEmit` 进 CI
  - [ ] 讲法：为什么"现在才上 TS"、`allowJs` 渐进策略、泛型怎么用在 `useAsyncData<T>` / `usePagination<T>`
- [x] **5. 路由懒加载 + 构建分包（性能第一刀）**（已完成，数据见下）
  - [x] 12 个页面全部改 `() => import()`，含 Member 子路由与 Detail / Checkout / Pay / PayBack / Login / NotFound
  - [x] Vite 8 底层是 Rolldown：用 `build.rolldownOptions.output.codeSplitting`（`rollupOptions` / `manualChunks` 均已废弃），且**只给框架层 `vendor-vue` 分组**
  - [x] 用自研 `scripts/size-report.mjs` 取代 `rollup-plugin-visualizer`：可视化插件只产出 HTML 报告，而脚本能直接做**体积预算门禁**并接进 CI
  - [x] 结果超出预期：首屏 JS gzip **174.89 → 121.70 kB**，首屏合计 **208.59 → 136.01 kB（−35%）**，最大 chunk **506.67 → 80.86 kB**，构建耗时 **14.60 → 3.58 s**
  - [x] ~~怀疑 CSS 209.54 kB 是 Element Plus 未按需引入~~ → **实测证伪**：按需引入是正常的，产物只包含实际用到的组件类名；真正的体积大头是 `el-row/el-col` 栅格（**751 条规则 ≈ 36 kB，全项目仅地址表单一处使用**），现在随地址页懒加载。**先量再改，避免把本来正确的东西改坏**
- [x] **6. 干掉对教学 API 的硬依赖**（已完成 → [iteration-2a-mock-report.md](iteration-2a-mock-report.md)）
  - [x] 先走**次选方案**：`MSW` mock 接管 **30 个端点**，`VITE_USE_MOCK` 一键切换 —— 静态站点即可完整演示，这是「能被看见」的最短路径
  - [x] **趁教学 API 还活着把真实响应抓下来**（`scripts/capture-fixtures.mjs`，遍历 38 个端点 → 保留 30 份有效 fixture）；这些数据在方案 B 里直接就是数据库 seed
  - [x] 补 `.env.development` / `.env.production` / `.env.example`；`http.js` 的 `baseURL` 与 `vite.config.js` 的代理目标都改读环境变量，不再硬编码别人的域名
  - [x] 购物车 / 地址 / 订单用 localStorage 维护**可变状态**（不是回放静态数据），加购、删地址、下单真的生效，刷新还保留
  - [x] 端到端验证：自研**零依赖**冒烟脚本（Node 内置 `fetch` + `WebSocket` 直连 CDP），CI 里真的跑一遍浏览器
  - [ ] **首选方案（自建 Node 后端）推迟到迭代 2B/3**：这是「会 Node.js」的实证；届时把 `VITE_USE_MOCK` 关掉即可，前端零改动
  - [ ] `docker-compose up` 一键起全栈：随自建后端一起做
- [ ] **7. 部署上线 + README 门面**（配置就绪，尚未真正上线）
  - [x] 部署配置三件套：`vercel.json`（SPA rewrite + `/assets` 强缓存 + 入口不缓存）、`public/_redirects`（Netlify）、`Dockerfile` + `nginx.conf` + `.dockerignore`（多阶段 + Nginx SPA 回退）
  - [x] README 重写：徽章、技术栈、**性能 before/after 数据表**、架构决策说明、三种部署方式、已知限制与迭代计划
  - [ ] 真正部署并填入链接：**前置条件是先完成第 6 项**，否则线上 Demo 数据全空，反而扣分
  - [ ] 截图 / GIF / 二维码：需要真实浏览器与已部署站点，迭代 2 补
  - [ ] 自备域名（可选但加分）
  - [x] 404 兜底页 + `app.config.errorHandler` + 未处理 rejection / 资源加载失败兜底（`src/utils/errorHandler.js`）
  - [ ] 骨架屏与空状态统一：迭代 2
- [ ] **8. 测试（"练习项目 → 工程"的分水岭）**
  - [ ] Vitest + `@vue/test-utils` + jsdom；`vitest --coverage`
  - [ ] 优先单测：`power-set.js`（边界：0 维度、单维度、重复值）、`cartStore` 计算（全选/单选/总价/合并）、`usePagination`（翻页/到底/竞态）、`useSearchHistory`（去重/上限）
  - [ ] Playwright E2E 1 条主链路：**登录 → 详情选规格 → 加购 → 结算 → 支付成功 → 订单可见**
  - [ ] 目标：`src/composables` + `src/stores` 覆盖率 ≥ 60%

### P1 · 深度与完整度（拉开差距，约 5~7 天）

- [ ] **9. 重构 XtxSku（全项目最值得讲的一段代码）**
  - [ ] Options API → `<script setup lang="ts">`
  - [ ] **消除 props 直接修改**：改成 `computed` 派生 + emit 出 `selectedSpecs`，父组件持有状态（不可变数据流）
  - [ ] 算法升级并写进文档：现在是**每次 watchEffect 重算全量幂集 O(2^n)**；改为**按维度分组建索引 O(n·m)**，或讨论 10 万 SKU 时用 `Web Worker` + `Map` 的取舍
  - [ ] 配单测 + 一个「无库存规格自动置灰」的动画截图
  - [ ] 讲法："我从一个 O(2^n) 的教科书写法，改成了按维度建索引，并用测试锁住了边界行为"
- [ ] **10. 请求层健壮性（体现线上意识）**
  - [ ] `AbortController` 取消 + 重复请求合并（搜索联想/快速切换分类的竞态）
  - [ ] `useAsyncData` 加**请求级竞态保护**（现在 `cancelled` 只在 unmount 时置位，慢请求会覆盖新数据）
  - [ ] 超时/重试（指数退避，只重试幂等 GET）/ 错误分级（网络 vs 401 vs 403 vs 5xx vs 业务码）
  - [ ] token 刷新（refresh token 静默续期 + 并发请求排队），替代现在"401 直接踢下线"
  - [ ] token 存储安全讨论：localStorage vs httpOnly Cookie vs 内存 + 刷新
- [ ] **11. 状态管理进阶**
  - [ ] 购物车**乐观更新 + 失败回滚**（现在 `addCart` 是等接口回来才更新，点了没反馈）
  - [ ] 跨标签页同步：`BroadcastChannel` 或 `storage` 事件（开两个 tab 加购，数字联动 —— 演示效果极好）
  - [ ] persist 加 `version` + `migrate`（体现"考虑过数据结构演进"）
  - [ ] 抽掉重复 computed，统一 selector；Pinia store 拆成 `cart` / `cartUI`（现在 5 个 computed 反复遍历数组）
- [ ] **12. 功能补全（把"功能开发中"清零）**
  - [ ] 收藏/关注（含列表页 + 乐观交互）
  - [ ] 优惠券 + 满减/折扣**价格计算引擎**（独立成 `src/domain/pricing.ts` 并单测 —— 这是电商最核心的业务逻辑，面试极加分）
  - [ ] 秒杀：倒计时（`useCountDown` 已有）+ 开抢按钮态 + 库存扣减失败处理
  - [ ] 评价与晒单（图片上传/预览）
  - [ ] 订单状态机（待付款/待发货/待收货/已完成/已取消）+ 支付结果**轮询** + 超时自动关单
  - [ ] 搜索联想：防抖 + 请求取消 + 键盘上下选择
  - [ ] 地址三级联动 + 默认地址
  - [ ] 商品对比 / 浏览历史（`IndexedDB` 存）
- [ ] **13. 性能与可观测性**
  - [ ] `web-vitals` 上报（LCP/INP/CLS）→ 自建 `/perf` 面板页，面试直接打开看数据
  - [ ] 路由级耗时打点；Sentry（或自研错误上报）捕获线上错误
  - [ ] 图片：全部 `loading="lazy"` + `decoding="async"` + 显式 `width/height`（防 CLS）+ WebP/AVIF + `srcset` + 占位色
  - [ ] 字体：Google Fonts → `@fontsource/noto-serif-sc` 自托管 + 子集化（**顺手修掉国内加载不出来的问题**）
  - [ ] `unplugin-vue-components` 占了构建 59% 时间 —— 可以聊"插件级构建优化"（`dts` 关闭、`dirs` 收敛）
  - [ ] 大列表虚拟滚动（`@vueuse/core` 的 `useVirtualList`），造 1 万条数据做 FPS 前后对比
- [ ] **14. 可访问性与体验细节**
  - [ ] `<html lang="zh-CN">`、语义化标签、`aria-*`、`:focus-visible`、键盘 Tab 走通主流程、弹窗 focus 管理
  - [ ] 骨架屏（Skeleton）替换所有首屏 loading；统一空状态组件
  - [ ] 减少动效偏好 `prefers-reduced-motion`
  - [ ] 响应式：现在按 PC 1280 固定宽度做，至少补一档平板/移动断点
- [ ] **15. 设计系统化**
  - [ ] `var.scss` 升级为 design token（颜色/间距/圆角/阴影/字号），出 `tokens.css` + 暗色主题
  - [ ] 主题切换（亮/暗/跟随系统）+ `localStorage` 记忆
  - [ ] `i18n`（vue-i18n，中/英）—— 或者明确说"不做，因为目标用户单一"，**有取舍的解释比硬做加分**

### P2 · 差异化亮点（"眼前一亮"靠这里，选 2~3 个做深，约 5~10 天）

- [ ] **16. Monorepo 化 + 商家后台（最推荐，故事最完整）**
  - [ ] pnpm workspaces：`apps/web`(买家端) / `apps/admin`(商家后台) / `packages/types`(共享领域模型) / `packages/utils` / `packages/ui`
  - [ ] 后台：商品管理、订单管理、库存、数据看板（ECharts），复用同一套 TS 类型与请求层
  - [ ] 讲法："我把它从单页应用拆成了 monorepo，前后台共享类型定义，接口契约变更在 CI 就能被发现"
  - [ ] Turborepo 做任务编排 + 远程缓存（构建耗时数据对比）
- [ ] **17. 自研组件库 + Storybook + changesets**
  - [ ] 把 `GoodsItem`/`XtxSku`/`XtxImageView`/骨架屏抽成 `packages/ui`
  - [ ] Storybook 出交互文档；`changesets` 管版本；真发到 npm（哪怕 0 下载，链路完整就是能力证明）
- [ ] **18. 配置化首页 / 低代码楼层（面试最抓眼）**
  - [ ] 首页楼层用 JSON Schema 描述（轮播/金刚区/商品网格/榜单），运行时动态渲染 + 拖拽排序编辑
  - [ ] 讲法："运营改首页不用发版，配置下发即生效 —— 这是电商真实场景"
- [ ] **19. 性能专项报告（把优化变成可量化的证据）**
  - [ ] `docs/performance.md`：优化前后 Lighthouse 截图、首屏 JS/CSS 体积、LCP/INP/CLS、虚拟滚动 FPS、接口瀑布图
  - [ ] 每一个"优化"都配 before/after 数字（**这一页比 10 个功能更能打动面试官**）
- [ ] **20. 稳定性与回归**
  - [ ] Playwright 主链路 + **视觉回归**（截图快照对比）
  - [ ] CI 里跑 E2E，出 Allure/HTML 报告，README 挂最近一次结果
- [ ] **21. 实时能力**
  - [ ] SSE/WebSocket：订单状态推送、客服会话、多人同时抢购的库存广播
  - [ ] 用来讲"为什么这里选 SSE 而不是 WebSocket"（单向推送、自动重连、HTTP 语义）
- [ ] **22. 埋点与 A/B（电商特有，极加分）**
  - [ ] 自研轻量埋点 SDK：曝光（IntersectionObserver）、点击、停留时长，`navigator.sendBeacon` 上报，失败离线队列
  - [ ] A/B 实验骨架：分桶 + 曝光归因 + 简单漏斗看板
- [ ] **23. PWA / 离线**
  - [ ] `vite-plugin-pwa`（Workbox）：离线可浏览、接口 stale-while-revalidate、离线购物车（IndexedDB 队列，恢复网络后同步）

---

## 三、执行排期建议

### 迭代 1：止血 + 门面（1 周）
修 lint → CI → husky/commitlint → 路由懒加载+分包 → 部署上线 → README 重做（截图/GIF/链接）→ 404 页
**产出：一个别人点得开、有绿标 CI、构建有优化数据可以讲的线上项目。**

### 迭代 2：工程化深度（1 周）
TypeScript 迁移（数据层优先）→ Vitest 单测 + Playwright 主链路 → XtxSku 重构（去 props 修改 + 算法升级）→ 请求层健壮性（取消/竞态/重试/token 刷新）→ 骨架屏与 a11y
**产出：简历里"工程化"和"性能"两条能落地成数字的 bullet。**

### 迭代 3：业务深度 + 差异化（1~2 周）
价格计算引擎（优惠券/满减）→ 购物车乐观更新 + 跨标签同步 → 订单状态机 + 支付轮询 → 埋点/Web Vitals 面板 →（选一个）Monorepo+商家后台 / 配置化首页 / 自研组件库
**产出：面试时能连续讲 20 分钟不重复的技术故事。**

---

## 四、简历怎么写（3~5 条 bullet，每条带数字）

> 反面教材：「使用 Vue3 + Pinia 开发商城项目，实现了购物车、订单、支付等功能。」——面试官看完没有任何问题想问。

**✅ 迭代 1 做完，现在就能写的两条：**

- 主导 12 个页面电商 SPA 的**工程化改造**：定位并修复 flat config 覆盖顺序导致的 lint 规则失效（**11 error → 0**），接入 oxlint + ESLint 双 linter、Husky + lint-staged + commitlint 提交门禁（实测可拦下不合规 commit 与 lint 错误）、GitHub Actions CI。
- 首屏性能优化：将 12 个路由从静态 `import` 改为动态导入，按**首屏依赖图**而非 `node_modules` 划分子包，并自研体积预算门禁接入 CI —— **首屏 gzip 208.59 kB → 136.01 kB（−35%），最大单 chunk 506.67 kB → 80.86 kB，生产构建 14.60 s → 3.58 s**（`npm run size` 可复现）。

**⏳ 以下三条要等迭代 2/3 做完、拿到真实数字后才能写（占位符不要留进简历）：**

- 引入 TypeScript 领域模型（Goods/Sku/Order）与 `vue-tsc` 类型门禁，CI 达到 lint / type-check / test / build 四关全绿。
- 重构核心 SKU 选择器：消除对 props 的直接修改与 Options API 混用，将库存联动算法的路径字典从**全量幂集 O(2^n) 优化为按维度建索引 O(n·m)**，配套 Vitest 单测锁定边界行为，**用例 X 个 / composables+stores 覆盖率 XX%**。
- 为搜索与分类场景补齐**请求竞态治理**：AbortController 取消 + 重复请求合并 + 幂等 GET 指数退避重试 + 401 静默续期，**偶发"旧数据覆盖新数据"问题归零**。
- 自建 Mock 服务 / Node 后端（XX 个接口）替代第三方教学 API，通过 `VITE_USE_MOCK` 一键切换，**Demo 不再依赖外部服务可用性**，并部署至 Vercel 供在线体验。

> ⚠️ Lighthouse Performance / LCP / CLS 三个数字**必须用真实浏览器测出来再写**，现在一个都还没有 —— 别编。

---

## 五、面试必问 & 你要准备好的答案

| 问题 | 你的答案锚点 |
|---|---|
| 你这个项目最难的点？ | SKU 规格联动的算法复杂度 + 不可变数据重构（有测试、有前后对比） |
| 首屏为什么慢？怎么优化？ | 506 kB 单 chunk 的成因 → 路由动态导入 → **按首屏依赖图划分子包**（重点讲：「按 node_modules 分组后首屏反而从 413 kB 涨到 643 kB」这个坑）→ 体积预算门禁。**全程有 before/after 数字** |
| 购物车本地和服务端怎么合并？ | `mergeLocalCart` 的冲突策略（同 skuId 取 count 合并 vs 覆盖）+ 失败降级 + 跨标签同步 |
| Pinia 为什么不用 Vuex？ | 组合式 store、TS 推导、无 mutation 样板、按需注册、devtools 时间旅行 |
| token 放 localStorage 安全吗？ | XSS 风险 → httpOnly Cookie + CSRF / 内存 + refresh token 续期，说清取舍 |
| 为什么不用 SSR/Nuxt？ | 电商 SEO 确实需要，但当前是学习项目，权衡开发/运维成本 —— **同时说清如果要上会怎么做** |
| 你的测试策略？ | 单测打 composables/stores/纯函数，E2E 只保主链路（测试金字塔），不追求覆盖率数字 |
| Element Plus 按需引入原理？ | `unplugin-vue-components` 编译期 AST 分析 + resolver 生成 import，sass 变量注入定制主题；**附实测结论：产物里只含用到的组件类名，209 kB CSS 的大头其实是 `el-row/el-col` 栅格（751 条规则仅服务一处表单）** |
| 你怎么保证代码质量？ | oxlint + ESLint 双跑（`eslint-plugin-oxlint` 避免规则重复）、husky 提交门禁（**实测**能拦下不合规 commit 与 lint 错误）、CI 体积预算门禁、PR 模板 + conventional commits |
| 项目里最容易被忽略的一件事？ | `dayjs` 被源码 import 却从未声明为依赖（幽灵依赖），靠 element-plus 提升才侥幸能跑 —— 换 pnpm 严格解析立刻崩 |

---

## 六、可量化验收目标

| 指标 | 最初 | 现在 | 目标 |
|---|---|---|---|
| 首屏 JS (gzip) | 174.89 kB | **121.72 kB** | < 100 kB |
| 首屏 CSS (gzip) | 33.70 kB | **14.32 kB** | 保持 |
| 首屏合计 (gzip) | 208.59 kB | **136.04 kB** | **< 140 kB** ✅ |
| 最大业务 chunk | 506.67 kB ⚠️ | **80.89 kB** | 无警告 ✅ |
| mock 层（仅演示模式加载） | — | 191.01 kB gzip（fixtures 34.5 + MSW 156.5） | 方案 B 后移除 |
| 生产构建耗时 | 14.60 s | **3.58 s** | 保持 |
| Lighthouse Performance (Mobile) | 未测 | **仍未测（当前最大缺口）** | ≥ 90 |
| LCP / CLS | 未测 | 未测 | < 2.0s / < 0.1 |
| 单元测试 | 0 | 0 | composables+stores 覆盖 ≥ 60% |
| E2E 主链路 | 0 | **1 条浏览器冒烟已进 CI** ✅ | Playwright 跑通下单主链路 |
| ESLint error | 11 | **0** ✅ | 0 |
| oxlint error / warning | 1 / 7 | **0 / 0** ✅ | 0 |
| CI | 无 | **lint + build + 体积门禁 + 浏览器冒烟** | 追加 type-check / test |
| 线上 Demo | 无 | 部署配置就绪，**不再被 API 阻塞** | **有可访问链接 + 二维码** |
| 外部 API 依赖 | 强依赖教学 API | **已解耦（30 端点本地 mock）** ✅ | 可完整离线运行 |
| 未使用的源文件/资源 | 10 个 | **0** ✅ | 0 |

---

## 七、下一步：迭代 2 的起点

迭代 1 原定的 3 件事已全部完成：

1. ✅ **建立基线**：`npm run size` 现在会解析产物输出首屏体积表，优化前数据（首屏 208.59 kB gzip / 单 chunk 506.67 kB）已记录进本文件与 README。
2. ✅ **lint 恢复可信**：11 error → 0，补上缺失的 `.oxlintrc.json`，并接入提交门禁（实测生效）。
3. ✅ **路由动态导入**：单 chunk 506.67 kB → 最大 80.86 kB。

迭代 2A 也已完成（数据层）：

4. ✅ **摆脱教学 API 依赖**：MSW mock 接管 30 个端点 + `VITE_USE_MOCK` 开关 + `.env.*` 分环境配置 → **已解锁「真正上线」**
5. ✅ **端到端验证**：零依赖浏览器冒烟脚本（Node 内置 `fetch` + `WebSocket` 直连 CDP）已进 CI

迭代 2B 建议顺序（每一步都能独立产出「可讲」的成果）：

1. **部署上线 + 补截图/GIF/二维码**：阻塞已经解除，做完简历就能投 —— 优先级最高
2. **TypeScript 渐进迁移**：`allowJs` + 领域模型（fixtures 与 `_manifest.json` 就是现成的接口契约），`vue-tsc --noEmit` 进 CI
3. **测试**：Vitest 单测（composable / store / 幂集算法）+ Playwright 主链路替换当前冒烟脚本，CI 增设 `test` job
4. **XtxSku 重构**：消除 props 直接修改 + 幂集 O(2ⁿ) → 按维度建索引 O(n·m) + 单测
5. **请求竞态治理**：`AbortController` 取消、重复请求合并、幂等 GET 重试、401 静默续期、`useAsyncData` 请求级竞态保护
6. **方案 B（自建 Node 后端）**：投递岗位明确要求 Node.js 时提前；否则排在 TS 与测试之后 —— 切换只需改 `VITE_USE_MOCK`，前端零改动
