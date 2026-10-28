<template>
  <section
    class="dash-section dash-section--learner-teacher dash-reveal"
    aria-labelledby="learner-teacher-heading"
    style="--dash-delay: 15ms"
  >
    <div class="dash-section__head learner-teacher__hero">
      <div class="dash-section__head-row">
        <div class="dash-section__title">
          <span class="dash-section__icon learner-teacher__hero-icon" aria-hidden="true">
            <i class="bi bi-mortarboard" aria-hidden="true"></i>
          </span>
          <div class="dash-section__title-copy">
            <h2 id="learner-teacher-heading">{{ t('teacher.learner_section_title') }}</h2>
            <p v-if="teacherContextLine" class="learner-teacher__teacher-context">{{ teacherContextLine }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-section__body learner-teacher">
      <div v-if="error" class="alert alert-danger learner-teacher__alert" role="alert">
        <span>{{ error }}</span>
        <button
          v-if="failedItem"
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="savingId === failedItem.id"
          @click="$emit('complete', failedItem)"
        >{{ t('common.retry') }}</button>
      </div>
      <div v-if="completionMessage" class="alert alert-success learner-teacher__alert" role="status" aria-live="polite">
        <span>{{ completionMessage }}</span>
        <span class="learner-teacher__alert-actions">
          <button type="button" class="btn btn-sm btn-outline-success" @click="$emit('view-completed')">
            {{ t('teacher.learner_assignments_view_completed') }}
          </button>
          <button type="button" class="btn-close" :aria-label="t('common.close')" @click="$emit('dismiss-completion')"></button>
        </span>
      </div>
      <p v-if="groupsError" class="teacher-alert" role="alert">{{ groupsError }}</p>

      <div v-if="loading" class="learner-teacher__loading" role="status" aria-live="polite">
        <div class="dash-spinner" aria-hidden="true"></div>
        <span>{{ t('teacher.loading') }}</span>
      </div>

      <template v-else>
        <div class="learner-teacher__shell">
        <div
          v-if="showWeeklyProgress"
          class="learner-teacher__progress-strip"
          role="status"
          :aria-label="weeklyProgressLabel"
        >
          <div class="learner-teacher__progress-main">
            <span class="learner-teacher__progress-label">{{ weeklyProgressLabel }}</span>
            <span
              v-if="overview.weekly_goal > 0"
              class="learner-teacher__progress-meter"
              :aria-hidden="true"
            >
              <span :style="{ width: `${weeklyProgressPercent}%` }"></span>
            </span>
          </div>
          <div class="learner-teacher__progress-badges">
            <span v-if="overview.active_days_this_week" class="learner-teacher__progress-badge">
              <i class="bi bi-calendar2-check" aria-hidden="true"></i>
              {{ t('teacher.learner_weekly_active_days', { n: overview.active_days_this_week }) }}
            </span>
            <span v-if="overview.practice_streak_days" class="learner-teacher__progress-badge is-streak">
              <i class="bi bi-fire" aria-hidden="true"></i>
              {{ t('teacher.learner_weekly_streak', { n: overview.practice_streak_days }) }}
            </span>
          </div>
        </div>

        <section v-if="glanceItems.length" class="learner-teacher__priorities" :aria-label="t('teacher.learner_priorities_title')">
          <h3 class="learner-teacher__section-title">{{ t('teacher.learner_priorities_title') }}</h3>
          <ul class="learner-teacher__glance" role="list">
            <li v-for="item in glanceItems" :key="item.id" class="learner-teacher__glance-item" :class="`is-${item.tone}`" role="listitem">
              <span class="learner-teacher__glance-icon" aria-hidden="true"><i class="bi" :class="item.icon"></i></span>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </section>

        <div class="learner-teacher__workspace">
        <section class="learner-teacher__block">
          <div v-if="feedbackTotalCount" class="learner-teacher__mobile-feedback-bar">
            <button
              type="button"
              class="learner-teacher__feedback-trigger"
              @click="openFeedbackDrawer"
            >
              <i class="bi bi-chat-left-quote" aria-hidden="true"></i>
              {{ t('teacher.learner_feedback_open') }}
              <span class="learner-teacher__feedback-trigger-count">{{ feedbackTotalCount }}</span>
              <span v-if="feedbackUnreadCount" class="learner-teacher__feedback-trigger-new">
                {{ t('teacher.learner_feedback_unread', { n: feedbackUnreadCount }) }}
              </span>
            </button>
          </div>

          <div v-if="!assignments.length" class="learner-teacher__empty">
            <strong>{{ t('teacher.learner_assignments_empty_title') }}</strong>
            <span>{{ t('teacher.learner_assignments_empty') }}</span>
          </div>

          <template v-else>
            <div
              class="learner-teacher__filters"
              role="tablist"
              :aria-label="t('teacher.learner_assignments_filter_label')"
            >
              <button
                v-for="filter in primaryFilters"
                :key="filter.id"
                type="button"
                class="learner-teacher__filter"
                :class="[`is-${filter.id}`, { 'is-active': activeFilter === filter.id }]"
                role="tab"
                :aria-selected="activeFilter === filter.id ? 'true' : 'false'"
                :aria-controls="`learner-teacher-panel-${filter.id}`"
                @click="setFilter(filter.id)"
              >
                {{ filter.label }}
                <span class="learner-teacher__filter-count">{{ filter.count }}</span>
              </button>
            </div>

            <p
              v-if="activeFilter === 'todo' && pendingCount === 0"
              class="learner-teacher__uptodate"
            >
              <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
              {{ t('teacher.learner_assignments_caught_up') }}
            </p>
            <p v-if="activeFilter === 'done' && completedCount === 0" class="learner-teacher__uptodate">
              {{ t('teacher.learner_assignments_no_completed') }}
            </p>

            <ul v-if="listItems.length" :id="`learner-teacher-panel-${activeFilter}`" class="learner-teacher__list learner-teacher__card-list" role="tabpanel">
              <li v-for="(item, index) in listItems" :key="item.id">
                <article
                  class="learner-teacher__card"
                  :class="[cardToneClass(item), { 'is-priority': isPriorityCard(item, index) }]"
                >
                  <div class="learner-teacher__card-head">
                    <div class="learner-teacher__card-title-row">
                      <span class="learner-teacher__card-icon" :class="`is-${item.assignment?.kind || 'practice'}`" aria-hidden="true">
                        <i :class="kindIcon(item)"></i>
                      </span>
                      <strong>{{ rangeLabel(item) }}</strong>
                    </div>
                    <p class="learner-teacher__card-meta">
                      <span>{{ taskTypeLabel(item) }}</span>
                      <template v-if="cardMetaTail(item).text">
                        <span class="learner-teacher__meta-sep" aria-hidden="true"> · </span>
                        <span class="learner-teacher__card-due" :class="`is-${cardMetaTail(item).tone}`">{{ cardMetaTail(item).text }}</span>
                      </template>
                    </p>
                  </div>

                  <p v-if="correctionNote(item)" class="learner-teacher__card-note is-correction">
                    <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>{{ correctionNote(item) }}
                  </p>

                  <details v-if="hasInstruction(item)" class="learner-teacher__instruct">
                    <summary>{{ t('teacher.assignment_instructions_label') }}</summary>
                    <p>{{ instructionText(item) }}</p>
                  </details>

                  <div v-if="isTeacherApproved(item) && completionResult(item)" class="learner-teacher__result">
                    <p class="learner-teacher__result-headline">{{ completionHeadline(item) }}</p>
                    <p v-if="completionSnippet(item)" class="learner-teacher__result-snippet">{{ completionSnippet(item) }}</p>
                    <button
                      v-if="canViewRecitationReview(item)"
                      type="button"
                      class="dash-text-link learner-teacher__result-link"
                      @click="openRecitationReview(item)"
                    >
                      {{ t('teacher.learner_view_feedback') }}
                    </button>
                  </div>

                  <div v-if="showCardProgress(item)" class="learner-teacher__card-progress" :aria-label="progressLabel(item)">
                    <span>{{ progressLabel(item) }}</span>
                    <span v-if="showProgressBar(item)" class="learner-teacher__progress" aria-hidden="true"><span :style="{ width: `${progressPercent(item)}%` }"></span></span>
                  </div>

                  <p v-if="actionHint(item)" class="learner-teacher__action-hint">{{ actionHint(item) }}</p>

                  <div class="learner-teacher__card-actions">
                      <component
                        :is="primaryAction(item)?.href ? 'a' : 'button'"
                        v-if="primaryAction(item)"
                        class="dash-btn dash-btn--sm learner-teacher__card-primary"
                        :class="[
                          primaryButtonClass(item),
                          { 'is-disabled': savingId === item.id && !primaryAction(item)?.href },
                        ]"
                        :href="primaryAction(item)?.href || undefined"
                        :disabled="!primaryAction(item)?.href && savingId === item.id"
                        @click="!primaryAction(item)?.href && onPrimaryAction(item)"
                      >
                        <i class="bi" :class="primaryAction(item).icon" aria-hidden="true"></i>
                        {{ primaryAction(item).label }}
                      </component>
                      <button
                        type="button"
                        class="dash-btn dash-btn--ghost dash-btn--sm learner-teacher__chat-btn"
                        :class="{ 'has-unread': unreadTeacherMessages(item) }"
                        :aria-label="chatAriaLabel(item)"
                        :title="chatAriaLabel(item)"
                        @click="openDetails(item)"
                      >
                        <i class="bi bi-chat-left-text" aria-hidden="true"></i>
                        <span>{{ t('teacher.learner_message') }}</span>
                        <span v-if="unreadTeacherMessages(item)" class="learner-teacher__chat-badge">{{ unreadTeacherMessages(item) }}</span>
                      </button>
                    </div>
                </article>
              </li>
            </ul>

            <div v-if="showViewAll" class="learner-teacher__footer">
              <button type="button" class="dash-text-link" @click="visibleLimit += listLimit">
                {{ t('teacher.learner_assignments_view_more', { n: Math.min(listLimit, remainingCount) }) }}
              </button>
            </div>
          </template>
        </section>

        <LearnerTeacherLearning
          class="learner-teacher__feedback-panel--desktop"
          :learning="learning"
          @open-feedback="openFeedbackFromPanel"
        />
        </div>
        </div>

      </template>
    </div>

    <Teleport to="body">
    <div
      v-if="feedbackDrawerOpen"
      class="dash-drawer-root user-dashboard"
      @keydown="onFeedbackDrawerKeydown"
    >
      <button
        type="button"
        class="dash-drawer__backdrop"
        :aria-label="t('dashboard.drawer_close')"
        @click="closeFeedbackDrawer"
      ></button>
      <aside
        ref="feedbackDrawer"
        class="dash-drawer"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="feedbackDrawerTitleId"
      >
        <div class="dash-drawer__handle" aria-hidden="true"></div>
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true">
              <i class="bi bi-chat-left-quote"></i>
            </span>
            <div class="dash-drawer__head-copy">
              <h2 :id="feedbackDrawerTitleId" class="dash-drawer__title">{{ t('teacher.learner_feedback_open') }}</h2>
              <p class="dash-drawer__subtitle">{{ t('teacher.learner_feedback_drawer_subtitle') }}</p>
              <p v-if="feedbackUnreadCount" class="dash-drawer__count">
                {{ t('teacher.learner_feedback_unread', { n: feedbackUnreadCount }) }}
              </p>
            </div>
          </div>
          <button
            ref="feedbackDrawerClose"
            type="button"
            class="dash-icon-btn dash-drawer__close"
            :aria-label="t('dashboard.drawer_close')"
            @click="closeFeedbackDrawer"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <div class="dash-drawer__body">
          <div class="dash-drawer__content">
            <LearnerTeacherLearning
              variant="drawer"
              :learning="learning"
              @open-feedback="openFeedbackFromDrawer"
            />
          </div>
        </div>
      </aside>
    </div>
    </Teleport>

    <Teleport to="body">
    <div v-if="selectedItem" class="user-dashboard learner-teacher__portal">
    <div class="learner-teacher__modal-backdrop" @click.self="closeDetails">
      <section
        ref="detailsModal"
        class="learner-teacher__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-teacher-details-title"
        tabindex="-1"
        @keydown="handleModalKeydown"
      >
        <header class="learner-teacher__modal-head">
          <div class="learner-teacher__modal-intro">
            <span class="learner-teacher__modal-kicker"><i class="bi bi-chat-dots" aria-hidden="true"></i>{{ t('teacher.task_conversation') }}</span>
            <h3 id="learner-teacher-details-title">{{ rangeLabel(selectedItem) }}</h3>
            <p class="learner-teacher__card-meta">
              <span>{{ taskTypeLabel(selectedItem) }}</span>
              <template v-if="cardMetaTail(selectedItem).text">
                <span class="learner-teacher__meta-sep" aria-hidden="true"> · </span>
                <span class="learner-teacher__card-due" :class="`is-${cardMetaTail(selectedItem).tone}`">{{ cardMetaTail(selectedItem).text }}</span>
              </template>
            </p>
            <span class="learner-teacher__pill" :class="pillClass(selectedItem)">
              <i class="bi" :class="statusIcon(selectedItem)" aria-hidden="true"></i>{{ statusLabel(selectedItem) }}
            </span>
          </div>
          <button ref="modalClose" type="button" class="learner-teacher__modal-close" :aria-label="t('common.close')" @click="closeDetails"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        </header>
        <div class="learner-teacher__modal-body">
          <TeacherTaskConversation
            ref="taskConversation"
            :messages="selectedItem.messages || []"
            variant="learner"
            thread-class="learner-teacher__thread"
            viewer-role="student"
            :peer-name="selectedItem.teacher_name || t('teacher.teacher')"
            :teacher-note="selectedItem.assignment?.feedback || ''"
            :evidence-audio="selectedItem.evidence?.audio || null"
            :composer-id="`task-message-${selectedItem.id}`"
            :composer-placeholder="t('teacher.learner_reply_placeholder')"
            :on-send="sendTaskMessage"
          />
        </div>
      </section>
    </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div v-if="selectedDirectThread" class="user-dashboard learner-teacher__portal">
    <div class="learner-teacher__modal-backdrop" @click.self="closeDirectThread">
      <section
        class="learner-teacher__modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`direct-thread-title-${selectedDirectThread.teacher_id}`"
        tabindex="-1"
      >
        <header class="learner-teacher__modal-head">
          <div class="learner-teacher__modal-intro">
            <span class="learner-teacher__modal-kicker"><i class="bi bi-chat-left-text" aria-hidden="true"></i>{{ t('teacher.messages') }}</span>
            <h3 :id="`direct-thread-title-${selectedDirectThread.teacher_id}`">{{ selectedDirectThread.teacher_name }}</h3>
          </div>
          <button type="button" class="learner-teacher__modal-close" :aria-label="t('common.close')" @click="closeDirectThread"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        </header>
        <div class="learner-teacher__modal-body">
          <TeacherTaskConversation
            ref="directConversation"
            :messages="selectedDirectThread.messages || []"
            variant="learner"
            thread-class="learner-teacher__thread"
            viewer-role="student"
            :peer-name="selectedDirectThread.teacher_name"
            :composer-id="`direct-message-${selectedDirectThread.teacher_id}`"
            :composer-placeholder="t('teacher.direct_message_prompt_student')"
            :empty-label="t('teacher.direct_messages_empty_student')"
            :on-send="sendDirectMessage"
          />
        </div>
      </section>
    </div>
    </div>
    </Teleport>

    <Teleport to="body">
    <div v-if="selectedSubmission" class="user-dashboard learner-teacher__portal">
      <div class="learner-teacher__modal-backdrop" @click.self="closeSubmission">
        <section class="learner-teacher__modal learner-teacher__modal--sheet" role="dialog" aria-modal="true" aria-labelledby="learner-submission-title" tabindex="-1">
          <header class="learner-teacher__modal-head">
            <div class="learner-teacher__modal-intro">
              <span class="learner-teacher__modal-kicker"><i class="bi bi-clock-history" aria-hidden="true"></i>{{ t('teacher.learner_submission_history') }}</span>
              <h3 id="learner-submission-title">{{ selectedSubmission.title }}</h3>
              <span class="learner-teacher__pill" :class="submissionPillClass(selectedSubmission)">{{ submissionStateLabel(selectedSubmission) }}</span>
            </div>
            <button type="button" class="learner-teacher__modal-close" :aria-label="t('common.close')" @click="closeSubmission"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
          </header>
          <div class="learner-teacher__modal-body learner-teacher__submission-detail">
            <dl class="learner-teacher__facts-compact">
              <div><dt>{{ t('teacher.learner_submitted_on') }}</dt><dd>{{ submissionWhen(selectedSubmission.submitted_at) }}</dd></div>
              <div><dt>{{ t('teacher.teacher') }}</dt><dd>{{ selectedSubmission.teacher_name || t('teacher.unavailable') }}</dd></div>
              <div><dt>{{ t('teacher.learner_submission_range') }}</dt><dd>{{ submissionRangeLabel(selectedSubmission) }}</dd></div>
              <div><dt>{{ t('teacher.learner_submission_attempts_label') }}</dt><dd>{{ t('teacher.learner_submission_attempts', { n: selectedSubmission.attempt_count || 0, s: selectedSubmission.submission_count || 1 }) }}</dd></div>
            </dl>
            <p v-if="selectedSubmission.review_state !== 'approved'" class="learner-teacher__submission-note">
              {{ t('teacher.learner_submission_not_approved') }}
            </p>
            <p v-if="selectedSubmission.teacher_instructions" class="learner-teacher__card-instruct">
              <strong>{{ t('teacher.assignment_instructions_label') }}</strong> {{ selectedSubmission.teacher_instructions }}
            </p>
            <p v-if="selectedSubmission.teacher_correction" class="learner-teacher__card-note is-correction">
              {{ selectedSubmission.teacher_correction }}
            </p>
            <audio v-if="selectedSubmission.audio?.available && selectedSubmission.audio?.url" controls preload="metadata" class="learner-teacher__submission-audio" :src="selectedSubmission.audio.url"></audio>
            <p v-if="selectedSubmission.transcript" class="learner-teacher__submission-transcript">{{ selectedSubmission.transcript }}</p>
            <div class="learner-teacher__submission-actions">
              <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="openAssignmentById(selectedSubmission.recipient_id)">
                {{ t('teacher.task_conversation') }}
              </button>
              <a v-if="assignmentHref(selectedSubmission.recipient_id)" class="dash-btn dash-btn--ghost dash-btn--sm" :href="assignmentHref(selectedSubmission.recipient_id)">
                {{ t('teacher.practice_again') }}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
    </Teleport>

    <TeacherReciteEvidenceModal
      :open="Boolean(recitationReviewRow)"
      :row="recitationReviewRow"
      mode="mushaf"
      @close="recitationReviewRow = null"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { assignmentProgressLabel, learnerRecitationReviewRow } from '../../scripts/teacher/formatters'
