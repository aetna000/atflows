import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

// Set these before loading the product: never open the operator's real database.
const directory = mkdtempSync(join(tmpdir(), 'atflows-continuity-test-'))
process.env.DATA_DIR = directory
process.env.DB_PATH = join(directory, 'fixture.db')
// https.get rejects this scheme before network I/O; bundled prices stay fixed.
process.env.PRICING_URL = 'disabled:continuity-fixture'
const require = createRequire(new URL('../../apps/server/package.json', import.meta.url))
const { processOtlpTraces, transformSpan } = require('@atflows/otlp/traces')
const db = require('@atflows/db')
if (db.DB_PATH !== process.env.DB_PATH)
    throw new Error('Refusing to use a cached non-fixture database')
const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/receipt.json', import.meta.url), 'utf8'),
)
const span = () => structuredClone(fixture.resourceSpans[0].scopeSpans[0].spans[0])

describe('frozen current-product capabilities, not desired future behavior', () => {
    test('explicit identities survive as unvalidated custom attributes', () => {
        const transformed = transformSpan(span(), {}, {})
        expect(transformed.session_id).toBe('workflow-1')
        expect(transformed.attributes['continuity.logical_operation_id']).toBe('operation-1')
        expect(transformed.attributes['continuity.run_id']).toBe('run-2')
        expect(transformed.attributes['continuity.attempt_id']).toBe('attempt-2')
    })

    test('missing usage and cost currently become zero: documented gap', () => {
        const transformed = transformSpan(span(), {}, {})
        expect(transformed.total_tokens).toBe(0)
        expect(transformed.estimated_cost).toBe(0)
        expect(transformed.attributes['gen_ai.usage.input_tokens']).toBeUndefined()
    })

    test('unknown model receives heuristic pricing, not unknown: documented gap', () => {
        const value = span()
        value.attributes.push(
            { key: 'gen_ai.request.model', value: { stringValue: 'unknown-continuity-model' } },
            { key: 'gen_ai.usage.input_tokens', value: { intValue: '1000' } },
        )
        const transformed = transformSpan(value, {}, {})
        expect(transformed.estimated_cost).toBe(0.001)
    })

    test('identical duplicates reject rather than acknowledge idempotent ingest', () => {
        expect(processOtlpTraces(fixture).accepted).toBe(1)
        const duplicate = processOtlpTraces(fixture)
        expect(duplicate.accepted).toBe(0)
        expect(duplicate.rejected).toBe(1)
        const stored = db.getTraceById('2222222222222222')
        expect(JSON.parse(stored.attributes)['continuity.charge_id']).toBe('charge-2')
    })

    test('resource attributes can overwrite scope attribute: not authenticated authority', () => {
        const transformed = transformSpan(span(), { 'continuity.scope_id': 'scope-b' }, {})
        expect(transformed.attributes['continuity.scope_id']).toBe('scope-b')
    })

    test('retry and recovery remain tags, no typed charge accounting', () => {
        const transformed = transformSpan(span(), {}, {})
        expect(transformed.attributes['continuity.retry']).toBe(true)
        expect(transformed.attributes['continuity.recovery']).toBe(true)
        expect(transformed.charge_id).toBeUndefined()
        expect(transformed.outcome_verified).toBeUndefined()
    })
})
