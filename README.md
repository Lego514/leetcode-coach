# LeetCode Coach（刷題教練）

A local-first study coach for LeetCode interview prep. It decides what to practice today, schedules reviews with spaced repetition, keeps structured notes, and runs timed mock interviews with think-aloud recording. To keep you coming back, an algorithm tree grows from your practice and a capybara practices with you. You can use it without an account; signing in syncs your data across devices.

You still solve problems on LeetCode. This app handles the parts around solving: planning, remembering, and explaining.

**Live app:** https://leetcode-coach-f6q7.onrender.com — it runs on free hosting that sleeps when idle, so the first visit after a while can take about a minute to wake up. After that it's fast, and once loaded it keeps working offline.

**No account needed to look around:** on the Today page, press **Try it with demo data** to fill the app with six weeks of made-up practice (reviews due, a streak, a growing tree, explanation drills, stuck patterns). It stays in your browser, is never synced, and **Clear demo data** removes it.

<picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/today-dark.png"><img src="docs/images/today-light.png" alt="The Today page: today's goal with the streak and its shields, a small algorithm tree, and the capybara coding on a laptop next to a speech bubble with an encouraging line and a tip"></picture>

## Screenshots

<table>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/practice-dark.png"><img src="docs/images/practice-light.png" alt="Timed practice with the interview steps shown one at a time"></picture><br><b>Timed practice</b>: a timer, the interview steps one at a time with a line of notes each, and <i>I'm stuck</i> and <i>I'm done</i> always at hand.</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/whiteboard-dark.png"><img src="docs/images/whiteboard-light.png" alt="The whiteboard with a sliding-window template on Longest Substring Without Repeating Characters"></picture><br><b>Whiteboard</b>: arrays, pointers, a window frame, and a count dict, from a template in one click.</td>
  </tr>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/ai-feedback-dark.png"><img src="docs/images/ai-feedback-light.png" alt="AI feedback on a spoken explanation, scored on five points with a model answer"></picture><br><b>Explaining out loud</b>: a live transcript, then Claude scores it on five points and suggests a model answer.</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/explaining-dark.png"><img src="docs/images/explaining-light.png" alt="A chart of explanation scores rising over eight drills, and how often each of the five points was covered"></picture><br><b>Explaining progress</b>: every drill's score over time, how well you cover each of the five points, and the one you skip most.</td>
  </tr>
  <tr>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/progress-dark.png"><img src="docs/images/progress-light.png" alt="The algorithm tree on the Progress page: patterns as branches with leaves, fruit, and flowers"></picture><br><b>Algorithm tree</b>: patterns are branches and problems you can solve are leaves. Leaves fade as you forget, conquered problems bear fruit, and mastered patterns bloom.</td>
    <td width="50%"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/capybara-day-dark.svg"><img src="docs/images/capybara-day-light.svg" alt="The capybara's day: asleep in bed before practice, coding on a laptop after checking in, then bubble tea or a hot spring once today's goal is done"></picture><br><b>Capybara</b>: it naps until you practice, codes along until today's goal is done, then celebrates. It grows with you and collects head items.</td>
  </tr>
</table>

Screenshots use generated demo data and are regenerated with `npm run screenshots`. They follow your GitHub theme (light or dark). The capybara animation is an SVG drawn from the app's own component and text.

## Features

- **Study lists**: NeetCode 150, Blind 75 and Grind 169 (213 unique problems), grouped into 18 patterns. You can add any other LeetCode problem. Without LeetCode Premium, one switch leaves out the Premium problems you haven't started, from the daily plan, the sprint, mock interviews, and the problem list.
- **Interview sprint**: enter the interview date, the company (optional), and how many minutes you have on weekdays and weekends. Every day until the interview gets a plan, and the last days (2 by default) are review only.
  - New problems come in priority order: problems tagged with the company, then one problem from each pattern you haven't touched, then two more from each weak pattern (average mastery under 40%, or stuck at least twice in the last 30 days), then the rest of your list. Each day takes as many as fit after its reviews, using rough times (Easy 20, Medium 35, Hard 50 minutes, 10 per review, 45 for a mock interview, 15 for behavioral practice). Problems that don't fit are listed instead of crammed in.
  - Reviews are forecast with FSRS, including the first reviews of problems you'll learn during the sprint. A problem you'd remember with less than 90% chance on the interview day is pulled into the review-only days.
  - One full mock interview two days before (and every week before that), and behavioral practice every three days ending the day before. Today shows the countdown, today's minutes, and these to-dos.
  - Paste problem numbers, links, or titles to tag a company's problems in one go, which also works for noting what came up after the interview.
  - Nothing is stored except the settings: the plan is recalculated from your progress every day, so a missed day spreads over the days left.
- **Timed practice with tiered hints**:
  - Starting a problem starts a timer against a target time for its difficulty (Easy 15, Medium 25, Hard 40 minutes). The browser tab title shows the timer, so you can see it while you write code on LeetCode.
  - The timer survives a page reload. A bar at the bottom keeps the timer, **I'm stuck**, and **I'm done** in reach while you scroll.
  - If you get stuck, open hints one layer at a time: which pattern to use, a hand-written key insight for each of the 213 problems, the edge cases to check, then the pattern template. A link to the LeetCode solutions comes last.
  - When you finish, the minutes are filled in (you can adjust them) and a self-rating is suggested based on how many hints you used.
- **Solving steps**: practice, mock interviews, and the problem page share the seven interview steps (clarify, examples, brute force, optimize, code, test, complexity), and you write one line per step. On the practice page the steps open one at a time, and you can jump to any of them. Examples split into an example and its edge cases, and Optimize asks three questions: what's slow, what's repeated, and what to keep. The lines are saved with the problem's notes and synced, so a review starts from how you thought it through, not just the code. In a mock interview they sit under each step's checklist.
  - **Write the script from your steps**: a dialog lays out the five sentences of the English explanation script, each with the step notes that feed it (for example, the edge-case sentence shows your edge cases). You write each sentence yourself, which is the practice, and save it as the problem's script.
  - **Hints that start from where you're stuck**: pick the step you're stuck on to see how to think about it, next to what you wrote in the step before. This doesn't count as a hint. Some steps jump straight to the matching layer: Examples and Test to the edge cases, Optimize to the key insight, and Code to the template.
