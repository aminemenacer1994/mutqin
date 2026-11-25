<template>
  <section
    id="dash-my-learning"
    class="dash-section dash-section--learner-teacher dash-reveal"
    aria-labelledby="learner-teacher-heading"
    tabindex="-1"
    style="--dash-delay: 15ms"
  >
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
        <div class="learner-teacher__workspace">
        <section class="learner-teacher__block">
          <header class="learner-teacher__intro" aria-labelledby="learner-teacher-heading">
            <div class="learner-teacher__intro-top">
              <div class="learner-teacher__intro-identity">
                <div class="learner-teacher__intro-copy">
                  <h2 id="learner-teacher-heading" class="learner-teacher__section-name visually-hidden">{{ t('dashboard.learning_lessons_title') }}</h2>
                  <p v-if="showWeeklyProgress" class="learner-teacher__progress-label">{{ weeklyProgressLabel }}</p>
                  <p v-else-if="assignments.length" class="learner-teacher__progress-label">{{ ldt('teacher.learner_weekly_progress_none') }}</p>
                </div>
              </div>
              <div
                v-if="overview.active_days_this_week || overview.practice_streak_days || learnerAttendance"
                class="learner-teacher__intro-badges"
              >
                <span v-if="overview.active_days_this_week" class="learner-teacher__progress-badge">
                  <i class="bi bi-calendar2-check" aria-hidden="true"></i>
                  {{ ldtp('teacher.learner_weekly_active_days', overview.active_days_this_week) }}
                </span>
                <span v-if="overview.practice_streak_days" class="learner-teacher__progress-badge is-streak">
                  <i class="bi bi-fire" aria-hidden="true"></i>
                  {{ ldtp('teacher.learner_weekly_streak', overview.practice_streak_days) }}
                </span>
                <span
                  v-if="learnerAttendance"
                  class="learner-teacher__progress-badge"
                  :title="learnerAttendanceHint"
                >
                  <i class="bi bi-person-check" aria-hidden="true"></i>
                  {{ t('teacher.learner_attendance_rate', { rate: learnerAttendance.rate_percent }) }}
                </span>
              </div>
            </div>
            <div
              v-if="showWeeklyProgress"
              class="learner-teacher__intro-progress"
              role="status"
              :aria-label="weeklyProgressLabel"
            >
              <span
                class="learner-teacher__progress-meter"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="weeklyProgressTotal"
                :aria-valuenow="weeklyProgressDone"
                :aria-label="weeklyProgressLabel"
              >
                <span
                  class="learner-teacher__progress-meter-fill"
                  :style="weeklyMeterStyle"
                ></span>
              </span>
            </div>
          </header>
          <div class="learner-teacher__assignments-toolbar" data-testid="learner-assignments-toolbar">
            <header class="learner-teacher__assignments-heading">
              <h3 class="learner-teacher__assignments-title">{{ t('dashboard.learning_lessons_title') }}</h3>
              <p class="learner-teacher__assignments-hint">{{ ldt('teacher.learner_assignments_due_filter_label') }}</p>
            </header>
            <div
              class="learner-teacher__filters learner-teacher__filters--segmented"
              role="tablist"
              :aria-label="t('teacher.learner_assignments_filter_label')"
            >
              <button
                v-for="filter in primaryFilters"
                :key="filter.id"
                type="button"
                class="learner-teacher__filter"
                :class="{ 'is-active': activeFilter === filter.id }"
                role="tab"
                :id="`learner-filter-${filter.id}`"
                :tabindex="activeFilter === filter.id ? 0 : -1"
                :aria-selected="activeFilter === filter.id ? 'true' : 'false'"
                :aria-controls="`learner-teacher-panel-${filter.id}`"
                @click="setFilter(filter.id)"
                @keydown="onTaskFilterKeydown($event, filter.id)"
              >
                {{ filter.label }}
                <span class="learner-teacher__filter-count">{{ filter.count }}</span>
              </button>
            </div>
            <div class="learner-teacher__assignments-toolbar__row">
              <div
                class="learner-teacher__filters learner-teacher__filters--secondary"
                role="group"
                :aria-label="ldt('teacher.learner_assignments_due_filter_label')"
              >
                <button
                  v-for="filter in secondaryDueFilters"
                  :key="filter.id"
                  type="button"
                  class="learner-teacher__filter learner-teacher__filter--due"
                  :class="{ 'is-active': activeDueFilter === filter.id }"
                  :aria-pressed="activeDueFilter === filter.id ? 'true' : 'false'"
                  @click="setDueFilter(filter.id)"
                >
                  {{ filter.label }}
                  <span class="learner-teacher__filter-count">{{ filter.count }}</span>
                </button>
              </div>
              <div class="learner-teacher__assignments-toolbar__tools">
                <button
                  v-if="showCategoryFilters"
                  type="button"
                  class="learner-teacher__type-btn"
                  :class="{ 'is-set': activeCategory !== 'all' }"
                  @click="categoryOpen = true"
                >
                  <i class="bi bi-funnel" aria-hidden="true"></i>
                  <span class="learner-teacher__type-btn-label">{{ categoryButtonLabel }}</span>
                </button>
                <button
                  type="button"
                  class="dash-icon-btn learner-teacher__feedback-tab-btn"
                  :aria-label="feedbackTabAriaLabel"
                  @click="openFeedbackDrawer"
                >
                  <i class="bi bi-chat-left-quote" aria-hidden="true"></i>
                  <span class="learner-teacher__feedback-tab-label visually-hidden">{{ t('teacher.learner_feedback_open') }}</span>
                  <span
                    v-if="feedbackUnreadCount"
                    class="learner-teacher__feedback-tab-badge"
                  >{{ feedbackUnreadCount }}</span>
                </button>
              </div>
            </div>
          </div>

            <div :id="`learner-teacher-panel-${activeFilter}`" :aria-labelledby="`learner-filter-${activeFilter}`" role="tabpanel">
            <div v-if="showPlanSlot" class="learner-teacher__plan-slot">
              <slot name="learning-plan"></slot>
            </div>
            <div v-if="!assignments.length" class="learner-teacher__empty">
              <strong>{{ t('teacher.learner_assignments_empty_title') }}</strong>
              <span>{{ t('teacher.learner_assignments_empty') }}</span>
            </div>
            <p
              v-else-if="listEmptyMessage"
              class="learner-teacher__uptodate"
            >
              <i v-if="activeFilter === 'todo'" class="bi bi-check-circle-fill" aria-hidden="true"></i>
              {{ listEmptyMessage }}
            </p>
            <ul v-if="listItems.length" class="learner-teacher__list learner-teacher__card-list learner-teacher__card-list--tasks learner-teacher__task-rows">
              <li v-for="(item, index) in listItems" :key="item.id">
                <article
                  :id="`learner-task-card-${item.id}`"
                  class="learner-teacher__card learner-teacher__task-row"
                  :class="[cardToneClass(item), { 'is-priority': isPriorityCard(item, index), 'is-attention': rowNeedsAttention(item) }]"
                >
                  <div class="learner-teacher__task-row__main">
                    <div class="learner-teacher__task-row__head">
                      <strong class="learner-teacher__task-row__title">{{ rangeLabel(item) }}</strong>
                      <span class="learner-home__status learner-teacher__task-row__kind">{{ taskTypeLabel(item) }}</span>
                      <span class="learner-home__status learner-teacher__task-row__status" :class="pillClass(item)">{{ cardStatusText(item) }}</span>
                    </div>
                    <p class="learner-teacher__card-meta learner-teacher__task-row__meta">
                      <span v-if="teacherMeta(item)">{{ teacherMeta(item) }}</span>
                      <span
                        v-if="cardMetaTail(item).text"
                        class="learner-teacher__task-row__due"
                        :class="cardMetaTail(item).tone ? `is-${cardMetaTail(item).tone}` : ''"
                      >{{ cardMetaTail(item).text }}</span>
                    </p>
                    <div
                      v-if="showProgressBar(item)"
                      class="learner-teacher__task-row__progress"
                      role="progressbar"
                      :aria-valuemin="0"
                      :aria-valuemax="100"
                      :aria-valuenow="progressPercent(item)"
                      :aria-label="progressLabel(item)"
                    >
                      <span class="learner-teacher__progress-meter">
                        <span class="learner-teacher__progress-meter-fill" :style="{ width: `${progressPercent(item)}%` }"></span>
                      </span>
                      <small>{{ progressLabel(item) }}</small>
                    </div>
                    <p v-if="taskFeedbackPreview(item)" class="learner-teacher__feedback-preview">{{ taskFeedbackPreview(item) }}</p>
                    <p v-else-if="hasInstruction(item)" class="learner-teacher__instruction-preview">{{ instructionPreview(item) }}</p>
                  </div>
                  <div class="learner-teacher__task-row__actions">
                    <component
                      :is="primaryAction(item)?.href ? 'a' : 'button'"
                      v-if="primaryAction(item)"
                      class="dash-btn dash-btn--primary dash-btn--sm"
                      :class="{ 'is-disabled': savingId === item.id && !primaryAction(item)?.href }"
                      :href="primaryAction(item)?.href || undefined"
                      :disabled="!primaryAction(item)?.href && savingId === item.id"
                      @click="!primaryAction(item)?.href && onPrimaryAction(item)"
                    >
                      {{ primaryAction(item).label }}
                    </component>
                    <a
                      v-if="listenActionHref(item)"
                      class="dash-btn dash-btn--ghost dash-btn--sm"
                      :href="listenActionHref(item)"
                    >
                      {{ t('teacher.assignment_listen_repeat') }}
                    </a>
                    <button
                      v-if="showSecondaryDetailsAction(item)"
                      type="button"
                      class="dash-btn dash-btn--ghost dash-btn--sm"
                      @click="openAssignmentDetail(item)"
                    >
                      {{ t('teacher.learner_assignments_details') }}
                    </button>
                  </div>
                </article>
              </li>
            </ul>
            <div v-if="showViewAll" class="learner-teacher__footer">
              <button type="button" class="dash-text-link" @click="visibleLimit += listLimit">
                {{ ldtp('teacher.learner_assignments_view_more', Math.min(listLimit, remainingCount), { n: Math.min(listLimit, remainingCount) }) }}
              </button>
            </div>
            <div v-if="showShowOlderCompleted" class="learner-teacher__footer">
              <button type="button" class="dash-text-link" @click="showOlderCompleted = true">
                {{ t('teacher.learner_assignments_show_older') }}
              </button>
            </div>
            </div>
        </section>

        <div class="learner-teacher__sidebar">
        <LearnerRevisionTargets
          v-if="revisionTargets.length"
          embedded
          class="learner-teacher__revision-panel"
          :targets="revisionTargets"
        />
        <LearnerWordCorrections :items="wordCorrections" />
        <LearnerTeacherLearning
          class="learner-teacher__feedback-panel--desktop"
          :learning="learningForPanel"
          :pending="!learning"
          :mobile-collapsible="isMobileLayout"
          @open-feedback="openFeedbackFromPanel"
        />

        <LearnerTeacherUpcoming
          v-if="showUpcomingPanel"
          :assignments="assignments"
          :todo-ids="listItems.map(item => item.id)"
          :is-complete="isTeacherApproved"
          :mobile-collapsible="isMobileLayout"
          @open-task="scrollToAssignment"
          @start-task="startUpcomingTask"
        />
        </div>
        </div>
        </div>
      </template>
    </div>

    <DashModalRoot
      :open="categoryOpen"
      labelled-by="learner-type-title"
      root-class="parent-modal-root"
      panel-class="parent-modal"
      @close="categoryOpen = false"
    >
      <header class="parent-modal__head">
        <div>
          <h2 id="learner-type-title">{{ t('teacher.learner_assignments_filter_category') }}</h2>
          <p>{{ t('dashboard.activity_filters_hint') }}</p>
        </div>
        <button type="button" class="parent-modal__close" :aria-label="t('common.close')" @click="categoryOpen = false">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="parent-modal__body">
        <div class="student-choice" role="group" :aria-label="t('teacher.learner_assignments_filter_category')">
          <button
            v-for="category in categoryFilters"
            :key="category.id"
            type="button"
            :class="{ 'is-active': activeCategory === category.id }"
            :aria-pressed="activeCategory === category.id ? 'true' : 'false'"
            @click="chooseCategory(category.id)"
          >
            {{ category.label }}
            <span>{{ category.count }}</span>
          </button>
        </div>
      </div>
    </DashModalRoot>

    <DashModalRoot
      :open="Boolean(detailItem)"
      :labelled-by="detailModalTitleId"
      root-class="parent-modal-root learner-assignment-modal"
      panel-class="parent-modal learner-assignment-modal__panel"
      test-id="learner-assignment-detail-modal"
      @close="closeAssignmentDetail"
    >
      <template v-if="detailItem">
        <header class="parent-modal__head">
          <div>
            <h2 :id="detailModalTitleId" class="dash-drawer__title">{{ rangeLabel(detailItem) }}</h2>
            <p>{{ detailModalSubtitle }}</p>
          </div>
          <button
            type="button"
            class="parent-modal__close"
            :aria-label="t('common.close')"
            @click="closeAssignmentDetail"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <div class="parent-modal__body learner-assignment-modal__body">
          <section v-if="assignmentStatusRationale(detailItem)" class="learner-assignment-modal__section learner-assignment-modal__section--status">
            <h3>{{ t('teacher.assignment_status_label') }}</h3>
            <p>{{ assignmentStatusRationale(detailItem) }}</p>
          </section>
          <section v-if="hasInstruction(detailItem)" class="learner-assignment-modal__section">
            <h3>{{ t('teacher.assignment_instructions_label') }}</h3>
            <p>{{ instructionText(detailItem) }}</p>
          </section>
          <section v-if="recommendedReciterLine(detailItem)" class="learner-assignment-modal__section">
            <h3>{{ t('teacher.assignment_recommended_reciter') }}</h3>
            <p>{{ recommendedReciterLine(detailItem) }}</p>
            <p v-if="recommendedListeningLine(detailItem)" class="text-body-secondary small mb-0">
              {{ recommendedListeningLine(detailItem) }}
            </p>
          </section>
          <details
            v-if="detailItem.assignment?.kind === 'ai_recite'"
            class="learner-assignment-modal__section learner-assignment-modal__technical"
          >
            <summary>{{ t('teacher.how_checks_work') }}</summary>
            <p>{{ requirementHelp(detailItem) }}</p>
            <p class="learner-teacher__ai-disclaimer">{{ t('teacher.playback_ai_wording_only') }}</p>
          </details>
          <section v-if="correctionNote(detailItem)" class="learner-assignment-modal__section">
            <h3>{{ t('teacher.correction_feedback') }}</h3>
            <p>{{ correctionNote(detailItem) }}</p>
          </section>
          <section v-if="needsCorrection(detailItem) && completionLink(detailItem)?.opensMistakeDetails" class="learner-assignment-modal__section">
            <h3>{{ t('teacher.correction_words_to_practise') }}</h3>
            <p class="learner-teacher__ai-disclaimer">{{ t('teacher.playback_ai_wording_only') }}</p>
            <LearnerCompletionMistakePanel
              :result="completionResult(detailItem)"
              :mistakes="completionMistakes(detailItem)"
              :feedback-segments="completionFeedbackSegments(detailItem)"
              :recording-url="completionRecordingUrl(detailItem)"
              :surah="detailItem.assignment?.surah_number"
              hide-perfect-banner
            />
          </section>
          <section v-if="showCardProgress(detailItem)" class="learner-assignment-modal__section">
            <h3>{{ progressLabel(detailItem) }}</h3>
            <span v-if="showProgressBar(detailItem)" class="learner-teacher__progress" aria-hidden="true"><span :style="{ width: `${progressPercent(detailItem)}%` }"></span></span>
          </section>
          <section v-if="detailAttempts(detailItem).length" class="learner-assignment-modal__section">
            <h3>{{ t('teacher.learner_attempt_history_title') }}</h3>
            <ul class="learner-teacher__attempt-history list-unstyled mb-0">
              <li v-for="attempt in detailAttempts(detailItem)" :key="attemptKey(attempt)">
                <article class="learner-teacher__attempt-history-row">
                  <div class="learner-teacher__attempt-history-main">
                    <strong>{{ t('teacher.learner_attempt_row', { n: attempt.n }) }}</strong>
                    <span v-if="attemptDate(attempt)" class="learner-teacher__attempt-history-date">{{ attemptDate(attempt) }}</span>
                    <span
                      v-if="Number.isFinite(Number(attempt.score))"
                      class="learner-teacher__attempt-history-score"
                    >{{ attempt.score }}%</span>
                  </div>
                  <p v-if="attempt.teacher_note" class="learner-teacher__attempt-history-note">{{ attempt.teacher_note }}</p>
                </article>
              </li>
            </ul>
          </section>
          <section v-if="retryContextVisible(detailItem)" class="learner-assignment-modal__section">
            <p>{{ retryScoreLine(detailItem) }}</p>
            <p v-if="retryTeacherNote(detailItem)">{{ retryTeacherNote(detailItem) }}</p>
          </section>
          <section v-if="isTeacherApproved(detailItem) && completionResult(detailItem)" class="learner-assignment-modal__section">
            <h3>{{ completionHeadline(detailItem) || t('teacher.learner_view_results') }}</h3>
            <p v-if="completionAiScoreRow(detailItem)">{{ completionAiScoreRow(detailItem).percent }}% {{ completionAiScoreContext(detailItem) }}</p>
            <button
              type="button"
              class="learner-teacher__detail-btn"
              @click="openAttemptPlayback(detailItem)"
            >
              {{ t('teacher.learner_playback_listen') }}
            </button>
            <LearnerCompletionMistakePanel
              v-if="completionLink(detailItem)?.opensMistakeDetails"
              hide-perfect-banner
              :result="completionResult(detailItem)"
              :mistakes="completionMistakes(detailItem)"
              :feedback-segments="completionFeedbackSegments(detailItem)"
              :recording-url="completionRecordingUrl(detailItem)"
              :surah="detailItem.assignment?.surah_number"
            />
          </section>
        </div>
        <footer v-if="detailItem" class="parent-modal__foot learner-assignment-modal__foot">
          <button type="button" class="dash-btn dash-btn--ghost" @click="openDetailsWithReply(detailItem)">
            {{ t('teacher.task_conversation') }}
          </button>
          <a
            v-if="listenActionHref(detailItem)"
            class="dash-btn dash-btn--secondary"
            :href="listenActionHref(detailItem)"
          >
            {{ t('teacher.assignment_listen_repeat') }}
          </a>
          <component
            :is="primaryAction(detailItem)?.href ? 'a' : 'button'"
            v-if="primaryAction(detailItem)"
            class="dash-btn dash-btn--primary"
            :href="primaryAction(detailItem)?.href || undefined"
            :disabled="!primaryAction(detailItem)?.href && savingId === detailItem.id"
            @click="!primaryAction(detailItem)?.href && onPrimaryAction(detailItem)"
          >
            {{ primaryAction(detailItem).label }}
          </component>
        </footer>
      </template>
    </DashModalRoot>


    <DashModalRoot
      :open="feedbackDrawerOpen"
      :labelled-by="feedbackDrawerTitleId"
      root-class="dash-student-dialog-root"
      panel-class="dash-student-dialog dash-student-dialog--sheet dash-student-dialog--feedback-list"
      test-id="learner-feedback-modal"
      @close="closeFeedbackDrawer"
    >
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true">
              <i class="bi bi-chat-left-quote"></i>
            </span>
            <div class="dash-drawer__head-copy">
              <h2 :id="feedbackDrawerTitleId" class="dash-drawer__title">{{ t('teacher.learner_feedback_open') }}</h2>
              <p class="dash-drawer__subtitle">{{ t('teacher.learner_feedback_drawer_subtitle') }}</p>
              <p v-if="feedbackUnreadCount" class="dash-drawer__count">
                {{ ldtp('teacher.learner_feedback_unread', feedbackUnreadCount) }}
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
        <div class="dash-student-dialog__body learner-student-feedback-modal__body">
            <LearnerWordCorrections :items="wordCorrections" />
            <LearnerTeacherLearning
              variant="drawer"
              :learning="learningForPanel"
              :pending="!learning"
              @open-feedback="openFeedbackFromDrawer"
            />
        </div>
    </DashModalRoot>

    <Teleport to="body">
    <LearnerTaskThreadPanel
      ref="taskThreadPanel"
      :open="Boolean(threadTask)"
      :task="threadTask"
      :is-mobile-layout="isMobileLayout"
      :on-send="sendTaskMessageOptimistic"
      @close="closeTaskThread"
      @messages-updated="onThreadMessagesUpdated"
    />
    </Teleport>

    <DashModalRoot
      :open="Boolean(selectedDirectThread)"
      root-class="dash-student-dialog-root"
      panel-class="dash-student-dialog dash-student-dialog--thread"
      :labelled-by="selectedDirectThread ? `direct-thread-title-${selectedDirectThread.teacher_id}` : ''"
      :close-on-backdrop="!directSending"
      :close-on-escape="!directSending"
      @close="closeDirectThread"
    >
      <template v-if="selectedDirectThread">
      <header class="dash-drawer__head">
        <div class="dash-drawer__head-main">
          <span class="dash-drawer__head-icon" aria-hidden="true"><i class="bi bi-chat-left-text"></i></span>
          <div class="dash-drawer__head-copy">
            <h2 :id="`direct-thread-title-${selectedDirectThread.teacher_id}`" class="dash-drawer__title">{{ selectedDirectThread.teacher_name }}</h2>
            <p class="dash-drawer__subtitle">{{ t('teacher.messages') }}</p>
          </div>
        </div>
        <button ref="directThreadClose" type="button" class="dash-btn dash-btn--tertiary dash-btn--sm dash-drawer__close" :aria-label="t('common.back')" :title="t('common.back')" :disabled="directSending" @click="closeDirectThread">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          <span>{{ t('common.back') }}</span>
        </button>
      </header>
      <div v-if="confirmDirectDiscard" class="learner-task-thread-modal__discard" role="alert">
        <p>{{ t('teacher.unsaved_changes') }}</p>
        <button ref="directKeepEditing" type="button" class="dash-btn" @click="keepDirectEditing">{{ t('teacher.keep_editing') }}</button>
        <button type="button" class="dash-btn" @click="discardDirectThread">{{ t('teacher.discard_changes') }}</button>
      </div>
      <div class="dash-student-dialog__body">
          <section v-if="selectedDirectFeedback" class="learner-direct-feedback" :aria-label="t('dashboard.home_recent_feedback')">
            <h3>{{ t('dashboard.home_recent_feedback') }}</h3>
            <p v-if="selectedDirectFeedback.body || selectedDirectFeedback.preview" dir="auto">{{ selectedDirectFeedback.body || selectedDirectFeedback.preview }}</p>
            <TeacherAudioFeedbackPlayer v-if="selectedDirectFeedback.audio?.available && selectedDirectFeedback.audio?.url" :src="selectedDirectFeedback.audio.url" :duration-ms="selectedDirectFeedback.audio.duration_ms" compact />
          </section>
          <p v-if="selectedDirectThread.can_message === false" class="teacher-meta">{{ t('dashboard.messaging_age_restricted') }}</p>
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
            :ui-direction="directThreadDirection"
            :allow-recording="false"
            :compose="selectedDirectThread.can_message !== false"
            :on-send="sendDirectMessage"
            @sending-change="directSending = $event"
          />
      </div>
      </template>
    </DashModalRoot>

    <DashModalRoot
      :open="Boolean(selectedSubmission)"
      root-class="dash-student-dialog-root"
      panel-class="dash-student-dialog dash-student-dialog--sheet dash-student-dialog--has-foot"
      labelled-by="learner-submission-title"
      test-id="learner-submission-modal"
      @close="closeSubmission"
    >
      <template v-if="selectedSubmission">
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true"><i class="bi bi-clock-history"></i></span>
            <div class="dash-drawer__head-copy">
              <h2 id="learner-submission-title" class="dash-drawer__title">{{ selectedSubmission.title }}</h2>
              <p class="dash-drawer__subtitle">{{ submissionStateLabel(selectedSubmission) }}</p>
            </div>
          </div>
          <button type="button" class="dash-btn dash-btn--tertiary dash-btn--sm dash-drawer__close" :aria-label="t('common.back')" @click="closeSubmission">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            <span>{{ t('common.back') }}</span>
          </button>
        </header>
        <div class="dash-student-dialog__body learner-teacher__submission-detail">
          <dl class="learner-teacher__facts-compact">
            <div><dt>{{ t('teacher.learner_submitted_on') }}</dt><dd>{{ submissionWhen(selectedSubmission.submitted_at) }}</dd></div>
            <div><dt>{{ t('teacher.teacher') }}</dt><dd>{{ selectedSubmission.teacher_name || t('teacher.unavailable') }}</dd></div>
            <div><dt>{{ t('teacher.learner_submission_range') }}</dt><dd>{{ submissionRangeLabel(selectedSubmission) }}</dd></div>
            <div><dt>{{ t('teacher.learner_submission_attempts_label') }}</dt><dd>{{ submissionAttemptsLabel(selectedSubmission) }}</dd></div>
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
          <section v-if="selectedSubmission.teacher_feedback" class="learner-teacher__card-note" :aria-label="t('dashboard.submission_feedback')">
            <strong>{{ t('dashboard.submission_feedback') }}</strong>
            <p v-if="selectedSubmission.teacher_feedback.teacher_name" class="teacher-meta">{{ selectedSubmission.teacher_feedback.teacher_name }}</p>
            <p v-if="selectedSubmission.teacher_feedback.body">{{ selectedSubmission.teacher_feedback.body }}</p>
            <TeacherAudioFeedbackPlayer
              v-if="selectedSubmission.teacher_feedback.audio?.available && selectedSubmission.teacher_feedback.audio?.url"
              :src="selectedSubmission.teacher_feedback.audio.url"
              :duration-ms="selectedSubmission.teacher_feedback.audio.duration_ms"
              compact
            />
          </section>
          <audio v-if="selectedSubmission.audio?.available && selectedSubmission.audio?.url" controls preload="metadata" class="learner-teacher__submission-audio" :src="selectedSubmission.audio.url"></audio>
          <p v-if="selectedSubmission.transcript" class="learner-teacher__submission-transcript">{{ selectedSubmission.transcript }}</p>
          <section v-if="selectedSubmission.self_assessment" class="learner-self-assessment-summary" :aria-label="t('dashboard.assignment_self_assessment_title')">
            <span class="learner-self-assessment-summary__label">{{ t('dashboard.assignment_self_assessment_title') }}</span>
            <strong>{{ selfAssessmentFeelingLabel(selectedSubmission.self_assessment.feeling) }}</strong>
            <p v-if="selectedSubmission.self_assessment.note || selectedSubmission.self_assessment.help_request">{{ selectedSubmission.self_assessment.note || selectedSubmission.self_assessment.help_request }}</p>
            <small>{{ t('dashboard.assignment_self_assessment_score_note') }}</small>
          </section>
        </div>
        <footer class="dash-modal__foot learner-teacher__submission-actions">
          <a
            v-if="submissionPracticeHref(selectedSubmission)"
            class="dash-btn dash-btn--primary dash-btn--sm"
            :href="submissionPracticeHref(selectedSubmission)"
          >{{ t('teacher.practice_again') }}</a>
          <button
            v-else
            type="button"
            class="dash-btn dash-btn--primary dash-btn--sm"
            @click="openAssignmentById(selectedSubmission.recipient_id)"
          >{{ t('teacher.task_conversation') }}</button>
          <button
            v-if="submissionPracticeHref(selectedSubmission)"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            @click="openAssignmentById(selectedSubmission.recipient_id)"
          >
            {{ t('teacher.task_conversation') }}
          </button>
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('self-assess', selectedSubmission)">
            {{ selectedSubmission.self_assessment ? t('dashboard.assignment_self_assessment_update') : t('dashboard.assignment_self_assessment_add') }}
          </button>
        </footer>
      </template>
    </DashModalRoot>

    <DashModalRoot
      :open="Boolean(mistakeDrawerRow)"
      :labelled-by="mistakeDrawerTitleId"
      root-class="dash-student-dialog-root"
      panel-class="dash-student-dialog dash-student-dialog--sheet dash-student-dialog--results"
      @close="closeMistakeDrawer"
    >
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true">
              <i class="bi bi-list-check"></i>
            </span>
            <div class="dash-drawer__head-copy">
              <h2 :id="mistakeDrawerTitleId" class="dash-drawer__title">{{ t('teacher.learner_view_results') }}</h2>
              <p v-if="mistakeDrawerRow" class="dash-drawer__subtitle">{{ rangeLabel(mistakeDrawerRow) }}</p>
            </div>
          </div>
          <button
            ref="mistakeDrawerClose"
            type="button"
            class="dash-icon-btn dash-drawer__close"
            :aria-label="t('dashboard.drawer_close')"
            @click="closeMistakeDrawer"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <div class="dash-student-dialog__body learner-student-results-modal__body">
            <LearnerCompletionMistakePanel
              v-if="mistakeDrawerRow"
              :result="completionResult(mistakeDrawerRow)"
              :mistakes="completionMistakes(mistakeDrawerRow)"
              :feedback-segments="completionFeedbackSegments(mistakeDrawerRow)"
              :recording-url="completionRecordingUrl(mistakeDrawerRow)"
              :surah="mistakeDrawerRow?.assignment?.surah_number"
            />
        </div>
    </DashModalRoot>

    <LearnerAttemptPlaybackModal
      :open="Boolean(playbackRow)"
      :row="playbackRow"
      :is-mobile="isMobileLayout"
      @close="playbackRow = null"
    />

    <TeacherReciteEvidenceModal
      :open="Boolean(recitationReviewRow)"
      :row="recitationReviewRow"
      mode="mushaf"
      shell="student"
      @close="recitationReviewRow = null"
    />
  </section>
