import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const atmem = process.argv[2]
if (!atmem) throw new Error('Supply the AtMem source directory')
const directory = mkdtempSync(join(tmpdir(), 'continuity-ui-'))
const server = spawn(join(atmem, '.venv/bin/python'), [join(atmem, 'tests/continuity_dashboard_fixture.py'), join(directory, 'atmem')], {
  cwd: atmem, env: { ...process.env, ATMEM_HOME: join(directory, 'home'), PYTHON_DOTENV_DISABLED: '1', PYTHONPATH: atmem }, stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.resume()
const ready = new Promise((resolve, reject) => {
  let buffer = ''
  server.stdout.on('data', data => { buffer += data; if (buffer.includes('\n')) { try { resolve(JSON.parse(buffer.split('\n')[0])) } catch { reject(new Error('Invalid startup record')) } } })
  server.on('exit', () => reject(new Error('Fixture exited before ready')))
})
let browser
let flows
try {
  const credentials = await Promise.race([ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Startup timeout')), 15000))])
  browser = await chromium.launch({ headless: true, executablePath: process.env.CONTINUITY_CHROMIUM })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort()
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(credentials.url)
  await page.evaluate(async ({password}) => {
    const response = await fetch('/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'administrator',password})})
    if (!response.ok) throw new Error('Fixture login failed')
  }, credentials)
  await page.reload()
  await page.locator('#navDecisions').click()
  await page.getByRole('button', { name: /Resume work/ }).click()
  await page.getByText('Publish-course-notes', {exact:true}).waitFor()
  await page.locator('#continuityWorkflows summary').filter({hasText:'publish'}).click()
  await page.getByText('Receipt: host-reported outcome, not independent destination verification.', {exact:true}).waitFor()
  await page.screenshot({path:join(directory,'atmem-desktop.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:join(directory,'atmem-mobile.png'),fullPage:true})
  const flowsRoot = fileURLToPath(new URL('../../', import.meta.url))
  flows = spawn('bun', ['--no-env-file', '--preload', join(flowsRoot,'tests/continuity/offline-preload.cjs'), join(flowsRoot,'apps/server/src/server.ts')], {
    cwd:directory, env:{PATH:process.env.PATH, DATA_DIR:join(directory,'flows'), DB_PATH:join(directory,'flows.db'),
      ATFLOWS_STATE_DIR:join(directory,'instances'), ATFLOWS_ADMIN_PASSWORD:credentials.password,
      ATFLOWS_CONTINUITY_TOKEN:credentials.password, DASHBOARD_HOST:'127.0.0.1', PROXY_HOST:'127.0.0.1',
      DASHBOARD_PORT:'0', PROXY_PORT:'0', PRICING_URL:'disabled:continuity-fixture', OTLP_EXPORT_ENABLED:'false',
      CONTINUITY_GUARD_REPORT:join(directory,'guard.txt')}, stdio:['ignore','pipe','pipe'],
  })
  flows.stderr.resume()
  const flowsUrl = await new Promise((resolve,reject) => {
    let buffer = ''
    flows.stdout.on('data', data => { buffer += data; const match=buffer.match(/\[atflows\] Dashboard: (http:\/\/127\.0\.0\.1:\d+)/); if(match)resolve(match[1]); if(buffer.length>65536)buffer=buffer.slice(-8192) })
    flows.on('exit', () => reject(new Error('AtFlows fixture startup failed')))
    setTimeout(()=>reject(new Error('AtFlows fixture startup timed out')),15000)
  })
  const event={format:'atmem.continuity.v1',event_id:'e1',workflow_id:'wf_ui_fixture',operation_id:'op_ui_fixture',run_id:'run_ui_fixture',attempt_id:'attempt_ui_fixture',event:'completed',time:Date.now()/1000,retry:true,recovery:true,charge_id:'charge_ui_fixture',charge_source:'ui-fixture',cost_microusd:4500,price_source:'ui-fixture-not-benchmark'}
  const ingested = await fetch(flowsUrl+'/v1/continuity/events',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+credentials.password},body:JSON.stringify(event)})
  if(!ingested.ok)throw new Error('AtFlows fixture event rejected')
  await page.setViewportSize({width:1440,height:1000})
  await page.goto(flowsUrl)
  await page.evaluate(async ({password}) => {
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'administrator',password})})
    if(!response.ok)throw new Error('AtFlows fixture login failed')
  }, credentials)
  await page.reload()
  await page.locator('summary').filter({hasText:'Activity'}).click()
  await page.getByRole('button',{name:'Resume work',exact:true}).click()
  await page.getByText('wf_ui_fixture',{exact:true}).waitFor()
  await page.screenshot({path:join(directory,'atflows-desktop.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:join(directory,'atflows-mobile.png'),fullPage:true})
  if (errors.length) throw new Error('Browser errors: ' + errors.join('; '))
  const result = {passed:true, directory, screenshots:['atmem-desktop.png','atmem-mobile.png','atflows-desktop.png','atflows-mobile.png'], page_errors:errors, data_class:'UI fixtures, not benchmark evidence'}
  writeFileSync(join(directory,'result.json'),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result))
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
  if (flows) flows.kill('SIGTERM')
}
