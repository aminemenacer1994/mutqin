<template>
  <div v-if="visible" class="hifz-plan-modal-wrap">
    <div class="modal-backdrop fade show"></div>
    <div
      class="modal fade show d-block hifz-plan-modal"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hifzPlanCreatorTitle"
      @click.self="close"
      @keydown.esc.prevent="close"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable modal-fullscreen-sm-down">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <span class="hifz-plan-kicker">Hifz Plan</span>
              <h2 id="hifzPlanCreatorTitle" class="modal-title">{{ existingPlan ? 'Edit Hifz Plan' : 'Create Your Hifz Plan' }}</h2>
            </div>
            <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
          </div>

          <div class="modal-body">
            <div class="hifz-plan-progress" aria-label="Plan setup progress">
              <button
                v-for="(item, index) in steps"
                :key="item.key"
                type="button"
                class="hifz-plan-step-dot"
                :class="{ active: currentStep === index, complete: currentStep > index }"
                :aria-current="currentStep === index ? 'step' : null"
                @click="goToStep(index)"
              >
                <span>{{ index + 1 }}</span>
                <small>{{ item.label }}</small>
              </button>
            </div>

            <section v-if="currentStep === 0" class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Choose Your Daily Goal</h3>
                <p>Select the amount of new memorisation you want Mutqin to structure each day.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in goalOptions" :key="option.value" class="col-md-4">
                  <button
                    type="button"
                    class="card h-100 hifz-plan-choice"
                    :class="{ selected: draft.goal === option.value }"
                    @click="selectGoalManual(option.value)"
                  >
                    <span class="hifz-plan-choice-icon"><i :class="option.icon"></i></span>
                    <strong>{{ option.title }}</strong>
                    <small>{{ option.subtitle }}</small>
                    <em>{{ option.detail }}</em>
                  </button>
                </div>
              </div>
              <div class="hifz-plan-manual-fields">
                <div class="row g-3">
                  <div class="col-md-5">
                    <label class="form-label" for="hifzPlanSurah">Surah</label>
                    <input
                      id="hifzPlanSurah"
                      class="form-control"
                      list="hifzPlanSurahOptions"
                      :value="draft.selectedSurah"
                      placeholder="Choose or speak a Surah"
                      @input="setManualSurah($event.target.value)"
                    >
                    <datalist id="hifzPlanSurahOptions">
                      <option v-for="surah in surahList" :key="surah" :value="surah"></option>
                    </datalist>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label" for="hifzPlanDailyAyahs">Daily ayahs</label>
                    <input
                      id="hifzPlanDailyAyahs"
                      type="number"
                      min="1"
                      max="10"
                      class="form-control"
                      :value="draft.dailyNewAyahs.exact || ''"
                      placeholder="1-10"
                      @input="setManualDailyAyahs($event.target.value)"
                    >
                  </div>
                  <div class="col-6 col-md-2">
                    <label class="form-label" for="hifzPlanRangeFrom">From</label>
                    <input
                      id="hifzPlanRangeFrom"
                      type="number"
                      min="1"
                      class="form-control"
                      :value="draft.selectedRange.from || ''"
                      @input="setManualRangeBound('from', $event.target.value)"
                    >
                  </div>
                  <div class="col-6 col-md-2">
                    <label class="form-label" for="hifzPlanRangeTo">To</label>
                    <input
                      id="hifzPlanRangeTo"
                      type="number"
                      min="1"
                      class="form-control"
                      :value="draft.selectedRange.to || ''"
                      @input="setManualRangeBound('to', $event.target.value)"
                    >
                  </div>
                </div>
              </div>
            </section>

            <section v-else-if="currentStep === 1" class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Pick Your Learning Style</h3>
                <p>Set the pace and intensity of your daily learning rhythm.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in learningStyleOptions" :key="option.value" class="col-md-4">
                  <button
                    type="button"
                    class="card h-100 hifz-plan-choice"
                    :class="{ selected: draft.learningStyle === option.value }"
                    @click="selectLearningStyleManual(option.value)"
                  >
                    <span class="hifz-plan-choice-icon"><i :class="option.icon"></i></span>
                    <strong>{{ option.title }}</strong>
                    <small>{{ option.subtitle }}</small>
                    <em>{{ option.detail }}</em>
                  </button>
                </div>
              </div>
            </section>

            <section v-else-if="currentStep === 2" class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Set Your Study Flow</h3>
                <p>Choose what Mutqin should prioritise when shaping your plan.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in focusOptions" :key="option.value" class="col-md-6">
                  <button
                    type="button"
                    class="card h-100 hifz-plan-choice hifz-plan-choice-wide"
                    :class="{ selected: draft.focusMode === option.value }"
                    @click="selectFocusModeManual(option.value)"
                  >
                    <span class="hifz-plan-choice-icon"><i :class="option.icon"></i></span>
                    <strong>{{ option.title }}</strong>
                    <small>{{ option.subtitle }}</small>
                    <em>{{ option.detail }}</em>
                  </button>
                </div>
              </div>
            </section>

            <section v-else-if="currentStep === 3" class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Choose Your Support Level</h3>
                <p>Decide how much checking and guidance you want during practice.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in supportOptions" :key="option.value" class="col-md-4">
                  <button
                    type="button"
                    class="card h-100 hifz-plan-choice"
                    :class="{ selected: draft.supportLevel === option.value }"
                    @click="selectSupportLevelManual(option.value)"
                  >
                    <span class="hifz-plan-choice-icon"><i :class="option.icon"></i></span>
                    <strong>{{ option.title }}</strong>
                    <small>{{ option.subtitle }}</small>
                    <em>{{ option.detail }}</em>
                  </button>
                </div>
              </div>
            </section>

            <section v-else class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Hifz Journey Forecast</h3>
                <p>See the full route, daily pace, and expected finish date before saving.</p>
              </div>
              <div class="hifz-forecast-grid" aria-label="Hifz Journey Forecast">
                <div v-for="item in forecastItems" :key="item.label" class="hifz-forecast-card">
                  <span class="hifz-forecast-icon"><i class="bi" :class="item.icon"></i></span>
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
              <div class="hifz-plan-summary mt-3">
                <div v-for="item in summaryItems" :key="item.label" class="hifz-plan-summary-row">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" :disabled="currentStep === 0" @click="previousStep">
              Back
            </button>
            <button v-if="currentStep < steps.length - 1" type="button" class="btn btn-success" @click="nextStep">
              Continue
            </button>
            <button v-else type="button" class="btn btn-success hifz-plan-save-btn" @click="savePlan">
              {{ existingPlan ? 'Save Hifz Plan' : 'Start My Hifz Journey' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { HIFZ_PLAN_STORAGE_KEY, calculatePlanForecast } from '../engine/hifz_session_engine'

const STORAGE_KEY = HIFZ_PLAN_STORAGE_KEY

function createDefaultHifzDraft() {
  return {
    goal: 'balanced',
    dailyNewAyahs: { min: 3, max: 5 },
    selectedSurah: '',
    selectedRange: { from: null, to: null },
    learningStyle: 'balanced',
    focusMode: 'mixed',
    supportLevel: 'standard'
  }
}

export default {
  name: 'HifzPlanCreatorModal',
  props: {
    visible: { type: Boolean, default: false }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      currentStep: 0,
      existingPlan: null,
      draft: createDefaultHifzDraft(),
      recognition: null,
      voiceFinalTranscript: '',
      voiceProcessingTimer: null,
      voiceDetected: {
        surah: '',
        dailyAyahs: null,
        range: null,
        learningStyle: ''
      },
      voiceState: {
        isListening: false,
        status: 'stopped',
        transcript: ''
      },
      manualMode: false,
      manualTouched: {
        surah: false,
        dailyAyahs: false,
        range: false,
        learningStyle: false,
        focusMode: false,
        supportLevel: false
      },
      steps: [
        { key: 'goal', label: 'Goal' },
        { key: 'style', label: 'Style' },
        { key: 'flow', label: 'Flow' },
        { key: 'support', label: 'Support' },
        { key: 'summary', label: 'Summary' }
      ],
      goalOptions: [
        { value: 'light', title: 'Light', subtitle: '1-3 ayahs/day', detail: 'A lighter workload for busy days, with more time for careful revision and steady confidence.', range: { min: 1, max: 3 }, icon: 'bi bi-sunrise' },
        { value: 'balanced', title: 'Balanced', subtitle: '3-5 ayahs/day', detail: 'Maintain a steady pace with enough revision to strengthen long-term memory.', range: { min: 3, max: 5 }, icon: 'bi bi-compass' },
        { value: 'intensive', title: 'Intensive', subtitle: '5-10 ayahs/day', detail: 'Move faster through memorisation while accepting a heavier daily revision load.', range: { min: 5, max: 10 }, icon: 'bi bi-lightning-charge' }
      ],
      learningStyleOptions: [
        { value: 'light', title: 'Light', subtitle: 'Low pressure, easy to maintain.', detail: 'Best for a calm routine where consistency matters more than speed.', icon: 'bi bi-feather' },
        { value: 'balanced', title: 'Balanced', subtitle: 'Moderate pace and revision.', detail: 'A practical daily rhythm for new ayahs, review, and long-term retention.', icon: 'bi bi-sliders' },
        { value: 'intensive', title: 'Intensive', subtitle: 'Higher pace, stronger commitment.', detail: 'Designed for faster progress with tighter daily structure and more review.', icon: 'bi bi-speedometer2' }
      ],
      focusOptions: [
        { value: 'newPriority', title: 'New Memorisation First', subtitle: 'Start with fresh ayahs.', detail: 'Keeps momentum high while still scheduling reviews after new work.', icon: 'bi bi-plus-circle' },
        { value: 'revisionPriority', title: 'Revision First', subtitle: 'Protect what you already know.', detail: 'Places older memorisation first so retention stays strong before adding more.', icon: 'bi bi-arrow-repeat' },
        { value: 'mixed', title: 'Mixed Flow', subtitle: 'Balanced new and review work.', detail: 'Blends new memorisation and revision into one manageable daily plan.', icon: 'bi bi-shuffle' },
        { value: 'weakAyahFocus', title: 'Weak Ayah Focus', subtitle: 'Repair fragile memorisation.', detail: 'Gives extra attention to ayahs that need reinforcement before they become backlog.', icon: 'bi bi-bullseye' }
      ],
      supportOptions: [
        { value: 'gentle', title: 'Gentle Guidance', subtitle: 'Light checking and softer feedback.', detail: 'Good for building confidence while keeping the plan easy to complete.', icon: 'bi bi-hand-thumbs-up' },
        { value: 'standard', title: 'Standard Support', subtitle: 'Balanced checking and practical feedback.', detail: 'Catches common mistakes while keeping daily practice focused and manageable.', icon: 'bi bi-check2-circle' },
        { value: 'highPrecision', title: 'High Precision Mode', subtitle: 'Closer checking for stricter mastery.', detail: 'Best when accuracy matters most and you can handle more correction.', icon: 'bi bi-shield-check' }
      ],
      surahList: [
        'Al-Fatiha', 'Al-Baqarah', 'Aal-Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus',
        'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha',
        'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur', 'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum',
        'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
        'Fussilat', 'Ash-Shuraa', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
        'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqiah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah',
        'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Maarij',
        'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa',
        'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-Ala', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
        'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat',
        'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Maun', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
        'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas'
      ]
    }
  },
  computed: {
    selectedGoalOption() {
      return this.goalOptions.find(option => option.value === this.draft.goal) || this.goalOptions[1]
    },
    selectedLearningStyleOption() {
      return this.learningStyleOptions.find(option => option.value === this.draft.learningStyle) || this.learningStyleOptions[1]
    },
    selectedFocusOption() {
      return this.focusOptions.find(option => option.value === this.draft.focusMode) || this.focusOptions[2]
    },
    selectedSupportOption() {
      return this.supportOptions.find(option => option.value === this.draft.supportLevel) || this.supportOptions[1]
    },
    speechRecognitionSupported() {
      return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    },
    voiceStatusLabel() {
      if (!this.speechRecognitionSupported) return 'Manual setup available'
      if (this.voiceState.status === 'processing') return 'Processing...'
      if (this.voiceState.isListening) return 'Listening...'
      return 'Stopped'
    },
    hasVoiceDetections() {
      return !!(
        this.voiceDetected.surah
        || this.voiceDetected.dailyAyahs
        || this.voiceDetected.range
        || this.voiceDetected.learningStyle
      )
    },
    dailyGoalLabel() {
      const exact = Number(this.draft.dailyNewAyahs?.exact)
      if (Number.isFinite(exact) && exact > 0) return `${exact} ayahs/day`
      return `${this.selectedGoalOption.title} (${this.selectedGoalOption.subtitle})`
    },
    journeyForecast() {
      return calculatePlanForecast({
        goalSettings: {
          dailyNewAyahs: this.draft.dailyNewAyahs?.exact
            ? { exact: Number(this.draft.dailyNewAyahs.exact), min: Number(this.draft.dailyNewAyahs.exact), max: Number(this.draft.dailyNewAyahs.exact) }
            : this.selectedGoalOption.range
        },
        selectedSurah: this.draft.selectedSurah,
        selectedRange: this.draft.selectedRange,
        learningStyle: this.draft.learningStyle,
        focusMode: this.draft.focusMode
      })
    },
    forecastItems() {
      const forecast = this.journeyForecast
      return [
        { label: 'Total Ayahs', value: forecast.totalAyahs.toLocaleString(), icon: 'bi-book' },
        { label: 'Total Pages', value: forecast.totalPages.toLocaleString(), icon: 'bi-file-earmark-text' },
        { label: 'Total Hizb', value: forecast.totalHizb.toLocaleString(), icon: 'bi-bookmarks' },
        { label: 'Total Juz', value: forecast.totalJuz.toLocaleString(), icon: 'bi-journal-bookmark' },
        { label: 'Daily Target', value: `${forecast.dailyTarget} Ayahs / Day`, icon: 'bi-bullseye' },
        { label: 'Estimated Duration', value: forecast.estimatedDuration, icon: 'bi-hourglass-split' },
        { label: 'Estimated Completion', value: forecast.estimatedCompletionDate, icon: 'bi-calendar-check' }
      ]
    },
    summaryItems() {
      const items = [
        { label: 'Daily Target', value: this.dailyGoalLabel },
        { label: 'Learning Style', value: this.selectedLearningStyleOption.title },
        { label: 'Study Flow', value: this.selectedFocusOption.title },
        { label: 'Support Level', value: this.selectedSupportOption.title },
        { label: 'Retention Reviews', value: '1, 3, 7, 14, 30, 60 days' }
      ]
      if (this.draft.selectedSurah) items.splice(1, 0, { label: 'Surah', value: this.draft.selectedSurah })
      if (this.draft.selectedRange?.from && this.draft.selectedRange?.to) {
        items.splice(this.draft.selectedSurah ? 2 : 1, 0, {
          label: 'Ayah Range',
          value: `${this.draft.selectedRange.from}-${this.draft.selectedRange.to}`
        })
      }
      return items
    }
  },
  watch: {
    visible(isVisible) {
      if (isVisible) this.prepareModal()
    }
  },
  mounted() {
    if (this.visible) this.prepareModal()
  },
  beforeUnmount() {
    this.stopVoiceInput()
    if (this.voiceProcessingTimer) clearTimeout(this.voiceProcessingTimer)
  },
  methods: {
    createDefaultDraft() {
      return createDefaultHifzDraft()
    },
    prepareModal() {
      this.currentStep = 0
      this.existingPlan = this.loadExistingPlan()
      this.draft = this.planToDraft(this.existingPlan)
      this.manualMode = false
      this.manualTouched = {
        surah: false,
        dailyAyahs: false,
        range: false,
        learningStyle: false,
        focusMode: false,
        supportLevel: false
      }
      this.clearVoiceInput()
      this.$nextTick(() => {
        const dialog = this.$el?.querySelector?.('.hifz-plan-modal')
        if (dialog) dialog.focus({ preventScroll: true })
      })
    },
    loadExistingPlan() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    planToDraft(plan) {
      if (!plan || typeof plan !== 'object') return this.createDefaultDraft()
      const goal = this.goalOptions.find(option => option.value === plan.goalSettings?.goal)?.value
        || this.goalOptions.find(option => {
          const min = Number(plan.goalSettings?.dailyNewAyahs?.min)
          const max = Number(plan.goalSettings?.dailyNewAyahs?.max)
          return min === option.range.min && max === option.range.max
        })?.value
        || 'balanced'

      const selectedGoal = this.goalOptions.find(option => option.value === goal) || this.goalOptions[1]
      const exactDailyAyahs = Number(plan.goalSettings?.dailyNewAyahs?.exact)
      return {
        goal,
        dailyNewAyahs: Number.isFinite(exactDailyAyahs) && exactDailyAyahs > 0
          ? {
              min: exactDailyAyahs,
              max: exactDailyAyahs,
              exact: exactDailyAyahs,
              label: `${exactDailyAyahs} ayahs/day`
            }
          : { ...selectedGoal.range },
        selectedSurah: plan.selectedSurah || plan.surah || '',
        selectedRange: {
          from: Number(plan.selectedRange?.from || plan.range?.from || 0) || null,
          to: Number(plan.selectedRange?.to || plan.range?.to || 0) || null
        },
        learningStyle: this.learningStyleOptions.some(option => option.value === plan.learningStyle) ? plan.learningStyle : 'balanced',
        focusMode: this.focusOptions.some(option => option.value === plan.focusMode) ? plan.focusMode : 'mixed',
        supportLevel: this.supportOptions.some(option => option.value === plan.aiEvaluation?.supportLevel) ? plan.aiEvaluation.supportLevel : 'standard'
      }
    },
    selectGoal(value) {
      const option = this.goalOptions.find(item => item.value === value) || this.goalOptions[1]
      this.draft.goal = option.value
      this.draft.dailyNewAyahs = { ...option.range }
    },
    selectGoalManual(value) {
      this.manualTouched.dailyAyahs = true
      this.selectGoal(value)
    },
    setManualSurah(value) {
      this.manualTouched.surah = true
      this.draft.selectedSurah = value || ''
    },
    setManualDailyAyahs(value) {
      this.manualTouched.dailyAyahs = true
      const count = Number(value)
      if (!Number.isFinite(count) || count <= 0) {
        const option = this.selectedGoalOption
        this.draft.dailyNewAyahs = { ...option.range }
        return
      }
      this.applyDailyAyahCount(count)
    },
    setManualRangeBound(bound, value) {
      this.manualTouched.range = true
      const nextRange = { ...(this.draft.selectedRange || { from: null, to: null }) }
      const parsed = Number(value)
      nextRange[bound] = Number.isFinite(parsed) && parsed > 0 ? parsed : null
      this.draft.selectedRange = nextRange
    },
    selectLearningStyleManual(value) {
      this.manualTouched.learningStyle = true
      this.draft.learningStyle = value
    },
    selectFocusModeManual(value) {
      this.manualTouched.focusMode = true
      this.draft.focusMode = value
    },
    selectSupportLevelManual(value) {
      this.manualTouched.supportLevel = true
      this.draft.supportLevel = value
    },
    getSpeechRecognitionConstructor() {
      if (typeof window === 'undefined') return null
      return window.SpeechRecognition || window.webkitSpeechRecognition || null
    },
    startVoiceInput() {
      const SpeechRecognition = this.getSpeechRecognitionConstructor()
      if (!SpeechRecognition) {
        this.voiceState.status = 'stopped'
        return
      }

      this.stopVoiceInput()
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        this.voiceState.isListening = true
        this.voiceState.status = 'listening'
      }
      recognition.onresult = event => {
        let interimTranscript = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || ''
          if (event.results[index].isFinal) this.voiceFinalTranscript += `${transcript} `
          else interimTranscript += transcript
        }
        this.voiceState.transcript = `${this.voiceFinalTranscript}${interimTranscript}`.trim()
        this.voiceState.status = 'processing'
        this.applyVoicePlan(this.parseVoice(this.voiceState.transcript))
        if (this.voiceProcessingTimer) clearTimeout(this.voiceProcessingTimer)
        this.voiceProcessingTimer = setTimeout(() => {
          if (this.voiceState.isListening) this.voiceState.status = 'listening'
        }, 450)
      }
      recognition.onerror = () => {
        this.voiceState.status = this.voiceState.isListening ? 'listening' : 'stopped'
      }
      recognition.onend = () => {
        this.voiceState.isListening = false
        this.voiceState.status = 'stopped'
      }

      this.recognition = recognition
      recognition.start()
    },
    stopVoiceInput() {
      if (this.recognition) {
        try {
          this.recognition.onend = null
          this.recognition.stop()
        } catch {}
      }
      this.recognition = null
      this.voiceState.isListening = false
      this.voiceState.status = 'stopped'
    },
    clearVoiceInput() {
      this.voiceFinalTranscript = ''
      this.voiceDetected = {
        surah: '',
        dailyAyahs: null,
        range: null,
        learningStyle: ''
      }
      this.voiceState.transcript = ''
      if (!this.voiceState.isListening) this.voiceState.status = 'stopped'
    },
    normalizeVoiceText(text = '') {
      return String(text || '')
        .toLowerCase()
        .replace(/\b(um|uh|like|maybe|i think|i want|please|can you|kind of|sort of)\b/g, ' ')
        .replace(/[-_]/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },
    normalizeSurahName(value = '') {
      return String(value || '')
        .toLowerCase()
        .replace(/[-_]/g, ' ')
        .replace(/\bsurah\s+/g, ' ')
        .replace(/^al\s+/, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },
    extractDailyAyahs(text = '') {
      const dailyPatterns = [
        /(\d+)\s*(?:or\s*(\d+)\s*)?(?:ayahs?|verses?)\s*(?:per\s*day|daily|a\s*day)?/,
        /(?:daily|per\s*day|a\s*day)\s*(?:of\s*)?(\d+)\s*(?:ayahs?|verses?)?/,
        /(?:memorise|memorize|learn|read)\s*(\d+)\s*(?:ayahs?|verses?)/
      ]
      for (const pattern of dailyPatterns) {
        const match = text.match(pattern)
        if (match) return Math.max(1, Math.min(10, Number(match[2] || match[1]) || 0)) || null
      }
      return null
    },
    extractRange(text = '') {
      const patterns = [
        /(?:from|ayahs?|verses?|range)\s*(\d+)\s*(?:to|through|until|-)\s*(\d+)/,
        /\b(\d+)\s*(?:to|through|until|-)\s*(\d+)\b/
      ]
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (!match) continue
        const from = Number(match[1])
        const to = Number(match[2])
        if (Number.isFinite(from) && Number.isFinite(to) && from > 0 && to >= from) return { from, to }
      }
      return null
    },
    extractSurah(text = '') {
      const normalizedText = this.normalizeSurahName(text)
      let bestMatch = ''
      let bestLength = 0
      this.surahList.forEach(surah => {
        const normalizedSurah = this.normalizeSurahName(surah)
        const compactSurah = normalizedSurah.replace(/\s+/g, '')
        const aliases = [
          normalizedSurah,
          compactSurah,
          compactSurah === 'yasin' ? 'yaseen' : '',
          normalizedSurah === 'baqarah' ? 'al baqarah' : ''
        ].filter(Boolean)
        const matchedAlias = aliases.find(alias => normalizedText.includes(alias) || alias.includes(normalizedText))
        if (matchedAlias && matchedAlias.length > bestLength) {
          bestMatch = surah
          bestLength = matchedAlias.length
        }
      })
      return bestMatch || ''
    },
    extractLearningStyle(text = '') {
      if (/\b(light|easy|gentle|slow)\b/.test(text)) return 'light'
      if (/\b(intensive|hard|strong|strict|heavy|fast)\b/.test(text)) return 'intensive'
      if (/\b(balanced|normal|standard|medium|regular)\b/.test(text)) return 'balanced'
      return ''
    },
    parseVoice(text) {
      const cleanText = this.normalizeVoiceText(text)
      return {
        surah: this.extractSurah(cleanText),
        dailyAyahs: this.extractDailyAyahs(cleanText),
        range: this.extractRange(cleanText),
        learningStyle: this.extractLearningStyle(cleanText)
      }
    },
    applyVoicePlan(parsed = {}) {
      this.voiceDetected = {
        surah: parsed.surah || this.voiceDetected.surah || '',
        dailyAyahs: parsed.dailyAyahs || this.voiceDetected.dailyAyahs || null,
        range: parsed.range || this.voiceDetected.range || null,
        learningStyle: parsed.learningStyle || this.voiceDetected.learningStyle || ''
      }

      if (parsed.surah && !this.manualTouched.surah && !this.draft.selectedSurah) {
        this.draft.selectedSurah = parsed.surah
      }
      if (parsed.dailyAyahs && !this.manualTouched.dailyAyahs) {
        this.applyDailyAyahCount(parsed.dailyAyahs)
      }
      if (parsed.range && !this.manualTouched.range && !this.draft.selectedRange?.from && !this.draft.selectedRange?.to) {
        this.draft.selectedRange = { ...parsed.range }
      }
      if (parsed.learningStyle && !this.manualTouched.learningStyle) {
        this.draft.learningStyle = parsed.learningStyle
      }
    },
    applyDailyAyahCount(count) {
      const safeCount = Math.max(1, Math.min(10, Number(count || 0)))
      if (!Number.isFinite(safeCount)) return
      this.draft.dailyNewAyahs = {
        min: safeCount,
        max: safeCount,
        exact: safeCount,
        label: `${safeCount} ayahs/day`
      }
      if (safeCount <= 3) this.draft.goal = 'light'
      else if (safeCount <= 5) this.draft.goal = 'balanced'
      else this.draft.goal = 'intensive'
    },
    formatLearningStyle(value = '') {
      const option = this.learningStyleOptions.find(item => item.value === value)
      return option?.title || value
    },
    goToStep(index) {
      this.currentStep = Math.max(0, Math.min(this.steps.length - 1, Number(index || 0)))
    },
    nextStep() {
      this.goToStep(this.currentStep + 1)
    },
    previousStep() {
      this.goToStep(this.currentStep - 1)
    },
    buildAiEvaluation() {
      const support = this.draft.supportLevel
      return {
        supportLevel: support,
        recitationChecker: support === 'standard' || support === 'highPrecision',
        memorisationChecker: true,
        precisionMode: support === 'highPrecision'
      }
    },
    buildPlanPayload() {
      const goalOption = this.selectedGoalOption
      const now = new Date().toISOString()
      const dailyNewAyahs = this.draft.dailyNewAyahs?.exact
        ? {
            min: Number(this.draft.dailyNewAyahs.exact),
            max: Number(this.draft.dailyNewAyahs.exact),
            exact: Number(this.draft.dailyNewAyahs.exact),
            label: `${Number(this.draft.dailyNewAyahs.exact)} ayahs/day`
          }
        : {
            min: goalOption.range.min,
            max: goalOption.range.max,
            label: goalOption.subtitle
          }
      const previousLifecycle = this.existingPlan?.lifecycle || {}
      const lifecycleStatus = previousLifecycle.status || this.existingPlan?.status || 'active'
      const forecast = calculatePlanForecast({
        goalSettings: {
          goal: goalOption.value,
          dailyNewAyahs
        },
        selectedSurah: this.draft.selectedSurah || '',
        selectedRange: {
          from: Number(this.draft.selectedRange?.from || 0) || null,
          to: Number(this.draft.selectedRange?.to || 0) || null
        },
        learningStyle: this.draft.learningStyle,
        focusMode: this.draft.focusMode
      })
      return {
        id: this.existingPlan?.id || `hifz-plan-${Date.now()}`,
        status: lifecycleStatus === 'draft' ? 'active' : lifecycleStatus,
        lifecycle: {
          status: lifecycleStatus === 'draft' ? 'active' : lifecycleStatus,
          startedAt: previousLifecycle.startedAt || this.existingPlan?.startedAt || now,
          pausedAt: lifecycleStatus === 'paused' ? (previousLifecycle.pausedAt || this.existingPlan?.pausedAt || now) : null,
          updatedAt: now
        },
        goalSettings: {
          goal: goalOption.value,
          dailyNewAyahs
        },
        selectedSurah: this.draft.selectedSurah || '',
        selectedRange: {
          from: Number(this.draft.selectedRange?.from || 0) || null,
          to: Number(this.draft.selectedRange?.to || 0) || null
        },
        learningStyle: this.draft.learningStyle,
        focusMode: this.draft.focusMode,
        aiEvaluation: this.buildAiEvaluation(),
        spacedRetention: {
          enabled: true,
          intervalsDays: [1, 3, 7, 14, 30, 60],
          defaultIntervals: [
            { label: 'First review', afterDays: 1 },
            { label: 'Early retention', afterDays: 3 },
            { label: 'Weekly review', afterDays: 7 },
            { label: 'Two-week review', afterDays: 14 },
            { label: 'Monthly review', afterDays: 30 },
            { label: 'Long retention', afterDays: 60 }
          ]
        },
        forecast,
        progressSummary: this.existingPlan?.progressSummary || {
          completedAyahs: 0,
          completedReviews: 0,
          missedDays: 0,
          activityLog: []
        },
        createdAt: this.existingPlan?.createdAt || now,
        updatedAt: now
      }
    },
    savePlan() {
      const payload = this.buildPlanPayload()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      this.$emit('saved', payload)
      this.close()
    },
    close() {
      this.stopVoiceInput()
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.hifz-plan-modal-wrap {
  position: fixed;
  inset: 0;
  z-index: 13000;
}

.hifz-plan-modal {
  background: rgba(14, 12, 10, 0.32);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: max(0.75rem, env(safe-area-inset-top, 0px)) 0.75rem max(0.75rem, env(safe-area-inset-bottom, 0px));
}

.modal-dialog {
  width: min(100%, 920px);
  margin-inline: auto;
}

.modal-content {
  border: 1px solid rgba(47, 111, 88, 0.18);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 28px 70px rgba(16, 14, 12, 0.28);
  max-height: calc(100dvh - 1.5rem);
}

.modal-header,
.modal-footer {
  border-color: rgba(47, 111, 88, 0.14);
  gap: 0.75rem;
}

.modal-header {
  align-items: flex-start;
}

.modal-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #fff;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
}

.hifz-plan-kicker {
  display: block;
  margin-bottom: 0.15rem;
  color: #2f6f58;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 750;
}

.hifz-voice-panel {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.95rem;
  border: 1px solid rgba(47, 111, 88, 0.16);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(248, 253, 250, 0.98), rgba(255, 255, 255, 0.98));
}

.hifz-voice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.hifz-voice-head strong,
.hifz-voice-head small {
  display: block;
}

.hifz-voice-head strong {
  color: #1e2b24;
  font-size: 0.98rem;
}

.hifz-voice-head small {
  margin-top: 0.12rem;
  color: #687268;
  font-size: 0.78rem;
}

.hifz-voice-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.hifz-manual-toggle {
  color: #2f6f58;
  text-decoration: none;
}

.hifz-voice-alert {
  margin: 0;
  border-color: rgba(47, 111, 88, 0.14);
  color: #687268;
}

.hifz-voice-transcript {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(47, 111, 88, 0.14);
  background: #fff;
}

.hifz-voice-transcript span {
  color: #2f6f58;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hifz-voice-transcript p {
  min-height: 42px;
  max-height: 110px;
  margin: 0;
  overflow-y: auto;
  color: #1e2b24;
  line-height: 1.45;
}

.hifz-voice-detected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.hifz-voice-detected span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 32px;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: rgba(47, 111, 88, 0.09);
  border: 1px solid rgba(47, 111, 88, 0.16);
  color: #2f6f58;
  font-size: 0.78rem;
  font-weight: 700;
}

