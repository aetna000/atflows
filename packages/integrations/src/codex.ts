import crypto from 'crypto'
import path from 'path'
import os from 'os'

export const START_MARKER = '# atflows:start'
export const END_MARKER = '# atflows:end'

export function codexConfigPath() {
    const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
    if (!path.isAbsolute(home)) throw new Error('CODEX_HOME must be an absolute path')
    return path.join(home, 'config.toml')
}

export function hashText(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex')
}

export function ownedBlock(dashboardUrl: string) {
    return `${START_MARKER}\n[otel]\nenvironment = "dev"\nlog_user_prompt = false\nexporter = { otlp-http = { endpoint = "${dashboardUrl}/v1/logs", protocol = "json" } }\ntrace_exporter = { otlp-http = { endpoint = "${dashboardUrl}/v1/traces", protocol = "json" } }\n${END_MARKER}`
}

export function planCodexConfig(current: string, dashboardUrl: string) {
    if (typeof Bun.TOML?.parse !== 'function') {
        throw new Error('This Bun runtime cannot parse TOML; update Bun before automatic setup')
    }
    let parsed: Record<string, unknown> = {}
    try {
        if (current.trim()) parsed = Bun.TOML.parse(current) as Record<string, unknown>
    } catch {
        throw new Error('Codex config is not valid TOML; fix it before using automatic setup')
    }
    const block = ownedBlock(dashboardUrl)
    const start = current.indexOf(START_MARKER)
    const end = current.indexOf(END_MARKER)
    let next: string
    if (start !== -1 || end !== -1) {
        if (start === -1 || end < start || current.indexOf(START_MARKER, start + 1) !== -1) {
            throw new Error('AtFlows config markers are incomplete; use manual setup')
        }
        const after = end + END_MARKER.length
        next = current.slice(0, start) + block + current.slice(after)
    } else if (Object.hasOwn(parsed, 'otel')) {
        throw new Error('Codex already has telemetry settings; review them manually before replacing them')
    } else {
        next = current + (current && !current.endsWith('\n') ? '\n' : '') + (current.trim() ? '\n' : '') + block + '\n'
    }
    try {
        Bun.TOML.parse(next)
    } catch {
        throw new Error('The prepared Codex settings conflict with existing TOML')
    }
    return { next, block, changed: next !== current }
}

export function undoCodexBlock(current: string, expectedBlockHash: string) {
    const start = current.indexOf(START_MARKER)
    const end = current.indexOf(END_MARKER)
    if (start === -1 || end < start) throw new Error('AtFlows config block was not found')
    const after = end + END_MARKER.length
    const block = current.slice(start, after)
    if (hashText(block) !== expectedBlockHash) {
        throw new Error('AtFlows config block changed since apply; review it manually')
    }
    for (const line of current.slice(after).split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('[')) break
        if (trimmed && !trimmed.startsWith('#')) {
            throw new Error('New telemetry settings follow the AtFlows block; review them before undo')
        }
    }
    const next = current.slice(0, start) + current.slice(after)
    if (next.trim()) Bun.TOML.parse(next)
    return next
}
