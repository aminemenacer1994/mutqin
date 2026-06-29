<template>
  <div class="app" :data-theme="theme" :dir="activeLocale === 'ar' ? 'rtl' : 'ltr'" :class="{ 'is-rtl': activeLocale === 'ar' }" :style="appStyleVars" v-cloak>
    <div v-if="appReady && banner" class="banner" :class="banner.kind" role="status" aria-live="polite">
      <span class="banner-message">{{ banner.message }}</span>
      <div class="banner-actions">
        <button v-if="banner.actionLabel" class="banner-action" @click="runBannerAction">{{ banner.actionLabel
        }}</button>
        <button class="banner-x" @click="banner = null" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="appReady && isLoggedIn" class="main container" :class="{
      'tools-open': showTools,
      'player-visible': playerVisible,
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
              title="Show or hide the English translation" @click="toggleReadingOption('translation')">
              <i class="bi bi-translate"></i><span>Translation</span>
            </button>
            <button class="toolbar-chip" :class="{ active: showTransliteration }" title="Show or hide transliteration"
              @click="toggleReadingOption('transliteration')">
              <i class="bi bi-type"></i><span>Transliteration</span>
            </button>
            <!-- <button class="toolbar-chip" :class="{ active: showWordByWord }" title="Show word-by-word meaning chips"
              @click="toggleReadingOption('wbw')">
              <i class="bi bi-grid-3x2-gap"></i><span>Word by word</span>
            </button> -->
            <!-- <button class="toolbar-chip" :class="{ active: wordByWordAudioEnabled }"
              title="Enable audio for individual word chips" @click="wordByWordAudioEnabled = !wordByWordAudioEnabled">
              <i class="bi bi-volume-up"></i><span>Word audio</span>
            </button> -->

            <!-- ADD TAJWEED PILL HERE -->
            <button class="toolbar-chip" :class="{ active: tajweedEnabled }"
              title="Use connected Tajweed text from the Quran API" @click="toggleTajweed">
              <i class="bi bi-palette"></i><span>Tajweed</span>
            </button>
          </div>

          <div class="reading-toolbar-group">
            <div class="font-dropdown">
              <button class="font-dropdown-trigger" @click="toggleFontDropdown" title="Change Quran font">
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
        <div v-if="!isDataReady" class="loading-spinner" >
          <i class="bi bi-hourglass-split"></i>
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-else class="workspace">
          <!-- In your template, replace the workspace-shell section -->
<section v-if="shouldRenderWorkspaceShell && !isOnboardingExperienceActive" class="workspace-shell" :class="{ collapsed: mainCardCollapsed }" aria-label="Session overview">
  <div class="workspace-shell-head">
    <div class="workspace-shell-copy">
      <span class="workspace-shell-kicker">Session Overview</span>
      <h1 class="workspace-shell-main-title">{{ topCardSessionLabel }}</h1>
      <div v-if="reviewPriorityLabel" v-show="!mainCardCollapsed" class="workspace-shell-compact-meta">
        <span>{{ reviewPriorityLabel }}</span>
      </div>
    </div>
    <div class="workspace-shell-actions">
      <div class="workspace-header-view-controls quick-right-controls" aria-label="View and font controls">
        <button type="button" class="view-mode-switch" :class="{ 'is-mushaf': readingViewMode === 'mushaf' }"
          @click="setReadingViewMode(readingViewMode === 'mushaf' ? 'stacked' : 'mushaf')"
          :aria-pressed="readingViewMode === 'mushaf' ? 'true' : 'false'" aria-label="Toggle mushaf mode">
          <span class="view-mode-switch-label">Stacked</span>
          <span class="view-mode-switch-track" aria-hidden="true">
            <span class="view-mode-switch-thumb">
              <i class="bi" :class="readingViewMode === 'mushaf' ? 'bi-book' : 'bi-view-stacked'"></i>
            </span>
          </span>
          <span class="view-mode-switch-label">Mushaf</span>
        </button>
        <div class="font-dropdown quick-font-dropdown" @click.stop>
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
      <div class="action-buttons-group">
        <button v-if="hasSessionStarted" class="action-btn action-btn-secondary action-btn-exit" type="button"
          @click="openSessionExitModal" title="End session" aria-label="End session">
          <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
          <span>{{ t('sessionStatus.end') }}</span>
        </button>
        <button class="action-btn action-btn-secondary" type="button" @click="openAdvancedControls"
          title="Open session controls" aria-label="Open session controls">
          <i class="bi bi-sliders" aria-hidden="true"></i>
        </button>
        <div class="top-card-menu-wrap" @click.stop>
          <button class="top-card-ellipsis" type="button" @click="toggleTopCardMenu"
            aria-label="Open reading options">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <transition name="dropdown-fade">
            <div v-if="topCardMenuOpen" class="top-card-menu">
              <button type="button" :class="{ active: showTranslation }" @click="toggleReadingOption('translation')">
                <i class="bi bi-translate"></i><span>Translation</span>
              </button>
              <button type="button" :class="{ active: showTransliteration }" @click="toggleReadingOption('transliteration')">
                <i class="bi bi-type"></i><span>Transliteration</span>
              </button>
              <button type="button" :class="{ active: tajweedEnabled }" @click="toggleTajweed">
                <i class="bi bi-palette"></i><span>Tajweed</span>
              </button>
              <!--
                <button type="button" @click="openAdvancedControls">
                  <i class="bi bi-sliders"></i><span>Controls</span>
                </button>
                <button type="button" @click="openRecordingsLibrary">
                  <i class="bi bi-collection-play"></i><span>View Recording</span>
                </button>
                <button type="button" @click="openOnboardingFromTopMenu">
                  <i class="bi bi-compass"></i><span>Onboarding</span>
                </button>
                <button @click="toggleKeyboardShortcuts" type="button">
                  <i class="bi bi-keyboard"></i><span>Keyboard Shortcuts</span>
                </button>
              -->
              <button @click="toggleFullScreen" type="button">
                <i class="bi bi-arrows-fullscreen"></i><span>Full Screen</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick controls - also hidden when session is completed -->
  <div v-if="!isSessionCompleted && hasSessionStarted" v-show="!mainCardCollapsed" class="workspace-quick-controls" aria-label="Quick reading controls">
    <div class="quick-pill-group-list" :class="{ 'quick-pill-group-list-compact': !topCardAppliedPills.length }">
      <div v-if="topCardAppliedPills.length" class="quick-left-pills">
        <div class="workspace-applied-pills" aria-label="Live session settings">
          <span v-for="item in topCardAppliedPills" :key="item.key" class="workspace-applied-pill"
            :class="{ muted: item.muted }">
            <i class="bi" :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Session Complete - Only shows when session is fully done -->
<div v-if="showSessionCompletedState" class="session-complete-wrapper">
  <!-- Status Header -->
  <div class="completion-header">
    <div class="completion-icon">
      <i class="bi bi-check-circle-fill"></i>
    </div>
    <div class="completion-text">
      <h3>{{ sessionCompletionSnapshot?.completedAll ? 'Session Complete' : 'Session Ended' }}</h3>
      <p>{{ sessionCompletionSnapshot?.completedAll ? `You've completed all ${totalVerses} ayahs` : sessionEndedSummaryMessage }}</p>
    </div>
  </div>

  <div v-if="sessionCompletionSnapshot" class="completion-stats">
    <div class="stat-box">
      <span class="stat-number">{{ sessionEndedStats.surah }}</span>
      <span class="stat-label">{{ sessionEndedStats.range }}</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-box">
      <span class="stat-number">{{ sessionEndedStats.progress }}</span>
      <span class="stat-label">Progress</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-box">
      <span class="stat-number">{{ sessionEndedStats.duration }}</span>
      <span class="stat-label">Duration</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-box">
      <span class="stat-number">{{ sessionEndedStats.repeats }}</span>
      <span class="stat-label">Repeats</span>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="completion-actions">
    <button class="action-btn primary" @click="openNewSessionSetup()">
      <i class="bi bi-plus-circle"></i>
      New Session
    </button>
    <button class="action-btn" @click="startSessionWithCountdown">
      <i class="bi bi-arrow-repeat"></i>
      Repeat Range
    </button>
    <button class="action-btn" @click="saveCurrentSessionWithName()">
      <i class="bi bi-save2"></i>
      Save This Session?
    </button>
    <button class="action-btn" @click="continueLastSession()" :disabled="!hasContinueSession">
      <i class="bi bi-play-circle"></i>
      Resume Previous Played Session?
    </button>
  </div>

  <div v-if="sessionCompletionSnapshot" class="completion-meta-grid">
    <article class="completion-meta-card" :class="{ collapsed: isSessionEndedMetaCardCollapsed(card.key) }" v-for="card in sessionEndedMetaCards" :key="card.key">
      <div class="completion-meta-head">
        <span class="completion-meta-kicker">{{ card.kicker }}</span>
        <button class="completion-meta-toggle" type="button" @click="toggleSessionEndedMetaCard(card.key)" :aria-expanded="isSessionEndedMetaCardCollapsed(card.key) ? 'false' : 'true'" :aria-label="`${isSessionEndedMetaCardCollapsed(card.key) ? 'Expand' : 'Collapse'} ${card.kicker}`">
          <i class="bi" :class="isSessionEndedMetaCardCollapsed(card.key) ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
        </button>
      </div>
      <div class="completion-meta-calligraphy" dir="rtl" lang="ar">{{ card.calligraphy }}</div>
      <strong>{{ card.title }}</strong>
      <p v-if="!isSessionEndedMetaCardCollapsed(card.key)">{{ card.body }}</p>
      <ul v-if="!isSessionEndedMetaCardCollapsed(card.key) && card.points && card.points.length" class="completion-meta-points">
        <li v-for="point in card.points" :key="point">{{ point }}</li>
      </ul>
    </article>
  </div>

