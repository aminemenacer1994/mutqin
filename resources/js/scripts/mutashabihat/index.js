export {
  buildAyahComparison,
  compareAyahTexts,
  renderComparedAyahHtml,
  renderRecallBlankHtml,
} from './compareAyahs.js'
export {
  findPairsForVerseKey,
  listAllMutashabihatPairs,
  otherVerseKeyInPair,
  resolvePairById,
  resolveVerseKey,
} from './pairsIndex.js'
export { detectMutashabihatDrift } from './detectDrift.js'
export {
  fetchPairsForAyah,
  fetchMutashabihatProgress,
  recordMutashabihatConfusion,
  recordMutashabihatPractice,
  compareMutashabihatAyahs,
} from './api.js'
export { registerApiMutashabihatPairs } from './pairsIndex.js'
export {
  deriveMutashabihatStatus,
  filterMutashabihatRows,
  mergeCatalogWithProgress,
  prioritiseMutashabihatRows,
} from './pairStatus.js'
