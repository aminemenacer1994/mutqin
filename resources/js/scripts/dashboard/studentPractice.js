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

function withPracticeReturn(href) {
  return withParams(href, (params) => {
    params.set('return', 'dashboard')
    params.set('return_tab', 'home')
    params.delete('assignment_recipient')
  })
}

/**
 * Deep link into the existing workspace. Assignment links stay on the
 * teacher start API; these links never set assignment_recipient.
 * return=dashboard lets the reader show the practice-only note and a way back.
 */
export function practiceToolHref(base, toolId) {
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
  return withPracticeReturn(href)
}

/** Formal teacher work is the only session that can be submitted. */
export function practiceSessionContext(assignmentRecipientId) {
  return Number(assignmentRecipientId || 0) > 0 ? 'assignment' : 'practice'
}
