<template>
  <TeacherDialog
    ref="dialog"
    :open="open"
    :title="editing ? t('teacher.task_edit') : t('teacher.assign_form_title')"
    :close-label="t('teacher.close')"
    :busy="saving"
    :dirty="isDirty"
    compact
    class="teacher-task-dialog"
    @close="$emit('close')"
  >
    <form :id="formId" class="teacher-task-form" @submit.prevent="submit">
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <div class="teacher-form-grid teacher-form-grid--task">
        <div v-if="bulkStudents.length" class="teacher-form-field teacher-form-field--full">
          <p class="form-label mb-1">{{ t('teacher.task_bulk_selected', { n: bulkStudents.length }) }}</p>
          <p class="mb-2">{{ t('teacher.task_bulk_confirm') }}</p>
          <ul class="mb-0">
            <li v-for="student in bulkStudents" :key="student.id">{{ student.name }}</li>
          </ul>
        </div>
        <div v-else class="teacher-form-field teacher-form-field--half">
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
              @click="openStudentOptions"
              @keydown.down.prevent="moveStudent(1)"
              @keydown.up.prevent="moveStudent(-1)"
              @keydown.enter.prevent="chooseHighlightedStudent"
              @keydown.esc="onStudentEscape"
              @blur="closeStudentOptions"
            >
            <ul v-if="studentOptionsOpen && !editing" :id="`${formId}-student-options`" class="teacher-task-modal__student-options" role="listbox">
              <li v-for="(student, index) in filteredStudents" :key="student.id" role="option" :aria-selected="index === highlightedStudent" :class="{ 'is-highlighted': index === highlightedStudent }" @mousedown.prevent="chooseStudent(student)">{{ student.name }}</li>
              <li v-if="!filteredStudents.length" class="teacher-task-modal__student-no-results">{{ t('teacher.student_no_results') }}</li>
            </ul>
          </div>
        </div>
        <div class="teacher-form-field teacher-form-field--half">
          <label class="form-label" :for="`${formId}-category`">{{ t('teacher.hifz_task_type') }}</label>
          <select :id="`${formId}-category`" ref="categoryField" class="form-select" :value="form.task_type || ''" required @change="onTaskTypeChange($event.target.value)">
            <option value="" disabled>{{ t('teacher.hifz_choose_type') }}</option>
            <option v-for="type in taskTypes" :key="type.id" :value="type.id">{{ t(type.labelKey) }}</option>
          </select>
        </div>
        <div v-if="showHifzStage" class="teacher-form-field teacher-form-field--half">
          <label class="form-label" :for="`${formId}-stage`">{{ t('teacher.hifz_stage') }}</label>
          <select :id="`${formId}-stage`" class="form-select" :value="form.hifz_category || 'sabaq'" @change="patch('hifz_category', $event.target.value)">
            <option value="sabaq">{{ t('teacher.hifz_sabaq') }}</option>
            <option value="sabqi">{{ t('teacher.hifz_sabqi') }}</option>
            <option value="manzil">{{ t('teacher.hifz_manzil') }}</option>
          </select>
        </div>
        <div class="teacher-form-field teacher-form-field--half">
          <label class="form-label" :for="`${formId}-surah`">{{ t('teacher.surah') }}</label>
          <TeacherSurahSelect :id="`${formId}-surah`" :model-value="form.surah_number" :surahs="surahs" :disabled="saving" @update:model-value="onSurahChange" />
        </div>
        <div class="teacher-form-field teacher-form-field--quarter">
          <label class="form-label" :for="`${formId}-from`">{{ t('teacher.from') }}</label>
          <input :id="`${formId}-from`" class="form-control" :value="form.ayah_start" type="number" min="1" :max="selectedSurahAyahCount || undefined" :aria-invalid="rangeError ? 'true' : 'false'" :aria-describedby="rangeError ? `${formId}-range-error` : undefined" inputmode="numeric" required @input="patch('ayah_start', Number($event.target.value))">
        </div>
        <div class="teacher-form-field teacher-form-field--quarter">
          <label class="form-label" :for="`${formId}-to`">{{ t('teacher.to') }}</label>
          <input :id="`${formId}-to`" class="form-control" :value="form.ayah_end" type="number" min="1" :max="selectedSurahAyahCount || undefined" :aria-invalid="rangeError ? 'true' : 'false'" :aria-describedby="rangeError ? `${formId}-range-error` : undefined" inputmode="numeric" required @input="patch('ayah_end', Number($event.target.value))">
        </div>
        <div v-if="rangeError" class="teacher-form-field teacher-form-field--full">
          <p :id="`${formId}-range-error`" class="text-danger small mb-0" role="alert">{{ rangeError }}</p>
        </div>
        <div class="teacher-form-field teacher-form-field--half teacher-form-field--reps">
          <label class="form-label" :for="`${formId}-reps`">{{ requirementLabel }}</label>
          <input :id="`${formId}-reps`" class="form-control" :class="{ 'is-invalid': showTargetError }" :value="form.repetition_target" type="number" min="1" max="50" inputmode="numeric" required :aria-invalid="showTargetError ? 'true' : 'false'" :aria-describedby="showTargetError ? `${formId}-reps-error` : undefined" @input="patch('repetition_target', $event.target.value)">
          <p v-if="showTargetError" :id="`${formId}-reps-error`" class="text-danger small mb-0 mt-1" role="alert">{{ targetError }}</p>
        </div>
        <div v-if="showRecordingOption" class="teacher-form-field teacher-form-field--full teacher-task-form__recording">
          <label v-if="!selectedTaskType?.recordingLocked" class="form-check" :for="`${formId}-recording`">
            <input :id="`${formId}-recording`" class="form-check-input" type="checkbox" :checked="Boolean(form.recording_required)" :disabled="saving" @change="onRecordingChange($event.target.checked)">
            <span class="form-check-label">{{ t('teacher.recording_required') }}</span>
          </label>
          <p v-else class="mb-0 fw-medium"><i class="bi bi-mic" aria-hidden="true"></i> {{ t('teacher.recording_required') }}</p>
        </div>
        <div class="teacher-form-pair">
        <div class="teacher-form-field teacher-form-field--due">
          <label class="form-label" :for="`${formId}-due`">{{ t('teacher.due_date') }}</label>
          <input
            :id="`${formId}-due`"
            class="form-control"
            :class="{ 'is-invalid': showDueError }"
            :value="form.due_at"
            type="date"
            :min="editing ? undefined : minDueDate"
            required
            :aria-invalid="showDueError ? 'true' : 'false'"
            :aria-describedby="showDueError ? `${formId}-due-error` : undefined"
            @input="onDueInput($event.target.value)"
          >
          <p v-if="showDueError" :id="`${formId}-due-error`" class="text-danger small mb-0 mt-1" role="alert">{{ dueError }}</p>
        </div>
        <div class="teacher-form-field teacher-form-field--half teacher-form-field--priority">
          <label class="form-label" :for="`${formId}-priority`">{{ t('teacher.priority') }}</label>
          <select :id="`${formId}-priority`" class="form-select" :value="form.priority || 'normal'" @change="patch('priority', $event.target.value)">
            <option value="low">{{ t('teacher.priority_low') }}</option>
            <option value="normal">{{ t('teacher.priority_normal') }}</option>
            <option value="high">{{ t('teacher.priority_high') }}</option>
          </select>
        </div>
        </div>
        <div class="teacher-form-field teacher-form-field--full">
          <label class="form-label" :for="`${formId}-feedback`">{{ t('teacher.feedback') }} <span class="text-body-secondary fw-normal">{{ t('teacher.optional_short') }}</span></label>
          <textarea :id="`${formId}-feedback`" class="form-control" :value="form.feedback" rows="2" maxlength="2000" :placeholder="t('teacher.task_message_prompt')" @input="patch('feedback', $event.target.value)"></textarea>
        </div>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="$refs.dialog.requestClose()">{{ t('teacher.cancel') }}</button>
      <span class="teacher-task-form__submit">
        <span v-if="!canSubmit" :id="`${formId}-submit-hint`" class="teacher-task-form__submit-hint" aria-live="polite">{{ submitHint }}</span>
        <button type="submit" class="btn btn-primary" :form="formId" :disabled="saving || !canSubmit" :aria-describedby="!canSubmit ? `${formId}-submit-hint` : undefined" :title="!canSubmit ? submitHint : undefined">{{ editing ? t('teacher.task_save') : t('teacher.assign_task') }}</button>
      </span>
    </template>
  </TeacherDialog>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherDialog from './TeacherDialog.vue'
