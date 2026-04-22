# syntax=docker/dockerfile:1.7

# ---------- Stage 1: builder ----------
# Build the Vue client and compile native deps (sqlite3) against the same
# Alpine/musl toolchain as the runtime stage so the binaries are portable.
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

# Workspace manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci --include=dev

COPY client ./client
COPY server ./server

RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# tini reaps zombies and forwards SIGTERM so Node shuts down cleanly.
RUN apk add --no-cache tini \
    && rm -rf /var/cache/apk/*

ENV NODE_ENV=production \
    PORT=5001 \
    DB_PATH=/data/app.db \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# /data holds the SQLite file. docker-compose mounts a tmpfs here so the
# database lives in RAM only and is wiped when the container stops.
RUN mkdir -p /data && chown node:node /data

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/client/dist ./client/dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/server.js"]
