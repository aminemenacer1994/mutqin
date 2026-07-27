<template>
  <Teleport to="body">
  <div
    v-show="open"
    class="modal-overlay mutqin-modal-overlay amd-overlay"
    @click.self="onCancel"
  >
    <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--full">
      <div
        class="modal-content mutqin-modal-surface amd-modal amd-modal--mushaf"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amdModalTitle"
      >
        <header class="amd-header">
          <div class="amd-header-copy">
            <h2 id="amdModalTitle" class="visually-hidden">{{ title }}</h2>
            <p class="amd-range amd-range--title">{{ rangeLabel }}</p>
          </div>
          <button class="modal-close-btn" type="button" :aria-label="closeLabel" @click.stop="onCancel">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="amd-body amd-body--mushaf">
          <!-- Live -->
          <section v-show="isLive" class="amd-panel amd-panel--mushaf-live">
            <div class="amd-toolbar" role="toolbar" :aria-label="toolsLabel">
              <button
                type="button"
                class="amd-tool"
                :class="{ active: stage === 'listening' || stage === 'starting', recording: stage === 'listening' }"
                :disabled="busy && stage !== 'listening'"
                @click.stop="stage === 'listening' || stage === 'starting' ? $emit('stop') : $emit('start')"
              >
                <i class="bi" :class="stage === 'listening' ? 'bi-stop-circle-fill' : 'bi-stars'" aria-hidden="true"></i>
                <span>{{ stage === 'listening' ? stopLabel : reciteToolLabel }}</span>
              </button>
              <button type="button" class="amd-tool" :disabled="!canPlayAudio" @click.stop="$emit('play-audio')">
                <i class="bi" :class="audioPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                <span>{{ audioToolLabel }}</span>
              </button>
              <button
                type="button"
                class="amd-tool"
                :class="{ active: hiddenText }"
                :aria-pressed="hiddenText ? 'true' : 'false'"
                @click.stop="$emit('toggle-hidden')"
              >
                <i class="bi" :class="hiddenText ? 'bi-eye-slash-fill' : 'bi-eye-fill'" aria-hidden="true"></i>
                <span>{{ memorizingLabel }}</span>
              </button>
              <button
                type="button"
                class="amd-tool"
                :disabled="!hiddenText"
                @mousedown.prevent="$emit('peek-start')"
                @mouseup.prevent="$emit('peek-end')"
                @mouseleave="$emit('peek-end')"
                @touchstart.prevent="$emit('peek-start')"
                @touchend.prevent="$emit('peek-end')"
                @touchcancel="$emit('peek-end')"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
                <span>{{ peekLabel }}</span>
              </button>
              <button type="button" class="amd-tool" :class="{ active: tajweed }" :aria-pressed="tajweed ? 'true' : 'false'" @click.stop="$emit('toggle-tajweed')">
                <i class="bi bi-highlighter" aria-hidden="true"></i>
                <span>{{ tajweedLabel }}</span>
              </button>
              <button type="button" class="amd-tool" :disabled="busy" @click.stop="$emit('reset')">
                <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
                <span>{{ resetLabel }}</span>
              </button>
            </div>

            <div class="amd-live-banner" :data-stage="stage" aria-live="polite">
              <span class="amd-live-dot" aria-hidden="true"></span>
              <div>
                <strong>{{ stageLabel }}</strong>
                <p>{{ liveHint }}</p>
              </div>
              <span v-show="stage === 'listening'" class="amd-timer">{{ elapsedLabel }}</span>
            </div>

            <div class="amd-bottom-bar">
              <div class="amd-rec-pill" :class="{ recording: stage === 'listening' }">
                <span class="amd-rec-dot" aria-hidden="true"></span>
                <span>{{ stage === 'listening' ? elapsedLabel : stageLabel }}</span>
              </div>
              <button
                v-show="stage === 'listening' || stage === 'starting'"
                type="button"
                class="amd-stop-btn"
                :aria-label="stopLabel"
                @click.stop="$emit('stop')"
              >
                <i class="bi bi-stop-fill" aria-hidden="true"></i>
              </button>
              <button v-show="stage !== 'listening' && stage !== 'starting'" type="button" class="btn-secondary" @click.stop="onCancel">{{ cancelLabel }}</button>
            </div>
          </section>

          <!-- Shared mushaf surface — live/results only so Ready actions stay clickable -->
          <div
            v-show="isLive || isResults"
            class="amd-mushaf-shell"
            :class="{
              'is-hidden-text': hiddenText && !peeking && !isResults,
              'is-peeking': peeking && !isResults,
              'is-listening': stage === 'listening',
              'amd-mushaf-shell--results': isResults,
            }"
            dir="rtl"
            lang="ar"
          >
            <div
              ref="mushafSurface"
              class="amd-mushaf-ayah recitation-word-review-active"
              :class="{ 'tajweed-enabled': tajweed }"
              @click="onAyahClick"
            ></div>
          </div>

          <!-- Results -->
          <section v-show="isResults && assessment" class="amd-panel amd-panel--results">
            <div class="amd-summary">
              <p class="amd-summary-kicker">{{ resultsKicker }}</p>
              <strong class="amd-summary-title">{{ assessment?.friendly_summary || encouragingFallback }}</strong>
              <div class="amd-stats">
                <article>
                  <span>{{ accuracyLabel }}</span>
                  <strong>{{ assessment?.accuracy ?? '—' }}%</strong>
                </article>
                <article>
                  <span>{{ ayahCountLabel }}</span>
                  <strong>{{ (assessment?.ayahs || []).length || ayahCount }}</strong>
                </article>
                <article>
                  <span>{{ wordsLabel }}</span>
                  <strong>{{ (assessment?.word_results || []).length }}</strong>
                </article>
              </div>
            </div>

            <div v-show="improvement" class="amd-improvement">
              <strong>{{ improvementTitle }}</strong>
              <p>{{ improvement?.message }}</p>
              <div class="amd-improvement-row">
                <span>{{ beforeLabel }}: {{ improvement?.before_accuracy }}%</span>
                <span aria-hidden="true">→</span>
                <span>{{ afterLabel }}: {{ improvement?.after_accuracy }}%</span>
              </div>
            </div>

            <div class="amd-ayah-list" v-show="(assessment?.ayahs || []).length">
              <article
                v-for="ayah in (assessment?.ayahs || [])"
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

            <article v-show="practicePlan" class="amd-plan-card">
              <header>
                <span class="amd-plan-kicker">{{ planKicker }}</span>
                <h3>{{ practicePlan?.title }}</h3>
              </header>
              <p class="amd-plan-why">{{ practicePlan?.why }}</p>
              <div class="amd-plan-grid">
                <div>
                  <span>{{ focusRangeLabel }}</span>
                  <strong>{{ practicePlan?.range?.label || rangeLabel }}</strong>
                </div>
                <div>
                  <span>{{ repetitionsLabel }}</span>
                  <strong>{{ practicePlan?.repetitions?.label || practicePlan?.repetitions?.target }}</strong>
                </div>
              </div>
              <div v-show="(practicePlan?.weak_words || []).length" class="amd-weak-words">
                <span>{{ weakWordsLabel }}</span>
                <div dir="rtl" lang="ar">
                  <em v-for="(word, index) in (practicePlan?.weak_words || []).slice(0, 8)" :key="`weak-${index}`">{{ word.text }}</em>
                </div>
              </div>
              <div v-show="(practicePlan?.techniques || []).length" class="amd-techniques">
                <article v-for="tech in (practicePlan?.techniques || [])" :key="tech.id">
                  <strong>{{ tech.title }}</strong>
                  <p>{{ tech.why || tech.how }}</p>
                </article>
              </div>

              <div v-show="adjustOpen" class="amd-adjust">
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

              <div v-show="!adjustOpen" class="amd-actions">
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
                  v-show="stage === 'retest' || stage === 'practice_complete' || practicePlan?.status === 'completed'"
                  class="btn-secondary"
                  type="button"
                  :disabled="busy"
                  @click="$emit('retest')"
                >{{ retestLabel }}</button>
              </div>
            </article>

            <p v-if="error && isResults" class="amd-error" role="alert">{{ error }}</p>
          </section>

          <section v-show="isError" class="amd-panel amd-panel--error">
            <p class="amd-error" role="alert">{{ error || genericError }}</p>
            <div class="amd-actions">
              <button
                class="btn-primary"
                type="button"
                :disabled="busy || micStatus === 'unsupported'"
                @click.stop="$emit('start')"
              >
                <i class="bi bi-mic-fill" aria-hidden="true"></i>
                <span>{{ startLabel }}</span>
              </button>
              <button class="btn-secondary" type="button" :disabled="busy" @click.stop="$emit('retry')">{{ retryLabel }}</button>
              <button class="btn-secondary" type="button" @click.stop="onCancel">{{ cancelLabel }}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
