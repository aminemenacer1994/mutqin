/* Read-only smoke coverage for routes outside the Student overhaul. */
const fs = require('node:fs')
const assert = require('node:assert/strict')
const {chromium} = require('playwright')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const out = 'tests/js/screenshots/group01-student-foundation/after'
async function main() {
  const browser = await chromium.launch({headless:true})
  const page = await browser.newPage({viewport:{width:1440,height:1000}})
  const report = {cases:[],errors:[],environmentWarnings:[]}
  page.on('pageerror', e=>report.errors.push(e.message))
  page.on('console', m=>{
    if(!['error','warning'].includes(m.type())) return
    const text = m.text()
    if (/Content Security Policy directive 'form-action' contains an invalid source: 'http:\/\/\[::1\]|\[PostHog\.js\] Events are being dropped because the user agent looks like a bot/.test(text)) report.environmentWarnings.push(text)
    else report.errors.push(text)
  })
  try {
    for(const path of ['/','/login']) {
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000})
        const response = await page.goto(base+path)
        assert.ok(response.ok(),path+' renders')
        await page.evaluate(()=>document.fonts.ready)
        assert.equal(await page.locator('link[href*="student-dashboard.css"]').count(),0,'Student styles do not load on protected routes')
        await page.screenshot({path:`${out}/protected-${path==='/'?'public':'login'}-${width}.png`,fullPage:true})
        report.cases.push({path,width})
      }
    }
    await page.locator('input[type=email]').fill('org.demo.halaqa.student1@example.com')
    await page.locator('input[type=password]').fill('OrganisationDemo1!')
    await page.getByRole('button',{name:/login/i}).click()
    await page.waitForURL(u=>u.pathname!=='/login')
    for(const width of [1440,834,390]) {
      await page.setViewportSize({width,height:1000})
      await page.goto(base+'/memorisation')
      await page.locator('.workspace-shell, .session-progress-rail').first().waitFor()
      await page.waitForTimeout(1500)
      assert.ok(await page.locator('.setup-start-card, .session-rail, .workspace-shell-idle, .workspace-shell-idle-cta, .top-card-session-actions, .action-btn.primary, [data-tour="welcome-start"]').count(),'Memorisation setup/session controls remain available')
      assert.equal(await page.locator('link[href*="student-dashboard.css"]').count(),0)
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No memorisation horizontal overflow')
      await page.screenshot({path:`${out}/protected-memorisation-${width}.png`,fullPage:true})
      report.cases.push({path:'/memorisation',width})
    }
    assert.deepEqual(report.errors,[],'No unexpected browser errors on protected routes')
  } finally {
    await browser.close()
    report.environmentWarnings = [...new Set(report.environmentWarnings)]
    fs.writeFileSync(out+'/protected-report.json',JSON.stringify(report,null,2))
    console.log(JSON.stringify(report,null,2))
  }
}
main().catch(e=>{console.error(e);process.exitCode=1})
