import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || ''
const GOOGLE_SHEET_MAIN_TAB =
  process.env.GOOGLE_SHEET_MAIN_TAB || 'Introduccion de datos'
const GOOGLE_SHEET_REPORT_WEEK_TAB =
  process.env.GOOGLE_SHEET_REPORT_WEEK_TAB || 'Situacion_Semanal'
const GOOGLE_SHEET_REPORT_MONTH_TAB =
  process.env.GOOGLE_SHEET_REPORT_MONTH_TAB || 'Situacion_Mensual'
const LEGACY_GOOGLE_SHEET_REPORT_EVENT_TAB = 'Situacion_Por_Evento'
const GOOGLE_SHEET_REPORT_EVENT_TAB_ENV = process.env.GOOGLE_SHEET_REPORT_EVENT_TAB || ''
const GOOGLE_SHEET_REPORT_EVENT_TAB =
  !GOOGLE_SHEET_REPORT_EVENT_TAB_ENV ||
  GOOGLE_SHEET_REPORT_EVENT_TAB_ENV === LEGACY_GOOGLE_SHEET_REPORT_EVENT_TAB
    ? 'Situacion_Eventos'
    : GOOGLE_SHEET_REPORT_EVENT_TAB_ENV
const GOOGLE_SHEET_CONTROL_TAB = process.env.GOOGLE_SHEET_CONTROL_TAB || 'Control_App'
const GOOGLE_SHEET_EVENTS_TAB = process.env.GOOGLE_SHEET_EVENTS_TAB || 'Catalogo_Eventos'
const GOOGLE_SHEET_MANUAL_TAB = process.env.GOOGLE_SHEET_MANUAL_TAB || 'Manual_Uso'
const DASHBOARD_URL =
  process.env.DASHBOARD_URL || 'https://bella-bestia.artesbuhomanagement.com'
const APP_AUTO_SYNC_MINUTES = Math.min(
  60,
  Math.max(
    1,
    Number.parseInt(String(process.env.VITE_SHEET_AUTO_SYNC_MINUTES || '5'), 10) || 5,
  ),
)
const GOOGLE_SHEETS_READ_ONLY = process.env.GOOGLE_SHEETS_READ_ONLY === 'false' ? false : true
const GOOGLE_IMPERSONATE_USER = process.env.GOOGLE_IMPERSONATE_USER || ''
const GOOGLE_SHEETS_AUTO_BOOTSTRAP =
  process.env.GOOGLE_SHEETS_AUTO_BOOTSTRAP === 'false' ? false : true
const GOOGLE_SHEETS_AUTO_REBUILD_REPORTS =
  process.env.GOOGLE_SHEETS_AUTO_REBUILD_REPORTS === 'false' ? false : true
const GOOGLE_SHEETS_AUTO_PRUNE_TABS =
  process.env.GOOGLE_SHEETS_AUTO_PRUNE_TABS === 'false' ? false : true
const GOOGLE_SHEETS_PUBLIC_FALLBACK =
  process.env.GOOGLE_SHEETS_PUBLIC_FALLBACK === 'false' ? false : true
const GOOGLE_SHEETS_ENFORCE_PROTECTIONS =
  process.env.GOOGLE_SHEETS_ENFORCE_PROTECTIONS === 'true'

const DATA_DIR = path.join(process.cwd(), 'data')
const LOCAL_LEDGER_FILE = path.join(DATA_DIR, 'ledger-entries.json')

const SHEET_ENTRY_COLUMNS = [
  { field: 'event', label: 'Evento', width: 250 },
  { field: 'movementType', label: 'Tipo', width: 110 },
  { field: 'category', label: 'Categor\u00eda', width: 160 },
  { field: 'concept', label: 'Concepto', width: 240 },
  { field: 'paymentMethod', label: 'M\u00e9todo de pago', width: 150 },
  { field: 'baseAmount', label: 'Base imponible EUR', width: 160 },
  { field: 'vatRate', label: 'IVA %', width: 120 },
  { field: 'withholdingRate', label: 'Retenci\u00f3n %', width: 130 },
  { field: 'discountAmount', label: 'Descuento EUR', width: 150 },
  { field: 'notes', label: 'Notas', width: 280 },
  { field: 'vatAmount', label: 'Cuota IVA EUR', width: 150 },
  { field: 'withholdingAmount', label: 'Retenci\u00f3n EUR', width: 150 },
  { field: 'amount', label: 'Total l\u00ednea EUR', width: 160 },
  { field: 'eventDateTime', label: 'Fecha evento', width: 150 },
  { field: 'eventTimeSlot', label: 'Franja horaria', width: 220 },
  { field: 'id', label: 'ID evento', width: 170 },
]

const SHEET_ENTRY_HEADERS = SHEET_ENTRY_COLUMNS.map((column) => column.label)
const SHEET_ENTRY_FIELD_ORDER = SHEET_ENTRY_COLUMNS.map((column) => column.field)
const SHEET_ENTRY_FIELD_INDEX = SHEET_ENTRY_FIELD_ORDER.reduce((acc, field, index) => {
  acc[field] = index
  return acc
}, {})

const MAIN_TAB_LAYOUT = {
  rows: 2000,
  columns: SHEET_ENTRY_COLUMNS.length,
  columnWidths: SHEET_ENTRY_COLUMNS.map((column) => column.width),
}

const REPORT_TAB_LAYOUT = {
  rows: 600,
  columns: 6,
  columnWidths: [190, 130, 170, 170, 180, 130],
}
const REPORT_WEEK_HEADERS = [
  'Semana (AAAA-S##)',
  'Movimientos',
  'Ingresos EUR',
  'Gastos EUR',
  'Beneficio EUR',
  'Margen %',
]
const REPORT_MONTH_HEADERS = [
  'Mes (AAAA-MM)',
  'Movimientos',
  'Ingresos EUR',
  'Gastos EUR',
  'Beneficio EUR',
  'Margen %',
]
const REPORT_EVENT_HEADERS = [
  'Evento',
  'Movimientos',
  'Ingresos EUR',
  'Gastos EUR',
  'Beneficio EUR',
  'Margen %',
]

const CONTROL_TAB_LAYOUT = {
  rows: 9,
  columns: 3,
  columnWidths: [230, 480, 120],
}

const EVENTS_TAB_LAYOUT = {
  rows: 1000,
  columns: 4,
  columnWidths: [320, 220, 150, 220],
}

const MANUAL_TAB_LAYOUT = {
  rows: 9,
  columns: 5,
  columnWidths: [360, 360, 220, 220, 220],
}

const EVENTS_CATALOG_HEADERS = [
  'Nombre del evento',
  'Tipo de evento',
  'Fecha del evento',
  'Franja horaria',
]
const EVENTS_CATALOG_HEADER_ALIASES = {
  event: ['nombre_del_evento', 'nombre_evento', 'evento', 'event'],
  eventType: ['tipo_de_evento', 'tipo_evento', 'tipo', 'event_type', 'eventtype'],
  eventDate: ['fecha_del_evento', 'fecha_evento', 'fecha', 'event_date', 'eventdate'],
  eventTimeSlot: ['franja_horaria', 'franja', 'turno_evento', 'event_time_slot', 'eventtimeslot'],
}
const EVENT_TYPE_OPTIONS = [
  'BBC',
  'Conciertos',
  'Cumpleaños',
  'Discotecas',
  'Eventos corporativos',
  'Despedidas',
  'Fiestas temáticas',
]
const MANUAL_HEADERS = ['Sección', 'Descripción', 'Acción', 'Enlace', 'Estado']
const EVENT_TIME_SLOTS = [
  'Franja 1 (17:00-00:00)',
  'Franja 2 (00:00-06:00)',
  'Franja 3 (06:00-17:00)',
]
const CATEGORY_OPTIONS = [
  'Taquilla',
  'Barra',
  'Patrocinio',
  'Merchandising',
  'Reserva de sala',
  'Artistas',
  'Caché artistas',
  'Personal',
  'Producción técnica',
  'Sonido e iluminación',
  'Marketing',
  'Seguridad',
  'Administración',
  'Limpieza',
  'Suministros',
  'Otros',
]
const VAT_RATE_OPTIONS = [
  '0%',
  '4%',
  '10%',
  '21%',
]
const WITHHOLDING_RATE_OPTIONS = [
  '0%',
  '7%',
  '15%',
  '19%',
]
const VAT_RATE_VALIDATION_OPTIONS = [...VAT_RATE_OPTIONS]
const WITHHOLDING_RATE_VALIDATION_OPTIONS = [...WITHHOLDING_RATE_OPTIONS]
const MAIN_AUTO_FIELDS = [
  'id',
  'eventDateTime',
  'eventTimeSlot',
  'vatAmount',
  'withholdingAmount',
  'amount',
]
const MAIN_EDITABLE_FIELDS = [
  'event',
  'movementType',
  'category',
  'concept',
  'paymentMethod',
  'baseAmount',
  'vatRate',
  'withholdingRate',
  'discountAmount',
  'notes',
]
const MAIN_AUTO_PROTECTION_PREFIX = 'AUTO_LOCK_MAIN_COLUMN'
const MANAGED_SECTION_PROTECTION_PREFIX = 'AUTO_LOCK_MANAGED_SECTION'

const HEADER_ALIASES = {
  id: ['id', 'identificador'],
  date: ['fecha', 'fecha_operacion', 'date'],
  purchaseDate: ['fecha_compra', 'fechacompra', 'purchase_date', 'purchasedate'],
  eventDateTime: ['fecha_evento', 'fechaevento', 'event_datetime', 'eventdatetime'],
  eventTimeSlot: ['franja_horaria', 'franja', 'turno_evento', 'event_time_slot', 'eventtimeslot'],
  eventStatus: ['estado_evento', 'estadoevento', 'event_status', 'eventstatus'],
  event: ['evento', 'nombre_evento', 'event'],
  eventType: ['tipo_de_evento', 'tipo_evento', 'event_type', 'eventtype'],
  artist: ['artista', 'artist'],
  genre: ['genero', 'g\u00e9nero', 'genre'],
  promoter: ['promotor', 'promoter'],
  venueSpace: ['sala_espacio', 'salaespacio', 'venue_space', 'venuespace'],
  zoneSection: ['zona_seccion', 'zonaseccion', 'zone_section', 'zonesection'],
  ticketType: ['tipo_ticket', 'tipoticket', 'ticket_type', 'tickettype'],
  movementType: ['tipo', 'tipo_movimiento', 'movement_type', 'movementtype'],
  paymentMethod: ['metodo_de_pago', 'metodo', 'payment_method', 'paymentmethod'],
  channel: ['channel', 'canal'],
  source: ['source', 'fuente'],
  medium: ['medium', 'medio'],
  campaign: ['campaign', 'campana', 'campa\u00f1a'],
  customerSegment: ['segmento_cliente', 'segmentocliente', 'customer_segment', 'customersegment'],
  category: ['categoria', 'categor\u00eda', 'category', 'tipo_categoria'],
  concept: ['concepto', 'concept'],
  ticketCount: ['tickets_pagados', 'ticket_count', 'ticketcount', 'cantidad_tickets'],
  ticketCompCount: ['tickets_cortesia', 'ticket_comp_count', 'ticketcompcount'],
  ticketRefundCount: ['tickets_devueltos', 'ticket_refund_count', 'ticketrefundcount'],
  scannedCount: ['tickets_escaneados', 'scanned_count', 'scannedcount'],
  baseAmount: ['base_imponible_eur', 'base_imponible', 'base_amount', 'baseamount'],
  vatType: ['tipo_iva', 'tipo_de_iva', 'vat_type', 'vattype'],
  vatRate: [
    'iva_pct',
    'iva_porcentaje',
    'iva',
    'tasa_iva',
    'tipo_iva',
    'tipo_de_iva',
    'vat_rate',
    'vatrate',
    'vat_type',
    'vattype',
  ],
  vatAmount: ['cuota_iva_eur', 'cuota_iva', 'vat_amount', 'vatamount'],
  withholdingRate: ['retencion_pct', 'retencion_porcentaje', 'withholding_rate', 'withholdingrate'],
  withholdingAmount: ['retencion_eur', 'withholding_amount', 'withholdingamount'],
  discountAmount: ['descuento_eur', 'discount_amount', 'discountamount'],
  feeAssumedAmount: ['fee_asumida_eur', 'fee_assumed_amount', 'feeassumedamount'],
  waitlistCount: ['waitlist', 'waitlist_count', 'waitlistcount'],
  directCostAmount: ['coste_directo_eur', 'direct_cost_amount', 'directcostamount'],
  totalCapacity: ['aforo_total', 'total_capacity', 'totalcapacity'],
  releasedCapacity: ['aforo_liberado', 'released_capacity', 'releasedcapacity'],
  sellableCapacity: ['aforo_vendible', 'sellable_capacity', 'sellablecapacity'],
  slotsAvailable: ['slots_disponibles', 'slots_available', 'slotsavailable'],
  slotsOccupied: ['slots_ocupados', 'slots_occupied', 'slotsoccupied'],
  amount: ['total_linea_eur', 'total_linea', 'importe_total', 'amount'],
  notes: ['notas', 'notes'],
}
let tokenCache = {
  token: '',
  exp: 0,
}
let mainRateValidationRepair = {
  running: false,
  lastSuccessAt: 0,
}

const INSPECTION_SAMPLE_ROWS = 25
const INSPECTION_MAX_FORMULA_CELLS = 150
const PLACEHOLDER_TAB_NAMES = new Set(['Hoja 1', 'Sheet1'])
const MAIN_RATE_VALIDATION_REPAIR_COOLDOWN_MS = 2 * 60 * 1000
const GOOGLE_API_MAX_RETRIES = 4

function getTabLayout(tabName) {
  if (tabName === GOOGLE_SHEET_MAIN_TAB) {
    return MAIN_TAB_LAYOUT
  }
  if (
    tabName === GOOGLE_SHEET_REPORT_WEEK_TAB ||
    tabName === GOOGLE_SHEET_REPORT_MONTH_TAB ||
    tabName === GOOGLE_SHEET_REPORT_EVENT_TAB
  ) {
    return REPORT_TAB_LAYOUT
  }
  if (tabName === GOOGLE_SHEET_EVENTS_TAB) {
    return EVENTS_TAB_LAYOUT
  }
  if (tabName === GOOGLE_SHEET_CONTROL_TAB) {
    return CONTROL_TAB_LAYOUT
  }
  if (tabName === GOOGLE_SHEET_MANUAL_TAB) {
    return MANUAL_TAB_LAYOUT
  }
  return {
    rows: 1000,
    columns: 26,
    columnWidths: [],
  }
}

function getCredentialsMode() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return 'json'
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) return 'json_base64'
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return 'email_private_key'
  }
  return 'none'
}

