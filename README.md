# FPV News

News hub, weekly newsletter, community DIY builds and an admin-only deals radar for the FPV drone community.

Next.js (App Router) + Payload CMS 3 in one app, PostgreSQL, Tailwind CSS. Background jobs run on the Payload jobs queue inside the app process. Email via Resend, media on S3-compatible storage (Railway bucket). Deployed on Railway.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Setup, auth/roles, collections, base layout | ✅ done |
| 2 | News aggregator + public feed | ✅ done |
| 3 | DIY builds + moderation + affiliate links | ⏳ next |
| 4 | Newsletter (double opt-in, weekly draft + send) | |
| 5 | Deals radar, one source at a time | |
| 6 | Deploy to Railway | |

## Local setup

Requirements: Node `^22.23.4 || >=24.22.1`, pnpm 10, Docker (for Postgres).

```bash
cp .env.example .env          # defaults work for local dev
docker compose up -d          # Postgres on localhost:5432
pnpm install
pnpm dev                      # http://localhost:3000
```

Open http://localhost:3000/admin and create the first account: **the first user automatically becomes admin.**

Load the starter news sources (Betaflight, INAV, ExpressLRS, EdgeTX releases, a YouTube channel and a blog):

```bash
pnpm seed
```

In development Payload pushes schema changes to the database automatically. Before deploying a schema change, create a migration:

```bash
pnpm payload migrate:create <name>
```

Migrations in `src/migrations` run automatically on startup in production.

### Emails locally

Without `RESEND_API_KEY`, Payload only logs that an email was attempted (recipient and subject). To verify a contributor account locally, open the user in the admin as an admin and tick **Verified**, or set a Resend test key.

## News aggregator

- **Sources** (admin → News → Sources): RSS/Atom feeds, YouTube channel feeds
  (`https://www.youtube.com/feeds/videos.xml?channel_id=…`), GitHub releases
  (`https://github.com/<owner>/<repo>/releases.atom`) and manufacturer blogs. Default tags per source are optional.
- **Fetching** runs every 30 minutes as a Payload job (`src/jobs/fetchNews.ts`). The **Fetch all sources now** button
  above the Sources list runs it immediately and shows per-source results; failures are stored in the source's *Last error*.
- **Per item** we store title, source, link, date, thumbnail URL (hotlinked, never downloaded) and tags. We never store
  or show the article text. Items older than 60 days and more than 25 per fetch are ignored.
- **Dedupe:** the URL is normalized (tracking params, `www.`, trailing slashes and YouTube link variants removed; the
  page's `rel=canonical` is used for blog posts) and must be unique. Titles that are identical or share ≥80% of their
  words with an item from the last 7 days are skipped. Version numbers count as whole words, so *Betaflight 4.5.1* and
  *4.5.2* stay separate.
- **Tags** come from the source defaults, the source type (GitHub → firmware, YouTube → video) and keyword rules
  (`src/lib/news/autoTags.ts`). You can edit them per item.
- **Summaries:** off by default; items then show no summary. Tick *Settings → News → Generate summaries with Claude* and
  set `ANTHROPIC_API_KEY` to have Claude write a 1–2 sentence summary in its own words (from the title and the feed's
  excerpt) and suggest tags. Default model is `claude-opus-5-5`; set `ANTHROPIC_MODEL=claude-haiku-5-5` for a much
  cheaper option. Opus/Sonnet requests use the API's server-side fallback, so a declined request is retried on another
  model instead of just failing.
- **Hide an item** from the public site with the *Hidden* checkbox.
- **Public pages:** `/` (feed), `/news/tag/<tag>`, `/news/source/<slug>`, `/news/<slug>` (detail with outbound link),
  plus `/sitemap.xml` and `/robots.txt`.

## Roles

| Role | Can do |
|---|---|
| Public visitor | Read news and published builds, subscribe to the newsletter |
| Contributor | Register at `/register`, verify email, log in at `/admin`. Sees only **Builds** and **Media**. Can create builds, edit their own while in *Draft* or *Pending review*, and delete their own drafts. Cannot publish. |
| Admin | Everything: moderate/publish builds, manage sources, affiliate catalog, newsletter, deals radar, settings. |

Public registration only goes through the `/register` form (honeypot + per-IP rate limit). The `users` REST create endpoint is admin-only, and the `role` field can only be changed by admins.

## Environment variables

See [`.env.example`](.env.example). Each variable is documented there.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm test` | Unit tests (Vitest, fixtures only, no live requests) |
| `pnpm typecheck` | TypeScript check |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after changing collections |
| `pnpm payload migrate:create <name>` | New DB migration |

## Project layout

```
src/
  access.ts           shared access-control helpers (admin / owner / logged in)
  collections/        one file per Payload collection
  globals/Settings.ts site, news (Claude toggle), newsletter schedule
  lib/                small helpers (slugify, tags, rate limit, deal sources, http)
  lib/news/           feed parsing, canonical URLs, dedupe, auto-tags, Claude summaries, ingest
  jobs/               Payload job tasks (news fetching)
  admin/              custom admin components
  components/         public site components
  seed/               starter data (`pnpm seed`)
  instrumentation.ts  starts Payload (and its job crons) when the server boots
  app/(frontend)/     public site
  app/(payload)/      Payload admin + REST API (generated, don't edit)
  migrations/         database migrations
tests/                Vitest unit tests with saved fixtures (no live requests)
```
