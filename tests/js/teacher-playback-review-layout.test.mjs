import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/components/teacher/TeacherRecitationPlaybackReview.vue', import.meta.url), 'utf8')
const template = source.slice(source.indexOf('<template>'), source.indexOf('<script>'))
const css = readFileSync(new URL('../../resources/js/views/TeacherDashboard.css', import.meta.url), 'utf8')

const ai = template.indexOf('teacher-playback__ai')
const assessment = template.indexOf('teacher-playback__assessment')
const revision = template.indexOf('teacher-playback__revision')
const feedback = template.indexOf('teacher-playback__response')
assert.ok(ai > 0 && assessment > ai && feedback > assessment && revision > feedback, 'Summary, assessment, feedback, then revision')
assert.match(template, /class="teacher-playback__section teacher-playback__ai"/, 'The wording summary stays visible')
assert.match(template, /class="teacher-playback__section teacher-playback__assessment"/, 'Teacher ratings stay visible')
assert.doesNotMatch(template.slice(assessment, feedback), /teacher-playback__assessment-fold/, 'Rating fields are not hidden behind extra disclosures')
assert.doesNotMatch(template, /teacher-playback__private-note/, 'Private note is not shown in the review')
assert.match(template, /playback_ai_wording_only/, 'AI flags stay distinct from Tajweed and pronunciation')
assert.match(template, /playback_heard_live/, 'A teacher can record a live hearing')
assert.match(template, /playback_listen_first/, 'A recording asks the teacher to listen first')
assert.match(template, /teacher-playback__mark/, 'Complete review stays in the footer')
assert.match(template, /playback_next/, 'Next stays in the footer')
assert.match(css, /\.teacher-playback__panel:not\(\[open\]\) > :not\(summary\) \{ display: none; \}/, 'Closed sections keep their fields mounted')
assert.match(css, /overflow-x: hidden/, 'The review body does not scroll sideways')
assert.match(css, /\.teacher-playback-studio \.modal-footer \{ flex: 0 0 auto; \}/, 'The review footer stays visible')

console.log('teacher playback review layout ok')
