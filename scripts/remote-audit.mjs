const DEFAULT_BASE_URL = 'https://bella-bestia.artesbuhomanagement.com'
const DEFAULT_PASSWORD = 'REPLACE_WITH_PASSWORD'
const EXPECTED_MAIN_HEADERS = [
  'Evento',
  'Tipo',
  'Categoría',
  'Concepto',
  'Método de pago',
  'Base imponible EUR',
  'IVA %',
  'Retención %',
  'Descuento EUR',
  'Notas',
  'Cuota IVA EUR',
  'Retención EUR',
  'Total línea EUR',
  'Fecha evento',
  'Franja horaria',
  'ID evento',
]
const EXPECTED_VAT_TOKENS = new Set([
  '0',
  '4',
  '10',
  '21',
  '0%',
  '4%',
  '10%',
  '21%',
  '0,00%',
  '4,00%',
  '10,00%',
  '21,00%',
])
const EXPECTED_WITHHOLDING_TOKENS = new Set([
  '0',
  '7',
  '15',
  '19',
  '0%',
  '7%',
  '15%',
  '19%',
  '0,00%',
  '7,00%',
  '15,00%',
  '19,00%',
])

function sanitizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function getCookieFromLoginResponse(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    const all = response.headers.getSetCookie()
    return all.map((entry) => entry.split(';')[0]).join('; ')
  }
  const single = response.headers.get('set-cookie')
  if (!single) return ''
  return single.split(';')[0]
}

async function login(baseUrl, password) {
  const body = new URLSearchParams({ password })
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  })

  const cookie = getCookieFromLoginResponse(response)
  if (!cookie || (response.status !== 302 && response.status !== 200)) {
    const raw = await response.text().catch(() => '')
    throw new Error(
      `Login remoto fallido (${response.status}). ${raw.slice(0, 180) || 'Sin detalle.'}`,
    )
  }
  return cookie
}

async function callApi(baseUrl, cookie, path, method = 'GET') {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      cookie,
      accept: 'application/json',
    },
  })
  const raw = await response.text()
  let json = null
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }
  return { ok: response.ok, status: response.status, path, method, raw, json }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callApiWithRetry(baseUrl, cookie, path, method = 'GET', attempts = 3) {
  let lastResponse = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await callApi(baseUrl, cookie, path, method)
    lastResponse = response
    if (response.ok) {
      return { ...response, attempts: attempt }
    }
    if (attempt < attempts) {
      await delay(800 * attempt)
    }
  }
  return { ...(lastResponse || {}), attempts }
}

