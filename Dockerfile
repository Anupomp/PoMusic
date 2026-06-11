# ── Stage 1: build the React client ─────────────────────
FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ── Stage 2: build the TypeScript server ────────────────
FROM node:20-alpine AS server-build
WORKDIR /server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# ── Stage 3: runtime ─────────────────────────────────────
FROM node:20-alpine
# yt-dlp needs python3; ffmpeg helps with some formats
RUN apk add --no-cache python3 py3-pip ffmpeg curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev
COPY --from=server-build /server/dist ./dist
COPY server/sql ./sql
COPY --from=client-build /client/dist ./public

EXPOSE 3000
CMD ["node", "dist/index.js"]
