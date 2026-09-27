#!/usr/bin/env bun

/**
 * AtFlows CLI
 *
 * Usage:
 *   npx atflows          # Start the server
 *   npx atflows --help   # Show help
 *
 * Requires Bun runtime: https://bun.sh
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))

const args = process.argv.slice(2)
const invokedAs = process.env.ATFLOWS_COMMAND_ALIAS || path.basename(process.argv[1]).replace(/\.js$/, '')

async function showStatus() {
    const directory = process.env.ATFLOWS_STATE_DIR || path.join(os.homedir(), '.cache', 'atflows', 'instances')
    const running = []
    for (const name of fs.existsSync(directory) ? fs.readdirSync(directory).filter((entry) => entry.endsWith('.json')) : []) {
        try {
            const item = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))
            const check = async (port, route) => {
                if (!Number.isInteger(port) || port < 1 || port > 65535) return false
                const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(400) })
                const body = await response.json()
                return response.ok && body.status === 'ok' && body.instance_id === item.instance_id
            }
            const [dashboard, proxy] = await Promise.allSettled([check(item.dashboard_port, '/api/health'), check(item.proxy_port, '/health')])
            const dashboardOnline = dashboard.status === 'fulfilled' && dashboard.value
            const proxyOnline = proxy.status === 'fulfilled' && proxy.value
            if (dashboardOnline || proxyOnline) running.push({ ...item, dashboardOnline, proxyOnline })
        } catch { /* stale or malformed instance record */ }
    }
    if (!running.length) return console.log('No AtFlows servers are running.')
    console.log(`AtFlows servers running: ${running.length}`)
    for (const item of running) {
        console.log(`PID ${item.pid}  Dashboard: ${item.dashboardOnline ? `http://localhost:${item.dashboard_port}` : 'unavailable'}  Proxy: ${item.proxyOnline ? `http://localhost:${item.proxy_port}` : 'unavailable'}`)
    }
}

if (args.length === 1 && args[0] === 'status' || args.length === 0 && invokedAs === 'atflow') {
    showStatus().catch((error) => { console.error(error.message); process.exitCode = 1 })
} else {
if (args.length === 1 && args[0] === 'start') args.length = 0

// Help text
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AtFlows - Local LLM Observability

Usage:
  atflows [status|start|options]
  atflow [status|start|options]

Options:
  --help, -h      Show this help message
  --version, -v   Show version number

Commands:
  connect hermes  preview|status --endpoint URL [--home PATH]; apply --preview ID; undo [--home PATH]
  status          Show running dashboard and proxy listeners
  start           Start another AtFlows server

Environment Variables:
  PROXY_PORT      Proxy port (default: 8080)
  DASHBOARD_PORT  Dashboard port (default: 1337)
  DATA_DIR        Data directory (default: ~/.atflows)
  MAX_TRACES      Max traces to retain (default: 10000)
  VERBOSE         Enable verbose logging (0 or 1)

Examples:
  npx atflows                           # Start with defaults
  npx atflow status                     # Show running servers
  PROXY_PORT=9000 npx atflows           # Custom proxy port
  VERBOSE=1 npx atflows                 # Verbose logging

Dashboard: http://localhost:1337
Proxy:     http://localhost:8080

Point your OpenAI SDK at the proxy:
  client = OpenAI(base_url="http://localhost:8080/v1")

Requires Bun runtime: https://bun.sh
`)
    process.exit(0)
}

// Version
if (args.includes('--version') || args.includes('-v')) {
    console.log(`atflows v${pkg.version}`)
    process.exit(0)
}

const connectingHermes = args[0] === 'connect' && args[1] === 'hermes'
const serverFile = connectingHermes
    ? path.join(__dirname, '..', 'packages/integrations/src/hermes-cli.ts')
    : path.join(__dirname, '..', 'apps', 'server', 'src', 'server.ts')
if (connectingHermes) args.splice(0, 2)

// Verify server file exists
if (!fs.existsSync(serverFile)) {
    console.error('Error: apps/server/src/server.ts not found at', serverFile)
    process.exit(1)
}

// Print startup banner
console.log(`\n\x1b[34mAtFlows\x1b[0m - Local LLM observability v${pkg.version}\n`)

// Start the server with Bun
const server = spawn('bun', ['run', serverFile, ...args], {
    stdio: 'inherit',
    env: process.env,
})

server.on('error', (err) => {
    if (err.code === 'ENOENT') {
        console.error('Error: Bun is required but not found.')
        console.error('Install Bun: curl -fsSL https://bun.sh/install | bash')
        process.exit(1)
    }
    console.error('Failed to start server:', err.message)
    process.exit(1)
})

server.on('close', (code) => {
    process.exit(code || 0)
})

// Forward signals
process.on('SIGINT', () => server.kill('SIGINT'))
process.on('SIGTERM', () => server.kill('SIGTERM'))
}
