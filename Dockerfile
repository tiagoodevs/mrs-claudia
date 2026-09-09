FROM oven/bun:1 AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
ENV NPM_CONFIG_TARGET=20.0.0
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
ENV NPM_CONFIG_TARGET=20.0.0
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data

VOLUME ["/app/data"]
CMD ["bun", "dist/index.js"]
