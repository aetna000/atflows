const { test, expect } = require('@playwright/test')

test('timeline offers recorded service identities and keeps options when filtered', async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.route('**/api/auth/status', route => route.fulfill({ json: {
        authenticated: true, password_change_required: false,
        account: { id: 'test', username: 'test', role: 'administrator' },
    } }))
    const services = ['atmem', 'codex_cli_rs', 'custom-agent', 'hermes', 'openclaw-gateway']
    await page.route('**/api/timeline/filters', route => route.fulfill({ json: { services } }))
    await page.route('**/api/timeline?*', route => route.fulfill({ json: [
        { id: '1', type: 'log', timestamp: Date.now(), title: 'Recorded event', service_name: 'atmem' },
    ] }))
    await page.goto('/#timeline')
    const filter = page.getByTestId('timeline-tool-filter')
    await expect(filter.locator('option')).toHaveCount(6)
    expect(await filter.locator('option').evaluateAll(opts => opts.map(o => o.value))).toEqual(['', ...services])
    await Promise.all([
        page.waitForRequest(req => new URL(req.url()).searchParams.get('tool') === 'openclaw-gateway'),
        filter.selectOption('openclaw-gateway'),
    ])
    await expect(filter).toHaveValue('openclaw-gateway')
    await expect(filter.locator('option')).toHaveCount(6)
})

async function mockAuth(page) {
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.route('**/api/auth/status', route => route.fulfill({ json: {
        authenticated: true, password_change_required: false,
        account: { id: 'test', username: 'test', role: 'administrator' },
    } }))
}

function event(service) {
    return { id: service, type: 'log', timestamp: Date.now(), title: `Event from ${service}`, service_name: service }
}

test('service option failure does not hide available events', async ({ page }) => {
    await mockAuth(page)
    await page.route('**/api/timeline/filters', route => route.fulfill({ status: 500, json: { error: 'unavailable' } }))
    await page.route(url => url.pathname === '/api/timeline', route => route.fulfill({ json: [event('hermes')] }))
    await page.goto('/#timeline')
    await expect(page.getByText('Event from hermes', { exact: true })).toBeVisible()
    await expect(page.getByTestId('timeline-tool-filter').locator('option[value="hermes"]')).toHaveCount(1)
    await expect(page.getByText('Could not refresh service choices.', { exact: false })).toBeVisible()
})

test('latest selection wins a response race and survives missing service options', async ({ page }) => {
    await mockAuth(page)
    let options = ['agent-a', 'agent-b']
    let releaseOld
    let oldArrived
    const oldStarted = new Promise(resolve => { oldArrived = resolve })
    const oldGate = new Promise(resolve => { releaseOld = resolve })
    await page.route('**/api/timeline/filters', route => route.fulfill({ json: { services: options } }))
    await page.route(url => url.pathname === '/api/timeline', async route => {
        const service = new URL(route.request().url()).searchParams.get('tool') || 'initial'
        if (service === 'agent-b') options = ['agent-a']
        if (service === 'agent-a') { oldArrived(); await oldGate }
        await route.fulfill({ json: [event(service)] })
    })
    await page.goto('/#timeline')
    const filter = page.getByTestId('timeline-tool-filter')
    await expect(filter.locator('option[value="agent-b"]')).toHaveCount(1)
    await filter.selectOption('agent-a')
    await oldStarted
    await filter.selectOption('agent-b')
    await expect(page.getByText('Event from agent-b', { exact: true })).toBeVisible()
    const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('tool') === 'agent-a')
    releaseOld()
    await (await oldResponse).finished()
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await expect(filter).toHaveValue('agent-b')
    await expect(page.getByText('Event from agent-b', { exact: true })).toBeVisible()
    await expect(page.getByText('Event from agent-a', { exact: true })).toHaveCount(0)
})

test('failed item request reports failure rather than displaying the prior selection', async ({ page }) => {
    await mockAuth(page)
    await page.route('**/api/timeline/filters', route => route.fulfill({ json: { services: ['broken', 'hermes'] } }))
    await page.route(url => url.pathname === '/api/timeline', route => {
        const broken = new URL(route.request().url()).searchParams.get('tool') === 'broken'
        return route.fulfill(broken ? { status: 500, json: { error: 'unavailable' } } : { json: [event('hermes')] })
    })
    await page.goto('/#timeline')
    await expect(page.getByText('Event from hermes', { exact: true })).toBeVisible()
    await page.getByTestId('timeline-tool-filter').selectOption('broken')
    await expect(page.getByRole('alert')).toContainText('Could not load events for these filters')
    await expect(page.getByText('Event from hermes', { exact: true })).toHaveCount(0)
})

test('truncated choices allow an exact service name outside the dropdown page', async ({ page }) => {
    await mockAuth(page)
    await page.route('**/api/timeline/filters', route => route.fulfill({ json: { services: ['agent-a'], truncated: true } }))
    await page.route(url => url.pathname === '/api/timeline', route => route.fulfill({ json: [
        event(new URL(route.request().url()).searchParams.get('tool') || 'agent-a'),
    ] }))
    await page.goto('/#timeline')
    const exact = page.getByLabel('Filter by exact service name')
    await exact.fill('z-custom-agent')
    await exact.press('Tab')
    await expect(page.getByText('Event from z-custom-agent', { exact: true })).toBeVisible()
    await expect(page.getByTestId('timeline-tool-filter')).toHaveValue('z-custom-agent')
})
