<template>
  <TeacherDialog
    ref="dialog"
    :open="open"
    class="teacher-student-import-dialog"
    size="xl"
    :title="dialogTitle"
    :eyebrow="t('teacher.import_eyebrow')"
    :busy="busy"
    :dirty="discardDirty"
    @close="$emit('close')"
  >
    <ol class="teacher-plan-steps teacher-student-import__steps" :aria-label="t('teacher.import_steps_label')">
      <li v-for="item in stepItems" :key="item.id" :class="stepClass(item.id)">
        <button type="button" :disabled="!canJumpToStep(item.id)" @click="goToStep(item.id)">
          {{ item.id }}. {{ item.label }}
        </button>
      </li>
    </ol>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>

    <Transition name="teacher-import-step" mode="out-in">
      <section v-if="step === 1" :key="1" :aria-label="t('teacher.import_step_upload')">
        <p class="teacher-meta mb-3">{{ t('teacher.import_upload_lede') }}</p>
        <label v-if="groupChoices.length > 1" class="teacher-field mb-3">
          <span class="form-label">{{ t('teacher.group') }}</span>
          <select v-model="groupId" class="form-select" :disabled="busy || Boolean(batch)">
            <option v-for="group in groupChoices" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>

        <div
          v-if="!batch"
          class="teacher-student-import__drop"
          :class="{ 'is-dragover': dragOver, 'is-compact': pendingFiles.length > 0 }"
          role="button"
          tabindex="0"
          :aria-label="t('teacher.import_drop_label')"
          @dragenter.prevent="dragOver = true"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
          @keydown.enter.prevent="openFilePicker"
          @keydown.space.prevent="openFilePicker"
          @click="openFilePicker"
        >
          <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
          <p class="mb-1">{{ pendingFiles.length ? t('teacher.import_drop_add_more') : t('teacher.import_drop_title') }}</p>
          <p class="teacher-meta mb-0">{{ t('teacher.import_drop_help', { formats: formatSummary }) }}</p>
          <input ref="fileInput" class="visually-hidden" type="file" multiple :accept="acceptList" @change="onFileInput">
        </div>

        <ul v-if="pendingFiles.length && !batch" class="teacher-student-import__files list-unstyled mt-3 mb-0">
          <li
            v-for="(file, index) in pendingFiles"
            :key="`${file.name}-${file.size}-${index}`"
            class="teacher-student-import__file-chip"
          >
            <i class="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i>
            <span class="teacher-student-import__file-name" :title="file.name">{{ file.name }}</span>
            <span class="teacher-student-import__file-size">{{ formatFileSize(file.size) }}</span>
            <button
              type="button"
              class="teacher-student-import__file-remove"
              :disabled="busy"
              :aria-label="t('teacher.import_remove_file', { name: file.name })"
              @click.stop="removePendingFile(index)"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
              <span class="visually-hidden">{{ t('teacher.clear') }}</span>
            </button>
          </li>
        </ul>

        <div v-if="batch" class="teacher-student-import__progress" role="status">
          <div v-for="file in batch.files" :key="file.id" class="teacher-student-import__batch-file">
            <div class="teacher-student-import__batch-file-head">
              <span class="teacher-student-import__file-name">{{ file.original_filename }}</span>
              <span class="teacher-student-import__file-status">{{ fileStatusLabel(file.status) }}</span>
              <button
                v-if="processingDone"
                type="button"
                class="teacher-student-import__file-remove"
                :disabled="busy"
                :aria-label="t('teacher.import_remove_file', { name: file.original_filename })"
                @click="restart"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="teacher-student-import__progress-track" aria-hidden="true">
              <div
                class="teacher-student-import__progress-fill"
                :class="{ 'is-indeterminate': !processingDone }"
                :style="progressBarStyle"
              ></div>
            </div>
            <p class="teacher-meta mb-0 mt-2">{{ processingLabel }}</p>
            <p v-if="file.error_message" class="teacher-student-import__file-error mb-0">{{ file.error_message }}</p>
          </div>
          <button
            v-if="!processingDone"
            type="button"
            class="btn btn-link btn-sm px-0 mt-2"
            :disabled="busy"
            @click="restart"
          >
            {{ t('teacher.import_start_over') }}
          </button>
        </div>

        <div
          v-if="batch && processingDone"
          class="teacher-student-import__preview mt-3"
          :aria-label="t('teacher.import_preview_title')"
        >
          <header class="teacher-student-import__preview-head">
            <h3 class="h6 mb-0">{{ t('teacher.import_preview_title') }}</h3>
            <span v-if="rows.length" class="teacher-meta">{{ t('teacher.import_preview_count', { n: rows.length }) }}</span>
          </header>
          <p v-if="!rows.length" class="teacher-meta mb-0" role="status">{{ t('teacher.import_review_empty') }}</p>
          <div v-else class="table-responsive teacher-student-import__table-wrap teacher-student-import__table-wrap--preview">
            <table class="table table-sm teacher-student-import__table teacher-student-import__table--preview mb-0">
              <thead>
                <tr>
                  <th scope="col">{{ t('teacher.col_name') }}</th>
                  <th scope="col">{{ t('teacher.import_col_email') }}</th>
                  <th scope="col">{{ t('teacher.import_col_parent') }}</th>
                  <th scope="col">{{ t('teacher.col_status') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pagedPreviewRows" :key="row.id" :class="rowRowClass(row)">
                  <td>{{ row.normalized?.name || '—' }}</td>
                  <td dir="ltr">{{ row.normalized?.email || '—' }}</td>
                  <td dir="ltr">{{ row.normalized?.parent_email || '—' }}</td>
                  <td>
                    <span class="teacher-student-import__badge" :class="`is-${rowKind(row)}`">{{ rowKindLabel(row) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <TeacherPagination
            :current-page="previewPage"
            :page-count="previewPageCount"
            :total="rows.length"
            :loading="busy"
            summary-mode="rows"
            root-class="mt-2"
            @page="previewPage = $event"
          />
        </div>
      </section>

      <section v-else-if="step === 2" :key="2" :aria-label="t('teacher.import_step_review')">
        <div v-if="rows.length" class="teacher-student-import__review-bar">
          <p class="mb-0">
            <strong>{{ reviewSummary.total }}</strong> {{ t('teacher.import_review_rows') }}
            <span v-if="reviewSummary.create" class="teacher-student-import__review-pill is-new">+{{ reviewSummary.create }} {{ t('teacher.import_count_create') }}</span>
            <span v-if="reviewSummary.update" class="teacher-student-import__review-pill">{{ reviewSummary.update }} {{ t('teacher.import_count_update') }}</span>
            <span v-if="reviewSummary.needsAttention" class="teacher-student-import__review-pill is-warn">{{ reviewSummary.needsAttention }} {{ t('teacher.import_row_needs_review') }}</span>
          </p>
          <p class="teacher-meta mb-0">{{ t('teacher.import_confirm_notice') }}</p>
        </div>
        <p v-if="!rows.length" class="teacher-meta" role="status">{{ t('teacher.import_review_empty') }}</p>
        <template v-else>
          <div class="teacher-toolbar teacher-toolbar--filters d-flex flex-wrap gap-2 mb-3">
            <label class="input-group teacher-search teacher-search--compact flex-grow-1">
              <span class="visually-hidden">{{ t('teacher.search') }}</span>
              <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
              <input v-model="rowQuery" class="form-control" type="search" :placeholder="t('teacher.search_placeholder')" autocomplete="off">
            </label>
            <select v-model="rowFilter" class="form-select form-select-sm">
              <option value="all">{{ t('teacher.any') }}</option>
              <option value="new">{{ t('teacher.import_row_new') }}</option>
              <option value="existing">{{ t('teacher.import_row_existing') }}</option>
              <option value="duplicate">{{ t('teacher.import_row_duplicate') }}</option>
              <option value="invalid">{{ t('teacher.import_row_needs_review') }}</option>
              <option value="skipped">{{ t('teacher.import_row_skipped') }}</option>
            </select>
          </div>
          <p v-if="batch?.error_summary" class="alert alert-warning" role="alert">{{ batch.error_summary }}</p>
          <div class="table-responsive teacher-student-import__table-wrap">
            <table class="table table-sm teacher-student-import__table">
              <thead>
                <tr>
                  <th scope="col">{{ t('teacher.col_name') }}</th>
                  <th scope="col">{{ t('teacher.import_col_email') }}</th>
                  <th scope="col">{{ t('teacher.import_col_parent') }}</th>
                  <th scope="col">{{ t('teacher.col_status') }}</th>
                  <th scope="col"><span class="visually-hidden">{{ t('teacher.import_col_actions') }}</span></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in pagedFilteredRows" :key="row.id">
                  <tr :class="rowRowClass(row)">
                    <td>
                      <input
                        class="form-control form-control-sm"
                        :value="draftValue(row, 'name')"
                        :disabled="busy || row.status === 'skipped'"
                        @change="queueRowField(row, 'name', $event.target.value)"
                      >
                    </td>
                    <td>
                      <input
                        class="form-control form-control-sm"
                        type="email"
                        dir="ltr"
                        :value="draftValue(row, 'email')"
                        :disabled="busy || row.status === 'skipped'"
                        :aria-invalid="row.status === 'invalid' ? 'true' : undefined"
                        @change="queueRowField(row, 'email', $event.target.value)"
                      >
                    </td>
                    <td>
                      <input
                        class="form-control form-control-sm"
                        type="email"
                        dir="ltr"
                        :value="draftValue(row, 'parent_email')"
                        :disabled="busy || row.status === 'skipped'"
                        @change="queueRowField(row, 'parent_email', $event.target.value)"
                      >
                    </td>
                    <td>
                      <span class="teacher-student-import__badge" :class="`is-${rowKind(row)}`">{{ rowKindLabel(row) }}</span>
                      <ul v-if="row.errors?.length" class="teacher-meta mb-0 ps-3">
                        <li v-for="(issue, idx) in row.errors" :key="idx">{{ issue }}</li>
                      </ul>
                    </td>
                    <td class="text-end">
                      <button
                        v-if="row.status !== 'skipped'"
                        type="button"
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="busy"
                        @click="skipRow(row)"
                      >
                        {{ t('teacher.import_skip_row') }}
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <TeacherPagination
            :current-page="reviewPage"
            :page-count="reviewPageCount"
            :total="filteredRows.length"
            :loading="busy"
            summary-mode="rows"
            root-class="mt-2"
            @page="reviewPage = $event"
          />
        </template>
      </section>

      <section v-else :key="3" :aria-label="t('teacher.import_step_complete')">
        <div class="teacher-student-import__complete">
          <div class="teacher-student-import__complete-card">
            <div class="teacher-student-import__complete-icon" aria-hidden="true">
              <i class="bi bi-check-lg"></i>
            </div>
            <h3 class="teacher-student-import__complete-title">{{ t('teacher.import_complete_title') }}</h3>
            <p class="teacher-student-import__complete-lede">{{ t('teacher.import_complete_help') }}</p>
            <ul class="teacher-student-import__complete-grid list-unstyled mb-0">
              <li>
                <span class="teacher-student-import__complete-value">{{ completeImportedCount }}</span>
                <span class="teacher-student-import__complete-label">{{ t('teacher.import_count_imported') }}</span>
              </li>
              <li v-if="selectedGroupName">
                <span class="teacher-student-import__complete-value teacher-student-import__complete-value--text">{{ selectedGroupName }}</span>
                <span class="teacher-student-import__complete-label">{{ t('teacher.import_summary_class') }}</span>
              </li>
              <li v-if="skippedCount">
                <span class="teacher-student-import__complete-value">{{ skippedCount }}</span>
                <span class="teacher-student-import__complete-label">{{ t('teacher.import_count_skip') }}</span>
              </li>
            </ul>
            <p v-if="batch?.error_summary" class="alert alert-warning mb-0 mt-3" role="alert">{{ batch.error_summary }}</p>
          </div>
        </div>
      </section>
    </Transition>

    <template #footer>
      <button v-if="step === 2" type="button" class="btn btn-outline-secondary" :disabled="busy" @click="goToStep(1)">{{ t('teacher.plan_back_step') }}</button>
      <button v-if="step === 1" type="button" class="btn btn-primary" :disabled="stepOnePrimaryDisabled" @click="stepOnePrimary">
        <span v-if="busy && !batch" class="dash-spinner me-2" aria-hidden="true"></span>
        {{ stepOnePrimaryLabel }}
      </button>
      <button v-else-if="step === 2" type="button" class="btn btn-primary" :disabled="busy || !canCommit" @click="confirmImport">
        {{ t('teacher.import_confirm') }}
      </button>
      <template v-else-if="step === 3">
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="restart">{{ t('teacher.import_another') }}</button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="finish">{{ t('teacher.import_view_students') }}</button>
      </template>
      <button type="button" class="btn btn-link" :disabled="busy" @click="requestCancel">{{ t('teacher.import_cancel') }}</button>
    </template>
  </TeacherDialog>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { teacherErrorMessage } from '../../scripts/teacher/errors'
import TeacherDialog from './TeacherDialog.vue'
import TeacherPagination from './TeacherPagination.vue'
import { tablePageCount, tablePageSlice } from '../../scripts/teacher/tablePagination.js'

const STORAGE_KEY = 'mutqin.teacher.studentImport.batchId'
const IMPORT_TABLE_PAGE_SIZE = 25
const PROCESSING = new Set(['uploaded', 'processing', 'importing'])

export default {
  name: 'TeacherStudentImportWizard',
  components: { TeacherDialog, TeacherPagination },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    groups: { type: Array, default: () => [] },
    defaultGroupId: { type: [Number, String], default: null },
    resumeBatchId: { type: [Number, String], default: null },
  },
  emits: ['close', 'finished', 'view-students', 'invite'],
  data() {
    return {
      step: 1,
      groupId: null,
      pendingFiles: [],
      dragOver: false,
      batch: null,
      formats: null,
      busy: false,
      error: '',
      pollTimer: null,
      rowQuery: '',
      rowFilter: 'all',
      rowDrafts: {},
      rowSaveTimers: {},
      previewPage: 1,
      reviewPage: 1,
    }
  },
  computed: {
    groupChoices() {
      return (this.groups || []).filter((group) => Number(group.id) > 0)
    },
    selectedGroupName() {
      const match = this.groupChoices.find((group) => Number(group.id) === Number(this.groupId))
      return match?.name || this.batch?.learning_group_name || ''
    },
    stepItems() {
      return [
        { id: 1, label: this.t('teacher.import_step_upload') },
        { id: 2, label: this.t('teacher.import_step_review') },
        { id: 3, label: this.t('teacher.import_step_complete') },
      ]
    },
    dialogTitle() {
      return this.stepItems.find((item) => item.id === this.step)?.label || this.t('teacher.import_title')
    },
    acceptList() {
      const extensions = this.formats?.extensions || ['.csv', '.xlsx', '.json', '.txt', '.pdf']
      return extensions.map((ext) => (String(ext).startsWith('.') ? ext : `.${ext}`)).join(',')
    },
    formatSummary() {
      const extensions = this.formats?.extensions || []
      return extensions.slice(0, 6).join(', ') || 'CSV, Excel, JSON'
    },
    rows() {
      return Array.isArray(this.batch?.rows) ? this.batch.rows : []
    },
    previewPageCount() {
      return tablePageCount(this.rows.length, IMPORT_TABLE_PAGE_SIZE)
    },
    pagedPreviewRows() {
      return tablePageSlice(this.rows, this.previewPage, IMPORT_TABLE_PAGE_SIZE)
    },
    reviewPageCount() {
      return tablePageCount(this.filteredRows.length, IMPORT_TABLE_PAGE_SIZE)
    },
    pagedFilteredRows() {
      return tablePageSlice(this.filteredRows, this.reviewPage, IMPORT_TABLE_PAGE_SIZE)
    },
    processingDone() {
      return this.isBatchProcessingDone(this.batch)
    },
    progressBarStyle() {
      if (!this.processingDone) return {}
      const pct = Math.min(100, Math.max(8, Number(this.batch?.progress_percent) || 0))
      return { width: `${pct}%` }
    },
    canStartUpload() {
      if (this.batch && !this.processingDone) return false
      if (!this.groupId) return false
      return this.pendingFiles.length > 0
    },
    canContinueReview() {
      return this.processingDone && this.rows.length > 0
    },
    canCommit() {
      return this.reviewSummary.create + this.reviewSummary.update > 0
    },
    reviewSummary() {
      const summary = { total: 0, create: 0, update: 0, needsAttention: 0 }
      this.rows.forEach((row) => {
        if (row.status === 'skipped') return
        summary.total += 1
        if (row.status !== 'valid') {
          summary.needsAttention += 1
          return
        }
        if (row.matched_user_id) summary.update += 1
        else summary.create += 1
      })
      return summary
    },
    processingLabel() {
      if (!this.batch) return ''
      if (this.batch.status === 'completed') return this.t('teacher.import_status_completed')
      if (this.batch.status === 'failed') return this.t('teacher.import_status_failed')
      if (PROCESSING.has(this.batch.status)) return this.t('teacher.import_status_processing')
      return this.t('teacher.import_status_ready')
    },
    duplicateEmails() {
      const counts = new Map()
      this.rows.forEach((row) => {
        const email = String(row.normalized?.email || '').trim().toLowerCase()
        if (!email) return
        counts.set(email, (counts.get(email) || 0) + 1)
      })
      return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([email]) => email))
    },
    filteredRows() {
      const query = this.rowQuery.trim().toLowerCase()
      return this.rows.filter((row) => {
        const kind = this.rowKind(row)
        if (this.rowFilter !== 'all' && this.rowFilter !== kind) return false
        if (!query) return true
        const haystack = [
          row.normalized?.name,
          row.normalized?.email,
          row.normalized?.parent_email,
        ].map((part) => String(part || '').toLowerCase()).join(' ')
        return haystack.includes(query)
      })
    },
    skippedCount() {
      return this.rows.filter((row) => row.status === 'skipped').length
    },
    completeImportedCount() {
      const fromRows = this.rows.filter((row) => row.status === 'imported').length
      return fromRows > 0 ? fromRows : Number(this.batch?.rows_imported ?? 0)
    },
    discardDirty() {
      if (this.step >= 3) return false
      return Boolean(
        this.pendingFiles.length
        || Object.keys(this.rowDrafts).length
        || (this.batch && this.batch.status !== 'completed'),
      )
    },
    stepOnePrimaryDisabled() {
      if (this.busy) return true
      if (this.batch && !this.processingDone) return true
      if (this.batch && this.processingDone) return !this.rows.length
      return !this.canStartUpload
    },
    stepOnePrimaryLabel() {
      if (this.batch && !this.processingDone) return this.t('teacher.import_processing')
      if (this.batch && this.processingDone) return this.t('teacher.plan_next')
      return this.t('teacher.import_start')
    },
  },
  watch: {
    open(value) {
      if (value) this.onOpen()
      else this.resetWizard()
    },
    defaultGroupId(value) {
      if (value && !this.groupId) this.groupId = Number(value)
    },
    rowQuery() { this.reviewPage = 1 },
    rowFilter() { this.reviewPage = 1 },
    rows() {
      this.previewPage = 1
      this.reviewPage = 1
    },
  },
  beforeUnmount() {
    this.clearPoll()
    Object.values(this.rowSaveTimers).forEach((timer) => clearTimeout(timer))
  },
  methods: {
    formatFileSize(bytes) {
      const size = Number(bytes) || 0
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    },
    isBatchProcessingDone(batch) {
      if (!batch) return false
      if (PROCESSING.has(batch.status)) return false
      const files = Array.isArray(batch.files) ? batch.files : []
      return !files.some((file) => String(file.status || '') === 'pending')
    },
    batchNeedsRowHydration(batch) {
      if (!batch?.id) return false
      if (!this.isBatchProcessingDone(batch)) return false
      if (Array.isArray(batch.rows) && batch.rows.length > 0) return false
      const total = Number(batch.rows_total || 0)
      return total > 0 || batch.files?.some((file) => String(file.status) === 'parsed')
    },
    async hydrateBatchRows(batchId, payload = null) {
      let current = payload
      if (!current) {
        current = await learningApi.getTeacherStudentImport(batchId)
      }
      if (!this.isBatchProcessingDone(current)) {
        current = await learningApi.processTeacherStudentImport(batchId)
      }
      if (this.batchNeedsRowHydration(current)) {
        current = await learningApi.getTeacherStudentImport(batchId)
      }
      return current
    },
    async ensureBatchProcessed(batchId, payload) {
      return this.hydrateBatchRows(batchId, payload)
    },
    async onOpen() {
      this.error = ''
      if (!this.groupId) {
        this.groupId = Number(this.defaultGroupId)
          || Number(this.groupChoices[0]?.id)
          || null
      }
      if (!this.formats) {
        try {
          this.formats = await learningApi.getTeacherStudentImportFormats()
        } catch {
          this.formats = { extensions: ['csv', 'xlsx', 'json', 'txt'] }
        }
      }
      const resumeId = Number(this.resumeBatchId) || 0
      if (resumeId > 0) await this.resumeBatch(resumeId)
    },
    readStoredBatchId() {
      try {
        return Number(window.localStorage.getItem(STORAGE_KEY)) || null
      } catch {
        return null
      }
    },
    storeBatchId(id) {
      try {
        if (id) window.localStorage.setItem(STORAGE_KEY, String(id))
        else window.localStorage.removeItem(STORAGE_KEY)
      } catch { /* Storage is optional. */ }
    },
    stepClass(id) {
      return {
        'is-current': this.step === id,
        'is-done': this.step > id,
      }
    },
    canJumpToStep(id) {
      if (id === 1) return true
      if (id === 2) return this.batch && this.processingDone && this.rows.length > 0
      if (id === 3) return this.batch?.status === 'completed'
      return false
    },
    goToStep(id) {
      if (!this.canJumpToStep(id)) return
      this.error = ''
      this.step = id
    },
    openFilePicker() {
      if (this.busy || this.batch) return
      this.$refs.fileInput?.click()
    },
    onFileInput(event) {
      this.addFiles([...(event.target.files || [])])
      event.target.value = ''
    },
    onDrop(event) {
      this.dragOver = false
      if (this.busy || this.batch) return
      this.addFiles([...(event.dataTransfer?.files || [])])
    },
    addFiles(files) {
      const maxFiles = Number(this.formats?.limits?.max_files_per_batch || 10)
      const maxBytes = Number(this.formats?.limits?.max_file_bytes || 10 * 1024 * 1024)
      const next = [...this.pendingFiles]
      files.forEach((file) => {
        if (next.length >= maxFiles) return
        if (file.size > maxBytes) {
          this.error = this.t('teacher.import_file_too_large')
          return
        }
        next.push(file)
      })
      this.pendingFiles = next
      this.error = ''
    },
    removePendingFile(index) {
      this.pendingFiles = this.pendingFiles.filter((_, i) => i !== index)
    },
    async stepOnePrimary() {
      if (this.batch && this.processingDone) {
        if (!this.rows.length) {
          this.busy = true
          try {
            this.batch = await learningApi.getTeacherStudentImport(this.batch.id)
          } catch (err) {
            this.error = teacherErrorMessage(err, this.t)
          } finally {
            this.busy = false
          }
        }
        if (this.rows.length) this.goToStep(2)
        return
      }
      this.startUpload()
    },
    async startUpload() {
      if (!this.canStartUpload || this.busy) return
      this.busy = true
      this.error = ''
      try {
        let payload = await learningApi.createTeacherStudentImport(this.groupId, {
          files: this.pendingFiles,
        })
        payload = await this.ensureBatchProcessed(payload.id, payload)
        this.batch = payload
        this.pendingFiles = []
        this.storeBatchId(payload.id)
        if (this.processingDone) {
          this.step = payload.status === 'completed' ? 3 : 2
        } else {
          this.step = 1
          this.startPoll()
        }
      } catch (err) {
        this.error = teacherErrorMessage(err, this.t)
      } finally {
        this.busy = false
      }
    },
    async resumeBatch(batchId) {
      if (!batchId) return
      this.busy = true
      try {
        let payload = await learningApi.getTeacherStudentImport(batchId)
        if (!this.isBatchProcessingDone(payload)) {
          payload = await this.ensureBatchProcessed(batchId, payload)
        }
        this.batch = payload
        this.groupId = Number(payload.learning_group_id) || this.groupId
        if (payload.status === 'completed') this.step = 3
        else if (this.processingDone) this.step = 2
        else {
          this.step = 1
          this.startPoll()
        }
      } catch {
        this.storeBatchId(null)
      } finally {
        this.busy = false
      }
    },
    startPoll() {
      this.clearPoll()
      this.pollTimer = window.setInterval(() => this.refreshBatch(), 2000)
      this.refreshBatch()
    },
    clearPoll() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    async refreshBatch() {
      if (!this.batch?.id) return
      try {
        let payload = await learningApi.getTeacherStudentImport(this.batch.id)
        if (!this.isBatchProcessingDone(payload)) {
          payload = await this.ensureBatchProcessed(this.batch.id, payload)
        }
        this.batch = payload
        if (this.processingDone) {
          this.clearPoll()
          if (payload.status === 'completed') {
            this.step = 3
            this.storeBatchId(null)
            this.$emit('finished', payload)
          } else if (this.step === 1) this.step = 2
        }
      } catch (err) {
        this.error = teacherErrorMessage(err, this.t)
        this.clearPoll()
      }
    },
    draftValue(row, field) {
      const draft = this.rowDrafts[row.id]
      if (draft && Object.prototype.hasOwnProperty.call(draft, field)) return draft[field]
      return row.normalized?.[field] || ''
    },
    queueRowField(row, field, value) {
      this.rowDrafts = {
        ...this.rowDrafts,
        [row.id]: { ...(this.rowDrafts[row.id] || {}), [field]: value },
      }
      if (this.rowSaveTimers[row.id]) clearTimeout(this.rowSaveTimers[row.id])
      this.rowSaveTimers[row.id] = setTimeout(() => this.saveRow(row.id), 500)
    },
    async saveRow(rowId) {
      const draft = this.rowDrafts[rowId]
      if (!draft || !this.batch?.id) return
      this.busy = true
      try {
        const payload = await learningApi.updateTeacherStudentImportRow(this.batch.id, rowId, draft)
        this.batch = payload
        const nextDrafts = { ...this.rowDrafts }
        delete nextDrafts[rowId]
        this.rowDrafts = nextDrafts
      } catch (err) {
        this.error = teacherErrorMessage(err, this.t)
      } finally {
        this.busy = false
      }
    },
    async skipRow(row) {
      if (!this.batch?.id || this.busy) return
      this.busy = true
      try {
        this.batch = await learningApi.skipTeacherStudentImportRow(this.batch.id, row.id)
      } catch (err) {
        this.error = teacherErrorMessage(err, this.t)
      } finally {
        this.busy = false
      }
    },
    rowKind(row) {
      if (row.status === 'skipped') return 'skipped'
      if (row.status === 'invalid') return 'invalid'
      const email = String(row.normalized?.email || '').trim().toLowerCase()
      if (email && this.duplicateEmails.has(email)) return 'duplicate'
      if (row.matched_user_id) return 'existing'
      return 'new'
    },
    rowKindLabel(row) {
      const key = `teacher.import_row_${this.rowKind(row)}`
      return this.t(key)
    },
    rowRowClass(row) {
      return {
        'is-invalid-row': row.status === 'invalid',
        'is-duplicate-row': this.rowKind(row) === 'duplicate',
      }
    },
    fileStatusLabel(status) {
      return this.t(`teacher.import_file_${status}`, status)
    },
    async confirmImport() {
      if (!this.batch?.id || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const payload = await learningApi.commitTeacherStudentImport(this.batch.id, {
          runAsync: this.reviewSummary.create + this.reviewSummary.update > 50,
        })
        if (payload.queued) {
          this.startPoll()
        } else {
          this.batch = payload
          this.step = 3
          this.storeBatchId(null)
          this.$emit('finished', payload)
        }
      } catch (err) {
        this.error = teacherErrorMessage(err, this.t)
      } finally {
        this.busy = false
      }
    },
    restart() {
      this.resetWizard()
    },
    resetWizard() {
      this.clearPoll()
      Object.values(this.rowSaveTimers).forEach((timer) => clearTimeout(timer))
      this.rowSaveTimers = {}
      this.batch = null
      this.pendingFiles = []
      this.rowDrafts = {}
      this.rowQuery = ''
      this.rowFilter = 'all'
      this.previewPage = 1
      this.reviewPage = 1
      this.dragOver = false
      this.step = 1
      this.error = ''
      this.busy = false
      this.storeBatchId(null)
    },
    finish() {
      const payload = this.batch
      this.$emit('finished', payload)
      this.$emit('view-students')
      this.$emit('close')
    },
    requestCancel() {
      this.$refs.dialog?.requestClose()
    },
  },
}
</script>