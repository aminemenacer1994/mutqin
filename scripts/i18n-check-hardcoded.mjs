/**
 * Report likely hardcoded UI strings in Vue templates and key JS files.
 * Usage: node scripts/i18n-check-hardcoded.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const vueTargets = [
  'resources/js/views/Memorisation.vue',
  'resources/js/views/Homepage.vue',
  'resources/js/views/About.vue',
  'resources/js/views/AboutUs.vue',
  'resources/js/views/OurMission.vue',
  'resources/js/views/DonationPage.vue',
  'resources/js/components/HifzPlanCreatorModal.vue',
]

const jsTargets = [
  'resources/js/views/Memorisation.js',
]

const jsComputedGuards = [
  'onboardingSteps',
  'chainingMethodDescription',
  'chainingMethodLabel',
  'chainingMethodPreview',
  'controlsAnalyticsCards',
  'activePracticeTechniques',
  'detailedAnalyticsSections',
  'guidedPhaseLabel',
  'guidedPrimaryCta',
  'guidedInstruction',
  'flowCtaLabel',
  'flowHint',
  'sessionEndedActionCards',
  'sessionTypeInfo',
  'currentSessionExplanation',
  'currentControlInfo',
]

const skipPatterns = [
  /^bi /, /^bi-/, /^col-/, /^d-/, /^g-/, /^btn-/, /^modal-/, /^verse-/, /^session-/,
  /^https?:/, /^\/\//, /^data-/, /^aria-/, /^mutqin/, /^Al-/, /^Surah/, /^Ayah/,
]

/** @type {string[]} */
const findings = []

function looksLikeCssClass(text) {
  return (text.match(/-/g) || []).length >= 2 && !/\s/.test(text)
}

function scanTemplate(rel, full) {
  const templateMatch = full.match(/<template>([\s\S]*?)<\/template>/)
  const content = templateMatch ? templateMatch[1] : full
  for (const m of content.matchAll(/>([^<{][^<]{4,80})</g)) {
    const text = m[1].trim()
    if (!/[A-Za-z]{4,}/.test(text)) continue
    if (text.includes('{{') || text.includes('t(')) continue
    if (looksLikeCssClass(text)) continue
    if (skipPatterns.some(p => p.test(text))) continue
    if (/^[0-9$£%]/.test(text)) continue
    if (/^&[a-z]+;$/i.test(text)) continue
    if (/^-- .+ --$/.test(text)) continue
    if (text === 'Space') continue
    if (text === 'Mutqin') continue
    findings.push(`${rel}: "${text}"`)
  }
}

function scanVueScript(rel, full) {
  const scriptMatch = full.match(/<script>([\s\S]*?)<\/script>/)
  if (!scriptMatch) return
  const content = scriptMatch[1]
  if (/steps:\s*\[\s*\{[^}]*label:\s*['"]Goal['"]/s.test(content)) {
    findings.push(`${rel}: hardcoded wizard steps/options remain in data()`)
  }
  if (/goalOptions:\s*\[\s*\{[^}]*title:\s*['"]Light['"]/s.test(content)) {
    findings.push(`${rel}: hardcoded goalOptions remain in data()`)
  }
}

function scanMemorisationComputedGuards(rel, full) {
  const computedMatch = full.match(/computed:\s*\{([\s\S]*?)\n\s*\},\n\s*watch:/)
  if (!computedMatch) return
  const block = computedMatch[1]
  for (const name of jsComputedGuards) {
    const fnMatch = block.match(new RegExp(`${name}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\},`))
    if (!fnMatch) continue
    const body = fnMatch[1]
    if (/return\s+['"][^'"]{8,}['"]/.test(body) && !body.includes('this.t(')) {
      findings.push(`${rel}: ${name}() still returns hardcoded English`)
    }
    if (/title:\s*['"][A-Za-z][^'"]{6,}['"]/.test(body) && !body.includes('this.t(')) {
      findings.push(`${rel}: ${name}() still contains hardcoded title/label strings`)
    }
  }
  if (/onboardingSteps:\s*\[/.test(full)) {
    findings.push(`${rel}: onboardingSteps should be a computed property`)
  }
}

for (const rel of vueTargets) {
  const file = path.resolve(rel)
  if (!fs.existsSync(file)) continue
  const full = fs.readFileSync(file, 'utf8')
  scanTemplate(rel, full)
  scanVueScript(rel, full)
}

for (const rel of jsTargets) {
  const file = path.resolve(rel)
  if (!fs.existsSync(file)) continue
  scanMemorisationComputedGuards(rel, fs.readFileSync(file, 'utf8'))
}

console.log(`Potential hardcoded strings: ${findings.length}`)
findings.forEach(f => console.log(' ', f))
if (findings.length > 0) {
  console.warn('Hardcoded UI strings remain in guarded i18n surfaces')
  process.exit(1)
}