function getMissingGoogleConfig() {
  const missing = []
  if (!GOOGLE_SHEET_ID) {
    missing.push('GOOGLE_SHEET_ID')
  }
  if (getCredentialsMode() === 'none' && !GOOGLE_SHEETS_PUBLIC_FALLBACK) {
    missing.push(
      'GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    )
  }
  return missing
}

function quoteSheetTitle(title) {
  return `'${String(title || '').replace(/'/g, "''")}'`
}

function columnIndexToA1(columnIndexOneBased) {
  let column = Number(columnIndexOneBased || 0)
  if (!Number.isFinite(column) || column <= 0) {
    return 'A'
  }
  let label = ''
  while (column > 0) {
    const modulo = (column - 1) % 26
    label = String.fromCharCode(65 + modulo) + label
    column = Math.floor((column - modulo) / 26)
  }
  return label
}

function gridRangeToA1(range, fallbackSheetTitle = '') {
  if (!range) {
    return ''
  }
  const startRow = Number(range.startRowIndex ?? 0) + 1
  const endRow = Number(range.endRowIndex ?? startRow)
  const startColumn = Number(range.startColumnIndex ?? 0) + 1
  const endColumn = Number(range.endColumnIndex ?? startColumn)
  const title = fallbackSheetTitle || ''
  const titlePrefix = title ? `${quoteSheetTitle(title)}!` : ''
  const from = `${columnIndexToA1(startColumn)}${startRow}`
  const to = `${columnIndexToA1(Math.max(endColumn, startColumn))}${Math.max(endRow, startRow)}`
  return `${titlePrefix}${from}:${to}`
}

function toHexColor(rgb) {
  if (!rgb) {
    return ''
  }
  const channel = (value) => {
    const numeric = Number(value || 0)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(0, Math.min(255, Math.round(numeric * 255)))
  }
  const red = channel(rgb.red)
  const green = channel(rgb.green)
  const blue = channel(rgb.blue)
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function incrementCounter(counter, key) {
  if (!key) return
  counter[key] = (counter[key] || 0) + 1
}

function getUsedBounds(values, formulas) {
  const maxRows = Math.max(values.length, formulas.length)
  let usedRows = 0
  let usedColumns = 0

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const valueRow = Array.isArray(values[rowIndex]) ? values[rowIndex] : []
    const formulaRow = Array.isArray(formulas[rowIndex]) ? formulas[rowIndex] : []
    const maxCols = Math.max(valueRow.length, formulaRow.length)
    for (let colIndex = 0; colIndex < maxCols; colIndex += 1) {
      const valueCell = String(valueRow[colIndex] ?? '').trim()
      const formulaCell = String(formulaRow[colIndex] ?? '').trim()
      if (valueCell || formulaCell) {
        usedRows = Math.max(usedRows, rowIndex + 1)
        usedColumns = Math.max(usedColumns, colIndex + 1)
      }
    }
  }

  return { usedRows, usedColumns }
}

function trimMatrix(values, usedRows, usedColumns) {
  if (!usedRows || !usedColumns) {
    return []
  }
  const matrix = []
  for (let rowIndex = 0; rowIndex < usedRows; rowIndex += 1) {
    const row = Array.isArray(values[rowIndex]) ? values[rowIndex] : []
    const trimmedRow = []
    for (let colIndex = 0; colIndex < usedColumns; colIndex += 1) {
      trimmedRow.push(row[colIndex] ?? '')
    }
    matrix.push(trimmedRow)
  }
  return matrix
}

function getFormulaCells(formulaMatrix, usedRows, usedColumns) {
  const result = []
  if (!usedRows || !usedColumns) {
    return result
  }
  for (let rowIndex = 0; rowIndex < usedRows; rowIndex += 1) {
    const row = Array.isArray(formulaMatrix[rowIndex]) ? formulaMatrix[rowIndex] : []
    for (let colIndex = 0; colIndex < usedColumns; colIndex += 1) {
      const formula = String(row[colIndex] ?? '').trim()
      if (!formula.startsWith('=')) continue
      result.push({
        cell: `${columnIndexToA1(colIndex + 1)}${rowIndex + 1}`,
        formula,
      })
      if (result.length >= INSPECTION_MAX_FORMULA_CELLS) {
        return result
      }
    }
  }
  return result
}

function summarizeFormatsAndValidations(sheetPayload) {
  const dataBlock = Array.isArray(sheetPayload?.data) ? sheetPayload.data[0] : null
  const rowData = Array.isArray(dataBlock?.rowData) ? dataBlock.rowData : []
  const startRow = Number(dataBlock?.startRow || 0)
  const startColumn = Number(dataBlock?.startColumn || 0)

  const formatSummary = {
    backgroundColors: {},
    textColors: {},
    numberFormats: {},
    horizontalAlignments: {},
    verticalAlignments: {},
    wrapStrategies: {},
    boldCells: 0,
    italicCells: 0,
    borderedCells: 0,
  }
  const validationsMap = new Map()

  rowData.forEach((row, rowOffset) => {
    const values = Array.isArray(row?.values) ? row.values : []
    values.forEach((cell, colOffset) => {
      const cellRow = startRow + rowOffset + 1
      const cellCol = startColumn + colOffset + 1
      const cellA1 = `${columnIndexToA1(cellCol)}${cellRow}`
      const format = cell?.userEnteredFormat || null

      if (format) {
        const bgColor =
          toHexColor(format.backgroundColorStyle?.rgbColor) ||
          toHexColor(format.backgroundColor)
        const textColor =
          toHexColor(format.textFormat?.foregroundColorStyle?.rgbColor) ||
          toHexColor(format.textFormat?.foregroundColor)

        incrementCounter(formatSummary.backgroundColors, bgColor || 'sin_color')
        incrementCounter(formatSummary.textColors, textColor || 'sin_color')

        const numberPattern = String(format.numberFormat?.pattern || '').trim()
        const numberType = String(format.numberFormat?.type || '').trim()
        if (numberType || numberPattern) {
          incrementCounter(
            formatSummary.numberFormats,
            `${numberType || 'TIPO'}${numberPattern ? ` (${numberPattern})` : ''}`,
          )
        }

        incrementCounter(
          formatSummary.horizontalAlignments,
          String(format.horizontalAlignment || 'SIN_DEFINIR'),
        )
        incrementCounter(
          formatSummary.verticalAlignments,
          String(format.verticalAlignment || 'SIN_DEFINIR'),
        )
        incrementCounter(
          formatSummary.wrapStrategies,
          String(format.wrapStrategy || 'SIN_DEFINIR'),
        )

        if (format.textFormat?.bold) {
          formatSummary.boldCells += 1
        }
        if (format.textFormat?.italic) {
          formatSummary.italicCells += 1
        }

        const borders = format.borders || {}
        const hasBorder = ['top', 'bottom', 'left', 'right'].some((side) => {
          const style = borders?.[side]?.style
          return Boolean(style && style !== 'NONE')
        })
        if (hasBorder) {
          formatSummary.borderedCells += 1
        }
      }

      const validation = cell?.dataValidation || null
      if (validation) {
        const conditionType = String(validation.condition?.type || 'SIN_CONDICION')
        const valuesList = Array.isArray(validation.condition?.values)
          ? validation.condition.values
              .map((item) => String(item?.userEnteredValue || '').trim())
              .filter(Boolean)
          : []
        const strict = validation.strict ? 'SI' : 'NO'
        const key = `${conditionType}|${valuesList.join(',')}|ESTRICTA:${strict}`
        const current = validationsMap.get(key) || {
          conditionType,
          values: valuesList,
          strict: validation.strict ? true : false,
          cells: [],
          totalCells: 0,
        }
        current.totalCells += 1
        if (current.cells.length < 25) {
          current.cells.push(cellA1)
        }
        validationsMap.set(key, current)
      }
    })
  })

  return {
    formatSummary,
    validations: Array.from(validationsMap.values()),
  }
}

function countNonEmptyCells(values) {
  let total = 0
  values.forEach((row) => {
    const safeRow = Array.isArray(row) ? row : []
    safeRow.forEach((cell) => {
      if (String(cell ?? '').trim()) {
        total += 1
      }
    })
  })
  return total
}

async function isTabEffectivelyEmpty(tabName) {
  const range = encodeURIComponent(`${tabName}!A1:AZ`)
  const payload = await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}`)
  const values = Array.isArray(payload?.values) ? payload.values : []
  return countNonEmptyCells(values) <= 1
}

async function prunePlaceholderTabs(requiredTabNames, metadata) {
  if (!GOOGLE_SHEETS_AUTO_PRUNE_TABS) {
    return []
  }

  const required = new Set(requiredTabNames)
  const sheetEntries = Array.isArray(metadata?.sheets) ? metadata.sheets : []

  const candidates = sheetEntries
    .map((sheet) => ({
      title: String(sheet?.properties?.title || '').trim(),
      sheetId: Number(sheet?.properties?.sheetId || 0),
    }))
    .filter((sheet) => sheet.title && Number.isFinite(sheet.sheetId))
    .filter((sheet) => !required.has(sheet.title))
    .filter((sheet) => PLACEHOLDER_TAB_NAMES.has(sheet.title))

  if (candidates.length === 0) {
    return []
  }

  const deletable = []
  for (const sheet of candidates) {
    // Solo borra pestanas placeholder casi vacias para evitar perdidas.
    const emptyLike = await isTabEffectivelyEmpty(sheet.title)
    if (emptyLike) {
      deletable.push(sheet)
    }
  }

  if (deletable.length === 0) {
    return []
  }

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: deletable.map((sheet) => ({
        deleteSheet: {
          sheetId: sheet.sheetId,
        },
      })),
    }),
  })

  return deletable.map((sheet) => sheet.title)
}

function normalizeHeaderToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function isSpreadsheetErrorToken(value) {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
  return /^#(REF|N\/A|VALUE|DIV\/0|NAME|NULL|NUM|ERROR)/.test(raw)
}

function sanitizeSpreadsheetText(value, fallback = '') {
  const raw = repairMojibakeText(String(value ?? '')).trim()
  if (!raw || isSpreadsheetErrorToken(raw)) {
    return fallback
  }
  return raw
}

function repairMojibakeText(value) {
  const raw = String(value || '')
  if (!/[ÃÂâ�]/.test(raw)) {
    return raw
  }

  try {
    const bytes = new Uint8Array(Array.from(raw).map((char) => char.charCodeAt(0)))
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (decoded && !/[ÃÂâ�]/.test(decoded)) {
      return decoded
    }
  } catch {
    // noop
  }

  return raw
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã„/g, 'Ä')
    .replace(/â€œ|â€/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '-')
    .replace(/Âº/g, 'º')
    .replace(/Âª/g, 'ª')
    .replace(/Â/g, '')
}

function parseAmountEs(value, defaultValue = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const raw = sanitizeSpreadsheetText(value)
  if (!raw) {
    return defaultValue
  }
  const compact = raw
    .replace(/\s/g, '')
    .replace(/%/g, '')
    .replace(/€/g, '')
    .replace(/EUR/gi, '')
  if (compact.includes(',')) {
    const parsed = Number(compact.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : defaultValue
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    const parsed = Number(compact.replace(/\./g, ''))
    return Number.isFinite(parsed) ? parsed : defaultValue
  }
  const parsed = Number(compact)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function normalizeRateForPercentScale(value) {
  const raw = sanitizeSpreadsheetText(value)
  const parsed = parseAmountEs(value, Number.NaN)
  if (!Number.isFinite(parsed)) {
    return ''
  }
  let normalized = Math.max(0, parsed)
  const hadPercentToken = raw.includes('%')
  if (hadPercentToken && normalized > 100) {
    normalized /= 100
  }
  if (normalized <= 1) {
    normalized *= 100
  }
  if (normalized > 100 && normalized <= 10000) {
    const divided = normalized / 100
    if (divided <= 100) {
      normalized = divided
    }
  }
  if (!Number.isFinite(normalized)) {
    return ''
  }
  return Number(normalized.toFixed(2))
}

function formatRateTokenForSheet(value) {
  const normalized = normalizeRateForPercentScale(value)
  if (normalized === '' || !Number.isFinite(normalized)) {
    return ''
  }
  const rounded = Number(normalized.toFixed(2))
  const raw = Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(2).replace('.', ',')
  return `${raw}%`
}

function parseIntSafe(value, defaultValue = 0) {
  const parsed = Math.round(parseAmountEs(value, Number.NaN))
  if (!Number.isFinite(parsed)) {
    return defaultValue
  }
  return parsed
}

function parseEsDateParts(rawValue) {
  const raw = String(rawValue || '').trim()
  const match = raw.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const hour = Number(match[4] ?? 0)
  const minute = Number(match[5] ?? 0)
  const second = Number(match[6] ?? 0)
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null
  }
  const candidate = new Date(year, month - 1, day, hour, minute, second)
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null
  }
  return { year, month, day, hour, minute, second }
}

function normalizeISODate(value, fallback = '') {
  const raw = sanitizeSpreadsheetText(value)
  if (!raw) {
    return fallback
  }
  const parts = parseEsDateParts(raw)
  if (parts) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }
  return parsed.toISOString().slice(0, 10)
}

function normalizeISODateTime(value, fallbackDate = '') {
  const raw = sanitizeSpreadsheetText(value)
  if (!raw) {
    return fallbackDate ? `${fallbackDate}T22:00:00` : ''
  }
  const parts = parseEsDateParts(raw)
  if (parts) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    return raw.length === 16 ? `${raw}:00` : raw
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate ? `${fallbackDate}T22:00:00` : ''
  }
  return parsed.toISOString().slice(0, 19)
}

function toMovementType(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  return normalized === 'GASTO' ? 'GASTO' : 'INGRESO'
}

function toPaymentMethod(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (normalized === 'EFECTIVO') return 'EFECTIVO'
  if (normalized === 'TRANSFERENCIA') return 'TRANSFERENCIA'
  return 'TARJETA'
}

function mapVatTypeTokenToRate(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '')
  if (!normalized) return 0
  if (normalized === 'EXENTO' || normalized === '0' || normalized === '0%') return 0
  if (normalized === 'IVA_4' || normalized === '4' || normalized === '4%') return 4
  if (normalized === 'IVA_10' || normalized === '10' || normalized === '10%') return 10
  if (normalized === 'IVA_21' || normalized === '21' || normalized === '21%') return 21
  const parsed = parseAmountEs(normalized, Number.NaN)
  if (!Number.isFinite(parsed)) return 0
  return parsed <= 1 ? parsed * 100 : parsed
}

function mapVatRateToType(value) {
  let rounded = parseAmountEs(value, 0)
  if (rounded <= 1) {
    rounded *= 100
  }
  rounded = Math.round(rounded)
  if (rounded === 4) return 'IVA_4'
  if (rounded === 10) return 'IVA_10'
  if (rounded === 21) return 'IVA_21'
  return 'EXENTO'
}

function pickValue(rowMap, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(rowMap, alias)) {
      return rowMap[alias]
    }
  }
  return ''
}

function normalizeEntryFromSheet(rowMap, index) {
  const movementType = toMovementType(pickValue(rowMap, HEADER_ALIASES.movementType))
  const eventDateFallback = normalizeISODate(pickValue(rowMap, HEADER_ALIASES.eventDateTime))
  const date =
    normalizeISODate(pickValue(rowMap, HEADER_ALIASES.date)) ||
    normalizeISODate(pickValue(rowMap, HEADER_ALIASES.purchaseDate)) ||
    eventDateFallback ||
    normalizeISODate(new Date().toISOString().slice(0, 10))

  const baseAmount = parseAmountEs(pickValue(rowMap, HEADER_ALIASES.baseAmount), 0)
  const vatAmount = parseAmountEs(pickValue(rowMap, HEADER_ALIASES.vatAmount), 0)
  const withholdingAmount = parseAmountEs(pickValue(rowMap, HEADER_ALIASES.withholdingAmount), 0)
  const discountAmount = parseAmountEs(pickValue(rowMap, HEADER_ALIASES.discountAmount), 0)
  const vatRateFromRateColumn = parseAmountEs(pickValue(rowMap, HEADER_ALIASES.vatRate), Number.NaN)
  const vatRateValue = Number.isFinite(vatRateFromRateColumn)
    ? normalizeRateForPercentScale(vatRateFromRateColumn)
    : mapVatTypeTokenToRate(pickValue(rowMap, HEADER_ALIASES.vatType))
  const withholdingRateValue = normalizeRateForPercentScale(
    pickValue(rowMap, HEADER_ALIASES.withholdingRate),
  )

  let amount = parseAmountEs(pickValue(rowMap, HEADER_ALIASES.amount), Number.NaN)
  if (!Number.isFinite(amount) || amount <= 0) {
    amount = baseAmount + vatAmount - withholdingAmount - discountAmount
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  const event =
    String(pickValue(rowMap, HEADER_ALIASES.event) || '').trim() || 'Evento sin nombre'
  const concept =
    String(pickValue(rowMap, HEADER_ALIASES.concept) || '').trim() || 'Linea sin concepto'
  const category =
    String(pickValue(rowMap, HEADER_ALIASES.category) || '').trim() ||
    (movementType === 'INGRESO' ? 'Taquilla' : 'Otros')
  const generatedId = `sheet-${date.replace(/-/g, '')}-${String(index).padStart(5, '0')}`

  return {
    id: sanitizeSpreadsheetText(pickValue(rowMap, HEADER_ALIASES.id), generatedId) || generatedId,
    date,
    purchaseDate:
      normalizeISODate(pickValue(rowMap, HEADER_ALIASES.purchaseDate), date) || date,
    eventDateTime: normalizeISODateTime(
      pickValue(rowMap, HEADER_ALIASES.eventDateTime),
      date,
    ),
    eventTimeSlot: sanitizeSpreadsheetText(pickValue(rowMap, HEADER_ALIASES.eventTimeSlot)),
    eventType: sanitizeSpreadsheetText(pickValue(rowMap, HEADER_ALIASES.eventType)),
    eventStatus:
      String(pickValue(rowMap, HEADER_ALIASES.eventStatus) || '').trim() || 'PROGRAMADO',
    event,
    artist:
      String(pickValue(rowMap, HEADER_ALIASES.artist) || '').trim() || event,
    genre:
      String(pickValue(rowMap, HEADER_ALIASES.genre) || '').trim() || 'General',
    promoter:
      String(pickValue(rowMap, HEADER_ALIASES.promoter) || '').trim() || 'Bella Bestia',
    venueSpace:
      String(pickValue(rowMap, HEADER_ALIASES.venueSpace) || '').trim() || 'Sala principal',
    zoneSection:
      String(pickValue(rowMap, HEADER_ALIASES.zoneSection) || '').trim() || 'General',
    ticketType:
      String(pickValue(rowMap, HEADER_ALIASES.ticketType) || '').trim() || 'General',
    movementType,
    paymentMethod: toPaymentMethod(pickValue(rowMap, HEADER_ALIASES.paymentMethod)),
    channel:
      String(pickValue(rowMap, HEADER_ALIASES.channel) || '').trim() || 'Directo',
    source:
      String(pickValue(rowMap, HEADER_ALIASES.source) || '').trim() || 'Directo',
    medium:
      String(pickValue(rowMap, HEADER_ALIASES.medium) || '').trim() || 'Orgánico',
    campaign:
      String(pickValue(rowMap, HEADER_ALIASES.campaign) || '').trim() || 'Sin campa\u00f1a',
    customerSegment:
      String(pickValue(rowMap, HEADER_ALIASES.customerSegment) || '').trim() || 'NUEVO',
    category,
    concept,
    ticketCount: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.ticketCount), 0),
    ticketCompCount: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.ticketCompCount), 0),
    ticketRefundCount: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.ticketRefundCount), 0),
    scannedCount: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.scannedCount), 0),
    baseAmount,
    vatType: mapVatRateToType(vatRateValue),
    vatRate: vatRateValue,
    vatAmount,
    withholdingRate: withholdingRateValue === '' ? 0 : withholdingRateValue,
    withholdingAmount,
    discountAmount,
    feeAssumedAmount: parseAmountEs(
      pickValue(rowMap, HEADER_ALIASES.feeAssumedAmount),
      0,
    ),
    waitlistCount: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.waitlistCount), 0),
    directCostAmount: parseAmountEs(pickValue(rowMap, HEADER_ALIASES.directCostAmount), 0),
    totalCapacity: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.totalCapacity), 0),
    releasedCapacity: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.releasedCapacity), 0),
    sellableCapacity: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.sellableCapacity), 0),
    slotsAvailable: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.slotsAvailable), 0),
    slotsOccupied: parseIntSafe(pickValue(rowMap, HEADER_ALIASES.slotsOccupied), 0),
    amount,
    notes: sanitizeSpreadsheetText(pickValue(rowMap, HEADER_ALIASES.notes)),
  }
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readEntriesFromDisk() {
  try {
    const raw = fs.readFileSync(LOCAL_LEDGER_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEntriesToDisk(entries) {
  ensureDataDir()
  fs.writeFileSync(LOCAL_LEDGER_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

function base64url(value) {
  const raw = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
  return raw
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function getServiceAccountConfig() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
        }
      }
    } catch {}
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    try {
      const raw = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8')
      const parsed = JSON.parse(raw)
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
        }
      }
    } catch {}
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return {
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }

  return null
}

function isGoogleSheetsEnabled() {
  return Boolean(GOOGLE_SHEET_ID && getServiceAccountConfig())
}

function isGoogleSheetsPublicFallbackEnabled() {
  return Boolean(GOOGLE_SHEET_ID && GOOGLE_SHEETS_PUBLIC_FALLBACK)
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache.token && tokenCache.exp - 30 > now) {
    return tokenCache.token
  }

  const credentials = getServiceAccountConfig()
  if (!credentials) {
    throw new Error('Credenciales de Google no configuradas.')
  }

  const payload = {
    iss: credentials.clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  if (GOOGLE_IMPERSONATE_USER) {
    payload.sub = GOOGLE_IMPERSONATE_USER
  }

  const unsignedToken = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url(payload)}`
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedToken)
    .end()
    .sign(credentials.privateKey)

  const assertion = `${unsignedToken}.${base64url(signature)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const tokenPayload = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || 'No se pudo obtener token de Google.')
  }

  tokenCache = {
    token: tokenPayload.access_token,
    exp: now + Number(tokenPayload.expires_in || 3600),
  }
  return tokenCache.token
}

async function googleSheetsRequest(apiPath, init = {}) {
  for (let attempt = 0; attempt <= GOOGLE_API_MAX_RETRIES; attempt += 1) {
    const token = await getGoogleAccessToken()
    const res = await fetch(`https://sheets.googleapis.com/v4${apiPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })

    if (res.ok) {
      return res.status === 204 ? {} : res.json()
    }

    const body = await res.text()
    const retryAfterHeader = Number.parseInt(String(res.headers.get('retry-after') || ''), 10)
    const retryDelayMs = Number.isFinite(retryAfterHeader)
      ? retryAfterHeader * 1000
      : 1200 + attempt * 1200
    const canRetry = (res.status === 429 || res.status >= 500) && attempt < GOOGLE_API_MAX_RETRIES

    if (canRetry) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      continue
    }

    throw new Error(`Google Sheets API error (${res.status}): ${body}`)
  }

  throw new Error('Google Sheets API error: reintentos agotados.')
}

