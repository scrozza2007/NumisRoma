# 🏛️ NumisRoma

> A full-stack web platform for browsing, cataloging, and sharing ancient Roman coin collections.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248)](https://www.mongodb.com/)

---

## 📖 Overview

**NumisRoma** is a production-ready platform built for numismatists and history enthusiasts to:

- 🪙 Browse a live catalog of documented Roman Republican and Imperial coins
- 🔍 Search and filter by issuer, era, dynasty, mint, material, and year range (BC/AD)
- 📁 Create and manage personal coin collections (public or private)
- ⭐ Save wanted catalog coins to a wishlist and jump back to their detail pages
- 👥 Follow other collectors, explore their collections, and send direct messages
- 🖼️ Upload custom photos for coins in your collection
- 📖 Read the project mission, research standards, contributor guidance, terms, and privacy information
- ☕ Support ongoing development through the embedded and floating Ko-fi integrations
- ✉️ Contact support through the working contact form and `support@numisroma.com`
- 🔐 Manage your account with full session control across devices

The current user interface is provided in English only.

---

## ✨ Features

### Catalog
- ⚡ Full-text search with filters: issuer, era, period, mint, material, denomination
- 📅 Year-range queries with BC/AD support (BC stored as negative numbers)
- 🎲 Random coin discovery endpoint
- 🗂️ Filter options cached via Redis for fast response times

### Collections
- 📂 Create unlimited public or private collections
- ➕ Add coins with detailed specimen metadata, provenance, values, private references, and custom obverse/reverse photos
- 📊 View collection statistics, export collections, and import CSV/JSON rows
- 🖼️ Collection cover image upload (stored in private Cloudflare R2; served via auth-gated proxy)
- 🛡️ Server-side image validation — blur, brightness, resolution, aspect ratio, NSFW detection (SafeSearch), and AI coin-presence check (Google Vision)
- 🔒 Private collections are fully access-controlled (IDOR-protected)

### Community
- 👤 Follow / unfollow collectors
- 📰 Activity feed per user
- 💬 End-to-end encrypted direct messaging (Signal Protocol — X3DH + Double Ratchet)
- 🔎 User search

### Auth & Security
- 🔑 JWT-based auth via httpOnly cookies (access token 15 min, refresh token 7 days)
- 🔄 Refresh token rotation with per-device session management (max 5 sessions)
- 📧 Email-verified registration — OTP sent via Resend, mailbox validated via Abstract API
- 🔑 Forgot / reset password flow with single-use tokens (15 min TTL)
- 🌐 Google OAuth sign-in with find-or-create account merging
- 🛡️ CSRF double-submit cookie protection on all mutating requests
- 🚦 Rate limiting on all routes (Redis-backed, fail-open)
- 🧱 Helmet security headers + SSRF protection on external URL inputs

### Public Site & Support
- 📚 Mission, research, contributors, terms, and privacy pages explain the project and its policies
- ☕ `/donate` embeds Ko-fi and a site-wide floating Ko-fi control provides quick access to support
- ✉️ `/contact` stores validated inquiries and sends notifications to the configured support inbox

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24 + Docker Compose v2 *(recommended)*
- Node.js ≥ 18 + npm ≥ 9 *(for local development without Docker)*

### Installation (Docker)

1. **Clone the repository**
   ```bash
   git clone https://github.com/scrozza2007/numisroma.git
   cd numisroma
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in the required secrets (see [Configuration](#-configuration) below).

3. **Start all services**
   ```bash
   npm run dev
   ```
   Frontend → `http://localhost:3000` · Backend → `http://localhost:4000`

4. **Stop**
   ```bash
   npm run stop
   ```

### Installation (without Docker)

```bash
# Backend
cp backend/.env.example backend/.env   # fill in required vars
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

---

## 📁 Project Structure

```
numisroma/
├── backend/                  Express.js API (MVC)
│   ├── src/
│   │   ├── config/          validateEnv, database, constants, sentry
│   │   ├── controllers/     auth, coins, collections, wishlist, users, messages, sessions, contact
│   │   ├── middlewares/     auth, CSRF, upload, rate-limit, error handler
│   │   ├── models/          Coin, Collection, User, Session, Message, Conversation, Follow…
│   │   ├── routes/          one file per domain
│   │   └── utils/           cache, tokenManager, metrics, s3Storage, logger
│   └── tests/
│       ├── unit/
│       └── integration/
├── frontend/                 Next.js (Pages Router)
│   ├── components/          Layout, Navbar, Ko-fi widgets, dropdowns, sliders, toasts
│   ├── context/             AuthContext (global auth state)
│   ├── cypress/             E2E tests (auth, browse, coin detail)
│   ├── pages/               browse, collections, donate, contact, mission, legal, profile, messages…
│   └── utils/               apiClient, csrf, tokens, passwordValidation
├── docs/                    API reference, deployment guide, testing guide
├── scripts/                 MongoDB backup script
├── docker-compose.yml        Base compose (dev + prod base)
├── docker-compose.prod.yml   Production overlay (Caddy, mongo-backup)
├── Caddyfile                 Reverse proxy + auto-TLS config
└── .env.example
```

---

## ⚙️ Configuration

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | ≥ 64-char random string |
| `REFRESH_TOKEN_SECRET` | ✅ | ≥ 64-char, must differ from `JWT_SECRET` |
| `CSRF_SECRET` | prod only | ≥ 64-char; falls back to `JWT_SECRET` in dev |
| `FRONTEND_URL` | prod only | Allowed CORS origin(s), comma-separated |
| `DOMAIN` | prod only | Public hostname (e.g. `numisroma.com`); used by Caddy and the prod compose |
| `REDIS_URL` | optional | Redis-backed caching and rate limiting; falls back to in-memory |
| `AWS_S3_BUCKET` | optional | S3 / Cloudflare R2 image storage; falls back to local disk |
| `AWS_ENDPOINT` | optional | R2 only: `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `RESEND_API_KEY` | required | Transactional email (OTP, welcome, password reset) via Resend |
| `RESEND_FROM_EMAIL` | optional | Sender address; must be a verified Resend domain |
| `SUPPORT_EMAIL` | optional | Inbox that receives contact form submissions; defaults to `support@numisroma.com` |
| `NEXT_PUBLIC_KOFI_URL` | optional | Ko-fi donation page used by `/donate`; defaults to `https://ko-fi.com/numisroma` |
| `NEXT_PUBLIC_KOFI_USERNAME` | optional | Ko-fi page name used by the embedded panel and floating widget; defaults to `numisroma` |
| `ABSTRACT_EMAIL_API_KEY` | optional | Mailbox deliverability check before sending OTPs; fails open when unset |
| `GOOGLE_CLIENT_ID` | optional | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | optional | Google OAuth app client secret |
| `GOOGLE_VISION_API_KEY` | optional | Google Cloud Vision API key — enables AI coin detection on coin uploads and NSFW + incoherent-content rejection on thumbnails; skips AI checks when unset (free tier: 1 000 units/month) |
| `SENTRY_DSN` | optional | Error tracking via Sentry |
| `ADMIN_API_KEY` | optional | ≥ 32-char key to access cache-flush admin endpoints |

See `backend/.env.example` and `.env.example` for the full list.

> The server validates all required variables at boot and throws before listening if anything is missing or looks like a placeholder.

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register/initiate` — Start email-verified registration (sends OTP)
- `POST /api/auth/register/resend-otp` — Resend OTP
- `POST /api/auth/register/verify` — Verify OTP and create account
- `POST /api/auth/forgot-password` — Request password reset email
- `POST /api/auth/reset-password` — Reset password with token
- `GET /api/auth/google` — Initiate Google OAuth
- `POST /api/auth/login` — Login (sets httpOnly cookie)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user
- `POST /api/auth/refresh` — Rotate refresh token
- `GET /api/auth/session-check` — Validate active session

### Coins
- `GET /api/coins` — Search & filter catalog (`era=imperial|republican` supported)
- `GET /api/coins/random` — Random coin(s)
- `GET /api/coins/filter-options` — Available filter values
- `GET /api/coins/:id` — Coin detail
- `POST /api/coins/validate-images` — Validate coin images without persisting *(auth)* — used by the add-coin flow before creating the collection entry

### Collections
- `GET /api/collections/public` — All public collections
- `GET /api/collections` — My collections *(auth)*
- `POST /api/collections` — Create collection *(auth)*
- `PUT /api/collections/:id` — Update collection *(auth)*
- `DELETE /api/collections/:id` — Delete collection *(auth)*
- `POST /api/collections/:id/coins` — Add coin *(auth)*
- `DELETE /api/collections/:id/coins/:coinId` — Remove coin *(auth)*

### Wishlist
- `GET /api/wishlist` — Wanted/watching/acquired entries *(auth)*
- `POST /api/wishlist` — Save a wanted catalog coin or manual target *(auth)*
- `DELETE /api/wishlist/:entryId` — Remove wishlist entry *(auth)*

### Users
- `GET /api/users/:id/profile` — User profile
- `POST /api/users/:id/follow` — Follow user *(auth)*
- `DELETE /api/users/:id/unfollow` — Unfollow user *(auth)*
- `GET /api/users/:id/activity` — Activity feed

### Messages
- `GET /api/messages/conversations` — All conversations *(auth)*
- `GET /api/messages/conversations/:otherUserId` — Get or create 1:1 conversation *(auth)*
- `GET /api/messages/search/users?query=` — Search users to message *(auth)*
- `GET /api/messages/:conversationId` — Messages in thread *(auth)*
- `POST /api/messages/:conversationId` — Send message *(auth)*
- `PUT /api/messages/:conversationId/read` — Mark conversation as read *(auth)*

### Contact
- `POST /api/contact` — Validate and save a support inquiry, then notify `SUPPORT_EMAIL`

📖 **Full API documentation:** [docs/api.md](docs/api.md)

---

## 🛠 Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 16 (Pages Router), Tailwind CSS v4 |
| **Backend** | Node.js 18+, Express.js |
| **Database** | MongoDB 8.0, Mongoose |
| **Cache** | Redis (optional, in-memory fallback) |
| **Auth** | JWT (httpOnly cookies), refresh token rotation |
| **Image processing** | Multer + Sharp (WebP output, resize, EXIF strip) |
| **Image validation** | Blur (Laplacian variance), brightness, resolution, NSFW (Google Vision SafeSearch), AI coin detection (Google Vision Label Detection) |
| **Image storage** | Private Cloudflare R2 (S3-compatible); local disk fallback for dev |
| **Observability** | Sentry (errors), Prometheus `/metrics` |
| **Containerization** | Docker + Docker Compose |

---

## 🔐 Security Features

✅ **Authentication**
- JWT access tokens (15 min) + rotating refresh tokens (7 days)
- Tokens stored as httpOnly cookies, never exposed to JS
- Max 5 concurrent sessions per user

✅ **End-to-End Encrypted Messaging**
- Signal Protocol: X3DH key exchange + Double Ratchet algorithm
- Private keys stored exclusively in IndexedDB — never in Web Storage or on the server
- Server stores only opaque ciphertext; cannot read any message content
- Per-message forward secrecy via HMAC-SHA-256 chain key ratchet (KDF_CK)
- Password-protected key backup with Argon2id + AES-GCM-256
- Safety numbers via BLAKE2b for out-of-band identity verification

✅ **CSRF Protection**
- Double-submit cookie pattern (`csrf-csrf`)
- Auto-skipped for non-browser clients (no auth cookie)

✅ **Rate Limiting**
- General: 300 req / 15 min
- Auth routes: 20 req / 15 min
- Search: 30 req / min
- Contact: 5 req / hr
- Redis-backed with automatic in-memory fallback

✅ **Input & Request Security**
- Helmet security headers on all responses
- SSRF protection on external URL fields
- NoSQL injection defense (ObjectId validation before every DB query)
- `express-validator` on all mutating endpoints

---

## 🧪 Testing

```bash
# Run all backend tests (no real DB or Redis needed)
cd backend && npm test

# Watch mode
cd backend && npm run test:watch

# Coverage report
cd backend && npm run test:coverage

# Single file
cd backend && npx jest tests/unit/coinController.test.js

# Frontend E2E — interactive
cd frontend && npm run cypress:open

# Frontend E2E — headless
cd frontend && npm run cypress:run
```

| Test suite | Covers |
|------------|--------|
| `authController.test.js` | register, login, logout, password/username change |
| `coinController.test.js` | catalog search, filters, random |
| `collectionController.test.js` | CRUD, public/private access control, addCoin/removeCoin |
| `sessionController.test.js` | createSession, terminate, revokeAll |
| `tokenManager.test.js` | token generation, rotation, revocation |
| `authMiddleware.test.js` | JWT validation, cookie parsing |
| `infraMiddleware.test.js` | requestId, timeout, metrics, errorHandler |

**Coverage thresholds:** 54% statements · 52% branches · 45% functions · 54% lines

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Server won't start** | Check all required env vars are set and not placeholders |
| **CSRF errors on requests** | Ensure `GET /api/csrf-token` is called before mutating requests |
| **Images not loading** | Verify `FRONTEND_URL` matches your frontend origin exactly |
| **Rate limit errors** | Redis may be unavailable — check `REDIS_URL` or restart Redis |
| **MongoDB connection failed** | Verify `MONGODB_URI` and that MongoDB is running |
| **Public page shows no signed-in state locally** | Start the backend on `http://localhost:4000`; public pages remain usable while authentication cannot be confirmed |
| **Docker reports port 3000 already in use** | Stop a standalone `npm run dev` frontend before starting Compose, or free port `3000` |

---

## 🛣️ Roadmap

- [ ] Coin valuation estimates
- [ ] Advanced collection charts
- [ ] Mobile-friendly PWA
- [ ] Public API for third-party integrations
- [ ] Email notifications for follows and messages

---

## 📚 Documentation

- 📘 [API Reference](docs/api.md) — All endpoints, request/response shapes, rate limits
- 📗 [Deployment Guide](docs/deployment.md) — Production setup with reverse proxy
- 📙 [Testing Guide](docs/testing.md) — Jest, coverage, and load tests

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**scrozza2007**
- GitHub: [@scrozza2007](https://github.com/scrozza2007)

---

<div align="center">

**Made with ❤️ for history and numismatics**

[Report Bug](https://github.com/scrozza2007/numisroma/issues) · [Request Feature](https://github.com/scrozza2007/numisroma/issues) · [Documentation](docs/)

</div>
