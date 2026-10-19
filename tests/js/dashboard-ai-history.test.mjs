import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dashboard = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.match(dashboard, /drawerAiSearch/, 'AI history drawer supports search')
assert.match(dashboard, /drawerAiBandFilter/, 'AI history drawer supports band filters')
assert.match(dashboard, /aiCheckTitle/, 'AI history avoids misleading Not begun labels')
assert.match(dashboard, /sortMurajaahByUrgency/, 'Revision list sorts by urgency')
assert.match(dashboard, /revision_priority_start/, 'Fragile items show start-here cue')
assert.equal(en.dashboard.ai_check_unknown_surah, 'Surah not recorded')

console.log('dashboard-ai-history.test.mjs: ok')
