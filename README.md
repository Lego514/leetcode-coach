# LeetCode Coach（刷題教練）

A local-first study coach for LeetCode interview prep. It decides what to practice today, schedules reviews with spaced repetition, keeps structured notes, and runs timed mock interviews with think-aloud recording. You can use it without an account; signing in syncs your data across devices.

You still solve problems on LeetCode. This app handles the parts around solving: planning, remembering, and explaining.

![Architecture: a React PWA stores data in IndexedDB and syncs through a Hono API on Render to Neon PostgreSQL; the API calls Claude for feedback and Brevo for email; GitHub Actions tests every change before Render deploys](docs/architecture.svg)

## Features

- **Study lists**: NeetCode 150, Blind 75 and Grind 169 (213 unique problems), grouped into 18 patterns. You can add any other LeetCode problem.
- **Timed practice with tiered hints**:
  - Starting a problem starts a timer against a target time for its difficulty. The browser tab title shows the timer, so you can see it while you write code on LeetCode.
  - The timer survives a page reload.
  - If you get stuck, open hints one layer at a time: which pattern to use, a hand-written key insight for each of the 213 problems, then the pattern template. A link to the LeetCode solutions comes last.
  - When you finish, the minutes are filled in and a self-rating is suggested based on how many hints you used.
- **Spaced repetition**: after each attempt you rate yourself (solved alone / needed a hint / read the solution / still stuck), and an SM-2–style scheduler picks the next review date.
- **Daily plan**: the Today page lists the reviews that are due plus N new problems in roadmap order. It also works out how many new problems per day you need to finish before a target date.
  - Any new problem you start counts toward the daily goal, wherever you start it. **One more problem** adds the next one in roadmap order.
  - **Record another problem** finds a problem by number, title, or LeetCode URL. If it isn't in your lists yet, you add its details and record it in the same dialog.
  - **Mark problems I solved before** (on Problems) schedules problems you solved before using the app for review in one go. They don't count toward streaks or session totals.
- **Notes**: for each problem you can keep a one-line idea, an English explanation script, time and space complexity, pitfalls, and your code. Notes save automatically.
- **Pattern cards**: each pattern has recognition signals, common mistakes, and a Python template you can edit.
- **Mock interviews**:
  - A timed, seven-step US interview flow (clarify, examples, brute force, optimize, code, test, complexity) with a checklist and English phrases for each step. The same hint panel is available, the way an interviewer would give hints.
  - Optional audio recording (MediaRecorder) and a self-review after you finish.
  - A two-minute explanation drill.
  - An optional live English transcript (Web Speech API). Afterwards you can fix it, see your word count, speaking pace, and filler words, and save it as the problem's explanation script.
  - **AI feedback (Claude)** on the transcript: a 0–2 score for each of the five explanation points with comments, strengths, concrete rewrites of unclear phrases, and a model answer you can save as your script. Requires an account; the server holds the API key and enforces a daily limit per user.
- **Progress**: a per-pattern mastery grid, a weekly practice chart, an activity calendar, and a breakdown by difficulty.
- **Accounts and offline-first sync**: sign up with email and password to sync attempts, notes, and settings between devices. Everything keeps working offline and without an account. Passwords can be reset by email, and the password fields have a show/hide toggle.
  - A reset link works once, expires in an hour, and signs you out on other devices. It needs `BREVO_API_KEY` and `MAIL_FROM`; without them the feature is hidden.
- **English and Traditional Chinese**: the whole app is translated, including the pattern cards, all 213 hints, and the interview flow. It follows the browser language by default, and you can switch from the sidebar or Settings.
- **Installable PWA** that works offline, with light and dark themes and JSON backup/restore. New versions install themselves and reload the page, except during a timed practice or mock session, where a small "reload" link appears instead.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), hand-written CSS with design tokens |
| Build | Vite 8, route-level code splitting, `vite-plugin-pwa` |
| i18n | Typed dictionaries without a library: the English dictionary must match the Chinese one key for key, and sentences with links use inline tags |
| Routing | React Router 8 data router (lazy routes, navigation blocking during practice and mock sessions) |
| Local storage | IndexedDB via Dexie 4, reactive reads with `useLiveQuery` |
| API | Node 24, Hono, zod validation shared with the client |
| Database | PostgreSQL through Drizzle ORM; embedded PGlite for local development and tests |
| Quality | Vitest (unit, API, and two-device sync tests), Playwright end-to-end tests against the production build and a real PostgreSQL, ESLint, GitHub Actions CI |
| AI | Claude Opus 5 through the Anthropic TypeScript SDK, JSON-schema structured output, server-side refusal fallback, per-user daily quota stored in PostgreSQL |
| Hosting | Render (one Node service for the API and the web app), Neon PostgreSQL |

