<template>
  <div class="app" :data-theme="theme" :style="appStyleVars" v-cloak>
    <div v-if="appReady && banner" class="banner" :class="banner.kind" role="status" aria-live="polite">
      <span>{{ banner.message }}</span>
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
      'focus-mode-active': focusModeEnabled,
      'blur-mode-active': blurModeEnabled,
      'flow-practice': guidedUiStep === 'practice',
      'flow-recall': guidedUiStep === 'recall'
    }">
      <div class="content">
        <section v-if="!hasVerses && !currentConfig.chapterId" class="home-dashboard home-dashboard-minimal">
          <div v-if="hasContinueSession" class="continue-session-card">
            <div class="continue-session-copy">
              <span class="continue-session-kicker">Continue where you left off</span>
              <strong>{{ continueSessionLabel }}</strong>
              <small>{{ continueSessionMeta }}</small>
            </div>
            <div class="continue-session-actions">
              <button class="cta cta-primary continue-session-btn" @click="continueLastSession">
                <i class="bi bi-play-fill"></i> Continue Session
              </button>
              <button class="cta cta-ghost continue-session-dismiss" @click="confirmDiscardContinueSession" type="button" aria-label="Discard saved session">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="offcanvas-launcher-card">
            <div class="offcanvas-launcher-head">
              <span class="offcanvas-launcher-kicker"><i class="bi bi-compass"></i> {{ t('home.startKicker') }}</span>
              <strong class="offcanvas-launcher-title">{{ t('home.startTitle') }}</strong>
            </div>
            <div class="offcanvas-launcher-steps" aria-label="Session setup steps">
              <span><i class="bi bi-journal-text"></i> {{ t('home.selectSurah') }}</span>
              <span><i class="bi bi-bounding-box"></i> {{ t('home.pickRange') }}</span>
              <span><i class="bi bi-arrow-repeat"></i> {{ t('home.setRepeats') }}</span>
            </div>
            <button class="cta cta-primary setup-primary" type="button" aria-controls="memorisationToolsPanel"
              :aria-expanded="showTools ? 'true' : 'false'" @click="openToolsPanel()" title="Open controls" aria-label="Open session setup controls">
              <i class="bi bi-toggles2" aria-hidden="true"></i>
            </button>
            <p class="offcanvas-launcher-copy">
              {{ t('home.controlsHint') }}
            </p>
          </div>
        </section>

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
            <button class="toolbar-chip" :class="{ active: showWordByWord }" title="Show word-by-word meaning chips"
              @click="toggleReadingOption('wbw')">
              <i class="bi bi-grid-3x2-gap"></i><span>Word by word</span>
            </button>
            <button class="toolbar-chip" :class="{ active: wordByWordAudioEnabled }"
              title="Enable audio for individual word chips" @click="wordByWordAudioEnabled = !wordByWordAudioEnabled">
              <i class="bi bi-volume-up"></i><span>Word audio</span>
            </button>

            <!-- ADD TAJWEED PILL HERE -->
            <button class="toolbar-chip" :class="{ active: tajweedEnabled }"
              title="Show tajweed colouring from the Quran API" @click="toggleTajweed">
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
        <div v-if="!isDataReady" class="loading-spinner">
          <i class="bi bi-hourglass-split"></i>
          <span>Loading...</span>
        </div>
        <div v-else-if="hasVerses" class="workspace">
          <section class="workspace-shell" :class="{ collapsed: mainCardCollapsed }" aria-label="Session overview">
            <div class="workspace-shell-head">
              <div class="workspace-shell-copy">
                <span class="workspace-shell-kicker">
                  {{ isSessionCompleted ? 'Session completed' : (hasSessionStarted ? 'Active session' : 'Session ready') }}
                </span>
                <div class="workspace-shell-title-row">
                  <h1>{{ currentChapter ? currentChapter.name_simple : activeChapterName }}</h1>
                </div>
                <p>{{ currentPosition }} of {{ totalVerses }} ayahs · {{ progressPercent }}% complete<span v-if="etaLabel"> · {{ etaLabel }} left</span></p>
                <div v-show="!mainCardCollapsed" class="workspace-shell-compact-meta">
                  <span v-if="reviewPriorityLabel">{{ reviewPriorityLabel }}</span>
                </div>
              </div>
              <div class="workspace-shell-actions">
                <!-- <div v-if="isSessionCompleted" class="session-completed-indicator" aria-live="polite">
                  <i class="bi bi-check2-circle"></i>
                  <span>Session Completed</span>
                </div> -->
                <div class="action-buttons-group">
                  <button class="action-btn action-btn-primary" type="button" @click="handlePrimaryAction"
                    :disabled="!isPlaying && !canStartSession">
                    <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
                    <span>{{ isPlaying ? t('common.pause') : t('common.startSession') }}</span>
                  </button>
                  <button class="action-btn action-btn-secondary action-btn-recordings" type="button" @click="openRecordingsLibrary"
                    title="Open recordings library" aria-label="Open recordings library">
                    <i class="bi bi-collection-play" aria-hidden="true"></i>
                    <span>View All Recordings</span>
                  </button>
                  <button class="action-btn action-btn-secondary" type="button" @click="openAdvancedControls"
                    title="Open session controls" aria-label="Open session controls">
                    <i class="bi bi-sliders" aria-hidden="true"></i>
                    <span>Controls</span>
                  </button>
                  <button v-if="hasSessionStarted" class="action-btn action-btn-secondary action-btn-exit" type="button" @click="openSessionExitModal"
                    title="End session" aria-label="End session">
                    <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                    <span>End Session</span>
                  </button>
                  <div class="workspace-shell-icon-actions">
                    <button class="action-icon-btn" @click="toggleKeyboardShortcuts" title="Keyboard shortcuts" type="button" aria-label="Open keyboard shortcuts">
                      <i class="bi bi-keyboard" aria-hidden="true"></i>
                    </button>
                    <button class="action-icon-btn" @click="openOnboardingModal(true)" title="How Mutqin works" type="button" aria-label="Open help">
                      <i class="bi bi-question-circle" aria-hidden="true"></i>
                    </button>
                    <button class="action-icon-btn" @click="toggleFullScreen" title="Full screen mode" type="button" aria-label="Toggle full screen mode">
                      <i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Keyboard Shortcuts Modal -->
            <div v-if="showKeyboardShortcuts" class="keyboard-shortcuts-modal" role="presentation"
              @click.self="showKeyboardShortcuts = false">
              <div class="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="keyboardShortcutsTitle" @keydown.esc.prevent="showKeyboardShortcuts = false" tabindex="-1">
                <div class="shortcuts-modal-header">
                  <h3 id="keyboardShortcutsTitle">
                    <i class="bi bi-keyboard" aria-hidden="true"></i>
                    <span>Keyboard Shortcuts</span>
                  </h3>
                  <button class="shortcuts-modal-close" @click="showKeyboardShortcuts = false" type="button" aria-label="Close keyboard shortcuts">
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                  </button>
                </div>
                <div class="shortcuts-modal-body">
                  <div class="shortcuts-grid">
                    <div class="shortcut-card">
                      <div class="shortcut-card-title">Navigation</div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>↑</kbd></div>
                        <span>Previous verse</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>↓</kbd></div>
                        <span>Next verse</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>←</kbd> / <kbd>J</kbd></div>
                        <span>Previous in queue</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>→</kbd> / <kbd>K</kbd></div>
                        <span>Next in queue</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>Home</kbd></div>
                        <span>First verse</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>End</kbd></div>
                        <span>Last verse</span>
                      </div>
                    </div>
                    <div class="shortcut-card">
                      <div class="shortcut-card-title">Playback</div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>Hold</kbd> <kbd>Space</kbd></div>
                        <span>Peek blurred upcoming ayahs</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>Enter</kbd></div>
                        <span>Play current verse</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>P</kbd></div>
                        <span>Play / Pause audio</span>
                      </div>
                    </div>
                    <div class="shortcut-card">
                      <div class="shortcut-card-title">Session</div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>S</kbd></div>
                        <span>Save session</span>
                      </div>
                      <div class="shortcut-row">
                        <div class="shortcut-keys"><kbd>Esc</kbd></div>
                        <span>Close modals</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-show="!mainCardCollapsed" class="workspace-quick-controls" aria-label="Quick reading controls">
              <div class="quick-pill-group-list">
                <div class="view-mode-toggle" role="group" aria-label="Reading layout">
                  <button
                    type="button"
                    class="view-mode-btn"
                    :class="{ active: readingViewMode === 'stacked' }"
                    @click="setReadingViewMode('stacked')"
                    title="Show each ayah in a stacked card layout"
                  >
                    <i class="bi bi-view-stacked"></i>
                    <span>Stacked</span>
                  </button>
                  <button
                    type="button"
                    class="view-mode-btn"
                    :class="{ active: readingViewMode === 'mushaf' }"
                    @click="setReadingViewMode('mushaf')"
                    title="Show ayahs in an interactive mushaf-style page"
                  >
                    <i class="bi bi-book"></i>
                    <span>Mushaf</span>
                  </button>
                </div>
                <button class="toolbar-chip toolbar-chip-sm" :class="{ active: showTranslation }" @click="toggleReadingOption('translation')" type="button">Translation</button>
                <button class="toolbar-chip toolbar-chip-sm" :class="{ active: showTransliteration }" @click="toggleReadingOption('transliteration')" type="button">Transliteration</button>
                <button class="toolbar-chip toolbar-chip-sm" :class="{ active: showWordByWord }" @click="toggleReadingOption('wbw')" type="button">Word by word</button>
                <button class="toolbar-chip toolbar-chip-sm" :class="{ active: wordByWordAudioEnabled }" @click="toggleWordAudio()" type="button">Word audio</button>
                <button class="toolbar-chip toolbar-chip-sm" :class="{ active: tajweedEnabled }" @click="toggleTajweed" type="button">Tajweed</button>
                <div class="font-dropdown quick-font-dropdown">
                  <button class="toolbar-chip toolbar-chip-sm font-dropdown-trigger" @click.stop="toggleFontDropdown" type="button" title="Change Quran font">
                    <span>Font: {{ getCurrentFontLabel() }}</span>
                    <i class="bi" :class="fontDropdownOpen ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                  </button>
                  <transition name="dropdown-fade">
                    <div v-if="fontDropdownOpen" class="font-dropdown-menu quick-font-menu">
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
          </section>

          <main id="memorisationWorkspaceMain" ref="workspaceMain" class="workspace-main"
            aria-label="Memorisation workspace">
            <div v-if="readingViewMode === 'mushaf'" class="mushaf-workspace">
              <div class="mushaf-frame">
                <div
                  ref="mushafViewport"
                  class="mushaf-viewport"
                  :class="`mushaf-bg-${mushafBackground}`"
                >
                  <div v-if="!mushafPages.length" class="mushaf-empty-page">
                    <i class="bi bi-book"></i>
                    <strong>Mushaf page is preparing</strong>
                    <span>Ayahs are loaded, but the mushaf page list has not synced yet. Switch back to Stacked or reopen this session.</span>
                  </div>
                  <div class="mushaf-track" :style="mushafTrackStyle">
                    <article
                      v-for="(page, pageIndex) in mushafPages"
                      :key="page.id"
                      class="mushaf-page"
                      :class="[`mushaf-bg-${mushafBackground}`, { active: pageIndex === safeMushafPageIndex }]"
                      :aria-hidden="pageIndex === safeMushafPageIndex ? 'false' : 'true'"
                    >
                      <div class="mushaf-sheet-tools" aria-label="Mushaf controls">
                        <div class="mushaf-font-controls">
                          <button type="button" @click.stop="decreaseMushafFontSize" title="Decrease mushaf font size">
                            <i class="bi bi-dash-lg"></i>
                          </button>
                          <span>{{ getTextScalePercent() }}%</span>
                          <button type="button" @click.stop="increaseMushafFontSize" title="Increase mushaf font size">
                            <i class="bi bi-plus-lg"></i>
                          </button>
                        </div>
                        <div class="mushaf-bg-picker" title="Change mushaf background">
                          <button
                            v-for="option in mushafBackgroundOptions"
                            :key="option.value"
                            type="button"
                            class="mushaf-bg-swatch"
                            :class="[`mushaf-bg-swatch-${option.value}`, { active: mushafBackground === option.value }]"
                            @click.stop="setMushafBackground(option.value)"
                            :aria-label="`Use ${option.label} background`"
                          ></button>
                        </div>
                        <button v-if="activeVerseRef" type="button" @click.stop="playVerse(activeVerseRef)" :title="isPlaying ? 'Pause active ayah' : 'Play active ayah'">
                          <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                        </button>
                        <button v-if="activeVerseRef" type="button" @click.stop="openSelfCheckModal(activeVerseRef)" title="Open self-check recorder">
                          <i class="bi bi-mic"></i>
                        </button>
                      </div>
                      <header class="mushaf-page-header" dir="rtl">
                        <h2>{{ mushafSurahTitle }}</h2>
                        <div v-if="showMushafBismillah" class="mushaf-bismillah" aria-label="Bismillah">
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </div>
                      </header>
                      <div class="mushaf-page-body" dir="rtl">
                        <span
                          v-for="verse in page.verses"
                          :key="verse.key"
                          role="button"
                          tabindex="0"
                          :data-verse-key="verse.key"
                          class="mushaf-ayah"
                          :class="{
                            active: effectiveActiveVerseKey === verse.key,
                            'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key),
                            'peek-revealed': isVersePeekRevealed(verse.key),
                            'review-priority': isReviewPriorityAyah(verse.key),
                            'is-playing': activeVerseKey === verse.key && isPlaying
                          }"
                          @click="onVerseCardClick(verse)"
                          @mouseenter="onMushafAyahEnter(verse)"
                          @mouseleave="onMushafAyahLeave(verse)"
                          @keydown.enter.prevent="onVerseCardClick(verse)"
                          @keydown.space.prevent="onVerseCardClick(verse)"
                          @touchstart.passive="onVerseTouchStart($event, verse.key)"
                          @touchend.passive="onVerseTouchEnd($event, verse.key)"
                          @touchcancel.passive="clearTouchPeek"
                        >
                          <span
                            class="mushaf-ayah-text"
                            v-html="getDisplayArabic(verse)"
                            :class="{
                              'tajweed-enabled': tajweedEnabled,
                              'word-highlight-enabled': true,
                              'verse-weak': isWeakAyah(verse.key),
                              'verse-mastered': isMasteredAyah(verse.key)
                            }"
                            :style="{
                              '--verse-font-percent': getVerseFontSize(verse.key),
                              'font-family': quranFontFamily
                            }"
                          ></span>
                          <span class="mushaf-ayah-number">{{ verse.number }}</span>
                          <span v-if="hoveredMushafVerseKey === verse.key" class="mushaf-ayah-hover-tools" dir="ltr" @click.stop>
                            <button type="button" @click="playVerse(verse, { manualOnly: true })" title="Play this ayah only">
                              <i class="bi bi-play-fill"></i>
                            </button>
                          </span>
                        </span>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="verses-grid">
              <div v-for="verse in verses" :key="verse.key" :data-verse-key="verse.key" class="verse-card" :class="{
                active: effectiveActiveVerseKey === verse.key,
                'serious-training': false,
                'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key),
                'peek-revealed': isVersePeekRevealed(verse.key)
              }" @click="onVerseCardClick(verse)" role="button" tabindex="0"
                @mouseenter="onVersePeekEnter(verse.key)" @mouseleave="onVersePeekLeave(verse.key)"
                @touchstart.passive="onVerseTouchStart($event, verse.key)" @touchend.passive="onVerseTouchEnd($event, verse.key)"
                @touchcancel.passive="clearTouchPeek"
                          @keydown.enter.prevent="onVerseCardClick(verse)"
                          @keydown.space.prevent="onVerseCardClick(verse)"
                          :aria-label="`Open ayah ${verse.number}${effectiveActiveVerseKey === verse.key ? ', active ayah' : ''}`">
                <div class="verse-header">
                  <div class="verse-badges">
                    <span class="verse-number">Ayah {{ verse.number }}</span>
                    <span v-if="isReviewPriorityAyah(verse.key)"
                      class="verse-status-badge verse-status-badge-review">Review Due</span>
                    <span v-if="effectiveActiveVerseKey === verse.key" class="verse-status-badge">Active Ayah</span>
                  </div>
                  <div class="verse-actions">
                    <div class="verse-font-inline-controls" @click.stop>
                      <button class="verse-font-inline-btn" @click="decreaseTextScale($event)" title="Decrease text size" type="button" aria-label="Decrease ayah text size">
                        <i class="bi bi-dash-lg" aria-hidden="true"></i>
                      </button>
                      <span class="verse-font-inline-value">{{ getTextScalePercent() }}%</span>
                      <button class="verse-font-inline-btn" @click="increaseTextScale($event)" title="Increase text size" type="button" aria-label="Increase ayah text size">
                        <i class="bi bi-plus-lg" aria-hidden="true"></i>
                      </button>
                    </div>
                    <!-- Small play button next to play pill -->
                    <button class="verse-small-play-btn" @click.stop="playVerse(verse)"
                      :title="hasSessionFeedback ? (activeVerseKey === verse.key && isPlaying ? 'Pause' : 'Play current ayah') : 'Preview this ayah (does not start a session)'"
                      type="button"
                      :aria-label="hasSessionFeedback ? (activeVerseKey === verse.key && isPlaying ? `Pause ayah ${verse.number}` : `Play ayah ${verse.number}`) : `Preview ayah ${verse.number}`">
                      <i class="bi"
                        :class="activeVerseKey === verse.key && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    </button>

                    <!-- Download button for every verse -->
                    <button class="verse-download-btn" @click.stop="downloadVerseAudio(verse)" :disabled="!verse.audio"
                      title="Download audio for offline listening" type="button" :aria-label="`Download audio for ayah ${verse.number}`">
                      <i class="bi bi-download" aria-hidden="true"></i>
                    </button>

                    <button
                      class="verse-self-check-btn"
                      :class="{ active: showSelfCheckModal && selfCheckVerseKey === verse.key }"
                      @click.stop="openSelfCheckModal(verse)"
                      :title="showSelfCheckModal && selfCheckVerseKey === verse.key ? 'Self-check is open' : 'Open self-check recorder'"
                    >
                      <i class="bi" :class="showSelfCheckModal && selfCheckVerseKey === verse.key ? 'bi-mic-fill' : 'bi-mic'" aria-hidden="true"></i>
                      <span>Self-Check</span>
                      <em v-if="getAyahRecordingCount(verse.key)">{{ getAyahRecordingCount(verse.key) }}</em>
                    </button>

                    <span v-if="!hasSessionFeedback" class="verse-preview-label">Preview</span>
                  </div>
                </div>

                <div class="verse-arabic verse-arabic-primary" dir="rtl" v-if="verse.arabic && isDataReady"
                  v-html="getDisplayArabic(verse)" :class="{
                    'tajweed-enabled': tajweedEnabled,
                    'word-highlight-enabled': true,
                    'verse-weak': isWeakAyah(verse.key),
                    'verse-mastered': isMasteredAyah(verse.key)
                  }" :style="{
                    '--verse-font-percent': getVerseFontSize(verse.key),
                    'font-family': quranFontFamily
                  }">
                </div>

                <!-- Keep in-workspace aids available, but visually quieter -->
                <div v-if="showTransliteration && verse.transliteration" class="verse-aid-block">
                  <div class="verse-aid-title">Transliteration</div>
                  <div class="verse-transliteration verse-aid">
                  {{ verse.transliteration }}
                  </div>
                </div>
                <div v-if="showTranslation && verse.translation" class="verse-aid-block">
                  <div class="verse-aid-title">Translation</div>
                  <div class="verse-translation verse-aid">
                  {{ verse.translation }}
                  </div>
                </div>
                <div v-if="showWordByWord && verse.words && verse.words.length" class="verse-words verse-aid"
                  @scroll="onVerseWordsScroll(verse.key, $event)">
                  <div v-for="(word, wi) in verse.words" :key="wi" class="word-item"
                    :class="{ highlighted: currentHighlightedVerseKey === verse.key && currentWordIndex === wi, 'phrase-highlighted': currentHighlightedVerseKey === verse.key && currentPhraseIndex === wi }"
                    tabindex="-1">
                    <span class="word-arabic" dir="rtl">{{ word.ar }}</span>
                    <span class="word-meaning">{{ word.en }}</span>
                    <button v-if="word.audio && wordByWordAudioEnabled" class="word-audio-btn"
                      type="button"
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
      <div
        class="tools-backdrop"
        :class="{ open: showTools }"
        @click="closeToolsPanel"
        aria-hidden="true"
      ></div>
      <aside 
          id="memorisationToolsPanel" 
          ref="toolsPanel" 
          class="tools offcanvas-section" 
          :class="{ 'open': showTools }"
          @click.stop
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="memorisationToolsTitle"
          :aria-hidden="showTools ? 'false' : 'true'" 
          tabindex="-1"
          @keydown.esc.prevent="closeToolsPanel"
        >
        <div class="tools-top">
          <div class="tools-topbar">
            <div id="memorisationToolsTitle" class="tools-title">
              <h3><b>Controls</b></h3>
            </div>
            <button class="tools-x" @click="closeToolsPanel" aria-label="Close panel" type="button">
              <span class="tools-x-glyph" aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="tools-tabs" role="tablist" aria-label="Controls tabs">
            <button role="tab" :aria-selected="tab === 'tools' ? 'true' : 'false'" :class="{ active: tab === 'tools' }" @click.prevent="setActiveTab('tools')" title="Session tools"
              type="button">
              <i class="bi bi-sliders"></i> Session
            </button>
            <button role="tab" :aria-selected="tab === 'techniques' ? 'true' : 'false'" :class="{ active: tab === 'techniques' }" @click.prevent="setActiveTab('techniques')"
              title="Practice presets" type="button">
              <i class="bi bi-stars"></i> Practice
            </button>
            <button role="tab" :aria-selected="tab === 'saved' ? 'true' : 'false'" :class="{ active: tab === 'saved' }" @click.prevent="setActiveTab('saved')" title="Saved sessions"
              type="button">
              <i class="bi bi-clock-history"></i> Saved
            </button>
            <button v-if="isLoggedIn" role="tab" :aria-selected="tab === 'stats' ? 'true' : 'false'" :class="{ active: tab === 'stats' }" @click.prevent="setActiveTab('stats')" title="Session insights"
              type="button">
              <i class="bi bi-bar-chart-line"></i> Insights
            </button>
            <!-- <button :class="{ active: tab === 'settings' }" @click.prevent="setActiveTab('settings')" type="button">
              <i class="bi bi-gear"></i> Settings
            </button> -->
          </div>
        </div>

        <div ref="toolsBody" class="tools-body compact">
          <!-- TOOLS TAB -->
          <div v-if="tab === 'tools'" class="sheet">
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
                    <div class="setup-metric-list" aria-label="Verse play counts">
                      <div v-if="sessionVersePlaySummary.length" v-for="item in sessionVersePlaySummary" :key="item.key" class="setup-metric-list-row">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }} play{{ item.count === 1 ? '' : 's' }}</strong>
                      </div>
                      <div v-else class="setup-metric-list-empty">{{ t('sessionSetup.noAudioPlayed') }}</div>
                    </div>
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
                      <input
                        type="range"
                        :value="sliderRepetitionValue"
                        @input="setRepetitionsFromSlider(Number($event.target.value))"
                        min="1"
                        max="10"
                        step="1"
                        class="input technique-range"
                      />
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
                        <input type="radio" :value="option" :checked="Number(speed) === Number(option)"
                          @change="setPlaybackSpeed(option)"> {{ option }}x
                      </label>
                    </div>
                    <small class="field-hint">Use slower speed for early memorisation.</small>
                  </div>
                  <div class="field">
                    <label>Auto-advance</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="auto" v-model="playMode"> Yes</label>
                      <label class="radio"><input type="radio" value="manual" v-model="playMode"> No</label>
                    </div>
                    <small class="field-hint">Auto moves to the next queue item when audio ends.</small>
                  </div>
                  <div class="field">
                    <label><i class="bi bi-hourglass-split"></i> Delay between recitations (secs)</label>
                    <select v-model.number="delay" class="select">
                      <option v-for="option in delayOptions" :key="`tool-delay-${option}`" :value="option">{{ option }}s</option>
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
                    <button type="button" class="mode-radio" :class="{ active: focusModeEnabled }" :aria-pressed="focusModeEnabled ? 'true' : 'false'" aria-label="Use focus mode" @click="toggleFocusModeRadio">
                      <i class="mode-radio-icon bi" :class="focusModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i>
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
                    <button type="button" class="mode-radio" :class="{ active: blurModeEnabled }" :aria-pressed="blurModeEnabled ? 'true' : 'false'" aria-label="Use blur mode" @click="toggleBlurModeRadio">
                      <i class="mode-radio-icon bi" :class="blurModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i>
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
                    <button type="button" class="mode-radio" :class="{ active: chainingEnabled }" :aria-pressed="chainingEnabled ? 'true' : 'false'" aria-label="Use chaining" @click="toggleChainingRadio">
                      <i class="mode-radio-icon bi" :class="chainingEnabled ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i>
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
                    <button type="button" class="mode-radio" :class="{ active: anchorModeEnabled }" :aria-pressed="anchorModeEnabled ? 'true' : 'false'" aria-label="Use anchor mode" @click="toggleAnchorModeRadio">
                      <i class="mode-radio-icon bi" :class="anchorModeEnabled ? 'bi-check-circle-fill' : 'bi-circle'" aria-hidden="true"></i>
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
            <div class="saved-sessions-container">
              <div class="saved-header">
                <h3><i class="bi bi-bookmark-check"></i> Saved Sessions</h3>
                <p>Your memorisation sessions, ready to resume</p>
              </div>
              <div v-if="hasContinueSession" class="saved-continue-banner">
                <div class="saved-continue-copy">
                  <span class="saved-continue-kicker">Resume previous session</span>
                  <strong>{{ continueSessionLabel }}</strong>
                  <small>{{ continueSessionMeta }}</small>
                </div>
                
              </div>
              <div v-if="savedSessions.length === 0" class="empty-state">
                <i class="bi bi-journal-bookmark"></i>
                <p>No saved sessions yet</p>
                <span>Save your current session to get started</span>
              </div>
              <div v-else class="sessions-list">
                <div v-for="session in savedSessions" :key="session.id" class="session-item" :class="{ 'session-item-active': sessionMatchesCurrentLiveConfig(session) }">
                  <div class="session-info" @click="loadSavedSession(session.id)">
                    <div class="session-name">
                      <i class="bi bi-bookmark-fill"></i>
                      <span>{{ getSessionPrimaryLabel(session) }}</span>
                      <span v-if="session.archived" class="session-archive-badge">Archived</span>
                      <span v-if="sessionMatchesCurrentLiveConfig(session)" class="session-live-badge">Active now</span>
                      <span class="session-status-badge" :class="`session-status-${getSavedSessionState(session).tone}`">{{ getSavedSessionState(session).label }}</span>
                    </div>
                    <div v-if="session.name && session.name !== getSessionPrimaryLabel(session)" class="session-subtitle">
                      {{ session.name }}
                    </div>
                    <div class="session-details">
                      <span><i class="bi bi-clock"></i> Saved {{ formatDate(session.savedAt) }}</span>
                      <span><i class="bi bi-arrow-repeat"></i> {{ buildSessionResumeSummary(session) }}</span>
                    </div>
                  </div>
                  <div class="session-actions">
                    <div class="session-primary-action">
                      <button class="session-resume-btn" @click="loadSavedSession(session.id)" type="button" :disabled="isLoadingSession(session.id)">
                        <i class="bi" :class="isLoadingSession(session.id) ? 'bi-arrow-repeat spin' : 'bi-play-fill'"></i>
                        <span>{{ isLoadingSession(session.id) ? 'Opening…' : 'Open Session' }}</span>
                      </button>
                    </div>
                    <div class="session-secondary-actions">
                      <button
                        class="delete-btn session-delete-btn"
                        @click.stop="deleteSavedSession(session.id)"
                        title="Remove saved session"
                      >
                        <i class="bi bi-trash3"></i>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
            <div class="stats-sessions-container">
              <div class="saved-header">
                <h3><i class="bi bi-bar-chart-line"></i> Insights</h3>
                <p>Quick, calm insights from your saved memorisation sessions</p>
              </div>
              <div v-if="savedSessions.length === 0" class="empty-state">
                <i class="bi bi-activity"></i>
                <p>No insights yet</p>
                <span>Save a session and you’ll see a simple summary here.</span>
              </div>
              <div v-else class="stats-panel">
                <div v-if="selectedStatsSessionRecord" class="stats-detail">
                  <div class="stats-detail-head stats-detail-head-hero">
                    <div>
                      <h4>{{ getSessionPrimaryLabel(selectedStatsSessionRecord) }}</h4>
                      <p v-if="selectedStatsSessionRecord.name && selectedStatsSessionRecord.name !== getSessionPrimaryLabel(selectedStatsSessionRecord)">{{ selectedStatsSessionRecord.name }}</p>
                      <div class="stats-summary">{{ buildStatsSummary(selectedStatsSessionRecord) }}</div>
                      <div v-if="sortedSavedSessions.length > 1" class="stats-session-select-wrap">
                        <label class="stats-session-select-label" for="statsSessionSelect">Saved sessions</label>
                        <select
                          id="statsSessionSelect"
                          class="stats-session-select"
                          :value="selectedStatsSessionRecord.id"
                          @change="selectStatsSession($event.target.value)"
                        >
                          <option
                            v-for="session in sortedSavedSessions"
                            :key="`stats-${session.id}`"
                            :value="session.id"
                          >
                            {{ getSessionPrimaryLabel(session) }} · {{ formatDate(session.savedAt) }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="stats-detail-actions stats-detail-actions-prominent">
                    <button type="button" class="session-export-btn stats-full-analytics-btn" @click="openSessionAnalyticsModal(selectedStatsSessionRecord)">
                      <i class="bi bi-graph-up-arrow"></i>
                      <span>View Full Analytics</span>
                    </button>
                  </div>
                  <div class="stats-grid stats-grid-hero">
                    <div v-for="item in buildStatsBreakdown(selectedStatsSessionRecord)" :key="item.key" class="stats-card">
                      <i class="bi stats-card-icon" :class="item.icon"></i>
                      <em class="stats-card-value">{{ item.value }}</em>
                      <span>{{ item.label }}</span>
                    </div>
                  </div>
                  <div class="stats-detail-footer">
                    <span>Saved {{ formatDate(selectedStatsSessionRecord.savedAt) }}</span>
                    <span v-if="selectedStatsSessionRecord.archived">Archived auto-save</span>
                    <span v-else>Manual save</span>
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
                    <div class="setting-description">English, Arabic, or French UI</div>
                  </div>
                  <select class="select language-select" :value="activeLocale" @change="onLanguageChange($event.target.value)">
                    <option v-for="option in languageOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
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
          <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="resetControls">
            <i class="bi bi-arrow-counterclockwise"></i><span>{{ t('common.reset') }}</span>
          </button>
          <button class="tools-btn tools-btn-primary tools-btn-soft" @click="startSessionAndClose">
            <i class="bi bi-play-fill"></i><span>{{ t('common.startSession') }}</span>
          </button>
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
                  <p>Short enough to stay focused. Structured enough to make long-term memorisation easier to revisit.</p>
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
              <p>Choose a small range, repeat with structure, then return for recall and review without dashboard clutter.</p>
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
          <div class="modal-header-icon">
            <i class="bi bi-bookmark-plus-fill"></i>
          </div>
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="saveModalTitle">Save Memorisation Session</h2>
            <p>Name your session to easily find and resume it later</p>
          </div>
          <button class="modal-close-btn" @click="closeSaveModal" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Session Preview Card -->
          <div class="session-preview-card">
            <div class="preview-surah">
              <i class="bi bi-book"></i>
              <span>{{ currentChapter?.name_simple || 'No surah selected' }}</span>
            </div>
            <div class="preview-range">
              <i class="bi bi-text-paragraph"></i>
              <span>Ayahs {{ rangeStart }} – {{ rangeEnd }}</span>
            </div>
            <div class="preview-stats">
              <span class="preview-stat">
                <i class="bi bi-files"></i>
                {{ rangeEnd - rangeStart + 1 }} verses
              </span>
              <span class="preview-stat">
                <i class="bi bi-mic"></i>
                {{ getReciterName() }}
              </span>
            </div>
          </div>

          <!-- Name Input Field -->
          <div class="name-input-group" :class="{ 'has-error': nameError }">
            <label for="sessionName">
              <i class="bi bi-pencil-square"></i>
              Session Name
            </label>
            <input id="sessionName" type="text" v-model="saveSessionName" class="name-input"
              :class="{ 'error': nameError }" placeholder="e.g., Al-Fatihah Focus, Evening Review, Week 1 Progress"
              @keyup.enter="confirmSaveSession" @input="clearNameError" autofocus maxlength="50" />
            <div class="input-hint">
              <span class="char-count">{{ saveSessionName.length }}/50</span>
              <span class="hint-text">Give it a memorable name</span>
            </div>
            <div v-if="nameError" class="error-message">
              <i class="bi bi-exclamation-circle-fill"></i>
              {{ nameError }}
            </div>
          </div>

          <!-- Quick Name Suggestions -->
          <div class="quick-suggestions">
            <span class="suggestions-label">Quick suggestions:</span>
            <div class="suggestion-chips">
              <button v-for="suggestion in nameSuggestions" :key="suggestion" class="suggestion-chip"
                @click="saveSessionName = suggestion" type="button">
                {{ suggestion }}
              </button>
            </div>
          </div>

          <!-- Session Info Note -->
          <div class="info-note">
            <i class="bi bi-info-circle-fill"></i>
            <div class="info-text">
              <strong>Saved with current settings:</strong>
              <span>{{ chainingEnabled ? `${chainingMethod} chaining (${chainingRepetitions}x)` : 'Standard mode'
              }}</span>
              <span>{{ tajweedEnabled ? '· Tajweed enabled' : '' }}</span>
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

    <div class="modal-overlay" v-if="showConfirmModal" @click.self="closeConfirmModal">
      <div class="modal-content confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="confirmModalTitle">{{ confirmModal.title }}</h2>
          </div>
          <button class="btn-icon" @click="closeConfirmModal" type="button" aria-label="Close confirmation dialog"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
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
      <div class="modal-content confirm-modal session-exit-modal" role="dialog" aria-modal="true" aria-labelledby="sessionExitTitle">
        <div class="modal-header">
          <div class="modal-header-text">
            <div class="modal-context-badge">{{ sessionContextBadge }}</div>
            <h2 id="sessionExitTitle">End Session</h2>
          </div>
          <button class="btn-icon" @click="closeSessionExitModal" type="button" aria-label="Close end session dialog"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        </div>
        <div class="modal-body">
          <div class="session-exit-recap">
            <span><i class="bi bi-book"></i> {{ currentChapter?.name_simple || 'No surah' }}</span>
            <span><i class="bi bi-text-paragraph"></i> Ayah {{ currentPosition }}/{{ totalVerses }}</span>
            <span><i class="bi bi-clock"></i> {{ formatTime(currentTime || 0) }}</span>
          </div>
          <p class="confirm-copy">You can leave now, or save this session before exiting. Continuing will restore the exact ayah, playback position, and blur state.</p>
          <label class="session-exit-autosave">
            <input type="checkbox" v-model="sessionExitAutoSave">
            <span>Auto-save before exit</span>
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeSessionExitModal">Continue</button>
          <button class="btn-secondary" @click="exitSessionAnyway">Exit Anyway</button>
          <button class="btn-primary" @click="confirmSessionExit">{{ sessionExitAutoSave ? 'Save & Exit' : 'End Session' }}</button>
        </div>
      </div>
    </div>




    <div v-if="showCountdownOverlay" class="countdown-overlay">
      <div class="countdown-modal">
        <div class="countdown-number">{{ countdownValue }}</div>
        <div class="countdown-text">Prepare yourself</div>
      </div>
    </div>

    <div v-if="showSessionAnalyticsModal" class="modal-overlay session-analytics-overlay" @click.self="closeSessionAnalyticsModal">
      <div class="modal-content session-analytics-modal" role="dialog" aria-modal="true" aria-labelledby="sessionAnalyticsTitle">
        <div class="modal-header session-analytics-header">
          <div class="session-analytics-head-copy">
            <h2 id="sessionAnalyticsTitle">Session Analytics Overview</h2>
            <p v-if="analyticsModalSessionLabel">{{ analyticsModalSessionLabel }}</p>
            <small v-if="analyticsModalSessionMeta">{{ analyticsModalSessionMeta }}</small>
          </div>
          <div class="session-analytics-head-actions">
            <button
              type="button"
              class="session-export-btn session-analytics-download"
              :disabled="analyticsReportState.loading || !analyticsModalRecord"
              @click="downloadSessionAnalyticsReport"
            >
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
            <section class="session-analytics-section session-analytics-two-col">
              <article class="session-analytics-panel">
                <header>
                  <h3>Progress</h3>
                  <p>Simple coverage across the selected ayah range.</p>
                </header>
                <div class="analytics-progress-split">
                  <div class="analytics-progress-stat">
                    <strong>{{ analyticsCurrentProgressPercent }}%</strong>
                    <span>Current progress</span>
                    <small>{{ analyticsProgressSummary }}</small>
                  </div>
                  <div class="analytics-progress-stat">
                    <strong>{{ analyticsRemainingProgressPercent }}%</strong>
                    <span>Remaining progress</span>
                    <small>{{ analyticsRemainingSummary }}</small>
                  </div>
                </div>
                <div class="analytics-progress-bar">
                  <div class="analytics-progress-bar-fill" :style="{ width: `${analyticsCurrentProgressPercent}%` }"></div>
                </div>
              </article>
              <article class="session-analytics-panel">
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
                      <line v-for="tick in analyticsYAxisTicks" :key="`grid-${tick.value}`" x1="20" :y1="tick.y" x2="300" :y2="tick.y"></line>
                      <text v-for="tick in analyticsYAxisTicks" :key="`label-${tick.value}`" x="4" :y="tick.y + 4">{{ tick.label }}</text>
                    </g>
                    <path :d="analyticsLineAreaPath" fill="url(#analyticsAreaGradient)"></path>
                    <path :d="analyticsLinePath" class="analytics-line-path"></path>
                    <circle
                      v-for="point in analyticsLineDots"
                      :key="point.key"
                      :cx="point.x"
                      :cy="point.y"
                      r="3.5"
                      class="analytics-line-dot"
                    ></circle>
                  </svg>
                  <div class="analytics-line-labels">
                    <span v-for="item in analyticsVerseSeries" :key="`label-${item.key}`">{{ item.shortLabel }}</span>
                  </div>
                </div>
                <div v-else class="analytics-empty-panel">Play ayah audio to populate the activity chart.</div>
              </article>
            </section>
            <section class="session-analytics-section session-analytics-two-col">
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

    <div v-if="showSelfCheckModal && selfCheckModalVerse" class="modal-overlay self-check-modal-overlay" @click.self="closeSelfCheckModal">
      <div class="modal-content self-check-modal" role="dialog" aria-modal="true" aria-labelledby="selfCheckModalTitle">
        <div class="modal-header self-check-modal-header">
          <div class="self-check-modal-head-copy">
            <div class="modal-context-badge">Per-ayah recorder</div>
            <h2 id="selfCheckModalTitle">Self-Check for Ayah {{ selfCheckModalVerse.number }}</h2>
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
                <p class="self-check-section-desc">Use blur to hide the text while you recite aloud. Adjust the font size for comfortable reading when you need to check yourself.</p>
              </div>
            </header>

            

            <div
              v-if="selfCheckBlurEnabled"
              class="technique-peek-hint"
              @mousedown="startSelfCheckPeek"
              @mouseup="stopSelfCheckPeek"
              @mouseleave="stopSelfCheckPeek"
              @touchstart.prevent="startSelfCheckPeek"
              @touchend="stopSelfCheckPeek"
              @touchcancel="stopSelfCheckPeek"
            >
              <i class="bi bi-hand-index"></i>
              <span>Press and hold the ayah below to peek · release to hide again</span>
            </div>

              <div
              class="self-check-modal-ayah-shell"
              :class="{ 'is-blurred': selfCheckBlurEnabled && !selfCheckPeekActive, 'is-peekable': selfCheckBlurEnabled }"
              @mousedown="startSelfCheckPeek"
              @mouseup="stopSelfCheckPeek"
              @mouseleave="stopSelfCheckPeek"
              @touchstart.prevent="startSelfCheckPeek"
              @touchend="stopSelfCheckPeek"
              @touchcancel="stopSelfCheckPeek"
            >
              <div class="self-check-ayah-actions" aria-label="Ayah quick actions">
                <button class="self-check-ayah-action" type="button" @click.stop="adjustSelfCheckFont(-10)" title="Decrease ayah font size" aria-label="Decrease ayah font size">
                  <i class="bi bi-dash-lg"></i>
                </button>
                <button class="self-check-ayah-action" type="button" @click.stop="adjustSelfCheckFont(10)" title="Increase ayah font size" aria-label="Increase ayah font size">
                  <i class="bi bi-plus-lg"></i>
                </button>
                <button class="self-check-ayah-action" type="button" @click.stop="toggleSelfCheckTajweed" :class="{ active: selfCheckTajweedEnabled }" :title="selfCheckTajweedEnabled ? 'Hide tajweed colours' : 'Show tajweed colours'" :aria-pressed="selfCheckTajweedEnabled ? 'true' : 'false'" aria-label="Toggle tajweed colours">
                  <i class="bi bi-palette"></i>
                </button>
                <button class="self-check-ayah-action" type="button" @click.stop="toggleSelfCheckAyahPlayback(selfCheckModalVerse)" :title="activeSelfCheckAyahPlaybackKey === selfCheckModalVerse.key ? 'Pause ayah' : 'Play ayah once'" aria-label="Play ayah once">
                  <i class="bi" :class="activeSelfCheckAyahPlaybackKey === selfCheckModalVerse.key ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                </button>
                <button class="self-check-ayah-action" type="button" @click="toggleSelfCheckBlurMode" :title="selfCheckBlurEnabled ? 'Disable blur' : 'Enable blur'">
                  <i class="bi" :class="selfCheckBlurEnabled ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                </button>
              </div>
              <div
                class="self-check-modal-ayah"
                dir="rtl"
                :style="{
                  'font-family': quranFontFamily,
                  'font-size': (selfCheckFontSize / 100) + 'rem'
                }"
                :class="{ 'tajweed-enabled': selfCheckTajweedEnabled }"
                v-html="getSelfCheckModalArabic(selfCheckModalVerse)"
              ></div>
            </div>

          </section>

          <section class="self-check-modal-recorder-grid">
            <article class="self-check-recorder-card" :class="{ recording: isSelfCheckRecording, reviewing: !!selfCheckActiveDraft }">
              <div class="self-check-recorder-head">
                <div>
                  <span class="self-check-kicker">Recording</span>
                  <strong>{{ isSelfCheckRecording ? 'Recording in progress' : selfCheckActiveDraft ? 'Review before saving' : 'Ready when you are' }}</strong>
                  <p class="self-check-card-desc">{{ getSelfCheckRecorderDescription() }}</p>
                </div>
                <button class="self-check-library-link" type="button" @click="openRecordingsLibraryFromSelfCheck" title="Browse all saved recordings for this session">
                  <i class="bi bi-collection-play"></i>
                  <span>{{ selfCheckModalAttempts.length ? 'Open Library' : 'Library' }}</span>
                </button>
              </div>

              <div class="self-check-recorder-meta">
                <span>{{ selfCheckModalAttempts.length }} saved attempt{{ selfCheckModalAttempts.length === 1 ? '' : 's' }}</span>
                <span v-if="selfCheckLatestAttempt">Latest: {{ selfCheckLatestAttempt.result }} · {{ formatRecordingDate(selfCheckLatestAttempt.recordedAt) }}</span>
              </div>

              <div v-if="selfCheckLastSavedAyahKey === selfCheckModalVerse.key" class="self-check-status self-check-status-success">
                <i class="bi bi-check2-circle"></i>
                <span>Saved to your recordings library for this ayah.</span>
              </div>

              <div v-if="selfCheckError && selfCheckVerseKey === selfCheckModalVerse.key" class="self-check-status self-check-status-warning">
                <i class="bi bi-exclamation-triangle"></i>
                <span>{{ selfCheckError }}</span>
              </div>

              <div v-if="!supportsSelfCheckRecording()" class="self-check-status self-check-status-warning">
                <i class="bi bi-mic-mute"></i>
                <span>Recording is not available in this browser.</span>
              </div>

              <div v-else-if="isSelfCheckRecording" class="self-check-live-card">
                <div class="self-check-live-stage">
                  <div class="self-check-live-copy">
                    <strong>Recording now</strong>
                    <span>{{ getSelfCheckLiveDurationLabel() }} elapsed · speak clearly, then tap stop when finished</span>
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
                    <span>{{ formatRecordingDate(selfCheckActiveDraft.recordedAt) }} · {{ formatRecordingDuration(selfCheckActiveDraft.durationSeconds) }}</span>
                  </div>
                  <button class="player-btn self-check-preview-btn" type="button" @click="toggleSelfCheckPreview(selfCheckModalVerse.key)">
                    <i class="bi" :class="activeSelfCheckPreviewKey === selfCheckModalVerse.key ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    <span>{{ activeSelfCheckPreviewKey === selfCheckModalVerse.key ? 'Pause' : 'Play' }}</span>
                  </button>
                </div>

                <div class="self-check-result-block">
                  <div class="self-check-result-label">
                    <span class="self-check-kicker">Self-rating</span>
                    <p class="self-check-tool-hint">Your rating helps track which ayahs need more review over time.</p>
                  </div>
                  <div class="self-check-result-group" role="group" aria-label="Choose self-check result">
                    <button
                      v-for="option in ['Excellent', 'Good', 'Needs Review']"
                      :key="option"
                      type="button"
                      class="self-check-result-btn"
                      :class="[getRecordingResultTone(option), { active: selfCheckActiveDraft.result === option }]"
                      :title="getSelfCheckResultHint(option)"
                      @click="setSelfCheckDraftResult(option)"
                    >
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
                  <button class="btn-secondary self-check-action-btn" type="button" @click="restartSelfCheckRecording(selfCheckModalVerse)">
                    <i class="bi bi-arrow-repeat"></i>
                    <span>Record Again</span>
                  </button>
                  <button class="btn-primary self-check-action-btn" type="button" @click="saveSelfCheckRecording(selfCheckModalVerse)">
                    <i class="bi bi-save2"></i>
                    <span>Save Attempt</span>
                  </button>
                </div>
              </div>

              <div v-else class="self-check-idle-actions">
                <button class="btn-primary self-check-action-btn" type="button" @click="startSelfCheckRecording(selfCheckModalVerse)">
                  <i class="bi bi-mic-fill"></i>
                  <span>Start Recording</span>
                </button>
              </div>
            </article>

            <aside class="self-check-attempts-card">
              <div class="self-check-attempts-head">
                <div>
                  <span class="self-check-kicker">Saved attempts</span>
                  <strong>Recent review history</strong>
                </div>
                <span class="self-check-attempts-count" :title="`${selfCheckModalAttempts.length} saved recording${selfCheckModalAttempts.length === 1 ? '' : 's'}`">{{ selfCheckModalAttempts.length }}</span>
              </div>

              <div v-if="selfCheckModalAttempts.length" class="self-check-attempts-list">
                <article
                  v-for="recording in selfCheckModalAttempts"
                  :key="recording.id"
                  class="self-check-attempt-card"
                  :class="{ playing: recording.id === activeRecordingPlaybackId }"
                >
                  <div class="self-check-attempt-top">
                    <div class="self-check-attempt-copy">
                      <strong>{{ getRecordingAttemptLabel(recording) }}</strong>
                      <span>{{ formatRecordingDate(recording.recordedAt) }} · {{ formatRecordingTimestamp(recording.recordedAt) }}</span>
                      <p class="self-check-attempt-note">Self-rated · {{ recording.result }}</p>
                    </div>
                    <span class="recording-result-pill" :class="getRecordingResultTone(recording.result)">
                      {{ recording.result }}
                    </span>
                  </div>

                  <div class="self-check-attempt-meta">
                    <span><i class="bi bi-clock-history"></i> {{ formatRecordingDuration(recording.durationSeconds) }}</span>
                  </div>

                  <div class="self-check-attempt-actions">
                    <button class="player-btn recording-history-action" type="button" @click="toggleRecordingPlayback(recording)">
                      <i class="bi" :class="recording.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                      <span>{{ recording.id === activeRecordingPlaybackId ? 'Pause' : 'Play' }}</span>
                    </button>
                    <button class="player-btn recording-history-action recording-history-action-delete" type="button" @click="promptDeleteRecording(recording.id)">
                      <i class="bi bi-trash3"></i>
                      <span>Delete</span>
                    </button>
                  </div>

                  <div v-if="pendingRecordingDeleteId === recording.id" class="recording-delete-confirm">
                    <span>Delete this recording?</span>
                    <div class="recording-delete-confirm-actions">
                      <button class="btn-secondary recording-inline-btn" type="button" @click="cancelDeleteRecording">Cancel</button>
                      <button class="btn-primary btn-danger recording-inline-btn" type="button" @click="deleteRecording(recording.id)">Delete</button>
                    </div>
                  </div>
                </article>
              </div>

              <div v-else class="self-check-empty">
                <div class="self-check-empty-icon">
                  <i class="bi bi-mic"></i>
                </div>
                <h3>No recordings yet</h3>
                <p>Start a recording on the left to capture your first recitation.</p>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>

    <div v-if="showRecordingsLibrary" class="modal-overlay recordings-library-overlay" @click.self="closeRecordingsLibrary">
      <div class="modal-content recordings-library-modal" role="dialog" aria-modal="true" aria-labelledby="recordingsLibraryTitle">
        <div class="modal-header recordings-library-header">
          <div class="recordings-library-head-copy">
            <h2 id="recordingsLibraryTitle">Recordings Library</h2>
            <div class="recordings-library-hierarchy">
              <span>{{ currentChapter?.name_simple || 'Saved session' }}</span>
              <span>{{ rangeStart }}-{{ rangeEnd }}</span>
              <span v-if="selectedRecordingsAyahGroup">Ayah {{ selectedRecordingsAyahGroup.ayahNumber }}</span>
              <span v-if="selectedRecordingsAyahGroup">{{ selectedRecordingsAyahGroup.recordings.length }} attempt{{ selectedRecordingsAyahGroup.recordings.length === 1 ? '' : 's' }}</span>
            </div>
          </div>
          <div class="recordings-library-header-actions">
            <button v-if="recordingsLibraryReturnToSelfCheckKey" class="recordings-library-back-btn" type="button" @click="backToSelfCheckFromLibrary" aria-label="Back to self-check">
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
            <p>Open Self-Check on any ayah in your session, record your recitation, and save the attempt. Every saved recording will appear here, grouped by surah and ayah.</p>
          </div>

          <div v-else class="recordings-library-shell">
            <aside class="recordings-library-nav">
              <div class="recordings-library-nav-head">
                <div>
                  <span class="recordings-library-nav-kicker">Saved session</span>
                  <strong>{{ currentChapter?.name_simple || 'Session recordings' }}</strong>
                  <div class="recordings-library-nav-meta">
                    <span>Range {{ rangeStart }}-{{ rangeEnd }}</span>
                    <span>{{ filteredRecordingsAyahCount }} ayah{{ filteredRecordingsAyahCount === 1 ? '' : 's' }}</span>
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
                  <input
                    v-model.trim="recordingsLibrarySearch"
                    type="search"
                    placeholder="Search surah or ayah number"
                    aria-label="Search recorded ayahs"
                  >
                </div>
              </div>

              <div v-show="recordingsNavExpanded" class="recordings-library-nav-scroll">
                <div v-for="surahGroup in filteredRecordingsAyahGroups" :key="surahGroup.chapterId || surahGroup.chapterName" class="recordings-library-surah-group">
                  <div class="recordings-library-surah-title">{{ surahGroup.chapterName }}</div>
                  <div v-for="ayahGroup in surahGroup.ayahs" :key="ayahGroup.ayahKey" class="recordings-library-ayah-group">
                    <button
                      type="button"
                      class="recordings-library-ayah-item"
                      :class="{ active: ayahGroup.ayahKey === selectedRecordingsAyahKey }"
                      @click="selectRecordingsAyah(ayahGroup.ayahKey)"
                    >
                      <span class="recordings-library-ayah-label">Ayah {{ ayahGroup.ayahNumber }}</span>
                      <span class="recordings-library-ayah-count">{{ ayahGroup.recordings.length }}</span>
                    </button>
                    <transition name="recordings-group-expand">
                      <div v-if="ayahGroup.ayahKey === selectedRecordingsAyahKey" class="recordings-library-recordings">
                        <article
                          v-for="recording in ayahGroup.recordings"
                          :key="recording.id"
                          class="recordings-library-recording-item"
                          :class="{ playing: recording.id === activeRecordingPlaybackId }"
                        >
                          <div class="recordings-library-recording-copy">
                            <strong>{{ getRecordingAttemptLabel(recording) }}</strong>
                            <span>{{ formatRecordingTimestamp(recording.recordedAt) }}</span>
                          </div>
                          <button class="player-btn recording-history-action" type="button" @click="toggleRecordingPlayback(recording)">
                            <i class="bi" :class="recording.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                          </button>
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
                    <span>{{ selectedRecordingsAyahGroup.recordings.length }} attempt{{ selectedRecordingsAyahGroup.recordings.length === 1 ? '' : 's' }}</span>
                    <span>Session {{ selectedRecordingsAyahGroup.recordings[0]?.sessionRangeStart || rangeStart }}-{{ selectedRecordingsAyahGroup.recordings[0]?.sessionRangeEnd || rangeEnd }}</span>
                  </div>
                  <p v-if="getAyahTranslation(selectedRecordingsAyahGroup.ayahKey)" class="recordings-library-ayah-translation">
                    {{ getAyahTranslation(selectedRecordingsAyahGroup.ayahKey) }}
                  </p>
                </div>
                <div class="recordings-library-detail-count">
                  {{ selectedRecordingsAyahGroup.recordings.length }}
                </div>
              </div>

              <div v-if="selectedRecordingsAyahGroup" class="recordings-library-history">
                <article
                  v-for="recording in selectedRecordingsAyahHistory"
                  :key="recording.id"
                  class="recording-history-card"
                  :class="{ playing: recording.id === activeRecordingPlaybackId }"
                >
                  <div class="recording-history-top">
                    <div class="recording-history-copy">
                      <div class="recording-history-kicker">{{ getRecordingAttemptLabel(recording) }}</div>
                      <span>{{ formatRecordingTimestamp(recording.recordedAt) }}</span>
                      <p class="recording-history-note">Self-rated · {{ recording.result }}</p>
                    </div>
                    <span class="recording-result-pill" :class="getRecordingResultTone(recording.result)">
                      {{ recording.result }}
                    </span>
                  </div>

                  <div class="recording-history-meta">
                    <span><i class="bi bi-clock-history"></i> {{ formatRecordingDuration(recording.durationSeconds) }}</span>
                    <span><i class="bi bi-calendar3"></i> {{ formatRecordingDate(recording.recordedAt) }}</span>
                  </div>

                  <div class="recording-history-actions">
                    <button class="player-btn recording-history-action" type="button" @click="toggleRecordingPlayback(recording)">
                      <i class="bi" :class="recording.id === activeRecordingPlaybackId ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                      <span>{{ recording.id === activeRecordingPlaybackId ? 'Pause' : 'Play' }}</span>
                    </button>
                    <button class="player-btn recording-history-action recording-history-action-delete" type="button" @click="promptDeleteRecording(recording.id)">
                      <i class="bi bi-trash3"></i>
                      <span>Delete</span>
                    </button>
                  </div>

                  <div v-if="pendingRecordingDeleteId === recording.id" class="recording-delete-confirm">
                    <span>Delete this recording?</span>
                    <div class="recording-delete-confirm-actions">
                      <button class="btn-secondary recording-inline-btn" type="button" @click="cancelDeleteRecording">Cancel</button>
                      <button class="btn-primary btn-danger recording-inline-btn" type="button" @click="deleteRecording(recording.id)">Delete</button>
                    </div>
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
      <div class="modal-content post-onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="postOnboardingTitle">
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
          <div v-if="onboardingStepContent.duas?.length" class="dua-onboarding-grid">
            <article v-for="dua in onboardingStepContent.duas" :key="dua.title" class="dua-onboarding-card">
              <span class="dua-onboarding-title">{{ dua.title }}</span>
              <p class="dua-onboarding-arabic" dir="rtl" lang="ar">{{ dua.arabic }}</p>
              <p class="dua-onboarding-translation">{{ dua.translation }}</p>
              <small class="dua-onboarding-source">{{ dua.source }}</small>
            </article>
          </div>
          <div class="post-onboarding-progress">
            <span v-for="dot in onboardingSteps.length" :key="`ob-dot-${dot}`" :class="{ active: onboardingStepIndex === dot - 1 }"></span>
          </div>
        </div>
        <div class="modal-footer post-onboarding-footer">
          <button class="btn-secondary" @click="skipOnboarding">Skip</button>
          <button v-if="onboardingStepIndex < onboardingSteps.length - 1" class="btn-primary" @click="nextOnboardingStep">Next</button>
          <button v-else class="btn-primary" @click="completeOnboardingAndStart">Finish</button>
        </div>
      </div>
    </div>

    <!-- Global Audio Player - Updated with Speed Controls -->
    <transition name="slide-up">
      <div v-if="appReady && playerVisible" class="player-bar" :class="{ collapsed: playerCollapsed }" role="region" aria-label="Audio player">
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
            <button class="player-btn player-play" @click="togglePlay" title="Play/Pause" type="button" :aria-label="isPlaying ? 'Pause audio' : 'Play audio'">
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
            </button>
            <button class="player-btn" @click="next" title="Next" type="button" aria-label="Next ayah">
              <i class="bi bi-skip-end-fill" aria-hidden="true"></i>
            </button>
          </div>

          <div class="player-progress-wrap">
            <span class="player-time">{{ formatTime(currentTime) }}</span>
            <div class="player-progress-bg" @click="seek" ref="progress" role="progressbar" aria-label="Audio progress" :aria-valuenow="Math.round((currentTime / (duration || 1)) * 100)" aria-valuemin="0" aria-valuemax="100">
              <div class="player-progress-fill" :style="{ width: (currentTime / (duration || 1)) * 100 + '%' }"></div>
            </div>
            <span class="player-time">{{ formatTime(duration) }}</span>
          </div>




          <button class="player-btn" @click="playerVisible = false" title="Close player" type="button" aria-label="Close audio player">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </transition>

    <!-- Audio System -->
    <audio ref="audio" style="display:none"></audio>
    <audio ref="recordingsAudio" style="display:none"></audio>

  </div>
</template>

<script>
import axios from 'axios'
import { toRaw } from 'vue'
import { getEditions, getSurahEdition, getSurahEditions } from '../lib/quranApis'
import { loadMutqinState, saveMutqinState, watchMutqinState } from '../composables/useMutqinPersistence'
import { seedAyahs } from '../composables/useAyahState'
import { buildSessionQueue, startMutqinSession, moveMutqinSession, completeMutqinSession } from '../composables/useSessionEngine'
import { createDailyPlan } from '../composables/useDailyPlanner'
import { hideAyah, completeTakrarStep, getTakrarStep } from '../composables/useTakrarLadder'
import { scoreRetention } from '../composables/useRetentionZones'

const MODE_STORAGE_KEYS = {
  beginner: 'telawa.mode.beginner',
  advanced: 'telawa.mode.advanced'
}

const SESSION_STORAGE_KEYS = {
  beginner: 'telawa.sessionState.beginner',
  advanced: 'telawa.sessionState.advanced'
}

const CENTRAL_SESSION_STORAGE_KEY = 'mutqin.sessionState'

const DEFAULT_ALQURAN_RECITER = 'ar.alafasy'

function tokenizeArabicText(text) {
  const raw = String(text || '').trim()
  if (!raw) return []
  // Prefer whitespace tokenization, but keep Arabic + diacritics together.
  const tokens = raw.split(/\s+/).filter(Boolean)
  return tokens
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function deepClone(value) {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(rawValue)
    } catch (error) {
      console.warn('structuredClone fallback triggered', error)
    }
  }

  return JSON.parse(JSON.stringify(rawValue))
}

function slugifySessionFilePart(value) {
  return String(value || 'session')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session'
}

function parseRecordingDurationSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value)
  if (typeof value !== 'string') return 0

  const raw = value.trim()
  if (!raw) return 0

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Math.max(0, Number(raw))
  }

  const parts = raw.split(':').map(part => Number(part))
  if (parts.some(part => !Number.isFinite(part))) return 0

  if (parts.length === 2) return Math.max(0, (parts[0] * 60) + parts[1])
  if (parts.length === 3) return Math.max(0, (parts[0] * 3600) + (parts[1] * 60) + parts[2])
  return 0
}

function normalizeRecordingResult(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'Needs Review'
  if (raw.includes('excellent')) return 'Excellent'
  if (raw.includes('good')) return 'Good'
  if (raw.includes('pass')) return 'Good'
  return 'Needs Review'
}

function parseRecordingDate(value) {
  if (!value && value !== 0) return new Date().toISOString()
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function looksLikeRecordingEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Boolean(
    value.audioSrc ||
    value.audioUrl ||
    value.url ||
    value.src ||
    value.blobUrl ||
    value.dataUrl ||
    value.recordedAt ||
    value.timestamp ||
    value.createdAt
  )
}

function collectRecordingEntries(payload, context = {}) {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload.flatMap(item => collectRecordingEntries(item, context))
  }

  if (looksLikeRecordingEntry(payload)) {
    return [{ ...context, ...payload }]
  }

  if (typeof payload !== 'object') return []

  if (Array.isArray(payload.recordings)) {
    const nextContext = {
      ...context,
      chapterId: payload.chapterId || payload.surahId || context.chapterId || null,
      chapterName: payload.chapterName || payload.surahName || context.chapterName || '',
      ayahKey: payload.ayahKey || payload.verseKey || context.ayahKey || '',
      ayahNumber: payload.ayahNumber || payload.verseNumber || context.ayahNumber || null
    }
    return collectRecordingEntries(payload.recordings, nextContext)
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    let nextContext = { ...context }
    const ayahMatch = key.match(/^(\d+):(\d+)$/)
    const surahMatch = key.match(/^surah[-_: ]?(\d+)$/i)
    const plainAyahMatch = key.match(/^ayah[-_: ]?(\d+)$/i)

    if (ayahMatch) {
      nextContext = {
        ...nextContext,
        chapterId: Number(ayahMatch[1]),
        ayahNumber: Number(ayahMatch[2]),
        ayahKey: key
      }
    } else if (surahMatch) {
      nextContext = {
        ...nextContext,
        chapterId: Number(surahMatch[1])
      }
    } else if (plainAyahMatch && nextContext.chapterId) {
      const ayahNumber = Number(plainAyahMatch[1])
      nextContext = {
        ...nextContext,
        ayahNumber,
        ayahKey: `${nextContext.chapterId}:${ayahNumber}`
      }
    }

    return collectRecordingEntries(value, nextContext)
  })
}

function createCentralSessionState() {
  return {
    showSaveNameModal: false,
    saveSessionName: '',
    activeTab: 'tools',
    sessionStatus: 'idle',
    sessionCompletedAt: null,
    repetitionTimes: 0,
    tajweedEnabled: false,
    focusModeEnabled: false,
    blurModeEnabled: false,
    blurIntensity: 10,
    anchorModeEnabled: false,
    anchorCount: 2,
    chaining: {
      enabled: true,
      method: 'linking',
      repetitions: 1,
      index: 0,
      segmentIndex: 0,
      consecutiveFailures: 0,
      chain: [],
      lastSuccessfulAyahKey: null
    },
    audio: {
      speed: 1,
      currentTime: 0
    }
  }
}

function createBeginnerState() {
  return {
    chapterId: 0,
    rangeStart: 1,
    rangeEnd: 7,
    reciterId: DEFAULT_ALQURAN_RECITER,
    speed: 1,
    delay: 2,
    playMode: 'auto',
    order: 'seq',
    loadedConfig: null,
    verses: [],
    activeKey: null,
    queue: [],
    queueIndex: 0,
    sessionActive: false
  }
}

function createAdvancedState() {
  return {
    chapterId: 0,
    rangeStart: 1,
    rangeEnd: 7,
    reciterId: DEFAULT_ALQURAN_RECITER,
    speed: 1,
    delay: 2,
    playMode: 'auto',
    order: 'seq',
    loadedConfig: null,
    verses: [],
    activeKey: null,
    queue: [],
    queueIndex: 0,
    sessionActive: false
  }
}

export default {
  name: 'TelawaApp',
  props: {
    auth: { type: Object, default: () => ({ check: false, id: null }) }
  },
  data() {
    return {
      nameError: '',
      nameSuggestions: [
        'Morning Review',
        'Weekly Target',
        'Quick Revision',
        'Deep Memorisation'
      ],
      // Feature 1: Repetitions
      repetitionsPerStep: 5,
      selectedLoopCount: 5,

      // Feature 2: Gap between verses
      gapBetweenVerses: "1x", // Options: 'none', '1x', '3s', '5s', 'custom'
      customGapSeconds: 2,
      anchorModeEnabled: false,
      anchorCount: 2,
      anchorHighlightObserver: null,
      showCountdownOverlay: false,
      countdownValue: 3,
      countdownInterval: null,
      activeWaveIndex: 0,
      showSaveNameModal: false,
      saveSessionName: '',
      appReady: false,
      isBootstrapping: true,
      isDataReady: false,
      fontDropdownOpen: false,
      verseFontSizes: {},
      defaultFontSize: 120,
      fontSizeStep: 10,
      minFontSize: 100,
      maxFontSize: 280,
      tajweedEnabled: false,
      beginner: createBeginnerState(),
      advanced: createAdvancedState(),
      mutqinState: loadMutqinState(),
      centralSession: createCentralSessionState(),
      unwatchMutqinState: null,
      currentWaveVerseKey: null,
      showKeyboardShortcuts: false,
      // chaining removed

      // Arabic text word highlighting state
      currentWordIndex: -1,
      currentHighlightedVerseKey: null,
      wordTimestampsMap: new Map(),
      wordHighlightHandler: null,
      currentVerseWords: [],
      wordHighlightFrame: null,
      wordHighlightTimestamps: [],
      wordHighlightLoading: false,
      wordHighlightRequestId: 0,
      currentPhraseIndex: -1,
      statsTick: Date.now(),
      sessionStartedAt: 0,
      sessionErrorCount: 0,
      advanceLocked: false,
      repeatActionLocked: false,
      playRequestLocked: false,
      mainCardCollapsed: false,
      feedbackCollapsed: true,

      // UI State
      currentMode: 'beginner',
      theme: 'light',
      activeLocale: 'en',
      languageOptions: [
        { value: 'en', label: 'English' },
        { value: 'ar', label: 'العربية' },
        { value: 'fr', label: 'Français' }
      ],
      tab: 'tools',
      showTools: false,
      readingViewMode: 'stacked',
      mushafPageIndex: 0,
      mushafBackground: 'warm',
      hoveredMushafVerseKey: '',
      mushafBackgroundOptions: [
        { value: 'warm', label: 'Warm' },
        { value: 'paper', label: 'Paper' },
        { value: 'contrast', label: 'High contrast' },
        { value: 'night', label: 'Night' }
      ],
      focusModeEnabled: false,
      focusDimPercent: 54,
      blurModeEnabled: false,
      blurIntensity: 10,
      chainingEnabled: true,
      chainingMethod: 'linking',
      chainingRepetitions: 1,
      // Primary guided UX flow: learn -> practice -> recall.
      flowStep: 'learn',
      flowListenPlays: 0,
      showPlannerModal: false,
      showPostLoginOnboarding: false,
      onboardingStepIndex: 0,
      onboardingDemoSnapshot: null,
      onboardingDemoActive: false,
      onboardingSteps: [
        {
          title: 'Welcome to Mutqin',
          stepLabel: 'Big picture',
          body: 'Mutqin is built around short memorisation sessions. Pick a small range, listen with structure, then return for recall and review.',
          points: ['Short sessions', 'Clear repetition', 'Simple review']
        },
        {
          title: 'How Sessions Work',
          stepLabel: 'Step 1',
          body: 'Each session starts with a surah, a focused ayah range, and the reciter you want to work with.',
          points: ['Choose the surah', 'Keep the range small', 'Start with intention']
        },
        {
          title: 'Repetition System',
          stepLabel: 'Step 2',
          body: 'Repetition gives the session its rhythm. Set a realistic repeat count and let the audio pace stay calm and accurate.',
          points: ['Choose a realistic repeat count', 'Use speed only when needed', 'Let the rhythm stay steady']
        },
        {
          title: 'Memorisation Flow',
          stepLabel: 'Step 3',
          body: 'Move from listening, to repeating, to reciting from memory. Techniques like Focus, Blur, and Chaining only support that flow.',
          points: ['Listen first', 'Repeat with attention', 'Use techniques only when helpful']
        },
        {
          title: 'Self-Check',
          stepLabel: 'Step 4',
          body: 'Self-check is simple: recite first, then confirm. Blur Mode helps you hide support until you actually need it.',
          points: ['Recite before revealing', 'Use Blur for recall', 'Return gently to weak spots']
        },
        {
          title: 'Before you recite',
          stepLabel: 'Before reciting',
          body: 'Begin simply. Seek refuge in Allah, start with Bismillah, then use a short dua if it helps you settle into the session.',
          points: [],
          duas: [
            {
              title: 'Seeking refuge',
              arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
              translation: 'I seek refuge in Allah from the accursed Shaytan.',
              source: 'Qur\'an 16:98'
            },
            {
              title: 'Bismillah',
              arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              translation: 'In the name of Allah, the Most Compassionate, the Most Merciful.',
              source: 'Qur\'an 1:1'
            },
            {
              title: 'Increase me in knowledge',
              arabic: 'رَبِّ زِدْنِي عِلْمًا',
              translation: 'My Lord, increase me in knowledge.',
              source: 'Qur\'an 20:114'
            },
            {
              title: 'Ease my task',
              arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
              translation: 'My Lord, expand my chest and make my task easy.',
              source: 'Qur\'an 20:25-26'
            }
          ]
        }
      ],
      showConfirmModal: false,
      showSessionExitModal: false,
      sessionExitAutoSave: true,
      sessionExitSnapshot: null,
      confirmModal: {
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
        action: '',
        data: null
      },
      plannerConfig: {
        surahId: 1,
        totalVersesInSurah: 7,
        versesPerDay: 5,
        minutesPerVerse: 2  // Average time per verse in minutes
      },
      analytics: {
        totalVersesRead: 0,
        totalTimeSpent: 0,
        currentStreak: 0,
        versesMastered: 0,
        totalRepetitions: 0,
        sessionsCompleted: 0,
        weeklyVerses: [0, 0, 0, 0, 0, 0, 0],
        weeklyMinutes: [0, 0, 0, 0, 0, 0, 0]
      },
      playerVisible: false,
      playerCollapsed: true,
      playerMenuOpen: false,
      hasContinueSession: false,
      continueSessionLabel: '',
      continueSessionPayload: null,
      showResumeModal: false,
      lastScrollY: 0,
      pendingDeleteId: '',
      verseRequestId: 0,

      // Session State
      activeVerseKey: null,
      verses: [],
      activeKey: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      manualOnlyPlayback: false,
      currentTime: 0,
      duration: 0,
      audioElement: null,

      // Reading options
      script: 'uthmani',
      quranFont: 'uthmanic',
      fontPickerOpen: false,
      quranFontOptions: [
        { value: 'uthmanic', label: 'Uthmanic Hafs', icon: 'bi-book' },
        { value: 'amiri', label: 'Amiri Quran', icon: 'bi-type' },
        { value: 'naskh', label: 'Noto Naskh Arabic', icon: 'bi-text-paragraph' },
        { value: 'scheherazade', label: 'Scheherazade New', icon: 'bi-fonts' },
        { value: 'lateef', label: 'Lateef', icon: 'bi-pencil' }
      ],
      showTranslation: true,
      showTransliteration: false,
      showWordByWord: false,
      wordByWordAudioEnabled: true,
      fontScale: 1,
      uiScale: 1,
      enScale: 1,

      // Audio playback settings
      playMode: 'auto',
      speed: 1,
      delay: 1,
      order: 'seq',
      settingsDraft: {
        tajweedEnabled: false,
        showTranslation: true,
        showTransliteration: false,
        showWordByWord: false,
        wordByWordAudioEnabled: true,
      defaultFontSize: 120
      },

      // Quiz state
      quizActive: false,
      quizScore: 0,
      quizMistakes: [],
      quizComplete: false,
      quizQueue: [],
      quizIndex: 0,
      quizCard: null,
      quizOptions: [],
      quizAnswer: '',
      quizRevealed: false,
      studyMode: 'recite',
      quizType: 'mixed',

      // Data
      chapters: [],
      currentChapter: null,
      offlineSurahs: [],
      reciters: [{ id: 7, name: 'Alafasy' }],
      savedSessions: [],
      selectedStatsSessionId: '',
      exportSessionState: {
        activeSessionId: '',
        activeFormat: '',
        successSessionId: '',
        successFormat: '',
        errorSessionId: '',
        errorFormat: '',
        errorMessage: ''
      },
      loadingSessionId: '',
      showSessionAnalyticsModal: false,
      analyticsModalLoaded: false,
      analyticsModalRecordId: '',
      analyticsModalData: null,
      analyticsReportState: {
        loading: false,
        success: false,
        error: ''
      },
      selectedSessionId: '',
      sessionName: '',
      showRecordingsLibrary: false,
      isRecordingsLibraryLoading: false,
      recordingsLibrary: [],
      recordingsLibrarySearch: '',
      selectedRecordingsAyahKey: '',
      recordingsNavExpanded: true,
      pendingRecordingDeleteId: '',
      activeRecordingPlaybackId: '',
      recordingsAudioElement: null,
      recordingsAudioBound: false,
      showSelfCheckModal: false,
      selfCheckVerseRef: null,
      selfCheckVerseKey: '',
      selfCheckFontSize: 420,
      selfCheckTajweedEnabled: false,
      selfCheckBlurEnabled: false,
      selfCheckPeekActive: false,
      selfCheckPreparing: false,
      selfCheckPreparingLabel: '',
      isSelfCheckRecording: false,
      selfCheckPermissionState: 'idle',
      selfCheckError: '',
      selfCheckMediaRecorder: null,
      selfCheckMediaStream: null,
      selfCheckChunks: [],
      selfCheckStartedAt: 0,
      selfCheckDraft: null,
      selfCheckDiscardOnStop: false,
      activeSelfCheckPreviewKey: '',
      activeSelfCheckAyahPlaybackKey: '',
      selfCheckLastSavedAyahKey: '',
      recordingsLibraryReturnToSelfCheckKey: '',

      // Analytics
      sm2: {},
      events: [],
      plannerState: null,
      todayPlan: null,
      planRun: null,
      metrics: null,
      weakVersesList: [],
      // Simple stats
      simpleStats: {
        streak: 0,
        sessions: 0,
        memorised: 0,
        weak: 0
      },
      dailyPlan: {
        newVerses: 5,
        reviewVerses: 10,
        minutes: 20
      },
      todayPlanSummary: null,

      // UI Helpers
      banner: null,
      bannerTimer: null,
      networkOnline: true,
      restoredAudioState: null,
      loadVersesTimer: null,
      workspaceSyncTimer: null,
      toolsReturnFocusEl: null,
      segmentPlaybackTimer: null,
      segmentEndTime: 0,
      segmentPlaybackKind: '',
      touchStartX: 0,
      touchStartY: 0,
      hoverPeekVerseKey: null,
      touchPeekVerseKey: null,
      longPressPeekTimer: null,
      longPressPeekTriggered: false,
      blurPeekHoldingSpace: false,
      suppressNextVerseClick: false,

      // Word sequence
      wordSequence: null,
      playbackStartedAt: 0,
      currentVersePlaybackKey: '',
      currentPlaybackMode: 'verse',
      activeWordAudio: '',
      activeWordTooltip: null,
      compactMode: false,
      bookmarks: [],
      pins: [],

      // Options
      speedOptions: [0.5, 1, 1.25, 1.5, 2],
      delayOptions: [0, 0.5, 1, 2, 3, 5, 7, 10],
      rangeLoopDelay: 1,

      // Section open state - Expanded for consistency
      sectionOpen: {
        beginner_setup: true,
        beginner_audio: true,
        beginner_saved: false,
        advanced_setup: true,
        advanced_playback: false,
        advanced_practice: false,
        advanced_saved: false,
        session_tools: false,
        live_stats: false,
        analytics_overview: true,
        analytics_planner: true,
        analytics_weak: false,
        memorisation_techniques: false,
        saved_sessions: false,
        focus_mode: false,
        blur_mode: false,
        chaining: false,
        anchor_mode: false,
        presets: true,
        repetitions: false,
        gap_between: false,
      },

      // Audio event handlers
      audioTimeUpdate: null,
      audioEnded: null,
      audioError: null,
      audioPlaying: null,
      audioRateChange: null,
      audioLoadStart: null,
      lastAudioDebug: null,

      // AlQuran
      alquranAudioEditions: [],
      alquranEdition: '',

      // Misc
      currentVerseIndex: 0,
      isAudioLoading: false,
      sessionCompleted: false,
      sessionCompletedAt: null,
      hybridPendingKey: null,
      quizSkill: 'recite_text',
      quizSessionStats: null,
      quizLastResult: null,
      quizSummaryActive: false,
      verseRequestId: 0,
      verseDataCache: {},
      verseScrollMemory: {}
    }
  },

  computed: {
    actualGapDelay() {
      if (this.gapBetweenVerses === "none") return 0;
      if (this.gapBetweenVerses === "3s") return 3;
      if (this.gapBetweenVerses === "5s") return 5;
      if (this.gapBetweenVerses === "custom") return this.customGapSeconds;
      return "dynamic"; // For '1x' - duration based on verse length
    },
    isValidSessionName() {
      return this.saveSessionName && this.saveSessionName.trim().length > 0 && this.saveSessionName.trim().length <= 50
    },

    anchorModeDescription() {
      if (!this.anchorModeEnabled) return 'Anchor mode off · use key words as memory hooks'
      const anchors = { 1: 'first/last word', 2: 'key word pairs', 3: 'complete structure' }
      return `Using ${anchors[this.anchorCount]} as mental anchors for each ayah`
    },
    getChainingMethodLabel() {
      if (!this.chainingEnabled) return `Chaining off · ${this.chainingRepetitions} repeats`
      const label = this.chainingMethod === 'cumulative' ? 'Cumulative' : 'Linking'
      return `${label} · ${this.chainingRepetitions} repeats`
    },

    getChainingMethodDescription() {
      if (!this.chainingEnabled) {
        return 'Play the selected ayahs in order without chaining.'
      }
      if (this.chainingMethod === 'cumulative') {
        return 'Build recall progressively across memorised ayahs.'
      }
      return 'Connect ayahs sequentially during memorisation.'
    },

    getChainingMethodPreview() {
      if (!this.chainingEnabled) {
        return `Flow: selected ayahs in order, each ayah repeated ${this.chainingRepetitions} time${this.chainingRepetitions === 1 ? '' : 's'}.`
      }
      return this.chainingMethod === 'cumulative'
        ? `Cumulative flow: repeat 1, then 1-2, then 1-2-3. Each block repeats ${this.chainingRepetitions} time${this.chainingRepetitions === 1 ? '' : 's'}.`
        : `Linking flow: repeat the current ayah, the next ayah, then both together. Each step repeats ${this.chainingRepetitions} time${this.chainingRepetitions === 1 ? '' : 's'}.`
    },
    liveSessionStats() {
      const currentIndex = Math.max(0, Number(this.queueIndex || 0))
      const completedEntries = (this.queue || []).slice(0, currentIndex)
      const completedAyahs = new Set(
        completedEntries.map(item => item?.verse?.key || item?.key).filter(Boolean)
      ).size
      const elapsedMs = this.sessionStartedAt
        ? Math.max(0, Number(this.statsTick || Date.now()) - Number(this.sessionStartedAt))
        : 0
      const totalAttempts = completedAyahs + Number(this.sessionErrorCount || 0)
      const successRate = totalAttempts > 0
        ? Math.round((completedAyahs / totalAttempts) * 100)
        : 100

      return {
        ayahs_completed: completedAyahs,
        current_ayah_index: this.currentPosition,
        error_count: Number(this.sessionErrorCount || 0),
        session_time: this.formatTime(elapsedMs / 1000),
        success_rate: `${successRate}%`
      }
    },
    dueCount() {
      // "Due" is surfaced only as a count; scheduling/intervals remain invisible.
      const stats = this.mutqinState?.stats || {}
      const count = Number(stats.overdue_reviews || 0)
      return Number.isFinite(count) && count > 0 ? count : 0
    },
    flowCtaLabel() {
      if (!this.hasVerses) return 'Start'
      if (this.guidedUiStep === 'review') return 'Review'
      return 'Play'
    },
    flowHint() {
      if (!this.hasVerses) return 'Choose a surah and range, then start.'
      if (this.guidedUiStep === 'review') return this.dueCount ? `You have ${this.dueCount} verses to review.` : 'Review what is due.'
      return 'Play the active ayah. Use Tools for translation and word-by-word.'
    },
    setupSummary() {
      const repeatCount = Math.max(1, Number(this.repetitionsPerStep || 1))
      const playModeLabel = this.playMode === 'manual' ? 'manual advance' : 'auto advance'
      return `${repeatCount}x repeats, ${playModeLabel}, ${this.chainingEnabled ? `${this.chainingMethod} chaining` : 'plain sequence'}`
    },
    activePracticeTechniques() {
      const items = []
      if (this.focusModeEnabled) {
        items.push({
          key: 'focus',
          icon: 'bi bi-bullseye',
          label: 'Focus Mode',
          description: 'Non-active verses are softened so the current ayah stays central.'
        })
      }
      if (this.blurModeEnabled) {
        items.push({
          key: 'blur',
          icon: 'bi bi-cloud-haze2',
          label: 'Blur Mode',
          description: `Upcoming verses are hidden with ${this.blurIntensity}px blur for active recall.`
        })
      }
      if (this.chainingEnabled) {
        items.push({
          key: 'chaining',
          icon: 'bi bi-link-45deg',
          label: this.chainingMethod === 'cumulative' ? 'Cumulative Chaining' : 'Linking Chaining',
          description: `${this.chainingRepetitions} repeat${this.chainingRepetitions === 1 ? '' : 's'} per chaining step.`
        })
      }
      if (this.anchorModeEnabled) {
        items.push({
          key: 'anchor',
          icon: 'bi bi-pin-angle-fill',
          label: 'Anchor Mode',
          description: this.anchorModeDescription
        })
      }
      return items
    },
    appStyleVars() {
      return {
        '--ui-scale': this.uiScale,
        '--en-scale': this.enScale,
        '--text-scale': this.fontScale,
        '--recall-blur': `${this.blurIntensity}px`,
        '--focus-dim-opacity': `${Math.max(0.25, Math.min(0.85, Number(this.focusDimPercent || 54) / 100))}`
      }
    },
    chainingMethodDescription() {
      if (!this.chainingEnabled) {
        return 'Play the selected ayahs in order without chaining.'
      }
      if (this.chainingMethod === 'cumulative') {
        return 'Build longer connected runs from the first ayah outward.'
      }
      return 'Train the transition between neighbouring ayahs.'
    },
    chainingMethodLabel() {
      if (!this.chainingEnabled) return `Chaining off · ${this.chainingRepetitions} repeats`
      const label = this.chainingMethod === 'cumulative' ? 'Cumulative' : 'Linking'
      return `${label} · ${this.chainingRepetitions} repeats`
    },
    chainingMethodPreview() {
      if (!this.chainingEnabled) {
        return `Flow: selected ayahs in order, each ayah repeated ${this.chainingRepetitions} time${this.chainingRepetitions === 1 ? '' : 's'}.`
      }
      return this.chainingMethod === 'cumulative'
        ? `Cumulative flow: repeat 1, then 1-2, then 1-2-3. Each block repeats ${this.chainingRepetitions} time${this.chainingRepetitions === 1 ? '' : 's'}.`
        : `Linking flow: repeat the current ayah, the next ayah, then both together. Each step repeats ${this.chainingRepetitions} time${this.chainingRepetitions === 1 ? '' : 's'}.`
    },
    currentConfig() {
      return this.currentMode === 'beginner' ? this.beginner : this.advanced
    },
    activeAyahNumber() {
      const key = this.activeVerseKey
      if (!key) return null
      const verse = this.verses.find(v => v.key === key)
      if (verse && typeof verse.number !== 'undefined') return verse.number
      const parts = String(key).split(':')
      const n = Number(parts[1])
      return Number.isFinite(n) ? n : null
    },
    activeAyahLabel() {
      const n = this.activeAyahNumber
      return n ? `Ayah ${n}` : 'Ayah'
    },
    effectiveActiveVerseKey() {
      if (this.activeVerseKey) return this.activeVerseKey
      if (this.activeKey) return this.activeKey
      const queued = this.queue?.[this.queueIndex]
      return queued?.verse?.key || queued?.key || null
    },

    activeVerseRef() {
      return this.mushafDisplayVerses.find(v => v.key === this.effectiveActiveVerseKey) || null
    },
    activeMutqinAyah() {
      return this.effectiveActiveVerseKey ? this.mutqinState.ayahs?.[this.effectiveActiveVerseKey] || null : null
    },

    currentLearningPrompt() {
      const item = this.mutqinState?.sessionState?.queue?.[this.mutqinState?.sessionState?.current_index || 0]
      if (!item) return 'Listen and follow.'
      if (item.phase === 'Retention') return this.dueCount ? `${this.dueCount} verses to review.` : 'Review what is due.'
      if (this.guidedUiStep === 'recall') return 'Recite first, then reveal.'
      if (this.guidedUiStep === 'practice') return 'Try reciting with minimal support.'
      return 'Listen and follow.'
    },

    activeQueueEntry() {
      return this.queue?.[Math.max(0, Number(this.queueIndex || 0))] || null
    },
    sortedSavedSessions() {
      return [...this.savedSessions].sort((left, right) => {
        const leftTs = left?.savedAt ? Date.parse(left.savedAt) : 0
        const rightTs = right?.savedAt ? Date.parse(right.savedAt) : 0
        return rightTs - leftTs
      })
    },
    hasRecordingsLibraryEntries() {
      return this.recordingsLibrary.length > 0
    },
    filteredRecordingsAyahGroups() {
      const grouped = new Map()
      const query = String(this.recordingsLibrarySearch || '').trim().toLowerCase()

      this.recordingsLibrary.forEach(recording => {
        if (!recording?.ayahKey) return
        const searchHaystack = [
          recording.chapterName,
          `ayah ${recording.ayahNumber}`,
          `${recording.chapterId}:${recording.ayahNumber}`
        ].join(' ').toLowerCase()
        if (query && !searchHaystack.includes(query)) return

        if (!grouped.has(recording.ayahKey)) {
          grouped.set(recording.ayahKey, {
            ayahKey: recording.ayahKey,
            ayahNumber: recording.ayahNumber,
            chapterId: recording.chapterId,
            chapterName: recording.chapterName,
            recordings: []
          })
        }

        grouped.get(recording.ayahKey).recordings.push(recording)
      })

      const chapterMap = new Map()
      grouped.forEach(group => {
        const sorted = [...group.recordings].sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
        const total = sorted.length
        group.recordings = sorted.map((recording, index) => ({
          ...recording,
          attemptNumber: total - index
        }))
      })

      Array.from(grouped.values())
        .sort((left, right) => {
          if (Number(left.chapterId || 0) !== Number(right.chapterId || 0)) {
            return Number(left.chapterId || 0) - Number(right.chapterId || 0)
          }
          return Number(left.ayahNumber || 0) - Number(right.ayahNumber || 0)
        })
        .forEach(group => {
          if (!chapterMap.has(group.chapterId)) {
            chapterMap.set(group.chapterId, {
              chapterId: group.chapterId,
              chapterName: group.chapterName,
              ayahs: []
            })
          }
          chapterMap.get(group.chapterId).ayahs.push(group)
        })

      return Array.from(chapterMap.values())
    },
    filteredRecordingsAyahCount() {
      return this.filteredRecordingsAyahGroups.reduce((sum, group) => sum + group.ayahs.length, 0)
    },
    selectedRecordingsAyahGroup() {
      for (const surahGroup of this.filteredRecordingsAyahGroups) {
        const match = surahGroup.ayahs.find(ayah => ayah.ayahKey === this.selectedRecordingsAyahKey)
        if (match) return match
      }
      return null
    },
    selectedRecordingsAyahHistory() {
      const group = this.selectedRecordingsAyahGroup
      if (!group) return []
      const sorted = [...group.recordings].sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
      const total = sorted.length
      return sorted.map((recording, index) => ({
        ...recording,
        attemptNumber: total - index
      }))
    },
    selfCheckModalVerse() {
      if (!this.selfCheckVerseKey) return null
      const liveVerse = this.verses.find(verse => verse.key === this.selfCheckVerseKey) || null
      if (liveVerse) {
        return {
          ...this.selfCheckVerseRef,
          ...liveVerse,
          chapterName: liveVerse.chapterName
            || this.selfCheckVerseRef?.chapterName
            || this.currentChapter?.name_simple
            || this.activeChapterName
            || `Surah ${liveVerse.chapterId || ''}`.trim()
        }
      }
      return this.selfCheckVerseRef || null
    },
    selfCheckActiveDraft() {
      return this.selfCheckVerseKey ? this.getSelfCheckDraftForVerse(this.selfCheckVerseKey) : null
    },
    selfCheckModalAttempts() {
      if (!this.selfCheckVerseKey) return []
      const sorted = this.getAyahRecordingHistory(this.selfCheckVerseKey)
      const total = sorted.length
      return sorted.map((recording, index) => ({
        ...recording,
        attemptNumber: total - index
      }))
    },
    selfCheckLatestAttempt() {
      return this.selfCheckModalAttempts[0] || null
    },
    getSessionPrimaryLabel() {
      return (session = {}) => {
        const config = session?.config || {}
        const chapterName = config?.chapterName || (config?.chapterId ? `Surah ${config.chapterId}` : 'Session')
        const start = Number(config?.rangeStart || 0)
        const end = Number(config?.rangeEnd || 0)
        const rangeLabel = start && end ? `Ayahs ${start}\u2013${end}` : (start ? `Ayah ${start}` : '')
        return rangeLabel ? `${chapterName} \u00b7 ${rangeLabel}` : chapterName
      }
    },
    selectedStatsSessionRecord() {
      if (!this.sortedSavedSessions.length) return null
      return this.sortedSavedSessions.find(session => session.id === this.selectedStatsSessionId) || this.sortedSavedSessions[0] || null
    },
    activeExportErrorSessionId() {
      return this.exportSessionState.errorSessionId || ''
    },
    exportErrorMessage() {
      return this.exportSessionState.errorMessage || 'Unable to export this session right now.'
    },
    analyticsModalRecord() {
      if (!this.analyticsModalRecordId) return null
      return this.savedSessions.find(session => session.id === this.analyticsModalRecordId) || null
    },
    analyticsModalSessionLabel() {
      const session = this.analyticsModalRecord
      if (!session) return ''
      return this.getSessionPrimaryLabel(session)
    },
    analyticsModalSessionMeta() {
      const session = this.analyticsModalRecord
      if (!session) return ''
      const stats = this.normalizeSessionStats(session.stats || {}, session.config || {})
      return `Saved ${this.formatDate(session.savedAt)} · Duration ${this.formatTime(stats.time_spent_seconds || 0)}`
    },
    analyticsReportLabel() {
      if (this.analyticsReportState.loading) return 'Generating report...'
      if (this.analyticsReportState.success) return 'Download ready ✓'
      if (this.analyticsReportState.error) return 'Export failed, retry'
      return 'Download Report'
    },
    analyticsReportIcon() {
      if (this.analyticsReportState.loading) return 'bi-arrow-repeat spin'
      if (this.analyticsReportState.success) return 'bi-check2-circle'
      if (this.analyticsReportState.error) return 'bi-exclamation-triangle'
      return 'bi-download'
    },
    analyticsSummaryCards() {
      const data = this.analyticsModalData
      if (!data) return []
      return [
        { key: 'verses', label: 'Ayahs reviewed', value: `${data.metrics.verses_read}`, description: 'Distinct ayahs covered in this session.' },
        { key: 'time', label: 'Time memorising', value: this.formatTime(data.metrics.time_spent_seconds), description: 'Focused study time recorded for this session.' },
        { key: 'verse_plays', label: 'Verse plays', value: `${data.metrics.total_verse_play_count || 0}`, description: 'Total ayah audio starts across the selected range.' },
        { key: 'recall_strength', label: 'Recall strength', value: `${data.metrics.recall_strength || 'Low'}`, description: 'Simple snapshot of how strong this session felt overall.' }
      ]
    },
    analyticsTotalAyahs() {
      return Math.max(1, Number(this.analyticsModalData?.metrics?.total_ayahs || 1))
    },
    analyticsCurrentProgressPercent() {
      const reviewed = Math.max(0, Number(this.analyticsModalData?.metrics?.verses_read || 0))
      return Math.max(0, Math.min(100, Math.round((reviewed / this.analyticsTotalAyahs) * 100)))
    },
    analyticsRemainingProgressPercent() {
      return Math.max(0, 100 - this.analyticsCurrentProgressPercent)
    },
    analyticsProgressSummary() {
      const reviewed = Math.max(0, Number(this.analyticsModalData?.metrics?.verses_read || 0))
      return `${reviewed} of ${this.analyticsTotalAyahs} ayahs covered`
    },
    analyticsRemainingSummary() {
      const remaining = Math.max(0, this.analyticsTotalAyahs - Number(this.analyticsModalData?.metrics?.verses_read || 0))
      return `${remaining} ayah${remaining === 1 ? '' : 's'} left to complete the range`
    },
    analyticsVerseSeries() {
      return this.analyticsModalData?.charts?.verseSeries || []
    },
    analyticsLineDots() {
      const series = this.analyticsVerseSeries
      if (!series.length) return []
      const width = 320
      const height = 160
      const innerWidth = 280
      const innerHeight = 112
      const left = 20
      const bottom = 132
      const maxValue = Math.max(1, ...series.map(item => Number(item.value || 0)))
      return series.map((item, index) => {
        const x = left + ((innerWidth * index) / Math.max(1, series.length - 1))
        const y = bottom - ((Number(item.value || 0) / maxValue) * innerHeight)
        return { ...item, x, y }
      })
    },
    analyticsLinePath() {
      const dots = this.analyticsLineDots
      if (!dots.length) return ''
      return dots.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    },
    analyticsLineAreaPath() {
      const dots = this.analyticsLineDots
      if (!dots.length) return ''
      const first = dots[0]
      const last = dots[dots.length - 1]
      return `${this.analyticsLinePath} L ${last.x} 132 L ${first.x} 132 Z`
    },
    analyticsYAxisTicks() {
      const series = this.analyticsVerseSeries
      const maxValue = Math.max(1, ...series.map(item => Number(item.value || 0)))
      const steps = 4
      return Array.from({ length: steps + 1 }).map((_, index) => {
        const value = Math.round((maxValue * (steps - index)) / steps)
        const y = 20 + ((112 * index) / steps)
        return { value, y, label: `${value}` }
      })
    },
    analyticsReplayLeaders() {
      const series = this.analyticsVerseSeries.filter(item => Number(item.value || 0) > 0)
      const maxValue = Math.max(1, ...series.map(item => Number(item.value || 0)))
      return series
        .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
        .slice(0, 6)
        .map(item => ({
          ...item,
          percent: Math.max(12, Math.round((Number(item.value || 0) / maxValue) * 100))
        }))
    },
    analyticsPlaybackBuckets() {
      const series = this.analyticsVerseSeries
      if (!series.length) return []
      const played = series.filter(item => Number(item.value || 0) > 0)
      const strong = series.filter(item => Number(item.value || 0) >= 3)
      const maxValue = Math.max(0, ...series.map(item => Number(item.value || 0)))
      return [
        {
          key: 'played',
          label: 'Ayahs touched',
          value: `${played.length}/${series.length}`,
          description: 'Ayahs that received at least one play.'
        },
        {
          key: 'repeat-heavy',
          label: 'Repeat-heavy ayahs',
          value: `${strong.length}`,
          description: 'Ayahs receiving deeper repetition.'
        },
        {
          key: 'peak',
          label: 'Highest replay',
          value: `${maxValue}x`,
          description: 'Most repeated ayah in this saved session.'
        },
        {
          key: 'average',
          label: 'Average plays',
          value: `${played.length ? (series.reduce((sum, item) => sum + Number(item.value || 0), 0) / played.length).toFixed(1) : '0.0'}x`,
          description: 'Average plays across ayahs that were used.'
        }
      ]
    },
    sliderRepetitionValue() {
      return Math.min(10, Math.max(1, Number(this.repetitionsPerStep || 1)))
    },
    repetitionDisplayValue() {
      return `${this.repetitionsPerStep}x`
    },
    sessionPlayCountValue() {
      return Math.max(0, Number(this.mutqinState?.sessionState?.play_count || 0))
    },
    totalVersePlayCountValue() {
      const counts = this.mutqinState?.sessionState?.verse_play_counts || {}
      return Object.values(counts).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0)
    },
    sessionVersePlaySummary() {
      const counts = this.mutqinState?.sessionState?.verse_play_counts || {}
      const sourceVerses = Array.isArray(this.verses) && this.verses.length
        ? this.verses
        : Object.keys(counts).map(key => ({ key, number: String(key).split(':')[1] || key }))
      return sourceVerses
        .map(verse => ({
          key: verse.key,
          label: verse.number ? `Ayah ${verse.number}` : String(verse.key || 'Ayah'),
          count: Math.max(0, Number(counts?.[verse.key] || 0))
        }))
        .filter(item => item.count > 0)
        .slice(0, 6)
    },
    onboardingStepContent() {
      return this.onboardingSteps[this.onboardingStepIndex] || this.onboardingSteps[0]
    },
    chainingProgressLabel() {
      if (!this.chainingEnabled) return ''
      const entry = this.activeQueueEntry
      if (!entry) return 'Ready'
      const total = Math.max(1, Number(entry?.totalRepeats || 1))
      const current = Math.max(1, Number(entry?.repeatCount || 1))
      const repeatSuffix = total > 1 ? `repeat ${current}/${total}` : 'single pass'

      if (entry?.phase === 'Linking') {
        const pos = Math.max(1, Number(entry.sequencePosition || 1))
        const all = Math.max(1, Number(entry.sequenceTotal || 1))
        const label = all > 1 ? `pair ${pos}/${all}` : 'single ayah'
        return `${label} · ${repeatSuffix}`
      }
      if (entry?.phase === 'Cumulative') {
        const pos = Math.max(1, Number(entry.sequencePosition || 1))
        const all = Math.max(1, Number(entry.sequenceTotal || 1))
        return `block ${pos}/${all} · ${repeatSuffix}`
      }
      return repeatSuffix
    },
    loopCountOptions() {
      return [
        { value: 1, shortLabel: '1x', label: 'Play once' },
        { value: 3, shortLabel: '3x', label: 'Repeat 3 times' },
        { value: 5, shortLabel: '5x', label: 'Repeat 5 times' },
        { value: 10, shortLabel: '10x', label: 'Repeat 10 times' },
        { value: 'infinite', shortLabel: 'Inf', label: 'Infinite loop' }
      ]
    },
    chainingNextStepLabel() {
      if (!this.chainingEnabled) return ''
      if (this.chainingMethod === 'cumulative') {
        return 'Next: add one ayah to the block'
      }
      return 'Next: single -> next -> pair'
    },
    chainingWhyHint() {
      if (!this.chainingEnabled) return ''
      if (this.chainingMethod === 'cumulative') return 'Use when you want to build longer runs by adding one ayah at a time.'
      return 'Use when you want to strengthen transitions between neighboring ayahs.'
    },
    currentActionLabel() {
      if (!this.hasVerses) return 'Choose a surah and ayah range to begin.'
      if (!this.effectiveActiveVerseKey) return 'Start the session to build your memorisation queue.'
      if (this.guidedUiStep === 'review') return 'Review this ayah, then continue.'
      if (this.guidedUiStep === 'recall') return 'Recite from memory, then reveal to confirm.'
      if (this.isPlaying) return 'Listen to the active ayah and follow calmly.'
      return 'Press play, then recite and repeat at your pace.'
    },
    reviewPriorityLabel() {
      if (this.guidedUiStep !== 'review') return ''
      if (this.dueCount > 0) return `${this.dueCount} review${this.dueCount === 1 ? '' : 's'} due now`
      return 'Review due now'
    },
    feedbackCounts() {
      const ayahs = Object.values(this.mutqinState?.ayahs || {})
      let mastered = 0
      let weak = 0
      let repeat = 0
      ayahs.forEach(ayah => {
        if (Number(ayah?.mastery_level || 0) >= 5 || ayah?.status === 'mastered') mastered += 1
        if (Number(ayah?.weak_count || 0) > 0 || ayah?.status === 'weak') weak += 1
        if (Number(ayah?.repetition_count || 0) > 0 && Number(ayah?.mastery_level || 0) < 5) repeat += 1
      })
      return { mastered, weak, repeat }
    },
    sessionFeedback() {
      const queue = this.queue || []
      const total = Math.max(1, queue.length)
      const done = Math.max(0, Number(this.queueIndex || 0))
      const repetitionProgress = Math.max(0, Math.min(100, Math.round((done / total) * 100)))
      const chainTotal = Math.max(1, queue.filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length || total)
      const chainDone = Math.max(0, queue.slice(0, done).filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length)
      const chainProgress = Math.max(0, Math.min(100, Math.round((chainDone / chainTotal) * 100)))
      const retentionTotal = Math.max(1, queue.filter(item => item?.phase === 'Retention').length)
      const retentionDone = Math.max(0, queue.slice(0, done).filter(item => item?.phase === 'Retention').length)
      const retentionProgress = Math.max(0, Math.min(100, Math.round((retentionDone / retentionTotal) * 100)))
      return { chainProgress, repetitionProgress, retentionProgress }
    },
    hasSessionFeedback() {
      return Array.isArray(this.queue) && this.queue.length > 0
    },
    hasSessionStarted() {
      return this.isSessionLive
    },
    isSessionLive() {
      return !!this.mutqinState?.sessionState?.active && this.hasSessionFeedback && !this.sessionCompleted
    },
    isSessionCompleted() {
      return !!this.sessionCompleted || this.centralSession?.sessionStatus === 'completed'
    },
    showSessionCompletedState() {
      return this.isSessionCompleted && !this.hasSessionStarted
    },
    resumeFeedback() {
      const payload = this.continueSessionPayload
      const queue = payload?.queue || this.queue || []
      const current = Math.max(0, Number(payload?.queueIndex || this.queueIndex || 0))
      const total = Math.max(1, queue.length)
      const repetitionProgress = Math.max(0, Math.min(100, Math.round((current / total) * 100)))
      const chainTotal = Math.max(1, queue.filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length || total)
      const chainDone = Math.max(0, queue.slice(0, current).filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length)
      const chainProgress = Math.max(0, Math.min(100, Math.round((chainDone / chainTotal) * 100)))
      const retentionTotal = Math.max(1, queue.filter(item => item?.phase === 'Retention').length || 1)
      const retentionDone = Math.max(0, queue.slice(0, current).filter(item => item?.phase === 'Retention').length)
      const retentionProgress = Math.max(0, Math.min(100, Math.round((retentionDone / retentionTotal) * 100)))
      return { chainProgress, repetitionProgress, retentionProgress }
    },

    guidedUiStep() {
      const item = this.mutqinState?.sessionState?.queue?.[this.mutqinState?.sessionState?.current_index || 0]
      if (item?.phase === 'Retention') return 'review'
      return 'learn'
    },

    sessionConfig() {
      return this.buildSessionConfig(this.currentMode)
    },

    hasVerses() {
      const config = this.currentConfig
      return config.verses?.length > 0
    },
    continueSessionMeta() {
      const payload = this.continueSessionPayload
      if (!payload) return 'Your last study session is ready to continue.'
      const ayah = payload.activeVerseKey ? String(payload.activeVerseKey).split(':')[1] : null
      const minutesAgo = Math.max(0, Math.round((Date.now() - Number(payload.timestamp || 0)) / 60000))
      const timeLabel = minutesAgo < 1 ? 'saved just now' : `saved ${minutesAgo} min ago`
      return `Resume from ayah ${ayah || payload.config?.rangeStart || 1}, ${timeLabel}.`
    },

    resumeModalTitle() {
      if (!this.continueSessionPayload?.config?.chapterId) return 'Resume last session'
      const c = this.continueSessionPayload.config
      const chapter = this.chapters.find(item => Number(item.id) === Number(c.chapterId))
      return `${chapter?.name_simple || 'Saved session'} · Ayahs ${c.rangeStart}-${c.rangeEnd}`
    },

    resumeWhatNext() {
      if (this.dueCount) return `You have ${this.dueCount} verses due for review. Continue to pick up where you left off.`
      return 'Continue from your last saved ayah and keep building consistency.'
    },

    resumeSavedAtLabel() {
      const ts = Number(this.continueSessionPayload?.timestamp || 0)
      if (!ts || !Number.isFinite(ts)) return ''
      return new Date(ts).toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    hasSelectedSurah() {
      const chapterId = this.currentConfig.chapterId
      return chapterId && chapterId > 0
    },

    activeChapter() {
      const id = Number(this.chapterId || 0)
      if (!id || !Array.isArray(this.chapters) || !this.chapters.length) return null
      return this.chapters.find(c => Number(c.id) === id) || null
    },

    activeChapterName() {
      return this.activeChapter?.name_simple || 'Choose surah'
    },

    versesMasteredDeltaThisWeek() {
      try {
        const raw = localStorage.getItem('telawa.masteredWeekly') || 'null'
        const data = JSON.parse(raw)
        if (!data || !Array.isArray(data.series)) return 0
        return data.series.reduce((a, b) => a + Number(b || 0), 0)
      } catch {
        return 0
      }
    },

    chapterId: {
      get() { return this.currentConfig.chapterId || 0 },
      set(val) {
        const numVal = Number(val) || 0
        if (this.currentMode === 'beginner') {
          this.beginner.chapterId = numVal
        } else {
          this.advanced.chapterId = numVal
        }
      }
    },

    rangeStart: {
      get() { return this.currentConfig.rangeStart },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.rangeStart = val
        else this.advanced.rangeStart = val
      }
    },

    rangeEnd: {
      get() { return this.currentConfig.rangeEnd },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.rangeEnd = val
        else this.advanced.rangeEnd = val
      }
    },

    reciterId: {
      get() { return this.currentConfig.reciterId },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.reciterId = val
        else this.advanced.reciterId = val
      }
    },

    speed: {
      get() { return this.currentConfig.speed },
      set(val) {
        const safeSpeed = this.speedOptions?.includes(Number(val)) ? Number(val) : 1
        if (this.currentMode === 'beginner') this.beginner.speed = safeSpeed
        else this.advanced.speed = safeSpeed
      }
    },

    delay: {
      get() { return this.currentConfig.delay },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.delay = val
        else this.advanced.delay = val
      }
    },

    playMode: {
      get() { return this.currentConfig.playMode },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.playMode = val
        else this.advanced.playMode = val
      }
    },

    order: {
      get() { return this.currentConfig.order },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.order = val
        else this.advanced.order = val
      }
    },

    visualMode() {
      return 'standard'
    },

    verses: {
      get() { return this.currentConfig.verses },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.verses = val
        else this.advanced.verses = val
      }
    },

    activeKey: {
      get() { return this.currentConfig.activeKey },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.activeKey = val
        else this.advanced.activeKey = val
      }
    },

    queue: {
      get() { return this.currentConfig.queue },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.queue = val
        else this.advanced.queue = val
      }
    },

    queueIndex: {
      get() { return this.currentConfig.queueIndex },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.queueIndex = val
        else this.advanced.queueIndex = val
      }
    },

    totalVerses() {
      return Math.max(0, this.rangeEnd - this.rangeStart + 1)
    },

    currentPosition() {
      const key = this.effectiveActiveVerseKey || this.activeKey
      if (!key) return 1
      const num = parseInt(String(key).split(':')[1])
      return Math.max(1, num - this.rangeStart + 1)
    },

    sessionContextBadge() {
      const chapterName = this.currentChapter?.name_simple || this.activeChapterName || 'Session'
      const total = Math.max(1, Number(this.totalVerses || 1))
      const ayah = Math.max(1, Math.min(total, Number(this.currentPosition || 1)))
      return `Memorising - ${chapterName} - Ayah ${ayah}/${total}`
    },

    remainingAyahs() {
      return Math.max(0, this.totalVerses - this.currentPosition)
    },

    progressPercent() {
      if (!this.totalVerses) return 0
      return Math.round((this.currentPosition / this.totalVerses) * 100)
    },

    canPrev() {
      return this.queueIndex > 0
    },

    canNext() {
      return this.queueIndex < this.queue.length - 1
    },

    seekPercent() {
      if (!this.duration) return 0
      return (this.currentTime / this.duration) * 100
    },

    plannerEstimatedDays() {
      const perDay = Math.max(1, this.plannerConfig.versesPerDay || 1)
      const total = this.plannerConfig.totalVersesInSurah || 1
      return Math.ceil(total / perDay)
    },

    plannerEstimatedTimePerDay() {
      const perDay = Math.max(1, this.plannerConfig.versesPerDay || 1)
      const minutesPerVerse = this.plannerConfig.minutesPerVerse || 2
      return perDay * minutesPerVerse
    },

    plannerTotalVerses() {
      return this.plannerConfig.totalVersesInSurah || 0
    },

    plannerCompletionDateFormatted() {
      const days = this.plannerEstimatedDays
      if (!days || days === 0) return '—'
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    },

    plannerCompletionDateFull() {
      const days = this.plannerEstimatedDays
      if (!days || days === 0) return '—'
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d.toDateString()
    },

    isLoggedIn() {
      return !!this.auth?.check
    },

    sessionTypeInfo() {
      return { key: 'memorisation', label: 'Memorisation', tone: 'memorisation' }
    },

    quranFontFamily() {
      const fonts = {
        amiri: "'Amiri', 'Noto Naskh Arabic', serif",
        naskh: "'Noto Naskh Arabic', 'Amiri', serif",
        scheherazade: "'Scheherazade New', 'Noto Naskh Arabic', serif",
        lateef: "'Lateef', 'Amiri', serif",
        uthmanic: "'UthmanicHafs', 'Amiri', 'Noto Naskh Arabic', serif"
      }
      return fonts[this.quranFont] || fonts.uthmanic
    },

    collapsedPlayerTitle() {
      const verse = this.verses.find(v => v.key === this.activeKey)
      if (!verse) return this.currentChapter?.name_simple || 'Now playing'
      return `${this.currentChapter?.name_simple || 'Session'} · Ayah ${verse.number}`
    },

    collapsedPlayerSubtitle() {
      if (!this.activeKey) return `${this.sessionTypeInfo.label} · 0% complete`
      return `${this.sessionTypeInfo.label} · ${this.queueIndex + 1}/${this.queue.length} · ${this.formatTime(this.currentTime)} / ${this.formatTime(this.duration)}`
    },

    railPrimaryLabel() {
      return this.isPlaying ? 'Pause' : 'Start session'
    },
    guidedPhaseLabel() {
      if (this.guidedUiStep === 'review') return 'Review'
      if (this.guidedUiStep === 'recall') return 'Recall'
      if (this.guidedUiStep === 'practice') return 'Practice'
      return 'Learn'
    },

    guidedPrimaryCta() {
      if (this.guidedPhaseLabel === 'Learn') return 'Listen & Follow'
      if (this.guidedPhaseLabel === 'Practice') return 'Try Reciting'
      if (this.guidedPhaseLabel === 'Recall') return 'Continue'
      if (this.guidedPhaseLabel === 'Review') return 'Continue'
      return 'Continue'
    },
    guidedInstruction() {
      if (this.guidedPhaseLabel === 'Learn') return 'Listen and follow the recitation.'
      if (this.guidedPhaseLabel === 'Practice') return 'Try reciting with the ayah still partially visible.'
      if (this.guidedPhaseLabel === 'Recall') return 'Recall the ayah before moving forward.'
      if (this.guidedPhaseLabel === 'Review') return 'Review the verses due now.'
      return 'Continue your session.'
    },

    activeCardKicker() {
      if (this.guidedUiStep === 'review') return '✨ Time to refresh';
      if (this.isPlaying) return '🌙 Keeping the rhythm steady';
      return '🌿 Begin with Bismillah, keep your heart with the ayah';
    },

    activeCardBody() {
      if (this.guidedUiStep === 'review') return this.dueCount
        ? `You have ${this.dueCount} ayahs awaiting review. Revisit them gently and keep the chain strong.`
        : 'Return to this ayah with a calm review before moving ahead.'
      return `${this.currentLearningPrompt} Keep your tongue, eyes, and heart together on this ayah.`
    },

    plannerKeyboardActive() {
      return this.showPlannerModal
    },

    canStartSession() {
      const config = this.sessionConfig
      return this.appReady &&
        // Allow starting when verses are already loaded, even if a background refresh is in progress.
        (this.isDataReady || (!!this.verses.length || !!this.currentConfig.verses.length)) &&
        !!config.chapterId &&
        config.rangeStart > 0 &&
        config.rangeEnd >= config.rangeStart &&
        (!!this.verses.length || !!this.currentConfig.verses.length)
    },

    currentSessionExplanation() {
      const modeLabel = this.currentMode === 'advanced' ? 'Advanced' : 'Beginner'
      return `${modeLabel} session using ${this.chainingMethodLabel.toLowerCase()}.`
    },
    currentControlInfo() {
      const labels = []
      labels.push(`Font ${this.getCurrentFontLabel()}`)
      if (this.showTranslation) labels.push('Translation on')
      if (this.showTransliteration) labels.push('Transliteration on')
      if (this.showWordByWord) labels.push('Word-by-word on')
      if (this.wordByWordAudioEnabled) labels.push('Word audio on')
      if (this.tajweedEnabled) labels.push('Tajweed on')
      return labels.length ? labels.join(' • ') : 'No reading aids active'
    },
    appliedFeaturePills() {
      const pills = [`${this.guidedPhaseLabel} mode`, `Font: ${this.getCurrentFontLabel()}`]
      if (this.showTranslation) pills.push('Translation')
      if (this.showTransliteration) pills.push('Transliteration')
      if (this.showWordByWord) pills.push('Word by word')
      if (this.wordByWordAudioEnabled) pills.push('Word audio')
      if (this.tajweedEnabled) pills.push('Tajweed')
      return pills
    },

    setupReadinessHint() {
      if (!this.chapters.length) return 'Loading surah list...'
      if (!this.hasSelectedSurah) return 'Choose a surah and verse range.'
      const range = `${this.rangeStart}-${this.rangeEnd}`
      return `${this.activeChapterName} ayahs ${range}. Start when ready.`
    },

    startButtonHelp() {
      if (!this.hasSelectedSurah) return 'Choose a surah first'
      if (!this.isDataReady) return 'Verses are still loading'
      if (!this.canStartSession) return 'Check the ayah range and optional tools'
      return 'Start guided memorisation'
    },

    etaSubtext() {
      if (!this.remainingAyahs) return 'Ready to complete'
      return `Review + repetition included`
    },

    etaLabel() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return '0 min'

      const reviewTimePerAyah = 5
      let totalSeconds = 0

      remainingItems.forEach((item, index) => {
        totalSeconds += this.getQueueItemAudioSeconds(item, index === 0) + reviewTimePerAyah
      })

      const delaySeconds = (this.delay || 1) * (remainingItems.length - 1)
      totalSeconds += delaySeconds
      const minutes = Math.max(0, Math.ceil(totalSeconds / 60))
      return `Audio time ≈ ${minutes} min`
    },

    etaLabelAudioOnly() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return '0 min'

      let totalAudioSeconds = 0
      remainingItems.forEach((item, index) => {
        totalAudioSeconds += this.getQueueItemAudioSeconds(item, index === 0)
      })

      const minutes = Math.max(0, Math.ceil(totalAudioSeconds / 60))
      return `Audio time ≈ ${minutes} min`
    },

    currentChainPhase() {
      return 0
    },

    toolsHeaderTitle() {
      if (this.tab === 'stats') return 'Insights'
      if (this.tab === 'settings') return 'Settings'
      if (this.tab === 'advanced') return 'Advanced session'
      return 'Guided session setup'
    },

    contextLabel() {
      const surah = this.currentChapter?.name_simple || 'No surah selected'
      const range = this.chapterId ? `${this.rangeStart}-${this.rangeEnd}` : ''
      return `${surah}${range ? ` • ${range}` : ''} • ${this.sessionTypeInfo.label}`
    },

    activeVerseIndex() {
      if (!this.activeVerseKey || !this.verses.length) return -1
      return this.verses.findIndex(v => v.key === this.activeVerseKey)
    },

    canGoPrev() {
      return this.activeVerseIndex > 0
    },

    canGoNext() {
      return this.activeVerseIndex >= 0 && this.activeVerseIndex < this.verses.length - 1
    },

    mushafPageSize() {
      if (typeof window !== 'undefined' && window.innerWidth < 680) return 5
      return 7
    },

    mushafDisplayVerses() {
      const modeVerses = Array.isArray(this.currentConfig?.verses) ? this.currentConfig.verses : []
      const localVerses = Array.isArray(this.verses) ? this.verses : []
      return modeVerses.length ? modeVerses : localVerses
    },

    mushafPages() {
      const sourceVerses = this.mushafDisplayVerses
      if (!sourceVerses.length) return []
      return [{
        id: `mushaf-${sourceVerses[0].key}-${sourceVerses[sourceVerses.length - 1].key}`,
        verses: sourceVerses,
        startNumber: sourceVerses[0].number,
        endNumber: sourceVerses[sourceVerses.length - 1].number
      }]
    },

    mushafSurahTitle() {
      const chapterId = Number(this.chapterId || this.currentChapter?.id || this.currentConfig?.chapterId || 0)
      const fallbackTitles = {
        1: 'سُورَةُ الْفَاتِحَةِ',
        112: 'سُورَةُ الْإِخْلَاصِ',
        113: 'سُورَةُ الْفَلَقِ',
        114: 'سُورَةُ النَّاسِ'
      }
      return this.currentChapter?.name_arabic || fallbackTitles[chapterId] || `سُورَةُ ${this.currentChapter?.name_simple || this.activeChapterName || ''}`
    },

    showMushafBismillah() {
      const chapterId = Number(this.chapterId || this.currentChapter?.id || this.currentConfig?.chapterId || 0)
      return chapterId !== 9
    },

    mushafTrackStyle() {
      const pageIndex = this.safeMushafPageIndex
      return {
        transform: `translateX(${-pageIndex * 100}%)`
      }
    },

    safeMushafPageIndex() {
      if (!this.mushafPages.length) return 0
      return Math.max(0, Math.min(Number(this.mushafPageIndex || 0), this.mushafPages.length - 1))
    },

    canGoPreviousMushafPage() {
      return this.safeMushafPageIndex > 0
    },

    canGoNextMushafPage() {
      return this.safeMushafPageIndex < this.mushafPages.length - 1
    },

    quizAccuracy() {
      if (!this.quizQueue.length) return 0
      return Math.round((this.quizScore / this.quizQueue.length) * 100)
    },

    nextActionDescription() {
      return 'Select a surah and verses to start memorising'
    }
  },

  async mounted() {
    this.activeLocale = this.$i18n?.locale?.value || 'en'
    this.handleLocaleChange = (event) => {
      this.activeLocale = event?.detail?.locale || this.$i18n?.locale?.value || 'en'
      this.$forceUpdate()
    }
    this.handleGlobalThemeChange = (event) => {
      const nextTheme = event?.detail?.theme || document.documentElement.getAttribute('data-theme') || 'light'
      this.theme = nextTheme
    }
    this.handleThemeStorageSync = (event) => {
      if (event?.key && event.key !== 'mutqin-theme') return
      const nextTheme = event?.newValue || document.documentElement.getAttribute('data-theme') || 'light'
      this.theme = nextTheme
    }
    window.addEventListener('mutqin:theme-change', this.handleGlobalThemeChange)
    window.addEventListener('mutqin:locale-change', this.handleLocaleChange)
    window.addEventListener('storage', this.handleThemeStorageSync)
    this.watchActiveVerse()
    this.$nextTick(() => {
      const navbar = document.querySelector('.navbar')
      if (navbar) {
        const navbarHeight = navbar.offsetHeight
        document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`)
      }
    })
    // Re-apply highlights when word-by-word toggles
    this.$watch('showWordByWord', () => {
      if (this.anchorModeEnabled) {
        setTimeout(() => this.applyAnchorHighlights(), 100)
      }
    })

    // Re-apply when tajweed toggles
    this.$watch('tajweedEnabled', () => {
      if (this.anchorModeEnabled) {
        setTimeout(() => this.applyAnchorHighlights(), 100)
      }
    })
    this.$watch('effectiveActiveVerseKey', () => {
      if (this.readingViewMode === 'mushaf') this.syncMushafPageToActiveVerse()
    })
    this.$watch(() => this.mushafPages.length, () => {
      this.syncMushafPageToActiveVerse()
    })
    this.unwatchMutqinState = watchMutqinState(this.mutqinState)
    this.loadVerseFontSizes()
    this.migrateLocalStorage()
    this.loadUiState()
    this.loadCentralSessionState()
    this.restoreSessionState()
    await this.loadChapters()
    await this.loadReciters()
    this.loadSavedSessions()
    this.loadOfflineCatalog()
    this.loadSm2()
    this.loadEvents()
    this.loadPlanner()
    this.loadMetrics()
    this.loadAnalytics()
    this.initAudio()
    this.restoreAudioState()
    this.theme = document.documentElement.getAttribute('data-theme') || this.theme
    if (!this.isLoggedIn) {
      this.theme = 'dark'
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    this.loadBookmarksPins(),
      this.setupWordClickHandler()
    this.loadContinueSessionPrompt()
    this.updateMasteredWeekly()
    this.loadSavedSessions()
    this.loadRecordingsLibrary()

    if (this.isLoggedIn && this.hasContinueSession) {
      // One clear entry point for returning users.
      this.showResumeModal = true
    }


    if (this.currentMode === 'advanced' && this.advanced.chapterId) {
      this.currentMode = 'advanced'
      this.tab = 'tools'
      this.showTools = false
      await this.loadVerses()
    } else if (this.beginner.chapterId) {
      this.currentMode = 'beginner'
      this.tab = 'tools'
      this.showTools = false
      await this.loadVerses()
    } else {
      this.tab = 'tools'
      this.showTools = false
    }

    this.isBootstrapping = false
    this.appReady = true
    this.$nextTick(() => {
      if (this.isLoggedIn && !this.hasCompletedOnboarding()) {
        this.openOnboardingModal(false)
      }
    })

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('beforeunload', this.persistAllState)
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('keyup', this.handleGlobalKeyup)
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true })
    document.addEventListener('click', this.handleClickOutside)
    this.statsInterval = window.setInterval(() => {
      this.statsTick = Date.now()
    }, 250)
  },

  beforeUnmount() {
    if (this.anchorHighlightObserver) {
      this.anchorHighlightObserver.disconnect()
    }
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('mutqin:locale-change', this.handleLocaleChange)
    window.removeEventListener('beforeunload', this.persistAllState)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener('keyup', this.handleGlobalKeyup)
    window.removeEventListener('scroll', this.handleWindowScroll)
    this.syncBodyScrollLock(false)
    this.clearTouchPeek()
    this.blurPeekHoldingSpace = false
    if (this.bannerTimer) clearTimeout(this.bannerTimer)
    if (this.loadVersesTimer) clearTimeout(this.loadVersesTimer)
    if (this.workspaceSyncTimer) clearTimeout(this.workspaceSyncTimer)
    if (this.segmentPlaybackTimer) clearTimeout(this.segmentPlaybackTimer)
    this.flushPlaybackTime()
    this.stopWordHighlighting()
    this.stopRecordingsPlayback({ clearSource: true })
    if (this.selfCheckMediaRecorder && this.selfCheckMediaRecorder.state === 'recording') {
      this.selfCheckDiscardOnStop = true
      try { this.selfCheckMediaRecorder.stop() } catch {}
    }
    this.cleanupSelfCheckMedia()
    this.persistAllState()
    saveMutqinState(this.mutqinState)
    if (this.unwatchMutqinState) this.unwatchMutqinState()
    document.removeEventListener('click', this.handleClickOutside)
    if (this.statsInterval) window.clearInterval(this.statsInterval)
  },

  watch: {
    theme: 'persistUiState',
    showTools(newVal) {
      this.syncBodyScrollLock(newVal)
      this.persistUiState()
    },
    '$route'() {
      if (this.showTools) {
        this.closeToolsPanel()
    }
  },

  beforeUnmount() {
    window.removeEventListener('mutqin:theme-change', this.handleGlobalThemeChange)
    window.removeEventListener('storage', this.handleThemeStorageSync)
  },
    tab(newVal) {
      if (!['tools', 'techniques', 'saved', 'stats', 'settings'].includes(newVal)) {
        this.tab = 'tools'
        return
      }
      this.persistUiState()
      this.persistCentralSessionState()
    },
    fadingVerseEnabled(newVal) {
      if (newVal && this.showWordByWord) {
        this.showWordByWord = false;
        this.showBanner('Fading Mode: Word-by-Word disabled', 'info', 2000);
      }
    },
    showWordByWord(newVal) {
      if (newVal && this.fadingVerseEnabled) {
        this.fadingVerseEnabled = false;
        this.showBanner('Word-by-Word Mode: Fading disabled', 'info', 2000);
      }
    },
    focusModeEnabled(newVal) {
      if (newVal && this.blurModeEnabled) {
        this.blurModeEnabled = false;
        this.showBanner('🎯 Focus Mode: On | 🌫️ Blur Mode: Off (cannot use together)', 'info', 2000);
      }
      this.persistUiState();
    },

    blurModeEnabled(newVal) {
      if (newVal && this.focusModeEnabled) {
        this.focusModeEnabled = false;
        this.showBanner('🌫️ Blur Mode: On | 🎯 Focus Mode: Off (cannot use together)', 'info', 2000);
      }
      // 🔥 NEW: Auto-disable Chaining when Blur turns on
      if (newVal && this.chainingEnabled) {
        this.chainingEnabled = false;
        this.showBanner('🌫️ Blur Mode: On | 🔗 Chaining: Off — Blur hides upcoming verses needed for chaining', 'warning', 3000);
      }
      this.persistUiState();
    },

    // 🔥 NEW: Auto-disable Blur when Chaining turns on
    chainingEnabled(newVal) {
      if (newVal && this.blurModeEnabled) {
        this.blurModeEnabled = false;
        this.showBanner('🔗 Chaining: On | 🌫️ Blur Mode: Off — You need to see upcoming verses for chaining to work', 'warning', 3000);
      }
      if (newVal && !this.anchorModeEnabled) {
        this.showBanner('💡 Tip: Enable Anchor Mode with Chaining for better recall', 'info', 2000);
      }
      this.persistUiState();
      this.persistCentralSessionState();
      this.applyChainingQueueChange(this.currentMode);
    },
    chapterId(val) {
      this.persistUiState()
      const id = Number(val || 0)
      this.currentChapter = id ? (this.chapters.find(c => Number(c.id) === id) || null) : null
    },
    rangeStart() {
      this.persistUiState()
    },
    rangeEnd() {
      this.persistUiState()
    },
    reciterId() {
      this.persistUiState()
    },
    speed() {
      this.applySpeed()
      this.persistUiState()
      this.persistCentralSessionState()
    },
    delay: 'persistUiState',
    playMode: 'persistUiState',
    order: 'persistUiState',
    chainingEnabled() {
      this.persistUiState()
      this.persistCentralSessionState()
      this.applyChainingQueueChange(this.currentMode)
    },

    chainingMethod() {
      this.persistUiState()
      this.persistCentralSessionState()
      this.applyChainingQueueChange(this.currentMode)
    },

    chainingRepetitions(newVal) {
      const safeValue = Math.max(1, Math.min(5, Number(newVal || 1)))
      if (safeValue !== Number(this.chainingRepetitions)) {
        this.chainingRepetitions = safeValue
      }
      this.persistUiState()
      this.persistCentralSessionState()
      this.applyChainingQueueChange(this.currentMode)
    },

    showWordByWord: 'persistUiState',
    defaultFontSize: 'persistUiState',
    tajweedEnabled: 'persistUiState',
    showTranslation: 'persistUiState',
    showTransliteration: 'persistUiState',
    showWordByWord(newVal) {
      this.persistUiState()
      if (newVal) this.restoreWordScroll(this.effectiveActiveVerseKey)
    },
    wordByWordAudioEnabled: 'persistUiState',
    fontScale: 'persistUiState',
    quranFont: 'persistUiState',
    script: 'persistUiState',
    repetitionsPerStep(newVal) {
      const safeValue = Math.max(1, Math.min(50, Number(newVal || 1)))
      if (safeValue !== Number(this.repetitionsPerStep)) {
        this.repetitionsPerStep = safeValue
        return
      }
      this.persistUiState()
      this.persistCentralSessionState()
      if (this.hasVerses && !this.chainingEnabled) this.rebuildQueue(this.currentMode)
    },
    selectedLoopCount: 'persistUiState',
    gapBetweenVerses: 'persistUiState',
    customGapSeconds: 'persistUiState',
    focusDimPercent: 'persistUiState',
    activeKey: 'persistSessionState',
    queueIndex: 'persistSessionState',
    playerVisible: 'persistAudioState',
    isPlaying: 'persistAudioState',
    currentTime: 'persistAudioState',
    flowStep: 'persistUiState',
    sectionOpen: { handler: 'persistUiState', deep: true },
    statsTick() {
      if (this.showSessionAnalyticsModal) this.refreshAnalyticsModalData()
    },

    tajweedEnabled() {
      this.persistUiState()
      this.persistCentralSessionState()
    },

    activeVerseKey(newVal) {
      this.persistSessionState()
      if (this.showWordByWord) this.restoreWordScroll(newVal)
    },

    focusModeEnabled: 'persistControlState',
    blurModeEnabled: 'persistControlState',
    blurIntensity: 'persistControlState',
    defaultFontSize: 'persistUiState'
  },

  methods: {
    t(key, params = {}) {
      const translator = this.$t
      if (typeof translator !== 'function') return key
      return translator(key, params)
    },

    async onLanguageChange(locale) {
      if (!this.$setLocale) return
      await this.$setLocale(locale)
      this.activeLocale = this.$i18n?.locale?.value || locale
    },

    syncBodyScrollLock(locked) {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('tools-panel-open', !!locked)
      const shouldLock = !!locked
        || this.showTools
        || this.showRecordingsLibrary
        || this.showSelfCheckModal
        || this.showConfirmModal
        || this.showSessionExitModal
        || this.showResumeModal
        || this.showPlannerModal
        || this.showSessionAnalyticsModal
        || this.showPostLoginOnboarding
      document.body.classList.toggle('tools-panel-open', shouldLock)
      document.body.style.overflow = shouldLock ? 'hidden' : ''
    },

    focusToolsPanel() {
      this.$nextTick(() => {
        const panel = this.$refs.toolsPanel
        if (!panel) return
        panel.scrollTop = 0
        panel.focus({ preventScroll: true })
      })
    },

    restoreToolsFocus() {
      const fallback = document.querySelector('[aria-controls="memorisationToolsPanel"]')
      const target = this.toolsReturnFocusEl && typeof this.toolsReturnFocusEl.focus === 'function'
        ? this.toolsReturnFocusEl
        : fallback
      this.toolsReturnFocusEl = null
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true })
      }
    },

    getGapDurationForVerse(verseDurationInSeconds) {
      if (this.gapBetweenVerses === "1x") {
        return verseDurationInSeconds;
      }
      return this.actualGapDelay;
    },
    getCurrentPlaybackGapSeconds() {
      if (this.gapBetweenVerses === '1x') {
        const fullDuration = Math.max(0, Number(this.duration || this.audioElement?.duration || 0))
        const speedFactor = Math.max(0.25, Number(this.speed || this.audioElement?.playbackRate || 1))
        return fullDuration > 0 ? fullDuration / speedFactor : 0
      }
      return Math.max(0, Number(this.actualGapDelay || 0))
    },
    
    // Example method showing how to use repetitions in playback
    playVerseWithRepetitions(verseIndex, verseDuration) {
      let currentRepetition = 0;
      const repeatVerse = () => {
        if (currentRepetition < this.repetitionsPerStep) {
          // Play the verse
          this.playVerse(verseIndex);
          currentRepetition++;
          
          // After verse finishes, apply gap delay
          const gapDelay = this.getGapDurationForVerse(verseDuration);
          
          setTimeout(() => {
            repeatVerse();
          }, (verseDuration + gapDelay) * 1000);
        } else {
          // Move to next verse
          this.nextVerse();
        }
      };
      
      repeatVerse();
    },
    closeSaveModal() {
      this.showSaveNameModal = false
      this.saveSessionName = ''
      this.nameError = ''
    },

    clearNameError() {
      if (this.nameError) this.nameError = ''
    },

    getReciterName() {
      const reciter = this.reciters.find(r => r.id === this.reciterId)
      return reciter ? reciter.name : 'Alafasy'
    },

    buildCurrentSessionStatsSnapshot() {
      const queue = Array.isArray(this.queue) ? this.queue : []
      const currentIndex = Math.max(0, Number(this.queueIndex || 0))
      const completedEntries = queue.slice(0, currentIndex)
      const completedVerseKeys = new Set(completedEntries.map(item => item?.verse?.key || item?.key).filter(Boolean))
      const activeVerseKey = this.effectiveActiveVerseKey || this.activeVerseKey || null
      if (activeVerseKey) completedVerseKeys.add(activeVerseKey)
      const versesRead = completedVerseKeys.size
      const elapsedSeconds = this.sessionStartedAt
        ? Math.max(0, Math.round((Number(this.statsTick || Date.now()) - Number(this.sessionStartedAt)) / 1000))
        : 0
      const repetitionsCompleted = Math.max(
        Number(this.centralSession?.repetitionTimes || 0),
        currentIndex
      )
      const weakVerses = Math.max(0, Number(this.sessionErrorCount || 0))
      const versePlayCounts = { ...(this.mutqinState?.sessionState?.verse_play_counts || {}) }
      const totalVersePlays = Object.values(versePlayCounts).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0)
      return {
        verses_read: versesRead,
        time_spent_seconds: elapsedSeconds,
        repetitions_completed: repetitionsCompleted,
        sessions_completed: Number(this.sessionCompleted ? 1 : 0),
        session_flow_steps: Math.max(1, queue.length || (this.verses?.length || 0) || 1),
        average_time_per_verse_seconds: versesRead > 0 ? Math.round(elapsedSeconds / versesRead) : 0,
        weak_verses_encountered: weakVerses,
        session_play_count: Math.max(0, Number(this.mutqinState?.sessionState?.play_count || 0)),
        verse_play_counts: versePlayCounts,
        total_verse_play_count: totalVersePlays,
        generated_at: new Date().toISOString()
      }
    },

    normalizeSessionStats(stats = {}, fallbackConfig = {}) {
      const rangeStart = Number(fallbackConfig?.rangeStart || 0)
      const rangeEnd = Number(fallbackConfig?.rangeEnd || 0)
      const totalVerses = rangeEnd >= rangeStart && rangeStart > 0 ? (rangeEnd - rangeStart + 1) : 0
      const versePlayCounts = (stats?.verse_play_counts && typeof stats.verse_play_counts === 'object') ? stats.verse_play_counts : {}
      const derivedVersePlayTotal = Object.values(versePlayCounts).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0)
      const normalized = {
        verses_read: Math.max(0, Number(stats?.verses_read || 0)),
        time_spent_seconds: Math.max(0, Number(stats?.time_spent_seconds || 0)),
        repetitions_completed: Math.max(0, Number(stats?.repetitions_completed || 0)),
        sessions_completed: Math.max(0, Number(stats?.sessions_completed || 0)),
        session_flow_steps: Math.max(1, Number(stats?.session_flow_steps || totalVerses || 1)),
        average_time_per_verse_seconds: Math.max(0, Number(stats?.average_time_per_verse_seconds || 0)),
        weak_verses_encountered: Math.max(0, Number(stats?.weak_verses_encountered || 0)),
        session_play_count: Math.max(0, Number(stats?.session_play_count || 0)),
        verse_play_counts: versePlayCounts,
        total_verse_play_count: Math.max(derivedVersePlayTotal, Number(stats?.total_verse_play_count || 0)),
        generated_at: stats?.generated_at || null
      }
      if (!normalized.average_time_per_verse_seconds && normalized.verses_read > 0 && normalized.time_spent_seconds > 0) {
        normalized.average_time_per_verse_seconds = Math.round(normalized.time_spent_seconds / normalized.verses_read)
      }
      return normalized
    },

    normalizeSavedSessionRecord(session) {
      if (!session || typeof session !== 'object') return null
      const normalized = {
        ...session,
        config: { ...(session.config || {}) }
      }
      normalized.stats = this.normalizeSessionStats(session.stats || {}, normalized.config)
      return normalized
    },

    buildSessionRecord(name, options = {}) {
      const { archived = false, autoSaved = false } = options
      return {
        id: Date.now().toString(),
        name,
        archived: !!archived,
        autoSaved: !!autoSaved,
        savedAt: new Date().toISOString(),
        stats: this.buildCurrentSessionStatsSnapshot(),
        config: {
          chapterId: this.chapterId,
          chapterName: this.currentChapter?.name_simple,
          rangeStart: this.rangeStart,
          rangeEnd: this.rangeEnd,
          reciterId: this.reciterId,
          speed: this.speed,
          playMode: this.playMode,
          repetitionsPerStep: this.repetitionsPerStep,
          selectedLoopCount: this.selectedLoopCount,
          gapBetweenVerses: this.gapBetweenVerses,
          customGapSeconds: this.customGapSeconds,
          chainingEnabled: this.chainingEnabled,
          chainingMethod: this.chainingMethod,
          chainingRepetitions: this.chainingRepetitions,
          tajweedEnabled: this.tajweedEnabled,
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord,
          wordByWordAudioEnabled: this.wordByWordAudioEnabled,
          focusModeEnabled: this.focusModeEnabled,
          focusDimPercent: this.focusDimPercent,
          blurModeEnabled: this.blurModeEnabled,
          blurIntensity: this.blurIntensity,
          anchorModeEnabled: this.anchorModeEnabled,
          anchorCount: this.anchorCount,
          quranFont: this.quranFont,
          activeVerseKey: this.effectiveActiveVerseKey || this.activeVerseKey || null,
          queueIndex: Math.max(0, Number(this.queueIndex || 0)),
          currentTime: Number(this.currentTime || 0),
          playerVisible: !!this.playerVisible,
          audioSrc: this.audioElement?.currentSrc || ''
        },
        restore: {
          version: 1,
          exportedAt: new Date().toISOString(),
          continueSession: this.buildContinueSessionPayload(),
          sessionExitSnapshot: this.buildSessionExitSnapshot(),
          centralSession: deepClone(this.centralSession),
          currentMode: this.currentMode,
          theme: this.theme
        }
      }
    },

    addSavedSession(session) {
      this.savedSessions.unshift(this.normalizeSavedSessionRecord(session))
      if (this.savedSessions.length > 20) this.savedSessions = this.savedSessions.slice(0, 20)
      if (!this.selectedStatsSessionId && this.savedSessions[0]?.id) this.selectedStatsSessionId = this.savedSessions[0].id
      this.persistSavedSessions()
      return session
    },

    buildAutoSaveSessionName() {
      const chapter = this.currentChapter?.name_simple || 'Session'
      const ayah = Math.max(1, Number(this.currentPosition || 1))
      const stamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      let candidate = `${chapter} ${this.rangeStart}-${this.rangeEnd} · Ayah ${ayah} · ${stamp}`
      let suffix = 2
      while (this.savedSessions.some(session => session.name.toLowerCase() === candidate.toLowerCase())) {
        candidate = `${chapter} ${this.rangeStart}-${this.rangeEnd} · Ayah ${ayah} (${suffix})`
        suffix += 1
      }
      return candidate
    },

    saveCurrentSessionSilently(name = this.buildAutoSaveSessionName()) {
      if (!this.hasVerses) return null
      const session = this.buildSessionRecord(name, { archived: true, autoSaved: true })
      this.addSavedSession(session)
      return session
    },

    confirmSaveSession() {
      const trimmedName = this.saveSessionName.trim()

      if (!trimmedName) {
        this.nameError = 'Please enter a session name'
        return
      }

      if (trimmedName.length > 50) {
        this.nameError = 'Session name must be 50 characters or less'
        return
      }

      // Check for duplicate names
      const duplicate = this.savedSessions.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())
      if (duplicate) {
        this.nameError = 'A session with this name already exists'
        return
      }

      const session = this.addSavedSession(this.buildSessionRecord(trimmedName))

      this.showBanner(`✓ Session "${session.name}" saved`, 'success', 2000)
      this.closeSaveModal()
    },
    toggleWordAudio() {
      this.wordByWordAudioEnabled = !this.wordByWordAudioEnabled
      this.persistUiState()
      this.persistCentralSessionState()
      this.showBanner(this.wordByWordAudioEnabled ? 'Word audio enabled' : 'Word audio disabled', 'info', 1000)
    },
    applyRecommendedSetup() {
      this.playMode = 'auto'
      this.repetitionsPerStep = 5
      this.gapBetweenVerses = '1x'
      this.customGapSeconds = 2
      this.focusModeEnabled = true
      this.blurModeEnabled = false
      this.chainingEnabled = true
      this.chainingMethod = 'linking'
      this.chainingRepetitions = 1
      this.anchorModeEnabled = false
      this.sectionOpen.advanced_setup = true
      this.sectionOpen.advanced_playback = false
      this.sectionOpen.repetitions = false
      this.sectionOpen.gap_between = false
      this.persistUiState()
      this.showBanner('Recommended setup applied', 'success', 1500)
    },
    addToggleRipple(event) {
      const button = event.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add('toggle-chip-ripple');

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 400);
    },

    // Update your toggle methods to include ripple
    toggleFocusMode(event) {
      this.addToggleRipple(event);
      this.focusModeEnabled = !this.focusModeEnabled;
    },
    applyPreset(type) {
      this.focusModeEnabled = false;
      this.blurModeEnabled = false;
      this.chainingEnabled = false;
      this.anchorModeEnabled = false;

      switch (type) {
        case 'guided':
          this.focusModeEnabled = true;
          this.chainingEnabled = true;
          this.chainingMethod = 'linking';
          this.chainingRepetitions = 1;
          this.showBanner('Preset: Guided Start', 'success', 2000);
          break;
        case 'chain':
          this.chainingEnabled = true;
          this.anchorModeEnabled = true;
          this.focusModeEnabled = true;
          this.showBanner('Preset: Chaining + Anchor Mode (with Focus)', 'success', 2000);
          break;
        case 'blur':
          this.blurModeEnabled = true;
          this.chainingEnabled = false;
          this.showBanner('Preset: Pure Recall with Blur Mode', 'success', 2000);
          break;
        case 'focus':
          this.focusModeEnabled = true;
          this.anchorModeEnabled = true;
          this.showBanner('Preset: Focus Mode + Anchor Hooks', 'success', 2000);
          break;
      }

      this.enforceMemorisationRules();
      this.persistUiState();
      this.persistCentralSessionState();
    },
    enforceMemorisationRules() {
      if (this.focusModeEnabled && this.blurModeEnabled) {
        this.blurModeEnabled = false;
      }
      if (this.blurModeEnabled && this.chainingEnabled) {
        this.chainingEnabled = false;
        this.showBanner('Blur Mode works best without chaining, so chaining was turned off.', 'info', 2500);
      }
      if (this.fadingVerseEnabled && this.showWordByWord) {
        this.showWordByWord = false;
        this.showBanner('Fading Mode: Word-by-Word disabled', 'info', 2000);
      }
    },
    removeBasmala(arabicText) {
      if (!arabicText) return ''
      const basmala = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
      // Also handle common variations
      const basmalaVariants = [
        'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
      ]

      for (const variant of basmalaVariants) {
        if (arabicText.startsWith(variant)) {
          return arabicText.slice(variant.length).trim()
        }
      }
      return arabicText
    },
    toggleAnchorMode() {
      this.anchorModeEnabled = !this.anchorModeEnabled

      if (this.anchorModeEnabled) {
        this.applyAnchorHighlights()
        this.showBanner('Anchor Mode: Key words will be highlighted as memory hooks', 'info', 3000)
        // Watch for verse changes
        this.setupAnchorObserver()
      } else {
        this.clearAnchorHighlights()
        if (this.anchorHighlightObserver) {
          this.anchorHighlightObserver.disconnect()
          this.anchorHighlightObserver = null
        }
        this.showBanner('Anchor Mode disabled', 'info', 1500)
      }

      this.persistUiState()
      this.persistCentralSessionState()
    },

    // Handle anchor count change dynamically
    onAnchorCountChange() {
      if (this.anchorModeEnabled) {
        this.applyAnchorHighlights()
        const anchorText = { 1: '1 anchor (center)', 2: '2 anchors (start+end)', 3: '3 anchors (strategic)' }
        this.showBanner(`Anchor Mode: Using ${anchorText[this.anchorCount]}`, 'info', 2000)
      }
      this.persistUiState()
      this.persistCentralSessionState()
    },

    // Main function to apply anchor highlights to all verses
    applyAnchorHighlights() {
      if (!this.anchorModeEnabled) return

      this.$nextTick(() => {
        const verseCards = document.querySelectorAll('.verse-card')
        verseCards.forEach(card => {
          this.highlightAnchorsForCard(card)
        })
        const mushafAyahs = document.querySelectorAll('.mushaf-ayah')
        mushafAyahs.forEach(ayah => {
          this.highlightAnchorsForCard(ayah)
        })
      })

      
    },

    

    highlightAnchorsForCard(card) {
      if (!this.anchorModeEnabled) return

      // Get all word elements (supports both word-by-word modes)
      const arabicDiv = card.querySelector('.verse-arabic, .mushaf-ayah-text')
      if (!arabicDiv) return

      // Get words - handles both tajweed and non-tajweed modes
      let words = arabicDiv.querySelectorAll('.wbw-word, word')

      // If no word elements, try to get from word-by-word section
      if (!words.length) {
        const wordItems = card.querySelectorAll('.word-item')
        if (wordItems.length) {
          words = wordItems
        }
      }

      if (!words.length) return

      // Calculate which indices to highlight
      const totalWords = words.length
      const anchorIndices = this.getAnchorIndices(totalWords)

      // Remove existing highlights
      words.forEach(word => {
        word.classList.remove('anchor-highlight')
        word.classList.remove('anchor-pulse')
      })

      // Apply new highlights with animation
      anchorIndices.forEach((index, i) => {
        if (words[index]) {
          words[index].classList.add('anchor-highlight')
          // Add sequential animation delay
          setTimeout(() => {
            if (words[index]) words[index].classList.add('anchor-pulse')
          }, i * 100)
        }
      })
    },

    getAnchorIndices(totalWords) {
      if (totalWords === 0) return []
      if (totalWords === 1) return [0]
      if (totalWords === 2) return [0, 1]

      if (this.anchorCount === 1) {
        // Center word
        return [Math.floor(totalWords / 2)]
      }
      else if (this.anchorCount === 2) {
        // First and last
        return [0, totalWords - 1]
      }
      else {
        // 3 anchors: strategic positions (20%, 50%, 80%)
        const positions = [
          Math.floor(totalWords * 0.2),    // ~20% in
          Math.floor(totalWords * 0.5),    // Middle
          Math.floor(totalWords * 0.8)     // ~80% in
        ]
        // Remove duplicates and sort
        return [...new Set(positions)].sort((a, b) => a - b)
      }
    },

    // Clear all anchor highlights
    clearAnchorHighlights() {
      const allWords = document.querySelectorAll('.wbw-word, word, .word-item, .mushaf-ayah-text .wbw-word')
      allWords.forEach(word => {
        word.classList.remove('anchor-highlight')
        word.classList.remove('anchor-pulse')
      })
    },

    // Watch for DOM changes (verse navigation, new verses loading)
    setupAnchorObserver() {
      if (this.anchorHighlightObserver) {
        this.anchorHighlightObserver.disconnect()
      }

      this.anchorHighlightObserver = new MutationObserver((mutations) => {
        let shouldReapply = false
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            shouldReapply = true
          }
          if (mutation.type === 'attributes' &&
            mutation.attributeName === 'class' &&
            (mutation.target.classList?.contains('verse-card') || mutation.target.classList?.contains('mushaf-ayah'))) {
            shouldReapply = true
          }
        })

        if (shouldReapply) {
          setTimeout(() => this.applyAnchorHighlights(), 100)
        }
      })

      // Watch the workspace for changes
      const workspace = document.querySelector('.workspace')
      if (workspace) {
        this.anchorHighlightObserver.observe(workspace, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        })
      }
    },

    // Watch for active verse changes to highlight anchors in new content
    watchActiveVerse() {
      if (!this.anchorModeEnabled) return

      // Re-apply highlights when active verse changes
      this.$watch('effectiveActiveVerseKey', () => {
        this.applyAnchorHighlights()
      })

      // Also watch for verse data loading
      this.$watch('isDataReady', (newVal) => {
        if (newVal && this.anchorModeEnabled) {
          setTimeout(() => this.applyAnchorHighlights(), 200)
        }
      })
    },

    // Update the getDisplayArabic method to preserve anchor classes
    // Add this to your existing getDisplayArabic method or override
    preserveAnchorClasses() {
      // This ensures highlights persist when verses re-render
      if (this.anchorModeEnabled) {
        setTimeout(() => this.applyAnchorHighlights(), 50)
      }
    },
    showCountdown(callback) {
      this.showCountdownOverlay = true
      this.countdownValue = 3

      if (this.countdownInterval) {
        clearInterval(this.countdownInterval)
      }

      this.countdownInterval = setInterval(() => {
        this.countdownValue--

        if (this.countdownValue < 0) {
          clearInterval(this.countdownInterval)
          this.countdownInterval = null
          this.showCountdownOverlay = false
          if (callback) callback()
        }
      }, 1000)
    },

    startSessionWithCountdown() {
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner('Choose a valid surah and ayah range before starting.', 'info', 3600)
        return
      }

      const self = this
      this.showCountdown(function () {
        self.startSession()
      })
    },
    async startSessionAndClose() {
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner('Please select a valid surah and ayah range first', 'info', 3600)
        return
      }
      this.applySessionConfig(this.buildSessionConfig(this.currentMode))
      this.persistUiState()
      this.persistCentralSessionState()
      await this.applyWorkspaceControls({ mode: this.currentMode })
      this.closeToolsPanel()
      setTimeout(() => {
        this.startSessionWithCountdown()
      }, 100)
    },
    handlePrimaryAction() {
      if (this.isPlaying) {
        if (this.audioElement) this.audioElement.pause()
        this.isPlaying = false
        return
      }
      this.startSessionWithCountdown()
    },
    saveCurrentSessionWithName() {
      const defaultName = `${this.currentChapter?.name_simple || 'Session'} ${this.rangeStart}-${this.rangeEnd}`
      this.saveSessionName = defaultName
      this.showSaveNameModal = true
      this.closeToolsPanel()
    },
    toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log(`Full-screen error: ${err.message}`)
        })
      } else {
        document.exitFullscreen()
      }
    },

    getDisplayArabic(verse) {
      if (!verse || !verse.arabic) return ''

      // Word-aware rendering supports both plain and tajweed-marked Arabic.
      if (this.wordByWordAudioEnabled || this.tajweedEnabled) {
        return this.splitArabicIntoWords(verse)
      }

      // Fallback to plain Arabic
      return this.stripTajweedMarkup(verse.arabic || '')
    },

    // Fix banner positioning - update CSS
    toggleKeyboardShortcuts() {
      this.showKeyboardShortcuts = !this.showKeyboardShortcuts
    },
    closeKeyboardShortcuts() {
      this.showKeyboardShortcuts = false
    },

    saveCurrentSession() {
      if (!this.hasVerses) {
        this.showBanner('No active session to save', 'warning', 2000)
        return
      }

      this.addSavedSession(this.buildSessionRecord(`${this.currentChapter?.name_simple || 'Session'} ${this.rangeStart}-${this.rangeEnd}`))
      this.showBanner('Session saved', 'success', 1500)
    },

    setRepetitionsFromSlider(value) {
      this.repetitionsPerStep = Math.max(1, Math.min(10, Number(value || 1)))
    },

    isLoadingSession(sessionId) {
      return this.loadingSessionId === sessionId
    },

    isSessionExportSuccessful(sessionId, format) {
      return this.exportSessionState.successSessionId === sessionId && this.exportSessionState.successFormat === format
    },

    getSessionExportIcon(sessionId, format, fallbackIcon) {
      if (this.isExportingSession(sessionId, format)) return 'bi-arrow-repeat spin'
      if (this.isSessionExportSuccessful(sessionId, format)) return 'bi-check2-circle'
      return fallbackIcon
    },

    getSessionExportLabel(sessionId, format, fallbackLabel) {
      if (this.isExportingSession(sessionId, format)) return 'Preparing…'
      return fallbackLabel
    },

    buildSessionResumeSummary(session) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      const verse = session?.config?.activeVerseKey ? String(session.config.activeVerseKey).split(':')[1] : (session?.config?.rangeStart || 1)
      const reads = Math.max(0, Number(stats.verses_read || 0))
      return `Resume from ayah ${verse} · ${reads} ayah${reads === 1 ? '' : 's'} covered`
    },

    getSavedSessionState(session) {
      if (this.isLoadingSession(session?.id)) return { label: 'Opening', tone: 'loading' }
      if (this.sessionMatchesCurrentLiveConfig(session)) {
        return this.isPlaying
          ? { label: 'Playing', tone: 'active' }
          : { label: 'Paused', tone: 'paused' }
      }
      if (session?.archived) return { label: 'Auto-saved', tone: 'muted' }
      return { label: 'Ready to resume', tone: 'idle' }
    },

    async hydrateSessionFromPayload(payload, options = {}) {
      if (!payload?.config?.chapterId) return false
      const mode = payload.mode || this.currentMode || 'beginner'
      const target = mode === 'beginner' ? 'beginner' : 'advanced'

      this.currentMode = mode
      this.tab = 'tools'
      this.applySessionConfig({ ...(payload.config || {}), mode })
      this[target] = {
        ...(target === 'beginner' ? createBeginnerState() : createAdvancedState()),
        ...this.cloneModeState(payload.config || {})
      }

      await this.loadChapter(mode)
      this.buildQueue(mode)

      const store = this.getModeStore(mode)
      const targetKey = payload.activeVerseKey || payload.activeKey || payload.config?.activeVerseKey || null
      let restoredQueueIndex = Math.max(0, Number(payload.queueIndex ?? payload.config?.queueIndex ?? 0))

      if (targetKey) {
        const exactIndex = store.queue?.findIndex(item => (item?.verse?.key || item?.key) === targetKey)
        if (exactIndex >= 0) restoredQueueIndex = exactIndex
      }

      store.queueIndex = Math.min(restoredQueueIndex, Math.max((store.queue?.length || 1) - 1, 0))
      this.queueIndex = store.queueIndex
      this.syncMutqinAyahs(store.verses || this.verses)
      this.syncMutqinSession(store.queue || [], mode)
      moveMutqinSession(this.mutqinState, this.queueIndex + 1)

      const restoredKey = store.queue?.[this.queueIndex]?.verse?.key || store.queue?.[this.queueIndex]?.key || targetKey
      if (restoredKey) {
        this.setActiveVerse(restoredKey, { mode, queueIndex: this.queueIndex, scroll: false })
      }

      this.sessionCompleted = false
      this.sessionCompletedAt = null
      this.sessionStartedAt = Date.now()
      this.playerVisible = payload.playerVisible ?? payload.config?.playerVisible ?? true
      const shouldResumePlayback = options.forcePlayback ?? payload.isPlaying ?? true
      this.restoredAudioState = {
        src: payload.audioSrc || payload.config?.audioSrc || '',
        currentTime: Number(payload.currentTime ?? payload.config?.currentTime ?? 0),
        playerVisible: !!(payload.playerVisible ?? payload.config?.playerVisible ?? true),
        speed: Number(payload.config?.speed || this.speed || 1),
        isPlaying: !!shouldResumePlayback
      }
      this.$nextTick(() => {
        if (this.restoredAudioState?.src) {
          this.applyRestoredAudioState()
          return
        }
        if (shouldResumePlayback) {
          const entry = store.queue?.[this.queueIndex]
          if (entry) this.playQueueEntry(entry, { force: true, queueIndex: this.queueIndex })
        }
      })
      this.persistAllState()
      if (options.banner !== false) this.showBanner(options.bannerText || 'Session restored', 'success', 2200)
      return true
    },

    async loadSavedSession(sessionId) {
      const session = this.savedSessions.find(s => s.id === sessionId)
      if (!session) return
      this.loadingSessionId = sessionId
      try {
        const restorePayload = session.restore?.continueSession
          ? { ...session.restore.continueSession, config: { ...(session.config || {}), ...(session.restore.continueSession.config || {}) } }
          : {
            mode: session.restore?.currentMode || this.currentMode,
            config: session.config || {},
            activeVerseKey: session.config?.activeVerseKey || null,
            queueIndex: Number(session.config?.queueIndex || 0),
            currentTime: Number(session.config?.currentTime || 0),
            audioSrc: session.config?.audioSrc || '',
            playerVisible: !!session.config?.playerVisible,
            isPlaying: false
          }
        await this.hydrateSessionFromPayload(restorePayload, { bannerText: `Loaded: ${session.name}`, forcePlayback: true })
        this.showTools = false
      } finally {
        this.loadingSessionId = ''
      }
    },

    // Update deleteSavedSession method
    deleteSavedSession(sessionId) {
      const session = this.savedSessions.find(s => s.id === sessionId)
      const label = session ? (session.name || this.getSessionPrimaryLabel(session)) : 'this session'
      this.openConfirmModal({
        title: 'Delete saved session?',
        message: `This will permanently remove "${label}" and its export snapshot from this device.`,
        confirmLabel: 'Delete session',
        cancelLabel: 'Keep session',
        tone: 'danger',
        action: 'delete-saved-session',
        data: { sessionId }
      })
    },

    performDeleteSavedSession(sessionId) {
      this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId)
      if (this.selectedStatsSessionId === sessionId) {
        this.selectedStatsSessionId = this.savedSessions[0]?.id || ''
      }
      this.persistSavedSessions()
      this.showBanner('Session deleted', 'info', 1500)
    },

    savedSessionsStorageKey() {
      return this.userStorageKey('savedSessions')
    },

    buildSeededSession(name, config = {}, position = 0) {
      const baseId = `${this.auth?.id || 'guest'}-${position + 1}`
      return {
        id: `seeded-${baseId}`,
        name,
        archived: false,
        autoSaved: false,
        savedAt: new Date(Date.UTC(2026, 4, 20 - Math.min(position, 10), 8 + (position % 8), 15, 0)).toISOString(),
        config: {
          chapterId: 1,
          chapterName: 'Al-Fatihah',
          rangeStart: 1,
          rangeEnd: 7,
          reciterId: DEFAULT_ALQURAN_RECITER,
          speed: 1,
          playMode: 'auto',
          chainingEnabled: true,
          chainingMethod: 'linking',
          chainingRepetitions: 1,
          tajweedEnabled: false,
          showTranslation: true,
          showTransliteration: false,
          showWordByWord: false,
          wordByWordAudioEnabled: false,
          focusModeEnabled: false,
          blurModeEnabled: false,
          blurIntensity: 10,
          anchorModeEnabled: false,
          anchorCount: 2,
          quranFont: 'uthmani',
          activeVerseKey: null,
          queueIndex: 0,
          currentTime: 0,
          playerVisible: false,
          audioSrc: '',
          ...config
        }
      }
    },

    getSeededSessionsForCurrentUser() {
      const email = String(this.auth?.email || '').toLowerCase()
      const match = email.match(/^practice(\d{2})@example\.com$/)
      if (!match) return []

      const presetGroups = [
        [
          this.buildSeededSession('Focused Start', {
            chapterId: 112,
            chapterName: 'Al-Ikhlas',
            rangeStart: 1,
            rangeEnd: 4,
            focusModeEnabled: true,
            showTranslation: true,
            showWordByWord: true
          }, 0),
          this.buildSeededSession('Linking Review', {
            chapterId: 87,
            chapterName: 'Al-Ala',
            rangeStart: 1,
            rangeEnd: 7,
            chainingEnabled: true,
            chainingMethod: 'linking',
            chainingRepetitions: 2,
            tajweedEnabled: true
          }, 1)
        ],
        [
          this.buildSeededSession('Pure Recall Drill', {
            chapterId: 75,
            chapterName: 'Al-Qiyamah',
            rangeStart: 1,
            rangeEnd: 10,
            blurModeEnabled: true,
            blurIntensity: 14,
            chainingEnabled: false,
            showTranslation: false
          }, 0),
          this.buildSeededSession('Anchor Pass', {
            chapterId: 78,
            chapterName: 'An-Naba',
            rangeStart: 31,
            rangeEnd: 40,
            anchorModeEnabled: true,
            anchorCount: 2,
            showWordByWord: true
          }, 1)
        ],
        [
          this.buildSeededSession('Cumulative Build', {
            chapterId: 73,
            chapterName: 'Al-Muzzammil',
            rangeStart: 1,
            rangeEnd: 8,
            chainingEnabled: true,
            chainingMethod: 'cumulative',
            chainingRepetitions: 3,
            speed: 0.75
          }, 0),
          this.buildSeededSession('Translation Support', {
            chapterId: 55,
            chapterName: 'Ar-Rahman',
            rangeStart: 1,
            rangeEnd: 6,
            showTranslation: true,
            showTransliteration: true,
            tajweedEnabled: true
          }, 1)
        ]
      ]

      const index = Math.max(0, Number.parseInt(match[1], 10) - 1)
      return (presetGroups[index % presetGroups.length] || []).map((session, sessionIndex) => ({
        ...session,
        id: `seeded-${match[1]}-${sessionIndex + 1}`
      }))
    },

    ensureSeededSavedSessions() {
      if (!this.auth?.check) return
      const seededFlagKey = this.userStorageKey('savedSessionsSeeded')
      const storageKey = this.savedSessionsStorageKey()

      try {
        if (localStorage.getItem(seededFlagKey) === '1') return

        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
        if (Array.isArray(existing) && existing.length > 0) {
          localStorage.setItem(seededFlagKey, '1')
          return
        }

        const seededSessions = this.getSeededSessionsForCurrentUser()
        if (!seededSessions.length) return

        localStorage.setItem(storageKey, JSON.stringify(seededSessions))
        localStorage.setItem(seededFlagKey, '1')
      } catch (error) {
        console.error('Failed to seed demo saved sessions:', error)
      }
    },

    persistSavedSessions() {
      try {
        localStorage.setItem(this.savedSessionsStorageKey(), JSON.stringify(this.savedSessions))
      } catch (e) {
        console.error('Failed to save sessions:', e)
      }
    },

    loadSavedSessions() {
      try {
        this.ensureSeededSavedSessions()
        const saved = localStorage.getItem(this.savedSessionsStorageKey())
        if (saved) {
          this.savedSessions = JSON.parse(saved).map(session => this.normalizeSavedSessionRecord(session)).filter(Boolean)
          if (!this.savedSessions.some(session => session.id === this.selectedStatsSessionId)) {
            this.selectedStatsSessionId = this.savedSessions[0]?.id || ''
          }
        }
      } catch (e) {
        console.error('Failed to load saved sessions:', e)
        this.savedSessions = []
        this.selectedStatsSessionId = ''
      }
    },

    selectStatsSession(sessionId) {
      this.selectedStatsSessionId = sessionId
    },
    getOnboardingStorageKey() {
      const userId = this.auth?.id ? String(this.auth.id) : 'guest'
      return `mutqin.onboardingCompleted.${userId}`
    },
    hasCompletedOnboarding() {
      try {
        return localStorage.getItem(this.getOnboardingStorageKey()) === 'true'
      } catch {
        return false
      }
    },
    markOnboardingCompleted() {
      try {
        localStorage.setItem(this.getOnboardingStorageKey(), 'true')
      } catch { }
    },
    openOnboardingModal(force = false) {
      if (!this.isLoggedIn && !force) return
      this.onboardingStepIndex = 0
      if (!force && this.hasCompletedOnboarding()) return
      if (!this.onboardingDemoActive) this.prepareOnboardingDemo()
      this.showTools = true
      this.tab = 'tools'
      window.setTimeout(() => {
        this.showPostLoginOnboarding = true
        this.applyOnboardingStep(0)
      }, 50)
    },
    nextOnboardingStep() {
      this.onboardingStepIndex = Math.min(this.onboardingSteps.length - 1, this.onboardingStepIndex + 1)
      this.applyOnboardingStep(this.onboardingStepIndex)
    },
    skipOnboarding() {
      this.markOnboardingCompleted()
      this.showPostLoginOnboarding = false
      this.onboardingStepIndex = 0
      this.restoreOnboardingDemo()
    },
    completeOnboardingAndStart() {
      this.markOnboardingCompleted()
      this.showPostLoginOnboarding = false
      this.onboardingStepIndex = 0
      this.applyOnboardingStep(this.onboardingSteps.length - 1)
      this.restoreOnboardingDemo()
    },
    prepareOnboardingDemo() {
      const snapshot = {
        tab: this.tab,
        showTools: this.showTools,
        currentMode: this.currentMode,
        chapterId: this.chapterId,
        rangeStart: this.rangeStart,
        rangeEnd: this.rangeEnd,
        reciterId: this.reciterId,
        speed: this.speed,
        playMode: this.playMode,
        repetitionsPerStep: this.repetitionsPerStep,
        selectedLoopCount: this.selectedLoopCount,
        gapBetweenVerses: this.gapBetweenVerses,
        customGapSeconds: this.customGapSeconds,
        chainingEnabled: this.chainingEnabled,
        chainingMethod: this.chainingMethod,
        chainingRepetitions: this.chainingRepetitions,
        focusModeEnabled: this.focusModeEnabled,
        focusDimPercent: this.focusDimPercent,
        blurModeEnabled: this.blurModeEnabled,
        blurIntensity: this.blurIntensity,
        anchorModeEnabled: this.anchorModeEnabled,
        anchorCount: this.anchorCount,
        sectionOpen: deepClone(this.sectionOpen || {})
      }
      this.onboardingDemoSnapshot = snapshot
      this.onboardingDemoActive = true
      const demoChapter = this.chapters.find(chapter => Number(chapter.id) === 112) || this.chapters[0] || null
      if (demoChapter) {
        this.chapterId = Number(demoChapter.id)
        this.currentChapter = demoChapter
      }
      this.rangeStart = 1
      this.rangeEnd = 4
      this.reciterId = this.reciters[0]?.id || this.reciterId
      this.speed = 1
      this.playMode = 'auto'
      this.repetitionsPerStep = 5
      this.chainingEnabled = true
      this.chainingMethod = 'linking'
      this.chainingRepetitions = 1
      this.focusModeEnabled = false
      this.focusDimPercent = 54
      this.blurModeEnabled = false
      this.blurIntensity = 10
      this.anchorModeEnabled = false
      this.anchorCount = 2
      this.tab = 'tools'
      this.showTools = true
    },
    restoreOnboardingDemo(options = {}) {
      const snapshot = this.onboardingDemoSnapshot
      if (!snapshot) return
      this.onboardingDemoActive = false
      this.onboardingDemoSnapshot = null
      if (options.keepCurrentSession) return
      this.tab = snapshot.tab
      this.showTools = snapshot.showTools
      this.currentMode = snapshot.currentMode
      this.chapterId = snapshot.chapterId
      this.rangeStart = snapshot.rangeStart
      this.rangeEnd = snapshot.rangeEnd
      this.reciterId = snapshot.reciterId
      this.speed = snapshot.speed
      this.playMode = snapshot.playMode
      this.repetitionsPerStep = snapshot.repetitionsPerStep || this.repetitionsPerStep
      this.selectedLoopCount = snapshot.selectedLoopCount ?? this.selectedLoopCount
      this.gapBetweenVerses = snapshot.gapBetweenVerses || this.gapBetweenVerses
      this.customGapSeconds = snapshot.customGapSeconds || this.customGapSeconds
      this.chainingEnabled = snapshot.chainingEnabled
      this.chainingMethod = snapshot.chainingMethod
      this.chainingRepetitions = snapshot.chainingRepetitions
      this.focusModeEnabled = snapshot.focusModeEnabled
      this.focusDimPercent = snapshot.focusDimPercent || this.focusDimPercent
      this.blurModeEnabled = snapshot.blurModeEnabled
      this.blurIntensity = snapshot.blurIntensity || this.blurIntensity
      this.anchorModeEnabled = snapshot.anchorModeEnabled
      this.anchorCount = snapshot.anchorCount
      this.sectionOpen = deepClone(snapshot.sectionOpen || this.sectionOpen)
      this.persistUiState()
    },
    applyOnboardingStep(stepIndex) {
      if (!this.onboardingDemoActive) return
      const step = Math.max(0, Math.min(this.onboardingSteps.length - 1, Number(stepIndex || 0)))
      const stepConfig = [
        { tab: 'tools', section: 'advanced_setup' },
        { tab: 'tools', section: 'advanced_setup' },
        { tab: 'tools', section: 'advanced_playback' },
        { tab: 'techniques', section: 'blur_mode' },
        { tab: 'tools', section: null }
      ][step] || { tab: 'tools', section: 'advanced_setup' }
      this.tab = stepConfig.tab
      this.showTools = true
      if (stepConfig.section) {
        const openMap = {
          advanced_setup: true,
          advanced_playback: false,
          focus_mode: false,
          blur_mode: false,
          chaining: false,
          anchor_mode: false
        }
        Object.keys(openMap).forEach(key => {
          if (this.sectionOpen[key] !== undefined) this.sectionOpen[key] = false
        })
        if (this.sectionOpen[stepConfig.section] !== undefined) this.sectionOpen[stepConfig.section] = true
      }
      this.$nextTick(() => {
        const section = this.$refs.toolsBody?.querySelector?.(`.sheet-section .sheet-toggle`) || null
        if (section?.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    openSessionAnalyticsModal(session) {
      if (!session?.id) return
      this.analyticsModalRecordId = session.id
      this.analyticsModalLoaded = false
      this.analyticsModalData = null
      this.analyticsReportState = { loading: false, success: false, error: '' }
      this.showSessionAnalyticsModal = true

      window.requestAnimationFrame(() => {
        this.refreshAnalyticsModalData(session)
      })
    },
    closeSessionAnalyticsModal() {
      this.showSessionAnalyticsModal = false
      this.analyticsModalLoaded = false
      this.analyticsModalRecordId = ''
      this.analyticsModalData = null
      this.analyticsReportState = { loading: false, success: false, error: '' }
    },
    refreshAnalyticsModalData(session = null) {
      const sourceSession = session || this.analyticsModalRecord
      if (!sourceSession?.id) return
      this.analyticsModalData = this.buildSessionAnalyticsDataset(sourceSession)
      this.analyticsModalLoaded = true
    },
    sessionMatchesCurrentLiveConfig(session) {
      if (!session?.config || !this.isSessionLive) return false
      return Number(session.config.chapterId || 0) === Number(this.chapterId || 0)
        && Number(session.config.rangeStart || 0) === Number(this.rangeStart || 0)
        && Number(session.config.rangeEnd || 0) === Number(this.rangeEnd || 0)
    },
    getAnalyticsSessionStats(session) {
      if (this.sessionMatchesCurrentLiveConfig(session)) {
        return this.normalizeSessionStats(this.buildCurrentSessionStatsSnapshot(), session?.config || {})
      }
      return this.normalizeSessionStats(session?.stats || {}, session?.config || {})
    },
    buildSessionAnalyticsDataset(session) {
      const stats = this.getAnalyticsSessionStats(session)
      const rangeStart = Math.max(1, Number(session?.config?.rangeStart || 1))
      const rangeEnd = Math.max(rangeStart, Number(session?.config?.rangeEnd || rangeStart))
      const totalAyahs = Math.max(1, rangeEnd - rangeStart + 1)
      const versePlayCounts = { ...(stats.verse_play_counts || {}) }
      const versesRead = Math.max(0, Number(stats.verses_read || 0))
      const repetitions = Math.max(0, Number(stats.repetitions_completed || 0))
      const weakVerses = Math.max(0, Number(stats.weak_verses_encountered || 0))
      const selfChecks = Math.max(0, Math.round(repetitions * 0.35))
      const strongVerses = Math.max(0, versesRead - weakVerses)
      const recallRatio = versesRead > 0 ? ((strongVerses / versesRead) * 100) : 0
      const recallStrength = recallRatio >= 75 ? 'High' : recallRatio >= 45 ? 'Medium' : 'Low'
      const verseSeries = Array.from({ length: totalAyahs }).map((_, index) => {
        const ayahNumber = rangeStart + index
        const verseKey = `${Number(session?.config?.chapterId || this.chapterId || 0)}:${ayahNumber}`
        const inferredValue = ayahNumber < (rangeStart + versesRead) ? 1 : 0
        const value = Math.max(0, Number(versePlayCounts[verseKey] || inferredValue))
        return {
          key: verseKey,
          ayahNumber,
          label: `Ayah ${ayahNumber}`,
          shortLabel: `${ayahNumber}`,
          value
        }
      })
      const maxHeatValue = Math.max(1, ...verseSeries.map(item => Number(item.value || 0)))

      return {
        generatedAt: new Date().toISOString(),
        session: {
          id: session.id,
          name: session.name,
          label: this.getSessionPrimaryLabel(session),
          savedAt: session.savedAt,
          config: { ...(session.config || {}) }
        },
        metrics: {
          verses_read: versesRead,
          total_ayahs: totalAyahs,
          time_spent_seconds: Math.max(0, Number(stats.time_spent_seconds || 0)),
          repetitions_completed: repetitions,
          self_checks: selfChecks,
          weak_verses: weakVerses,
          strong_verses: strongVerses,
          recall_strength: recallStrength,
          session_play_count: Math.max(0, Number(stats.session_play_count || 0)),
          total_verse_play_count: Math.max(0, Number(stats.total_verse_play_count || 0)),
          verse_play_counts: { ...(stats.verse_play_counts || {}) },
          playback_total_seconds: Math.max(0, Number(stats.time_spent_seconds || 0)),
          playback_average_seconds_per_verse: Math.max(0, Number(stats.average_time_per_verse_seconds || 0))
        },
        charts: {
          verseSeries,
          timeSeries: verseSeries,
          topRepeated: verseSeries.filter(item => item.value > 0),
          weakStrong: { weak: weakVerses, strong: strongVerses },
          activityBreakdown: []
        },
        heatmap: verseSeries.map(item => ({
          ...item,
          intensity: item.value <= 0 ? 0.06 : Math.max(0.18, Math.min(1, Math.pow(Number(item.value || 0) / maxHeatValue, 0.72)))
        }))
      }
    },
    validateAnalyticsReportPayload(payload) {
      const metrics = payload?.metrics || {}
      if (!payload?.session?.id) return { ok: false, message: 'Missing session id.' }
      if (!payload?.session?.savedAt) return { ok: false, message: 'Missing session date.' }
      if (!Number.isFinite(Number(metrics.verses_read))) return { ok: false, message: 'Missing verses read.' }
      return { ok: true, message: '' }
    },
    async downloadSessionAnalyticsReport() {
      if (!this.analyticsModalRecord || !this.analyticsModalData) return
      this.analyticsReportState = { loading: true, success: false, error: '' }
      try {
        await new Promise(resolve => window.setTimeout(resolve, 120))
        const reportPayload = {
          version: 1,
          app: 'mutqin',
          exportedAt: new Date().toISOString(),
          summary: {
            title: this.analyticsModalData.session.label,
            saved_on: this.analyticsModalData.session.savedAt,
            duration: this.formatTime(this.analyticsModalData.metrics.time_spent_seconds),
            ayahs_reviewed: this.analyticsModalData.metrics.verses_read,
            repeats_completed: this.analyticsModalData.metrics.repetitions_completed,
            session_plays: this.analyticsModalData.metrics.session_play_count || 0,
            verse_plays: this.analyticsModalData.metrics.total_verse_play_count || 0,
            recall_strength: this.analyticsModalData.metrics.recall_strength
          },
          session: {
            id: this.analyticsModalData.session.id,
            name: this.analyticsModalData.session.name,
            label: this.analyticsModalData.session.label,
            savedAt: this.analyticsModalData.session.savedAt
          },
          metadata: {
            date: this.analyticsModalData.session.savedAt,
            duration: this.formatTime(this.analyticsModalData.metrics.time_spent_seconds),
            session_name: this.analyticsModalData.session.name,
            surah: this.analyticsModalData.session.config?.chapterName || '',
            ayah_range: `${this.analyticsModalData.session.config?.rangeStart || ''}-${this.analyticsModalData.session.config?.rangeEnd || ''}`
          },
          metrics: {
            verses_read: this.analyticsModalData.metrics.verses_read,
            total_ayahs: this.analyticsModalData.metrics.total_ayahs || 0,
            time_spent_seconds: this.analyticsModalData.metrics.time_spent_seconds,
            repetitions_completed: this.analyticsModalData.metrics.repetitions_completed,
            session_play_count: this.analyticsModalData.metrics.session_play_count || 0,
            total_verse_play_count: this.analyticsModalData.metrics.total_verse_play_count || 0,
            weak_verses: this.analyticsModalData.metrics.weak_verses,
            recall_strength: this.analyticsModalData.metrics.recall_strength
          },
          verse_play_counts: this.analyticsModalData.metrics.verse_play_counts || {},
          charts: {
            verse_series: this.analyticsModalData.charts?.verseSeries || []
          },
          heatmap: this.analyticsModalData.heatmap || []
        }
        const validation = this.validateAnalyticsReportPayload(reportPayload)
        if (!validation.ok) throw new Error(validation.message)

        const safeName = slugifySessionFilePart(this.analyticsModalData.session?.name || this.analyticsModalData.session?.label || 'session')
        const stamp = new Date(this.analyticsModalData.session?.savedAt || Date.now()).toISOString().slice(0, 10)
        const filename = `mutqin-session_${safeName}_${stamp}.json`
        const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        window.setTimeout(() => URL.revokeObjectURL(url), 500)
        this.analyticsReportState = { loading: false, success: true, error: '' }
      } catch (error) {
        console.error('Analytics report export failed:', error)
        this.analyticsReportState = { loading: false, success: false, error: String(error?.message || 'Export failed') }
      }
    },

    buildStatsBreakdown(session) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      return [
        { key: 'verses_read', label: 'Ayahs you reviewed', value: `${stats.verses_read}`, icon: 'bi-book' },
        { key: 'time_spent', label: 'Time memorising', value: this.formatTime(stats.time_spent_seconds), icon: 'bi-clock-history' },
        { key: 'repetitions_completed', label: 'Repeats completed', value: `${stats.repetitions_completed}`, icon: 'bi-arrow-repeat' },
        { key: 'sessions_completed', label: 'Runs completed', value: `${stats.sessions_completed}`, icon: 'bi-check2-circle' }
      ]
    },

    buildStatsSummary(session) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      const verses = Number(stats.verses_read || 0)
      const time = Number(stats.time_spent_seconds || 0)
      const reps = Number(stats.repetitions_completed || 0)
      const struggled = Number(stats.weak_verses_encountered || 0)
      const parts = []

      if (verses > 0) parts.push(`You reviewed ${verses} ayah${verses === 1 ? '' : 's'}`)
      if (time > 0) parts.push(`in ${this.formatTime(time)}`)
      if (reps > 0) parts.push(`with ${reps} repeat${reps === 1 ? '' : 's'}`)
      if (!parts.length) return 'Practice and save your session to build your progress summary.'

      const base = parts.join(' ')
      if (struggled > 0) return `${base}. ${struggled} ayah${struggled === 1 ? '' : 's'} needed extra attention.`
      return `${base}.`
    },

    getSessionStatDisplay(session, key) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      if (key === 'verses_read') return `${stats.verses_read} verses read`
      if (key === 'time_spent') return `${this.formatTime(stats.time_spent_seconds)} spent`
      return ''
    },
    isExportingSession(sessionId, format = '') {
      if (this.exportSessionState.activeSessionId !== sessionId) return false
      if (!format) return true
      return this.exportSessionState.activeFormat === format
    },
    incrementSessionPlayCount() {
      const current = Math.max(0, Number(this.mutqinState?.sessionState?.play_count || 0))
      if (!this.mutqinState?.sessionState) return
      this.mutqinState.sessionState.play_count = current + 1
      saveMutqinState(this.mutqinState)
      this.persistCentralSessionState()
    },
    incrementVersePlayCount(verseKey) {
      if (!verseKey || !this.mutqinState?.sessionState) return
      const currentMap = this.mutqinState.sessionState.verse_play_counts || {}
      const current = Math.max(0, Number(currentMap[verseKey] || 0))
      this.mutqinState.sessionState.verse_play_counts = {
        ...currentMap,
        [verseKey]: current + 1
      }
      saveMutqinState(this.mutqinState)
      this.persistCentralSessionState()
    },

    validateSessionForExport(session) {
      const errors = []
      if (!session?.id) errors.push('Missing session id.')
      if (!session?.name) errors.push('Missing session name.')
      if (!session?.config?.chapterId) errors.push('Missing surah selection.')
      if (!Number(session?.config?.rangeStart) || !Number(session?.config?.rangeEnd)) errors.push('Missing ayah range.')
      if (!session?.savedAt) errors.push('Missing saved timestamp.')
      return {
        ok: errors.length === 0,
        message: errors[0] || ''
      }
    },

    buildSessionExportPayload(session) {
      const normalizedSession = this.normalizeSavedSessionRecord(session)
      return {
        version: 1,
        app: 'mutqin',
        exportedAt: new Date().toISOString(),
        session: normalizedSession,
        restore: {
          ...(normalizedSession?.restore || {}),
          savedSession: normalizedSession,
          uiState: {
            theme: this.theme
          }
        }
      }
    },

    buildSessionExportFilename(session, format = 'csv') {
      const safeName = slugifySessionFilePart(session?.name || 'session')
      const stamp = new Date(session?.savedAt || Date.now()).toISOString().slice(0, 10)
      const suffix = `${safeName}_${stamp}_mutqin`
      if (format === 'word') return `${suffix}.doc`
      if (format === 'pdf') return `${suffix}.pdf`
      return `${suffix}.csv`
    },

    buildSessionExportCsv(payload) {
      const session = payload?.session || {}
      const config = session?.config || {}
      const stats = this.normalizeSessionStats(session?.stats || {}, config)
      const rows = [
        ['Session Name', session?.name || ''],
        ['Surah', config?.chapterName || (config?.chapterId ? `Surah ${config.chapterId}` : '')],
        ['Ayah Range', (config?.rangeStart && config?.rangeEnd) ? `${config.rangeStart}-${config.rangeEnd}` : ''],
        ['Saved At', session?.savedAt ? new Date(session.savedAt).toISOString() : ''],
        ['Exported At', payload?.exportedAt || ''],
        ['Verses Read', `${stats.verses_read || 0}`],
        ['Time Spent', this.formatTime(stats.time_spent_seconds)],
        ['Repetitions Completed', `${stats.repetitions_completed || 0}`],
        ['Session Plays', `${stats.session_play_count || 0}`],
        ['Total Verse Plays', `${stats.total_verse_play_count || 0}`],
        ['Sessions Completed', `${stats.sessions_completed || 0}`],
        ['Average Time Per Verse', this.formatTime(stats.average_time_per_verse_seconds)],
        ['Struggled Ayahs', `${stats.weak_verses_encountered || 0}`]
      ]

      return rows
        .map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
    },

    triggerCsvDownload(filename, payload) {
      const blob = new Blob([this.buildSessionExportCsv(payload)], { type: 'text/csv;charset=utf-8' })
      this.triggerFileDownloadBlob(blob, filename)
    },

    triggerWordDownload(filename, payload) {
      // Lightweight "Word" export: an HTML document wrapped with a .doc extension.
      // This stays dependency-free and is good enough for sharing/backup.
      const html = this.buildSessionExportHtml(payload)
      const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
      this.triggerFileDownloadBlob(blob, filename)
    },

    triggerPdfExport(filename, payload) {
      // PDF export uses browser print pipeline with a stable Blob preview.
      const html = this.buildSessionExportHtml(payload)
      const blob = new Blob([html.replace('{{__TITLE__}}', this.escapeHtml(filename.replace(/\\.pdf$/i, '')))], { type: 'text/html;charset=utf-8' })
      const previewUrl = URL.createObjectURL(blob)
      const w = window.open(previewUrl, '_blank', 'noopener,noreferrer')
      if (!w) throw new Error('Popup blocked')
      window.setTimeout(() => {
        try {
          w.focus()
          w.print()
        } finally {
          window.setTimeout(() => {
            URL.revokeObjectURL(previewUrl)
            w.close()
          }, 600)
        }
      }, 420)
    },

    triggerFileDownloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.rel = 'noopener'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      window.requestAnimationFrame(() => {
        anchor.click()
        document.body.removeChild(anchor)
        window.setTimeout(() => URL.revokeObjectURL(url), 1200)
      })
    },

    escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
    },

    buildSessionExportHtml(payload) {
      const session = payload?.session || {}
      const config = session?.config || {}
      const stats = this.normalizeSessionStats(session?.stats || {}, config)

      const title = this.escapeHtml(session?.name || 'Session Export')
      const subtitleParts = [
        config?.chapterName || (config?.chapterId ? `Surah ${config.chapterId}` : ''),
        (config?.rangeStart && config?.rangeEnd) ? `Ayahs ${config.rangeStart}-${config.rangeEnd}` : ''
      ].filter(Boolean)
      const subtitle = this.escapeHtml(subtitleParts.join(' · '))

      const rows = [
        { label: 'Verses read', value: `${stats.verses_read}` },
        { label: 'Time spent', value: this.formatTime(stats.time_spent_seconds) },
        { label: 'Repetitions completed', value: `${stats.repetitions_completed}` },
        { label: 'Session plays', value: `${stats.session_play_count || 0}` },
        { label: 'Total verse plays', value: `${stats.total_verse_play_count || 0}` },
        { label: 'Sessions completed', value: `${stats.sessions_completed}` },
        { label: 'Average time per verse', value: this.formatTime(stats.average_time_per_verse_seconds) },
        { label: 'Struggled ayahs', value: `${stats.weak_verses_encountered}` }
      ]

      const meta = [
        { label: 'Saved', value: session?.savedAt ? new Date(session.savedAt).toLocaleString('en-GB') : '' },
        { label: 'Exported', value: payload?.exportedAt ? new Date(payload.exportedAt).toLocaleString('en-GB') : '' }
      ].filter(r => r.value)

      const rowsHtml = rows.map(r => `<tr><td>${this.escapeHtml(r.label)}</td><td>${this.escapeHtml(r.value)}</td></tr>`).join('')
      const metaHtml = meta.map(r => `<span><strong>${this.escapeHtml(r.label)}:</strong> ${this.escapeHtml(r.value)}</span>`).join('')

      return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{__TITLE__}}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 32px; color: #1d1d1d; }
      h1 { margin: 0; font-size: 22px; letter-spacing: -0.01em; }
      p { margin: 6px 0 0 0; color: #555; }
      .meta { margin-top: 10px; color: #666; font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap; }
      .card { margin-top: 18px; border: 1px solid #e7e1d9; border-radius: 14px; padding: 16px; background: #fffaf3; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      td { padding: 10px 8px; border-bottom: 1px solid #eee7df; vertical-align: top; }
      td:first-child { width: 55%; color: #444; }
      td:last-child { text-align: right; font-weight: 600; }
      .foot { margin-top: 18px; font-size: 11px; color: #777; }
      @media print { body { margin: 14mm; } .foot { display: none; } }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    ${metaHtml ? `<div class="meta">${metaHtml}</div>` : ''}
    <div class="card">
      <table aria-label="Session stats">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div class="foot">Mutqin session export</div>
  </body>
</html>`
    },

    async exportSavedSession(sessionId, format = 'csv') {
      const session = this.savedSessions.find(item => item.id === sessionId)
      if (!session) return
      const validation = this.validateSessionForExport(session)
      if (!validation.ok) {
        this.exportSessionState = {
          activeSessionId: '',
          activeFormat: '',
          successSessionId: '',
          successFormat: '',
          errorSessionId: sessionId,
          errorFormat: format,
          errorMessage: validation.message
        }
        this.showBanner('Session export blocked: incomplete session data.', 'error', 2600)
        return
      }

      this.exportSessionState = {
        activeSessionId: sessionId,
        activeFormat: format,
        successSessionId: '',
        successFormat: '',
        errorSessionId: '',
        errorFormat: '',
        errorMessage: ''
      }

      try {
        await new Promise(resolve => window.setTimeout(resolve, 120))
        const payload = this.buildSessionExportPayload(session)
        if (format === 'word') {
          this.triggerWordDownload(this.buildSessionExportFilename(session, 'word'), payload)
        } else if (format === 'pdf') {
          this.triggerPdfExport(this.buildSessionExportFilename(session, 'pdf'), payload)
        } else {
          this.triggerCsvDownload(this.buildSessionExportFilename(session, 'csv'), payload)
        }
        this.exportSessionState = {
          activeSessionId: '',
          activeFormat: '',
          successSessionId: sessionId,
          successFormat: format,
          errorSessionId: '',
          errorFormat: '',
          errorMessage: ''
        }
        this.showBanner('Download ready ✓', 'success', 1800)
      } catch (error) {
        console.error('Failed to export session:', error)
        this.exportSessionState = {
          activeSessionId: '',
          activeFormat: '',
          successSessionId: '',
          successFormat: '',
          errorSessionId: sessionId,
          errorFormat: format,
          errorMessage: 'Something went wrong. Please retry.'
        }
        this.showBanner('Export failed, retry', 'error', 2600)
      }
    },

    retryFailedExport() {
      if (!this.exportSessionState.errorSessionId) return
      this.exportSavedSession(this.exportSessionState.errorSessionId, this.exportSessionState.errorFormat || 'csv')
    },

    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    recordingsLibraryStorageKey() {
      return this.userStorageKey('recordings')
    },
    recordingsLibraryCandidateKeys() {
      const uid = this.auth?.id || 'guest'
      return [...new Set([
        this.recordingsLibraryStorageKey(),
        this.userStorageKey('recordingsLibrary'),
        `telawa.recordings.${uid}`,
        `telawa.recordingsLibrary.${uid}`,
        'telawa.recordings',
        'telawa.recordingsLibrary'
      ])]
    },
    normalizeRecordingEntry(entry, index = 0) {
      if (!entry || typeof entry !== 'object') return null

      const directAyahKey = entry.ayahKey || entry.verseKey || entry.key || ''
      const keyParts = String(directAyahKey).match(/^(\d+):(\d+)$/)
      const chapterId = Number(
        entry.chapterId ||
        entry.surahId ||
        entry.chapter_id ||
        entry.surah_id ||
        entry.chapter?.id ||
        keyParts?.[1] ||
        0
      )
      const ayahNumber = Number(
        entry.ayahNumber ||
        entry.verseNumber ||
        entry.numberInSurah ||
        entry.ayah_index ||
        keyParts?.[2] ||
        0
      )
      const ayahKey = chapterId > 0 && ayahNumber > 0 ? `${chapterId}:${ayahNumber}` : ''
      const chapterName = entry.chapterName ||
        entry.surahName ||
        entry.chapter_name ||
        entry.surah_name ||
        entry.chapter?.name_simple ||
        this.chapters.find(chapter => Number(chapter.id) === chapterId)?.name_simple ||
        (chapterId ? `Surah ${chapterId}` : 'Surah')
      const audioSrc = String(
        entry.audioSrc ||
        entry.audioUrl ||
        entry.audio_url ||
        entry.url ||
        entry.src ||
        entry.blobUrl ||
        entry.dataUrl ||
        ''
      ).trim()

      if (!ayahKey || !audioSrc) return null

      const recordedAt = parseRecordingDate(entry.recordedAt || entry.createdAt || entry.timestamp || entry.date)
      const durationSeconds = parseRecordingDurationSeconds(
        entry.durationSeconds ??
        entry.duration_seconds ??
        entry.duration ??
        entry.length_seconds ??
        entry.length
      )

      return {
        id: String(entry.id || `${ayahKey}-${Date.parse(recordedAt) || Date.now()}-${index}`),
        chapterId,
        chapterName,
        ayahNumber,
        ayahKey,
        recordedAt,
        durationSeconds,
        result: normalizeRecordingResult(entry.result || entry.selfCheckResult || entry.checkResult || entry.status || entry.score),
        audioSrc
      }
    },
    persistRecordingsLibrary() {
      try {
        localStorage.setItem(this.recordingsLibraryStorageKey(), JSON.stringify(this.recordingsLibrary))
      } catch (error) {
        console.error('Failed to persist recordings library:', error)
      }
    },
    ensureSelectedRecordingsAyah() {
      const matches = this.filteredRecordingsAyahGroups.flatMap(group => group.ayahs)
      if (matches.some(item => item.ayahKey === this.selectedRecordingsAyahKey)) return
      this.selectedRecordingsAyahKey = matches[0]?.ayahKey || ''
    },
    loadRecordingsLibrary() {
      const entries = []
      const seen = new Set()

      this.recordingsLibraryCandidateKeys().forEach((key, keyIndex) => {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) return
          const parsed = JSON.parse(raw)
          const collected = collectRecordingEntries(parsed)
          collected.forEach((item, itemIndex) => {
            const normalized = this.normalizeRecordingEntry(item, (keyIndex * 10000) + itemIndex)
            if (!normalized) return
            const signature = `${normalized.ayahKey}:${normalized.recordedAt}:${normalized.audioSrc}`
            if (seen.has(signature)) return
            seen.add(signature)
            entries.push(normalized)
          })
        } catch (error) {
          console.warn(`Failed to read recordings from ${key}:`, error)
        }
      })

      this.recordingsLibrary = entries.sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
      this.ensureSelectedRecordingsAyah()
    },
    openRecordingsLibrary(options = {}) {
      const targetAyahKey = options?.ayahKey
        || (this.showSelfCheckModal ? this.selfCheckVerseKey : '')
        || this.effectiveActiveVerseKey
        || ''
      const isCompactViewport = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 768px)').matches
      const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => callback()
      this.showTools = false
      this.showConfirmModal = false
      this.showSessionExitModal = false
      this.showResumeModal = false
      this.showSelfCheckModal = false
      this.recordingsLibraryReturnToSelfCheckKey = options?.returnToSelfCheck ? targetAyahKey : ''
      this.selfCheckPeekActive = false
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }
      this.recordingsLibrarySearch = ''
      this.pendingRecordingDeleteId = ''
      this.recordingsNavExpanded = !isCompactViewport
      this.showRecordingsLibrary = true
      this.isRecordingsLibraryLoading = true
      this.syncBodyScrollLock(true)

      schedule(() => {
        this.loadRecordingsLibrary()
        if (targetAyahKey) {
          this.selectedRecordingsAyahKey = targetAyahKey
          this.ensureSelectedRecordingsAyah()
        }
        this.isRecordingsLibraryLoading = false
      })
    },
    closeRecordingsLibrary() {
      this.pendingRecordingDeleteId = ''
      this.recordingsLibrarySearch = ''
      this.showRecordingsLibrary = false
      this.recordingsLibraryReturnToSelfCheckKey = ''
      this.stopRecordingsPlayback({ clearSource: true })
      this.syncBodyScrollLock(false)
    },
    backToSelfCheckFromLibrary() {
      const ayahKey = this.recordingsLibraryReturnToSelfCheckKey || this.selectedRecordingsAyahKey
      const verse = this.verses.find(item => item.key === ayahKey) || this.selfCheckVerseRef
      this.pendingRecordingDeleteId = ''
      this.recordingsLibrarySearch = ''
      this.showRecordingsLibrary = false
      this.recordingsLibraryReturnToSelfCheckKey = ''
      this.stopRecordingsPlayback({ clearSource: true })
      if (verse?.key) {
        this.openSelfCheckModal(verse)
      } else {
        this.syncBodyScrollLock(false)
      }
    },
    toggleRecordingsNav() {
      this.recordingsNavExpanded = !this.recordingsNavExpanded
    },
    selectRecordingsAyah(ayahKey) {
      this.selectedRecordingsAyahKey = ayahKey
      this.pendingRecordingDeleteId = ''
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches) {
        this.recordingsNavExpanded = false
      }
    },
    initRecordingsAudio() {
      if (this.recordingsAudioBound || !this.recordingsAudioElement) return
      this.recordingsAudioElement.addEventListener('pause', () => {
        if (!this.recordingsAudioElement?.ended) {
          this.activeRecordingPlaybackId = ''
          this.activeSelfCheckPreviewKey = ''
          this.activeSelfCheckAyahPlaybackKey = ''
        }
      })
      this.recordingsAudioElement.addEventListener('ended', () => {
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
        this.activeSelfCheckAyahPlaybackKey = ''
      })
      this.recordingsAudioElement.addEventListener('error', error => {
        console.error('Recordings playback error:', error)
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
        this.activeSelfCheckAyahPlaybackKey = ''
        this.showBanner('Unable to play this recording right now.', 'error', 2200)
      })
      this.recordingsAudioBound = true
    },
    ensureRecordingsAudioElement() {
      if (!this.recordingsAudioElement) {
        this.recordingsAudioElement = this.$refs.recordingsAudio || null
      }
      this.initRecordingsAudio()
      return this.recordingsAudioElement
    },
    stopRecordingsPlayback(options = {}) {
      const { clearSource = false } = options
      const audio = this.ensureRecordingsAudioElement()
      if (!audio) return
      try {
        audio.pause()
        if (clearSource) {
          audio.removeAttribute('src')
          audio.load()
        }
      } catch (error) {
        console.warn('Failed to stop recordings playback:', error)
      }
      this.activeRecordingPlaybackId = ''
      this.activeSelfCheckPreviewKey = ''
      this.activeSelfCheckAyahPlaybackKey = ''
    },
    async toggleRecordingPlayback(recording) {
      if (!recording?.audioSrc) return

      const audio = this.ensureRecordingsAudioElement()
      if (!audio) {
        this.showBanner('Audio system not ready', 'error', 2200)
        return
      }

      if (this.activeRecordingPlaybackId === recording.id && !audio.paused) {
        audio.pause()
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
        return
      }

      this.pendingRecordingDeleteId = ''
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }

      if (audio.currentSrc !== recording.audioSrc) {
        audio.src = recording.audioSrc
        audio.load()
      }

      try {
        await audio.play()
        this.activeRecordingPlaybackId = recording.id
        this.activeSelfCheckPreviewKey = ''
      } catch (error) {
        console.error('Failed to play recording:', error)
        this.activeRecordingPlaybackId = ''
        this.showBanner('Unable to play this recording right now.', 'error', 2200)
      }
    },
    promptDeleteRecording(recordingId) {
      this.pendingRecordingDeleteId = recordingId
    },
    cancelDeleteRecording() {
      this.pendingRecordingDeleteId = ''
    },
    deleteRecording(recordingId) {
      if (!recordingId) return
      const target = this.recordingsLibrary.find(recording => recording.id === recordingId) || null
      if (this.activeRecordingPlaybackId === recordingId) {
        this.stopRecordingsPlayback({ clearSource: true })
      }
      this.recordingsLibrary = this.recordingsLibrary.filter(recording => recording.id !== recordingId)
      this.persistRecordingsLibrary()
      this.pendingRecordingDeleteId = ''
      this.ensureSelectedRecordingsAyah()
      if (!this.recordingsLibrary.length) {
        this.selectedRecordingsAyahKey = ''
      }
      this.showBanner(
        target ? `Deleted ayah ${target.ayahNumber} recording` : 'Recording deleted',
        'info',
        1600
      )
    },
    getRecordingAttemptLabel(recording) {
      const attempt = Number(recording?.attemptNumber || 0)
      return attempt > 0 ? `Attempt ${attempt}` : 'Attempt'
    },
    getRecordingResultTone(result) {
      if (result === 'Excellent') return 'tone-excellent'
      if (result === 'Good') return 'tone-good'
      return 'tone-review'
    },
    getSelfCheckResultHint(option) {
      const hints = {
        Excellent: 'Confident and accurate from memory',
        Good: 'Mostly correct with minor hesitation',
        'Needs Review': 'Revisit this ayah before moving on'
      }
      return hints[option] || ''
    },
    getSelfCheckRecorderDescription() {
      if (this.isSelfCheckRecording) {
        return 'Your microphone is active. Recite the ayah aloud, then stop when you are finished.'
      }
      if (this.selfCheckActiveDraft) {
        return 'Listen to your recording, rate your confidence, then save it to your library or try again.'
      }
      if (this.selfCheckPreparing) {
        return 'Setting up microphone access for a clear recording.'
      }
      if (!this.supportsSelfCheckRecording()) {
        return 'Recording requires a browser with microphone support.'
      }
      return 'Record yourself reciting this ayah, then compare your attempt against the text above.'
    },
    getAyahTranslation(ayahKey) {
      if (!ayahKey) return ''
      const verse = this.verses.find(item => item.key === ayahKey)
      return verse?.translation || ''
    },
    formatRecordingDuration(seconds) {
      return this.formatTime(Number(seconds || 0))
    },
    formatRecordingDate(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    formatRecordingTimestamp(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    buildSelfCheckVerseRef(verse) {
      if (!verse?.key) return null
      return {
        ...verse,
        chapterName: verse.chapterName
          || this.currentChapter?.name_simple
          || this.activeChapterName
          || (verse.chapterId ? `Surah ${verse.chapterId}` : 'Current surah')
      }
    },
    getSelfCheckInitialFontSize(verse) {
      const verseFont = Number(this.getVerseFontSize(verse?.key) || this.defaultFontSize || 120)
      return Math.max(400, Math.min(560, verseFont + 300))
    },
    openSelfCheckModal(verse) {
      if (!verse?.key) return
      if (this.isSelfCheckRecording && this.selfCheckVerseKey && this.selfCheckVerseKey !== verse.key) {
        this.showBanner('Stop the current self-check before moving to another ayah.', 'info', 2200)
        return
      }
      if (this.selfCheckDraft?.ayahKey && this.selfCheckDraft.ayahKey !== verse.key) {
        this.showBanner('Save or discard the current self-check attempt before switching ayahs.', 'info', 2400)
        return
      }

      this.loadRecordingsLibrary()
      this.showTools = false
      this.selfCheckVerseRef = this.buildSelfCheckVerseRef(verse)
      this.selfCheckVerseKey = verse.key
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(verse)
      this.selfCheckTajweedEnabled = !!this.tajweedEnabled
      this.showSelfCheckModal = true
      this.selfCheckError = ''
      this.selfCheckLastSavedAyahKey = ''
      this.pendingRecordingDeleteId = ''
      this.selfCheckPeekActive = false
      this.syncBodyScrollLock(true)
    },
    closeSelfCheckModal() {
      if (this.isSelfCheckRecording) {
        this.showBanner('Stop or discard the current recording before closing Self-Check.', 'info', 2200)
        return
      }
      this.showSelfCheckModal = false
      this.selfCheckPeekActive = false
      this.pendingRecordingDeleteId = ''
      this.selfCheckError = ''
      this.selfCheckLastSavedAyahKey = ''
      this.stopRecordingsPlayback({ clearSource: true })
      this.selfCheckVerseRef = null
      this.selfCheckVerseKey = ''
      this.syncBodyScrollLock(false)
    },
    openRecordingsLibraryFromSelfCheck() {
      const ayahKey = this.selfCheckVerseKey || this.selfCheckModalVerse?.key || ''
      if (!ayahKey && !this.hasRecordingsLibraryEntries) {
        this.showBanner('Select an ayah before opening the recordings library.', 'info', 2200)
        return
      }
      if (this.isSelfCheckRecording) {
        this.showBanner('Stop the current recording before opening the recordings library.', 'info', 2200)
        return
      }
      this.showSelfCheckModal = false
      this.selfCheckPeekActive = false
      this.pendingRecordingDeleteId = ''
      this.stopRecordingsPlayback({ clearSource: true })
      this.syncBodyScrollLock(false)
      this.openRecordingsLibrary({ ayahKey, returnToSelfCheck: true })
    },
    adjustSelfCheckFont(delta) {
      const next = Math.max(320, Math.min(560, Number(this.selfCheckFontSize || 420) + Number(delta || 0)))
      this.selfCheckFontSize = next
    },
    toggleSelfCheckBlurMode() {
      this.selfCheckBlurEnabled = !this.selfCheckBlurEnabled
      if (!this.selfCheckBlurEnabled) {
        this.selfCheckPeekActive = false
      }
    },
    toggleSelfCheckTajweed() {
      this.selfCheckTajweedEnabled = !this.selfCheckTajweedEnabled
    },
    startSelfCheckPeek() {
      if (!this.selfCheckBlurEnabled) return
      this.selfCheckPeekActive = true
    },
    stopSelfCheckPeek() {
      this.selfCheckPeekActive = false
    },
    getSelfCheckModalArabic(verse) {
      if (!verse?.arabic) return ''
      if (this.selfCheckTajweedEnabled && verse.arabic_tajweed) {
        return this.normalizeTajweedMarkup(verse.arabic_tajweed)
      }
      return this.stripTajweedMarkup(verse.arabic)
    },
    async toggleSelfCheckAyahPlayback(verse) {
      if (!verse?.audio) {
        this.showBanner(`Audio not available for verse ${verse?.number || ''}`.trim(), 'info', 2000)
        return
      }

      const audio = this.ensureRecordingsAudioElement()
      if (!audio) {
        this.showBanner('Audio system not ready', 'error', 2200)
        return
      }

      if (this.activeSelfCheckAyahPlaybackKey === verse.key && !audio.paused) {
        audio.pause()
        this.activeSelfCheckAyahPlaybackKey = ''
        return
      }

      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement) {
        try { this.audioElement.pause() } catch { }
      }
      this.isPlaying = false
      this.manualOnlyPlayback = false

      audio.src = this.normalizeAudioUrl(verse.audio)
      audio.load()

      try {
        await audio.play()
        this.activeSelfCheckAyahPlaybackKey = verse.key
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
      } catch (error) {
        console.error('Failed to play self-check ayah audio:', error)
        this.activeSelfCheckAyahPlaybackKey = ''
        this.showBanner('Unable to play this ayah right now.', 'error', 2200)
      }
    },
    supportsSelfCheckRecording() {
      return typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && typeof MediaRecorder !== 'undefined'
    },
    getAyahRecordingHistory(ayahKey) {
      return this.recordingsLibrary
        .filter(recording => recording.ayahKey === ayahKey)
        .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    },
    getAyahRecordingCount(ayahKey) {
      if (!ayahKey) return 0
      return this.recordingsLibrary.filter(recording => recording.ayahKey === ayahKey).length
    },
    getLatestRecordingForAyah(ayahKey) {
      return this.getAyahRecordingHistory(ayahKey)[0] || null
    },
    getSelfCheckDraftForVerse(verseKey) {
      return this.selfCheckDraft?.ayahKey === verseKey ? this.selfCheckDraft : null
    },
    getSelfCheckLiveDurationLabel() {
      if (!this.selfCheckStartedAt) return '00:00'
      const seconds = Math.max(0, Math.round((Number(this.statsTick || Date.now()) - Number(this.selfCheckStartedAt || 0)) / 1000))
      return this.formatRecordingDuration(seconds)
    },
    chooseRecorderMimeType() {
      if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
      return candidates.find(type => MediaRecorder.isTypeSupported(type)) || ''
    },
    async blobToDataUrl(blob) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'))
        reader.readAsDataURL(blob)
      })
    },
    cleanupSelfCheckMedia() {
      if (this.selfCheckMediaStream) {
        try {
          this.selfCheckMediaStream.getTracks().forEach(track => track.stop())
        } catch (error) {
          console.warn('Failed to stop self-check media tracks:', error)
        }
      }
      this.selfCheckMediaStream = null
      this.selfCheckMediaRecorder = null
      this.selfCheckChunks = []
      this.selfCheckStartedAt = 0
    },
    async startSelfCheckRecording(verse) {
      if (!verse?.key) return
      if (!this.supportsSelfCheckRecording()) {
        this.selfCheckError = 'Recording is not supported in this browser.'
        return
      }
      if (this.isSelfCheckRecording) return

      this.loadRecordingsLibrary()
      this.selfCheckVerseRef = this.buildSelfCheckVerseRef(verse)
      this.selfCheckVerseKey = verse.key
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(verse)
      this.showSelfCheckModal = true
      this.selfCheckError = ''
      this.selfCheckLastSavedAyahKey = ''
      this.selfCheckPreparing = true
      this.selfCheckPreparingLabel = 'Preparing microphone…'
      this.selfCheckPermissionState = 'prompt'
      this.selfCheckDiscardOnStop = false
      this.selfCheckPeekActive = false
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }

      try {
        if (this.selfCheckDraft?.ayahKey === verse.key) {
          this.selfCheckDraft = null
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = this.chooseRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.selfCheckMediaStream = stream
        this.selfCheckMediaRecorder = recorder
        this.selfCheckChunks = []
        this.selfCheckPermissionState = 'granted'

        recorder.ondataavailable = event => {
          if (event.data?.size) this.selfCheckChunks.push(event.data)
        }
        recorder.onerror = () => {
          this.selfCheckError = 'The microphone stopped unexpectedly.'
          this.selfCheckPreparing = false
          this.isSelfCheckRecording = false
          this.cleanupSelfCheckMedia()
        }
        recorder.onstop = async () => {
          const durationSeconds = Math.max(1, Math.round((Date.now() - Number(this.selfCheckStartedAt || Date.now())) / 1000))
          const chunks = [...this.selfCheckChunks]
          const discard = this.selfCheckDiscardOnStop
          this.selfCheckPreparing = false
          this.isSelfCheckRecording = false
          this.selfCheckDiscardOnStop = false

          try {
            if (!discard && chunks.length) {
              this.selfCheckPreparing = true
              this.selfCheckPreparingLabel = 'Processing recording…'
              const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
              const dataUrl = await this.blobToDataUrl(blob)
              this.selfCheckDraft = {
                id: `draft-${verse.key}-${Date.now()}`,
                ayahKey: verse.key,
                ayahNumber: verse.number,
                chapterId: verse.chapterId,
                chapterName: this.currentChapter?.name_simple || this.activeChapterName || `Surah ${verse.chapterId}`,
                recordedAt: new Date().toISOString(),
                durationSeconds,
                result: 'Needs Review',
                audioSrc: dataUrl
              }
              this.showBanner(`Recording ready for Ayah ${verse.number}`, 'success', 1800)
            }
          } catch (error) {
            console.error('Failed to process self-check recording:', error)
            this.selfCheckError = 'The recording could not be prepared for review.'
          } finally {
            this.selfCheckPreparing = false
            this.selfCheckPreparingLabel = ''
            this.cleanupSelfCheckMedia()
          }
        }

        recorder.start()
        this.selfCheckStartedAt = Date.now()
        this.isSelfCheckRecording = true
        this.selfCheckPreparing = false
        this.selfCheckPreparingLabel = ''
      } catch (error) {
        console.error('Failed to start self-check recording:', error)
        this.selfCheckPermissionState = 'denied'
        this.selfCheckPreparing = false
        this.selfCheckPreparingLabel = ''
        this.selfCheckError = 'Microphone access was blocked. Allow microphone permission, then try again.'
        this.cleanupSelfCheckMedia()
      }
    },
    stopSelfCheckRecording() {
      if (!this.selfCheckMediaRecorder || this.selfCheckMediaRecorder.state !== 'recording') return
      this.selfCheckPreparing = true
      this.selfCheckPreparingLabel = 'Finalising recording…'
      this.selfCheckMediaRecorder.stop()
    },
    discardSelfCheckRecording() {
      if (this.isSelfCheckRecording && this.selfCheckMediaRecorder) {
        this.selfCheckDiscardOnStop = true
        this.selfCheckPreparing = true
        this.selfCheckPreparingLabel = 'Discarding recording…'
        this.selfCheckMediaRecorder.stop()
        return
      }
      if (this.selfCheckDraft?.ayahKey && this.activeSelfCheckPreviewKey === this.selfCheckDraft.ayahKey) {
        this.stopRecordingsPlayback({ clearSource: true })
      }
      this.selfCheckDraft = null
      this.selfCheckError = ''
      this.selfCheckPreparing = false
      this.selfCheckPreparingLabel = ''
      this.pendingRecordingDeleteId = ''
    },
    restartSelfCheckRecording(verse) {
      this.discardSelfCheckRecording()
      window.setTimeout(() => {
        this.startSelfCheckRecording(verse)
      }, 40)
    },
    setSelfCheckDraftResult(result) {
      if (!this.selfCheckDraft) return
      this.selfCheckDraft = {
        ...this.selfCheckDraft,
        result: normalizeRecordingResult(result)
      }
    },
    async toggleSelfCheckPreview(verseKey) {
      const draft = this.getSelfCheckDraftForVerse(verseKey)
      if (!draft?.audioSrc) return

      const audio = this.ensureRecordingsAudioElement()
      if (!audio) {
        this.showBanner('Audio system not ready', 'error', 2200)
        return
      }

      if (this.activeSelfCheckPreviewKey === verseKey && !audio.paused) {
        audio.pause()
        this.activeSelfCheckPreviewKey = ''
        return
      }

      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }

      audio.src = draft.audioSrc
      audio.load()

      try {
        await audio.play()
        this.activeSelfCheckPreviewKey = verseKey
      } catch (error) {
        console.error('Failed to preview self-check recording:', error)
        this.activeSelfCheckPreviewKey = ''
        this.showBanner('Unable to play this recording right now.', 'error', 2200)
      }
    },
    saveSelfCheckRecording(verse) {
      const draft = this.getSelfCheckDraftForVerse(verse?.key)
      if (!draft) return

      this.loadRecordingsLibrary()
      if (this.activeSelfCheckPreviewKey === verse?.key) {
        this.stopRecordingsPlayback({ clearSource: true })
      }
      const savedEntry = {
        ...draft,
        id: `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionRangeStart: Number(this.rangeStart || verse?.number || 1),
        sessionRangeEnd: Number(this.rangeEnd || verse?.number || 1),
        reciterId: this.reciterId,
        source: 'self-check'
      }

      this.recordingsLibrary = [savedEntry, ...this.recordingsLibrary]
      this.persistRecordingsLibrary()
      this.selfCheckLastSavedAyahKey = savedEntry.ayahKey
      this.selfCheckDraft = null
      this.ensureSelectedRecordingsAyah()
      this.showBanner(`Saved self-check for Ayah ${savedEntry.ayahNumber}`, 'success', 1800)
    },

    runConfirmAction() {
      const action = this.confirmModal.action
      const actionData = this.confirmModal.data
      this.closeConfirmModal()
      if (action === 'reset-session') this.performResetControls()
      if (action === 'switch-mode') this.performToggleMode()
      if (action === 'delete-offline' && this.pendingDeleteId) this.performDeleteOffline()
      if (action === 'discard-continue') this.clearContinueSession()
      if (action === 'delete-saved-session' && actionData?.sessionId)
        this.performDeleteSavedSession(actionData.sessionId)
    },



    async downloadVerseAudio(verse) {
      const audioUrl = this.normalizeAudioUrl(verse?.audio || '')
      if (!audioUrl) {
        this.showBanner('Audio not available for this ayah', 'info', 2200)
        return
      }

      try {
        const filename = `surah-${this.chapterId}-ayah-${verse.number}.mp3`
        const downloadUrl = `/memorisation/audio-download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`
        const anchor = document.createElement('a')
        anchor.href = downloadUrl
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        this.showBanner(`Downloaded ayah ${verse.number} audio`, 'success', 1800)
      } catch (error) {
        console.error('Verse download failed:', error)
        this.showBanner('Failed to download ayah audio', 'error', 2600)
      }
    },
    syncSettingsDraft() {
      this.settingsDraft = {
        tajweedEnabled: !!this.tajweedEnabled,
        showTranslation: !!this.showTranslation,
        showTransliteration: !!this.showTransliteration,
        showWordByWord: !!this.showWordByWord,
        wordByWordAudioEnabled: !!this.wordByWordAudioEnabled,
        defaultFontSize: Math.max(
          this.minFontSize,
          Math.min(this.maxFontSize, Number(this.defaultFontSize || 100))
        )
      }
    },

    persistControlState() {
      this.persistUiState()
      this.persistCentralSessionState()
    },

    toggleSettingsOption(key) {
      this.updateSettingsValue(key, !this.settingsDraft[key])
    },

    updateSettingsValue(key, value) {
      this.settingsDraft = {
        ...this.settingsDraft,
        [key]: value
      }
      this.applySettingsChanges({ silent: true })
    },

    parseVerseNumber(value) {
      const rawKey = typeof value === 'string'
        ? value
        : (value && typeof value === 'object' ? (value.key || value.ayahId || value.id || '') : '')
      if (!rawKey || typeof rawKey !== 'string' || !rawKey.includes(':')) return null
      const versePart = rawKey.split(':')[1]
      const number = Number.parseInt(String(versePart), 10)
      return Number.isFinite(number) ? number : null
    },

    isVerseBlurred(verseKey) {
      if (!this.blurModeEnabled) return false
      const activeNumber = this.parseVerseNumber(this.effectiveActiveVerseKey)
      const verseNumber = this.parseVerseNumber(verseKey)
      if (activeNumber === null || verseNumber === null) return false
      return verseNumber > activeNumber
    },
    isVersePeekRevealed(verseKey) {
      if (!this.blurModeEnabled || !this.isVerseBlurred(verseKey)) return false
      return this.blurPeekHoldingSpace || this.hoverPeekVerseKey === verseKey || this.touchPeekVerseKey === verseKey
    },

    focusLinkedAyah(verseKey, options = {}) {
      if (!verseKey) return null
      return this.setActiveVerse(verseKey, options)
    },

    openToolsPanel(options = {}) {
      const { verseKey = null, mode = this.currentMode, scroll = false } = options
      this.toolsReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null
      this.currentMode = mode
      this.tab = 'tools'
      this.syncSettingsDraft()

      if (verseKey) {
        this.focusLinkedAyah(verseKey, { mode, scroll })
      }

      this.showPlannerModal = false
      this.showConfirmModal = false
      this.showResumeModal = false
      this.showTools = true
      this.persistUiState()
      this.$nextTick(() => {
        const panelBody = this.$refs.toolsBody
        if (panelBody) panelBody.scrollTop = 0
        this.focusToolsPanel()
      })
    },

    closeToolsPanel() {
      if (!this.showTools) return
      this.showTools = false
      this.persistUiState()
      this.restoreToolsFocus()
    },

    openAdvancedControls() {
      // Keep power features accessible, but behind a tertiary surface.
      this.openToolsPanel()
    },
    setLoopCount(value) {
      const nextValue = value === 'infinite' ? 'infinite' : Math.max(1, Number(value || 1))
      this.selectedLoopCount = nextValue
      if (nextValue !== 'infinite') {
        this.repetitionsPerStep = nextValue
      }
      if (this.hasVerses && !this.chainingEnabled) {
        this.applyChainingQueueChange(this.currentMode, { restart: true })
      } else {
        this.persistUiState()
        this.persistCentralSessionState()
      }
      this.showBanner(
        nextValue === 'infinite' ? 'Infinite loop enabled for the current ayah' : `Loop count set to ${nextValue}x`,
        'info',
        1200
      )
    },
    isReviewPriorityAyah(verseKey) {
      if (!verseKey) return false
      const currentEntry = this.activeQueueEntry
      if (currentEntry?.phase === 'Retention' && (currentEntry?.ayahId === verseKey || currentEntry?.verse?.key === verseKey || currentEntry?.key === verseKey)) {
        return true
      }
      const retentionDue = (this.queue || []).some(item => item?.phase === 'Retention' && (item?.ayahId === verseKey || item?.verse?.key === verseKey || item?.key === verseKey))
      if (retentionDue) return true
      const ayah = this.mutqinState?.ayahs?.[verseKey]
      return ayah?.status === 'weak'
    },
    onVersePeekEnter(verseKey) {
      if (!this.blurModeEnabled || !this.isVerseBlurred(verseKey)) return
      this.hoverPeekVerseKey = verseKey
    },
    onVersePeekLeave(verseKey) {
      if (this.hoverPeekVerseKey === verseKey) this.hoverPeekVerseKey = null
    },
    clearTouchPeek() {
      if (this.longPressPeekTimer) {
        clearTimeout(this.longPressPeekTimer)
        this.longPressPeekTimer = null
      }
      this.longPressPeekTriggered = false
      this.touchPeekVerseKey = null
    },
    onVerseTouchStart(event, verseKey = null) {
      const touch = event?.changedTouches?.[0]
      if (!touch) return
      this.touchStartX = Number(touch.clientX || 0)
      this.touchStartY = Number(touch.clientY || 0)
      this.clearTouchPeek()
      if (!this.blurModeEnabled || !this.isVerseBlurred(verseKey)) return
      this.longPressPeekTimer = window.setTimeout(() => {
        this.longPressPeekTriggered = true
        this.touchPeekVerseKey = verseKey
      }, 320)
    },
    onVerseTouchEnd(event, verseKey = null) {
      const touch = event?.changedTouches?.[0]
      if (!touch) return
      const dx = Number(touch.clientX || 0) - Number(this.touchStartX || 0)
      const dy = Number(touch.clientY || 0) - Number(this.touchStartY || 0)
      const longPressTriggered = this.longPressPeekTriggered
      this.clearTouchPeek()
      if (longPressTriggered) {
        this.suppressNextVerseClick = true
        window.setTimeout(() => {
          this.suppressNextVerseClick = false
        }, 260)
        return
      }
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) this.next()
      else this.prev()
    },
    onVerseCardClick(verse) {
      if (!verse?.key) return
      if (this.suppressNextVerseClick) {
        this.suppressNextVerseClick = false
        return
      }
      const wasActive = this.effectiveActiveVerseKey === verse.key
      this.focusLinkedAyah(verse.key)
      // If the user clicks the active ayah card, treat it as an intent to play/pause.
      if (wasActive && verse.audio) {
        this.playVerse(verse)
      }
    },
    setReadingViewMode(mode) {
      const nextMode = mode === 'mushaf' ? 'mushaf' : 'stacked'
      if (this.readingViewMode === nextMode) return
      this.readingViewMode = nextMode
      if (nextMode === 'mushaf') this.syncMushafPageToActiveVerse()
      this.persistUiState()
    },
    syncMushafPageToActiveVerse() {
      if (!this.mushafPages.length) {
        this.mushafPageIndex = 0
        return
      }
      const activeKey = this.effectiveActiveVerseKey || this.activeVerseKey
      const pageIndex = this.mushafPages.findIndex(page => page.verses.some(verse => verse.key === activeKey))
      if (pageIndex >= 0) {
        this.mushafPageIndex = pageIndex
        return
      }
      this.mushafPageIndex = this.safeMushafPageIndex
    },
    goToMushafPage(index) {
      if (!this.mushafPages.length) {
        this.mushafPageIndex = 0
        return
      }
      this.mushafPageIndex = Math.max(0, Math.min(Number(index || 0), this.mushafPages.length - 1))
    },
    goToPreviousMushafPage() {
      this.goToMushafPage(this.safeMushafPageIndex - 1)
    },
    goToNextMushafPage() {
      this.goToMushafPage(this.safeMushafPageIndex + 1)
    },
    onMushafAyahEnter(verse) {
      if (!verse?.key) return
      this.hoveredMushafVerseKey = verse.key
      this.onVersePeekEnter(verse.key)
    },
    onMushafAyahLeave(verse) {
      this.hoveredMushafVerseKey = ''
      this.onVersePeekLeave(verse?.key)
    },
    increaseMushafFontSize() {
      this.defaultFontSize = Math.min(this.maxFontSize, Number(this.defaultFontSize || 120) + this.fontSizeStep)
      this.updateDefaultFontSize()
    },
    decreaseMushafFontSize() {
      this.defaultFontSize = Math.max(this.minFontSize, Number(this.defaultFontSize || 120) - this.fontSizeStep)
      this.updateDefaultFontSize()
    },
    setMushafBackground(value) {
      if (!this.mushafBackgroundOptions.some(option => option.value === value)) return
      this.mushafBackground = value
      this.persistUiState()
    },
    runGuidedAction(verse) {
      // Single visible flow: Learn -> Practice -> Recall -> Continue
      if (!this.hasVerses) {
        this.startSession()
        return
      }
      if (this.guidedUiStep === 'learn') {
        this.flowStep = 'learn'
        this.flowListenPlays = 0
        this.playVerse(verse)
        this.persistUiState()
        return
      }
      if (this.guidedUiStep === 'practice') {
        this.flowStep = 'recall'
        this.persistUiState()
        if (this.audioElement) {
          try { this.audioElement.pause() } catch { }
        }
        this.isPlaying = false
        return
      }
      this.flowStep = 'learn'
      this.flowListenPlays = 0
      this.persistUiState()
      this.next()
    },
    setModeAndExplain(mode) {
      this.currentMode = mode

      const store = this.getModeStore(mode)
      const isFreshMode = !store.chapterId && !store.verses?.length

      this.applySessionConfig(this.buildSessionConfig(mode))
      this.syncActiveVerseState(mode)
      this.openToolsPanel({ mode })
    },

    startNewSetup(mode) {
      this.setModeAndExplain(mode)
      this.showTools = true
    },
    cloneModeState(modeState) {
      return deepClone(modeState)
    },

    getModeStore(mode = this.currentMode) {
      return mode === 'beginner' ? this.beginner : this.advanced
    },

    getConfigFingerprint(config = {}) {
      return JSON.stringify({
        chapterId: Number(config.chapterId || 0),
        rangeStart: Number(config.rangeStart || 1),
        rangeEnd: Number(config.rangeEnd || config.rangeStart || 1),
        reciterId: typeof config.reciterId === 'string' && config.reciterId
          ? config.reciterId
          : DEFAULT_ALQURAN_RECITER,
        showWordByWord: !!config.showWordByWord,
        tajweedEnabled: !!this.tajweedEnabled  // Add this line
      })
    },

    modeDataMatchesConfig(mode = this.currentMode, config = null) {
      const store = this.getModeStore(mode)
      if (!store?.verses?.length || !store.loadedConfig) return false
      const targetConfig = config || this.buildSessionConfig(mode)
      return this.getConfigFingerprint(store.loadedConfig) === this.getConfigFingerprint(targetConfig)
    },

    getVerseCacheKey(mode = this.currentMode, config = null) {
      const targetConfig = config || this.buildSessionConfig(mode)
      return `${mode}:${this.getConfigFingerprint(targetConfig)}`
    },

    getCachedVerses(mode = this.currentMode, config = null) {
      const key = this.getVerseCacheKey(mode, config)
      const memoryHit = this.verseDataCache[key]
      if (memoryHit) return this.cloneModeState(memoryHit)
      try {
        const raw = localStorage.getItem(`telawa.verseCache.${key}`)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const ts = Number(parsed?.ts || 0)
        if (ts && Date.now() - ts > 6 * 60 * 60 * 1000) return null
        this.verseDataCache[key] = parsed
        return this.cloneModeState(parsed)
      } catch (e) {
        return null
      }
    },

    setCachedVerses(mode = this.currentMode, config = null, payload = null) {
      if (!payload) return
      const key = this.getVerseCacheKey(mode, config)
      const wrapped = { ...payload, ts: Date.now() }
      this.verseDataCache[key] = this.cloneModeState(wrapped)
      try {
        localStorage.setItem(`telawa.verseCache.${key}`, JSON.stringify(wrapped))
      } catch (e) { }
    },

    scheduleLoadVerses(mode = this.currentMode) {
      if (this.loadVersesTimer) clearTimeout(this.loadVersesTimer)
      this.loadVersesTimer = setTimeout(() => {
        this.loadVerses(mode)
      }, 200)
    },

    syncWorkspaceFromControls(options = {}) {
      if (this.isBootstrapping) return
      const mode = options.mode || this.currentMode
      const store = this.getModeStore(mode)
      const chapterId = Number(store?.chapterId || 0)

      if (this.workspaceSyncTimer) clearTimeout(this.workspaceSyncTimer)
      this.persistUiState()

      if (!chapterId) {
        this.currentChapter = null
        this.clearWorkspaceForConfigChange(mode)
        this.isDataReady = true
        return
      }

      const matchedChapter = this.chapters.find(chapter => Number(chapter.id) === chapterId) || null
      this.currentChapter = matchedChapter || (this.chapters.length ? null : this.currentChapter)
      this.clampControlRange(mode)
      this.clearWorkspaceForConfigChange(mode)

      if (options.immediate) {
        this.loadVerses(mode)
        return
      }

      this.workspaceSyncTimer = setTimeout(() => {
        this.loadVerses(mode)
      }, 160)
    },

    async applyWorkspaceControls(options = {}) {
      if (this.isBootstrapping) return
      const mode = options.mode || this.currentMode
      if (this.workspaceSyncTimer) clearTimeout(this.workspaceSyncTimer)
      this.persistUiState()
      this.syncWorkspaceFromControls({ ...options, mode, immediate: true })
      await this.$nextTick()
    },

    clampControlRange(mode = this.currentMode) {
      const store = this.getModeStore(mode)
      const max = this.currentChapter?.verses_count || 286
      store.rangeStart = Math.max(1, Math.min(Number(store.rangeStart || 1), max))
      store.rangeEnd = Math.max(store.rangeStart, Math.min(Number(store.rangeEnd || store.rangeStart || 1), max))
    },

    clearWorkspaceForConfigChange(mode = this.currentMode) {
      const store = this.getModeStore(mode)
      if (!store) return
      this.stopWordHighlighting()
      if (this.audioElement) {
        try { this.audioElement.pause() } catch { }
      }
      this.isPlaying = false
      this.currentTime = 0
      store.verses = []
      store.queue = []
      store.queueIndex = 0
      store.activeKey = null
      store.loadedConfig = null
      if (mode === this.currentMode) {
        this.activeVerseKey = null
        this.activeKey = null
        this.queueIndex = 0
        this.isDataReady = false
      }
    },

    setActiveVerse(verseKey, options = {}) {
      if (!verseKey) return null
      const mode = options.mode || this.currentMode
      const store = this.getModeStore(mode)
      const queue = Array.isArray(store.queue) ? store.queue : []
      const requestedQueueIndex = Number.isFinite(options.queueIndex) ? Number(options.queueIndex) : null

      store.activeKey = verseKey
      if (requestedQueueIndex !== null) {
        store.queueIndex = requestedQueueIndex
      } else {
        const foundQueueIndex = queue.findIndex(item => (item?.verse?.key || item?.key) === verseKey)
        if (foundQueueIndex >= 0) store.queueIndex = foundQueueIndex
      }

      if (mode === this.currentMode) {
        this.activeKey = verseKey
        this.activeVerseKey = verseKey
        this.queueIndex = store.queueIndex || 0
      }

      if (options.scroll !== false) {
        this.$nextTick(() => {
          const el = document.querySelector(`.verse-card[data-verse-key="${verseKey}"], .mushaf-ayah[data-verse-key="${verseKey}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }

      return verseKey
    },

    syncActiveVerseState(mode = this.currentMode, requestedKey = null) {
      const store = this.getModeStore(mode)
      const verses = Array.isArray(store?.verses) ? store.verses : []
      const queue = Array.isArray(store?.queue) ? store.queue : []

      if (!verses.length) {
        store.activeKey = null
        store.queueIndex = 0
        if (mode === this.currentMode) {
          this.activeKey = null
          this.activeVerseKey = null
          this.queueIndex = 0
        }
        return null
      }

      let resolvedKey = requestedKey || store.activeKey || (queue[store.queueIndex]?.verse?.key || queue[store.queueIndex]?.key) || verses[0]?.key
      if (!verses.some(verse => verse.key === resolvedKey)) {
        resolvedKey = verses[0].key
      }

      const storedQueueIndex = Math.max(0, Math.min(Number(store.queueIndex || 0), Math.max(queue.length - 1, 0)))
      const storedQueueKey = queue[storedQueueIndex]?.verse?.key || queue[storedQueueIndex]?.key
      let resolvedQueueIndex = storedQueueKey === resolvedKey
        ? storedQueueIndex
        : queue.findIndex(item => (item?.verse?.key || item?.key) === resolvedKey)
      if (resolvedQueueIndex < 0) {
        resolvedQueueIndex = storedQueueIndex
        resolvedKey = queue[resolvedQueueIndex]?.verse?.key || queue[resolvedQueueIndex]?.key || resolvedKey
      }

      return this.setActiveVerse(resolvedKey, { mode, queueIndex: resolvedQueueIndex, scroll: false })
    },

    buildSessionConfig(mode = this.currentMode) {
      const config = mode === 'beginner' ? this.beginner : this.advanced
      return this.cloneModeState({
        ...config,
        mode,
        repetitionsPerStep: Math.max(1, Math.min(50, Number(this.repetitionsPerStep || 1))),
        selectedLoopCount: this.selectedLoopCount,
        gapBetweenVerses: this.gapBetweenVerses,
        customGapSeconds: Math.max(0.5, Math.min(10, Number(this.customGapSeconds || 2))),
        tajweedEnabled: this.tajweedEnabled,
        quranFont: this.quranFont,
        fontScale: this.fontScale,
        script: this.script,
        showTranslation: this.showTranslation,
        showTransliteration: this.showTransliteration,
        showWordByWord: this.showWordByWord,
        wordByWordAudioEnabled: this.wordByWordAudioEnabled,
        focusModeEnabled: this.focusModeEnabled,
        focusDimPercent: Math.max(30, Math.min(75, Number(this.focusDimPercent || 54))),
        blurModeEnabled: this.blurModeEnabled,
        blurIntensity: this.blurIntensity,
        anchorModeEnabled: this.anchorModeEnabled,
        anchorCount: this.anchorCount,
        chainingEnabled: this.chainingEnabled,
        chainingMethod: this.chainingMethod,
        chainingRepetitions: this.chainingRepetitions,
        theme: this.theme
      })
    },

    applySessionConfig(config) {
      if (!config) return
      const mode = config.mode || this.currentMode
      this.currentMode = mode
      this.tab = 'tools'
      this.chapterId = Number(config.chapterId || 0)
      this.rangeStart = Number(config.rangeStart || 1)
      this.rangeEnd = Number(config.rangeEnd || this.rangeStart || 1)
      this.reciterId = typeof config.reciterId === 'string' && config.reciterId
        ? config.reciterId
        : DEFAULT_ALQURAN_RECITER
      this.speed = Number(config.speed || 1)
      const parsedDelay = Number(config.delay)
      this.delay = Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 2
      this.playMode = config.playMode || 'auto'
      this.order = 'seq'
      this.repetitionsPerStep = Math.max(1, Math.min(50, Number(config.repetitionsPerStep || this.repetitionsPerStep || 5)))
      this.selectedLoopCount = config.selectedLoopCount === 'infinite'
        ? 'infinite'
        : Math.max(1, Math.min(50, Number(config.selectedLoopCount || this.selectedLoopCount || this.repetitionsPerStep || 5)))
      this.gapBetweenVerses = ['none', '1x', '3s', '5s', 'custom'].includes(config.gapBetweenVerses)
        ? config.gapBetweenVerses
        : this.gapBetweenVerses
      this.customGapSeconds = Math.max(0.5, Math.min(10, Number(config.customGapSeconds || this.customGapSeconds || 2)))
      this.chainingEnabled = config.chainingEnabled ?? this.chainingEnabled
      this.chainingMethod = ['linking', 'cumulative'].includes(config.chainingMethod)
        ? config.chainingMethod
        : this.chainingMethod
      this.chainingRepetitions = Math.max(1, Math.min(5, Number(config.chainingRepetitions || this.chainingRepetitions || 1)))
      this.tajweedEnabled = !!config.tajweedEnabled
      this.quranFont = config.quranFont || this.quranFont
      this.fontScale = Number(config.fontScale || 1)
      this.script = config.script || this.script
      this.showTranslation = config.showTranslation ?? this.showTranslation
      this.showTransliteration = config.showTransliteration ?? this.showTransliteration
      this.showWordByWord = config.showWordByWord ?? this.showWordByWord
      this.wordByWordAudioEnabled = config.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
      this.focusModeEnabled = !!config.focusModeEnabled
      this.focusDimPercent = Math.max(30, Math.min(75, Number(config.focusDimPercent || this.focusDimPercent || 54)))
      this.blurModeEnabled = !!config.blurModeEnabled
      this.blurIntensity = Math.max(4, Math.min(18, Number(config.blurIntensity || this.blurIntensity || 10)))
      this.anchorModeEnabled = !!config.anchorModeEnabled
      this.anchorCount = Math.max(1, Math.min(3, Number(config.anchorCount || this.anchorCount || 2)))
      this.theme = config.theme || this.theme
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    loadModeState(mode) {
      const defaults = mode === 'beginner' ? createBeginnerState() : createAdvancedState()
      try {
        const raw = localStorage.getItem(MODE_STORAGE_KEYS[mode])
        if (!raw) return this.cloneModeState(defaults)

        const merged = { ...defaults, ...this.cloneModeState(JSON.parse(raw)) }

        if (typeof merged.reciterId !== 'string' || !merged.reciterId) {
          merged.reciterId = DEFAULT_ALQURAN_RECITER
        }

        if (mode === 'advanced') {
          if (merged.order === 'rand') merged.order = 'seq'
          if (merged.order === 'cum') merged.order = 'seq'
          if (merged.order === 'spaced') merged.order = 'seq'
        }

        return merged
      } catch (e) {
        console.error(`Failed to load ${mode} mode state:`, e)
        return this.cloneModeState(defaults)
      }
    },

    persistSessionState() {
      if (this.isBootstrapping) return
      const mode = this.currentMode
      try {
        localStorage.setItem(SESSION_STORAGE_KEYS[mode], JSON.stringify({
          activeKey: this.activeKey,
          activeVerseKey: this.activeVerseKey,
          queueIndex: this.queueIndex,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.error('Failed to persist session state:', e)
      }
    },
    isEditableElement(target) {
      if (!target) return false
      const tag = target.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
    },

    handleGlobalKeydown(event) {
      if (!this.appReady || this.isEditableElement(event.target)) return

      if (event.key === 'Escape') {
        this.blurPeekHoldingSpace = false
        this.clearTouchPeek()
        this.hoverPeekVerseKey = null
        if (this.showSelfCheckModal) {
          event.preventDefault()
          this.closeSelfCheckModal()
          return
        }
        if (this.showRecordingsLibrary) {
          event.preventDefault()
          this.closeRecordingsLibrary()
          return
        }
        if (this.showTools) {
          event.preventDefault()
          this.closeToolsPanel()
          return
        }
        if (this.showConfirmModal) {
          event.preventDefault()
          this.closeConfirmModal()
          return
        }
        if (this.showSessionExitModal) {
          event.preventDefault()
          this.closeSessionExitModal()
          return
        }
        if (this.showPlannerModal) {
          event.preventDefault()
          this.showPlannerModal = false
          return
        }
      }

      if (event.key === ' ' || event.code === 'Space') {
        if (this.blurModeEnabled) {
          event.preventDefault()
          this.blurPeekHoldingSpace = true
          return
        }
        event.preventDefault()
        if (this.audioElement?.src) this.togglePlay()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (this.plannerKeyboardActive) {
          this.submitPlanner()
          return
        }
        const verse = this.verses[this.activeVerseIndex >= 0 ? this.activeVerseIndex : 0]
        if (verse) this.playVerse(verse)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.navigateKeyboard(1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.navigateKeyboard(-1)
        return
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'j') {
        event.preventDefault()
        this.next()
        return
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'k') {
        event.preventDefault()
        this.prev()
        return
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        this.playCurrentVerse()
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        this.jumpToVerseIndex(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        this.jumpToVerseIndex(this.verses.length - 1)
        return
      }

      // Add inside handleGlobalKeydown after the existing shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (this.hasVerses) {
          this.saveCurrentSession()
          this.showBanner('Session saved with Ctrl+S', 'success', 1500)
        }
        return
      }
    },
    handleGlobalKeyup(event) {
      if (event.key === ' ' || event.code === 'Space') {
        this.blurPeekHoldingSpace = false
      }
    },

    navigateKeyboard(direction) {
      if (this.plannerKeyboardActive) {
        const nextValue = Math.max(1, Math.min(this.plannerConfig.totalVersesInSurah || 286, (this.plannerConfig.versesPerDay || 1) + direction))
        this.plannerConfig.versesPerDay = nextValue
        this.validateVersesPerDay()
        return
      }

      const collection = this.verses
      if (!collection.length) return

      let nextIndex = this.activeVerseIndex
      if (nextIndex < 0) nextIndex = 0
      else nextIndex = Math.max(0, Math.min(collection.length - 1, nextIndex + direction))

      const verse = this.verses[nextIndex]
      if (!verse) return
      this.setActiveVerse(verse.key)
    },
    jumpToVerseIndex(index) {
      const collection = this.verses
      if (!collection.length) return
      const targetIndex = Math.max(0, Math.min(collection.length - 1, Number(index || 0)))
      const verse = collection[targetIndex]
      if (!verse) return
      this.setActiveVerse(verse.key)
    },

    handleWindowScroll() {
      const current = window.scrollY || 0
      this.playerCollapsed = current > this.lastScrollY && current > 120
      this.lastScrollY = current
    },

    buildContinueSessionPayload() {
      const mutqinSession = this.mutqinState?.sessionState || {}
      const mutqinIndex = Math.max(0, Number(mutqinSession.current_index || 0))
      const mutqinItem = mutqinSession.queue?.[mutqinIndex]
      const verse = mutqinItem?.ayahId || this.verses[this.activeVerseIndex >= 0 ? this.activeVerseIndex : this.queueIndex]?.key || this.activeVerseKey
      const source = this.currentMode === 'beginner' ? this.beginner : this.advanced
      return {
        timestamp: Date.now(),
        mode: this.currentMode,
        tab: this.tab,
        activeKey: verse || null,
        activeVerseKey: mutqinItem?.ayahId || this.activeVerseKey || null,
        queueIndex: this.queueIndex || 0,
        mutqinSessionIndex: mutqinIndex,
        mutqinPhase: mutqinItem?.phase || mutqinSession.phase || 'Takrar',
        currentTime: this.currentTime || 0,
        duration: this.duration || 0,
        isPlaying: !!this.isPlaying,
        playerVisible: !!this.playerVisible,
        audioSrc: this.audioElement?.currentSrc || '',
        config: this.cloneModeState(source)
      }
    },

    persistContinueSession() {
      if (this.isBootstrapping) return
      try {
        localStorage.setItem('telawa.continueSession', JSON.stringify(this.buildContinueSessionPayload()))
      } catch (e) { console.error(e) }
    },

    loadContinueSessionPrompt() {
      try {
        const raw = localStorage.getItem('telawa.continueSession')
        const mutqinSession = this.mutqinState?.sessionState
        if (mutqinSession?.active && mutqinSession?.config?.chapterId) {
          const activeItem = mutqinSession.queue?.[mutqinSession.current_index || 0]
          const restoredQueueIndex = Math.max(0, Number(mutqinSession.current_index || 0) - 1)
          this.continueSessionPayload = {
            timestamp: mutqinSession.updated_at ? Date.parse(mutqinSession.updated_at) : Date.now(),
            mode: mutqinSession.mode || 'beginner',
            tab: mutqinSession.mode || 'beginner',
            activeKey: activeItem?.ayahId || null,
            activeVerseKey: activeItem?.ayahId || null,
            queueIndex: restoredQueueIndex,
            mutqinSessionIndex: Number(mutqinSession.current_index || 0),
            mutqinPhase: activeItem?.phase || mutqinSession.phase || 'Takrar',
            config: mutqinSession.config
          }
          this.hasContinueSession = true
          const chapterName = this.chapters.find(c => Number(c.id) === Number(mutqinSession.config.chapterId))?.name_simple || 'Saved session'
          this.continueSessionLabel = `${chapterName} · Ayahs ${mutqinSession.config.rangeStart}-${mutqinSession.config.rangeEnd}`
          return
        }
        if (!raw) return
        const payload = JSON.parse(raw)
        if (!payload?.config?.chapterId) return
        this.continueSessionPayload = payload
        this.hasContinueSession = true
        const chapterName = this.chapters.find(c => Number(c.id) === Number(payload.config.chapterId))?.name_simple || 'Saved session'
        this.continueSessionLabel = `${chapterName} · Ayahs ${payload.config.rangeStart}-${payload.config.rangeEnd}`
      } catch (e) { console.error(e) }
    },

    async continueLastSession() {
      const payload = this.continueSessionPayload
      if (!payload) return
      this.hasContinueSession = false
      if (!payload.config?.chapterId) {
        this.clearContinueSession()
        return
      }
      await this.hydrateSessionFromPayload(payload, { bannerText: 'Session restored' })
      this.$nextTick(() => {
        if (this.effectiveActiveVerseKey) {
          const el = document.querySelector(`.verse-card[data-verse-key="${this.effectiveActiveVerseKey}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    },

    restoreAudioState() {
      try {
        this.restoredAudioState = JSON.parse(localStorage.getItem('telawa.audioState') || 'null')
      } catch (e) { console.error(e) }
    },

    applyRestoredAudioState() {
      const state = this.restoredAudioState
      if (!state || !this.audioElement || !state.src) return
      const activeAudio = this.activeVerseRef?.audio ? this.normalizeAudioUrl(this.activeVerseRef.audio) : ''
      const restoredAudio = this.normalizeAudioUrl(state.src)
      if (activeAudio && restoredAudio && activeAudio !== restoredAudio) return
      this.audioElement.src = state.src
      this.audioElement.load()
      this.playerVisible = !!state.playerVisible
      this.currentTime = Number(state.currentTime || 0)
      this.speed = Number(state.speed || this.speed || 1)
      const seekOnLoad = () => {
        try {
          this.audioElement.currentTime = Number(state.currentTime || 0)
          this.audioElement.playbackRate = Number(state.speed || this.speed || 1)
          if (state.isPlaying) {
            this.audioElement.play().then(() => {
              this.isPlaying = true
            }).catch(() => { })
          }
        } catch (e) { }
        this.audioElement.removeEventListener('loadedmetadata', seekOnLoad)
      }
      this.audioElement.addEventListener('loadedmetadata', seekOnLoad)
    },

    buildSessionExitSnapshot() {
      return {
        mode: this.currentMode,
        tab: this.tab,
        activeVerseKey: this.effectiveActiveVerseKey || this.activeVerseKey || null,
        activeKey: this.activeKey || null,
        queueIndex: Math.max(0, Number(this.queueIndex || 0)),
        playerVisible: !!this.playerVisible,
        isPlaying: !!this.isPlaying,
        currentTime: Number(this.audioElement?.currentTime || this.currentTime || 0),
        speed: Number(this.speed || 1),
        audioSrc: this.audioElement?.currentSrc || '',
        blurModeEnabled: !!this.blurModeEnabled,
        blurIntensity: Number(this.blurIntensity || 10),
        blurPeekHoldingSpace: !!this.blurPeekHoldingSpace,
        hoverPeekVerseKey: this.hoverPeekVerseKey || null,
        touchPeekVerseKey: this.touchPeekVerseKey || null
      }
    },

    openSessionExitModal() {
      if (!this.hasVerses && !this.playerVisible) return
      this.flushPlaybackTime()
      this.sessionExitSnapshot = this.buildSessionExitSnapshot()
      this.sessionExitAutoSave = true
      this.showTools = false
      this.showConfirmModal = false
      this.showResumeModal = false
      this.showSessionExitModal = true
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
      }
      this.isPlaying = false
    },

    restoreSessionExitSnapshot() {
      const snapshot = this.sessionExitSnapshot
      if (!snapshot) return

      this.currentMode = snapshot.mode || this.currentMode
      this.tab = snapshot.tab || this.tab
      this.blurModeEnabled = !!snapshot.blurModeEnabled
      this.blurIntensity = Number(snapshot.blurIntensity || this.blurIntensity || 10)
      this.blurPeekHoldingSpace = !!snapshot.blurPeekHoldingSpace
      this.hoverPeekVerseKey = snapshot.hoverPeekVerseKey || null
      this.touchPeekVerseKey = snapshot.touchPeekVerseKey || null

      if (snapshot.activeVerseKey) {
        this.setActiveVerse(snapshot.activeVerseKey, {
          mode: snapshot.mode || this.currentMode,
          queueIndex: Number(snapshot.queueIndex || 0),
          scroll: false
        })
      }

      this.playerVisible = !!snapshot.playerVisible
      this.currentTime = Number(snapshot.currentTime || 0)
      this.speed = Number(snapshot.speed || this.speed || 1)
      this.restoredAudioState = {
        src: snapshot.audioSrc || '',
        currentTime: Number(snapshot.currentTime || 0),
        playerVisible: !!snapshot.playerVisible,
        speed: Number(snapshot.speed || this.speed || 1),
        isPlaying: !!snapshot.isPlaying
      }
      this.$nextTick(() => {
        this.applyRestoredAudioState()
      })
    },

    closeSessionExitModal(options = {}) {
      const { restore = true } = options
      this.showSessionExitModal = false
      if (restore) {
        this.restoreSessionExitSnapshot()
      } else {
        this.sessionExitSnapshot = null
      }
    },

    clearExitSessionStorage() {
      try {
        localStorage.removeItem('telawa.continueSession')
        localStorage.removeItem('telawa.audioState')
      } catch (error) {
        console.error('Failed to clear exit-session storage:', error)
      }
      this.hasContinueSession = false
      this.continueSessionPayload = null
      this.continueSessionLabel = ''
    },

    finishSessionCleanup() {
      this.closePlayer()
      this.clearTouchPeek()
      this.blurPeekHoldingSpace = false
      this.hoverPeekVerseKey = null
      this.touchPeekVerseKey = null
      this.stopWordHighlighting()

      const store = this.getModeStore(this.currentMode)
      const firstKey = this.verses[0]?.key || null
      store.queue = []
      store.queueIndex = 0
      store.activeKey = firstKey
      store.sessionActive = false

      this.queue = []
      this.queueIndex = 0
      this.activeVerseKey = null
      this.activeKey = firstKey
      this.playerVisible = false
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.sessionStartedAt = 0
      this.sessionCompleted = true
      this.sessionCompletedAt = this.sessionCompletedAt || new Date().toISOString()

      if (this.mutqinState?.sessionState) {
        this.mutqinState.sessionState.active = false
        this.mutqinState.sessionState.queue = []
        this.mutqinState.sessionState.current_index = 0
        this.mutqinState.sessionState.completed = true
        this.mutqinState.sessionState.completed_at = this.sessionCompletedAt
      }

      this.clearExitSessionStorage()
      this.persistModeState(this.currentMode)
      this.persistUiState()
      this.persistCentralSessionState()
    },

    exitSessionAnyway() {
      this.closeSessionExitModal({ restore: false })
      this.finishSessionCleanup()
      this.showBanner('Session ended. You can start again from the current setup.', 'info', 2200)
    },

    confirmSessionExit() {
      const recapAyah = Math.max(1, Number(this.currentPosition || 1))
      const recapTotal = Math.max(1, Number(this.totalVerses || 1))
      let savedName = ''
      if (this.sessionExitAutoSave) {
        const savedSession = this.saveCurrentSessionSilently()
        savedName = savedSession?.name || ''
      }
      this.closeSessionExitModal({ restore: false })
      this.finishSessionCleanup()
      const recap = savedName
        ? `Session ended. Auto-saved as "${savedName}".`
        : `Session ended at ayah ${recapAyah}/${recapTotal}.`
      this.showBanner(recap, 'success', 2600)
    },

    openConfirmModal(options) {
      this.confirmModal = {
        title: options.title || 'Confirm action',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'default',
        action: options.action || '',
        data: options.data || null
      }
      this.showPlannerModal = false
      this.showResumeModal = false
      this.showTools = false
      this.showConfirmModal = true
    },

    closeConfirmModal() {
      this.showConfirmModal = false
      this.confirmModal.action = ''
      this.confirmModal.data = null
      this.pendingDeleteId = ''
    },

    runConfirmAction() {
      const action = this.confirmModal.action
      const actionData = this.confirmModal.data
      this.closeConfirmModal()
      if (action === 'reset-session') this.performResetControls()
      if (action === 'switch-mode') this.performToggleMode()
      if (action === 'delete-offline' && this.pendingDeleteId) this.performDeleteOffline()
      if (action === 'discard-continue') this.clearContinueSession()
      if (action === 'delete-saved-session' && actionData?.sessionId) this.performDeleteSavedSession(actionData.sessionId)
    },

    confirmDiscardContinueSession() {
      this.openConfirmModal({
        title: 'Discard saved session?',
        message: 'This removes the current continue-where-you-left-off snapshot from this device.',
        confirmLabel: 'Discard',
        tone: 'danger',
        action: 'discard-continue'
      })
    },

    clearContinueSession() {
      this.hasContinueSession = false
      this.continueSessionPayload = null
      this.continueSessionLabel = ''
      try {
        localStorage.removeItem('telawa.continueSession')
      } catch (e) { console.error(e) }
      this.showBanner('Saved session dismissed', 'info', 1800)
    },

    renderMiniTrend(values = []) {
      const width = 84
      const height = 24
      const max = Math.max(...values, 1)
      const barWidth = 8
      const gap = 4
      return values.map((value, index) => {
        const x = index * (barWidth + gap)
        const h = Math.max(3, (value / max) * height)
        const y = height - h
        return `<span style="left:${x}px;height:${h}px;top:${y}px"></span>`
      }).join('')
    },

    updateMasteredWeekly() {
      // Device-local lightweight weekly delta tracker for the "Mastered" metric.
      const today = new Date()
      const dayKey = today.toISOString().slice(0, 10)
      let state = null
      try { state = JSON.parse(localStorage.getItem('telawa.masteredWeekly') || 'null') } catch { state = null }
      if (!state || !Array.isArray(state.series) || state.series.length !== 7) {
        state = { dayKey, lastTotal: Number(this.analytics.versesMastered || 0), series: [0, 0, 0, 0, 0, 0, 0] }
      }
      if (state.dayKey !== dayKey) {
        state.series.shift()
        state.series.push(0)
        state.dayKey = dayKey
        state.lastTotal = Number(this.analytics.versesMastered || 0)
      }
      const current = Number(this.analytics.versesMastered || 0)
      const delta = Math.max(0, current - Number(state.lastTotal || 0))
      if (delta > 0) {
        state.series[state.series.length - 1] += delta
        state.lastTotal = current
      }
      try { localStorage.setItem('telawa.masteredWeekly', JSON.stringify(state)) } catch { }
    },

    setPlaybackSpeed(newSpeed) {
      const safeSpeed = this.speedOptions.includes(Number(newSpeed)) ? Number(newSpeed) : 1
      const currentTime = Number(this.audioElement?.currentTime || this.currentTime || 0)
      this.speed = safeSpeed
      if (this.audioElement) {
        this.audioElement.playbackRate = safeSpeed
        if (Number.isFinite(currentTime)) this.audioElement.currentTime = currentTime
      }
      this.currentTime = currentTime
      this.centralSession.audio.speed = safeSpeed
      this.centralSession.audio.currentTime = currentTime
      if (this.wordByWordAudioEnabled && this.activeVerseRef) {
        this.syncWordHighlightFromAudio(this.activeVerseRef)
        if (this.isPlaying) this.queueWordHighlightFrame(this.activeVerseRef)
      }
      this.persistUiState()
      this.persistCentralSessionState()
      this.showBanner(`Speed changed to ${safeSpeed}x`, 'info', 1000)
    },

    setActiveTab(tabName) {
      // Validate tab name
      const validTabs = ['tools', 'techniques', 'saved', 'stats', 'settings']
      if (!validTabs.includes(tabName)) {
        console.warn(`Invalid tab: ${tabName}, defaulting to tools`)
        this.tab = 'tools'
      } else {
        this.tab = tabName
      }

      // Force re-render if needed
      if (this.tab === 'settings') {
        this.syncSettingsDraft()
      }
      if (this.tab === 'saved') {
        this.loadSavedSessions()
        this.loadRecordingsLibrary()
      }
      if (this.tab === 'stats') {
        this.loadSavedSessions()
        if (!this.selectedStatsSessionId && this.savedSessions[0]?.id) {
          this.selectedStatsSessionId = this.savedSessions[0].id
        }
      }

      // Store and persist
      this.centralSession.activeTab = this.tab
      this.persistCentralSessionState()
      
      // Force Vue to update
      this.$forceUpdate()
      
      // Scroll to top of panel content
      this.$nextTick(() => {
        const panelBody = this.$refs.toolsBody
        if (panelBody) {
          panelBody.scrollTop = 0
        }
      })
    },

    scrollToWorkspaceMain() {
      const target = this.$refs.workspaceMain || document.getElementById('memorisationWorkspaceMain')
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },

    loadCentralSessionState() {
      try {
        const raw = localStorage.getItem(CENTRAL_SESSION_STORAGE_KEY)
        if (!raw) return
        const saved = JSON.parse(raw)
        let uiChaining = null
        try {
          const uiState = JSON.parse(localStorage.getItem('telawa.uiState') || 'null')
          if (uiState && ['linking', 'cumulative'].includes(uiState.chainingMethod)) {
            uiChaining = {
              enabled: uiState.chainingEnabled ?? this.chainingEnabled,
              method: uiState.chainingMethod,
              repetitions: Math.max(1, Math.min(5, Number(uiState.chainingRepetitions || this.chainingRepetitions || 1)))
            }
          }
        } catch { }
        this.centralSession = {
          ...createCentralSessionState(),
          ...saved,
          chaining: {
            ...createCentralSessionState().chaining,
            ...(saved.chaining || {}),
            ...(uiChaining || {})
          },
          audio: {
            ...createCentralSessionState().audio,
            ...(saved.audio || {})
          }
        }
        // Update to include 'techniques' as valid tab
        this.tab = ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(this.centralSession.activeTab)
          ? this.centralSession.activeTab
          : 'tools'
        this.tajweedEnabled = !!this.centralSession.tajweedEnabled
        this.focusModeEnabled = !!this.centralSession.focusModeEnabled
        this.blurModeEnabled = !!this.centralSession.blurModeEnabled
        this.blurIntensity = Math.max(4, Math.min(18, Number(this.centralSession.blurIntensity || 10)))
        this.anchorModeEnabled = !!this.centralSession.anchorModeEnabled
        this.anchorCount = Math.max(1, Math.min(2, Number(this.centralSession.anchorCount || 2)))
        if (!uiChaining) {
          this.chainingEnabled = !!this.centralSession.chaining.enabled
          this.chainingMethod = ['linking', 'cumulative'].includes(this.centralSession.chaining.method) ? this.centralSession.chaining.method : 'linking'
          this.chainingRepetitions = Math.max(1, Math.min(5, Number(this.centralSession.chaining.repetitions || 1)))
        }
        this.speed = this.speedOptions.includes(Number(this.centralSession.audio.speed)) ? Number(this.centralSession.audio.speed) : this.speed
        this.sessionCompleted = this.centralSession.sessionStatus === 'completed'
        this.sessionCompletedAt = this.centralSession.sessionCompletedAt || null
      } catch (e) {
        console.error('Failed to load central session state:', e)
      }
    },

    persistCentralSessionState() {
      if (this.isBootstrapping) return
      try {
        this.centralSession = {
          ...this.centralSession,
          // Update to include 'techniques' as valid tab
          activeTab: ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(this.tab) ? this.tab : 'tools',
          sessionStatus: this.sessionCompleted ? 'completed' : (this.centralSession.sessionStatus || 'idle'),
          sessionCompletedAt: this.sessionCompletedAt || this.centralSession.sessionCompletedAt || null,
          tajweedEnabled: !!this.tajweedEnabled,
          focusModeEnabled: !!this.focusModeEnabled,
          blurModeEnabled: !!this.blurModeEnabled,
          blurIntensity: Number(this.blurIntensity || 10),
          anchorModeEnabled: !!this.anchorModeEnabled,
          anchorCount: Math.max(1, Math.min(2, Number(this.anchorCount || 2))),
          chaining: {
            ...this.centralSession.chaining,
            enabled: !!this.chainingEnabled,
            method: this.chainingMethod,
            repetitions: Math.max(1, Math.min(5, Number(this.chainingRepetitions || 1))),
            index: Math.max(0, Number(this.queueIndex || 0))
          },
          audio: {
            speed: Number(this.speed || 1),
            currentTime: Number(this.audioElement?.currentTime || this.currentTime || 0)
          }
        }
        localStorage.setItem(CENTRAL_SESSION_STORAGE_KEY, JSON.stringify(this.centralSession))
      } catch (e) {
        console.error('Failed to persist central session state:', e)
      }
    },
    // Open mode settings in offcanvas
    openModeSettings() {
      this.openToolsPanel()
    },

    // Alternative: Direct mode toggle with confirmation
    toggleTajweed() {
      this.tajweedEnabled = !this.tajweedEnabled

      this.persistUiState()
      this.persistCentralSessionState()

      // Force re-render
      this.$forceUpdate()

      this.showBanner(
        this.tajweedEnabled ? 'Tajweed colors enabled' : 'Tajweed colors disabled',
        'info',
        1500
      )
    },
    cycleQuranFontPill() {
      const options = this.quranFontOptions || []
      if (!options.length) return
      const currentIndex = Math.max(0, options.findIndex(f => f.value === this.quranFont))
      const next = options[(currentIndex + 1) % options.length]
      this.selectFont(next.value)
    },

    performToggleMode() {
      const newMode = this.currentMode === 'beginner' ? 'advanced' : 'beginner'
      this.currentMode = newMode
      this.tab = 'tools'
      this.persistUiState()
      this.showBanner(`Switched to ${newMode === 'beginner' ? 'Beginner' : 'Advanced'} Mode`, 'success', 2000)
    },
    updateTabAndSync(tabName) {
      this.currentMode = tabName === 'advanced' ? 'advanced' : 'beginner'
      this.tab = 'tools'
      this.persistUiState()
      this.$forceUpdate()
    },
    setupWordClickHandler() {
      document.addEventListener('click', (e) => {
        const wordElement = e.target.closest('.wbw-word')
        if (wordElement) {
          const verseKey = wordElement.dataset.verseKey
          const wordIndex = parseInt(wordElement.dataset.wordIndex)
          const wordAudio = wordElement.dataset.wordAudio

          if (wordAudio) {
            const verse = this.verses.find(item => item.key === verseKey)
            this.playWordAudio(wordAudio, verse, wordIndex)
            return
          }

          const verse = this.verses.find(item => item.key === verseKey)
          this.playWordAudio('', verse, wordIndex)
        }
      })
    },
    getRemainingTimeDetails() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return null

      const reviewTimePerAyah = 5
      let totalAudioSeconds = 0
      let totalReviewSeconds = 0

      remainingItems.forEach((item, index) => {
        totalAudioSeconds += this.getQueueItemAudioSeconds(item, index === 0)
        totalReviewSeconds += reviewTimePerAyah
      })

      const totalSeconds = totalAudioSeconds + totalReviewSeconds
      const minutes = Math.ceil(totalSeconds / 60)
      const audioMinutes = Math.ceil(totalAudioSeconds / 60)
      const reviewMinutes = Math.ceil(totalReviewSeconds / 60)

      return {
        totalMinutes: minutes,
        audioMinutes: audioMinutes,
        reviewMinutes: reviewMinutes,
        verseCount: remainingItems.length,
        repetitionCount: remainingItems.length
      }
    },

    getEtaTooltip() {
      const details = this.getRemainingTimeDetails()
      if (!details) return ''
      return `${details.audioMinutes} min audio + ${details.reviewMinutes} min review`
    },
    toggleFontDropdown() {
      this.fontDropdownOpen = !this.fontDropdownOpen
    },
    selectFont(fontValue) {
      this.quranFont = fontValue
      this.fontDropdownOpen = false
      this.persistUiState()
    },
    getCurrentFontLabel() {
      const font = this.quranFontOptions.find(f => f.value === this.quranFont)
      return font ? font.label : 'Font'
    },

    increaseTextScale(event) {
      event.stopPropagation()
      const nextScale = Math.min(1.2, Math.round((Number(this.fontScale || 1) + 0.05) * 100) / 100)
      this.fontScale = nextScale
      this.enScale = nextScale
      this.persistUiState()
      this.showBanner(`Text size: ${this.getTextScalePercent()}%`, 'info', 800)
    },

    decreaseTextScale(event) {
      event.stopPropagation()
      const nextScale = Math.max(0.9, Math.round((Number(this.fontScale || 1) - 0.05) * 100) / 100)
      this.fontScale = nextScale
      this.enScale = nextScale
      this.persistUiState()
      this.showBanner(`Text size: ${this.getTextScalePercent()}%`, 'info', 800)
    },

    getTextScalePercent() {
      return Math.round(Number(this.fontScale || 1) * 100)
    },

    getFontIcon(fontValue) {
      const font = this.quranFontOptions.find(f => f.value === fontValue)
      return font ? font.icon : 'bi-text-paragraph'
    },
    // Close dropdown when clicking outside
    handleClickOutside(event) {
      if (this.fontDropdownOpen && !event.target.closest('.font-dropdown')) {
        this.fontDropdownOpen = false
      }
    },

    adjustVersesPerDay(change) {
      const newValue = this.plannerConfig.versesPerDay + change
      if (newValue >= 1 && newValue <= this.plannerConfig.totalVersesInSurah) {
        this.plannerConfig.versesPerDay = newValue
      }
    },

    validateVersesPerDay() {
      let value = this.plannerConfig.versesPerDay
      if (isNaN(value) || value < 1) {
        this.plannerConfig.versesPerDay = 1
      } else if (value > this.plannerConfig.totalVersesInSurah) {
        this.plannerConfig.versesPerDay = this.plannerConfig.totalVersesInSurah
      }
    },

    submitPlanner() {
      if (!this.plannerConfig.surahId || this.plannerConfig.surahId === 0) {
        this.showBanner('Please select a surah', 'warning', 2000)
        return
      }

      this.chapterId = this.plannerConfig.surahId
      this.rangeStart = 1
      this.rangeEnd = Math.min(this.plannerConfig.versesPerDay, this.plannerConfig.totalVersesInSurah)
      this.showPlannerModal = false
      this.openToolsPanel({ mode: 'beginner' })
      this.loadChapter()

      this.showBanner(
        `Plan created: ${this.plannerConfig.versesPerDay} verses/day for ${this.plannerEstimatedDays} days`,
        'success',
        3000
      )
    },

    getVerseFontSize(verseKey) {
      const size = this.verseFontSizes[verseKey] || this.defaultFontSize || 120
      // Ensure size is within bounds
      return Math.max(this.minFontSize, Math.min(this.maxFontSize, size))
    },

    updateFontSize(verseKey, newSize) {
      const clampedSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, newSize))
      this.verseFontSizes = {
        ...this.verseFontSizes,
        [verseKey]: clampedSize
      }
      this.persistVerseFontSizes()
      this.$forceUpdate()
    },

    increaseVerseFont(verseKey, event) {
      event.stopPropagation()
      const currentSize = this.getVerseFontSize(verseKey)
      const newSize = Math.min(this.maxFontSize, currentSize + this.fontSizeStep)
      this.verseFontSizes = {
        ...this.verseFontSizes,
        [verseKey]: newSize
      }
      this.persistVerseFontSizes()
    },

    decreaseVerseFont(verseKey, event) {
      event.stopPropagation()
      const currentSize = this.getVerseFontSize(verseKey)
      const newSize = Math.max(this.minFontSize, currentSize - this.fontSizeStep)
      this.verseFontSizes = {
        ...this.verseFontSizes,
        [verseKey]: newSize
      }
      this.persistVerseFontSizes()
    },

    resetVerseFont(verseKey, event) {
      event.stopPropagation()
      const { [verseKey]: _, ...rest } = this.verseFontSizes
      this.verseFontSizes = rest
      this.persistVerseFontSizes()
    },

    persistVerseFontSizes() {
      try {
        localStorage.setItem('telawa.verseFontSizes', JSON.stringify(this.verseFontSizes))
      } catch (e) {
        console.error('Failed to save font sizes:', e)
      }
    },

    loadVerseFontSizes() {
      try {
        const savedSizes = localStorage.getItem('telawa.verseFontSizes')
        if (savedSizes) {
          this.verseFontSizes = JSON.parse(savedSizes)
        }
        const savedDefault = localStorage.getItem('telawa.defaultFontSize')
        if (savedDefault) {
          const parsed = Number(JSON.parse(savedDefault))
          if (Number.isFinite(parsed) && parsed > 0) {
            this.defaultFontSize = parsed
          }
        } else {
          this.defaultFontSize = 120
          localStorage.setItem('telawa.defaultFontSize', JSON.stringify(120))
        }
      } catch (e) {
        console.error('Failed to load font sizes:', e)
      }
    },

    // Helper methods
    isAdjacentVerse(verse) {
      if (!verse?.key || !this.activeVerseKey) return false
      const targetParts = this.activeVerseKey.split(':')
      const verseParts = verse.key.split(':')

      if (targetParts[0] !== verseParts[0]) return false

      const targetNumber = parseInt(targetParts[1])
      const verseNumber = parseInt(verseParts[1])

      return Math.abs(verseNumber - targetNumber) === 1
    },

    async downloadOfflineVerses() {
      if (!this.verses || !this.verses.length) {
        this.showBanner('Load a surah first before downloading', 'info', 3000)
        this.showTools = true
        return
      }

      try {
        let surahId = this.chapterId
        let surahName = this.currentChapter?.name_simple

        if (!surahId && this.verses[0]?.key) {
          surahId = parseInt(this.verses[0].key.split(':')[0])
          const found = this.chapters.find(c => c.id === surahId)
          surahName = found?.name_simple || 'Selected surah'
        }

        if (!surahId) {
          this.showBanner('Could not identify surah', 'error', 3000)
          return
        }

        const storageKey = `offline_surah_${surahId}_${this.rangeStart}_${this.rangeEnd}`
        const offlineData = {
          metadata: {
            surah: surahName,
            surahId: surahId,
            rangeStart: this.rangeStart,
            rangeEnd: this.rangeEnd,
            reciterId: this.reciterId,
            downloadedAt: new Date().toISOString(),
            totalVerses: this.verses.length
          },
          verses: this.verses
        }

        localStorage.setItem(storageKey, JSON.stringify(offlineData))

        // Update catalog
        const catalogKey = 'offline_surah_catalog'
        let catalog = []
        try {
          catalog = JSON.parse(localStorage.getItem(catalogKey) || '[]')
        } catch (e) { catalog = [] }

        const entry = {
          id: storageKey,
          surah: surahName,
          surahId: surahId,
          range: `${this.rangeStart}-${this.rangeEnd}`,
          count: this.verses.length,
          date: new Date().toLocaleDateString()
        }

        const filtered = catalog.filter(c => c.id !== storageKey)
        filtered.push(entry)
        localStorage.setItem(catalogKey, JSON.stringify(filtered))
        this.offlineSurahs = filtered

        this.showBanner(`Saved ${this.verses.length} verses from ${surahName} for offline reading.`, 'success', 3000)
      } catch (err) {
        console.error('Download failed:', err)
        this.showBanner('Failed to download verses', 'error', 3000)
      }
    },

    loadOfflineCatalog() {
      try {
        const catalog = JSON.parse(localStorage.getItem('offline_surah_catalog') || '[]')
        this.offlineSurahs = catalog
      } catch (e) {
        this.offlineSurahs = []
      }
    },

    loadOfflineSurah(entry) {
      try {
        const data = JSON.parse(localStorage.getItem(entry.id))
        if (!data) throw new Error('No data')

        // Load into current view
        if (this.currentMode === 'beginner') {
          this.beginner.chapterId = data.metadata.surahId
          this.beginner.rangeStart = data.metadata.rangeStart
          this.beginner.rangeEnd = data.metadata.rangeEnd
          this.beginner.verses = data.verses
        } else {
          this.advanced.chapterId = data.metadata.surahId
          this.advanced.rangeStart = data.metadata.rangeStart
          this.advanced.rangeEnd = data.metadata.rangeEnd
          this.advanced.verses = data.verses
        }

        this.currentChapter = this.chapters.find(c => c.id === data.metadata.surahId)
        this.showTools = false
        this.showBanner(`Loaded ${data.metadata.surah} from offline storage`, 'success', 2000)
        this.buildQueue()
      } catch (e) {
        console.error('Offline load error:', e)
        this.showBanner('Failed to load offline surah', 'error', 3000)
      }
    },

    deleteOfflineSurah(id) {
      this.pendingDeleteId = id
      this.openConfirmModal({
        title: 'Remove offline surah?',
        message: 'This deletes the saved verses from this device.',
        confirmLabel: 'Remove',
        tone: 'danger',
        action: 'delete-offline'
      })
    },

    performDeleteOffline() {
      const id = this.pendingDeleteId
      localStorage.removeItem(id)
      const catalog = this.offlineSurahs.filter(s => s.id !== id)
      localStorage.setItem('offline_surah_catalog', JSON.stringify(catalog))
      this.offlineSurahs = catalog
      this.pendingDeleteId = ''
      this.showBanner('Offline surah removed', 'info', 2000)
    },

    async downloadVerseAudio(verse) {
      const audioUrl = this.normalizeAudioUrl(verse?.audio || '')
      if (!audioUrl) {
        this.showBanner('Audio not available for this ayah', 'info', 2200)
        return
      }

      try {
        const filename = `surah-${this.chapterId}-ayah-${verse.number}.mp3`
        const downloadUrl = `/memorisation/audio-download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`
        const anchor = document.createElement('a')
        anchor.href = downloadUrl
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        this.showBanner(`Downloaded ayah ${verse.number} audio`, 'success', 1800)
      } catch (error) {
        console.error('Verse download failed:', error)
        this.showBanner('Failed to download ayah audio', 'error', 2600)
      }
    },

    getDisplayArabic(verse) {
      if (!verse?.arabic) return ''
      if (this.tajweedEnabled && verse.arabic_tajweed) return this.wrapTajweedWithWordHighlighting(verse, this.normalizeTajweedMarkup(verse.arabic_tajweed))
      if (this.wordByWordAudioEnabled || this.anchorModeEnabled) return this.splitArabicIntoWords(verse)
      return this.stripTajweedMarkup(verse.arabic)
    },

    escapeHtml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },

    buildWordTokenHtml(verse, word, idx, innerHtml) {
      const wordData = typeof word === 'string' ? { ar: word, en: '', audio: null } : (word || {})
      const isActive = this.currentHighlightedVerseKey === verse.key && this.currentWordIndex === idx
      const activeClass = isActive ? ' highlighted phrase-highlighted' : ''
      const weakClass = this.isWeakAyah(verse.key) ? ' weak-word' : ''
      const masteredClass = this.isMasteredAyah(verse.key) ? ' mastered-word' : ''
      const wordAudio = this.wordByWordAudioEnabled && wordData.audio
        ? `<button class="word-audio-btn" data-word-index="${idx}" data-word-audio="${this.escapeHtml(wordData.audio)}"><i class="bi bi-volume-up"></i></button>`
        : ''

      return `<word class="wbw-word${activeClass}${weakClass}${masteredClass}" data-word-index="${idx}" data-verse-key="${verse.key}" data-word-audio="${this.escapeHtml(wordData.audio || '')}">${innerHtml}${wordAudio}</word>`
    },

    wrapHtmlWithElement(node, innerHtml) {
      const clone = node.cloneNode(false)
      clone.innerHTML = innerHtml
      return clone.outerHTML
    },

    extractTajweedCharUnits(node) {
      if (!node) return []

      if (node.nodeType === Node.TEXT_NODE) {
        return Array.from(node.textContent || '').map(char => ({
          text: char,
          html: this.escapeHtml(char)
        }))
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return []

      const childUnits = Array.from(node.childNodes).flatMap(child => this.extractTajweedCharUnits(child))
      if (node.tagName === 'SPAN') {
        return childUnits.map(unit => ({
          text: unit.text,
          html: this.wrapHtmlWithElement(node, unit.html)
        }))
      }

      return childUnits
    },

    buildTajweedWordTokens(verse, tajweedHtml) {
      if (!tajweedHtml) return ''

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = tajweedHtml
      const units = Array.from(tempDiv.childNodes).flatMap(node => this.extractTajweedCharUnits(node))
      const words = Array.isArray(verse.words) && verse.words.length
        ? verse.words
        : tokenizeArabicText(verse.arabic || '').map(ar => ({ ar, en: '', audio: null }))

      if (!units.length || !words.length) return tajweedHtml

      let cursor = 0
      let html = ''

      const consumeWhitespace = () => {
        let gap = ''
        while (cursor < units.length && /^\s$/.test(units[cursor].text || '')) {
          gap += units[cursor].html
          cursor += 1
        }
        return gap
      }

      words.forEach((word, idx) => {
        html += consumeWhitespace()

        const targetChars = Array.from(String(word?.ar || '')).filter(char => !/^\s$/.test(char))
        if (!targetChars.length) return

        let innerHtml = ''
        let collected = 0

        while (cursor < units.length && collected < targetChars.length) {
          const unit = units[cursor]
          cursor += 1
          if (/^\s$/.test(unit.text || '')) {
            innerHtml += unit.html
            continue
          }
          innerHtml += unit.html
          collected += 1
        }

        html += this.buildWordTokenHtml(verse, word, idx, innerHtml)
      })

      while (cursor < units.length) {
        html += units[cursor].html
        cursor += 1
      }

      return html
    },

    wrapTajweedWithWordHighlighting(verse, tajweedHtml) {
      if (!tajweedHtml) return this.splitArabicIntoWords(verse)
      return this.buildTajweedWordTokens(verse, tajweedHtml)
    },

    getTajweedWithWordHighlighting(verse) {
      if (!verse.arabic_tajweed && !verse.arabic) return ''

      const tajweedText = verse.arabic_tajweed || verse.arabic
      if (!tajweedText) return ''

      // First normalize the tajweed markup
      let normalized = this.normalizeTajweedMarkup(tajweedText)

      // Now wrap each word with word highlighting while preserving tajweed spans
      const words = tokenizeArabicText(verse.arabic)
      if (!words.length) return normalized

      let result = normalized
      let wordIndex = 0

      // For each word in the original Arabic, wrap the corresponding tajweed-marked text
      words.forEach((word, idx) => {
        // Create a regex that matches this word (accounting for potential tajweed spans inside)
        const wordPattern = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(<span[^>]*class="[^"]*tajweed[^"]*"[^>]*>)?(${wordPattern})(</span>)?`, 'g')

        result = result.replace(regex, (match, openTag, wordText, closeTag) => {
          const preservedMarkup = (openTag || '') + wordText + (closeTag || '')
          return `<word class="wbw-word" data-word-index="${idx}" data-verse-key="${verse.key}" data-tajweed-word="true">${preservedMarkup}</word> `
        })
      })

      return result
    },

    // Add sanitize method
    sanitizeHtml(html) {
      if (!html) return ''
      let cleaned = String(html)
      // Remove scripts entirely.
      cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Drop inline handlers/styles.
      cleaned = cleaned.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      cleaned = cleaned.replace(/\sstyle\s*=\s*(['"]).*?\1/gi, '')
      // Allow only the tags we intentionally render.
      cleaned = cleaned.replace(/<(?!\/?(?:span|word|br)\b)[^>]*>/gi, '')
      return cleaned
    },

    normalizeTajweedMarkup(text) {
      if (!text) return ''

      const markerMap = {
        '[h': 'ham_wasl',
        '[s': 'slnt',
        '[l': 'slnt',
        '[n': 'madda_normal',
        '[p': 'madda_permissible',
        '[m': 'madda_necessary',
        '[q': 'qlq',
        '[o': 'madda_obligatory',
        '[c': 'ikhf_shfw',
        '[f': 'ikhf',
        '[w': 'idghm_shfw',
        '[i': 'iqlb',
        '[a': 'idgh_ghn',
        '[u': 'idgh_w_ghn',
        '[d': 'idgh_mus',
        '[b': 'idgh_mus',
        '[g': 'ghn'
      }

      let normalized = this.sanitizeHtml(String(text))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\s*tajweed\b([^>]*)class=['"]?([a-zA-Z0-9_-]+)['"]?([^>]*)>/gi, '<span class="tajweed-mark tajweed-$2"$1$3>')
        .replace(/<\s*\/\s*tajweed\s*>/gi, '</span>')

      Object.entries(markerMap).forEach(([marker, className]) => {
        const escapedMarker = marker.replace('[', '\\[')
        normalized = normalized.replace(new RegExp(escapedMarker, 'g'), `<span class="tajweed-mark tajweed-${className}" data-tajweed="`)
      })

      normalized = normalized
        .replace(/\[/g, '">')
        .replace(/\]/g, '</span>')
        .replace(/<\/?tajweed[^>]*>/gi, '')
        .replace(/data-tajweed="([^"]*)">/g, (fullMatch, meta) => {
          const cleanMeta = String(meta || '').replace(/"/g, '&quot;')
          return `data-tajweed="${cleanMeta}">`
        })
        .replace(/<\/span><\/span>/g, '</span>')
        .replace(/(?:class=|data-tajweed=)&quot;[^&]*&quot;/g, '')

      return normalized
    },

    stripTajweedMarkup(text) {
      if (!text) return ''
      return String(text)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\s*\/?\s*tajweed[^>]*>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\[(?:[a-z]|\/)[^\]]*\]/gi, '')
        .trim()
    },

    // Arabic text word splitting and highlighting
    getHighlightedArabic(verse) {
      if (!verse || !verse.arabic) return ''
      if (!this.wordByWordAudioEnabled) return verse.arabic

      const highlightedHtml = this.splitArabicIntoWords(verse.arabic, verse.key)
      return highlightedHtml
    },

    escapeRegex(str) {
      return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    },

    splitArabicIntoWords(verse) {
      if (!verse || !verse.arabic) return ''

      // Get words from the verse object or tokenize
      let words = []
      if (verse.words && verse.words.length) {
        words = verse.words
      } else {
        const arabicWords = tokenizeArabicText(verse.arabic)
        words = arabicWords.map((w, idx) => ({
          ar: w,
          en: '',
          transliteration: '',
          audio: null
        }))
      }

      if (!words.length) return this.stripTajweedMarkup(verse.arabic || verse.arabic_tajweed || '')

      let html = ''

      // If tajweed is enabled and we have tajweed text, we need to be careful
      if (this.tajweedEnabled && verse.arabic_tajweed) {
        return this.wrapTajweedWithWordHighlighting(verse, this.normalizeTajweedMarkup(verse.arabic_tajweed))
      }

      // Regular mode (without tajweed)
      words.forEach((word, idx) => {
        const wordText = typeof word === 'string' ? word : word.ar
        html += `${this.buildWordTokenHtml(verse, word, idx, this.escapeHtml(wordText))} `
      })

      return html
    },

    async getWordTimings(verse, actualDuration = null) {
      if (!verse || !verse.key) {
        console.warn('getWordTimings: no verse')
        return []
      }

      // Get words from the verse object directly (not from HTML)
      let sourceWords = []
      if (verse.words && verse.words.length) {
        sourceWords = verse.words.map(word => String(word?.ar || '').trim()).filter(Boolean)
      } else {
        // If no pre-parsed words, tokenize the Arabic text
        const arabicText = verse.arabic || ''
        sourceWords = tokenizeArabicText(arabicText)
      }

      if (!sourceWords.length) {
        console.warn('getWordTimings: no words for verse', verse.key)
        return []
      }

      // Get actual audio duration or estimate
      let safeDuration = 0
      if (Number.isFinite(Number(actualDuration)) && Number(actualDuration) > 0) {
        safeDuration = Number(actualDuration)
      } else if (verse.duration && Number(verse.duration) > 0) {
        safeDuration = Number(verse.duration)
      } else {
        safeDuration = this.estimateVerseDuration(verse)
      }

      // Keep timestamps in media-time because audioElement.currentTime is also media-time.
      const cacheKey = `${verse.key}_${this.reciterId}_${Math.round(safeDuration * 10)}`

      if (this.wordTimestampsMap.has(cacheKey)) {
        return this.wordTimestampsMap.get(cacheKey)
      }

      // Build a normalized timing track so highlight end time always matches audio end time.
      const cleanedWords = sourceWords.map(word => word.replace(/<[^>]+>/g, '').replace(/[^\u0621-\u064A]/g, ''))
      const weightedUnits = cleanedWords.map((cleanWord, index) => {
        const charCount = Math.max(1, cleanWord.length)
        const leadInBoost = index === 0 ? 1.14 : 1
        const shortWordLift = charCount <= 2 ? 1.18 : 1
        return (charCount + 0.75) * leadInBoost * shortWordLift
      })
      const totalUnits = weightedUnits.reduce((sum, unit) => sum + unit, 0) || 1
      const timestamps = []
      let currentTime = 0

      weightedUnits.forEach((unit, index) => {
        const wordDuration = index === weightedUnits.length - 1
          ? Math.max(0, safeDuration - currentTime)
          : safeDuration * (unit / totalUnits)

        timestamps.push({
          index,
          start: currentTime,
          end: currentTime + wordDuration
        })
        currentTime += wordDuration
      })

      this.wordTimestampsMap.set(cacheKey, timestamps)
      return timestamps
    },

    calculateWordTimings(verse, audioDuration = null) {
      return new Promise((resolve) => {
        if (!verse.words || verse.words.length === 0) {
          resolve([])
          return
        }

        const wordCount = verse.words.length
        const totalDuration = audioDuration || this.estimateVerseDuration(verse)
        const durationPerWord = totalDuration / wordCount

        const timestamps = []
        let currentTime = 0

        for (let i = 0; i < wordCount; i++) {
          timestamps.push({
            index: i,
            start: currentTime,
            end: currentTime + durationPerWord
          })
          currentTime += durationPerWord
        }

        resolve(timestamps)
      })
    },

    estimateVerseDuration(verse) {
      // Estimate based on verse length
      const arabicLength = verse.arabic?.length || 100
      const baseDuration = Math.min(45, Math.max(5, arabicLength / 10))
      return baseDuration
    },

    async startWordHighlighting(verse, options = {}) {
      if (!verse?.key || !this.wordByWordAudioEnabled) return
      const timestamps = await this.ensureWordHighlightTrack(verse, options)
      if (!timestamps.length) return
      this.queueWordHighlightFrame(verse)
    },
    updateWordHighlight(verseKey, activeIndex) {
      this.currentHighlightedVerseKey = verseKey || null
      this.currentWordIndex = Number.isFinite(Number(activeIndex)) ? Number(activeIndex) : -1
      this.currentPhraseIndex = this.currentWordIndex
      this.applyWordHighlightClasses(verseKey, this.currentWordIndex)
      this.$forceUpdate()
    },

    applyWordHighlightClasses(verseKey, activeIndex) {
      document.querySelectorAll('.verse-arabic .wbw-word.highlighted, .verse-arabic word.highlighted, .word-item.highlighted, .wbw-word.phrase-highlighted, .word-item.phrase-highlighted')
        .forEach(node => {
          node.classList.remove('highlighted')
          node.classList.remove('phrase-highlighted')
        })

      if (!verseKey || activeIndex < 0) return

      const wordSelector = `.verse-arabic [data-verse-key="${verseKey}"][data-word-index="${activeIndex}"]`
      document.querySelectorAll(wordSelector).forEach(node => {
        node.classList.add('highlighted')
        node.classList.add('phrase-highlighted')
      })

      const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
      verseCard?.querySelectorAll('.word-item').forEach((node, index) => {
        if (index === activeIndex) {
          node.classList.add('highlighted')
          node.classList.add('phrase-highlighted')
        } else {
          node.classList.remove('highlighted')
          node.classList.remove('phrase-highlighted')
        }
      })
    },

    findWordTimingIndex(currentTime, timestamps = this.wordHighlightTimestamps) {
      if (!Array.isArray(timestamps) || !timestamps.length) return -1
      const time = Math.max(0, Number(currentTime || 0))
      const epsilon = 0.045
      let low = 0
      let high = timestamps.length - 1

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const item = timestamps[mid]
        if (time < Number(item.start || 0) - epsilon) {
          high = mid - 1
        } else if (time > Number(item.end || 0) + epsilon) {
          low = mid + 1
        } else {
          return Number(item.index)
        }
      }

      if (time >= Number(timestamps[timestamps.length - 1]?.start || 0) - epsilon) {
        return Number(timestamps[timestamps.length - 1]?.index ?? -1)
      }

      return -1
    },

    queueWordHighlightFrame(verse = this.activeVerseRef) {
      if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
      this.wordHighlightFrame = null

      if (!verse?.key || !this.audioElement || this.audioElement.paused || this.audioElement.ended) return

      const tick = () => {
        if (!this.audioElement || this.audioElement.paused || this.audioElement.ended) {
          this.wordHighlightFrame = null
          return
        }
        this.syncWordHighlightFromAudio(verse)
        this.wordHighlightFrame = window.requestAnimationFrame(tick)
      }

      this.wordHighlightFrame = window.requestAnimationFrame(tick)
    },

    async ensureWordHighlightTrack(verse, options = {}) {
      const { force = false } = options
      if (!verse?.key || !this.wordByWordAudioEnabled) return []
      if (!force && this.currentHighlightedVerseKey === verse.key && this.wordHighlightTimestamps?.length) {
        return this.wordHighlightTimestamps
      }

      const requestId = ++this.wordHighlightRequestId
      this.wordHighlightLoading = true
      this.currentHighlightedVerseKey = verse.key
      this.currentWordIndex = -1
      this.currentPhraseIndex = -1

      const duration = Number(this.audioElement?.duration)
      const timestamps = await this.getWordTimings(verse, Number.isFinite(duration) && duration > 0 ? duration : null)
      if (requestId !== this.wordHighlightRequestId) return []

      this.wordHighlightLoading = false
      this.wordHighlightTimestamps = Array.isArray(timestamps) ? timestamps : []
      this.syncWordHighlightFromAudio(verse)
      this.$forceUpdate()
      return this.wordHighlightTimestamps
    },

    syncWordHighlightFromAudio(verse = this.activeVerseRef) {
      if (!verse || !verse.key || this.currentHighlightedVerseKey !== verse.key || !this.wordHighlightTimestamps?.length || !this.audioElement) return

      const currentTime = Number(this.audioElement.currentTime || 0)
      const activeIndex = this.findWordTimingIndex(currentTime, this.wordHighlightTimestamps)
      if (this.currentWordIndex !== activeIndex || this.currentHighlightedVerseKey !== verse.key) {
        this.updateWordHighlight(verse.key, activeIndex)
      }
    },

    restoreWordScroll(verseKey) {
      this.$nextTick(() => {
        if (!verseKey) return
        const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
        const wordsWrap = verseCard?.querySelector('.verse-words')
        const remembered = this.verseScrollMemory[verseKey]
        if (!wordsWrap || !remembered) return
        wordsWrap.scrollTop = Number(remembered.top || 0)
        wordsWrap.scrollLeft = Number(remembered.left || 0)
      })
    },

    onVerseWordsScroll(verseKey, event) {
      const el = event?.target
      if (!verseKey || !el) return
      this.verseScrollMemory[verseKey] = {
        top: el.scrollTop,
        left: el.scrollLeft
      }
    },

    updateWordHighlightInDOM(verseKey, activeWordIndex) {
      this.updateWordHighlight(verseKey, activeWordIndex)
    },

    stopWordHighlighting() {
      this.wordHighlightRequestId += 1
      if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
      this.wordHighlightFrame = null
      this.wordHighlightHandler = null
      this.wordHighlightLoading = false
      this.applyWordHighlightClasses(null, -1)
      this.currentWordIndex = -1
      this.currentPhraseIndex = -1
      this.currentHighlightedVerseKey = null
      this.wordHighlightTimestamps = []
      this.$forceUpdate()
    },

    // Audio methods
    initAudio() {
      this.audioElement = this.$refs.audio
      if (!this.audioElement) return

      this.audioElement.removeEventListener('timeupdate', this.audioTimeUpdate)
      this.audioElement.removeEventListener('ended', this.audioEnded)
      this.audioElement.removeEventListener('error', this.audioError)
      this.audioElement.removeEventListener('seeking', this.audioSeeking)
      this.audioElement.removeEventListener('seeked', this.audioSeeked)
      this.audioElement.removeEventListener('pause', this.audioPaused)
      this.audioElement.removeEventListener('playing', this.audioPlaying)
      this.audioElement.removeEventListener('ratechange', this.audioRateChange)
      this.audioElement.removeEventListener('loadstart', this.audioLoadStart)

      this.audioTimeUpdate = () => {
        this.currentTime = this.audioElement.currentTime
        this.duration = this.audioElement.duration
        this.centralSession.audio.currentTime = Number(this.currentTime || 0)
        this.centralSession.audio.speed = Number(this.speed || 1)

        if (this.segmentEndTime > 0 && Number(this.currentTime || 0) >= this.segmentEndTime - 0.04) {
          this.handleSegmentBoundary()
          return
        }

        if (this.wordByWordAudioEnabled) {
          const verse = this.activeVerseRef
          if (verse && verse.key) {
            if ((!this.wordHighlightTimestamps?.length || this.currentHighlightedVerseKey !== verse.key) && !this.wordHighlightLoading) {
              this.startWordHighlighting(verse)
            } else if (!this.wordHighlightLoading) {
              this.syncWordHighlightFromAudio(verse)
            }
          }
        }

        // Waveform - separate from word highlighting (works even if word-by-word is off)
        const verse = this.activeVerseRef
        if (verse && verse.key !== this.currentWaveVerseKey) {
          this.currentWaveVerseKey = verse.key;
        }
      }

      this.audioEnded = () => {
        if (this.advanceLocked) return
        this.advanceLocked = true
        this.isPlaying = false
        this.stopWordHighlighting()
        if (this.guidedUiStep === 'learn') {
          this.flowListenPlays += 1
          this.persistUiState()
        }
        if (this.manualOnlyPlayback) {
          this.manualOnlyPlayback = false
          this.advanceLocked = false
          return
        }
        const gapSeconds = this.getCurrentPlaybackGapSeconds()
        const gapDelayMs = Math.max(0, gapSeconds * 1000)
        if (this.playMode === 'auto') {
          if (!this.chainingEnabled && this.selectedLoopCount === 'infinite' && this.activeQueueEntry) {
            window.setTimeout(() => {
              const entry = this.activeQueueEntry
              this.advanceLocked = false
              if (entry) {
                this.playQueueEntry(entry, { force: true, queueIndex: this.queueIndex })
              }
            }, gapDelayMs)
            return
          }
          window.setTimeout(() => {
            this.advanceLocked = false
            this.next()
          }, gapDelayMs)
        } else {
          this.advanceLocked = false
        }
      }

      this.audioSeeking = () => {
        if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
        this.wordHighlightFrame = null
        if (this.currentHighlightedVerseKey) this.updateWordHighlight(this.currentHighlightedVerseKey, -1)
      }

      this.audioSeeked = () => {
        const verse = this.activeVerseRef
        if (!verse) return
        if (this.wordByWordAudioEnabled) {
          this.ensureWordHighlightTrack(verse).then(() => {
            this.syncWordHighlightFromAudio(verse)
            if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
          })
        }
      }

      this.audioPaused = () => {
        this.isPlaying = false
        if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
        this.wordHighlightFrame = null
      }

      this.audioPlaying = () => {
        this.isPlaying = true
        const verse = this.activeVerseRef
        if (verse && this.wordByWordAudioEnabled) {
          this.startWordHighlighting(verse)
        }
      }

      this.audioRateChange = () => {
        this.centralSession.audio.speed = Number(this.audioElement?.playbackRate || this.speed || 1)
        const verse = this.activeVerseRef
        if (verse && this.wordByWordAudioEnabled && this.wordHighlightTimestamps?.length) {
          this.syncWordHighlightFromAudio(verse)
          if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
        }
      }

      this.audioLoadStart = () => {
        this.stopWordHighlighting()
      }

      this.audioError = (e) => {
        console.error('Audio error:', e)
        this.isPlaying = false
        this.sessionErrorCount += 1
        this.stopWordHighlighting()
        this.showBanner('Audio playback error', 'error', 3000)
      }

      this.audioElement.addEventListener('timeupdate', this.audioTimeUpdate)
      this.audioElement.addEventListener('ended', this.audioEnded)
      this.audioElement.addEventListener('error', this.audioError)
      this.audioElement.addEventListener('seeking', this.audioSeeking)
      this.audioElement.addEventListener('seeked', this.audioSeeked)
      this.audioElement.addEventListener('pause', this.audioPaused)
      this.audioElement.addEventListener('playing', this.audioPlaying)
      this.audioElement.addEventListener('ratechange', this.audioRateChange)
      this.audioElement.addEventListener('loadstart', this.audioLoadStart)
    },

    async playVerse(verse, options = {}) {
      if (this.playRequestLocked && !options.force) return
      this.playRequestLocked = true
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.segmentPlaybackTimer) {
        clearTimeout(this.segmentPlaybackTimer)
        this.segmentPlaybackTimer = null
      }
      this.segmentEndTime = 0
      this.segmentPlaybackKind = ''

      if (!verse) {
        console.error('No verse provided')
        this.playRequestLocked = false
        return
      }

      if (!verse.audio) {
        this.showBanner(`Audio not available for verse ${verse.number}`, 'info', 2000)
        this.playRequestLocked = false
        return
      }

      const audioUrl = this.normalizeAudioUrl(verse.audio)
      this.manualOnlyPlayback = !!options.manualOnly
      const currentSrc = this.audioElement?.currentSrc ? this.normalizeAudioUrl(this.audioElement.currentSrc) : ''
      const isSameSource = !!currentSrc && currentSrc === audioUrl

      // Toggle if same verse is playing
      if (!options.force && this.activeKey === verse.key && isSameSource) {
        this.togglePlay()
        this.playRequestLocked = false
        return
      }

      // Stop current playback and highlighting
      this.stopWordHighlighting()
      if (this.audioElement) {
        try {
          this.audioElement.pause()
        } catch (e) {
          console.warn('Error pausing audio:', e)
        }
      }

      this.setActiveVerse(verse.key, {
        scroll: false,
        queueIndex: Number.isFinite(options.queueIndex) ? Number(options.queueIndex) : undefined
      })

      if (!this.audioElement) {
        this.audioElement = this.$refs.audio
        if (!this.audioElement) {
          this.showBanner('Audio system not ready', 'error', 3000)
          this.playRequestLocked = false
          return
        }
        this.initAudio()
      }

      if (!isSameSource) {
        this.audioElement.src = audioUrl
        this.audioElement.load()
      }
      this.playerVisible = true

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio load timeout'))
        }, 10000)

        const startPlayback = async () => {
          clearTimeout(timeout)
          this.audioElement.playbackRate = this.speed
          const segment = options.segment || null
          const segmentTotal = Math.max(1, Number(segment?.sequenceTotal || segment?.total || 1))
          const segmentIndex = Math.max(0, Math.min(segmentTotal - 1, Number(segment?.index || 0)))
          let segmentEnd = 0

          if (segment && Number.isFinite(this.audioElement.duration) && this.audioElement.duration > 0 && segmentTotal > 1) {
            const duration = Number(this.audioElement.duration || 0)
            const segmentStart = Math.max(0, duration * (segmentIndex / segmentTotal))
            segmentEnd = Math.min(duration, duration * ((segmentIndex + 1) / segmentTotal))
            this.segmentEndTime = segmentEnd
            this.audioElement.currentTime = segmentStart
          }

          try {
            await this.audioElement.play()
            this.incrementVersePlayCount(verse.key)
            this.markPlaybackStart()
            this.addActivityEvent({ ts: Date.now(), type: 'play', verseKey: verse.key })
            this.recomputeAnalytics()
            if (this.wordByWordAudioEnabled) {
              this.ensureWordHighlightTrack(verse, { force: true }).then(() => {
                this.syncWordHighlightFromAudio(verse)
                if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
              }).catch(err => {
                console.warn('Word highlight bootstrap failed:', err)
              })
            }
            this.playRequestLocked = false
            resolve()
          } catch (err) {
            this.isPlaying = false
            this.playRequestLocked = false
            reject(err)
          }
        }

        const canPlayHandler = async () => {
          await startPlayback()
          this.audioElement.removeEventListener('canplay', canPlayHandler)
        }

        const errorHandler = (err) => {
          clearTimeout(timeout)
          this.isPlaying = false
          this.playRequestLocked = false
          reject(err)
          this.audioElement.removeEventListener('error', errorHandler)
        }

        this.audioElement.addEventListener('error', errorHandler, { once: true })
        if (isSameSource && this.audioElement.readyState >= 2) {
          startPlayback()
        } else {
          this.audioElement.addEventListener('canplay', canPlayHandler)
        }
      }).catch(err => {
        console.error('playVerse failed:', err)
        this.isPlaying = false
        this.playRequestLocked = false
        this.showBanner('Failed to play audio', 'error', 3000)
      })
    },

    playQueueEntry(entry, options = {}) {
      if (!entry) return Promise.resolve()
      const verse = entry.verse || entry
      return this.playVerse(verse, { ...options, segment: null })
    },

    handleSegmentBoundary() {
      if (!this.segmentEndTime || this.advanceLocked) return
      this.segmentEndTime = 0
      const playbackKind = this.segmentPlaybackKind
      this.segmentPlaybackKind = ''
      this.stopWordHighlighting()
      if (playbackKind !== 'word' && this.playMode === 'auto') {
        this.next()
        return
      }
      if (this.audioElement) {
        try { this.audioElement.pause() } catch { }
      }
      this.isPlaying = false
    },

    togglePlay() {
      if (!this.audioElement?.src) return

      if (this.audioElement.paused) {
        this.audioElement.play()
          .then(() => {
            this.isPlaying = true
            const verse = this.activeVerseRef
            if (verse && this.wordByWordAudioEnabled) {
              this.ensureWordHighlightTrack(verse, { force: true }).then(() => {
                this.syncWordHighlightFromAudio(verse)
                if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
              }).catch(err => {
                console.warn('Word highlight resume failed:', err)
              })
            }
          })
          .catch(err => {
            console.error('Failed to play:', err)
            this.showBanner('Playback failed', 'error', 2000)
          })
      } else {
        this.audioElement.pause()
        this.isPlaying = false
      }
    },

    applySpeed() {
      if (this.audioElement) this.audioElement.playbackRate = this.speed
    },

    next() {
      if (this.advanceLocked) return
      this.advanceLocked = true

      if (this.canNext) {
        this.sessionCompleted = false
        this.queueIndex++
        moveMutqinSession(this.mutqinState, this.queueIndex + 1)
        this.centralSession.chaining.index = this.queueIndex
        this.persistCentralSessionState()
        this.recomputeAnalytics()

        const entry = this.queue[this.queueIndex]
        const verseKey = entry?.verse?.key || entry?.key

        if (verseKey) {
          this.setActiveVerse(verseKey, { queueIndex: this.queueIndex })
          this.$nextTick(() => this.$forceUpdate())
        }

        const v = this.queue[this.queueIndex]
        if (v) {
          this.playQueueEntry(v, { force: true, queueIndex: this.queueIndex })
            .finally(() => {
              this.advanceLocked = false
            })
        } else {
          this.advanceLocked = false
        }
        return
      }

      this.advanceLocked = false
      this.handleSessionComplete()
    },

    prev() {
      if (!this.canPrev) return
      if (this.advanceLocked) return

      this.advanceLocked = true
      this.sessionCompleted = false
      this.queueIndex--
      moveMutqinSession(this.mutqinState, this.queueIndex + 1)
      this.centralSession.chaining.index = this.queueIndex
      this.persistCentralSessionState()
      this.recomputeAnalytics()

      const entry = this.queue[this.queueIndex]
      const verseKey = entry?.verse?.key || entry?.key

      if (verseKey) {
        this.setActiveVerse(verseKey, { scroll: false, queueIndex: this.queueIndex })
        this.$nextTick(() => this.$forceUpdate())
      }

      const v = this.queue[this.queueIndex]
      if (v) {
        this.playQueueEntry(v, { force: true, queueIndex: this.queueIndex })
          .finally(() => {
            this.advanceLocked = false
          })
      } else {
        this.advanceLocked = false
      }
    },

    closePlayer() {
      this.flushPlaybackTime()
      this.stopWordHighlighting()
      if (this.segmentPlaybackTimer) {
        clearTimeout(this.segmentPlaybackTimer)
        this.segmentPlaybackTimer = null
      }
      this.segmentEndTime = 0
      this.segmentPlaybackKind = ''
      this.advanceLocked = false
      this.playRequestLocked = false
      if (this.audioElement) {
        this.audioElement.pause()
        this.audioElement.src = ''
      }
      this.playerVisible = false
      this.isPlaying = false
      this.playerMenuOpen = false
      this.persistAudioState()
    },

    async loadVerses(mode = this.currentMode) {
      const target = mode === 'beginner' ? this.beginner : this.advanced
      const chapterId = Number(target.chapterId || 0)
      if (!chapterId) return

      const rangeStart = Number(target.rangeStart || 1)
      const rangeEnd = Number(target.rangeEnd || rangeStart || 1)
      const reciterId = target.reciterId || DEFAULT_ALQURAN_RECITER
      const requestId = ++this.verseRequestId
      const targetConfig = this.buildSessionConfig(mode)

      this.isDataReady = false

      try {
        const cached = this.getCachedVerses(mode, targetConfig)
        if (cached?.verses?.length) {
          if (mode === 'beginner') {
            this.beginner.verses = cached.verses
            this.beginner.loadedConfig = cached.loadedConfig
          } else {
            this.advanced.verses = cached.verses
            this.advanced.loadedConfig = cached.loadedConfig
          }
          this.buildQueue(mode)
          this.syncActiveVerseState(mode)
          this.syncMutqinAyahs(cached.verses)
          this.isDataReady = true
          return
        }

        const [audioRes, translationRes, translitRes, arabicRes, tajweedRes] = await Promise.all([
          getSurahEdition(chapterId, reciterId),
          getSurahEdition(chapterId, 'en.asad'),
          getSurahEdition(chapterId, 'en.transliteration'),
          getSurahEdition(chapterId, 'quran-uthmani'),
          getSurahEditions(chapterId, reciterId)
        ])

        if (requestId !== this.verseRequestId) return

        const audioSurah = audioRes.data?.data
        const translationSurah = translationRes.data?.data
        const translitSurah = translitRes.data?.data
        const arabicSurah = arabicRes.data?.data
        const tajweedEdition = (tajweedRes.data?.data || []).find(entry => entry?.edition?.identifier === 'quran-tajweed')

        const audioAyahs = audioSurah?.ayahs || []
        const arabicByNumber = new Map((arabicSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const translationByNumber = new Map((translationSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const translitByNumber = new Map((translitSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const tajweedByNumber = new Map((tajweedEdition?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))

        const start = rangeStart
        const end = rangeEnd

        const mappedVerses = audioAyahs
          .filter(ayah => ayah.numberInSurah >= start && ayah.numberInSurah <= end)
          .map(ayah => {
            const key = `${chapterId}:${ayah.numberInSurah}`
            let arabic = arabicByNumber.get(ayah.numberInSurah) || ayah.text || ''
            let tajweed = tajweedByNumber.get(ayah.numberInSurah) || ''

            // Remove Basmala from Arabic text
            arabic = this.removeBasmala(arabic)
            tajweed = this.removeBasmala(tajweed)

            const transliteration = translitByNumber.get(ayah.numberInSurah) || ''
            const translation = translationByNumber.get(ayah.numberInSurah) || ''

            const arabicWords = tokenizeArabicText(arabic)
            const translitWords = String(transliteration).split(/\s+/).filter(Boolean)
            const translationWords = String(translation).split(/\s+/).filter(Boolean)

            return {
              key,
              number: ayah.numberInSurah,
              chapterId,
              arabic,
              arabic_tajweed: tajweed,
              translation: this.cleanTranslationText(translation),
              transliteration,
              audio: this.resolveAyahAudioUrl(ayah),
              words: arabicWords.map((word, index) => ({
                ar: word,
                en: translationWords[index] || '',
                transliteration: translitWords[index] || '',
                audio: null
              }))
            }
          })

        if (mode === 'beginner') {
          this.beginner.verses = mappedVerses
          this.beginner.loadedConfig = {
            chapterId,
            rangeStart: start,
            rangeEnd: end,
            reciterId,
            showWordByWord: this.showWordByWord,
            tajweedEnabled: this.tajweedEnabled
          }
        } else {
          this.advanced.verses = mappedVerses
          this.advanced.loadedConfig = {
            chapterId,
            rangeStart: start,
            rangeEnd: end,
            reciterId,
            showWordByWord: this.showWordByWord,
            tajweedEnabled: this.tajweedEnabled
          }
        }
        this.syncMutqinAyahs(mappedVerses)

        this.setCachedVerses(mode, targetConfig, {
          verses: mappedVerses,
          loadedConfig: mode === 'beginner' ? this.beginner.loadedConfig : this.advanced.loadedConfig
        })

        this.buildQueue(mode)
        this.syncActiveVerseState(mode)

        // Set ready after data loads
        this.isDataReady = true

      } catch (e) {
        console.error('Error loading verses:', e)
        this.showBanner('Failed to load verses', 'error', 3000)
        this.isDataReady = true
      }
    },

    cleanTranslationText(text) {
      if (!text) return ''
      let cleaned = text
      cleaned = cleaned.replace(/<sup>foot_note=\d+><\/sup>/gi, '')
      cleaned = cleaned.replace(/<sup>.*?<\/sup>/gi, '')
      cleaned = cleaned.replace(/<[^>]*>/g, '')
      cleaned = cleaned.replace(/\[\d+\]/g, '')
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      return cleaned
    },

    buildQueue(mode = this.currentMode) {
      const config = mode === 'beginner' ? this.beginner : this.advanced
      const verses = config.verses
      const previousActiveKey = config.activeKey
      const previousEntry = Array.isArray(config.queue) ? config.queue[Math.max(0, Number(config.queueIndex || 0))] : null
      const previousEntryKey = previousEntry?.verse?.key || previousEntry?.key || null

      if (!verses || verses.length === 0) {
        if (mode === this.currentMode) {
          this.queue = []
          this.queueIndex = 0
        }
        if (mode === 'beginner') {
          this.beginner.queue = []
          this.beginner.queueIndex = 0
        } else {
          this.advanced.queue = []
          this.advanced.queueIndex = 0
        }
        return
      }

      const q = []
      const safePreviousQueueIndex = Math.max(0, Number(config.queueIndex || 0))

      const chainingEnabled = this.chainingEnabled
      const chainingMethod = this.chainingMethod
      const repetitions = chainingEnabled
        ? Math.max(1, Math.min(5, Number(this.chainingRepetitions || 1)))
        : Math.max(1, Math.min(50, Number(this.repetitionsPerStep || 1)))

      console.log('[buildQueue] Settings:', {
        chainingEnabled,
        chainingMethod,
        repetitions,
        versesCount: verses.length,
        mode
      })

      const decorateQueueEntry = (entry, repeatIndex) => ({
        ...entry,
        repeatCount: repeatIndex,
        totalRepeats: repetitions,
        phase: entry.phase,
        chainKey: entry.chainKey,
        sequencePosition: entry.sequencePosition,
        sequenceTotal: entry.sequenceTotal
      })

      const pushQueueEntry = (entry) => {
        for (let repeatIndex = 1; repeatIndex <= repetitions; repeatIndex++) {
          q.push(decorateQueueEntry(entry, repeatIndex))
        }
      }

      const pushQueueGroup = (entries) => {
        for (let repeatIndex = 1; repeatIndex <= repetitions; repeatIndex++) {
          entries.forEach(entry => q.push(decorateQueueEntry(entry, repeatIndex)))
        }
      }

      if (!chainingEnabled) {
        // Simple sequential order without chaining
        verses.forEach(verse => {
          pushQueueEntry({
            verse,
            phase: 'Memorise',
            chainKey: null,
            sequencePosition: 1,
            sequenceTotal: 1
          })
        })
      } else if (chainingMethod === 'cumulative') {
        // Cumulative method: 1, then 1-2, then 1-2-3, etc.
        for (let endIndex = 0; endIndex < verses.length; endIndex++) {
          const chain = verses.slice(0, endIndex + 1)
          pushQueueGroup(chain.map((verse, chainIndex) => ({
            verse: chain[chainIndex],
            phase: 'Cumulative',
            chainKey: `cumulative:${endIndex + 1}`,
            sequencePosition: chainIndex + 1,
            sequenceTotal: chain.length
          })))
        }
      } else {
        // Linking method: practice ayahs individually, then adjacent ayah pairs.
        for (let index = 0; index < verses.length; index++) {
          const verse = verses[index]
          pushQueueEntry({
            verse,
            phase: 'Linking',
            chainKey: `linking:single:${verse.key}`,
            sequencePosition: 1,
            sequenceTotal: 1
          })

          const nextVerse = verses[index + 1]
          if (nextVerse) {
            pushQueueGroup([
              {
                verse,
                phase: 'Linking',
                chainKey: `linking:${verse.key}->${nextVerse.key}`,
                sequencePosition: 1,
                sequenceTotal: 2
              },
              {
                verse: nextVerse,
                phase: 'Linking',
                chainKey: `linking:${verse.key}->${nextVerse.key}`,
                sequencePosition: 2,
                sequenceTotal: 2
              }
            ])
          }
        }
      }

      console.log(`[buildQueue] Built ${q.length} queue entries`)

      // Restore previous position if possible
      let previousQueueIndex = Math.min(safePreviousQueueIndex, Math.max(q.length - 1, 0))
      if (previousEntryKey) {
        const exactIndex = q.findIndex(item =>
          (item?.verse?.key || item?.key) === previousEntryKey &&
          item.phase === previousEntry?.phase &&
          item.chainKey === previousEntry?.chainKey &&
          Number(item.sequencePosition || 1) === Number(previousEntry?.sequencePosition || 1) &&
          Number(item.repeatCount || 1) === Number(previousEntry?.repeatCount || 1)
        )
        if (exactIndex >= 0) {
          previousQueueIndex = exactIndex
        } else {
          const firstIndex = q.findIndex(item => (item?.verse?.key || item?.key) === previousEntryKey)
          if (firstIndex >= 0) previousQueueIndex = firstIndex
        }
      }

      // Update queue in appropriate store
      if (mode === this.currentMode) {
        this.queue = q
        this.queueIndex = previousQueueIndex
      }

      if (mode === 'beginner') {
        this.beginner.queue = q
        this.beginner.queueIndex = previousQueueIndex
      } else {
        this.advanced.queue = q
        this.advanced.queueIndex = previousQueueIndex
      }

      this.syncActiveVerseState(mode, previousActiveKey)
    },

    estimateQueueDuration(queue) {
      const avgVerseDuration = 45
      return Math.ceil(queue.length * avgVerseDuration / 60)
    },

    rebuildQueue(mode = this.currentMode) {
      this.buildQueue(mode)
    },

    setChainingEnabled(enabled) {
      this.chainingEnabled = !!enabled
      this.applyChainingQueueChange(this.currentMode, { restart: true })
    },
    toggleFocusModeRadio() {
      this.focusModeEnabled = !this.focusModeEnabled
      this.persistUiState()
    },
    toggleBlurModeRadio() {
      this.blurModeEnabled = !this.blurModeEnabled
      this.persistUiState()
    },
    toggleChainingRadio() {
      this.setChainingEnabled(!this.chainingEnabled)
    },
    toggleAnchorModeRadio() {
      this.setAnchorMode(!this.anchorModeEnabled)
    },

    setAnchorMode(enabled) {
      const nextEnabled = !!enabled
      if (this.anchorModeEnabled === nextEnabled) return
      this.toggleAnchorMode()
    },

    setChainingMethod(method) {
      const nextMethod = method === 'cumulative' ? 'cumulative' : 'linking'
      this.chainingEnabled = true
      this.chainingMethod = nextMethod
      this.applyChainingQueueChange(this.currentMode, { restart: true })
    },

    escapeHtml(str) { return String(str || '').replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] }) },
    escapeRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },

    setChainingRepetitions(value) {
      this.chainingRepetitions = Math.max(1, Math.min(5, Number(value || 1)))
      this.applyChainingQueueChange(this.currentMode, { restart: true })
    },

    applyChainingQueueChange(mode = this.currentMode, options = {}) {
      if (!this.hasVerses) {
        this.persistUiState()
        this.persistCentralSessionState()
        return
      }
      if (this.audioElement && options.restart) {
        try { this.audioElement.pause() } catch { }
      }
      if (options.restart) {
        this.isPlaying = false
        this.currentTime = 0
        this.stopWordHighlighting()
        this.getModeStore(mode).queueIndex = 0
      }
      this.buildQueue(mode)
      const store = this.getModeStore(mode)
      if (mode === this.currentMode && Array.isArray(store.queue) && store.queue.length) {
        if (options.restart) store.queueIndex = 0
        this.syncMutqinSession(store.queue, mode)
        const nextEntry = store.queue[Math.max(0, Number(store.queueIndex || 0))]
        const nextKey = nextEntry?.verse?.key || nextEntry?.key || store.activeKey
        if (nextKey) {
          this.setActiveVerse(nextKey, { mode, queueIndex: Math.max(0, Number(store.queueIndex || 0)), scroll: false })
        }
        if (options.restart) moveMutqinSession(this.mutqinState, 0)
      }
      this.persistSessionState()
      this.persistCentralSessionState()
    },

    persistModeState(mode) {
      const source = mode === 'beginner' ? this.beginner : this.advanced
      try {
        localStorage.setItem(MODE_STORAGE_KEYS[mode], JSON.stringify(this.cloneModeState(source)))
      } catch (e) {
        console.error(`Failed to persist ${mode} mode state:`, e)
      }
    },

    async startSession() {
      const config = this.sessionConfig
      const mode = config.mode || this.currentMode

      if (!config.chapterId || config.chapterId === 0) {
        this.showTools = true
        this.showBanner('Please select a surah first', 'info', 3600)
        return
      }

      if (!this.validateSettings()) {
        return
      }

      this.applySessionConfig(config)
      this.persistModeState(mode)
      this.persistUiState()

      this.sessionCompleted = false
      this.sessionCompletedAt = null
      this.sessionStartedAt = Date.now()
      this.sessionErrorCount = 0
      this.statsTick = Date.now()
      this.centralSession.sessionStatus = 'active'
      this.centralSession.sessionCompletedAt = null

      const currentVerses = mode === 'beginner' ? this.beginner.verses : this.advanced.verses
      const modeNeedsReload = !currentVerses || !currentVerses.length || !this.modeDataMatchesConfig(mode, config)

      if (modeNeedsReload) {
        await this.loadVerses(mode)
      }

      const updatedVerses = mode === 'beginner'
        ? this.beginner.verses
        : this.advanced.verses

      if (!updatedVerses || updatedVerses.length === 0) {
        this.showBanner('No verses loaded. Check your network connection.', 'error')
        return
      }

      if (!this.audioElement) {
        this.initAudio()
      }

      // Rebuild queue with current chaining settings
      console.log('[startSession] Building queue with settings:', {
        enabled: this.chainingEnabled,
        method: this.chainingMethod,
        repetitions: this.chainingRepetitions
      })

      this.buildQueue(mode)

      const builtQueue = mode === 'beginner'
        ? this.beginner.queue
        : this.advanced.queue

      if (!builtQueue || builtQueue.length === 0) {
        this.showBanner('Nothing to play. Check the selected range.', 'error')
        return
      }

      this.syncMutqinAyahs(updatedVerses)
      const sessionState = this.syncMutqinSession(builtQueue, mode)
      this.incrementSessionPlayCount()
      const canonicalIndex = Math.max(0, Number(sessionState?.current_index || 0))
      let playbackIndex = canonicalIndex > 0
        ? Math.min(canonicalIndex - 1, builtQueue.length - 1)
        : 0

      this.queueIndex = playbackIndex
      this.getModeStore(mode).queueIndex = playbackIndex

      const nextCanonicalIndex = canonicalIndex > 0 ? canonicalIndex : 1
      moveMutqinSession(this.mutqinState, nextCanonicalIndex)

      const first = builtQueue[playbackIndex]

      if (first && first.verse) {
        this.setActiveVerse(first.verse.key, { mode, queueIndex: playbackIndex, scroll: false })
        await this.$nextTick()

        if (this.audioElement) {
          this.audioElement.playbackRate = this.speed
        }

        await this.playQueueEntry(first, { force: true, queueIndex: playbackIndex })
      }

      this.showTools = false
      this.flowStep = 'learn'

      const chainingStatus = this.chainingEnabled
        ? `${this.chainingMethod} chaining (${this.chainingRepetitions}x)`
        : 'no chaining'

      this.showBanner(
        `Session started with ${builtQueue.length} guided repetitions using ${chainingStatus}`,
        'success',
        3000
      )
    },

    // Utility methods
    formatTime(sec) {
      const t = Math.max(0, Math.floor(sec || 0))
      return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    },

    normalizeAudioUrl(url) {
      if (!url) return ''
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('/')) return `https://verses.quran.com${url}`
      if (url.includes('mp3')) return `https://verses.quran.com/${url}`
      return url
    },
    resolveAyahAudioUrl(ayah = {}) {
      const direct = typeof ayah.audio === 'string' ? ayah.audio : ''
      const nested = ayah.audio && typeof ayah.audio === 'object'
        ? (ayah.audio.url || ayah.audio.audio || ayah.audio.src || '')
        : ''
      const secondary = Array.isArray(ayah.audioSecondary) ? ayah.audioSecondary[0] : ''
      const secondaryUrl = typeof secondary === 'string'
        ? secondary
        : (secondary?.url || secondary?.audio || secondary?.src || '')
      const fallback = ayah.audioUrl || ayah.audio_url || ayah.url || ''
      return this.normalizeAudioUrl(direct || nested || secondaryUrl || fallback || '')
    },

    getQueueItemAudioSeconds(item = {}, allowCurrentProgress = false) {
      const verse = item.verse || item
      const speedFactor = Math.max(0.25, Number(this.speed || 1))

      if (allowCurrentProgress && this.duration > 0) {
        return Math.max(0, Number(this.duration || 0) - Number(this.currentTime || 0)) / speedFactor
      }

      const explicitDuration = Number(verse.duration || verse.audioDuration || 0)
      if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
        return explicitDuration / speedFactor
      }

      const arabicLength = String(verse.arabic || verse.text || '').replace(/[^ء-ي]/g, '').length || 80
      return Math.max(5, Math.min(45, arabicLength * 0.12)) / speedFactor
    },

    showBanner(message, kind = 'info', ttlMs = 3500, action = null) {
      if (this.bannerTimer) clearTimeout(this.bannerTimer)
      this.banner = {
        message,
        kind,
        at: Date.now(),
        actionKey: action?.key || '',
        actionLabel: action?.label || ''
      }
      this.bannerTimer = setTimeout(() => {
        if (this.banner && Date.now() - this.banner.at >= ttlMs) this.banner = null
      }, ttlMs + 50)
    },

    runBannerAction() {
      const actionKey = this.banner?.actionKey
      this.banner = null
      if (actionKey === 'restart-session') {
        this.startSession()
        return
      }
      if (actionKey === 'open-setup') {
        this.openModeSettings()
      }
    },

    syncMutqinAyahs(verses = this.verses) {
      if (!Array.isArray(verses) || !verses.length) return
      seedAyahs(this.mutqinState, verses)
    },

    syncMutqinSession(queue = this.queue, mode = this.currentMode) {
      const playbackQueue = (queue || []).map(item => {
        const verse = item?.verse || item
        return {
          phase: item?.phase || 'Takrar',
          ayahId: verse?.key || item?.ayahId || null,
          verse,
          segment: item?.segment || null,
          chainKey: item?.chainKey || null,
          sequencePosition: item?.sequencePosition || 1,
          sequenceTotal: item?.sequenceTotal || 1,
          repeatCount: item?.repeatCount || 1,
          totalRepeats: item?.totalRepeats || 1
        }
      }).filter(item => item.ayahId)
      const uniqueVerses = []
      const seen = new Set()
      playbackQueue.forEach(item => {
        if (seen.has(item.ayahId)) return
        seen.add(item.ayahId)
        if (item.verse) uniqueVerses.push(item.verse)
      })
      const planner = createDailyPlan(this.mutqinState, uniqueVerses, {
        repetitions: 1,
        audioDurations: uniqueVerses.reduce((map, verse) => {
          map[verse.key] = Number(verse.duration || this.duration || 0)
          return map
        }, {}),
        reviewSeconds: 18
      })
      const plannerQueue = uniqueVerses.slice(0, 1).map(verse => ({
        phase: 'Planner',
        ayahId: verse.key,
        verse,
        prompt: `${this.currentChapter?.name_simple || 'Session'} ayahs ${this.rangeStart}-${this.rangeEnd}`
      }))
      const recallQueue = uniqueVerses.map(verse => ({
        phase: 'Recall',
        ayahId: verse.key,
        verse,
        prompt: `Recite ayah ${verse.number}`
      }))
      const reviewQueue = planner.reviews.map(ayah => ({ phase: 'Retention', ayahId: ayah.id }))
      const fullQueue = buildSessionQueue({
        planner: plannerQueue,
        takrar: playbackQueue,
        recall: recallQueue,
        review: reviewQueue
      })
      return startMutqinSession(this.mutqinState, {
        mode,
        queue: fullQueue,
        config: this.buildSessionConfig(mode),
        planner: {
          new: planner.new.map(verse => verse.key),
          chains: [],
          reviews: planner.reviews.map(ayah => ayah.id),
          ETA: planner.ETA
        }
      })
    },

    getMutqinAyah(id) {
      return this.mutqinState.ayahs?.[id] || null
    },

    takrarLabel(id) {
      const ayah = this.getMutqinAyah(id)
      if (!ayah) return 'Session progress: ready'
      const step = getTakrarStep(ayah)
      const target = typeof step === 'number' ? `${ayah.repetition_count}/${step}` : step
      return `Session progress: ${target}`
    },

    retentionLabel(id) {
      const ayah = this.getMutqinAyah(id)
      if (!ayah) return 'Review: due soon'
      return `Review: ${ayah.next_review || 'today'}`
    },

    isWeakAyah(key) {
      const ayah = this.mutqinState?.ayahs?.[key]
      return Number(ayah?.weak_count || 0) > 0
    },
    isMasteredAyah(key) {
      const ayah = this.mutqinState?.ayahs?.[key]
      return Number(ayah?.mastery_level || 0) >= 5 || ayah?.status === 'mastered'
    },
    markTakrarHide(verse) {
      this.syncMutqinAyahs([verse])
      hideAyah(this.mutqinState, verse.key)
    },

    markTakrarDone(verse, score) {
      this.syncMutqinAyahs([verse])
      completeTakrarStep(this.mutqinState, verse.key, score)
      scoreRetention(this.mutqinState, verse.key, score)
      if (score === 'Forgot') this.sessionErrorCount += 1
      const previous = this.queue?.[Math.max(0, this.queueIndex - 1)]
      const fromId = previous?.verse?.key || previous?.key
      this.applyChainingResult(verse, score)
      this.recomputeAnalytics()
      this.showBanner(score === 'Forgot' ? 'Marked for review' : 'Progress saved', score === 'Forgot' ? 'info' : 'success', 1400)
    },

    applyChainingResult(verse, score) {
      if (!this.chainingEnabled || !verse?.key) {
        this.persistCentralSessionState()
        return
      }

      const isFailure = score === 'Forgot' || score === false
      if (this.chainingMethod === 'cumulative') {
        this.applyCumulativeResult(verse, isFailure)
      } else {
        this.applyLinkingResult(verse, isFailure)
      }
      this.persistCentralSessionState()
    },

    applyLinkingResult(verse, isFailure) {
      const chaining = this.centralSession.chaining
      const currentEntry = this.queue?.[Math.max(0, Number(this.queueIndex || 0))]
      const segmentIndex = Math.max(0, Number(currentEntry?.segment?.index || currentEntry?.sequencePosition - 1 || 0))

      if (!isFailure) {
        chaining.consecutiveFailures = 0
        chaining.segmentIndex = segmentIndex + 1
        chaining.index = Math.max(0, Number(this.queueIndex || 0) + 1)
        return
      }

      chaining.consecutiveFailures = Number(chaining.consecutiveFailures || 0) + 1
      if (chaining.consecutiveFailures >= 3) {
        const firstAyahSegment = this.queue.findIndex(item => (item?.verse?.key || item?.key) === verse.key)
        this.queueIndex = Math.max(0, firstAyahSegment)
        this.getModeStore(this.currentMode).queueIndex = this.queueIndex
        moveMutqinSession(this.mutqinState, this.queueIndex + 1)
        chaining.segmentIndex = 0
        chaining.index = this.queueIndex
        chaining.consecutiveFailures = 0
        return
      }

      const rollbackIndex = Math.max(0, Number(this.queueIndex || 0) - 1)
      this.queueIndex = rollbackIndex
      this.getModeStore(this.currentMode).queueIndex = this.queueIndex
      moveMutqinSession(this.mutqinState, this.queueIndex + 1)
      chaining.segmentIndex = Math.max(0, segmentIndex - 1)
      chaining.index = rollbackIndex
    },

    applyCumulativeResult(verse, isFailure) {
      const chaining = this.centralSession.chaining
      const currentIndex = Math.max(0, Number(this.queueIndex || 0))

      if (!Array.isArray(chaining.chain)) chaining.chain = []

      if (isFailure) {
        const lastSuccessfulKey = chaining.lastSuccessfulAyahKey
        if (lastSuccessfulKey) {
          const rollbackIndex = chaining.chain.findIndex(item => item.key === lastSuccessfulKey)
          chaining.chain = rollbackIndex >= 0 ? chaining.chain.slice(0, rollbackIndex + 1) : []
          const targetQueueIndex = this.queue.findIndex(item => (item?.verse?.key || item?.key) === lastSuccessfulKey)
          if (targetQueueIndex >= 0) this.queueIndex = targetQueueIndex
        } else {
          chaining.chain = []
          this.queueIndex = 0
        }
        this.getModeStore(this.currentMode).queueIndex = this.queueIndex
        moveMutqinSession(this.mutqinState, this.queueIndex + 1)
        chaining.index = Math.max(0, Number(this.queueIndex || 0))
        return
      }

      if (!chaining.chain.some(item => item.key === verse.key)) {
        chaining.chain.push({ key: verse.key, number: verse.number, masteredAt: Date.now() })
      }
      chaining.lastSuccessfulAyahKey = verse.key
      chaining.index = currentIndex + 1
    },

    handleOnline() {
      this.networkOnline = true
      this.showBanner('Back online. Live APIs are available again.', 'success', 2400)
    },

    handleOffline() {
      this.networkOnline = false
      this.showBanner('Offline mode active. Reading falls back to cached ranges.', 'info', 3200)
    },

    markPlaybackStart() {
      this.playbackStartedAt = Date.now()
    },

    flushPlaybackTime() {
      if (!this.playbackStartedAt) return
      const seconds = Math.max(0, Math.round((Date.now() - this.playbackStartedAt) / 1000))
      this.playbackStartedAt = 0
      if (seconds > 0) {
        this.addActivityEvent({ ts: Date.now(), type: 'time', seconds })
        this.recomputeAnalytics()
      }
    },

    getChainingDescription() {
      if (!this.chainingEnabled) {
        return 'Play ayahs in order without special chaining patterns.'
      }

      if (this.chainingMethod === 'cumulative') {
        return `Cumulative method: Start with first ayah, then add one more each time. Each ayah is repeated ${this.chainingRepetitions} time(s) per cycle.`
      }

      return `Linking method: Practice ayahs individually, then in pairs. Each ayah is repeated ${this.chainingRepetitions} time(s) per cycle.`
    },

    getQueuePreview() {
      if (!this.queue || this.queue.length === 0) return 'No queue built yet'

      const preview = this.queue.slice(0, 10).map(item => {
        const verseNum = item.verse?.number || '?'
        const phase = item.phase === 'Cumulative' ? `C[${item.sequencePosition}/${item.sequenceTotal}]` :
          item.phase === 'Linking' ? `L[${item.sequencePosition}/${item.sequenceTotal}]` :
            'S'
        const repeat = item.repeatCount > 1 ? `✕${item.repeatCount}` : ''
        return `${verseNum}${phase}${repeat}`
      }).join(' → ')

      if (this.queue.length > 10) {
        return preview + ` … +${this.queue.length - 10} more`
      }
      return preview
    },

    handleSessionComplete() {
      if (!this.verses.length) return

      this.sessionCompleted = true
      this.sessionCompletedAt = new Date().toISOString()
      this.centralSession.repetitionTimes = Math.max(0, Number(this.centralSession.repetitionTimes || 0)) + 1
      this.centralSession.sessionStatus = 'completed'
      this.centralSession.sessionCompletedAt = this.sessionCompletedAt
      completeMutqinSession(this.mutqinState)
      this.addActivityEvent({ ts: Date.now(), type: 'session_complete' })
      this.recomputeAnalytics()
      this.persistCentralSessionState()

      const chainingStatus = this.chainingEnabled
        ? `${this.chainingMethod} chaining completed`
        : 'session completed'

      this.showBanner(
        `${chainingStatus}! Great work! 🎉`,
        'success',
        6500,
        { key: 'restart-session', label: 'Start new session' }
      )
    },

    handlePrimaryAction() {
      if (this.isPlaying) {
        if (this.audioElement) this.audioElement.pause()
        this.isPlaying = false
        return
      }
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner('Choose a valid surah and ayah range before starting.', 'info', 3600, { key: 'open-setup', label: 'Open setup' })
        return
      }
      this.startSession()
    },

    validateSettings() {
      const config = this.sessionConfig
      const errors = []

      if (!config.chapterId || config.chapterId === 0) {
        errors.push('No surah selected')
      }

      if (!Number.isFinite(Number(config.rangeStart)) || !Number.isFinite(Number(config.rangeEnd))) {
        errors.push('Verse range must be numeric')
      }

      if (config.rangeStart > config.rangeEnd) {
        errors.push('Invalid verse range')
      }

      if (errors.length > 0) {
        this.showBanner(`Settings issue: ${errors.join(', ')}`, 'warning', 3000)
        return false
      }

      return true
    },
    updateDefaultFontSize() {
      // Clamp the value
      this.defaultFontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, this.defaultFontSize))
      // Save to localStorage
      try {
        localStorage.setItem('telawa.defaultFontSize', JSON.stringify(this.defaultFontSize))
      } catch (e) { }
      // Update all verses
      this.$forceUpdate()
      // Show feedback
      this.showBanner(`Font size: ${this.defaultFontSize}%`, 'info', 600)
    },

    // UI methods
    toggleReadingOption(kind) {
      if (kind === 'translation') {
        this.showTranslation = !this.showTranslation
        this.persistUiState()
      }
      if (kind === 'transliteration') {
        this.showTransliteration = !this.showTransliteration
        this.persistUiState()
      }
      if (kind === 'wbw') {
        this.showWordByWord = !this.showWordByWord
        this.persistUiState()
        // Force re-render to apply word highlighting
        this.$forceUpdate()
      }
      // Show feedback that change was applied
      this.showBanner(`${kind} ${this[kind === 'translation' ? 'showTranslation' : kind === 'transliteration' ? 'showTransliteration' : 'showWordByWord'] ? 'enabled' : 'disabled'}`, 'info', 800)
    },

    setScriptMode(mode) {
      this.script = mode
      this.scheduleLoadVerses(this.currentMode)
    },

    setQuranFont(font) {
      this.quranFont = font
      this.script = 'uthmani'
      this.fontPickerOpen = false
      this.persistUiState()
    },

    toggleFontPicker() {
      this.fontPickerOpen = !this.fontPickerOpen
    },

    cycleTheme() {
      const themes = ['light', 'dark']
      const idx = themes.indexOf(this.theme)
      this.theme = themes[(idx + 1) % themes.length]
      document.documentElement.setAttribute('data-theme', this.theme)
      this.persistUiState()
    },

    toggleSection(key) {
      const nextValue = !this.sectionOpen[key];
      Object.keys(this.sectionOpen).forEach(sectionKey => {
        if (['session_tools', 'live_stats'].includes(sectionKey)) {
          this.sectionOpen[sectionKey] = false;
        }
      });
      this.sectionOpen[key] = nextValue;

      if (key === 'memorisation_techniques') {
        this.enforceMemorisationRules();
      }

    },

    applySettingsChanges(options = {}) {
      const { silent = false } = options
      const next = this.settingsDraft || {}
      this.tajweedEnabled = !!next.tajweedEnabled
      this.showTranslation = !!next.showTranslation
      this.showTransliteration = !!next.showTransliteration
      this.showWordByWord = !!next.showWordByWord
      this.wordByWordAudioEnabled = !!next.wordByWordAudioEnabled
      this.defaultFontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, Number(next.defaultFontSize || 100)))
      try { localStorage.setItem('telawa.defaultFontSize', JSON.stringify(this.defaultFontSize)) } catch { }
      this.persistUiState()
      this.persistCentralSessionState()
      this.syncSettingsDraft()
      if (!silent) this.showBanner('Settings saved', 'success', 1400)
    },

    // Persistence methods
    loadUiState() {
      try {
        const raw = localStorage.getItem('telawa.uiState')
        if (raw) {
          const state = JSON.parse(raw)

          // Only apply if state exists
          if (state) {
            this.theme = state.theme || this.theme
            this.tab = ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(state.tab) ? state.tab : 'tools'
            this.currentMode = state.currentMode || 'beginner'
            this.flowStep = ['learn', 'practice', 'recall'].includes(state.flowStep)
              ? state.flowStep
              : (state.flowStep === 'read' ? 'learn' : state.flowStep === 'listen' ? 'practice' : 'learn')
            this.flowListenPlays = Math.max(0, Number(state.flowListenPlays || 0))
            this.showTranslation = state.showTranslation ?? this.showTranslation
            this.showTransliteration = state.showTransliteration ?? this.showTransliteration
            this.showWordByWord = state.showWordByWord ?? this.showWordByWord
            this.wordByWordAudioEnabled = state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
            this.readingViewMode = ['stacked', 'mushaf'].includes(state.readingViewMode) ? state.readingViewMode : 'stacked'
            this.mushafPageIndex = 0
            this.mushafBackground = ['warm', 'paper', 'contrast', 'night'].includes(state.mushafBackground) ? state.mushafBackground : this.mushafBackground
            this.focusModeEnabled = !!state.focusModeEnabled
            this.blurModeEnabled = !!state.blurModeEnabled
            this.blurIntensity = Math.max(4, Math.min(18, Number(state.blurIntensity ?? this.blurIntensity ?? 10)))
            this.chainingEnabled = state.chainingEnabled ?? this.chainingEnabled
            this.chainingMethod = ['linking', 'cumulative'].includes(state.chainingMethod)
              ? state.chainingMethod
              : this.chainingMethod
            this.chainingRepetitions = Math.max(1, Math.min(5, Number(state.chainingRepetitions || this.chainingRepetitions || 1)))
            this.selectedLoopCount = state.selectedLoopCount === 'infinite'
              ? 'infinite'
              : [1, 3, 5, 10].includes(Number(state.selectedLoopCount))
                ? Number(state.selectedLoopCount)
                : this.selectedLoopCount
            this.repetitionsPerStep = this.selectedLoopCount === 'infinite'
              ? 10
              : Math.max(1, Math.min(50, Number(state.repetitionsPerStep || this.selectedLoopCount || this.repetitionsPerStep || 5)))
            this.gapBetweenVerses = ['none', '1x', '3s', '5s', 'custom'].includes(state.gapBetweenVerses)
              ? state.gapBetweenVerses
              : this.gapBetweenVerses
            this.customGapSeconds = Math.max(0.5, Math.min(10, Number(state.customGapSeconds || this.customGapSeconds || 2)))
            this.defaultFontSize = Number(state.defaultFontSize ?? this.defaultFontSize ?? 100)
            this.fontScale = Math.max(0.9, Math.min(1.2, Number(state.fontScale ?? this.fontScale ?? 1)))
            this.enScale = this.fontScale

            // Anchor Mode settings
            this.anchorModeEnabled = state.anchorModeEnabled ?? false
            this.anchorCount = state.anchorCount ?? 2

            this.settingsDraft = {
              tajweedEnabled: state.tajweedEnabled ?? this.tajweedEnabled ?? false,
              showTranslation: state.showTranslation ?? this.showTranslation,
              showTransliteration: state.showTransliteration ?? this.showTransliteration,
              showWordByWord: state.showWordByWord ?? this.showWordByWord,
              wordByWordAudioEnabled: state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled,
              defaultFontSize: Number(state.defaultFontSize ?? this.defaultFontSize ?? 100)
            }
            this.uiScale = Number(state.uiScale ?? this.uiScale)
            this.quranFont = state.quranFont || this.quranFont
            this.script = state.script || this.script
            this.sectionOpen = { ...this.sectionOpen, ...(state.sectionOpen || {}) }
            this.tajweedEnabled = state.tajweedEnabled ?? false
            this.mainCardCollapsed = !!state.mainCardCollapsed
            this.feedbackCollapsed = !!state.feedbackCollapsed
          }
        }
      } catch (e) {
        console.error('Error loading UI state:', e)
        // Set defaults if loading fails
        this.anchorModeEnabled = false
        this.anchorCount = 2
      }

      this.showTools = false
      this.beginner = this.loadModeState('beginner')
      this.advanced = this.loadModeState('advanced')
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    persistUiState() {

      if (this.isBootstrapping) return
      try {
        localStorage.setItem('telawa.uiState', JSON.stringify({
          anchorModeEnabled: this.anchorModeEnabled,
          anchorCount: this.anchorCount,
          theme: this.theme,
          showTools: this.showTools,
          tab: this.tab,
          currentMode: this.currentMode,
          flowStep: this.flowStep,
          flowListenPlays: this.flowListenPlays,
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord,
          wordByWordAudioEnabled: this.wordByWordAudioEnabled,
          readingViewMode: this.readingViewMode,
          mushafBackground: this.mushafBackground,
          focusModeEnabled: this.focusModeEnabled,
          blurModeEnabled: this.blurModeEnabled,
          blurIntensity: this.blurIntensity,
          defaultFontSize: this.defaultFontSize,
          chainingEnabled: this.chainingEnabled,
          chainingMethod: this.chainingMethod,
          chainingRepetitions: this.chainingRepetitions,
          repetitionsPerStep: this.repetitionsPerStep,
          selectedLoopCount: this.selectedLoopCount,
          gapBetweenVerses: this.gapBetweenVerses,
          customGapSeconds: this.customGapSeconds,
          fontScale: this.fontScale,
          uiScale: this.uiScale,
          enScale: this.enScale,
          quranFont: this.quranFont,
          script: this.script,
          sectionOpen: this.sectionOpen,
          tajweedEnabled: this.tajweedEnabled,
          mainCardCollapsed: this.mainCardCollapsed,
          feedbackCollapsed: this.feedbackCollapsed,

        }))
      } catch (e) {
        console.error('Failed to persist UI state:', e)
      }
      this.persistCentralSessionState()
      this.persistModeState('beginner')
      this.persistModeState('advanced')
    },

    persistSessionState() {
      if (this.isBootstrapping) return
      const mode = this.currentMode
      try {
        localStorage.setItem(SESSION_STORAGE_KEYS[mode], JSON.stringify({
          activeKey: this.activeKey,
          activeVerseKey: this.activeVerseKey,
          queueIndex: this.queueIndex,
          completed: !!this.sessionCompleted,
          completedAt: this.sessionCompletedAt,
          timestamp: Date.now()
        }))
      } catch (e) { console.error(e) }
    },

    restoreSessionState() {
      ;['beginner', 'advanced'].forEach(mode => {
        const saved = localStorage.getItem(SESSION_STORAGE_KEYS[mode])
        if (!saved) return
        try {
          const state = JSON.parse(saved)
          if (state.completed) return
          if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
            const target = mode === 'beginner' ? this.beginner : this.advanced
            const restoredKey = state.activeVerseKey || state.activeKey || null
            target.activeKey = restoredKey
            target.queueIndex = Number(state.queueIndex || 0)
            if (mode === this.currentMode) {
              this.activeVerseKey = restoredKey
              this.activeKey = restoredKey
              this.queueIndex = target.queueIndex
            }
          }
        } catch (e) {
          console.error('Failed to restore session:', e)
        }
      })
    },

    persistAudioState() {
      if (this.isBootstrapping) return
      try {
        localStorage.setItem('telawa.audioState', JSON.stringify({
          src: this.audioElement?.currentSrc || '',
          currentTime: this.currentTime || 0,
          playerVisible: this.playerVisible,
          speed: this.speed,
          isPlaying: this.isPlaying
        }))
      } catch (e) {
        console.error('Failed to persist audio state:', e)
      }
      this.persistContinueSession()
    },

    persistAllState() {
      this.persistUiState()
      this.persistSessionState()
      this.persistCentralSessionState()
      this.persistAudioState()
      this.persistContinueSession()
      this.persistPlanner()
      this.persistTodayPlan()
      this.persistSm2()
      saveMutqinState(this.mutqinState)
    },

    async loadChapters() {
      try {
        const res = await axios.get('https://api.quran.com/api/v4/chapters', { params: { language: 'en' } })
        this.chapters = res.data?.chapters || []
        if (this.chapterId) await this.loadChapter()
      } catch (e) {
        console.error('Failed to load chapters:', e)
        this.showBanner('Failed to load surah list', 'error', 3000)
      }
    },

    async loadChapter(mode = this.currentMode) {
      const target = mode === 'beginner' ? this.beginner : this.advanced
      const chapterId = Number(target.chapterId || 0)
      if (!chapterId) {
        this.currentChapter = null
        return
      }
      this.currentChapter = this.chapters.find(c => c.id === chapterId)
      const max = this.currentChapter?.verses_count || 286

      if (mode === 'beginner') {
        this.beginner.rangeEnd = Math.min(this.beginner.rangeEnd, max)
        this.beginner.rangeStart = Math.max(1, this.beginner.rangeStart)
      } else {
        this.advanced.rangeEnd = Math.min(this.advanced.rangeEnd, max)
        this.advanced.rangeStart = Math.max(1, this.advanced.rangeStart)
      }
      await this.loadVerses(mode)
    },

    async loadReciters() {
      try {
        const res = await getEditions({ format: 'audio' })
        const list = res.data?.data || []
        if (!list.length) return

        const allow = [
          { id: 'ar.alafasy', label: 'Alafasy' },
          { id: 'ar.abdulbasitmurattal', label: 'Abdul basit' },
          { id: 'ar.abdurrahmaansudais', label: 'al sudais' },
          { id: 'ar.hanirifai', label: 'hani rifai' },
          { id: 'ar.husary', label: 'husari' },
          { id: 'ar.minshawi', label: 'minshawi' },
          { id: 'ar.saoodshuraym', label: 'ash-shuraym' }
        ]

        const available = new Map(list.map(edition => [edition.identifier, edition]))
        const filtered = allow
          .filter(entry => available.has(entry.id))
          .map(entry => ({ id: entry.id, name: entry.label }))

        this.reciters = filtered.length
          ? filtered
          : list
            .filter(edition => edition.format === 'audio')
            .map(edition => ({
              id: edition.identifier,
              name: edition.englishName || edition.name || edition.identifier
            }))

        if (!this.reciters.some(reciter => reciter.id === this.reciterId)) {
          this.reciterId = this.reciters[0]?.id || DEFAULT_ALQURAN_RECITER
        }
      } catch (e) { console.error(e) }
    },

    loadSavedSessions() {
      try {
        this.ensureSeededSavedSessions()
        this.savedSessions = JSON.parse(localStorage.getItem(this.savedSessionsStorageKey()) || '[]')
          .map(session => this.normalizeSavedSessionRecord(session))
          .filter(Boolean)
        if (!this.savedSessions.some(session => session.id === this.selectedStatsSessionId)) {
          this.selectedStatsSessionId = this.savedSessions[0]?.id || ''
        }
      } catch {
        this.savedSessions = []
        this.selectedStatsSessionId = ''
      }
    },

    loadSm2() {
      try { this.sm2 = JSON.parse(localStorage.getItem('telawa.sm2') || '{}') } catch { this.sm2 = {} }
    },

    persistSm2() {
      try { localStorage.setItem('telawa.sm2', JSON.stringify(this.sm2)) } catch (e) { console.error(e) }
    },

    loadEvents() {
      try { this.events = JSON.parse(localStorage.getItem('telawa.events') || '[]') } catch { this.events = [] }
    },

    loadPlanner() {
      try { this.plannerState = JSON.parse(localStorage.getItem('telawa.planner') || 'null') } catch { this.plannerState = null }
      if (!this.plannerState) {
        this.plannerState = { settings: { dailyMinutes: 20, newAyat: 5, reviewCards: 15 } }
      }
      this.loadTodayPlan()
    },

    loadTodayPlan() {
      try { this.todayPlan = JSON.parse(localStorage.getItem('telawa.todayPlan') || 'null') } catch { this.todayPlan = null }
    },

    persistPlanner() {
      try { localStorage.setItem('telawa.planner', JSON.stringify(this.plannerState)) } catch (e) { console.error(e) }
    },

    persistTodayPlan() {
      try { localStorage.setItem('telawa.todayPlan', JSON.stringify(this.todayPlan)) } catch (e) { console.error(e) }
    },

    loadMetrics() {
      try { this.metrics = JSON.parse(localStorage.getItem('telawa.metrics') || 'null') } catch { this.metrics = null }
      if (!this.metrics) this.metrics = { avgAyahSeconds: 10, durationsByVerse: {} }
    },

    loadAnalytics() {
      try {
        const raw = localStorage.getItem('telawa.analytics') || 'null'
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') {
          this.analytics = { ...this.analytics, ...saved }
        }
      } catch { }
      this.recomputeAnalytics()
    },

    persistAnalytics() {
      try { localStorage.setItem('telawa.analytics', JSON.stringify(this.analytics)) } catch { }
    },

    getActivityDayKey(ts = Date.now()) {
      return new Date(ts).toISOString().slice(0, 10)
    },

    addActivityEvent(event) {
      try {
        const raw = localStorage.getItem('telawa.activity') || '[]'
        const list = JSON.parse(raw)
        if (!Array.isArray(list)) return
        list.push(event)
        // cap to keep it lightweight
        while (list.length > 5000) list.shift()
        localStorage.setItem('telawa.activity', JSON.stringify(list))
      } catch { }
    },

    readActivityEvents() {
      try {
        const raw = localStorage.getItem('telawa.activity') || '[]'
        const list = JSON.parse(raw)
        return Array.isArray(list) ? list : []
      } catch {
        return []
      }
    },

    recomputeAnalytics() {
      const events = this.readActivityEvents()
      const now = Date.now()
      const dayKeys = []
      for (let i = 6; i >= 0; i--) {
        dayKeys.push(this.getActivityDayKey(now - i * 86400000))
      }

      const weeklyVerses = new Array(7).fill(0)
      const weeklyMinutes = new Array(7).fill(0)
      const versesReadSet = new Set()
      let totalSeconds = 0
      let totalPlays = 0
      let sessionsCompleted = 0
      const daysWithAny = new Set()

      for (const ev of events) {
        const ts = Number(ev?.ts || 0)
        if (!ts) continue
        const dayKey = this.getActivityDayKey(ts)
        daysWithAny.add(dayKey)
        const idx = dayKeys.indexOf(dayKey)

        if (ev.type === 'play') {
          totalPlays += 1
          if (ev.verseKey) versesReadSet.add(String(ev.verseKey))
          if (idx >= 0) weeklyVerses[idx] += 1
        }

        if (ev.type === 'time') {
          const sec = Math.max(0, Number(ev.seconds || 0))
          totalSeconds += sec
          if (idx >= 0) weeklyMinutes[idx] += sec / 60
        }

        if (ev.type === 'session_complete') {
          sessionsCompleted += 1
        }
      }

      // streak: consecutive days ending today with any activity
      const todayKey = this.getActivityDayKey(now)
      let streak = 0
      for (let i = 0; i < 365; i++) {
        const key = this.getActivityDayKey(now - i * 86400000)
        if (daysWithAny.has(key)) streak += 1
        else break
      }

      this.analytics.totalVersesRead = versesReadSet.size
      this.analytics.totalRepetitions = totalPlays
      this.analytics.sessionsCompleted = sessionsCompleted
      this.analytics.totalTimeSpent = Math.round(totalSeconds / 60)
      this.analytics.currentStreak = todayKey && streak ? streak : 0
      this.analytics.weeklyVerses = weeklyVerses
      this.analytics.weeklyMinutes = weeklyMinutes.map(m => Math.round(m))
      const mutqinStats = this.mutqinState?.stats || {}
      this.analytics.versesMastered = Number(mutqinStats.ayahs_memorised || this.analytics.versesMastered || 0)
      this.analytics.totalRepetitions = Math.max(this.analytics.totalRepetitions, Number(mutqinStats.repetitions || 0))
      this.analytics.sessionsCompleted = Math.max(this.analytics.sessionsCompleted, Number(mutqinStats.sessions_completed || 0))
      // Chaining-related stat removed (weak_transitions). Keep field stable.
      this.simpleStats.weak = 0
      this.weakVersesList = Object.values(this.mutqinState?.ayahs || {}).filter(ayah => Number(ayah.weak_count || 0) > 0)
      this.persistAnalytics()
      this.updateMasteredWeekly()
    },

    estimateKeysSeconds(keys = []) {
      return keys.length * 10
    },

    migrateLocalStorage() {
      const key = 'telawa.schemaVersion'
      if (!localStorage.getItem(key)) localStorage.setItem(key, '2')
      if (localStorage.getItem(key) === '1') {
        try {
          const raw = localStorage.getItem('telawa.uiState')
          if (raw) {
            const state = JSON.parse(raw)
            if (state.beginner && !localStorage.getItem(MODE_STORAGE_KEYS.beginner)) {
              localStorage.setItem(MODE_STORAGE_KEYS.beginner, JSON.stringify(this.cloneModeState({
                ...createBeginnerState(),
                ...state.beginner
              })))
            }
            if (state.advanced && !localStorage.getItem(MODE_STORAGE_KEYS.advanced)) {
              localStorage.setItem(MODE_STORAGE_KEYS.advanced, JSON.stringify(this.cloneModeState({
                ...createAdvancedState(),
                ...state.advanced
              })))
            }
          }
          localStorage.setItem(key, '2')
        } catch (e) { console.error(e) }
      }
    },

    loadBookmarksPins() {
      try { this.bookmarks = JSON.parse(localStorage.getItem(this.userStorageKey('bookmarks')) || '[]') } catch { this.bookmarks = [] }
      try { this.pins = JSON.parse(localStorage.getItem(this.userStorageKey('pins')) || '[]') } catch { this.pins = [] }
    },

    userStorageKey(suffix) {
      const uid = this.auth?.id || 'guest'
      return `telawa.${suffix}.${uid}`
    },

    resetControls() {
      this.openConfirmModal({
        title: 'Reset Session Controls?',
        message: 'This will reset all session settings to defaults. Your progress will not be lost.',
        confirmLabel: 'Reset',
        cancelLabel: 'Cancel',
        tone: 'warning',
        action: 'reset-session'
      })
    },

    performResetControls() {
      // Reset all session settings
      this.rangeStart = 1
      this.rangeEnd = 7
      this.speed = 1
      this.delay = 2
      this.chainingEnabled = true
      this.chainingMethod = 'linking'
      this.chainingRepetitions = 1
      this.playMode = 'auto'
      this.order = 'seq'
      this.focusModeEnabled = false
      this.blurModeEnabled = false
      this.anchorModeEnabled = false
      
      // Apply changes
      this.applySpeed()
      this.rebuildQueue()
      this.persistAllState()
      
      // Show feedback and keep panel open if needed
      this.showBanner('Session controls reset to defaults', 'success', 2000)
      
      // Don't close panel automatically - let user decide
    },

    adjustRange() {
      this.clampControlRange(this.currentMode)
      this.applyWorkspaceControls({ reason: 'range' })
    },

    onChapterChange(event) {
      const nextChapterId = Number.parseInt(event.target.value, 10) || 0
      this.chapterId = nextChapterId
      const selectedChapter = this.chapters.find(chapter => Number(chapter.id) === nextChapterId) || null
      this.currentChapter = selectedChapter
      if (selectedChapter) {
        this.rangeStart = 1
        this.rangeEnd = Math.min(7, Number(selectedChapter.verses_count || 7))
      }
      this.applyWorkspaceControls({ reason: 'chapter' })
    },

    refreshVerses() {
      this.applyWorkspaceControls({ reason: 'reciter' })
    },

    // Quiz methods
    startQuiz() {
      if (!this.verses.length) {
        this.showBanner('No verses to quiz on', 'info', 3000)
        return
      }
      this.quizQueue = this.verses.slice(0, 5).map(v => ({ ...v, type: 'flashcard' }))
      this.quizIndex = 0
      this.quizScore = 0
      this.quizMistakes = []
      this.quizComplete = false
      this.quizActive = true
      this.nextQuizCard()
    },

    nextQuizCard() {
      if (this.quizIndex >= this.quizQueue.length) {
        this.quizComplete = true
        return
      }
      this.quizCard = this.quizQueue[this.quizIndex]
      this.quizRevealed = false
    },

    submitQuiz(quality = 4) {
      if (quality >= 4) this.quizScore++
      else this.quizMistakes.push(`Ayah ${this.quizCard.number}`)
      this.quizIndex++
      this.nextQuizCard()
    },

    stopQuiz() {
      this.quizActive = false
      this.quizCard = null
      this.quizQueue = []
      this.quizComplete = false
    },

    restartQuiz() {
      this.quizScore = 0
      this.quizMistakes = []
      this.quizComplete = false
      this.quizIndex = 0
      this.nextQuizCard()
    },

    async playWordAudio(url, verse = null, wordIndex = null) {
      const directUrl = this.normalizeAudioUrl(typeof url === 'string' ? url : '')
      const targetVerse = verse?.key ? verse : (this.activeVerseRef || null)
      const targetIndex = Number.isFinite(Number(wordIndex)) ? Number(wordIndex) : -1

      if (!this.wordByWordAudioEnabled) {
        this.showBanner('Enable Word audio to preview individual words.', 'info', 1600)
        return
      }

      if (!this.audioElement) {
        this.audioElement = this.$refs.audio
      }

      if (directUrl) {
        try {
          if (this.audioElement) {
            this.segmentEndTime = 0
            this.segmentPlaybackKind = ''
            this.audioElement.pause()
            this.audioElement.src = directUrl
            this.audioElement.currentTime = 0
            this.audioElement.playbackRate = this.speed
            await this.audioElement.play()
            this.playerVisible = true
            this.isPlaying = true
            this.markPlaybackStart()
            return
          }
        } catch { }

        new Audio(directUrl).play().catch(() => { })
        return
      }

      if (!targetVerse?.audio || targetIndex < 0) {
        this.showBanner('Word audio is not available for this word.', 'info', 1800)
        return
      }

      const verseAudioUrl = this.normalizeAudioUrl(targetVerse.audio)
      if (!verseAudioUrl || !this.audioElement) {
        this.showBanner('Audio system not ready', 'error', 2200)
        return
      }

      const currentSrc = this.audioElement.currentSrc ? this.normalizeAudioUrl(this.audioElement.currentSrc) : ''

      try {
        this.segmentEndTime = 0
        this.segmentPlaybackKind = ''
        this.stopWordHighlighting()
        this.setActiveVerse(targetVerse.key, { scroll: false })
        this.playerVisible = true

        if (currentSrc !== verseAudioUrl) {
          this.audioElement.pause()
          this.audioElement.src = verseAudioUrl
          this.audioElement.load()
          await new Promise((resolve, reject) => {
            const onLoaded = () => {
              this.audioElement.removeEventListener('loadedmetadata', onLoaded)
              this.audioElement.removeEventListener('error', onError)
              resolve()
            }
            const onError = () => {
              this.audioElement.removeEventListener('loadedmetadata', onLoaded)
              this.audioElement.removeEventListener('error', onError)
              reject(new Error('word-audio-load-failed'))
            }
            this.audioElement.addEventListener('loadedmetadata', onLoaded, { once: true })
            this.audioElement.addEventListener('error', onError, { once: true })
          })
        }

        const timestamps = await this.ensureWordHighlightTrack(targetVerse, { force: true })
        const timing = Array.isArray(timestamps) ? timestamps[targetIndex] : null
        if (!timing) {
          this.showBanner('Word timing unavailable for this ayah.', 'info', 1800)
          return
        }

        const segmentStart = Math.max(0, Number(timing.start || 0))
        const segmentEnd = Math.max(segmentStart + 0.12, Number(timing.end || timing.start || 0))

        this.segmentPlaybackKind = 'word'
        this.segmentEndTime = segmentEnd
        this.audioElement.currentTime = segmentStart
        this.audioElement.playbackRate = this.speed
        this.updateWordHighlight(targetVerse.key, targetIndex)
        await this.audioElement.play()
        this.isPlaying = true
        this.markPlaybackStart()
      } catch (error) {
        console.error('Word playback failed:', error)
        this.segmentEndTime = 0
        this.segmentPlaybackKind = ''
        this.showBanner('Unable to play this word right now.', 'error', 2200)
      }
    },
  }
}
</script>

<style>
/* Range control styling - consistent with other sections */
.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.technique-range {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: var(--border);
  -webkit-appearance: none;
  cursor: pointer;
}

.technique-range:focus {
  outline: none;
}

.technique-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.technique-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

/* Field header with value pill */
.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.field-header label {
  margin-bottom: 0;
  font-weight: 600;
}

.range-value-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 4px 12px;
  background: var(--accent-light);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

/* Slider markers */
.slider-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
}

.slider-markers span {
  font-size: 10px;
  color: var(--text-muted);
}

/* Gap options as radio cards */
.gap-options {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
}

.gap-options .radio {
  flex-direction: column;
  text-align: center;
  gap: 4px;
  padding: 10px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gap-options .radio.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.gap-options .radio.active .option-label,
.gap-options .radio.active .option-desc {
  color: white;
}

.gap-options .radio input {
  display: none;
}

.option-label {
  display: block;
  font-weight: 600;
  font-size: 0.85rem;
}

.option-desc {
  display: block;
  font-size: 0.65rem;
  opacity: 0.7;
}

/* Custom gap control */
.custom-gap-control {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.inline-setting-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 6px 12px;
  background: var(--accent-light);
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
}

.mt-2 {
  margin-top: 12px;
}
/* Fix offcanvas positioning - add to your existing styles */
.tools {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(var(--tools-width, 440px), 92vw);
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.98), rgba(247, 240, 231, 0.96));
  border-left: 1px solid var(--border);
  backdrop-filter: blur(16px);
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
  will-change: transform;
}

.tools.open {
  transform: translateX(0);
}

/* Fix backdrop */
.tools-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
  animation: fadeIn 0.2s ease;
}

/* Fix tools header spacing */
.tools-top {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
  background: inherit;
  flex-shrink: 0;
}

/* Fix tools body scrolling */
.tools-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Fix tools footer */
.tools-footer {
  position: relative;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: inherit;
  flex-shrink: 0;
}

/* Fix tab buttons */
.tools-tabs {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 14px;
  padding: 6px;
}

.tools-tabs button {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  background: transparent;
  border: none;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tools-tabs button.active {
  background: var(--surface-strong);
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tools-tabs button:hover:not(.active) {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text);
}

.setup-summary-card {
  margin: 0 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  padding: 10px 12px;
}

.setup-summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.setup-summary-label {
  color: var(--text-muted);
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.setup-summary-value {
  font-size: 0.9rem;
  font-weight: 650;
  color: var(--text);
  text-align: right;
}

.offcanvas-launcher-head {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}

.offcanvas-launcher-kicker {
  color: var(--text-muted);
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.offcanvas-launcher-title {
  font-size: 1.12rem;
  line-height: 1.22;
}

.offcanvas-launcher-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin: 0 0 14px;
  color: rgba(237, 243, 240, 0.86);
}

.offcanvas-launcher-steps span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.86rem;
}

/* Fix button styles */
.tools-btn {
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tools-btn-soft {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text);
}

.tools-btn-soft:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.tools-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.tools-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.4);
}

/* Fix close button */
.tools-x {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(154, 103, 56, 0.28);
  background: rgba(255, 253, 249, 0.98);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5c4633;
  box-shadow: 0 10px 24px rgba(61, 40, 20, 0.08);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.tools-x-glyph {
  display: inline-block;
  font-size: 1.55rem;
  line-height: 1;
  font-weight: 500;
  transform: translateY(-1px);
}

.tools-x:hover {
  border-color: rgba(154, 103, 56, 0.45);
  background: rgba(248, 236, 222, 0.98);
  transform: rotate(90deg);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .tools {
    width: 100vw;
    max-width: 100vw;
  }
  
  .tools-tabs button span {
    display: none;
  }
  
  .tools-tabs button i {
    font-size: 1.2rem;
  }
  
  .tools-tabs button {
    padding: 12px;
  }
  
  .tools-body {
    padding: 16px;
  }
}

/* Animation for backdrop */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
:root {
  --bg: #f3eee6;
  --surface: rgba(255, 250, 243, 0.88);
  --surface-strong: rgba(255, 255, 255, 0.92);
  --border: rgba(78, 58, 38, 0.10);
  --text: #1f1a17;
  --text-muted: #6c6258;
  --accent: #9a6738;
  --accent-strong: #6e4726;
  --accent-soft: #d8c1a8;
  --accent-light: rgba(154, 103, 56, 0.10);
  --accent-wash: rgba(228, 211, 194, 0.42);
  --shadow-sm: 0 8px 20px rgba(63, 39, 18, 0.08);
  --shadow-md: 0 16px 36px rgba(63, 39, 18, 0.12);
  --shadow-lg: 0 28px 70px rgba(63, 39, 18, 0.16);
  --radius: 16px;
  --navbar-offset: 56px;
  --tools-width: 440px;
  --tools-footer-h: 78px;
  --font-ar: 'UthmanicHafs', 'Amiri', 'Noto Naskh Arabic', serif;
  --font-ui: "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}

[data-theme="dark"] {
  --bg: #14110f;
  --surface: rgba(31, 27, 24, 0.92);
  --surface-strong: rgba(43, 37, 32, 0.96);
  --border: rgba(255, 236, 216, 0.16);
  --text: #f7ebdf;
  --text-muted: #d1c2b3;
  --accent: #d0a06b;
  --accent-strong: #efc18d;
  --accent-soft: #5f4530;
  --accent-light: rgba(208, 160, 107, 0.14);
  --accent-wash: rgba(208, 160, 107, 0.08);
  --shadow-sm: 0 10px 24px rgba(0, 0, 0, 0.28);
  --shadow-md: 0 18px 42px rgba(0, 0, 0, 0.34);
  --shadow-lg: 0 30px 80px rgba(0, 0, 0, 0.42);
}

[data-theme="sepia"] {
  --bg: #efe2cb;
  --surface: rgba(250, 241, 227, 0.88);
  --surface-strong: rgba(255, 248, 237, 0.94);
  --text: #352516;
  --text-muted: #75624f;
  --accent: #b8824e;
  --accent-strong: #8f6033;
  --accent-soft: #dcc3a6;
  --accent-light: rgba(184, 130, 78, 0.12);
  --accent-wash: rgba(221, 194, 162, 0.35);
}

[v-cloak] {
  display: none !important;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.session-setup {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-section {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-weight: 500;
  color: var(--text);
}

.section-header i {
  font-size: 18px;
  color: var(--text-muted);
}

.section-content {
  padding: 20px;
}

/* Slider styles */
.slider-wrapper {
  width: 100%;
}

.form-range {
  width: 100%;
  height: 4px;
  padding: 0;
  background: var(--border);
  border-radius: 4px;
  -webkit-appearance: none;
}

.form-range:focus {
  outline: none;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #2c7a4d;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.form-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.repetition-value {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.repetition-value strong {
  color: #2c7a4d;
  font-weight: 600;
}

/* Select styles */
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  background-color: var(--surface-strong);
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #2c7a4d;
  box-shadow: 0 0 0 2px rgba(44, 122, 77, 0.1);
}

/* Input group */
.input-group {
  display: flex;
  align-items: stretch;
}

.form-control {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #2c7a4d;
}

.input-group-text {
  padding: 8px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-left: none;
  border-radius: 0 8px 8px 0;
  font-size: 14px;
  color: #6b7280;
}

/* Hint */
.setting-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
}

.setting-hint i {
  font-size: 14px;
  color: #9ca3af;
}

.mt-2 {
  margin-top: 12px;
}

.session-setup-tab {
  padding: 20px;
  max-width: 600px;
}

.setting-group {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.section-label {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
  display: block;
  color: #333;
}

/* Feature 1: Repetitions Control */
.repetition-control {
  margin-top: 8px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.repetition-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
}

.repetition-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #2c7a4d;
  cursor: pointer;
}

.slider-value {
  min-width: 60px;
  text-align: center;
}

.slider-value .value {
  font-size: 18px;
  font-weight: 600;
  color: #2c7a4d;
}

.slider-value .unit {
  font-size: 14px;
  color: #666;
  margin-left: 4px;
}

/* Techniques Grid */
.techniques-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.technique-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* Feature 2: Audio Settings */
.audio-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.setting-item label {
  font-size: 14px;
  color: #555;
  min-width: 120px;
}

.setting-item select,
.setting-item input[type="number"] {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
  font-style: italic;
}

/* Responsive */
@media (max-width: 480px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .setting-item label {
    min-width: auto;
  }
}

.mode-radio,
.tools-tabs button.mode-radio {
  flex: 0 0 34px !important;
  width: 34px !important;
  min-width: 34px !important;
  max-width: 34px !important;
  height: 34px !important;
  min-height: 34px !important;
  padding: 0 !important;
  border-radius: 50% !important;
}

.session-setup {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 500px;
  margin: 0 auto;
}

/* Setting Card */
.setting-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.2s ease;
}

.card-header {
  padding: 20px 20px 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-icon {
  font-size: 24px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.card-content {
  padding: 16px 20px 20px 20px;
}

/* Repetitions Control */
.repetition-control {
  width: 100%;
}

.repetition-stats {
  text-align: center;
  margin-bottom: 20px;
}

.repetition-value {
  font-size: 48px;
  font-weight: 700;
  color: #2c7a4d;
  line-height: 1;
}

.repetition-unit {
  font-size: 14px;
  color: #666;
  margin-left: 8px;
}

.repetition-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #2c7a4d 0%, #2c7a4d 0%, #e5e7eb 0%, #e5e7eb 100%);
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.repetition-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2c7a4d;
  box-shadow: 0 2px 6px rgba(44, 122, 77, 0.3);
  cursor: pointer;
  border: 2px solid white;
}

.repetition-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.repetition-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding: 0 4px;
}

.repetition-markers span {
  font-size: 11px;
  color: #999;
}

.setting-hint {
  font-size: 13px;
  color: #888;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f9fafb;
  padding: 10px 12px;
  border-radius: 12px;
}

.hint-icon {
  font-size: 14px;
}

/* Gap Options */
.gap-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.gap-option {
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gap-option:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.gap-option.active {
  background: #2c7a4d;
  border-color: #2c7a4d;
  color: white;
}

.option-label {
  display: block;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.option-desc {
  display: block;
  font-size: 11px;
  opacity: 0.7;
}

.gap-option.active .option-label,
.gap-option.active .option-desc {
  color: white;
}

/* Custom Gap */
.custom-gap {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.custom-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2c7a4d;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.custom-gap-value {
  text-align: center;
  margin-top: 12px;
}

.custom-gap-value .value {
  font-size: 28px;
  font-weight: 600;
  color: #2c7a4d;
}

.custom-gap-value .unit {
  font-size: 14px;
  color: #666;
  margin-left: 6px;
}

/* Responsive */
@media (max-width: 480px) {
  .session-setup {
    padding: 16px;
  }
  
  .gap-options {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .repetition-value {
    font-size: 40px;
  }
}

/* Enhanced Save Modal Styles */
.save-name-modal {
  max-width: 680px;
  width: 100%;
  animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 20px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--surface), var(--surface-strong));
}

.modal-header-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-header-icon i {
  font-size: 1.5rem;
  color: white;
}

.modal-header-text {
  flex: 1;
}



.modal-header-text h2 {
  margin: 0 0 4px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
}

.modal-header-text p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.session-exit-modal {
  max-width: 520px;
}

.session-exit-recap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.session-exit-recap span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  font-size: 0.74rem;
  font-weight: 600;
}

.session-exit-autosave {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: var(--text);
  font-size: 0.82rem;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: var(--accent-light);
  color: var(--accent);
  transform: rotate(90deg);
}

/* Session Preview Card */
.session-preview-card {
  background: linear-gradient(135deg, var(--accent-light), var(--accent-wash));
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.preview-surah,
.preview-range {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--surface);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}

.preview-surah i,
.preview-range i {
  color: var(--accent);
  font-size: 0.9rem;
}

.preview-stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.preview-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.preview-stat i {
  font-size: 0.7rem;
  color: var(--accent);
}

/* Name Input Group */
.name-input-group {
  margin-bottom: 20px;
}

.name-input-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.name-input-group label i {
  color: var(--accent);
  font-size: 0.9rem;
}

.name-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: var(--surface);
  font-size: 0.95rem;
  color: var(--text);
  transition: all 0.2s;
}

.name-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.name-input.error {
  border-color: #dc3545;
}

.input-hint {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.char-count {
  font-family: monospace;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 8px;
  font-size: 0.75rem;
  color: #dc3545;
}

.error-message i {
  font-size: 0.8rem;
}

/* Quick Suggestions */
.quick-suggestions {
  margin-bottom: 20px;
}

.suggestions-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 10px;
  font-weight: 500;
}

.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.75rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-1px);
}

/* Info Note */
.info-note {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(46, 125, 50, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(46, 125, 50, 0.12);
}

.info-note i {
  color: #2e7d32;
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-text {
  flex: 1;
}

.info-text strong {
  display: block;
  font-size: 0.7rem;
  color: #2e7d32;
  margin-bottom: 4px;
}

.info-text span {
  display: inline-block;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-right: 8px;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--accent-light);
  border-color: var(--accent);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border: none;
  color: white;
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Dark mode support */
[data-theme="dark"] .session-preview-card {
  background: rgba(208, 160, 107, 0.1);
}

[data-theme="dark"] .info-note {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.2);
}

[data-theme="dark"] .info-note i {
  color: #81c784;
}

[data-theme="dark"] .info-text strong {
  color: #81c784;
}

/* Responsive */
@media (max-width: 560px) {
  .session-preview-card {
    flex-direction: column;
    align-items: stretch;
  }
  
  .preview-stats {
    margin-left: 0;
    justify-content: space-between;
  }
  
  .modal-header {
    padding: 20px;
  }
  
  .modal-footer {
    padding: 16px 20px;
    flex-direction: column;
  }
  
  .suggestion-chips {
    justify-content: center;
  }
}

.wbw-word {
  display: inline-block;
  position: relative;
  margin: 0 2px;
  padding: 2px 4px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.wbw-word .word-audio-btn {
  position: absolute;
  top: -12px;
  right: -8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.wbw-word:hover .word-audio-btn {
  opacity: 1;
}

.wbw-word.highlighted {
  background: var(--accent);
  color: white;
}

/* Combined Tajweed + Word Highlighting */
.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word {
  display: inline-block;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 0 2px;
  cursor: pointer;
}

.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word.highlighted {
  background: var(--accent);
  color: white !important;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word:hover {
  background: var(--accent-light);
  cursor: pointer;
}

/* Preserve tajweed colors inside highlighted words but make them visible */
.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word.highlighted [class*="tajweed-"],
.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word.highlighted .tajweed-mark {
  color: inherit !important;
  background: transparent !important;
}

/* Field header for toggle chips - matching Techniques tab */
.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.field-header label {
  margin-bottom: 0;
}

/* Range value pill */
.range-value-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 4px 10px;
  background: var(--accent-light);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
}

/* Setting items - matching Techniques tab style */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item-range {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.setting-description {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Range control compact */
.range-control-compact {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.range-value-badge {
  min-width: 60px;
  padding: 6px 12px;
  background: var(--accent-light);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  text-align: center;
}

.range-slider {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: var(--border);
  -webkit-appearance: none;
}

.range-slider:focus {
  outline: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--surface);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

/* Larger toggle chips for settings */
.setting-item .toggle-chip {
  min-height: 38px;
  min-width: 80px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Responsive */
@media (max-width: 640px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 14px 0;
  }

  .setting-item .toggle-chip {
    align-self: flex-start;
  }

  .setting-label {
    font-size: 0.95rem;
  }

  .setting-description {
    font-size: 0.75rem;
  }

  .range-control-compact {
    gap: 12px;
  }

  .range-value-badge {
    min-width: 55px;
    padding: 5px 10px;
    font-size: 0.8rem;
  }
}

/* Inline field for toggle chips */
.field-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.field-label-group {
  flex: 1;
  min-width: 0;
}

.field-label-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.field-label-group label i {
  font-size: 0.9rem;
  color: var(--accent);
}

.field-label-group small {
  display: block;
  font-size: 0.65rem;
  color: var(--text-muted);
}

/* Range control */
.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-control .input {
  flex: 1;
}

/* Responsive */
@media (max-width: 640px) {
  .field-inline {
    flex-direction: column;
    align-items: stretch;
  }

  .field-inline .toggle-chip {
    align-self: flex-start;
  }
}

/* Settings Container */
.settings-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 20px;
}

/* Settings Group */
.settings-group {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
}

.settings-group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--surface-strong);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
}

.settings-group-header i {
  font-size: 1rem;
}

/* Settings Stack */
.settings-stack {
  display: flex;
  flex-direction: column;
}

/* Settings Row */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s ease;
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-row:hover {
  background: var(--accent-light);
}

.settings-row-info {
  flex: 1;
}

.settings-row-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 4px;
}

.settings-row-label i {
  font-size: 1rem;
  color: var(--accent);
  width: 20px;
}

.settings-row-desc {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-left: 30px;
}

/* Range Row */
.settings-row-range {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.settings-range-control {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 30px;
}

.range-value {
  min-width: 50px;
  padding: 4px 8px;
  background: var(--accent-light);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  text-align: center;
}

.settings-range-input {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  -webkit-appearance: none;
}

.settings-range-input:focus {
  outline: none;
}

.settings-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
}

/* Toggle Button */
.settings-toggle-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.toggle-status {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 32px;
  text-align: right;
}

.settings-toggle-btn.active .toggle-status {
  color: var(--accent);
}

.toggle-slider {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--border);
  border-radius: 24px;
  transition: all 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.settings-toggle-btn.active .toggle-slider {
  background: var(--accent);
}

.settings-toggle-btn.active .toggle-slider::before {
  transform: translateX(20px);
}

/* Warning Notice */
.settings-notice-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 12px;
  font-size: 0.7rem;
  color: #e6a017;
}

.settings-notice-warning i {
  font-size: 1rem;
  flex-shrink: 0;
}

/* Settings Footer Actions */
.settings-footer-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  margin-top: 8px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.settings-reset-btn,
.settings-start-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.settings-reset-btn {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.settings-reset-btn:hover {
  background: var(--accent-light);
  color: var(--accent);
  transform: translateY(-1px);
}

.settings-start-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.25);
}

.settings-start-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.35);
}

.settings-start-btn:active,
.settings-reset-btn:active {
  transform: translateY(0);
}

/* Dark mode support */
[data-theme="dark"] .settings-group {
  background: var(--surface-strong);
}

[data-theme="dark"] .settings-row:hover {
  background: rgba(208, 160, 107, 0.08);
}

[data-theme="dark"] .toggle-slider::before {
  background: var(--surface);
}

[data-theme="dark"] .settings-reset-btn {
  background: var(--surface);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .settings-row {
    padding: 14px 16px;
  }

  .settings-row-label {
    font-size: 0.85rem;
  }

  .settings-row-desc {
    font-size: 0.65rem;
    margin-left: 30px;
  }

  .settings-range-control {
    margin-left: 30px;
  }

  .settings-footer-actions {
    padding: 12px 16px;
  }

  .settings-reset-btn,
  .settings-start-btn {
    padding: 10px 14px;
    font-size: 0.8rem;
  }
}

/* Technique description styling */
.technique-description {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: var(--accent-light);
  border-radius: 12px;
  margin-bottom: 12px;
}

.technique-description i {
  color: var(--accent);
  font-size: 1rem;
  margin-top: 2px;
  flex-shrink: 0;
}

.technique-description span {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.technique-best {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(46, 125, 50, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(46, 125, 50, 0.15);
}

.technique-best i {
  color: #2e7d32;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.technique-best span {
  font-size: 0.7rem;
  color: #2e7d32;
  font-weight: 500;
}

.technique-preview-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-top: 8px;
}

.technique-preview-block i {
  color: var(--accent);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.technique-preview-block span {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Dark mode support */
[data-theme="dark"] .technique-description {
  background: rgba(208, 160, 107, 0.1);
}

[data-theme="dark"] .technique-best {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.2);
}

[data-theme="dark"] .technique-best span {
  color: #81c784;
}

[data-theme="dark"] .technique-preview-block {
  background: var(--surface-strong);
}

.techniques-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.techniques-header h3 {
  margin: 0 0 6px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.techniques-header p {
  margin: 0 0 12px 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.compatibility-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.technique-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.technique-card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}

.technique-icon {
  width: 44px;
  height: 44px;
  background: var(--accent-light);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.technique-icon i {
  font-size: 1.3rem;
  color: var(--accent);
}

.technique-info {
  flex: 1;
  min-width: 0;
}

.technique-info h4 {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.technique-info p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.technique-toggle {
  flex-shrink: 0;
  min-width: 70px;
  min-height: 36px;
}

.technique-controls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.control-group {
  margin-bottom: 14px;
}

.control-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.technique-range {
  flex: 1;
  padding: 0;
}

.value-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 4px 8px;
  background: var(--accent-light);
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
}

.technique-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.8rem;
  color: var(--text);
}

.technique-preview {
  padding: 12px;
  background: var(--accent-light);
  border-radius: 10px;
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.technique-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(154, 103, 56, 0.08);
  border-radius: 10px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.technique-hint kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.65rem;
  font-weight: 600;
}

.presets-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.presets-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.preset-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  color: var(--text);
}

.preset-btn:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-1px);
}

.tools-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tools-tabs button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 12px;
  background: transparent;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--text-muted);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tools-tabs button.active {
  background: var(--surface-strong);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.tools-tabs button i {
  font-size: 0.9rem;
}

/* Expanded offcanvas width */
.tools {
  --tools-width: 520px;
  width: min(var(--tools-width), 92vw);
}

/* Techniques Tab Styles */
.techniques-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.techniques-header h3 {
  margin: 0 0 6px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.techniques-header p {
  margin: 0 0 12px 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.compatibility-info-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.compatibility-info-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent);
}

.techniques-list-expanded {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.technique-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
}

.technique-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.technique-card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}

.technique-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--accent-light), var(--accent-wash));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.technique-icon i {
  font-size: 1.3rem;
  color: var(--accent);
}

.technique-info {
  flex: 1;
  min-width: 0;
}

.technique-info h4 {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.technique-info p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.technique-toggle {
  flex-shrink: 0;
  min-width: 70px;
  min-height: 36px;
}

.technique-controls {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.control-group {
  margin-bottom: 14px;
}

.control-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.technique-range {
  flex: 1;
  padding: 0;
}

.value-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 4px 8px;
  background: var(--accent-light);
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
}

.technique-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.8rem;
  color: var(--text);
}

.technique-preview {
  padding: 12px;
  background: var(--accent-light);
  border-radius: 10px;
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.technique-preview i {
  color: var(--accent);
  font-size: 0.8rem;
}

.technique-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 12px;
  background: rgba(154, 103, 56, 0.08);
  border-radius: 10px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.technique-hint kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.65rem;
  font-weight: 600;
}

.technique-benefits {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.technique-benefits small {
  font-size: 0.65rem;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 4px;
}

.technique-benefits small i {
  font-size: 0.6rem;
}

/* Presets Section */
.presets-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.presets-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.preset-btn {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  color: var(--text);
}

.preset-btn:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  transform: translateY(-1px);
}

.preset-btn i {
  font-size: 0.8rem;
}

/* Responsive */
@media (max-width: 640px) {
  .tools {
    --tools-width: 100vw;
  }

  .technique-card-header {
    flex-wrap: wrap;
  }

  .technique-toggle {
    width: 100%;
  }

  .presets-grid {
    grid-template-columns: 1fr;
  }
}

.conflict-badge {
  margin-top: 6px;
  padding: 2px 8px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 500;
  display: inline-block;
}

[data-theme="dark"] .conflict-badge {
  background: rgba(220, 38, 38, 0.15);
  color: #f87171;
}

.technique-conflict-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 8px;
  font-size: 0.65rem;
  color: #c62828;
  border: 1px solid rgba(220, 53, 69, 0.2);
  animation: warningPulse 1s ease-in-out;
}

.technique-conflict-warning i {
  font-size: 0.7rem;
}

@keyframes warningPulse {

  0%,
  100% {
    opacity: 0.7;
  }

  50% {
    opacity: 1;
    background: rgba(220, 53, 69, 0.2);
  }
}

/* Dark mode */
[data-theme="dark"] .technique-conflict-warning {
  background: rgba(229, 57, 53, 0.15);
  color: #ef9a9a;
}

/* Hint button in sheet toggle */
.st-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.st-hint-btn {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  transition: all 0.2s ease;
}

.st-hint-btn:hover {
  background: var(--accent-light);
  transform: scale(1.05);
}

.st-hint-btn i {
  font-size: 0.9rem;
}

/* Compatibility Modal */
.compatibility-modal {
  max-width: 560px;
  width: 100%;
}

.compatibility-intro {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 20px;
  line-height: 1.4;
}

.compatibility-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.compatibility-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  transition: all 0.2s ease;
}

.compatibility-row:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}

.combo-icons {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 70px;
  font-size: 1.1rem;
  color: var(--accent);
}

.combo-icons i {
  font-size: 1rem;
}

.combo-icons .bi-plus-lg {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.combo-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.combo-text strong {
  font-size: 0.85rem;
  color: var(--text);
}

.combo-text span {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.combo-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.combo-badge.success {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.2);
}

.combo-badge.alone {
  background: rgba(154, 103, 56, 0.12);
  color: var(--accent);
  border: 1px solid rgba(154, 103, 56, 0.2);
}

.compatibility-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(220, 53, 69, 0.08);
  border-radius: 12px;
  font-size: 0.75rem;
  color: #c62828;
  border: 1px solid rgba(220, 53, 69, 0.15);
}

.compatibility-note i {
  font-size: 1rem;
  flex-shrink: 0;
}

/* Dark mode support */
[data-theme="dark"] .compatibility-row {
  background: var(--surface-strong);
}

[data-theme="dark"] .compatibility-row:hover {
  background: rgba(208, 160, 107, 0.1);
}

[data-theme="dark"] .combo-badge.success {
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
}

[data-theme="dark"] .compatibility-note {
  background: rgba(229, 57, 53, 0.12);
  color: #ef9a9a;
}

/* Responsive */
@media (max-width: 560px) {
  .compatibility-row {
    flex-wrap: wrap;
    gap: 10px;
  }

  .combo-badge {
    margin-left: auto;
  }

  .combo-icons {
    min-width: 55px;
  }
}

.segmented-control-compact button {
  font-size: 0.7rem;
  padding: 6px 8px;
}

.save-name-modal {
  max-width: 680px;
  width: 100%;
}

.save-modal-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 20px;
  line-height: 1.4;
}

.save-name-input-group {
  margin-bottom: 16px;
}

.save-name-input-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.save-name-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.9rem;
  color: var(--text);
  transition: all 0.2s;
}

.save-name-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.save-preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--accent-light);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 8px;
}

.save-preview-info i {
  color: var(--accent);
  font-size: 0.9rem;
}

.technique-desc-hint {
  display: block;
  font-size: 0.65rem;
  color: var(--accent);
  margin-top: 4px;
  font-weight: 500;
}

.technique-example-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  background: rgba(154, 103, 56, 0.08);
  border-radius: 10px;
  font-size: 0.7rem;
  color: var(--text-muted);
  border: 1px solid rgba(154, 103, 56, 0.12);
}

.technique-example-hint i {
  color: var(--accent);
  font-size: 0.8rem;
  flex-shrink: 0;
}

.technique-example-hint strong {
  color: var(--accent);
}

/* Anchor Mode Styles - Enhanced */
.verse-arabic .wbw-word.anchor-highlight,
.verse-arabic word.anchor-highlight,
.mushaf-ayah-text .wbw-word.anchor-highlight,
.mushaf-ayah-text word.anchor-highlight,
.word-item.anchor-highlight {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 152, 0, 0.4));
  border-bottom: 3px solid #ff9800;
  border-radius: 8px;
  transform: scale(1.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.2);
}

.mushaf-ayah-text .wbw-word.anchor-highlight,
.mushaf-ayah-text word.anchor-highlight {
  display: inline;
  font-size: inherit !important;
  line-height: inherit !important;
  transform: none !important;
  vertical-align: baseline;
}

.mushaf-ayah-text .anchor-pulse {
  animation: mushafAnchorPulse 0.6s ease-out;
}

@keyframes mushafAnchorPulse {
  0%, 100% {
    box-shadow: 0 2px 4px rgba(255, 152, 0, 0.2);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(255, 152, 0, 0);
  }
}

/* Animation for newly highlighted anchors */
.anchor-pulse {
  animation: anchorPulse 0.6s ease-out;
}

@keyframes anchorPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7);
  }

  50% {
    transform: scale(1.08);
    box-shadow: 0 0 0 8px rgba(255, 152, 0, 0);
  }

  100% {
    transform: scale(1.02);
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
  }
}

.verse-arabic .wbw-word.anchor-highlight:hover,
.verse-arabic word.anchor-highlight:hover,
.mushaf-ayah-text .wbw-word.anchor-highlight:hover,
.mushaf-ayah-text word.anchor-highlight:hover,
.word-item.anchor-highlight:hover {
  background: rgba(255, 152, 0, 0.6);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
}

.mushaf-ayah-text .wbw-word.anchor-highlight:hover,
.mushaf-ayah-text word.anchor-highlight:hover {
  transform: none !important;
}

/* Tooltip for anchors */
.anchor-highlight::after {
  content: "🔗 Memory Anchor";
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  white-space: nowrap;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.anchor-highlight:hover::after {
  opacity: 1;
}

/* Dark mode support */
[data-theme="dark"] .anchor-highlight {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.3));
  border-bottom-color: #ffb74d;
}

[data-theme="dark"] .anchor-highlight:hover {
  background: rgba(255, 152, 0, 0.4);
}

.main.blur-mode-active .verse-card.blur-upcoming .anchor-highlight {
  filter: blur(calc(var(--recall-blur, 10px) - 4px));
}

.technique-select {
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.8rem;
}

.verse-small-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.verse-small-play-btn i {
  font-size: 0.8rem;
}

.verse-small-play-btn:hover {
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.85);
  color: var(--accent);
}

.verse-self-check-btn {
  min-height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.14);
  background: rgba(255, 255, 255, 0.88);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.verse-self-check-btn:hover {
  border-color: rgba(154, 103, 56, 0.28);
  background: var(--accent-light);
  color: var(--accent);
}

.verse-self-check-btn.active {
  background: linear-gradient(135deg, rgba(154, 103, 56, 0.15), rgba(154, 103, 56, 0.05));
  border-color: rgba(154, 103, 56, 0.26);
  color: var(--accent);
}

.verse-self-check-btn em {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.12);
  color: inherit;
  font-size: 0.66rem;
  font-style: normal;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.self-check-modal {
  width: min(1280px, calc(100vw - 20px));
  max-height: calc(100dvh - 20px);
  height: auto;
  padding: 0;
  overflow: hidden;
  animation: selfCheckModalIn 180ms ease;
}

.self-check-modal-overlay {
  z-index: 12100;
}

@keyframes selfCheckModalIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.self-check-modal-header {
  align-items: flex-start;
  padding-top: 14px;
  padding-bottom: 14px;
}

.self-check-modal-head-copy {
  display: grid;
  gap: 6px;
}

.self-check-modal-head-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.self-check-modal-body {
  display: grid;
  gap: 20px;
  padding: 18px 22px 22px;
}

.self-check-modal-stage,
.self-check-recorder-card,
.self-check-attempts-card,
.self-check-attempt-card {
  border: 1px solid rgba(154, 103, 56, 0.14);
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(250, 244, 236, 0.9));
  box-shadow: 0 18px 40px rgba(85, 55, 26, 0.08);
}

.self-check-modal-stage {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
}

.self-check-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.self-check-section-title {
  display: block;
  margin-top: 4px;
  color: var(--text);
  font-size: 1.02rem;
  font-weight: 700;
}

.self-check-section-desc,
.self-check-card-desc,
.self-check-tool-hint,
.recordings-library-section-desc,
.recordings-library-search-hint,
.recording-history-note,
.self-check-attempt-note {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
  font-weight: 500;
}

.self-check-card-desc {
  max-width: 34rem;
}

.self-check-tool-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}



.self-check-modal-tool-group {
  display: grid;
  gap: 10px;
  flex: 1 1 220px;
}

.self-check-modal-memory-tools {
  margin-left: auto;
  justify-items: end;
}

.self-check-modal-tool-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.self-check-modal-font-controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.76);
}

.self-check-modal-tool-btn,
.self-check-modal-memory-btn {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.78);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.self-check-modal-tool-btn:hover,
.self-check-modal-memory-btn:hover,
.self-check-modal-memory-btn.active {
  border-color: rgba(154, 103, 56, 0.26);
  background: var(--accent-light);
  color: var(--accent);
}

.self-check-modal-font-value {
  min-width: 58px;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text);
}

.self-check-modal-ayah-shell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 22px 20px;
  min-height: 310px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top, rgba(212, 176, 133, 0.2), transparent 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 240, 232, 0.96));
  border: 1px solid rgba(154, 103, 56, 0.18);
  overflow: hidden;
  transition: box-shadow 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
}

.self-check-modal-ayah-shell.is-peekable {
  cursor: pointer;
  user-select: none;
}

.self-check-modal-ayah-shell.is-peekable.is-blurred:hover {
  box-shadow: inset 0 0 0 1px rgba(154, 103, 56, 0.2), 0 10px 24px rgba(154, 103, 56, 0.08);
}

.self-check-ayah-actions {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 2;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.self-check-ayah-action {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(154, 103, 56, 0.22);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(85, 55, 26, 0.12);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.self-check-ayah-action:hover {
  transform: translateY(-1px);
  background: #fff;
  border-color: rgba(154, 103, 56, 0.34);
}

.self-check-ayah-action.active {
  color: #6f421f;
  background: rgba(154, 103, 56, 0.14);
  border-color: rgba(154, 103, 56, 0.36);
}



.self-check-modal-ayah {
  width: min(100%, 900px);
  text-align: center;
  line-height: 2.15;
  color: var(--text);
  font-weight: 500;
  transition: filter 0.22s ease, transform 0.22s ease, opacity 0.22s ease;
}

.self-check-modal-ayah.tajweed-enabled .tajweed-mark {
  font-weight: inherit;
}

.self-check-modal-ayah.tajweed-enabled .tajweed-ham_wasl,
.self-check-modal-ayah.tajweed-enabled .tajweed-slnt {
  color: #8b8b8b;
}

.self-check-modal-ayah.tajweed-enabled .tajweed-ghn,
.self-check-modal-ayah.tajweed-enabled .tajweed-idgh_ghn,
.self-check-modal-ayah.tajweed-enabled .tajweed-iqlb {
  color: #138a4c;
}

.self-check-modal-ayah.tajweed-enabled .tajweed-idgh_w_ghn,
.self-check-modal-ayah.tajweed-enabled .tajweed-ikhf,
.self-check-modal-ayah.tajweed-enabled .tajweed-ikhf_shfw {
  color: #b56a00;
}

.self-check-modal-ayah.tajweed-enabled .tajweed-qlq,
.self-check-modal-ayah.tajweed-enabled .tajweed-lqlq {
  color: #a93226;
}

.self-check-modal-ayah.tajweed-enabled .tajweed-madda_normal,
.self-check-modal-ayah.tajweed-enabled .tajweed-madda_permissible,
.self-check-modal-ayah.tajweed-enabled .tajweed-madda_necessary,
.self-check-modal-ayah.tajweed-enabled .tajweed-madda_obligatory,
.self-check-modal-ayah.tajweed-enabled .tajweed-madda_pbligatory {
  color: #7a42c8;
}

.self-check-modal-ayah-shell.is-blurred .self-check-modal-ayah {
  filter: blur(18px);
  transform: scale(1.025);
  opacity: 0.88;
}

.self-check-modal-recorder-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(320px, 0.92fr);
  gap: 14px;
  align-items: start;
}

.self-check-recorder-card,
.self-check-attempts-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  align-content: start;
}

.self-check-recorder-card.recording {
  animation: selfCheckRecorderGlow 1.8s ease-in-out infinite;
}

@keyframes selfCheckRecorderGlow {
  0%, 100% {
    box-shadow: 0 18px 40px rgba(85, 55, 26, 0.08);
  }
  50% {
    box-shadow: 0 22px 46px rgba(154, 103, 56, 0.14);
  }
}

.self-check-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.self-check-recorder-head,
.self-check-recorder-meta,
.self-check-review-head,
.self-check-review-actions,
.self-check-live-actions,
.self-check-idle-actions,
.self-check-attempt-top,
.self-check-attempt-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.self-check-recorder-head > div:first-child,
.self-check-review-head > div:first-child,
.self-check-attempt-copy {
  flex: 1;
  min-width: 0;
}

.self-check-recorder-head strong,
.self-check-attempts-head strong,
.self-check-live-copy strong,
.self-check-review-head strong,
.self-check-attempt-copy strong {
  color: var(--text);
  font-size: 0.96rem;
  display: block;
}

.self-check-live-copy span,
.self-check-review-head span,
.self-check-attempt-copy span {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.self-check-recorder-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.self-check-recorder-meta span,
.self-check-attempts-count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.84);
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 600;
}

.self-check-library-link {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.78);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.self-check-library-link:hover {
  background: var(--accent-light);
  color: var(--accent);
  border-color: rgba(154, 103, 56, 0.24);
}

.self-check-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 0.8rem;
  font-weight: 600;
}

.self-check-status-success {
  background: rgba(89, 138, 96, 0.1);
  border-color: rgba(89, 138, 96, 0.16);
  color: #43684a;
}

.self-check-status-warning {
  background: rgba(166, 121, 72, 0.12);
  border-color: rgba(166, 121, 72, 0.18);
  color: #7d5d37;
}

.self-check-status-info {
  background: rgba(154, 103, 56, 0.08);
  border-color: rgba(154, 103, 56, 0.14);
  color: var(--text);
}

.self-check-live-stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(154, 103, 56, 0.12);
}

.self-check-live-card,
.self-check-review-card {
  display: grid;
  gap: 14px;
}

.self-check-review-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.62);
}

.self-check-live-copy {
  display: grid;
  gap: 4px;
}

.self-check-live-pulse {
  display: inline-flex;
  align-items: flex-end;
  gap: 5px;
}

.self-check-live-pulse span {
  width: 6px;
  border-radius: 999px;
  background: var(--accent);
  animation: selfCheckPulse 0.9s ease-in-out infinite;
}

.self-check-live-pulse span:nth-child(1) {
  height: 14px;
}

.self-check-live-pulse span:nth-child(2) {
  height: 22px;
  animation-delay: 0.12s;
}

.self-check-live-pulse span:nth-child(3) {
  height: 16px;
  animation-delay: 0.24s;
}

@keyframes selfCheckPulse {
  0%, 100% { transform: scaleY(0.7); opacity: 0.72; }
  50% { transform: scaleY(1.1); opacity: 1; }
}

.self-check-result-block {
  display: grid;
  gap: 12px;
}

.self-check-result-label {
  display: grid;
  gap: 2px;
}

.self-check-result-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.self-check-result-btn {
  min-height: auto;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: grid;
  gap: 4px;
  text-align: left;
  color: var(--text);
}

.self-check-result-btn-label {
  font-size: 0.86rem;
  font-weight: 700;
}

.self-check-result-btn-hint {
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.45;
  opacity: 0.95;
  color: var(--text-muted);
}

.self-check-result-btn.active {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(85, 55, 26, 0.16);
  border-color: rgba(154, 103, 56, 0.42);
  outline: 2px solid rgba(154, 103, 56, 0.18);
  outline-offset: 2px;
}

.self-check-result-btn.tone-excellent {
  color: #12351f;
  border-color: rgba(34, 118, 64, 0.38);
  background: #dff0e4;
}

.self-check-result-btn.tone-good {
  color: #3d2a11;
  border-color: rgba(161, 108, 38, 0.38);
  background: #f3e1c5;
}

.self-check-result-btn.tone-review {
  color: #4b2217;
  border-color: rgba(174, 82, 51, 0.38);
  background: #f3d8ce;
}

.self-check-result-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(154, 103, 56, 0.16);
}

.self-check-attempts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.self-check-attempts-list {
  display: grid;
  gap: 8px;
  max-height: 40vh;
  overflow-y: auto;
  padding-right: 4px;
  align-content: start;
}

.self-check-attempt-card {
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 10px 24px rgba(85, 55, 26, 0.05);
}

.self-check-attempt-card.playing {
  border-color: rgba(154, 103, 56, 0.22);
  box-shadow: 0 16px 32px rgba(154, 103, 56, 0.12);
}

.self-check-attempt-copy {
  display: grid;
  gap: 3px;
}

.self-check-attempt-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.self-check-attempt-meta span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.self-check-attempt-actions {
  align-items: center;
  padding-top: 2px;
}

.self-check-empty {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  color: var(--text-muted);
  padding: 12px;
}

.self-check-empty h3,
.self-check-empty p {
  margin: 0;
}

.self-check-empty p {
  max-width: 280px;
  line-height: 1.6;
}

.self-check-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(154, 103, 56, 0.08);
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.self-check-action-btn,
.self-check-preview-btn {
  min-height: 42px;
}

/* Add to your style section */
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-modal {
  text-align: center;
  background: transparent;
  border: none;
  box-shadow: none;
}

.countdown-number {
  font-size: 8rem;
  font-weight: 800;
  color: var(--accent);
  animation: pulse 1s ease infinite;
}

.countdown-text {
  font-size: 1.5rem;
  color: white;
  margin-top: 20px;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 640px) {
  .countdown-number {
    font-size: 5rem;
  }

  .countdown-text {
    font-size: 1.2rem;
  }
}

/* Add these styles if missing */
.technique-peek-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: 10px;
  background: rgba(154, 103, 56, 0.08);
  border: 1px solid rgba(154, 103, 56, 0.12);
  font-size: 0.7rem;
  color: var(--text-muted);
}

.technique-peek-hint i {
  color: var(--accent);
  font-size: 0.8rem;
  flex-shrink: 0;
}

.technique-peek-hint kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent);
  display: inline-block;
}

/* Add to style section */
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.countdown-modal {
  text-align: center;
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
  background: transparent;
  border: none;
  box-shadow: none;
}

.countdown-number {
  font-size: 8rem;
  font-weight: 800;
  color: var(--accent);
  text-shadow: 0 0 30px rgba(154, 103, 56, 0.5);
  animation: pulse 1s ease infinite;
  font-family: monospace;
}

.countdown-text {
  font-size: 1.5rem;
  color: white;
  margin-top: 20px;
  font-weight: 500;
  letter-spacing: 2px;
}

.countdown-hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 12px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 640px) {
  .countdown-number {
    font-size: 5rem;
  }

  .countdown-text {
    font-size: 1.2rem;
  }
}


/* Mobile */
@media (max-width: 768px) {
  .wavemark-bars {
    height: 30px;
    gap: 1.5px;
  }

  .wavemark-playhead::before {
    width: 8px;
    height: 8px;
    top: -5px;
    left: -3px;
  }
}

.waveform-canvas {
  width: 100%;
  height: 60px;
  display: block;
  border-radius: 8px;
  cursor: pointer;
}

/* Settings notice */
.settings-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-light);
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 0.75rem;
  color: var(--accent);
  border: 1px solid var(--accent-soft);
}

.settings-notice i {
  font-size: 0.9rem;
}

/* Login Hero Section */
.login-hero {
  min-height: calc(100vh - 100px);
  padding: 34px 20px 48px;
  align-items: stretch;
}

.guest-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 22px;
  animation: loginFadeIn 0.5s ease-out;
}

.guest-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 24px;
  align-items: stretch;
}

.guest-hero-copy,
.guest-hero-panel,
.guest-section,
.guest-panel {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(247, 240, 231, 0.92));
  box-shadow: var(--shadow-lg);
}

.guest-hero-copy {
  border-radius: 34px;
  padding: 38px;
  display: grid;
  gap: 18px;
  align-content: center;
}

.guest-kicker,
.guest-section-kicker {
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.1);
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.guest-hero-copy h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.25rem);
  line-height: 1.06;
  letter-spacing: -0.04em;
  color: var(--text);
  max-width: 12ch;
  font-weight: 650;
}

.guest-subtitle {
  margin: 0;
  max-width: 62ch;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--text-muted);
}

.guest-copy-stack {
  display: grid;
  gap: 10px;
}

.guest-copy-support,
.guest-cta-note {
  margin: 0;
  max-width: 58ch;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.guest-action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.guest-primary-btn {
  width: auto;
  min-width: 260px;
  margin-bottom: 0;
  min-height: 58px;
  padding-inline: 28px;
  font-size: 1rem;
  box-shadow: 0 14px 30px rgba(154, 103, 56, 0.24);
}

.guest-secondary-btn {
  min-height: 58px;
  padding: 14px 24px;
  border-radius: 60px;
  border: 1px solid rgba(154, 103, 56, 0.18);
  background: rgba(255, 255, 255, 0.78);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 0.96rem;
  font-weight: 600;
  box-shadow: 0 12px 22px rgba(61, 40, 20, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.guest-secondary-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: rgba(154, 103, 56, 0.28);
}

.guest-proof-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.guest-proof-row span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 600;
}

.guest-hero-panel {
  border-radius: 30px;
  padding: 22px;
  display: grid;
}

.guest-preview-card {
  display: grid;
  gap: 16px;
  align-content: start;
}

.guest-preview-icon {
  width: 68px;
  height: 68px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  box-shadow: 0 12px 28px rgba(154, 103, 56, 0.2);
}

.guest-preview-icon i {
  font-size: 1.8rem;
}

.guest-preview-copy strong,
.guest-panel h3,
.guest-section h2,
.guest-feature-card strong,
.guest-benefit-item strong,
.guest-preview-step strong {
  color: var(--text);
}

.guest-preview-copy p,
.guest-preview-step small,
.guest-feature-card p,
.guest-flow-item p,
.guest-benefit-item p,
.guest-section-head p {
  color: var(--text-muted);
}

.guest-preview-steps {
  display: grid;
  gap: 12px;
}

.guest-preview-step {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(154, 103, 56, 0.12);
}

.guest-preview-step span,
.guest-flow-item span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.12);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
}

.guest-section {
  border-radius: 28px;
  padding: 28px;
  display: grid;
  gap: 18px;
}

.guest-section-row {
  grid-template-columns: minmax(240px, 0.42fr) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.guest-section-head {
  display: grid;
  gap: 8px;
}

.guest-section-head-side {
  align-content: start;
}

.guest-section-head h2 {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.9rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.guest-feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.guest-feature-card {
  border-radius: 18px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(154, 103, 56, 0.12);
  display: grid;
  gap: 10px;
}

.guest-feature-card i {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(154, 103, 56, 0.1);
  color: var(--accent);
  font-size: 1.05rem;
}

.guest-feature-card strong,
.guest-panel h3 {
  font-size: 0.98rem;
  font-weight: 650;
}

.guest-feature-card p,
.guest-benefit-item p,
.guest-flow-item p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
}

.guest-section-split {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.guest-panel {
  border-radius: 24px;
  padding: 24px;
  display: grid;
  gap: 16px;
}

.guest-panel-head {
  display: grid;
  gap: 8px;
}

.guest-panel h3 {
  margin: 0;
  font-size: 1.18rem;
}

.guest-flow-list,
.guest-benefit-list {
  display: grid;
  gap: 12px;
}

.guest-flow-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.guest-benefit-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.guest-benefit-item i {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(154, 103, 56, 0.1);
  color: var(--accent);
  font-size: 1rem;
}

.guest-benefit-item strong {
  display: block;
  margin-bottom: 4px;
}

.login-btn {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  border-radius: 60px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.3);
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(154, 103, 56, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

.login-note {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

[data-theme="dark"] .login-hero {
  background: transparent;
}

[data-theme="dark"] .guest-hero-copy,
[data-theme="dark"] .guest-hero-panel,
[data-theme="dark"] .guest-section,
[data-theme="dark"] .guest-panel {
  background: linear-gradient(180deg, rgba(28, 33, 31, 0.96), rgba(22, 27, 25, 0.94));
  border-color: rgba(109, 160, 145, 0.22);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.46);
}

[data-theme="dark"] .guest-proof-row span,
[data-theme="dark"] .guest-preview-step,
[data-theme="dark"] .guest-feature-card,
[data-theme="dark"] .guest-secondary-btn,
[data-theme="dark"] .guest-flow-item span,
[data-theme="dark"] .guest-benefit-item i {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(216, 185, 150, 0.16);
}

[data-theme="dark"] .guest-kicker,
[data-theme="dark"] .guest-section-kicker {
  background: rgba(208, 160, 107, 0.14);
  color: #ddb07c;
}

[data-theme="dark"] .guest-preview-icon,
[data-theme="dark"] .guest-feature-card i {
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.34);
}

[data-theme="dark"] .guest-feature-card i,
[data-theme="dark"] .guest-benefit-item i,
[data-theme="dark"] .guest-flow-item span {
  color: #97c9ba;
}

[data-theme="dark"] .login-btn {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
}

@keyframes loginFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .guest-hero,
  .guest-section-split {
    grid-template-columns: 1fr 1fr;
  }

  .guest-section-row {
    grid-template-columns: 1fr;
  }

  .guest-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .login-hero {
    padding: 20px 0 36px;
  }

  .guest-hero,
  .guest-feature-grid,
  .guest-section-split,
  .guest-section-row {
    grid-template-columns: 1fr;
  }

  .guest-hero-copy,
  .guest-hero-panel,
  .guest-section,
  .guest-panel {
    border-radius: 24px;
  }

  .guest-hero-copy,
  .guest-section,
  .guest-panel {
    padding: 22px;
  }

  .guest-hero-copy h1 {
    max-width: none;
    font-size: 1.9rem;
  }

  .guest-action-row {
    flex-direction: column;
    align-items: stretch;
  }

  .guest-primary-btn,
  .guest-secondary-btn {
    width: 100%;
    min-width: 0;
  }

  .guest-proof-row {
    flex-direction: column;
  }

  .guest-proof-row span {
    width: 100%;
    justify-content: flex-start;
  }

  .guest-copy-support,
  .guest-cta-note {
    max-width: none;
  }
}

@media (max-width: 520px) {
  .guest-hero-copy h1 {
    font-size: 1.7rem;
  }

  .guest-subtitle {
    font-size: 0.92rem;
  }

  .guest-section-head h2,
  .guest-panel h3 {
    font-size: 1.1rem;
  }
}

/* Save Name Modal Styles */
.save-name-modal {
  max-width: 680px;
  width: 100%;
}

.save-modal-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 20px;
  line-height: 1.4;
}

.save-name-input-group {
  margin-bottom: 16px;
}

.save-name-input-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.save-name-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.9rem;
  color: var(--text);
  transition: all 0.2s;
}

.save-name-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.save-preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--accent-light);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 8px;
}

.save-preview-info i {
  color: var(--accent);
  font-size: 0.9rem;
}

/* Fix saved tab layout */
.saved-sessions-container {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 248, 242, 0.62));
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.saved-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.saved-header h3 {
  margin: 0 0 4px 0;
  font-size: 1.05rem;
  font-weight: 650;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.saved-header p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--text-muted);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.session-info {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  cursor: pointer;
}

.session-info:hover {
  background: var(--accent-light);
}

.session-name {
  font-weight: 600;
  font-size: 0.86rem;
  color: var(--text);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-name i {
  color: var(--accent);
  font-size: 0.7rem;
}

.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.6rem;
  color: var(--text-muted);
}

.session-meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.delete-btn {
  width: 36px;
  height: 36px;
  margin-right: 8px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  color: #dc3545;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.save-section {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.current-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  background: var(--accent-light);
  border-radius: 10px;
}

.current-info i {
  font-size: 1rem;
  color: var(--accent);
  flex-shrink: 0;
}

.current-info div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.current-info strong {
  font-size: 0.75rem;
  color: var(--text);
}

.current-info small {
  font-size: 0.6rem;
  color: var(--text-muted);
}

.save-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.save-btn:active {
  transform: translateY(0);
}

/* Saved Tab Styles - Clean Version */
.saved-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.saved-header h3 {
  margin: 0 0 6px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.saved-header p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-state p {
  margin-bottom: 4px;
  font-weight: 500;
  color: var(--text);
}

.empty-state span {
  font-size: 0.7rem;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  max-height: none;
  overflow-y: auto;
  padding-right: 6px;
}

.session-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.session-item:hover {
  border-color: var(--accent);
  background: var(--accent-light);
  transform: translateY(-1px);
}

.session-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.session-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text);
  margin-bottom: 4px;
  min-width: 0;
}

.session-name span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-subtitle {
  margin: 0 0 6px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.session-name i {
  color: var(--accent);
  font-size: 0.8rem;
}

.session-details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.session-details span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.session-details i {
  font-size: 0.6rem;
}

.delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  color: #dc3545;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.save-section {
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.current-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.current-info i {
  font-size: 1.2rem;
  color: var(--accent);
  flex-shrink: 0;
}

.current-info div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.current-info strong {
  font-size: 0.8rem;
  color: var(--text);
}

.current-info small {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.save-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  box-shadow: var(--shadow-sm);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.78);
}

.action-icon:hover {
  transform: translateY(-2px);
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--shadow-md);
}

/* Add to your style section */
.tools-tabs button {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.8rem;
}

.saved-sessions-container {
  padding: 16px;
}

.saved-session-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.saved-session-card:hover {
  border-color: var(--accent);
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.saved-session-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.session-icon {
  width: 36px;
  height: 36px;
  background: var(--accent-light);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.session-details {
  flex: 1;
}

.session-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text);
}

.session-range {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.session-delete-btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  color: #dc3545;
  transition: all 0.2s;
}

.session-delete-btn-icon:hover {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.session-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  color: var(--text-muted);
  padding-left: 48px;
}

.session-resume-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
}

.save-current-session-panel {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.save-session-btn-full {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.save-session-btn-full:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.3);
}

.empty-saved-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.empty-saved-state i {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Action Buttons Group - Perfect Alignment */
.action-buttons-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  box-shadow: var(--shadow-sm);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
  flex-shrink: 0;
}

.action-icon-btn:hover {
  transform: translateY(-1px);
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--shadow-md);
}

.action-icon-btn:active {
  transform: translateY(0);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-btn-secondary {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  border: 1px solid var(--border);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.action-btn-secondary:hover {
  transform: translateY(-1px);
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--shadow-md);
}

.action-btn-exit {
  background: rgba(255, 247, 243, 0.9);
  border: 1px solid rgba(154, 103, 56, 0.14);
}

.action-btn-exit:hover {
  background: rgba(255, 239, 232, 0.96);
  border-color: rgba(139, 79, 57, 0.22);
  color: #8b4f39;
}

.action-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.25);
  border: none;
}

.action-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(154, 103, 56, 0.35);
}

.action-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.action-btn-secondary:active,
.action-icon-btn:active {
  transform: translateY(0);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .action-buttons-group {
    gap: 6px;
  }

  .action-icon-btn {
    width: 38px;
    height: 38px;
    font-size: 1rem;
  }

  .action-btn {
    height: 38px;
    padding: 0 14px;
    font-size: 0.8rem;
  }

  .action-btn span {
    display: inline-block;
  }
}

@media (max-width: 480px) {
  .action-btn span {
    display: none;
  }

  .action-btn {
    width: 42px;
    padding: 0;
  }

  .action-btn i {
    font-size: 1.1rem;
    margin: 0;
  }
}

/* Keyboard Shortcuts Modal - Larger & Cleaner */
.keyboard-shortcuts-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: modalFadeIn 0.2s ease;
}

.shortcuts-modal {
  background: var(--surface-strong);
  border-radius: 24px;
  width: min(520px, 90vw);
  max-width: 520px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.shortcuts-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--surface), var(--surface-strong));
  border-bottom: 1px solid var(--border);
}

.shortcuts-modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-weight: 600;
}

.shortcuts-modal-header h3 i {
  font-size: 1.3rem;
  color: var(--accent);
}

.shortcuts-modal-close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-muted);
}

.shortcuts-modal-close:hover {
  background: var(--accent-light);
  color: var(--accent);
  transform: rotate(90deg);
}

.shortcuts-modal-body {
  padding: 24px;
  max-height: none;
  overflow-y: visible;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.shortcut-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid var(--border);
}

.shortcut-card-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 2px solid var(--accent-light);
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-keys {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.shortcut-keys kbd {
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 10px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  letter-spacing: 0.5px;
}

.shortcut-row span {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .action-buttons-group {
    width: 100%;
    gap: 8px;
  }

  .action-icon {
    min-width: 44px;
    height: 40px;
  }

  .action-btn {
    min-width: 0;
    flex: 1;
    padding: 0 12px;
    height: 40px;
    font-size: 0.8rem;
  }

  .action-btn span {
    display: inline;
  }

  .shortcuts-modal {
    width: 95vw;

    margin: 16px;
  }

  .shortcuts-modal-header {
    padding: 16px 20px;
  }

  .shortcuts-modal-header h3 {
    font-size: 1rem;
  }

  .shortcuts-modal-body {
    padding: 16px;
  }

  .shortcuts-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .shortcut-card {
    padding: 12px;
  }

  .shortcut-row {
    padding: 8px 0;
  }

  .shortcut-keys kbd {
    padding: 3px 8px;
    font-size: 0.65rem;
  }

  .shortcut-row span {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .action-btn span {
    display: none;
  }

  .action-btn {
    min-width: 44px;
    padding: 0;
  }

  .action-btn i {
    font-size: 1.1rem;
    margin: 0;
  }
}

/* Keyboard Shortcuts Dropdown - Compact */

.shortcuts-panel.compact {
  background: var(--surface-strong);
  border-radius: 14px;
  width: 280px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  animation: slideUp 0.2s ease;
  overflow: hidden;
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.shortcuts-header h3 {
  margin: 0;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
}

.shortcuts-header h3 i {
  font-size: 0.9rem;
}

.shortcuts-close {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  color: var(--text-muted);
}

.shortcuts-close:hover {
  background: var(--accent-light);
  color: var(--accent);
}

.shortcuts-list {
  padding: 8px 6px;
  max-height: 400px;
  overflow-y: auto;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
}

.shortcut-item:hover {
  background: var(--accent-light);
}

.shortcut-item kbd {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  box-shadow: 0 1px 0 var(--border);
}

.shortcut-item span {
  color: var(--text-muted);
  font-size: 0.75rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Saved Sessions Styles */
.saved-sessions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: none;
  overflow-y: auto;
}

.saved-session-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.saved-session-item:hover {
  border-color: var(--accent);
  background: var(--surface-strong);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.session-meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.65rem;
  color: var(--text-muted);
}

.session-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
}

.session-export-btn {
  min-height: 32px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.78);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.68rem;
  font-weight: 650;
  white-space: nowrap;
}

.session-export-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent-strong);
  background: var(--accent-light);
}

.session-export-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.spin {
  animation: spin360 0.9s linear infinite;
}

@keyframes spin360 {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.export-error-card {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(220, 53, 69, 0.18);
  background: rgba(220, 53, 69, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.export-error-card strong {
  display: block;
  font-size: 0.78rem;
  color: var(--text);
}

.export-error-card p {
  margin: 4px 0 0;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.stats-sessions-container {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 248, 242, 0.62));
  box-shadow: var(--shadow-sm);
}

.stats-panel {
  display: grid;
  gap: 12px;
}

.stats-session-picker,
.stats-detail-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.stats-session-pill {
  min-width: 0;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: all 0.2s ease;
  display: grid;
  gap: 3px;
  text-align: left;
}

.stats-session-pill strong,
.stats-detail-head h4 {
  font-size: 0.84rem;
  color: var(--text);
}

.stats-session-pill span,
.stats-detail-head p,
.stats-detail-footer {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.stats-summary {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 252, 246, 0.55);
  font-size: 0.78rem;
  line-height: 1.32;
  color: var(--text);
}

.stats-session-pill:hover,
.stats-session-pill.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

.stats-detail {
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 248, 242, 0.72));
  box-shadow: var(--shadow-sm);
}

.stats-session-select-wrap {
  margin-top: 10px;
  display: grid;
  gap: 6px;
  max-width: 420px;
}

.stats-session-select-label {
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  opacity: 0.9;
}

.stats-session-select {
  width: 100%;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
}

[data-theme="dark"] .stats-session-select {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text);
}

[data-theme="dark"] .stats-summary {
  background: rgba(255, 247, 236, 0.04);
  border-color: rgba(255, 236, 216, 0.12);
}

.session-export-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 6px;
}

.saved-continue-banner {
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: rgba(255, 248, 239, 0.04);
  display: grid;
  gap: 12px;
}

.saved-continue-copy {
  display: grid;
  gap: 4px;
}

.saved-continue-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.saved-continue-copy strong {
  font-size: 0.88rem;
  color: var(--text);
}

.saved-continue-copy small {
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.saved-continue-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.slider-markers-compact span {
  min-width: 0;
}

.session-item {
  align-items: stretch;
  gap: 14px;
}

.session-item-active {
  border-color: rgba(154, 103, 56, 0.28);
  box-shadow: 0 12px 26px rgba(122, 83, 46, 0.12);
}

.session-item .session-info,
.session-item .session-actions {
  position: relative;
  z-index: 1;
}

.session-live-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(79, 157, 138, 0.14);
  color: #4f9d8a;
  font-size: 0.66rem;
  font-weight: 700;
}

.session-status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.session-status-active {
  background: rgba(79, 157, 138, 0.16);
  color: #4f9d8a;
}

.session-status-paused,
.session-status-idle {
  background: rgba(154, 103, 56, 0.1);
  color: var(--accent-strong);
  border-color: rgba(154, 103, 56, 0.14);
}

.session-status-loading {
  background: rgba(86, 124, 184, 0.14);
  color: #6e95d2;
}

.session-status-muted {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  border-color: var(--border);
}

.session-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 0.76rem;
}

.session-details span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.session-primary-action {
  display: grid;
  flex: 0 0 66.6667%;
  max-width: 66.6667%;
}

.saved-sessions-container .session-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.session-secondary-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  flex: 0 0 33.3333%;
  max-width: 33.3333%;
}

.session-resume-btn,
.session-delete-btn {
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 8px 11px;
  line-height: 1.1;
}

.session-resume-btn {
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  padding: 9px 12px;
  box-shadow: 0 10px 22px rgba(154, 103, 56, 0.18);
}

.session-delete-btn {
  border: 1px solid rgba(168, 87, 68, 0.2);
  color: #a85744;
  background: rgba(255, 246, 243, 0.86);
  padding: 8px 10px;
  min-width: 0;
  width: auto;
  height: auto;
  margin-right: 0;
  flex-shrink: 0;
  width: 100%;
}

.session-delete-btn-quiet {
  min-width: 112px;
}

.session-export-btn.success {
  border-color: rgba(79, 157, 138, 0.3);
  background: rgba(79, 157, 138, 0.12);
  color: #2d7f6e;
}

.session-export-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.saved-sessions-container .session-export-btn {
  min-height: 0;
  height: auto;
}

.session-export-btn {
  width: auto;
  justify-content: center;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.76rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  line-height: 1.1;
}

.analytics-bar-list {
  display: grid;
  gap: 10px;
}

.analytics-bar-row {
  display: grid;
  grid-template-columns: minmax(0, 72px) minmax(0, 1fr) 34px;
  gap: 10px;
  align-items: center;
}

.analytics-bar-row span,
.analytics-bar-row strong {
  font-size: 0.76rem;
  color: var(--text);
}

.analytics-bar-row strong {
  text-align: right;
  color: var(--text-muted);
}

.analytics-bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.1);
  overflow: hidden;
}

.analytics-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d8ac6b, #8d5a34);
}

.analytics-bucket-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.analytics-bucket-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.05);
}

.analytics-bucket-card span {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.analytics-bucket-card strong {
  font-size: 1.2rem;
  color: var(--text);
}

.analytics-bucket-card small {
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.session-export-btn-pdf {
  border-color: rgba(196, 148, 72, 0.18);
}

.session-export-btn-word {
  border-color: rgba(120, 149, 196, 0.2);
}

.session-export-btn-csv {
  border-color: rgba(124, 170, 148, 0.18);
}

.post-onboarding-step-label {
  margin-bottom: 10px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8fc5b5;
}

.dua-onboarding-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.dua-onboarding-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(104, 160, 143, 0.16);
  background: rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 8px;
}

.dua-onboarding-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #97c9ba;
}

.dua-onboarding-arabic {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.85;
  color: #f1f7f4;
}

.dua-onboarding-translation {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: #d3ddd9;
}

.dua-onboarding-source {
  color: #9cb6af;
  font-size: 0.74rem;
}

.session-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  width: 100%;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.stats-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.stats-detail-head-hero {
  margin-bottom: 12px;
}

.stats-detail-head h4 {
  margin: 0 0 4px;
  font-size: 0.98rem;
}

.stats-detail-head p {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stats-grid-hero {
  gap: 12px;
}

@media (max-width: 520px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-detail-head {
    flex-direction: column;
    align-items: stretch;
  }

  .session-export-group {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .dua-onboarding-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .session-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .saved-sessions-container .session-actions {
    width: 100%;
    align-items: center;
    flex-wrap: nowrap;
  }

  .session-export-group {
    width: 100%;
  }

  .session-secondary-actions {
    flex: 0 0 33.3333%;
    max-width: 33.3333%;
  }

  .session-primary-action {
    flex: 0 0 66.6667%;
    max-width: 66.6667%;
  }

  .session-delete-btn {
    width: 100%;
  }

  .saved-continue-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .action-buttons-group {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .action-btn-primary,
  .action-btn-secondary,
  .action-btn-exit {
    flex: 1 1 calc(50% - 8px);
  }

  .workspace-shell-icon-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

.stats-card {
  padding: 14px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 252, 246, 0.82);
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  min-height: 132px;
}

.stats-card-icon {
  font-size: 1.55rem;
  color: var(--accent);
}

.stats-card span {
  font-size: 0.74rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.stats-card-value {
  font-style: normal;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.stats-detail-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.stats-detail-actions-prominent {
  margin: 4px 0 2px;
}

.stats-full-analytics-btn {
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  font-size: 0.82rem;
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}

.session-load-btn,
.session-delete-btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-load-btn {
  background: var(--accent);
  color: white;
  border-color: transparent;
}

.session-load-btn:hover {
  background: var(--accent-strong);
  transform: scale(1.05);
}

.session-delete-btn {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.session-delete-btn:hover {
  background: #dc3545;
  color: white;
}

.save-current-session {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.save-session-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.save-session-info {
  flex: 1;
}

.save-session-info strong {
  display: block;
  font-size: 0.8rem;
  color: var(--text);
  margin-bottom: 2px;
}

.save-session-info small {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.session-archive-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.08);
  border: 1px solid rgba(154, 103, 56, 0.12);
  color: var(--accent-strong);
  font-size: 0.64rem;
  font-weight: 700;
}

.save-session-btn {
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.save-session-btn:hover {
  background: var(--accent-strong);
  transform: translateY(-1px);
}

.verse-download-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.verse-download-btn:hover:not(:disabled) {
  transform: scale(1.05);
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.96);
}

.verse-download-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Add to your style section */
.main.tools-open {
  overflow-x: clip;
}

/* Fix tools panel positioning - ensure it goes from very top */
.tools {
  position: fixed;
  top: 0;
  /* Changed from auto/padding */
  right: 0;
  bottom: 0;
  height: 100dvh;
  width: min(var(--tools-width), 92vw);
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.96), rgba(247, 240, 231, 0.92));
  border-left: 1px solid var(--border);
  backdrop-filter: blur(14px);
  transform: translateX(100%);
  transition: transform 0.25s ease, visibility 0.25s ease;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg);
  isolation: isolate;
  visibility: hidden;
  pointer-events: none;
  overscroll-behavior: contain;
}

/* Adjust tools-top padding to account for no navbar offset */
.tools-top {
  padding: 18px 18px 12px;
  border-bottom: 1px solid var(--border);
  padding-top: calc(18px + env(safe-area-inset-top, 0px));
}

/* Ensure tools body scrolls correctly */
.tools-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 20px calc(var(--tools-footer-h) + 26px);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

body.has-navbar .tools {
  top: 0;
}

body.has-navbar .tools-top {
  padding-top: calc(18px + env(safe-area-inset-top, 0px));
}

.tools.open {
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

.tools-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1099;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.tools-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

/* Replace the existing blur mode CSS with this */
.main.blur-mode-active .verse-card.blur-upcoming .verse-arabic,
.main.blur-mode-active .verse-card.blur-upcoming .verse-aid {
  filter: blur(var(--recall-blur, 10px));
  opacity: 0.7;
  transition: filter 0.3s ease, opacity 0.3s ease;
}

.main.blur-mode-active .verse-card.blur-upcoming .verse-arabic .tajweed-mark,
.main.blur-mode-active .verse-card.blur-upcoming .verse-arabic word,
.main.blur-mode-active .verse-card.blur-upcoming .verse-arabic .wbw-word {
  filter: blur(var(--recall-blur, 10px));
}

/* Keep active verse clear */
.main.blur-mode-active .verse-card.active .verse-arabic,
.main.blur-mode-active .verse-card.active .verse-aid {
  filter: none;
  opacity: 1;
}

.main.blur-mode-active .verse-card.blur-upcoming.peek-revealed .verse-arabic,
.main.blur-mode-active .verse-card.blur-upcoming.peek-revealed .verse-aid,
.main.blur-mode-active .verse-card.blur-upcoming.peek-revealed .verse-arabic .tajweed-mark,
.main.blur-mode-active .verse-card.blur-upcoming.peek-revealed .verse-arabic word,
.main.blur-mode-active .verse-card.blur-upcoming.peek-revealed .verse-arabic .wbw-word {
  filter: none !important;
  opacity: 1;
}

/* Force tajweed spans to display properly */
.verse-arabic.tajweed-enabled span[class*="tajweed-"] {
  display: inline !important;
}

/* Ensure proper line height for tajweed text */
.verse-arabic.tajweed-enabled {
  line-height: 2.2 !important;
  font-family: var(--font-ar);
}

/* Make tajweed colors visible */
.verse-arabic.tajweed-enabled .tajweed-ham_wasl,
.verse-arabic.tajweed-enabled .tajweed-slnt {
  color: #7e8a97;
}

.verse-arabic.tajweed-enabled .tajweed-ghn,
.verse-arabic.tajweed-enabled .tajweed-idgh_ghn,
.verse-arabic.tajweed-enabled .tajweed-iqlb {
  color: #2e9d62;
  background: rgba(46, 157, 98, 0.10);
}

.verse-arabic.tajweed-enabled .tajweed-idgh_w_ghn,
.verse-arabic.tajweed-enabled .tajweed-ikhf,
.verse-arabic.tajweed-enabled .tajweed-ikhf_shfw {
  color: #9b59b6;
  background: rgba(155, 89, 182, 0.10);
}

.verse-arabic {
  /* Force Arabic ayah text to be comfortably large by default. */
  --verse-font-percent: 120;
  --verse-font-size: clamp(2.2rem, calc(var(--verse-font-percent, 120) * 0.02rem), 4rem);
  font-family: var(--font-ar);
  /* `--text-scale` is controlled by the text size slider; apply it to Arabic too. */
  font-size: calc(var(--verse-font-size) * var(--ui-scale, 1) * var(--text-scale, 1));
  line-height: 2.1;
  text-align: right;
  direction: rtl;
  unicode-bidi: isolate;
  background: var(--bg-elevated);
  padding: 20px;
  border-radius: 16px;
  margin: 12px 0;
  display: block;
  overflow-wrap: anywhere;
  word-break: normal;
  contain: layout paint;
}

/* Force re-render when font changes */
.verse-arabic.tajweed-enabled,
.verse-arabic:not(.tajweed-enabled) {
  transition: font-size 0.1s ease;
}

@keyframes wordHighlightPulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.03);
  }

  100% {
    transform: scale(1.02);
  }
}

/* Combined Tajweed + Word Highlighting */
.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word {
  display: inline-block;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 0 2px;
  cursor: pointer;
}

.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word.highlighted {
  background: var(--accent);
  color: white;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word:hover {
  background: var(--accent-light);
  cursor: pointer;
}

/* Preserve tajweed colors inside highlighted words but make them visible */
.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word.highlighted .tajweed-mark {
  color: inherit !important;
  background: transparent !important;
}

.verse-arabic.tajweed-enabled.word-highlight-enabled .wbw-word.highlighted [class*="tajweed-"] {
  color: white !important;
  background: transparent !important;
}

/* Mode Button Styling */
.mode-btn {
  background: var(--surface);
  border: 1px solid var(--accent);
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-btn i:first-child {
  font-size: 0.85rem;
}

.mode-btn .bi-chevron-down {
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.mode-btn:hover .bi-chevron-down {
  transform: translateY(2px);
}

.mode-btn:hover {
  background: var(--accent-light);
}

/* Make all buttons consistent */
.session-rail-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.rail-btn {
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
}

.rail-btn-ghost {
  background: var(--accent-light);
  color: var(--accent);
}

.rail-btn-ghost:hover {
  background: var(--accent);
  color: white;
}

.rail-btn:disabled,
.rail-btn-ghost:disabled,
.rail-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
  box-shadow: none;
}

.rail-btn-resume {
  background: rgba(255, 255, 255, 0.92);
  color: var(--accent);
  border: 1px solid var(--accent-soft);
}

.rail-btn-resume:hover {
  background: var(--accent-light);
  transform: translateY(-1px);
}

.rail-btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.2);
}

.rail-btn-primary:hover {
  background: var(--accent-strong);
  transform: translateY(-1px);
}

body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--text);
}

html {
  background: var(--bg);
}

.app {
  min-height: 100dvh;
  font-size: calc(16px * var(--ui-scale, 1));
  animation: appFade 260ms ease-out;
  overflow-x: clip;
}

.verse-arabic {
  min-height: 60px;
}

/* Session Rail */
.session-rail {
  background: var(--surface);
  border-radius: 20px;
  margin-bottom: 20px;
  padding: 12px 16px 14px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.session-rail-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 12px;
}

.session-rail-copy {
  flex: 1;
  min-width: 0;
}

.session-rail-headline {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.session-rail-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.session-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.71rem;
  white-space: nowrap;
}

.session-pill strong {
  color: var(--text);
  font-weight: 700;
}

.session-pill-focus {
  max-width: min(280px, 100%);
}

.session-pill-focus strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-rail-kicker {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.session-rail-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.session-rail-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.session-rail-actions {
  display: flex;
  gap: 10px;
}

.rail-btn {
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
}

.rail-btn-ghost {
  background: var(--accent-light);
  color: var(--accent);
}

.rail-btn-ghost:hover {
  background: var(--accent);
  color: white;
}

.rail-btn-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.2);
}

.rail-btn-primary:hover {
  background: var(--accent-strong);
  transform: translateY(-1px);
}

.session-rail-subnote {
  margin-top: 10px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Mode Indicator */
.mode-indicator {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  margin: 8px 0 12px 0;
  background: var(--accent-light);
  border-radius: 40px;
  font-size: 0.7rem;
  color: var(--accent);
  border: 1px solid var(--accent-soft);
  width: fit-content;
}

.mode-switch-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--accent);
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mode-switch-btn:hover {
  background: rgba(154, 103, 56, 0.2);
  transform: rotate(180deg);
}

.progress-bar-wide {
  margin-top: 10px;
  height: 6px;
  position: relative;
  overflow: visible;
}

.progress-label {
  position: absolute;
  top: -24px;
  right: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
}

/* Responsive */
@media (max-width: 640px) {
  .session-rail-top {
    flex-direction: column;
    align-items: stretch;
  }

  .session-rail-actions {
    justify-content: stretch;
    width: 100%;
    flex-wrap: wrap;
  }

  .rail-btn {
    flex: 1;
    justify-content: center;
  }
}

.verse-arabic-loading {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  animation: pulse 1s infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 0.6;
  }
}

/* Ensure HTML content is styled properly before Vue mounts */
.verse-arabic word,
.verse-arabic .wbw-word {
  display: inline-block;
  transition: all 0.15s ease;
  vertical-align: baseline;
  white-space: nowrap;
}

/* Prevent raw HTML showing */
.verse-arabic:empty {
  display: none;
}

/* Tajweed styles */
.verse-arabic.tajweed-enabled [class*="tajweed"] {
  display: inline;
}

/* Color rules for tajweed - adjust based on what API returns */
.verse-arabic [class*="ghunnah"],
.verse-arabic [class*="Ghunnah"] {
  color: #2ecc71;
}

.verse-arabic [class*="madd"],
.verse-arabic [class*="Madd"] {
  color: #e74c3c;
}

.verse-arabic [class*="qalqalah"],
.verse-arabic [class*="Qalqalah"] {
  color: #f39c12;
}

.verse-arabic [class*="ikhfa"],
.verse-arabic [class*="Ikhfa"] {
  color: #9b59b6;
}

.verse-arabic [class*="idgham"],
.verse-arabic [class*="Idgham"] {
  color: #3498db;
}

/* Word by Word styles */
.wbw-word {
  display: inline-block;
  padding: 5px 8px;
  margin: 2px 3px;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 1.05rem;
  background: rgba(154, 103, 56, 0.05);
}

.wbw-word:hover {
  background: var(--accent-light);
  transform: scale(1.02);
}

.wbw-word.highlighted {
  background: var(--accent);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
  animation: pop 180ms ease-out;
}

.verse-arabic.verse-weak .wbw-word.weak-word {
  background: #fff3bf;
  color: #5f4b00;
}

.verse-arabic.verse-mastered .wbw-word.mastered-word {
  background: #d3f9d8;
  color: #1f6f31;
}

@keyframes pop {
  from {
    transform: scale(1.01);
  }

  to {
    transform: scale(1.05);
  }
}

/* Word highlighting styles */
.verse-arabic word {
  display: inline-block;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 0 2px;
  cursor: pointer;
}

.verse-arabic word.highlighted {
  background: var(--accent);
  color: white;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.verse-arabic word:hover {
  background: var(--accent-light);
  cursor: pointer;
}

.rail-stat strong,
.player-eta {
  cursor: help;
  border-bottom: 1px dotted var(--text-muted);
}

/* Optional: Show detailed breakdown on hover */
.rail-stat:hover strong::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-strong);
  color: var(--text);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  white-space: nowrap;
  z-index: 100;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

/* Minimized Session Rail */
.session-rail-mini {
  position: sticky;
  top: 12px;
  z-index: 18;
  padding: 10px;
  padding-top: 8px;
  margin-bottom: 20px;
  background: var(--surface);
  border-radius: 12px;
  border: 1px solid var(--border);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all 0.2s ease;
}

.session-rail-mini:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--accent-soft);
}

.rail-mini-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 12px 8px 16px;
}

.rail-mini-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.rail-mini-icon {
  width: 32px;
  height: 32px;
  background: var(--accent-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rail-mini-icon i {
  font-size: 0.9rem;
  color: var(--accent);
}

.rail-mini-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-mini-surah {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
}

.rail-mini-progress {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.rail-mini-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mini-stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.mini-stat-item i {
  font-size: 0.7rem;
  color: var(--accent);
}

.rail-mini-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--text-muted);
}

.mini-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent);
  color: var(--accent);
}

.mini-btn:first-child {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.mini-btn:first-child:hover {
  transform: scale(1.05);
  background: var(--accent-strong);
}

.rail-mini-progress {
  height: 2px;
  background: var(--border);
}

.progress-fill-mini {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

/* Responsive */
@media (max-width: 640px) {
  .rail-mini-stats {
    display: none;
  }

  .rail-mini-content {
    padding: 6px 10px 6px 12px;
  }

  .rail-mini-surah {
    font-size: 0.75rem;
  }
}

/* Font Dropdown */
.font-dropdown {
  position: relative;
}

.font-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text);
}

.font-dropdown-trigger:hover {
  background: var(--accent-light);
  border-color: var(--accent);
}

.font-dropdown-trigger .bi-chevron-down {
  transition: transform 0.2s;
  font-size: 0.7rem;
}

.font-dropdown-trigger .bi-chevron-down.rotated {
  transform: rotate(180deg);
}

.font-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 100;
  backdrop-filter: blur(12px);
}

.font-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
  transition: all 0.15s;
  color: var(--text);
}

.font-option:hover {
  background: var(--accent-light);
}

.font-option.active {
  background: var(--accent);
  color: white;
}

.font-option .check-icon {
  margin-left: auto;
  font-size: 0.8rem;
}

/* Dropdown Animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Tajweed styles for AlQuran quran-tajweed edition */
.verse-arabic.tajweed-enabled {
  line-height: 2;
  white-space: normal;
  overflow-wrap: anywhere;
}

.verse-arabic.tajweed-enabled .tajweed-mark,
.mushaf-ayah-text.tajweed-enabled .tajweed-mark {
  display: inline;
  border-radius: 0.2em;
  padding: 0 0.03em;
}

.verse-arabic.tajweed-enabled .tajweed-ham_wasl,
.verse-arabic.tajweed-enabled .tajweed-slnt,
.mushaf-ayah-text.tajweed-enabled .tajweed-ham_wasl,
.mushaf-ayah-text.tajweed-enabled .tajweed-slnt {
  color: #7e8a97;
}

.verse-arabic.tajweed-enabled .tajweed-ghn,
.verse-arabic.tajweed-enabled .tajweed-idgh_ghn,
.verse-arabic.tajweed-enabled .tajweed-iqlb,
.mushaf-ayah-text.tajweed-enabled .tajweed-ghn,
.mushaf-ayah-text.tajweed-enabled .tajweed-idgh_ghn,
.mushaf-ayah-text.tajweed-enabled .tajweed-iqlb {
  color: #2e9d62;
  background: rgba(46, 157, 98, 0.10);
}

.verse-arabic.tajweed-enabled .tajweed-idgh_w_ghn,
.verse-arabic.tajweed-enabled .tajweed-ikhf,
.verse-arabic.tajweed-enabled .tajweed-ikhf_shfw,
.mushaf-ayah-text.tajweed-enabled .tajweed-idgh_w_ghn,
.mushaf-ayah-text.tajweed-enabled .tajweed-ikhf,
.mushaf-ayah-text.tajweed-enabled .tajweed-ikhf_shfw {
  color: #9b59b6;
  background: rgba(155, 89, 182, 0.10);
}

.verse-arabic.tajweed-enabled .tajweed-qlq,
.verse-arabic.tajweed-enabled .tajweed-lqlq,
.mushaf-ayah-text.tajweed-enabled .tajweed-qlq,
.mushaf-ayah-text.tajweed-enabled .tajweed-lqlq {
  color: #d98824;
  background: rgba(217, 136, 36, 0.12);
}

.verse-arabic.tajweed-enabled .tajweed-madda_normal,
.verse-arabic.tajweed-enabled .tajweed-madda_permissible,
.verse-arabic.tajweed-enabled .tajweed-madda_necessary,
.verse-arabic.tajweed-enabled .tajweed-madda_obligatory,
.verse-arabic.tajweed-enabled .tajweed-madda_pbligatory,
.mushaf-ayah-text.tajweed-enabled .tajweed-madda_normal,
.mushaf-ayah-text.tajweed-enabled .tajweed-madda_permissible,
.mushaf-ayah-text.tajweed-enabled .tajweed-madda_necessary,
.mushaf-ayah-text.tajweed-enabled .tajweed-madda_obligatory,
.mushaf-ayah-text.tajweed-enabled .tajweed-madda_pbligatory {
  color: #d55245;
  background: rgba(213, 82, 69, 0.10);
}

.verse-arabic.tajweed-enabled .tajweed-idgh_mus,
.verse-arabic.tajweed-enabled .tajweed-idghm_shfw,
.verse-arabic.tajweed-enabled .tajweed-idgh_shfw,
.verse-arabic.tajweed-enabled .tajweed-ghn+.tajweed-mark,
.mushaf-ayah-text.tajweed-enabled .tajweed-idgh_mus,
.mushaf-ayah-text.tajweed-enabled .tajweed-idghm_shfw,
.mushaf-ayah-text.tajweed-enabled .tajweed-idgh_shfw,
.mushaf-ayah-text.tajweed-enabled .tajweed-ghn+.tajweed-mark {
  color: #2b7bbb;
  background: rgba(43, 123, 187, 0.10);
}

/* Toolbar chip active state for tajweed */
.toolbar-chip.active {
  background: var(--accent);
  color: white;
}

.verse-play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.verse-play-btn i {
  font-size: 0.9rem;
}

.verse-play-btn:hover {
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.85);
  color: var(--accent);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.3);
}

.verse-play-btn:active {
  transform: scale(0.98);
}

.verse-preview-label {
  margin-left: 10px;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 650;
  user-select: none;
}

.resume-details {
  margin-top: 10px;
  border: 1px solid rgba(154, 103, 56, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  padding: 10px 12px;
}

.resume-details summary {
  cursor: pointer;
  list-style: none;
  font-weight: 650;
  color: var(--text);
}

.resume-details summary::-webkit-details-marker {
  display: none;
}

.verse-download-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.verse-download-btn:hover:not(:disabled) {
  transform: scale(1.05);
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.96);
}

.verse-download-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.speed-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-right: 4px;
}

.speed-controls {
  display: flex;
  gap: 4px;
}

.speed-btn {
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.streak-motivation {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--surface);
  border-radius: 40px;
  font-size: 0.75rem;
}

.streak-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.motivation-message {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.pa-note {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 4px;
  display: block;
}

/* Active tab indicator with pulse effect */
.tools-tabs button.active-tab {
  position: relative;
  animation: tabPulse 0.22s ease-out;
}

@keyframes tabPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--accent);
  }

  50% {
    transform: scale(1.012);
    box-shadow: 0 0 0 3px var(--accent-light);
  }

  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 transparent;
  }
}

.quick-tools {
  border: 1px solid rgba(154, 103, 56, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
}

.quick-tools-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 14px;
}

.quick-tool {
  border: 1px solid rgba(154, 103, 56, 0.10);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  padding: 10px;
  display: grid;
  gap: 8px;
  min-width: 0;
}

.quick-tool-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.quick-tool-label {
  font-size: 0.74rem;
  font-weight: 750;
  color: var(--text);
}

.quick-tool-value {
  font-size: 0.74rem;
  font-weight: 650;
  color: var(--text-muted);
}

.quick-tool-body {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.quick-tool-body.disabled {
  opacity: 0.55;
}

.quick-tool-body-muted {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.quick-range {
  flex: 1 1 auto;
  min-width: 0;
}

.toggle-chip {
  min-height: 32px;
  min-width: 68px;
  padding: 6px 14px;
  border-radius: 40px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  letter-spacing: 0.3px;
  position: relative;
  overflow: hidden;
}

/* Improved Toggle Buttons - Consistent with modern UI */
.toggle-chip {
  min-height: 32px;
  min-width: 68px;
  padding: 6px 14px;
  border-radius: 40px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  letter-spacing: 0.3px;
  position: relative;
  overflow: hidden;
}

.toggle-chip::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(154, 103, 56, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.toggle-chip:active::before {
  width: 100px;
  height: 100px;
}

.toggle-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.toggle-chip.active {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.toggle-chip.active:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.4);
  filter: brightness(1.05);
}

.toggle-chip:active {
  transform: translateY(0);
}

.mode-radio-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.mode-radio {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 34px;
  min-width: 34px !important;
  max-width: 34px;
  width: 34px !important;
  height: 34px;
  aspect-ratio: 1 / 1;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(154, 103, 56, 0.24);
  background: rgba(255, 250, 243, 0.95);
  color: inherit;
  cursor: pointer;
  transition: all 0.18s ease;
}

.mode-radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.mode-radio-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: rgba(154, 103, 56, 0.72);
  transition: color 0.18s ease, transform 0.18s ease;
}

.mode-radio.active {
  border-color: rgba(154, 103, 56, 0.38);
  background: rgba(248, 236, 222, 0.95);
}

.mode-radio.active .mode-radio-icon {
  color: #2f8f52;
  transform: scale(1.05);
}

.mode-radio:hover {
  border-color: rgba(154, 103, 56, 0.3);
  background: rgba(252, 244, 235, 0.95);
}

.mode-radio:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.workspace-shell-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(58, 167, 109, 0.16);
  border: 1px solid rgba(58, 167, 109, 0.28);
  color: #1f6b45;
  font-size: 0.72rem;
  font-weight: 700;
}

.active-techniques-section {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(58, 167, 109, 0.1);
  background: linear-gradient(180deg, rgba(245, 252, 247, 0.82), rgba(241, 249, 243, 0.72));
  box-shadow: none;
}

.active-techniques-header {
  margin-bottom: 10px;
  padding: 0 0 2px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.active-techniques-count {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(58, 167, 109, 0.08);
  color: rgba(31, 107, 69, 0.75);
  font-size: 0.72rem;
  font-weight: 700;
}

.active-techniques-grid {
  display: grid;
  gap: 8px;
}

.active-technique-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(58, 167, 109, 0.08);
  background: rgba(250, 253, 250, 0.92);
  box-shadow: none;
}

.active-technique-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: rgba(47, 140, 90, 0.82);
  background: rgba(58, 167, 109, 0.08);
  flex: 0 0 auto;
}

.active-technique-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-top: 0;
}

.active-technique-copy strong {
  font-size: 0.78rem;
  color: rgba(31, 107, 69, 0.9);
  font-weight: 700;
}

.active-technique-copy span {
  font-size: 0.69rem;
  line-height: 1.35;
  color: rgba(31, 107, 69, 0.68);
}

/* Compact toggle for headers */
.st-right-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.st-right-group .toggle-chip {
  min-height: 32px;
  min-width: 68px;
  padding: 4px 12px;
  font-size: 0.75rem;
}

/* Switch-style alternative (optional) */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  min-width: 52px;
  height: 30px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 30px;
  transition: all 0.2s ease;
}

.toggle-switch.active {
  background: var(--accent);
  border-color: transparent;
}

.toggle-switch-knob {
  position: absolute;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-switch-knob {
  transform: translateX(22px);
}

.toggle-switch-label {
  margin-left: 60px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.toggle-switch.active+.toggle-switch-label {
  color: var(--accent);
}

/* Technique toggle specific */
.technique-toggle {
  min-height: 32px;
  min-width: 72px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Settings toggle */
.settings-toggle {
  min-height: 36px;
  min-width: 72px;
  font-weight: 600;
}

/* Ripple effect animation */
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.toggle-chip-ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple 0.4s linear;
  pointer-events: none;
}

/* Toggle switch animation and visual feedback */
.switch {
  transition: all 0.2s ease;
}

.switch:active {
  transform: scale(0.98);
}

.switch-ui {
  transition: background 0.2s ease;
}

.switch-ui::after {
  transition: transform 0.2s ease, background 0.2s ease;
}

.switch input:checked+.switch-ui {
  background: rgba(139, 94, 60, 0.65);
  animation: switchPulse 0.3s ease-out;
}

@keyframes switchPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(139, 94, 60, 0.4);
  }

  50% {
    box-shadow: 0 0 0 4px rgba(139, 94, 60, 0.2);
  }

  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

/* Field hint styling */
.field-hint {
  font-size: calc(0.7rem * var(--en-scale, 1));
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.26;
  display: block;
}

/* Verse Arabic styling */
.verse-arabic {
  /* Force Arabic ayah text to be comfortably large by default. */
  --verse-font-percent: 120;
  --verse-font-size: clamp(2.2rem, calc(var(--verse-font-percent, 120) * 0.02rem), 4rem);
  font-family: var(--font-ar);
  font-size: calc(var(--verse-font-size) * var(--ui-scale, 1) * var(--text-scale, 1));
  line-height: 2.1;
  text-align: right;
  direction: rtl;
  unicode-bidi: isolate;
  background: var(--bg-elevated);
  padding: 20px;
  border-radius: 16px;
  margin: 12px 0;
}

.verse-arabic word {
  display: inline-block;
  font-size: 1em;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 0 2px;
}

.verse-arabic word.highlighted {
  background: var(--accent);
  color: white;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

.verse-card {
  background: var(--surface);
  border-radius: 20px;
  padding: 26px;
  transition: all 0.2s ease;
  border: 1px solid var(--border);
  position: relative;
  direction: ltr;
  overflow: hidden;
  width: 100%;
  display: grid;
  align-content: start;
  gap: 14px;
  isolation: isolate;
}

.verse-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(184, 130, 78, 0.03), transparent 22%),
    radial-gradient(circle at top right, rgba(184, 130, 78, 0.05), transparent 28%);
}

.verse-card.active {
  border-color: var(--accent);
  background: linear-gradient(145deg, rgba(184, 130, 78, 0.14), rgba(154, 103, 56, 0.04));
  box-shadow: 0 0 0 1px var(--accent), 0 14px 32px rgba(154, 103, 56, 0.18);
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.main.focus-mode-active .verse-card:not(.active) {
  opacity: 0.54;
  filter: saturate(0.72);
}

.main.focus-mode-active .workspace-fab-live,
.main.focus-mode-active .verse-card:not(.active) .verse-aid {
  opacity: 0.38;
}



/* Removed: "For serious huffadh training" badge */

.verse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
}

.verse-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.verse-number {
  font-size: 0.78rem;
  padding: 6px 12px;
  background: var(--accent);
  border-radius: 999px;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(154, 103, 56, 0.24);
}

.verse-status-badge,
.verse-status-subtle {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.68rem;
  font-weight: 600;
}

.verse-status-badge {
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--accent-soft);
}

.verse-status-subtle {
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.verse-ref {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-family: monospace;
}

.verse-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

/* Font controls */
.verse-font-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--accent-light);
  border-radius: 20px;
  padding: 2px 6px;
  margin-right: 8px;
}

.verse-font-btn {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;
  color: var(--text);
}

.verse-font-btn:hover {
  background: var(--accent);
  color: white;
  transform: scale(1.05);
}

.verse-font-size-indicator {
  font-size: 10px;
  min-width: 35px;
  text-align: center;
  color: var(--text-muted);
  font-weight: 500;
}

/* Session rail */
.session-rail {
  position: sticky;
  top: 14px;
  z-index: 18;
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-md);
  animation: railIn 280ms ease-out;
}

.session-rail-top {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.session-rail-kicker {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.session-rail-title {
  margin-top: 2px;
  font-size: 14px;
  font-weight: 450;
}

.session-rail-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
}

.session-rail-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.session-rail-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.rail-stat {
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(78, 58, 38, 0.07);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-stat span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.rail-stat strong {
  font-size: 0.78rem;
  font-weight: 500;
}

.rail-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 13px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  color: var(--text);
  font-size: 12px;
  font-weight: 450;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.rail-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 28px rgba(154, 103, 56, 0.28);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-wide {
  margin-top: 10px;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

/* Mode indicator */
.mode-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin: 8px 0 4px;
  background: var(--accent-light);
  border-radius: 20px;
  font-size: 0.7rem;
  color: var(--accent);
  border: 1px solid var(--accent-soft);
  width: fit-content;
}

/* Reading toolbar */
.reading-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.reading-toolbar-sep {
  width: 100%;
  height: 1px;
  border: 0;
  background: var(--border);
  opacity: 0.9;
}

.reading-toolbar-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.toolbar-chip {
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--text-muted);
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-chip i,
.rail-btn i,
.tools-tabs button i,
.st-ico i {
  font-size: 0.9rem;
  line-height: 1;
}

.toolbar-chip.active {
  background: var(--accent);
  color: #fff;
}

.toolbar-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.quick-font-controls {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.quick-font-dropdown {
  position: relative;
}

.quick-font-menu {
  right: 0;
  left: auto;
  min-width: 220px;
}

.verse-font-inline-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: var(--shadow-sm);
}

.verse-font-inline-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.08);
  color: var(--accent-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.verse-font-inline-btn:hover {
  transform: translateY(-1px);
  background: rgba(154, 103, 56, 0.14);
}

.verse-font-inline-value {
  min-width: 44px;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text);
}

/* Tools panel */
.tools {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  height: 100dvh;
  width: min(var(--tools-width), 92vw);
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.96), rgba(247, 240, 231, 0.92));
  border-left: 1px solid var(--border);
  backdrop-filter: blur(14px);
  transform: translateX(100%);
  transition: transform 0.25s ease, visibility 0.25s ease;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg);
  isolation: isolate;
  visibility: hidden;
  pointer-events: none;
  overscroll-behavior: contain;
}

.tools-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 12, 8, 0.35);
  backdrop-filter: blur(1px);
  z-index: 1099;
  touch-action: none;
}

.tools.open {
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

.tools-top {
  padding: 18px 18px 12px;
  border-bottom: 1px solid var(--border);
}

.tools-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tools-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--text);
}

.tools-context {
  margin-top: 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.tools-x {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(154, 103, 56, 0.28);
  background: rgba(255, 252, 247, 0.96);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #5c4633;
  box-shadow: 0 8px 24px rgba(61, 40, 20, 0.08);
  transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease;
}

.tools-x-glyph {
  display: inline-block;
  font-size: 1.6rem;
  line-height: 1;
  font-weight: 500;
  transform: translateY(-1px);
}

.tools-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.tools-tabs button {
  flex: 1 1 0;
  padding: 7px 10px;
  border-radius: 12px;
  background: transparent;
  border: none;
  font-size: 0.82rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.55);
  font-weight: 450;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 140ms ease, color 140ms ease, transform 140ms ease, box-shadow 160ms ease;
  white-space: nowrap;
}

.tools-tabs button.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.84));
  box-shadow: var(--shadow-sm);
  color: rgba(0, 0, 0, 0.85);
}

.tools-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 20px calc(var(--tools-footer-h) + 26px);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* Compact mode (default) to reduce cognitive load */
.tools-body.compact .st-sub,
.tools-body.compact .field-hint,
.tools-body.compact .analytics-help,
.tools-body.compact .stat-help {
  display: block !important;
}

.tools-body.compact .sheet {
  gap: 8px;
}

.tools-body.compact .sheet-section {
  padding: 0;
  border-radius: 14px;
}

.tools-body.compact .sheet-toggle {
  padding: 10px 12px;
}

.tools-body.compact .sheet-content {
  padding: 8px 12px 10px;
}

.tools-body.compact .field-stack {
  gap: 12px;
}

.tools-body.compact .field label {
  margin-bottom: 6px;
}

.tools-body.compact .sheet-section-compact {
  border-radius: 14px;
}

.tools-body.compact .sheet-section-compact .sheet-toggle {
  padding: 11px 13px;
}

.tools-body.compact .sheet-section-compact .sheet-content {
  padding: 8px 13px 13px;
}

.tools-body.compact .field-stack-compact {
  gap: 10px;
}

.tools-body.compact .field-stack-compact .field {
  gap: 6px;
}

.tools-body.compact .field-stack-compact .field label {
  margin-bottom: 0;
}

.tools-body.compact .field-stack-compact .select,
.tools-body.compact .field-stack-compact .input {
  padding: 10px 12px;
}

.tools-body.compact .field-stack-compact .field-hint {
  margin-top: 1px;
}

.tools-body.compact .field-stack-compact .slider-markers {
  margin-top: 2px;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sheet-section {
  border: 1px solid var(--border);
  background: rgba(255, 252, 248, 0.5);
  border-radius: 14px;
  padding: 0;
  overflow: hidden;
  animation: riseSoft 260ms ease-out;
}

.sheet-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 250, 245, 0.78));
  cursor: pointer;
  transition: background 140ms ease, transform 140ms ease;
}

.st-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.st-ico {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, rgba(139, 94, 60, 0.16), rgba(139, 94, 60, 0.06));
  border: 1px solid rgba(139, 94, 60, 0.18);
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}

.st-txt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.st-title {
  padding-top: 5px;
  font-weight: 450;
  letter-spacing: -0.2px;
  color: var(--text);
  font-size: 0.82rem;
  white-space: nowrap;
}

.st-sub {
  font-size: 0.66rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.st-chev {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.78);
  color: rgba(0, 0, 0, 0.65);
  transition: transform 0.15s ease;
  box-shadow: var(--shadow-sm);
}

.st-chev.open {
  transform: rotate(180deg);
}

.sheet-content {
  padding: 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.field label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

.field-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.35;
  display: block;
}

.select,
.input {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border-radius: 13px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.85);
  color: var(--text);
  font-size: 0.8rem;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);
}

.range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-single {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
}

.range span {
  color: rgba(0, 0, 0, 0.35);
  font-weight: 450;
  font-size: 11px;
}

.radio-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.radio {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text);
  user-select: none;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.radio:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.radio input {
  margin: 0;
}

.switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-ui {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.12);
  position: relative;
  flex: 0 0 auto;
  transition: background 0.2s ease;
}

.switch-ui::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: white;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
  transition: transform 0.2s ease, background 0.2s ease;
}

.switch input:checked+.switch-ui {
  background: rgba(139, 94, 60, 0.65);
}

.switch input:checked+.switch-ui::after {
  transform: translateX(18px);
}

.switch-text {
  font-size: 0.74rem;
  color: rgba(0, 0, 0, 0.72);
  font-weight: 400;
}

.tools-techniques-section {
  border-color: rgba(139, 94, 60, 0.16);
  box-shadow: none;
}

.techniques-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.technique-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(63, 39, 18, 0.055);
}

.technique-row-stacked {
  align-items: stretch;
  flex-direction: column;
}

.technique-row-main,
.technique-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.technique-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.technique-copy label {
  margin: 0;
  color: var(--text);
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 560;
  white-space: nowrap;
}

.technique-copy small,
.technique-control span {
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.73rem;
  font-weight: 400;
  line-height: 1.45;
}

.technique-toggle {
  flex: 0 0 86px;
  min-height: 40px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 560;
  border-width: 1px;
}

.technique-control {
  padding-top: 12px;
  border-top: 1px solid rgba(154, 103, 56, 0.10);
}

.technique-range {
  flex: 1 1 auto;
  min-width: 96px;
  padding: 0;
  box-shadow: none;
}

.segmented-control {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 5px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  border-radius: 14px;
  background: rgba(98, 73, 49, 0.045);
}

.segmented-control button {
  min-width: 0;
  min-height: 42px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 560;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.segmented-control button.active {
  background: #fffaf4;
  color: var(--accent-strong);
  border-color: rgba(154, 103, 56, 0.20);
  box-shadow: 0 8px 18px rgba(63, 39, 18, 0.09);
}

.technique-preview {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(154, 103, 56, 0.07);
  border: 1px solid rgba(154, 103, 56, 0.12);
  color: rgba(98, 73, 49, 0.92);
  font-family: inherit;
  font-size: 0.74rem;
  font-weight: 430;
  line-height: 1.45;
}

/* Start button */
.start-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  transition: all 0.2s ease;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tools footer */
.tools-footer {
  position: sticky;
  bottom: 0;
  min-height: var(--tools-footer-h);
  padding: 12px 16px 14px;
  border-top: 1px solid var(--border);
  background: linear-gradient(to top, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0));
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.tools-btn {
  flex: 1;
  min-height: 44px;
  padding: 10px 10px;
  border-radius: 15px;
  font-weight: 500;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
}

.tools-btn-soft {
  color: var(--text-muted);
  border-color: var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.42));
  box-shadow: none;
}

.tools-btn-soft:hover {
  color: var(--text);
  border-color: var(--accent-soft);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.6));
}

.tools-btn-primary {
  color: #fff;
  border-color: rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: var(--shadow-sm);
}

.tools-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.tools-btn:active:not(:disabled),
.fab-btn:active:not(:disabled),
.toggle-chip:active:not(:disabled),
.sheet-toggle:active:not(:disabled) {
  transform: translateY(0);
}

.tools-btn:hover:not(:disabled),
.fab-btn:hover:not(:disabled),
.toggle-chip:hover:not(:disabled),
.sheet-toggle:hover:not(:disabled) {
  filter: brightness(1.02);
}

.tools-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.tools-btn-start {
  flex: 1.6;
}

/* Hero section */
.hero-card {
  margin-bottom: 16px;
  padding: 18px 18px 16px;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(245, 236, 226, 0.92));
  box-shadow: var(--shadow-md);
  display: grid;
  gap: 14px;
  animation: riseSoft 260ms ease-out;
}

.hero-kicker {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent);
}

.hero-title {
  margin-top: 6px;
  font-size: 1.24rem;
  font-weight: 500;
  letter-spacing: -0.03em;
}

.hero-sub {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
  max-width: 56ch;
}

.hero-flow {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.hero-step {
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.62);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.74rem;
}

.hero-step span {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 11px;
}

.hero-step strong {
  font-weight: 500;
}

.hero-points {
  display: grid;
  gap: 8px;
}

.hero-point {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.hero-point i {
  color: var(--accent);
}

.hero-actions,
.empty-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.cta {
  flex: 1;
  padding: 10px 10px;
  border-radius: 14px;
  font-weight: 450;
  border: 1px solid rgba(0, 0, 0, 0.10);
  cursor: pointer;
  font-size: 11px;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.cta-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border-color: rgba(0, 0, 0, 0.06);
  box-shadow: 0 16px 36px rgba(139, 94, 60, 0.28);
}

.cta-ghost {
  background: rgba(255, 255, 255, 0.58);
  box-shadow: var(--shadow-sm);
}

/* Empty state */
.empty {
  padding: 40px 0;
}

.empty-card {
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  border-radius: var(--radius);
  padding: 32px;
  text-align: center;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

.empty-icon {
  font-family: var(--font-ar);
  font-size: 2.2rem;
  color: var(--accent);
  margin-bottom: 12px;
}

.empty-card h3 {
  font-weight: 450;
  margin-bottom: 6px;
  font-size: 1rem;
}

.empty-card p {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-bottom: 16px;
}

/* Verses grid */
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-top: 14px;
}

.workspace-main {
  min-width: 0;
}

.workspace-shell {
  width: min(100%, 980px);
  margin: 0 auto 18px;
}

.workspace-shell {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 20px;
  border: 1px solid rgba(154, 103, 56, 0.16);
  background:
    linear-gradient(160deg, rgba(255, 251, 245, 0.98), rgba(255, 255, 255, 0.9)),
    radial-gradient(circle at top right, rgba(184, 130, 78, 0.09), transparent 28%);
  box-shadow: 0 14px 28px rgba(63, 39, 18, 0.07);
  position: relative;
}

.workspace-shell.collapsed {
  gap: 8px;
  padding: 12px 14px;
}

.workspace-shell-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: flex-start;
}

.workspace-shell-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.workspace-shell-kicker {
  display: inline-flex;
  width: fit-content;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.1);
  color: var(--accent-strong);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.workspace-shell-kicker-review {
  background: rgba(183, 28, 28, 0.12);
  color: #9f1f1f;
}

.workspace-shell-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.workspace-shell-copy h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  line-height: 1.08;
  font-weight: 650;
}

.workspace-shell-phase {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(154, 103, 56, 0.14);
  color: var(--accent-strong);
  font-size: 0.73rem;
  font-weight: 650;
}

.workspace-shell-phase-review {
  border-color: rgba(183, 28, 28, 0.24);
  color: #9f1f1f;
  background: rgba(183, 28, 28, 0.09);
}

.workspace-shell-copy h2 {
  margin: 0;
  color: var(--text);
  font-size: 1rem;
  line-height: 1.15;
  font-weight: 600;
}

.workspace-shell-copy p {
  margin: 0;
  color: var(--text-muted);
  max-width: 58ch;
  font-size: 0.8rem;
  line-height: 1.35;
}

.workspace-shell-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workspace-shell-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.15);
  background: rgba(255, 255, 255, 0.86);
  color: rgba(48, 42, 35, 0.86);
  font-size: 0.76rem;
  font-weight: 600;
}

.workspace-shell-meta-review {
  border-color: rgba(183, 28, 28, 0.24) !important;
  color: #9f1f1f !important;
  background: rgba(183, 28, 28, 0.08) !important;
}

.resume-feedback-bars,
.session-feedback-bars {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.session-feedback-panel {
  margin-top: 8px;
  border: 1px solid rgba(154, 103, 56, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  padding: 8px 10px;
}

.session-feedback-panel summary {
  list-style: none;
  cursor: pointer;
  display: grid;
  gap: 2px;
  color: var(--text);
  font-weight: 650;
}

.session-feedback-panel summary::-webkit-details-marker {
  display: none;
}

.session-feedback-panel summary small {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.74rem;
}

.resume-feedback-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.resume-progress-repetition {
  background: linear-gradient(90deg, #f2c94c, #e3a008);
}

.resume-progress-retention {
  background: linear-gradient(90deg, #e57373, #c62828);
}

.pill-status-mastered {
  border-color: rgba(46, 125, 50, 0.22);
  background: rgba(76, 175, 80, 0.08);
  color: #2e7d32;
}

.pill-status-weak {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(245, 158, 11, 0.1);
  color: #8a5a00;
}

.pill-status-repeat {
  border-color: rgba(198, 40, 40, 0.22);
  background: rgba(229, 57, 53, 0.08);
  color: #9f1f1f;
}

.workspace-shell-chaining {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.workspace-shell-chain-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: rgba(255, 255, 255, 0.86);
  color: rgba(48, 42, 35, 0.86);
  font-size: 0.72rem;
  font-weight: 650;
}

.workspace-shell-chain-pill i {
  color: var(--accent-strong);
}

.workspace-shell-chain-pill-soft {
  background: rgba(154, 103, 56, 0.09);
  border-color: rgba(154, 103, 56, 0.14);
  color: var(--accent-strong);
}

.workspace-shell-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.workspace-shell {
  width: min(100%, 1420px);
  gap: 10px;
  padding: 14px 18px;
}

.workspace-shell-head {
  gap: 14px;
  align-items: center;
}

.workspace-shell-copy {
  gap: 6px;
}

.workspace-shell-copy h1 {
  font-size: clamp(1.06rem, 1.45vw, 1.3rem);
  font-weight: 620;
}

.workspace-shell-copy p {
  max-width: 52ch;
  font-size: 0.78rem;
  line-height: 1.45;
}

.workspace-shell-compact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.workspace-shell-compact-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.14);
  background: rgba(255, 255, 255, 0.72);
  color: rgba(48, 42, 35, 0.82);
  font-size: 0.72rem;
  font-weight: 600;
}

.workspace-shell-actions {
  justify-content: flex-end;
}

.workspace-shell-icon-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.main-nav-btn,
.main-card-primary {
  min-height: 42px;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.84rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
}

.main-nav-btn {
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: rgba(255, 255, 255, 0.82);
  color: var(--text);
}

.main-card-primary {
  border: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  box-shadow: 0 12px 24px rgba(154, 103, 56, 0.18);
}

.main-nav-btn:disabled,
.main-card-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.workspace-fab {
  position: sticky;
  top: 14px;
  z-index: 25;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  margin: 8px 0 6px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.58));
  box-shadow: 0 16px 38px rgba(63, 39, 18, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(10px);
  animation: cardSoftIn 220ms cubic-bezier(0.16, 1, 0.3, 1);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.workspace-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 44px rgba(63, 39, 18, 0.18), 0 0 0 1px rgba(154, 103, 56, 0.18);
  border-color: rgba(154, 103, 56, 0.2);
}

@keyframes cardSoftIn {
  from {
    transform: translateY(6px);
    opacity: 0.9;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.workspace-fab-meta {
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 4px;
}

.workspace-fab-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.10);
  color: var(--accent-strong);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.workspace-fab-title {
  font-weight: 650;
  color: var(--text);
  letter-spacing: -0.2px;
  font-size: 0.92rem;
  line-height: 1.15;
}

.workspace-fab-sub {
  margin-top: 3px;
  font-size: 0.74rem;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  line-height: 1.2;
}

.workspace-fab-sub span {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.18);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8px 18px rgba(63, 39, 18, 0.06);
  color: rgba(48, 42, 35, 0.82);
  font-weight: 600;
}

.workspace-fab-live {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 5px;
}

.workspace-fab-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.11);
  border: 1px solid rgba(154, 103, 56, 0.20);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 750;
  box-shadow: 0 10px 20px rgba(63, 39, 18, 0.08);
}

.workspace-fab-live-pill i {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.14);
}

.workspace-fab-live-pill-primary {
  background: linear-gradient(180deg, rgba(154, 103, 56, 0.16), rgba(154, 103, 56, 0.09));
  border-color: rgba(154, 103, 56, 0.28);
}

.workspace-fab-live-pill-mode {
  background: rgba(255, 255, 255, 0.86);
}

.workspace-fab-copy {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.26;
  max-width: 60ch;
  overflow-wrap: anywhere;
}

.workspace-fab-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(46, 125, 50, 0.18);
  background: rgba(46, 125, 50, 0.10);
  color: rgba(46, 125, 50, 0.95);
  font-weight: 650;
  font-size: 0.72rem;
}

.workspace-fab-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 0 0 auto;
}

.fab-btn {
  min-height: 40px;
  padding: 8px 11px;
  border-radius: 13px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
  font-size: 0.84rem;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease;
}

.fab-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 14px 28px rgba(154, 103, 56, 0.22);
}

.fab-btn-soft {
  color: rgba(0, 0, 0, 0.78);
}

.fab-btn-ghost {
  color: rgba(0, 0, 0, 0.78);
}

.verses-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 0;
}

.verse-arabic-primary {
  /* Primary focus: Quran dominates; aids are quieter. */
  font-size: clamp(2.1rem, 2.75vw, 3.05rem);
  line-height: 2.25;
  letter-spacing: 0.01em;
}

.verse-aid {
  opacity: 0.82;
  filter: saturate(0.78);
  margin-top: 0;
  font-size: 0.93em;
  position: relative;
  z-index: 1;
  font-family: 'Outfit', sans-serif;
  direction: ltr;
}

.verse-aid-title {
  margin-bottom: 6px;
  color: var(--accent-strong);
  font-size: 0.8rem;
  font-weight: 700;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.inline-setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.input-compact {
  flex: 0 0 140px;
}

.inline-setting-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  min-width: 58px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.08);
  border: 1px solid rgba(154, 103, 56, 0.12);
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-family: inherit;
  font-weight: 460;
}

.settings-section {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(28, 24, 20, 0.08);
  background: #fffdf9;
  box-shadow: 0 18px 42px rgba(40, 28, 16, 0.08);
}

.settings-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(28, 24, 20, 0.07);
}

.settings-heading-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.settings-heading-copy h3 {
  margin: 0;
  color: #1f1d1a;
  font-size: 1.12rem;
  font-weight: 560;
  line-height: 1.15;
}

.settings-heading-copy p {
  margin: 0;
  color: #6d655d;
  font-size: 0.78rem;
  line-height: 1.45;
}

.settings-status {
  min-height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  background: #f7f2eb;
  border: 1px solid rgba(28, 24, 20, 0.08);
  color: #614326;
  font-size: 0.64rem;
  font-weight: 520;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.settings-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #2f9f68;
  box-shadow: 0 0 0 4px rgba(47, 159, 104, 0.12);
}

.settings-panels {
  display: grid;
  gap: 16px;
}

.settings-group {
  display: grid;
  gap: 10px;
}

.settings-group-title {
  color: #725233;
  font-size: 0.64rem;
  font-weight: 560;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.settings-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-display-grid {
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
}

.settings-card {
  min-width: 0;
  border-radius: 14px;
  border: 1px solid rgba(28, 24, 20, 0.08);
  background: linear-gradient(180deg, #ffffff, #fbf8f3);
  box-shadow: 0 8px 18px rgba(40, 28, 16, 0.045);
}

.settings-card-toggle {
  min-height: 126px;
  padding: 14px;
  display: grid;
  align-content: space-between;
  gap: 14px;
}

.settings-card-range {
  min-height: 126px;
  padding: 14px;
  display: grid;
  gap: 14px;
}

.settings-row-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.settings-row-copy label {
  color: #211f1c;
  font-size: 0.86rem;
  font-weight: 540;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.settings-row-copy small {
  color: #6f675f;
  font-size: 0.7rem;
  line-height: 1.4;
}

.settings-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f7f1ea;
  border: 1px solid rgba(154, 103, 56, 0.13);
  color: #8c5b2e;
  flex: 0 0 auto;
}

.settings-toggle {
  width: 100%;
  min-height: 40px;
  padding: 7px 14px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 540;
  box-shadow: none;
  border-width: 1px;
}

.settings-range-wrap {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.settings-range {
  min-width: 0;
  width: 100%;
  padding: 0;
  box-shadow: none;
}

.settings-apply-section {
  padding: 12px;
  border-radius: 14px;
  background: #f8f2ea;
  border: 1px solid rgba(154, 103, 56, 0.12);
  display: grid;
  gap: 8px;
}

.settings-apply-primary {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #8d5a2c;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 560;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.settings-apply-primary:hover {
  transform: translateY(-1px);
  background: #7b4b22;
  box-shadow: 0 10px 20px rgba(123, 75, 34, 0.24);
}

.settings-apply-section small {
  color: #6f675f;
  font-size: 0.7rem;
}

.tools-footer.settings-footer {
  background: transparent;
  border-top: none;
  box-shadow: none;
  pointer-events: none;
}

.tools-footer.settings-footer .tools-btn {
  visibility: hidden;
}


.offline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.offline-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}

.offline-item:hover {
  border-color: var(--accent);
  background: var(--surface);
}

.oi-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oi-name {
  font-weight: 600;
  font-size: 1rem;
}

.oi-meta {
  font-size: 0.8rem;
  opacity: 0.7;
}

.oi-date {
  font-size: 0.7rem;
  opacity: 0.5;
}

.oi-actions {
  display: flex;
  gap: 8px;
}

.oi-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.oi-load:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.oi-delete:hover {
  background: #ff4d4d;
  color: white;
  border-color: #ff4d4d;
}

.empty-mini {
  text-align: center;
  padding: 32px 16px;
  background: var(--bg-elevated);
  border-radius: 20px;
  border: 1px dashed var(--border);
}

.offline-note {
  margin-top: 24px;
  padding: 12px;
  background: var(--accent-light);
  border-radius: 12px;
  display: flex;
  gap: 10px;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--accent);
}

/* Floating Player */
.player-bar {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
  left: 50%;
  transform: translateX(-50%);
  width: min(calc(100vw - 24px), 1320px);
  max-width: 1320px;
  background: #fffdf9;
  border: 2px solid rgba(120, 78, 40, 0.44);
  border-radius: 24px;
  box-shadow:
    0 34px 84px rgba(29, 17, 7, 0.34),
    0 0 0 2px rgba(255, 255, 255, 0.95),
    0 0 0 6px rgba(120, 78, 40, 0.16);
  z-index: 1000;
  padding: 14px 22px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Avoid iOS Safari compositing artifacts (black bands) from backdrop-filter on fixed elements. */
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  transition: transform 0.22s ease, opacity 0.22s ease, padding 0.22s ease;
}

.player-bar.collapsed {
  transform: translateX(-50%);
  opacity: 0.98;
}

.player-main {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) auto minmax(460px, 2fr) auto;
  align-items: center;
  gap: clamp(10px, 1.6vw, 20px);
  min-width: 0;
}

.player-info {
  min-width: 0;
}

.player-chapter {
  font-weight: 700;
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-verse {
  font-size: 0.88rem;
  opacity: 0.94;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-eta {
  color: var(--accent);
  font-weight: 500;
  opacity: 1;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.player-loop-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.player-loop-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.player-loop-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  overflow-x: auto;
}

.player-loop-chip {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  min-height: 34px;
  padding: 0 12px;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.player-loop-chip.active {
  background: var(--accent);
  color: #fff;
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}


.player-btn {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: none;
  background: none;
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  flex: 0 0 auto;
}

.player-btn:hover {
  background: rgba(154, 103, 56, 0.08);
}

.player-play {
  background: var(--accent);
  color: white;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(139, 94, 60, 0.3);
}

.player-play:hover {
  background: rgba(255, 255, 255, 0.88);
  color: var(--accent);
  transform: scale(1.05);
}

.player-progress-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.player-time {
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  min-width: 40px;
}

.player-progress-bg {
  flex: 1;
  height: 10px;
  background: rgba(52, 35, 20, 0.26);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  border: 1px solid rgba(120, 78, 40, 0.35);
}

.player-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  background: linear-gradient(90deg, #9a6738, #b9834f);
  transition: width 0.1s linear;
}

/* Animations */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100px);
  opacity: 0;
}

.verse-translation {
  font-size: calc(0.94rem * var(--en-scale, 1));
  color: var(--text);
  line-height: 1.55;
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid var(--border);
  display: block;
  opacity: 0.92;
  font-family: 'Outfit', sans-serif;
}

.verse-aid-block {
  margin-top: 10px;
}

.verse-aid-title {
  display: inline-flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.verse-transliteration {
  font-size: calc(0.98rem * var(--en-scale, 1));
  color: var(--text);
  font-style: italic;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  line-height: 1.5;
  opacity: 0.98;
  font-family: 'Outfit', sans-serif;
}

.verse-words {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  direction: rtl;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  padding-bottom: 8px;
}

.word-item {
  position: relative;
  background: var(--accent-light);
  padding: 6px 12px;
  border-radius: 20px;
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  flex: 0 0 auto;
  scroll-snap-align: center;
  cursor: default;
  min-height: 36px;
}

.wbw-word {
  position: relative;
}

.word-arabic {
  font-family: var(--font-ar);
  font-size: 0.9rem;
}

.word-meaning {
  color: var(--text-muted);
  font-size: calc(0.82rem * var(--en-scale, 1));
  font-family: 'Outfit', sans-serif;
}

.word-audio-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent);
  padding: 0 4px;
}

.field-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reading-aid-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tools,
.tools-body,
.sheet-content {
  overflow-x: hidden;
}

.live-stats-grid {
  display: grid;
  gap: 10px;
}

.live-stat-card {
  min-height: 72px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 252, 247, 0.9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.live-stat-label {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
}

.live-stat-card strong {
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
}

.resume-copy {
  margin-bottom: 8px;
}

.modal-content {
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(251, 245, 238, 0.96));
  border-radius: 18px;
  box-shadow: 0 24px 72px rgba(31, 24, 17, 0.22);
}

.modal-header h2 {
  font-size: 1.05rem;
  font-weight: 600;
}

.resume-modal {
  background: linear-gradient(180deg, rgba(255, 251, 245, 0.99), rgba(248, 241, 233, 0.97));
}

.resume-modal .modal-header,
.resume-modal .modal-body,
.resume-modal .modal-footer {
  padding-top: 18px;
  padding-bottom: 18px;
}

.resume-grid .pill,
.resume-modal .pill {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(184, 130, 78, 0.16);
}

.wbw-word.highlighted,
.verse-arabic word.highlighted {
  background: var(--accent);
  color: white;
  transform: scale(1.03);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.24);
}

.wbw-word.phrase-highlighted {
  box-shadow: 0 0 0 2px rgba(184, 130, 78, 0.18);
}

.word-item.highlighted,
.word-item.phrase-highlighted {
  background: rgba(184, 130, 78, 0.2);
}

/* Quiz overlay */
.quiz-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
}

.quiz-card {
  width: min(680px, 100%);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba, rgba(250, 245, 239, 0.95));
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.quiz-title {
  font-weight: 500;
  font-size: 1.05rem;
}

.quiz-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.quiz-close {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quiz-progress {
  padding: 14px 22px 0;
}

.quiz-progress-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.quiz-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.quiz-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.quiz-body {
  padding: 18px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-question {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--accent);
}

.quiz-arabic {
  font-family: var(--font-ar);
  font-size: 1.4rem;
  line-height: 1.8;
  text-align: right;
  direction: rtl;
  padding: 16px;
  background: var(--accent-light);
  border-radius: 16px;
}

.quiz-reveal-btn {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.quiz-answer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.quiz-translation {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text);
  margin-bottom: 16px;
}

.quiz-grade-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.grade-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.grade-btn.primary {
  background: var(--accent);
  color: white;
  border-color: transparent;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-option {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.quiz-option:hover {
  background: var(--accent-light);
  transform: translateX(4px);
}

.quiz-summary {
  padding: 22px;
  text-align: center;
}

.quiz-summary-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.quiz-summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 20px 0;
}

.quiz-summary-stats .stat {
  padding: 16px;
  background: var(--surface);
  border-radius: 16px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent);
}

.quiz-summary-mistakes {
  margin: 20px 0;
}

.mistake-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  justify-content: center;
}

.mistake-tag {
  padding: 6px 12px;
  background: rgba(190, 73, 73, 0.1);
  border-radius: 20px;
  font-size: 0.8rem;
  color: #c0392b;
}

.quiz-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-outline {
  padding: 10px 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-primary {
  padding: 10px 24px;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
}

/* Fix banner positioning */
.banner {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  min-width: min(560px, calc(100vw - 32px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: var(--shadow-lg);
  font-weight: 450;
  animation: riseSoft 220ms ease-out;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  /* Higher than tools? Lower? Tools should be 60, navbar 100 */
  background: var(--surface-strong);
}

/* Ensure main content doesn't go under navbar */
.main.container {
  padding-top: calc(env(safe-area-inset-top, 0px) + 78px);
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
  min-height: 100dvh;
}

/* Mobile adjustment */
@media (max-width: 768px) {
  .banner {
    top: calc(env(safe-area-inset-top, 0px) + 60px);
    width: calc(100% - 32px);
    min-width: auto;
  }

  .main.container {
    padding-top: calc(env(safe-area-inset-top, 0px) + 66px);
  }
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-action {
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
  padding: 9px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.banner-x {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

/* Main spacing is controlled below in the responsive section. */

/* Animations */
@keyframes appFade {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes railIn {
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes riseSoft {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}


/* Responsive */
@media (max-width: 768px) {
  .main {
    padding: 16px 16px calc(env(safe-area-inset-bottom, 0px) + 116px);
  }

  .main.player-visible {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 164px);
  }

  .main.tools-open {
    padding-right: 16px;
  }

  .tools {
    /* Mobile: bottom-sheet offcanvas for thumb reach + stability */
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    width: 100%;
    height: min(92dvh, 720px);
    border-left: none;
    border-top: 1px solid var(--border);
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
    transform: translateY(105%);
    transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.4, 1.1);
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.18);
  }

  .tools.open {
    transform: translateY(0);
  }

  .tools-top {
    padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
  }

  .tools-footer {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  }

  .session-rail-stats {
    grid-template-columns: 1fr 1fr;
  }

  .hero-flow {
    grid-template-columns: 1fr 1fr;
  }

  .reading-toolbar-group {
    width: 100%;
  }

  .toolbar-chip {
    flex: 1 1 calc(50% - 8px);
    justify-content: center;
  }

  .verse-font-controls {
    gap: 2px;
    padding: 2px 4px;
  }

  .verse-font-btn {
    width: 20px;
    height: 20px;
  }

  .verse-font-size-indicator {
    min-width: 30px;
    font-size: 9px;
  }
}

@media (max-width: 640px) {
  .quiz-grade-buttons {
    flex-direction: column;
  }

  .quiz-actions {
    flex-direction: column;
  }

  .hero-actions,
  .empty-actions {
    flex-direction: column;
  }

  .cta {
    width: 100%;
  }
}

/* Dark theme overrides */
[data-theme="dark"] .tools {
  color: var(--text);
  background: linear-gradient(180deg, rgba(18, 15, 13, 0.98), rgba(12, 11, 10, 0.96));
  border-left-color: var(--border);
}

[data-theme="dark"] .sheet-section {
  border-color: var(--border);
  background: var(--surface);
}

[data-theme="dark"] .tools-top,
[data-theme="dark"] .tools-footer {
  border-color: var(--border);
  background: linear-gradient(180deg, rgba(18, 15, 13, 0.98), rgba(18, 15, 13, 0.92));
}

[data-theme="dark"] .tools-footer {
  background: linear-gradient(to top, rgba(18, 15, 13, 0.98), rgba(18, 15, 13, 0.86), rgba(18, 15, 13, 0));
}

[data-theme="dark"] .tools-tabs {
  background: rgba(255, 255, 255, 0.035);
  border-color: var(--border);
}

[data-theme="dark"] .tools-tabs button {
  color: var(--text-muted);
}

[data-theme="dark"] .tools-tabs button.active {
  color: var(--text);
  background: var(--surface-strong);
  box-shadow: none;
}

[data-theme="dark"] .tools-title,
[data-theme="dark"] .st-title,
[data-theme="dark"] .technique-copy label,
[data-theme="dark"] .settings-heading-copy h3,
[data-theme="dark"] .settings-row-copy label {
  color: var(--text);
}

[data-theme="dark"] .tools-context,
[data-theme="dark"] .st-sub,
[data-theme="dark"] .technique-copy small,
[data-theme="dark"] .technique-control span,
[data-theme="dark"] .settings-heading-copy p,
[data-theme="dark"] .settings-row-copy small {
  color: var(--text-muted);
}

[data-theme="dark"] .tools-x,
[data-theme="dark"] .st-chev,
[data-theme="dark"] .sheet-toggle,
[data-theme="dark"] .technique-row,
[data-theme="dark"] .radio,
[data-theme="dark"] .toggle-chip,
[data-theme="dark"] .segmented-control,
[data-theme="dark"] .technique-preview {
  color: var(--text);
  border-color: var(--border);
  background: var(--surface-strong);
  box-shadow: none;
}

[data-theme="dark"] .tools-x {
  color: #f5e8d8;
  border-color: rgba(229, 197, 160, 0.32);
  background: rgba(26, 22, 18, 0.96);
}

[data-theme="dark"] .sheet-toggle {
  background: rgba(255, 255, 255, 0.035);
}

[data-theme="dark"] .st-ico {
  color: var(--accent-strong);
  border-color: rgba(239, 193, 141, 0.22);
  background: rgba(239, 193, 141, 0.10);
}

[data-theme="dark"] .segmented-control button {
  color: var(--text-muted);
}

[data-theme="dark"] .segmented-control button.active,
[data-theme="dark"] .toggle-chip.active {
  color: white;
  border-color: rgba(239, 193, 141, 0.42);
  background: rgba(239, 193, 141, 0.12);
}

[data-theme="dark"] .tools-btn-soft {
  color: var(--text-muted);
  background: var(--surface-strong);
  border-color: var(--border);
}

[data-theme="dark"] .select,
[data-theme="dark"] .input {
  color: var(--text);
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.045);
}

[data-theme="dark"] .switch {
  color: var(--text);
  border-color: var(--border);
  background: var(--surface-strong);
}

[data-theme="dark"] .verse-translation {
  color: var(--text);
}

[data-theme="dark"] .verse-transliteration,
[data-theme="dark"] .workspace-fab-copy,
[data-theme="dark"] .workspace-fab-sub,
[data-theme="dark"] .settings-row-copy small,
[data-theme="dark"] .field-hint {
  color: var(--text-muted);
}

[data-theme="dark"] .workspace-fab,
[data-theme="dark"] .workspace-fab-sub span,
[data-theme="dark"] .workspace-fab-live-pill,
[data-theme="dark"] .settings-card,
[data-theme="dark"] .word-item:hover::after,
[data-theme="dark"] .word-item:focus::after {
  background: var(--surface-strong);
  border-color: var(--border);
}

[data-theme="dark"] .workspace-fab {
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.46), 0 0 0 1px rgba(255, 236, 216, 0.12);
}

[data-theme="dark"] .workspace-fab:hover {
  box-shadow: 0 26px 64px rgba(0, 0, 0, 0.54), 0 0 0 1px rgba(239, 193, 141, 0.20);
}

[data-theme="dark"] .settings-section {
  background: rgba(24, 21, 19, 0.96);
  border-color: var(--border);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

[data-theme="dark"] .settings-status {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 236, 216, 0.12);
  color: var(--accent-strong);
}

[data-theme="dark"] .settings-icon {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 236, 216, 0.12);
  color: var(--accent-strong);
}

[data-theme="dark"] .settings-card {
  background: var(--surface-strong);
  border-color: rgba(255, 236, 216, 0.10);
  box-shadow: none;
}

[data-theme="dark"] .settings-toggle {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text);
}

[data-theme="dark"] .settings-toggle.active {
  background: rgba(239, 193, 141, 0.13);
  border-color: rgba(239, 193, 141, 0.42);
  color: var(--accent-strong);
}

[data-theme="dark"] .quiz-card {
  background: rgba(18, 18, 18, 0.92);
  border-color: rgba(255, 255, 255, 0.10);
}

[data-theme="dark"] .hero-card,
[data-theme="dark"] .empty-card,
[data-theme="dark"] .continue-session-card,
[data-theme="dark"] .offcanvas-launcher-card,
[data-theme="dark"] .setup-start-card,
[data-theme="dark"] .home-dashboard-card,
[data-theme="dark"] .saved-header,
[data-theme="dark"] .save-section,
[data-theme="dark"] .session-item,
[data-theme="dark"] .empty-state,
[data-theme="dark"] .session-quickstart-card {
  background: linear-gradient(180deg, rgba(34, 29, 26, 0.96), rgba(24, 21, 19, 0.94));
  border-color: var(--border);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}

[data-theme="dark"] .workspace-shell,
[data-theme="dark"] .session-feedback-panel,
[data-theme="dark"] .workspace-fab,
[data-theme="dark"] .verse-card,
[data-theme="dark"] .verse-arabic,
[data-theme="dark"] .player-bar,
[data-theme="dark"] .modal-content,
[data-theme="dark"] .shortcuts-modal,
[data-theme="dark"] .setting-section,
[data-theme="dark"] .settings-group {
  background: linear-gradient(180deg, rgba(34, 29, 26, 0.96), rgba(22, 19, 17, 0.94));
  border-color: var(--border);
  color: var(--text);
}

[data-theme="dark"] .workspace-shell {
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.34);
}

[data-theme="dark"] .workspace-shell-meta span,
[data-theme="dark"] .workspace-shell-chain-pill,
[data-theme="dark"] .workspace-shell-phase,
[data-theme="dark"] .toolbar-chip,
[data-theme="dark"] .action-icon-btn,
[data-theme="dark"] .main-nav-btn,
[data-theme="dark"] .player-loop-chip,
[data-theme="dark"] .word-item,
[data-theme="dark"] .saved-sessions-container .delete-btn,
[data-theme="dark"] .session-export-btn,
[data-theme="dark"] .font-dropdown-trigger,
[data-theme="dark"] .font-option,
[data-theme="dark"] .mode-radio,
[data-theme="dark"] .active-technique-card,
[data-theme="dark"] .active-techniques-count {
  background: rgba(255, 247, 236, 0.12);
  border-color: rgba(255, 236, 216, 0.18);
  color: #f4e5d2;
  box-shadow: none;
}

[data-theme="dark"] .toolbar-chip.active,
[data-theme="dark"] .workspace-shell-active-pill,
[data-theme="dark"] .player-loop-chip.active {
  background: rgba(208, 160, 107, 0.18);
  border-color: rgba(208, 160, 107, 0.32);
  color: var(--accent-strong);
}

[data-theme="dark"] .action-btn.action-btn-secondary,
[data-theme="dark"] .action-btn.action-btn-secondary span,
[data-theme="dark"] .action-btn.action-btn-secondary i {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 236, 216, 0.16);
  color: #f3dfc8;
}

[data-theme="dark"] .continue-session-btn {
  color: #f8ead8;
  border-color: rgba(255, 236, 216, 0.18);
}

[data-theme="dark"] .verse-font-inline-controls {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 236, 216, 0.16);
  box-shadow: none;
}

[data-theme="dark"] .verse-font-inline-btn {
  background: rgba(208, 160, 107, 0.12);
  color: #f1c792;
}

[data-theme="dark"] .verse-font-inline-btn:hover {
  background: rgba(208, 160, 107, 0.2);
}

[data-theme="dark"] .verse-font-inline-value {
  color: #f6e6d2;
}

[data-theme="dark"] .workspace-shell-active-pill {
  color: #f3dfc8;
}

[data-theme="dark"] .workspace-shell-copy h1,
[data-theme="dark"] .workspace-shell-copy h2,
[data-theme="dark"] .hero-title,
[data-theme="dark"] .saved-header h3,
[data-theme="dark"] .session-name,
[data-theme="dark"] .active-technique-copy strong,
[data-theme="dark"] .modal-header h2,
[data-theme="dark"] .shortcut-card-title {
  color: var(--text);
}

[data-theme="dark"] .workspace-shell-copy p,
[data-theme="dark"] .workspace-shell-meta span,
[data-theme="dark"] .workspace-shell-chain-pill,
[data-theme="dark"] .hero-sub,
[data-theme="dark"] .hero-point,
[data-theme="dark"] .session-details span,
[data-theme="dark"] .empty-state span,
[data-theme="dark"] .active-technique-copy span,
[data-theme="dark"] .confirm-copy,
[data-theme="dark"] .shortcut-row span,
[data-theme="dark"] .player-time,
[data-theme="dark"] .player-loop-label,
[data-theme="dark"] .offcanvas-launcher-copy {
  color: var(--text-muted);
}

[data-theme="dark"] .saved-sessions-container {
  background: linear-gradient(180deg, rgba(28, 24, 22, 0.98), rgba(20, 18, 17, 0.96));
  border-color: rgba(255, 236, 216, 0.12);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
}

[data-theme="dark"] .saved-header,
[data-theme="dark"] .empty-state,
[data-theme="dark"] .save-section {
  background: transparent;
  border-color: rgba(255, 236, 216, 0.1);
}

[data-theme="dark"] .stats-detail,
[data-theme="dark"] .stats-card {
  background: rgba(255, 247, 236, 0.06);
  border-color: rgba(255, 236, 216, 0.1);
  box-shadow: none;
}

[data-theme="dark"] .stats-sessions-container {
  background: linear-gradient(180deg, rgba(255, 247, 236, 0.05), rgba(255, 247, 236, 0.02));
  border-color: rgba(255, 236, 216, 0.1);
  box-shadow: none;
}

[data-theme="dark"] .stats-summary {
  background: rgba(255, 247, 236, 0.06);
  border-color: rgba(255, 236, 216, 0.12);
}

[data-theme="dark"] .stats-session-pill {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.12);
}

[data-theme="dark"] .stats-session-pill:hover,
[data-theme="dark"] .stats-session-pill.active {
  background: rgba(208, 160, 107, 0.14);
  border-color: rgba(208, 160, 107, 0.24);
}

[data-theme="dark"] .export-error-card {
  background: rgba(220, 53, 69, 0.12);
  border-color: rgba(220, 53, 69, 0.24);
}

[data-theme="dark"] .current-info {
  background: rgba(208, 160, 107, 0.12);
  border: 1px solid rgba(208, 160, 107, 0.16);
}

[data-theme="dark"] .save-btn {
  background: linear-gradient(135deg, #d0a06b, #b98654);
  color: #1a140f;
}

[data-theme="dark"] .session-exit-recap span {
  background: rgba(255, 247, 236, 0.06);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text);
}

[data-theme="dark"] .verse-card::before {
  background:
    linear-gradient(180deg, rgba(208, 160, 107, 0.04), transparent 22%),
    radial-gradient(circle at top right, rgba(208, 160, 107, 0.06), transparent 28%);
}

[data-theme="dark"] .verse-card.active {
  background: linear-gradient(145deg, rgba(208, 160, 107, 0.12), rgba(255, 255, 255, 0.02));
  box-shadow: 0 0 0 1px rgba(208, 160, 107, 0.42), 0 16px 34px rgba(0, 0, 0, 0.34);
}

[data-theme="dark"] .verse-number,
[data-theme="dark"] .verse-status-badge,
[data-theme="dark"] .player-chapter,
[data-theme="dark"] .player-verse,
[data-theme="dark"] .preview-stat,
[data-theme="dark"] .preview-surah,
[data-theme="dark"] .preview-range {
  color: var(--text);
}

[data-theme="dark"] .player-progress-bg,
[data-theme="dark"] .progress-bar-track,
[data-theme="dark"] .form-range {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(208, 160, 107, 0.3);
}

[data-theme="dark"] .banner {
  background: linear-gradient(180deg, rgba(34, 29, 26, 0.98), rgba(22, 19, 17, 0.96));
  border-color: var(--border);
  color: var(--text);
}

[data-theme="dark"] .countdown-modal {
  background: transparent;
  border-color: transparent;
  color: #fff;
}

[data-theme="dark"] .player-bar {
  background: #18120f;
  border-color: rgba(224, 180, 126, 0.62);
  box-shadow:
    0 34px 86px rgba(0, 0, 0, 0.62),
    0 0 0 1px rgba(255, 235, 208, 0.22),
    0 0 0 6px rgba(224, 180, 126, 0.12);
}

[data-theme="dark"] .banner-x,
[data-theme="dark"] .shortcuts-modal-close,
[data-theme="dark"] .modal-close-btn,
[data-theme="dark"] .btn-icon,
[data-theme="dark"] .verse-small-play-btn,
[data-theme="dark"] .verse-self-check-btn,
[data-theme="dark"] .verse-download-btn,
[data-theme="dark"] .player-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text);
}

[data-theme="dark"] .player-progress-fill {
  background: linear-gradient(90deg, #e2b171, #c98a47);
}

[data-theme="dark"] .modal-footer,
[data-theme="dark"] .shortcuts-header,
[data-theme="dark"] .section-header {
  background: rgba(255, 255, 255, 0.03);
  border-color: var(--border);
}

[data-theme="dark"] .mode-radio {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(208, 160, 107, 0.24);
}

[data-theme="dark"] .mode-radio.active {
  background: rgba(208, 160, 107, 0.14);
  border-color: rgba(208, 160, 107, 0.4);
}

[data-theme="dark"] .mode-radio-icon {
  color: rgba(229, 197, 160, 0.82);
}

[data-theme="dark"] .mode-radio.active .mode-radio-icon {
  color: #7fe09f;
}

[data-theme="dark"] .active-techniques-section {
  background: linear-gradient(180deg, rgba(29, 35, 30, 0.92), rgba(20, 25, 22, 0.9));
  border-color: rgba(108, 167, 126, 0.18);
}

/* Sepia theme overrides */
[data-theme="sepia"] .verse-translation {
  color: #7a684a;
}

/* Planner & Analytics UI */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(12, 10, 8, 0.62);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.session-analytics-overlay {
  z-index: 12000;
}

.post-onboarding-overlay {
  z-index: 12500;
}

.post-onboarding-modal {
  width: min(640px, 94vw);
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(32, 38, 35, 0.98), rgba(24, 30, 27, 0.96));
  border: 1px solid rgba(104, 160, 143, 0.2);
  color: #e7efeb;
  animation: onboardingScaleIn 220ms ease;
}

.post-onboarding-header {
  background: transparent;
  border-bottom: 1px solid rgba(104, 160, 143, 0.16);
}

.post-onboarding-header h2 {
  margin: 0;
  font-size: 1.28rem;
  font-weight: 500;
  color: #f1f7f4;
}

.post-onboarding-body p {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.62;
  color: #c2d0cb;
}

.post-onboarding-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(79, 157, 138, 0.16);
  color: #97c9ba;
  font-size: 0.7rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.post-onboarding-points {
  margin: 12px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: #d7e3de;
  font-size: 1rem;
  line-height: 1.45;
}

.post-onboarding-progress {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}

.post-onboarding-progress span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(104, 160, 143, 0.28);
}

.post-onboarding-progress span.active {
  background: #5aa58f;
}

.post-onboarding-footer {
  border-top: 1px solid rgba(104, 160, 143, 0.14);
}

@keyframes onboardingScaleIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.session-analytics-modal {
  width: min(1080px, 96vw);
  max-height: 88vh;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(249, 245, 239, 0.98), rgba(241, 235, 226, 0.96));
}

.session-analytics-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 2;
  background: inherit;
}

.session-analytics-head-copy h2 {
  margin: 0;
  font-size: 1.15rem;
}

.session-analytics-head-copy p {
  margin: 6px 0 0;
  font-size: 0.9rem;
  color: var(--text);
}

.session-analytics-head-copy small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 0.76rem;
}

.session-analytics-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.session-analytics-download {
  min-height: 38px;
}

.session-analytics-body {
  max-height: calc(88vh - 92px);
  overflow-y: auto;
  display: grid;
  gap: 16px;
  padding: 4px 2px 6px;
}

.session-analytics-section {
  display: grid;
  gap: 12px;
}

.session-analytics-section h3 {
  margin: 0;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}

.session-analytics-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.session-analytics-summary-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.64);
  display: grid;
  gap: 5px;
}

.session-analytics-summary-card span {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.session-analytics-summary-card strong {
  font-size: 1.18rem;
  color: var(--text);
}

.session-analytics-summary-card small {
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.4;
}

.session-analytics-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.session-analytics-panel {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.62);
  display: grid;
  gap: 12px;
}

.session-analytics-panel header {
  display: grid;
  gap: 4px;
}

.session-analytics-panel header h3 {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 650;
  color: var(--text);
}

.session-analytics-panel header p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.analytics-progress-split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.analytics-progress-stat {
  border-radius: 14px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.48);
  padding: 12px;
  display: grid;
  gap: 4px;
}

.analytics-progress-stat strong {
  font-size: 1.34rem;
  color: var(--text);
}

.analytics-progress-stat span {
  font-size: 0.78rem;
  font-weight: 650;
  color: var(--text);
}

.analytics-progress-stat small {
  font-size: 0.74rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.analytics-progress-bar {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.12);
  overflow: hidden;
}

.analytics-progress-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), #d3a36f);
}

.analytics-line-chart svg {
  width: 100%;
  height: 160px;
}

.analytics-y-axis line {
  stroke: rgba(154, 103, 56, 0.14);
  stroke-width: 1;
}

.analytics-y-axis text {
  fill: var(--text-muted);
  font-size: 10px;
}

.analytics-line-path {
  fill: none;
  stroke: #bd8c58;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.analytics-line-dot {
  fill: #bd8c58;
  stroke: rgba(255, 255, 255, 0.88);
  stroke-width: 1.4;
}

.analytics-line-labels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18px, 1fr));
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.72rem;
  text-align: center;
}

.analytics-heatmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 8px;
}

.analytics-heatmap-cell {
  border-radius: 12px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background:
    linear-gradient(180deg, rgba(250, 241, 223, calc(0.84 - (var(--cell-intensity, 0.06) * 0.18))), rgba(112, 70, 38, calc(0.12 + (var(--cell-intensity, 0.06) * 0.46)))),
    rgba(196, 148, 72, calc(0.12 + (var(--cell-intensity, 0.06) * 0.24)));
  padding: 10px;
  display: grid;
  gap: 3px;
}

.analytics-heatmap-cell span {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.analytics-heatmap-cell strong {
  font-size: 0.95rem;
  color: var(--text);
}

.analytics-empty-panel {
  border-radius: 12px;
  border: 1px dashed rgba(154, 103, 56, 0.18);
  padding: 14px;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.stats-detail-actions-prominent {
  margin-bottom: 14px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(0, 86px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.bar-row span,
.bar-row em {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: normal;
}

.bar-track {
  height: 7px;
  border-radius: 999px;
  background: rgba(79, 157, 138, 0.12);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: #4f9d8a;
}

.comparison-chart-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.comparison-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.58);
  display: grid;
  gap: 4px;
}

.comparison-item span {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.comparison-item strong {
  font-size: 1.2rem;
  color: var(--text);
}

.pie-chart-shell {
  display: grid;
  gap: 10px;
}

.pie-chart-ring {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  margin: 0 auto;
  box-shadow: inset 0 0 0 12px rgba(0, 0, 0, 0.08);
}

.pie-chart-legend {
  display: grid;
  gap: 4px;
}

.pie-chart-legend span {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  gap: 6px;
}

.heatmap-cell {
  border: 1px solid var(--border);
  border-radius: 8px;
  min-height: 32px;
  background: radial-gradient(circle at center, rgba(79, 157, 138, calc(var(--heat-intensity, 0.1) * 0.55)), rgba(79, 157, 138, calc(var(--heat-intensity, 0.1) * 0.12)));
  color: var(--text);
  font-size: 0.66rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.analytics-loading {
  min-height: 180px;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 0.84rem;
}

[data-theme="dark"] .session-analytics-modal {
  background: linear-gradient(180deg, #1f2422, #1a201d);
}

[data-theme="dark"] .session-analytics-summary-card,
[data-theme="dark"] .session-analytics-chart-card,
[data-theme="dark"] .comparison-item {
  background: rgba(40, 49, 45, 0.76);
  border-color: rgba(108, 158, 143, 0.22);
}

[data-theme="dark"] .bar-track {
  background: rgba(79, 157, 138, 0.22);
}

[data-theme="dark"] .heatmap-cell {
  border-color: rgba(108, 158, 143, 0.22);
}

@media (max-width: 1024px) {
  .session-analytics-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .session-analytics-chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .post-onboarding-modal {
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }

  .post-onboarding-header {
    position: sticky;
    top: 0;
    z-index: 2;
    background: rgba(24, 30, 27, 0.96);
  }

  .session-analytics-modal {
    width: 100vw;
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
  }

  .session-analytics-body {
    max-height: calc(100dvh - 92px);
  }

  .session-analytics-summary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .heatmap-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}

.modal-content {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 250, 243, 0.92));
  border-radius: 20px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.55);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
  animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.resume-modal {
  width: min(760px, 96vw);
}

.resume-modal .modal-header h2 {
  font-size: clamp(1.25rem, 2.3vw, 1.75rem);
}

.resume-saved-at {
  display: inline-block;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.resume-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.resume-grid .pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}

@keyframes modalIn {
  from {
    transform: translateY(10px);
    opacity: 0.6;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.confirm-modal {
  max-width: 460px;
  width: 100%;
}

.confirm-copy {
  color: var(--text-muted);
  line-height: 1.65;
}

.btn-danger {
  background: #b55041;
}

.tools-btn-danger {
  opacity: 0.82;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-muted);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--border);
  color: var(--text);
}

.planner-modal {
  max-width: 500px;
  width: 100%;
}

.planner-field {
  margin-bottom: 24px;
}

.planner-field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.planner-select,
.planner-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.9rem;
  transition: all 0.2s;
}

.planner-select:focus,
.planner-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-light);
}

.verses-per-day-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quantity-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.quantity-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.quantity-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.planner-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 24px 0;
}

.planner-stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.progress-bar-track {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.btn-secondary {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-primary {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.3);
}

.field-hint {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 6px;
}

.pa-lbl {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}

.analytics-help {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: calc(0.78rem * var(--en-scale, 1));
  line-height: 1.4;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: transform 0.2s;
}

.stat-delta {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.7rem;
  color: var(--accent-strong);
  font-weight: 700;
  vertical-align: middle;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}

.stat-card i {
  font-size: 1.8rem;
  color: var(--accent);
  margin-bottom: 12px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.stat-help {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: calc(0.72rem * var(--en-scale, 1));
  line-height: 1.35;
}

.mini-trend {
  position: relative;
  width: 80px;
  height: 24px;
  margin-top: 10px;
}

.mini-trend span {
  position: absolute;
  width: 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--accent), var(--accent-soft));
  opacity: 0.9;
}

/* Home Dashboard UI */
.home-dashboard {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
  animation: modalFadeIn 0.4s ease-out;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
}

.welcome-text {
  max-width: 500px;
}

.header-stats {
  display: flex;
  gap: 16px;
  background: var(--surface);
  padding: 12px 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.mini-stat strong {
  color: var(--text);
  font-size: 1rem;
}

.dashboard-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.home-dashboard-minimal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 160px;
}

.offcanvas {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100%;
  background: #fff;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.offcanvas-launcher-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  margin-bottom: 18px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.offcanvas-launcher-copy {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
}

.setup-start-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 18px;
  padding: 20px;
  margin-bottom: 18px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.setup-start-copy {
  min-width: 0;
}

.setup-kicker {
  display: inline-flex;
  margin-bottom: 6px;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.setup-start-copy h2 {
  margin: 0 0 6px;
  color: var(--text);
  font-size: clamp(1.2rem, 2vw, 1.65rem);
  line-height: 1.1;
}

.setup-start-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
}

.setup-review-hint {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(184, 130, 78, 0.10);
  border: 1px solid rgba(184, 130, 78, 0.18);
  color: var(--accent);
  font-weight: 700;
}

.setup-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(112px, 1fr));
  gap: 10px;
}

.setup-mode-card {
  min-height: 86px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 4px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.setup-mode-card:hover,
.setup-mode-card.active {
  border-color: var(--accent);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.setup-mode-card i {
  color: var(--accent);
  font-size: 1.2rem;
}

.setup-mode-card span {
  font-weight: 800;
}

.setup-mode-card small {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.setup-primary {
  min-height: 48px;
  white-space: nowrap;
}

.setup-optional-panel,
.session-tools-panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
}

.setup-optional-panel summary,
.session-tools-panel summary {
  cursor: pointer;
  list-style: none;
  padding: 12px 14px;
  font-weight: 700;
  color: var(--text);
}

.setup-optional-panel summary::-webkit-details-marker,
.session-tools-panel summary::-webkit-details-marker {
  display: none;
}

.setup-optional-grid,
.session-tools-grid {
  display: grid;
  gap: 12px;
  padding: 0 14px 14px;
}

.setup-optional-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.session-tools-grid {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.field-inline-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-chip {
  min-height: 42px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  font-weight: 540;
}

.toggle-chip.active {
  border-color: var(--accent);
  color: white;
}

.continue-session-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  margin-bottom: 18px;
  border: 1px solid var(--accent-soft);
  border-radius: 18px;
  background: linear-gradient(135deg, var(--surface), var(--accent-light));
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.continue-session-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
}

.continue-session-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.continue-session-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}

.continue-session-kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.continue-session-copy small {
  color: var(--text-muted);
}

.continue-session-btn {
  min-height: 44px;
  white-space: nowrap;
  flex: 0 0 auto;
  padding-inline: 18px;
}

.continue-session-dismiss {
  min-width: 44px;
  padding-inline: 0;
  justify-content: center;
}

.resume-action {
  background: linear-gradient(145deg, rgba(154, 103, 56, 0.12), rgba(255, 255, 255, 0.94));
  border-color: var(--accent-soft);
}

.resume-action .action-icon {
  background: rgba(154, 103, 56, 0.15);
  color: var(--accent);
}

.resume-action .action-arrow {
  color: var(--accent);
}

.action-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
  border-color: var(--accent);
}

.action-card.primary-action {
  background: linear-gradient(145deg, var(--accent), var(--accent-dark));
  color: white;
  border: none;
}

.action-card.primary-action .action-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-card.primary-action h3,
.action-card.primary-action p,
.action-card.primary-action .action-arrow {
  color: white;
}

.action-icon {
  width: 48px;
  height: 48px;
  background: var(--bg-body);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--accent);
  margin-bottom: 20px;
}

.action-content h3 {
  font-size: 1.15rem;
  margin: 0 0 8px 0;
  color: var(--text);
}

.action-content p {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.action-arrow {
  position: absolute;
  bottom: 24px;
  right: 24px;
  font-size: 1.2rem;
  color: var(--accent);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease;
}

.action-card:hover .action-arrow {
  opacity: 1;
  transform: translateX(0);
}

.dashboard-recent {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.recent-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.btn-ghost {
  background: none;
  border: none;
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-ghost:hover {
  background: var(--accent-light);
}

.recent-stats {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.r-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.r-stat span {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.r-stat strong {
  font-size: 1.4rem;
  color: var(--text);
}

@media (max-width: 768px) {
  .quick-tools-grid {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px;
  }

  .workspace-shell {
    width: 100%;
    margin-bottom: 14px;
  }

  .workspace-shell {
    padding: 14px;
  }

  .workspace-shell-head {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .workspace-shell-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .workspace-shell-title-row {
    align-items: flex-start;
  }

  .workspace-shell-phase {
    min-height: 26px;
  }

  .workspace-shell-meta {
    gap: 6px;
  }

  .workspace-shell-chaining {
    gap: 6px;
  }

  .resume-feedback-row {
    font-size: 0.74rem;
  }

  .resume-grid {
    grid-template-columns: 1fr;
  }

  .workspace-fab {
    top: 8px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 9px;
    margin: 8px 0 6px;
    border-radius: 14px;
  }

  .workspace-fab-meta {
    min-width: 0;
  }

  .workspace-fab-kicker {
    font-size: 0.64rem;
  }

  .workspace-fab-title {
    font-size: 0.9rem;
  }

  .workspace-fab-sub {
    font-size: 0.72rem;
    gap: 5px;
  }

  .workspace-fab-sub span {
    flex: 1 1 auto;
    justify-content: center;
    min-width: min(128px, 100%);
  }

  .workspace-fab-copy {
    font-size: 0.78rem;
  }

  .workspace-fab-live {
    gap: 6px;
  }

  .workspace-fab-live-pill {
    flex: 1 1 0;
    min-width: 0;
    justify-content: center;
  }

  .workspace-fab-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
  }

  .fab-btn {
    width: 100%;
    min-width: 0;
    justify-content: center;
    padding: 8px 10px;
    font-size: 0.82rem;
    min-height: 44px;
  }

  .main-nav-btn,
  .main-card-primary {
    width: 100%;
    min-height: 44px;
  }

  .settings-heading {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }

  .settings-status {
    justify-self: start;
  }

  .settings-card-grid,
  .settings-display-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-card-toggle,
  .settings-card-range {
    min-height: 0;
    padding: 13px;
    gap: 12px;
  }

  .settings-toggle {
    min-height: 38px;
  }

  .settings-range-wrap {
    gap: 10px;
  }

  .settings-apply-section {
    padding: 12px;
  }

  .settings-apply-primary {
    min-height: 46px;
    border-radius: 12px;
    font-size: 0.88rem;
  }

  .setup-start-card {
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 16px;
  }

  .setup-mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .setup-primary {
    width: 100%;
    justify-content: center;
  }

  .continue-session-card {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-actions {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }

  .offcanvas-launcher-card {
    flex-direction: column;
    align-items: stretch;
  }

  .action-card {
    padding: 18px;
  }

  .action-icon {
    margin-bottom: 14px;
  }

  .continue-session-btn,
  .btn-primary,
  .btn-secondary,
  .tools-btn,
  .player-btn,
  .toolbar-chip,
  .toggle-chip {
    min-height: 44px;
  }

  .continue-session-actions {
    justify-content: space-between;
  }

  .continue-session-btn {
    width: auto;
  }

  .settings-toggle {
    min-height: 34px;
  }

  .inline-setting-row {
    align-items: stretch;
  }

  .input-compact,
  .inline-setting-pill {
    width: 100%;
    flex: 1 1 100%;
    justify-content: center;
  }

  .technique-row,
  .technique-row-main,
  .technique-control {
    align-items: stretch;
    flex-direction: column;
  }

  .technique-toggle,
  .segmented-control {
    width: 100%;
  }

  .player-bar {
    /* Mobile: sticky bottom controls (thumb-friendly, no overlap) */
    left: 0;
    right: 0;
    bottom: 0;
    transform: none;
    width: 100%;
    max-width: 100%;
    border-radius: 18px 18px 0 0;
    padding: 12px 14px calc(env(safe-area-inset-bottom, 0px) + 12px);
  }

  .player-bar.collapsed {
    transform: none;
  }

  .player-main {
    grid-template-columns: minmax(88px, 0.75fr) auto minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .player-info {
    flex: 0 1 120px;
    min-width: 0;
  }

  .player-chapter {
    font-size: 0.78rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .player-verse {
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .player-controls {
    justify-content: center;
    gap: 4px;
  }

  .player-progress-wrap {
    order: 0;
    min-width: 0;
    gap: 6px;
  }

  .player-loop-controls {
    order: 3;
    width: 100%;
    grid-column: 1 / -2;
    justify-content: space-between;
  }

  .player-loop-group {
    width: 100%;
    justify-content: space-between;
  }

  .player-speed-controls {
    display: none;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
  }

  .session-rail-top {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .session-rail-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .rail-btn {
    flex: initial;
    width: 100%;
    justify-content: center;
  }

  .rail-btn-primary {
    grid-column: 1 / -1;
  }

  .reading-toolbar {
    padding: 12px;
    gap: 10px;
  }

  .reading-toolbar-group {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .toolbar-chip {
    flex: initial;
    width: 100%;
  }

  .font-dropdown {
    grid-column: 1 / -1;
  }

  .reading-toolbar {
    padding: 12px;
    gap: 10px;
  }

  .reading-toolbar-group {
    width: 100%;
  }

  .toolbar-chip {
    flex: 1 1 calc(50% - 4px);
    justify-content: center;
    min-width: 0;
  }

  .font-dropdown {
    width: 100%;
  }

  .font-dropdown-trigger {
    width: 100%;
    justify-content: space-between;
  }

  .verse-card {
    padding: 16px;
    border-radius: 18px;
  }

  .verse-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .verse-badges,
  .verse-actions {
    flex-wrap: wrap;
  }

  .verse-actions {
    justify-content: space-between;
  }

  .verse-font-controls {
    margin-right: 0;
    flex: 1 1 100%;
    justify-content: center;
  }

  .modal-content,
  .confirm-modal,
  .planner-modal {
    width: 100%;
    max-width: 100%;
    border-radius: 18px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .planner-stats-grid {
    grid-template-columns: 1fr;
  }

  .tools {
    width: 100vw;
    max-width: 100vw;
  }

  .tools-top,
  .tools-body,
  .tools-footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .tools-tabs {
    overflow-x: hidden;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .tools-tabs button {
    width: 100%;
    min-width: 0;
  }

  .reading-aid-grid,
  .session-tools-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-detail-head,
  .export-error-card,
  .save-section {
    flex-direction: column;
    align-items: stretch;
  }

  .verse-card,
  .tools,
  .sheet,
  .sheet-content {
    overflow-x: hidden;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard-actions {
    grid-template-columns: 1fr;
  }

  .session-rail-top {
    grid-template-columns: 1fr;
  }

  .session-rail-actions {
    flex-wrap: wrap;
  }

  .reading-toolbar {
    align-items: flex-start;
  }

  .reading-toolbar-group:first-child {
    flex: 1 1 100%;
  }

  .toolbar-chip {
    flex: 0 1 auto;
  }

  .player-bar {
    width: calc(100vw - 40px);
  }

  .player-main {
    grid-template-columns: minmax(132px, 0.9fr) auto minmax(160px, 0.9fr) minmax(150px, 1fr) auto;
    gap: 12px;
  }

  .player-progress-wrap {
    min-width: 0;
  }
}

@media (max-width: 480px) {
  .verse-header {
    flex-wrap: wrap;
  }

  .verse-badges {
    flex-wrap: wrap;
  }

  .verse-actions {
    margin-top: 8px;
    width: 100%;
    justify-content: flex-start;
  }

  .session-pill {
    white-space: normal;
    text-align: center;
    justify-content: center;
  }

  .rail-btn,
  .toolbar-chip {
    flex: 1 1 100%;
  }

  .player-time {
    min-width: auto;
    font-size: 0.7rem;
  }

  .player-progress-wrap {
    gap: 8px;
  }

  .verse-number,
  .verse-status-badge,
  .verse-status-subtle {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
}

.verse-status-badge-review {
  border-color: rgba(183, 28, 28, 0.24);
  color: #9f1f1f;
  background: rgba(183, 28, 28, 0.08);
}

.verse-card.feedback-mastered {
  border-left: 4px solid #43a047;
}

.verse-card.feedback-weak {
  border-left: 4px solid #e3a008;
}

.verse-card.feedback-repeat {
  border-left: 4px solid #c62828;
}

.main.flow-recall .verse-card.active .verse-arabic {
  color: transparent;
  text-shadow: 0 0 22px rgba(232, 237, 247, 0.55);
}



.main.flow-practice .verse-card.active .verse-arabic {
  opacity: 0.45;
}

.main.flow-recall .verse-card.active .verse-arabic .tajweed-mark,
.main.flow-recall .verse-card.active .verse-arabic word,
.main.flow-recall .verse-card.active .verse-arabic .wbw-word {
  color: transparent !important;
  background: transparent !important;
  box-shadow: none !important;
}

.workspace-quick-controls {
  width: 100%;
  padding: 0 10px 10px;
}

.quick-pill-group-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.quick-pill-group-list .view-mode-toggle {
  margin-left: auto;
  order: 20;
}

.toolbar-chip-sm {
  min-height: 28px;
  padding: 3px 9px;
  font-size: 0.72rem;
  border-radius: 999px;
}

.view-mode-toggle {
  --view-toggle-bg: #fffaf2;
  --view-toggle-border: #b58a62;
  --view-toggle-text: #5d4d40;
  --view-toggle-hover-bg: #f4e5d4;
  --view-toggle-active-bg: #5f3b20;
  --view-toggle-active-text: #fff7e8;
  --view-toggle-active-shadow: rgba(95, 59, 32, 0.24);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--view-toggle-border);
  border-radius: 999px;
  background: var(--view-toggle-bg) !important;
  box-shadow: 0 10px 22px rgba(95, 59, 32, 0.12), inset 0 1px 0 rgba(255,255,255,0.58);
}

.view-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 30px;
  padding: 0.3rem 0.68rem;
  border: 0;
  border-radius: 999px;
  background: transparent !important;
  color: var(--view-toggle-text) !important;
  font-size: 0.74rem;
  font-weight: 800;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.view-mode-btn:hover {
  transform: translateY(-1px);
  color: #2d1b10 !important;
  background: var(--view-toggle-hover-bg) !important;
}

.view-mode-btn.active {
  background: var(--view-toggle-active-bg) !important;
  color: var(--view-toggle-active-text) !important;
  box-shadow: 0 9px 18px var(--view-toggle-active-shadow) !important;
}

.view-mode-btn.active i,
.view-mode-btn.active span {
  color: inherit !important;
}

.mushaf-workspace {
  width: 100%;
  display: grid;
  gap: 0.65rem;
}

.mushaf-frame {
  position: relative;
  margin-inline: auto;
  transition: width 220ms ease, max-width 220ms ease;
}

.main.tools-open .mushaf-frame {
  width: min(100%, 920px);
}

.mushaf-viewport {
  overflow: hidden;
  border-radius: 12px;
}

.mushaf-track {
  display: flex;
}

.mushaf-empty-page {
  min-height: min(58vh, 560px);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.5rem;
  padding: 2rem;
  border: 1px dashed rgba(99, 102, 241, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--muted);
  text-align: center;
}

.mushaf-empty-page i {
  color: var(--accent);
  font-size: 1.6rem;
}

.mushaf-empty-page strong {
  color: var(--text);
  font-size: 0.95rem;
}

.mushaf-empty-page span {
  max-width: 32rem;
  font-size: 0.82rem;
  font-weight: 700;
}

.mushaf-page {
  position: relative;
  flex: 0 0 100%;
  min-height: min(74vh, 820px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(0.8rem, 1.7vh, 1.35rem);
  padding: clamp(2.7rem, 4vw, 4.5rem) clamp(1rem, 6vw, 5.25rem) clamp(1.5rem, 3vw, 3rem);
  border: 1px solid color-mix(in srgb, var(--mushaf-text) 10%, transparent);
  border-radius: 12px;
  background: var(--mushaf-bg, #f1ede8);
  color: var(--mushaf-text, #050505);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
}

.mushaf-bg-warm {
  --mushaf-bg: #f1ede8;
  --mushaf-text: #050505;
  --mushaf-muted: #6f6258;
  --mushaf-hover: rgba(150, 99, 52, 0.09);
}

.mushaf-bg-paper {
  --mushaf-bg: #fffaf0;
  --mushaf-text: #111827;
  --mushaf-muted: #6b5f4b;
  --mushaf-hover: rgba(180, 126, 42, 0.12);
}

.mushaf-bg-contrast {
  --mushaf-bg: #ffffff;
  --mushaf-text: #000000;
  --mushaf-muted: #111827;
  --mushaf-hover: rgba(0, 0, 0, 0.07);
}

.mushaf-bg-night {
  --mushaf-bg: #101317;
  --mushaf-text: #f8fafc;
  --mushaf-muted: #cbd5e1;
  --mushaf-hover: rgba(148, 163, 184, 0.16);
}

.mushaf-sheet-tools {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--mushaf-text) 14%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--mushaf-bg) 88%, transparent);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
}

.mushaf-sheet-tools button,
.mushaf-font-controls {
  color: var(--mushaf-text);
}

.mushaf-sheet-tools > button,
.mushaf-font-controls button {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid color-mix(in srgb, var(--mushaf-text) 14%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--mushaf-bg) 72%, #ffffff 18%);
}

.mushaf-font-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding-inline: 0.2rem;
  font-size: 0.74rem;
  font-weight: 900;
}

.mushaf-bg-picker {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  padding-inline: 0.1rem;
}

.mushaf-bg-swatch {
  width: 1.25rem !important;
  height: 1.25rem !important;
  border-radius: 999px !important;
  padding: 0 !important;
}

.mushaf-bg-swatch.active {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.mushaf-bg-swatch-warm { background: #f1ede8 !important; }
.mushaf-bg-swatch-paper { background: #fffaf0 !important; }
.mushaf-bg-swatch-contrast { background: #fff !important; }
.mushaf-bg-swatch-night { background: #101317 !important; }

.mushaf-page-header {
  display: grid;
  justify-items: center;
  gap: clamp(0.65rem, 1.6vh, 1.2rem);
  color: var(--mushaf-text);
  text-align: center;
}

.mushaf-page-header h2 {
  margin: 0;
  color: var(--mushaf-text);
  font-family: "Amiri Quran", "Amiri", "Scheherazade New", serif;
  font-size: clamp(1.8rem, 3.8vw, 3.35rem);
  font-weight: 700;
  line-height: 1.2;
}

.mushaf-bismillah {
  color: var(--mushaf-text);
  font-family: "Amiri Quran", "Amiri", "Scheherazade New", serif;
  font-size: clamp(1.45rem, 3vw, 2.55rem);
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: 0;
  text-align: center;
}

.mushaf-page-footer {
  min-height: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.mushaf-page-body {
  display: block;
  direction: rtl;
  text-align: justify;
  text-align-last: center;
  line-height: 2.45;
  overflow: visible;
  padding: clamp(0.8rem, 2vh, 1.7rem) 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  font-variant-ligatures: contextual;
}

.mushaf-ayah {
  position: relative;
  display: inline;
  appearance: none;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--mushaf-text);
  padding: 0;
  margin: 0 0.04em;
  text-align: right;
  white-space: normal;
  line-height: inherit;
  vertical-align: baseline;
  cursor: pointer;
  transition: background 180ms ease, box-shadow 180ms ease, filter 180ms ease, opacity 180ms ease;
}

.mushaf-ayah:hover,
.mushaf-ayah.active {
  background: transparent;
  box-shadow: none;
}

.mushaf-ayah:hover .mushaf-ayah-text,
.mushaf-ayah.active .mushaf-ayah-text {
  background: var(--mushaf-hover);
  box-shadow: 0 0 0 0.08em color-mix(in srgb, var(--mushaf-text) 10%, transparent);
  border-radius: 0.16em;
}

.mushaf-ayah.review-priority {
  box-shadow: inset 0 -2px 0 rgba(245, 158, 11, 0.48);
}

.mushaf-ayah-text {
  display: inline;
  color: var(--mushaf-text);
  font-size: calc((var(--verse-font-percent, 120) / 100) * clamp(1.45rem, 2.8vw, 2.85rem));
  font-weight: 500;
  letter-spacing: 0;
  line-height: inherit;
  white-space: normal;
  unicode-bidi: isolate;
}

.mushaf-ayah-text .wbw-word,
.mushaf-ayah-text word {
  display: inline !important;
  margin: 0;
  padding: 0;
  border-radius: 0.18em;
  color: inherit;
  font: inherit !important;
  font-size: 1em !important;
  font-weight: inherit !important;
  line-height: inherit;
  letter-spacing: inherit;
  white-space: normal;
  transform: none !important;
  vertical-align: baseline;
}

.mushaf-ayah-text .tajweed-mark,
.mushaf-ayah-text .wbw-word *,
.mushaf-ayah-text word * {
  font-size: 1em !important;
  line-height: inherit !important;
}

.mushaf-ayah-text .wbw-word.highlighted,
.mushaf-ayah-text word.highlighted {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: inherit !important;
  box-shadow: inset 0 -0.08em 0 var(--accent);
  transform: none !important;
}

.mushaf-ayah-text .word-audio-btn {
  display: none !important;
}

.mushaf-ayah-number {
  display: inline-grid;
  place-items: center;
  width: 1.55em;
  height: 1.55em;
  margin-inline: 0.1em 0.18em;
  border: 0.5px solid rgba(150, 99, 52, 0.58);
  padding: 5px;
  border-radius: 50%;
  background:
    radial-gradient(circle, #eef0e6 47%, transparent 49%),
    conic-gradient(from 20deg, #b0175a, #6f8d61, #b0175a, #6f8d61, #b0175a);
  color: #111;
  font-family: system-ui, sans-serif;
  font-size: clamp(0.74rem, 1.45vw, 1.1rem);
  font-weight: 900;
  line-height: 1;
  vertical-align: middle;
  transform: translateY(-0.08em);
}

.mushaf-active-tools {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  pointer-events: auto;
}

.mushaf-ayah-hover-tools {
  position: absolute;
  top: -2.25rem;
  left: 50%;
  z-index: 8;
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid color-mix(in srgb, var(--mushaf-text) 14%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--mushaf-bg) 90%, transparent);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.16);
  transform: translateX(-50%);
}

.mushaf-ayah-hover-tools button {
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
}

.mushaf-active-tools button,
.mushaf-nav-btn {
  display: inline-grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text);
}

.mushaf-nav-btn:disabled {
  cursor: not-allowed;
  opacity: 0.36;
}

.mushaf-hint {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
}

.main.focus-mode-active .mushaf-ayah:not(.active) {
  opacity: var(--focus-dim-opacity, 0.54);
}

.main.blur-mode-active .mushaf-ayah.blur-upcoming .mushaf-ayah-text {
  filter: blur(var(--recall-blur, 10px));
  user-select: none;
}

.main.blur-mode-active .mushaf-ayah.blur-upcoming.peek-revealed .mushaf-ayah-text,
.main.blur-mode-active .mushaf-ayah.active .mushaf-ayah-text {
  filter: none;
  user-select: auto;
}

[data-theme="dark"] .view-mode-toggle,
[data-theme="dark"] .mushaf-empty-page,
[data-theme="dark"] .mushaf-active-tools button,
[data-theme="dark"] .mushaf-nav-btn {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.88);
}

[data-theme="dark"] .view-mode-toggle {
  --view-toggle-bg: #17120d;
  --view-toggle-border: #8d6a45;
  --view-toggle-text: #e9d7bd;
  --view-toggle-hover-bg: #2a2118;
  --view-toggle-active-bg: #f0c47b;
  --view-toggle-active-text: #1d1309;
  --view-toggle-active-shadow: rgba(240, 196, 123, 0.2);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.06);
}

[data-theme="dark"] .view-mode-btn {
  color: var(--view-toggle-text);
}

[data-theme="dark"] .view-mode-btn:hover {
  color: #fff4df !important;
  background: var(--view-toggle-hover-bg) !important;
}

[data-theme="dark"] .mushaf-page {
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
}

[data-theme="dark"] .mushaf-ayah-number {
  color: #0f172a;
  border-color: rgba(248, 250, 252, 0.32);
}

[data-theme="dark"] .mushaf-ayah:hover,
[data-theme="dark"] .mushaf-ayah.active {
  background: transparent;
  box-shadow: none;
}

[data-theme="dark"] .mushaf-ayah:hover .mushaf-ayah-text,
[data-theme="dark"] .mushaf-ayah.active .mushaf-ayah-text {
  background: rgba(240, 196, 123, 0.12);
  box-shadow: 0 0 0 0.08em rgba(240, 196, 123, 0.18);
}

@media (max-width: 720px) {
  .mushaf-frame {
    grid-template-columns: minmax(0, 1fr);
  }

  .mushaf-nav-btn {
    display: none;
  }

  .mushaf-page {
    min-height: 70vh;
    padding: 4.6rem 0.85rem 1.4rem;
  }

  .mushaf-sheet-tools {
    top: 0.75rem;
    right: 0.75rem;
    left: 0.75rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    border-radius: 12px;
  }

  .mushaf-page-body {
    line-height: 2.35;
  }

  .mushaf-page-header h2 {
    font-size: clamp(1.65rem, 9vw, 2.55rem);
  }

  .mushaf-bismillah {
    font-size: clamp(1.25rem, 6.5vw, 1.95rem);
  }

  .mushaf-ayah-text {
    font-size: calc((var(--verse-font-percent, 120) / 100) * clamp(1.32rem, 7vw, 2.05rem));
  }

  .view-mode-toggle {
    width: 100%;
  }

  .view-mode-btn {
    flex: 1 1 0;
    justify-content: center;
  }
}

.workspace-control-live {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(154, 103, 56, 0.08);
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.workspace-control-live-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.workspace-control-live strong {
  font-size: 0.78rem;
  color: var(--text);
}

.workspace-applied-pills {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.workspace-applied-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(160, 120, 76, 0.22);
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.quick-font-dropdown,
.quick-font-dropdown .font-dropdown-trigger {
  width: auto;
  min-width: 0;
}

.quick-font-dropdown .font-dropdown-trigger {
  justify-content: space-between;
}

.setup-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.setup-metric-card {
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.42);
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.setup-metric-card span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.setup-metric-card strong {
  font-size: 1.08rem;
  color: var(--text);
}

.setup-metric-card small {
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.setup-metric-list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.setup-metric-list-row,
.setup-metric-list-empty {
  border-radius: 10px;
  background: rgba(154, 103, 56, 0.06);
  padding: 8px 10px;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.setup-metric-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.setup-metric-list-row strong {
  color: var(--text);
  font-size: 0.78rem;
}

.session-quickstart-card {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 18px;
  background: rgba(17, 24, 39, 0.04);
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.session-quickstart-copy {
  margin: 6px 0 0;
  color: #5f6b7a;
}

.session-quickstart-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.preset-btn-primary {
  background: #0f766e;
  color: #fff;
}

.presets-grid-wide {
  width: 100%;
}

@media (max-width: 768px) {
  .tools-top {
    position: sticky;
    top: 0;
    z-index: 3;
    backdrop-filter: blur(16px);
    background: rgba(250, 245, 238, 0.94);
  }

  [data-theme="dark"] .tools-top {
    background: rgba(18, 16, 13, 0.94);
  }

  .tools-topbar {
    align-items: flex-start;
  }

  .action-buttons-group {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .action-btn,
  .action-icon-btn {
    width: 100%;
    min-width: 0;
  }

  .action-btn-primary,
  .action-btn-exit {
    grid-column: 1 / -1;
  }

  .workspace-quick-controls {
    padding: 0;
  }

  .quick-pill-group-list .toolbar-chip {
    flex: 1 1 calc(50% - 6px);
    min-height: 34px;
  }

  .workspace-quick-controls .toolbar-chip,
  .quick-font-dropdown,
  .quick-font-dropdown .font-dropdown-trigger {
    width: 100%;
    min-width: 0;
  }

  .session-quickstart-card {
    flex-direction: column;
    align-items: stretch;
  }

  .session-quickstart-actions {
    align-items: stretch;
  }
}

.workspace-shell {
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.workspace-shell:has(.action-btn-exit) {
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
  border-color: rgba(165, 126, 84, 0.28);
}

.workspace-shell-meta {
  padding: 0 10px 8px;
}

.workspace-shell-meta > span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
}

.main,
.content,
.workspace,
.workspace-main {
  overflow-x: clip;
}

[data-theme="dark"] .workspace-control-live,
[data-theme="dark"] .workspace-applied-pill {
  background: rgba(255, 247, 236, 0.055);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text);
}

[data-theme="dark"] .quick-font-dropdown .font-dropdown-trigger,
[data-theme="dark"] .setup-metric-card {
  background: rgba(255, 247, 236, 0.055);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text);
}

[data-theme="dark"] .setup-metric-list-row,
[data-theme="dark"] .setup-metric-list-empty,
[data-theme="dark"] .analytics-progress-stat,
[data-theme="dark"] .analytics-heatmap-cell,
[data-theme="dark"] .workspace-shell-compact-meta span {
  background: rgba(255, 247, 236, 0.045);
  border-color: rgba(255, 236, 216, 0.14);
  color: var(--text-muted);
}

[data-theme="light"] .quick-font-dropdown .font-dropdown-trigger,
[data-theme="sepia"] .quick-font-dropdown .font-dropdown-trigger,
[data-theme="light"] .setup-metric-card,
[data-theme="sepia"] .setup-metric-card {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(160, 120, 76, 0.16);
  color: var(--text-muted);
}

[data-theme="light"] .setup-metric-list-row,
[data-theme="light"] .setup-metric-list-empty,
[data-theme="light"] .analytics-progress-stat,
[data-theme="light"] .analytics-heatmap-cell,
[data-theme="light"] .workspace-shell-compact-meta span,
[data-theme="sepia"] .setup-metric-list-row,
[data-theme="sepia"] .setup-metric-list-empty,
[data-theme="sepia"] .analytics-progress-stat,
[data-theme="sepia"] .analytics-heatmap-cell,
[data-theme="sepia"] .workspace-shell-compact-meta span {
  background: rgba(154, 103, 56, 0.08);
  color: var(--text-muted);
}

[data-theme="dark"] .session-analytics-panel,
[data-theme="dark"] .session-analytics-summary-card {
  background: rgba(40, 34, 30, 0.74);
  border-color: rgba(216, 185, 150, 0.14);
}

[data-theme="dark"] .workspace-shell {
  background:
    linear-gradient(180deg, rgba(34, 29, 26, 0.98), rgba(24, 20, 18, 0.96)),
    radial-gradient(circle at top right, rgba(208, 160, 107, 0.1), transparent 28%);
}

[data-theme="dark"] .analytics-progress-bar {
  background: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .stats-full-analytics-btn {
  color: #1a140f;
  background: linear-gradient(135deg, #d0a06b, #b98654);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.36);
}

[data-theme="light"] .stats-full-analytics-btn,
[data-theme="sepia"] .stats-full-analytics-btn {
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  box-shadow: 0 12px 24px rgba(112, 78, 43, 0.18);
}

[data-theme="light"] .post-onboarding-modal,
[data-theme="sepia"] .post-onboarding-modal {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 245, 238, 0.96));
  border-color: rgba(160, 120, 76, 0.16);
  color: var(--text);
}

[data-theme="light"] .post-onboarding-header,
[data-theme="sepia"] .post-onboarding-header,
[data-theme="light"] .post-onboarding-footer,
[data-theme="sepia"] .post-onboarding-footer {
  border-color: rgba(160, 120, 76, 0.14);
}

[data-theme="light"] .post-onboarding-header h2,
[data-theme="sepia"] .post-onboarding-header h2 {
  color: var(--text);
}

[data-theme="light"] .post-onboarding-body p,
[data-theme="sepia"] .post-onboarding-body p,
[data-theme="light"] .post-onboarding-points,
[data-theme="sepia"] .post-onboarding-points {
  color: var(--text-muted);
}

[data-theme="light"] .session-analytics-summary-card,
[data-theme="light"] .session-analytics-chart-card,
[data-theme="light"] .comparison-item,
[data-theme="sepia"] .session-analytics-summary-card,
[data-theme="sepia"] .session-analytics-chart-card,
[data-theme="sepia"] .comparison-item {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(160, 120, 76, 0.14);
}

.action-buttons-group {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn-recordings {
  min-width: 188px;
}

.recordings-library-modal {
  width: min(1180px, calc(100vw - 28px));
  max-height: calc(100dvh - 20px);
  height: auto;
}

.recordings-library-header {
  align-items: flex-start;
  padding-top: 14px;
  padding-bottom: 14px;
}

.recordings-library-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.recordings-library-back-btn {
  min-height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: rgba(255, 255, 255, 0.76);
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.recordings-library-back-btn:hover {
  background: var(--accent-light);
  border-color: rgba(154, 103, 56, 0.28);
  color: var(--accent);
}

.recordings-library-head-copy {
  display: grid;
  gap: 6px;
}

.recordings-library-hierarchy,
.recordings-library-nav-meta,
.recordings-library-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.recordings-library-hierarchy span,
.recordings-library-nav-meta span,
.recordings-library-detail-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.16);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 600;
}

[data-theme="dark"] .recordings-library-hierarchy span,
[data-theme="dark"] .recordings-library-nav-meta span,
[data-theme="dark"] .recordings-library-detail-meta span {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.18);
  color: var(--text);
}

.recordings-library-head-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.recordings-library-body {
  padding: 14px 18px 18px;
}

.recordings-library-loading,
.recordings-library-empty {
  min-height: 360px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 12px;
  color: var(--text-muted);
}

.recordings-library-empty h3 {
  margin: 0;
  color: var(--text);
  font-size: 1.2rem;
}

.recordings-library-empty p {
  margin: 0;
  max-width: 420px;
  line-height: 1.6;
}

.recordings-library-empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  color: var(--accent);
  background: rgba(154, 103, 56, 0.08);
  border: 1px solid rgba(154, 103, 56, 0.16);
}

.recordings-library-shell {
  display: grid;
  grid-template-columns: minmax(232px, 260px) minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
}

.recordings-library-nav,
.recordings-library-detail {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  min-height: 0;
}

.recordings-library-nav {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recordings-library-nav-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid rgba(154, 103, 56, 0.08);
}

.recordings-library-nav-head > div:first-child {
  flex: 1;
  min-width: 0;
}

.recordings-library-nav-kicker,
.recordings-library-detail-kicker {
  display: block;
  margin-bottom: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.recordings-library-nav-head strong,
.recordings-library-detail-count {
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 650;
}

.recordings-library-detail-count {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
}

.recordings-library-nav-toggle {
  display: none;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  padding: 9px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.recordings-library-search {
  padding: 10px 12px;
  display: grid;
  gap: 8px;
}

.recordings-library-search-field {
  position: relative;
}

.recordings-library-search-hint {
  margin: 0;
  padding-left: 2px;
}

.recordings-library-ayah-translation {
  margin: 8px 0 0;
  max-width: 38rem;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.6;
  font-style: italic;
}

.recordings-library-search i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.recordings-library-search input {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text);
  padding: 0 14px 0 40px;
  font-size: 0.88rem;
}

.recordings-library-search input:focus {
  outline: none;
  border-color: rgba(154, 103, 56, 0.32);
  box-shadow: 0 0 0 3px rgba(154, 103, 56, 0.08);
}

.recordings-library-nav-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px 12px;
}

.recordings-library-surah-group {
  display: grid;
  gap: 6px;
  padding: 8px 0 10px;
}

.recordings-library-surah-group + .recordings-library-surah-group {
  border-top: 1px solid rgba(154, 103, 56, 0.08);
}

.recordings-library-surah-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
}

.recordings-library-ayah-group {
  display: grid;
  gap: 6px;
}

.recordings-library-ayah-item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  background: rgba(154, 103, 56, 0.05);
  padding: 9px 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.recordings-library-ayah-item:hover {
  transform: translateY(-1px);
  border-color: rgba(154, 103, 56, 0.18);
  background: rgba(154, 103, 56, 0.09);
}

.recordings-library-ayah-item.active {
  border-color: rgba(154, 103, 56, 0.5);
  background: linear-gradient(135deg, rgba(154, 103, 56, 0.28), rgba(154, 103, 56, 0.18));
  box-shadow: 0 10px 24px rgba(154, 103, 56, 0.2);
}

.recordings-library-ayah-label {
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
}

.recordings-library-ayah-count {
  color: var(--text-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

.recordings-library-recordings {
  display: grid;
  gap: 6px;
  margin: 0 0 6px 12px;
  padding-left: 10px;
  border-left: 2px solid rgba(154, 103, 56, 0.12);
}

.recordings-library-recording-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid rgba(154, 103, 56, 0.12);
  background: rgba(255, 255, 255, 0.82);
  animation: recordingsSlideIn 180ms ease;
}

.recordings-library-recording-item.playing {
  border-color: rgba(154, 103, 56, 0.4);
  box-shadow: 0 14px 26px rgba(154, 103, 56, 0.18);
}

.recordings-library-recording-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.recordings-library-recording-copy strong {
  color: var(--text);
  font-size: 0.8rem;
}

.recordings-library-recording-copy span {
  color: var(--text-muted);
  font-size: 0.7rem;
}

[data-theme="dark"] .recordings-library-search input,
[data-theme="dark"] .recordings-library-nav-toggle,
[data-theme="dark"] .recordings-library-ayah-item {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.2);
  color: var(--text);
}

[data-theme="dark"] .recordings-library-ayah-item.active {
  background: linear-gradient(135deg, rgba(208, 160, 107, 0.28), rgba(255, 255, 255, 0.06));
  border-color: rgba(208, 160, 107, 0.42);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.24);
}

[data-theme="dark"] .recordings-library-recording-item {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.18);
}

[data-theme="dark"] .recordings-library-recording-item.playing {
  border-color: rgba(208, 160, 107, 0.38);
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.26);
}

@keyframes recordingsSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.recordings-group-expand-enter-active,
.recordings-group-expand-leave-active {
  overflow: hidden;
  transition: opacity 0.18s ease, transform 0.18s ease, max-height 0.22s ease;
}

.recordings-group-expand-enter-from,
.recordings-group-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}

.recordings-library-detail {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recordings-library-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(154, 103, 56, 0.08);
}

.recordings-library-detail-head > div:first-child {
  flex: 1;
  min-width: 0;
}

.recordings-library-detail-head h3 {
  margin: 0;
  color: var(--text);
  font-size: 1rem;
}

.recordings-library-history {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 16px;
  display: grid;
  gap: 10px;
  align-content: start;
  align-items: start;
}

.recording-history-card {
  border: 1px solid rgba(154, 103, 56, 0.12);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(253, 249, 244, 0.82));
  padding: 14px;
  display: grid;
  gap: 9px;
  min-height: 0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.recording-history-card.playing {
  border-color: rgba(154, 103, 56, 0.3);
  box-shadow: 0 14px 30px rgba(154, 103, 56, 0.12);
  transform: translateY(-1px);
}

.recording-history-top,
.recording-history-actions,
.recording-delete-confirm,
.recording-delete-confirm-actions,
.recording-history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recording-history-top {
  align-items: flex-start;
}

.recording-history-copy {
  display: grid;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.recording-history-kicker {
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 700;
}

.recording-history-note {
  margin-top: 0;
}

.recording-history-copy strong {
  color: var(--text);
  font-size: 0.96rem;
}

.recording-history-copy span,
.recording-history-meta span {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.recording-history-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.recording-history-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 2px;
}

.recording-history-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.recording-history-action {
  min-width: 92px;
  width: auto;
  padding: 0 12px;
  gap: 8px;
}

.recording-history-action-delete {
  color: #8b4f39;
}

.recording-history-action span {
  font-size: 0.76rem;
  font-weight: 600;
}

.recording-result-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.recording-result-pill.tone-excellent {
  background: #dceee1;
  border-color: rgba(47, 114, 72, 0.3);
  color: #1d5b33;
}

.recording-result-pill.tone-good {
  background: #f0dfc4;
  border-color: rgba(166, 121, 72, 0.32);
  color: #6d461c;
}

.recording-result-pill.tone-review {
  background: #f1d7ce;
  border-color: rgba(187, 103, 46, 0.34);
  color: #8a3e24;
}

.recording-delete-confirm {
  border-top: 1px solid rgba(154, 103, 56, 0.08);
  padding-top: 12px;
  flex-wrap: wrap;
}

.recording-delete-confirm span {
  color: var(--text);
  font-size: 0.82rem;
  font-weight: 600;
}

.recording-delete-confirm-actions {
  justify-content: flex-end;
}

.recording-inline-btn {
  min-height: 38px;
  padding: 9px 14px;
  flex: initial;
}

.recordings-library-empty-panel {
  flex: 1;
  min-height: 280px;
}

[data-theme="dark"] .recordings-library-nav,
[data-theme="dark"] .recordings-library-detail,
[data-theme="dark"] .recording-history-card {
  background: rgba(40, 34, 30, 0.76);
  border-color: rgba(216, 185, 150, 0.14);
}

[data-theme="dark"] .self-check-modal,
[data-theme="dark"] .self-check-modal-stage,
[data-theme="dark"] .self-check-recorder-card,
[data-theme="dark"] .self-check-attempts-card,
[data-theme="dark"] .self-check-attempt-card {
  background: linear-gradient(180deg, rgba(34, 28, 24, 0.98), rgba(24, 20, 18, 0.95));
  border-color: rgba(224, 180, 126, 0.24);
}

[data-theme="dark"] .self-check-review-card {
  background: rgba(255, 247, 236, 0.06);
  border-color: rgba(255, 236, 216, 0.16);
}

[data-theme="dark"] .self-check-modal-ayah-shell {
  background:
    radial-gradient(circle at top, rgba(208, 160, 107, 0.18), transparent 54%),
    linear-gradient(180deg, rgba(46, 39, 34, 0.98), rgba(30, 25, 22, 0.96));
  border-color: rgba(224, 180, 126, 0.28);
}



[data-theme="dark"] .self-check-recorder-meta span,
[data-theme="dark"] .self-check-library-link,
[data-theme="dark"] .self-check-modal-font-controls,
[data-theme="dark"] .self-check-modal-tool-btn,
[data-theme="dark"] .self-check-modal-memory-btn,
[data-theme="dark"] .self-check-attempts-count,
[data-theme="dark"] .self-check-live-stage {
  background: rgba(255, 247, 236, 0.09);
  border-color: rgba(255, 236, 216, 0.22);
  color: var(--text);
}

[data-theme="dark"] .self-check-ayah-action,
[data-theme="dark"] .recordings-library-recording-item {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.18);
  color: var(--text);
}

[data-theme="dark"] .self-check-ayah-action.active {
  background: rgba(208, 160, 107, 0.18);
  border-color: rgba(208, 160, 107, 0.34);
  color: var(--accent-strong);
}

[data-theme="dark"] .recordings-library-back-btn {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.18);
  color: var(--text);
}

[data-theme="dark"] .recordings-library-back-btn:hover {
  background: rgba(208, 160, 107, 0.14);
  border-color: rgba(208, 160, 107, 0.24);
  color: var(--accent-strong);
}

[data-theme="dark"] .self-check-modal-tool-btn:hover,
[data-theme="dark"] .self-check-modal-memory-btn:hover,
[data-theme="dark"] .self-check-modal-memory-btn.active,
[data-theme="dark"] .self-check-library-link:hover {
  background: rgba(208, 160, 107, 0.14);
  border-color: rgba(208, 160, 107, 0.22);
  color: var(--accent-strong);
}

[data-theme="dark"] .self-check-status-info {
  background: rgba(255, 247, 236, 0.1);
  border-color: rgba(255, 236, 216, 0.2);
}

[data-theme="dark"] .self-check-status-success {
  background: rgba(95, 156, 106, 0.14);
  border-color: rgba(95, 156, 106, 0.22);
  color: #aed7b5;
}

[data-theme="dark"] .self-check-status-warning {
  background: rgba(194, 149, 102, 0.14);
  border-color: rgba(194, 149, 102, 0.2);
  color: #f0d0a7;
}

[data-theme="dark"] .self-check-result-btn {
  background: rgba(255, 247, 236, 0.1);
  border-color: rgba(255, 236, 216, 0.2);
  color: var(--text);
}

[data-theme="dark"] .recordings-library-search input,
[data-theme="dark"] .recordings-library-nav-toggle,
[data-theme="dark"] .recordings-library-ayah-item {
  background: rgba(255, 247, 236, 0.08);
  border-color: rgba(255, 236, 216, 0.2);
  color: var(--text);
}

[data-theme="dark"] .self-check-result-btn.tone-excellent {
  color: #e8f9eb;
  background: rgba(49, 123, 73, 0.42);
  border-color: rgba(123, 200, 139, 0.42);
}

[data-theme="dark"] .self-check-result-btn.tone-good {
  color: #fff1dc;
  background: rgba(151, 101, 37, 0.44);
  border-color: rgba(226, 175, 105, 0.38);
}

[data-theme="dark"] .self-check-result-btn.tone-review {
  color: #fff0ea;
  background: rgba(151, 72, 48, 0.46);
  border-color: rgba(226, 135, 105, 0.4);
}

[data-theme="dark"] .self-check-result-btn.active {
  outline-color: rgba(224, 180, 126, 0.3);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.32);
}

[data-theme="dark"] .recordings-library-ayah-item.active {
  background: linear-gradient(135deg, rgba(208, 160, 107, 0.18), rgba(255, 255, 255, 0.04));
  border-color: rgba(208, 160, 107, 0.28);
}

[data-theme="dark"] .recordings-library-empty-icon {
  background: rgba(208, 160, 107, 0.12);
  border-color: rgba(208, 160, 107, 0.18);
  color: var(--accent-strong);
}

[data-theme="dark"] .recording-result-pill.tone-excellent {
  background: rgba(95, 156, 106, 0.16);
  border-color: rgba(95, 156, 106, 0.22);
  color: #aed7b5;
}

[data-theme="dark"] .recording-result-pill.tone-good {
  background: rgba(208, 160, 107, 0.14);
  border-color: rgba(208, 160, 107, 0.18);
  color: #edd1ad;
}

[data-theme="dark"] .recording-result-pill.tone-review {
  background: rgba(194, 149, 102, 0.14);
  border-color: rgba(194, 149, 102, 0.2);
  color: #f0d0a7;
}

@media (max-width: 1024px) {
  .self-check-modal-recorder-grid {
    grid-template-columns: 1fr;
  }

  .self-check-attempts-list {
    max-height: 300px;
  }
}

@media (max-width: 768px) {
  .action-buttons-group .action-btn span {
    display: inline-block;
  }

  .action-btn-recordings {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .self-check-modal {
    width: 100vw;
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
  }

  .self-check-modal-body {
    padding: 16px;
  }

  .self-check-modal-stage,
  .self-check-recorder-card,
  .self-check-attempts-card {
    border-radius: 20px;
  }


  .self-check-modal-memory-tools {
    margin-left: 0;
    justify-items: stretch;
  }

  .self-check-modal-tool-group {
    width: 100%;
  }

  .self-check-result-group {
    grid-template-columns: 1fr;
  }

  .self-check-modal-font-controls {
    width: 100%;
    justify-content: space-between;
  }

  .self-check-modal-tool-btn,
  .self-check-modal-memory-btn,
  .self-check-library-link,
  .self-check-action-btn,
  .self-check-preview-btn {
    width: 100%;
    justify-content: center;
  }

  .self-check-modal-ayah-shell {
    min-height: 220px;
    padding: 18px;
  }

  .recordings-library-modal {
    width: 100vw;
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
  }

  .recordings-library-body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .recordings-library-shell {
    grid-template-columns: 1fr;
  }

  .recordings-library-nav-toggle {
    display: inline-flex;
  }

  .recordings-library-nav-scroll {
    max-height: 42vh;
    padding-right: 10px;
  }

  .recordings-library-detail-head,
  .recording-history-top,
  .recording-history-actions,
  .recording-delete-confirm {
    flex-direction: column;
    align-items: stretch;
  }

  .recording-history-action {
    width: 100%;
    justify-content: center;
  }

  .recording-delete-confirm-actions {
    width: 100%;
    justify-content: stretch;
  }

  .recording-inline-btn {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .action-buttons-group .action-btn {
    width: 100%;
    padding: 0 12px;
  }

  .action-buttons-group .action-btn i {
    margin: 0;
  }

  .self-check-modal-body {
    padding: 14px;
  }

  .self-check-modal-stage,
  .self-check-recorder-card,
  .self-check-attempts-card {
    padding: 16px;
  }

  .recordings-library-nav-head {
    flex-direction: column;
    align-items: stretch;
  }

  .recordings-library-ayah-item {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 900px) {
  .session-analytics-summary-grid,
  .session-analytics-two-col,
  .setup-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .workspace-shell-head {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace-shell-actions,
  .action-buttons-group {
    width: 100%;
  }

  .workspace-shell-icon-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .session-analytics-summary-grid,
  .session-analytics-two-col,
  .analytics-progress-split,
  .setup-metric-grid {
    grid-template-columns: 1fr;
  }

  .session-analytics-modal {
    width: min(100vw, 100%);
    max-height: 100vh;
    border-radius: 0;
  }

  .analytics-heatmap-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Mobile hardening: keep dense session surfaces usable on narrow phones. */
@media (max-width: 768px) {
  .modal-overlay {
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
  }

  .modal-content,
  .save-name-modal,
  .session-exit-modal,
  .session-analytics-modal,
  .recordings-library-modal,
  .self-check-modal,
  .post-onboarding-modal {
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }

  .modal-header,
  .recordings-library-header,
  .self-check-modal-header,
  .session-analytics-header {
    gap: 12px;
    padding: calc(env(safe-area-inset-top, 0px) + 16px) 16px 14px;
  }

  .modal-header-text,
  .recordings-library-head-copy,
  .self-check-modal-head-copy,
  .session-analytics-head-copy {
    min-width: 0;
  }

  .modal-header-text h2,
  .recordings-library-head-copy h2,
  .self-check-modal-head-copy h2,
  .session-analytics-head-copy h2 {
    overflow-wrap: anywhere;
  }

  .session-analytics-header {
    flex-direction: column;
    align-items: stretch;
  }

  .session-analytics-head-actions,
  .action-buttons-group,
  .workspace-shell-actions,
  .workspace-shell-icon-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    gap: 10px;
  }

  .session-analytics-download,
  .action-buttons-group .action-btn,
  .workspace-shell-actions .action-btn,
  .workspace-shell-icon-actions .action-btn {
    width: 100%;
    min-width: 0;
  }

  .modal-body,
  .recordings-library-body,
  .self-check-modal-body,
  .session-analytics-body {
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .modal-footer {
    padding: 14px 16px calc(env(safe-area-inset-bottom, 0px) + 14px);
  }

  .session-preview-card,
  .preview-stats,
  .input-hint,
  .recording-history-top,
  .recording-history-meta,
  .recording-history-actions,
  .self-check-recorder-head,
  .self-check-review-head,
  .self-check-attempt-top,
  .self-check-attempt-actions,
  .self-check-live-stage {
    min-width: 0;
  }

  .tools {
    max-width: 100vw;
  }

  .tools-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tools-tabs button,
  .mode-radio,
  .technique-row,
  .setting-row,
  .toolbar-chip,
  .verse-self-check-btn {
    min-width: 0;
  }

  .tools-footer {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .tools-footer .btn,
  .tools-footer button {
    width: 100%;
    min-width: 0;
  }

  .verse-toolbar,
  .verse-audio-controls,
  .verse-player-controls,
  .reading-toolbar,
  .reading-toolbar-group {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    min-width: 0;
  }

  .verse-audio-controls > *,
  .verse-player-controls > *,
  .reading-toolbar-group > * {
    flex: 1 1 auto;
    min-width: 44px;
  }

  .audio-player-container {
    left: 8px;
    right: 8px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
    width: auto;
    max-width: none;
  }

  .audio-player-container,
  .audio-player-content,
  .mini-player,
  .audio-player-controls {
    min-width: 0;
  }

  .audio-player-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  .audio-player-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .self-check-modal-stage,
  .self-check-recorder-card,
  .self-check-attempts-card,
  .recordings-library-nav,
  .recordings-library-detail,
  .recording-history-card {
    min-width: 0;
  }

  .self-check-modal-ayah {
    overflow-wrap: anywhere;
  }

  .self-check-recorder-head,
  .self-check-review-head,
  .self-check-attempt-top,
  .self-check-attempt-actions,
  .self-check-live-stage {
    flex-direction: column;
    align-items: stretch;
  }

  .self-check-idle-actions,
  .self-check-live-actions,
  .self-check-review-actions {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }

  .recordings-library-shell {
    gap: 14px;
  }

  .recordings-library-nav,
  .recordings-library-detail {
    border-radius: 16px;
  }

  .recordings-library-recording-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(44px, auto);
  }

  .recordings-library-recording-copy strong,
  .recordings-library-recording-copy span,
  .recording-history-copy strong,
  .recording-history-copy span {
    overflow-wrap: anywhere;
  }

  .recording-history-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .modal-header,
  .recordings-library-header,
  .self-check-modal-header {
    align-items: flex-start;
  }

  .modal-header-icon {
    width: 42px;
    height: 42px;
  }

  .modal-header-text h2,
  .recordings-library-head-copy h2,
  .self-check-modal-head-copy h2 {
    font-size: 1.05rem;
    line-height: 1.25;
  }

  .modal-close-btn {
    width: 44px;
    height: 44px;
  }

  .session-analytics-head-actions,
  .action-buttons-group,
  .workspace-shell-actions,
  .workspace-shell-icon-actions,
  .tools-footer {
    grid-template-columns: 1fr;
  }

  .session-preview-card,
  .name-input-group,
  .quick-suggestions,
  .self-check-modal-stage,
  .self-check-recorder-card,
  .self-check-attempts-card,
  .recordings-library-nav,
  .recordings-library-detail,
  .recording-history-card {
    border-radius: 14px;
  }

  .session-preview-card,
  .self-check-modal-stage,
  .self-check-recorder-card,
  .self-check-attempts-card,
  .recording-history-card {
    padding: 14px;
  }

  .preview-surah,
  .preview-range,
  .preview-stats,
  .input-hint {
    width: 100%;
  }

  .input-hint {
    display: grid;
    gap: 4px;
  }

  .suggestion-chips {
    justify-content: flex-start;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .suggestion-chip {
    white-space: nowrap;
  }

  .recordings-library-body,
  .self-check-modal-body {
    padding: 12px;
  }

  .recordings-library-nav-head,
  .recordings-library-detail-head,
  .recordings-library-search,
  .recordings-library-history {
    padding-left: 12px;
    padding-right: 12px;
  }

  .recordings-library-recordings {
    margin-left: 0;
  }

  .recordings-library-recording-item {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .recordings-library-recording-item .icon-btn,
  .recordings-library-recording-item button {
    width: 100%;
  }

  .recording-result-pill {
    justify-self: flex-start;
  }

  .self-check-result-group {
    grid-template-columns: 1fr;
  }

  .self-check-modal-ayah-shell {
    min-height: 180px;
    padding: 16px 12px;
  }

  .audio-player-content {
    grid-template-columns: 1fr;
  }

  .audio-player-controls {
    justify-content: stretch;
  }

  .audio-player-controls > * {
    flex: 1 1 44px;
  }
}
</style>
