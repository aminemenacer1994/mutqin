/**
 * Homepage testimonials.
 *
 * Public display: an entry is shown only when `published` is true and
 * `placeholder` is not true. The samples below are layout copy, not customer
 * reviews. They stay here so the record shape is obvious, and the carousel
 * leaves them out.
 *
 * Order: set `order` (lower first). When a real quote is added, prefer this
 * sequence and avoid two quotes about the same benefit:
 * ai_recite, personalised_revision, progressive_hiding, daily_consistency,
 * listen_repeat, saved_sessions.
 * Keep the learner's wording. Do not rewrite a quote to claim a benefit they
 * did not describe. There is no approved AI Recite quote yet.
 *
 * Collection: a signed-in learner can submit from this section. The form posts
 * to the existing /api/feedback endpoint with context.intent set to
 * community_testimonial. The server stores publication_consent and forces
 * moderation_status to "pending" and published to false. Submissions are not
 * inserted into this file and are not shown on the homepage. After review,
 * copy the approved quote, the display name the learner chose, and an optional
 * role into this array with published: true.
 */

/** Set to true when permission-approved quotes are ready for the homepage. */
export const TESTIMONIALS_SECTION_ENABLED = false

export const TESTIMONIAL_BENEFIT_ORDER = Object.freeze([
  'ai_recite',
  'personalised_revision',
  'progressive_hiding',
  'daily_consistency',
  'listen_repeat',
  'saved_sessions',
])

export const TESTIMONIALS = Object.freeze([
  {
    id: 'ahmed',
    name: 'Ahmed',
    role: 'Hifz Student',
    benefit: 'daily_consistency',
    order: 40,
    placeholder: true,
    published: false,
    quote: 'Having my revision organised in one place makes it much easier to stay consistent. I can see what I\'ve covered and what still needs attention.',
  },
  {
    id: 'maryam',
    name: 'Maryam',
    role: 'Qur\'an Student',
    benefit: 'progressive_hiding',
    order: 30,
    placeholder: true,
    published: false,
    quote: 'I really like being able to hide the words gradually as I memorise. It makes practising feel much more natural.',
  },
  {
    id: 'yusuf',
    name: 'Yusuf',
    role: 'Daily Revision',
    benefit: 'personalised_revision',
    order: 20,
    placeholder: true,
    published: false,
    quote: 'Instead of wondering what to revise next, I can open Mutqin and pick up where I left off.',
  },
  {
    id: 'aisha',
    name: 'Aisha',
    role: 'Hifz Student',
    benefit: 'practice_layouts',
    order: 70,
    placeholder: true,
    published: false,
    quote: 'The different memorisation layouts are really useful. I can switch between reading, listening and testing myself.',
  },
  {
    id: 'ibrahim',
    name: 'Ibrahim',
    role: 'Qur\'an Learner',
    benefit: 'listen_repeat',
    order: 50,
    placeholder: true,
    published: false,
    quote: 'Being able to listen to individual ayahs and repeat them has made my daily practice much simpler.',
  },
  {
    id: 'fatima',
    name: 'Fatima',
    role: 'Qur\'an Student',
    benefit: 'focus',
    order: 80,
    placeholder: true,
    published: false,
    quote: 'I like how everything is kept simple. I can focus on my recitation without constantly moving between different screens.',
  },
].map((item) => Object.freeze({ ...item })))

export function testimonialInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const letters = parts.length === 1
    ? parts[0].slice(0, 1)
    : `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`
  return letters.toLocaleUpperCase('en')
}

export function testimonialImageSrc(image) {
  const value = String(image || '').trim()
  if (!value.startsWith('/images/') || value.includes('..') || /[\s?#]/.test(value)) return ''
  return value
}

/**
 * Permission-approved quotes only, in `order`.
 * @param {readonly object[]} [list]
 */
export function publicTestimonials(list = TESTIMONIALS) {
  return list
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (
      item
      && item.published === true
      && item.placeholder !== true
      && String(item.id || '').trim()
      && String(item.quote || '').trim()
      && String(item.name || '').trim()
    ))
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.item.order)) ? Number(a.item.order) : 1000 + a.index
      const orderB = Number.isFinite(Number(b.item.order)) ? Number(b.item.order) : 1000 + b.index
      return orderA - orderB || a.index - b.index
    })
    .map(({ item }) => item)
}

export function previewTestimonials(list = TESTIMONIALS) {
  return list.filter((item) => item && item.placeholder === true)
}

/** Local layout check only. Production hosts never receive the sample quotes. */
export function localTestimonialPreviewRequested() {
  if (typeof window === 'undefined') return false
  const host = String(window.location?.hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') return false
  try {
    return new URLSearchParams(window.location.search || '').get('previewTestimonials') === '1'
  } catch {
    return false
  }
}
