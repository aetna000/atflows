const credential =
    /(?:bearer|password|secret|api[_-]?key|authorization)|(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_-]*|eyJ[A-Za-z0-9_-]+\./i

// Metadata label policy, not a detector for arbitrary secrets in arbitrary text.
function safeLabel(value) {
    return typeof value === 'string' &&
        value.length <= 128 &&
        /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value) &&
        !credential.test(value)
        ? value
        : 'other'
}

const MARKER = '[REDACTED]'
const REJECTED = 'telemetry_rejected'
const LIMITS = Object.freeze({
    depth: 32,
    nodes: 20000,
    bytes: 2 * 1024 * 1024,
    string: 256 * 1024,
})
const sensitive =
    /(?:^|[._-])(?:authorization|proxy.authorization|cookie|set.cookie|password|passwd|api.key|x.api.key|x.goog.api.key|secret|client.secret|access.token|refresh.token|id.token|session.token|token|credential|private.key)$/i

function sensitiveKey(key) {
    const compact = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
    return (
        sensitive.test(key) ||
        [
            'authorization',
            'proxyauthorization',
            'cookie',
            'setcookie',
            'password',
            'passwd',
            'apikey',
            'xapikey',
            'xgoogapikey',
            'secret',
            'clientsecret',
            'accesstoken',
            'refreshtoken',
            'idtoken',
            'sessiontoken',
            'token',
            'credential',
            'privatekey',
            'awssecretaccesskey',
            'awsaccesskeyid',
            'connectionstring',
        ].includes(compact)
    )
}

function redactText(text) {
    return text
        .replace(
            /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g,
            MARKER,
        )
        .replace(
            /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[A-Z0-9]{16})\b/g,
            MARKER,
        )
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, MARKER)
        .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9_.~+/=-]+/gi, MARKER)
        .replace(/https?:\/\/[^\s<>"']+/gi, (value) => {
            try {
                const url = new URL(value)
                let changed = false
                if (url.username || url.password) {
                    url.username = 'REDACTED'
                    url.password = ''
                    changed = true
                }
                for (const key of [...url.searchParams.keys()]) {
                    if (sensitiveKey(key)) {
                        url.searchParams.set(key, MARKER)
                        changed = true
                    }
                }
                return changed ? url.toString() : value
            } catch {
                return MARKER
            }
        })
        .replace(
            /(\b(?:password|passwd|api[_-]?key|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|token|authorization)["']?\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s,;&}\]]+)/gi,
            '$1' + MARKER,
        )
}

function redactTelemetry(input) {
    let nodes = 0,
        bytes = 0
    const parents = new Set()
    function charge(text) {
        bytes += Buffer.byteLength(text)
        if (bytes > LIMITS.bytes) throw new Error(REJECTED)
    }
    function visit(value, depth) {
        if (++nodes > LIMITS.nodes || depth > LIMITS.depth) throw new Error(REJECTED)
        if (value === null || typeof value === 'boolean') return value
        if (typeof value === 'number' && Number.isFinite(value)) return value
        if (typeof value === 'string') {
            if (Buffer.byteLength(value) > LIMITS.string) throw new Error(REJECTED)
            charge(value)
            const trimmed = value.trim()
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                let embedded
                try {
                    embedded = JSON.parse(trimmed)
                } catch {
                    /* ordinary text */
                }
                if (embedded && typeof embedded === 'object')
                    return JSON.stringify(visit(embedded, depth + 1))
            }
            return redactText(value)
        }
        if (!value || typeof value !== 'object' || parents.has(value)) throw new Error(REJECTED)
        const prototype = Object.getPrototypeOf(value)
        if (Array.isArray(value) && value.length > LIMITS.nodes) throw new Error(REJECTED)
        if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
            throw new Error(REJECTED)
        parents.add(value)
        try {
            const descriptors = Object.getOwnPropertyDescriptors(value)
            const result = Array.isArray(value) ? [] : Object.create(null)
            // OTLP attributes represent sensitive field names as data.
            const attributeKey = descriptors.key?.value
            const secretAttribute = typeof attributeKey === 'string' && sensitiveKey(attributeKey)
            for (const key of Reflect.ownKeys(descriptors)) {
                if (typeof key !== 'string') throw new Error(REJECTED)
                if (Array.isArray(value) && key === 'length') continue
                charge(key)
                const descriptor = descriptors[key]
                if (!('value' in descriptor)) throw new Error(REJECTED)
                // Match JSON's omitted optional fields without invoking accessors.
                if (descriptor.value === undefined) continue
                const cleanedKey = redactText(key)
                const cleaned =
                    sensitiveKey(key) || (secretAttribute && key === 'value')
                        ? secretAttribute && key === 'value'
                            ? { stringValue: MARKER }
                            : MARKER
                        : visit(descriptor.value, depth + 1)
                Object.defineProperty(result, cleanedKey, {
                    value: cleaned,
                    enumerable: true,
                    configurable: true,
                    writable: true,
                })
            }
            return result
        } finally {
            parents.delete(value)
        }
    }
    try {
        return visit(input, 0)
    } catch {
        throw new Error(REJECTED)
    }
}

module.exports = { safeLabel, redactTelemetry, redactText, sensitiveKey, LIMITS, REJECTED }
