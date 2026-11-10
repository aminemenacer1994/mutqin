/**
 * Landing-page tutorial videos, in display order.
 *
 * Feature names, taglines and descriptions are taken from each video's
 * published YouTube title and description (oEmbed + watch page, November 2026).
 * Edit this list to change the carousel. Do not infer a feature from the id alone.
 *
 * `youtubeTitle` is the exact YouTube title, kept here so the mapping stays checkable.
 */
export const TUTORIALS_PAGE_PATH = '/features'

export const TUTORIAL_VIDEOS = Object.freeze([
  {
    id: 'ecSmacClOSw',
    order: 1,
    feature: 'Listen & Repeat',
    tagline: 'Listen, then repeat each ayah at your own pace.',
    description: 'Practise by listening to a reciter and repeating ayahs on the Mushaf.',
    youtubeTitle: "How to Use Listen & Repeat in Mutqin | Qur'an Memorisation Tutorial",
  },
  {
    id: 'ZWi0qKw7y7E',
    order: 2,
    feature: 'Gradual Blurring',
    tagline: 'Hide the text a little more as recall gets stronger.',
    description: 'Move from reading to recalling by gradually hiding the Arabic.',
    youtubeTitle: "How to Use Gradual Text Blurring in Mutqin | Improve Your Qur'an Memorisation",
  },
  {
    id: 'VpIf9YexD0E',
    order: 3,
    feature: 'Tajweed Colours',
    tagline: 'Follow colour-coded rules while you read.',
    description: 'Turn on Tajweed colours and open the rules beside the Mushaf.',
    youtubeTitle: "How to Use Tajweed Colours & Rules in Mutqin | Qur'an Reading Guide",
  },
  {
    id: 'sEIK13nKxEw',
    order: 4,
    feature: 'Translation',
    tagline: 'Read the meaning, or follow a transliteration.',
    description: 'Show a translation or transliteration while you read the Mushaf.',
    youtubeTitle: "How to Use Qur'an Translation & Transliteration in Mutqin | Step-by-Step Guide",
  },
  {
    id: '8xrNze6_3Ms',
    order: 5,
    feature: 'Saved Sessions',
    tagline: 'Leave, then resume from the same place.',
    description: 'Save a memorisation or revision session and continue it later.',
    youtubeTitle: "How to Save & Resume Your Qur'an Memorisation Sessions in Mutqin | Step-by-Step Guide",
  },
  {
    id: 'u9B3FyKnqn4',
    order: 6,
    feature: 'Dark Mode',
    tagline: 'Switch the theme for quieter reading.',
    description: 'Enable dark mode and see how the Mushaf appearance changes.',
    youtubeTitle: "How to Enable Dark Mode in Mutqin | Customise Your Qur'an Reading Experience",
  },
  {
    id: 'NwUUi9SnTIo',
    order: 7,
    feature: 'Mushaf Modes',
    tagline: 'Choose a page layout for reading and practice.',
    description: 'Switch between the traditional Mushaf and the stacked layout.',
    youtubeTitle: "How to Switch Mushaf Modes in Mutqin | Customise Your Qur'an Reading Layout",
  },
  {
    id: 'cQwJUCY7IVE',
    order: 8,
    feature: 'Mustahabbat',
    tagline: 'Open recommended guidance while you read.',
    description: 'Find Mustahabbat and read the guidance shown on the Mushaf.',
    youtubeTitle: "How to Use Mustahabbat in Mutqin | Qur'an Recitation Guide",
  },
].map((video) => Object.freeze(video)))

export function tutorialVideosInOrder() {
  return [...TUTORIAL_VIDEOS].sort((a, b) => a.order - b.order)
}

export function tutorialThumbnailUrl(videoId) {
  const id = String(videoId ?? '').trim()
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return ''
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}
