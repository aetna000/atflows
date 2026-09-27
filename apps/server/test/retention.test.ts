import { expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

test('metric retention prunes a batch at the cap and stays bounded', async () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-retention-')))
    const script = `
        import * as db from './packages/db/src/index.ts'
        for (let index = 0; index < 4; index += 1) {
            db.insertMetric({ id: String(index), timestamp: index, name: 'fixture', metric_type: 'gauge', value_int: index })
        }
        const firstSummary = db.getMetricsSummary({})
        db.insertMetric({ id: '4', timestamp: 4, name: 'new-after-cache', metric_type: 'gauge', value_int: 4 })
        const cachedSummary = db.getMetricsSummary({})
        console.log(JSON.stringify({ count: db.getMetricCount(), ids: db.getMetrics({ limit: 10, offset: 0, filters: {} }).map(row => row.id).sort(), firstSummary, cachedSummary }))
    `
    try {
        const child = Bun.spawn(['bun', '-e', script], {
            cwd: path.resolve(import.meta.dir, '../../..'),
            env: {
                ...process.env,
                DATA_DIR: root,
                MAX_METRICS: '3',
                RETENTION_PRUNE_BATCH: '2',
            },
            stdout: 'pipe',
            stderr: 'pipe',
        })
        const [exitCode, stdout, stderr] = await Promise.all([
            child.exited,
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
        ])
        expect(stderr).toBe('')
        expect(exitCode).toBe(0)
        const result = JSON.parse(stdout.trim())
        expect(result.count).toBe(3)
        expect(result.ids).toEqual(['2', '3', '4'])
        expect(result.cachedSummary).toEqual(result.firstSummary)
    } finally {
        fs.rmSync(root, { recursive: true, force: true })
    }
})