</template>

<script>
import './LearnerTeacherWorkspace.css'
import './LearnerFeedbackModal.css'
import { i18nMixin } from '../../mixins/i18nMixin'
import { setModalScrollLock } from '../../utils/modalScrollLock.js'
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import { assignmentCountLabel, assignmentCountsScoredChecks, assignmentProgressLabel, learnerRecitationReviewRow } from '../../scripts/teacher/formatters'
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
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { learnerDashboardT, learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'
import {
  ALL_TAB_COMPLETED_PREVIEW,
  buildAllTabList,
  completionAiScoreSummary,
  completionResultLink,
  completionScoreBand,
  learnerCompletedPerformanceLabel,
  learnerTaskAttemptCount,
  isLearnerTaskApproved,
  isLearnerSubmitted,
  learnerNeedsCorrection,
  mergeFeedbackReadState,
  persistFeedbackRead,
  readFeedbackReadMap,
  sortAllTabAssignments,
  sortFeedbackInbox,
  learnerWeeklyProgressFromAssignments,
} from '../../scripts/teacher/learnerDashboard.js'
import { shouldShowUpcomingPanel } from '../../scripts/teacher/learnerUpcoming.js'
import { assignmentDisplayLabel } from '../../scripts/teacher/taskTypes.js'
import {
  countDueWindows,
  countLearningBuckets,
  filterLearningAssignments,
  learningCategoryCounts,
  learningStatusBucket,
  matchesDueWindow,
  readLearnerMyLearningFilters,
  writeLearnerMyLearningFilters,
} from '../../scripts/dashboard/learnerLearningView.js'
import {
  cardHasExpandableContent as learnerCardHasExpandableContent,
  resolveCardExpanded,
} from '../../scripts/teacher/learnerCardExpansion.js'
import TeacherTaskConversation from './TeacherTaskConversation.vue'
import TeacherAudioFeedbackPlayer from './TeacherAudioFeedbackPlayer.vue'
import LearnerTeacherLearning from './LearnerTeacherLearning.vue'
import LearnerWordCorrections from './LearnerWordCorrections.vue'
import LearnerTeacherUpcoming from './LearnerTeacherUpcoming.vue'
import LearnerRevisionTargets from './LearnerRevisionTargets.vue'
import LearnerAttemptPlaybackModal from '@/components/shared/LearnerAttemptPlaybackModal.vue'
import LearnerCompletionMistakePanel from '@/components/shared/LearnerCompletionMistakePanel.vue'
import TeacherReciteEvidenceModal from './TeacherReciteEvidenceModal.vue'
import LearnerTaskThreadPanel from './LearnerTaskThreadPanel.vue'
import { resolveLearnerCompletionAttempt } from '../../scripts/teacher/learnerCompletionMistakes.js'

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'overdue', 'awaiting_confirmation'])

