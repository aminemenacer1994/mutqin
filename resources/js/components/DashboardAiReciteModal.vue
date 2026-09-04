<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay mutqin-modal-overlay dash-ai-recite-overlay"
      :class="{ 'is-busy': isBusy }"
      @mousedown.self.prevent="onBackdrop"
      @click.self.prevent="onBackdrop"
      @keydown="onOverlayKeydown"
    >
      <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog dash-ai-recite-dialog">
        <div
          ref="dialog"
          class="modal-content mutqin-modal-surface dash-ai-recite-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashAiReciteTitle"
          tabindex="-1"
        >
          <header class="dash-ai-recite-header">
            <div class="dash-ai-recite-header__copy">
              <span class="dash-ai-recite-kicker">{{ t('dashboard.ai_recite.kicker') }}</span>
              <h2 id="dashAiReciteTitle">{{ panelTitle }}</h2>
              <p v-if="rangeLabel" class="dash-ai-recite-range">{{ rangeLabel }}</p>
            </div>
            <button
              type="button"
              class="modal-close-btn"
              :aria-label="t('common.close')"
              @click="requestClose"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="dash-ai-recite-body">
            <template v-if="stage === 'stats'">
              <div v-if="statsLoading" class="dash-ai-recite-status" role="status">
                <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                <span>{{ t('dashboard.loading') }}</span>
              </div>
              <AppStatus
                v-else-if="statsError"
                variant="error"
                fill
                :title="t('dashboard.ai_recite.stats_error_title')"
                :description="t('dashboard.ai_recite.stats_error_desc')"
                :action-label="t('dashboard.retry')"
                @action="loadStats"
              />
              <AppStatus
                v-else-if="statsView.empty"
                variant="empty"
                fill
                icon="bi-graph-up"
                :title="t('dashboard.ai_recite.stats_empty_title')"
                :description="t('dashboard.ai_recite.stats_empty_desc')"
                :action-label="t('dashboard.ai_recite.back_to_test')"
                @action="backToReady"
              />
              <template v-else>
                <section class="dash-ai-recite-stats-grid" :aria-label="t('dashboard.ai_recite.stats_title')">
                  <article v-for="card in statsView.cards" :key="card.key" class="dash-ai-recite-stat">
                    <span>{{ card.label }}</span>
                    <strong>{{ card.value }}</strong>
                  </article>
                </section>
                <section v-if="statsView.weakest.length" class="dash-ai-recite-panel">
                  <h3>{{ t('dashboard.ai_recite.weakest_ayahs') }}</h3>
                  <ul>
                    <li v-for="item in statsView.weakest" :key="item.key">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </li>
                  </ul>
                </section>
                <section v-if="statsView.missed.length" class="dash-ai-recite-panel">
                  <h3>{{ t('dashboard.ai_recite.missed_words') }}</h3>
                  <ul class="dash-ai-recite-words">
                    <li v-for="item in statsView.missed" :key="item.key">
                      <span class="dash-ai-recite-arabic">{{ item.text }}</span>
                      <small>{{ item.count }}</small>
                    </li>
                  </ul>
                </section>
                <section class="dash-ai-recite-panel">
                  <h3>{{ t('dashboard.ai_recite.recent_attempts') }}</h3>
                  <ul v-if="statsView.recent.length" class="dash-ai-recite-attempts">
                    <li v-for="item in statsView.recent" :key="item.id">
                      <button type="button" class="dash-ai-recite-attempt" @click="openSavedAttempt(item.id)">
                        <span>
                          <strong>{{ item.surah_name }} · {{ ayahLabel(item.ayah_start, item.ayah_end) }}</strong>
                          <small>{{ formatWhen(item.occurred_at) }}</small>
                        </span>
                        <span class="dash-ai-recite-attempt__meta">
                          <em v-if="item.accuracy_percent != null">{{ t('dashboard.drawer_accuracy', { n: item.accuracy_percent }) }}</em>
                          <i v-if="item.peek_used" class="bi bi-eye" :title="t('dashboard.ai_recite.peek_used')" aria-hidden="true"></i>
                        </span>
                      </button>
                    </li>
                  </ul>
                  <p v-else class="dash-ai-recite-empty">{{ t('dashboard.ai_recite.no_recent') }}</p>
                </section>
              </template>
            </template>

            <template v-else>
              <div v-if="stage === 'ready'" class="dash-ai-recite-picker">
                <label class="dash-ai-recite-field">
                  <span>{{ t('dashboard.ai_recite.surah') }}</span>
                  <select v-model.number="surah" :disabled="isBusy">
                    <option v-for="item in chapters" :key="item.id" :value="item.id">
                      {{ item.id }}. {{ item.name }}
                    </option>
                  </select>
                </label>
                <label class="dash-ai-recite-field">
                  <span>{{ t('dashboard.ai_recite.ayah') }}</span>
                  <select v-model.number="ayah" :disabled="isBusy">
                    <option v-for="n in ayahOptions" :key="n" :value="n">{{ n }}</option>
                  </select>
                </label>
              </div>

              <div
                v-if="stage === 'recording'"
                class="dash-ai-recite-pill"
                role="status"
                aria-live="polite"
              >
                <span class="dash-ai-recite-pill__dot" aria-hidden="true"></span>
                <strong>{{ t('memorisation.amd.micListening') }}</strong>
                <span>{{ elapsedLabel }}</span>
              </div>

              <div v-if="stage === 'processing'" class="dash-ai-recite-status" role="status">
                <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                <span>{{ processingLabel }}</span>
              </div>

              <AppStatus
                v-if="stage === 'error'"
                variant="error"
                fill
                :title="errorTitle"
                :description="errorDesc"
                :action-label="t('dashboard.retry')"
                @action="retryFromError"
              />

              <section v-if="stage === 'result' && analysisView" class="dash-ai-recite-result">
                <div v-if="accuracyDisplay || analysisView.aiReview" class="dash-ai-recite-score">
                  <span>{{ t('dashboard.ai_recite.accuracy') }}</span>
                  <strong>{{ accuracyDisplay || analysisView.aiReview?.summaryLine }}</strong>
                  <small v-if="analysisView.aiReview?.outcomeLabel">{{ analysisView.aiReview.outcomeLabel }}</small>
                </div>
                <div
                  v-for="row in analysisView.ayahRows"
                  :key="row.ayah || 'ayah'"
                  class="dash-ai-recite-ayah"
                >
                  <p class="dash-ai-recite-arabic dash-ai-recite-ayah__words" dir="rtl" lang="ar">
                    <span
                      v-for="(part, index) in row.parts"
                      :key="`${row.ayah}-${index}`"
                      class="session-analysis-word"
                      :class="part.tone"
                    >{{ part.text }}</span>
                  </p>
                </div>
                <div class="dash-ai-recite-audio">
                  <span>{{ t('dashboard.ai_recite.audio') }}</span>
                  <template v-if="audioUrl">
                    <audio
                      ref="player"
                      :src="audioUrl"
                      preload="metadata"
                      @timeupdate="onAudioTime"
                      @ended="onAudioEnded"
                    ></audio>
                    <div class="dash-ai-recite-audio__controls">
                      <button type="button" class="dash-btn dash-btn--sm" @click="togglePlayback">
                        {{ audioPlaying ? t('dashboard.ai_recite.pause') : t('dashboard.ai_recite.play') }}
                      </button>
                      <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="restartPlayback">
                        {{ t('dashboard.ai_recite.restart') }}
                      </button>
                      <small>{{ audioTimeLabel }}</small>
                    </div>
                  </template>
                  <p v-else class="dash-ai-recite-empty">{{ t('dashboard.analysis_audio_unavailable') }}</p>
                </div>
              </section>

              <section v-if="peekVisible" class="dash-ai-recite-peek" aria-live="polite">
                <header>
                  <span>{{ peekHeading }}</span>
                  <button
                    v-if="peekRevealed && peekAyah"
                    type="button"
                    class="dash-btn dash-btn--ghost dash-btn--sm"
                    @click="peekRevealed = false"
                  >
                    {{ t('dashboard.ai_recite.peek_hide') }}
                  </button>
                </header>
                <p
                  v-if="peekRevealed && peekAyah"
                  class="dash-ai-recite-arabic"
                  dir="rtl"
                  lang="ar"
                >{{ peekAyah.text }}</p>
                <p v-else-if="!peekAyah" class="dash-ai-recite-empty">{{ t('dashboard.ai_recite.peek_last') }}</p>
              </section>
            </template>
          </div>

          <footer class="dash-ai-recite-footer">
            <template v-if="stage === 'stats'">
              <button type="button" class="dash-btn dash-btn--ghost" @click="backToReady">
                {{ t('dashboard.ai_recite.back_to_test') }}
              </button>
            </template>
            <template v-else>
              <button
                v-if="canPeek"
                type="button"
                class="dash-btn dash-btn--ghost"
                :class="{ 'is-active': peekRevealed }"
                :disabled="!peekAyah"
                @click="togglePeek"
              >
                {{ peekRevealed ? t('dashboard.ai_recite.peek_hide') : t('dashboard.ai_recite.peek') }}
              </button>
              <button
                v-if="stage === 'ready'"
                type="button"
                class="dash-btn dash-btn--primary"
                :disabled="starting"
                @click="startRecording"
              >
                {{ t('dashboard.ai_recite.start_recording') }}
              </button>
              <button
                v-if="stage === 'recording'"
                type="button"
                class="dash-btn dash-btn--primary"
                :disabled="stopping"
                @click="stopRecording"
              >
                {{ t('memorisation.amd.stopRecitation') }}
              </button>
              <template v-if="stage === 'result'">
                <button type="button" class="dash-btn dash-btn--ghost" @click="tryAgain">
                  {{ t('dashboard.ai_recite.try_again') }}
                </button>
                <button type="button" class="dash-btn dash-btn--ghost" @click="testAnother">
                  {{ t('dashboard.ai_recite.test_another') }}
                </button>
                <button type="button" class="dash-btn dash-btn--primary" @click="openStats">
                  {{ t('dashboard.ai_recite.see_stats') }}
                </button>
              </template>
              <button
                v-if="stage === 'ready'"
                type="button"
                class="dash-btn dash-btn--ghost"
                @click="openStats"
              >
                {{ t('dashboard.ai_recite.see_stats') }}
              </button>
            </template>
          </footer>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import AppStatus from './AppStatus.vue'
