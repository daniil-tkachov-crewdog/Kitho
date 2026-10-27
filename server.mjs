// Minimal static server for the Vite build with SPA fallback (used on Render).
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const root = join(import.meta.dirname, 'dist')
const port = Number(process.env.PORT) || 3000
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function fileAt(urlPath) {
  const path = normalize(join(root, decodeURIComponent(urlPath)))
  if (!path.startsWith(root)) return null
  try {
    return (await stat(path)).isFile() ? path : null
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://x').pathname
  const file = (await fileAt(urlPath)) ?? join(root, 'index.html')
  const ext = extname(file)
  const headers = {
    'Content-Type': types[ext] ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  }
  let body
  try {
    body = await readFile(file)
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Site is not built yet.')
    return
  }
  res.writeHead(200, headers).end(body)
}).listen(port, () => console.log(`Kitho listening on ${port}`))