.hifz-plan-manual-fields {
  margin-top: 1rem;
  padding: 0.95rem;
  border: 1px solid rgba(47, 111, 88, 0.14);
  border-radius: 12px;
  background: #fff;
}

.hifz-plan-manual-fields .form-label {
  color: #566158;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hifz-plan-manual-fields .form-control {
  border-color: rgba(47, 111, 88, 0.22);
  border-radius: 10px;
}

.hifz-plan-manual-fields .form-control:focus {
  border-color: #2f6f58;
  box-shadow: 0 0 0 0.18rem rgba(47, 111, 88, 0.12);
}

.hifz-plan-progress {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.hifz-plan-step-dot {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  min-width: 0;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: #6f766f;
  font-size: 0.75rem;
}

.hifz-plan-step-dot span {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(47, 111, 88, 0.22);
  background: #f7faf7;
  font-weight: 700;
}

.hifz-plan-step-dot small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hifz-plan-step-dot.active span,
.hifz-plan-step-dot.complete span {
  background: #2f6f58;
  color: #fff;
  border-color: #2f6f58;
}

.hifz-plan-step-head {
  margin-bottom: 1rem;
}

.hifz-plan-step-head h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 740;
}

.hifz-plan-step-head p {
  margin: 0.28rem 0 0;
  color: #687268;
}

