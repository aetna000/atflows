import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { START_MARKER, codexConfigPath, hashText, planCodexConfig, undoCodexBlock } from './codex'

interface PendingPreview {
    target: string
    expectedHash: string
    next: string
    blockHash: string
    expiresAt: number
}

interface AppliedChange {
    target: string
    backup: string
    appliedHash: string
    blockHash: string
    appliedAt: number
    undone?: boolean
    superseded?: boolean
}

const previews = new Map<string, PendingPreview>()
const MAX_BACKUP_AGE_MS = 30 * 24 * 60 * 60 * 1000

function recordDir(dataDir: string) {
    return path.join(dataDir, 'integration-changes')
}

function changeRecords(dataDir: string) {
    const directory = recordDir(dataDir)
    if (!fs.existsSync(directory)) return []
    return fs.readdirSync(directory)
        .filter((name) => /^[0-9a-f-]{36}\.json$/.test(name))
        .map((name) => {
            const id = name.slice(0, -5)
            const record = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')) as AppliedChange
            return { id, record }
        })
}

export function getLatestCodexChangeId(dataDir: string) {
    const target = codexConfigPath()
    return changeRecords(dataDir)
        .filter(({ record }) => record.target === target && !record.undone && !record.superseded)
        .sort((a, b) => b.record.appliedAt - a.record.appliedAt)[0]?.id || null
}

function cleanOldChanges(dataDir: string) {
    for (const { id, record } of changeRecords(dataDir)) {
        if (Date.now() - record.appliedAt < MAX_BACKUP_AGE_MS) continue
        const backup = path.join(recordDir(dataDir), `${id}.backup`)
        if (fs.existsSync(backup)) fs.unlinkSync(backup)
        fs.unlinkSync(path.join(recordDir(dataDir), `${id}.json`))
    }
}

function readConfig(target: string) {
    if (!fs.existsSync(target)) return ''
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Codex config is a symlink; use manual setup')
    return fs.readFileSync(target, 'utf8')
}

function writeAtomic(target: string, contents: string) {
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
    const temp = path.join(path.dirname(target), `.config.toml.atflows-${crypto.randomUUID()}`)
    try {
        fs.writeFileSync(temp, contents, { flag: 'wx', mode: 0o600 })
        fs.renameSync(temp, target)
    } finally {
        if (fs.existsSync(temp)) fs.unlinkSync(temp)
    }
}

export function previewCodexSetup(dashboardUrl: string) {
    for (const [id, pending] of previews) {
        if (Date.now() > pending.expiresAt) previews.delete(id)
    }
    const target = codexConfigPath()
    const current = readConfig(target)
    const plan = planCodexConfig(current, dashboardUrl)
    const previewId = crypto.randomUUID()
    const expiresAt = Date.now() + 120_000
    previews.set(previewId, {
        target,
        expectedHash: hashText(current),
        next: plan.next,
        blockHash: hashText(plan.block),
        expiresAt,
    })
    return {
        preview_id: previewId,
        config_path: target,
        settings: plan.block,
        changed: plan.changed,
        expires_at: expiresAt,
        restart_required: true,
    }
}

export function codexSetupStatus(dashboardUrl: string) {
    const target = codexConfigPath()
    const found = fs.existsSync(target)
    const contents = readConfig(target)
    const managed = contents.includes(START_MARKER)
    const configured = contents.includes(`${dashboardUrl}/v1/logs`) &&
        contents.includes(`${dashboardUrl}/v1/traces`)
    return { config_path: target, config_found: found, configured, managed, endpoint_stale: managed && !configured }
}

export function applyCodexSetup(previewId: string, dataDir: string) {
    const preview = previews.get(previewId)
    previews.delete(previewId)
    if (!preview || Date.now() > preview.expiresAt) throw new Error('Preview expired; review the change again')
    if (preview.target !== codexConfigPath()) throw new Error('Codex config path changed; review again')
    const current = readConfig(preview.target)
    if (hashText(current) !== preview.expectedHash) throw new Error('Codex config changed; review again')
    if (current === preview.next) return { applied: false, config_path: preview.target, change_id: null }

    const changeId = crypto.randomUUID()
    const recordDir = path.join(dataDir, 'integration-changes')
    fs.mkdirSync(recordDir, { recursive: true, mode: 0o700 })
    fs.chmodSync(recordDir, 0o700)
    cleanOldChanges(dataDir)
    const backup = path.join(recordDir, `${changeId}.backup`)
    fs.writeFileSync(backup, current, { flag: 'wx', mode: 0o600 })
    writeAtomic(preview.target, preview.next)
    const record: AppliedChange = {
        target: preview.target,
        backup,
        appliedHash: hashText(preview.next),
        blockHash: preview.blockHash,
        appliedAt: Date.now(),
    }
    fs.writeFileSync(path.join(recordDir, `${changeId}.json`), JSON.stringify(record), { flag: 'wx', mode: 0o600 })
    for (const { id, record: older } of changeRecords(dataDir)) {
        if (id === changeId || older.target !== preview.target || older.undone || older.superseded) continue
        older.superseded = true
        fs.writeFileSync(path.join(recordDir, `${id}.json`), JSON.stringify(older), { mode: 0o600 })
    }
    return { applied: true, config_path: preview.target, change_id: changeId }
}

export function undoCodexSetup(changeId: string, dataDir: string) {
    if (!/^[0-9a-f-]{36}$/.test(changeId)) throw new Error('Invalid change ID')
    const recordPath = path.join(dataDir, 'integration-changes', `${changeId}.json`)
    if (!fs.existsSync(recordPath)) throw new Error('Change record not found')
    const record = JSON.parse(fs.readFileSync(recordPath, 'utf8')) as AppliedChange
    if (record.undone || record.superseded) throw new Error('Change is no longer active')
    if (record.target !== codexConfigPath()) throw new Error('Codex config path changed')
    const current = readConfig(record.target)
    const next = undoCodexBlock(current, record.blockHash)
    if (next.includes(START_MARKER)) throw new Error('Another AtFlows block remains; review manually')
    writeAtomic(record.target, next)
    record.undone = true
    fs.writeFileSync(recordPath, JSON.stringify(record), { mode: 0o600 })
    return { undone: true, config_path: record.target }
}
