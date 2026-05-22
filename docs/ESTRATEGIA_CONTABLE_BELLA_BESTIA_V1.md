# ESTRATEGIA CONTABLE BELLA BESTIA (V1)

## 1) Objetivo real

Construir un sistema contable operativo para sala de conciertos que permita:
- control diario linea a linea
- cierre por evento
- lectura semanal y mensual
- escenarios (base, optimista, pesimista)
- deteccion de riesgos antes de que aparezcan problemas de caja

## 2) Diagnostico de partida

### Fuentes revisadas
- Repositorio `bella-bestia-forecast-appscript` (enfoque BI sobre Google Sheets).
- Repositorio `APP_ARTES-BUHO_CONTABILIDAD` (MVP de operaciones en Apps Script).
- Nueva app web `APP_ARTES-BUHO_BELLA-BESTIA` (frontend productivo en Coolify).

### Situacion actual
- Ya hay app web desplegada y accesible.
- Ya hay panel con KPIs y formulario de movimientos.
- Falta capa de persistencia real (hoy esta en memoria local del frontend).
- Falta migracion de historico desde hoja App Script a base de datos.

## 3) Metodo recomendado (mejor equilibrio velocidad + control)

### Fase A (inmediata, 1-2 semanas)
- Mantener frontend actual.
- Crear API backend para guardar movimientos en base real.
- Definir modelo unico de datos contables.
- Activar auditoria automatica de riesgos (ya iniciada en frontend).

### Fase B (2-4 semanas)
- Migrar historico real desde Google Sheets/App Script.
- Activar cierres operativos:
  - cierre por evento
  - cierre semanal
  - cierre mensual
- Validar trazabilidad de cobro:
  - efectivo
  - tarjeta
  - transferencia

### Fase C (4-8 semanas)
- Conciliacion bancaria.
- Reglas de aprobacion para gastos altos.
- Roles de usuario (operacion, direccion, asesoria).
- Cuadros de mando ejecutivos con comparativas historicas.

## 4) Arquitectura recomendada (open source)

### Nucleo de aplicacion
- Frontend: React (actual)
- Backend API: FastAPI (Python) o NestJS
- Base de datos: PostgreSQL

### Capa BI opcional (sin bloquear operativa)
- Metabase o Superset para informes avanzados y consultas ad hoc.

## 5) Modelo de datos minimo recomendado

### Tabla `events`
- id
- nombre_evento
- fecha
- aforo_objetivo
- estado

### Tabla `ledger_entries`
- id
- event_id
- fecha_movimiento
- tipo_movimiento (`INGRESO`/`GASTO`)
- metodo (`EFECTIVO`/`TARJETA`/`TRANSFERENCIA`)
- categoria
- concepto
- importe
- notas
- created_at
- created_by

### Tabla `weekly_closings`
- id
- semana_iso
- ingresos_total
- gastos_total
- beneficio_total
- validado_por
- validado_at

### Tabla `monthly_closings`
- id
- mes
- ingresos_total
- gastos_total
- beneficio_total
- escenario_base
- escenario_optimista
- escenario_pesimista

## 6) KPIs que deben vivir siempre en portada

- Ingresos del bloque activo
- Gastos del bloque activo
- Beneficio neto
- Margen
- % cobro en efectivo
- % cobro en tarjeta
- % cobro en transferencia
- Top categorias de gasto
- Eventos en perdida

## 7) Reglas de auditoria recomendadas

- Alerta ALTA si gasto/ingreso supera 85%.
- Alerta ALTA si hay eventos con beneficio negativo.
- Alerta MEDIA si efectivo supera 35% del ingreso.
- Alerta MEDIA si hay lineas de gasto > 1.200 EUR sin aprobacion.
- Alerta BAJA si faltan notas en movimientos.
- Alerta MEDIA si hay posibles duplicados.

## 8) Definicion de “listo para operar”

- Registro diario sin huecos.
- Cierre semanal completado.
- Cierre mensual firmado.
- Trazabilidad por evento y metodo de cobro.
- Exportacion de libro diario para asesoria.

## 9) Proximo entregable tecnico

V2 tecnica:
- persistencia real en PostgreSQL
- autenticacion simple
- API para altas/consultas
- migracion inicial desde hoja historica
