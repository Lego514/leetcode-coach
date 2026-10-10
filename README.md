# LeetCode Coach（刷題教練）

A local-first study coach for LeetCode interview prep. It decides what to practice today, schedules reviews with spaced repetition, keeps structured notes, and runs timed mock interviews with think-aloud recording. You can use it without an account; signing in syncs your data across devices.

You still solve problems on LeetCode. This app handles the parts around solving: planning, remembering, and explaining.

**Live app:** https://leetcode-coach-f6q7.onrender.com — it runs on free hosting that sleeps when idle, so the first visit after a while can take about a minute to wake up. After that it's fast, and once loaded it keeps working offline.

![Architecture: a React PWA (with a custom whiteboard and spaced-repetition flashcards) stores data in IndexedDB and syncs through a Hono API on Render to Neon PostgreSQL; the API calls Claude for feedback and Brevo for email; GitHub Actions tests every change on Chromium and iPhone WebKit before Render deploys](docs/architecture.svg)

## Features

- **Study lists**: NeetCode 150, Blind 75 and Grind 169 (213 unique problems), grouped into 18 patterns. You can add any other LeetCode problem.
- **Timed practice with tiered hints**:
  - Starting a problem starts a timer against a target time for its difficulty. The browser tab title shows the timer, so you can see it while you write code on LeetCode.
  - The timer survives a page reload.
  - If you get stuck, open hints one layer at a time: which pattern to use, a hand-written key insight for each of the 213 problems, then the pattern template. A link to the LeetCode solutions comes last.
  - When you finish, the minutes are filled in and a self-rating is suggested based on how many hints you used.
- **Solving steps**: practice, mock interviews, and the problem page share the seven interview steps (clarify, examples, brute force, optimize, code, test, complexity), and you write one line per step. Examples split into an example and its edge cases, and Optimize asks three questions: what's slow, what's repeated, and what to keep. The lines are saved with the problem's notes and synced, so a review starts from how you thought it through, not just the code. In a mock interview they sit under each step's checklist.
  - **Write the script from your steps**: a dialog lays out the five sentences of the English explanation script, each with the step notes that feed it (for example, the edge-case sentence shows your edge cases). You write each sentence yourself, which is the practice, and save it as the problem's script.
  - **Hints that start from where you're stuck**: pick the step you're stuck on to see how to think about it, next to what you wrote in the step before. This doesn't count as a hint. Optimize and Code can jump straight to the key insight or the template.
- **Spaced repetition**: after each attempt you rate yourself (solved alone / needed a hint / read the solution / still stuck), and an SM-2–style scheduler picks the next review date.
- **Daily plan**: the Today page lists the reviews that are due plus N new problems in roadmap order. At the top, a progress bar and three numbers show how much of the list is left, your daily pace, and when you'll finish the first pass. With a target date set, they show the days left and how many new problems a day you need, flagged when your daily goal is too low.
  - Any new problem you start counts toward the daily goal, wherever you start it. **One more problem** adds the next one in roadmap order.
  - **Record another problem** finds a problem by number, title, or LeetCode URL. If it isn't in your lists yet, you add its details and record it in the same dialog.
  - **Mark problems I solved before** (on Problems) schedules problems you solved before using the app for review in one go. A big batch is spread out so no more than five problems come due on any day, counting reviews already scheduled. They don't count toward streaks or session totals.
- **Notes**: for each problem you can keep a one-line idea, an English explanation script, time and space complexity, pitfalls, and your code. Notes save automatically.
- **Pattern cards**: each pattern has recognition signals, common mistakes, and a Python template you can edit.
- **Reference explanations**: a hand-written model answer in English for each of the 213 problems, in five sentences (key insight, data structure, example, complexity, edge case). It stays collapsed until you've tried explaining it yourself, and it's shown next to your own attempt after an explanation drill.
- **Flashcards for spare minutes**: five tap-only cards per round, about a minute, sized for a phone between gym sets.
  - Cards are generated from your own data:
    - which pattern a problem uses
    - its key insight and its complexity (distractors come from the same pattern, and patterns a clue could also fit are never offered against each other)
    - an "explain it out loud, then flip" card
    - the pattern signals
    - 59 Python tips whose answers were checked by running the code
  - **I don't know** shows the answer instead of rewarding a lucky guess.
  - Missed cards come back at the end of the round with reshuffled options until you get them right, and the summary lists them with their answers.
  - Practice everything, only problems you've done, only clues, only Python tips, or one pattern.
  - A **rest timer** (60–180 seconds) counts down between sets. When it ends it beeps, vibrates where supported, and shows an alert, and it asks the browser to keep the screen on while it runs.
  - Answers save one at a time, sync like attempts, and count toward the streak.