</div>

          <main v-if="!isOnboardingExperienceActive" id="memorisationWorkspaceMain" ref="workspaceMain" class="workspace-main"
            aria-label="Memorisation workspace">
            <section v-if="!hasVerses" class="workspace-empty-state" aria-label="Session setup">
              <div class="workspace-empty-card">
                <span class="workspace-empty-kicker">Ready to begin</span>
                <h2>Choose a surah and range</h2>
                <p>Use session controls to set up a new range. The main workspace will stay in view once you start.</p>
                <div class="workspace-empty-actions">
                  <button class="action-btn primary" type="button" @click="openNewSessionSetup">
                    Open session setup
                  </button>
                  <button class="action-btn" type="button" @click="openAdvancedControls">
                    Open controls
                  </button>
                </div>
              </div>
            </section>
            <div v-if="!isSessionCompleted && readingViewMode === 'mushaf'" class="mushaf-workspace">
              <div class="mushaf-frame">
                <div class="mushaf-pill-bar mushaf-pill-toolbar">
                  <div class="mushaf-toolbar-cluster mushaf-toolbar-cluster-start">
                    <div class="mushaf-toolbar-dropdown font-dropdown-region">
                      <button @click.stop="fontOpen = !fontOpen; bgOpen = false; borderOpen = false" type="button" class="mushaf-toolbar-trigger"
                        :aria-expanded="fontOpen ? 'true' : 'false'" aria-label="Choose Mushaf text style">
                        <i class="bi bi-type"></i>
                        <span class="mushaf-toolbar-trigger-label">{{ getCurrentFontLabel() }}</span>
                        <i class="bi bi-chevron-down" :class="{ rotated: fontOpen }"></i>
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

                    <div class="mushaf-toolbar-dropdown bg-dropdown-region">
                      <button @click.stop="bgOpen = !bgOpen; fontOpen = false; borderOpen = false" type="button" class="mushaf-toolbar-trigger"
                        :aria-expanded="bgOpen ? 'true' : 'false'" aria-label="Choose Mushaf page theme">
                        <span class="mushaf-toolbar-theme-swatch mushaf-toolbar-trigger-swatch" :class="`theme-${mushafBackground}`"></span>
                        <span class="mushaf-toolbar-trigger-label">Theme</span>
                        <i class="bi bi-chevron-down" :class="{ rotated: bgOpen }"></i>
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
                        :aria-expanded="borderOpen ? 'true' : 'false'" aria-label="Choose Mushaf border style">
                        <i class="bi bi-border-outer"></i>
                        <span class="mushaf-toolbar-trigger-label">Border</span>
                        <i class="bi bi-chevron-down" :class="{ rotated: borderOpen }"></i>
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
                    <button v-if="showAiMemorisationButton" class="mushaf-pill mushaf-ai-pill mushaf-ai-memory" type="button" @click.stop="openAiMemorisationCheckerForVerse(activeVerseRef)"
                      :class="{ active: aiMemorisationCheckerRecording }"
                      :disabled="!activeVerseRef || aiMemorisationCheckerPreparing || !supportsSelfCheckRecording()"
                      :title="activeVerseRef ? 'Hide the ayah and recite from memory' : 'Tap an ayah first'">
                      <i class="bi" :class="aiMemorisationCheckerRecording ? 'bi-stop-circle' : 'bi-eye-slash'"></i>
                      <span class="mushaf-pill-label">{{ aiMemorisationCheckerRecording ? 'Stop' : 'AI Memory' }}</span>
                    </button>

                    <button class="mushaf-pill mushaf-ai-pill mushaf-ai-recite" type="button" @click.stop="openAiRecitationCheckForVerse(activeVerseRef)"
                      :class="{ active: recitationCheckRecording }"
                      :disabled="!activeVerseRef || recitationCheckPreparing || !supportsSelfCheckRecording()"
                      :title="activeVerseRef ? 'Recite this ayah for instant AI feedback' : 'Tap an ayah first'">
                      <i class="bi" :class="recitationCheckRecording ? 'bi-stop-circle' : 'bi-stars'"></i>
                      <span class="mushaf-pill-label">{{ recitationCheckRecording ? 'Stop' : 'AI Recite' }}</span>
                    </button>

                    <button type="button" class="mushaf-pill mushaf-controls-pill" @click="openAdvancedControls" aria-label="Open controls" title="Session controls">
                      <i class="bi bi-sliders2"></i>
                    </button>
                  </div>
                </div>
                <div ref="mushafViewport" class="mushaf-viewport" :class="[`mushaf-bg-${mushafBackground}`]">
                  <div v-if="!mushafPages.length" class="mushaf-empty-page">
                    <i class="bi bi-book"></i>
                    <strong>Mushaf page is preparing</strong>
                    <span>Ayahs are loaded, but the mushaf page list has not synced yet. Switch back to Stacked or
                      reopen this session.</span>
                  </div>
                  <div class="mushaf-track" :style="mushafTrackStyle">
                    <article v-for="(page, pageIndex) in mushafPages" :key="page.id" class="mushaf-page"
                      :class="[`mushaf-bg-${mushafBackground}`, `mushaf-border-${mushafBorder}`, { active: pageIndex === safeMushafPageIndex }]"
                      :aria-hidden="pageIndex === safeMushafPageIndex ? 'false' : 'true'">
                      <header class="mushaf-page-header" dir="rtl">
                        <h2>{{ mushafSurahTitle }}</h2>
                        <div v-if="showMushafBismillah" class="mushaf-bismillah" aria-label="Bismillah">
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </div>
                      </header>
                      <div class="mushaf-page-body" dir="rtl">
                        <span v-for="verse in page.verses" :key="verse.key" role="button" tabindex="0"
                          :data-verse-key="verse.key" class="mushaf-ayah" :class="{
                            active: isVerseVisuallyActive(verse.key),
                            'hifz-ayah-new': isNewHifzAyah(verse.key),
                            'hifz-ayah-due': isDueHifzAyah(verse.key),
                            'hifz-ayah-weak': isWeakAyah(verse.key),
                            'hifz-ayah-mastered': isMasteredAyah(verse.key),
                            'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key),
                            'peek-revealed': isVersePeekRevealed(verse.key),
                            'review-priority': isReviewPriorityAyah(verse.key),
                            'is-playing': activeVerseKey === verse.key && isPlaying
                          }" @click="onMushafAyahClick(verse)" @mouseenter="onMushafAyahEnter(verse)"
                          @mouseleave="onMushafAyahLeave(verse)" @keydown.enter.prevent="onMushafAyahClick(verse)"
                          @keydown.space.prevent="onMushafAyahClick(verse)"
                          @touchstart.passive="onVerseTouchStart($event, verse.key)"
                          @touchmove.passive="clearTouchPeek"
                          @touchend.passive="onVerseTouchEnd($event, verse.key)" @touchcancel.passive="clearTouchPeek">
                          <span class="mushaf-ayah-text" dir="rtl" lang="ar" v-html="getDisplayArabic(verse)" :class="{
                            'tajweed-enabled': tajweedEnabled,
                            'word-highlight-enabled': true,
                            'verse-weak': isWeakAyah(verse.key),
                            'verse-mastered': isMasteredAyah(verse.key)
                          }" :style="{
                              '--verse-font-percent': getVerseFontSize(verse.key),
                              'font-family': quranFontFamily
                            }"></span>
                          <span class="mushaf-ayah-number"
                            :class="[`mushaf-ayah-number-digits-${Math.min(3, String(verse.number || '').length || 1)}`]"
                            :style="getMushafAyahNumberStyle(verse.number)">{{ verse.number }}</span>
                        </span>
                      </div>
                      <footer class="mushaf-page-footer">
                        <span class="mushaf-page-folio">{{ pageIndex + 1 }}</span>
                      </footer>
                    </article>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="!isSessionCompleted" class="verses-grid">
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
                    <span v-if="isNewHifzAyah(verse.key)" class="verse-status-badge verse-status-badge-new">New</span>
                    <span v-if="isDueHifzAyah(verse.key)" class="verse-status-badge verse-status-badge-due">Due</span>
                    <span v-if="isWeakAyah(verse.key)" class="verse-status-badge verse-status-badge-weak">Needs Review</span>
                    <span v-if="isMasteredAyah(verse.key)" class="verse-status-badge verse-status-badge-mastered">Steady</span>
                    <span v-if="isVerseVisuallyActive(verse.key)" class="verse-status-badge">Active Ayah</span>
                  </div>
                  <div class="verse-actions">
                    
                    <button v-if="showAiMemorisationButton" class="verse-self-check-btn verse-ai-check-btn"
                      :class="{ active: shouldShowRecitationReviewHighlights(verse.key) && aiMemorisationCheckerVerseKey === verse.key }"
                      @click.stop="openAiMemorisationCheckerForVerse(verse)"
                      :disabled="aiMemorisationCheckerPreparing || aiMemorisationCheckerRecording || !supportsSelfCheckRecording()"
                      title="Open AI memorisation checker for this ayah">
                      <i class="bi bi-eye-slash" aria-hidden="true"></i>
                      <span>AI Memory</span>
                    </button>

                    <button class="verse-self-check-btn verse-ai-check-btn"
                      :class="{ active: isRecitationCheckTargetVerse(verse.key), saved: getAyahRecordingCount(verse.key) }"
                      @click.stop="openAiRecitationCheckForVerse(verse)"
                      :disabled="recitationCheckPreparing || recitationCheckRecording || !supportsSelfCheckRecording()"
                      :title="isRecitationCheckTargetVerse(verse.key) ? 'AI recitation check is active' : 'Open AI recitation check for this ayah'">
                      <i class="bi bi-stars" aria-hidden="true"></i>
                      <span>AI Recite</span>
                      <em v-if="getAyahRecordingCount(verse.key)">{{ getAyahRecordingCount(verse.key) }}</em>
                    </button>
                    <button class="verse-ellipsis-btn" type="button" @click.stop="toggleVerseActionMenu(verse.key)"
                        aria-label="Open ayah actions">
                        <i class="bi bi-three-dots-vertical"></i>
                      </button>
                    <div class="verse-menu-wrap" @click.stop>
                      
                      <transition name="dropdown-fade">
                        <div v-if="openVerseActionKey === verse.key" class="verse-action-menu">
                          <button type="button" @click="playVerse(verse)">
                            <i class="bi" :class="activeVerseKey === verse.key && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                            <span>{{ activeVerseKey === verse.key && isPlaying ? 'Pause' : 'Play' }}</span>
                          </button>
                          <button type="button" @click="downloadVerseAudio(verse)" :disabled="!verse.audio">
                            <i class="bi bi-download"></i>
                            <span>Download</span>
                          </button>
                          <!-- <div class="verse-menu-font-row">
                            <span class="verse-menu-font-label">Text</span>
                            <div class="verse-menu-font-stepper" role="group" aria-label="Ayah text size">
                              <button type="button" @click="decreaseTextScale($event)" aria-label="Decrease ayah text size">
                                <i class="bi bi-dash-lg"></i>
                              </button>
                              <output class="verse-menu-font-value">{{ getTextScalePercent() }}%</output>
                              <button type="button" @click="increaseTextScale($event)" aria-label="Increase ayah text size">
                                <i class="bi bi-plus-lg"></i>
                              </button>
                            </div>
                          </div> -->
                        </div>
                      </transition>
                    </div>
                  </div>
                </div>

                <div class="verse-arabic verse-arabic-primary" dir="rtl" lang="ar" v-if="verse.arabic && isDataReady"
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
                  <div class="verse-aid-title" dir="ltr" lang="en">Transliteration</div>
                  <div class="verse-transliteration verse-aid" dir="ltr" lang="en">
                    {{ verse.transliteration }}
                  </div>
                </div>
                <div v-if="showTranslation && verse.translation" class="verse-aid-block" dir="ltr" lang="en">
                  <div class="verse-aid-title" dir="ltr" lang="en">Translation</div>
                  <div class="verse-translation verse-aid" dir="ltr" lang="en">
                    {{ verse.translation }}
                  </div>
                </div>
                <div v-if="showWordByWord && verse.words && verse.words.length" class="verse-words verse-aid"
                  @scroll="onVerseWordsScroll(verse.key, $event)">
                  <div v-for="(word, wi) in verse.words" :key="wi" class="word-item"
                    :class="{ highlighted: currentHighlightedVerseKey === verse.key && currentWordIndex === wi, 'phrase-highlighted': currentHighlightedVerseKey === verse.key && currentPhraseIndex === wi }"
                    tabindex="-1">
                    <span class="word-arabic" dir="rtl" lang="ar">{{ word.ar }}</span>
                    <span class="word-meaning">{{ word.en }}</span>
                    <button v-if="word.audio && wordByWordAudioEnabled" class="word-audio-btn" type="button"
                      @click.stop="playWordAudio(word.audio, verse, wi)"
                      :aria-label="`Play word ${wi + 1} audio for ayah ${verse.number}`">
                      <i class="bi bi-volume-up" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <!-- Advanced Controls Drawer -->
      <div class="tools-backdrop" :class="{ open: showTools }" @click="closeToolsPanel" aria-hidden="true"></div>
      <aside id="memorisationToolsPanel" ref="toolsPanel" class="tools offcanvas-section" :class="{ 'open': showTools }"
        @click.stop role="dialog" aria-modal="true" aria-labelledby="memorisationToolsTitle"
        :aria-hidden="showTools ? 'false' : 'true'" tabindex="-1" @keydown.esc.prevent="closeToolsPanel">
        <div class="tools-top">
          <div class="tools-topbar">
            <div id="memorisationToolsTitle" class="tools-title">
              <h3><b>Controls</b></h3>
            </div>
            <button class="tools-x" @click="closeToolsPanel" aria-label="Close panel" type="button">
              <span class="tools-x-glyph" aria-hidden="true">&times;</span>
            </button>
          </div>
          <div v-if="shouldShowOffcanvasTabs" class="tools-tabs" role="tablist" aria-label="Controls tabs">
            <button role="tab" :aria-selected="tab === 'tools' ? 'true' : 'false'" :class="{ active: tab === 'tools' }"
              @click.prevent="setActiveTab('tools')" title="Session tools" type="button">
              <i class="bi bi-sliders"></i> Session
            </button>
            <button role="tab" :aria-selected="tab === 'techniques' ? 'true' : 'false'"
              :class="{ active: tab === 'techniques' }" @click.prevent="setActiveTab('techniques')"
              title="Practice presets" type="button">
              <i class="bi bi-stars"></i> Practice
            </button>
            <button role="tab" :aria-selected="tab === 'saved' ? 'true' : 'false'" :class="{ active: tab === 'saved' }"
              @click.prevent="setActiveTab('saved')" title="Saved sessions" type="button">
              <i class="bi bi-clock-history"></i> Saved
            </button>
            <!-- <button v-if="isLoggedIn" role="tab" :aria-selected="tab === 'stats' ? 'true' : 'false'"
              :class="{ active: tab === 'stats' }" @click.prevent="setActiveTab('stats')" title="Session insights"
              type="button">
              <i class="bi bi-bar-chart-line"></i> Insights
            </button> -->
            <!-- <button :class="{ active: tab === 'settings' }" @click.prevent="setActiveTab('settings')" type="button">
              <i class="bi bi-gear"></i> Settings
            </button> -->
          </div>
        </div>

        <div ref="toolsBody" class="tools-body compact">
          <div v-if="showHifzPlannerUi" class="sheet planner-controls-sheet">
            <section class="sheet-section sheet-section-compact">
              <div class="sheet-content planner-controls-content">
                <div class="field-stack field-stack-compact">
                  <div class="field">
                    <label><i class="bi bi-book"></i> Hifz Plan</label>
                    <strong>{{ hifzPlan?.selectedSurah || 'Current plan' }} · {{ plannerSessionState.sessionRange?.rangeStart || 1 }}-{{ plannerSessionState.sessionRange?.rangeEnd || 1 }}</strong>
                    <small class="field-hint">{{ plannerGuidanceTitle }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-bullseye"></i> Today's Goal</label>
                    <strong>{{ plannerSessionState.todayGoalLabel }}</strong>
                    <small class="field-hint">{{ plannerGuidanceWhy }}</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-gem"></i> Memory Review</label>
                    <strong>{{ plannerMemoryReviewLine }}</strong>
                    <small class="field-hint">Next review: {{ plannerSessionState.nextReviewLabel }} · {{ plannerConfidenceLine }}</small>
                  </div>
                  <div v-if="hasSessionStarted" class="field">
                    <label><i class="bi bi-layout-text-window-reverse"></i> Session View</label>
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
                    <small class="field-hint">View and font controls stay here while planner mode is active.</small>
                  </div>
                  <div v-else class="field">
                    <label><i class="bi bi-layout-text-window-reverse"></i> Session View</label>
                    <strong>Available after you start today&apos;s session</strong>
                    <small class="field-hint">Mushaf view and font options stay hidden until the session begins.</small>
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
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                    <small class="field-hint">{{ t('sessionSetup.reciterHint') }}</small>
                  </div>
                  <div class="field">
                    <div class="field-header">
                      <label><i class="bi bi-arrow-repeat"></i> {{ t('sessionSetup.repetitions') }}</label>
                      <span class="range-value-pill">{{ repetitionDisplayValue }}</span>
                    </div>
                    <div class="range-control">
                      <input type="range" :value="sliderRepetitionValue"
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
                    <span class="st-title">Audio</span>
                    <span class="st-sub">Playback settings</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_playback }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_playback">
                <div class="field-stack field-stack-compact">
                  <div class="field">
                    <label>Speed</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio" v-for="option in speedOptions" :key="`tool-speed-${option}`">
                        <input type="radio" name="session-playback-speed" :value="option" v-model.number="speed"
                          @change="setPlaybackSpeed(option)"> {{ option }}x
                      </label>
                    </div>
                    <small class="field-hint">Use slower speed for early memorisation.</small>
                  </div>
                  <div class="field">
                    <label>Auto-advance</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" name="session-auto-advance" value="auto" v-model="playMode"> Yes</label>
                      <label class="radio"><input type="radio" name="session-auto-advance" value="manual" v-model="playMode"> No</label>
                    </div>
                    <small class="field-hint">Auto moves to the next queue item when audio ends.</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-hourglass-split"></i> Delay between recitations (secs)</label>
                    <select v-model.number="delay" class="select">
                      <option v-for="option in delayOptions" :key="`tool-delay-${option}`" :value="option">{{ option }}s
                      </option>
                    </select>
                    <small class="field-hint">Pause before each next repetition/recitation in auto mode.</small>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- TECHNIQUES TAB -->
          <div v-else-if="tab === 'techniques'" class="sheet">
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('focus_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-bullseye"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Focus Mode</span>
                    <span class="st-sub">Reduce distractions around the active ayah</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: focusModeEnabled }"
                      :aria-pressed="focusModeEnabled ? 'true' : 'false'" aria-label="Use focus mode" @click="toggleFocusModeRadio">
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
                      <span>Focus Mode dims all non-active verses, helping you concentrate on the current ayah without
                        distractions.</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>Best for: Deep memorisation sessions</span>
                    </div>
                  </div>
                  <div v-if="focusModeEnabled" class="field">
                    <label>Focus strength</label>
                    <div class="range-control">
                      <input type="range" min="30" max="75" step="5" v-model.number="focusDimPercent" class="input">
                      <span class="inline-setting-pill">{{ focusDimPercent }}%</span>
                    </div>
                    <small class="field-hint">Higher values dim non-active verses more aggressively.</small>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('blur_mode')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-cloud-haze2"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Blur Mode</span>
                    <span class="st-sub">Progressive concealment for active recall</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: blurModeEnabled }"
                      :aria-pressed="blurModeEnabled ? 'true' : 'false'" aria-label="Use blur mode" @click="toggleBlurModeRadio">
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
                      <span>Blurs upcoming verses, requiring you to recall them before revealing.</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>Best for: Active recall testing</span>
                    </div>
                  </div>
                  <div v-if="blurModeEnabled" class="field">
                    <label>Blur Intensity</label>
                    <div class="range-control">
                      <input type="range" min="4" max="18" step="1" v-model.number="blurIntensity" class="input">
                      <span class="inline-setting-pill">{{ blurIntensity }}px</span>
                    </div>
                    <small class="field-hint">Hold <kbd>Space</kbd>, hover, or long-press to peek temporarily</small>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('chaining')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-link-45deg"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Chaining</span>
                    <span class="st-sub">{{ chainingMethodDescription }}</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: chainingEnabled }"
                      :aria-pressed="chainingEnabled ? 'true' : 'false'" aria-label="Use chaining" @click="toggleChainingRadio">
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
                      <span>{{ chainingMethod === 'cumulative' ? 'Build longer runs by adding one ayah at a time.' :
                        'Strengthen transitions between neighbouring ayahs.' }}</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>Best for: Building long passages</span>
                    </div>
                  </div>
                  <div v-if="chainingEnabled" class="field">
                    <label>Method</label>
                    <div class="radio-group">
                      <label class="radio">
                        <input type="radio" value="linking" v-model="chainingMethod"
                          @change="setChainingMethod('linking')">
                        Linking
                      </label>
                      <label class="radio">
                        <input type="radio" value="cumulative" v-model="chainingMethod"
                          @change="setChainingMethod('cumulative')">
                        Cumulative
                      </label>
                    </div>
                    <small class="field-hint">{{ chainingMethod === 'linking' ? 'Practice ayahs individually, then in pairs.' : 'Start with first ayah, then add one more each time.' }}</small>
                  </div>
                  <div v-if="chainingEnabled" class="field">
                    <label>Repeats per step</label>
                    <div class="range-control">
                      <input type="range" min="1" max="5" step="1" :value="chainingRepetitions"
                        @input="setChainingRepetitions(Number($event.target.value))" class="input">
                      <span class="inline-setting-pill">{{ chainingRepetitions }}</span>
                    </div>
                    <small class="field-hint">Number of times to repeat each chaining step</small>
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
                    <span class="st-title">Anchor Mode</span>
                    <span class="st-sub">Mental hooks using key words</span>
                  </span>
                </span>
                <div class="st-right-group">
                  <div class="mode-radio-group" @click.stop>
                    <button type="button" class="mode-radio" :class="{ active: anchorModeEnabled }"
                      :aria-pressed="anchorModeEnabled ? 'true' : 'false'" aria-label="Use anchor mode" @click="toggleAnchorModeRadio">
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
                      <span>Highlights key words as memory anchors to help recall the entire ayah.</span>
                    </div>
                    <div class="technique-best">
                      <i class="bi bi-check-circle-fill"></i>
                      <span>Best for: Memorising key vocabulary</span>
                    </div>
                  </div>
                  <div v-if="anchorModeEnabled" class="field">
                    <label>Anchor points per ayah</label>
                    <select v-model.number="anchorCount" @change="onAnchorCountChange" class="select">
                      <option :value="1">1 anchor (center word)</option>
                      <option :value="2">2 anchors (first + last)</option>
                    </select>
                    <small class="field-hint">{{ anchorModeDescription }}</small>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- SAVED TAB -->
          <div v-else-if="tab === 'saved'" class="sheet">
            <div class="saved-sessions-container saved-sessions-v2">
              <!-- Header -->
              <div class="saved-header">
                <h3><i class="bi bi-clock-history"></i> Saved Sessions</h3>
                <p>Each session keeps only the essentials: what it is, where it is, and how to get back in.</p>
              </div>

              <!-- SAVED SESSIONS LIST -->
              <div v-if="savedSessions.length > 0" class="sessions-list">
                <div v-for="session in sortedSavedSessions" :key="session.id" class="session-item"
                    :class="{ 'session-item-active': sessionMatchesCurrentLiveConfig(session) }">
                  <div class="session-info" @click="loadSavedSession(session.id)">
                    <div class="session-name">
                      <i class="bi bi-bookmark-fill"></i>
                      <span>{{ getSavedSessionName(session) }}</span>
                    </div>
                    <div class="session-details">
                      <span><i class="bi bi-book-half"></i> {{ getSavedSessionSurah(session) }}</span>
                      <span><i class="bi bi-clock-history"></i> Last opened {{ formatDate(session.savedAt) }}</span>
                    </div>
                  </div>
                  <div class="session-actions">
                    <button class="session-resume-btn" @click="loadSavedSession(session.id)" type="button">
                      <i class="bi bi-play-fill"></i>
                      <span>Resume</span>
                    </button>
                    <button class="session-delete-btn" @click.stop="deleteSavedSession(session.id)" title="Delete">
                      <i class="bi bi-trash3"></i>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- EMPTY STATE -->
              <div v-if="savedSessions.length === 0" class="empty-state">
                <i class="bi bi-journal-bookmark"></i>
                <p>No saved sessions yet</p>
                <span>Save your current session to get started</span>
              </div>

              <!-- Save Current Session -->
              <div v-if="hasVerses" class="save-section">
                <div class="current-info">
                  <i class="bi bi-play-circle"></i>
                  <div>
                    <strong>Current Session</strong>
                    <small>{{ currentChapter?.name_simple || 'No surah' }} · {{ rangeStart }}-{{ rangeEnd }}</small>
                  </div>
                </div>
                <button class="save-btn" @click="saveCurrentSessionWithName()">
                  <i class="bi bi-save"></i> Save
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="isLoggedIn && tab === 'stats'" class="sheet">
            <div v-if="tab === 'stats'" class="sheet">
              <div class="stats-sessions-container">
                <div class="saved-header">
                  <h3><i class="bi bi-bar-chart-line"></i> Insights</h3>
                  <p>Today first. Advanced analytics stay tucked away until you ask for them.</p>
                </div>
                <div class="hifz-simple-analytics" aria-label="Current session analytics">
                  <article v-for="item in controlsAnalyticsCards" :key="item.key" class="hifz-simple-analytics-item">
                    <i class="bi" :class="item.icon" aria-hidden="true"></i>
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <small>{{ item.description }}</small>
                  </article>
                </div>
                <button type="button" class="analytics-toggle-btn" @click="openAdvancedMetricsModal">
                  <i class="bi bi-plus-circle"></i>
                  <span>Show advanced metrics</span>
                </button>
                <div v-if="false">
                  <section class="detailed-analytics-system" aria-label="Detailed analytics">
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
                    <p>No advanced insights yet</p>
                    <span>Save a session and you’ll unlock the deeper breakdown here.</span>
                  </div>
                  <div v-else class="stats-panel">
                    <div v-if="selectedStatsSessionRecord" class="stats-detail">
                      <div class="stats-detail-head stats-detail-head-hero">
                        <div>
                          <h4>{{ getSavedSessionName(selectedStatsSessionRecord) }}</h4>
                          <div class="stats-summary">{{ buildStatsSummary(selectedStatsSessionRecord) }}</div>
                          <div v-if="sortedSavedSessions.length > 1" class="stats-session-select-wrap">
                            <label class="stats-session-select-label" for="statsSessionSelect">Saved sessions</label>
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
                            <span>View Full Analytics</span>
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
                </div>

                <!-- Font Size -->
                <div v-if="false" class="setting-item setting-item-range">
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
                    <div class="setting-description">English, Arabic, or French UI</div>
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
                    <div class="setting-label">Translation</div>
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

                <!-- Word by Word -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.wordByWord') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.wordByWordDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showWordByWord }" @click="toggleReadingOption('wbw')">
                    {{ showWordByWord ? t('common.on') : t('common.off') }}
                  </button>
                </div>

                <!-- Word Audio -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">{{ t('sessionSetup.wordAudio') }}</div>
                    <div class="setting-description">{{ t('sessionSetup.wordAudioDesc') }}</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: wordByWordAudioEnabled }"
                    @click="wordByWordAudioEnabled = !wordByWordAudioEnabled">
                    {{ wordByWordAudioEnabled ? t('common.on') : t('common.off') }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="tools-footer" :class="{ 'settings-footer': tab === 'settings' }">
          <template v-if="showHifzPlannerUi">
            <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="openHifzPlanModal">
              <i class="bi bi-pencil-square"></i><span>Edit Plan</span>
            </button>
            <button class="tools-btn tools-btn-primary tools-btn-soft" @click="startPlannerPrimaryAction">
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i><span>{{ plannerPrimaryActionLabel }}</span>
            </button>
          </template>
          <template v-else>
            <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="resetControls">
              <i class="bi bi-arrow-counterclockwise"></i><span>{{ t('common.reset') }}</span>
            </button>
            <button class="tools-btn tools-btn-primary tools-btn-soft" @click="startSessionAndClose">
              <i class="bi bi-play-fill"></i><span>{{ t('common.startSession') }}</span>
            </button>
          </template>
        </div>
      </aside>
    </div>

    <div v-else-if="appReady && !isLoggedIn" class="main container">
      <div class="login-hero">
        <div class="guest-shell">
          <section class="guest-hero">
            <div class="guest-hero-copy">
              <span class="guest-kicker">{{ t('home.guestKicker') }}</span>
              <h1>{{ t('home.guestTitle') }}</h1>
              <div class="guest-copy-stack">
                <p class="guest-subtitle">
                  {{ t('home.guestSubtitle') }}
                </p>
                <p class="guest-copy-support">
                  {{ t('home.guestSupport') }}
                </p>
              </div>

              <div class="guest-action-row">
                <a href="/login" class="login-btn guest-primary-btn" style="text-decoration: none;">
                  <i class="bi bi-box-arrow-in-right"></i>
                  <span>{{ t('common.login') }}</span>
                </a>
                <a href="/register" class="guest-secondary-btn" style="text-decoration: none;">
                  <i class="bi bi-person-plus"></i>
                  <span>{{ t('common.register') }}</span>
                </a>
              </div>
              <p class="guest-cta-note">{{ t('home.guestNote') }}</p>

              <div class="guest-proof-row">
                <span><i class="bi bi-cloud-check"></i> Sync progress</span>
                <span><i class="bi bi-arrow-repeat"></i> Structured repetition</span>
                <span><i class="bi bi-clock-history"></i> Resume exactly</span>
              </div>
            </div>

            <aside class="guest-hero-panel">
              <div class="guest-preview-card">
                <div class="guest-preview-icon">
                  <i class="bi bi-book-half"></i>
                </div>
                <div class="guest-preview-copy">
                  <strong>What a Mutqin session feels like</strong>
                  <p>Short enough to stay focused. Structured enough to make long-term memorisation easier to revisit.
                  </p>
                </div>
                <div class="guest-preview-steps">
                  <div class="guest-preview-step">
                    <span>1</span>
                    <div>
                      <strong>Choose your ayahs</strong>
                      <small>Pick the surah, range, and reciter.</small>
                    </div>
                  </div>
                  <div class="guest-preview-step">
                    <span>2</span>
                    <div>
                      <strong>Repeat with structure</strong>
                      <small>Use playback, chaining, focus, and blur tools.</small>
                    </div>
                  </div>
                  <div class="guest-preview-step">
                    <span>3</span>
                    <div>
                      <strong>Recall and review</strong>
                      <small>Track what was covered and return later with clarity.</small>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section class="guest-section guest-section-row guest-section-row-simplified">
            <div class="guest-section-head guest-section-head-side">
              <span class="guest-section-kicker">How Mutqin stays focused</span>
              <h2>Everything centres on one calm memorisation session at a time</h2>
              <p>Choose a small range, repeat with structure, then return for recall and review without dashboard
                clutter.</p>
            </div>
            <div class="guest-feature-grid">
              <article class="guest-feature-card">
                <i class="bi bi-layers"></i>
                <strong>Focused ayah ranges</strong>
                <p>Work in smaller sections that are easier to repeat well.</p>
              </article>
              <article class="guest-feature-card">
                <i class="bi bi-arrow-repeat"></i>
                <strong>Clear repetition</strong>
                <p>Keep your session steady instead of guessing how many times to repeat.</p>
              </article>
              <article class="guest-feature-card">
                <i class="bi bi-ear"></i>
                <strong>Recall with less clutter</strong>
                <p>Use only the aids and techniques that support the current passage.</p>
              </article>
              <article class="guest-feature-card">
                <i class="bi bi-graph-up-arrow"></i>
                <strong>Progress you can revisit</strong>
                <p>Saved sessions and compact insights stay ready when you come back.</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Save Session Name Modal - Clean & Updated Version -->
    <div class="modal-overlay" v-if="showSaveNameModal" @click.self="closeSaveModal">
      <div class="modal-content save-name-modal" role="dialog" aria-modal="true" aria-labelledby="saveModalTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <h2 id="saveModalTitle">Save Memorisation Session</h2>
            <p>Name this session so you can find it again later.</p>
          </div>
          <button class="modal-close-btn" @click="closeSaveModal" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="name-input-group" :class="{ 'has-error': nameError }">
            <label for="sessionName">
              Session Name
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

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeSaveModal">
            <i class="bi bi-x-lg"></i>
            Cancel
          </button>
          <button class="btn-primary" @click="confirmSaveSession" :disabled="!isValidSessionName">
            <i class="bi bi-save"></i>
            Save Session
          </button>
        </div>
      </div>
    </div>

    <div class="modal-overlay confirm-modal-overlay" v-if="showConfirmModal" @click.self="closeConfirmModal">
      <div class="modal-content confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="confirmModalTitle">{{ confirmModal.title }}</h2>
          </div>
          <button class="btn-icon" @click="closeConfirmModal" type="button" aria-label="Close confirmation dialog"><i
              class="bi bi-x-lg" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-copy">{{ confirmModal.message }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeConfirmModal">{{ confirmModal.cancelLabel }}</button>
          <button class="btn-primary" :class="{ 'btn-danger': confirmModal.tone === 'danger' }"
            @click="runConfirmAction">{{ confirmModal.confirmLabel }}</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showSessionExitModal" @click.self="closeSessionExitModal">
      <div class="modal-content confirm-modal session-exit-modal" role="dialog" aria-modal="true"
        aria-labelledby="sessionExitTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="sessionExitTitle">End Session</h2>
          </div>
          <button class="btn-icon" @click="closeSessionExitModal" type="button" aria-label="Close end session dialog"><i
              class="bi bi-x-lg" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body">
          <div class="session-exit-recap">
            <span><i class="bi bi-book"></i> {{ currentChapter?.name_simple || 'No surah' }}</span>
            <span><i class="bi bi-text-paragraph"></i> Ayah {{ currentPosition }}/{{ totalVerses }}</span>
            <span><i class="bi bi-clock"></i> {{ formatTime(currentTime || 0) }}</span>
          </div>
          <p class="confirm-copy">End this session now?</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeSessionExitModal">Close</button>
          <button class="btn-primary" @click="confirmSessionExit">End Session</button>
        </div>
      </div>
    </div>




    <div v-if="showCountdownOverlay" class="countdown-overlay">
      <div class="countdown-modal">
        <div class="countdown-number">{{ countdownValue }}</div>
        <div class="countdown-text">Prepare yourself</div>
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

    <div v-if="showHifzPlannerUi && showPlannerCompletionModal" class="modal-overlay planner-completion-overlay"
      @click.self="closePlannerCompletionModal">
      <div class="modal-content planner-completion-modal" role="dialog" aria-modal="true"
        aria-labelledby="plannerCompletionTitle">
        <div class="modal-header planner-completion-header">
          <div class="planner-completion-head-copy">
            <span class="planner-completion-kicker"><i class="bi bi-stars"></i> Session Finished</span>
            <h2 id="plannerCompletionTitle">Congratulations. Today&apos;s Hifz session is complete.</h2>
            <p>{{ plannerCompletionSummaryMessage }}</p>
          </div>
          <button class="modal-close-btn" @click="closePlannerCompletionModal" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body planner-completion-body">
          <div class="container-fluid planner-completion-shell px-0">
            <div class="row g-3 planner-completion-stats-row">
              <div class="col-12 col-md-6 col-xl-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>Memorised today</span>
                  <strong>{{ plannerCompletionStats.memorised }}</strong>
                  <small>{{ plannerCompletionStats.memorisedLabel }}</small>
                </article>
              </div>
              <div class="col-12 col-md-6 col-xl-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>New ayahs</span>
                  <strong>{{ plannerCompletionStats.newAyahs }}</strong>
                  <small>{{ plannerCompletionStats.newAyahsLabel }}</small>
                </article>
              </div>
              <div class="col-12 col-md-6 col-xl-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>Today&apos;s goal</span>
                  <strong>{{ plannerCompletionStats.goalProgress }}</strong>
                  <small>{{ plannerCompletionStats.goalStatus }}</small>
                </article>
              </div>
              <div class="col-12 col-md-6 col-xl-3 planner-completion-stat-col">
                <article class="planner-completion-stat">
                  <span>Next review</span>
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
        <div class="modal-footer planner-completion-footer">
          <button class="btn btn-success" type="button" @click="openHifzPlanFromCompletionModal">
            <i class="bi bi-pencil-square" aria-hidden="true"></i>
            View Plan
          </button>
          <button class="btn btn-outline-secondary" type="button" @click="closePlannerCompletionModal">
            Close
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSessionAnalyticsModal" class="modal-overlay session-analytics-overlay"
      @click.self="closeSessionAnalyticsModal">
      <div class="modal-content session-analytics-modal" role="dialog" aria-modal="true"
        aria-labelledby="sessionAnalyticsTitle">
        <div class="modal-header session-analytics-header">
          <div class="session-analytics-head-copy">
            <h2 id="sessionAnalyticsTitle">Session Analytics Overview</h2>
            <p v-if="analyticsModalSessionLabel">{{ analyticsModalSessionLabel }}</p>
            <small v-if="analyticsModalSessionMeta">{{ analyticsModalSessionMeta }}</small>
          </div>
          <div class="session-analytics-head-actions">
            <button type="button" class="session-export-btn session-analytics-download"
              :disabled="analyticsReportState.loading || !analyticsModalRecord" @click="downloadSessionAnalyticsReport">
              <i class="bi" :class="analyticsReportIcon"></i>
              <span>{{ analyticsReportLabel }}</span>
            </button>
            <button class="modal-close-btn" @click="closeSessionAnalyticsModal" aria-label="Close">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="modal-body session-analytics-body">
          <div v-if="!analyticsModalLoaded" class="analytics-loading">
            <i class="bi bi-hourglass-split"></i>
            <span>Preparing analytics...</span>
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
                  <h3>Recite Check Results</h3>
                  <p>Saved word checks for this session range.</p>
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
                  <span>What next?</span>
                  <strong>{{ analyticsAiCheckSummary.recommendation }}</strong>
                  <p>{{ analyticsAiCheckSummary.nextStep }}</p>
                </div>
                <div v-if="analyticsAiCheckSummary.validation" class="recitation-next-card">
                  <span>Deterministic replay</span>
                  <strong :class="analyticsAiCheckSummary.validation.tone">{{ analyticsAiCheckSummary.validation.label }}</strong>
                  <p>{{ analyticsAiCheckSummary.validation.summary }}</p>
                </div>
              </article>
            </section>
            
            <section class="session-analytics-section" v-if="analyticsModalData">
              <!-- <div class="confidence-heatmap-inline">
                <div class="heatmap-header">
                  <h3><i class="bi bi-grid-3x3-gap-fill"></i> Recitation Confidence Heatmap</h3>
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

                -- Tooltip --
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

                -- Trend Summary --
                <div v-if="heatmapTrends.improved.length || heatmapTrends.declined.length" class="heatmap-trends">
                  <div class="trend-improved" v-if="heatmapTrends.improved.length">
                    <i class="bi bi-arrow-up-circle-fill"></i> Most Improved: 
                    <strong>Ayah {{ heatmapTrends.improved[0].ayahNumber }}</strong> (+{{ heatmapTrends.improved[0].change }}%)
                  </div>
                  <div class="trend-declined" v-if="heatmapTrends.declined.length">
                    <i class="bi bi-arrow-down-circle-fill"></i> Needs Focus: 
                    <strong>Ayah {{ heatmapTrends.declined[0].ayahNumber }}</strong> ({{ heatmapTrends.declined[0].change }}% decline)
                  </div>
                </div>

                -- Focus Alert --
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
                  <h3>Ayah activity</h3>
                  <p>Verse plays across the selected range.</p>
                </header>
                <div v-if="analyticsVerseSeries.length" class="analytics-line-chart">
                  <svg viewBox="0 0 320 160" role="img" aria-label="Ayah activity chart">
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
                <div v-else class="analytics-empty-panel">Play ayah audio to populate the activity chart.</div>
              </article>
            </section>
            <section class="session-analytics-section session-analytics-two-col analytics-extra-section">
              <article class="session-analytics-panel">
                <header>
                  <h3>Most Replayed Ayahs</h3>
                  <p>Quick view of where repetition is concentrating.</p>
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
                <div v-else class="analytics-empty-panel">No ayah replay data available yet.</div>
              </article>
              <article class="session-analytics-panel">
                <header>
                  <h3>Session Playback Balance</h3>
                  <p>See how evenly audio attention is spread across the selected range.</p>
                </header>
                <div v-if="analyticsPlaybackBuckets.length" class="analytics-bucket-grid">
                  <div v-for="bucket in analyticsPlaybackBuckets" :key="bucket.key" class="analytics-bucket-card">
                    <span>{{ bucket.label }}</span>
                    <strong>{{ bucket.value }}</strong>
                    <small>{{ bucket.description }}</small>
                  </div>
                </div>
                <div v-else class="analytics-empty-panel">Playback balance appears after ayah audio starts.</div>
              </article>
            </section>
          </template>
        </div>
      </div>
    </div>

    <div v-if="showAdvancedMetricsModal" class="modal-overlay session-analytics-overlay advanced-metrics-overlay"
      @click.self="closeAdvancedMetricsModal">
      <div class="modal-content session-analytics-modal advanced-metrics-modal" role="dialog" aria-modal="true"
        aria-labelledby="advancedMetricsTitle">
        <div class="modal-header session-analytics-header">
          <div class="session-analytics-head-copy">
            <h2 id="advancedMetricsTitle">Advanced Metrics</h2>
            <p>Session signals, review health, cards, graphs, and charts.</p>
            <small>Save a session to unlock full per-session analytics.</small>
          </div>
          <button class="modal-close-btn" @click="closeAdvancedMetricsModal" aria-label="Close advanced metrics">
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
                <p>Compact breakdown for this metric group.</p>
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

    <div v-if="showAiMemorisationCheckerModal && aiMemorisationCheckerVerse" class="modal-overlay memorisation-checker-overlay"
      @click.self="closeAiMemorisationCheckerModal">
      <div class="modal-content self-check-modal memorisation-checker-modal" role="dialog" aria-modal="true"
        aria-labelledby="aiMemorisationCheckerTitle">
        <div class="modal-header self-check-modal-header memorisation-checker-header">
          <div class="self-check-modal-head-copy">
            <div class="modal-context-badges">
              <div class="modal-context-badge">AI memorisation review</div>
            </div>
            <h2 id="aiMemorisationCheckerTitle">{{ aiMemorisationCheckerTitle }}</h2>
          </div>
          <button class="modal-close-btn" @click="closeAiMemorisationCheckerModal" aria-label="Close AI memorisation checker">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body self-check-modal-body memorisation-checker-body">
          <section class="self-check-modal-stage memorisation-checker-stage">
            <header class="self-check-section-head">
              <div>
                <span class="self-check-kicker">Ayah display</span>
                <strong class="self-check-section-title">Recite from memory</strong>
              </div>
              <div class="self-check-header-tools memorisation-checker-header-tools" aria-label="AI memorisation tools">
                <button class="self-check-toolbar-btn self-check-ayah-action-ai" type="button"
                  @click.stop="toggleAiMemorisationCheckerRecording"
                  :disabled="aiMemorisationCheckerPreparing || !supportsSelfCheckRecording()"
                  :class="{ recording: aiMemorisationCheckerRecording }"
                  :title="aiMemorisationCheckerRecording ? 'Stop memorisation check' : 'Play memorisation check'"
                  aria-label="Play memorisation check">
                  <i class="bi" :class="aiMemorisationCheckerRecording ? 'bi-stop-circle' : 'bi-stars'"></i>
                  <span>{{ aiMemorisationCheckerRecording ? 'Stop' : 'Play Memorisation' }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button"
                  @click.stop="toggleSelfCheckAyahPlayback(aiMemorisationCheckerVerse)"
                  :title="activeSelfCheckAyahPlaybackKey === aiMemorisationCheckerVerse.key ? 'Pause ayah' : 'Play ayah once'"
                  aria-label="Play ayah once">
                  <i class="bi" :class="activeSelfCheckAyahPlaybackKey === aiMemorisationCheckerVerse.key ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                  <span>{{ activeSelfCheckAyahPlaybackKey === aiMemorisationCheckerVerse.key ? 'Pause' : 'Play' }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button" @click.stop="toggleAiMemorisationCheckerBlur"
                  :class="{ active: aiMemorisationCheckerBlurEnabled }"
                  :aria-pressed="aiMemorisationCheckerBlurEnabled ? 'true' : 'false'"
                  title="Blur everything" aria-label="Blur everything">
                  <i class="bi" :class="aiMemorisationCheckerBlurEnabled ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                  <span>Blur Everything</span>
                </button>
                <button class="self-check-toolbar-btn" type="button" @mousedown="startAiMemorisationCheckerPeek"
                  @mouseup="stopAiMemorisationCheckerPeek" @mouseleave="stopAiMemorisationCheckerPeek"
                  @touchstart.prevent="startAiMemorisationCheckerPeek" @touchend="stopAiMemorisationCheckerPeek"
                  @touchcancel="stopAiMemorisationCheckerPeek" title="Peek ayah" aria-label="Peek ayah">
                  <i class="bi bi-eye"></i>
                  <span>Peek</span>
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
                  <span class="self-check-kicker">Memorisation review</span>
                  <strong>{{ aiMemorisationCheckerRecording ? 'AI memorisation listening' : aiMemorisationCheckerResult ? 'Review before saving' : 'AI memorisation review' }}</strong>
                  <p class="self-check-card-desc">{{ aiMemorisationCheckerStageDescription }}</p>
                </div>
              </div>
              <section v-if="isAiMemorisationCheckerReviewActive || aiMemorisationCheckerError"
                class="recitation-check-panel recitation-check-panel-inline memorisation-checker-panel"
                aria-live="polite">
                <div class="recitation-check-head">
                  <div>
                    <span class="recitation-check-kicker">AI Memory</span>
                    <h2>{{ aiMemorisationCheckerResult ? 'Memorisation review' : aiMemorisationCheckerRecording ? 'AI memorisation listening' : 'AI memorisation check' }}</h2>
                  </div>
                  <div class="recitation-check-head-actions">
                    <button v-if="aiMemorisationCheckerResult && !aiMemorisationCheckerRecording && !aiMemorisationCheckerPreparing"
                      class="recitation-result-close" type="button" @click="discardAiMemorisationCheckerAssessment"
                      aria-label="Close memorisation review">
                      <i class="bi bi-x-lg"></i>
                    </button>
                    <button v-if="aiMemorisationCheckerResult && !aiMemorisationCheckerRecording && !aiMemorisationCheckerPreparing"
                      class="recitation-result-reset" type="button" @click="resetAiMemorisationCheckerAssessment"
                      title="Reset memorisation review" aria-label="Reset memorisation review">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                  </div>
                </div>
                <div v-if="aiMemorisationCheckerRecording" class="recitation-check-status">
                  <i class="bi bi-record-circle" aria-hidden="true"></i>
                  <span>{{ aiMemorisationCheckerStageDescription }}</span>
                </div>
                <div v-if="aiMemorisationCheckerRecording" class="recitation-live-review recitation-live-review-compact"
                  aria-label="Live memorisation word check">
                  <div class="recitation-live-head">
	                    <span>{{ aiMemorisationCheckerLiveSummary }}</span>
	                    <strong>Live</strong>
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
                    <span>Stop Check</span>
                  </button>
                </div>
                <div v-else-if="aiMemorisationCheckerPreparing" class="recitation-check-status">
                  <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
                  <span>Checking the recording...</span>
                </div>
                <div v-if="aiMemorisationCheckerError" class="recitation-check-error">
                  {{ aiMemorisationCheckerError }}
                </div>
                <div v-if="aiMemorisationCheckerResult" ref="aiMemorisationCheckerResults"
                  class="recitation-check-body recitation-check-results memorisation-checker-results">
                  <div class="recitation-result-stats memorisation-checker-result-grid">
                    <article v-for="stat in getAiMemorisationCheckerResultStats(aiMemorisationCheckerResult)" :key="stat.key"
                      class="recitation-result-stat" :class="stat.tone">
                      <span>{{ stat.label }}</span>
                      <strong>{{ stat.value }}</strong>
                      <small>{{ stat.description }}</small>
                    </article>
                  </div>
                  <div class="recitation-insights-grid">
                    <div class="recitation-next-card">
                      <span>What next?</span>
                      <strong>{{ getRecitationRecommendationDisplay(aiMemorisationCheckerResult) }}</strong>
                      <p>{{ getAiMemorisationCheckerNextStep(aiMemorisationCheckerResult) }}</p>
                    </div>
                    <div class="recitation-next-card ai-review-card">
                      <span>Metadata</span>
                      <p>{{ getAiRecitationPostReviewMessage(aiMemorisationCheckerResult) }}</p>
                    </div>
                  </div>
                  <div class="recitation-word-stream memorisation-checker-final-words" dir="rtl" lang="ar">
                    <span v-for="(word, index) in getRecitationWordStatuses(aiMemorisationCheckerResult)" :key="`memory-final-${index}`"
                      class="recitation-word-chip" :class="[`word-${getWordVisualStatus(word, false, true)}`, { 'can-correct-ai': word.status && word.status !== 'correct' }]"
                      :title="word.status && word.status !== 'correct' ? `${word.note || ''} Mark as AI mistake.` : word.note"
                      @click="markAiRecitationWordAsCorrect(aiMemorisationCheckerResult, index)">
                      {{ word.text }}
                    </span>
                  </div>
                  <div class="recitation-check-footnotes">
                    <div class="self-check-status self-check-status-warning ai-recitation-disclaimer recitation-check-footnote">
                      <i class="bi bi-info-circle"></i>
                      <span>AI memorisation feedback is a guide. Verify important mistakes against the ayah before you save or reset.</span>
                    </div>
                  </div>
                  <div class="recitation-result-actions">
                    <button class="btn-secondary self-check-action-btn" type="button" @click="discardAiMemorisationCheckerAssessment">
                      <i class="bi bi-x-circle"></i>
                      <span>Discard</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn" type="button" @click="resetAiMemorisationCheckerAssessment">
                      <i class="bi bi-arrow-counterclockwise"></i>
                      <span>Reset Ayah</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn recitation-delete-btn" type="button" @click="deleteAiMemorisationCheckerAssessment">
                      <i class="bi bi-trash3"></i>
                      <span>Delete</span>
                    </button>
                    <button class="btn-primary self-check-action-btn" type="button" @click="saveAiMemorisationCheckerAssessment">
                      <i class="bi bi-save2"></i>
                      <span>Save Attempt</span>
                    </button>
                  </div>
                </div>
              </section>
            </article>
          </section>
        </div>
      </div>
    </div>

    <div v-if="showSelfCheckModal && selfCheckModalVerse" class="modal-overlay self-check-modal-overlay"
      @click.self="closeSelfCheckModal">
      <div class="modal-content self-check-modal" role="dialog" aria-modal="true" aria-labelledby="selfCheckModalTitle">
        <div class="modal-header self-check-modal-header">
          <div class="self-check-modal-head-copy">
            <div class="modal-context-badges">
              <div class="modal-context-badge">{{ recitationCheckPanelOpen || recitationCheckRecording || recitationCheckPreparing || recitationCheckResult ? recitationCheckPromptLabel : 'Per-ayah recorder' }}</div>
            </div>
            <h2 id="selfCheckModalTitle">{{ selfCheckModalTitle }}</h2>
          </div>
          <button class="modal-close-btn" @click="closeSelfCheckModal" aria-label="Close self-check">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body self-check-modal-body">
          <section class="self-check-modal-stage">
            <header class="self-check-section-head">
              <div>
                <span class="self-check-kicker">Ayah display</span>
                <strong class="self-check-section-title">Recite from memory</strong>
              </div>
              <div class="self-check-header-tools" aria-label="Ayah tools">
                <button class="self-check-toolbar-btn self-check-ayah-action-ai" type="button"
                  @click.stop="toggleRecitationCheckForCurrentModal"
                  :disabled="isSelfCheckRecording || recitationCheckPreparing || !supportsSelfCheckRecording()"
                  :class="{ recording: recitationCheckRecording }"
                  :title="recitationCheckRecording ? 'Stop AI recitation check' : 'Start AI recitation check'"
                  aria-label="AI recitation check">
                  <i class="bi" :class="recitationCheckRecording ? 'bi-stop-circle' : 'bi-stars'"></i>
                  <span>{{ recitationCheckRecording ? 'Stop AI' : 'AI Recite' }}</span>
                </button>
                <button class="self-check-toolbar-btn self-check-ayah-action-manual" type="button"
                  @click.stop="toggleManualSelfCheckRecording(selfCheckModalVerse)"
                  :disabled="recitationCheckRecording || recitationCheckPreparing"
                  :class="{ recording: isSelfCheckRecording }"
                  :title="isSelfCheckRecording ? 'Stop manual recording' : 'Start manual recording'"
                  aria-label="Manual recording">
                  <i class="bi" :class="isSelfCheckRecording ? 'bi-stop-circle' : 'bi-mic-fill'"></i>
                  <span>{{ isSelfCheckRecording ? 'Stop Manual' : 'Manual' }}</span>
                </button>
                <button class="self-check-toolbar-btn" type="button"
                  @click.stop="resetDisplayedRecitationAyah"
                  :disabled="recitationCheckRecording || recitationCheckPreparing"
                  title="Reset displayed ayah review" aria-label="Reset displayed ayah review">
                  <i class="bi bi-arrow-counterclockwise"></i>
                  <span>Reset</span>
                </button>
                <button class="self-check-toolbar-btn" type="button"
                  @click.stop="toggleSelfCheckAyahPlayback(selfCheckModalVerse)"
                  :title="activeSelfCheckAyahPlaybackKey === selfCheckModalVerse.key ? 'Pause ayah' : 'Play ayah once'"
                  aria-label="Play ayah once">
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
              <span>Press and hold the ayah below to peek · release to hide again</span>
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
		          </section>

          <section v-if="selfCheckReviewVisible" class="self-check-modal-recorder-grid"
            :class="{ 'saved-attempts-open': selfCheckSavedAttemptsVisible }">
            <article class="self-check-recorder-card"
              :class="{ recording: isSelfCheckRecording, reviewing: !!selfCheckActiveDraft }">
              <div class="self-check-recorder-head">
                <div>
                  <span class="self-check-kicker">Recitation review</span>
                  <strong>{{ recitationCheckRecording ? 'AI recitation listening' : selfCheckActiveDraft ? 'Review before saving': 'AI recitation review' }}</strong>
                  <p class="self-check-card-desc">{{ getSelfCheckRecorderDescription() }}</p>
                </div>
                <button class="self-check-library-link" type="button" @click="openRecordingsLibraryFromSelfCheck"
                  title="Browse all saved recordings for this session">
                  <i class="bi bi-collection-play"></i>
                  <span>{{ selfCheckModalAttempts.length ? 'Open Library' : 'Library' }}</span>
                </button>
              </div>

              <div class="self-check-recorder-meta self-check-recorder-meta-compact">
                <span>
                  <i class="bi bi-save2"></i>
                  {{ displayedSelfCheckModalHistory.length }} saved attempt{{ displayedSelfCheckModalHistory.length === 1 ? '' : 's' }}
                </span>
                <button class="self-check-library-link self-check-library-link-inline" type="button"
                  @click="openRecordingsLibraryFromSelfCheck">
                  <i class="bi bi-collection-play"></i>
                  <span>Open recordings</span>
                </button>
              </div>

              <div v-if="selfCheckError && selfCheckVerseKey === selfCheckModalVerse.key"
                class="self-check-status self-check-status-warning">
                <i class="bi bi-exclamation-triangle"></i>
                <span>{{ selfCheckError }}</span>
              </div>

              <div v-if="!supportsSelfCheckRecording()" class="self-check-status self-check-status-warning">
                <i class="bi bi-mic-mute"></i>
                <span>Recording is not available in this browser.</span>
              </div>

              <section v-if="recitationCheckVisible" class="recitation-check-panel recitation-check-panel-inline"
                aria-live="polite">
                <div class="recitation-check-head">
                  <div>
                    <span class="recitation-check-kicker">Recite Check</span>
                    <h2>{{ recitationCheckTitle }}</h2>
                  </div>
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
                    <span>Stop Check</span>
                  </button>
                </div>
                <div v-else-if="recitationCheckPreparing" class="recitation-check-status">
                  <i class="bi bi-arrow-repeat spin" aria-hidden="true"></i>
                  <span>Checking the recording...</span>
                </div>
                <div v-if="recitationCheckError" class="recitation-check-error">
                  {{ recitationCheckError }}
                </div>
                <div v-if="!recitationCheckRecording && !recitationCheckPreparing && !recitationCheckResult && !recitationCheckError"
                  class="recitation-check-idle">
                  <div class="recitation-check-idle-copy">
                    <span class="recitation-check-section-label">{{ recitationCheckPromptLabel }}</span>
                    <strong>{{ recitationCheckScope === 'session' ? 'Ready for the selected range.' : 'Ready for this ayah.' }}</strong>
                    <p>Use the AI recite tool in the header when you want to begin.</p>
                  </div>
                </div>
                <div v-if="recitationCheckResult" class="recitation-check-body recitation-check-results">
                  <div class="recitation-result-stats">
                    <article v-for="stat in getRecitationResultStats(recitationCheckResult)" :key="stat.key"
                      class="recitation-result-stat" :class="stat.tone">
                      <span>{{ stat.label }}</span>
                      <strong>{{ stat.value }}</strong>
                      <small>{{ stat.description }}</small>
                    </article>
                  </div>
                  <div class="recitation-insights-grid">
                    <div class="recitation-next-card">
                      <span>What to do next?</span>
                      <strong>{{ getRecitationRecommendationDisplay(recitationCheckResult) }}</strong>
                      <p>{{ getRecitationNextStep(recitationCheckResult) }}</p>
                    </div>
                    <div class="recitation-next-card ai-review-card">
                      <span>AI review check</span>
                      <p>{{ getAiRecitationPostReviewMessage(recitationCheckResult) }}</p>
                    </div>
                  </div>
                  <div v-if="getRecitationReviewArabic(recitationCheckResult, selfCheckModalVerse)"
                    class="recitation-review-ayah" dir="rtl"
                    v-html="getRecitationReviewArabic(recitationCheckResult, selfCheckModalVerse)"
                    @click="handleRecitationReviewWordClick($event, recitationCheckResult)"></div>
                  <div class="recitation-check-footnotes">
                    <div v-if="selfCheckLastSavedAyahKey === selfCheckModalVerse.key"
                      class="self-check-status self-check-status-success recitation-check-footnote recitation-saved-footnote">
                      <div class="recitation-saved-footnote-copy">
                        <i class="bi bi-check2-circle"></i>
                        <span>Saved to your recordings library for this ayah.</span>
                      </div>
                      <button class="banner-action recitation-saved-footnote-action" type="button"
                        @click="openRecordingsLibraryFromSelfCheck">
                        Go to recording library
                      </button>
                    </div>
                    <div class="self-check-status self-check-status-warning ai-recitation-disclaimer recitation-check-footnote">
                      <i class="bi bi-info-circle"></i>
                      <span>AI recitation feedback is a guide. Verify important mistakes against the ayah before you save or reset.</span>
                    </div>
                  </div>
                  <div class="recitation-result-actions">
                    <button class="btn-secondary self-check-action-btn" type="button" @click="discardRecitationCheckAttempt">
                      <i class="bi bi-x-circle"></i>
                      <span>Discard</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn" type="button" @click="resetDisplayedRecitationAyah">
                      <i class="bi bi-arrow-counterclockwise"></i>
                      <span>Reset Ayah</span>
                    </button>
                    <button class="btn-secondary self-check-action-btn recitation-delete-btn" type="button" @click="deleteRecitationCheckAttempt">
                      <i class="bi bi-trash3"></i>
                      <span>Delete</span>
                    </button>
                    <button class="btn-primary self-check-action-btn" type="button" @click="savePendingRecitationCheckAttempt">
                      <i class="bi bi-save2"></i>
                      <span>Save Attempt</span>
                    </button>
                  </div>
                </div>
              </section>

              <div v-else-if="isSelfCheckRecording" class="self-check-live-card">
                <div class="self-check-live-stage">
                  <div class="self-check-live-copy">
                    <strong>Recording now</strong>
                    <span>{{ getSelfCheckLiveDurationLabel() }} elapsed · speak clearly, then tap stop when
                      finished</span>
                  </div>
                  <div class="self-check-live-pulse" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div class="self-check-live-actions">
                  <button class="btn-secondary self-check-action-btn" type="button" @click="discardSelfCheckRecording">
                    <i class="bi bi-x-circle"></i>
                    <span>Discard</span>
                  </button>
                  <button class="btn-primary self-check-action-btn" type="button" @click="stopSelfCheckRecording">
                    <i class="bi bi-stop-circle"></i>
                    <span>Stop Recording</span>
                  </button>
                </div>
              </div>

              <div v-else-if="selfCheckPreparing" class="self-check-status self-check-status-info">
                <i class="bi bi-hourglass-split"></i>
                <span>{{ selfCheckPreparingLabel }}</span>
              </div>

              <div v-else-if="selfCheckActiveDraft" class="self-check-review-card">
                <div class="self-check-review-head">
                  <div>
                    <strong>Review this attempt</strong>
                    <span>{{ formatRecordingDate(selfCheckActiveDraft.recordedAt) }} · {{
                      formatRecordingDuration(selfCheckActiveDraft.durationSeconds) }}</span>
                  </div>
                  <audio class="self-check-review-audio" :src="selfCheckActiveDraft.audioSrc" controls preload="metadata"></audio>
                  <button class="player-btn self-check-preview-btn" type="button"
                    @click="toggleSelfCheckPreview(selfCheckModalVerse.key)">
                    <i class="bi"
                      :class="activeSelfCheckPreviewKey === selfCheckModalVerse.key ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    <span>{{ activeSelfCheckPreviewKey === selfCheckModalVerse.key ? 'Pause' : 'Play' }}</span>
                  </button>
                </div>

                <div class="self-check-result-block">
                  <div class="self-check-result-label">
                    <span class="self-check-kicker">Self-rating</span>
                  </div>
                  <div class="self-check-result-group" role="group" aria-label="Choose self-check result">
                    <button v-for="option in ['Excellent', 'Good', 'Needs Review']" :key="option" type="button"
                      class="self-check-result-btn"
                      :class="[getRecordingResultTone(option), { active: selfCheckActiveDraft.result === option }]"
                      :title="getSelfCheckResultHint(option)" @click="setSelfCheckDraftResult(option)">
                      <span class="self-check-result-btn-label">{{ option }}</span>
                      <span class="self-check-result-btn-hint">{{ getSelfCheckResultHint(option) }}</span>
                    </button>
                  </div>
                </div>

                <div class="self-check-review-actions">
                  <button class="btn-secondary self-check-action-btn" type="button" @click="discardSelfCheckRecording">
                    <i class="bi bi-trash3"></i>
                    <span>Discard</span>
                  </button>
                  <button class="btn-secondary self-check-action-btn" type="button"
                    @click="restartSelfCheckRecording(selfCheckModalVerse)">
                    <i class="bi bi-arrow-repeat"></i>
                    <span>Record Again</span>
                  </button>
                  <button class="btn-primary self-check-action-btn" type="button"
                    @click="saveSelfCheckRecording(selfCheckModalVerse)">
                    <i class="bi bi-save2"></i>
                    <span>Save Attempt</span>
                  </button>
                </div>
              </div>

            </article>

          </section>
        </div>
      </div>
    </div>

    <div v-if="showRecordingsLibrary" class="modal-overlay recordings-library-overlay"
      @click.self="closeRecordingsLibrary">
      <div class="modal-content modal-xl recordings-library-modal" role="dialog" aria-modal="true"
        aria-labelledby="recordingsLibraryTitle">
        <div class="modal-header recordings-library-header">
          <div class="recordings-library-head-copy">
            <h2 id="recordingsLibraryTitle">Recordings Library</h2>
            <div class="recordings-library-hierarchy">
              <span>{{ currentChapter?.name_simple || 'Saved session' }}</span>
              <span>{{ rangeStart }}-{{ rangeEnd }}</span>
              <span v-if="selectedRecordingsAyahGroup">Ayah {{ selectedRecordingsAyahGroup.ayahNumber }}</span>
              <span v-if="selectedRecordingsAyahGroup">{{ selectedRecordingsAyahGroup.recordings.length }} attempt{{
                selectedRecordingsAyahGroup.recordings.length === 1 ? '' : 's' }}</span>
            </div>
          </div>
          <div class="recordings-library-header-actions">
            <button v-if="recordingsLibraryReturnToSelfCheckKey" class="recordings-library-back-btn" type="button"
              @click="backToSelfCheckFromLibrary" aria-label="Back to self-check">
              <i class="bi bi-arrow-left"></i>
              <span>Back to Self-Check</span>
            </button>
            <button class="modal-close-btn" @click="closeRecordingsLibrary" aria-label="Close recordings library">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div class="modal-body recordings-library-body">
          <div v-if="isRecordingsLibraryLoading" class="recordings-library-loading">
            <i class="bi bi-hourglass-split"></i>
            <span>Loading recordings…</span>
          </div>

          <div v-else-if="!hasRecordingsLibraryEntries" class="recordings-library-empty">
            <div class="recordings-library-empty-icon">
              <i class="bi bi-mic"></i>
            </div>
            <h3>No recordings yet</h3>
            <p>Open Self-Check on any ayah in your session, record your recitation, and save the attempt. Every saved
              recording will appear here, grouped by surah and ayah.</p>
          </div>

          <div v-else class="recordings-library-shell">
            <aside class="recordings-library-nav">
              <div class="recordings-library-nav-head">
                <div>
                  <span class="recordings-library-nav-kicker">Saved session</span>
                  <strong>{{ currentChapter?.name_simple || 'Session recordings' }}</strong>
                  <div class="recordings-library-nav-meta">
                    <span>Range {{ rangeStart }}-{{ rangeEnd }}</span>
                    <span>{{ filteredRecordingsAyahCount }} ayah{{ filteredRecordingsAyahCount === 1 ? '' : 's'
                      }}</span>
                  </div>
                </div>
                <button class="recordings-library-nav-toggle" type="button" @click="toggleRecordingsNav">
                  <span>{{ recordingsNavExpanded ? 'Hide list' : 'Show list' }}</span>
                  <i class="bi" :class="recordingsNavExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                </button>
              </div>

              <div class="recordings-library-search">
                <div class="recordings-library-search-field">
                  <i class="bi bi-search"></i>
                  <input v-model.trim="recordingsLibrarySearch" type="search" placeholder="Search surah or ayah number"
                    aria-label="Search recorded ayahs">
                </div>
              </div>

              <div v-show="recordingsNavExpanded" class="recordings-library-nav-scroll">
                <div v-for="surahGroup in filteredRecordingsAyahGroups"
                  :key="surahGroup.chapterId || surahGroup.chapterName" class="recordings-library-surah-group">
                  <div class="recordings-library-surah-title">{{ surahGroup.chapterName }}</div>
                  <div v-for="ayahGroup in surahGroup.ayahs" :key="ayahGroup.ayahKey"
                    class="recordings-library-ayah-group">
                    <button type="button" class="recordings-library-ayah-item"
                      :class="{ active: ayahGroup.ayahKey === selectedRecordingsAyahKey }"
                      @click="selectRecordingsAyah(ayahGroup.ayahKey)">
                      <span class="recordings-library-ayah-label">Ayah {{ ayahGroup.ayahNumber }}</span>
                      <span class="recordings-library-ayah-count">{{ ayahGroup.recordings.length }}</span>
                    </button>
                    <transition name="recordings-group-expand">
                      <div v-if="ayahGroup.ayahKey === selectedRecordingsAyahKey" class="recordings-library-recordings">
                        <article v-for="recording in ayahGroup.recordings" :key="recording.id"
                          class="recordings-library-recording-item"
                          :class="{ playing: recording.id === activeRecordingPlaybackId }">
                          <div class="recordings-library-recording-copy">
                            <strong>{{ getRecordingAttemptLabel(recording) }}</strong>
                            <span>{{ isAiCheckRecording(recording) ? `${getRecordingTypeLabel(recording)} · Word review` :
                              `Manual recording · ${formatRecordingTimestamp(recording.recordedAt)}` }}</span>
                          </div>
                          <button v-if="recording.audioSrc" class="player-btn recording-history-action"
                            type="button" @click="toggleRecordingPlayback(recording)">
                            <i class="bi"
                              :class="recording.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                          </button>
                          <span v-else class="recordings-library-ai-score"
                            :class="getRecitationScoreTone(null)">AI</span>
                        </article>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
            </aside>

            <section class="recordings-library-detail">
              <div v-if="selectedRecordingsAyahGroup" class="recordings-library-detail-head">
                <div>
                  <span class="recordings-library-detail-kicker">Selected ayah</span>
                  <span class="recordings-library-detail-kicker">{{ selectedRecordingsAyahGroup.chapterName }}</span>
                  <h3>Ayah {{ selectedRecordingsAyahGroup.ayahNumber }}</h3>
                  <div class="recordings-library-detail-meta">
                    <span>{{ selectedRecordingsAyahGroup.recordings.length }} attempt{{
                      selectedRecordingsAyahGroup.recordings.length === 1 ? '' : 's' }}</span>
                    <span>Session {{ selectedRecordingsAyahGroup.recordings[0]?.sessionRangeStart || rangeStart }}-{{
                      selectedRecordingsAyahGroup.recordings[0]?.sessionRangeEnd || rangeEnd }}</span>
                  </div>
                  <p v-if="getAyahTranslation(selectedRecordingsAyahGroup.ayahKey)"
                    class="recordings-library-ayah-translation">
                    {{ getAyahTranslation(selectedRecordingsAyahGroup.ayahKey) }}
                  </p>
                </div>
                <div class="recordings-library-detail-count">
                  {{ selectedRecordingsAyahGroup.recordings.length }}
                </div>
              </div>

              <div v-if="selectedRecordingsAyahGroup" class="recordings-library-history">
                <article v-for="recording in selectedRecordingsAyahHistory" :key="recording.id"
                  class="recording-history-card" :class="{ playing: recording.id === activeRecordingPlaybackId }">
                  <div class="recording-history-top">
                    <div class="recording-history-copy">
                      <div class="recording-history-kicker">{{ getRecordingAttemptLabel(recording) }}</div>
                      <span>{{ formatRecordingTimestamp(recording.recordedAt) }}</span>
                      <p class="recording-history-note">{{ isAiCheckRecording(recording) ? `${getRecordingTypeLabel(recording)} result` :
                        `Self-rated · ${recording.result}` }}</p>
                    </div>
                    <span v-if="isAiCheckRecording(recording)" class="recording-result-pill recording-result-pill-ai"
                      :class="getRecitationScoreTone(null)">
                      AI check
                    </span>
                    <span v-else class="recording-result-pill" :class="getRecordingResultTone(recording.result)">
                      {{ recording.result }}
                    </span>
                  </div>

                  <div class="recording-history-meta">
                    <span v-if="!isAiCheckRecording(recording)"><i class="bi bi-clock-history"></i> {{
                      formatRecordingDuration(recording.durationSeconds) }}</span>
                    <span v-else><i class="bi bi-stars"></i> {{ getRecitationMistakeSummary(recording.mistakeBreakdown
                      ||
                      recording.mistakes) }}</span>
                    <span><i class="bi bi-calendar3"></i> {{ formatRecordingDate(recording.recordedAt) }}</span>
                  </div>

                  <div v-if="isAiCheckRecording(recording)" class="recording-history-ai-detail">
                    <div class="recitation-result-stats">
                      <article v-for="stat in getRecitationResultStats(recording)" :key="stat.key"
                        class="recitation-result-stat" :class="stat.tone">
                        <span>{{ stat.label }}</span>
                        <strong>{{ stat.value }}</strong>
                        <small>{{ stat.description }}</small>
                      </article>
                    </div>
                    <div class="recitation-next-card">
                      <span>What next?</span>
                      <strong>{{ getRecitationRecommendationDisplay(recording) }}</strong>
                      <p>{{ getRecitationNextStep(recording) }}</p>
                    </div>
                    <div class="recitation-next-card">
                      <span>Deterministic replay</span>
                      <strong :class="getRecitationValidationTone(recording)">{{ getRecitationValidationLabel(recording) }}</strong>
                      <p>{{ getRecitationValidationSummary(recording) }}</p>
                    </div>
                    <div v-if="getRecitationReviewArabic(recording)" class="recitation-review-ayah" dir="rtl"
                      v-html="getRecitationReviewArabic(recording)"></div>
                  </div>

                  <div class="recording-history-actions">
                    <button v-if="recording.audioSrc" class="player-btn recording-history-action"
                      type="button" @click="toggleRecordingPlayback(recording)">
                      <i class="bi"
                        :class="recording.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                      <span>{{ recording.id === activeRecordingPlaybackId ? 'Pause' : 'Play' }}</span>
                    </button>
                    <button class="player-btn recording-history-action recording-history-action-delete" type="button"
                      @click="promptDeleteRecording(recording.id)">
                      <i class="bi bi-trash3"></i>
                      <span>Delete</span>
                    </button>
                  </div>

                </article>
              </div>

              <div v-else class="recordings-library-empty recordings-library-empty-panel">
                <div class="recordings-library-empty-icon">
                  <i class="bi bi-journal-music"></i>
                </div>
                <h3>{{ recordingsLibrarySearch ? 'No matching ayah' : 'Choose an ayah' }}</h3>
                <p>{{ recordingsLibrarySearch ? 'Try a different surah name or ayah number, or clear the search to see all recorded ayahs.' : 'Pick an ayah from the list on the left to view its saved attempts and playback history.' }}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPostLoginOnboarding" class="modal-overlay post-onboarding-overlay" @click.self="skipOnboarding">
      <div class="modal-content post-onboarding-modal" role="dialog" aria-modal="true"
        aria-labelledby="postOnboardingTitle">
        <div class="modal-header post-onboarding-header">
          <h2 id="postOnboardingTitle">{{ onboardingStepContent.title }}</h2>
          <button class="modal-close-btn" @click="skipOnboarding" aria-label="Skip onboarding">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="modal-body post-onboarding-body">
          <span class="post-onboarding-kicker">Step {{ onboardingStepIndex + 1 }} of {{ onboardingSteps.length }}</span>
          <div class="post-onboarding-step-label">{{ onboardingStepContent.stepLabel }}</div>
          <p>{{ onboardingStepContent.body }}</p>
          <ul v-if="onboardingStepContent.points?.length" class="post-onboarding-points">
            <li v-for="item in onboardingStepContent.points" :key="item">{{ item }}</li>
          </ul>
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
          <div v-if="onboardingStepContent.preview" class="post-onboarding-preview">
            <div class="post-onboarding-preview-head">
              <span class="post-onboarding-preview-icon"><i class="bi" :class="onboardingStepContent.preview.icon"></i></span>
              <div>
                <strong>{{ onboardingStepContent.preview.title }}</strong>
                <small>{{ onboardingStepContent.preview.subtitle }}</small>
              </div>
            </div>
            <div class="post-onboarding-preview-grid">
              <span v-for="item in onboardingStepContent.preview.items" :key="item">
                <i class="bi bi-check2"></i>{{ item }}
              </span>
            </div>
          </div>
          <div v-if="onboardingStepContent.duas?.length" class="dua-onboarding-grid">
            <article v-for="dua in onboardingStepContent.duas" :key="dua.title" class="dua-onboarding-card">
              <span class="dua-onboarding-title">{{ dua.title }}</span>
              <p class="dua-onboarding-arabic" dir="rtl" lang="ar">{{ dua.arabic }}</p>
              <p class="dua-onboarding-translation">{{ dua.translation }}</p>
              <small class="dua-onboarding-source">{{ dua.source }}</small>
            </article>
          </div>
          <div class="post-onboarding-progress">
            <span v-for="dot in onboardingSteps.length" :key="`ob-dot-${dot}`"
              :class="{ active: onboardingStepIndex === dot - 1 }"></span>
          </div>
        </div>
        <div class="modal-footer post-onboarding-footer">
          <button class="btn-secondary" @click="skipOnboarding">Skip</button>
          <button v-if="onboardingStepIndex < onboardingSteps.length - 1" class="btn-primary"
            @click="nextOnboardingStep">Next</button>
          <button v-else class="btn-primary" @click="completeOnboardingAndStart">
            {{ onboardingManualLaunch ? 'Finish' : 'Use sample session' }}
          </button>
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

    <!-- Global Audio Player - Updated with Speed Controls -->
    <transition name="slide-up">
      <div v-if="appReady && playerVisible" class="player-bar" :class="{ collapsed: playerCollapsed }" role="region"
        aria-label="Audio player">
        <div class="player-main">
          <div class="player-info">
            <div class="player-chapter">{{ currentChapter?.name_simple || 'Quran' }}</div>
            <div class="player-verse">
              {{ activeAyahLabel }}
              <span v-if="etaLabel && isPlaying" class="player-eta" :title="getEtaTooltip()">
                &bull; {{ etaLabel }} remaining
              </span>
            </div>
          </div>

          <div class="player-controls">
            <button class="player-btn" @click="prev" title="Previous" type="button" aria-label="Previous ayah">
              <i class="bi bi-skip-start-fill" aria-hidden="true"></i>
            </button>
            <button class="player-btn player-play" @click="togglePlay" title="Play/Pause" type="button"
              :aria-label="isPlaying ? 'Pause audio' : 'Play audio'">
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
            </button>
            <button class="player-btn" @click="next" title="Next" type="button" aria-label="Next ayah">
              <i class="bi bi-skip-end-fill" aria-hidden="true"></i>
            </button>
          </div>

          <div class="player-progress-wrap">
            <div class="player-progress-bg" @click="seek" ref="progress" role="progressbar" aria-label="Audio progress"
              :aria-valuenow="Math.round((currentTime / (duration || 1)) * 100)" aria-valuemin="0" aria-valuemax="100">
              <div class="player-progress-fill" :style="{ width: (currentTime / (duration || 1)) * 100 + '%' }"></div>
            </div>
          </div>




          <button class="player-btn" @click="playerVisible = false" title="Close player" type="button"
            aria-label="Close audio player">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </transition>

    <!-- Audio System -->
    <audio ref="audio" style="display:none"></audio>
    <audio ref="recordingsAudio" style="display:none"></audio>

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
          Enter a minimum of 3 words. Results match the same passage in Arabic text or translation.
        </p>

        <div class="quran-search-controls">
          <div class="quran-search-filter-grid">
            <label>
              <span>Filter</span>
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
                <option value="">Any surah</option>
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
              <span>Font</span>
            </button>
            <span class="quran-search-font-pill">{{ quranSearchFontSize }}px</span>
            <button class="pill-control" type="button" @click="adjustQuranSearchFont(4)">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              <span>Font</span>
            </button>
          </div>
        </div>

        <div v-if="quranSearchError" class="quran-search-status error">{{ quranSearchError }}</div>
        <div v-else-if="quranSearchLoading" class="quran-search-status">
          <i class="bi bi-hourglass-split" aria-hidden="true"></i>
          <span>Loading Quran search index...</span>
        </div>
        <div v-else-if="quranSearchHasRun && !filteredQuranSearchResults.length" class="quran-search-status">
          No matching ayahs found for this passage and filter.
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
</template>

<script src="./Memorisation.js"></script>

<style src="./Memorisation.css"></style>
