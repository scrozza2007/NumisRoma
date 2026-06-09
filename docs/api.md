# API Reference

All API endpoints are served from `http://localhost:4000` in development (or `https://api.$DOMAIN` in production via Caddy).

**Base path:** `/api`

---

## Authentication

NumisRoma uses short-lived JWT access tokens and rotating refresh tokens stored in
httpOnly cookies. Most mutating endpoints also require a CSRF token.

### Obtaining a CSRF token

```http
GET /api/csrf-token
```

Returns a token in the response body. Send it as the `X-CSRF-Token` header on all
`POST`, `PUT`, and `DELETE` requests from browser clients.

The backend skips CSRF validation for requests that carry no auth cookie (e.g.
programmatic clients that authenticate via the `Authorization` header).

---

## Auth endpoints — `/api/auth`

### Register (email-verified, 3-step)

**Step 1 — Initiate**

```http
POST /api/auth/register/initiate
Content-Type: application/json

{
  "username": "string (3–20 chars, alphanumeric + _)",
  "email": "string (valid email)",
  "password": "string (≥8 chars, upper + digit + special)"
}
```

Validates fields, checks username/email availability, verifies mailbox deliverability via Abstract API, generates a 6-digit OTP (SHA-256 hashed in `PendingRegistration`, 15 min TTL), and sends it via Resend. Rate-limited to 20 attempts / 15 min per IP; max 5 OTP sends per hour per email.

Returns `200` with `{ message }`. The `PendingRegistration` document is TTL-deleted by MongoDB after 15 min past expiry.

**Step 2 — Resend OTP**

```http
POST /api/auth/register/resend-otp
Content-Type: application/json

{ "email": "string" }
```

Re-issues the OTP with a 60-second cooldown. Returns `429` if the per-hour cap is reached.

**Step 3 — Verify**

```http
POST /api/auth/register/verify
Content-Type: application/json

{ "email": "string", "otp": "string (6 digits)" }
```

Validates the OTP hash (max 5 failed attempts), marks it used, creates the `User` document, issues access/refresh httpOnly cookies, records the session, and sends a welcome email (non-blocking). Returns `{ authenticated: true, user }`.

### Forgot password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "string" }
```

Always returns `200` (no email enumeration). Generates a 32-byte secure token (SHA-256 hashed in `PasswordResetToken`, 15 min TTL) and sends a reset-link email via Resend. Max 3 emails per hour per user.

### Reset password

```http
POST /api/auth/reset-password
Content-Type: application/json

{ "token": "string", "password": "string (≥8 chars)" }
```

Validates the token hash, rejects expired or already-used tokens, prevents reuse of the current password, and invalidates all existing sessions on success.

### Google OAuth

```http
GET /api/auth/google
```

Redirects to Google consent screen. On callback, finds or creates the user account (merging by email if an account already exists). New OAuth users skip OTP verification and receive a welcome email directly. Redirects to the frontend on completion.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "username or email",
  "password": "string",
  "rememberMe": "boolean (optional)"
}
```

Sets httpOnly access and refresh cookies on success. Refresh tokens are hashed at rest, rotated on use, and bound to the session record. Returns `{ authenticated: true, user }`.

### Login with refresh token

```http
POST /api/auth/login-refresh
Content-Type: application/json

{
  "identifier": "username or email",
  "password": "string",
  "rememberMe": "boolean (optional)"
}
```

Compatibility endpoint for clients that already call `/login-refresh`; it now follows the same secure cookie behavior as `/login`. Returns `{ authenticated: true, user, rememberMe }`.

### Refresh access token

```http
POST /api/auth/refresh
```

Rotates the refresh token from the httpOnly `refreshToken` cookie, issues fresh
access/refresh cookies, and invalidates the previous refresh token hash. If a
previously-used refresh token is seen again, the session family is revoked.
Returns `{ authenticated: true }`.

### Logout

```http
POST /api/auth/logout
```

Revokes the current session when possible and clears access/refresh cookies.

### Revoke a specific refresh token

```http
POST /api/auth/revoke-refresh
Content-Type: application/json

{ "refreshToken": "string (optional when cookie is present)" }
```

Revokes the refresh token and clears cookies when the request uses the refresh
cookie.

### Revoke all refresh tokens

```http
POST /api/auth/revoke-all-refresh
```

Requires auth. Logs out all sessions for the current user.

### Get current user

```http
GET /api/auth/me
```

