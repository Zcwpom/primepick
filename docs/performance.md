# 性能与可访问性基线（Lighthouse）

> 本文所有数字都是**实测**，不是估的。采集方式：`npm run build` → `npm run preview` →
> 对构建产物跑 Lighthouse（headless Chrome，**desktop preset**，本地 `127.0.0.1:4173`，mock 模式
> —— 也就是部署演示时的真实形态）。
>
> 原始报告 `lighthouse-report.json` 体积大且可再生成，已进 `.gitignore`；结论沉淀在这里。

## 一、总览

| 分类 | 首测 | 修复后 | 变化 | 主要由什么带来的 |
| --- | --- | --- | --- | --- |
| Performance | 94 | 94 | = | —— |
| Accessibility | 85 | **97** | **+12** | 表单标签 / 地标 / 标题层级 / 图片 alt |
| Best practices | 81 | **100** | **+19** | 混合内容（http 图片）全部升级为 https |
| SEO | 92 | **100** | **+8** | 图片 alt（SEO 与可访问性共用同一项审计） |

| 指标 | 值 |
| --- | --- |
| First Contentful Paint | 0.5 – 0.7 s |
| Largest Contentful Paint | 1.5 – 1.6 s |
| Total Blocking Time | 30 – 90 ms |
| Cumulative Layout Shift | **0.005** |
| Speed Index | 0.8 – 0.9 s |

> 给区间而不是单个精确值的原因是**单次 Lighthouse 本身有波动**：同一份产物重跑，
> TBT 会在 30/90 ms 之间跳、LCP 会在 1.5/1.6 s 之间跳。声称「TBT 就是 30ms」是不诚实的。

## 二、每项改动对应哪个指标

| 改动 | 影响的审计项 | 规模 |
| --- | --- | --- |
| fixture 资源地址 `http://` → `https://` | `is-on-https`（11 个不安全请求） | 20 个文件 / 59 处 |
| `el-input-number` 补 `aria-label`（带商品名） | `label`（193 项中的 192 项） | **改 1 个组件覆盖约 190 处渲染** |
| 头部 `el-select` 与搜索框补 `aria-label` | `label` | 2 处 |
| Layout 的 `<RouterView>` 包进 `<main>` | `landmark-one-main` | 1 处 |
| 人气推荐 `h3` → `h2` | `heading-order` | 1 处 |
| 轮播图 `alt` 兜底（fixture 无 `title` 字段）+ 页脚二维码 `alt` | `image-alt`、SEO 的 `image-alt` | 6 张图 |
| 首张轮播图 `fetchpriority="high"` | `lcp-discovery-insight` | 未带来可测量改善（见下） |

两个值得记住的点：

1. **`alt` 写了也可能等于没写**。轮播图原本就有 `:alt="item.title"`，
   但 banner fixture 里根本没有 `title` 字段 → Vue 直接不渲染该属性 → 审计判定「缺少 alt」。
   「绑定了一个可能为空的字段」和「有 alt」是两件事。
2. **`is-on-https` 那 11 项不是「本地没上 https」**，而是页面里 11 个 `http://` 图片请求
   （本地 `127.0.0.1` 本身被 Lighthouse 视为安全上下文）。修完混合内容后这一项满分 ——
   也就是说这 +19 分是**部署可用性**的副产品，跟 a11y 无关。

## 三、仍然存在的问题（不装作没有）

### 1. `color-contrast` 614 项 —— 品牌色 token 问题（未修，需产品决策）

按「对比度 + 元素」归组后其实是 9 类：

