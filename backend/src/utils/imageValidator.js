const sharp = require('sharp');
const https = require('https');
const { UPLOAD } = require('../config/constants');
const logger = require('./logger');

// ─── Error messages ───────────────────────────────────────────────────────────

const ERRORS = {
  FORMAT:        'Unsupported file type. Please upload a JPEG, PNG, or WebP image.',
  BLURRY_COIN:   'The coin photo looks blurry. Try placing the coin on a flat surface and holding the camera steady.',
  BLURRY_THUMB:  'The cover image looks blurry. Please upload a sharper photo.',
  DARK_COIN:     'The coin photo is too dark. Photograph near a window or under a lamp for better results.',
  DARK_THUMB:    'The cover image is too dark. Please use a brighter, well-lit photo.',
  RES_COIN:      `Image resolution is too low (minimum ${UPLOAD.COIN.MIN_WIDTH}×${UPLOAD.COIN.MIN_HEIGHT}px). Use a closer shot or a higher-resolution camera.`,
  RES_THUMB:     `Cover image resolution is too low (minimum ${UPLOAD.THUMBNAIL.MIN_WIDTH}×${UPLOAD.THUMBNAIL.MIN_HEIGHT}px). Please upload a larger image.`,
  ASPECT_THUMB:  'Cover image proportions are too extreme. Please use a roughly square or landscape photo (no panoramas or tall portraits).',
  NO_COIN:       'No coin detected in the photo. Make sure the coin fills most of the frame against a plain background.',
  MODERN_COIN:   'This looks like a modern coin. NumisRoma only accepts ancient coin photos.',
  NSFW:          'This image contains inappropriate content and cannot be uploaded.',
  INCOHERENT:    'This image does not appear to be related to numismatics or ancient history. Please upload a relevant cover photo (e.g. coins, artefacts, archaeological sites, historical scenes).',
  SIZE:          'File is too large. Please upload an image under 15 MB.',
  VISION_DOWN:   'Our image verification service is temporarily unavailable. Please try again in a moment.',
};

// ─── Laplacian variance (blur detection) ─────────────────────────────────────
// Converts to greyscale, applies a 3x3 Laplacian kernel via convolution,
// then computes the variance of the result. A low variance means the image
// is smooth / blurry; high variance means edges are sharp.

const computeBlurScore = async (buffer) => {
  // Extract raw greyscale pixels at a capped size to keep memory bounded.
  const { data, info } = await sharp(buffer)
    .greyscale()
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = new Float32Array(data);

  // 3×3 Laplacian kernel
  const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
  const laplacian = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += pixels[(y + ky) * width + (x + kx)] * kernel[ki++];
        }
      }
      laplacian[y * width + x] = sum;
    }
  }

  // Variance of Laplacian values
  let mean = 0;
  const n = laplacian.length;
  for (let i = 0; i < n; i++) mean += laplacian[i];
  mean /= n;

  let variance = 0;
  for (let i = 0; i < n; i++) variance += (laplacian[i] - mean) ** 2;
  variance /= n;

  return variance;
};

// ─── Average brightness ───────────────────────────────────────────────────────

const computeBrightness = async (buffer) => {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum / data.length; // 0–255
};

// ─── Google Vision API call ───────────────────────────────────────────────────
// Requests LABEL_DETECTION + SAFE_SEARCH_DETECTION in a single call.
// Returns { labels, safeSearch } or the strings 'error' / 'timeout' / null.

