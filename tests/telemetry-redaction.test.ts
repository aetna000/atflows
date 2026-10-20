import { expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { Database } from 'bun:sqlite'
const { redactTelemetry, LIMITS } = require('../packages/shared/src/redact.js')
const secret = 'sk-proj-' + 'CanarySecret'.repeat(4)

test('pure bounded recursive filtering handles JSON, OTLP, credentials and benign text', () => {
    const original = {
        request: {
            authorization: 'opaque-canary',
            nested: [{ key: 'api_key', value: { stringValue: 'opaque-key' } }],
        },
        body: JSON.stringify({ password: 'opaque-password', content: 'visible', key: secret }),
        url: 'https://alice:opaque-pass@example.org/api?api_key=opaque-query&limit=10',
        text: `ordinary explanation ${secret} Bearer opaque-bearer`,
        prompt_tokens: 12,
    }
    const snapshot = JSON.stringify(original)
    const result = JSON.stringify(redactTelemetry(original))
    for (const value of [
        secret,
        'opaque-canary',
        'opaque-key',
        'opaque-password',
        'opaque-pass',
        'opaque-query',
        'opaque-bearer',
    ]) {
        expect(result).not.toContain(value)
    }
    expect(result).toContain('visible')
    expect(result).toContain('limit=10')
    expect(result).toContain('ordinary explanation')
    expect(JSON.stringify(original)).toBe(snapshot)
    expect(redactTelemetry({ prompt_tokens: 12 })).toEqual({ prompt_tokens: 12 })
})

test('unsupported inputs fail closed with fixed diagnostic and no accessor calls', () => {
    const cycle: any = {}
    cycle.self = cycle
    let invoked = false
    const accessor = Object.defineProperty({}, 'secret', {
        enumerable: true,
        get() {
            invoked = true
            return secret
        },
    })
    let nested: any = {}
    for (let i = 0; i < 40; i++) nested = { nested }
    for (const value of [
        cycle,
        accessor,
        nested,
        new Date(),
        new Array(LIMITS.nodes + 1),
        'x'.repeat(LIMITS.string + 1),
        Object.fromEntries(
            Array.from({ length: 10 }, (_, i) => [String(i), 'x'.repeat(LIMITS.string)]),
        ),
    ]) {
        expect(() => redactTelemetry(value)).toThrow('telemetry_rejected')
    }
    expect(invoked).toBe(false)
})

test('database persistence, WAL and hooks contain no recognized canary', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'atflows-redaction-db-'))
    process.env.DATA_DIR = folder
    process.env.DB_PATH = join(folder, 'data.db')
    const db = await import('../packages/db/src/index')
    const observed: any[] = []
    db.setInsertTraceHook((row: any) => observed.push(row))
    db.setInsertLogHook((row: any) => observed.push(row))
    db.setInsertMetricHook((row: any) => observed.push(row))
    db.insertTrace({
        id: 'redaction-trace',
        timestamp: Date.now(),
        request_body: { password: 'opaque-db' },
        response_body: secret,
    } as any)
    db.insertLog({ id: 'redaction-log', timestamp: Date.now(), body: secret } as any)
    db.insertMetric({
        id: 'redaction-metric',
        timestamp: Date.now(),
        name: 'tokens',
        metric_type: 'gauge',
        attributes: { api_key: 'opaque-db' },
    } as any)
    expect(observed.length).toBe(3)
    expect(JSON.stringify(observed)).not.toContain(secret)
    expect(JSON.stringify(observed)).not.toContain('opaque-db')
    for (const file of readdirSync(folder).filter((name) => name.startsWith('data.db'))) {
        const bytes = readFileSync(join(folder, file)).toString('latin1')
        expect(bytes).not.toContain(secret)
        expect(bytes).not.toContain('opaque-db')
    }
    expect(() =>
        db.insertTrace({
            id: 'rejected',
            timestamp: Date.now(),
            request_body: 'x'.repeat(LIMITS.string + 1),
        } as any),
    ).toThrow('telemetry_rejected')
    expect(observed.length).toBe(3)
})

