import type { Database } from 'bun:sqlite'

export class ContinuityConflict extends Error {}

const ids = ['event_id', 'workflow_id', 'operation_id', 'run_id', 'attempt_id']
const allowed = new Set(['format', ...ids, 'event', 'time', 'retry', 'recovery', 'charge_id', 'charge_source', 'cost_microusd', 'input_tokens', 'output_tokens', 'price_source'])
const events = new Set(['execute', 'query', 'completed', 'unknown', 'blocked', 'abandoned', 'usage'])

function exactSum(values: number[]): number {
    let sum = 0
    for (const value of values) {
        sum += value
        if (!Number.isSafeInteger(sum)) throw new Error('Reported cost exceeds exact numeric range')
    }
    return sum
}

function labelledCost(workflow: any, label: string): number {
    const keys = new Set<string>()
    for (const attempt of workflow.attempts.values()) {
        if (label === 'extra' ? attempt.retry || attempt.recovery : attempt[label]) {
            for (const key of attempt.charges) keys.add(key)
        }
    }
    return exactSum([...keys].map(key => workflow.charges.get(key) || 0))
}

export function validateContinuity(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Event object required')
    const event = value as Record<string, any>
    if (Object.keys(event).some(key => !allowed.has(key))) throw new Error('Unexpected continuity field')
    if (event.format !== 'atmem.continuity.v1' || !events.has(event.event)) throw new Error('Unsupported continuity event')
    for (const key of ids) if (typeof event[key] !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(event[key])) throw new Error('Opaque event identities required')
    if (!Number.isFinite(event.time) || event.time < 0 || event.time > 253402300799) throw new Error('Valid Unix-seconds event time required')
    for (const key of ['retry', 'recovery']) if (key in event && typeof event[key] !== 'boolean') throw new Error('Invalid attempt label')
    for (const key of ['cost_microusd', 'input_tokens', 'output_tokens']) {
        if (event[key] != null && (!Number.isSafeInteger(event[key]) || event[key] < 0)) throw new Error('Invalid usage or price')
    }
    for (const key of ['charge_id', 'charge_source', 'price_source']) {
        if (key in event && (typeof event[key] !== 'string' || !event[key] || event[key].length > (key === 'charge_source' ? 128 : 256))) throw new Error('Invalid accounting provenance')
    }
    if (event.cost_microusd != null && (!event.charge_id || !event.charge_source || !event.price_source)) throw new Error('Known price requires charge identity and provenance')
    if (!!event.charge_id !== !!event.charge_source) throw new Error('Charge identity requires a source')
    return Object.fromEntries(Object.keys(event).sort().map(key => [key, event[key]]))
}

export function continuityStore(db: Database) {
    db.exec(`CREATE TABLE IF NOT EXISTS continuity_events (
        scope TEXT NOT NULL, event_id TEXT NOT NULL, body TEXT NOT NULL,
        received_at INTEGER NOT NULL, PRIMARY KEY(scope, event_id)
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS continuity_attempt ON continuity_events(scope,json_extract(body,'$.attempt_id'));
        CREATE INDEX IF NOT EXISTS continuity_charge ON continuity_events(scope,json_extract(body,'$.charge_source'),json_extract(body,'$.charge_id'));`)
    const read = (scope: string) => (db.query('SELECT body FROM continuity_events WHERE scope=? ORDER BY received_at,event_id').all(scope) as {body: string}[]).map(row => JSON.parse(row.body))
    return {
        ingest(scope: string, input: unknown) {
            if (!scope) throw new Error('Authenticated scope required')
            const event = validateContinuity(input)
            const body = JSON.stringify(event)
            return db.transaction(() => {
                const old = db.query('SELECT body FROM continuity_events WHERE scope=? AND event_id=?').get(scope, event.event_id) as {body: string} | null
                if (old) {
                    if (old.body !== body) throw new ContinuityConflict('Conflicting duplicate event')
                    return { accepted: true, replayed: true }
                }
                const candidates = db.query(`SELECT body FROM continuity_events WHERE scope=? AND
                    (json_extract(body,'$.attempt_id')=? OR
                    (json_extract(body,'$.charge_source')=? AND json_extract(body,'$.charge_id')=?))`)
                    .all(scope, event.attempt_id, event.charge_source || '', event.charge_id || '') as {body: string}[]
                for (const candidate of candidates) {
                    const prior = JSON.parse(candidate.body)
                    if (prior.attempt_id === event.attempt_id && (prior.workflow_id !== event.workflow_id || prior.operation_id !== event.operation_id || prior.run_id !== event.run_id)) throw new ContinuityConflict('Conflicting attempt identity')
                    if (event.charge_id && prior.charge_id === event.charge_id && prior.charge_source === event.charge_source && prior.attempt_id !== event.attempt_id) throw new ContinuityConflict('Charge already assigned to another attempt')
                    if (event.charge_id && prior.charge_id === event.charge_id && prior.charge_source === event.charge_source && prior.cost_microusd != null && event.cost_microusd != null && prior.cost_microusd !== event.cost_microusd) throw new ContinuityConflict('Conflicting charge amount')
                }
                db.query('INSERT INTO continuity_events VALUES(?,?,?,?)').run(scope, event.event_id, body, Date.now())
                return { accepted: true, replayed: false }
            }).immediate()
        },
        view(scope: string) {
            const rows = read(scope)
            const workflows = new Map<string, any>()
            for (const row of rows) {
                if (!workflows.has(row.workflow_id)) workflows.set(row.workflow_id, { workflow_id: row.workflow_id, events: [], runs: new Set(), attempts: new Map(), charges: new Map() })
                const w = workflows.get(row.workflow_id)
                w.events.push(row)
                w.runs.add(row.run_id)
                const a = w.attempts.get(row.attempt_id) || { retry: false, recovery: false, charges: new Set() }
                a.retry ||= row.retry === true
                a.recovery ||= row.recovery === true
                if (row.charge_id) a.charges.add(JSON.stringify([row.charge_source, row.charge_id]))
                w.attempts.set(row.attempt_id, a)
                if (row.charge_id && row.cost_microusd != null) w.charges.set(JSON.stringify([row.charge_source, row.charge_id]), row.cost_microusd)
            }
            return { format: 'atflows-continuity-view-v1', workflows: [...workflows.values()].map(w => ({
                workflow_id: w.workflow_id, runs: w.runs.size, attempts: w.attempts.size,
                retries: [...w.attempts.values()].filter((a: any) => a.retry).length,
                recovery_attempts: [...w.attempts.values()].filter((a: any) => a.recovery).length,
                known_cost_microusd: exactSum([...w.charges.values()]),
                known_retry_cost_microusd: labelledCost(w, 'retry'),
                known_recovery_cost_microusd: labelledCost(w, 'recovery'),
                known_extra_cost_microusd: labelledCost(w, 'extra'),
                unknown_cost_attempts: [...w.attempts.values()].filter((a: any) => !a.charges.size || [...a.charges].some(key => !w.charges.has(key))).length,
                unpriced_charges: [...w.attempts.values()].reduce((n: number, a: any) => n + [...a.charges].filter(key => !w.charges.has(key)).length, 0),
                cost_coverage: 'reported_charges_only_not_a_complete_invoice',
                coverage: 'received_events_only', events: w.events,
            })) }
        },
    }
}