## Architecture

```
src/                 Web app
  data/                Static content: problems, lists, patterns, hints, interview steps
  lib/                 Pure logic: scheduler, dates, stats, catalog, practice session
  store/               Data layer
    db.ts                Dexie schema (v2 adds sync ids, the outbox, and sync state)
    actions.ts           Every local write; each one also records a change in the outbox
    queries.ts           Every read, as React hooks
    tracking.ts          Local record ⇄ sync payload conversion, schedule replay
    sync.ts              Sync engine (push outbox, pull changes, apply)
    cloud.ts             Account state and automatic sync scheduling
  i18n/                Locale detection, typed dictionaries (zh-TW, en), date formatting
  components/, pages/  UI
shared/              Code used by both sides: ids and the zod request/response schemas
server/              API
  src/app.ts           Hono app: security middleware, routes, static files
  src/auth/            Password hashing, sessions, password reset, rate limiting, auth routes
  src/mail/            Brevo email client and the reset message
  src/sync/            Sync endpoint and last-write-wins upserts
  src/ai/              Explanation feedback: Claude prompt and output schema, quota-limited route
  src/db/              Drizzle schema, database client (PostgreSQL or PGlite), migration runner
  migrations/          Plain SQL migrations, applied in order at startup
  test/                API tests and two-device end-to-end sync tests
e2e/                 Playwright tests: practice and review, mock interview with a transcript, language, sync between two browsers
```

In production a single Node service serves both `/api` and the built web app. The browser only talks to its own origin, so the session cookie can be `SameSite=Lax` and the API needs no CORS. In development, Vite proxies `/api` to the API server.

### Offline-first sync

- **Writes are local first.** Every write goes to IndexedDB, together with an entry in an *outbox* in the same transaction. The outbox keeps one entry per record, with the time of the latest local change.
- **One request pushes and pulls.** `POST /api/sync` sends up to 500 outbox changes and the client's cursor. The server applies the changes, then returns every record whose version is newer than the cursor.
- **Conflicts: last write wins.** The server keeps one row per `(user, collection, key)` in a JSONB document table. An upsert replaces a row only if the incoming change is strictly newer. Rejected changes come back with the server's current copy.
- **Deletes are tombstones**, so every device learns about them and an older write cannot bring a record back.
- **Server versions come from a Postgres sequence.** Each user's sync runs under a transaction-scoped advisory lock, so versions are assigned in commit order and a cursor never skips a change.
- **Stale pulls never overwrite newer local edits.** When a pulled change arrives, the client keeps its own version if an outbox entry for that record is newer.
- **Review schedules are not synced.** They are rebuilt by replaying attempts in time order, so two devices practicing offline never overwrite each other's schedule.
- **First sign-in merges existing data.** On a device that already has local data, every record is queued for upload:
  - Records with a real modification time (attempts, notes) keep it.
  - Records without one (settings, tags) are sent with time 0. If the account already has that record, the account's version wins.
- **Audio recordings stay on the device.**

Known limitation: conflicts are decided by each device's clock.

### Security

- **Passwords** are hashed with scrypt (N=2^15) and a random salt. A failed login for an unknown email still runs a dummy hash, so response times don't reveal which emails are registered.
- **Session tokens** are random 256-bit values. The database stores only their SHA-256 hash.
- **The session cookie** is `HttpOnly` and `SameSite=Lax`. In production it is also `Secure` and uses the `__Host-` prefix. Sessions last 30 days and renew when used.
- **CSRF**: writes must be `application/json`, which a cross-site browser request can't send without a CORS preflight that this API never grants. Requests from foreign `Origin`s and requests marked `Sec-Fetch-Site: cross-site` are rejected.
- **Rate limits** apply to registration and to login attempts, per IP and per IP-plus-email.
- **Other protections**: request bodies are size-limited, security headers are set, and API responses are `no-store`.
- **Input validation**: every synced record is checked against a per-collection zod schema, and unknown fields are dropped.