import {
  TASK_STATE,
  formatTaskDueUrgency,
  resolveBaseTaskState,
  resolveDisplayTaskState,
  taskStateCardClass,
  taskStateIcon,
  taskStateLabelKey,
} from '../../scripts/teacher/taskState'
import { learningApi } from '../../scripts/api/learning'
import TeacherTaskConversation from './TeacherTaskConversation.vue'
import LearnerTeacherLearning from './LearnerTeacherLearning.vue'
import TeacherReciteEvidenceModal from './TeacherReciteEvidenceModal.vue'

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'overdue', 'awaiting_confirmation'])

export default {
  name: 'LearnerTeacherSection',
  components: { TeacherTaskConversation, LearnerTeacherLearning, TeacherReciteEvidenceModal },
  mixins: [i18nMixin],
  props: {
    support: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    savingId: { type: Number, default: 0 },
    completionMessage: { type: String, default: '' },
    failedItem: { type: Object, default: null },
    onSendNote: { type: Function, required: true },
    onSendDirectMessage: { type: Function, required: true },
  },
  emits: ['start', 'complete', 'view-completed', 'dismiss-completion'],
  data() {
    return {
      activeFilter: 'todo',
      directDrafts: {},
      directSent: {},
      directSynced: {},
      directError: {},
      directSuccess: {},
      directSaving: null,
      directPollTimer: null,
      listLimit: 4,
      visibleLimit: 4,
      selectedItem: null,
      selectedDirectThread: null,
      selectedSubmission: null,
      recitationReviewRow: null,
      focusConversationComposer: false,
      previouslyFocused: null,
      feedbackDrawerOpen: false,
      feedbackDrawerTitleId: `learner-feedback-drawer-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  computed: {
    overview() {
      return this.support?.overview || {
        tasks_due_today: 0,
        submitted_awaiting_review: 0,
        revision_overdue: 0,
        revision_upcoming: 0,
        weekly_completed: 0,
        weekly_goal: 0,
        active_days_this_week: 0,
        practice_streak_days: 0,
      }
    },
    learning() {
      return this.support?.learning || null
    },
    showWeeklyProgress() {
      const goal = Number(this.overview.weekly_goal) || 0
      const done = Number(this.overview.weekly_completed) || 0
      return goal > 0 || done > 0
    },
    weeklyProgressLabel() {
      return this.t('teacher.learner_weekly_progress', {
        done: this.overview.weekly_completed || 0,
        goal: this.overview.weekly_goal || 0,
      })
    },
    weeklyProgressPercent() {
      const goal = Number(this.overview.weekly_goal) || 0
      const done = Number(this.overview.weekly_completed) || 0
      if (goal <= 0) return done > 0 ? 100 : 0
      return Math.min(100, Math.round((done / goal) * 100))
    },
    feedbackItems() {
      return Array.isArray(this.learning?.feedback_inbox) ? this.learning.feedback_inbox : []
    },
    feedbackUnreadCount() {
      return this.feedbackItems.filter((item) => item.unread).length
    },
    feedbackTotalCount() {
      return this.feedbackItems.length
    },
    glanceItems() {
      const items = []
      if (this.overview.tasks_due_today) {
        items.push({
          id: 'due',
          tone: 'due',
          icon: 'bi-calendar-check',
          label: this.t('teacher.learner_overview_due_today', { n: this.overview.tasks_due_today }),
        })
      }
      if (this.overview.submitted_awaiting_review) {
        items.push({
          id: 'submitted',
          tone: 'submitted',
          icon: 'bi-hourglass-split',
          label: this.t('teacher.learner_overview_submitted', { n: this.overview.submitted_awaiting_review }),
        })
      }
      if (this.overview.revision_overdue) {
        items.push({
          id: 'revision',
          tone: 'revision',
          icon: 'bi-alarm',
          label: this.t('teacher.learner_overview_revision_overdue', { n: this.overview.revision_overdue }),
        })
      } else if (this.overview.revision_upcoming) {
        items.push({
          id: 'revision-soon',
          tone: 'revision',
          icon: 'bi-arrow-repeat',
          label: this.t('teacher.learner_overview_revision_upcoming', { n: this.overview.revision_upcoming }),
        })
      }
      return items
    },
    directThreads() {
      return (this.support?.direct_threads || []).map((thread) => ({
        ...thread,
        messages: [...new Map([
          ...(thread.messages || []),
          ...(this.directSynced[thread.teacher_id] || []),
          ...(this.directSent[thread.teacher_id] || []),
        ].map((message) => [message.id, message])).values()]
          .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id)),
      }))
    },
    assignments() {
      return Array.isArray(this.support?.assignments) ? this.support.assignments : []
    },
    pendingCount() {
      return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status)).length
    },
    completedCount() {
      return this.assignments.filter((row) => this.isTeacherApproved(row)).length
    },
    primaryFilters() {
      const filters = [
        {
          id: 'all',
          label: this.t('teacher.learner_assignments_filter_all'),
          count: this.assignments.length,
        },
        {
          id: 'todo',
          label: this.t('teacher.learner_assignments_filter_todo'),
          count: this.pendingCount,
        },
        {
          id: 'done',
          label: this.t('teacher.status_completed'),
          count: this.completedCount,
        },
      ]
      return filters
    },
    filteredByStatus() {
      if (this.activeFilter === 'done') {
        return this.assignments.filter((row) => this.isTeacherApproved(row))
      }
      if (this.activeFilter === 'all') return this.assignments
      if (this.activeFilter === 'todo') {
        return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status) || this.needsCorrection(row))
      }
      return this.assignments
    },
    listItems() {
      return this.filteredByStatus.slice(0, this.visibleLimit)
    },
    openListCount() {
      return this.filteredByStatus.length
    },
    remainingCount() {
      return Math.max(0, this.openListCount - this.visibleLimit)
    },
    showViewAll() {
      return this.remainingCount > 0
    },
    teacherContextLine() {
      const names = [...new Set(this.assignments.map((row) => row?.teacher_name).filter(Boolean))]
      if (names.length === 1) {
        return this.t('teacher.learner_teacher_context', { name: names[0] })
      }
      if (names.length > 1) {
        return this.t('teacher.learner_teachers_context', { n: names.length })
      }
      return ''
    },
  },
  watch: {
    assignments() {
      this.visibleLimit = this.listLimit
    },
    selectedItem(value) {
      this.syncModalOpen()
    },
    selectedDirectThread(value) {
      this.syncModalOpen()
    },
    selectedSubmission(value) {
      this.syncModalOpen()
    },
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('modal-open')
      document.documentElement.classList.remove('dash-drawer-open')
      document.body.classList.remove('dash-drawer-open')
    }
    window.clearInterval(this.directPollTimer)
  },
  mounted() {
    this.directPollTimer = window.setInterval(() => this.refreshDirectThreads(), 10000)
  },
  methods: {
    syncModalOpen() {
      if (typeof document === 'undefined') return
      document.body.classList.toggle(
        'modal-open',
        Boolean(this.selectedItem) || Boolean(this.selectedDirectThread) || Boolean(this.selectedSubmission),
      )
    },
    async sendDirectMessage(body, recording = null) {
      if (!this.selectedDirectThread) return
      const message = await this.onSendDirectMessage(this.selectedDirectThread.teacher_id, body)
      if (message) {
        this.selectedDirectThread.messages = [...(this.selectedDirectThread.messages || []), message]
      }
    },
    openDirectThread(thread) {
      this.selectedDirectThread = thread
      this.$nextTick(() => this.$refs.directConversation?.resetComposer?.())
    },
    closeDirectThread() {
      this.selectedDirectThread = null
    },
    directUnreadCount(thread) {
      return (thread.messages || []).filter((message) => message.unread && message.sender === 'teacher').length
    },
    async sendTaskMessage(body, recording = null) {
      if (!this.selectedItem) return
      const message = await this.onSendNote(this.selectedItem, body, recording)
      if (message) {
        this.selectedItem.messages = [...(this.selectedItem.messages || []), message]
      }
    },
    async refreshDirectThreads() {
      const threads = this.support?.direct_threads || []
      await Promise.all(threads.map(async (thread) => {
        try {
          const payload = await learningApi.getLearnerTeacherMessages(thread.teacher_id)
          this.directSynced = { ...this.directSynced, [thread.teacher_id]: payload?.messages || [] }
        } catch (_) { /* preserve existing messages during transient polling failures */ }
      }))
    },
    directMessageWhen(message) {
      const date = new Date(message?.created_at)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    setFilter(id) {
      this.activeFilter = id
      this.visibleLimit = this.listLimit
    },
    openDetails(row) {
      this.previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null
      this.focusConversationComposer = false
      this.selectedItem = row
      this.$nextTick(() => {
        this.$refs.modalClose?.focus()
        this.$refs.taskConversation?.resetComposer?.()
      })
    },
    openDetailsWithReply(row) {
      this.previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null
      this.focusConversationComposer = true
      this.selectedItem = row
      this.$nextTick(() => {
        this.$refs.taskConversation?.resetComposer?.()
        this.$refs.taskConversation?.focusComposer?.()
      })
    },
    openAssignmentById(recipientId) {
      const row = this.assignments.find((item) => Number(item.id) === Number(recipientId))
      if (row) {
        this.closeSubmission()
        this.openDetails(row)
      }
    },
    openFeedback(item) {
      if (item?.recipient_id) {
        const row = this.assignments.find((assignment) => Number(assignment.id) === Number(item.recipient_id))
        if (row) {
          this.closeSubmission()
          this.openDetailsWithReply(row)
        }
        return
      }
      if (item?.teacher_id) {
        const thread = this.directThreads.find((row) => Number(row.teacher_id) === Number(item.teacher_id))
        if (thread) {
          this.openDirectThread(thread)
        }
      }
    },
    openFeedbackFromPanel(item) {
      this.openFeedback(item)
    },
    openFeedbackFromDrawer(item) {
      this.closeFeedbackDrawer()
      this.openFeedback(item)
    },
    openFeedbackDrawer() {
      this.feedbackDrawerOpen = true
      this.setFeedbackDrawerScrollLock(true)
      this.$nextTick(() => this.$refs.feedbackDrawerClose?.focus())
    },
    closeFeedbackDrawer() {
      this.feedbackDrawerOpen = false
      this.setFeedbackDrawerScrollLock(false)
    },
    setFeedbackDrawerScrollLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', open)
      document.body.classList.toggle('dash-drawer-open', open)
    },
    onFeedbackDrawerKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.closeFeedbackDrawer()
      }
    },
    completionResult(row) {
      return row?.completion_result || null
    },
    completionHeadline(row) {
      const result = this.completionResult(row)
      if (!result) return ''
      if (result.headline_type === 'ai_score' && result.accuracy_percent !== null && result.accuracy_percent !== undefined) {
        return this.t('teacher.learner_completion_ai_score', { n: result.accuracy_percent })
      }
      return this.t('teacher.learner_completion_teacher_reviewed')
    },
    completionSnippet(row) {
      return this.completionResult(row)?.feedback_snippet || ''
    },
    canViewRecitationReview(row) {
      return Boolean(this.completionResult(row)?.has_recitation_review)
    },
    openRecitationReview(row) {
      this.recitationReviewRow = learnerRecitationReviewRow(row)
    },
    openSubmissionDetail(item) {
      this.previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null
      this.selectedSubmission = item
    },
    openSubmissionForRow(row) {
      const match = (this.learning?.submissions || []).find((item) => Number(item.recipient_id) === Number(row.id))
      if (match) {
        this.openSubmissionDetail(match)
        return
      }
      this.openDetails(row)
    },
    closeSubmission() {
      this.selectedSubmission = null
      this.$nextTick(() => this.previouslyFocused?.focus?.())
    },
    assignmentHref(recipientId) {
      const row = this.assignments.find((item) => Number(item.id) === Number(recipientId))
      return row?.href || ''
    },
    submissionPillClass(item) {
      if (item?.review_state === 'approved') return 'is-approved'
      if (item?.review_state === 'needs_correction') return 'is-correction'
      return 'is-submitted'
    },
    submissionStateLabel(item) {
      if (item?.review_state === 'approved') return this.t('teacher.status_teacher_approved')
      if (item?.review_state === 'needs_correction') return this.t('teacher.status_needs_correction')
      return this.t('teacher.status_submitted')
    },
    submissionWhen(value) {
      if (!value) return this.t('teacher.unavailable')
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return this.t('teacher.unavailable')
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    },
    submissionRangeLabel(item) {
      if (item?.title) return item.title
      const parts = [item?.surah_name, item?.ayah_start, item?.ayah_end].filter((v) => v !== null && v !== undefined && v !== '')
      return parts.length ? parts.join(' · ') : this.t('teacher.unavailable')
    },
    cardToneClass(row) {
      if (this.needsCorrection(row)) return 'is-correction'
      return taskStateCardClass(resolveDisplayTaskState(row))
    },
    pillClass(row) {
      const tone = this.cardToneClass(row).replace('is-', '')
      return `is-${tone}`
    },
    compactMetaPrimary(row) {
      return this.taskTypeLabel(row)
    },
    taskTypeLabel(row) {
      const category = row?.assignment?.hifz_category
      if (category) return this.t(`teacher.hifz_${category}`)
      return row?.assignment?.kind === 'ai_recite' ? this.t('teacher.kind_ai') : this.t('teacher.kind_practice')
    },
    cardMetaTail(row) {
      if (this.isTeacherApproved(row)) {
        const text = this.completedWhen(row)
        return text ? { text, tone: 'neutral' } : { text: '', tone: 'neutral' }
      }
      if (this.isSubmitted(row)) {
        return { text: this.t('teacher.status_submitted'), tone: 'submitted' }
      }
      if (this.needsCorrection(row)) {
        return { text: this.t('teacher.status_needs_correction'), tone: 'warning' }
      }
      const due = this.dueUrgency(row)
      return { text: due.text || '', tone: due.tone || 'neutral' }
    },
    dueUrgency(row) {
      return formatTaskDueUrgency(row?.assignment?.due_at, {
        done: resolveBaseTaskState(row) === TASK_STATE.DONE,
        t: this.t.bind(this),
      })
    },
    showCardProgress(row) {
      if (this.isTeacherApproved(row) || this.isSubmitted(row)) return false
      const completed = Number(row?.progress?.completed || 0)
      const target = Number(row?.progress?.target || 0)
      if (!target) return false
      if (completed === 0 && row?.status === 'pending') return false
      return Boolean(row?.progress)
    },
    showProgressBar(row) {
      const completed = Number(row?.progress?.completed || 0)
      const target = Number(row?.progress?.target || 0)
      return target > 0 && completed > 0 && completed < target
    },
    isPriorityCard(row, index) {
      if (index !== 0) return false
      if (this.isTeacherApproved(row) || this.isSubmitted(row)) return false
      return this.activeFilter === 'todo' || this.activeFilter === 'all'
    },
    hasInstruction(row) {
      if (this.isTeacherApproved(row) || this.isSubmitted(row)) return false
      return Boolean(this.instructionText(row))
    },
    instructionText(row) {
      return String(row?.assignment?.feedback || '').trim()
    },
    correctionNote(row) {
      if (!this.needsCorrection(row)) return ''
      const note = row?.completion_evidence?.correction_note
      if (typeof note === 'string' && note.trim()) return note.trim()
      return this.t('teacher.learner_correction_default')
    },
    closeDetails() {
      this.selectedItem = null
      this.$nextTick(() => this.previouslyFocused?.focus?.())
    },
    handleModalKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.closeDetails()
        return
      }
      if (event.key !== 'Tab') return
      const root = this.$refs.detailsModal
      const focusable = root ? [...root.querySelectorAll('button, a[href], textarea, input, select, audio[controls], [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled) : []
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    isCompleted(row) {
      return this.isTeacherApproved(row) || row?.status === 'awaiting_confirmation' || row?.review_state === 'submitted'
    },
    isTeacherApproved(row) {
      return row?.status === 'completed' && (row?.review_state === 'approved' || !row?.student_submitted_at)
    },
    isSubmitted(row) {
      return row?.status === 'awaiting_confirmation' || row?.review_state === 'submitted'
    },
    needsCorrection(row) {
      return row?.review_state === 'needs_correction'
    },
    statusLabel(row) {
      if (this.needsCorrection(row)) return this.t('teacher.status_needs_correction')
      if (this.isTeacherApproved(row)) return this.t('teacher.status_teacher_approved')
      return this.t(taskStateLabelKey(resolveDisplayTaskState(row)))
    },
    statusIcon(row) {
      if (this.needsCorrection(row)) return 'bi-arrow-counterclockwise'
      if (this.isTeacherApproved(row)) return 'bi-check2-circle'
      return taskStateIcon(resolveDisplayTaskState(row))
    },
    rangeLabel(row) {
      const assignment = row?.assignment
      if (!assignment) return ''
      return `${assignment.surah_name} · ${assignment.ayah_start}–${assignment.ayah_end}`
    },
    kindLabel(row) {
      const action = row?.assignment?.kind === 'ai_recite'
        ? this.t('teacher.kind_ai')
        : this.t('teacher.kind_practice')
      const category = row?.assignment?.hifz_category
      return category ? `${this.t(`teacher.hifz_${category}`)} · ${action}` : action
    },
    kindIcon(row) {
      return row?.assignment?.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-book'
    },
    progressLabel(row) {
      return row?.progress ? assignmentProgressLabel(row, this.t.bind(this)) : ''
    },
    progressPercent(row) {
      const completed = Number(row?.progress?.completed || 0)
      const target = Math.max(1, Number(row?.progress?.target || 1))
      return Math.max(0, Math.min(100, Math.round((completed / target) * 100)))
    },
    unreadTeacherMessages(row) {
      return (row?.messages || []).filter((message) => message.sender === 'teacher' && message.unread).length
    },
    chatAriaLabel(row) {
      const unread = this.unreadTeacherMessages(row)
      const base = `${this.t('teacher.task_conversation')}: ${this.rangeLabel(row)}`
      return unread ? `${base}. ${this.t('teacher.unread')} (${unread})` : base
    },
    messageWhen(message) {
      try {
        const date = new Date(message?.created_at)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      } catch (_) {
        return ''
      }
    },
    canConfirm(row) {
      return Number(row?.progress?.activity_count || 0) >= Number(row?.progress?.target || 1)
    },
    onPrimaryAction(row) {
      const action = this.primaryAction(row)
      if (!action) return
      if (action.emit === 'details') {
        this.openSubmissionForRow(row)
        return
      }
      if (action.emit === 'complete') {
        this.$emit('complete', row)
        return
      }
      this.$emit('start', row)
    },
    primaryAction(row) {
      if (this.isTeacherApproved(row)) {
        if (!row?.href) return null
        return { label: this.t('teacher.practice_again'), icon: 'bi-arrow-repeat', href: row.href, variant: 'ghost' }
      }
      if (this.isSubmitted(row)) {
        return { label: this.t('teacher.view_submission'), icon: 'bi-eye', emit: 'details' }
      }
      if (this.canConfirm(row) && !this.isSubmitted(row)) {
        return { label: this.t('teacher.mark_complete'), icon: 'bi-check2-circle', emit: 'complete' }
      }
      if (this.needsCorrection(row) || row?.status !== 'awaiting_confirmation') {
        const label = this.actionLabel(row)
        if (row?.href) {
          return { label, icon: this.actionIcon(row), href: row.href }
        }
        return { label, icon: this.actionIcon(row), emit: 'start' }
      }
      return null
    },
    primaryButtonClass(row) {
      const variant = this.primaryAction(row)?.variant
      return variant === 'ghost' ? 'dash-btn--ghost' : 'dash-btn--primary'
    },
    actionHint(row) {
      if (this.isTeacherApproved(row) || this.isSubmitted(row)) return ''
      const target = Number(row?.progress?.target || 0)
      const completed = Number(row?.progress?.activity_count ?? row?.progress?.completed ?? 0)
      if (!target || completed >= target) return ''
      const remaining = target - completed
      return remaining === 1
        ? this.t('teacher.learner_action_hint_one')
        : this.t('teacher.learner_action_hint_other', { n: remaining })
    },
    instructionPreview(row) {
      const text = this.instructionText(row)
      if (!text) return ''
      return text.length > 140 ? `${text.slice(0, 137)}…` : text
    },
    dueLabel(row) {
      const value = this.dueValue(row)
      return value ? `${this.t('teacher.due')}: ${value}` : ''
    },
    dueValue(row) {
      const due = row?.assignment?.due_at
      if (!due) return ''
      try {
        const date = new Date(due)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      } catch (_) {
        return ''
      }
    },
    completedWhen(row) {
      const at = row?.teacher_approved_at || row?.completed_at
      if (!at) return ''
      try {
        const date = new Date(at)
        if (Number.isNaN(date.getTime())) return ''
        return this.t('teacher.learner_assignments_completed_at', {
          date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        })
      } catch (_) {
        return ''
      }
    },
    metaLine(row) {
      const parts = [this.taskTypeLabel(row), this.progressLabel(row)].filter(Boolean)
      const tail = this.cardMetaTail(row)
      if (tail.text) parts.push(tail.text)
      return parts.join(' · ')
    },
    actionLabel(row) {
      if (this.isTeacherApproved(row)) return this.t('teacher.practice_again')
      if (row?.progress?.resume_available || row?.status === 'in_progress' || row?.started_at) {
        return this.t('common.resume')
      }
      return this.t('teacher.start')
    },
    actionIcon(row) {
      return this.actionLabel(row) === this.t('common.resume') ? 'bi-arrow-repeat' : 'bi-play-fill'
    },
  },
}
</script>
