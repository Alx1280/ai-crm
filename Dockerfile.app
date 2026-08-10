# Stage 1: Dependencies and Turbo
FROM oven/bun:1.3-slim AS base
WORKDIR /app
COPY . .
# Bun's node shim segfaults running Next.js 16's build, so install a real Node.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl xz-utils ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz \
	| tar -xJ -C /usr/local --strip-components=1 \
	&& node --version
# prisma generate runs during install (postinstall of @crm/db) and loads
# prisma.config.ts, which requires DATABASE_URL to be resolvable. It does not
# connect, so a placeholder is fine here.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm
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
# Copy the whole workspace tree: bun nests workspace symlinks per-app
# (apps/app/node_modules/@crm/* -> ../../../../packages/*), so root node_modules
# alone is not enough for @crm/db, @crm/auth, @crm/env and @crm/ui to resolve.
FROM base
WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/apps/app
CMD ["bun", "run", "start"]
