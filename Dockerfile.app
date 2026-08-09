# Stage 1: Dependencies and Turbo
FROM oven/bun:1.3-slim AS base
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Stage 2: Build the App application (Next.js)
# API_URL / APP_URL / NEXT_PUBLIC_API_URL are inlined into the browser bundle
# at build time (turbo.json "build" task env), so they must be provided here.
FROM base AS builder
WORKDIR /app
ARG API_URL
ARG APP_URL
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ENV API_URL=$API_URL \
	APP_URL=$APP_URL \
	NEXT_PUBLIC_API_URL=$API_URL \
	DATABASE_URL=$DATABASE_URL \
	BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
RUN bun run build --filter=app

# Stage 3: Runtime image for App
FROM oven/bun:1.3-slim
WORKDIR /app
COPY --from=builder /app/apps/app/.next ./apps/app/.next
COPY --from=builder /app/apps/app/public ./apps/app/public
COPY --from=builder /app/apps/app/package.json ./apps/app/package.json
COPY --from=builder /app/apps/app/next.config.ts ./apps/app/next.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/apps/app
CMD ["bun", "run", "start"]
