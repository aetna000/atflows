import { test, expect } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { planCodexConfig } from '@atflows/integrations/codex'
import { getIntegrationCatalog } from '@atflows/integrations'
import { previewCodexSetup, applyCodexSetup, undoCodexSetup, getLatestCodexChangeId, codexSetupStatus } from '@atflows/integrations/local-config'

test('Codex setup preserves unrelated settings and safely undoes after another edit', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-connect-'))
    const previous = process.env.CODEX_HOME
    try {
        const home = path.join(root, 'codex')
        fs.mkdirSync(home)
        process.env.CODEX_HOME = home
        const target = path.join(home, 'config.toml')
        const original = '# Keep this comment\nmodel = "gpt-5.6-sol"\n'
        fs.writeFileSync(target, original)
        const preview = previewCodexSetup('http://127.0.0.1:3107')
        expect(fs.readFileSync(target, 'utf8')).toBe(original)
        const applied = applyCodexSetup(preview.preview_id, root)
        expect(applied.applied).toBe(true)
        expect(fs.readFileSync(target, 'utf8')).toContain('log_user_prompt = false')
        expect(fs.readFileSync(target, 'utf8')).toContain('metrics_exporter = { otlp-http = { endpoint = "http://127.0.0.1:3107/v1/metrics", protocol = "json" } }')
        expect(codexSetupStatus('http://127.0.0.1:3107').metrics_configured).toBe(true)
        expect(fs.readFileSync(path.join(root, 'integration-changes', `${applied.change_id}.backup`), 'utf8')).toBe(original)
        expect(fs.statSync(path.join(root, 'integration-changes', `${applied.change_id}.backup`)).mode & 0o777).toBe(0o600)
        expect(planCodexConfig(fs.readFileSync(target, 'utf8'), 'http://127.0.0.1:3107').changed).toBe(false)
        fs.appendFileSync(target, '\n# User added this later\n')
        undoCodexSetup(applied.change_id!, root)
        const restored = fs.readFileSync(target, 'utf8')
        expect(restored).toContain('model = "gpt-5.6-sol"')
        expect(restored).toContain('# User added this later')
        expect(restored).not.toContain('atflows:start')
    } finally {
        if (previous === undefined) delete process.env.CODEX_HOME
        else process.env.CODEX_HOME = previous
        fs.rmSync(root, { recursive: true, force: true })
    }
})

test('Codex setup refuses foreign telemetry and invalid TOML', () => {
    expect(() => planCodexConfig('[otel]\nexporter = "other"\n', 'http://127.0.0.1:3107')).toThrow('already has telemetry')
    expect(() => planCodexConfig('otel.exporter = "other"\n', 'http://127.0.0.1:3107')).toThrow('already has telemetry')
    expect(() => planCodexConfig('[broken\n', 'http://127.0.0.1:3107')).toThrow('not valid TOML')
})

test('OpenClaw connection shows the tested protobuf route and running dashboard address', () => {
    const catalog = getIntegrationCatalog('http://127.0.0.1:24680', 'http://127.0.0.1:28080')
    const openclaw = catalog.find((item) => item.id === 'openclaw')!
    expect(openclaw.status).toBe('available')
    expect(openclaw.endpoint).toBe('http://127.0.0.1:24680')
    expect(openclaw.snippet).toContain('"endpoint":"http://127.0.0.1:24680"')
    expect(openclaw.snippet).toContain('"captureContent":false')
})

test('catalog states the shipped OTLP formats and Helicone route accurately', () => {
    const catalog = getIntegrationCatalog('http://127.0.0.1:24680', 'http://127.0.0.1:28080')
    const generic = catalog.find((item) => item.id === 'otlp-json')!
    expect(generic.status).toBe('available')
    expect(generic.prerequisite).toContain('JSON or protobuf')
    expect(generic.prerequisite).toContain('OTLP/gRPC is not supported')
    const helicone = catalog.find((item) => item.id === 'helicone')!
    expect(helicone.mode).toBe('proxy')
    expect(helicone.status).toBe('needs-validation')
    expect(helicone.endpoint).toBe('http://127.0.0.1:28080/passthrough/helicone/v1')
    expect(catalog.some((item) => item.id === 'export-helicone')).toBe(false)
})

test('Hermes offers scoped native metadata setup, not a proxy snippet', () => {
    const hermes = getIntegrationCatalog('http://127.0.0.1:24680', 'http://127.0.0.1:28080').find(item => item.id === 'hermes')!
    expect(hermes.status).toBe('available')
    expect(hermes.canAutoConfigure).toBe(true)
    expect(hermes.endpoint).toBeUndefined()
    expect(hermes.snippet).toBeUndefined()
    expect(hermes.captures).toContain('cost unknown')
    expect(hermes.prerequisite).toContain('0.21.5')
    expect(hermes.guide).toBe('/guides/hermes')
})

