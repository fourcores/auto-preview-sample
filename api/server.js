// Tiny dependency-free API used to exercise auto-preview.
// It reports what the preview environment looks like from the inside.
const http = require('http');
const net = require('net');

const PORT = 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*'; // CORS: only the preview frontend may call us

// Is something listening? (proves the db service started and depends_on worked)
function tcpCheck(host, port, ms = 1000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(ms, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

// Is the optional "extras" service (compose profile `extras`) running?
async function httpCheck(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function info() {
  const [db, extras] = await Promise.all([
    tcpCheck('db', 5432),
    httpCheck(process.env.EXTRAS_URL),
  ]);
  return {
    message: process.env.MESSAGE || 'Hello from the sample API',
    pr: process.env.PREVIEW_PR_NUMBER || null,
    sha: (process.env.PREVIEW_SHA || '').slice(0, 7) || null,
    database: db ? 'reachable' : 'unreachable',
    extras: extras ? 'running' : 'not running',
    // Never echo the value, only whether the PREVIEW_ENV secret reached the container.
    secret: process.env.SAMPLE_SECRET ? 'set' : 'not set',
    startedAt: startedAt,
  };
}

const startedAt = new Date().toISOString();

http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
      res.end('{"ok":true}');
    } else if (req.url === '/' || req.url === '/api/info') {
      res.end(JSON.stringify(await info(), null, 2));
    } else {
      res.statusCode = 404;
      res.end('{"error":"not found"}');
    }
  })
  .listen(PORT, () => console.log(`api listening on :${PORT}`));
