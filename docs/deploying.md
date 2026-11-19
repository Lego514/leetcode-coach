# Deploying

Hosting on Render, Neon, and Cloudflare, and the optional services. Back to the [README](../README.md). 中文版：[開發和部署](deploying.zh-TW.md)。

`render.yaml` describes a single Render web service that builds both parts and serves them together. Both Render and Neon have free plans.

1. **Database (Neon)**
   1. Sign in at [neon.tech](https://neon.tech) and create a project. Pick **AWS US East 2 (Ohio)**, the same region as the Render service in `render.yaml`, so queries stay fast. If you are closer to another region, change `region` in `render.yaml` to match before creating the service — a service's region cannot be changed later.
   2. On the project dashboard, click **Connect** and copy the connection string. It looks like `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`. Either the direct or the pooled (`-pooler`) string works; the API turns off prepared statements for pooled connections.
2. **Web service (Render)**
   1. Sign in at [render.com](https://render.com) with GitHub and allow access to this repository.
   2. Choose **New → Blueprint**, select the repository, and paste the Neon connection string as `DATABASE_URL` when asked.
   3. Render builds and starts the service. Migrations run automatically at startup. When the deploy finishes, open the `onrender.com` URL and check `/api/health`.
3. **Later deploys** happen automatically when a commit on `main` passes CI (`autoDeployTrigger: checksPass`).
4. **Fast first load (Cloudflare, optional)**: the free Render service sleeps, and the first visit then waits for it to wake. `wrangler.jsonc` serves the built web app from Cloudflare instead, so it opens at once, and `edge/worker.ts` forwards `/api/*` to Render on the same origin (cookies, redirects and the visitor's IP pass through). Only signing in, syncing and AI wait for the API; the app works offline in the meantime.
   1. In Cloudflare, create an API token from the **Edit Cloudflare Workers** template and note your account ID. Add them to the GitHub repo as Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. For Sentry in the Cloudflare build, also add variables `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` and secret `SENTRY_AUTH_TOKEN`.
   2. The `Deploy web to Cloudflare` workflow deploys after CI passes on `main` (or run it by hand). The site is at `https://leetcode-coach.<your-subdomain>.workers.dev`.
   3. On Render, set `APP_ORIGINS` to the new URL and the old `onrender.com` one (comma-separated, new one first) and `APP_URL` to the new URL. With GitHub sign-in, add the new callback to the OAuth App (an OAuth App can list several redirect URIs, so the old one can stay): `<new URL>/api/auth/github/callback`. Board sharing needs the new URL in the whiteboard server's `ALLOWED_ORIGINS`.
   4. `API_ORIGIN` in `wrangler.jsonc` is the Render URL the Worker forwards to.

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
