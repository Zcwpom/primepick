# 方案 A 报告：用 MSW mock 层摆脱教学 API 依赖

> 目标：让项目**能被看见** —— 部署成静态站点后，每个接口都由浏览器内的 Service Worker 接管，
> 不依赖任何后端服务，面试官点开链接就能看到完整数据。
>
> 状态：**已完成并端到端验证通过**（lint 0/0、build 通过、首屏体积在预算内、无头浏览器冒烟全绿）

---

## 一、为什么必须先做这一步

| 问题 | 具体表现 |
| --- | --- |
| 构建产物是死的 | `baseURL: '/api'` 的转发只存在于 dev server 的 `proxy` 里，`dist` 部署后 `/api/*` 全部 404 → 线上是空首页 |
| 演示不可控 | 依赖第三方教学 API，随时可能下线 / 限流 / 改字段，面试当天挂了就全完了 |
| 前后端之间没有契约 | 响应结构（`res.result.items`、`counts`…）散落在 12 个页面里，靠约定俗成 |
| 无法自动化测试 | 没有 mock 层，任何 E2E 都得依赖外网，CI 必然不稳定 |

---

## 二、做了什么

### 1. 抢下真实数据（fixtures）

`scripts/capture-fixtures.mjs` 会登录教学 API、遍历 **38 个端点**（含需要 token 的 12 个会员接口），
把**真实响应原样落盘**（保留 `{ code, msg, result }` 信封）：

```
成功 33 / 38，最终保留 30 个有效端点 → mocks/fixtures/*.json（约 130 kB）
失败 5 个：分类 id 传错导致的 400 / 对象不存在，没有 mock 价值，已清理
```

- 只落盘成功响应：错误响应留在 fixtures 目录只会让人误读成有效契约
- 关键词 fixture 重命名为 ASCII（`goods-list-keyword-shoes.json`），避免中文/百分号编码文件名在 CI 上出问题
- `_manifest.json` 记录 **端点 → 文件** 的映射，就是一份可读的接口契约清单
- `scripts/fixture-summary.mjs` 打印每个端点的返回体形状（字段名、数组长度），**写 TS 类型时直接照抄**

> ⚠️ 抓取时机很关键：这一步必须在教学 API 还活着的时候做。抓下来的数据在方案 B 里会直接变成数据库 seed。

### 2. mock 层结构

```
mocks/
├── utils.js          # fixture 加载（import.meta.glob）、路径拼接、信封响应、模拟延迟、鉴权判断
├── data-store.js     # 购物车 / 地址 / 订单的**可变**状态（localStorage 持久化，用 fixture 做种子）
├── handlers/         # home / category / goods / cart / member / user，覆盖 src/apis 下全部接口
├── browser.js        # setupWorker 入口
└── fixtures/         # 30 份真实响应 + _manifest.json
```

关键设计决策：

| 决策 | 原因 |
| --- | --- |
| **不直接回放静态数据** | 静态只能看不能操作：加购、删地址、下单会立刻露馅。购物车/地址/订单用 localStorage 维护可变状态 |
| 用 fixture 当种子 | 数据形状是真的，交互也是真的，刷新还能保留 |
| **结算/下单动态计算** | `/member/order/pre` 由当前购物车 + 地址实时算出（真实接口返回的 `goods` 是空的，因为购物车里那件商品无库存）。静态回放会和购物车内容对不上 |
| handler 路径从 `VITE_API_BASE` 拼接 | 与 `src/utils/http.js` 用同一个前缀，避免 mock 与请求层前缀不一致 |
| 模拟 120~300ms 延迟 | 本地 mock 几毫秒就返回，loading / 骨架屏状态根本看不到；加了延迟演示起来才像真的 |
| 未匹配请求 `onUnhandledRequest: 'warn'` | 漏配接口会在控制台直接暴露，而不是静默走到真实网络 |
| 登录接口换成 mock token | fixture 里带的是抓取时刻的**真实 JWT**（会过期，也不该进仓库） |

### 3. 分环境配置

| 文件 | 作用 |
| --- | --- |
| `.env.development` | `VITE_USE_MOCK=true`、`VITE_API_BASE=/api`、`VITE_PROXY_TARGET=...` |
| `.env.production` | 演示部署保持 mock 开启（静态站点独立运行），并注释说明这是**演示用的显式取舍** |
| `.env.example` | 模板 + 方案 B 落地后的配置形态 |
| `vite.config.js` | 用 `loadEnv` 读代理目标，不再硬编码别人的域名；新增 `@mocks` 别名 |
| `src/utils/http.js` | `baseURL` 读环境变量；错误信息改读 `msg`（原先只读 `message`，而后端返回的是 `msg`） |
| `src/main.js` | mock **必须在 `app.mount()` 之前就绪**，否则首屏请求会抢在 worker 生效前发出 |

### 4. 顺手修掉的真实问题

