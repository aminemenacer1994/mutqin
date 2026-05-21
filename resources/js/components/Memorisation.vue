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
        <section v-if="!hasVerses" class="home-dashboard home-dashboard-minimal">
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
            <button class="cta cta-primary setup-primary" @click="openToolsPanel()" title="Open controls">
              <i class="bi bi-sliders"></i> Open Session Controls
            </button>
            <p class="offcanvas-launcher-copy">
              Session setup lives in the offcanvas.
            </p>
          </div>
        </section>

        <!-- Floating Actions (replaces the session rail bar) -->
        <div v-if="currentChapter && hasVerses" class="workspace-fab" aria-label="Workspace actions">
          <div class="workspace-fab-meta">
            <div class="workspace-fab-kicker">{{ activeCardKicker }}</div>
            <div class="workspace-fab-title">{{ currentChapter.name_simple }}</div>
            <div class="workspace-fab-sub">
              <span>Ayah {{ currentPosition }}/{{ totalVerses }}</span>
              <span>{{ guidedPhaseLabel }}</span>
              <span>{{ activeRepeatLabel }}</span>
              <span v-if="etaLabel">{{ etaLabel }}</span>
            </div>
            <p class="workspace-fab-copy">{{ activeCardBody }}</p>
            <div class="workspace-fab-live">
              <span class="workspace-fab-live-pill">
                <i class="bi bi-link-45deg"></i>
                {{ chainingMethodLabel }}
              </span>
              <span class="workspace-fab-live-pill">
                <i class="bi bi-lightning-charge"></i>
                {{ playMode === 'auto' ? 'Auto advance' : 'Manual advance' }}
              </span>
            </div>
          </div>
          <div class="workspace-fab-actions">
            <button class="fab-btn fab-btn-soft" @click="markTakrarRepeat(activeVerseRef)"
              :disabled="!activeVerseRef || repeatActionLocked" title="Repeat current ayah">
              <i class="bi bi-arrow-repeat"></i><span>Repeat</span>
            </button>
            <button class="fab-btn fab-btn-ghost" @click="openAdvancedControls" title="Open session controls">
              <i class="bi bi-sliders"></i><span>Controls</span>
            </button>
            <button class="fab-btn fab-btn-primary" @click="handlePrimaryAction"
              :disabled="!isPlaying && !canStartSession">
              <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
              <span>{{ isPlaying ? 'Pause' : (guidedUiStep === 'review' ? 'Review' : 'Play') }}</span>
            </button>
          </div>
        </div>

        <!-- REMOVE the standalone beginner mode button if it exists elsewhere -->

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
          <main class="workspace-main" aria-label="Memorisation workspace">
            <div class="verses-grid">
              <div v-for="verse in verses" :key="verse.key" :data-verse-key="verse.key" class="verse-card" :class="{
                active: effectiveActiveVerseKey === verse.key,
                'serious-training': false,
                'blur-upcoming': blurModeEnabled && isVerseBlurred(verse.key)
              }" @click="onVerseCardClick(verse)" role="button" tabindex="0" @keydown.enter.prevent="onVerseCardClick(verse)">
                <div class="verse-header">
                  <div class="verse-badges">
                    <span class="verse-number">Ayah {{ verse.number }}</span>
                    <span v-if="effectiveActiveVerseKey === verse.key" class="verse-status-badge">Active Ayah</span>
                  </div>

                  <div v-if="effectiveActiveVerseKey === verse.key" class="verse-actions">
                    <button class="verse-play-btn" @click.stop="playVerse(verse)"
                      :title="activeVerseKey === verse.key && isPlaying ? 'Pause' : 'Play verse'">
                      <i class="bi"
                        :class="activeVerseKey === verse.key && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                    </button>
                  </div>
                </div>

                <div class="verse-arabic verse-arabic-primary" dir="rtl" v-if="verse.arabic && isDataReady"
                  v-html="getDisplayArabic(verse)" :class="{
                    'tajweed-enabled': tajweedEnabled,
                    'word-highlight-enabled': showWordByWord && wordByWordAudioEnabled && !tajweedEnabled
                  }" :style="{
                    '--verse-font-percent': getVerseFontSize(verse.key),
                    fontFamily: quranFontFamily
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
                  <div v-for="(word, wi) in verse.words" :key="wi" class="word-item" :title="wordTooltip(word)"
                    :data-tooltip="wordTooltip(word)" tabindex="0">
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
      <div v-if="showTools" class="tools-backdrop" @click="closeToolsPanel" aria-hidden="true"></div>
      <aside class="tools" :class="{ open: showTools }">
        <div class="tools-top">
          <div class="tools-topbar">
            <div class="tools-title">Controls</div>
            <button class="tools-x" @click="closeToolsPanel" aria-label="Close panel"><i
                class="bi bi-x-lg"></i></button>
          </div>
          <div class="tools-context">{{ contextLabel }}</div>
          <div class="tools-tabs" role="tablist" aria-label="Controls tabs">
            <button :class="{ active: tab === 'tools', 'active-tab': tab === 'tools' }" @click="tab = 'tools'"
              title="Session tools">
              <i class="bi bi-sliders"></i> Tools
            </button>
            <button :class="{ active: tab === 'stats', 'active-tab': tab === 'stats' }" @click="tab = 'stats'"
              title="Session stats">
              <i class="bi bi-grid-1x2"></i> Stats
            </button>
            <button :class="{ active: tab === 'settings', 'active-tab': tab === 'settings' }" @click="tab = 'settings'"
              title="Reading and display settings">
              <i class="bi bi-gear"></i> Settings
            </button>
          </div>
        </div>

        <div class="tools-body compact">
          <div v-if="tab === 'tools'" class="sheet">
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-book"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Session</span>
                    <span class="st-sub">Choose what you memorise</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-stack">
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
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_playback')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-mic"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Audio</span>
                    <span class="st-sub">Reciter and playback</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_playback }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_playback">
                <div class="field-stack">
                  <div class="field">
                    <label>Speed</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="0.75" v-model="speed"> 0.75x</label>
                      <label class="radio"><input type="radio" value="1" v-model="speed"> 1x</label>
                      <label class="radio"><input type="radio" value="1.25" v-model="speed"> 1.25x</label>
                      <label class="radio"><input type="radio" value="1.5" v-model="speed"> 1.5x</label>
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

            <section class="sheet-section tools-techniques-section">
              <button class="sheet-toggle" @click="toggleSection('memorisation_techniques')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-stars"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Memorisation Techniques</span>
                    <span class="st-sub">Optional focus, recall, and chaining aids</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.memorisation_techniques }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.memorisation_techniques">
                <div class="techniques-list">
                  <div class="technique-row">
                    <div class="technique-copy">
                      <label>Focus Mode</label>
                      <small>Reduces distractions around the active ayah.</small>
                    </div>
                    <button class="toggle-chip technique-toggle" :class="{ active: focusModeEnabled }"
                      @click="focusModeEnabled = !focusModeEnabled" type="button">
                      {{ focusModeEnabled ? 'On' : 'Off' }}
                    </button>
                  </div>

                  <div class="technique-row technique-row-stacked">
                    <div class="technique-row-main">
                      <div class="technique-copy">
                        <label>Blur Mode</label>
                        <small>Supports active recall through progressive concealment.</small>
                      </div>
                      <button class="toggle-chip technique-toggle" :class="{ active: blurModeEnabled }"
                        @click="blurModeEnabled = !blurModeEnabled" type="button">
                        {{ blurModeEnabled ? 'On' : 'Off' }}
                      </button>
                    </div>
                    <div v-if="blurModeEnabled" class="technique-control">
                      <span>Intensity</span>
                      <input type="range" min="4" max="18" step="1" v-model.number="blurIntensity"
                        class="input technique-range">
                      <span class="inline-setting-pill">{{ blurIntensity }}px</span>
                    </div>
                  </div>

                  <div class="technique-row technique-row-stacked">
                    <div class="technique-row-main">
                      <div class="technique-copy">
                        <label>Chaining</label>
                        <small>{{ chainingMethodDescription }}</small>
                      </div>
                      <button class="toggle-chip technique-toggle" :class="{ active: chainingEnabled }"
                        @click="chainingEnabled = !chainingEnabled" type="button">
                        {{ chainingEnabled ? 'On' : 'Off' }}
                      </button>
                    </div>
                    <div v-if="chainingEnabled" class="segmented-control segmented-control-compact" role="group"
                      aria-label="Chaining method">
                      <button type="button" :class="{ active: chainingMethod === 'linking' }"
                        @click="chainingMethod = 'linking'">
                        Linking Method
                      </button>
                      <button type="button" :class="{ active: chainingMethod === 'cumulative' }"
                        @click="chainingMethod = 'cumulative'">
                        Cumulative Method
                      </button>
                    </div>
                    <div v-if="chainingEnabled" class="technique-control">
                      <span>Repetition</span>
                      <input type="range" min="1" max="5" step="1" v-model.number="chainingRepetitions"
                        class="input technique-range">
                      <span class="inline-setting-pill">{{ chainingRepetitions }}x</span>
                    </div>
                    <div class="technique-preview">
                      <span>{{ chainingMethodPreview }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div v-else-if="tab === 'stats'" class="sheet">
            <div class="sheet-section" style="padding: 20px;">
              <h3 style="margin-top:0; font-size: 1.1rem; color: var(--accent);">Your Memorisation Stats</h3>
              <p class="analytics-help">These are device-local summaries. They do not change your memorisation flow.</p>
              <div class="analytics-grid">
                <div class="stat-card">
                  <i class="bi bi-book"></i>
                  <div class="stat-value">{{ analytics.totalVersesRead }}</div>
                  <div class="stat-label">Verses Read</div>
                  <div class="stat-help">Counts verses you played or reviewed in sessions.</div>
                  <div class="mini-trend" v-html="renderMiniTrend(analytics.weeklyVerses)"></div>
                </div>
                <div class="stat-card">
                  <i class="bi bi-clock-history"></i>
                  <div class="stat-value">{{ analytics.totalTimeSpent }}m</div>
                  <div class="stat-label">Time Spent</div>
                  <div class="stat-help">Approximate minutes with audio active.</div>
                  <div class="mini-trend" v-html="renderMiniTrend(analytics.weeklyMinutes)"></div>
                </div>
                <div class="stat-card">
                  <i class="bi bi-repeat"></i>
                  <div class="stat-value">{{ analytics.totalRepetitions }}</div>
                  <div class="stat-label">Repetitions</div>
                  <div class="stat-help">Total repeats across all sessions.</div>
                </div>
                <div class="stat-card">
                  <i class="bi bi-calendar-check"></i>
                  <div class="stat-value">{{ analytics.sessionsCompleted }}</div>
                  <div class="stat-label">Sessions</div>
                  <div class="stat-help">How many sessions you finished.</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="tab === 'settings'" class="sheet">
            <div class="sheet-section settings-section">
              <div class="settings-heading">
                <h3>Reading & Display</h3>
                <button class="tools-btn tools-btn-primary settings-apply" @click="applySettingsChanges">
                  <i class="bi bi-check2"></i><span>Apply</span>
                </button>
              </div>

              <div class="settings-list">
                <div class="settings-row">
                  <div class="settings-row-copy">
                    <label>Translation</label>
                    <small>English meaning</small>
                  </div>
                  <button class="toggle-chip settings-toggle" :class="{ active: settingsDraft.showTranslation }"
                    @click="settingsDraft.showTranslation = !settingsDraft.showTranslation">
                    {{ settingsDraft.showTranslation ? 'Enabled' : 'Disabled' }}
                  </button>
                </div>

                <div class="settings-row">
                  <div class="settings-row-copy">
                    <label>Transliteration</label>
                    <small>Latin reading aid</small>
                  </div>
                  <button class="toggle-chip settings-toggle" :class="{ active: settingsDraft.showTransliteration }"
                    @click="settingsDraft.showTransliteration = !settingsDraft.showTransliteration">
                    {{ settingsDraft.showTransliteration ? 'Enabled' : 'Disabled' }}
                  </button>
                </div>

                <div class="settings-row">
                  <div class="settings-row-copy">
                    <label>Word for word</label>
                    <small>Word chips</small>
                  </div>
                  <button class="toggle-chip settings-toggle" :class="{ active: settingsDraft.showWordByWord }"
                    @click="settingsDraft.showWordByWord = !settingsDraft.showWordByWord">
                    {{ settingsDraft.showWordByWord ? 'Enabled' : 'Disabled' }}
                  </button>
                </div>

                <div class="settings-row">
                  <div class="settings-row-copy">
                    <label>Word audio</label>
                    <small>Sync highlighting</small>
                  </div>
                  <button class="toggle-chip settings-toggle" :class="{ active: settingsDraft.wordByWordAudioEnabled }"
                    @click="settingsDraft.wordByWordAudioEnabled = !settingsDraft.wordByWordAudioEnabled">
                    {{ settingsDraft.wordByWordAudioEnabled ? 'Enabled' : 'Disabled' }}
                  </button>
                </div>

                <div class="settings-row settings-row-range">
                  <div class="settings-row-copy">
                    <label>Font size</label>
                    <span class="inline-setting-pill">{{ settingsDraft.defaultFontSize }}%</span>
                  </div>
                  <input type="range" min="80" max="140" step="5" v-model.number="settingsDraft.defaultFontSize"
                    class="input settings-range">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tools-footer">
          <button class="tools-btn tools-btn-primary tools-btn-start" @click="startSession"
            :disabled="!canStartSession">
            <i class="bi bi-play-fill"></i><span>Start memorising</span>
          </button>
          <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="resetControls"><i
              class="bi bi-arrow-counterclockwise"></i><span>Reset</span></button>
          <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="closeToolsPanel"><i
              class="bi bi-x-circle"></i><span>Close</span></button>
        </div>
      </aside>
    </div>

    <div v-else-if="appReady && !isLoggedIn" class="main container">
      <section class="home-dashboard">
        <div class="setup-start-card">
          <div class="setup-start-copy">
            <span class="setup-kicker">Login Required</span>
            <h2>Sign in to access your memorisation workspace</h2>
            <p>Your sessions, progress, and resume history sync after login.</p>
          </div>
          <a class="cta cta-primary setup-primary" href="/login">
            <i class="bi bi-box-arrow-in-right"></i> Login
          </a>
        </div>
      </section>
    </div>

    <!-- Planner Modal -->
    <div class="modal-overlay" v-if="showPlannerModal" @click.self="showPlannerModal = false">
      <div class="modal-content planner-modal">
        <div class="modal-header">
          <h2><i class="bi bi-calendar-plus"></i> Quick Planner</h2>
          <button class="btn-icon" @click="showPlannerModal = false"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="modal-body">
          <!-- Surah Selection -->
          <div class="planner-field">
            <label><i class="bi bi-book"></i> Target Surah</label>
            <select v-model="plannerConfig.surahId" class="planner-select" @change="updatePlannerSurah">
              <option v-for="ch in chapters" :key="ch.id" :value="ch.id">
                {{ ch.name_simple }} ({{ ch.verses_count }} verses)
              </option>
            </select>
            <small class="field-hint">Choose the surah you want to memorize</small>
          </div>

          <!-- Verses Per Day -->
          <div class="planner-field">
            <label><i class="bi bi-sun"></i> Verses per day</label>
            <div class="verses-per-day-control">
              <button class="quantity-btn" @click="adjustVersesPerDay(-1)" :disabled="plannerConfig.versesPerDay <= 1">
                <i class="bi bi-dash"></i>
              </button>
              <input type="number" v-model.number="plannerConfig.versesPerDay" class="planner-input" min="1"
                :max="plannerConfig.totalVersesInSurah" @change="validateVersesPerDay">
              <button class="quantity-btn" @click="adjustVersesPerDay(1)"
                :disabled="plannerConfig.versesPerDay >= plannerConfig.totalVersesInSurah">
                <i class="bi bi-plus"></i>
              </button>
            </div>
            <small class="field-hint">How many new verses you want to memorize daily</small>
          </div>

          <!-- Stats Grid -->
          <div class="planner-stats-grid">
            <!-- Days to Finish -->
            <div class="planner-stat-card">
              <div class="stat-icon"><i class="bi bi-calendar-week"></i></div>
              <div class="stat-content">
                <span class="stat-value">{{ plannerEstimatedDays }}</span>
                <span class="stat-label">Days to Finish</span>
              </div>
            </div>

            <!-- Daily Time -->
            <div class="planner-stat-card">
              <div class="stat-icon"><i class="bi bi-clock"></i></div>
              <div class="stat-content">
                <span class="stat-value">{{ plannerEstimatedTimePerDay }}m</span>
                <span class="stat-label">Daily Time</span>
              </div>
            </div>

            <!-- Total Verses -->
            <div class="planner-stat-card">
              <div class="stat-icon"><i class="bi bi-text-paragraph"></i></div>
              <div class="stat-content">
                <span class="stat-value">{{ plannerTotalVerses }}</span>
                <span class="stat-label">Total Verses</span>
              </div>
            </div>

            <!-- Completion Date -->
            <div class="planner-stat-card highlight">
              <div class="stat-icon"><i class="bi bi-calendar-check"></i></div>
              <div class="stat-content">
                <span class="stat-value">{{ plannerCompletionDateFormatted }}</span>
                <span class="stat-label">Est. completion date</span>
                <small class="stat-note">Based on verses/day and your past pace.</small>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="planner-progress" v-if="plannerConfig.totalVersesInSurah > 0">
            <div class="progress-info">
              <span>Progress breakdown</span>
              <span>{{ plannerConfig.versesPerDay }} / {{ plannerConfig.totalVersesInSurah }} verses/day</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill"
                :style="{ width: (plannerConfig.versesPerDay / plannerConfig.totalVersesInSurah * 100) + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showPlannerModal = false">Cancel</button>
          <button class="btn-primary" @click="submitPlanner">
            <i class="bi bi-play-fill"></i> Create Plan
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

    <!-- Resume Modal (Logged In) -->
    <div class="modal-overlay" v-if="showResumeModal && isLoggedIn && hasContinueSession"
      @click.self="showResumeModal = false">
      <div class="modal-content confirm-modal resume-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <h2>{{ resumeModalTitle }}</h2>
            <small class="resume-saved-at" v-if="resumeSavedAtLabel">Last saved at {{ resumeSavedAtLabel }}</small>
          </div>
          <button class="btn-icon" @click="showResumeModal = false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <p class="confirm-copy resume-copy">Pick up gently from where you paused. Everything is ready for a calm
            restart.</p>
          <p class="confirm-copy">{{ continueSessionMeta }}</p>
          <div class="resume-grid">
            <div class="pill">
              <i class="bi bi-book"></i>
              <span>Range: {{ continueSessionPayload?.config?.rangeStart }}-{{ continueSessionPayload?.config?.rangeEnd
              }}</span>
            </div>
            <div class="pill">
              <i class="bi bi-link-45deg"></i>
              <span>{{ continueSessionPayload?.config?.chainingEnabled === false ? 'Chaining off' :
                (continueSessionPayload?.config?.chainingMethod === 'cumulative' ? 'Cumulative chain' : 'Linking chain')
              }}</span>
            </div>
            <div class="pill">
              <i class="bi bi-stopwatch"></i>
              <span>Resume from ayah {{ continueSessionPayload?.activeVerseKey ?
                String(continueSessionPayload.activeVerseKey).split(':')[1] : continueSessionPayload?.config?.rangeStart
              }}</span>
            </div>
          </div>
          <div class="pill" style="margin-top: 10px; padding: 12px 14px;">
            <strong>Next:</strong> {{ resumeWhatNext }}
          </div>
          <div class="pill" style="margin-top: 10px; padding: 12px 14px;">
            <strong>Last results:</strong>
            <span style="display:block; margin-top:6px;">
              {{ analytics.sessionsCompleted }} sessions · {{ analytics.totalRepetitions }} repeats · {{
                analytics.currentStreak }} day streak
            </span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showResumeModal = false">Not now</button>
          <button class="btn-primary" @click="showResumeModal = false; continueLastSession()">
            <i class="bi bi-arrow-right-circle"></i> Go to session
          </button>
        </div>
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

          <div class="player-progress-wrap">
            <span class="player-time">{{ formatTime(currentTime) }}</span>
            <div class="player-progress-bg" @click="seek" ref="progress">
              <div class="player-progress-fill" :style="{ width: (currentTime / (duration || 1)) * 100 + '%' }"></div>
            </div>
            <span class="player-time">{{ formatTime(duration) }}</span>
          </div>

          <!-- ADD SPEED CONTROLS HERE -->
          <div class="player-speed-controls">
            <button class="speed-btn-mini" :class="{ active: speed === 0.75 }" @click="setPlaybackSpeed(0.75)">
              0.75x
            </button>
            <button class="speed-btn-mini" :class="{ active: speed === 1 }" @click="setPlaybackSpeed(1)">
              1x
            </button>
            <button class="speed-btn-mini" :class="{ active: speed === 1.25 }" @click="setPlaybackSpeed(1.25)">
              1.25x
            </button>
            <button class="speed-btn-mini" :class="{ active: speed === 1.5 }" @click="setPlaybackSpeed(1.5)">
              1.5x
            </button>
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
import { repeatAyah, hideAyah, completeTakrarStep, getTakrarStep } from '../composables/useTakrarLadder'
import { scoreRetention } from '../composables/useRetentionZones'

const MODE_STORAGE_KEYS = {
  beginner: 'telawa.mode.beginner',
  advanced: 'telawa.mode.advanced'
}

const SESSION_STORAGE_KEYS = {
  beginner: 'telawa.sessionState.beginner',
  advanced: 'telawa.sessionState.advanced'
}

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
      appReady: false,
      isBootstrapping: true,
      isDataReady: false,
      fontDropdownOpen: false,
      verseFontSizes: {},
      defaultFontSize: 100,
      fontSizeStep: 10,
      minFontSize: 80,
      maxFontSize: 250,
      tajweedEnabled: false,
      beginner: createBeginnerState(),
      advanced: createAdvancedState(),
      mutqinState: loadMutqinState(),
      unwatchMutqinState: null,
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
      currentPhraseIndex: -1,
      statsTick: Date.now(),
      sessionStartedAt: 0,
      sessionErrorCount: 0,
      advanceLocked: false,
      repeatActionLocked: false,
      playRequestLocked: false,

      // UI State
      currentMode: 'beginner',
      theme: 'light',
      tab: 'tools',
      showTools: false,
      focusModeEnabled: false,
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
      speedOptions: [0.5, 0.75, 1, 1.25, 1.5],
      delayOptions: [0, 0.5, 1, 2, 3, 5, 7, 10],
      rangeLoopDelay: 1,

      // Section open state - Expanded for consistency
      sectionOpen: {
        beginner_setup: true,
        beginner_audio: true,
        beginner_saved: false,
        advanced_setup: true,
        advanced_playback: true,
        advanced_practice: false,
        advanced_saved: false,
        session_tools: false,
        live_stats: false,
        analytics_overview: true,
        analytics_planner: true,
        analytics_weak: false,
        memorisation_techniques: false
      },

      // Audio event handlers
      audioTimeUpdate: null,
      audioEnded: null,
      audioError: null,
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
    isVerseBlurred() {
      return (verseKey) => {
        if (!this.blurModeEnabled) return false
        const activeKey = this.effectiveActiveVerseKey
        if (!activeKey) return false

        // Get the current active verse number
        const activeNumber = parseInt(activeKey.split(':')[1])
        const verseNumber = parseInt(verseKey.split(':')[1])

        // Blur upcoming verses (higher number than active)
        return verseNumber > activeNumber
      }
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
      return ''
    },
    appStyleVars() {
      return {
        '--ui-scale': this.uiScale,
        '--en-scale': this.enScale,
        '--recall-blur': `${this.blurIntensity}px`
      }
    },
    chainingMethodDescription() {
      if (!this.chainingEnabled) {
        return 'Play the selected ayahs in order without chaining.'
      }
      if (this.chainingMethod === 'cumulative') {
        return 'Build recall progressively across memorised ayahs.'
      }
      return 'Connect ayahs sequentially during memorisation.'
    },
    chainingMethodLabel() {
      if (!this.chainingEnabled) return `Chaining off · ${this.chainingRepetitions}x`
      const label = this.chainingMethod === 'cumulative' ? 'Cumulative chain' : 'Linking chain'
      return `${label} · ${this.chainingRepetitions}x`
    },
    chainingMethodPreview() {
      if (!this.chainingEnabled) {
        return `Flow: selected ayahs in order, ${this.chainingRepetitions}x each.`
      }
      return this.chainingMethod === 'cumulative'
        ? `Flow: 1, then 1-2, then 1-2-3 · ${this.chainingRepetitions}x.`
        : `Flow: current ayah, next ayah, then both together · ${this.chainingRepetitions}x.`
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

    activeRepeatLabel() {
      const entry = this.activeQueueEntry
      const current = Number(entry?.repeatCount || 1)
      const total = Number(entry?.totalRepeats || 1)
      const repeatLabel = total > 1 ? ` · ${current}/${total}` : ''
      if (entry?.phase === 'Linking') return `Linking ayahs${repeatLabel}`
      if (entry?.phase === 'Cumulative') return `Cumulative ${entry.sequencePosition || 1}/${entry.sequenceTotal || 1}${repeatLabel}`
      return total > 1 ? `Repeat ${current} of ${total}` : 'Single focused pass'
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
      return this.currentConfig.verses?.length > 0
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
        if (this.currentMode === 'beginner') this.beginner.speed = val
        else this.advanced.speed = val
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
      if (this.guidedPhaseLabel === 'Recall') return 'Reveal'
      if (this.guidedPhaseLabel === 'Review') return 'Continue'
      return 'Continue'
    },
    guidedInstruction() {
      if (this.guidedPhaseLabel === 'Learn') return 'Listen and follow the recitation.'
      if (this.guidedPhaseLabel === 'Practice') return 'Try reciting with the ayah still partially visible.'
      if (this.guidedPhaseLabel === 'Recall') return 'Recall before you reveal the ayah.'
      if (this.guidedPhaseLabel === 'Review') return 'Review the verses due now.'
      return 'Continue your session.'
    },

    activeCardKicker() {
      if (this.guidedUiStep === 'review') return 'Bismillah, time to refresh'
      if (this.isPlaying) return 'MashaAllah, keep the rhythm steady'
      return 'Bismillah, keep your heart with the ayah'
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
    this.unwatchMutqinState = watchMutqinState(this.mutqinState)
    this.loadVerseFontSizes()
    this.migrateLocalStorage()
    this.loadUiState()
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

    if (this.isLoggedIn && this.hasContinueSession) {
      // One clear entry point for returning users.
      this.showResumeModal = true
    }


    if (this.currentMode === 'advanced' && this.advanced.chapterId) {
      this.currentMode = 'advanced'
      this.tab = 'tools'
      await this.loadVerses()
    } else if (this.beginner.chapterId) {
      this.currentMode = 'beginner'
      this.tab = 'tools'
      await this.loadVerses()
    } else {
      this.tab = 'tools'
      this.showTools = true
    }

    this.isBootstrapping = false
    this.appReady = true

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('beforeunload', this.persistAllState)
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true })
    document.addEventListener('click', this.handleClickOutside)
    this.statsInterval = window.setInterval(() => {
      this.statsTick = Date.now()
    }, 250)
  },

  beforeUnmount() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('beforeunload', this.persistAllState)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener('scroll', this.handleWindowScroll)
    if (this.bannerTimer) clearTimeout(this.bannerTimer)
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
    showTools: 'persistUiState',
    tab: 'persistUiState',
    chapterId(val) {
      this.persistUiState()
      const id = Number(val || 0)
      this.currentChapter = id ? (this.chapters.find(c => Number(c.id) === id) || null) : null
    },
    rangeStart: 'persistUiState',
    rangeEnd: 'persistUiState',
    reciterId: 'persistUiState',
    speed: 'persistUiState',
    delay: 'persistUiState',
    playMode: 'persistUiState',
    order: 'persistUiState',
    chainingEnabled() {
      this.persistUiState()
      this.rebuildQueue(this.currentMode)
    },
    chainingMethod() {
      this.persistUiState()
      this.rebuildQueue(this.currentMode)
    },
    chainingRepetitions(newVal) {
      const safeValue = Math.max(1, Math.min(5, Number(newVal || 1)))
      if (safeValue !== Number(this.chainingRepetitions)) this.chainingRepetitions = safeValue
      this.persistUiState()
      this.rebuildQueue(this.currentMode)
    },
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
    },

    activeVerseKey(newVal) {
      this.persistSessionState()
      if (this.showWordByWord) this.restoreWordScroll(newVal)
    },

    tab(newVal) {
      // Unified tools tab: keep mode stable unless explicitly switched by controls.
      this.persistUiState()
    }
  },

  methods: {
    focusLinkedAyah(verseKey, options = {}) {
      if (!verseKey) return null
      return this.setActiveVerse(verseKey, options)
    },

    openToolsPanel(options = {}) {
      const { verseKey = null, mode = this.currentMode, scroll = false } = options
      this.currentMode = mode
      this.tab = 'tools'
      if (verseKey) this.focusLinkedAyah(verseKey, { mode, scroll })
      this.showPlannerModal = false
      this.showConfirmModal = false
      this.showResumeModal = false
      this.showTools = true
      this.persistUiState()
    },

    closeToolsPanel() {
      this.showTools = false
      this.persistUiState()
    },

    openAdvancedControls() {
      // Keep power features accessible, but behind a tertiary surface.
      this.openToolsPanel()
    },

    onVerseCardClick(verse) {
      if (!verse?.key) return
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
        tajweedEnabled: !!config.tajweedEnabled
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
        console.error(e)
        return this.cloneModeState(defaults)
      }
    },

    persistModeState(mode) {
      const source = mode === 'beginner' ? this.beginner : this.advanced
      try {
        localStorage.setItem(MODE_STORAGE_KEYS[mode], JSON.stringify(this.cloneModeState(source)))
      } catch (e) { console.error(e) }
    },

    isEditableElement(target) {
      if (!target) return false
      const tag = target.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
    },

    handleGlobalKeydown(event) {
      if (!this.appReady || this.isEditableElement(event.target)) return

      if (event.key === 'Escape') {
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
      this.syncActiveVerseState(this.currentMode, targetKey)
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
      this.speed = newSpeed
      if (this.audioElement) {
        this.audioElement.playbackRate = newSpeed
      }
      this.persistUiState()
      this.showBanner(`Speed changed to ${newSpeed}x`, 'info', 1000)
    },
    // Open mode settings in offcanvas
    openModeSettings() {
      this.openToolsPanel()
    },

    // Alternative: Direct mode toggle with confirmation
    toggleMode() {
      const newMode = this.currentMode === 'beginner' ? 'advanced' : 'beginner'
      this.openConfirmModal({
        title: `Switch to ${newMode === 'beginner' ? 'Beginner' : 'Advanced'} mode?`,
        message: 'Your current settings will be preserved.',
        confirmLabel: 'Switch',
        action: 'switch-mode'
      })
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
    toggleTajweed() {
      this.tajweedEnabled = !this.tajweedEnabled
      // Force re-render of verses to apply tajweed colors
      this.$forceUpdate()
      // Save to localStorage immediately
      this.persistUiState()
      this.showBanner(
        this.tajweedEnabled ? 'Tajweed colors enabled' : 'Tajweed colors disabled',
        'info',
        1500
      )
    },
    updatePlannerSurah() {
      const selectedSurah = this.chapters.find(c => c.id === this.plannerConfig.surahId)
      if (selectedSurah) {
        this.plannerConfig.totalVersesInSurah = selectedSurah.verses_count
        // Reset versesPerDay if it exceeds total verses
        if (this.plannerConfig.versesPerDay > this.plannerConfig.totalVersesInSurah) {
          this.plannerConfig.versesPerDay = this.plannerConfig.totalVersesInSurah
        }
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

    // Font size management
    getVerseFontSize(verseKey) {
      return this.verseFontSizes[verseKey] || this.defaultFontSize
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
      if (!verse || !verse.arabic) return ''

      if (!this.isDataReady) {
        return verse.arabic
      }

      // When word highlighting is enabled (with or without Tajweed)
      if (this.showWordByWord && this.wordByWordAudioEnabled) {
        if (this.tajweedEnabled && verse.arabic_tajweed) {
          // For Tajweed, we need to preserve Tajweed spans while wrapping words
          return this.wrapTajweedWithWordHighlighting(verse)
        } else {
          // Regular word highlighting without Tajweed
          return this.splitArabicIntoWords(verse)
        }
      }

      // Tajweed only (no word highlighting)
      if (this.tajweedEnabled) {
        if (verse.arabic_tajweed) {
          return this.normalizeTajweedMarkup(verse.arabic_tajweed)
        }
        return verse.arabic
      }

      return verse.arabic
    },

    wrapTajweedWithWordHighlighting(verse) {
      if (!verse.arabic_tajweed) return verse.arabic || ''

      // First normalize the Tajweed markup
      let tajweedHtml = this.normalizeTajweedMarkup(verse.arabic_tajweed)

      // Get the plain words for tokenization
      let words = []
      if (verse.words && verse.words.length) {
        words = verse.words.map(w => w.ar || '').filter(Boolean)
      } else {
        words = tokenizeArabicText(verse.arabic)
      }

      if (!words.length) return tajweedHtml

      // For each word, wrap it with word highlighting while preserving internal Tajweed spans
      let result = tajweedHtml
      let processedWords = 0

      // Use a safer approach - match text nodes that contain the words
      // Create a temporary div to parse and manipulate
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = tajweedHtml

      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            // Only accept text nodes that are not inside already wrapped words
            if (node.parentElement && node.parentElement.classList &&
              (node.parentElement.classList.contains('wbw-word') ||
                node.parentElement.classList.contains('tajweed-mark'))) {
              return NodeFilter.FILTER_SKIP
            }
            return NodeFilter.FILTER_ACCEPT
          }
        }
      )

      const textNodes = []
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode)
      }

      // Process each text node to wrap words
      textNodes.forEach(textNode => {
        let text = textNode.textContent
        let newHtml = ''
        let lastIndex = 0

        words.forEach((word, idx) => {
          const wordIndex = text.indexOf(word, lastIndex)
          if (wordIndex !== -1) {
            // Add text before the word
            if (wordIndex > lastIndex) {
              newHtml += text.substring(lastIndex, wordIndex)
            }
            // Wrap the word
            newHtml += `<word class="wbw-word" data-word-index="${idx}" data-verse-key="${verse.key}">${word}</word>`
            lastIndex = wordIndex + word.length
            processedWords++
          }
        })

        // Add remaining text
        if (lastIndex < text.length) {
          newHtml += text.substring(lastIndex)
        }

        if (newHtml) {
          const span = document.createElement('span')
          span.innerHTML = newHtml
          textNode.parentNode.replaceChild(span, textNode)
          // Move children to fragment
          while (span.firstChild) {
            textNode.parentNode.insertBefore(span.firstChild, span)
          }
          textNode.parentNode.removeChild(span)
        }
      })

      return tempDiv.innerHTML
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

    // Arabic text word splitting and highlighting
    getHighlightedArabic(verse) {
      if (!verse || !verse.arabic) return ''
      if (!this.wordByWordAudioEnabled) return verse.arabic

      const highlightedHtml = this.splitArabicIntoWords(verse.arabic, verse.key)
      return highlightedHtml
    },

    splitArabicIntoWords(verse) {
      if (!verse || !verse.arabic) return ''

      // Get words from the verse object or tokenize
      let words = []
      if (verse.words && verse.words.length) {
        words = verse.words.map(w => w.ar || '').filter(Boolean)
      } else {
        words = tokenizeArabicText(verse.arabic)
      }

      if (!words.length) return verse.arabic

      let html = ''
      words.forEach((word, idx) => {
        const escapedWord = escapeHtml(word)
        html += `<word class="wbw-word" data-word-index="${idx}" data-verse-key="${verse.key}" title="Word ${idx + 1}">${escapedWord}</word> `
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

      // Adjust for playback speed
      safeDuration = safeDuration / (this.speed || 1)

      const cacheKey = `${verse.key}_${this.reciterId}_${Math.round(safeDuration * 10)}_${this.speed}`

      if (this.wordTimestampsMap.has(cacheKey)) {
        return this.wordTimestampsMap.get(cacheKey)
      }

      // Create timestamps based on character count (more accurate than equal distribution)
      const timestamps = []
      const charCounts = sourceWords.map(word => {
        // Count Arabic characters (excluding diacritics and HTML)
        const cleanWord = word.replace(/<[^>]+>/g, '').replace(/[^\u0621-\u064A]/g, '')
        return Math.max(1, cleanWord.length)
      })

      const totalChars = charCounts.reduce((sum, count) => sum + count, 0)
      let currentTime = 0

      for (let i = 0; i < sourceWords.length; i++) {
        // Words at the beginning get slightly more time for better pacing
        const weight = i === 0 ? 1.2 : 1.0
        const wordDuration = i === sourceWords.length - 1
          ? Math.max(0.3, safeDuration - currentTime)
          : Math.max(0.3, (charCounts[i] / totalChars) * safeDuration * weight)

        timestamps.push({
          index: i,
          start: currentTime,
          end: currentTime + wordDuration
        })
        currentTime += wordDuration
      }

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
      return baseDuration / (this.speed || 1)
    },

    async startWordHighlighting(verse) {
      if (this.wordHighlightLoading) return
      if (!verse || !verse.key) return

      // Allow highlighting even when tajweed is enabled
      if (!this.showWordByWord || !this.wordByWordAudioEnabled) {
        return
      }

      this.stopWordHighlighting()
      this.wordHighlightLoading = true
      this.currentHighlightedVerseKey = verse.key
      this.currentWordIndex = -1
      this.currentPhraseIndex = -1

      // Get word timings regardless of tajweed setting
      const duration = Number(this.audioElement?.duration) || null
      const timestamps = await this.getWordTimings(verse, duration)
      this.wordHighlightLoading = false

      if (!timestamps || !timestamps.length) return
      this.wordHighlightTimestamps = timestamps

      const updateHighlight = () => {
        if (!this.audioElement || this.audioElement.paused || this.audioElement.ended) return
        this.syncWordHighlightFromAudio(verse)
        this.wordHighlightFrame = window.requestAnimationFrame(updateHighlight)
      }

      this.wordHighlightHandler = updateHighlight
      updateHighlight()
    },

    wordTooltip(word) {
      const ar = String(word?.ar || '').trim()
      const en = String(word?.en || '').trim()
      if (ar && en) return `${ar} - ${en}`
      return ar || en || 'Word'
    },

    updateWordHighlight(verseKey, activeIndex) {
      if (activeIndex === -1) return

      this.$nextTick(() => {
        const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
        if (!verseCard) return

        const wordsWrap = verseCard.querySelector('.verse-words')

        // Find all word elements (both regular and Tajweed-wrapped)
        const allWordElements = verseCard.querySelectorAll('.verse-arabic .wbw-word, .verse-arabic word[data-word-index]')

        allWordElements.forEach(word => {
          const wordIndex = parseInt(word.getAttribute('data-word-index'))
          if (wordIndex === activeIndex) {
            word.classList.add('highlighted')
            word.classList.add('phrase-highlighted')

            // Auto-scroll for better visibility
            if (this.wordByWordAudioEnabled && wordsWrap) {
              const rect = word.getBoundingClientRect()
              const parentRect = wordsWrap.getBoundingClientRect()
              const isOutOfView = rect.right > parentRect.right || rect.left < parentRect.left

              if (isOutOfView) {
                word.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
              }
            }
          } else {
            word.classList.remove('highlighted')
            word.classList.remove('phrase-highlighted')
          }
        })

        // Also update phrase words if they exist
        const phraseWords = verseCard.querySelectorAll('.verse-words .word-item')
        phraseWords.forEach((word, idx) => {
          word.classList.toggle('highlighted', idx === activeIndex)
          word.classList.toggle('phrase-highlighted', idx === activeIndex)
        })

        this.currentPhraseIndex = activeIndex
      })
    },

    syncWordHighlightFromAudio(verse = this.activeVerseRef) {
      if (!verse || !verse.key || this.currentHighlightedVerseKey !== verse.key || !this.wordHighlightTimestamps?.length || !this.audioElement) return

      const currentTime = Number(this.audioElement.currentTime || 0)
      const active = this.wordHighlightTimestamps.find(item => currentTime >= item.start && currentTime <= item.end)
      const activeIndex = active ? active.index : -1

      // Only update if the index actually changed
      if (this.currentWordIndex !== activeIndex) {
        this.currentWordIndex = activeIndex
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
      if (activeWordIndex === -1) return

      this.$nextTick(() => {
        // Find the verse card
        const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
        if (!verseCard) return

        // Remove highlight from all words in this verse
        const allWords = verseCard.querySelectorAll(`.verse-arabic word[data-verse="${verseKey}"]`)
        allWords.forEach(word => {
          word.classList.remove('highlighted')
        })

        // Add highlight to the active word
        const activeWord = verseCard.querySelector(`.verse-arabic word[data-verse="${verseKey}"][data-word-index="${activeWordIndex}"]`)
        if (activeWord) {
          activeWord.classList.add('highlighted')

          // Scroll into view if needed
          if (this.wordByWordAudioEnabled && this.isPlaying) {
            activeWord.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            })
          }
        }
      })
    },

    stopWordHighlighting() {
      if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
      this.wordHighlightFrame = null
      this.wordHighlightHandler = null
      this.wordHighlightLoading = false
      this.currentWordIndex = -1
      this.currentPhraseIndex = -1
      this.currentHighlightedVerseKey = null
      this.wordHighlightTimestamps = []

      document.querySelectorAll('.verse-arabic word.highlighted, .verse-arabic .wbw-word.highlighted, .verse-arabic .wbw-word.phrase-highlighted, .verse-words .word-item.phrase-highlighted').forEach(word => {
        word.classList.remove('highlighted')
        word.classList.remove('phrase-highlighted')
      })
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

      this.audioTimeUpdate = () => {
        this.currentTime = this.audioElement.currentTime
        this.duration = this.audioElement.duration
        if (this.showWordByWord && this.wordByWordAudioEnabled) {
          const verse = this.activeVerseRef
          if (verse && verse.key) {
            if (this.currentHighlightedVerseKey !== verse.key && !this.wordHighlightLoading) {
              this.startWordHighlighting(verse)
            } else if (!this.wordHighlightLoading) {
              this.syncWordHighlightFromAudio(verse)
            }
          }
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
        if (this.playMode === 'auto') {
          window.setTimeout(() => {
            this.advanceLocked = false
            this.next()
          }, Math.max(0, Number(this.delay || 0)) * 1000)
        } else {
          this.advanceLocked = false
        }
      }

      this.audioSeeking = () => {
        // Prevent stale highlight when the user scrubs.
        this.currentWordIndex = -1
        this.updateWordHighlight(this.currentHighlightedVerseKey, -1)
      }

      this.audioSeeked = () => {
        const verse = this.activeVerseRef
        if (!verse) return
        if (this.showWordByWord && this.wordByWordAudioEnabled && !this.audioElement?.paused) {
          this.startWordHighlighting(verse)
        }
      }

      this.audioPaused = () => {
        // Ensure state is consistent even if pause is triggered outside our toggle handler.
        this.isPlaying = false
        if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
        this.wordHighlightFrame = null
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
    },

    async playVerse(verse, options = {}) {
      if (this.playRequestLocked && !options.force) return
      this.playRequestLocked = true
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

      // Only toggle if both the verse key and actual audio source already match.
      if (!options.force && this.activeKey === verse.key && currentSrc && currentSrc === audioUrl) {
        this.togglePlay()
        this.playRequestLocked = false
        return
      }

      // Stop current playback and highlighting
      this.stopWordHighlighting()
      if (this.audioElement) {
        try { this.audioElement.pause() } catch (e) { }
      }

      this.setActiveVerse(verse.key, { scroll: false })

      if (!this.audioElement) {
        this.audioElement = this.$refs.audio
        if (!this.audioElement) {
          this.showBanner('Audio system not ready', 'error', 3000)
          this.playRequestLocked = false
          return
        }
        this.initAudio()
      }

      this.audioElement.src = audioUrl
      this.audioElement.load()
      this.playerVisible = true

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 10000)

        const canPlayHandler = async () => {
          clearTimeout(timeout)
          this.audioElement.playbackRate = this.speed

          try {
            await this.audioElement.play()
            this.isPlaying = true
            this.markPlaybackStart()
            this.addActivityEvent({ ts: Date.now(), type: 'play', verseKey: verse.key })
            this.recomputeAnalytics()

            // Start word highlighting AFTER audio starts playing
            if (this.showWordByWord && this.wordByWordAudioEnabled) {
              this.startWordHighlighting(verse)
            }
            this.playRequestLocked = false
            resolve()
          } catch (err) {
            this.isPlaying = false
            this.playRequestLocked = false
            reject(err)
          }
          this.audioElement.removeEventListener('canplay', canPlayHandler)
        }

        const errorHandler = (err) => {
          clearTimeout(timeout)
          this.isPlaying = false
          this.playRequestLocked = false
          reject(err)
          this.audioElement.removeEventListener('error', errorHandler)
        }

        this.audioElement.addEventListener('canplay', canPlayHandler)
        this.audioElement.addEventListener('error', errorHandler, { once: true })
      }).catch(err => {
        console.error('playVerse failed:', err)
        this.isPlaying = false
        this.playRequestLocked = false
        this.showBanner('Failed to play audio', 'error', 3000)
      })
    },

    togglePlay() {
      if (!this.audioElement?.src) return
      if (this.audioElement.paused) {
        this.audioElement.play().then(() => {
          this.isPlaying = true
          const verse = this.activeVerseRef
          if (verse && this.showWordByWord && this.wordByWordAudioEnabled) this.startWordHighlighting(verse)
        }).catch(() => { })
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
        this.recomputeAnalytics()
        const entry = this.queue[this.queueIndex]
        const verseKey = entry?.verse?.key || entry?.key
        if (verseKey) {
          this.setActiveVerse(verseKey)
          this.$nextTick(() => this.$forceUpdate())
        }
        const v = this.queue[this.queueIndex]
        if (v) {
          const verse = v.verse || v
          this.playVerse(verse, { force: true }).finally(() => {
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
      this.recomputeAnalytics()
      const entry = this.queue[this.queueIndex]
      const verseKey = entry?.verse?.key || entry?.key
      if (verseKey) {
        this.setActiveVerse(verseKey, { scroll: false })
        this.$nextTick(() => this.$forceUpdate())
      }
      const v = this.queue[this.queueIndex]
      if (v) {
        const verse = v.verse || v
        this.playVerse(verse, { force: true }).finally(() => {
          this.advanceLocked = false
        })
      } else {
        this.advanceLocked = false
      }
    },

    closePlayer() {
      this.flushPlaybackTime()
      this.stopWordHighlighting()
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
            const arabic = arabicByNumber.get(ayah.numberInSurah) || ayah.text || ''
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
              arabic_tajweed: tajweedByNumber.get(ayah.numberInSurah) || '',
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

      const repetitions = Math.max(1, Math.min(5, Number(this.chainingRepetitions || 1)))
      const pushQueueEntry = entry => {
        for (let repeatIndex = 1; repeatIndex <= repetitions; repeatIndex++) {
          q.push({
            ...entry,
            repeatCount: repeatIndex,
            totalRepeats: repetitions
          })
        }
      }

      if (!this.chainingEnabled) {
        verses.forEach(verse => {
          pushQueueEntry({
            verse,
            phase: 'Memorise'
          })
        })
      } else if (this.chainingMethod === 'cumulative') {
        verses.forEach((_, endIndex) => {
          const chain = verses.slice(0, endIndex + 1)
          chain.forEach((verse, chainIndex) => {
            pushQueueEntry({
              verse,
              phase: 'Cumulative',
              chainKey: `cumulative:${endIndex + 1}`,
              sequencePosition: chainIndex + 1,
              sequenceTotal: chain.length
            })
          })
        })
      } else {
        verses.forEach((verse, index) => {
          pushQueueEntry({
            verse,
            phase: 'Memorise'
          })
          if (index > 0) {
            pushQueueEntry({
              verse: verses[index - 1],
              phase: 'Linking',
              chainKey: `link:${verses[index - 1].key}:${verse.key}`,
              sequencePosition: 1,
              sequenceTotal: 2
            })
            pushQueueEntry({
              verse,
              phase: 'Linking',
              chainKey: `link:${verses[index - 1].key}:${verse.key}`,
              sequencePosition: 2,
              sequenceTotal: 2
            })
          }
        })
      }

      let previousQueueIndex = Math.min(safePreviousQueueIndex, Math.max(q.length - 1, 0))
      if (previousEntryKey) {
        const exactIndex = q.findIndex(item =>
          (item?.verse?.key || item?.key) === previousEntryKey &&
          item.phase === previousEntry?.phase &&
          item.chainKey === previousEntry?.chainKey &&
          Number(item.sequencePosition || 1) === Number(previousEntry?.sequencePosition || 1) &&
          Number(item.repeatCount || 1) === Number(previousEntry?.repeatCount || 1)
        )
        if (exactIndex >= 0) previousQueueIndex = exactIndex
        else {
          const firstIndex = q.findIndex(item => (item?.verse?.key || item?.key) === previousEntryKey)
          if (firstIndex >= 0) previousQueueIndex = firstIndex
        }
      }

      if (mode === this.currentMode) {
        this.queue = q
        this.queueIndex = previousQueueIndex
      }

      // Save to current mode
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

    async startSession() {
      const config = this.sessionConfig
      const mode = config.mode || this.currentMode

      if (!config.chapterId || config.chapterId === 0) {
        this.showTools = true
        this.showBanner('Please select a surah first', 'info', 3600, { key: 'open-setup', label: 'Open setup' })
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

      // Initialize audio
      if (!this.audioElement) {
        this.initAudio()
      }

      // Build queue with current settings
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
      const canonicalItem = sessionState?.queue?.[canonicalIndex]
      let playbackIndex = canonicalIndex > 0
        ? Math.min(canonicalIndex - 1, builtQueue.length - 1)
        : 0
      const canonicalKey = canonicalItem?.ayahId || canonicalItem?.verse?.key
      if (canonicalKey && (builtQueue[playbackIndex]?.verse?.key || builtQueue[playbackIndex]?.key) !== canonicalKey) {
        const exactIndex = builtQueue.findIndex(entry => (entry?.verse?.key || entry?.key) === canonicalKey)
        if (exactIndex >= 0) playbackIndex = exactIndex
      }

      this.queueIndex = playbackIndex
      this.getModeStore(mode).queueIndex = playbackIndex
      const nextCanonicalIndex = canonicalIndex > 0 ? canonicalIndex : 1
      moveMutqinSession(this.mutqinState, nextCanonicalIndex)
      const first = builtQueue[playbackIndex]

      if (first && first.verse) {
        this.syncActiveVerseState(mode, first.verse.key)
        await this.$nextTick()

        // Apply speed before playing
        if (this.audioElement) {
          this.audioElement.playbackRate = this.speed
        }

        await this.playVerse(first.verse, { force: true })
      }

      // Close the offcanvas panel
      this.showTools = false

      // Show confirmation banner
      this.flowStep = 'learn'
      this.showBanner(`Session started with ${builtQueue.length} guided repetitions`, 'success', 2000)
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
      if (Number.isFinite(explicitDuration) && explicitDuration > 0) return explicitDuration / speedFactor
      const arabicLength = String(verse.arabic || verse.text || '').replace(/[^ء-ي]/g, '').length || 80
      return Math.max(5, Math.min(45, arabicLength * 0.12)) / speedFactor
    },

    showBanner(message, kind = 'info', ttlMs = 3500, action = null) {
      if (this.bannerTimer) clearTimeout(this.bannerTimer)
      this.banner = { message, kind, at: Date.now(), actionKey: action?.key || '', actionLabel: action?.label || '' }
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

    markTakrarRepeat(verse) {
      if (this.repeatActionLocked || !verse) return
      this.repeatActionLocked = true
      this.syncMutqinAyahs([verse])
      repeatAyah(this.mutqinState, verse.key)
      const index = Math.max(0, Number(this.queueIndex || 0))
      const currentEntry = this.queue?.[index]
      if (currentEntry) {
        const inserted = {
          ...currentEntry,
          repeatCount: Number(currentEntry.repeatCount || 1) + 1,
          totalRepeats: Math.max(
            Number(currentEntry.totalRepeats || 1),
            Number(currentEntry.repeatCount || 1) + 1
          )
        }
        const nextQueue = [...this.queue]
        nextQueue.splice(index + 1, 0, inserted)
        this.queue = nextQueue
        const modeStore = this.getModeStore(this.currentMode)
        modeStore.queue = nextQueue
      }
      if (verse?.audio) this.playVerse(verse, { force: true })
      this.recomputeAnalytics()
      this.persistAllState()
      window.setTimeout(() => {
        this.repeatActionLocked = false
      }, 450)
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
      this.recomputeAnalytics()
      this.showBanner(score === 'Forgot' ? 'Marked for review' : 'Progress saved', score === 'Forgot' ? 'info' : 'success', 1400)
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

    handleSessionComplete() {
      if (!this.verses.length) return
      this.sessionCompleted = true
      completeMutqinSession(this.mutqinState)
      this.addActivityEvent({ ts: Date.now(), type: 'session_complete' })
      this.recomputeAnalytics()
      this.showBanner('Session complete', 'success', 6500, { key: 'restart-session', label: 'Review again' })
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

    // UI methods
    toggleReadingOption(kind) {
      if (kind === 'translation') this.showTranslation = !this.showTranslation
      if (kind === 'transliteration') this.showTransliteration = !this.showTransliteration
      if (kind === 'wbw') {
        this.showWordByWord = !this.showWordByWord
        this.loadVerses()
      }
      this.$forceUpdate()
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
      const nextValue = !this.sectionOpen[key]
      Object.keys(this.sectionOpen).forEach(sectionKey => {
        if (['session_tools', 'live_stats'].includes(sectionKey)) {
          this.sectionOpen[sectionKey] = false
        }
      })
      this.sectionOpen[key] = nextValue
    },

    applySettingsChanges() {
      const next = this.settingsDraft || {}
      this.showTranslation = !!next.showTranslation
      this.showTransliteration = !!next.showTransliteration
      this.showWordByWord = !!next.showWordByWord
      this.wordByWordAudioEnabled = !!next.wordByWordAudioEnabled
      this.defaultFontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, Number(next.defaultFontSize || 100)))
      try { localStorage.setItem('telawa.defaultFontSize', JSON.stringify(this.defaultFontSize)) } catch { }
      this.persistUiState()
      this.scheduleLoadVerses(this.currentMode)
      this.showBanner('Settings saved', 'success', 1400)
    },

    // Persistence methods
    loadUiState() {
      try {
        const raw = localStorage.getItem('telawa.uiState')
        if (raw) {
          const state = JSON.parse(raw)
          this.theme = state.theme || this.theme
          this.tab = ['beginner', 'advanced'].includes(state.tab) ? 'tools' : (state.tab || this.tab)
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
          this.defaultFontSize = Number(state.defaultFontSize ?? this.defaultFontSize ?? 100)
          this.settingsDraft = {
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
        }
      } catch (e) { console.error(e) }
      this.showTools = false
      this.beginner = this.loadModeState('beginner')
      this.advanced = this.loadModeState('advanced')
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    persistUiState() {
      if (this.isBootstrapping) return
      try {
        localStorage.setItem('telawa.uiState', JSON.stringify({
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
          fontScale: this.fontScale,
          uiScale: this.uiScale,
          enScale: this.enScale,
          quranFont: this.quranFont,
          script: this.script,
          sectionOpen: this.sectionOpen,
          tajweedEnabled: this.tajweedEnabled
        }))
      } catch (e) { console.error(e) }
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
      } catch (e) { console.error(e) }
      this.persistContinueSession()
    },

    persistAllState() {
      this.persistUiState()
      this.persistSessionState()
      this.persistAudioState()
      this.persistContinueSession()
      this.persistPlanner()
      this.persistTodayPlan()
      this.persistSm2()
      saveMutqinState(this.mutqinState)
    },

    // Data loading methods
    async loadChapters() {
      try {
        const res = await axios.get('https://api.quran.com/api/v4/chapters', { params: { language: 'en' } })
        this.chapters = res.data?.chapters || []
        if (this.chapterId) await this.loadChapter()
      } catch (e) { console.error(e) }
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
        title: 'Reset session?',
        message: 'This will clear the current mode settings and player progress for this flow.',
        confirmLabel: 'Reset',
        tone: 'danger',
        action: 'reset-session'
      })
    },

    performResetControls() {
      this.rangeStart = 1
      this.rangeEnd = 7
      this.speed = 1
      this.delay = 2
      this.chainingEnabled = true
      this.chainingMethod = 'linking'
      this.chainingRepetitions = 1
      this.playMode = 'auto'
      this.order = 'seq'
      this.applySpeed()
      this.rebuildQueue()
      this.persistAllState()
    },

    adjustRange() {
      const max = this.currentChapter?.verses_count || 286
      this.rangeStart = Math.max(1, Math.min(this.rangeStart, max))
      this.rangeEnd = Math.max(this.rangeStart, Math.min(this.rangeEnd, max))
      this.scheduleLoadVerses(this.currentMode)
    },

    onChapterChange(event) {
      this.chapterId = parseInt(event.target.value)
      this.loadChapter(this.currentMode)
    },

    refreshVerses() { this.scheduleLoadVerses(this.currentMode) },

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

    playWordAudio(url, key = '') {
      if (!url) return
      this.activeWordAudio = key
      const a = new Audio(url)
      a.addEventListener('ended', () => { if (this.activeWordAudio === key) this.activeWordAudio = '' })
      a.play().catch(() => { this.activeWordAudio = '' })
    }
  }
}
</script>

<style>
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

/* Player Speed Controls */
.player-speed-controls {
  display: flex;
  gap: 4px;
  background: var(--accent-light);
  padding: 4px 8px;
  border-radius: 40px;
}

/* Word highlighting with Tajweed */
.verse-arabic.tajweed-enabled .wbw-word {
  display: inline-block;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 0 2px;
  cursor: pointer;
  position: relative;
}

.verse-arabic.tajweed-enabled .wbw-word.highlighted {
  background: var(--accent);
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(154, 103, 56, 0.3);
}

/* Preserve Tajweed colors inside highlighted words */
.verse-arabic.tajweed-enabled .wbw-word.highlighted,
.verse-arabic.tajweed-enabled .wbw-word.highlighted * {
  color: inherit !important;
}

/* Make Tajweed marks more visible on highlight */
.verse-arabic.tajweed-enabled .wbw-word.highlighted .tajweed-mark {
  filter: brightness(1.2);
}

.verse-arabic.tajweed-enabled .wbw-word:hover {
  background: var(--accent-light);
  cursor: pointer;
}

.verse-arabic.tajweed-enabled .wbw-word.highlighted {
  animation: wordHighlightPulse 0.2s ease-out;
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

.speed-btn-mini {
  padding: 4px 8px;
  border-radius: 20px;
  border: none;
  background: transparent;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-muted);
}

.speed-btn-mini:hover {
  background: rgba(255, 255, 255, 0.5);
}

.speed-btn-mini.active {
  background: var(--accent);
  color: white;
}

@media (max-width: 768px) {
  .player-speed-controls {
    display: none;
    /* Hide on mobile, too crowded */
  }
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
  background: var(--bg);
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
  width: min(var(--tools-width), 92vw);
  background: linear-gradient(180deg, rgba(255, 250, 243, 0.96), rgba(247, 240, 231, 0.92));
  border-left: 1px solid var(--border);
  backdrop-filter: blur(14px);
  transform: translateX(100%);
  transition: transform 0.25s ease;
  z-index: 60;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg);
  isolation: isolate;
}

.tools-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 12, 8, 0.35);
  backdrop-filter: blur(1px);
  z-index: 59;
}

.tools.open {
  transform: translateX(0);
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
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 20px calc(var(--tools-footer-h) + 26px);
}

/* Compact mode (default) to reduce cognitive load */
.tools-body.compact .st-sub,
.tools-body.compact .field-hint,
.tools-body.compact .analytics-help,
.tools-body.compact .stat-help {
  display: block !important;
}

.tools-body.compact .sheet {
  gap: 12px;
}

.tools-body.compact .sheet-section {
  padding: 0;
  border-radius: 16px;
}

.tools-body.compact .sheet-toggle {
  padding: 12px 14px;
}

.tools-body.compact .sheet-content {
  padding: 12px 14px 14px;
}

.tools-body.compact .field-stack {
  gap: 12px;
}

.tools-body.compact .field label {
  margin-bottom: 6px;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sheet-section {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 248, 242, 0.62));
  border-radius: 18px;
  padding: 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
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
  gap: 10px;
}

