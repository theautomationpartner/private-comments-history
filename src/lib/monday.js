// src/lib/monday.js
// Wrapper ÚNICO de acceso a monday. 3 modos, decididos en runtime:
//  1) MOCK        → dev rápido sin red (VITE_MONDAY_MOCK=1)
//  2) PROXY       → fuera de monday (local real / Vercel): pega a /api/monday
//                   (función serverless que tiene el token; el token NUNCA llega al browser)
//  3) NATIVO      → dentro de monday/vibe: monday.api() con la sesión (sin token estático)
// Regla del CLAUDE.md: NUNCA llamar a monday-sdk-js ni fetch directo desde componentes; pasar por acá.

import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

// ---- IDs REALES de los boards del cliente (completar en /iniciar) ----
// ⚠️ REGLA: para las queries usá SIEMPRE estos IDs, NUNCA context.boardId.
// Fuera de monday (Vercel/local) el context es un mock con un boardId falso:
// si consultás con ese, la query va a un board inexistente y la app "parece rota".
// context solo sirve DENTRO de monday (tema, viewMode, itemId en item views).
export const BOARDS = {
  // Board fuente: los proyectos. De acá sale el nombre del ítem para el header.
  portfolioExternal: "5097507296",
  // Board privado donde vive el historial de comentarios (una entrada por comentario).
  commentsHistory: "5101177080",
};

// Column IDs reales (verificados contra la API). No inventar ni adivinar.
export const COLS = {
  portfolioExternal: {
    ownerComments: "text_mm5ax4m7",   // la columna que se reemplaza en cada edición
  },
  commentsHistory: {
    commentText: "long_text_mm5pz2nk",
    sourceColumn: "text_mm5p9arf",
    owner: "text_mm5pj9k9",
    originalTimestamp: "date_mm5pbkpp",
    // Columna "Connect boards" (una vía) hacia Portfolio Overview - External.
    // Es la que dice a qué proyecto pertenece cada entrada del historial.
    // Se creó a mano desde la interfaz: la API de monday no permite crear este tipo.
    linkedItem: "board_relation_mm5pk9rd",
  },
};

// Mail de la dueña del historial. Sale de una variable de entorno y NO del código, porque este
// repo es público y es el dato personal de una persona real.
//   · Local:  VITE_OWNER_EMAIL en .env.local
//   · Vercel: Project Settings → Environment Variables
// Si falta, la app funciona igual: solo deja de mostrar el cartel "Only visible to you" y usa el
// texto neutro para todos. No es una medida de seguridad — la privacidad la da el permiso del
// board privado, del lado del servidor.
export const OWNER_EMAIL = import.meta.env?.VITE_OWNER_EMAIL || "";

const IS_MOCK = import.meta.env?.VITE_MONDAY_MOCK === "1";

// Dentro de monday, la app corre embebida en un iframe (self !== top).
// Fuera (Vercel standalone / local), corre como top → usamos el proxy serverless.
const INSIDE_MONDAY =
  typeof window !== "undefined" && window.self !== window.top;

// ---- Datos de ejemplo para el mock (editá según tu app) ----
// Incluye theme y viewMode porque la app corre EMBEBIDA en monday y su tamaño/tema cambian.
// theme: "light" | "dark" | "black".
// viewMode: board view → "fullscreen" | "split" | "mobile"; widget → "widget" | "fullscreen".
const MOCK_CONTEXT = {
  boardId: 1234567890,
  user: { id: 1, name: "Demo" },
  theme: "light",
  viewMode: "fullscreen",
  instanceType: "board_view",
};
const MOCK_ITEMS = [{ id: "1", name: "Ítem demo A" }, { id: "2", name: "Ítem demo B" }];

function mockApi(query) {
  if (query.includes("items")) return { data: { boards: [{ items_page: { items: MOCK_ITEMS } }] } };
  return { data: {} };
}

// ---- API pública ----
/**
 * Fuera de monday NO existe un context real (no hay ítem abierto ni usuario logueado).
 * Para poder probar igual, dejamos simularlo por querystring:
 *
 *   http://localhost:5173/?itemId=<id>                    → como si la dueña abriera ese ítem
 *   http://localhost:5173/?itemId=<id>&email=otro@x.com   → como si lo abriera otra persona
 *   http://localhost:5173/?itemId=<id>&theme=dark         → para ver el tema oscuro
 *
 * Es solo una ayuda de desarrollo: DENTRO de monday manda siempre el context de verdad, así que
 * nadie puede usar esto para ver datos ajenos. La privacidad la da el permiso del board.
 */
export async function getContext() {
  if (INSIDE_MONDAY && !IS_MOCK) return (await monday.get("context")).data;

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const itemId = params?.get("itemId");
  const email = params?.get("email");
  const theme = params?.get("theme");
  return {
    ...MOCK_CONTEXT,
    ...(itemId ? { itemId } : {}),
    ...(theme ? { theme } : {}),
    user: { ...MOCK_CONTEXT.user, ...(email ? { email } : { email: OWNER_EMAIL }) },
  };
}

export async function api(query, variables = {}) {
  if (IS_MOCK) return mockApi(query);

  if (INSIDE_MONDAY) {
    // Dentro de monday/vibe: auth nativa por sesión, sin token.
    return monday.api(query, { variables });
  }

  // Fuera de monday (Vercel/local real): proxy serverless. El token vive en el server.
  // Si el proxy tiene la guardia activada (APP_PROXY_KEY en Vercel), mandamos la clave
  // en el header x-app-key (VITE_APP_PROXY_KEY, no-secreto: solo frena bots casuales).
  const headers = { "Content-Type": "application/json" };
  const proxyKey = import.meta.env?.VITE_APP_PROXY_KEY;
  if (proxyKey) headers["x-app-key"] = proxyKey;

  const res = await fetch("/api/monday", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Proxy monday respondió ${res.status}`);
  return res.json();
}

// Escuchar cambios de contexto: el usuario cambia el tema (light/dark/black),
// redimensiona el widget o cambia de ítem. Usalo si la UI depende del tema o del viewMode.
export function onContextChange(cb) {
  if (IS_MOCK || !INSIDE_MONDAY) return () => {};
  return monday.listen("context", (res) => cb(res.data));
}

export { IS_MOCK, INSIDE_MONDAY };
export default { getContext, api, onContextChange, IS_MOCK, INSIDE_MONDAY };
