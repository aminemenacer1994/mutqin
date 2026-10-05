<template>
  <section class="seo-tool" aria-labelledby="seo-tool-quiz-heading">
    <h2 id="seo-tool-quiz-heading">Check a short range from memory</h2>
    <p>
      A limited public version of Mutqin’s “Check what you kept”: multiple choice, a missing word, or a flashcard.
      No microphone and no account. Live recitation checking stays in the workspace.
    </p>
    <form v-if="!cards.length" class="seo-tool__grid" @submit.prevent="start">
      <label>
        Surah
        <select v-model.number="surah">
          <option v-for="item in surahOptions" :key="item.id" :value="item.id">
            {{ item.id }}. {{ item.name }}
          </option>
        </select>
      </label>
      <label>
        From ayah
        <input v-model.number="from" type="number" min="1" :max="maxAyah" />
      </label>
      <label>
        To ayah
        <input v-model.number="to" type="number" min="1" :max="maxAyah" />
      </label>
      <div class="seo-tool__actions">
        <button class="info-btn info-btn--primary" type="submit" :disabled="loading">
          {{ loading ? 'Loading ayahs…' : 'Start the check' }}
        </button>
      </div>
    </form>
    <p v-if="error" class="seo-tool__error" role="alert">{{ error }}</p>
    <div v-if="card" class="seo-tool__quiz" aria-live="polite">
      <p class="seo-tool__kicker">{{ index + 1 }} / {{ cards.length }} · {{ card.prompt }}</p>
      <p class="seo-tool__arabic" dir="rtl" lang="ar">{{ card.stem }}</p>
      <div v-if="card.type === 'mcq'" class="seo-tool__choices">
        <button
          v-for="option in card.options"
          :key="option.key"
          type="button"
          class="info-btn info-btn--ghost"
          @click="answer(option.key)"
        >
          {{ option.label }}
        </button>
      </div>
      <form v-else-if="card.type === 'blank'" class="seo-tool__blank" @submit.prevent="answer(blank)">
        <label>
          Missing word
          <input v-model="blank" type="text" dir="rtl" lang="ar" autocomplete="off" />
        </label>
        <button class="info-btn info-btn--primary" type="submit">Check</button>
      </form>
      <div v-else class="seo-tool__choices">
        <p v-if="revealed" class="seo-tool__arabic" dir="rtl" lang="ar">{{ card.reveal }}</p>
        <button v-if="!revealed" class="info-btn info-btn--ghost" type="button" @click="revealed = true">Reveal ayah</button>
        <button class="info-btn info-btn--primary" type="button" @click="answer('recalled')">I recalled it</button>
        <button class="info-btn info-btn--ghost" type="button" @click="answer('missed')">I needed a look</button>
      </div>
    </div>
    <div v-else-if="done" class="seo-tool__stats">
      <div class="seo-tool__stat">
        <strong>{{ score }} / {{ cards.length }}</strong>
        <span>remembered on this pass</span>
      </div>
      <div class="seo-tool__actions">
        <button class="info-btn info-btn--ghost" type="button" @click="reset">Try another range</button>
      </div>
    </div>
  </section>
</template>

<script>
import { getSurahEdition } from '../../scripts/lib/quranApis.js'
import { buildPublicMemorizationPlan } from '../../scripts/seoTools/planner.js'
import { ayahsInSurah } from '../../scripts/seoTools/quranCorpus.js'
import { buildPublicQuizCards, gradePublicQuizAnswer, versesFromEditionAyahs } from '../../scripts/seoTools/quiz.js'
import { trackSeoTool } from '../../scripts/seoTools/track.js'

export default {
  name: 'SeoToolQuiz',
  data() {
    return {
      surah: 112,
      from: 1,
      to: 4,
      loading: false,
      error: '',
      cards: [],
      index: 0,
      score: 0,
      blank: '',
      revealed: false,
      done: false,
      surahOptions: buildPublicMemorizationPlan().surahOptions,
    }
  },
  computed: {
    maxAyah() {
      return ayahsInSurah(this.surah) || 1
    },
    card() {
      if (this.done || !this.cards.length) return null
      return this.cards[this.index] || null
    },
  },
  methods: {
    reset() {
      this.cards = []
      this.index = 0
      this.score = 0
      this.done = false
      this.error = ''
      this.blank = ''
      this.revealed = false
    },
    async start() {
      this.error = ''
      this.loading = true
      const max = this.maxAyah
      const start = Math.max(1, Math.min(max, Number(this.from) || 1))
      const requestedEnd = Math.max(start, Math.min(max, Number(this.to) || start))
      const end = Math.min(requestedEnd, start + 11)
      this.from = start
      this.to = end
      try {
        const response = await getSurahEdition(this.surah, 'quran-uthmani')
        const ayahs = response?.data?.data?.ayahs || []
        const verses = versesFromEditionAyahs(this.surah, ayahs, start, end)
        this.cards = buildPublicQuizCards(verses, { questionCount: 6 })
        this.index = 0
        this.score = 0
        this.done = this.cards.length === 0
        this.revealed = false
        if (!this.cards.length) this.error = 'No ayahs loaded for that range. Try a shorter surah.'
        trackSeoTool('seo_tool_quiz_start', { tool: 'quiz', surah: this.surah, count: this.cards.length })
      } catch {
        this.error = 'Quran text could not load. Try again in a moment.'
      } finally {
        this.loading = false
      }
    },
    answer(value) {
      const card = this.card
      if (!card) return
      if (gradePublicQuizAnswer(card, value)) this.score += 1
      this.blank = ''
      this.revealed = false
      if (this.index + 1 >= this.cards.length) {
        this.done = true
        trackSeoTool('seo_tool_quiz_complete', { tool: 'quiz', score: this.score, total: this.cards.length })
        return
      }
      this.index += 1
    },
  },
}
</script>
