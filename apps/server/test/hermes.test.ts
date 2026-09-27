import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HermesStore, eventIdentity, validateHermes } from '../../../packages/db/src/hermes'
import { hermesReceiver } from '../src/hermes'
import { previewHermes, applyHermes, undoHermes, hermesStatus } from '../../../packages/integrations/src/hermes'

const token = 'a'.repeat(64), id = '00000000-0000-4000-8000-000000000001'
function fixture() {
    const db = new Database(':memory:'); const store = new HermesStore(db)
    store.provision(id, token, 'profile')
    return { db, store }
}
function event(overrides: Record<string, any> = {}) {
    const e: Record<string, any> = { format: 'atflows.hermes.v1', connection_id: id, event_id: '', session_id: 'b'.repeat(64), task_id: null, turn_id: null,
        request_id: 'c'.repeat(64), tool_id: null, kind: 'request', started_at: 1700000000000, ended_at: 1700000000010,
        retry_count: null, model: 'qwen3:1.7b', provider: 'ollama', tool: 'other', outcome: 'ok', status_code: null,
        input_tokens: null, output_tokens: null, dropped_total: 0, ...overrides }
    e.event_id = eventIdentity(e); return e
}
test('native receiver authenticates, denies browsers, validates and deduplicates without raw content', async () => {
    const { db, store } = fixture(), receive = hermesReceiver(store)
    const send = (body: unknown, headers = {}, peer = '127.0.0.1') => receive(new Request('http://localhost/v1/hermes/events', { method: 'POST', headers: { authorization: `Bearer ${token}`, ...headers }, body: JSON.stringify(body) }), peer)
    expect((await send(event(), { authorization: '' })).status).toBe(401)
    expect((await send(event(), { origin: 'http://localhost' })).status).toBe(403)
    expect((await send(event(), {}, '192.168.0.2')).status).toBe(403)
    expect((await send({ ...event(), prompt: 'CANARY-RAW-SECRET' })).status).toBe(400)
    expect((await send({ ...event(), connection_id: 'other' })).status).toBe(400)
    expect((await send({ ...event(), padding: 'x'.repeat(9000) })).status).toBe(400)
    expect((await send(event())).status).toBe(200)
    expect(await (await send(event())).json()).toEqual({ accepted: true, duplicate: true })
    expect((await send(event({ input_tokens: 0 }))).status).toBe(409)
    expect(store.summary(id).unknown_usage).toBe(1)
    expect(store.summary(id).unknown_cost).toBe(1)
    const second = event({ ended_at: 1700000000020, input_tokens: 0, output_tokens: 0, model: 'sk-private-CANARY' })
    expect((await send(second)).status).toBe(200)
    expect(store.list()[0].model).toBe('other')
    expect(store.summary(id).unknown_usage).toBe(1)
    const failure = event({ ended_at: 1700000000030, kind: 'request_error', outcome: 'error', status_code: 429, retry_count: 1 })
    expect((await send(failure)).status).toBe(200)
    expect(store.summary(id).failures).toBe(1)
    expect(JSON.stringify(store.list())).not.toContain('CANARY')
    store.revoke(id)
    expect((await send(event())).status).toBe(401)
    expect(() => store.ingest(validateHermes(event(), id))).toThrow('credential_revoked')
    db.close()
})
test('Python and TypeScript use the same canonical identity and metadata boundary', () => {
    const script = `import json\nfrom atflows.integrations.hermes.observer import normalize\nc={'token':'${token}','connection_id':'${id}'}\ne=normalize(c,'post_api_request',{'session_id':'private-session','api_request_id':'private-request','started_at':1700000000,'ended_at':1700000000.01,'model':'sk-canary','provider':'ollama','usage':{'prompt_tokens':0,'output_tokens':0},'response':'RAW-CANARY'})\nprint(json.dumps(e))`
    const result = Bun.spawnSync(['python3', '-c', script], { cwd: path.resolve(import.meta.dir, '../../..') })
    expect(result.exitCode).toBe(0)
    const e = JSON.parse(result.stdout.toString())
    expect(e.event_id).toBe(eventIdentity(e))
    expect(validateHermes(e, id).input_tokens).toBe(0)
    expect(JSON.stringify(e)).not.toContain('private-session')
    expect(JSON.stringify(e)).not.toContain('CANARY')
})
test('setup is scoped, preview-guarded, idempotent and reversible without changing providers', () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-hermes-test-')))
    const home = path.join(root, 'home'), data = path.join(root, 'data')
    fs.mkdirSync(home, { mode: 0o700 }); fs.mkdirSync(data, { mode: 0o700 })
    const config = path.join(home, 'config.yaml')
    const before = '# preserve on undo\nmodel: local-model\nmemory:\n  provider: atmem\nplugins:\n  enabled: [other]\n'
    fs.writeFileSync(config, before, { mode: 0o600 })
    const { db, store } = fixture(), endpoint = 'http://127.0.0.1:1337'
    try {
        expect(hermesStatus(store, endpoint, home).state).toBe('not_configured')
        const stale = previewHermes(data, endpoint, home)
        fs.appendFileSync(config, '\n# changed\n')
        expect(() => applyHermes(store, data, stale.preview_id)).toThrow('config_changed')
        fs.writeFileSync(config, before)
        const preview = previewHermes(data, endpoint, home)
        expect(JSON.stringify(preview)).not.toContain('token')
        expect(applyHermes(store, data, preview.preview_id).state).toBe('awaiting_traffic')
        const applied = fs.readFileSync(config, 'utf8')
        const parsed: any = Bun.YAML.parse(applied)
        expect(parsed.model).toBe('local-model'); expect(parsed.memory.provider).toBe('atmem')
        expect(parsed.plugins.enabled).toEqual(['other', 'atflows'])
        expect(hermesStatus(store, endpoint, home).state).toBe('awaiting_traffic')
        expect(hermesStatus(store, 'http://127.0.0.1:1338', home).state).toBe('endpoint_stale')
        expect(applyHermes(store, data, previewHermes(data, endpoint, home).preview_id).state).toBe('already_configured')
        fs.appendFileSync(config, '\n# user edit\n')
        expect(() => undoHermes(store, data, home)).toThrow('config_changed')
        fs.writeFileSync(config, applied)
        expect(undoHermes(store, data, home).undone).toBe(true)
        expect(fs.readFileSync(config, 'utf8')).toBe(before)
        expect(hermesStatus(store, endpoint, home).state).toBe('not_configured')
    } finally { db.close(); fs.rmSync(root, { recursive: true }) }
})

