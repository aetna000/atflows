import { test, expect } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

test.skipIf(!process.env.CONTINUITY_OLD_RUNTIME || !process.env.CONTINUITY_INSTALLED_RUNTIME)('published server data survives installed continuity upgrade', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'atflows-published-upgrade-'))
    const password = randomBytes(24).toString('hex')
    const producer = randomBytes(24).toString('hex')
    const preload = resolve(import.meta.dir, 'offline-preload.cjs')
    async function start(runtime: string) {
        const child = Bun.spawn({ cmd: [process.execPath, '--no-env-file', '--preload', preload, join(runtime, 'apps/server/src/server.ts')],
            cwd: directory, env: { PATH: process.env.PATH || '', DATA_DIR: directory, DB_PATH: join(directory, 'data.db'),
                ATFLOWS_STATE_DIR: join(directory, 'instances'), ATFLOWS_ADMIN_PASSWORD: password,
                ATFLOWS_CONTINUITY_TOKEN: producer, DASHBOARD_HOST: '127.0.0.1', PROXY_HOST: '127.0.0.1',
                DASHBOARD_PORT: '0', PROXY_PORT: '0', PRICING_URL: 'disabled:continuity-fixture', OTLP_EXPORT_ENABLED: 'false',
                CONTINUITY_GUARD_REPORT: join(directory, 'guard.txt') }, stdout: 'pipe', stderr: 'pipe' })
        const errors = new Response(child.stderr).text()
        let accept!: (value: string) => void
        let reject!: (value: Error) => void
        const ready = new Promise<string>((yes, no) => { accept = yes; reject = no })
        const drained = (async () => {
            let buffer = ''
            for await (const chunk of child.stdout) {
                buffer += Buffer.from(chunk).toString()
                const match = buffer.match(/\[atflows\] Dashboard: (http:\/\/127\.0\.0\.1:\d+)/)
                if (match) accept(match[1])
                if (buffer.length > 65536) buffer = buffer.slice(-8192)
            }
            reject(new Error('isolated server exited'))
        })()
        const timer = setTimeout(() => reject(new Error('isolated startup timeout')), 15000)
        const stop = async () => { clearTimeout(timer); child.kill('SIGTERM'); await child.exited; await drained; await errors }
        try { return { url: await ready, stop } } catch (error) { await stop(); throw error }
    }
    async function login(url: string) {
        const result = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url },
            body: JSON.stringify({ username: 'administrator', password }) })
        expect(result.status).toBe(200)
        return result.headers.get('set-cookie')!.split(';')[0]
    }
    const session = 'published-upgrade-session'
    const old = await start(process.env.CONTINUITY_OLD_RUNTIME!)
    try {
        await login(old.url)
        const result = await fetch(old.url + '/v1/traces', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceSpans: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: 'published-upgrade' } }] },
                scopeSpans: [{ spans: [{ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16), name: 'preserved-old-trace',
                    startTimeUnixNano: '1770000000000000000', endTimeUnixNano: '1770000000100000000',
                    attributes: [{ key: 'session.id', value: { stringValue: session } }] }] }] }] }) })
        expect(result.status).toBe(200)
    } finally { await old.stop() }
    const current = await start(process.env.CONTINUITY_INSTALLED_RUNTIME!)
    try {
        const cookie = await login(current.url)
        const retained = await fetch(current.url + '/api/sessions/' + session, { headers: { Cookie: cookie, Origin: current.url } })
        expect(retained.status).toBe(200)
        const detail = await retained.json()
        expect(detail.traces.length).toBe(1)
        const event = { format: 'atmem.continuity.v1', event_id: 'upgrade_event', workflow_id: 'upgrade_workflow',
            operation_id: 'upgrade_operation', run_id: 'upgrade_run', attempt_id: 'upgrade_attempt', event: 'execute', time: Date.now() / 1000 }
        expect((await fetch(current.url + '/v1/continuity/events', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + producer }, body: JSON.stringify(event) })).status).toBe(200)
        const view = await (await fetch(current.url + '/api/continuity', { headers: { Cookie: cookie, Origin: current.url } })).json()
        expect(view.workflows.length).toBe(1)
        if (process.env.CONTINUITY_UPGRADE_REPORT) await Bun.write(process.env.CONTINUITY_UPGRADE_REPORT,
            JSON.stringify({ passed: true, old_runtime: process.env.CONTINUITY_OLD_RUNTIME, installed_runtime: process.env.CONTINUITY_INSTALLED_RUNTIME,
                old_trace_count: detail.traces.length, old_login_preserved: true, new_continuity_workflows: view.workflows.length }, null, 2))
    } finally { await current.stop() }
}, 40000)
