// @ts-check
const { test, expect } = require('@playwright/test')
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })

for (const theme of ['light', 'dark']) {
    test(`AtMem typography contract (${theme})`, async ({ page }) => {
        // Typography-only fixture: no production credentials or auth mutations.
        await page.route('**/api/**', route => route.fulfill({ json: {} }))
        await page.route('**/api/auth/status', route => route.fulfill({ json: {
            authenticated: true, password_change_required: false,
            account: { id: 'typography', username: 'typography', role: 'administrator' },
        } }))
        await page.goto('/')
        await expect(page.locator('h1.logo')).toBeVisible()
        await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme)
        const styles = await page.evaluate(() => {
            const read = (selector) => {
                const style = getComputedStyle(document.querySelector(selector))
                return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, spacing: style.letterSpacing, line: style.lineHeight }
            }
            return { body: read('body'), logo: read('h1.logo'), navigation: read('.tab'), menu: read('.nav-menu > summary') }
        })
        expect(styles.body.family).toBe('Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif')
        expect(styles.body.size).toBe('15px')
        expect(styles.body.line).toBe('22.5px')
        expect(styles.logo.family.replaceAll('"', '')).toBe('ui-monospace, SFMono-Regular, Consolas, monospace')
        expect(styles.logo.size).toBe('16px')
        expect(styles.logo.weight).toBe('600')
        expect(['normal', '0px']).toContain(styles.logo.spacing)
        expect(styles.navigation.family).toBe(styles.logo.family)
        expect(styles.menu.family).toBe(styles.logo.family)
    })
}
