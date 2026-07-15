FROM node:22-alpine AS base

LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.title="unforgit-admin"

FROM base AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY apps/admin/package.json apps/admin/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY packages/ui/ ./packages/ui/
COPY apps/admin/ ./apps/admin/

RUN pnpm --filter unforgit-shared exec tsup
RUN pnpm --filter @unforgit/ui exec tsup
RUN pnpm --filter unforgit-admin run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/admin/public ./apps/admin/public

RUN mkdir -p ./apps/admin/.next
RUN chown nextjs:nodejs ./apps/admin/.next

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3939

ENV PORT=3939
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
