import { test, expect } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

test('actual HTTP server enforces producer and dashboard permissions', async () => {
    const root = resolve(import.meta.dir, '../..')
    const directory = mkdtempSync(join(tmpdir(), 'atflows-continuity-http-'))
    const password = randomBytes(24).toString('hex')
    const producer = randomBytes(24).toString('hex')
    const runtime = process.env.CONTINUITY_INSTALLED_RUNTIME || root
    const child = Bun.spawn({
        cmd: [process.execPath, '--no-env-file', '--preload', join(root, 'tests/continuity/offline-preload.cjs'), join(runtime, 'apps/server/src/server.ts')],
        cwd: directory,
        env: { PATH: process.env.PATH || '', DATA_DIR: directory, DB_PATH: join(directory, 'data.db'),
            ATFLOWS_STATE_DIR: join(directory, 'instances'), ATFLOWS_ADMIN_PASSWORD: password,
            ATFLOWS_CONTINUITY_TOKEN: producer, ATFLOWS_CONTINUITY_SCOPE: 'test-installation',
            DASHBOARD_HOST: '127.0.0.1', PROXY_HOST: '127.0.0.1', DASHBOARD_PORT: '0', PROXY_PORT: '0',
            PRICING_URL: 'disabled:continuity-fixture', OTLP_EXPORT_ENABLED: 'false', CONTINUITY_GUARD_REPORT: join(directory, 'guard.txt') },
        stdout: 'pipe', stderr: 'pipe',
    })
    const errors = new Response(child.stderr).text()
    let resolveReady!: (value: string) => void
    let rejectReady!: (reason: Error) => void
    const ready = new Promise<string>((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
    const drained = (async () => {
        let buffer = ''
        for await (const chunk of child.stdout) {
            buffer += Buffer.from(chunk).toString()
            const match = buffer.match(/\[atflows\] Dashboard: (http:\/\/127\.0\.0\.1:\d+)/)
            if (match) resolveReady(match[1])
            if (buffer.length > 65536) buffer = buffer.slice(-8192)
        }
        rejectReady(new Error('Server exited before startup'))
    })()
    const timer = setTimeout(() => rejectReady(new Error('Server startup timeout')), 15000)
    try {
        const base = await ready
        const request = (path: string, method = 'GET', body?: unknown, cookie = '', bearer = '') => fetch(base + path, {
            method, headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie, Authorization: bearer },
            body: body === undefined ? undefined : JSON.stringify(body),
        })
        expect((await request('/api/continuity')).status).toBe(401)
        const event = { format: 'atmem.continuity.v1', event_id: 'e1', workflow_id: 'w1', operation_id: 'o1', run_id: 'r1', attempt_id: 'a1', event: 'execute', time: Date.now() / 1000 }
        const send = (value: unknown) => request('/v1/continuity/events', 'POST', value, '', 'Bearer ' + producer)
        expect((await request('/v1/continuity/events', 'POST', event)).status).toBe(401)
        expect((await send(event)).status).toBe(200)
        expect((await (await send(event)).json()).replayed).toBe(true)
        expect((await send({ ...event, event: 'completed' })).status).toBe(409)
        expect((await send({ ...event, event_id: 'e2', workflow_id: 'other' })).status).toBe(409)
        expect((await send({ ...event, event_id: 'e3', scope: 'attacker' })).status).toBe(400)
        expect((await send({ ...event, event_id: 'e4', arguments: 'private' })).status).toBe(400)
        const priced = { ...event, event_id: 'e5', charge_id: 'c1', charge_source: 'provider', cost_microusd: 10, price_source: 'rate-v1' }
        expect((await send(priced)).status).toBe(200)
        expect((await send({ ...priced, event_id: 'e6', attempt_id: 'a2' })).status).toBe(409)
        expect((await send({ ...priced, event_id: 'e7', cost_microusd: 20 })).status).toBe(409)
        const login = await request('/api/auth/login', 'POST', { username: 'administrator', password })
        expect(login.status).toBe(200)
        const adminCookie = login.headers.get('set-cookie')!.split(';')[0]
        expect((await request('/v1/continuity/events', 'POST', event, adminCookie)).status).toBe(401)
        for (const role of ['viewer', 'investigator']) {
            const created = await request('/api/users/create', 'POST', { username: role, role }, adminCookie)
            const credentials = await created.json()
            expect(created.status).toBe(201)
            const signed = await request('/api/auth/login', 'POST', { username: role, password: credentials.temporary_password })
            const temporaryCookie = signed.headers.get('set-cookie')!.split(';')[0]
            expect((await request('/api/continuity', 'GET', undefined, temporaryCookie)).status).toBe(401)
            const changed = await request('/api/auth/change-password', 'POST', { new_password: randomBytes(24).toString('hex') }, temporaryCookie)
            const cookie = changed.headers.get('set-cookie')!.split(';')[0]
            expect((await request('/api/continuity', 'GET', undefined, cookie)).status).toBe(role === 'viewer' ? 403 : 200)
        }
        const view = await (await request('/api/continuity', 'GET', undefined, adminCookie)).json()
        expect(view.workflows[0].known_cost_microusd).toBe(10)
        expect(view.workflows[0].events.length).toBe(2)
        if (process.env.CONTINUITY_TEST_REPORT) await Bun.write(process.env.CONTINUITY_TEST_REPORT,
            JSON.stringify({ passed: true, runtime, evidence: view, assertions: 'producer auth, replay/conflicts, scope rejection, session password gate, viewer deny, investigator allow' }, null, 2))
    } finally {
        clearTimeout(timer)
        child.kill('SIGTERM')
        await child.exited
        await drained
        await errors
    }
}, 30000)
