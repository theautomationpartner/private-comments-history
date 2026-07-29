// src/App.jsx — Private Comments History (item view, solo lectura)
//
// Reglas que respeta esta pantalla:
//  - Solo componentes de @vibe/core; los colores salen de sus tokens (anda en claro y oscuro).
//  - Layout fluido: nada de anchos fijos. Colapsa a una columna en pantallas angostas.
//  - NO dibuja el chrome de monday (header, menú lateral, árbol de tableros): eso lo pone monday.
//  - No escribe absolutamente nada en monday.
//
// ⚠️ API de @vibe/core 4.x: las props son STRINGS en minúscula (padding="medium", type="text2").
//    NO existen constantes tipo Box.paddings.MEDIUM ni Text.types.TEXT2 — usarlas rompe la app
//    en runtime (pantalla en blanco) aunque `npm run build` compile sin errores.

import { useEffect, useState } from "react";
import { Box, Flex, Text, Heading, Skeleton, Divider } from "@vibe/core";
import { Comment, Locked, Calendar, Time } from "@vibe/icons";
import { getCommentHistory, formatDate, formatTime, SECTIONS } from "./services/comments";
import { useMondayTheme } from "./lib/useMondayTheme";
import "./App.css";

export default function App() {
  const [state, setState] = useState({ status: "loading" });
  const [section, setSection] = useState(SECTIONS[0].key);

  const seccionActiva = SECTIONS.find((s) => s.key === section) || SECTIONS[0];
  // Una sola consulta trae el historial completo; separar por columna es filtrar en memoria.
  // Cambiar de sección no vuelve a pegarle a monday.
  const entradasDeLaSeccion = (state.entries || []).filter(
    (e) => e.sourceColumn === seccionActiva.sourceColumn
  );

  // La app va embebida: tiene que seguir el tema de monday (claro / oscuro / negro).
  useMondayTheme();

  useEffect(() => {
    let alive = true;
    getCommentHistory()
      .then((data) => alive && setState({ status: "ready", ...data }))
      .catch((e) => alive && setState({ status: "error", message: String(e.message || e) }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Box padding="medium">
      <Flex direction="column" gap="medium" align="stretch">
        <Header itemName={state.itemName} seccion={seccionActiva} />
        {/* Sin ítem o con error no hay nada que contar: un "0 Total comments" ahí confunde. */}
        {!state.noItem && state.status !== "error" && (
          <SummaryCard
            count={entradasDeLaSeccion.length}
            loading={state.status === "loading"}
            isOwner={state.isOwner !== false}
            seccion={seccionActiva}
          />
        )}
        <Body
          state={state}
          entradas={entradasDeLaSeccion}
          section={section}
          onSection={setSection}
        />
      </Flex>
    </Box>
  );
}

/**
 * Encabezado. El nombre del proyecto va al lado del título, en gris y truncado: adentro de monday
 * el ancho es poco, y un nombre largo no puede empujar al título fuera de la pantalla.
 */
function Header({ itemName, seccion }) {
  return (
    <Flex direction="column" gap="xs" align="start">
      <Flex gap="small" align="end" wrap style={{ minWidth: 0 }}>
        {/* El título es la sección abierta: así el costado se entiende sin explicación. */}
        <Heading type="h2">{seccion.label}</Heading>
        {itemName ? (
          <Text type="text1" color="secondary" ellipsis style={{ paddingBottom: 2 }}>
            {itemName}
          </Text>
        ) : null}
      </Flex>
      <Text type="text2" color="secondary">
        {`Private history of the "${seccion.sourceColumn}" column.`}
      </Text>
    </Flex>
  );
}

/** Círculo de color con un ícono adentro. El violeta es acento de marca, no un token de Vibe. */
function IconChip({ children }) {
  return <span className="pch-chip">{children}</span>;
}

/**
 * Contador y aviso de privacidad, juntos en una sola tarjeta. Se apilan si falta ancho.
 *
 * El texto de privacidad cambia según quién mira: decirle "Only visible to you" a un
 * administrador suscripto al board sería mentirle.
 */
function SummaryCard({ count, loading, isOwner, seccion }) {
  return (
    <Card>
      <Flex gap="medium" align="center" wrap>
        <Flex gap="small" align="center" style={{ flex: "1 1 180px", minWidth: 0 }}>
          <IconChip>
            <Comment size={20} />
          </IconChip>
          <Flex direction="column" align="start">
            {loading ? (
              <Skeleton type="rectangle" size="custom" width={40} height={26} />
            ) : (
              <Heading type="h1">{count ?? 0}</Heading>
            )}
            {/* El número es el de la sección abierta, así que el rótulo la nombra.
                Antes decía "Total comments" y cambiaba al clickear el costado: se leía como un bug. */}
            <Text type="text2" color="secondary">
              {`In ${seccion.label}`}
            </Text>
          </Flex>
        </Flex>

        <Divider direction="vertical" />

        <Flex gap="small" align="center" style={{ flex: "1 1 180px", minWidth: 0 }}>
          <IconChip>
            <Locked size={20} />
          </IconChip>
          <Flex direction="column" align="start">
            <Text type="text1" weight="medium">
              {isOwner ? "Only visible to you" : "Private history"}
            </Text>
            <Text type="text2" color="secondary">
              {isOwner ? "Private and secure" : "Visible to board subscribers only"}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

/** Navegación de secciones + feed. En angosto la navegación se va arriba. */
function Body({ state, entradas, section, onSection }) {
  return (
    <Flex gap="medium" align="start" wrap>
      <Box style={{ flex: "1 1 180px", minWidth: 0, maxWidth: "100%" }}>
        <SectionNav active={section} onSelect={onSection} entries={state.entries} />
      </Box>
      <Box style={{ flex: "3 1 320px", minWidth: 0 }}>
        <Feed state={state} entradas={entradas} />
      </Box>
    </Flex>
  );
}

/** Las cuatro columnas, con cuántas entradas tiene cada una. Todas se pueden abrir. */
function SectionNav({ active, onSelect, entries }) {
  return (
    <Flex direction="column" gap="xs" align="stretch">
      {SECTIONS.map((s) => {
        const isActive = s.key === active;
        const cuantas = (entries || []).filter((e) => e.sourceColumn === s.sourceColumn).length;
        // El onClick va en el Flex: Box no expone onClick en su API.
        return (
          <Flex
            key={s.key}
            direction="column"
            align="stretch"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(s.key)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(s.key)}
            style={{ cursor: "pointer" }}
          >
            <Box
              padding="small"
              rounded="small"
              backgroundColor={isActive ? "secondaryBackgroundColor" : undefined}
            >
              <Flex gap="small" align="center" justify="space-between">
                <Text type="text2" weight={isActive ? "bold" : "normal"} ellipsis>
                  {s.label}
                </Text>
                {entries ? (
                  <Text type="text2" color="secondary">
                    {cuantas}
                  </Text>
                ) : null}
              </Flex>
            </Box>
          </Flex>
        );
      })}
    </Flex>
  );
}

function Feed({ state, entradas }) {
  if (state.status === "loading") return <FeedSkeleton />;

  // Abrir la app fuera de un ítem no es un error del usuario: no lo trates como tal.
  if (state.noItem)
    return (
      <Message
        title="No item selected"
        body={"Open this app from a monday item to see its comment history." + (state.pistaDeDev || "")}
      />
    );

  if (state.status === "error")
    return (
      <Message
        title="Something went wrong"
        body={state.message || "We couldn't load your comments. Please try again."}
      />
    );

  if (!state.hasAccess)
    return (
      <Message
        title="This information is private"
        body="Only the owner of these comments can see this history."
      />
    );

  if (!entradas.length)
    return (
      <Message
        title="No entries yet"
        body="Changes to this column will appear here, newest first."
      />
    );

  return (
    <Flex direction="column" gap="small" align="stretch">
      <Text type="text1" weight="medium">
        History
      </Text>
      <div>
        {entradas.map((e) => (
          <TimelineRow key={e.id}>
            <Card>
              <Flex direction="column" gap="xs" align="start">
                <Flex gap="medium" align="center" wrap>
                  <Meta icon={<Calendar size={16} />} text={formatDate(e.createdAt)} />
                  <Meta icon={<Time size={16} />} text={formatTime(e.createdAt)} />
                </Flex>
                <Text type="text1" style={{ whiteSpace: "pre-wrap" }}>
                  {e.text}
                </Text>
              </Flex>
            </Card>
          </TimelineRow>
        ))}
      </div>
    </Flex>
  );
}

/** Una fila de la línea de tiempo: punto + línea de conexión + la tarjeta. */
function TimelineRow({ children }) {
  return (
    <div className="pch-row">
      <div className="pch-rail">
        <span className="pch-dot" />
        <span className="pch-line" />
      </div>
      <div className="pch-card-wrap">{children}</div>
    </div>
  );
}

/** Ícono chiquito + texto, para la fecha y la hora. */
function Meta({ icon, text }) {
  return (
    <Flex gap="xs" align="center">
      <span className="pch-meta-icon">{icon}</span>
      <Text type="text2" color="secondary">
        {text}
      </Text>
    </Flex>
  );
}

function FeedSkeleton() {
  return (
    <Flex direction="column" gap="small" align="stretch">
      <div>
        {[0, 1, 2].map((i) => (
          <TimelineRow key={i}>
            <Card>
              <Flex direction="column" gap="xs" align="start">
                <Skeleton type="rectangle" size="custom" width={160} height={14} />
                <Skeleton type="rectangle" size="custom" width={280} height={14} />
              </Flex>
            </Card>
          </TimelineRow>
        ))}
      </div>
    </Flex>
  );
}

function Message({ title, body }) {
  return (
    <Card>
      <Flex direction="column" gap="xs" align="start">
        <Text type="text1" weight="medium">
          {title}
        </Text>
        <Text type="text2" color="secondary">
          {body}
        </Text>
      </Flex>
    </Card>
  );
}

/** Tarjeta base. Usa tokens de Vibe, así que se adapta a tema claro y oscuro. */
function Card({ children }) {
  return (
    <Box
      padding="medium"
      rounded="medium"
      border
      borderColor="uiBorderColor"
      backgroundColor="secondaryBackgroundColor"
      style={{ minWidth: 0 }}
    >
      {children}
    </Box>
  );
}
