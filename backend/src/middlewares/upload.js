const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { isS3Enabled, uploadToS3, deleteFromS3, buildKey } = require('../utils/s3Storage');

// Local disk directories — only used when S3 is not configured.
const uploadsDir = path.join(__dirname, '../uploads');
const collectionsDir = path.join(uploadsDir, 'collections');
const coinsDir = path.join(uploadsDir, 'coins');

if (!isS3Enabled()) {
  fs.mkdirSync(collectionsDir, { recursive: true });
  fs.mkdirSync(coinsDir, { recursive: true });
}

const storage = multer.memoryStorage();

// Validate image magic numbers to prevent MIME-type spoofing.
const validateImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 12) return false;

  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG
  const PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  if (PNG.every((b, i) => buffer[i] === b)) return true;
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  // WebP (RIFF + WEBP at offset 8)
  if ([0x52, 0x49, 0x46, 0x46].every((b, i) => buffer[i] === b) &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  return false;
};

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Persist a processed image buffer — to S3/R2 when configured, local disk otherwise.
// Returns { path, key } where path is the URL/local-path and key is the S3 object key (null for local).
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

// Middleware to process a single collection image.
const processCollectionImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    if (!validateImageBuffer(req.file.buffer)) {
      return res.status(400).json({
        error: 'Invalid image file',
        message: 'File appears to be corrupted or not a valid image format'
      });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `collection_${timestamp}_${randomString}.webp`;

    const processed = await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'cover', position: 'center' })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });

    const metadata = await sharp(processed.data).metadata();
    if (metadata.width > 5000 || metadata.height > 5000) {
      return res.status(400).json({
        error: 'Image dimensions too large',
        message: 'Processed image exceeds maximum dimensions of 5000x5000px'
      });
    }
    if (processed.info.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Processed image too large',
        message: 'Image file size exceeds 10MB after processing'
      });
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
    logger.error('Error processing image', { error: error.message });
    res.status(500).json({ error: 'Error processing image', message: 'Error processing image', msg: 'Error processing image' });
  }
};

// Delete an image — S3 key/URL or local path, determined automatically.
const deleteImage = async (imagePath) => {
  if (!imagePath) return;

  try {
    if (isS3Enabled() || imagePath.startsWith('https://')) {
      await deleteFromS3(imagePath);
      return;
    }
    // Local path: strip leading /uploads/collections/ to get the filename.
    const filename = path.basename(imagePath);
    const subdir = imagePath.includes('/coins/') ? coinsDir : collectionsDir;
    const fullPath = path.join(subdir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (error) {
    logger.error('Error deleting image', { error: error.message, imagePath });
  }
};

// Middleware to process coin obverse/reverse images.
const processCoinImage = async (req, res, next) => {
  try {
    const processedImages = {};

    if (req.files) {
      for (const side of ['obverse', 'reverse']) {
        const file = req.files[side] && req.files[side][0];
        if (!file) continue;

        if (!validateImageBuffer(file.buffer)) {
          return res.status(400).json({
            error: `Invalid ${side} image file`,
            message: `${side} image appears to be corrupted or not a valid image format`
          });
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `coin_${side}_${timestamp}_${randomString}.webp`;

        const processed = await sharp(file.buffer)
          .resize(600, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .webp({ quality: 90 })
          .toBuffer({ resolveWithObject: true });

        const metadata = await sharp(processed.data).metadata();
        if (metadata.width > 5000 || metadata.height > 5000) {
          return res.status(400).json({
            error: `${side} image dimensions too large`,
            message: 'Processed image exceeds maximum dimensions of 5000x5000px'
          });
        }

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
    res.status(500).json({ error: 'Error processing images', message: 'Error processing images', msg: 'Error processing images' });
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