- **Whiteboard, built from scratch**: drag arrays, pointers, stacks, queues, dicts, sets, 2D arrays, variables, binary trees, linked lists, graphs, heaps, recursion trees, DP tables, intervals, tables, text, code, and sticky notes onto a pannable, zoomable canvas to trace an idea by hand.
  - **Range frames** box the cells between two pointers on the same array and follow them as they move, for sliding windows: select the two pointers and choose "Frame between pointers".
  - **Templates** set up a common scene in one click, with the pointers already named: two pointers, sliding window, reversing a linked list, tree DFS, grid BFS, and backtracking (the subsets decision tree with `path` and a `cur` pointer). The whole group is placed in free space and selected so it can be dragged at once.
  - The palette is grouped by how often problems use each element, with line icons. Text switches to a heading from the selection bar.
  - **Pointers** snap to array cells, step with the arrow keys, and are colored by name (i, j, k, l).
  - **Single cells** can be selected one at a time to highlight them, put a pointer on them, insert next to them, or delete them. Pointers and highlights follow their values when cells move. A dashed "+" adds cells, rows, and columns.
  - **Linked lists** are one element:
    - Each link between two nodes cycles between forward, reversed, and cut with a click, so reversing a list can be traced link by link.
    - The tail can point back to any node to show a cycle.
    - Pointers such as prev, curr, and next snap under nodes.
  - **Binary trees** lay themselves out in order, so a binary search tree reads sorted from left to right.
    - Pick a node to add a left or right child from a dashed slot, color it, or delete its subtree.
    - Pointers sit above nodes and move to a child or the parent with the arrow keys.
    - Up to six levels.
  - **Graphs** lay their nodes out on a circle.
    - Directed graphs get arrowheads, and opposite edges between the same two nodes curve apart.
    - Edges can carry weights and be marked as visited.
    - Pick a node to connect it to another, color it, add a pointer, or delete it. Pick an edge to mark it, weigh it, or delete it.
    - Up to 20 nodes and 60 edges.
  - **Heaps** draw the same values as a tree and as an array with indices, or either one alone.
    - Push and Pop sift values into place by the heap rules; "Record each step for playback" saves every swap as a step, captioned like `swap 0 ↔ 2`.
    - Switch between a min-heap and a max-heap. Nodes that break the order turn red, and Heapify fixes them all at once.
    - Values compare as numbers when they are numbers. Up to 31 values (five levels).
  - **Recursion trees** draw one node per call, laid out top-down so each caller sits over its calls, for backtracking, memoized DP, and tries.
    - Pick a call to add a child call, write its return value or the choice on the edge above it, or prune the branch (drawn dashed and faded).
    - "Color repeated calls" gives calls with the same label the same color, which shows what memoization would save.
    - A pointer steps through the calls in DFS order with ← →, and back to the caller with ↑, so a trace can be recorded step by step.
    - Up to 63 calls and eight levels.
  - **DP tables** fill one cell at a time, 1D (`dp[i]`) or 2D (`dp[i][j]`), with the strings or numbers from the problem written beside the rows and columns.
    - Choose what each cell depends on (`dp[i-1], dp[i-2]`, every earlier `dp[j]`, `dp[i-k]` for coins, up/left/diagonal, or `dp[i+1][j-1]` filled from the bottom row for palindromes). The cell being filled then shows arrows from those cells, as arcs under a 1D table.
    - Type the value in the selection bar and press Enter to move to the next empty cell. With "Record each filled cell" on, every cell becomes a playback step captioned like `dp[2][3] = 2`, so the whole fill order can be replayed.
    - Up to 26 rows and 30 columns.
  - **Intervals** sit on one number line with round ticks, one row per interval, so overlaps line up, for Merge Intervals, Insert Interval, Meeting Rooms, and the like.
    - "Sort by start" is the first step of merging. Pick an interval to change its start or end, merge it with the next row when they overlap (touching ends count), mark it removed (dashed), or color it.
    - The sweep line stops at each start and end point and shows how many intervals are in progress there, counting starts but not ends, so its peak is the answer to Meeting Rooms II.
    - Up to 30 intervals.
  - **Code boxes** look and type like LeetCode's editor: a `Python3` header, line numbers, and Python colors in VS Code's light and dark themes, with no wrapping and the box sized to the code. New boxes start from a `class Solution:` template.
    - While editing, the colors stay on screen: a transparent text box sits exactly over the highlighted code. Tab and Shift+Tab indent and outdent, Enter keeps the indentation (one more level after a colon), and Backspace in the indentation removes a level.
  - **Code tracing** turns a code box into a dry run, the Test step of an interview.
    - "Trace line by line" highlights the line running. Move with ↑ ↓ or by clicking a line; blank lines are skipped.
    - With "Record each line" on, every move first saves the board as a step with the line that just ran highlighted. Update the variables and arrays beside it as you go, and playback replays the whole run, with room for a one-line note per step.
  - **Build from text**: arrays, stacks, queues, heaps, sets, dicts, 2D arrays, linked lists, trees, graphs, recursion trees, DP tables, and intervals can all be filled by pasting a problem's example instead of typing cell by cell:
    - `nums = [2,7,11,15], target = 9` takes the first value and renames the element `nums`
    - `"abcabcbb"` splits into characters
    - `{'a': 1}` or JSON for dicts, and `[[1,0],[0,1]]` for grids
    - `1->2->3` and `head = [...]` for linked lists, and LeetCode's level order `[3,9,20,null,null,15,7]` for trees
    - `n = 5, edges = [[0,1],[0,2]]` (with optional weights) or an adjacency list (0- or 1-based) for graphs
    - an indented outline for recursion trees, one call per line, such as `f(3) => 2` with `n-1 | f(2)` underneath (`|` puts a label on the edge, `=>` adds a return value); the output of the `tree` command also works
    - the problem's own input for DP tables: `text1 = "abcde", text2 = "ace"` makes a 6×4 table with the letters beside it, `m = 3, n = 7` a 3×7 grid, `n = 5` six cells, `coins = [1,2,5], amount = 11` twelve cells that look back 1, 2, and 5, and `s = "226"` or `nums = [...]` a row labeled with the characters or numbers
    - `intervals = [[1,3],[2,6]]` for intervals; a `newInterval = [4,8]` is added in yellow, and an employee `schedule` gets one color per person
  - **Other tools**:
    - rectangle and ellipse frames, which draw on top but stay click-through except their outline
    - arrows and plain lines (for undirected edges) that follow the elements they connect
    - a pen, an eraser, and five colors
    - undo/redo and clear canvas
  - **Box selection**: drag across empty space to select everything inside, then move, duplicate, delete, or recolor it together. Copies keep pointers on their copied arrays and rewire arrows to the copied elements.
  - **Step playback**: "Record step" saves a snapshot of the board with an optional one-line note (writing it in English doubles as explanation practice). Playback steps through the snapshots with the arrow keys or plays them automatically; elements slide from one step to the next. You can continue editing from any step.
  - **Export image**: the board, or the step being played, is redrawn from its data as an SVG and saved as a 2× PNG.
  - When the selection bar would cover what you just picked (or the DP cell being filled), the board moves just enough to show it. It waits until you let go, so it never moves during a drag. On phones the bar is a single row that scrolls sideways instead of stacking into several rows.
  - Mouse, trackpad, keyboard, and touch all work. Pan with the scroll wheel, Space + drag, the hand tool, or two fingers; zoom with Ctrl + scroll or a pinch.
  - Each problem has its own board, plus a scratch board. **My whiteboards** lists them and says where they're stored; boards save automatically and sync.
  - On the practice page the board opens on top, so the timer keeps running.
  - No whiteboard library is used: the editor is about 141 KB (42 KB gzipped) and loads the first time a board opens.