.technique-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
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
  font-size: 0.8rem;
  font-weight: 650;
  white-space: nowrap;
}

.technique-copy small,
.technique-control span {
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.35;
}

.technique-toggle {
  flex: 0 0 68px;
  min-height: 36px;
}

.technique-control {
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
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
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.035);
}

.segmented-control button {
  min-width: 0;
  min-height: 36px;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
}

.segmented-control button.active {
  background: rgba(255, 255, 255, 0.9);
  color: var(--accent-strong);
  box-shadow: var(--shadow-sm);
}

.technique-preview {
  padding: 9px 10px;
  border-radius: 11px;
  background: rgba(154, 103, 56, 0.07);
  border: 1px solid rgba(154, 103, 56, 0.10);
  color: var(--accent-strong);
  font-size: 0.72rem;
  line-height: 1.35;
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--tools-footer-h);
  padding: 12px 16px 14px;
  border-top: 1px solid var(--border);
  background: linear-gradient(to top, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0));
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
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
  padding: 4px 7px;
  border-radius: 999px;
  border: 1px solid rgba(154, 103, 56, 0.10);
  background: rgba(255, 255, 255, 0.62);
}

.workspace-fab-live {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.workspace-fab-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.08);
  border: 1px solid rgba(154, 103, 56, 0.12);
  color: var(--accent-strong);
  font-size: 0.74rem;
  font-weight: 600;
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
  opacity: 0.92;
  filter: saturate(0.85);
  margin-top: 0.55rem;
}

