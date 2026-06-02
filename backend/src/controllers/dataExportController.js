const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const yazl = require('yazl');

const CoinCustomImage = require('../models/CoinCustomImage');
const Collection = require('../models/Collection');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const DataExportRequest = require('../models/DataExportRequest');
const Follow = require('../models/Follow');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const SessionAuditEvent = require('../models/SessionAuditEvent');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

const EXPORT_EXPIRY_DAYS = Number(process.env.DATA_EXPORT_EXPIRY_DAYS) || 7;
const EXPORT_RATE_LIMIT_HOURS = Number(process.env.DATA_EXPORT_RATE_LIMIT_HOURS) || 24;
const EXPORT_DIR = process.env.DATA_EXPORT_DIR || path.resolve(__dirname, '../private/data-exports');
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const makeToken = () => crypto.randomBytes(32).toString('base64url');

const normalizeId = (value) => String(value?._id || value);

const stripMongoInternals = (doc) => {
  if (!doc || typeof doc !== 'object') return doc;
  if (doc instanceof Date) return doc.toISOString();
  if (doc.constructor?.name === 'ObjectId') return String(doc);
  if (Array.isArray(doc)) return doc.map(stripMongoInternals);
  if (Buffer.isBuffer(doc)) return undefined;

  const out = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === '__v') continue;
    if (key === '_id') {
      out.id = String(value);
      continue;
    }
    const cleaned = stripMongoInternals(value);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
};