Returns the authenticated user object (password excluded).

### Check session

```http
GET /api/auth/session-check
```

Returns `{ active: true }` when the session is active.

### Change password

```http
POST /api/auth/change-password
Content-Type: application/json

{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

### Change username

```http
POST /api/auth/change-username
Content-Type: application/json

{ "username": "string (3–20 chars)" }
```

### Update profile

```http
POST /api/auth/update-profile
Content-Type: application/json

{
  "fullName": "string (optional)",
  "email": "string (optional)",
  "location": "string (optional)",
  "bio": "string ≤500 chars (optional)"
}
```

### Check username availability

```http
POST /api/auth/check-username
Content-Type: application/json

{ "username": "string" }
```

Returns `{ available: true }` or `409` if taken.

### Check email availability

```http
POST /api/auth/check-email
Content-Type: application/json

{ "email": "string" }
```

### Verify password

```http
POST /api/auth/verify-password
Content-Type: application/json

{ "password": "string" }
```

### Delete account

```http
POST /api/auth/delete-account
Content-Type: application/json

{ "password": "string" }
```

---

## Coins — `/api/coins`

The coin catalog is read-only for regular users. Admins can create entries. The catalog supports Roman Republican and Imperial material.

Coin IDs are string slugs (e.g. `ric_2_1(2)_dom_1`), not MongoDB ObjectIds.

### Coin schema (key fields)

```json
{
  "_id": "ric_2_1(2)_dom_1",
  "title": { "en": "Denarius of Domitian" },
  "authority": { "issuer": "domitian", "dynasty": "flavian" },
  "classification": { "denomination": "denarius", "material": "silver", "mint": "rome" },
  "coinage": { "date": { "from": 81, "to": 96 } },
  "reference": { "system": "RIC", "series": "2", "number": 1, "suffix": "(2)" },
  "references": [],
  "descriptions": {
    "obverse": { "legend": "...", "type": "...", "portrait": "..." },
    "reverse": { "legend": "...", "type": "...", "portrait": "..." }
  },
  "images": [
    {
      "index": 0,
      "layout": "split",
      "license": "CC BY-SA 4.0",
      "copyright_holder": "...",
      "files": { "obverse": "https://...", "reverse": "https://..." }
    }
  ],
  "subjects": ["victory", "eagle"]
}
```

BC years are stored as negative integers in `coinage.date.from` / `.to`.

### List / search coins

```http
GET /api/coins?issuer=domitian&era=imperial&material=silver&denomination=denarius&mint=rome&startYear=-100&endYear=200&limit=20&page=1&keyword=denarius
```

All query parameters are optional. BC years are negative integers. `era` accepts `imperial` or `republican`; omit it to search both catalogs.

Returns `{ results: [...], total, page, limit, pages }`.

### Get a single coin

```http
GET /api/coins/:id
```

`:id` is a string slug. Public endpoint. Returns the full coin document.

### Get random coins

```http
GET /api/coins/random?limit=6
```

Returns a random selection from the catalog.

Use `layout=split` to return only coins with a separate obverse image, suitable
for single-coin decorative displays:

```http
GET /api/coins/random?limit=3&layout=split
```

### Get filter options

```http
GET /api/coins/filter-options
```

Returns distinct values for issuer, material, period, and denomination — used
to populate the browse-page filter dropdowns. Rate-limited to 10 req/min per IP.

### Get date ranges

```http
GET /api/coins/date-ranges
```

Returns the min and max years present in the catalog.

### Create a coin (admin only)

```http
POST /api/coins
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Requires admin role. Accepts coin metadata plus optional obverse/reverse image files.

### Validate coin images (without persisting)

```http
POST /api/coins/validate-images
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Runs the full coin image validation pipeline (format, resolution, blur, brightness, AI coin detection) without storing anything. Returns `200 { valid: true }` on success or `400 { error, message }` with the specific rejection reason on failure.

Used by the add-coin flow to validate images *before* creating the collection entry, so an invalid image never leaves the user in an inconsistent state (coin added but images missing).

### Upload custom coin images

```http
POST /api/coins/entry/:entryId/images
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

`:entryId` is the collection entry `_id` (unique per coin per collection). Fields: `obverse` (file), `reverse` (file).

