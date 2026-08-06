FROM oven/bun:1.3-slim
WORKDIR /app
COPY apps/app/package.json ./apps/app/package.json
COPY package.json bun.lock ./
RUN bun install
COPY apps/app ./apps/app
COPY packages ./packages
RUN bun run build
CMD ["bun", "run", "start"]
