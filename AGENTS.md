# AGENTS.md：給 AI 協作者的交接說明

這份給在這個 repo 工作的 AI（Codex、Claude Code 等）看。先讀完再動手；做了跟這裡衝突的改動，順便更新這份。

## 這是什麼

**刷題教練（LeetCode Coach）**：幫忙準備美國軟體工程師面試的 PWA。題目還是在 LeetCode 上寫，這個 App 決定今天練哪幾題、用 FSRS 排複習、記筆記和解題步驟、計時模擬面試、用英文講解並拿 AI 回饋、行為面試的故事庫、微複習卡片、白板。

- 線上：https://leetcode-coach-f6q7.onrender.com（Render 免費方案，閒置會睡，第一次開要等約一分鐘）
- Repo：https://github.com/Lego514/leetcode-coach（公開）
- 白板是另一個 repo：https://github.com/Lego514/dsa-whiteboard（本機 `C:\dev\dsa-whiteboard`），這裡用 `"dsa-whiteboard": "github:Lego514/dsa-whiteboard#vX.Y.Z"` 裝進來
- 使用者：2026 年畢業的 MSCS 國際學生，正在找工作，用 Python 刷題，講解解法是最弱的地方。技術選擇要放得上新鮮人的履歷。

## 跟使用者合作的方式

- **用繁體中文回覆。** 使用者用繁中下指令；程式碼的註解也是繁中，說明「為什麼」。
- **流程**：開分支做 → 自己驗證（測試、改到畫面就截圖）→ 用繁中報告做了什麼、怎麼驗證的 → **等使用者說「commit 並開 PR」才 commit、push、開 PR**。
  - 「合併」＝CI 通過後合併那個 PR（`gh pr merge N --merge`），再把本機 main 拉到最新、刪掉分支。CI 還在跑時使用者說合併，先說明再照做。
  - 「開啟自動修正」是 Claude Code 桌面版的功能；Codex 沒有的話，CI 失敗時自己修到綠燈。
  - 不要直接 push 到 main，不要自己合併，不要開 auto-merge。
- **commit 訊息**：英文，第一行寫使用者看得到的改變（不寫 "feat:" 之類的前綴），內文寫為什麼和怎麼做。PR 描述分「What changes」和「Tests」兩段。
- 使用者看不到你的工具輸出，報告要自己說清楚：做了什麼、驗證結果（幾個測試過）、還沒驗證的部分、需要使用者做的事。

## 絕對不要做

- 不要 commit 或貼出任何秘密（API key、token、密碼、client secret）。秘密都由使用者自己設在 Render 或 GitHub。DSN、Account ID、公開網址這類不是秘密。
- 不要代使用者註冊帳號、登入、輸入密碼。需要外部服務（Sentry、GitHub OAuth App、Cloudflare…）時，寫好步驟請使用者做。
- 從這台電腦呼叫要付費的 API（Claude API）之前先問。
- 改 repo 設定、GitHub secrets/variables、Render 設定之前先問。

## 指令

需要 Node 24。開發不用另外裝資料庫（用 PGlite）。

```bash
npm install
npm run dev          # 網頁 http://localhost:5173 + API http://localhost:8787（Vite 把 /api 轉給 API）
npm test             # 前端單元測試，再跑後端（API、同步）測試
npm run typecheck    # 前端 tsc -b + 後端 tsc
npm run lint
npm run build:all    # 網頁到 dist/、API 到 server/dist/
npm run test:e2e     # 建置後跑 Playwright（只跑 Chromium）
npx playwright test  # 跑 Chromium 和 iPhone（WebKit）；要先 build:all
docker compose up --build   # 整套（網頁 + API + PostgreSQL）在 http://localhost:8080
```

## 架構地圖

```
src/                 React 19 + TypeScript 前端（PWA，hash 路由 #/…）
  store/             IndexedDB（Dexie）、所有寫入（actions.ts）、同步（sync.ts、tracking.ts）、帳號（cloud.ts）
  lib/               不含 React 的純邏輯：FSRS（srs.ts）、統計、卡片、衝刺計畫、錯誤追蹤…（大部分單元測試在這）
  pages/、components/ 畫面；components/board/ 把 dsa-whiteboard 接上存檔、同步、講解模式、共用
  data/              題庫、模式、提示、參考講解（explanations/ 延遲載入）、行為面試題
  i18n/messages/     介面文字，zh-TW.ts 和 en.ts 兩份
server/              Hono API（Node 24），esbuild 打包成 server/dist/index.js
  src/auth/          密碼登入、session、重設密碼、GitHub 登入（github.ts）
  src/sync/          同步（通用的 records 表，last-write-wins by updatedAt）
  src/ai/            Claude 回饋（Opus 5.5，JSON schema 結構化輸出、每日額度）
  migrations/        SQL migration，依檔名順序在啟動時套用；src/db/schema.ts 要跟著改
shared/              前後端共用：protocol.ts（zod schema、API 型別）、constants.ts、prompts.ts
e2e/                 Playwright；fake-github.mjs 是測試用的假 GitHub
```

## 一定要守的規則

