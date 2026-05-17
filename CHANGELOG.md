# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **New coin schema** — `Coin` model migrated to string-slug `_id` (e.g. `ric_2_1(2)_dom_1`) with structured fields: `title.en`, `authority.{issuer,dynasty}`, `classification.{denomination,material,mint}`, `coinage.date.{from,to}`, `reference` / `references[]`, `descriptions.{obverse,reverse}`, `images[]`, `subjects[]`.
- **Multi-specimen gallery** — `coin-detail` and `collection-coin-detail` pages now show a unified gallery: large main viewer with obverse+reverse side-by-side (split layout) or full-width (unified layout), horizontal filmstrip thumbnails, and prev/next nav arrows.
- **Full-screen zoom modal** — warm-palette full-screen viewer with zoom in/out/reset buttons, scroll-wheel zoom, drag-to-pan, and per-specimen navigation. Replaces the old basic zoom overlay.
- **Sand background hard-forced** — all coin image containers use `backgroundColor: '#f5ede0'` directly on both wrapper and `<img>` elements to eliminate white letterboxing on transparent PNGs.
- **Custom-image specimen** — in `collection-coin-detail`, user-uploaded images are prepended as a "Your Image" specimen in the gallery filmstrip alongside catalog specimens.
- **`fmt()` text helper** — replaces underscores with spaces and title-cases all coin metadata fields displayed in the UI.
- **`validateObjectId` `allowString` option** — `enhancedValidation.js` accepts `{ allowString: true }` to pass string slug IDs through route-level validation without requiring a MongoDB ObjectId format.

### Changed
- **`Collection.coins[].coin`** — type changed from `ObjectId` to `String` to hold coin slug IDs.
- **Add-coin route validation** — `POST /api/collections/:id/coins` body `coin` field now validated as a non-empty string (≤200 chars) instead of `isMongoId()`.
- **Collection populate selects** — all `populate` calls updated to use new Coin schema field paths (`title`, `authority.issuer`, `authority.dynasty`, `classification.*`, `coinage.date`, `images`).
- **`addCoinToCollection`** — response now includes the populated coin document (chained `.populate()` on `findOneAndUpdate`).
- **`GET /api/coins/:id`** — route now uses `validateObjectId('id', { allowString: true })` to accept string slug IDs.
- **Browse card images** — switched from `next/image` to plain `<img>` with `style={{ backgroundColor: '#f5ede0' }}` for reliable background color.
- **`fetchCollections` in `coin-detail`** — correctly destructures `{ collections }` from the paginated response instead of assigning the entire response object.
- **Weight/diameter submission** — `handleAddToCollection` converts string input values to `parseFloat` before sending to the API (backend requires numeric types).

### Fixed
- **Add to Collection broken** — three compounding bugs fixed: `fetchCollections` setting the wrong value (whole paginated object vs array), `isMongoId()` rejecting slug IDs, and weight/diameter sent as strings instead of numbers.
- **Obverse/Reverse labels removed** — `<span>` overlays inside the gallery split-view and zoom modal were removed.

---

### Added (E2EE — previous entry)
- **End-to-end encrypted messaging** — Signal Protocol (X3DH + Double Ratchet) replaces all previous messaging encryption. The server stores only opaque ciphertext and has no access to plaintext at any point.
- **X3DH key exchange** — initial session establishment using Extended Triple Diffie-Hellman; identity keys, signed pre-keys, and one-time pre-keys uploaded to the server as public material only.
- **Double Ratchet** — per-message forward secrecy; chain keys ratcheted via HMAC-SHA-256 (KDF_CK); root key ratcheted via HKDF-SHA-256 (KDF_RK) on every DH step.
- **XChaCha20-Poly1305** — authenticated encryption for every message payload.
- **Argon2id key backup** — private key bundle encrypted with Argon2id + AES-GCM-256 under the user's password and stored server-side; enables new-device restore without ever transmitting plaintext keys.
- **Safety numbers** — BLAKE2b fingerprint of sorted identity public keys for out-of-band verification.
- **OTPK replenishment** — automatic one-time pre-key top-up when supply drops below 20; runs once per session.
- **Decrypt-once architecture** — incoming messages are decrypted exactly once on receipt and cached in IndexedDB by message ID; the server is never queried for plaintext again.
- **E2EE key management API** — new `/api/e2ee/` routes: identity registration, pre-key bundle fetch (atomically consumes one OTPK), OTPK replenishment, OTPK count, signed pre-key rotation.
- **Coin placeholder image** — `public/images/coin-placeholder.svg` as a clean fallback for missing coin images.
- **Conversation unread dot** — amber dot on unread conversations; clears on open.
- **Profile link from chat header** — contact name and avatar link to their profile page.
- **Notification → conversation redirect** — clicking a `new_message` notification opens the messages page with the conversation pre-selected.

### Changed
- **Private keys** — stored exclusively in IndexedDB; never written to `localStorage`, `sessionStorage`, or sent to the server in plaintext.
- **Message model** — `nonce`, `ratchetCounter`, `prevChainLength` fields removed; `encryptedPayload` is the sole E2EE field.
- **Message max length** — 8 000 characters for plaintext fallback; 12 000 characters for encrypted payload.
- **`GET /api/messages/conversations`** — `lastMessage` projection includes `encryptedPayload` for sidebar state.
- **`GET /api/notifications`** — response includes populated `relatedConversation: { _id }` for `new_message` notifications.
- **Notifications system** — `Notification` model, controller, and routes (`GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`, `GET /api/notifications/stream`).
- **Server-Sent Events (SSE)** — real-time push for notification and message counts; single connection per user; `BroadcastChannel('numisroma:notifications')` fans out to other open tabs.
- **Private profiles** — `User.isPrivate` field; private profiles hide collections from non-followers; `PUT /api/users/me/privacy` toggles the setting.
- **Follow request flow** — `Follow.status` (`pending` | `accepted`); following a private account sends a `follow_request` notification.
- **Multi-tab session handling** — logging into a different account in another tab immediately redirects the displaced tab to `/login`.
- **Message polling intervals** — reduced to 20 s (messages) and 30 s (conversations); pauses when tab is hidden.
- **General rate limit** — raised to 300 requests per 15-minute window.

### Fixed
- **429 rate limit storm** — polling loops back off for 60 s on a `429`; SSE reconnects with exponential backoff (2 s → 30 s max).
- **Private profile messaging gate** — `GET /api/messages/conversations/:otherUserId` returns `403 PRIVATE_PROFILE` if target is private and caller is not an accepted follower.
- **Stale conversation 403** — `fetchMessages` now clears the selected conversation and refreshes the list on a 403, preventing infinite polling loops against deleted conversations.
- **Bell badge not clearing after accept/decline** — backend calls `pushCountsToUser` immediately after follow request actions.
- **Follower/following counts** — only `status: 'accepted'` documents counted; pending requests excluded.
- **Direct messaging conversation creation** — replaced `findOneAndUpdate` upsert (which caused a MongoDB path collision error) with explicit `findOne` → `create`.
