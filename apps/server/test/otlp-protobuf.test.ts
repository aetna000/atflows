import { expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import getPort from 'get-port'

const { requestType, responseType, decodeExport, encodeResponse } = require('@atflows/otlp/protobuf')

test('OTLP protobuf and JSON ingest traces, logs, and metrics with bounded errors', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-protobuf-'))
    const dashboardPort = await getPort()
    const proxyPort = await getPort()
    const server = Bun.spawn(['bun', '--no-env-file', 'run', 'apps/server/src/server.ts'], {
        cwd: path.resolve(import.meta.dir, '../../..'),
        env: { ...process.env, DATA_DIR: dataDir, DASHBOARD_PORT: String(dashboardPort), PROXY_PORT: String(proxyPort), ATFLOWS_ADMIN_PASSWORD: 'openclaw-test-password', OTLP_MAX_COMPRESSED_BYTES: '1024', OTLP_MAX_DECODED_BYTES: '1024' },
        stdout: 'pipe', stderr: 'pipe',
    })
    const base = `http://127.0.0.1:${dashboardPort}`
    const traceId = Buffer.alloc(16, 0x11)
    const spanId = Buffer.alloc(8, 0x22)
    const now = String(Date.now() * 1_000_000)
    const attrs = [{ key: 'service.name', value: { stringValue: 'openclaw-gateway' } }]
    const fixtures = {
        traces: { resourceSpans: [{ resource: { attributes: attrs }, scopeSpans: [{ spans: [{ traceId, spanId, name: 'openclaw.model.usage', startTimeUnixNano: now, endTimeUnixNano: String(Number(now) + 1_000_000), attributes: [{ key: 'session.id', value: { stringValue: 'openclaw-test-session' } }, { key: 'gen_ai.request.model', value: { stringValue: 'gpt-test' } }, { key: 'gen_ai.usage.input_tokens', value: { intValue: '12' } }, { key: 'gen_ai.usage.output_tokens', value: { intValue: '5' } }] }] }] }] },
        logs: { resourceLogs: [{ resource: { attributes: attrs }, scopeLogs: [{ logRecords: [{ traceId, spanId, timeUnixNano: now, body: { stringValue: 'model run completed' }, severityNumber: 9 }] }] }] },
        metrics: { resourceMetrics: [{ resource: { attributes: attrs }, scopeMetrics: [{ metrics: [{ name: 'openclaw.tokens', gauge: { dataPoints: [{ timeUnixNano: now, asInt: '7' }] } }] }] }] },
    }
    try {
        let ready = false
        for (let i = 0; i < 100; i++) {
            try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break } } catch { /* starting */ }
            await Bun.sleep(50)
        }
        expect(ready).toBe(true)
        expect((await fetch(`${base}/api/integrations/openclaw/status`)).status).toBe(401)
        const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'administrator', password: 'openclaw-test-password' }) })
        expect(login.status).toBe(200)
        const cookie = login.headers.get('set-cookie')!.split(';')[0]
        for (const signal of ['traces', 'logs', 'metrics'] as const) {
            const body = fs.readFileSync(path.join(import.meta.dir, 'fixtures', `openclaw-${signal}.pb`))
            const response = await fetch(`${base}/v1/${signal}`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body })
            expect(response.status).toBe(200)
            expect(response.headers.get('content-type')).toBe('application/x-protobuf')
            expect(responseType(signal).decode(new Uint8Array(await response.arrayBuffer())).partialSuccess).toBeNull()
        }
        const db = new Database(path.join(dataDir, 'data.db'), { readonly: true })
        expect(db.query('SELECT trace_id, session_id, model, prompt_tokens, completion_tokens, span_type FROM traces').get()).toEqual({ trace_id: traceId.toString('hex'), session_id: 'openclaw-test-session', model: 'gpt-test', prompt_tokens: 12, completion_tokens: 5, span_type: 'llm' })
        expect(db.query('SELECT trace_id FROM logs').get()).toEqual({ trace_id: traceId.toString('hex') })
        expect(db.query('SELECT name, value_int FROM metrics').get()).toEqual({ name: 'openclaw.tokens', value_int: 7 })
        const activityResponse = await fetch(`${base}/api/integrations/openclaw/status`, { headers: { Cookie: cookie } })
        expect(activityResponse.status).toBe(200)
        const activity = await activityResponse.json() as { service_name: string; traces: number | null; logs: number | null; metrics: number | null }
        expect(activity.service_name).toBe('openclaw-gateway')
        for (const signal of ['traces', 'logs', 'metrics'] as const) expect(activity[signal]).toBeGreaterThan(0)

        const compressed = gzipSync(Buffer.from(requestType('logs').encode(fixtures.logs).finish()))
        const gzipResponse = await fetch(`${base}/v1/logs`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf', 'Content-Encoding': 'gzip' }, body: compressed })
        expect(gzipResponse.status).toBe(200)
        expect((db.query('SELECT count(*) AS count FROM logs').get() as { count: number }).count).toBe(2)

        for (const signal of ['traces', 'logs', 'metrics'] as const) {
            const json = decodeExport(signal, requestType(signal).encode(fixtures[signal]).finish())
            if (signal === 'traces') json.resourceSpans[0].scopeSpans[0].spans[0].spanId = Buffer.alloc(8, 0x44).toString('hex')
            const response = await fetch(`${base}/v1/${signal}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) })
            expect(response.status).toBe(200)
            expect(await response.json()).toEqual({})
        }
        expect((db.query('SELECT count(*) AS count FROM traces').get() as { count: number }).count).toBe(2)
        expect((db.query('SELECT count(*) AS count FROM logs').get() as { count: number }).count).toBe(3)
        expect((db.query('SELECT count(*) AS count FROM metrics').get() as { count: number }).count).toBe(2)

        for (const signal of ['traces', 'logs', 'metrics'] as const) {
            const empty = await fetch(`${base}/v1/${signal}`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body: Buffer.alloc(0) })
            expect(empty.status).toBe(200)
            const partialField = { traces: 'rejectedSpans', logs: 'rejectedLogRecords', metrics: 'rejectedDataPoints' }[signal]
            const partialBody = responseType(signal).decode(encodeResponse(signal, 2, '2 records rejected'))
            expect(Number(partialBody.partialSuccess?.[partialField])).toBe(2)
            const unknownField = await fetch(`${base}/v1/${signal}`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body: Buffer.from([0xf8, 0x07, 0x01]) })
            expect(unknownField.status).toBe(200)
            const invalidGzip = await fetch(`${base}/v1/${signal}`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf', 'Content-Encoding': 'gzip' }, body: Buffer.from('not gzip') })
            expect(invalidGzip.status).toBe(400)
        }

        const repeated = { ...fixtures.traces, resourceSpans: [{ ...fixtures.traces.resourceSpans[0], scopeSpans: [{ spans: [
            { ...fixtures.traces.resourceSpans[0].scopeSpans[0].spans[0], spanId: Buffer.alloc(8, 0x33) },
            { ...fixtures.traces.resourceSpans[0].scopeSpans[0].spans[0], spanId: Buffer.alloc(8, 0x33) },
        ] }] }] }
        const partial = await fetch(`${base}/v1/traces`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body: Buffer.from(requestType('traces').encode(repeated).finish()) })
        expect(partial.status).toBe(200)
        expect(Number(responseType('traces').decode(new Uint8Array(await partial.arrayBuffer())).partialSuccess?.rejectedSpans)).toBe(1)

        const malformed = await fetch(`${base}/v1/traces`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body: Buffer.from([0x0a, 0xff]) })
        expect(malformed.status).toBe(400)
        expect(malformed.headers.get('content-type')).toBe('application/x-protobuf')
        const unsupported = await fetch(`${base}/v1/traces`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' })
        expect(unsupported.status).toBe(415)
        const compressedJson = await fetch(`${base}/v1/metrics`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body: gzipSync(Buffer.from('{"resourceMetrics":[]}')) })
        expect(compressedJson.status).toBe(200)
        const oversizedCompressed = await fetch(`${base}/v1/traces`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' }, body: Buffer.alloc(1025) })
        expect(oversizedCompressed.status).toBe(413)
        for (const signal of ['traces', 'logs', 'metrics'] as const) {
            const oversized = await fetch(`${base}/v1/${signal}`, { method: 'POST', headers: { 'Content-Type': 'application/x-protobuf', 'Content-Encoding': 'gzip' }, body: gzipSync(Buffer.alloc(2048, 0)) })
            expect(oversized.status).toBe(413)
        }
        db.close()
    } finally {
        server.kill()
        await server.exited
        fs.rmSync(dataDir, { recursive: true, force: true })
    }
}, 20_000)
