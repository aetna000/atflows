import type { Account, Role } from './auth'

const ROLES: Role[] = ['viewer', 'investigator', 'evidence_collector', 'administrator']

type AtMemStatus = {
    format: string
    authenticated: boolean
    account: Account | null
    csrf_token: string | null
}

export function createAtMemAuth(rawOrigin: string, dashboardHost: string) {
    const parsed = new URL(rawOrigin)
    if (parsed.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(parsed.hostname) ||
        !parsed.port || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash ||
        dashboardHost !== parsed.hostname) {
        throw new Error('ATFLOWS_ATMEM_AUTH_URL must be a loopback HTTP origin on the same host as the AtFlows dashboard')
    }
    const origin = parsed.origin

    function sessionCookie(req: Request): string | null {
        const values = req.headers.get('cookie')?.split(';').map((part) => part.trim()) || []
        const value = values.find((part) => part.startsWith('atmem_session='))?.slice('atmem_session='.length)
        return value && /^[A-Za-z0-9_-]{20,256}$/.test(value) ? `atmem_session=${value}` : null
    }

    async function status(req: Request): Promise<AtMemStatus | null> {
        const cookie = sessionCookie(req)
        if (!cookie) return null
        try {
            const response = await fetch(`${origin}/api/auth/status`, {
                headers: { Cookie: cookie },
                redirect: 'manual',
                signal: AbortSignal.timeout(2000),
            })
            if (!response.ok) return null
            const value = await response.json() as AtMemStatus
            if (value.format !== 'atmem-local-auth-status-v1' || value.authenticated !== true ||
                !value.account || !ROLES.includes(value.account.role) ||
                typeof value.account.username !== 'string' || typeof value.account.enabled !== 'boolean' ||
                typeof value.account.password_change_required !== 'boolean' || !value.account.enabled) return null
            return value
        } catch {
            return null
        }
    }

    async function account(req: Request): Promise<Account | null> {
        return (await status(req))?.account || null
    }

    function sameOrigin(req: Request) {
        return req.headers.get('origin') === new URL(req.url).origin
    }

    async function route(req: Request): Promise<Response | null> {
        const pathname = new URL(req.url).pathname
        if (pathname === '/api/auth/status' && req.method === 'GET') {
            const user = await account(req)
            return Response.json({
                authenticated: !!user,
                password_change_required: !!user?.password_change_required,
                account: user,
                mode: 'atmem',
                sign_in_url: origin,
            }, { headers: { 'Cache-Control': 'no-store' } })
        }
        if (pathname === '/api/auth/login' || pathname === '/api/auth/change-password') {
            return Response.json({ error: 'Sign in and manage passwords in AtMem', sign_in_url: origin }, { status: 409 })
        }
        if (pathname === '/api/auth/logout' && req.method === 'POST') {
            if (!sameOrigin(req)) return Response.json({ error: 'Origin check failed' }, { status: 403 })
            const current = await status(req)
            const cookie = sessionCookie(req)
            if (!current || !cookie || !current.csrf_token) return Response.json({ error: 'Sign in required' }, { status: 401 })
            try {
                const response = await fetch(`${origin}/api/auth/logout`, {
                    method: 'POST',
                    headers: { Cookie: cookie, Origin: origin, 'X-CSRF-Token': current.csrf_token, 'Content-Type': 'application/json' },
                    body: '{}',
                    redirect: 'manual',
                    signal: AbortSignal.timeout(2000),
                })
                if (!response.ok) return Response.json({ error: 'AtMem sign-out failed' }, { status: 503 })
                return Response.json({ authenticated: false }, {
                    headers: { 'Set-Cookie': 'atmem_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' },
                })
            } catch {
                return Response.json({ error: 'AtMem is unavailable' }, { status: 503 })
            }
        }
        if (pathname.startsWith('/api/users')) {
            const user = await account(req)
            if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 })
            if (user.role !== 'administrator' || user.password_change_required) return Response.json({ error: 'Administrator access required' }, { status: 403 })
            return Response.json({ error: 'Manage users in AtMem', sign_in_url: origin }, { status: 409 })
        }
        return null
    }

    return { account, route, sameOrigin, origin }
}
