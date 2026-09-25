import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { Database } from 'bun:sqlite'

// Parent-owned fixture harness: does not expose SQL inspection over HTTP.
const root = fileURLToPath(new URL('../../', import.meta.url))
const argument = process.argv[2]
if (!argument) throw new Error('Supply a fresh output directory')
const directory = resolve(argument)
if (existsSync(directory)) throw new Error('Refusing existing output directory')
const input = JSON.parse(await Bun.stdin.text())
if (!Array.isArray(input.requests) || input.requests.length > 100)
    throw new Error('Expected at most 100 explicit fixture requests')
for (const request of input.requests) {
    if (!['deliver', 'drop'].includes(request.action) || !request.payload?.resourceSpans)
        throw new Error('Invalid fixture request')
}
mkdirSync(directory, { recursive: true, mode: 0o700 })
const guardReport = join(directory, 'egress-denied.txt')
const child = Bun.spawn({
    cmd: [
        process.execPath,
        '--no-env-file',
        '--preload',
        join(root, 'tests/continuity/offline-preload.cjs'),
        join(root, 'apps/server/src/server.ts'),
    ],
    cwd: directory,
    env: {
        PATH: process.env.PATH || '',
        DATA_DIR: directory,
        DB_PATH: join(directory, 'fixture.db'),
        ATFLOWS_STATE_DIR: join(directory, 'instances'),
        ATFLOWS_ADMIN_PASSWORD: randomBytes(32).toString('hex'),
        DASHBOARD_HOST: '127.0.0.1',
        PROXY_HOST: '127.0.0.1',
        DASHBOARD_PORT: '0',
        PROXY_PORT: '0',
        PRICING_URL: 'disabled:continuity-fixture',
        OTLP_EXPORT_ENABLED: 'false',
        CONTINUITY_GUARD_REPORT: guardReport,
    },
    stdout: 'pipe',
    stderr: 'pipe',
})
// Drain stderr without exporting incidental logs or bootstrap details.
const stderr = new Response(child.stderr).text()
const responses: unknown[] = []
let timer: ReturnType<typeof setTimeout> | undefined
const terminate = async () => {
    child.kill('SIGKILL')
    await child.exited
    process.exit(143)
}
process.on('SIGTERM', terminate)
process.on('SIGINT', terminate)
let startupResolve!: (url: string) => void
let startupReject!: (error: Error) => void
const ready = new Promise<string>((resolve, reject) => {
    startupResolve = resolve
    startupReject = reject
})
let streamFailed = false
const stdoutDone = (async () => {
    let buffer = ''
    let announced = false
    try {
        for await (const chunk of child.stdout) {
            if (announced) continue
            buffer += Buffer.from(chunk).toString('utf8')
            const match = buffer.match(/\[atflows\] Dashboard: (http:\/\/127\.0\.0\.1:\d+)/)
            if (match) {
                announced = true
                startupResolve(match[1])
                buffer = ''
            }
            if (buffer.length > 65536) throw new Error('Unexpected server startup output')
        }
        if (!announced) startupReject(new Error('Server exited before readiness'))
    } catch {
        streamFailed = true
        startupReject(new Error('Server output stream failed'))
    }
})()
try {
    const url = await Promise.race([
        ready,
        new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Server startup timeout')), 30000)
        }),
    ])
    clearTimeout(timer)
    for (const request of input.requests) {
        if (request.action === 'drop') {
            responses.push({ disposition: 'intentionally_not_sent' })
            continue
        }
        const response = await fetch(`${url}/v1/traces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.payload),
            signal: AbortSignal.timeout(10000),
            redirect: 'error',
        })
        responses.push({ status: response.status, body: await response.json() })
    }
} finally {
    clearTimeout(timer)
    child.kill('SIGTERM')
    const killer = setTimeout(() => child.kill('SIGKILL'), 5000)
    await child.exited
    clearTimeout(killer)
    await stderr
    await stdoutDone
    process.off('SIGTERM', terminate)
    process.off('SIGINT', terminate)
}
if (streamFailed) throw new Error('Server output stream failed; run invalid')
if (existsSync(guardReport)) throw new Error('Offline egress guard triggered; run invalid')
const database = new Database(join(directory, 'fixture.db'), { readonly: true })
let rows
try {
    rows = database.query('SELECT * FROM traces ORDER BY id').all()
} finally {
    database.close()
}
const output = {
    evidence_level: 'engineering-http-fixture',
    boundary: 'unmodified server /v1/traces on isolated loopback',
    authentication:
        'no producer credential or Origin header sent; characterize this route path only',
    pricing: 'network refresh target disabled; retained values are current-product outputs',
    guarded_egress_attempts_detected: 0,
    guard_vectors: [
        'global fetch',
        'http/https get/request',
        'net.Socket.connect',
        'dns.lookup',
        'os.homedir',
    ],
    limitations: [
        'Test tripwires, not a hostile-code sandbox; native/Bun-specific paths not all intercepted',
        'Explicit fixture storage paths; home fallback forbidden; temporary artifacts retained for inspection',
    ],
    responses,
    rows,
}
await Bun.write(join(directory, 'observations.json'), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify(output))
