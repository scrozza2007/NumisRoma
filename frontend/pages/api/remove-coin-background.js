import sharp from 'sharp';

const isBackgroundWhite = (data, offset) => {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const a = data[offset + 3];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return a > 0 && max > 232 && min > 218 && max - min < 34;
};

const removeEdgeConnectedWhite = async (buffer) => {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const queue = [];
  let cursor = 0;

  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    if (isBackgroundWhite(data, pixel * channels)) queue.push(pixel);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (cursor < queue.length) {
    const pixel = queue[cursor];
    cursor += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    data[pixel * channels + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return sharp(data, { raw: { width, height, channels } })
    .png()
    .toBuffer();
};

export default async function handler(req, res) {
  const { src } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }

  if (!src || Array.isArray(src)) {
    res.status(400).json({ error: 'Missing image source' });
    return;
  }

  let url;
  try {
    url = src.startsWith('/')
      ? new URL(src, process.env.NEXT_PUBLIC_API_URL || `http://${req.headers.host}`)
      : new URL(src);
  } catch {
    res.status(400).json({ error: 'Invalid image source' });
    return;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    res.status(400).json({ error: 'Unsupported image source' });
    return;
  }

  try {
    const imageRes = await fetch(url, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!imageRes.ok) {
      res.status(imageRes.status).json({ error: 'Could not load image' });
      return;
    }

    const inputBuffer = Buffer.from(await imageRes.arrayBuffer());
    const outputBuffer = await removeEdgeConnectedWhite(inputBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800');
    res.status(200).send(outputBuffer);
  } catch {
    res.status(502).json({ error: 'Could not process image' });
  }
}
