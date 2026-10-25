/** Local-only server for exercising Expo web exports in browser acceptance tests. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] || 'apps/customer-mobile/dist');
const port = Number(process.argv[3] || 8081);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file).catch(() => null);
    if (info?.isDirectory()) file = resolve(file, 'index.html');
    else if (!info)
      file = await stat(file + '.html')
        .then(() => file + '.html')
        .catch(() => resolve(root, 'index.html'));
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res
      .writeHead(404, { 'Content-Type': 'text/plain' })
      .end('Export not found. Run the application web build first.');
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Expo export validation server listening on port ${port}`),
);
