/**
 * Saved Sessions tab/section state must survive save, delete, refetch, and refresh.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const vueSource = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')

// Persist active Saved section in uiState (not DOM-only).
{
  assert.match(source, /savedActiveSection:\s*'saved_in_progress'/)
  assert.match(source, /savedActiveSection:\s*this\.savedActiveSection/)
  assert.match(source, /state\.savedActiveSection/)
  assert.match(source, /SAVED_SESSION_SECTION_KEYS/)
}

// openToolsPanel preserves current tab when tab option is omitted.
{
  assert.match(
    source,
    /openToolsPanel\(options = \{\}\)[\s\S]*hasExplicitTab[\s\S]*Object\.prototype\.hasOwnProperty\.call\(options, 'tab'\)/,
  )
  assert.doesNotMatch(
    source,
    /openToolsPanel\(options = \{\}\)[\s\S]{0,220}tab = 'tools'/,
  )
}

// Save stays on Saved tab instead of closing the offcanvas.
{
  assert.match(source, /saveCurrentSessionWithName\(\)[\s\S]*this\.tab = 'saved'/)
  assert.doesNotMatch(
    source,
    /saveCurrentSessionWithName\(\)[\s\S]{0,180}closeToolsPanel\(\)/,
  )
}

// Explicit offcanvas save must not be blocked by the disabled auto-save flag.
{
  assert.match(source, /autoSaveSessionsEnabled:\s*false/)
  assert.doesNotMatch(
    source,
    /saveCurrentSessionSilently[\s\S]{0,200}if\s*\(\s*!this\.autoSaveSessionsEnabled\s*\)\s*return null/,
  )
}

// Delete confirm keeps the offcanvas open on Saved.
{
  assert.match(source, /preserveToolsPanel:\s*true/)
  assert.match(
    source,
    /openConfirmModal\(options\)[\s\S]*if \(!options\.preserveToolsPanel\)/,
  )
}

// Section helpers: single active section + status-driven focus.
{
  assert.match(source, /setSavedActiveSection\s*\(/)
  assert.match(source, /focusSavedSessionSectionForSession\s*\(/)
  assert.match(source, /ensureSavedSectionVisible\s*\(/)
  assert.match(source, /syncSavedSectionOpenState\s*\(/)
  assert.match(source, /if \(this\.tab === 'saved'\) this\.focusSavedSessionSectionForSession/)
}

// uiState tab wins over centralSession on boot (avoid stale overwrite).
{
  assert.match(
    source,
    /loadCentralSessionState\(\)[\s\S]*if \(!\['tools', 'techniques', 'saved', 'stats'\]\.includes\(this\.tab\)\)/,
  )
}

// Saved groups always render so an emptied section can show its empty state.
{
  assert.doesNotMatch(vueSource, /v-if="savedSessions\.length > 0"\s*\n\s*class="saved-sheet__groups"/)
  assert.match(vueSource, /savedActiveSection === group\.key/)
}

console.log('saved-sessions-tab-state.test.mjs: ok')