- **Mock interviews**:
  - A timed, seven-step US interview flow (clarify, examples, brute force, optimize, code, test, complexity) with a checklist and English phrases for each step. The same hint panel is available, the way an interviewer would give hints.
  - Optional audio recording (MediaRecorder) and a self-review after you finish.
  - A two-minute explanation drill.
  - An optional live English transcript (Web Speech API). Afterwards you can fix it, see your word count, speaking pace, and filler words, and save it as the problem's explanation script.
  - **AI feedback (Claude)** on the transcript: a 0–2 score for each of the five explanation points with comments, strengths, concrete rewrites of unclear phrases, and a model answer you can save as your script. Requires an account; the server holds the API key and enforces a daily limit per user. In the live app it is on for allow-listed accounts only (`AI_ALLOWED_EMAILS`), so a public sign-up can't run up the API bill.
- **Progress**: a year-long activity heatmap like LeetCode's (darker squares mean more problems that day; flashcard-only days show the lightest shade) with active days and the longest streak, a per-pattern mastery grid, a weekly practice chart, and a breakdown by difficulty.
- **Accounts and offline-first sync**: sign up with email and password to sync attempts, notes, settings, flashcard answers, and whiteboards between devices. Everything keeps working offline and without an account. Sign-in has its own page, linked from the sidebar, the More tab, and a dismissible banner on Today on phones. Passwords can be reset by email, and the password fields have a show/hide toggle.
- **Bug reports and suggestions**: a "Report a problem" page, a Report button on every flashcard once it's answered, and a link on the error screen. Reports work without an account; the form shows exactly what gets attached (page, card, version, browser). Signed-in users can follow the status of their own reports, and admin accounts (`ADMIN_EMAILS`) get an inbox to mark them resolved.
  - A reset link works once, expires in an hour, and signs you out on other devices. It needs `BREVO_API_KEY` and `MAIL_FROM`; without them the feature is hidden.
