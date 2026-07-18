<template>
  <div class="app" :data-theme="theme" :dir="isRtlLocale ? 'rtl' : 'ltr'" :class="{
    'is-rtl': isRtlLocale,
    'onboarding-post-session-active': showPostSessionModal,
    'overlay-onboarding-active': isOnboardingExperienceActive,
    'onboarding-post-session-offcanvas-open': showPostSessionModal && postSessionOffcanvasOpen && showTools,
    'session-exit-flow-active': showSessionExitModal,
    'session-exit-offcanvas-open': showSessionExitModal && sessionExitOffcanvasOpen && showTools
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

    <!-- Main Content -->
    <div v-if="appReady && isLoggedIn" class="main w-100" :class="{
      'container-fluid': readingViewMode === 'mushaf',
      'container': readingViewMode !== 'mushaf',
      'tools-open': showTools,
      'player-visible': playbackShellActive,
      'playback-pill-visible': playbackPillVisible,
      'mushaf-mode-active': readingViewMode === 'mushaf',
      'focus-mode-active': focusModeEnabled,
      'blur-mode-active': blurModeEnabled,
      'flow-practice': guidedUiStep === 'practice',
      'flow-recall': guidedUiStep === 'recall'
    }">
      <div class="content">
        <div v-if="false" class="reading-toolbar">
          <hr class="reading-toolbar-sep" aria-hidden="true" />
          <div class="reading-toolbar-group">
            <button class="toolbar-chip" :class="{ active: showTranslation }"
              :title="t('memorisation.a11y.showTranslation')" @click="toggleReadingOption('translation')">
              <i class="bi bi-translate"></i><span>{{ t('memorisation.reading.translation') }}</span>
            </button>
            <button class="toolbar-chip" :class="{ active: showTransliteration }" :title="t('memorisation.a11y.showTransliteration')"
              @click="toggleReadingOption('transliteration')">
              <i class="bi bi-type"></i><span>{{ t('memorisation.reading.transliteration') }}</span>
            </button>
            <!-- <button class="toolbar-chip" :class="{ active: showWordByWord }" title="Show word-by-word meaning chips"
              @click="toggleReadingOption('wbw')">
              <i class="bi bi-grid-3x2-gap"></i><span>{{ t('memorisation.reading.wordByWord') }}</span>
            </button> -->
            <!-- <button class="toolbar-chip" :class="{ active: wordByWordAudioEnabled }"
              :title="t('memorisation.a11y.enableWordAudio')" @click="wordByWordAudioEnabled = !wordByWordAudioEnabled">
              <i class="bi bi-volume-up"></i><span>{{ t('memorisation.reading.wordAudio') }}</span>
            </button> -->

            <!-- ADD TAJWEED PILL HERE -->
            <button class="toolbar-chip" :class="{ active: tajweedEnabled }"
              :title="t('memorisation.a11y.showTajweedText')" @click="toggleTajweed">
              <i class="bi bi-palette"></i><span>{{ t('memorisation.reading.tajweed') }}</span>
            </button>
          </div>

          <div class="reading-toolbar-group">
            <div class="font-dropdown">
              <button class="font-dropdown-trigger" @click="toggleFontDropdown" :title="t('memorisation.a11y.changeQuranFont')">
                <i class="bi bi-text-paragraph"></i>
                <span>{{ getCurrentFontLabel() }}</span>
                <i class="bi bi-chevron-down" :class="{ rotated: fontDropdownOpen }"></i>
              </button>
              <transition name="dropdown-fade">
                <div v-if="fontDropdownOpen" class="font-dropdown-menu">
                  <button v-for="font in quranFontOptions" :key="font.value" class="font-option"
                    :class="{ active: quranFont === font.value }" @click="selectFont(font.value)">
                    <i class="bi" :class="getFontIcon(font.value)"></i>
                    <span>{{ font.label }}</span>
                    <i v-if="quranFont === font.value" class="bi bi-check-lg check-icon"></i>
                  </button>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <!-- Verses Grid -->
        <div class="workspace">
          <!-- In your template, replace the workspace-shell section -->
        <section
          v-show="(hasVerses || showSessionOverviewIdleActions) && !isWelcomeBackWorkspaceHidden && !isOnboardingExperienceActive"
          class="workspace-shell"
          :class="{ collapsed: mainCardCollapsed }"
          :data-reading-mode="readingViewMode"
          :aria-label="t('memorisation.a11y.sessionOverview')"
        >
        <div class="workspace-shell-head" :class="{ 'is-idle': showSessionOverviewIdleActions }">
          <template v-if="hasVerses">
          <div class="workspace-shell-copy">
            <span class="workspace-shell-kicker">{{ t('memorisation.sessionOverview.kicker') }}</span>
            <h1 class="workspace-shell-main-title">{{ topCardSessionLabel }}</h1>
          </div>
          <div class="workspace-shell-actions">
            <div class="action-buttons-group">
              <div
                class="top-card-session-actions"
                :class="{ 'has-paired-actions': showHeaderEndSessionAction }"
              >
                <div
                  v-if="showHeaderSessionAction"
                  class="action-btn btn btn-primary session-primary-action top-card-action-trigger"
                  role="button"
                  tabindex="0"
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
                  class="action-btn action-btn-secondary top-card-action-trigger action-btn-exit"
                  @click="openSessionExitModalFromMenu"
                  :title="t('sessionStatus.end')"
                  :aria-label="t('sessionStatus.end')"
                >
                  <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                  <span>{{ t('sessionStatus.end') }}</span>
                </button>
              </div>
              <div
                class="action-btn action-btn-secondary top-card-action-trigger top-card-controls-trigger"
                role="button"
                tabindex="0"
                @click="openAdvancedControls"
                @keydown.enter.prevent="openAdvancedControls"
                @keydown.space.prevent="openAdvancedControls"
                :title="t('memorisation.open_controls')"
                :aria-label="t('memorisation.open_controls')"
              >
                <i class="bi bi-sliders" aria-hidden="true"></i>
              </div>
              <div class="top-card-menu-wrap" @click.stop>
                <div
                  class="top-card-ellipsis top-card-action-trigger"
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
                    <button type="button" :class="{ active: showTranslation }" @click="toggleReadingOption('translation')">
                      <i class="bi bi-translate"></i><span>{{ t('memorisation.reading.translation') }}</span>
                    </button>
                    <button type="button" :class="{ active: showTransliteration }" @click="toggleReadingOption('transliteration')">
                      <i class="bi bi-type"></i><span>{{ t('memorisation.reading.transliteration') }}</span>
                    </button>
                    <button type="button" :class="{ active: tajweedEnabled }" @click="toggleTajweed">
                      <i class="bi bi-palette"></i><span>{{ t('memorisation.reading.tajweed') }}</span>
                    </button>
                    <div class="top-card-submenu-wrap">
                      <button
                        type="button"
                        class="top-card-submenu-trigger"
                        :class="{ active: topCardFontSubmenuOpen }"
                        :aria-expanded="topCardFontSubmenuOpen ? 'true' : 'false'"
                        @click.stop="toggleTopCardFontSubmenu"
                      >
                        <i class="bi bi-text-paragraph" aria-hidden="true"></i>
                        <span>{{ t('memorisation.reading.quranicFont') }}</span>
                        <i class="bi bi-chevron-right top-card-submenu-chevron" aria-hidden="true"></i>
                      </button>
                      <transition name="dropdown-fade">
                        <div v-if="topCardFontSubmenuOpen" class="top-card-submenu top-card-font-submenu" @click.stop>
                          <button
                            v-for="font in quranFontOptions"
                            :key="font.value"
                            type="button"
                            class="top-card-submenu-option"
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
                    <div class="top-card-submenu-wrap">
                      <button
                        type="button"
                        class="top-card-submenu-trigger"
                        :class="{ active: topCardLayoutSubmenuOpen }"
                        :aria-expanded="topCardLayoutSubmenuOpen ? 'true' : 'false'"
                        @click.stop="toggleTopCardLayoutSubmenu"
                      >
                        <i class="bi bi-layout-split" aria-hidden="true"></i>
                        <span>{{ t('memorisation.reading.selectLayout') }}</span>
                        <i class="bi bi-chevron-right top-card-submenu-chevron" aria-hidden="true"></i>
                      </button>
                      <transition name="dropdown-fade">
                        <div v-if="topCardLayoutSubmenuOpen" class="top-card-submenu top-card-layout-submenu" @click.stop>
                          <button
                            type="button"
                            class="top-card-submenu-option"
                            :class="{ active: readingViewMode === 'stacked' }"
                            @click="setReadingViewMode('stacked')"
                          >
                            <i class="bi bi-view-stacked" aria-hidden="true"></i>
                            <span>{{ t('memorisation.view.stacked') }}</span>
                            <i v-if="readingViewMode === 'stacked'" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                          </button>
                          <button
                            type="button"
                            class="top-card-submenu-option"
                            :class="{ active: readingViewMode === 'mushaf' }"
                            @click="setReadingViewMode('mushaf')"
                          >
                            <i class="bi bi-book" aria-hidden="true"></i>
                            <span>{{ t('memorisation.view.mushaf') }}</span>
                            <i v-if="readingViewMode === 'mushaf'" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                          </button>
                        </div>
                      </transition>
                    </div>
                    <button type="button" @click="openOnboardingFromTopMenu">
                      <i class="bi bi-compass"></i><span>{{ t('memorisation.revisitOnboarding') }}</span>
                    </button>
                    <button @click="toggleKeyboardShortcuts" type="button">
                      <i class="bi bi-keyboard"></i><span>{{ t('shortcuts.title') }}</span>
                    </button>
                    <button @click="toggleFullScreen" type="button">
                      <i class="bi bi-arrows-fullscreen"></i><span>{{ t('memorisation.reading.fullScreen') }}</span>
                    </button>
                  </div>
                </transition>
              </div>
            </div>
          </div>
          </template>
          <div v-else-if="showSessionOverviewIdleActions" class="workspace-shell-actions workspace-shell-actions-minimal">
            <button class="action-btn primary session-idle-action" type="button" @click="openNewSessionSetup">
              {{ t('memorisation.workspaceEmpty.startNewSession') }}
            </button>
            <button
              class="action-btn session-idle-action"
              type="button"
              :disabled="!canResumePreviousSession"
              @click="continueLastSession"
            >
              {{ t('memorisation.workspaceEmpty.continuePreviousSession') }}
            </button>
            <button
              class="action-btn action-btn-icon session-idle-controls"
              type="button"
              @click="openAdvancedControls"
              :title="t('memorisation.open_controls')"
              :aria-label="t('memorisation.open_controls')"
            >
              <i class="bi bi-sliders" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <p v-if="chainingSetupBlocking" class="workspace-setup-hint workspace-setup-hint-warning" role="status">
          <span>{{ t('memorisation.techniques.chainingMethodRequired') }}</span>
          <button type="button" class="workspace-setup-hint-action" @click="guideChainingSetup">
            {{ t('memorisation.techniques.chooseChainingMethod') }}
          </button>
        </p>
        <div v-if="hasVerses" class="workspace-shell-bottom">
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
                aria-disabled="true"
              >
                <strong>{{ item.label }}:</strong>
                <span>{{ item.value }}</span>
              </span>
            </div>
          </div>
        </div>
        <div v-if="reviewPriorityLabel && readingViewMode !== 'mushaf'" class="workspace-shell-compact-meta">
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

          <main v-if="isDataReady && !isOnboardingExperienceActive && !isWelcomeBackWorkspaceHidden" id="memorisationWorkspaceMain" ref="workspaceMain" class="workspace-main"
            :aria-label="t('memorisation.a11y.memorisationWorkspace')">
            <section v-if="shouldShowWorkspaceEmptyState" class="workspace-empty-state" :aria-label="t('memorisation.a11y.sessionSetup')">
              <div class="workspace-empty-card">
                <span class="workspace-empty-kicker">{{ t('memorisation.workspaceEmpty.kicker') }}</span>
                <h2>{{ t('memorisation.workspaceEmpty.title') }}</h2>
                <p>{{ t('memorisation.workspaceEmpty.desc') }}</p>
                <div class="workspace-empty-actions">
                  <button class="action-btn primary" type="button" @click="openNewSessionSetup">
                    {{ t('memorisation.open_session_setup') }}
                  </button>
                  <button class="action-btn" type="button" @click="openAdvancedControls">
                    {{ t('memorisation.open_controls') }}
                  </button>
                </div>
              </div>
            </section>
            <div v-if="shouldShowReadingWorkspace && readingViewMode === 'mushaf'" class="mushaf-workspace container-fluid w-100">
              <div class="mushaf-frame mushaf-frame-toolbar-collapsed">
                <aside class="mushaf-toolbar-rail" :aria-label="t('memorisation.a11y.mushafTools')">
                <div class="mushaf-pill-bar mushaf-pill-toolbar is-collapsed">
                  <div class="mushaf-toolbar-cluster mushaf-toolbar-cluster-start">
                    <div class="mushaf-toolbar-dropdown font-dropdown-region">
                      <button @click.stop="fontOpen = !fontOpen; bgOpen = false; borderOpen = false" type="button" class="mushaf-toolbar-trigger"
                        :aria-expanded="fontOpen ? 'true' : 'false'" :aria-label="t('memorisation.a11y.chooseMushafFont')" :title="getCurrentFontLabel()">
                        <i class="bi bi-type"></i>
                      </button>
                      <div v-if="fontOpen" @click.stop class="mushaf-toolbar-menu">
                        <button v-for="f in quranFontOptions" :key="f.value" @click="selectFont(f.value); fontOpen = false"
                          class="mushaf-toolbar-option" :class="{ active: quranFont === f.value }">
                          <i class="bi" :class="getFontIcon(f.value)" aria-hidden="true"></i>
                          <span>{{ f.label }}</span>
                          <i v-if="quranFont === f.value" class="bi bi-check2 mushaf-toolbar-check" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="mushaf-pill mushaf-font-size-pill"
                      @click.stop="decreaseMushafFontSize"
                      :title="t('memorisation.a11y.decreaseFontSize')"
                      :aria-label="t('memorisation.a11y.decreaseFontSize')"
                    >
                      <i class="bi bi-dash-lg" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="mushaf-pill mushaf-font-size-pill"
                      @click.stop="increaseMushafFontSize"
                      :title="t('memorisation.a11y.increaseFontSize')"
                      :aria-label="t('memorisation.a11y.increaseFontSize')"
                    >
                      <i class="bi bi-plus-lg" aria-hidden="true"></i>
                    </button>

                    <div class="mushaf-toolbar-dropdown bg-dropdown-region">
                      <button @click.stop="bgOpen = !bgOpen; fontOpen = false; borderOpen = false" type="button" class="mushaf-toolbar-trigger"
                        :aria-expanded="bgOpen ? 'true' : 'false'" aria-label="Choose Mushaf page theme" :title="t('memorisation.reading.theme')">
                        <span class="mushaf-toolbar-theme-swatch mushaf-toolbar-trigger-swatch" :class="`theme-${mushafBackground}`"></span>
                      </button>
                      <div v-if="bgOpen" @click.stop class="mushaf-toolbar-menu">
                        <button v-for="b in mushafBackgroundOptions" :key="b.value" @click="setMushafBackground(b.value); bgOpen = false"
                          class="mushaf-toolbar-option mushaf-toolbar-option-theme" :class="{ active: mushafBackground === b.value }">
                          <span class="mushaf-toolbar-theme-swatch" :class="`theme-${b.value}`"></span>
                          <span>{{ b.label }}</span>
                          <i v-if="mushafBackground === b.value" class="bi bi-check2 mushaf-toolbar-check" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    <div class="mushaf-toolbar-dropdown border-dropdown-region">
                      <button @click.stop="borderOpen = !borderOpen; fontOpen = false; bgOpen = false" type="button" class="mushaf-toolbar-trigger"
                        :aria-expanded="borderOpen ? 'true' : 'false'" aria-label="Choose Mushaf border style" :title="t('memorisation.reading.border')">
                        <i class="bi bi-border-outer"></i>
                      </button>
                      <div v-if="borderOpen" @click.stop class="mushaf-toolbar-menu">
                        <button v-for="b in mushafBorderOptions" :key="b.value" @click="setMushafBorder(b.value); borderOpen = false"
                          class="mushaf-toolbar-option" :class="{ active: mushafBorder === b.value }">
                          <span class="mushaf-toolbar-border-swatch" :class="`border-${b.value}`"></span>
                          <span>{{ b.label }}</span>
                          <i v-if="mushafBorder === b.value" class="bi bi-check2 mushaf-toolbar-check" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="mushaf-toolbar-cluster mushaf-toolbar-cluster-end">
                    <button
                      type="button"
                      class="mushaf-pill mushaf-controls-pill"
                      @click.stop="openAdvancedControls"
                      :title="t('memorisation.a11y.sessionControls')"
                      :aria-label="t('memorisation.a11y.openSessionControls')"
                    >
                      <i class="bi bi-sliders"></i>
                    </button>
                    <button
                      type="button"
                      class="mushaf-pill mushaf-play-pill"
                      @click.stop="toggleMushafActiveAyahPlayback"
                      :disabled="!activeVerseRef?.audio"
                      :title="activeVerseRef ? (isMushafActiveAyahPlaying ? 'Pause ayah audio' : 'Play active ayah') : 'Select an ayah first'"
                      :aria-label="activeVerseRef ? (isMushafActiveAyahPlaying ? 'Pause ayah audio' : 'Play active ayah') : 'Select an ayah first'"
                    >
                      <i class="bi" :class="isMushafActiveAyahPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    </button>
                    <button
                      type="button"
                      class="mushaf-pill mushaf-tajweed-pill"
                      :class="{ active: tajweedEnabled }"
                      @click.stop="toggleTajweed"
                      :aria-pressed="tajweedEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.toggleTajweed')"
                      :title="t('memorisation.a11y.tajweedLabel')"
                    >
                      <i class="bi bi-palette"></i>
                    </button>
                    <button v-if="showAiMemorisationButton" class="mushaf-pill mushaf-ai-pill mushaf-ai-memory" type="button" @click.stop="openAiMemorisationCheckerForVerse(activeVerseRef)"
                      :class="{ active: aiMemorisationCheckerRecording }"
                      :disabled="!activeVerseRef || aiMemorisationCheckerPreparing || !supportsSelfCheckRecording()"
                      :title="activeVerseRef ? 'Hide the ayah and recite from memory' : 'Tap an ayah first'"
                      :aria-label="aiMemorisationCheckerRecording ? 'Stop AI memorisation check' : 'Start AI memorisation check'">
                      <i class="bi" :class="aiMemorisationCheckerRecording ? 'bi-stop-circle' : 'bi-eye-slash'"></i>
                    </button>

                    <button class="mushaf-pill mushaf-ai-pill mushaf-ai-recite" type="button" @click.stop="openAiRecitationCheckForVerse(activeVerseRef)"
                      :class="{ active: recitationCheckRecording }"
                      :disabled="!activeVerseRef || recitationCheckPreparing || !supportsSelfCheckRecording()"
                      :title="activeVerseRef ? 'AI Recite' : 'Tap an ayah first'"
                      :aria-label="recitationCheckRecording ? 'Stop AI recitation check' : (activeVerseRef ? 'Start AI recitation check' : 'Tap an ayah first')">
                      <i class="bi" :class="recitationCheckRecording ? 'bi-stop-circle' : 'bi-stars'"></i>
                    </button>
                  </div>
                </div>
                </aside>
                <div class="mushaf-stage">
                  <button
                    v-if="mushafPages.length > 1"
                    type="button"
                    class="mushaf-stage-nav mushaf-stage-nav-prev"
                    :disabled="!canGoPreviousMushafPage"
                    @click="goToPreviousMushafPage"
                    :aria-label="t('memorisation.a11y.previousMushafPage')"
                  >
                    <i class="bi bi-chevron-left" aria-hidden="true"></i>
                  </button>
                <div ref="mushafViewport" class="mushaf-viewport" :class="`mushaf-bg-${mushafBackground}`">
                  <div v-if="!currentMushafPage" class="mushaf-empty-page">
                    <i class="bi bi-hourglass-split"></i>
                    <strong>{{ workspaceLoadingLabel }}</strong>
                    <span>{{ t('memorisation.common.mushafSyncMessage') }}</span>
                  </div>
                    <article
                    v-else
                    :key="`${currentMushafPage.id}-${safeMushafPageIndex}-${defaultFontSize}-${quranFont}`"
                    class="mushaf-page"
                    :class="[`mushaf-bg-${mushafBackground}`, `mushaf-border-${mushafBorder}`]"
                    :style="{ '--verse-font-percent': defaultFontSize, '--mushaf-quran-font': quranFontFamily }"
                  >
                    <div
                      class="mushaf-page-body"
                      dir="rtl"
                      :style="{ '--verse-font-percent': defaultFontSize, '--mushaf-quran-font': quranFontFamily }"
                    >
                      <p v-if="showMushafBismillahOnPage" class="mushaf-bismillah-inline" :aria-label="t('memorisation.a11y.bismillah')">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </p>
                      <span
                        v-for="row in currentMushafVerseRows"
                        :key="row.key"
                        v-memo="[row.isActive, row.isNew, row.isDue, row.isWeak, row.isMastered, row.isBlurred, row.isPeekRevealed, row.isReviewPriority, row.isPlayingAyah, row.fontPercent, row.html, quranFont, tajweedEnabled]"
                        role="button"
                        tabindex="0"
                        :data-verse-key="row.key"
                        class="mushaf-ayah"
                        :style="{ '--verse-font-percent': row.fontPercent }"
                        :class="{
                          active: row.isActive,
                          'hifz-ayah-new': row.isNew,
                          'hifz-ayah-due': row.isDue,
                          'hifz-ayah-weak': row.isWeak,
                          'hifz-ayah-mastered': row.isMastered,
                          'blur-upcoming': row.isBlurred,
                          'peek-revealed': row.isPeekRevealed,
                          'review-priority': row.isReviewPriority,
                          'is-playing': row.isPlayingAyah
                        }"
                        @click="onMushafAyahClick(row.verse)"
                        @mouseenter="onMushafAyahEnter(row.verse)"
                        @mouseleave="onMushafAyahLeave(row.verse)"
                        @keydown.enter.prevent="onMushafAyahClick(row.verse)"
                        @keydown.space.prevent="onMushafAyahClick(row.verse)"
                        @touchstart.passive="onVerseTouchStart($event, row.key)"
                        @touchmove.passive="clearTouchPeek"
                        @touchend.passive="onVerseTouchEnd($event, row.key)"
                        @touchcancel.passive="clearTouchPeek"
                      >
                        <span
                          class="mushaf-ayah-text"
                          dir="rtl"
                          lang="ar"
                          @click.stop
                          v-html="row.html"
                          :class="{
                            'tajweed-enabled': tajweedEnabled,
                            'word-highlight-enabled': true,
                            'verse-weak': row.isWeak,
                            'verse-mastered': row.isMastered
                          }"
                        ></span>
                        <span
                          class="mushaf-ayah-number"
                          :class="[`mushaf-ayah-number-digits-${row.numberDigits}`]"
                          :style="row.numberStyle"
                        >{{ row.verse.number }}</span>
                      </span>
                    </div>
                  </article>
                </div>
                  <button
                    v-if="mushafPages.length > 1"
                    type="button"
                    class="mushaf-stage-nav mushaf-stage-nav-next"
                    :disabled="!canGoNextMushafPage"
                    @click="goToNextMushafPage"
                    :aria-label="t('memorisation.a11y.nextMushafPage')"
                  >
                    <i class="bi bi-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>
            <div v-else-if="shouldShowReadingWorkspace" class="verses-grid">
              <div v-for="verse in verses" :key="verse.key" :data-verse-key="verse.key" class="verse-card" :class="{
                active: isVerseVisuallyActive(verse.key),
                'serious-training': false,
                'hifz-ayah-new': isNewHifzAyah(verse.key),
                'hifz-ayah-due': isDueHifzAyah(verse.key),
                'hifz-ayah-weak': isWeakAyah(verse.key),
                'hifz-ayah-mastered': isMasteredAyah(verse.key),
                'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key),
                'peek-revealed': isVersePeekRevealed(verse.key),
                'ai-recitation-active': shouldShowRecitationReviewHighlights(verse.key)
              }" @click="onVerseCardClick(verse)" role="button" tabindex="0" @mouseenter="onVersePeekEnter(verse.key)"
                @mouseleave="onVersePeekLeave(verse.key)" @touchstart.passive="onVerseTouchStart($event, verse.key)"
                @touchmove.passive="clearTouchPeek"
                @touchend.passive="onVerseTouchEnd($event, verse.key)" @touchcancel.passive="clearTouchPeek"
                @keydown.enter.prevent="onVerseCardClick(verse)" @keydown.space.prevent="onVerseCardClick(verse)"
                :aria-label="`Open ayah ${verse.number}${isVerseVisuallyActive(verse.key) ? ', active ayah' : ''}`">
                <div class="verse-header">
                  <div class="verse-badges">
                    <span class="verse-number">Ayah {{ verse.number }}</span>
                    <span v-if="isNewHifzAyah(verse.key)" class="verse-status-badge verse-status-badge-new">{{ t('memorisation.badges.new') }}</span>
                    <span v-if="isDueHifzAyah(verse.key)" class="verse-status-badge verse-status-badge-due">{{ t('memorisation.due') }}</span>
                    <span v-if="isWeakAyah(verse.key)" class="verse-status-badge verse-status-badge-weak">{{ t('memorisation.badges.weak') }}</span>
                    <span v-if="isMasteredAyah(verse.key)" class="verse-status-badge verse-status-badge-mastered">{{ t('memorisation.badges.steady') }}</span>
                    <span v-if="isVerseVisuallyActive(verse.key)" class="verse-status-badge">{{ t('memorisation.badges.active') }}</span>
                  </div>
                  <div class="verse-actions">
                    
                    <button v-if="showAiMemorisationButton" class="verse-self-check-btn verse-ai-check-btn"
                      :class="{ active: shouldShowRecitationReviewHighlights(verse.key) && aiMemorisationCheckerVerseKey === verse.key }"
                      @click.stop="openAiMemorisationCheckerForVerse(verse)"
                      :disabled="aiMemorisationCheckerPreparing || aiMemorisationCheckerRecording || !supportsSelfCheckRecording()"
                      title="Open AI memorisation checker for this ayah">
                      <i class="bi bi-eye-slash" aria-hidden="true"></i>
                      <span>{{ t('memorisation.reading.aiMemory') }}</span>
                    </button>

                    <button class="verse-self-check-btn verse-ai-check-btn"
                      :class="{ active: isRecitationCheckTargetVerse(verse.key), saved: getAyahRecordingCount(verse.key) }"
                      @click.stop="openAiRecitationCheckForVerse(verse)"
                      :disabled="recitationCheckPreparing || recitationCheckRecording || !supportsSelfCheckRecording()"
                      :title="isRecitationCheckTargetVerse(verse.key) ? 'AI recitation check is active' : 'Open AI recitation check for this ayah'">
                      <i class="bi bi-stars" aria-hidden="true"></i>
                      <span>{{ t('memorisation.reading.aiRecite') }}</span>
                      <em v-if="getAyahRecordingCount(verse.key)">{{ getAyahRecordingCount(verse.key) }}</em>
                    </button>
                    <button class="verse-inline-action-btn verse-inline-play-btn" type="button"
                      @click.stop="playVerse(verse, { primePlayback: true })"
                      :disabled="!verse.audio"
                      :title="activeVerseKey === verse.key && isPlaying ? 'Pause ayah audio' : 'Play ayah audio'"
                      :aria-label="activeVerseKey === verse.key && isPlaying ? 'Pause ayah audio' : 'Play ayah audio'">
                      <i class="bi" :class="activeVerseKey === verse.key && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    </button>
                    <button class="verse-inline-action-btn verse-inline-download-btn" type="button"
                      @click.stop="downloadVerseAudio(verse)" :disabled="!verse.audio"
                      :title="t('memorisation.offlineDownload.buttonHint')" :aria-label="t('memorisation.offlineDownload.buttonHint')">
                      <i class="bi bi-download" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>

                <div class="verse-arabic verse-arabic-primary" dir="rtl" lang="ar" v-if="verse.arabic && isDataReady"
                  @click.stop
                  v-html="getDisplayArabic(verse)" :class="{
                    'tajweed-enabled': tajweedEnabled,
                    'word-highlight-enabled': true,
                    'verse-weak': isWeakAyah(verse.key),
                    'verse-mastered': isMasteredAyah(verse.key),
                    'recitation-word-review-active': shouldShowRecitationReviewHighlights(verse.key)
                  }" :style="{
                    '--verse-font-percent': getVerseFontSize(verse.key),
                    'font-family': quranFontFamily
                  }">
                </div>

                <!-- Keep in-workspace aids available, but visually quieter -->
                <div v-if="showTransliteration && verse.transliteration" class="verse-aid-block" dir="ltr" lang="en">
                  <div class="verse-aid-title" dir="ltr" lang="en">{{ t('memorisation.reading.transliteration') }}</div>
                  <div class="verse-transliteration verse-aid" dir="ltr" lang="en">
                    {{ verse.transliteration }}
                  </div>
                </div>
                <div v-if="showTranslation && verse.translation" class="verse-aid-block" dir="ltr" lang="en">
                  <div class="verse-aid-title" dir="ltr" lang="en">{{ t('memorisation.reading.translation') }}</div>
                  <div class="verse-translation verse-aid" dir="ltr" lang="en">
                    {{ verse.translation }}
                  </div>
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
        'session-exit-tools-backdrop': showSessionExitModal && sessionExitOffcanvasOpen
      }" @click="closeToolsPanel" aria-hidden="true"></div>
      <aside id="memorisationToolsPanel" ref="toolsPanel" class="tools offcanvas-section offcanvas-end" :class="{
        open: showTools,
        'onboarding-post-session-tools': showPostSessionModal && postSessionOffcanvasOpen,
        'session-exit-tools': showSessionExitModal && sessionExitOffcanvasOpen
      }"
        @click.stop role="dialog" aria-modal="true" aria-labelledby="memorisationToolsTitle"
        :aria-hidden="showTools ? 'false' : 'true'" tabindex="-1" @keydown.esc.prevent="closeToolsPanel">
        <div class="tools-top">
        <div class="tools-topbar">
          <div id="memorisationToolsTitle" class="tools-title">
            <h3><b>{{ t('common.controls') }}</b></h3>
          </div>
            <button class="tools-x" @click="closeToolsPanel" :aria-label="t('memorisation.a11y.closePanel')" type="button">
              <span class="tools-x-glyph" aria-hidden="true">&times;</span>
            </button>
          </div>
          <div v-if="shouldShowOffcanvasTabs" class="tools-tabs" role="tablist" :aria-label="t('memorisation.a11y.controlsTabs')">
            <button role="tab" :aria-selected="tab === 'tools' ? 'true' : 'false'" :class="{ active: tab === 'tools' }"
              @click.prevent="setActiveTab('tools')" title="Session setup" type="button">
              <i class="bi bi-sliders"></i> {{ t('memorisation.tools.tabs.setup') }}
            </button>
            <button role="tab" :aria-selected="tab === 'techniques' ? 'true' : 'false'"
              :class="{ active: tab === 'techniques' }" @click.prevent="setActiveTab('techniques')"
              title="Practice presets" type="button">
              <i class="bi bi-stars"></i> {{ t('memorisation.practice') }}
            </button>
            <button role="tab" :aria-selected="tab === 'saved' ? 'true' : 'false'" :class="{ active: tab === 'saved' }"
              @click.prevent="setActiveTab('saved')" title="Saved sessions" type="button">
              <i class="bi bi-clock-history"></i> {{ t('memorisation.saved') }}
            </button>
            <!-- <button v-if="isLoggedIn" role="tab" :aria-selected="tab === 'stats' ? 'true' : 'false'"
              :class="{ active: tab === 'stats' }" @click.prevent="setActiveTab('stats')" title="Session insights"
              type="button">
              <i class="bi bi-bar-chart-line"></i> {{ t('memorisation.insights') }}
            </button> -->
            <!-- Settings tab hidden permanently; display/reading controls live in Setup and Techniques -->
          </div>
        </div>

        <div ref="toolsBody" class="tools-body compact">
          <div v-if="showHifzPlannerUi" class="sheet planner-controls-sheet">
            <section class="sheet-section sheet-section-compact">
              <div class="sheet-content planner-controls-content">
                <div class="field-stack field-stack-compact">
                  <div class="field">
                    <label><i class="bi bi-book"></i> {{ t('memorisation.planner.hifzPlan') }}</label>
                    <strong>{{ hifzPlan?.selectedSurah || 'Current plan' }} · {{ plannerSessionState.sessionRange?.rangeStart || 1 }}-{{ plannerSessionState.sessionRange?.rangeEnd || 1 }}</strong>
                    <small class="field-hint">{{ plannerGuidanceTitle }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-bullseye"></i> {{ t('memorisation.planner.todaysGoal') }}</label>
                    <strong>{{ plannerSessionState.todayGoalLabel }}</strong>
                    <small class="field-hint">{{ plannerGuidanceWhy }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-gem"></i> {{ t('memorisation.planner.memoryReview') }}</label>
                    <strong>{{ plannerMemoryReviewLine }}</strong>
                    <small class="field-hint">{{ t('memorisation.analyticsHeatmap.nextReviewHint', { label: plannerSessionState.nextReviewLabel, confidence: plannerConfidenceLine }) }}</small>
                  </div>
                  <div v-if="hasSessionStarted" class="field">
                    <label><i class="bi bi-layout-text-window-reverse"></i> {{ t('memorisation.planner.sessionView') }}</label>
                    <div class="planner-controls-inline">
                      <button
                        type="button"
                        class="planner-inline-btn"
                        :class="{ active: readingViewMode === 'mushaf' }"
                        @click="setReadingViewMode(readingViewMode === 'mushaf' ? 'stacked' : 'mushaf')"
                      >
                        <i class="bi" :class="readingViewMode === 'mushaf' ? 'bi-book' : 'bi-view-stacked'"></i>
                        {{ readingViewMode === 'mushaf' ? 'Mushaf view' : 'Stacked view' }}
                      </button>
                      <div class="font-dropdown quick-font-dropdown planner-font-dropdown" @click.stop>
                        <button class="font-dropdown-trigger" type="button" @click="toggleFontDropdown" title="Change Quranic font">
                          <i class="bi bi-text-paragraph" aria-hidden="true"></i>
                          <span>{{ getCurrentFontLabel() }}</span>
                          <i class="bi bi-chevron-down" :class="{ rotated: fontDropdownOpen }" aria-hidden="true"></i>
                        </button>
                        <transition name="dropdown-fade">
                          <div v-if="fontDropdownOpen" class="font-dropdown-menu quick-font-menu">
                            <button v-for="font in quranFontOptions" :key="font.value" type="button" class="font-option"
                              :class="{ active: quranFont === font.value }" @click="selectFont(font.value)">
                              <i class="bi" :class="getFontIcon(font.value)" aria-hidden="true"></i>
                              <span>{{ font.label }}</span>
                              <i v-if="quranFont === font.value" class="bi bi-check-lg check-icon" aria-hidden="true"></i>
                            </button>
                          </div>
                        </transition>
                      </div>
                    </div>
                    <small class="field-hint">{{ t('memorisation.view_and_font_controls_stay_here_while_planner_mod') }}</small>
                  </div>
                  <div v-else class="field">
                    <label><i class="bi bi-layout-text-window-reverse"></i> {{ t('memorisation.planner.sessionView') }}</label>
                    <strong>{{ t('memorisation.available_after_you_start_todays_session') }}</strong>
                    <small class="field-hint">{{ t('memorisation.mushaf_view_and_font_options_stay_hidden_until_the') }}</small>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <!-- TOOLS TAB -->
          <div v-else-if="tab === 'tools'" class="sheet">
            <section class="sheet-section sheet-section-compact">
              <button class="sheet-toggle" @click="toggleSection('advanced_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-journal-text"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('sessionSetup.title') }}</span>
                    <span class="st-sub">{{ t('sessionSetup.subtitle') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-stack field-stack-compact">
                  <div class="field">
                    <label><i class="bi bi-journal-text"></i> {{ t('sessionSetup.surah') }}</label>
                    <select :value="chapterId" @change="onChapterChange" class="select">
                      <option :value="0">{{ t('sessionSetup.chooseSurah') }}</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.name_simple }}</option>
                    </select>
                    <small class="field-hint">{{ t('sessionSetup.surahHint') }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-bounding-box"></i> {{ t('sessionSetup.ayahRange') }}</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>{{ t('sessionSetup.to') }}</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                    <small class="field-hint">{{ t('sessionSetup.rangeHint') }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-mic-fill"></i> {{ t('sessionSetup.reciter') }}</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select" :disabled="isWorkspaceRefreshing && workspaceRefreshReason === 'reciter'">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                    <small v-if="isWorkspaceRefreshing && workspaceRefreshReason === 'reciter'" class="field-hint field-hint-loading">
                      <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
                      {{ t('memorisation.loading.reciterRefresh') }}
                    </small>
                    <small v-else class="field-hint">{{ t('sessionSetup.reciterHint') }}</small>
                  </div>
                  <div class="field field-repetitions-clean">
                    <div class="field-header">
                      <label><i class="bi bi-arrow-repeat"></i> {{ t('sessionSetup.repetitions') }}</label>
                      <span class="range-value-pill">{{ repetitionDisplayValue }}</span>
                    </div>
                    <div class="range-control">
                      <input type="range" :value="sliderRepetitionValue" :style="sessionRepetitionSliderStyle"
                        @input="setRepetitionsFromSlider(Number($event.target.value))" min="1" max="10" step="1"
                        class="input technique-range" />
                    </div>
                    <div class="slider-markers slider-markers-compact">
                      <span>1x</span><span>3x</span><span>5x</span><span>7x</span><span>10x</span>
                    </div>
                    <small class="field-hint">{{ t('sessionSetup.repeatHint', { count: repetitionsPerStep }) }}</small>
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
                    <span class="st-sub">{{ t('memorisation.playback_settings') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_playback }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content offcanvas-audio-panel" v-show="sectionOpen.advanced_playback">
                <div class="field-stack field-stack-compact">
                  <div class="field">
                    <label>{{ t('memorisation.speed') }}</label>
                    <div class="radio-group radio-group-tight radio-group-compact">
                      <label class="radio" v-for="option in speedOptions" :key="`tool-speed-${option}`">
                        <input type="radio" name="session-playback-speed" :value="option" v-model.number="speed"
                          @change="setPlaybackSpeed(option)"> {{ option }}x
                      </label>
                    </div>
                    <small class="field-hint">{{ t('memorisation.use_slower_speed_for_early_memorisation') }}</small>
                  </div>
                  <div class="field">
                    <label>{{ t('memorisation.auto_advance') }}</label>
                    <div class="radio-group radio-group-tight radio-group-compact">
                      <label class="radio"><input type="radio" name="session-auto-advance" value="auto" v-model="playMode"> {{ t('common.yes') }}</label>
                      <label class="radio"><input type="radio" name="session-auto-advance" value="manual" v-model="playMode"> {{ t('common.no') }}</label>
                    </div>
                  </div>
                  <div v-if="talqinModeEnabled" class="field">
                    <label><i class="bi bi-hourglass-top"></i> {{ t('memorisation.recitation_window_secs') }}</label>
                    <select v-model.number="recitationWindowSeconds" class="select select-compact">
                      <option v-for="option in recitationWindowOptions" :key="`recitation-window-${option}`" :value="option">{{ option }}s</option>
                    </select>
                    <small class="field-hint">{{ t('memorisation.recitation_window_hint') }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-hourglass-split"></i> {{ t('memorisation.delay_between_recitations_secs') }}</label>
                    <select v-model.number="delay" class="select select-compact">
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
          <div v-else-if="tab === 'techniques'" class="sheet">
            <div class="technique-group-copy technique-group-beginner">
              <span class="technique-group-kicker">{{ t('memorisation.practiceTools.beginner') }}</span>
              <p>{{ t('memorisation.practiceTools.beginnerDesc') }}</p>
            </div>
            
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('focus_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-bullseye"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('memorisation.focus_mode') }}</span>
                    <span class="st-sub">{{ t('memorisation.reduce_distractions_around_the_active_ayah') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: focusModeEnabled }"
                      :aria-pressed="focusModeEnabled ? 'true' : 'false'" :aria-label="t('memorisation.a11y.useFocusMode')" @click="toggleFocusModeRadio">
                      <i class="mode-radio-icon bi" :class="focusModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"></i>
                    </button>
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
                      <span>{{ t('memorisation.techniques.focusDescription') }}</span>
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
                    <span class="st-title">{{ t('memorisation.blur_mode') }}</span>
                    <span class="st-sub">{{ t('memorisation.progressive_concealment_for_active_recall') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: blurModeEnabled }"
                      :aria-pressed="blurModeEnabled ? 'true' : 'false'" :aria-label="t('memorisation.a11y.useBlurMode')" @click="toggleBlurModeRadio">
                      <i class="mode-radio-icon bi" :class="blurModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"></i>
                    </button>
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
                      <span>{{ t('memorisation.blurs_upcoming_verses_requiring_you_to_recall_them') }}</span>
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
                    <span class="st-title">{{ t('memorisation.talqinMode.title') }}</span>
                    <span class="st-sub">{{ t('memorisation.talqinMode.subtitle') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button
                      id="talqin-mode-toggle"
                      type="button"
                      class="mode-radio"
                      :class="{ active: talqinModeEnabled }"
                      :aria-pressed="talqinModeEnabled ? 'true' : 'false'"
                      :aria-label="t('memorisation.a11y.useTalqinMode')"
                      @click="talqinModeEnabled = !talqinModeEnabled"
                    >
                      <i class="mode-radio-icon bi" :class="talqinModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i>
                    </button>
                  </div>
                  <span class="st-chev" :class="{ open: sectionOpen.talqin_mode }"><i class="bi bi-chevron-down"></i></span>
                </div>
              </button>
              <div class="sheet-content" v-show="sectionOpen.talqin_mode">
                <div class="field-stack">
                  <div class="field">
                    <div class="technique-description">
                      <i class="bi bi-info-circle-fill"></i>
                      <span>{{ t('memorisation.talqinMode.description') }}</span>
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
                    <span class="st-title">{{ t('memorisation.chaining') }}</span>
                    <span class="st-sub">{{ chainingMethodDescription }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: chainingEnabled }"
                      :aria-pressed="chainingEnabled ? 'true' : 'false'" :aria-label="t('memorisation.a11y.useChaining')" @click="toggleChainingRadio">
                      <i class="mode-radio-icon bi" :class="chainingEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"></i>
                    </button>
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
                          : 'Select linking or cumulative to build the chaining queue.')
                        : t('memorisation.techniques.chainingOffDescription') }}</span>
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
                    <span class="st-title">{{ t('memorisation.anchor_mode') }}</span>
                    <span class="st-sub">{{ t('memorisation.mental_hooks_using_key_words') }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: anchorModeEnabled }"
                      :aria-pressed="anchorModeEnabled ? 'true' : 'false'" :aria-label="t('memorisation.a11y.useAnchorMode')" @click="toggleAnchorModeRadio">
                      <i class="mode-radio-icon bi" :class="anchorModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'"
                        aria-hidden="true"></i>
                    </button>
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
                      <span>{{ t('memorisation.highlights_key_words_as_memory_anchors_to_help_rec') }}</span>
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
          <div v-else-if="tab === 'saved'" class="sheet">
            <section class="sheet-section sheet-section-compact">
              <button class="sheet-toggle" type="button" @click="toggleSection('saved_sessions')">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-clock-history"></i></span>
                  <span class="st-txt">
                    <span class="st-title">{{ t('memorisation.saved_sessions') }}</span>
                    <span class="st-sub">{{ t('memorisation.saved_sessions_intro') }}</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.saved_sessions }"><i class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content saved-sessions-sheet" v-show="sectionOpen.saved_sessions">
                <div v-if="savedSessions.length > 0" class="saved-sessions-list" role="list">
                  <article
                    v-for="session in sortedSavedSessions"
                    :key="session.id"
                    class="saved-session-row"
                    :class="{
                      'is-complete': isSavedSessionComplete(session),
                      'is-active': sessionMatchesCurrentLiveConfig(session)
                    }"
                    role="listitem"
                  >
                    <button type="button" class="saved-session-row-main" @click="loadSavedSession(session.id)">
                      <span class="saved-session-row-title">
                        <i class="bi" :class="isSavedSessionComplete(session) ? 'bi-check-circle' : 'bi-bookmark'" aria-hidden="true"></i>
                        <span>{{ getSavedSessionName(session) }}</span>
                      </span>
                      <span class="saved-session-row-meta">
                        {{ getSavedSessionSurah(session) }} · {{ t('memorisation.last_opened', { date: formatDate(session.savedAt) }) }}
                      </span>
                    </button>
                    <div class="saved-session-row-actions">
                      <button class="saved-session-row-btn saved-session-row-btn-primary" @click="loadSavedSession(session.id)" type="button">
                        <i class="bi bi-play-fill" aria-hidden="true"></i>
                        <span>{{ t('common.resume') }}</span>
                      </button>
                      <button class="saved-session-row-btn" @click.stop="deleteSavedSession(session.id)" :title="t('common.delete')" :aria-label="t('common.delete')" type="button">
                        <i class="bi bi-trash3" aria-hidden="true"></i>
                      </button>
                    </div>
                  </article>
                </div>

                <div v-else class="saved-empty-sheet">
                  <i class="bi bi-journal-bookmark" aria-hidden="true"></i>
                  <p>{{ t('memorisation.no_saved_sessions_yet') }}</p>
                  <span>{{ t('memorisation.save_your_current_session_to_get_started') }}</span>
                </div>
              </div>
            </section>

            <section v-if="hasVerses" class="sheet-section sheet-section-compact">
              <div class="sheet-content saved-current-session-sheet">
                <div class="saved-current-session-copy">
                  <i class="bi bi-play-circle" aria-hidden="true"></i>
                  <div>
                    <strong>{{ t('memorisation.current_session') }}</strong>
                    <small>{{ currentChapter?.name_simple || t('memorisation.no_surah_selected') }} · {{ rangeStart }}-{{ rangeEnd }}</small>
                  </div>
                </div>
                <button class="saved-current-session-btn" @click="saveCurrentSessionWithName()" type="button">
                  <i class="bi bi-save" aria-hidden="true"></i>
                  <span>{{ t('common.save') }}</span>
                </button>
              </div>
            </section>
          </div>

          <div v-else-if="isLoggedIn && tab === 'stats'" class="sheet">
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
                </div>
                <button type="button" class="analytics-toggle-btn" @click="openAdvancedMetricsModal">
                  <i class="bi bi-plus-circle"></i>
                  <span>{{ t('memorisation.show_advanced_metrics') }}</span>
                </button>
                <div v-if="false">
                  <section class="detailed-analytics-system" :aria-label="t('memorisation.a11y.detailedAnalytics')">
                    <article v-for="section in detailedAnalyticsSections" :key="section.key" class="detailed-analytics-section">
                      <div class="analytics-section-head">
                        <i class="bi" :class="section.icon" aria-hidden="true"></i>
                        <strong>{{ section.title }}</strong>
                      </div>
                      <div class="detailed-analytics-rows">
                        <div v-for="row in section.rows" :key="`${section.key}-${row.label}`" class="detailed-analytics-row">
                          <span>{{ row.label }}</span>
                          <strong>{{ row.value }}</strong>
                          <small>{{ row.detail }}</small>
                        </div>
                      </div>
                    </article>
                  </section>
                  <div v-if="savedSessions.length === 0" class="empty-state">
                    <i class="bi bi-activity"></i>
                    <p>{{ t('memorisation.no_advanced_insights_yet') }}</p>
                    <span>{{ t('memorisation.save_a_session_and_you_ll_unlock_the_deeper_breakd') }}</span>
                  </div>
                  <div v-else class="stats-panel">
                    <div v-if="selectedStatsSessionRecord" class="stats-detail">
                      <div class="stats-detail-head stats-detail-head-hero">
                        <div>
                          <h4>{{ getSavedSessionName(selectedStatsSessionRecord) }}</h4>
                          <div class="stats-summary">{{ buildStatsSummary(selectedStatsSessionRecord) }}</div>
                          <div v-if="sortedSavedSessions.length > 1" class="stats-session-select-wrap">
                            <label class="stats-session-select-label" for="statsSessionSelect">{{ t('memorisation.saved_sessions') }}</label>
                            <select id="statsSessionSelect" class="stats-session-select"
                              :value="selectedStatsSessionRecord.id" @change="selectStatsSession($event.target.value)">
                              <option v-for="session in sortedSavedSessions" :key="`stats-${session.id}`"
                                :value="session.id">
                                {{ getSavedSessionName(session) }} · {{ formatDate(session.savedAt) }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <div class="stats-detail-actions stats-detail-actions-prominent">
                          <button type="button" class="session-export-btn stats-full-analytics-btn"
                            @click="openSessionAnalyticsModal(selectedStatsSessionRecord)">
                            <i class="bi bi-graph-up-arrow"></i>
                            <span>{{ t('memorisation.view_full_analytics') }}</span>
                          </button>
                        </div>
                      </div>
                      <div class="stats-grid stats-grid-hero">
                        <div v-for="item in buildStatsBreakdown(selectedStatsSessionRecord)" :key="item.key"
                          class="stats-card">
                          <i class="bi stats-card-icon" :class="item.icon"></i>
                          <em class="stats-card-value">{{ item.value }}</em>
                          <span>{{ item.label }}</span>
                        </div>
                      </div>
                      <div class="stats-detail-footer">
                        <span>Saved {{ formatDate(selectedStatsSessionRecord.savedAt) }}</span>
                        <span>{{ getSavedSessionSurah(selectedStatsSessionRecord) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SETTINGS TAB - Same layout as Techniques tab -->
          <div v-else-if="tab === 'settings'" class="sheet">

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
                    <input type="range" min="80" max="200" step="5" v-model.number="defaultFontSize"
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
                <div class="setting-item">
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
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.transliteration') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.transliterationDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showTransliteration }"
                    @click="toggleReadingOption('transliteration')">
                    {{ showTransliteration ? t('common.on') : t('common.off') }}
                  </button>
                </div>

                <!-- Word Audio: always enabled — toggle removed -->
              </div>
            </section>
          </div>
        </div>

        <div class="tools-footer" :class="{ 'settings-footer': tab === 'settings' }">
          <template v-if="showHifzPlannerUi">
            <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="openHifzPlanModal">
              <i class="bi bi-pencil-square"></i><span>{{ t('memorisation.edit_plan') }}</span>
            </button>
            <button class="tools-btn btn btn-primary session-primary-action" @click="startPlannerPrimaryAction">
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i><span>{{ plannerPrimaryActionLabel }}</span>
            </button>
          </template>
          <template v-else>
            <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="resetControls">
              <i class="bi bi-arrow-counterclockwise"></i><span>{{ t('common.reset') }}</span>
            </button>
            <button class="tools-btn btn btn-primary session-primary-action" @click="startSessionAndClose">
              <i class="bi bi-play-fill" aria-hidden="true"></i>
              <span>{{ t('memorisation.welcomeBack.startNewSession') }}</span>
            </button>
          </template>
        </div>
      </aside>
    </div>

    <!-- Save Session Name Modal - Clean & Updated Version -->
    <div class="modal-overlay mutqin-modal-overlay" v-if="showSaveNameModal" @click.self="closeSaveModal">
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
              :class="{ 'error': nameError }" :placeholder="`${currentChapter?.name_simple || 'Session'} ${rangeStart}-${rangeEnd}`"
              @keyup.enter="confirmSaveSession" @input="clearNameError" autofocus maxlength="50" />
            <div class="input-hint">
              <span class="char-count">{{ saveSessionName.length }}/50</span>
              <span class="hint-text">{{ currentChapter?.name_simple || 'Current session' }} · Ayahs {{ rangeStart }}-{{ rangeEnd }}</span>
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

    <div class="modal-overlay mutqin-modal-overlay confirm-modal-overlay" v-if="showConfirmModal" @click.self="closeConfirmModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
      <div class="modal-content mutqin-modal-surface confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="confirmModalTitle">{{ confirmModal.title }}</h2>
          </div>
          <button class="modal-close-btn" @click="closeConfirmModal" type="button" :aria-label="t('memorisation.confirmModals.closeDialog')"><i
              class="bi bi-x-lg" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-copy">{{ confirmModal.message }}</p>
        </div>
        <div class="modal-footer mutqin-modal-footer">
          <div class="mutqin-modal-actions mutqin-modal-actions--end">
            <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="closeConfirmModal">
              <span>{{ confirmModal.cancelLabel }}</span>
            </button>
            <button
              type="button"
              class="mutqin-modal-btn"
              :class="confirmModal.tone === 'danger' ? 'mutqin-modal-btn--danger' : 'mutqin-modal-btn--primary'"
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
    <div v-if="showWelcomeBackModal" class="welcome-back-flow mutqin-modal-flow" :class="{ 'welcome-back-flow--ready': welcomeBackModalReady }" aria-live="polite">
      <div class="modal-backdrop fade show welcome-back-backdrop"></div>
      <div
        class="modal fade show d-block welcome-back-modal-wrap"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcomeBackModalTitle"
      >
        <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
          <div class="modal-content mutqin-modal-surface welcome-back-modal">
            <div class="welcome-back-hero">
              <div class="welcome-back-hero-copy">
                <span class="welcome-back-kicker">
                  {{ t('memorisation.welcomeBack.kicker') }}
                </span>
                <h2 id="welcomeBackModalTitle" class="welcome-back-title">
                  {{ welcomeBackModalTitle }}
                </h2>
                <p class="welcome-back-message">
                  {{ welcomeBackModalSubtitle }}
                </p>
              </div>
            </div>

            <div class="modal-body welcome-back-body">
              <div
                v-if="welcomeBackDetailRows.length"
                class="welcome-back-details"
                :aria-label="t('memorisation.postSession.detailsLabel')"
              >
                <div
                  v-for="row in welcomeBackDetailRows"
                  :key="row.key"
                  class="welcome-back-detail-row"
                >
                  <span class="welcome-back-detail-label">{{ row.label }}</span>
                  <strong class="welcome-back-detail-value">{{ row.value }}</strong>
                </div>
              </div>

              <p
                v-if="welcomeBackConsistencyNudge"
                class="emotional-touch emotional-touch--nudge"
                role="status"
              >
                {{ welcomeBackConsistencyNudge }}
              </p>

              <blockquote class="welcome-back-reminder" :aria-label="t('memorisation.welcomeBack.reminderLabel')">
                <span class="welcome-back-reminder-kicker">{{ t('memorisation.welcomeBack.reminderLabel') }}</span>
                <p class="welcome-back-reminder-quote">{{ welcomeBackIslamicContent.translation }}</p>
                <footer class="welcome-back-reminder-footer">
                  <cite>{{ welcomeBackIslamicContent.source }}</cite>
                </footer>
                <p class="welcome-back-reminder-intention">{{ welcomeBackIslamicContent.intention }}</p>
              </blockquote>
            </div>

            <div class="modal-footer mutqin-modal-footer">
              <div class="mutqin-modal-actions mutqin-modal-actions--3 welcome-back-actions-grid">
                <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="welcomeBackStartNewSession">
                  <i class="bi bi-plus-circle" aria-hidden="true"></i>
                  <span>{{ t('memorisation.welcomeBack.startNewSession') }}</span>
                </button>
                <button
                  type="button"
                  class="mutqin-modal-btn mutqin-modal-btn--secondary"
                  :disabled="!canResumePreviousSession"
                  @click="welcomeBackContinueSession"
                >
                  <i class="bi bi-play-circle" aria-hidden="true"></i>
                  <span>{{ t('memorisation.welcomeBack.continuePreviousSession') }}</span>
                </button>
                <button type="button" class="mutqin-modal-btn mutqin-modal-btn--muted" @click="logoutFromWelcomeBack">
                  <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                  <span>{{ t('common.logout') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </transition>

    <transition name="mutqin-flow">
    <div v-if="showSessionExitModal" class="session-exit-flow mutqin-modal-flow" aria-live="polite">
      <div class="modal-backdrop fade show session-exit-backdrop"></div>
      <div
        class="modal fade show d-block session-exit-modal-wrap"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sessionExitTitle"
      >
        <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
          <div class="modal-content mutqin-modal-surface session-exit-modal">
            <div class="session-exit-hero">
              <div class="session-exit-hero-copy">
                <span class="session-exit-kicker">
                  {{ t('memorisation.sessionExit.kicker') }}
                </span>
                <h2 id="sessionExitTitle" class="session-exit-title">
                  {{ sessionExitModalTitle }}
                </h2>
                <p v-if="sessionExitMotivationMessage" class="session-exit-message">
                  {{ sessionExitMotivationMessage }}
                </p>
              </div>
            </div>

            <div class="modal-body session-exit-body">
              <div
                v-if="sessionExitRemainingProgress.percentComplete < 100"
                class="session-exit-progress"
                role="progressbar"
                :aria-valuenow="sessionExitRemainingProgress.percentComplete"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="sessionExitProgressSummary"
              >
                <div class="session-exit-progress-meta">
                  <span class="session-exit-progress-label">{{ t('memorisation.stats.progress') }}</span>
                  <span class="session-exit-progress-value">{{ sessionExitProgressSummary }}</span>
                </div>
                <div class="session-exit-progress-track">
                  <span
                    class="session-exit-progress-fill"
                    :style="{ width: `${sessionExitRemainingProgress.percentComplete}%` }"
                  ></span>
                </div>
              </div>

              <div
                v-if="sessionExitDetailRows.length"
                class="mutqin-session-summary-details"
                :aria-label="t('memorisation.postSession.detailsLabel')"
              >
                <div
                  v-for="row in sessionExitDetailRows"
                  :key="row.key"
                  class="mutqin-session-summary-row"
                >
                  <span class="mutqin-session-summary-row-label">{{ row.label }}</span>
                  <span class="mutqin-session-summary-row-value">
                    {{ row.value }}
                    <small v-if="row.hint">{{ row.hint }}</small>
                  </span>
                </div>
              </div>
            </div>

            <div class="modal-footer mutqin-modal-footer">
              <div class="session-exit-actions-layout">
                <button
                  v-if="canContinueCurrentSession"
                  type="button"
                  class="mutqin-modal-btn mutqin-modal-btn--primary session-exit-actions-primary"
                  @click="continueSessionFromExitModal"
                >
                  <i class="bi bi-play-circle" aria-hidden="true"></i>
                  <span>{{ t('memorisation.sessionExit.continueSession') }}</span>
                </button>
                <div
                  class="session-exit-actions-secondary"
                  :class="{ 'session-exit-actions-secondary--with-primary': canContinueCurrentSession }"
                >
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="exitSessionToNewSession">
                    <i class="bi bi-plus-circle" aria-hidden="true"></i>
                    <span>{{ t('memorisation.sessionExit.startNewSession') }}</span>
                  </button>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="exitSessionToRepeatRange">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                    <span>{{ t('memorisation.sessionExit.repeatSession') }}</span>
                  </button>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="exitSessionToSaveSession">
                    <i class="bi bi-bookmark-check" aria-hidden="true"></i>
                    <span>{{ t('memorisation.sessionExit.saveSession') }}</span>
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
                      v-if="activeHelpLearningSection.key === 'talqin-mode'"
                      class="help-learning-talqin-guide text-dark dark:text-white"
                    >
                      <h5 class="text-dark dark:text-white"><strong>{{ t('memorisation.helpLearning.sections.talqinMode.workflowTitle') }}</strong></h5>
                      <p class="text-dark dark:text-white">{{ t('memorisation.helpLearning.sections.talqinMode.workflowIntro') }}</p>
                      <ul class="text-dark dark:text-white">
                        <li><strong>{{ t('memorisation.helpLearning.sections.talqinMode.workflowListen') }}</strong> {{ t('memorisation.helpLearning.sections.talqinMode.workflowListenText') }}</li>
                        <li><strong>{{ t('memorisation.helpLearning.sections.talqinMode.workflowPause') }}</strong> {{ t('memorisation.helpLearning.sections.talqinMode.workflowPauseText') }}</li>
                        <li><strong>{{ t('memorisation.helpLearning.sections.talqinMode.workflowExtend') }}</strong> {{ t('memorisation.helpLearning.sections.talqinMode.workflowExtendText') }}</li>
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
                    <span class="legend-dot excellent"></span><span>90-100</span>
                    <span class="legend-dot strong"></span><span>75-89</span>
                    <span class="legend-dot needs"></span><span>60-74</span>
                    <span class="legend-dot weak"></span><span>40-59</span>
                    <span class="legend-dot critical"></span><span>&lt;40</span>
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
          <section class="session-analytics-section">
            <div class="session-analytics-summary-grid">
              <article v-for="item in controlsAnalyticsCards" :key="`advanced-${item.key}`"
                class="session-analytics-summary-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.description }}</small>
              </article>
            </div>
          </section>
          <section class="session-analytics-section advanced-metrics-grid" aria-label="Advanced analytics cards">
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
        </div>
      </div>
      </div>
    </div>

    <div v-if="showAiMemorisationCheckerModal && aiMemorisationCheckerVerse" class="modal-overlay mutqin-modal-overlay memorisation-checker-overlay"
      @click.self="closeAiMemorisationCheckerModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--full">
      <div class="modal-content mutqin-modal-surface self-check-modal memorisation-checker-modal recitation-review-modal" role="dialog" aria-modal="true"
        aria-labelledby="aiMemorisationCheckerTitle">
        <div class="modal-header self-check-modal-header memorisation-checker-header">
          <div class="self-check-modal-head-copy">
            <div class="modal-context-badges">
              <div class="modal-context-badge">{{ t('memorisation.ai_memorisation_review') }}</div>
            </div>
            <h2 id="aiMemorisationCheckerTitle">{{ aiMemorisationCheckerTitle }}</h2>
          </div>
          <button class="modal-close-btn" @click="closeAiMemorisationCheckerModal" aria-label="Close AI memorisation checker">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body self-check-modal-body memorisation-checker-body">
          <div class="ai-check-step-guide" role="status" aria-live="polite">
            <span class="ai-check-step-badge">{{ t('memorisation.aiCheck.stepLabel', aiMemorisationCheckerStepGuide) }}</span>
            <div class="ai-check-step-copy">
              <strong>{{ aiMemorisationCheckerStepGuide.title }}</strong>
              <p>{{ aiMemorisationCheckerStepGuide.detail }}</p>
            </div>
          </div>
          <section class="self-check-modal-stage memorisation-checker-stage">
            <header class="self-check-section-head">
              <div>
                <span class="self-check-kicker">{{ t('memorisation.ayah_display') }}</span>
                <strong class="self-check-section-title">{{ t('memorisation.recite_from_memory') }}</strong>
              </div>
              <div class="self-check-header-tools memorisation-checker-header-tools" :aria-label="t('memorisation.a11y.aiMemorisationTools')">
                <button class="self-check-toolbar-btn self-check-ayah-action-ai" type="button"
                  @click.stop="toggleAiMemorisationCheckerRecording"
                  :disabled="aiMemorisationCheckerPreparing || !supportsSelfCheckRecording()"
                  :class="{ recording: aiMemorisationCheckerRecording }"
                  :title="aiMemorisationCheckerRecording ? 'Stop memorisation check' : 'Play memorisation check'"
                  :aria-label="t('memorisation.a11y.playMemorisationCheck')">
                  <i class="bi" :class="aiMemorisationCheckerRecording ? 'bi-stop-circle' : 'bi-stars'"></i>
                  <span>{{ aiMemorisationCheckerRecording ? 'Stop' : 'Play Memorisation' }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button"
                  @click.stop="toggleSelfCheckAyahPlayback(aiMemorisationCheckerVerse)"
                  :title="activeSelfCheckAyahPlaybackKey === aiMemorisationCheckerVerse.key ? 'Pause ayah' : 'Play ayah once'"
                  :aria-label="t('memorisation.a11y.playAyahOnce')">
                  <i class="bi" :class="activeSelfCheckAyahPlaybackKey === aiMemorisationCheckerVerse.key ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                  <span>{{ activeSelfCheckAyahPlaybackKey === aiMemorisationCheckerVerse.key ? 'Pause' : 'Play' }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button" @click.stop="toggleAiMemorisationCheckerBlur"
                  :class="{ active: aiMemorisationCheckerBlurEnabled }"
                  :aria-pressed="aiMemorisationCheckerBlurEnabled ? 'true' : 'false'"
                  :title="t('memorisation.a11y.blurEverything')" :aria-label="t('memorisation.a11y.blurEverything')">
                  <i class="bi" :class="aiMemorisationCheckerBlurEnabled ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                  <span>{{ t('memorisation.blur_everything') }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button" @mousedown="startAiMemorisationCheckerPeek"
                  @mouseup="stopAiMemorisationCheckerPeek" @mouseleave="stopAiMemorisationCheckerPeek"
                  @touchstart.prevent="startAiMemorisationCheckerPeek" @touchend="stopAiMemorisationCheckerPeek"
                  @touchcancel="stopAiMemorisationCheckerPeek" :title="t('memorisation.a11y.peekAyah')" :aria-label="t('memorisation.a11y.peekAyah')">
                  <i class="bi bi-eye"></i>
                  <span>{{ t('memorisation.peek') }}</span>
                </button>
              </div>
            </header>

            <div class="self-check-modal-ayah-shell"
              :class="{ 'is-blurred': aiMemorisationCheckerBlurEnabled && !aiMemorisationCheckerPeekActive, 'is-peekable': aiMemorisationCheckerBlurEnabled }"
              @mousedown="startAiMemorisationCheckerPeek" @mouseup="stopAiMemorisationCheckerPeek"
              @mouseleave="stopAiMemorisationCheckerPeek" @touchstart.prevent="startAiMemorisationCheckerPeek"
              @touchend="stopAiMemorisationCheckerPeek" @touchcancel="stopAiMemorisationCheckerPeek">
              <div class="self-check-modal-ayah memorisation-checker-ayah" dir="rtl" lang="ar"
	                :class="{
	                  'tajweed-enabled': aiMemorisationCheckerTajweedEnabled,
	                  'self-check-session-ayat': aiMemorisationCheckerScope === 'session' && aiMemorisationCheckerTargets.length > 1,
	                  'recitation-word-review-active': isAiMemorisationCheckerReviewActive
	                }"
	                :style="getAiMemorisationCheckerAyahStyle(aiMemorisationCheckerVerse)"
	                v-html="getAiMemorisationCheckerArabic(aiMemorisationCheckerVerse)"></div>
	            </div>
		          </section>

          <section v-if="aiMemorisationCheckerRecording || aiMemorisationCheckerPreparing || aiMemorisationCheckerResult || aiMemorisationCheckerError"
            class="self-check-modal-recorder-grid memorisation-checker-recorder-grid">
            <article class="self-check-recorder-card"
              :class="{ recording: aiMemorisationCheckerRecording, reviewing: !!aiMemorisationCheckerResult }">
              <div class="self-check-recorder-head">
                <div>
                  <span class="self-check-kicker">{{ t('memorisation.memorisation_review') }}</span>
                  <strong>{{ aiMemorisationCheckerRecording ? 'AI memorisation listening' : aiMemorisationCheckerResult ? 'Review before saving' : 'AI memorisation review' }}</strong>
                  <p class="self-check-card-desc">{{ aiMemorisationCheckerStageDescription }}</p>
                </div>
              </div>
              <section v-if="isAiMemorisationCheckerReviewActive || aiMemorisationCheckerError"
                class="recitation-check-panel recitation-check-panel-inline memorisation-checker-panel"
                aria-live="polite">
                <div class="recitation-check-head">
                  <div>
                    <span class="recitation-check-kicker">{{ t('memorisation.reading.aiMemory') }}</span>
                    <h2>{{ aiMemorisationCheckerResult ? 'Memorisation review' : aiMemorisationCheckerRecording ? 'AI memorisation listening' : 'AI memorisation check' }}</h2>
                  </div>
                  <div class="recitation-check-head-actions">
                    <button v-if="aiMemorisationCheckerResult && !aiMemorisationCheckerRecording && !aiMemorisationCheckerPreparing"
                      class="recitation-result-close" type="button" @click="discardAiMemorisationCheckerAssessment"
                      :aria-label="t('memorisation.a11y.closeMemorisationReview')">
                      <i class="bi bi-x-lg"></i>
                    </button>
                    <button v-if="aiMemorisationCheckerResult && !aiMemorisationCheckerRecording && !aiMemorisationCheckerPreparing"
                      class="recitation-result-reset" type="button" @click="resetAiMemorisationCheckerAssessment"
                      :title="t('memorisation.a11y.resetMemorisationReview')" :aria-label="t('memorisation.a11y.resetMemorisationReview')">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                  </div>
                </div>
                <div v-if="aiMemorisationCheckerRecording" class="recitation-check-status">
                  <i class="bi bi-record-circle" aria-hidden="true"></i>
                  <span>{{ aiMemorisationCheckerStageDescription }}</span>
                </div>
                <div v-if="aiMemorisationCheckerRecording" class="recitation-live-review recitation-live-review-compact"
                  :aria-label="t('memorisation.a11y.liveMemorisationCheck')">
                  <div class="recitation-live-head">
	                    <span>{{ aiMemorisationCheckerLiveSummary }}</span>
	                    <strong>{{ t('memorisation.live') }}</strong>
	                  </div>
	                  <div class="recitation-word-stream recitation-live-word-stream memorisation-checker-word-stream" dir="rtl" lang="ar">
	                    <span v-for="word in aiMemorisationCheckerVisibleLiveWords" :key="word.key"
	                      class="recitation-word-chip word-live" :class="`word-${word.visualStatus || word.status || 'notAttempted'}`"
                        data-live-kind="memorisation" :data-live-word-index="word.index" :title="word.note">
	                      {{ word.text }}
	                    </span>
                  </div>
                </div>
                <div v-if="aiMemorisationCheckerRecording" class="recitation-check-actions">
                  <button class="btn-primary self-check-action-btn" type="button" @click="stopAiMemorisationCheckerRecording">
                    <i class="bi bi-stop-circle"></i>
                    <span>{{ t('memorisation.stop_check') }}</span>
                  </button>
                </div>
                <div v-else-if="aiMemorisationCheckerPreparing" class="recitation-check-status">
                  <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
                  <span>{{ t('memorisation.checking_the_recording') }}</span>
                </div>
                <div v-if="aiMemorisationCheckerError" class="recitation-check-error">
                  {{ aiMemorisationCheckerError }}
                </div>
                <div v-if="aiMemorisationCheckerResult" ref="aiMemorisationCheckerResults"
                  class="recitation-check-body recitation-check-results memorisation-checker-results shared-result-flow transition-all duration-300">
                  <section class="shared-result-section shared-result-section--summary transition-all duration-300">
                    <div class="shared-result-section-head">
                      <span class="recitation-check-section-label">
                        <span class="shared-result-step-badge">1</span>
                        <i class="bi bi-check2-circle" aria-hidden="true"></i>
                        {{ getUnifiedResultSectionLabel('summary') }}
                      </span>
                      <strong>{{ getRecitationResultHeadline(aiMemorisationCheckerResult) }}</strong>
                    </div>
                    <div class="recitation-result-stats memorisation-checker-result-grid">
                      <article v-for="stat in getAiMemorisationCheckerResultStats(aiMemorisationCheckerResult)" :key="stat.key"
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
                      <p>{{ getRecitationWordsReviewSummary(aiMemorisationCheckerResult) }}</p>
                    </div>
                    <div v-if="getRecitationReviewArabic(aiMemorisationCheckerResult, aiMemorisationCheckerVerse)"
                      class="recitation-review-ayah shared-result-ayah" dir="rtl"
                      v-html="getRecitationReviewArabic(aiMemorisationCheckerResult, aiMemorisationCheckerVerse)"
                      @click="handleRecitationReviewWordClick($event, aiMemorisationCheckerResult)"></div>
                    <div class="shared-result-word-review transition-all duration-300">
                      <div v-if="getRecitationWordsToReview(aiMemorisationCheckerResult).length" class="shared-result-word-review-list" dir="rtl">
                        <span v-for="word in getRecitationWordsToReview(aiMemorisationCheckerResult)" :key="`memory-review-${word.index}`"
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
                        <strong>{{ getRecitationRecommendationDisplay(aiMemorisationCheckerResult) }}</strong>
                        <p>{{ getAiMemorisationCheckerNextStep(aiMemorisationCheckerResult) }}</p>
                      </div>
                    </section>
                    <section class="shared-result-section shared-result-section--support shared-result-section--recording transition-all duration-300">
                      <div class="shared-result-section-head">
                        <span class="recitation-check-section-label">
                          <span class="shared-result-step-badge">4</span>
                          <i class="bi bi-play-circle" aria-hidden="true"></i>
                          {{ getUnifiedResultSectionLabel('recording') }}
                        </span>
                        <strong :class="getRecitationValidationTone(aiMemorisationCheckerResult)">{{ getRecitationValidationLabel(aiMemorisationCheckerResult) }}</strong>
                        <p>{{ getRecitationValidationSummary(aiMemorisationCheckerResult) }}</p>
                      </div>
                      <div v-if="aiMemorisationCheckerResult.audioSrc" class="self-check-audio-player shared-result-audio-player shared-result-audio-player--compact">
                        <button class="self-check-audio-player-btn" type="button"
                          @click="toggleReviewResultAudio(aiMemorisationCheckerResult)"
                          :aria-label="reviewResultAudioPlaying ? 'Pause playback' : 'Replay recitation'">
                          <i class="bi" :class="reviewResultAudioPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                        </button>
                        <div class="self-check-audio-player-track">
                          <div class="self-check-audio-player-waveform">
                            <input class="self-check-audio-player-seek" type="range" min="0"
                              :max="reviewResultAudioDuration || 0" step="0.01" :value="reviewResultAudioCurrentTime"
                              @input="seekReviewResultAudio" :aria-label="getUnifiedResultSectionLabel('recording')" />
                          </div>
                          <div class="self-check-audio-player-times">
                            <span>{{ formatSelfCheckDraftAudioTime(reviewResultAudioCurrentTime) }}</span>
                            <span>{{ formatSelfCheckDraftAudioTime(reviewResultAudioDuration || aiMemorisationCheckerResult.durationSeconds) }}</span>
                          </div>
                        </div>
                      </div>
                      <p v-else class="shared-result-recording-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ getRecitationValidationSummary(aiMemorisationCheckerResult) }}</span></p>
                    </section>
                  </div>
                  <div class="recitation-check-footnotes">
                    <div class="self-check-status self-check-status-warning ai-recitation-disclaimer recitation-check-footnote">
                      <i class="bi bi-info-circle"></i>
                      <span>{{ t('memorisation.ai_memorisation_feedback_is_a_guide_verify_importa') }}</span>
                    </div>
                  </div>
                  <div class="recitation-result-actions recitation-result-actions-compact recitation-result-actions-compact-clean">
                    <button class="btn-primary self-check-action-btn" type="button" @click="saveAiMemorisationCheckerAssessment">
                      <i class="bi bi-save2"></i>
                      <span>{{ t('memorisation.save_attempt') }}</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn" type="button" @click="resetAiMemorisationCheckerAssessment">
                      <i class="bi bi-arrow-counterclockwise"></i>
                      <span>{{ t('memorisation.aiCheck.tryAgain') }}</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn" type="button" @click="discardAiMemorisationCheckerAssessment">
                      <i class="bi bi-x-circle"></i>
                      <span>{{ t('common.discard') }}</span>
                    </button>
                  </div>
                </div>
              </section>
            </article>
          </section>
        </div>
      </div>
      </div>
    </div>

    <div v-if="showSelfCheckModal && selfCheckModalVerse" class="modal-overlay mutqin-modal-overlay self-check-modal-overlay"
      @click.self="closeSelfCheckModal">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--full">
      <div class="modal-content mutqin-modal-surface self-check-modal recitation-review-modal" role="dialog" aria-modal="true" aria-labelledby="selfCheckModalTitle">
        <div class="modal-header self-check-modal-header">
          <div class="self-check-modal-head-copy">
            <h2 id="selfCheckModalTitle">{{ selfCheckModalTitle }}</h2>
          </div>
          <div class="self-check-modal-header-actions">
            <button
              v-if="showSelfCheckLibraryShortcut"
              class="self-check-library-shortcut-btn"
              type="button"
              @click="openRecordingsLibraryFromSelfCheck"
            >
              <i class="bi bi-collection-play" aria-hidden="true"></i>
              <span>{{ t('memorisation.view_all_recording_library') }}</span>
            </button>
            <button class="modal-close-btn" @click="closeSelfCheckModal" :aria-label="t('memorisation.a11y.closeSelfCheck')">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div ref="selfCheckModalBody" class="modal-body self-check-modal-body">
          <div v-if="recitationCheckVisible" class="ai-check-step-guide" role="status" aria-live="polite">
            <span class="ai-check-step-badge">{{ t('memorisation.aiCheck.stepLabel', recitationCheckStepGuide) }}</span>
            <div class="ai-check-step-copy">
              <strong>{{ recitationCheckStepGuide.title }}</strong>
              <p>{{ recitationCheckStepGuide.detail }}</p>
            </div>
          </div>
          <section class="self-check-modal-stage">
            <header class="self-check-section-head">
              <div>
                <span class="self-check-kicker">{{ t('memorisation.ayah_display') }}</span>
                <strong class="self-check-section-title">{{ t('memorisation.recite_from_memory') }}</strong>
              </div>
              <div class="self-check-header-tools" :aria-label="t('memorisation.a11y.ayahTools')">
                <button
                  class="self-check-toolbar-btn self-check-toolbar-btn-icon-only self-check-ai-recite-btn"
                  type="button"
                  @click.stop="toggleRecitationCheckForCurrentModal"
                  :disabled="isSelfCheckRecording || recitationCheckPreparing || !supportsSelfCheckRecording()"
                  :class="{ active: recitationCheckRecording || recitationCheckPreparing || !!recitationCheckResult, recording: recitationCheckRecording }"
                  :title="recitationCheckRecording ? 'Stop AI recitation check' : t('memorisation.reading.aiRecite')"
                  :aria-label="recitationCheckRecording ? 'Stop AI recitation check' : t('memorisation.reading.aiRecite')"
                >
                  <i class="bi" :class="recitationCheckRecording ? 'bi-stop-circle-fill' : 'bi-stars'" aria-hidden="true"></i>
                </button>
                <button class="self-check-toolbar-btn self-check-toolbar-btn-text self-check-ayah-action-tajweed" type="button"
                  @click.stop="toggleSelfCheckTajweed"
                  :class="{ active: selfCheckTajweedEnabled }"
                  :aria-pressed="selfCheckTajweedEnabled ? 'true' : 'false'"
                  :title="selfCheckTajweedEnabled ? 'Hide Tajweed highlights' : 'Show Tajweed highlights'"
                  :aria-label="t('memorisation.a11y.toggleTajweedHighlights')">
                  <i class="bi bi-highlighter" aria-hidden="true"></i>
                  <span>{{ t('common.tajweed') }}</span>
                </button>
                <button class="self-check-toolbar-btn self-check-ayah-action-manual" type="button"
                  @click.stop="toggleManualSelfCheckRecording(selfCheckModalVerse)"
                  :disabled="recitationCheckRecording || recitationCheckPreparing"
                  :class="{ recording: isSelfCheckRecording }"
                  :title="isSelfCheckRecording ? 'Stop manual recording' : 'Start manual recording'"
                  :aria-label="t('memorisation.a11y.manualRecording')">
                  <i class="bi" :class="isSelfCheckRecording ? 'bi-stop-circle' : 'bi-mic-fill'"></i>
                  <span>{{ isSelfCheckRecording ? 'Stop Manual' : 'Manual' }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button"
                  @click.stop="resetDisplayedRecitationAyah"
                  :disabled="recitationCheckRecording || recitationCheckPreparing"
                  title="Reset displayed ayah review" aria-label="Reset displayed ayah review">
                  <i class="bi bi-arrow-counterclockwise"></i>
                  <span>{{ t('common.reset') }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button"
                  @click.stop="toggleSelfCheckAyahPlayback(selfCheckModalVerse)"
                  :title="activeSelfCheckAyahPlaybackKey === selfCheckModalVerse.key ? 'Pause ayah' : 'Play ayah once'"
                  :aria-label="t('memorisation.a11y.playAyahOnce')">
                  <i class="bi"
                    :class="activeSelfCheckAyahPlaybackKey === selfCheckModalVerse.key ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                  <span>{{ activeSelfCheckAyahPlaybackKey === selfCheckModalVerse.key ? 'Pause' : 'Play' }}</span>
                </button>
              </div>
            </header>

            <div v-if="selfCheckBlurEnabled && !recitationCheckVisible" class="technique-peek-hint" @mousedown="startSelfCheckPeek"
              @mouseup="stopSelfCheckPeek" @mouseleave="stopSelfCheckPeek" @touchstart.prevent="startSelfCheckPeek"
              @touchend="stopSelfCheckPeek" @touchcancel="stopSelfCheckPeek">
              <i class="bi bi-hand-index"></i>
              <span>{{ t('memorisation.press_and_hold_the_ayah_below_to_peek_release_to_h') }}</span>
            </div>

            <div class="self-check-modal-ayah-shell"
              :class="{ 'is-blurred': selfCheckBlurEnabled && !selfCheckPeekActive && !recitationCheckVisible, 'is-peekable': selfCheckBlurEnabled && !recitationCheckVisible }"
              @mousedown="startSelfCheckPeek" @mouseup="stopSelfCheckPeek" @mouseleave="stopSelfCheckPeek"
              @touchstart.prevent="startSelfCheckPeek" @touchend="stopSelfCheckPeek" @touchcancel="stopSelfCheckPeek">
		              <div class="self-check-modal-ayah" dir="rtl" lang="ar" :style="getSelfCheckAyahDisplayStyle()"
		              :class="{
		                'tajweed-enabled': selfCheckTajweedEnabled,
		                'self-check-session-ayat': recitationCheckScope === 'session' && recitationCheckPendingTargets.length > 1,
		                'recitation-word-review-active': selfCheckModalVerse && shouldShowRecitationReviewHighlights(selfCheckModalVerse.key)
		              }"
		                v-html="getSelfCheckDisplayArabic(selfCheckModalVerse)"></div>
		            </div>

            <div
              v-if="recitationStartCueActive && (recitationCheckRecording || isSelfCheckRecording)"
              class="recitation-start-cue"
              role="status"
              aria-live="polite"
            >
              <i class="bi bi-mic-fill" aria-hidden="true"></i>
              <span>{{ t('memorisation.start_reciting_prompt') }}</span>
            </div>
		          </section>

          <section v-if="selfCheckReviewVisible" ref="selfCheckReviewSection" class="self-check-modal-recorder-grid self-check-assessment-section"
            :class="{ 'saved-attempts-open': selfCheckSavedAttemptsVisible }">
            <article class="self-check-recorder-card self-check-assessment-card"
              :class="{ recording: isSelfCheckRecording, reviewing: !!selfCheckActiveDraft }">
              <div class="self-check-recorder-head self-check-assessment-head">
                <div class="self-check-assessment-copy">
                  <span class="self-check-kicker">{{ t('memorisation.recitation_review') }}</span>
                  <strong>{{ recitationCheckRecording ? t('memorisation.selfCheckRecorder.aiListening') : selfCheckActiveDraft ? t('memorisation.selfCheckRecorder.reviewHeading') : t('memorisation.selfCheckRecorder.assessmentHeading') }}</strong>
                  <p class="self-check-card-desc">{{ getSelfCheckRecorderDescription() }}</p>
                </div>
              </div>

              <div v-if="selfCheckError && selfCheckVerseKey === selfCheckModalVerse.key"
                class="self-check-status self-check-status-warning">
                <i class="bi bi-exclamation-triangle"></i>
                <span>{{ selfCheckError }}</span>
              </div>

              <div v-if="!supportsSelfCheckRecording()" class="self-check-status self-check-status-warning">
                <i class="bi bi-mic-mute"></i>
                <span>{{ t('memorisation.recording_is_not_available_in_this_browser') }}</span>
              </div>

              <section v-if="recitationCheckVisible" class="recitation-check-panel recitation-check-panel-inline"
                aria-live="polite">
                <div class="recitation-check-head">
                  <div class="recitation-check-head-actions">
                    <button v-if="recitationCheckResult && !recitationCheckRecording && !recitationCheckPreparing"
                      class="recitation-result-close" type="button" @click="dismissRecitationCheckResult"
                      aria-label="Close Recite Check results">
                      <i class="bi bi-x-lg"></i>
                    </button>
                    <button v-if="recitationCheckResult && !recitationCheckRecording && !recitationCheckPreparing"
                      class="recitation-result-reset" type="button" @click="resetDisplayedRecitationAyah"
                      title="Reset displayed ayah review" aria-label="Reset displayed ayah review">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                  </div>
                </div>
                <div v-if="recitationCheckRecording" class="recitation-check-status">
                  <i class="bi bi-record-circle" aria-hidden="true"></i>
                  <span>{{ getAiRecitationLiveGuidance(recitationLiveWords) }}</span>
                </div>
                <div v-if="recitationCheckRecording" class="recitation-live-review recitation-live-review-compact"
                  aria-label="Live recitation word check">
                  <div class="recitation-live-head">
	                    <span>{{ recitationLiveSummary }}</span>
	                    <strong>{{ recitationCheckRecording ? 'Live' : 'Ready' }}</strong>
	                  </div>
	                  <div class="recitation-word-stream recitation-live-word-stream" dir="rtl">
	                    <span v-for="word in getVisibleRecitationLiveWords()" :key="word.key"
	                      class="recitation-word-chip word-live" :class="`word-${word.visualStatus || word.status || 'notAttempted'}`"
                        data-live-kind="recitation" :data-live-word-index="word.index" :title="word.note">
	                      {{ word.text }}
	                    </span>
                  </div>
                </div>
                <div v-if="recitationCheckRecording" class="recitation-check-actions">
                  <button class="btn-primary self-check-action-btn" type="button" @click="stopRecitationCheckRecording">
                    <i class="bi bi-stop-circle"></i>
                    <span>{{ t('memorisation.stop_check') }}</span>
                  </button>
                </div>
                <div v-else-if="recitationCheckPreparing" class="recitation-check-status">
                  <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
                  <span>{{ t('memorisation.checking_the_recording') }}</span>
                </div>
                <div v-if="recitationCheckError" class="recitation-check-error">
                  {{ recitationCheckError }}
                </div>
                <div v-if="!recitationCheckRecording && !recitationCheckPreparing && !recitationCheckResult && !recitationCheckError"
                  class="recitation-check-idle">
                  <div class="recitation-check-idle-copy">
                    <strong>{{ recitationCheckScope === 'session' ? 'Ready for the selected range.' : 'Ready for this ayah.' }}</strong>
                    <p>{{ t('memorisation.use_the_ai_recite_tool_in_the_header_when_you_want') }}</p>
                  </div>
                </div>
                <div v-if="recitationCheckResult" class="recitation-check-body recitation-check-results shared-result-flow transition-all duration-300">
                  <section class="shared-result-section shared-result-section--summary transition-all duration-300">
                    <div class="shared-result-section-head">
                      <span class="recitation-check-section-label">
                        <span class="shared-result-step-badge">1</span>
                        <i class="bi bi-check2-circle" aria-hidden="true"></i>
                        {{ getUnifiedResultSectionLabel('summary') }}
                      </span>
                      <strong>{{ getRecitationResultHeadline(recitationCheckResult) }}</strong>
                    </div>
                    <div class="recitation-result-stats">
                      <article v-for="stat in getRecitationResultStats(recitationCheckResult)" :key="stat.key"
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
                      <p>{{ getRecitationWordsReviewSummary(recitationCheckResult) }}</p>
                    </div>
                    <div v-if="getRecitationReviewArabic(recitationCheckResult, selfCheckModalVerse)"
                      class="recitation-review-ayah shared-result-ayah" dir="rtl"
                      v-html="getRecitationReviewArabic(recitationCheckResult, selfCheckModalVerse)"
                      @click="handleRecitationReviewWordClick($event, recitationCheckResult)"></div>
                    <div class="shared-result-word-review transition-all duration-300">
                      <div v-if="getRecitationWordsToReview(recitationCheckResult).length" class="shared-result-word-review-list" dir="rtl">
                        <span v-for="word in getRecitationWordsToReview(recitationCheckResult)" :key="`recitation-review-${word.index}`"
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
                        <strong>{{ getRecitationRecommendationDisplay(recitationCheckResult) }}</strong>
                        <p>{{ getRecitationNextStep(recitationCheckResult) }}</p>
                      </div>
                    </section>
                    <section class="shared-result-section shared-result-section--support shared-result-section--recording transition-all duration-300">
                      <div class="shared-result-section-head">
                        <span class="recitation-check-section-label">
                          <span class="shared-result-step-badge">4</span>
                          <i class="bi bi-play-circle" aria-hidden="true"></i>
                          {{ getUnifiedResultSectionLabel('recording') }}
                        </span>
                        <strong :class="getRecitationValidationTone(recitationCheckResult)">{{ getRecitationValidationLabel(recitationCheckResult) }}</strong>
                        <p>{{ getRecitationValidationSummary(recitationCheckResult) }}</p>
                      </div>
                      <div v-if="recitationCheckResult.audioSrc" class="self-check-audio-player shared-result-audio-player shared-result-audio-player--compact">
                        <button class="self-check-audio-player-btn" type="button"
                          @click="toggleReviewResultAudio(recitationCheckResult)"
                          :aria-label="reviewResultAudioPlaying ? 'Pause playback' : 'Replay recitation'">
                          <i class="bi" :class="reviewResultAudioPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                        </button>
                        <div class="self-check-audio-player-track">
                          <div class="self-check-audio-player-waveform">
                            <input class="self-check-audio-player-seek" type="range" min="0"
                              :max="reviewResultAudioDuration || 0" step="0.01" :value="reviewResultAudioCurrentTime"
                              @input="seekReviewResultAudio" :aria-label="getUnifiedResultSectionLabel('recording')" />
                          </div>
                          <div class="self-check-audio-player-times">
                            <span>{{ formatSelfCheckDraftAudioTime(reviewResultAudioCurrentTime) }}</span>
                            <span>{{ formatSelfCheckDraftAudioTime(reviewResultAudioDuration || recitationCheckResult.durationSeconds) }}</span>
                          </div>
                        </div>
                      </div>
                      <p v-else class="shared-result-recording-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ getRecitationValidationSummary(recitationCheckResult) }}</span></p>
                    </section>
                  </div>
                  <div class="recitation-check-footnotes">
                    <div v-if="selfCheckLastSavedAyahKey === selfCheckModalVerse.key"
                      class="self-check-status self-check-status-success recitation-check-footnote recitation-saved-footnote">
                      <div class="recitation-saved-footnote-copy">
                        <i class="bi bi-check2-circle"></i>
                        <span>{{ t('memorisation.saved_to_your_recordings_library_for_this_ayah') }}</span>
                      </div>
                      <button class="banner-action recitation-saved-footnote-action" type="button"
                        @click="openRecordingsLibraryFromSelfCheck">
                        {{ t('memorisation.go_to_recording_library') }}
                      </button>
                    </div>
                    <div class="self-check-status self-check-status-warning ai-recitation-disclaimer recitation-check-footnote">
                      <i class="bi bi-info-circle"></i>
                      <span>{{ t('memorisation.ai_recitation_feedback_is_a_guide_verify_important') }}</span>
                    </div>
                  </div>
                  <div class="recitation-result-actions recitation-result-actions-compact recitation-result-actions-compact-clean">
                    <button class="btn-primary self-check-action-btn" type="button" @click="savePendingRecitationCheckAttempt">
                      <i class="bi bi-save2"></i>
                      <span>{{ t('memorisation.save_attempt') }}</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn" type="button" @click="resetDisplayedRecitationAyah">
                      <i class="bi bi-arrow-counterclockwise"></i>
                      <span>{{ t('memorisation.aiCheck.tryAgain') }}</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn" type="button" @click="discardRecitationCheckAttempt">
                      <i class="bi bi-x-circle"></i>
                      <span>{{ t('common.discard') }}</span>
                    </button>
                  </div>
                </div>
              </section>

              <div v-else-if="isSelfCheckRecording" class="self-check-live-card self-check-assessment-live">
                <div class="self-check-live-stage">
                  <div class="self-check-live-copy">
                    <strong>{{ t('memorisation.recording_now') }}</strong>
                    <span>{{ getSelfCheckLiveDurationLabel() }} elapsed · speak clearly, then tap stop when finished</span>
                  </div>
                  <div class="self-check-live-pulse" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div class="self-check-live-actions self-check-assessment-actions">
                  <button class="btn-secondary self-check-action-btn" type="button" @click="discardSelfCheckRecording">
                    <i class="bi bi-x-circle"></i>
                    <span>{{ t('common.discard') }}</span>
                  </button>
                  <button class="btn-primary self-check-action-btn" type="button" @click="stopSelfCheckRecording">
                    <i class="bi bi-stop-circle"></i>
                    <span>{{ t('memorisation.stop_recording') }}</span>
                  </button>
                </div>
              </div>

              <div v-else-if="selfCheckPreparing" class="self-check-status self-check-status-info self-check-assessment-status">
                <i class="bi bi-hourglass-split"></i>
                <span>{{ selfCheckPreparingLabel }}</span>
              </div>

              <div v-else-if="selfCheckActiveDraft" class="self-check-review-card self-check-assessment-review">
                <div class="self-check-review-head self-check-assessment-review-head">
                  <div class="self-check-assessment-review-copy">
                    <span class="self-check-kicker">{{ t('memorisation.self_rating') }}</span>
                    <strong>{{ t('memorisation.review_this_attempt') }}</strong>
                    <span>{{ formatRecordingDate(selfCheckActiveDraft.recordedAt) }} · {{ formatRecordingDuration(selfCheckActiveDraft.durationSeconds) }}</span>
                  </div>
                </div>

                <div class="self-check-audio-player" v-if="selfCheckActiveDraft.audioSrc">
                  <audio
                    ref="selfCheckDraftAudio"
                    :src="selfCheckActiveDraft.audioSrc"
                    preload="metadata"
                    @loadedmetadata="onSelfCheckDraftAudioLoadedMetadata"
                    @timeupdate="onSelfCheckDraftAudioTimeUpdate"
                    @ended="onSelfCheckDraftAudioEnded"
                    @play="selfCheckDraftAudioPlaying = true"
                    @pause="selfCheckDraftAudioPlaying = false"
                  ></audio>
                  <button
                    type="button"
                    class="self-check-audio-player-btn"
                    @click="toggleSelfCheckDraftAudio"
                    :aria-label="selfCheckDraftAudioPlaying ? 'Pause playback' : 'Play playback'"
                  >
                    <i class="bi" :class="selfCheckDraftAudioPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                  </button>
                  <div class="self-check-audio-player-track">
                    <div class="self-check-audio-player-waveform">
                      <input
                        type="range"
                        class="self-check-audio-player-seek"
                        min="0"
                        :max="selfCheckDraftAudioDuration || 0"
                        step="0.1"
                        :value="selfCheckDraftAudioCurrentTime"
                        @input="seekSelfCheckDraftAudio"
                      />
                    </div>
                    <div class="self-check-audio-player-times">
                      <span>{{ formatSelfCheckDraftAudioTime(selfCheckDraftAudioCurrentTime) }}</span>
                      <span>{{ formatSelfCheckDraftAudioTime(selfCheckDraftAudioDuration || selfCheckActiveDraft.durationSeconds) }}</span>
                    </div>
                  </div>
                </div>

                <div class="self-check-result-block self-check-assessment-ratings">
                  <p class="self-check-result-prompt">{{ t('memorisation.self_rating_prompt') }}</p>
                  <div class="self-check-rating-grid self-check-assessment-rating-grid" role="group" :aria-label="t('memorisation.self_rating')">
                    <button
                      v-for="option in selfCheckRatingOptions"
                      :key="option.key"
                      type="button"
                      class="self-check-rating-card"
                      :class="[option.tone, { active: selfCheckSelectedRating === option.key }]"
                      :title="getSelfCheckResultHint(option.key)"
                      :aria-pressed="selfCheckSelectedRating === option.key ? 'true' : 'false'"
                      @click="setSelfCheckDraftResult(option.key)"
                    >
                      <span class="self-check-rating-card-icon" aria-hidden="true">
                        <i class="bi" :class="option.icon"></i>
                      </span>
                      <span class="self-check-rating-card-label">{{ getSelfCheckResultLabel(option.key) }}</span>
                      <span class="self-check-rating-card-hint">{{ getSelfCheckResultHint(option.key) }}</span>
                      <span v-if="selfCheckSelectedRating === option.key" class="self-check-rating-card-check" aria-hidden="true">
                        <i class="bi bi-check-lg"></i>
                      </span>
                    </button>
                  </div>
                </div>

                <div class="self-check-review-actions self-check-assessment-actions">
                  <button class="btn-secondary self-check-action-btn" type="button" @click="discardSelfCheckRecording">
                    <i class="bi bi-trash3"></i>
                    <span>{{ t('common.discard') }}</span>
                  </button>
                  <button class="btn-secondary self-check-action-btn" type="button"
                    @click="restartSelfCheckRecording(selfCheckModalVerse)">
                    <i class="bi bi-arrow-repeat"></i>
                    <span>{{ t('memorisation.record_again') }}</span>
                  </button>
                  <button class="btn-primary self-check-action-btn" type="button"
                    @click="saveSelfCheckRecording(selfCheckModalVerse)">
                    <i class="bi bi-save2"></i>
                    <span>{{ t('memorisation.save_attempt') }}</span>
                  </button>
                </div>
              </div>

              <div v-else class="self-check-assessment-idle">
                <span class="self-check-assessment-idle-pill"><i class="bi bi-stars" aria-hidden="true"></i>AI review</span>
                <span class="self-check-assessment-idle-pill"><i class="bi bi-mic" aria-hidden="true"></i>Manual recording</span>
              </div>

            </article>

          </section>
        </div>
      </div>
      </div>
    </div>

    <div v-if="showRecordingsLibrary" class="modal-overlay mutqin-modal-overlay recordings-library-overlay"
      @click.self="closeRecordingsLibrary">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--full">
      <div class="modal-content mutqin-modal-surface recordings-library-modal" role="dialog" aria-modal="true"
        aria-labelledby="recordingsLibraryTitle">
        <div class="modal-header recordings-library-header">
          <div class="recordings-library-head-copy">
            <h2 id="recordingsLibraryTitle">{{ t('memorisation.recordings_library') }}</h2>
            <div class="recordings-library-hierarchy">
              <span>{{ currentChapter?.name_simple || 'Saved session' }}</span>
              <span>{{ rangeStart }}-{{ rangeEnd }}</span>
              <span v-if="selectedRecordingsAyahGroup">Ayah {{ selectedRecordingsAyahGroup.ayahNumber }}</span>
              <span v-if="selectedRecordingsEntry">{{ getRecordingAttemptLabel(selectedRecordingsEntry) }}</span>
            </div>
          </div>
          <div class="recordings-library-header-actions">
            <button v-if="recordingsLibraryReturnToSelfCheckKey" class="recordings-library-back-btn" type="button"
              @click="backToSelfCheckFromLibrary" aria-label="Back to self-check">
              <i class="bi bi-arrow-left"></i>
              <span>{{ t('memorisation.back_to_self_check') }}</span>
            </button>
            <button class="modal-close-btn" @click="closeRecordingsLibrary" aria-label="Close recordings library">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div class="modal-body recordings-library-body">
          <div v-if="isRecordingsLibraryLoading" class="recordings-library-loading">
            <i class="bi bi-hourglass-split"></i>
            <span>{{ t('memorisation.loading_recordings') }}</span>
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
                  <strong>{{ currentChapter?.name_simple || 'Session recordings' }}</strong>
                  <div class="recordings-library-nav-meta">
                    <span>Range {{ rangeStart }}-{{ rangeEnd }}</span>
                    <span>{{ filteredRecordingsList.length }} recording{{ filteredRecordingsList.length === 1 ? '' : 's' }}</span>
                  </div>
                </div>
                <button class="recordings-library-nav-toggle" type="button" @click="toggleRecordingsNav"
                  :aria-expanded="recordingsNavExpanded ? 'true' : 'false'">
                  <span>{{ recordingsNavExpanded ? 'Hide list' : 'Show list' }}</span>
                  <i class="bi" :class="recordingsNavExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                </button>
              </div>

              <div class="recordings-library-search">
                <label class="recordings-library-search-field">
                  <i class="bi bi-search" aria-hidden="true"></i>
                  <input v-model.trim="recordingsLibrarySearch" type="search" placeholder="Search surah or ayah number"
                    aria-label="Search recorded ayahs">
                </label>
              </div>

              <div v-show="recordingsNavExpanded" class="recordings-library-nav-scroll">
                <div v-for="surahGroup in filteredRecordingsAyahGroups"
                  :key="surahGroup.chapterId || surahGroup.chapterName" class="recordings-library-surah-group">
                  <div class="recordings-library-surah-title">{{ surahGroup.chapterName }}</div>
                  <div class="recordings-library-recordings">
                    <template v-for="ayahGroup in surahGroup.ayahs" :key="ayahGroup.ayahKey">
                      <button v-for="recording in ayahGroup.recordings" :key="recording.id" type="button"
                        class="recordings-library-recording-item"
                        :class="{ active: recording.id === selectedRecordingsEntryId, playing: recording.id === activeRecordingPlaybackId }"
                        @click="selectRecordingsEntry(recording)">
                        <span class="recordings-library-recording-title">{{ getRecordingAttemptLabel(recording) }}</span>
                        <span class="recordings-library-recording-meta">
                          Ayah {{ ayahGroup.ayahNumber }} · {{ formatRecordingDate(recording.recordedAt) }}
                        </span>
                      </button>
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
                    <span>Ayah {{ selectedRecordingsAyahGroup.ayahNumber }}</span>
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
                        isAiCheckRecording(selectedRecordingsEntry) ? `${getRecordingTypeLabel(selectedRecordingsEntry)} result` : 'Saved recording' }}</div>
                      <strong v-if="!isAiCheckRecording(selectedRecordingsEntry)">{{ getRecordingAttemptLabel(selectedRecordingsEntry) }}</strong>
                      <div v-if="!isAiCheckRecording(selectedRecordingsEntry)" class="recording-history-inline-meta">
                        <span>{{ formatRecordingTimestamp(selectedRecordingsEntry.recordedAt) }}</span>
                        <span class="recording-result-pill"
                          :class="getRecordingResultTone(selectedRecordingsEntry.result)">
                          {{ getSelfCheckResultLabel(selectedRecordingsEntry.result) }}
                        </span>
                      </div>
                      <span v-else>{{ formatRecordingTimestamp(selectedRecordingsEntry.recordedAt) }}</span>
                      <p v-if="isAiCheckRecording(selectedRecordingsEntry)" class="recording-history-note">{{ isAiCheckRecording(selectedRecordingsEntry) ?
                        `${getRecordingTypeLabel(selectedRecordingsEntry)} result` :
                        `${t('memorisation.self_rating')} · ${getSelfCheckResultLabel(selectedRecordingsEntry.result)}`
                        }}</p>
                    </div>
                  </div>

                  <div v-if="!isAiCheckRecording(selectedRecordingsEntry)" class="recording-history-standard-simple">
                    <p class="recording-history-standard-hint">{{ getSelfCheckResultHint(selectedRecordingsEntry.result) }}</p>
                    <div v-if="selectedRecordingsEntry.audioSrc" class="recording-history-player-compact recording-history-player-compact--surface recording-history-player-compact--simple">
                      <button class="recording-history-player-btn"
                        type="button" @click="toggleRecordingPlayback(selectedRecordingsEntry)"
                        :aria-label="selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'Pause replay' : 'Replay recitation'">
                        <i class="bi"
                          :class="selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                      </button>
                      <div class="recording-history-player-copy">
                        <strong>{{ selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'Playing' : 'Replay recording' }}</strong>
                        <span>{{ formatRecordingDuration(selectedRecordingsEntry.durationSeconds) }}</span>
                      </div>
                    </div>
                    <p v-else class="shared-result-recording-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>No audio is available for replay.</span></p>
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
                        dir="rtl" v-html="getRecitationReviewArabic(selectedRecordingsEntry)"></div>
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
                          <strong>{{ getRecitationRecommendationDisplay(selectedRecordingsEntry) }}</strong>
                          <p>{{ getRecitationNextStep(selectedRecordingsEntry, { saved: true }) }}</p>
                        </div>
                      </section>
                      <section class="shared-result-section shared-result-section--support shared-result-section--recording transition-all duration-300">
                        <div class="shared-result-section-head">
                          <span class="recitation-check-section-label">
                            <span class="shared-result-step-badge">4</span>
                            <i class="bi bi-play-circle" aria-hidden="true"></i>
                            {{ getUnifiedResultSectionLabel('recording') }}
                          </span>
                          <strong :class="getRecitationValidationTone(selectedRecordingsEntry)">{{ getRecitationValidationLabel(selectedRecordingsEntry) }}</strong>
                          <p>{{ getRecitationValidationSummary(selectedRecordingsEntry) }}</p>
                        </div>
                        <div v-if="selectedRecordingsEntry.audioSrc" class="recording-history-player-compact">
                          <button class="recording-history-player-btn"
                            type="button" @click="toggleRecordingPlayback(selectedRecordingsEntry)"
                            :aria-label="selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'Pause replay' : 'Replay recitation'">
                            <i class="bi"
                              :class="selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                          </button>
                          <div class="recording-history-player-copy">
                            <strong>{{ selectedRecordingsEntry.id === activeRecordingPlaybackId ? 'Playing' : 'Replay recitation' }}</strong>
                            <span>{{ formatRecordingDuration(selectedRecordingsEntry.durationSeconds) }}</span>
                          </div>
                        </div>
                        <p v-else class="shared-result-recording-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ getRecitationValidationSummary(selectedRecordingsEntry) }}</span></p>
                      </section>
                    </div>
                  </div>

                  <div class="recording-history-footer"
                    :class="{ 'recording-history-footer--standard': !isAiCheckRecording(selectedRecordingsEntry) }">
                    <div class="recording-history-actions recording-history-actions--utility">
                      <button class="recording-history-utility-link" type="button"
                        @click="openRenameRecordingModal(selectedRecordingsEntry.id)">
                        <i class="bi bi-pencil-square"></i>
                        <span>Rename</span>
                      </button>
                      <button class="recording-history-utility-link recording-history-utility-link-delete" type="button"
                        @click="promptDeleteRecording(selectedRecordingsEntry.id)">
                        <i class="bi bi-trash3"></i>
                        <span>{{ t('common.delete') }}</span>
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

    <div v-if="showPostLoginOnboarding" class="modal-overlay mutqin-modal-overlay post-onboarding-overlay"
      @click.self="!requiresFirstTimeOnboarding && skipOnboarding()">
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
      <div class="modal-content mutqin-modal-surface post-onboarding-modal" role="dialog" aria-modal="true"
        aria-labelledby="postOnboardingTitle">
        <div class="onboarding-hero">
          <span class="onboarding-step-icon" aria-hidden="true">
            <i class="bi" :class="onboardingStepContent.icon"></i>
          </span>
          <div class="onboarding-hero-copy">
            <span class="onboarding-kicker">{{ onboardingStepCounterLabel }}</span>
            <span class="onboarding-step-label">{{ onboardingStepContent.stepLabel }}</span>
            <h2 id="postOnboardingTitle" class="onboarding-title">{{ onboardingStepContent.title }}</h2>
            <p v-if="onboardingStepIndex === 0" class="onboarding-intro">{{ t('memorisation.onboarding.intro') }}</p>
          </div>
          <button
            v-if="!requiresFirstTimeOnboarding"
            class="modal-close-btn onboarding-close-btn"
            @click="skipOnboarding"
            :aria-label="t('common.skipOnboarding')"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div
          class="onboarding-progress"
          role="progressbar"
          :aria-valuenow="onboardingStepIndex + 1"
          aria-valuemin="1"
          :aria-valuemax="onboardingSteps.length"
          :aria-label="onboardingStepCounterLabel"
        >
          <span
            v-for="(step, index) in onboardingSteps"
            :key="step.key"
            class="onboarding-progress-dot"
            :class="{ active: index === onboardingStepIndex, complete: index < onboardingStepIndex }"
          ></span>
        </div>

        <div class="modal-body onboarding-body">
          <p class="onboarding-lead">{{ onboardingStepContent.body }}</p>

          <ul v-if="onboardingStepContent.points.length" class="onboarding-points">
            <li v-for="(point, pointIndex) in onboardingStepContent.points" :key="`${onboardingStepContent.key}-point-${pointIndex}`">
              {{ point }}
            </li>
          </ul>

          <section
            v-if="onboardingStepPreview"
            class="onboarding-preview"
            :aria-label="onboardingStepPreview.title"
          >
            <header class="onboarding-preview-head">
              <strong>{{ onboardingStepPreview.title }}</strong>
              <span>{{ onboardingStepPreview.subtitle }}</span>
            </header>
            <div class="onboarding-preview-grid">
              <div
                v-for="item in onboardingStepPreview.items"
                :key="item.key"
                class="onboarding-preview-item"
              >
                <span class="onboarding-preview-label">{{ item.label }}</span>
                <strong class="onboarding-preview-value">{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <div v-if="onboardingStepContent.choices?.length" class="onboarding-choice-grid">
            <button
              v-for="choice in onboardingStepContent.choices"
              :key="choice.value"
              type="button"
              class="onboarding-choice-card"
              :class="{ active: getOnboardingChoiceValue(onboardingStepContent.choiceKey) === choice.value }"
              @click="setOnboardingChoice(onboardingStepContent.choiceKey, choice.value)"
            >
              <strong>{{ choice.label }}</strong>
              <span>{{ choice.description }}</span>
            </button>
          </div>

          <div
            v-if="requiresFirstTimeOnboarding && onboardingStepIndex === onboardingSteps.length - 1"
            class="onboarding-choice-grid onboarding-finish-choice-grid"
            role="group"
            :aria-label="t('memorisation.onboarding.choices.groupLabel')"
          >
            <button
              type="button"
              class="onboarding-choice-card onboarding-choice-card--recommended"
              :class="{ active: onboardingFinishChoice === 'sample' }"
              @click="selectOnboardingFinishChoice('sample')"
            >
              <span v-if="onboardingFinishChoice === 'sample'" class="onboarding-choice-check" aria-hidden="true">
                <i class="bi bi-check-circle-fill"></i>
              </span>
              <strong>{{ t('memorisation.onboarding.choices.sample.title') }}</strong>
              <span>{{ t('memorisation.onboarding.choices.sample.description') }}</span>
            </button>
            <button
              type="button"
              class="onboarding-choice-card"
              :class="{ active: onboardingFinishChoice === 'setup' }"
              @click="selectOnboardingFinishChoice('setup')"
            >
              <span v-if="onboardingFinishChoice === 'setup'" class="onboarding-choice-check" aria-hidden="true">
                <i class="bi bi-check-circle-fill"></i>
              </span>
              <strong>{{ t('memorisation.onboarding.choices.setup.title') }}</strong>
              <span>{{ t('memorisation.onboarding.choices.setup.description') }}</span>
            </button>
            <button
              type="button"
              class="onboarding-choice-card"
              :class="{ active: onboardingFinishChoice === 'explore' }"
              @click="selectOnboardingFinishChoice('explore')"
            >
              <span v-if="onboardingFinishChoice === 'explore'" class="onboarding-choice-check" aria-hidden="true">
                <i class="bi bi-check-circle-fill"></i>
              </span>
              <strong>{{ t('memorisation.onboarding.choices.explore.title') }}</strong>
              <span>{{ t('memorisation.onboarding.choices.explore.description') }}</span>
            </button>
          </div>
        </div>

        <div class="modal-footer mutqin-modal-footer">
          <div class="mutqin-modal-actions mutqin-modal-actions--end onboarding-nav-actions">
            <button
              v-if="onboardingStepIndex > 0"
              type="button"
              class="mutqin-modal-btn mutqin-modal-btn--secondary"
              @click="prevOnboardingStep"
            >
              <i class="bi bi-arrow-left" aria-hidden="true"></i>
              <span>{{ t('common.back') }}</span>
            </button>
            <button
              v-if="requiresFirstTimeOnboarding && onboardingStepIndex === onboardingSteps.length - 1"
              type="button"
              class="mutqin-modal-btn mutqin-modal-btn--primary"
              :disabled="!onboardingFinishChoice"
              @click="confirmOnboardingFinishChoice"
            >
              <i class="bi bi-check2-circle" aria-hidden="true"></i>
              <span>{{ t('memorisation.onboarding.confirmChoice') }}</span>
            </button>
            <button
              v-else-if="onboardingStepIndex < onboardingSteps.length - 1"
              type="button"
              class="mutqin-modal-btn mutqin-modal-btn--primary"
              @click="nextOnboardingStep"
            >
              <span>{{ t('memorisation.next') }}</span>
              <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </button>
            <button
              v-else-if="onboardingManualLaunch"
              type="button"
              class="mutqin-modal-btn mutqin-modal-btn--primary"
              @click="completeOnboardingAndStart"
            >
              <i class="bi bi-check2-circle" aria-hidden="true"></i>
              <span>{{ t('memorisation.onboarding.finish') }}</span>
            </button>
            <button
              v-else
              type="button"
              class="mutqin-modal-btn mutqin-modal-btn--primary"
              @click="completeOnboardingWithDefaultSession"
            >
              <i class="bi bi-play-circle" aria-hidden="true"></i>
              <span>{{ t('common.startSession') }}</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>

    <transition name="mutqin-flow">
    <div v-if="showPostSessionModal" class="onboarding-post-session-flow mutqin-modal-flow" :class="{ 'onboarding-post-session-flow--sample': onboardingSampleSessionActive }" aria-live="polite">
      <div class="modal-backdrop fade show onboarding-post-session-backdrop"></div>

      <transition name="post-session-confetti-fade">
        <div
          v-if="showPostSessionConfetti"
          class="onboarding-post-session-confetti-layer"
          :class="{ 'onboarding-post-session-confetti-layer--sample': onboardingSampleSessionActive }"
          aria-hidden="true"
        >
          <span
            v-for="piece in postSessionConfettiPieces"
            :key="piece.id"
            :class="piece.className"
            :style="piece.style"
          ></span>
        </div>
      </transition>

      <div
        class="onboarding-post-session-modal-wrap"
        role="dialog"
        aria-modal="true"
        aria-labelledby="postSessionTitle"
      >
        <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
          <div
            class="modal-content mutqin-modal-surface onboarding-post-session-modal"
            :class="{ 'onboarding-post-session-modal--sample': onboardingSampleSessionActive }"
          >
            <div class="post-session-hero" :class="{ 'post-session-hero--sample': onboardingSampleSessionActive }">
              <div class="post-session-hero-main">
                <div class="post-session-hero-illustration" aria-hidden="true">
                  <span class="post-session-illustration-orbit post-session-illustration-orbit--outer"></span>
                  <span class="post-session-illustration-orbit post-session-illustration-orbit--inner"></span>
                  <span class="post-session-illustration-core">
                    <i class="bi bi-check-circle-fill post-session-success-icon"></i>
                  </span>
                  <span class="post-session-illustration-spark post-session-illustration-spark--one">
                    <i class="bi bi-stars"></i>
                  </span>
                  <span class="post-session-illustration-spark post-session-illustration-spark--two">
                    <i class="bi bi-heart-fill"></i>
                  </span>
                </div>
                <div class="post-session-hero-copy">
                  <span class="post-session-kicker" :class="{ 'post-session-kicker--sample': onboardingSampleSessionActive }">
                    {{ postSessionUi.kicker }}
                  </span>
                  <h2 id="postSessionTitle" class="post-session-title">
                    {{ postSessionModalTitle }}
                  </h2>
                  <p v-if="postSessionModalMessage" class="post-session-message">
                    {{ postSessionModalMessage }}
                  </p>
                  <p v-if="postSessionEncouragement" class="emotional-touch emotional-touch--encouragement">
                    {{ postSessionEncouragement }}
                  </p>
                </div>
              </div>
            </div>

            <div class="modal-body post-session-body">
              <p
                v-if="postSessionMilestone"
                class="emotional-touch emotional-touch--milestone"
                role="status"
              >
                {{ postSessionMilestone }}
              </p>

              <p v-if="postSessionAutoSaved && !onboardingSampleSessionActive" class="post-session-autosaved-note" role="status">
                This session was saved automatically, so your completion history is already safe.
              </p>

              <section
                v-if="postSessionNextStep"
                class="post-session-next-step-card"
                :aria-label="t('memorisation.postSession.nextStepLabel')"
              >
                <span class="post-session-next-step-label">{{ t('memorisation.postSession.nextStepLabel') }}</span>
                <p class="post-session-next-step-copy">{{ postSessionNextStep }}</p>
              </section>

              <button
                v-if="postSessionDetailRows.length || postSessionProgress"
                type="button"
                class="post-session-stats-toggle"
                :aria-expanded="postSessionStatsExpanded ? 'true' : 'false'"
                :aria-controls="'postSessionStatsPanel'"
                @click="togglePostSessionStats"
              >
                <span>{{ postSessionStatsExpanded ? t('memorisation.postSession.hideStats') : t('memorisation.postSession.viewStats') }}</span>
                <i class="bi" :class="postSessionStatsExpanded ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
              </button>

              <section
                v-if="postSessionStatsExpanded && (postSessionDetailRows.length || postSessionProgress)"
                id="postSessionStatsPanel"
                class="mutqin-session-summary post-session-stats-panel"
                :aria-label="t('memorisation.postSession.summaryTitle')"
              >
                <div
                  v-if="postSessionProgress"
                  class="mutqin-session-summary-progress"
                  role="progressbar"
                  :aria-valuenow="postSessionProgress.percentComplete"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="postSessionProgress.label"
                >
                  <div class="mutqin-session-summary-progress-meta">
                    <span>{{ postSessionProgress.label }}</span>
                    <span>{{ postSessionProgress.percentComplete }}%</span>
                  </div>
                  <div class="mutqin-session-summary-progress-track">
                    <span
                      class="mutqin-session-summary-progress-fill"
                      :style="{ width: `${postSessionProgress.percentComplete}%` }"
                    ></span>
                  </div>
                  <p v-if="postSessionProgress.detail" class="mutqin-session-summary-progress-detail">
                    {{ postSessionProgress.detail }}
                  </p>
                </div>

                <div
                  v-if="postSessionDetailRows.length"
                  class="mutqin-session-summary-details"
                  :aria-label="t('memorisation.postSession.detailsLabel')"
                >
                  <div
                    v-for="row in postSessionDetailRows"
                    :key="row.key"
                    class="mutqin-session-summary-row"
                  >
                    <span class="mutqin-session-summary-row-label">{{ row.label }}</span>
                    <span class="mutqin-session-summary-row-value">
                      {{ row.value }}
                      <small v-if="row.hint">{{ row.hint }}</small>
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <div class="modal-footer mutqin-modal-footer">
              <div class="mutqin-modal-actions mutqin-modal-actions--3">
                <template v-if="onboardingSampleSessionActive">
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="repeatPostSession">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                    <span>{{ postSessionUi.repeat }}</span>
                  </button>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="openPostSessionNewSessionOffcanvas">
                    <i class="bi bi-plus-circle" aria-hidden="true"></i>
                    <span>{{ postSessionUi.newSession }}</span>
                  </button>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="continueFromOnboardingPostSession">
                    <i class="bi bi-mortarboard" aria-hidden="true"></i>
                    <span>{{ t('memorisation.onboarding.finish') }}</span>
                  </button>
                </template>
                <template v-else>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--primary" @click="openPostSessionNewSessionOffcanvas">
                    <i class="bi bi-plus-circle" aria-hidden="true"></i>
                    <span>Start next session</span>
                  </button>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--secondary" @click="repeatPostSession">
                    <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                    <span>Repeat this session</span>
                  </button>
                  <button type="button" class="mutqin-modal-btn mutqin-modal-btn--ghost" @click="togglePostSessionStats">
                    <i class="bi" :class="postSessionStatsExpanded ? 'bi-chevron-up' : 'bi-bar-chart-line'" aria-hidden="true"></i>
                    <span>{{ postSessionStatsExpanded ? 'Hide session summary' : 'View session summary' }}</span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </transition>

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
      @close="closeHifzPlanModal"
      @saved="handleHifzPlanSaved"
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
          :class="{ 'is-talqin-only': playerDockShowsTalqinOnly, 'is-unified': talqinRecitationTurnActive && playerVisible }"
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
          v-if="playerVisible"
          class="player-bar"
          :class="{ compact: playerCompact, 'is-playing': isPlaying, 'has-talqin-strip': talqinRecitationTurnActive }"
          role="region"
          :aria-label="t('memorisation.player.audioPlayer')"
        >
          <div class="player-accent" aria-hidden="true"></div>

          <div v-if="!playerCompact" class="player-main">
            <div class="player-info">
              <div class="player-chapter">{{ currentChapter?.name_simple || t('memorisation.player.quranFallback') }}</div>
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

    <!-- Audio System -->
    <audio ref="audio" style="display:none"></audio>
    <audio ref="recordingsAudio" style="display:none"></audio>
    <audio ref="reviewResultAudio" style="display:none"
      @loadedmetadata="onReviewResultAudioLoadedMetadata"
      @timeupdate="onReviewResultAudioTimeUpdate"
      @play="reviewResultAudioPlaying = true"
      @pause="reviewResultAudioPlaying = false"
      @ended="onReviewResultAudioEnded"></audio>

    <div v-if="showQuranSearchModal" class="quran-search-modal-backdrop" role="presentation"
      @click.self="closeQuranSearchModal">
      <section class="quran-search-modal" role="dialog" aria-modal="true" aria-label="Quran search">
        <header class="quran-search-header">
          <div></div>
          <button class="quran-search-close pill-control" type="button" @click="closeQuranSearchModal"
            aria-label="Close Quran search">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="quran-search-input-row">
          <label class="quran-search-input-shell" for="quranSearchInput">
            <i class="bi bi-search" aria-hidden="true"></i>
            <input id="quranSearchInput" ref="quranSearchInput" v-model.trim="quranSearchQuery" type="search"
              dir="auto" placeholder="Type at least 3 words in Arabic or English"
              @keydown.enter.prevent="runQuranSearch" />
          </label>
          <button class="pill-control quran-search-voice" :class="{ active: quranSearchVoiceActive }" type="button"
            @click="toggleQuranVoiceSearch" :disabled="!supportsQuranVoiceSearch"
            :title="supportsQuranVoiceSearch ? 'Voice search' : 'Voice search is not supported in this browser'">
            <i class="bi" :class="quranSearchVoiceActive ? 'bi-mic-fill' : 'bi-mic'" aria-hidden="true"></i>
            <span>{{ quranSearchVoiceActive ? 'Listening' : 'Voice' }}</span>
          </button>
          <button class="pill-control quran-search-submit" type="button" @click="runQuranSearch"
            :disabled="quranSearchLoading || quranSearchWordCount < 3">
            <i class="bi bi-arrow-return-left" aria-hidden="true"></i>
            <span>{{ quranSearchLoading ? 'Searching' : 'Search' }}</span>
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
                  {{ chapter.name_simple }}
                </option>
              </select>
            </label>
          </div>
          <div class="quran-search-pill-row" aria-label="Search display options">
            <button class="pill-control" :class="{ active: quranSearchShowTranslation }" type="button"
              @click="quranSearchShowTranslation = !quranSearchShowTranslation">
              <i class="bi bi-translate" aria-hidden="true"></i>
              <span>{{ quranSearchShowTranslation ? 'Translation on' : 'Translation off' }}</span>
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
            <strong>{{ filteredQuranSearchResults.length }} ayah{{ filteredQuranSearchResults.length === 1 ? '' : 's' }} found</strong>
            <span>{{ quranSearchFilterSummary }}</span>
          </div>
          <article v-for="result in filteredQuranSearchResults" :key="result.key" class="quran-search-result-card">
            <div class="quran-search-result-meta">
              <span>{{ result.surahName }} · Ayah {{ result.ayah }}</span>
              <small>Juz {{ result.juz }} · Hizb {{ result.hizb }} · Page {{ result.page }} · Word {{ result.firstWordIndex || 1 }}</small>
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

  <div v-if="showKeyboardShortcuts" class="modal-overlay mutqin-modal-overlay keyboard-shortcuts-overlay" @click.self="closeKeyboardShortcuts">
    <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog">
    <div
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
        <div class="keyboard-shortcuts-grid">
          <section
            v-for="group in keyboardShortcutGroups"
            :key="group.id"
            class="keyboard-shortcuts-group"
            :aria-labelledby="`keyboardShortcutsGroup-${group.id}`"
          >
            <header class="keyboard-shortcuts-group-header">
              <span class="keyboard-shortcuts-group-icon" aria-hidden="true">
                <i class="bi" :class="group.icon"></i>
              </span>
              <h3 :id="`keyboardShortcutsGroup-${group.id}`">{{ group.title }}</h3>
            </header>
            <ul class="keyboard-shortcuts-list">
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
