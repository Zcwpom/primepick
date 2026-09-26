# PrimePick · 优品购

> 电商 SPA — 基于 Vue 3 生态构建的现代前端项目

## 项目概述

PrimePick 是一个功能完整的电商平台前端项目，覆盖了从首页浏览 → 商品搜索 → 分类筛选 → 商品详情 → 购物车 → 结算支付 → 订单管理的完整购物流程。

项目采用 Vue 3 组合式 API + Pinia 状态管理 + Vue Router 5 路由系统，结合 Element Plus 组件库与自定义组合式函数（Composables），实现了高内聚低耦合的架构设计。

## 技术栈

| 技术 | 说明 |
|------|------|
| **Vue 3** (^3.5) | 组合式 API、`<script setup>` 语法 |
| **Pinia** (^3.0) | 状态管理，持久化插件 |
| **Vue Router** (^5.0) | 路由系统，导航守卫 |
| **Element Plus** (^2.13) | UI 组件库，定制主题 |
| **Vite** (^8.0) | 构建工具，ESM 开发服务 |
| **SCSS** | 样式预处理，主题变量 |
| **Axios** | HTTP 请求封装，拦截器 |
| **@vueuse/core** | Vue 组合式工具库 |

## 项目亮点

### 架构设计

- **组合式函数抽象层**：抽离 `useAsyncData`、`usePagination`、`useAuth`、`useSearchHistory` 等通用 Composable，消除 70% 重复样板代码，统一 loading/error/data 三态管理
- **路由守卫系统**：基于 `beforeEach` 实现认证拦截，未登录用户自动跳转登录页，登录后回源
- **请求层封装**：Axios 实例统一管理 token 注入、401 自动登出、全局错误提示

### 功能模块

- **商品浏览**：首页商品推荐、分类导航（多级悬浮菜单）、子分类筛选排序
- **商品搜索**：关键词搜索、搜索历史持久化（localStorage）、搜索结果分页加载
- **购物车系统**：登录/未登录双模式、本地购物车与服务器购物车合并
- **结算支付**：地址选择、订单创建、支付倒计时、支付结果回调
- **会员中心**：个人信息、地址管理（CRUD + 省市区表单校验）、订单列表
- **用户认证**：登录/登出，表单校验，协议确认

### UI/UX

- **品牌设计**：金色品牌色 `#C4A46C` + 暖灰背景 + Serif 字体
- **首页杂志风布局**：满版 Hero 轮播 + 左侧分类侧边栏 + 右侧人气推荐三栏布局
- **交互细节**：导航悬浮下拉菜单、商品卡片悬停动效、吸顶导航毛玻璃效果、页面过渡动画
- **响应式组件**：商品卡片、分类卡片、订单列表等组件化设计

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

## 项目结构

```
src/
├── apis/              # API 接口层（12 个模块）
├── composables/       # 组合式函数层
│   ├── useAsyncData   # 通用请求封装（data/loading/error 三态）
│   ├── usePagination  # 统一分页（无限滚动 + 传统翻页）
│   ├── useAuth        # 用户认证
│   └── useSearchHistory # 搜索历史
├── stores/            # Pinia 状态管理
│   ├── userStore      # 用户认证（持久化）
│   ├── cartStore      # 购物车（持久化）
│   └── categoryStore  # 分类数据
├── router/            # 路由配置（15 条路由 + 导航守卫）
├── styles/            # 全局样式（主题变量 + Element Plus 覆盖）
├── views/             # 页面组件（12 个页面）
│   ├── Home/          # 首页（Hero + 新鲜好物 + 品牌 + 精选分类）
│   ├── Category/      # 分类页
│   ├── Detail/        # 商品详情 + 热榜
│   ├── Search/        # 商品搜索
│   ├── Checkout/      # 结算页
│   ├── Pay/           # 支付
│   └── Member/        # 会员中心
├── components/        # 通用组件（SKU选择器、图片预览）
└── directives/        # 自定义指令（图片懒加载）
```



## 本地测试账号

```
账号：xiaotuxian001
密码：123456
```