- **Spaced repetition with FSRS**: after each attempt you rate yourself (solved alone / needed a hint / read the solution / still stuck), and FSRS, the scheduler Anki uses, picks the next review date.
  - Each problem has a stability (days until your chance of remembering it drops to 90%) and a difficulty from 1 to 10. Solved alone counts as Good, a hint as Hard, and reading the solution or still being stuck as Again. A review that came late but still went well grows the interval more.
  - Problems come back when you're about as likely to remember them as the target retention in Settings (90% by default; 80–95%). Changing it reschedules every problem.
  - **Time counts too.** Each attempt's minutes are compared with the problem's target time. Within the target it counts fully; past it, the memory gain shrinks steadily, down to 0.6 at twice the target (about what FSRS gives Hard). Finishing early adds nothing extra.
  - **So do hints and where you got stuck.** The deeper the hints went, the less the attempt counts: compared with solving alone, about 0.8 after the pattern hint, 0.6 after the key insight, 0.5 after the edge cases, and 0.4 after the template. Missing the pattern, the optimization, or how to code it means part of it is forgotten (×0.75); missing an edge case or having a bug is more of a slip (×0.9). These weights multiply.
  - **Shaky solves come back within a week.** After needing a hint, taking twice the target or longer, or getting stuck on the pattern, the optimization, or the code, the next review is at most 7 days away, so you confirm it before the interval grows. FSRS's memory estimate is kept, so solving it on time then stretches the next interval out again.
  - The review queue puts the problem you're most likely to have forgotten first. Problem pages show how likely you are to remember it now, how long it holds, its difficulty, and where it sits on the algorithm tree.
  - Past records can be edited or deleted, from **Done today** on Today or the problem's history, and the schedule is rebuilt from what's left.
  - The scheduler is written from the FSRS-6 formulas with the default parameters, and the tests compare it with the official `ts-fsrs` (a test-only dependency) on hundreds of random review histories.
- **Daily plan**: the Today page lists the reviews that are due plus N new problems. By default the new problems are *interleaved*: mostly the pattern you're learning, plus one from another pattern so you practice recognizing which approach fits, and a pattern you've been stuck on lately (solutions read, still stuck, or stuck reasons ticked) gets an extra, easier problem. The pattern isn't shown until you ask, as in an interview. Settings can switch to strict roadmap order or to focusing on one pattern, and the day's list is planned from the morning's state so it doesn't reshuffle as you work. At the top, a progress bar and three numbers show how much of the list is left, your daily pace, and when you'll finish the first pass. With a target date set, they show the days left and how many new problems a day you need, flagged when your daily goal is too low.
  - Any new problem you start counts toward the daily goal, wherever you start it. **One more problem** adds the next one in roadmap order.
  - Settings can cap how many Medium and Hard problems and how many reviews come each day; the review page lists what's up next beyond today's cap.
  - **Adjust difficulty automatically** (on by default, off during a sprint): when most recent Mediums needed a hint, new problems include fewer Mediums and no Hards until you solve them on your own again.
  - A review whose last attempt needed a hint or the solution is marked **Rewrite**: write it from scratch, without your notes, until it passes.
  - **Record another problem** finds a problem by number, title, or LeetCode URL. If it isn't in your lists yet, you add its details and record it in the same dialog.
  - **Mark problems I solved before** (on Problems) schedules problems you solved before using the app for review in one go. A big batch is spread out so no more than five problems come due on any day, counting reviews already scheduled. They don't count toward streaks or session totals.
- **Staying motivated**: everything here is calculated from your practice records, so nothing extra is synced; only small choices, like which head item the capybara wears, stay in the browser.
  - **Today's goal**: one problem or one round of flashcards checks you in, and new problems and reviews are counted separately. Every day you practice earns a streak shield (up to two); miss a day and one is used automatically, so the streak doesn't break.
  - **Algorithm tree**: each pattern is a branch and each problem you can solve now is a leaf, colored by how likely you still remember it (FSRS): yellow when it's fading, dry when it's probably forgotten. A problem that needed a hint or the solution is a sprout until you rewrite it on your own. Conquered problems bear fruit, and patterns where 80% of the problems are solid bloom. The tree grows from a seed: it sprouts at the first problem and becomes a sapling at 5, a young tree at 20, and a grown tree at 60. Today shows a small one, Progress the whole tree, and **Share as image** draws it with this week's numbers.
  - **Capybara**: it grows from a baby to a young (7 days of practice) and a grown-up capybara (21 days), and collects ten head items for goals like a 7-day streak, 100 flashcards, or 10 explanation drills. On Today it naps in bed until you practice, codes on a laptop until today's goal is done, then drinks bubble tea or soaks in a hot spring (one or the other each day). On wide screens a speech bubble next to it has an encouraging line, a daily tip (a Python tip or a pattern summary), and the head item you're closest to.
  - **Wins and next goals**: a message celebrates conquering a problem, a pattern leveling up, a new personal best time, the tree's next stage, and new head items. Today names the next goal, such as "3 more problems and Binary Search reaches Got it", and for the first three days of each week it shows last week's numbers until you dismiss them.
  - Progress also shows your interview readiness (problems you can solve now, overall, by difficulty, and by company tag), a pattern map with each pattern's level, and a weekly recap compared with last week.
- **Daily reminders**: when signed in, pick an hour in Settings, and on days you haven't practiced by then you get a notification (Web Push). Today walks you through turning it on, including adding the app to the home screen on iPhone.
- **Notes**: for each problem you can keep a one-line idea, an English explanation script, time and space complexity, pitfalls, and your code (Python or one of eight other languages). Notes save automatically.
- **Pattern cards**: each pattern has recognition signals, common mistakes, and a Python template you can edit.
- **Interview phrases**: English phrases for each stage of a coding interview, with a self-quiz that hides each phrase until you've tried saying it, and the five-part outline for explaining a solution.
- **Reference explanations**: a hand-written model answer in English for each of the 213 problems, in five sentences (key insight, data structure, example, complexity, edge case). It stays collapsed, with a nudge to try explaining it yourself first, and it's shown next to your own attempt after an explanation drill.
- **Flashcards for spare minutes**: five tap-only cards per round, about a minute, sized for a phone between gym sets.
  - Cards are generated from your own data:
    - which pattern a problem uses
    - its key insight and its complexity (distractors come from the same pattern, and patterns a clue could also fit are never offered against each other)
    - an "explain it out loud, then flip" card
    - the pattern signals
    - 59 Python tips whose answers were checked by running the code
  - Problem cards start with a one-line reminder of what the problem asks, written so it doesn't give away the technique.
  - **I don't know** shows the answer instead of rewarding a lucky guess.
  - Missed cards come back at the end of the round with reshuffled options until you get them right, and the summary lists them with their answers.
  - Practice everything, only problems you've done, only clues, only Python tips, or one pattern.
  - A **rest timer** (60–180 seconds) counts down between sets. When it ends it beeps, vibrates where supported, and shows an alert, and it asks the browser to keep the screen on while it runs.
  - Answers save one at a time, sync like attempts, and count toward the streak.
