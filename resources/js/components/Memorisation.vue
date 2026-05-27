<template>
  <div class="app" :data-theme="theme" :style="appStyleVars" v-cloak>
    <div v-if="appReady && banner" class="banner" :class="banner.kind">
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
              <button class="cta cta-ghost continue-session-dismiss" @click="confirmDiscardContinueSession">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="offcanvas-launcher-card">
            <button class="cta cta-primary setup-primary" type="button" aria-controls="memorisationToolsPanel"
              :aria-expanded="showTools ? 'true' : 'false'" @click="openToolsPanel()" title="Open controls">
              <i class="bi bi-sliders"></i> Open Session Controls
            </button>
            <p class="offcanvas-launcher-copy">
              Session setup lives in the offcanvas.
            </p>
          </div>
        </section>

        <div v-if="false" class="reading-toolbar">
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
            <div class="workspace-shell-head" style="padding: 10px;">
              <div class="workspace-shell-copy">
                <div class="workspace-shell-title-row">
                  <h1>{{ currentChapter ? currentChapter.name_simple : activeChapterName }}</h1>
                </div>
                <p>{{ currentActionLabel }}</p>
              </div>
              <div class="workspace-shell-actions">
                <div class="action-buttons-group">
                  <button class="action-icon-btn" @click="toggleFullScreen" title="Full screen mode">
                    <i class="bi bi-arrows-fullscreen"></i>
                  </button>
                  <button class="action-icon-btn" @click="toggleKeyboardShortcuts" title="Keyboard shortcuts">
                    <i class="bi bi-keyboard"></i>
                  </button>
                  <button class="action-btn action-btn-secondary" type="button" @click="openAdvancedControls"
                    title="Open session controls">
                    <i class="bi bi-sliders"></i>
                    <span>Controls</span>
                  </button>
                  <button class="action-btn action-btn-primary" type="button" @click="handlePrimaryAction"
                    :disabled="!isPlaying && !canStartSession">
                    <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    <span>{{ isPlaying ? 'Pause' : 'Start Session' }}</span>
                  </button>
                </div>
              </div>
            </div>
            <!-- Keyboard Shortcuts Modal -->
            <div v-if="showKeyboardShortcuts" class="keyboard-shortcuts-modal"
              @click.self="showKeyboardShortcuts = false">
              <div class="shortcuts-modal">
                <div class="shortcuts-modal-header">
                  <h3>
                    <i class="bi bi-keyboard"></i>
                    <span>Keyboard Shortcuts</span>
                  </h3>
                  <button class="shortcuts-modal-close" @click="showKeyboardShortcuts = false">
                    <i class="bi bi-x-lg"></i>
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
            <div v-show="!mainCardCollapsed" class="workspace-shell-meta">
              <span>Ayah {{ currentPosition }} of {{ totalVerses }}</span>
              <span>{{ progressPercent }}% complete</span>
              <span v-if="etaLabel">{{ etaLabel }}</span>
              <span v-if="activePracticeTechniques.length" class="workspace-shell-active-pill">
                <i class="bi bi-stars"></i> {{ activePracticeTechniques.length }} active method{{ activePracticeTechniques.length === 1 ? '' : 's' }}
              </span>

              <div v-if="!mainCardCollapsed && chainingEnabled && hasSessionFeedback" class="workspace-shell-chaining"
                aria-label="Chaining status">
                <span class="workspace-shell-chain-pill shadow-md">
                  <i class="bi bi-link-45deg"></i>{{ chainingMethod === 'cumulative' ? 'Cumulative' : 'Linking' }} · {{
                    chainingRepetitions }}x
                </span>
                <span class="workspace-shell-chain-pill workspace-shell-chain-pill-soft shadow-md">
                  <i class="bi bi-diagram-3"></i>{{ chainingProgressLabel }}
                </span>
              </div>
            </hr>
            </div>
            <div v-show="!mainCardCollapsed" class="workspace-quick-controls" aria-label="Quick reading controls">
              <button class="toolbar-chip" :class="{ active: showTranslation }" @click="toggleReadingOption('translation')" type="button">Translation</button>
              <button class="toolbar-chip" :class="{ active: showTransliteration }" @click="toggleReadingOption('transliteration')" type="button">Transliteration</button>
              <button class="toolbar-chip" :class="{ active: showWordByWord }" @click="toggleReadingOption('wbw')" type="button">Word by word</button>
              <button class="toolbar-chip" :class="{ active: wordByWordAudioEnabled }" @click="toggleWordAudio()" type="button">Word audio</button>
              <button class="toolbar-chip" :class="{ active: tajweedEnabled }" @click="toggleTajweed" type="button">Tajweed</button>
              <button class="toolbar-chip" @click="cycleQuranFontPill" type="button">Font: {{ getCurrentFontLabel() }}</button>
            </div>
          </section>

          <main id="memorisationWorkspaceMain" ref="workspaceMain" class="workspace-main"
            aria-label="Memorisation workspace">
            <div class="verses-grid">
              <div v-for="verse in verses" :key="verse.key" :data-verse-key="verse.key" class="verse-card" :class="{
                active: effectiveActiveVerseKey === verse.key,
                'serious-training': false,
                'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key),
                'peek-revealed': isVersePeekRevealed(verse.key)
              }" @click="onVerseCardClick(verse)" role="button" tabindex="0"
                @mouseenter="onVersePeekEnter(verse.key)" @mouseleave="onVersePeekLeave(verse.key)"
                @touchstart.passive="onVerseTouchStart($event, verse.key)" @touchend.passive="onVerseTouchEnd($event, verse.key)"
                @touchcancel.passive="clearTouchPeek"
                @keydown.enter.prevent="onVerseCardClick(verse)">
                <div class="verse-header">
                  <div class="verse-badges">
                    <span class="verse-number">Ayah {{ verse.number }}</span>
                    <span v-if="isReviewPriorityAyah(verse.key)"
                      class="verse-status-badge verse-status-badge-review">Review Due</span>
                    <span v-if="effectiveActiveVerseKey === verse.key" class="verse-status-badge">Active Ayah</span>
                  </div>
                  <div class="verse-actions">
                    <!-- Small play button next to play pill -->
                    <button class="verse-small-play-btn" @click.stop="playVerse(verse)"
                      :title="hasSessionFeedback ? (activeVerseKey === verse.key && isPlaying ? 'Pause' : 'Play current ayah') : 'Preview this ayah (does not start a session)'">
                      <i class="bi"
                        :class="activeVerseKey === verse.key && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    </button>

                    <!-- Download button for every verse -->
                    <button class="verse-download-btn" @click.stop="downloadVerseAudio(verse)" :disabled="!verse.audio"
                      title="Download audio for offline listening">
                      <i class="bi bi-download"></i>
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
                    'font-family': quranFontFamily,
                    'font-size': (getVerseFontSize(verse.key) / 100) + 'rem'
                  }">
                </div>

                <!-- Keep in-workspace aids available, but visually quieter -->
                <div v-if="showTransliteration && verse.transliteration" class="verse-transliteration verse-aid">
                  <div class="verse-aid-title">Transliteration</div>
                  {{ verse.transliteration }}
                </div>
                <div v-if="showTranslation && verse.translation" class="verse-translation verse-aid">
                  <div class="verse-aid-title">Translation</div>
                  {{ verse.translation }}
                </div>
                <div v-if="showWordByWord && verse.words && verse.words.length" class="verse-words verse-aid"
                  @scroll="onVerseWordsScroll(verse.key, $event)">
                  <div v-for="(word, wi) in verse.words" :key="wi" class="word-item"
                    :class="{ highlighted: currentHighlightedVerseKey === verse.key && currentWordIndex === wi, 'phrase-highlighted': currentHighlightedVerseKey === verse.key && currentPhraseIndex === wi }"
                    :title="wordTooltip(word)" :data-tooltip="wordTooltip(word)" tabindex="0"
                    @click.stop="revealWordHint(word)">
                    <span class="word-arabic" dir="rtl">{{ word.ar }}</span>
                    <span class="word-meaning">{{ word.en }}</span>
                    <button v-if="word.audio && wordByWordAudioEnabled" class="word-audio-btn"
                      @click.stop="playWordAudio(word.audio)">
                      <i class="bi bi-volume-up"></i>
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
            <button class="tools-x" @click="closeToolsPanel" aria-label="Close panel"><i
                class="bi bi-x-lg"></i></button>
          </div>
          <div class="tools-tabs" role="tablist" aria-label="Controls tabs">
            <button :class="{ active: tab === 'tools' }" @click.prevent="setActiveTab('tools')" title="Session tools"
              type="button">
              <i class="bi bi-sliders"></i> Session
            </button>
            <button :class="{ active: tab === 'techniques' }" @click.prevent="setActiveTab('techniques')"
              title="Practice presets" type="button">
              <i class="bi bi-stars"></i> Practice
            </button>
            <button :class="{ active: tab === 'saved' }" @click.prevent="setActiveTab('saved')" title="Saved sessions"
              type="button">
              <i class="bi bi-clock-history"></i> Saved
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
                  <span class="st-ico"><i class="bi bi-book"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Session Setup</span>
                    <span class="st-sub">Choose what you memorise</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-stack field-stack-compact">
                  <div class="field">
                    <label>Surah</label>
                    <select :value="chapterId" @change="onChapterChange" class="select">
                      <option :value="0">Choose a surah...</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.name_simple }}</option>
                    </select>
                    <small class="field-hint">Pick the surah you want to work on.</small>
                  </div>
                  <div class="field">
                    <label>Verse range</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>to</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                    <small class="field-hint">Keep ranges small for focused memorisation.</small>
                  </div>
                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                    <small class="field-hint">Changes the audio voice for the session.</small>
                  </div>
                  <div class="field">
                    <div class="field-header">
                      <label>Repetitions</label>
                      <span class="range-value-pill">{{ repetitionsPerStep }}x</span>
                    </div>
                    <div class="range-control">
                      <input
                        type="range"
                        v-model.number="repetitionsPerStep"
                        min="1"
                        max="50"
                        step="1"
                        class="input technique-range"
                      />
                    </div>
                    <div class="slider-markers">
                      <span>1x</span><span>12x</span><span>25x</span><span>37x</span><span>50x</span>
                    </div>
                    <small class="field-hint">Repeat each verse {{ repetitionsPerStep }} time{{ repetitionsPerStep === 1 ? '' : 's' }} before moving on.</small>
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
                </div>
              </div>
            </section>
          </div>

          <!-- TECHNIQUES TAB -->
          <div v-else-if="tab === 'techniques'" class="sheet">
            <section v-if="activePracticeTechniques.length" class="sheet-section active-techniques-section">
              <div class="active-techniques-header">
                <div>
                  <div class="st-title">Active methods</div>
                  <div class="st-sub">A quick view of the techniques shaping this session.</div>
                </div>
                <div class="active-techniques-count">{{ activePracticeTechniques.length }}</div>
              </div>
              <div class="active-techniques-grid">
                <div v-for="item in activePracticeTechniques" :key="item.key" class="active-technique-card">
                  <div class="active-technique-icon"><i :class="item.icon"></i></div>
                  <div class="active-technique-copy">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.description }}</span>
                  </div>
                </div>
              </div>
            </section>
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
                    <label class="mode-radio" :class="{ active: focusModeEnabled }">
                      <input type="radio" name="focus-mode-state" aria-label="Use focus mode" :checked="focusModeEnabled" @change="focusModeEnabled = true">
                      <span class="mode-radio-dot" aria-hidden="true"></span>
                    </label>
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
                    <label class="mode-radio" :class="{ active: blurModeEnabled }">
                      <input type="radio" name="blur-mode-state" aria-label="Use blur mode" :checked="blurModeEnabled" @change="blurModeEnabled = true">
                      <span class="mode-radio-dot" aria-hidden="true"></span>
                    </label>
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
                    <label class="mode-radio" :class="{ active: chainingEnabled }">
                      <input type="radio" name="chaining-state" aria-label="Use chaining" :checked="chainingEnabled" @change="setChainingEnabled(true)">
                      <span class="mode-radio-dot" aria-hidden="true"></span>
                    </label>
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
                    <label class="mode-radio" :class="{ active: anchorModeEnabled }">
                      <input type="radio" name="anchor-mode-state" aria-label="Use anchor mode" :checked="anchorModeEnabled" @change="setAnchorMode(true)">
                      <span class="mode-radio-dot" aria-hidden="true"></span>
                    </label>
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
              <div v-if="savedSessions.length === 0" class="empty-state">
                <i class="bi bi-journal-bookmark"></i>
                <p>No saved sessions yet</p>
                <span>Save your current session to get started</span>
              </div>
              <div v-else class="sessions-list">
                <div v-for="session in savedSessions" :key="session.id" class="session-item">
                  <div class="session-info" @click="loadSavedSession(session.id)">
                    <div class="session-name">
                      <i class="bi bi-bookmark-fill"></i>
                      <span>{{ session.name }}</span>
                    </div>
                    <div class="session-details">
                      <span><i class="bi bi-book"></i> {{ session.config?.chapterName || `Surah
                        ${session.config?.chapterId}` }}</span>
                      <span><i class="bi bi-text-paragraph"></i> {{ session.config?.rangeStart }}-{{
                        session.config?.rangeEnd }}</span>
                      <span><i class="bi bi-clock"></i> {{ formatDate(session.savedAt) }}</span>
                    </div>
                  </div>
                  <button class="delete-btn" @click.stop="deleteSavedSession(session.id)" title="Delete session">
                    <i class="bi bi-trash3"></i>
                  </button>
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

          <!-- SETTINGS TAB - Same layout as Techniques tab -->
          <div v-else-if="tab === 'settings'" class="sheet">

            <!-- Display Settings Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('display_settings')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-display"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Display</span>
                    <span class="st-sub">Customize how the Quran appears</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.display_settings }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.display_settings">

                <!-- Tajweed -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">Tajweed</div>
                    <div class="setting-description">Recitation color rules (Idgham, Ikhfa, Madd, etc.)</div>
                  </div>
                </div>

                <!-- Font Size -->
                <div class="setting-item setting-item-range">
                  <div class="setting-info">
                    <div class="setting-label">Font size</div>
                    <div class="setting-description">Adjust the Arabic text size for better readability</div>
                  </div>
                  <div class="range-control-compact">
                    <span class="range-value-badge">{{ defaultFontSize }}%</span>
                    <input type="range" min="80" max="200" step="5" v-model.number="defaultFontSize"
                      @input="updateDefaultFontSize" class="input range-slider">
                  </div>
                </div>
              </div>
            </section>

            <!-- Reading Aids Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('reading_settings')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-book-half"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Reading Aids</span>
                    <span class="st-sub">Translations and word helpers</span>
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
                    <div class="setting-description">English meaning of each verse</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showTranslation }"
                    @click="toggleReadingOption('translation')">
                    {{ showTranslation ? 'On' : 'Off' }}
                  </button>
                </div>

                <!-- Transliteration -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">Transliteration</div>
                    <div class="setting-description">Latin script pronunciation aid</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showTransliteration }"
                    @click="toggleReadingOption('transliteration')">
                    {{ showTransliteration ? 'On' : 'Off' }}
                  </button>
                </div>

                <!-- Word by Word -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">Word by word</div>
                    <div class="setting-description">Individual word chips with meanings</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: showWordByWord }" @click="toggleReadingOption('wbw')">
                    {{ showWordByWord ? 'On' : 'Off' }}
                  </button>
                </div>

                <!-- Word Audio -->
                <div class="setting-item">
                  <div class="setting-info">
                    <div class="setting-label">Word audio</div>
                    <div class="setting-description">Audio playback with word highlighting</div>
                  </div>
                  <button class="toggle-chip" :class="{ active: wordByWordAudioEnabled }"
                    @click="wordByWordAudioEnabled = !wordByWordAudioEnabled">
                    {{ wordByWordAudioEnabled ? 'On' : 'Off' }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="tools-footer" :class="{ 'settings-footer': tab === 'settings' }">
          <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="resetControls">
            <i class="bi bi-arrow-counterclockwise"></i><span>Reset</span>
          </button>
          <button class="tools-btn tools-btn-primary tools-btn-soft" @click="startSessionAndClose">
            <i class="bi bi-play-fill"></i><span>Start Session</span>
          </button>
        </div>
      </aside>
    </div>

    <div v-else-if="appReady && !isLoggedIn" class="main container">
      <div class="login-hero">
        <div class="login-card">
          <div class="login-icon">
            <i class="bi bi-book-half"></i>
          </div>
          <h1>Welcome to Mutqin</h1>
          <p class="login-subtitle">Your personal Quran memorisation companion</p>

          <div class="login-features">
            <div class="feature">
              <i class="bi bi-cloud-check"></i>
              <span>Sync across devices</span>
            </div>
            <div class="feature">
              <i class="bi bi-graph-up"></i>
              <span>Track your progress</span>
            </div>
            <div class="feature">
              <i class="bi bi-calendar-check"></i>
              <span>Never lose your place</span>
            </div>
          </div>

          <a href="/login" class="login-btn" style="text-decoration: none;">
            <i class="bi bi-box-arrow-in-right"></i>
            <span>Sign in to continue</span>
          </a>

          <p class="login-note">
            Your sessions, progress, and resume history sync after login
          </p>
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
      <div class="modal-content confirm-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>{{ confirmModal.title }}</h2>
          <button class="btn-icon" @click="closeConfirmModal"><i class="bi bi-x-lg"></i></button>
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




    <div v-if="showCountdownOverlay" class="countdown-overlay">
      <div class="countdown-modal">
        <div class="countdown-number">{{ countdownValue }}</div>
        <div class="countdown-text">Prepare yourself</div>
      </div>
    </div>

    <!-- Global Audio Player - Updated with Speed Controls -->
    <transition name="slide-up">
      <div v-if="appReady && playerVisible" class="player-bar" :class="{ collapsed: playerCollapsed }">
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
            <button class="player-btn" @click="prev" title="Previous">
              <i class="bi bi-skip-start-fill"></i>
            </button>
            <button class="player-btn player-play" @click="togglePlay" title="Play/Pause">
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
            </button>
            <button class="player-btn" @click="next" title="Next">
              <i class="bi bi-skip-end-fill"></i>
            </button>
          </div>

          <div class="player-loop-controls" aria-label="Loop count">
            <span class="player-loop-label">Loop</span>
            <div class="player-loop-group" role="group" aria-label="Playback loop count">
              <button
                v-for="option in loopCountOptions"
                :key="`loop-${option.value}`"
                class="player-loop-chip"
                :class="{ active: selectedLoopCount === option.value }"
                type="button"
                @click="setLoopCount(option.value)"
                :title="option.label"
              >
                {{ option.shortLabel }}
              </button>
            </div>
          </div>

          <div class="player-progress-wrap">
            <span class="player-time">{{ formatTime(currentTime) }}</span>
            <div class="player-progress-bg" @click="seek" ref="progress">
              <div class="player-progress-fill" :style="{ width: (currentTime / (duration || 1)) * 100 + '%' }"></div>
            </div>
            <span class="player-time">{{ formatTime(duration) }}</span>
          </div>




          <button class="player-btn" @click="playerVisible = false" title="Close player">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </transition>

    <!-- Audio System -->
    <audio ref="audio" style="display:none"></audio>

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

function createCentralSessionState() {
  return {
    showSaveNameModal: false,
    saveSessionName: '',
    activeTab: 'tools',
    repetitionTimes: 0,
    tajweedEnabled: false,
    focusModeEnabled: false,
    blurModeEnabled: false,
    blurIntensity: 10,
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
      tab: 'tools',
      showTools: false,
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
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
        action: ''
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
        defaultFontSize: 100
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
      selectedSessionId: '',
      sessionName: '',

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
    activeVerseRef() {
      return this.verses.find(v => v.key === this.effectiveActiveVerseKey) || null
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
      return this.verses.find(v => v.key === this.effectiveActiveVerseKey) || null
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
      if (!this.hasVerses) return 'Choose surah and range, then start.'
      if (!this.effectiveActiveVerseKey) return 'Tap Start Session to build and start the queue.'
      if (this.guidedUiStep === 'review') return 'Action now: review this ayah and continue.'
      if (this.guidedUiStep === 'recall') return 'Action now: recite from memory, then reveal to confirm.'
      if (this.isPlaying) return 'Action now: listen and follow the active ayah.'
      return 'Action now: press Play, then recite and repeat as needed.'
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
      if (this.tab === 'stats') return 'Stats'
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

    quizAccuracy() {
      if (!this.quizQueue.length) return 0
      return Math.round((this.quizScore / this.quizQueue.length) * 100)
    },

    nextActionDescription() {
      return 'Select a surah and verses to start memorising'
    }
  },

  async mounted() {
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
    this.loadBookmarksPins(),
      this.setupWordClickHandler()
    this.loadContinueSessionPrompt()
    this.updateMasteredWeekly()
    this.loadSavedSessions()

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
    tab(newVal) {
      if (!['tools', 'techniques', 'saved', 'settings'].includes(newVal)) {
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
    activeKey: 'persistSessionState',
    queueIndex: 'persistSessionState',
    playerVisible: 'persistAudioState',
    isPlaying: 'persistAudioState',
    currentTime: 'persistAudioState',
    flowStep: 'persistUiState',
    sectionOpen: { handler: 'persistUiState', deep: true },

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
    syncBodyScrollLock(locked) {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('tools-panel-open', !!locked)
      document.body.style.overflow = locked ? 'hidden' : ''
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

      const session = {
        id: Date.now().toString(),
        name: trimmedName,
        savedAt: new Date().toISOString(),
        config: {
          chapterId: this.chapterId,
          chapterName: this.currentChapter?.name_simple,
          rangeStart: this.rangeStart,
          rangeEnd: this.rangeEnd,
          reciterId: this.reciterId,
          speed: this.speed,
          playMode: this.playMode,
          chainingEnabled: this.chainingEnabled,
          chainingMethod: this.chainingMethod,
          chainingRepetitions: this.chainingRepetitions,
          tajweedEnabled: this.tajweedEnabled,
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord
        }
      }

      this.savedSessions.unshift(session)
      if (this.savedSessions.length > 20) this.savedSessions = this.savedSessions.slice(0, 20)
      this.persistSavedSessions()

      this.showBanner(`✓ Session "${session.name}" saved`, 'success', 2000)
      this.closeSaveModal()
    },
    toggleWordAudio() {
      this.wordByWordAudioEnabled = !this.wordByWordAudioEnabled
      this.persistUiState()
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
    },

    // Handle anchor count change dynamically
    onAnchorCountChange() {
      if (this.anchorModeEnabled) {
        this.applyAnchorHighlights()
        const anchorText = { 1: '1 anchor (center)', 2: '2 anchors (start+end)', 3: '3 anchors (strategic)' }
        this.showBanner(`Anchor Mode: Using ${anchorText[this.anchorCount]}`, 'info', 2000)
      }
    },

    // Main function to apply anchor highlights to all verses
    applyAnchorHighlights() {
      if (!this.anchorModeEnabled) return

      this.$nextTick(() => {
        const verseCards = document.querySelectorAll('.verse-card')
        verseCards.forEach(card => {
          this.highlightAnchorsForCard(card)
        })
      })

      
    },

    

    highlightAnchorsForCard(card) {
      if (!this.anchorModeEnabled) return

      // Get all word elements (supports both word-by-word modes)
      const arabicDiv = card.querySelector('.verse-arabic')
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
      const allWords = document.querySelectorAll('.wbw-word, word, .word-item')
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
            mutation.target.classList?.contains('verse-card')) {
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
    startSessionAndClose() {
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner('Please select a valid surah and ayah range first', 'info', 3600)
        return
      }
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

      const session = {
        id: Date.now().toString(),
        name: `${this.currentChapter?.name_simple || 'Session'} ${this.rangeStart}-${this.rangeEnd}`,
        savedAt: new Date().toISOString(),
        config: {
          chapterId: this.chapterId,
          chapterName: this.currentChapter?.name_simple,
          rangeStart: this.rangeStart,
          rangeEnd: this.rangeEnd,
          reciterId: this.reciterId,
          speed: this.speed,
          playMode: this.playMode,
          chainingEnabled: this.chainingEnabled,
          chainingMethod: this.chainingMethod,
          chainingRepetitions: this.chainingRepetitions,
          tajweedEnabled: this.tajweedEnabled,
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord
        }
      }

      this.savedSessions.unshift(session)
      if (this.savedSessions.length > 20) this.savedSessions = this.savedSessions.slice(0, 20)
      this.persistSavedSessions()
      this.showBanner('Session saved', 'success', 1500)
    },

    // Update loadSavedSession method
    loadSavedSession(sessionId) {
      const session = this.savedSessions.find(s => s.id === sessionId)
      if (!session) return

      // Apply session config
      this.chapterId = session.config.chapterId
      this.rangeStart = session.config.rangeStart
      this.rangeEnd = session.config.rangeEnd
      this.reciterId = session.config.reciterId
      this.speed = session.config.speed
      this.playMode = session.config.playMode
      this.chainingEnabled = session.config.chainingEnabled
      this.chainingMethod = session.config.chainingMethod
      this.chainingRepetitions = session.config.chainingRepetitions
      this.tajweedEnabled = session.config.tajweedEnabled
      this.showTranslation = session.config.showTranslation
      this.showTransliteration = session.config.showTransliteration
      this.showWordByWord = session.config.showWordByWord

      // Load verses and start session
      this.applyWorkspaceControls({ reason: 'load-session' })
      this.showTools = false
      this.showBanner(`Loaded: ${session.name}`, 'success', 2000)

      // Auto-start session
      this.$nextTick(() => {
        this.startSession()
      })
    },

    // Update deleteSavedSession method
    deleteSavedSession(sessionId) {
      if (confirm('Delete this saved session? This action cannot be undone.')) {
        this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId)
        this.persistSavedSessions()
        this.showBanner('Session deleted', 'info', 1500)
      }
    },

    performDeleteSavedSession(sessionId) {
      this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId)
      this.persistSavedSessions()
      this.showBanner('Session deleted', 'info', 1500)
    },

    persistSavedSessions() {
      try {
        localStorage.setItem('telawa.savedSessions', JSON.stringify(this.savedSessions))
      } catch (e) {
        console.error('Failed to save sessions:', e)
      }
    },

    loadSavedSessions() {
      try {
        const saved = localStorage.getItem('telawa.savedSessions')
        if (saved) {
          this.savedSessions = JSON.parse(saved)
        }
      } catch (e) {
        console.error('Failed to load saved sessions:', e)
        this.savedSessions = []
      }
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

    runConfirmAction() {
      const action = this.confirmModal.action
      this.closeConfirmModal()
      if (action === 'reset-session') this.performResetControls()
      if (action === 'switch-mode') this.performToggleMode()
      if (action === 'delete-offline' && this.pendingDeleteId) this.performDeleteOffline()
      if (action === 'discard-continue') this.clearContinueSession()
      if (action === 'delete-saved-session' && this.confirmModal.data?.sessionId)
        this.performDeleteSavedSession(this.confirmModal.data.sessionId)
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
    revealWordHint(word) {
      if (!word) return
      const hint = this.wordTooltip(word)
      this.showBanner(hint, 'info', 1200)
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
          const el = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
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
        tajweedEnabled: this.tajweedEnabled,
        quranFont: this.quranFont,
        fontScale: this.fontScale,
        script: this.script,
        showTranslation: this.showTranslation,
        showTransliteration: this.showTransliteration,
        showWordByWord: this.showWordByWord,
        wordByWordAudioEnabled: this.wordByWordAudioEnabled,
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
      this.currentMode = payload.mode || 'beginner'
      this.tab = payload.tab || this.currentMode
      const target = this.currentMode === 'beginner' ? 'beginner' : 'advanced'
      this[target] = {
        ...(target === 'beginner' ? createBeginnerState() : createAdvancedState()),
        ...this.cloneModeState(payload.config || {})
      }
      // Chaining removed.
      this.applySessionConfig(this.buildSessionConfig(this.currentMode))
      await this.loadChapter()
      this.buildQueue(this.currentMode)
      const store = this.getModeStore(this.currentMode)
      const canonicalIndex = Number.isFinite(Number(payload.mutqinSessionIndex)) ? Number(payload.mutqinSessionIndex) : null
      if (canonicalIndex !== null) moveMutqinSession(this.mutqinState, canonicalIndex)
      const canonicalItem = canonicalIndex !== null ? this.mutqinState.sessionState?.queue?.[canonicalIndex] : null
      const targetKey = payload.activeVerseKey || payload.activeKey || canonicalItem?.ayahId || null
      let restoredQueueIndex = Math.max(0, Number(payload.queueIndex || 0))
      if (targetKey) {
        const currentQueueKey = store.queue?.[restoredQueueIndex]?.verse?.key || store.queue?.[restoredQueueIndex]?.key
        if (currentQueueKey !== targetKey) {
          const exactIndex = store.queue?.findIndex(item => (item?.verse?.key || item?.key) === targetKey)
          if (exactIndex >= 0) restoredQueueIndex = exactIndex
        }
      }
      store.queueIndex = restoredQueueIndex
      const restoredKey = store.queue?.[restoredQueueIndex]?.verse?.key || store.queue?.[restoredQueueIndex]?.key || targetKey
      if (restoredKey) {
        this.setActiveVerse(restoredKey, { mode: this.currentMode, queueIndex: restoredQueueIndex, scroll: false })
      } else {
        this.syncActiveVerseState(this.currentMode, targetKey)
      }
      this.playerVisible = !!payload.playerVisible
      this.restoredAudioState = {
        src: payload.audioSrc || '',
        currentTime: Number(payload.currentTime || 0),
        playerVisible: !!payload.playerVisible,
        speed: Number(payload.config?.speed || this.speed || 1),
        isPlaying: !!payload.isPlaying
      }
      this.applyRestoredAudioState()
      // Advanced auto-open used to be driven by chaining/loop settings. Removed.
      this.persistAllState()
      this.showBanner('Session restored', 'success', 2200)
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

    openConfirmModal(options) {
      this.confirmModal = {
        title: options.title || 'Confirm action',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'default',
        action: options.action || ''
      }
      this.showPlannerModal = false
      this.showResumeModal = false
      this.showTools = false
      this.showConfirmModal = true
    },

    closeConfirmModal() {
      this.showConfirmModal = false
      this.confirmModal.action = ''
      this.pendingDeleteId = ''
    },

    runConfirmAction() {
      const action = this.confirmModal.action
      this.closeConfirmModal()
      if (action === 'reset-session') this.performResetControls()
      if (action === 'switch-mode') this.performToggleMode()
      if (action === 'delete-offline' && this.pendingDeleteId) this.performDeleteOffline()
      if (action === 'discard-continue') this.clearContinueSession()
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
      const validTabs = ['tools', 'techniques', 'saved', 'settings']
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
        this.tab = ['tools', 'techniques', 'saved', 'settings'].includes(this.centralSession.activeTab)
          ? this.centralSession.activeTab
          : 'tools'
        this.tajweedEnabled = !!this.centralSession.tajweedEnabled
        this.focusModeEnabled = !!this.centralSession.focusModeEnabled
        this.blurModeEnabled = !!this.centralSession.blurModeEnabled
        this.blurIntensity = Math.max(4, Math.min(18, Number(this.centralSession.blurIntensity || 10)))
        if (!uiChaining) {
          this.chainingEnabled = !!this.centralSession.chaining.enabled
          this.chainingMethod = ['linking', 'cumulative'].includes(this.centralSession.chaining.method) ? this.centralSession.chaining.method : 'linking'
          this.chainingRepetitions = Math.max(1, Math.min(5, Number(this.centralSession.chaining.repetitions || 1)))
        }
        this.speed = this.speedOptions.includes(Number(this.centralSession.audio.speed)) ? Number(this.centralSession.audio.speed) : this.speed
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
          activeTab: ['tools', 'techniques', 'saved', 'settings'].includes(this.tab) ? this.tab : 'tools',
          tajweedEnabled: !!this.tajweedEnabled,
          focusModeEnabled: !!this.focusModeEnabled,
          blurModeEnabled: !!this.blurModeEnabled,
          blurIntensity: Number(this.blurIntensity || 10),
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
        if (wordElement && this.wordByWordAudioEnabled) {
          const verseKey = wordElement.dataset.verseKey
          const wordIndex = parseInt(wordElement.dataset.wordIndex)
          const wordAudio = wordElement.dataset.wordAudio

          if (wordAudio) {
            this.playWordAudio(wordAudio)
          } else {
            // Find verse and play from this word position
            const verse = this.verses.find(v => v.key === verseKey)
            if (verse && verse.audio) {
              this.playVerse(verse)
            }
          }
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
      const size = this.verseFontSizes[verseKey] || this.defaultFontSize
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
          // Migrate old default of 150% down to 100% unless the user has explicitly set per-verse sizes.
          if (parsed === 150 && (!this.verseFontSizes || Object.keys(this.verseFontSizes).length === 0)) {
            this.defaultFontSize = 100
            localStorage.setItem('telawa.defaultFontSize', JSON.stringify(100))
          } else if (Number.isFinite(parsed) && parsed > 0) {
            this.defaultFontSize = parsed
          }
        } else {
          this.defaultFontSize = 100
          localStorage.setItem('telawa.defaultFontSize', JSON.stringify(100))
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
      if (this.wordByWordAudioEnabled) return this.splitArabicIntoWords(verse)
      if (this.tajweedEnabled && verse.arabic_tajweed) return this.normalizeTajweedMarkup(verse.arabic_tajweed)
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
      const tooltip = this.wordTooltip(wordData)
      const wordAudio = this.wordByWordAudioEnabled && wordData.audio
        ? `<button class="word-audio-btn" data-word-index="${idx}" data-word-audio="${this.escapeHtml(wordData.audio)}"><i class="bi bi-volume-up"></i></button>`
        : ''

      return `<word class="wbw-word${activeClass}${weakClass}${masteredClass}" data-word-index="${idx}" data-verse-key="${verse.key}" data-tooltip="${this.escapeHtml(tooltip)}" title="${this.escapeHtml(tooltip)}">${innerHtml}${wordAudio}</word>`
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
    wordTooltip(word) {
      const ar = String(word?.ar || '').trim()
      const en = String(word?.en || '').trim()
      if (ar && en) return `${ar} - ${en}`
      return ar || en || 'Word'
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
      if (this.segmentPlaybackTimer) {
        clearTimeout(this.segmentPlaybackTimer)
        this.segmentPlaybackTimer = null
      }
      this.segmentEndTime = 0

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
      this.stopWordHighlighting()
      if (this.playMode === 'auto') {
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
              audio: this.normalizeAudioUrl(ayah.audio || ayah.audioSecondary?.[0] || ''),
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
    wordTooltip(word) { return `${word.ar || ''} - ${word.en || ''}`.trim() || 'Word' },

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
      this.sessionStartedAt = Date.now()
      this.sessionErrorCount = 0
      this.statsTick = Date.now()

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
      this.centralSession.repetitionTimes = Math.max(0, Number(this.centralSession.repetitionTimes || 0)) + 1
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
      const themes = ['light', 'sepia', 'dark']
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
            this.tab = ['tools', 'techniques', 'saved', 'settings'].includes(state.tab) ? state.tab : 'tools'
            this.currentMode = state.currentMode || 'beginner'
            this.flowStep = ['learn', 'practice', 'recall'].includes(state.flowStep)
              ? state.flowStep
              : (state.flowStep === 'read' ? 'learn' : state.flowStep === 'listen' ? 'practice' : 'learn')
            this.flowListenPlays = Math.max(0, Number(state.flowListenPlays || 0))
            this.showTranslation = state.showTranslation ?? this.showTranslation
            this.showTransliteration = state.showTransliteration ?? this.showTransliteration
            this.showWordByWord = state.showWordByWord ?? this.showWordByWord
            this.wordByWordAudioEnabled = state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
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
            this.fontScale = state.fontScale ?? this.fontScale
            this.uiScale = Number(state.uiScale ?? this.uiScale)
            this.enScale = Number(state.enScale ?? this.enScale)
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
      try { this.savedSessions = JSON.parse(localStorage.getItem('telawa.savedSessions') || '[]') } catch { this.savedSessions = [] }
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

    playWordAudio(url) {
      if (!url) return
      new Audio(url).play().catch(() => { })
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
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tools-x:hover {
  background: var(--accent-light);
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
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 500;
  color: #374151;
}

.section-header i {
  font-size: 18px;
  color: #6b7280;
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
  background: #e5e7eb;
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
  color: #9ca3af;
}

.repetition-value {
  margin-top: 12px;
  font-size: 13px;
  color: #6b7280;
}

.repetition-value strong {
  color: #2c7a4d;
  font-weight: 600;
}

/* Select styles */
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  background-color: #fff;
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
  max-width: 520px;
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
  max-width: 420px;
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
.word-item.anchor-highlight:hover {
  background: rgba(255, 152, 0, 0.6);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.login-card {
  max-width: 480px;
  width: 100%;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 32px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  animation: loginFadeIn 0.5s ease-out;
}

.login-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 8px 24px rgba(154, 103, 56, 0.25);
}

.login-icon i {
  font-size: 2.5rem;
  color: white;
}

.login-card h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin-bottom: 32px;
}

.login-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.feature i {
  font-size: 1.5rem;
  color: var(--accent);
  background: var(--accent-light);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  transition: all 0.2s ease;
}

.feature span {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
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
@media (max-width: 520px) {
  .login-card {
    padding: 32px 24px;
  }

  .login-icon {
    width: 64px;
    height: 64px;
  }

  .login-icon i {
    font-size: 2rem;
  }

  .login-card h1 {
    font-size: 1.5rem;
  }

  .login-features {
    gap: 16px;
  }

  .feature i {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .feature span {
    font-size: 0.7rem;
  }
}

/* Save Name Modal Styles */
.save-name-modal {
  max-width: 420px;
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
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.saved-header p {
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 320px;
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
  font-size: 0.8rem;
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
  max-height: 320px;
  overflow-y: auto;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-item:hover {
  border-color: var(--accent);
  background: var(--accent-light);
  transform: translateX(2px);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text);
  margin-bottom: 6px;
}

.session-name i {
  color: var(--accent);
  font-size: 0.8rem;
}

.session-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.session-details span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
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
  height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85rem;
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
  max-height: 300px;
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
  gap: 6px;
  flex-shrink: 0;
}

.session-load-btn,
.session-delete-btn {
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
  overflow: hidden;
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
  z-index: 60;
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
  /* Still 0, but adjust internal spacing */
}

body.has-navbar .tools-top {
  padding-top: calc(18px + var(--navbar-height, 0px));
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
  z-index: 59;
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
  --verse-font-percent: 100;
  --verse-font-size: clamp(2rem, calc(var(--verse-font-percent, 120) * 0.02rem), 3.8rem);
  font-family: var(--font-ar);
  font-size: calc(var(--verse-font-size) * var(--ui-scale, 1));
  line-height: 2;
  text-align: right;
  direction: rtl;
  unicode-bidi: isolate;
  background: var(--bg-elevated);
  padding: 20px;
  border-radius: 16px;
  margin: 12px 0;
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
  min-height: 100vh;
  font-size: calc(16px * var(--ui-scale, 1));
  animation: appFade 260ms ease-out;
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

.verse-arabic.tajweed-enabled .tajweed-mark {
  display: inline;
  border-radius: 0.2em;
  padding: 0 0.03em;
}

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

.verse-arabic.tajweed-enabled .tajweed-qlq,
.verse-arabic.tajweed-enabled .tajweed-lqlq {
  color: #d98824;
  background: rgba(217, 136, 36, 0.12);
}

.verse-arabic.tajweed-enabled .tajweed-madda_normal,
.verse-arabic.tajweed-enabled .tajweed-madda_permissible,
.verse-arabic.tajweed-enabled .tajweed-madda_necessary,
.verse-arabic.tajweed-enabled .tajweed-madda_obligatory,
.verse-arabic.tajweed-enabled .tajweed-madda_pbligatory {
  color: #d55245;
  background: rgba(213, 82, 69, 0.10);
}

.verse-arabic.tajweed-enabled .tajweed-idgh_mus,
.verse-arabic.tajweed-enabled .tajweed-idghm_shfw,
.verse-arabic.tajweed-enabled .tajweed-idgh_shfw,
.verse-arabic.tajweed-enabled .tajweed-ghn+.tajweed-mark {
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
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(154, 103, 56, 0.24);
  background: rgba(255, 250, 243, 0.95);
  cursor: pointer;
  transition: all 0.18s ease;
}

.mode-radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.mode-radio-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid rgba(154, 103, 56, 0.52);
  background: rgba(255, 255, 255, 0.9);
  position: relative;
  flex: 0 0 auto;
  transition: all 0.18s ease;
}

.mode-radio-dot::after {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.18s ease;
}

.mode-radio.active {
  border-color: rgba(154, 103, 56, 0.38);
  background: rgba(248, 236, 222, 0.95);
}

.mode-radio.active .mode-radio-dot {
  border-color: rgba(154, 103, 56, 0.86);
}

.mode-radio.active .mode-radio-dot::after {
  background: rgba(154, 103, 56, 0.86);
}

.mode-radio:hover {
  border-color: rgba(154, 103, 56, 0.3);
  background: rgba(252, 244, 235, 0.95);
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
  --verse-font-percent: 100;
  --verse-font-size: clamp(1.5rem, calc(var(--verse-font-percent, 150) * 0.0175rem), 3.25rem);
  font-family: var(--font-ar);
  font-size: calc(var(--verse-font-size) * var(--ui-scale, 1));
  line-height: 1.8;
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
  margin-bottom: 16px;
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
  z-index: 60;
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
  z-index: 59;
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
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.7);
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease;
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
  width: 80%;
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
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 8px;
  align-items: start;
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
  margin-top: 0.4rem;
  font-size: 0.93em;
}

.verse-aid-title {
  margin-bottom: 4px;
  color: var(--accent-strong);
  font-size: 0.66rem;
  font-weight: 650;
  font-style: normal;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
  width: min(calc(100vw - 32px), 960px);
  max-width: 960px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(154, 103, 56, 0.12);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(63, 39, 18, 0.12);
  z-index: 1000;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Avoid iOS Safari compositing artifacts (black bands) from backdrop-filter on fixed elements. */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transition: transform 0.22s ease, opacity 0.22s ease, padding 0.22s ease;
}

.player-bar.collapsed {
  transform: translateX(-50%);
  opacity: 0.98;
}

.player-main {
  display: grid;
  grid-template-columns: minmax(150px, 1.1fr) auto minmax(200px, 0.95fr) minmax(180px, 1fr) auto;
  align-items: center;
  gap: clamp(10px, 1.6vw, 20px);
  min-width: 0;
}

.player-info {
  min-width: 0;
}

.player-chapter {
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-verse {
  font-size: 0.75rem;
  opacity: 0.7;
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
  width: 44px;
  height: 44px;
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
  width: 52px;
  height: 52px;
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
  gap: 12px;
  min-width: 0;
}

.player-time {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  min-width: 40px;
}

.player-progress-bg {
  flex: 1;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.player-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
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
  cursor: help;
  min-height: 36px;
}

.word-item:hover::after,
.word-item:focus::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  z-index: 5;
  width: max-content;
  max-width: 220px;
  padding: 6px 8px;
  border-radius: 9px;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  color: var(--text);
  direction: ltr;
  text-align: center;
  font-size: 0.72rem;
  line-height: 1.25;
}

.word-arabic {
  font-family: var(--font-ar);
  font-size: 0.9rem;
}

.word-meaning {
  color: var(--text-muted);
  font-size: calc(0.82rem * var(--en-scale, 1));
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
  padding-top: 80px;
  /* Adjust to match navbar height + spacing */
}

/* Mobile adjustment */
@media (max-width: 768px) {
  .banner {
    top: calc(env(safe-area-inset-top, 0px) + 60px);
    width: calc(100% - 32px);
    min-width: auto;
  }

  .main.container {
    padding-top: 70px;
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

/* Add this to your <style> */
.main.container {
  padding-top: 20px;
}

/* If you have a navbar, add this */
.app>.navbar+.main.container,
body>.navbar+.app .main.container {
  padding-top: 80px;
}

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
    padding: 16px 16px 100px;
  }

  .main.tools-open {
    padding-right: 16px;
  }

  .tools {
    left: 0;
    right: 0;
    width: 100%;
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
    display: grid;
    grid-template-columns: 1fr 1fr;
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
    width: calc(100% - 24px);
    bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    padding: 12px 14px;
  }

  .player-bar.collapsed {
    transform: translateX(-50%);
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
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 10px 10px;
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
  .session-quickstart-card {
    flex-direction: column;
    align-items: stretch;
  }

  .session-quickstart-actions {
    align-items: stretch;
  }
}
</style>
