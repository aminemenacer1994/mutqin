<template>
  <main id="mainContent" class="user-dashboard learner-workspace teacher-dashboard" data-platform-shell="student" :style="{ '--learner-header-height': `${learnerHeaderHeight}px` }" tabindex="-1">
    <div class="container user-dashboard__shell teacher-dashboard__shell">
      <div v-if="loading && !data" class="teacher-skeletons" role="status" aria-live="polite" :aria-label="t('dashboard.loading')">
        <div v-for="n in 4" :key="n" class="teacher-skeleton"></div>
      </div>

      <NetworkFallback
        v-else-if="error && !data"
        class="user-dashboard__error"
        page
        :kind="failureKind"
        :auto-retry-on-reconnect="false"
        home-href="/"
        @retry="reload(true)"
      />

      <NetworkFallback
        v-else-if="!data"
        class="user-dashboard__error"
        page
        kind="failure"
        :title="t('common.status.emptyTitle')"
        :description="t('common.status.emptyDesc')"
        home-href="/"
        @retry="reload(true)"
      />

      <template v-else>
        <div class="teacher-dashboard__layout">
          <TeacherNav
            variant="desktop"
            :items="studentNavItems"
            :badges="navBadges"
            :active-view="studentPane"
            nav-label-key="dashboard.jump_label"
            settings-label-key="dashboard.jump_settings"
            style="--dash-delay: 40ms"
            @select="openStudentNav"
          />
        <div class="teacher-dashboard__main dash-reveal" style="--dash-delay: 80ms">

        <div v-show="studentPane === 'home'" class="dash-pane dash-home-pane teacher-view-stage">
        <header id="dash-home" class="teacher-hero learner-home__header" tabindex="-1">
          <div class="teacher-hero__row">
          <div class="teacher-hero__copy">
            <h1 class="teacher-hero__title">{{ greetingText }}</h1>
            <p v-if="homeWelcomeContext" class="teacher-meta">{{ homeWelcomeContext }}</p>
          </div>
          </div>
        </header>

        <p v-if="assignmentCompletionMessage" class="alert alert-success" role="status" aria-live="polite"><i class="bi bi-check2-circle" aria-hidden="true"></i>{{ assignmentCompletionMessage }}</p>

        <ConnectPrompt
          v-if="showLearnerConnectPrompt"
          storage-key="mutqin_connect_prompt_learner"
          :title="t('ui.connections_connect_title')"
          :body="t('ui.connections_prompt_learner')"
          :status="learnerConnectionStatus"
          :href="learnerConnectSettingsHref"
          :action-label="t('ui.connections_settings_manage')"
        />

        <div class="learner-home__stack">
          <section
            v-if="showHomeNextAction"
            class="learner-home__next-action"
            data-testid="dashboard-home-next-action"
            data-sandbox-tour="student-assignments"
            :aria-labelledby="homeNextActionTitleId"
          >
            <p :id="homeNextActionTitleId" class="learner-home__next-action-eyebrow">{{ t('dashboard.home_next_action') }}</p>
            <div
              class="learner-home__next-action-body"
              :class="{ 'learner-home__next-action-body--feedback': homeNextAction.kind === 'feedback' }"
            >
              <div class="learner-home__task-head">
                <span class="learner-home__task-icon" aria-hidden="true">
                  <i
                    class="bi"
                    :class="homeNextAction.kind === 'feedback' ? 'bi-chat-left-text' : (homeNextAction.row.assignment?.kind === 'ai_recite' ? 'bi-mic' : 'bi-book')"
                  ></i>
                </span>
                <div class="learner-home__task-copy">
                  <h2>
                    {{
                      homeNextAction.kind === 'feedback'
                        ? homeAttentionFeedbackTitle(homeNextAction.row)
                        : assignmentRangeLabel(homeNextAction.row)
                    }}
                  </h2>
                  <p v-if="homeNextAction.kind === 'assignment'">{{ assignmentNextActionMeta(homeNextAction.row) }}</p>
                  <p v-else class="learner-home__feedback-preview">{{ homeAttentionFeedbackPreview(homeNextAction.row) }}</p>
                </div>
                <span
                  class="teacher-badge learner-home__status"
                  :class="homeNextAction.kind === 'feedback' ? 'is-info' : `is-${assignmentTone(homeNextAction.row)}`"
                >
                  {{ homeNextAction.kind === 'feedback' ? t('teacher.unread') : assignmentStatusLabel(homeNextAction.row) }}
                </span>
              </div>
              <p
                v-if="homeNextAction.kind === 'assignment' && assignmentDue(homeNextAction.row).text"
                class="learner-home__due"
                :class="`is-${assignmentDue(homeNextAction.row).tone}`"
              >
                <i class="bi bi-calendar3" aria-hidden="true"></i>{{ assignmentDue(homeNextAction.row).text }}
              </p>
              <time
                v-else-if="homeNextAction.kind === 'feedback' && homeNextAction.row.created_at"
                class="teacher-meta"
                :datetime="homeNextAction.row.created_at"
              >{{ formatLearnerFeedbackWhen(homeNextAction.row.created_at) }}</time>
              <button
                v-if="homeNextAction.kind === 'assignment'"
                type="button"
                class="btn dash-btn dash-btn--primary learner-home__next-action-cta btn-primary"
                :disabled="Boolean(assignmentSavingId)"
                @click="taskReadyToSubmit(homeNextAction.row) ? promptSupportAssignmentCompletion(homeNextAction.row) : startSupportAssignment(homeNextAction.row)"
              >
                <i class="bi" :class="assignmentActionIcon(homeNextAction.row)" aria-hidden="true"></i>
                {{
                  assignmentSavingId === homeNextAction.row.id
                    ? t('teacher.loading')
                    : assignmentActionLabel(homeNextAction.row)
                }}
              </button>
              <button
                v-else
                type="button"
                class="btn dash-btn dash-btn--primary learner-home__next-action-cta btn-primary"
                @click="openHomeFeedback"
              >
                {{ t('dashboard.home_open_feedback') }}
              </button>
            </div>
          </section>

          <StudentContinueCard
            v-if="showHomeContinue && primaryContinueAction"
            :action="primaryContinueAction"
            :data-kind="primaryContinueAction.kind"
            data-testid="dashboard-primary-continue"
            data-sandbox-tour="student-practice"
          />

          <section
            v-if="showHomeAttentionSection"
            class="teacher-pane learner-home__today"
            aria-labelledby="learner-home-today"
          >
            <header class="teacher-pane__head learner-home__section-head">
              <div class="teacher-pane__titles">
                <h2 id="learner-home-today" class="teacher-pane__title">{{ t('dashboard.home_attention') }}</h2>
              </div>
              <button type="button" class="btn btn-link dash-text-link" @click="openDashPane({ pane: 'learning' })">{{ t('dashboard.home_all_tasks') }}</button>
            </header>
            <div class="teacher-pane__body">
              <div v-if="supportLoading && !support" class="learner-home__skeleton" role="status" :aria-label="t('teacher.loading')"><span></span><span></span></div>
              <div v-else-if="supportError" class="learner-home__state is-error" role="alert">
                <p>{{ supportError }}</p>
                <button type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" :disabled="supportLoading" @click="loadLearnerSupport">{{ t('common.retry') }}</button>
              </div>
              <template v-else>
                <div
                  v-for="item in homeMoreAttentionRows"
                  :key="item.key"
                  class="learner-home__priority"
                  :class="{ 'learner-home__priority--feedback': item.kind === 'feedback' }"
                  :data-assignment-id="item.kind === 'assignment' ? item.row.id : undefined"
                >
                  <div class="learner-home__task-head">
                    <span class="learner-home__task-icon" aria-hidden="true">
                      <i class="bi" :class="item.kind === 'feedback' ? 'bi-chat-left-text' : (item.row.assignment?.kind === 'ai_recite' ? 'bi-mic' : 'bi-book')"></i>
                    </span>
                    <div class="learner-home__task-copy">
                      <h3>{{ item.kind === 'feedback' ? homeAttentionFeedbackTitle(item.row) : assignmentRangeLabel(item.row) }}</h3>
                      <p v-if="item.kind === 'assignment'">{{ assignmentNextActionMeta(item.row) }}</p>
                      <p v-else class="learner-home__feedback-preview">{{ homeAttentionFeedbackPreview(item.row) }}</p>
                    </div>
                    <span class="teacher-badge learner-home__status" :class="item.kind === 'feedback' ? 'is-info' : `is-${assignmentTone(item.row)}`">
                      {{ item.kind === 'feedback' ? t('teacher.unread') : assignmentStatusLabel(item.row) }}
                    </span>
                  </div>
                  <div class="learner-home__task-footer">
                    <span
                      v-if="item.kind === 'assignment' && assignmentDue(item.row).text"
                      class="learner-home__due"
                      :class="`is-${assignmentDue(item.row).tone}`"
                    ><i class="bi bi-calendar3" aria-hidden="true"></i>{{ assignmentDue(item.row).text }}</span>
                    <time v-else-if="item.kind === 'feedback' && item.row.created_at" :datetime="item.row.created_at">{{ formatLearnerFeedbackWhen(item.row.created_at) }}</time>
                    <button
                      v-if="item.kind === 'assignment'"
                      type="button"
                      class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                      :disabled="Boolean(assignmentSavingId)"
                      @click="taskReadyToSubmit(item.row) ? promptSupportAssignmentCompletion(item.row) : startSupportAssignment(item.row)"
                    >
                      <i class="bi" :class="assignmentActionIcon(item.row)" aria-hidden="true"></i>
                      {{ assignmentSavingId === item.row.id ? t('teacher.loading') : assignmentActionLabel(item.row) }}
                    </button>
                    <button v-else type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="openHomeFeedback">
                      {{ t('dashboard.home_open_feedback') }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </section>

          <p
            v-else-if="showHomeNoAssignmentsNote"
            class="teacher-meta learner-home__no-assignments"
          >{{ t('dashboard.home_no_assignments_yet') }}</p>

          <section v-if="homeUpcomingTasks.length" class="teacher-pane learner-home__revisions" aria-labelledby="home-upcoming-title">
            <header class="teacher-pane__head learner-home__section-head">
              <h2 id="home-upcoming-title" class="teacher-pane__title">{{ t('dashboard.home_upcoming') }}</h2>
              <button type="button" class="btn btn-link dash-text-link" @click="openDashPane({ pane: 'learning' })">{{ t('dashboard.home_all_tasks') }}</button>
            </header>
            <div class="teacher-pane__body">
              <button
                v-for="task in homeUpcomingTasks"
                :key="`upcoming-${task.id}`"
                type="button"
                class="learner-home__revision-row learner-home__revision-row--link"
                :data-assignment-id="task.id"
                :disabled="assignmentSavingId === task.id"
                @click="startSupportAssignment(task)"
              >
                <span class="learner-home__revision-main">
                  <strong>{{ assignmentRangeLabel(task) }}</strong>
                  <span class="learner-home__revision-meta">
                    <span v-if="assignmentDue(task).text" class="learner-home__due" :class="`is-${assignmentDue(task).tone}`">{{ assignmentDue(task).text }}</span>
                    <span class="learner-home__revision-type">{{ assignmentNextActionMeta(task) }}</span>
                  </span>
                </span>
                <span class="teacher-badge learner-home__status" :class="`is-${assignmentTone(task)}`">{{ assignmentStatusLabel(task) }}</span>
                <i class="bi bi-chevron-right learner-home__revision-chevron" aria-hidden="true"></i>
              </button>
            </div>
          </section>

          <section v-if="showHomeStats" class="teacher-stack learner-home__progress" aria-labelledby="home-progress-title">
            <header class="teacher-page-header">
              <div class="teacher-pane__titles">
                <h2 id="home-progress-title" class="teacher-pane__title">{{ t('dashboard.learning_title') }}</h2>
                <p class="teacher-meta learner-home__progress-period">{{ t('dashboard.learning_period', { days: chartDays }) }}</p>
              </div>
              <button type="button" class="btn btn-link dash-text-link" @click="openStudentNav('progress')">{{ t('dashboard.home_view_progress') }}</button>
            </header>
              <TeacherKpiGrid
                class="learner-home__progress-metrics"
                :cards="homeStatCards"
                :aria-label="t('dashboard.learning_title')"
                selectable
                @select="openStudentNav('progress')"
              />
          </section>

          <LearnerStudentNotifications
            :compact="!homeNotificationsExpanded"
            :limit="3"
            @expand="homeNotificationsExpanded = true"
            @open="openStudentNotice"
            @unread-change="studentNoticeUnread = $event"
          />

          <section class="teacher-stack learner-home__tools-pane" aria-labelledby="home-tools-title">
            <header class="teacher-page-header">
              <div class="teacher-pane__titles">
                <h2 id="home-tools-title" class="teacher-pane__title">{{ t('dashboard.home_tools') }}</h2>
              </div>
              <button type="button" class="btn btn-link dash-text-link" @click="openStudentNav('practice')">{{ t('dashboard.home_all_practice') }}</button>
            </header>
            <div class="learner-home__tools">
              <template v-for="tool in homePracticeTools" :key="tool.key">
                <a
                  v-if="!tool.locked"
                  class="teacher-pane learner-home__tool"
                  :href="tool.href"
                >
                  <i class="bi" :class="tool.icon" aria-hidden="true"></i>
                  <strong>{{ tool.label }}</strong>
                  <span>{{ tool.hint }}</span>
                </a>
                <div v-else class="teacher-pane learner-home__tool is-locked" :aria-label="tool.label">
                  <i class="bi" :class="tool.icon" aria-hidden="true"></i>
                  <strong>{{ tool.label }}</strong>
                  <span>{{ tool.hint }}</span>
                  <span class="learner-home__tool-lock">{{ t('dashboard.home_tool_locked') }}</span>
                  <a class="dash-text-link learner-home__tool-upsell" :href="tool.upsellHref">{{ t('dashboard.home_tool_upgrade') }}</a>
                </div>
              </template>
            </div>
          </section>

          <section v-if="homeAchievementPreview" class="teacher-pane learner-home__achievement" aria-labelledby="home-achievement-title">
            <header class="teacher-pane__head learner-home__section-head">
              <div class="teacher-pane__titles">
                <h2 id="home-achievement-title" class="teacher-pane__title">{{ t('dashboard.home_next_achievement') }}</h2>
                <p class="teacher-pane__hint">{{ homeAchievementPreview }}</p>
              </div>
              <button type="button" class="btn btn-link dash-text-link" @click="openStudentNav('progress')">{{ t('dashboard.home_view_progress') }}</button>
            </header>
          </section>

        </div>
        </div>

        <div v-show="studentPane === 'learning'" id="dash-welcome-heading" class="dash-pane teacher-view-stage" tabindex="-1">
        <TeacherPageHeader
          :title="t('dashboard.jump_learning')"
          :subtitle="t('dashboard.nav_learning_hint')"
        />
        <LearnerTeacherSection
          ref="learnerTeacherSection"
          v-if="showLearnerTeacherSection"
          :support="support"
          :loading="supportLoading && !support"
          :aria-busy="supportLoading ? 'true' : 'false'"
          :error="supportError"
          :saving-id="assignmentSavingId"
          :completion-message="assignmentCompletionMessage"
          :failed-item="assignmentFailedItem"
          :student-first-name="learnerFirstName"
          :on-send-note="sendSupportNote"
          :on-send-direct-message="sendDirectTeacherMessage"
          @start="startSupportAssignment"
          @complete="promptSupportAssignmentCompletion"
          @self-assess="openPostSubmissionAssessment"
          @view-completed="showCompletedAssignments"
          @dismiss-completion="dismissAssignmentCompletion"
          @support-thread-update="patchLearnerSupportThread"
          @open-progress="openStudentNav('progress')"
        >
          <template #learning-plan>
            <LearnerMyLearningPlan
              v-for="plan in learnerPlans"
              :key="plan?.id || 'current-plan'"
              :plan="plan"
              :assignments="support?.assignments || []"
              @continue="startSupportAssignment"
            />
          </template>
        </LearnerTeacherSection>
        <section v-if="showLearnerTeacherSection" class="teacher-pane learner-learning-connections" aria-labelledby="learner-learning-connections-heading">
          <div class="teacher-pane__head learner-home__section-head">
            <div class="teacher-pane__titles">
              <h2 id="learner-learning-connections-heading" class="teacher-pane__title">{{ t('teacher.learner_teachers_classes_title') }}</h2>
              <p class="teacher-meta">{{ learnerConnectionsHubSummary || learnerConnectionStatus }}</p>
            </div>
            <button type="button" class="btn btn-outline-secondary" @click="openStudentConnectionsSettings">{{ t('ui.connections_settings_manage') }}</button>
          </div>
        </section>
        <TeacherEmpty v-else inline class="dash-pane__empty" :message="t('dashboard.jump_learning_empty')" />
        </div>

        <div v-show="studentPane === 'practice'" id="dash-practice" class="dash-pane teacher-view-stage" tabindex="-1">
          <TeacherPageHeader
            :title="t('dashboard.jump_practice')"
            :subtitle="t('dashboard.nav_practice_hint')"
          />
          <StudentContinueCard
            v-if="showHomeContinue && primaryContinueAction"
            :action="primaryContinueAction"
            data-testid="dashboard-primary-continue"
          />
          <section v-for="group in studentPracticeGroups" :key="group.id" class="teacher-stack" :aria-labelledby="`practice-${group.id}-title`">
            <header class="teacher-page-header">
              <h2 :id="`practice-${group.id}-title`" class="teacher-pane__title">{{ group.label }}</h2>
            </header>
            <div class="learner-home__tools">
              <template v-for="tool in group.tools" :key="tool.key">
                <a
                  v-if="!tool.locked"
                  class="teacher-pane learner-home__tool"
                  :href="tool.href"
                >
                  <i class="bi" :class="tool.icon" aria-hidden="true"></i>
                  <strong>{{ tool.label }}</strong>
                  <span>{{ tool.hint }}</span>
                </a>
                <div v-else class="teacher-pane learner-home__tool is-locked" :aria-label="tool.label">
                  <i class="bi" :class="tool.icon" aria-hidden="true"></i>
                  <strong>{{ tool.label }}</strong>
                  <span>{{ tool.hint }}</span>
                  <span class="learner-home__tool-lock">{{ t('dashboard.home_tool_locked') }}</span>
                  <a class="dash-text-link learner-home__tool-upsell" :href="tool.upsellHref">{{ t('dashboard.home_tool_upgrade') }}</a>
                </div>
              </template>
            </div>
          </section>
        </div>

        <div v-show="studentPane === 'progress'" class="dash-pane teacher-view-stage">
        <TeacherPageHeader
          :title="t('dashboard.jump_progress')"
          :subtitle="t('dashboard.nav_progress_hint')"
        />
        <header class="student-progress student-progress__chrome" data-testid="student-progress-hub">
          <nav class="nav nav-tabs teacher-tabs teacher-tabs--scroll student-progress__tabs" role="tablist" :aria-label="t('dashboard.progress_sections_label')">
            <button
              v-for="section in progressSections"
              :key="section.id"
              type="button"
              role="tab"
              class="nav-link teacher-tabs__tab"
              :class="{ 'is-active': progressActiveSection === section.id }"
              :id="`tab-${section.id}`"
              :aria-controls="section.id"
              :aria-selected="progressActiveSection === section.id"
              :tabindex="progressActiveSection === section.id ? 0 : -1"
              @click="selectProgressSection(section.id)"
              @keydown="onProgressTabKeydown($event, section.id)"
            >{{ section.label }}</button>
          </nav>
          <div class="student-progress__toolbar">
            <p class="student-progress__filter-hint">{{ t('dashboard.progress_window_filter_hint') }}</p>
            <div class="dash-range-toggle student-progress__window" role="group" :aria-label="t('dashboard.progress_window_label')">
              <button
                type="button"
                class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                :class="{ 'is-active': progressWindow === 'week' }"
                :aria-pressed="progressWindow === 'week' ? 'true' : 'false'"
                @click="setProgressWindow('week')"
              >{{ t('dashboard.progress_week') }}</button>
              <button
                type="button"
                class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                :class="{ 'is-active': progressWindow === 'month' }"
                :aria-pressed="progressWindow === 'month' ? 'true' : 'false'"
                @click="setProgressWindow('month')"
              >{{ t('dashboard.progress_month') }}</button>
            </div>
          </div>
        </header>
        <section
          v-show="progressActiveSection === 'dash-progress'"
          id="dash-progress"
          tabindex="-1"
          class="dash-section dash-section--flat dash-learning"
          aria-labelledby="dash-learning-heading"
        >
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__title">
              <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
                <i class="bi bi-journal-bookmark" aria-hidden="true"></i>
              </span>
              <span class="dash-section__title-copy">
                <h2 id="dash-learning-heading">{{ t('dashboard.learning_title') }}</h2>
                <p class="dash-section__hint">{{ t('dashboard.progress_overview_hint') }} {{ progressOverviewGroups.periodLabel }}.</p>
              </span>
            </div>
          </div>
          <div id="dash-learning-body" class="dash-section__body dash-learning__body student-progress__overview">
            <p class="parent-lead student-progress__lead">{{ progressOverviewLead }}</p>
            <TeacherKpiGrid :cards="progressOverviewStatCards" selectable @select="key => onProgressOverviewMetric(progressOverviewStatCards.find(card => card.key === key))" />
            <p v-if="progressOverviewNextStep" class="student-progress__next">
              <a
                v-if="progressOverviewNextStep.href"
                class="btn dash-btn dash-btn--primary dash-btn--sm btn-primary btn-sm"
                :href="progressOverviewNextStep.href"
              >{{ progressOverviewNextStep.label }}</a>
              <button
                v-else-if="progressOverviewNextStep.pane"
                type="button"
                class="btn dash-btn dash-btn--primary dash-btn--sm btn-primary btn-sm"
                @click="openStudentNav(progressOverviewNextStep.pane)"
              >{{ progressOverviewNextStep.label }}</button>
            </p>

            <div class="dash-analytics-entries" data-testid="basic-analytics-entry">
              <button
                type="button"
                class="dash-advanced-analytics__cta dash-basic-analytics__cta"
                :title="t('dashboard.basic_analytics.entry_hint')"
                @click="openBasicAnalytics"
              >
                <span class="dash-advanced-analytics__icon" aria-hidden="true">
                  <i class="bi bi-clipboard-data" aria-hidden="true"></i>
                </span>
                <span class="dash-advanced-analytics__copy">
                  <strong>{{ t('dashboard.basic_analytics.entry_cta') }}</strong>
                </span>
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              </button>

              <div
                v-if="canUseAdvancedAnalytics"
                class="dash-advanced-analytics"
                data-testid="advanced-analytics-entry"
              >
                <button
                  type="button"
                  class="dash-advanced-analytics__cta"
                  :title="t('dashboard.advanced_analytics.entry_hint')"
                  @click="openAdvancedAnalytics"
                >
                  <span class="dash-advanced-analytics__icon" aria-hidden="true">
                    <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
                  </span>
                  <span class="dash-advanced-analytics__copy">
                    <strong>{{ t('dashboard.advanced_analytics.entry_cta') }}</strong>
                  </span>
                  <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <section class="parent-panel student-progress__panel" :aria-label="t('dashboard.progress_assignments_title')">
              <h3 class="parent-report__subhead">{{ t('dashboard.progress_assignments_title') }}</h3>
              <p v-if="!progressSnapshot && !progressSnapshotError" class="dash-section__hint" role="status">{{ t('dashboard.progress_loading') }}</p>
              <p v-else-if="progressSnapshotError" class="dash-section__hint" role="alert">
                {{ t('dashboard.progress_error') }}
                <button type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="loadProgressSnapshot(progressWindow, { force: true })">{{ t('dashboard.retry') }}</button>
              </p>
              <p v-else-if="!progressAssignmentDue" class="dash-section__hint">{{ t('dashboard.progress_assignments_empty') }}</p>
              <template v-else>
                <div class="parent-stats parent-stats--compact student-progress__stats" role="list">
                  <article v-for="card in progressAssignmentCards" :key="card.key" class="parent-stat parent-stat--compact" role="listitem">
                    <strong>{{ card.value }}</strong>
                    <small>{{ card.label }}</small>
                  </article>
                </div>
                <p v-if="progressAssignmentRate" class="parent-stat__hint">{{ progressAssignmentRate }}</p>
              </template>
            </section>
          </div>
        </section>

        <section v-show="progressActiveSection === 'progress-memorisation'" id="progress-memorisation" class="dash-section dash-section--flat teacher-hifz" aria-labelledby="progress-memorisation-heading">
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__title">
              <span class="dash-section__title-copy">
                <h2 id="progress-memorisation-heading">{{ t('dashboard.progress_section_memorisation') }}</h2>
                <p class="dash-section__hint">{{ t('dashboard.progress_memorisation_hint') }}</p>
              </span>
            </div>
          </div>
          <div class="dash-section__body">
            <p v-if="!progressSnapshot && !progressSnapshotError" class="dash-section__hint" role="status">{{ t('dashboard.progress_loading') }}</p>
            <p v-else-if="progressSnapshotError" class="dash-section__hint" role="alert">{{ t('dashboard.progress_error') }}</p>
            <p v-else-if="progressMemorisationEmpty" class="dash-section__hint">{{ t('dashboard.progress_ranges_empty') }}</p>
            <template v-else>
              <div class="teacher-hifz__summary student-progress__hifz-summary">
                <section class="teacher-hifz__summary-section">
                  <header>
                    <span class="teacher-hifz__label">{{ t('dashboard.progress_memorised') }}</span>
                    <span class="teacher-hifz__count">{{ progressCoverage.memorised_ayahs || 0 }}</span>
                  </header>
                  <p class="teacher-kicker student-progress__stage-kicker">{{ t('dashboard.progress_self_tracked') }}</p>
                  <p v-if="progressCoverage.memorised_ayahs" class="teacher-hifz__quiet">{{ t('dashboard.progress_coverage', { n: progressCoverage.coverage_percent }) }}</p>
                </section>
                <section class="teacher-hifz__summary-section">
                  <header>
                    <span class="teacher-hifz__label">{{ t('dashboard.progress_learning') }}</span>
                    <span class="teacher-hifz__count">{{ progressCoverage.learning_ayahs || 0 }}</span>
                  </header>
                  <p class="teacher-kicker student-progress__stage-kicker">{{ t('teacher.hifz_sabaq') }} · {{ t('teacher.hifz_sabaq_help') }}</p>
                  <p class="teacher-hifz__lead">{{ progressRangeLine(progressCoverage.new_memorisation) || t('dashboard.progress_none_yet') }}</p>
                </section>
                <section class="teacher-hifz__summary-section">
                  <header>
                    <span class="teacher-hifz__label">{{ t('dashboard.progress_reviewing') }}</span>
                    <span class="teacher-hifz__count">{{ progressCoverage.reviewing_ayahs || 0 }}</span>
                  </header>
                  <p class="teacher-kicker student-progress__stage-kicker">
                    <template v-if="progressRangeLine(progressCoverage.recent_revision)">{{ t('teacher.hifz_sabqi') }}</template>
                    <template v-else-if="progressRangeLine(progressCoverage.older_revision)">{{ t('teacher.hifz_manzil') }}</template>
                    <template v-else>{{ t('teacher.hifz_sabqi') }} / {{ t('teacher.hifz_manzil') }}</template>
                  </p>
                  <p class="teacher-hifz__lead">{{ progressRangeLine(progressCoverage.recent_revision) || progressRangeLine(progressCoverage.older_revision) || t('dashboard.progress_none_yet') }}</p>
                </section>
              </div>
              <p class="teacher-hifz__quiet student-progress__inset">{{ t('dashboard.progress_newly_hint') }} {{ progressNewlyMemorised > 0 ? progressNewlyMemorised : '—' }}</p>
              <p v-if="progressValidated.validated_ayahs" class="teacher-hifz__quiet student-progress__inset student-progress__validated">
                {{ t('dashboard.progress_validated') }}: {{ progressValidated.validated_ayahs }}
                <span class="teacher-kicker">{{ t('dashboard.progress_teacher_confirmed') }}</span>
              </p>
              <p v-else class="teacher-hifz__quiet student-progress__inset">{{ t('dashboard.progress_validated_empty') }}</p>
              <button
                v-if="progressHasRevisionHistory"
                type="button"
                class="dash-text-link student-progress__ranges"
                @click="progressRangesOpen = true"
              >{{ t('dashboard.progress_ranges_recent') }}</button>
              <DashModalRoot workspace
                :open="progressRangesOpen"
                labelled-by="student-ranges-title"
                root-class="parent-modal-root teacher-dialog"
                panel-class="parent-modal"
                @close="progressRangesOpen = false"
              >
                <header class="parent-modal__head">
                  <div>
                    <h2 id="student-ranges-title">{{ t('dashboard.progress_ranges_recent') }}</h2>
                    <p>{{ t('dashboard.progress_memorisation_hint') }}</p>
                  </div>
                  <button type="button" class="parent-modal__close" :aria-label="t('common.close')" @click="progressRangesOpen = false">
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                  </button>
                </header>
                <div class="parent-modal__body">
                  <ul class="teacher-mini-list">
                    <li v-for="range in progressRevisionRanges" :key="`${range.surah_number}-${range.ayah_start}-${range.ayah_end}`">
                      <strong>{{ progressRangeLabel(range) }}</strong>
                      <span v-if="range.last_reviewed_at">{{ t('dashboard.progress_last_reviewed', { when: formatHistoryClock(range.last_reviewed_at) }) }}</span>
                    </li>
                  </ul>
                </div>
              </DashModalRoot>
              <div v-if="progressMemorisationRevisionInsights" class="student-progress__insights">
                <div v-if="progressWeakPassagesDisplay.length" class="student-progress__block">
                  <h4 class="teacher-subhead">{{ t('dashboard.progress_improve_weak') }}</h4>
                  <ul class="teacher-mini-list">
                    <li v-for="item in progressWeakPassagesDisplay" :key="item.id">
                      <strong>{{ item.label }}</strong>
                      <span v-if="item.count">{{ t('dashboard.progress_improve_times', { n: item.count }) }}</span>
                      <a class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" :href="reviewNowHref(item)">{{ t('dashboard.revisit_review') }}</a>
                    </li>
                  </ul>
                </div>
                <div v-if="progressAiRevision.length" class="student-progress__block">
                  <h4 class="teacher-subhead">{{ t('dashboard.progress_improve_ai') }}</h4>
                  <p class="dash-section__hint">{{ t('dashboard.progress_improve_ai_hint') }}</p>
                  <ul class="teacher-mini-list">
                    <li v-for="item in progressAiRevision" :key="`${item.surah_number}-${item.ayah_number}`">
                      <strong>{{ item.label }}</strong>
                      <span>{{ t('dashboard.progress_improve_ai_times', { n: item.difference_attempts }) }}</span>
                      <a
                        class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                        data-testid="ai-revision-practice"
                        :href="feedbackPracticeHref(item)"
                      >{{ t('dashboard.progress_improve_practice') }}</a>
                    </li>
                  </ul>
                </div>
                <div v-if="progressRecurringMistakes.length" class="student-progress__block">
                  <h4 class="teacher-subhead">{{ t('dashboard.progress_improve_mistakes') }}</h4>
                  <ul class="teacher-mini-list">
                    <li v-for="item in progressRecurringMistakes" :key="item.id">
                      <strong>{{ item.label }}</strong>
                      <span>{{ t('dashboard.progress_improve_times', { n: item.count }) }}</span>
                      <span v-if="item.note">{{ item.note }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </template>
          </div>
        </section>

        <section v-show="progressActiveSection === 'progress-recitation'" id="progress-recitation" class="dash-section dash-section--flat" aria-labelledby="progress-recitation-heading">
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__title">
              <span class="dash-section__title-copy">
                <h2 id="progress-recitation-heading">{{ t('dashboard.progress_section_recitation') }}</h2>
                <p class="dash-section__hint">{{ t('dashboard.progress_wording_not_tajweed') }}</p>
              </span>
            </div>
          </div>
          <div class="dash-section__body student-progress__split">
        <section class="student-progress__block parent-panel student-progress__panel" :aria-label="t('dashboard.progress_recitation_wording')">
          <h3 class="parent-report__subhead">{{ t('dashboard.progress_recitation_wording') }}</h3>
          <p class="dash-section__hint">{{ progressWordingSummary }}</p>
          <ul v-if="progressWordingPassageRows.length" class="student-progress__wording-trends" role="list">
            <li v-for="row in progressWordingPassageRows" :key="row.key" class="student-progress__wording-row" role="listitem">
              <div class="student-progress__wording-row-head">
                <strong>{{ row.label }}</strong>
                <span class="teacher-pill student-progress__wording-direction" :class="row.directionClass">{{ row.directionLabel }}</span>
              </div>
              <div class="student-progress__wording-row-scores" aria-hidden="true">
                <span class="student-progress__wording-score">{{ row.first }}%</span>
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                <span class="student-progress__wording-score is-latest">{{ row.latest }}%</span>
              </div>
              <p class="parent-stat__hint student-progress__wording-meta">
                <span v-if="row.sampleLabel">{{ row.sampleLabel }}</span>
                <time v-if="row.latestAt" :datetime="row.latestAt">{{ t('dashboard.progress_wording_latest', { when: formatHistoryClock(row.latestAt) }) }}</time>
              </p>
              <p class="visually-hidden">
                {{ t('dashboard.progress_wording_passage', { label: row.label, first: row.first, latest: row.latest }) }}
                <template v-if="row.sampleLabel">. {{ row.sampleLabel }}</template>
              </p>
            </li>
          </ul>
        </section>
          <details v-if="progressRecitationReconciliation" class="student-progress__details">
            <summary>{{ t('dashboard.progress_recitation_totals_aria') }}</summary>
            <p class="dash-section__hint">{{ progressRecitationReconciliation }}</p>
          </details>
        <div
          v-if="showMurajaahSection || showAiReciteSection"
          class="user-dashboard__review-row user-dashboard__review-row--secondary dash-review-workspace"
          data-testid="review-focus-workspace"
        >
        <header class="dash-review-workspace__head">
          <span class="dash-review-workspace__mark" aria-hidden="true">
            <i class="bi bi-bullseye"></i>
          </span>
          <span class="dash-review-workspace__copy">
            <h2>{{ t('dashboard.review_focus_title') }}</h2>
            <span>{{ t('dashboard.review_focus_summary') }}</span>
          </span>
        </header>
        <section
          v-if="showMurajaahSection"
          class="dash-section dash-section--flat dash-reveal dash-section--murajaah"
          :class="{
            'dash-section--empty': showMurajaahEmpty,
          }"
          aria-labelledby="dash-murajaah-heading"
          style="--dash-delay: 20ms"
        >
          <div class="dash-murajaah-block">
            <div class="dash-murajaah-block__head dash-murajaah-block__head--compact">
              <div class="dash-murajaah-block__head-main">
                <span class="dash-murajaah-block__title-row">
                  <span class="dash-section__icon dash-section__icon--review" aria-hidden="true">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                  </span>
                  <span class="dash-section__title-copy">
                    <h2 id="dash-murajaah-heading" class="dash-murajaah-block__title">
                      {{ t('dashboard.revisit_title') }}
                    </h2>
                  </span>
                </span>
              </div>
              <button
                v-if="showMurajaahViewAll"
                type="button"
                class="dash-glance-action dash-glance-action--ghost dash-murajaah-block__view-all"
                @click="openDrawer('murajaah')"
              >
                <i class="bi bi-list-ul" aria-hidden="true"></i>
                {{ t('dashboard.view_all_reviews') }}
              </button>
            </div>

            <div id="dash-murajaah-body">
            <div v-if="showMurajaahEmpty" class="dash-murajaah-block__empty dash-empty teacher-empty-panel">
              <TeacherEmpty illustrated>
                <span class="dash-murajaah-block__empty-title">{{ t('dashboard.revisit_empty_title') }}</span>
                <span class="dash-murajaah-block__empty-hint">{{ t('dashboard.revisit_empty_hint') }}</span>
              </TeacherEmpty>
            </div>

            <template v-else>
            <ul class="dash-murajaah-list dash-revisit" data-testid="next-to-revisit">
              <li v-for="(item, index) in revisitItems" :key="item.key">
                <article
                  class="dash-revisit__card dash-reveal"
                  :class="{
                    'is-priority': index === 0,
                  }"
                  :style="{ '--dash-delay': `${index * 50}ms` }"
                >
                  <header class="dash-revisit__head">
                    <div class="dash-revisit__head-copy">
                      <h3 class="dash-revisit__title">
                        {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                      </h3>
                      <span v-if="index === 0" class="dash-revisit__priority-label">
                        {{ t('dashboard.revisit_start_here') }}
                      </span>
                      <span class="dash-revisit__summary">
                        <span
                          v-if="item.accuracy_percent != null"
                          class="dash-revisit__meta dash-revisit__meta--inline"
                        >
                          {{ t('dashboard.ai_match_plain', { n: item.accuracy_percent }) }}
                        </span>
                        <span class="dash-revisit__state" :class="`is-${item.assessment_state || 'not_assessed'}`">
                          {{ revisitStateLabel(item) }}
                        </span>
                      </span>
                      <span v-if="murajaahItemHint(item)" class="dash-revisit__reason">
                        {{ murajaahItemHint(item) }}
                      </span>
                    </div>
                    <a
                      class="btn dash-btn dash-btn--primary dash-btn--sm dash-murajaah-row__cta dash-revisit__cta-inline btn-primary btn-sm"
                      :href="reviewNowHref(item)"
                      @click="stashReviewContext(item)"
                    >
                      <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                      {{ t('dashboard.revisit_review') }}
                    </a>
                  </header>
                  <div class="dash-revisit__body">
                    <div class="dash-revisit__ayah">
                      <p
                        v-if="referenceLine(item).words.length"
                        class="dash-ayah"
                        lang="ar"
                        dir="rtl"
                      >
                        <span
                          v-for="(word, wordIndex) in referenceLine(item).words"
                          :key="`${item.key}-${wordIndex}`"
                          class="dash-word"
                          :class="`is-${word.state}`"
                        >
                          <span class="dash-word__text" :style="madaniWordStyle(word)">{{ word.text }}</span>
                          <span class="visually-hidden">{{ t(word.labelKey) }}</span>
                        </span>
                      </p>
                      <p v-else class="dash-revisit__missing">{{ t('dashboard.reference_unavailable') }}</p>
                    </div>
                    <footer class="dash-revisit__foot">
                      <div class="dash-revisit__stats">
                        <p
                          v-if="weakHistoryLine(item)"
                          class="dash-murajaah-row__history"
                          data-testid="dash-weak-history"
                        >{{ weakHistoryLine(item) }}</p>
                      </div>
                    </footer>
                  </div>
                </article>
              </li>
            </ul>
            </template>
            </div>
          </div>
        </section>

        <section
          v-if="showAiReciteSection"
          id="ai-recite-results"
          ref="aiReciteResults"
          class="dash-section dash-section--flat dash-ai-results dash-reveal"
          :class="{
            'dash-section--empty': !aiReciteLoading && !aiReciteError && (!aiReciteView || aiReciteView.empty),
          }"
          aria-labelledby="dash-ai-results-heading"
          style="--dash-delay: 40ms"
        >
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__title">
              <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
                <i class="bi bi-mic" aria-hidden="true"></i>
              </span>
              <span class="dash-section__title-copy">
                <h2 id="dash-ai-results-heading">{{ t('dashboard.ai_recite.results_title') }}</h2>
              </span>
            </div>
          </div>

          <div id="dash-ai-results-body" class="dash-section__body">
            <div v-if="aiReciteLoading && !aiReciteStats" class="dash-ai-results__status dash-fb-skeleton" role="status">
              <span class="visually-hidden">{{ t('dashboard.loading') }}</span>
              <div class="dash-fb-skeleton__card" aria-hidden="true"></div>
              <div class="dash-fb-skeleton__card" aria-hidden="true"></div>
              <div class="dash-fb-skeleton__card" aria-hidden="true"></div>
            </div>
            <div v-else-if="aiReciteError && (!aiReciteView || aiReciteView.empty)" class="dash-ai-results__status">
              <p>{{ t('dashboard.ai_recite.stats_error_title') }}</p>
              <button type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="loadAiReciteResults">
                {{ t('dashboard.retry') }}
              </button>
            </div>
            <div v-else-if="!aiReciteView || aiReciteView.empty" class="dash-ai-results__empty teacher-empty-panel">
              <TeacherEmpty illustrated icon="bi bi-mic">
                <span class="dash-ai-results__empty-title">{{ t('dashboard.ai_recite.stats_empty_title') }}</span>
                <span class="dash-ai-results__empty-hint">{{ t('dashboard.ai_recite.results_empty_hint') }}</span>
              </TeacherEmpty>
              <a class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" :href="testRecitationHref">
                <i class="bi bi-mic" aria-hidden="true"></i>
                {{ t('dashboard.ai_recite.test_cta') || t('dashboard.open_practice') }}
              </a>
            </div>
            <template v-else>
              <p v-if="aiReciteSummaryLine" class="dash-ai-results__summary-line">{{ aiReciteSummaryLine }}</p>

              <p v-if="aiReciteHolding" class="dash-ai-results__holding">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
                <span>
                  <strong>{{ t('dashboard.ai_recite.results_holding_title') }}</strong>
                  {{ t('dashboard.ai_recite.results_holding_hint') }}
                </span>
              </p>

              <div class="dash-ai-results__layout">
                <section
                  class="dash-ai-results__panel dash-ai-results__panel--list"
                  :aria-label="t('dashboard.ai_recite.recent_attempts')"
                >
                  <div v-if="aiReciteVisibleCards.length" class="dash-review-feed-scroll">
                    <ul class="dash-section__feed dash-ai-results__attempts dash-fb-cards">
                      <DashAiReciteAttemptCard
                        v-for="item in aiReciteVisibleCards"
                        :key="item.card_key"
                        :item="item"
                        :expanded="item.card_kind === 'attempt' && expandedAttemptId === item.id"
                        :loading="expandedAttemptId === item.id && expandedLoading"
                        :error="expandedAttemptId === item.id && expandedError"
                        :detail="expandedAttemptId === item.id ? expandedComparison : null"
                        :tone="aiAttemptTone(item)"
                        :title="aiCheckTitle(item)"
                        :range-label="ayahRangeLabel(item)"
                        :checked-label="aiCheckedLabel(item)"
                        :score-short="aiAttemptScoreShort(item)"
                        :percent-label="aiAttemptAccuracy(item)"
                        :review-href="reviewNowHref(attemptReviewItem(item))"
                        :check-again-href="checkAgainHref(item)"
                        :focus-href="focusReviewHref(item)"
                        :practice-href="feedbackPracticeHref(item)"
                        :review-item="attemptReviewItem(item)"
                        @toggle="toggleAttemptDetail(item)"
                        @retry="toggleAttemptDetail(item, true)"
                        @listen="openAnalysisForItem(item, 'attempt')"
                        @stash-review="stashReviewContext"
                        @open-assignment="openProgressAssignment"
                      />
                    </ul>
                  </div>
                  <p v-else class="dash-ai-results__muted">{{ t('dashboard.ai_recite.no_recent') }}</p>
                </section>
              </div>

              <button
                type="button"
                class="dash-ai-results__all-link"
                @click="openDrawer('ai_checks')"
              >
                {{ t('dashboard.ai_recite.view_all_checks') }}
                <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
              </button>
            </template>
          </div>
        </section>
        </div>
          </div>
        </section>

        <section v-show="progressActiveSection === 'progress-feedback'" v-if="showLearnerTeacherSection" id="progress-feedback" class="dash-section dash-section--flat" aria-labelledby="progress-feedback-heading">
          <div class="dash-section__head dash-section__head--compact">
            <div class="dash-section__title">
              <span class="dash-section__title-copy">
                <h2 id="progress-feedback-heading">{{ t('dashboard.progress_section_feedback') }}</h2>
                <p class="dash-section__hint">{{ t('dashboard.progress_feedback_hint') }}</p>
              </span>
            </div>
          </div>
          <div class="dash-section__body">
            <p v-if="!progressSnapshot && !progressSnapshotError" class="dash-section__hint" role="status">{{ t('dashboard.progress_loading') }}</p>
            <p v-else-if="progressSnapshotError" class="dash-section__hint" role="alert">{{ t('dashboard.progress_error') }}</p>
            <template v-else>
              <section class="student-progress__block parent-panel student-progress__panel" :aria-label="t('dashboard.progress_teacher_assessments')">
                <h3 class="parent-report__subhead">{{ t('dashboard.progress_teacher_assessments') }}</h3>
                <p class="parent-stat__hint">{{ t('dashboard.progress_teacher_tajweed_note') }}</p>
                <p v-if="progressTeacherAverage" class="dash-section__hint">{{ progressTeacherAverage }}</p>
                <TeacherEmpty
                  v-if="!progressTeacherAssessments.length"
                  inline
                  icon="bi bi-chat-square-quote"
                  :message="t('dashboard.progress_teacher_assessments_empty')"
                />
                <ul v-else class="teacher-mini-list">
                  <li v-for="item in progressTeacherAssessments" :key="item.id">
                    <strong>{{ item.label || item.teacher_name }}</strong>
                    <span v-if="item.tajweed_score != null">{{ t('dashboard.progress_teacher_score', { n: item.tajweed_score }) }}</span>
                    <span v-if="item.note">{{ item.note }}</span>
                    <button v-if="item.recipient_id" type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="openProgressAssignment(item.recipient_id)">{{ t('dashboard.progress_feedback_open') }}</button>
                  </li>
                </ul>
              </section>
              <section class="student-progress__block parent-panel student-progress__panel" :aria-label="t('dashboard.progress_section_feedback')">
                <h3 class="parent-report__subhead">{{ t('dashboard.progress_section_feedback') }}</h3>
                <TeacherEmpty
                  v-if="!progressFeedback.length"
                  inline
                  icon="bi bi-journal-text"
                  :message="t('dashboard.progress_feedback_empty')"
                />
                <ul v-else class="teacher-mini-list">
                  <li v-for="item in progressFeedback" :key="item.id">
                    <strong>{{ item.teacher_name || t('dashboard.progress_feedback_comment') }}</strong>
                    <span v-if="item.label">{{ item.label }}</span>
                    <span>{{ item.kind === 'reviewed_submission' ? t('dashboard.progress_feedback_reviewed') : (item.body || '') }}</span>
                    <time v-if="item.at" :datetime="item.at">{{ formatHistoryClock(item.at) }}</time>
                    <button v-if="item.recipient_id && showLearnerTeacherSection" type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="openProgressAssignment(item.recipient_id)">{{ t('dashboard.progress_feedback_open') }}</button>
                  </li>
                </ul>
              </section>
            </template>
          </div>
        </section>

        <DashboardAchievementsWidget
          v-show="progressActiveSection === 'achievements'"
          v-if="achievementsWidget"
          :widget="achievementsWidget"
          :collapsed="isSectionCollapsed('achievements')"
          :title="t('dashboard.achievements.title')"
          :subtitle="t('dashboard.achievements.subtitle')"
          :subtitle-for="achievementSectionSubtitle"
          :view-all-label="t('dashboard.achievements.view_all')"
          :next-milestone-label="t('dashboard.achievements.section_next')"
          :earned-section-label="t('dashboard.achievements.section_earned')"
          :in-progress-section-label="t('dashboard.achievements.section_in_progress')"
          :summary-template="t('dashboard.achievements.summary_strip', { earned: '{earned}', total: '{total}' })"
          :expand-desc-label="t('dashboard.achievements.expand_desc')"
          :collapse-desc-label="t('dashboard.achievements.collapse_desc')"
          :empty-title="t('dashboard.achievements.empty_title')"
          :empty-hint="t('dashboard.achievements.empty_hint')"
          :locale="localeCode"
          :unlock-prefix="t('dashboard.achievements.unlocked_on')"
          :name-for="achievementName"
          :description-for="achievementDescription"
          :meaning-for="achievementMeaning"
          :how-for="achievementHowLabel"
          :status-for="achievementStatusLabel"
          :progress-for="achievementProgressLabel"
          :requirement-for="achievementRequirement"
          :tier-title-for="achievementTierTitle"
          :tier-hint-for="achievementTierHint"
          @toggle="toggleSection('achievements')"
          @view-all="openAchievementsDrawer"
        />
        </div>

        <div v-show="studentPane === 'activity'" class="dash-pane teacher-view-stage">
        <TeacherPageHeader
          :title="t('dashboard.jump_activity')"
          :subtitle="t('dashboard.nav_activity_hint')"
        />


        <section
          id="dash-activity"
          tabindex="-1"
          class="dash-section dash-section--flat dash-history student-activity__panel"
          :class="{ 'is-collapsed': studentPane !== 'activity' && isSectionCollapsed('history') }"
          aria-labelledby="dash-history-heading"
        >
          <div
            v-if="studentPane !== 'activity'"
            class="dash-section__head dash-section__head--compact"
          >
            <div class="dash-section__head-row">
              <button
                type="button"
                class="btn btn-link w-100 text-start d-flex justify-content-between dash-section__collapse"
                :aria-expanded="isSectionCollapsed('history') ? 'false' : 'true'"
                aria-controls="dash-history-body"
                @click="toggleSection('history')"
              >
                <span class="dash-section__title">
                  <span class="dash-section__title-copy">
                    <h2 id="dash-history-heading">{{ t('dashboard.history_title') }}</h2>
                    <p class="dash-section__hint">{{ t('dashboard.history_hint') }}</p>
                  </span>
                </span>
                <i class="bi dash-section__chevron" :class="isSectionCollapsed('history') ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <h2 v-else id="dash-history-heading" class="visually-hidden">{{ t('dashboard.history_title') }}</h2>
          <div v-show="studentPane === 'activity' || !isSectionCollapsed('history')" id="dash-history-body">
          <div class="student-activity__toolbar" :class="{ 'is-expanded': activityFiltersOpen }">
            <nav class="student-activity__tabs teacher-tabs" :aria-label="t('dashboard.activity_filter_type')">
              <button
                v-for="filter in activityPageTypes"
                :key="filter.key"
                type="button"
                class="teacher-tabs__tab"
                :class="{ 'is-active': activityType === filter.key }"
                :aria-pressed="activityType === filter.key"
                @click="setActivityType(filter.key)"
              >{{ filter.label }}</button>
            </nav>
            <button
              type="button"
              class="btn btn-outline-secondary student-activity__open"
              :class="{ 'is-set': activityMoreFilterCount > 0 }"
              :aria-expanded="activityFiltersOpen ? 'true' : 'false'"
              @click="activityFiltersOpen = !activityFiltersOpen"
            >
              <i class="bi bi-funnel" aria-hidden="true"></i>
              {{ activityFilterButtonLabel }}
              <span v-if="activityMoreFilterCount" class="student-activity__filter-badge">{{ activityMoreFilterCount }}</span>
            </button>
            <button
              v-if="activityPageFiltersActive"
              type="button"
              class="btn dash-btn dash-btn--tertiary dash-btn--sm btn-link btn-sm"
              @click="clearActivityFilters"
            >{{ t('parent.filter_reset') }}</button>
            <StudentActivityFilters
              v-if="activityFiltersOpen"
              :area="activityArea"
              :status="activityStatus"
              :from="activityFrom"
              :to="activityTo"
              :area-options="activityPageAreas"
              :status-options="activityPageStatuses"
              @area="setActivityArea"
              @status="setActivityStatus"
              @from="setActivityFrom"
              @to="setActivityTo"
            />
          </div>
          <p v-if="activityKind === 'recitation'" class="student-activity__kind">
            {{ t('dashboard.activity_kind_recitation') }}
            <button type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="clearActivityKind">{{ t('dashboard.activity_clear_filter') }}</button>
          </p>
          <p
            v-if="!historyLoading && !historyError && historyVisible.length"
            class="student-activity__meta"
            role="status"
            aria-live="polite"
          >{{ t('dashboard.drawer_count', { n: historyVisible.length }) }}</p>
          <div v-if="historyLoading" class="dash-history__skeleton" role="status" :aria-label="t('dashboard.loading')">
            <div v-for="n in 4" :key="n" class="teacher-skeleton dash-history__skeleton-row" aria-hidden="true"></div>
            <span class="visually-hidden">{{ t('dashboard.loading') }}</span>
          </div>
          <p v-else-if="historyError" class="dash-history__status is-error" role="alert">
            {{ t('dashboard.drawer_load_error') }}
            <button type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="loadLearningHistory">{{ t('dashboard.retry') }}</button>
          </p>
          <div v-else-if="!historyGroups.length" class="dash-history__status student-activity__empty">
            <TeacherEmpty inline icon="bi bi-clock-history" :message="historyEmptyMessage" />
            <button
              v-if="activityPageFiltersActive"
              type="button"
              class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
              @click="clearActivityFilters"
            >{{ t('parent.filter_reset') }}</button>
          </div>
          <div v-else class="dash-history__groups">
            <section v-for="group in historyGroups" :key="group.key" class="dash-history__group">
              <h3>{{ group.label }}</h3>
              <ul class="dash-history__list">
                <li v-for="item in group.items" :key="historyListKey(item)">
                  <div class="student-activity__row" :class="historyRowToneClass(item)">
                  <a
                    v-if="historyEntryHref(item)"
                    class="dash-history__link student-activity__link"
                    :href="historyEntryHref(item)"
                    :title="historyActionHint(item)"
                  >
                    <span class="dash-history__mark student-activity__mark" :class="historyMarkClass(item)" aria-hidden="true">
                      <i :class="historyKindIcon(item)"></i>
                    </span>
                    <span class="dash-history__copy">
                      <span class="dash-history__kind">{{ historyKindLabel(item) }}</span>
                      <span v-if="historyTitle(item) && historyTitle(item) !== historyKindLabel(item)" class="dash-history__title" dir="auto">{{ historyTitle(item) }}</span>
                      <span v-else-if="historyFallbackContext(item)" class="dash-history__detail">{{ historyFallbackContext(item) }}</span>
                      <span
                        v-if="historyDetail(item)"
                        class="dash-history__detail"
                        :class="{ 'is-expanded': historyDetailExpandedId === historyListKey(item) }"
                      >{{ historyDetail(item) }}</span>
                      <button
                        v-if="historyDetailExpandable(item)"
                        type="button"
                        class="student-activity__detail-toggle"
                        @click.stop="toggleHistoryDetail(item)"
                      >{{ historyDetailExpandedId === historyListKey(item) ? t('memorisation.practiceTools.showLess') : t('dashboard.open') }}</button>
                      <span v-if="historyContextPills(item).length" class="student-activity__pills">
                        <span v-for="pill in historyContextPills(item)" :key="pill.key" class="teacher-fact" :class="pill.class">{{ pill.label }}</span>
                      </span>
                      <span v-if="historyRecordingBadge(item)" class="teacher-badge" :class="historyRecordingBadge(item).class">{{ historyRecordingBadge(item).label }}</span>
                    </span>
                    <time :datetime="item.occurred_at">{{ formatHistoryClock(item.occurred_at) }}</time>
                    <i class="bi bi-chevron-right dash-history__go" aria-hidden="true"></i>
                  </a>
                  <div v-else class="dash-history__link student-activity__link student-activity__link--static">
                    <span class="dash-history__mark student-activity__mark" :class="historyMarkClass(item)" aria-hidden="true">
                      <i :class="historyKindIcon(item)"></i>
                    </span>
                    <span class="dash-history__copy">
                      <span class="dash-history__kind">{{ historyKindLabel(item) }}</span>
                      <span v-if="historyTitle(item) && historyTitle(item) !== historyKindLabel(item)" class="dash-history__title" dir="auto">{{ historyTitle(item) }}</span>
                      <span v-else-if="historyFallbackContext(item)" class="dash-history__detail">{{ historyFallbackContext(item) }}</span>
                      <span
                        v-if="historyDetail(item)"
                        class="dash-history__detail"
                        :class="{ 'is-expanded': historyDetailExpandedId === historyListKey(item) }"
                      >{{ historyDetail(item) }}</span>
                      <button
                        v-if="historyDetailExpandable(item)"
                        type="button"
                        class="student-activity__detail-toggle"
                        @click="toggleHistoryDetail(item)"
                      >{{ historyDetailExpandedId === historyListKey(item) ? t('memorisation.practiceTools.showLess') : t('dashboard.open') }}</button>
                      <span v-if="historyContextPills(item).length" class="student-activity__pills">
                        <span v-for="pill in historyContextPills(item)" :key="pill.key" class="teacher-fact" :class="pill.class">{{ pill.label }}</span>
                      </span>
                      <span v-if="historyRecordingBadge(item)" class="teacher-badge" :class="historyRecordingBadge(item).class">{{ historyRecordingBadge(item).label }}</span>
                    </span>
                    <time :datetime="item.occurred_at">{{ formatHistoryClock(item.occurred_at) }}</time>
                  </div>
                  <a
                    v-if="item.can_resume === true && item.resume_href"
                    class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                    :href="item.resume_href"
                    @click.stop
                  >{{ t('dashboard.activity_resume') }}</a>
                  <button
                    v-if="historyAssignmentTarget(item)"
                    type="button"
                    class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                    @click.stop="openActivityAssignment(item)"
                  >{{ t('dashboard.activity_open_task') }}</button>
                  </div>
                </li>
              </ul>
            </section>
            <div
              v-if="studentPane !== 'activity' && historyPage === 1 && (historyHasMore || historyCanCollapse)"
              class="dash-history__toggle-row"
            >
              <button
                v-if="historyHasMore && !historyCanCollapse"
                type="button"
                class="btn dash-btn dash-btn--ghost dash-btn--sm dash-history__more w-100 btn-outline-secondary btn-sm"
                :disabled="historyLoadingMore"
                @click="expandHistory"
              >{{ historyLoadingMore ? t('dashboard.loading') : t('dashboard.history_more') }}</button>
              <button
                v-else-if="historyCanCollapse"
                type="button"
                class="btn dash-btn dash-btn--ghost dash-btn--sm dash-history__less w-100 btn-outline-secondary btn-sm"
                @click="collapseHistory"
              >{{ t('dashboard.history_less') }}</button>
            </div>
            <TeacherPagination
              :current-page="historyPage"
              :page-count="historyPage + (historyHasMore ? 1 : 0)"
              :loading="historyLoading"
              :has-next="historyHasMore"
              :show-numbers="false"
              summary-mode="page"
              root-class="dash-history__pagination"
              @page="goHistoryPage($event)"
            />
          </div>
          </div>
        </section>

        </div>

        <div v-show="studentPane === 'messages'" id="dash-messages" class="dash-pane teacher-view-stage" tabindex="-1">
          <TeacherPageHeader
            :title="t('dashboard.jump_messages')"
            :subtitle="t('dashboard.nav_messages_hint')"
          />
          <p v-if="messagingRestricted" class="teacher-meta">{{ t('dashboard.messaging_age_restricted') }}</p>
          <p v-else-if="auth.learner_teacher_section_enabled && !studentDirectThreads.length && !supportLoading" class="teacher-meta learner-messages__connections-hint">
            {{ t('ui.connections_settings_teachers_hint') }}
            <button type="button" class="btn btn-link dash-text-link" @click="openStudentConnectionsSettings">{{ t('ui.connections_settings_manage') }}</button>
          </p>
          <LearnerStudentMessages
            v-if="messagingEnabled"
            ref="studentMessages"
            :threads="studentDirectThreads"
            :pending="supportLoading && !support"
            :error="supportError"
            :on-send="sendDirectTeacherMessage"
            :pick-teacher-id="messagesPickTeacherId"
            @threads-updated="onStudentMessagesThreadsUpdated"
            @open-assignment="openMessageAssignment"
          />
          <TeacherEmpty v-else inline class="dash-pane__empty" :message="t('dashboard.jump_learning_empty')" />
        </div>

        <div v-show="studentPane === 'settings'" id="dash-settings" class="dash-pane teacher-view-stage teacher-account-page" tabindex="-1">
          <LearnerSettingsSection
            ref="studentSettings"
            :name="auth.name || ''"
            :email="auth.email || ''"
            :initial="settingsInitial"
            :teacher-section-enabled="auth.learner_teacher_section_enabled === true"
            :parent-features-enabled="auth.parent_features_enabled === true"
            :circle="activeLearnerCircle"
            :circle-loading="learnerCircleLoading"
            :circle-error="learnerCircleError"
            :platform-switch-options="platformSwitchOptions"
            :platform-switch-url="auth.platform_switch_url || ''"
            :csrf-token="auth.csrf_token || ''"
            @message="openCircleTeacherMessage"
            @learning="openStudentNav('learning')"
            @circle-updated="applyLearnerCirclePayload"
          />
        </div>
        </div>
        </div>

        <TeacherNav
          variant="mobile"
          :items="studentNavItems"
          :badges="navBadges"
          :active-view="studentPane"
          nav-label-key="dashboard.jump_label"
          settings-label-key="dashboard.jump_settings"
          @select="openStudentNav"
        />

      </template>
    </div>

    <Teleport to="body">
      <div v-if="drawerOpen" class="modal-backdrop fade show teacher-dialog-backdrop" @click="closeDrawer"></div>
      <div
        v-if="drawerOpen"
        ref="drawerRoot"
        class="dash-drawer-root user-dashboard teacher-dialog modal fade show d-block"
        @mousedown.self="closeDrawer"
        @keydown="onDrawerKeydown"
      >
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <aside
            ref="drawer"
            class="dash-drawer modal-content"
            :class="drawerMode ? `dash-drawer--${drawerMode}` : ''"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="drawerTitleId"
          >
            <div class="dash-drawer__handle" aria-hidden="true"></div>
            <header class="dash-drawer__head modal-header">
            <div class="dash-drawer__head-main">
              <span v-if="drawerIcon" class="dash-drawer__head-icon" aria-hidden="true">
                <i :class="drawerIcon"></i>
              </span>
              <div class="dash-drawer__head-copy">
                <h2 :id="drawerTitleId" class="dash-drawer__title">{{ drawerTitle }}</h2>
                <p class="dash-drawer__subtitle">{{ drawerSubtitle }}</p>
                <p v-if="drawerCountLabel" class="dash-drawer__count">{{ drawerCountLabel }}</p>
              </div>
            </div>
            <button
              ref="drawerClose"
              type="button"
              class="btn btn-outline-secondary dash-drawer__close"
              :aria-label="t('dashboard.drawer_close')"
              @click="closeDrawer"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="dash-drawer__body modal-body">
            <div class="dash-drawer__content">
              <div
                v-if="drawerMode === 'activity' && !drawerLoading && !drawerError"
                class="dash-drawer__filters"
              role="tablist"
              :aria-label="t('dashboard.drawer_activity_title')"
            >
              <button
                v-for="filter in activityFilters"
                :key="filter.key"
                type="button"
                role="tab"
                class="dash-drawer__filter"
                :class="{ 'is-active': activityFilter === filter.key }"
                :aria-selected="activityFilter === filter.key ? 'true' : 'false'"
                @click="activityFilter = filter.key"
              >
                {{ filter.label }}
              </button>
              </div>

              <div v-if="drawerLoading" class="dash-drawer__status dash-drawer__status--loading" role="status">
              <div class="dash-spinner" aria-hidden="true"></div>
              <span>{{ t('dashboard.drawer_loading') }}</span>
            </div>
            <div v-else-if="drawerError" class="dash-drawer__status dash-drawer__status--error" role="alert">
              <span class="dash-drawer__status-icon dash-drawer__status-icon--error" aria-hidden="true">
                <i class="bi bi-wifi-off"></i>
              </span>
              <p>{{ t('dashboard.drawer_load_error') }}</p>
              <button type="button" class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm" @click="retryDrawer">
                {{ t('dashboard.retry') }}
              </button>
            </div>
            <div
              v-else-if="!visibleDrawerItems.length && drawerMode !== 'ai_checks' && drawerMode !== 'achievements'"
              class="dash-drawer__status dash-drawer__status--empty"
            >
              <span class="dash-drawer__status-icon" aria-hidden="true">
                <i class="bi bi-inbox"></i>
              </span>
              <p>{{ drawerEmptyMessage }}</p>
            </div>

            <ul v-else-if="drawerMode === 'activity'" class="dash-drawer__list">
              <li
                v-for="(item, index) in visibleDrawerItems"
                :key="item.id || `${item.type}-${item.occurred_at}`"
              >
                <div
                  class="dash-drawer__row dash-drawer__row--analysis dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__analysis-copy">
                    <span class="dash-drawer__type">{{ activityTypeLabel(item.type) }}</span>
                    <span v-if="activityAuthority(item)" class="dash-drawer__row-meta">{{ activityAuthority(item) }}</span>
                    <span class="dash-drawer__row-title">{{ activityTitle(item) }}</span>
                    <span v-if="activityOutcome(item)" class="dash-drawer__row-meta">{{ activityOutcome(item) }}</span>
                    <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                      {{ formatActivityDate(item.occurred_at) }}
                    </time>
                  </div>
                  <div v-if="canViewAnalysis(item)" class="dash-drawer__analysis-actions">
                    <button
                      type="button"
                      class="btn dash-btn dash-btn--primary dash-btn--sm dash-drawer__analysis-cta btn-primary btn-sm"
                      :disabled="isAnalysisLoading(item)"
                      @click="openAnalysisForItem(item)"
                    >
                      <i class="bi bi-graph-up" aria-hidden="true"></i>
                      {{ t('dashboard.view_analysis') }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'sessions'" class="dash-drawer__list">
              <li
                v-for="(item, index) in visibleDrawerItems"
                :key="`session-${item.id}`"
              >
                <div
                  class="dash-drawer__row dash-drawer__row--analysis dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__analysis-copy">
                    <span class="dash-drawer__type">{{ t('dashboard.activity_type_session') }}</span>
                    <span class="dash-drawer__row-title">
                      {{ item.surah_name || t('dashboard.not_started') }}
                      <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                    </span>
                    <span class="dash-drawer__row-meta">{{ sessionStatusLabel(item.status) }}</span>
                    <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                      {{ formatActivityDate(item.occurred_at) }}
                    </time>
                  </div>
                  <div v-if="canViewAnalysis(item, 'session')" class="dash-drawer__analysis-actions">
                    <button
                      type="button"
                      class="btn dash-btn dash-btn--primary dash-btn--sm dash-drawer__analysis-cta btn-primary btn-sm"
                      :disabled="isAnalysisLoading(item, 'session')"
                      @click="openAnalysisForItem(item, 'session')"
                    >
                      <i class="bi bi-graph-up" aria-hidden="true"></i>
                      {{ t('dashboard.view_analysis') }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>

            <template v-else-if="drawerMode === 'ai_checks'">
              <div
                v-if="!drawerLoading && !drawerError"
                class="dash-drawer__filters dash-drawer__filters--stack"
              >
                <label class="dash-drawer__search">
                  <span class="visually-hidden">{{ t('dashboard.ai_history_search_label') }}</span>
                  <i class="bi bi-search" aria-hidden="true"></i>
                  <input
                    v-model="drawerAiSearch"
                    type="search"
                    class="dash-drawer__search-input"
                    :placeholder="t('dashboard.ai_history_search_placeholder')"
                    autocomplete="off"
                  />
                </label>
                <div class="dash-drawer__filters" role="tablist" :aria-label="t('dashboard.ai_history_filter_label')">
                  <button
                    v-for="filter in aiCheckBandFilters"
                    :key="filter.key"
                    type="button"
                    role="tab"
                    class="dash-drawer__filter"
                    :class="{ 'is-active': drawerAiBandFilter === filter.key }"
                    :aria-selected="drawerAiBandFilter === filter.key ? 'true' : 'false'"
                    @click="drawerAiBandFilter = filter.key"
                  >
                    {{ filter.label }}
                  </button>
                </div>
              </div>
              <p
                v-if="!drawerLoading && !drawerError && !visibleDrawerItems.length"
                class="dash-drawer__status dash-drawer__status--empty dash-drawer__status--inline"
              >
                {{ t('dashboard.ai_history_empty_filtered') }}
              </p>
              <ul v-else class="dash-drawer__list dash-drawer__list--ai-checks">
                <li v-for="(item, index) in visibleDrawerItems" :key="`ai-${item.id}`">
                  <div
                    class="dash-drawer__ai-check dash-reveal"
                    :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                  >
                    <div class="dash-drawer__ai-check-card">
                      <component
                        :is="canViewAnalysis(item, 'attempt') ? 'button' : 'div'"
                        :type="canViewAnalysis(item, 'attempt') ? 'button' : undefined"
                        class="dash-drawer__ai-check-main"
                        :class="{ 'is-unavailable': !canViewAnalysis(item, 'attempt') }"
                        :disabled="canViewAnalysis(item, 'attempt') && isAnalysisLoading(item, 'attempt')"
                        :aria-label="canViewAnalysis(item, 'attempt') ? aiAttemptActionLabel(item) : undefined"
                        @click="canViewAnalysis(item, 'attempt') && openAnalysisForItem(item, 'attempt')"
                      >
                        <span
                          class="dash-drawer__ai-check-score"
                          :class="`is-${aiAttemptTone(item)}`"
                        >{{ aiAttemptScoreShort(item) }}</span>
                        <span class="dash-drawer__ai-check-copy">
                          <span class="dash-drawer__ai-check-title">
                            {{ aiCheckTitle(item) }}
                            <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                          </span>
                          <span class="dash-drawer__ai-check-meta">
                            <span v-if="aiBandLabel(item.band)">{{ aiBandLabel(item.band) }}</span>
                            <time :datetime="item.occurred_at">{{ formatActivityDate(item.occurred_at) }}</time>
                          </span>
                        </span>
                        <span class="dash-drawer__ai-check-action">{{ canViewAnalysis(item, 'attempt') ? t('dashboard.view_analysis') : t('dashboard.analysis_unavailable') }}</span>
                        <i
                          v-if="canViewAnalysis(item, 'attempt')"
                          class="dash-drawer__ai-check-go"
                          :class="isAnalysisLoading(item, 'attempt') ? 'bi bi-hourglass-split' : 'bi bi-chevron-right'"
                          aria-hidden="true"
                        ></i>
                      </component>
                      <div class="dash-drawer__ai-check-actions">
                        <a
                          v-if="aiCheckRevisionHref(item)"
                          class="btn dash-btn dash-btn--ghost dash-btn--sm btn-outline-secondary btn-sm"
                          :href="aiCheckRevisionHref(item)"
                        >
                          <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                          {{ t('dashboard.review_now') }}
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </template>

            <div v-else-if="drawerMode === 'achievements'" class="dash-drawer__achievements">
              <AchievementsPanel
                mode="full"
                :items="achievementDrawerItems"
                :tiers="achievementDrawerTiers"
                :next="achievementDrawerNext"
                :active-tier="achievementDrawerActiveTier"
                :unlocked-count="achievementDrawerUnlockedCount"
                :total-count="achievementDrawerTotalCount"
                :locale="localeCode"
                :next-milestone-label="t('dashboard.achievements.section_next')"
                :earned-section-label="t('dashboard.achievements.section_earned')"
                :in-progress-section-label="t('dashboard.achievements.section_in_progress')"
                :summary-template="t('dashboard.achievements.summary_strip', { earned: '{earned}', total: '{total}' })"
                :expand-desc-label="t('dashboard.achievements.expand_desc')"
                :collapse-desc-label="t('dashboard.achievements.collapse_desc')"
                :name-for="achievementName"
                :description-for="achievementDescription"
                :meaning-for="achievementMeaning"
                :how-label-for="achievementHowLabel"
                :status-for="achievementStatusLabel"
                :progress-for="achievementProgressLabel"
                :requirement-for="achievementRequirement"
                :tier-title-for="achievementTierTitle"
                :tier-hint-for="achievementTierHint"
                :unlock-prefix="t('dashboard.achievements.unlocked_on')"
              />
            </div>
            <ul v-else-if="drawerMode === 'murajaah' || drawerMode === 'due'" class="dash-drawer__list dash-drawer__list--murajaah">
              <li v-for="(item, index) in visibleDrawerItems" :key="`${drawerMode}-${item.key}`">
                <div
                  class="dash-drawer__row dash-drawer__row--murajaah dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__murajaah-copy">
                    <div class="dash-drawer__murajaah-top">
                      <span class="dash-drawer__type">{{ drawerMode === 'due' ? t('dashboard.daily_revision_due') : t('dashboard.daily_revision_weak') }}</span>
                      <span
                        v-if="item.strength"
                        class="dash-strength dash-strength--compact"
                        :class="`dash-strength--${item.strength}`"
                      >
                        {{ strengthLabel(item) }}
                      </span>
                    </div>
                    <span class="dash-drawer__row-title dash-drawer__murajaah-ref">
                      <span v-if="index === 0 && item.strength === 'fragile'" class="dash-murajaah-priority">
                        {{ t('dashboard.revision_priority_start') }}
                      </span>
                      {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                    </span>
                    <p class="dash-drawer__row-meta dash-drawer__murajaah-note">{{ murajaahItemHint(item) }}</p>
                  </div>
                  <div class="dash-drawer__murajaah-actions">
                    <a class="btn dash-btn dash-btn--primary dash-btn--sm dash-drawer__murajaah-cta btn-primary btn-sm" :href="reviewNowHref(item)">
                      {{ t('dashboard.review_now') }}
                    </a>
                  </div>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'hifz'" class="dash-drawer__list">
              <li v-for="(group, index) in visibleDrawerItems" :key="`hifz-${group.surah_number}`">
                <div
                  class="dash-drawer__group dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__group-head">
                    <span class="dash-drawer__row-title">{{ group.surah_name }}</span>
                    <span class="dash-drawer__row-meta">
                      {{ t('dashboard.drawer_hifz_memorised', { n: group.memorised_count }) }}
                      · {{ t('dashboard.drawer_hifz_in_progress', { n: group.learning_count }) }}
                    </span>
                  </div>
                  <p v-if="group.memorised_ayahs.length" class="dash-drawer__ayahs">
                    {{ group.memorised_ayahs.map((n) => t('dashboard.ayah_n', { n })).join(' · ') }}
                  </p>
                </div>
              </li>
            </ul>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </Teleport>

    <TeacherDialog
      ref="selfAssessmentDialog"
      :open="Boolean(reflectionPrompt)"
      :title="t('dashboard.assignment_self_assessment_title')"
      :close-label="t('common.close')"
      :busy="reflectionSaving"
      :dirty="reflectionFeeling !== reflectionInitialFeeling || reflectionHelp !== reflectionInitialHelp"
      size="md"
      class="user-dashboard learner-self-assessment"
      @close="closeSelfAssessment"
    >
      <template #pills><span class="teacher-meta">{{ reflectionPrompt?.title }}</span></template>
        <div class="learner-self-assessment__body">
          <p class="learner-self-assessment__intro">{{ t('dashboard.assignment_self_assessment_intro') }}</p>
          <div class="learner-self-assessment__choices" role="radiogroup" :aria-label="t('dashboard.assignment_self_assessment_title')">
            <label
              v-for="option in reflectionFeelingOptions"
              :key="option"
              class="learner-self-assessment__choice"
              :class="{ 'is-selected': reflectionFeeling === option }"
            >
              <input v-model="reflectionFeeling" class="visually-hidden" type="radio" name="student-self-assessment" :value="option" />
              <i :class="reflectionFeelingIcon(option)" aria-hidden="true"></i>
              {{ t(`dashboard.assignment_self_assessment_${option}`) }}
            </label>
          </div>
          <label class="learner-self-assessment__comment">
            <span>{{ t('dashboard.assignment_self_assessment_comment') }}</span>
            <textarea v-model="reflectionHelp" class="form-control" rows="3" maxlength="500" :placeholder="t('dashboard.assignment_self_assessment_comment_placeholder')"></textarea>
            <small>{{ t('dashboard.assignment_self_assessment_score_note') }}</small>
          </label>
          <p v-if="supportError" class="learner-teacher__alert alert alert-danger" role="alert">{{ supportError }}</p>
        </div>
        <template #footer>
          <button
            type="button"
            class="btn dash-btn dash-btn--primary btn-primary"
            :disabled="!reflectionFeeling || reflectionSaving"
            @click="reflectionPrompt.mode === 'before' ? submitSupportAssignment(true) : saveReflection()"
          >
            {{ reflectionPrompt.mode === 'before' ? t('dashboard.assignment_self_assessment_submit') : t('dashboard.assignment_self_assessment_save') }}
          </button>
          <button
            v-if="reflectionPrompt.mode === 'before'"
            type="button"
            class="btn dash-btn dash-btn--ghost btn-outline-secondary"
            :disabled="reflectionSaving"
            @click="submitSupportAssignment(false)"
          >{{ t('dashboard.assignment_self_assessment_submit_without') }}</button>
          <button v-else type="button" class="btn dash-btn dash-btn--ghost btn-outline-secondary" :disabled="reflectionSaving" @click="$refs.selfAssessmentDialog?.requestClose()">{{ t('dashboard.home_reflection_skip') }}</button>
        </template>
    </TeacherDialog>

    <SessionAnalysisModal
      :open="analysisModalOpen && analysisSourceKind !== 'attempt'"
      :loading="analysisLoading"
      :error="analysisError"
      :empty="!analysisLoading && !analysisError && analysisModalOpen && !analysisView?.hasContent"
      :analysis="analysisView"
      :title="t('memorisation.session_analytics_overview')"
      :close-label="t('common.close')"
      :loading-label="t('memorisation.preparing_analytics')"
      :error-title="t('memorisation.analyticsEmpty.modalErrorTitle')"
      :error-desc="t('memorisation.analyticsEmpty.modalErrorDesc')"
      :error-action-label="t('dashboard.retry')"
      error-action="retry"
      :empty-title="t('memorisation.analyticsEmpty.modalEmptyTitle')"
      :empty-desc="t('dashboard.analysis_empty_desc')"
      :ai-results-title="t('memorisation.recite_check_results')"
      :ai-results-subtitle="t('memorisation.saved_word_checks_for_this_session_range')"
      :words-title="t('dashboard.analysis_words_title')"
      :recitation-label="t('dashboard.analysis_recitation_label')"
      :correct-ayah-label="t('dashboard.analysis_correct_ayah_label')"
      :not-recited-label="t('dashboard.analysis_not_recited_label')"
      :recommendations-title="t('dashboard.analysis_recommendations_title')"
      :audio-title="t('dashboard.analysis_audio_title')"
      :no-recommendations="t('dashboard.analysis_no_recommendations')"
      :audio-unavailable="t('dashboard.analysis_audio_unavailable')"
      :audio-expired="t('dashboard.ai_recite.audio_expired')"
      :play-label="t('dashboard.ai_recite.play')"
      :pause-label="t('dashboard.ai_recite.pause')"
      :restart-label="t('dashboard.ai_recite.restart')"
      :memorisation-base-path="memorisationUrl"
      @close="closeSessionAnalysis"
      @retry="retrySessionAnalysis"
    />

    <BasicAnalyticsModal
      :open="basicAnalyticsOpen"
      :cards="basicAnalyticsCards"
      :progress-cards="basicAnalyticsProgressCards"
      :period-label="t('dashboard.learning_period', { days: chartDays })"
      @close="closeBasicAnalytics"
    />

    <AdvancedAnalyticsModal
      :open="advancedAnalyticsOpen"
      @close="closeAdvancedAnalytics"
    />

    <WorkspaceAiReciteResultModal
      v-if="analysisModalOpen && analysisSourceKind === 'attempt'"
      :theme="dashboardTheme"
      :open="analysisModalOpen"
      :loading="analysisLoading"
      :error="analysisError"
      :empty="!analysisLoading && !analysisError && analysisModalOpen && !analysisView?.hasContent"
      :view="analysisView"
      :title="analysisView?.headerTitle || t('memorisation.recite_check_results')"
      :subtitle="analysisView?.headerLead || ''"
      :close-label="t('common.close')"
      :try-again-label="t('memorisation.amd.tryAgain')"
      :your-result-label="t('memorisation.postSession.recommendation.yourResult')"
      :beta-badge-label="t('memorisation.postSession.recommendation.aiRecitationBeta')"
      :disclaimer-label="t('memorisation.amd.disclaimerShort') || t('memorisation.postSession.recommendation.aiDisclaimer')"
      :details-section-label="t('memorisation.postSession.recommendation.viewDetails')"
      :view-details-label="t('memorisation.postSession.recommendation.viewDetails')"
      :hide-details-label="t('memorisation.postSession.recommendation.hideDetails')"
      :result-stats-aria-label="t('memorisation.postSession.recommendation.resultStats')"
      :ai-results-aria-label="t('memorisation.a11y.aiMemorisationResult')"
      :colour-meter-aria-label="t('memorisation.aiCheck.colourMeterAria')"
      :audio-title="t('dashboard.analysis_audio_title')"
      :play-label="t('dashboard.ai_recite.play')"
      :pause-label="t('dashboard.ai_recite.pause')"
      :restart-label="t('dashboard.ai_recite.restart')"
      :error-title="t('memorisation.analyticsEmpty.modalErrorTitle')"
      :error-desc="t('memorisation.analyticsEmpty.modalErrorDesc')"
      :empty-title="t('memorisation.analyticsEmpty.modalEmptyTitle')"
      :empty-desc="t('dashboard.analysis_empty_desc')"
      :attempt-saved="true"
      save-state="saved"
      :saved-label="t('dashboard.ai_recite.attempt_saved') || 'Test has been saved.'"
      results-href=""
      :results-label="''"
      :show-back-to-progress="true"
      :back-to-progress-label="t('memorisation.back_to_progress') || 'Check progress'"
      :mutashabihat-title="t('memorisation.mutashabihat.driftTitle')"
      :mutashabihat-lead="t('memorisation.mutashabihat.driftLead')"
      :compare-differences-label="t('memorisation.mutashabihat.compareDifferences')"
      @close="closeSessionAnalysis"
      @try-again="retrySavedReciteAttempt"
      @back-to-progress="closeSessionAnalysis"
    />

    <Teleport to="body">
      <Transition name="dash-toast">
        <div v-if="toastMessage" class="dash-toast" role="status" aria-live="polite">
          <i class="bi bi-check2-circle" aria-hidden="true"></i>
          <span>{{ toastMessage }}</span>
          <button type="button" :aria-label="t('common.close')" @click="clearToast">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </Transition>
    </Teleport>

    <AchievementUnlockToast
      :queue="achievementUnlockQueue"
      :kicker="t('dashboard.achievements.unlock_kicker')"
      :dismiss-label="t('common.close')"
      :title-for="achievementName"
      :message-for="achievementUnlockMessage"
      @acknowledge="acknowledgeAchievementUnlock"
    />

    <SessionVoiceAssistant
      v-if="auth.session_voice_enabled && sessionVoiceOpen"
      :theme="darkTheme ? 'dark' : 'light'"
      :memorisation-url="auth.memorisation_url || '/memorisation'"
      :phrase-hints="auth.session_voice_hints || []"
      @close="closeSessionVoice"
    />
  </main>
</template>

<script>
import { setModalScrollLock } from '../utils/modalScrollLock.js'
import { defineAsyncComponent } from 'vue'
import { learningApi } from '../scripts/api/learning'
import NetworkFallback from '../components/NetworkFallback.vue'
import ConnectPrompt from '../components/ConnectPrompt.vue'
import TeacherNav from '../components/teacher/TeacherNav.vue'
import StudentContinueCard from '../components/dashboard/StudentContinueCard.vue'
import TeacherKpiGrid from '../components/teacher/TeacherKpiGrid.vue'
import TeacherEmpty from '../components/teacher/TeacherEmpty.vue'
import LearnerSettingsSection from '../components/teacher/LearnerSettingsSection.vue'
import LearnerStudentNotifications from '../components/teacher/LearnerStudentNotifications.vue'
import LearnerTeacherSection from '../components/teacher/LearnerTeacherSection.vue'
import DashModalRoot from '../components/dashboard/DashModalRoot.vue'
import TeacherDialog from '../components/teacher/TeacherDialog.vue'
import { applyAssignmentThreadUpdate } from '../scripts/teacher/learnerTaskThread.js'
import { latestLearnerHomeFeedback } from '../scripts/teacher/learnerHome.js'
import {
  buildHomeAttentionRows,
  homeAttentionAssignmentIds,
  homeAttentionTailRows,
  homeNextActionItem,
  homeUpcomingAssignments,
} from '../scripts/dashboard/studentHome.js'
import { buildStudentPracticeTools, STUDENT_HOME_PRACTICE_TOOL_IDS } from '../scripts/dashboard/studentPractice.js'
import { isLearnerSubmitted, isLearnerTaskApproved, learnerPrimaryActionKey, mergeFeedbackReadState, persistFeedbackRead, readFeedbackReadMap } from '../scripts/teacher/learnerDashboard.js'
import { formatTaskDueUrgency, resolveDisplayTaskState, TASK_STATE, taskStateLabelKey } from '../scripts/teacher/taskState.js'
import LearnerMyLearningPlan from '../components/teacher/LearnerMyLearningPlan.vue'
import { assignmentProgressLabel } from '../scripts/teacher/formatters.js'
import { assignmentDisplayLabel } from '../scripts/teacher/taskTypes.js'
import { formatLearnerDisplayDate } from '../utils/learnerDisplayDate.js'
import DashAnimatedNumber from '../components/DashAnimatedNumber.vue'
import { buildSessionAnalysisView } from '../scripts/sessionAnalysis/buildSessionAnalysisView'
import { buildWorkspaceAiReciteResultView } from '../scripts/workspaceAiRecite/buildWorkspaceAiReciteResultView.js'
import { withStrictMadaniResultGlyphs } from '../scripts/workspaceAiRecite/strictMadaniResultView.js'
import { loadMadaniAyahGlyphs } from '../scripts/mushaf/madaniSnippetGlyphs.js'
import { classifyRequestFailure, subscribeNetworkStatus } from '../utils/networkStatus'
import { activeSessionSnapshotKey } from '../utils/mutqinStorageKeys'
import { progressBarDisplay } from '../utils/progressDisplay'
import { buildDashboardAiReciteStatsView } from '../scripts/dashboardAiRecite/buildStatsView'
import { loadAyah } from '../scripts/dashboardAiRecite/ayahText'
import { loadTeacherMadaniAyah, overlayMadaniGlyphs } from '../scripts/teacher/madaniDisplayWords.js'
import {
  buildAttemptAyahFeedback,
  feedbackInsightKey,
  resolveWordCounts,
} from '../scripts/dashboardAiRecite/attemptFeedback'
import {
  buildCheckAgainHref,
  buildReviewHref,
  compatibleAttemptDelta,
  paintReferenceWords,
  presentationTone as presentationToneForScore,
  stashPreviousAiCheck,
} from '../scripts/dashboard/progressView'
import DashAiReciteAttemptCard from '../components/dashboard/DashAiReciteAttemptCard.vue'
import TeacherPageHeader from '../components/teacher/TeacherPageHeader.vue'
import TeacherPagination from '../components/teacher/TeacherPagination.vue'
import StudentActivityFilters from '../components/dashboard/StudentActivityFilters.vue'
import {
  activityActiveFilterCount,
  activityFiltersFromSearch,
  activityHistoryGroupLabel,
  dedupeActivityItems,
  syncActivityFiltersUrl,
} from '../scripts/dashboard/studentActivity.js'
import LearnerStudentMessages from '../components/teacher/LearnerStudentMessages.vue'
import { pickDashboardPrimaryKind } from '../scripts/dashboard/primaryAction'
import { learnerConnectionPhase, learnerHasLearningNetwork } from '../scripts/dashboard/learnerConnection'
import { learnerCircleCompactSummary } from '../scripts/dashboard/learnerCirclePresentation'
import {
  studentNavItems as buildStudentNavItems,
  normalizeStudentDashboardPane,
  studentDashboardHistoryState,
  studentDashboardPaneFromHistory,
  studentDashboardPaneFromLocation,
  studentDashboardReturnHref,
  studentDashboardUrlForPane,
  progressWindowFromSearch,
} from '../scripts/dashboard/studentDashboardNavigation.js'
import {
  buildProgressOverviewGroups,
  filterWeakPassagesForDisplay,
  flattenProgressOverviewStats,
  mapWordingPassageRows,
  progressOverviewLeadLine,
  progressSectionDeepLinks,
  recitationChecksReconciliationNote,
  wordingTrendSummary,
} from '../scripts/dashboard/studentProgressView.js'
import { dailyMutqinHref, memorisationGoalHref } from '../scripts/session/sessionGoal'
import { feedbackPracticeHref as revisionHrefFromFeedback, practiceRevisionHref } from '../scripts/dashboardAiRecite/studentFeedback.js'
import { learnerAssignmentCategoryLabel, filterLearningAssignments } from '../scripts/dashboard/learnerLearningView.js'
import { recitationAccuracyBand } from '../scripts/engine/recitationThresholds.js'
import {
  clearAiAssessmentRetry,
  clearSessionCompletionRetry,
  consumeDashboardRefreshAfterSession,
  peekDashboardRefreshAfterSession,
  readAiAssessmentRetry,
  readSessionCompletionRetry,
} from '../scripts/session/postSessionDashboardFlow'
import { trackEvent as trackAckeeEvent, ACKEE_EVENTS } from '../scripts/analytics/ackee.js'
import { PRODUCT_EVENTS, trackProductEvent } from '../scripts/analytics/productEvents.js'
import {
  captureReturnFocus,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'
import DashboardAchievementsWidget from '../components/achievements/DashboardAchievementsWidget.vue'
import AchievementsPanel from '../components/achievements/AchievementsPanel.vue'
import AchievementUnlockToast from '../components/achievements/AchievementUnlockToast.vue'
/* Workspace + student pane styles ship in teacher-dashboard.css and student-dashboard.css (see layouts/app.blade.php). */
import '../components/achievements/achievements.css'

const SessionAnalysisModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "session-analysis-modal" */
  '../components/SessionAnalysisModal.vue'
))

const SessionVoiceAssistant = defineAsyncComponent(() => import(
  /* webpackChunkName: "session-voice-rt" */
  '../components/SessionVoiceAssistant.vue'
))

const WorkspaceAiReciteResultModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "workspace-recite-result" */
  '../components/WorkspaceAiReciteResultModal.vue'
))

const BasicAnalyticsModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "basic-analytics-modal" */
  '../components/basicAnalytics/BasicAnalyticsModal.vue'
))
const AdvancedAnalyticsModal = defineAsyncComponent(() => import(
  /* webpackChunkName: "advanced-analytics-modal" */
  '../components/advancedAnalytics/AdvancedAnalyticsModal.vue'
))

const METRIC_META = [
  { key: 'completed_sessions', tone: 'success', labelKey: 'metric_completed', hintKey: 'metric_completed_hint', drawer: 'sessions', icon: 'bi bi-journal-check' },
  { key: 'saved_sessions', tone: 'accent', labelKey: 'metric_saved', hintKey: 'metric_saved_hint', hrefPanel: 'saved', icon: 'bi bi-bookmark-heart' },
  { key: 'memorised_ayahs', tone: 'info', labelKey: 'metric_memorised', hintKey: 'metric_memorised_hint', altHintKey: 'metric_completed_ayahs_hint', drawer: 'hifz', icon: 'bi bi-stars' },
]

const DRAWER_TITLES = {
  activity: 'drawer_activity_title',
  sessions: 'drawer_sessions_title',
  ai_checks: 'drawer_ai_title',
  notes: 'drawer_notes_title',
  hifz: 'drawer_hifz_title',
  murajaah: 'drawer_murajaah_title',
  due: 'drawer_due_title',
  achievements: 'achievements.drawer_title',
}

