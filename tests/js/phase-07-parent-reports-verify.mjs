import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const reportsVue = read('resources/js/components/parent/ParentFamilyReports.vue')
const progressVue = read('resources/js/components/parent/ParentFamilyProgress.vue')
const moreVue = read('resources/js/components/parent/ParentFamilyMore.vue')
const dashboard = read('resources/js/views/ParentDashboard.vue')
const collector = read('app/Services/Parent/RecordParentLearningReportCollector.php')
const reader = read('app/Services/Parent/ParentLearningReportReader.php')

assert.match(reportsVue, /getParentReports/, 'Reports view loads data from the shared reports API')
assert.match(reportsVue, /reports_home_practice/, 'Reports surface teacher-approved home practice')
assert.match(reportsVue, /reports_section_attendance/, 'Reports surface attendance when shared')
assert.match(reportsVue, /reports_evidence_note/, 'Reports explain AI vs teacher evidence')
assert.match(reportsVue, /reports\/\$\{active\.id\}\/download/, 'PDF download uses existing report endpoint')
assert.doesNotMatch(progressVue, /getParentReports/, 'Progress does not duplicate report generation logic')

assert.match(progressVue, /open-reports/, 'Progress links to the Reports destination')
assert.match(moreVue, /id: 'reports'/, 'More hub lists Reports')
assert.match(dashboard, /@open-reports="openReports"/, 'Dashboard routes Progress to Reports')

assert.match(collector, /homePractice/, 'Collector builds home practice from teacher tasks')
assert.match(collector, /private function attendance/, 'Collector includes attendance in the period snapshot')
assert.match(reader, /ViewAttendance/, 'Reader respects attendance permission')
assert.match(reader, /visibleHomePractice/, 'Reader gates home practice by guardian permissions')

console.log('phase-07-parent-reports-verify.mjs: ok')