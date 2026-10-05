<template>
  <section class="seo-tool" aria-labelledby="seo-tool-progress-heading">
    <h2 id="seo-tool-progress-heading">Estimate what you have kept</h2>
    <p>Enter pages, Juz, or how far you have reached by surah. The calculator uses the same 6,236-ayah Qur’an totals as Mutqin’s Hifz forecast.</p>
    <form class="seo-tool__grid" @submit.prevent="run">
      <label>
        I have memorised
        <select v-model="mode">
          <option value="pages">Madani pages</option>
          <option value="juz">Juz range</option>
          <option value="surah">Through a surah</option>
        </select>
      </label>
      <label v-if="mode === 'pages'">
        Pages (1–604)
        <input v-model.number="pages" type="number" min="0" max="604" />
      </label>
      <label v-if="mode === 'juz'">
        From Juz
        <input v-model.number="fromJuz" type="number" min="1" max="30" />
      </label>
      <label v-if="mode === 'juz'">
        To Juz
        <input v-model.number="toJuz" type="number" min="1" max="30" />
      </label>
      <label v-if="mode === 'surah'">
        Through surah
        <select v-model.number="throughSurah">
          <option v-for="item in surahOptions" :key="item.id" :value="item.id">
            {{ item.id }}. {{ item.name }}
          </option>
        </select>
      </label>
      <label>
        New ayahs I can add each day
        <select v-model.number="dailyAyahs">
          <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <div class="seo-tool__actions">
        <button class="info-btn info-btn--primary" type="submit">Calculate</button>
      </div>
    </form>
    <div v-if="summary" class="seo-tool__stats" aria-live="polite">
      <div class="seo-tool__stat">
        <strong>{{ summary.percent }}%</strong>
        <span>of the Qur’an (ayah share)</span>
      </div>
      <div class="seo-tool__stat">
        <strong>{{ summary.ayahs }}</strong>
        <span>ayahs estimated kept</span>
      </div>
      <div class="seo-tool__stat">
        <strong>{{ summary.pages }}</strong>
        <span>pages at the same share</span>
      </div>
      <div class="seo-tool__stat">
        <strong>{{ summary.remainingDuration }}</strong>
        <span>to finish at {{ summary.dailyTarget }} ayahs/day</span>
      </div>
    </div>
    <p v-if="summary" class="seo-tool__note">
      Page counts are a share of 604 Madani pages, not a scanned mushaf. Mutqin’s dashboard tracks the ayahs you actually practised.
    </p>
  </section>
</template>

<script>
import { buildPublicMemorizationPlan } from '../../scripts/seoTools/planner.js'
import { buildHifzProgressSummary } from '../../scripts/seoTools/progress.js'
import { trackSeoTool } from '../../scripts/seoTools/track.js'

export default {
  name: 'SeoToolProgress',
  data() {
    return {
      mode: 'juz',
      pages: 20,
      fromJuz: 30,
      toJuz: 30,
      throughSurah: 78,
      dailyAyahs: 3,
      summary: null,
      surahOptions: buildPublicMemorizationPlan().surahOptions,
    }
  },
  mounted() {
    this.run()
  },
  methods: {
    run() {
      this.summary = buildHifzProgressSummary({
        mode: this.mode,
        pages: this.pages,
        fromJuz: this.fromJuz,
        toJuz: this.toJuz,
        throughSurah: this.throughSurah,
        dailyAyahs: this.dailyAyahs,
      })
      trackSeoTool('seo_tool_progress', {
        tool: 'progress',
        mode: this.mode,
        percent: this.summary.percent,
      })
    },
  },
}
</script>