async function runBatchUpdateWithFallback(requests, contextLabel = 'batchUpdate') {
  if (!Array.isArray(requests) || requests.length === 0) {
    return
  }
  try {
    await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    })
    return
  } catch (error) {
    console.warn(
      `[sheets] ${contextLabel}: fallo en lote (${error?.message || error}). Reintentando por bloques.`,
    )
  }

  for (const request of requests) {
    try {
      await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: [request] }),
      })
    } catch (error) {
      const requestKey =
        request && typeof request === 'object' ? Object.keys(request)[0] || 'request' : 'request'
      const errorMessage = String(error?.message || error || '')
      if (
        requestKey === 'deleteProtectedRange' &&
        errorMessage.toLowerCase().includes('no protected range with id')
      ) {
        continue
      }
      console.warn(
        `[sheets] ${contextLabel}: no se pudo aplicar ${requestKey} (${errorMessage}).`,
      )
    }
  }
}

function buildBatchGetPath(ranges, valueRenderOption = 'FORMATTED_VALUE') {
  const params = new URLSearchParams()
  ranges.forEach((range) => params.append('ranges', range))
  params.set('majorDimension', 'ROWS')
  params.set('valueRenderOption', valueRenderOption)
  params.set('dateTimeRenderOption', 'FORMATTED_STRING')
  return `/spreadsheets/${GOOGLE_SHEET_ID}/values:batchGet?${params.toString()}`
}

async function getSheetGridDetails(tabName, a1Range) {
  const params = new URLSearchParams()
  params.set('includeGridData', 'true')
  params.append('ranges', a1Range)
  params.set(
    'fields',
    [
      'sheets.properties(sheetId,title)',
      'sheets.data.startRow',
      'sheets.data.startColumn',
      'sheets.data.rowData.values.userEnteredValue',
      'sheets.data.rowData.values.effectiveValue',
      'sheets.data.rowData.values.userEnteredFormat',
      'sheets.data.rowData.values.dataValidation',
    ].join(','),
  )

  const payload = await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}?${params.toString()}`)
  const sheet = Array.isArray(payload.sheets) ? payload.sheets[0] : null
  if (!sheet) {
    return {
      tabName,
      range: a1Range,
      formatSummary: {
        backgroundColors: {},
        textColors: {},
        numberFormats: {},
        horizontalAlignments: {},
        verticalAlignments: {},
        wrapStrategies: {},
        boldCells: 0,
        italicCells: 0,
        borderedCells: 0,
      },
      validations: [],
    }
  }
  const summary = summarizeFormatsAndValidations(sheet)
  return {
    tabName,
    range: a1Range,
    ...summary,
  }
}

async function getSpreadsheetMetadataDetailed() {
  const fields = [
    'properties.title',
    'sheets.properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount,frozenRowCount,frozenColumnCount))',
    'sheets.merges',
    'sheets.basicFilter',
    'sheets.filterViews(title,range)',
    'sheets.conditionalFormats(ranges,booleanRule.condition.type,gradientRule)',
    'sheets.protectedRanges(protectedRangeId,description,warningOnly,requestingUserCanEdit,range)',
  ].join(',')
  return googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}?fields=${encodeURIComponent(fields)}`)
}

