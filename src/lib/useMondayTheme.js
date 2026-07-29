// src/lib/useMondayTheme.js
// Hace que la app siga el tema de monday (claro / oscuro / negro).
//
// Cómo funciona Vibe: sus colores son variables CSS definidas bajo las clases
// `.light-app-theme`, `.dark-app-theme` y `.black-app-theme`. Si no ponés ninguna, queda la
// clara por defecto — y adentro de monday en modo oscuro la app se ve como un bloque blanco.
// Este hook lee el tema del context y pone la clase que corresponde en el <body>.
//
// Escucha además los cambios: el usuario puede cambiar el tema con la app abierta.

import { useEffect } from "react";
import mondayLib from "./monday";

const CLASES = {
  light: "light-app-theme",
  dark: "dark-app-theme",
  black: "black-app-theme",
};

function aplicar(theme) {
  const clase = CLASES[theme] || CLASES.light;
  const body = document.body;
  Object.values(CLASES).forEach((c) => body.classList.remove(c));
  body.classList.add(clase);
}

export function useMondayTheme() {
  useEffect(() => {
    let vivo = true;

    mondayLib.getContext().then((ctx) => vivo && aplicar(ctx?.theme));
    const dejarDeEscuchar = mondayLib.onContextChange((ctx) => vivo && aplicar(ctx?.theme));

    return () => {
      vivo = false;
      if (typeof dejarDeEscuchar === "function") dejarDeEscuchar();
    };
  }, []);
}