- **English and Traditional Chinese**: the whole app is translated, including the pattern cards, all 213 hints, and the interview flow. It follows the browser language by default, and you can switch from the sidebar or Settings.
- **Installable PWA** that works offline, with light and dark themes (it follows the system by default; a sun/moon button next to the language switch flips it, and pressing it again goes back to following the system) and JSON backup/restore. New versions install themselves and reload the page, but wait while a timed practice or mock session, a flashcard round, or a whiteboard is open.

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
| Whiteboard | A custom editor with no drawing library: elements are HTML positioned in a CSS-transformed world, with arrows and ink in an SVG layer; pointer events with capture and two-finger pinch; all geometry and editing logic are pure functions with unit tests |
| Quality | Vitest (unit, API, and two-device sync tests), Playwright end-to-end tests against the production build and a real PostgreSQL on Chromium and iPhone WebKit, ESLint, GitHub Actions CI |
| AI | Claude Opus 5 through the Anthropic TypeScript SDK, JSON-schema structured output, server-side refusal fallback, per-user daily quota stored in PostgreSQL |
| Hosting | Render (one Node service for the API and the web app), Neon PostgreSQL |

## Architecture

```
src/                 Web app
  data/                Static content: problems, lists, patterns, hints, interview steps
  lib/                 Pure logic: scheduler, dates, stats, catalog, practice session
    cards.ts             Flashcards: deck, Leitner boxes, picking and dealing a round
    board/model.ts       Whiteboard: layout, pointer snapping, cell edits, arrows, selection, steps, undo history
    board/exportSvg.ts   Whiteboard: redraw a board as SVG for PNG export
    board/structures.ts  Whiteboard: build linked lists and trees from text (LeetCode level order)
    board/templates.ts   Whiteboard: one-click scenes for common patterns
  store/               Data layer
    db.ts                Dexie schema (v2: sync ids, outbox, sync state; v3: flashcard answers; v4: whiteboards)
    actions.ts           Every local write; each one also records a change in the outbox
    queries.ts           Every read, as React hooks
    tracking.ts          Local record ⇄ sync payload conversion, schedule replay
    sync.ts              Sync engine (push outbox, pull changes, apply)
    cloud.ts             Account state and automatic sync scheduling
  i18n/                Locale detection, typed dictionaries (zh-TW, en), date formatting
  components/, pages/  UI (components/board/ is the whiteboard editor)
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
e2e/                 Playwright tests: practice and review, mock interview with a transcript, flashcards, whiteboard, language, sync between two browsers
```

