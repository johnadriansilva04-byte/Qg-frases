import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
const ROOT = "/workspace/project/Qg-frases/.vercel/output";
const STATIC = join(ROOT, "static");
const mod = await import(join(ROOT, "functions/__server.func/index.mjs"));
const handler = mod.fetch ?? mod.default?.fetch ?? mod.default;
const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = normalize(decodeURIComponent(url.pathname));
  if (path !== "/" && !path.includes("..")) {
    try {
      const file = join(STATIC, path);
      const st = await stat(file);
      if (st.isFile()) {
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
        res.end(await readFile(file));
        return;
      }
    } catch {}
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const r = await handler(
    new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: body && !["GET", "HEAD"].includes(req.method ?? "GET") ? body : undefined,
    }),
  );
  const headers = {};
  r.headers.forEach((v, k) => (headers[k] = v));
  res.writeHead(r.status, headers);
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(Number(process.argv[2] ?? 3417), "0.0.0.0", () => console.log("serving"));
