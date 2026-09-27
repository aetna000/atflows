// @ts-check
const { test, expect } = require('@playwright/test')

test.describe('Logs Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#logs')
        await expect(page.locator('[data-testid="logs-body"] tr').first()).toBeVisible()
    })

    test('displays seeded logs', async ({ page }) => {
        const body = page.locator('[data-testid="logs-body"]')
        await expect(body).toContainText('E2E')
        expect(await body.locator('tr').count()).toBeGreaterThan(0)
    })

    test('search filter works', async ({ page }) => {
        const response = page.waitForResponse(
            (item) => item.url().includes('/api/logs') && item.status() === 200,
        )
        await page.getByRole('textbox', { name: 'Search logs' }).fill('E2E_LOG_MATCH_1')
        await response
        await expect(page.locator('[data-testid="logs-body"]')).toContainText('E2E_LOG_MATCH_1')
        await expect(page.locator('[data-testid="logs-body"]')).not.toContainText('E2E_LOG_MATCH_2')
    })

    test('service filter loads and filters logs', async ({ page }) => {
        const service = page.getByRole('combobox', { name: 'Service' })
        await expect(service.locator('option')).toHaveCount(3)
        const response = page.waitForResponse(
            (item) => item.url().includes('/api/logs') && item.status() === 200,
        )
        await service.selectOption('svc-e2e-a')
        await response
        const services = await page.locator('[data-testid="logs-body"] tr td:nth-child(3)').allTextContents()
        expect(services.length).toBeGreaterThan(0)
        expect(services.every((name) => name === 'svc-e2e-a')).toBeTruthy()
    })

    test('event filter loads expected options', async ({ page }) => {
        const event = page.getByRole('combobox', { name: 'Event' })
        await expect(event.locator('option')).toHaveCount(3)
        await expect(event.locator('option')).toContainText(['All events', 'e2e-event-bar', 'e2e-event-foo'])
    })

    test('clear restores log filters', async ({ page }) => {
        const search = page.getByRole('textbox', { name: 'Search logs' })
        await search.fill('E2E_LOG_MATCH_1')
        await page.getByRole('button', { name: 'Clear', exact: true }).click()
        await expect(search).toHaveValue('')
        await expect(page.getByRole('combobox', { name: 'Service' })).toHaveValue('')
        await expect(page.getByRole('combobox', { name: 'Event' })).toHaveValue('')
    })

    test('clicking a log opens its evidence detail', async ({ page }) => {
        const row = page.locator('[data-testid="logs-body"] tr').first()
        const body = await row.locator('td').nth(3).textContent()
        await row.click()
        const detail = page.locator('aside.log-detail')
        await expect(detail).toBeVisible()
        await expect(detail.getByRole('heading', { name: 'Log detail' })).toBeVisible()
        await expect(detail).toContainText(body || '')
        await expect(detail.locator('pre')).toContainText('service_name')
    })
})
