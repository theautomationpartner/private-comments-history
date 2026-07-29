# Pasar la app a monday vibe

> Este archivo es **para vos**, no para vibe. Lo único que se copia y pega en vibe es
> `1-app-completa.txt`, **entero**.

---

## Antes de abrir vibe

### 1. Sacá 4 capturas de pantalla

Abrí **https://private-comments-history-tap-team1.vercel.app/?itemId=3081342422**
(es el proyecto A401, el que más historial tiene).

⚠️ **Achicá la ventana del navegador antes de capturar** — que quede angosta, más o menos la mitad
de la pantalla. Adentro de monday la app vive en un panel angosto, y si le mandás capturas de
pantalla completa, vibe copia un diseño ancho que después no entra.

| Archivo | Qué tiene que mostrar |
|---|---|
| `1-seccion-yael.png` | La sección **Yael's Comments** abierta, con la tarjeta de resumen, la barra lateral con los 5 contadores y al menos una tarjeta del feed con su punto violeta |
| `2-seccion-action-plan.png` | La sección **Action Plan** abierta (tiene 17 entradas): se tiene que ver la línea de tiempo con varias tarjetas conectadas |
| `3-vacio.png` | Una sección sin entradas, para que se vea el estado *"No entries yet"* |
| `4-oscuro.png` | Cualquier sección con `&theme=dark` agregado a la URL, para que copie los colores del tema oscuro |

### 2. Creá la app en vibe conectando los DOS boards

Al crear la app, cuando te pregunte de qué boards toma los datos, elegí:

- **Portfolio Overview - External** → `5097507296`
- **Comments History** → `5101177080`

⚠️ **Esto es lo más importante de todo.** Si la app no arranca con los boards conectados, vibe no
los encuentra, **cae a datos inventados y disimula el problema**: parece que anda y no anda. Es el
error que en otro proyecto costó ~800 créditos.

Tipo de app: **item view**.

---

## El build

| Paso | Qué hacer |
|---|---|
| 1 | Elegí el modelo **Claude Sonnet** |
| 2 | Adjuntá las 4 capturas |
| 3 | Abrí `1-app-completa.txt`, seleccioná **todo** (Ctrl+A), copiá y pegá |
| 4 | Enviá |

**Por qué Sonnet y no Opus:** Opus cuesta entre 5 y 10 veces más y esta app no tiene lógica pesada
—es leer, filtrar y ordenar—. Opus es la trampa número uno para quemar créditos.

**Por qué un solo prompt:** el largo del prompt casi no afecta el costo; lo que se paga es cuánto
tiene que razonar vibe y cuántas veces construye. Un prompt de 900 líneas cuesta lo mismo que uno
de 60. Por eso conviene mandar **todo el detalle de una** y minimizar la cantidad de builds.

---

## Después del build: verificá ANTES de pedir cambios

Abrí la app dentro de un proyecto real y revisá:

- [ ] Aparecen las **5 secciones** y se puede entrar a cada una
- [ ] Los **contadores** del costado coinciden con los del tablero de historial
- [ ] Las **fechas y horas** coinciden con la columna *Original Timestamp* — si están corridas
      varias horas, vibe usó `text` en vez de `value` (está avisado en el prompt, pero verificalo)
- [ ] El orden es **de más nuevo a más viejo**
- [ ] Cambiar de sección es **instantáneo** (no vuelve a consultar monday)
- [ ] Se ve bien en **tema claro y oscuro**
- [ ] **No hay ningún botón que escriba** (nada de "New Comment")

**Truco para no gastar un build:** poné vibe en modo **Discuss** (no ejecuta código, es barato) y
pedile que te explique qué construyó. Es la forma más rápida de descubrir que dijo "listo" pero
dejó algo hardcodeado o sin conectar.

**Si algo salió mal:** corregí con un prompt **puntual y corto** sobre esa parte, con un modelo
barato (Gemini Flash). No vuelvas a mandar el prompt entero. Y si un build sale muy mal,
**revertí a la versión anterior** en vez de encadenar arreglos.

---

## Y lo último, que es lo más importante del proyecto

Recién **adentro de monday** se puede probar lo único que la app promete: **que solo Yael vea sus
comentarios**. Fuera de monday es imposible, porque todos entran con la misma credencial.

Cuando esté publicada:

1. **Abrila con Yael** → tiene que ver las 5 secciones con datos
2. **Abrila con alguien que NO esté suscripto** al board privado → tiene que ver
   *"This information is private"*, **sin conteos ni fechas**

Hasta que ese segundo paso no esté hecho, la app **no está terminada**.

⚠️ Y avisale al cliente: **la pestaña de la app la va a poder abrir cualquiera** del board — monday
no permite ocultarla por usuario. Lo que sí está garantizado es que no va a ver ningún dato.

---

## Al cerrar el proyecto

- [ ] Volver a activar la protección del deploy en Vercel
- [ ] **Rotar el token de monday** de Martín (Developers → My Access Tokens → Regenerate)
- [ ] Borrar el proyecto de prueba `test 29/ 7 NO DELETE` y sus entradas de historial