const addJson = (zip, name, value) => {
  zip.addBuffer(Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'), name);
};

const addText = (zip, name, value) => {
  zip.addBuffer(Buffer.from(value, 'utf8'), name);
};

const addBufferImage = (zip, name, buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return false;
  zip.addBuffer(buffer, name);
  return true;
};

const publicUploadPathToDiskPath = (publicPath) => {
  if (!publicPath || typeof publicPath !== 'string') return null;
  if (!publicPath.startsWith('/uploads/')) return null;
  return path.resolve(__dirname, '..', publicPath.replace(/^\//, ''));
};

const addLocalUploadIfAvailable = async (zip, archivePath, publicPath) => {
  const diskPath = publicUploadPathToDiskPath(publicPath);
  if (!diskPath) return false;
  try {
    await fsp.access(diskPath, fs.constants.R_OK);
    zip.addFile(diskPath, archivePath);
    return true;
  } catch {
    return false;
  }
};

const collectionImageMetadata = (collection) => ({
  collectionId: String(collection._id),
  image: collection.image || null,
  imageKey: collection.imageKey || null,
  imageContentType: collection.imageContentType || null,
  includedInArchive: Boolean(collection.imageData)
});

const customImageMetadata = (image) => ({
  collectionEntryId: String(image.collectionEntryId),
  obverseImage: image.obverseImage || null,
  obverseImageKey: image.obverseImageKey || null,
  obverseImageContentType: image.obverseImageContentType || null,
  obverseIncludedInArchive: Boolean(image.obverseImageData),
  reverseImage: image.reverseImage || null,
  reverseImageKey: image.reverseImageKey || null,
  reverseImageContentType: image.reverseImageContentType || null,
  reverseIncludedInArchive: Boolean(image.reverseImageData),
  createdAt: image.createdAt,
  updatedAt: image.updatedAt
});

const buildArchivePayload = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const [
    collections,
    customImages,
    following,
    followers,
    notifications,
    conversations,
    supportRequests,
    auditEvents
  ] = await Promise.all([
    Collection.find({ user: userId }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
    CoinCustomImage.find({ userId }).sort({ updatedAt: -1 }).lean(),
    Follow.find({ follower: userId }).populate('following', 'username fullName avatar isPrivate').lean(),
    Follow.find({ following: userId }).populate('follower', 'username fullName avatar isPrivate').lean(),
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).lean(),
    Conversation.find({ participants: userId }).populate('participants', 'username fullName avatar').sort({ lastActivity: -1 }).lean(),
    Contact.find({ email: user.email }).sort({ createdAt: -1 }).lean(),
    SessionAuditEvent.find({ userId }).sort({ createdAt: -1 }).lean()
  ]);

  const conversationIds = conversations.map(conversation => conversation._id);
  const messages = conversationIds.length
    ? await Message.find({ conversation: { $in: conversationIds }, isDeleted: false })
      .sort({ createdAt: 1 })
      .lean()
    : [];

  const flatCoins = collections.flatMap(collection => (collection.coins || []).map(entry => ({
    ...stripMongoInternals(entry),
    collectionId: String(collection._id),
    collectionName: collection.name
  })));

  return {
    user,
    collections,
    customImages,
    following,
    followers,
    notifications,
    conversations,
    messages,
    supportRequests,
    auditEvents,
    flatCoins
  };
};

const buildReadme = (request, payload) => [
  'NumisRoma Data Export',
  '=====================',
  '',
  `Generated at: ${new Date().toISOString()}`,
  `Request ID: ${request.publicId}`,
  `Expires at: ${request.expiresAt.toISOString()}`,
  '',
  'This archive contains a structured copy of the personal data currently stored in NumisRoma for this account.',
  '',
  'Files:',
  '- profile.json: account profile fields, preferences, notifications, and security audit event metadata.',
  '- coins.json: saved coin entries from your collections, including references, provenance, measurements, and image metadata.',
  '- collections.json: collections/folders and their saved coin entries.',
  '- messages.json: conversations and private messages stored by NumisRoma. Encrypted messages remain encrypted.',
  '- comments.json: comments made by the user. NumisRoma does not currently store comments, so this is an empty list.',
  '- likes.json: likes made by the user. NumisRoma does not currently store likes, so this is an empty list.',
  '- followers.json: followers and following lists.',
  '- support_requests.json: support/contact requests associated with your account email.',
  '- images/: uploaded images available from NumisRoma local storage. Remote/S3 image URLs and keys are included as metadata.',
  '',
  'Security notes:',
  '- Password hashes, access tokens, refresh tokens, and raw session identifiers are never included.',
  '- Download links are single-use and time-limited.',
  '- If you did not request this export, change your password and revoke unfamiliar sessions.',
  '',
  `Summary: ${payload.collections.length} collection(s), ${payload.flatCoins.length} coin entry/entries, ${payload.messages.length} message(s).`,
  ''
].join('\n');

const writeZip = async (request, payload, outputPath) => {
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });

  const zip = new yazl.ZipFile();
  const output = fs.createWriteStream(outputPath, { flags: 'wx', mode: 0o600 });
  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    zip.outputStream.on('error', reject);
  });

  zip.outputStream.pipe(output);

  addJson(zip, 'profile.json', {
    generatedAt: new Date().toISOString(),
    account: {
      id: String(payload.user._id),
      username: payload.user.username,
      email: payload.user.email,
      fullName: payload.user.fullName || null,
      location: payload.user.location || null,
      avatar: payload.user.avatar || null,
      bio: payload.user.bio || null,
      role: payload.user.role,
      isPrivate: Boolean(payload.user.isPrivate),
      hasPassword: Boolean(payload.user.password),
      oauthProviders: (payload.user.oauthProviders || []).map(({ provider }) => ({ provider })),
      createdAt: payload.user.createdAt,
      updatedAt: payload.user.updatedAt,
      lastActive: payload.user.lastActive || null
    },
    preferences: {
      isPrivate: Boolean(payload.user.isPrivate)
    },
    notifications: stripMongoInternals(payload.notifications),
    securityAuditEvents: stripMongoInternals(payload.auditEvents)
  });

  addJson(zip, 'coins.json', {
    generatedAt: new Date().toISOString(),
    coins: payload.flatCoins,
    images: payload.customImages.map(customImageMetadata)
  });

  addJson(zip, 'collections.json', {
    generatedAt: new Date().toISOString(),
    collections: payload.collections.map(collection => ({
      ...stripMongoInternals(collection),
      user: normalizeId(collection.user),
      imageData: undefined,
      imageMetadata: collectionImageMetadata(collection)
    }))
  });

  addJson(zip, 'messages.json', {
    generatedAt: new Date().toISOString(),
    conversations: stripMongoInternals(payload.conversations),
    messages: stripMongoInternals(payload.messages)
  });

  addJson(zip, 'comments.json', {
    generatedAt: new Date().toISOString(),
    comments: [],
    note: 'NumisRoma does not currently store user comments.'
  });

  addJson(zip, 'likes.json', {
    generatedAt: new Date().toISOString(),
    likes: [],
    note: 'NumisRoma does not currently store user likes.'
  });

  addJson(zip, 'followers.json', {
    generatedAt: new Date().toISOString(),
    followers: stripMongoInternals(payload.followers),
    following: stripMongoInternals(payload.following)
  });

  addJson(zip, 'support_requests.json', {
    generatedAt: new Date().toISOString(),
    supportRequests: stripMongoInternals(payload.supportRequests)
  });

  addText(zip, 'README.txt', buildReadme(request, payload));

  await addLocalUploadIfAvailable(zip, `images/profile/avatar${path.extname(payload.user.avatar || '.webp')}`, payload.user.avatar);

  for (const collection of payload.collections) {
    const collectionId = String(collection._id);
    if (!addBufferImage(zip, `images/collections/${collectionId}.webp`, collection.imageData)) {
      await addLocalUploadIfAvailable(zip, `images/collections/${collectionId}${path.extname(collection.image || '.webp')}`, collection.image);
    }
  }

  for (const image of payload.customImages) {
    const entryId = String(image.collectionEntryId);
    if (!addBufferImage(zip, `images/coins/${entryId}-obverse.webp`, image.obverseImageData)) {
      await addLocalUploadIfAvailable(zip, `images/coins/${entryId}-obverse${path.extname(image.obverseImage || '.webp')}`, image.obverseImage);
    }
    if (!addBufferImage(zip, `images/coins/${entryId}-reverse.webp`, image.reverseImageData)) {
      await addLocalUploadIfAvailable(zip, `images/coins/${entryId}-reverse${path.extname(image.reverseImage || '.webp')}`, image.reverseImage);
    }
  }

  zip.end();
  await done;
};