const DRAWER_SUBTITLES = {
  activity: 'drawer_activity_subtitle',
  sessions: 'drawer_sessions_subtitle',
  ai_checks: 'drawer_ai_subtitle',
  notes: 'drawer_notes_subtitle',
  hifz: 'drawer_hifz_subtitle',
  murajaah: 'drawer_murajaah_subtitle',
  due: 'drawer_due_subtitle',
  achievements: 'achievements.drawer_subtitle',
}

const DRAWER_EMPTY = {
  activity: 'drawer_activity_empty',
  sessions: 'drawer_sessions_empty',
  ai_checks: 'drawer_ai_empty',
  notes: 'drawer_notes_empty',
  hifz: 'drawer_hifz_empty',
  murajaah: 'drawer_murajaah_empty',
  due: 'drawer_due_empty',
  achievements: 'achievements.empty_title',
}

const DRAWER_ICONS = {
  activity: 'bi bi-clock-history',
  sessions: 'bi bi-journal-check',
  ai_checks: 'bi bi-mic',
  notes: 'bi bi-journal-text',
  hifz: 'bi bi-journal-bookmark',
  murajaah: 'bi bi-arrow-repeat',
  due: 'bi bi-calendar-check',
  achievements: 'bi bi-award',
}

export default {
  name: 'UserDashboard',
  components: {
    NetworkFallback,
    ConnectPrompt,
    TeacherNav,
    TeacherKpiGrid,
    StudentContinueCard,
    TeacherEmpty,
    LearnerSettingsSection,
    LearnerTeacherSection,
    LearnerStudentNotifications,
    LearnerStudentMessages,
    TeacherPageHeader,
    TeacherPagination,
    StudentActivityFilters,
    DashModalRoot,
    TeacherDialog,
    LearnerMyLearningPlan,
    DashAnimatedNumber,
    DashAiReciteAttemptCard,
    SessionAnalysisModal,
    WorkspaceAiReciteResultModal,
    BasicAnalyticsModal,
    AdvancedAnalyticsModal,
    SessionVoiceAssistant,
    DashboardAchievementsWidget,
    AchievementsPanel,
    AchievementUnlockToast,
  },
  props: {
    auth: { type: Object, default: () => ({}) },
    initialData: { type: Object, default: null },
  },
  data() {
    const postSessionMarker = peekDashboardRefreshAfterSession()
    const forceFresh = !!postSessionMarker
    const initial = forceFresh ? null : this.sanitizePayload(this.initialData)
    return {
      data: initial,
      loading: !initial,
      error: false,
      failureKind: 'failure',
      chartDays: 30,
      progressSnapshot: null,
      progressSnapshotLoading: false,
      progressSnapshotError: false,
      progressSnapshotRequest: 0,
      chartReady: true,
      reduceMotion: false,
      lastSyncedAt: initial?.meta?.generated_at || null,
      syncState: initial ? 'ready' : 'loading',
      lastDashboardFetchedAt: initial ? Date.now() : 0,
      lastChartFingerprint: '',
      dashboardQuietTtlMs: 45000,
      homeNotificationsExpanded: false,
      studentNoticeUnread: 0,
      postSessionCompletedSessionId: Number(postSessionMarker?.completedSessionId || 0) || null,
      visibilityHandler: null,
      focusHandler: null,
      escapeHandler: null,
      drawerMode: null,
      drawerItems: [],
      drawerLoading: false,
      drawerError: false,
      drawerRequestId: 0,
      drawerReturnFocus: null,
      dashboardRequestId: 0,
      activityFilter: 'all',
      drawerAiSearch: '',
      drawerAiBandFilter: 'all',
      darkTheme: false,
      themeObserver: null,
      activeSessionSnapshot: null,
      analysisModalOpen: false,
      analysisLoading: false,
      analysisError: false,
      analysisView: null,
      analysisSourceKind: null,
      analysisSourceId: null,
      analysisSourceKey: '',
      analysisRequestId: 0,
      basicAnalyticsOpen: false,
      advancedAnalyticsOpen: false,
      aiReciteStats: initial?.ai_recite_stats || null,
      aiReciteLoading: false,
      aiReciteError: false,
      aiReciteRequestId: 0,
      sessionVoiceOpen: false,
      toastMessage: '',
      toastTimer: null,
      achievementUnlockQueue: [],
      achievementDrawerItems: [],
      achievementDrawerTiers: [],
      achievementDrawerNext: null,
      achievementDrawerActiveTier: '',
      achievementDrawerUnlockedCount: null,
      achievementDrawerTotalCount: null,
      achievementNotifiedIds: {},
      support: null,
      supportLoading: false,
      supportRequestId: 0,
      supportError: '',
      learnerCircle: null,
      learnerCircleLoading: false,
      learnerCircleRequestId: 0,
      learnerCircleError: '',
      assignmentSavingId: 0,
      feedbackReadVersion: 0,
      messagesPickTeacherId: null,
      learnerRecordOpened: false,
      assignmentCompletionMessage: '',
      reflectionPrompt: null,
      reflectionFeeling: '',
      reflectionHelp: '',
      reflectionInitialFeeling: '',
      reflectionInitialHelp: '',
      reflectionSaving: false,
      assignmentCompletionTimer: null,
      assignmentFailedItem: null,
      historyItems: [],
      historyLoading: false,
      historyError: false,
      historyFilter: 'all',
      historyPage: 1,
      historyExpanded: false,
      historyPreviewCount: 5,
      historyPageSize: 20,
      historyPageHasMore: false,
      historyNextOffset: null,
      historyRequest: 0,
      historyLoadingMore: false,
      activityType: 'all',
      activityArea: 'all',
      activityStatus: 'all',
      activityFrom: '',
      activityTo: '',
      activityFiltersOpen: false,
      historyDetailExpandedId: '',
      progressRangesOpen: false,
      activityKind: '',
      revisitAyahText: {},
      expandedAttemptId: null,
      expandedLoading: false,
      expandedError: false,
      expandedComparison: null,
      expandedDetailCache: {},
      collapsedSections: { 'learning-connections': true },
      collapsedCards: {},
      progressActiveSection: 'dash-progress',
      studentPane: typeof window === 'undefined'
        ? 'home'
        : studentDashboardPaneFromLocation(window.location, 'home'),
      paneScrollPositions: {},
      dashboardPopstateHandler: null,
      dashboardPreviousScrollRestoration: null,
      learnerHeaderHeight: 76,
      learnerHeaderObserver: null,
      revisionSnoozingId: 0,
      revisionPrefsSaving: false,
    }
  },
  computed: {
    dashboardTheme() {
      if (typeof document === 'undefined') return this.darkTheme ? 'dark' : 'light'
      return document.documentElement.getAttribute('data-theme') || (this.darkTheme ? 'dark' : 'light')
    },
    memorisationUrl() {
      return this.auth?.memorisation_url || '/memorisation'
    },
    learnerLearningNetworkConnected() {
      return learnerHasLearningNetwork({
        auth: this.auth,
        support: this.support,
        supportLoading: this.supportLoading,
      })
    },
    messagingEnabled() {
      return this.learnerLearningNetworkConnected
    },
    messagingRestricted() {
      const teachers = this.support?.circle?.teachers
      if (!Array.isArray(teachers) || !teachers.length) return false
      return teachers.every((teacher) => teacher.can_message === false)
    },
    studentDirectThreads() {
      const circleTeachers = Array.isArray(this.support?.circle?.teachers) ? this.support.circle.teachers : []
      const threadMap = new Map(
        (Array.isArray(this.support?.direct_threads) ? this.support.direct_threads : []).map((row) => [Number(row.teacher_id), row]),
      )
      const rows = circleTeachers.length
        ? circleTeachers.map((teacher) => {
          const thread = threadMap.get(Number(teacher.id))
          return {
            teacher_id: teacher.id,
            teacher_name: teacher.name || thread?.teacher_name,
            can_message: teacher.can_message,
            messages: thread?.messages || [],
            unread_count: thread?.unread_count,
          }
        })
        : (this.support?.direct_threads || [])
      return rows.filter((row) => row?.teacher_id)
    },
    studentNavItems() {
      return buildStudentNavItems({
        learning: this.learnerLearningNetworkConnected,
        messaging: this.messagingEnabled,
        practiceHref: this.memorisationUrl,
      })
    },
    navBadges() {
      void this.feedbackReadVersion
      const raw = Array.isArray(this.support?.learning?.feedback_inbox) ? this.support.learning.feedback_inbox : []
      const threadTeachers = new Set(this.studentDirectThreads.map(thread => Number(thread.teacher_id)))
      const feedbackUnread = mergeFeedbackReadState(raw, readFeedbackReadMap()).filter((item) => item.unread && !threadTeachers.has(Number(item.teacher_id))).length
      const dmUnread = this.studentDirectThreads.reduce(
        (sum, thread) => sum + (thread.unread_count ?? (thread.messages || []).filter((message) => message.unread && message.sender === 'teacher').length),
        0,
      )
      const total = feedbackUnread + dmUnread
      const badges = {}
      if (total > 0) badges.messages = total
      const notices = Number(this.studentNoticeUnread || 0)
      if (notices > 0) badges.home = notices
      return badges
    },
    settingsInitial() {
      const name = String(this.auth?.name || this.auth?.email || '?').trim()
      return name.slice(0, 1).toUpperCase()
    },
    freshMemoriseHref() {
      return memorisationGoalHref(this.memorisationUrl, 'memorise')
    },
    dailyMutqinEntryHref() {
      const practice = this.data?.daily_revision?.recommended_practice
        || this.data?.recommended_next
        || null
      const recommendation = Number(practice?.id || practice?.recommendation_id || 0)
      const surah = Number(
        practice?.surah_number
        || practice?.surah
        || this.journeyContinue?.surah_number
        || this.data?.continue?.surah_number
        || 0,
      )
      const from = Number(
        practice?.ayah_start
        || practice?.from
        || this.journeyContinue?.ayah_start
        || this.data?.continue?.ayah_start
        || 0,
      )
      const to = Number(
        practice?.ayah_end
        || practice?.to
        || this.journeyContinue?.ayah_end
        || this.data?.continue?.ayah_end
        || from
        || 0,
      )
      return dailyMutqinHref(this.memorisationUrl, {
        recommendation: recommendation || undefined,
        surah: surah || undefined,
        from: from || undefined,
        to: to || undefined,
      })
    },
    todaysFocusHint() {
      const focus = this.data?.retention?.todays_focus
      if (focus?.detail) {
        const label = String(focus.label || '').trim()
        const detail = String(focus.detail || '').trim()
        if (label && detail) return `${label}: ${detail}`
        return detail || label || ''
      }
      return ''
    },
    testRecitationHref() {
      return memorisationGoalHref(this.memorisationUrl, 'test')
    },
    canUseAdvancedAnalytics() {
      return this.auth?.advanced_analytics_enabled === true
    },
    platformSwitchOptions() {
      const platforms = []
      platforms.push({ id: 'learner' })
      if (this.auth.teacher_dashboard_url) platforms.push({ id: 'teacher' })
      if (this.auth.parent_dashboard_url) platforms.push({ id: 'parent' })
      return platforms.length > 1 ? platforms : []
    },
    showLearnerTeacherSection() {
      return this.auth?.learner_teacher_section_enabled === true
        && this.learnerLearningNetworkConnected
    },
    activeLearnerCircle() {
      return this.support?.circle || this.learnerCircle
    },
    learnerTeachersClassesCount() {
      const circle = this.activeLearnerCircle
      const teachers = Array.isArray(circle?.teachers) ? circle.teachers.length : 0
      const memberships = Array.isArray(circle?.memberships)
        ? circle.memberships.filter((row) => row.status === 'pending' || row.status === 'approved').length
        : 0
      return teachers + memberships
    },
    learnerConnectionStatus() {
      const phase = learnerConnectionPhase(this.activeLearnerCircle)
      if (phase === 'connected') return this.t('ui.connections_status_connected')
      if (phase === 'pending') return this.t('ui.connections_status_partial')
      if (this.auth?.learner_teacher_section_enabled) return this.t('ui.connections_status_none')
      return ''
    },
    learnerConnectionPhaseLabel() {
      return learnerConnectionPhase(this.activeLearnerCircle)
    },
    learnerConnectionsHubSummary() {
      return learnerCircleCompactSummary(this.activeLearnerCircle, (key, params) => this.t(key, params))
    },
    learnerConnectSettingsHref() {
      if (typeof window === 'undefined') return '/dashboard?tab=settings'
      return studentDashboardReturnHref(window.location.href, 'settings')
    },
    showLearnerConnectPrompt() {
      return this.auth?.learner_teacher_section_enabled === true
        && this.studentPane === 'home'
        && !this.supportLoading
        && !this.learnerCircleLoading
        && learnerConnectionPhase(this.activeLearnerCircle) === 'none'
    },
    homeFeedback() {
      void this.feedbackReadVersion
      const item = this.showLearnerTeacherSection ? latestLearnerHomeFeedback(this.support) : null
      if (!item) return null
      return mergeFeedbackReadState([item], readFeedbackReadMap())[0] || null
    },
    homePlan() {
      return this.support?.learning_plan || null
    },
    learnerPlans() {
      const plans = this.support?.circle?.learning_plans
      if (Array.isArray(plans) && plans.length) return plans
      return [this.homePlan]
    },
    homeAttentionRows() {
      if (!this.showLearnerTeacherSection || !this.support) return []
      const unread = this.homeFeedback?.unread ? this.homeFeedback : null
      return buildHomeAttentionRows(this.support.assignments, unread)
    },
    homeNextAction() {
      if (!this.showLearnerTeacherSection || this.supportLoading || this.supportError || !this.support) return null
      return homeNextActionItem(this.homeAttentionRows)
    },
    homeMoreAttentionRows() {
      return homeAttentionTailRows(this.homeAttentionRows, this.homeNextAction)
    },
    showHomeNextAction() {
      return !!this.homeNextAction
    },
    homeNextActionTitleId() {
      return 'learner-home-next-action'
    },
    homeContinueEyebrow() {
      return this.t('dashboard.home_your_practice')
    },
    homeUpcomingTasks() {
      if (!this.showLearnerTeacherSection || !this.support) return []
      return homeUpcomingAssignments(
        this.support.assignments,
        homeAttentionAssignmentIds(this.homeAttentionRows),
      )
    },
    showHomeAttentionSection() {
      if (!this.showLearnerTeacherSection) return false
      if (this.supportError) return true
      if (this.supportLoading && !this.support) return true
      return this.homeMoreAttentionRows.length > 0
    },
    showHomeNoAssignmentsNote() {
      if (!this.showLearnerTeacherSection || !this.support || this.supportLoading || this.supportError) return false
      if (this.homeAttentionRows.length || this.homeUpcomingTasks.length) return false
      const assignments = Array.isArray(this.support?.assignments) ? this.support.assignments : []
      return assignments.length === 0
    },
    isNewStudentHome() {
      return !this.hasMemorisationHistory
    },
    homeWelcomeContext() {
      const streak = Number(this.data?.retention?.streak_days || 0)
      if (streak > 0) {
        return streak === 1
          ? this.t('teacher.learner_weekly_streak_one')
          : this.t('teacher.learner_weekly_streak_other', { n: streak })
      }
      if (this.showHomeNextAction) return ''
      const urgent = this.homeAttentionRows.find((item) => item.kind === 'assignment')?.row
      if (urgent) {
        const due = this.assignmentDue(urgent)
        if (due?.text) return this.t('dashboard.home_welcome_next_due', { label: due.text })
        return this.t('dashboard.home_welcome_next_due', { label: this.assignmentRangeLabel(urgent) })
      }
      const upcoming = this.homeUpcomingTasks[0]
      if (upcoming) {
        const due = this.assignmentDue(upcoming)
        if (due?.text) return this.t('dashboard.home_welcome_next_due', { label: due.text })
      }
      return ''
    },
    homeStatCards() {
      return this.learningCards
        .slice(0, 4)
        .map((card) => ({
          ...card,
          icon: `bi ${card.icon}`,
          label: card.label,
          shortLabel: card.label,
          unitHint: card.hint,
        }))
    },
    showHomeStats() {
      return !!this.data && !this.isNewStudentHome && this.homeStatCards.length > 0
    },
    homePracticeTools() {
      return buildStudentPracticeTools({
        t: this.t.bind(this),
        base: this.memorisationUrl,
        pricingHref: String(this.auth?.pricing_url || '/pricing'),
        returnTab: 'home',
        toolIds: STUDENT_HOME_PRACTICE_TOOL_IDS,
      })
    },
    studentPracticeGroups() {
      return [
        { id: 'core', label: this.t('dashboard.practice_group_core'), ids: ['mushaf', 'memorise', 'revise', 'recite'] },
        { id: 'techniques', label: this.t('dashboard.practice_group_techniques'), ids: ['hide', 'listen', 'one'] },
        { id: 'utilities', label: this.t('dashboard.practice_group_utilities'), ids: ['find', 'saved'] },
      ].map(group => ({ ...group, tools: group.ids.map(id => this.studentPracticeTools.find(tool => tool.key === id)).filter(Boolean) }))
    },
    studentPracticeTools() {
      return buildStudentPracticeTools({
        t: this.t.bind(this),
        base: this.memorisationUrl,
        pricingHref: String(this.auth?.pricing_url || '/pricing'),
        returnTab: 'practice',
      })
    },
    homeAchievementPreview() {
      if (this.isNewStudentHome) return ''
      const item = this.achievementsWidget?.next || this.achievementsWidget?.latest
      if (!item?.id) return ''
      const name = this.achievementName(item)
      const progress = item.state === 'unlocked' ? '' : this.achievementProgressLabel(item)
      return progress ? `${name} · ${progress}` : name
    },
    mushafReaderHref() {
      const base = String(this.memorisationUrl || '/memorisation').split('?')[0]
      return `${base}?view=madani_mushaf`
    },
    reflectionFeelingOptions() {
      return ['easy', 'manageable', 'difficult', 'need_help']
    },
    showHomeContinue() {
      return !!this.primaryContinueAction
    },
    savedSessionsHref() {
      const base = this.memorisationUrl.split('?')[0]
      return `${base}?panel=saved`
    },
    ownerId() {
      return Number(this.auth?.id || 0)
    },
    greetingText() {
      const name = this.data?.welcome?.first_name
        || this.auth?.first_name
        || String(this.auth?.name || '').split(/\s+/)[0]
        || this.t('dashboard.dear_friend')
      return this.t('dashboard.greeting', { name })
    },
    learnerFirstName() {
      return this.data?.welcome?.first_name
        || this.auth?.first_name
        || String(this.auth?.name || '').split(/\s+/)[0]
        || ''
    },
    continueCta() {
      const key = this.data?.continue?.cta_key
      if (key) {
        const translated = this.t(`dashboard.${key}`)
        if (translated && translated !== `dashboard.${key}`) return translated
      }
      return this.data?.continue?.cta_label || this.t('dashboard.cta_start')
    },
    continueHref() {
      const href = String(this.data?.continue?.href || '').trim()
      return href || this.memorisationUrl
    },
    journey() {
      return this.data?.journey && typeof this.data.journey === 'object'
        ? this.data.journey
        : null
    },
    journeyHasStarted() {
      return !!this.journey?.has_started
    },
    hasMemorisationHistory() {
      if (this.journeyMemorisedCount > 0) return true
      if (Number(this.data?.snapshot?.completed_sessions?.value ?? 0) > 0) return true
      if (Number(this.data?.snapshot?.memorised_ayahs?.value ?? 0) > 0) return true
      if (this.data?.progress?.current_surah_number) return true
      const row = this.data?.continue
      return !!(row?.surah_number || row?.surah_name)
    },
    journeyContinue() {
      if (this.journey?.continue) return this.journey.continue
      if (this.hasMemorisationHistory && this.data?.continue) return this.data.continue
      return null
    },
    journeyContinueHref() {
      const href = String(this.journeyContinue?.href || this.continueHref || '').trim()
      return href || this.memorisationUrl
    },
    journeyContinueLabel() {
      if (this.isLiveContinueAction) return this.t('dashboard.return_session_label')
      return this.t('dashboard.journey_continue_label')
    },
    journeyContinueCta() {
      if (this.isLiveContinueAction) return this.t('dashboard.return_session_now')
      const key = this.journeyContinue?.cta_key
      if (key) {
        const translated = this.t(`dashboard.${key}`)
        if (translated && translated !== `dashboard.${key}`) return translated
      }
      return this.t('dashboard.journey_continue_cta')
    },
    journeyMemorisedCount() {
      return Math.max(
        Number(this.journey?.overall?.memorised_ayah_count ?? 0),
        Number(this.data?.progress?.memorised_ayah_count ?? 0),
        Number(this.data?.snapshot?.memorised_ayahs?.value ?? 0),
        Number(this.data?.snapshot?.completed_ayahs?.value ?? 0),
      )
    },
    journeyOverallPercent() {
      return Number(this.journey?.overall?.percent ?? 0)
    },
    journeyOverallDisplay() {
      return progressBarDisplay(this.journeyOverallPercent)
    },
    hifzLearningCount() {
      const progress = this.data?.progress || {}
      const cont = this.journeyContinue || {}
      const explicit = Math.max(
        Number(progress.learning_ayah_count ?? 0),
        Number(cont.learning_ayah_count ?? 0),
      )
      if (explicit > 0) return explicit
      const start = Number(progress.ayah_start || cont.ayah_start || 0)
      const end = Number(progress.ayah_end || cont.ayah_end || start)
      return start > 0 && end >= start ? (end - start + 1) : 0
    },
    hifzGlanceStats() {
      return [
        {
          key: 'memorised',
          label: this.t('dashboard.glance_memorised_label'),
          value: this.journeyMemorisedCount,
          icon: 'bi bi-stars',
        },
        {
          key: 'learning',
          label: this.t('dashboard.glance_learning_label'),
          value: this.hifzLearningCount,
          icon: 'bi bi-book-half',
        },
      ]
    },
    showJourneyOverall() {
      return this.journeyMemorisedCount > 0 || this.journeyOverallPercent > 0
    },
    journeyReview() {
      const review = this.journey?.review
      if (!review || !review.surah_name || !review.href) return null
      return review
    },
    currentlyLearningText() {
      const progress = this.data?.progress
      const cont = this.journeyContinue
      const surah = progress?.current_surah_name || cont?.surah_name || ''
      const start = Number(progress?.ayah_start || cont?.ayah_start || 0)
      const end = Number(progress?.ayah_end || cont?.ayah_end || start)
      if (start <= 0) return ''
      const range = start === end
        ? this.t('dashboard.ayah_n', { n: start })
        : this.t('dashboard.ayah_range', { start, end })
      if (surah) return `${surah} · ${range}`
      return this.t('dashboard.currently_learning_range', { range })
    },
    showMurajaahSection() {
      return this.revisitItems.length > 0
    },
    learningMetrics() {
      const metrics = this.data?.learning?.metrics
      const empty = {
        memorised: { value: null, period_days: null },
        revised: { value: null, period_days: this.chartDays },
        recited: { value: null, period_days: this.chartDays, repeats: null },
        ai_checks: { value: null, period_value: null },
      }
      return metrics && typeof metrics === 'object' ? { ...empty, ...metrics } : empty
    },
    progressWindow() {
      return this.chartDays === 7 ? 'week' : 'month'
    },
    progressSections() {
      const sections = [
        { id: 'dash-progress', label: this.t('dashboard.progress_section_overview') },
        { id: 'progress-memorisation', label: this.t('dashboard.progress_section_memorisation') },
        { id: 'progress-recitation', label: this.t('dashboard.progress_section_recitation') },
      ]
      if (this.showLearnerTeacherSection) {
        sections.push({ id: 'progress-feedback', label: this.t('dashboard.progress_section_feedback') })
      }
      sections.push({ id: 'achievements', label: this.t('dashboard.progress_section_achievements') })
      return sections
    },
    progressPracticeMetrics() {
      const practice = this.progressSnapshot?.overview?.practice
      if (practice && typeof practice === 'object') return { ...this.learningMetrics, ...practice }
      return this.learningMetrics
    },
    progressOverviewGroups() {
      return buildProgressOverviewGroups(this.t, this.progressPracticeMetrics, { periodDays: this.chartDays })
    },
    progressOverviewStatCards() {
      return flattenProgressOverviewStats(this.progressOverviewGroups)
    },
    progressOverviewLead() {
      return progressOverviewLeadLine(this.t, this.progressPracticeMetrics, { periodDays: this.chartDays })
    },
    progressSectionLinks() {
      return progressSectionDeepLinks(this.t, this.progressSections)
    },
    progressRecitationReconciliation() {
      return recitationChecksReconciliationNote(this.t, this.progressPracticeMetrics)
    },
    progressWeakPassagesDisplay() {
      return filterWeakPassagesForDisplay(this.progressWeakPassages)
    },
    progressMemorisationRevisionInsights() {
      return this.progressWeakPassagesDisplay.length > 0
        || this.progressAiRevision.length > 0
        || this.progressRecurringMistakes.length > 0
    },
    progressOverviewNextStep() {
      if (this.murajaahPreview.length) {
        const item = this.murajaahPreview[0]
        return {
          label: this.t('dashboard.progress_overview_next_revisit', { label: `${item.surah_name} · ${this.t('dashboard.ayah_n', { n: item.ayah_number })}` }),
          href: this.reviewNowHref(item),
        }
      }
      if (this.progressAssignmentDue) {
        return {
          label: this.t('dashboard.progress_overview_next_assignments'),
          pane: 'learning',
        }
      }
      if (!Number(this.progressPracticeMetrics?.ai_checks?.period_value || 0)) {
        return {
          label: this.t('dashboard.progress_recitation_next'),
          href: this.testRecitationHref,
        }
      }
      return null
    },
    progressAssignments() {
      return this.progressSnapshot?.overview?.assignments || null
    },
    progressAssignmentDue() {
      return Number(this.progressAssignments?.due || 0)
    },
    progressAssignmentCards() {
      const row = this.progressAssignments || {}
      return [
        { key: 'due', label: this.t('dashboard.progress_assignments_due'), value: Number(row.due || 0) },
        { key: 'completed', label: this.t('dashboard.progress_assignments_completed'), value: Number(row.completed || 0) },
        { key: 'submitted', label: this.t('dashboard.progress_assignments_submitted'), value: Number(row.submitted || 0) },
        { key: 'missed', label: this.t('dashboard.progress_assignments_missed'), value: Number(row.missed || 0) },
      ]
    },
    progressAssignmentRate() {
      const percent = this.progressAssignments?.completion_percent
      if (percent == null || this.progressAssignmentDue < 1) return ''
      return this.t('dashboard.progress_assignments_rate', { n: percent })
    },
    progressCoverage() {
      return this.progressSnapshot?.memorisation?.coverage || {}
    },
    progressValidated() {
      return this.progressSnapshot?.memorisation?.validated_memorisation || {}
    },
    progressNewlyMemorised() {
      return Number(this.progressSnapshot?.memorisation?.newly_memorised_ayahs || 0)
    },
    progressMemorisationEmpty() {
      if (!this.progressSnapshot) return !this.progressSnapshotLoading
      const coverage = this.progressCoverage
      return !Number(coverage.memorised_ayahs || 0)
        && !Number(coverage.learning_ayahs || 0)
        && !Number(coverage.reviewing_ayahs || 0)
        && !this.progressNewlyMemorised
        && !Number(this.progressValidated.validated_ayahs || 0)
    },
    progressRevisionRanges() {
      const recent = this.progressCoverage.recent_revision?.items || []
      const older = this.progressCoverage.older_revision?.items || []
      return [...recent, ...older].slice(0, 8)
    },
    progressHasRevisionHistory() {
      return this.progressRevisionRanges.length > 0
    },
    progressWording() {
      return this.progressSnapshot?.recitation?.wording_match || null
    },
    progressWordingPassages() {
      return Array.isArray(this.progressWording?.passages) ? this.progressWording.passages : []
    },
    progressWordingPassageRows() {
      return mapWordingPassageRows(this.t, this.progressWordingPassages)
    },
    progressWordingSummary() {
      return wordingTrendSummary(this.t, this.progressWording)
    },
    progressTeacherAssessments() {
      return Array.isArray(this.progressSnapshot?.recitation?.teacher_assessments?.items)
        ? this.progressSnapshot.recitation.teacher_assessments.items
        : []
    },
    progressTeacherAverage() {
      const block = this.progressSnapshot?.recitation?.teacher_assessments
      if (!block || block.average == null || !Number(block.count || 0)) return ''
      return this.t('dashboard.progress_teacher_average', { n: block.average, count: block.count })
    },
    progressWeakPassages() {
      return Array.isArray(this.progressSnapshot?.improve?.weak_passages) ? this.progressSnapshot.improve.weak_passages : []
    },
    progressAiRevision() {
      const block = this.progressSnapshot?.improve?.ai_revision
      if (!block || block.is_tajweed || block.authority !== 'ai_suggestion') return []
      return Array.isArray(block.items) ? block.items : []
    },
    progressRecurringMistakes() {
      return (Array.isArray(this.progressSnapshot?.improve?.recurring_mistakes) ? this.progressSnapshot.improve.recurring_mistakes : [])
        .filter((item) => Number(item?.count || 0) >= 2)
    },
    progressImproveEmpty() {
      return !this.progressWeakPassages.length && !this.progressRecurringMistakes.length && !this.progressAiRevision.length
    },
    progressFeedback() {
      return Array.isArray(this.progressSnapshot?.feedback) ? this.progressSnapshot.feedback : []
    },
    learningCards() {
      const metrics = this.learningMetrics
      const revisedHint = metrics.revised?.capped
        ? this.t('dashboard.learning_capped')
        : this.t('dashboard.learning_revised_hint')
      const recitedHint = Number(metrics.recited?.repeats || 0) > 0
        ? this.t('dashboard.learning_repeats', { n: metrics.recited.repeats })
        : this.t('dashboard.learning_recited_hint')
      const recitedNote = metrics.recited?.capped
        ? `${recitedHint} ${this.t('dashboard.learning_capped')}`
        : recitedHint
      return [
        { key: 'memorised', value: metrics.memorised?.value ?? '—', label: this.t('dashboard.learning_memorised'), hint: this.t('dashboard.learning_memorised_hint'), action: 'hifz', icon: 'bi-bookmark-check' },
        { key: 'revised', value: metrics.revised?.value ?? '—', label: this.t('dashboard.learning_revised'), hint: revisedHint, action: 'revision', icon: 'bi-arrow-repeat' },
        { key: 'recited', value: metrics.recited?.value ?? '—', label: this.t('dashboard.learning_recited'), hint: recitedNote, action: 'recitation', icon: 'bi-mic' },
        { key: 'ai_checks', value: metrics.ai_checks?.value ?? '—', label: this.t('dashboard.learning_ai_checks'), hint: this.t('dashboard.learning_ai_checks_hint'), action: 'ai', icon: 'bi-stars' },
      ]
    },
    basicAnalyticsCards() {
      return this.learningCards.map((card) => ({
        key: card.key,
        icon: card.icon,
        title: card.label,
        value: String(card.value ?? 0),
        description: card.hint,
      }))
    },
    basicAnalyticsProgressCards() {
      return this.weeklyAnalytics.map((card) => ({
        key: card.key,
        icon: card.icon || 'bi bi-activity',
        title: card.label,
        value: String(card.value ?? 0),
        description: card.hint,
      }))
    },
    comparableSummary() {
      const summary = this.data?.learning?.comparable
      if (!summary || summary.average == null || Number(summary.attempts || 0) < 2) return null
      return summary
    },
    showMurajaahEmpty() {
      return this.murajaahPreview.length === 0
    },
    optionalReviewSuggestion() {
      if (this.murajaahPreview.length) return null
      const progress = this.data?.progress
      const cont = this.journeyContinue
      const surahName = progress?.current_surah_name || cont?.surah_name
      const start = Number(progress?.ayah_start || cont?.ayah_start || 0)
      if (!surahName || !(start > 0)) return null
      return {
        title: `${surahName} · ${this.t('dashboard.ayah_n', { n: start })}`,
        href: this.reviewNowHref({
          surah_number: Number(progress?.current_surah_number || cont?.surah_number || 0),
          ayah_number: start,
          href: cont?.href,
        }),
      }
    },
    showAiReciteSection() {
      return !!this.data
    },
    showPracticeMetrics() {
      return this.weeklyAnalytics.some((item) => Number(item.value ?? 0) > 0)
    },
    showWeeklySectionHint() {
      return this.showWeeklyEmpty || !this.showPracticeMetrics
    },
    earlyProgressMessage() {
      const pct = this.journeyOverallPercent
      if (pct <= 0 || pct > 10) return ''
      return this.t('dashboard.early_progress_message')
    },
    isSavedSessionContinue() {
      // Both a live paused/interrupted session and a deliberately ended-early
      // portion are saved work. Give each the same unambiguous return surface.
      if (this.liveReturnSession) return true
      const type = String(this.data?.continue?.action_type || '')
      return type === 'resume_session'
        || type === 'continue_session'
        || type === 'continue_incomplete'
    },
    savedSessionContinueSource() {
      if (this.liveReturnSession) return this.liveReturnSession
      if (this.isSavedSessionContinue) return this.data?.continue || {}
      return null
    },
    revisionPrimaryTarget() {
      const review = this.journeyReview
      if (review?.href) {
        const start = Number(review.ayah_start || review.ayah_number || 0)
        const end = Number(review.ayah_end || start)
        const range = start > 0
          ? (start === end
            ? this.t('dashboard.ayah_n', { n: start })
            : this.t('dashboard.ayah_range', { start, end }))
          : ''
        return {
          href: review.href,
          title: range ? `${review.surah_name} · ${range}` : review.surah_name,
        }
      }
      const item = this.murajaahPreview[0]
      if (!item) return null
      const href = this.reviewNowHref(item)
      if (!href) return null
      return {
        href,
        title: `${item.surah_name} · ${this.t('dashboard.ayah_n', { n: item.ayah_number })}`,
      }
    },
    showOptionalReviewAside() {
      const suggestion = this.optionalReviewSuggestion
      if (!suggestion?.href) return false
      return suggestion.href !== this.primaryContinueAction?.href
    },
    secondaryRevisionAction() {
      const primary = this.primaryContinueAction
      if (!primary || primary.kind === 'revise' || primary.kind === 'fresh') return null
      const review = this.revisionPrimaryTarget
      if (!review?.href || !review?.title) return null
      if (review.href === primary.href) return null
      return review
    },
    primaryContinueAction() {
      const journey = this.journeyMemorisationAction
      const review = this.revisionPrimaryTarget
      const row = this.journeyContinue || {}
      const kind = pickDashboardPrimaryKind({
        hasSaved: this.isSavedSessionContinue,
        review,
        journey,
        continueActionType: String(row.action_type || this.data?.continue?.action_type || ''),
        remembered: row.remembered_count,
        rangeTotal: row.range_ayah_count,
      })
      if (kind === 'saved') {
        const source = this.savedSessionContinueSource || {}
        const title = this.continueSessionTitle(source)
        return {
          kind: 'saved',
          href: String(source.href || this.continueHref || this.memorisationUrl).trim(),
          label: this.t('dashboard.saved_session_label'),
          title,
          hint: this.t('dashboard.saved_session_hint'),
          cta: this.t('dashboard.cta_continue'),
          icon: 'bi bi-bookmark-heart-fill',
          ariaLabel: `${this.t('dashboard.saved_session_label')}. ${title}. ${this.t('dashboard.saved_session_hint')}`,
        }
      }
      if (kind === 'revise' && review) {
        return {
          kind: 'revise',
          href: review.href,
          label: this.t('dashboard.journey_review_label'),
          title: review.title,
          hint: this.t('memorisation.sessionGoal.reviseHint'),
          cta: this.t('dashboard.journey_review_cta'),
          icon: 'bi bi-arrow-repeat',
          ariaLabel: `${this.t('dashboard.journey_review_label')}. ${review.title}. ${this.t('memorisation.sessionGoal.reviseHint')}`,
        }
      }
      if (kind === 'journey' && journey) {
        const why = String(
          this.journeyContinue?.why_summary
          || this.data?.continue?.why_summary
          || this.data?.recommended_next?.why_summary
          || '',
        ).trim()
        const focusHint = this.todaysFocusHint
        const continueLabel = this.t('dashboard.continue_memorising_label') || 'Continue memorising'
        return {
          kind: 'journey',
          href: this.dailyMutqinEntryHref,
          label: continueLabel,
          title: journey.title,
          hint: focusHint || why || null,
          range: (focusHint || why) ? null : this.continueRangeLabel(this.journeyContinue || this.data?.progress),
          cta: this.t('dashboard.cta_continue') || 'Continue',
          icon: 'bi bi-journal-bookmark',
          ariaLabel: `${continueLabel}. ${journey.title}`,
        }
      }
      const focusHint = this.todaysFocusHint
      const startLabel = this.t('dashboard.start_practising_label') || 'Start practising'
      const startTitle = this.t('dashboard.start_practising_title') || 'Al-Fatihah · Ayahs 1–5'
      return {
        kind: 'fresh',
        href: this.dailyMutqinEntryHref,
        label: startLabel,
        title: startTitle,
        hint: focusHint || this.t('dashboard.start_practising_hint') || this.t('memorisation.sessionGoal.freshHint'),
        cta: this.t('dashboard.cta_start') || 'Start',
        icon: 'bi bi-journal-bookmark',
        ariaLabel: `${startLabel}. ${startTitle}`,
      }
    },
    journeyMemorisationAction() {
      if (!this.journeyContinue) return null
      return {
        kind: 'memorisation',
        href: this.journeyContinueHref,
        title: this.journeyContinue.surah_name || this.t('dashboard.start_session'),
        label: this.journeyContinueLabel,
        cta: this.journeyContinueCta,
      }
    },
    murajaahAllItems() {
      const all = this.data?.weaknesses?.all_items
      if (Array.isArray(all) && all.length) return all
      const items = this.data?.weaknesses?.items
      return Array.isArray(items) ? items : []
    },
    revisitItems() {
      const items = this.data?.learning?.revisit
      if (Array.isArray(items)) return items.slice(0, 3)
      return this.sortMurajaahByUrgency(this.murajaahAllItems).slice(0, 3)
    },
    murajaahPreview() {
      return this.revisitItems
    },
    murajaahTotal() {
      const total = Number(this.data?.weaknesses?.total ?? 0)
      return total > 0 ? total : this.murajaahAllItems.length
    },
    murajaahSectionSubtitle() {
      if (this.murajaahPreview.length) {
        return this.t('dashboard.journey_murajaah_hint', { count: this.murajaahTotal })
      }
      return this.t('dashboard.strengthen_subtitle')
    },
    showMurajaahViewAll() {
      return this.murajaahTotal > this.murajaahPreview.length
    },
    isLiveContinueAction() {
      const type = String(this.data?.continue?.action_type || '')
      return type === 'resume_session' || type === 'continue_session'
    },
    liveReturnSession() {
      if (!this.isLiveContinueAction || !this.data?.continue) return null
      const snap = this.activeSessionSnapshot
      const base = this.data.continue
      const fromKey = String(snap?.activeVerseKey || snap?.activeKey || '')
      const snapAyah = Number(fromKey.split(':')[1] || 0)
      const lastAyah = Number(base.last_ayah || snapAyah || 0) || null
      return {
        ...base,
        surah_name: base.surah_name || null,
        last_ayah: lastAyah,
        last_activity_at: base.last_activity_at
          || (snap?.savedAt ? new Date(Number(snap.savedAt)).toISOString() : null),
      }
    },
    recommendedNext() {
      const next = this.data?.recommended_next
      if (!next || !next.surah_number || !next.ayah_start || !next.href) return null
      return next
    },
    dailyRevision() {
      const revision = this.data?.daily_revision
      return revision && typeof revision === 'object' ? revision : {}
    },
    dailyDueItems() {
      return Array.isArray(this.dailyRevision.due_items) ? this.dailyRevision.due_items : []
    },
    dailyDueAllItems() {
      const items = this.dailyRevision.due_all_items
      return Array.isArray(items) ? items : this.dailyDueItems
    },
    dailyWeakItems() {
      const items = this.dailyRevision.weak_items
      return Array.isArray(items) ? items : this.murajaahPreview
    },
    dailyWeakAllItems() {
      const items = this.dailyRevision.weak_all_items
      return Array.isArray(items) ? items : this.dailyWeakItems
    },
    dailyRecommendedPractice() {
      const item = this.dailyRevision.recommended_practice || this.recommendedNext
      return item?.surah_name && item?.ayah_start && item?.href ? item : null
    },
    dailyRecommendedRange() {
      const item = this.dailyRecommendedPractice
      if (!item) return ''
      const start = Number(item.ayah_start || 0)
      const end = Number(item.ayah_end || start)
      return start === end
        ? this.t('dashboard.ayah_n', { n: start })
        : this.t('dashboard.ayah_range', { start, end })
    },
    dailyDueCount() {
      const total = Number(this.dailyRevision.due_total)
      if (Number.isFinite(total) && total >= 0) return total
      return this.dailyDueAllItems.length
    },
    dailyWeakCount() {
      const total = Number(this.dailyRevision.weak_total)
      if (Number.isFinite(total) && total >= 0) return total
      return this.dailyWeakAllItems.length
    },
    revisionReminders() {
      const block = this.data?.revision_reminders
      return block && typeof block === 'object' ? block : {}
    },
    revisionOutstandingCount() {
      const n = Number(this.revisionReminders.outstanding_count)
      return Number.isFinite(n) && n > 0 ? n : 0
    },
    todaysRevisionItems() {
      return Array.isArray(this.revisionReminders.items) ? this.revisionReminders.items.slice(0, 3) : []
    },
    revisionReminderPrefs() {
      const prefs = this.revisionReminders.preferences
      return prefs && typeof prefs === 'object'
        ? {
            in_app: prefs.in_app !== false,
            email: prefs.email === true,
            snooze_hours: Number(prefs.snooze_hours) || 4,
          }
        : { in_app: true, email: false, snooze_hours: 4 }
    },
    showTodaysRevisionCard() {
      // Always show so reminder prefs and empty state are discoverable.
      return true
    },
    snapshotCards() {
      const snap = this.data?.snapshot || {}
      return METRIC_META.map((meta) => {
        const row = snap[meta.key] || {}
        const value = Number(row.value ?? 0)
        let labelKey = meta.labelKey
        let hintKey = meta.hintKey
        if (meta.key === 'memorised_ayahs' && value === 0) {
          labelKey = 'metric_completed_ayahs'
          hintKey = meta.altHintKey || meta.hintKey
        }
        const change = row.change_7d != null ? Number(row.change_7d) : null
        let deltaLabel = null
        if (change != null && change > 0) {
          deltaLabel = this.t('dashboard.change_7d', { n: change })
        }
        return {
          key: meta.key,
          tone: meta.tone,
          icon: meta.icon,
          label: this.t(`dashboard.${labelKey}`),
          hint: this.t(`dashboard.${hintKey}`),
          value,
          deltaLabel,
          drawer: meta.drawer || null,
          href: meta.hrefPanel === 'saved' ? this.savedSessionsHref : null,
        }
      })
    },
    showHeroHint() {
      return !!this.primaryContinueAction
    },
    murajaahSectionHint() {
      if (this.murajaahTotal > 1) {
        return this.t('dashboard.journey_murajaah_hint', { count: this.murajaahTotal })
      }
      return this.t('dashboard.murajaah_section_hint')
    },
    continueMetaText() {
      const progress = this.data?.progress
      if (!progress) return ''
      const parts = []
      const memorised = Number(progress.memorised_ayah_count ?? 0)
      const learning = Number(progress.learning_ayah_count ?? 0)
      if (memorised > 0) {
        parts.push(`${memorised} ${this.t('dashboard.legend_memorised').toLowerCase()}`)
      }
      if (learning > 0) {
        parts.push(`${learning} ${this.t('dashboard.legend_learning').toLowerCase()}`)
      }
      const start = Number(progress.ayah_start || 0)
      const end = Number(progress.ayah_end || 0)
      if (start > 0 && end >= start) {
        parts.push(this.t('dashboard.ayah_range', { start, end }))
      }
      return parts.join(' · ')
    },
    positionDetailText() {
      const progress = this.data?.progress
      if (!progress?.current_surah_number) return ''
      const parts = []
      const memorised = Number(progress.memorised_ayah_count ?? 0)
      const learning = Number(progress.learning_ayah_count ?? 0)
      const total = Number(progress.surah_ayah_count ?? 0)
      if (memorised > 0 || learning > 0) {
        parts.push(`${memorised} ${this.t('dashboard.legend_memorised').toLowerCase()} · ${learning} ${this.t('dashboard.legend_learning').toLowerCase()}`)
      }
      if (total > 0 && this.surahProgress) {
        parts.push(`${this.surahProgress.practised} / ${total} ${this.t('dashboard.surah_completion').toLowerCase()}`)
      }
      const start = Number(progress.ayah_start || 0)
      const end = Number(progress.ayah_end || 0)
      if (start > 0 && end >= start) {
        parts.push(this.t('dashboard.ayah_range', { start, end }))
      }
      return parts.join(' · ')
    },
    showWeeklyEmpty() {
      if (this.data?.chart?.is_empty) return true
      return !this.showPracticeMetrics
    },
    weeklyAnalytics() {
      const period = this.data?.chart?.period_summary || {}
      const week = this.data?.week_summary || {}
      const stats = period.is_empty === false || Number(period.sessions ?? 0) > 0
        ? period
        : week
      return [
        {
          key: 'week_sessions',
          label: this.t('dashboard.analytics_week_sessions'),
          hint: this.t('dashboard.analytics_week_sessions_hint'),
          value: Number(stats.sessions ?? 0),
          drawer: 'activity',
          filter: 'session',
          icon: 'bi bi-journal-check',
        },
        {
          key: 'week_ayahs',
          label: this.t('dashboard.analytics_week_ayahs'),
          hint: this.t('dashboard.analytics_week_ayahs_hint'),
          value: Number(stats.ayahs_practised ?? 0),
          drawer: 'activity',
          filter: 'all',
          icon: 'bi bi-book',
        },
        {
          key: 'active_days',
          label: this.t('dashboard.analytics_active_days'),
          hint: this.t('dashboard.analytics_active_days_hint'),
          value: Number(stats.active_days ?? 0),
          drawer: 'activity',
          filter: 'all',
          icon: 'bi bi-calendar-check',
        },
      ]
    },
    aiReciteView() {
      return buildDashboardAiReciteStatsView(this.aiReciteStats, this.t.bind(this))
    },
    aiReciteScore() {
      return this.aiReciteView?.score || null
    },
    aiReciteFacts() {
      const preferred = ['total', 'ayahs']
      const cards = this.aiReciteView?.cards || []
      return preferred
        .map((key) => cards.find((card) => card.key === key))
        .filter((card) => card && card.value && card.value !== '—')
    },
    aiReciteSummaryLine() {
      return this.aiReciteFacts.map((fact) => {
        const value = Number(fact.value)
        if (!Number.isFinite(value)) return ''
        if (fact.key === 'total') {
          return value === 1
            ? this.t('dashboard.ai_recite.summary_attempt_one')
            : this.t('dashboard.ai_recite.summary_attempts', { n: value })
        }
        if (fact.key === 'ayahs') {
          return value === 1
            ? this.t('dashboard.ai_recite.summary_ayah_one')
            : this.t('dashboard.ai_recite.summary_ayahs', { n: value })
        }
        return ''
      }).filter(Boolean).join(' · ')
    },
    aiReciteFocus() {
      return this.aiReciteView?.focus || []
    },
    aiReciteHolding() {
      return !!this.aiReciteView?.holding
    },
    aiRecitePreview() {
      return (this.aiReciteView?.recent || []).slice(0, 3)
    },
    aiReciteUnifiedCards() {
      const recent = this.aiRecitePreview.map((item) => ({
        ...item,
        card_kind: 'attempt',
        card_key: `attempt-${item.id}`,
      }))
      const covered = new Set(
        recent
          .filter((item) => Number(item.ayah_start) > 0 && Number(item.ayah_start) === Number(item.ayah_end))
          .map((item) => `${Number(item.surah_number)}:${Number(item.ayah_start)}`)
      )
      const focus = this.aiReciteFocus
        .filter((item) => !covered.has(`${Number(item.surah_number)}:${Number(item.ayah)}`))
        .map((item) => ({
          ...item,
          card_kind: 'focus',
          card_key: `focus-${item.key}`,
          id: item.key,
          accuracy_percent: item.accuracy,
          band: item.tone,
          ayah_start: item.ayah,
          ayah_end: item.ayah,
          ayah_number: item.ayah,
          occurred_at: item.last_attempted_at || '',
          has_word_alignment: false,
          flagged_word_count: 0,
          has_audio: false,
        }))
      return [...recent, ...focus]
    },
    aiReciteVisibleCards() {
      // Compact feedback lists attempts first (max 3). Focus rows stay available
      // only when there are no recent attempts to show.
      const cards = this.aiReciteUnifiedCards
      const attempts = cards.filter((item) => item.card_kind === 'attempt')
      if (attempts.length) return attempts
      return cards.filter((item) => item.card_kind === 'focus').slice(0, 3)
    },
    filteredHistory() {
      const items = Array.isArray(this.historyItems) ? this.historyItems : []
      return dedupeActivityItems(items)
    },
    historyVisible() {
      return this.filteredHistory
    },
    historyHasMore() {
      return this.historyPageHasMore === true
    },
    historyCanCollapse() {
      return this.historyExpanded === true
    },
    activityPageFiltersActive() {
      return this.activityType !== 'all'
        || this.activityArea !== 'all'
        || this.activityStatus !== 'all'
        || Boolean(this.activityFrom || this.activityTo || this.activityKind)
    },
    activityMoreFilterCount() {
      return activityActiveFilterCount({
        type: this.activityType,
        area: this.activityArea,
        status: this.activityStatus,
        from: this.activityFrom,
        to: this.activityTo,
        kind: this.activityKind,
      })
    },
    historyEmptyMessage() {
      if (this.activityPageFiltersActive) return this.t('dashboard.activity_filter_empty')
      return this.t('dashboard.history_empty')
    },
    historyGroups() {
      const groups = []
      this.historyVisible.forEach((item) => {
        const date = item.occurred_at ? new Date(item.occurred_at) : null
        const key = date && !Number.isNaN(date.getTime())
          ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
          : 'undated'
        let group = groups.find((entry) => entry.key === key)
        if (!group) {
          const bucket = activityHistoryGroupLabel(item.occurred_at)
          const label = bucket === 'today'
            ? this.t('common.relative.today')
            : (bucket === 'yesterday'
              ? this.t('dashboard.yesterday')
              : (this.formatAbsoluteDate(item.occurred_at) || key))
          group = { key, label, items: [] }
          groups.push(group)
        }
        group.items.push(item)
      })
      return groups
    },
    aiReciteImprovement() {
      const card = (this.aiReciteView?.cards || []).find((item) => item.key === 'improvement')
      if (!card?.value) return ''
      return this.t('dashboard.ai_recite.results_change', { value: card.value })
    },
    weeklyInsightText() {
      const week = this.data?.week_summary
      if (!week || week.is_empty) return ''
      const sessions = Number(week.sessions ?? 0)
      const activeDays = Number(week.active_days ?? 0)
      if (activeDays >= 2) {
        return this.t('dashboard.weekly_insight_active_days', { days: activeDays })
      }
      if (sessions >= 2) {
        return this.t('dashboard.weekly_insight_sessions', { sessions })
      }
      return ''
    },
    surahProgress() {
      const progress = this.data?.progress
      if (!progress?.current_surah_number) return null
      const display = progressBarDisplay(Number(progress.surah_completion_percent ?? 0))
      const total = Number(progress.surah_ayah_count || 0)
      const practised = Number(
        progress.surah_practised_ayah_count
        ?? ((progress.memorised_ayah_count || 0) + (progress.learning_ayah_count || 0))
      )
      return {
        value: display.percent,
        practised,
        total,
        fillWidth: display.fillWidth,
        hasProgress: display.hasProgress,
      }
    },
    secondaryCompletion() {
      // Range/plan bars stay below; surah progress lives under the surah name.
      const progress = this.data?.progress
      if (!progress) return null
      if (progress.range_completion_percent != null) {
        return this.completionBar(this.t('dashboard.range_completion'), progress.range_completion_percent)
      }
      if (progress.active_plan_completion_percent != null) {
        return this.completionBar(this.t('dashboard.plan_completion'), progress.active_plan_completion_percent)
      }
      return null
    },
    chartPalette() {
      const root = typeof document !== 'undefined' ? document.documentElement : null
      const read = (name, fallback) => {
        if (!root || typeof getComputedStyle !== 'function') return fallback
        const value = getComputedStyle(root).getPropertyValue(name).trim()
        return value || fallback
      }
      const accent = read('--accent', '#8b5e3c')
      const accentStrong = read('--accent-strong', '#765035')
      const text = read('--text', '#1f1a17')
      const textMuted = read('--text-muted', '#554c45')
      const surfaceStrong = read('--surface-strong', '#ffffff')
      const border = read('--border', 'rgba(78, 58, 38, 0.24)')
      const success = read('--success', '#2d6a4f')
      const successStrong = read('--success-strong', '#245a42')

      if (this.darkTheme) {
        return {
          ayahs: success,
          ayahsHover: successStrong,
          sessions: accent,
          sessionsHover: accentStrong,
          muted: textMuted,
          ink: text,
          tooltipBg: read('--surface-strong', '#121212'),
          tooltipBorder: border,
          grid: `color-mix(in srgb, ${border} 35%, transparent)`,
        }
      }
      return {
        ayahs: success,
        ayahsHover: successStrong,
        sessions: accent,
        sessionsHover: accentStrong,
        muted: textMuted,
        ink: text,
        tooltipBg: surfaceStrong,
        tooltipBorder: border,
        grid: `color-mix(in srgb, ${border} 35%, transparent)`,
      }
    },
    chartInstanceKey() {
      const points = this.data?.chart?.points || []
      const first = points[0]?.date || 'none'
      const last = points[points.length - 1]?.date || 'none'
      return `chart-${this.chartDays}-${points.length}-${first}-${last}`
    },
    chartSummaryText() {
      const chart = this.data?.chart || {}
      const key = String(chart.summary_key || '').trim()
      if (!key) return ''
      const params = chart.summary_params && typeof chart.summary_params === 'object'
        ? chart.summary_params
        : {
            days: this.chartDays,
            ayahs: 0,
            sessions: 0,
            active_days: 0,
          }
      const translated = this.t(`dashboard.${key}`, params)
      return translated === `dashboard.${key}` ? String(chart.summary || '') : translated
    },
    chartData() {
      const points = this.data?.chart?.points || []
      const palette = this.chartPalette
      return {
        labels: points.map((point) => this.shortDate(point.date)),
        datasets: [
          {
            label: this.t('dashboard.chart_ayahs'),
            data: points.map((point) => Number(point.primary || point.ayahs_memorised || 0)),
            backgroundColor: palette.ayahs,
            hoverBackgroundColor: palette.ayahsHover,
            borderRadius: 6,
            maxBarThickness: this.chartDays === 7 ? 22 : 14,
            categoryPercentage: 0.82,
            barPercentage: 0.92,
          },
          {
            label: this.t('dashboard.chart_sessions'),
            data: points.map((point) => Number(point.secondary || point.sessions_completed || 0)),
            backgroundColor: palette.sessions,
            hoverBackgroundColor: palette.sessionsHover,
            borderRadius: 6,
            maxBarThickness: this.chartDays === 7 ? 22 : 14,
            categoryPercentage: 0.82,
            barPercentage: 0.92,
          },
        ],
      }
    },
    chartOptions() {
      const points = this.data?.chart?.points || []
      const palette = this.chartPalette
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.reduceMotion ? false : { duration: 480, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: palette.ink,
              font: { size: 11, weight: '500' },
              padding: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
            },
          },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            titleColor: palette.ink,
            bodyColor: palette.ink,
            borderColor: palette.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            titleFont: { weight: '500', size: 12 },
            filter: (item) => item.datasetIndex === 0,
            callbacks: {
              title: (items) => {
                const index = items?.[0]?.dataIndex ?? 0
                const point = points[index] || {}
                const ayahs = Number(point.primary ?? point.ayahs_memorised ?? 0)
                const sessions = Number(point.secondary ?? point.sessions_completed ?? 0)
                return this.t('dashboard.chart_tooltip', {
                  date: this.tooltipDate(point.date),
                  ayahs,
                  sessions,
                })
              },
              label: () => null,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: this.chartDays === 7 ? 7 : 6,
              color: palette.muted,
              font: { size: 10, weight: '400' },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: palette.muted,
              font: { size: 10, weight: '400' },
            },
            grid: { color: palette.grid },
          },
        },
      }
    },
    drawerOpen() {
      return !!this.drawerMode
    },
    achievementsWidget() {
      return this.data?.achievements || null
    },
    localeCode() {
      return document.documentElement?.lang || 'en'
    },
    drawerTitleId() {
      return 'dash-drawer-title'
    },
    drawerTitle() {
      const key = DRAWER_TITLES[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    drawerSubtitle() {
      const key = DRAWER_SUBTITLES[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    drawerIcon() {
      return DRAWER_ICONS[this.drawerMode] || ''
    },
    drawerCountLabel() {
      if (this.drawerMode === 'achievements') return ''
      if (this.drawerLoading || this.drawerError) return ''
      const count = this.visibleDrawerItems.length
      if (count <= 0) return ''
      return this.t('dashboard.drawer_count', { n: count })
    },
    drawerEmptyMessage() {
      if (
        this.drawerMode === 'activity'
        && this.activityFilter !== 'all'
        && this.drawerItems.length
        && !this.visibleDrawerItems.length
      ) {
        return this.t('dashboard.activity_filter_empty')
      }
      const key = DRAWER_EMPTY[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    activityFilters() {
      return [
        { key: 'all', label: this.t('dashboard.activity_filter_all') },
        { key: 'session', label: this.t('dashboard.activity_filter_sessions') },
        { key: 'ai_check', label: this.t('dashboard.activity_filter_ai') },
      ]
    },
    activityPageTypes() {
      return [
        { key: 'all', label: this.t('dashboard.activity_filter_all') },
        { key: 'session', label: this.t('dashboard.activity_filter_sessions') },
        { key: 'assignment', label: this.t('dashboard.activity_type_assignments') },
        { key: 'ai_check', label: this.t('dashboard.activity_filter_ai') },
        { key: 'teacher_review', label: this.t('dashboard.activity_filter_notes') },
      ]
    },
    activityPageAreas() {
      return [
        { key: 'all', label: this.t('dashboard.activity_filter_all') },
        { key: 'nazra', label: this.t('dashboard.activity_area_nazra') },
        { key: 'hifz', label: this.t('dashboard.activity_area_hifz') },
        { key: 'tajweed', label: this.t('dashboard.activity_area_tajweed') },
        { key: 'revision', label: this.t('dashboard.activity_area_revision') },
      ]
    },
    activityPageStatuses() {
      return [
        { key: 'all', label: this.t('dashboard.activity_filter_all') },
        { key: 'completed', label: this.t('dashboard.activity_status_completed') },
        { key: 'saved', label: this.t('dashboard.activity_status_saved') },
        { key: 'interrupted', label: this.t('dashboard.activity_status_interrupted') },
        { key: 'awaiting_review', label: this.t('dashboard.activity_status_awaiting') },
        { key: 'reviewed', label: this.t('dashboard.activity_status_reviewed') },
        { key: 'no_result', label: this.t('dashboard.activity_status_no_result') },
      ]
    },
    activityFiltersActive() {
      return this.activityMoreFilterCount > 0
    },
    activityFilterButtonLabel() {
      return this.t('dashboard.activity_more_filters')
    },
    aiCheckBandFilters() {
      return [
        { key: 'all', label: this.t('dashboard.ai_history_filter_all') },
        { key: 'weak', label: this.t('dashboard.drawer_result_weak') },
        { key: 'mixed', label: this.t('dashboard.drawer_result_mixed') },
        { key: 'strong', label: this.t('dashboard.drawer_result_strong') },
      ]
    },
    visibleDrawerItems() {
      if (this.drawerMode === 'ai_checks') {
        let items = Array.isArray(this.drawerItems) ? [...this.drawerItems] : []
        const q = String(this.drawerAiSearch || '').trim().toLowerCase()
        if (q) {
          items = items.filter((item) => {
            const name = String(item?.surah_name || '').toLowerCase()
            const surah = String(item?.surah_number || '')
            const range = String(this.formatItemRange(item) || '').toLowerCase()
            const accuracy = String(item?.accuracy_percent ?? '')
            return name.includes(q) || surah.includes(q) || range.includes(q) || accuracy.includes(q)
          })
        }
        if (this.drawerAiBandFilter !== 'all') {
          items = items.filter((item) => String(item?.band || '').toLowerCase() === this.drawerAiBandFilter)
        }
        return items
      }
      if (this.drawerMode === 'murajaah' || this.drawerMode === 'due') {
        return this.sortMurajaahByUrgency(this.drawerItems)
      }
      if (this.drawerMode !== 'activity' || this.activityFilter === 'all') {
        return this.drawerItems.filter((item) => String(item?.type || '').toLowerCase() !== 'note')
      }
      return this.drawerItems.filter((item) => {
        const type = String(item?.type || '').toLowerCase()
        if (type === 'note') return false
        if (this.activityFilter === 'session') {
          return type === 'session' || type.startsWith('session_')
        }
        if (this.activityFilter === 'ai_check') {
          return type === 'ai_check' || type === 'ai_recite'
        }
        return true
      })
    },
    weekSummaryText() {
      const week = this.data?.week_summary
      if (!week || week.is_empty) {
        return this.t('dashboard.week_summary_empty')
      }
      return this.t('dashboard.week_summary', {
        sessions: Number(week.sessions || 0),
        ai_checks: Number(week.ai_checks || 0),
        ayahs: Number(week.ayahs_practised || 0),
      })
    },
  },
  async mounted() {
    this.initialiseDashboardNavigation()
    this.syncLearnerHeaderHeight()
    const learnerHeader = document.querySelector('.app-navbar')
    if (learnerHeader && typeof ResizeObserver !== 'undefined') {
      this.learnerHeaderObserver = new ResizeObserver(() => this.syncLearnerHeaderHeight())
      this.learnerHeaderObserver.observe(learnerHeader)
    }
    const postSessionArrival = consumeDashboardRefreshAfterSession()
    this.reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    this.syncTheme()
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.themeObserver = new MutationObserver(() => {
        this.syncTheme()
        this.chartReady = false
        this.$nextTick(() => { this.chartReady = true })
      })
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class'],
      })
    }

    this.refreshActiveSessionSnapshot()
    this.loadLearnerSupport()
    this.loadLearnerCircle()
    if (postSessionArrival) {
      if (postSessionArrival.saveFailed) {
        this.$nextTick(() => this.showToast(this.t('memorisation.sync.status.failed')))
      }
      await this.retryPendingPostSessionWrites()
      await Promise.allSettled([
        this.fetchDashboard(this.chartDays, { initial: true, force: true }),
        this.loadAiReciteResults(),
      ])
    } else if (!this.data) {
      this.fetchDashboard(this.chartDays, { initial: true })
    }
    // When SSR/initial payload exists, skip an immediate quiet refetch —
    // visibility/focus handlers cover staleness with a TTL.

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.refreshActiveSessionSnapshot()
        this.loadLearnerSupport()
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    // Focus often fires with visibilitychange; TTL inside fetchDashboard
    // dedupes the double-hit without dropping intentional refreshes.
    this.focusHandler = () => {
      if (document.visibilityState === 'visible') {
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    this.escapeHandler = (event) => {
      if (event.key !== 'Escape') return
      if (this.analysisModalOpen) return
      if (this.drawerOpen) this.closeDrawer()
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
    window.addEventListener('focus', this.focusHandler)
    document.addEventListener('keydown', this.escapeHandler)
    this.unsubscribeNetwork = subscribeNetworkStatus((online) => {
      if (!online) return
      if (readSessionCompletionRetry() || readAiAssessmentRetry()) {
        void this.retryPendingPostSessionWrites().then(() => this.reload(true))
        return
      }
      if (this.error && !this.data) this.reload(true)
    })
    if (!postSessionArrival) this.loadAiReciteResults()
    if (typeof window !== 'undefined') this.applyActivityFiltersFromLocation(window.location.search)
    this.loadLearningHistory()
    this.hydrateRevisitAyahs()
    this.scrollToAiReciteResults()
    this.enqueueAchievementUnlocks(this.data?.achievements?.pending_unlocks)
    this.openAchievementsFromHash()
    trackAckeeEvent(ACKEE_EVENTS.PROGRESS_DASHBOARD_VIEWED)
  },
  beforeUnmount() {
    this.learnerHeaderObserver?.disconnect()
    this.supportRequestId += 1
    try { this._dashboardAbort?.abort?.() } catch (_) { /* ignore */ }
    if (typeof this.unsubscribeNetwork === 'function') this.unsubscribeNetwork()
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler)
    if (this.focusHandler) window.removeEventListener('focus', this.focusHandler)
    if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler)
    if (this.dashboardPopstateHandler) window.removeEventListener('popstate', this.dashboardPopstateHandler)
    if (this.dashboardPreviousScrollRestoration && window.history) {
      window.history.scrollRestoration = this.dashboardPreviousScrollRestoration
    }
    if (this.themeObserver) this.themeObserver.disconnect()
    this.clearToast()
    clearTimeout(this.assignmentCompletionTimer)
    this.syncDrawerBodyLock(false)
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    syncProgressSectionFromLocation() {
      const url = new URL(window.location.href)
      const requested = url.searchParams.get('progress_section') || url.hash.slice(1)
      this.progressActiveSection = this.progressSections.some(section => section.id === requested) ? requested : 'dash-progress'
    },
    selectProgressSection(id) {
      if (!this.progressSections.some(section => section.id === id)) return
      this.progressActiveSection = id
      const url = new URL(window.location.href)
      url.searchParams.set('progress_section', id)
      url.hash = ''
      window.history.pushState(window.history.state, '', `${url.pathname}${url.search}`)
    },
    onProgressTabKeydown(event, id) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const ids = this.progressSections.map(section => section.id)
      const direction = document.documentElement.dir === 'rtl' ? -1 : 1
      const delta = event.key === 'ArrowRight' ? direction : -direction
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (ids.indexOf(id) + delta + ids.length) % ids.length
      this.selectProgressSection(ids[index])
      this.$nextTick(() => document.getElementById(`tab-${ids[index]}`)?.focus())
    },
    initialiseDashboardNavigation() {
      if (typeof window === 'undefined' || !window.history) return
      let pane = studentDashboardPaneFromLocation(window.location, this.studentPane)
      const urlWindow = progressWindowFromSearch(window.location.search)
      if (urlWindow) this.chartDays = urlWindow === 'week' ? 7 : 30
      if ((pane === 'learning' || pane === 'messages') && !this.learnerLearningNetworkConnected) {
        pane = 'home'
      }
      this.studentPane = pane
      this.syncProgressSectionFromLocation()
      if (pane === 'progress') this.loadProgressSnapshot(this.chartDays === 7 ? 'week' : 'month')
      const storedScroll = Number(window.history.state?.studentDashboardScrollY)
      const scrollY = Number.isFinite(storedScroll) ? storedScroll : Number(window.scrollY || 0)
      this.paneScrollPositions = { ...this.paneScrollPositions, [pane]: scrollY }
      this.dashboardPreviousScrollRestoration = window.history.scrollRestoration
      window.history.scrollRestoration = 'manual'
      window.history.replaceState(
        studentDashboardHistoryState(window.history.state, pane, scrollY),
        '',
        studentDashboardUrlForPane(window.location, pane, {
          progressWindow: pane === 'progress' ? (this.chartDays === 7 ? 'week' : 'month') : null,
        }),
      )
      this.dashboardPopstateHandler = event => this.onDashboardHistoryNavigation(event)
      window.addEventListener('popstate', this.dashboardPopstateHandler)
    },
    dashboardPaneTop() {
      if (typeof window === 'undefined') return 0
      const top = this.$el?.getBoundingClientRect?.().top
      return Math.max(0, Number(window.scrollY || 0) + (Number.isFinite(top) ? top : 0) - 12)
    },
    rememberDashboardPaneScroll(pane = this.studentPane) {
      if (typeof window === 'undefined') return 0
      const scrollY = Math.max(0, Number(window.scrollY || 0))
      this.paneScrollPositions = { ...this.paneScrollPositions, [normalizeStudentDashboardPane(pane)]: scrollY }
      return scrollY
    },
    replaceDashboardHistoryEntry(pane = this.studentPane) {
      if (typeof window === 'undefined' || !window.history) return
      const scrollY = this.rememberDashboardPaneScroll(pane)
      window.history.replaceState(
        studentDashboardHistoryState(window.history.state, pane, scrollY),
        '',
        studentDashboardUrlForPane(window.location, pane, {
          progressWindow: pane === 'progress' ? (this.chartDays === 7 ? 'week' : 'month') : null,
        }),
      )
    },
    syncProgressWindowUrl(progressWin = this.progressWindow) {
      if (typeof window === 'undefined' || !window.history || this.studentPane !== 'progress') return
      const safe = progressWin === 'week' ? 'week' : 'month'
      if (progressWindowFromSearch(window.location.search) === safe) return
      window.history.replaceState(
        window.history.state,
        '',
        studentDashboardUrlForPane(window.location, 'progress', { progressWindow: safe }),
      )
    },
    restoreDashboardPaneScroll(pane, requestedScroll = null) {
      if (typeof window === 'undefined') return
      const saved = Number(requestedScroll)
      const cached = Number(this.paneScrollPositions[pane])
      const top = requestedScroll !== null && requestedScroll !== undefined && Number.isFinite(saved)
        ? saved
        : (Number.isFinite(cached) ? cached : this.dashboardPaneTop())
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'instant' })
      })
    },
    focusDashboardPaneHeading(pane) {
      if (typeof document === 'undefined') return
      const targetId = {
        home: 'dash-home',
        learning: 'dash-welcome-heading',
        progress: this.progressActiveSection,
        activity: 'dash-activity',
        messages: 'dash-messages',
        settings: 'dash-settings',
      }[pane]
      const target = targetId ? document.getElementById(targetId) : null
      if (!target) return
      target.tabIndex = -1
      target.focus({ preventScroll: true })
    },
    navigateDashboardPane(pane, options = {}) {
      let next = normalizeStudentDashboardPane(pane, 'home')
      if ((next === 'learning' || next === 'messages') && !this.learnerLearningNetworkConnected) {
        next = 'home'
      }
      const previous = this.studentPane
      if (next === previous) {
        if (options.focus) this.$nextTick(() => this.focusDashboardPaneHeading(next))
        return false
      }
      if (options.history !== 'none') this.replaceDashboardHistoryEntry(previous)
      const nextScroll = Number.isFinite(Number(options.scrollY))
        ? Number(options.scrollY)
        : this.paneScrollPositions[next]
      this.$refs.learnerTeacherSection?.closeNavigationOverlays?.()
      this.studentPane = next
      if (next === 'progress') this.loadProgressSnapshot(this.chartDays === 7 ? 'week' : 'month')
      if (next === 'activity') {
        this.syncActivityFiltersInHistory()
        this.loadLearningHistory()
      }
      if (next === 'settings') this.loadLearnerCircle()
      if (typeof window !== 'undefined' && window.history && options.history !== 'none') {
        const method = options.history === 'replace' ? 'replaceState' : 'pushState'
        const stateScroll = Number.isFinite(Number(nextScroll)) ? Number(nextScroll) : this.dashboardPaneTop()
        window.history[method](
          studentDashboardHistoryState(window.history.state, next, stateScroll),
          '',
          studentDashboardUrlForPane(window.location, next, {
            clearContextHash: options.clearContextHash !== false,
            progressWindow: next === 'progress' ? (this.chartDays === 7 ? 'week' : 'month') : null,
          }),
        )
      }
      this.$nextTick(() => {
        if (options.restoreScroll !== false) this.restoreDashboardPaneScroll(next, nextScroll)
        if (options.focus) this.focusDashboardPaneHeading(next)
      })
      return true
    },
    onDashboardHistoryNavigation(event) {
      this.syncProgressSectionFromLocation()
      if (typeof window === 'undefined') return
      this.rememberDashboardPaneScroll(this.studentPane)
      const urlWindow = progressWindowFromSearch(window.location.search)
      if (urlWindow) this.chartDays = urlWindow === 'week' ? 7 : 30
      let next = studentDashboardPaneFromHistory(event?.state, window.location, 'home')
      if ((next === 'learning' || next === 'messages') && !this.learnerLearningNetworkConnected) {
        next = 'home'
      }
      this.$refs.learnerTeacherSection?.closeNavigationOverlays?.()
      this.studentPane = next
      if (next === 'progress') this.loadProgressSnapshot(this.chartDays === 7 ? 'week' : 'month')
      if (next === 'activity') {
        this.applyActivityFiltersFromLocation(window.location.search)
        this.loadLearningHistory()
      }
      const scrollY = Number(event?.state?.studentDashboardScrollY)
      this.$nextTick(() => {
        if (window.location.hash === '#ai-recite-results') {
          this.scrollToAiReciteResults({ fromHistory: true })
          return
        }
        this.restoreDashboardPaneScroll(next, Number.isFinite(scrollY) ? scrollY : null)
      })
    },
    openStudentNav(id) {
      this.openDashPane({ pane: id })
    },
    openDashPane(item) {
      this.navigateDashboardPane(item?.pane || 'home', {
        focus: true,
        history: 'push',
        clearContextHash: true,
      })
    },
    syncLearnerHeaderHeight() {
      const header = document.querySelector('.app-navbar')
      this.learnerHeaderHeight = Math.ceil(header?.getBoundingClientRect().height || 0)
    },
    assignmentRangeLabel(task) {
      const assignment = task?.assignment
      if (!assignment) return ''
      const range = assignment.ayah_start === assignment.ayah_end
        ? this.t('dashboard.ayah_n', { n: assignment.ayah_start })
        : this.t('dashboard.ayah_range', { start: assignment.ayah_start, end: assignment.ayah_end })
      return assignment.surah_name ? `${assignment.surah_name} · ${range}` : range
    },
    assignmentTeacherLabel(task) {
      const name = String(task?.teacher_name || task?.assignment?.teacher_name || '').trim()
      return name ? this.t('dashboard.home_teacher_named', { name }) : ''
    },
    assignmentNextActionMeta(task) {
      const parts = [this.assignmentTypeLabel(task), this.assignmentTeacherLabel(task)].filter(Boolean)
      return parts.join(' · ')
    },
    assignmentUpcomingMeta(task) {
      const parts = [this.assignmentTypeLabel(task), this.assignmentTeacherLabel(task)].filter(Boolean)
      return parts.join(' · ')
    },
    assignmentTypeLabel(task) {
      return learnerAssignmentCategoryLabel(task?.assignment, this.t.bind(this))
    },
    assignmentProgressText(task) {
      return task?.progress ? assignmentProgressLabel(task, this.t.bind(this)) : ''
    },
    assignmentStatusLabel(task) {
      if (task?.review_state === 'needs_correction') return this.t('teacher.status_needs_correction')
      if (task?.workflow_state === 'practice_completed') return this.t('teacher.practice_completed')
      if (task?.workflow_state === 'practice_required') return this.t('teacher.practice_required')
      return this.t(taskStateLabelKey(resolveDisplayTaskState(task)))
    },
    assignmentTone(task) {
      const state = resolveDisplayTaskState(task)
      if (state === TASK_STATE.DONE) return 'completed'
      if (state === TASK_STATE.OVERDUE) return 'danger'
      if (state === TASK_STATE.CANCELLED) return 'neutral'
      return 'warning'
    },
    assignmentDue(task) {
      const dueAt = task?.assignment?.due_at
      const due = formatTaskDueUrgency(dueAt, { t: this.t.bind(this) })
      if (due.tone === 'danger') {
        return { ...due, text: this.t('teacher.task_due_on', { date: formatLearnerDisplayDate(dueAt, this.t.bind(this), this.localeCode) }) }
      }
      return due
    },
    taskReadyToSubmit(task) {
      return Number(task?.progress?.activity_count || 0) >= Number(task?.progress?.target || 1)
    },
    assignmentActionIcon(task) {
      if (this.taskReadyToSubmit(task)) return 'bi-check2-circle'
      return learnerPrimaryActionKey(task) === 'start' ? 'bi-play-fill' : 'bi-arrow-repeat'
    },
    assignmentActionLabel(task) {
      if (this.taskReadyToSubmit(task)) {
        return task?.review_state === 'needs_correction'
          ? this.t('teacher.resubmit_correction')
          : this.t('teacher.mark_complete')
      }
      if (task?.review_state === 'needs_correction') return this.t('teacher.practise_correction')
      const key = learnerPrimaryActionKey(task)
      if (key === 'resume') return this.t('common.resume')
      if (key === 'redo') return this.t('teacher.coaching_practise_again')
      return this.t('teacher.learner_upcoming_start')
    },
    revisionDue(task) {
      return formatTaskDueUrgency(task?.assignment?.due_at, { t: this.t.bind(this) })
    },
    openTeacherMessage(teacherId) {
      this.openCircleTeacherMessage(teacherId)
    },
    openMessageFeedback(item) {
      if (!item) return
      if (item.id) {
        persistFeedbackRead(item.id)
        this.feedbackReadVersion += 1
      }
      const stayOnMessages = this.studentPane === 'messages'
      if (!stayOnMessages) {
        this.navigateDashboardPane('learning', { history: 'push', restoreScroll: true })
      }
      this.$nextTick(() => {
        this.$refs.learnerTeacherSection?.openFeedbackFromPanel(item)
      })
    },
    openStudentNotice(item) {
      const href = String(item?.href || '').trim()
      if (!href) return
      if (href.startsWith('/memorisation')) {
        window.location.assign(href)
        return
      }
      try {
        const url = new URL(href, window.location.origin)
        const tab = url.searchParams.get('tab')
        const assignmentId = url.searchParams.get('assignment_recipient') || url.searchParams.get('assignment')
        const feedbackId = url.searchParams.get('feedback')
        if (tab) this.navigateDashboardPane(tab, { history: 'push', focus: true })
        else if (assignmentId || feedbackId) this.navigateDashboardPane('learning', { history: 'push', focus: true })
        this.$nextTick(() => {
          if (feedbackId) {
            const row = (this.support?.learning?.feedback_inbox || []).find((r) => String(r.id) === String(feedbackId))
            if (row) this.openMessageFeedback(row)
          } else if (assignmentId) {
            this.$refs.learnerTeacherSection?.openAssignmentById?.(assignmentId)
          }
        })
      } catch (_) {
        window.location.assign(href)
      }
    },
    openLinkedLearnerRecord() {
      if (this.learnerRecordOpened || typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const feedbackId = params.get('feedback')
      const assignmentId = params.get('assignment_recipient') || params.get('assignment')
      const teacherId = params.get('teacher')
      if (!feedbackId && !assignmentId && !teacherId) return
      this.learnerRecordOpened = true
      if (teacherId && !feedbackId && !assignmentId) {
        this.openCircleTeacherMessage(Number(teacherId))
        return
      }
      if (feedbackId) {
        const item = (this.support?.learning?.feedback_inbox || []).find((row) => String(row.id) === String(feedbackId))
        if (item) this.openMessageFeedback(item)
        return
      }
      this.navigateDashboardPane('learning', { history: 'replace', focus: true })
      this.$nextTick(() => {
        this.$refs.learnerTeacherSection?.openAssignmentById(assignmentId)
      })
    },
    homeAttentionFeedbackTitle(item) {
      return item?.task_title || item?.passage?.label || item?.teacher_name || this.t('dashboard.home_recent_feedback')
    },
    homeAttentionFeedbackPreview(item) {
      if (item?.preview || item?.body) return item.preview || item.body
      if (item?.audio?.available) return this.t('teacher.voice_note')
      return ''
    },
    formatLearnerFeedbackWhen(value) {
      return formatLearnerDisplayDate(value, this.t.bind(this), this.localeCode)
    },
    openHomeFeedback() {
      const feedback = this.homeFeedback
      if (!feedback) return
      if (feedback.id) {
        persistFeedbackRead(feedback.id)
        this.feedbackReadVersion += 1
      }
      this.navigateDashboardPane('learning', { history: 'push', restoreScroll: true })
      this.$nextTick(() => {
        document.getElementById('dash-welcome-heading')?.focus({ preventScroll: true })
        this.$refs.learnerTeacherSection?.openFeedbackFromPanel(feedback)
      })
    },
    revisionRangeLabel(item) {
      const start = Number(item?.ayah_start || 0)
      const end = Number(item?.ayah_end || start)
      if (!start) return ''
      return start === end
        ? this.t('dashboard.todays_revision_ayah_one', { n: start })
        : this.t('dashboard.todays_revision_ayah_range', { start, end })
    },
    revisionDueLabel(item) {
      const bucket = String(item?.bucket || '')
      if (bucket === 'overdue') return this.t('dashboard.todays_revision_overdue')
      if (bucket === 'due_today') return this.t('dashboard.todays_revision_due_today')
      if (item?.due_local_date) {
        return `${this.t('dashboard.todays_revision_upcoming')} · ${item.due_local_date}`
      }
      return this.t('dashboard.todays_revision_upcoming')
    },
    async snoozeRevisionReminder(item) {
      const id = Number(item?.id || 0)
      if (!id || this.revisionSnoozingId) return
      this.revisionSnoozingId = id
      try {
        await learningApi.snoozeRevisionReminder(id)
        await this.reload(true)
      } catch (err) {
        this.showToast?.(this.t('common.tryAgain') || 'Try again')
      } finally {
        this.revisionSnoozingId = 0
      }
    },
    async setRevisionReminderPref(key, value) {
      if (this.revisionPrefsSaving) return
      this.revisionPrefsSaving = true
      try {
        const next = {
          ...this.revisionReminderPrefs,
          [key]: !!value,
        }
        await learningApi.updateRevisionReminderPreferences({
          revision_reminders: {
            in_app: next.in_app,
            email: next.email,
            snooze_hours: next.snooze_hours,
          },
        })
        if (this.data?.revision_reminders) {
          this.data = {
            ...this.data,
            revision_reminders: {
              ...this.data.revision_reminders,
              preferences: {
                ...(this.data.revision_reminders.preferences || {}),
                in_app: next.in_app,
                email: next.email,
                snooze_hours: next.snooze_hours,
              },
            },
          }
        }
      } catch (err) {
        this.showToast?.(this.t('common.tryAgain') || 'Try again')
      } finally {
        this.revisionPrefsSaving = false
      }
    },
    isSectionCollapsed(key) {
      return !!this.collapsedSections?.[key]
    },
    toggleSection(key) {
      this.collapsedSections = {
        ...this.collapsedSections,
        [key]: !this.collapsedSections?.[key],
      }
    },
    isCardCollapsed(key) {
      if (Object.prototype.hasOwnProperty.call(this.collapsedCards || {}, key)) {
        return !!this.collapsedCards[key]
      }
      // Keep the most urgent revisit open so its evidence and next action are visible.
      if (String(key).startsWith('revisit:')) {
        return key !== `revisit:${this.revisitItems?.[0]?.key}`
      }
      return false
    },
    toggleCard(key) {
      const currentlyCollapsed = this.isCardCollapsed(key)
      this.collapsedCards = {
        ...this.collapsedCards,
        [key]: !currentlyCollapsed,
      }
    },
    toggleRevisitCard(itemKey) {
      const key = `revisit:${itemKey}`
      const currentlyCollapsed = this.isCardCollapsed(key)
      const next = { ...this.collapsedCards }
      // Mobile: only one ayah expanded at a time.
      if (currentlyCollapsed && this.isNarrowViewport()) {
        ;(this.revisitItems || []).forEach((item) => {
          next[`revisit:${item.key}`] = true
        })
      }
      next[key] = !currentlyCollapsed
      this.collapsedCards = next
      if (currentlyCollapsed) {
        this.hydrateRevisitAyahs()
      }
    },
    isNarrowViewport() {
      if (typeof window === 'undefined' || !window.matchMedia) return true
      return window.matchMedia('(max-width: 767.98px)').matches
    },
    expandHistory() {
      if (!this.historyPageHasMore || this.historyLoadingMore) return
      this.loadLearningHistory({ append: true })
    },
    collapseHistory() {
      this.historyExpanded = false
      this.historyPage = 1
      this.loadLearningHistory()
    },
    openSessionVoice() {
      if (!this.auth?.session_voice_enabled || this.sessionVoiceOpen) return
      this.sessionVoiceOpen = true
    },
    closeSessionVoice() {
      this.sessionVoiceOpen = false
    },
    continueRangeLabel(source = {}) {
      const surah = String(source?.surah_name || source?.current_surah_name || '').trim()
      const start = Number(source?.ayah_start || 0)
      const end = Number(source?.ayah_end || start)
      if (start <= 0) return ''
      const range = start === end
        ? this.t('dashboard.ayah_n', { n: start })
        : this.t('dashboard.ayah_range', { start, end })
      if (surah) {
        return this.t('dashboard.currently_learning_with_surah', { surah, range })
      }
      if (start === end) {
        return this.t('dashboard.currently_learning_range', {
          range,
        })
      }
      return this.t('dashboard.currently_learning_range', {
        range,
      })
    },
    continueSessionTitle(source = {}) {
      const surah = String(source?.surah_name || '').trim()
      const start = Number(source?.ayah_start || 0)
      const end = Number(source?.ayah_end || start)
      if (!surah && start <= 0) return this.t('dashboard.start_session')
      const range = start <= 0
        ? ''
        : (start === end
          ? this.t('dashboard.ayah_n', { n: start })
          : this.t('dashboard.ayah_range', { start, end }))
      if (surah && range) return `${surah} · ${range}`
      return surah || range
    },
    murajaahPrimaryMeta(source = {}) {
      const start = Number(source.ayah_start || source.ayah_number || 0)
      const end = Number(source.ayah_end || start || 0)
      if (start > 0 && end >= start) {
        return this.t('dashboard.ayah_range', { start, end })
      }
      if (start > 0) {
        return this.t('dashboard.last_ayah', { n: start })
      }
      return ''
    },
    activeSessionSnapshotKey() {
      return activeSessionSnapshotKey(this.ownerId > 0 ? this.ownerId : null)
    },
    refreshActiveSessionSnapshot() {
      if (typeof sessionStorage === 'undefined') {
        this.activeSessionSnapshot = null
        return
      }
      try {
        const raw = sessionStorage.getItem(this.activeSessionSnapshotKey())
        this.activeSessionSnapshot = raw ? JSON.parse(raw) : null
      } catch {
        this.activeSessionSnapshot = null
      }
    },
    goToLiveSession() {
      const href = this.continueHref
      if (!href) return
      window.location.assign(href)
    },
    cssVar(name, fallback = '') {
      if (typeof window === 'undefined') return fallback
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    },
    sanitizePayload(payload) {
      if (!payload || typeof payload !== 'object') return null
      const owner = Number(payload?.meta?.owner_id || 0)
      if (this.ownerId && owner && owner !== this.ownerId) return null
      return this.withoutCompletedSavedSession(payload)
    },
    withoutCompletedSavedSession(payload) {
      const completedId = Number(this.postSessionCompletedSessionId || 0)
      if (completedId <= 0) return payload
      const matches = (entry) => Number(entry?.session_id || entry?.id || 0) === completedId
      if (!matches(payload?.continue) && !matches(payload?.journey?.continue)) return payload

      const next = { ...payload }
      if (matches(next.continue)) next.continue = null
      if (next.journey && matches(next.journey.continue)) {
        next.journey = { ...next.journey, continue: null }
      }
      return next
    },
    activityTitle(item) {
      if (!item) return ''
      const type = String(item.type || '').toLowerCase()
      const name = item.surah_name
        || (type.startsWith('session') ? this.t('dashboard.activity_type_session') : '')
        || (type === 'ai_check' || type === 'ai_recite' ? this.t('dashboard.activity_type_ai_check') : '')
        || (type === 'note' ? this.t('dashboard.activity_type_note') : '')
        || (type === 'assessment' ? this.t('dashboard.activity_type_assessment') : '')
        || (type === 'recommendation' ? this.t('dashboard.activity_type_recommendation') : '')
        || (type === 'ayah_memorised' ? this.t('dashboard.activity_type_memorised') : '')
      const range = this.formatItemRange(item)
      if (name && range) return `${name} · ${range}`
      if (name) return name
      if (range) return range
      return item.title || item.context || ''
    },
    activityOutcome(item) {
      if (!item) return ''
      const key = String(item.outcome_key || '').toLowerCase()
      const params = item.outcome_params && typeof item.outcome_params === 'object'
        ? item.outcome_params
        : {}

      if (key === 'session_completed') return this.t('dashboard.drawer_status_range_complete')
      if (key === 'session_ended_early') return this.t('dashboard.drawer_status_ended_early')
      if (key === 'session_saved') return this.t('dashboard.activity_outcome_saved')
      if (key === 'session_interrupted') return this.t('dashboard.activity_interrupted')
      if (key === 'session_resumed') return this.t('dashboard.activity_outcome_resumed')
      if (key === 'ai_result') {
        const band = String(params.band || '').toLowerCase()
        let bandLabel = ''
        if (band === 'strong') bandLabel = this.t('dashboard.drawer_result_strong')
        else if (band === 'mixed') bandLabel = this.t('dashboard.drawer_result_mixed')
        else if (band === 'weak') bandLabel = this.t('dashboard.drawer_result_weak')
        const parts = []
        if (bandLabel) parts.push(bandLabel)
        if (params.accuracy != null && params.accuracy !== '') {
          const accuracy = Number(params.accuracy)
          parts.push(Number.isFinite(accuracy)
            ? `${Math.round(accuracy)}% ${this.t('dashboard.ai_recite.wording_match')}`
            : this.t('dashboard.drawer_accuracy', { n: params.accuracy }))
        }
        if (item.authority === 'ai_word_match') parts.push(this.t('dashboard.activity_word_match_not_tajweed'))
        return parts.join(' · ') || this.t('dashboard.activity_type_ai_check')
      }
      if (key === 'ai_check') return this.t('dashboard.activity_type_ai_check')
      if (key === 'note_body') return String(params.body || item.outcome || '')
      if (key === 'note_saved') return this.t('dashboard.activity_note_saved')
      if (key === 'assessment_completed') return this.t('dashboard.activity_outcome_assessment')
      if (key === 'recommendation_ready') return this.t('dashboard.activity_outcome_recommendation')
      if (key === 'ayah_memorised') return this.t('dashboard.activity_outcome_memorised')
      return item.outcome || ''
    },
    activityTypeLabel(type) {
      const key = String(type || '').toLowerCase()
      if (key === 'session' || key.startsWith('session_')) return this.t('dashboard.activity_type_session')
      if (key === 'ai_check' || key === 'ai_recite') return this.t('dashboard.activity_type_ai_check')
      if (key === 'note') return this.t('dashboard.activity_type_note')
      if (key === 'assessment') return this.t('dashboard.activity_type_assessment')
      if (key === 'recommendation') return this.t('dashboard.activity_type_recommendation')
      if (key === 'ayah_memorised') return this.t('dashboard.activity_type_memorised')
      if (key === 'assignment') return this.t('dashboard.activity_type_assignment')
      if (key === 'teacher_feedback') return this.t('dashboard.activity_type_feedback')
      if (key === 'teacher_finding') return this.t('dashboard.activity_type_finding')
      if (key === 'self_assessment') return this.t('dashboard.activity_type_reflection')
      if (key === 'milestone') return this.t('dashboard.activity_type_milestone')
      if (key === 'improvement') return this.t('dashboard.activity_type_improvement')
      return ''
    },
    activityAuthority(item) {
      if (item?.authority === 'ai_word_match') return this.t('dashboard.activity_authority_ai')
      if (item?.authority === 'teacher' && item?.verified_mistake) return this.t('dashboard.activity_authority_teacher')
      if (item?.type === 'self_assessment') return this.t('dashboard.activity_authority_student')
      return ''
    },
    ayahRangeLabel(row) {
      if (!row) return ''
      const start = Number(row.ayah_start || row.current_ayah_start || 0)
      const end = Number(row.ayah_end || row.current_ayah_end || 0)
      if (start > 0 && end > 0 && start !== end) {
        return this.t('dashboard.ayah_range', { start, end })
      }
      if (start > 0) return this.t('dashboard.ayah_n', { n: start })
      if (end > 0) return this.t('dashboard.ayah_n', { n: end })
      return ''
    },
    formatItemRange(item) {
      return this.ayahRangeLabel({
        ayah_start: item?.ayah_start,
        ayah_end: item?.ayah_end,
      })
    },
    formatRelative(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const minutes = Math.round((Date.now() - date.getTime()) / 60000)
      if (minutes < 1) return this.t('dashboard.just_now')
      if (minutes < 60) return this.t('dashboard.minutes_ago', { n: minutes })
      const hours = Math.round(minutes / 60)
      if (hours < 24) return this.t('dashboard.hours_ago', { n: hours })
      const days = Math.round(hours / 24)
      if (days === 1) return this.t('dashboard.yesterday')
      if (days < 8) return this.t('dashboard.days_ago', { n: days })
      return this.formatAbsoluteDate(date)
    },
    formatAbsoluteDate(value) {
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const locale = this.$i18n?.locale?.value || this.$i18n?.locale || undefined
      const sameYear = date.getFullYear() === new Date().getFullYear()
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
      })
    },
    formatActivityDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const days = Math.round((Date.now() - date.getTime()) / 86400000)
      if (days < 8) return this.formatRelative(value)
      return this.formatAbsoluteDate(date)
    },
    shortDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    tooltipDate(value) {
      if (!value) return ''
      const date = new Date(`${value}T12:00:00`)
      if (Number.isNaN(date.getTime())) return this.shortDate(value)
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
    },
    syncTheme() {
      if (typeof document === 'undefined') {
        this.darkTheme = false
        return
      }
      this.darkTheme = document.documentElement.getAttribute('data-theme') === 'dark'
    },
    murajaahStrengthRank(item) {
      const key = String(item?.strength || '').toLowerCase()
      if (key === 'fragile') return 0
      if (key === 'building') return 1
      if (key === 'strong') return 2
      return 3
    },
    sortMurajaahByUrgency(items) {
      const list = Array.isArray(items) ? [...items] : []
      return list.sort((a, b) => {
        const strengthDelta = this.murajaahStrengthRank(a) - this.murajaahStrengthRank(b)
        if (strengthDelta !== 0) return strengthDelta
        const historyRank = (item) => {
          const status = String(item?.history_status || '').toLowerCase()
          if (status === 'active') return 0
          if (status === 'improving') return 1
          if (status === 'resolved') return 2
          return 3
        }
        const statusDelta = historyRank(a) - historyRank(b)
        if (statusDelta !== 0) return statusDelta
        return Number(b?.history_attempts || 0) - Number(a?.history_attempts || 0)
      })
    },
    aiCheckTitle(item) {
      const name = String(item?.surah_name || '').trim()
      if (name) return name
      const surah = Number(item?.surah_number || 0)
      if (surah > 0) {
        return this.t('dashboard.surah_number_label', { n: surah }) || `Surah ${surah}`
      }
      return this.t('dashboard.ai_check_unknown_surah')
    },
    aiCheckRevisionHref(item) {
      const surah = Number(item?.surah_number || 0)
      const start = Number(item?.ayah_start || item?.ayah_end || 0)
      if (!(surah > 0 && start > 0)) return ''
      return this.reviewNowHref({
        surah_number: surah,
        ayah_number: start,
      })
    },
    reviewNowHref(item) {
      return buildReviewHref(this.memorisationUrl, {
        ...item,
        href: undefined,
        surah_number: item?.surah_number,
        ayah_number: item?.ayah_number || item?.ayah_start,
        ayah_end: item?.ayah_end || item?.ayah_number || item?.ayah_start,
      })
    },
    checkAgainHref(item) {
      return buildCheckAgainHref(this.memorisationUrl, item)
    },
    stashReviewContext(item) {
      stashPreviousAiCheck(typeof sessionStorage === 'undefined' ? null : sessionStorage, item)
    },
    madaniWordStyle(word) {
      if (!word?.fontFamily) return undefined
      return { fontFamily: word.fontFamily, fontWeight: 400 }
    },
    referenceLine(item) {
      const stored = this.revisitAyahText[item?.key] || {}
      const painted = paintReferenceWords(stored.text || '', item?.words || [], item?.ayah_number)
      return {
        words: overlayMadaniGlyphs(painted.words, stored.glyphs),
        source: stored.glyphs?.length ? 'madani' : 'unavailable',
      }
    },
    revisitStateLabel(item) {
      const state = String(item?.assessment_state || 'not_assessed')
      if (state === 'skipped') return this.t('dashboard.revisit_skipped')
      if (state === 'flagged') return this.t('dashboard.revisit_from_check')
      if (item?.evidence === 'due_revision') return this.t('dashboard.revisit_due')
      return this.t('dashboard.revisit_not_assessed')
    },
    presentationTone(score) {
      return presentationToneForScore(score)
    },
    formatPoints(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return ''
      const rounded = Math.round(n)
      return `${rounded > 0 ? '+' : ''}${rounded}`
    },
    onProgressOverviewMetric(metric) {
      this.onLearningMetric(metric)
    },
    onLearningMetric(metric) {
      if (metric?.action === 'hifz') this.openDrawer('hifz')
      if (metric?.action === 'revision') {
        this.activityArea = 'revision'
        this.activityType = 'all'
        this.activityKind = ''
        this.historyPage = 1
        this.navigateDashboardPane('activity', { history: 'push', focus: true })
        this.syncActivityFiltersInHistory()
      }
      if (metric?.action === 'recitation') {
        this.activityKind = 'recitation'
        this.activityType = 'all'
        this.activityArea = 'all'
        this.historyPage = 1
        this.navigateDashboardPane('activity', { history: 'push', focus: true })
        this.syncActivityFiltersInHistory()
      }
      if (metric?.action === 'ai') {
        this.$el?.querySelector('#ai-recite-results')?.scrollIntoView?.({ block: 'start' })
      }
    },
    applyActivityFiltersFromLocation(search = window.location?.search) {
      const parsed = activityFiltersFromSearch(search)
      this.activityType = parsed.type
      this.activityArea = parsed.area
      this.activityStatus = parsed.status
      this.activityFrom = parsed.from
      this.activityTo = parsed.to
      this.activityKind = parsed.kind
      this.historyPage = parsed.page
    },
    syncActivityFiltersInHistory() {
      if (typeof window === 'undefined' || !window.history || this.studentPane !== 'activity') return
      const nextUrl = syncActivityFiltersUrl(window.location, {
        type: this.activityType,
        area: this.activityArea,
        status: this.activityStatus,
        from: this.activityFrom,
        to: this.activityTo,
        kind: this.activityKind,
        page: this.historyPage,
      })
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` === nextUrl) return
      window.history.replaceState(window.history.state, '', nextUrl)
    },
    activityHistoryScrollTop() {
      if (typeof window === 'undefined') return
      const top = document.getElementById('dash-activity')?.getBoundingClientRect?.().top
      if (!Number.isFinite(top)) return
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 12), left: 0, behavior: 'smooth' })
    },
    goHistoryPage(page) {
      const next = Math.max(1, Number(page) || 1)
      if (next === this.historyPage) return
      if (next < this.historyPage || this.historyHasMore || next === 1) {
        this.historyPage = next
        this.loadLearningHistory()
        this.syncActivityFiltersInHistory()
        this.$nextTick(() => this.activityHistoryScrollTop())
      }
    },
    setActivityType(key) {
      this.activityType = key || 'all'
      this.activityKind = ''
      this.historyPage = 1
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    setActivityArea(key) {
      this.activityArea = key || 'all'
      this.activityKind = ''
      this.historyPage = 1
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    setActivityStatus(key) {
      this.activityStatus = key || 'all'
      this.historyPage = 1
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    setActivityFrom(value) {
      this.activityFrom = String(value || '')
      this.historyPage = 1
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    setActivityTo(value) {
      this.activityTo = String(value || '')
      this.historyPage = 1
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    clearActivityKind() {
      this.activityKind = ''
      this.historyPage = 1
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    clearActivityFilters() {
      this.activityType = 'all'
      this.activityArea = 'all'
      this.activityStatus = 'all'
      this.activityFrom = ''
      this.activityTo = ''
      this.activityKind = ''
      this.historyPage = 1
      this.activityFiltersOpen = false
      this.syncActivityFiltersInHistory()
      this.loadLearningHistory()
    },
    historyListKey(item) {
      return String(item?.id || `${item?.type || 'item'}-${item?.occurred_at || ''}`)
    },
    historyFallbackContext(item) {
      const title = this.historyTitle(item)
      const kind = this.historyKindLabel(item)
      if (title && title !== kind) return ''
      const context = this.activityTitle(item)
      if (context && context !== kind) return context
      const activityLabel = this.historyActivityLabel(item)
      if (activityLabel) return activityLabel
      if (item?.occurred_at) return this.formatActivityDate(item.occurred_at)
      return ''
    },
    historyRowToneClass(item) {
      const type = String(item?.type || '').toLowerCase()
      if (type === 'ai_check' || type === 'ai_recite') return 'student-activity__row--ai'
      if (type === 'teacher_feedback' || type === 'teacher_finding') return 'student-activity__row--teacher'
      return 'student-activity__row--practice'
    },
    historyMarkClass(item) {
      const kind = String(item?.practice_kind || 'session')
      const type = String(item?.type || '').toLowerCase()
      const extra = type === 'ai_check' || type === 'ai_recite'
        ? 'student-activity__mark--ai'
        : (type === 'teacher_feedback' || type === 'teacher_finding'
          ? 'student-activity__mark--teacher'
          : 'student-activity__mark--practice')
      return [`is-${kind}`, extra]
    },
    historyRecordingBadge(item) {
      const type = String(item?.type || '').toLowerCase()
      if (type !== 'ai_check' && type !== 'ai_recite') return null
      if (item?.recording_available === true) {
        return { label: this.t('dashboard.activity_recording_kept'), class: 'teacher-badge--good' }
      }
      if (item?.recording_available === false) {
        return { label: this.t('teacher.reviews_recording_none'), class: 'teacher-badge--muted' }
      }
      return null
    },
    historyDetailExpandable(item) {
      const detail = String(this.historyDetail(item) || '')
      return detail.length > 120
    },
    toggleHistoryDetail(item) {
      const key = this.historyListKey(item)
      this.historyDetailExpandedId = this.historyDetailExpandedId === key ? '' : key
    },
    historyEntryHref(item) {
      const type = String(item?.type || '').toLowerCase()
      if (['assignment', 'milestone', 'teacher_feedback', 'teacher_finding', 'improvement'].includes(type)) {
        return ''
      }
      const surah = Number(item?.surah_number || 0)
      const from = Number(item?.ayah_start || item?.ayah_number || 0)
      const to = Number(item?.ayah_end || from || 0)
      const base = String(this.memorisationUrl || '/memorisation').split('?')[0]
      if (surah > 0 && from > 0) {
        const params = new URLSearchParams({
          surah: String(surah),
          from: String(from),
          to: String(Math.max(from, to)),
          return: 'dashboard',
          return_tab: 'activity',
        })
        const kind = String(item?.practice_kind || '')
        if (kind === 'revision') params.set('goal', 'revise')
        if (kind === 'recitation') params.set('ai_check', '1')
        return `${base}?${params.toString()}`
      }
      const raw = String(item?.href || '').trim()
      if (!raw) return ''
      try {
        const url = new URL(raw, 'http://localhost')
        if (!(Number(url.searchParams.get('surah') || 0) > 0)) return ''
        url.searchParams.set('return', 'dashboard')
        url.searchParams.set('return_tab', 'activity')
        return `${url.pathname}${url.search}`
      } catch (_) {
        return ''
      }
    },
    historyActivityLabel(item) {
      const activity = String(item?.outcome_params?.activity || '').toLowerCase()
      const keys = {
        hifz: 'dashboard.activity_area_hifz',
        revision: 'dashboard.activity_area_revision',
        nazra: 'dashboard.activity_area_nazra',
        tajweed: 'dashboard.activity_area_tajweed',
        recite: 'dashboard.student_type_recitation',
        ai_recite: 'dashboard.student_type_recitation',
        recitation: 'dashboard.student_type_recitation',
        memorisation: 'dashboard.activity_area_hifz',
        new: 'dashboard.activity_area_hifz',
      }
      const key = keys[activity]
      if (!key) return ''
      const label = this.t(key)
      return label && label !== key ? label : ''
    },
    historyKindLabel(item) {
      const type = String(item?.type || '').toLowerCase()
      if (type === 'ai_check' || type === 'ai_recite') return this.t('dashboard.history_ai_wording_check')
      if (type === 'ayah_memorised') return this.t('dashboard.history_memorisation_recorded')
      if (type === 'assignment' || type === 'milestone') {
        const activityLabel = this.historyActivityLabel(item)
        if (activityLabel) return activityLabel
      }
      if (type === 'teacher_feedback') return this.t('dashboard.activity_type_feedback')
      if (type === 'teacher_finding') return this.t('dashboard.activity_type_finding')
      if (type === 'self_assessment') return this.t('dashboard.activity_type_reflection')
      if (type && type !== 'session' && !type.startsWith('session_')) {
        const label = this.activityTypeLabel(type)
        if (label) return label
      }
      const practiceLabel = this.historyActivityLabel(item)
      if (practiceLabel) return practiceLabel
      const kind = String(item?.practice_kind || '')
      if (kind === 'memorisation') return this.t('dashboard.history_memorisation_practice')
      if (kind === 'revision') return this.t('dashboard.history_filter_revision')
      if (kind === 'recitation') return this.t('dashboard.history_filter_recitation')
      if (kind === 'note') return this.t('dashboard.activity_type_note')
      return this.t('dashboard.history_unspecified')
    },
    historyDetail(item) {
      const type = String(item?.type || '').toLowerCase()
      const params = item?.outcome_params && typeof item.outcome_params === 'object' ? item.outcome_params : {}
      if ((type === 'ai_check' || type === 'ai_recite' || item?.authority === 'ai_word_match') && params.accuracy != null && params.accuracy !== '') {
        const accuracy = Number(params.accuracy)
        if (Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100) {
          return `${Math.round(accuracy)}% ${this.t('dashboard.ai_recite.wording_match')}`
        }
      }
      if (type === 'session' || type.startsWith('session_')) return this.activityOutcome(item)
      if (type === 'assignment' || type === 'milestone') {
        const count = Number(params.submissions || 0)
        if (count === 1) return this.t('teacher.learner_submission_count_one', { n: 1 })
        if (count > 1) return this.t('teacher.learner_submission_count_other', { n: count })
      }
      if (type === 'self_assessment') {
        const feeling = String(params.feeling || '')
        const feelingKey = feeling ? `dashboard.assignment_self_assessment_${feeling}` : ''
        const feelingLabel = feelingKey ? this.t(feelingKey) : ''
        const help = String(params.help || '').trim()
        const knownFeeling = feelingLabel && feelingLabel !== feelingKey ? feelingLabel : ''
        return [knownFeeling, help].filter(Boolean).join(' · ')
      }
      if (type === 'teacher_feedback') return String(params.body || '').trim()
      if (type === 'teacher_finding') {
        const focus = String(params.focus || '')
        const finding = String(params.finding || '')
        const focusKey = focus ? `teacher.focus_${focus}` : ''
        const findingKey = finding ? `teacher.finding_${finding}` : ''
        const focusLabel = focusKey ? this.t(focusKey) : ''
        const findingLabel = findingKey ? this.t(findingKey) : ''
        const detail = [
          findingLabel && findingLabel !== findingKey ? findingLabel : '',
          focusLabel && focusLabel !== focusKey ? focusLabel : '',
        ].filter(Boolean).join(' · ')
        if (detail) return detail
        if (item?.verified_mistake) return this.activityAuthority(item)
      }
      return ''
    },
    historyKindIcon(item) {
      const type = String(item?.type || '').toLowerCase()
      if (type === 'ai_check' || type === 'ai_recite') return 'bi bi-stars'
      if (type === 'teacher_feedback' || type === 'teacher_finding') return 'bi bi-chat-left-text'
      if (type === 'assignment' || type === 'milestone') return 'bi bi-clipboard-check'
      const kind = String(item?.practice_kind || '')
      if (kind === 'revision') return 'bi bi-arrow-repeat'
      if (kind === 'recitation') return 'bi bi-mic'
      if (kind === 'note') return 'bi bi-pencil'
      return 'bi bi-journal-bookmark'
    },
    historyTitle(item) {
      const surah = String(item?.surah_name || '').trim()
      const range = this.formatItemRange(item)
      if (surah && range) return `${surah} · ${range}`
      if (surah) return surah
      if (range && /^\d/.test(range)) return this.t('dashboard.history_ayahs', { range })
      if (range) return range
      return this.activityTitle(item)
    },
    historyActionHint(item) {
      if (!this.historyEntryHref(item)) return ''
      const kind = String(item?.practice_kind || '')
      if (kind === 'revision') return this.t('dashboard.history_open_revision')
      if (kind === 'recitation') return this.t('dashboard.history_open_recitation')
      if (kind === 'memorisation') return this.t('dashboard.history_open_memorisation')
      return this.t('dashboard.history_open_session')
    },
    formatHistoryClock(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const locale = this.$i18n?.locale?.value || this.$i18n?.locale || undefined
      return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    },
    feedbackPracticeHref(item) {
      return revisionHrefFromFeedback(this.memorisationUrl, item)
    },
    focusReviewHref(item) {
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah || item?.ayah_number || 0)
      if (!(surah > 0 && ayah > 0)) return ''
      return practiceRevisionHref(this.memorisationUrl, {
        surah_number: surah,
        ayah_start: ayah,
        ayah_end: ayah,
      })
    },
    focusToneLabel(item) {
      const tone = String(item?.tone || this.aiAttemptTone(item) || '').toLowerCase()
      if (tone === 'weak') return this.t('dashboard.ai_band_weak')
      if (tone === 'mixed') return this.t('dashboard.ai_band_mixed')
      if (tone === 'strong') return this.t('dashboard.ai_band_strong')
      return ''
    },
    flaggedWordLabel(count) {
      const n = Number(count || 0)
      if (n === 1) return this.t('dashboard.ai_flagged_words_one')
      return this.t('dashboard.ai_flagged_words', { n })
    },
    revisitWhy(item) {
      const hint = this.murajaahItemHint(item)
      const generic = this.t('dashboard.murajaah_hint_default')
      if (hint && hint !== generic) return hint
      const state = String(item?.assessment_state || '')
      if (state === 'flagged') return this.t('dashboard.revisit_why_flagged')
      if (state === 'skipped') return this.t('dashboard.revisit_why_skipped')
      if (item?.evidence === 'due_revision') return this.t('dashboard.revisit_why_due')
      return this.t('dashboard.revisit_why_default')
    },
    historyContextPills(item) {
      const pills = []
      const type = String(item?.type || '').toLowerCase()
      if (type === 'ai_check' || type === 'ai_recite') {
        if (item?.teacher_review_status === 'pending') {
          pills.push({
            key: 'teacher-pending',
            label: this.t('dashboard.activity_teacher_pending'),
            class: 'student-activity__pill--teacher',
          })
        }
        if (item?.teacher_review_status === 'reviewed') {
          pills.push({
            key: 'teacher-reviewed',
            label: this.t('dashboard.activity_teacher_reviewed'),
            class: 'student-activity__pill--teacher',
          })
        }
      }
      const teacher = String(item?.teacher_name || '').trim()
      if (teacher && (type === 'teacher_feedback' || type === 'teacher_finding')) {
        pills.push({ key: `teacher-${teacher}`, label: teacher, class: 'student-activity__pill--teacher' })
      }
      return pills
    },
    historyAssignmentTarget(item) {
      const type = String(item?.type || '').toLowerCase()
      if (!['assignment', 'milestone', 'teacher_feedback', 'teacher_finding', 'improvement'].includes(type)) {
        return 0
      }
      return Number(item?.recipient_id || item?.assignment_id || 0)
    },
    openActivityAssignment(item) {
      const id = this.historyAssignmentTarget(item)
      if (id > 0) this.openProgressAssignment(id)
    },
    async loadLearningHistory(options = {}) {
      const append = options?.append === true
      const requestId = ++this.historyRequest
      if (append) this.historyLoadingMore = true
      else {
        this.historyLoading = true
        this.historyExpanded = false
      }
      this.historyError = false
      try {
        const offset = append
          ? (this.historyNextOffset || 0)
          : Math.max(0, (Math.max(1, Number(this.historyPage) || 1) - 1) * this.historyPageSize)
        const page = await learningApi.getActivityLog(this.historyPageSize, {
          paged: true,
          offset,
          type: this.activityType !== 'all' ? this.activityType : undefined,
          area: this.activityArea !== 'all' ? this.activityArea : undefined,
          status: this.activityStatus !== 'all' ? this.activityStatus : undefined,
          kind: this.activityKind || undefined,
          from: this.activityFrom || undefined,
          to: this.activityTo || undefined,
        })
        if (requestId !== this.historyRequest) return
        const items = Array.isArray(page?.items) ? page.items : []
        this.historyItems = [...new Map([...(append ? this.historyItems : []), ...items].map(item => [item.id, item])).values()]
        this.historyPageHasMore = page?.has_more === true
        this.historyNextOffset = page?.next_offset ?? null
        if (append) this.historyExpanded = true
        if (this.studentPane === 'activity') this.syncActivityFiltersInHistory()
      } catch (error) {
        console.error('Learning history fetch failed', error)
        if (requestId === this.historyRequest) this.historyError = true
      } finally {
        if (requestId === this.historyRequest) {
          this.historyLoading = false
          this.historyLoadingMore = false
        }
      }
    },
    async hydrateRevisitAyahs() {
      const items = this.revisitItems
      await Promise.all(items.map(async (item) => {
        const key = item.key
        if (!key || this.revisitAyahText[key]?.glyphs) return
        try {
          const [ayah, glyphs] = await Promise.all([
            loadAyah(item.surah_number, item.ayah_number).catch(() => null),
            loadTeacherMadaniAyah(item.surah_number, item.ayah_number).catch(() => []),
          ])
          this.revisitAyahText = {
            ...this.revisitAyahText,
            [key]: {
              text: ayah?.text || '',
              glyphs,
              source: glyphs.length ? 'madani' : 'unavailable',
            },
          }
        } catch (_) {
          this.revisitAyahText = { ...this.revisitAyahText, [key]: { text: '', glyphs: [], source: 'unavailable' } }
        }
      }))
    },
    attemptReviewItem(item) {
      const detail = this.expandedAttemptId === item?.id ? this.expandedComparison : null
      const words = []
      ;(detail?.ayahs || []).forEach((ayah) => {
        ;(ayah.stored || []).forEach((word) => {
          words.push({ ...word, ayah: ayah.number })
        })
      })
      return {
        ...item,
        ayah_number: item.ayah_start,
        words,
        attempt_id: item.id,
      }
    },
    aiCheckedLabel(item) {
      if (!item?.occurred_at) return ''
      const when = this.formatActivityDate(item.occurred_at)
      if (!when) return ''
      return this.t('dashboard.ai_recite.checked_at', { when })
    },
    async toggleAttemptDetail(item, force = false) {
      if (!force && this.expandedAttemptId === item.id) {
        this.expandedAttemptId = null
        this.expandedComparison = null
        return
      }
      this.expandedAttemptId = item.id
      this.expandedError = false

      const cached = !force ? this.expandedDetailCache[item.id] : null
      if (cached) {
        this.expandedComparison = cached
        this.expandedLoading = false
        return
      }

      this.expandedLoading = true
      this.expandedComparison = null
      try {
        const payload = await learningApi.getAiReciteAttemptAnalysis(item.id)
        const attempt = payload?.ai_attempt || {}
        const words = Array.isArray(attempt.word_statuses) ? attempt.word_statuses : []
        const built = await buildAttemptAyahFeedback({
          surahNumber: item.surah_number,
          ayahStart: item.ayah_start,
          ayahEnd: item.ayah_end,
          wordStatuses: words,
          loadAyahText: loadAyah,
          maxAyahs: 6,
        })
        const previous = (this.aiReciteView?.recent || []).find((other) => (
          other.id !== item.id
          && other.surah_number === item.surah_number
          && other.ayah_start === item.ayah_start
          && other.ayah_end === item.ayah_end
        ))
        const delta = compatibleAttemptDelta(item, previous)
        const counts = resolveWordCounts({
          ...item,
          word_counts: attempt.word_counts || item.word_counts,
          color_counts: attempt.color_counts || item.color_counts,
          has_word_alignment: words.length > 0,
        }) || resolveWordCounts(item)
        const insightKey = feedbackInsightKey(counts, { incomplete: built.incomplete })
        const detail = {
          ayahs: built.ayahs,
          incomplete: built.incomplete,
          counts,
          insightKey: `dashboard.ai_recite.${insightKey}`,
          delta,
          samePassageWithoutModel: !delta && !!previous,
          recurring: [],
        }
        this.expandedDetailCache = {
          ...this.expandedDetailCache,
          [item.id]: detail,
        }
        this.expandedComparison = detail
      } catch (error) {
        console.error('AI check detail failed', error)
        this.expandedError = true
      } finally {
        this.expandedLoading = false
      }
    },
    strengthLabel(item) {
      const key = String(item?.strength || '').toLowerCase()
      if (key === 'fragile') return this.t('dashboard.strength_fragile')
      if (key === 'building') return this.t('dashboard.strength_building')
      if (key === 'strong') return this.t('dashboard.strength_strong')
      return item?.strength_label || ''
    },
    weakHistoryStatusLabel(item) {
      const status = String(item?.history_status || '').toLowerCase()
      if (status === 'improving') return this.t('dashboard.weak_history_status_improving')
      if (status === 'resolved') return this.t('dashboard.weak_history_status_resolved')
      if (status === 'active') return this.t('dashboard.weak_history_status_active')
      return ''
    },
    murajaahItemHint(item) {
      if (!item) return ''
      const key = String(item.explanation_key || '').trim()
      if (key === 'weak_explain_phrase' && item.phrase) {
        return this.t('dashboard.murajaah_hint_phrase')
      }
      if (key === 'weak_explain_ai') return this.t('dashboard.murajaah_hint_ai')
      if (key === 'weak_explain_plan') return this.t('dashboard.murajaah_hint_plan')
      if (key === 'weak_explain_history') return this.t('dashboard.murajaah_hint_history')
      const strength = String(item.strength || '').toLowerCase()
      if (strength === 'fragile') return this.t('dashboard.murajaah_hint_fragile')
      if (strength === 'building') return this.t('dashboard.murajaah_hint_building')
      if (strength === 'strong') return this.t('dashboard.murajaah_hint_strong')
      return this.t('dashboard.murajaah_hint_default')
    },
    weakHistoryLine(item) {
      if (!item) return ''
      const attempts = Number(item.history_attempts || 0)
      const parts = []
      if (attempts === 1) {
        parts.push(this.t('dashboard.weak_history_attempts_one', { n: 1 }))
      } else if (attempts > 1) {
        parts.push(this.t('dashboard.weak_history_attempts', { n: attempts }))
      }
      const status = this.weakHistoryStatusLabel(item)
      if (status && String(item.history_status || '') !== 'active') {
        parts.push(status)
      }
      const when = this.formatActivityDate(item.last_identified_at || item.detected_at)
      if (when && attempts > 0) {
        parts.push(this.t('dashboard.weak_history_last', { when }))
      }
      return parts.filter(Boolean).join(' · ')
    },
    completionBar(label, value) {
      const display = progressBarDisplay(value)
      return {
        label,
        value: display.percent,
        fillWidth: display.fillWidth,
        hasProgress: display.hasProgress,
      }
    },
    sessionStatusLabel(status) {
      if (status === 'ended_early') return this.t('dashboard.drawer_status_ended_early')
      if (status === 'completed') return this.t('dashboard.drawer_status_range_complete')
      return this.t('dashboard.drawer_status_completed')
    },
    aiBandLabel(band) {
      const key = String(band || '').toLowerCase()
      if (key === 'strong') return this.t('dashboard.drawer_result_strong')
      if (key === 'mixed') return this.t('dashboard.drawer_result_mixed')
      if (key === 'weak') return this.t('dashboard.drawer_result_weak')
      return key ? key.charAt(0).toUpperCase() + key.slice(1) : ''
    },
    async loadAiReciteResults() {
      const requestId = ++this.aiReciteRequestId
      this.aiReciteLoading = true
      this.aiReciteError = false
      try {
        const stats = await learningApi.getDashboardAiReciteStats()
        if (requestId !== this.aiReciteRequestId) return
        this.aiReciteStats = await this.hydrateAiRecitePreviewGlyphs(stats)
        if (requestId !== this.aiReciteRequestId) return
        this.scrollToAiReciteResults()
      } catch (error) {
        console.error('AI Recite results fetch failed', error)
        if (requestId !== this.aiReciteRequestId) return
        this.aiReciteError = true
      } finally {
        if (requestId === this.aiReciteRequestId) this.aiReciteLoading = false
      }
    },
    async hydrateAiRecitePreviewGlyphs(stats) {
      // Dashboard previews must stay on shaped Unicode Arabic — never QCF page
      // glyphs. Presentation-form fonts break joining in list rows.
      if (!stats || !Array.isArray(stats.recent_attempts)) return stats
      const recentAttempts = stats.recent_attempts.map((item) => {
        const weakWords = Array.isArray(item?.weak_words) ? item.weak_words : []
        const ayah = Number(
          weakWords[0]?.ayahNumber
          ?? weakWords[0]?.ayah_number
          ?? item?.ayah_start
          ?? 0,
        )
        const parts = weakWords
          .filter((word) => Number(word?.ayahNumber ?? word?.ayah_number ?? ayah) === ayah)
          .map((word) => {
            const text = String(word?.text || word?.word || word?.target_word || '').trim()
            return text
              ? {
                text,
                plainText: text,
                tone: 'incorrect',
                weak: true,
                madaniGlyph: false,
                fontFamily: '',
              }
              : null
          })
          .filter(Boolean)
          .slice(0, 4)
        return { ...item, madani_preview: parts }
      })
      return { ...stats, recent_attempts: recentAttempts }
    },
    madaniPartStyle() {
      return {
        fontFamily: 'var(--dash-font-ar, "Noto Naskh Arabic", "Amiri", "Geeza Pro", serif)',
        letterSpacing: '0',
      }
    },
    scrollToAiReciteResults(options = {}) {
      if (typeof window === 'undefined' || window.location.hash !== '#ai-recite-results') return
      this.navigateDashboardPane('progress', {
        history: options.fromHistory ? 'none' : 'replace',
        restoreScroll: false,
        clearContextHash: false,
      })
      this.$nextTick(() => {
        const el = this.$refs.aiReciteResults
        if (!el || typeof el.scrollIntoView !== 'function') return
        el.scrollIntoView({
          behavior: this.reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      })
    },
    aiAttemptAccuracy(item) {
      if (item?.feedback?.valid === false) return '—'
      const stored = item?.feedback?.wording?.percent
      const accuracy = stored == null ? Number(item?.accuracy_percent) : Number(stored)
      if (!Number.isFinite(accuracy) || accuracy < 0) return '—'
      return this.t('dashboard.drawer_accuracy', { n: accuracy })
    },
    aiAttemptScoreShort(item) {
      if (item?.feedback?.valid === false) return '—'
      const stored = item?.feedback?.wording?.percent
      const accuracy = stored == null ? Number(item?.accuracy_percent) : Number(stored)
      if (!Number.isFinite(accuracy) || accuracy < 0) return '—'
      return `${Math.round(accuracy)}%`
    },
    aiAttemptTone(item) {
      const band = String(item?.band || '').toLowerCase()
      if (['strong', 'mixed', 'weak'].includes(band)) return band
      const accuracy = Number(item?.accuracy_percent)
      if (!Number.isFinite(accuracy)) return 'neutral'
      return recitationAccuracyBand(accuracy)
    },
    aiAttemptActionLabel(item) {
      const parts = [
        this.aiCheckTitle(item),
        this.ayahRangeLabel(item),
        this.aiAttemptAccuracy(item),
        this.formatActivityDate(item.occurred_at),
        this.t('dashboard.ai_recite.results_open'),
      ].filter(Boolean)
      return parts.join(', ')
    },
    aiResultLabel(item) {
      const band = String(item?.band || '').toLowerCase()
      let bandLabel = ''
      if (band === 'strong') bandLabel = this.t('dashboard.drawer_result_strong')
      else if (band === 'mixed') bandLabel = this.t('dashboard.drawer_result_mixed')
      else if (band === 'weak') bandLabel = this.t('dashboard.drawer_result_weak')
      else bandLabel = band ? band.charAt(0).toUpperCase() + band.slice(1) : ''

      const accuracy = Number(item?.accuracy_percent)
      if (Number.isFinite(accuracy) && accuracy >= 0) {
        const pct = this.t('dashboard.drawer_accuracy', { n: accuracy })
        return bandLabel ? `${bandLabel} · ${pct}` : pct
      }
      return bandLabel || '—'
    },
    noteHeading(item) {
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah_number || 0)
      const ref = surah > 0 && ayah > 0 ? `${surah}:${ayah}` : ''
      const title = String(item?.title || '').trim()
      if (title && ref) return `${ref} · ${title}`
      if (title) return title
      return ref || this.t('dashboard.metric_notes')
    },
    noteSnippet(item) {
      const body = String(item?.body || '').replace(/\s+/g, ' ').trim()
      if (!body) return ''
      return body.length > 96 ? `${body.slice(0, 96)}…` : body
    },
    onMetricActivate(event, metric) {
      if (metric?.href) return
      event?.preventDefault?.()
      if (metric?.drawer) this.openDrawer(metric.drawer)
    },
    onAnalyticActivate(item) {
      if (!item?.drawer) return
      this.openDrawer(item.drawer)
      if (item.filter) {
        this.activityFilter = item.filter
      }
    },
    async openDrawer(mode) {
      if (!mode || mode === 'notes') return
      if (!this.drawerOpen) this.drawerReturnFocus = captureReturnFocus()
      this.drawerMode = mode
      this.drawerItems = []
      this.drawerError = false
      this.activityFilter = 'all'
      this.drawerAiSearch = ''
      this.drawerAiBandFilter = 'all'
      this.syncDrawerBodyLock(true)
      this.$nextTick(() => {
        this.$refs.drawerClose?.focus?.({ preventScroll: true })
      })

      if (mode === 'murajaah') {
        this.drawerItems = this.dailyWeakAllItems
        this.drawerLoading = false
        this.drawerError = false
        return
      }

      if (mode === 'due') {
        this.drawerItems = this.dailyDueAllItems
        this.drawerLoading = false
        this.drawerError = false
        return
      }

      this.drawerLoading = true
      const requestId = ++this.drawerRequestId
      try {
        let items = []
        if (mode === 'achievements') {
          const payload = await learningApi.getAchievements()
          if (requestId !== this.drawerRequestId) return
          this.achievementDrawerItems = Array.isArray(payload?.items) ? payload.items : []
          this.achievementDrawerTiers = Array.isArray(payload?.tiers) ? payload.tiers : []
          this.achievementDrawerNext = payload?.next || null
          const summary = payload?.summary
          const drawerItems = Array.isArray(payload?.items) ? payload.items : []
          this.achievementDrawerUnlockedCount = Number(
            summary?.unlocked_count ?? drawerItems.filter((item) => item?.state === 'unlocked').length,
          )
          this.achievementDrawerTotalCount = Number(summary?.total_count ?? drawerItems.length)
          this.achievementDrawerActiveTier = String(payload?.next?.tier || payload?.active_tier || this.achievementsWidget?.active_tier || 'beginner')
          this.enqueueAchievementUnlocks(payload?.pending_unlocks)
          trackProductEvent(PRODUCT_EVENTS.ACHIEVEMENT_VIEWED, {
            unlock_source: 'dashboard_drawer',
          }, { onceKey: 'achievement_viewed:drawer' })
          trackProductEvent(PRODUCT_EVENTS.ACHIEVEMENT_PROGRESS_VIEWED, {
            unlock_source: 'dashboard_drawer',
          }, { onceKey: 'achievement_progress_viewed:drawer' })
          this.drawerItems = this.achievementDrawerItems
        } else if (mode === 'activity') {
          items = await learningApi.getActivityLog()
        } else if (mode === 'sessions') {
          items = await learningApi.getSessionHistory()
        } else if (mode === 'ai_checks') {
          items = await learningApi.getAiReciteAttempts()
        } else if (mode === 'hifz') {
          const progress = await learningApi.getProgress({ limit: 1000 })
          items = this.groupHifzProgress(progress)
        }
        if (requestId !== this.drawerRequestId) return
        if (mode !== 'achievements') {
          this.drawerItems = Array.isArray(items) ? items : []
        }
      } catch (error) {
        console.error('Dashboard drawer fetch failed', error)
        if (requestId !== this.drawerRequestId) return
        this.drawerError = true
        this.drawerItems = []
      } finally {
        if (requestId === this.drawerRequestId) this.drawerLoading = false
      }
    },
    closeDrawer({ restoreFocus = true } = {}) {
      this.drawerRequestId += 1
      const returnFocus = this.drawerReturnFocus
      this.drawerReturnFocus = null
      this.drawerMode = null
      this.drawerItems = []
      this.drawerLoading = false
      this.drawerError = false
      this.activityFilter = 'all'
      this.drawerAiSearch = ''
      this.drawerAiBandFilter = 'all'
      this.syncDrawerBodyLock(false)
      if (restoreFocus) {
        this.$nextTick(() => restoreReturnFocus(returnFocus))
      }
    },
    onDrawerKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.drawer,
        onEscape: () => this.closeDrawer(),
        open: this.drawerOpen,
      })
    },
    retryDrawer() {
      if (!this.drawerMode) return
      this.openDrawer(this.drawerMode)
    },
    analysisTargetForItem(item, fallbackKind = '') {
      const kind = String(item?.analysis_kind || fallbackKind || '').toLowerCase()
      const sourceId = Number(item?.source_id || 0)
      const rowId = Number(item?.id || 0)
      if (kind === 'attempt') {
        return { kind: 'attempt', id: sourceId > 0 ? sourceId : rowId }
      }
      if (kind === 'session') {
        return { kind: 'session', id: sourceId > 0 ? sourceId : rowId }
      }
      const type = String(item?.type || '').toLowerCase()
      if (type === 'ai_check' || type === 'ai_recite') {
        return { kind: 'attempt', id: sourceId > 0 ? sourceId : rowId }
      }
      if (type === 'session' || type.startsWith('session_')) {
        return { kind: 'session', id: sourceId > 0 ? sourceId : rowId }
      }
      if (fallbackKind === 'attempt' || fallbackKind === 'session') {
        return { kind: fallbackKind, id: sourceId > 0 ? sourceId : rowId }
      }
      return null
    },
    canViewAnalysis(item, fallbackKind = '') {
      const target = this.analysisTargetForItem(item, fallbackKind)
      if (!target?.id) return false
      if (target.kind === 'attempt') return item?.has_analysis !== false
      return item?.has_analysis === true
    },
    analysisItemKey(item, fallbackKind = '') {
      const target = this.analysisTargetForItem(item, fallbackKind)
      if (!target?.id) return ''
      return `${target.kind}:${target.id}`
    },
    isAnalysisLoading(item, fallbackKind = '') {
      return this.analysisLoading && this.analysisSourceKey === this.analysisItemKey(item, fallbackKind)
    },
    openAnalysisForItem(item, fallbackKind = '') {
      const target = this.analysisTargetForItem(item, fallbackKind)
      if (!target?.id) return
      this.openSessionAnalysis(target.kind, { id: target.id })
    },
    sessionAnalysisKey(item) {
      return this.analysisItemKey(item, 'session')
    },
    attemptAnalysisKey(item) {
      return this.analysisItemKey(item, 'attempt')
    },
    openSessionAnalysis(kind, item) {
      const id = Number(item?.id || item?.source_id || 0)
      if (id <= 0) return
      this.analysisSourceKind = kind === 'attempt' ? 'attempt' : 'session'
      this.analysisSourceId = id
      this.analysisSourceKey = this.analysisSourceKind === 'attempt'
        ? this.attemptAnalysisKey(item)
        : this.sessionAnalysisKey(item)
      this.analysisView = null
      if (this.drawerOpen) this.closeDrawer({ restoreFocus: false })
      this.analysisError = false
      this.analysisLoading = true
      this.analysisModalOpen = true
      this.fetchSessionAnalysis()
    },
    openBasicAnalytics() {
      this.basicAnalyticsOpen = true
    },
    closeBasicAnalytics() {
      this.basicAnalyticsOpen = false
    },
    openAdvancedAnalytics() {
      if (!this.canUseAdvancedAnalytics) return
      this.advancedAnalyticsOpen = true
    },
    closeAdvancedAnalytics() {
      this.advancedAnalyticsOpen = false
    },
    closeSessionAnalysis() {
      this.analysisRequestId += 1
      this.analysisModalOpen = false
      this.analysisLoading = false
      this.analysisError = false
      this.analysisView = null
      this.analysisSourceKind = null
      this.analysisSourceId = null
      this.analysisSourceKey = ''
    },
    retrySessionAnalysis() {
      if (!this.analysisSourceId || !this.analysisSourceKind) return
      this.analysisError = false
      this.analysisView = null
      this.analysisLoading = true
      this.fetchSessionAnalysis()
    },
    async fetchSessionAnalysis() {
      const kind = this.analysisSourceKind
      const id = Number(this.analysisSourceId || 0)
      if (!kind || id <= 0) return
      const requestId = ++this.analysisRequestId
      this.analysisLoading = true
      this.analysisError = false
      this.analysisView = null
      try {
        const payload = kind === 'attempt'
          ? await learningApi.getAiReciteAttemptAnalysis(id)
          : await learningApi.getSessionAnalysis(id)
        if (requestId !== this.analysisRequestId) return
        if (kind === 'attempt') {
          const session = payload?.session || {}
          const view = buildWorkspaceAiReciteResultView({
            submitData: payload,
            assessment: payload?.assessment,
            aiAttempt: payload?.ai_attempt,
            audioUrl: payload?.audio?.url || '',
            surahNumber: Number(session.surah_number || payload?.assessment?.surah_number || 0),
            surahName: session.surah_name || payload?.assessment?.surah_name || '',
            rangeStart: Number(session.ayah_start || payload?.assessment?.start_ayah || 0),
            rangeEnd: Number(session.ayah_end || payload?.assessment?.end_ayah || 0),
          }, this.t.bind(this))
          // Readable Unicode first; Madani metadata may enrich without blanking.
          this.analysisView = withStrictMadaniResultGlyphs(view)
          const painted = await this.hydrateSavedReciteMadaniGlyphs(view)
          if (requestId !== this.analysisRequestId) return
          this.analysisView = painted
        } else {
          this.analysisView = buildSessionAnalysisView(payload, this.t.bind(this), { includeRecommendations: false })
        }
        this.analysisError = false
      } catch (error) {
        console.error('Session analysis fetch failed', error)
        if (requestId !== this.analysisRequestId) return
        this.analysisError = true
        this.analysisView = null
      } finally {
        if (requestId === this.analysisRequestId) this.analysisLoading = false
      }
    },
    async hydrateSavedReciteMadaniGlyphs(view) {
      const rows = Array.isArray(view?.focusAyahRows) ? view.focusAyahRows : []
      const weakItems = Array.isArray(view?.infoArchitecture?.weakAreas?.items)
        ? view.infoArchitecture.weakAreas.items
        : []
      const chapter = Number(view?.surahNumber || 0)
      const ayahs = [...new Set(
        [...rows, ...weakItems].map((row) => Number(row?.ayah)).filter((n) => n > 0),
      )]
      const byAyah = {}
      await Promise.all((chapter ? ayahs : []).map(async (ayah) => {
        try {
          const glyphs = await loadMadaniAyahGlyphs(chapter, ayah)
          if (glyphs?.length) byAyah[ayah] = glyphs
        } catch {
          // Strict view hides Arabic when Madani glyphs are unavailable.
        }
      }))
      return withStrictMadaniResultGlyphs(view, byAyah)
    },
    retrySavedReciteAttempt() {
      const view = this.analysisView || {}
      const surah = Number(view.surahNumber || 0)
      const from = Number(view.rangeStart || 0)
      const to = Math.max(from, Number(view.rangeEnd || from))
      if (!(surah > 0 && from > 0)) return
      const base = this.memorisationUrl.split('?')[0]
      const params = new URLSearchParams({
        surah: String(surah),
        from: String(from),
        to: String(to),
        ai_check: '1',
        return: 'dashboard',
      })
      window.location.assign(`${base}?${params.toString()}`)
    },
    syncDrawerBodyLock(open) {
      setModalScrollLock(this, Boolean(open), { dashboard: true })
    },
    groupHifzProgress(rows) {
      const list = Array.isArray(rows) ? rows : []
      const groups = new Map()
      list.forEach((row) => {
        const surah = Number(row?.surah_number || 0)
        const ayah = Number(row?.ayah_number || 0)
        if (surah <= 0 || ayah <= 0) return
        const status = String(row?.status || '').toLowerCase()
        if (!groups.has(surah)) {
          groups.set(surah, {
            surah_number: surah,
            surah_name: row?.surah_name || `Surah ${surah}`,
            memorised_count: 0,
            learning_count: 0,
            memorised_ayahs: [],
          })
        }
        const group = groups.get(surah)
        if (status === 'memorised' || status === 'mastered') {
          group.memorised_count += 1
          group.memorised_ayahs.push(ayah)
        } else if (status === 'learning' || status === 'reviewing') {
          group.learning_count += 1
        }
      })

      return Array.from(groups.values())
        .map((group) => ({
          ...group,
          memorised_ayahs: group.memorised_ayahs.sort((a, b) => a - b),
        }))
        .sort((a, b) => a.surah_number - b.surah_number)
    },
    reload(force = false) {
      this.fetchDashboard(this.chartDays, { force, announce: force })
      this.loadAiReciteResults()
      this.loadLearnerSupport()
      this.loadLearnerCircle()
    },
    async retryPendingPostSessionWrites() {
      const sessionRetry = readSessionCompletionRetry()
      const assessmentRetry = readAiAssessmentRetry()
      const tasks = []

      if (sessionRetry?.payload) {
        tasks.push(
          learningApi.endSession(sessionRetry.payload)
            .then(() => clearSessionCompletionRetry())
            .catch(() => null),
        )
      }
      if (assessmentRetry?.payload) {
        tasks.push(
          learningApi.createMemorisationAssessment(assessmentRetry.payload)
            .then(() => clearAiAssessmentRetry())
            .catch(() => null),
        )
      }

      if (tasks.length) await Promise.allSettled(tasks)
    },
    async loadLearnerSupport() {
      if (this.assignmentSavingId) return
      if (this.auth?.learner_teacher_section_enabled !== true) return
      if (!this.auth?.learner_learning_network_connected) return
      const requestId = ++this.supportRequestId
      this.supportLoading = true
      try {
        const payload = await learningApi.getLearnerSupport()
        if (requestId !== this.supportRequestId) return
        this.applyLearnerSupport(payload)
        this.supportError = ''
        this.$nextTick(() => this.openLinkedLearnerRecord())
      } catch (error) {
        if (requestId !== this.supportRequestId) return
        this.support = this.support || { assignments: [], feedback: [] }
        this.supportError = error?.response?.data?.message || this.t('teacher.learner_assignments_load_failed')
      } finally {
        if (requestId === this.supportRequestId) this.supportLoading = false
      }
    },
    applyLearnerSupport(payload) {
      if (!payload || typeof payload !== 'object') return
      this.support = payload
      if (payload.circle) this.learnerCircle = payload.circle
    },
    applyLearnerCirclePayload(payload) {
      if (!payload || typeof payload !== 'object') return
      if (payload.circle) {
        this.learnerCircle = payload.circle
        if (this.support) this.support = { ...this.support, circle: payload.circle }
        return
      }
      this.applyLearnerSupport(payload)
      if (this.auth?.learner_learning_network_connected) {
        void this.loadLearnerSupport()
      }
    },
    async loadLearnerCircle() {
      if (this.auth?.learner_teacher_section_enabled !== true) return
      const requestId = ++this.learnerCircleRequestId
      this.learnerCircleLoading = true
      try {
        const payload = await learningApi.getLearnerCircle()
        if (requestId !== this.learnerCircleRequestId) return
        if (payload?.circle) {
          this.learnerCircle = payload.circle
          if (this.support) this.support = { ...this.support, circle: payload.circle }
        }
        this.learnerCircleError = ''
      } catch (error) {
        if (requestId !== this.learnerCircleRequestId) return
        this.learnerCircleError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        if (requestId === this.learnerCircleRequestId) this.learnerCircleLoading = false
      }
    },
    openStudentConnectionsSettings() {
      this.openStudentNav('settings')
      this.$refs.studentSettings?.selectSection('teachers')
      this.$nextTick(() => {
        const target = document.getElementById('learner-settings-connections')
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    openCircleTeacherMessage(teacherId) {
      this.openStudentNav('messages')
      this.$nextTick(() => this.openStudentTeacherThread(teacherId))
    },
    openStudentTeacherThread(teacherId) {
      if (this.studentPane === 'messages') {
        this.messagesPickTeacherId = Number(teacherId) || null
        this.$nextTick(() => {
          this.$refs.studentMessages?.openTeacherById?.(teacherId)
          this.messagesPickTeacherId = null
        })
        return
      }
      this.$refs.learnerTeacherSection?.openTeacherThread(teacherId)
    },
    onStudentMessagesThreadsUpdated(payload) {
      if (payload?.refreshSupport) {
        this.loadLearnerSupport(true)
        return
      }
      const teacherId = Number(payload?.teacherId || 0)
      const messages = payload?.messages
      if (!teacherId || !Array.isArray(messages)) return
      const directThreads = (this.support?.direct_threads || []).map((row) => (
        Number(row.teacher_id) === teacherId ? { ...row, messages, unread_count: payload.unread_count ?? row.unread_count } : row
      ))
      this.support = { ...this.support, direct_threads: directThreads }
    },
    openMessageAssignment(assignment) {
      const recipientId = Number(assignment?.recipient_id || assignment?.id || 0)
      if (!recipientId) return
      const open = () => this.$refs.learnerTeacherSection?.openAssignmentById?.(recipientId)
      if (this.studentPane === 'messages') {
        this.navigateDashboardPane('learning', { history: 'push', restoreScroll: true })
        this.$nextTick(open)
        return
      }
      open()
    },
    async startSupportAssignment(item) {
      if (this.auth?.learner_teacher_section_enabled !== true || !item?.id || item.teacher_access === false || this.assignmentSavingId) return
      this.supportRequestId += 1
      this.supportLoading = false
      this.supportError = ''
      this.assignmentSavingId = Number(item?.id || 0)
      try {
        const payload = await learningApi.startLearnerAssignment(item.id)
        if (payload?.recipient && Array.isArray(this.support?.assignments)) {
          const next = this.support.assignments.map((row) => (
            row.id === payload.recipient.id ? { ...row, ...payload.recipient } : row
          ))
          this.support = { ...this.support, assignments: next }
        }
        if (payload?.href) {
          window.location.assign(payload.href)
          return
        }
        this.showToast(this.t('teacher.action_failed'))
      } catch (error) {
        this.supportError = error?.response?.data?.message || this.t('teacher.action_failed')
        this.showToast(this.supportError)
      } finally {
        this.assignmentSavingId = 0
      }
    },
    promptSupportAssignmentCompletion(item) {
      if (!item?.id || item.teacher_access === false || this.assignmentSavingId) return
      this.supportError = ''
      this.reflectionFeeling = item?.self_assessment?.feeling || ''
      this.reflectionHelp = item?.self_assessment?.note || item?.self_assessment?.help_request || ''
      this.reflectionInitialFeeling = this.reflectionFeeling
      this.reflectionInitialHelp = this.reflectionHelp
      this.reflectionPrompt = {
        mode: 'before',
        item,
        recipientId: Number(item.id),
        title: this.assignmentSelfAssessmentTitle(item),
        surah_number: item.assignment?.surah_number || null,
        ayah_start: item.assignment?.ayah_start || null,
        ayah_end: item.assignment?.ayah_end || null,
      }
    },
    openPostSubmissionAssessment(submission) {
      if (!submission?.recipient_id || this.reflectionSaving) return
      this.supportError = ''
      this.reflectionFeeling = submission?.self_assessment?.feeling || ''
      this.reflectionHelp = submission?.self_assessment?.note || submission?.self_assessment?.help_request || ''
      this.reflectionInitialFeeling = this.reflectionFeeling
      this.reflectionInitialHelp = this.reflectionHelp
      this.reflectionPrompt = {
        mode: 'after',
        recipientId: Number(submission.recipient_id),
        title: submission.title || '',
        surah_number: submission.assigned_range?.surah || null,
        ayah_start: submission.assigned_range?.from || null,
        ayah_end: submission.assigned_range?.to || null,
      }
    },
    closeSelfAssessment(force = false) {
      if (this.reflectionSaving && !force) return
      this.reflectionPrompt = null
      this.reflectionFeeling = ''
      this.reflectionHelp = ''
      this.reflectionInitialFeeling = ''
      this.reflectionInitialHelp = ''
    },
    reflectionFeelingIcon(feeling) {
      return {
        easy: 'bi bi-emoji-smile',
        manageable: 'bi bi-hand-thumbs-up',
        difficult: 'bi bi-exclamation-circle',
        need_help: 'bi bi-person-raised-hand',
      }[feeling] || 'bi bi-circle'
    },
    assignmentSelfAssessmentTitle(item) {
      const assignment = item?.assignment || {}
      const range = assignment.ayah_start === assignment.ayah_end
        ? assignment.ayah_start
        : `${assignment.ayah_start || ''}–${assignment.ayah_end || ''}`
      return [assignment.surah_name, range].filter(Boolean).join(' · ')
    },
    selfAssessmentPayload() {
      const comment = String(this.reflectionHelp || '').trim()
      return {
        feeling: this.reflectionFeeling,
        comment,
        note: comment,
        help_request: comment,
      }
    },
    async submitSupportAssignment(includeAssessment) {
      const item = this.reflectionPrompt?.item
      if (!item || this.reflectionSaving || (includeAssessment && !this.reflectionFeeling)) return
      this.reflectionSaving = true
      await this.completeSupportAssignment(item, includeAssessment ? this.selfAssessmentPayload() : null)
      this.reflectionSaving = false
    },
    async completeSupportAssignment(item, assessment = null) {
      if (this.auth?.learner_teacher_section_enabled !== true || !item?.id || this.assignmentSavingId) return
      this.supportRequestId += 1
      this.supportLoading = false
      this.supportError = ''
      this.assignmentCompletionMessage = ''
      this.assignmentFailedItem = null
      this.assignmentSavingId = Number(item?.id || 0)
      try {
        this.support = await learningApi.completeLearnerAssignment(item.id, assessment)
        const updated = (Array.isArray(this.support?.assignments) ? this.support.assignments : [])
          .find((row) => Number(row?.id) === Number(item.id))
        const approved = updated && isLearnerTaskApproved(updated) && !isLearnerSubmitted(updated)
        this.assignmentCompletionMessage = this.t(approved
          ? 'teacher.learner_assignments_completed_success'
          : 'teacher.learner_assignments_submitted_success')
        this.closeSelfAssessment(true)
        clearTimeout(this.assignmentCompletionTimer)
        this.assignmentCompletionTimer = setTimeout(() => this.dismissAssignmentCompletion(), 5000)
      } catch (error) {
        this.supportError = error?.response?.data?.message || this.t('teacher.action_failed')
        this.assignmentFailedItem = item
      } finally {
        this.assignmentSavingId = 0
      }
    },
    homeTaskTypeFor(task) {
      return assignmentDisplayLabel(task?.assignment, this.t.bind(this))
    },
    async saveReflection() {
      if (!this.reflectionPrompt || !this.reflectionFeeling || this.reflectionSaving) return
      this.reflectionSaving = true
      try {
        await learningApi.saveLearnerSelfAssessment({
          ...this.selfAssessmentPayload(),
          teacher_assignment_recipient_id: this.reflectionPrompt.recipientId,
          surah_number: this.reflectionPrompt.surah_number,
          ayah_start: this.reflectionPrompt.ayah_start,
          ayah_end: this.reflectionPrompt.ayah_end,
        })
        await this.loadLearnerSupport(true)
        this.showToast(this.t('dashboard.home_reflection_saved'))
        this.closeSelfAssessment(true)
      } catch (error) {
        this.supportError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.reflectionSaving = false
      }
    },
    async sendSupportNote(item, body, recording = null, clientMessageId = null) {
      if (this.auth?.learner_teacher_section_enabled !== true) return null
      this.supportRequestId += 1
      this.supportLoading = false
      const payload = await learningApi.sendLearnerAssignmentMessage(item.id, body, recording, clientMessageId)
      const message = payload?.message || null
      if (message && item?.id) {
        this.supportRequestId += 1
        this.supportLoading = false
        this.support = applyAssignmentThreadUpdate(this.support, {
          taskId: item.id,
          append: message,
          threadUnreadCount: 0,
        })
      }
      return message
    },
    patchLearnerSupportThread(payload) {
      this.support = applyAssignmentThreadUpdate(this.support, payload)
    },
    async sendDirectTeacherMessage(teacherId, body) {
      if (this.auth?.learner_teacher_section_enabled !== true) return null
      const payload = await learningApi.sendLearnerTeacherMessage(teacherId, body)
      return payload?.message || null
    },
    showCompletedAssignments() {
      this.assignmentCompletionMessage = ''
      this.navigateDashboardPane('learning', { history: 'push', restoreScroll: true })
      this.$nextTick(() => this.$refs.learnerTeacherSection?.setFilter('done'))
    },
    dismissAssignmentCompletion() {
      clearTimeout(this.assignmentCompletionTimer)
      this.assignmentCompletionTimer = null
      this.assignmentCompletionMessage = ''
    },
    setChartDays(days) {
      const next = days === 7 ? 7 : 30
      if (next === this.chartDays && this.data?.chart?.days === next && !this.loading) return
      this.chartDays = next
      this.chartReady = false
      this.fetchDashboard(next)
      if (this.studentPane === 'progress') this.loadProgressSnapshot(next === 7 ? 'week' : 'month', { force: true })
    },
    setProgressWindow(window) {
      this.setChartDays(window === 'week' ? 7 : 30)
      this.$nextTick(() => this.syncProgressWindowUrl(window === 'week' ? 'week' : 'month'))
    },
    async loadProgressSnapshot(window = 'month', options = {}) {
      const safeWindow = window === 'week' ? 'week' : 'month'
      if (!options.force && this.progressSnapshot?.window === safeWindow && !this.progressSnapshotError) return
      const requestId = ++this.progressSnapshotRequest
      this.progressSnapshotLoading = true
      this.progressSnapshotError = false
      try {
        const payload = await learningApi.getProgressSnapshot(safeWindow)
        if (requestId !== this.progressSnapshotRequest) return
        this.progressSnapshot = payload
      } catch (_) {
        if (requestId !== this.progressSnapshotRequest) return
        this.progressSnapshotError = true
      } finally {
        if (requestId === this.progressSnapshotRequest) this.progressSnapshotLoading = false
      }
    },
    openProgressAssignment(recipientId) {
      this.navigateDashboardPane('learning', { history: 'push', focus: true, restoreScroll: true })
      this.$nextTick(() => this.$refs.learnerTeacherSection?.openAssignmentById?.(recipientId))
    },
    progressRangeLabel(range) {
      if (!range) return ''
      const end = range.ayah_end !== range.ayah_start ? `–${range.ayah_end}` : ''
      return `${range.surah_name} · ${range.ayah_start}${end}`
    },
    progressRangeLine(bucket) {
      const items = bucket?.items || []
      if (!items.length) return ''
      const shown = items.slice(0, 3).map((range) => this.progressRangeLabel(range))
      if (bucket.omitted) shown.push(this.t('dashboard.progress_more_ranges', { n: bucket.omitted }))
      return shown.join(', ')
    },
    async fetchDashboard(days = this.chartDays, options = {}) {
      const { quiet = false, initial = false, force = false, announce = false } = options
      const safeDays = days === 7 ? 7 : 30
      if (
        quiet
        && !force
        && this.data
        && this.lastDashboardFetchedAt
        && (Date.now() - this.lastDashboardFetchedAt) < this.dashboardQuietTtlMs
      ) {
        return
      }
      const requestId = ++this.dashboardRequestId
      try { this._dashboardAbort?.abort?.() } catch (_) { /* ignore */ }
      this._dashboardAbort = typeof AbortController !== 'undefined'
        ? new AbortController()
        : null
      if (!quiet) {
        this.loading = true
        this.syncState = 'loading'
      }
      try {
        const payload = await learningApi.getDashboard(safeDays, {
          signal: this._dashboardAbort?.signal,
          fresh: force,
        })
        if (requestId !== this.dashboardRequestId) return
        const sanitized = this.sanitizePayload(payload)
        if (!sanitized) throw new Error('Dashboard payload owner mismatch')
        const chartFingerprint = JSON.stringify({
          days: sanitized?.chart?.days,
          points: sanitized?.chart?.points,
          summary: sanitized?.chart?.summary,
        })
        const chartChanged = chartFingerprint !== this.lastChartFingerprint
        this.data = sanitized
        if (sanitized?.ai_recite_stats && !this.aiReciteStats) {
          this.aiReciteStats = sanitized.ai_recite_stats
        }
        this.hydrateRevisitAyahs()
        this.error = false
        this.failureKind = 'failure'
        this.lastSyncedAt = sanitized?.meta?.generated_at || new Date().toISOString()
        this.lastDashboardFetchedAt = Date.now()
        this.syncState = 'ready'
        if (sanitized?.chart?.days === 7 || sanitized?.chart?.days === 30) {
          this.chartDays = sanitized.chart.days
        } else {
          this.chartDays = safeDays
        }
        if (this.studentPane === 'progress') {
          this.loadProgressSnapshot(this.chartDays === 7 ? 'week' : 'month')
        }
        // Remount Chart.js only when the series actually changed.
        if (chartChanged || !quiet) {
          this.lastChartFingerprint = chartFingerprint
          this.chartReady = false
          await this.$nextTick()
        }
        if (requestId === this.dashboardRequestId) {
          this.chartReady = true
          this.refreshActiveSessionSnapshot()
          this.scrollToAiReciteResults()
          this.enqueueAchievementUnlocks(sanitized?.achievements?.pending_unlocks)
          if (announce) this.showToast(this.t('dashboard.updated'))
        }
      } catch (error) {
        if (
          error?.code === 'ERR_CANCELED'
          || error?.name === 'CanceledError'
          || error?.name === 'AbortError'
        ) {
          return
        }
        console.error('Dashboard fetch failed', error)
        if (requestId !== this.dashboardRequestId) return
        if (initial || !this.data) {
          this.failureKind = classifyRequestFailure(error)
          this.error = true
          this.data = null
        }
        this.syncState = 'error'
        if (announce) this.showToast(this.t('dashboard.load_error'))
        this.chartReady = true
      } finally {
        if (requestId === this.dashboardRequestId) {
          this.loading = false
        }
      }
    },
    showToast(message) {
      const text = String(message || '').trim()
      if (!text) return
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastMessage = text
      this.toastTimer = setTimeout(() => this.clearToast(), 3500)
    },
    clearToast() {
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = null
      this.toastMessage = ''
    },
    achievementName(item) {
      const id = item?.id || item
      return this.t(`dashboard.achievements.items.${id}.name`)
    },
    achievementDescription(item) {
      const id = item?.id || item
      return this.t(`dashboard.achievements.items.${id}.description`)
    },
    achievementMeaning(item) {
      if (!item?.id) return ''
      if (item.state === 'unlocked') {
        return this.t(`dashboard.achievements.items.${item.id}.unlock`)
      }
      const key = `dashboard.achievements.items.${item.id}.meaning`
      const value = this.t(key)
      return value === key ? this.achievementDescription(item) : value
    },
    achievementHowLabel(item) {
      if (!item?.id) return ''
      const key = `dashboard.achievements.items.${item.id}.how`
      const value = this.t(key)
      return value === key ? '' : value
    },
    achievementUnlockMessage(item) {
      const id = item?.id || item
      return this.t(`dashboard.achievements.items.${id}.unlock`)
    },
    achievementStatusLabel(item) {
      if (!item) return ''
      if (item.detail === 'path_locked' || item.path_open === false) {
        return this.t('dashboard.achievements.status_locked_path')
      }
      if (item.is_next && item.state !== 'unlocked') return this.t('dashboard.achievements.status_next')
      if (item.state === 'unlocked') return this.t('dashboard.achievements.status_unlocked')
      if (item.state === 'in_progress') return this.t('dashboard.achievements.status_in_progress')
      return this.t('dashboard.achievements.status_locked')
    },
    achievementSectionSubtitle(widget) {
      if (!widget) return this.t('dashboard.achievements.subtitle')
      if (widget.next?.id) {
        return this.t('dashboard.achievements.subtitle_next', {
          name: this.achievementName(widget.next),
        })
      }
      const unlocked = Number(widget.unlocked_count || 0)
      const total = Number(widget.total_count || 0)
      if (unlocked > 0) {
        return this.t('dashboard.achievements.subtitle_done', { unlocked, total })
      }
      return this.t('dashboard.achievements.subtitle')
    },
    achievementTierTitle(tier) {
      const id = tier?.id || 'beginner'
      return this.t(`dashboard.achievements.tiers.${id}.name`)
    },
    achievementTierHint(tier) {
      const id = tier?.id || 'beginner'
      if (tier?.complete) {
        return this.t(`dashboard.achievements.tiers.${id}.complete_hint`)
      }
      return this.t(`dashboard.achievements.tiers.${id}.hint`)
    },
    achievementProgressLabel(item) {
      if (!item || item.state === 'unlocked') return ''
      if ((item.target || 0) <= 0) return ''
      const current = item.current || 0
      const target = item.target || 0
      const unit = item.unit || this.achievementUnitFor(item.id)
      const keyMap = {
        session: 'progress_session',
        streak: 'progress_streak',
        day: 'progress_day',
        surah: 'progress_surah',
        revision: 'progress_revision',
        check: 'progress_check',
        improvement: 'progress_improvement',
        week: 'progress_week',
      }
      const key = keyMap[unit] || 'progress_generic'
      return this.t(`dashboard.achievements.${key}`, { current, target })
    },
    achievementUnitFor(id) {
      const map = {
        first_steps: 'session',
        checker: 'check',
        consistent: 'streak',
        memoriser: 'session',
        explorer: 'surah',
        dedicated: 'day',
        reviser: 'revision',
        growing: 'improvement',
        focused: 'week',
        steadfast: 'day',
      }
      return map[id] || 'session'
    },
    achievementRemainingLabel(item) {
      if (!item || item.state === 'unlocked') return ''
      if (item.id === 'focused' && item.detail === 'goal_unset') {
        return this.t('dashboard.achievements.focused_set_goal')
      }
      const remaining = Math.max(0, (item.target || 0) - (item.current || 0))
      if (remaining <= 0) return ''
      const unit = item.unit || this.achievementUnitFor(item.id)
      if (unit === 'surah') return this.t('dashboard.achievements.remaining_surahs', { n: remaining })
      if (unit === 'check') return this.t('dashboard.achievements.remaining_attempts', { n: remaining })
      if (unit === 'improvement') {
        if (item.detail === 'insufficient_data') {
          return this.t('dashboard.achievements.remaining_attempts', { n: remaining })
        }
        return this.t('dashboard.achievements.remaining_improvement')
      }
      if (unit === 'streak' || unit === 'day' || unit === 'week') {
        return this.t('dashboard.achievements.remaining_days', { n: remaining })
      }
      return this.t('dashboard.achievements.remaining_sessions', { n: remaining })
    },
    achievementRequirement(item) {
      if (!item || item.state === 'unlocked' || item.state === 'in_progress') return ''
      if (item.detail === 'path_locked' || item.path_open === false) {
        return this.t('dashboard.achievements.path_locked')
      }
      if (item.id === 'focused' && (item.detail === 'goal_unset' || !(item.target > 0))) {
        return this.t('dashboard.achievements.focused_set_goal')
      }
      return this.achievementHowLabel(item) || this.t(`dashboard.achievements.items.${item.id}.requirement`)
    },
    isAchievementsDesktopLayout() {
      if (typeof window === 'undefined' || !window.matchMedia) return false
      return window.matchMedia('(min-width: 900px)').matches
    },
    revealAchievementsSection() {
      if (this.isSectionCollapsed('achievements')) {
        this.toggleSection('achievements')
      }
      this.$nextTick(() => {
        const el = document.getElementById('achievements')
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    openAchievementsFromHash() {
      if (typeof window === 'undefined') return
      if (window.location.hash !== '#achievements') return
      this.$nextTick(() => {
        void this.openAchievementsDrawer()
      })
    },
    enqueueAchievementUnlocks(pending) {
      const list = Array.isArray(pending) ? pending : []
      if (!list.length) return
      const existing = new Set(this.achievementUnlockQueue.map((item) => item.id))
      list.forEach((item) => {
        if (!item?.id || existing.has(item.id) || this.achievementNotifiedIds[item.id]) return
        this.achievementUnlockQueue.push(item)
        existing.add(item.id)
      })
    },
    async acknowledgeAchievementUnlock(achievementId) {
      if (!achievementId) return
      this.achievementNotifiedIds = { ...this.achievementNotifiedIds, [achievementId]: true }
      this.achievementUnlockQueue = this.achievementUnlockQueue.filter((item) => item.id !== achievementId)
      try {
        await learningApi.acknowledgeAchievements([achievementId])
      } catch (error) {
        console.error('Achievement acknowledge failed', error)
      }
    },
    async openAchievementsDrawer() {
      if (this.isAchievementsDesktopLayout()) {
        this.revealAchievementsSection()
        return
      }
      await this.openDrawer('achievements')
    },
  },
}
</script>