.hifz-plan-choice {
  width: 100%;
  min-height: 176px;
  padding: 1.15rem;
  align-items: flex-start;
  text-align: left;
  border: 2px solid rgba(47, 111, 88, 0.16);
  border-radius: 12px;
  background: #fff;
  color: #1e2b24;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.hifz-plan-choice:hover {
  transform: translateY(-3px);
  border-color: rgba(47, 111, 88, 0.42);
  box-shadow: 0 16px 36px rgba(47, 111, 88, 0.14);
}

.hifz-plan-choice.selected {
  transform: translateY(-4px) scale(1.01);
  border-color: #1d7a55;
  background: linear-gradient(180deg, rgba(226, 247, 237, 0.98), #fff 72%);
  box-shadow: 0 22px 48px rgba(34, 116, 82, 0.22), inset 0 0 0 1px rgba(29, 122, 85, 0.28);
}

.hifz-plan-choice-icon {
  width: 52px;
  height: 52px;
  display: inline-grid;
  place-items: center;
  margin-bottom: 0.75rem;
  border-radius: 10px;
  background: rgba(47, 111, 88, 0.1);
  color: #2f6f58;
  font-size: 1.35rem;
}

.hifz-plan-choice.selected .hifz-plan-choice-icon {
  background: #1d7a55;
  color: #fff;
}

.hifz-plan-choice strong {
  overflow-wrap: anywhere;
  font-size: 1.06rem;
}

.hifz-plan-choice small {
  margin-top: 0.35rem;
  color: #4f5f55;
  font-weight: 700;
  line-height: 1.35;
}

.hifz-plan-choice em {
  display: block;
  margin-top: 0.55rem;
  color: #687268;
  font-size: 0.82rem;
  font-style: normal;
  line-height: 1.45;
}

.hifz-plan-choice-wide {
  min-height: 178px;
}

.hifz-forecast-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.hifz-forecast-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.18rem 0.65rem;
  align-items: center;
  min-height: 84px;
  padding: 0.9rem;
  border: 1px solid rgba(47, 111, 88, 0.18);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(248, 253, 250, 0.98), #fff);
}