async function getSpreadsheetMetadata() {
  return googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}?fields=sheets.properties(sheetId,title,gridProperties)`,
  )
}

export function getDataSourceDiagnostics() {
  const credentialsMode = getCredentialsMode()
  const missing = getMissingGoogleConfig()
  return {
    enabled: isGoogleSheetsEnabled(),
    publicFallback: isGoogleSheetsPublicFallbackEnabled(),
    readyForGoogleSheets: missing.length === 0,
    readOnly: GOOGLE_SHEETS_READ_ONLY,
    sheetId: GOOGLE_SHEET_ID || '',
    credentialsMode,
    usingImpersonation: Boolean(GOOGLE_IMPERSONATE_USER),
    impersonatedUser: GOOGLE_IMPERSONATE_USER || null,
    autoBootstrap: GOOGLE_SHEETS_AUTO_BOOTSTRAP,
    autoRebuildReports: GOOGLE_SHEETS_AUTO_REBUILD_REPORTS,
    autoPruneTabs: GOOGLE_SHEETS_AUTO_PRUNE_TABS,
    missing,
  }
}

export async function runGoogleSheetsConnectivityCheck() {
  const diagnostics = getDataSourceDiagnostics()

  if (diagnostics.enabled) {
    try {
      const metadata = await getSpreadsheetMetadata()
      const tabs = Array.isArray(metadata?.sheets)
        ? metadata.sheets.map((sheet) => ({
            title: String(sheet?.properties?.title || ''),
            sheetId: Number(sheet?.properties?.sheetId || 0),
            rows: Number(sheet?.properties?.gridProperties?.rowCount || 0),
            columns: Number(sheet?.properties?.gridProperties?.columnCount || 0),
          }))
        : []

      return {
        ok: true,
        diagnostics,
        spreadsheet: {
          id: GOOGLE_SHEET_ID,
          url: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`,
          tabs,
          mode: 'service_account',
        },
      }
    } catch (error) {
      return {
        ok: false,
        diagnostics,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo validar acceso a Google Sheets.',
      }
    }
  }

  if (diagnostics.publicFallback) {
    try {
      const entries = await readEntriesFromGoogleSheetPublic()
      return {
        ok: true,
        diagnostics,
        spreadsheet: {
          id: GOOGLE_SHEET_ID,
          url: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`,
          mode: 'public_fallback',
          entriesPreview: entries.slice(0, 5).length,
        },
      }
    } catch (error) {
      return {
        ok: false,
        diagnostics,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo validar lectura publica de Google Sheets.',
      }
    }
  }

  if (!diagnostics.readyForGoogleSheets) {
    return {
      ok: false,
      diagnostics,
      error: `Faltan variables: ${diagnostics.missing.join(', ')}`,
    }
  }

  return {
    ok: false,
    diagnostics,
    error: 'No hay conectividad activa con Google Sheets en este entorno.',
  }
}

export async function inspectSpreadsheetWorkspace() {
  const diagnostics = getDataSourceDiagnostics()
  if (!diagnostics.readyForGoogleSheets) {
    throw new Error(
      `Faltan variables para inspeccionar la hoja: ${diagnostics.missing.join(', ')}`,
    )
  }

  const metadata = await getSpreadsheetMetadataDetailed()
  const sheets = Array.isArray(metadata?.sheets) ? metadata.sheets : []
  const tabNames = sheets
    .map((sheet) => String(sheet?.properties?.title || '').trim())
    .filter(Boolean)

  const ranges = tabNames.map((tab) => `${quoteSheetTitle(tab)}!A1:ZZ`)
  const [displayBatch, formulaBatch] = await Promise.all([
    googleSheetsRequest(buildBatchGetPath(ranges, 'FORMATTED_VALUE')),
    googleSheetsRequest(buildBatchGetPath(ranges, 'FORMULA')),
  ])

  const displayRanges = Array.isArray(displayBatch?.valueRanges) ? displayBatch.valueRanges : []
  const formulaRanges = Array.isArray(formulaBatch?.valueRanges) ? formulaBatch.valueRanges : []

  const tabs = []
  for (let index = 0; index < tabNames.length; index += 1) {
    const tabName = tabNames[index]
    const sheetMeta = sheets.find((sheet) => String(sheet?.properties?.title || '') === tabName)

    const displayValuesRaw = Array.isArray(displayRanges[index]?.values)
      ? displayRanges[index].values
      : []
    const formulaValuesRaw = Array.isArray(formulaRanges[index]?.values)
      ? formulaRanges[index].values
      : []
    const usedBounds = getUsedBounds(displayValuesRaw, formulaValuesRaw)
    const usedRows = usedBounds.usedRows
    const usedColumns = usedBounds.usedColumns
    const usedRangeA1 =
      usedRows > 0 && usedColumns > 0
        ? `${columnIndexToA1(1)}1:${columnIndexToA1(usedColumns)}${usedRows}`
        : 'A1:A1'

    const displayMatrix = trimMatrix(displayValuesRaw, usedRows, usedColumns)
    const formulaMatrix = trimMatrix(formulaValuesRaw, usedRows, usedColumns)
    const formulaCells = getFormulaCells(formulaMatrix, usedRows, usedColumns)

    const gridRangeA1 = `${quoteSheetTitle(tabName)}!${usedRangeA1}`
    const gridSummary = await getSheetGridDetails(tabName, gridRangeA1)

    const basicFilterRange = gridRangeToA1(sheetMeta?.basicFilter?.range, tabName)
    const filterViews = Array.isArray(sheetMeta?.filterViews)
      ? sheetMeta.filterViews.map((view) => ({
          title: String(view?.title || 'Vista sin nombre'),
          range: gridRangeToA1(view?.range, tabName),
        }))
      : []
    const merges = Array.isArray(sheetMeta?.merges)
      ? sheetMeta.merges.map((merge) => gridRangeToA1(merge, tabName))
      : []
    const conditionalFormats = Array.isArray(sheetMeta?.conditionalFormats)
      ? sheetMeta.conditionalFormats.map((rule, ruleIndex) => ({
          index: ruleIndex + 1,
          type: rule?.booleanRule?.condition?.type
            ? `BOOLEAN:${rule.booleanRule.condition.type}`
            : rule?.gradientRule
              ? 'GRADIENT'
              : 'OTRO',
          ranges: Array.isArray(rule?.ranges)
            ? rule.ranges.map((range) => gridRangeToA1(range, tabName))
            : [],
        }))
      : []
    const protectedRanges = Array.isArray(sheetMeta?.protectedRanges)
      ? sheetMeta.protectedRanges.map((protection, protectionIndex) => ({
          index: protectionIndex + 1,
          description: String(protection?.description || ''),
          warningOnly: Boolean(protection?.warningOnly),
          requestingUserCanEdit: Boolean(protection?.requestingUserCanEdit),
          range: gridRangeToA1(protection?.range, tabName),
        }))
      : []

    tabs.push({
      title: tabName,
      structure: {
        sheetId: Number(sheetMeta?.properties?.sheetId || 0),
        index: Number(sheetMeta?.properties?.index || 0),
        hidden: Boolean(sheetMeta?.properties?.hidden),
        rows: Number(sheetMeta?.properties?.gridProperties?.rowCount || 0),
        columns: Number(sheetMeta?.properties?.gridProperties?.columnCount || 0),
        frozenRows: Number(sheetMeta?.properties?.gridProperties?.frozenRowCount || 0),
        frozenColumns: Number(sheetMeta?.properties?.gridProperties?.frozenColumnCount || 0),
        usedRows,
        usedColumns,
        usedRange: usedRows > 0 && usedColumns > 0 ? `${tabName}!${usedRangeA1}` : `${tabName}!A1:A1`,
      },
      visibleData: {
        rowsPreview: displayMatrix.slice(0, INSPECTION_SAMPLE_ROWS),
      },
      formulas: {
        totalFormulaCells: formulaCells.length,
        sample: formulaCells.slice(0, INSPECTION_SAMPLE_ROWS),
      },
      formats: gridSummary.formatSummary,
      mergedCells: merges,
      dataValidations: gridSummary.validations,
      filters: {
        basicFilterRange: basicFilterRange || null,
        filterViews,
      },
      conditionalFormatting: conditionalFormats,
      protections: protectedRanges,
    })
  }

  return {
    inspectedAt: new Date().toISOString(),
    workbook: {
      id: GOOGLE_SHEET_ID,
      title: String(metadata?.properties?.title || ''),
      url: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`,
    },
    tabs,
  }
}

async function ensureSheetTabs(tabNames) {
  const metadata = await getSpreadsheetMetadata()
  const existing = new Set(
    (metadata.sheets || []).map((sheet) => String(sheet?.properties?.title || '')),
  )
  const missing = tabNames.filter((name) => !existing.has(name))
  if (missing.length === 0) {
    return
  }

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: missing.map((name) => ({
        addSheet: { properties: { title: name } },
      })),
    }),
  })
}

function mapSheetIds(metadata) {
  const result = new Map()
  ;(metadata.sheets || []).forEach((sheet) => {
    const title = String(sheet?.properties?.title || '')
    const sheetId = Number(sheet?.properties?.sheetId)
    if (title && Number.isFinite(sheetId)) {
      result.set(title, sheetId)
    }
  })
  return result
}

async function migrateLegacyEventReportTab(metadata) {
  if (GOOGLE_SHEET_REPORT_EVENT_TAB === LEGACY_GOOGLE_SHEET_REPORT_EVENT_TAB) {
    return metadata
  }

  const sheets = Array.isArray(metadata?.sheets) ? metadata.sheets : []
  const legacySheet = sheets.find(
    (sheet) => String(sheet?.properties?.title || '') === LEGACY_GOOGLE_SHEET_REPORT_EVENT_TAB,
  )
  if (!legacySheet) {
    return metadata
  }

  const legacySheetId = Number(legacySheet?.properties?.sheetId || 0)
  if (!Number.isFinite(legacySheetId)) {
    return metadata
  }

  const newSheetExists = sheets.some(
    (sheet) => String(sheet?.properties?.title || '') === GOOGLE_SHEET_REPORT_EVENT_TAB,
  )

  const requests = newSheetExists
    ? [{ deleteSheet: { sheetId: legacySheetId } }]
    : [
        {
          updateSheetProperties: {
            properties: {
              sheetId: legacySheetId,
              title: GOOGLE_SHEET_REPORT_EVENT_TAB,
            },
            fields: 'title',
          },
        },
      ]

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })

  return getSpreadsheetMetadata()
}

async function upsertHeaderRow(tabName, headers) {
  const range = encodeURIComponent(`${tabName}!A1:AZ1`)
  const payload = await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}`)
  const firstRow = Array.isArray(payload.values) && payload.values[0] ? payload.values[0] : []
  const normalizedIncoming = headers.map((header) => normalizeHeaderToken(header))
  const normalizedCurrent = firstRow.map((header) => normalizeHeaderToken(header))
  const same =
    normalizedCurrent.length >= normalizedIncoming.length &&
    normalizedIncoming.every((token, index) => normalizedCurrent[index] === token)

  if (same) {
    return
  }

  const updateRange = encodeURIComponent(`${tabName}!A1`)
  await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${tabName}!A1`,
        majorDimension: 'ROWS',
        values: [headers],
      }),
    },
  )
}