const runExportJob = async (requestId, downloadToken) => {
  const request = await DataExportRequest.findById(requestId);
  if (!request || request.status !== 'pending') return;

  request.status = 'processing';
  request.startedAt = new Date();
  await request.save();

  try {
    const payload = await buildArchivePayload(request.user);
    if (!payload) throw new Error('User not found');

    const filename = `numisroma-data-export-${request.publicId}.zip`;
    const outputPath = path.join(EXPORT_DIR, filename);
    await writeZip(request, payload, outputPath);

    const stats = await fsp.stat(outputPath);
    request.status = 'ready';
    request.filePath = outputPath;
    request.fileSize = stats.size;
    request.completedAt = new Date();
    await request.save();

    const downloadUrl = `${API_PUBLIC_URL}/api/users/me/data-export/${request.publicId}/download?token=${downloadToken}`;
    await emailService.sendDataExportReadyEmail({
      to: payload.user.email,
      username: payload.user.username,
      downloadUrl,
      expiresAt: request.expiresAt,
      fileSize: request.fileSize
    });

    logger.info('User data export archive ready', {
      userId: String(request.user),
      requestId: request.publicId,
      fileSize: request.fileSize
    });
  } catch (error) {
    request.status = 'failed';
    request.failedAt = new Date();
    request.failureReason = error.message;
    await request.save();
    logger.error('User data export archive failed', {
      userId: String(request.user),
      requestId: request.publicId,
      error: error.message
    });
  }
};

