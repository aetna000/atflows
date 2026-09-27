import { test, expect } from 'bun:test'
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HermesStore } from '../../../packages/db/src/hermes'
import { previewHermes, applyHermes, undoHermes } from '../../../packages/integrations/src/hermes'
import { hermesReceiver } from '../src/hermes'

test.skipIf(!process.env.HERMES_TEST_PYTHON || !process.env.HERMES_TEST_SOURCE)('installed Hermes discovers plugin; native hooks and a real Ollama conversation reach AtFlows', async () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-native-')))
    const home = path.join(root, 'home'), data = path.join(root, 'data')
    fs.mkdirSync(home, { mode: 0o700 }); fs.mkdirSync(data, { mode: 0o700 })
    fs.writeFileSync(path.join(home, 'config.yaml'), 'model:\n  default: qwen3:1.7b\n  ollama_num_ctx: 65536\n', { mode: 0o600 })
    const db = new Database(':memory:'), store = new HermesStore(db), receive = hermesReceiver(store)
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: req => receive(req, '127.0.0.1') })
    try {
        const setup = process.env.ATFLOWS_INSTALLED_RUNTIME ? await import(path.join(process.env.ATFLOWS_INSTALLED_RUNTIME, 'packages/integrations/src/hermes.ts')) : { previewHermes, applyHermes, undoHermes }
        const preview = setup.previewHermes(data, `http://127.0.0.1:${server.port}`, home)
        setup.applyHermes(store, data, preview.preview_id)
        const child = Bun.spawn([process.env.HERMES_TEST_PYTHON!, '-I', path.resolve('e2e/hermes-native.py'), process.env.HERMES_TEST_SOURCE!, home], {
            env: { ...process.env, HERMES_HOME: path.join(os.homedir(), '.hermes') }, stdout: 'pipe', stderr: 'pipe',
        })
        const timeout = setTimeout(() => child.kill(), 90000)
        const [exit, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
        clearTimeout(timeout)
        console.log('Native process exit:', exit, 'events:', store.list().map(e => ({ kind: e.kind, model: e.model, input: e.input_tokens, output: e.output_tokens })))
        if (exit !== 0) console.log(stderr.slice(-3000))
        expect(exit).toBe(0)
        expect(stdout).toContain('NATIVE_CONVERSATION_RETURNED True')
        const events = store.list()
        expect(events.some(e => e.kind === 'request_error' && e.status_code === 429)).toBe(true)
        expect(events.some(e => e.kind === 'tool')).toBe(true)
        expect(events.some(e => e.kind === 'request' && e.input_tokens > 0 && e.output_tokens > 0)).toBe(true)
        expect(JSON.stringify(events)).not.toContain('CANARY')
        expect(setup.undoHermes(store, data, home).undone).toBe(true)
    } finally { server.stop(true); db.close(); fs.rmSync(root, { recursive: true }) }
}, 100000)
