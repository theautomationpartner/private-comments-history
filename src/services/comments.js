// src/services/comments.js
// Única fuente de datos de la app. Lee el historial privado de comentarios.
// La app es 100% de solo lectura: acá NO hay ninguna escritura a monday.

import mondayLib, { BOARDS, COLS, OWNER_EMAIL } from "../lib/monday";

// Nombre de la columna de comentarios de la dueña. Va por variable de entorno porque incluye el
// nombre de una persona y este repo es público.
const OWNER_COLUMN = import.meta.env?.VITE_SOURCE_COLUMN || "Comments";

/**
 * Las columnas del board de proyectos cuyo historial muestra la app.
 *
 * ⚠️ La app es SOLO para Yael: centraliza en una pantalla sus comentarios privados y los de las
 * columnas que escribe todo el equipo, para que no tenga que mirar en dos lugares. El resto de
 * la gente sigue leyendo esas columnas en los Updates del tablero, como siempre — por eso las
 * automatizaciones viejas NO se apagan. Las dos vías conviven a propósito.
 *
 * `sourceColumn` tiene que coincidir EXACTAMENTE con el texto que la automatización de monday
 * escribe en la columna "Source Column" de cada entrada. Es el único vínculo entre una entrada
 * del historial y su sección: si no coinciden, la sección aparece vacía aunque haya datos.
 *
 * Los nombres salen de las columnas REALES del board (verificadas contra la API). El mockup
 * original decía "Risks" y "Key Risks": esa primera no existe, son la misma cosa.
 *
 * ⚠️ Alcance: solo el board EXTERNO. El Internal queda fuera por definición del cliente.
 */
export const SECTIONS = [
  { key: "owner", label: OWNER_COLUMN, sourceColumn: OWNER_COLUMN },
  { key: "notes", label: "General Notes", sourceColumn: "General Notes" },
  { key: "actionPlan", label: "Action Plan", sourceColumn: "Action Plan" },
  { key: "keyRisk", label: "Key Risk", sourceColumn: "Key Risk" },
  { key: "projectOwner", label: "Project Owner Comments", sourceColumn: "Project Owner Comments" },
];

// ---- Datos de ejemplo (solo con VITE_MONDAY_MOCK=1) ----
// Sirven para maquetar sin conexión. ⚠️ Son INVENTADOS a propósito: este repo es público, así que
// acá no van comentarios ni nombres de proyecto reales del cliente. Están pensados para ejercitar
// la pantalla: uno largo que hace varias líneas, uno corto, y dos de días distintos.
const MOCK_ENTRIES = [
  {
    id: "m1",
    text: "Supplier confirmed the revised delivery window, but we still need the updated tooling spec before we can commit to the volume discussed in the last review.",
    createdAt: "2026-07-27T08:05:00Z",
    sourceColumn: OWNER_COLUMN,
  },
  {
    id: "m2",
    text: "Any status report on this? Waiting on numbers.",
    createdAt: "2026-07-27T08:03:00Z",
    sourceColumn: OWNER_COLUMN,
  },
  {
    id: "m3",
    text: "Please update the timeline and attach the latest deck with the action items.",
    createdAt: "2026-07-26T14:22:00Z",
    sourceColumn: "Action Plan",
  },
  {
    id: "m4",
    text: "Spec mismatch found during assembly. Need a decision on how we control tolerance.",
    createdAt: "2026-07-20T09:15:00Z",
    sourceColumn: "Key Risk",
  },
  {
    id: "m5",
    text: "Scope agreed with the customer: two production lots, first one before the audit.",
    createdAt: "2026-07-18T11:40:00Z",
    sourceColumn: "General Notes",
  },
  {
    id: "m6",
    text: "Owner: waiting on the supplier quote before we can commit to the September window.",
    createdAt: "2026-07-17T15:20:00Z",
    sourceColumn: "Project Owner Comments",
  },
];

const MOCK_ITEM_NAME = "Sample project";