const queueExportJob = (requestId, downloadToken) => {
  setImmediate(() => {
    runExportJob(requestId, downloadToken).catch(error => {
      logger.error('Data export worker crashed', { requestId: String(requestId), error: error.message });
    });
  });
};

exports.requestDataExport = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('email username').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const since = new Date(Date.now() - EXPORT_RATE_LIMIT_HOURS * 60 * 60 * 1000);
    const recent = await DataExportRequest.findOne({
      user: req.user.userId,
      requestedAt: { $gte: since },
      status: { $in: ['pending', 'processing', 'ready'] }
    }).sort({ requestedAt: -1 }).lean();

    if (recent) {
      return res.status(429).json({
        message: `You can request a data export once every ${EXPORT_RATE_LIMIT_HOURS} hours.`,
        requestId: recent.publicId,
        status: recent.status
      });
    }

    const token = makeToken();
    const request = await DataExportRequest.create({
      user: req.user.userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      requestIp: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    await SessionAuditEvent.create({
      userId: req.user.userId,
      eventType: 'data_export_requested',
      severity: 'info',
      ipAddress: request.requestIp,
      userAgent: request.userAgent,
      details: {
        dataExportRequestId: request.publicId,
        expiresAt: request.expiresAt
      }
    });

    queueExportJob(request._id, token);

    return res.status(202).json({
      message: 'Your data export request has been received. We will email you when the archive is ready.',
      requestId: request.publicId,
      status: request.status,
      expiresAt: request.expiresAt
    });
  } catch (error) {
    logger.error('Failed to request user data export', {
      userId: req.user?.userId,
      error: error.message
    });
    return res.status(500).json({ message: 'Unable to request your data export right now. Please try again.' });
  }
};

exports.downloadDataExport = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Missing download token' });
    }

    const request = await DataExportRequest.findOne({ publicId: requestId });
    if (!request || request.tokenHash !== hashToken(token)) {
      return res.status(404).json({ message: 'Export not found' });
    }
    if (request.downloadedAt) {
      return res.status(410).json({ message: 'This download link has already been used.' });
    }
    if (request.expiresAt <= new Date()) {
      request.status = 'expired';
      await request.save();
      return res.status(410).json({ message: 'This download link has expired.' });
    }
    if (request.status !== 'ready' || !request.filePath) {
      return res.status(409).json({ message: 'Export is not ready yet.' });
    }

    await fsp.access(request.filePath, fs.constants.R_OK);
    request.downloadedAt = new Date();
    await request.save();

    await SessionAuditEvent.create({
      userId: request.user,
      eventType: 'data_export_downloaded',
      severity: 'info',
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      details: {
        dataExportRequestId: request.publicId
      }
    });

    res.download(request.filePath, `numisroma-data-export-${request.publicId}.zip`);
  } catch (error) {
    logger.error('Failed to download user data export', {
      requestId: req.params?.requestId,
      error: error.message
    });
    return res.status(500).json({ message: 'Unable to download this export.' });
  }
};

exports.cleanupExpiredDataExports = async () => {
  const expired = await DataExportRequest.find({
    expiresAt: { $lte: new Date() },
    status: { $ne: 'expired' }
  });

  for (const request of expired) {
    try {
      if (request.filePath) {
        await fsp.rm(request.filePath, { force: true });
      }
      request.status = 'expired';
      await request.save();
    } catch (error) {
      logger.warn('Failed to cleanup expired data export', {
        requestId: request.publicId,
        error: error.message
      });
    }
  }
};

exports.scheduleDataExportCleanup = () => {
  exports.cleanupExpiredDataExports().catch(error => {
    logger.warn('Initial data export cleanup failed', { error: error.message });
  });

  const interval = setInterval(() => {
    exports.cleanupExpiredDataExports().catch(error => {
      logger.warn('Scheduled data export cleanup failed', { error: error.message });
    });
  }, 60 * 60 * 1000);
  interval.unref();
  return interval;
};
