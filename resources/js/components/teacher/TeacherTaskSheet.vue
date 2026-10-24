<template>
  <Teleport to="body">
    <template v-if="open">
      <div class="modal-backdrop fade show teacher-task-backdrop" @click="$emit('close')"></div>
      <div
        ref="dialogRoot"
        class="modal fade show d-block teacher-task-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable teacher-task-modal__dialog">
          <div class="modal-content teacher-task-modal__content">
            <div class="modal-header teacher-task-modal__header">
              <div class="teacher-task-modal__intro">
                <span class="teacher-task-modal__eyebrow">
                  <i :class="editing ? 'bi bi-pencil-square' : 'bi bi-stars'" aria-hidden="true"></i>
                  {{ editing ? t('teacher.task_edit') : t('teacher.assign_form_title') }}
                </span>
                <h2 :id="titleId" class="modal-title h5 teacher-task-modal__title">{{ editing ? t('teacher.task_edit') : t('teacher.assign_form_title') }}</h2>
                <p>{{ editing ? t('teacher.task_edit_hint') : t('teacher.assign_form_lead') }}</p>
              </div>
              <button type="button" class="btn-close teacher-task-modal__close" :aria-label="t('teacher.close')" @click="$emit('close')"></button>
            </div>

            <form :id="formId" class="modal-body teacher-task-modal__body" @submit.prevent="submit">
              <p v-if="error" class="alert alert-danger teacher-task-modal__alert" role="alert">{{ error }}</p>
              <div class="teacher-task-modal__layout">
                <div class="teacher-task-modal__fields">
                  <section class="teacher-task-modal__block" :aria-labelledby="`${formId}-student-heading`">
                    <div class="teacher-task-modal__section-heading">
                      <span class="teacher-task-modal__step" aria-hidden="true">1</span>
                      <div><h3 :id="`${formId}-student-heading`">{{ t('teacher.assign_section_student') }}</h3><p>{{ t('teacher.assign_student_help') }}</p></div>
                    </div>
                    <label class="form-label" :for="`${formId}-student`">{{ t('teacher.student') }}</label>
                    <select
                      :id="`${formId}-student`"
                      ref="studentField"
                      class="form-select"
                      :value="form.student_id"
                      :disabled="editing"
                      required
                      @change="patch('student_id', $event.target.value)"
                    >
                      <option value="">{{ t('teacher.choose') }}</option>
                      <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
                    </select>
                  </section>

                  <section class="teacher-task-modal__block" :aria-labelledby="`${formId}-task-heading`">
                    <div class="teacher-task-modal__section-heading">
                      <span class="teacher-task-modal__step" aria-hidden="true">2</span>
                      <div><h3 :id="`${formId}-task-heading`">{{ t('teacher.assign_section_task') }}</h3><p>{{ t('teacher.assign_task_help') }}</p></div>
                    </div>
                    <div class="row g-3">
                      <div class="col-sm-6">
                        <label class="form-label" :for="`${formId}-kind`">{{ t('teacher.kind') }}</label>
                        <select :id="`${formId}-kind`" ref="kindField" class="form-select" :value="form.kind" @change="patch('kind', $event.target.value)">
                          <option value="practice">{{ t('teacher.kind_practice') }}</option>
                          <option value="ai_recite">{{ t('teacher.kind_ai') }}</option>
                        </select>
                      </div>
                      <div class="col-sm-6">
                        <label class="form-label" :for="`${formId}-surah`">{{ t('teacher.surah') }}</label>
                        <select :id="`${formId}-surah`" class="form-select" :value="form.surah_number" @change="patch('surah_number', $event.target.value)">
                          <option v-for="surah in surahs" :key="surah.number" :value="String(surah.number)">{{ surah.number }}. {{ surah.name }}</option>
                        </select>
                      </div>
                    </div>
                    <fieldset class="teacher-task-modal__range">
                      <legend class="form-label teacher-task-modal__range-legend">{{ t('teacher.ayah_range_label') }}</legend>
                      <div class="row g-3">
                        <div class="col-6">
                          <label class="form-label form-label-sm" :for="`${formId}-from`">{{ t('teacher.from') }}</label>
                          <input :id="`${formId}-from`" class="form-control" :value="form.ayah_start" type="number" min="1" :max="selectedSurahAyahCount || undefined" :aria-invalid="rangeError ? 'true' : 'false'" :aria-describedby="rangeError ? `${formId}-range-error` : undefined" inputmode="numeric" required @input="patch('ayah_start', Number($event.target.value))">
                        </div>
                        <div class="col-6">
                          <label class="form-label form-label-sm" :for="`${formId}-to`">{{ t('teacher.to') }}</label>
                          <input :id="`${formId}-to`" class="form-control" :value="form.ayah_end" type="number" min="1" :max="selectedSurahAyahCount || undefined" :aria-invalid="rangeError ? 'true' : 'false'" :aria-describedby="rangeError ? `${formId}-range-error` : undefined" inputmode="numeric" required @input="patch('ayah_end', Number($event.target.value))">
                        </div>
                      </div>
                      <p v-if="rangeError" :id="`${formId}-range-error`" class="teacher-task-modal__field-error" role="alert">{{ rangeError }}</p>
                    </fieldset>
                  </section>

                  <section class="teacher-task-modal__block" :aria-labelledby="`${formId}-schedule-heading`">
                    <div class="teacher-task-modal__section-heading">
                      <span class="teacher-task-modal__step" aria-hidden="true">3</span>
                      <div><h3 :id="`${formId}-schedule-heading`">{{ t('teacher.assign_section_schedule') }}</h3><p>{{ t('teacher.assign_schedule_help') }}</p></div>
                    </div>
                    <div class="row g-3 teacher-task-modal__details">
                      <div class="col-sm-6">
                        <label class="form-label" :for="`${formId}-due`">{{ t('teacher.due_optional') }}</label>
                        <input :id="`${formId}-due`" class="form-control" :value="form.due_at" type="date" @input="patch('due_at', $event.target.value)">
                      </div>
                      <div class="col-sm-6">
                        <label class="form-label" :for="`${formId}-reps`">{{ t('teacher.repetitions') }}</label>
                        <input :id="`${formId}-reps`" class="form-control" :value="form.repetition_target" type="number" min="1" max="50" inputmode="numeric" required @input="patch('repetition_target', $event.target.value)">
                        <small>{{ t('teacher.task_target_help') }}</small>
                      </div>
                      <div class="col-12">
                        <label class="form-label" :for="`${formId}-feedback`">{{ t('teacher.feedback') }}</label>
                        <textarea :id="`${formId}-feedback`" class="form-control" :value="form.feedback" rows="3" maxlength="2000" :placeholder="t('teacher.feedback_placeholder')" @input="patch('feedback', $event.target.value)"></textarea>
                      </div>
                    </div>
                  </section>
                </div>

                <aside class="teacher-task-modal__summary" aria-live="polite">
                  <span class="teacher-task-modal__summary-icon" aria-hidden="true"><i class="bi bi-clipboard-check"></i></span>
                  <p>{{ t('teacher.task_summary') }}</p>
                  <h3>{{ summaryTitle }}</h3>
                  <dl>
                    <div><dt>{{ t('teacher.student') }}</dt><dd>{{ selectedStudentName || t('teacher.not_selected') }}</dd></div>
                    <div><dt>{{ t('teacher.kind') }}</dt><dd>{{ form.kind === 'ai_recite' ? t('teacher.kind_ai') : t('teacher.kind_practice') }}</dd></div>
                    <div><dt>{{ t('teacher.repetitions') }}</dt><dd>{{ form.repetition_target || '—' }}</dd></div>
                    <div><dt>{{ t('teacher.due') }}</dt><dd>{{ form.due_at || t('teacher.no_due_date') }}</dd></div>
                  </dl>
                  <p v-if="!canSubmit" class="teacher-task-modal__summary-help"><i class="bi bi-info-circle" aria-hidden="true"></i>{{ t('teacher.complete_required_fields') }}</p>
                </aside>
              </div>
            </form>

            <div class="modal-footer teacher-task-modal__footer">
              <button type="button" class="btn btn-link teacher-task-modal__cancel" @click="$emit('close')">{{ t('teacher.cancel') }}</button>
              <button type="submit" class="btn btn-primary teacher-task-modal__send" :form="formId" :disabled="saving || !canSubmit">
                <i class="bi bi-send" aria-hidden="true"></i>
                {{ editing ? t('teacher.task_save') : t('teacher.assign_task') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Teleport>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import {
  captureReturnFocus,
  handleModalKeydown,
  restoreReturnFocus,
} from '../../utils/modalFocus'

let sheetUid = 0

export default {
  name: 'TeacherTaskSheet',
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' },
    students: { type: Array, default: () => [] },
    surahs: { type: Array, default: () => [] },
  },
  emits: ['close', 'submit', 'update:form'],
  data() {
    sheetUid += 1
    const uid = sheetUid
    return {
      titleId: `teacher-task-modal-title-${uid}`,
      formId: `teacher-task-form-${uid}`,
      returnFocusEl: null,
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (typeof document === 'undefined') return
        document.body.classList.toggle('modal-open', value)
        document.body.classList.toggle('teacher-task-modal-open', value)
        if (value) {
          this.returnFocusEl = captureReturnFocus()
          this.$nextTick(() => (this.editing ? this.$refs.kindField : this.$refs.studentField)?.focus({ preventScroll: true }))
        } else if (this.returnFocusEl) {
          const target = this.returnFocusEl
          this.returnFocusEl = null
          this.$nextTick(() => restoreReturnFocus(target))
        }
      },
    },
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') document.body.classList.remove('modal-open', 'teacher-task-modal-open')
    restoreReturnFocus(this.returnFocusEl)
  },
  computed: {
    selectedStudentName() {
      return this.students.find((student) => String(student.id) === String(this.form.student_id))?.name || ''
    },
    selectedSurah() {
      return this.surahs.find((surah) => String(surah.number) === String(this.form.surah_number)) || null
    },
    summaryTitle() {
      if (!this.selectedSurah || !this.form.ayah_start || !this.form.ayah_end) return this.t('teacher.task_summary_empty')
      return `${this.selectedSurah.name} ${this.form.ayah_start}–${this.form.ayah_end}`
    },
    selectedSurahAyahCount() {
      return Number(this.selectedSurah?.ayah_count || 0)
    },
    rangeError() {
      const start = Number(this.form.ayah_start)
      const end = Number(this.form.ayah_end)
      if (!this.selectedSurahAyahCount || !start || !end) return ''
      if (start > end) return this.t('teacher.ayah_range_order_error')
      if (end > this.selectedSurahAyahCount) return this.t('teacher.ayah_range_max_error', { n: this.selectedSurahAyahCount })
      return ''
    },
    canSubmit() {
      const target = Number(this.form.repetition_target)
      return Boolean(this.form.student_id && this.form.surah_number && this.form.ayah_start && this.form.ayah_end && !this.rangeError && Number.isInteger(target) && target >= 1 && target <= 50)
    },
  },
  methods: {
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
    onKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialogRoot,
        open: this.open,
        onEscape: () => this.$emit('close'),
      })
    },
    submit() {
      if (!this.saving && this.canSubmit) this.$emit('submit')
    },
  },
}
</script>
