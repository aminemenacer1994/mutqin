<template>
  <div v-if="visible" class="teacher-form-field teacher-form-field--full teacher-assignment-listening">
    <div class="teacher-assignment-listening__reciter">
      <label class="form-label" :for="`${formId}-reciter`">
        {{ t('teacher.assignment_recommended_reciter') }}
        <span class="text-body-secondary fw-normal">{{ t('teacher.optional_short') }}</span>
      </label>
      <select
        :id="`${formId}-reciter`"
        class="form-select"
        :value="settings.reciter || ''"
        :disabled="saving"
        @change="patch('reciter', $event.target.value)"
      >
        <option value="">{{ t('teacher.assignment_reciter_none') }}</option>
        <optgroup v-if="suggestedReciters.length" :label="t('teacher.assignment_reciter_suggested')">
          <option v-for="row in suggestedReciters" :key="row.id" :value="row.id">{{ row.name }}</option>
        </optgroup>
        <optgroup :label="t('teacher.assignment_reciter_all')">
          <option v-for="row in otherReciters" :key="row.id" :value="row.id">{{ row.name }}</option>
        </optgroup>
      </select>
      <p v-if="selectedReciterHint" class="teacher-assignment-listening__hint small text-body-secondary mb-0 mt-1">
        {{ selectedReciterHint }}
      </p>
      <div v-if="settings.reciter" class="teacher-assignment-listening__preview">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="!previewUrl || previewPlaying"
          :aria-label="t('teacher.assignment_reciter_preview')"
          @click="togglePreview"
        >
          <i class="bi" :class="previewPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
          {{ previewPlaying ? t('teacher.assignment_reciter_preview_pause') : t('teacher.assignment_reciter_preview') }}
        </button>
        <p v-if="previewError" class="text-danger small mb-0 mt-1" role="alert">{{ previewError }}</p>
      </div>
    </div>

    <details class="teacher-assignment-listening__prefs">
      <summary class="teacher-assignment-listening__prefs-summary">
        {{ t('teacher.assignment_listening_preferences') }}
      </summary>
      <div class="teacher-form-grid teacher-form-grid--listening">
        <div class="teacher-form-field teacher-form-field--half">
          <label class="form-label" :for="`${formId}-speed`">{{ t('teacher.playback_speed') }}</label>
          <select
            :id="`${formId}-speed`"
            class="form-select"
            :value="settings.speed === '' ? '' : settings.speed"
            :disabled="saving"
            @change="patch('speed', $event.target.value === '' ? '' : Number($event.target.value))"
          >
            <option value="">{{ t('teacher.assignment_listening_default') }}</option>
            <option v-for="speed in speedOptions" :key="speed" :value="speed">{{ speed }}×</option>
          </select>
        </div>
        <div class="teacher-form-field teacher-form-field--half">
          <label class="form-label" :for="`${formId}-reps`">{{ t('teacher.assignment_session_repetitions') }}</label>
          <input
            :id="`${formId}-reps`"
            class="form-control"
            type="number"
            min="1"
            max="8"
            inputmode="numeric"
            :value="settings.repetitions"
            :placeholder="t('teacher.assignment_listening_default')"
            :disabled="saving"
            @input="patch('repetitions', $event.target.value === '' ? '' : Number($event.target.value))"
          >
          <p class="small text-body-secondary mb-0 mt-1">{{ t('teacher.assignment_session_repetitions_help') }}</p>
        </div>
        <div class="teacher-form-field teacher-form-field--full">
          <label class="form-check" :for="`${formId}-repeat-ayah`">
            <input
              :id="`${formId}-repeat-ayah`"
              class="form-check-input"
              type="checkbox"
              :checked="Boolean(settings.repetitions_per_ayah_enabled)"
              :disabled="saving || !canRepeatByAyah"
              @change="onRepeatByAyahToggle($event.target.checked)"
            >
            <span class="form-check-label">{{ t('teacher.assignment_repeat_by_ayah') }}</span>
          </label>
        </div>
      </div>
    </details>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { SPEED_OPTIONS } from '../../scripts/settings/workspacePreferences'
