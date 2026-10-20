# LeetCode Coach（刷題教練）

A local-first study coach for LeetCode interview prep. It decides what to practice today, schedules reviews with spaced repetition, keeps structured notes, and runs timed mock interviews with think-aloud recording. You can use it without an account; signing in syncs your data across devices.

You still solve problems on LeetCode. This app handles the parts around solving: planning, remembering, and explaining.

**Live app:** https://leetcode-coach-f6q7.onrender.com — it runs on free hosting that sleeps when idle, so the first visit after a while can take about a minute to wake up. After that it's fast, and once loaded it keeps working offline.

**No account needed to look around:** on the Today page, press **Try it with demo data** to fill the app with six weeks of made-up practice (reviews due, a streak, a heatmap, stuck patterns). It stays in your browser, is never synced, and **Clear demo data** removes it.

<picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/today-dark.png"><img src="docs/images/today-light.png" alt="The Today page: progress toward the target date, flashcards, and the reviews due today"></picture>

## Screenshots

<table>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/practice-dark.png"><img src="docs/images/practice-light.png" alt="Timed practice with one-line notes for each interview step"></picture><br><b>Timed practice</b>: a timer, one-line notes per interview step, and hints that open one layer at a time.</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/whiteboard-dark.png"><img src="docs/images/whiteboard-light.png" alt="The whiteboard with a sliding-window template on Longest Substring Without Repeating Characters"></picture><br><b>Whiteboard</b>: arrays, pointers, a window frame, and a count dict, from a template in one click.</td>
  </tr>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/ai-feedback-dark.png"><img src="docs/images/ai-feedback-light.png" alt="AI feedback on a spoken explanation, scored on five points with a model answer"></picture><br><b>Explaining out loud</b>: a live transcript, then Claude scores it on five points and suggests a model answer.</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/progress-dark.png"><img src="docs/images/progress-light.png" alt="The Progress page with a year of practice as a heatmap"></picture><br><b>Progress</b>: a year of practice in month blocks, streaks, and mastery by pattern.</td>
  </tr>
</table>

Screenshots use generated demo data and are regenerated with `npm run screenshots`. They follow your GitHub theme (light or dark).

## Features

- **Study lists**: NeetCode 150, Blind 75 and Grind 169 (213 unique problems), grouped into 18 patterns. You can add any other LeetCode problem.
- **Interview sprint**: enter the interview date, the company (optional), and how many minutes you have on weekdays and weekends. Every day until the interview gets a plan, and the last days (2 by default) are review only.
  - New problems come in priority order: problems tagged with the company, then one problem from each pattern you haven't touched, then two more from patterns you keep forgetting, then the rest of your list. Each day takes as many as fit after its reviews, using rough times (Easy 20, Medium 35, Hard 50 minutes, 10 per review). Problems that don't fit are listed instead of crammed in.
  - Reviews are forecast with FSRS, including the first reviews of problems you'll learn during the sprint. A problem you'd remember with less than 90% chance on the interview day is pulled into the review-only days.
  - One full mock interview two days before (and every week before that), and behavioral practice every three days ending the day before. Today shows the countdown, today's minutes, and these to-dos.
  - Paste problem numbers, links, or titles to tag a company's problems in one go, which also works for noting what came up after the interview.
  - Nothing is stored except the settings: the plan is recalculated from your progress every day, so a missed day spreads over the days left.
- **Timed practice with tiered hints**:
  - Starting a problem starts a timer against a target time for its difficulty. The browser tab title shows the timer, so you can see it while you write code on LeetCode.
  - The timer survives a page reload.
  - If you get stuck, open hints one layer at a time: which pattern to use, a hand-written key insight for each of the 213 problems, then the pattern template. A link to the LeetCode solutions comes last.
  - When you finish, the minutes are filled in and a self-rating is suggested based on how many hints you used.
- **Solving steps**: practice, mock interviews, and the problem page share the seven interview steps (clarify, examples, brute force, optimize, code, test, complexity), and you write one line per step. Examples split into an example and its edge cases, and Optimize asks three questions: what's slow, what's repeated, and what to keep. The lines are saved with the problem's notes and synced, so a review starts from how you thought it through, not just the code. In a mock interview they sit under each step's checklist.
  - **Write the script from your steps**: a dialog lays out the five sentences of the English explanation script, each with the step notes that feed it (for example, the edge-case sentence shows your edge cases). You write each sentence yourself, which is the practice, and save it as the problem's script.
  - **Hints that start from where you're stuck**: pick the step you're stuck on to see how to think about it, next to what you wrote in the step before. This doesn't count as a hint. Optimize and Code can jump straight to the key insight or the template.
