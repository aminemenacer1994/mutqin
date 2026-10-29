<template>
  <div class="learner-teacher__mistake-panel">
    <p v-if="perfect" class="learner-teacher__mistake-perfect">
      <i class="bi bi-check2-circle" aria-hidden="true"></i>
      {{ t('teacher.learner_mistake_none') }}
    </p>

    <ul v-else-if="groups.length" class="learner-teacher__mistake-groups">
      <li v-for="group in groups" :key="group.ayah" class="learner-teacher__mistake-group">
        <h4 class="learner-teacher__mistake-ayah-label">
          {{ t('teacher.learner_mistake_ayah_heading', { n: group.ayah }) }}
        </h4>
        <ul class="learner-teacher__mistake-rows">
          <li v-for="(mistake, rowIndex) in group.items" :key="`${group.ayah}-${rowIndex}`" class="learner-teacher__mistake-row">
            <div class="learner-teacher__mistake-row-main">
              <p class="learner-teacher__mistake-ayah-text" dir="rtl" lang="ar">
                <span
                  v-for="(part, partIndex) in ayahParts(group.ayah, mistake)"
                  :key="partIndex"
                  :class="{ 'is-flagged-word': part.highlighted }"
                >{{ part.text }}<template v-if="partIndex < ayahParts(group.ayah, mistake).length - 1">&nbsp;</template></span>
              </p>
              <p class="learner-teacher__mistake-type">
                <i class="bi" :class="typeIcon(mistake.type)" aria-hidden="true"></i>
                <span>{{ typeLabel(mistake.type) }}</span>
              </p>
              <p v-if="comparisonLine(mistake)" class="learner-teacher__mistake-compare">{{ comparisonLine(mistake) }}</p>
              <p v-if="mistake.type === 'tajweed' && mistake.rule" class="learner-teacher__mistake-rule">{{ mistake.rule }}</p>
            </div>
            <div class="learner-teacher__mistake-audio">
              <AudioClip
                v-if="referenceUrl(mistake)"
                :src="referenceUrl(mistake)"
                :play-label="t('teacher.learner_mistake_hear_correct')"
                :pause-label="t('teacher.learner_mistake_pause')"
                :loading-label="t('teacher.learner_mistake_audio_loading')"
                :error-label="t('teacher.learner_mistake_audio_error')"
              />
              <AudioClip
                v-if="studentClip(mistake).src"
                :src="studentClip(mistake).src"
                :start="studentClip(mistake).start"
                :end="studentClip(mistake).end"
                :play-label="t('teacher.learner_mistake_hear_yours')"
                :pause-label="t('teacher.learner_mistake_pause')"
                :loading-label="t('teacher.learner_mistake_audio_loading')"
                :error-label="t('teacher.learner_mistake_audio_error')"
              />
            </div>
          </li>
        </ul>
      </li>
    </ul>

    <p v-else class="learner-teacher__mistake-empty">{{ t('teacher.learner_mistake_none') }}</p>
  </div>
</template>

<script>
import { i18nMixin } from '@/mixins/i18nMixin'
import AudioClip from '@/components/AudioClip.vue'
import { loadSurahAyahs } from '@/scripts/dashboardAiRecite/ayahText.js'
import {
  buildAyahWordHighlightParts,
  groupMistakesByAyah,
  isPerfectCompletionResult,
  mistakeWordIndex,
  msToSeconds,
  resolveMistakeReferenceUrl,
} from '@/scripts/teacher/learnerCompletionMistakes.js'

export default {
  name: 'LearnerCompletionMistakePanel',
  components: { AudioClip },
  mixins: [i18nMixin],
  props: {
    result: { type: Object, default: null },
    mistakes: { type: Array, default: () => [] },
    recordingUrl: { type: String, default: '' },
    surah: { type: Number, default: null },
  },
  data() {
    return {
      ayahTextByNumber: {},
      ayahLoadToken: 0,
    }
  },
  computed: {
    perfect() {
      return isPerfectCompletionResult(this.result)
    },
    groups() {
      return groupMistakesByAyah(this.mistakes)
    },
  },
  watch: {
    surah: {
      immediate: true,
      handler() {
        this.loadAyahTexts()
      },
    },
    mistakes: {
      deep: true,
      handler() {
        this.loadAyahTexts()
      },
    },
  },
  methods: {
    async loadAyahTexts() {
      const surah = Number(this.surah)
      if (!surah || !this.mistakes.length) return
      const token = ++this.ayahLoadToken
      try {
        const ayahs = await loadSurahAyahs(surah)
        if (token !== this.ayahLoadToken) return
        const map = {}
        for (const ayah of ayahs) {
          map[ayah.ayah] = ayah.text
        }
        this.ayahTextByNumber = map
      } catch {
        if (token === this.ayahLoadToken) this.ayahTextByNumber = {}
      }
    },
    ayahParts(ayahNumber, mistake) {
      const text = this.ayahTextByNumber[ayahNumber] || mistake.expected || ''
      return buildAyahWordHighlightParts(text, mistakeWordIndex(mistake))
    },
    typeIcon(type) {
      if (type === 'missed') return 'bi-dash-circle-fill is-missed'
      if (type === 'tajweed') return 'bi-bookmark-star-fill is-tajweed'
      return 'bi-x-circle-fill is-wrong'
    },
    typeLabel(type) {
      if (type === 'missed') return this.t('teacher.learner_mistake_type_missed')
      if (type === 'tajweed') return this.t('teacher.learner_mistake_type_tajweed')
      return this.t('teacher.learner_mistake_type_wrong')
    },
    comparisonLine(mistake) {
      const expected = String(mistake.expected || '').trim()
      const heard = String(mistake.heard || '').trim()
      if (!expected && !heard) return ''
      if (expected && heard) {
        return this.t('teacher.learner_mistake_expected_heard', { expected, heard })
      }
      if (expected) return this.t('teacher.learner_mistake_expected_only', { expected })
      return this.t('teacher.learner_mistake_heard_only', { heard })
    },
    referenceUrl(mistake) {
      return resolveMistakeReferenceUrl(mistake, this.surah)
    },
    studentClip(mistake) {
      const src = String(this.recordingUrl || '').trim()
      if (!src) return { src: '', start: null, end: null }
      const start = msToSeconds(mistake.start_ms ?? mistake.startMs)
      const end = msToSeconds(mistake.end_ms ?? mistake.endMs)
      return {
        src,
        start,
        end: end ?? null,
      }
    },
  },
}
</script>
