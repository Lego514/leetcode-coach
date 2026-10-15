# syntax=docker/dockerfile:1

# 刷題教練：一個 Node 服務同時提供網頁和 API，跟 Render 上的部署一樣。
# 兩段建置：第一段裝所有套件、建前端和後端；第二段只放執行需要的檔案。

FROM node:24-bookworm-slim AS build
WORKDIR /app
# dsa-whiteboard 是從 GitHub 裝的套件，npm 需要 git
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# 先只複製套件清單，程式碼改了也能沿用安裝好的那一層
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --include=dev
COPY . .
# .env.production 裡是公開的設定（白板共用伺服器的網址），建前端時會用到
RUN npm run build:all \
  && npm prune --omit=dev \
  && rm -rf server/src server/test

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
# 健康檢查不碰資料庫；agent: false 用完就關連線，程式馬上結束
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:' + process.env.PORT + '/api/health', { agent: false }, (r) => { process.exitCode = r.statusCode === 200 ? 0 : 1; r.resume(); }).on('error', () => { process.exitCode = 1; })"
# 啟動時會先跑資料庫 migration
CMD ["node", "server/dist/index.js"]
