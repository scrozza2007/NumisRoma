/**
 * NumisRoma E2EE — Signal Protocol (X3DH + Double Ratchet)
 *
 * Crypto primitives — all from the audited @noble suite, no custom crypto:
 *   X25519              ECDH for X3DH DH steps and ratchet
 *   Ed25519             identity key signing / SPK signature
 *   HMAC-SHA-256        KDF_CK (chain key ratchet), per Signal spec
 *   HKDF-SHA-256        KDF_RK (root key ratchet) and X3DH master secret
 *   XChaCha20-Poly1305  AEAD per-message encryption
 *   BLAKE2b             safety numbers
 *   Argon2id            password-based private key wrapping
 *
 * Storage model (no plaintext ever leaves the device):
 *   IndexedDB / "keys"     — identity bundle (private keys, wrapped server copy)
 *   IndexedDB / "ratchet"  — per-conversation Double Ratchet state
 *   IndexedDB / "messages" — decrypted plaintext, keyed by message ID
 *
 * The "messages" store is the source of truth for the UI. Messages are
 * decrypted exactly once on receipt and written there. The server stores only
 * opaque ciphertext and is never consulted for plaintext again.
 */

import { x25519, ed25519 } from '@noble/curves/ed25519';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { blake2b } from '@noble/hashes/blake2b';
import { argon2id } from 'hash-wasm';

// ── Encoding ─────────────────────────────────────────────────────────────────

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);

