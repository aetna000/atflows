import { expect, test } from 'bun:test'
import path from 'node:path'

const loggerPath = path.resolve(import.meta.dir, '../../../packages/shared/src/logger.js')

test('terminal logger renders local time with offset in different zones', () => {
    for (const [zone, expected] of [['UTC', '\\+00:00'], ['Australia/Sydney', '\\+1[01]:00']]) {
        const run = Bun.spawnSync([
            process.execPath, '-e', `require(${JSON.stringify(loggerPath)}).info('local-time-check')`,
        ], { env: { ...process.env, TZ: zone } })
        expect(run.exitCode).toBe(0)
        const output = new TextDecoder().decode(run.stdout)
        expect(output).toContain('local-time-check')
        expect(output).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}${expected}`))
    }
})
