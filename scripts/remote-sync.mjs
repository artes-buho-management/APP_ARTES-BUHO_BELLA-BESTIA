const DEFAULT_BASE_URL = 'https://bella-bestia.artesbuhomanagement.com'
const DEFAULT_PASSWORD = 'REPLACE_WITH_PASSWORD'

function sanitizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function getCookieFromLoginResponse(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    const all = response.headers.getSetCookie()
    return all.map((entry) => entry.split(';')[0]).join('; ')
  }
  const single = response.headers.get('set-cookie')
  if (!single) {
    return ''
  }
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
      `Login remoto fallido (${response.status}). ${raw.slice(0, 180) || 'Sin detalle de error.'}`,
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
  return {
    ok: response.ok,
    status: response.status,
    path,
    method,
    raw,
    json,
  }
}

function printResult(result) {
  const prefix = result.ok ? 'OK' : 'ERROR'
  const detail = result.json ? JSON.stringify(result.json) : result.raw
  console.log(`[${prefix}] ${result.method} ${result.path} -> ${result.status}`)
  console.log(detail)
}

async function main() {
  const baseUrl = sanitizeBaseUrl(process.env.REMOTE_APP_URL || process.env.APP_URL)
  const password =
    process.env.REMOTE_PANEL_PASSWORD || process.env.PANEL_PASSWORD || DEFAULT_PASSWORD
  const force = String(process.env.REMOTE_FORCE || 'false').toLowerCase() === 'true'

  console.log(`Base remota: ${baseUrl}`)
  const cookie = await login(baseUrl, password)
  console.log('Login remoto: OK')

  const dataSource = await callApi(baseUrl, cookie, '/api/data-source', 'GET')
  printResult(dataSource)
  const source = dataSource.json?.source || 'unknown'

  if (source !== 'google_sheets' && !force) {
    console.log(
      'Fuente remota en local. Se omite bootstrap/rebuild/inspect. Usa REMOTE_FORCE=true para forzar.',
    )
    return
  }

  const bootstrap = await callApi(baseUrl, cookie, '/api/sheets/bootstrap', 'POST')
  printResult(bootstrap)

  const rebuild = await callApi(baseUrl, cookie, '/api/reports/rebuild', 'POST')
  printResult(rebuild)

  const inspect = await callApi(baseUrl, cookie, '/api/sheets/inspect', 'GET')
  printResult(inspect)
}

main().catch((error) => {
  console.error(`Fallo en remote:sync -> ${error instanceof Error ? error.message : 'Error desconocido.'}`)
  process.exitCode = 1
})
