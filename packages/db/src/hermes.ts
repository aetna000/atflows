import type { Database } from 'bun:sqlite'
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto'
const { safeLabel } = require('../../shared/src/redact.js')

export const HERMES_FORMAT = 'atflows.hermes.v1'
const fields = ['format', 'connection_id', 'event_id', 'session_id', 'task_id', 'turn_id', 'request_id', 'tool_id', 'kind', 'started_at', 'ended_at', 'retry_count', 'model', 'provider', 'tool', 'outcome', 'status_code', 'input_tokens', 'output_tokens', 'dropped_total']
const identities = ['session_id', 'task_id', 'turn_id', 'request_id', 'tool_id']
const hex = /^[a-f0-9]{64}$/
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export class HermesConflict extends Error {}

export function eventIdentity(e: Record<string, any>): string {
    return digest(JSON.stringify([e.connection_id, ...identities.map(k => e[k]), e.kind, e.started_at, e.ended_at, e.retry_count]))
}

export function validateHermes(value: unknown, connection: string): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_event')
    const e = value as Record<string, any>
    if (Object.keys(e).some(k => !fields.includes(k)) || fields.some(k => !Object.hasOwn(e, k))) throw Error('invalid_fields')
    if (e.format !== HERMES_FORMAT || e.connection_id !== connection) throw Error('unsupported_contract')
    if (!['request', 'request_error', 'tool', 'diagnostic'].includes(e.kind)) throw Error('invalid_kind')
    if (!['ok', 'error', 'unknown'].includes(e.outcome)) throw Error('invalid_outcome')
    if ((e.kind === 'request' && e.outcome !== 'ok') || (e.kind === 'request_error' && e.outcome !== 'error')) throw Error('invalid_outcome')
    for (const key of identities) if (e[key] !== null && (typeof e[key] !== 'string' || !hex.test(e[key]))) throw Error('invalid_identity')
    for (const key of ['started_at', 'ended_at', 'dropped_total']) {
        if (!Number.isSafeInteger(e[key]) || e[key] < 0) throw Error('invalid_number')
    }
    if (e.ended_at < e.started_at || e.ended_at > Date.now() + 86400000 || e.dropped_total > 1e9) throw Error('invalid_time')
    for (const key of ['retry_count', 'input_tokens', 'output_tokens', 'status_code']) {
        if (e[key] !== null && (!Number.isSafeInteger(e[key]) || e[key] < 0 || e[key] > 1e9)) throw Error('invalid_usage')
    }
    if (e.status_code !== null && (e.status_code < 100 || e.status_code > 599)) throw Error('invalid_status')
    if ((e.kind === 'request' || e.kind === 'request_error') && !e.request_id) throw Error('missing_request_identity')
    if (e.kind === 'tool' && !e.tool_id) throw Error('missing_tool_identity')
    if (e.kind !== 'request' && (e.input_tokens !== null || e.output_tokens !== null)) throw Error('unexpected_usage')
    if (e.event_id !== eventIdentity(e)) throw Error('invalid_event_identity')
    const providers = ['openai', 'anthropic', 'openrouter', 'ollama', 'custom', 'google', 'nous', 'other']
    return { ...e, model: safeLabel(e.model), tool: safeLabel(e.tool), provider: providers.includes(e.provider) ? e.provider : 'other' }
}

