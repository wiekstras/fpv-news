# FPV News

News hub, weekly newsletter, community DIY builds and an admin-only deals radar for the FPV drone community.

Next.js (App Router) + Payload CMS 3 in one app, PostgreSQL, Tailwind CSS. `docker-compose.yml` is for the local database only. Background jobs run on the Payload jobs queue inside the app process. Email via Resend, media on S3-compatible storage (Railway bucket). Deployed on Railway.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Setup, auth/roles, collections, base layout | ✅ done |
| 2 | News aggregator + public feed | ✅ done |
| 3 | DIY builds + moderation + affiliate links | ✅ done |
| 4 | Newsletter (double opt-in, weekly draft + send) | ✅ done |
| 5 | Deals radar | ✅ eBay + 9 dedicated marketplace adapters + 25 generic EU marketplaces |
| 6 | Deploy to Railway | ✅ Dockerfile + railway.json (image tested locally) |

## Local setup

Requirements: Node `^22.23.4 || >=24.22.1`, pnpm 10, Docker (for Postgres).

```bash
cp .env.example .env          # defaults work for local dev
docker compose up -d          # Postgres on localhost:5432
pnpm install
pnpm dev                      # http://localhost:3000
```

Open http://localhost:3000/admin and create the first account: **the first user automatically becomes admin.**

Load starter data: news sources (Betaflight, INAV, ExpressLRS, EdgeTX releases, a YouTube channel and a blog) and one
example build with photos, a parts catalog, two placeholder retailers and affiliate links:

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
  (`https://github.com/<owner>/<repo>/releases.atom`), manufacturer blogs and Google News searches
  (`https://news.google.com/rss/search?q=<words>&hl=en`). Default tags per source are optional.
- **Not missing news:** coverage = the sources you add. `pnpm seed` adds 16: firmware releases (Betaflight, INAV,
  ExpressLRS + Configurator, EdgeTX, Bluejay, AM32, HDZero goggles), Joshua Bardwell's YouTube channel, Oscar Liang,
  DroneDJ / DroneXL / DroneLife (filtered to FPV stories) and three Google News searches as a safety net for stories
  from sites we don't follow. Re-running the seed only adds sources that don't exist yet. Add your favourite YouTube
  channels yourself (channel page → *Share* → *Copy channel ID*, then use the YouTube feed URL above).
- **Keyword filter per source** (*Require keywords*): for general drone/tech sites, only items whose title or excerpt
  contains one of the words are kept. Google News titles get the trailing "- Publisher" removed, so a story found both
  there and in the publisher's own feed is stored once.
- **Fetching** runs every 15 minutes as a Payload job (`src/jobs/fetchNews.ts`). The **Fetch all sources now** button
  above the Sources list runs it immediately and shows per-source results; failures are stored in the source's *Last error*.
- **Per item** we store title, source, link, date, thumbnail URL (hotlinked, never downloaded) and tags. We never store
  or show the article text. Items older than 60 days and more than 50 per fetch are ignored.
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

## DIY builds

- **Submitting:** *Submit a build* (`/submit`) sends logged-in users to the build editor in `/admin` and everyone else
  to `/register`. Contributors write the post (rich text, photos, parts list, difficulty, frame size, tags) and set the
  status to *Pending review*. In the admin they only see their own builds and uploads.
- **Moderation:** draft → pending review → published; only admins can publish. Emails go out on each step: to
  *Settings → Site → Admin email* when a build is submitted, to the author when it is published, and to the author
  (with the *Moderation note*) when an admin moves it back to draft.
- **Parts & affiliate links** live in one place (admin → Affiliate): **Parts**, **Retailers** and **Affiliate links**
  (part → retailer → URL, with an *Active* switch). A build's parts list either picks a catalog part or uses free text;
  only catalog parts show shop links, so link a free-text part to a catalog part during moderation to monetise it.
  Change a URL once and every build using that part updates.
- **Disclosure:** every page that shows at least one active affiliate link gets the affiliate disclosure at the top,
  and shop links carry `rel="sponsored nofollow"`. Links inside a build write-up get `rel="ugc nofollow"`.
- **The seeded retailers are placeholders** (`example.com` / `example.org`): replace them with your real shops and
  affiliate URLs, or delete them.
- **Public pages:** `/builds` (filter by frame size and difficulty), `/builds/<slug>`; the three newest builds also
  appear on the homepage.

## Weekly newsletter

- **Signup** box on every page: email + an explicit consent checkbox + honeypot + per-IP rate limit. We store the
  email, `consentAt` and the exact consent text (`src/lib/newsletter/consent.ts`). A confirmation email (double opt-in)
  links to `/newsletter/confirm`; only confirmed subscribers get digests. The form gives the same answer whether or not
  an address is already subscribed.
