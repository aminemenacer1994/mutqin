<template>
  <section class="seo-tool" aria-labelledby="seo-tool-find-heading">
    <h2 id="seo-tool-find-heading">Type a few Arabic words</h2>
    <p>
      This public finder uses Mutqin’s ayah matching on text you type — at least three Arabic words, same as Find an ayah.
      Voice matching stays in the workspace. Nothing you type is sent to analytics.
    </p>
    <form class="seo-tool__find" @submit.prevent="search">
      <label>
        Arabic you remember
        <textarea
          v-model="query"
          dir="rtl"
          lang="ar"
          rows="3"
          placeholder="بسم الله الرحمن…"
          autocomplete="off"
        />
      </label>
      <div class="seo-tool__actions">
        <button class="info-btn info-btn--primary" type="submit" :disabled="loading">
          {{ loading ? 'Preparing the Qur’an index…' : 'Find ayah' }}
        </button>
      </div>
    </form>
    <p v-if="status" class="seo-tool__note" aria-live="polite">{{ status }}</p>
    <ul v-if="candidates.length" class="seo-tool__matches">
      <li v-for="item in candidates" :key="item.key">
        <strong>{{ item.surahName }} · {{ item.key }}</strong>
        <p class="seo-tool__arabic" dir="rtl" lang="ar">{{ displayArabic(item.arabic) }}</p>
      </li>
    </ul>
  </section>
</template>

<script>
import {
  ASK_MUTQIN_MIN_WORDS,
  matchHeardAyahPrefix,
  sanitizeAskMutqinAyahDisplay,
  tokenizeHeardArabic,
} from '../../scripts/askMutqin/matchAyah.js'
import { loadAskMutqinMatchingIndex } from '../../scripts/askMutqin/matchingIndex.js'
import { trackSeoTool } from '../../scripts/seoTools/track.js'

export default {
  name: 'SeoToolFindAyah',
  data() {
    return {
      query: '',
      loading: false,
      status: '',
      candidates: [],
      index: null,
    }
  },
  methods: {
    displayArabic(text) {
      return sanitizeAskMutqinAyahDisplay(text)
    },
    async ensureIndex() {
      if (this.index) return this.index
      this.loading = true
      try {
        this.index = await loadAskMutqinMatchingIndex()
        return this.index
      } finally {
        this.loading = false
      }
    },
    async search() {
      this.candidates = []
      const words = tokenizeHeardArabic(this.query)
      if (words.length < ASK_MUTQIN_MIN_WORDS) {
        this.status = `Type at least ${ASK_MUTQIN_MIN_WORDS} Arabic words from the start of an ayah.`
        trackSeoTool('seo_tool_find_ayah', { tool: 'find-ayah', result: 'short' })
        return
      }
      try {
        const index = await this.ensureIndex()
        const result = matchHeardAyahPrefix(index, this.query)
        if (result.status === 'matched' && result.match) {
          this.candidates = [result.match]
          this.status = 'Closest match:'
        } else if (result.status === 'multiple' && result.candidates?.length) {
          this.candidates = result.candidates.slice(0, 6)
          this.status = 'Several ayahs are close. Pick the one you meant in Mutqin’s workspace to open it with audio.'
        } else if (result.status === 'insufficient') {
          this.status = `Keep typing — matching needs at least ${ASK_MUTQIN_MIN_WORDS} clear Arabic words.`
        } else {
          this.status = 'No ayah matched that wording. Try the first words of the verse, without translation.'
        }
        trackSeoTool('seo_tool_find_ayah', { tool: 'find-ayah', result: result.status })
      } catch {
        this.status = 'Quran text could not load. Try again in a moment.'
        trackSeoTool('seo_tool_find_ayah', { tool: 'find-ayah', result: 'error' })
      }
    },
  },
}
</script>
