# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NumisRoma is an ancient Roman coin collection platform — a monorepo with an npm workspaces setup containing a **Next.js frontend** (port 3000) and an **Express.js backend** (port 4000) backed by MongoDB and optional Redis.

## Commands

### Full stack (Docker — preferred)
```bash
npm run dev        # docker compose up (all services)
npm run build      # docker compose build
npm run start      # docker compose up -d
npm run stop       # docker compose down
```

### Backend only
```bash
cd backend
npm run dev        # nodemon (hot reload)
npm test           # Jest (uses mongodb-memory-server, no real DB needed)
npm run test:watch
npm run test:coverage
```

### Run a single backend test file
```bash
cd backend && npx jest tests/unit/coinController.test.js
```

### Frontend only
```bash
cd frontend
npm run dev        # next dev
npm run build      # next build (also acts as lint)
npx cypress open   # E2E tests
```

### Root-level shortcuts
```bash
npm run test:backend    # runs backend Jest suite
npm run lint:frontend   # next build (lint)
npm run build:frontend
```

### Load tests (k6)
```bash
k6 run k6/smoke.js                                    # 1 VU, 30 s sanity check
k6 run k6/load.js                                     # ramp to 50 VUs, read-heavy
k6 run k6/auth-flow.js                                # register→browse→logout per VU
BASE_URL=https://numisroma.example.com k6 run k6/load.js  # against remote
```

## Environment Setup

### Backend (`backend/.env`)
Copy `backend/.env.example`. Required variables:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — min 32 chars, not a placeholder
- `REFRESH_TOKEN_SECRET` — must differ from JWT_SECRET
- `CSRF_SECRET` — required in production; falls back to JWT_SECRET in dev
- `FRONTEND_URL` — required in production; comma-separated origins for CORS/CSP/cookie

