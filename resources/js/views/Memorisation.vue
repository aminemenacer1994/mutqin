<template>
  <!-- mutqin-ui-build: v159 -->
  <div class="app" :data-theme="theme" :dir="isRtlLocale ? 'rtl' : 'ltr'" :class="{
    'is-rtl': isRtlLocale,
    'workspace-tour-plan-active': workspaceTourActive && workspaceTourStep?.key === 'plan',
    'workspace-tour-dashboard-active': workspaceTourActive && workspaceTourStep?.key === 'dashboard',
    'onboarding-post-session-active': showPostSessionModal,
    'onboarding-post-session-front': showPostSessionModal && !postSessionOffcanvasOpen && !postSessionAiReciteActive && !postSessionAdaptiveCheckActive && postSessionPrimarySurface !== 'builder',
    'post-session-ai-recite-open': postSessionAiReciteActive,
    'post-session-adaptive-check-open': postSessionAdaptiveCheckActive,
    'overlay-onboarding-active': isOnboardingExperienceActive,
    'onboarding-post-session-offcanvas-open': showPostSessionModal && postSessionOffcanvasOpen && showTools,
    'post-session-choice-active': isPostSessionChoiceVisible,
    'post-session-choice-offcanvas-open': isPostSessionChoiceVisible && postSessionChoiceOffcanvasOpen && showTools,
    'session-exit-flow-active': showSessionExitModal,
    'session-exit-offcanvas-open': showSessionExitModal && sessionExitOffcanvasOpen && showTools,
    'is-fullscreen': isAppFullscreen
  }" :style="appStyleVars" v-cloak>
    <div v-if="showAppBootLoader" class="app-boot-loading" role="status" aria-live="polite">
      <i class="bi bi-hourglass-split" aria-hidden="true"></i>
      <span>{{ workspaceLoadingLabel }}</span>
    </div>

    <div
      v-if="appReady && banner"
      class="banner"
      :class="[banner.kind, { important: banner.important, persistent: banner.persistent, 'banner--above-modal': isAnyModalOverlayActive }]"
      role="alert"
      aria-live="assertive"
    >
      <span class="banner-message">{{ banner.message }}</span>
      <div class="banner-actions">
        <button v-if="banner.actionLabel" class="banner-action" @click="runBannerAction">{{ banner.actionLabel
        }}</button>
        <button class="banner-x" @click="banner = null" :aria-label="t('common.dismiss')"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>

    <Teleport to="body">
    <aside
      v-if="workspaceTourActive"
      class="workspace-tour"
      data-workspace-tour
      :data-tour-step="workspaceTourStep?.key"
      :data-theme="theme"
      role="dialog"
      aria-modal="true"
      :aria-label="workspaceTourStepCopy.title"
      tabindex="-1"
      @keydown="onWorkspaceTourKeydown"
    >
      <div
        v-for="(blocker, index) in workspaceTourBlockers"
        :key="`tour-blocker-${index}`"
        class="workspace-tour__blocker"
        :style="blocker"
        @click.prevent
      ></div>

      <div
        class="workspace-tour__hole"
        :class="{ 'is-ready': !!workspaceTourRect }"
        :style="workspaceTourHoleStyle"
        aria-hidden="true"
        @click.prevent
        @pointerdown.prevent
      ></div>

      <div
        v-if="workspaceTourDashboardOpen"
        class="workspace-tour__dashboard"
        data-tour="tour-dashboard"
      >
        <!--
          BUG FIX: iframe removal previously shipped a hardcoded mock dashboard
          (streak=1, learning=3, fake chart bars). Preview must use live account
          state only — skeleton while loading, honest empty when there is no data.
        -->
        <div class="workspace-tour__dashboard-preview" aria-hidden="true">
          <template v-if="workspaceTourDashboardPreviewLoading">
            <div class="workspace-tour__dash-skeleton" data-tour-dashboard-state="loading">
              <span class="workspace-tour__dash-skel workspace-tour__dash-skel--title"></span>
              <span class="workspace-tour__dash-skel workspace-tour__dash-skel--chip"></span>
              <div class="workspace-tour__dash-stats">
                <span class="workspace-tour__dash-skel workspace-tour__dash-skel--stat"></span>
                <span class="workspace-tour__dash-skel workspace-tour__dash-skel--stat"></span>
              </div>
              <span class="workspace-tour__dash-skel workspace-tour__dash-skel--card"></span>
              <span class="workspace-tour__dash-skel workspace-tour__dash-skel--card"></span>
              <span class="workspace-tour__dash-skel workspace-tour__dash-skel--chart"></span>
              <p class="workspace-tour__dash-loading-label">{{ t('dashboard.loading') }}</p>
            </div>
          </template>

          <template v-else>
            <header class="workspace-tour__dash-hero">
              <p class="workspace-tour__dash-kicker">{{ t('dashboard.journey_kicker') }}</p>
              <h3 class="workspace-tour__dash-title">{{ workspaceTourDashboardGreeting }}</h3>
              <span
                v-if="workspaceTourDashboardStreakLabel"
                class="workspace-tour__dash-chip"
              >
                <i class="bi bi-fire" aria-hidden="true"></i>
                {{ workspaceTourDashboardStreakLabel }}
              </span>
            </header>

            <div class="workspace-tour__dash-stats">
              <div class="workspace-tour__dash-stat">
                <i class="bi bi-journal-bookmark-fill" aria-hidden="true"></i>
                <strong>{{ journeyMemorisedCount }}</strong>
                <span>{{ t('dashboard.glance_memorised_label') }}</span>
              </div>
              <div class="workspace-tour__dash-stat">
                <i class="bi bi-bookmark-plus" aria-hidden="true"></i>
                <strong>{{ workspaceTourDashboardLearningCount }}</strong>
                <span>{{ t('dashboard.glance_learning_label') }}</span>
              </div>
            </div>

            <div class="workspace-tour__dash-card">
              <div class="workspace-tour__dash-card-head">
                <span>{{ t('dashboard.journey_overall_label') }}</span>
                <strong>{{ workspaceTourDashboardOverallDisplay.percent }}%</strong>
              </div>
              <div class="workspace-tour__dash-bar">
                <span
                  :style="{ width: workspaceTourDashboardOverallDisplay.fillWidth }"
                  :class="{ 'is-empty': !workspaceTourDashboardOverallDisplay.hasProgress }"
                ></span>
              </div>
            </div>

            <div
              v-if="workspaceTourDashboardWeakItems.length || workspaceTourDashboardShowWeakEmpty"
              class="workspace-tour__dash-card"
            >
              <div class="workspace-tour__dash-card-head">
                <span>{{ t('dashboard.strengthen_title') }}</span>
              </div>
              <ul
                v-if="workspaceTourDashboardWeakItems.length"
                class="workspace-tour__dash-weak-list"
              >
                <li
                  v-for="item in workspaceTourDashboardWeakItems"
                  :key="item.key || `${item.surah_number}-${item.ayah_number}`"
                >
                  {{ item.surah_name }}
                  <template v-if="item.ayah_number">
                    · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                  </template>
                </li>
              </ul>
              <p v-else>{{ t('dashboard.weak_empty_message') }}</p>
            </div>

            <div class="workspace-tour__dash-card" data-tour="tour-dashboard-activity">
              <div class="workspace-tour__dash-card-head">
                <span>{{ t('dashboard.activity_chart_title') }}</span>
              </div>
              <div
                v-if="!workspaceTourDashboardChartEmpty"
                class="workspace-tour__dash-chart"
              >
                <span
                  v-for="(bar, index) in workspaceTourDashboardChartBars"
                  :key="`dash-bar-${index}`"
                  :style="{ '--h': bar.height }"
                  :class="{ 'is-quiet': !bar.active }"
                ></span>
              </div>
              <div v-else class="workspace-tour__dash-empty">
                <strong>{{ t('dashboard.weekly_empty_title') }}</strong>
                <span>{{ t('dashboard.weekly_empty_message') }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div
        class="workspace-tour__tooltip"
        :class="workspaceTourTooltipPlacementClass"
        :style="workspaceTourTooltipStyle"
      >
        <p class="workspace-tour__kicker">
          {{ t('memorisation.workspaceTour.stepCounter', {
            current: workspaceTourStepIndex + 1,
            total: workspaceTourSteps.length
          }) }}
        </p>
        <h2 class="workspace-tour__title">{{ workspaceTourStepCopy.title }}</h2>
        <p class="workspace-tour__body">{{ workspaceTourStepCopy.body }}</p>
        <div class="workspace-tour__actions">
          <button
            type="button"
            class="workspace-tour__btn workspace-tour__btn--ghost"
            @click="skipWorkspaceTour"
          >
            {{ t('memorisation.workspaceTour.skip') }}
          </button>
          <button
            type="button"
            class="workspace-tour__btn workspace-tour__btn--ghost"
            :disabled="workspaceTourStepIndex <= 0"
            @click="prevWorkspaceTourStep"
          >
            {{ t('common.back') }}
          </button>
          <button
            type="button"
            class="workspace-tour__btn workspace-tour__btn--primary"
            :disabled="workspaceTourNextDisabled"
            @click="nextWorkspaceTourStep"
          >
            {{ workspaceTourIsLastStep
              ? t('memorisation.workspaceTour.finish')
              : t('memorisation.workspaceTour.next') }}
          </button>
        </div>
      </div>
    </aside>
    </Teleport>

    <div
      v-if="practiceSetupStatusMessage"
      class="practice-setup-status-toast"
      role="status"
      aria-live="polite"
    >
      {{ practiceSetupStatusMessage }}
    </div>

    <div
      v-if="savedSessionToastMessage"
      class="saved-session-toast"
      :class="{ 'saved-session-toast--above-modal': isAnyModalOverlayActive }"
      role="alert"
      aria-live="assertive"
    >
      <i class="bi bi-journal-check" aria-hidden="true"></i>
      <span>{{ savedSessionToastMessage }}</span>
    </div>

    <aside
      v-if="aiTestModalsEnabled && amdPracticeHudVisible && amdPracticeHud"
      class="amd-practice-hud"
      role="status"
      aria-live="polite"
    >
      <div class="amd-practice-hud-copy">
        <span class="amd-practice-hud-kicker">{{ amdPracticeHud.title || amdTitle }}</span>
        <strong v-if="amdPracticeHud.technique === 'talqin'">
          {{ t('memorisation.amd.hud.talqin', {
            ayah: rangeStart,
            current: amdPracticeHud.repetitionCurrent,
            total: amdPracticeHud.repetitionsTarget,
            phase: amdPracticeHud.talqinPhase
          }) || (`Ayah ${rangeStart} · Repetition ${amdPracticeHud.repetitionCurrent} of ${amdPracticeHud.repetitionsTarget} · ${amdPracticeHud.talqinPhase}`) }}
        </strong>
        <strong v-else-if="amdPracticeHud.technique === 'chunking'">
          {{ t('memorisation.amd.hud.chunking', {
            current: (amdActiveChunkIndex || 0) + 1,
            total: (amdPracticeHud.chunks || []).length || 1
          }) || (`Chunk ${(amdActiveChunkIndex || 0) + 1} of ${(amdPracticeHud.chunks || []).length || 1}`) }}
        </strong>
        <strong v-else-if="amdPracticeHud.technique === 'anchor'">
          {{ t('memorisation.amd.hud.anchor', {
            strengthened: amdStrengthenedWords || 0,
            total: (amdPracticeHud.weakWords || []).length || 0
          }) || (`Focus words: ${amdStrengthenedWords || 0} / ${(amdPracticeHud.weakWords || []).length || 0} strengthened`) }}
        </strong>
        <strong v-else>
          {{ t('memorisation.amd.hud.generic', {
            current: amdPracticeHud.repetitionCurrent,
            total: amdPracticeHud.repetitionsTarget
          }) || (`Practice · ${amdPracticeHud.repetitionCurrent} / ${amdPracticeHud.repetitionsTarget}`) }}
        </strong>
      </div>
      <div class="amd-practice-hud-actions">
        <button type="button" class="btn-secondary" @click="bumpAmdRepetition">{{ t('memorisation.amd.hud.nextRep') || 'Next repetition' }}</button>
        <button
          v-if="amdPracticeHud.technique === 'anchor'"
          type="button"
          class="btn-secondary"
          @click="markAmdWeakWordStrengthened"
        >{{ t('memorisation.amd.hud.markWord') || 'Word strengthened' }}</button>
        <button type="button" class="btn-primary" @click="completeAmdPracticePlan">{{ t('memorisation.amd.hud.finish') || 'Finish & re-test' }}</button>
      </div>
    </aside>

    <div
      v-if="recitationCheckPanelOpen || recitationCheckRecording || recitationCheckPreparing"
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ aiRecallModeAnnouncement }}
    </div>

    <!-- Main Content -->
    <div
      v-if="appReady && !isLoggedIn"
      class="main container guest-auth-shell"
      role="main"
    >
      <AppStatus
        variant="auth"
        size="lg"
        fill
        icon="bi-person-lock"
        :title="t('common.status.authTitle')"
        :description="t('home.guestNote')"
        :action-label="t('common.status.logIn')"
        :action-href="loginUrl"
        :secondary-action-label="t('common.register')"
        @secondary-action="goToRegister"
      />
    </div>

    <div v-else-if="appReady && isLoggedIn" class="main container" :class="{
      'tools-open': showTools,
      'player-visible': playbackShellActive,
      'playback-pill-visible': playbackPillVisible,
      'mushaf-mode-active': readingViewMode === 'mushaf',
      'focus-mode-active': focusModeEnabled,
      'blur-mode-active': blurModeEnabled,
      'flow-practice': guidedUiStep === 'practice',
      'flow-recall': guidedUiStep === 'recall'
    }"
      :data-session-chapter="Number(chapterId || currentConfig?.chapterId || 0) || null"
      :data-session-start="Number(rangeStart || currentConfig?.rangeStart || 0) || null"
      :data-session-end="Number(rangeEnd || currentConfig?.rangeEnd || 0) || null"
      :data-session-signature="mushafSessionSignature || null"
    >
      <div class="content">
        <!-- Verses Grid -->
        <div class="workspace">
        <div
          v-if="showSessionProgressRail"
          class="session-progress-rail"
          role="progressbar"
          :aria-valuenow="sessionProgressMeter"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="workspaceProgressSummary.title || t('memorisation.workspaceProgress.sessionProgress')"
          :aria-valuetext="sessionProgressAriaText"
        >
          <div class="session-progress-rail__inner" aria-hidden="true">
            <div class="session-progress-rail__row">
              <div class="session-progress-rail__copy">
                <span class="session-progress-rail__title">{{ sessionProgressTitle }}</span>
                <span
                  v-if="sessionProgressMeta || sessionProgressStateHint"
                  class="session-progress-rail__sep"
                  aria-hidden="true"
                >·</span>
                <span v-if="sessionProgressMeta" class="session-progress-rail__meta">{{ sessionProgressMeta }}</span>
                <span
                  v-if="sessionProgressMeta && sessionProgressStateHint"
                  class="session-progress-rail__sep"
                  aria-hidden="true"
                >·</span>
                <span
                  v-if="sessionProgressStateHint"
                  class="session-progress-rail__hint"
                >{{ sessionProgressStateHint }}</span>
              </div>
              <span class="session-progress-rail__value">{{ sessionProgressLabel }}</span>
            </div>
            <div class="session-progress-rail__track">
              <div
                class="session-progress-rail__fill"
                :class="{ 'is-complete': sessionProgressMeter >= 100 }"
                :style="{ width: sessionProgressMeter + '%' }"
              ></div>
            </div>
          </div>
        </div>
        <section
          v-show="(hasVerses || showSessionOverviewIdleActions || isPostSessionChoiceVisible) && !isWelcomeBackWorkspaceHidden && !isOnboardingExperienceActive"
          class="workspace-shell"
          data-tour="workspace-welcome"
          data-session-scroll-target
          :class="{
            collapsed: mainCardCollapsed,
            'workspace-shell--post-session-choice': isPostSessionChoiceVisible,
            'is-idle-card': showSessionOverviewIdleActions,
          }"
          :data-reading-mode="readingViewMode"
          :aria-label="t('memorisation.a11y.sessionOverview')"
        >
        <div class="workspace-shell-head" :class="{ 'is-idle': showSessionOverviewIdleActions }">
          <template v-if="hasVerses || isPostSessionChoiceVisible">
          <div class="workspace-shell-head-toolbar">
          <div class="workspace-shell-copy">
            <p v-if="workspaceShellSubtitle" class="workspace-shell-subtitle">{{ workspaceShellSubtitle }}</p>
            <h1 class="workspace-shell-main-title mutqin-surah-bilingual" :aria-label="topCardSessionLabel">
              <template v-if="topCardSurahArabic || topCardSurahLatin">
                <span v-if="topCardSurahLatin" class="workspace-shell-surah-en" lang="en" dir="ltr">{{ topCardSurahLatin }}</span>
                <span
                  v-if="topCardSurahArabic && topCardSurahLatin && topCardSurahArabic !== topCardSurahLatin"
                  class="workspace-shell-surah-sep"
                  aria-hidden="true"
                >·</span>
                <span v-if="topCardSurahArabic" class="workspace-shell-surah-ar" dir="rtl" lang="ar">{{ topCardSurahArabic }}</span>
              </template>
              <template v-else>{{ topCardSessionLabel }}</template>
            </h1>
          </div>
          <div class="workspace-shell-head-utility-row">
          <div class="workspace-shell-actions workspace-shell-head-actions">
            <div class="action-buttons-group">
              <div
                v-if="isPostSessionChoiceVisible"
                class="top-card-session-actions post-session-choice-pair"
                :class="{
                  'has-paired-actions': canShowRepeatRecommendedAction,
                }"
                data-testid="post-session-choice"
                role="group"
                :aria-label="t('memorisation.postSessionChoice.title')"
              >
                <button
                  v-if="canShowRepeatRecommendedAction"
                  type="button"
                  class="action-btn btn btn-primary session-primary-action top-card-action-trigger"
                  data-testid="post-session-repeat-recommended"
                  data-action="repeat_recommended"
                  :title="t('memorisation.postSessionChoice.repeatRecommendedDesc')"
                  :aria-label="t('memorisation.postSessionChoice.repeatRecommended')"
                  @click="repeatRecommendedSessionFromChoice"
                >
                  <i class="bi bi-arrow-return-left" aria-hidden="true"></i>
                  <span>{{ t('memorisation.postSessionChoice.repeatRecommended') }}</span>
                </button>
                <button
                  type="button"
                  class="action-btn top-card-action-trigger action-btn-exit post-session-choice-custom"
                  :class="{ 'btn btn-primary session-primary-action': !canShowRepeatRecommendedAction }"
                  data-testid="post-session-create-custom"
                  data-action="create_custom"
                  :title="t('memorisation.postSessionChoice.createCustomDesc')"
                  :aria-label="t('memorisation.postSessionChoice.createCustom')"
                  @click="createCustomSessionFromChoice"
                >
                  <i class="bi bi-sliders" aria-hidden="true"></i>
                  <span>{{ t('memorisation.postSessionChoice.createCustom') }}</span>
                </button>
              </div>
              <div
                v-else
                class="top-card-session-actions"
                :class="{ 'has-paired-actions': showHeaderEndSessionAction }"
              >
                <div
                  v-if="showHeaderSessionAction"
                  class="action-btn btn btn-primary session-primary-action top-card-action-trigger"
                  role="button"
                  tabindex="0"
                  :aria-disabled="headerSessionActionDisabled ? 'true' : 'false'"
                  :aria-busy="headerSessionActionBusy ? 'true' : 'false'"
                  :class="{ 'is-disabled': headerSessionActionDisabled, 'is-loading': headerSessionActionBusy }"
                  :style="{ minWidth: primarySessionActionPresentation.stableWidthCh + 'ch' }"
                  @click="handleHeaderSessionAction"
                  @keydown.enter.prevent="handleHeaderSessionAction"
                  @keydown.space.prevent="handleHeaderSessionAction"
                  :title="headerSessionActionLabel"
                  :aria-label="headerSessionActionLabel"
                >
                  <i class="bi" :class="headerSessionActionIcon" aria-hidden="true"></i>
                  <span>{{ headerSessionActionLabel }}</span>
                </div>
                <button
                  v-if="showHeaderEndSessionAction"
                  type="button"
                  class="action-btn top-card-action-trigger action-btn-exit mutqin-btn--destructive"
                  data-tour="end-session"
                  @click="openSessionExitModalFromMenu"
                  :title="t('sessionStatus.end')"
                  :aria-label="t('sessionStatus.end')"
                >
                  <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                  <span>{{ t('sessionStatus.end') }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="top-card-icon-controls" :aria-label="t('memorisation.a11y.readingTools')">
            <div
              class="workspace-layout-toggle view-mode-toggle top-card-layout-icons"
              role="group"
              :aria-label="`${t('memorisation.view.stacked')} / ${t('memorisation.view.mushaf')}`"
            >
              <button
                type="button"
                class="view-mode-btn workspace-layout-btn top-card-icon-control"
                :class="{ active: readingViewMode !== 'stacked' }"
                :aria-pressed="readingViewMode !== 'stacked' ? 'true' : 'false'"
                @click.stop="cycleReadingViewMode"
                :title="nextReadingViewModeHint"
                :aria-label="nextReadingViewModeLabel"
              >
                <i class="bi" :class="currentReadingViewModeIcon" aria-hidden="true"></i>
              </button>
            </div>
            <div class="font-dropdown workspace-font-dropdown top-card-font-wrap">
              <button
                class="font-dropdown-trigger top-card-icon-control"
                type="button"
                @click.stop="toggleFontDropdown"
                :title="t('memorisation.a11y.changeQuranFont')"
                :aria-label="t('memorisation.a11y.changeQuranFont')"
                :aria-expanded="fontDropdownOpen ? 'true' : 'false'"
              >
                <i class="bi bi-fonts" aria-hidden="true"></i>
              </button>
              <transition name="dropdown-fade">
                <div v-if="fontDropdownOpen" class="font-dropdown-menu top-card-font-menu" @click.stop>
                  <button
                    v-for="font in quranFontOptions"
                    :key="font.value"
                    type="button"
                    class="font-option"
                    :class="{ active: quranFont === font.value }"
                    @click="selectFont(font.value)"
                  >
                    <i class="bi" :class="getFontIcon(font.value)" aria-hidden="true"></i>
                    <span>{{ font.label }}</span>
                    <i v-if="quranFont === font.value" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                </div>
              </transition>
            </div>
            <div v-if="!isPostSessionChoiceVisible" class="top-card-controls-wrap">
              <div
                class="action-btn action-btn-secondary top-card-action-trigger top-card-controls-trigger top-card-icon-control"
                role="button"
                tabindex="0"
                data-tour="controls"
                @click="openAdvancedControls"
                @keydown.enter.prevent="openAdvancedControls"
                @keydown.space.prevent="openAdvancedControls"
                :title="t('memorisation.open_controls')"
                :aria-label="t('memorisation.open_controls')"
              >
                <i class="bi bi-sliders" aria-hidden="true"></i>
              </div>
            </div>
            <div class="top-card-menu-wrap" :class="{ 'is-menu-open': topCardMenuOpen }" @click.stop>
              <div
                class="top-card-ellipsis top-card-action-trigger top-card-icon-control"
                role="button"
                tabindex="0"
                @click="toggleTopCardMenu"
                @keydown.enter.prevent="toggleTopCardMenu"
                @keydown.space.prevent="toggleTopCardMenu"
                :aria-label="t('memorisation.a11y.openReadingOptions')"
              >
                <i class="bi bi-three-dots-vertical"></i>
              </div>
              <transition name="dropdown-fade">
                <div v-if="topCardMenuOpen" class="top-card-menu">
                  <button
                    type="button"
                    class="top-card-menu-toggle top-card-menu-toggle--layout"
                    :class="{ active: readingViewMode === 'stacked' }"
                    :aria-pressed="readingViewMode === 'stacked' ? 'true' : 'false'"
                    @click.stop="setReadingViewMode('stacked'); topCardMenuOpen = false"
                  >
                    <i class="bi bi-view-stacked" aria-hidden="true"></i>
                    <span>{{ t('memorisation.view.stacked') }}</span>
                    <i v-if="readingViewMode === 'stacked'" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="top-card-menu-toggle top-card-menu-toggle--layout"
                    :class="{ active: readingViewMode === 'mushaf' }"
                    :aria-pressed="readingViewMode === 'mushaf' ? 'true' : 'false'"
                    @click.stop="setReadingViewMode('mushaf'); topCardMenuOpen = false"
                  >
                    <i class="bi bi-journal-richtext" aria-hidden="true"></i>
                    <span>{{ t('memorisation.view.mushaf') }}</span>
                    <i v-if="readingViewMode === 'mushaf'" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                  
                  
                  <button
                    v-if="readingViewMode === 'stacked'"
                    type="button"
                    class="top-card-menu-toggle"
                    :class="{ active: showTranslation }"
                    :aria-pressed="showTranslation ? 'true' : 'false'"
                    @click.stop="toggleReadingOption('translation')"
                  >
                    <i class="bi bi-translate" aria-hidden="true"></i>
                    <span>{{ t('memorisation.reading.translation') }}</span>
                    <i v-if="showTranslation" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="readingViewMode === 'stacked'"
                    type="button"
                    class="top-card-menu-toggle"
                    :class="{ active: showTransliteration }"
                    :aria-pressed="showTransliteration ? 'true' : 'false'"
                    @click.stop="toggleReadingOption('transliteration')"
                  >
                    <i class="bi bi-type" aria-hidden="true"></i>
                    <span>{{ t('memorisation.reading.transliteration') }}</span>
                    <i v-if="showTransliteration" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="readingViewMode === 'stacked'"
                    type="button"
                    class="top-card-menu-toggle"
                    :class="{ active: showWordByWord }"
                    :aria-pressed="showWordByWord ? 'true' : 'false'"
                    @click.stop="toggleReadingOption('wbw')"
                  >
                    <i class="bi bi-grid-3x2-gap" aria-hidden="true"></i>
                    <span>{{ t('memorisation.reading.wordByWord') }}</span>
                    <i v-if="showWordByWord" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="top-card-menu-toggle"
                    :class="{ active: tajweedEnabled }"
                    :aria-pressed="tajweedEnabled ? 'true' : 'false'"
                    @click.stop="toggleTajweed"
                  >
                    <i class="bi bi-palette" aria-hidden="true"></i>
                    <span>{{ t('memorisation.reading.tajweed') }}</span>
                    <i v-if="tajweedEnabled" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                  </button>
                  <div class="top-card-menu-divider" aria-hidden="true"></div>
                  <a
                    :href="isAdmin ? adminDashboardUrl : learnerDashboardUrl"
                    class="top-card-menu-link"
                    data-tour="dashboard"
                    @click.stop="topCardMenuOpen = false; isAdmin ? null : openDashboardView()"
                  >
                    <i class="bi bi-grid-1x2" aria-hidden="true"></i>
                    <span>{{ t('common.dashboard') }}</span>
                  </a>
                  <button type="button" @click="openOnboardingFromTopMenu">
                    <i class="bi bi-compass" aria-hidden="true"></i>
                    <span>{{ t('memorisation.revisitOnboarding') }}</span>
                  </button>
                  <button @click="toggleFullScreen(); topCardMenuOpen = false" type="button">
                    <i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>
                    <span>{{ t('memorisation.reading.fullScreen') }}</span>
                  </button>
                </div>
              </transition>
            </div>
          </div>
          </div>
          </div>
          <div
            v-if="mobileProgressPills.length && !isPostSessionChoiceVisible"
            class="workspace-shell-progress-pills w-100"
            :aria-label="t('memorisation.a11y.sessionMetadata')"
          >
            <span
              v-for="item in mobileProgressPills"
              :key="item.key"
              class="badge rounded-pill workspace-shell-progress-pill"
              :title="`${item.label}: ${item.value}`"
              :aria-label="`${item.label}: ${item.value}`"
            >{{ item.value }}</span>
          </div>
          </template>
          <div
            v-else-if="showSessionOverviewIdleActions"
            class="workspace-shell-idle"
            :class="{
              'workspace-shell-idle--fresh': showIdleQuickStartChoices,
              'workspace-shell-idle--continuing': !showIdleQuickStartChoices,
            }"
          >
            <div class="workspace-shell-idle-watermark" aria-hidden="true"></div>
            <div class="workspace-shell-idle-inner">
              <div class="workspace-shell-idle-main">
                <div class="workspace-shell-copy">
                  <span class="workspace-shell-kicker">{{ workspaceIdleKicker }}</span>
                  <h1 class="workspace-shell-main-title">
                    <template v-if="workspaceIdleSurahLatin">
                      <span class="workspace-shell-idle-title-en" lang="en">{{ workspaceIdleSurahLatin }}</span>
                      <span
                        v-if="workspaceIdleSurahArabic && workspaceIdleSurahArabic !== workspaceIdleSurahLatin"
                        class="workspace-shell-idle-title-ar"
                        dir="rtl"
                        lang="ar"
                      >{{ workspaceIdleSurahArabic }}</span>
                    </template>
                    <template v-else>{{ workspaceIdleTitle }}</template>
                  </h1>
                  <p v-if="workspaceIdleDesc" class="workspace-shell-lead">{{ workspaceIdleDesc }}</p>
                  <p v-if="workspaceIdleInstruction" class="workspace-shell-idle-note">{{ workspaceIdleInstruction }}</p>
                  <div
                    v-if="workspaceJourneyStatChips.length && !showIdleQuickStartChoices"
                    class="workspace-shell-idle-chips"
                    role="list"
                    :aria-label="t('memorisation.workspaceJourney.aria')"
                  >
                    <span
                      v-for="chip in workspaceJourneyStatChips"
                      :key="chip.key"
                      class="workspace-shell-idle-chip"
                      role="listitem"
                    >{{ chip.label }}</span>
                  </div>
                </div>
                <div
                  class="workspace-shell-idle-actions"
                  :class="{
                    'workspace-shell-idle-actions--fresh': showIdleQuickStartChoices,
                    'workspace-shell-idle-actions--continuing': !showIdleQuickStartChoices,
                  }"
                >
                  <div
                    v-if="showIdleQuickStartChoices"
                    class="workspace-shell-idle-quickstart"
                    role="group"
                    :aria-label="t('memorisation.a11y.sessionSetup')"
                  >
                    <button
                      class="workspace-shell-idle-choice workspace-shell-idle-choice--primary"
                      type="button"
                      @click="startJourneyFromBeginning"
                    >
                      <span class="workspace-shell-idle-choice__icon" aria-hidden="true">
                        <i class="bi bi-stars"></i>
                      </span>
                      <span class="workspace-shell-idle-choice__body">
                        <strong>{{ t('memorisation.workspaceEmpty.startBeginning') }}</strong>
                        <span>{{ t('memorisation.workspaceEmpty.startBeginningHint') }}</span>
                      </span>
                      <i class="bi workspace-shell-idle-choice__chevron" :class="isRtlLocale ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
                    </button>
                    <button
                      class="workspace-shell-idle-choice"
                      type="button"
                      @click="chooseJourneyStart"
                    >
                      <span class="workspace-shell-idle-choice__icon" aria-hidden="true">
                        <i class="bi bi-journal-richtext"></i>
                      </span>
                      <span class="workspace-shell-idle-choice__body">
                        <strong>{{ t('memorisation.workspaceEmpty.chooseStart') }}</strong>
                        <span>{{ t('memorisation.workspaceEmpty.chooseStartHint') }}</span>
                      </span>
                      <i class="bi workspace-shell-idle-choice__chevron" :class="isRtlLocale ? 'bi-chevron-left' : 'bi-chevron-right'" aria-hidden="true"></i>
                    </button>
                  </div>
                  <div
                    v-else-if="showHeaderSessionAction"
                    class="workspace-shell-idle-actions__start workspace-shell-idle-actions__start--inline"
                  >
                    <div
                      class="action-btn primary session-idle-action session-primary-action"
                      role="button"
                      tabindex="0"
                      :aria-disabled="headerSessionActionDisabled ? 'true' : 'false'"
                      :aria-busy="headerSessionActionBusy ? 'true' : 'false'"
                      :class="{ 'is-disabled': headerSessionActionDisabled, 'is-loading': headerSessionActionBusy }"
                      @click="handleHeaderSessionAction"
                      @keydown.enter.prevent="handleHeaderSessionAction"
                      @keydown.space.prevent="handleHeaderSessionAction"
                      :title="headerSessionActionLabel"
                      :aria-label="headerSessionActionLabel"
                    >
                      <i class="bi" :class="headerSessionActionIcon" aria-hidden="true"></i>
                      <span>{{ headerSessionActionLabel }}</span>
                    </div>
                  </div>
                  <nav
                    v-if="isLoggedIn && (shouldShowWorkspaceJourney || showIdleQuickStartChoices)"
                    class="workspace-shell-idle-links"
                    :class="{
                      'workspace-shell-idle-links--toolbar': !showIdleQuickStartChoices && (journeyHasStarted || hasMemorisationHistory),
                    }"
                    :aria-label="t('memorisation.workspaceJourney.idleLinksLabel')"
                  >
                    <a
                      class="workspace-shell-text-link"
                      :href="learnerDashboardUrl"
                      data-tour="dashboard"
                      :title="t('memorisation.workspaceJourney.openDashboardHint')"
                      @click.prevent="openDashboardView"
                    >
                      <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
                      <span>{{ t('memorisation.workspaceJourney.openDashboard') }}</span>
                    </a>
                    <template v-if="journeyHasStarted || hasMemorisationHistory">
                      <span class="workspace-shell-text-link-sep" aria-hidden="true">·</span>
                      <button
                        type="button"
                        class="workspace-shell-text-link"
                        :title="t('memorisation.workspaceJourney.chooseDifferentHint')"
                        @click="openNewSessionSetup"
                      >
                        <i class="bi bi-sliders" aria-hidden="true"></i>
                        <span>{{ t('memorisation.workspaceJourney.chooseDifferent') }}</span>
                      </button>
                    </template>
                  </nav>
                </div>
              </div>
              <aside
                v-if="showIdleAsidePanel"
                class="workspace-shell-idle-aside"
                :aria-label="workspaceIdleSurahProgress ? t('memorisation.workspaceJourney.surahProgressAria') : undefined"
              >
                <div
                  v-if="workspaceIdleSurahProgress"
                  class="workspace-shell-idle-ring"
                  role="progressbar"
                  :aria-valuenow="workspaceIdleSurahProgress.percent"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuetext="workspaceIdleSurahProgress.ariaText"
                  :style="{ '--idle-ring-progress': workspaceIdleSurahProgress.percent }"
                >
                  <div class="workspace-shell-idle-ring__inner">
                    <strong>{{ workspaceIdleSurahProgress.memorised }}</strong>
                    <span class="workspace-shell-idle-ring__total">/ {{ workspaceIdleSurahProgress.total }}</span>
                  </div>
                </div>
                <div
                  v-if="workspaceIdleSurahProgress"
                  class="workspace-shell-idle-aside-meta"
                >
                  <p class="workspace-shell-idle-ring__label">
                    {{ workspaceIdleSurahProgress.caption }}
                  </p>
                  <p class="workspace-shell-idle-ring__percent">
                    {{ workspaceIdleSurahProgress.percent }}%
                  </p>
                </div>
                <div
                  v-if="!showIdleQuickStartChoices && showHeaderSessionAction"
                  class="workspace-shell-idle-aside-cta"
                >
                  <div
                    class="action-btn primary session-idle-action session-primary-action"
                    role="button"
                    tabindex="0"
                    :aria-disabled="headerSessionActionDisabled ? 'true' : 'false'"
                    :aria-busy="headerSessionActionBusy ? 'true' : 'false'"
                    :class="{ 'is-disabled': headerSessionActionDisabled, 'is-loading': headerSessionActionBusy }"
                    @click="handleHeaderSessionAction"
                    @keydown.enter.prevent="handleHeaderSessionAction"
                    @keydown.space.prevent="handleHeaderSessionAction"
                    :title="headerSessionActionLabel"
                    :aria-label="headerSessionActionLabel"
                  >
                    <i class="bi" :class="headerSessionActionIcon" aria-hidden="true"></i>
                    <span>{{ headerSessionActionLabel }}</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
        <p v-if="chainingSetupBlocking" class="workspace-setup-hint workspace-setup-hint-warning" role="status">
          <span>{{ t('memorisation.techniques.chainingMethodRequired') }}</span>
          <button type="button" class="workspace-setup-hint-action" @click="guideChainingSetup">
            {{ t('memorisation.techniques.chooseChainingMethod') }}
          </button>
        </p>
        <div
          v-if="hasVerses && !isMobileViewport() && (topCardMetadataPills.length || isPostSessionChoiceVisible)"
          class="workspace-shell-bottom"
          :class="{ 'workspace-shell-bottom--post-session': isPostSessionChoiceVisible }"
        >
          <!-- Source-guard reference: class="workspace-header-view-controls quick-right-controls" -->
          <div
            v-if="topCardMetadataPills.length"
            class="workspace-shell-bottom-pills"
          >
            <div
              class="workspace-shell-metadata d-flex flex-nowrap gap-2"
              :aria-label="t('memorisation.a11y.sessionMetadata')"
            >
              <span
                v-for="item in topCardMetadataPills"
                :key="item.key"
                class="badge rounded-pill workspace-shell-metadata-pill is-readonly"
                :data-session-chapter="item.key === 'surah' || item.key === 'range' ? (Number(chapterId || currentConfig?.chapterId || 0) || null) : null"
                :data-ayah-range="item.key === 'range' ? `${Number(rangeStart || currentConfig?.rangeStart || 0) || ''}-${Number(rangeEnd || currentConfig?.rangeEnd || 0) || ''}` : null"
                aria-disabled="true"
              >
                <strong>{{ item.label }}:</strong>
                <span>{{ item.value }}</span>
              </span>
            </div>
          </div>
          <div
            class="workspace-shell-reading-toggles workspace-shell-font-control"
            :aria-label="`${t('memorisation.view.stacked')} / ${t('memorisation.view.mushaf')}`"
          >
            <div
              class="workspace-layout-toggle view-mode-toggle"
              role="group"
              :aria-label="`${t('memorisation.view.stacked')} / ${t('memorisation.view.mushaf')}`"
            >
              <button
                type="button"
                class="view-mode-btn workspace-layout-btn"
                :class="{ active: readingViewMode === 'stacked' }"
                :aria-pressed="readingViewMode === 'stacked' ? 'true' : 'false'"
                @click.stop="setReadingViewMode('stacked')"
                :title="t('memorisation.view.stackedHint')"
              >
                <i class="bi bi-view-stacked" aria-hidden="true"></i>
                <span>{{ t('memorisation.view.stacked') }}</span>
              </button>
              <button
                type="button"
                class="view-mode-btn workspace-layout-btn"
                :class="{ active: readingViewMode === 'mushaf' }"
                :aria-pressed="readingViewMode === 'mushaf' ? 'true' : 'false'"
                @click.stop="setReadingViewMode('mushaf')"
                :title="t('memorisation.view.mushafHint')"
              >
                <i class="bi bi-journal-richtext" aria-hidden="true"></i>
                <span>{{ t('memorisation.view.mushaf') }}</span>
              </button>
              
              
            </div>
          </div>
        </div>
        <div v-if="reviewPriorityLabel" class="workspace-shell-compact-meta">
          <span>{{ reviewPriorityLabel }}</span>
        </div>