import {
  assignmentSupportsRecommendedReciter,
  buildAyahPreviewAudioUrl,
  buildRepeatAyahMap,
  defaultAssignmentSessionSettings,
  teacherMemorisationReciterOptions,
} from '../../scripts/teacher/assignmentListeningSettings'

export default {
  name: 'TeacherAssignmentListeningFields',
  mixins: [i18nMixin],
  props: {
    formId: { type: String, required: true },
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
  },
  emits: ['update:form'],
  data() {
    return {
      previewPlaying: false,
      previewError: '',
      previewAudio: null,
    }
  },
  computed: {
    visible() {
      return assignmentSupportsRecommendedReciter(this.form)
    },
    settings() {
      const defaults = defaultAssignmentSessionSettings()
      const raw = this.form.session_settings
      if (!raw || typeof raw !== 'object') return defaults
      return { ...defaults, ...raw }
    },
    reciterRows() {
      return teacherMemorisationReciterOptions()
    },
    suggestedReciters() {
      return this.reciterRows.filter((row) => row.memorisationPick)
    },
    otherReciters() {
      return this.reciterRows.filter((row) => !row.memorisationPick)
    },
    speedOptions() {
      return SPEED_OPTIONS
    },
    selectedReciterRow() {
      return this.reciterRows.find((row) => row.id === this.settings.reciter) || null
    },
    selectedReciterHint() {
      if (!this.selectedReciterRow) return ''
      return this.t(this.selectedReciterRow.hintKey)
    },
    previewUrl() {
      return buildAyahPreviewAudioUrl(
        this.settings.reciter,
        this.form.surah_number,
        this.form.ayah_start,
      )
    },
    canRepeatByAyah() {
      const reps = Number(this.settings.repetitions)
      const start = Number(this.form.ayah_start)
      const end = Number(this.form.ayah_end)
      return Number.isFinite(reps) && reps > 0 && Number.isFinite(start) && Number.isFinite(end) && end >= start
    },
  },
  beforeUnmount() {
    this.stopPreview()
  },
  watch: {
    'settings.reciter'() {
      this.previewError = ''
      this.stopPreview()
    },
    'form.surah_number'() {
      this.stopPreview()
    },
    'form.ayah_start'() {
      this.stopPreview()
    },
    'form.ayah_end'() {
      if (this.settings.repetitions_per_ayah_enabled) {
        this.onRepeatByAyahToggle(true)
      }
    },
    'settings.repetitions'() {
      if (this.settings.repetitions_per_ayah_enabled) {
        this.onRepeatByAyahToggle(true)
      }
    },
  },
  methods: {
    patch(key, value) {
      const next = { ...this.settings, [key]: value }
      this.$emit('update:form', { ...this.form, session_settings: next })
    },
    onRepeatByAyahToggle(enabled) {
      const repetitions = Number(this.settings.repetitions)
      const perAyah = enabled && this.canRepeatByAyah
        ? buildRepeatAyahMap(this.form.surah_number, this.form.ayah_start, this.form.ayah_end, repetitions)
        : {}
      const next = {
        ...this.settings,
        repetitions_per_ayah_enabled: enabled,
        repetitions_per_ayah: perAyah,
        technique: 'talqin',
      }
      this.$emit('update:form', { ...this.form, session_settings: next })
    },
    stopPreview() {
      if (this.previewAudio) {
        this.previewAudio.pause()
        this.previewAudio = null
      }
      this.previewPlaying = false
    },
    togglePreview() {
      if (this.previewPlaying) {
        this.stopPreview()
        return
      }
      const url = this.previewUrl
      if (!url) {
        this.previewError = this.t('teacher.assignment_reciter_preview_unavailable')
        return
      }
      this.previewError = ''
      const audio = new Audio(url)
      this.previewAudio = audio
      audio.addEventListener('ended', () => {
        this.stopPreview()
      })
      audio.addEventListener('error', () => {
        this.previewError = this.t('teacher.assignment_reciter_preview_unavailable')
        this.stopPreview()
      })
      audio.play()
        .then(() => {
          this.previewPlaying = true
        })
        .catch(() => {
          this.previewError = this.t('teacher.assignment_reciter_preview_unavailable')
          this.stopPreview()
        })
    },
  },
}
</script>