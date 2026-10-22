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
              </div>
              <button type="button" class="btn-close teacher-task-modal__close" :aria-label="t('teacher.close')" @click="$emit('close')"></button>
            </div>

            <form :id="formId" class="modal-body teacher-task-modal__body" @submit.prevent="submit">
              <p v-if="error" class="alert alert-danger teacher-task-modal__alert" role="alert">{{ error }}</p>
              <div class="teacher-task-modal__block teacher-task-modal__student-block border rounded-3 p-3">
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
              </div>

              <div class="teacher-task-modal__block">
                <div class="teacher-task-modal__section-heading d-flex align-items-center gap-2">
                  <span class="teacher-task-modal__section-icon bg-success-subtle text-success rounded-2" aria-hidden="true"><i class="bi bi-journal-bookmark"></i></span>
                  <p class="teacher-task-modal__block-title mb-0">{{ t('teacher.assign_section_task') }}</p>
                </div>

                <div class="row g-2">
                  <div class="col-sm-6">
                    <label class="form-label" :for="`${formId}-kind`">{{ t('teacher.kind') }}</label>
                    <select
                      :id="`${formId}-kind`"
                      ref="kindField"
                      class="form-select"
                      :value="form.kind"
                      @change="patch('kind', $event.target.value)"
                    >
                      <option value="practice">{{ t('teacher.kind_practice') }}</option>
                      <option value="ai_recite">{{ t('teacher.kind_ai') }}</option>
                    </select>
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label" :for="`${formId}-surah`">{{ t('teacher.surah') }}</label>
                    <select
                      :id="`${formId}-surah`"
                      class="form-select"
                      :value="form.surah_number"
                      @change="patch('surah_number', $event.target.value)"
                    >
                      <option v-for="surah in surahs" :key="surah.number" :value="String(surah.number)">
                        {{ surah.number }}. {{ surah.name }}
                      </option>
                    </select>
                  </div>
                </div>

                <fieldset class="teacher-task-modal__range">
                  <legend class="form-label teacher-task-modal__range-legend">{{ t('teacher.ayah_range_label') }}</legend>
                  <div class="row g-2">
                    <div class="col-6 col-sm-4">
                      <label class="form-label form-label-sm" :for="`${formId}-from`">{{ t('teacher.from') }}</label>
                      <input
                        :id="`${formId}-from`"
                        class="form-control"
                        :value="form.ayah_start"
                        type="number"
                        min="1"
                        :max="selectedSurahAyahCount || undefined"
                        :aria-invalid="rangeError ? 'true' : 'false'"
                        inputmode="numeric"
                        required
                        @input="patch('ayah_start', Number($event.target.value))"
                      >
                    </div>
                    <div class="col-6 col-sm-4">
                      <label class="form-label form-label-sm" :for="`${formId}-to`">{{ t('teacher.to') }}</label>
                      <input
                        :id="`${formId}-to`"
                        class="form-control"
                        :value="form.ayah_end"
                        type="number"
                        min="1"
                        :max="selectedSurahAyahCount || undefined"
                        :aria-invalid="rangeError ? 'true' : 'false'"
                        inputmode="numeric"
                        required
                        @input="patch('ayah_end', Number($event.target.value))"
                      >
                    </div>
                    <div class="col-12 col-sm-4">
                      <label class="form-label form-label-sm" :for="`${formId}-due`">{{ t('teacher.due_optional') }}</label>
                      <input
                        :id="`${formId}-due`"
                        class="form-control"
                        :value="form.due_at"
                        type="date"
                        @input="patch('due_at', $event.target.value)"
                      >
                    </div>
                  </div>
                    <p v-if="rangeError" class="teacher-task-modal__field-error" role="alert">{{ rangeError }}</p>
                </fieldset>
              </div>

              <div class="row g-3 teacher-task-modal__details">
                <div class="col-sm-4">
                  <label class="form-label" :for="`${formId}-reps`">{{ t('teacher.repetitions') }}</label>
                  <input
                    :id="`${formId}-reps`"
                    class="form-control"
                    :value="form.repetition_target"
                    type="number"
                    min="1"
                    max="50"
                    inputmode="numeric"
                    required
                    @input="patch('repetition_target', $event.target.value)"
                  >
                </div>
                <div class="col-sm-8">
                  <label class="form-label" :for="`${formId}-feedback`">{{ t('teacher.feedback') }}</label>
                  <textarea
                    :id="`${formId}-feedback`"
                    class="form-control"
                    :value="form.feedback"
                    rows="2"
                    maxlength="2000"
                    :placeholder="t('teacher.feedback_placeholder')"
                    @input="patch('feedback', $event.target.value)"
                  ></textarea>
                </div>
              </div>
            </form>

            <div class="modal-footer teacher-task-modal__footer">
              <button type="button" class="btn btn-link teacher-task-modal__cancel" @click="$emit('close')">{{ t('teacher.close') }}</button>
              <button type="submit" class="btn btn-primary teacher-task-modal__send" :form="formId" :disabled="saving || !canSubmit">
                <i class="bi bi-send" aria-hidden="true"></i>
                {{ editing ? t('teacher.task_save') : t('teacher.assign') }}
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
    selectedSurahAyahCount() {
      const selected = this.surahs.find((surah) => String(surah.number) === String(this.form.surah_number))
      return Number(selected?.ayah_count || 0)
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
