/**
 * Deep link the existing memorisation workspace already consumes.
 * Unspecified settings are omitted so the workspace keeps its own defaults.
 */
export function buildSessionVoiceHref(base, command = {}) {
  const raw = String(base || '/memorisation').trim() || '/memorisation'
  const hashIndex = raw.indexOf('#')
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const [path, query = ''] = withoutHash.split('?')
  const params = new URLSearchParams(query)
  params.set('surah', String(command.surah))
  params.set('from', String(command.start_ayah))
  params.set('to', String(command.end_ayah))
  params.set('goal', String(command.goal || 'memorise'))
  params.set('return', 'dashboard')
  if (command.reciter) params.set('reciter', String(command.reciter))
  else params.delete('reciter')
  if (command.speed != null && command.speed !== '') params.set('speed', String(command.speed))
  else params.delete('speed')
  if (command.repetitions != null && command.repetitions !== '') {
    params.set('repetitions', String(command.repetitions))
  } else {
    params.delete('repetitions')
  }
  const next = params.toString()
  return `${path || '/memorisation'}${next ? `?${next}` : ''}${hash}`
}
