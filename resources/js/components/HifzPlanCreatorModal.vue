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
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
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
              <div class="hifz-plan-progress-head">
                <div>
                  <span class="hifz-plan-progress-kicker">Step {{ currentStep + 1 }} of {{ steps.length }}</span>
                  <strong>{{ steps[currentStep]?.headline || 'Your plan' }}</strong>
                </div>
                <span class="hifz-plan-progress-percent">{{ wizardProgressPercent }}%</span>
              </div>
              <div class="hifz-plan-progress-bar" aria-hidden="true">
                <span :style="{ width: `${wizardProgressPercent}%` }"></span>
              </div>
              <div class="hifz-plan-progress-steps">
              <button
                v-for="(item, index) in steps"
                :key="item.key"
                type="button"
                class="hifz-plan-step-dot"
                :class="{
                  active: currentStep === index,
                  complete: isStepComplete(index),
                  locked: index !== currentStep
                }"
                :aria-current="currentStep === index ? 'step' : null"
                :disabled="true"
              >
                <span>{{ index + 1 }}</span>
                <small>{{ item.label }}</small>
              </button>
            </div>
            <p v-if="stepValidationMessage" class="hifz-plan-validation-hint">{{ stepValidationMessage }}</p>
            </div>

            <section v-if="currentStep === 0" class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Choose Your Daily Goal</h3>
                <p>Choose how many new ayahs you want to learn each day.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in goalOptions" :key="option.value" class="col-4">
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
                  <div class="col-5">
                    <label class="form-label" for="hifzPlanSurah">Surah</label>
                    <input
                      id="hifzPlanSurah"
                      class="form-control"
                      list="hifzPlanSurahOptions"
                      :value="draft.selectedSurah"
                      placeholder="Choose a Surah"
                      @input="setManualSurah($event.target.value)"
                    >
                    <datalist id="hifzPlanSurahOptions">
                      <option v-for="surah in surahList" :key="surah" :value="surah"></option>
                    </datalist>
                  </div>
                  <div class="col-3">
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
                  <div class="col-2">
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
                  <div class="col-2">
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
                <p>Pick the pace that feels realistic for your daily routine.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in learningStyleOptions" :key="option.value" class="col-4">
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
                <p>Tell Mutqin what to focus on first during each session.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in focusOptions" :key="option.value" class="col-6">
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
                <p>Choose how much checking and guidance you want during practice.</p>
              </div>
              <div class="row g-3">
                <div v-for="option in supportOptions" :key="option.value" class="col-4">
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

            <section v-else-if="currentStep === 4" class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Set Your Playback</h3>
                <p>Choose how many repeats, which reciter, and the playback speed for each ayah.</p>
              </div>
              <div class="row g-3">
                <div class="col-4">
                  <label class="form-label" for="hifzPlanRepeats">Repeats per ayah</label>
                  <input
                    id="hifzPlanRepeats"
                    type="number"
                    min="1"
                    max="10"
                    class="form-control"
                    :value="draft.repetitionsPerAyah"
                    @input="setPlaybackField('repetitionsPerAyah', $event.target.value)"
                  >
                </div>
                <div class="col-4">
                  <label class="form-label" for="hifzPlanReciter">Reciter</label>
                  <select
                    id="hifzPlanReciter"
                    class="form-select"
                    :value="draft.reciterId"
                    @change="setPlaybackField('reciterId', $event.target.value)"
                  >
                    <option v-for="reciter in reciterChoices" :key="reciter.id" :value="reciter.id">{{ reciter.name }}</option>
                  </select>
                </div>
                <div class="col-4">
                  <label class="form-label" for="hifzPlanSpeed">Playback speed</label>
                  <select
                    id="hifzPlanSpeed"
                    class="form-select"
                    :value="draft.playbackSpeed"
                    @change="setPlaybackField('playbackSpeed', $event.target.value)"
                  >
                    <option v-for="option in speedOptions" :key="`speed-${option}`" :value="option">{{ option }}x</option>
                  </select>
                </div>
              </div>
            </section>

            <section v-else class="hifz-plan-step">
              <div class="hifz-plan-step-head">
                <h3>Your Hifz Journey Is Ready</h3>
                <p>Review today&apos;s pace, then start and let Mutqin guide the first session automatically.</p>
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
              <p class="hifz-plan-summary-note">When you start, the timer, audio, and ayah highlighting all begin automatically.</p>
            </section>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" :disabled="currentStep === 0" @click="previousStep">
              Back
            </button>
            <button
              v-if="currentStep < steps.length - 1"
              type="button"
              class="btn btn-success"
              :disabled="!canProceedFromCurrentStep"
              @click="nextStep"
            >
              Continue
            </button>
            <button
              v-else
              type="button"
              class="btn btn-success hifz-plan-save-btn"
              :disabled="!canSavePlan"
              @click="savePlan"
            >
              {{ existingPlan ? 'Save Hifz Plan' : 'Start Hifz Journey' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { HIFZ_PLAN_STORAGE_KEY, calculatePlanForecast } from '../scripts/engine/hifz_session_engine'

const STORAGE_KEY = HIFZ_PLAN_STORAGE_KEY

function createDefaultHifzDraft() {
  return {
    goal: 'balanced',
    dailyNewAyahs: { min: 3, max: 5 },
    selectedSurah: '',
    selectedRange: { from: null, to: null },
    learningStyle: 'balanced',
    focusMode: 'mixed',
    supportLevel: 'standard',
    repetitionsPerAyah: 5,
    reciterId: '',
    playbackSpeed: 1
  }
}

export default {
  name: 'HifzPlanCreatorModal',
  props: {
    visible: { type: Boolean, default: false },
    reciters: { type: Array, default: () => [] },
    speedOptions: { type: Array, default: () => [0.5, 1, 1.25, 1.5, 2] }
  },
  emits: ['close', 'saved'],
  data() {
    return {
      currentStep: 0,
      existingPlan: null,
      draft: createDefaultHifzDraft(),
      manualTouched: {
        surah: false,
        dailyAyahs: false,
        range: false,
        learningStyle: false,
        focusMode: false,
        supportLevel: false,
        playback: false
      },
      steps: [
        { key: 'goal', label: 'Goal', headline: "Choose today's goal" },
        { key: 'style', label: 'Style', headline: 'Pick your daily pace' },
        { key: 'flow', label: 'Flow', headline: 'Choose your study flow' },
        { key: 'support', label: 'Support', headline: 'Set your support level' },
        { key: 'playback', label: 'Playback', headline: 'Choose your recitation setup' },
        { key: 'summary', label: 'Summary', headline: 'Start your Hifz journey' }
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
        { value: 'gentle', title: 'Gentle Guidance', subtitle: 'Light checking and softer feedback.', detail: 'Best if you want a lighter workload while building confidence and consistency.', icon: 'bi bi-hand-thumbs-up' },
        { value: 'standard', title: 'Standard Support', subtitle: 'Balanced checking and practical feedback.', detail: 'Best for most learners who want useful correction without slowing the session down.', icon: 'bi bi-check2-circle' },
        { value: 'highPrecision', title: 'High Precision Mode', subtitle: 'Closer checking for stricter mastery.', detail: 'Best when you want tighter correction and can handle a more demanding session.', icon: 'bi bi-shield-check' }
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
    reciterChoices() {
      const normalized = (this.reciters || [])
        .map(reciter => {
          if (typeof reciter === 'string') return { id: reciter, name: reciter }
          const id = String(reciter?.id ?? '')
          const name = String(reciter?.name || reciter?.label || id)
          return id ? { id, name } : null
        })
        .filter(Boolean)
      return normalized.length ? normalized : [{ id: 'ar.alafasy', name: 'Alafasy' }]
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
        { label: 'Repeats per Ayah', value: `${this.draft.repetitionsPerAyah}x` },
        { label: 'Reciter', value: this.reciterChoices.find(reciter => reciter.id === this.draft.reciterId)?.name || 'Alafasy' },
        { label: 'Playback Speed', value: `${this.draft.playbackSpeed}x` },
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
    },
    hasValidDailyTarget() {
      const exact = Number(this.draft.dailyNewAyahs?.exact)
      const min = Number(this.draft.dailyNewAyahs?.min)
      const max = Number(this.draft.dailyNewAyahs?.max)
      return (Number.isFinite(exact) && exact > 0) || (Number.isFinite(min) && min > 0) || (Number.isFinite(max) && max > 0)
    },
    hasValidRange() {
      const from = Number(this.draft.selectedRange?.from || 0)
      const to = Number(this.draft.selectedRange?.to || 0)
      if (!from && !to) return true
      if (!from || !to) return false
      return to >= from
    },
    canProceedFromCurrentStep() {
      return this.isStepComplete(this.currentStep)
    },
    canSavePlan() {
      return this.isStepComplete(this.steps.length - 1)
    },
    maxAccessibleStep() {
      const firstIncomplete = this.steps.findIndex((_, index) => !this.isStepComplete(index))
      if (firstIncomplete === -1) return this.steps.length - 1
      return Math.min(this.steps.length - 1, firstIncomplete)
    },
    wizardProgressPercent() {
      const base = ((this.currentStep + 1) / this.steps.length) * 100
      const bonus = this.canProceedFromCurrentStep ? (100 / this.steps.length) * 0.35 : 0
      return Math.max(20, Math.min(100, Math.round(base + bonus)))
    },
    stepValidationMessage() {
      const stepKey = this.steps[this.currentStep]?.key
      if (stepKey === 'goal') {
        if (!String(this.draft.selectedSurah || '').trim()) return ''
        if (!this.hasValidDailyTarget) return 'Set a realistic number of new ayahs for each day.'
        if (!this.hasValidRange) return 'Enter a valid ayah range or leave both range fields blank.'
      }
      if (stepKey === 'playback') {
        if (!Number(this.draft.repetitionsPerAyah)) return 'Choose how many times each ayah should repeat.'
        if (!String(this.draft.reciterId || '').trim()) return 'Choose a reciter before you continue.'
      }
      return ''
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
  methods: {
    createDefaultDraft() {
      return createDefaultHifzDraft()
    },
    prepareModal() {
      this.currentStep = 0
      this.existingPlan = this.loadExistingPlan()
      this.draft = this.planToDraft(this.existingPlan)
      if (!String(this.draft.reciterId || '').trim()) {
        this.draft.reciterId = this.reciterChoices[0]?.id || 'ar.alafasy'
      }
      if (!this.speedOptions.includes(Number(this.draft.playbackSpeed))) {
        this.draft.playbackSpeed = 1
      }
      this.manualTouched = {
        surah: false,
        dailyAyahs: false,
        range: false,
        learningStyle: false,
        focusMode: false,
        supportLevel: false,
        playback: false
      }
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
        supportLevel: this.supportOptions.some(option => option.value === plan.aiEvaluation?.supportLevel) ? plan.aiEvaluation.supportLevel : 'standard',
        repetitionsPerAyah: Math.max(1, Math.min(10, Number(plan.playback?.repetitionsPerAyah || 5))),
        reciterId: String(plan.playback?.reciterId || this.reciterChoices[0]?.id || 'ar.alafasy'),
        playbackSpeed: this.speedOptions.includes(Number(plan.playback?.speed)) ? Number(plan.playback.speed) : 1
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
    setPlaybackField(field, value) {
      this.manualTouched.playback = true
      if (field === 'repetitionsPerAyah') {
        this.draft.repetitionsPerAyah = Math.max(1, Math.min(10, Number(value || 1)))
        return
      }
      if (field === 'playbackSpeed') {
        const numeric = Number(value)
        this.draft.playbackSpeed = this.speedOptions.includes(numeric) ? numeric : 1
        return
      }
      if (field === 'reciterId') {
        this.draft.reciterId = String(value || this.reciterChoices[0]?.id || 'ar.alafasy')
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
    isStepComplete(index) {
      const step = this.steps[index]
      if (!step) return false
      if (step.key === 'goal') {
        return !!String(this.draft.selectedSurah || '').trim() && this.hasValidDailyTarget && this.hasValidRange
      }
      if (step.key === 'style') return this.isStepComplete(0) && !!this.draft.learningStyle
      if (step.key === 'flow') return this.isStepComplete(1) && !!this.draft.focusMode
      if (step.key === 'support') return this.isStepComplete(2) && !!this.draft.supportLevel
      if (step.key === 'playback') return this.isStepComplete(3) && Number(this.draft.repetitionsPerAyah) > 0 && !!String(this.draft.reciterId || '').trim()
      if (step.key === 'summary') return this.isStepComplete(4)
      return false
    },
    isStepAccessible(index) {
      return Number(index) <= this.maxAccessibleStep
    },
    goToStep(index) {
      const nextIndex = Math.max(0, Math.min(this.steps.length - 1, Number(index || 0)))
      if (!this.isStepAccessible(nextIndex)) return
      this.currentStep = nextIndex
    },
    nextStep() {
      if (!this.canProceedFromCurrentStep) return
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
        playback: {
          repetitionsPerAyah: Math.max(1, Math.min(10, Number(this.draft.repetitionsPerAyah || 5))),
          reciterId: String(this.draft.reciterId || this.reciterChoices[0]?.id || 'ar.alafasy'),
          speed: Number(this.draft.playbackSpeed || 1)
        },
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
      if (!this.canSavePlan) return
      const payload = this.buildPlanPayload()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      this.$emit('saved', payload)
      this.close()
    },
    close() {
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
  --plan-border: color-mix(in srgb, var(--accent) 18%, var(--border));
  --plan-border-strong: color-mix(in srgb, var(--accent) 32%, var(--border));
  --plan-surface: color-mix(in srgb, var(--surface-strong, #fff) 92%, var(--surface-elevated, var(--surface)));
  --plan-surface-soft: color-mix(in srgb, var(--surface-soft, var(--surface)) 72%, var(--surface));
  --plan-field: var(--field-bg, rgba(255, 255, 255, 0.9));
  --plan-text: var(--text, #1f1a17);
  --plan-muted: var(--text-muted, #6c6258);
  --plan-accent: var(--accent, #2f6f58);
  --plan-accent-strong: var(--accent-strong, #1d7a55);
  --plan-accent-soft: var(--accent-light, rgba(47, 111, 88, 0.1));
  --plan-overlay: var(--overlay, rgba(14, 12, 10, 0.32));
}

.hifz-plan-modal {
  background: var(--plan-overlay);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: max(0.75rem, env(safe-area-inset-top, 0px)) 0.75rem max(0.75rem, env(safe-area-inset-bottom, 0px));
}

.modal-dialog {
  width: min(100%, 1240px);
  margin-inline: auto;
}

.modal-content {
  border: 1px solid var(--plan-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--plan-surface);
  box-shadow: var(--shadow-lg);
  max-height: calc(100dvh - 1.5rem);
}

.modal-header,
.modal-footer {
  border-color: color-mix(in srgb, var(--plan-border) 88%, transparent);
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
  background: var(--plan-surface);
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
}

.hifz-plan-kicker {
  display: block;
  margin-bottom: 0.15rem;
  color: var(--plan-accent);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 750;
}

.hifz-plan-manual-fields {
  margin-top: 1rem;
  padding: 0.95rem;
  border: 1px solid color-mix(in srgb, var(--plan-border) 88%, transparent);
  border-radius: 12px;
  background: var(--plan-field);
}

.hifz-plan-manual-fields .form-label {
  color: var(--plan-muted);
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hifz-plan-manual-fields .form-control {
  border-color: var(--plan-border-strong);
  background: var(--field-bg-strong, var(--plan-field));
  color: var(--plan-text);
  border-radius: 10px;
}

.hifz-plan-manual-fields .form-control:focus {
  border-color: var(--plan-accent);
  box-shadow: 0 0 0 0.18rem color-mix(in srgb, var(--plan-accent-soft) 76%, transparent);
}

.hifz-plan-progress {
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.hifz-plan-progress-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.hifz-plan-progress-head strong {
  display: block;
  color: var(--plan-text);
  font-size: 1rem;
  font-weight: 760;
}

.hifz-plan-progress-kicker,
.hifz-plan-progress-percent {
  color: var(--plan-muted);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.hifz-plan-progress-bar {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--plan-accent-soft);
}

.hifz-plan-progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--plan-accent-strong), color-mix(in srgb, var(--plan-accent) 46%, #ffffff));
  transition: width 180ms ease;
}

.hifz-plan-progress-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
}

.hifz-plan-progress-note,
.hifz-plan-summary-note {
  margin: 0.4rem 0 0;
  color: var(--plan-muted);
  font-size: 0.82rem;
}

.hifz-plan-validation-hint {
  margin: -0.2rem 0 0;
  color: color-mix(in srgb, var(--plan-accent) 62%, #b77722);
  font-size: 0.84rem;
  font-weight: 700;
}

.hifz-plan-step-dot {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  min-width: 0;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--plan-muted);
  font-size: 0.75rem;
  transition: opacity 160ms ease, transform 160ms ease;
}

.hifz-plan-step-dot span {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid var(--plan-border-strong);
  background: var(--plan-surface-soft);
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
  background: var(--plan-accent);
  color: #fff;
  border-color: var(--plan-accent);
}

.hifz-plan-step-dot.active {
  color: var(--plan-accent-strong);
}

.hifz-plan-step-dot.locked {
  opacity: 0.55;
}

.hifz-plan-step-dot:disabled {
  cursor: not-allowed;
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
  color: var(--plan-muted);
}

.hifz-plan-choice {
  width: 100%;
  min-height: 176px;
  padding: 1.15rem;
  align-items: flex-start;
  text-align: left;
  border: 2px solid color-mix(in srgb, var(--plan-accent) 16%, var(--border));
  border-radius: 12px;
  background: var(--plan-field);
  color: var(--plan-text);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.hifz-plan-choice:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--plan-accent) 42%, var(--border));
  box-shadow: var(--shadow-md);
}

.hifz-plan-choice.selected {
  transform: translateY(-4px) scale(1.01);
  border-color: var(--plan-accent-strong);
  background: linear-gradient(180deg, color-mix(in srgb, var(--plan-accent-soft) 44%, var(--plan-field)) 0%, var(--plan-field) 72%);
  box-shadow: var(--shadow-lg), inset 0 0 0 1px color-mix(in srgb, var(--plan-accent) 28%, transparent);
}

.hifz-plan-choice-icon {
  width: 52px;
  height: 52px;
  display: inline-grid;
  place-items: center;
  margin-bottom: 0.75rem;
  border-radius: 10px;
  background: var(--plan-accent-soft);
  color: var(--plan-accent);
  font-size: 1.35rem;
}

.hifz-plan-choice.selected .hifz-plan-choice-icon {
  background: var(--plan-accent-strong);
  color: #fff;
}

.hifz-plan-choice strong {
  overflow-wrap: anywhere;
  font-size: 1.06rem;
}

.hifz-plan-choice small {
  margin-top: 0.35rem;
  color: var(--plan-text);
  font-weight: 700;
  line-height: 1.35;
}

.hifz-plan-choice em {
  display: block;
  margin-top: 0.55rem;
  color: var(--plan-muted);
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
  border: 1px solid var(--plan-border);
  border-radius: 10px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--plan-surface-soft) 88%, transparent), var(--plan-field));
}

.hifz-forecast-icon {
  grid-row: span 2;
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border-radius: 10px;
  background: var(--plan-accent-soft);
  color: var(--plan-accent);
  font-size: 1.15rem;
}

.hifz-forecast-card span:not(.hifz-forecast-icon) {
  color: var(--plan-muted);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hifz-forecast-card strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--plan-text);
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
  border: 1px solid color-mix(in srgb, var(--plan-border) 88%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--plan-surface-soft) 88%, transparent);
}

.hifz-plan-summary-row span {
  color: var(--plan-muted);
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

</style>
