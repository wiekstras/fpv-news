# Production image (used by Railway). Next.js standalone output + Payload.
FROM node:24.22.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Inlined into the build; Railway passes service variables as build args.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Local upload fallback when no S3 bucket is configured (not persistent on Railway).
RUN mkdir -p media && chown nextjs:nodejs media
USER nextjs
EXPOSE 3000
# Payload runs pending migrations on boot (prodMigrations), then the job crons start.
CMD ["node", "server.js"]
