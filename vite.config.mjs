import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

// Dev only: serve the Vercel functions in /api from `npm run dev`, so the app can be tried
// end to end locally. Reads server env vars from .env.local. Production uses Vercel itself.
function vercelApiDev() {
  return {
    name: "vercel-api-dev",
    apply: "serve",
    configureServer(server) {
      Object.assign(process.env, loadEnv("development", process.cwd(), ""));
      server.middlewares.use(async (req, res, next) => {
        const match = req.url.match(/^\/api\/([a-z0-9-]+)(?:\?.*)?$/i);
        if (!match) return next();
        const file = path.resolve("api", `${match[1]}.js`);
        let handler;
        try { delete require.cache[file]; handler = require(file); } catch { return next(); }
        let raw = "";
        for await (const chunk of req) raw += chunk;
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };
        try { await handler(req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end(); }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vercelApiDev()],
});
