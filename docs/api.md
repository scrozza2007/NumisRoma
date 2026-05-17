# API Reference

All API endpoints are served from `http://localhost:4000` in development (or `https://$DOMAIN/api` in production via Caddy).

**Base path:** `/api`

---

## Authentication

NumisRoma uses JWT access tokens stored in httpOnly cookies. Most mutating endpoints
also require a CSRF token.

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

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string (3–20 chars, alphanumeric + _)",
  "email": "string (valid email)",
  "password": "string (≥8 chars, upper + digit + special)"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "username or email",
  "password": "string"
}
```

Sets `accessToken` httpOnly cookie on success. Returns `{ token, user }`.

### Login with refresh token

```http
POST /api/auth/login-refresh
Content-Type: application/json

{
  "identifier": "username or email",
  "password": "string"
}
```

Returns both an access token (cookie) and a `refreshToken` string in the body.

### Refresh access token

```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "string" }
```

### Logout

```http
POST /api/auth/logout
```

Clears the auth cookie.

### Revoke a specific refresh token

```http
POST /api/auth/revoke-refresh
Content-Type: application/json

{ "refreshToken": "string" }
```

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

Returns `{ valid: true, user: { ... } }` when the session is active.

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

The coin catalog is read-only for regular users. Admins can create entries.

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
GET /api/coins?issuer=domitian&material=silver&denomination=denarius&mint=rome&startYear=-100&endYear=200&limit=20&page=1&search=denarius
```

All query parameters are optional. BC years are negative integers.

Returns `{ coins: [...], total, page, pages }`.

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

### Get filter options

```http
GET /api/coins/filter-options
```

Returns distinct values for emperor, material, period, and denomination — used
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

### Upload custom coin images

```http
POST /api/coins/:id/custom-images
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Uploads per-user custom obverse/reverse images for a catalog coin. Images are
processed by sharp and stored in the database.

### Get custom images metadata

```http
GET /api/coins/:id/custom-images
Authorization: Bearer <token>
```

### Serve custom obverse image

```http
GET /api/coins/:id/custom-images/obverse
Authorization: Bearer <token>
```

Returns the raw image bytes with `Content-Type` and ETag headers.

### Serve custom reverse image

```http
GET /api/coins/:id/custom-images/reverse
Authorization: Bearer <token>
```

### Delete custom images

```http
DELETE /api/coins/:id/custom-images
Authorization: Bearer <token>
```

---

## Collections — `/api/collections`

### Create a collection

```http
POST /api/collections
Authorization: Bearer <token>
Content-Type: multipart/form-data

name=My Collection&description=...&isPublic=true
```

Optional `image` file field for the collection cover.

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

Returns the collection cover image. Private collection images require owner auth.

### Add a coin to a collection

```http
POST /api/collections/:collectionId/coins
Authorization: Bearer <token>
Content-Type: application/json

{
  "coin": "<coinSlugId>",
  "weight": 3.2,
  "diameter": 19.5,
  "grade": "Very Fine (VF)",
  "notes": "..."
}
```

`coin` is the string slug ID of the catalog coin (e.g. `ric_2_1(2)_dom_1`). All fields except `coin` are optional.

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

### Terminate a specific session

```http
DELETE /api/sessions/:sessionId
Authorization: Bearer <token>
```

### Terminate all other sessions

```http
DELETE /api/sessions
Authorization: Bearer <token>
```

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
| General | 100 req / 15 min per IP |
| Auth routes | 20 req / 15 min per IP |
| Contact form | 5 req / hour per IP |
| Search (`GET /api/coins`) | 30 req / min per IP |
| Filter options | 10 req / min per IP |