test('actual OTLP export sanitizes payload but preserves transport authorization', async () => {
    let received: any = null
    const receiver = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        async fetch(req) {
            received = { headers: req.headers.get('authorization'), body: await req.text() }
            return new Response('{}')
        },
    })
    process.env.OTLP_EXPORT_ENDPOINT = `http://127.0.0.1:${receiver.port}/v1/traces`
    process.env.OTLP_EXPORT_HEADERS = 'Authorization=Bearer configured-transport-key'
    const exporter = require('../packages/otlp/src/export.js')
    try {
        const result = await exporter.exportTraces([
            { id: '1234', timestamp: Date.now(), error: secret, model: 'test' },
        ])
        expect(result.success).toBe(true)
        expect(received.headers).toBe('Bearer configured-transport-key')
        expect(received.body).not.toContain(secret)
        expect(received.body).toContain('[REDACTED]')
        received = null
        const cycle: any = {}
        cycle.self = cycle
        expect((await exporter.exportTraces([cycle])).error).toBe('telemetry_rejected')
        expect(received).toBeNull()
    } finally {
        receiver.stop(true)
    }
})

test('diagnostic logger sanitizes nested content', () => {
    const output: string[] = []
    const original = console.log
    console.log = (...args) => {
        output.push(args.join(' '))
    }
    try {
        const logger = require('../packages/shared/src/logger.js')
        logger.error(`upstream failed ${secret}`)
        expect(output.join('\n')).not.toContain(secret)
        expect(output.join('\n')).toContain('[REDACTED]')
    } finally {
        console.log = original
    }
})