Images pass through the coin validation pipeline before being stored:
- Minimum **600×600 px**
- Laplacian blur score ≥ 20 (rejects motion blur; metallic surfaces are naturally smooth)
- Average brightness ≥ 20
- Google Vision AI coin-presence check — accepts ancient/archaeological labels; rejects modern currency; fails open if `GOOGLE_VISION_API_KEY` is not set

Processed via Sharp (WebP output, stripped EXIF, resized to 1200×1200 max). Stored in private Cloudflare R2; replaces any existing images for that entry.

### Get custom images metadata

```http
GET /api/coins/entry/:entryId/images
Authorization: Bearer <token>
```

Returns `{ obverseImage, reverseImage, updatedAt }` with proxy paths.

### Serve custom obverse image

```http
GET /api/coins/entry/:entryId/images/obverse
Authorization: Bearer <token>
```

Auth-gated proxy — streams the image from R2. Returns 404 if no custom image has been uploaded.

### Serve custom reverse image

```http
GET /api/coins/entry/:entryId/images/reverse
Authorization: Bearer <token>
```

### Delete custom images

```http
DELETE /api/coins/entry/:entryId/images
Authorization: Bearer <token>
```

Deletes both custom images from R2 and removes the `CoinCustomImage` record.

---

## Collections — `/api/collections`

### Create a collection

```http
POST /api/collections
Authorization: Bearer <token>
Content-Type: multipart/form-data

name=My Collection&description=...&isPublic=true
```

Optional `image` file field for the collection cover. The thumbnail passes through the thumbnail validation pipeline before being stored:
- Minimum **400×400 px**, max aspect ratio **3:1**
- Laplacian blur score ≥ 60, average brightness ≥ 25
- Google Vision **SafeSearch** — rejects adult, violent, or racy content (`POSSIBLE` or above)
- Google Vision **Label Detection** — rejects clearly incoherent content (food, pets, selfies, screenshots, logos, etc.); accepts numismatics-related imagery (coins, artefacts, ancient history, sculptures, museums, etc.)

Processed via Sharp (WebP, 800×600 cover crop). Stored in private Cloudflare R2.

### List my collections

```http
GET /api/collections
Authorization: Bearer <token>
```

### List public collections

```http
GET /api/collections/public?page=1&limit=20
```

No authentication required.

### Get collections by user

```http
GET /api/collections/user/:userId
```

Returns public collections for the given user. If authenticated as the owner,
private collections are also included.

### Get a collection

```http
GET /api/collections/:collectionId
```

Public collections are accessible without auth. Private collections require the
owner's session.

### Update a collection

```http
PUT /api/collections/:collectionId
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Accepts the same fields as `POST /api/collections`.

### Delete a collection

```http
DELETE /api/collections/:collectionId
Authorization: Bearer <token>
```

### Serve collection image

```http
GET /api/collections/:collectionId/image
```

Auth-gated proxy — streams the cover image from private Cloudflare R2. Public collections are served to anyone; private collections return 404 unless the requester is the owner (IDOR-safe).

### Add a coin to a collection

```http
POST /api/collections/:collectionId/coins
Authorization: Bearer <token>
Content-Type: application/json

{
  "coin": "<coinSlugId>",
  "weight": 3.2,
  "diameter": 19.5,
  "grade": "Very Fine",
  "axis": "6h",
  "thickness": 2.1,
  "shape": "Round",
  "patina": "Dark green",
  "rarity": "Scarce",
  "authenticityStatus": "Authentic",
  "acquisitionDate": "2026-05-24",
  "purchasePrice": { "amount": 120, "currency": "EUR" },
  "estimatedValue": { "amount": 180, "currency": "EUR" },
  "seller": "Dealer name",
  "auctionHouse": "Auction house",
  "lotNumber": "123",
  "invoiceReferenceNumber": "INV-001",
  "sourceType": "Auction",
  "provenance": "...",
  "storageLocation": "Tray A",
  "tags": "silver, augustus",
  "notes": "...",
  "conditionNotes": "...",
  "catalogReferences": { "other": "Private reference" }
}
```

`coin` is the string slug ID of the catalog coin (e.g. `ric_2_1(2)_dom_1`). All fields except `coin` are optional. Multiple collection entries can reference the same catalog coin, so duplicate specimens are supported.

### Duplicate, move, or copy a collection entry

```http
POST /api/collections/:collectionId/entries/:entryId/duplicate
POST /api/collections/:collectionId/entries/:entryId/transfer
Authorization: Bearer <token>
Content-Type: application/json

