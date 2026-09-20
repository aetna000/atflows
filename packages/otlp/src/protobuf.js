const root = require('@opentelemetry/otlp-proto-exporter-base/build/src/generated/root.js')

const services = {
    traces: root.opentelemetry.proto.collector.trace.v1,
    logs: root.opentelemetry.proto.collector.logs.v1,
    metrics: root.opentelemetry.proto.collector.metrics.v1,
}
const names = { traces: 'Trace', logs: 'Logs', metrics: 'Metrics' }
const idFields = new Set(['traceId', 'spanId', 'parentSpanId'])

function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize)
    if (!value || typeof value !== 'object') return value
    for (const [key, item] of Object.entries(value)) {
        if (idFields.has(key) && typeof item === 'string') {
            value[key] = Buffer.from(item, 'base64').toString('hex')
        } else {
            value[key] = normalize(item)
        }
    }
    return value
}

function requestType(signal) {
    return services[signal][`Export${names[signal]}ServiceRequest`]
}

function responseType(signal) {
    return services[signal][`Export${names[signal]}ServiceResponse`]
}

function decodeExport(signal, bytes) {
    const type = requestType(signal)
    const decoded = type.decode(bytes)
    return normalize(type.toObject(decoded, { longs: String, bytes: String, enums: Number }))
}

function encodeResponse(signal, rejected = 0, errorMessage = '') {
    const fields = { traces: 'rejectedSpans', logs: 'rejectedLogRecords', metrics: 'rejectedDataPoints' }
    const value = rejected || errorMessage
        ? { partialSuccess: { [fields[signal]]: rejected, errorMessage } }
        : {}
    return responseType(signal).encode(value).finish()
}

module.exports = { decodeExport, encodeResponse, requestType, responseType }
