import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import { continuityStore } from '../../packages/db/src/continuity'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('production startup waits for an existing writer before continuity schema creation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'atflows-startup-lock-'))
    const filename = join(directory, 'data.db')
    const writer = new Database(filename)
    writer.exec('PRAGMA journal_mode=WAL; CREATE TABLE retained(id INTEGER); BEGIN IMMEDIATE')
    const entry = new URL('../../packages/db/src/index.ts', import.meta.url).href
    const child = Bun.spawn([process.execPath, '--eval', `await import(${JSON.stringify(entry)}); process.exit(0)`], {
        env: { ...process.env, DATA_DIR: directory, DB_PATH: filename },
        stdout: 'pipe', stderr: 'pipe',
    })
    try {
        await Bun.sleep(500)
        writer.exec('COMMIT')
        const exit = await child.exited
        const stderr = await new Response(child.stderr).text()
        if (exit !== 0) throw new Error(`Startup child exited ${exit}: ${stderr}`)
        expect(exit).toBe(0)
        expect(writer.query("SELECT name FROM sqlite_master WHERE name='continuity_events'").get()).not.toBeNull()
    } finally {
        child.kill()
        writer.close()
    }
})

const event = { format: 'atmem.continuity.v1', event_id: 'e1', workflow_id: 'w1', operation_id: 'o1', run_id: 'r1', attempt_id: 'a1', event: 'execute', time: 1000 }

test('normal production storage retains scoped events and rejects conflicting duplicates', () => {
    const db = new Database(':memory:')
    const store = continuityStore(db)
    expect(store.ingest('alice', event).replayed).toBe(false)
    expect(store.ingest('alice', event).replayed).toBe(true)
    expect(() => store.ingest('alice', { ...event, event: 'completed' })).toThrow('Conflicting')
    expect(store.view('bob').workflows).toEqual([])
    expect(store.view('alice').workflows[0].unknown_cost_attempts).toBe(1)
    db.close()
})

test('additive initialization preserves old records and cost overflow is explicit', () => {
    const db = new Database(':memory:')
    db.exec('CREATE TABLE legacy_fixture (id TEXT PRIMARY KEY, value TEXT); INSERT INTO legacy_fixture VALUES (\'old\',\'keep\')')
    const store = continuityStore(db)
    continuityStore(db)
    expect(db.query('SELECT value FROM legacy_fixture WHERE id=?').get('old')).toEqual({ value: 'keep' })
    store.ingest('local', { ...event, charge_id: 'huge', charge_source: 'source', price_source: 'test', cost_microusd: Number.MAX_SAFE_INTEGER })
    store.ingest('local', { ...event, event_id: 'e2', charge_id: 'another', charge_source: 'source', price_source: 'test', cost_microusd: 1 })
    expect(() => store.view('local')).toThrow('exact numeric range')
    db.close()
})

test('cost is known sum plus unknown attempts and overlap counts once', () => {
    const db = new Database(':memory:')
    const store = continuityStore(db)
    store.ingest('local', event)
    const priced = { ...event, event_id: 'e2', event: 'completed', charge_id: 'c1', charge_source: 'provider', cost_microusd: 420000, price_source: 'version-1', retry: true, recovery: true }
    store.ingest('local', priced)
    store.ingest('local', { ...priced, event_id: 'e3' })
    store.ingest('local', { ...event, event_id: 'e4', attempt_id: 'a2', run_id: 'r2' })
    const view = store.view('local').workflows[0]
    expect(view.known_cost_microusd).toBe(420000)
    expect(view.known_retry_cost_microusd).toBe(420000)
    expect(view.known_recovery_cost_microusd).toBe(420000)
    expect(view.known_extra_cost_microusd).toBe(420000)
    expect(view.unknown_cost_attempts).toBe(1)
    expect(view.retries).toBe(1)
    expect(view.recovery_attempts).toBe(1)
    expect(view.runs).toBe(2)
    db.close()
})

test('no plaintext receipt fields or invented charge amounts', () => {
    const db = new Database(':memory:')
    const store = continuityStore(db)
    expect(() => store.ingest('local', { ...event, receipt: 'private' })).toThrow()
    expect(() => store.ingest('local', { ...event, cost_microusd: 10 })).toThrow()
    expect(() => store.ingest('local', { ...event, cost_microusd: -1 })).toThrow()
    db.close()
})

test('partial prices remain unknown and charges cannot move across attempts', () => {
    const db = new Database(':memory:')
    const store = continuityStore(db)
    const priced = { ...event, charge_id: 'c1', charge_source: 'provider', cost_microusd: 10, price_source: 'rate-v1' }
    store.ingest('alice', priced)
    store.ingest('alice', { ...event, event_id: 'e2', charge_id: 'c2', charge_source: 'provider' })
    expect(store.view('alice').workflows[0].unknown_cost_attempts).toBe(1)
    expect(store.view('alice').workflows[0].unpriced_charges).toBe(1)
    expect(() => store.ingest('alice', { ...priced, event_id: 'e3', attempt_id: 'a2' })).toThrow('another attempt')
    expect(() => store.ingest('alice', { ...priced, event_id: 'e4', cost_microusd: 20 })).toThrow('Conflicting charge')
    expect(() => store.ingest('alice', { ...event, event_id: 'e5', workflow_id: 'w2' })).toThrow('Conflicting attempt')
    expect(() => store.ingest('alice', { ...event, event_id: 'e6', charge_id: 'c3' })).toThrow('requires a source')
    store.ingest('bob', { ...priced, cost_microusd: 99 })
    expect(store.view('alice').workflows[0].known_cost_microusd).toBe(10)
    expect(store.view('bob').workflows[0].known_cost_microusd).toBe(99)
    expect(store.view('alice').workflows[0].events.length).toBe(2)
    store.ingest('alice', { ...priced, event_id: 'e7', charge_id: 'c2', cost_microusd: 5 })
    expect(store.view('alice').workflows[0].unknown_cost_attempts).toBe(0)
    expect(store.view('alice').workflows[0].known_cost_microusd).toBe(15)
    db.close()
})
