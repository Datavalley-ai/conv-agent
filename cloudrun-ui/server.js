import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Point this to your GKE wrapper LB (HTTP is fine; this proxy runs on HTTPS)
const WRAPPER_URL = process.env.WRAPPER_URL || 'http://34.93.1.158';
const INTERNAL_KEY = process.env.INTERNAL_KEY || '';

app.use(express.json({ limit: '2mb' }));

// --- Basic Auth (protects everything) ---
const UI_USER = process.env.UI_USER || '';
const UI_PASS = process.env.UI_PASS || '';

app.use((req, res, next) => {
  if (!UI_USER || !UI_PASS) return next(); // if not set, no auth
  const hdr = req.headers['authorization'] || '';
  const [type, encoded] = hdr.split(' ');
  if (type === 'Basic' && encoded) {
    const [u, p] = Buffer.from(encoded, 'base64').toString().split(':');
    if (u === UI_USER && p === UI_PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="AI Interview Demo"');
  return res.status(401).send('Authentication required');
});

app.use(express.static(path.join(__dirname, 'public')));

// Proxy: browser (HTTPS) -> Cloud Run -> GKE wrapper (HTTP)
app.post('/api/chat', async (req, res) => {
  try {
    const r = await fetch(`${WRAPPER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(INTERNAL_KEY ? { authorization: `Bearer ${INTERNAL_KEY}` } : {})
      },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    res.status(r.status).set('content-type', 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: 'Proxy error', detail: String(e) });
  }
});

// Health & SPA
app.get('/healthz', (_, res) => res.send('ok'));
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`UI proxy up on ${port}`));
