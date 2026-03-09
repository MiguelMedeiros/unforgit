FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm run db:generate
RUN pnpm --filter @unforgit/shared build
RUN pnpm --filter @unforgit/core build
RUN pnpm --filter @unforgit/db build
RUN pnpm --filter @unforgit/api build

FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/

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