/**
 * Trae el historial de comentarios del ítem abierto, del más nuevo al más viejo.
 * Devuelve { entries, itemName, hasAccess }.
 *
 * La privacidad REAL la da el permiso del board (es privado y solo la dueña está suscripta):
 * monday filtra del lado del servidor, así que un usuario sin acceso simplemente no
 * recibe datos. El chequeo de email de acá abajo es solo para mostrar un mensaje amable.
 */
export async function getCommentHistory() {
  const ctx = await mondayLib.getContext();

  if (mondayLib.IS_MOCK) {
    return { entries: MOCK_ENTRIES, itemName: MOCK_ITEM_NAME, hasAccess: true, isOwner: true };
  }

  // Sin ítem abierto no hay nada que mostrar, pero NO es un error: pasa cuando alguien abre la
  // URL suelta fuera de monday. Devolvemos un estado propio para no mostrarle "Something went
  // wrong" a un cliente que no hizo nada mal.
  //
  // ⚠️ Todo texto que puede ver el cliente va en el idioma de la app (acá, inglés). La pista
  // técnica solo aparece con `npm run dev` (import.meta.env.DEV), nunca en el build desplegado.
  const itemId = ctx.itemId;
  if (!itemId) {
    const pistaDeDev = import.meta.env?.DEV ? " (dev: add ?itemId=<id> to the URL)" : "";
    return { entries: [], itemName: "", hasAccess: true, isOwner: true, noItem: true, pistaDeDev };
  }

  // Aviso amable para quien no es la dueña (no es la medida de seguridad).
  //
  // ⚠️ El contexto de monday NO trae el email: `context.user` tiene id, isAdmin, isGuest,
  // isViewOnly, countryCode, currentLanguage, timeFormat y timeZoneOffset — nada más
  // (verificado en la doc oficial de monday.get("context")). Hay que pedirlo aparte.
  const email = (ctx.user && ctx.user.email) || (await traerEmailDelUsuario());
  const isOwner = Boolean(email) && email.toLowerCase() === OWNER_EMAIL.toLowerCase();

  // ⚠️ Requiere la columna "Linked Item" (Connect boards) en el board de historial.
  // Todavía no existe: hay que crearla desde la interfaz de monday.
  if (!COLS.commentsHistory.linkedItem) {
    throw new Error(
      'Falta la columna "Linked Item" en el board Comments History. ' +
        "Creala desde monday (Connect boards → Portfolio Overview - External) " +
        "y completá COLS.commentsHistory.linkedItem en src/lib/monday.js."
    );
  }

  // ⚠️ Pedimos `value` además de `text` por la fecha: ver toUtcIso() más abajo.
  //
  // 🔴 Y paginamos con `cursor`. El board de historial acumula UNA entrada por cada cambio de
  // CADA columna de TODOS los proyectos: es el que más crece. Con un `limit` fijo, los proyectos
  // cuyas entradas caen fuera de la primera página muestran "No entries yet" — o sea, la app
  // miente sin dar ningún error. Ya estaba pasando: el board tenía 209 entradas y el límite era 200.
  const query = `
    query ($board: ID!, $cols: [String!], $cursor: String) {
      boards(ids: [$board]) {
        items_page(limit: 500, cursor: $cursor) {
          cursor
          items {
            id
            created_at
            column_values(ids: $cols) {
              id
              text
              value
              ... on BoardRelationValue { linked_item_ids }
            }
          }
        }
      }
    }`;

  // El nombre del proyecto se pide aparte, contra el board de proyectos. Va en paralelo con el
  // historial para no sumar espera. Si falla (o el ítem se borró) la app funciona igual: el
  // encabezado simplemente no muestra el nombre.
  const cols = [
    COLS.commentsHistory.commentText,
    COLS.commentsHistory.originalTimestamp,
    COLS.commentsHistory.linkedItem,
    COLS.commentsHistory.sourceItem,
    COLS.commentsHistory.sourceColumn,
  ];

  const [historial, nombreDelProyecto] = await Promise.all([
    traerTodasLasPaginas(query, { board: BOARDS.commentsHistory, cols }),
    traerNombreDelItem(itemId),
  ]);

  // ⚠️ Distinguir "no tenés acceso" de "no hay comentarios" es clave acá, y monday NO da error
  // cuando no tenés permiso: devuelve la lista de boards VACÍA con HTTP 200.
  //   · boards vacío        → el usuario no está suscripto al board privado → sin acceso
  //   · boards con 0 ítems  → tiene acceso, pero este ítem no tiene comentarios
  // Sin este chequeo, alguien sin acceso vería "No comments yet", que es una mentira distinta.
  if (!historial.hayAcceso) {
    return { entries: [], itemName: nombreDelProyecto, hasAccess: false, isOwner };
  }

  const rows = historial.items;
  const val = (cvs, id) => cvs.find((c) => c.id === id) || {};

  // Primero se filtran las filas de ESTE ítem. Todo lo que venga después tiene que salir de acá:
  // `rows` es el board entero, y usarlo por error trae datos de otros proyectos.
  const filas = rows.filter((r) => {
    const link = val(r.column_values, COLS.commentsHistory.linkedItem);
    return (link.linked_item_ids || []).map(String).includes(String(itemId));
  });

  const entries = filas
    .map((r) => {
      // Si la entrada viene de la migración usa su fecha original; si no, la de creación.
      const original = fechaDeColumna(val(r.column_values, COLS.commentsHistory.originalTimestamp).value);
      return {
        id: r.id,
        text: val(r.column_values, COLS.commentsHistory.commentText).text || "",
        createdAt: original?.iso || r.created_at,
        // Una fecha SIN hora no es un instante, es un día. Si la tratáramos como instante
        // (medianoche UTC), al pasarla a hora local se correría al día anterior. Este flag
        // deja mostrar solo la fecha, sin inventar un "12:00 AM".
        tieneHora: original ? original.tieneHora : true,
        // De qué columna del proyecto vino: es lo que separa una sección de otra.
        sourceColumn: (val(r.column_values, COLS.commentsHistory.sourceColumn).text || "").trim(),
        // El nombre del proyecto tal como estaba cuando se guardó la entrada.
        sourceItem: (val(r.column_values, COLS.commentsHistory.sourceItem).text || "").trim(),
      };
    })
    .filter((e) => e.text.trim())
    // De la más nueva a la más vieja. El desempate por id evita que dos entradas del mismo
    // segundo (o del mismo día, si la fecha no trae hora) salgan en orden distinto en cada carga.
    .sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt) || Number(b.id) - Number(a.id)
    );

  // Si el proyecto se borró, su nombre ya no se puede consultar — pero quedó guardado en la
  // columna Source Item de cada entrada. Ese es justamente el caso para el que la creamos.
  //
  // 🔴 Sale de las entradas de ESTE ítem, no del board entero (con `rows[0]` se mostraba el
  // nombre de otro proyecto). Y de la entrada MÁS NUEVA: si el proyecto se renombró alguna vez,
  // cada entrada guardó el nombre de su época, y el que vale es el último.
  const nombreDeRespaldo = entries[0]?.sourceItem || "";

  return {
    entries,
    itemName: nombreDelProyecto || nombreDeRespaldo || "",
    hasAccess: true,
    isOwner,
  };
}