{ "targetCollectionId": "<collectionId>", "mode": "move" }
```

`mode` accepts `move` or `copy` for transfer.

### Import / export collections

```http
GET /api/collections/:collectionId/export?format=csv&includeStatistics=true
POST /api/collections/:collectionId/import/preview
POST /api/collections/:collectionId/import
Authorization: Bearer <token>
```

Import accepts parsed CSV/JSON content and can preview duplicate/validation issues before writing rows.

### Update coin metadata in a collection

```http
PUT /api/collections/:collectionId/coins/:coinId
Authorization: Bearer <token>
Content-Type: application/json

{
  "weight": 3.2,
  "diameter": 19.5,
  "grade": "Extremely Fine (EF)",
  "notes": "..."
}
```

All fields optional; only provided fields are updated.

### Remove a coin from a collection

```http
DELETE /api/collections/:collectionId/coins/:coinId
Authorization: Bearer <token>
```

---

## Wishlist — `/api/wishlist`

Wishlist endpoints require authentication. Catalog-backed entries can include `coinId`; the frontend uses it to route wanted coins back to `/coin-detail?id=<coinId>`.

### List wishlist entries

```http
GET /api/wishlist?status=Wanted
```

Optional filters: `status`, `collection`.

### Create wishlist entry

```http
POST /api/wishlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "coinId": "ric_1_aug_10",
  "name": "RIC I Augustus 10",
  "emperor": "augustus",
  "mint": "emerita",
  "material": "silver",
  "denomination": "denarius",
  "references": "RIC I 10",
  "status": "Wanted"
}
```

### Update or remove wishlist entry

```http
PUT /api/wishlist/:entryId
DELETE /api/wishlist/:entryId
POST /api/wishlist/:entryId/acquired
POST /api/wishlist/:entryId/convert
Authorization: Bearer <token>
```

`convert` requires `{ "collectionId": "...", "coinId": "..." }`, adds the wanted coin to the target collection, and marks the wishlist entry acquired.

---

## Users — `/api/users`

All user endpoints require authentication.

### Search users

```http
GET /api/users?search=username&page=1&limit=20
```

Returns paginated user list with `followStatus` (`none` | `pending` | `accepted`) and `isPrivate` per user. Max 50 per page. Never exposes email addresses.

### Recommended users

```http
GET /api/users/recommended
```

Returns up to 3 users the current user isn't following, ranked by follower count.

### Get user profile

```http
GET /api/users/:id/profile
```

Returns:
- `username`, `avatar`, `bio`, `createdAt`, `isPrivate`
- `followersCount`, `followingCount`, `coinsCount` (accepted follows only)
- `isFollowing` (bool), `followStatus` (`none` | `pending` | `accepted`)
- `hasPendingRequestFromThem` — `true` if the profile owner has sent *you* a pending follow request
- `pendingFollowRequestsCount` — only non-zero on your own profile

### Follow a user

```http
POST /api/users/:id/follow
```

If the target profile is **public**: creates an accepted follow + `new_follower` notification. Returns `{ followStatus: 'accepted' }`.

If the target profile is **private**: creates a pending follow request + `follow_request` notification. Returns `{ followStatus: 'pending' }`.

Returns `200` if a follow relationship already exists.

Also deletes the corresponding `new_follower`/`follow_request` notification if unfollowing immediately after.

### Unfollow a user

```http
DELETE /api/users/:id/unfollow
```

Removes the follow document and deletes the `new_follower` or `follow_request` notification that was created when following.

### Accept a follow request

```http
POST /api/users/:id/follow-request/accept
```

`:id` is the requester's user ID. Updates the pending follow to `accepted`, deletes the `follow_request` notification, and sends a `follow_accepted` notification to the requester.

### Decline a follow request

```http
POST /api/users/:id/follow-request/decline
```

`:id` is the requester's user ID. Deletes the pending follow document and the `follow_request` notification.

### List pending follow requests

```http
GET /api/users/:id/follow-requests?page=1&limit=20
```

`:id` must match the authenticated user (403 otherwise). Returns `{ requests: [<user>], pagination }`.

### Update privacy setting

```http
PUT /api/users/me/privacy
Content-Type: application/json

