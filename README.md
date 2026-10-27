# FPV News

News hub, weekly newsletter, community DIY builds and an admin-only deals radar for the FPV drone community.

Next.js (App Router) + Payload CMS 3 in one app, PostgreSQL, Tailwind CSS. Background jobs run on the Payload jobs queue inside the app process. Email via Resend, media on S3-compatible storage (Railway bucket). Deployed on Railway.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Setup, auth/roles, collections, base layout | ✅ done |
| 2 | News aggregator + public feed | ⏳ next |
| 3 | DIY builds + moderation + affiliate links | |
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

In development Payload pushes schema changes to the database automatically. Before deploying a schema change, create a migration:

```bash
pnpm payload migrate:create <name>
```

Migrations in `src/migrations` run automatically on startup in production.

### Emails locally

Without `RESEND_API_KEY`, Payload only logs that an email was attempted (recipient and subject). To verify a contributor account locally, open the user in the admin as an admin and tick **Verified**, or set a Resend test key.

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
  lib/                small helpers (slugify, tags, rate limit, deal sources)
  app/(frontend)/     public site
  app/(payload)/      Payload admin + REST API (generated, don't edit)
  migrations/         database migrations
tests/                Vitest unit tests (+ fixtures from Phase 2 on)
```
