/**
 * Playwright Global Setup
 *
 * Note: Database seeding is now handled by start-test-server.js
 * to ensure the server and seeding happen in the correct order.
 */

const path = require('path')
const { request } = require('@playwright/test')

async function globalSetup() {
    const baseURL = 'http://127.0.0.1:3001'
    const context = await request.newContext({ baseURL })
    const response = await context.post('/api/auth/login', {
        headers: { Origin: baseURL },
        data: {
            username: 'administrator',
            password: 'atflows-isolated-e2e-only',
        },
    })

    if (!response.ok()) {
        throw new Error(`Playwright administrator sign-in failed: ${response.status()}`)
    }

    await context.storageState({
        path: path.join(__dirname, '../../test-data/playwright-auth.json'),
    })
    await context.dispose()
    console.log('✓ Global setup complete (seeded server and authenticated browser state)')
}

module.exports = globalSetup
