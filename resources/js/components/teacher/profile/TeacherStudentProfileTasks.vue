<template>
  <section class="teacher-student-tasks" :aria-label="t('teacher.student_tasks_title')">
    <p v-if="!ready" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
    <header v-else class="teacher-student-tasks__head">
      <div class="teacher-student-tasks__intro">
        <h2>{{ t('teacher.student_tasks_title') }}</h2>
      </div>
      <div v-if="taskRows.length" class="teacher-student-tasks__filters" role="group" :aria-label="t('teacher.task_filter_label')">
        <button
          v-for="filter in progressFilters"
          :key="filter.id"
          type="button"
          :class="['is-' + filter.id, { 'is-active': activeFilter === filter.id }]"
          :aria-pressed="activeFilter === filter.id ? 'true' : 'false'"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}<span>{{ filter.count }}</span>
        </button>
        <button
          type="button"
          class="is-due"
          :class="{ 'is-active': activeFilter === 'overdue' }"
          :aria-pressed="activeFilter === 'overdue' ? 'true' : 'false'"
          :title="t('teacher.task_overdue_filter_help')"
          @click="activeFilter = 'overdue'"
        >
          {{ t('teacher.task_filter_overdue') }}<span>{{ counts.overdue }}</span>
        </button>
      </div>
    </header>

    <div v-if="ready" class="teacher-student-tasks__list">
      <p v-if="missingTask" class="teacher-student-tasks__alert" role="status">{{ t('teacher.task_missing') }}</p>
      <p v-if="taskRows.length && !visibleRows.length" class="teacher-student-tasks__empty">{{ t('teacher.no_tasks_in_filter') }}</p>
      <div v-else-if="!taskRows.length" class="teacher-empty-panel teacher-empty-with-action">
        <TeacherEmpty inline icon="bi bi-clipboard-check" :message="t('teacher.student_tasks_empty')" />
        <button type="button" class="btn btn-primary btn-sm" @click="$emit('assign-revision', profile.student)">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>{{ t('teacher.assign_task') }}
        </button>
      </div>
      <ul v-else class="teacher-student-tasks__rows">
        <li v-for="row in visibleRows" :key="row.key">
          <article class="teacher-student-tasks__row" :class="{ 'is-selected': String(row.key) === String(selectedTaskKey) }">
            <button type="button" class="teacher-student-tasks__open" @click="chooseTask(row.key)">
              <strong><i :class="row.icon" aria-hidden="true"></i>{{ row.title }}</strong>
              <span v-if="row.instructions" class="teacher-student-tasks__note">{{ row.instructions }}</span>
            </button>
            <div class="teacher-student-tasks__pills">
              <span class="teacher-fact teacher-fact--neutral">{{ row.typeLabel }}</span>
              <span class="teacher-fact" :class="row.overdue ? 'teacher-fact--danger' : 'teacher-fact--warn'">{{ row.due }}</span>
              <span v-if="row.progress" class="teacher-fact teacher-fact--info">{{ row.progress }}</span>
              <span class="teacher-badge" :class="`teacher-badge--${row.tone}`">{{ row.statusLabel }}</span>
            </div>
            <div class="teacher-student-tasks__row-actions">
              <button v-if="row.overdue" type="button" class="btn btn-sm btn-outline-secondary" @click="remindRow = row">
                {{ reminded[row.key] ? t('teacher.task_reminded') : t('teacher.task_remind') }}
              </button>
              <button type="button" class="btn btn-sm" :class="row.primary === 'view' ? 'btn-outline-secondary' : 'btn-primary'" @click="runPrimary(row)">
                {{ row.primaryLabel }}
              </button>
            </div>
          </article>
        </li>
      </ul>
    </div>

    <TeacherDialog
      :open="Boolean(selectedAssignment)"
      :title="selectedTitle"
      size="lg"
      :close-label="t('teacher.close')"
      @close="closeTask"
    >
    <article v-if="selectedAssignment" class="teacher-student-tasks__detail" :aria-label="selectedTitle">
      <header class="teacher-student-tasks__detail-head">
        <p class="teacher-student-tasks__type"><i :class="selectedView.icon" aria-hidden="true"></i>{{ selectedView.typeLabel }}</p>
        <div class="teacher-student-tasks__status">
          <span class="teacher-badge" :class="`teacher-badge--${selectedView.tone}`">{{ selectedView.statusLabel }}</span>
          <span v-if="selectedView.showOverdueBadge" class="teacher-badge teacher-badge--danger">{{ t('teacher.overdue') }}</span>
        </div>
      </header>

      <dl class="teacher-student-tasks__facts">
        <div>
          <dt><i class="bi bi-person" aria-hidden="true"></i>{{ t('teacher.student') }}</dt>
          <dd>{{ profile.student.name }}</dd>
        </div>
        <div>
          <dt><i class="bi bi-calendar-event" aria-hidden="true"></i>{{ t('teacher.due') }}</dt>
          <dd>{{ selectedDue }}</dd>
        </div>
        <div v-if="selectedView.progress">
          <dt><i class="bi bi-bullseye" aria-hidden="true"></i>{{ selectedView.requirementLabel }}</dt>
          <dd>
            {{ selectedView.progress }}
            <p class="text-body-secondary small mb-0">{{ selectedView.requirementHelp }}</p>
          </dd>
        </div>
      </dl>

      <div v-if="selectedInstructions" class="teacher-student-tasks__instructions">
        <span>{{ t('teacher.assignment_instructions_label') }}</span>
        <p>{{ selectedInstructions }}</p>
      </div>
      <p v-if="learningPlanLabel" class="teacher-student-tasks__plan">
        <span>{{ learningPlanLabel }}</span>
        <button type="button" class="btn btn-link btn-sm" @click="$emit('open-plan')">{{ t('teacher.task_open_plan') }}</button>
      </p>

      <section v-if="selectedSelfAssessment" class="teacher-student-tasks__self-assessment" :aria-label="t('teacher.assignment_self_assessment')">
        <div>
          <span>{{ t('teacher.assignment_self_assessment') }}</span>
          <strong>{{ selfAssessmentFeelingLabel(selectedSelfAssessment.feeling) }}</strong>
          <p v-if="selectedSelfAssessment.note || selectedSelfAssessment.help_request">{{ selectedSelfAssessment.note || selectedSelfAssessment.help_request }}</p>
          <small>{{ t('teacher.assignment_self_assessment_score_note') }}</small>
        </div>
        <button
          v-if="['difficult', 'need_help'].includes(selectedSelfAssessment.feeling)"
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="$emit('assign-revision', assessmentRevisionPayload)"
        >{{ t('teacher.assignment_self_assessment_assign_revision') }}</button>
      </section>

      <section class="teacher-student-tasks__submissions">
        <h4>{{ t('teacher.task_submissions') }}</h4>
        <p v-if="!submissions.length" class="teacher-student-tasks__empty">{{ t('teacher.task_no_submission') }}</p>
        <ul v-else>
          <li v-for="submission in submissions" :key="submission.id">
            <p class="teacher-student-tasks__submission-meta">
              <strong>{{ submission.when }}</strong>
              <template v-if="submission.score !== null">
                <br>
                <span class="teacher-fact" :class="submission.score >= 85 ? 'teacher-fact--good' : (submission.score >= 65 ? 'teacher-fact--warn' : 'teacher-fact--danger')">{{ submission.score }}%</span>
              </template>
              <template v-else-if="submission.match">
                <br>
                <span class="teacher-fact teacher-fact--info">{{ t('teacher.task_words_matched', submission.match) }}</span>
              </template>
            </p>
            <TeacherAudioFeedbackPlayer
              v-if="submission.audio?.available && submission.audio?.url"
              :src="submission.audio.url"
              :duration-ms="submission.audio.duration_ms"
              compact
            />
            <p v-else class="teacher-student-tasks__empty">{{ t('teacher.task_no_recording') }}</p>
            <button v-if="submission.attemptId && !sameReview(submission.attemptId)" type="button" class="btn btn-outline-secondary btn-sm" @click="openReview(submission.attemptId)">
              {{ t('teacher.task_review_submission') }}
            </button>
          </li>
        </ul>
      </section>

      <TeacherTaskConversation
        v-if="selectedMessages.length"
        id="teacher-task-feedback"
        :messages="selectedMessages"
        variant="teacher"
        viewer-role="teacher"
        :compose="false"
      />

      <p v-if="actionError" class="teacher-student-tasks__alert" role="alert">{{ actionError }}</p>
      <p v-else-if="actionNotice" class="teacher-student-tasks__notice" role="status">{{ actionNotice }}</p>

      <form v-if="rescheduleOpen" class="teacher-student-tasks__reschedule" @submit.prevent="saveDueDate">
        <label :for="dueFieldId">{{ t('teacher.due') }}</label>
        <input :id="dueFieldId" v-model="dueDraft" type="date" required>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="actionBusy === 'due' || !dueDraft">{{ t('teacher.task_reschedule_save') }}</button>
      </form>

      <div class="teacher-student-tasks__actions">
        <button v-if="returnToMessages" type="button" class="btn btn-outline-secondary btn-sm" @click="backToConversation">{{ t('teacher.task_back_to_messages') }}</button>
        <button v-if="canReviewSubmission" type="button" class="btn btn-primary btn-sm" @click="openReview(reviewAttemptId)">{{ t('teacher.task_review_submission') }}</button>
        <button v-if="canGiveFeedback" type="button" class="btn btn-outline-secondary btn-sm" :aria-expanded="composing ? 'true' : 'false'" @click="toggleFeedback">{{ t('teacher.task_give_feedback') }}</button>
        <button v-if="canViewFeedback" type="button" class="btn btn-outline-secondary btn-sm" @click="showFeedback">{{ t('teacher.task_view_feedback') }}</button>
        <button v-if="canRequestRevision" type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(actionBusy)" @click="requestRevision">{{ t('teacher.task_request_revision') }}</button>
        <button v-if="canComplete" type="button" class="btn btn-outline-secondary btn-sm" :disabled="Boolean(actionBusy)" @click="markComplete">{{ t('teacher.task_mark_complete') }}</button>
        <button v-if="canEdit" type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('edit-task', selectedAssignment)">{{ t('teacher.task_edit') }}</button>
        <button v-if="canEdit" type="button" class="btn btn-outline-secondary btn-sm" @click="toggleReschedule">{{ t('teacher.task_reschedule') }}</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-messages', messageContext)">{{ t('teacher.task_message_about') }}</button>
      </div>
    </article>
    </TeacherDialog>

    <TeacherDialog
      class="teacher-feedback-dialog"
      :open="composing"
      :title="t('teacher.task_give_feedback')"
      :eyebrow="selectedTitle"
      size="md"
      compact
      :dirty="feedbackUnsent"
      :close-label="t('teacher.close')"
      @close="composing = false"
    >
      <TeacherAudioFeedbackComposer
        v-if="composerReady && selectedAssignment"
        :key="selectedAssignment.id"
        ref="composer"
        :show-heading="false"
        :show-history="false"
        :messages="selectedMessages"
        :student-id="profile.student.id"
        :recipient-id="selectedAssignment.id"
        :assignment-id="selectedAssignment.assignment?.id"
        :surah-number="selectedAssignment.assignment?.surah_number"
        :ayah-start="selectedAssignment.assignment?.ayah_start"
        :ayah-end="selectedAssignment.assignment?.ayah_end"
        @sent="onFeedbackSent"
        @draft-change="onDraftChange"
      />
    </TeacherDialog>

    <TeacherRecitationPlaybackReview
      :open="Boolean(playbackAttemptId)"
      :student-id="profile.student.id"
      :attempt-id="playbackAttemptId"
      @close="playbackAttemptId = null"
      @reviewed="onReviewed"
    />

    <TeacherTaskReminder
      :open="Boolean(remindRow)"
      :student-name="profile.student?.name || ''"
      :task-title="remindRow?.title || ''"
      :due-label="remindRow?.due || ''"
      :due-at="remindRow?.source?.assignment?.due_at || ''"
      :recipient-id="remindRow?.key || null"
      @close="remindRow = null"
      @sent="onReminded"
    />

    <TeacherDialog :open="pendingTaskId !== null || pendingClose" :title="t('teacher.unsaved_changes')" size="sm" :close-label="t('teacher.close')" @close="cancelPending">
      <p>{{ t('teacher.unsaved_changes') }}</p>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="cancelPending">{{ t('teacher.keep_editing') }}</button>
        <button type="button" class="btn btn-danger" @click="discardAndSwitch">{{ t('teacher.discard_changes') }}</button>
      </template>
    </TeacherDialog>
  </section>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import { assignmentAttemptHelp, assignmentProgressLabel, assignmentRequirementLabel } from '../../../scripts/teacher/formatters'