export class HermesStore {
    constructor(private db: Database) {
        const objects = new Set((db.query("SELECT name FROM sqlite_master WHERE name LIKE 'hermes_%' OR name LIKE 'idx_hermes_%'").all() as { name: string }[]).map(row => row.name))
        if (['hermes_connections', 'hermes_events', 'hermes_database_identity', 'idx_hermes_events_connection', 'idx_hermes_events_timestamp'].every(name => objects.has(name)) &&
            db.query('SELECT id FROM hermes_database_identity WHERE singleton=1').get()) return
        const migration = [
            `CREATE TABLE IF NOT EXISTS hermes_connections (
            id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, profile_id TEXT NOT NULL,
            created_at INTEGER NOT NULL, revoked_at INTEGER
        )`,
            `CREATE TABLE IF NOT EXISTS hermes_events (
            id TEXT PRIMARY KEY, connection_id TEXT NOT NULL, timestamp INTEGER NOT NULL,
            session_id TEXT, kind TEXT NOT NULL, payload TEXT NOT NULL
        )`,
            'CREATE INDEX IF NOT EXISTS idx_hermes_events_connection ON hermes_events(connection_id, timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_hermes_events_timestamp ON hermes_events(timestamp DESC)',
            'CREATE TABLE IF NOT EXISTS hermes_database_identity (singleton INTEGER PRIMARY KEY CHECK(singleton=1), id TEXT NOT NULL)',
        ]
        db.transaction(() => {
            for (const statement of migration) db.exec(statement)
            db.query('INSERT OR IGNORE INTO hermes_database_identity VALUES (1, ?)').run(randomUUID())
        }).immediate()
    }
    databaseId() { return (this.db.query('SELECT id FROM hermes_database_identity WHERE singleton=1').get() as { id: string }).id }
    provision(id: string, token: string, profile: string) {
        this.db.query('INSERT INTO hermes_connections VALUES (?, ?, ?, ?, NULL)').run(id, digest(token), profile, Date.now())
    }
    revoke(id: string) { this.db.query('UPDATE hermes_connections SET revoked_at=? WHERE id=?').run(Date.now(), id) }
    authenticate(token: string): string | null {
        if (!/^[a-f0-9]{64}$/.test(token)) return null
        const hash = digest(token)
        const row = this.db.query('SELECT id, token_hash FROM hermes_connections WHERE token_hash=? AND revoked_at IS NULL').get(hash) as any
        return row && timingSafeEqual(Buffer.from(row.token_hash), Buffer.from(hash)) ? row.id : null
    }
    ingest(e: Record<string, any>) {
        const payload = JSON.stringify(fields.map(k => e[k]))
        return this.db.transaction(() => {
            if (!this.db.query('SELECT id FROM hermes_connections WHERE id=? AND revoked_at IS NULL').get(e.connection_id)) throw Error('credential_revoked')
            const prior = this.db.query('SELECT payload FROM hermes_events WHERE id=?').get(e.event_id) as any
            if (prior) {
                if (prior.payload !== payload) throw new HermesConflict('conflicting_event')
                return { accepted: true, duplicate: true }
            }
            this.db.query('INSERT INTO hermes_events VALUES (?, ?, ?, ?, ?, ?)').run(e.event_id, e.connection_id, e.ended_at, e.session_id, e.kind, payload)
            this.db.query('DELETE FROM hermes_events WHERE id IN (SELECT id FROM hermes_events ORDER BY timestamp DESC LIMIT -1 OFFSET 10000)').run()
            return { accepted: true, duplicate: false }
        })()
    }
    list(connection?: string, limit = 100) {
        const rows = this.db.query(`SELECT payload FROM hermes_events ${connection ? 'WHERE connection_id=?' : ''} ORDER BY timestamp DESC LIMIT ?`).all(...(connection ? [connection, limit] : [limit])) as any[]
        return rows.map(row => Object.fromEntries(JSON.parse(row.payload).map((value: any, i: number) => [fields[i], value])))
    }
    summary(connection: string) {
        const events = this.list(connection, 10000)
        const calls = events.filter(e => ['request', 'request_error'].includes(e.kind))
        return { retained_events: events.length, calls: calls.length, failures: calls.filter(e => e.kind === 'request_error').length,
            tools: events.filter(e => e.kind === 'tool').length, last_event: events[0]?.ended_at || null,
            input_tokens: calls.reduce((n, e) => n + (e.input_tokens ?? 0), 0), output_tokens: calls.reduce((n, e) => n + (e.output_tokens ?? 0), 0),
            unknown_usage: calls.filter(e => e.input_tokens === null || e.output_tokens === null).length,
            known_cost_microusd: 0, unknown_cost: calls.length,
            dropped_total: Math.max(0, ...events.map(e => e.dropped_total)),
            sessions: [...new Set(events.map(e => e.session_id).filter(Boolean))].length }
    }
}
