# Faltan 3 capturas

Ya están guardadas `4-ancho-vacio.png` y `5-angosto-vacio.png` — esas sirven.

⚠️ **Las capturas de las 14:44 NO sirven:** muestran el rótulo `"Total comments"`, que se cambió
después por `"In <nombre de la sección>"`. Mandarle a vibe una imagen que contradice el prompt es
pedirle que construya el rótulo viejo.

**Regla general:** cada vez que se toca la UI, las capturas viejas caducan. Sacalas SIEMPRE al
final, con la app ya terminada.

---

## Las 3 que faltan

Todas desde: **http://localhost:5173/?itemId=3081342422**

### 1-ancho-timeline.png
- Clic en **Action Plan** (tiene 17 entradas)
- Ventana **maximizada**
- Tiene que verse: la línea de tiempo con varias tarjetas conectadas por los puntos violetas,
  la barra lateral con los 5 contadores, y la tarjeta de resumen diciendo **"In Action Plan"**

### 2-angosto-timeline.png
- La misma sección **Action Plan**
- Ventana achicada a **la mitad de la pantalla** (arrastrando el borde derecho)
- Tiene que verse cómo la barra lateral se va **arriba** del feed y la tarjeta de resumen se apila

### 3-oscuro.png
- URL: **http://localhost:5173/?itemId=3081342422&theme=dark**
- Ancho normal
- Es la única forma de que vibe copie los colores del tema oscuro

---

## Dónde dejarlas

En esta misma carpeta. Cuando estén las 5, se adjuntan todas juntas al prompt.

## Cómo verificar antes de mandarlas

- [ ] El contador dice **"In <sección>"**, no "Total comments"
- [ ] En la angosta, la barra lateral está **arriba** del feed
- [ ] No se corta ningún texto en el borde derecho
- [ ] En la oscura, el fondo es oscuro **hasta los bordes** (sin marco blanco)