- **Whiteboard**: [DSA Whiteboard](https://github.com/Lego514/dsa-whiteboard), which I built from scratch for this app and later split into its own open-source package ([try it standalone](https://lego514.github.io/dsa-whiteboard/)). Drag arrays, pointers, stacks, queues, dicts, sets, 2D arrays, variables, binary trees, linked lists, graphs, heaps, union-find, tries, bits, recursion trees, DP tables, intervals, tables, text, code, and sticky notes onto a pannable, zoomable canvas to trace an idea by hand. It has templates for common patterns, Build from text (paste a problem's example), range frames for sliding windows, a LeetCode-style code box with line-by-line tracing, step-by-step playback, and PNG export. See its README for the full list.
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
  - **AI feedback (Claude)** on the transcript: a 0–2 score for each of the five explanation points with comments, strengths, concrete rewrites of unclear phrases, and a model answer you can save as your script. With an account, the server holds the API key and enforces a daily limit per user; with your own key (below), no account is needed. In the live app it is on for allow-listed accounts only (`AI_ALLOWED_EMAILS`), so a public sign-up can't run up the API bill.
  - **Use your own ChatGPT or Claude**: no account or AI requests needed. Copy a ready-made prompt (feedback on the explanation, or an interviewer who asks follow-ups one at a time and then grades them) and paste it into a new chat. The scoring points are the same ones the built-in AI feedback uses, shared from `shared/prompts.ts`. Paste the reply back and it's saved with the session. Behavioral practice has the same option.
  - **Your own AI key**: add an Anthropic, OpenAI, or OpenRouter API key in Settings to use explanation feedback, interviewer follow-ups, and behavioral feedback with no sign-in and no daily limit. The key stays in that browser's local storage: the browser calls the provider directly, so it never reaches the server and isn't synced. It also turns on **Think it through with AI** in the practice hints, a chat that asks one question at a time so you work it out yourself, and never gives code. The prompts and output schemas are shared with the server (`shared/ai.ts`).
  - **Interviewer follow-ups (Claude)**: after you explain, Claude plays the interviewer and asks two or three follow-up questions aimed at what your explanation left vague or got wrong (edge cases, can you do better, why that complexity, another approach). The browser reads each question aloud, and you answer by speaking (a live English transcript) or typing. Then each answer gets a 0–2 score, a comment, and a stronger spoken answer. The questions and answers are saved with the drill. Asking and grading each count as one request toward the daily limit.
- **Progress**: totals (attempted, mastered, streak, sessions), then the algorithm tree, the capybara's collection, interview readiness, the pattern map, and the weekly recap. Below them are a year-long activity heatmap like LeetCode's (darker squares mean more problems that day; flashcard-only days show the lightest shade) with active days and the longest streak, a per-pattern mastery grid, where you get stuck, a weekly practice chart, and a breakdown by difficulty.
  - **Explaining**: every explanation drill on a chart, scored by the AI when it gave feedback and otherwise by the five points you ticked, with a rolling average. It shows how well you cover each point over the last five drills compared with the five before, which point you skip most, how often it felt smooth, and your average score on interviewer follow-ups.
- **Where you get stuck**: when you record a problem (or finish a full mock), you can tick what went wrong: didn't see the pattern, couldn't optimize, couldn't code it, missed an edge case, had a bug, or ran out of time. Progress counts the last 90 days by reason, shows which patterns each one happens in most, and links to what to practice. Problem history shows the reasons, and the interview sprint adds two extra problems from patterns you got stuck in at least twice in the last 30 days.
- **Accounts and offline-first sync**: sign up with email and password, or with GitHub, to sync attempts, mock interviews and explanation drills, notes, tags, pattern notes, custom problems, settings, flashcard answers, whiteboards, and behavioral stories and practice between devices. Everything keeps working offline and without an account. Sign-in has its own page, linked from the sidebar, the More tab, and a dismissible banner on Today on phones. The password fields have a show/hide toggle.
  - Passwords can be reset by email. A reset link works once, expires in an hour, and signs you out on every device. It needs `BREVO_API_KEY` and `MAIL_FROM`; without them the feature is hidden.
- **Bug reports and suggestions**: a "Report a problem" page, a Report button on every flashcard once it's answered, and a link on the error screen. Reports work without an account; the form shows exactly what gets attached (page, card, version, browser). Signed-in users can follow the status of their own reports, and admin accounts (`ADMIN_EMAILS`) get an inbox to mark them resolved.
- **English and Traditional Chinese**: the whole app is translated, including the pattern cards, all 213 hints, and the interview flow. It follows the browser language by default, and you can switch from the sidebar or Settings.
- **Installable PWA** that works offline, with light and dark themes (it follows the system by default; a sun/moon button next to the language switch flips it, and pressing it again goes back to following the system), a choice of app icon (grid, grid tree, sprout, or acorn), and JSON backup/restore. New versions install themselves and reload the page, but wait while a timed practice or mock session, a flashcard round, a whiteboard, or the report form is open.

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
| Illustrations | Drawn in code as SVG React components (the algorithm tree, the capybara and its poses, empty-state art), colored with CSS variables for both themes; the README's capybara animation is generated from the same component |
| Quality | Vitest (unit, API, and two-device sync tests), Playwright end-to-end tests against the production build and a real PostgreSQL on Chromium and iPhone WebKit, ESLint, GitHub Actions CI |
| AI | Claude Opus 5.5 through the Anthropic TypeScript SDK, JSON-schema structured output, server-side refusal fallback, per-user daily quota stored in PostgreSQL. With your own key, the browser calls Anthropic (the same SDK), OpenAI, or OpenRouter directly, using the same prompts and schemas (`shared/ai.ts`) |
| Hosting | Render (one Node service for the API and the web app), Neon PostgreSQL |
| Auth | Email and password (scrypt, only hashed session tokens stored) plus Sign in with GitHub (OAuth 2.0 authorization code flow with PKCE, explicit account linking); a fake GitHub server covers the whole flow in end-to-end tests |
| Monitoring | Sentry for the React app and the Hono API: errors only (no tracing), loaded only when a DSN is set, with account info, cookies, headers, request bodies, query strings, AI inputs and outputs, and local variables kept out; source maps are uploaded at build time and not published |
| Containers | Multi-stage Dockerfile (build, then a slim runtime that runs as a non-root user with a health check) and Docker Compose with PostgreSQL; CI builds the image, starts it with Compose, and runs end-to-end tests against the container |

## Architecture

![Architecture: a React PWA stores data in IndexedDB and syncs through a Hono API on Render to Neon PostgreSQL; the API calls Claude for feedback, GitHub for sign-in, Brevo for email, and browser push services for daily reminders; with your own key the browser calls the AI provider directly; the whiteboard connects over WebSockets to Cloudflare Workers for live co-editing; Sentry receives errors; GitHub Actions tests every change, including a Docker container, before Render deploys, and wakes the API hourly to send reminders](docs/architecture.svg)

```
src/                 Web app
  data/                Static content: problems, lists, patterns, hints, edge cases, summaries, reference explanations, Python tips, interview steps and phrases, behavioral questions
  lib/                 Pure logic: scheduler (FSRS), dates, stats, catalog, practice session
    cards.ts             Flashcards: deck, Leitner boxes, picking and dealing a round
    motivation.ts        Today's goal, readiness, pattern levels, wins, weekly recap
    tree.ts              Algorithm tree: shape, growth stages, and how each problem looks
    companion.ts         Capybara: growth, head items, today's pose
    explainProgress.ts   Explanation scores over time
  store/               Data layer
    db.ts                Dexie schema (v2: sync ids, outbox, sync state; v3: flashcard answers; v4: whiteboards; v5: FSRS rebuild; v6–7: behavioral stories and practice)
    actions.ts           Every local write; each one also records a change in the outbox
    queries.ts           Every read, as React hooks
    tracking.ts          Local record ⇄ sync payload conversion, schedule replay
    progress.ts          Rebuilds a problem's FSRS state from its attempts
    sync.ts              Sync engine (push outbox, pull changes, apply)
    cloud.ts             Account state and automatic sync scheduling
    ownAi.ts             Your own AI key, in local storage only (never synced)
  i18n/                Locale detection, typed dictionaries (zh-TW, en), date formatting
  components/, pages/  UI (components/board/ wires the dsa-whiteboard package to storage, sync, and explain mode)
shared/              Code used by both sides: ids, the zod request/response schemas, streak rules, AI prompts and output schemas
server/              API
  src/app.ts           Hono app: security middleware, routes, static files
  src/env.ts           Settings from environment variables, and which features are on
  src/auth/            Password hashing, sessions, password reset, Sign in with GitHub, rate limiting, auth routes
  src/mail/            Brevo email client and the reset message
  src/push/            Daily reminders: Web Push subscriptions and the hourly send
  src/sync/            Sync endpoint and last-write-wins upserts
  src/ai/              Explanation, follow-up, and behavioral feedback through Claude, quota-limited routes
  src/reports/         Bug reports and the admin inbox
  src/monitoring.ts    Sentry, with personal data kept out
  src/db/              Drizzle schema, database client (PostgreSQL or PGlite), migration runner
  migrations/          Plain SQL migrations, applied in order at startup
  test/                API tests and two-device end-to-end sync tests
e2e/                 Playwright tests: practice and review, mock interview with a transcript, flashcards, whiteboard, the tree and the capybara, language, sync between two browsers; fake-github.mjs stands in for GitHub
scripts/screenshots/ README screenshots from demo data, and the capybara animation
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
  - Records with a real modification time (attempts, mock sessions, notes, pattern notes, flashcard answers, whiteboards, behavioral stories and practice) keep it.
  - Records without one (settings, tags, custom problems) are sent with time 0. If the account already has that record, the account's version wins.
- **Audio recordings stay on the device.**

Known limitation: conflicts are decided by each device's clock.

### Security

- **Passwords** are hashed with scrypt (N=2^15) and a random salt. A failed login for an unknown email still runs a dummy hash, so response times don't reveal which emails are registered.
- **Session tokens** are random 256-bit values. The database stores only their SHA-256 hash.
- **The session cookie** is `HttpOnly` and `SameSite=Lax`. In production it is also `Secure` and uses the `__Host-` prefix. Sessions last 30 days and renew when used.
- **CSRF**: writes must be `application/json`, which a cross-site browser request can't send without a CORS preflight that this API never grants. Requests from foreign `Origin`s and requests marked `Sec-Fetch-Site: cross-site` are rejected.
- **Rate limits** apply to registration, to login attempts (per IP and per IP-plus-email), to password reset requests (per IP and per email), to reports, to starting a GitHub sign-in, and to bursts of AI requests.
- **Sign in with GitHub** uses the OAuth 2.0 authorization code flow with PKCE (S256). The `state` and the PKCE verifier live in a short-lived `HttpOnly`, `SameSite=Lax` cookie in the browser that started the sign-in, so a callback from anywhere else does nothing. Only a verified GitHub email can create an account, and an email that is already registered is never merged automatically (that would let anyone who controls a GitHub account with your email take over yours): you sign in with your password and connect GitHub from the Account page. GitHub can't be disconnected from an account without a password, and a GitHub-only account confirms deletion by typing its email.
- **Other protections**: request bodies are size-limited, security headers are set, and API responses are `no-store`.
- **Input validation**: every synced record is checked against a per-collection zod schema, and unknown fields are dropped.

### Review scheduling

Problems are scheduled with FSRS-6 and its default parameters. Each self-rating maps to an FSRS grade:

| Self-rating | FSRS grade |
| --- | --- |
| Solved alone | Good |
| Needed a hint | Hard |
| Read the solution | Again |
| Still stuck | Again |

- The next review falls on the day your chance of remembering drops to the target retention (90% by default, 80–95% in Settings), at least 1 day and at most 120 days later.
- **Time weight**: when an attempt has minutes, its pace is minutes ÷ the problem's target (Easy 15, Medium 25, Hard 40). The weight is 1 up to the target, falls linearly to 0.6 at twice the target, and stays there. It multiplies how much stability grows on a successful review, or the starting stability on a first attempt. Attempts without minutes (like problems marked as solved before) use 1.
- **Hint depth and stuck reasons**: with Needed a hint, the deepest hint layer scales FSRS's Hard by 1.3, 1, 0.85, or 0.7 (pattern, key insight, edge cases, template), about 0.8, 0.6, 0.5, and 0.4 of a solo solve. A memory stuck reason (pattern, optimize, can't code it) multiplies by 0.75, an execution one (edge case, bug) by 0.9, and running out of time adds nothing because the time weight covers it. All weights multiply.
- **One-week confirmation**: after Needed a hint, a memory stuck reason, or a successful solve at twice the target or slower, the interval is capped at 7 days while the stability stays as FSRS computed it. FSRS's default parameters come from flashcard reviews, where a hard recall still means you know it; on a coding problem, needing help usually means part of it is gone.
- With no minutes and no hint, the result is plain FSRS-6, which the tests check against `ts-fsrs`.
- The interval sets the stage: under 7 days is learning, under 30 is reviewing, and 30 or more counts as "mastered".
- A problem's schedule is rebuilt by replaying its attempts in time order, which is why schedules don't need to be synced.
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
npm run screenshots  # rebuild, then regenerate the README screenshots and the capybara animation in docs/images/
npm start            # run the built API (and the web app when NODE_ENV=production)
```

- In development the API stores data with PGlite in `server/.data/pglite`. Delete that folder to start over.
- Server settings are read from `server/.env`. See `server/.env.example`.
- The web app still works as a static site without the API: sign-in shows as unavailable and data stays in the browser.
- To regenerate the PWA icons, run `node scripts/generate-icons.mjs`.
- The Playwright tests start the built server on port 4310 with an in-memory PGlite database, and a fake GitHub on port 4320. Set `E2E_DATABASE_URL` to run them against PostgreSQL, as CI does. The first time, run `npx playwright install chromium`.

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
- **AI feedback** needs an API key from the [Claude Console](https://platform.claude.com). Add it as `ANTHROPIC_API_KEY` on Render (or in `server/.env` locally), and list the accounts allowed to use it in `AI_ALLOWED_EMAILS`. The list is empty by default, so sharing the app never lets other people spend your credits by accident. Each request costs roughly US$0.03–0.10 with Claude Opus 5.5 (US$4 / US$20 per million input / output tokens, thinking included), so 20 drills a month is about US$1–2. Setting a monthly spend limit in the Console is a good safety net.

## Data and privacy

- **Without an account**, everything stays in the browser's IndexedDB. Export a backup from **Settings** before you switch browsers or clear site data.
- **With an account**:
  - Attempts, mock interviews and explanation drills, notes, tags, pattern notes, custom problems, settings, flashcard answers, whiteboards, and behavioral stories and practice sync to the server.
  - Audio recordings never leave the device, and backups don't include them either.
  - Transcripts are saved with the mock session and sync like the rest of your data.
- **Transcripts** are optional and use the browser's speech recognition. Chrome sends the audio to Google's servers to turn it into text.
- **AI feedback** sends the transcript, how long you spoke, and the problem (number, title, difficulty, pattern) to Anthropic's API only when you press the button. Behavioral feedback also sends the question and the story's STAR notes; follow-ups send your explanation and answers. The server stores daily request and token counts per user, not the transcript itself.
  - Deleting the account removes it and all of its server data.
- **Your own AI key** stays in the browser. With it, requests go straight from the browser to the provider you picked, never through the server.
- **Reports** you send store the message, the optional contact you typed (only when signed out), and the details listed on the form. They are linked to your account when you're signed in and deleted along with it.
- **Signing out** can either keep the local copy or clear it (for shared computers).
- **Problem statements are not included.** The app stores only titles and links to leetcode.com.

## Roadmap

- **Mock interviews with a friend**: an interviewer view with the problem and a scoring sheet, on a shared whiteboard.
- **Job application tracker**: each company's stage and dates, linked to the interview sprint.
- **Whiteboard**: flashcards that show a recorded step and ask what happens next. Whiteboard features themselves are tracked in [dsa-whiteboard](https://github.com/Lego514/dsa-whiteboard).
- **More AI assistance**: hints that react to your own code, and code review.

---

## 中文說明

這是一個幫忙準備美國軟體工程師面試的刷題教練。題目還是在 LeetCode 上寫，這個 App 負責寫題以外的事：決定今天練什麼、用 FSRS（Anki 用的排程演算法）排好每一題的複習、記筆記和解題步驟、練習用英文把解法講清楚。演算法樹和陪你刷題的卡皮巴拉讓人每天想回來。不用帳號就能用，登入後可以在不同裝置之間同步。

**線上版本**：https://leetcode-coach-f6q7.onrender.com 。免費方案閒置 15 分鐘會休眠，之後第一次開啟大約要等一分鐘，醒來之後就很快；頁面載入過一次後也能離線使用。想先看看的話，在今天頁按「用示範資料看看」，會載入六週編出來的練習紀錄（到期的複習、連續天數、長大中的樹、講解練習、常卡住的模式），只存在你的瀏覽器、不會同步，隨時可以清掉。上面的截圖也是這份示範資料，`npm run screenshots` 會重新產生。

### 功能

**題庫**：NeetCode 150、Blind 75、Grind 169（不重複共 213 題），分成 18 個模式，也可以加入任何 LeetCode 題目。沒有 LeetCode Premium 的話，可以「跳過要 LeetCode Premium 的題目」，還沒做過的 Premium 題就不會出現在每日計畫、衝刺、模擬面試和題庫裡。

**每日計畫（今天頁）**：列出到期的複習和每天 N 題新題。預設是「交錯」：大部分是正在學的模式，再加一題別的模式，練習看出該用哪一招；最近常卡住的模式（看了解答、看完還不懂，或勾了卡住原因）會多一題比較簡單的。預設不顯示模式，跟面試一樣自己看出來。設定可以改成照路線順序，或專練一個模式；當天的清單照早上的狀態排好，做的過程中不會一直變。最上面有進度條和三個數字：清單還剩多少、每天的速度、預計什麼時候刷完第一輪；設定了目標日期的話，改成顯示剩幾天、每天要做幾題，每日目標太低時會提醒。
- 不管從哪裡開始的新題都算進今天的目標；做完還可以「再來一題」。
- 設定可以限制每天最多幾題 Medium、幾題 Hard 和最多複習幾題，複習頁會列出接下來的題目。
- 「自動調整難度」（預設開，衝刺時關）：最近的 Medium 大多要看提示時，先少排 Medium、不排 Hard，自己解得出來之後再調回去。
- 上次看了提示或解答的複習題會標成「重寫」：不看筆記，在 LeetCode 從頭寫到通過。
- 「記錄其他題目」輸入題號、題名或網址就能記錄；清單裡沒有的題目，在同一個對話框補上資料。
- 題庫的「標記以前刷過的題」可以一次把以前刷過的題排進複習。一大批會分散到之後幾天，每天最多 5 題到期（算進已經排好的複習），也不會算進連續天數和練習次數。

**面試衝刺**：輸入面試日期、公司（選填）、平日和週末每天能花幾分鐘，排好到面試前每天要做的事，最後幾天（預設 2 天）只複習。
- 新題的順序：有標這家公司的題目、每個還沒碰過的模式各一題、每個比較弱的模式多兩題（平均熟練度不到四成，或最近 30 天卡住兩次以上），然後是清單的其他題。每天扣掉複習之後放得下幾題就排幾題（估算 Easy 20、Medium 35、Hard 50 分鐘，複習一題 10 分鐘，模擬面試 45 分鐘，行為面試練習 15 分鐘），排不進去的會列出來，不會硬塞。
- 複習用 FSRS 預估，包含衝刺中新做的題目；到面試那天記得的機率低於 90% 的題目，提前到最後幾天複習。
- 面試前兩天（以及再往前每週）一場完整模擬面試，每三天一次行為面試練習，最後一次在面試前一天；今天頁會顯示倒數、今天大約幾分鐘和這些待辦。
- 可以一次貼上很多題號、網址或題名標上公司，面試完也可以用來記下考了哪些題。
- 只存設定，計畫每天依進度重新計算，哪天沒做到，剩下的天數會自動分攤。

**計時練習和提示**：開始一題就開始計時，目標時間看難度（Easy 15、Medium 25、Hard 40 分鐘）。瀏覽器分頁的標題會顯示計時，切去 LeetCode 寫也看得到；重新整理也不會歸零。解題步驟一次只露出一步，也可以直接跳到任何一步；下面一列固定放計時、「我卡住了」和「寫完了」。提示一層一層打開：方向（模式）、213 題各自手寫的關鍵觀察、要檢查的邊界情況、模板，最後才是 LeetCode 解答的連結。寫完會自動填好花了幾分鐘（可以改），並依用了幾層提示建議自評。練習時打開白板，計時不會中斷。

**解題步驟**：練習頁、模擬面試和題目頁共用面試的七個步驟（釐清題意、舉例、暴力解、優化、寫程式、驗證、複雜度），每一步寫一句自己的想法。舉例拆成「例子」和「邊界情況」，優化拆成三個問題：慢在哪、哪裡重複算、要留下什麼。寫的內容存在這題的筆記裡、會同步，複習時看得到當時怎麼想的；模擬面試時會出現在每一步的檢查清單下面。
- 「照步驟寫英文講解稿」：講解稿的五句各列出相關步驟寫過的內容，自己逐句寫成英文（這就是練習），存成這題的講解稿。
- 提示面板可以先選「卡在哪一步」，看這一步怎麼想和自己上一步寫的內容，不算用了提示。有些步驟會直接打開對應的那一層：舉例和驗證打開邊界情況、優化打開關鍵觀察、寫程式打開模板。

**複習排程（FSRS）**：每次練完自評（自己解出、看了提示、看了解答、看完還不懂），FSRS 排下一次複習。每一題有「穩定度」（隔幾天之後，記得的機率會掉到 90%）和 1 到 10 的難度。自己解出算 Good、看提示算 Hard、看解答或看完還不懂算 Again；晚了才複習但還記得，下次的間隔會拉得更長。題目會在你大概還記得「目標記憶率」那麼多的時候再出現（設定可以選 80%–95%，預設 90%），改了之後每一題都會重新排程；間隔最少 1 天、最多 120 天。
- **寫題時間也算進去**：每次花的時間跟這題的目標時間比，在目標以內照算；超過就打折，越慢折越多，到兩倍時間是 0.6（跟 FSRS 給 Hard 的差不多）。寫得比目標快不另外加分。
- **提示看到第幾層、卡在哪也算進去**：看的提示越深，這次算得越少；跟自己解出比，看到題型約 0.8、關鍵觀察 0.6、邊界情況 0.5、模板 0.4。沒看出模式、想不到優化、寫不出來代表忘了一部分（× 0.75）；漏了邊界情況、有 bug 比較像失誤（× 0.9）。幾個權重相乘。
- **寫得不順先在一週內確認**：看了提示、花了兩倍以上的時間，或卡在沒看出模式、想不到優化、寫不出來，下次最多 7 天後再複習；穩定度照 FSRS 算，確認那次準時寫出來，下一次就會拉長。
- 複習頁把最可能已經忘了的題目排在最前面；題目頁顯示現在還記得的機率、大約記得住幾天、難度，和它在演算法樹上的位置。
- 練習紀錄可以修改或刪除（今天頁的「今天做過的」，或題目頁的紀錄），排程會依剩下的紀錄重算。
- 排程是照 FSRS-6 的公式自己寫的，測試裡拿官方的 `ts-fsrs` 在幾百組隨機的複習紀錄上逐一比對。

**筆記、模板卡和英文句型**：每一題可以記一句話的思路、英文講解稿、時間和空間複雜度、容易錯的地方和程式碼（Python 或另外八種語言），會自動儲存。模板卡：每個模式有辨識訊號、常見錯誤和可以自己改的 Python 模板。「英文句型」頁依面試流程整理常用的英文句子，自我測驗時先藏住英文，看著中文試著說出口再對答案；也有講解一題的五段架構。
- 每一題都有一份英文參考講法（關鍵觀察、資料結構、例子、複雜度、邊界情況五句），預設收起，建議自己先講過再打開對照；講解練習結束後會直接顯示在旁邊。

**微複習**是給健身組間、排隊這種零碎時間用的。一回合 5 張卡，只要點不用打字，大約 1 分鐘：
- 卡片內容：做過的題目用哪個模式、關鍵觀察、複雜度、口頭講解翻面卡、看線索想模式、59 張 Python 小知識（每一題都實際跑過程式確認答案）。題目卡會先用一句話提醒這題在問什麼，寫法不會洩漏要用的技巧。
- 不會就按「我不知道」直接看答案，不用亂猜。答錯的卡會在回合最後重考，選項重新洗牌，答對才過關；最後的總結會列出答錯的卡和答案。
- 可以只練某個範圍：全部、做過的題目、看線索、Python 小知識，或某一個模式。今天答過的卡不會拿來補滿一回合：範圍太小時這一回合就少幾張，做完了會提示換成「全部」。範圍是「全部」時，5 張裡最多 3 張是題目卡。
- 上方有組間休息計時器（60–180 秒），時間到會響、手機會震動、會跳出提醒；倒數時會請瀏覽器讓螢幕保持亮著。
- 每張卡答完就存、會同步，做微複習的日子也算進連續天數。卡片用另外的 Leitner 盒子排程，不會動到題目的複習日。

**白板**是我為這個 App 從頭寫的，後來拆成獨立的開源專案 [DSA Whiteboard](https://github.com/Lego514/dsa-whiteboard)（[直接試用](https://lego514.github.io/dsa-whiteboard/)）：
- 可以拖拉陣列、指標、堆疊、佇列、字典、集合、二維陣列、變數、二元樹、鏈結串列、圖、堆積、併查集、字典樹、位元、遞迴樹、DP 表、區間、表格、文字、程式碼和便利貼，取代紙筆手動跑一遍。有常見模式的模板、貼上題目範例就能建立、滑動視窗的範圍框、LeetCode 風格的程式碼框和逐行追蹤、逐步播放、匯出圖片。完整功能請看那邊的 README。
- **講解模式**（只有這個 App 有）：照著記好的步驟用英文講出來。這一步的說明會當作提詞，同時計時、錄音、顯示即時逐字稿。講完看每一步講了多久（特別久的那步通常就是還講不順的地方）、聽錄音、修正逐字稿；在題目的白板上還可以勾有講到哪幾個重點、拿 AI 回饋、把逐字稿存成講解稿，並存成一筆講解練習，在模擬面試的紀錄裡標成「白板」。
- 每一題有自己的白板，另外有一張自由白板；「我的白板」列出全部，也寫出存在哪裡。白板會自動儲存，登入後會同步。
- **共用**：模擬面試或一起讀書時，把白板的連結傳給對方，打開的人都能一起編輯，看得到每個人的游標和名字，對方不用帳號。自己的白板不會被改到，想留下共用的內容就按「存一份到我的白板」。房間在 dsa-whiteboard 的 Cloudflare Worker 上。

**講解和模擬面試**：
- 計時的美式面試七步驟流程，每一步有檢查清單和英文說法，也能用同一個提示面板（像面試官給提示）。可以錄音（MediaRecorder），結束後自我檢討；也有兩分鐘的講解練習。
- 可以開啟英文即時逐字稿（瀏覽器的語音辨識，Chrome 會把聲音送到 Google 轉成文字）。結束後可以修正內容、看字數、語速和贅詞，再一鍵存成這題的講解稿。
- **AI 回饋（Claude）**：依五個重點各給 0–2 分和評語，列出優點、改寫講不清楚的句子，並給一份可以存成講解稿的參考講法。登入的話由伺服器的金鑰呼叫，每人每天預設 20 次；線上版本只對允許名單（`AI_ALLOWED_EMAILS`）裡的帳號開放，避免公開註冊的帳號大量使用、產生 API 費用。
- **面試官追問（Claude）**：講完之後可以請 Claude 扮演面試官追問兩三題，優先問你講得模糊、跳過或講錯的地方（邊界情況、能不能更好、為什麼是這個複雜度、換個做法）。瀏覽器會把問題念出來，你可以開口用英文回答（即時逐字稿），也可以打字；回答完每題都會有 0–2 分、評語和更好的英文答法，追問和回答會跟這次練習一起存起來。出題和評分各算 1 次額度。
- **用自己的 AI 金鑰**：在設定填 Anthropic、OpenAI 或 OpenRouter 的 API 金鑰，不用登入、沒有每天的次數限制，就能用講解回饋、面試官追問和行為面試回饋；練習頁的提示也會多一個「AI 陪你想」，一次只問一個問題讓你自己想出來，不會給程式碼。金鑰只存在這個瀏覽器，由瀏覽器直接呼叫 AI，不會經過我們的伺服器，也不會同步；提示詞和輸出格式跟伺服器共用（`shared/ai.ts`）。
- **用自己的 ChatGPT 或 Claude**：不用登入、不用額度。複製現成的提示詞（講解回饋，或是一次問一題、問完再評分的面試官追問），貼到新的對話就能用，評分標準跟內建的 AI 回饋是同一份（`shared/prompts.ts`）。回覆可以貼回來，跟這次練習一起存。行為面試的開口練習也有。

**行為面試**：用 STAR（情境、任務、行動、結果）寫自己的故事，標上它能回答哪些主題（衝突、失敗、領導、期限、不確定、說服、學習、最自豪、回饋、團隊合作），會自動儲存並同步。
- 每一段有英文開頭句可以點來用，也會估計講完要多久（每分鐘約 140 字，目標 1.5–2.5 分鐘），行動那段不到四成時會提醒。
- 「開口練習」可以抽一題（不限主題或指定主題），選一個故事回答（這個主題的故事排前面），先看一下筆記，再用英文計時回答，可以錄音、顯示即時逐字稿。講完看逐字稿的字數、語速、贅字，以及講了幾次「I」、幾次「we」，勾 STAR 自我檢查、選講起來的感覺。
- 也可以拿 AI 回饋：Claude 依 STAR 和「你自己的貢獻」打分數，引用要修改的句子，並保留你的事實，改寫成大約兩分鐘的英文回答（不會亂編數字），跟講解回饋共用每天的次數。練習紀錄會同步（錄音只留在本機），也算進連續天數。
- 覆蓋率一眼看出哪些主題還沒有故事；30 題常見題目依主題分類，附中文翻譯和面試官想看什麼，旁邊列出可以用的故事，或直接幫這題寫一個。

**保持動力**：下面這些都從練習紀錄算出來，不會另外同步；只有卡皮巴拉戴哪個頭飾這種小選擇存在瀏覽器。
- **今天的目標和連續天數**：做 1 題或一回合微複習就算打卡，新題和複習分開算。每練習一天存一個「保護」（最多 2 個），漏掉一天會自動用掉一個，連續天數不會斷。
- **演算法樹**：每個題型是一根樹枝，現在會的題目是葉子，顏色跟著還記得的機率（FSRS）變：快忘了變黃、大概忘了變枯。看了提示或解答的題目先是小芽，自己重寫一次才長成葉子；征服的題目會結果實，八成題目都穩的題型會開花。樹從一顆種子開始長：做 1 題發芽，5 題小樹苗，20 題小樹，60 題大樹。今天頁有小的，進度頁有完整的，也可以分享成圖片（附上這週的數字）。
- **卡皮巴拉**：陪你刷題的小夥伴。一起練習 7 天長成小時候、21 天長大，達成目標（連續 7 天、100 張卡片、10 次講解練習……）會收集到頭上的道具，一共 10 個，在進度頁換著戴。在今天頁，還沒練習時牠在床上睡覺，打卡了陪你用電腦，今天的目標做完就喝珍奶或泡溫泉（每天輪流）；寬的畫面旁邊有對話框，有一句鼓勵的話、一則小知識（Python 小知識或模式重點）和最快能拿到的下一個頭飾。
- **慶祝和下一個目標**：征服一題、題型升級、刷新最快的紀錄、樹長到下一個階段、收集到頭飾時都會跳出慶祝訊息。今天頁會寫出下一個目標，例如「再會 3 題，二分搜尋就升到『會了』」；每週的前三天也會放上週的回顧，按「知道了」就收起來。

**進度頁**：最上面是總數（做過幾題、熟練幾題、連續天數、練習次數），接著是演算法樹、卡皮巴拉的收藏、面試準備度（現在解得出來的題數，可以看難度和自己標的公司）、題型地圖和每週回顧；下面是像 LeetCode 的一年熱度圖（顏色越深那天做越多題，只做微複習的日子是最淺的顏色）、各模式的熟練度、卡住原因、每週練習圖和難度分布。
- **講解能力的進步曲線**：把每次講解練習畫成曲線（有 AI 回饋就用 AI 的分數，沒有就用自己勾的重點），列出最近五次五個重點各講到幾成、跟再之前比進步多少、最常漏掉哪一個，還有講起來順不順、面試官追問的平均分數。
- **卡住原因**：記錄一題（或完整模擬面試結束）時，可以勾「卡在哪」：沒看出模式、想不到優化、寫不出來、漏了邊界情況、有 bug、時間不夠，可以複選、也可以不勾。進度頁統計最近 90 天最常卡在哪、各自最常出現在哪些模式，並附上該怎麼練的連結；題目的練習紀錄也看得到當時卡在哪。面試衝刺會把最近 30 天卡住兩次以上的模式多排兩題。

**帳號和同步**：不登入也能完整使用，資料存在瀏覽器裡。用 email 和密碼，或用 GitHub 登入後，練習紀錄、模擬面試和講解練習、筆記、標籤、模式筆記、自己加的題目、設定、微複習紀錄、白板，以及行為面試的故事和練習都會自動同步，換電腦或換瀏覽器都能接著用；離線時照常記錄，恢復連線後再上傳。錄音只會留在原本的裝置上。登入頁在桌面版的側邊欄、手機的「更多」都有入口，手機的今天頁也有一張可以關掉的提醒。
- 忘記密碼可以用 email 重設：連結只能用一次、一小時後失效，用了之後每台裝置都要重新登入（伺服器要設定 Brevo 的 `BREVO_API_KEY` 和 `MAIL_FROM`，免費方案每天約 300 封）。
- **用 GitHub 登入**：登入頁有「用 GitHub 登入」，第一次用會以 GitHub 上驗證過的 email 建立帳號。走 OAuth 2.0 授權碼流程加 PKCE，state 和 PKCE 的 verifier 存在只有發起登入的瀏覽器有的 cookie。email 已經註冊過的帳號不會自動合併（避免被冒用），要先用密碼登入，再到帳號頁按「連結 GitHub」。沒有密碼的帳號不能取消連結 GitHub；刪除帳號時改成輸入自己的 email 確認。

**每日提醒**：登入後在設定選幾點提醒，那天還沒練習時手機或電腦會跳通知，已經練過就不打擾。今天頁會一步一步帶你開啟；iPhone 要先「加入主畫面」才收得到。

**回報問題**：遇到 bug、內容有錯或有想要的功能，可以到「回報問題」頁送出；微複習每張卡答完後、錯誤畫面上也都有回報的入口。不登入也能送，表單會列出一起送出的資訊（頁面、卡片、版本、瀏覽器）。登入後可以看自己回報的處理進度；伺服器設定 `ADMIN_EMAILS` 列出的帳號會有收件匣，可以把回報標成已處理。

**其他**：
- 介面有繁體中文和英文，預設跟著瀏覽器語言，可以在側邊欄或設定切換，每台裝置各自記住。模板卡、213 題的提示和面試流程都有英文版，適合練習用英文思考。
- 可以安裝成 App（PWA），離線也能用。有淺色和深色（預設跟著系統；語言切換旁邊的太陽／月亮按鈕可以切換，再按一次回到跟著系統），可以換 App 的圖示（方格、方格樹、小芽、橡實），也可以匯出、匯入 JSON 備份。
- 有新版本時會自動更新並重新整理，但計時練習、模擬面試、微複習、白板或回報表單開著的時候會等你結束。

### 開發和部署

本機開發執行 `npm run dev`，會同時啟動網頁（http://localhost:5173）和後端（內建 PGlite 資料庫，不需要另外安裝）。`npm test` 跑單元和 API 測試，`npm run test:e2e` 會先建置，再用 Playwright 跑端對端測試。完整的指令和設定請看上面英文的 Getting started 和 Deploying。

有裝 Docker 的話，`docker compose up --build` 會把正式版的網頁、後端和 PostgreSQL 一起跑起來，打開 http://localhost:8080 就能用，不用裝 Node 或資料庫。映像分兩段建置，最後只留執行需要的檔案，用一般使用者（不是 root）執行，並且有健康檢查。CI 每次都會建映像、用 Compose 跑起來，再對容器跑端對端測試。

部署到 Render＋Neon 的步驟：

1. 到 Neon 建立專案（區域選 AWS US East 2 (Ohio)，跟 Render 同一區），複製連線字串（`postgresql://…?sslmode=require`）。
2. 到 Render 用 GitHub 登入，選 **New → Blueprint**，選這個 repository，`DATABASE_URL` 貼上 Neon 的連線字串。
3. 部署完成後打開 `onrender.com` 的網址，確認 `/api/health` 回傳 `{"ok":true}`。之後 `main` 的 CI 通過就會自動部署。

選用的功能，設定了才會打開：
- **AI 回饋**：設定 `ANTHROPIC_API_KEY` 和允許名單 `AI_ALLOWED_EMAILS`（空的代表沒有人，`*` 代表所有人），每人每天預設 20 次。用 Claude Opus 5.5 一次大約 1～3 元台幣。
- **GitHub 登入**：到 GitHub 的 Settings → Developer settings → OAuth Apps 建一個，callback 填 `<網址>/api/auth/github/callback`，再設定 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`。
- **每日提醒**：先執行 `npx web-push generate-vapid-keys`，把兩把金鑰設成 `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`；再隨便產生一串長的亂碼當 `CRON_SECRET`，Render 和 GitHub repo 的 Actions secret 都設一樣的。Render 免費方案會睡，所以由 GitHub Actions 每小時呼叫一次 `/api/push/send-due`，把伺服器叫醒並寄出。
- **錯誤追蹤**：設定 `SENTRY_DSN`，網頁和後端出錯時就會自動回報，不用等使用者按「回報問題」。只送錯誤本身，帳號、cookie、請求內容（筆記、逐字稿、密碼）、網址參數和 AI 的輸入輸出都不送。再設定 `SENTRY_AUTH_TOKEN`、`SENTRY_ORG`、`SENTRY_PROJECT` 的話，建置時會上傳 source map，錯誤會指到原本的 TypeScript；source map 上傳完就刪掉，不會公開。沒設定 `SENTRY_DSN` 就完全不載入 Sentry。
- **回報收件匣**：`ADMIN_EMAILS` 列出可以看回報收件匣的帳號。
