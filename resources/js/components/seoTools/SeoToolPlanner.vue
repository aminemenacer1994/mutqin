<template>
  <section class="seo-tool" aria-labelledby="seo-tool-planner-heading">
    <h2 id="seo-tool-planner-heading">Build a daily Hifz plan</h2>
    <p>Uses the same daily-ayah forecast Mutqin uses in a Hifz plan. Choose a target and a pace you can keep.</p>
    <form class="seo-tool__grid" @submit.prevent="run">
      <label>
        Target
        <select v-model="target">
          <option value="quran">Whole Qur’an (6,236 ayahs)</option>
          <option value="juz-amma">Juz ʿAmma</option>
          <option value="surah">One surah or a range</option>
        </select>
      </label>
      <label v-if="target === 'surah'">
        Surah
        <select v-model.number="surah">
          <option v-for="item in surahOptions" :key="item.id" :value="item.id">
            {{ item.id }}. {{ item.name }} ({{ item.ayahs }})
          </option>
        </select>
      </label>
      <label v-if="target === 'surah'">
        From ayah
        <input v-model.number="from" type="number" min="1" :max="maxAyah" />
      </label>
      <label v-if="target === 'surah'">
        To ayah
        <input v-model.number="to" type="number" min="1" :max="maxAyah" />
      </label>
      <label>
        New ayahs per sitting
        <select v-model.number="dailyAyahs">
          <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label>
        Practice days each week
        <select v-model.number="daysPerWeek">
          <option v-for="n in [3, 4, 5, 6, 7]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <div class="seo-tool__actions">
        <button class="info-btn info-btn--primary" type="submit">Show plan</button>
      </div>
    </form>
    <div v-if="plan" class="seo-tool__stats" aria-live="polite">
      <div class="seo-tool__stat">
        <strong>{{ plan.remainingAyahs }}</strong>
        <span>ayahs remaining</span>
      </div>
      <div class="seo-tool__stat">
        <strong>{{ plan.dailyTarget }}</strong>
        <span>ayahs per sitting</span>
      </div>
      <div class="seo-tool__stat">
        <strong>{{ plan.calendarDays }}</strong>
        <span>calendar days at this weekly rhythm</span>
      </div>
      <div class="seo-tool__stat">
        <strong>{{ plan.estimatedCompletionDate }}</strong>
        <span>estimated finish if you keep the pace</span>
      </div>
    </div>
    <p v-if="plan" class="seo-tool__note">
      First sitting: {{ plan.firstSittingLabel }}. This is a pace check, not a teacher’s programme.
    </p>
  </section>
</template>

<script>
import { buildPublicMemorizationPlan } from '../../scripts/seoTools/planner.js'
import { ayahsInSurah } from '../../scripts/seoTools/quranCorpus.js'
import { trackSeoTool } from '../../scripts/seoTools/track.js'

export default {
  name: 'SeoToolPlanner',
  data() {
    return {
      target: 'juz-amma',
      surah: 78,
      from: 1,
      to: 40,
      dailyAyahs: 3,
      daysPerWeek: 5,
      plan: null,
      surahOptions: buildPublicMemorizationPlan().surahOptions,
    }
  },
  computed: {
    maxAyah() {
      return ayahsInSurah(this.surah) || 1
    },
  },
  mounted() {
    this.run()
  },
  methods: {
    run() {
      this.plan = buildPublicMemorizationPlan({
        target: this.target,
        surah: this.surah,
        from: this.from,
        to: this.to,
        dailyAyahs: this.dailyAyahs,
        daysPerWeek: this.daysPerWeek,
      })
      trackSeoTool('seo_tool_planner', {
        tool: 'planner',
        target: this.target,
        daily: this.plan.dailyTarget,
        days: this.plan.calendarDays,
      })
    },
  },
}
</script>
