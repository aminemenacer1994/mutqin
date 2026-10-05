/**
 * Privacy-conscious GA4 events for SEO → conversion funnels.
 *
 * Never send: Quran text, transcripts, emails, passwords, or audio.
 * Attribution is sessionStorage-only (first landing + UTMs + referrer host).
 */

const TOOL_ATTR_KEY = 'mutqin_seo_tool'
const ATTR_KEY = 'mutqin_seo_attr'
const REG_COMPLETE_KEY = 'mutqin_seo_reg_complete_sent'
const GUIDE_KEY = 'mutqin_seo_guide'

const ORGANIC_HOST_RE = /(?:^|\.)((google|googleweblight|bing|duckduckgo|yahoo|yandex|baidu|ecosia)\.)/i
const PAID_MEDIUM_RE = /^(cpc|ppc|paid|paidsearch|display|retargeting|cpm|cpv)$/i

function safeParams(params = {}) {
  const safe = {}
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null) return
    const type = typeof value
    if (type === 'number' || type === 'boolean') {
      safe[key] = value
      return
    }
    if (type !== 'string') return
    if (value.length > 80 || /[\u0600-\u06FF]/.test(value)) return
    if (/@/.test(value)) return
    safe[key] = value
  })
  return safe
}

function pathOnly(input = '') {
  try {
    if (!input) return '/'
    if (input.startsWith('http')) {
      const url = new URL(input)
      return (url.pathname || '/').replace(/\/+$/, '') || '/'
    }
    const path = String(input).split('?')[0].split('#')[0]
    return path.replace(/\/+$/, '') || '/'
  } catch {
    return '/'
  }
}

function referrerHost() {
  if (typeof document === 'undefined') return ''
  try {
    const ref = document.referrer || ''
    if (!ref) return ''
    return new URL(ref).hostname.replace(/^www\./, '').slice(0, 80)
  } catch {
    return ''
  }
}

function readStorage(key) {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key, value, maxLen = 200) {
  if (typeof window === 'undefined') return
  try {
    if (value == null || value === '') window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, String(value).slice(0, maxLen))
  } catch {
    // ignore private-mode / blocked storage
  }
}

