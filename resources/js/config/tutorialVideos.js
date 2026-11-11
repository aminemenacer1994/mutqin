/**
 * Landing-page tutorial videos, in display order.
 *
 * Each card keeps the YouTube film that actually demonstrates that feature.
 * AI Recite and Personalised Revision are omitted until a matching film exists.
 * Edit this list to change the homepage tutorial grid. Do not infer a feature from an id.
 *
 * `youtubeTitle` is the exact YouTube title, kept so the mapping stays checkable.
 * Durations are videoDetails.lengthSeconds from YouTube's player metadata on 2026-11-11.
 */
import { extractYoutubeVideoId } from '../scripts/seo/youtubeEmbed.js'

export const TUTORIALS_PAGE_PATH = '/features'
export const MEMORISATION_PATH = '/memorisation'

/** Homepage shows two rows of three tutorial cards. */
export const HOMEPAGE_TUTORIAL_VISIBLE_COUNT = 6

/**
 * Set this to a real YouTube id or watch URL to show the featured journey film.
 * An empty value hides the featured area entirely.
 */
export const FEATURED_TUTORIAL_URL = ''

export const TUTORIAL_DURATION_SECONDS = Object.freeze({
  ZWi0qKw7y7E: 76,
  ecSmacClOSw: 67,
  VpIf9YexD0E: 27,
  '8xrNze6_3Ms': 52,
  sEIK13nKxEw: 41,
  u9B3FyKnqn4: 48,
  NwUUi9SnTIo: 42,
  cQwJUCY7IVE: 65,
})

export const TUTORIAL_VIDEOS = Object.freeze([
  {
    id: 'ZWi0qKw7y7E',
    order: 1,
    featureId: 'progressive-hiding',
    feature: 'Progressive Hiding',
    tagline: 'Gradually hide words to strengthen memorisation.',
    description: 'Hide a little more of the text as recall gets stronger.',
    youtubeTitle: "How to Use Gradual Text Blurring in Mutqin | Improve Your Qur'an Memorisation",
  },
  {
    id: 'ecSmacClOSw',
    order: 2,
    featureId: 'listen-and-repeat',
    feature: 'Listen & Repeat',
    tagline: 'Listen to individual ayahs and repeat them.',
    description: 'Practise by listening to a reciter and repeating ayahs on the Mushaf.',
    youtubeTitle: "How to Use Listen & Repeat in Mutqin | Qur'an Memorisation Tutorial",
  },
  {
    id: 'VpIf9YexD0E',
    order: 3,
    featureId: 'tajweed-colours',
    feature: 'Tajweed Colours',
    tagline: 'Follow colour-coded Tajweed rules.',
    description: 'Turn on Tajweed colours and open the rules beside the Mushaf.',
    youtubeTitle: "How to Use Tajweed Colours & Rules in Mutqin | Qur'an Reading Guide",
  },
  {
    id: '8xrNze6_3Ms',
    order: 4,
    featureId: 'saved-sessions',
    feature: 'Saved Sessions',
    tagline: 'Continue memorising from where you left off.',
    description: 'Save a memorisation or revision session and continue it later.',
    youtubeTitle: "How to Save & Resume Your Qur'an Memorisation Sessions in Mutqin | Step-by-Step Guide",
  },
  {
    id: 'sEIK13nKxEw',
    order: 5,
    featureId: 'translation',
    feature: 'Translation',
    tagline: 'Explore meanings and transliteration.',
    description: 'Show a translation or transliteration while you read the Mushaf.',
    youtubeTitle: "How to Use Qur'an Translation & Transliteration in Mutqin | Step-by-Step Guide",
  },
  {
    id: 'u9B3FyKnqn4',
    order: 6,
    featureId: 'dark-mode',
    feature: 'Dark Mode',
    tagline: 'Enjoy a comfortable reading experience.',
    description: 'Enable dark mode and see how the Mushaf appearance changes.',
    youtubeTitle: "How to Enable Dark Mode in Mutqin | Customise Your Qur'an Reading Experience",
  },
  {
    id: 'NwUUi9SnTIo',
    order: 7,
    featureId: 'mushaf-modes',
    feature: 'Mushaf Modes',
    tagline: 'Choose a page layout for reading and practice.',
    description: 'Switch between the traditional Mushaf and the stacked layout.',
    youtubeTitle: "How to Switch Mushaf Modes in Mutqin | Customise Your Qur'an Reading Layout",
  },
  {
    id: 'cQwJUCY7IVE',
    order: 8,
    featureId: 'mustahabbat',
    feature: 'Mustahabbat',
    tagline: 'Open recommended guidance while you read.',
    description: 'Find Mustahabbat and read the guidance shown on the Mushaf.',
    youtubeTitle: "How to Use Mustahabbat in Mutqin | Qur'an Recitation Guide",
  },
].map((video) => Object.freeze({ ...video, destination: MEMORISATION_PATH })))

export function tutorialVideosInOrder() {
  return [...TUTORIAL_VIDEOS]
    .filter((video) => extractYoutubeVideoId(video.id))
    .sort((a, b) => a.order - b.order)
}

export function homepageTutorialVideos() {
  return tutorialVideosInOrder().slice(0, HOMEPAGE_TUTORIAL_VISIBLE_COUNT)
}

export function featuredTutorial() {
  const id = extractYoutubeVideoId(FEATURED_TUTORIAL_URL)
  if (!id) return null
  return Object.freeze({
    id,
    featureId: 'memorisation-journey',
    feature: 'Your memorisation journey with Mutqin',
    tagline: 'From choosing your verses to practising, testing and revising — see how Mutqin helps you build a consistent routine.',
    description: 'From choosing your verses to practising, testing and revising — see how Mutqin helps you build a consistent routine.',
    youtubeTitle: 'Your memorisation journey with Mutqin',
    destination: MEMORISATION_PATH,
  })
}

export function tutorialThumbnailUrl(videoId) {
  const id = extractYoutubeVideoId(videoId)
  if (!id) return ''
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function tutorialDurationSeconds(videoId) {
  const id = extractYoutubeVideoId(videoId)
  const seconds = Number(TUTORIAL_DURATION_SECONDS[id])
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0
}

export function formatTutorialDuration(seconds) {
  const total = Number(seconds)
  if (!Number.isFinite(total) || total <= 0) return ''
  const rounded = Math.round(total)
  const minutes = Math.floor(rounded / 60)
  const secs = rounded % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function tutorialDurationLabel(videoId) {
  return formatTutorialDuration(tutorialDurationSeconds(videoId))
}