function parseNumberEs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = String(value || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/EUR/gi, '')
    .replace(/%/g, '')
  if (!raw) return 0
  if (raw.includes(',')) {
    const parsed = Number(raw.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    const parsed = Number(raw.replace(/\./g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function parsePercentEs(value) {
  return parseNumberEs(value)
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

function normalizeRateToken(value) {
  const raw = String(value || '')
    .trim()
    .replace(/\s/g, '')
  if (!raw) return ''
  const normalizedPercent = raw.replace('.', ',')
  return normalizedPercent
}

function parseDateAsUtc(dateValue) {
  const raw = String(dateValue || '').trim()
  if (!raw) return null
  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1])
    const month = Number(isoDateMatch[2])
    const day = Number(isoDateMatch[3])
    return new Date(Date.UTC(year, month - 1, day))
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

function isoWeekKey(dateValue) {
  const date = parseDateAsUtc(dateValue)
  if (!date) return 'SIN_FECHA'
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNr = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3)
  const weekNumber = 1 + Math.round((target - firstThursday) / (7 * 24 * 60 * 60 * 1000))
  return `${target.getUTCFullYear()}-S${String(weekNumber).padStart(2, '0')}`
}

function monthKey(dateValue) {
  const date = parseDateAsUtc(dateValue)
  if (!date) return 'SIN_FECHA'
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function getReportDateForGrouping(entry) {
  const eventDateTime = String(entry?.eventDateTime || '').trim()
  if (eventDateTime) return eventDateTime.slice(0, 10)
  const eventDate = String(entry?.eventDate || '').trim()
  if (eventDate) return eventDate.slice(0, 10)
  return entry.purchaseDate || entry.date
}

function aggregateEntries(entries, keyBuilder) {
  const map = new Map()
  for (const entry of entries) {
    const key = keyBuilder(entry)
    const current = map.get(key) || { key, movimientos: 0, ingresos: 0, gastos: 0 }
    current.movimientos += 1
    if (entry.movementType === 'INGRESO') {
      current.ingresos += Number(entry.amount || 0)
    } else {
      current.gastos += Number(entry.amount || 0)
    }
    map.set(key, current)
  }
  return Array.from(map.values()).map((row) => {
    const beneficio = row.ingresos - row.gastos
    const margen = row.ingresos > 0 ? (beneficio / row.ingresos) * 100 : 0
    return { ...row, beneficio, margen }
  })
}

function sortRowsDescByKey(rows) {
  return [...rows].sort((a, b) => String(b.key).localeCompare(String(a.key)))
}

function approxEqual(a, b, tolerance = 0.05) {
  return Math.abs(a - b) <= tolerance
}

function getTabByTitle(inspectPayload, title) {
  const tabs = Array.isArray(inspectPayload?.tabs) ? inspectPayload.tabs : []
  return tabs.find((tab) => String(tab?.title || '') === title) || null
}

function toReportRowsFromPreview(tab) {
  const preview = tab?.visibleData?.rowsPreview
  if (!Array.isArray(preview) || preview.length <= 1) return []
  return preview.slice(1).map((row) => ({
    key: String(row?.[0] || '').trim(),
    movimientos: parseNumberEs(row?.[1]),
    ingresos: parseNumberEs(row?.[2]),
    gastos: parseNumberEs(row?.[3]),
    beneficio: parseNumberEs(row?.[4]),
    margen: parsePercentEs(row?.[5]),
  }))
}

function containsMojibake(value) {
  if (typeof value !== 'string') return false
  return /Ã.|Â.|â€|â€™|â€œ|â€|�/.test(value)
}

function scanObjectStringsForMojibake(input, max = 20) {
  const found = []
  const stack = [{ path: '$', value: input }]

  while (stack.length > 0 && found.length < max) {
    const current = stack.pop()
    if (!current) break
    const { path, value } = current
    if (typeof value === 'string') {
      if (containsMojibake(value)) {
        found.push({ path, value: value.slice(0, 140) })
      }
      continue
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => stack.push({ path: `${path}[${index}]`, value: item }))
      continue
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, v]) => stack.push({ path: `${path}.${key}`, value: v }))
    }
  }
  return found
}

function printSection(title) {
  console.log(`\n=== ${title} ===`)
}

