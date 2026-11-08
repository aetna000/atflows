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
        const favicon = await page.request.get('/favicon.svg')
        expect(await favicon.text()).toContain('#F3A2B4')
        await page.goto('/')
        await expect(page.locator('h1.logo')).toBeVisible()
        await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme)
        await expect(page.locator('.atmem-dot').first()).toHaveCSS('fill', 'rgb(243, 162, 180)')
        await page.screenshot({path: `test-results/pink-${theme}.png`, fullPage: true})
        const styles = await page.evaluate(() => {
            const read = (selector) => {
                const style = getComputedStyle(document.querySelector(selector))
                return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, spacing: style.letterSpacing, line: style.lineHeight }
            }
            return { body: read('body'), logo: read('h1.logo'), navigation: read('.tab'), menu: read('.nav-menu > summary') }
        })
        // Architecture Canvas: DM Sans body and navigation, Manrope display headings.
        expect(styles.body.family).toBe('"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif')
        expect(styles.body.size).toBe('15px')
        expect(styles.body.line).toBe('22.5px')
        expect(styles.logo.family.replaceAll('"', '')).toBe('Manrope, DM Sans, ui-sans-serif, system-ui, sans-serif')
        expect(styles.logo.size).toBe('16px')
        expect(styles.logo.weight).toBe('800')
        expect(styles.navigation.family).toBe(styles.body.family)
        expect(styles.menu.family).toBe(styles.body.family)
    })
}
