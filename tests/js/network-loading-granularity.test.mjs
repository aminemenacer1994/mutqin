import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../../resources/js/views/Memorisation.js', import.meta.url),
  'utf8',
)

assert.match(
  source,
  /peekCachedSessionVerses\(/,
  'Memorisation must expose a synchronous session verse cache peek helper',
)

assert.match(
  source,
  /syncWorkspaceFromControls[\s\S]*?peekCachedSessionVerses[\s\S]*?if \(!hasValidVerseCache\)[\s\S]*?clearWorkspaceForConfigChange/,
  'workspace sync must skip wiping ayahs when a valid verse cache exists',
)

assert.match(
  source,
  /async loadVerses[\s\S]*?peekCachedSessionVerses[\s\S]*?const hadVisibleVerses[\s\S]*?if \(!hadVisibleVerses\) this\.isDataReady = false/,
  'loadVerses must try cache before flipping isDataReady off',
)

assert.match(
  source,
  /async ensureMadaniPageLoaded[\s\S]*?loadGeneration = this\.madaniLoadRequestId[\s\S]*?loadGeneration !== this\.madaniLoadRequestId/,
  'unicode mushaf page loads must ignore stale range/bootstrap generations',
)

assert.match(
  source,
  /async bootstrapQpcMadaniViewer[\s\S]*?bootstrapToken[\s\S]*?_qpcMadaniBootstrapToken/,
  'QPC mushaf bootstrap must cancel stale bootstraps',
)

assert.doesNotMatch(
  source,
  /isDataReady\(newVal\)[\s\S]{0,120}syncBodyScrollLock/,
  'isDataReady must not drive global scroll lock',
)

assert.match(
  source,
  /postSessionActionsBusy\(\)[\s\S]*?postSessionRecommendationStarting/,
  'post-session footer busy must not depend on background recommendation loading alone',
)

console.log('network-loading-granularity.test.mjs: all assertions passed')
