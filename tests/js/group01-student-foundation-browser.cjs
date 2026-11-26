/* Local, read-only visual audit. Run with --baseline before building changes. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const phase = process.argv.includes('--baseline') ? 'before' : 'after'
const root = path.join(__dirname, 'screenshots/group01-student-foundation')
const out = path.join(root, phase)
const accounts = {
  student: ['org.demo.halaqa.student1@example.com', 'OrganisationDemo1!', '/dashboard'],
  teacher: ['org.demo.halaqa.teacher@example.com', 'OrganisationDemo1!', '/teacher'],
  parent: ['guardian.menacer@mutqin.test', 'ParentDemo1!', '/parent'],
}
const panes = ['home', 'learning', 'practice', 'progress', 'activity', 'messages', 'settings']
function measure() {
  const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'
  const style = selector => {
    const el = [...document.querySelectorAll(selector)].find(visible)
    if (!el) return null
    const s = getComputedStyle(el), r = el.getBoundingClientRect()
    return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','padding','gap','borderRadius','borderColor','backgroundColor','backgroundImage','boxShadow'].map(k => [k, s[k]]).concat([['width',r.width],['top',r.top],['height',r.height]]))
  }
  const header = document.querySelector('.app-navbar')
  const metrics = [...document.querySelectorAll('.teacher-metric__copy')].filter(visible).map(el => ({width:el.getBoundingClientRect().width, text:el.textContent.trim()}))
  return {
    overflow: document.documentElement.scrollWidth - innerWidth,
    shell: style('.teacher-dashboard__shell'), main: style('.teacher-dashboard__main'),
    font: style('main'), heading: style('h1'),
    nav: style('.teacher-nav-shell--desktop .teacher-nav__link.is-active, .teacher-nav-shell--mobile .teacher-nav__link.is-active'),
    pane: style('.teacher-pane'), button: style('.btn-primary'),
    headerBottom:header?.getBoundingClientRect().bottom || 0,
    metricCopies:metrics,
  }
}
async function main() {
  fs.mkdirSync(out, {recursive:true})
  const browser = await chromium.launch({headless:true})
  const report = {phase, cases:[], errors:[], blockers:[]}
  try {
    for (const [role, [email,password,url]] of Object.entries(accounts)) {
      const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'reduce'})
      const page = await context.newPage()
      page.on('pageerror', e => report.errors.push({role,error:e.message}))
      await page.goto(`${base}/login`)
      await page.locator('input[type=email]').fill(email)
      await page.locator('input[type=password]').fill(password)
      await page.getByRole('button',{name:/login/i}).click()
      await page.waitForURL(u => u.pathname !== '/login', {timeout:20000})
      await page.goto(`${base}${url}`)
      await page.locator('.teacher-nav-shell--desktop').waitFor()
      await page.evaluate(() => document.fonts.ready)
      if(role==='student') await page.waitForFunction(() => !document.querySelector('main[data-platform-shell=student]')?.__vueParentComponent?.proxy?.supportLoading)
      for (const width of [1440,768,390,320]) {
        await page.setViewportSize({width,height:1000})
        for (const theme of ['light','dark']) {
          await page.evaluate(t => {document.documentElement.dataset.theme=t},theme)
          for (const pane of role === 'student' ? panes : ['home']) {
            if (role === 'student') {
              const labels = {home:'Home',learning:/^(My learning|Learning)/,practice:'Practice',progress:'Progress',activity:'Activity',messages:/^(Messages|Inbox|Notes)/,settings:'Settings'}
              const nav = page.locator('.teacher-nav-shell:visible')
              const button = nav.locator('button').filter({hasText:labels[pane]})
              if (await button.count()) await button.first().click()
              else { report.blockers.push(`${role}/${width}/${pane}: navigation unavailable`); continue }
            }
            await page.evaluate(() => {window.scrollTo(0,0); document.activeElement?.blur()})
            await page.waitForTimeout(400)
            const key = `${role}-${pane}-${width}-${theme}`
            const data = await page.evaluate(measure)
            report.cases.push({key,role,pane,width,theme,...data})
            if ([1440,390].includes(width) || (role==='student' && pane==='home')) {
              await page.screenshot({path:path.join(out,`${key}.png`),fullPage:true,animations:'disabled'})
            }
          }
        }
      }
      if (role === 'student') {
        report.breakpoints = []
        for (const width of [992,991]) {
          await page.setViewportSize({width,height:844})
          await page.evaluate(() => window.scrollTo(0,500))
          await page.waitForTimeout(200)
          const desktop = await page.locator('.teacher-nav-shell--desktop').isVisible()
          assert.equal(desktop,width===992,'Navigation changes at the shared 992px breakpoint')
          if (desktop) {
            const navTop = await page.locator('.teacher-nav-shell--desktop').evaluate(e=>e.getBoundingClientRect().top)
            const headerBottom = await page.locator('.app-navbar').evaluate(e=>e.getBoundingClientRect().bottom)
            assert.ok(navTop >= headerBottom,'Sticky navigation clears the application header')
          }
          report.breakpoints.push({width,desktop})
        }
        await page.setViewportSize({width:390,height:844})
        await page.goto(`${base}/dashboard?tab=progress`)
        await page.locator('#dash-progress:visible').waitFor()
        await page.locator('.teacher-nav-shell:visible button').filter({hasText:'Activity'}).click()
        await page.goBack()
        await page.locator('#dash-progress:visible').waitFor()
        report.navigation = {deepLink:true,back:true}
        await page.evaluate(() => {document.documentElement.dir='rtl';document.documentElement.lang='ar'})
        await page.screenshot({path:path.join(out,'student-progress-390-rtl.png'),fullPage:true})
        report.rtlOverflow = await page.evaluate(() => document.documentElement.scrollWidth-innerWidth)
      }
      await context.close()
    }
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))
  }
  console.log(JSON.stringify({phase,cases:report.cases.length,errors:report.errors,blockers:report.blockers,overflow:report.cases.filter(c=>c.overflow>1).map(c=>c.key),narrowMetrics:report.cases.filter(c=>c.metricCopies.some(m=>m.width<70)).map(c=>c.key)},null,2))
  if (phase === 'after') {
    assert.deepEqual(report.errors,[],'No JavaScript exceptions')
    assert.deepEqual(report.blockers,[],'All required destinations are available')
    assert.ok(report.cases.every(c=>c.overflow<=1),'No page horizontal overflow')
    assert.ok(report.cases.filter(c=>c.role==='student').every(c=>c.metricCopies.every(m=>m.width>=70)),'Metric labels have natural wrapping space')
    assert.ok(report.rtlOverflow<=1,'RTL does not overflow')
    for (const student of report.cases.filter(c=>c.role==='student' && c.pane==='home')) {
      const teacher = report.cases.find(c=>c.role==='teacher' && c.width===student.width && c.theme===student.theme)
      for (const field of ['font','nav','pane','heading']) {
        for (const prop of ['fontFamily','fontSize','fontWeight','lineHeight','padding','borderRadius','backgroundColor','backgroundImage','boxShadow']) {
          assert.equal(student[field]?.[prop],teacher[field]?.[prop],`${student.key}: shared ${field}.${prop}`)
        }
      }
    }
    const before = JSON.parse(fs.readFileSync(path.join(root,'before/report.json')))
    for (const c of report.cases.filter(c=>c.role !== 'student')) {
      const old=before.cases.find(b=>b.key===c.key)
      for (const field of ['shell','main','font','heading','nav','pane','button']) {
        // Charts settle asynchronously; inherited border colour on borderless
        // containers is not a painted surface. Compare the stable primitives.
        const stable = value => {
          if (!value) return value
          const result = {...value}
          if (['shell','main','font','pane'].includes(field)) delete result.height
          if (['shell','main','font'].includes(field)) delete result.borderColor
          return result
        }
        assert.deepEqual(stable(c[field]),stable(old[field]),`${c.key}: preserved ${field}`)
      }
    }
    console.log('Teacher/Parent computed styles preserved; Student responsive navigation passed.')
  }
}
main().catch(e=>{console.error(e);process.exitCode=1})
