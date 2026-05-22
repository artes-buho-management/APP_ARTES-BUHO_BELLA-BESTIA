import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import {
  getDataSourceDiagnostics,
  getDataSourceStatus,
  inspectSpreadsheetWorkspace,
  loadEntriesFromDataSource,
  prepareSpreadsheetWorkspace,
  rebuildSpreadsheetReports,
  runAutomaticGoogleSheetsSetup,
  runGoogleSheetsConnectivityCheck,
  saveEntriesToDataSource,
} from './data-source.mjs'

const APP_NAME = 'APP_ARTES-BUHO_BELLA-BESTIA'
const PORT = Number(process.env.PORT || 80)

const DEFAULT_PANEL_PASSWORD = 'REPLACE_WITH_PASSWORD'
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || DEFAULT_PANEL_PASSWORD
const AUTH_SHARED_SECRET =
  process.env.AUTH_SHARED_SECRET ||
  crypto
    .createHash('sha256')
    .update(`${APP_NAME}:${PANEL_PASSWORD}:auth`)
    .digest('hex')
const COOKIE_DOMAIN = Object.prototype.hasOwnProperty.call(process.env, 'COOKIE_DOMAIN') ? process.env.COOKIE_DOMAIN : '.artesbuhomanagement.com'
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'false' ? false : true

const SESSION_COOKIE = 'ab_sso'
const SESSION_DURATION_SECONDS = 8 * 60 * 60
const DIST_DIR = path.join(process.cwd(), 'dist')
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const LOGIN_LOGO_FILE = path.join(PUBLIC_DIR, 'login-logo.webp')

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendHtml(res, statusCode, html, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    ...extraHeaders,
  })
  res.end(html)
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(302, {
    Location: location,
    ...extraHeaders,
  })
  res.end()
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || ''
  const cookies = {}

  cookieHeader.split(';').forEach((pair) => {
    const index = pair.indexOf('=')
    if (index === -1) return
    const key = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    cookies[key] = decodeURIComponent(value)
  })

  return cookies
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''

    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 10 * 1024) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })

    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + padding, 'base64')
}

function signPayload(payloadBase64Url) {
  return toBase64Url(crypto.createHmac('sha256', AUTH_SHARED_SECRET).update(payloadBase64Url).digest())
}

function safeCompare(a, b) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

function buildAuthToken() {
  if (!AUTH_SHARED_SECRET) {
    return ''
  }

  const payload = {
    app: APP_NAME,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  }

  const payloadBase64Url = toBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const signature = signPayload(payloadBase64Url)
  return `${payloadBase64Url}.${signature}`
}

