import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { isDeepStrictEqual } from 'node:util'
import { randomBytes, randomUUID } from 'node:crypto'
import { digest, HERMES_FORMAT, type HermesStore } from '../../db/src/hermes'

const assets = path.resolve(import.meta.dir, '../../../atflows/integrations/hermes')
const files = ['__init__.py', 'observer.py', 'plugin.yaml']
const uuid = /^[a-f0-9-]{36}$/
type Plan = { home: string; endpoint: string; before_hash: string; expires_at: number }

function directory(target: string, create = false) {
    if (create && !fs.existsSync(target)) fs.mkdirSync(target, { mode: 0o700 })
    const info = fs.lstatSync(target)
    if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid?.() || info.mode & 0o022) throw Error('unsafe_directory')
    if (fs.realpathSync(target) !== target) throw Error('symlink_path_not_supported')
}
function read(target: string, absent = false): string {
    if (absent && !fs.existsSync(target)) return ''
    const fd = fs.openSync(target, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK)
    try {
        const st = fs.fstatSync(fd)
        if (!st.isFile() || st.nlink !== 1 || st.uid !== process.getuid?.() || st.mode & 0o022 || st.size > 1048576) throw Error('unsafe_file')
        return fs.readFileSync(fd, 'utf8')
    } finally { fs.closeSync(fd) }
}
function atomic(target: string, value: string) {
    const temporary = path.join(path.dirname(target), `.atflows-${randomUUID()}`)
    const fd = fs.openSync(temporary, 'wx', 0o600)
    try { fs.writeFileSync(fd, value); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
    fs.renameSync(temporary, target)
}
function records(dataDir: string) {
    directory(dataDir, true)
    const root = path.join(dataDir, 'hermes-setup')
    directory(root, true)
    if (fs.statSync(root).mode & 0o077) throw Error('private_setup_directory_required')
    return root
}
function homePath(input?: string) {
    if (process.platform === 'win32') throw Error('native_windows_setup_not_qualified')
    const home = path.resolve(input || process.env.HERMES_HOME || path.join(os.homedir(), '.hermes'))
    if (home === os.homedir() || home === path.parse(home).root) throw Error('invalid_hermes_home')
    directory(home)
    if (!fs.existsSync(path.join(home, 'config.yaml'))) throw Error('hermes_config_missing_run_hermes_setup_first')
    return home
}
function parseConfig(text: string): Record<string, any> {
    const value = Bun.YAML.parse(text) as any
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_hermes_config')
    const plugins = value.plugins
    if (plugins !== undefined && (!plugins || typeof plugins !== 'object' || Array.isArray(plugins))) throw Error('invalid_plugin_settings')
    for (const key of ['enabled', 'disabled']) {
        const list = plugins?.[key]
        if (list !== undefined && (!Array.isArray(list) || list.some((x: unknown) => typeof x !== 'string'))) throw Error('invalid_plugin_list')
    }
    return value
}
function enableOnly(text: string): string {
    const config = parseConfig(text)
    if (config.plugins?.disabled?.includes('atflows')) throw Error('atflows_explicitly_disabled_remove_denial_before_setup')
    const expected = structuredClone(config)
    expected.plugins = { ...expected.plugins, enabled: [...new Set([...(expected.plugins?.enabled || []), 'atflows'])] }
    const lines = text.split('\n')
    const starts = lines.map((line, index) => /^plugins\s*:/.test(line) ? index : -1).filter(index => index >= 0)
    if (starts.length > 1) throw Error('complex_yaml_requires_manual_review')
    if (!starts.length) {
        if (config.plugins !== undefined || /^(?:---|\.\.\.)\s*$|<<\s*:/m.test(text)) throw Error('complex_yaml_requires_manual_review')
        return text + '\nplugins:\n  enabled: [atflows]\n'
    }
    const start = starts[0]
    if (!/^plugins\s*:\s*(?:#.*)?$/.test(lines[start])) throw Error('complex_yaml_requires_manual_review')
    let end = start + 1
    while (end < lines.length && (!lines[end].trim() || /^\s|^#/.test(lines[end]))) end++
    const block = lines.slice(start + 1, end)
    if (block.some(line => /[&*]|<<\s*:/.test(line))) throw Error('complex_yaml_requires_manual_review')
    const enabled = block.findIndex(line => /^  enabled\s*:/.test(line))
    const replacement = `  enabled: ${JSON.stringify(expected.plugins.enabled)}`
    if (enabled < 0) lines.splice(start + 1, 0, replacement)
    else {
        let stop = enabled + 1
        while (stop < block.length && /^(?:    |  -)/.test(block[stop])) stop++
        lines.splice(start + 1 + enabled, stop - enabled, replacement)
    }
    const next = lines.join('\n')
    if (!isDeepStrictEqual(parseConfig(next), expected)) throw Error('complex_yaml_requires_manual_review')
    return next
}
function setupLock(home: string) {
    const lock = path.join(home, '.atflows-setup.lock')
    try { return { lock, fd: fs.openSync(lock, 'wx', 0o600) } }
    catch { throw Error('setup_locked_finish_other_setup_or_review_stale_atflows_setup_lock_in_hermes_home') }
}
export function previewEndpoint(dataDir: string, id: string) {
    if (!uuid.test(id)) throw Error('invalid_preview')
    return endpointValue(JSON.parse(read(path.join(records(dataDir), `${id}.preview`))).endpoint)
}
function endpointValue(endpoint: string) {
    if (!/^http:\/\/127\.0\.0\.1:[0-9]{1,5}$/.test(endpoint) || Number(endpoint.split(':').at(-1)) < 1 || Number(endpoint.split(':').at(-1)) > 65535) throw Error('local_endpoint_required')
    return endpoint
}
function owned(target: string) {
    directory(target)
    const receipt = JSON.parse(read(path.join(target, 'receipt.json')))
    if (receipt.format !== HERMES_FORMAT || !uuid.test(receipt.connection_id)) throw Error('foreign_plugin_directory')
    for (const file of [...files, 'connection.json']) if (digest(read(path.join(target, file))) !== receipt.hashes[file]) throw Error('plugin_changed_review_before_overwrite')
    const extra = fs.readdirSync(target).filter(name => ![...files, 'connection.json', 'receipt.json', 'status.json', '__pycache__'].includes(name) && !/^\.status-[a-f0-9-]{36}$/.test(name))
    if (extra.length) throw Error('foreign_plugin_files')
    return receipt
}
export function hermesStatus(store: HermesStore, endpoint: string, input?: string) {
    const home = homePath(input)
    const config = parseConfig(read(path.join(home, 'config.yaml')))
    const target = path.join(home, 'plugins/atflows')
    if (!fs.existsSync(target)) return { home, target, state: 'not_configured', configured: false, endpoint }
    const receipt = owned(target)
    const connection = JSON.parse(read(path.join(target, 'connection.json')))
    const enabled = config.plugins?.enabled?.includes('atflows') === true && !config.plugins?.disabled?.includes('atflows')
    const authorized = store.authenticate(connection.token) === receipt.connection_id
    const summary = store.summary(receipt.connection_id)
    let observer: Record<string, any> | null = null
    try {
        const report = JSON.parse(read(path.join(target, 'status.json')))
        observer = { sent: Number.isSafeInteger(report.sent) ? report.sent : null, dropped: Number.isSafeInteger(report.dropped) ? report.dropped : null,
            error: report.error === null ? null : 'receiver_unavailable_or_rejected', updated_at: Number.isSafeInteger(report.updated_at) ? report.updated_at : null }
    } catch { /* No producer status until it runs. */ }
    const stale = connection.endpoint !== endpoint
    return { home, target, endpoint: connection.endpoint, current_endpoint: endpoint, connection_id: receipt.connection_id,
        configured: enabled && authorized && !stale, state: stale ? 'endpoint_stale' : !authorized ? 'credential_revoked' : !enabled ? 'disabled_in_hermes' : observer?.error ? 'degraded' : summary.last_event ? 'observed' : 'awaiting_traffic',
        summary, observer, restart_required: true, capture: 'Metadata only; request success/failure and terminal tools. Cost unknown. No prompt/tool content.' }
}
export function previewHermes(dataDir: string, endpoint: string, input?: string) {
    const home = homePath(input)
    endpointValue(endpoint)
    const config = read(path.join(home, 'config.yaml'))
    enableOnly(config)
    const target = path.join(home, 'plugins/atflows')
    if (fs.existsSync(target)) owned(target)
    const id = randomUUID()
    const plan: Plan = { home, endpoint, before_hash: digest(config), expires_at: Date.now() + 120000 }
    fs.writeFileSync(path.join(records(dataDir), `${id}.preview`), JSON.stringify(plan), { flag: 'wx', mode: 0o600 })
    return { preview_id: id, home, target, endpoint, expires_at: plan.expires_at,
        changes: ['Install the metadata-only atflows observer plugin (Hermes 0.21.5 only).', 'Edit only plugins.enabled; preserve model, memory and other settings.', 'Save a private full-config backup in AtFlows data/hermes-setup; it can contain existing credentials.', 'Restart Hermes; verify real events here.'],
        capture: 'No prompts, responses, tool arguments/results or raw errors. Hashed IDs; usage only when supplied; cost unknown.' }
}
export function applyHermes(store: HermesStore, dataDir: string, id: string) {
    if (!uuid.test(id)) throw Error('invalid_preview')
    const root = records(dataDir)
    const file = path.join(root, `${id}.preview`)
    const plan: Plan = JSON.parse(read(file))
    if (plan.expires_at < Date.now()) throw Error('preview_expired')
    const home = homePath(plan.home)
    endpointValue(plan.endpoint)
    const { lock, fd } = setupLock(home)
    let staged = ''
    try {
        const configFile = path.join(home, 'config.yaml')
        const before = read(configFile)
        if (digest(before) !== plan.before_hash) throw Error('config_changed_review_again')
        const config = parseConfig(before)
        const plugins = path.join(home, 'plugins')
        directory(plugins, true)
        const target = path.join(plugins, 'atflows')
        if (fs.existsSync(target)) {
            const receipt = owned(target)
            const existing = JSON.parse(read(path.join(target, 'connection.json')))
            if (existing.endpoint === plan.endpoint && config.plugins?.enabled?.includes('atflows') && store.authenticate(existing.token) === receipt.connection_id) {
                fs.unlinkSync(file)
                return { applied: false, connection_id: receipt.connection_id, state: 'already_configured' }
            }
            throw Error('existing_connection_requires_reviewed_undo_first')
        }
        const connection = randomUUID(), token = randomBytes(32).toString('hex'), profile = randomUUID()
        staged = path.join(plugins, `__atflows_stage_${randomUUID()}__`)
        fs.mkdirSync(staged, { mode: 0o700 })
        const hashes: Record<string, string> = {}
        for (const name of files) {
            const source = fs.readFileSync(path.join(assets, name), 'utf8')
            fs.writeFileSync(path.join(staged, name), source, { flag: 'wx', mode: 0o600 })
            hashes[name] = digest(source)
        }
        const credential = JSON.stringify({ format: HERMES_FORMAT, connection_id: connection, profile_id: profile, home, endpoint: plan.endpoint, token })
        fs.writeFileSync(path.join(staged, 'connection.json'), credential, { flag: 'wx', mode: 0o600 })
        hashes['connection.json'] = digest(credential)
        const next = enableOnly(before)
        const backup = path.join(root, `${connection}.backup`)
        fs.writeFileSync(backup, before, { flag: 'wx', mode: 0o600 })
        fs.writeFileSync(path.join(staged, 'receipt.json'), JSON.stringify({ format: HERMES_FORMAT, connection_id: connection, hashes, before_hash: digest(before), applied_hash: digest(next) }), { flag: 'wx', mode: 0o600 })
        store.provision(connection, token, profile)
        try {
            if (fs.existsSync(target) || digest(read(configFile)) !== plan.before_hash) throw Error('setup_conflict')
            fs.renameSync(staged, target)
            staged = ''
            atomic(configFile, next)
        } catch (error) { store.revoke(connection); throw error }
        fs.unlinkSync(file)
        return { applied: true, connection_id: connection, home, endpoint: plan.endpoint, restart_required: true, state: 'awaiting_traffic' }
    } finally {
        fs.closeSync(fd)
        fs.unlinkSync(lock)
        if (staged) fs.rmSync(staged, { recursive: true })
    }
}
export function undoHermes(store: HermesStore, dataDir: string, input?: string) {
    const home = homePath(input), target = path.join(home, 'plugins/atflows')
    const { lock, fd } = setupLock(home)
    try {
        const receipt = owned(target)
        const configFile = path.join(home, 'config.yaml')
        const current = read(configFile)
        if (![receipt.applied_hash, receipt.before_hash].includes(digest(current))) throw Error('config_changed_manual_review_required')
        const backup = read(path.join(records(dataDir), `${receipt.connection_id}.backup`))
        if (digest(backup) !== receipt.before_hash) throw Error('backup_integrity_failed')
        const archiveRoot = path.join(home, '.atflows-observer-backups')
        directory(archiveRoot, true)
        const archived = path.join(archiveRoot, receipt.connection_id)
        if (fs.existsSync(archived)) throw Error('undo_archive_exists')
        store.revoke(receipt.connection_id)
        atomic(configFile, backup)
        fs.renameSync(target, archived)
        return { undone: true, retained_plugin_backup: archived, restart_required: true }
    } finally { fs.closeSync(fd); fs.unlinkSync(lock) }
}
