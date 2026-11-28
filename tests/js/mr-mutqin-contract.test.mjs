import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

test('mr mutqin sidebar is wired into student dashboard', () => {
  const vue = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')
  assert.match(vue, /MrMutqinSidebarCard/)
  assert.match(vue, /mr-mutqin-assistant/)
  assert.match(vue, /#prepend/)
})

test('mr mutqin sidebar is wired into teacher dashboard', () => {
  const vue = readFileSync(join(root, 'resources/js/views/TeacherDashboard.vue'), 'utf8')
  assert.match(vue, /MrMutqinSidebarCard/)
  assert.match(vue, /MrMutqinAssistantModal/)
})

test('mr mutqin api routes exist', () => {
  const routes = readFileSync(join(root, 'routes/api.php'), 'utf8')
  assert.match(routes, /mr-mutqin\/interpret/)
  assert.match(routes, /MrMutqinController/)
})