- **Spaced repetition with FSRS**: after each attempt you rate yourself (solved alone / needed a hint / read the solution / still stuck), and FSRS, the scheduler Anki uses, picks the next review date.
  - Each problem has a stability (days until your chance of remembering it drops to 90%) and a difficulty from 1 to 10. Solved alone counts as Good, a hint as Hard, and reading the solution or still being stuck as Again. A review that came late but still went well grows the interval more.
  - Problems come back when you're about as likely to remember them as the target retention in Settings (90% by default; 80–95%). Changing it reschedules every problem.
  - The review queue puts the problem you're most likely to have forgotten first. Problem pages show how likely you are to remember it now, how long it holds, and its difficulty.
  - The scheduler is written from the FSRS-6 formulas with the default parameters, and the tests compare it with the official `ts-fsrs` (a test-only dependency) on hundreds of random review histories.
- **Daily plan**: the Today page lists the reviews that are due plus N new problems. By default the new problems are *interleaved*: mostly the pattern you're learning, plus one from another pattern so you practice recognizing which approach fits, and a pattern you've been stuck on lately (solutions read, still stuck, or stuck reasons ticked) gets an extra, easier problem. The pattern isn't shown until you ask, as in an interview. Settings can switch to strict roadmap order or to focusing on one pattern, and the day's list is planned from the morning's state so it doesn't reshuffle as you work. At the top, a progress bar and three numbers show how much of the list is left, your daily pace, and when you'll finish the first pass. With a target date set, they show the days left and how many new problems a day you need, flagged when your daily goal is too low.
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
- **Whiteboard**: [DSA Whiteboard](https://github.com/Lego514/dsa-whiteboard), which I built from scratch for this app and later split into its own open-source package ([try it standalone](https://lego514.github.io/dsa-whiteboard/)). Drag arrays, pointers, stacks, queues, dicts, sets, 2D arrays, variables, binary trees, linked lists, graphs, heaps, recursion trees, DP tables, intervals, tables, text, code, and sticky notes onto a pannable, zoomable canvas to trace an idea by hand. It has templates for common patterns, Build from text (paste a problem's example), range frames for sliding windows, a LeetCode-style code box with line-by-line tracing, step-by-step playback, and PNG export. See its README for the full list.
  - **Explain mode** (this app only): walk through your steps out loud in English. The current step's note shows as a prompt while a timer, audio recording, and live transcript run. Afterwards you see how long you spent on each step (the slow one is usually the part you can't explain smoothly yet), play back the audio, and fix the transcript. On a problem's whiteboard you can also tick which of the five points you covered, get AI feedback, save the transcript as the problem's script, and save the run as an explanation drill, marked "Whiteboard" in the mock interview history.
  - Each problem has its own board, plus a scratch board. **My whiteboards** lists them and says where they're stored; boards save automatically and sync.
  - **Share** a board for a mock interview or study session: everyone who opens the link edits it together, with each person's cursor and name. Joining doesn't need an account. Your own board isn't touched, and "Save a copy to my board" keeps the shared one. Rooms run on the package's Cloudflare Worker.
  - On the practice page the board opens on top, so the timer keeps running.
  - The app installs the package from GitHub at a release tag and plugs in its own storage, sync status, toasts, and explain mode. The server validates boards with the package's zod schema before storing them.
- **Behavioral interviews**: a STAR story bank for the non-coding round.
  - Write each story as Situation, Task, Action, and Result, and tag what it can answer: conflict, failure, leadership, deadlines, ambiguity, influence, learning, proudest work, feedback, or teamwork. Stories autosave and sync like notes.
  - The editor offers English opening phrases for each part (click one to add it), estimates how long the story takes to say at about 140 words a minute (1½–2½ minutes is the target), and points out when Action, what you did, is less than 40% of it.
  - **Practice out loud**: draw a question (any theme or one theme), pick the story to answer with (stories for that theme come first), glance at your notes, then answer in English against a 1½–2½ minute target with optional audio recording and a live transcript.
    - Afterwards you see the transcript with word count, pace, filler words, and how often you said "I" versus "we".
    - Tick a STAR self-check and rate how it felt.
    - Optional **AI feedback (Claude)** scores Situation, Task, Action, Result, and your own part, quotes what to fix, and rewrites the answer in about two minutes of spoken English while keeping your facts, using placeholders instead of invented numbers. It shares the daily AI limit with explanation feedback.
    - Practices sync (audio stays on the device) and count toward the streak.
  - A coverage grid shows which themes still have no story. Thirty common questions are grouped by theme, each with what interviewers look for (and a Chinese translation in the Chinese interface), links to your stories for that theme, or a button to start one.