async function realignMainTabColumnsIfNeeded() {
  const range = encodeURIComponent(`${GOOGLE_SHEET_MAIN_TAB}!A1:AZ`)
  const payload = await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}`)
  const rows = Array.isArray(payload.values) ? payload.values : []
  if (rows.length === 0) {
    return { realigned: false, reason: 'empty' }
  }

  const currentHeaders = Array.isArray(rows[0]) ? rows[0] : []
  const normalizedCurrent = currentHeaders.map((header) => normalizeHeaderToken(header))
  const normalizedCanonical = SHEET_ENTRY_HEADERS.map((header) => normalizeHeaderToken(header))

  const same =
    normalizedCurrent.length >= normalizedCanonical.length &&
    normalizedCanonical.every((token, index) => normalizedCurrent[index] === token)
  if (same) {
    return { realigned: false, reason: 'already_aligned' }
  }

  const indexByToken = new Map()
  normalizedCurrent.forEach((token, index) => {
    if (!token || indexByToken.has(token)) {
      return
    }
    indexByToken.set(token, index)
  })

  const matchedCanonical = normalizedCanonical.filter((token) => indexByToken.has(token)).length
  if (matchedCanonical < Math.ceil(normalizedCanonical.length * 0.6)) {
    return { realigned: false, reason: 'not_enough_matching_headers' }
  }

  const reorderedRows = rows.slice(1).map((row) =>
    normalizedCanonical.map((token) => {
      const sourceIndex = indexByToken.get(token)
      if (typeof sourceIndex !== 'number') {
        return ''
      }
      return row[sourceIndex] ?? ''
    }),
  )

  await writeRowsToSheet(GOOGLE_SHEET_MAIN_TAB, [SHEET_ENTRY_HEADERS, ...reorderedRows])
  return { realigned: true, rows: reorderedRows.length }
}

function buildCorporateStyleRequests(sheetIds) {
  const red = { red: 0.85, green: 0.12, blue: 0.16 }
  const yellow = { red: 0.98, green: 0.82, blue: 0.09 }
  const white = { red: 1, green: 1, blue: 1 }
  const dark = { red: 0.12, green: 0.12, blue: 0.12 }
  const reportGray = { red: 0.86, green: 0.86, blue: 0.86 }
  const autoGray = { red: 0.86, green: 0.86, blue: 0.86 }
  const requests = []
  const managedTabs = new Set([
    GOOGLE_SHEET_MAIN_TAB,
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
    GOOGLE_SHEET_EVENTS_TAB,
    GOOGLE_SHEET_CONTROL_TAB,
    GOOGLE_SHEET_MANUAL_TAB,
  ])

  for (const [title, sheetId] of sheetIds.entries()) {
    if (!managedTabs.has(title)) {
      continue
    }
    const layout = getTabLayout(title)
    const isMain = title === GOOGLE_SHEET_MAIN_TAB
    const isControl = title === GOOGLE_SHEET_CONTROL_TAB
    const isManual = title === GOOGLE_SHEET_MANUAL_TAB
    const isReport =
      title === GOOGLE_SHEET_REPORT_WEEK_TAB ||
      title === GOOGLE_SHEET_REPORT_MONTH_TAB ||
      title === GOOGLE_SHEET_REPORT_EVENT_TAB

    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            rowCount: layout.rows,
            columnCount: layout.columns,
            frozenRowCount: 1,
          },
          tabColorStyle: {
            rgbColor: isMain
              ? red
              : isControl
                ? yellow
                : isManual
                  ? { red: 0.98, green: 0.74, blue: 0.09 }
                  : { red: 0.9, green: 0.2, blue: 0.2 },
          },
        },
        fields: 'gridProperties(rowCount,columnCount,frozenRowCount),tabColorStyle',
      },
    })

    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: {
          pixelSize: 44,
        },
        fields: 'pixelSize',
      },
    })

    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: layout.columns,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: { rgbColor: red },
            textFormat: {
              foregroundColorStyle: { rgbColor: white },
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP',
          },
        },
        fields:
          'userEnteredFormat(backgroundColorStyle,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
      },
    })

    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: layout.rows,
          startColumnIndex: 0,
          endColumnIndex: layout.columns,
        },
        cell: {
          userEnteredFormat: {
            backgroundColorStyle: {
              rgbColor: isReport ? reportGray : white,
            },
            textFormat: {
              foregroundColorStyle: { rgbColor: dark },
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColorStyle,textFormat)',
      },
    })

    if (isMain) {
      MAIN_AUTO_FIELDS.forEach((fieldName) => {
        const index = SHEET_ENTRY_FIELD_INDEX[fieldName]
        if (!Number.isFinite(index)) {
          return
        }
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: layout.rows,
              startColumnIndex: index,
              endColumnIndex: index + 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColorStyle: { rgbColor: autoGray },
                textFormat: {
                  foregroundColorStyle: { rgbColor: dark },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColorStyle,textFormat)',
          },
        })
      })
    }

    layout.columnWidths.forEach((width, index) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: index,
            endIndex: index + 1,
          },
          properties: {
            pixelSize: width,
          },
          fields: 'pixelSize',
        },
      })
    })
  }

  return requests
}

function buildCorporateNumberFormatRequests(sheetIds) {
  const requests = []

  const applyNumberFormat = (sheetId, startCol, endCol, pattern, endRowIndex = 5000) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex,
          startColumnIndex: startCol,
          endColumnIndex: endCol,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern,
            },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    })
  }

  const applyDateFormat = (sheetId, startCol, endCol, pattern, type = 'DATE') => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: MAIN_TAB_LAYOUT.rows,
          startColumnIndex: startCol,
          endColumnIndex: endCol,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type,
              pattern,
            },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    })
  }

  const mainSheetId = sheetIds.get(GOOGLE_SHEET_MAIN_TAB)
  if (Number.isFinite(mainSheetId)) {
    ;['baseAmount', 'vatAmount', 'withholdingAmount', 'discountAmount', 'amount'].forEach(
      (fieldName) => {
        const index = SHEET_ENTRY_FIELD_INDEX[fieldName]
        if (!Number.isFinite(index)) return
        applyNumberFormat(mainSheetId, index, index + 1, '#,##0.00', MAIN_TAB_LAYOUT.rows)
      },
    )

    ;['vatRate', 'withholdingRate'].forEach((fieldName) => {
      const index = SHEET_ENTRY_FIELD_INDEX[fieldName]
      if (!Number.isFinite(index)) return
      applyNumberFormat(mainSheetId, index, index + 1, '0.00"%"', MAIN_TAB_LAYOUT.rows)
    })

    const dateIndex = SHEET_ENTRY_FIELD_INDEX.date
    if (Number.isFinite(dateIndex)) {
      applyDateFormat(mainSheetId, dateIndex, dateIndex + 1, 'dd/mm/yyyy', 'DATE')
    }
    const eventDateTimeIndex = SHEET_ENTRY_FIELD_INDEX.eventDateTime
    if (Number.isFinite(eventDateTimeIndex)) {
      applyDateFormat(mainSheetId, eventDateTimeIndex, eventDateTimeIndex + 1, 'dd/mm/yyyy', 'DATE')
    }
  }

  ;[
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
  ].forEach((tabName) => {
    const sheetId = sheetIds.get(tabName)
    if (!Number.isFinite(sheetId)) {
      return
    }
    applyNumberFormat(sheetId, 2, 5, '#,##0.00', REPORT_TAB_LAYOUT.rows)
    applyNumberFormat(sheetId, 5, 6, '0.00" %"', REPORT_TAB_LAYOUT.rows)
  })

  const eventsSheetId = sheetIds.get(GOOGLE_SHEET_EVENTS_TAB)
  if (Number.isFinite(eventsSheetId)) {
    applyDateFormat(eventsSheetId, 2, 3, 'dd/mm/yyyy', 'DATE')
  }

  return requests
}

async function applyDataValidations(mainSheetId, eventsSheetId) {
  const requests = []

  const clearValidationRange = (sheetId, startColumnIndex, endColumnIndex, endRowIndex) => {
    if (!Number.isFinite(sheetId)) return
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex,
          startColumnIndex,
          endColumnIndex,
        },
        cell: {},
        fields: 'dataValidation',
      },
    })
  }

  // Limpieza previa para eliminar reglas antiguas mezcladas (0 + 0% + 0,00%).
  ;[
    'movementType',
    'category',
    'paymentMethod',
    'vatRate',
    'withholdingRate',
    'event',
  ].forEach((fieldName) => {
    const index = SHEET_ENTRY_FIELD_INDEX[fieldName]
    if (!Number.isFinite(index) || !Number.isFinite(mainSheetId)) return
    clearValidationRange(mainSheetId, index, index + 1, MAIN_TAB_LAYOUT.rows)
  })

  if (Number.isFinite(eventsSheetId)) {
    clearValidationRange(eventsSheetId, 1, 2, EVENTS_TAB_LAYOUT.rows)
    clearValidationRange(eventsSheetId, 2, 3, EVENTS_TAB_LAYOUT.rows)
    clearValidationRange(eventsSheetId, 3, 4, EVENTS_TAB_LAYOUT.rows)
  }

  const addMainListValidation = (fieldName, values, strict = true) => {
    const index = SHEET_ENTRY_FIELD_INDEX[fieldName]
    if (!Number.isFinite(index) || !Number.isFinite(mainSheetId)) return
    requests.push({
      setDataValidation: {
        range: {
          sheetId: mainSheetId,
          startRowIndex: 1,
          endRowIndex: MAIN_TAB_LAYOUT.rows,
          startColumnIndex: index,
          endColumnIndex: index + 1,
        },
        rule: {
          strict,
          showCustomUi: true,
          condition: {
            type: 'ONE_OF_LIST',
            values: values.map((value) => ({ userEnteredValue: value })),
          },
        },
      },
    })
  }

  addMainListValidation('movementType', ['INGRESO', 'GASTO'])
  addMainListValidation('category', CATEGORY_OPTIONS, false)
  addMainListValidation('paymentMethod', ['TARJETA', 'EFECTIVO', 'TRANSFERENCIA'])
  // Lista cerrada para evitar valores mezclados (0 / 0% / 0,00%) en desplegable.
  addMainListValidation('vatRate', VAT_RATE_VALIDATION_OPTIONS, true)
  addMainListValidation('withholdingRate', WITHHOLDING_RATE_VALIDATION_OPTIONS, true)

  const eventIndex = SHEET_ENTRY_FIELD_INDEX.event
  if (Number.isFinite(eventIndex) && Number.isFinite(mainSheetId) && Number.isFinite(eventsSheetId)) {
    const catalogRangeA1 = `=${quoteSheetTitle(GOOGLE_SHEET_EVENTS_TAB)}!A2:A${EVENTS_TAB_LAYOUT.rows}`
    requests.push({
      setDataValidation: {
        range: {
          sheetId: mainSheetId,
          startRowIndex: 1,
          endRowIndex: MAIN_TAB_LAYOUT.rows,
          startColumnIndex: eventIndex,
          endColumnIndex: eventIndex + 1,
        },
        rule: {
          strict: true,
          showCustomUi: true,
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: catalogRangeA1 }],
          },
        },
      },
    })
  }

  if (Number.isFinite(eventsSheetId)) {
    requests.push({
      setDataValidation: {
        range: {
          sheetId: eventsSheetId,
          startRowIndex: 1,
          endRowIndex: EVENTS_TAB_LAYOUT.rows,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        rule: {
          strict: true,
          showCustomUi: true,
          condition: {
            type: 'ONE_OF_LIST',
            values: EVENT_TYPE_OPTIONS.map((value) => ({ userEnteredValue: value })),
          },
        },
      },
    })

    requests.push({
      setDataValidation: {
        range: {
          sheetId: eventsSheetId,
          startRowIndex: 1,
          endRowIndex: EVENTS_TAB_LAYOUT.rows,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
        rule: {
          strict: true,
          showCustomUi: true,
          condition: {
            type: 'DATE_IS_VALID',
          },
        },
      },
    })

    requests.push({
      setDataValidation: {
        range: {
          sheetId: eventsSheetId,
          startRowIndex: 1,
          endRowIndex: EVENTS_TAB_LAYOUT.rows,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        rule: {
          strict: true,
          showCustomUi: true,
          condition: {
            type: 'ONE_OF_LIST',
            values: EVENT_TIME_SLOTS.map((slot) => ({ userEnteredValue: slot })),
          },
        },
      },
    })
  }

  if (requests.length === 0) {
    return
  }

  await runBatchUpdateWithFallback(requests, 'applyDataValidations')
}

async function applyMainRateColumnNumberFormat(mainSheetId) {
  const vatRateIndex = SHEET_ENTRY_FIELD_INDEX.vatRate
  const withholdingRateIndex = SHEET_ENTRY_FIELD_INDEX.withholdingRate
  if (
    !Number.isFinite(mainSheetId) ||
    !Number.isFinite(vatRateIndex) ||
    !Number.isFinite(withholdingRateIndex)
  ) {
    return
  }

  const requests = [vatRateIndex, withholdingRateIndex].map((columnIndex) => ({
    repeatCell: {
      range: {
        sheetId: mainSheetId,
        startRowIndex: 1,
        endRowIndex: MAIN_TAB_LAYOUT.rows,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: {
            type: 'TEXT',
            pattern: '@',
          },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  }))

  await runBatchUpdateWithFallback(requests, 'applyMainRateColumnNumberFormat')
}

async function ensureMainRateValidationConsistency(force = false) {
  if (!isGoogleSheetsEnabled()) {
    return
  }
  const now = Date.now()
  if (!force && now - mainRateValidationRepair.lastSuccessAt < MAIN_RATE_VALIDATION_REPAIR_COOLDOWN_MS) {
    return
  }
  if (mainRateValidationRepair.running) {
    return
  }

  mainRateValidationRepair.running = true
  try {
    const metadata = await getSpreadsheetMetadata()
    const sheetIds = mapSheetIds(metadata)
    const mainSheetId = sheetIds.get(GOOGLE_SHEET_MAIN_TAB)
    const eventsSheetId = sheetIds.get(GOOGLE_SHEET_EVENTS_TAB)
    if (!Number.isFinite(mainSheetId)) {
      return
    }

    await applyMainRateColumnNumberFormat(mainSheetId)
    await normalizeMainTabRateColumns()
    await applyDataValidations(mainSheetId, eventsSheetId)
    mainRateValidationRepair.lastSuccessAt = Date.now()
  } catch (error) {
    console.warn(
      '[sheets] No se pudo reparar validaciones de IVA/Retencion:',
      error?.message || error,
    )
  } finally {
    mainRateValidationRepair.running = false
  }
}

async function getMainSheetProtectedRanges(mainSheetId) {
  const fields = [
    'sheets.properties(sheetId,title)',
    'sheets.protectedRanges(protectedRangeId,description,warningOnly,range)',
  ].join(',')
  const metadata = await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}?fields=${encodeURIComponent(fields)}`,
  )
  const sheet = (metadata.sheets || []).find(
    (candidate) => Number(candidate?.properties?.sheetId || 0) === Number(mainSheetId),
  )
  return Array.isArray(sheet?.protectedRanges) ? sheet.protectedRanges : []
}

async function getSpreadsheetProtectedRanges() {
  const fields = [
    'sheets.properties(sheetId,title)',
    'sheets.protectedRanges(protectedRangeId,description,warningOnly,range)',
  ].join(',')
  const metadata = await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}?fields=${encodeURIComponent(fields)}`,
  )
  const bySheetId = new Map()
  ;(metadata.sheets || []).forEach((sheet) => {
    const sheetId = Number(sheet?.properties?.sheetId || 0)
    const protectedRanges = Array.isArray(sheet?.protectedRanges) ? sheet.protectedRanges : []
    if (Number.isFinite(sheetId)) {
      bySheetId.set(sheetId, protectedRanges)
    }
  })
  return bySheetId
}

function buildMainAutoProtectionRequests(mainSheetId, warningOnly) {
  return MAIN_AUTO_FIELDS.map((fieldName) => {
    const columnIndex = SHEET_ENTRY_FIELD_INDEX[fieldName]
    if (!Number.isFinite(columnIndex)) {
      return null
    }
    return {
      addProtectedRange: {
        protectedRange: {
          description: `${MAIN_AUTO_PROTECTION_PREFIX}:${fieldName}`,
          warningOnly,
          range: {
            sheetId: mainSheetId,
            startRowIndex: 1,
            endRowIndex: MAIN_TAB_LAYOUT.rows,
            startColumnIndex: columnIndex,
            endColumnIndex: columnIndex + 1,
          },
        },
      },
    }
  }).filter(Boolean)
}

async function applyMainAutoColumnProtection(mainSheetId) {
  if (!Number.isFinite(mainSheetId)) {
    return
  }

  const protectedRanges = await getMainSheetProtectedRanges(mainSheetId)
  const deleteRequests = protectedRanges
    .filter((range) =>
      String(range?.description || '').startsWith(`${MAIN_AUTO_PROTECTION_PREFIX}:`),
    )
    .map((range) => Number(range?.protectedRangeId || 0))
    .filter(Number.isFinite)
    .map((protectedRangeId) => ({ deleteProtectedRange: { protectedRangeId } }))

  const applyWithMode = async (warningOnly) => {
    const addRequests = GOOGLE_SHEETS_ENFORCE_PROTECTIONS
      ? buildMainAutoProtectionRequests(mainSheetId, warningOnly)
      : []
    const requests = [...deleteRequests, ...addRequests]
    if (requests.length === 0) {
      return
    }
    await runBatchUpdateWithFallback(
      requests,
      GOOGLE_SHEETS_ENFORCE_PROTECTIONS
        ? 'applyMainAutoColumnProtection'
        : 'clearMainAutoColumnProtection',
    )
  }

  try {
    await applyWithMode(false)
  } catch (error) {
    await applyWithMode(true)
  }
}

function buildManagedSectionProtectionRequests(sheetIds, warningOnly) {
  const requests = []
  const protectHeaderTabs = [
    GOOGLE_SHEET_MAIN_TAB,
    GOOGLE_SHEET_EVENTS_TAB,
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
    GOOGLE_SHEET_CONTROL_TAB,
    GOOGLE_SHEET_MANUAL_TAB,
  ]
  const protectReadonlyTabs = [
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
    GOOGLE_SHEET_CONTROL_TAB,
    GOOGLE_SHEET_MANUAL_TAB,
  ]

  const addProtectedRange = (tabName, suffix, range, options = {}) => {
    const sheetId = sheetIds.get(tabName)
    if (!Number.isFinite(sheetId)) {
      return
    }
    const wholeSheet = Boolean(options?.wholeSheet)
    const rawUnprotectedRanges = Array.isArray(options?.unprotectedRanges)
      ? options.unprotectedRanges
      : []
    const unprotectedRanges = rawUnprotectedRanges
      .map((entry) => {
        const startRowIndex = Number(entry?.startRowIndex)
        const endRowIndex = Number(entry?.endRowIndex)
        const startColumnIndex = Number(entry?.startColumnIndex)
        const endColumnIndex = Number(entry?.endColumnIndex)
        if (
          !Number.isFinite(startRowIndex) ||
          !Number.isFinite(endRowIndex) ||
          !Number.isFinite(startColumnIndex) ||
          !Number.isFinite(endColumnIndex)
        ) {
          return null
        }
        return {
          sheetId,
          startRowIndex,
          endRowIndex,
          startColumnIndex,
          endColumnIndex,
        }
      })
      .filter(Boolean)
    requests.push({
      addProtectedRange: {
        protectedRange: {
          description: `${MANAGED_SECTION_PROTECTION_PREFIX}:${tabName}:${suffix}`,
          warningOnly,
          range: wholeSheet
            ? { sheetId }
            : {
                sheetId,
                ...range,
              },
          ...(unprotectedRanges.length > 0 ? { unprotectedRanges } : {}),
        },
      },
    })
  }

  protectHeaderTabs.forEach((tabName) => {
    const layout = getTabLayout(tabName)
    addProtectedRange(tabName, 'HEADER', {
      startRowIndex: 0,
      endRowIndex: 1,
      startColumnIndex: 0,
      endColumnIndex: layout.columns,
    })
  })

  protectReadonlyTabs.forEach((tabName) => {
    const layout = getTabLayout(tabName)
    addProtectedRange(tabName, 'BODY', {
      startRowIndex: 1,
      endRowIndex: layout.rows,
      startColumnIndex: 0,
      endColumnIndex: layout.columns,
    })
  })

  const mainSheetId = sheetIds.get(GOOGLE_SHEET_MAIN_TAB)
  if (Number.isFinite(mainSheetId)) {
    const editableRanges = MAIN_EDITABLE_FIELDS.map((fieldName) => {
      const columnIndex = SHEET_ENTRY_FIELD_INDEX[fieldName]
      if (!Number.isFinite(columnIndex)) {
        return null
      }
      return {
        startRowIndex: 1,
        endRowIndex: MAIN_TAB_LAYOUT.rows,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      }
    }).filter(Boolean)

    addProtectedRange(
      GOOGLE_SHEET_MAIN_TAB,
      'SHEET_LOCK',
      {
        startRowIndex: 1,
        endRowIndex: MAIN_TAB_LAYOUT.rows,
        startColumnIndex: 0,
        endColumnIndex: MAIN_TAB_LAYOUT.columns,
      },
      {
        wholeSheet: true,
        unprotectedRanges: editableRanges,
      },
    )
  }

  return requests
}

async function applyManagedSheetProtection(sheetIds) {
  const protectedRangesBySheetId = await getSpreadsheetProtectedRanges()
  const deleteRequests = []

  for (const protectedRanges of protectedRangesBySheetId.values()) {
    ;(protectedRanges || []).forEach((range) => {
      const description = String(range?.description || '')
      const protectedRangeId = Number(range?.protectedRangeId || 0)
      if (!Number.isFinite(protectedRangeId)) {
        return
      }
      if (
        !GOOGLE_SHEETS_ENFORCE_PROTECTIONS ||
        description.startsWith(`${MANAGED_SECTION_PROTECTION_PREFIX}:`)
      ) {
        deleteRequests.push({ deleteProtectedRange: { protectedRangeId } })
      }
    })
  }

  const applyWithMode = async (warningOnly) => {
    const addRequests = GOOGLE_SHEETS_ENFORCE_PROTECTIONS
      ? buildManagedSectionProtectionRequests(sheetIds, warningOnly)
      : []
    const requests = [...deleteRequests, ...addRequests]
    if (requests.length === 0) {
      return
    }
    await runBatchUpdateWithFallback(
      requests,
      GOOGLE_SHEETS_ENFORCE_PROTECTIONS
        ? 'applyManagedSheetProtection'
        : 'clearSpreadsheetProtection',
    )
  }

  try {
    await applyWithMode(false)
  } catch (error) {
    await applyWithMode(true)
  }
}

async function clearLegacyVatFormulaFromNotesColumn() {
  const notesIndex = SHEET_ENTRY_FIELD_INDEX.notes
  if (!Number.isFinite(notesIndex)) {
    return
  }
  const notesColumn = columnIndexToA1(notesIndex + 1)
  const singleCellRange = `${GOOGLE_SHEET_MAIN_TAB}!${notesColumn}2`
  const encodedRange = encodeURIComponent(singleCellRange)
  const payload = await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodedRange}?valueRenderOption=FORMULA`,
  )
  const current = String(payload?.values?.[0]?.[0] || '')
    .trim()
    .toUpperCase()

  const looksLikeLegacyVatFormula =
    current.startsWith('=ARRAYFORMULA') &&
    (current.includes('IVA_4') ||
      current.includes('IVA_10') ||
      current.includes('IVA_21') ||
      current.includes('EXENTO'))
  if (!looksLikeLegacyVatFormula) {
    return
  }

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({
      ranges: [singleCellRange],
    }),
  })
}

