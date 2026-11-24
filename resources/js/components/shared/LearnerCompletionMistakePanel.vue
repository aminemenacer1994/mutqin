<template>
  <div class="learner-teacher__mistake-panel">
    <p v-if="perfect && !hidePerfectBanner" class="learner-teacher__mistake-perfect">
      <i class="bi bi-check2-circle" aria-hidden="true"></i>
      {{ t('teacher.learner_assignments_done_score', { n: 100 }) }}
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
                <span v-if="!ayahParts(group.ayah, mistake).length" class="learner-teacher__mistake-ayah-missing">{{ t('teacher.madani_text_unavailable') }}</span>
                <span
                  v-for="(part, partIndex) in ayahParts(group.ayah, mistake)"
                  :key="partIndex"
                  class="learner-teacher__mistake-ayah-word"
                  :class="{ 'is-flagged-word': part.highlighted }"
                  :style="part.fontFamily ? { fontFamily: part.fontFamily, fontWeight: 400 } : undefined"
                >{{ part.text }}</span>
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

    <section v-if="feedbackSegments.length" class="learner-teacher__segment-feedback" :aria-label="t('teacher.learner_segment_feedback_title')">
      <h4>{{ t('teacher.learner_segment_feedback_title') }}</h4>
      <ul>
        <li v-for="segment in feedbackSegments" :key="segment.id">
          <p class="learner-teacher__mistake-type">
            <span>{{ formatSegmentRange(segment) }}</span>
            <span v-if="segment.authority === 'teacher'" class="learner-teacher__segment-badge">{{ t('teacher.learner_segment_teacher_verified') }}</span>
          </p>
          <p v-if="segment.body">{{ segment.body }}</p>
          <AudioClip
            v-if="segment.audio?.available && segment.audio?.url"
            :src="segment.audio.url"
            :play-label="t('teacher.voice_note')"
            :pause-label="t('teacher.learner_mistake_pause')"
            :loading-label="t('teacher.learner_mistake_audio_loading')"
            :error-label="t('teacher.learner_mistake_audio_error')"
          />
        </li>
      </ul>
    </section>

    <p v-else-if="(!perfect || !hidePerfectBanner) && !feedbackSegments.length" class="learner-teacher__mistake-empty">{{ t('teacher.learner_wording_details_empty') }}</p>
  </div>
</template>

<script>
import { i18nMixin } from '@/mixins/i18nMixin'
import AudioClip from '@/components/AudioClip.vue'
import { loadTeacherMadaniAyah } from '@/scripts/teacher/madaniDisplayWords.js'
import {
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
    hidePerfectBanner: { type: Boolean, default: false },
    feedbackSegments: { type: Array, default: () => [] },
  },
  data() {
    return {
      ayahWordsByNumber: {},
      ayahLoadToken: 0,
    }
  },
  computed: {
    perfect() {
      return isPerfectCompletionResult(this.result) && this.groups.length === 0
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
      const numbers = [...new Set(this.groups.map((group) => Number(group.ayah)).filter((ayah) => ayah > 0))]
      if (!surah || !numbers.length) {
        this.ayahWordsByNumber = {}
        return
      }
      const token = ++this.ayahLoadToken
      const entries = await Promise.all(numbers.map(async (ayah) => {
        try {
          return [ayah, await loadTeacherMadaniAyah(surah, ayah)]
        } catch {
          return [ayah, []]
        }
      }))
      if (token !== this.ayahLoadToken) return
      this.ayahWordsByNumber = Object.fromEntries(entries)
    },
    ayahParts(ayahNumber, mistake) {
      const words = this.ayahWordsByNumber[Number(ayahNumber)] || []
      const index = mistakeWordIndex(mistake)
      return words.map((word) => ({
        text: word.text,
        fontFamily: word.fontFamily,
        highlighted: Number.isInteger(index) && word.word_index === index,
      }))
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
    formatSegmentRange(segment) {
      const start = Math.max(0, Math.floor(Number(segment?.start_ms) / 1000))
      const end = Math.max(start + 1, Math.floor(Number(segment?.end_ms) / 1000))
      const fmt = (value) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
      return `${fmt(start)} – ${fmt(end)}`
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
