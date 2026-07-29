// src/main.jsx — entrada de la app.
// IMPORTANTE: importar los tokens de Vibe acá arriba de todo.
// Eso te da la paleta y tipografía de monday sin hardcodear colores.
import "@vibe/core/tokens";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
