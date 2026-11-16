import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

async function loadAnalytics({ getReport = async () => ({ overview: {} }), theme = {} } = {}) {
  const classes = new Set()
  const drawerClasses = new Set()
  const toggle = (set) => (key, active) => active ? set.add(key) : set.delete(key)
  const context = vm.createContext({
    console, setTimeout, clearTimeout,
    document: {
      body: { classList: { toggle: toggle(classes) } },
      documentElement: { classList: { toggle: toggle(drawerClasses) } },
    },
    window: {},
    getComputedStyle: () => ({ getPropertyValue: (name) => theme[name] || '' }),
  })
  const cache = new Map()
  const stub = (identifier, exports) => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
  }, { context, identifier })

  async function load(filename) {
    if (cache.has(filename)) return cache.get(filename)
    const source = readFileSync(filename, 'utf8')
    const script = filename.endsWith('.vue') ? source.match(/<script>([\s\S]*?)<\/script>/)[1] : source
    const module = new vm.SourceTextModule(script, {
      context,
      identifier: filename,
      importModuleDynamically: async (specifier) => {
        if (!specifier.endsWith('/exportPdf.js')) throw new Error(`Unexpected dynamic import: ${specifier}`)
        const exporter = stub(specifier, { exportAdvancedAnalyticsPdf: async () => {} })
        await exporter.link(() => {})
        await exporter.evaluate()
        return exporter
      },
    })
    cache.set(filename, module)
    await module.link(async (specifier) => {
      if (specifier === 'chart.js') {
        return stub(specifier, Object.fromEntries(['ArcElement', 'BarElement', 'CategoryScale', 'Filler', 'Legend', 'LinearScale', 'LineElement', 'PointElement', 'Tooltip'].map((key) => [key, {}]).concat([['Chart', { register() {} }]])))
      }
      if (specifier.includes('mixins/i18nMixin')) return stub(specifier, { i18nMixin: {} })
      if (specifier.includes('scripts/api/learning')) return stub(specifier, { learningApi: { getAdvancedAnalytics: getReport } })
      if (specifier.includes('utils/modalFocus')) return stub(specifier, { captureReturnFocus: () => null, restoreReturnFocus() {}, handleModalKeydown() {} })
      if (specifier.endsWith('.css') || specifier.endsWith('.vue')) return stub(specifier, { default: {} })
      const resolved = path.resolve(path.dirname(filename), specifier)
      return load(path.extname(resolved) ? resolved : `${resolved}.js`)
    })
    return module
  }

  const modal = await load(path.join(root, 'resources/js/components/advancedAnalytics/AdvancedAnalyticsModal.vue'))
  await modal.evaluate()
  const component = modal.namespace.default
  const instance = { ...component.data(), open: true, $refs: {}, $nextTick: (callback) => callback(), t: (key) => key }
  for (const [key, method] of Object.entries(component.methods)) instance[key] = method.bind(instance)
  for (const [key, compute] of Object.entries(component.computed)) Object.defineProperty(instance, key, { get: compute.bind(instance) })
  return { component, instance, load, classes, drawerClasses }
}

test('analytics opening fetches once and ignores a response after close', async () => {
  const requests = []
  const { component, instance } = await loadAnalytics({ getReport: (params) => new Promise((resolve) => requests.push({ params, resolve })) })
  component.watch.open.handler.call(instance, true)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].params.range, '30')
  instance.open = false
  component.watch.open.handler.call(instance, false)
  requests[0].resolve({ overview: { ai_checks: 12 } })
  await new Promise(setImmediate)
  assert.equal(instance.report, null)
  assert.equal(instance.loading, false)
})

test('custom dates apply as one validated request and preserve the previous report while loading', async () => {
  const requests = []
  const { instance } = await loadAnalytics({ getReport: (params) => new Promise((resolve) => requests.push({ params, resolve })) })
  instance.range = 'custom'
  instance.today = '2026-11-15'
  instance.customFrom = '2026-11-09'
  instance.customTo = '2026-11-01'
  instance.applyCustomRange()
  assert.equal(requests.length, 0)
  instance.customTo = '2026-11-15'
  instance.report = { overview: { ai_checks: 3 } }
  instance.applyCustomRange()
  instance.applyCustomRange()
  assert.equal(requests.length, 1, 'Repeated apply cannot duplicate an active request')
  assert.equal(instance.report.overview.ai_checks, 3)
  assert.equal(requests[0].params.from, '2026-11-09')
  requests[0].resolve({ overview: { ai_checks: 8 } })
  await new Promise(setImmediate)
  assert.equal(instance.report.overview.ai_checks, 8)
})

