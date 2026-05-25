# syntax=docker/dockerfile:1.7

# ------------------------------------------------------------
# Dependency install stage — includes dev deps for the build.
# ------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install && npm cache clean --force

# ------------------------------------------------------------
# Build stage — runs `next build` with dev deps available.
# ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_KOFI_URL=https://ko-fi.com/numisroma
ARG NEXT_PUBLIC_KOFI_USERNAME=numisroma
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_KOFI_URL=$NEXT_PUBLIC_KOFI_URL \
    NEXT_PUBLIC_KOFI_USERNAME=$NEXT_PUBLIC_KOFI_USERNAME

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

RUN npm run build

# Prune to production-only deps for the runtime image to keep it small.
RUN npm prune --omit=dev

# ------------------------------------------------------------
# Runtime stage — minimal image, non-root.
# ------------------------------------------------------------
FROM node:20-alpine AS runtime
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

WORKDIR /usr/src/app

# Copy only what next start needs. We don't use the `standalone` output to keep
# the change minimal; swap to `output: 'standalone'` in next.config.mjs later
# for a much smaller image.
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/next.config.mjs ./next.config.mjs

RUN chown -R node:node /usr/src/app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
