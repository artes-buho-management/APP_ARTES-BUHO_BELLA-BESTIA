import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DEFAULT_SHEET_ID = 'REPLACE_WITH_SHEET_ID'
const DEFAULT_MAIN_TAB = 'Introduccion de datos'
const DEFAULT_WEEK_TAB = 'Situacion_Semanal'
const DEFAULT_MONTH_TAB = 'Situacion_Mensual'
const DEFAULT_EVENT_TAB = 'Situacion_Eventos'
const DEFAULT_EVENTS_TAB = 'Catalogo_Eventos'
const DEFAULT_CONTROL_TAB = 'Control_App'
const DEFAULT_MANUAL_TAB = 'Manual_Uso'

const EVENT_TYPES = [
  'BBC',
  'Conciertos',
  'Cumpleaños',
  'Discotecas',
  'Eventos corporativos',
  'Despedidas',
  'Fiestas temáticas',
]
const TIME_SLOTS = [
  'Franja 1 (17:00-00:00)',
  'Franja 2 (00:00-06:00)',
  'Franja 3 (06:00-17:00)',
]

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function getScriptContext() {
  const scriptFile = fileURLToPath(import.meta.url)
  const scriptsDir = path.dirname(scriptFile)
  const repoRoot = path.resolve(scriptsDir, '..')
  return { repoRoot }
}

function loadServiceAccountJson(repoRoot) {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  }

  const explicitFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  if (explicitFile && fs.existsSync(explicitFile)) {
    return fs.readFileSync(explicitFile, 'utf8')
  }

  const secretsDir = path.resolve(repoRoot, '..', '..', 'secrets')
  if (fs.existsSync(secretsDir)) {
    const candidate = fs
      .readdirSync(secretsDir)
      .filter((name) => /\.json$/i.test(name))
      .map((name) => path.resolve(secretsDir, name))
      .find((fullPath) => /robot|service|account/i.test(path.basename(fullPath)))
    if (candidate) {
      return fs.readFileSync(candidate, 'utf8')
    }
  }

  throw new Error(
    'No se encontró credencial de Google. Define GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_FILE.',
  )
}

function setGoogleEnv(serviceAccountJson) {
  process.env.GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = serviceAccountJson
  process.env.GOOGLE_SHEETS_READ_ONLY = 'false'
  process.env.GOOGLE_SHEET_MAIN_TAB = process.env.GOOGLE_SHEET_MAIN_TAB || DEFAULT_MAIN_TAB
  process.env.GOOGLE_SHEET_REPORT_WEEK_TAB =
    process.env.GOOGLE_SHEET_REPORT_WEEK_TAB || DEFAULT_WEEK_TAB
  process.env.GOOGLE_SHEET_REPORT_MONTH_TAB =
    process.env.GOOGLE_SHEET_REPORT_MONTH_TAB || DEFAULT_MONTH_TAB
  process.env.GOOGLE_SHEET_REPORT_EVENT_TAB =
    process.env.GOOGLE_SHEET_REPORT_EVENT_TAB || DEFAULT_EVENT_TAB
  process.env.GOOGLE_SHEET_EVENTS_TAB = process.env.GOOGLE_SHEET_EVENTS_TAB || DEFAULT_EVENTS_TAB
  process.env.GOOGLE_SHEET_CONTROL_TAB = process.env.GOOGLE_SHEET_CONTROL_TAB || DEFAULT_CONTROL_TAB
  process.env.GOOGLE_SHEET_MANUAL_TAB = process.env.GOOGLE_SHEET_MANUAL_TAB || DEFAULT_MANUAL_TAB
  process.env.GOOGLE_SHEETS_AUTO_BOOTSTRAP = 'true'
  process.env.GOOGLE_SHEETS_AUTO_REBUILD_REPORTS = 'true'
  process.env.GOOGLE_SHEETS_AUTO_PRUNE_TABS = 'true'
}

