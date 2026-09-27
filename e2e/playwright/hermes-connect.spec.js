const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

test('Hermes real preview/apply/status/undo preserves model and memory', async ({ page }) => {
    const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'atflows-ui-hermes-')))
    const before = 'model: unchanged-model\nmemory:\n  provider: atmem\n'
    fs.writeFileSync(path.join(home, 'config.yaml'), before, { mode: 0o600 })
    try {
        const login = await page.request.post('/api/auth/login', {
            headers: { Origin: 'http://127.0.0.1:3001' }, data: { username: 'administrator', password: 'atflows-isolated-e2e-only' },
        })
        expect(login.status()).toBe(200)
        await page.goto('/#connect')
        await page.getByLabel('Find a tool or provider').fill('hermes')
        await page.getByRole('button', { name: /Hermes.*Working/ }).click()
        await page.getByLabel('Hermes Home (optional)').fill(home)
        await page.getByRole('button', { name: 'Review Hermes setup' }).click()
        await expect(page.getByRole('heading', { name: 'Review before applying' })).toBeVisible()
        await page.getByRole('button', { name: 'Apply Hermes setup' }).click()
        await expect(page.getByText('awaiting traffic', { exact: true })).toBeVisible()
        expect(fs.readFileSync(path.join(home, 'config.yaml'), 'utf8')).toContain(before)
        const credential = JSON.parse(fs.readFileSync(path.join(home, 'plugins/atflows/connection.json'), 'utf8'))
        expect(await page.content()).not.toContain(credential.token)
        page.on('dialog', dialog => dialog.accept())
        await page.getByRole('button', { name: 'Undo Hermes setup' }).click()
        await expect(page.getByText('not configured', { exact: true })).toBeVisible()
        expect(fs.readFileSync(path.join(home, 'config.yaml'), 'utf8')).toBe(before)
    } finally { fs.rmSync(home, { recursive: true }) }
})
