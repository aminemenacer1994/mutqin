<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay mutqin-modal-overlay amd-overlay"
      @click.self="onCancel"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg mutqin-modal-dialog">
        <div
          class="modal-content mutqin-modal-surface amd-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="amdModalTitle"
        >
          <header class="amd-header">
            <div class="amd-header-copy">
              <h2 id="amdModalTitle">{{ title }}</h2>
              <p class="amd-range">{{ rangeLabel }}</p>
            </div>
            <button class="modal-close-btn" type="button" :aria-label="closeLabel" @click="onCancel">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="amd-body">
            <!-- Ready -->
            <section v-if="stage === 'ready' || stage === 'idle'" class="amd-panel amd-panel--ready">
              <p class="amd-lead">{{ readyCopy }}</p>
              <ul class="amd-meta">
                <li><span>{{ rangeMetaLabel }}</span><strong>{{ rangeLabel }}</strong></li>
                <li><span>{{ ayahCountLabel }}</span><strong>{{ ayahCount }}</strong></li>
                <li><span>{{ assessmentTypeLabel }}</span><strong>{{ assessmentType }}</strong></li>
                <li><span>{{ micLabel }}</span><strong :data-status="micStatus">{{ micStatusLabel }}</strong></li>
              </ul>
              <p v-if="error" class="amd-error" role="alert">{{ error }}</p>
              <div class="amd-actions">
                <button class="btn-primary" type="button" :disabled="busy || micStatus === 'unsupported'" @click="$emit('start')">
                  {{ startLabel }}
                </button>
                <button class="btn-secondary" type="button" :disabled="busy" @click="onCancel">{{ cancelLabel }}</button>
              </div>
            </section>

            <!-- Listening / processing -->
            <section
              v-else-if="['starting', 'listening', 'processing', 'analysing'].includes(stage)"
              class="amd-panel amd-panel--live"
              aria-live="polite"
            >
              <div class="amd-live-status" :data-stage="stage">
                <span class="amd-live-dot" aria-hidden="true"></span>
                <strong>{{ stageLabel }}</strong>
                <p>{{ liveHint }}</p>
              </div>
              <div v-if="liveWords.length" class="amd-live-words" dir="rtl" lang="ar">
                <span
                  v-for="(word, index) in liveWords"
                  :key="`${word.text}-${index}`"
                  class="amd-live-word"
                  :class="wordClass(word.status || word.visual_status)"
                >{{ word.text }}</span>
              </div>
              <div class="amd-actions">
                <button
                  v-if="stage === 'listening' || stage === 'starting'"
                  class="btn-primary"
                  type="button"
                  @click="$emit('stop')"
                >{{ stopLabel }}</button>
                <button class="btn-secondary" type="button" :disabled="busy" @click="onCancel">{{ cancelLabel }}</button>
              </div>
            </section>

            <!-- Results + plan -->
            <section
              v-else-if="['results', 'plan', 'plan_adjusted', 'retest'].includes(stage) && assessment"
              class="amd-panel amd-panel--results"
            >
              <div class="amd-summary">
                <p class="amd-summary-kicker">{{ resultsKicker }}</p>
                <strong class="amd-summary-title">{{ assessment.friendly_summary || encouragingFallback }}</strong>
                <div class="amd-stats">
                  <article>
                    <span>{{ accuracyLabel }}</span>
                    <strong>{{ assessment.accuracy ?? '—' }}%</strong>
                  </article>
                  <article>
                    <span>{{ ayahCountLabel }}</span>
                    <strong>{{ (assessment.ayahs || []).length || ayahCount }}</strong>
                  </article>
                  <article>
                    <span>{{ wordsLabel }}</span>
                    <strong>{{ (assessment.word_results || []).length }}</strong>
                  </article>
                </div>
              </div>

              <div v-if="improvement" class="amd-improvement">
                <strong>{{ improvementTitle }}</strong>
                <p>{{ improvement.message }}</p>
                <div class="amd-improvement-row">
                  <span>{{ beforeLabel }}: {{ improvement.before_accuracy }}%</span>
                  <span aria-hidden="true">→</span>
                  <span>{{ afterLabel }}: {{ improvement.after_accuracy }}%</span>
                </div>
              </div>

              <div class="amd-ayah-list" v-if="(assessment.ayahs || []).length">
                <article
                  v-for="ayah in assessment.ayahs"
                  :key="ayah.ayah_number"
                  class="amd-ayah-card"
                  :data-priority="ayah.priority"
                >
                  <header>
                    <strong>{{ ayahLabel }} {{ ayah.ayah_number }}</strong>
                    <span>{{ ayah.label || ayah.priority }}</span>
                  </header>
                  <p>{{ ayah.accuracy }}% · {{ ayah.correct }} {{ correctWordsLabel }}</p>
                </article>
              </div>

              <div class="amd-word-review" dir="rtl" lang="ar" v-if="(assessment.word_results || []).length">
                <span
                  v-for="(word, index) in assessment.word_results"
                  :key="`result-${index}`"
                  class="amd-word-chip"
                  :class="wordClass(word.status || word.visual_status)"
                  :title="word.note || word.status"
                >{{ word.text }}</span>
              </div>

              <article v-if="practicePlan" class="amd-plan-card">
                <header>
                  <span class="amd-plan-kicker">{{ planKicker }}</span>
                  <h3>{{ practicePlan.title }}</h3>
                </header>
                <p class="amd-plan-why">{{ practicePlan.why }}</p>
                <div class="amd-plan-grid">
                  <div>
                    <span>{{ focusRangeLabel }}</span>
                    <strong>{{ practicePlan.range?.label || rangeLabel }}</strong>
                  </div>
                  <div>
                    <span>{{ repetitionsLabel }}</span>
                    <strong>{{ practicePlan.repetitions?.label || practicePlan.repetitions?.target }}</strong>
                  </div>
                </div>
                <div v-if="(practicePlan.weak_words || []).length" class="amd-weak-words">
                  <span>{{ weakWordsLabel }}</span>
                  <div dir="rtl" lang="ar">
                    <em v-for="(word, index) in practicePlan.weak_words.slice(0, 8)" :key="`weak-${index}`">{{ word.text }}</em>
                  </div>
                </div>
                <div v-if="(practicePlan.techniques || []).length" class="amd-techniques">
                  <article v-for="tech in practicePlan.techniques" :key="tech.id">
                    <strong>{{ tech.title }}</strong>
                    <p>{{ tech.why || tech.how }}</p>
                  </article>
                </div>

                <div v-if="adjustOpen" class="amd-adjust">
                  <label>
                    <span>{{ adjustRepsLabel }}</span>
                    <input v-model.number="localReps" type="number" min="1" max="8" />
                  </label>
                  <label class="amd-checkbox">
                    <input v-model="localAudio" type="checkbox" />
                    <span>{{ adjustAudioLabel }}</span>
                  </label>
                  <label>
                    <span>{{ adjustVisualLabel }}</span>
                    <select v-model="localVisual">
                      <option value="low">{{ visualLow }}</option>
                      <option value="medium">{{ visualMedium }}</option>
                      <option value="high">{{ visualHigh }}</option>
                    </select>
                  </label>
                  <div class="amd-actions amd-actions--inline">
                    <button class="btn-primary" type="button" :disabled="busy" @click="saveAdjust">{{ saveAdjustLabel }}</button>
                    <button class="btn-secondary" type="button" @click="$emit('toggle-adjust', false)">{{ cancelLabel }}</button>
                  </div>
                </div>

                <div v-else class="amd-actions">
                  <button class="btn-primary" type="button" :disabled="busy" @click="$emit('start-plan')">
                    {{ startPlanLabel }}
                  </button>
                  <button class="btn-secondary" type="button" :disabled="busy" @click="$emit('toggle-adjust', true)">
                    {{ adjustPlanLabel }}
                  </button>
                  <button class="btn-secondary" type="button" :disabled="busy" @click="$emit('choose-other')">
                    {{ chooseOtherLabel }}
                  </button>
                  <button
                    v-if="stage === 'retest' || practicePlan.status === 'completed'"
                    class="btn-secondary"
                    type="button"
                    :disabled="busy"
                    @click="$emit('retest')"
                  >{{ retestLabel }}</button>
                </div>
              </article>

              <p v-if="error" class="amd-error" role="alert">{{ error }}</p>
              <div class="amd-actions" v-if="!practicePlan">
                <button class="btn-secondary" type="button" @click="$emit('retry')">{{ retryLabel }}</button>
                <button class="btn-secondary" type="button" @click="onCancel">{{ cancelLabel }}</button>
              </div>
            </section>

            <!-- Error -->
            <section v-else-if="stage === 'error'" class="amd-panel amd-panel--error">
              <p class="amd-error" role="alert">{{ error || genericError }}</p>
              <div class="amd-actions">
                <button class="btn-primary" type="button" @click="$emit('retry')">{{ retryLabel }}</button>
                <button class="btn-secondary" type="button" @click="onCancel">{{ cancelLabel }}</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { wordVisualClass } from '../scripts/memorisationDetection'

