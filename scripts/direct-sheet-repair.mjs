import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_SHEET_ID = 'REPLACE_WITH_SHEET_ID'

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function resolveServiceAccountPath() {
  const fromEnv = process.env.SERVICE_ACCOUNT_JSON_PATH
  const fromArg = process.argv[2]
  const rawPath = fromEnv || fromArg
  if (!rawPath) {
    fail(
      'Falta la ruta del JSON de cuenta de servicio. Usa SERVICE_ACCOUNT_JSON_PATH o pasa la ruta como argumento.',
    )
  }
  const resolved = path.resolve(rawPath)
  if (!fs.existsSync(resolved)) {
    fail(`No existe el archivo JSON: ${resolved}`)
  }
  return resolved
}

function setSheetEnv(jsonPath) {
  const rawJson = fs.readFileSync(jsonPath, 'utf8').trim()
  if (!rawJson.startsWith('{')) {
    fail('El JSON de cuenta de servicio no parece válido.')
  }

  process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 = Buffer.from(rawJson, 'utf8').toString('base64')
  process.env.GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID
  process.env.GOOGLE_SHEET_MAIN_TAB = process.env.GOOGLE_SHEET_MAIN_TAB || 'Introduccion de datos'
  process.env.GOOGLE_SHEET_REPORT_WEEK_TAB =
    process.env.GOOGLE_SHEET_REPORT_WEEK_TAB || 'Situacion_Semanal'
  process.env.GOOGLE_SHEET_REPORT_MONTH_TAB =
    process.env.GOOGLE_SHEET_REPORT_MONTH_TAB || 'Situacion_Mensual'
  process.env.GOOGLE_SHEET_REPORT_EVENT_TAB =
    process.env.GOOGLE_SHEET_REPORT_EVENT_TAB || 'Situacion_Eventos'
  process.env.GOOGLE_SHEET_EVENTS_TAB = process.env.GOOGLE_SHEET_EVENTS_TAB || 'Catalogo_Eventos'
  process.env.GOOGLE_SHEET_CONTROL_TAB = process.env.GOOGLE_SHEET_CONTROL_TAB || 'Control_App'
  process.env.GOOGLE_SHEET_MANUAL_TAB = process.env.GOOGLE_SHEET_MANUAL_TAB || 'Manual_Uso'
  process.env.GOOGLE_SHEETS_READ_ONLY = process.env.GOOGLE_SHEETS_READ_ONLY || 'true'
  process.env.GOOGLE_SHEETS_AUTO_BOOTSTRAP = process.env.GOOGLE_SHEETS_AUTO_BOOTSTRAP || 'true'
  process.env.GOOGLE_SHEETS_AUTO_REBUILD_REPORTS =
    process.env.GOOGLE_SHEETS_AUTO_REBUILD_REPORTS || 'true'
  process.env.GOOGLE_SHEETS_AUTO_PRUNE_TABS = process.env.GOOGLE_SHEETS_AUTO_PRUNE_TABS || 'true'
}

function pickMainValidation(mainTab, prefix) {
  return (mainTab?.dataValidations || []).find(
    (rule) => Array.isArray(rule.cells) && rule.cells[0] && String(rule.cells[0]).startsWith(prefix),
  )
}

async function main() {
  const jsonPath = resolveServiceAccountPath()
  setSheetEnv(jsonPath)

  const { prepareSpreadsheetWorkspace, rebuildSpreadsheetReports, inspectSpreadsheetWorkspace } =
    await import('../data-source.mjs')

  const prepared = await prepareSpreadsheetWorkspace()
  const rebuilt = await rebuildSpreadsheetReports()
  const inspected = await inspectSpreadsheetWorkspace()
  const inspectFile = path.resolve('tmp', 'sheet-inspection-latest.json')
  fs.mkdirSync(path.dirname(inspectFile), { recursive: true })
  fs.writeFileSync(inspectFile, JSON.stringify(inspected, null, 2), 'utf8')

  const mainTab = (inspected.tabs || []).find((tab) => tab.title === 'Introduccion de datos')
  const vatValidation = pickMainValidation(mainTab, 'G')
  const withholdingValidation = pickMainValidation(mainTab, 'H')

  const output = {
    preparedAt: prepared.preparedAt,
    preparedReports: prepared.reports,
    entries: prepared.entries,
    rebuild: rebuilt,
    mainTabUsedRange: mainTab?.structure?.usedRange,
    mainTabNumberFormats: mainTab?.formats?.numberFormats || {},
    vatValidationValues: vatValidation?.values || [],
    withholdingValidationValues: withholdingValidation?.values || [],
    inspectFile,
  }

  console.log(JSON.stringify(output, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
