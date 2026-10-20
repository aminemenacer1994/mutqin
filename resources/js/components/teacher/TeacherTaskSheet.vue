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
        @keydown.esc.prevent="$emit('close')"
      >
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable teacher-task-modal__dialog">
          <div class="modal-content teacher-task-modal__content">
            <div class="modal-header teacher-task-modal__header">
              <div class="teacher-task-modal__intro">
                <h2 :id="titleId" class="modal-title h5 teacher-task-modal__title">{{ t('teacher.assign_form_title') }}</h2>
                <p class="teacher-task-modal__lead">{{ t('teacher.assign_form_lead') }}</p>
              </div>
              <button type="button" class="btn-close teacher-task-modal__close" :aria-label="t('teacher.close')" @click="$emit('close')"></button>
            </div>

            <form :id="formId" class="modal-body teacher-task-modal__body" @submit.prevent="$emit('submit')">
              <div class="teacher-task-modal__block">
                <label class="form-label" :for="`${formId}-student`">{{ t('teacher.student') }}</label>
                <select
                  :id="`${formId}-student`"
                  class="form-select"
                  :value="form.student_id"
                  required
                  @change="patch('student_id', $event.target.value)"
                >
                  <option value="">{{ t('teacher.choose') }}</option>
                  <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
                </select>
              </div>

              <div class="teacher-task-modal__block">
                <p class="teacher-task-modal__block-title">{{ t('teacher.assign_section_task') }}</p>

                <div class="row g-2">
                  <div class="col-sm-6">
                    <label class="form-label" :for="`${formId}-kind`">{{ t('teacher.kind') }}</label>
                    <select
                      :id="`${formId}-kind`"
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
                    <div class="col-4">
                      <label class="form-label form-label-sm" :for="`${formId}-from`">{{ t('teacher.from') }}</label>
                      <input
                        :id="`${formId}-from`"
                        class="form-control"
                        :value="form.ayah_start"
                        type="number"
                        min="1"
                        inputmode="numeric"
                        required
                        @input="patch('ayah_start', Number($event.target.value))"
                      >
                    </div>
                    <div class="col-4">
                      <label class="form-label form-label-sm" :for="`${formId}-to`">{{ t('teacher.to') }}</label>
                      <input
                        :id="`${formId}-to`"
                        class="form-control"
                        :value="form.ayah_end"
                        type="number"
                        min="1"
                        inputmode="numeric"
                        required
                        @input="patch('ayah_end', Number($event.target.value))"
                      >
                    </div>
                    <div class="col-4">
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
                </fieldset>
              </div>

              <details class="teacher-task-modal__more">
                <summary>
                  <i class="bi bi-sliders" aria-hidden="true"></i>
                  {{ t('teacher.more_options') }}
                </summary>
                <div class="teacher-task-modal__more-body">
                  <label class="form-label" :for="`${formId}-reps`">{{ t('teacher.repetitions') }}</label>
                  <input
                    :id="`${formId}-reps`"
                    class="form-control"
                    :value="form.repetition_target"
                    type="number"
                    min="1"
                    max="50"
                    inputmode="numeric"
                    @input="patch('repetition_target', $event.target.value)"
                  >
                  <label class="form-label" :for="`${formId}-feedback`">{{ t('teacher.feedback') }}</label>
                  <textarea
                    :id="`${formId}-feedback`"
                    class="form-control"
                    :value="form.feedback"
                    rows="3"
                    :placeholder="t('teacher.feedback_placeholder')"
                    @input="patch('feedback', $event.target.value)"
                  ></textarea>
                </div>
              </details>
            </form>

            <div class="modal-footer teacher-task-modal__footer">
              <button type="button" class="btn btn-link teacher-task-modal__cancel" @click="$emit('close')">{{ t('teacher.close') }}</button>
              <button type="submit" class="btn btn-primary teacher-task-modal__send" :form="formId" :disabled="saving">
                <i class="bi bi-send" aria-hidden="true"></i>
                {{ t('teacher.assign') }}
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

let sheetUid = 0

export default {
  name: 'TeacherTaskSheet',
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
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
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        document.body.classList.toggle('modal-open', value)
        document.body.classList.toggle('teacher-task-modal-open', value)
        if (value) {
          this.$nextTick(() => this.$refs.dialogRoot?.focus())
        }
      },
    },
  },
  beforeUnmount() {
    document.body.classList.remove('modal-open', 'teacher-task-modal-open')
  },
  methods: {
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
  },
}
</script>
