/**
 * Replace hardcoded template text nodes with t('key') calls.
 * Usage: node scripts/force-i18n-replace.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const mapPath = path.resolve('scripts/.i18n-replacements.json')
/** @type {Record<string, string>} */
const replacements = JSON.parse(fs.readFileSync(mapPath, 'utf8'))

const files = [
  'resources/js/views/Memorisation.vue',
  'resources/js/views/Homepage.vue',
  'resources/js/views/AboutUs.vue',
  'resources/js/views/OurMission.vue',
  'resources/js/views/DonationPage.vue',
  'resources/js/components/HifzPlanCreatorModal.vue',
]

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceInTemplate(content, text, key) {
  const escaped = escapeRegex(text)
  const re = new RegExp(`(>\\s*)${escaped}(\\s*<)`, 'g')
  return content.replace(re, (match, open, close) => {
    if (match.includes('{{') || match.includes('t(')) return match
    return `${open}{{ t('${key}') }}${close}`
  })
}

function replaceWrapped(content, text, key) {
  const escaped = escapeRegex(text)
  const re = new RegExp(`(<b>)${escaped}(</b>)`, 'g')
  return content.replace(re, `$1{{ t('${key}') }}$2`)
}

for (const rel of files) {
  const file = path.resolve(rel)
  if (!fs.existsSync(file)) continue
  let content = fs.readFileSync(file, 'utf8')
  const templateMatch = content.match(/<template>([\s\S]*)<\/template>/)
  if (!templateMatch) continue

  let template = templateMatch[1]
  const sorted = Object.keys(replacements).sort((a, b) => b.length - a.length)
  for (const text of sorted) {
    const key = replacements[text]
    template = replaceInTemplate(template, text, key)
    template = replaceWrapped(template, text, key)
  }

  content = content.replace(templateMatch[1], template)
  fs.writeFileSync(file, content, 'utf8')
  console.log('Updated', rel)
}