async function normalizeMainTabRateColumns() {
  const vatRateIndex = SHEET_ENTRY_FIELD_INDEX.vatRate
  const withholdingRateIndex = SHEET_ENTRY_FIELD_INDEX.withholdingRate
  if (!Number.isFinite(vatRateIndex) || !Number.isFinite(withholdingRateIndex)) {
    return
  }

  const vatRateColumn = columnIndexToA1(vatRateIndex + 1)
  const withholdingRateColumn = columnIndexToA1(withholdingRateIndex + 1)
  const a1Range = `${GOOGLE_SHEET_MAIN_TAB}!${vatRateColumn}2:${withholdingRateColumn}${MAIN_TAB_LAYOUT.rows}`
  const encodedRange = encodeURIComponent(a1Range)
  const payload = await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}/values/${encodedRange}?valueRenderOption=UNFORMATTED_VALUE`,
  )
  const rows = Array.isArray(payload?.values) ? payload.values : []
  if (rows.length === 0) {
    return
  }

  let changed = false
  const normalizedRows = rows.map((row) => {
    const vatValue = row[0] ?? ''
    const withholdingValue = row[1] ?? ''
    const vatEmpty = vatValue === '' || vatValue === null || vatValue === undefined
    const withholdingEmpty =
      withholdingValue === '' || withholdingValue === null || withholdingValue === undefined
    const nextVat = formatRateTokenForSheet(vatValue)
    const nextWithholding = formatRateTokenForSheet(withholdingValue)
    const currentVatText = sanitizeSpreadsheetText(vatValue)
    const currentWithholdingText = sanitizeSpreadsheetText(withholdingValue)
    const vatMatches =
      nextVat === ''
        ? vatEmpty
        : currentVatText === nextVat
    const withholdingMatches =
      nextWithholding === ''
        ? withholdingEmpty
        : currentWithholdingText === nextWithholding
    if (
      !vatMatches ||
      !withholdingMatches
    ) {
      changed = true
    }
    return [nextVat, nextWithholding]
  })

  if (!changed) {
    return
  }

  const updateRange = encodeURIComponent(`${GOOGLE_SHEET_MAIN_TAB}!${vatRateColumn}2`)
  await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${GOOGLE_SHEET_MAIN_TAB}!${vatRateColumn}2`,
        majorDimension: 'ROWS',
        values: normalizedRows,
      }),
    },
  )
}

async function applyMainTabComputedFormulas() {
  const idIndex = SHEET_ENTRY_FIELD_INDEX.id
  const eventIndex = SHEET_ENTRY_FIELD_INDEX.event
  const baseAmountIndex = SHEET_ENTRY_FIELD_INDEX.baseAmount
  const vatRateIndex = SHEET_ENTRY_FIELD_INDEX.vatRate
  const withholdingRateIndex = SHEET_ENTRY_FIELD_INDEX.withholdingRate
  const discountAmountIndex = SHEET_ENTRY_FIELD_INDEX.discountAmount
  const vatAmountIndex = SHEET_ENTRY_FIELD_INDEX.vatAmount
  const withholdingAmountIndex = SHEET_ENTRY_FIELD_INDEX.withholdingAmount
  const amountIndex = SHEET_ENTRY_FIELD_INDEX.amount
  const eventDateIndex = SHEET_ENTRY_FIELD_INDEX.eventDateTime
  const eventTimeSlotIndex = SHEET_ENTRY_FIELD_INDEX.eventTimeSlot
  if (
    !Number.isFinite(idIndex) ||
    !Number.isFinite(eventIndex) ||
    !Number.isFinite(baseAmountIndex) ||
    !Number.isFinite(vatRateIndex) ||
    !Number.isFinite(withholdingRateIndex) ||
    !Number.isFinite(discountAmountIndex) ||
    !Number.isFinite(vatAmountIndex) ||
    !Number.isFinite(withholdingAmountIndex) ||
    !Number.isFinite(amountIndex) ||
    !Number.isFinite(eventDateIndex) ||
    !Number.isFinite(eventTimeSlotIndex)
  ) {
    return
  }

  await clearLegacyVatFormulaFromNotesColumn()
  await normalizeMainTabRateColumns()

  const idColumn = columnIndexToA1(idIndex + 1)
  const eventColumn = columnIndexToA1(eventIndex + 1)
  const baseAmountColumn = columnIndexToA1(baseAmountIndex + 1)
  const vatRateColumn = columnIndexToA1(vatRateIndex + 1)
  const withholdingRateColumn = columnIndexToA1(withholdingRateIndex + 1)
  const discountAmountColumn = columnIndexToA1(discountAmountIndex + 1)
  const vatAmountColumn = columnIndexToA1(vatAmountIndex + 1)
  const withholdingAmountColumn = columnIndexToA1(withholdingAmountIndex + 1)
  const amountColumn = columnIndexToA1(amountIndex + 1)
  const eventDateColumn = columnIndexToA1(eventDateIndex + 1)
  const eventTimeSlotColumn = columnIndexToA1(eventTimeSlotIndex + 1)
  const autoRanges = [
    `${GOOGLE_SHEET_MAIN_TAB}!${idColumn}2:${idColumn}${MAIN_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_MAIN_TAB}!${eventDateColumn}2:${eventDateColumn}${MAIN_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_MAIN_TAB}!${eventTimeSlotColumn}2:${eventTimeSlotColumn}${MAIN_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_MAIN_TAB}!${vatAmountColumn}2:${vatAmountColumn}${MAIN_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_MAIN_TAB}!${withholdingAmountColumn}2:${withholdingAmountColumn}${MAIN_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_MAIN_TAB}!${amountColumn}2:${amountColumn}${MAIN_TAB_LAYOUT.rows}`,
  ]

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({
      ranges: autoRanges,
    }),
  })

  const firstDataRow = 2
  const lastDataRow = MAIN_TAB_LAYOUT.rows
  const buildFormulaRows = (formulaBuilder) => {
    const rows = []
    for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex += 1) {
      rows.push([formulaBuilder(rowIndex)])
    }
    return rows
  }

  const eventsTabRange = `${quoteSheetTitle(GOOGLE_SHEET_EVENTS_TAB)}!A:D`
  const targetRanges = [
    {
      range: `${GOOGLE_SHEET_MAIN_TAB}!${idColumn}${firstDataRow}:${idColumn}${lastDataRow}`,
      values: buildFormulaRows(
        (row) =>
          `=SI($${eventDateColumn}${row}=\"\";\"\";\"ID-\"&TEXTO($${eventDateColumn}${row};\"yyyymmdd\")&\"-\"&TEXTO(FILA()-1;\"00000\"))`,
      ),
    },
    {
      range: `${GOOGLE_SHEET_MAIN_TAB}!${eventDateColumn}${firstDataRow}:${eventDateColumn}${lastDataRow}`,
      values: buildFormulaRows(
        (row) =>
          `=SI($${eventColumn}${row}=\"\";\"\";SI.ERROR(BUSCARV($${eventColumn}${row};${eventsTabRange};3;FALSO);\"\"))`,
      ),
    },
    {
      range: `${GOOGLE_SHEET_MAIN_TAB}!${eventTimeSlotColumn}${firstDataRow}:${eventTimeSlotColumn}${lastDataRow}`,
      values: buildFormulaRows(
        (row) =>
          `=SI($${eventColumn}${row}=\"\";\"\";SI.ERROR(BUSCARV($${eventColumn}${row};${eventsTabRange};4;FALSO);\"\"))`,
      ),
    },
    {
      range: `${GOOGLE_SHEET_MAIN_TAB}!${vatAmountColumn}${firstDataRow}:${vatAmountColumn}${lastDataRow}`,
      values: buildFormulaRows(
        (row) =>
          `=SI($${baseAmountColumn}${row}=\"\";\"\";REDONDEAR($${baseAmountColumn}${row}*SI(SI.ERROR(VALOR(SUSTITUIR($${vatRateColumn}${row};\"%\";\"\"));0)>1;SI.ERROR(VALOR(SUSTITUIR($${vatRateColumn}${row};\"%\";\"\"));0)/100;SI.ERROR(VALOR(SUSTITUIR($${vatRateColumn}${row};\"%\";\"\"));0));2))`,
      ),
    },
    {
      range: `${GOOGLE_SHEET_MAIN_TAB}!${withholdingAmountColumn}${firstDataRow}:${withholdingAmountColumn}${lastDataRow}`,
      values: buildFormulaRows(
        (row) =>
          `=SI($${baseAmountColumn}${row}=\"\";\"\";REDONDEAR($${baseAmountColumn}${row}*SI(SI.ERROR(VALOR(SUSTITUIR($${withholdingRateColumn}${row};\"%\";\"\"));0)>1;SI.ERROR(VALOR(SUSTITUIR($${withholdingRateColumn}${row};\"%\";\"\"));0)/100;SI.ERROR(VALOR(SUSTITUIR($${withholdingRateColumn}${row};\"%\";\"\"));0));2))`,
      ),
    },
    {
      range: `${GOOGLE_SHEET_MAIN_TAB}!${amountColumn}${firstDataRow}:${amountColumn}${lastDataRow}`,
      values: buildFormulaRows(
        (row) =>
          `=SI($${baseAmountColumn}${row}=\"\";\"\";REDONDEAR($${baseAmountColumn}${row}+$${vatAmountColumn}${row}-$${withholdingAmountColumn}${row}-SI($${discountAmountColumn}${row}=\"\";0;$${discountAmountColumn}${row});2))`,
      ),
    },
  ]

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: targetRanges.map((target) => ({
        range: target.range,
        majorDimension: 'ROWS',
        values: target.values,
      })),
    }),
  })
}

function buildReportQueryFormula(keyExpression, orderByClause) {
  const mainTitle = quoteSheetTitle(GOOGLE_SHEET_MAIN_TAB)
  const typeRange = `${mainTitle}!B2:B`
  const amountRange = `${mainTitle}!M2:M`
  const dataset = `HSTACK(${keyExpression};ARRAYFORMULA(SI(${typeRange}=\"INGRESO\";${amountRange};0));ARRAYFORMULA(SI(${typeRange}=\"GASTO\";${amountRange};0)))`

  return `=SI.ERROR(QUERY(${dataset};\"select Col1,count(Col1),sum(Col2),sum(Col3),sum(Col2)-sum(Col3) where Col1 is not null group by Col1 ${orderByClause} label count(Col1) '', sum(Col2) '', sum(Col3) '', sum(Col2)-sum(Col3) ''\";0);\"\")`
}

