<template>
  <section
    class="dash-section dash-section--learner-teacher dash-reveal"
    aria-labelledby="learner-teacher-heading"
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
        <header class="learner-teacher__intro" aria-labelledby="learner-teacher-heading">
          <div class="learner-teacher__intro-top">
            <div class="learner-teacher__intro-identity">
              <span class="learner-teacher__section-avatar" aria-hidden="true">{{ teacherInitials }}</span>
              <div class="learner-teacher__intro-copy">
                <p class="learner-teacher__section-eyebrow">{{ t('teacher.learner_section_from_label') }}</p>
                <h2 id="learner-teacher-heading" class="learner-teacher__section-name">
                  <span v-if="loading" class="learner-teacher__section-skeleton" aria-hidden="true"></span>
                  <template v-else>{{ primaryTeacherName }}</template>
                </h2>
              </div>
            </div>
            <div
              v-if="overview.active_days_this_week || overview.practice_streak_days"
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
            </div>
          </div>
          <div
            v-if="showWeeklyProgress"
            class="learner-teacher__intro-progress"
            role="status"
            :aria-label="weeklyProgressLabel"
          >
            <span class="learner-teacher__progress-label">{{ weeklyProgressLabel }}</span>
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
                :style="{ width: `${weeklyProgressPercent}%`, '--learner-weekly-fill': `${weeklyProgressPercent}%` }"
              ></span>
            </span>
          </div>
        </header>

        <div class="learner-teacher__shell">
        <div class="learner-teacher__workspace">
        <section class="learner-teacher__block">
          <div v-if="!assignments.length" class="learner-teacher__empty">
            <strong>{{ t('teacher.learner_assignments_empty_title') }}</strong>
            <span>{{ t('teacher.learner_assignments_empty') }}</span>
          </div>

          <template v-else>

            <div class="learner-teacher__filters-row">
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
                :aria-selected="activeFilter === filter.id ? 'true' : 'false'"
                :aria-controls="`learner-teacher-panel-${filter.id}`"
                @click="setFilter(filter.id)"
              >
                {{ filter.label }}
                <span class="learner-teacher__filter-count">{{ filter.count }}</span>
              </button>
            </div>

            <button
              type="button"
              class="dash-icon-btn learner-teacher__feedback-tab-btn"
              :aria-label="feedbackTabAriaLabel"
              @click="openFeedbackDrawer"
            >
              <i class="bi bi-chat-left-quote" aria-hidden="true"></i>
              <span
                v-if="feedbackUnreadCount"
                class="learner-teacher__feedback-tab-badge"
              >{{ feedbackUnreadCount }}</span>
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

            <ul v-if="listItems.length" :id="`learner-teacher-panel-${activeFilter}`" class="learner-teacher__list learner-teacher__card-list learner-teacher__card-list--tasks" role="tabpanel">
              <li v-for="(item, index) in listItems" :key="item.id">
                <article
                  :id="`learner-task-card-${item.id}`"
                  class="learner-teacher__card"
                  :class="[cardToneClass(item), { 'is-priority': isPriorityCard(item, index), 'is-collapsed': cardHasExpandableContent(item) && !isCardExpanded(item) }]"
                >
                  <div class="learner-teacher__card-head">
                    <div class="learner-teacher__card-title-row">
                      <span class="learner-teacher__card-icon" :class="`is-${item.assignment?.kind || 'practice'}`" aria-hidden="true">
                        <i :class="kindIcon(item)"></i>
                      </span>
                      <div class="learner-teacher__card-title-copy">
                        <strong>{{ rangeLabel(item) }}</strong>
                        <p class="learner-teacher__card-meta">
                          <span>{{ taskTypeLabel(item) }}</span>
                          <template v-if="isTeacherApproved(item) && completedPerformanceLabel(item)">
                            <span class="learner-teacher__meta-sep" aria-hidden="true"> · </span>
                            <span
                              class="learner-teacher__card-performance"
                              :class="performanceMetaClass(item)"
                            >{{ completedPerformanceLabel(item) }}</span>
                          </template>
                          <template v-else-if="taskAttemptCount(item)">
                            <span class="learner-teacher__meta-sep" aria-hidden="true"> · </span>
                            <span class="learner-teacher__attempt-badge">{{ taskAttemptCountLabel(item) }}</span>
                          </template>
                          <template v-if="cardMetaTail(item).text">
                            <span class="learner-teacher__meta-sep" aria-hidden="true"> · </span>
                            <span class="learner-teacher__card-due" :class="`is-${cardMetaTail(item).tone}`">{{ cardMetaTail(item).text }}</span>
                          </template>
                        </p>
                      </div>
                    </div>
                    <div class="learner-teacher__card-head-tools">
                      <div class="learner-teacher__card-toolbar" role="toolbar" :aria-label="rangeLabel(item)">
                        <component
                          :is="primaryAction(item)?.href ? 'a' : 'button'"
                          v-if="primaryAction(item)"
                          class="learner-teacher__icon-hit learner-teacher__icon-hit--primary is-accent"
                          :class="{ 'is-disabled': savingId === item.id && !primaryAction(item)?.href }"
                          :href="primaryAction(item)?.href || undefined"
                          :disabled="!primaryAction(item)?.href && savingId === item.id"
                          :aria-label="primaryAction(item).label"
                          :title="primaryAction(item).label"
                          @click="!primaryAction(item)?.href && onPrimaryAction(item)"
                        >
                          <i class="bi" :class="primaryAction(item).icon" aria-hidden="true"></i>
                        </component>
                        <button
                          type="button"
                          class="learner-teacher__icon-hit learner-teacher__icon-hit--message"
                          :class="{ 'has-unread': taskThreadUnread(item) > 0 }"
                          :aria-label="chatAriaLabel(item)"
                          :title="chatTooltip(item)"
                          :data-tip="chatTooltip(item)"
                          @click="openTaskThread(item)"
                        >
                          <i class="bi bi-chat-left-text" aria-hidden="true"></i>
                          <span v-if="taskThreadUnread(item)" class="learner-teacher__chat-badge">{{ taskThreadUnread(item) }}</span>
                        </button>
                        <button
                          v-if="cardHasExpandableContent(item)"
                          type="button"
                          class="learner-teacher__icon-hit is-muted learner-teacher__icon-hit--expand"
                          :aria-expanded="isCardExpanded(item) ? 'true' : 'false'"
                          :aria-controls="`learner-task-card-body-${item.id}`"
                          :aria-label="cardExpandAriaLabel(item)"
                          :title="cardExpandAriaLabel(item)"
                          @click="toggleCardExpanded(item.id)"
                        >
                          <i
                            class="bi"
                            :class="isCardExpanded(item) ? 'bi-chevron-up' : 'bi-chevron-down'"
                            aria-hidden="true"
                          ></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    v-show="!cardHasExpandableContent(item) || isCardExpanded(item)"
                    :id="`learner-task-card-body-${item.id}`"
                    class="learner-teacher__card-body"
                  >
                  <p v-if="correctionNote(item)" class="learner-teacher__card-note is-correction">
                    <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>{{ correctionNote(item) }}
                  </p>

                  <details v-if="hasInstruction(item)" class="learner-teacher__instruct">
                    <summary>{{ t('teacher.assignment_instructions_label') }}</summary>
                    <p>{{ instructionText(item) }}</p>
                  </details>

                  <div v-if="isTeacherApproved(item) && completionResult(item)" class="learner-teacher__result">
                    <div class="learner-teacher__result-score">
                      <div class="learner-teacher__result-score-copy">
                        <div
                          v-if="completionAiScoreSummaryRow(item)"
                          class="learner-teacher__ai-score-badge"
                          :class="`is-${completionAiScoreSummaryRow(item).band}`"
                          role="status"
                        >
                          <span class="learner-teacher__ai-score-badge-value">{{ completionAiScoreSummaryRow(item).percent }}%</span>
                          <span class="learner-teacher__ai-score-badge-label">{{ completionAiScoreSummaryRow(item).label }}</span>
                        </div>
                        <p v-else-if="completionAiScoreRow(item)" class="learner-teacher__result-headline">
                          <span class="learner-teacher__result-check-mark" aria-hidden="true">
                            <i class="bi bi-patch-check"></i>
                          </span>
                          <span class="learner-teacher__result-headline-body">
                            <span class="learner-teacher__result-headline-value">{{ completionAiScoreRow(item).percent }}%</span>
                            <span class="learner-teacher__result-headline-context">{{ completionAiScoreContext(item) }}</span>
                          </span>
                        </p>
                        <p v-else class="learner-teacher__result-headline">{{ completionHeadline(item) }}</p>
                        <p v-if="completionMistakePerfect(item)" class="learner-teacher__mistake-none-inline">
                          <i class="bi bi-check2-circle" aria-hidden="true"></i>
                          {{ t('teacher.learner_mistake_none') }}
                        </p>
                      </div>
                      <div
                        class="learner-teacher__result-actions learner-teacher__result-actions--icons"
                        role="toolbar"
                        :aria-label="t('teacher.learner_view_results')"
                      >
                        <button
                          v-if="completionLink(item)?.opensMistakeDetails"
                          type="button"
                          class="learner-teacher__icon-hit is-muted"
                          :class="{ 'is-active': mistakeDetailsExpanded(item) }"
                          :aria-expanded="mistakeDetailsExpanded(item) ? 'true' : 'false'"
                          :aria-label="t('teacher.learner_view_results')"
                          :title="t('teacher.learner_view_results')"
                          @click="toggleMistakeDetails(item)"
                        >
                          <i class="bi bi-list-check" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          class="learner-teacher__icon-hit is-muted"
                          :aria-label="t('teacher.learner_playback_listen')"
                          :title="t('teacher.learner_playback_listen')"
                          @click="openAttemptPlayback(item)"
                        >
                          <i class="bi bi-headphones" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                    <LearnerCompletionMistakePanel
                      v-if="completionLink(item)?.opensMistakeDetails && mistakeDetailsExpanded(item)"
                      class="learner-teacher__mistake-expand"
                      hide-perfect-banner
                      :result="completionResult(item)"
                      :mistakes="completionMistakes(item)"
                      :recording-url="completionRecordingUrl(item)"
                      :surah="item.assignment?.surah_number"
                    />
                  </div>

                  <div v-if="showCardProgress(item)" class="learner-teacher__card-progress" :aria-label="progressLabel(item)">
                    <span>{{ progressLabel(item) }}</span>
                    <span v-if="showProgressBar(item)" class="learner-teacher__progress" aria-hidden="true"><span :style="{ width: `${progressPercent(item)}%` }"></span></span>
                  </div>

                  <div v-if="retryContextVisible(item)" class="learner-teacher__retry-context">
                    <p class="learner-teacher__retry-score">{{ retryScoreLine(item) }}</p>
                    <button
                      v-if="retryTeacherNote(item) && !isRetryNoteExpanded(item)"
                      type="button"
                      class="learner-teacher__retry-note-toggle"
                      @click="toggleRetryNote(item)"
                    >
                      <span class="learner-teacher__retry-note-clamp">{{ retryTeacherNote(item) }}</span>
                    </button>
                    <p
                      v-else-if="retryTeacherNote(item)"
                      class="learner-teacher__retry-note-full"
                    >{{ retryTeacherNote(item) }}</p>
                  </div>
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
          </template>
        </section>

        <div class="learner-teacher__sidebar">
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
          :todo-ids="todoAssignmentIds"
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

    <Teleport to="body">
    <div
      v-if="feedbackDrawerOpen"
      class="dash-drawer-root user-dashboard"
      @keydown="onFeedbackDrawerKeydown"
    >
      <button
        type="button"
        class="dash-drawer__backdrop dash-modal__backdrop"
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
        <div class="dash-drawer__body">
          <div class="dash-drawer__content">
            <LearnerTeacherLearning
              variant="drawer"
              :learning="learningForPanel"
              :pending="!learning"
              @open-feedback="openFeedbackFromDrawer"
            />
          </div>
        </div>
      </aside>
    </div>
    </Teleport>

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

    <Teleport to="body">
    <div v-if="selectedDirectThread" class="user-dashboard dash-student-dialog-root">
    <button
      type="button"
      class="dash-drawer__backdrop"
      :aria-label="t('common.close')"
      @click="closeDirectThread"
    ></button>
    <section
      class="dash-student-dialog dash-student-dialog--thread"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`direct-thread-title-${selectedDirectThread.teacher_id}`"
      tabindex="-1"
    >
      <header class="dash-drawer__head">
        <div class="dash-drawer__head-main">
          <span class="dash-drawer__head-icon" aria-hidden="true"><i class="bi bi-chat-left-text"></i></span>
          <div class="dash-drawer__head-copy">
            <h2 :id="`direct-thread-title-${selectedDirectThread.teacher_id}`" class="dash-drawer__title">{{ selectedDirectThread.teacher_name }}</h2>
            <p class="dash-drawer__subtitle">{{ t('teacher.messages') }}</p>
          </div>
        </div>
        <button type="button" class="dash-icon-btn dash-drawer__close" :aria-label="t('common.close')" @click="closeDirectThread">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="dash-student-dialog__body">
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
            :on-send="sendDirectMessage"
          />
      </div>
    </section>
    </div>
    </Teleport>

    <Teleport to="body">
    <div v-if="selectedSubmission" class="user-dashboard dash-student-dialog-root">
      <button
        type="button"
        class="dash-drawer__backdrop"
        :aria-label="t('common.close')"
        @click="closeSubmission"
      ></button>
      <section
        class="dash-student-dialog dash-student-dialog--sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-submission-title"
        tabindex="-1"
      >
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true"><i class="bi bi-clock-history"></i></span>
            <div class="dash-drawer__head-copy">
              <h2 id="learner-submission-title" class="dash-drawer__title">{{ selectedSubmission.title }}</h2>
              <p class="dash-drawer__subtitle">{{ submissionStateLabel(selectedSubmission) }}</p>
            </div>
          </div>
          <button type="button" class="dash-icon-btn dash-drawer__close" :aria-label="t('common.close')" @click="closeSubmission">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>
        <div class="dash-student-dialog__body learner-teacher__submission-detail">
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
    </Teleport>

    <Teleport to="body">
    <div
      v-if="mistakeDrawerRow"
      class="dash-drawer-root user-dashboard"
      :class="{ 'is-learner-results': true, 'is-mobile-sheet': isMobileLayout }"
      @keydown="onMistakeDrawerKeydown"
    >
      <button
        type="button"
        class="dash-drawer__backdrop"
        :aria-label="t('dashboard.drawer_close')"
        @click="closeMistakeDrawer"
      ></button>
      <aside
        ref="mistakeDrawer"
        class="dash-drawer dash-drawer--learner-results"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="mistakeDrawerTitleId"
      >
        <div class="dash-drawer__handle" aria-hidden="true"></div>
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true">
              <i class="bi bi-list-check"></i>
            </span>
            <div class="dash-drawer__head-copy">
              <h2 :id="mistakeDrawerTitleId" class="dash-drawer__title">{{ t('teacher.learner_view_results') }}</h2>
              <p class="dash-drawer__subtitle">{{ rangeLabel(mistakeDrawerRow) }}</p>
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
        <div class="dash-drawer__body dash-drawer__body--learner-results">
          <div class="dash-drawer__content dash-drawer__content--learner-results">
            <LearnerCompletionMistakePanel
              :result="completionResult(mistakeDrawerRow)"
              :mistakes="completionMistakes(mistakeDrawerRow)"
              :recording-url="completionRecordingUrl(mistakeDrawerRow)"
              :surah="mistakeDrawerRow?.assignment?.surah_number"
            />
          </div>
        </div>
      </aside>
    </div>
    </Teleport>

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
import {
  cardHasExpandableContent as learnerCardHasExpandableContent,
  resolveCardExpanded,
} from '../../scripts/teacher/learnerCardExpansion.js'
import TeacherTaskConversation from './TeacherTaskConversation.vue'
import LearnerTeacherLearning from './LearnerTeacherLearning.vue'
import LearnerTeacherUpcoming from './LearnerTeacherUpcoming.vue'
import LearnerAttemptPlaybackModal from '@/components/shared/LearnerAttemptPlaybackModal.vue'
import LearnerCompletionMistakePanel from '@/components/shared/LearnerCompletionMistakePanel.vue'
import TeacherReciteEvidenceModal from './TeacherReciteEvidenceModal.vue'
import LearnerTaskThreadPanel from './LearnerTaskThreadPanel.vue'
import {
  isPerfectCompletionResult,
  resolveLearnerCompletionAttempt,
} from '../../scripts/teacher/learnerCompletionMistakes.js'

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'overdue', 'awaiting_confirmation'])

