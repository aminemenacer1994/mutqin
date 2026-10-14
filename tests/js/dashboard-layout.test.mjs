import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const dashboard = await readFile(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const styles = await readFile(new URL('../../resources/js/views/Dashboard.css', import.meta.url), 'utf8')

assert.doesNotMatch(dashboard, /class="dash-daily-revision\b/)
assert.doesNotMatch(dashboard, /id="dash-data-heading"/)
assert.match(dashboard, /v-if="murajaahPreview\.length \|\| showMurajaahEmpty"/)
assert.match(styles, /@media \(min-width: 1024px\)[\s\S]*?\.user-dashboard__content\s*\{[\s\S]*?grid-template-columns:/)
assert.match(styles, /\.dash-ai-results:only-child\s*\{\s*grid-column: 1 \/ -1;/)

console.log('dashboard layout checks passed')