- **所有本機寫入都經過 `src/store/actions.ts`**，並在同一個交易裡呼叫 `track()` 記進待上傳清單（outbox），登入後才同步得出去。
- **複習排程（progress）是從練習紀錄（attempts）算出來的，不同步**：改了 attempts 要 `rebuildProgress()`。
- **介面文字只放在 `src/i18n/messages/{zh-TW,en}.ts`**：兩份的 key 要一樣（有測試檢查），其他檔案裡出現中文字會讓測試失敗。
- **改資料格式**：先改 `shared/protocol.ts` 的 zod schema；資料庫要加 `server/migrations/000N_*.sql` 並同步改 `server/src/db/schema.ts`；server 測試裡的 migration 清單（`server/test/infra.test.ts`）也要加。
- **新的環境變數**：`server/src/env.ts`、`render.yaml`、`server/.env.example`、README 的 Deploying 一節都要加。
- **Dexie 不要用會開 key cursor 的查詢**（`uniqueKeys`、`eachKey`）：iOS 上會丟 "Unable to open cursor"。整張讀出來用 JS 處理。
- **隱私**：錯誤追蹤（Sentry）不能送使用者資料，規則在 `src/lib/monitoring.ts`、`server/src/monitoring.ts`；新增的 log 不要帶 email、筆記、逐字稿。
- **白板功能改在 dsa-whiteboard repo**，這裡只負責接上存檔和講解模式。發新版的流程見那邊的 AGENTS.md。
- 新增的套件釘版本（exact），選發佈超過一週的版本；看 `node_modules` 裡的型別確認 API（例如 Sentry v11 用 `dataCollection`，不是 `sendDefaultPii`）。

## 測試

- 每個改動都要有測試：純邏輯寫單元測試（`src/**/*.test.ts`、`server/test/`），畫面流程寫 Playwright（`e2e/`）。
- **e2e 跑的是正式建置**：Playwright 會用 `npm start` 開 API（port 4310，記憶體 PGlite）和假 GitHub（port 4320），所以改了程式要先 `npm run build:all`，不然測到的是舊版。
- 需要登入的 e2e 標 `@desktop`：正式模式的 cookie 是 Secure，WebKit 在 http://localhost 不收。
- **本機的 iPhone 測試不可信**：這台 Windows 電腦的顯示縮放是 125%，模擬的 iPhone 寬度變成 312px，底部分頁列會擋住按鈕，有幾個測試在 main 上也會失敗。iPhone 的結果看 CI（Linux）。截手機畫面用 Chromium 加 390×844、isMobile。
- 外部服務一律用假的：GitHub 用 `e2e/fake-github.mjs`；白板共用的 WebSocket 用 `page.routeWebSocket`（見 `e2e/board-share.spec.ts`）。注意 `page.route` 攔不到轉址（302）之後的請求。
- 截圖確認畫面：寫一個暫時的 `e2e/zz-*.tmp.spec.ts` 截圖，用完刪掉。

## CI 與部署

- CI（`.github/workflows/ci.yml`）有三個工作：`check`（lint、typecheck、單元測試、建置）、`e2e`（PostgreSQL 17，Chromium + iPhone）、`docker`（用 compose 建映像跑起來，再對容器跑一部分 e2e）。
- Render 在 main 的 CI 通過後自動部署（`render.yaml`，`autoDeployTrigger: checksPass`），啟動時跑 migration。
- Render 上的設定（使用者設，不在 repo 裡）：`DATABASE_URL`（Neon）、`ANTHROPIC_API_KEY`、`AI_ALLOWED_EMAILS`、`BREVO_API_KEY`/`MAIL_FROM`；`ADMIN_EMAILS` 不確定有沒有設。還沒設定的：`SENTRY_DSN`（錯誤追蹤）、`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`（GitHub 登入）。沒設定時那個功能就不出現。
- 白板共用伺服器在 dsa-whiteboard 的 Cloudflare Worker；網址放在 `.env.production` 的 `VITE_COLLAB_URL`（公開設定，建置時用）。

## 這台電腦的坑（Windows）

- Shell 是 Git Bash / PowerShell。檔案一律用 LF；Python 寫檔用 `write_bytes`（`write_text` 會變 CRLF），中文內容用 `python -X utf8`。
- Bash heredoc 很長或有反斜線時容易壞掉，改用編輯工具寫檔。
- 後端開發用 `node --watch --import tsx`，不要換成 `tsx watch`（在 Windows 會卡住）。
- 沒有安裝 Docker；Docker 相關的只能在 CI 驗證。
- 用到的 port：5173（Vite）、8787（API 開發）、4310（e2e API）、4320（假 GitHub）、8080（Docker）。測完記得把自己開的 server 關掉。
- `LEARN.md`、`docs/resume.md` 是使用者自己的筆記，在 `.git/info/exclude` 裡，不要 commit 也不要改。

## 多個 AI 一起工作

- 動手前先 `git pull` main，看 `gh pr list` 有哪些 PR 開著，不要改到別人正在改的檔案；真的要改，等那個 PR 合併後再從新的 main 開分支。
- 一個改動一個分支、一個 PR。Codex 的分支用 `codex/<主題>` 開頭，Claude 用 `feature/`、`fix/`、`docs/`，一看就知道是誰的。
- 不要在別人的分支上 commit，除非使用者要你接手。
- 做完重要的功能，把這份的「規則」「待辦」更新一下，下一個接手的才不會踩一樣的坑。

## 待辦（使用者提過、還沒做的）

- 使用者要做的設定：Render 加 `SENTRY_DSN`；建 GitHub OAuth App 並設定 `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`（callback 是 `https://leetcode-coach-f6q7.onrender.com/api/auth/github/callback`）。
- 跟朋友互相模擬面試（面試官看題目和評分表，兩邊共用白板）。
- 講解能力的進步曲線（講解練習、AI 追問的分數趨勢）。
- 每日推播提醒、求職進度追蹤、資料模型的 ER 圖（Mermaid）。