/**
 * Trae TODAS las páginas del board de historial, siguiendo el `cursor`.
 *
 * 🔴 Por qué no alcanza con un `limit` grande: el board acumula una entrada por cada cambio de
 * cada columna de cada proyecto. Crece para siempre. El día que pase el límite, los proyectos
 * que queden afuera muestran "No entries yet" — la app miente y no hay ningún error que lo avise.
 *
 * Devuelve { hayAcceso, items }. La distinción importa: `boards: []` significa SIN PERMISO, no
 * "sin datos" (monday responde 200 en los dos casos).
 *
 * El tope de páginas es una red contra un bucle infinito si la API devolviera siempre cursor.
 */
async function traerTodasLasPaginas(query, { board, cols }, topeDePaginas = 20) {
  const items = [];
  let cursor = null;

  for (let pagina = 0; pagina < topeDePaginas; pagina++) {
    const res = await mondayLib.api(query, { board, cols, cursor });

    // Un `errors` en la respuesta es un fallo real (query inválida, límite de complejidad),
    // NO falta de permiso. monday devuelve 200 en los dos casos.
    if (res?.errors) throw new Error("La consulta a monday devolvió errores");

    const tablero = res?.data?.boards?.[0];
    if (!tablero) {
      // Board vacío en la PRIMERA página = el usuario no está suscripto al board privado.
      // En una página posterior es un fallo a mitad de camino: ya sabemos que tiene acceso,
      // así que devolver "sin acceso" sería mentirle, y devolver lo acumulado sería mostrar
      // datos incompletos como si fueran todos.
      if (pagina === 0) return { hayAcceso: false, items: [] };
      throw new Error("La consulta se cortó a mitad de camino");
    }

    items.push(...(tablero.items_page?.items ?? []));
    cursor = tablero.items_page?.cursor || null;
    if (!cursor) return { hayAcceso: true, items };
  }

  // Se acabaron las páginas permitidas y todavía queda cursor: los datos están incompletos.
  // Mostrarlos igual sería el mismo error que veníamos arreglando —la app miente sin avisar—
  // solo que con 10.000 entradas en vez de 200.
  throw new Error("El historial es más grande de lo que la app puede traer");
}

