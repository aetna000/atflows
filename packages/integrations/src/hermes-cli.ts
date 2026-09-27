import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { HermesStore } from '../../db/src/hermes'
import { previewHermes, applyHermes, undoHermes, hermesStatus, previewEndpoint } from './hermes'

const [action, ...args] = process.argv.slice(2)
function option(name: string) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
try {
    const dataDir = process.env.DATA_DIR || path.join(os.homedir(), '.atflows')
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
    const connection = new Database(process.env.DB_PATH || path.join(dataDir, 'data.db'), { create: true })
    connection.exec('PRAGMA busy_timeout=5000')
    const db = { DATA_DIR: dataDir, hermes: new HermesStore(connection) }
    const home = option('--home'), endpoint = option('--endpoint')
    const checkEndpoint = action === 'apply' && option('--preview') ? previewEndpoint(db.DATA_DIR, option('--preview')!) : endpoint
    if (['preview', 'apply', 'status'].includes(action)) {
        if (!checkEndpoint || !/^http:\/\/127\.0\.0\.1:[0-9]{1,5}$/.test(checkEndpoint)) throw Error('local_endpoint_required')
        const health = await fetch(`${checkEndpoint}/api/health`, { redirect: 'error', signal: AbortSignal.timeout(2000) }).then(r => r.json()) as any
        if (health.hermes_database_id !== db.hermes.databaseId()) throw Error('receiver_database_mismatch_use_same_data_dir_and_db_path_as_dashboard')
    }
    let result
    if (action === 'apply' && option('--preview')) result = applyHermes(db.hermes, db.DATA_DIR, option('--preview')!)
    else if (action === 'undo') result = undoHermes(db.hermes, db.DATA_DIR, home)
    else if (action === 'preview' && endpoint) result = previewHermes(db.DATA_DIR, endpoint, home)
    else if (action === 'status' && endpoint) result = hermesStatus(db.hermes, endpoint, home)
    else throw Error('Usage: atflows connect hermes preview|status --endpoint http://127.0.0.1:PORT [--home PATH]; apply --preview ID; undo [--home PATH]. Use the running dashboard port and its DATA_DIR/DB_PATH.')
    console.log(JSON.stringify(result, null, 2))
} catch (error) {
    const message = (error as Error).message
    console.error(/^[a-z_]+$/.test(message) || message.startsWith('Usage:') ? message : 'Setup failed: check the Hermes Home, permissions and configuration. No credentials are printed.')
    process.exitCode = 1
}