export function bytesToB64(bytes) {
  // chunk to avoid call-stack overflow on large arrays
  let bin = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────

const DB_NAME = 'numisroma_e2ee';
const DB_VER = 4; // bumped to wipe stale ratchet sessions

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db      = e.target.result;
      const oldVer  = e.oldVersion;
      if (!db.objectStoreNames.contains('keys'))     db.createObjectStore('keys',     { keyPath: 'id' });
      if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' });
      // v3: ratchet format changed. v4: wipe stale sessions from broken X3DH.
      // Always clear ratchet on upgrade so sessions re-establish cleanly.
      if (oldVer < 4 && db.objectStoreNames.contains('ratchet')) {
        db.deleteObjectStore('ratchet');
      }
      if (!db.objectStoreNames.contains('ratchet'))  db.createObjectStore('ratchet',  { keyPath: 'id' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(store, id, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put({ id, value });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

async function idbDelete(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Local message plaintext store ─────────────────────────────────────────────
// Each entry: { id: msgId, value: { plaintext, senderId, conversationId, createdAt } }

export async function storeMessagePlaintext(msgId, plaintext, senderId, conversationId, createdAt) {
  await idbPut('messages', msgId, { plaintext, senderId, conversationId, createdAt });
}

export async function getMessagePlaintext(msgId) {
  const entry = await idbGet('messages', msgId);
  return entry ? entry.plaintext : null;
}

export async function hasMessagePlaintext(msgId) {
  return (await idbGet('messages', msgId)) !== null;
}

// ── Argon2id password-based key derivation ────────────────────────────────────

const ARGON2_TIME        = 3;
const ARGON2_MEM         = 65536; // 64 MiB
const ARGON2_PARALLELISM = 1;
const ARGON2_OUT_LEN     = 32;

async function deriveWrappingKey(password, salt) {
  const keyBytes = await argon2id({
    password,
    salt,
    iterations:   ARGON2_TIME,
    memorySize:   ARGON2_MEM,
    parallelism:  ARGON2_PARALLELISM,
    hashLength:   ARGON2_OUT_LEN,
    outputType:   'binary',
  });
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function wrapKeyBundle(plainBytes, password) {
  const salt = randomBytes(16);
  const iv   = randomBytes(12);
  const wk   = await deriveWrappingKey(password, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wk, plainBytes);
  return JSON.stringify({
    alg:  'argon2id-aes256gcm',
    salt: bytesToB64(salt),
    iv:   bytesToB64(iv),
    ct:   bytesToB64(new Uint8Array(ct)),
  });
}

async function unwrapKeyBundle(blob, password) {
  const { salt, iv, ct } = JSON.parse(blob);
  const wk = await deriveWrappingKey(password, b64ToBytes(salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(iv) },
    wk,
    b64ToBytes(ct),
  );
  return new Uint8Array(plain);
}

// ── Key generation ────────────────────────────────────────────────────────────

export function generateX25519Keypair() {
  const priv = x25519.utils.randomPrivateKey();
  return { priv, pub: x25519.getPublicKey(priv) };
}

export function generateEd25519Keypair() {
  const priv = ed25519.utils.randomPrivateKey();
  return { priv, pub: ed25519.getPublicKey(priv) };
}

// ── Identity bundle ───────────────────────────────────────────────────────────

const BUNDLE_IDB_KEY = 'identity_bundle_v2';

/**
 * Generate a complete identity bundle (first login on any device).
 * Writes to IDB and returns { publicBundle, encryptedKeyBundle, identityPublicKey }.
 */
export async function generateIdentityBundle(password) {
  const ikSign = generateEd25519Keypair();
  const ikDh   = generateX25519Keypair();

  const spkId = 1;
  const spk   = generateX25519Keypair();
  const spkSig = ed25519.sign(spk.pub, ikSign.priv);

  const otpks = [];
  for (let i = 0; i < 100; i++) {
    const kp = generateX25519Keypair();
    otpks.push({ keyId: i + 1, pub: kp.pub, priv: kp.priv });
  }

  // Private key material — encrypted for server backup
  const km = JSON.stringify({
    ikSignPriv: bytesToB64(ikSign.priv),
    ikDhPriv:   bytesToB64(ikDh.priv),
    spkPriv:    bytesToB64(spk.priv),
    spkId,
    otpkPrivs:  otpks.map(k => ({ keyId: k.keyId, priv: bytesToB64(k.priv) })),
  });

  const encryptedKeyBundle = await wrapKeyBundle(enc(km), password);

  await idbPut('keys', BUNDLE_IDB_KEY, {
    ikSignPriv:         bytesToB64(ikSign.priv),
    ikSignPub:          bytesToB64(ikSign.pub),
    ikDhPriv:           bytesToB64(ikDh.priv),
    ikDhPub:            bytesToB64(ikDh.pub),
    spkPriv:            bytesToB64(spk.priv),
    spkPub:             bytesToB64(spk.pub),
    spkSig:             bytesToB64(spkSig),
    spkId,
    otpks:              otpks.map(k => ({ keyId: k.keyId, priv: bytesToB64(k.priv), pub: bytesToB64(k.pub) })),
    encryptedKeyBundle,
  });

  return {
    publicBundle: {
      identityPublicKey:    bytesToB64(ikSign.pub),
      identityDhPublicKey:  bytesToB64(ikDh.pub),
      signedPreKey: {
        keyId:     spkId,
        publicKey: bytesToB64(spk.pub),
        signature: bytesToB64(spkSig),
      },
      oneTimePreKeys: otpks.map(k => ({ keyId: k.keyId, publicKey: bytesToB64(k.pub) })),
    },
    encryptedKeyBundle,
    identityPublicKey: bytesToB64(ikSign.pub),
  };
}

/**
 * Restore bundle from IDB (same device) or from server blob + password (new device).
 */
export async function restoreIdentityBundle(password, serverBlob) {
  const stored = await idbGet('keys', BUNDLE_IDB_KEY);
  if (stored) return stored; // raw b64 strings — callers access fields directly

  if (!serverBlob || !password) return null;

  try {
    const plain = await unwrapKeyBundle(serverBlob, password);
    const km    = JSON.parse(dec(plain));

    const ikSignPriv = b64ToBytes(km.ikSignPriv);
    const ikDhPriv   = b64ToBytes(km.ikDhPriv);
    const spkPriv    = b64ToBytes(km.spkPriv);

    const bundle = {
      ikSignPriv:         km.ikSignPriv,
      ikSignPub:          bytesToB64(ed25519.getPublicKey(ikSignPriv)),
      ikDhPriv:           km.ikDhPriv,
      ikDhPub:            bytesToB64(x25519.getPublicKey(ikDhPriv)),
      spkPriv:            km.spkPriv,
      spkPub:             bytesToB64(x25519.getPublicKey(spkPriv)),
      spkId:              km.spkId,
      // spkSig not stored in the server blob — will be missing on new-device restore
      // (acceptable: the sig is only needed for outgoing registration, not decryption)
      otpks:              km.otpkPrivs.map(k => ({
        keyId: k.keyId,
        priv:  k.priv,
        pub:   bytesToB64(x25519.getPublicKey(b64ToBytes(k.priv))),
      })),
      encryptedKeyBundle: serverBlob,
    };

    await idbPut('keys', BUNDLE_IDB_KEY, bundle);
    return bundle;
  } catch {
    return null;
  }
}

export async function getIdentityBundle() {
  return idbGet('keys', BUNDLE_IDB_KEY);
}

export async function hasStoredBundle() {
  return (await idbGet('keys', BUNDLE_IDB_KEY)) !== null;
}

export async function clearStoredBundle() {
  await idbDelete('keys', BUNDLE_IDB_KEY);
}

export async function relockBundle(oldPassword, newPassword) {
  const stored = await idbGet('keys', BUNDLE_IDB_KEY);
  if (!stored) throw new Error('No stored bundle');
  const plain  = await unwrapKeyBundle(stored.encryptedKeyBundle, oldPassword);
  const newBlob = await wrapKeyBundle(plain, newPassword);
  stored.encryptedKeyBundle = newBlob;
  await idbPut('keys', BUNDLE_IDB_KEY, stored);
  return newBlob;
}

export async function replenishOTPKs(count = 50) {
  const stored = await idbGet('keys', BUNDLE_IDB_KEY);
  if (!stored) throw new Error('No identity bundle');
  const maxId = stored.otpks.reduce((m, k) => Math.max(m, k.keyId), 0);
  const newKeys = [];
  for (let i = 0; i < count; i++) {
    const kp = generateX25519Keypair();
    newKeys.push({ keyId: maxId + i + 1, priv: bytesToB64(kp.priv), pub: bytesToB64(kp.pub) });
  }
  stored.otpks = [...stored.otpks, ...newKeys];
  await idbPut('keys', BUNDLE_IDB_KEY, stored);
  return newKeys.map(k => ({ keyId: k.keyId, publicKey: k.pub }));
}

// ── Signal KDF helpers ────────────────────────────────────────────────────────
//
// KDF_RK  — HKDF-SHA-256, used for root key / chain key derivation
// KDF_CK  — HMAC-SHA-256, per Signal spec (NOT HKDF — common mistake)
//            chain_key  = HMAC-SHA256(ck, 0x02)
//            message_key_material = HMAC-SHA256(ck, 0x01)  → 80 bytes (key + nonce)

const INFO_X3DH  = enc('NumisRoma-X3DH-v2');
const INFO_ROOT  = enc('NumisRoma-RootKey-v2');

function kdfRK(rk, dhOut) {
  // HKDF-SHA-256(IKM=dhOut, salt=rk, info=INFO_ROOT, len=64)
  const out = hkdf(sha256, dhOut, rk, INFO_ROOT, 64);
  return { newRK: out.slice(0, 32), chainKey: out.slice(32, 64) };
}

function kdfCK(ck) {
  // HMAC-SHA-256 with chain key as the mac key — per Signal Double Ratchet spec
  const newCK  = hmac(sha256, ck, new Uint8Array([0x02]));
  const mkMat  = hmac(sha256, ck, new Uint8Array([0x01])); // 32 bytes
  // Derive nonce separately so message key and nonce are independent
  const nonce  = hmac(sha256, ck, new Uint8Array([0x03])).slice(0, 24); // 24 bytes for XChaCha20
  return { newCK, mk: mkMat, nonce };
}

// ── X3DH ─────────────────────────────────────────────────────────────────────

/**
 * X3DH initiator (Alice sends first message to Bob).
 * Verifies Bob's SPK signature before performing DH.
 */
export function x3dhInitiate(myBundle, theirBundle) {
  const ikPub  = b64ToBytes(theirBundle.identityPublicKey);
  const spkPub = b64ToBytes(theirBundle.signedPreKey.publicKey);
  const spkSig = b64ToBytes(theirBundle.signedPreKey.signature);

  if (!ed25519.verify(spkSig, spkPub, ikPub)) {
    throw new Error('X3DH: SPK signature verification failed');
  }

  const ikDhPub = b64ToBytes(theirBundle.identityDhPublicKey);
  const ek      = generateX25519Keypair();

  const myIkDhPriv = b64ToBytes(myBundle.ikDhPriv);

  const dh1 = x25519.getSharedSecret(myIkDhPriv, spkPub);
  const dh2 = x25519.getSharedSecret(ek.priv,    ikDhPub);
  const dh3 = x25519.getSharedSecret(ek.priv,    spkPub);

  const parts = [dh1, dh2, dh3];

  let otpkId = null;
  if (theirBundle.oneTimePreKey) {
    const otpkPub = b64ToBytes(theirBundle.oneTimePreKey.publicKey);
    parts.push(x25519.getSharedSecret(ek.priv, otpkPub));
    otpkId = theirBundle.oneTimePreKey.keyId;
  }

  const ikm = _concat(...parts);
  const sharedSecret = hkdf(sha256, ikm, new Uint8Array(32), INFO_X3DH, 32);

  return { sharedSecret, ephemeralPubKey: bytesToB64(ek.pub), usedOtpkId: otpkId };
}

/**
 * X3DH responder (Bob receives Alice's first message).
 */
export async function x3dhRespond(myBundle, x3dhHeader) {
  const senderIkDhPub = b64ToBytes(x3dhHeader.senderIkDhPub);
  const ephemeralPub  = b64ToBytes(x3dhHeader.ephemeralPubKey);

  const myIkDhPriv = b64ToBytes(myBundle.ikDhPriv);
  const mySpkPriv  = b64ToBytes(myBundle.spkPriv);

  const dh1 = x25519.getSharedSecret(mySpkPriv,  senderIkDhPub);
  const dh2 = x25519.getSharedSecret(myIkDhPriv, ephemeralPub);
  const dh3 = x25519.getSharedSecret(mySpkPriv,  ephemeralPub);

  const parts = [dh1, dh2, dh3];

  if (x3dhHeader.otpkId != null) {
    const otpk = myBundle.otpks.find(k => k.keyId === x3dhHeader.otpkId);
    if (!otpk) throw new Error('X3DH: OTPK not found — already consumed');
    parts.push(x25519.getSharedSecret(b64ToBytes(otpk.priv), ephemeralPub));
    await _removeOTPK(x3dhHeader.otpkId);
  }

  const ikm = _concat(...parts);
  return hkdf(sha256, ikm, new Uint8Array(32), INFO_X3DH, 32);
}

async function _removeOTPK(keyId) {
  const stored = await idbGet('keys', BUNDLE_IDB_KEY);
  if (!stored) return;
  stored.otpks = stored.otpks.filter(k => k.keyId !== keyId);
  await idbPut('keys', BUNDLE_IDB_KEY, stored);
}

function _concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out   = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── Double Ratchet ────────────────────────────────────────────────────────────

const MAX_SKIP = 1000;

/**
 * Init as sender (Alice) — called right after x3dhInitiate.
 * theirRatchetPub = Bob's SPK public key (b64 string).
 */
export function ratchetInitSender(sharedSecret, theirRatchetPub) {
  const dhRatchet = generateX25519Keypair();
  const theirPub  = b64ToBytes(theirRatchetPub);
  const dhOut     = x25519.getSharedSecret(dhRatchet.priv, theirPub);
  const { newRK, chainKey } = kdfRK(sharedSecret, dhOut);

  return {
    DHs: { priv: bytesToB64(dhRatchet.priv), pub: bytesToB64(dhRatchet.pub) },
    DHr: theirRatchetPub,        // b64 string
    RK:  bytesToB64(newRK),
    CKs: bytesToB64(chainKey),
    CKr: null,
    Ns:  0, Nr: 0, PN: 0,
    MKSkipped: {},
  };
}

/**
 * Init as receiver (Bob) — called right after x3dhRespond.
 * mySpkPriv / mySpkPub are b64 strings (from IDB bundle).
 */
export function ratchetInitReceiver(sharedSecret, mySpkPrivB64, mySpkPubB64) {
  return {
    DHs: { priv: mySpkPrivB64, pub: mySpkPubB64 },
    DHr: null,
    RK:  bytesToB64(sharedSecret),
    CKs: null,
    CKr: null,
    Ns:  0, Nr: 0, PN: 0,
    MKSkipped: {},
  };
}

/**
 * Encrypt plaintext, advance send chain, return { header, ciphertext }.
 * Mutates state in place — caller must persist with saveRatchetState.
 */
export function ratchetEncrypt(state, plaintext) {
  const { newCK, mk, nonce } = kdfCK(b64ToBytes(state.CKs));
  state.CKs = bytesToB64(newCK);

  const header = {
    dh_pub: state.DHs.pub,  // b64 — stable ordering guaranteed (object literal)
    n:      state.Ns,
    pn:     state.PN,
  };
  state.Ns += 1;

  // AD = canonical byte encoding of header fields in fixed order
  const ad = _headerAD(header);
  const ct = xchacha20poly1305(mk, nonce, ad).encrypt(enc(plaintext));

  mk.fill(0);
  nonce.fill(0);

  return { header, ciphertext: bytesToB64(ct) };
}

/**
 * Decrypt ciphertext, advance receive chain, return plaintext string.
 * Throws on authentication failure. Mutates state — caller must persist.
 */
export function ratchetDecrypt(state, header, ciphertextB64) {
  // 1. Check skipped message keys
  const skipKey = `${header.dh_pub}:${header.n}`;
  if (state.MKSkipped[skipKey]) {
    const { mk, nonce } = state.MKSkipped[skipKey];
    delete state.MKSkipped[skipKey];
    return _decrypt(b64ToBytes(mk), b64ToBytes(nonce), ciphertextB64, header);
  }

  // 2. DH ratchet step if sender ratchet key changed
  if (header.dh_pub !== state.DHr) {
    _skipMessageKeys(state, header.pn);
    _dhRatchetStep(state, header.dh_pub);
  }

  // 3. Advance receive chain to message index
  _skipMessageKeys(state, header.n);

  const { newCK, mk, nonce } = kdfCK(b64ToBytes(state.CKr));
  state.CKr = bytesToB64(newCK);
  state.Nr  += 1;

  const plaintext = _decrypt(mk, nonce, ciphertextB64, header);
  mk.fill(0);
  nonce.fill(0);
  return plaintext;
}

function _skipMessageKeys(state, until) {
  if (!state.CKr || state.Nr >= until) return;
  if (until - state.Nr > MAX_SKIP) throw new Error('Ratchet: too many skipped messages');
  while (state.Nr < until) {
    const { newCK, mk, nonce } = kdfCK(b64ToBytes(state.CKr));
    state.MKSkipped[`${state.DHr}:${state.Nr}`] = { mk: bytesToB64(mk), nonce: bytesToB64(nonce) };
    state.CKr = bytesToB64(newCK);
    state.Nr  += 1;
  }
}

function _dhRatchetStep(state, theirNewPubB64) {
  state.PN  = state.Ns;
  state.Ns  = 0;
  state.Nr  = 0;
  state.DHr = theirNewPubB64;

  const theirPub = b64ToBytes(theirNewPubB64);

  // Receive chain from current DHs + their new pub
  const dhOut1 = x25519.getSharedSecret(b64ToBytes(state.DHs.priv), theirPub);
  const { newRK: rk1, chainKey: ckr } = kdfRK(b64ToBytes(state.RK), dhOut1);

  // Generate new send keypair
  const newDH = generateX25519Keypair();
  state.DHs = { priv: bytesToB64(newDH.priv), pub: bytesToB64(newDH.pub) };

  // Send chain from new DHs + their new pub
  const dhOut2 = x25519.getSharedSecret(newDH.priv, theirPub);
  const { newRK: rk2, chainKey: cks } = kdfRK(rk1, dhOut2);

  state.RK  = bytesToB64(rk2);
  state.CKr = bytesToB64(ckr);
  state.CKs = bytesToB64(cks);
}

function _headerAD(header) {
  // Canonical, stable AD: fixed-order concatenation of header fields as bytes.
  // Using JSON.stringify is not safe (key order not guaranteed cross-engine).
  const dhPubBytes = b64ToBytes(header.dh_pub);
  const ad = new Uint8Array(dhPubBytes.length + 8);
  ad.set(dhPubBytes, 0);
  const view = new DataView(ad.buffer);
  view.setUint32(dhPubBytes.length,     header.n,  false);
  view.setUint32(dhPubBytes.length + 4, header.pn, false);
  return ad;
}

function _decrypt(mk, nonce, ciphertextB64, header) {
  const ad = _headerAD(header);
  const ct = b64ToBytes(ciphertextB64);
  try {
    return dec(xchacha20poly1305(mk, nonce, ad).decrypt(ct));
  } catch {
    throw new Error('Ratchet: AEAD authentication failed — wrong key or tampered ciphertext');
  }
}

// ── Ratchet state persistence ─────────────────────────────────────────────────

export async function saveRatchetState(conversationId, state) {
  await idbPut('ratchet', `session:${conversationId}`, state);
}

export async function loadRatchetState(conversationId) {
  return idbGet('ratchet', `session:${conversationId}`);
}

export async function deleteRatchetState(conversationId) {
  await idbDelete('ratchet', `session:${conversationId}`);
}

// ── High-level encrypt / decrypt ──────────────────────────────────────────────

/**
 * Encrypt a plaintext message for a conversation.
 *
 * On first message to a recipient: runs X3DH, stores the x3dh header in the
 * payload so the recipient can derive the same shared secret.
 *
 * Returns { encryptedPayload: string }.
 */
export async function encryptMessage(conversationId, plaintext, theirUserId, fetchPreKeyBundle) {
  let state = await loadRatchetState(conversationId);
  let x3dhHeader = null;

  if (!state) {
    const bundle = await getIdentityBundle();
    if (!bundle) throw new Error('Identity bundle not initialised');

    const theirBundle = await fetchPreKeyBundle(theirUserId);
    if (!theirBundle?.signedPreKey?.publicKey) throw new Error('Recipient has no pre-key bundle');

    const { sharedSecret, ephemeralPubKey, usedOtpkId } = x3dhInitiate(
      { ikDhPriv: bundle.ikDhPriv },
      theirBundle,
    );

    state = ratchetInitSender(sharedSecret, theirBundle.signedPreKey.publicKey);

    x3dhHeader = {
      senderIkDhPub: bundle.ikDhPub,
      ephemeralPubKey,
      otpkId:        usedOtpkId,
      spkId:         theirBundle.signedPreKey.keyId,
    };
  }

  const { header, ciphertext } = ratchetEncrypt(state, plaintext);
  await saveRatchetState(conversationId, state);

  return {
    encryptedPayload: JSON.stringify({
      v:      2,
      header,
      ciphertext,
      ...(x3dhHeader ? { x3dh: x3dhHeader } : {}),
    }),
  };
}

/**
 * Decrypt an incoming message.
 *
 * Idempotent: if plaintext is already in the IDB messages store it is returned
 * immediately without touching the ratchet state.
 *
 * Returns plaintext string or null on unrecoverable failure.
 */
export async function decryptMessage(msgId, conversationId, encryptedPayload) {
  // Fast path — already decrypted and stored
  const cached = await getMessagePlaintext(msgId);
  if (cached !== null) return cached;

  try {
    const payload = JSON.parse(encryptedPayload);
    if (payload.v !== 2) return null;

    let state = await loadRatchetState(conversationId);

    // If the message carries an X3DH header, the sender started a brand-new session.
    // Discard any stale ratchet state and re-derive from the X3DH header.
    // This is the correct Signal Protocol behavior for session reset.
    if (payload.x3dh) {
      if (state) await deleteRatchetState(conversationId);
      state = null;
    }

    if (!state) {
      if (!payload.x3dh) return null; // no session and no X3DH header → can't recover

      const bundle = await getIdentityBundle();
      if (!bundle) return null;

      const sharedSecret = await x3dhRespond(
        { ikDhPriv: bundle.ikDhPriv, spkPriv: bundle.spkPriv, otpks: bundle.otpks },
        payload.x3dh,
      );

      state = ratchetInitReceiver(sharedSecret, bundle.spkPriv, bundle.spkPub);
    }

    const plaintext = ratchetDecrypt(state, payload.header, payload.ciphertext);
    await saveRatchetState(conversationId, state);

    return plaintext;
  } catch (err) {
    console.warn('decryptMessage failed:', err.message);
    return null;
  }
}

// ── Safety numbers ────────────────────────────────────────────────────────────

export function computeSafetyNumber(myIKPubB64, theirIKPubB64) {
  const sorted = [myIKPubB64, theirIKPubB64].sort();
  const input  = _concat(b64ToBytes(sorted[0]), b64ToBytes(sorted[1]));
  const hash   = blake2b(input, { dkLen: 30 });
  const groups = [];
  for (let i = 0; i < 5; i++) {
    const chunk = hash.slice(i * 6, (i + 1) * 6);
    let val = BigInt(0);
    for (const byte of chunk) val = (val << 8n) | BigInt(byte);
    groups.push(String(val % 1000000n).padStart(6, '0'));
  }
  return groups.join(' ');
}
