import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('characterize current product in a dedicated process without sharing DB module cache', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url))
    const result = Bun.spawnSync({
        cmd: [process.execPath, 'test', './tests/continuity/current-product.worker.ts'],
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
    })
    if (result.exitCode !== 0) console.error(result.stderr.toString())
    expect(result.exitCode).toBe(0)
    expect(result.stderr.toString()).toContain('6 pass')
})