Optional variables:
- `REDIS_URL` / `REDIS_HOST` — enables Redis-backed caching and rate limiting; falls back to in-memory when absent
- `SENTRY_DSN` — error tracking; skipped when unset (warns in production)
- `AWS_S3_BUCKET` / `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — enables S3 image storage; falls back to local disk (`src/uploads/`) when unset
- `ADMIN_API_KEY` — min 32 chars; required to access `/api/cache` admin endpoints
- `TRUST_PROXY` — set to `1` behind a single LB/proxy; required in production for correct `req.ip` and rate-limit key derivation

Generate secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

The server performs fail-fast env validation (`src/config/validateEnv.js`) at startup — it throws before listening if required variables are missing or look like placeholders.

### Root `.env.example`
Used by Docker Compose. Copy it to `.env` at the repo root for the compose setup.

### Frontend (`frontend/.env`)
Copy `frontend/.env.example`. Key variable:
- `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:4000`

## Architecture

### Backend (`backend/src/`)
Standard Express MVC layout:
- **`routes/`** — thin route files that apply rate limiting and wire controllers; includes `health.js` (liveness/readiness) and `cache.js` (admin cache-flush, requires `ADMIN_API_KEY`)
- **`controllers/`** — business logic; one file per domain (auth, coins, collections, users, messages, sessions, contact, notifications, e2ee)
- **`models/`** — Mongoose schemas (Coin, Collection, User, Session, Message, Conversation, Follow, Notification, Contact, CoinCustomImage, DeviceIdentity, PreKeyBundle)
- **`utils/sseEmitter.js`** — singleton `EventEmitter` (max 1000 listeners) used by the notification SSE stream; keyed on `user:<userId>`
- **`middlewares/`** — security (helmet/rate-limit), auth (JWT), CSRF, upload (multer/sharp), request ID, timeout, logging, error handler, `adminMiddleware.js` (API-key guard for admin routes), `enhancedValidation.js`
- **`utils/cache.js`** — Redis-backed cache with automatic in-memory fallback; used via `cacheHelpers` (coins, collections, users, search, filters) and `cacheMiddleware` for HTTP routes
- **`utils/metrics.js`** — Prometheus metrics via `prom-client`; exposed at `GET /metrics` (scrape endpoint)
- **`utils/s3Storage.js`** — S3 upload/delete helpers; returns `null` when `AWS_S3_BUCKET` is unset so `upload.js` falls back to local disk
- **`utils/ssrfProtection.js`** — blocks requests to private/reserved IPs to prevent SSRF
- **`config/`** — `validateEnv.js`, `database.js`, `constants.js`, `sentry.js`

**Authentication flow**: JWT issued as httpOnly cookie on login; access token (15 min) + refresh token (7 days, rotatable). The `authMiddleware` validates JWTs; `optionalAuthMiddleware` attaches the user when present but doesn't require it. Refresh tokens are stored hashed in the `Session` model and rotated on each use (max 5 sessions per user).

**CSRF**: Double-submit cookie pattern via `csrf-csrf`. Clients fetch a token from `GET /api/csrf-token` and send it in the `X-CSRF-Token` header on mutating requests. The backend auto-skips CSRF for requests with no auth cookie (non-browser clients).

**Rate limiting**: Four limiters defined in `constants.js` — `generalLimiter` (100 req/15 min), `authLimiter` (20 req/15 min), `contactLimiter` (5 req/hr), `searchLimiter` (30 req/min). All use a Redis store when available, falling back to in-memory (fail-open if Redis goes down mid-flight).

**Social / notifications**: The `Notification` model stores `follow_request`, `follow_accepted`, `new_follower`, and `new_message` events. `createNotification` (exported from `notificationController`) is the shared helper used by all domains that need to emit notifications — it also calls `pushCountsToUser` to push real-time counts via SSE. The SSE stream is single-instance (no Redis pub/sub); one connection per user is enforced via `activeConnections` Map. The Navbar holds the sole SSE connection per browser tab and fans out via `BroadcastChannel('numisroma:notifications')`.

**Private profiles**: `User.isPrivate` (default `false`). Following a private user creates a `Follow` with `status: 'pending'`. Accept/decline routes update the status and clean up the notification. Both `GET /api/messages/conversations/:id` and `GET /api/users/:id/chat` gate messaging behind an accepted follow check when the target is private.

**Coin schema**: `coinage.date.from` / `coinage.date.to` are numeric indexed fields. BC years are stored as negative numbers; these power efficient year-range overlap queries (`$lte end`, `$gte start`).

**Uploads**: Images are handled by multer + sharp (resize/optimise to WebP, max 1920×1080, 5 MB input). When `AWS_S3_BUCKET` is set, processed images are stored in S3; otherwise they land under `src/uploads/` and are served as static files from `/uploads`. Upload paths are not access-controlled.

**Observability**: Sentry is initialised before any other `require` in `index.js` so it can instrument built-in Node modules. Prometheus metrics are collected by default (`numisroma_` prefix) and scraped from `GET /metrics`.

**E2EE messaging**: Signal Protocol (X3DH + Double Ratchet) implemented entirely client-side.
- `DeviceIdentity` — stores Ed25519 identity key (signing) and X25519 DH identity key (public only)
- `PreKeyBundle` — signed pre-key + one-time pre-keys; OTPKs are consumed atomically (one per X3DH handshake)
- `GET /api/e2ee/pre-keys/:userId` — fetches a bundle and marks one OTPK as used; returns `X-OTPK-Remaining` header
- `POST /api/e2ee/pre-keys/replenish` — upload new OTPKs when supply is low
- Private keys never leave the client; the `encryptedKeyBundle` stored server-side is an Argon2id+AES-GCM blob — opaque to the server
- Ratchet sessions stored in IndexedDB `ratchet` store keyed by conversation ID; messages cached in `messages` store keyed by message ID (decrypt-once)

### Frontend (`frontend/`)
Next.js **Pages Router** (not App Router). Key patterns:
- **`utils/apiClient.js`** — central fetch wrapper; attaches `credentials: 'include'`, CSRF token on mutating requests; throws `ApiError` with `.status`, `.details`, `.code`; auto-retries once on `CSRF_INVALID` 403
- **`utils/csrf.js`** — CSRF token fetch-once / cache / invalidate helpers consumed by `apiClient.js`
- **`utils/e2ee.js`** — complete Signal Protocol implementation: X3DH, Double Ratchet, key generation, IDB persistence, safety numbers
- **`utils/formatters.js`** — centralized display formatters; raw DB values (underscores, lowercase codes, abbreviated references) must never be rendered directly — import named functions here (`fmt`, `fmtPeriod`, `fmtReference`, `fmtSource`, `fmtSeries`, `fmtSubjects`, `hasVal`). `AutocompleteDropdown` accepts plain strings or `{ label, value }` objects — use `{ label, value }` when the displayed text differs from the API query value (e.g. formatted issuer names vs raw DB strings).
- **`context/AuthContext.js`** — global auth state; exposes `e2eeReady` + `initE2EE(password)` for E2EE lifecycle; login calls `initE2EE` with the plaintext password to generate or restore the identity bundle
- **`components/`** — Layout, Navbar, AutocompleteDropdown, CustomDropdown, PeriodRangeSlider, NotificationToast, ErrorBoundary; sub-folders under `components/profile/` and `components/settings/`
- Styled with **Tailwind CSS v4**

### Testing
Backend tests run against **mongodb-memory-server** — no real MongoDB or Redis required. Test env vars are set in `tests/setup.js`. Redis env vars are explicitly deleted during tests so rate-limit stores fall back to in-memory.

Coverage thresholds (enforced by `npm run test:coverage`): 54% statements, 52% branches, 45% functions, 54% lines.

Frontend E2E uses **Cypress** (`cypress/`). CI runs gitleaks (secret scanning) and Trivy (filesystem + Docker image vulnerability scan) on every push/PR.

### Docker Compose services
| Service | Internal port | Host port |
|---------|--------------|-----------|
| frontend | 3000 | 3000 |
| backend | 4000 | 4000 |
| mongodb | 27017 | 27018 |

MongoDB data is persisted in a named volume `mongodb_data`.

### Production overlay
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
Adds a **Caddy** reverse proxy (auto-TLS) and a **mongo-backup** cron container (daily `mongodump` at 02:00 UTC). Requires `DOMAIN`, `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, and `BACKUP_DIR` in the root `.env`.
