const { test, expect } = require('@playwright/test')

test('grouped event bars filter the list and preserve unknown identities', async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.route('**/api/auth/status', route => route.fulfill({ json: {
        authenticated: true, password_change_required: false,
        account: { id: 'chart-test', username: 'chart-test', role: 'administrator' },
    } }))
    await page.route('**/api/timeline/filters', route => route.fulfill({ json: { services: ['codex'] } }))
    await page.route('**/api/timeline?*', route => route.fulfill({ json: [
        { id: '1', type: 'log', timestamp: 1720000000000, title: 'First event', tool: 'codex', model: 'model-a' },
        { id: '2', type: 'log', timestamp: 1720000001000, title: 'Second event', tool: 'codex', model: 'model-b' },
        { id: '3', type: 'log', timestamp: 1720000002000, title: 'Third event' },
    ] }))
    await page.goto('/')
    const overview = page.getByRole('region', { name: 'Event overview' })
    await expect(overview).toContainText('3 loaded events')
    await overview.getByRole('button', { name: 'codex: 2 events', exact: true }).click()
    await expect(page.locator('.timeline-item')).toHaveCount(2)
    await overview.getByRole('button', { name: 'Show all loaded events' }).click()
    await expect(page.locator('.timeline-item')).toHaveCount(3)
    await overview.getByLabel('Group by').selectOption('model')
    await overview.getByRole('button', { name: 'Not recorded: 1 events', exact: true }).click()
    await expect(page.locator('.timeline-item')).toHaveCount(1)
    await expect(page.locator('.timeline-item')).toContainText('Third event')
    await overview.getByLabel('Group by').selectOption('hour')
    await expect(page.locator('.timeline-item')).toHaveCount(3)
    await expect(overview.locator('.group-bars button')).toHaveCount(1)
})
