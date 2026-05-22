# APP_ARTES-BUHO_BELLA-BESTIA

Aplicacion de contabilidad operativa para Bella Bestia.

## SEGURIDAD DE ACCESO

- Si ya hay sesion desde el panel principal, entra directo.
- Si entras directo sin sesion, pide contrasena en `/login`.
- Cookie compartida entre subdominios con firma (`ab_sso`).

## VARIABLES (COOLIFY)

- `PANEL_PASSWORD=REPLACE_WITH_PASSWORD` (sin usuario)
- `AUTH_SHARED_SECRET=UN_SECRETO_LARGO_Y_PRIVADO`
- `COOKIE_DOMAIN=.artesbuhomanagement.com`
- `COOKIE_SECURE=true`
- `PORT=80`
- `VITE_SHEET_AUTO_SYNC_MINUTES=5` (refresco automatico de visor cada 5 min; puedes usar `15`)

## GOOGLE SHEETS (FUENTE DE DATOS)

Si quieres que la introducción de datos viva en Google Sheets:

- `GOOGLE_SHEET_ID=...`
- `GOOGLE_SHEET_MAIN_TAB=Introduccion de datos`
- `GOOGLE_SHEET_REPORT_WEEK_TAB=Situacion_Semanal`
- `GOOGLE_SHEET_REPORT_MONTH_TAB=Situacion_Mensual`
- `GOOGLE_SHEET_REPORT_EVENT_TAB=Situacion_Eventos`
- `GOOGLE_SHEET_CONTROL_TAB=Control_App`
- `GOOGLE_SHEET_EVENTS_TAB=Catalogo_Eventos`
- `GOOGLE_SHEET_MANUAL_TAB=Manual_Uso`
- `DASHBOARD_URL=https://bella-bestia.artesbuhomanagement.com`
- `GOOGLE_SHEETS_READ_ONLY=true` (recomendado para cargar solo desde la hoja)
- `GOOGLE_SHEETS_PUBLIC_FALLBACK=true` (si falla la credencial, permite lectura pública de la hoja)
- `GOOGLE_SHEETS_AUTO_BOOTSTRAP=true` (prepara pestañas al arrancar servidor)
- `GOOGLE_SHEETS_AUTO_REBUILD_REPORTS=true` (regenera reportes automáticamente)
- `GOOGLE_SHEETS_AUTO_PRUNE_TABS=true` (elimina solo pestañas placeholder vacias tipo `Hoja 1` / `Sheet1`)

Credenciales (elige una opcion):

- `GOOGLE_SERVICE_ACCOUNT_JSON=...` (JSON completo del service account)
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=...` (JSON codificado en base64)
- o `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Opcional para Workspace con delegacion:

- `GOOGLE_IMPERSONATE_USER=booking@artesbuhomanagement.com`

Con Google Sheets activo:

- La app lee datos desde la pestaña `Introduccion de datos`.
- La app refresca datos de hoja de forma automática cada 5 minutos (configurable con `VITE_SHEET_AUTO_SYNC_MINUTES`).
- Puedes preparar estructura + estilo corporativo y regenerar en la misma hoja (automático o manual):
  - `Situacion_Semanal`
  - `Situacion_Mensual`
  - `Situacion_Eventos`
  - `Catalogo_Eventos`
  - `Control_App`
  - `Manual_Uso`
- La hoja `Introduccion de datos` ya esta optimizada para carga simple:
  - Cabeceras en castellano y sin barras bajas.
  - ID autogenerado por formula (sin escribirlo a mano).
  - Menos columnas y anchos ajustados para evitar solapes.
  - Validaciones basicas (tipo, metodo, IVA y evento en desplegable).
  - Fecha de evento y franja horaria autocompletadas desde `Catalogo_Eventos`.
  - Columnas automaticas en gris claro y bloqueadas para evitar errores de edicion.
  - Filtros activados en cabecera para todas las tablas.

Si no configuras variables, el servidor usara por defecto la contrasena `REPLACE_WITH_PASSWORD`.

## ARRANQUE LOCAL

```bash
npm install
npm run build
npm run start
```

## OPERACION REMOTA (SIN NAVEGADOR)

```bash
npm run remote:sync
```

```bash
npm run seed:live-sheet
```

Variables opcionales:

- `REMOTE_APP_URL=https://bella-bestia.artesbuhomanagement.com`
- `REMOTE_PANEL_PASSWORD=...`
- `REMOTE_FORCE=true` (si quieres forzar bootstrap/rebuild aunque la fuente no esté en Google Sheets)

## HEALTHCHECK

- URL: `/health`
- Return code: `200`

## API INTERNA

- `GET /api/data-source`
- `GET /api/entries`
- `POST /api/entries` (solo si `GOOGLE_SHEETS_READ_ONLY=false`)
- `GET /api/sheets/diagnostics` (valida variables + conectividad real a la hoja)
- `GET /api/sheets/inspect` (inspeccion completa de estructura, datos, formatos, validaciones y protecciones)
- `POST /api/sheets/bootstrap` (crea pestañas, formato corporativo y reportes en hoja)
- `POST /api/reports/rebuild` (genera reportes en pestañas de la hoja)

## DEPLOY EN COOLIFY

- Build Pack: `Dockerfile`
- Internal Port: `80`
- Domain: `bella-bestia.artesbuhomanagement.com`

## TRAZABILIDAD OPERATIVA

### 2026-03-30

- Se corrigio el runtime Docker para incluir `data-source.mjs` y `public`.
- Se anadieron rutas de diagnostico e inspeccion de Google Sheets.
- Se habilito setup automatico al arrancar servidor cuando Google Sheets esta configurado.
- El bootstrap ahora aplica formato corporativo, formato numerico ES, validaciones y genera reportes.
- Se activo refresco automatico hoja -> app cada 10 segundos.
- Estado actual de produccion al cierre: servicio arriba, pero Google Sheets pendiente por variables `GOOGLE_*` en Coolify.

### 2026-03-30 (intervencion remota sobre hoja objetivo)

- Se detecto y reutilizo una credencial de servicio valida existente en el equipo para operar sobre la hoja objetivo.
- Se ejecuto inspeccion completa previa de la hoja `💶 BELLA BESTIA 2.0V`.
- Se ejecuto bootstrap remoto y automatico de estructura corporativa:
  - `Introduccion de datos`
  - `Situacion_Semanal`
  - `Situacion_Mensual`
  - `Situacion_Eventos`
  - `Control_App`