- **Mock interviews**:
  - A timed, seven-step US interview flow (clarify, examples, brute force, optimize, code, test, complexity) with a checklist and English phrases for each step. The same hint panel is available, the way an interviewer would give hints.
  - Optional audio recording (MediaRecorder) and a self-review after you finish.
  - A two-minute explanation drill.
  - An optional live English transcript (Web Speech API). Afterwards you can fix it, see your word count, speaking pace, and filler words, and save it as the problem's explanation script.
  - **AI feedback (Claude)** on the transcript: a 0–2 score for each of the five explanation points with comments, strengths, concrete rewrites of unclear phrases, and a model answer you can save as your script. Requires an account; the server holds the API key and enforces a daily limit per user. In the live app it is on for allow-listed accounts only (`AI_ALLOWED_EMAILS`), so a public sign-up can't run up the API bill.
  - **Use your own ChatGPT or Claude**: no account or AI requests needed. Copy a ready-made prompt (feedback on the explanation, or an interviewer who asks follow-ups one at a time and then grades them) and paste it into a new chat. The scoring points are the same ones the built-in AI feedback uses, shared from `shared/prompts.ts`. Paste the reply back and it's saved with the session. Behavioral practice has the same option.
  - **Interviewer follow-ups (Claude)**: after you explain, Claude plays the interviewer and asks two or three follow-up questions aimed at what your explanation left vague or got wrong (edge cases, can you do better, why that complexity, another approach). The browser reads each question aloud, and you answer by speaking (a live English transcript) or typing. Then each answer gets a 0–2 score, a comment, and a stronger spoken answer. The questions and answers are saved with the drill. Asking and grading each count as one request toward the daily limit.
