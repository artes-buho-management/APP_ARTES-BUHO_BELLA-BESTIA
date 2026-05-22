import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'

const runs = Math.max(1, Number.parseInt(String(process.env.STRESS_RUNS || '5'), 10) || 5)
const attemptsPerRun = Math.max(
  1,
  Number.parseInt(String(process.env.STRESS_ATTEMPTS || '2'), 10) || 2,
)

function runAuditOnce(iteration) {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const child = spawn(
      process.execPath,
      ['scripts/remote-audit.mjs'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      },
    )

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('close', (code) => {
      const elapsed = Math.round(performance.now() - start)
      if (code === 0) {
        resolve({ ok: true, elapsed, stdout, stderr, iteration })
      } else {
        reject(
          new Error(
            `Fallo en iteración ${iteration}/${runs} (exit ${code})\n--- STDOUT ---\n${stdout}\n--- STDERR ---\n${stderr}`,
          ),
        )
      }
    })
  })
}

async function main() {
  console.log(
    `Stress audit remoto iniciado (${runs} iteraciones, ${attemptsPerRun} intento(s) por iteración).`,
  )
  const durations = []

  for (let iteration = 1; iteration <= runs; iteration += 1) {
    let result = null
    let lastError = null
    for (let attempt = 1; attempt <= attemptsPerRun; attempt += 1) {
      console.log(`\n[${iteration}/${runs}] Ejecutando remote-audit (intento ${attempt}/${attemptsPerRun})...`)
      try {
        result = await runAuditOnce(iteration)
        break
      } catch (error) {
        lastError = error
        if (attempt < attemptsPerRun) {
          console.log(
            `[${iteration}/${runs}] fallo puntual. Reintentando en 1200 ms...`,
          )
          await new Promise((resolve) => setTimeout(resolve, 1200))
        }
      }
    }
    if (!result) {
      throw lastError || new Error(`No se pudo completar la iteración ${iteration}/${runs}.`)
    }
    durations.push(result.elapsed)
    console.log(`[${iteration}/${runs}] OK en ${result.elapsed} ms`)
  }

  const total = durations.reduce((acc, value) => acc + value, 0)
  const avg = total / durations.length
  const max = Math.max(...durations)
  const min = Math.min(...durations)

  console.log('\nStress audit remoto completado.')
  console.log(`- Iteraciones: ${runs}`)
  console.log(`- Tiempo total: ${total} ms`)
  console.log(`- Tiempo medio: ${avg.toFixed(2)} ms`)
  console.log(`- Mínimo: ${min} ms`)
  console.log(`- Máximo: ${max} ms`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
