# Correcciones del primer build

Un archivo = un mensaje a vibe. **De a uno, en orden, verificando entre cada uno.**

El primer intento fue un solo mensaje con los 4 cambios juntos y vibe respondió:
*"I ran into a problem... Could you try breaking it into smaller steps?"*

Estaba escrito como un informe de diagnóstico ("el estado inicial tiene X, y el if corta antes
de Y"). Para una corrección chica eso confunde: vibe tiene que deducir qué hacer a partir de una
explicación de por qué está mal. Estos cuatro dicen **qué cambiar y por cuál valor**, y nada más.

| Orden | Archivo | Qué arregla | Cómo verificar |
|---|---|---|---|
| 1 | `A-arranque.txt` | La app mostraba "No item selected" antes de saber si había ítem | Que ya no aparezca ese cartel apenas abre |
| 2 | `B-tema.txt` | El modo oscuro no hacía nada: las clases CSS no coincidían | Cambiar monday a oscuro y ver que la app acompaña |
| 3 | `C-body.txt` | Marco claro alrededor de la app en modo oscuro | Que el fondo sea oscuro hasta los bordes |
| 4 | `D-context.txt` | Si falla la lectura del contexto, la app quedaba colgada sin avisar | No se ve; es una red de seguridad |

**Modelo:** Gemini flash. Son cambios de una o dos líneas.

**Si alguno vuelve a fallar:** partilo todavía más, o mandá solo la primera mitad. Un mensaje que
falla no cuesta el build, pero sí cuesta tiempo.

---

## Los 4 son de armado, no de lógica

Vale la pena tenerlo presente: **la lógica de datos salió perfecta en el primer build.**
Paginación con cursor, husos horarios, `boards` vacío como falta de permiso, desempate del orden,
nombre de respaldo — todo lo que costó tres rondas de prueba ciega, transcrito sin un error.

Lo que falló fue lo de alrededor: un estado inicial, dos clases CSS que no se cruzaban, un
`.catch` que faltaba. Eso es lo que compra un prompt validado: que lo que quede sea barato.
