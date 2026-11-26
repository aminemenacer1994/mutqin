<template>
  <details
    v-if="visible"
    class="teacher-form-field teacher-form-field--full teacher-assignment-hiding"
    :open="Boolean(settings.enabled)"
  >
    <summary class="teacher-assignment-hiding__summary">
      <span class="teacher-assignment-hiding__title">{{ t('teacher.assignment_progressive_hiding') }}</span>
      <span class="text-body-secondary small">{{ t('teacher.optional_short') }}</span>
    </summary>
    <div class="teacher-assignment-hiding__body">
      <label class="form-check mb-3" :for="`${formId}-hiding-enable`">
        <input
          :id="`${formId}-hiding-enable`"
          class="form-check-input"
          type="checkbox"
          :checked="Boolean(settings.enabled)"
          :disabled="saving"
          @change="onEnabledToggle($event.target.checked)"
        >
        <span class="form-check-label">{{ t('teacher.assignment_progressive_hiding_enable') }}</span>
      </label>

      <template v-if="settings.enabled">
        <p v-if="compatibilityError" class="text-danger small" role="alert">{{ compatibilityError }}</p>
        <div class="teacher-form-grid teacher-form-grid--listening teacher-assignment-hiding__grid">
          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-blur-intensity`">{{ t('memorisation.blur_intensity') }}</label>
            <input
              :id="`${formId}-blur-intensity`"
              class="form-control"
              type="number"
              min="4"
              max="18"
              :value="settings.blur_intensity"
              :disabled="saving"
              @input="patchHiding('blur_intensity', Number($event.target.value))"
            >
          </div>
          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-stage-reps`">{{ t('teacher.assignment_hiding_stage_repetitions') }}</label>
            <input
              :id="`${formId}-stage-reps`"
              class="form-control"
              type="number"
              min="1"
              max="8"
              inputmode="numeric"
              :value="settings.stage_repetitions"
              :disabled="saving"
              :title="t('teacher.assignment_hiding_stage_repetitions_help')"
              :aria-describedby="`${formId}-stage-reps-help`"
              @input="patchHiding('stage_repetitions', Number($event.target.value))"
            >
            <span :id="`${formId}-stage-reps-help`" class="visually-hidden">{{ t('teacher.assignment_hiding_stage_repetitions_help') }}</span>
          </div>
          <div class="teacher-form-field teacher-form-field--full">
            <label class="form-label" :for="`${formId}-visibility`">{{ t('teacher.assignment_hiding_start_visibility') }}</label>
            <select
              :id="`${formId}-visibility`"
              class="form-select"
              :value="settings.starting_visibility_percent"
              :disabled="saving"
              @change="patchHiding('starting_visibility_percent', Number($event.target.value))"
            >
              <option v-for="pct in visibilityOptions" :key="pct" :value="pct">
                {{ t('teacher.assignment_hiding_visibility_option', { n: pct }) }}
              </option>
            </select>
          </div>
        </div>
        <div class="teacher-assignment-hiding__options">
          <label class="form-check" :for="`${formId}-hints`">
            <input
              :id="`${formId}-hints`"
              class="form-check-input"
              type="checkbox"
              :checked="Boolean(settings.hints_allowed)"
              :disabled="saving"
              @change="patchHiding('hints_allowed', $event.target.checked)"
            >
            <span class="form-check-label">{{ t('teacher.assignment_hiding_hints_allowed') }}</span>
          </label>
          <label class="form-check" :for="`${formId}-final-hide`">
            <input
              :id="`${formId}-final-hide`"
              class="form-check-input"
              type="checkbox"
              :checked="Boolean(settings.final_hidden_recitation)"
              :disabled="saving"
              @change="patchHiding('final_hidden_recitation', $event.target.checked)"
            >
            <span class="form-check-label">{{ t('teacher.assignment_hiding_final_hidden') }}</span>
          </label>
          <label class="form-check" :for="`${formId}-final-ai`">
            <input
              :id="`${formId}-final-ai`"
              class="form-check-input"
              type="checkbox"
              :checked="Boolean(settings.final_ai_assessment)"
              :disabled="saving"
              @change="patchHiding('final_ai_assessment', $event.target.checked)"
            >
            <span class="form-check-label">{{ t('teacher.assignment_hiding_final_ai') }}</span>
          </label>
        </div>
        <div v-if="previewHref" class="teacher-assignment-hiding__preview">
          <a
            class="btn btn-sm btn-outline-secondary"
            :href="previewHref"
            target="_blank"
            rel="noopener noreferrer"
            :title="t('teacher.assignment_hiding_preview_hint')"
          >
            <i class="bi bi-eye" aria-hidden="true"></i>
            {{ t('teacher.assignment_hiding_preview') }}
          </a>
        </div>
      </template>
    </div>
  </details>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { defaultAssignmentSessionSettings } from '../../scripts/teacher/assignmentListeningSettings'
import {
  PROGRESSIVE_HIDING_VISIBILITY_OPTIONS,
  assignmentSupportsProgressiveHiding,
  buildTeacherHidingPreviewHref,
  defaultProgressiveHidingSettings,
  validateProgressiveHidingCompatibility,
} from '../../scripts/teacher/assignmentProgressiveHidingSettings'

export default {
  name: 'TeacherAssignmentProgressiveHidingFields',
  mixins: [i18nMixin],
  props: {
    formId: { type: String, required: true },
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    memorisationUrl: { type: String, default: '/memorisation' },
  },
  emits: ['update:form'],
  computed: {
    visible() {
      return assignmentSupportsProgressiveHiding(this.form)
    },
    sessionSettings() {
      const defaults = defaultAssignmentSessionSettings()
      const raw = this.form.session_settings
      if (!raw || typeof raw !== 'object') return defaults
      return { ...defaults, ...raw }
    },
    settings() {
      const raw = this.sessionSettings.progressive_hiding
      return { ...defaultProgressiveHidingSettings(), ...(raw || {}) }
    },
    visibilityOptions() {
      return PROGRESSIVE_HIDING_VISIBILITY_OPTIONS
    },
    compatibilityError() {
      const check = validateProgressiveHidingCompatibility(this.sessionSettings)
      if (check.ok) return ''
      return this.t(check.messageKey || 'teacher.assignment_hiding_incompatible')
    },
    previewHref() {
      if (!this.settings.enabled || this.compatibilityError) return null
      return buildTeacherHidingPreviewHref(this.memorisationUrl, this.form, this.settings)
    },
  },
  methods: {
    patchHiding(key, value) {
      const hiding = { ...this.settings, [key]: value }
      if (key === 'enabled' || hiding.enabled) {
        hiding.enabled = key === 'enabled' ? Boolean(value) : Boolean(hiding.enabled)
      }
      const nextSession = { ...this.sessionSettings, progressive_hiding: hiding }
      const merged = validateProgressiveHidingCompatibility(nextSession)
      const session_settings = merged.ok ? merged.session_settings : nextSession
      this.$emit('update:form', { ...this.form, session_settings })
    },
    onEnabledToggle(enabled) {
      const hiding = { ...this.settings, enabled }
      const nextSession = { ...this.sessionSettings, progressive_hiding: hiding }
      if (enabled) {
        nextSession.technique = 'blur'
      }
      const merged = validateProgressiveHidingCompatibility(nextSession)
      this.$emit('update:form', {
        ...this.form,
        session_settings: merged.ok ? merged.session_settings : nextSession,
      })
    },
  },
}
</script>