export default {
  name: 'AiMemorisationDetectionModal',
  props: {
    open: { type: Boolean, default: false },
    stage: { type: String, default: 'ready' },
    title: { type: String, default: 'AI Memorisation Detection' },
    rangeLabel: { type: String, default: '' },
    ayahCount: { type: Number, default: 0 },
    micStatus: { type: String, default: 'prompt' },
    micStatusLabel: { type: String, default: 'Tap Start to enable' },
    stageLabel: { type: String, default: '' },
    liveHint: { type: String, default: '' },
    elapsedLabel: { type: String, default: '00:00' },
    ayahHtml: { type: String, default: '' },
    resultAyahHtml: { type: String, default: '' },
    hiddenText: { type: Boolean, default: true },
    peeking: { type: Boolean, default: false },
    tajweed: { type: Boolean, default: false },
    audioPlaying: { type: Boolean, default: false },
    canPlayAudio: { type: Boolean, default: true },
    assessment: { type: Object, default: null },
    practicePlan: { type: Object, default: null },
    improvement: { type: Object, default: null },
    error: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    adjustOpen: { type: Boolean, default: false },
    howSteps: {
      type: Array,
      default: () => ([
        'Hide the Qur’an text and recite from memory.',
        'Mutqin listens, follows your place, and highlights mistakes.',
        'Repeat a word to correct it — correct words reveal themselves.',
        'Save the result and practise the weak areas again.',
      ]),
    },
    /** First-run educational copy; hidden after the user has started once. */
    showHowto: { type: Boolean, default: true },
    readyCopy: { type: String, default: 'Recite this passage from memory. Mutqin will listen and identify the areas that may need strengthening.' },
    howItWorksKicker: { type: String, default: 'How mistake detection works' },
    rangeMetaLabel: { type: String, default: 'Selected range' },
    ayahCountLabel: { type: String, default: 'Ayahs' },
    micLabel: { type: String, default: 'Microphone' },
    startLabel: { type: String, default: 'Start Assessment' },
    stopLabel: { type: String, default: 'Stop' },
    cancelLabel: { type: String, default: 'Cancel' },
    closeLabel: { type: String, default: 'Close' },
    toolsLabel: { type: String, default: 'Practice tools' },
    reciteToolLabel: { type: String, default: 'Recite' },
    audioToolLabel: { type: String, default: 'Audio help' },
    memorizingLabel: { type: String, default: 'Memorizing' },
    peekLabel: { type: String, default: 'Peek' },
    tajweedLabel: { type: String, default: 'Tajweed' },
    resetLabel: { type: String, default: 'Reset' },
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
  emits: [
    'start', 'stop', 'cancel', 'start-plan', 'toggle-adjust', 'adjust', 'choose-other',
    'retry', 'retest', 'toggle-hidden', 'toggle-tajweed', 'peek-start', 'peek-end',
    'play-audio', 'reset', 'word-click',
  ],
  data() {
    return {
      localReps: 3,
      localAudio: true,
      localVisual: 'medium',
      _htmlSyncTimer: null,
    }
  },
  computed: {
    isReady() {
      return false
    },
    isLive() {
      return ['starting', 'listening', 'processing', 'analysing'].includes(this.stage)
    },
    isResults() {
      return ['results', 'plan', 'plan_adjusted', 'retest', 'practice_complete'].includes(this.stage)
    },
    isError() {
      // Ready/idle must never render a setup screen — treat as recoverable error.
      return this.stage === 'error' || this.stage === 'ready' || this.stage === 'idle'
    },
    activeHtml() {
      return this.isResults ? (this.resultAyahHtml || this.ayahHtml || '') : (this.ayahHtml || '')
    },
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
    // Only sync HTML when the modal opens or stage flips to results —
    // live recognition updates are pushed via setMushafHtml() to avoid Vue patch storms.
    open(isOpen) {
      if (isOpen) this.$nextTick(() => this.scheduleMushafHtml(this.activeHtml))
    },
    stage() {
      if (this.open && (this.isLive || this.isResults)) {
        this.$nextTick(() => this.scheduleMushafHtml(this.activeHtml))
      }
    },
  },
  beforeUnmount() {
    if (this._htmlSyncTimer) {
      clearTimeout(this._htmlSyncTimer)
      this._htmlSyncTimer = null
    }
  },
  methods: {
    setMushafHtml(html = '') {
      this.scheduleMushafHtml(html)
    },
    scheduleMushafHtml(html = '') {
      // Throttle DOM writes during live recognition to avoid layout thrash.
      if (this._htmlSyncTimer) clearTimeout(this._htmlSyncTimer)
      this._htmlSyncTimer = setTimeout(() => {
        this._htmlSyncTimer = null
        const el = this.$refs.mushafSurface
        if (el) el.innerHTML = html || ''
      }, this.isLive ? 80 : 0)
    },
    onCancel() {
      this.$emit('cancel')
    },
    saveAdjust() {
      this.$emit('adjust', {
        repetitions: this.localReps,
        audio_enabled: this.localAudio,
        visual_assistance: this.localVisual,
      })
    },
    onAyahClick(event) {
      const target = event?.target?.closest?.('[data-recitation-word-index], .can-correct-ai')
      if (!target) return
      const index = Number(target.getAttribute('data-recitation-word-index'))
      this.$emit('word-click', { index, el: target })
    },
  },
}
</script>