| 项数 | 对比度 | 元素 | 当前颜色 |
| --- | --- | --- | --- |
| 194 | 2.36:1 | 「加入购物车」按钮、搜索按钮（白字压在品牌金底上） | `#FFFFFF` on `$xtaColor #C4A46C` |
| 192 | 4.27:1 | 商品价格 `p.price` | `$priceColor #C45A4A`（差 0.23 达标） |
| 187 | 3.36:1 | 商品描述 `p.desc` | 灰 |
| 17 | 2.84:1 | 分类快捷入口、人气推荐「更多」 | `#999` |
| 11 | 1.91:1 | 区块副标题 `section-subtitle` | 浅色 |
| 4 | 3.96:1 | 新品卡片价格 | —— |
| 4 | 3.21:1 | 品牌区文字 | —— |
| 4 | 3.11:1 | 分类标题 `h3 > span` | —— |
| 1 | 2.29:1 | 搜索框 placeholder | —— |

**最小改动路径**（按覆盖量排序，全部是 token 级改动）：

| 改哪里 | 从 | 到 | 覆盖 | 副作用 |
| --- | --- | --- | --- | --- |
| `src/styles/element/index.scss` 的 EP `$colors.primary` | `#C4A46C` | `#9C7A38`（4.0:1）或 `#8A6A2F`（5.0:1） | 194 项 | 所有主色按钮/标签变深 |
| `$priceColor` | `#C45A4A` | `#B24A3B` 一类（≥4.5:1） | 192 项 | 价格红变深 |
| `#999` 硬编码 | `#999999` | `#767676`（4.54:1） | ~200 项 | 次要文字整体变深（46 处硬编码） |

**为什么我没有直接改**：这不是「修 bug」，而是**改品牌视觉**。品牌金 `#C4A46C` 是这套设计
的识别色，压暗到 `#8A6A2F` 后按钮会明显变深。这是个产品决策，应该由人拍板，而不是被一个
检查器逼着改 —— 我把分析和精确数值放在这里，随时可以执行。

> 顺带说明：`#C45A4A` 的 4.27:1 只差 0.23，属于典型的「肉眼没问题、但卡在标准线外」，
> 值得单独修；而白字金底的 2.36:1 是**真的不好读**，属于该修的问题。

### 2. LCP 1.5s 的根因：首屏图片不在初始 HTML 里

`lcp-discovery-insight` 报 `requestDiscoverable: false` —— 轮播图是 Vue 挂载后由 JS 渲染的，
浏览器的预加载扫描器在 HTML 里看不到它。加 `fetchpriority="high"` 对这种「发现不了」的
资源帮助有限（实测 LCP 1.5s → 1.6s，在波动范围内）。

**要真正改善需要 SSR / 预渲染**（Nuxt 或 `vite-plugin-prerender`），对当前这个纯 SPA 演示
不划算。这条属于「知道原理、明确不做」。

### 3. 本地 preview 必然失分的三项（部署后不存在）

`cache-insight`、`modern-http-insight`、`network-dependency-tree-insight` 在 `vite preview`
下必然报问题：它不做长缓存、只有 HTTP/1.1。**部署配置里已经处理**：
`vercel.json` / `nginx.conf` 对 `/assets`（文件名带内容 hash）配了一年期 immutable 缓存，
平台侧自动启用 HTTP/2 或 HTTP/3。所以这三项不影响线上表现。

### 4. 只测了桌面端

没有跑 mobile preset（移动端 CPU 节流 4 倍、慢速网络），所以上面这些数字**不能代表手机上的体验**。
要补的话：把 `--preset=desktop` 换成默认（mobile）。

## 四、怎么复现

```bash
npm run build
npm run preview -- --port 4173 --host 127.0.0.1

# 另开一个终端
npx lighthouse http://127.0.0.1:4173/ \
  --chrome-flags="--headless=new --no-sandbox" \
  --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=./lighthouse-report.json
```

分析脚本：把 `lighthouse-report.json` 里 `categories[*].auditRefs` 过滤出 `score < 1` 的审计项，
再按 `details.items` 归组 —— 比盯着总分有用得多（总分只告诉你「有 614 项不合格」，
归组后才看得出「其实只需要改 3 个颜色 token」）。
