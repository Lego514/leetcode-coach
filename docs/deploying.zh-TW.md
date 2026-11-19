# 開發和部署

回到 [README](../README.zh-TW.md)。

資料模型（伺服器的 PostgreSQL 資料表，和瀏覽器裡每一種紀錄跟題目的關係）畫成兩張 ER 圖，在英文的 [Architecture](architecture.md#data-model) 裡。

本機開發執行 `npm run dev`，會同時啟動網頁（http://localhost:5173）和後端（內建 PGlite 資料庫，不需要另外安裝）。`npm test` 跑單元和 API 測試，`npm run test:e2e` 會先建置，再用 Playwright 跑端對端測試。完整的指令和設定請看英文的 [Development](development.md) 和 [Deploying](deploying.md)。

有裝 Docker 的話，`docker compose up --build` 會把正式版的網頁、後端和 PostgreSQL 一起跑起來，打開 http://localhost:8080 就能用，不用裝 Node 或資料庫。映像分兩段建置，最後只留執行需要的檔案，用一般使用者（不是 root）執行，並且有健康檢查。CI 每次都會建映像、用 Compose 跑起來，再對容器跑端對端測試。

部署到 Render＋Neon 的步驟：

1. 到 Neon 建立專案（區域選 AWS US East 2 (Ohio)，跟 Render 同一區），複製連線字串（`postgresql://…?sslmode=require`）。
2. 到 Render 用 GitHub 登入，選 **New → Blueprint**，選這個 repository，`DATABASE_URL` 貼上 Neon 的連線字串。
3. 部署完成後打開 `onrender.com` 的網址，確認 `/api/health` 回傳 `{"ok":true}`。之後 `main` 的 CI 通過就會自動部署。
4. **讓網頁秒開（Cloudflare，選用）**：Render 免費方案會睡，第一次打開要等它醒。`wrangler.jsonc` 把建好的網頁放在 Cloudflare，打開馬上就有；`/api/*` 由 `edge/worker.ts` 在同一個網址轉給 Render（cookie、轉址、使用者的 IP 都照轉）。只有登入、同步、AI 要等伺服器醒來，這段時間 App 照樣離線可用。設定：Cloudflare 建 API token（範本 Edit Cloudflare Workers），和 Account ID 一起設成 repo 的 Actions secrets `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；CI 通過後 `Deploy web to Cloudflare` 就會部署到 `https://leetcode-coach.<子網域>.workers.dev`。接著 Render 的 `APP_ORIGINS` 改成新網址加舊網址（新的放前面）、`APP_URL` 改成新網址，GitHub 登入的 OAuth App callback 也換成新網址，白板共用伺服器的 `ALLOWED_ORIGINS` 加上新網址。

選用的功能，設定了才會打開：
- **AI 回饋**：設定 `ANTHROPIC_API_KEY` 和允許名單 `AI_ALLOWED_EMAILS`（空的代表沒有人，`*` 代表所有人），每人每天預設 20 次。用 Claude Opus 5.5 一次大約 1～3 元台幣。
- **GitHub 登入**：到 GitHub 的 Settings → Developer settings → OAuth Apps 建一個，callback 填 `<網址>/api/auth/github/callback`，再設定 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。
- **每日提醒**：先執行 `npx web-push generate-vapid-keys`，把兩把金鑰設成 `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`；再隨便產生一串長的亂碼當 `CRON_SECRET`，Render 和 GitHub repo 的 Actions secret 都設一樣的。Render 免費方案會睡，所以由 GitHub Actions 每小時呼叫一次 `/api/push/send-due`，把伺服器叫醒並寄出。
- **錯誤追蹤**：設定 `SENTRY_DSN`，網頁和後端出錯時就會自動回報，不用等使用者按「回報問題」。只送錯誤本身，帳號、cookie、請求內容（筆記、逐字稿、密碼）、網址參數和 AI 的輸入輸出都不送。再設定 `SENTRY_AUTH_TOKEN`、`SENTRY_ORG`、`SENTRY_PROJECT` 的話，建置時會上傳 source map，錯誤會指到原本的 TypeScript；source map 上傳完就刪掉，不會公開。沒設定 `SENTRY_DSN` 就完全不載入 Sentry。
- **回報收件匣**：`ADMIN_EMAILS` 列出可以看回報收件匣的帳號。
