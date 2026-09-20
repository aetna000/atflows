import { test, expect } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { planCodexConfig } from '@atflows/integrations/codex'
import { previewCodexSetup, applyCodexSetup, undoCodexSetup, getLatestCodexChangeId } from '@atflows/integrations/local-config'

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
