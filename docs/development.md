# Development

Running, testing, and building the app locally. Back to the [README](../README.md). 中文版：[開發和部署](deploying.zh-TW.md)。

Requires Node 24. No database install is needed for development.

```bash
npm install
npm run dev          # web on http://localhost:5173 and API on http://localhost:8787
npm test             # web unit tests, then API and end-to-end sync tests
npm run test:e2e     # build, then run the Playwright tests in Chromium
npm run lint
npm run typecheck
npm run build:all    # web app into dist/ and API into server/dist/
npm run screenshots  # rebuild, then regenerate the README screenshots, the tour and reference board GIFs, and the capybara animation in docs/images/, all from generated demo data
npm start            # run the built API (and the web app when NODE_ENV=production)
```

- In development the API stores data with PGlite in `server/.data/pglite`. Delete that folder to start over.
- Server settings are read from `server/.env`. See `server/.env.example`.
- The web app still works as a static site without the API: sign-in shows as unavailable and data stays in the browser.
- To regenerate the PWA icons, run `node scripts/generate-icons.mjs`.
- The Playwright tests start the built server on port 4310 with an in-memory PGlite database, and a fake GitHub on port 4320. Set `E2E_DATABASE_URL` to run them against PostgreSQL, as CI does. The first time, run `npx playwright install chromium`.

## Run it with Docker

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
