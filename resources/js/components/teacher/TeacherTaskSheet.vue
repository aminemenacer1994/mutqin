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
                <h2 :id="titleId" class="modal-title h5 teacher-task-modal__title">{{ editing ? t('teacher.task_edit') : t('teacher.assign_form_title') }}</h2>
              </div>
              <button type="button" class="btn-close teacher-task-modal__close" :aria-label="t('teacher.close')" @click="$emit('close')"></button>
            </div>

            <form :id="formId" class="modal-body teacher-task-modal__body" @submit.prevent="submit">
              <p v-if="error" class="alert alert-danger teacher-task-modal__alert" role="alert">{{ error }}</p>
              <div class="teacher-task-modal__compact-grid">
                <div class="teacher-task-modal__field teacher-task-modal__field--student">
                  <label class="form-label" :for="`${formId}-student`">{{ t('teacher.student') }}</label>
                  <div class="teacher-task-modal__student-picker">
                  <input
                    :id="`${formId}-student`"
                    ref="studentField"
                    v-model="studentQuery"
                    class="form-control"
                    type="search"
                    autocomplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    :aria-controls="`${formId}-student-options`"
                    :aria-expanded="studentOptionsOpen ? 'true' : 'false'"
                    :placeholder="t('teacher.student_search_placeholder')"
                    :disabled="editing"
                    required
                    @input="onStudentInput"
                    @focus="studentOptionsOpen = true"
                    @keydown.down.prevent="moveStudent(1)"
                    @keydown.up.prevent="moveStudent(-1)"
                    @keydown.enter.prevent="chooseHighlightedStudent"
                    @blur="closeStudentOptions"
                  >
                  <ul v-if="studentOptionsOpen && !editing" :id="`${formId}-student-options`" class="teacher-task-modal__student-options" role="listbox">
                    <li v-for="(student, index) in filteredStudents" :key="student.id" role="option" :aria-selected="index === highlightedStudent" :class="{ 'is-highlighted': index === highlightedStudent }" @mousedown.prevent="chooseStudent(student)">{{ student.name }}</li>
                    <li v-if="!filteredStudents.length" class="teacher-task-modal__student-no-results">{{ t('teacher.student_no_results') }}</li>
                  </ul>
                  </div>
                </div>

                <div class="teacher-task-modal__field">
                  <label class="form-label" :for="`${formId}-kind`">{{ t('teacher.kind') }}</label>
                  <select :id="`${formId}-kind`" ref="kindField" class="form-select" :value="form.kind" @change="patch('kind', $event.target.value)">
                    <option value="practice">{{ t('teacher.kind_practice') }}</option>
                    <option value="ai_recite">{{ t('teacher.kind_ai') }}</option>
                  </select>
                </div>

                <div class="teacher-task-modal__field teacher-task-modal__field--surah">
                  <label class="form-label" :for="`${formId}-surah`">{{ t('teacher.surah') }}</label>
                  <select :id="`${formId}-surah`" class="form-select" :value="form.surah_number" @change="patch('surah_number', $event.target.value)">
                    <option v-for="surah in surahs" :key="surah.number" :value="String(surah.number)">{{ surah.number }}. {{ surah.name }}{{ arabicNames[surah.number] ? ` — ${arabicNames[surah.number]}` : '' }}</option>
                  </select>
                  <small v-if="selectedSurah && arabicNames[selectedSurah.number]" class="teacher-task-modal__surah-arabic" lang="ar" dir="rtl">{{ arabicNames[selectedSurah.number] }}</small>
                </div>

                <fieldset class="teacher-task-modal__range teacher-task-modal__field--range">
                  <legend class="form-label teacher-task-modal__range-legend">{{ t('teacher.ayah_range_label') }}</legend>
                  <small v-if="selectedSurahAyahCount" class="teacher-task-modal__ayah-count">{{ t('teacher.surah_ayah_count', { n: selectedSurahAyahCount }) }}</small>
                  <div class="teacher-task-modal__range-fields">
                    <label>
                      <span>{{ t('teacher.from') }}</span>
                      <input :id="`${formId}-from`" class="form-control" :value="form.ayah_start" type="number" min="1" :max="selectedSurahAyahCount || undefined" :aria-invalid="rangeError ? 'true' : 'false'" :aria-describedby="rangeError ? `${formId}-range-error` : undefined" inputmode="numeric" required @input="patch('ayah_start', Number($event.target.value))">
                    </label>
                    <label>
                      <span>{{ t('teacher.to') }}</span>
                      <input :id="`${formId}-to`" class="form-control" :value="form.ayah_end" type="number" min="1" :max="selectedSurahAyahCount || undefined" :aria-invalid="rangeError ? 'true' : 'false'" :aria-describedby="rangeError ? `${formId}-range-error` : undefined" inputmode="numeric" required @input="patch('ayah_end', Number($event.target.value))">
                    </label>
                  </div>
                  <p v-if="rangeError" :id="`${formId}-range-error`" class="teacher-task-modal__field-error" role="alert">{{ rangeError }}</p>
                </fieldset>

                <div class="teacher-task-modal__field">
                  <label class="form-label" :for="`${formId}-reps`">{{ t('teacher.repetitions') }}</label>
                  <input :id="`${formId}-reps`" class="form-control" :value="form.repetition_target" type="number" min="1" max="50" inputmode="numeric" required @input="patch('repetition_target', $event.target.value)">
                  <small class="teacher-task-modal__field-help">{{ t('teacher.task_target_help') }}</small>
                </div>

                <div class="teacher-task-modal__field">
                  <label class="form-label" :for="`${formId}-due`">{{ t('teacher.due_optional') }}</label>
                  <input :id="`${formId}-due`" class="form-control" :value="form.due_at" type="date" @input="patch('due_at', $event.target.value)">
                </div>

                <div class="teacher-task-modal__field teacher-task-modal__field--feedback">
                  <label class="form-label" :for="`${formId}-feedback`">{{ t('teacher.feedback') }}</label>
                  <textarea :id="`${formId}-feedback`" class="form-control" :value="form.feedback" rows="2" maxlength="2000" :placeholder="t('teacher.feedback_placeholder')" @input="patch('feedback', $event.target.value)"></textarea>
                </div>
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
import { teacherArabicSurahNames } from '../../scripts/teacher/quranContent'
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
      studentQuery: '',
      studentOptionsOpen: false,
      highlightedStudent: 0,
      arabicNames: {},
    }
  },
  watch: {
    students() {
      if (this.form.student_id && !this.studentQuery) this.syncStudentQuery()
    },
    open: {
      immediate: true,
      handler(value) {
        if (typeof document === 'undefined') return
        document.body.classList.toggle('modal-open', value)
        document.body.classList.toggle('teacher-task-modal-open', value)
        if (value) {
          this.syncStudentQuery()
          teacherArabicSurahNames().then((names) => { this.arabicNames = names })
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
    filteredStudents() {
      const needle = this.studentQuery.trim().toLocaleLowerCase()
      return this.students.filter((student) => student.name.toLocaleLowerCase().includes(needle)).slice(0, 10)
    },
    selectedSurah() {
      return this.surahs.find((surah) => String(surah.number) === String(this.form.surah_number)) || null
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
    syncStudentQuery() {
      this.studentQuery = this.students.find((student) => String(student.id) === String(this.form.student_id))?.name || ''
    },
    onStudentInput() {
      this.studentOptionsOpen = true
      this.highlightedStudent = 0
      this.patch('student_id', '')
    },
    moveStudent(step) {
      this.studentOptionsOpen = true
      const count = this.filteredStudents.length
      if (count) this.highlightedStudent = (this.highlightedStudent + step + count) % count
    },
    chooseHighlightedStudent() {
      const student = this.filteredStudents[this.highlightedStudent]
      if (student) this.chooseStudent(student)
    },
    chooseStudent(student) {
      this.studentQuery = student.name
      this.patch('student_id', String(student.id))
      this.studentOptionsOpen = false
    },
    closeStudentOptions() {
      window.setTimeout(() => { this.studentOptionsOpen = false }, 100)
    },
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
