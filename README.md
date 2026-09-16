# LeetCode Coach（刷題教練）

A local-first study coach for LeetCode interview prep. It decides what to practice today, schedules reviews with spaced repetition, keeps structured notes, and runs timed mock interviews with think-aloud recording.

You still solve problems on LeetCode. This app handles the parts around solving: planning, remembering, and explaining.

## Features

- **Study lists**: NeetCode 150, Blind 75 and Grind 169 (213 unique problems), grouped into 18 patterns. You can add any other LeetCode problem.
- **Spaced repetition**: after each attempt you rate yourself (solved alone / needed a hint / read the solution / still stuck), and an SM-2–style scheduler picks the next review date.
- **Daily plan**: the Today page lists the reviews that are due plus N new problems in roadmap order. It also works out how many new problems per day you need to finish before a target date.
- **Notes**: for each problem you can keep a one-line idea, an English explanation script, time and space complexity, pitfalls, and your code. Notes save automatically.
- **Pattern cards**: each pattern has recognition signals, common mistakes, and a Python template you can edit.
- **Mock interviews**:
  - A timed, seven-step US interview flow (clarify, examples, brute force, optimize, code, test, complexity) with a checklist and English phrases for each step.
  - Optional audio recording (MediaRecorder) and a self-review after you finish.
  - A two-minute explanation drill.
- **Progress**: a per-pattern mastery grid, a weekly practice chart, an activity calendar, and a breakdown by difficulty.
- **Installable PWA** that works offline, with light and dark themes and JSON backup/restore.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), hand-written CSS with design tokens |
| Build | Vite 8, route-level code splitting, `vite-plugin-pwa` |
| Routing | React Router 8 data router (lazy routes, navigation blocking during mock sessions) |
| Storage | IndexedDB via Dexie 4, reactive reads with `useLiveQuery` |
| Quality | Vitest + `fake-indexeddb`, ESLint (typescript-eslint, react-hooks), GitHub Actions CI |

## Architecture

```
src/
  data/        Static content: problems, study lists, patterns, interview steps and phrases
  lib/         Pure logic: scheduler (srs), dates, stats, catalog; unit tested
  store/       Data-access layer
    db.ts        Dexie schema and record types
    actions.ts   Every write (record attempt, save note, settings, custom problems, ...)
    queries.ts   Every read, as React hooks
    backup.ts    Export / import / clear
  components/  Shared UI (dialogs, rows, charts, autosave, recorder)
  pages/       One file per route
```

Pages never call IndexedDB directly: reads go through `store/queries.ts` and writes go through `store/actions.ts`. When the app gets a backend (accounts, sync, AI features), only this layer has to change.

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

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run lint
npm run build      # type-check + production build into dist/
```

The build uses a relative base path and hash routing, so `dist/` can be served from any static host or subpath, such as GitHub Pages.

To regenerate the PWA icons, run `node scripts/generate-icons.mjs`.

## Data and privacy

- All data stays in the browser's IndexedDB.
- Export a backup from **Settings** before you switch browsers or clear site data.
- Audio recordings are excluded from backups because of their size.
- Problem statements are not included. The app stores only titles and links to leetcode.com.

## Roadmap

- **AI assistance (Claude API)**: tiered hints, code review, an AI interviewer that asks follow-ups, and feedback on spoken explanations. This needs a small backend so the API key never reaches the browser.
- **Accounts and sync** so the app can support multiple users.
- **Behavioral prep**: a STAR story bank, system design notes, and a job application tracker.

---

## 中文說明

這是一個幫忙準備美國軟體工程師面試的刷題教練。題目還是在 LeetCode 上寫，這個 App 負責三件事：

- 決定今天該刷哪些題
- 用間隔複習排好每一題的複習日
- 用模擬面試練習把解法講清楚

目前只有一位使用者，資料存在瀏覽器裡，記得定期到「設定」匯出備份。