test('every connection has a bundled guide and unverified routes cannot apply configuration', () => {
    const catalog = getIntegrationCatalog('http://127.0.0.1:24680', 'http://127.0.0.1:28080')
    expect(catalog.filter((item) => item.status === 'available').map((item) => item.id).sort()).toEqual(['atbots', 'claude-code', 'codex-cli', 'hermes', 'langchain', 'openclaw', 'otlp-json', 'pydantic-ai'])
    for (const id of ['langchain', 'pydantic-ai', 'atbots', 'claude-code']) {
        const profile = catalog.find((item) => item.id === id)
        expect(profile?.status).toBe('available')
        expect(profile?.guide).toBe(`/guides/${id}`)
    }
    expect(catalog.find((item) => item.id === 'claude-code')?.snippet).toContain('OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:24680')
    expect(catalog.find((item) => item.id === 'atbots')?.endpoint).toBe('http://127.0.0.1:28080/ollama')
    expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length)
    for (const item of catalog) {
        expect(item.guide.startsWith('/guides/')).toBe(true)
        const guide = path.resolve(import.meta.dir, '../../../docs/integrations', `${item.guide.slice('/guides/'.length)}.md`)
        expect(fs.existsSync(guide)).toBe(true)
        expect(item.steps.length).toBeGreaterThan(0)
        if (item.status === 'available') {
            expect(item.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(item.validatedWith?.length).toBeGreaterThan(10)
        }
        if (item.status !== 'available') expect(item.canAutoConfigure).toBe(false)
    }
})

test('Codex status reads active exporters and accepts loopback aliases', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-status-'))
    const previous = process.env.CODEX_HOME
    try {
        process.env.CODEX_HOME = root
        const target = path.join(root, 'config.toml')
        fs.writeFileSync(target, '# exporter = { otlp-http = { endpoint = "http://127.0.0.1:3107/v1/logs", protocol = "json" } }\n')
        expect(codexSetupStatus('http://127.0.0.1:3107').configured).toBe(false)
        expect(codexSetupStatus('http://127.0.0.1:3107').has_otel).toBe(false)
        fs.writeFileSync(target, '[otel]\nexporter = { otlp-http = { endpoint = "http://localhost:3107/v1/logs", protocol = "json" } }\ntrace_exporter = { otlp-http = { endpoint = "http://localhost:3107/v1/traces", protocol = "json" } }\n')
        expect(codexSetupStatus('http://127.0.0.1:3107').configured).toBe(true)
        expect(codexSetupStatus('http://127.0.0.1:3107').has_otel).toBe(true)
        expect(codexSetupStatus('http://127.0.0.1:3107').metrics_configured).toBe(false)
        fs.appendFileSync(target, 'metrics_exporter = { otlp-http = { endpoint = "http://localhost:3107/v1/metrics", protocol = "binary" } }\n')
        expect(codexSetupStatus('http://127.0.0.1:3107').metrics_configured).toBe(false)
        fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('protocol = "binary"', 'protocol = "json"'))
        expect(codexSetupStatus('http://127.0.0.1:3107').metrics_configured).toBe(true)
    } finally {
        if (previous === undefined) delete process.env.CODEX_HOME
        else process.env.CODEX_HOME = previous
        fs.rmSync(root, { recursive: true, force: true })
    }
})

test('re-applying a new endpoint keeps one active undo and removes AtFlows settings', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-reapply-'))
    const previous = process.env.CODEX_HOME
    try {
        const home = path.join(root, 'codex')
        fs.mkdirSync(home)
        process.env.CODEX_HOME = home
        const target = path.join(home, 'config.toml')
        fs.writeFileSync(target, 'model = "gpt-5.6-sol"\n')
        const first = applyCodexSetup(previewCodexSetup('http://127.0.0.1:3107').preview_id, root)
        const second = applyCodexSetup(previewCodexSetup('http://127.0.0.1:3108').preview_id, root)
        expect(getLatestCodexChangeId(root)).toBe(second.change_id)
        expect(() => undoCodexSetup(first.change_id!, root)).toThrow('no longer active')
        undoCodexSetup(second.change_id!, root)
        expect(getLatestCodexChangeId(root)).toBeNull()
        expect(fs.readFileSync(target, 'utf8')).not.toContain('[otel]')
        expect(fs.readFileSync(target, 'utf8')).toContain('model = "gpt-5.6-sol"')
    } finally {
        if (previous === undefined) delete process.env.CODEX_HOME
        else process.env.CODEX_HOME = previous
        fs.rmSync(root, { recursive: true, force: true })
    }
})
