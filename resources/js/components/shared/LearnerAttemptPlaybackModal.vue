<template>
  <DashModalRoot workspace
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
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" :disabled="!hasFeedbackSegments || !playback.recordingUrl" @click="goPreviousFeedback">
            {{ t('teacher.learner_playback_prev_feedback') }}
          </button>
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" :disabled="!hasFeedbackSegments || !playback.recordingUrl" @click="goNextFeedback">
            {{ t('teacher.learner_playback_next_feedback') }}
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

        <section
          v-if="playback.feedbackSegments.length"
          class="learner-playback-shell__segments"
          :aria-label="t('teacher.learner_segment_feedback_title')"
        >
          <h3 class="learner-playback-shell__segments-title">{{ t('teacher.learner_segment_feedback_title') }}</h3>
          <ul class="learner-playback-shell__segments-list">
            <li v-for="(segment, index) in playback.feedbackSegments" :key="segment.id || index">
              <button
                type="button"
                class="dash-text-link learner-playback-shell__segment-btn"
                :class="{ 'is-active': selectedFeedbackIndex === index }"
                :disabled="!playback.recordingUrl"
                @click="focusFeedbackSegment(segment, index)"
              >
                <span class="learner-playback-shell__segment-range">{{ formatSegmentRange(segment) }}</span>
                <span v-if="segmentLabel(segment)" class="learner-playback-shell__segment-body">{{ segmentLabel(segment) }}</span>
              </button>
            </li>
          </ul>
        </section>

        <audio ref="teacherFeedbackAudio" preload="none" class="visually-hidden" aria-hidden="true"></audio>
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
  buildFeedbackSegmentMarkers,
  buildTimelineMarkers,
  loopBoundsForAyah,
  nextFeedbackSegmentIndex,
  nextMistakeIndex,
  previousFeedbackSegmentIndex,
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
      selectedFeedbackIndex: null,
      feedbackLoopStartSec: null,
      feedbackLoopEndSec: null,
    }
  },
  computed: {
    playbackRootClass() {
      return ['teacher-dialog', 'dash-student-dialog-root', 'learner-playback-shell', { 'is-mobile-sheet': this.isMobile }]
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
      if (this.feedbackLoopStartSec !== null) return this.feedbackLoopStartSec
      if (!this.loopAyahEnabled) return null
      return (this.loopBounds.startMs || 0) / 1000
    },
    loopEndSec() {
      if (this.feedbackLoopEndSec !== null) return this.feedbackLoopEndSec
      if (!this.loopAyahEnabled || this.loopBounds.endMs === null) return null
      return this.loopBounds.endMs / 1000
    },
    studentMarkers() {
      const duration = this.studentDurationMs || 1
      const mistakes = buildTimelineMarkers(this.playback.mistakes, duration).map((item) => ({
        ...item,
        ariaLabel: this.markerAria(item.mistake),
        text: this.markerTooltip(item.mistake),
      }))
      const feedback = buildFeedbackSegmentMarkers(this.playback.feedbackSegments, duration).map((item) => ({
        ...item,
        ariaLabel: this.feedbackMarkerAria(item.segment),
        text: this.segmentLabel(item.segment),
      }))
      return mistakes.concat(feedback).sort((a, b) => (a.anchorMs ?? 0) - (b.anchorMs ?? 0))
    },
    hasTimedMistakes() {
      return buildTimelineMarkers(this.playback.mistakes, this.studentDurationMs || 1).length > 0
    },
    hasFeedbackSegments() {
      return buildFeedbackSegmentMarkers(this.playback.feedbackSegments, this.studentDurationMs || 1).length > 0
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
      this.clearFeedbackLoop()
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
      this.stopTeacherFeedbackAudio()
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
      this.clearFeedbackLoop()
      this.selectedMistakeIndex = index
      const mistake = this.playback.mistakes[index]
      if (!mistake) return
      this.selectedAyah = Number(mistake.ayah) || this.selectedAyah
      const startMs = Number(mistake.start_ms ?? mistake.startMs)
      const seek = Number.isFinite(startMs) ? startMs / 1000 : 0
      this.$refs.studentTrack?.playFrom(seek)
    },
    clearFeedbackLoop() {
      this.selectedFeedbackIndex = null
      this.feedbackLoopStartSec = null
      this.feedbackLoopEndSec = null
      this.stopTeacherFeedbackAudio()
    },
    segmentBoundsSec(segment) {
      const startMs = Number(segment?.start_ms ?? segment?.startMs)
      const endMs = Number(segment?.end_ms ?? segment?.endMs)
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null
      }
      return { start: startMs / 1000, end: endMs / 1000 }
    },
    segmentLabel(segment) {
      return String(segment?.body || '').trim()
    },
    formatSegmentRange(segment) {
      const bounds = this.segmentBoundsSec(segment)
      if (!bounds) return ''
      const fmt = (seconds) => {
        const total = Math.max(0, Math.floor(seconds))
        return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
      }
      return `${fmt(bounds.start)} – ${fmt(bounds.end)}`
    },
    feedbackMarkerAria(segment) {
      const range = this.formatSegmentRange(segment)
      const note = this.segmentLabel(segment)
      return this.t('teacher.learner_playback_marker_feedback_aria', {
        range,
        note: note || this.t('teacher.learner_segment_feedback_title'),
      })
    },
    async focusFeedbackSegment(segment, index = null) {
      const bounds = this.segmentBoundsSec(segment)
      if (!bounds) return
      this.loopAyahEnabled = false
      this.selectedMistakeIndex = null
      this.selectedFeedbackIndex = index ?? this.playback.feedbackSegments.findIndex((row) => row?.id === segment?.id)
      this.feedbackLoopStartSec = bounds.start
      this.feedbackLoopEndSec = bounds.end
      await this.$refs.studentTrack?.playFrom(bounds.start)
      await this.playTeacherFeedbackAudio(segment)
    },
    async playTeacherFeedbackAudio(segment) {
      const url = String(segment?.audio?.url || '').trim()
      const el = this.$refs.teacherFeedbackAudio
      if (!url || !el) return
      this.stopTeacherFeedbackAudio()
      try {
        el.src = url
        el.playbackRate = Number(this.playbackRate) || 1
        await el.play()
      } catch {
        /* ignore playback errors */
      }
    },
    stopTeacherFeedbackAudio() {
      const el = this.$refs.teacherFeedbackAudio
      if (!el) return
      if (!el.paused) {
        try { el.pause() } catch { /* ignore */ }
      }
      el.removeAttribute('src')
      try { el.load() } catch { /* ignore */ }
    },
    goNextFeedback() {
      const next = nextFeedbackSegmentIndex(
        this.playback.feedbackSegments,
        this.selectedFeedbackIndex,
        this.studentDurationMs || 1,
      )
      if (next === null) return
      const segment = this.playback.feedbackSegments[next]
      if (segment) this.focusFeedbackSegment(segment, next)
    },
    goPreviousFeedback() {
      const prev = previousFeedbackSegmentIndex(
        this.playback.feedbackSegments,
        this.selectedFeedbackIndex,
        this.studentDurationMs || 1,
      )
      if (prev === null) return
      const segment = this.playback.feedbackSegments[prev]
      if (segment) this.focusFeedbackSegment(segment, prev)
    },
    onMarkerActivate(marker) {
      if (marker.markerKind === 'feedback' && marker.segment) {
        this.focusFeedbackSegment(marker.segment, marker.segmentIndex)
        return
      }
      if (marker.markerKind === 'mistake') {
        this.focusMistake(marker.index)
      }
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

.learner-playback-shell__segments-title {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.learner-playback-shell__segments-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
}

.learner-playback-shell__segment-btn {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  align-items: baseline;
  text-align: start;
  width: 100%;
}

.learner-playback-shell__segment-btn.is-active {
  font-weight: 600;
}

.learner-playback-shell__segment-range {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.learner-playback-shell__segment-body {
  color: var(--dash-text-muted, #5c6570);
}
</style>