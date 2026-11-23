import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')
const dialog = readFileSync(new URL('../../resources/js/components/teacher/TeacherDialog.vue', import.meta.url), 'utf8')

assert.match(css, /\.teacher-dashboard,\n\.teacher-dialog,[\s\S]*?overflow-x:\s*clip/, 'teacher surfaces cannot create page-width overflow')
assert.match(css, /@media \(max-width: 767\.98px\)[\s\S]*?\.teacher-dialog\.modal \{[\s\S]*?padding:\s*0 !important/, 'mobile dialogs use the shared edge-to-edge shell')
assert.match(css, /\.teacher-dialog \.modal-content \{[\s\S]*?height:\s*100dvh/, 'mobile dialog content follows the visual viewport')
assert.match(css, /\.teacher-dialog \.modal-body \{[\s\S]*?-webkit-overflow-scrolling:\s*touch/, 'only the dialog body needs to scroll on touch devices')
assert.match(css, /\.teacher-dialog \.modal-footer > \.btn \{ flex: 1 1 8rem; min-height: 44px; \}/, 'modal actions stay tap-sized and can wrap')
assert.match(css, /safe-area-inset-top/, 'dialog headers respect mobile safe areas')
assert.match(css, /safe-area-inset-bottom/, 'dialog bodies and footers respect mobile safe areas')
assert.match(css, /\.teacher-task-conversation__bubble:has\(.teacher-audio-feedback-player\) \{ min-width: min\(240px, 100%\); \}/, 'voice bubbles cannot exceed their container')
assert.match(css, /\.teacher-direct-thread__replies \{[\s\S]*?overflow-x:\s*auto/, 'quick replies stay inside the message composer')
assert.match(css, /html\[data-theme="dark"\] :is\(.teacher-dashboard, \.teacher-dialog\) :is\(input, select, textarea\) \{ color-scheme: dark; \}/, 'native fields follow the saved dark theme')
assert.match(dialog, /'has-footer': hasFooter/, 'the shared dialog exposes a footer state for safe scrolling')

console.log('teacher responsive foundation ok')
