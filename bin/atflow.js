#!/usr/bin/env bun

process.env.ATFLOWS_COMMAND_ALIAS = 'atflow'
await import('./atflows.js')
