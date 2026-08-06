FROM oven/bun:1.3-slim
WORKDIR /app
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
RUN bun install
RUN bun run build --filter=app
CMD ["bun", "run", "start"]