const callGoogleVision = async (buffer, { labels: wantLabels = true, safeSearch: wantSafeSearch = false } = {}) => {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    logger.warn('[imageValidator] GOOGLE_VISION_API_KEY not set — skipping AI check');
    return null;
  }

  // Downsample to max 512px before encoding — keeps the payload small and fast.
  let smallBuffer;
  try {
    smallBuffer = await sharp(buffer)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    smallBuffer = buffer;
  }

  const features = [];
  if (wantLabels) features.push({ type: 'LABEL_DETECTION', maxResults: 20 });
  if (wantSafeSearch) features.push({ type: 'SAFE_SEARCH_DETECTION' });

  return new Promise((resolve) => {
    const body = JSON.stringify({
      requests: [{
        image: { content: smallBuffer.toString('base64') },
        features
      }]
    });

    const options = {
      hostname: 'vision.googleapis.com',
      path: `/v1/images:annotate?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) {
            logger.error('[imageValidator] Vision API error', { error: parsed.error });
            return resolve('error');
          }
          const response = parsed.responses?.[0] || {};
          resolve({
            labels: response.labelAnnotations || [],
            safeSearch: response.safeSearchAnnotation || null
          });
        } catch (e) {
          logger.error('[imageValidator] Vision API parse error', { error: e.message });
          resolve('error');
        }
      });
    });

    req.on('error', (e) => {
      logger.error('[imageValidator] Vision API request failed', { error: e.message });
      resolve('error');
    });

    req.setTimeout(10000, () => {
      req.destroy();
      logger.warn('[imageValidator] Vision API timeout');
      resolve('timeout');
    });

    req.write(body);
    req.end();
  });
};

// ─── Coin detection logic ─────────────────────────────────────────────────────
// Returns { accepted: bool, reason: string|null }

const COIN_LABELS = [
  // Direct coin matches
  'coin', 'coins', 'currency', 'numismatics', 'numismatic',
  'medal', 'medallion', 'silver coin', 'gold coin', 'commemorative coin',
  // Ancient / archaeological context
  'ancient history', 'ancient rome', 'artifact', 'relic', 'archaeology',
  'antiquity', 'ancient', 'roman',
  // Materials Vision returns for metal coins
  'copper', 'brass', 'bronze',
  // Collectibles
  'collectible',
];

const MODERN_COIN_LABELS = [
  'penny', 'dime', 'nickel', 'quarter', 'dollar coin', 'euro coin',
  'pound coin', 'cent', 'banknote', 'paper money'
];

// SafeSearch likelihood levels — POSSIBLE and above are rejected.
const NSFW_LEVELS = new Set(['POSSIBLE', 'LIKELY', 'VERY_LIKELY']);

const checkCoinViaVision = async (buffer) => {
  const result = await callGoogleVision(buffer, { labels: true, safeSearch: false });

  if (result === null) return { accepted: true, reason: null };
  if (result === 'error' || result === 'timeout') {
    logger.warn('[imageValidator] Vision unavailable — rejecting upload');
    return { accepted: false, reason: ERRORS.VISION_DOWN };
  }

  const { labels } = result;
  const normalize = (str) => str.toLowerCase();
  const labelMap = {};
  for (const l of labels) labelMap[normalize(l.description)] = l.score;

  logger.info('[imageValidator] Vision labels (coin)', {
    labels: labels.map(l => `${l.description}:${l.score.toFixed(2)}`).join(', ')
  });

  for (const modern of MODERN_COIN_LABELS) {
    const score = labelMap[modern];
    if (score && score >= UPLOAD.COIN.AI_MODERN_CONFIDENCE) {
      logger.info('[imageValidator] rejected: modern coin', { label: modern, score });
      return { accepted: false, reason: ERRORS.MODERN_COIN };
    }
  }

  for (const coinLabel of COIN_LABELS) {
    const score = labelMap[coinLabel];
    if (score && score >= UPLOAD.COIN.AI_COIN_CONFIDENCE) {
      logger.info('[imageValidator] accepted: matched label', { label: coinLabel, score });
      return { accepted: true, reason: null };
    }
  }

  logger.info('[imageValidator] rejected: no coin label matched', {
    threshold: UPLOAD.COIN.AI_COIN_CONFIDENCE,
    topLabels: labels.slice(0, 5).map(l => `${l.description}:${l.score.toFixed(2)}`).join(', ')
  });
  return { accepted: false, reason: ERRORS.NO_COIN };
};

// ─── Labels that are always incoherent for a numismatics collection cover ─────
const INCOHERENT_LABELS = [
  'selfie', 'screenshot', 'meme', 'cartoon', 'anime', 'drawing', 'illustration',
  'clip art', 'logo', 'brand', 'advertising', 'product', 'food', 'drink',
  'beverage', 'pet', 'dog', 'cat', 'animal', 'plant', 'flower', 'tree',
  'landscape', 'sky', 'cloud', 'beach', 'mountain', 'vacation',
  'vehicle', 'car', 'motorcycle', 'aircraft', 'boat', 'electronic device',
  'smartphone', 'computer', 'gadget', 'furniture', 'room', 'bedroom',
];

// Labels that make a thumbnail coherent for a numismatics platform.
const COHERENT_LABELS = [
  'coin', 'coins', 'numismatics', 'numismatic', 'medal', 'medallion',
  'artifact', 'relic', 'archaeology', 'antiquity', 'ancient', 'ancient history',
  'ancient rome', 'roman', 'bronze', 'copper', 'brass', 'silver', 'gold',
  'collectible', 'currency', 'monument', 'ruins', 'temple', 'sculpture',
  'statue', 'museum', 'history', 'historical', 'heritage', 'civilization',
  'emperor', 'portrait', 'engraving', 'seal', 'inscription',
];

const checkThumbnailViaVision = async (buffer) => {
  const result = await callGoogleVision(buffer, { labels: true, safeSearch: true });

  if (result === null) return { accepted: true, reason: null };
  if (result === 'error' || result === 'timeout') {
    logger.warn('[imageValidator] Vision unavailable — rejecting thumbnail upload');
    return { accepted: false, reason: ERRORS.VISION_DOWN };
  }

  const { labels, safeSearch } = result;

  // 1. NSFW check via SafeSearch
  if (safeSearch) {
    const { adult, violence, racy } = safeSearch;
    if (NSFW_LEVELS.has(adult) || NSFW_LEVELS.has(violence) || NSFW_LEVELS.has(racy)) {
      logger.info('[imageValidator] rejected thumbnail: NSFW', { adult, violence, racy });
      return { accepted: false, reason: ERRORS.NSFW };
    }
  }

  const normalize = (str) => str.toLowerCase();
  const labelMap = {};
  for (const l of labels) labelMap[normalize(l.description)] = l.score;

  logger.info('[imageValidator] Vision labels (thumbnail)', {
    labels: labels.map(l => `${l.description}:${l.score.toFixed(2)}`).join(', ')
  });

  // 2. Hard-reject clearly incoherent content (high confidence only)
  for (const bad of INCOHERENT_LABELS) {
    const score = labelMap[bad];
    if (score && score >= 0.85) {
      logger.info('[imageValidator] rejected thumbnail: incoherent label', { label: bad, score });
      return { accepted: false, reason: ERRORS.INCOHERENT };
    }
  }

  // 3. Accept if any coherent label present at reasonable confidence
  for (const good of COHERENT_LABELS) {
    const score = labelMap[good];
    if (score && score >= 0.50) {
      logger.info('[imageValidator] accepted thumbnail: coherent label', { label: good, score });
      return { accepted: true, reason: null };
    }
  }

  // 4. If no coherent label matched but nothing explicitly incoherent either,
  //    accept — we don't want to over-block ambiguous photos (e.g. a plain
  //    table with a coin barely visible, a museum display case, etc.)
  logger.info('[imageValidator] thumbnail: no coherent label but no explicit rejection — accepting');
  return { accepted: true, reason: null };
};

// ─── Main validator ───────────────────────────────────────────────────────────
// uploadType: 'coin' | 'thumbnail'
// Returns { valid: bool, error: string|null }

const validateImage = async (buffer, uploadType = 'coin') => {
  const isCoin = uploadType === 'coin';
  const thresholds = isCoin ? UPLOAD.COIN : UPLOAD.THUMBNAIL;

  // 1. Magic bytes — format check
  if (!isValidImageFormat(buffer)) {
    return { valid: false, error: ERRORS.FORMAT };
  }

  // 2. File size (already enforced by multer, but double-check)
  if (buffer.length > UPLOAD.MAX_FILE_SIZE) {
    return { valid: false, error: ERRORS.SIZE };
  }

  // Get image metadata once for resolution + DPI checks
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return { valid: false, error: ERRORS.FORMAT };
  }

  // 3. Minimum resolution
  const { width, height } = metadata;
  if (width < thresholds.MIN_WIDTH || height < thresholds.MIN_HEIGHT) {
    logger.info('[imageValidator] rejected: resolution', { width, height, type: uploadType });
    return { valid: false, error: isCoin ? ERRORS.RES_COIN : ERRORS.RES_THUMB };
  }

  // 4. Aspect ratio (thumbnails only — reject extreme panoramas / portraits)
  if (!isCoin && thresholds.MAX_ASPECT_RATIO) {
    const ratio = Math.max(width / height, height / width);
    if (ratio > thresholds.MAX_ASPECT_RATIO) {
      logger.info('[imageValidator] rejected: aspect ratio', { width, height, ratio });
      return { valid: false, error: ERRORS.ASPECT_THUMB };
    }
  }

  // 5. Blur detection
  let blurScore;
  try {
    blurScore = await computeBlurScore(buffer);
  } catch (e) {
    logger.warn('[imageValidator] Blur check failed', { error: e.message });
    blurScore = Infinity; // fail open
  }
  logger.info('[imageValidator] blur score', { score: blurScore, threshold: thresholds.MIN_BLUR_SCORE, type: uploadType });
  if (blurScore < thresholds.MIN_BLUR_SCORE) {
    return { valid: false, error: isCoin ? ERRORS.BLURRY_COIN : ERRORS.BLURRY_THUMB };
  }

  // 6. Brightness check
  let brightness;
  try {
    brightness = await computeBrightness(buffer);
  } catch (e) {
    logger.warn('[imageValidator] Brightness check failed', { error: e.message });
    brightness = 255; // fail open
  }
  logger.info('[imageValidator] brightness', { value: brightness, threshold: thresholds.MIN_BRIGHTNESS, type: uploadType });
  if (brightness < thresholds.MIN_BRIGHTNESS) {
    return { valid: false, error: isCoin ? ERRORS.DARK_COIN : ERRORS.DARK_THUMB };
  }

  // 7. AI content check
  if (isCoin) {
    const { accepted, reason } = await checkCoinViaVision(buffer);
    if (!accepted) return { valid: false, error: reason };
  } else {
    const { accepted, reason } = await checkThumbnailViaVision(buffer);
    if (!accepted) return { valid: false, error: reason };
  }

  return { valid: true, error: null };
};

// ─── Magic bytes check ────────────────────────────────────────────────────────

const isValidImageFormat = (buffer) => {
  if (!buffer || buffer.length < 12) return false;
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG
  const PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  if (PNG.every((b, i) => buffer[i] === b)) return true;
  // WebP (RIFF....WEBP)
  if ([0x52, 0x49, 0x46, 0x46].every((b, i) => buffer[i] === b) &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  return false;
};

module.exports = { validateImage, isValidImageFormat };