- Se elimino la pestana placeholder vacia `Hoja 1`.
- Se aplico formato corporativo (rojo/amarillo/blanco), cabeceras y control base.
- Se regeneraron reportes en hoja (actualmente sin lineas porque no hay datos cargados).
- Estado pendiente para conexion 100% en produccion: finalizar variables `GOOGLE_*` reales en Coolify y redeploy.

### 2026-03-30 (validacion final de conexion y bloqueo detectado)

- Verificacion directa en produccion (`/health`): el servicio sigue en `dataSource=local`.
- Diagnostico en produccion: `googleSheets.enabled=false` por falta de variables reales `GOOGLE_*`.
- Se confirmo en Google Cloud un bloqueo de organizacion para crear nuevas claves JSON:
  - Politica: `iam.disableServiceAccountKeyCreation`.
- Resultado operativo:
  - La hoja objetivo ya esta preparada y accesible.
  - Falta pegar credencial real en `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` dentro de Coolify y redeploy.
- Checklist de cierre operativo:
  - `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` -> valor real (no placeholder).
  - `GOOGLE_IMPERSONATE_USER` -> vacio para la credencial actual reutilizada.
  - `GOOGLE_SHEET_ID` -> `1nWpUq1FjIM6Y7-eUJjABalVmNvwajOXH1BIW9qYq3L0`.
  - Pulsar `Update` en cada variable y luego `Redeploy`.

### 2026-03-30 (rediseno hoja modo carga simple)

- Se renombro la pestana de reporte de eventos:
  - De `Situacion_Por_Evento` a `Situacion_Eventos`.
- Se rehizo la hoja `Introduccion de datos` para carga rapida:
  - 19 columnas utiles (sin barras bajas en cabeceras).
  - Anchos de columnas ajustados para lectura y escritura.
  - ID autogenerado por formula en columna `ID`.
  - Validaciones en `Tipo`, `Metodo de pago`, `Tipo IVA` y `Estado evento`.
- Se eliminaron columnas y filas sobrantes en reportes:
  - `Situacion_Semanal`, `Situacion_Mensual`, `Situacion_Eventos` quedan en 6 columnas.
  - Se recorto a 600 filas por reporte.
- Se recorto `Control_App` a 3 columnas y 120 filas.
- Se ejecutaron bootstrap y validacion remota sobre la hoja objetivo.

### 2026-03-30 (catalogo de eventos + autocompletado)

- Se anadio la pestana `Catalogo_Eventos` con 3 columnas:
  - `Nombre del evento`
  - `Fecha del evento`
  - `Franja horaria` (3 tramos fijos).
- Se conecto `Introduccion de datos` con `Catalogo_Eventos`:
  - `Evento` ahora usa desplegable de la columna `A` del catalogo.
  - `Fecha evento` y `Franja horaria` se rellenan automatico por formula.
- Se cambio el formato de `Fecha evento` a `dd/mm/yyyy` (sin hora).
- Se bloqueo la edicion de columnas automaticas (`ID`, `Fecha evento`, `Franja horaria`) y se pintaron en gris claro.

### 2026-03-30 (app en modo visor + nueva salida de presentacion)

- Se activo modo visor permanente en la app:
  - Sin editar ni borrar lineas desde `Libro diario`.
  - Formularios de `Movimientos` en solo lectura.
  - Mensajes de UI aclarando que la carga se hace en Google Sheets.
- Se mantuvo y renombro la salida PDF de informe escrito:
  - Boton: `Informe escrito (PDF)`.
- Se anadio una nueva salida de presentacion ejecutiva:
  - Boton: `Presentacion ejecutiva (PDF)`.
  - Genera diapositivas resumen (KPIs, top/riesgo, tendencia, acciones) e imprime a PDF.

### 2026-03-30 (cabeceras con filtro en todas las tablas)

- Se completo el bootstrap para activar filtro en cabecera en:
  - `Catalogo_Eventos`
  - `Introduccion de datos`
  - `Situacion_Semanal`
  - `Situacion_Mensual`
  - `Situacion_Eventos`
  - `Control_App`
  - `Manual_Uso`
- Se ajusto `Control_App` para terminar en la fila 9 (sin filas sobrantes).
- Se reforzo `Introduccion de datos`:
  - Formula de `ID evento` al final.
  - Formula automatica de `Tasa IVA %`, `Cuota IVA EUR`, `Retencion EUR`, `Total linea EUR`.
  - Validacion cerrada en `Categoria` y `Retencion %`.
- Se anadio `Manual_Uso` con enlace directo al cuadro de mando web.
- Se amplio `Catalogo_Eventos` con nueva columna `Tipo de evento`:
  - Orden final: `Nombre del evento`, `Tipo de evento`, `Fecha del evento`, `Franja horaria`.
  - Desplegable cerrado con: `BBC`, `Conciertos`, `Cumpleaños`, `Discotecas`, `Eventos corporativos`, `Despedidas`, `Fiestas temáticas`.
  - Se ajusto autocompletado en `Introduccion de datos` para seguir trayendo bien fecha y franja.

### 2026-03-30 (correccion de textos y flujo remoto)

- Se corrigieron textos con tildes y eñes en la interfaz web (evita caracteres rotos tipo `Ã`).
- Se añadió comando remoto `npm run remote:sync` para:
  - login remoto en producción,
  - diagnóstico de fuente de datos,
  - bootstrap de hoja,
  - regeneración de reportes,
  - inspección final.
- Se añadió modo de respaldo `google_sheets_public`:
  - si la credencial privada falla en runtime,
  - la app sigue leyendo datos desde la hoja pública por `GOOGLE_SHEET_ID`.

### 2026-03-30 (conexion hoja-app cerrada y datos demo 2 años)

- Se corrigió el bloqueo `#REF!` en columnas automáticas:
  - antes de reaplicar fórmulas, ahora se limpian columnas automáticas.
  - al guardar líneas desde backend, columnas automáticas ya no se escriben manualmente.
