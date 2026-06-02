# Deployment

Production deployment uses Docker Compose with a separate overlay file that adds Caddy (reverse proxy + automatic TLS) and a MongoDB backup cron.

---

## Prerequisites

- Docker ≥ 24 and Docker Compose v2
- A public hostname pointing at your server (for Let's Encrypt)
- Ports 80 and 443 open on the host firewall

---

## Setup

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in all required values. Production-specific variables:

| Variable | Description |
|----------|-------------|
| `DOMAIN` | Your public hostname, e.g. `numisroma.com` — frontend served at `https://$DOMAIN`, backend at `https://api.$DOMAIN` |
| `BACKUP_DIR` | Host path for MongoDB dump archives, e.g. `./backups` |
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root user (must match the backend connection string) |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password |
| `JWT_SECRET` | ≥ 64-char random string |
| `REFRESH_TOKEN_SECRET` | ≥ 64-char random string, different from `JWT_SECRET` |
| `CSRF_SECRET` | ≥ 64-char random string, different from both above |
| `RESEND_FROM_EMAIL` | Verified Resend sender, e.g. `NumisRoma <noreply@numisroma.com>` |
| `RESEND_REPLY_TO_EMAIL` | Reply-To for transactional emails; defaults to `SUPPORT_EMAIL` |
| `EMAIL_LOGO_URL` | Absolute URL for the email header logo; defaults to `https://$DOMAIN/brand/numisroma-social-monogram-borderless.png` through `FRONTEND_URL` |
| `EMAIL_DMARC_CONFIRMED` | Set to `true` after publishing and verifying a `_dmarc` TXT record for the sending domain |
| `SUPPORT_EMAIL` | Inbox that receives contact form submissions; defaults to `support@numisroma.com`; prefer the same root domain as `RESEND_FROM_EMAIL` |
| `NEXT_PUBLIC_KOFI_URL` | Ko-fi page linked from the donation experience |
| `NEXT_PUBLIC_KOFI_USERNAME` | Ko-fi page name used by the embedded and floating widgets |
| `MAXMIND_ACCOUNT_ID` | Optional MaxMind account ID for local/self-hosted session IP geolocation |
| `MAXMIND_LICENSE_KEY` | Optional MaxMind license key used by the `geoipupdate` profile |
| `DATA_EXPORT_DIR` | Private temporary directory for user data export ZIP archives |
| `DATA_EXPORT_EXPIRY_DAYS` | Number of days before export download links/files expire |

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

For Resend deliverability, keep production email links on the same root domain as
the verified sender. With `NumisRoma <noreply@numisroma.com>`, use
`FRONTEND_URL=https://numisroma.com`, `SUPPORT_EMAIL=support@numisroma.com`,
and `EMAIL_LOGO_URL=https://numisroma.com/brand/numisroma-social-monogram-borderless.png`.
Add a DMARC record before setting `EMAIL_DMARC_CONFIRMED=true`, for example:

```txt
_dmarc.numisroma.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@numisroma.com; adkim=s; aspf=s"
```

Optional image storage (Cloudflare R2 or AWS S3 — falls back to local disk):

| Variable | Description |
|----------|-------------|
| `AWS_S3_BUCKET` | Bucket name |
| `AWS_REGION` | Region (`auto` for Cloudflare R2) |
| `AWS_ACCESS_KEY_ID` | Access key |
| `AWS_SECRET_ACCESS_KEY` | Secret key |
| `AWS_S3_CUSTOM_DOMAIN` | Public bucket domain (e.g. `pub-xxxx.r2.dev`) |
| `AWS_ENDPOINT` | R2 only: `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com` |

### 2. Install local GeoIP databases (optional but recommended)

Session locations are resolved only from local/self-hosted GeoIP database files.
NumisRoma never sends user IP addresses to hosted geolocation APIs. Without a
local database, sessions show `Unknown location`.

Add MaxMind credentials to `.env`:

```env
MAXMIND_ACCOUNT_ID=your_account_id
MAXMIND_LICENSE_KEY=your_license_key
MAXMIND_DATA_DIR=./geoip
MAXMIND_EDITION_IDS=GeoLite2-City GeoLite2-ASN
MAXMIND_CITY_DB_PATH=/usr/src/app/geoip/GeoLite2-City.mmdb
MAXMIND_ASN_DB_PATH=/usr/src/app/geoip/GeoLite2-ASN.mmdb
```

Download/update the local databases:

```bash
docker compose --profile geoip run --rm geoipupdate
```

The `geoip/` directory is mounted read-only into the backend container. For
production accuracy, users must access NumisRoma through the public domain so
Caddy forwards the real public client IP; private Docker/LAN addresses cannot
be geolocated.

### 3. Start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This brings up:

| Service | Role |
|---------|------|
| `frontend` | Next.js (internal only, no host port) |
| `backend` | Express API (internal only, no host port) |
| `mongodb` | MongoDB 8.0 with persistent volume, port not exposed to host |
| `redis` | Redis 7 with persistent volume |
| `caddy` | Reverse proxy, ports 80 and 443 |
| `mongo-backup` | Daily 02:00 UTC `mongodump` cron |

### 4. Verify TLS

Caddy fetches a Let's Encrypt certificate automatically on first request. Check logs:

```bash
docker compose logs caddy -f
```

---

## Caddy routing

Defined in `Caddyfile`:

| Host | Upstream |
|------|----------|
| `numisroma.com` | `frontend:3000` |
| `api.numisroma.com` | `backend:4000` |

The frontend and backend containers are not exposed on any host port — all external traffic goes through Caddy.

---

## Frontend build and NEXT_PUBLIC_API_URL

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_KOFI_URL`, and `NEXT_PUBLIC_KOFI_USERNAME`
are **build-time** variables in Next.js and are baked into the JavaScript
bundle when the frontend image is built. In production,
`NEXT_PUBLIC_API_URL` is automatically set to `https://api.$DOMAIN` by
`docker-compose.prod.yml`; configure the optional Ko-fi values in `.env`
before building if the account name or page URL differs from the defaults.

For local development (`docker compose up` without the prod overlay), it defaults to `http://localhost:4000` via the `NEXT_PUBLIC_API_URL` variable in your root `.env`.

---

## MongoDB backup

`docker-compose.prod.yml` runs `mongo-backup` which executes `scripts/backup-mongo.sh`:

- Runs daily at 02:00 UTC
- Archives are stored at `$BACKUP_DIR` on the host
- Prunes archives older than 30 days automatically
- Requires `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`

To trigger a manual backup:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec mongo-backup /backup.sh
```

---

## User data exports

The "Download Your Data" account action creates temporary ZIP archives outside
public uploads. Configure:

| Variable | Description |
|----------|-------------|
| `DATA_EXPORT_DIR` | Private path for ZIP archives, default `/usr/src/app/src/private/data-exports` in Docker |
| `DATA_EXPORT_EXPIRY_DAYS` | Link/archive lifetime, default `7` |
| `DATA_EXPORT_RATE_LIMIT_HOURS` | Per-user request cooldown, default `24` |

Expired archive records and files are cleaned up automatically by the backend.
The archive directory is gitignored and must not be served as static content.

---

## Updates

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Development (no Caddy)

For local development, use the base compose only:

```bash
npm run dev     # alias for: docker compose up
```

Frontend is on `http://localhost:3000`, backend on `http://localhost:4000`.
