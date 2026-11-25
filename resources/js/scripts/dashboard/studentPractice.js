import { memorisationGoalHref } from '../session/sessionGoal.js'

/** Self-practice tools. Each one opens an existing memorisation deep link. */
export const PRACTICE_SELF_TOOL_IDS = Object.freeze([
  'memorise',
  'revise',
  'recite',
  'mushaf',
  'hide',
  'listen',
  'one',
  'find',
  'saved',
])

function memorisationPath(base) {
  const raw = String(base || '/memorisation').trim() || '/memorisation'
  const hashIndex = raw.indexOf('#')
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const [path, query = ''] = withoutHash.split('?')
  return { path: path || '/memorisation', params: new URLSearchParams(query) }
}

function withParams(base, assign) {
  const { path, params } = memorisationPath(base)
  assign(params)
  const next = params.toString()
  return `${path}${next ? `?${next}` : ''}`
}

function withPracticeReturn(href, returnTab = 'home') {
  return withParams(href, (params) => {
    params.set('return', 'dashboard')
    params.set('return_tab', returnTab)
    params.delete('assignment_recipient')
  })
}

/** Canonical practice modes for the student Practice hub (spec order). */
export const STUDENT_PRACTICE_HUB_TOOL_DEFS = Object.freeze([
  { id: 'mushaf', icon: 'bi-book', labelKey: 'dashboard.practice_tool_read', hintKey: 'dashboard.practice_tool_read_hint' },
  { id: 'listen', icon: 'bi-volume-up', labelKey: 'dashboard.practice_tool_listen', hintKey: 'dashboard.practice_tool_listen_hint' },
  { id: 'memorise', icon: 'bi-journal-bookmark', labelKey: 'dashboard.practice_tool_memorise', hintKey: 'dashboard.practice_tool_memorise_hint' },
  { id: 'revise', icon: 'bi-arrow-repeat', labelKey: 'dashboard.practice_tool_revise', hintKey: 'dashboard.practice_tool_revise_hint' },
  { id: 'recite', icon: 'bi-mic', labelKey: 'dashboard.practice_tool_recite', hintKey: 'dashboard.practice_tool_recite_hint' },
  { id: 'hide', icon: 'bi-eye-slash', labelKey: 'dashboard.practice_tool_hide', hintKey: 'dashboard.practice_tool_hide_hint' },
  { id: 'one', icon: 'bi-dot', labelKey: 'dashboard.practice_tool_one', hintKey: 'dashboard.practice_tool_one_hint' },
  { id: 'find', icon: 'bi-search', labelKey: 'dashboard.practice_tool_find', hintKey: 'dashboard.practice_tool_find_hint' },
  { id: 'saved', icon: 'bi-bookmark', labelKey: 'dashboard.practice_tool_saved', hintKey: 'dashboard.practice_tool_saved_hint' },
])

export const STUDENT_HOME_PRACTICE_TOOL_IDS = Object.freeze(['memorise', 'mushaf', 'recite'])

/**
 * @param {object} options
 * @param {(key: string) => string} options.t
 * @param {string} options.base memorisation URL base
 * @param {string} [options.pricingHref]
 * @param {string} [options.returnTab]
 * @param {readonly string[]} [options.toolIds]
 * @param {Record<string, boolean>} [options.lockedById]
 */
export function buildStudentPracticeTools({
  t,
  base,
  pricingHref = '/pricing',
  returnTab = 'home',
  toolIds = PRACTICE_SELF_TOOL_IDS,
  lockedById = {},
} = {}) {
  const defsById = Object.fromEntries(STUDENT_PRACTICE_HUB_TOOL_DEFS.map((row) => [row.id, row]))
  return toolIds.map((id) => {
    const def = defsById[id] || {
      id,
      icon: 'bi-circle',
      labelKey: `dashboard.practice_tool_${id}`,
      hintKey: `dashboard.practice_tool_${id}_hint`,
    }
    return {
      key: id,
      href: practiceToolHref(base, id, { returnTab }),
      icon: def.icon,
      label: t(def.labelKey),
      hint: t(def.hintKey),
      locked: Boolean(lockedById[id]),
      upsellHref: pricingHref,
    }
  })
}

/**
 * Deep link into the existing workspace. Assignment links stay on the
 * teacher start API; these links never set assignment_recipient.
 * return=dashboard lets the reader show the practice-only note and a way back.
 */
export function practiceToolHref(base, toolId, { returnTab = 'home' } = {}) {
  const id = String(toolId || '').trim().toLowerCase()
  let href = memorisationGoalHref(base, 'memorise')
  if (id === 'revise') href = memorisationGoalHref(base, 'revise')
  else if (id === 'recite') href = memorisationGoalHref(base, 'test')
  else if (id === 'mushaf') href = withParams(base, (params) => params.set('view', 'madani_mushaf'))
  else if (id === 'hide') {
    href = withParams(base, (params) => {
      params.set('setup', '1')
      params.set('goal', 'memorise')
      params.set('technique', 'blur')
    })
  } else if (id === 'listen') {
    href = withParams(base, (params) => {
      params.set('setup', '1')
      params.set('goal', 'memorise')
      params.set('practice_tool', 'talqin')
    })
  } else if (id === 'one') {
    href = withParams(base, (params) => {
      params.set('setup', '1')
      params.set('goal', 'memorise')
      params.set('practice_tool', 'focus')
    })
  } else if (id === 'find') href = withParams(base, (params) => params.set('panel', 'find'))
  else if (id === 'saved') href = withParams(base, (params) => params.set('panel', 'saved'))
  return withPracticeReturn(href, returnTab)
}

/** Formal teacher work is the only session that can be submitted. */
export function practiceSessionContext(assignmentRecipientId) {
  return Number(assignmentRecipientId || 0) > 0 ? 'assignment' : 'practice'
}