.verse-aid-title {
  margin-bottom: 4px;
  color: var(--accent-strong);
  font-size: 0.72rem;
  font-weight: 700;
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
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(154, 103, 56, 0.08);
  border: 1px solid rgba(154, 103, 56, 0.12);
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 600;
}

.settings-section {
  padding: 14px;
  background: var(--surface-strong);
  box-shadow: var(--shadow-sm);
}

.settings-heading,
.settings-row,
.settings-row-copy {
  display: flex;
  align-items: center;
}

.settings-heading {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.settings-heading h3 {
  margin: 0;
  color: var(--accent);
  font-size: 0.98rem;
  line-height: 1.2;
  white-space: nowrap;
}

.settings-apply {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 7px 12px;
  border-radius: 11px;
  font-size: 0.76rem;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-row {
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.52);
}

.settings-row-copy {
  min-width: 0;
  gap: 8px;
}

.settings-row-copy label {
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 650;
  white-space: nowrap;
}

.settings-row-copy small {
  color: var(--text-muted);
  font-size: 0.68rem;
  white-space: nowrap;
}

.settings-toggle {
  flex: 0 0 86px;
  min-height: 32px;
  padding: 5px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  box-shadow: none;
}

.settings-row-range {
  align-items: center;
}

.settings-row-range .settings-row-copy {
  flex: 0 0 116px;
  justify-content: space-between;
}

.settings-range {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  box-shadow: none;
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
  width: calc(100vw - 24px);
  max-width: 980px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: 12px 24px;
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
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
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
}

.player-btn:hover {
  background: var(--bg-elevated);
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
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
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

/* Banner */
.banner {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  min-width: min(560px, calc(100vw - 24px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  font-weight: 450;
  animation: riseSoft 220ms ease-out;
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
[data-theme="dark"] .settings-row-copy label {
  color: var(--text);
}

[data-theme="dark"] .tools-context,
[data-theme="dark"] .st-sub,
[data-theme="dark"] .technique-copy small,
[data-theme="dark"] .technique-control span,
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
  color: var(--accent-strong);
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

[data-theme="dark"] .settings-row {
  background: rgba(255, 255, 255, 0.045);
  border-color: rgba(255, 236, 216, 0.12);
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
  font-weight: 700;
}

.toggle-chip.active {
  border-color: var(--accent);
  color: var(--accent);
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .settings-row {
    gap: 8px;
  }

  .settings-row-copy {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .settings-toggle {
    flex-basis: 78px;
    min-height: 40px;
  }

  .settings-row-range {
    align-items: stretch;
    flex-direction: column;
  }

  .settings-row-range .settings-row-copy {
    flex: initial;
    flex-direction: row;
    align-items: center;
    width: 100%;
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
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
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
    flex: 0 0 auto;
    justify-content: center;
    gap: 8px;
  }

  .player-progress-wrap {
    order: 0;
    flex: 1 1 auto;
    min-width: 0;
  }

  .player-speed-controls {
    flex: 0 0 auto;
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
    gap: 14px;
  }

  .player-progress-wrap {
    min-width: 0;
    width: 100%;
    order: 4;
  }
}

@media (max-width: 480px) {
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
</style>