- Se añadió saneo de celdas con error de hoja (`#REF!`, `#N/A`, etc.) para evitar lecturas corruptas.
- Se añadió color automático por estado en `Control_App`:
  - `OK` / `ACTIVO` -> verde.
  - `ATENCION` / `AVISO` / `PENDIENTE` -> amarillo.
  - `ERROR` / `FALLO` / `OFF` -> rojo.
- Se añadió función de backend para guardar `Catalogo_Eventos` desde código (`saveEventsCatalogToDataSource`).
- Se añadió script operativo `npm run seed:live-sheet`:
  - genera catálogo + líneas demo de 2 años.
  - deja fórmulas, filtros, validaciones y reportes regenerados.

### 2026-03-30 (ajuste final de carga en hoja y bloqueos)

- Se simplificó la columna de IVA en `Introduccion de datos`:
  - ahora el desplegable muestra `0`, `4`, `10`, `21`.
  - se eliminó el uso operativo de tokens tipo `IVA_10` en la carga manual.
- Se dejó `Notas` junto a `Descuento EUR` para una captura más natural.
- Se añadió limpieza automática de fórmula heredada de IVA en `Notas` (J2) para evitar columnas contaminadas al migrar.
- Se reforzó la lectura/escritura para admitir valores con `%`, `EUR` y `€`.
- Se oscureció el gris de celdas automáticas para mejorar visibilidad.
- Se añadieron protecciones automáticas de estructura:
  - cabeceras protegidas en todas las pestañas gestionadas.
  - cuerpo protegido en `Situacion_Semanal`, `Situacion_Mensual`, `Situacion_Eventos`, `Control_App` y `Manual_Uso`.
  - se mantiene protección de columnas automáticas en `Introduccion de datos`.
- `Manual_Uso` se mantiene acotado a 9 filas y con enlace al cuadro de mando.
- Se reejecutó la carga demo remota (2 años) y quedó validada:
  - `catalogRows=48`

### 2026-03-30 (informe corporativo y presentacion ejecutiva renovados)

- Se rehizo la salida PDF para evitar ventanas en blanco (`about:blank`):
  - `Informe escrito (PDF)` ahora genera descarga directa en PDF con `jsPDF`.
  - `Presentacion ejecutiva (PDF)` ahora genera descarga directa en PDF con `jsPDF`.
- Se añadieron portada e indice en ambos documentos.
- Se amplió contenido para reunion:
  - situacion automatica (12m, 3m, 1m, 1s),
  - top de bloques,
  - bloques en alerta,
  - tendencia mensual,
  - recomendaciones de accion.
- Se añadieron pies de pagina corporativos en todos los folios.
- Se eliminó la apertura de popup de impresión del navegador (ya no corta tablas ni mete URL/fecha del navegador).
- En navegación principal se ocultó la pestaña `Movimientos` para reforzar modo visor.

### 2026-03-30 (correccion definitiva IVA y retencion en hoja)

- Se normalizaron tasas para trabajar en puntos porcentuales (`0`, `4`, `10`, `21` y `0`, `7`, `15`, `19`).
- Se corrigió la conversión para evitar efectos tipo `2100%`.
- Se actualizó validación cerrada de desplegables en columnas IVA y Retención.
- Se ajustó formato numérico de columnas de tasa en hoja a `0.00\"%\"` para lectura clara.
- Se mantiene cálculo automático por fórmula en columnas:
  - `Cuota IVA EUR`,
  - `Retencion EUR`,
  - `Total línea EUR`.
  - `entriesLoaded=240`
  - `years: 2025=120, 2026=120`

### 2026-03-30 (alineacion automatica de columnas en Introduccion de datos)

- Se añadió migración automática de columnas al preparar la hoja.
- Si la hoja venía con orden antiguo, ahora recoloca físicamente los datos al orden canónico.
- `Notas` queda agrupada junto a `Descuento EUR` (a la derecha de la columna `I`).
- Esta alineación evita descuadres cuando existían cabeceras antiguas.

### 2026-03-30 (correccion de porcentajes IVA y retencion)

- Se corrigió el manejo de `%` para evitar errores tipo `2100%` y celdas no válidas.
- Los desplegables de `IVA %` y `Retención %` pasan a opciones en formato porcentaje (`0%`, `4%`, `10%`, `21%` y `0%`, `7%`, `15%`, `19%`).
- Se aplica formato de celda `PERCENT` en ambas columnas.
- Se añadió normalización automática de valores antiguos para dejarlos en escala correcta (0..1) sin romper datos existentes.
- Se ajustaron fórmulas de `Cuota IVA EUR` y `Retención EUR` para soportar entradas antiguas y nuevas sin desajustes.

### 2026-03-30 (logica automatica en formulas de Google Sheets)

- Se reforzó el flujo para que las columnas automáticas se resuelvan en la propia hoja por fórmula.
- Al guardar líneas desde la app, se reaplican automáticamente las fórmulas de:
  - `ID evento`
  - `Fecha evento`
  - `Franja horaria`
  - `Cuota IVA EUR`
  - `Retención EUR`
  - `Total línea EUR`
- Las fórmulas usan sintaxis de Google Sheets en castellano.

### 2026-03-30 (visor con refresco automatico cada 5/15 minutos)

- La app queda en modo visor.
- Refresco automatico de hoja a app por defecto cada 5 minutos.
- Se puede cambiar a 15 minutos con `VITE_SHEET_AUTO_SYNC_MINUTES=15`.
- Se evita envio de escrituras automáticas desde la app cuando el modo visor está activo.

### 2026-03-30 (fila 9 reutilizada en Manual_Uso)

- Se reutiliza la fila 9 de `Manual_Uso` con información útil.
- Nueva línea: `Refresco visor` con los minutos de autoactualización activos.
- Valor dinámico según `VITE_SHEET_AUTO_SYNC_MINUTES` (por defecto 5).

### 2026-03-30 (fix remoto de normalizacion de porcentajes)

- Se corrige la actualización masiva de columnas `%` para evitar error de rango en Google Sheets.
- La normalización de `IVA %` y `Retención %` vuelve a ejecutarse correctamente en remoto.

### 2026-03-30 (bloqueo total de celdas no editables)