import { learningApi } from '../scripts/api/learning'
import { isAiAudioConsentDeclined, resolveAiAudioConsentRecord } from '../scripts/audio/aiAudioConsent'
import { buildAssessmentAyahs, buildRecognitionWords } from '../scripts/memorisationDetection/api'
import { buildSessionAnalysisView } from '../scripts/sessionAnalysis/buildSessionAnalysisView'
import { resolveMicDeniedGuidance } from '../scripts/audio/recordingResilience'
import { loadAyah } from '../scripts/dashboardAiRecite/ayahText'
import { buildDashboardAiReciteStatsView } from '../scripts/dashboardAiRecite/buildStatsView'
import {
  ayahCountForSurah,
  clampAyah,
  nextAyahLocation,
  resolveDefaultLocation,
  surahCatalog,
  surahName,
  writeStoredLastLocation,
  readStoredLastLocation,
} from '../scripts/dashboardAiRecite/location'
import { createDashboardAiReciteRecorder } from '../scripts/dashboardAiRecite/recordingSession'

export default {
  name: 'DashboardAiReciteModal',
  components: { AppStatus },
  props: {
    open: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 0 },
    progress: { type: Object, default: null },
    preferredLocation: { type: Object, default: null },
  },
  emits: ['close', 'saved'],
  data() {
    return {
      stage: 'ready',
      surah: 1,
      ayah: 1,
      chapters: surahCatalog(),
      starting: false,
      stopping: false,
      elapsedLabel: '00:00',
      processingLabel: '',
      errorTitle: '',
      errorDesc: '',
      peekUsed: false,
      peekRevealed: false,
      peekAyah: null,
      analysisView: null,
      audioUrl: '',
      audioPlaying: false,
      audioTimeLabel: '0:00',
      savedAttemptId: null,
      submitKey: '',
      statsLoading: false,
      statsError: false,
      statsView: buildDashboardAiReciteStatsView(null, (key) => key),
      statsRequestId: 0,
      recorder: null,
    }
  },
  computed: {
    ayahOptions() {
      const max = ayahCountForSurah(this.surah)
      return Array.from({ length: max }, (_, index) => index + 1)
    },
    rangeLabel() {
      const name = surahName(this.surah)
      return name
        ? `${name} · ${this.t('dashboard.ayah_n', { n: this.ayah })}`
        : this.t('dashboard.ayah_n', { n: this.ayah })
    },
    panelTitle() {
      return this.stage === 'stats'
        ? this.t('dashboard.ai_recite.stats_title')
        : this.t('dashboard.ai_recite.title')
    },
    isBusy() {
      return this.stage === 'recording' || this.stage === 'processing' || this.starting || this.stopping
    },
    canPeek() {
      return ['ready', 'recording', 'result'].includes(this.stage)
    },
    peekVisible() {
      if (this.peekRevealed) return true
      return this.stage === 'result' && !this.peekAyah
    },
    accuracyDisplay() {
      const card = (this.analysisView?.summaryCards || []).find((item) => item.key === 'accuracy')
      return card?.value || ''
    },
    peekHeading() {
      if (!this.peekAyah) return this.t('dashboard.ai_recite.peek_last')
      return this.t('dashboard.ai_recite.peek_ayah', { n: this.peekAyah.ayah })
    },
  },
  watch: {
    open: {
      immediate: true,
      async handler(isOpen) {
        this.syncBodyLock(!!isOpen)
        if (isOpen) {
          this.bindEscape()
          await this.resetForOpen()
          this.$nextTick(() => this.$refs.dialog?.focus?.())
        } else {
          this.unbindEscape()
          this.teardown()
        }
      },
    },
    surah() {
      this.ayah = clampAyah(this.surah, this.ayah)
      this.refreshPeekTarget()
    },
    ayah() {
      this.refreshPeekTarget()
    },
  },
  beforeUnmount() {
    this.unbindEscape()
    this.syncBodyLock(false)
    this.teardown()
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    ayahLabel(start, end) {
      const from = Number(start || 0)
      const to = Number(end || from)
      if (from <= 0) return ''
      return from === to
        ? this.t('dashboard.ayah_n', { n: from })
        : this.t('dashboard.ayah_range', { start: from, end: to })
    },
    formatWhen(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString()
    },
    async resetForOpen() {
      this.stage = 'ready'
      this.starting = false
      this.stopping = false
      this.peekUsed = false
      this.peekRevealed = false
      this.analysisView = null
      this.audioUrl = ''
      this.savedAttemptId = null
      this.submitKey = ''
      this.errorTitle = ''
      this.errorDesc = ''
      this.ensureRecorder()
      let lastTested = null
      try {
        const stats = await learningApi.getDashboardAiReciteStats()
        lastTested = stats?.last_location || null
      } catch {
        lastTested = null
      }
      const location = resolveDefaultLocation({
        preferred: this.preferredLocation,
        lastTested,
        stored: readStoredLastLocation(this.userId),
        progress: this.progress,
      })
      this.surah = location.surah_number
      this.ayah = location.ayah
      await this.refreshPeekTarget()
    },
    ensureRecorder() {
      if (this.recorder) return
      this.recorder = createDashboardAiReciteRecorder({
        onState: (state) => {
          this.elapsedLabel = state.elapsedLabel || '00:00'
        },
      })
    },
    async refreshPeekTarget() {
      const next = nextAyahLocation(this.surah, this.ayah)
      if (!next) {
        this.peekAyah = null
        return
      }
      try {
        this.peekAyah = await loadAyah(next.surah_number, next.ayah)
      } catch {
        this.peekAyah = next
      }
    },
    async togglePeek() {
      if (!this.peekAyah) return
      this.peekRevealed = !this.peekRevealed
      if (this.peekRevealed) {
        this.peekUsed = true
        if (this.savedAttemptId) {
          try {
            await learningApi.markAiReciteAttemptPeek(this.savedAttemptId)
          } catch {
            // Peek UI still works if the flag update fails.
          }
        }
      }
    },
    consentBlocked() {
      return isAiAudioConsentDeclined(resolveAiAudioConsentRecord({ userId: this.userId }))
    },
    async startRecording() {
      if (this.starting || this.stage === 'recording') return
      if (this.consentBlocked()) {
        this.showError(
          this.t('dashboard.ai_recite.error_title'),
          this.t('memorisation.aiCheck.consentDeclined'),
        )
        return
      }
      this.starting = true
      this.peekRevealed = false
      this.analysisView = null
      this.audioUrl = ''
      this.savedAttemptId = null
      this.submitKey = `dash-ai-${this.userId || 'user'}-${this.surah}-${this.ayah}-${Date.now()}`
      this.ensureRecorder()
      try {
        await this.recorder.start()
        this.stage = 'recording'
      } catch (error) {
        this.handleStartError(error)
      } finally {
        this.starting = false
      }
    },
    handleStartError(error) {
      const code = String(error?.code || error?.message || '')
      if (code === 'permission_denied') {
        this.showError(this.t('dashboard.ai_recite.error_title'), resolveMicDeniedGuidance(this.t.bind(this)))
        return
      }
      if (code === 'unsupported' || code === 'no_get_user_media') {
        this.showError(this.t('dashboard.ai_recite.error_title'), this.t('memorisation.aiCheck.recordingUnsupported'))
        return
      }
      this.showError(this.t('dashboard.ai_recite.error_title'), this.t('memorisation.amd.startFailed'))
    },
    async stopRecording() {
      if (this.stopping || this.stage !== 'recording') return
      this.stopping = true
      this.stage = 'processing'
      this.processingLabel = this.t('memorisation.amd.hintProcessing')
      let capture = null
      try {
        capture = await this.recorder.stop()
      } catch {
        capture = null
      }
      this.stopping = false
      if (!capture?.transcript && !(capture?.words || []).length) {
        this.showError(this.t('dashboard.ai_recite.error_title'), this.t('dashboard.ai_recite.empty_recording'))
        return
      }
      this.audioUrl = capture.objectUrl || ''
      await this.analyse(capture)
    },
    async analyse(capture) {
      this.processingLabel = this.t('memorisation.amd.hintAnalysing')
      const verse = await loadAyah(this.surah, this.ayah)
      if (!verse?.text) {
        this.showError(this.t('dashboard.ai_recite.error_title'), this.t('memorisation.amd.ayahTextUnavailable'))
        return
      }
      const ayahs = buildAssessmentAyahs([{
        number: this.ayah,
        chapterId: this.surah,
        key: `${this.surah}:${this.ayah}`,
        arabic: verse.text,
        text: verse.text,
      }])
      const recognitionWords = buildRecognitionWords(capture.words || [], { includeTiming: true })
      try {
        const data = await learningApi.createMemorisationAssessment({
          surah_number: this.surah,
          surah_name: surahName(this.surah),
          start_ayah: this.ayah,
          end_ayah: this.ayah,
          assessment_type: 'dashboard_ai_recite',
          source: 'dashboard_ai_recite',
          ayahs,
          recognition_words: recognitionWords,
          transcript: capture.transcript || '',
          duration_ms: capture.durationMs || null,
          provider: 'speechmatics',
          peek_used: this.peekUsed,
          idempotency_key: this.submitKey,
        })
        if (data?.invalid_attempt || data?.assessment?.status === 'failed') {
          this.showError(
            this.t('dashboard.ai_recite.error_title'),
            data?.retry_guidance || data?.assessment?.retry_guidance || this.t('memorisation.amd.analyseFailed'),
          )
          return
        }
        this.savedAttemptId = Number(data?.ai_attempt?.id || 0) || null
        writeStoredLastLocation(this.userId, { surah_number: this.surah, ayah: this.ayah })
        this.analysisView = buildSessionAnalysisView({
          has_analysis: true,
          assessment: data?.assessment || null,
          ai_attempt: data?.ai_attempt || null,
          audio: this.audioUrl ? { url: this.audioUrl } : null,
        }, this.t.bind(this))
        this.stage = 'result'
        this.$emit('saved', data?.ai_attempt || null)
      } catch {
        this.showError(this.t('dashboard.ai_recite.error_title'), this.t('dashboard.ai_recite.network_error'))
      }
    },
    showError(title, desc) {
      this.stage = 'error'
      this.errorTitle = title
      this.errorDesc = desc
    },
    retryFromError() {
      this.stage = 'ready'
      this.errorTitle = ''
      this.errorDesc = ''
    },
    tryAgain() {
      this.pauseAudio()
      this.analysisView = null
      this.audioUrl = ''
      this.savedAttemptId = null
      this.peekUsed = false
      this.peekRevealed = false
      this.stage = 'ready'
    },
    testAnother() {
      const next = nextAyahLocation(this.surah, this.ayah)
      if (next) {
        this.ayah = next.ayah
      }
      this.tryAgain()
    },
    async openStats() {
      this.pauseAudio()
      this.stage = 'stats'
      await this.loadStats()
    },
    backToReady() {
      this.stage = 'ready'
    },
    async loadStats() {
      const requestId = ++this.statsRequestId
      this.statsLoading = true
      this.statsError = false
      try {
        const stats = await learningApi.getDashboardAiReciteStats()
        if (requestId !== this.statsRequestId) return
        this.statsView = buildDashboardAiReciteStatsView(stats, this.t.bind(this))
      } catch {
        if (requestId !== this.statsRequestId) return
        this.statsError = true
      } finally {
        if (requestId === this.statsRequestId) this.statsLoading = false
      }
    },
    async openSavedAttempt(attemptId) {
      this.statsLoading = true
      try {
        const payload = await learningApi.getAiReciteAttemptAnalysis(attemptId)
        this.analysisView = buildSessionAnalysisView(payload, this.t.bind(this))
        this.savedAttemptId = Number(attemptId)
        this.audioUrl = payload?.audio?.url || ''
        this.surah = Number(payload?.ai_attempt?.surah_number || payload?.assessment?.surah_number || this.surah)
        this.ayah = Number(payload?.ai_attempt?.ayah_start || payload?.assessment?.start_ayah || this.ayah)
        this.peekUsed = !!payload?.ai_attempt?.peek_used
        this.peekRevealed = false
        await this.refreshPeekTarget()
        this.stage = 'result'
      } catch {
        this.statsError = true
      } finally {
        this.statsLoading = false
      }
    },
    togglePlayback() {
      const player = this.$refs.player
      if (!player) return
      if (this.audioPlaying) {
        player.pause()
        this.audioPlaying = false
        return
      }
      player.play?.().then(() => {
        this.audioPlaying = true
      }).catch(() => {
        this.audioPlaying = false
      })
    },
    restartPlayback() {
      const player = this.$refs.player
      if (!player) return
      player.currentTime = 0
      player.pause()
      this.audioPlaying = false
      this.onAudioTime()
    },
    pauseAudio() {
      const player = this.$refs.player
      try { player?.pause?.() } catch { /* ignore */ }
      this.audioPlaying = false
    },
    onAudioTime() {
      const player = this.$refs.player
      const current = Number(player?.currentTime || 0)
      const duration = Number(player?.duration || 0)
      const fmt = (value) => {
        const total = Math.max(0, Math.floor(value || 0))
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
      }
      this.audioTimeLabel = duration > 0 ? `${fmt(current)} / ${fmt(duration)}` : fmt(current)
    },
    onAudioEnded() {
      this.audioPlaying = false
    },
    onBackdrop() {
      if (this.isBusy) return
      this.requestClose()
    },
    async requestClose() {
      if (this.stage === 'recording' || this.starting) {
        this.stopping = true
        try { await this.recorder?.stop?.() } catch { /* ignore */ }
        this.stopping = false
      }
      this.$emit('close')
    },
    onOverlayKeydown(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (this.isBusy) return
      this.requestClose()
    },
    onDocumentKeydown(event) {
      if (event.key !== 'Escape' || !this.open || this.isBusy) return
      event.preventDefault()
      this.requestClose()
    },
    bindEscape() {
      if (typeof document === 'undefined' || this._escapeBound) return
      this._escapeBound = this.onDocumentKeydown.bind(this)
      document.addEventListener('keydown', this._escapeBound, true)
    },
    unbindEscape() {
      if (typeof document === 'undefined' || !this._escapeBound) return
      document.removeEventListener('keydown', this._escapeBound, true)
      this._escapeBound = null
    },
    syncBodyLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-ai-recite-open', open)
      document.body.classList.toggle('dash-ai-recite-open', open)
    },
    teardown() {
      this.pauseAudio()
      this.recorder?.dispose?.()
      this.recorder = null
    },
  },
}
</script>

<style src="./DashboardAiReciteModal.css"></style>