function readAttr() {
  const raw = readStorage(ATTR_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAttr(attr) {
  // Attribution JSON is small but larger than a single token — allow a full blob.
  writeStorage(ATTR_KEY, JSON.stringify(attr), 1500)
}

function classifyTraffic({ utmSource, utmMedium, host }) {
  const medium = String(utmMedium || '').toLowerCase()
  const source = String(utmSource || '').toLowerCase()
  if (medium && PAID_MEDIUM_RE.test(medium)) return 'paid'
  if (medium === 'organic' || source === 'google' && medium === 'organic') return 'organic'
  if (medium === 'referral') return 'referral'
  if (medium === 'email' || medium === 'social' || medium === 'newsletter') return medium
  if (utmSource || utmMedium) return 'campaign'
  if (host && ORGANIC_HOST_RE.test(host)) return 'organic'
  if (host) return 'referral'
  return 'direct'
}

/**
 * Capture / refresh session attribution from the current URL + referrer.
 * First landing_path wins for the browser tab session.
 */
export function captureSeoAttribution(extra = {}) {
  if (typeof window === 'undefined') return readAttr()

  const params = new URLSearchParams(window.location.search || '')
  const prev = readAttr()
  const host = referrerHost()
  const utmSource = (params.get('utm_source') || prev.utm_source || '').slice(0, 40)
  const utmMedium = (params.get('utm_medium') || prev.utm_medium || '').slice(0, 40)
  const utmCampaign = (params.get('utm_campaign') || prev.utm_campaign || '').slice(0, 40)
  const landingPath = prev.landing_path || pathOnly(window.location.pathname)
  const pagePath = pathOnly(window.location.pathname)
  const traffic = classifyTraffic({ utmSource, utmMedium, host })

  const next = {
    landing_path: landingPath,
    page_path: pagePath,
    referrer_host: prev.referrer_host || host || '',
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    traffic_source: traffic,
    organic_likely: traffic === 'organic',
    // organic_likely is best-effort: many SERPs omit referrer; GA4 session source remains primary.
    tool: prev.tool || '',
    guide_path: prev.guide_path || '',
    page_kind: extra.page_kind || prev.page_kind || '',
    page_id: extra.page_id || prev.page_id || '',
  }

  if (extra.tool) next.tool = String(extra.tool).slice(0, 40)
  if (extra.guide_path) next.guide_path = pathOnly(extra.guide_path)
  if (params.get('utm_source') === 'seo_tool') {
    const tool = params.get('utm_campaign') || params.get('tool')
    if (tool) next.tool = String(tool).slice(0, 40)
  }

  writeAttr(next)
  if (next.tool) writeStorage(TOOL_ATTR_KEY, next.tool)
  return next
}

export function getSeoAttribution() {
  return { ...readAttr(), tool: peekSeoTool() || readAttr().tool || '' }
}

export function rememberSeoTool(toolId) {
  if (!toolId) return
  writeStorage(TOOL_ATTR_KEY, String(toolId).slice(0, 40))
  const attr = readAttr()
  attr.tool = String(toolId).slice(0, 40)
  writeAttr(attr)
}

export function peekSeoTool() {
  return readStorage(TOOL_ATTR_KEY)
}

export function clearSeoTool() {
  writeStorage(TOOL_ATTR_KEY, '')
  const attr = readAttr()
  if (attr.tool) {
    delete attr.tool
    writeAttr(attr)
  }
}

/** @deprecated Prefer captureSeoAttribution — kept for waiting-list callers */
export function captureSeoToolFromUrl() {
  captureSeoAttribution()
}

function emit(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  const attr = getSeoAttribution()
  const merged = safeParams({
    event_category: 'seo_conversion',
    landing_path: attr.landing_path,
    page_path: attr.page_path || pathOnly(window.location?.pathname),
    referrer_host: attr.referrer_host,
    utm_source: attr.utm_source,
    utm_medium: attr.utm_medium,
    utm_campaign: attr.utm_campaign,
    traffic_source: attr.traffic_source,
    organic_likely: Boolean(attr.organic_likely),
    tool: attr.tool || undefined,
    guide_path: attr.guide_path || undefined,
    page_kind: attr.page_kind || undefined,
    page_id: attr.page_id || undefined,
    ...params,
  })
  window.gtag('event', eventName, merged)
}

/** Low-level helper for custom SEO events. */
export function trackSeoEvent(eventName, params = {}) {
  captureSeoAttribution(params)
  emit(eventName, params)
}

/**
 * Public SEO / marketing page view.
 * kind: home | hub | feature | guide | article | tool | waiting_list
 */
export function trackSeoLandingView({
  kind,
  pageId = '',
  path = '',
  tool = '',
} = {}) {
  const pagePath = pathOnly(path || (typeof window !== 'undefined' ? window.location.pathname : '/'))
  const attrExtra = {
    page_kind: kind || '',
    page_id: pageId || '',
  }
  if (tool) attrExtra.tool = tool
  if (kind === 'guide' || kind === 'article') attrExtra.guide_path = pagePath

  captureSeoAttribution(attrExtra)
  if (tool) rememberSeoTool(tool)
  if (kind === 'guide' || kind === 'article') writeStorage(GUIDE_KEY, pagePath)

  emit('seo_landing_view', {
    page_kind: kind || 'page',
    page_id: pageId || undefined,
    page_path: pagePath,
  })

  if (kind === 'guide' || kind === 'article') {
    emit('seo_guide_view', {
      page_kind: kind,
      page_id: pageId || undefined,
      page_path: pagePath,
      guide_path: pagePath,
    })
  }

  if (kind === 'tool' && tool) {
    emit('seo_tool_view', {
      event_category: 'seo_tool',
      tool,
      page_path: pagePath,
    })
  }
}

export function trackSeoToolStart(tool, params = {}) {
  rememberSeoTool(tool)
  captureSeoAttribution({ tool, page_kind: 'tool' })
  emit('seo_tool_start', { tool, ...params })
}

export function trackSeoToolComplete(tool, params = {}) {
  rememberSeoTool(tool)
  captureSeoAttribution({ tool, page_kind: 'tool' })
  emit('seo_tool_complete', { tool, ...params })
}

/**
 * Backward-compatible tool tracker used by widgets.
 * Maps known events onto start/complete where clear.
 */
export function trackSeoTool(eventName, params = {}) {
  const safe = safeParams(params)
  if (safe.tool) rememberSeoTool(safe.tool)
  captureSeoAttribution(safe.tool ? { tool: safe.tool, page_kind: 'tool' } : {})

  // Preserve legacy event names for existing GA4 explorations.
  emit(eventName, { event_category: 'seo_tool', ...safe })

  if (eventName === 'seo_tool_quiz_start' || eventName === 'seo_tool_planner' || eventName === 'seo_tool_progress') {
    emit('seo_tool_start', { event_category: 'seo_tool', tool: safe.tool, ...safe })
  }
  if (eventName === 'seo_tool_quiz_complete') {
    emit('seo_tool_complete', { event_category: 'seo_tool', tool: safe.tool, ...safe })
  }
  if (eventName === 'seo_tool_find_ayah' && ['matched', 'none', 'short', 'error'].includes(safe.result)) {
    emit('seo_tool_start', { event_category: 'seo_tool', tool: safe.tool || 'find-ayah' })
    if (safe.result === 'matched' || safe.result === 'none') {
      emit('seo_tool_complete', { event_category: 'seo_tool', tool: safe.tool || 'find-ayah', result: safe.result })
    }
  }
  if ((eventName === 'seo_tool_planner' || eventName === 'seo_tool_progress') && safe.tool) {
    emit('seo_tool_complete', { event_category: 'seo_tool', tool: safe.tool, ...safe })
  }
}

export function trackSeoCtaClick({
  dest = 'cta',
  href = '',
  ctaId = '',
  label = '',
  tool = '',
} = {}) {
  if (tool) rememberSeoTool(tool)
  captureSeoAttribution(tool ? { tool } : {})
  const path = pathOnly(href)
  const isWaitingList = path === '/waiting-list' || dest === 'waiting_list' || dest === 'primary' && path.includes('waiting-list')

  emit('seo_cta_click', {
    dest: String(dest).slice(0, 40),
    cta_id: ctaId || dest,
    href_path: path,
    label: label ? String(label).slice(0, 40) : undefined,
  })

  if (isWaitingList || path === '/waiting-list') {
    emit('seo_waiting_list_click', {
      dest: 'waiting_list',
      href_path: path,
      cta_id: ctaId || dest,
    })
  }
}

export function trackWaitingListJoin({ alreadyJoined = false } = {}) {
  captureSeoAttribution({ page_kind: 'waiting_list' })
  const tool = peekSeoTool()
  emit('generate_lead', {
    event_category: 'conversion',
    method: 'waiting_list',
    already_joined: Boolean(alreadyJoined),
    ...(tool ? { tool } : {}),
  })
  if (tool) {
    emit('seo_tool_signup', {
      event_category: 'seo_tool',
      tool,
    })
    clearSeoTool()
  }
}

export function trackRegistrationStart() {
  captureSeoAttribution({ page_kind: 'register' })
  emit('seo_registration_start', {
    page_path: '/register',
  })
}

export function trackRegistrationComplete({ method = 'email' } = {}) {
  if (typeof window === 'undefined') return
  if (readStorage(REG_COMPLETE_KEY) === '1') return
  writeStorage(REG_COMPLETE_KEY, '1')
  captureSeoAttribution()
  const tool = peekSeoTool()
  emit('seo_registration_complete', {
    method: String(method).slice(0, 20),
    ...(tool ? { tool } : {}),
  })
  // GA4 recommended event for signup funnels
  emit('sign_up', {
    event_category: 'conversion',
    method: String(method).slice(0, 20),
    ...(tool ? { tool } : {}),
  })
  if (tool) {
    emit('seo_tool_signup', {
      event_category: 'seo_tool',
      tool,
      method: 'registration',
    })
  }
}

/**
 * Boot helper for app.js — safe on every page.
 */
export function initSeoConversionTracking({
  path = '',
  justRegistered = false,
  registerMethod = 'email',
} = {}) {
  if (typeof window === 'undefined') return
  captureSeoAttribution()
  const pagePath = pathOnly(path || window.location.pathname)

  if (pagePath === '/register') {
    trackRegistrationStart()
  }

  if (justRegistered) {
    trackRegistrationComplete({ method: registerMethod })
  }
}
