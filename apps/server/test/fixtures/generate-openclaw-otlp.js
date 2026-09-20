const fs = require('node:fs')
const path = require('node:path')
const { requestType } = require('@atflows/otlp/protobuf')

const timeUnixNano = '1789884000000000000'
const traceId = Buffer.alloc(16, 0x11)
const spanId = Buffer.alloc(8, 0x22)
const resource = { attributes: [{ key: 'service.name', value: { stringValue: 'openclaw-gateway' } }] }
const fixtures = {
    traces: { resourceSpans: [{ resource, scopeSpans: [{ spans: [{ traceId, spanId, name: 'openclaw.model.usage', startTimeUnixNano: timeUnixNano, endTimeUnixNano: '1789884000001000000', attributes: [{ key: 'session.id', value: { stringValue: 'openclaw-test-session' } }, { key: 'gen_ai.request.model', value: { stringValue: 'gpt-test' } }, { key: 'gen_ai.usage.input_tokens', value: { intValue: '12' } }, { key: 'gen_ai.usage.output_tokens', value: { intValue: '5' } }] }] }] }] },
    logs: { resourceLogs: [{ resource, scopeLogs: [{ logRecords: [{ traceId, spanId, timeUnixNano, body: { stringValue: 'model run completed' }, severityNumber: 9 }] }] }] },
    metrics: { resourceMetrics: [{ resource, scopeMetrics: [{ metrics: [{ name: 'openclaw.tokens', gauge: { dataPoints: [{ timeUnixNano, asInt: '7' }] } }] }] }] },
}

for (const [signal, payload] of Object.entries(fixtures)) {
    fs.writeFileSync(path.join(__dirname, `openclaw-${signal}.pb`), requestType(signal).encode(payload).finish())
}
