# Production image (used by Railway): Next.js standalone build + Payload + headless Chromium.

# Build on Debian (glibc) so native modules like sharp match the runtime image.
FROM node:24.22.1-bookworm-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:24.22.1-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

# Runtime: Microsoft's Playwright image ships Chromium and all its system libraries, used by the
# deals radar's browser adapters. Keep this tag equal to the playwright-core version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS runner
COPY --from=node:24.22.1-bookworm-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=builder --chown=pwuser:pwuser /app/.next/standalone ./
COPY --from=builder --chown=pwuser:pwuser /app/.next/static ./.next/static
# Local upload fallback when no S3 bucket is configured (not persistent on Railway).
RUN mkdir -p media && chown pwuser:pwuser media
USER pwuser
EXPOSE 3000
# On boot Payload runs pending migrations, seeds an empty database, then starts the job crons.
CMD ["node", "server.js"]