- **Unsubscribe:** every digest has an unsubscribe link (`/newsletter/unsubscribe`, one button) and RFC 8058
  `List-Unsubscribe` / `List-Unsubscribe-Post` headers, so Gmail/Apple Mail show a native one-click unsubscribe
  (`POST /newsletter/one-click`). Bounces and spam complaints unsubscribe automatically.
- **Weekly draft:** at the day/time in *Settings → Newsletter* (Europe/Amsterdam), the `prepareDigest` job builds a
  draft: up to 8 news items from the last 7 days (max 2 per source), the newest build as featured, up to 3 more builds.
  You get an email that it's ready. **It is never sent automatically.** You can also press *Build a draft from the last
  7 days* above the Digests list.
- **Review & send** (admin → Newsletter → Digests): edit the subject/intro, drag items to reorder, add a custom blurb,
  change the featured build, *Send test to me*, then *Send to subscribers* (asks for confirmation; a digest can only be
  sent once). The preview on the page shows the last saved version.
- **Stats:** recipients, opened and clicked (unique people) on each digest, from Resend webhooks; raw events are in
  *Email events*. In Resend, enable open and click tracking for your sending domain, and add the webhook (see
  `RESEND_WEBHOOK_SECRET` in `.env.example`). Without `RESEND_API_KEY` (local dev) digests are only logged.
- A basic `/privacy` page describes what we store. **Review it and add your name/contact before launch.**

## Deals radar (admin only)

Dashboard: **/admin/deals** (also in the admin sidebar). Not public; contributors are redirected away.

1. **Settings → Deals:** tick the sources the radar may use (default: eBay only). Set *Settings → Site → Admin email*
   for alerts.
2. **Deals → Saved searches:** keywords, optional min/max price in EUR, *Alert below* (EUR), *New price* and *Alert at
   % below new* (see below), exclude words, countries
   and sources (empty = all).
3. Searches run **every 3 hours** (job `runDeals`), or press **Run searches now** on the dashboard. Each saved search
   shows its last result per source, including errors.
4. **Search all platforms now** (top of the dashboard): a one-off search across every enabled platform at once:
   keywords, price range, countries, exclude words and platform checkboxes. Results from all sites are merged, sorted
   cheapest first, with the % below the new price. Nothing is stored unless you press *Save as saved search*. Each site
   is still queried politely, so a search over the browser-based sites can take up to a minute.
5. On the dashboard: filter by keyword, source, country, price range and state; **NEW** marks listings first seen since
   your previous visit (a visit = opening the dashboard after 30+ minutes away); ★ marks interesting, ✕ ignores.
6. When a new listing is under a search's *Alert below* price, or at least *Alert at % below new* cheaper than new, one
   summary email per run goes to the admin email.

### Discount vs. new price

Every listing shows how much cheaper it is than buying new (the **vs new** column; sort by *Biggest discount* or filter
on *Min % off*). The new price per saved search is:

- the **New price** you set on the search, or otherwise
- looked up automatically: the median price of **new, buy-it-now listings on eBay.de** for the same keywords, after
  dropping prices far from the median (accessories, spare parts, bundles). Needs at least 3 listings and the eBay keys;
  refreshed at most once a day and shown on the dashboard with how many listings it is based on.

Every listing in a search is compared with that search's new price, so this works best with product-specific searches
("DJI O3 air unit", "Radiomaster Boxer") plus exclude words ("antenna, case, defekt"). A broad search like "fpv" gets no
meaningful new price; leave its discount empty or set a price yourself.

All prices are converted to EUR with the ECB daily reference rates (job `fetchFxRates`, daily ~16:30 CET; fetched on
the first run if missing). Prices in a currency without a rate stay unconverted and are skipped by price filters.

### How we fetch

Plain HTTP requests go through `src/lib/deals/http.ts`; sites whose results are rendered with JavaScript are opened in a
headless Chromium (`src/lib/deals/browser.ts`, Playwright). Both follow the same rules per site:

- a clear identity: user agent `FPVNewsDealsBot/1.0 (+your site)` (the browser appends it to its normal user agent);
- robots.txt is checked (if it can't be fetched the site is treated as off-limits), **except for sites you list under
  *Settings → Deals → Sites that gave permission***;
- one request per site every 8–12 s, a 15-minute cache, and a 6-hour pause when a site answers 403/429/503 or shows a
  bot check (captcha/challenge page). The radar never tries to get past such a check, and doesn't log in.

Set `DEALS_CONTACT_EMAIL` to add a contact address to the user agent. If a site that gave you permission still shows a bot
check, ask them to allow-list the bot's user agent or your server's IP, or for API access.

### Sources

| Source | Status | How |
|---|---|---|
| eBay (DE, AT, NL, BE, FR, IT, ES, IE, PL, GB) | ✅ enabled by default | Official Browse API. Needs `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` (developer.ebay.com → Application keys, production). Used + unspecified condition, newest first. |
| Marktplaats (NL) / 2dehands (BE) | ✅ HTTP, off by default | The JSON their own search page loads (`/lrp/api/search`). |
| Kleinanzeigen (DE) | ✅ HTTP, off by default | Public search results page. |
| willhaben (AT) | ✅ HTTP, off by default | Marketplace search page; results read from its Next.js page data. |
| OLX (PL, PT, RO, BG) | ✅ HTTP, off by default | The JSON API their search pages use (`/api/v1/offers/`). Prices in PLN/RON/BGN are converted to EUR. |
| Bazoš (CZ, SK) | ✅ HTTP, off by default | Classic HTML search results. |
| Subito (IT) | ✅ browser, off by default | Search page; results read from its Next.js page data. |
| leboncoin (FR) | ✅ browser, off by default | Search page; results read from its Next.js page data. Uses DataDome bot protection, so expect it to stop at a bot check unless leboncoin allow-lists you. |
| Vinted (14 countries; NL, DE, FR, BE by default) | ✅ browser, off by default | Catalog page; results read from the JSON the page loads (`/api/v2/catalog/items`). |
| Wallapop (ES) | ✅ browser, off by default | Search page; results read from the JSON the page loads (`api.wallapop.com/api/v3/search`). |
| **Other marketplaces** (25 sites, see below) | ✅ generic, off by default | Each site's search page, reading the schema.org data (JSON-LD/microdata) many sites include for search engines. |
| Facebook Marketplace | ⛔ out of scope | As agreed. |

### Other marketplaces (Deals → Marketplaces)

Every other EU marketplace is a row in **Deals → Marketplaces**: name, country, currency, a search URL with `{q}`
(keywords) and optional `{min}`/`{max}`, HTTP or browser mode, *enabled*, and *site gave permission* (skips robots.txt).
They are all searched when **Other marketplaces** is enabled in *Settings → Deals*. Each run writes *Last result* on the
row (`12 found`, or the error), so you can see at a glance which sites work. Add, fix or switch off sites there without
code changes; new rows from future versions are added on boot, existing rows are never changed.

Seeded list: Milanuncios (ES), CustoJusto (PT), Allegro Lokalnie (PL), Jófogás and Hardverapró (HU), Blocket and
Tradera (SE), DBA (DK), Tori (FI), DoneDeal and Adverts.ie (IE), Njuškalo (HR), Bolha (SI), Skelbiu (LT), SS.com (LV),
Okidoki and Osta.ee (EE), xe.gr (GR), Shpock (AT), markt.de and Quoka (DE), 2ememain (BE), Bazar.lu (LU),
Bazaraki (CY), Maltapark (MT).

How well this works depends on the site: it only finds listings on search pages that include schema.org data. A row
reporting *No listings in the page's structured data* needs a corrected search URL, browser mode, or a dedicated
adapter (send me a saved copy of the results page and I'll write one). **None of the seeded URLs could be checked from
the build environment**; test one with `pnpm deals:check site "<search url with {q}>" "dji o3" HU`.

Enable a marketplace only if its terms allow it for you or you have its permission; tick it under *Sites that gave
permission* to skip its robots.txt.

**Not yet verified live.** The build environment had no access to these sites, so every marketplace parser was
written against saved samples of their formats (`tests/fixtures/deals`). Before relying on one, run a live check (no
database needed; browser sources need Chromium, see below):

```bash
pnpm deals:check ebay "dji o3" NL,DE
pnpm deals:check marktplaats "fpv goggles" NL
pnpm deals:check kleinanzeigen "radiomaster" "" 300
DEALS_PERMITTED=1 pnpm deals:check vinted "dji goggles" NL        # DEALS_PERMITTED=1 skips robots.txt
DEALS_PERMITTED=1 pnpm deals:check subito "radiomaster"
DEALS_PERMITTED=1 pnpm deals:check wallapop "gafas fpv"
DEALS_PERMITTED=1 pnpm deals:check leboncoin "dji o3"
pnpm deals:check willhaben "dji o3"
pnpm deals:check olx "dji o3" PL,RO
pnpm deals:check bazos "dji o3" CZ
pnpm deals:check site "https://www.jofogas.hu/magyarorszag?q={q}" "dji o3" HU    # any Marketplaces row
DEALS_MODE=browser pnpm deals:check site "https://www.blocket.se/annonser/hela_sverige?q={q}" "dji o3" SE
```

Locally, install Chromium once with `pnpm exec playwright-core install chromium` (or point `PLAYWRIGHT_CHROMIUM_PATH` at
a Chrome/Chromium you have). The Docker image already contains it.

It prints how many listings came back and the first ten. Zero listings or a parse error means the page format changed:
save a fresh response into `tests/fixtures/deals/` and adjust the parser until `pnpm test` passes.

### Adding a source

Create `src/lib/deals/adapters/<name>.ts` exporting an `Adapter` (`search(query, { fetch, browser }) → Listing[]`) with
a pure `parse…()` function, add a fixture + test, then register it in `src/lib/deals/adapters/index.ts`.

## Deploy to Railway

Ready to deploy as-is. The repo has a `Dockerfile` and `railway.json`; Railway builds the image from the Dockerfile.

**What happens on boot:** the app waits up to a minute for the database (then exits so Railway restarts it), runs
pending migrations, loads the starter data if the database is empty (16 news sources + the example build; no user
accounts), adds any missing marketplaces to the Marketplaces list, and starts the background jobs (news every 15 min, deals every 3 h, digest drafts, exchange rates).
The image is built on Microsoft's Playwright image, so the headless Chromium for the browser-based deal sources is
included. This whole flow was tested locally with the production image against an empty database.

### Steps

1. **New project → Deploy from GitHub repo** → pick this repo and branch.
2. **Add PostgreSQL:** *New → Database → PostgreSQL*.
3. **Variables** on the app service (*Variables → Raw editor*):

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   PAYLOAD_SECRET=<output of: openssl rand -hex 32>
   ```

   That's all it needs to run. Add the rest when you get to it:

   | Variable | When |
   |---|---|
   | `SERVER_URL` | once you add a custom domain (`https://fpvnews.example`). Until then the Railway domain is used automatically. |
   | `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | before people upload photos: *New → Bucket*, copy its credentials. Without a bucket uploads are lost on every redeploy. Try `S3_FORCE_PATH_STYLE=true` if uploads fail. |
   | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | for verification, newsletter and alert emails (Resend, verified sending domain) |
   | `RESEND_WEBHOOK_SECRET` | newsletter open/click stats (step 6) |
   | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | eBay deals + automatic new prices |
   | `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`) | only if you turn on Claude summaries |
   | `DEALS_CONTACT_EMAIL` | optional, shown in the deals bot's user agent |

4. **Settings → Networking → Generate domain.** Deploy (or redeploy after adding variables). The health check is
   `/robots.txt`; the first boot takes a little longer because of the migrations.
5. Open `https://<your-domain>/admin` and **create the first account; it becomes the admin.** Then fill in *Settings*:
   admin email (alerts, digest notices), newsletter day/time, deal sources and sites that gave permission.
6. **Resend:** enable open/click tracking for the domain and add a webhook to
   `https://<your-domain>/newsletter/resend-webhook` (delivered, opened, clicked, bounced, complained); put its signing
   secret in `RESEND_WEBHOOK_SECRET`.
7. Press *Sources → Fetch all sources now* and *Deals radar → Run searches now* once, and check the sources and saved
   searches for errors.

Keep the app at **one replica** (set in `railway.json`): the job crons run in-process. Turn on Railway's Postgres
backups. Give the service at least 1 GB of memory; Chromium is only started during deal searches and closes after a
minute idle.

**Before every deploy** run `pnpm verify` locally (typecheck, tests, and a check that every schema change has a
migration; needs the local database running).

Test the production image locally: `docker build -t fpv-news .` then
`docker run -p 3000:3000 -e DATABASE_URL=… -e PAYLOAD_SECRET=… fpv-news`.

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
| `pnpm check:migrations` | Fails if a collection changed without a migration |
| `pnpm verify` | typecheck + tests + migration check: run before deploying |
| `pnpm deals:check <source> "<keywords>" [countries] [maxPrice]` | Live check of one deals adapter |

## Project layout

```
src/
  access.ts           shared access-control helpers (admin / owner / logged in)
  collections/        one file per Payload collection
  globals/Settings.ts site, news (Claude toggle), newsletter schedule
  lib/                small helpers (slugify, tags, rate limit, deal sources, http)
  lib/builds/         build options and parts/affiliate link resolution
  lib/newsletter/     schedule, digest drafting/rendering/sending, Resend webhook verification
  lib/news/           feed parsing, canonical URLs, dedupe, auto-tags, Claude summaries, ingest
  lib/deals/          deals radar: polite HTTP client, robots.txt, FX, adapters, run logic
  jobs/               Payload job tasks (news fetching, digest drafts, deals radar, FX rates)
  scripts/            deals:check live adapter check
  admin/              custom admin components (sources fetch button, deals dashboard)
  components/         public site components
  seed/               starter data (`pnpm seed`)
  instrumentation.ts  starts Payload (and its job crons) when the server boots
  app/(frontend)/     public site
  app/(payload)/      Payload admin + REST API (generated, don't edit)
  migrations/         database migrations
tests/                Vitest unit tests with saved fixtures (no live requests)
```