### Review scheduling

| Self-rating | Next interval | Ease |
| --- | --- | --- |
| Solved alone | 4 days, then 10 days, then previous × ease | +0.10 |
| Needed a hint | 2 days, then max(previous + 1, previous × 1.2) | −0.15 |
| Read the solution | 1 day (streak resets) | −0.20 |
| Still stuck | 1 day (streak resets) | −0.30 |

- Ease stays between 1.3 and 3.0, and no interval is longer than 120 days.
- Intervals of 30 days or more count as "mastered".

## Getting started

Requires Node 24. No database install is needed for development.

```bash
npm install
npm run dev          # web on http://localhost:5173 and API on http://localhost:8787
npm test             # web unit tests, then API and end-to-end sync tests
npm run test:e2e     # build, then run the Playwright tests in Chromium
npm run lint
npm run typecheck
npm run build:all    # web app into dist/ and API into server/dist/
npm start            # run the built API (and the web app when NODE_ENV=production)
```

- In development the API stores data with PGlite in `server/.data/pglite`. Delete that folder to start over.
- Server settings are read from `server/.env`. See `server/.env.example`.
- The web app still works as a static site without the API: sign-in shows as unavailable and data stays in the browser.
- To regenerate the PWA icons, run `node scripts/generate-icons.mjs`.
- The Playwright tests start the built server on port 4310 with an in-memory PGlite database. Set `E2E_DATABASE_URL` to run them against PostgreSQL, as CI does. The first time, run `npx playwright install chromium`.

## Deploying

`render.yaml` describes a single Render web service that builds both parts and serves them together. Both Render and Neon have free plans.

