# Stage 1: Dependencies and Turbo
FROM oven/bun:1.3-slim AS base
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Stage 2: Build the App application (Next.js)
FROM base AS builder
WORKDIR /app
RUN bun run build --filter=app

# Stage 3: Runtime image for App
FROM oven/bun:1.3-slim
WORKDIR /app
COPY --from=builder /app/apps/app/.next ./apps/app/.next
COPY --from=builder /app/apps/app/public ./apps/app/public
COPY --from=builder /app/apps/app/package.json ./apps/app/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "start"]
