import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const SESSION_MS = 24 * 60 * 60 * 1000
const COOKIE = 'atflows_session'
const sessions = new Map<string, number>()
const attempts = new Map<string, { count: number; until: number }>()

function passwordDigest(password: string, salt: string) {
    return crypto.scryptSync(password, salt, 64).toString('hex')
}

export function createLocalAuth(dataDir: string) {
    const target = path.join(dataDir, 'admin-auth.json')
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 })
    let record: { salt: string; digest: string }
    if (fs.existsSync(target)) {
        record = JSON.parse(fs.readFileSync(target, 'utf8'))
        if (process.env.ATFLOWS_ADMIN_PASSWORD) {
            const replacement = passwordDigest(process.env.ATFLOWS_ADMIN_PASSWORD, record.salt)
            if (replacement !== record.digest) {
                record.digest = replacement
                fs.writeFileSync(target, JSON.stringify(record), { mode: 0o600 })
                sessions.clear()
            }
        }
    } else {
        const password = process.env.ATFLOWS_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url')
        record = { salt: crypto.randomBytes(16).toString('hex'), digest: '' }
        record.digest = passwordDigest(password, record.salt)
        fs.writeFileSync(target, JSON.stringify(record), { flag: 'wx', mode: 0o600 })
        if (!process.env.ATFLOWS_ADMIN_PASSWORD) {
            process.stdout.write(`[atflows] Local Administrator password (shown once): ${password}\n`)
        }
    }

    function token(req: Request) {
        return req.headers.get('cookie')?.split(';').map((part) => part.trim())
            .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || ''
    }

    function authenticated(req: Request) {
        const value = token(req)
        const expires = sessions.get(value)
        if (!value || !expires) return false
        if (expires <= Date.now()) { sessions.delete(value); return false }
        return true
    }

    function sameOrigin(req: Request) {
        return req.headers.get('origin') === new URL(req.url).origin
    }

    function cookie(value: string, req: Request, maxAge: number) {
        return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`
    }

    async function route(req: Request, peerAddress: string): Promise<Response | null> {
        const pathname = new URL(req.url).pathname
        if (pathname === '/api/auth/status' && req.method === 'GET') {
            return Response.json({ authenticated: authenticated(req), account: authenticated(req) ? { display_name: 'Local Administrator', role: 'Administrator' } : null })
        }
        if (pathname === '/api/auth/login' && req.method === 'POST') {
            if (!sameOrigin(req)) return Response.json({ error: 'Origin check failed' }, { status: 403 })
            const limit = attempts.get(peerAddress)
            if (limit && limit.count >= 5 && limit.until > Date.now()) return Response.json({ error: 'Try again in a minute' }, { status: 429 })
            const body = await req.json().catch(() => ({})) as { username?: string; password?: string }
            const actual = Buffer.from(passwordDigest(String(body.password || ''), record.salt), 'hex')
            const expected = Buffer.from(record.digest, 'hex')
            if (body.username !== 'administrator' || !crypto.timingSafeEqual(actual, expected)) {
                attempts.set(peerAddress, { count: (limit && limit.until > Date.now() ? limit.count : 0) + 1, until: Date.now() + 60_000 })
                return Response.json({ error: 'Incorrect username or password' }, { status: 401 })
            }
            attempts.delete(peerAddress)
            const session = crypto.randomBytes(32).toString('base64url')
            sessions.set(session, Date.now() + SESSION_MS)
            return Response.json({ authenticated: true, account: { display_name: 'Local Administrator', role: 'Administrator' } }, { headers: { 'Set-Cookie': cookie(session, req, SESSION_MS / 1000) } })
        }
        if (pathname === '/api/auth/logout' && req.method === 'POST') {
            if (!sameOrigin(req) || !authenticated(req)) return Response.json({ error: 'Not authorized' }, { status: 401 })
            sessions.delete(token(req))
            return Response.json({ authenticated: false }, { headers: { 'Set-Cookie': cookie('', req, 0) } })
        }
        return null
    }

    return { authenticated, sameOrigin, route }
}