function verifyAuthToken(token) {
  if (!AUTH_SHARED_SECRET || !token) {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [payloadBase64Url, signature] = parts
  const expected = signPayload(payloadBase64Url)

  if (!safeCompare(signature, expected)) {
    return false
  }

  try {
    const payloadRaw = fromBase64Url(payloadBase64Url).toString('utf8')
    const payload = JSON.parse(payloadRaw)
    return Number(payload.exp || 0) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function sessionCookieHeader(token) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DURATION_SECONDS}`,
  ]

  if (COOKIE_DOMAIN) {
    parts.push(`Domain=${COOKIE_DOMAIN}`)
  }

  if (COOKIE_SECURE) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function clearSessionCookieHeader() {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]

  if (COOKIE_DOMAIN) {
    parts.push(`Domain=${COOKIE_DOMAIN}`)
  }

  if (COOKIE_SECURE) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function isAuthenticated(req) {
  const cookies = parseCookies(req)
  return verifyAuthToken(cookies[SESSION_COOKIE])
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'application/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 500, { ok: false, error: 'No se pudo leer el archivo.' })
      return
    }

    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) })
    res.end(content)
  })
}

function renderLogin(errorMessage = '') {
  const errorHtml = errorMessage
    ? `<p class="error-message">${errorMessage}</p>`
    : ''

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Login Bella Bestia</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Verdana,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#170d10 0%,#3c1118 45%,#6a121f 100%);color:#fff;padding:16px}
      .card{width:min(560px,94vw);background:#161a24;border:1px solid #4a2f39;border-radius:16px;padding:22px;box-shadow:0 18px 45px rgba(0,0,0,.35)}
      .brand{display:flex;align-items:center;gap:14px;margin-bottom:6px}
      .logo{width:74px;height:74px;border-radius:12px;background:#fff;object-fit:contain;padding:4px;border:1px solid rgba(255,255,255,.65)}
      .tag{margin:0 0 6px;color:#f4c51a;font-weight:700;letter-spacing:.06rem}
      h1{margin:0 0 4px;font-size:2rem;line-height:1.02}
      p{margin:0 0 12px;color:#d6d3d3}
      label{display:block;margin-bottom:6px;font-weight:700}
      .password-wrap{position:relative;margin:8px 0 12px}
      input{width:100%;padding:12px 48px 12px 12px;border-radius:10px;border:1px solid #5b657f;background:#0f1220;color:#fff;font-size:16px}
      .toggle-pass{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:1px solid #5b657f;border-radius:9px;background:#121a2b;color:#fff;cursor:pointer;display:grid;place-items:center}
      .submit-btn{width:100%;border:0;border-radius:10px;font-weight:700;background:#f3c316;color:#1b1b1b;cursor:pointer;padding:12px}
      .hint{font-size:.85rem;color:#bebebe;margin-top:10px}
      .error-message{color:#ffd6d9;font-weight:700;background:rgba(177,18,27,.2);border:1px solid rgba(177,18,27,.45);padding:10px;border-radius:10px;overflow-wrap:anywhere}
    </style>
  </head>
  <body>
    <main class="card">
      <div class="brand">
        <img src="/login-logo.webp" alt="Logo Bella Bestia" class="logo" />
        <div>
          <p class="tag">APP ARTES BUHO</p>
          <h1>BELLA BESTIA</h1>
        </div>
      </div>
      <p>Acceso protegido por contraseña.</p>
      ${errorHtml}
      <form method="post" action="/login">
        <label for="password">Contraseña</label>
        <div class="password-wrap">
          <input id="password" name="password" type="password" required />
          <button type="button" id="toggle-password" class="toggle-pass" aria-label="Mostrar contraseña" title="Mostrar u ocultar contraseña">
            <span id="toggle-icon">👁</span>
          </button>
        </div>
        <button type="submit" class="submit-btn">Entrar</button>
      </form>
      <p class="hint">Sin usuario. Solo contraseña.</p>
    </main>
    <script>
      (function () {
        const input = document.getElementById('password');
        const toggle = document.getElementById('toggle-password');
        const icon = document.getElementById('toggle-icon');
        if (!input || !toggle || !icon) return;
        toggle.addEventListener('click', function () {
          const showing = input.type === 'password';
          input.type = showing ? 'text' : 'password';
          toggle.setAttribute('aria-label', showing ? 'Ocultar contraseña' : 'Mostrar contraseña');
          icon.textContent = showing ? '🙈' : '👁';
        });
      })();
    </script>
  </body>
</html>`
}

function serveProtectedStatic(req, res, pathname) {
  if (!isAuthenticated(req)) {
    redirect(res, '/login')
    return
  }

  const normalized = pathname === '/' ? '/index.html' : pathname
  const safePath = path.normalize(normalized).replace(/^([.][.][/\\])+/, '')
  let filePath = path.join(DIST_DIR, safePath)

  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(res, 403, { ok: false, error: 'Acceso denegado.' })
    return
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath)
      return
    }

    const spaEntry = path.join(DIST_DIR, 'index.html')
    fs.stat(spaEntry, (entryErr, entryStats) => {
      if (entryErr || !entryStats.isFile()) {
        sendJson(res, 500, { ok: false, error: 'Build no encontrado. Ejecuta npm run build.' })
        return
      }

      sendFile(res, spaEntry)
    })
  })
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', 'http://localhost')
  const pathname = parsedUrl.pathname
  const method = (req.method || 'GET').toUpperCase()

  if (method === 'GET' && pathname === '/health') {
    const dataSource = getDataSourceStatus()
    const diagnostics = getDataSourceDiagnostics()
    sendJson(res, 200, {
      ok: true,
      app: APP_NAME,
      sharedAuthReady: Boolean(AUTH_SHARED_SECRET),
      buildPath: DIST_DIR,
      dataSource: dataSource.source,
      sheetReadOnly: dataSource.readOnly,
      googleSheets: diagnostics,
    })
    return
  }

  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated(req)) {
      sendJson(res, 401, { ok: false, error: 'Sesion no valida. Inicia sesion de nuevo.' })
      return
    }

    if (method === 'GET' && pathname === '/api/data-source') {
      const dataSource = getDataSourceStatus()
      sendJson(res, 200, {
        ok: true,
        ...dataSource,
      })
      return
    }

    if (method === 'GET' && pathname === '/api/sheets/diagnostics') {
      try {
        const result = await runGoogleSheetsConnectivityCheck()
        sendJson(res, 200, {
          ok: true,
          ...result,
          checkedAt: new Date().toISOString(),
        })
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo ejecutar el diagnostico de Google Sheets.',
        })
      }
      return
    }

    if (method === 'GET' && pathname === '/api/sheets/inspect') {
      try {
        const result = await inspectSpreadsheetWorkspace()
        sendJson(res, 200, {
          ok: true,
          ...result,
        })
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo inspeccionar la hoja de cálculo.',
        })
      }
      return
    }

    if (method === 'GET' && pathname === '/api/entries') {
      try {
        const payload = await loadEntriesFromDataSource()
        sendJson(res, 200, {
          ok: true,
          entries: payload.entries,
          source: payload.source,
          syncedAt: new Date().toISOString(),
        })
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: `No se pudieron cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido.'}`,
        })
      }
      return
    }

    if (method === 'POST' && pathname === '/api/entries') {
      let rawBody = ''
      try {
        rawBody = await readBody(req)
      } catch {
        sendJson(res, 400, { ok: false, error: 'Error al leer el body.' })
        return
      }

      let body = null
      try {
        body = rawBody ? JSON.parse(rawBody) : {}
      } catch {
        sendJson(res, 400, { ok: false, error: 'JSON invalido.' })
        return
      }

      const entries = Array.isArray(body?.entries) ? body.entries : null
      if (!entries) {
        sendJson(res, 400, { ok: false, error: 'Debe enviar entries como array.' })
        return
      }

      try {
        const result = await saveEntriesToDataSource(entries)
        sendJson(res, 200, {
          ok: true,
          ...result,
          savedAt: new Date().toISOString(),
        })
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : 'No se pudo guardar en la fuente de datos.',
        })
      }
      return
    }

    if (method === 'POST' && pathname === '/api/reports/rebuild') {
      try {
        const result = await rebuildSpreadsheetReports()
        sendJson(res, 200, {
          ok: true,
          ...result,
          generatedAt: new Date().toISOString(),
        })
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : 'No se pudieron generar los reportes.',
        })
      }
      return
    }

    if (method === 'POST' && pathname === '/api/sheets/bootstrap') {
      try {
        const result = await prepareSpreadsheetWorkspace()
        sendJson(res, 200, {
          ok: true,
          ...result,
          preparedAt: new Date().toISOString(),
        })
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error instanceof Error ? error.message : 'No se pudo preparar la hoja.',
        })
      }
      return
    }

    sendJson(res, 404, { ok: false, error: 'Ruta API no encontrada.' })
    return
  }

  if (method === 'GET' && pathname === '/login') {
    if (isAuthenticated(req)) {
      redirect(res, '/')
      return
    }

    sendHtml(res, 200, renderLogin())
    return
  }

  if (method === 'GET' && pathname === '/login-logo.webp') {
    fs.stat(LOGIN_LOGO_FILE, (err, stats) => {
      if (err || !stats.isFile()) {
        sendJson(res, 404, { ok: false, error: 'Logo no encontrado.' })
        return
      }
      sendFile(res, LOGIN_LOGO_FILE)
    })
    return
  }

  if (method === 'POST' && pathname === '/login') {
    let body = ''

    try {
      body = await readBody(req)
    } catch {
      sendHtml(res, 400, renderLogin('Error al procesar el formulario.'))
      return
    }

    const params = new URLSearchParams(body)
    const password = params.get('password') || ''

    if (password !== PANEL_PASSWORD) {
      sendHtml(res, 401, renderLogin('Contraseña incorrecta.'))
      return
    }

    const token = buildAuthToken()
    redirect(res, '/', { 'Set-Cookie': sessionCookieHeader(token) })
    return
  }

  if (method === 'GET' && pathname === '/logout') {
    redirect(res, '/login', { 'Set-Cookie': clearSessionCookieHeader() })
    return
  }

  serveProtectedStatic(req, res, pathname)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`${APP_NAME} escuchando en puerto ${PORT}`)

  // Arranque automático: prepara hoja + reportes cuando Google Sheets está listo.
  void (async () => {
    try {
      const result = await runAutomaticGoogleSheetsSetup()
      if (result?.skipped) {
        console.log(`[GoogleSheets] Setup automático omitido: ${result.reason || 'sin acciones'}`)
        return
      }
      console.log('[GoogleSheets] Setup automático completado correctamente.')
    } catch (error) {
      console.error(
        `[GoogleSheets] Error en setup automático: ${
          error instanceof Error ? error.message : 'fallo desconocido'
        }`,
      )
    }
  })()
})