1. **Database (Neon)**
   1. Sign in at [neon.tech](https://neon.tech) and create a project. Pick **AWS US East 2 (Ohio)**, the same region as the Render service in `render.yaml`, so queries stay fast. If you are closer to another region, change `region` in `render.yaml` to match before creating the service — a service's region cannot be changed later.
   2. On the project dashboard, click **Connect** and copy the connection string. It looks like `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`. Either the direct or the pooled (`-pooler`) string works; the API turns off prepared statements for pooled connections.
2. **Web service (Render)**
   1. Sign in at [render.com](https://render.com) with GitHub and allow access to this repository.
   2. Choose **New → Blueprint**, select the repository, and paste the Neon connection string as `DATABASE_URL` when asked.
   3. Render builds and starts the service. Migrations run automatically at startup. When the deploy finishes, open the `onrender.com` URL and check `/api/health`.
3. **Later deploys** happen automatically when a commit on `main` passes CI (`autoDeployTrigger: checksPass`).

Notes:

- Render provides `RENDER_EXTERNAL_URL`, which the API uses as its allowed origin. With a custom domain, or on another host, set `APP_ORIGINS` (comma-separated).
- On the free plan the service sleeps after 15 minutes without traffic, so the first request after that takes about a minute.
- Idle database connections close after 60 seconds so Neon can suspend, and the health check doesn't touch the database.
- Settings: `DATABASE_URL` (required), `APP_ORIGINS`, `PORT`, `TRUST_PROXY` (default on in production), `STATIC_DIR`, `ANTHROPIC_API_KEY` (optional; AI feedback is off without it), `AI_DAILY_LIMIT` (default 20 per user per day), `BREVO_API_KEY` / `MAIL_FROM` / `MAIL_FROM_NAME` / `APP_URL` (optional; password reset email).
- **Password reset email** uses [Brevo](https://www.brevo.com), whose free tier covers roughly 300 emails a day. Create an API key, verify the sender address, then set `BREVO_API_KEY` and `MAIL_FROM` (the verified address). `APP_URL` defaults to the first allowed origin and is only needed when the link should point somewhere else.
- **AI feedback** needs an API key from the [Claude Console](https://platform.claude.com). Add it as `ANTHROPIC_API_KEY` on Render (or in `server/.env` locally). Each request costs roughly US$0.03–0.08 with Claude Opus 5, so 20 drills a month is about US$1–2. Setting a monthly spend limit in the Console is a good safety net.

## Data and privacy

- **Without an account**, everything stays in the browser's IndexedDB. Export a backup from **Settings** before you switch browsers or clear site data.
- **With an account**:
  - Attempts, notes, tags, pattern notes, custom problems, and settings sync to the server.
  - Audio recordings never leave the device, and backups don't include them either.
  - Transcripts are saved with the mock session and sync like the rest of your data.
- **Transcripts** are optional and use the browser's speech recognition. Chrome sends the audio to Google's servers to turn it into text.
- **AI feedback** sends the transcript text and the problem's title to Anthropic's API only when you press the button. The server stores daily request and token counts per user, not the transcript itself.
  - Deleting the account removes it and all of its server data.
- **Signing out** can either keep the local copy or clear it (for shared computers).
- **Problem statements are not included.** The app stores only titles and links to leetcode.com.

## Roadmap

- **AI assistance (Claude API)**: hints that react to your own code, code review, an AI interviewer that asks follow-ups, and feedback on spoken explanations. These would run through the API so the key never reaches the browser.
- **Account recovery and more sign-in options**: password reset by email, and signing in with GitHub.
- **Behavioral prep**: a STAR story bank, system design notes, and a job application tracker.

---

## 中文說明

這是一個幫忙準備美國軟體工程師面試的刷題教練。題目還是在 LeetCode 上寫，這個 App 負責三件事：

- 決定今天該刷哪些題
- 計時作答，卡住時一層一層給提示，再用間隔複習排好每一題的複習日
- 用模擬面試練習把解法講清楚

介面有繁體中文和英文，預設跟著瀏覽器語言，可以在側邊欄或「設定」切換，每台裝置各自記住。模板卡、213 題的提示和面試流程都有英文版，適合練習用英文思考。

今天頁會算進所有開始的新題，不管是從哪裡開始的；做完每日目標還可以「再來一題」，清單以外的題目用「記錄其他題目」輸入題號或網址就能記錄。以前刷過的題目可以在題庫用「標記以前刷過的題」一次排進複習，不會算進連續天數和練習次數。

模擬面試可以開啟英文逐字稿（瀏覽器的語音辨識，Chrome 會把聲音送到 Google 轉成文字）。結束後可以修正內容、看字數、語速和贅詞，再一鍵存成這題的講解稿。登入後還可以按「取得 AI 回饋」，由 Claude 依五個重點評分、指出講不清楚的句子並給參考講法（逐字稿會送到 Anthropic；伺服器要設定 `ANTHROPIC_API_KEY`，每人每天預設 20 次，一次約 1～3 元台幣）。

不登入也能完整使用，資料存在瀏覽器裡。忘記密碼可以用 email 重設（伺服器要設定 Brevo 的 `BREVO_API_KEY` 和 `MAIL_FROM`，免費方案每天約 300 封）。到「設定」註冊或登入後，練習紀錄、筆記和設定會自動同步到雲端，換電腦或換瀏覽器都能接著用；離線時照常記錄，恢復連線後再上傳。錄音只會留在原本的裝置上。

本機開發執行 `npm run dev`，會同時啟動網頁（http://localhost:5173）和後端（內建 PGlite 資料庫，不需要另外安裝）。`npm run test:e2e` 會先建置，再用 Playwright 跑端對端測試。

部署到 Render＋Neon 的步驟：

1. 到 Neon 建立專案（區域選 AWS US East 2 (Ohio)，跟 Render 同一區），複製連線字串（`postgresql://…?sslmode=require`）。
2. 到 Render 用 GitHub 登入，選 **New → Blueprint**，選這個 repository，`DATABASE_URL` 貼上 Neon 的連線字串。
3. 部署完成後打開 `onrender.com` 的網址，確認 `/api/health` 回傳 `{"ok":true}`。之後 `main` 的 CI 通過就會自動部署。

免費方案閒置 15 分鐘會休眠，之後第一次開啟大約要等一分鐘。
