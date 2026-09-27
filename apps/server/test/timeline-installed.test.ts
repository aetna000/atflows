import { test, expect } from 'bun:test'
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { eventIdentity } from '../../../packages/db/src/hermes'

test.skipIf(!process.env.ATFLOWS_INSTALLED_RUNTIME)('installed dashboard serves Hermes guidance and exact retained-service filters', async () => {
    const runtime = process.env.ATFLOWS_INSTALLED_RUNTIME!
    const directory = realpathSync(mkdtempSync(join(tmpdir(), 'atflows-filter-installed-')))
    const password = randomBytes(24).toString('hex')
    const child = Bun.spawn({ cmd: [process.execPath, '--no-env-file', join(runtime, 'apps/server/src/server.ts')],
        cwd: directory, env: { PATH: process.env.PATH || '', DATA_DIR: directory, DB_PATH: join(directory, 'data.db'),
            ATFLOWS_STATE_DIR: join(directory, 'instances'), ATFLOWS_ADMIN_PASSWORD: password,
            DASHBOARD_HOST: '127.0.0.1', PROXY_HOST: '127.0.0.1', DASHBOARD_PORT: '0', PROXY_PORT: '0',
            OTLP_EXPORT_ENABLED: 'false', PRICING_URL: 'disabled:installed-test' }, stdout: 'pipe', stderr: 'pipe' })
    const errors = new Response(child.stderr).text()
    let accept!: (url: string) => void
    let reject!: (error: Error) => void
    const ready = new Promise<string>((yes, no) => { accept = yes; reject = no })
    const drain = (async () => {
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
    try {
        const url = await ready
        expect((await fetch(url + '/api/timeline/filters')).status).toBe(401)
        const login = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url },
            body: JSON.stringify({ username: 'administrator', password }) })
        expect(login.status).toBe(200)
        const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0], Origin: url }
        const get = async (route: string) => {
            const response = await fetch(url + route, { headers })
            expect(response.status).toBe(200)
            return response.json()
        }
        expect((await get('/api/timeline/filters')).services).toEqual([])
        for (const [service, timestamp] of [['hermes', 1], ['custom-agent', 2], ['hermes-extra', 3]] as const) {
            const response = await fetch(url + '/v1/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                resourceLogs: [{ resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] },
                    scopeLogs: [{ logRecords: [{ timeUnixNano: String(timestamp * 1e9), body: { stringValue: 'installed-filter-test' } }] }] }],
            }) })
            expect(response.status).toBe(200)
        }
        expect((await get('/api/timeline/filters')).services).toEqual(['custom-agent', 'hermes', 'hermes-extra'])
        const matching = await get('/api/timeline?tool=hermes')
        expect(matching.length).toBe(1)
        expect(matching[0].service_name).toBe('hermes')
        expect(await get('/api/timeline?tool=HERMES')).toEqual([])
        expect(await get('/api/timeline?tool=herme')).toEqual([])
        const catalog = await get('/api/integrations')
        expect(catalog.integrations.find((item: { id: string }) => item.id === 'hermes').status).toBe('available')
        expect((await get('/api/integrations/guides/hermes')).markdown).toContain('Apply Hermes setup')
        const page = await (await fetch(url)).text()
        const asset = page.match(/src="([^\"]+\.js)"/)![1]
        const bundle = await (await fetch(new URL(asset, url))).text()
        expect(bundle).toContain('All tools / services')
        expect(bundle).toContain('Review Hermes setup')
        const home = join(directory, 'hermes-home'); mkdirSync(home, { mode: 0o700 })
        writeFileSync(join(home, 'config.yaml'), 'model: keep-me\n', { mode: 0o600 })
        const cli = async (args: string[]) => {
            const command = process.env.ATFLOWS_TEST_PYTHON
                ? [process.env.ATFLOWS_TEST_PYTHON, '-c', 'from atflows.cli import main; raise SystemExit(main())', 'connect', 'hermes', ...args]
                : [process.execPath, join(runtime, 'packages/integrations/src/hermes-cli.ts'), ...args]
            const client = Bun.spawn(command, { cwd: directory,
                env: { PATH: Bun.env.PATH || '', PYTHONPATH: join(runtime, '../..'), ATFLOW_RUNTIME_DIR: join(directory, 'runtime-cache'), DATA_DIR: directory, DB_PATH: join(directory, 'data.db') }, stdout: 'pipe', stderr: 'pipe' })
            const [exit, output, error] = await Promise.all([client.exited, new Response(client.stdout).text(), new Response(client.stderr).text()])
            expect(exit).toBe(0)
            if (exit) throw Error(error)
            return JSON.parse(output.slice(output.indexOf('{')))
        }
        const preview = await cli(['preview', '--endpoint', url, '--home', home])
        await cli(['apply', '--preview', preview.preview_id])
        expect((await cli(['status', '--endpoint', url, '--home', home])).state).toBe('awaiting_traffic')
        const credential = JSON.parse(readFileSync(join(home, 'plugins/atflows/connection.json'), 'utf8'))
        const event = { format: 'atflows.hermes.v1', connection_id: credential.connection_id, session_id: 'a'.repeat(64), task_id: null, turn_id: null, request_id: 'b'.repeat(64), tool_id: null, kind: 'request', started_at: Date.now(), ended_at: Date.now(), retry_count: null, model: 'installed-test', provider: 'other', tool: 'other', outcome: 'ok', status_code: null, input_tokens: null, output_tokens: null, dropped_total: 0 }
        const response = await fetch(url + '/v1/hermes/events', { method: 'POST', headers: { Authorization: `Bearer ${credential.token}` }, body: JSON.stringify({ ...event, event_id: eventIdentity(event) }) })
        expect(response.status).toBe(200)
        const native = await get('/api/timeline?type=hermes')
        expect(native.length).toBe(1)
        expect(native[0].cost).toBeUndefined()
        expect(native[0].tokens).toBeUndefined()
        expect((await cli(['status', '--endpoint', url, '--home', home])).state).toBe('observed')
        await cli(['undo', '--home', home])
    } finally {
        clearTimeout(timer)
        child.kill('SIGTERM')
        await child.exited
        await drain
        await errors
    }
}, 30000)