test('live JSON/protobuf, dashboard, WebSocket and proxy streaming keep telemetry clean', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'atflows-redaction-http-'))
    const requireServer = createRequire(new URL('../apps/server/package.json', import.meta.url))
    const { default: getPort } = await import(requireServer.resolve('get-port'))
    const port = await getPort(),
        proxyPort = await getPort()
    const base = `http://127.0.0.1:${port}`
    const forwarded: any[] = []
    const responseBody = JSON.stringify({
        id: 'reply',
        model: 'test',
        choices: [{ message: { role: 'assistant', content: secret } }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    })
    const streamBody = `data: ${JSON.stringify({ choices: [{ delta: { content: secret } }] })}\n\ndata: [DONE]\n\n`
    const upstream = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        async fetch(req) {
            const raw = await req.text()
            forwarded.push(JSON.parse(raw))
            return new Response(JSON.parse(raw).stream ? streamBody : responseBody, {
                headers: {
                    'Content-Type': JSON.parse(raw).stream
                        ? 'text/event-stream'
                        : 'application/json',
                },
            })
        },
    })
    const child = Bun.spawn([process.execPath, '--no-env-file', 'apps/server/src/server.ts'], {
        cwd: join(import.meta.dir, '..'),
        env: {
            PATH: process.env.PATH || '',
            DATA_DIR: folder,
            DB_PATH: join(folder, 'data.db'),
            ATFLOWS_STATE_DIR: join(folder, 'instances'),
            DASHBOARD_PORT: String(port),
            PROXY_PORT: String(proxyPort),
            ATFLOWS_ADMIN_PASSWORD: 'redaction-fixture-password',
            PRICING_URL: 'disabled:redaction',
            OLLAMA_HOST: '127.0.0.1',
            OLLAMA_PORT: String(upstream.port),
            OTLP_EXPORT_ENABLED: 'false',
        },
        stdout: 'pipe',
        stderr: 'pipe',
    })
    const stdout = new Response(child.stdout).text(),
        stderr = new Response(child.stderr).text()
    let socket: WebSocket | undefined
    try {
        let ready = false
        for (let i = 0; i < 100; i++) {
            try {
                if ((await fetch(`${base}/api/health`)).ok) {
                    ready = true
                    break
                }
            } catch {}
            await Bun.sleep(50)
        }
        expect(ready).toBe(true)
        const login = await fetch(`${base}/api/auth/login`, {
            method: 'POST',
            headers: { Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'administrator',
                password: 'redaction-fixture-password',
            }),
        })
        expect(login.status).toBe(200)
        const cookie = login.headers.get('set-cookie')!.split(';')[0]
        const messages: string[] = []
        socket = new WebSocket(base.replace('http:', 'ws:') + '/ws', {
            headers: { Cookie: cookie, Origin: base },
        })
        socket.onmessage = (event) => messages.push(String(event.data))
        await new Promise<void>((resolve, reject) => {
            socket!.onopen = () => resolve()
            socket!.onerror = () => reject(new Error('fixture socket failed'))
        })
        const { requestType } = require('../packages/otlp/src/protobuf.js')
        for (const wire of ['json', 'protobuf']) {
            const span = {
                traceId: Buffer.alloc(16, 1),
                spanId: Buffer.alloc(8, wire === 'json' ? 2 : 3),
                name: secret,
                startTimeUnixNano: String(Date.now() * 1e6),
                endTimeUnixNano: String(Date.now() * 1e6),
                attributes: [
                    { key: 'authorization', value: { stringValue: 'opaque-http-canary' } },
                ],
            }
            let fixture: any = { resourceSpans: [{ scopeSpans: [{ spans: [span] }] }] }
            if (wire === 'json') {
                span.traceId = span.traceId.toString('hex') as any
                span.spanId = span.spanId.toString('hex') as any
            }
            const response = await fetch(base + '/v1/traces', {
                method: 'POST',
                headers: {
                    'Content-Type': wire === 'json' ? 'application/json' : 'application/x-protobuf',
                },
                body:
                    wire === 'json'
                        ? JSON.stringify(fixture)
                        : requestType('traces').encode(fixture).finish(),
            })
            expect(response.status).toBe(200)
        }
        for (const stream of [false, true]) {
            const body = { model: 'test', messages: [{ role: 'user', content: secret }], stream }
            const response = await fetch(
                `http://127.0.0.1:${proxyPort}/ollama/v1/chat/completions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            )
            expect(response.status).toBe(200)
            expect(await response.text()).toBe(stream ? streamBody : responseBody)
            expect(forwarded.at(-1)).toEqual(body)
        }
        await Bun.sleep(150)
        const dashboard = await fetch(base + '/api/traces', { headers: { Cookie: cookie } })
        expect(dashboard.status).toBe(200)
        const browserData = await dashboard.text()
        for (const output of [browserData, messages.join('\n')]) {
            expect(output).not.toContain(secret)
            expect(output).not.toContain('opaque-http-canary')
        }
        expect(messages.length).toBeGreaterThan(1)
        const db = new Database(join(folder, 'data.db'), { readonly: true })
        expect((db.query('SELECT count(*) AS n FROM traces').get() as any).n).toBe(4)
        db.close()
        for (const name of readdirSync(folder).filter((name) => name.startsWith('data.db'))) {
            const contents = readFileSync(join(folder, name)).toString('latin1')
            expect(contents).not.toContain(secret)
            expect(contents).not.toContain('opaque-http-canary')
        }
        // Model an upgrade: old bytes remain on disk but must not leak through reads.
        const legacy = new Database(join(folder, 'data.db'))
        legacy
            .query('INSERT INTO traces(id,timestamp,response_body) VALUES(?,?,?)')
            .run('legacy-row', Date.now(), secret)
        legacy.close()
        const legacyRead = await fetch(base + '/api/traces', { headers: { Cookie: cookie } })
        expect(await legacyRead.text()).not.toContain(secret)
    } finally {
        socket?.close()
        child.kill('SIGKILL')
        await child.exited
        upstream.stop(true)
        for (const output of [await stdout, await stderr]) expect(output).not.toContain(secret)
    }
}, 30000)
