# Testing

---

## Backend unit tests

Tests run against `mongodb-memory-server` — no real MongoDB or Redis required. In environments configured with `MONGOMS_SYSTEM_BINARY`, that binary must exist; for example, if it points at `/usr/bin/mongod`, install MongoDB there or unset the variable so `mongodb-memory-server` can manage its own binary.

```bash
cd backend
npm test                  # run all tests
npm run test:watch        # watch mode
npm run test:coverage     # run with coverage report
npx jest tests/unit/coinController.test.js   # run a single file
```

### Test suites

| File | Covers |
|------|--------|
| `authController.test.js` | register, login, logout, changePassword, changeUsername, updateProfile, checkSession |
| `collectionController.test.js` | CRUD, public/private access control, addCoin, removeCoin, entry metadata |
| `sessionController.test.js` | createSession, getActiveSessions, public session IDs, trusted proxy IP handling, terminateSession, terminateAll, updateSessionActivity |
| `sessionLocation.test.js` | local-only IP geolocation behavior, private IP handling, and no external provider calls |
| `tokenManager.test.js` | hashToken, generateTokenPair, refreshAccessToken, revokeRefreshToken, revokeAllRefreshTokens |
| `emailService.test.js` | transactional email templates including account deletion, security alerts, and data export readiness |
| `infraMiddleware.test.js` | requestId, requestTimeout (including 503 path), metrics, errorHandler |
| `coinController.test.js` | coin catalog endpoints |
| `userController.test.js` | user profile endpoints |
| `contactController.test.js` | contact validation, storage, and support inbox notification |

### Coverage thresholds

Enforced in `backend/package.json` — `npm run test:coverage` exits non-zero if any metric falls below:

| Metric | Threshold |
|--------|-----------|
| Statements | 54% |
| Branches | 52% |
| Functions | 45% |
| Lines | 54% |

Current baseline: ~55% statements / ~53% branches / ~46% functions.

---

## Frontend E2E tests (Cypress)

Cypress tests run against a live frontend + backend. Make sure both are running before starting tests.

```bash
# Start the stack
npm run dev

# Interactive mode (opens Cypress UI)
cd frontend && npm run cypress:open

# Headless mode (for CI)
cd frontend && npm run cypress:run
```

Environment variables consumed by Cypress:

| Variable | Default | Description |
|----------|---------|-------------|
| `CYPRESS_BASE_URL` | `http://localhost:3000` | Frontend URL |
| `CYPRESS_API_URL` | `http://localhost:4000` | Backend API URL |

### Test specs

| File | Covers |
|------|--------|
| `auth.cy.js` | Register (success, duplicate email, mismatched passwords), Login (valid, invalid, empty) |
| `browse.cy.js` | Browse page loads, coin list renders, search filter, navigate to coin detail |
| `coin-detail.cy.js` | Coin detail page renders, obverse image present, emperor/denomination fields, back link |

### Custom commands (`cypress/support/commands.js`)

| Command | Description |
|---------|-------------|
| `cy.login(email, password)` | Logs in via the UI and caches the session with `cy.session` |
| `cy.logout()` | Clicks the Sign out button from the home page |

### Fixtures

| File | Used for |
|------|----------|
| `fixtures/test-user.json` | Reference test user shape (username, email, password) |

### Notes

- `auth.cy.js` registers a unique timestamped user at the start of the run, then the Login describe block uses that same user. Both describe blocks run in the same Cypress process so the user is guaranteed to exist by the time login tests run.
- Tests assume the database is seeded with coin data for `browse.cy.js` and `coin-detail.cy.js` to pass.

---

## Load tests (k6)

Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

All scripts accept a `BASE_URL` env var (default `http://localhost:4000`).

### Smoke test

Sanity check — 1 VU, 30 s, p(95) < 500 ms threshold.

```bash
k6 run k6/smoke.js
```

Hits: `GET /health`, `GET /api/coins?limit=10`, `GET /api/collections/public`

### Load test

Read-heavy browse endpoints — ramps to 50 VUs, p(95) < 1 s.

```bash
k6 run k6/load.js
# Against a remote server:
BASE_URL=https://numisroma.example.com k6 run k6/load.js
```

Stages: 0→20 VUs (1 min) → 50 VUs (2 min) → hold (1 min) → ramp down (30 s)

Hits: `GET /api/coins?issuer=<random>`, `/api/coins/filter-options`, `/api/coins/random`

### Auth-flow stress test

Full register → profile → browse → logout per VU — ramps to 10 VUs.

```bash
k6 run k6/auth-flow.js
```

Thresholds: error rate < 5%, p(95) < 2 s.

---

## CI

All tests run automatically on push and PR via `.github/workflows/ci.yml`.

Additional automated checks:
- **gitleaks** — secret scanning on every push/PR and weekly
- **Trivy** — filesystem vulnerability scan on every push/PR; Docker image scan on push to main
