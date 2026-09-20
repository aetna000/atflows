import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type Role = 'viewer' | 'investigator' | 'evidence_collector' | 'administrator'
export type Account = { username: string; display_name: string; role: Role; enabled: boolean; password_change_required: boolean }
type StoredUser = Account & { salt: string; digest: string }
type Session = { expires: number; username: string }

const SESSION_MS = 24 * 60 * 60 * 1000
const COOKIE = 'atflows_session'
const ROLES: Role[] = ['viewer', 'investigator', 'evidence_collector', 'administrator']

const VIEWER_ROUTES = new Set([
    '/api/stats', '/api/models', '/api/analytics', '/api/analytics/daily',
    '/api/analytics/cost-by-tool', '/api/analytics/cost-by-model', '/api/analytics/token-trends',
])

export function requiredDashboardRole(pathname: string, method: string): Role {
    if (method !== 'GET' || pathname.startsWith('/api/settings/') || pathname.startsWith('/api/integrations') ||
        ['/api/data', '/api/demo-data', '/api/model-data'].includes(pathname)) return 'administrator'
    return VIEWER_ROUTES.has(pathname) ? 'viewer' : 'investigator'
}

export function allowsRole(actual: Role | null, required: Role): boolean {
    return actual !== null && ROLES.indexOf(actual) >= ROLES.indexOf(required)
}

function passwordDigest(password: string, salt: string) {
    return crypto.scryptSync(password, salt, 64).toString('hex')
}

function newPasswordRecord(password: string) {
    const salt = crypto.randomBytes(16).toString('hex')
    return { salt, digest: passwordDigest(password, salt) }
}

function writePrivate(target: string, value: unknown) {
    const temporary = path.join(path.dirname(target), `.${path.basename(target)}-${crypto.randomUUID()}`)
    try {
        fs.writeFileSync(temporary, JSON.stringify(value), { flag: 'wx', mode: 0o600 })
        fs.renameSync(temporary, target)
        fs.chmodSync(target, 0o600)
    } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
    }
}

function publicAccount(user: StoredUser): Account {
    return {
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        enabled: user.enabled,
        password_change_required: user.password_change_required,
    }
}

