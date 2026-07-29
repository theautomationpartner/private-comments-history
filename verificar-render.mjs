// verificar-render.mjs — comprobación de que la app REALMENTE se dibuja.
//
// Correlo con:  npm run verificar
//
// ¿Por qué existe, si ya está `npm run build`?
// Porque `build` solo comprueba que el código COMPILA. Esto es JavaScript: una prop que no existe
// (el clásico `Box.paddings.MEDIUM`, que es API vieja de Vibe 2) compila perfecto y recién explota
// cuando corre → React no monta nada → PANTALLA EN BLANCO, con el build en verde.
//
// Este script monta la app de verdad, en memoria, y falla si no dibuja. Tarda unos segundos y no
// necesita navegador, token ni internet.
//
// ⚠️ Corre en Node, no en el navegador: no hay `window`. Si tu App.jsx toca `window` durante el
// primer render, va a fallar acá aunque en el navegador ande. La solución correcta es la de
// siempre: mové esos accesos adentro de un `useEffect` (que en este chequeo no se ejecuta).

import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const mod = await server.ssrLoadModule("/src/App.jsx");
  const html = renderToString(React.createElement(mod.default));
  const texto = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  if (!texto) {
    console.error("❌ La app renderiza pero no muestra NINGÚN texto. Revisá el estado inicial.");
    process.exit(1);
  }

  console.log("✅ La app renderiza (" + html.length + " chars de HTML)");
  console.log("   Texto visible: " + texto.slice(0, 300) + (texto.length > 300 ? "…" : ""));
} catch (e) {
  console.error("❌ La app NO renderiza. En el navegador verías una pantalla en blanco.\n");
  console.error("   " + (e && e.message ? e.message : e) + "\n");
  console.error((e && e.stack ? e.stack : "").split("\n").slice(1, 5).join("\n"));
  console.error(
    "\n💡 Si el error dice \"Cannot read properties of undefined\", casi seguro es una prop de Vibe\n" +
      "   que no existe. En @vibe/core 4 las props son strings: padding=\"medium\", type=\"text2\",\n" +
      "   gap=\"medium\" — NO Box.paddings.MEDIUM ni Text.types.TEXT2 (eso es Vibe 2, legacy).\n" +
      "   Los valores válidos están en node_modules/@vibe/{layout,typography}/dist/**/*.types.d.ts"
  );
  process.exit(1);
} finally {
  await server.close();
}