{ "isPrivate": true }
```

Switches the profile between public and private. Switching from private → public auto-accepts all pending follow requests.

### Request account data export

```http
POST /api/users/me/data-export
```

Requires auth. Creates an asynchronous GDPR-style account data export request,
builds a temporary ZIP archive, records a `data_export_requested` audit event,
and emails the user a secure download link when the archive is ready.

Requests are limited to once every 24 hours by default. Returns `202`:

```json
{
  "message": "Your data export request has been received. We will email you when the archive is ready.",
  "requestId": "uuid",
  "status": "pending",
  "expiresAt": "ISO date"
}
```

The ZIP includes structured account data such as `profile.json`, `coins.json`,
`collections.json`, `messages.json`, `comments.json`, `likes.json`,
`followers.json`, `support_requests.json`, uploaded image files when available,
and a `README.txt` explaining the archive.

### Download account data export

```http
GET /api/users/me/data-export/:requestId/download?token=<signed-token>
```

Downloads the prepared ZIP. The token is single-use and time-limited. Expired,
already-used, missing, or not-ready exports return `410`, `400`, `404`, or `409`
respectively. Successful downloads record a `data_export_downloaded` audit event.

### Followers list

```http
GET /api/users/:id/followers?page=1&limit=20
```

Returns `{ users: [...], pagination }`. Only includes `status: 'accepted'` follows.

### Following list

```http
GET /api/users/:id/following?page=1&limit=20
```

Returns `{ users: [...], pagination }`. Only includes `status: 'accepted'` follows.

### User activity

```http
GET /api/users/:id/activity
```

Returns recent follow events for the user (up to 10). On the frontend this is merged with collection creation events and only shown in full on the user's own profile.

### Create or get a direct-message chat

```http
GET /api/users/:id/chat
```

Returns `{ conversationId, user }`. Creates the conversation if it doesn't exist.

Returns `403` with `code: 'PRIVATE_PROFILE'` if the target profile is private and the caller is not an accepted follower.

---

## Notifications — `/api/notifications`

All notification endpoints require authentication.

### SSE stream

```http
GET /api/notifications/stream
```

Opens a Server-Sent Events stream. Each event is a JSON object:

```json
{ "notifications": 3, "messages": 1 }
```

The server sends initial counts immediately on connect, then pushes updates whenever the counts change. Only one connection per user is kept alive — opening a new one closes the previous one. A `: ping` comment is sent every 30 seconds as a keepalive.

On the frontend, the Navbar holds the single SSE connection and re-broadcasts each event to a `BroadcastChannel('numisroma:notifications')` so other pages (notifications list, profile) can react without opening competing streams.

### Get notifications

```http
GET /api/notifications?page=1&limit=20
```

Returns `{ notifications: [...], pagination }`. Each notification includes a populated `sender` (username, avatar) and, for `new_message` notifications, a populated `relatedConversation` (`{ _id }`).

Notification `type` values: `follow_request` | `follow_accepted` | `new_follower` | `new_message`.

### Get unread count

```http
GET /api/notifications/unread-count
```

Returns `{ count: <number> }`.

### Mark one as read

```http
PUT /api/notifications/:id/read
```

### Mark all as read

```http
PUT /api/notifications/read-all
```

---

## Messages — `/api/messages`

All message endpoints require authentication.

### Get conversations

```http
GET /api/messages/conversations?page=1&limit=30
```

Returns `{ conversations: [...], pagination: { page, limit, total, pages, hasMore } }`.
Each conversation includes populated `participants` and the last message preview.

### Get or create a 1:1 conversation

```http
GET /api/messages/conversations/:otherUserId
```

Returns the existing conversation between the current user and `:otherUserId`, or creates one if none exists. Returns the full conversation document with populated participants.

Returns `400` if `:otherUserId` is the current user, `404` if the user doesn't exist, `403` with `code: 'PRIVATE_PROFILE'` if the target profile is private and the caller is not an accepted follower.

### Search users to message

```http
GET /api/messages/search/users?query=<string>
```

Returns up to 10 users matching the query (username or full name). Query must be
≥ 2 and ≤ 100 characters. Returns a plain array — never exposes email addresses.

### Get messages in a conversation

```http
GET /api/messages/:conversationId
```

### Send a message

```http
POST /api/messages/:conversationId
Content-Type: application/json