async function applyReportTabComputedFormulas() {
  await upsertHeaderRow(GOOGLE_SHEET_REPORT_WEEK_TAB, REPORT_WEEK_HEADERS)
  await upsertHeaderRow(GOOGLE_SHEET_REPORT_MONTH_TAB, REPORT_MONTH_HEADERS)
  await upsertHeaderRow(GOOGLE_SHEET_REPORT_EVENT_TAB, REPORT_EVENT_HEADERS)

  const clearRanges = [
    `${GOOGLE_SHEET_REPORT_WEEK_TAB}!A2:F${REPORT_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_REPORT_MONTH_TAB}!A2:F${REPORT_TAB_LAYOUT.rows}`,
    `${GOOGLE_SHEET_REPORT_EVENT_TAB}!A2:F${REPORT_TAB_LAYOUT.rows}`,
  ]

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({ ranges: clearRanges }),
  })

  const mainTitle = quoteSheetTitle(GOOGLE_SHEET_MAIN_TAB)
  const eventDateRange = `${mainTitle}!N2:N`
  const eventRange = `${mainTitle}!A2:A`
  const eventKey = `ARRAYFORMULA(SI(${eventRange}=\"\";\"\";${eventRange}))`
  const weeklyKey = `ARRAYFORMULA(SI(${eventDateRange}=\"\";\"\";YEAR(${eventDateRange})&\"-S\"&TEXT(ISOWEEKNUM(${eventDateRange});\"00\")))`
  const monthlyKey = `ARRAYFORMULA(SI(${eventDateRange}=\"\";\"\";TEXTO(${eventDateRange};\"yyyy-mm\")))`

  const targetRanges = [
    {
      range: `${GOOGLE_SHEET_REPORT_WEEK_TAB}!A2`,
      values: [[buildReportQueryFormula(weeklyKey, 'order by Col1 desc')]],
    },
    {
      range: `${GOOGLE_SHEET_REPORT_MONTH_TAB}!A2`,
      values: [[buildReportQueryFormula(monthlyKey, 'order by Col1 desc')]],
    },
    {
      range: `${GOOGLE_SHEET_REPORT_EVENT_TAB}!A2`,
      values: [[buildReportQueryFormula(eventKey, 'order by sum(Col2)-sum(Col3) desc')]],
    },
    {
      range: `${GOOGLE_SHEET_REPORT_WEEK_TAB}!F2`,
      values: [['=SI(C2:C="";"";ARRAYFORMULA(SI(C2:C=0;0;E2:E/C2:C*100)))']],
    },
    {
      range: `${GOOGLE_SHEET_REPORT_MONTH_TAB}!F2`,
      values: [['=SI(C2:C="";"";ARRAYFORMULA(SI(C2:C=0;0;E2:E/C2:C*100)))']],
    },
    {
      range: `${GOOGLE_SHEET_REPORT_EVENT_TAB}!F2`,
      values: [['=SI(C2:C="";"";ARRAYFORMULA(SI(C2:C=0;0;E2:E/C2:C*100)))']],
    },
  ]

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: targetRanges.map((target) => ({
        range: target.range,
        majorDimension: 'ROWS',
        values: target.values,
      })),
    }),
  })
}

async function applyHeaderFilters(sheetIds) {
  const targetTabs = [
    GOOGLE_SHEET_EVENTS_TAB,
    GOOGLE_SHEET_MAIN_TAB,
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
    GOOGLE_SHEET_CONTROL_TAB,
    GOOGLE_SHEET_MANUAL_TAB,
  ]

  const requests = []
  targetTabs.forEach((tabName) => {
    const sheetId = sheetIds.get(tabName)
    if (!Number.isFinite(sheetId)) {
      return
    }
    const layout = getTabLayout(tabName)
    requests.push({
      clearBasicFilter: {
        sheetId,
      },
    })
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: layout.rows,
            startColumnIndex: 0,
            endColumnIndex: layout.columns,
          },
        },
      },
    })
  })

  if (requests.length === 0) {
    return
  }

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}

async function applyControlStatusConditionalFormatting(controlSheetId) {
  if (!Number.isFinite(controlSheetId)) {
    return
  }

  const fields = 'sheets.properties(sheetId,title),sheets.conditionalFormats'
  const metadata = await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}?fields=${encodeURIComponent(fields)}`,
  )
  const sheet = (metadata.sheets || []).find(
    (candidate) => Number(candidate?.properties?.sheetId || 0) === Number(controlSheetId),
  )
  const currentRules = Array.isArray(sheet?.conditionalFormats) ? sheet.conditionalFormats : []
  const deleteRequests = []
  for (let index = currentRules.length - 1; index >= 0; index -= 1) {
    deleteRequests.push({
      deleteConditionalFormatRule: {
        sheetId: controlSheetId,
        index,
      },
    })
  }

  const statusRange = {
    sheetId: controlSheetId,
    startRowIndex: 1,
    endRowIndex: CONTROL_TAB_LAYOUT.rows,
    startColumnIndex: 0,
    endColumnIndex: CONTROL_TAB_LAYOUT.columns,
  }

  const green = { red: 0.86, green: 0.94, blue: 0.86 }
  const yellow = { red: 0.99, green: 0.93, blue: 0.72 }
  const red = { red: 0.98, green: 0.82, blue: 0.82 }
  const dark = { red: 0.17, green: 0.17, blue: 0.17 }
  const buildRule = (formula, color) => ({
    ranges: [statusRange],
    booleanRule: {
      condition: {
        type: 'CUSTOM_FORMULA',
        values: [{ userEnteredValue: formula }],
      },
      format: {
        backgroundColorStyle: { rgbColor: color },
        textFormat: {
          bold: true,
          foregroundColorStyle: { rgbColor: dark },
        },
      },
    },
  })

  const addRequests = [
    buildRule('=O($C2="OK";$C2="ACTIVO")', green),
    buildRule('=O($C2="ATENCION";$C2="AVISO";$C2="PENDIENTE")', yellow),
    buildRule('=O($C2="ERROR";$C2="FALLO";$C2="OFF")', red),
  ].map((rule, index) => ({
    addConditionalFormatRule: {
      rule,
      index,
    },
  }))

  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [...deleteRequests, ...addRequests],
    }),
  })
}

function buildManualRows() {
  return [
    MANUAL_HEADERS,
    ['Objetivo', 'Esta hoja es el único punto de carga de datos.', 'Leer', '', 'OK'],
    [
      'Paso 1',
      'Completar catálogo de eventos con nombre, tipo, fecha y franja.',
      'Editar',
      '',
      'OK',
    ],
    ['Paso 2', 'Cargar ingresos y gastos en Introducción de datos.', 'Editar', '', 'OK'],
    ['Paso 3', 'Usar solo celdas blancas. Celdas grises son automáticas.', 'Respetar', '', 'OK'],
    [
      'Paso 4',
      'No editar las pestañas de resumen. Son de cálculo automático.',
      'Consultar',
      '',
      'OK',
    ],
    [
      'Cuadro de mando',
      'Abrir la aplicación para análisis y toma de decisiones.',
      'Abrir',
      `=HIPERVINCULO(\"${DASHBOARD_URL}\";\"Ir al cuadro de mando Bella Bestia\")`,
      'OK',
    ],
    ['Sincronización', 'Si cambias la estructura, pulsa Preparar hoja en la app.', 'Verificar', '', 'OK'],
    [
      'Refresco visor',
      `La app se actualiza sola desde la hoja cada ${APP_AUTO_SYNC_MINUTES} min.`,
      'Consultar',
      '',
      'OK',
    ],
  ]
}

async function bootstrapSpreadsheetStructure() {
  const requiredTabs = [
    GOOGLE_SHEET_MAIN_TAB,
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
    GOOGLE_SHEET_EVENTS_TAB,
    GOOGLE_SHEET_CONTROL_TAB,
    GOOGLE_SHEET_MANUAL_TAB,
  ]

  let metadata = await getSpreadsheetMetadata()
  metadata = await migrateLegacyEventReportTab(metadata)

  await ensureSheetTabs(requiredTabs)
  await realignMainTabColumnsIfNeeded()

  await upsertHeaderRow(GOOGLE_SHEET_MAIN_TAB, SHEET_ENTRY_HEADERS)
  await upsertHeaderRow(GOOGLE_SHEET_EVENTS_TAB, EVENTS_CATALOG_HEADERS)
  await upsertHeaderRow(GOOGLE_SHEET_MANUAL_TAB, MANUAL_HEADERS)

  metadata = await getSpreadsheetMetadata()
  const deletedPlaceholderTabs = await prunePlaceholderTabs(requiredTabs, metadata)
  if (deletedPlaceholderTabs.length > 0) {
    metadata = await getSpreadsheetMetadata()
  }
  const sheetIds = mapSheetIds(metadata)
  const styleRequests = [
    ...buildCorporateStyleRequests(sheetIds),
    ...buildCorporateNumberFormatRequests(sheetIds),
  ]

  if (styleRequests.length > 0) {
    await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: styleRequests,
      }),
    })
  }

  const mainSheetId = sheetIds.get(GOOGLE_SHEET_MAIN_TAB)
  const eventsSheetId = sheetIds.get(GOOGLE_SHEET_EVENTS_TAB)
  if (Number.isFinite(mainSheetId)) {
    await applyMainRateColumnNumberFormat(mainSheetId)
    await normalizeMainTabRateColumns()
  }
  if (Number.isFinite(mainSheetId) || Number.isFinite(eventsSheetId)) {
    await applyDataValidations(mainSheetId, eventsSheetId)
  }
  if (Number.isFinite(mainSheetId)) {
    await applyMainTabComputedFormulas()
    await applyMainAutoColumnProtection(mainSheetId)
  }

  await writeRowsToSheet(GOOGLE_SHEET_CONTROL_TAB, [
    ['Panel', 'Descripción', 'Estado'],
    ['Introducción de datos', 'Tab principal para cargar líneas de ingresos y gastos.', 'ACTIVO'],
    ['Situación semanal', 'Resumen agregado por semana ISO.', 'ACTIVO'],
    ['Situación mensual', 'Resumen agregado por mes.', 'ACTIVO'],
    ['Situación eventos', 'Resumen agregado por evento.', 'ACTIVO'],
    ['Catálogo eventos', 'Catálogo para desplegable y autocompletar tipo, fecha y franja.', 'ACTIVO'],
    [
      'Sincronización automática',
      `Auto bootstrap: ${GOOGLE_SHEETS_AUTO_BOOTSTRAP ? 'ACTIVO' : 'NO'}`,
      GOOGLE_SHEETS_AUTO_BOOTSTRAP ? 'OK' : 'OFF',
    ],
    [
      'Reportes automáticos',
      `Auto reportes: ${GOOGLE_SHEETS_AUTO_REBUILD_REPORTS ? 'ACTIVO' : 'NO'}`,
      GOOGLE_SHEETS_AUTO_REBUILD_REPORTS ? 'OK' : 'OFF',
    ],
    ['Sincronización', `Última preparación: ${new Date().toISOString()}`, 'OK'],
  ])
  await writeRowsToSheet(GOOGLE_SHEET_MANUAL_TAB, buildManualRows())
  await applyHeaderFilters(sheetIds)
  await applyControlStatusConditionalFormatting(sheetIds.get(GOOGLE_SHEET_CONTROL_TAB))
  await applyManagedSheetProtection(sheetIds)

  return {
    tabs: requiredTabs,
    deletedPlaceholderTabs,
  }
}

async function readEntriesFromGoogleSheet() {
  await ensureSheetTabs([GOOGLE_SHEET_MAIN_TAB])
  await upsertHeaderRow(GOOGLE_SHEET_MAIN_TAB, SHEET_ENTRY_HEADERS)
  await ensureMainRateValidationConsistency()

  const range = encodeURIComponent(`${GOOGLE_SHEET_MAIN_TAB}!A1:AZ`)
  const payload = await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}`)
  const values = Array.isArray(payload.values) ? payload.values : []

  if (values.length === 0) {
    return []
  }

  const headerRow = values[0].map((cell) => normalizeHeaderToken(cell))
  const dataRows = values.slice(1)
  const entries = []

  dataRows.forEach((row, index) => {
    const rowMap = {}
    headerRow.forEach((header, colIndex) => {
      if (!header) return
      rowMap[header] = row[colIndex] ?? ''
    })
    const normalized = normalizeEntryFromSheet(rowMap, index + 2)
    if (normalized) {
      entries.push(normalized)
    }
  })

  const eventsCatalogLookup = await readEventsCatalogLookupFromGoogleSheet().catch(() => new Map())
  return enrichEntriesWithEventsCatalog(entries, eventsCatalogLookup)
}

function parseGoogleVizPayload(raw) {
  const text = String(raw || '')
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s)
  if (!match || !match[1]) {
    throw new Error('No se pudo parsear la respuesta publica de Google Sheets.')
  }
  return JSON.parse(match[1])
}

function gvizCellToString(cell) {
  if (!cell || cell.v === null || cell.v === undefined) {
    return ''
  }
  if (cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== '') {
    return String(cell.f).trim()
  }
  if (typeof cell.v === 'string') {
    return cell.v.trim()
  }
  if (typeof cell.v === 'number') {
    return String(cell.v)
  }
  if (typeof cell.v === 'boolean') {
    return cell.v ? 'TRUE' : 'FALSE'
  }
  return String(cell.v).trim()
}

function isLikelyColumnLabel(value) {
  return /^[a-z]{1,3}$/i.test(String(value || '').trim())
}

function normalizeLookupKey(value) {
  return normalizeHeaderToken(sanitizeSpreadsheetText(value))
}

function toEventsCatalogRecord(rawName, rawType, rawDate, rawSlot) {
  const name = sanitizeSpreadsheetText(rawName)
  if (!name) {
    return null
  }
  const eventType = normalizeEventTypeOption(rawType)
  const eventDate = toCatalogDateValue(rawDate)
  const eventTimeSlot = normalizeEventTimeSlotOption(rawSlot)
  return {
    name,
    eventType,
    eventDate,
    eventTimeSlot,
  }
}

function readAliasFromRowMap(rowMap, aliases) {
  for (const alias of aliases) {
    const value = sanitizeSpreadsheetText(rowMap?.[alias])
    if (value) {
      return value
    }
  }
  return ''
}

function buildEventsCatalogLookup(records) {
  const lookup = new Map()
  records.forEach((record) => {
    if (!record?.name) {
      return
    }
    lookup.set(normalizeLookupKey(record.name), record)
  })
  return lookup
}

async function readEventsCatalogLookupFromGoogleSheet() {
  await ensureSheetTabs([GOOGLE_SHEET_EVENTS_TAB])
  await upsertHeaderRow(GOOGLE_SHEET_EVENTS_TAB, EVENTS_CATALOG_HEADERS)

  const range = encodeURIComponent(`${GOOGLE_SHEET_EVENTS_TAB}!A2:D`)
  const payload = await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}`)
  const values = Array.isArray(payload.values) ? payload.values : []

  const records = values
    .map((row) => toEventsCatalogRecord(row?.[0], row?.[1], row?.[2], row?.[3]))
    .filter(Boolean)
  return buildEventsCatalogLookup(records)
}

