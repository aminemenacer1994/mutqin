<template>
  <div v-if="visible" class="teacher-form-field teacher-form-field--full teacher-assignment-exam-panel">
    <header class="teacher-assignment-exam-panel__head">
      <h3 class="teacher-assignment-exam-panel__title">{{ t('teacher.examination_panel_title') }}</h3>
      <p class="teacher-assignment-exam-panel__summary">{{ t('teacher.examination_panel_summary') }}</p>
    </header>

    <div class="teacher-form-grid teacher-form-grid--listening teacher-assignment-exam-panel__grid">
      <section class="teacher-assignment-exam-panel__section teacher-form-field teacher-form-field--full">
        <h4 class="teacher-assignment-exam-panel__section-title">{{ t('teacher.examination_section_passage') }}</h4>
        <div class="teacher-form-grid teacher-form-grid--listening teacher-assignment-exam-panel__section-grid">
          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-exam-scope`">{{ t('teacher.examination_scope') }}</label>
            <select
              :id="`${formId}-exam-scope`"
              class="form-select"
              :value="settings.pool_type"
              :disabled="saving"
              @change="onScopeChange($event.target.value)"
            >
              <option value="custom">{{ t('teacher.examination_scope_range') }}</option>
              <option value="surah">{{ t('teacher.examination_scope_surah') }}</option>
              <option value="juz">{{ t('teacher.examination_scope_juz') }}</option>
              <option value="hizb">{{ t('teacher.examination_scope_hizb') }}</option>
            </select>
            <p class="teacher-assignment-exam-panel__hint">{{ t('teacher.examination_scope_help') }}</p>
          </div>

          <div v-if="showPoolBounds" class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-exam-pool-from`">{{ poolBoundsLabel }}</label>
            <div class="d-flex gap-2 align-items-center">
              <input
                :id="`${formId}-exam-pool-from`"
                class="form-control"
                type="number"
                :min="poolMin"
                :max="poolMax"
                inputmode="numeric"
                :value="poolFrom"
                :disabled="saving"
                :aria-label="t('teacher.from')"
                @input="patchPoolBound('from', Number($event.target.value))"
              >
              <span class="text-body-secondary small text-nowrap">{{ t('teacher.to') }}</span>
              <input
                :id="`${formId}-exam-pool-to`"
                class="form-control"
                type="number"
                :min="poolMin"
                :max="poolMax"
                inputmode="numeric"
                :value="poolTo"
                :disabled="saving"
                :aria-label="t('teacher.to')"
                @input="patchPoolBound('to', Number($event.target.value))"
              >
            </div>
            <p class="teacher-assignment-exam-panel__hint">{{ t('teacher.examination_pool_bounds_help') }}</p>
          </div>
        </div>
      </section>

      <section class="teacher-assignment-exam-panel__section teacher-form-field teacher-form-field--full">
        <h4 class="teacher-assignment-exam-panel__section-title">{{ t('teacher.examination_section_questions') }}</h4>
        <div class="teacher-form-grid teacher-form-grid--listening teacher-assignment-exam-panel__section-grid">
          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-exam-pick`">{{ t('teacher.examination_pick') }}</label>
            <select
              :id="`${formId}-exam-pick`"
              class="form-select"
              :value="settings.generation_mode"
              :disabled="saving"
              @change="patch('generation_mode', $event.target.value)"
            >
              <option value="random">{{ t('teacher.examination_pick_random') }}</option>
              <option value="weak_ayah">{{ t('teacher.examination_pick_weak') }}</option>
              <option value="manual">{{ t('teacher.examination_pick_manual') }}</option>
            </select>
            <p class="teacher-assignment-exam-panel__hint">{{ t('teacher.examination_pick_help') }}</p>
          </div>

          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-exam-count`">{{ t('teacher.examination_questions') }}</label>
            <input
              :id="`${formId}-exam-count`"
              class="form-control"
              type="number"
              min="1"
              max="30"
              inputmode="numeric"
              :value="settings.question_count"
              :disabled="saving"
              @input="patch('question_count', Number($event.target.value))"
            >
            <p class="teacher-assignment-exam-panel__hint">{{ t('teacher.examination_questions_help') }}</p>
          </div>

          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-exam-length`">{{ t('teacher.examination_ayahs_each') }}</label>
            <input
              :id="`${formId}-exam-length`"
              class="form-control"
              type="number"
              min="1"
              max="15"
              inputmode="numeric"
              :value="settings.recitation_length_ayahs"
              :disabled="saving"
              @input="patch('recitation_length_ayahs', Number($event.target.value))"
            >
            <p class="teacher-assignment-exam-panel__hint">{{ t('teacher.examination_ayahs_each_help') }}</p>
          </div>
        </div>
      </section>

      <section class="teacher-assignment-exam-panel__section teacher-form-field teacher-form-field--full">
        <h4 class="teacher-assignment-exam-panel__section-title">{{ t('teacher.examination_section_delivery') }}</h4>
        <div class="teacher-form-grid teacher-form-grid--listening teacher-assignment-exam-panel__section-grid">
          <div class="teacher-form-field teacher-form-field--half">
            <label class="form-label" :for="`${formId}-exam-when`">{{ t('teacher.examination_when') }}</label>
            <select
              :id="`${formId}-exam-when`"
              class="form-select"
              :value="settings.delivery"
              :disabled="saving"
              @change="onDeliveryChange($event.target.value)"
            >
              <option value="live">{{ t('teacher.examination_when_live') }}</option>
              <option value="async">{{ t('teacher.examination_when_recorded') }}</option>
            </select>
            <p class="teacher-assignment-exam-panel__hint">{{ deliveryHelp }}</p>
          </div>
        </div>
      </section>

      <section class="teacher-assignment-exam-panel__section teacher-form-field teacher-form-field--full">
        <h4 class="teacher-assignment-exam-panel__section-title">{{ t('teacher.examination_section_styles') }}</h4>
        <p class="teacher-assignment-exam-panel__hint teacher-assignment-exam-panel__hint--lead">{{ t('teacher.examination_ask_help') }}</p>
        <div class="teacher-assignment-exam-fields__modes">
          <div v-for="mode in modeOptions" :key="mode" class="teacher-assignment-exam-fields__mode">
            <label class="form-check mb-0" :for="`${formId}-mode-${mode}`">
              <input
                :id="`${formId}-mode-${mode}`"
                class="form-check-input"
                type="checkbox"
                :checked="settings.exam_modes.includes(mode)"
                :disabled="saving"
                @change="toggleMode(mode, $event.target.checked)"
              >
              <span class="form-check-label">{{ t(`teacher.examination_mode_${mode}`) }}</span>
            </label>
            <p class="teacher-assignment-exam-panel__hint teacher-assignment-exam-panel__hint--mode">
              {{ t(`teacher.examination_mode_${mode}_help`) }}
            </p>
          </div>
        </div>
      </section>

      <div class="teacher-form-field teacher-form-field--full teacher-assignment-exam-panel__options">
        <label class="form-check mb-0" :for="`${formId}-exam-ai`">
          <input
            :id="`${formId}-exam-ai`"
            class="form-check-input"
            type="checkbox"
            :checked="Boolean(settings.ai_wording_assessment)"
            :disabled="saving"
            @change="patch('ai_wording_assessment', $event.target.checked)"
          >
          <span class="form-check-label">{{ t('teacher.examination_ai_optional') }}</span>
        </label>
        <p class="teacher-assignment-exam-panel__hint">{{ t('teacher.examination_ai_optional_help') }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import {
  EXAMINATION_MODES,
  assignmentSupportsExamination,
  defaultExaminationSettings,
  mergeExaminationSettings,
} from '../../scripts/teacher/assignmentExaminationSettings'

export default {
  name: 'TeacherAssignmentExaminationFields',
  mixins: [i18nMixin],
  props: {
    formId: { type: String, required: true },
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
  },
  emits: ['update:form'],
  computed: {
    visible() {
      return assignmentSupportsExamination(this.form)
    },
    settings() {
      return mergeExaminationSettings(this.form)
    },
    modeOptions() {
      return EXAMINATION_MODES
    },
    showPoolBounds() {
      return ['juz', 'hizb'].includes(this.settings.pool_type)
    },
    poolMin() {
      return 1
    },
    poolMax() {
      return this.settings.pool_type === 'hizb' ? 60 : 30
    },
    poolFrom() {
      const pool = this.settings.pool || {}
      return Number(pool.from ?? 1)
    },
    poolTo() {
      const pool = this.settings.pool || {}
      const from = this.poolFrom
      return Number(pool.to ?? from)
    },
    poolBoundsLabel() {
      if (this.settings.pool_type === 'hizb') return this.t('teacher.examination_scope_hizb_range')
      return this.t('teacher.examination_scope_juz_range')
    },
    deliveryHelp() {
      return this.settings.delivery === 'async'
        ? this.t('teacher.examination_when_recorded_help')
        : this.t('teacher.examination_when_live_help')
    },
  },
  methods: {
    buildSessionPatch(examination) {
      const session = this.form.session_settings && typeof this.form.session_settings === 'object'
        ? { ...this.form.session_settings }
        : {}
      return { ...this.form, session_settings: { ...session, examination } }
    },
    patch(key, value) {
      const examination = {
        ...defaultExaminationSettings(),
        ...(this.form.session_settings?.examination || {}),
        enabled: true,
        [key]: value,
      }
      this.$emit('update:form', this.buildSessionPatch(examination))
    },
    onScopeChange(poolType) {
      const examination = {
        ...defaultExaminationSettings(),
        ...(this.form.session_settings?.examination || {}),
        enabled: true,
        pool_type: poolType,
        pool: poolType === 'juz' || poolType === 'hizb' ? { from: 1, to: 1 } : {},
      }
      this.$emit('update:form', this.buildSessionPatch(examination))
    },
    patchPoolBound(bound, value) {
      const pool = { ...(this.settings.pool || {}) }
      const safe = Number.isFinite(value) ? Math.max(this.poolMin, Math.min(this.poolMax, value)) : this.poolMin
      pool[bound] = safe
      if (bound === 'from' && Number(pool.to) < safe) pool.to = safe
      this.patch('pool', pool)
    },
    onDeliveryChange(value) {
      const examination = {
        ...defaultExaminationSettings(),
        ...(this.form.session_settings?.examination || {}),
        enabled: true,
        delivery: value,
      }
      const next = {
        ...this.buildSessionPatch(examination),
        recording_required: value === 'async',
        kind: value === 'async' ? 'ai_recite' : 'practice',
      }
      this.$emit('update:form', next)
    },
    toggleMode(mode, enabled) {
      const current = [...(this.settings.exam_modes || [])]
      let next = enabled ? [...new Set([...current, mode])] : current.filter((entry) => entry !== mode)
      if (next.length === 0) next = ['continue_recitation']
      this.patch('exam_modes', next)
    },
  },
}
</script>

<style scoped>
.teacher-assignment-exam-panel__grid {
  margin-top: 0;
}
.teacher-assignment-exam-panel__section-grid {
  margin-top: 0;
}
.teacher-assignment-exam-fields__modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
}
@media (max-width: 520px) {
  .teacher-assignment-exam-fields__modes {
    grid-template-columns: 1fr;
  }
}
</style>