export default {
  name: 'AiMemorisationDetectionModal',
  props: {
    open: { type: Boolean, default: false },
    stage: { type: String, default: 'ready' },
    title: { type: String, default: 'AI Memorisation Detection' },
    rangeLabel: { type: String, default: '' },
    ayahCount: { type: Number, default: 0 },
    assessmentType: { type: String, default: 'From memory' },
    micStatus: { type: String, default: 'unknown' },
    micStatusLabel: { type: String, default: 'Checking…' },
    stageLabel: { type: String, default: '' },
    liveHint: { type: String, default: '' },
    liveWords: { type: Array, default: () => [] },
    assessment: { type: Object, default: null },
    practicePlan: { type: Object, default: null },
    improvement: { type: Object, default: null },
    error: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    adjustOpen: { type: Boolean, default: false },
    // labels
    readyCopy: { type: String, default: 'Recite this passage from memory. Mutqin will listen and identify the areas that may need strengthening.' },
    rangeMetaLabel: { type: String, default: 'Selected range' },
    ayahCountLabel: { type: String, default: 'Ayahs' },
    assessmentTypeLabel: { type: String, default: 'Assessment' },
    micLabel: { type: String, default: 'Microphone' },
    startLabel: { type: String, default: 'Start Assessment' },
    stopLabel: { type: String, default: 'Stop' },
    cancelLabel: { type: String, default: 'Cancel' },
    closeLabel: { type: String, default: 'Close' },
    resultsKicker: { type: String, default: 'Assessment complete' },
    encouragingFallback: { type: String, default: 'May Allah strengthen what you have memorised.' },
    accuracyLabel: { type: String, default: 'Accuracy' },
    wordsLabel: { type: String, default: 'Words' },
    ayahLabel: { type: String, default: 'Ayah' },
    correctWordsLabel: { type: String, default: 'correct words' },
    planKicker: { type: String, default: 'Personalised plan' },
    focusRangeLabel: { type: String, default: 'Focus range' },
    repetitionsLabel: { type: String, default: 'Repetitions' },
    weakWordsLabel: { type: String, default: 'Weak words' },
    startPlanLabel: { type: String, default: 'Start This Practice Plan' },
    adjustPlanLabel: { type: String, default: 'Adjust Plan' },
    chooseOtherLabel: { type: String, default: 'Choose Different Session' },
    retestLabel: { type: String, default: 'Re-test weak areas' },
    retryLabel: { type: String, default: 'Try again' },
    genericError: { type: String, default: 'Something went wrong. Please try again.' },
    improvementTitle: { type: String, default: 'After practice' },
    beforeLabel: { type: String, default: 'Before' },
    afterLabel: { type: String, default: 'After' },
    adjustRepsLabel: { type: String, default: 'Repetitions' },
    adjustAudioLabel: { type: String, default: 'Audio enabled' },
    adjustVisualLabel: { type: String, default: 'Visual assistance' },
    visualLow: { type: String, default: 'Low' },
    visualMedium: { type: String, default: 'Medium' },
    visualHigh: { type: String, default: 'High' },
    saveAdjustLabel: { type: String, default: 'Save & continue' },
  },
  emits: ['start', 'stop', 'cancel', 'start-plan', 'toggle-adjust', 'adjust', 'choose-other', 'retry', 'retest'],
  data() {
    return {
      localReps: 3,
      localAudio: true,
      localVisual: 'medium',
    }
  },
  watch: {
    practicePlan: {
      immediate: true,
      handler(plan) {
        this.localReps = Number(plan?.repetitions?.target || 3)
        this.localAudio = plan?.config?.audio_enabled !== false
        this.localVisual = plan?.config?.visual_assistance || 'medium'
      },
    },
  },
  methods: {
    wordClass: wordVisualClass,
    onCancel() {
      if (this.busy) return
      this.$emit('cancel')
    },
    saveAdjust() {
      this.$emit('adjust', {
        repetitions: this.localReps,
        audio_enabled: this.localAudio,
        visual_assistance: this.localVisual,
      })
    },
  },
}
</script>
