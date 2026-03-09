FROM node:20-alpine AS builder

LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.title="unforgit-api"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/tools/package.json packages/tools/
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/mcp/package.json apps/mcp/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY apps/website/package.json apps/website/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm run db:generate
RUN pnpm --filter @unforgit/shared exec tsup --no-dts
RUN pnpm --filter @unforgit/core exec tsup --no-dts
RUN pnpm --filter @unforgit/db exec tsup --no-dts
RUN pnpm --filter @unforgit/api exec tsup --no-dts

FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
COPY packages/tools/package.json packages/tools/
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/mcp/package.json apps/mcp/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY apps/website/package.json apps/website/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/db/dist packages/db/dist
COPY --from=builder /app/packages/db/src/generated packages/db/src/generated
COPY --from=builder /app/apps/api/dist apps/api/dist

ENV NODE_ENV=production
ENV PORT=3737
ENV HOST=0.0.0.0

EXPOSE 3737

CMD ["node", "apps/api/dist/index.js"]