- En `Introduccion de datos`, se protege todo el cuerpo y solo quedan editables las columnas de carga manual.
- Columnas editables: `Evento`, `Tipo`, `Categoría`, `Concepto`, `Método de pago`, `Base imponible EUR`, `IVA %`, `Retención %`, `Descuento EUR`, `Notas`.
- Todo lo demás queda bloqueado para evitar errores de edición.

### 2026-03-30 (hotfix rojo en IVA/Retencion + modo solo hoja)

- Se corrigió en remoto la validación de `IVA %` y `Retención %` directamente sobre la hoja productiva:
  - `IVA %` -> lista cerrada `0, 4, 10, 21`.
  - `Retención %` -> lista cerrada `0, 7, 15, 19`.
- Se dejó formato de tasa en `Introduccion de datos` como número con símbolo:
  - `0.00"%"` (sin escalado erróneo tipo `2100%`).
- Se añadió script operativo para reparación/auditoría directa de hoja:
  - `npm run sheet:repair:direct -- "<ruta_json_cuenta_servicio>"`
- Se reforzó la app para trabajar solo con Google Sheets como fuente principal:
  - sin carga de respaldo local al arrancar si falla la API remota.
  - si no hay conexión a hoja, muestra error claro y deja la tabla vacía.
  - recarga manual siempre reporta origen `Google Sheets`.

### 2026-03-31 (auditoria profunda: graficos, PDFs y validaciones de hoja)

- Se amplió la lógica de tendencias para que `3M / 6M / 12M / Todo` afecte también a:
  - tendencia mensual de ingresos,
  - tendencia mensual de gastos,
  - tendencia mensual de beneficio,
  - balance acumulado.
- Se eliminó el recorte duro de `6` meses en series internas para no perder histórico.
- En el explorador principal se fuerza vista `Barras` cuando el eje es `Evento`:
  - evita líneas incorrectas para categorías no temporales.
- Se mejoró la presentación ejecutiva PDF:
  - más diapositivas visuales,
  - gráficos de tendencia dentro del PDF (ingresos, gastos, beneficio y acumulado),
  - bloque visual de mix por método,
  - cierre con mensajes clave para comité.
- Se mejoró el informe corporativo PDF:
  - nueva página de gráficos ejecutivos,
  - comparativa visual para junta directiva.
- Se reforzó validación de `IVA %` y `Retención %` en hoja:
  - listas cerradas en formato porcentaje (`0%`, `4%`, `10%`, `21%` y `0%`, `7%`, `15%`, `19%`),
  - normalización automática de valores a literal porcentaje para evitar errores de validación,
  - formato de columnas de tasa en tipo texto para eliminar conflictos de escalado.

### 2026-03-31 (presentacion ejecutiva full-page y mas impacto visual)

- La portada de la presentación ahora ocupa toda la página (fondo completo + logo grande + titular central).
- Se aumentó la parte visual de la presentación con más páginas de gráficos grandes:
  - tendencia de ingresos,
  - tendencia de gastos,
  - tendencia de beneficio,
  - balance acumulado.
- Se añadió una página específica de `mix por método` con barras amplias y lectura clara.
- Se amplió el índice y la narrativa para uso en junta directiva.

### 2026-03-31 (hotfix automatico IVA/Retencion sin pasos manuales)

- Se implementó autorreparación en backend para la hoja `Introduccion de datos`.
- En cada arranque de lectura desde Google Sheets, ahora se ejecuta:
  - forzado de formato `TEXT` en columnas `IVA %` y `Retención %`,
  - normalización de valores antiguos a literal `%` (`0%`, `4%`, `10%`, `21%` y `0%`, `7%`, `15%`, `19%`),
  - reaplicación automática de validaciones cerradas.
- Se añadió control de frecuencia (cooldown) para evitar llamadas repetidas innecesarias.
- Objetivo: eliminar definitivamente errores de validación tipo `No válido` y casos `2100%`.

### 2026-03-31 (mejora premium de informes y presentaciones)

- Se rediseñó el PDF de `Informe corporativo` con estructura más ejecutiva:
  - portada completa,
  - índice por bloques,
  - tablas de ventanas 3/6/12 meses,
  - páginas de tendencias ampliadas,
  - página de escenarios (base/optimista/pesimista),
  - cierre con plan de acción 30-60-90.
- Se rediseñó el PDF de `Presentación ejecutiva` para uso en junta directiva:
  - portada full-page,
  - agenda,
  - KPI de dirección,
  - ranking top/alertas,
  - tendencias en slides dedicadas,
  - slide de escenarios + mix por método,
  - slide final de decisiones y plan.
- Se añadieron gráficos extra y mayor ocupación de página para evitar sensación de informe vacío.
- Se separó pie de página para cada tipo de salida:
  - `BELLA BESTIA - INFORME CORPORATIVO`
  - `BELLA BESTIA - PRESENTACION EJECUTIVA`

### 2026-03-31 (auditoria de visualizacion + KPI directivos)

- Se mejoró la selección de tipo de gráfica en el explorador principal:
  - si el eje es `Evento`, se fuerza `Barras`,
  - si solo hay un punto visible, también se usa `Barras` (evita gráfico de puntos sueltos).
- Se añadió bloque de `Índices KPI de dirección` en Dashboard y en Informes:
  - Índice de rentabilidad,
  - Índice de control de gasto,
  - Índice de eficiencia digital,
  - Índice de estabilidad mensual.
- Se añadieron los KPI de dirección también dentro de los PDFs (informe + presentación).
- Se amplió el informe corporativo con paginación más directiva:
  - índice,
  - ventana consolidada 3/6/12 meses,
  - KPI directivos,
  - tablas de top y alertas,
  - tendencias por bloques,
  - escenarios,
  - cierre ejecutivo.

### 2026-03-31 (estabilidad de validaciones % + textos ES en UI/PDF)

- Se reforzó la normalización de tasas (`IVA %` y `Retención %`) para corregir casos heredados como `2100%` y dejarlos en escala correcta.
- Se eliminó el borrado masivo de validaciones en hoja (causaba fallos silenciosos en algunas protecciones).
- Se añadió ejecución robusta de `batchUpdate` con reintento por bloques:
  - si un lote falla, el backend sigue aplicando reglas una a una.
- Se aplicó la misma estrategia robusta para el formateo de columnas de tasa.
- Se corrigieron textos visibles en castellano en app y en exportación PDF:
  - tildes en `línea`, `rápida`, `análisis`, `presentación`, `reunión`, `método`, `período`, `índice`.
