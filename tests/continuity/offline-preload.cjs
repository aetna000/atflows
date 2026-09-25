// Test-only network guard. Never loaded by the shipped launcher.
const fs = require('node:fs')
const http = require('node:http')
const https = require('node:https')
const net = require('node:net')
const dns = require('node:dns')
const os = require('node:os')

// Explicit DATA_DIR/DB_PATH/ATFLOWS_STATE_DIR must avoid all home fallbacks.
os.homedir = function () {
    fs.appendFileSync(process.env.CONTINUITY_GUARD_REPORT, 'home_fallback_denied\n')
    throw new Error('Continuity fixture must not resolve the real home directory')
}

function denied() {
    fs.appendFileSync(process.env.CONTINUITY_GUARD_REPORT, 'external_connection_denied\n')
    throw new Error('Continuity offline probe forbids external connections')
}

function checkHost(host) {
    if (!['127.0.0.1', '::1', '[::1]'].includes(host)) denied()
}

function checkTarget(target) {
    if (target === 'disabled:continuity-fixture') throw new Error('Pricing refresh disabled')
    if (typeof target === 'string' || target instanceof URL) {
        checkHost(new URL(target).hostname)
    } else {
        checkHost(target?.hostname || target?.host)
    }
}

const originalFetch = globalThis.fetch
globalThis.fetch = function (input, options) {
    checkTarget(input instanceof Request ? input.url : input)
    return originalFetch(input, { ...options, redirect: 'error' })
}
for (const module of [http, https]) {
    for (const method of ['get', 'request']) {
        const original = module[method]
        module[method] = function (target, ...args) {
            checkTarget(target)
            return original.call(this, target, ...args)
        }
    }
}
const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
    const value = args[0]
    checkHost(typeof value === 'object' ? value.host : args[1])
    return originalConnect.apply(this, args)
}
const originalLookup = dns.lookup
dns.lookup = function (hostname, ...args) {
    checkHost(hostname)
    return originalLookup.call(this, hostname, ...args)
}