export function createLocalAuth(dataDir: string) {
    let setupToken = process.env.ATFLOWS_SETUP_TOKEN || ''
    let setupPassword = process.env.ATFLOWS_SETUP_PREFILL_PASSWORD || ''
    const setupExpires = Date.now() + 60_000
    delete process.env.ATFLOWS_SETUP_TOKEN
    delete process.env.ATFLOWS_SETUP_PREFILL_PASSWORD
    const target = path.join(dataDir, 'admin-auth.json')
    const usersTarget = path.join(dataDir, 'users.json')
    const sessionsTarget = path.join(dataDir, 'admin-sessions.json')
    const auditTarget = path.join(dataDir, 'users-audit.jsonl')
    const attempts = new Map<string, { count: number; until: number }>()
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
    const sessions = new Map<string, Session>()
    if (fs.existsSync(sessionsTarget)) {
        try {
            const saved = JSON.parse(fs.readFileSync(sessionsTarget, 'utf8')) as Record<string, number | Session>
            for (const [digest, entry] of Object.entries(saved)) {
                const session = typeof entry === 'number' ? { expires: entry, username: 'administrator' } : entry
                if (/^[a-f0-9]{64}$/.test(digest) && session?.expires > Date.now() && typeof session.username === 'string') sessions.set(digest, session)
            }
        } catch {
            // A damaged session file signs everyone out without blocking server startup.
        }
    }
    const users = new Map<string, StoredUser>()
    let usersLoadError = false
    if (fs.existsSync(usersTarget)) {
        try {
            const saved = JSON.parse(fs.readFileSync(usersTarget, 'utf8')) as unknown
            if (!Array.isArray(saved)) throw new Error('Invalid account file')
            for (const user of saved as StoredUser[]) {
                if (!user || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(user.username) ||
                    user.username === 'administrator' || typeof user.display_name !== 'string' ||
                    !ROLES.includes(user.role) || typeof user.enabled !== 'boolean' ||
                    typeof user.password_change_required !== 'boolean' ||
                    !/^[a-f0-9]{32}$/.test(user.salt) || !/^[a-f0-9]{128}$/.test(user.digest) ||
                    users.has(user.username)) throw new Error('Invalid account record')
                users.set(user.username, user)
            }
        } catch {
            users.clear()
            usersLoadError = true
        }
    }
    function persistSessions() { writePrivate(sessionsTarget, Object.fromEntries(sessions)) }
    function persistUsers() { writePrivate(usersTarget, [...users.values()]) }
    function sessionDigest(value: string) { return crypto.createHash('sha256').update(value).digest('hex') }
    function revoke(username: string) {
        for (const [digest, session] of sessions) if (session.username === username) sessions.delete(digest)
        persistSessions()
    }
    function audit(actor: string, operation: string, subject: string) {
        fs.appendFileSync(auditTarget, JSON.stringify({ recorded_at: new Date().toISOString(), actor, operation, subject }) + '\n', { mode: 0o600 })
    }

    function readAdminRecord() {
        try {
            const saved = JSON.parse(fs.readFileSync(target, 'utf8')) as { salt?: unknown; digest?: unknown; temporary?: unknown }
            if (/^[a-f0-9]{32}$/.test(String(saved.salt)) && /^[a-f0-9]{128}$/.test(String(saved.digest))) {
                return { salt: String(saved.salt), digest: String(saved.digest), temporary: saved.temporary === true }
            }
        } catch { /* Administrator recovery can replace a damaged record. */ }
        return { ...newPasswordRecord(crypto.randomBytes(32).toString('hex')), temporary: true }
    }
    let record: { salt: string; digest: string; temporary?: boolean }
    if (fs.existsSync(target)) {
        record = readAdminRecord()
        if (process.env.ATFLOWS_ADMIN_PASSWORD) {
            const replacement = passwordDigest(process.env.ATFLOWS_ADMIN_PASSWORD, record.salt)
            if (replacement !== record.digest) {
                record.digest = replacement
                record.temporary = false
                writePrivate(target, record)
                revoke('administrator')
            }
        }
    } else {
        const password = process.env.ATFLOWS_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url')
        record = { ...newPasswordRecord(password), temporary: !process.env.ATFLOWS_ADMIN_PASSWORD }
        writePrivate(target, record)
        if (!process.env.ATFLOWS_ADMIN_PASSWORD) process.stdout.write(`[atflows] Local Administrator password (shown once): ${password}\n`)
    }
    let recordIdentity = `${fs.statSync(target).ino}:${fs.statSync(target).mtimeMs}`
    function refreshRecord() {
        const stat = fs.statSync(target)
        const identity = `${stat.ino}:${stat.mtimeMs}`
        if (identity !== recordIdentity) {
            record = readAdminRecord()
            recordIdentity = identity
            revoke('administrator')
        }
    }
    function getUser(username: string): StoredUser | null {
        if (username === 'administrator') return {
            username, display_name: 'Local Administrator', role: 'administrator', enabled: true,
            password_change_required: !!record.temporary, ...record,
        }
        return users.get(username) || null
    }
    function token(req: Request) {
        const values = req.headers.get('cookie')?.split(';').map((part) => part.trim())
            .filter((part) => part.startsWith(`${COOKIE}=`)).map((part) => part.slice(COOKIE.length + 1)) || []
        return values.find((value) => {
            const session = sessions.get(sessionDigest(value))
            return !!session && session.expires > Date.now() && !!getUser(session.username)?.enabled
        }) || values[0] || ''
    }
    function account(req: Request): Account | null {
        refreshRecord()
        const value = token(req)
        if (!value) return null
        const digest = sessionDigest(value)
        const session = sessions.get(digest)
        if (!session) return null
        const user = getUser(session.username)
        if (session.expires <= Date.now() || !user?.enabled) {
            sessions.delete(digest)
            persistSessions()
            return null
        }
        return publicAccount(user)
    }
    function authenticated(req: Request) { return account(req) !== null }
    function ready(req: Request) { const user = account(req); return !!user && !user.password_change_required }
    function role(req: Request): Role | null { return account(req)?.role || null }
    function sameOrigin(req: Request) { return req.headers.get('origin') === new URL(req.url).origin }
    function cookie(value: string, req: Request, maxAge: number) {
        return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`
    }
    async function route(req: Request, peerAddress: string): Promise<Response | null> {
        const pathname = new URL(req.url).pathname
        if (pathname === '/api/auth/setup-prefill' && req.method === 'POST') {
            if (!sameOrigin(req) || !['127.0.0.1', '::1'].includes(peerAddress)) {
                return Response.json({ error: 'Local setup only' }, { status: 403 })
            }
            const body = await req.json().catch(() => ({})) as { token?: string }
            const supplied = typeof body.token === 'string' ? body.token : ''
            const valid = setupToken && setupPassword && record.temporary && Date.now() < setupExpires &&
                supplied.length === setupToken.length &&
                crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(setupToken))
            if (!valid) return Response.json({ error: 'Setup link expired' }, { status: 404 })
            const password = setupPassword
            setupToken = ''
            setupPassword = ''
            return Response.json({ username: 'administrator', password }, { headers: { 'Cache-Control': 'no-store' } })
        }
        if (pathname === '/api/auth/status' && req.method === 'GET') {
            const user = account(req)
            return Response.json({ authenticated: !!user, password_change_required: !!user?.password_change_required, account: user })
        }
        if (pathname === '/api/auth/login' && req.method === 'POST') {
            if (!sameOrigin(req)) return Response.json({ error: 'Origin check failed' }, { status: 403 })
            const body = await req.json().catch(() => ({})) as { username?: string; password?: string }
            const username = String(body.username || '').slice(0, 64)
            const key = `${peerAddress}:${username}`
            const now = Date.now()
            for (const [attemptKey, entry] of attempts) if (entry.until <= now) attempts.delete(attemptKey)
            const limit = attempts.get(key)
            if (limit && limit.count >= 5 && limit.until > Date.now()) return Response.json({ error: 'Try again in a minute' }, { status: 429 })
            refreshRecord()
            const user = getUser(username)
            const actual = Buffer.from(passwordDigest(String(body.password || ''), user?.salt || '00000000000000000000000000000000'), 'hex')
            const expected = Buffer.from(user?.digest || '0'.repeat(128), 'hex')
            if (!user?.enabled || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
                if (!attempts.has(key) && attempts.size >= 10_000) attempts.delete(attempts.keys().next().value!)
                attempts.set(key, { count: (limit && limit.until > Date.now() ? limit.count : 0) + 1, until: Date.now() + 60_000 })
                return Response.json({ error: 'Incorrect username or password' }, { status: 401 })
            }
            attempts.delete(key)
            const session = crypto.randomBytes(32).toString('base64url')
            sessions.set(sessionDigest(session), { expires: Date.now() + SESSION_MS, username })
            persistSessions()
            return Response.json({ authenticated: true, password_change_required: user.password_change_required, account: publicAccount(user) }, { headers: { 'Set-Cookie': cookie(session, req, SESSION_MS / 1000) } })
        }
        if (pathname === '/api/auth/change-password' && req.method === 'POST') {
            const user = account(req)
            if (!sameOrigin(req) || !user) return Response.json({ error: 'Not authorized' }, { status: 401 })
            const body = await req.json().catch(() => ({})) as { new_password?: string; current_password?: string }
            if (typeof body.new_password !== 'string' || body.new_password.length === 0) return Response.json({ error: 'Enter a password' }, { status: 400 })
            if (!user.password_change_required) {
                const stored = getUser(user.username)!
                const actual = Buffer.from(passwordDigest(String(body.current_password || ''), stored.salt), 'hex')
                const expected = Buffer.from(stored.digest, 'hex')
                if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return Response.json({ error: 'Current password is incorrect' }, { status: 403 })
            }
            if (user.username === 'administrator') {
                record = { ...newPasswordRecord(body.new_password), temporary: false }
                writePrivate(target, record)
                const stat = fs.statSync(target)
                recordIdentity = `${stat.ino}:${stat.mtimeMs}`
            } else {
                const updated = users.get(user.username)!
                Object.assign(updated, newPasswordRecord(body.new_password), { password_change_required: false })
                persistUsers()
            }
            revoke(user.username)
            const session = crypto.randomBytes(32).toString('base64url')
            sessions.set(sessionDigest(session), { expires: Date.now() + SESSION_MS, username: user.username })
            persistSessions()
            return Response.json({ authenticated: true, password_change_required: false, account: { ...user, password_change_required: false } }, { headers: { 'Set-Cookie': cookie(session, req, SESSION_MS / 1000) } })
        }
        if (pathname === '/api/auth/logout' && req.method === 'POST') {
            if (!sameOrigin(req) || !authenticated(req)) return Response.json({ error: 'Not authorized' }, { status: 401 })
            sessions.delete(sessionDigest(token(req)))
            persistSessions()
            return Response.json({ authenticated: false }, { headers: { 'Set-Cookie': cookie('', req, 0) } })
        }
        if (!pathname.startsWith('/api/users')) return null
        const actor = account(req)
        if (!actor) return Response.json({ error: 'Sign in required' }, { status: 401 })
        if (actor.role !== 'administrator' || actor.password_change_required) return Response.json({ error: 'Administrator access required' }, { status: 403 })
        if (req.method !== 'GET' && !sameOrigin(req)) return Response.json({ error: 'Origin check failed' }, { status: 403 })
        if (usersLoadError) return Response.json({ error: 'Account file is damaged. Restore users.json before changing accounts.' }, { status: 503 })
        if (pathname === '/api/users' && req.method === 'GET') {
            return Response.json({ users: [publicAccount(getUser('administrator')!), ...[...users.values()].map(publicAccount)] })
        }
        if (pathname === '/api/users/audit' && req.method === 'GET') {
            const lines = fs.existsSync(auditTarget) ? fs.readFileSync(auditTarget, 'utf8').trim().split('\n').filter(Boolean) : []
            const events: unknown[] = []
            for (const line of lines.slice(-100)) {
                try { events.push(JSON.parse(line)) } catch { /* Ignore damaged audit lines. */ }
            }
            return Response.json({ events })
        }
        if (req.method !== 'POST') return Response.json({ error: 'Not found' }, { status: 404 })
        const body = await req.json().catch(() => ({})) as Record<string, unknown>
        const username = String(body.username || '').trim()
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(username)) return Response.json({ error: 'Use a username of 1–64 letters, numbers, dots, underscores, or hyphens' }, { status: 400 })
        if (pathname === '/api/users/create') {
            if (getUser(username)) return Response.json({ error: 'Username already exists' }, { status: 409 })
            const selectedRole = body.role as Role
            if (!ROLES.includes(selectedRole)) return Response.json({ error: 'Choose a role' }, { status: 400 })
            const password = crypto.randomBytes(18).toString('base64url')
            const stored: StoredUser = {
                username, display_name: String(body.display_name || username).trim().slice(0, 100) || username,
                role: selectedRole, enabled: true, password_change_required: true, ...newPasswordRecord(password),
            }
            users.set(username, stored)
            persistUsers()
            audit(actor.username, 'create', username)
            return Response.json({ user: publicAccount(stored), temporary_password: password }, { status: 201 })
        }
        const selected = getUser(username)
        if (!selected) return Response.json({ error: 'User not found' }, { status: 404 })
        if (pathname === '/api/users/update') {
            if (username === 'administrator') return Response.json({ error: 'The built-in administrator cannot be changed here' }, { status: 400 })
            if (body.role !== undefined && !ROLES.includes(body.role as Role)) return Response.json({ error: 'Choose a role' }, { status: 400 })
            if (body.role !== undefined) selected.role = body.role as Role
            if (body.enabled !== undefined) selected.enabled = body.enabled === true
            if (body.display_name !== undefined) selected.display_name = String(body.display_name).trim().slice(0, 100) || username
            persistUsers()
            revoke(username)
            audit(actor.username, 'update', username)
            return Response.json({ user: publicAccount(selected) })
        }
        if (pathname === '/api/users/reset-password') {
            const password = crypto.randomBytes(18).toString('base64url')
            if (username === 'administrator') {
                record = { ...newPasswordRecord(password), temporary: true }
                writePrivate(target, record)
                const stat = fs.statSync(target)
                recordIdentity = `${stat.ino}:${stat.mtimeMs}`
            } else {
                Object.assign(selected, newPasswordRecord(password), { password_change_required: true })
                persistUsers()
            }
            revoke(username)
            audit(actor.username, 'reset_password', username)
            return Response.json({ user: publicAccount(getUser(username)!), temporary_password: password })
        }
        return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return { authenticated, ready, role, account, sameOrigin, route }
}