function buildDemoDataset() {
  const baseNames = [
    'Festival Bella Bestia',
    'Noche Indie BB',
    'Session House Central',
    'Matinal Acoustic Set',
    'Electro Sunday BB',
    'Urban Pulse Night',
    'Sunset Corporate BB',
    'Fiesta Temática BB',
  ]
  const paymentMethods = ['TARJETA', 'EFECTIVO', 'TRANSFERENCIA']

  const catalog = []
  const entries = []
  let eventCounter = 0

  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const year = 2025 + Math.floor(monthIndex / 12)
    const month = monthIndex % 12
    const monthAnchor = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

    for (let eventOfMonth = 0; eventOfMonth < 2; eventOfMonth += 1) {
      eventCounter += 1
      const day = Math.min(7 + eventOfMonth * 14, lastDayOfMonth)
      const eventDate = new Date(year, month, day)
      const eventName = `${baseNames[eventCounter % baseNames.length]} ${year}-${String(month + 1).padStart(2, '0')}-${eventOfMonth + 1}`
      const eventType = EVENT_TYPES[eventCounter % EVENT_TYPES.length]
      const timeSlot = TIME_SLOTS[eventCounter % TIME_SLOTS.length]

      catalog.push({
        event: eventName,
        eventType,
        eventDate: toIsoDate(eventDate),
        eventTimeSlot: timeSlot,
      })

      const baseA = 1700 + ((monthIndex * 141 + eventOfMonth * 77) % 2600)
      const baseB = 650 + ((monthIndex * 83 + eventOfMonth * 41) % 1200)
      const costA = 480 + ((monthIndex * 57 + eventOfMonth * 23) % 700)
      const costB = 210 + ((monthIndex * 49 + eventOfMonth * 17) % 440)
      const costC = 360 + ((monthIndex * 61 + eventOfMonth * 29) % 900)
      const sourceNote = `Carga demo ${toIsoDate(monthAnchor)}`

      entries.push({
        event: eventName,
        movementType: 'INGRESO',
        category: 'Taquilla',
        concept: 'Venta de entradas',
        paymentMethod: paymentMethods[(eventCounter + 0) % paymentMethods.length],
        baseAmount: baseA,
        vatType: 'IVA_10',
        withholdingRate: 0,
        discountAmount: 0,
        notes: sourceNote,
      })
      entries.push({
        event: eventName,
        movementType: 'INGRESO',
        category: 'Barra',
        concept: 'Ventas de barra',
        paymentMethod: paymentMethods[(eventCounter + 1) % paymentMethods.length],
        baseAmount: baseB,
        vatType: 'IVA_21',
        withholdingRate: 0,
        discountAmount: 0,
        notes: sourceNote,
      })
      entries.push({
        event: eventName,
        movementType: 'GASTO',
        category: 'Personal',
        concept: 'Equipo de sala',
        paymentMethod: paymentMethods[(eventCounter + 2) % paymentMethods.length],
        baseAmount: costA,
        vatType: 'IVA_21',
        withholdingRate: 0,
        discountAmount: 0,
        notes: sourceNote,
      })
      entries.push({
        event: eventName,
        movementType: 'GASTO',
        category: 'Marketing',
        concept: 'Ads y promo digital',
        paymentMethod: paymentMethods[(eventCounter + 0) % paymentMethods.length],
        baseAmount: costB,
        vatType: 'IVA_21',
        withholdingRate: 0,
        discountAmount: 0,
        notes: sourceNote,
      })
      entries.push({
        event: eventName,
        movementType: 'GASTO',
        category: 'Cache artistas',
        concept: 'Caché artístico',
        paymentMethod: paymentMethods[(eventCounter + 1) % paymentMethods.length],
        baseAmount: costC,
        vatType: 'IVA_21',
        withholdingRate: 15,
        discountAmount: 0,
        notes: sourceNote,
      })
    }
  }

  return { catalog, entries }
}

function getYearDistribution(entries) {
  const dist = {}
  entries.forEach((entry) => {
    const year = String(entry.eventDateTime || entry.date || '').slice(0, 4)
    if (!/^\d{4}$/.test(year)) return
    dist[year] = (dist[year] || 0) + 1
  })
  return dist
}

async function main() {
  const { repoRoot } = getScriptContext()
  const serviceAccountJson = loadServiceAccountJson(repoRoot)
  setGoogleEnv(serviceAccountJson)

  const dataSource = await import(pathToFileURL(path.resolve(repoRoot, 'data-source.mjs')).href)

  const check = await dataSource.runGoogleSheetsConnectivityCheck()
  if (!check?.ok) {
    throw new Error('No hay conexión válida con Google Sheets.')
  }

  const { catalog, entries } = buildDemoDataset()
  await dataSource.saveEventsCatalogToDataSource(catalog)
  await dataSource.saveEntriesToDataSource(entries)
  const prepared = await dataSource.prepareSpreadsheetWorkspace()
  const loaded = await dataSource.loadEntriesFromDataSource()

  const hasFormulaErrors = loaded.entries.some(
    (entry) =>
      String(entry.id || '').includes('#REF!') ||
      String(entry.eventDateTime || '').includes('#REF!') ||
      String(entry.eventTimeSlot || '').includes('#REF!'),
  )
  if (hasFormulaErrors) {
    throw new Error('Siguen apareciendo errores de fórmula (#REF!).')
  }

  const summary = {
    catalogRows: catalog.length,
    entriesWritten: entries.length,
    entriesLoaded: loaded.entries.length,
    years: getYearDistribution(loaded.entries),
    reports: prepared.reports,
  }
  console.log(JSON.stringify(summary))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Error inesperado en seed-live-sheet')
  process.exitCode = 1
})