export default {
  name: 'LearnerTeacherSection',
  components: {
    TeacherTaskConversation,
    LearnerTeacherLearning,
    LearnerTeacherUpcoming,
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
  emits: ['start', 'complete', 'view-completed', 'dismiss-completion', 'support-thread-update'],
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
      threadTask: null,
      selectedDirectThread: null,
      selectedSubmission: null,
      recitationReviewRow: null,
      expandedMistakeDetailsId: null,
      mistakeDrawerRow: null,
      mistakeDrawerTitleId: `learner-mistake-drawer-${Math.random().toString(36).slice(2, 9)}`,
      isMobileLayout: false,
      mobileMedia: null,
      playbackRow: null,
      focusConversationComposer: false,
      previouslyFocused: null,
      feedbackDrawerOpen: false,
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
    learning() {
      return this.support?.learning || null
    },
    learnerLocale() {
      return this.$i18n?.global?.locale?.value
        || (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : null)
        || 'en'
    },
    showWeeklyProgress() {
      return !this.loading && this.assignments.length > 0
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
      return this.ldt('teacher.learner_weekly_progress', {
        done: this.weeklyProgressDone,
        total: this.weeklyProgressTotal,
      })
    },
    weeklyProgressPercent() {
      return this.weeklyProgressSnapshot.percent
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
        this.todoAssignmentIds,
      )
    },
    sectionHeading() {
      const title = this.ldt('teacher.learner_section_title')
      const names = [...new Set(this.assignments.map((row) => row?.teacher_name).filter(Boolean))]
      if (names.length === 1) return `${title} · ${names[0]}`
      if (names.length > 1) {
        return `${title} · ${this.ldtp('teacher.learner_teachers_context', names.length, { n: names.length })}`
      }
      return title
    },
    primaryTeacherName() {
      const names = [...new Set(this.assignments.map((row) => row?.teacher_name).filter(Boolean))]
      if (names.length === 1) return names[0]
      if (names.length > 1) {
        return this.ldtp('teacher.learner_teachers_context', names.length, { n: names.length })
      }
      return this.t('teacher.learner_teacher_fallback')
    },
    teacherInitials() {
      const name = this.primaryTeacherName
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
      return this.activeFilter === 'all'
        && !this.showOlderCompleted
        && this.allTabHiddenCompletedCount > 0
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
      return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status) || this.needsCorrection(row)).length
    },
    completedCount() {
      return this.assignments.filter((row) => this.isTeacherApproved(row)).length
    },
    primaryFilters() {
      const filters = [
        {
          id: 'all',
          label: this.ldt('teacher.learner_assignments_filter_all'),
          count: this.assignments.length,
        },
        {
          id: 'todo',
          label: this.ldt('teacher.learner_assignments_filter_todo'),
          count: this.pendingCount,
        },
        {
          id: 'done',
          label: this.ldt('teacher.learner_assignments_filter_done'),
          count: this.completedCount,
        },
      ]
      return filters
    },
    filteredByStatus() {
      if (this.activeFilter === 'done') {
        return this.assignments.filter((row) => this.isTeacherApproved(row))
      }
      if (this.activeFilter === 'all') {
        const { pending, completed } = this.allTabGroups
        if (this.showOlderCompleted) {
          return [...pending, ...completed]
        }
        return buildAllTabList(this.allTabGroups, ALL_TAB_COMPLETED_PREVIEW).items
      }
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
        if (!this.threadTask?.id) return
        const row = this.assignments.find((item) => Number(item.id) === Number(this.threadTask.id))
        if (row) this.threadTask = row
      },
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
    if (this.mobileMedia?.removeEventListener) {
      this.mobileMedia.removeEventListener('change', this.syncMobileLayout)
    }
    this.setMistakeDrawerScrollLock(false)
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
    syncDefaultFilter() {
      if (this.defaultFilterSynced || this.loading) return
      if (!this.assignments.length) return
      this.defaultFilterSynced = true
      this.activeFilter = this.pendingCount > 0 ? 'todo' : 'all'
    },
    syncModalOpen() {
      if (typeof document === 'undefined') return
      document.body.classList.toggle(
        'modal-open',
        Boolean(this.threadTask) || Boolean(this.selectedDirectThread) || Boolean(this.selectedSubmission),
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
    async sendTaskMessageOptimistic(task, body, recording = null) {
      const message = await this.onSendNote(task, body, recording)
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
        try {
          const payload = await learningApi.getLearnerTeacherMessages(thread.teacher_id)
          this.directSynced = { ...this.directSynced, [thread.teacher_id]: payload?.messages || [] }
        } catch (_) { /* preserve existing messages during transient polling failures */ }
      }))
    },
    directMessageWhen(message) {
      return this.displayDate(message?.created_at)
    },
    setFilter(id) {
      this.activeFilter = id
      this.visibleLimit = this.listLimit
      this.showOlderCompleted = false
    },
    scrollToAssignment(row) {
      if (!row) return
      this.setFilter('todo')
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
    taskAttemptCountLabel(row) {
      const n = this.taskAttemptCount(row)
      if (!n) return ''
      return this.ldtp('teacher.learner_task_attempts_count', n)
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
    completionLink(row) {
      return completionResultLink(this.completionResult(row), this.t.bind(this))
    },
    completionAttemptBundle(row) {
      return resolveLearnerCompletionAttempt(row)
    },
    completionMistakes(row) {
      return this.completionAttemptBundle(row).mistakes
    },
    completionRecordingUrl(row) {
      return this.completionAttemptBundle(row).recordingUrl || ''
    },
    completionMistakePerfect(row) {
      return isPerfectCompletionResult(this.completionResult(row))
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
      this.setMistakeDrawerScrollLock(true)
      this.$nextTick(() => this.$refs.mistakeDrawerClose?.focus())
    },
    closeMistakeDrawer() {
      this.mistakeDrawerRow = null
      this.setMistakeDrawerScrollLock(false)
    },
    setMistakeDrawerScrollLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', open)
      document.body.classList.toggle('dash-drawer-open', open)
    },
    onMistakeDrawerKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.closeMistakeDrawer()
      }
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
        const date = this.displayDate(row?.teacher_approved_at || row?.completed_at)
        return date ? { text: date, tone: 'success' } : { text: '', tone: 'neutral' }
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
        return {
          label: this.t('teacher.practice_again'),
          icon: 'bi-arrow-repeat',
          href: row.href,
        }
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