.hifz-forecast-icon {
  grid-row: span 2;
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(47, 111, 88, 0.1);
  color: #2f6f58;
  font-size: 1.15rem;
}

.hifz-forecast-card span:not(.hifz-forecast-icon) {
  color: #687268;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hifz-forecast-card strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: #1e2b24;
  font-size: 1rem;
  line-height: 1.22;
}

.hifz-plan-summary {
  display: grid;
  gap: 0.75rem;
}

.hifz-plan-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(47, 111, 88, 0.14);
  border-radius: 10px;
  background: #f8fbf8;
}

.hifz-plan-summary-row span {
  color: #687268;
}

.hifz-plan-summary-row strong {
  text-align: right;
}

.hifz-plan-save-btn {
  font-weight: 700;
}

.hifz-plan-modal .btn,
.hifz-plan-modal .btn-close,
.hifz-plan-choice,
.hifz-plan-step-dot {
  min-width: 44px;
  min-height: 44px;
}

.hifz-plan-modal .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

@media (max-width: 640px) {
  .hifz-plan-modal {
    padding: 0;
  }

  .modal-dialog {
    width: 100%;
    min-height: 100dvh;
    margin: 0;
  }

  .modal-content {
    min-height: 100dvh;
    max-height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-inline: max(1rem, env(safe-area-inset-left, 0px)) max(1rem, env(safe-area-inset-right, 0px));
  }

  .modal-title {
    font-size: 1.08rem;
    line-height: 1.2;
  }

  .hifz-voice-head {
    align-items: stretch;
    flex-direction: column;
  }

  .hifz-voice-actions {
    justify-content: stretch;
  }

  .hifz-voice-actions .btn {
    flex: 1 1 100%;
  }

  .hifz-plan-progress {
    grid-template-columns: repeat(5, 1fr);
    gap: 0.25rem;
  }

  .hifz-plan-step-dot small {
    display: none;
  }

  .hifz-plan-summary-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .hifz-plan-summary-row strong {
    text-align: left;
  }

  .hifz-forecast-grid {
    grid-template-columns: 1fr;
  }

  .hifz-plan-choice {
    min-height: auto;
  }

  .modal-footer {
    display: grid;
    grid-template-columns: 1fr;
  }

  .modal-footer .btn {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .hifz-plan-progress {
    gap: 0.15rem;
  }

  .hifz-plan-step-dot span {
    width: 28px;
    height: 28px;
  }
}
</style>
