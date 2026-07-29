# Private Comments History

App de [monday.com](https://monday.com) (**item view**, solo lectura) que muestra el historial de
una columna de texto.

## El problema que resuelve

Las columnas de texto de monday **se reemplazan** en cada edición: no guardan versiones. Cuando el
contenido de una columna es valioso —comentarios, notas de seguimiento— ese historial se pierde.

La solución habitual es una automatización que copia cada cambio a los **Updates** del ítem, pero
los Updates **los ve todo el tablero**. Si el contenido tiene que ser privado, no sirve.

## Cómo funciona

```
cambia la columna  →  [automatización de monday]  →  ítem nuevo en un board PRIVADO
                                                              ↓
                                                     esta app lo muestra
```

- La **automatización** es la que captura los cambios: corre siempre, aun con la app cerrada.
- El **board privado** es el que garantiza la privacidad, del lado del servidor. Quien no está
  suscripto no recibe datos, aunque abra las DevTools.
- La **app** solo lee y ordena. **No escribe nada en monday.**

Cada entrada del historial se vincula a su ítem de origen con una columna *Connect boards*, que es
por donde la app filtra.

## Stack

React 18 + Vite + [`@vibe/core`](https://vibe.monday.com) (el design system de monday) +
`monday-sdk-js`. Sin backend propio: dentro de monday usa la sesión del usuario; fuera, una función
serverless en `api/` que guarda el token del lado del servidor.

## Correrlo

```bash
npm install
cp .env.example .env.local     # completar los valores
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local. Incluye el proxy `/api/monday`, así que anda con datos reales sin Vercel |
| `npm run build` | Compila para producción |
| `npm run verificar` | **Comprueba que la app DIBUJA**, no solo que compila |

> `npm run build` puede pasar en verde con la app rota: una prop inexistente de Vibe compila bien y
> explota recién en runtime, dejando la pantalla en blanco. Por eso existe `npm run verificar`.

Fuera de monday no hay ítem abierto, así que se puede simular por querystring:

```
http://localhost:5173/?itemId=<id>
http://localhost:5173/?itemId=<id>&theme=dark
```

## Configuración

Los IDs de boards y columnas están en [`src/lib/monday.js`](src/lib/monday.js). El resto va por
variables de entorno (ver [`.env.example`](.env.example)):

| Variable | Dónde vive | Para qué |
|---|---|---|
| `MONDAY_TOKEN` | **Solo servidor** (nunca con prefijo `VITE_`) | Lo usa la función serverless |
| `VITE_OWNER_EMAIL` | Build | Para saludar a la dueña del historial. No es una medida de seguridad |
| `VITE_SOURCE_COLUMN` | Build | Nombre de la columna de origen, se muestra en pantalla |
| `VITE_MONDAY_MOCK` | Build | `1` para datos de ejemplo, sin red |

---

Hecho por [The Automation Partner](https://theautomationpartner.com).