/**
 * Email de quien está mirando. Solo sirve para elegir el texto del cartel de privacidad: la
 * seguridad real la da el permiso del board, del lado del servidor.
 *
 * Solo se consulta DENTRO de monday. Afuera pasaría por el proxy, que únicamente deja pasar
 * consultas de `boards` — y con razón: no queremos que un endpoint público pueda averiguar
 * quién es el dueño del token.
 */
async function traerEmailDelUsuario() {
  if (!mondayLib.INSIDE_MONDAY) return "";
  try {
    const res = await mondayLib.api("query { me { email } }");
    return res?.data?.me?.email || "";
  } catch {
    return "";
  }
}

/**
 * Nombre del proyecto, para mostrarlo en el encabezado.
 *
 * Se consulta a través de `boards` y no de `items` a propósito: el proxy solo deja pasar consultas
 * de tableros, así que este es el camino permitido. Si algo falla devuelve cadena vacía — el
 * nombre es decorativo y nunca debe romper la pantalla.
 */
async function traerNombreDelItem(itemId) {
  try {
    const res = await mondayLib.api(
      `query ($board: ID!, $item: ID!) {
         boards(ids: [$board]) {
           items_page(limit: 1, query_params: { ids: [$item] }) { items { name } }
         }
       }`,
      { board: BOARDS.portfolioExternal, item: String(itemId) }
    );
    return res?.data?.boards?.[0]?.items_page?.items?.[0]?.name || "";
  } catch {
    return "";
  }
}

/**
 * Convierte el `value` crudo de una columna de fecha a un ISO en UTC.
 *
 * ⚠️ TRAMPA DE MONDAY, verificada contra la API: en una columna de fecha,
 *   · `value`            → `{"date":"2026-07-27","time":"08:05:08"}`  ← **UTC real**
 *   · `text` / `date` / `time` → `"2026-07-27 05:05"`  ← **ya convertido al huso de quien
 *     consulta**, y sin ningún indicador de zona.
 *
 * Si usás `text`, `new Date()` lo interpreta como hora LOCAL del navegador y el desfasaje se
 * aplica dos veces. Con la app corriendo en un huso y la usuaria en otro, eso son 6 horas de error
 * en una app cuyo sentido son justamente las fechas. Siempre `value` para fechas.
 */
function fechaDeColumna(rawValue) {
  if (!rawValue) return null;
  try {
    const { date, time } = JSON.parse(rawValue) || {};
    if (!date) return null;
    // Sin hora, la columna guarda un DÍA, no un instante. Se usa mediodía en vez de medianoche
    // para que al convertir a la hora local no se corra de día en ningún huso del planeta; el
    // flag `tieneHora` es lo que impide mostrar esa hora inventada.
    return { iso: `${date}T${time || "12:00:00"}Z`, tieneHora: Boolean(time) };
  } catch {
    return null;
  }
}

/** "July 27, 2026" */
export function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** "10:15 AM" */
export function formatTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
