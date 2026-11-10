/**
 * Placeholder testimonials for the landing page.
 *
 * Sample layout copy only — not verified customer reviews.
 * Replace every entry with a real, permission-approved testimonial
 * before publishing. Names, roles and quotes are edited here.
 */
export const TESTIMONIALS = Object.freeze([
  {
    id: 'ahmed',
    name: 'Ahmed',
    role: 'Hifz Student',
    quote: 'Having my revision organised in one place makes it much easier to stay consistent. I can see what I\'ve covered and what still needs attention.',
  },
  {
    id: 'maryam',
    name: 'Maryam',
    role: 'Qur\'an Student',
    quote: 'I really like being able to hide the words gradually as I memorise. It makes practising feel much more natural.',
  },
  {
    id: 'yusuf',
    name: 'Yusuf',
    role: 'Daily Revision',
    quote: 'Instead of wondering what to revise next, I can open Mutqin and pick up where I left off.',
  },
  {
    id: 'aisha',
    name: 'Aisha',
    role: 'Hifz Student',
    quote: 'The different memorisation layouts are really useful. I can switch between reading, listening and testing myself.',
  },
  {
    id: 'ibrahim',
    name: 'Ibrahim',
    role: 'Qur\'an Learner',
    quote: 'Being able to listen to individual ayahs and repeat them has made my daily practice much simpler.',
  },
  {
    id: 'fatima',
    name: 'Fatima',
    role: 'Qur\'an Student',
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