export default {
  name: 'LearnerTeacherSection',
  components: {
    DashModalRoot,
    TeacherTaskConversation,
    TeacherAudioFeedbackPlayer,
    LearnerTeacherLearning,
    LearnerWordCorrections,
    LearnerTeacherUpcoming,
    LearnerRevisionTargets,
    LearnerCompletionMistakePanel,
    LearnerAttemptPlaybackModal,
    TeacherReciteEvidenceModal,
    LearnerTaskThreadPanel,
  },
  mixins: [i18nMixin],
  props: {
    support: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    savingId: { type: Number, default: 0 },
    completionMessage: { type: String, default: '' },
    failedItem: { type: Object, default: null },
    studentFirstName: { type: String, default: '' },
    onSendNote: { type: Function, required: true },
    onSendDirectMessage: { type: Function, required: true },
  },
  emits: ['start', 'complete', 'self-assess', 'view-completed', 'dismiss-completion', 'support-thread-update'],
  data() {
    return {
      activeFilter: 'todo',
      activeDueFilter: 'all',
      activeCategory: 'all',
      categoryOpen: false,
      directDrafts: {},
      directSent: {},
      directSynced: {},
      directError: {},
      directSuccess: {},
      directSaving: null,
      directPollTimer: null,
      directPollVersions: {},
      directDisposed: false,
      listLimit: 4,
      visibleLimit: 4,
      selectedItem: null,
      threadTask: null,
      selectedDirectThread: null,
      selectedDirectFeedback: null,
      directSending: false,
      confirmDirectDiscard: false,
      selectedSubmission: null,
      recitationReviewRow: null,
      expandedMistakeDetailsId: null,
      mistakeDrawerRow: null,
      mistakeDrawerTitleId: `learner-mistake-drawer-${Math.random().toString(36).slice(2, 9)}`,
      isMobileLayout: false,
      mobileMedia: null,
      playbackRow: null,
      focusConversationComposer: false,
      feedbackDrawerOpen: false,
      detailItemId: null,
      detailModalTitleId: `learner-assignment-detail-${Math.random().toString(36).slice(2, 9)}`,
      feedbackDrawerTitleId: `learner-feedback-drawer-${Math.random().toString(36).slice(2, 9)}`,
      showOlderCompleted: false,
      expandedRetryNotes: {},
      expandedCardIds: {},
      feedbackReadVersion: 0,
      defaultFilterSynced: false,
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
    learnerAttendance() {
      const attendance = this.support?.attendance
      if (!attendance || attendance.rate_percent == null || !Number(attendance.total || 0)) return null
      return attendance
    },
    learnerAttendanceHint() {
      if (!this.learnerAttendance) return ''
      const counts = this.learnerAttendance.counts || {}
      return this.t('teacher.attendance_absent_late', {
        absent: Number(counts.absent || 0),
        late: Number(counts.late || 0),
      })
    },
    learning() {
      return this.support?.learning || null
    },
    wordCorrections() {
      return Array.isArray(this.learning?.word_corrections) ? this.learning.word_corrections : []
    },
    learnerLocale() {
      return this.$i18n?.global?.locale?.value
        || (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : null)
        || 'en'
    },
    showWeeklyProgress() {
      return !this.loading && this.weeklyProgressTotal > 0
    },
    weeklyProgressSnapshot() {
      return learnerWeeklyProgressFromAssignments(
        this.assignments,
        (row) => this.isTeacherApproved(row),
      )
    },
    weeklyProgressDone() {
      return this.weeklyProgressSnapshot.done
    },
    weeklyProgressTotal() {
      return this.weeklyProgressSnapshot.total
    },
    weeklyProgressLabel() {
      if (!this.weeklyProgressDone) return this.ldt('teacher.learner_weekly_progress_none')
      return this.ldt('teacher.learner_weekly_progress', {
        done: this.weeklyProgressDone,
        total: this.weeklyProgressTotal,
      })
    },
    weeklyProgressPercent() {
      return this.weeklyProgressSnapshot.percent
    },
    weeklyMeterStyle() {
      const percent = Number(this.weeklyProgressPercent) || 0
      return {
        width: percent <= 0 ? '0px' : `${percent}%`,
        '--learner-weekly-fill': percent <= 0 ? '0px' : `${percent}%`,
      }
    },
    todoAssignmentIds() {
      return this.assignments
        .filter((row) => ACTIVE_STATUSES.has(row.status) || this.needsCorrection(row))
        .map((row) => row.id)
    },
    showUpcomingPanel() {
      return shouldShowUpcomingPanel(
        this.assignments,
        (row) => this.isTeacherApproved(row),
        this.listItems.map(item => item.id),
      )
    },
    teacherNames() {
      const fromAssignments = [...new Set(this.assignments.map((row) => row?.teacher_name).filter(Boolean))]
      if (fromAssignments.length) return fromAssignments
      return [...new Set((this.support?.direct_threads || []).map((thread) => thread.teacher_name).filter(Boolean))]
    },
    teacherEyebrow() {
      return this.teacherNames.length > 1
        ? this.ldt('teacher.learner_teachers_multiple')
        : this.ldt('teacher.learner_section_from_label')
    },
    sectionHeading() {
      const title = this.ldt('teacher.learner_section_title')
      const names = this.teacherNames
      if (names.length === 1) return `${title} · ${names[0]}`
      if (names.length > 1) {
        return `${title} · ${this.ldtp('teacher.learner_teachers_context', names.length, { n: names.length })}`
      }
      return title
    },
    primaryTeacherName() {
      const names = this.teacherNames
      if (names.length === 1) return names[0]
      if (names.length === 2) return this.ldt('teacher.learner_teachers_pair', { a: names[0], b: names[1] })
      if (names.length > 2) return this.ldt('teacher.learner_teachers_named_more', { name: names[0], n: names.length - 1 })
      return this.t('teacher.learner_teacher_fallback')
    },
    teacherInitials() {
      const name = this.teacherNames[0] || this.t('teacher.learner_teacher_fallback')
      const fallback = this.t('teacher.learner_teacher_fallback')
      if (!name || name === fallback) return 'T'
      return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    },
    feedbackItemsRaw() {
      return Array.isArray(this.learning?.feedback_inbox) ? this.learning.feedback_inbox : []
    },
    feedbackInboxMerged() {
      void this.feedbackReadVersion
      const map = readFeedbackReadMap()
      return sortFeedbackInbox(mergeFeedbackReadState(this.feedbackItemsRaw, map))
    },
    feedbackItems() {
      return this.feedbackInboxMerged
    },
    feedbackUnreadCount() {
      return this.feedbackInboxMerged.filter((item) => item.unread).length
    },
    learningForPanel() {
      if (!this.learning) return null
      return { ...this.learning, feedback_inbox: this.feedbackInboxMerged }
    },
    feedbackTabAriaLabel() {
      const base = this.ldt('teacher.learner_feedback_open_aria')
      if (!this.feedbackUnreadCount) return base
      return `${base}. ${this.ldtp('teacher.learner_feedback_unread', this.feedbackUnreadCount)}`
    },
    directThreadDirection() {
      return ['ar', 'ur'].includes(String(this.learnerLocale).split('-')[0]) ? 'rtl' : 'ltr'
    },
    allTabGroups() {
      return sortAllTabAssignments(this.assignments, {
        isTeacherApproved: (row) => this.isTeacherApproved(row),
        isPending: (row) => ACTIVE_STATUSES.has(row.status) || this.needsCorrection(row),
      })
    },
    allTabHiddenCompletedCount() {
      return buildAllTabList(this.allTabGroups, ALL_TAB_COMPLETED_PREVIEW).hiddenCompletedCount
    },
    showShowOlderCompleted() {
      return this.activeFilter === 'completed'
        && !this.showOlderCompleted
        && this.dueFilteredItems.length > ALL_TAB_COMPLETED_PREVIEW
    },
    revisionTargets() {
      return Array.isArray(this.support?.circle?.revision_targets) ? this.support.circle.revision_targets : []
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
    detailItem() {
      if (!this.detailItemId) return null
      return this.assignments.find((row) => Number(row.id) === Number(this.detailItemId)) || null
    },
    detailModalSubtitle() {
      if (!this.detailItem) return ''
      return [this.taskTypeLabel(this.detailItem), this.teacherName(this.detailItem), this.cardStatusText(this.detailItem), this.cardMetaTail(this.detailItem).text]
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index)
        .join(' · ')
    },
    pendingCount() {
      return this.bucketCounts.todo
    },
    completedCount() {
      return this.bucketCounts.completed
    },
    bucketCounts() {
      const counts = countLearningBuckets(this.assignments)
      counts.plan = this.support?.learning_plan ? 1 : 0
      return counts
    },
    categoryCounts() {
      return learningCategoryCounts(this.assignments, this.activeFilter)
    },
    showCategoryFilters() {
      const counts = this.categoryCounts
      const present = ['nazra', 'hifz', 'tajweed', 'revision'].filter((id) => counts[id] > 0)
      return present.length > 1 || this.activeCategory !== 'all'
    },
    showPlanSlot() {
      return this.activeFilter === 'todo' && Boolean(this.support?.learning_plan)
    },
    categoryButtonLabel() {
      const active = this.categoryFilters.find((item) => item.id === this.activeCategory)
      if (!active || active.id === 'all') return this.t('dashboard.student_filter_type')
      return active.label
    },
    categoryFilters() {
      const counts = this.categoryCounts
      const label = {
        all: this.ldt('teacher.learner_category_all'),
        nazra: this.t('dashboard.activity_area_nazra'),
        hifz: this.t('dashboard.activity_area_hifz'),
        tajweed: this.t('dashboard.activity_area_tajweed'),
        revision: this.t('dashboard.activity_area_revision'),
      }
      return [
        { id: 'all', label: label.all, count: counts.all },
        { id: 'nazra', label: label.nazra, count: counts.nazra },
        { id: 'hifz', label: label.hifz, count: counts.hifz },
        { id: 'tajweed', label: label.tajweed, count: counts.tajweed },
        { id: 'revision', label: label.revision, count: counts.revision },
      ].filter((item) => item.id === 'all' || item.id === this.activeCategory || item.count > 0)
    },
    primaryFilters() {
      const counts = this.bucketCounts
      return [
        { id: 'todo', label: this.ldt('teacher.learner_assignments_filter_todo'), count: counts.todo },
        { id: 'progress', label: this.ldt('teacher.learner_assignments_filter_progress'), count: counts.progress },
        { id: 'review', label: this.ldt('teacher.learner_assignments_filter_review'), count: counts.review },
        { id: 'completed', label: this.ldt('teacher.learner_assignments_filter_completed'), count: counts.completed },
      ]
    },
    secondaryDueFilters() {
      const counts = countDueWindows(this.assignments, {
        status: this.activeFilter,
        category: this.activeCategory,
      })
      return [
        { id: 'all', label: this.t('teacher.task_filter_all'), count: counts.all },
        { id: 'today', label: this.t('teacher.due_today'), count: counts.today },
        { id: 'upcoming', label: this.ldt('teacher.learner_assignments_due_upcoming'), count: counts.upcoming },
        { id: 'overdue', label: this.t('teacher.task_filter_overdue'), count: counts.overdue },
      ]
    },
    filteredByStatus() {
      return filterLearningAssignments(this.assignments, {
        status: this.activeFilter,
        category: this.activeCategory,
      })
    },
    listEmptyMessage() {
      if (!this.assignments.length || this.listItems.length) return ''
      if (this.activeDueFilter !== 'all') return this.t('teacher.task_filter_empty')
      if (this.activeCategory !== 'all') return this.ldt('teacher.learner_assignments_empty_category')
      if (this.activeFilter === 'todo') return this.ldt('teacher.learner_assignments_caught_up')
      if (this.activeFilter === 'progress') return this.ldt('teacher.learner_assignments_empty_progress')
      if (this.activeFilter === 'review') return this.ldt('teacher.learner_assignments_empty_review')
      if (this.activeFilter === 'completed') return this.ldt('teacher.learner_assignments_no_completed')
      return ''
    },
    dueFilteredItems() {
      const base = this.filteredByStatus
      const scoped = this.activeDueFilter === 'all'
        ? base
        : base.filter((row) => matchesDueWindow(row, this.activeDueFilter))
      if (this.activeFilter === 'completed' && !this.showOlderCompleted && scoped.length > ALL_TAB_COMPLETED_PREVIEW) {
        return scoped.slice(0, ALL_TAB_COMPLETED_PREVIEW)
      }
      return scoped
    },
    dueFilteredItemsFull() {
      const base = this.filteredByStatus
      if (this.activeDueFilter === 'all') return base
      return base.filter((row) => matchesDueWindow(row, this.activeDueFilter))
    },
    listItems() {
      return this.dueFilteredItems.slice(0, this.visibleLimit)
    },
    openListCount() {
      return this.dueFilteredItemsFull.length
    },
    remainingCount() {
      return Math.max(0, this.openListCount - this.visibleLimit)
    },
    showViewAll() {
      return this.remainingCount > 0
    },
  },
  watch: {
    assignments: {
      handler() {
        this.visibleLimit = this.listLimit
        this.syncDefaultFilter()
      },
      immediate: true,
    },
    selectedItem(value) {
      this.syncModalOpen()
    },
    threadTask() {
      this.syncModalOpen()
    },
    support: {
      deep: true,
      handler() {
        if (this.detailItemId && !this.assignments.some((item) => Number(item.id) === Number(this.detailItemId))) {
          this.detailItemId = null
        }
        if (!this.threadTask?.id) return
        const row = this.assignments.find((item) => Number(item.id) === Number(this.threadTask.id))
        if (row) this.threadTask = row
      },
    },
    selectedDirectThread(value) {
      this.syncModalOpen()
    },
  },
  beforeUnmount() {
    this.directDisposed = true
    setModalScrollLock(this, false)
    window.clearInterval(this.directPollTimer)
    if (this.mobileMedia?.removeEventListener) {
      this.mobileMedia.removeEventListener('change', this.syncMobileLayout)
    }
  },
  mounted() {
    this.directPollTimer = window.setInterval(() => this.refreshDirectThreads(), 10000)
    this.syncDefaultFilter()
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mobileMedia = window.matchMedia('(max-width: 767.98px)')
      this.syncMobileLayout()
      this.mobileMedia.addEventListener('change', this.syncMobileLayout)
    }
  },
  methods: {
    ldt(key, params = {}) {
      return learnerDashboardT(this.learnerLocale, this.$i18n, key, params)
    },
    ldtp(key, count, params = {}) {
      return learnerDashboardTp(this.learnerLocale, this.$i18n, key, count, params)
    },
    persistLearningFilters() {
      writeLearnerMyLearningFilters({
        status: this.activeFilter,
        due: this.activeDueFilter,
        category: this.activeCategory,
      })
    },
    syncDefaultFilter() {
      if (this.defaultFilterSynced || this.loading) return
      if (!this.assignments.length) return
      this.defaultFilterSynced = true
      const saved = readLearnerMyLearningFilters()
      if (saved?.status) this.activeFilter = saved.status
      if (saved?.due) this.activeDueFilter = saved.due
      if (saved?.category) this.activeCategory = saved.category
      if (saved) return
      this.activeFilter = this.pendingCount > 0 ? 'todo' : (this.bucketCounts.progress > 0 ? 'progress' : 'todo')
    },
    syncModalOpen() {
      setModalScrollLock(this, Boolean(this.threadTask || this.selectedDirectThread))
    },
    async sendDirectMessage(body) {
      const thread = this.selectedDirectThread
      if (!thread) throw new Error(this.t('teacher.action_failed'))
      this.directPollVersions = { ...(this.directPollVersions || {}), [thread.teacher_id]: Number(this.directPollVersions?.[thread.teacher_id] || 0) + 1 }
      const message = await this.onSendDirectMessage(thread.teacher_id, body)
      if (!message?.id) throw new Error(this.t('teacher.action_failed'))
      if (this.directDisposed) return message
      this.directPollVersions = { ...this.directPollVersions, [thread.teacher_id]: Number(this.directPollVersions[thread.teacher_id] || 0) + 1 }
      this.directSent = { ...(this.directSent || {}), [thread.teacher_id]: [...new Map([...(this.directSent?.[thread.teacher_id] || []), message].map(row => [row.id, row])).values()] }
      if (this.selectedDirectThread?.teacher_id === thread.teacher_id) {
        this.selectedDirectThread.messages = [...new Map([...(this.selectedDirectThread.messages || []), message].map(row => [row.id, row])).values()]
      }
      return message
    },
    openTeacherThread(teacherId) {
      const thread = this.directThreads.find((row) => Number(row.teacher_id) === Number(teacherId))
      if (thread) this.openDirectThread(thread)
    },
    openDirectThreadByTeacherId(teacherId) {
      this.openTeacherThread(teacherId)
    },
    openDirectThread(thread, feedback = null) {
      if (this.directSending) return
      this.confirmDirectDiscard = false
      this.selectedDirectFeedback = feedback && !(thread.messages || []).some(message => String(message.id) === String(feedback.id)) ? feedback : null
      this.selectedDirectThread = thread
      this.$nextTick(() => {
        this.$refs.directConversation?.resetComposer?.()
        this.$refs.directThreadClose?.focus({ preventScroll: true })
      })
    },
    closeDirectThread() {
      if (this.directSending) return
      if (this.confirmDirectDiscard) { this.keepDirectEditing(); return }
      if (this.$refs.directConversation?.hasDraft) {
        this.confirmDirectDiscard = true
        this.$nextTick(() => this.$refs.directKeepEditing?.focus())
        return
      }
      this.selectedDirectThread = null
    },
    keepDirectEditing() {
      this.confirmDirectDiscard = false
      this.$nextTick(() => this.$refs.directConversation?.focusComposer?.())
    },
    discardDirectThread() {
      if (this.directSending) return
      this.$refs.directConversation?.clearConversationDraft?.()
      this.confirmDirectDiscard = false
      this.selectedDirectThread = null
    },
    directUnreadCount(thread) {
      return (thread.messages || []).filter((message) => message.unread && message.sender === 'teacher').length
    },
    async sendTaskMessageOptimistic(task, body, recording = null, clientMessageId = null) {
      const message = await this.onSendNote(task, body, recording, clientMessageId)
      return { message }
    },
    onThreadMessagesUpdated(payload) {
      this.$emit('support-thread-update', payload)
    },
    taskThreadUnread(row) {
      if (Number.isFinite(Number(row?.thread_unread_count))) {
        return Math.max(0, Number(row.thread_unread_count))
      }
      return this.unreadTeacherMessages(row)
    },
    openTaskThread(row) {
      this.threadTask = row
    },
    closeTaskThread() {
      this.threadTask = null
    },
    async refreshDirectThreads() {
      const threads = this.support?.direct_threads || []
      await Promise.all(threads.map(async (thread) => {
        const request = Number(this.directPollVersions[thread.teacher_id] || 0) + 1
        this.directPollVersions = { ...this.directPollVersions, [thread.teacher_id]: request }
        try {
          const payload = await learningApi.getLearnerTeacherMessages(thread.teacher_id)
          if (this.directDisposed || request !== this.directPollVersions[thread.teacher_id]) return
          this.directSynced = { ...this.directSynced, [thread.teacher_id]: payload?.messages || [] }
          if (this.selectedDirectThread?.teacher_id === thread.teacher_id) {
            this.selectedDirectThread.messages = [...new Map([...(payload?.messages || []), ...(this.directSent[thread.teacher_id] || [])].map(message => [message.id, message])).values()]
          }
        } catch (_) { /* preserve existing messages during transient polling failures */ }
      }))
    },
    directMessageWhen(message) {
      return this.displayDate(message?.created_at)
    },
    openAssignmentDetail(row) {
      if (!row?.id) return
      this.detailItemId = row.id
    },
    closeAssignmentDetail() {
      this.detailItemId = null
    },
    setFilter(id) {
      if (id === 'done') {
        this.activeFilter = 'completed'
      } else {
        const known = ['todo', 'progress', 'review', 'completed']
        this.activeFilter = known.includes(id) ? id : 'todo'
      }
      this.visibleLimit = this.listLimit
      this.showOlderCompleted = false
      this.persistLearningFilters()
    },
    setDueFilter(id) {
      const known = ['all', 'today', 'upcoming', 'overdue']
      this.activeDueFilter = known.includes(id) ? id : 'all'
      this.visibleLimit = this.listLimit
      this.persistLearningFilters()
    },
    setCategory(id) {
      const known = ['all', 'nazra', 'hifz', 'tajweed', 'revision']
      this.activeCategory = known.includes(id) ? id : 'all'
      this.visibleLimit = this.listLimit
      this.persistLearningFilters()
    },
    chooseCategory(id) {
      this.setCategory(id)
      this.categoryOpen = false
    },
    cardSecondaryMeta(row) {
      const parts = [this.teacherName(row), this.cardStatusText(row)]
      if (this.isTeacherApproved(row) && this.completedPerformanceLabel(row)) {
        parts.push(this.completedPerformanceLabel(row))
      } else if (this.showCompactAttemptCount(row)) {
        parts.push(this.taskAttemptCountLabel(row))
      }
      const tail = this.cardMetaTail(row).text
      if (tail && tail !== this.cardStatusText(row)) parts.push(tail)
      return parts.filter(Boolean).join(' · ')
    },
    onTaskFilterKeydown(event, id) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const ids = this.primaryFilters.map(filter => filter.id)
      const direction = this.directThreadDirection === 'rtl' ? -1 : 1
      const offset = event.key === 'ArrowRight' ? direction : -direction
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (ids.indexOf(id) + offset + ids.length) % ids.length
      this.setFilter(ids[index])
      this.$nextTick(() => this.$el.querySelector(`#learner-filter-${ids[index]}`)?.focus())
    },
    scrollToAssignment(row) {
      if (!row) return
      this.activeCategory = 'all'
      const bucket = learningStatusBucket(row)
      this.setFilter(bucket === 'review' ? 'review' : bucket)
      this.$nextTick(() => {
        const el = typeof document !== 'undefined'
          ? document.getElementById(`learner-task-card-${row.id}`)
          : null
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
      })
    },
    startUpcomingTask(row) {
      if (!row) return
      if (row.href) {
        if (typeof window !== 'undefined') window.location.assign(row.href)
        return
      }
      this.scrollToAssignment(row)
      this.$emit('start', row)
    },
    openDetails(row) {
      this.openTaskThread(row)
    },
    openDetailsWithReply(row) {
      this.openTaskThread(row)
      this.$nextTick(() => this.$refs.taskThreadPanel?.$refs?.conversation?.focusComposer?.())
    },
    openAssignmentById(recipientId) {
      const id = Number(recipientId)
      const row = this.assignments.find((item) => Number(item.id) === id || Number(item.assignment?.id) === id)
      if (row) {
        this.closeSubmission()
        this.openDetails(row)
      }
    },
    openFeedback(item) {
      const recipientId = Number(item?.recipient_id || item?.related_assignment?.recipient_id || 0)
      const assignmentId = Number(item?.related_assignment?.id || 0)
      if (recipientId || assignmentId) {
        const row = this.assignments.find((assignment) => (
          (recipientId && Number(assignment.id) === recipientId)
          || (assignmentId && Number(assignment.assignment?.id) === assignmentId)
        ))
        if (row) {
          this.closeSubmission()
          this.openDetailsWithReply(row)
          return true
        }
      }
      if (item?.teacher_id) {
        const thread = this.directThreads.find((row) => Number(row.teacher_id) === Number(item.teacher_id))
        if (thread) {
          this.openDirectThread(thread, item)
          return true
        }
      }
      return false
    },
    openFeedbackFromPanel(item) {
      this.markFeedbackRead(item)
      this.openFeedback(item)
    },
    openFeedbackFromDrawer(item) {
      this.markFeedbackRead(item)
      this.closeFeedbackDrawer()
      this.openFeedback(item)
    },
    markFeedbackRead(item) {
      if (!item?.id) return
      persistFeedbackRead(item.id)
      this.feedbackReadVersion += 1
    },
    isCardExpanded(row) {
      return resolveCardExpanded(row, { expandedOverrides: this.expandedCardIds })
    },
    toggleCardExpanded(id) {
      const row = this.assignments.find((item) => Number(item.id) === Number(id))
      if (!row) return
      this.expandedCardIds = {
        ...this.expandedCardIds,
        [Number(id)]: !this.isCardExpanded(row),
      }
    },
    expandTaskCard(id) {
      const cardId = Number(id)
      if (!Number.isFinite(cardId)) return
      this.expandedCardIds = { ...this.expandedCardIds, [cardId]: true }
    },
    cardHasExpandableContent(row) {
      return learnerCardHasExpandableContent(row, {
        hasCompletionResult: (r) => Boolean(this.completionResult(r)),
      })
    },
    cardExpandAriaLabel(row) {
      return this.isCardExpanded(row)
        ? this.t('teacher.learner_card_collapse')
        : this.t('teacher.learner_card_expand')
    },
    taskAttemptCount(row) {
      return learnerTaskAttemptCount(row)
    },
    showCompactAttemptCount(row) {
      const count = this.taskAttemptCount(row)
      const progressVisible = this.showCardProgress(row)
        && (!this.cardHasExpandableContent(row) || this.isCardExpanded(row))
      return count > 0 && !(progressVisible && count === Number(row?.progress?.completed || 0))
    },
    taskAttemptCountLabel(row) {
      const n = this.taskAttemptCount(row)
      if (!n) return ''
      return assignmentCountLabel(row?.assignment, n, this.t.bind(this))
    },
    submissionAttemptsLabel(item) {
      const attempts = assignmentCountLabel({ kind: item?.kind }, Number(item?.attempt_count || 0), this.t.bind(this))
      const submissions = Number(item?.submission_count || 1) === 1
        ? this.t('teacher.learner_submission_count_one', { n: 1 })
        : this.t('teacher.learner_submission_count_other', { n: Number(item?.submission_count || 0) })
      return `${attempts} · ${submissions}`
    },
    selfAssessmentFeelingLabel(feeling) {
      const key = `dashboard.assignment_self_assessment_${feeling}`
      const label = this.t(key)
      return label && label !== key ? label : feeling
    },
    completedPerformanceLabel(row) {
      if (!this.isTeacherApproved(row)) return ''
      return learnerCompletedPerformanceLabel(
        row,
        this.t.bind(this),
        (key, count, params) => this.ldtp(key, count, params),
      )
    },
    performanceMetaClass(row) {
      const band = completionScoreBand(this.completionResult(row)?.accuracy_percent)
      if (band === 'high' || band === 'mid' || band === 'low') return `is-${band}`
      return 'is-passed'
    },
    openFeedbackDrawer() {
      this.feedbackDrawerOpen = true
    },
    closeFeedbackDrawer() {
      this.feedbackDrawerOpen = false
    },
    closeNavigationOverlays() {
      if (this.feedbackDrawerOpen) this.closeFeedbackDrawer()
      if (this.mistakeDrawerRow) this.closeMistakeDrawer()
      if (this.selectedSubmission) this.closeSubmission()
      if (this.selectedItem) this.selectedItem = null
      if (this.recitationReviewRow) this.recitationReviewRow = null
      if (this.playbackRow) this.playbackRow = null
      if (this.threadTask) this.$refs.taskThreadPanel?.close?.()
      if (this.selectedDirectThread) this.closeDirectThread()
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
    completionAiScoreRow(row) {
      const result = this.completionResult(row)
      if (!result || result.headline_type !== 'ai_score') return null
      if (result.accuracy_percent === null || result.accuracy_percent === undefined) return null
      return { percent: result.accuracy_percent }
    },
    completionAiScoreSummaryRow(row) {
      const result = this.completionResult(row)
      if (!result || result.headline_type !== 'ai_score') return null
      return completionAiScoreSummary(result, this.t.bind(this), (key, count, params) => this.ldtp(key, count, params))
    },
    completionAiScoreContext() {
      return this.t('teacher.learner_completion_ai_score_context')
    },
    scoreSummaryAddsDetail(row) {
      const summary = this.completionAiScoreSummaryRow(row)
      if (!summary?.label) return false
      return summary.label !== this.t('teacher.learner_ai_score_perfect')
    },
    completionLink(row) {
      return completionResultLink(this.completionResult(row), this.t.bind(this))
    },
    completionAttemptBundle(row) {
      return resolveLearnerCompletionAttempt(row)
    },
    completionMistakes(row) {
      return this.completionAttemptBundle(row).mistakes
    },
    completionFeedbackSegments(row) {
      return this.completionAttemptBundle(row).feedbackSegments || []
    },
    completionRecordingUrl(row) {
      return this.completionAttemptBundle(row).recordingUrl || ''
    },
    toggleMistakeDetails(row) {
      if (this.isMobileLayout) {
        if (this.mistakeDetailsExpanded(row)) {
          this.closeMistakeDrawer()
        } else {
          this.openMistakeDrawer(row)
        }
        return
      }
      const id = Number(row?.id)
      const opening = !this.mistakeDetailsExpanded(row)
      this.expandedMistakeDetailsId = opening ? id : null
      if (opening) this.expandTaskCard(id)
    },
    mistakeDetailsExpanded(row) {
      return Number(this.expandedMistakeDetailsId) === Number(row.id)
    },
    onCompletionLinkClick(row) {
      const link = this.completionLink(row)
      if (!link) return
      if (link.opensFeedback && !link.opensMistakeDetails) {
        this.openDetails(row)
        return
      }
      if (link.opensMistakeDetails) {
        if (this.isMobileLayout) {
          this.openMistakeDrawer(row)
          return
        }
        const next = this.mistakeDetailsExpanded(row) ? null : row.id
        this.expandedMistakeDetailsId = next
        if (next) this.expandTaskCard(row.id)
        return
      }
      this.openDetails(row)
    },
    openMistakeDrawer(row) {
      this.mistakeDrawerRow = row
    },
    closeMistakeDrawer() {
      this.mistakeDrawerRow = null
    },
    syncMobileLayout() {
      this.isMobileLayout = Boolean(this.mobileMedia?.matches)
      if (!this.isMobileLayout) {
        this.closeMistakeDrawer()
      } else {
        this.expandedMistakeDetailsId = null
      }
    },
    retryContextVisible(row) {
      if (this.isTeacherApproved(row)) return false
      return Boolean(row?.last_attempt?.attempt_number)
    },
    retryScoreLine(row) {
      const attempt = row?.last_attempt
      if (!attempt) return ''
      const score = attempt.accuracy_percent ?? '—'
      return this.t('teacher.learner_last_attempt_score', { n: attempt.attempt_number, score })
    },
    retryTeacherNote(row) {
      return String(row?.last_attempt?.teacher_note || '').trim()
    },
    isRetryNoteExpanded(row) {
      return Boolean(this.expandedRetryNotes[row.id])
    },
    toggleRetryNote(row) {
      this.expandedRetryNotes = { ...this.expandedRetryNotes, [row.id]: true }
    },
    displayDate(value) {
      const locale = this.$i18n?.locale?.value || 'en'
      return formatLearnerDisplayDate(value, this.t.bind(this), locale)
    },
    openAttemptPlayback(row) {
      this.playbackRow = row
    },
    openRecitationReview(row) {
      this.recitationReviewRow = learnerRecitationReviewRow(row)
    },
    openSubmissionDetail(item) {
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
    },
    assignmentHref(recipientId) {
      const row = this.assignments.find((item) => Number(item.id) === Number(recipientId))
      return row?.href || ''
    },
    submissionPracticeHref(item) {
      if (!item) return ''
      return item.practice_href || this.assignmentHref(item.recipient_id) || ''
    },
    submissionPillClass(item) {
      if (item?.review_state === 'approved') return 'is-approved'
      if (item?.review_state === 'needs_correction') return 'is-correction'
      return 'is-submitted'
    },
    submissionStateLabel(item) {
      if (item?.review_state === 'approved') return this.t('teacher.status_teacher_approved')
      if (item?.review_state === 'needs_correction') return this.t('teacher.status_needs_correction')
      return this.t('teacher.task_state_waiting_review')
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
      const assignment = row?.assignment || {}
      const activity = {
        nazra: this.t('dashboard.activity_area_nazra'),
        hifz: this.t('dashboard.activity_area_hifz'),
        tajweed: this.t('dashboard.activity_area_tajweed'),
        revision: this.t('dashboard.activity_area_revision'),
      }[assignment.activity]
      const stage = {
        sabaq: this.t('dashboard.student_stage_new'),
        sabqi: this.t('dashboard.student_stage_recent'),
        manzil: this.t('dashboard.student_stage_older'),
      }[assignment.hifz_category]
      if (activity && stage) return `${activity} · ${stage}`
      if (activity) return activity
      const label = assignmentDisplayLabel(assignment, this.t.bind(this))
      if (/recitation check/i.test(label)) return this.ldt('teacher.learner_type_recite')
      if (/new memorisation|hifz|nazra|tajweed|sabqi|sabaq|manzil/i.test(label)) return this.t('parent.activity_hifz')
      return label
    },
    teacherName(row) {
      return String(row?.teacher_name || row?.assignment?.teacher_name || '').trim()
    },
    teacherMeta(row) {
      const teacher = this.teacherName(row)
      const group = String(row?.group_name || '').trim()
      if (teacher && group) return `${teacher} · ${group}`
      return teacher
    },
    assignmentStatusRationale(row) {
      if (!row) return ''
      if (this.isSubmitted(row)) {
        if (row?.workflow_state === 'correction_resubmitted') {
          return this.t('teacher.correction_resubmitted')
        }
        return this.t('dashboard.home_waiting_review_hint')
      }
      if (this.needsCorrection(row)) {
        return this.correctionNote(row)
      }
      return ''
    },
    detailAttempts(row) {
      const attempts = Array.isArray(row?.attempts) ? row.attempts : []
      return [...attempts].sort((a, b) => Number(b.n) - Number(a.n))
    },
    attemptKey(attempt) {
      return Number(attempt?.attempt_id) || Number(attempt?.n) || String(attempt?.completed_at || '')
    },
    attemptDate(attempt) {
      return this.displayDate(attempt?.completed_at)
    },
    cardStatusText(row) {
      return this.ldt(taskStateLabelKey(resolveDisplayTaskState(row)))
    },
    cardMetaTail(row) {
      if (this.isTeacherApproved(row)) {
        const date = this.displayDate(row?.teacher_approved_at || row?.completed_at)
        return date ? { text: date, tone: 'success' } : { text: '', tone: 'neutral' }
      }
      if (this.isSubmitted(row)) {
        const date = this.displayDate(row?.student_submitted_at)
        if (row?.workflow_state === 'correction_resubmitted') {
          return { text: this.t('teacher.correction_resubmitted'), tone: 'submitted' }
        }
        return date ? { text: date, tone: 'submitted' } : { text: '', tone: 'neutral' }
      }
      if (this.needsCorrection(row)) {
        const due = this.dueUrgency(row)
        if (due.text && due.tone !== 'neutral') return due
        return { text: '', tone: 'neutral' }
      }
      const due = this.dueUrgency(row)
      const status = this.cardStatusText(row)
      if (due.text && due.text !== status) {
        return { text: due.text, tone: due.tone || 'neutral' }
      }
      const dueDate = this.dueValue(row)
      if (dueDate && resolveDisplayTaskState(row) !== TASK_STATE.DONE) {
        return { text: `${this.t('teacher.due')} ${dueDate}`, tone: 'neutral' }
      }
      return { text: '', tone: 'neutral' }
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
      return this.activeFilter === 'todo' || this.activeFilter === 'progress'
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
      this.closeTaskThread()
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
      return isLearnerTaskApproved(row)
    },
    isSubmitted(row) {
      return isLearnerSubmitted(row)
    },
    needsCorrection(row) {
      return learnerNeedsCorrection(row)
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
      return this.taskTypeLabel(row)
    },
    kindIcon(row) {
      return row?.assignment?.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-book'
    },
    progressLabel(row) {
      return row?.progress ? assignmentProgressLabel(row, this.t.bind(this)) : ''
    },
    requirementHelp(row) {
      return this.t(assignmentCountsScoredChecks(row?.assignment)
        ? 'teacher.learner_how_recite_works'
        : 'teacher.learner_how_practice_works')
    },
    progressPercent(row) {
      const completed = Number(row?.progress?.completed || 0)
      const target = Math.max(1, Number(row?.progress?.target || 1))
      return Math.max(0, Math.min(100, Math.round((completed / target) * 100)))
    },
    unreadTeacherMessages(row) {
      return (row?.messages || []).filter((message) => message.sender === 'teacher' && message.unread).length
    },
    taskFeedbackItems(row) {
      const id = Number(row?.id)
      if (!Number.isFinite(id)) return []
      return this.feedbackInboxMerged.filter((item) => Number(item.recipient_id) === id)
    },
    taskFeedbackUnread(row) {
      return this.taskFeedbackItems(row).filter((item) => item.unread).length
    },
    taskHasFeedback(row) {
      if (this.taskFeedbackItems(row).length > 0) return true
      return Boolean(this.completionLink(row)?.opensFeedback)
    },
    taskFeedbackAriaLabel(row) {
      const unread = this.taskFeedbackUnread(row)
      const base = this.t('teacher.learner_view_feedback')
      return unread ? `${base} · ${this.t('teacher.unread')} (${unread})` : base
    },
    openTaskFeedback(row) {
      const items = this.taskFeedbackItems(row)
      if (items.length) {
        this.expandTaskCard(row.id)
        this.openFeedbackFromPanel(items[0])
        return
      }
      this.openDetails(row)
    },
    chatTooltip(row) {
      const unread = this.taskThreadUnread(row)
      const base = this.t('teacher.learner_message_task_tooltip')
      return unread ? `${base} · ${this.t('teacher.unread')} (${unread})` : base
    },
    chatAriaLabel(row) {
      const unread = this.taskThreadUnread(row)
      const base = `${this.t('teacher.learner_message_task_tooltip')}: ${this.rangeLabel(row)}`
      return unread ? `${base}. ${this.t('teacher.unread')} (${unread})` : base
    },
    messageWhen(message) {
      return this.displayDate(message?.created_at)
    },
    canConfirm(row) {
      return Number(row?.progress?.activity_count || 0) >= Number(row?.progress?.target || 1)
    },
    showSecondaryDetailsAction(row) {
      const primary = this.primaryAction(row)
      if (!primary) return true
      return primary.emit !== 'details'
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
    taskFeedbackPreview(row) {
      const items = this.taskFeedbackItems(row)
      const body = items[0]?.preview || items[0]?.body || row?.completion_evidence?.teacher_note || ''
      const text = String(body || '').trim()
      if (!text) return ''
      return text.length > 120 ? `${text.slice(0, 117)}…` : text
    },
    rowNeedsAttention(row) {
      const due = this.cardMetaTail(row)
      return due.tone === 'danger' || due.tone === 'warning' || this.taskFeedbackUnread(row) > 0 || this.taskThreadUnread(row) > 0
    },
    primaryAction(row) {
      if (this.isTeacherApproved(row)) {
        if (this.taskHasFeedback(row)) {
          return { label: this.t('teacher.learner_view_feedback'), icon: 'bi-chat-quote', emit: 'details' }
        }
        if (!row?.href) return null
        return {
          label: this.t('teacher.practice_again'),
          icon: 'bi-arrow-repeat',
          href: row.href,
        }
      }
      if (this.isSubmitted(row)) {
        return { label: this.t('teacher.view_submission'), icon: 'bi-eye', emit: 'details' }
      }
      if (this.needsCorrection(row)) {
        if (this.canConfirm(row)) {
          return { label: this.t('teacher.resubmit_correction'), icon: 'bi-send-check', emit: 'complete' }
        }
        const label = this.actionLabel(row)
        if (row?.href) {
          return { label, icon: this.actionIcon(row), href: row.href }
        }
        return { label, icon: this.actionIcon(row), emit: 'start' }
      }
      if (this.canConfirm(row) && !this.isSubmitted(row)) {
        return { label: this.t('teacher.mark_complete'), icon: 'bi-check2-circle', emit: 'complete' }
      }
      const label = this.actionLabel(row)
      if (row?.href) {
        return { label, icon: this.actionIcon(row), href: row.href }
      }
      return { label, icon: this.actionIcon(row), emit: 'start' }
    },
    instructionPreview(row) {
      const text = this.instructionText(row)
      if (!text) return ''
      return text.length > 140 ? `${text.slice(0, 137)}…` : text
    },
    assignmentSessionSettings(row) {
      const settings = row?.assignment?.session_settings
      return settings && typeof settings === 'object' ? settings : {}
    },
    listenActionHref(row) {
      const href = row?.listen_href
      return typeof href === 'string' && href.trim() ? href : ''
    },
    recommendedReciterLine(row) {
      const settings = this.assignmentSessionSettings(row)
      const label = settings.reciter_label || settings.reciter
      if (!label) return ''
      if (settings.reciter && !settings.reciter_label && /^ar\./.test(settings.reciter)) {
        return this.t('teacher.assignment_reciter_unavailable')
      }
      return label
    },
    recommendedListeningLine(row) {
      const settings = this.assignmentSessionSettings(row)
      const parts = []
      if (settings.speed) parts.push(this.t('teacher.assignment_listening_speed_line', { speed: settings.speed }))
      if (settings.repetitions) {
        parts.push(this.t('teacher.assignment_listening_reps_line', { n: settings.repetitions }))
      }
      return parts.join(' · ')
    },
    dueLabel(row) {
      const value = this.dueValue(row)
      return value ? `${this.t('teacher.due')}: ${value}` : ''
    },
    dueValue(row) {
      return this.displayDate(row?.assignment?.due_at)
    },
    completedWhen(row) {
      const date = this.displayDate(row?.teacher_approved_at || row?.completed_at)
      return date ? this.t('teacher.learner_assignments_completed_at', { date }) : ''
    },
    metaLine(row) {
      const parts = [this.taskTypeLabel(row), this.progressLabel(row)].filter(Boolean)
      const tail = this.cardMetaTail(row)
      if (tail.text) parts.push(tail.text)
      return parts.join(' · ')
    },
    actionLabel(row) {
      if (this.isTeacherApproved(row)) return this.t('teacher.practice_again')
      if (this.needsCorrection(row)) return this.t('teacher.practise_correction')
      if (row?.progress?.resume_available || row?.status === 'in_progress' || row?.started_at) {
        return this.t('common.continue')
      }
      return this.t('teacher.start')
    },
    actionIcon(row) {
      return this.actionLabel(row) === this.t('common.continue') ? 'bi-arrow-repeat' : 'bi-play-fill'
    },
  },
}
</script>
