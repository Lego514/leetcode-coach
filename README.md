# LeetCode Coach（刷題教練）

A local-first study coach for LeetCode interview prep. It decides what to practice today, schedules reviews with spaced repetition, keeps structured notes, and runs timed mock interviews with think-aloud recording. You can use it without an account; signing in syncs your data across devices.

You still solve problems on LeetCode. This app handles the parts around solving: planning, remembering, and explaining.

## Features

- **Study lists**: NeetCode 150, Blind 75 and Grind 169 (213 unique problems), grouped into 18 patterns. You can add any other LeetCode problem.
- **Timed practice with tiered hints**:
  - Starting a problem starts a timer against a target time for its difficulty. The browser tab title shows the timer, so you can see it while you write code on LeetCode.
  - The timer survives a page reload.
  - If you get stuck, open hints one layer at a time: which pattern to use, a hand-written key insight for each of the 213 problems, then the pattern template. A link to the LeetCode solutions comes last.
  - When you finish, the minutes are filled in and a self-rating is suggested based on how many hints you used.
- **Spaced repetition**: after each attempt you rate yourself (solved alone / needed a hint / read the solution / still stuck), and an SM-2–style scheduler picks the next review date.
- **Daily plan**: the Today page lists the reviews that are due plus N new problems in roadmap order. It also works out how many new problems per day you need to finish before a target date.
- **Notes**: for each problem you can keep a one-line idea, an English explanation script, time and space complexity, pitfalls, and your code. Notes save automatically.
- **Pattern cards**: each pattern has recognition signals, common mistakes, and a Python template you can edit.
- **Mock interviews**:
  - A timed, seven-step US interview flow (clarify, examples, brute force, optimize, code, test, complexity) with a checklist and English phrases for each step. The same hint panel is available, the way an interviewer would give hints.
  - Optional audio recording (MediaRecorder) and a self-review after you finish.
  - A two-minute explanation drill.
- **Progress**: a per-pattern mastery grid, a weekly practice chart, an activity calendar, and a breakdown by difficulty.
- **Accounts and offline-first sync**: sign up with email and password to sync attempts, notes, and settings between devices. Everything keeps working offline and without an account.
- **Installable PWA** that works offline, with light and dark themes and JSON backup/restore.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), hand-written CSS with design tokens |
| Build | Vite 8, route-level code splitting, `vite-plugin-pwa` |
| Routing | React Router 8 data router (lazy routes, navigation blocking during practice and mock sessions) |
| Local storage | IndexedDB via Dexie 4, reactive reads with `useLiveQuery` |
| API | Node 24, Hono, zod validation shared with the client |
| Database | PostgreSQL through Drizzle ORM; embedded PGlite for local development and tests |
| Quality | Vitest (unit, API, and end-to-end sync tests), ESLint, GitHub Actions CI |

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
  components/, pages/  UI
shared/              Code used by both sides: ids and the zod request/response schemas
server/              API
  src/app.ts           Hono app: security middleware, routes, static files
  src/auth/            Password hashing, sessions, rate limiting, auth routes
  src/sync/            Sync endpoint and last-write-wins upserts
  src/db/              Drizzle schema, database client (PostgreSQL or PGlite), migration runner
  migrations/          Plain SQL migrations, applied in order at startup
  test/                API tests and two-device end-to-end sync tests
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
npm run lint
npm run typecheck
npm run build:all    # web app into dist/ and API into server/dist/
npm start            # run the built API (and the web app when NODE_ENV=production)
```

- In development the API stores data with PGlite in `server/.data/pglite`. Delete that folder to start over.
- Server settings are read from `server/.env`. See `server/.env.example`.
- The web app still works as a static site without the API: sign-in shows as unavailable and data stays in the browser.
- To regenerate the PWA icons, run `node scripts/generate-icons.mjs`.

## Deploying

`render.yaml` describes a single Render web service that builds both parts and serves them together.

1. Create a PostgreSQL database, for example on Neon, and copy its connection string.
2. On Render, create a Blueprint from this repository and set `DATABASE_URL`.
3. Render provides `RENDER_EXTERNAL_URL`, which the API uses as its allowed origin. On other hosts, set `APP_ORIGINS`.

Migrations run automatically at startup.

## Data and privacy

- **Without an account**, everything stays in the browser's IndexedDB. Export a backup from **Settings** before you switch browsers or clear site data.
- **With an account**:
  - Attempts, notes, tags, pattern notes, custom problems, and settings sync to the server.
  - Audio recordings never leave the device, and backups don't include them either.
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

不登入也能完整使用，資料存在瀏覽器裡。到「設定」註冊或登入後，練習紀錄、筆記和設定會自動同步到雲端，換電腦或換瀏覽器都能接著用；離線時照常記錄，恢復連線後再上傳。錄音只會留在原本的裝置上。

本機開發執行 `npm run dev`，會同時啟動網頁（http://localhost:5173）和後端（內建 PGlite 資料庫，不需要另外安裝）。