- `src/stores/userStore.js`：删掉「接口不可用时用**硬编码账号密码**兜底」的逻辑 —— 假数据兜底会掩盖真实错误，也让 store 承担了不该有的职责（这段代码在面试里很难解释）
- `src/views/Login/index.vue`：登录流程补 `try/catch`，失败时中断而不是留下未处理的 rejection
- `src/apis/testAPI.js`：无任何引用的残留文件，删除
- `http.js` 错误提示字段 `message` → `msg`（配合 mock 的错误响应一起验证）

---

## 三、端到端验证（不只是「能编译」）

lint 和构建只能证明代码可编译，**证明不了浏览器里真的有数据**。所以补了一个零依赖的冒烟脚本：

`scripts/smoke-mock.mjs` —— 自动起 `vite preview`、拉起系统已装的 Edge/Chrome（**不下载浏览器**）、
用 **Node 内置 `fetch` + `WebSocket` 直接讲 Chrome DevTools Protocol**，等商品卡片渲染出来后再断言。

实测输出：

```
浏览器: C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
  [OK]   preview 服务就绪
  [OK]   无头浏览器已启动
  #app 渲染内容 82.8 kB，<img> 79 张
  [OK]   商品卡片渲染成功（.goods-item x32）
  [OK]   Vue 已挂载（首屏占位被替换）
  [OK]   图片来自 fixture 真实数据（42/79 张）
  [OK]   文档标题被 router.afterEach 改写
  [OK]   没有未捕获异常 / console.error

✓ mock 层端到端冒烟通过：页面数据全部来自 MSW mock
```

踩坑记录（都是真实调试过程）：

1. **`--dump-dom --virtual-time-budget` 会卡死**：Service Worker + 虚拟时间预算的组合会让 Chromium 不退出（挂起 9 分钟），改成 CDP 主动求值才稳定。
2. **`stdio: 'ignore'` 会把失败原因吞掉**：第一次跑冒烟只看到「preview 启动超时」，接上 stdout/stderr 才定位到问题。
3. **`--host 127.0.0.1` 必须显式指定**：Vite 默认绑 `localhost`，在 Windows 上可能只绑到 IPv6 的 `::1`，用 `127.0.0.1` 探活就失败。
4. **断言不要匹配整份 DOM 字符串**：第一版用 `html.includes('app-boot')` 判断「Vue 是否挂载」，结果 `index.html` 的 `<style>` 里也有 `.app-boot` 字样导致误判 —— 改成在页面里 `document.querySelector('#app .app-boot')` 求值。
5. **`codeSplitting` 分组要按「首屏依赖图」而不是「目录」**：mock 层拆成 `mock-fixtures`（129 kB JSON）与 `mock-runtime`（432 kB，MSW 自带 interceptors 等依赖），拆开后可分别统计体积。

---

## 四、体积影响（诚实口径）

| 指标 | 数值 | 说明 |
| --- | ---: | --- |
| 首屏 JS + CSS（gzip） | **136.04 kB** | 与接入 mock 前持平，在预算（135/20 kB）内 |
| mock 数据层（gzip） | **191.01 kB** | 2 个 chunk：fixtures 34.52 + runtime 156.49 |
| 加载条件 | 仅 `VITE_USE_MOCK=true` | 关闭 mock 后这两个 chunk 不参与首屏，也不影响业务分包基线 |

`scripts/size-report.mjs` 会把 mock 层**单独列出**并明确标注「不计入首屏预算」——
因为演示模式下它确实在关键路径上（挂载前必须就绪），藏在总数里不诚实。

---

## 五、升级到方案 B（自建 Node 后端）的路径

这一步刻意做成了「可整体摘除」：

1. `.env.production` 改 `VITE_USE_MOCK=false`，`VITE_API_BASE` 指向后端地址 —— **前端代码零改动**
2. `mocks/fixtures/*.json` 直接作为数据库 seed（数据形状已经和真实接口一致）
3. `mocks/handlers/*` 就是接口清单，Node 路由照着实现
4. 依赖注入式的接口契约（`ApiResult<T>` 信封）在 TS 迁移时可以直接写进类型
5. 确认后端稳定后，`mocks/` 目录整个删掉、`msw` 依赖移除即可

---

## 六、仍然存在的限制

1. **`msw` 目前在 `devDependencies`**：演示模式下它确实会被打进产物，属于「演示专用依赖」；真实产品里 mock 不该进生产包。这一点在 `.env.production` 里已显式注释说明。
2. **未在移动端 / Safari 验证**：Service Worker 在非 HTTPS 环境不工作，脚本对启动失败做了兜底（退回真实接口并打印警告）。
3. **搜索关键词的数据是回退的**：教学库里只有「鞋」等少数关键词有结果，其它关键词回退到完整列表，避免演示时搜什么都空白。真实后端上线后按真实逻辑走。
4. **仍缺 TS 类型与单测**：fixtures 与 `_manifest.json` 已经提供了契约，迭代 2 直接照抄即可。
