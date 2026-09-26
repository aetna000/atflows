import { HermesStore, validateHermes, HermesConflict } from '../../../packages/db/src/hermes'

export async function boundedJson(req: Request): Promise<unknown> {
    if (Number(req.headers.get('content-length')) > 8192) throw Error('invalid_request')
    const reader = req.body?.getReader()
    if (!reader) throw Error('invalid_request')
    const chunks: Uint8Array[] = []
    let size = 0
    const timer = setTimeout(() => { void reader.cancel() }, 2000)
    try {
        while (true) {
            const part = await reader.read()
            if (part.done) break
            size += part.value.length
            if (size > 8192) throw Error('invalid_request')
            chunks.push(part.value)
        }
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))
    } finally { clearTimeout(timer); void reader.cancel() }
}

export function hermesReceiver(store: HermesStore, changed: () => void = () => {}) {
    let pending = 0
    return async (req: Request, peer: string): Promise<Response> => {
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer) || req.headers.has('origin')) return Response.json({ error: 'local_producer_only' }, { status: 403 })
        if (req.method !== 'POST') return new Response(null, { status: 405 })
        const supplied = req.headers.get('authorization') || ''
        const connection = /^Bearer [a-f0-9]{64}$/.test(supplied) ? store.authenticate(supplied.slice(7)) : null
        if (!connection) return Response.json({ error: 'producer_credential_required' }, { status: 401 })
        if (pending >= 16) return Response.json({ error: 'receiver_busy' }, { status: 503 })
        pending++
        try {
            let event
            try { event = validateHermes(await boundedJson(req), connection) }
            catch { return Response.json({ error: 'invalid_event' }, { status: 400 }) }
            try {
                const result = store.ingest(event)
                if (!result.duplicate) changed()
                return Response.json(result)
            } catch (error) {
                return Response.json({ error: error instanceof HermesConflict ? 'conflicting_event' : 'storage_unavailable_or_revoked' }, { status: error instanceof HermesConflict ? 409 : 503 })
            }
        } finally { pending-- }
    }
}