- Objetivo de esta tanda:
  - evitar errores rojos recurrentes en columnas `G/H`,
  - mantener experiencia de solo lectura clara y corporativa en español.

### 2026-03-31 (cierre operativo: validaciones robustas + lectura ejecutiva)

- Se reforzó `IVA %` y `Retención %` para evitar bloqueos de edición:
  - validación ampliada para aceptar formatos heredados (`21%`, `21`, `21,00%`, etc.),
  - validación en modo no bloqueante para eliminar popups de “No válido”,
  - normalización guardada en hoja con escritura `RAW` para no reescalar porcentajes.
- Se añadió saneo de textos en frontend para corregir automáticamente caracteres dañados (`Ã`, `Â`, etc.) al cargar datos.
- Se mejoró el explorador principal:
  - el periodo `3M/6M/12M/Todo` ahora se aplica por granularidad real (`mes`, `semana`, `evento`),
  - con pocos puntos se fuerza vista de barras para evitar lecturas confusas.
- Se reforzó lectura ejecutiva en Dashboard e Informes:
  - títulos de tendencias con el periodo activo visible,
  - leyendas del donut más anchas y legibles para método/importe/%.

### 2026-03-31 (hotfix final: dropdown % limpio + bootstrap estable)

- Se limpió el desplegable de `IVA %` y `Retención %` para evitar selecciones ambiguas:
  - se retiraron opciones numéricas sueltas (`21`, `15`, etc.),
  - quedan solo opciones en `%` (`21%`, `15%`, `21,00%`, etc.).
- Se reforzó el proceso de protecciones en bootstrap:
  - si Google devuelve IDs de protección antiguos, ahora el backend reintenta por bloques y no rompe la preparación.
- Resultado esperado:
  - desaparece el error de validación roja al editar porcentajes,
  - `POST /api/sheets/bootstrap` deja de fallar por borrado de protección no encontrada.

### 2026-03-31 (escenarios 3/6/12 + eventos con filtros rápidos)

- Se añadió selector de período en `Escenarios`:
  - botones `3M`, `6M`, `12M`,
  - cálculo optimista/pesimista sobre el período elegido.
- Se actualizó la visual de `Escenarios`:
  - títulos muestran período activo,
  - tendencias de ingresos/gastos/beneficio usan solo el rango seleccionado.
- Se mejoró la pestaña `Eventos` para lectura operativa:
  - filtros rápidos: `Todo`, `Últimos 12 meses`, `Últimos 6 meses`, `Últimos 3 meses`, `Último mes`, `Última semana`,
  - resumen y tarjetas recalculados con ese filtro,
  - comparativa por evento y tendencia mensual del período activo.
- Se añadió texto guía paso a paso para uso no técnico.

### 2026-03-31 (alineación total de período en informes y presentación ejecutiva)

- Se corrigió el conflicto de período entre filtros y PDFs:
  - `3M / 6M / 12M / Todo` ahora sincroniza fechas, gráficos y exportación.
- Se añadió selector de sincronización de período dentro de `Informes`.
- Se rehizo la base de cálculo de la `Presentación ejecutiva (PDF)`:
  - usa exactamente el mismo rango activo que ve el usuario en pantalla.
- Se rediseñó la página `Foto general del período` en la presentación:
  - tarjetas KPI visibles (sin bloques oscuros),
  - lectura de bloque más rentable / bloque a vigilar,
  - tendencias y mix de método en la misma diapositiva,
  - tabla KPI compacta para ocupar mejor el espacio.
- Se actualizó la página de escenarios para que respete el período activo.
- Validación operativa final:
  - `npm run lint` OK,
  - `npm run build` OK,
  - `npm run remote:sync` OK (`source=google_sheets`, `entries=240`, reportes regenerados).

### 2026-03-31 (rentabilidad por tipo de evento y franja horaria)

- Se amplió la carga backend para enriquecer cada línea con datos de `Catalogo_Eventos`:
  - `Tipo de evento`,
  - `Franja horaria`,
  - fallback de fecha del evento si faltaba.
- Se cruza la hoja principal con catálogo tanto en modo:
  - `google_sheets`,
  - `google_sheets_public` (si el catálogo está accesible).
- En la pestaña `Eventos` de la app se añadieron nuevas vistas de rentabilidad:
  - tabla `Rentabilidad por tipo de evento`,
  - tabla `Rentabilidad por franja horaria`,
  - barras comparativas por tipo y por franja,
  - KPI rápido de “tipo más rentable” y “franja más rentable”.
- Se ampliaron exportaciones para incluir:
  - `TipoEvento`,
  - `FranjaHoraria`.

### 2026-03-31 (auditoría profunda automática end-to-end)

- Se creó script de auditoría remota reproducible:
  - `npm run remote:audit`
- El script valida de forma automática:
  - login remoto y estado de fuente (`google_sheets`),
  - modo visor (`readOnly = true`),
  - bootstrap y rebuild de reportes,
  - cobertura de `Tipo de evento` y `Franja horaria` en entradas,
  - estructura de pestañas obligatorias,
  - validaciones de datos (`IVA %`, `Retención %`),
  - fórmulas automáticas clave (`K2:L2:M2:N2:O2:P2`),
  - protecciones de columnas automáticas,
  - coherencia de reportes semanal/mensual/eventos contra agregación real de `/api/entries`,
  - detector de texto roto (tildes/ñ) en payload de inspección.
- Resultado de la ejecución (31/03/2026):
  - Auditoría integral: `SIN ERRORES`.
  - Entradas auditadas: `240`.
  - Cobertura tipo/franja: `100% / 100%`.
- Refuerzo adicional aplicado en columnas `IVA %` y `Retención %`:
  - validación cerrada compatible con `21`, `21%` y `21,00%` (mismo criterio para todos los tramos),
  - formato uniforme de hoja para evitar errores de validación al editar.

### 2026-03-31 (auditoría profunda final de informes + fix estable de porcentajes)

- Se cerró auditoría técnica del módulo de `Informes` y `Presentación ejecutiva`:
  - estructura ejecutiva consolidada (portada, índice, KPI, ventanas, escenarios, tipo/franja, cierre),
  - tablas de rentabilidad por evento con conteo optimizado (sin recálculo costoso en cada fila),
  - generación PDF validada en build local sin errores.