</section>

          <div v-if="showWorkspaceRefreshSpinner" class="loading-spinner" :class="{ 'is-reciter-refresh': workspaceRefreshReason === 'reciter' }">
            <i class="bi bi-hourglass-split"></i>
            <span>{{ workspaceLoadingLabel }}</span>
          </div>
          <div
            v-if="isDataReady && practiceTurnCalloutVisible && !talqinRecitationTurnActive"
            class="practice-turn-callout practice-turn-callout--tracked"
            :style="practiceTurnCalloutStyle"
            role="status"
            aria-live="polite"
          >
            <i class="bi bi-mic" aria-hidden="true"></i>
            <span>{{ practiceTurnCalloutMessage }}</span>
          </div>

          <main v-if="isDataReady && !isOnboardingExperienceActive && !isWelcomeBackWorkspaceHidden && shouldShowWorkspaceMain" id="memorisationWorkspaceMain" ref="workspaceMain" class="workspace-main"
            data-tour="workspace-main"
            :aria-label="t('memorisation.a11y.memorisationWorkspace')">
            <!-- Source-guard references:
              <button v-if="!hasVerses" class="action-btn primary" type="button" @click="openAdvancedControls">
              :aria-label="t('memorisation.open_controls')"
              v-if="!isSessionCompleted && hasSessionStarted && topCardAppliedPills.length" v-show="!mainCardCollapsed" class="workspace-quick-controls"
            -->
            <section v-if="shouldShowWorkspaceEmptyState" class="workspace-empty-state" :aria-label="t('memorisation.a11y.sessionSetup')">
              <div class="workspace-empty-card">
                <span class="workspace-empty-kicker">{{ t('memorisation.workspaceEmpty.kicker') }}</span>
                <h2>{{ t('memorisation.workspaceEmpty.title') }}</h2>
                <p>{{ t('memorisation.workspaceEmpty.desc') }}</p>
                <p class="workspace-empty-instruction">{{ t('memorisation.workspaceEmpty.instruction') }}</p>
                <div class="workspace-empty-actions">
                  <button class="action-btn primary" type="button" @click="openNewSessionSetup">
                    {{ t('memorisation.open_session_setup') }}
                  </button>
                </div>
              </div>
            </section>
            <div v-else-if="shouldShowReadingWorkspace && readingViewMode === 'mushaf'" class="mushaf-workspace">
              <div class="container-fluid mushaf-workspace__fluid px-0">
              <section
                class="mushaf-shell"
                :aria-label="t('memorisation.view.mushaf')"
              >
                <div ref="mushafViewport" class="mushaf-viewport-scroll">
                  <div v-if="madaniPagesError" class="mushaf-empty-page mushaf-empty-page--error">
                    <AppStatus
                      :variant="networkOnline === false ? 'offline' : 'error'"
                      fill
                      compact
                      :title="networkOnline === false ? t('common.status.offlineTitle') : t('memorisation.mushafLoad.errorTitle')"
                      :description="networkOnline === false ? t('common.status.offlineDesc') : t('memorisation.mushafLoad.errorDesc')"
                      :action-label="t('memorisation.mushafLoad.retry')"
                      :secondary-action-label="t('memorisation.mushafLoad.switchStacked')"
                      @action="ensureMadaniPagesLoaded({ force: true })"
                      @secondary-action="setReadingViewMode('stacked')"
                    />
                  </div>
                  <div v-else-if="!currentMushafPage" class="mushaf-empty-page">
                    <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                    <strong>{{ workspaceLoadingLabel }}</strong>
                    <span>{{ t('memorisation.common.mushafSyncMessage') }}</span>
                  </div>
                  <article
                    v-else
                    :key="`${currentMushafPage.id}-${safeMushafPageIndex}-${mushafSessionSignature}-${defaultFontSize}-${tajweedEnabled}-${quranFont}`"
                    class="mushaf-page mushaf-page--madani"
                    :style="{ '--verse-font-percent': String(defaultFontSize), '--mushaf-quran-font': quranFontFamily, '--mushaf-selected-font': quranFontFamily }"
                  >
                    <div
                      class="mushaf-page-body madani-page-sheet"
                      dir="rtl"
                      :class="{
                        'madani-page-sheet--glyphs-ready': useMadaniQcfGlyphs && !!madaniFontsReady[currentMushafPage.pageNumber],
                        'madani-page-sheet--unicode': !useMadaniQcfGlyphs,
                        'madani-page-sheet--tajweed': !!tajweedEnabled && useMadaniQcfGlyphs,
                        'word-by-word-meanings': false,
                        'recitation-word-review-active': !!(mushafAidVerse && shouldShowRecitationReviewHighlights(mushafAidVerse.key))
                      }"
                      :style="{
                        '--verse-font-percent': String(defaultFontSize),
                        '--madani-page-font': `'${currentMushafPage.fontFamily || ('p' + currentMushafPage.pageNumber + (tajweedEnabled ? '-v4' : '-v2'))}'`,
                        '--mushaf-selected-font': quranFontFamily
                      }"
                    >
                      <div
                        v-for="line in currentMadaniLines"
                        :key="line.key"
                        class="madani-line"
                        :class="[
                          `madani-line--${line.type}`,
                          {
                            'madani-line--empty': line.type === 'empty',
                            // Never put basmala_ayah in --glyphs: that class uses display:contents
                            // and would pull the Bismillah back into the continuous ayah flow.
                            'madani-line--glyphs': line.useGlyphs && line.fontReady && line.type === 'ayah',
                            'madani-line--ayah': line.type === 'ayah',
                            'madani-line--basmala-ayah': line.type === 'basmala_ayah'
                          }
                        ]"
                        :data-line-number="line.lineNumber"
                      >
                        <template v-if="line.type === 'surah_name'">
                          <span
                            class="madani-surah-name"
                            :style="{ fontFamily: `'${surahNamesFontFamily}'` }"
                            aria-hidden="true"
                          >{{ line.glyphText }}</span>
                          <span class="sr-only">{{ mushafSurahTitle }}</span>
                        </template>
                        <template v-else-if="line.type === 'basmala'">
                          <div
                            class="madani-basmala"
                            dir="rtl"
                            lang="ar"
                            :aria-label="t('memorisation.a11y.bismillah')"
                          >بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
                        </template>
                        <template v-else-if="line.type === 'ayah' || line.type === 'basmala_ayah'">
                          <span
                            v-for="(word, wordIndex) in sessionMadaniLineWords(line)"
                            :key="`${line.key}-w-${word.position || wordIndex}-${word.verseKey}`"
                            class="madani-word"
                            :class="madaniWordClassList(word)"
                            :data-verse-key="word.verseKey"
                            :data-session-word="'1'"
                            :data-word-index="word.wordIndex != null ? word.wordIndex : null"
                            :data-practice-focus="word.isPracticeFocus ? 'true' : null"
                            :title="word.meaningLabel || null"
                            :style="word.useGlyph ? { fontFamily: `'${line.fontFamily}'` } : null"
                            role="button"
                            tabindex="0"
                            @click="onMadaniWordClick(word)"
                            @mouseenter="onMadaniWordEnter(word)"
                            @mouseleave="onMadaniWordLeave(word)"
                            @touchstart.passive="onMadaniWordTouchStart($event, word)"
                            @touchend.passive="onMadaniWordTouchEnd($event, word)"
                            @touchcancel.passive="clearTouchPeek"
                            @keydown.enter.prevent="onMadaniWordClick(word)"
                            @keydown.space.prevent="onMadaniWordClick(word)"
                            v-html="word.html"
                          ></span>
                        </template>
                      </div>
                      <div v-if="madaniPagesLoading && !currentMadaniLines.length" class="madani-page-loading">
                        <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                        <span>{{ workspaceLoadingLabel }}</span>
                      </div>
                    </div>

                    <div
                      v-if="mushafAidVerse && activeWordTooltip"
                      class="mushaf-verse-aids"
                    >
                      <div v-if="activeWordTooltip?.text" class="mushaf-word-tooltip" dir="ltr" lang="en">
                        {{ activeWordTooltip.text }}
                      </div>
                    </div>
                  </article>
                </div>
              </section>
              </div>
            </div>
            <div v-else-if="shouldShowReadingWorkspace" class="verses-grid">
              <div v-for="verse in verses" :key="verse.key" :data-verse-key="verse.key" class="verse-card" :class="{
                active: isVerseVisuallyActive(verse.key),
                'serious-training': false,
                'hifz-ayah-new': isNewHifzAyah(verse.key),
                'hifz-ayah-due': isDueHifzAyah(verse.key),
                'hifz-ayah-weak': isWeakAyah(verse.key) && !isMasteredAyah(verse.key),
                'hifz-ayah-mastered': isMasteredAyah(verse.key),
                'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key),
                'peek-revealed': isVersePeekRevealed(verse.key),
                'ai-recitation-active': shouldShowRecitationReviewHighlights(verse.key)
              }" @click="onVerseCardClick(verse)" role="button" tabindex="0" @mouseenter="onVersePeekEnter(verse.key)"
                @mouseleave="onVersePeekLeave(verse.key)" @touchstart.passive="onVerseTouchStart($event, verse.key)"
                @touchmove.passive="clearTouchPeek"
                @touchend.passive="onVerseTouchEnd($event, verse.key)" @touchcancel.passive="clearTouchPeek"
                @keydown.enter.prevent="onVerseCardClick(verse)" @keydown.space.prevent="onVerseCardClick(verse)"
                :aria-label="isVerseVisuallyActive(verse.key) ? t('memorisation.a11y.openActiveAyah', { number: verse.number }) : t('memorisation.a11y.openAyah', { number: verse.number })">
                <div class="verse-header">
                  <div class="verse-badges">
                    <span class="verse-number verse-ayah-pill">{{ t('memorisation.a11y.ayahNumberLabel', { number: resolveVerseAyahNumber(verse) || verse.number }) }}</span>
                    <span v-if="isVerseVisuallyActive(verse.key)" class="verse-status-badge verse-status-badge-active">{{ t('memorisation.badges.active') }}</span>
                    <span v-if="isNewHifzAyah(verse.key)" class="verse-status-badge verse-status-badge-new">{{ t('memorisation.badges.new') }}</span>
                    <span v-if="isMasteredAyah(verse.key)" class="verse-status-badge verse-status-badge-mastered">{{ t('memorisation.badges.steady') }}</span>
                    <span
                      v-if="getPracticeFocusWordsForVerse(verse.key).length"
                      class="verse-status-badge verse-status-badge-focus"
                    >{{ t('memorisation.postSession.coach.live.focusBadge') }}</span>
                  </div>
                  <div class="verse-actions" dir="ltr">
                    <button class="verse-inline-action-btn verse-inline-download-btn" type="button"
                      @click.stop="downloadVerseAudio(verse)"
                      :disabled="!resolveAyahAudioUrl(verse)"
                      :title="t('memorisation.offlineDownload.buttonHint')"
                      :aria-label="t('memorisation.offlineDownload.buttonHint')">
                      <i class="bi bi-download" aria-hidden="true"></i>
                    </button>
                    <button class="verse-inline-action-btn verse-inline-play-btn" type="button"
                      @click.stop="playAyahCardAudio(verse)"
                      :disabled="!resolveAyahAudioUrl(verse)"
                      :title="isAyahCardPlaying(verse) ? t('memorisation.a11y.pauseAyahAudio') : t('memorisation.a11y.playAyahAudio')"
                      :aria-label="isAyahCardPlaying(verse) ? t('memorisation.a11y.pauseAyahAudio') : t('memorisation.a11y.playAyahAudio')">
                      <i class="bi" :class="isAyahCardPlaying(verse) ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    </button>
                  </div>
                </div>

                <div class="verse-arabic verse-arabic-primary verse-arabic-with-end" dir="rtl" lang="ar" v-if="verse.arabic && isDataReady"
                  @click.stop
                  :key="`ar-${verse.key}-${practiceFocusSignature}-${tajweedEnabled ? 'tj' : 'plain'}-${quranFont}`"
                  v-html="getDisplayArabic(verse)" :class="{
                    'tajweed-enabled': tajweedEnabled,
                    'word-highlight-enabled': true,
                    'word-by-word-meanings': showWordByWord,
                    'verse-weak': isWeakAyah(verse.key),
                    'verse-mastered': isMasteredAyah(verse.key),
                    'verse-practice-focus': getPracticeFocusWordsForVerse(verse.key).length > 0,
                    'recitation-word-review-active': shouldShowRecitationReviewHighlights(verse.key)
                  }"                   :style="{
                    '--verse-font-percent': getVerseFontSize(verse.key),
                    '--quran-font': quranFontFamily,
                    'font-family': quranFontFamily
                  }">
                </div>
                <AppStatus
                  v-else-if="isDataReady"
                  class="verse-arabic-missing"
                  variant="unavailable"
                  size="sm"
                  compact
                  :title="t('memorisation.verseText.unavailableTitle')"
                  :description="t('memorisation.verseText.unavailableDesc')"
                  :action-label="t('common.retry')"
                  @action="loadVerses(currentMode)"
                />

                <!-- Keep in-workspace aids available, but visually quieter -->
                <!-- Source-guard references:
                  v-if="showWordByWord && verse.words && verse.words.length"
                  v-if="word.audio"
                -->
                <div v-if="showTransliteration && verse.transliteration" class="verse-aid-block" dir="ltr" lang="en">
                  <div class="verse-aid-title" dir="ltr" lang="en">{{ t('memorisation.reading.transliteration') }}</div>
                  <div class="verse-transliteration verse-aid" dir="ltr" lang="en">
                    {{ verse.transliteration }}
                  </div>
                  <p class="verse-aid-source" dir="ltr" lang="en">— {{ transliterationReference }}</p>
                </div>
                <div v-if="showTranslation && verse.translation" class="verse-aid-block" dir="ltr" lang="en">
                  <div class="verse-aid-title" dir="ltr" lang="en">{{ t('memorisation.reading.translation') }}</div>
                  <div class="verse-translation verse-aid" dir="ltr" lang="en">
                    {{ verse.translation }}
                  </div>
                  <p class="verse-aid-source" dir="ltr" lang="en">— {{ translationReference }}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <!-- Advanced Controls Drawer -->
      <div class="tools-backdrop" :class="{
        open: showTools,
        'onboarding-post-session-tools-backdrop': showPostSessionModal && postSessionOffcanvasOpen,
        'post-session-choice-tools-backdrop': isPostSessionChoiceVisible && postSessionChoiceOffcanvasOpen,
        'session-exit-tools-backdrop': showSessionExitModal && sessionExitOffcanvasOpen
      }" @click="closeToolsPanel" aria-hidden="true"></div>
      <aside
        v-if="toolsPanelMounted"
        id="memorisationToolsPanel"
        ref="toolsPanel"
        class="tools offcanvas-section h-100"
        :class="{
        open: showTools,
        'onboarding-post-session-tools': showPostSessionModal && postSessionOffcanvasOpen,
        'post-session-choice-tools': isPostSessionChoiceVisible && postSessionChoiceOffcanvasOpen,
        'session-exit-tools': showSessionExitModal && sessionExitOffcanvasOpen
      }"
        @click.stop role="dialog" aria-modal="true" aria-labelledby="memorisationToolsTitle"
        :aria-hidden="showTools ? 'false' : 'true'" tabindex="-1" @keydown="onToolsPanelKeydown">
        <div class="tools-top">
        <div class="tools-topbar">
          <div id="memorisationToolsTitle" class="tools-title">
            <h3><b>{{ t('common.controls') }}</b></h3>
          </div>
            <button class="tools-x" @click="closeToolsPanel" :aria-label="t('memorisation.a11y.closePanel')" type="button">
              <span class="tools-x-glyph" aria-hidden="true">&times;</span>
            </button>
          </div>
          <div
            v-if="shouldShowOffcanvasTabs"
            class="tools-tabs"
            role="tablist"
            :aria-label="t('memorisation.a11y.controlsTabs')"
          >
            <button role="tab" :aria-selected="tab === 'tools' ? 'true' : 'false'" :class="{ active: tab === 'tools' }"
              data-tour="setup-tab"
              @click.prevent="setActiveTab('tools')" :title="t('memorisation.a11y.setupTab')" type="button">
              <i class="bi bi-sliders"></i> {{ t('memorisation.tools.tabs.setup') }}
            </button>
            <button role="tab" :aria-selected="tab === 'techniques' ? 'true' : 'false'"
              :class="{ active: tab === 'techniques' }" data-tour="practice-tab" @click.prevent="setActiveTab('techniques')"
              :title="t('memorisation.a11y.practicePresets')" type="button">
              <i class="bi bi-stars"></i> {{ t('memorisation.practice') }}
            </button>
            <button role="tab" :aria-selected="tab === 'saved' ? 'true' : 'false'" :class="{ active: tab === 'saved' }"
              data-tour="saved-tab"
              @click.prevent="setActiveTab('saved')" :title="t('memorisation.a11y.savedSessions')" type="button">
              <i class="bi bi-clock-history"></i> {{ t('memorisation.saved') }}
            </button>
            <!-- <button v-if="isLoggedIn" role="tab" :aria-selected="tab === 'stats' ? 'true' : 'false'"
              :class="{ active: tab === 'stats' }" @click.prevent="setActiveTab('stats')" :title="t('memorisation.a11y.sessionInsights')"
              type="button">
              <i class="bi bi-bar-chart-line"></i> {{ t('memorisation.insights') }}
            </button> -->
            <!-- Settings tab hidden permanently; display/reading controls live in Setup and Techniques -->
          </div>
        </div>

        <div ref="toolsBody" class="tools-body compact">
          <!-- TOOLS TAB -->
          <div v-if="tab === 'tools'" class="sheet">
            <section class="sheet-section sheet-section-compact" data-tour="setup-sheet">
              <button class="sheet-toggle" @click="toggleSection('advanced_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-journal-text"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('sessionSetup.title') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-stack field-stack-compact setup-field-list">
                  <div class="field setup-field-row" data-tour="setup-surah">
                    <label><i class="bi bi-journal-text"></i> {{ t('sessionSetup.surah') }}</label>
                    <select :value="chapterId" @change="onChapterChange" class="select">
                      <option :value="0">{{ t('sessionSetup.chooseSurah') }}</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ chapterOptionLabel(c) }}</option>
                    </select>
                    <small class="field-hint">{{ t('sessionSetup.surahHint') }}</small>
                  </div>
                  <div class="field setup-field-row" data-tour="setup-range">
                    <label><i class="bi bi-bounding-box"></i> {{ t('sessionSetup.ayahRange') }}</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @input="adjustRange()" @change="adjustRange({ immediate: true })" min="1">
                      <span>{{ t('sessionSetup.to') }}</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @input="adjustRange()" @change="adjustRange({ immediate: true })" min="1">
                    </div>
                    <small class="field-hint">{{ t('sessionSetup.rangeHint') }}</small>
                  </div>
                  <div class="field setup-field-row">
                    <label><i class="bi bi-mic-fill"></i> {{ t('sessionSetup.reciter') }}</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select" :disabled="isWorkspaceRefreshing && workspaceRefreshReason === 'reciter'">
                      <optgroup v-if="recitersWithWordHighlight.length" :label="t('sessionSetup.recitersWithWordHighlight')">
                        <option v-for="r in recitersWithWordHighlight" :key="r.id" :value="r.id">{{ r.name }}</option>
                      </optgroup>
                      <optgroup v-if="recitersAudioOnly.length" :label="t('sessionSetup.recitersAudioOnly')">
                        <option v-for="r in recitersAudioOnly" :key="r.id" :value="r.id">{{ r.name }}</option>
                      </optgroup>
                    </select>
                    <small v-if="isWorkspaceRefreshing && workspaceRefreshReason === 'reciter'" class="field-hint field-hint-loading">
                      <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
                      {{ t('memorisation.loading.reciterRefresh') }}
                    </small>
                    <small v-else-if="!currentReciterSupportsWordHighlighting" class="field-hint">{{ t('sessionSetup.reciterNoWordHighlight') }}</small>
                    <small v-else class="field-hint">{{ t('sessionSetup.reciterHint') }}</small>
                  </div>
                  <div class="field field-repetitions-clean setup-field-row">
                    <div class="field-header">
                      <label><i class="bi bi-arrow-repeat"></i> {{ t('sessionSetup.repetitions') }}</label>
                      <span class="range-value-pill">{{ repetitionDisplayValue }}</span>
                    </div>
                    <div class="range-control">
                      <input type="range" :value="sliderRepetitionValue" :style="sessionRepetitionSliderStyle"
                        @input="setRepetitionsFromSlider(Number($event.target.value))" min="1" max="10" step="1"
                        class="input technique-range" :aria-valuetext="repetitionDisplayValue" />
                    </div>
                    <div class="slider-markers slider-markers-compact slider-markers-aligned">
                      <span
                        v-for="step in repetitionSliderSteps"
                        :key="`rep-${step}`"
                        :style="{ insetInlineStart: `${((Number(step) - 1) / 9) * 100}%` }"
                      >{{ step }}x</span>
                    </div>
                    <small class="field-hint">{{ Number(repetitionsPerStep) === 1 ? t('sessionSetup.repeatHintOne', { count: repetitionsPerStep }) : t('sessionSetup.repeatHintOther', { count: repetitionsPerStep }) }}</small>
                  </div>
                  <div
                    class="field field-individual-ayah field-individual-ayah-unified setup-field-row"
                    :class="{ 'is-enabled': individualAyahFocusEnabled }"
                  >
                    <div class="field-header individual-ayah-header">
                      <label for="individual-ayah-focus-toggle">
                        <i class="bi bi-pin-angle-fill" aria-hidden="true"></i>
                        {{ t('sessionSetup.individualAyah') }}
                      </label>
                      <span
                        role="switch"
                        id="individual-ayah-focus-toggle"
                        tabindex="0"
                        class="mode-radio individual-ayah-toggle"
                        :class="{ active: individualAyahFocusEnabled }"
                        :aria-checked="individualAyahFocusEnabled ? 'true' : 'false'"
                        :aria-label="t('sessionSetup.individualAyah')"
                        @click="setIndividualAyahFocusEnabled(!individualAyahFocusEnabled)"
                        @keydown.enter.prevent="setIndividualAyahFocusEnabled(!individualAyahFocusEnabled)"
                        @keydown.space.prevent="setIndividualAyahFocusEnabled(!individualAyahFocusEnabled)"
                      >
                        <i
                          class="mode-radio-icon bi"
                          :class="individualAyahFocusEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                          aria-hidden="true"
                        ></i>
                      </span>
                    </div>
                    <small class="field-hint individual-ayah-intro">{{ t('sessionSetup.individualAyahIntro') }}</small>
                    <template v-if="individualAyahFocusEnabled">
                      <select
                        :value="setupIndividualAyahNumber"
                        @change="setSetupIndividualAyah(Number($event.target.value))"
                        class="select individual-ayah-select"
                        :disabled="!chapterId || setupIndividualAyahOptions.length === 0 || chainingEnabled"
                        :aria-label="t('sessionSetup.individualAyah')"
                      >
                        <option v-for="option in setupIndividualAyahOptions" :key="`setup-individual-${option.value}`" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>
                      <div class="individual-ayah-repeat">
                        <div class="field-header individual-ayah-repeat-header">
                          <span class="individual-ayah-repeat-label">{{ t('sessionSetup.individualAyahRepeats') }}</span>
                          <span class="range-value-pill">{{ individualAyahRepeatDisplayValue }}</span>
                        </div>
                        <div class="range-control individual-ayah-range-control">
                          <input
                            type="range"
                            :value="individualAyahRepeatSliderValue"
                            :style="individualAyahRepeatSliderStyle"
                            @input="setIndividualAyahRepeatFromSlider(Number($event.target.value))"
                            min="1"
                            max="10"
                            step="1"
                            class="input technique-range individual-ayah-range"
                            :aria-valuetext="individualAyahRepeatDisplayValue"
                            :aria-label="t('sessionSetup.individualAyahRepeats')"
                            :disabled="!setupIndividualAyahKey || chainingEnabled"
                          />
                        </div>
                      </div>
                      <small class="field-hint">
                        {{ chainingEnabled
                          ? t('sessionSetup.individualAyahChainingDisabled')
                          : (setupIndividualAyahHasCustomRepeat
                            ? (Number(individualAyahRepeatSliderValue) === 1
                              ? t('sessionSetup.individualAyahRepeatHintOne', { count: individualAyahRepeatSliderValue })
                              : t('sessionSetup.individualAyahRepeatHintOther', { count: individualAyahRepeatSliderValue }))
                            : t('sessionSetup.individualAyahUsingSessionDefault', { count: sliderRepetitionValue })) }}
                      </small>
                      <button
                        v-if="setupIndividualAyahHasCustomRepeat"
                        type="button"
                        class="individual-ayah-clear"
                        @click="clearIndividualAyahRepeatOverride"
                      >{{ t('sessionSetup.individualAyahClearOverride') }}</button>
                      <small
                        v-if="setupIndividualAyahSelectionCount > 0"
                        class="field-hint individual-ayah-session-count"
                      >{{ setupIndividualAyahSelectedCountLabel }}</small>
                    </template>
                  </div>
                </div>
              </div>
            </section>
            <section class="sheet-section sheet-section-compact">
              <button class="sheet-toggle" @click="toggleSection('advanced_playback')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-mic"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('memorisation.audio.title') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_playback }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content offcanvas-audio-panel" v-show="sectionOpen.advanced_playback">
                <div class="field-stack field-stack-compact setup-field-list">
                  <div class="field setup-field-row">
                    <label>{{ t('memorisation.speed') }}</label>
                    <div class="radio-group radio-group-tight radio-group-compact">
                      <label class="radio" v-for="option in speedOptions" :key="`tool-speed-${option}`">
                        <input type="radio" name="session-playback-speed" :value="option" v-model.number="speed"
                          @change="setPlaybackSpeed(option)"> {{ option }}x
                      </label>
                    </div>
                    <small class="field-hint">{{ t('memorisation.use_slower_speed_for_early_memorisation') }}</small>
                  </div>
                  <div class="field setup-field-row">
                    <label>{{ t('memorisation.auto_advance') }}</label>
                    <div class="radio-group radio-group-tight radio-group-compact">
                      <label class="radio"><input type="radio" name="session-auto-advance" value="auto" v-model="playMode"> {{ t('common.yes') }}</label>
                      <label class="radio"><input type="radio" name="session-auto-advance" value="manual" v-model="playMode"> {{ t('common.no') }}</label>
                    </div>
                  </div>
                  <div v-if="talqinModeEnabled" class="field setup-field-row">
                    <label><i class="bi bi-hourglass-top"></i> {{ t('memorisation.recitation_window_secs') }}</label>
                    <select v-model.number="recitationWindowSeconds" class="select select-compact">
                      <option v-for="option in recitationWindowOptions" :key="`recitation-window-${option}`" :value="option">{{ option }}s</option>
                    </select>
                    <small class="field-hint">{{ t('memorisation.recitation_window_hint') }}</small>
                  </div>
                  <div class="field setup-field-row">
                    <label><i class="bi bi-hourglass-split"></i> {{ t('memorisation.delay_between_recitations_secs') }}</label>
                    <select v-model.number="delay" class="select">
                      <option v-for="option in delayOptions" :key="`tool-delay-${option}`" :value="option">{{ option }}s
                      </option>
                    </select>
                    <small class="field-hint">{{ t('memorisation.pause_before_each_next_repetition_recitation_in_au') }}</small>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- TECHNIQUES TAB -->
          <div v-if="tab === 'techniques'" class="sheet" data-tour="practice-sheet">
            <div class="technique-group-copy technique-group-beginner">
              <span class="technique-group-kicker">{{ t('memorisation.practiceTools.beginner') }}</span>
              <p>{{ t('memorisation.practiceTools.beginnerDesc') }}</p>
            </div>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('focus_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-bullseye"></i></span>
                  <span class="st-txt">
                    <span class="st-title technique-label-wrap">{{ getTechniqueDisplayLabel('focus') }}</span>
                    <span class="st-sub">{{ getTechniqueDisplaySummary('focus') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <span
                      role="switch"
                      tabindex="0"
                      class="mode-radio"
                      :class="{ active: focusModeEnabled }"
                      :aria-checked="focusModeEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.useFocusMode')"
                      @click.stop="toggleFocusModeRadio"
                      @keydown.enter.stop.prevent="toggleFocusModeRadio"
                      @keydown.space.stop.prevent="toggleFocusModeRadio"
                    >
                      <i class="mode-radio-icon bi" :class="focusModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"></i>
                    </span>
                  </div>
                  <span class="st-chev" :class="{ open: sectionOpen.focus_mode }">
                    <i class="bi bi-chevron-down"></i>
                  </span>
                </div>
              </button>
              <div class="sheet-content" v-show="sectionOpen.focus_mode">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ getTechniqueDisplayDescription('focus') }}</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>{{ t('memorisation.best_for_deep_memorisation_sessions') }}</span>
                    </div>
                  </div>
                  <div v-if="focusModeEnabled" class="field">
                    <label>{{ t('memorisation.focus_strength') }}</label>
                    <div class="range-control">
                      <input type="range" min="30" max="75" step="5" v-model.number="focusDimPercent" class="input">
                      <span class="inline-setting-pill">{{ focusDimPercent }}%</span>
                    </div>
                    <small class="field-hint">{{ t('memorisation.higher_values_dim_non_active_verses_more_aggressiv') }}</small>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('blur_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-cloud-haze2"></i></span>
                  <span class="st-txt">
                    <span class="st-title technique-label-wrap">{{ getTechniqueDisplayLabel('blur') }}</span>
                    <span class="st-sub">{{ getTechniqueDisplaySummary('blur') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <span
                      role="switch"
                      tabindex="0"
                      class="mode-radio"
                      :class="{ active: blurModeEnabled }"
                      :aria-checked="blurModeEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.useBlurMode')"
                      @click.stop="toggleBlurModeRadio"
                      @keydown.enter.stop.prevent="toggleBlurModeRadio"
                      @keydown.space.stop.prevent="toggleBlurModeRadio"
                    >
                      <i
                        class="mode-radio-icon bi"
                        :class="blurModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"
                      ></i>
                    </span>
                  </div>
                  <span class="st-chev" :class="{ open: sectionOpen.blur_mode }"><i
                      class="bi bi-chevron-down"></i></span>
                </div>
              </button>
              <div class="sheet-content" v-show="sectionOpen.blur_mode">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ getTechniqueDisplayDescription('blur') }}</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>{{ t('memorisation.best_for_active_recall_testing') }}</span>
                    </div>
                  </div>
                  <div v-if="blurModeEnabled" class="field">
                    <label>{{ t('memorisation.blur_intensity') }}</label>
                    <div class="range-control">
                      <input type="range" min="4" max="18" step="1" v-model.number="blurIntensity" class="input">
                      <span class="inline-setting-pill">{{ blurIntensity }}px</span>
                    </div>
                    <small class="field-hint">{{ t('memorisation.hold') }} <kbd>Space</kbd>{{ t('memorisation.hover_or_long_press_to_peek_temporarily') }}</small>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('talqin_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-soundwave"></i></span>
                  <span class="st-txt">
                    <span class="st-title technique-label-wrap">{{ getTechniqueDisplayLabel('talqin') }}</span>
                    <span class="st-sub">{{ getTechniqueDisplaySummary('talqin') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <span
                      id="talqin-mode-toggle"
                      role="switch"
                      tabindex="0"
                      class="mode-radio"
                      :class="{ active: talqinModeEnabled }"
                      :aria-checked="talqinModeEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.useTalqinMode')"
                      @click.stop="talqinModeEnabled = !talqinModeEnabled"
                      @keydown.enter.stop.prevent="talqinModeEnabled = !talqinModeEnabled"
                      @keydown.space.stop.prevent="talqinModeEnabled = !talqinModeEnabled"
                    >
                      <i class="mode-radio-icon bi" :class="talqinModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i>
                    </span>
                  </div>
                  <span class="st-chev" :class="{ open: sectionOpen.talqin_mode }"><i class="bi bi-chevron-down"></i></span>
                </div>
              </button>
              <div class="sheet-content" v-show="sectionOpen.talqin_mode">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ getTechniqueDisplayDescription('talqin') }}</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>{{ t('memorisation.talqinMode.bestFor') }}</span>
                    </div>
                    <small class="field-hint">{{ t('memorisation.talqinMode.hint') }}</small>
                  </div>
                </div>
              </div>
            </section>

            <div class="technique-group-copy technique-group-advanced">
              <span class="technique-group-kicker">{{ t('memorisation.practiceTools.advanced') }}</span>
              <p>{{ t('memorisation.practiceTools.advancedDesc') }}</p>
            </div>
            
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('chaining')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-link-45deg"></i></span>
                  <span class="st-txt">
                    <span class="st-title technique-label-wrap">{{ getTechniqueDisplayLabel('chaining') }}</span>
                    <span class="st-sub">{{ chainingMethodDescription }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <span
                      role="switch"
                      tabindex="0"
                      class="mode-radio"
                      :class="{ active: chainingEnabled }"
                      :aria-checked="chainingEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.useChaining')"
                      @click.stop="toggleChainingRadio"
                      @keydown.enter.stop.prevent="toggleChainingRadio"
                      @keydown.space.stop.prevent="toggleChainingRadio"
                    >
                      <i
                        class="mode-radio-icon bi"
                        :class="chainingEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"
                      ></i>
                    </span>
                  </div>
                  <span class="st-chev" :class="{ open: sectionOpen.chaining }"><i
                      class="bi bi-chevron-down"></i></span>
                </div>
              </button>
              <div class="sheet-content" v-show="sectionOpen.chaining">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ chainingEnabled
                        ? (hasChainingMethodSelected
                          ? (chainingMethod === 'cumulative'
                            ? t('memorisation.techniques.chainingCumulativeDescription')
                            : t('memorisation.techniques.chainingLinkingDescription'))
                          : t('memorisation.techniques.chooseLinkingForPreview'))
                        : getTechniqueDisplayDescription('chaining') }}</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>{{ t('memorisation.best_for_building_long_passages') }}</span>
                    </div>
                  </div>
                  <div v-if="chainingEnabled" class="field">
                    <label>{{ t('common.method') }}</label>
                    <div class="radio-group techniques-choice-group">
                      <label class="radio">
                        <input type="radio" value="linking" :checked="chainingMethod === 'linking'"
                          @change="setChainingMethod('linking')">
                        {{ t('memorisation.linking') }}
                      </label>
                      <label class="radio">
                        <input type="radio" value="cumulative" :checked="chainingMethod === 'cumulative'"
                          @change="setChainingMethod('cumulative')">
                        {{ t('memorisation.cumulative') }}
                      </label>
                    </div>
                    <small class="field-hint">{{ hasChainingMethodSelected
                      ? (chainingMethod === 'linking'
                        ? t('memorisation.techniques.chainingLinkingHint')
                        : t('memorisation.techniques.chainingCumulativeHint'))
                      : 'Choose linking or cumulative before starting.' }}</small>
                  </div>
                  <div v-if="chainingEnabled" class="field">
                    <label>{{ t('memorisation.repeats_per_step') }}</label>
                    <div class="range-control">
                      <input type="range" min="1" max="5" step="1" :value="chainingRepetitions"
                        @input="setChainingRepetitions(Number($event.target.value))" class="input">
                      <span class="inline-setting-pill">{{ chainingRepetitions }}</span>
                    </div>
                    <small class="field-hint">{{ t('memorisation.number_of_times_to_repeat_each_chaining_step') }}</small>
                  </div>
                  <div v-if="chainingEnabled" class="technique-preview-block">
                    <i class="bi bi-eye"></i>
                    <span>{{ chainingMethodPreview }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('anchor_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-pin-angle-fill"></i></span>
                  <span class="st-txt">
                    <span class="st-title technique-label-wrap">{{ getTechniqueDisplayLabel('anchor') }}</span>
                    <span class="st-sub">{{ getTechniqueDisplaySummary('anchor') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <span
                      role="switch"
                      tabindex="0"
                      class="mode-radio"
                      :class="{ active: anchorModeEnabled }"
                      :aria-checked="anchorModeEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.useAnchorMode')"
                      @click.stop="toggleAnchorModeRadio"
                      @keydown.enter.stop.prevent="toggleAnchorModeRadio"
                      @keydown.space.stop.prevent="toggleAnchorModeRadio"
                    >
                      <i
                        class="mode-radio-icon bi"
                        :class="anchorModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"
                      ></i>
                    </span>
                  </div>
                  <span class="st-chev" :class="{ open: sectionOpen.anchor_mode }"><i
                      class="bi bi-chevron-down"></i></span>
                </div>
              </button>
              <div class="sheet-content" v-show="sectionOpen.anchor_mode">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ getTechniqueDisplayDescription('anchor') }}</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>{{ t('memorisation.best_for_memorising_key_vocabulary') }}</span>
                    </div>
                  </div>
                  <div v-if="anchorModeEnabled" class="field">
                    <label>{{ t('memorisation.anchor_points_per_ayah') }}</label>
                    <select v-model.number="anchorCount" @change="onAnchorCountChange" class="select">
                      <option :value="1">1 anchor (center word)</option>
                      <option :value="2">2 anchors (first + last)</option>
                    </select>
                    <small class="field-hint">{{ anchorModeDescription }}</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- <section class="sheet-section retention-check-section">
              <button class="sheet-toggle" @click="toggleSection('quiz_lab')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-ui-checks-grid"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('memorisation.quiz.title') }}</span>
                    <span class="st-sub">{{ t('memorisation.quiz.builderSubtitle') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.quiz_lab }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.quiz_lab">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ t('memorisation.quiz.setupHint') }}</span>
                    </div>
                  </div>
                  <div class="field">
                    <label>{{ t('common.method') }}</label>
                    <div class="radio-group">
                      <label class="radio" v-for="option in quizModeOptions" :key="`quiz-mode-${option.value}`">
                        <input type="radio" name="quiz-mode" :value="option.value" v-model="quizType">
                        {{ option.label }}
                      </label>
                    </div>
                  </div>
                  <div class="field">
                    <label>{{ t('memorisation.quiz.focus') }}</label>
                    <div class="radio-group">
                      <label class="radio" v-for="option in quizFocusOptions" :key="`quiz-focus-${option.value}`">
                        <input type="radio" name="quiz-focus" :value="option.value" v-model="quizFocus">
                        {{ option.label }}
                      </label>
                    </div>
                  </div>
                  <div class="field">
                    <label>{{ t('memorisation.quiz.questionCount') }}</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio" v-for="count in quizLengthOptions" :key="`quiz-count-${count}`">
                        <input type="radio" name="quiz-count" :value="count" v-model.number="quizLength">
                        {{ count }}
                      </label>
                    </div>
                    <small v-if="!hasVerses" class="field-hint">{{ t('toasts.noVersesToQuizOn') }}</small>
                  </div>
                  <button class="tools-btn tools-btn-primary quiz-launch-btn" type="button" :disabled="!hasVerses"
                    @click="openRetentionQuiz">
                    <i class="bi bi-ui-checks-grid"></i><span>{{ t('memorisation.quiz.launch') }}</span>
                  </button>
                </div>
              </div>
            </section> -->
          </div>

          <!-- SAVED TAB -->
          <div v-if="tab === 'saved'" class="sheet saved-sheet saved-sheet--beige" data-tour="saved-sheet">
            <header class="saved-sheet__header">
              <div class="saved-sheet__header-copy">
                <h3 class="saved-sheet__title">{{ t('memorisation.saved_sessions') }}</h3>
                <p class="saved-sheet__intro">{{ t('memorisation.saved_sessions_intro') }}</p>
              </div>
              <div v-if="savedSessions.length > 0" class="saved-sheet__toolbar">
                <button
                  type="button"
                  class="saved-sheet__toolbar-btn"
                  :class="{ 'is-active': savedSelectMode }"
                  @click="toggleSavedSelectMode"
                >
                  <i class="bi" :class="savedSelectMode ? 'bi-x-lg' : 'bi-check2-square'" aria-hidden="true"></i>
                  <span>{{ savedSelectMode ? (t('common.cancel') || 'Cancel') : (t('memorisation.selectSessions') || 'Select') }}</span>
                </button>
                <button
                  v-if="savedSelectMode"
                  type="button"
                  class="saved-sheet__toolbar-btn"
                  @click="toggleSelectAllSavedSessions"
                >
                  <i class="bi bi-list-check" aria-hidden="true"></i>
                  <span>{{ allSavedSessionsSelected ? (t('memorisation.deselectAll') || 'Deselect all') : (t('memorisation.selectAll') || 'Select all') }}</span>
                </button>
                <button
                  v-if="savedSelectMode"
                  type="button"
                  class="saved-sheet__toolbar-btn saved-sheet__toolbar-btn--danger"
                  :disabled="!selectedSavedSessionIds.length"
                  @click="deleteSelectedSavedSessions"
                >
                  <i class="bi bi-trash3" aria-hidden="true"></i>
                  <span>{{ t('memorisation.deleteSelected') || 'Delete' }}{{ selectedSavedSessionIds.length ? ` (${selectedSavedSessionIds.length})` : '' }}</span>
                </button>
              </div>
            </header>

            <section v-if="hasVerses" class="saved-sheet__card saved-sheet__card--current" :aria-label="t('memorisation.a11y.currentSession')">
              <div class="saved-sheet__current-copy">
                <span class="saved-sheet__eyebrow">{{ t('memorisation.current_session') }}</span>
                <strong>{{ getChapterDisplayName(currentChapter) || t('memorisation.no_surah_selected') }}</strong>
                <small>{{ rangeStart }}–{{ rangeEnd }}</small>
              </div>
              <button class="saved-sheet__save-btn" @click="saveCurrentSessionWithName()" type="button">
                <i class="bi bi-bookmark-plus" aria-hidden="true"></i>
                <span>{{ t('common.save') }}</span>
              </button>
            </section>

            <section
              class="saved-sheet__groups"
              :aria-label="t('memorisation.a11y.savedSessions')"
            >
              <div
                v-for="group in savedSessionGroups"
                :key="group.key"
                class="saved-sheet__group"
              >
                <button
                  type="button"
                  class="saved-sheet__group-toggle"
                  :class="{ 'is-active': savedActiveSection === group.key }"
                  :aria-selected="savedActiveSection === group.key ? 'true' : 'false'"
                  :aria-expanded="sectionOpen[group.key] ? 'true' : 'false'"
                  :aria-controls="`saved-group-${group.key}`"
                  @click="toggleSection(group.key)"
                >
                  <span class="saved-sheet__group-heading">
                    <span class="saved-sheet__group-title">{{ t(group.titleKey) }}</span>
                    <span class="saved-sheet__group-count">{{ group.sessions.length }}</span>
                  </span>
                  <span class="saved-sheet__group-chev" :class="{ open: sectionOpen[group.key] }" aria-hidden="true">
                    <i class="bi bi-chevron-down"></i>
                  </span>
                </button>

                <div
                  :id="`saved-group-${group.key}`"
                  class="saved-sheet__group-body"
                  v-show="sectionOpen[group.key]"
                >
                  <div v-if="group.sessions.length > 0" class="saved-sheet__list" role="list">
                    <article
                      v-for="session in group.sessions"
                      :key="session.id"
                      class="saved-sheet__row"
                      :class="{
                        'is-complete': group.complete,
                        'is-active': sessionMatchesCurrentLiveConfig(session),
                        'is-selected': isSavedSessionSelected(session.id)
                      }"
                      role="listitem"
                    >
                      <label
                        v-if="savedSelectMode"
                        class="saved-sheet__check"
                        @click.stop
                      >
                        <input
                          type="checkbox"
                          :checked="isSavedSessionSelected(session.id)"
                          :aria-label="t('memorisation.selectSession')"
                          @change="toggleSavedSessionSelection(session.id)"
                        >
                        <span aria-hidden="true"></span>
                      </label>

                      <button
                        type="button"
                        class="saved-sheet__row-main"
                        @click="savedSelectMode ? toggleSavedSessionSelection(session.id) : loadSavedSession(session.id)"
                      >
                        <span class="saved-sheet__row-icon" aria-hidden="true">
                          <i class="bi" :class="group.complete ? 'bi-check-circle-fill' : 'bi-bookmark-fill'"></i>
                        </span>
                        <span class="saved-sheet__row-copy">
                          <span class="saved-sheet__row-title">{{ getSavedSessionName(session) }}</span>
                          <span class="saved-sheet__row-meta">
                            <span class="saved-sheet__row-meta-line">{{ getSavedSessionSurah(session) }}</span>
                            <span class="saved-sheet__row-meta-line saved-sheet__row-meta-line--secondary">
                              <span
                                v-if="group.complete"
                                class="saved-sheet__status-badge"
                              >{{ t('memorisation.saved_session_meta_completed') }}</span>
                              <span v-if="getSavedSessionOpenedLine(session)">{{ getSavedSessionOpenedLine(session) }}</span>
                              <template v-if="getSavedSessionMetaLine(session)">
                                <span class="saved-sheet__meta-dot" aria-hidden="true">·</span>
                                <span>{{ getSavedSessionMetaLine(session) }}</span>
                              </template>
                            </span>
                          </span>
                        </span>
                      </button>

                      <div v-if="!savedSelectMode" class="saved-sheet__row-actions">
                        <button
                          class="saved-sheet__action"
                          :class="group.complete ? 'saved-sheet__action--secondary' : 'saved-sheet__action--primary'"
                          @click="loadSavedSession(session.id)"
                          type="button"
                        >
                          <i class="bi" :class="group.complete ? 'bi-mic-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                          <span>{{ group.complete ? t('memorisation.ai_recite_review') : t('common.resume') }}</span>
                        </button>
                        <button
                          class="saved-sheet__action saved-sheet__action--ghost"
                          @click.stop="deleteSavedSession(session.id)"
                          :title="t('common.delete')"
                          :aria-label="t('common.delete')"
                          type="button"
                        >
                          <i class="bi bi-trash3" aria-hidden="true"></i>
                        </button>
                      </div>
                    </article>
                  </div>

                  <div v-else class="saved-sheet__empty saved-sheet__empty--compact">
                    <div class="saved-sheet__empty-head">
                      <i class="bi" :class="group.emptyIcon" aria-hidden="true"></i>
                      <p>{{ t(group.emptyTitleKey) }}</p>
                    </div>
                    <span>{{ t(group.emptyHintKey) }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div v-if="isLoggedIn && tab === 'stats'" class="sheet">
            <div v-if="tab === 'stats'" class="sheet">
              <div class="stats-sessions-container">
                <div class="saved-header">
                  <h3><i class="bi bi-bar-chart-line"></i> {{ t('memorisation.insights') }}</h3>
                  <p>{{ t('memorisation.today_first_advanced_analytics_stay_tucked_away_un') }}</p>
                </div>
                <div class="hifz-simple-analytics" :aria-label="t('memorisation.a11y.currentSessionAnalytics')">
                  <article v-for="item in controlsAnalyticsCards" :key="item.key" class="hifz-simple-analytics-item">
                    <i class="bi" :class="item.icon" aria-hidden="true"></i>
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <small>{{ item.description }}</small>
                  </article>
                  <AppStatus
                    v-if="!controlsAnalyticsCards.length"
                    variant="empty"
                    icon="bi-activity"
                    :title="t('memorisation.analyticsEmpty.title')"
                    :description="t('memorisation.analyticsEmpty.desc')"
                    :action-label="t('memorisation.open_session_setup')"
                    @action="openNewSessionSetup"
                  />
                </div>
                <button type="button" class="analytics-toggle-btn" @click="openAdvancedMetricsModal">
                  <i class="bi bi-plus-circle"></i>
                  <span>{{ t('memorisation.show_advanced_metrics') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- SETTINGS TAB - Same layout as Techniques tab -->
          <div v-if="tab === 'settings'" class="sheet">

            <!-- Display Settings Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('display_settings')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-display"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('sessionSetup.display') }}</span>
                    <span class="st-sub">{{ t('sessionSetup.displaySub') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.display_settings }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.display_settings">

                <!-- Tajweed -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.tajweed') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.tajweedDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: tajweedEnabled }" @click="toggleTajweed">
                    {{ tajweedEnabled ? t('common.on') : t('common.off') }}
                  </button>
                </div>

                <!-- Font Size -->
                <div class="setting-item setting-item-range">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.fontSize') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.fontSizeDesc') }}</div>
                  </div>
                  <div class="range-control-compact">
                    <span class="range-value-badge">{{ defaultFontSize }}%</span>
                    <input type="range" min="70" max="280" step="10" v-model.number="defaultFontSize"
                      @input="updateDefaultFontSize" class="input range-slider">
                  </div>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('common.language') }}</div>
                    <div class="setting-description">{{ t('memorisation.english_arabic_or_french_ui') }}</div>
                  </div>
                  <select class="select language-select" :value="activeLocale"
                    @change="onLanguageChange($event.target.value)">
                    <option v-for="option in languageOptions" :key="option.value" :value="option.value">{{ option.label
                      }}</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- Reading Aids Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('reading_settings')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-book-half"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('sessionSetup.readingAids') }}</span>
                    <span class="st-sub">{{ t('sessionSetup.readingAidsSub') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.reading_settings }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.reading_settings">

                

                <!-- Translation -->
                <div v-if="readingViewMode === 'stacked'" class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('memorisation.reading.translation') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.translationDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showTranslation }"
                    @click="toggleReadingOption('translation')">
                    {{ showTranslation ? t('common.on') : t('common.off') }}
                  </button>
                </div>

                <!-- Transliteration -->
                <div v-if="readingViewMode === 'stacked'" class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.transliteration') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.transliterationDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showTransliteration }"
                    @click="toggleReadingOption('transliteration')">
                    {{ showTransliteration ? t('common.on') : t('common.off') }}
                  </button>
                </div>

                <!-- Word by word -->
                <div v-if="readingViewMode === 'stacked'" class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.wordByWord') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.wordByWordDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showWordByWord }"
                    @click="toggleReadingOption('wbw')">
                    {{ showWordByWord ? t('common.on') : t('common.off') }}
                  </button>
                </div>

                <!-- Word Audio: always enabled — toggle removed -->
              </div>
            </section>

            <!-- AI Recite settings -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('ai_recite_settings')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-mic"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('sessionSetup.aiRecite.title') }}</span>
                    <span class="st-sub">{{ t('sessionSetup.aiRecite.subtitle') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.ai_recite_settings }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.ai_recite_settings">
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.aiRecite.recallMode') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.aiRecite.recallModeDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: aiRecallModeEnabled }"
                    @click="setAiRecallModeEnabled(!aiRecallModeEnabled)">
                    {{ aiRecallModeEnabled ? t('common.on') : t('common.off') }}
                  </button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.aiRecite.strictProgression') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.aiRecite.strictProgressionDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: aiRecitationStrictProgression }"
                    @click="setAiReciteStrictProgressionEnabled(!aiRecitationStrictProgression)">
                    {{ aiRecitationStrictProgression ? t('common.on') : t('common.off') }}
                  </button>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.aiRecite.persistMistakes') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.aiRecite.persistMistakesDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: aiRecitationPersistMistakes }"
                    @click="setAiRecitePersistMistakesEnabled(!aiRecitationPersistMistakes)">
                    {{ aiRecitationPersistMistakes ? t('common.on') : t('common.off') }}
                  </button>
                </div>
              </div>
            </section>

            <!-- Check memorisation (AMD) settings -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('amd_settings')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-eye-slash"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('sessionSetup.amd.title') }}</span>
                    <span class="st-sub">{{ t('sessionSetup.amd.subtitle') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.amd_settings }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.amd_settings">
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.amd.wordsShown') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.amd.wordsShownDesc') }}</div>
                  </div>
                  <select
                    class="select amd-settings-select"
                    :value="amdSettingsHidePercent"
                    :aria-label="t('sessionSetup.amd.wordsShown')"
                    @change="setAmdHidePercentFromSettings(Number($event.target.value))"
                  >
                    <option
                      v-for="option in amdWordsShownSettingsOptions"
                      :key="option.hidePercent"
                      :value="option.hidePercent"
                    >
                      {{ t('sessionSetup.amd.wordsShownValue', { percent: option.shownPercent }) }}
                    </option>
                  </select>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.amd.mistakeSound') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.amd.mistakeSoundDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: amdMistakeSoundEnabled }"
                    @click="setAmdMistakeSoundEnabled(!amdMistakeSoundEnabled)">
                    {{ amdMistakeSoundEnabled ? t('common.on') : t('common.off') }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="tools-footer" :class="{ 'settings-footer': tab === 'settings' }">
          <button
            type="button"
            class="tools-btn btn btn-primary session-primary-action"
            data-tour="start-session"
            :class="{ 'is-loading': toolsStartBusy, 'is-disabled': toolsStartDisabled }"
            :disabled="toolsStartDisabled"
            :aria-busy="toolsStartBusy ? 'true' : 'false'"
            :aria-disabled="toolsStartDisabled ? 'true' : 'false'"
            @click="startSessionAndClose"
          >
            <i class="bi" :class="toolsStartBusy ? 'bi-arrow-repeat spin' : 'bi-play-fill'" aria-hidden="true"></i>
            <span>{{ toolsStartBusy ? t('common.startingSession') : toolsPrimaryStartLabel }}</span>
          </button>
          <button type="button" class="tools-btn tools-btn-ghost tools-btn-soft" :disabled="toolsStartBusy" @click="resetControls">
            <i class="bi bi-arrow-counterclockwise"></i><span>{{ t('common.reset') }}</span>
          </button>
        </div>
      </aside>
    </div>

    <!-- Save Session Name Modal (manual only — post-session auto-saves silently) -->
    <div class="modal-overlay mutqin-modal-overlay save-name-modal-overlay" v-if="false && showSaveNameModal" @click.self="closeSaveModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
      <div class="modal-content mutqin-modal-surface save-name-modal" role="dialog" aria-modal="true" aria-labelledby="saveModalTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <h2 id="saveModalTitle">{{ t('memorisation.save_memorisation_session') }}</h2>
            <p>{{ t('memorisation.name_this_session_so_you_can_find_it_again_later') }}</p>
          </div>
          <button class="modal-close-btn" @click="closeSaveModal" :aria-label="t('common.close')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="name-input-group" :class="{ 'has-error': nameError }">
            <label for="sessionName">
              {{ t('memorisation.session_name') }}
            </label>
            <input id="sessionName" type="text" v-model="saveSessionName" class="name-input"
              :class="{ 'error': nameError }" :placeholder="`${getChapterDisplayName(currentChapter) || t('memorisation.sessionDefaultName')} ${rangeStart}-${rangeEnd}`"
              @keyup.enter="confirmSaveSession" @input="clearNameError" autofocus maxlength="50" />
            <div class="input-hint">
              <span class="char-count">{{ saveSessionName.length }}/50</span>
              <span class="hint-text">{{ formatSurahAyahDisplay(getChapterDisplayName(currentChapter) || t('memorisation.a11y.currentSession'), rangeStart, rangeEnd) }}</span>
            </div>
            <div v-if="nameError" class="error-message">
              <i class="bi bi-exclamation-circle-fill"></i>
              {{ nameError }}
            </div>
          </div>
        </div>

        <div class="modal-footer mutqin-modal-footer">
          <div class="mutqin-modal-actions mutqin-modal-actions--end">
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="closeSaveModal">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
              <span>{{ t('common.cancel') }}</span>
            </button>
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="confirmSaveSession" :disabled="!isValidSessionName">
              <i class="bi bi-save" aria-hidden="true"></i>
              <span>{{ t('memorisation.save_session') }}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>

    <div class="modal-overlay mutqin-modal-overlay confirm-modal-overlay" v-if="showConfirmModal" @click.self="closeConfirmModal" @keydown="onModalOverlayKeydown($event, { containerRef: 'confirmModalDialog', onClose: closeConfirmModal })">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
      <div ref="confirmModalDialog" class="modal-content mutqin-modal-surface confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle" aria-describedby="confirmModalMessage">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="confirmModalTitle">{{ confirmModal.title }}</h2>
          </div>
          <button class="modal-close-btn" @click="closeConfirmModal" type="button" :aria-label="t('memorisation.confirmModals.closeDialog')"><i
              class="bi bi-x-lg" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body">
          <div v-if="confirmModal.subject" class="confirm-subject">
            <p class="confirm-subject-title">{{ confirmModal.subject }}</p>
            <p v-if="confirmModal.detail" class="confirm-subject-detail">{{ confirmModal.detail }}</p>
          </div>
          <p id="confirmModalMessage" class="confirm-copy">{{ confirmModal.message }}</p>
        </div>
        <div class="modal-footer mutqin-modal-footer">
          <div class="mutqin-modal-actions mutqin-modal-actions--end">
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="closeConfirmModal">
              <span>{{ confirmModal.cancelLabel }}</span>
            </button>
            <button
              type="button"
              class="mutqin-modal-btn"
              :class="confirmModal.tone === 'danger' ? 'mutqin-modal-btn--destructive' : 'mutqin-modal-btn--primary'"
              @click="runConfirmAction"
            >
              <span>{{ confirmModal.confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>

    <transition name="mutqin-flow">
    <div
      v-if="showWelcomeBackModal"
      class="welcome-back-flow mutqin-modal-flow"
      :class="{ 'welcome-back-flow--ready': welcomeBackModalReady }"
      aria-live="polite"
    >
      <div class="welcome-back-backdrop" @click="closeWelcomeBackModal"></div>
      <div
        class="welcome-back-modal-wrap"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcomeBackModalTitle"
      >
        <div class="welcome-back-dialog mutqin-modal-dialog">
          <div class="mutqin-modal-surface welcome-back-modal welcome-back-modal--v2 welcome-back-modal--lean">
            <button
              type="button"
              class="modal-close-btn onboarding-close-btn welcome-back-close-btn"
              :disabled="welcomeBackContinueInFlight"
              :aria-label="t('memorisation.welcomeBack.closeLabel')"
              @click="closeWelcomeBackModal"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>

            <div class="container-fluid welcome-back-fluid">
              <div class="welcome-back-hero welcome-back-hero--compact">
                <div class="welcome-back-hero-copy">
                  <p class="welcome-back-salam" lang="ar" dir="rtl">
                    {{ t('memorisation.welcomeBack.greetingArabic') }}
                  </p>
                  <h2 id="welcomeBackModalTitle" class="welcome-back-title">
                    {{ welcomeBackModalTitle }}
                  </h2>
                  <p class="welcome-back-message">
                    {{ welcomeBackModalSubtitle }}
                  </p>
                  <div
                    v-if="welcomeBackMetaChips.length"
                    class="welcome-back-meta-line"
                    :aria-label="t('memorisation.a11y.sessionMetadata')"
                  >
                    <span
                      v-for="chip in welcomeBackMetaChips"
                      :key="chip.key"
                      class="welcome-back-meta-chip"
                    >
                      <span class="welcome-back-meta-chip__label">{{ chip.label }}</span>
                      <span class="welcome-back-meta-chip__value">{{ chip.value }}</span>
                    </span>
                  </div>
                  <p
                    v-if="welcomeBackIslamicContent?.intention"
                    class="welcome-back-intention"
                  >
                    {{ welcomeBackIslamicContent.intention }}
                  </p>
                </div>
              </div>

              <div class="modal-footer mutqin-modal-footer welcome-back-footer welcome-back-footer--lean">
                <div
                  class="mutqin-modal-actions welcome-back-actions-grid welcome-back-actions-grid--v2"
                  :class="canResumePreviousSession
                    ? 'welcome-back-actions-grid--trio mutqin-modal-actions--3'
                    : 'welcome-back-actions-grid--duo mutqin-modal-actions--2'"
                >
                  <button
                    v-if="canResumePreviousSession"
                    type="button"
                    class="mutqin-modal-btn mutqin-modal-btn--primary mutqin-btn-animate welcome-back-action welcome-back-action--primary"
                    data-testid="welcome-back-continue"
                    :disabled="welcomeBackContinueInFlight"
                    :aria-busy="welcomeBackContinueInFlight ? 'true' : 'false'"
                    @click.stop.prevent="welcomeBackContinueSession"
                  >
                    <i class="bi bi-play-fill" aria-hidden="true"></i>
                    <span class="welcome-back-continue-label welcome-back-continue-label--full">{{ t('memorisation.welcomeBack.continuePreviousSession') }}</span>
                    <span class="welcome-back-continue-label welcome-back-continue-label--short">{{ t('memorisation.welcomeBack.continueSessionShort') }}</span>
                  </button>
                  <button
                    type="button"
                    class="mutqin-modal-btn mutqin-btn-animate welcome-back-action"
                    :class="canResumePreviousSession
                      ? 'mutqin-modal-btn--secondary welcome-back-action--secondary'
                      : 'mutqin-modal-btn--primary welcome-back-action--primary'"
                    data-tour="welcome-start"
                    :disabled="welcomeBackContinueInFlight"
                    @click="welcomeBackStartNewSession"
                  >
                    <i class="bi bi-plus-lg" aria-hidden="true"></i>
                    <span>{{ t('memorisation.welcomeBack.startNewSession') }}</span>
                  </button>
                  <button
                    type="button"
                    class="mutqin-modal-btn mutqin-modal-btn--ghost mutqin-btn-animate welcome-back-action welcome-back-action--ghost welcome-back-logout"
                    :disabled="welcomeBackContinueInFlight"
                    @click="logoutFromWelcomeBack"
                  >
                    <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                    <span>{{ t('common.logout') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </transition>

    <transition name="mutqin-flow">
    <div v-if="showSessionExitModal" class="session-exit-flow mutqin-modal-flow" aria-live="polite">
      <div
        class="modal-backdrop fade show session-exit-backdrop"
        @click="keepPractisingFromExitModal"
      ></div>
      <div
        class="modal fade show d-block session-exit-modal-wrap"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sessionExitTitle"
        aria-describedby="sessionExitDescription"
      >
        <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog">
          <div class="modal-content mutqin-modal-surface session-exit-modal confirm-modal">
            <button
              class="modal-close-btn"
              type="button"
              :disabled="sessionExitEndingBusy"
              :aria-label="t('memorisation.confirmModals.closeDialog')"
              @click="keepPractisingFromExitModal"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>

            <div class="container-fluid session-exit-fluid px-0 w-100">
              <div class="modal-header w-100">
                <div class="modal-header-text w-100">
                  <h2 id="sessionExitTitle" class="session-exit-title w-100">
                    {{ sessionExitModalTitle }}
                  </h2>
                </div>
              </div>

              <div class="modal-body session-exit-body w-100">
                <p id="sessionExitDescription" class="confirm-copy session-exit-message w-100">
                  {{ sessionExitMotivationMessage }}
                </p>
                <div class="session-exit-progress-block w-100" role="status">
                  <div
                    v-if="sessionExitSurahLabel || sessionExitRangeLabel"
                    class="session-exit-scope"
                  >
                    <p v-if="sessionExitSurahLabel" class="session-exit-scope-surah">
                      {{ sessionExitSurahLabel }}
                    </p>
                    <p v-if="sessionExitRangeLabel" class="session-exit-scope-range">
                      {{ sessionExitRangeLabel }}
                    </p>
                  </div>
                  <div class="session-exit-progress-metrics">
                    <p
                      v-if="sessionExitAyahProgressLabel"
                      class="session-exit-progress-summary session-exit-progress-summary--ayah w-100"
                    >
                      {{ sessionExitAyahProgressLabel }}
                    </p>
                    <p
                      class="session-exit-progress-summary w-100"
                      :aria-label="sessionExitRepetitionProgressLabel"
                    >
                      {{ sessionExitRepetitionProgressLabel }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="modal-footer mutqin-modal-footer w-100">
                <div
                  class="mutqin-modal-actions mutqin-modal-actions--end session-exit-confirm-actions w-100"
                  role="group"
                  :aria-label="t('memorisation.sessionExit.confirmTitle')"
                >
                  <button
                    type="button"
                    class="mutqin-modal-btn mutqin-modal-btn--secondary mutqin-btn-animate"
                    :disabled="sessionExitEndingBusy"
                    @click="keepPractisingFromExitModal"
                  >
                    <i class="bi bi-play-circle" aria-hidden="true"></i>
                    <span>{{ t('memorisation.sessionExit.keepPractising') }}</span>
                  </button>
                  <button
                    type="button"
                    class="mutqin-modal-btn mutqin-modal-btn--destructive mutqin-btn-animate"
                    :disabled="sessionExitEndingBusy"
                    :aria-busy="sessionExitEndingBusy ? 'true' : 'false'"
                    :class="{ 'is-loading': sessionExitEndingBusy }"
                    @click="confirmEndSessionFromExitModal"
                  >
                    <i class="bi" :class="sessionExitEndingBusy ? 'bi-hourglass-split' : 'bi-box-arrow-right'" aria-hidden="true"></i>
                    <span>{{ sessionExitConfirmEndLabel }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </transition>

    <div v-if="showHelpLearningModal" class="modal-overlay mutqin-modal-overlay help-learning-overlay" @click.self="closeHelpLearningModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--wide help-learning-dialog">
        <div class="modal-content mutqin-modal-surface help-learning-modal" role="dialog" aria-modal="true"
          aria-labelledby="helpLearningTitle" aria-describedby="helpLearningSubtitle">
          <div class="modal-header help-learning-header">
            <div class="modal-header-text">
              <h2 id="helpLearningTitle">{{ helpLearningUi.title }}</h2>
              <p id="helpLearningSubtitle">{{ helpLearningUi.subtitle }}</p>
            </div>
            <button class="modal-close-btn" @click="closeHelpLearningModal" :aria-label="t('memorisation.a11y.closeHelpLearning')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body help-learning-body">
            <div class="help-learning-shell">
              <nav class="help-learning-nav" role="tablist" :aria-label="t('memorisation.a11y.helpTopics')">
                <button
                  v-for="section in helpLearningSections"
                  :key="section.key"
                  type="button"
                  class="help-learning-nav-link"
                  :class="{ active: activeHelpLearningSection?.key === section.key }"
                  :aria-selected="activeHelpLearningSection?.key === section.key ? 'true' : 'false'"
                  @click="selectHelpLearningSection(section.key)"
                >
                  <i class="bi" :class="section.icon" aria-hidden="true"></i>
                  <span>{{ section.title }}</span>
                </button>
              </nav>
              <div class="help-learning-content-col">
                <article v-if="activeHelpLearningSection" class="help-learning-card">
                  <div class="help-learning-card-body">
                    <div class="help-learning-card-head">
                      <span class="help-learning-icon" aria-hidden="true">
                        <i class="bi" :class="activeHelpLearningSection.icon"></i>
                      </span>
                      <div class="help-learning-copy">
                        <h3>{{ activeHelpLearningSection.title }}</h3>
                        <p>{{ activeHelpLearningSection.description }}</p>
                      </div>
                    </div>
                    <div v-if="activeHelpLearningSection.details?.length" class="help-learning-detail-list">
                      <div
                        v-for="detail in activeHelpLearningSection.details"
                        :key="`${activeHelpLearningSection.key}-${detail.label}`"
                        class="help-learning-detail-item"
                      >
                        <strong>{{ detail.label }}</strong>
                        <span>{{ detail.text }}</span>
                      </div>
                    </div>
                    <section
                      v-if="activeHelpLearningSection.key === 'tajweed'"
                      class="help-learning-tajweed-legend"
                      :aria-label="helpLearningTajweedLegendUi.title"
                    >
                      <h5>{{ helpLearningTajweedLegendUi.title }}</h5>
                      <p>{{ helpLearningTajweedLegendUi.intro }}</p>
                      <ul class="tajweed-color-legend">
                        <li v-for="rule in tajweedColorLegend" :key="rule.id">
                          <span class="tajweed-color-swatch" :style="{ background: rule.color }" aria-hidden="true"></span>
                          <div>
                            <strong>{{ rule.label }}</strong>
                            <span>{{ rule.description }}</span>
                          </div>
                        </li>
                      </ul>
                    </section>
                    <section
                      v-if="activeHelpLearningSection.key === 'talqin-mode'"
                      class="help-learning-talqin-guide text-dark dark:text-white"
                    >
                      <h5 class="text-dark dark:text-white"><strong>{{ helpLearningTalqinWorkflowUi.title }}</strong></h5>
                      <p class="text-dark dark:text-white">{{ helpLearningTalqinWorkflowUi.intro }}</p>
                      <ul class="text-dark dark:text-white">
                        <li v-for="step in helpLearningTalqinWorkflowUi.steps" :key="`talqin-step-${step.id}`">
                          <strong>{{ step.label }}</strong> {{ step.text }}
                        </li>
                      </ul>
                    </section>
                    <div class="help-learning-best-for">
                      <span class="help-learning-best-for-label">{{ helpLearningUi.bestFor }}</span>
                      <p>{{ activeHelpLearningSection.bestFor }}</p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
          <div class="modal-footer mutqin-modal-footer">
            <div class="mutqin-modal-actions mutqin-modal-actions--end">
              <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="closeHelpLearningModal">
                <span>{{ t('common.close') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCountdownOverlay" class="countdown-overlay">
      <div class="countdown-modal">
        <div class="countdown-number">{{ countdownValue }}</div>
        <div class="countdown-text">{{ t('memorisation.prepare_yourself') }}</div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showHifzPlannerUi && showPlannerCompletionConfetti" class="planner-confetti-layer" aria-hidden="true">
        <span
          v-for="piece in plannerCompletionConfettiPieces"
          :key="piece.id"
          class="planner-confetti-piece"
          :style="piece.style"
        ></span>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showSessionQuizConfetti" class="session-quiz-confetti-layer" aria-hidden="true">
        <span
          v-for="piece in sessionQuizConfettiPieces"
          :key="piece.id"
          class="session-quiz-confetti-piece"
          :style="piece.style"
        ></span>
      </div>
    </transition>

    <div v-if="showHifzPlannerUi && showPlannerCompletionModal" class="modal-overlay mutqin-modal-overlay planner-completion-overlay"
      @click.self="closePlannerCompletionModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--wide">
      <div class="modal-content mutqin-modal-surface planner-completion-modal" role="dialog" aria-modal="true"
        aria-labelledby="plannerCompletionTitle">
        <div class="modal-header planner-completion-header">
          <div class="planner-completion-head-copy">
            <span class="planner-completion-kicker">{{ t('memorisation.session_finished') }}</span>
            <h2 id="plannerCompletionTitle">{{ t('memorisation.congratulations_todays_hifz_session_is_complete') }}</h2>
            <p>{{ plannerCompletionSummaryMessage }}</p>
          </div>
          <button class="modal-close-btn" @click="closePlannerCompletionModal" :aria-label="t('common.close')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body planner-completion-body">
          <div class="container-fluid planner-completion-shell px-0">
            <div class="row g-3 planner-completion-stats-row">
              <div class="col-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>{{ t('memorisation.memorised_today') }}</span>
                  <strong>{{ plannerCompletionStats.memorised }}</strong>
                  <small>{{ plannerCompletionStats.memorisedLabel }}</small>
                </article>
              </div>
              <div class="col-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>{{ t('memorisation.new_ayahs') }}</span>
                  <strong>{{ plannerCompletionStats.newAyahs }}</strong>
                  <small>{{ plannerCompletionStats.newAyahsLabel }}</small>
                </article>
              </div>
              <div class="col-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>{{ t('memorisation.todays_goal') }}</span>
                  <strong>{{ plannerCompletionStats.goalProgress }}</strong>
                  <small>{{ plannerCompletionStats.goalStatus }}</small>
                </article>
              </div>
              <div class="col-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>{{ t('memorisation.next_review') }}</span>
                  <strong>{{ plannerCompletionStats.nextReview }}</strong>
                  <small>{{ plannerCompletionStats.nextReviewHint }}</small>
                </article>
              </div>
            </div>
            <div class="planner-completion-timeline" v-if="plannerCompletionTimelineItems.length">
              <button
                v-for="item in plannerCompletionTimelineItems"
                :key="item.key"
                class="planner-completion-timeline-btn"
                type="button"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer mutqin-modal-footer">
          <div class="mutqin-modal-actions mutqin-modal-actions--end">
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="closePlannerCompletionModal">
              <span>{{ t('common.close') }}</span>
            </button>
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="openHifzPlanFromCompletionModal">
              <i class="bi bi-pencil-square" aria-hidden="true"></i>
              <span>{{ t('memorisation.view_plan') }}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>

    <div v-if="showSessionAnalyticsModal" class="modal-overlay mutqin-modal-overlay session-analytics-overlay"
      @click.self="closeSessionAnalyticsModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--wide">
      <div class="modal-content mutqin-modal-surface session-analytics-modal" role="dialog" aria-modal="true"
        aria-labelledby="sessionAnalyticsTitle">
        <div class="modal-header session-analytics-header">
          <div class="session-analytics-head-copy">
            <h2 id="sessionAnalyticsTitle">{{ t('memorisation.session_analytics_overview') }}</h2>
            <p v-if="analyticsModalSessionLabel">{{ analyticsModalSessionLabel }}</p>
            <small v-if="analyticsModalSessionMeta">{{ analyticsModalSessionMeta }}</small>
          </div>
          <div class="session-analytics-head-actions">
            <button type="button" class="session-export-btn session-analytics-download"
              :disabled="analyticsReportState.loading || !analyticsModalRecord" @click="downloadSessionAnalyticsReport">
              <i class="bi" :class="analyticsReportIcon"></i>
              <span>{{ analyticsReportLabel }}</span>
            </button>
            <button class="modal-close-btn" @click="closeSessionAnalyticsModal" :aria-label="t('common.close')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="modal-body session-analytics-body">
          <div v-if="!analyticsModalLoaded" class="analytics-loading">
            <i class="bi bi-hourglass-split"></i>
            <span>{{ t('memorisation.preparing_analytics') }}</span>
          </div>
          <AppStatus
            v-else-if="analyticsModalError"
            variant="error"
            fill
            :title="t('memorisation.analyticsEmpty.modalErrorTitle')"
            :description="t('memorisation.analyticsEmpty.modalErrorDesc')"
            :action-label="t('common.close')"
            @action="closeSessionAnalyticsModal"
          />
          <AppStatus
            v-else-if="!analyticsModalData || !analyticsModalHasContent"
            variant="empty"
            fill
            icon="bi-graph-up"
            :title="t('memorisation.analyticsEmpty.modalEmptyTitle')"
            :description="t('memorisation.analyticsEmpty.modalEmptyDesc')"
            :action-label="t('common.close')"
            @action="closeSessionAnalyticsModal"
          />
          <template v-else-if="analyticsModalData">
            <section class="session-analytics-section">
              <div class="session-analytics-summary-grid">
                <article v-for="item in analyticsSummaryCards" :key="item.key" class="session-analytics-summary-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.description }}</small>
                </article>
              </div>
            </section>
            <section v-if="analyticsAiCheckSummary" class="session-analytics-section">
              <article class="session-analytics-panel analytics-ai-report">
                <header>
                  <h3>{{ t('memorisation.recite_check_results') }}</h3>
                  <p>{{ t('memorisation.saved_word_checks_for_this_session_range') }}</p>
                </header>
                <div class="recitation-result-stats">
                  <article v-for="stat in analyticsAiCheckSummary.stats" :key="stat.key" class="recitation-result-stat"
                    :class="stat.tone">
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                    <small>{{ stat.description }}</small>
                  </article>
                </div>
                <div class="recitation-next-card">
                  <span>{{ getUnifiedResultSectionLabel('next') }}</span>
                  <strong>{{ analyticsAiCheckSummary.recommendation }}</strong>
                  <p>{{ analyticsAiCheckSummary.nextStep }}</p>
                </div>
                <div v-if="analyticsAiCheckSummary.validation" class="recitation-next-card">
                  <span>{{ getUnifiedResultSectionLabel('recording') }}</span>
                  <strong :class="analyticsAiCheckSummary.validation.tone">{{ analyticsAiCheckSummary.validation.label }}</strong>
                  <p>{{ analyticsAiCheckSummary.validation.summary }}</p>
                </div>
              </article>
            </section>

            <section class="session-analytics-section" v-if="analyticsModalData">
              <!-- <div class="confidence-heatmap-inline">
                <div class="heatmap-header">
                  <h3><i class="bi bi-grid-3x3-gap-fill"></i> {{ t('memorisation.recitation_confidence_heatmap') }}</h3>
                  <div class="heatmap-legend">
                    <span class="legend-dot excellent" aria-hidden="true"></span><span>90-100</span>
                    <span class="legend-dot strong" aria-hidden="true"></span><span>75-89</span>
                    <span class="legend-dot needs" aria-hidden="true"></span><span>60-74</span>
                    <span class="legend-dot weak" aria-hidden="true"></span><span>40-59</span>
                    <span class="legend-dot critical" aria-hidden="true"></span><span>&lt;40</span>
                  </div>
                </div>
                
                <div class="heatmap-grid">
                  <div
                    v-for="ayah in analyticsHeatmapData"
                    :key="ayah.ayahNumber"
                    class="heatmap-cell"
                    :class="getHeatmapClass(ayah.confidenceScore)"
                    @click="openAyahDetailFromHeatmap(ayah)"
                    @mouseover="showHeatmapTooltip($event, ayahObject)"
                    @mouseleave="heatmapTooltip.visible = false"
                  >
                    <span class="heatmap-ayah-num">{{ ayah.ayahNumber }}</span>
                    <span class="heatmap-score">{{ ayah.confidenceScore }}%</span>
                  </div>
                </div>

                <div 
                  v-if="heatmapTooltip?.visible" 
                  class="heatmap-tooltip" 
                  :style="{ top: (heatmapTooltip?.y || 0) + 'px', left: (heatmapTooltip?.x || 0) + 'px' }"
                >
                  <div><strong>Ayah {{ heatmapTooltip?.data?.ayahNumber }}</strong></div>
                  <div>Confidence: {{ heatmapTooltip?.data?.confidenceScore }}%</div>
                  <div>Accuracy: {{ heatmapTooltip?.data?.accuracyPercentage }}%</div>
                  <div>Mistakes: {{ heatmapTooltip?.data?.mistakeCount }}</div>
                  <div>Tajweed Issues: {{ heatmapTooltip?.data?.tajweedIssueCount }}</div>
                  <div>Attempts: {{ heatmapTooltip?.data?.attemptCount }}</div>
                </div>

                <div v-if="heatmapTrends.improved.length || heatmapTrends.declined.length" class="heatmap-trends">
                  <div class="trend-improved" v-if="heatmapTrends.improved.length">
                    <i class="bi bi-arrow-up-circle-fill"></i> {{ t('memorisation.most_improved') }} 
                    <strong>Ayah {{ heatmapTrends.improved[0].ayahNumber }}</strong> (+{{ heatmapTrends.improved[0].change }}%)
                  </div>
                  <div class="trend-declined" v-if="heatmapTrends.declined.length">
                    <i class="bi bi-arrow-down-circle-fill"></i> {{ t('memorisation.needs_focus') }} 
                    <strong>Ayah {{ heatmapTrends.declined[0].ayahNumber }}</strong> ({{ heatmapTrends.declined[0].change }}% decline)
                  </div>
                </div>

                <div v-if="heatmapFocusAreas.length" class="heatmap-focus">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Priority: {{ heatmapFocusAreas.length }} ayah{{ heatmapFocusAreas.length > 1 ? 's' : '' }} below 60% confidence</span>
                  <div class="focus-chips">
                    <span v-for="a in heatmapFocusAreas.slice(0,5)" :key="a.ayahNumber" class="focus-chip">
                      Ayah {{ a.ayahNumber }} ({{ a.confidenceScore }}%)
                    </span>
                  </div>
                </div>
              </div> -->
            </section>
            <section class="session-analytics-section session-analytics-two-col">
              <article class="session-analytics-panel analytics-detail-extra">
                <header>
                  <h3>{{ t('memorisation.ayah_activity') }}</h3>
                  <p>{{ t('memorisation.verse_plays_across_the_selected_range') }}</p>
                </header>
                <div v-if="analyticsVerseSeries.length" class="analytics-line-chart">
                  <svg viewBox="0 0 320 160" role="img" :aria-label="t('memorisation.analyticsHeatmap.ayahActivityChart')">
                    <defs>
                      <linearGradient id="analyticsAreaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="rgba(189, 140, 88, 0.34)"></stop>
                        <stop offset="100%" stop-color="rgba(189, 140, 88, 0.02)"></stop>
                      </linearGradient>
                    </defs>
                    <g class="analytics-y-axis">
                      <line v-for="tick in analyticsYAxisTicks" :key="`grid-${tick.value}`" x1="20" :y1="tick.y"
                        x2="300" :y2="tick.y"></line>
                      <text v-for="tick in analyticsYAxisTicks" :key="`label-${tick.value}`" x="4" :y="tick.y + 4">{{
                        tick.label }}</text>
                    </g>
                    <path :d="analyticsLineAreaPath" fill="url(#analyticsAreaGradient)"></path>
                    <path :d="analyticsLinePath" class="analytics-line-path"></path>
                    <circle v-for="point in analyticsLineDots" :key="point.key" :cx="point.x" :cy="point.y" r="3.5"
                      class="analytics-line-dot"></circle>
                  </svg>
                  <div class="analytics-line-labels">
                    <span v-for="item in analyticsVerseSeries" :key="`label-${item.key}`">{{ item.shortLabel }}</span>
                  </div>
                </div>
                <div v-else class="analytics-empty-panel">{{ t('memorisation.play_ayah_audio_to_populate_the_activity_chart') }}</div>
              </article>
            </section>
            <section class="session-analytics-section session-analytics-two-col analytics-extra-section">
              <article class="session-analytics-panel">
                <header>
                  <h3>{{ t('memorisation.most_replayed_ayahs') }}</h3>
                  <p>{{ t('memorisation.quick_view_of_where_repetition_is_concentrating') }}</p>
                </header>
                <div v-if="analyticsReplayLeaders.length" class="analytics-bar-list">
                  <div v-for="item in analyticsReplayLeaders" :key="item.key" class="analytics-bar-row">
                    <span>{{ item.label }}</span>
                    <div class="analytics-bar-track">
                      <div class="analytics-bar-fill" :style="{ width: `${item.percent}%` }"></div>
                    </div>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>
                <div v-else class="analytics-empty-panel">{{ t('memorisation.no_ayah_replay_data_available_yet') }}</div>
              </article>
              <article class="session-analytics-panel">
                <header>
                  <h3>{{ t('memorisation.session_playback_balance') }}</h3>
                  <p>{{ t('memorisation.see_how_evenly_audio_attention_is_spread_across_th') }}</p>
                </header>
                <div v-if="analyticsPlaybackBuckets.length" class="analytics-bucket-grid">
                  <div v-for="bucket in analyticsPlaybackBuckets" :key="bucket.key" class="analytics-bucket-card">
                    <span>{{ bucket.label }}</span>
                    <strong>{{ bucket.value }}</strong>
                    <small>{{ bucket.description }}</small>
                  </div>
                </div>
                <div v-else class="analytics-empty-panel">{{ t('memorisation.playback_balance_appears_after_ayah_audio_starts') }}</div>
              </article>
            </section>
          </template>
        </div>
      </div>
      </div>
    </div>

    <div v-if="showAdvancedMetricsModal" class="modal-overlay mutqin-modal-overlay session-analytics-overlay advanced-metrics-overlay"
      @click.self="closeAdvancedMetricsModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--wide">
      <div class="modal-content mutqin-modal-surface session-analytics-modal advanced-metrics-modal" role="dialog" aria-modal="true"
        aria-labelledby="advancedMetricsTitle">
        <div class="modal-header session-analytics-header">
          <div class="session-analytics-head-copy">
            <h2 id="advancedMetricsTitle">{{ t('memorisation.advanced_metrics') }}</h2>
            <p>{{ t('memorisation.session_signals_review_health_cards_graphs_and_cha') }}</p>
            <small>{{ t('memorisation.save_a_session_to_unlock_full_per_session_analytic') }}</small>
          </div>
          <button class="modal-close-btn" @click="closeAdvancedMetricsModal" :aria-label="t('memorisation.a11y.closeAdvancedMetrics')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body session-analytics-body advanced-metrics-body">
          <AppStatus
            v-if="!controlsAnalyticsCards.length && !detailedAnalyticsSections.length"
            variant="empty"
            fill
            icon="bi-activity"
            :title="t('memorisation.no_advanced_insights_yet')"
            :description="t('memorisation.save_a_session_and_you_ll_unlock_the_deeper_breakd')"
            :action-label="t('common.close')"
            @action="closeAdvancedMetricsModal"
          />
          <template v-else>
          <section class="session-analytics-section">
            <div class="session-analytics-summary-grid">
              <article v-for="item in controlsAnalyticsCards" :key="`advanced-${item.key}`"
                class="session-analytics-summary-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.description }}</small>
              </article>
              <AppStatus
                v-if="!controlsAnalyticsCards.length"
                variant="empty"
                size="sm"
                icon="bi-activity"
                :title="t('memorisation.analyticsEmpty.title')"
                :description="t('memorisation.analyticsEmpty.desc')"
              />
            </div>
          </section>
          <section class="session-analytics-section advanced-metrics-grid" :aria-label="t('memorisation.a11y.advancedAnalyticsCards')">
            <article v-for="section in detailedAnalyticsSections" :key="`advanced-section-${section.key}`"
              class="session-analytics-panel detailed-analytics-section">
              <header>
                <h3><i class="bi" :class="section.icon" aria-hidden="true"></i> {{ section.title }}</h3>
                <p>{{ t('memorisation.compact_breakdown_for_this_metric_group') }}</p>
              </header>
              <div class="detailed-analytics-rows">
                <div v-for="row in section.rows" :key="`advanced-${section.key}-${row.label}`"
                  class="detailed-analytics-row">
                  <span>{{ row.label }}</span>
                  <strong>{{ row.value }}</strong>
                  <small>{{ row.detail }}</small>
                </div>
              </div>
            </article>
          </section>
          </template>
        </div>
      </div>
      </div>
    </div>


    <div v-if="showRecordingsLibrary" class="modal-overlay mutqin-modal-overlay recordings-library-overlay"
      @click.self="closeRecordingsLibrary">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--full">
      <div class="modal-content mutqin-modal-surface recordings-library-modal" role="dialog" aria-modal="true"
        aria-labelledby="recordingsLibraryTitle">
        <div class="modal-header recordings-library-header" :class="{ 'has-back-action': recordingsLibraryReturnToSelfCheckKey }">
          <div class="recordings-library-head-copy">
            <h2 id="recordingsLibraryTitle">{{ t('memorisation.recordings_library') }}</h2>
            <div class="recordings-library-hierarchy">
              <span>{{ getChapterDisplayName(currentChapter) || t('memorisation.saved_session') }}</span>
              <span>{{ rangeStart }}-{{ rangeEnd }}</span>
              <span v-if="selectedRecordingsAyahGroup">{{ t('memorisation.a11y.ayahNumberLabel', { number: selectedRecordingsAyahGroup.ayahNumber }) }}</span>
              <span v-if="selectedRecordingsEntry">{{ getRecordingAttemptLabel(selectedRecordingsEntry) }}</span>
            </div>
          </div>
          <div class="recordings-library-header-actions">
            <button v-if="recordingsLibraryReturnToSelfCheckKey" class="recordings-library-back-btn" type="button"
              @click="backToSelfCheckFromLibrary" :aria-label="t('memorisation.back_to_self_check')">
              <i class="bi bi-arrow-left"></i>
              <span>{{ t('memorisation.back_to_self_check') }}</span>
            </button>
            <button class="modal-close-btn" @click="closeRecordingsLibrary" :aria-label="t('memorisation.a11y.closeRecordingsLibrary')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div class="modal-body recordings-library-body">
          <div v-if="isRecordingsLibraryLoading" class="recordings-library-loading">
            <i class="bi bi-hourglass-split"></i>
            <span>{{ t('memorisation.loading_recordings') }}</span>
            <div class="recordings-library-loading-skeleton d-md-none" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div v-else-if="!hasRecordingsLibraryEntries" class="recordings-library-empty">
            <div class="recordings-library-empty-icon">
              <i class="bi bi-mic"></i>
            </div>
            <h3>{{ t('memorisation.no_recordings_yet') }}</h3>
            <p>{{ t('memorisation.no_recordings_yet_desc') }}</p>
          </div>

          <div v-else class="recordings-library-shell">
            <aside class="recordings-library-nav recordings-library-nav-panel">
              <div class="recordings-library-nav-head">
                <div class="recordings-library-nav-intro">
                  <span class="recordings-library-nav-kicker">{{ t('memorisation.saved_session') }}</span>
                  <strong>{{ getChapterDisplayName(currentChapter) || t('memorisation.recordings.sessionRecordings') }}</strong>
                  <div class="recordings-library-nav-meta">
                    <span>{{ formatAyahRangeDisplay(rangeStart, rangeEnd) }}</span>
                    <span>{{ filteredRecordingsList.length === 1 ? t('memorisation.recordings.countOne', { count: filteredRecordingsList.length }) : t('memorisation.recordings.countOther', { count: filteredRecordingsList.length }) }}</span>
                  </div>
                </div>
                <button class="recordings-library-nav-toggle" type="button" @click="toggleRecordingsNav"
                  :aria-expanded="recordingsNavExpanded ? 'true' : 'false'">
                  <span>{{ recordingsNavExpanded ? t('memorisation.recordings.hideList') : t('memorisation.recordings.showList') }}</span>
                  <i class="bi" :class="recordingsNavExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                </button>
              </div>

              <div class="recordings-library-search">
                <label class="recordings-library-search-field">
                  <i class="bi bi-search" aria-hidden="true"></i>
                  <input v-model.trim="recordingsLibrarySearch" type="search" :placeholder="t('memorisation.recordings.searchPlaceholder')"
                    :aria-label="t('memorisation.a11y.searchRecordedAyahs')">
                </label>
              </div>

              <div v-show="recordingsNavExpanded" class="recordings-library-nav-scroll">
                <div v-for="surahGroup in filteredRecordingsAyahGroups"
                  :key="surahGroup.chapterId || surahGroup.chapterName" class="recordings-library-surah-group">
                  <div class="recordings-library-surah-title">{{ surahGroup.chapterName }}</div>
                  <div class="recordings-library-recordings">
                    <template v-for="ayahGroup in surahGroup.ayahs" :key="ayahGroup.ayahKey">
                      <div
                        v-for="recording in ayahGroup.recordings"
                        :key="recording.id"
                        class="recordings-library-recording-row"
                      >
                        <button type="button"
                          class="recordings-library-recording-item"
                          :class="{ active: recording.id === selectedRecordingsEntryId, playing: recording.id === activeRecordingPlaybackId }"
                          @click="selectRecordingsEntry(recording)">
                          <span class="recordings-library-recording-title">{{ getRecordingAttemptLabel(recording) }}</span>
                          <span class="recordings-library-recording-meta">
                            {{ t('memorisation.a11y.ayahNumberLabel', { number: ayahGroup.ayahNumber }) }} · {{ formatRecordingDate(recording.recordedAt) }}
                          </span>
                        </button>
                        <button
                          type="button"
                          class="recordings-library-recording-delete"
                          :aria-label="t('memorisation.a11y.deleteRecording')"
                          @click.stop="promptDeleteRecording(recording.id)"
                        >
                          <i class="bi bi-x-lg" aria-hidden="true"></i>
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </aside>

            <section class="recordings-library-detail">
              <div v-if="selectedRecordingsEntry && selectedRecordingsAyahGroup" class="recordings-library-detail-head">
                <div class="recordings-library-detail-head-copy">
                  <span class="recordings-library-detail-kicker">{{ t('memorisation.selected_ayah') }}</span>
                  <h3>{{ getRecordingAttemptLabel(selectedRecordingsEntry) }}</h3>
                  <div class="recordings-library-detail-meta">
                    <span>{{ t('memorisation.a11y.ayahNumberLabel', { number: selectedRecordingsAyahGroup.ayahNumber }) }}</span>
                    <span>{{ formatRecordingDate(selectedRecordingsEntry.recordedAt) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="selectedRecordingsEntry" class="recordings-library-history">
                <article class="recording-history-card"
                  :class="{
                    playing: selectedRecordingsEntry.id === activeRecordingPlaybackId,
                    'recording-history-card--standard': !isAiCheckRecording(selectedRecordingsEntry)
                  }">
                  <div class="recording-history-top"
                    :class="{ 'recording-history-top--standard': !isAiCheckRecording(selectedRecordingsEntry) }">
                    <div class="recording-history-copy">
                      <div class="recording-history-kicker">{{
                        isAiCheckRecording(selectedRecordingsEntry) ? getRecordingTypeLabel(selectedRecordingsEntry) : t('memorisation.recordings.savedRecording') }}</div>
                      <strong v-if="!isAiCheckRecording(selectedRecordingsEntry)">{{ getRecordingAttemptLabel(selectedRecordingsEntry) }}</strong>
                      <div v-if="!isAiCheckRecording(selectedRecordingsEntry)" class="recording-history-inline-meta">
                        <span>{{ formatRecordingTimestamp(selectedRecordingsEntry.recordedAt) }}</span>
                        <span class="recording-result-pill"
                          :class="getRecordingResultTone(selectedRecordingsEntry.result)">
                          {{ getSelfCheckResultLabel(selectedRecordingsEntry.result) }}
                        </span>
                      </div>
                      <p v-else class="recording-history-note">{{ formatRecordingTimestamp(selectedRecordingsEntry.recordedAt) }}</p>
                    </div>
                  </div>

                  <div v-if="!isAiCheckRecording(selectedRecordingsEntry)" class="recording-history-standard-simple">
                    <p class="recording-history-standard-hint">{{ getSelfCheckResultHint(selectedRecordingsEntry.result) }}</p>
                    <div v-if="selectedRecordingsEntry.audioSrc" class="recording-history-player-compact recording-history-player-compact--surface recording-history-player-compact--simple">
                      <button class="recording-history-player-btn"
                        type="button" @click="toggleRecordingPlayback(selectedRecordingsEntry)"
                        :aria-label="selectedRecordingsEntry.id === activeRecordingPlaybackId ? t('memorisation.a11y.pauseReplay') : t('memorisation.a11y.replayRecitation')">
                        <i class="bi"
                          :class="selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                      </button>
                      <div class="recording-history-player-copy">
                        <strong>{{ selectedRecordingsEntry.id === activeRecordingPlaybackId ? t('memorisation.recordings.playing') : t('memorisation.recordings.replayRecordingLabel') }}</strong>
                        <span>{{ formatRecordingDuration(selectedRecordingsEntry.durationSeconds) }}</span>
                      </div>
                    </div>
                    <p v-else class="shared-result-recording-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ t('memorisation.recordings.noAudioAvailable') }}</span></p>
                    <div class="recording-history-standard-meta">
                      <span><i class="bi bi-clock-history" aria-hidden="true"></i>{{ formatRecordingDuration(selectedRecordingsEntry.durationSeconds) }}</span>
                      <span><i class="bi bi-bookmark-check" aria-hidden="true"></i>{{ t('memorisation.self_rating') }}</span>
                    </div>
                  </div>

                  <div v-else class="recording-history-meta">
                    <span><i class="bi bi-stars"></i> {{
                      getRecitationMistakeSummary(selectedRecordingsEntry.mistakeBreakdown
                        ||
                        selectedRecordingsEntry.mistakes) }}</span>
                    <span><i class="bi bi-calendar3"></i> {{ formatRecordingDate(selectedRecordingsEntry.recordedAt)
                      }}</span>
                  </div>

                  <div v-if="isAiCheckRecording(selectedRecordingsEntry)" class="recording-history-ai-detail shared-result-flow">
                    <section class="shared-result-section shared-result-section--summary transition-all duration-300">
                      <div class="shared-result-section-head">
                        <span class="recitation-check-section-label">
                          <span class="shared-result-step-badge">1</span>
                          <i class="bi bi-check2-circle" aria-hidden="true"></i>
                          {{ getUnifiedResultSectionLabel('summary') }}
                        </span>
                        <strong>{{ getRecitationResultHeadline(selectedRecordingsEntry) }}</strong>
                      </div>
                      <div class="recitation-result-stats">
                        <article v-for="stat in getRecitationResultStats(selectedRecordingsEntry)" :key="stat.key"
                          class="recitation-result-stat" :class="stat.tone">
                          <span>{{ stat.label }}</span>
                          <strong>{{ stat.value }}</strong>
                          <small>{{ stat.description }}</small>
                        </article>
                      </div>
                    </section>
                    <section class="shared-result-section shared-result-section--words transition-all duration-300">
                      <div class="shared-result-section-head">
                        <span class="recitation-check-section-label">
                          <span class="shared-result-step-badge">2</span>
                          <i class="bi bi-chat-square-text" aria-hidden="true"></i>
                          {{ getUnifiedResultSectionLabel('words') }}
                        </span>
                        <p>{{ getRecitationWordsReviewSummary(selectedRecordingsEntry) }}</p>
                      </div>
                      <div v-if="getRecitationReviewArabic(selectedRecordingsEntry)" class="recitation-review-ayah shared-result-ayah"
                        dir="rtl"
                        v-html="getRecitationReviewArabic(selectedRecordingsEntry)"></div>
                      <div class="shared-result-word-review transition-all duration-300">
                        <div v-if="getRecitationWordsToReview(selectedRecordingsEntry).length" class="shared-result-word-review-list" dir="rtl">
                          <span v-for="word in getRecitationWordsToReview(selectedRecordingsEntry)" :key="`saved-review-${word.index}`"
                            class="shared-result-word-review-chip" :class="`is-${word.visualStatus}`">
                            {{ word.text }}
                          </span>
                        </div>
                        <p v-else class="shared-result-word-review-summary"><i class="bi bi-check2-circle" aria-hidden="true"></i><span>{{ getFriendlyNoWordMistakesMessage() }}</span></p>
                      </div>
                    </section>
                    <div class="shared-result-support-grid transition-all duration-300">
                      <section class="shared-result-section shared-result-section--support shared-result-section--next transition-all duration-300">
                        <div class="shared-result-section-head">
                          <span class="recitation-check-section-label">
                            <span class="shared-result-step-badge">3</span>
                            <i class="bi bi-compass" aria-hidden="true"></i>
                            {{ getUnifiedResultSectionLabel('next') }}
                          </span>
                        </div>
                        <div class="shared-result-support-body">
                          <strong class="shared-result-support-title">{{ getRecitationRecommendationDisplay(selectedRecordingsEntry) }}</strong>
                          <p class="shared-result-support-copy">{{ getRecitationNextStep(selectedRecordingsEntry, { saved: true }) }}</p>
                        </div>
                      </section>
                      <section class="shared-result-section shared-result-section--support shared-result-section--recording transition-all duration-300">
                        <div class="shared-result-section-head">
                          <span class="recitation-check-section-label">
                            <span class="shared-result-step-badge">4</span>
                            <i class="bi bi-play-circle" aria-hidden="true"></i>
                            {{ getUnifiedResultSectionLabel('recording') }}
                          </span>
                        </div>
                        <div class="shared-result-support-body">
                          <strong class="shared-result-support-title" :class="getRecitationValidationTone(selectedRecordingsEntry)">{{ getRecitationValidationLabel(selectedRecordingsEntry) }}</strong>
                          <p class="shared-result-support-copy">{{ getRecitationValidationSummary(selectedRecordingsEntry) }}</p>
                        </div>
                        <div class="shared-result-support-media">
                          <div v-if="selectedRecordingsEntry.audioSrc" class="recording-history-player-compact">
                            <button class="recording-history-player-btn"
                              type="button" @click="toggleRecordingPlayback(selectedRecordingsEntry)"
                              :aria-label="selectedRecordingsEntry.id === activeRecordingPlaybackId ? t('memorisation.a11y.pauseReplay') : t('memorisation.a11y.replayRecitation')">
                              <i class="bi"
                                :class="selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                            </button>
                            <div class="recording-history-player-copy">
                              <strong>{{ selectedRecordingsEntry.id === activeRecordingPlaybackId ? t('memorisation.recordings.playing') : t('memorisation.a11y.replayRecitation') }}</strong>
                              <span>{{ formatRecordingDuration(selectedRecordingsEntry.durationSeconds) }}</span>
                            </div>
                          </div>
                          <p v-else class="shared-result-recording-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ getRecitationValidationSummary(selectedRecordingsEntry) }}</span></p>
                        </div>
                      </section>
                    </div>
                  </div>

                  <div class="recording-history-footer"
                    :class="{ 'recording-history-footer--standard': !isAiCheckRecording(selectedRecordingsEntry) }">
                    <div class="recording-history-actions recording-history-actions--utility">
                      <button class="recording-history-utility-link" type="button"
                        @click="openRenameRecordingModal(selectedRecordingsEntry.id)">
                        <i class="bi bi-pencil-square"></i>
                        <span>{{ t('memorisation.recordings.rename') }}</span>
                      </button>
                    </div>
                  </div>

                </article>
              </div>

              <div v-else class="recordings-library-empty recordings-library-empty-panel">
                <div class="recordings-library-empty-icon">
                  <i class="bi bi-journal-music"></i>
                </div>
                <h3>{{ recordingsLibrarySearch ? t('memorisation.no_matching_recording') : t('memorisation.choose_a_recording') }}</h3>
                <p>{{ recordingsLibrarySearch ? t('memorisation.no_matching_recording_desc') : t('memorisation.choose_a_recording_desc') }}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      </div>
    </div>

    <Teleport to="body">
    <transition name="mutqin-flow">
    <div
      v-if="showPostSessionModal && !postSessionAiReciteActive && postSessionPrimarySurface !== 'builder'"
      class="post-session-simple post-session-simple--calm-v2 post-session-simple--premium"
      :class="{
        'post-session-simple--sample': onboardingSampleSessionActive,
        'workspace-tour-plan-active': workspaceTourActive && workspaceTourStep?.key === 'plan',
      }"
      :data-theme="theme"
      aria-live="polite"
    >
      <ViewportConfetti
        v-if="showPostSessionConfetti && !workspaceTourActive && !onboardingSampleSessionActive && !postSessionAiReciteActive"
      />
      <div class="post-session-simple__backdrop" aria-hidden="true"></div>

      <div
        class="post-session-simple__overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="postSessionTitle"
      >
        <div class="post-session-simple__dialog post-session-simple__dialog--lg">
          <header class="post-session-simple__header post-session-simple__header--calm">
            <span class="post-session-simple__check" aria-hidden="true">
              <i class="bi bi-check-lg"></i>
            </span>
            <div class="post-session-simple__header-copy">
              <h2 id="postSessionTitle" class="post-session-simple__title">
                {{ postSessionDisplayTitle }}
              </h2>
              <p
                v-if="postSessionDisplayLead"
                class="post-session-simple__subtitle"
              >
                {{ postSessionDisplayLead }}
              </p>
            </div>
          </header>

          <div class="post-session-simple__body">
            <template v-if="onboardingSampleSessionActive">
              <p v-if="postSessionNextStep" class="post-session-simple__sample-copy">{{ postSessionNextStep }}</p>
              <p class="onboarding-step-hint post-session-simple__sample-hint" role="note">
                {{ t('memorisation.onboarding.postSession.hint') }}
              </p>
            </template>

            <template v-else-if="postSessionRecommendationStep === 'memorisation_check_nudge'">
              <section
                class="post-session-simple__panel post-session-simple__panel--hero"
                aria-labelledby="postSessionMemorisationCheckNudgeTitle"
                data-testid="post-session-memorisation-check-nudge"
              >
                <h3 id="postSessionMemorisationCheckNudgeTitle" class="post-session-simple__panel-title" tabindex="-1">
                  {{ t('memorisation.postSession.memorisationCheckNudge.title') || 'Test your memorisation first?' }}
                </h3>
              </section>
            </template>

            <template v-else-if="postSessionRecommendationStep === 'confirm' && postSessionRecommendationActionable">
              <section class="post-session-simple__panel post-session-simple__panel--hero" aria-labelledby="postSessionConfirmTitle">
                <h3 id="postSessionConfirmTitle" class="post-session-simple__panel-title" tabindex="-1">
                  {{ postSessionConfirmationTitle }}
                </h3>
                <p class="post-session-simple__range">
                  <strong>{{ postSessionRecommendationDisplaySurahName }}</strong>
                  <span v-if="postSessionRecommendation?.ayah_range">
                    · {{ formatAyahRangeDisplay(
                      postSessionRecommendation.ayah_range.from,
                      postSessionRecommendation.ayah_range.to
                    ) }}
                  </span>
                </p>
                <div v-if="postSessionSimpleReason" class="post-session-simple__why">
                  <p class="post-session-simple__reason">{{ postSessionSimpleReason }}</p>
                </div>
                <p v-if="postSessionRecommendationStartError" class="post-session-simple__error" role="alert">
                  {{ postSessionRecommendationStartError }}
                </p>
              </section>
            </template>

            <template v-else>
              <section
                v-if="postSessionAiReviewDetails || postSessionAiResultLine"
                class="post-session-simple__ai-review post-session-simple__ai-review--guided"
                :class="{
                  'post-session-simple__ai-review--zero-match': postSessionAiPresentationMode === 'valid_zero_match',
                  'post-session-simple__ai-review--insufficient': postSessionAiPresentationMode === 'insufficient_audio',
                }"
                :data-presentation="postSessionAiPresentationMode"
                :data-outcome="postSessionAiReviewDetails?.outcome || 'mixed'"
                :aria-label="t('memorisation.a11y.aiMemorisationResult')"
                data-testid="post-session-section-1"
                data-tour="ai-results"
              >
                <div
                  class="post-session-simple__outcome post-session-simple__outcome--hero"
                  data-testid="post-session-outcome"
                  :data-outcome="postSessionAiReviewDetails?.outcome || 'mixed'"
                  :data-tone="postSessionOutcomeTone"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--step">
                    <span class="post-session-simple__step-num" aria-hidden="true">1</span>
                    {{ t('memorisation.postSession.recommendation.yourResult') || 'Your result' }}
                    <span
                      class="post-session-simple__beta-badge"
                      role="note"
                    >{{ t('memorisation.postSession.recommendation.aiRecitationBeta') || 'Audio recitation · Beta' }}</span>
                  </p>
                  <h3 class="post-session-simple__outcome-title">
                    {{ postSessionOutcomeHeadline }}
                  </h3>
                  <p
                    v-if="postSessionUnderstandingText"
                    class="post-session-simple__outcome-summary post-session-simple__ai-review-summary"
                  >
                    {{ postSessionUnderstandingText }}
                  </p>
                  <ul
                    v-if="postSessionOutcomeStatChips.length"
                    class="post-session-simple__outcome-tools"
                    :aria-label="t('memorisation.postSession.recommendation.resultStats') || 'Check results'"
                  >
                    <li
                      v-for="chip in postSessionOutcomeStatChips"
                      :key="`outcome-chip-${chip.key}`"
                      class="post-session-simple__outcome-chip"
                      :data-tone="chip.tone || 'soft'"
                      :title="chip.hint || chip.label"
                    >
                      <i v-if="chip.icon" :class="chip.icon" aria-hidden="true"></i>
                      <span class="post-session-simple__outcome-chip-label">{{ chip.label }}</span>
                      <strong class="post-session-simple__outcome-chip-value">{{ chip.value }}</strong>
                    </li>
                  </ul>
                </div>

                <div
                  v-if="postSessionInfoArchitecture.mainFocus.explanation || postSessionFocusAyahRows.length"
                  class="post-session-simple__focus-block post-session-simple__support-block"
                  data-testid="post-session-main-focus"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ postSessionInfoArchitecture.mainFocus.title }}
                  </p>
                  <p
                    v-if="postSessionInfoArchitecture.mainFocus.explanation"
                    class="post-session-simple__why-block post-session-simple__next-line"
                    data-testid="post-session-why"
                    data-section="main-focus-explanation"
                  >{{ postSessionInfoArchitecture.mainFocus.explanation }}</p>
                  <ul
                    v-if="postSessionFocusAyahRows.length"
                    class="post-session-simple__focus-ayah-list"
                    data-testid="post-session-focus-ayah-list"
                  >
                    <li
                      v-for="row in postSessionFocusAyahRows"
                      :key="`focus-ayah-${row.ayah || row.ayahLabel}`"
                      class="post-session-simple__focus-ayah-item"
                    >
                      <p
                        v-if="row.ayahLabel"
                        class="post-session-simple__focus-ayah-label"
                      >{{ row.ayahLabel }}</p>
                      <button
                        v-if="row.parts.length"
                        type="button"
                        class="post-session-simple__quran-focus"
                        :aria-label="t('memorisation.postSession.recommendation.playFocusPhrase') || 'Play focus phrase'"
                        :disabled="postSessionActionsBusy"
                        @click="onPostSessionFocusPhraseActivate(row.activatePayload)"
                      >
                        <span
                          class="post-session-simple__quran-focus-text"
                          dir="rtl"
                          lang="ar"
                        >
                          <span
                            v-for="(part, idx) in row.parts"
                            :key="`focus-${row.ayah}-${idx}`"
                            class="post-session-simple__quran-token"
                            :class="{
                              'is-weak': part.weak && part.tone !== 'omitted' && part.tone !== 'partial',
                              'is-incorrect': part.tone === 'incorrect',
                              'is-partial': part.tone === 'partial',
                              'is-omitted': part.tone === 'omitted',
                              'is-corrected': part.tone === 'ok' && !part.weak,
                            }"
                            :data-tone="part.tone || (part.weak ? 'incorrect' : 'ok')"
                          >
                            <span class="post-session-simple__quran-token-text">{{ part.text }}</span>
                          </span>
                        </span>
                        <i class="bi bi-play-circle post-session-simple__focus-phrase-icon" aria-hidden="true"></i>
                      </button>
                    </li>
                  </ul>
                </div>

                <section
                  v-if="postSessionInfoArchitecture.weakAreas.items.length"
                  class="post-session-simple__weak-spots post-session-simple__support-block"
                  data-testid="post-session-weak-spots"
                  data-tour="weak-areas"
                  :aria-label="postSessionInfoArchitecture.weakAreas.title"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ postSessionInfoArchitecture.weakAreas.title }}
                  </p>
                  <p
                    v-if="postSessionInfoArchitecture.weakAreas.lead"
                    class="post-session-simple__weak-spots-lead"
                    data-testid="post-session-weak-spots-lead"
                  >{{ postSessionInfoArchitecture.weakAreas.lead }}</p>
                  <ul class="post-session-simple__weak-spots-list post-session-simple__weak-spots-list--inline">
                    <li
                      v-for="row in postSessionInfoArchitecture.weakAreas.items"
                      :key="`weak-ayah-${row.ayah}`"
                      class="post-session-simple__weak-spots-item"
                    >
                      <strong class="post-session-simple__weak-spots-ayah">{{ row.ayahLabel }}</strong>
                      <span
                        v-if="row.wordEntries?.length"
                        class="post-session-simple__weak-spots-words"
                        dir="rtl"
                        lang="ar"
                      >
                        <span
                          v-for="(entry, wordIdx) in row.wordEntries"
                          :key="`weak-word-${row.ayah}-${wordIdx}`"
                          class="post-session-simple__weak-spots-word"
                          :class="{
                            'is-partial': entry.tone === 'partial',
                            'is-omitted': entry.tone === 'omitted',
                            'is-incorrect': entry.tone !== 'partial' && entry.tone !== 'omitted',
                          }"
                        >{{ entry.text }}<template v-if="wordIdx < row.wordEntries.length - 1"> · </template></span>
                      </span>
                      <span
                        v-else-if="row.wordsLabel"
                        class="post-session-simple__weak-spots-words"
                        dir="rtl"
                        lang="ar"
                      >{{ row.wordsLabel }}</span>
                    </li>
                  </ul>
                </section>

                <div v-if="postSessionShowAiDetailsToggle" class="post-session-simple__ai-details">
                  <button
                    type="button"
                    id="postSessionAiDetailsToggle"
                    class="post-session-simple__ai-details-toggle"
                    :aria-expanded="postSessionAiDetailsExpanded ? 'true' : 'false'"
                    aria-controls="postSessionAiDetailsDisclosure"
                    @click="postSessionAiDetailsExpanded = !postSessionAiDetailsExpanded"
                  >
                    {{ postSessionAiDetailsExpanded
                      ? (t('memorisation.postSession.recommendation.hideDetails') || 'Hide details')
                      : (t('memorisation.postSession.recommendation.viewDetails') || 'View details') }}
                  </button>
                  <div
                    v-if="postSessionAiDetailsExpanded"
                    id="postSessionAiDetailsDisclosure"
                    class="post-session-simple__ai-details-body"
                    role="region"
                    aria-labelledby="postSessionAiDetailsToggle"
                    data-testid="post-session-details"
                  >
                    <div
                      v-if="postSessionAiColourSegments.length"
                      class="post-session-simple__check-meter"
                      role="img"
                      :aria-label="t('memorisation.aiCheck.colourMeterAria')"
                    >
                      <div class="post-session-simple__check-meter-track" aria-hidden="true">
                        <span
                          v-for="segment in postSessionAiColourSegments"
                          :key="`ps-ai-meter-${segment.key}`"
                          class="post-session-simple__check-meter-segment"
                          :class="segment.tone"
                          :style="{ flexGrow: Math.max(segment.percent || segment.count, 1), flexBasis: 0 }"
                        ></span>
                      </div>
                      <ul class="post-session-simple__check-meter-legend">
                        <li
                          v-for="segment in postSessionAiColourSegments"
                          :key="`ps-ai-legend-${segment.key}`"
                          :class="segment.tone"
                        >
                          <span aria-hidden="true"></span>
                          {{ segment.label }}
                        </li>
                      </ul>
                    </div>
                    <ul class="post-session-simple__ai-metrics post-session-simple__ai-metrics--details">
                      <li
                        v-for="metric in postSessionAiDetailsMetrics"
                        :key="`detail-${metric.key}`"
                        :data-tone="metric.tone || 'soft'"
                      >
                        <span>{{ metric.label }}</span>
                        <strong>{{ metric.value }}</strong>
                      </li>
                    </ul>
                    <p
                      v-if="postSessionPreviousAttemptNote"
                      class="post-session-simple__previous-note"
                      data-testid="post-session-previous-attempt"
                    >{{ postSessionPreviousAttemptNote }}</p>
                    <div
                      v-if="postSessionRevisionComparison?.available"
                      class="post-session-simple__attempt-compare"
                      data-testid="post-session-attempt-compare"
                    >
                      <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                        {{ t('memorisation.postSession.recommendation.attemptCompareTitle') || 'Compared with earlier attempt' }}
                      </p>
                      <p class="post-session-simple__why-copy">{{ postSessionRevisionComparison.summary }}</p>
                      <ul
                        v-if="postSessionRevisionComparison.improved.length || postSessionRevisionComparison.continuedWeak.length"
                        class="post-session-simple__compare-list"
                      >
                        <li v-if="postSessionRevisionComparison.improved.length">
                          {{ t('memorisation.postSession.recommendation.attemptImproved', {
                            count: postSessionRevisionComparison.improved.length,
                          }) || `${postSessionRevisionComparison.improved.length} improved` }}
                        </li>
                        <li v-if="postSessionRevisionComparison.continuedWeak.length">
                          {{ t('memorisation.postSession.recommendation.attemptContinued', {
                            count: postSessionRevisionComparison.continuedWeak.length,
                          }) || `${postSessionRevisionComparison.continuedWeak.length} still need practice` }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section
                v-if="postSessionShowRecommendationPlan"
                class="post-session-simple__panel post-session-simple__panel--hero ps-rec-card"
                :class="{
                  'is-loading': postSessionRecommendationStatus === 'loading',
                  'is-empty': postSessionRecommendationStatus === 'empty' || !postSessionRecommendationActionable,
                }"
                :data-plan="postSessionPlanKind"
                :aria-busy="postSessionRecommendationStatus === 'loading' ? 'true' : 'false'"
                :aria-label="postSessionSimpleActionLabel"
                data-testid="post-session-practice-method"
                data-tour="rec-plan"
              >
                <div v-if="postSessionRecommendationStatus === 'loading'" class="post-session-simple__skeleton" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>
                <template v-else-if="postSessionRecommendationStatus === 'empty' || !postSessionRecommendationActionable">
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--step">
                    <span class="post-session-simple__step-num" aria-hidden="true">2</span>
                    {{ t('memorisation.postSession.recommendation.recommendedPlan') || 'Recommended plan' }}
                  </p>
                  <p class="post-session-simple__reason">
                    {{ postSessionSimpleReason || t('memorisation.postSession.recommendation.reasons.manualFallback') }}
                  </p>
                </template>
                <template v-else>
                  <div
                    class="post-session-simple__panel-head"
                    data-testid="post-session-personal-plan"
                  >
                    <p class="post-session-simple__section-kicker post-session-simple__section-kicker--step">
                      <span class="post-session-simple__step-num" aria-hidden="true">2</span>
                      {{ postSessionInfoArchitecture.whatToPractiseNext.title }}
                    </p>
                    <div
                      class="post-session-simple__next-target"
                      id="postSessionRecTitle"
                      data-testid="post-session-next-target"
                    >
                      <div
                        v-if="postSessionInfoArchitecture.whatToPractiseNext.surahArabicName
                          || postSessionInfoArchitecture.whatToPractiseNext.surahName"
                        class="post-session-simple__surah-row mutqin-surah-bilingual"
                      >
                        <p
                          v-if="postSessionInfoArchitecture.whatToPractiseNext.surahName"
                          class="post-session-simple__surah-latin workspace-shell-surah-en"
                          lang="en"
                          dir="ltr"
                          :class="{
                            'post-session-simple__surah-latin--solo':
                              !postSessionInfoArchitecture.whatToPractiseNext.surahArabicName,
                          }"
                        >
                          {{ postSessionInfoArchitecture.whatToPractiseNext.surahName }}
                        </p>
                        <span
                          v-if="postSessionInfoArchitecture.whatToPractiseNext.surahArabicName
                            && postSessionInfoArchitecture.whatToPractiseNext.surahName"
                          class="post-session-simple__surah-separator workspace-shell-surah-sep"
                          aria-hidden="true"
                        >·</span>
                        <p
                          v-if="postSessionInfoArchitecture.whatToPractiseNext.surahArabicName"
                          class="post-session-simple__surah-arabic workspace-shell-surah-ar"
                          lang="ar"
                          dir="rtl"
                        >
                          {{ postSessionInfoArchitecture.whatToPractiseNext.surahArabicName }}
                        </p>
                      </div>
                      <p
                        v-else
                        class="post-session-simple__action-label"
                      >
                        {{ postSessionInfoArchitecture.whatToPractiseNext.surahSetDisplay
                          || postSessionPersonalPlan?.range?.label
                          || postSessionRecommendationCardTitle
                          || postSessionInfoArchitecture.whatToPractiseNext.targetLabel
                          || postSessionSimpleActionLabel }}
                      </p>
                    </div>
                    <p
                      v-if="postSessionInfoArchitecture.whatToPractiseNext.targetLabel
                        && postSessionInfoArchitecture.whatToPractiseNext.targetLabel
                          !== postSessionInfoArchitecture.whatToPractiseNext.surahSetDisplay
                        && postSessionInfoArchitecture.whatToPractiseNext.targetLabel
                          !== postSessionInfoArchitecture.whatToPractiseNext.surahName
                        && postSessionInfoArchitecture.whatToPractiseNext.targetLabel
                          !== (postSessionPersonalPlan?.range?.label || '')"
                      class="post-session-simple__range"
                      data-testid="post-session-next-headline"
                    >
                      {{ postSessionInfoArchitecture.whatToPractiseNext.targetLabel }}
                    </p>
                    <p
                      v-if="postSessionInfoArchitecture.whatToPractiseNext.lead"
                      class="post-session-simple__next-lead"
                      data-testid="post-session-next-lead"
                    >
                      {{ postSessionInfoArchitecture.whatToPractiseNext.lead }}
                    </p>
                    <dl
                      v-if="(postSessionInfoArchitecture.whatToPractiseNext.metaRows || []).length"
                      class="post-session-simple__next-meta"
                      data-testid="post-session-next-meta"
                    >
                      <div
                        v-for="row in postSessionInfoArchitecture.whatToPractiseNext.metaRows"
                        :key="`next-meta-${row.key}`"
                        class="post-session-simple__next-meta-row"
                        :class="`post-session-simple__next-meta-row--${row.key}`"
                      >
                        <dt>{{ row.label }}</dt>
                        <dd>{{ row.value }}</dd>
                      </div>
                    </dl>
                    <button
                      v-if="postSessionRecommendationActionable"
                      type="button"
                      class="post-session-simple__link post-session-simple__adjust-plan"
                      data-testid="post-session-adjust-plan"
                      :disabled="postSessionActionsBusy"
                      @click="openPostSessionAdjustPlan"
                    >
                      {{ t('memorisation.postSession.recommendation.adjustPlan') || 'Adjust plan' }}
                    </button>
                  </div>

                  <div
                    v-if="postSessionPlanWhyText || postSessionPlanRevisionEmphasis"
                    class="post-session-simple__why post-session-simple__why--plan"
                    data-testid="post-session-plan-why"
                    data-tour="rec-why"
                  >
                    <p
                      v-if="postSessionPlanWhyText"
                      class="post-session-simple__why-heading"
                    >
                      {{ t('memorisation.postSession.recommendation.whyRecommended') || 'Why this was recommended' }}
                    </p>
                    <p
                      v-if="postSessionPlanWhyText"
                      class="post-session-simple__why-body"
                    >
                      {{ postSessionPlanWhyText }}
                    </p>
                    <ul
                      v-if="postSessionAiColourSegments.length"
                      class="post-session-simple__plan-colours"
                      data-testid="post-session-plan-colours"
                    >
                      <li
                        v-for="segment in postSessionAiColourSegments"
                        :key="`plan-colour-${segment.key}`"
                        :class="segment.tone"
                      >
                        <span aria-hidden="true"></span>
                        {{ segment.label }}
                      </li>
                    </ul>
                    <p
                      v-if="postSessionPlanRevisionEmphasis"
                      class="post-session-simple__plan-emphasis"
                      data-testid="post-session-revision-emphasis"
                    >
                      {{ postSessionPlanRevisionEmphasis }}
                    </p>
                  </div>

                  <div
                    v-if="postSessionInfoArchitecture.successFlow?.visible"
                    class="post-session-simple__success-flow post-session-simple__support-block"
                    data-testid="post-session-success-flow"
                  >
                    <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                      {{ postSessionInfoArchitecture.successFlow.title }}
                    </p>
                    <p
                      v-if="postSessionInfoArchitecture.successFlow.lead"
                      class="post-session-simple__success-flow-lead"
                    >
                      {{ postSessionInfoArchitecture.successFlow.lead }}
                    </p>
                    <ol class="post-session-simple__success-steps">
                      <li
                        v-for="step in postSessionInfoArchitecture.successFlow.steps"
                        :key="`success-step-${step.key}`"
                        class="post-session-simple__success-step"
                        :data-tone="step.tone"
                      >
                        <span class="post-session-simple__success-step-num" aria-hidden="true">{{ step.step }}</span>
                        <span class="post-session-simple__success-step-body">
                          <span class="post-session-simple__success-step-title">{{ step.title }}</span>
                          <span
                            v-if="step.detail"
                            class="post-session-simple__success-step-detail"
                          >{{ step.detail }}</span>
                          <span
                            v-if="step.technique"
                            class="post-session-simple__success-step-technique"
                          >{{ step.technique }}</span>
                        </span>
                      </li>
                    </ol>
                  </div>

                  <div
                    v-if="postSessionInfoArchitecture.revisionOptions.visible"
                    class="post-session-simple__scope-picker post-session-simple__support-block"
                    data-testid="post-session-scope-picker"
                    data-tour="rec-plans"
                    role="radiogroup"
                    :aria-label="postSessionInfoArchitecture.revisionOptions.lead"
                  >
                    <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                      {{ postSessionInfoArchitecture.revisionOptions.title }}
                    </p>
                    <div class="post-session-simple__scope-cards">
                      <button
                        v-for="option in postSessionInfoArchitecture.revisionOptions.options"
                        :key="option.id"
                        type="button"
                        class="post-session-simple__scope-card"
                        role="radio"
                        :aria-checked="postSessionSelectedPracticeScope === option.id ? 'true' : 'false'"
                        :class="{
                          'is-selected': postSessionSelectedPracticeScope === option.id,
                          'is-recommended': option.recommended,
                        }"
                        :disabled="postSessionActionsBusy"
                        :data-scope="option.id"
                        @click="selectPostSessionPracticeScope(option.id)"
                      >
                        <span class="post-session-simple__scope-card-top">
                          <span class="post-session-simple__scope-card-label">{{ option.label }}</span>
                          <span
                            v-if="option.recommended"
                            class="post-session-simple__scope-recommended"
                          >{{ t('memorisation.postSession.recommendation.recommendedTag') || 'Recommended' }}</span>
                        </span>
                        <span
                          v-if="option.benefit || option.description"
                          class="post-session-simple__scope-card-benefit"
                        >{{ option.benefit || option.description }}</span>
                        <span v-if="option.meta" class="post-session-simple__scope-card-meta">{{ option.meta }}</span>
                      </button>
                    </div>
                  </div>

                </template>
                <p
                  v-if="postSessionRecommendationStatus === 'error' && postSessionRecommendationError"
                  class="post-session-simple__error"
                  role="status"
                >
                  {{ postSessionRecommendationError }}
                  <button type="button" class="post-session-simple__link" @click="retryPostSessionRecommendation">
                    {{ t('memorisation.postSession.recommendation.retry') }}
                  </button>
                </p>
                <p v-if="postSessionRecommendationStartError" class="post-session-simple__error" role="alert">
                  {{ postSessionRecommendationStartError }}
                </p>
              </section>

              <section
                v-else-if="!postSessionHasAiCheck"
                class="post-session-simple__plan-prompt post-session-simple__plan-prompt--context"
                data-testid="post-session-awaiting-ai"
              >
                <p class="post-session-simple__section-kicker">
                  {{ translateOrFallback('memorisation.postSession.recommendation.justFinished', 'Just finished') }}
                </p>
                <p
                  v-if="postSessionJustFinishedSummary.surahLatin
                    || postSessionJustFinishedSummary.surahArabic
                    || postSessionJustFinishedSummary.range"
                  class="post-session-simple__plan-prompt-range"
                >
                  <span
                    v-if="postSessionJustFinishedSummary.surahLatin || postSessionJustFinishedSummary.surahArabic"
                    class="mutqin-surah-bilingual"
                  >
                    <span
                      v-if="postSessionJustFinishedSummary.surahLatin"
                      class="workspace-shell-surah-en"
                      lang="en"
                      dir="ltr"
                    >{{ postSessionJustFinishedSummary.surahLatin }}</span>
                    <span
                      v-if="postSessionJustFinishedSummary.surahLatin
                        && postSessionJustFinishedSummary.surahArabic
                        && postSessionJustFinishedSummary.surahLatin !== postSessionJustFinishedSummary.surahArabic"
                      class="workspace-shell-surah-sep"
                      aria-hidden="true"
                    >·</span>
                    <span
                      v-if="postSessionJustFinishedSummary.surahArabic"
                      class="workspace-shell-surah-ar"
                      lang="ar"
                      dir="rtl"
                    >{{ postSessionJustFinishedSummary.surahArabic }}</span>
                  </span>
                  <span v-if="postSessionJustFinishedSummary.range">
                    <template v-if="postSessionJustFinishedSummary.surahLatin || postSessionJustFinishedSummary.surahArabic"> · </template>{{ postSessionJustFinishedSummary.range }}
                  </span>
                </p>
                <ul
                  v-if="postSessionJustFinishedSummary.technique || postSessionJustFinishedSummary.reps"
                  class="post-session-simple__plan-prompt-meta"
                >
                  <li v-if="postSessionJustFinishedSummary.technique">{{ postSessionJustFinishedSummary.technique }}</li>
                  <li v-if="postSessionJustFinishedSummary.reps">
                    {{ translateOrFallback(
                      'memorisation.postSession.recommendation.repsDone',
                      `${postSessionJustFinishedSummary.reps} repetitions`,
                      { count: postSessionJustFinishedSummary.reps }
                    ) }}
                  </li>
                </ul>
                <p class="post-session-simple__plan-prompt-next">
                  {{ postSessionIsRepeatRecommendation
                    ? translateOrFallback(
                      'memorisation.postSession.coach.subtitles.retestAfterPractice',
                      translateOrFallback(
                        'memorisation.postSession.recommendation.aiFirstBody',
                        'Check your memorisation again to unlock the next session.'
                      )
                    )
                    : translateOrFallback(
                      'memorisation.postSession.recommendation.aiFirstBodyShort',
                      'Check your memorisation next to unlock a tailored practice plan.'
                    ) }}
                </p>
              </section>
            </template>
          </div>

          <footer class="post-session-simple__footer">
            <div
              class="post-session-simple__actions"
              :class="postSessionCtaButtons.length <= 2 ? 'post-session-simple__actions--2' : 'post-session-simple__actions--3'"
              data-testid="post-session-actions"
              data-tour="rec-cta"
              :data-cta-state="postSessionCtaState || undefined"
            >
              <template v-if="onboardingSampleSessionActive">
                <button type="button" class="post-session-simple__btn post-session-simple__btn--secondary" @click="repeatPostSession">
                  <span>{{ postSessionUi.repeat }}</span>
                </button>
                <button type="button" class="post-session-simple__btn post-session-simple__btn--secondary" @click="openPostSessionNewSessionOffcanvas">
                  <span>{{ postSessionUi.newSession }}</span>
                </button>
                <button type="button" class="post-session-simple__btn post-session-simple__btn--primary" @click="continueFromOnboardingPostSession">
                  <span>{{ t('memorisation.onboarding.postSession.continue') }}</span>
                </button>
              </template>

              <template v-else>
                <button
                  v-for="btn in postSessionCtaButtons"
                  :key="btn.id"
                  type="button"
                  class="post-session-simple__btn"
                  :class="`post-session-simple__btn--${btn.variant}`"
                  :disabled="postSessionCtaButtonDisabled(btn)"
                  :aria-busy="postSessionCtaButtonBusy(btn) ? 'true' : 'false'"
                  :aria-label="btn.label"
                  :data-action="btn.dataAction"
                  :data-tour="(btn.variant === 'primary' || btn.variant === 'ai' || btn.variant === 'success') ? 'rec-start' : undefined"
                  @click.stop.prevent="onPostSessionCtaAction(btn.action)"
                  @keydown.enter.stop.prevent="onPostSessionCtaAction(btn.action)"
                  @keydown.space.stop.prevent="onPostSessionCtaAction(btn.action)"
                >
                  <span>{{ btn.label }}</span>
                </button>
              </template>
            </div>
          </footer>
        </div>
      </div>
    </div>
    </transition>
    </Teleport>

    <div v-if="showRenameRecordingModal" class="modal-overlay mutqin-modal-overlay" @click.self="closeRenameRecordingModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
      <div class="modal-content mutqin-modal-surface confirm-modal rename-recording-modal" role="dialog" aria-modal="true"
        aria-labelledby="renameRecordingTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ t('memorisation.renameRecording.badge') }}</div>
            <h2 id="renameRecordingTitle">{{ t('memorisation.renameRecording.title') }}</h2>
          </div>
          <button class="modal-close-btn" @click="closeRenameRecordingModal" type="button" :aria-label="t('memorisation.renameRecording.closeDialog')">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <label class="save-name-label" for="renameRecordingInput">{{ t('memorisation.renameRecording.label') }}</label>
          <input id="renameRecordingInput" v-model.trim="renameRecordingName" class="save-name-input" type="text"
            maxlength="80" :placeholder="t('memorisation.renameRecording.placeholder')">
          <p v-if="renameRecordingError" class="save-name-error">{{ renameRecordingError }}</p>
        </div>
        <div class="modal-footer mutqin-modal-footer">
          <div class="mutqin-modal-actions mutqin-modal-actions--end">
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="closeRenameRecordingModal">
              <span>{{ t('common.cancel') }}</span>
            </button>
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="confirmRenameRecording">
              <span>{{ t('memorisation.renameRecording.saveName') }}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>

    <HifzPlanCreatorModal
      :visible="showHifzPlannerUi && showHifzPlanModal"
      :reciters="reciters"
      :speed-options="speedOptions"
      :backend-sync-enabled="learningBackendEnabled()"
      :owner-user-id="auth?.id || null"
      @close="closeHifzPlanModal"
      @saved="handleHifzPlanSaved"
    />

    <AyahNotesModal
      :visible="showAyahNotesModal"
      :surah-number="Number(ayahNotesTarget?.surahNumber || 0)"
      :ayah-number="Number(ayahNotesTarget?.ayahNumber || 0)"
      :surah-name="ayahNotesTarget?.surahName || ''"
      @close="closeAyahNotes"
      @changed="onAyahNotesChanged"
      @toast="onAyahNotesToast"
    />

    <!-- Global Audio Player -->
    <transition name="slide-up">
      <div
        v-if="appReady && showPlayerDock"
        class="player-dock"
        :class="{ 'tools-open': showTools, 'talqin-priority': talqinRecitationTurnActive, 'has-pill': playbackPillVisible }"
      >
        <button
          v-if="playbackPillVisible"
          type="button"
          class="playback-pill"
          @click="restorePlayer"
          :aria-label="t('memorisation.player.restorePlayer')"
        >
          <span class="playback-pill-ring" :class="{ 'is-playing': isPlaying }" aria-hidden="true"></span>
          <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
          <span class="playback-pill-copy">
            <strong>{{ collapsedPlayerTitle }}</strong>
            <small>{{ collapsedPlayerSubtitle }}</small>
          </span>
        </button>

        <div
          v-else
          class="player-dock-card"
          :class="{ 'is-talqin-only': playerDockShowsTalqinOnly, 'is-unified': talqinRecitationTurnActive && playerBarVisible }"
        >
          <div
            v-if="talqinRecitationTurnActive"
            class="player-talqin-strip"
            role="status"
            aria-live="polite"
            :aria-label="talqinRecitationPrompt"
          >
            <div
              v-if="talqinCalloutSeconds > 0"
              :key="talqinCalloutSeconds"
              class="talqin-callout-number"
              aria-hidden="true"
            >
              {{ talqinCalloutSeconds }}
            </div>
            <div class="talqin-callout-text">{{ talqinCalloutHeadline }}</div>
          </div>

        <div
          v-if="playerBarVisible"
          class="player-bar"
          :class="{ compact: playerCompact, 'is-playing': isPlaying, 'has-talqin-strip': talqinRecitationTurnActive }"
          role="region"
          :aria-label="t('memorisation.player.audioPlayer')"
        >
          <div class="player-accent" aria-hidden="true"></div>

          <div v-if="!playerCompact" class="player-main">
            <div class="player-info">
              <div class="player-chapter">{{ getChapterDisplayName(currentChapter) || t('memorisation.player.quranFallback') }}</div>
              <div class="player-verse">
                {{ activeAyahLabel }}
                <span v-if="etaLabel && isPlaying" class="player-eta" :title="getEtaTooltip()">
                  &bull; {{ t('memorisation.player.remaining', { eta: etaLabel }) }}
                </span>
              </div>
            </div>

            <div class="player-controls">
              <button class="player-btn" @click="prev" :title="t('memorisation.player.previous')" type="button" :aria-label="t('memorisation.player.previousAyah')">
                <i class="bi bi-skip-start-fill" aria-hidden="true"></i>
              </button>
              <button class="player-btn player-play" @click="togglePlay" :title="t('memorisation.player.playPause')" type="button"
                :aria-label="isPlaying ? t('memorisation.player.pauseAudio') : t('memorisation.player.playAudio')">
                <span class="player-play-ring" aria-hidden="true"></span>
                <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
              </button>
              <button class="player-btn" @click="next" :title="t('memorisation.player.next')" type="button" :aria-label="t('memorisation.player.nextAyah')">
                <i class="bi bi-skip-end-fill" aria-hidden="true"></i>
              </button>
            </div>

            <div class="player-progress-wrap">
              <span class="player-time elapsed">{{ formatTime(currentTime) }}</span>
              <div class="player-progress-bg" @click="seek" ref="progress" role="progressbar" :aria-label="t('memorisation.player.audioProgress')"
                :aria-valuenow="Math.round((currentTime / (duration || 1)) * 100)" aria-valuemin="0" aria-valuemax="100">
                <div class="player-progress-fill" :style="{ width: (currentTime / (duration || 1)) * 100 + '%' }"></div>
                <div class="player-progress-thumb" :style="{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }"></div>
              </div>
              <span class="player-time total">{{ formatTime(duration) }}</span>
            </div>

            <div class="player-actions">
              <button class="player-btn player-layout-toggle" @click="setPlayerCompact(true)" :title="t('memorisation.player.miniPlayer')" type="button"
                :aria-label="t('memorisation.player.switchMini')">
                <i class="bi bi-dash-lg" aria-hidden="true"></i>
              </button>
              <button class="player-btn player-close" @click="dismissPlayer" :title="t('memorisation.player.closePlayer')" type="button"
                :aria-label="t('memorisation.player.closeAudioPlayer')">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div v-else class="player-mini">
            <button class="player-btn player-play" @click="togglePlay" :title="t('memorisation.player.playPause')" type="button"
              :aria-label="isPlaying ? t('memorisation.player.pauseAudio') : t('memorisation.player.playAudio')">
              <span class="player-play-ring" aria-hidden="true"></span>
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
            </button>
            <div class="player-mini-info" aria-hidden="true">
              <div class="player-chapter">{{ collapsedPlayerTitle }}</div>
              <div class="player-verse">{{ collapsedPlayerSubtitle }}</div>
            </div>
            <button class="player-btn player-layout-toggle" @click="setPlayerCompact(false)" :title="t('memorisation.player.fullPlayer')" type="button"
              :aria-label="t('memorisation.player.switchFull')">
              <i class="bi bi-arrows-angle-expand" aria-hidden="true"></i>
            </button>
            <button class="player-btn player-close" @click="dismissPlayer" :title="t('memorisation.player.closePlayer')" type="button"
              :aria-label="t('memorisation.player.closeAudioPlayer')">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        </div>
      </div>
    </transition>

    <transition name="back-to-top">
      <button
        v-if="showBackToTop"
        type="button"
        class="back-to-top-fab fab-btn"
        :aria-label="t('common.backToTop')"
        :title="t('common.backToTop')"
        @click="scrollPageToTop"
      >
        <i class="bi bi-arrow-up-short" aria-hidden="true"></i>
      </button>
    </transition>

    <!-- Audio System -->
    <audio ref="audio" style="display:none"></audio>
    <audio ref="recordingsAudio" style="display:none"></audio>
    <audio ref="reviewResultAudio" style="display:none"
      @loadedmetadata="onReviewResultAudioLoadedMetadata"
      @timeupdate="onReviewResultAudioTimeUpdate"
      @play="onReviewResultAudioPlay"
      @pause="onReviewResultAudioPause"
      @ended="onReviewResultAudioEnded"
      @waiting="onReviewResultAudioWaiting"
      @canplay="onReviewResultAudioCanPlay"
      @stalled="onReviewResultAudioWaiting"
      @error="onReviewResultAudioError"></audio>

    <div v-if="showQuranSearchModal" class="quran-search-modal-backdrop" role="presentation"
      @click.self="closeQuranSearchModal">
      <section class="quran-search-modal" role="dialog" aria-modal="true" :aria-label="t('memorisation.quranSearch.title')">
        <header class="quran-search-header">
          <div></div>
          <button class="quran-search-close pill-control" type="button" @click="closeQuranSearchModal"
            :aria-label="t('memorisation.quranSearch.close')">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="quran-search-input-row">
          <label class="quran-search-input-shell" for="quranSearchInput">
            <i class="bi bi-search" aria-hidden="true"></i>
            <input id="quranSearchInput" ref="quranSearchInput" v-model.trim="quranSearchQuery" type="search"
              dir="auto" :placeholder="t('memorisation.quranSearch.inputPlaceholder')"
              @keydown.enter.prevent="runQuranSearch" />
          </label>
          <button class="pill-control quran-search-voice" :class="{ active: quranSearchVoiceActive }" type="button"
            @click="toggleQuranVoiceSearch" :disabled="!supportsQuranVoiceSearch"
            :title="supportsQuranVoiceSearch ? t('memorisation.quranSearch.voiceSearch') : t('memorisation.quranSearch.voiceSearchUnsupported')">
            <i class="bi" :class="quranSearchVoiceActive ? 'bi-mic-fill' : 'bi-mic'" aria-hidden="true"></i>
            <span>{{ quranSearchVoiceActive ? t('memorisation.quranSearch.listening') : t('memorisation.quranSearch.voice') }}</span>
          </button>
          <button class="pill-control quran-search-submit" type="button" @click="runQuranSearch"
            :disabled="quranSearchLoading || quranSearchWordCount < 3">
            <i class="bi bi-arrow-return-left" aria-hidden="true"></i>
            <span>{{ quranSearchLoading ? t('memorisation.quranSearch.searching') : t('memorisation.quranSearch.search') }}</span>
          </button>
        </div>

        <p class="quran-search-hint" :class="{ warning: quranSearchQuery && quranSearchWordCount < 3 }">
          {{ t('memorisation.enter_a_minimum_of_3_words_results_match_the_same_') }}
        </p>

        <div class="quran-search-controls">
          <div class="quran-search-filter-grid">
            <label>
              <span>{{ t('common.filter') }}</span>
              <select v-model="quranSearchFilterType" class="quran-search-select">
                <option v-for="filter in quranSearchFilterOptions" :key="filter.value" :value="filter.value">
                  {{ filter.label }}
                </option>
              </select>
            </label>
            <label v-if="quranSearchFilterType !== 'all'">
              <span>{{ quranSearchFilterLabel }}</span>
              <input v-if="quranSearchFilterType !== 'surah'" v-model.number="quranSearchFilterValue"
                class="quran-search-filter-input" type="number" min="1" :max="quranSearchFilterMax"
                :placeholder="quranSearchFilterPlaceholder" />
              <select v-else v-model.number="quranSearchFilterValue" class="quran-search-select">
                <option value="">{{ t('memorisation.any_surah') }}</option>
                <option v-for="chapter in chapters" :key="chapter.id" :value="chapter.id">
                  {{ chapterOptionLabel(chapter) }}
                </option>
              </select>
            </label>
          </div>
          <div class="quran-search-pill-row" :aria-label="t('memorisation.quranSearch.displayOptions')">
            <button class="pill-control" :class="{ active: quranSearchShowTranslation }" type="button"
              @click="quranSearchShowTranslation = !quranSearchShowTranslation">
              <i class="bi bi-translate" aria-hidden="true"></i>
              <span>{{ quranSearchShowTranslation ? t('memorisation.common.translationOn') : t('memorisation.common.translationOff') }}</span>
            </button>
            <button class="pill-control" type="button" @click="adjustQuranSearchFont(-4)">
              <i class="bi bi-dash-lg" aria-hidden="true"></i>
              <span>{{ t('memorisation.reading.font') }}</span>
            </button>
            <span class="quran-search-font-pill">{{ quranSearchFontSize }}px</span>
            <button class="pill-control" type="button" @click="adjustQuranSearchFont(4)">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              <span>{{ t('memorisation.reading.font') }}</span>
            </button>
          </div>
        </div>

        <div v-if="quranSearchError" class="quran-search-status error">{{ quranSearchError }}</div>
        <div v-else-if="quranSearchLoading" class="quran-search-status">
          <i class="bi bi-hourglass-split" aria-hidden="true"></i>
          <span>{{ t('memorisation.loading_quran_search_index') }}</span>
        </div>
        <div v-else-if="quranSearchHasRun && !filteredQuranSearchResults.length" class="quran-search-status">
          {{ t('memorisation.no_matching_ayahs_found_for_this_passage_and_filte') }}
        </div>

        <div v-if="filteredQuranSearchResults.length" class="quran-search-results" aria-live="polite">
          <div class="quran-search-results-head">
            <strong>{{ filteredQuranSearchResults.length === 1 ? t('memorisation.quranSearch.resultsFoundOne', { count: filteredQuranSearchResults.length }) : t('memorisation.quranSearch.resultsFoundOther', { count: filteredQuranSearchResults.length }) }}</strong>
            <span>{{ quranSearchFilterSummary }}</span>
          </div>
          <article v-for="result in filteredQuranSearchResults" :key="result.key" class="quran-search-result-card">
            <div class="quran-search-result-meta">
              <span>{{ formatSurahAyahDisplay(result.surahName, result.ayah) }}</span>
              <small>{{ t('memorisation.quranSearch.resultMeta', { juz: result.juz, hizb: result.hizb, page: result.page, word: result.firstWordIndex || 1 }) }}</small>
            </div>
            <p class="quran-search-arabic" dir="rtl" :style="{ fontSize: `${quranSearchFontSize}px`, fontFamily: quranFontFamily }"
              v-html="highlightQuranSearchMatch(result.arabic, result.matchSource === 'arabic')"></p>
            <p v-if="quranSearchShowTranslation && result.translation" class="quran-search-translation"
              v-html="highlightQuranSearchMatch(result.translation, result.matchSource === 'translation')"></p>
          </article>
        </div>
      </section>
    </div>

  </div>

    <AiMemorisationDetectionModal
      v-if="aiTestModalsEnabled && amdOpen && isAmdEntryActive(amdEntrySource)"
      ref="amdModal"
      :open="true"
      :stage="amdStage"
      :title="amdTitle"
      :range-label="amdRangeLabel"
      :beta-badge="amdLabels.betaBadge"
      :disclaimer="amdLabels.disclaimer"
      :mic-status="amdLearnerMicStatus"
      :mic-status-label="amdLearnerMicStatusLabel"
      :mic-guidance="amdMicGuidance"
      :live-hint="amdLiveHint"
      :recording-active-label="amdRecordingActiveLabel"
      :ayah-html="amdStaticAyahHtml"
      :blur-active="amdHiddenTextEnabled"
      :peeking="amdPeekActive"
      :difficulty="amdDifficultyPercent"
      :difficulty-options="amdDifficultyOptions"
      :error="amdError"
      :busy="amdBusy"
      :ending-soon="amdEndingSoon"
      :error-action="amdErrorAction"
      :close-label="amdLabels.close"
      :tools-label="amdLabels.tools"
      :blur-label="amdLabels.blur"
      :peek-label="amdLabels.peek"
      :peek-hint-label="amdLabels.peekHint"
      :stop-label="amdLabels.stop"
      :start-label="amdLabels.start"
      :start-hint="amdLabels.startHint"
      :reset-label="amdLabels.reset"
      :difficulty-label="amdLabels.difficulty"
      :words-shown-label="amdLabels.wordsShown"
      :words-shown-short="amdLabels.wordsShownShort"
      :elapsed-label="amdElapsedLabel"
      :elapsed-timer-label="amdLabels.elapsedTimer || 'Recitation time'"
      :elapsed-timer-hint="amdLabels.elapsedTimerHint || 'How long this recitation has taken'"
      :theme="theme"
      :mistake-visual-active="amdMistakeVisualActive"
      :mistake-visual-label="amdLabels.mistakeVisualLabel"
      :auto-follow-label="amdLabels.autoFollow"
      :auto-follow-on-label="amdLabels.autoFollowOn"
      :auto-follow-off-label="amdLabels.autoFollowOff"
      :auto-follow-paused-label="amdLabels.autoFollowPaused"
      :auto-follow-resume-label="amdLabels.autoFollowResume"
      :auto-follow-hint="amdLabels.autoFollowHint"
      :complete-title="amdLabels.completeTitle"
      :complete-body="amdLabels.completeBody"
      :session-ended-label="amdLabels.sessionEnded"
      :session-ended-body="amdLabels.sessionEndedBody"
      :test-again-label="amdLabels.testAgain"
      :done-label="amdLabels.done"
      :enable-mic-label="amdLabels.enableMic"
      :try-again-label="amdLabels.retry"
      :empty-ayah-title="t('memorisation.amd.emptyAyahTitle')"
      :empty-ayah-desc="t('memorisation.amd.emptyAyahDesc')"
      :generic-error="t('common.status.errorDesc')"
      @cancel="closeAmdModalToCompletion"
      @toggle-blur="toggleAmdHiddenText"
      @peek-start="startAmdPeek"
      @peek-end="stopAmdPeek"
      @reset="resetAmdLiveSurface"
      @set-difficulty="setAmdDifficulty"
      @start="startAmdAssessment"
      @stop="stopAmdAndAssess"
      @test-again="resetAmdLiveSurface"
      @done="doneAmdTest"
      @retry="retryAmdAssessment"
      @enable-mic="startAmdAssessment"
    />

    <AiAudioConsentModal
      :open="showAiAudioConsentModal"
      :title="aiAudioConsentTitle"
      :lead="aiAudioConsentBody"
      :privacy-policy-url="aiAudioConsentPrivacyUrl"
      :privacy-policy-label="aiAudioConsentPrivacyLinkLabel"
      :accept-label="aiAudioConsentAcceptLabel"
      :decline-label="aiAudioConsentDeclineLabel"
      @accept="onAiAudioConsentAccept"
      @decline="onAiAudioConsentDecline"
    />

  <div
    v-if="postSessionAdaptiveCheckActive && !postSessionAiReciteActive && !amdOpen"
    class="memory-check-overlay"
    :data-theme="theme"
    role="dialog"
    aria-modal="true"
    aria-labelledby="memoryCheckTitle"
  >
    <div
      class="memory-check-card"
      :class="{ 'memory-check-card--result': !!postSessionAdaptiveResultView }"
      :data-feedback="postSessionAdaptiveFeedback || undefined"
      :data-band="postSessionAdaptiveResultView?.objectiveBand || undefined"
    >
      <header class="memory-check-header" :class="{ 'memory-check-header--result': !!postSessionAdaptiveResultView }">
        <div class="memory-check-header-copy">
          <template v-if="postSessionAdaptiveResultView">
            <div class="memory-check-result-kicker">
              <span class="memory-check-result-kicker-label">
                {{ t('memorisation.postSession.adaptiveCheck.quizAiTitle') }}
              </span>
              <span
                class="memory-check-band-pill"
                :data-band="postSessionAdaptiveResultView.objectiveBand || 'mixed'"
              >
                {{ postSessionQuizResultBandLabel }}
              </span>
            </div>
            <h2 id="memoryCheckTitle" class="memory-check-title memory-check-title--result">
              {{ postSessionAdaptiveResultView.headline }}
            </h2>
          </template>
          <template v-else>
            <h2 id="memoryCheckTitle" class="memory-check-title">
              {{ t('memorisation.postSession.adaptiveCheck.quizAiTitle') }}
            </h2>
            <div class="memory-check-progress" aria-hidden="true">
              <span
                v-for="n in postSessionAdaptiveProgressTotal"
                :key="n"
                class="memory-check-dot"
                :class="{
                  'is-done': n < postSessionAdaptiveProgressCurrent,
                  'is-current': n === postSessionAdaptiveProgressCurrent
                }"
              ></span>
            </div>
            <p class="memory-check-sub">
              {{ postSessionAdaptiveProgressLabel }}
            </p>
          </template>
        </div>
        <button
          type="button"
          class="memory-check-close"
          :aria-label="t('common.close')"
          @click="closePostSessionAdaptiveCheck({ abandon: !postSessionAdaptiveResultView })"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>

      <div v-if="postSessionAdaptiveResultView" class="memory-check-body memory-check-body--result">
        <section class="quiz-ai-result" :data-band="postSessionAdaptiveResultView.objectiveBand || 'mixed'">
          <p v-if="postSessionQuizScoreLine" class="quiz-ai-result__score quiz-ai-result__score--top">
            {{ postSessionQuizScoreLine }}
          </p>

          <div class="quiz-ai-result__grid">
            <section class="quiz-ai-result__panel">
              <p class="quiz-ai-result__label">
                {{ t('memorisation.postSession.adaptiveCheck.resultFoundLabel') }}
              </p>
              <p class="quiz-ai-result__lead">
                {{ postSessionAdaptiveResultView.why || postSessionAdaptiveResultView.explanation }}
              </p>
              <div v-if="postSessionQuizResultPills.length" class="quiz-ai-result__pills">
                <span
                  v-for="pill in postSessionQuizResultPills"
                  :key="pill.key"
                  class="quiz-ai-result__pill"
                  :data-tone="pill.tone || undefined"
                >
                  {{ pill.label }}
                </span>
              </div>
              <ul v-if="postSessionQuizSkillRows.length" class="quiz-ai-result__skills">
                <li
                  v-for="skill in postSessionQuizSkillRows"
                  :key="skill.key"
                  :data-band="skill.band || 'steady'"
                >
                  <span>{{ skill.label }}</span>
                  <strong>{{ skill.bandLabel || skill.band }}</strong>
                </li>
              </ul>
            </section>

            <section
              v-if="postSessionAiReviewDetails || postSessionAiResultLine"
              class="quiz-ai-result__panel quiz-ai-result__panel--ai"
              :data-presentation="postSessionAiPresentationMode"
            >
              <p class="quiz-ai-result__label">
                {{ t('memorisation.postSession.adaptiveCheck.aiReciteTitle') }}
              </p>
              <div class="quiz-ai-result__ai-head">
                <span
                  class="memory-check-band-pill"
                  :data-band="postSessionAiPresentationMode === 'valid_zero_match'
                    ? 'soft-warn'
                    : (postSessionAiPresentationMode === 'insufficient_audio'
                      ? 'insufficient'
                      : (postSessionAiReviewDetails?.outcome || 'mixed'))"
                >
                  {{ postSessionAiReviewDetails?.outcomeLabel || t('memorisation.postSession.recommendation.aiOutcomeMixed') }}
                </span>
                <p>{{ postSessionAiReviewDetails?.summaryLine || postSessionAiResultLine }}</p>
              </div>
              <div v-if="postSessionShowAiDetailsToggle" class="post-session-simple__ai-details">
                <button
                  type="button"
                  id="postSessionQuizAiDetailsToggle"
                  class="post-session-simple__ai-details-toggle"
                  :aria-expanded="postSessionAiDetailsExpanded ? 'true' : 'false'"
                  aria-controls="postSessionQuizAiDetailsDisclosure"
                  @click="postSessionAiDetailsExpanded = !postSessionAiDetailsExpanded"
                >
                  {{ postSessionAiDetailsExpanded
                    ? (t('memorisation.postSession.recommendation.hideDetails') || 'Hide details')
                    : (t('memorisation.postSession.recommendation.viewDetails') || 'View details') }}
                </button>
                <div
                  v-if="postSessionAiDetailsExpanded"
                  id="postSessionQuizAiDetailsDisclosure"
                  class="post-session-simple__ai-details-body"
                  role="region"
                  aria-labelledby="postSessionQuizAiDetailsToggle"
                >
                  <div
                    v-if="postSessionAiColourSegments.length"
                    class="post-session-simple__check-meter quiz-ai-result__meter"
                    role="img"
                    :aria-label="t('memorisation.aiCheck.colourMeterAria')"
                  >
                    <div class="post-session-simple__check-meter-track" aria-hidden="true">
                      <span
                        v-for="segment in postSessionAiColourSegments"
                        :key="`quiz-ai-meter-${segment.key}`"
                        class="post-session-simple__check-meter-segment"
                        :class="segment.tone"
                        :style="{ flexGrow: segment.count, flexBasis: 0 }"
                      ></span>
                    </div>
                    <ul class="post-session-simple__check-meter-legend">
                      <li
                        v-for="segment in postSessionAiColourSegments"
                        :key="`quiz-ai-legend-${segment.key}`"
                        :class="segment.tone"
                      >
                        <span aria-hidden="true"></span>
                        {{ segment.label }}
                      </li>
                    </ul>
                  </div>
                  <ul class="quiz-ai-result__metrics">
                    <li
                      v-for="metric in postSessionAiDetailsMetrics"
                      :key="`quiz-detail-${metric.key}`"
                      data-tone="soft"
                    >
                      <span>{{ metric.label }}</span>
                      <strong>{{ metric.value }}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section
              v-else
              class="quiz-ai-result__panel quiz-ai-result__panel--ai quiz-ai-result__panel--empty"
            >
              <p class="quiz-ai-result__label">
                {{ t('memorisation.postSession.adaptiveCheck.aiReciteTitle') }}
              </p>
              <p class="quiz-ai-result__lead">
                {{ t('memorisation.postSession.adaptiveCheck.aiReciteNotRun') }}
              </p>
            </section>
          </div>

          <section class="quiz-ai-result__next">
            <p class="quiz-ai-result__label">
              {{ t('memorisation.postSession.adaptiveCheck.resultNextLabel') }}
            </p>
            <p class="quiz-ai-result__next-text">
              {{ postSessionQuizResultPlanLine }}
            </p>
          </section>
        </section>

        <div class="memory-check-actions memory-check-actions--result">
          <button type="button" class="memory-check-btn memory-check-btn--primary" @click="acceptAdaptiveRecommendation">
            {{ t('memorisation.postSession.adaptiveCheck.continueToPlan') }}
          </button>
        </div>
      </div>

      <div v-else-if="postSessionAdaptiveQuestion" class="memory-check-body">
        <p class="memory-check-ask">{{ postSessionAdaptiveFriendlyPrompt }}</p>

        <div
          v-if="postSessionAdaptiveQuestion.promptHtml"
          class="memory-check-ayah"
          dir="rtl"
          lang="ar"
        >{{ postSessionAdaptiveQuestion.promptHtml }}</div>

        <div
          v-if="postSessionAdaptiveQuestion.renderer === 'mcq' || postSessionAdaptiveQuestion.renderer === 'mcq_simple'"
          class="memory-check-choices"
          role="listbox"
          :aria-label="t('memorisation.postSession.adaptiveCheck.selectAnswer')"
        >
          <button
            v-for="(opt, idx) in postSessionAdaptiveQuestion.options"
            :key="`${idx}-${opt}`"
            type="button"
            class="memory-check-choice"
            role="option"
            :class="{
              'is-selected': postSessionAdaptiveSelectedOption === idx,
              'is-correct': postSessionAdaptiveFeedback === 'correct' && postSessionAdaptiveSelectedOption === idx,
              'is-wrong': postSessionAdaptiveFeedback === 'incorrect' && postSessionAdaptiveSelectedOption === idx
            }"
            :disabled="!!postSessionAdaptiveFeedback || postSessionAdaptiveCheckBusy"
            :aria-selected="postSessionAdaptiveSelectedOption === idx ? 'true' : 'false'"
            @click="selectAdaptiveOption(idx)"
          >
            <span class="memory-check-choice-mark" aria-hidden="true">{{ idx + 1 }}</span>
            <span class="memory-check-choice-text" dir="rtl">{{ opt }}</span>
          </button>
        </div>

        <div v-else-if="postSessionAdaptiveQuestion.renderer === 'ordering'" class="memory-check-order">
          <p class="memory-check-order-hint">{{ t('memorisation.postSession.adaptiveCheck.reorderHint') }}</p>
          <div
            v-for="(seg, idx) in postSessionAdaptiveOrdering"
            :key="seg._id || idx"
            class="memory-check-order-item"
          >
            <span class="memory-check-order-index" aria-hidden="true">{{ idx + 1 }}</span>
            <span class="memory-check-order-text" dir="rtl">{{ seg.text || seg.label || seg }}</span>
            <div class="memory-check-order-moves">
              <button
                type="button"
                class="memory-check-mini"
                :disabled="idx === 0 || !!postSessionAdaptiveFeedback"
                :aria-label="t('memorisation.postSession.adaptiveCheck.moveUp')"
                @click="moveAdaptiveOrdering(idx, -1)"
              >
                <i class="bi bi-chevron-up" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="memory-check-mini"
                :disabled="idx === postSessionAdaptiveOrdering.length - 1 || !!postSessionAdaptiveFeedback"
                :aria-label="t('memorisation.postSession.adaptiveCheck.moveDown')"
                @click="moveAdaptiveOrdering(idx, 1)"
              >
                <i class="bi bi-chevron-down" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="postSessionAdaptiveQuestion.renderer === 'open'" class="memory-check-open">
          <label class="visually-hidden" for="adaptiveOpenAnswer">{{ t('memorisation.postSession.adaptiveCheck.typeAnswer') }}</label>
          <textarea
            id="adaptiveOpenAnswer"
            v-model="postSessionAdaptiveAnswer"
            class="memory-check-textarea"
            dir="rtl"
            rows="3"
            :disabled="!!postSessionAdaptiveFeedback"
            :placeholder="t('memorisation.postSession.adaptiveCheck.typeAnswer')"
          ></textarea>
        </div>

        <div v-else-if="aiTestModalsEnabled && postSessionAdaptiveQuestion.renderer === 'ai_recite'" class="memory-check-ai-panel">
          <div class="memory-check-ai-icon" aria-hidden="true"><i class="bi bi-stars"></i></div>
          <p>{{ t('memorisation.postSession.adaptiveCheck.aiRecitePrompt') }}</p>
        </div>
        <div v-else-if="!aiTestModalsEnabled && postSessionAdaptiveQuestion.renderer === 'ai_recite'" class="memory-check-ai-panel">
          <p>{{ t('memorisation.postSession.adaptiveCheck.aiReciteNotRun') || 'Voice check is temporarily unavailable. Continue with your plan.' }}</p>
        </div>

        <p
          v-if="postSessionAdaptiveFeedback"
          class="memory-check-feedback"
          :data-tone="postSessionAdaptiveFeedback"
          role="status"
        >
          {{ postSessionAdaptiveFeedbackLabel }}
        </p>
        <p v-else-if="postSessionAdaptiveHintText" class="memory-check-hint" role="status">
          {{ postSessionAdaptiveHintText }}
        </p>
        <p v-if="postSessionAdaptiveError" class="post-session-simple__error" role="alert">
          {{ postSessionAdaptiveError }}
        </p>

        <div
          v-if="postSessionAdaptiveQuestion.renderer !== 'mcq' && postSessionAdaptiveQuestion.renderer !== 'mcq_simple'"
          class="memory-check-actions"
        >
          <button
            type="button"
            class="memory-check-btn memory-check-btn--ghost"
            :disabled="postSessionAdaptiveCheckBusy || postSessionAdaptiveUsedHint || !!postSessionAdaptiveFeedback"
            @click="useAdaptiveHint"
          >
            {{ t('memorisation.postSession.adaptiveCheck.hint') }}
          </button>
          <button
            type="button"
            class="memory-check-btn memory-check-btn--primary"
            :disabled="postSessionAdaptiveCheckBusy || !!postSessionAdaptiveFeedback"
            @click="submitAdaptiveAnswer"
          >
            <span
              v-if="postSessionAdaptiveCheckBusy"
              class="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
            <span>
              {{ (aiTestModalsEnabled && postSessionAdaptiveQuestion.requiresAiRecite)
                ? t('memorisation.postSession.adaptiveCheck.startAiRecite')
                : t('memorisation.postSession.adaptiveCheck.submit') }}
            </span>
          </button>
        </div>
        <div v-else class="memory-check-actions memory-check-actions--mcq">
          <button
            type="button"
            class="memory-check-text-link"
            :disabled="postSessionAdaptiveCheckBusy || postSessionAdaptiveUsedHint || !!postSessionAdaptiveFeedback"
            @click="useAdaptiveHint"
          >
            {{ t('memorisation.postSession.adaptiveCheck.hint') }}
          </button>
          <button
            type="button"
            class="memory-check-text-link"
            :disabled="postSessionAdaptiveCheckBusy || !!postSessionAdaptiveFeedback"
            @click="skipAdaptiveQuestion"
          >
            {{ t('memorisation.postSession.adaptiveCheck.skip') }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="quizActive" class="quiz-overlay" @click.self="stopQuiz">
    <div class="quiz-card modal-lg" role="dialog" aria-modal="true" :aria-labelledby="'quizModalTitle'">
      <div class="quiz-top">
        <div class="quiz-title-wrap">
          <div id="quizModalTitle" class="quiz-title">{{ t('memorisation.quiz.title') }}</div>
          <div class="quiz-title-sub">{{ quizContextLabel }}</div>
        </div>
        <button type="button" class="quiz-x" :aria-label="t('common.close')" @click="stopQuiz">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div v-if="!quizSummaryActive" class="quiz-meta">
        <span class="quiz-chip">
          <i class="bi bi-ui-checks-grid"></i>
          {{ t('memorisation.quiz.progress', { current: quizIndex + 1, total: quizQueue.length }) }}
        </span>
        <span v-if="quizCard" class="quiz-chip">
          <i class="bi bi-diagram-3"></i>
          {{ quizCardTypeLabel }}
        </span>
        <span v-if="quizCard?.key" class="quiz-chip">
          <i class="bi bi-bookmark"></i>
          {{ quizCard.key }}
        </span>
      </div>

      <div v-if="quizSummaryActive" class="quiz-body">
        <div class="quiz-summary-title">{{ t('memorisation.quiz.summaryTitle') }}</div>
        <div class="quiz-summary-grid">
          <div class="quiz-summary-item">
            <div class="quiz-summary-k">{{ t('memorisation.quiz.score') }}</div>
            <div class="quiz-summary-v">{{ quizSummary.correct }} / {{ quizSummary.total }}</div>
          </div>
          <div class="quiz-summary-item">
            <div class="quiz-summary-k">{{ t('memorisation.quiz.accuracy') }}</div>
            <div class="quiz-summary-v">{{ quizSummary.accuracy }}%</div>
          </div>
          <div class="quiz-summary-item">
            <div class="quiz-summary-k">{{ t('memorisation.quiz.avgGrade') }}</div>
            <div class="quiz-summary-v">{{ quizSummary.avgQuality }}</div>
          </div>
          <div class="quiz-summary-item">
            <div class="quiz-summary-k">{{ t('memorisation.quiz.time') }}</div>
            <div class="quiz-summary-v">{{ quizSummary.timeSpent }}</div>
          </div>
          <div class="quiz-summary-item">
            <div class="quiz-summary-k">{{ t('memorisation.quiz.planProgress') }}</div>
            <div class="quiz-summary-v">{{ quizSummary.planProgress }}</div>
          </div>
          <div class="quiz-summary-item">
            <div class="quiz-summary-k">{{ t('memorisation.quiz.bestSkill') }}</div>
            <div class="quiz-summary-v">{{ quizSummary.bestSkill }}</div>
          </div>
        </div>
        <div v-if="quizSummary.skills.length" class="quiz-summary-skill-grid">
          <div v-for="skill in quizSummary.skills" :key="skill.key" class="quiz-summary-skill">
            <div class="quiz-summary-k">{{ skill.label }}</div>
            <div class="quiz-summary-v">{{ skill.correct }}/{{ skill.total }}</div>
            <div class="quiz-summary-s">{{ t('memorisation.quiz.accuracySuffix', { value: skill.accuracy }) }}</div>
          </div>
        </div>
        <div class="quiz-summary-explain">
          <div class="quiz-summary-k">{{ t('memorisation.quiz.whatNext') }}</div>
          <div class="quiz-summary-s">{{ quizSummary.explanation }}</div>
        </div>
        <div class="quiz-summary-explain">
          <div class="quiz-summary-k">{{ t('memorisation.quiz.engineSync') }}</div>
          <div class="quiz-summary-s">{{ quizSummary.engineLink }}</div>
        </div>
        <div v-if="quizSummary.mistakes?.length" class="quiz-summary-mistakes">
          <div class="quiz-summary-k">{{ t('memorisation.quiz.mistakes') }}</div>
          <div class="quiz-summary-tags">
            <span v-for="mistake in quizSummary.mistakes.slice(0, 6)" :key="mistake" class="quiz-tag">{{ mistake }}</span>
          </div>
        </div>
        <div class="quiz-actions">
          <button type="button" class="tools-btn tools-btn-ghost" @click="stopQuiz">{{ t('memorisation.quiz.close') }}</button>
          <button type="button" class="tools-btn tools-btn-primary" @click="restartQuiz">{{ t('memorisation.quiz.startAgain') }}</button>
        </div>
      </div>

      <div v-else-if="quizCard" class="quiz-body">
        <div v-if="quizCard.type === 'flashcard'">
          <div class="quiz-section-label">
            <i class="bi bi-layers"></i>
            <span>{{ t('memorisation.quiz.flashcardPrompt') }}</span>
          </div>
          <div class="quiz-prompt" dir="rtl" v-html="quizCard.arabic"></div>
          <button v-if="!quizRevealed" type="button" class="quiz-reveal" @click="quizRevealed = true">
            <i class="bi bi-eye"></i>
            <span>{{ t('memorisation.quiz.showAnswer') }}</span>
          </button>
          <div v-if="quizRevealed" class="quiz-hint">{{ quizCard.translation || t('memorisation.quiz.gradeYourself') }}</div>
        </div>

        <div v-else-if="quizCard.type === 'mcq'">
          <div class="quiz-section-label">
            <i class="bi bi-list-check"></i>
            <span>{{ t('memorisation.quiz.mcqPrompt') }}</span>
          </div>
          <div class="quiz-prompt" dir="rtl" v-html="quizCard.arabic"></div>
          <div class="quiz-options">
            <label v-for="opt in quizOptions" :key="opt.key" class="quiz-opt">
              <input type="radio" name="quiz-mcq" :value="opt.key" v-model="quizAnswer">
              <span>{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <div v-else-if="quizCard.type === 'audio_mcq'">
          <div class="quiz-section-label">
            <i class="bi bi-ear"></i>
            <span>{{ t('memorisation.quiz.audioPrompt') }}</span>
          </div>
          <button type="button" class="quiz-reveal" @click="playVerse(quizCard, { primePlayback: true })">
            <i class="bi bi-arrow-repeat"></i>
            <span>{{ t('memorisation.quiz.replayAudio') }}</span>
          </button>
          <div class="quiz-options">
            <label v-for="opt in quizOptions" :key="opt.key" class="quiz-opt">
              <input type="radio" name="quiz-audio-mcq" :value="opt.key" v-model="quizAnswer">
              <span>{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <div v-else>
          <div class="quiz-section-label">
            <i class="bi bi-pencil-square"></i>
            <span>{{ t('memorisation.quiz.blankPrompt') }}</span>
          </div>
          <div class="quiz-prompt">{{ quizCard.prompt }}</div>
          <input class="input quiz-input" v-model="quizAnswer" :placeholder="t('memorisation.quiz.blankPlaceholder')"
            @keyup.enter="submitQuiz()">
        </div>
      </div>

      <div v-if="!quizSummaryActive" class="quiz-actions">
        <button type="button" class="quiz-action quiz-action-ghost" @click="stopQuiz">
          <i class="bi bi-stop-circle"></i>
          <span>{{ t('memorisation.quiz.stop') }}</span>
        </button>
        <button v-if="quizCard?.type === 'flashcard' && !quizRevealed" type="button" class="tools-btn tools-btn-ghost"
          @click="quizRevealed = true">
          <i class="bi bi-eye"></i>
          <span>{{ t('memorisation.quiz.reveal') }}</span>
        </button>
        <button v-if="quizCard && quizCard.type !== 'flashcard'" type="button" class="quiz-action quiz-action-primary"
          @click="submitQuiz()">
          <i class="bi bi-arrow-right-circle"></i>
          <span>{{ t('memorisation.quiz.next') }}</span>
        </button>
        <div v-else-if="quizCard?.type === 'flashcard' && quizRevealed" class="quiz-grade">
          <button type="button" class="qg" @click="submitQuiz(2)">
            <i class="bi bi-arrow-counterclockwise"></i>
            <span>{{ t('memorisation.quiz.again') }}</span>
          </button>
          <button type="button" class="qg" @click="submitQuiz(3)">
            <i class="bi bi-slash-circle"></i>
            <span>{{ t('memorisation.quiz.hard') }}</span>
          </button>
          <button type="button" class="qg primary" @click="submitQuiz(4)">
            <i class="bi bi-check2-circle"></i>
            <span>{{ t('memorisation.quiz.good') }}</span>
          </button>
          <button type="button" class="qg" @click="submitQuiz(5)">
            <i class="bi bi-stars"></i>
            <span>{{ t('memorisation.quiz.easy') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showKeyboardShortcuts" class="modal-overlay mutqin-modal-overlay keyboard-shortcuts-overlay" @click.self="closeKeyboardShortcuts" @keydown="onModalOverlayKeydown($event, { containerRef: 'keyboardShortcutsDialog', onClose: closeKeyboardShortcuts })">
    <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
    <div
      ref="keyboardShortcutsDialog"
      class="modal-content mutqin-modal-surface keyboard-shortcuts-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboardShortcutsTitle"
      aria-describedby="keyboardShortcutsSubtitle"
    >
      <div class="modal-header keyboard-shortcuts-header">
        <span class="keyboard-shortcuts-header-icon" aria-hidden="true">
          <i class="bi bi-keyboard"></i>
        </span>
        <div class="modal-header-text">
          <h2 id="keyboardShortcutsTitle">{{ t('shortcuts.title') }}</h2>
          <p id="keyboardShortcutsSubtitle">{{ t('shortcuts.subtitle') }}</p>
        </div>
        <button type="button" class="modal-close-btn" @click="closeKeyboardShortcuts" :aria-label="t('common.close')">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
      <div class="modal-body keyboard-shortcuts-body">
        <div class="keyboard-shortcuts-device-note d-md-none" role="note">
          <i class="bi bi-keyboard" aria-hidden="true"></i>
          <span>Shortcuts are available when a hardware keyboard is connected.</span>
        </div>
        <div class="keyboard-shortcuts-grid">
          <section
            v-for="group in keyboardShortcutGroups"
            :key="group.id"
            class="keyboard-shortcuts-group"
            :class="{ 'is-open': activeKeyboardShortcutGroup === group.id }"
            :aria-labelledby="`keyboardShortcutsGroup-${group.id}`"
          >
            <button
              type="button"
              class="keyboard-shortcuts-group-header"
              :aria-expanded="activeKeyboardShortcutGroup === group.id ? 'true' : 'false'"
              :aria-controls="`keyboardShortcutsList-${group.id}`"
              @click="toggleKeyboardShortcutGroup(group.id)"
            >
              <span class="keyboard-shortcuts-group-icon" aria-hidden="true">
                <i class="bi" :class="group.icon"></i>
              </span>
              <h3 :id="`keyboardShortcutsGroup-${group.id}`">{{ group.title }}</h3>
              <i class="bi bi-chevron-down keyboard-shortcuts-group-chevron" aria-hidden="true"></i>
            </button>
            <ul class="keyboard-shortcuts-list" :id="`keyboardShortcutsList-${group.id}`">
              <li v-for="item in group.items" :key="item.id" class="keyboard-shortcuts-item">
                <span class="keyboard-shortcuts-label">{{ item.label }}</span>
                <div class="keyboard-shortcut-keys">
                  <template v-for="(combo, comboIndex) in item.combos" :key="`${item.id}-${comboIndex}`">
                    <span v-if="comboIndex > 0" class="keyboard-shortcut-or">{{ t('shortcuts.or') }}</span>
                    <span class="keyboard-shortcut-combo">
                      <template v-for="(part, partIndex) in combo" :key="`${item.id}-${comboIndex}-${partIndex}`">
                        <span v-if="partIndex > 0" class="keyboard-shortcut-plus">+</span>
                        <kbd>{{ part }}</kbd>
                      </template>
                    </span>
                  </template>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
      <div class="modal-footer mutqin-modal-footer">
        <div class="mutqin-modal-actions mutqin-modal-actions--end">
          <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="closeKeyboardShortcuts">
            <span>{{ t('shortcuts.gotIt') }}</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script src="./Memorisation.js"></script>

<style src="./Memorisation.css"></style>
<style src="./Memorisation.mobile-grid.css"></style>
<style src="./Memorisation.amd.css"></style>
<!-- Must load last: shared mushaf rules use display:contents on .madani-line--glyphs -->