test('setup refuses symlinks, expired plans, denied plugins, complex YAML and locks; profiles stay separate', () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-guards-')))
    const data = path.join(root, 'data'), home = path.join(root, 'home'), second = path.join(root, 'second')
    for (const dir of [data, home, second]) fs.mkdirSync(dir, { mode: 0o700 })
    const before = 'model: unchanged\ncustom_flag: yes\ncustom_date: 2026-09-27\nplugins:\n  clone_timeout_seconds: 45\n'
    const config = path.join(home, 'config.yaml'), endpoint = 'http://127.0.0.1:1337'
    fs.writeFileSync(config, before, { mode: 0o600 }); fs.writeFileSync(path.join(second, 'config.yaml'), before, { mode: 0o600 })
    const { db, store } = fixture()
    try {
        fs.symlinkSync(home, path.join(root, 'alias'))
        expect(() => previewHermes(data, endpoint, path.join(root, 'alias'))).toThrow()
        fs.writeFileSync(config, 'plugins: {enabled: []}\n')
        expect(() => previewHermes(data, endpoint, home)).toThrow('complex_yaml')
        fs.writeFileSync(config, 'plugins:\n  disabled: [atflows]\n')
        expect(() => previewHermes(data, endpoint, home)).toThrow('explicitly_disabled')
        fs.writeFileSync(config, before)
        const expired = previewHermes(data, endpoint, home)
        const record = path.join(data, 'hermes-setup', `${expired.preview_id}.preview`)
        const plan = JSON.parse(fs.readFileSync(record, 'utf8')); plan.expires_at = 1
        fs.writeFileSync(record, JSON.stringify(plan))
        expect(() => applyHermes(store, data, expired.preview_id)).toThrow('preview_expired')
        const preview = previewHermes(data, endpoint, home)
        const lock = path.join(home, '.atflows-setup.lock'); fs.writeFileSync(lock, '', { mode: 0o600 })
        expect(() => applyHermes(store, data, preview.preview_id)).toThrow('setup_locked')
        fs.unlinkSync(lock)
        const one = applyHermes(store, data, preview.preview_id)
        const two = applyHermes(store, data, previewHermes(data, endpoint, second).preview_id)
        expect(one.connection_id).not.toBe(two.connection_id)
        expect(fs.readFileSync(config, 'utf8').replace('  enabled: ["atflows"]\n', '')).toBe(before)
        const c1 = JSON.parse(fs.readFileSync(path.join(home, 'plugins/atflows/connection.json'), 'utf8'))
        const c2 = JSON.parse(fs.readFileSync(path.join(second, 'plugins/atflows/connection.json'), 'utf8'))
        expect(c1.token).not.toBe(c2.token)
        expect(() => validateHermes(event({ connection_id: c2.connection_id }), c1.connection_id)).toThrow()
        fs.writeFileSync(path.join(home, 'plugins/atflows/.status-00000000-0000-4000-8000-000000000001'), '', { mode: 0o600 })
        undoHermes(store, data, home)
        expect(store.authenticate(c1.token)).toBeNull()
        expect(store.authenticate(c2.token)).toBe(c2.connection_id)
        undoHermes(store, data, second)
    } finally { db.close(); fs.rmSync(root, { recursive: true }) }
})