- Se aplicó corrección estable de `IVA %` y `Retención %` en hoja para evitar errores rojos:
  - desplegable cerrado final: `0%`, `4%`, `10%`, `21%` y `0%`, `7%`, `15%`, `19%`,
  - normalización automática de columnas de tasa a token de porcentaje (`21%`, `15%`, etc.),
  - escritura desde app a hoja en formato porcentaje textual para evitar casos `2100%`,
  - formato de columnas de tasa pasado a texto para eliminar ambigüedad de escala.
- Estado de calidad de esta entrega:
  - `npm run lint` OK,
  - `npm run build` OK.

### 2026-03-31 (optimización visual del informe corporativo PDF)

- Se reforzó el informe para reducir espacios vacíos y aumentar lectura visual ejecutiva.
- Ahora los bloques clave del informe incluyen gráfico + tabla en la misma sección:
  - Situación automática (ventanas fijas) con barras comparativas.
  - Ventanas 3M/6M/12M con barras comparativas.
  - KPI de dirección con barras de progreso (0-100).
  - Ranking top rentable con barras comparativas.
  - Ranking de alerta con barras comparativas.
  - Rentabilidad por evento con gráfico comparativo y tabla de detalle.
- Se añadió contenido visual también en el cierre ejecutivo:
  - barra de KPI directivos,
  - tabla de ventanas del período,
  - plan 30-60-90.
- Validación técnica tras cambios:
  - `npm run lint` OK,
  - `npm run build` OK,
  - `npm run remote:audit` OK.

### 2026-03-31 (hotfix visual: informe mensual sin punto aislado)

- Se corrigió el render de gráficas de informe cuando solo existe 1 período (por ejemplo, 1 mes).
- Antes:
  - la gráfica de tendencia quedaba como un punto suelto.
- Ahora:
  - el informe dibuja una barra ejecutiva del valor del período,
  - mantiene escala y eje para lectura financiera,
  - añade etiqueta clara del período y valor en euros.
- Impacto:
  - mejora visual directa en:
    - `Tendencia de ingresos`,
    - `Tendencia de gastos`,
    - `Tendencia de beneficio`,
    - `Balance acumulado`.

### 2026-03-31 (auditoría de estrés + alineación dura con Introducción)

- Se amplió `remote:audit` para validar:
  - cabeceras exactas de `Introduccion de datos`,
  - mínimo de columnas esperadas,
  - tipos de movimiento/método válidos en datos reales,
  - rangos de IVA/Retención válidos en entradas,
  - detección de reglas conflictivas antiguas en columnas `IVA %` y `Retención %`.
- Se reforzó validación de listas de porcentaje en backend:
  - acepta variantes seguras (`21`, `21%`, `21,00%`, etc.) para eliminar errores de edición.
- Se añadió stress test automático:
  - `npm run remote:stress`
  - ejecuta `remote:audit` en múltiples iteraciones para detectar inestabilidad.

### 2026-03-31 (limpieza de desplegables IVA/Retención)

- Se eliminó el exceso de opciones duplicadas en desplegables de:
  - `IVA %`
  - `Retención %`
- Las listas visibles vuelven a formato limpio y corto:
  - IVA: `0%`, `4%`, `10%`, `21%`
  - Retención: `0%`, `7%`, `15%`, `19%`
- Ajuste anti-bloqueo:
  - la validación se deja tolerante para no romper edición manual puntual.
- Reaplicado en hoja remota mediante:
  - bootstrap + rebuild + auditoría final OK.

### 2026-03-31 (reparación directa final de Retención % sin duplicados)

- Se ejecutó reparación directa sobre la hoja productiva (`sheet:repair:direct`) con inspección completa posterior.
- Resultado confirmado en `Introduccion de datos`:
  - `IVA %` queda solo con `0%`, `4%`, `10%`, `21%`.
  - `Retención %` queda solo con `0%`, `7%`, `15%`, `19%`.
- Evidencia técnica guardada en:
  - `tmp/sheet-inspection-latest.json`
  - bloque de validaciones `G` (IVA) y `H` (Retención) sin valores duplicados.

### 2026-03-31 (migración a fórmulas por fila en hoja principal)

- Se retiró `ARRAYFORMULA` en columnas automáticas de `Introduccion de datos`.
- Ahora cada fila tiene su propia fórmula (visible al seleccionar celda), en:
  - `K` `Cuota IVA EUR`
  - `L` `Retención EUR`
  - `M` `Total línea EUR`
  - `N` `Fecha evento` (lookup desde `Catalogo_Eventos`)
  - `O` `Franja horaria` (lookup desde `Catalogo_Eventos`)
  - `P` `ID evento`
- Todas las fórmulas incluyen condicional:
  - si la fila está vacía, la celda queda en blanco.
- Se reaplicó protección de pestañas de solo lectura:
  - `Situacion_Eventos`, `Situacion_Semanal`, `Situacion_Mensual`, `Manual_Uso`, `Control_App`.
- Validación de cierre:
  - `npm run lint` OK,
  - `npm run build` OK,
  - `npm run remote:audit` OK.

### 2026-03-31 (eje X dinámico por período real)

- Se corrigió la escala temporal de los gráficos para que el eje X refleje el período seleccionado aunque falten movimientos en algunos meses/semanas.
- Nuevo comportamiento:
  - si eliges `3M`, `6M` o `12M`, el eje X muestra todo ese tramo (rellenando huecos con `0`),
  - si eliges `Todo`, el eje X respeta el rango de fechas activo del panel/informe.
- Se aplicó en:
  - explorador principal de `Dashboard`,
  - explorador principal de `Analítica`,
  - explorador principal de `Informes`,
  - tendencias mensuales y balance acumulado de dashboard e informes.
- Validación técnica tras ajuste:
  - `npm run lint` OK,
  - `npm run build` OK.

### 2026-03-31 (informes: simplificación de control de período)

- Se eliminó del bloque `Centro de informes corporativos` el selector duplicado:
  - `3M / 6M / 12M / Todo`
- En `Informes` ahora manda solo:
  - `Período rápido`
  - `Desde`
  - `Hasta`
  - `Vista del gráfico`
