# Design decisions

The choices that shaped this app, and what each one gave up. Each entry has four parts: the problem, what I chose, what I didn't choose, and what it costs. How the pieces fit together is in [Architecture](architecture.md). Back to the [README](../README.md).

## 1. Local-first, with an outbox

- **Problem**: practice happens in short bursts, often on a phone with a bad connection, like a micro-review between gym sets. People trying the app from a résumé link shouldn't need an account, and the free server sleeps.
- **Choice**: every write goes to IndexedDB (Dexie) first. The same transaction adds an entry to an outbox. Signing in only adds sync: one `POST /api/sync` pushes the outbox and pulls whatever changed since the device's cursor.
- **Not chosen**:
  - A server-first app with an offline cache: it needs the network for every write, and a sleeping server blocks it.
  - A hosted sync service such as Firebase: less code, but the sync protocol is the part I wanted to understand.
- **Cost**:
  - Two copies of the data model, IndexedDB and Postgres, that must stay in step. The zod schemas in `shared/protocol.ts` are the contract between them.
  - Browser storage has quirks: iOS throws "Unable to open cursor" on key-cursor queries, so the app reads whole tables instead.

## 2. Last write wins, per record

- **Problem**: two devices can change the same record while offline.
- **Choice**: each record carries the time of its last change. The server keeps a change only if it is strictly newer, and sends rejected changes back with its own copy. Deletes are tombstones, so an older write can't bring a record back. Versions come from a Postgres sequence under a per-user advisory lock, so a cursor never skips a change.
- **Not chosen**:
  - CRDTs or merging field by field: correct under concurrency, but much more code and storage.
  - Version vectors: they detect conflicts, but then someone has to resolve them.
- **Why it's enough here**: every user is one person, and most records can't conflict. Each attempt, mock session, and flashcard answer gets its own UUID and is only ever added. Real conflicts are limited to records you edit, such as notes, settings, and whiteboards.
- **Cost**:
  - Editing the same note on two offline devices keeps only the later edit.
  - "Later" is decided by each device's clock, so a device whose clock is wrong can win when it shouldn't.

## 3. Review schedules are derived, not synced

- **Problem**: if the schedule were stored and synced, two devices practicing offline would each compute a schedule and one would overwrite the other.
- **Choice**: attempts are the source of truth. A problem's schedule is rebuilt by replaying its attempts in time order (`rebuildProgress`). Changing the algorithm is a Dexie upgrade that replays everything again.
- **Not chosen**: syncing the schedule like any other record. It's simpler, but it loses data in exactly the case above.
- **Cost**:
  - Every write that can move a schedule must replay that problem in the same transaction: attempts, mock sessions (explanations feed "Easy" and "Mastered"), and custom problems (their target times).
  - The replay must be deterministic. For example, problems marked as solved before store their spread-out delay on the attempt (`delayDays`), so every device replays the same date.

## 4. FSRS-6, plus evidence from the attempt

- **Problem**: FSRS's default parameters come from flashcards, where a hard recall still means you know the card. On a coding problem, needing a hint usually means part of it is gone. A four-button self-rating also hides how the solve went.
- **Choice**:
  - FSRS-6, written from the formulas and checked against the official `ts-fsrs` on hundreds of random histories.
  - On top of it, weights from the attempt itself: time against the problem's target, the deepest hint layer, and where you got stuck.
  - A shaky solve is confirmed within a week.
  - The on-screen "Why this many days?" uses the same code as the scheduler, so the explanation can't drift from the behavior.
- **Not chosen**:
  - SM-2 or fixed intervals: simpler, but they ignore how much time has passed.
  - Plain FSRS: it schedules a needed-a-hint solve too far out.
- **Cost**: the weights are my judgment, not fitted to data. With enough review history, the next step would be to fit them the way the FSRS optimizer fits its parameters, and check whether predicted recall matches what actually happens. Details: [Review scheduling](scheduling.md).

## 5. The site on Cloudflare, the API on Render

- **Problem**: on Render's free plan the server sleeps after 15 minutes, so the first visit waited 20 to 60 seconds. That included the static page, even though a local-first app doesn't need the server to open.
- **Choice**: a Cloudflare Worker serves the built files and forwards `/api/*` to Render, passing cookies and redirects through. The site and the API share one origin (coach.legoli.dev), so cookies stay first-party and there is no CORS. The user's IP goes to Render in `x-forwarded-for`, because rate limits need it.
- **Not chosen**:
  - Moving the API to Workers too: the server uses Node libraries (the Postgres driver, scrypt, web-push) and is tested with Node, so this would be a rewrite.
  - A paid always-on Render plan: it fixes the wait, but costs money every month.
  - Separate domains for the site and the API: that brings in CORS and third-party cookies, which Safari blocks.
- **Cost**: two deploy targets and one extra hop for API calls. Signing in, syncing, and AI still wait when the server is asleep, but the app itself opens immediately.

## 6. One Durable Object per whiteboard room

- **Problem**: live co-editing needs one place that orders every change in a room, keeps the board, and ends when nobody is using it.
- **Choice**:
  - Each room is a Cloudflare Durable Object, so all messages for a room run one at a time in one place, with no locks.
  - Clients send small operations (put an element, delete one, replace the steps). The room checks them with zod, applies them in order, and saves within two seconds of a change.
  - WebSocket hibernation means an idle room costs nothing.
  - A room is deleted 7 days after the last person leaves.
- **Not chosen**:
  - A WebSocket server on Render: it sleeps, and one instance would hold every room.
  - Yjs or a hosted service such as Liveblocks: they merge concurrent edits better, but they're another dependency and another data format.
- **Cost**:
  - Concurrent edits are decided per element: if two people drag the same array at the same moment, the last one wins.
  - The rooms are tied to Cloudflare.

## 7. View-only links are derived, not stored

- **Problem**: a mock interviewer should watch the board without being able to change it. The edit link must not be computable from the view link.
- **Choice**: the view code is a SHA-256 hash of the room code, cut to 24 characters. The server names the Durable Object after the view code, so both links reach the same room. Whether a connection can edit is decided by which path it came in on (`/room/` or `/view/`), never by anything the client sends.
- **Not chosen**: a random view token stored with the room. It works too, but needs storage and one more lookup on every connection.
- **Cost**:
  - A view link can't be revoked on its own; you'd start a new room.
  - Anyone with the edit link can compute the view link, which is fine, because editing already allows more.

## 8. Your own AI key never reaches the server

- **Problem**: AI feedback on the shared server costs money, so it is limited to an allow-list with a daily limit (20 by default). Everyone else should still be able to get feedback.
- **Choice**:
  - You can paste your own Anthropic, OpenAI, or OpenRouter key. It lives only in this browser's localStorage. It is not in the sync outbox and never goes to our server or your other devices.
  - The browser calls the provider directly.
  - The prompts, the output schema, and the code that cleans up the output live in `shared/ai.ts`, so the server and the browser grade the same way.
  - For people without a key, the app can copy the prompt into their own ChatGPT or Claude and accept the reply pasted back.
- **Not chosen**: sending the key to our server and calling the provider from there. That turns us into a holder of other people's secrets.
- **Cost**:
  - Any script running on the site could read localStorage, so the key is only as safe as the page. React escapes rendered text, and a Content-Security-Policy lets only the site's own scripts and Cloudflare's analytics script run (no inline scripts, no eval) and lets the page connect only to known hosts. A malicious dependency bundled into the app would still run, so the key is not as safe as it would be on a server.
  - Calling a provider from the browser also needs their opt-in, such as the Anthropic SDK's `dangerouslyAllowBrowser`.