In production a single Node service serves both `/api` and the built web app. The browser only talks to its own origin, so the session cookie can be `SameSite=Lax` and the API needs no CORS. In development, Vite proxies `/api` to the API server.

### Offline-first sync

- **Writes are local first.** Every write goes to IndexedDB, together with an entry in an *outbox* in the same transaction. The outbox keeps one entry per record, with the time of the latest local change.
- **One request pushes and pulls.** `POST /api/sync` sends up to 500 outbox changes and the client's cursor. The server applies the changes, then returns every record whose version is newer than the cursor.
- **Conflicts: last write wins.** The server keeps one row per `(user, collection, key)` in a JSONB document table. An upsert replaces a row only if the incoming change is strictly newer. Rejected changes come back with the server's current copy.
- **Deletes are tombstones**, so every device learns about them and an older write cannot bring a record back.
- **Server versions come from a Postgres sequence.** Each user's sync runs under a transaction-scoped advisory lock, so versions are assigned in commit order and a cursor never skips a change.
- **Stale pulls never overwrite newer local edits.** When a pulled change arrives, the client keeps its own version if an outbox entry for that record is newer.
- **Review schedules are not synced.** They are rebuilt by replaying attempts in time order, so two devices practicing offline never overwrite each other's schedule. Flashcard schedules are rebuilt the same way from the answers.
- **First sign-in merges existing data.** On a device that already has local data, every record is queued for upload:
  - Records with a real modification time (attempts, notes, flashcard answers, whiteboards) keep it.
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
- Problems marked as solved before are spread so that at most five come due per day. The extra days are stored on the attempt (`delayDays`), so every device replays the same date.
- Flashcards use separate Leitner boxes (1, 3, 7, 14, then 30 days). A wrong answer sends a card back to box 0, so it returns in a later round the same day. Flashcards never move a problem's review date: recognizing a pattern is not the same as solving the problem.

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
- Settings: `DATABASE_URL` (required), `APP_ORIGINS`, `PORT`, `TRUST_PROXY` (default on in production), `STATIC_DIR`, `ANTHROPIC_API_KEY` (optional; AI feedback is off without it), `AI_DAILY_LIMIT` (default 20 per user per day), `AI_ALLOWED_EMAILS` (comma-separated accounts that may use AI feedback; empty means nobody, `*` means everyone), `BREVO_API_KEY` / `MAIL_FROM` / `MAIL_FROM_NAME` / `APP_URL` (optional; password reset email), `ADMIN_EMAILS` (comma-separated accounts that can open the report inbox).
- **Password reset email** uses [Brevo](https://www.brevo.com), whose free tier covers roughly 300 emails a day. Create an API key, verify the sender address, then set `BREVO_API_KEY` and `MAIL_FROM` (the verified address). `APP_URL` defaults to the first allowed origin and is only needed when the link should point somewhere else.
- **AI feedback** needs an API key from the [Claude Console](https://platform.claude.com). Add it as `ANTHROPIC_API_KEY` on Render (or in `server/.env` locally), and list the accounts allowed to use it in `AI_ALLOWED_EMAILS`. The list is empty by default, so sharing the app never lets other people spend your credits by accident. Each request costs roughly US$0.03–0.08 with Claude Opus 5, so 20 drills a month is about US$1–2. Setting a monthly spend limit in the Console is a good safety net.

## Data and privacy

- **Without an account**, everything stays in the browser's IndexedDB. Export a backup from **Settings** before you switch browsers or clear site data.
- **With an account**:
  - Attempts, notes, tags, pattern notes, custom problems, settings, flashcard answers, and whiteboards sync to the server.
  - Audio recordings never leave the device, and backups don't include them either.
  - Transcripts are saved with the mock session and sync like the rest of your data.
- **Transcripts** are optional and use the browser's speech recognition. Chrome sends the audio to Google's servers to turn it into text.
- **AI feedback** sends the transcript text and the problem's title to Anthropic's API only when you press the button. The server stores daily request and token counts per user, not the transcript itself.
  - Deleting the account removes it and all of its server data.
- **Reports** you send store the message, the optional contact you typed (only when signed out), and the details listed on the form. They are linked to your account when you're signed in and deleted along with it.
- **Signing out** can either keep the local copy or clear it (for shared computers).
- **Problem statements are not included.** The app stores only titles and links to leetcode.com.

## Roadmap

- **Whiteboard**: a minimap for large boards, and flashcards that show a recorded step and ask what happens next.
- **More AI assistance (Claude API)**: hints that react to your own code, code review, and an AI interviewer that asks follow-ups. These would run through the API so the key never reaches the browser.
- **Behavioral prep**: a STAR story bank, system design notes, and a job application tracker.
- **Signing in with GitHub.**

---

## 中文說明

這是一個幫忙準備美國軟體工程師面試的刷題教練。題目還是在 LeetCode 上寫，這個 App 負責三件事：

- 決定今天該刷哪些題
- 計時作答，卡住時一層一層給提示，再用間隔複習排好每一題的複習日
- 用模擬面試練習把解法講清楚

介面有繁體中文和英文，預設跟著瀏覽器語言，可以在側邊欄或「設定」切換，每台裝置各自記住。模板卡、213 題的提示和面試流程都有英文版，適合練習用英文思考。

今天頁會算進所有開始的新題，不管是從哪裡開始的；做完每日目標還可以「再來一題」，清單以外的題目用「記錄其他題目」輸入題號或網址就能記錄。以前刷過的題目可以在題庫用「標記以前刷過的題」一次排進複習，不會算進連續天數和練習次數。

**解題步驟**：練習頁、模擬面試和題目頁共用模擬面試的七個步驟（釐清題意、舉例與邊界、暴力解、優化、寫程式、驗證、複雜度），每一步寫一句自己的想法。舉例拆成「例子」和「邊界情況」，優化拆成三個問題：笨在哪、哪裡重複算、要留下什麼。寫的內容存在這題的筆記裡、會同步，複習時看得到當時怎麼想的；模擬面試時會出現在每一步的檢查清單下面。寫完可以按「照步驟寫英文講解稿」，講解稿的五句各列出相關步驟寫過的內容，自己逐句講成英文。提示面板可以先選「卡在哪一步」，看這一步怎麼想和自己上一步寫的內容，不算用了提示；卡在優化或寫程式時可以直接打開關鍵觀察或模板。

每一題都有一份英文參考講法（關鍵觀察、資料結構、例子、複雜度、邊界情況五句），預設收起，自己講過之後再展開對照；講解練習結束後會直接顯示在旁邊。

**微複習**是給健身組間、排隊這種零碎時間用的。一回合 5 張卡，只要點不用打字，大約 1 分鐘：
- 卡片內容：做過的題目用哪個模式、關鍵觀察、複雜度、口頭講解翻面卡、看線索想模式、59 張 Python 小知識（每一題都實際跑過程式確認答案）。
- 不會就按「我不知道」直接看答案，不用亂猜。答錯的卡會在回合最後重考，選項重新洗牌，答對才過關。
- 可以只練某個範圍：做過的題目、看線索、Python 小知識，或某一個模式。
- 上方有組間休息計時器，時間到會響、會跳出提醒；倒數時會請瀏覽器讓螢幕保持亮著。
- 做微複習的日子也算進連續天數。

**白板**是自己從頭寫的，沒有用繪圖套件：
- 可以拖拉陣列、指標、堆疊、佇列、字典、集合、二維陣列、變數、二元樹、鏈結串列、圖、堆積、遞迴樹、DP 表、區間、表格、文字、程式碼和便利貼，取代紙筆手動跑一遍。
- 指標會吸附在陣列格子上，用方向鍵移動，依名字自動上色。
- **鏈結串列**是一整條：點兩個節點之間的箭頭可以在往後、反過來、斷開之間切換，反轉串列可以一段一段翻；尾巴可以接回任一個節點（有環）；prev、curr、next 指標吸附在節點下面。
- **二元樹**自動依中序排版（二元搜尋樹由左到右剛好排好序）：點一個節點可以從虛線位置加左右子節點、上底色、刪掉子樹；指標放在節點上方，用方向鍵走到子節點或父節點；最多 6 層。
- **範圍框**：選取同一個陣列上的兩個指標，按「框住兩個指標之間」，框會跟著指標移動，適合滑動視窗。
- 元件庫最上面有**模板**，點一下就擺好一整套常見的場景，指標名字也取好：雙指標、滑動視窗、反轉鏈結串列、樹的 DFS、網格 BFS、回溯（子集合的遞迴樹，加上 path 和 cur 指標）。整組會一起選取，可以直接拖動。
- **圖**：節點自動排成一圈，有向圖有箭頭，兩個方向都有的邊會彎開；邊可以寫權重、標記走過。點一個節點可以連到別的節點、上色、加指標或刪除；最多 20 個節點、60 條邊。
- **堆積**：同一份資料同時畫成樹和陣列（標上索引），也可以只看其中一個。Push、Pop 會照堆積的規則往上或往下換；勾「每一步記成逐步播放」，每次交換都會存成一步，可以播放。可以切換最小堆和最大堆，順序不對的節點會變紅，按 Heapify 一次修好；最多 31 個值。
- **遞迴樹**：一個節點是一次呼叫，由上往下排，呼叫者在它呼叫的那些節點正上方；適合回溯、備忘錄 DP 和字典樹。點一個呼叫可以加子呼叫、寫回傳值或上面那條邊的字（這一步選了什麼），也可以剪掉這枝（畫成虛線、淡色）。「標出重複的呼叫」會把字一樣的呼叫標同一個顏色，看出備忘錄能省掉什麼。吸附在上面的指標用 ← → 照 DFS 的順序走、↑ 回到呼叫者，可以一步一步記下來播放。最多 63 個呼叫、8 層。
- **DP 表**：一格一格填，一維（`dp[i]`）或二維（`dp[i][j]`），列和欄旁邊可以標題目給的字串或數字。選好每一格從哪幾格算來（`dp[i-1], dp[i-2]`、前面所有的 `dp[j]`、硬幣的 `dp[i-k]`、上／左／左上，或回文從最後一列往上填的 `dp[i+1][j-1]`），正在填的那一格就會用箭頭標出來（一維畫成格子下面的弧線）。在選取列輸入值、按 Enter 就跳到下一個還沒填的格子；勾「每填一格記成一步」，每一格都會存成一步（說明寫 `dp[2][3] = 2`），可以回放整張表怎麼填出來。最多 26 列、30 欄。
- **區間**：每個區間一列，畫在同一條有刻度的數線上，重疊的會對齊，適合合併區間、插入區間、會議室這類題目。「依起點排序」是合併的第一步；點一個區間可以改起點終點、和下一列合併（端點碰到也算重疊）、標成移除（虛線）或上色。掃描線停在每個起點和終點，顯示那時有幾個區間正在進行（起點算、終點不算），最大值就是會議室 II 的答案。最多 30 個區間。
- **程式碼框**跟 LeetCode 的編輯器一樣：上面一條 `Python3` 標題列、左邊行號、Python 上色（淺色、深色主題的顏色跟 VS Code 一樣），不換行，框跟著程式碼的大小變；新的程式碼框從 `class Solution:` 範本開始。編輯時顏色一直都在：一個透明的輸入框剛好疊在上色的程式碼上。Tab、Shift+Tab 縮排，Enter 沿用上一行的縮排（冒號結尾再多縮一層），在縮排裡按 Backspace 一次退一層。
- **程式碼逐行追蹤**：把程式碼框變成一次 dry run（面試的 Test 那一步）。按「逐行追蹤」會標出正在執行的那一行；用 ↑ ↓ 或點一行移動，空白行會跳過。勾「每走一行記成一步」，每次移動前都會先把畫面存成一步、標著剛執行完的那一行；旁邊的變數和陣列跟著改，播放時就能完整回放，每一步還能寫一句說明。
- **用文字建立**：陣列、堆疊、佇列、堆積、集合、字典、二維陣列、鏈結串列、樹、圖、遞迴樹、DP 表和區間都可以直接貼題目的範例，不用一格一格輸入。例如 `nums = [2,7,11,15], target = 9`（取第一個值，名稱也改成 nums）、`"abcabcbb"`（拆成一個一個字元）、`{'a': 1}`、`[[1,0],[0,1]]`、`1->2->3`、`[3,9,20,null,null,15,7]`、`n = 5, edges = [[0,1],[0,2]]`（可以有權重）或鄰接串列；遞迴樹是一行一個呼叫、用縮排表示誰呼叫誰（`|` 前面寫在邊上，`=>` 後面是回傳值），`tree` 指令的輸出也讀得懂；DP 表直接讀題目的輸入，例如 `text1 = "abcde", text2 = "ace"`（6×4，旁邊標字母）、`m = 3, n = 7`、`n = 5`、`coins = [1,2,5], amount = 11`（往回看 1、2、5 格）、`s = "226"` 或 `nums = [...]`；區間貼 `intervals = [[1,3],[2,6]]`，再給 `newInterval = [4,8]` 會標成黃色，員工的 `schedule` 每個人一個顏色。
- 點一格可以上底色、在那格加指標、插入或刪除格子。
- 還有矩形框、圓形框、箭頭連線、直線（無向圖的邊）、畫筆、橡皮擦、復原、清空。
- 在空白處拖曳可以框選，框住的東西可以一起移動、複製、刪除或換色。
- 選取列會擋住剛選到的東西（或 DP 表正在填的那一格）時，畫面自動挪開剛好露出來；按著拖曳時不會動。手機上選取列只排一列，放不下就左右滑，不會疊成好幾列擋住畫面。
- **逐步播放**：按「記一步」把目前的畫面存成一步，可以寫一句說明（用英文寫就是在練講解）；播放時一步一步看，指標會滑到下一格，也可以從任何一步繼續編輯。
- 可以把白板（或播放中的那一步）匯出成圖片。
- 每一題有自己的白板，另外有一張自由白板；在「我的白板」可以看到全部。白板存在這台裝置，登入後會同步到雲端。
- 練習頁打開白板時，計時不會中斷。

題庫的「標記以前刷過的題」會把一大批題目分散到之後幾天，每天最多 5 題到期，不會全擠在同一天。

模擬面試可以開啟英文逐字稿（瀏覽器的語音辨識，Chrome 會把聲音送到 Google 轉成文字）。結束後可以修正內容、看字數、語速和贅詞，再一鍵存成這題的講解稿。登入後還可以按「取得 AI 回饋」，由 Claude 依五個重點評分、指出講不清楚的句子並給參考講法（逐字稿會送到 Anthropic；伺服器要設定 `ANTHROPIC_API_KEY` 和允許名單 `AI_ALLOWED_EMAILS`，每人每天預設 20 次，一次約 1～3 元台幣）。線上版本只對允許名單裡的帳號開放，避免公開註冊的帳號大量使用、產生 API 費用。

不登入也能完整使用，資料存在瀏覽器裡。忘記密碼可以用 email 重設（伺服器要設定 Brevo 的 `BREVO_API_KEY` 和 `MAIL_FROM`，免費方案每天約 300 封）。在「帳號」頁註冊或登入後（桌面版側邊欄、手機的「更多」和今天頁都有入口），練習紀錄、筆記、設定、微複習紀錄和白板會自動同步到雲端，換電腦或換瀏覽器都能接著用；離線時照常記錄，恢復連線後再上傳。錄音只會留在原本的裝置上。

遇到 bug、內容有錯或有想要的功能，可以到「回報問題」頁送出；微複習每張卡答完後也有「回報」按鈕。不登入也能送，表單會列出一起送出的資訊（頁面、卡片、版本、瀏覽器）。登入後可以看自己回報的處理進度；伺服器設定 `ADMIN_EMAILS` 列出的帳號會有收件匣，可以把回報標成已處理。

本機開發執行 `npm run dev`，會同時啟動網頁（http://localhost:5173）和後端（內建 PGlite 資料庫，不需要另外安裝）。`npm run test:e2e` 會先建置，再用 Playwright 跑端對端測試。

部署到 Render＋Neon 的步驟：

1. 到 Neon 建立專案（區域選 AWS US East 2 (Ohio)，跟 Render 同一區），複製連線字串（`postgresql://…?sslmode=require`）。
2. 到 Render 用 GitHub 登入，選 **New → Blueprint**，選這個 repository，`DATABASE_URL` 貼上 Neon 的連線字串。
3. 部署完成後打開 `onrender.com` 的網址，確認 `/api/health` 回傳 `{"ok":true}`。之後 `main` 的 CI 通過就會自動部署。

線上版本：https://leetcode-coach-f6q7.onrender.com 。免費方案閒置 15 分鐘會休眠，之後第一次開啟大約要等一分鐘，醒來之後就很快；頁面載入過一次後也能離線使用。
