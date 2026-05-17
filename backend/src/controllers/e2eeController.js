/**
 * E2EE Key Management Controller — Signal Protocol
 *
 * The server stores only PUBLIC key material (identity keys, signed pre-keys,
 * one-time pre-keys). Private keys are generated on the client and never leave
 * the device — they live in IndexedDB only.
 */
const DeviceIdentity = require('../models/DeviceIdentity');
const PreKeyBundle = require('../models/PreKeyBundle');
const logger = require('../utils/logger');

// Validate base64-encoded key of expected byte length
function isValidB64Key(s, expectedBytes) {
  if (typeof s !== 'string') return false;
  // b64 length for N bytes = ceil(N/3)*4
  const expectedLen = Math.ceil(expectedBytes / 3) * 4;
  if (s.length !== expectedLen) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(s);
}

// ── DeviceIdentity ────────────────────────────────────────────────────────────

// POST /api/e2ee/identity — register or rotate device identity
const registerIdentity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { identityPublicKey, identityDhPublicKey, signedPreKey, oneTimePreKeys } = req.body;

    if (!isValidB64Key(identityPublicKey, 32)) {
      return res.status(400).json({ message: 'Invalid identityPublicKey' });
    }
    if (!isValidB64Key(identityDhPublicKey, 32)) {
      return res.status(400).json({ message: 'Invalid identityDhPublicKey' });
    }
    if (!signedPreKey || !isValidB64Key(signedPreKey.publicKey, 32)) {
      return res.status(400).json({ message: 'Invalid signedPreKey.publicKey' });
    }
    if (!isValidB64Key(signedPreKey.signature, 64)) {
      return res.status(400).json({ message: 'Invalid signedPreKey.signature' });
    }
    if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length < 1) {
      return res.status(400).json({ message: 'At least one oneTimePreKey required' });
    }
    for (const k of oneTimePreKeys) {
      if (!isValidB64Key(k.publicKey, 32) || typeof k.keyId !== 'number') {
        return res.status(400).json({ message: 'Invalid oneTimePreKey entry' });
      }
    }

    const existing = await DeviceIdentity.findOne({ userId });
    const keyVersion = existing
      ? (existing.identityPublicKey !== identityPublicKey ? existing.keyVersion + 1 : existing.keyVersion)
      : 1;

    await DeviceIdentity.findOneAndUpdate(
      { userId },
      {
        userId,
        identityPublicKey,
        identityDhPublicKey,
        keyVersion,
        registeredAt: existing ? existing.registeredAt : new Date(),
      },
      { upsert: true, new: true }
    );

    await PreKeyBundle.findOneAndUpdate(
      { userId },
      {
        userId,
        identityDhPublicKey,
        signedPreKey: {
          keyId: signedPreKey.keyId ?? 1,
          publicKey: signedPreKey.publicKey,
          signature: signedPreKey.signature,
          createdAt: new Date(),
        },
        oneTimePreKeys: oneTimePreKeys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey, used: false })),
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true, keyVersion });
  } catch (err) {
    logger.error('registerIdentity error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/e2ee/identity/me — fetch own encrypted key bundle (new-device restore)
const getMyIdentity = async (req, res) => {
  try {
    const identity = await DeviceIdentity.findOne({ userId: req.user.userId }).lean();
    if (!identity) return res.json({ registered: false });
    res.json({
      registered: true,
      identityPublicKey: identity.identityPublicKey,
      identityDhPublicKey: identity.identityDhPublicKey,
      keyVersion: identity.keyVersion,
    });
  } catch (err) {
    logger.error('getMyIdentity error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/e2ee/identity/:userId — fetch another user's identity public key (for safety numbers)
const getIdentity = async (req, res) => {
  try {
    const identity = await DeviceIdentity.findOne({ userId: req.params.userId })
      .select('identityPublicKey identityDhPublicKey keyVersion')
      .lean();
    if (!identity) return res.status(404).json({ message: 'User has no identity key registered' });
    res.json({
      identityPublicKey: identity.identityPublicKey,
      identityDhPublicKey: identity.identityDhPublicKey,
      keyVersion: identity.keyVersion,
    });
  } catch (err) {
    logger.error('getIdentity error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PreKeyBundle ──────────────────────────────────────────────────────────────

// GET /api/e2ee/pre-keys/:userId — fetch pre-key bundle (consumes one OTPK atomically)
const getPreKeyBundle = async (req, res) => {
  try {
    const { userId } = req.params;

    const identity = await DeviceIdentity.findOne({ userId })
      .select('identityPublicKey identityDhPublicKey keyVersion')
      .lean();
    if (!identity) return res.status(404).json({ message: 'User has no registered keys' });

    // Atomically find-and-mark one unused OTPK
    const bundleDoc = await PreKeyBundle.findOne({ userId, 'oneTimePreKeys.used': false });
    let otpk = null;
    if (bundleDoc) {
      const available = bundleDoc.oneTimePreKeys.find(k => !k.used);
      if (available) {
        available.used = true;
        available.usedAt = new Date();
        await bundleDoc.save();
        otpk = { keyId: available.keyId, publicKey: available.publicKey };
      }
    }

    const bundle = await PreKeyBundle.findOne({ userId })
      .select('identityDhPublicKey signedPreKey')
      .lean();
    if (!bundle) return res.status(404).json({ message: 'No pre-key bundle registered' });

    // Count remaining OTPKs and signal if replenishment needed
    const remainingOtpks = bundleDoc
      ? bundleDoc.oneTimePreKeys.filter(k => !k.used).length - (otpk ? 1 : 0)
      : 0;

    res.set('X-OTPK-Remaining', String(remainingOtpks));
    res.json({
      identityPublicKey: identity.identityPublicKey,
      identityDhPublicKey: bundle.identityDhPublicKey,
      signedPreKey: bundle.signedPreKey,
      oneTimePreKey: otpk, // null if exhausted — X3DH still works, less secure
      keyVersion: identity.keyVersion,
    });
  } catch (err) {
    logger.error('getPreKeyBundle error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/e2ee/pre-keys/replenish — upload more OTPKs
const replenishPreKeys = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oneTimePreKeys } = req.body;

    if (!Array.isArray(oneTimePreKeys) || oneTimePreKeys.length === 0 || oneTimePreKeys.length > 200) {
      return res.status(400).json({ message: 'oneTimePreKeys must be array of 1–200 keys' });
    }
    for (const k of oneTimePreKeys) {
      if (!isValidB64Key(k.publicKey, 32) || typeof k.keyId !== 'number') {
        return res.status(400).json({ message: 'Invalid OTPK entry' });
      }
    }

    const bundle = await PreKeyBundle.findOne({ userId });
    if (!bundle) return res.status(404).json({ message: 'No pre-key bundle — register identity first' });

    const newKeys = oneTimePreKeys.map(k => ({ keyId: k.keyId, publicKey: k.publicKey, used: false }));
    bundle.oneTimePreKeys.push(...newKeys);
    await bundle.save();

    const available = bundle.oneTimePreKeys.filter(k => !k.used).length;
    res.json({ ok: true, otpkCount: available });
  } catch (err) {
    logger.error('replenishPreKeys error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/e2ee/pre-keys/count — how many OTPKs remain for own bundle
const getOTPKCount = async (req, res) => {
  try {
    const bundle = await PreKeyBundle.findOne({ userId: req.user.userId })
      .select('oneTimePreKeys.used')
      .lean();
    if (!bundle) return res.json({ count: 0 });
    const count = bundle.oneTimePreKeys.filter(k => !k.used).length;
    res.json({ count });
  } catch (err) {
    logger.error('getOTPKCount error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/e2ee/identity/signed-pre-key — rotate signed pre-key (every 7 days)
const rotateSignedPreKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { signedPreKey } = req.body;

    if (!signedPreKey || !isValidB64Key(signedPreKey.publicKey, 32) || !isValidB64Key(signedPreKey.signature, 64)) {
      return res.status(400).json({ message: 'Invalid signedPreKey' });
    }

    const bundle = await PreKeyBundle.findOne({ userId });
    if (!bundle) return res.status(404).json({ message: 'No pre-key bundle found' });

    bundle.signedPreKey = {
      keyId: (signedPreKey.keyId ?? bundle.signedPreKey.keyId + 1),
      publicKey: signedPreKey.publicKey,
      signature: signedPreKey.signature,
      createdAt: new Date(),
    };
    await bundle.save();

    res.json({ ok: true });
  } catch (err) {
    logger.error('rotateSignedPreKey error', { error: err.message });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerIdentity,
  getMyIdentity,
  getIdentity,
  getPreKeyBundle,
  replenishPreKeys,
  getOTPKCount,
  rotateSignedPreKey,
};
