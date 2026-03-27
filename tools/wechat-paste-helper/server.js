const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WECHAT_PASTE_HELPER_PORT || 43821;

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function normalizeWindowsPath(input) {
  if (typeof input !== 'string') return '';
  const value = input.trim();
  if (!value) return '';

  if (/^file:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const pathname = decodeURIComponent(url.pathname || '');
      return pathname.replace(/^\//, '').replace(/\//g, '\\');
    } catch {
      return '';
    }
  }

  return value;
}

async function fileToDataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new Error(`Unsupported image type: ${ext}`);
  }

  const buffer = await fs.promises.readFile(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function handleReadImages(req, res) {
  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
    if (rawBody.length > 1024 * 1024) {
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const paths = Array.isArray(payload.paths) ? payload.paths : [];
      const normalized = Array.from(new Set(paths.map(normalizeWindowsPath).filter(Boolean))).slice(0, 30);

      const images = [];
      const errors = [];

      for (const filePath of normalized) {
        try {
          const dataUrl = await fileToDataUrl(filePath);
          images.push({ path: filePath, dataUrl });
        } catch (error) {
          errors.push({
            path: filePath,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      sendJson(res, 200, { ok: true, images, errors });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, port: Number(PORT) });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/read-images') {
    handleReadImages(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Wechat paste helper listening on http://127.0.0.1:${PORT}`);
});
