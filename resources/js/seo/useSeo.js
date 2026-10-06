const SEO_ATTR = 'data-mutqin-seo'

function isBrowser() {
  return typeof document !== 'undefined' && typeof document.head !== 'undefined'
}

function upsertNamedMeta(attr, key, content) {
  if (!content) return
  const attrSelector = `meta[${attr}="${CSS.escape(key)}"]`
  let el = document.head.querySelector(`${attrSelector}[${SEO_ATTR}]`)
  if (!el) el = document.head.querySelector(attrSelector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute(SEO_ATTR, '1')
  el.setAttribute('content', content)
}

function upsertLink(rel, href, extra = {}) {
  if (!href) return
  const extraKey = extra.hreflang ? `[hreflang="${CSS.escape(extra.hreflang)}"]` : ''
  let el = document.head.querySelector(`link[rel="${CSS.escape(rel)}"]${extraKey}[${SEO_ATTR}]`)
  if (!el) el = document.head.querySelector(`link[rel="${CSS.escape(rel)}"]${extraKey}`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute(SEO_ATTR, '1')
  el.setAttribute('href', href)
  Object.entries(extra).forEach(([name, value]) => {
    if (value) el.setAttribute(name, value)
  })
}

function replaceJsonLd(blocks) {
  document.head.querySelectorAll(`script[type="application/ld+json"][${SEO_ATTR}]`).forEach((node) => {
    node.remove()
  })
  if (!Array.isArray(blocks) || blocks.length === 0) return
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute(SEO_ATTR, '1')
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': blocks,
  })
  document.head.appendChild(script)
}

/**
 * Apply a SEO document to <head>, updating existing tags instead of duplicating them.
 *
 * @param {Record<string, unknown>} seo
 */
export function applyDocumentSeo(seo = {}) {
  if (!isBrowser() || !seo || typeof seo !== 'object') return seo

  if (seo.title) document.title = String(seo.title)

  upsertNamedMeta('name', 'description', seo.description)
  if (seo.keywords) upsertNamedMeta('name', 'keywords', seo.keywords)
  upsertNamedMeta('name', 'robots', seo.robots)

  upsertNamedMeta('property', 'og:type', seo.ogType)
  upsertNamedMeta('property', 'og:title', seo.ogTitle || seo.title)
  upsertNamedMeta('property', 'og:description', seo.ogDescription || seo.description)
  upsertNamedMeta('property', 'og:url', seo.ogUrl || seo.canonical)
  upsertNamedMeta('property', 'og:image', seo.ogImage)
  if (seo.ogImageWidth) upsertNamedMeta('property', 'og:image:width', String(seo.ogImageWidth))
  if (seo.ogImageHeight) upsertNamedMeta('property', 'og:image:height', String(seo.ogImageHeight))
  upsertNamedMeta('property', 'og:image:alt', seo.ogImageAlt)
  upsertNamedMeta('property', 'og:locale', seo.ogLocale)
  upsertNamedMeta('property', 'og:site_name', 'Mutqin')

  upsertNamedMeta('name', 'twitter:card', seo.twitterCard || 'summary_large_image')
  upsertNamedMeta('name', 'twitter:title', seo.twitterTitle || seo.title)
  upsertNamedMeta('name', 'twitter:description', seo.twitterDescription || seo.description)
  upsertNamedMeta('name', 'twitter:image', seo.twitterImage || seo.ogImage)
  upsertNamedMeta('name', 'twitter:image:alt', seo.ogImageAlt)

  upsertLink('canonical', seo.canonical)
  const sitemapHref = seo.sitemap
    || (typeof window !== 'undefined' ? new URL('/sitemap.xml', window.location.origin).href : '')
  upsertLink('sitemap', sitemapHref)

  const hreflang = Array.isArray(seo.hreflang) ? seo.hreflang : []
  document.head.querySelectorAll(`link[rel="alternate"][${SEO_ATTR}]`).forEach((node) => node.remove())
  hreflang.forEach((entry) => {
    if (!entry?.href || !entry?.hreflang) return
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', entry.hreflang)
    link.setAttribute('href', entry.href)
    link.setAttribute(SEO_ATTR, '1')
    document.head.appendChild(link)
  })

  replaceJsonLd(seo.jsonLd)
  return seo
}

/**
 * Shared client SEO helper. Blade already prints tags; this keeps them in
 * sync if a Vue island needs to override fields later.
 *
 * @param {Record<string, unknown>} [overrides]
 */
export function useSeo(overrides = {}) {
  const base = (typeof window !== 'undefined' && window.mutqinSeo) ? window.mutqinSeo : {}
  const next = { ...base, ...overrides }
  if (typeof window !== 'undefined') window.mutqinSeo = next
  return applyDocumentSeo(next)
}