- **Progress**: a year-long activity heatmap like LeetCode's (darker squares mean more problems that day; flashcard-only days show the lightest shade) with active days and the longest streak, a per-pattern mastery grid, a weekly practice chart, and a breakdown by difficulty.
- **Where you get stuck**: when you record a problem (or finish a full mock), you can tick what went wrong: didn't see the pattern, couldn't optimize, couldn't code it, missed an edge case, had a bug, or ran out of time. Progress counts the last 90 days by reason, shows which patterns each one happens in most, and links to what to practice. Problem history shows the reasons, and the interview sprint adds two extra problems from patterns you got stuck in at least twice in the last 30 days.
- **Accounts and offline-first sync**: sign up with email and password, or with GitHub, to sync attempts, notes, settings, flashcard answers, whiteboards, and behavioral stories between devices. Everything keeps working offline and without an account. Sign-in has its own page, linked from the sidebar, the More tab, and a dismissible banner on Today on phones. Passwords can be reset by email, and the password fields have a show/hide toggle.
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
| Whiteboard | [dsa-whiteboard](https://github.com/Lego514/dsa-whiteboard), my own package in a separate repo: a custom editor with no drawing library (HTML elements in a CSS-transformed world, arrows and ink in SVG, pointer capture and pinch), with all geometry and editing logic as unit-tested pure functions |
| Quality | Vitest (unit, API, and two-device sync tests), Playwright end-to-end tests against the production build and a real PostgreSQL on Chromium and iPhone WebKit, ESLint, GitHub Actions CI |
| AI | Claude Opus 5.5 through the Anthropic TypeScript SDK, JSON-schema structured output, server-side refusal fallback, per-user daily quota stored in PostgreSQL |
| Hosting | Render (one Node service for the API and the web app), Neon PostgreSQL |
| Auth | Email and password (scrypt, only hashed session tokens stored) plus Sign in with GitHub (OAuth 2.0 authorization code flow with PKCE, explicit account linking); a fake GitHub server covers the whole flow in end-to-end tests |
| Monitoring | Sentry for the React app and the Hono API: errors only (no tracing), loaded only when a DSN is set, with account info, cookies, headers, request bodies, query strings, AI inputs and outputs, and local variables kept out; source maps are uploaded at build time and not published |
| Containers | Multi-stage Dockerfile (build, then a slim runtime that runs as a non-root user with a health check) and Docker Compose with PostgreSQL; CI builds the image, starts it with Compose, and runs end-to-end tests against the container |

## Architecture

![Architecture: a React PWA stores data in IndexedDB and syncs through a Hono API on Render to Neon PostgreSQL; the API calls Claude for feedback, GitHub for sign-in, and Brevo for email; the whiteboard connects over WebSockets to Cloudflare Workers for live co-editing; Sentry receives errors; GitHub Actions tests every change, including a Docker container, before Render deploys](docs/architecture.svg)

```
src/                 Web app
  data/                Static content: problems, lists, patterns, hints, interview steps
  lib/                 Pure logic: scheduler, dates, stats, catalog, practice session
    cards.ts             Flashcards: deck, Leitner boxes, picking and dealing a round
  store/               Data layer
    db.ts                Dexie schema (v2: sync ids, outbox, sync state; v3: flashcard answers; v4: whiteboards)
    actions.ts           Every local write; each one also records a change in the outbox
    queries.ts           Every read, as React hooks
    tracking.ts          Local record ⇄ sync payload conversion, schedule replay
    progress.ts          Rebuilds a problem's FSRS state from its attempts
    sync.ts              Sync engine (push outbox, pull changes, apply)
    cloud.ts             Account state and automatic sync scheduling
  i18n/                Locale detection, typed dictionaries (zh-TW, en), date formatting
  components/, pages/  UI (components/board/ wires the dsa-whiteboard package to storage, sync, and explain mode)
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
- **Sign in with GitHub** uses the OAuth 2.0 authorization code flow with PKCE (S256). The `state` and the PKCE verifier live in a short-lived `HttpOnly`, `SameSite=Lax` cookie in the browser that started the sign-in, so a callback from anywhere else does nothing. Only a verified GitHub email can create an account, and an email that is already registered is never merged automatically (that would let anyone who controls a GitHub account with your email take over yours): you sign in with your password and connect GitHub from the Account page. GitHub can't be disconnected from an account without a password, and a GitHub-only account confirms deletion by typing its email.
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
- Flashcards use separate Leitner boxes (1, 3, 7, 14, then 30 days). A wrong answer sends a card back to box 0, so it returns in a later round the same day. Flashcards never move a problem's review date: recognizing a pattern is not the same as solving the problem. Cards answered today aren't used to pad a round, so a small topic gives a shorter round (or says it's done for today and offers Everything) instead of repeating the same cards. In Everything, at most 3 of the 5 cards are about problems, leaving room for pattern clues and Python tips.

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
npm run screenshots  # rebuild, then regenerate the README screenshots in docs/images/ from demo data
npm start            # run the built API (and the web app when NODE_ENV=production)
```

- In development the API stores data with PGlite in `server/.data/pglite`. Delete that folder to start over.
- Server settings are read from `server/.env`. See `server/.env.example`.
- The web app still works as a static site without the API: sign-in shows as unavailable and data stays in the browser.
- To regenerate the PWA icons, run `node scripts/generate-icons.mjs`.
- The Playwright tests start the built server on port 4310 with an in-memory PGlite database. Set `E2E_DATABASE_URL` to run them against PostgreSQL, as CI does. The first time, run `npx playwright install chromium`.

### Run it with Docker

Docker runs the whole system — the production build of the web app and API, plus PostgreSQL — without installing Node or a database:

```bash
docker compose up --build    # then open http://localhost:8080
docker compose down          # stop; add -v to also delete the database volume
```

- The image is built in two stages. The first installs everything and builds both parts. The second keeps only what runs: production dependencies, the bundled API, migrations, and the built web app. It runs as the unprivileged `node` user and has a health check on `/api/health`.
- Migrations run when the container starts, the same as on Render.
- Optional settings such as `ANTHROPIC_API_KEY`, `AI_ALLOWED_EMAILS`, `ADMIN_EMAILS`, `BREVO_API_KEY`, and `MAIL_FROM` are passed through from your shell or a `.env` file next to `compose.yaml`. Without them, those features stay off.
- To run the image on another host, set `DATABASE_URL` and `APP_ORIGINS` (the URL people open), and publish port 8080.
- The `docker` job in CI builds the image, starts it with PostgreSQL through Compose, waits for the health checks, and runs a set of Playwright tests against the container. Set `E2E_BASE_URL` to point Playwright at any running server the same way.

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
- Settings: `DATABASE_URL` (required), `APP_ORIGINS`, `PORT`, `TRUST_PROXY` (default on in production), `STATIC_DIR`, `ANTHROPIC_API_KEY` (optional; AI feedback is off without it), `AI_DAILY_LIMIT` (default 20 per user per day), `AI_ALLOWED_EMAILS` (comma-separated accounts that may use AI feedback; empty means nobody, `*` means everyone), `BREVO_API_KEY` / `MAIL_FROM` / `MAIL_FROM_NAME` / `APP_URL` (optional; password reset email), `ADMIN_EMAILS` (comma-separated accounts that can open the report inbox), `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (optional; sign in with GitHub), `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` (optional; error monitoring), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `CRON_SECRET` (optional; daily reminders).
- **Password reset email** uses [Brevo](https://www.brevo.com), whose free tier covers roughly 300 emails a day. Create an API key, verify the sender address, then set `BREVO_API_KEY` and `MAIL_FROM` (the verified address). `APP_URL` defaults to the first allowed origin and is only needed when the link should point somewhere else.
- **Sign in with GitHub** needs an OAuth App: on GitHub, open Settings → Developer settings → OAuth Apps → New OAuth App, set the homepage to the app's URL and the callback to `<app URL>/api/auth/github/callback`, then set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Without them, the GitHub button doesn't appear. Locally, use `http://localhost:5173/api/auth/github/callback` (the dev server proxies `/api`).
- **Error monitoring** uses [Sentry](https://sentry.io) (the free plan covers 5,000 errors a month). Create a project for React, copy its DSN, and set it as `SENTRY_DSN`; the same DSN is used for the web app (built in) and the API. To get readable stack traces in the web app, also set `SENTRY_AUTH_TOKEN` (an organization token that can upload source maps), `SENTRY_ORG`, and `SENTRY_PROJECT`; the build then uploads source maps and deletes them, so they are never served. Without `SENTRY_DSN`, Sentry isn't loaded at all.
- **Daily reminders** are Web Push notifications sent when a signed-in person hasn't practiced by the hour they chose.
  - Run `npx web-push generate-vapid-keys` and set the two keys as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
  - Pick any long random string as `CRON_SECRET` and set it both on Render and as an Actions secret named `CRON_SECRET` in the GitHub repo.
  - The free Render plan sleeps, so a timer inside the server isn't reliable. Instead, the `Daily reminders` workflow calls `POST /api/push/send-due` every hour, which wakes the server. It skips itself while the secret is missing.
  - On iPhone, notifications only work after adding the app to the home screen.
- **AI feedback** needs an API key from the [Claude Console](https://platform.claude.com). Add it as `ANTHROPIC_API_KEY` on Render (or in `server/.env` locally), and list the accounts allowed to use it in `AI_ALLOWED_EMAILS`. The list is empty by default, so sharing the app never lets other people spend your credits by accident. Each request costs roughly US$0.02–0.07 with Claude Opus 5.5, so 20 drills a month is about US$1–2. Setting a monthly spend limit in the Console is a good safety net.

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

- **Whiteboard**: flashcards that show a recorded step and ask what happens next. Whiteboard features themselves are tracked in [dsa-whiteboard](https://github.com/Lego514/dsa-whiteboard).
- **More AI assistance (Claude API)**: hints that react to your own code, code review, and an AI interviewer that asks follow-ups. These would run through the API so the key never reaches the browser.
- **Behavioral prep**: a STAR story bank, system design notes, and a job application tracker.
- **Signing in with GitHub.**

---

## 中文說明

這是一個幫忙準備美國軟體工程師面試的刷題教練。上面的截圖是示範資料，`npm run screenshots` 會重新產生。想先看看的話，在今天頁按「用示範資料看看」，會載入六週編出來的練習紀錄，只存在你的瀏覽器、不會同步，隨時可以清掉。題目還是在 LeetCode 上寫，這個 App 負責三件事：

- 決定今天該刷哪些題
- 計時作答，卡住時一層一層給提示，再用 FSRS（Anki 用的排程演算法）排好每一題的複習日
- 用模擬面試練習把解法講清楚

介面有繁體中文和英文，預設跟著瀏覽器語言，可以在側邊欄或「設定」切換，每台裝置各自記住。模板卡、213 題的提示和面試流程都有英文版，適合練習用英文思考。

今天頁會算進所有開始的新題，不管是從哪裡開始的；做完每日目標還可以「再來一題」，清單以外的題目用「記錄其他題目」輸入題號或網址就能記錄。以前刷過的題目可以在題庫用「標記以前刷過的題」一次排進複習，不會算進連續天數和練習次數。

**卡住原因**：記錄一題（或完整模擬面試結束）時，可以勾「卡在哪」：沒看出模式、想不到優化、寫不出來、漏了邊界情況、有 bug、時間不夠，可以複選、也可以不勾。進度頁統計最近 90 天最常卡在哪、各自最常出現在哪些模式，並附上該怎麼練的連結；題目的練習紀錄也看得到當時卡在哪。面試衝刺會把最近 30 天卡住兩次以上的模式多排兩題。

**面試衝刺**：輸入面試日期、公司（選填）、平日和週末每天能花幾分鐘，排好到面試前每天要做的事，最後幾天（預設 2 天）只複習。新題的順序：有標這家公司的題目、每個還沒碰過的模式各一題、比較弱的模式多兩題，然後是清單的其他題；每天扣掉複習之後放得下幾題就排幾題（估算 Easy 20、Medium 35、Hard 50 分鐘，複習一題 10 分鐘），排不進去的會列出來，不會硬塞。複習用 FSRS 預估，包含衝刺中新做的題目；到面試那天記得的機率低於 90% 的題目，提前到最後幾天複習。面試前兩天（以及再往前每週）一場完整模擬面試，每三天一次行為面試練習，最後一次在面試前一天；今天頁會顯示倒數、今天大約幾分鐘和這些待辦。可以一次貼上很多題號、網址或題名標上公司，面試完也可以用來記下考了哪些題。只存設定，計畫每天依進度重新計算，哪天沒做到，剩下的天數會自動分攤。

**複習排程（FSRS）**：每一題有「穩定度」（隔幾天之後，記得的機率會掉到 90%）和 1 到 10 的難度。自己解出算 Good、看提示算 Hard、看解答或看完還不懂算 Again；晚了才複習但還記得，下次的間隔會拉得更長。題目會在你大概還記得「目標記憶率」那麼多的時候再出現（「設定」可以選 80%–95%，預設 90%），改了之後每一題都會重新排程。複習頁把最可能已經忘了的題目排在最前面，題目頁顯示現在還記得的機率、大約記得住幾天和難度。排程是照 FSRS-6 的公式自己寫的，測試裡拿官方的 `ts-fsrs` 在幾百組隨機的複習紀錄上逐一比對。

**行為面試**：用 STAR（情境、任務、行動、結果）寫自己的故事，標上它能回答哪些主題（衝突、失敗、領導、期限、不確定、說服、學習、最自豪、回饋、團隊合作），會自動儲存並同步。每一段有英文開頭句可以點來用，也會估計講完要多久（每分鐘約 140 字，目標 1.5–2.5 分鐘），行動那段不到四成時會提醒。「開口練習」可以抽一題（不限主題或指定主題），選一個故事回答（這個主題的故事排前面），先看一下筆記，再用英文計時回答，目標 1.5–2.5 分鐘，可以錄音、顯示即時逐字稿。講完看逐字稿的字數、語速、贅字，以及講了幾次「I」、幾次「we」，勾 STAR 自我檢查、選講起來的感覺；也可以拿 AI 回饋：Claude 依 STAR 和「你自己的貢獻」打分數，引用要修改的句子，並保留你的事實，改寫成大約兩分鐘的英文回答（不會亂編數字），跟講解回饋共用每天的次數。練習紀錄會同步（錄音只留在本機），也算進連續天數。覆蓋率一眼看出哪些主題還沒有故事；30 題常見題目依主題分類，附中文翻譯和面試官想看什麼，旁邊列出可以用的故事，或直接幫這題寫一個。

**解題步驟**：練習頁、模擬面試和題目頁共用模擬面試的七個步驟（釐清題意、舉例與邊界、暴力解、優化、寫程式、驗證、複雜度），每一步寫一句自己的想法。舉例拆成「例子」和「邊界情況」，優化拆成三個問題：笨在哪、哪裡重複算、要留下什麼。寫的內容存在這題的筆記裡、會同步，複習時看得到當時怎麼想的；模擬面試時會出現在每一步的檢查清單下面。寫完可以按「照步驟寫英文講解稿」，講解稿的五句各列出相關步驟寫過的內容，自己逐句講成英文。提示面板可以先選「卡在哪一步」，看這一步怎麼想和自己上一步寫的內容，不算用了提示；卡在優化或寫程式時可以直接打開關鍵觀察或模板。

每一題都有一份英文參考講法（關鍵觀察、資料結構、例子、複雜度、邊界情況五句），預設收起，自己講過之後再展開對照；講解練習結束後會直接顯示在旁邊。

**微複習**是給健身組間、排隊這種零碎時間用的。一回合 5 張卡，只要點不用打字，大約 1 分鐘：
- 卡片內容：做過的題目用哪個模式、關鍵觀察、複雜度、口頭講解翻面卡、看線索想模式、59 張 Python 小知識（每一題都實際跑過程式確認答案）。
- 不會就按「我不知道」直接看答案，不用亂猜。答錯的卡會在回合最後重考，選項重新洗牌，答對才過關。
- 可以只練某個範圍：做過的題目、看線索、Python 小知識，或某一個模式。
- 上方有組間休息計時器，時間到會響、會跳出提醒；倒數時會請瀏覽器讓螢幕保持亮著。
- 做微複習的日子也算進連續天數。
- 今天答過的卡不會拿來補滿一回合：範圍太小時這一回合就少幾張，做完了會提示換成「全部」。範圍是「全部」時，5 張裡最多 3 張是題目卡，其他留給模式線索和 Python 小知識，做過的題目少時也不會一直繞著那幾題。

**白板**是我為這個 App 從頭寫的，後來拆成獨立的開源專案 [DSA Whiteboard](https://github.com/Lego514/dsa-whiteboard)（[直接試用](https://lego514.github.io/dsa-whiteboard/)）：
- 可以拖拉陣列、指標、堆疊、佇列、字典、集合、二維陣列、變數、二元樹、鏈結串列、圖、堆積、遞迴樹、DP 表、區間、表格、文字、程式碼和便利貼，取代紙筆手動跑一遍。有常見模式的模板、貼上題目範例就能建立、滑動視窗的範圍框、LeetCode 風格的程式碼框和逐行追蹤、逐步播放、匯出圖片。完整功能請看那邊的 README。
- **講解模式**（只有這個 App 有）：照著記好的步驟用英文講出來。這一步的說明會當作提詞，同時計時、錄音、顯示即時逐字稿。講完看每一步講了多久（特別久的那步通常就是還講不順的地方）、聽錄音、修正逐字稿；在題目的白板上還可以勾有講到哪幾個重點、拿 AI 回饋、把逐字稿存成講解稿，並存成一筆講解練習，在模擬面試的紀錄裡標成「白板」。
- 每一題有自己的白板，另外有一張自由白板；在「我的白板」可以看到全部。白板存在這台裝置，登入後會同步到雲端。
- **共用**：模擬面試或一起讀書時，把白板的連結傳給對方，打開的人都能一起編輯，看得到每個人的游標和名字，對方不用帳號。自己的白板不會被改到，想留下共用的內容就按「存一份到我的白板」。房間在 dsa-whiteboard 的 Cloudflare Worker 上。
- 練習頁打開白板時，計時不會中斷。

題庫的「標記以前刷過的題」會把一大批題目分散到之後幾天，每天最多 5 題到期，不會全擠在同一天。

模擬面試可以開啟英文逐字稿（瀏覽器的語音辨識，Chrome 會把聲音送到 Google 轉成文字）。結束後可以修正內容、看字數、語速和贅詞，再一鍵存成這題的講解稿。登入後還可以按「取得 AI 回饋」，由 Claude 依五個重點評分、指出講不清楚的句子並給參考講法（逐字稿會送到 Anthropic；伺服器要設定 `ANTHROPIC_API_KEY` 和允許名單 `AI_ALLOWED_EMAILS`，每人每天預設 20 次，一次約 1～3 元台幣）。線上版本只對允許名單裡的帳號開放，避免公開註冊的帳號大量使用、產生 API 費用。

**用自己的 ChatGPT 或 Claude**：不用登入、不用額度。複製現成的提示詞（講解回饋，或是一次問一題、問完再評分的面試官追問），貼到新的對話就能用，評分標準跟內建的 AI 回饋是同一份（`shared/prompts.ts`）。回覆可以貼回來，跟這次練習一起存。行為面試的開口練習也有。

**面試官追問**：講完之後可以請 Claude 扮演面試官追問兩三題，優先問你講得模糊、跳過或講錯的地方（邊界情況、能不能更好、為什麼是這個複雜度、換個做法）。瀏覽器會把問題念出來，你可以開口用英文回答（即時逐字稿），也可以打字；回答完每題都會有 0–2 分、評語和更好的英文答法，追問和回答會跟這次練習一起存起來。出題和評分各算 1 次額度。

不登入也能完整使用，資料存在瀏覽器裡。忘記密碼可以用 email 重設（伺服器要設定 Brevo 的 `BREVO_API_KEY` 和 `MAIL_FROM`，免費方案每天約 300 封）。在「帳號」頁註冊或登入後（桌面版側邊欄、手機的「更多」和今天頁都有入口），練習紀錄、筆記、設定、微複習紀錄和白板會自動同步到雲端，換電腦或換瀏覽器都能接著用；離線時照常記錄，恢復連線後再上傳。錄音只會留在原本的裝置上。

遇到 bug、內容有錯或有想要的功能，可以到「回報問題」頁送出；微複習每張卡答完後也有「回報」按鈕。不登入也能送，表單會列出一起送出的資訊（頁面、卡片、版本、瀏覽器）。登入後可以看自己回報的處理進度；伺服器設定 `ADMIN_EMAILS` 列出的帳號會有收件匣，可以把回報標成已處理。

本機開發執行 `npm run dev`，會同時啟動網頁（http://localhost:5173）和後端（內建 PGlite 資料庫，不需要另外安裝）。`npm run test:e2e` 會先建置，再用 Playwright 跑端對端測試。

**用 GitHub 登入**：登入頁有「用 GitHub 登入」，第一次用會以 GitHub 上驗證過的 email 建立帳號。走 OAuth 2.0 授權碼流程加 PKCE，state 和 PKCE 的 verifier 存在只有發起登入的瀏覽器有的 cookie。email 已經註冊過的帳號不會自動合併（避免被冒用），要先用密碼登入，再到帳號頁按「連結 GitHub」。沒有密碼的帳號不能取消連結 GitHub；刪除帳號時改成輸入自己的 email 確認。要啟用，到 GitHub 的 Settings → Developer settings → OAuth Apps 建一個，callback 填 `<網址>/api/auth/github/callback`，再設定 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。

**每日提醒**用 Web Push：設定頁選幾點提醒，那天還沒練習時手機或電腦會跳通知，已經練過就不打擾。要啟用，先執行 `npx web-push generate-vapid-keys`，把兩把金鑰設成 Render 的 `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`；再隨便產生一串長的亂碼當 `CRON_SECRET`，Render 和 GitHub repo 的 Actions secret 都設一樣的。Render 免費方案會睡，所以由 GitHub Actions 每小時呼叫一次 `/api/push/send-due` 把伺服器叫醒並寄出。iPhone 要先「加入主畫面」才收得到。

**錯誤追蹤**用 Sentry：在 Render 設定 `SENTRY_DSN`，網頁和後端出錯時就會自動回報，不用等使用者按「回報問題」。只送錯誤本身，帳號、cookie、請求內容（筆記、逐字稿、密碼）、網址參數和 AI 的輸入輸出都不送。再設定 `SENTRY_AUTH_TOKEN`、`SENTRY_ORG`、`SENTRY_PROJECT` 的話，建置時會上傳 source map，錯誤會指到原本的 TypeScript；source map 上傳完就刪掉，不會公開。沒設定 `SENTRY_DSN` 就完全不載入 Sentry。

有裝 Docker 的話，`docker compose up --build` 會把正式版的網頁、後端和 PostgreSQL 一起跑起來，打開 http://localhost:8080 就能用，不用裝 Node 或資料庫。映像分兩段建置，最後只留執行需要的檔案，用一般使用者（不是 root）執行，並且有健康檢查。CI 每次都會建映像、用 Compose 跑起來，再對容器跑端對端測試。

部署到 Render＋Neon 的步驟：

1. 到 Neon 建立專案（區域選 AWS US East 2 (Ohio)，跟 Render 同一區），複製連線字串（`postgresql://…?sslmode=require`）。
2. 到 Render 用 GitHub 登入，選 **New → Blueprint**，選這個 repository，`DATABASE_URL` 貼上 Neon 的連線字串。
3. 部署完成後打開 `onrender.com` 的網址，確認 `/api/health` 回傳 `{"ok":true}`。之後 `main` 的 CI 通過就會自動部署。

線上版本：https://leetcode-coach-f6q7.onrender.com 。免費方案閒置 15 分鐘會休眠，之後第一次開啟大約要等一分鐘，醒來之後就很快；頁面載入過一次後也能離線使用。
