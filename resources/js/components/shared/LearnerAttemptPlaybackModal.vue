<template>
  <Teleport to="body">
    <div
      v-if="open && row"
      class="dash-student-dialog-root user-dashboard learner-playback-shell"
      :class="{ 'is-mobile-sheet': isMobile }"
      @keydown="onKeydown"
    >
      <button
        type="button"
        class="dash-drawer__backdrop learner-playback-shell__scrim dash-modal__backdrop"
        :aria-label="t('dashboard.drawer_close')"
        @click="close"
      ></button>
      <section
        ref="panel"
        class="dash-student-dialog dash-student-dialog--wide learner-playback-shell__panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <header class="dash-drawer__head learner-playback-shell__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true"><i class="bi bi-headphones"></i></span>
            <div class="dash-drawer__head-copy">
              <h2 :id="titleId" class="dash-drawer__title learner-playback-shell__title">{{ t('teacher.learner_playback_title') }}</h2>
              <p class="dash-drawer__subtitle learner-playback-shell__subtitle">{{ subtitle }}</p>
            </div>
          </div>
          <button
            ref="closeBtn"
            type="button"
            class="dash-icon-btn dash-drawer__close learner-playback-shell__close"
            :aria-label="t('dashboard.drawer_close')"
            @click="close"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="dash-student-dialog__body learner-playback-shell__body">
          <LearnerAttemptPlaybackTrack
            ref="referenceTrack"
            track-id="reference"
            :label="t('teacher.learner_playback_reference')"
            :src="referenceSrc"
            :duration-ms="referenceDurationMs"
            :markers="[]"
            :playback-rate="playbackRate"
            :timeline-dir="timelineDir"
            :load-when="open"
            :play-label="t('teacher.learner_playback_play')"
            :pause-label="t('teacher.learner_playback_pause')"
            :seek-aria-label="t('teacher.learner_playback_seek_reference')"
            :error-label="t('teacher.learner_playback_reference_error')"
            :retry-label="t('teacher.learner_playback_retry')"
            @ended="onReferenceEnded"
          />

          <LearnerAttemptPlaybackTrack
            ref="studentTrack"
            track-id="student"
            :label="t('teacher.learner_playback_yours')"
            :src="playback.recordingUrl || ''"
            :duration-ms="studentDurationMs"
            :markers="studentMarkers"
            :playback-rate="playbackRate"
            :loop-start-sec="loopStartSec"
            :loop-end-sec="loopEndSec"
            :timeline-dir="timelineDir"
            :unavailable="!playback.recordingUrl"
            :unavailable-label="t('teacher.learner_playback_recording_unavailable')"
            :load-when="open"
            :play-label="t('teacher.learner_playback_play')"
            :pause-label="t('teacher.learner_playback_pause')"
            :seek-aria-label="t('teacher.learner_playback_seek_yours')"
            :error-label="t('teacher.learner_playback_recording_error')"
            :retry-label="t('teacher.learner_playback_retry')"
            @marker-activate="onMarkerActivate"
            @ended="onStudentEnded"
          />

          <div class="learner-playback-shell__controls">
            <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="cycleSpeed">
              {{ t('teacher.learner_playback_speed', { rate: playbackRate }) }}
            </button>
            <label class="learner-playback-shell__loop">
              <input v-model="loopAyahEnabled" type="checkbox">
              <span>{{ t('teacher.learner_playback_loop_ayah', { n: selectedAyah }) }}</span>
            </label>
            <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="goPreviousMistake">
              {{ t('teacher.learner_playback_prev_mistake') }}
            </button>
            <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="goNextMistake">
              {{ t('teacher.learner_playback_next_mistake') }}
            </button>
            <button
              type="button"
              class="dash-btn dash-btn--ghost dash-btn--sm"
              :disabled="!playback.recordingUrl"
              :class="{ 'is-active': compareActive }"
              @click="toggleCompare"
            >
              {{ t('teacher.learner_playback_compare') }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { i18nMixin } from '@/mixins/i18nMixin'
import {
  captureReturnFocus,
  focusInitialElement,
  handleModalKeydown,
  restoreReturnFocus,
} from '@/utils/modalFocus.js'
import { stopAllTrackPlayback } from '@/scripts/audio/attemptTrackCoordinator.js'
import {
  cycleRememberedPlaybackSpeed,
  getRememberedPlaybackSpeed,
} from '@/scripts/audio/attemptPlaybackSpeed.js'
import {
  buildTimelineMarkers,
  loopBoundsForAyah,
  nextMistakeIndex,
  previousMistakeIndex,
  referenceUrlForSelectedAyah,
  resolvePlaybackAttempt,
} from '@/scripts/teacher/learnerAttemptPlayback.js'
import LearnerAttemptPlaybackTrack from '@/components/shared/LearnerAttemptPlaybackTrack.vue'

export default {
  name: 'LearnerAttemptPlaybackModal',
  components: { LearnerAttemptPlaybackTrack },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    row: { type: Object, default: null },
    isMobile: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    return {
      titleId: `learner-playback-${Math.random().toString(36).slice(2, 9)}`,
      playbackRate: getRememberedPlaybackSpeed(),
      selectedAyah: 1,
      selectedMistakeIndex: null,
      loopAyahEnabled: false,
      compareActive: false,
      compareStep: 'idle',
      returnFocus: null,
      referenceDurationMs: null,
    }
  },
  computed: {
    playback() {
      return resolvePlaybackAttempt(this.row)
    },
    subtitle() {
      const a = this.row?.assignment
      if (!a?.surah_name) return ''
      return `${a.surah_name} · ${a.ayah_start}–${a.ayah_end}`
    },
    timelineDir() {
      const locale = this.$i18n?.locale?.value || 'en'
      return String(locale).startsWith('ar') ? 'rtl' : 'ltr'
    },
    studentDurationMs() {
      return this.playback.durationMs || null
    },
    referenceSrc() {
      return referenceUrlForSelectedAyah(this.playback, this.selectedAyah) || ''
    },
    loopBounds() {
      return loopBoundsForAyah(this.playback.mistakes, this.selectedAyah, this.studentDurationMs || 0)
    },
    loopStartSec() {
      if (!this.loopAyahEnabled) return null
      return (this.loopBounds.startMs || 0) / 1000
    },
    loopEndSec() {
      if (!this.loopAyahEnabled || this.loopBounds.endMs === null) return null
      return this.loopBounds.endMs / 1000
    },
    studentMarkers() {
      const duration = this.studentDurationMs || 1
      return buildTimelineMarkers(this.playback.mistakes, duration).map((item) => ({
        ...item,
        ariaLabel: this.markerAria(item.mistake),
        text: this.markerTooltip(item.mistake),
      }))
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.onOpen()
      } else {
        this.onClosed()
      }
    },
    row() {
      this.resetSelection()
    },
  },
  beforeUnmount() {
    this.teardownAudio()
  },
  methods: {
    resetSelection() {
      const first = this.playback.mistakes[0]
      this.selectedAyah = Number(first?.ayah) || Number(this.row?.assignment?.ayah_start) || 1
      this.selectedMistakeIndex = first ? 0 : null
    },
    onOpen() {
      this.playbackRate = getRememberedPlaybackSpeed()
      this.resetSelection()
      this.compareActive = false
      this.compareStep = 'idle'
      this.returnFocus = captureReturnFocus(this.$refs.panel)
      this.lockScroll(true)
      this.$nextTick(() => focusInitialElement(this.$refs.panel, '.learner-playback-shell__title'))
    },
    onClosed() {
      this.teardownAudio()
      this.lockScroll(false)
      restoreReturnFocus(this.returnFocus)
      this.returnFocus = null
    },
    teardownAudio() {
      stopAllTrackPlayback()
      this.$refs.referenceTrack?.pauseExternal?.()
      this.$refs.studentTrack?.pauseExternal?.()
      this.compareStep = 'idle'
    },
    close() {
      this.$emit('close')
    },
    lockScroll(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', open)
      document.body.classList.toggle('dash-drawer-open', open)
    },
    onKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.panel,
        open: this.open,
        onEscape: this.close,
      })
    },
    cycleSpeed() {
      this.playbackRate = cycleRememberedPlaybackSpeed()
    },
    markerAria(mistake) {
      return this.t('teacher.learner_playback_marker_aria', {
        ayah: mistake.ayah,
        type: this.typeLabel(mistake.type),
      })
    },
    markerTooltip(mistake) {
      const expected = String(mistake.expected || '').trim()
      const heard = String(mistake.heard || '').trim()
      if (expected && heard) {
        return this.t('teacher.learner_mistake_expected_heard', { expected, heard })
      }
      return this.typeLabel(mistake.type)
    },
    typeLabel(type) {
      if (type === 'missed') return this.t('teacher.learner_mistake_type_missed')
      if (type === 'tajweed') return this.t('teacher.learner_mistake_type_tajweed')
      return this.t('teacher.learner_mistake_type_wrong')
    },
    goNextMistake() {
      const next = nextMistakeIndex(this.playback.mistakes, this.selectedMistakeIndex)
      if (next === null) return
      this.focusMistake(next)
    },
    goPreviousMistake() {
      const prev = previousMistakeIndex(this.playback.mistakes, this.selectedMistakeIndex)
      if (prev === null) return
      this.focusMistake(prev)
    },
    focusMistake(index) {
      this.selectedMistakeIndex = index
      const mistake = this.playback.mistakes[index]
      if (!mistake) return
      this.selectedAyah = Number(mistake.ayah) || this.selectedAyah
      const startMs = Number(mistake.start_ms ?? mistake.startMs)
      const seek = Number.isFinite(startMs) ? startMs / 1000 : 0
      this.$refs.studentTrack?.playFrom(seek)
    },
    onMarkerActivate(marker) {
      this.focusMistake(marker.index)
    },
    toggleCompare() {
      this.compareActive = !this.compareActive
      if (!this.compareActive) {
        this.compareStep = 'idle'
        this.$refs.referenceTrack?.pauseExternal?.()
        this.$refs.studentTrack?.pauseExternal?.()
        return
      }
      this.compareStep = 'reference'
      this.$refs.studentTrack?.pauseExternal?.()
      this.$refs.referenceTrack?.playFrom(0)
    },
    onReferenceEnded() {
      if (!this.compareActive) return
      this.compareStep = 'student'
      const bounds = this.loopBounds
      this.$refs.studentTrack?.playFrom((bounds.startMs || 0) / 1000)
    },
    onStudentEnded() {
      if (this.compareActive) {
        this.compareStep = 'idle'
        this.compareActive = false
      }
    },
  },
}
</script>