function printCheck(ok, label, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` -> ${detail}` : ''}`)
}

async function main() {
  const baseUrl = sanitizeBaseUrl(process.env.REMOTE_APP_URL || process.env.APP_URL)
  const password =
    process.env.REMOTE_PANEL_PASSWORD || process.env.PANEL_PASSWORD || DEFAULT_PASSWORD
  const errors = []

  printSection('Inicio')
  console.log(`Base remota: ${baseUrl}`)
  const cookie = await login(baseUrl, password)
  printCheck(true, 'Login remoto')

  const dataSource = await callApi(baseUrl, cookie, '/api/data-source', 'GET')
  printSection('Fuente de datos')
  printCheck(dataSource.ok, 'GET /api/data-source', `HTTP ${dataSource.status}`)
  if (!dataSource.ok) {
    throw new Error('No se pudo leer /api/data-source')
  }
  const source = dataSource.json?.source
  const readOnly = Boolean(dataSource.json?.readOnly)
  printCheck(source === 'google_sheets', 'Fuente activa', String(source))
  printCheck(readOnly === true, 'Modo visor (solo lectura)', String(readOnly))
  if (source !== 'google_sheets') {
    errors.push(`Fuente inesperada: ${source}`)
  }
  if (!readOnly) {
    errors.push('La app no está en modo solo lectura.')
  }

  const bootstrap = await callApiWithRetry(baseUrl, cookie, '/api/sheets/bootstrap', 'POST', 3)
  const rebuild = await callApiWithRetry(baseUrl, cookie, '/api/reports/rebuild', 'POST', 3)
  printCheck(
    bootstrap.ok,
    'POST /api/sheets/bootstrap',
    `HTTP ${bootstrap.status} (intentos=${bootstrap.attempts || 1})`,
  )
  printCheck(
    rebuild.ok,
    'POST /api/reports/rebuild',
    `HTTP ${rebuild.status} (intentos=${rebuild.attempts || 1})`,
  )
  if (!bootstrap.ok) {
    errors.push(
      `Fallo en bootstrap remoto: ${
        bootstrap.json?.error || bootstrap.raw?.slice(0, 180) || `HTTP ${bootstrap.status}`
      }`,
    )
  }
  if (!rebuild.ok) {
    errors.push(
      `Fallo en rebuild remoto: ${
        rebuild.json?.error || rebuild.raw?.slice(0, 180) || `HTTP ${rebuild.status}`
      }`,
    )
  }

  const entriesRes = await callApi(baseUrl, cookie, '/api/entries', 'GET')
  printSection('Entradas y cobertura')
  printCheck(entriesRes.ok, 'GET /api/entries', `HTTP ${entriesRes.status}`)
  if (!entriesRes.ok) {
    throw new Error('No se pudo leer /api/entries')
  }
  const entries = Array.isArray(entriesRes.json?.entries) ? entriesRes.json.entries : []
  const totalEntries = entries.length
  const totalIncome = entries
    .filter((entry) => entry.movementType === 'INGRESO')
    .reduce((acc, entry) => acc + Number(entry.amount || 0), 0)
  const totalExpense = entries
    .filter((entry) => entry.movementType === 'GASTO')
    .reduce((acc, entry) => acc + Number(entry.amount || 0), 0)
  const typeCovered = entries.filter((entry) => String(entry.eventType || '').trim()).length
  const slotCovered = entries.filter((entry) => String(entry.eventTimeSlot || '').trim()).length
  const typeCoveragePct = totalEntries > 0 ? (typeCovered / totalEntries) * 100 : 0
  const slotCoveragePct = totalEntries > 0 ? (slotCovered / totalEntries) * 100 : 0
  printCheck(totalEntries > 0, 'Total de líneas contables', String(totalEntries))
  printCheck(typeCoveragePct >= 98, 'Cobertura Tipo de evento', `${typeCoveragePct.toFixed(2)}%`)
  printCheck(slotCoveragePct >= 98, 'Cobertura Franja horaria', `${slotCoveragePct.toFixed(2)}%`)
  printCheck(
    totalIncome > 0 && totalExpense > 0,
    'Totales de ingresos y gastos',
    `I=${totalIncome.toFixed(2)} | G=${totalExpense.toFixed(2)}`,
  )
  if (typeCoveragePct < 98) errors.push(`Cobertura de tipo baja (${typeCoveragePct.toFixed(2)}%).`)
  if (slotCoveragePct < 98) errors.push(`Cobertura de franja baja (${slotCoveragePct.toFixed(2)}%).`)

  const validMovement = new Set(['INGRESO', 'GASTO'])
  const validPayment = new Set(['TARJETA', 'EFECTIVO', 'TRANSFERENCIA'])
  const invalidMovementRows = entries.filter(
    (entry) => !validMovement.has(String(entry?.movementType || '').trim().toUpperCase()),
  )
  const invalidPaymentRows = entries.filter(
    (entry) => !validPayment.has(String(entry?.paymentMethod || '').trim().toUpperCase()),
  )
  const invalidVatRows = entries.filter((entry) => ![0, 4, 10, 21].includes(Math.round(Number(entry?.vatRate || 0))))
  const invalidWithholdingRows = entries.filter(
    (entry) => ![0, 7, 15, 19].includes(Math.round(Number(entry?.withholdingRate || 0))),
  )
  printCheck(
    invalidMovementRows.length === 0,
    'Tipos de movimiento válidos',
    invalidMovementRows.length === 0 ? 'OK' : `${invalidMovementRows.length} fila(s)`,
  )
  printCheck(
    invalidPaymentRows.length === 0,
    'Métodos de pago válidos',
    invalidPaymentRows.length === 0 ? 'OK' : `${invalidPaymentRows.length} fila(s)`,
  )
  printCheck(
    invalidVatRows.length === 0,
    'IVA en rango permitido (0/4/10/21)',
    invalidVatRows.length === 0 ? 'OK' : `${invalidVatRows.length} fila(s)`,
  )
  printCheck(
    invalidWithholdingRows.length === 0,
    'Retención en rango permitido (0/7/15/19)',
    invalidWithholdingRows.length === 0 ? 'OK' : `${invalidWithholdingRows.length} fila(s)`,
  )
  if (invalidMovementRows.length > 0) errors.push('Hay tipos de movimiento fuera de catálogo.')
  if (invalidPaymentRows.length > 0) errors.push('Hay métodos de pago fuera de catálogo.')
  if (invalidVatRows.length > 0) errors.push('Hay IVA fuera de catálogo.')
  if (invalidWithholdingRows.length > 0) errors.push('Hay retenciones fuera de catálogo.')

  // /api/sheets/inspect puede fallar de forma puntual justo tras rebuild.
  // Reintentamos para evitar falsos negativos en auditorías de estrés.
  const inspect = await callApiWithRetry(baseUrl, cookie, '/api/sheets/inspect', 'GET', 5)
  printSection('Inspección de hoja')
  printCheck(
    inspect.ok,
    'GET /api/sheets/inspect',
    `HTTP ${inspect.status}${inspect.attempts ? ` (intentos=${inspect.attempts})` : ''}`,
  )
  if (!inspect.ok) {
    throw new Error(`No se pudo inspeccionar la hoja tras ${inspect.attempts || 1} intento(s).`)
  }

  const inspectPayload = inspect.json
  const mainTab = getTabByTitle(inspectPayload, 'Introduccion de datos')
  const weekTab = getTabByTitle(inspectPayload, 'Situacion_Semanal')
  const monthTab = getTabByTitle(inspectPayload, 'Situacion_Mensual')
  const eventTab = getTabByTitle(inspectPayload, 'Situacion_Eventos')
  const catalogTab = getTabByTitle(inspectPayload, 'Catalogo_Eventos')
  const controlTab = getTabByTitle(inspectPayload, 'Control_App')
  const manualTab = getTabByTitle(inspectPayload, 'Manual_Uso')

  printCheck(Boolean(mainTab), 'Existe pestaña Introduccion de datos')
  printCheck(Boolean(weekTab && monthTab && eventTab), 'Existen pestañas de reportes')
  printCheck(Boolean(catalogTab && controlTab && manualTab), 'Existen pestañas auxiliares')
  if (!mainTab || !weekTab || !monthTab || !eventTab || !catalogTab || !controlTab || !manualTab) {
    errors.push('Faltan pestañas requeridas.')
  }

  const mainColumns = Number(mainTab?.structure?.columns || 0)
  printCheck(
    mainColumns >= EXPECTED_MAIN_HEADERS.length,
    'Columnas mínimas en Introducción',
    String(mainColumns),
  )
  if (mainColumns < EXPECTED_MAIN_HEADERS.length) {
    errors.push(`Introducción tiene menos columnas de las esperadas (${mainColumns}).`)
  }

  const headerRow = Array.isArray(mainTab?.visibleData?.rowsPreview?.[0])
    ? mainTab.visibleData.rowsPreview[0]
    : []
  const normalizedCurrentHeaders = headerRow.map((value) => normalizeHeaderToken(value))
  const normalizedExpectedHeaders = EXPECTED_MAIN_HEADERS.map((value) => normalizeHeaderToken(value))
  const headersAligned =
    normalizedCurrentHeaders.length >= normalizedExpectedHeaders.length &&
    normalizedExpectedHeaders.every((token, index) => normalizedCurrentHeaders[index] === token)
  printCheck(
    headersAligned,
    'Cabeceras alineadas con modelo oficial',
    headersAligned ? 'OK' : `Actual: ${headerRow.join(' | ')}`,
  )
  if (!headersAligned) {
    errors.push('Cabeceras de Introducción desalineadas con el modelo esperado.')
  }

  const mojibakeHits = scanObjectStringsForMojibake(inspectPayload)
  printCheck(
    mojibakeHits.length === 0,
    'Sin texto roto (tildes/ñ) en inspección',
    mojibakeHits.length === 0 ? 'OK' : `${mojibakeHits.length} coincidencias`,
  )
  if (mojibakeHits.length > 0) {
    errors.push(
      `Texto roto detectado: ${mojibakeHits
        .slice(0, 3)
        .map((hit) => `${hit.path}=${hit.value}`)
        .join(' | ')}`,
    )
  }

  const validations = Array.isArray(mainTab?.dataValidations) ? mainTab.dataValidations : []
  const normalizedValidationValues = (values) =>
    Array.isArray(values)
      ? values.map((value) => parseNumberEs(value)).filter((value) => Number.isFinite(value))
      : []
  const hasRateValidation = (values, expectedRate) =>
    normalizedValidationValues(values).some((value) => Math.abs(value - expectedRate) < 0.001)
  const ivaValidation = validations.find((rule) => hasRateValidation(rule?.values, 21))
  const retValidation = validations.find((rule) => hasRateValidation(rule?.values, 15))
  printCheck(Boolean(ivaValidation), 'Validación IVA % aplicada')
  printCheck(Boolean(retValidation), 'Validación Retención % aplicada')
  if (!ivaValidation) errors.push('No se detectó validación de IVA %.')
  if (!retValidation) errors.push('No se detectó validación de Retención %.')

  const vatRules = validations.filter(
    (rule) =>
      Array.isArray(rule?.cells) &&
      rule.cells.some((cell) => String(cell || '').trim().toUpperCase().startsWith('G')),
  )
  const withholdingRules = validations.filter(
    (rule) =>
      Array.isArray(rule?.cells) &&
      rule.cells.some((cell) => String(cell || '').trim().toUpperCase().startsWith('H')),
  )
  const validationRuleIsSafe = (rule, expectedTokens) => {
    const values = Array.isArray(rule?.values) ? rule.values : []
    if (values.length === 0) return false
    return values.every((value) => expectedTokens.has(normalizeRateToken(value)))
  }
  const unsafeVatRules = vatRules.filter((rule) => !validationRuleIsSafe(rule, EXPECTED_VAT_TOKENS))
  const unsafeWithholdingRules = withholdingRules.filter(
    (rule) => !validationRuleIsSafe(rule, EXPECTED_WITHHOLDING_TOKENS),
  )
  printCheck(
    unsafeVatRules.length === 0,
    'Sin reglas antiguas conflictivas en IVA %',
    unsafeVatRules.length === 0 ? 'OK' : `${unsafeVatRules.length} regla(s)`,
  )
  printCheck(
    unsafeWithholdingRules.length === 0,
    'Sin reglas antiguas conflictivas en Retención %',
    unsafeWithholdingRules.length === 0 ? 'OK' : `${unsafeWithholdingRules.length} regla(s)`,
  )
  if (unsafeVatRules.length > 0) errors.push('Hay validaciones antiguas/conflictivas en IVA %.')
  if (unsafeWithholdingRules.length > 0) {
    errors.push('Hay validaciones antiguas/conflictivas en Retención %.')
  }

  const formulaCells = new Set(
    Array.isArray(mainTab?.formulas?.sample)
      ? mainTab.formulas.sample.map((item) => String(item?.cell || '').toUpperCase())
      : [],
  )
  const expectedFormulaCells = ['K2', 'L2', 'M2', 'N2', 'O2', 'P2']
  const missingFormulaCells = expectedFormulaCells.filter((cell) => !formulaCells.has(cell))
  printCheck(
    missingFormulaCells.length === 0,
    'Fórmulas automáticas clave',
    missingFormulaCells.length === 0 ? 'OK' : `Faltan: ${missingFormulaCells.join(', ')}`,
  )
  if (missingFormulaCells.length > 0) {
    errors.push(`Fórmulas automáticas incompletas: ${missingFormulaCells.join(', ')}`)
  }

  const reportTabsFormulaChecks = [
    {
      title: 'Situacion_Semanal',
      tab: weekTab,
      expectedCells: ['A2', 'F2'],
      minTotalFormulaCells: 2,
    },
    {
      title: 'Situacion_Mensual',
      tab: monthTab,
      expectedCells: ['A2', 'F2'],
      minTotalFormulaCells: 2,
    },
    {
      title: 'Situacion_Eventos',
      tab: eventTab,
      expectedCells: ['A2', 'F2'],
      minTotalFormulaCells: 2,
    },
  ]

  reportTabsFormulaChecks.forEach((check) => {
    const sampleCells = new Set(
      Array.isArray(check.tab?.formulas?.sample)
        ? check.tab.formulas.sample.map((item) => String(item?.cell || '').toUpperCase())
        : [],
    )
    const missingCells = check.expectedCells.filter((cell) => !sampleCells.has(cell))
    const totalFormulaCells = Number(check.tab?.formulas?.totalFormulaCells || 0)
    const ok =
      totalFormulaCells >= check.minTotalFormulaCells && missingCells.length === 0

    printCheck(
      ok,
      `FÃ³rmulas en ${check.title}`,
      ok
        ? `total=${totalFormulaCells}`
        : `total=${totalFormulaCells}; faltan=${missingCells.join(', ') || 'N/A'}`,
    )

    if (!ok) {
      errors.push(
        `FÃ³rmulas ausentes en ${check.title}: total=${totalFormulaCells}, faltan=${missingCells.join(', ') || 'N/A'}.`,
      )
    }
  })

  const protections = Array.isArray(mainTab?.protections) ? mainTab.protections : []
  const requiredLocks = ['eventTimeSlot', 'withholdingAmount', 'amount', 'id', 'eventDateTime', 'vatAmount']
  const missingLocks = requiredLocks.filter(
    (name) => !protections.some((rule) => String(rule?.description || '').includes(name)),
  )
  printCheck(
    missingLocks.length === 0,
    'Protecciones de columnas automáticas',
    missingLocks.length === 0 ? 'OK' : `Faltan: ${missingLocks.join(', ')}`,
  )
  if (missingLocks.length > 0) {
    errors.push(`Protecciones faltantes: ${missingLocks.join(', ')}`)
  }

  printSection('Coherencia de reportes')
  const weeklyExpected = sortRowsDescByKey(
    aggregateEntries(entries, (entry) => isoWeekKey(getReportDateForGrouping(entry))),
  )
  const monthlyExpected = sortRowsDescByKey(
    aggregateEntries(entries, (entry) => monthKey(getReportDateForGrouping(entry))),
  )
  const eventExpected = aggregateEntries(entries, (entry) => entry.event || 'SIN_EVENTO').sort(
    (a, b) => b.beneficio - a.beneficio,
  )

  const weeklyPreview = toReportRowsFromPreview(weekTab)
  const monthlyPreview = toReportRowsFromPreview(monthTab)
  const eventPreview = toReportRowsFromPreview(eventTab)

  function comparePreview(previewRows, expectedRows, label, allowedDiffs = 0) {
    const size = Math.min(previewRows.length, expectedRows.length, 20)
    let localErrors = 0
    for (let index = 0; index < size; index += 1) {
      const p = previewRows[index]
      const e = expectedRows[index]
      const keyOk = p.key === e.key
      const movOk = p.movimientos === e.movimientos
      const ingOk = approxEqual(p.ingresos, e.ingresos, 0.15)
      const gasOk = approxEqual(p.gastos, e.gastos, 0.15)
      const benOk = approxEqual(p.beneficio, e.beneficio, 0.15)
      const marOk = approxEqual(p.margen, e.margen, 0.2)
      if (!(keyOk && movOk && ingOk && gasOk && benOk && marOk)) {
        localErrors += 1
      }
    }
    const ok = localErrors <= allowedDiffs
    printCheck(
      ok,
      `Coherencia ${label} (top ${size})`,
      ok
        ? localErrors === 0
          ? 'OK'
          : `${localErrors} desv?o(s) dentro de tolerancia (${allowedDiffs})`
        : `${localErrors} desv?o(s)`,
    )
    return { localErrors, allowedDiffs }
  }

  const weeklyCheck = comparePreview(weeklyPreview, weeklyExpected, 'semanal', 2)
  const monthlyCheck = comparePreview(monthlyPreview, monthlyExpected, 'mensual', 1)
  const eventCheck = comparePreview(eventPreview, eventExpected, 'eventos', 0)
  if (
    weeklyCheck.localErrors > weeklyCheck.allowedDiffs ||
    monthlyCheck.localErrors > monthlyCheck.allowedDiffs ||
    eventCheck.localErrors > eventCheck.allowedDiffs
  ) {
    errors.push(
      `Desv?os en reportes: semanal=${weeklyCheck.localErrors}, mensual=${monthlyCheck.localErrors}, eventos=${eventCheck.localErrors}.`,
    )
  }

  printSection('Resumen final')
  printCheck(errors.length === 0, 'Auditoría integral', errors.length === 0 ? 'SIN ERRORES' : `${errors.length} error(es)`)
  if (errors.length > 0) {
    errors.forEach((error, index) => console.log(`  ${index + 1}. ${error}`))
    process.exitCode = 1
    return
  }

  console.log('Resultado: OK. Hoja, API y reportes alineados.')
}

main().catch((error) => {
  console.error(`Fallo en remote:audit -> ${error instanceof Error ? error.message : 'Error desconocido.'}`)
  process.exitCode = 1
})
