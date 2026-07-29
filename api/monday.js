// api/monday.js — Función serverless de Vercel: PROXY a la API de monday.
// Va en la carpeta `api/` de la raíz del proyecto (Vercel la expone como /api/monday).
//
// SEGURIDAD: el token vive SOLO acá, como variable de entorno (process.env.MONDAY_TOKEN).
// Nunca en el frontend, nunca en el repo. El browser le pega a este endpoint; este endpoint
// le agrega el Authorization y habla con monday. Así el token jamás llega al cliente.
//
// Configurar el token:
//   - Local:  MONDAY_TOKEN=... en .env.local  (gitignoreado)
//   - Vercel: Project Settings → Environment Variables → MONDAY_TOKEN

// ⚠️ OJO: este endpoint es PÚBLICO en internet. Cualquiera que descubra la URL de Vercel
// podría usarlo como relay hacia el monday del cliente. Mitigaciones (ver SEGURIDAD-TOKEN.md):
//   1. Activá "Deployment Protection" en Vercel (con Vercel Authentication el preview queda
//      detrás de un login) — la opción más simple.
//   2. O seteá APP_PROXY_KEY en Vercel y en el frontend mandá el header x-app-key con ese valor
//      (VITE_APP_PROXY_KEY). No es un secreto fuerte (viaja en el bundle) pero frena scrapers
//      y bots casuales.
//   3. Siempre: token de MENOR privilegio posible y rotarlo al terminar el staging.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Guardia opcional: si APP_PROXY_KEY está seteada, exigirla en el header x-app-key.
  const requiredKey = process.env.APP_PROXY_KEY;
  if (requiredKey && req.headers["x-app-key"] !== requiredKey) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = process.env.MONDAY_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Falta MONDAY_TOKEN en variables de entorno" });
  }

  const { query, variables } = req.body || {};
  if (!query) {
    return res.status(400).json({ error: "Falta 'query'" });
  }

  try {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "API-Version": "2024-10",
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: "Error llamando a la API de monday", detail: String(e) });
  }
}
