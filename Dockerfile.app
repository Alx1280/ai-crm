# Stage 1: Install dependencies
FROM oven/bun:1.3-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile

# Stage 2: Build the App application (Next.js)
FROM deps AS builder
WORKDIR /app
COPY --from=deps /app .
RUN bun run build --filter=app

# Stage 3: Runtime image for App
FROM oven/bun:1.3-slim
WORKDIR /app
# Copy Next.js build output (.next folder)
COPY --from=builder /app/apps/app/.next ./apps/app/.next
# Copy public assets
COPY --from=builder /app/apps/app/public ./apps/app/public
# Copy necessary package.json files and node_modules for 
COPY --from=builder /app/apps/app/package.json ./apps/app/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "start"]
