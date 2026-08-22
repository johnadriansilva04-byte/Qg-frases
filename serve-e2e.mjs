// Servidor local do build de produção (E2E): estáticos de .vercel/output/static,
// demais rotas delegadas ao handler SSR (__server.func).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const STATIC = new URL("./.vercel/output/static/", import.meta.url).pathname;
const { default: ssrModule } = await import("./.vercel/output/functions/__server.func/index.mjs");
const ssr = ssrModule.fetch;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(STATIC, path);
    if (filePath.startsWith(STATIC) && extname(filePath)) {
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
        res.end(data);
        return;
      } catch {
        // cai no SSR
      }
    }
    const response = await ssr(
      new Request(`http://localhost${req.url}`, {
        method: req.method,
        headers: req.headers,
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    res.writeHead(500);
    res.end(String(e?.message ?? e));
  }
});

server.listen(12000, () => console.log("E2E server on :12000"));
