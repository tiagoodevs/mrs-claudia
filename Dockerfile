FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data
VOLUME ["/app/data"]
CMD ["bun", "dist/index.js"]