import TeacherSurahSelect from './TeacherSurahSelect.vue'
import { assignmentRequirementLabel } from '../../scripts/teacher/formatters'
import {
  TEACHER_TASK_TYPES,
  applyRecordingRequirement,
  applyTeacherTaskType,
  defaultAyahRange,
} from '../../scripts/teacher/taskTypes'

let sheetUid = 0

export default {
  name: 'TeacherTaskSheet',
  components: { TeacherDialog, TeacherSurahSelect },
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
      formId: `teacher-task-form-${uid}`,
      studentQuery: '',
      studentOptionsOpen: false,
      highlightedStudent: 0,
      dueTouched: false,
      submitAttempted: false,
      initialForm: '',
      studentBlurTimer: null,
    }
  },
  watch: {
    students() {
      if (this.form.student_id && !this.studentQuery) this.syncStudentQuery()
    },
    open(value) {
      window.clearTimeout(this.studentBlurTimer)
      if (!value) return
      this.dueTouched = false
      this.submitAttempted = false
      this.initialForm = JSON.stringify(this.form)
      this.syncStudentQuery()
      this.studentOptionsOpen = false
      this.$nextTick(() => (this.editing || this.bulkStudents.length ? this.$refs.categoryField : this.$refs.studentField)?.focus({ preventScroll: true }))
    },
  },
  beforeUnmount() { window.clearTimeout(this.studentBlurTimer) },
  computed: {
    isDirty() { return this.initialForm !== JSON.stringify(this.form) },
    filteredStudents() {
      const needle = this.studentQuery.trim().toLocaleLowerCase()
      return this.students.filter((student) => student.name.toLocaleLowerCase().includes(needle)).slice(0, 10)
    },
    bulkStudents() {
      const ids = Array.isArray(this.form.student_ids) ? this.form.student_ids : []
      if (ids.length < 2) return []
      return ids.map((id) => this.students.find((student) => String(student.id) === String(id)) || { id, name: String(id) })
    },
    selectedSurah() {
      return this.surahs.find((surah) => String(surah.number) === String(this.form.surah_number)) || null
    },
    selectedSurahAyahCount() {
      return Number(this.selectedSurah?.ayah_count || 0)
    },
    taskTypes() {
      return TEACHER_TASK_TYPES.filter((type) => type.id !== 'new_memorisation' || type.id === this.form.task_type)
    },
    selectedTaskType() {
      return TEACHER_TASK_TYPES.find((type) => type.id === this.form.task_type) || null
    },
    showHifzStage() {
      return this.form.task_type === 'hifz' || this.form.task_type === 'new_memorisation'
    },
    showRecordingOption() {
      return ['hifz', 'tajweed', 'recitation_check'].includes(this.form.task_type)
    },
    requirementLabel() {
      return assignmentRequirementLabel({ kind: this.form.kind }, this.t.bind(this))
    },
    minDueDate() {
      const today = new Date()
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    },
    rangeError() {
      const start = Number(this.form.ayah_start)
      const end = Number(this.form.ayah_end)
      if (!Number.isInteger(start) || start < 1) return this.t('teacher.ayah_range_from_error')
      if (!Number.isInteger(end) || end < 1) return this.t('teacher.ayah_range_to_error')
      if (start > end) return this.t('teacher.ayah_range_order_error')
      if (!this.selectedSurahAyahCount) return ''
      if (start > this.selectedSurahAyahCount || end > this.selectedSurahAyahCount) {
        return this.t('teacher.ayah_range_max_error', { n: this.selectedSurahAyahCount })
      }
      return ''
    },
    showDueError() {
      return (this.dueTouched || this.submitAttempted) && Boolean(this.dueError)
    },
    dueError() {
      if (!this.form.due_at) {
        return this.editing ? this.t('teacher.due_date_required_edit') : this.t('teacher.due_date_required')
      }
      return ''
    },
    targetError() {
      const target = Number(this.form.repetition_target)
      if (!Number.isInteger(target) || target < 1 || target > 50) return this.t('teacher.task_target_error')
      return ''
    },
    showTargetError() {
      return this.submitAttempted && Boolean(this.targetError)
    },
    submitHint() {
      if (!this.form.student_id && !this.bulkStudents.length) return this.t('teacher.task_submit_choose_student')
      if (!this.form.task_type) return this.t('teacher.task_submit_choose_type')
      if (!this.form.surah_number || !this.form.ayah_start || !this.form.ayah_end || this.rangeError) return this.t('teacher.task_submit_choose_passage')
      if (this.targetError) return this.t('teacher.task_submit_choose_target')
      if (this.dueError) return this.t('teacher.task_submit_choose_due_date')
      return this.t('teacher.complete_required_fields')
    },
    canSubmit() {
      const target = Number(this.form.repetition_target)
      return Boolean(
        (this.form.student_id || this.bulkStudents.length)
        && this.form.task_type
        && this.form.hifz_category
        && this.form.surah_number
        && this.form.ayah_start
        && this.form.ayah_end
        && this.form.due_at
        && !this.rangeError
        && !this.dueError
        && Number.isInteger(target)
        && target >= 1
        && target <= 50,
      )
    },
  },
  methods: {
    openStudentOptions() {
      window.clearTimeout(this.studentBlurTimer)
      if (!this.editing) this.studentOptionsOpen = true
    },
    syncStudentQuery() {
      this.studentQuery = this.students.find((student) => String(student.id) === String(this.form.student_id))?.name || ''
    },
    onStudentInput() {
      window.clearTimeout(this.studentBlurTimer)
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
      this.studentBlurTimer = window.setTimeout(() => {
        if (document.activeElement !== this.$refs.studentField) this.studentOptionsOpen = false
      }, 100)
    },
    onStudentEscape(event) { if (this.studentOptionsOpen) { event.stopPropagation(); this.studentOptionsOpen = false } },
    onDueInput(value) {
      this.dueTouched = true
      this.patch('due_at', value)
    },
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
    onTaskTypeChange(taskTypeId) {
      this.$emit('update:form', applyTeacherTaskType(this.form, taskTypeId))
    },
    onRecordingChange(required) {
      this.$emit('update:form', applyRecordingRequirement(this.form, required))
    },
    onSurahChange(surahNumber) {
      const previousSurah = String(this.form.surah_number)
      const preserveRange = this.editing && previousSurah === String(surahNumber)
      const range = preserveRange
        ? { ayah_start: Number(this.form.ayah_start) || 1, ayah_end: Number(this.form.ayah_end) || 1 }
        : defaultAyahRange(this.surahs, surahNumber)
      this.$emit('update:form', {
        ...this.form,
        surah_number: String(surahNumber),
        ayah_start: range.ayah_start,
        ayah_end: range.ayah_end,
      })
    },
    submit() {
      this.submitAttempted = true
      if (!this.saving && this.canSubmit) this.$emit('submit')
    },
  },
}
</script>