import { normaliseTeacherWordStatus } from '../../../scripts/teacher/wordReviewClass'
import { assignmentDisplayLabel } from '../../../scripts/teacher/taskTypes'
import {
  resolveDisplayTaskState,
  resolveTaskLifecycle,
  studentTaskMatchesFilter,
  summarizeStudentTaskCounts,
  taskIsOverdue,
  taskLifecycleTone,
  taskStateLabelKey,
  TASK_LIFECYCLE,
} from '../../../scripts/teacher/taskState'
import TeacherAudioFeedbackComposer from '../TeacherAudioFeedbackComposer.vue'
import TeacherAudioFeedbackPlayer from '../TeacherAudioFeedbackPlayer.vue'
import TeacherDialog from '../TeacherDialog.vue'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecitationPlaybackReview from '../TeacherRecitationPlaybackReview.vue'
import TeacherTaskConversation from '../TeacherTaskConversation.vue'
import TeacherTaskReminder from '../TeacherTaskReminder.vue'

export default {
  name: 'TeacherStudentProfileTasks',
  components: {
    TeacherAudioFeedbackComposer,
    TeacherAudioFeedbackPlayer,
    TeacherDialog,
    TeacherEmpty,
    TeacherRecitationPlaybackReview,
    TeacherTaskConversation,
    TeacherTaskReminder,
  },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
    focusTaskId: { type: [Number, String], default: null },
    initialFilter: { type: String, default: '' },
    ready: { type: Boolean, default: true },
    returnToMessages: { type: Boolean, default: false },
  },
  emits: ['assign-revision', 'refresh', 'edit-task', 'open-messages', 'open-plan', 'unsent-change', 'return-to-messages'],
  data() {
    return {
      activeFilter: 'all',
      selectedTaskKey: null,
      composing: false,
      composerReady: false,
      feedbackUnsent: false,
      rescheduleOpen: false,
      dueDraft: '',
      actionBusy: '',
      actionError: '',
      actionNotice: '',
      playbackAttemptId: null,
      filterReady: false,
      pendingTaskId: null,
      pendingClose: false,
      missingTask: false,
      remindRow: null,
      reminded: {},
      dueFieldId: `teacher-task-due-${Math.random().toString(36).slice(2, 8)}`,
    }
  },
  computed: {
    assignments() {
      return this.profile.payload?.assignments || []
    },
    counts() {
      return summarizeStudentTaskCounts(this.assignments)
    },
    progressFilters() {
      return [
        { id: 'all', label: this.t('teacher.task_filter_all'), count: this.counts.all },
        { id: 'todo', label: this.t('teacher.task_filter_todo'), count: this.counts.todo },
        { id: 'submitted', label: this.t('teacher.task_filter_submitted'), count: this.counts.submitted },
        { id: 'needs_review', label: this.t('teacher.task_state_waiting_review'), count: this.counts.needs_review },
        { id: 'completed', label: this.t('teacher.task_state_done'), count: this.counts.completed },
      ]
    },
    taskRows() {
      return this.assignments.map((item) => this.presentRow(item))
    },
    visibleRows() {
      return this.taskRows.filter((row) => studentTaskMatchesFilter(row.source, this.activeFilter))
    },
    selectedAssignment() {
      return this.assignments.find((item) => String(item.id) === String(this.selectedTaskKey)) || null
    },
    selectedView() {
      return this.selectedAssignment ? this.presentRow(this.selectedAssignment) : null
    },
    selectedTitle() {
      return this.selectedView?.title || ''
    },
    selectedDue() {
      const due = this.selectedAssignment?.assignment?.due_at
      return due ? this.formatWhen(due) : this.t('teacher.no_due_date')
    },
    selectedInstructions() {
      return String(this.selectedAssignment?.assignment?.feedback || '').trim()
    },
    selectedMessages() {
      return this.selectedAssignment?.messages || []
    },
    submissions() {
      return this.submissionRows(this.selectedAssignment)
    },
    reviewAttemptId() {
      return this.submissions.find((submission) => submission.attemptId)?.attemptId || null
    },
    lifecycle() {
      return this.selectedAssignment ? resolveTaskLifecycle(this.selectedAssignment) : ''
    },
    canEdit() {
      const item = this.selectedAssignment
      if (!item) return false
      return this.lifecycle === TASK_LIFECYCLE.NOT_STARTED
        && !item.started_at
        && !item.student_submitted_at
        && !item.evidence?.attempt_id
    },
    canComplete() {
      return Boolean(this.selectedAssignment?.student_submitted_at) && this.lifecycle !== TASK_LIFECYCLE.COMPLETED
    },
    canRequestRevision() {
      return this.canComplete && this.lifecycle !== TASK_LIFECYCLE.REVISION_REQUESTED
    },
    hasSubmission() {
      return this.submissions.length > 0
    },
    reviewableLifecycle() {
      return [TASK_LIFECYCLE.SUBMITTED, TASK_LIFECYCLE.NEEDS_REVIEW, TASK_LIFECYCLE.REVISION_REQUESTED].includes(this.lifecycle)
    },
    canReviewSubmission() {
      return this.reviewableLifecycle && Boolean(this.reviewAttemptId)
    },
    canGiveFeedback() {
      return this.reviewableLifecycle && this.hasSubmission
    },
    canViewFeedback() {
      return this.lifecycle === TASK_LIFECYCLE.COMPLETED && this.selectedMessages.length > 0
    },
    learningPlanLabel() {
      const plan = this.profile?.meta?.learning_plan
      if (!plan?.title && !plan?.status) return ''
      return plan.title || ''
    },
    selectedSelfAssessment() {
      return this.selectedAssignment?.self_assessment || null
    },
    assessmentRevisionPayload() {
      const assignment = this.selectedAssignment?.assignment || {}
      return {
        id: Number(this.profile?.student?.id || 0),
        activity: 'revision',
        hifz_category: assignment.hifz_category === 'manzil' ? 'manzil' : 'sabqi',
        weak_example: {
          surah_number: Number(assignment.surah_number || 0),
          ayah_number: Number(assignment.ayah_start || 0),
          ayah_start: Number(assignment.ayah_start || 0),
          ayah_end: Number(assignment.ayah_end || assignment.ayah_start || 0),
        },
      }
    },
    messageContext() {
      return {
        recipientId: this.selectedAssignment?.id || null,
        assignmentId: this.selectedAssignment?.assignment?.id || null,
        title: this.selectedTitle,
      }
    },
  },
  watch: {
    'profile.student.id'() {
      this.activeFilter = 'all'
      this.selectedTaskKey = null
      this.composing = false
      this.feedbackUnsent = false
      this.reportUnsent()
    },
    focusTaskId: {
      immediate: true,
      handler() { this.openFocusedTask(true) },
    },
    assignments() { this.openFocusedTask(false) },
    initialFilter: {
      immediate: true,
      handler(value) {
        if (value) this.activeFilter = value
      },
    },
    feedbackUnsent() { this.reportUnsent() },
    rescheduleOpen() { this.reportUnsent() },
    dueDraft() { this.reportUnsent() },
  },
  methods: {
    sameReview(attemptId) {
      return this.canReviewSubmission && String(attemptId) === String(this.reviewAttemptId)
    },
    reportUnsent() {
      const dueChanged = this.rescheduleOpen && this.dueDraft && this.dueDraft !== this.currentDueValue()
      this.$emit('unsent-change', Boolean(this.feedbackUnsent || dueChanged))
    },
    presentRow(item) {
      const assignment = item.assignment || {}
      const lifecycle = resolveTaskLifecycle(item)
      const submitted = Boolean(item.student_submitted_at || item.evidence?.attempt_id || (Array.isArray(item.attempts) && item.attempts.length))
      let primary = 'view'
      if (lifecycle === TASK_LIFECYCLE.COMPLETED) primary = 'results'
      else if (lifecycle === TASK_LIFECYCLE.IN_PROGRESS) primary = 'progress'
      else if (lifecycle === TASK_LIFECYCLE.NEEDS_REVIEW && item.evidence?.attempt_id) primary = 'review'
      else if (submitted && (lifecycle === TASK_LIFECYCLE.NEEDS_REVIEW || lifecycle === TASK_LIFECYCLE.SUBMITTED || lifecycle === TASK_LIFECYCLE.REVISION_REQUESTED)) primary = 'feedback'
      const assigned = assignment.created_at ? this.t('teacher.task_assigned_on', { date: this.formatWhen(assignment.created_at) }) : ''
      const due = assignment.due_at ? this.t('teacher.task_due_date', { date: this.formatWhen(assignment.due_at) }) : this.t('teacher.no_due_date')
      return {
        key: item.id,
        source: item,
        icon: assignment.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text',
        typeLabel: assignmentDisplayLabel(assignment, this.t.bind(this)),
        title: `${assignment.surah_name || this.t('teacher.surah')} ${assignment.ayah_start}–${assignment.ayah_end}`,
        assigned,
        due,
        meta: [assigned, due].filter(Boolean).join(' · '),
        instructions: String(assignment.feedback || '').trim(),
        progress: item.progress ? assignmentProgressLabel(item, this.t.bind(this)) : '',
        requirementLabel: assignmentRequirementLabel(assignment, this.t.bind(this)),
        requirementHelp: assignmentAttemptHelp(item, this.t.bind(this)),
        tone: taskLifecycleTone(lifecycle),
        statusLabel: item.review_state === 'needs_correction'
          ? this.t('teacher.status_needs_correction')
          : this.t(taskStateLabelKey(resolveDisplayTaskState(item))),
        showOverdueBadge: item.review_state === 'needs_correction' && taskIsOverdue(item),
        overdue: taskIsOverdue(item),
        primary,
        primaryLabel: this.t({
          review: 'teacher.task_review_submission',
          feedback: 'teacher.task_give_feedback',
          progress: 'teacher.task_view_progress',
          results: 'teacher.task_view_results',
        }[primary] || 'teacher.task_view'),
      }
    },
    submissionRows(item) {
      if (!item) return []
      const attempts = Array.isArray(item.attempts) ? item.attempts : []
      if (attempts.length) {
        return attempts.map((attempt) => ({
          id: attempt.attempt_id || attempt.n,
          when: attempt.completed_at ? this.formatWhen(attempt.completed_at) : this.t('teacher.task_submissions'),
          score: typeof attempt.score === 'number' ? attempt.score : null,
          match: null,
          audio: attempt.recording_url ? { available: true, url: attempt.recording_url } : null,
          attemptId: attempt.attempt_id || null,
        }))
      }
      const evidence = item.evidence || null
      if (!item.student_submitted_at && !evidence?.attempt_id) return []
      return [{
        id: evidence?.attempt_id || item.id,
        when: this.formatWhen(item.student_submitted_at || item.updated_at),
        score: typeof item.last_attempt?.accuracy_percent === 'number' ? item.last_attempt.accuracy_percent : null,
        match: this.wordMatch(evidence?.words),
        audio: evidence?.audio?.available ? evidence.audio : null,
        attemptId: evidence?.attempt_id || null,
      }]
    },
    wordMatch(words) {
      if (!Array.isArray(words) || !words.length) return null
      const matched = words.filter((word) => normaliseTeacherWordStatus(word) === 'correct').length
      return { matched, total: words.length }
    },
    selfAssessmentFeelingLabel(feeling) {
      const key = `dashboard.assignment_self_assessment_${feeling}`
      const label = this.t(key)
      return label && label !== key ? label : feeling
    },
    openFocusedTask(force = false) {
      const id = this.focusTaskId
      if (id === null || id === undefined || id === '') return
      if (!force && this.selectedTaskKey) return
      const match = this.assignments.find((item) => String(item.id) === String(id) || String(item.assignment?.id) === String(id))
      if (match) {
        this.missingTask = false
        this.openTask(match.id)
        return
      }
      if (force && this.ready) this.missingTask = true
    },
    backToConversation() {
      this.closeTask()
      this.$emit('return-to-messages')
    },
    showFeedback() {
      document.getElementById('teacher-task-feedback')?.scrollIntoView({ block: 'nearest' })
    },
    chooseTask(id) {
      if (String(id) === String(this.selectedTaskKey)) return
      if (this.feedbackUnsent) {
        this.pendingTaskId = id
        return
      }
      this.openTask(id)
    },
    toggleFeedback() {
      this.composerReady = true
      this.composing = !this.composing
    },
    openTask(id, extras = {}) {
      this.selectedTaskKey = id
      this.composing = Boolean(extras.feedback)
      if (extras.feedback) this.composerReady = true
      this.rescheduleOpen = false
      this.dueDraft = this.currentDueValue()
      this.actionError = ''
      this.actionNotice = ''
      if (extras.review) this.playbackAttemptId = extras.review
    },
    closeTask() {
      if (this.feedbackUnsent) {
        this.pendingClose = true
        return
      }
      this.selectedTaskKey = null
      this.composing = false
    },
    cancelPending() {
      this.pendingTaskId = null
      this.pendingClose = false
    },
    discardAndSwitch() {
      this.$refs.composer?.clear()
      const draftId = this.selectedAssignment?.id
      if (draftId) sessionStorage.removeItem(`mutqin-teacher-task-draft:${draftId}`)
      this.feedbackUnsent = false
      const next = this.pendingTaskId
      this.pendingTaskId = null
      this.pendingClose = false
      if (next === null) this.selectedTaskKey = null
      else this.openTask(next)
      this.composing = false
    },
    onReminded(result) {
      const key = this.remindRow?.key
      if (key !== null && key !== undefined) this.reminded = { ...this.reminded, [key]: true }
      if (result?.fresh) this.$emit('refresh')
    },
    runPrimary(row) {
      if (row.primary === 'review') this.openTask(row.key, { review: row.source?.evidence?.attempt_id })
      else if (row.primary === 'feedback') this.openTask(row.key, { feedback: true })
      else this.chooseTask(row.key)
    },
    openReview(attemptId) {
      if (attemptId) this.playbackAttemptId = attemptId
    },
    onReviewed() {
      this.playbackAttemptId = null
      this.$emit('refresh')
    },
    onFeedbackSent() {
      this.feedbackUnsent = false
      this.composing = false
      this.actionNotice = this.t('teacher.audio_feedback_sent')
      this.$emit('refresh')
    },
    onDraftChange(value) {
      this.feedbackUnsent = Boolean(value)
    },
    currentDueValue() {
      const due = this.selectedAssignment?.assignment?.due_at
      return due ? String(due).slice(0, 10) : ''
    },
    toggleReschedule() {
      this.rescheduleOpen = !this.rescheduleOpen
      this.dueDraft = this.currentDueValue()
    },
    async saveDueDate() {
      const assignment = this.selectedAssignment?.assignment
      if (!assignment || !this.dueDraft || this.actionBusy) return
      this.actionBusy = 'due'
      this.actionError = ''
      try {
        await learningApi.updateTeacherAssignment(assignment.id, {
          kind: assignment.kind,
          hifz_category: assignment.hifz_category || 'sabaq',
          activity: assignment.activity || null,
          recording_required: Boolean(assignment.recording_required),
          surah_number: assignment.surah_number,
          ayah_start: assignment.ayah_start,
          ayah_end: assignment.ayah_end,
          repetition_target: assignment.repetition_target || 1,
          due_at: this.dueDraft,
          priority: assignment.priority || 'normal',
          feedback: assignment.feedback || '',
        })
        this.rescheduleOpen = false
        this.actionNotice = this.t('teacher.task_rescheduled')
        this.$emit('refresh')
      } catch (error) {
        this.actionError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.actionBusy = ''
      }
    },
    async markComplete() {
      if (!this.canComplete || this.actionBusy) return
      this.actionBusy = 'complete'
      this.actionError = ''
      try {
        await learningApi.approveTeacherAssignmentRecipient(this.selectedAssignment.id)
        this.actionNotice = this.t('teacher.task_completed_notice')
        this.$emit('refresh')
      } catch (error) {
        this.actionError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.actionBusy = ''
      }
    },
    async requestRevision() {
      if (!this.canRequestRevision || this.actionBusy) return
      this.actionBusy = 'revision'
      this.actionError = ''
      try {
        await learningApi.requestTeacherAssignmentCorrection(this.selectedAssignment.id)
        this.actionNotice = this.t('teacher.task_revision_notice')
        this.$emit('refresh')
      } catch (error) {
        this.actionError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.actionBusy = ''
      }
    },
  },
}
</script>
