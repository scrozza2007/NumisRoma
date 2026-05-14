# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
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
