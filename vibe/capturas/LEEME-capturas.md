# Capturas para adjuntar al prompt

Las 4 están validadas y al día con la app final. **Se adjuntan las 4 juntas** al mensaje de vibe,
antes de pegar `1-app-completa.txt`.

| Archivo | Qué le enseña a vibe |
|---|---|
| `1-ancho-timeline.png` | El layout completo: barra lateral con los 5 contadores, tarjeta de resumen y la línea de tiempo con los puntos violetas conectados |
| `2-angosto-timeline.png` | **La más importante.** Cómo se reacomoda cuando falta ancho: la barra lateral se va arriba del feed. Es el ancho real que va a tener adentro de un ítem de monday |
| `4-ancho-vacio.png` | El estado *"No entries yet"* y cómo convive con los contadores de las otras secciones |
| `5-angosto-vacio.png` | El estado vacío, angosto |

## Por qué no hay una de tema oscuro

Se decidió no incluirla. El prompt ya cubre el tema con mucha más precisión que una imagen:
nombra las tres clases de Vibe (`light-app-theme` / `dark-app-theme` / `black-app-theme`), dice
en qué nodo aplicarlas, incluye el CSS del `<body>` y pide escuchar `monday.listen("context")`.

Una captura muestra **cómo quedó**; el prompt dice **cómo se hace**. Para el tema, lo segundo vale
más — es justamente lo que no se puede deducir mirando.

## Si se vuelve a tocar la UI, estas capturas caducan

Ya pasó una vez: unas capturas mostraban el rótulo `"Total comments"` cuando ya se había cambiado
por `"In <sección>"`. Mandarle a vibe una imagen que contradice el texto es pedirle que construya
la versión vieja.

**Chequeo rápido antes de adjuntar:** que el contador diga **"In <nombre de la sección>"**.
