const assert = require('node:assert/strict')
const { processOtlpLogs } = require('@atflows/otlp/logs')
const db = require('@atflows/db')

const eventName = `codex.timestamp.fallback.${crypto.randomUUID()}`
const observedMs = Date.now()
const result = processOtlpLogs({
    resourceLogs: [{
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'codex_cli_rs' } }] },
        scopeLogs: [{
            logRecords: [{
                timeUnixNano: '0',
                observedTimeUnixNano: String(BigInt(observedMs) * 1000000n),
                body: { stringValue: 'timestamp fallback test' },
                attributes: [{ key: 'event.name', value: { stringValue: eventName } }],
            }],
        }],
    }],
})

assert.equal(result.accepted, 1)
const row = db.getLogs({ limit: 1, filters: { event_name: eventName } }).at(0)
assert.equal(row.timestamp, observedMs)
assert.equal(row.observed_timestamp, observedMs)
console.log('✓ OTLP log with zero event time uses observed time')