{
  "content": "string (≤8000 chars — base64 ciphertext when encrypted)",
  "messageType": "text",
  "nonce": "base64 string (required when isEncrypted is true)",
  "isEncrypted": true
}
```

All messages are end-to-end encrypted on the frontend before sending. The server stores only ciphertext. `nonce` is the 24-byte XSalsa20 nonce encoded as base64. If `isEncrypted` is `true` and `nonce` is absent, the request returns `400`.

### Mark conversation as read

```http
PUT /api/messages/:conversationId/read
```

Marks all messages in the conversation as read for the current user.

### Get unread count

```http
GET /api/messages/unread-count
```

Returns `{ unreadCount: <number> }` — total unread messages across all conversations.

---

## E2EE key registry — `/api/users`

End-to-end encryption uses X25519 key agreement + XSalsa20-Poly1305 (TweetNaCl `box`).
The private key never leaves the client in plaintext — it is encrypted with PBKDF2-SHA256
(200 000 iterations) + AES-GCM-256 before being stored or transmitted.

### Register or update keypair (write-once for public key)

```http
PUT /api/users/me/e2ee-keys
Content-Type: application/json

{
  "publicKey": "base64 X25519 public key (32 bytes)",
  "encryptedPrivateKey": "JSON string { salt, iv, ct } — AES-GCM encrypted private key blob"
}
```

`publicKey` is **write-once**: if the user already has a public key registered, the field is not updated. This prevents silent key rotation that would make previously encrypted messages unreadable.

`encryptedPrivateKey` is always updated (e.g. when the user changes their password, the blob is re-encrypted and re-uploaded).

### Fetch own encrypted keypair (new-device restore)

```http
GET /api/users/me/e2ee-keys
```

Returns `{ publicKey, encryptedPrivateKey }`. The client decrypts the blob locally using the user's password to restore the private key on a new device — the server never sees the plaintext private key.

### Fetch another user's public key

```http
GET /api/users/:id/public-key
```

Returns `{ publicKey: "base64" | null }`. Used by the sender to encrypt a message for the recipient before sending.

---

## Sessions — `/api/sessions`

### List active sessions

```http
GET /api/sessions
Authorization: Bearer <token>
```

Returns `{ sessions: [...] }`. Each session uses a non-sensitive public `id` and
includes device name, browser, operating system, approximate location, IP
address, created time, last active time, current-session marker, and risk flags.

Session location is resolved only from local/self-hosted GeoIP database files.
User IP addresses are never sent to hosted geolocation APIs. If the request IP
is private/internal or no local record exists, the location is `Unknown location`.

### Terminate a specific session

```http
DELETE /api/sessions/:sessionId
Authorization: Bearer <token>
```

`:sessionId` is the public session identifier returned by `GET /api/sessions`,
not a database `_id` and not a refresh token. The current session cannot be
revoked through this endpoint; use logout for the current session.

### Terminate all other sessions

```http
DELETE /api/sessions
Authorization: Bearer <token>
```

Revokes every active session except the one represented by the current request.

---

## Health and observability

### Health check

```http
GET /health
```

Returns `{ status: "ok", timestamp }`. Used by load balancers and uptime monitors.

### Prometheus metrics

```http
GET /metrics
```

Returns metrics in Prometheus text format. In production, protect with the
`METRICS_API_KEY` env var — pass the key in the `X-Metrics-Api-Key` header from
non-localhost clients.

### CSRF token

```http
GET /api/csrf-token
```

---

## Contact — `/api/contact`

### Submit a contact form message

```http
POST /api/contact
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "subject": "string",
  "message": "string"
}
```

Rate-limited. No authentication required.

The submission is stored and a notification email is sent to the inbox
configured by `SUPPORT_EMAIL` (default `support@numisroma.com`), with the
visitor email as the reply-to address.

Returns `201` with the saved contact summary on success or `400` with
field validation details for an invalid request.

---

## Cache management — `/api/cache`

Admin-only endpoints for inspecting and invalidating the Redis/in-memory cache.

### Get cache stats

```http
GET /api/cache/stats
Authorization: Bearer <token> (admin)
```

### Invalidate cache by key pattern

```http
DELETE /api/cache/:pattern
Authorization: Bearer <token> (admin)
```

---

## Error format

All error responses follow this shape:

```json
{
  "error": "Short error code or message",
  "message": "Human-readable description"
}
```

Validation errors (400) include an `errors` array with per-field details.

---

## Rate limits

| Scope | Limit |
|-------|-------|
| General | 3,000 req / 15 min per IP |
| Auth routes | 20 req / 15 min per IP |
| Contact form | 5 req / hour per IP |
| Search (`GET /api/coins`) | 120 req / min per IP |
| Filter options | 120 req / min per IP |