async function readEventsCatalogLookupFromGoogleSheetPublic() {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    GOOGLE_SHEET_EVENTS_TAB,
  )}&tqx=out:json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo leer el catálogo público (${response.status}).`)
  }

  const payload = parseGoogleVizPayload(await response.text())
  const table = payload?.table || {}
  const colsRaw = Array.isArray(table.cols) ? table.cols : []
  const rowsRaw = Array.isArray(table.rows) ? table.rows : []
  if (rowsRaw.length === 0) {
    return new Map()
  }

  let headers = colsRaw.map((col) => normalizeHeaderToken(col?.label || col?.id || ''))
  let startIndex = 0
  if (headers.length > 0 && headers.every((header) => isLikelyColumnLabel(header)) && rowsRaw.length > 0) {
    const firstRowCells = Array.isArray(rowsRaw[0]?.c) ? rowsRaw[0].c : []
    headers = firstRowCells.map((cell) => normalizeHeaderToken(gvizCellToString(cell)))
    startIndex = 1
  }

  const records = []
  for (let index = startIndex; index < rowsRaw.length; index += 1) {
    const cells = Array.isArray(rowsRaw[index]?.c) ? rowsRaw[index].c : []
    const rowMap = {}
    headers.forEach((header, colIndex) => {
      if (!header) return
      rowMap[header] = gvizCellToString(cells[colIndex])
    })
    const record = toEventsCatalogRecord(
      readAliasFromRowMap(rowMap, EVENTS_CATALOG_HEADER_ALIASES.event),
      readAliasFromRowMap(rowMap, EVENTS_CATALOG_HEADER_ALIASES.eventType),
      readAliasFromRowMap(rowMap, EVENTS_CATALOG_HEADER_ALIASES.eventDate),
      readAliasFromRowMap(rowMap, EVENTS_CATALOG_HEADER_ALIASES.eventTimeSlot),
    )
    if (record) {
      records.push(record)
    }
  }

  return buildEventsCatalogLookup(records)
}

function enrichEntriesWithEventsCatalog(entries, catalogLookup) {
  if (!(catalogLookup instanceof Map) || catalogLookup.size === 0) {
    return entries
  }

  return entries.map((entry) => {
    const catalogRecord = catalogLookup.get(normalizeLookupKey(entry?.event))
    if (!catalogRecord) {
      return entry
    }
    const currentType = sanitizeSpreadsheetText(entry?.eventType)
    const currentSlot = sanitizeSpreadsheetText(entry?.eventTimeSlot)

    return {
      ...entry,
      eventType: currentType || catalogRecord.eventType || '',
      eventTimeSlot: currentSlot || catalogRecord.eventTimeSlot || '',
      eventDateTime:
        sanitizeSpreadsheetText(entry?.eventDateTime) ||
        normalizeISODateTime(catalogRecord.eventDate, entry?.date || ''),
    }
  })
}

async function readEntriesFromGoogleSheetPublic() {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(
    GOOGLE_SHEET_MAIN_TAB,
  )}&tqx=out:json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo leer la hoja publica (${response.status}).`)
  }

  const payload = parseGoogleVizPayload(await response.text())
  const table = payload?.table || {}
  const colsRaw = Array.isArray(table.cols) ? table.cols : []
  const rowsRaw = Array.isArray(table.rows) ? table.rows : []

  let headers = colsRaw.map((col) => normalizeHeaderToken(col?.label || col?.id || ''))
  let startIndex = 0
  if (headers.length > 0 && headers.every((header) => isLikelyColumnLabel(header)) && rowsRaw.length > 0) {
    const firstRowCells = Array.isArray(rowsRaw[0]?.c) ? rowsRaw[0].c : []
    headers = firstRowCells.map((cell) => normalizeHeaderToken(gvizCellToString(cell)))
    startIndex = 1
  }

  const entries = []
  for (let index = startIndex; index < rowsRaw.length; index += 1) {
    const cells = Array.isArray(rowsRaw[index]?.c) ? rowsRaw[index].c : []
    const rowMap = {}
    headers.forEach((header, colIndex) => {
      if (!header) return
      rowMap[header] = gvizCellToString(cells[colIndex])
    })
    const normalized = normalizeEntryFromSheet(rowMap, index + 2)
    if (normalized) {
      entries.push(normalized)
    }
  }

  const eventsCatalogLookup = await readEventsCatalogLookupFromGoogleSheetPublic().catch(
    () => new Map(),
  )
  return enrichEntriesWithEventsCatalog(entries, eventsCatalogLookup)
}

function toSheetRow(entry) {
  const safe = (value) => (value === undefined || value === null ? '' : value)
  const vatRateValue = normalizeRateForPercentScale(
    safe(entry.vatRate) !== '' ? entry.vatRate : mapVatTypeTokenToRate(entry.vatType),
  )
  const withholdingRateValue = normalizeRateForPercentScale(safe(entry.withholdingRate))
  const byField = {
    id: '',
    event: safe(entry.event),
    movementType: safe(entry.movementType),
    category: safe(entry.category),
    concept: safe(entry.concept),
    paymentMethod: safe(entry.paymentMethod),
    baseAmount: safe(entry.baseAmount),
    vatRate: formatRateTokenForSheet(vatRateValue),
    withholdingRate: formatRateTokenForSheet(withholdingRateValue),
    discountAmount: safe(entry.discountAmount),
    notes: safe(entry.notes),
    vatAmount: '',
    withholdingAmount: '',
    amount: '',
    eventDateTime: '',
    eventTimeSlot: '',
  }
  return SHEET_ENTRY_FIELD_ORDER.map((fieldName) => byField[fieldName] ?? '')
}

function normalizeEventTypeOption(value) {
  const selected = sanitizeSpreadsheetText(value)
  return EVENT_TYPE_OPTIONS.includes(selected) ? selected : 'Conciertos'
}

function normalizeEventTimeSlotOption(value) {
  const selected = sanitizeSpreadsheetText(value)
  return EVENT_TIME_SLOTS.includes(selected) ? selected : EVENT_TIME_SLOTS[0]
}

function toCatalogDateValue(value, fallback = '') {
  return normalizeISODate(value, fallback)
}

function toEventCatalogRow(record, index) {
  const nameRaw =
    sanitizeSpreadsheetText(record?.event) ||
    sanitizeSpreadsheetText(record?.name) ||
    sanitizeSpreadsheetText(record?.eventName) ||
    `Evento ${String(index + 1).padStart(3, '0')}`
  const dateRaw =
    toCatalogDateValue(record?.eventDate) ||
    toCatalogDateValue(record?.date) ||
    toCatalogDateValue(record?.eventDateTime) ||
    new Date().toISOString().slice(0, 10)
  const typeRaw =
    sanitizeSpreadsheetText(record?.eventType) || sanitizeSpreadsheetText(record?.type) || 'Conciertos'
  const slotRaw =
    sanitizeSpreadsheetText(record?.eventTimeSlot) ||
    sanitizeSpreadsheetText(record?.timeSlot) ||
    EVENT_TIME_SLOTS[0]

  return [nameRaw, normalizeEventTypeOption(typeRaw), dateRaw, normalizeEventTimeSlotOption(slotRaw)]
}

async function writeRowsToSheet(tabName, rows) {
  const clearRange = encodeURIComponent(`${tabName}!A1:ZZ`)
  await googleSheetsRequest(`/spreadsheets/${GOOGLE_SHEET_ID}/values/${clearRange}:clear`, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  const updateRange = encodeURIComponent(`${tabName}!A1`)
  await googleSheetsRequest(
    `/spreadsheets/${GOOGLE_SHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `${tabName}!A1`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    },
  )
}

async function writeEntriesToGoogleSheet(entries) {
  await ensureSheetTabs([GOOGLE_SHEET_MAIN_TAB])
  const rows = [SHEET_ENTRY_HEADERS, ...entries.map((entry) => toSheetRow(entry))]
  await writeRowsToSheet(GOOGLE_SHEET_MAIN_TAB, rows)
  await applyMainTabComputedFormulas()
}

async function writeEventsCatalogToGoogleSheet(records) {
  await ensureSheetTabs([GOOGLE_SHEET_EVENTS_TAB])
  const rows = [EVENTS_CATALOG_HEADERS, ...records.map((record, index) => toEventCatalogRow(record, index))]
  await writeRowsToSheet(GOOGLE_SHEET_EVENTS_TAB, rows)
}

function isoWeekKey(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'SIN_FECHA'
  }
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNr = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3)
  const weekNumber = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${target.getUTCFullYear()}-S${String(weekNumber).padStart(2, '0')}`
}

function monthKey(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'SIN_FECHA'
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function aggregateEntries(entries, keyBuilder) {
  const map = new Map()
  entries.forEach((entry) => {
    const key = keyBuilder(entry)
    if (!map.has(key)) {
      map.set(key, { key, movimientos: 0, ingresos: 0, gastos: 0 })
    }
    const bucket = map.get(key)
    bucket.movimientos += 1
    if (entry.movementType === 'INGRESO') {
      bucket.ingresos += Number(entry.amount || 0)
    } else {
      bucket.gastos += Number(entry.amount || 0)
    }
  })
  return Array.from(map.values()).map((bucket) => {
    const beneficio = bucket.ingresos - bucket.gastos
    const margen = bucket.ingresos > 0 ? (beneficio / bucket.ingresos) * 100 : 0
    return { ...bucket, beneficio, margen }
  })
}

function sortRowsDescByKey(rows) {
  return [...rows].sort((a, b) => String(b.key).localeCompare(String(a.key)))
}

async function rebuildReportTabs(entries) {
  await ensureSheetTabs([
    GOOGLE_SHEET_REPORT_WEEK_TAB,
    GOOGLE_SHEET_REPORT_MONTH_TAB,
    GOOGLE_SHEET_REPORT_EVENT_TAB,
  ])

  const weeklyRows = sortRowsDescByKey(
    aggregateEntries(entries, (entry) => isoWeekKey(entry.purchaseDate || entry.date)),
  )
  const monthlyRows = sortRowsDescByKey(
    aggregateEntries(entries, (entry) => monthKey(entry.purchaseDate || entry.date)),
  )
  const eventRows = [...aggregateEntries(entries, (entry) => entry.event || 'SIN_EVENTO')].sort(
    (a, b) => b.beneficio - a.beneficio,
  )
  await applyReportTabComputedFormulas()
  const metadata = await getSpreadsheetMetadata()
  await applyHeaderFilters(mapSheetIds(metadata))

  return {
    weeklyRows: weeklyRows.length,
    monthlyRows: monthlyRows.length,
    eventRows: eventRows.length,
  }
}

export async function runAutomaticGoogleSheetsSetup() {
  const status = getDataSourceStatus()
  if (status.source !== 'google_sheets') {
    return {
      ok: true,
      skipped: true,
      reason: 'Google Sheets no est\u00e1 configurado en este entorno.',
    }
  }

  if (!GOOGLE_SHEETS_AUTO_BOOTSTRAP && !GOOGLE_SHEETS_AUTO_REBUILD_REPORTS) {
    return {
      ok: true,
      skipped: true,
      reason: 'Las tareas autom\u00e1ticas de hoja est\u00e1n desactivadas por variables de entorno.',
    }
  }

  if (GOOGLE_SHEETS_AUTO_BOOTSTRAP) {
    const prepared = await prepareSpreadsheetWorkspace()
    return {
      ok: true,
      skipped: false,
      mode: 'bootstrap_reports',
      ...prepared,
    }
  }

  const reports = await rebuildSpreadsheetReports()
  return {
    ok: true,
    skipped: false,
    mode: 'reports_only',
    ...reports,
  }
}

export function getDataSourceStatus() {
  const googleEnabled = isGoogleSheetsEnabled()
  const publicFallback = !googleEnabled && isGoogleSheetsPublicFallbackEnabled()
  const diagnostics = getDataSourceDiagnostics()
  return {
    source: googleEnabled ? 'google_sheets' : publicFallback ? 'google_sheets_public' : 'local',
    readOnly: googleEnabled ? GOOGLE_SHEETS_READ_ONLY : publicFallback ? true : false,
    sheet:
      googleEnabled || publicFallback
      ? {
          id: GOOGLE_SHEET_ID,
          url: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`,
          mainTab: GOOGLE_SHEET_MAIN_TAB,
          reportTabs: [
            GOOGLE_SHEET_REPORT_WEEK_TAB,
            GOOGLE_SHEET_REPORT_MONTH_TAB,
            GOOGLE_SHEET_REPORT_EVENT_TAB,
          ],
          eventsCatalogTab: GOOGLE_SHEET_EVENTS_TAB,
          controlTab: GOOGLE_SHEET_CONTROL_TAB,
          mode: googleEnabled ? 'service_account' : 'public_fallback',
        }
      : null,
    diagnostics,
  }
}

export async function loadEntriesFromDataSource() {
  const status = getDataSourceStatus()
  if (status.source === 'google_sheets') {
    const entries = await readEntriesFromGoogleSheet()
    return { entries, source: status.source }
  }
  if (status.source === 'google_sheets_public') {
    const entries = await readEntriesFromGoogleSheetPublic()
    return { entries, source: status.source }
  }
  const entries = readEntriesFromDisk()
  return { entries, source: status.source }
}

export async function saveEntriesToDataSource(entries) {
  const status = getDataSourceStatus()
  if (!Array.isArray(entries)) {
    throw new Error('Formato de entries no v\u00e1lido.')
  }

  if (status.source === 'google_sheets') {
    if (status.readOnly) {
      throw new Error('La hoja est\u00e1 en modo solo lectura desde la app.')
    }
    await writeEntriesToGoogleSheet(entries)
    const reports = GOOGLE_SHEETS_AUTO_REBUILD_REPORTS
      ? await rebuildReportTabs(entries)
      : null
    return { count: entries.length, source: status.source, reports }
  }

  writeEntriesToDisk(entries)
  return { count: entries.length, source: status.source }
}

export async function saveEventsCatalogToDataSource(records) {
  const status = getDataSourceStatus()
  if (!Array.isArray(records)) {
    throw new Error('Formato de catalogo no valido.')
  }
  if (status.source !== 'google_sheets') {
    throw new Error('Google Sheets no est\u00e1 configurado en este entorno.')
  }
  if (status.readOnly) {
    throw new Error('La hoja esta en modo solo lectura desde la app.')
  }

  await writeEventsCatalogToGoogleSheet(records)
  const metadata = await getSpreadsheetMetadata()
  const sheetIds = mapSheetIds(metadata)
  const mainSheetId = sheetIds.get(GOOGLE_SHEET_MAIN_TAB)
  const eventsSheetId = sheetIds.get(GOOGLE_SHEET_EVENTS_TAB)
  if (Number.isFinite(mainSheetId) || Number.isFinite(eventsSheetId)) {
    await applyDataValidations(mainSheetId, eventsSheetId)
  }
  await applyHeaderFilters(sheetIds)
  return { count: records.length, source: status.source }
}

export async function rebuildSpreadsheetReports() {
  const status = getDataSourceStatus()
  if (status.source !== 'google_sheets') {
    throw new Error('Google Sheets no est\u00e1 configurado en este entorno.')
  }
  const entries = await readEntriesFromGoogleSheet()
  const reportStats = await rebuildReportTabs(entries)
  return {
    ...reportStats,
    entries: entries.length,
  }
}

export async function prepareSpreadsheetWorkspace() {
  const status = getDataSourceStatus()
  if (status.source !== 'google_sheets') {
    throw new Error('Google Sheets no esta configurado en este entorno.')
  }
  const bootstrap = await bootstrapSpreadsheetStructure()
  const entries = await readEntriesFromGoogleSheet()
  const reports = await rebuildReportTabs(entries)
  return {
    ...bootstrap,
    reports,
    entries: entries.length,
  }
}
