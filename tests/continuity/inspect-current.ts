import { existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createRequire } from 'node:module'

// An explicit fresh fixture directory is mandatory; no user-config defaults.
const argument = process.argv[2]
if (!argument)
    throw new Error('Usage: bun tests/continuity/inspect-current.ts FRESH_OUTPUT_DIR < OTLP.json')
const directory = resolve(argument)
if (existsSync(directory)) throw new Error('Refusing to reuse an existing output directory')
mkdirSync(directory)
process.env.DATA_DIR = directory
process.env.DB_PATH = join(directory, 'fixture.db')
process.env.PRICING_URL = 'disabled:continuity-fixture'
const require = createRequire(new URL('../../apps/server/package.json', import.meta.url))
const { processOtlpTraces } = require('@atflows/otlp/traces')
const db = require('@atflows/db')
if (db.DB_PATH !== process.env.DB_PATH)
    throw new Error('Refusing to use a cached non-fixture database')
const payload = JSON.parse(await Bun.stdin.text())
const first = processOtlpTraces(payload)
const replay = processOtlpTraces(payload)
const ids = payload.resourceSpans.flatMap((r: any) =>
    (r.scopeSpans || []).flatMap((s: any) => (s.spans || []).map((span: any) => span.spanId)),
)
const output = {
    evidence_level: 'smoke',
    boundary: 'in-process OTLP ingest, not authenticated HTTP',
    pricing: 'bundled fallback; network disabled',
    first,
    replay,
    rows: ids.map((id: string) => db.getTraceById(id)),
}
await Bun.write(join(directory, 'observations.json'), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify(output))
process.exit(first.rejected ? 1 : 0)
