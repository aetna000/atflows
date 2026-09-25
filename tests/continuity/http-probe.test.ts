import { expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))

test('current server records delivered spans, rejects replay, and cannot observe a dropped span', () => {
    const parent = mkdtempSync(join(tmpdir(), 'atflows-http-continuity-'))
    const output = join(parent, 'probe')
    const payload = JSON.parse(
        readFileSync(join(root, 'tests/continuity/fixtures/receipt.json'), 'utf8'),
    )
    const dropped = structuredClone(payload)
    dropped.resourceSpans[0].scopeSpans[0].spans[0].spanId = '3333333333333333'
    const result = Bun.spawnSync({
        cmd: [
            process.execPath,
            '--no-env-file',
            join(root, 'tests/continuity/http-probe.ts'),
            output,
        ],
        cwd: parent,
        env: { PATH: process.env.PATH || '' },
        stdin: Buffer.from(
            JSON.stringify({
                requests: [
                    { action: 'deliver', payload },
                    { action: 'deliver', payload },
                    { action: 'drop', payload: dropped },
                ],
            }),
        ),
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 45000,
    })
    expect(result.exitCode).toBe(0)
    const observed = JSON.parse(readFileSync(join(output, 'observations.json'), 'utf8'))
    expect(observed.responses[0]).toEqual({ status: 200, body: {} })
    expect(observed.responses[1].body.partialSuccess.rejectedSpans).toBe(1)
    expect(observed.responses[2].disposition).toBe('intentionally_not_sent')
    expect(observed.rows.length).toBe(1)
    expect(observed.rows[0].total_tokens).toBe(0)
    expect(observed.rows[0].estimated_cost).toBe(0)
    expect(observed.guarded_egress_attempts_detected).toBe(0)
    expect(existsSync(join(output, 'fixture.db'))).toBe(true)
}, 50000)

test.each([
    "await fetch('https://example.invalid/');",
    "require('node:https').get('https://example.invalid/');",
    "require('node:net').connect({ host: 'example.invalid', port: 443 });",
    "require('node:os').homedir();",
])('test-only preload denies external or home fallback: %s', (code) => {
    const directory = mkdtempSync(join(tmpdir(), 'atflows-egress-test-'))
    const report = join(directory, 'denied.txt')
    const result = Bun.spawnSync({
        cmd: [
            process.execPath,
            '--no-env-file',
            '--preload',
            join(root, 'tests/continuity/offline-preload.cjs'),
            '-e',
            code,
        ],
        cwd: directory,
        env: { PATH: process.env.PATH || '', CONTINUITY_GUARD_REPORT: report },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 10000,
    })
    expect(result.exitCode).not.toBe(0)
    expect(readFileSync(report, 'utf8')).toContain('_denied')
})
