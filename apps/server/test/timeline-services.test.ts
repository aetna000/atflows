import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('timeline services include older traces and logs, deduplicate and omit blank identities', () => {
    const directory = mkdtempSync(join(tmpdir(), 'atflows-services-'))
    try {
        const result = Bun.spawnSync(['bun', '-e', `
            const { getTimelineServices, getTraces, getLogs, close } = await import('./packages/db/src/index.ts')
            const { Database } = await import('bun:sqlite')
            const database = new Database(process.env.DB_PATH)
            const trace = database.query('INSERT INTO traces (id, timestamp, service_name) VALUES (?, ?, ?)')
            trace.run('old', 1, 'atmem')
            for (let i = 0; i < 110; i++) trace.run(String(i), 1000 + i, 'codex_cli_rs')
            trace.run('blank', 1, '  ')
            trace.run('null', 1, null)
            const log = database.query('INSERT INTO logs (id, timestamp, service_name) VALUES (?, ?, ?)')
            log.run('log', 1, 'openclaw-gateway')
            log.run('duplicate', 1, 'atmem')
            log.run('hermes-event', 1, 'hermes')
            log.run('custom-event', 1, 'custom-agent')
            if (getTraces({limit:100, offset:0, filters:{service_name:'atmem'}}).length !== 1) throw Error('old trace missing')
            if (getLogs({limit:100, offset:0, filters:{service_name:'hermes'}}).length !== 1) throw Error('log missing')
            for (const name of ['ATMEM', 'atme', 'atmem%']) {
                if (getTraces({limit:100, offset:0, filters:{service_name:name}}).length) throw Error('inexact trace filter')
                if (getLogs({limit:100, offset:0, filters:{service_name:name}}).length) throw Error('inexact log filter')
            }
            console.log(JSON.stringify(getTimelineServices()))
            database.exec('DELETE FROM traces')
            if (getTimelineServices().length !== 4) throw Error('empty trace table hides logs')
            for (let i = 0; i < 600; i++) trace.run('bounded-' + i, 1, 'service-' + i)
            if (getTimelineServices().length !== 501) throw Error('unbounded discovery')
            database.close()
            close()
        `], { cwd: join(import.meta.dir, '../../..'), env: { ...process.env, DATA_DIR: directory, DB_PATH: join(directory, 'test.db') } })
        expect(result.exitCode).toBe(0)
        expect(JSON.parse(result.stdout.toString())).toEqual(['atmem', 'codex_cli_rs', 'custom-agent', 'hermes', 'openclaw-gateway'])
    } finally {
        rmSync(directory, { recursive: true, force: true })
    }
})
