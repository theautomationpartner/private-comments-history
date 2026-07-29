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

/**
 * Devuelve los campos de primer nivel de una consulta GraphQL. `{ boards { ... } }` → ["boards"].
 *
 * No parsea GraphQL de verdad: saca la firma de la operación, borra el contenido de los paréntesis
 * (para que los nombres de argumentos no se confundan con campos) y recorre contando llaves,
 * juntando los identificadores que quedan a profundidad 1.
 *
 * Devuelve null si la consulta no tiene forma reconocible — y en ese caso se rechaza, que es lo
 * seguro: acá la lista es blanca, no negra.
 */
function camposRaiz(query) {
  const inicio = query.indexOf("{");
  if (inicio === -1) return null;

  let cuerpo = query.slice(inicio);
  // Los paréntesis pueden anidarse: repetimos hasta que no quede ninguno.
  let antes;
  do {
    antes = cuerpo;
    cuerpo = cuerpo.replace(/\([^()]*\)/g, "");
  } while (cuerpo !== antes);

  const campos = [];
  let profundidad = 0;
  let token = "";
  for (const ch of cuerpo) {
    if (ch === "{" || ch === "}") {
      if (profundidad === 1 && token) campos.push(token);
      token = "";
      profundidad += ch === "{" ? 1 : -1;
      continue;
    }
    if (profundidad !== 1) continue;
    if (/[A-Za-z_]/.test(ch)) {
      token += ch;
    } else {
      if (token) campos.push(token);
      token = "";
    }
  }
  if (token && profundidad === 1) campos.push(token);
  return campos;
}

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

  // 🔒 SOLO LECTURA. Esta app nunca escribe en monday, así que el proxy tampoco debe dejar.
  //
  // Importa porque este endpoint queda accesible en internet: el token que usa es personal y
  // arrastra los permisos de su dueño (incluida la ESCRITURA — monday no permite emitir tokens
  // de solo lectura). Sin este filtro, cualquiera que descubra la URL podría modificar o borrar
  // datos del cliente. Con el filtro, el peor caso es que lean.
  //
  // Se bloquea por palabra clave y no por parseo del GraphQL a propósito: es una lista blanca de
  // hecho —solo pasan queries— y no depende de entender toda la gramática.
  if (/\bmutation\b/i.test(query)) {
    return res.status(403).json({ error: "Este proxy es de solo lectura" });
  }

  // 🔒 SOLO `boards`, y SOLO estos dos. Sin estos dos filtros el endpoint es un relay de lectura a
  // TODA la cuenta del cliente: sus otros tableros, sus usuarios, sus documentos. El token es
  // personal y ve todo lo que ve su dueño. Acotarlo a lo que la app realmente necesita limita el
  // daño si la URL se filtra.
  //
  // Son dos chequeos distintos y hacen falta los dos:
  //   · el de IDs no ve `{ users { email } }`, porque no lleva ningún número
  //   · el de campos raíz no ve `{ boards(ids:[OTRO_TABLERO]) }`, porque el campo sí es `boards`
  const CAMPOS_RAIZ_PERMITIDOS = ["boards"];
  const TABLEROS_PERMITIDOS = ["5097507296", "5101177080"];

  const raiz = camposRaiz(query);
  if (!raiz || !raiz.length || raiz.some((c) => !CAMPOS_RAIZ_PERMITIDOS.includes(c))) {
    return res.status(403).json({ error: "Este proxy solo consulta tableros" });
  }

  // `boards` SIEMPRE tiene que venir con un `ids`. Sin esto, `{ boards { id name } }` lista todos
  // los tableros de la cuenta y se cuela: no lleva ningún número, así que el chequeo de IDs de
  // abajo no tiene nada que mirar.
  if (!/\bboards\s*\(\s*[^)]*\bids\b/.test(query)) {
    return res.status(403).json({ error: "Hay que indicar qué tablero se consulta" });
  }

  const idsEnLaConsulta = JSON.stringify({ query, variables }).match(/\d{8,}/g) || [];
  if (!idsEnLaConsulta.length || idsEnLaConsulta.some((id) => !TABLEROS_PERMITIDOS.includes(id))) {
    return res.status(403).json({ error: "Este proxy solo consulta los tableros de esta app" });
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