test('CLI rejects a receiver backed by another database before configuring Hermes', async () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-cli-')))
    const home = path.join(root, 'home'); fs.mkdirSync(home, { mode: 0o700 })
    fs.writeFileSync(path.join(home, 'config.yaml'), 'model: unchanged\n', { mode: 0o600 })
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => Response.json({ hermes_database_id: 'different' }) })
    try {
        const child = Bun.spawn(['bun', 'run', 'packages/integrations/src/hermes-cli.ts', 'preview', '--endpoint', `http://127.0.0.1:${server.port}`, '--home', home], {
            cwd: path.resolve(import.meta.dir, '../../..'), env: { ...process.env, DATA_DIR: root, DB_PATH: path.join(root, 'data.db') }, stdout: 'pipe', stderr: 'pipe',
        })
        const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
        expect(code).toBe(1)
        expect(stderr).toContain('receiver_database_mismatch')
        expect(fs.existsSync(path.join(home, 'plugins'))).toBe(false)
    } finally { server.stop(true); fs.rmSync(root, { recursive: true }) }
})

test('additive upgrade preserves existing WAL data and a legacy reader; repeated startup is idempotent', () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-upgrade-')))
    const file = path.join(root, 'existing.db'), old = new Database(file), next = new Database(file)
    try {
        old.exec('PRAGMA journal_mode=WAL')
        old.exec('CREATE TABLE traces (id TEXT PRIMARY KEY, value TEXT)')
        old.query('INSERT INTO traces VALUES (?, ?)').run('existing', 'preserve')
        old.exec('BEGIN')
        expect(old.query('SELECT value FROM traces').get()).toEqual({ value: 'preserve' })
        const first = new HermesStore(next).databaseId()
        expect(new HermesStore(next).databaseId()).toBe(first)
        expect(old.query('SELECT value FROM traces').get()).toEqual({ value: 'preserve' })
        old.exec('COMMIT')
        expect(old.query('SELECT count(*) AS n FROM hermes_events').get()).toEqual({ n: 0 })
        old.exec('BEGIN IMMEDIATE')
        old.query('INSERT INTO traces VALUES (?, ?)').run('concurrent-write', 'preserve-too')
        expect(new HermesStore(next).databaseId()).toBe(first)
        old.exec('COMMIT')
        expect(next.query('PRAGMA quick_check').get()).toEqual({ quick_check: 'ok' })
    } finally { old.close(); next.close(); fs.rmSync(root, { recursive: true }) }
})
