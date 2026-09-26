# ---- 构建阶段 ----
FROM node:22-alpine AS build

WORKDIR /app

# husky 的 prepare 钩子依赖 .git，容器里没有 git 仓库，显式跳过
ENV HUSKY=0

# 先只拷贝依赖清单：依赖没变时可复用 Docker 层缓存，不必重装
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
