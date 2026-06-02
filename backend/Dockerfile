# ------------------------------------------------------------
# Dependency install stage
# ------------------------------------------------------------
# Pinned digest-less major-minor tag: Alpine LTS, stable.
FROM node:20-alpine AS deps
WORKDIR /usr/src/app

# Only copy lockfile-relevant files so this layer caches independently of src.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ------------------------------------------------------------
# Runtime stage
# ------------------------------------------------------------
FROM node:20-alpine AS runtime

# wget is needed by the healthcheck below and is already in the base image;
# we add tini for clean signal forwarding (SIGTERM → node, not PID 1 node).
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    PORT=4000

WORKDIR /usr/src/app

# Copy production node_modules from the deps stage and application source.
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY scripts ./scripts

# Drop to the built-in unprivileged `node` user. No app code needs to be root.
# The upload dir must be writable by that user.
RUN mkdir -p /usr/src/app/src/uploads/collections /usr/src/app/src/uploads/coins /usr/src/app/logs \
 && chown -R node:node /usr/src/app

USER node

EXPOSE 4000

# Container-level liveness probe. Hits the unauthenticated /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
