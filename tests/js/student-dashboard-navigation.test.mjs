import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  STUDENT_DASHBOARD_PANES,
  normalizeStudentDashboardPane,
  studentDashboardHistoryState,
  studentDashboardPaneFromHistory,
  studentDashboardPaneFromLocation,
  studentDashboardReturnHref,
  studentDashboardUrlForPane,
  studentNavItems,
} from '../../resources/js/scripts/dashboard/studentDashboardNavigation.js'
import { buildCheckAgainHref, buildReviewHref } from '../../resources/js/scripts/dashboard/progressView.js'

assert.deepEqual(STUDENT_DASHBOARD_PANES, ['home', 'learning', 'progress', 'activity', 'messages', 'settings'])
const nav = studentNavItems({ messaging: true })
assert.deepEqual(nav.map((item) => item.id), ['home', 'learning', 'progress', 'activity', 'messages'])
assert.deepEqual(studentNavItems({ messaging: false }).map((item) => item.id), ['home', 'learning', 'progress', 'activity'])
assert.ok(nav.every((item) => item.label.startsWith('dashboard.jump_') && item.icon.startsWith('bi ')))
assert.equal(normalizeStudentDashboardPane('my-learning'), 'learning')
assert.equal(normalizeStudentDashboardPane('unknown'), 'home')
assert.equal(normalizeStudentDashboardPane('practice'), 'home')
assert.equal(normalizeStudentDashboardPane('messages'), 'messages')
assert.equal(normalizeStudentDashboardPane('settings'), 'settings')
assert.equal(studentDashboardPaneFromLocation({ search: '?source=teacher&tab=activity', hash: '' }), 'activity')
assert.equal(studentDashboardPaneFromLocation({ search: '', hash: '#ai-recite-results' }), 'progress')
assert.equal(studentDashboardPaneFromLocation({ search: '?tab=activity', hash: '#achievements' }), 'progress')
assert.equal(studentDashboardPaneFromLocation({ search: '', hash: '#achievements' }), 'progress')
assert.equal(studentDashboardPaneFromHistory({ studentDashboardPane: 'learning' }, { search: '?tab=home' }), 'learning')

const nextUrl = studentDashboardUrlForPane({ href: 'https://mutqin.test/progress?source=teacher&group=8#ai-recite-results' }, 'home', { clearContextHash: true })
assert.equal(nextUrl, '/progress?source=teacher&group=8&tab=home', 'tab navigation preserves existing route parameters')
assert.equal(studentDashboardReturnHref('/dashboard?source=assignment', 'learning'), '/dashboard?source=assignment&tab=learning')
assert.deepEqual(studentDashboardHistoryState({ existing: 1 }, 'progress', 320), {
  existing: 1,
  studentDashboardPane: 'progress',
  studentDashboardScrollY: 320,
})

const review = new URL(buildReviewHref('/memorisation?ignored=1', {
  surah_number: 1,
  ayah_number: 2,
  ayah_end: 3,
  settings: { reciter: 'ar.alafasy', speed: 0.75, repetitions: 3, layout: 'mushaf' },
}), 'https://mutqin.test')
assert.equal(review.searchParams.get('surah'), '1')
assert.equal(review.searchParams.get('from'), '2')
assert.equal(review.searchParams.get('to'), '3')
assert.equal(review.searchParams.get('return_tab'), 'progress')
assert.equal(review.searchParams.get('reciter'), 'ar.alafasy')
assert.equal(review.searchParams.get('speed'), '0.75')
assert.equal(review.searchParams.get('repetitions'), '3')
assert.equal(review.searchParams.get('view'), 'mushaf')

const checkAgain = new URL(buildCheckAgainHref('/memorisation', { surah_number: 2, ayah_start: 5, ayah_end: 7 }), 'https://mutqin.test')
assert.equal(checkAgain.searchParams.get('return_tab'), 'progress')

const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const teacherSection = fs.readFileSync(new URL('../../resources/js/components/teacher/LearnerTeacherSection.vue', import.meta.url), 'utf8')
const memorisation = fs.readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const assignmentService = fs.readFileSync(new URL('../../app/Services/Teacher/TeacherAssignmentService.php', import.meta.url), 'utf8')

assert.match(dashboard, /data-platform-shell="student"/)
assert.match(dashboard, /variant="desktop"/)
assert.match(dashboard, /variant="mobile"/)
assert.match(dashboard, /settings-label-key="dashboard.jump_settings"/)
assert.match(dashboard, /:items="studentNavItems"/)
assert.doesNotMatch(dashboard, /:show-account="false"/)
assert.match(dashboard, /studentPane === 'messages'/)
assert.match(dashboard, /studentPane === 'settings'/)
assert.match(dashboard, /teacher-dashboard__shell/)
assert.doesNotMatch(dashboard, /<nav class="teacher-nav dash-jump"/)
const teacherNav = fs.readFileSync(new URL('../../resources/js/components/teacher/TeacherNav.vue', import.meta.url), 'utf8')
assert.match(teacherNav, /showAccount: \{ type: Boolean, default: true \}/)
assert.doesNotMatch(fs.readFileSync(new URL('../../resources/js/views/TeacherDashboard.vue', import.meta.url), 'utf8'), /show-account="false"/)
assert.doesNotMatch(fs.readFileSync(new URL('../../resources/js/views/ParentDashboard.vue', import.meta.url), 'utf8'), /show-account="false"/)
assert.match(dashboard, /window\.addEventListener\('popstate'/)
assert.match(dashboard, /window\.history\.scrollRestoration = 'manual'/)
assert.match(dashboard, /if \(next === previous\)/, 'reselecting a tab must not reset it')
assert.match(dashboard, /paneScrollPositions/)
assert.match(dashboard, /closeNavigationOverlays/)
assert.doesNotMatch(dashboard.match(/openDashPane\(item\)[\s\S]*?\n    \},/)?.[0] || '', /scrollIntoView/)
assert.match(teacherSection, /item\?\.related_assignment\?\.recipient_id/)
assert.match(teacherSection, /item\?\.related_assignment\?\.id/)
assert.match(teacherSection, /closeNavigationOverlays\(\)/)
assert.match(memorisation, /studentDashboardReturnHref/)
assert.match(memorisation, /return_tab/)
assert.match(assignmentService, /'return_tab' => 'learning'/)

console.log('student-dashboard-navigation.test.mjs: ok')