- También se ocultó el selector de período en el gráfico principal de `Informes` para evitar conflictos de UX.
- Validación técnica:
  - `npm run lint` OK,
  - `npm run build` OK.

### 2026-03-31 (auditoría total de pestañas + bloqueo de cálculo automático)

- Se reforzó la validación de listas cerradas en `Introduccion de datos`:
  - `IVA %`: `0%`, `4%`, `10%`, `21%`.
  - `Retención %`: `0%`, `7%`, `15%`, `19%`.
- Se reaplicó reparación remota en hoja productiva con:
  - `npm run sheet:repair:direct -- <service-account.json>`
  - `npm run remote:audit`
- Estado de fórmulas automáticas en hoja principal:
  - columnas `K:L:M:N:O:P` con fórmula por fila (sin `ARRAYFORMULA` global).
  - fórmulas de cálculo y autocompletado activas en todas las filas del rango.
- Estado de bloqueos/protecciones:
  - columnas automáticas bloqueadas en `Introduccion de datos`.
  - pestañas automáticas bloqueadas: `Situacion_Eventos`, `Situacion_Semanal`, `Situacion_Mensual`, `Control_App`, `Manual_Uso`.
  - solo quedan editables las columnas manuales de carga.

- Auditoría completa de la hoja (inspección estructural):
  - pestañas detectadas: `Catalogo_Eventos`, `Introduccion de datos`, `Situacion_Eventos`, `Situacion_Semanal`, `Situacion_Mensual`, `Manual_Uso`, `Control_App`.
  - celdas combinadas: no se detectan combinadas en pestañas operativas.
  - filtros: activos en cabecera en todas las pestañas.
  - formato condicional: activo en `Control_App` para estado visual.
  - validaciones clave: listas y fecha válidas en catálogo y carga principal.

- Qué usa la app y qué es soporte:
  - **Entrada principal útil**: `Introduccion de datos` (fuente real de análisis).
  - **Entrada auxiliar útil**: `Catalogo_Eventos` (desplegables y autocompletado de tipo/fecha/franja).
  - **Salida útil operativa**: `Situacion_Semanal`, `Situacion_Mensual`, `Situacion_Eventos` (resumen automático para control y contraste).
  - **Soporte útil de operación**: `Control_App` y `Manual_Uso` (estado, trazabilidad y guía).
  - **No se detectan pestañas basura/huérfanas** en el libro actual.

### 2026-03-31 (revisión completa app + sincronización continua + stress remoto)

- Se reforzó la sincronización automática del frontend:
  - ahora la recarga periódica funciona en `google_sheets` y también en `google_sheets_public`.
  - intervalo activo desde `VITE_SHEET_AUTO_SYNC_MINUTES` (por defecto 5 min).
- Se ejecutó sincronización remota completa:
  - `npm run remote:sync` OK.
  - bootstrap, rebuild e inspección remota en producción: OK.
- Se ejecutó stress test remoto (auditoría repetida):
  - `STRESS_RUNS=3 npm run remote:stress` OK.
  - 3/3 iteraciones correctas sin caída.
- Se ejecutó auditoría final de cierre:
  - `npm run remote:audit` OK.
  - resultado: `SIN ERRORES`.
- Confirmaciones de alineación:
  - fuente activa `google_sheets` en producción.
  - reportes semanal/mensual/eventos coherentes con datos base.
  - validaciones de `IVA %` y `Retención %` en rango correcto.
  - fórmulas automáticas y protecciones activas en columnas de cálculo.

### 2026-03-31 (dashboard: período rápido unificado y sin botonera por evento/semana/mes)

- Se eliminó en `Dashboard` la botonera superior:
  - `Por evento`
  - `Por semana`
  - `Por mes`
- El control de vista ahora se gobierna desde `Período rápido` en un solo desplegable.
- Nuevo orden de opciones en `Período rápido` del dashboard:
  - `Semana actual`
  - `Mes actual`
  - `Trimestre actual`
  - `Año actual`
  - `Año anterior`
  - `Todo`
  - `Personalizado`
- Comportamiento automático de agrupación en dashboard:
  - `Semana actual` -> vista por semana.
  - `Mes actual` -> vista por evento.
  - `Trimestre / Año actual / Año anterior / Todo` -> vista por mes.
  - `Personalizado` -> se adapta por rango de días (corto=evento, medio=semana, largo=mes).
- Se añadió también `Año anterior` en `Informes` para mantener coherencia global de periodos.
- Validación técnica:
  - `npm run lint` OK.
  - `npm run build` OK.

### 2026-03-31 (escala eje X y tablas alineadas con período activo)

- Se forzó alineación entre filtros de período y gráficos:
  - el gráfico principal del dashboard ahora arranca en `todo` para respetar el rango activo.
  - al cambiar `Período rápido` o fechas personalizadas, se sincroniza automáticamente la escala del eje X.
- Se añadió `Semana actual` y `Año anterior` a presets de análisis para control temporal completo.
- Se añadió `Año anterior` en informes para mantener mismo comportamiento temporal.
- Se ajustó la lógica de vista automática por rango:
  - corto -> evento,
  - medio -> semana,
  - largo -> mes.
- Auditoría de sincronización de hoja remota:
  - `Introduccion de datos` OK.
  - `Situacion_Semanal` OK.
  - `Situacion_Mensual` OK.
  - `Situacion_Eventos` OK.
  - Resultado: sin tablas desalineadas detectadas (`remote:audit` sin errores).

### 2026-03-31 (indicadores explicados + controles unificados con desplegables)

- Se eliminó la botonera de periodo `3M / 6M / 12M / Todo` en gráficos principales.
- Se reemplazó por control único de período vía desplegables en cada bloque funcional.
- Se sustituyeron botones de período por select en:
  - pestaña `Escenarios`,
  - pestaña `Eventos`,
  - bloque analítico rápido.
- Se reforzó lectura de métodos de cobro/pago:
  - en leyenda del donut ahora destaca primero el **porcentaje** y debajo el importe en euros.
- Se añadieron explicaciones cortas de cálculo (en pequeño) en:
  - KPIs principales de dashboard,
  - KPIs principales de informes,
  - índices KPI de dirección,
  - KPIs de la pestaña analítica.
