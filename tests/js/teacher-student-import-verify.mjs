import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const wizard = readFileSync(new URL('../../resources/js/components/teacher/TeacherStudentImportWizard.vue', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('../../resources/js/views/TeacherDashboard.vue', import.meta.url), 'utf8')
const learning = readFileSync(new URL('../../resources/js/scripts/api/learning.js', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../../public/css/teacher-dashboard.css', import.meta.url), 'utf8')

assert.match(wizard, /TeacherStudentImportWizard/, 'Import wizard component is defined')
assert.match(wizard, /import_steps_label/, 'Wizard exposes an accessible step list label')
assert.match(wizard, /role="status"/, 'Processing state is announced to assistive tech')
assert.match(wizard, /duplicateEmails/, 'Within-batch duplicate emails are surfaced in review')
assert.match(wizard, /commitTeacherStudentImport/, 'Commit goes through the teacher import API')
assert.match(wizard, /organiseCounts\.create \+ this\.organiseCounts\.update > 50/, 'Large commits use async queue')
assert.match(dashboard, /TeacherStudentImportWizard/, 'Teacher dashboard mounts the import wizard')
assert.match(learning, /createTeacherStudentImport/, 'Learning API can create import batches')
assert.match(learning, /getTeacherStudentImportFormats/, 'Learning API loads supported formats')
assert.match(styles, /\.teacher-student-import__drop:focus-visible/, 'Upload drop zone has keyboard focus styles')
assert.match(styles, /\.teacher-student-import__table/, 'Review table is styled for teacher workspace')

console.log('teacher student import verify ok')