<template>
  <DashModalRoot
    :open="open && Boolean(row)"
    :labelled-by="titleId"
    :root-class="playbackRootClass"
    panel-class="dash-student-dialog dash-student-dialog--wide learner-playback-shell__panel"
    test-id="learner-playback-modal"
    @close="close"
  >
    <template v-if="row">
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
          :label="t('teacher.learner_playback_reference_ayah', { n: selectedAyah })"
          :src="referenceSrc"
          :duration-ms="referenceDurationMs"
          :markers="[]"
          :playback-rate="playbackRate"
          :timeline-dir="timelineDir"
          :unavailable="!referenceSrc"
          :unavailable-label="t('teacher.learner_playback_reference_unavailable')"
          :load-when="open"
          :play-label="t('teacher.learner_playback_play')"
          :pause-label="t('teacher.learner_playback_pause')"
          :seek-aria-label="t('teacher.learner_playback_seek_reference')"
          :error-label="t('teacher.learner_playback_reference_error')"
          :retry-label="t('teacher.learner_playback_retry')"
          :loading-label="t('teacher.learner_mistake_audio_loading')"
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
          :loading-label="t('teacher.learner_mistake_audio_loading')"
          @marker-activate="onMarkerActivate"
          @ended="onStudentEnded"
        />

        <div class="learner-playback-shell__controls">
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm learner-playback-shell__speed" @click="cycleSpeed">
            {{ t('teacher.learner_playback_speed') }} <strong>{{ playbackRate }}×</strong>
          </button>
          <label class="learner-playback-shell__loop" :class="{ 'is-disabled': !hasTimedMistakes }">
            <input v-model="loopAyahEnabled" type="checkbox" :disabled="!hasTimedMistakes || !playback.recordingUrl">
            <span>{{ t('teacher.learner_playback_loop_section') }}</span>
          </label>
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" :disabled="!hasTimedMistakes || !playback.recordingUrl" @click="goPreviousMistake">
            {{ t('teacher.learner_playback_prev_mistake') }}
          </button>
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" :disabled="!hasTimedMistakes || !playback.recordingUrl" @click="goNextMistake">
            {{ t('teacher.learner_playback_next_mistake') }}
          </button>
          <button
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :disabled="!playback.recordingUrl || !referenceSrc"
            :class="{ 'is-active': compareActive }"
            :aria-pressed="compareActive"
            @click="toggleCompare"
          >
            {{ t('teacher.learner_playback_compare') }}
          </button>
        </div>
      </div>
    </template>
  </DashModalRoot>
</template>

<script>
import { i18nMixin } from '@/mixins/i18nMixin'
import DashModalRoot from '@/components/dashboard/DashModalRoot.vue'
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
  components: { DashModalRoot, LearnerAttemptPlaybackTrack },
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
      referenceDurationMs: null,
    }
  },
  computed: {
    playbackRootClass() {
      return ['dash-student-dialog-root', 'learner-playback-shell', { 'is-mobile-sheet': this.isMobile }]
    },
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
    hasTimedMistakes() {
      return this.studentMarkers.length > 0
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
      this.loopAyahEnabled = false
    },
    onOpen() {
      this.playbackRate = getRememberedPlaybackSpeed()
      this.resetSelection()
      this.compareActive = false
      this.compareStep = 'idle'
    },
    onClosed() {
      this.teardownAudio()
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
    cycleSpeed() {
      this.playbackRate = cycleRememberedPlaybackSpeed()
    },
    markerAria(mistake) {
      return this.t('teacher.learner_playback_marker_aria', {
        ayah: mistake.ayah,
        type: this.typeLabel(mistake.type),
        label: `${this.typeLabel(mistake.type)}, ayah ${mistake.ayah}`,
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
    async toggleCompare() {
      this.compareActive = !this.compareActive
      if (!this.compareActive) {
        this.compareStep = 'idle'
        this.$refs.referenceTrack?.pauseExternal?.()
        this.$refs.studentTrack?.pauseExternal?.()
        return
      }
      this.compareStep = 'reference'
      this.$refs.studentTrack?.pauseExternal?.()
      const started = await this.$refs.referenceTrack?.playFrom(0)
      if (!started) {
        this.compareActive = false
        this.compareStep = 'idle'
      }
    },
    async onReferenceEnded() {
      if (!this.compareActive) return
      this.compareStep = 'student'
      const bounds = this.loopBounds
      const started = await this.$refs.studentTrack?.playFrom((bounds.startMs || 0) / 1000)
      if (!started) {
        this.compareActive = false
        this.compareStep = 'idle'
      }
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

<style scoped>
.learner-playback-shell__panel.dash-student-dialog {
  width: min(100%, 36rem);
  max-height: min(90dvh, 44rem);
}

.learner-playback-shell__body {
  display: grid;
  gap: 1rem;
}

.learner-playback-shell__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.learner-playback-shell__loop {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.875rem;
}

.learner-playback-shell__loop.is-disabled {
  opacity: 0.55;
}

.learner-playback-shell__speed strong {
  font-variant-numeric: tabular-nums;
}
</style>