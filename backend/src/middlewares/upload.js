const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { validateImage, isValidImageFormat } = require('../utils/imageValidator');
const { isS3Enabled, uploadToS3, deleteFromS3, buildKey } = require('../utils/s3Storage');

// Local disk directories — only used when S3/R2 is not configured.
const uploadsDir = path.join(__dirname, '../uploads');
const collectionsDir = path.join(uploadsDir, 'collections');
const coinsDir = path.join(uploadsDir, 'coins');

if (!isS3Enabled()) {
  fs.mkdirSync(collectionsDir, { recursive: true });
  fs.mkdirSync(coinsDir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('File format not supported. Use JPEG, PNG or WebP.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// ─── Persist ──────────────────────────────────────────────────────────────────
// Returns { path, key } — S3 URL + key when R2 is configured, local path otherwise.

const persistImage = async (buffer, subdir, filename) => {
  if (isS3Enabled()) {
    const key = buildKey(subdir, filename);
    const url = await uploadToS3(buffer, key, 'image/webp');
    return { path: url, key };
  }

  const dir = subdir === 'collections' ? collectionsDir : coinsDir;
  const filepath = path.join(dir, filename);
  await sharp(buffer).toFile(filepath);
  return { path: `/uploads/${subdir}/${filename}`, key: null };
};

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteImage = async (imagePath) => {
  if (!imagePath) return;
  try {
    if (isS3Enabled() || imagePath.startsWith('https://')) {
      await deleteFromS3(imagePath);
      return;
    }
    const filename = path.basename(imagePath);
    const subdir = imagePath.includes('/coins/') ? coinsDir : collectionsDir;
    const fullPath = path.join(subdir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (error) {
    logger.error('Error deleting image', { error: error.message, imagePath });
  }
};

// ─── respond400 ───────────────────────────────────────────────────────────────

const respond400 = (res, message) =>
  res.status(400).json({ error: 'Image validation failed', message });

// ─── processCollectionImage ───────────────────────────────────────────────────
// upload_type = 'thumbnail' (relaxed rules, no AI check)

const processCollectionImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    // 1. Magic bytes
    if (!isValidImageFormat(req.file.buffer)) {
      return respond400(res, 'File format not supported. Use JPEG, PNG or WebP.');
    }

    // 2. Quality + format validation (thumbnail rules)
    const validation = await validateImage(req.file.buffer, 'thumbnail');
    if (!validation.valid) return respond400(res, validation.error);

    // 3. Re-encode via sharp (strips EXIF, sanitises, resizes)
    const filename = `collection_${uuidv4()}.webp`;
    const processed = await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    if (processed.info.size > 10 * 1024 * 1024) {
      return respond400(res, 'Processed image exceeds the 10MB size limit.');
    }

    const { path: publicPath, key: imageKey } = await persistImage(processed.data, 'collections', filename);

    req.uploadedImage = {
      filename,
      path: publicPath,
      key: imageKey,
      buffer: isS3Enabled() ? null : processed.data,
      contentType: 'image/webp'
    };

    next();
  } catch (error) {
    logger.error('Error processing collection image', { error: error.message });
    res.status(500).json({ error: 'Error processing image', message: 'Error processing image' });
  }
};

// ─── processCoinImage ─────────────────────────────────────────────────────────
// Strict rules + AI coin detection for each side (obverse / reverse).

const processCoinImage = async (req, res, next) => {
  try {
    const processedImages = {};

    if (req.files) {
      for (const side of ['obverse', 'reverse']) {
        const file = req.files[side]?.[0];
        if (!file) continue;

        // 1. Magic bytes
        if (!isValidImageFormat(file.buffer)) {
          return respond400(res, 'File format not supported. Use JPEG, PNG or WebP.');
        }

        // 2. Quality + AI validation (coin rules)
        const validation = await validateImage(file.buffer, 'coin');
        if (!validation.valid) return respond400(res, validation.error);

        // 3. Re-encode via sharp (strips EXIF, sanitises, resizes)
        const filename = `coin_${side}_${uuidv4()}.webp`;
        const processed = await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: false })
          .webp({ quality: 90 })
          .toBuffer({ resolveWithObject: true });

        const { path: publicPath, key: imageKey } = await persistImage(processed.data, 'coins', filename);

        processedImages[side] = {
          filename,
          path: publicPath,
          key: imageKey,
          buffer: isS3Enabled() ? null : processed.data,
          contentType: 'image/webp'
        };
      }
    }

    req.processedImages = processedImages;
    next();
  } catch (error) {
    logger.error('Error processing coin images', { error: error.message });
    res.status(500).json({ error: 'Error processing images', message: 'Error processing images' });
  }
};

module.exports = {
  upload: upload.single('image'),
  uploadFields: upload.fields([
    { name: 'obverse', maxCount: 1 },
    { name: 'reverse', maxCount: 1 }
  ]),
  processCollectionImage,
  processCoinImage,
  deleteImage
};