test('overlay owners retain document locking until the final open dialog closes', async () => {
  const { load, classes, drawerClasses } = await loadAnalytics()
  const locks = await load(path.join(root, 'resources/js/utils/modalScrollLock.js'))
  const { setModalScrollLock } = locks.namespace
  const basic = {}, advanced = {}, drawer = {}, inactive = {}
  setModalScrollLock(basic, true)
  setModalScrollLock(advanced, true)
  setModalScrollLock(inactive, false)
  setModalScrollLock(basic, false)
  assert.equal(classes.has('modal-open'), true)
  setModalScrollLock(drawer, true, { dashboard: true })
  setModalScrollLock(advanced, false)
  assert.equal(drawerClasses.has('dash-drawer-open'), true)
  setModalScrollLock(drawer, false)
  assert.equal(classes.has('modal-open'), false)
  assert.equal(drawerClasses.has('dash-drawer-open'), false)
})

test('PDF chart palette stays readable on paper independently of the screen theme', async () => {
  const { load } = await loadAnalytics({ theme: { '--text': '#fff', '--text-muted': '#ddd', '--accent': '#d4a574', '--success': '#6aab88' } })
  const builder = await load(path.join(root, 'resources/js/scripts/advancedAnalytics/buildReportView.js'))
  const { themeColors, buildAdvancedAnalyticsView } = builder.namespace
  assert.equal(themeColors().text, '#fff')
  assert.equal(themeColors({ forPrint: true }).text, '#1f1a17')
  assert.equal(themeColors({ forPrint: true }).accent, '#8b5e3c')
  const report = { overview: { ai_checks: 2 }, series: { ai_performance: [{ date: '2026-11-01', accuracy: 80 }, { date: '2026-11-02', accuracy: null }] } }
  const view = buildAdvancedAnalyticsView(report, (key) => key, { forPrint: true })
  assert.equal(view.aiChart.data.datasets[0].data[0], 80)
  assert.equal(view.aiChart.data.datasets[0].data[1], null, 'Missing assessments remain gaps')
  assert.equal(view.aiChart.options.maintainAspectRatio, false)
  assert.equal(view.aiChart.options.animation, false)
})

test('zero-only practice buckets do not create an empty chart alongside valid AI results', async () => {
  const { load } = await loadAnalytics()
  const builder = await load(path.join(root, 'resources/js/scripts/advancedAnalytics/buildReportView.js'))
  const report = {
    overview: { ai_checks: 1, ai_accuracy: 92 },
    series: {
      practice_activity: [{ key: '2026-11-01', sessions: 0, duration_seconds: 0 }],
      ai_performance: [{ date: '2026-11-01', accuracy: 92 }],
    },
  }
  const view = builder.namespace.buildAdvancedAnalyticsView(report, (key) => key)
  assert.equal(view.practiceChart, null)
  assert.equal(view.hasPractice, false)
  assert.equal(view.aiChart.data.datasets[0].data[0], 92)
  assert.equal(report.series.practice_activity.length, 1, 'Source buckets remain intact')
})

test('export restores focus inside an open dialog after the browser download takes focus', async () => {
  const { instance, component } = await loadAnalytics()
  instance.report = { overview: { ai_checks: 1 }, series: { ai_performance: [{ date: '2026-11-01', accuracy: 80 }] } }
  let focusCalls = 0
  instance.$refs.dialogRoot = { contains: () => false, focus: () => { focusCalls++ } }
  await instance.exportPdf()
  assert.equal(instance.exporting, false)
  assert.equal(focusCalls, 1)
  assert.equal(instance.pdfStatus.kind, 'success')
  component.beforeUnmount.call(instance)
})
