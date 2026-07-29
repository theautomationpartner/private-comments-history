import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

/**
 * Lee los .env del proyecto y devuelve sus valores, **dándole prioridad al archivo**.
 *
 * ⚠️ Por qué no usamos `loadEnv` de Vite: con prefijo "" también incluye `process.env`, y esas
 * variables PISAN a las del archivo. Si tu Windows tiene un MONDAY_TOKEN viejo, ese gana, editás
 * el .env.local y no cambia nada. Es el mismo problema que tiene `process.loadEnvFile()`.
 * Acá el archivo manda, que es lo que uno espera al editarlo.
 */
function envDeArchivos(dir) {
  const acumulado = {};
  for (const archivo of [".env", ".env.local"]) {
    // .env.local se lee último a propósito: pisa a .env
    let contenido;
    try {
      contenido = readFileSync(`${dir}/${archivo}`, "utf8");
    } catch {
      continue;
    }
    for (const linea of contenido.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (m) acumulado[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return acumulado;
}

// Config mínima para una app de monday.
// En Vercel, la carpeta `api/` se despliega como funciones serverless automáticamente
// (no hace falta configurarla acá).

/**
 * Hace que /api/monday funcione con `npm run dev`, sin instalar ni loguearse en Vercel.
 *
 * Reusa EL MISMO `api/monday.js` que se despliega en producción — no hay una segunda
 * implementación que se pueda desincronizar. Solo traduce entre el middleware de Vite
 * (req/res crudos de Node) y la firma que espera una función de Vercel.
 *
 * Solo corre en desarrollo (`apply: "serve"`): no toca el build de producción.
 * El token sigue viviendo únicamente del lado del servidor.
 */
function proxyMondayEnDev(env) {
  return {
    name: "monday-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/monday", async (req, res, next) => {
        if (req.method !== "POST") return next();

        // El handler lee process.env, así que le pasamos lo del archivo (que tiene prioridad).
        process.env.MONDAY_TOKEN = env.MONDAY_TOKEN ?? process.env.MONDAY_TOKEN ?? "";
        const guardia = env.APP_PROXY_KEY ?? process.env.APP_PROXY_KEY;
        if (guardia) process.env.APP_PROXY_KEY = guardia;

        try {
          const crudo = await new Promise((resolve, reject) => {
            let d = "";
            req.on("data", (c) => (d += c));
            req.on("end", () => resolve(d));
            req.on("error", reject);
          });
          req.body = crudo ? JSON.parse(crudo) : {};

          // Shim mínimo de la respuesta al estilo Vercel: res.status(n).json(obj)
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (obj) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(obj));
            return res;
          };

          const { default: handler } = await server.ssrLoadModule("/api/monday.js");
          await handler(req, res);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Proxy de dev falló", detail: String(e) }));
        }
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [react(), proxyMondayEnDev(envDeArchivos(process.cwd()))],
  server: { port: 5173 },
}));