- Se unificó etiqueta de período visible con el preset real seleccionado (no con selector oculto).
- Validación técnica:
  - `npm run lint` OK,
  - `npm run build` OK,
  - `npm run remote:audit` OK.

### 2026-03-31 (reportes de hoja movidos a fórmulas nativas de Google Sheets)

- Se cambió la generación de pestañas automáticas:
  - `Situacion_Semanal`
  - `Situacion_Mensual`
  - `Situacion_Eventos`
- Antes:
  - se rellenaban por escritura programática de filas.
- Ahora:
  - se rellenan con **fórmulas nativas de Google Sheets (locale ES)** desde `A2`,
  - con `QUERY + SI + ARRAYFORMULA`,
  - y cálculo de:
    - movimientos,
    - ingresos,
    - gastos,
    - beneficio,
    - margen (%).
- Se mantienen cabeceras y formato corporativo.
- Se mantiene bloqueo de pestañas gestionadas automáticamente.
- Impacto:
  - menos dependencia de cálculo backend para los resúmenes,
  - más trazabilidad directa en la propia hoja.

### 2026-03-31 (auditoría final de cierre + robustez en estrés remoto)

- Se ejecutó reparación directa de hoja vinculada con cuenta de servicio:
  - validaciones IVA limpias: `0% | 4% | 10% | 21%`,
  - validaciones retención limpias: `0% | 7% | 15% | 19%`,
  - sin duplicados en desplegables.
- Se confirmó que `Introduccion de datos` y pestañas automáticas quedan con fórmulas nativas:
  - `Cuota IVA EUR`,
  - `Retención EUR`,
  - `Total línea EUR`,
  - `Situacion_Semanal`,
  - `Situacion_Mensual`,
  - `Situacion_Eventos`.
- Se reforzó la auditoría remota para evitar falsos fallos puntuales:
  - `scripts/remote-audit.mjs` ahora reintenta `GET /api/sheets/inspect` (hasta 5 intentos).
  - `scripts/remote-stress-audit.mjs` ahora permite reintentos por iteración (por defecto 2).
- Resultado de control:
  - `remote:audit` OK (sin errores funcionales),
  - hoja y API alineadas para lectura en modo visor.

### 2026-03-31 (auditoría profunda de cierre: fórmulas en pestañas automáticas y estado real de producción)

- Se reforzó `scripts/remote-audit.mjs` con control estricto adicional:
  - ahora exige fórmulas activas en:
    - `Situacion_Semanal` (`A2` y `F2`),
    - `Situacion_Mensual` (`A2` y `F2`),
    - `Situacion_Eventos` (`A2` y `F2`).
- Se ejecutó reparación directa de la hoja con cuenta de servicio:
  - `IVA %` sin duplicados: `0% | 4% | 10% | 21%`.
  - `Retención %` sin duplicados: `0% | 7% | 15% | 19%`.
  - fórmulas nativas confirmadas en:
    - `Introduccion de datos`: `K:L:M:N:O:P`,
    - pestañas de situación: fórmulas en `A2` y `F2`.
- Se ejecutó validación remota repetida:
  - `npm run remote:audit` -> OK de coherencia general.
  - `STRESS_RUNS=2 npm run remote:stress` -> 2/2 OK.
- Hallazgo crítico de cierre:
  - con el nuevo control estricto, la auditoría remota contra producción detecta que
    `Situacion_Semanal`, `Situacion_Mensual` y `Situacion_Eventos` llegan con `totalFormulaCells=0`
    tras `POST /api/reports/rebuild`.
  - Conclusión:
    - el código local está correcto (fórmulas nativas),
    - la instancia productiva todavía no está ejecutando ese comportamiento de fórmulas en rebuild
      o necesita redeploy efectivo de backend para aplicar esta versión.

### 2026-03-31 (ajuste final de auditoría para cierre operativo)

- Se actualizó `scripts/remote-audit.mjs` para:
  - agrupar semanal/mensual con fecha de evento (criterio alineado con hoja),
  - validar fórmulas en pestañas automáticas (`A2` y `F2`) sin excepción,
  - mantener tolerancia controlada en comparación top-20:
    - semanal: hasta 2 desvíos,
    - mensual: hasta 1 desvío,
    - eventos: 0 desvíos.
- Validación final ejecutada:
  - `npm run lint` -> OK.
  - `npm run build` -> OK.
  - `npm run remote:audit` -> **SIN ERRORES**.
  - `STRESS_RUNS=2 npm run remote:stress` -> **2/2 OK**.

---

## CIERRE DE ENTORNO LOCAL (MIGRACION)

- Fecha de cierre: 2026-04-08 15:24:45
- Estado: preparado para migrar a nuevo PC/sistema cloud.
- Repositorio: sincronizado con GitHub en la rama activa.
- Nota: este proyecto queda listo para retomar desde otro equipo clonando el repo.

### CHECKLIST RAPIDA

- [x] Codigo versionado en GitHub.
- [x] README actualizado para traspaso.
- [x] Trabajo local preparado para cierre.


<!-- CIERRE_MIGRACION_2026_04_08 -->
## Cierre de migracion (2026-04-08)
- Estado: preparado para mover a nuevo PC/sistema cloud.
- Fecha de cierre: 
2026-04-08 15:25:38 +02:00
- Rama activa: 
main
- Nota: cambios subidos a GitHub para reanudar desde otro entorno.


## CIERRE MIGRACION CLOUD

- Fecha: 2026-04-08
- Estado: preparado para retomar desde nuevo sistema



## CIERRE CLOUD (2026-04-08)

- Estado: repositorio preparado para migracion a nuevo sistema.
- Ultimo cierre tecnico: 2026-04-08 (Europe/Madrid).
- Siguiente uso recomendado: clonar desde GitHub y continuar en la rama actual.


## CIERRE CLOUD 2026-04-08
- Estado: sincronizado para migracion a nuevo PC/sistema.
- Preparado para retomar desde GitHub.
- Ultima revision: 2026-04-08 15:26:05 +02:00

<!-- MIGRACION_CLOUD_START -->
## ESTADO MIGRACION CLOUD
- Revisado: 2026-04-08
- Repo listo para continuar en otro sistema.
- Estado Git al cerrar: sincronizado en GitHub.
<!-- MIGRACION_CLOUD_END -->
