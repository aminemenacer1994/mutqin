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
    <div v-if="appReady" class="main container" :class="{ 'tools-open': showTools }">
      <div class="content">
        <section v-if="!hasVerses" class="home-dashboard">
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

          <div class="streak-motivation" v-if="analytics.currentStreak > 0">
            <div class="streak-badge">
              <i class="bi bi-fire" style="color: #ee964b;"></i>
              <span>{{ analytics.currentStreak }} day streak</span>
            </div>
            <div class="motivation-message" v-if="analytics.currentStreak === 1">
              <i class="bi bi-star"></i> Great start! Keep going.
            </div>
            <div class="motivation-message" v-else-if="analytics.currentStreak === 3">
              <i class="bi bi-calendar-heart"></i> 3 days! Consistency is beautiful.
            </div>
            <div class="motivation-message" v-else-if="analytics.currentStreak === 7">
              <i class="bi bi-trophy"></i> One week! مَا شَاءَ ٱللَّٰهُ
            </div>
            <div class="motivation-message" v-else-if="analytics.currentStreak >= 30">
              <i class="bi bi-gem"></i> {{ analytics.currentStreak }} days of dedication
            </div>
          </div>

          <div class="dashboard-actions">
            <div v-if="hasContinueSession" class="action-card resume-action" @click="continueLastSession">
              <div class="action-icon"><i class="bi bi-arrow-clockwise"></i></div>
              <div class="action-content">
                <h3>Resume Session</h3>
                <p>{{ continueSessionLabel }}</p>
              </div>
              <i class="bi bi-play-fill action-arrow"></i>
            </div>

            <div class="action-card primary-action" @click="showPlannerModal = true">
              <div class="action-icon"><i class="bi bi-magic"></i></div>
              <div class="action-content">
                <h3>Quick Plan</h3>
                <p>Generate a memorization plan in seconds</p>
              </div>
              <i class="bi bi-arrow-right action-arrow"></i>
            </div>

            <div class="action-card" @click="startWithFatiha">
              <div class="action-icon"><i class="bi bi-play-circle-fill"></i></div>
              <div class="action-content">
                <h3>Quickstart Demo</h3>
                <p>Try the system with Surah Al-Fatiha</p>
              </div>
              <i class="bi bi-arrow-right action-arrow"></i>
            </div>

            <div class="action-card" @click="openSetup">
              <div class="action-icon"><i class="bi bi-sliders"></i></div>
              <div class="action-content">
                <h3>Custom Setup</h3>
                <p>Configure everything exactly how you want</p>
              </div>
              <i class="bi bi-arrow-right action-arrow"></i>
            </div>
          </div>

          <div class="dashboard-recent">
            <div class="recent-header">
              <h3>Activity Summary</h3>
              <button class="btn-ghost" @click="tab = 'analytics'; showTools = true">Stats</button>
            </div>
            <div class="recent-stats">
              <div class="r-stat">
                <span>Verses Read</span>
                <strong>{{ analytics.totalVersesRead }}</strong>
              </div>
              <div class="r-stat">
                <span>Time Spent</span>
                <strong>{{ analytics.totalTimeSpent }}m</strong>
              </div>
              <div class="r-stat">
                <span>Repetitions</span>
                <strong>{{ analytics.totalRepetitions }}</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- Onboarding Welcome Section - Shows only for new users -->
        <div class="onboarding-welcome" v-if="showOnboarding">
          <div class="onboarding-card">
            <div class="onboarding-icon"><i class="bi bi-compass"></i></div>
            <h3>Welcome to Mutqin</h3>
            <p>Start your Quran memorization journey in 3 simple steps</p>

            <div class="onboarding-steps">
              <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <strong>Choose a surah</strong>
                  <span>Select which surah you want to memorize</span>
                </div>
              </div>
              <div class="step-arrow"><i class="bi bi-arrow-right"></i></div>
              <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <strong>Set your pace</strong>
                  <span>Choose how many verses per day</span>
                </div>
              </div>
              <div class="step-arrow"><i class="bi bi-arrow-right"></i></div>
              <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <strong>Start memorizing</strong>
                  <span>Listen, repeat, and track progress</span>
                </div>
              </div>
            </div>

            <div class="onboarding-cta">
              <button class="cta-primary-large" @click="openSetup">
                <i class="bi bi-play-fill"></i> Get Started Now
              </button>
              <button class="cta-secondary" @click="onboardingDismissed = true">
                <i class="bi bi-x"></i> Dismiss
              </button>
            </div>

            <div class="onboarding-tips">
              <div class="tip"><i class="bi bi-ear"></i> Listen to each verse</div>
              <div class="tip"><i class="bi bi-star"></i> Rate your recall (1-5)</div>
              <div class="tip"><i class="bi bi-calendar"></i> Practice daily for best results</div>
            </div>
          </div>
        </div>

        <!-- Updated Session Rail -->
        <div class="session-rail" v-if="currentChapter && hasVerses">
          <div class="session-rail-top">
            <div class="session-rail-copy">
              <div class="session-rail-headline">
                <div class="session-rail-title">{{ currentChapter.name_simple }}</div>
                <div class="session-rail-meta">Ayah {{ currentPosition }}/{{ totalVerses }}</div>
              </div>
              <div class="session-rail-pills">
                <span class="session-pill"><strong>{{ progressPercent }}%</strong> progress</span>
                <span class="session-pill"><strong>{{ remainingAyahs }}</strong> left</span>
                <span class="session-pill"><strong>{{ etaLabel }}</strong></span>
                <span class="session-pill"><strong>{{ currentMode === 'advanced' ? 'Advanced' : 'Beginner' }}</strong></span>
              </div>
            </div>
            <div class="session-rail-actions">
              <button v-if="hasContinueSession && continueSessionPayload && continueSessionPayload.activeVerseKey !== activeVerseKey"
                class="rail-btn rail-btn-resume" @click="continueLastSession" title="Resume saved session">
                <i class="bi bi-arrow-clockwise"></i>
                <span>Resume</span>
              </button>

              <!-- MODE BUTTON - Added to left side -->
              <button class="rail-btn mode-btn" @click="openModeSettings" title="Change Mode">
                <i class="bi bi-layers"></i>
                <span>{{ currentMode === 'beginner' ? 'Beginner' : 'Advanced' }}</span>
                <i class="bi bi-chevron-down"></i>
              </button>

              <!-- PLAN BUTTON -->
              <button class="rail-btn rail-btn-ghost" @click="showPlannerModal = true">
                <i class="bi bi-calendar-check"></i><span>Plan</span>
              </button>

              <!-- STATS BUTTON -->
              <button class="rail-btn rail-btn-ghost" @click="tab = 'analytics'; showTools = true">
                <i class="bi bi-grid-1x2"></i><span>Stats</span>
              </button>

              <!-- START SESSION BUTTON -->
              <button class="rail-btn rail-btn-primary" @click="handlePrimaryAction" :disabled="!isPlaying && !canStartSession">
                <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                <span>{{ isPlaying ? 'Pause' : 'Start Session' }}</span>
              </button>
            </div>
          </div>

          <div class="session-rail-subnote">{{ etaSubtext }}</div>

          <div class="progress-bar progress-bar-wide">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            <div class="progress-label">{{ progressPercent }}%</div>
          </div>
        </div>

        <!-- REMOVE the standalone beginner mode button if it exists elsewhere -->

        <div class="reading-toolbar">
          <div class="reading-toolbar-group">
            <button class="toolbar-chip" :class="{ active: showTranslation }"
              @click="toggleReadingOption('translation')">
              <i class="bi bi-translate"></i><span>Translation</span>
            </button>
            <button class="toolbar-chip" :class="{ active: showTransliteration }"
              @click="toggleReadingOption('transliteration')">
              <i class="bi bi-type"></i><span>Transliteration</span>
            </button>
            <button class="toolbar-chip" :class="{ active: showWordByWord }" @click="toggleReadingOption('wbw')">
              <i class="bi bi-grid-3x2-gap"></i><span>Word by word</span>
            </button>
            <button class="toolbar-chip" :class="{ active: wordByWordAudioEnabled }"
              @click="wordByWordAudioEnabled = !wordByWordAudioEnabled">
              <i class="bi bi-volume-up"></i><span>Word audio</span>
            </button>

            <!-- ADD TAJWEED PILL HERE -->
            <button class="toolbar-chip" :class="{ active: tajweedEnabled }" @click="toggleTajweed">
              <i class="bi bi-palette"></i><span>Tajweed</span>
            </button>
          </div>

          <div class="reading-toolbar-group">
            <div class="font-dropdown">
              <button class="font-dropdown-trigger" @click="toggleFontDropdown">
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
        <div v-else-if="hasVerses" class="verses-grid">
          <div v-for="verse in verses" :key="verse.key" :data-verse-key="verse.key" class="verse-card"
            :class="{
              active: effectiveActiveVerseKey === verse.key,
              'focus-mode': visualMode === 'focus' && effectiveActiveVerseKey && effectiveActiveVerseKey !== verse.key,
              blurred: visualMode === 'blur' && effectiveActiveVerseKey && effectiveActiveVerseKey !== verse.key,
              'serious-training': false
            }">
            <div class="verse-header">
              <div class="verse-badges">
                <span class="verse-number">Ayah {{ verse.number }}</span>
                <span v-if="effectiveActiveVerseKey === verse.key" class="verse-status-badge">Active Ayah</span>
                <span v-else-if="visualMode === 'blur'" class="verse-status-subtle">Active recall</span>
                <span v-else-if="visualMode === 'focus'" class="verse-status-subtle">Focus mode</span>
              </div>


              <div class="verse-actions">
                <!-- Font size controls -->
                <div class="verse-font-controls">
                  <button class="verse-font-btn" @click="decreaseVerseFont(verse.key, $event)"
                    title="Decrease font size">
                    <i class="bi bi-dash"></i>
                  </button>
                  <span class="verse-font-size-indicator">{{ getVerseFontSize(verse.key) }}%</span>
                  <button class="verse-font-btn" @click="increaseVerseFont(verse.key, $event)"
                    title="Increase font size">
                    <i class="bi bi-plus"></i>
                  </button>
                  <button v-if="verseFontSizes[verse.key]" class="verse-font-btn"
                    @click="resetVerseFont(verse.key, $event)" title="Reset font size">
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                </div>

                <button class="verse-download-btn" @click="downloadVerseAudio(verse)"
                  :title="`Download ayah ${verse.number} audio`" :disabled="!verse.audio">
                  <i class="bi bi-download"></i>
                </button>

                <!-- Fixed Play Button -->
                <button class="verse-play-btn" @click="playVerse(verse)"
                  :title="activeVerseKey === verse.key && isPlaying ? 'Pause' : 'Play verse'">
                  <i class="bi"
                    :class="activeVerseKey === verse.key && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                </button>
              </div>
            </div>

            <div class="verse-arabic" dir="rtl" v-if="verse.arabic && isDataReady" v-html="getDisplayArabic(verse)"
              :class="{
                'tajweed-enabled': tajweedEnabled,
                'word-highlight-enabled': showWordByWord && wordByWordAudioEnabled && !tajweedEnabled
              }" :style="{
                '--verse-font-percent': getVerseFontSize(verse.key),
                fontFamily: quranFontFamily
              }">
            </div>

            <!-- Transliteration -->
            <div v-if="showTransliteration && verse.transliteration" class="verse-transliteration">
              {{ verse.transliteration }}
            </div>

            <!-- Translation - shows only if showTranslation is true AND translation exists -->
            <div v-if="showTranslation && verse.translation" class="verse-translation">
              {{ verse.translation }}
            </div>

            <!-- Words - shows only if showWordByWord is true AND words array has items -->
            <div v-if="showWordByWord && verse.words && verse.words.length" class="verse-words">
              <div v-for="(word, wi) in verse.words" :key="wi" class="word-item">
                <span class="word-arabic" dir="rtl">{{ word.ar }}</span>
                <span class="word-meaning">{{ word.en }}</span>
                <button v-if="word.audio && wordByWordAudioEnabled" class="word-audio-btn"
                  @click="playWordAudio(word.audio)">
                  <i class="bi bi-volume-up"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tools Panel -->
      <aside class="tools" :class="{ open: showTools }">
        <div class="tools-top">
          <div class="tools-topbar">
            <div class="tools-title">{{ toolsHeaderTitle }}</div>
            <button class="tools-x" @click="showTools = false" aria-label="Close panel"><i
                class="bi bi-x-lg"></i></button>
          </div>
          <div class="tools-context">{{ contextLabel }}</div>
          <div class="tools-tabs">
            <button :class="{ active: tab === 'beginner', 'active-tab': tab === 'beginner' }"
              @click="setModeAndExplain('beginner')"><i class="bi bi-layers"></i> Beginner</button>
            <button :class="{ active: tab === 'advanced', 'active-tab': tab === 'advanced' }"
              @click="setModeAndExplain('advanced')"><i class="bi bi-layers"></i> Advanced</button>
            <button :class="{ active: tab === 'analytics', 'active-tab': tab === 'analytics' }"
              @click="tab = 'analytics'"><i class="bi bi-grid-1x2"></i> Stats</button>
          </div>
        </div>

          <div class="tools-body">
          <!-- Beginner Tab - 4 Consistent Sections -->
          <div v-if="tab === 'beginner'" class="sheet">
            <!-- Section 1: What to Memorise -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('beginner_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-book"></i></span>
                  <span class="st-txt">
                    <span class="st-title">What to memorise</span>
                    <span class="st-sub">Choose surah and verses</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.beginner_setup }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.beginner_setup">
                <div class="field-stack">
                  <div class="field">
                    <label>Surah</label>
                    <select :value="chapterId" @change="onChapterChange" class="select">
                      <option :value="0">Choose a surah...</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.id }}. {{ c.name_simple }}</option>
                    </select>
                    <small class="field-hint">Select the surah you want to memorise</small>
                  </div>
                  <div class="field">
                    <label>Verses</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>to</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                    <small class="field-hint">Choose a range of verses to focus on</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 2: Audio Settings -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('beginner_audio')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-mic"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Audio settings</span>
                    <span class="st-sub">Reciter and playback</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.beginner_audio }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.beginner_audio">
                <div class="field-stack">
                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                    <small class="field-hint">Choose your preferred Quran reciter</small>
                  </div>
                  <div class="field">
                    <label>Speed</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="0.75" v-model="speed"> 0.75x</label>
                      <label class="radio"><input type="radio" value="1" v-model="speed"> 1x</label>
                      <label class="radio"><input type="radio" value="1.25" v-model="speed"> 1.25x</label>
                      <label class="radio"><input type="radio" value="1.5" v-model="speed"> 1.5x</label>
                    </div>
                    <small class="field-hint">Adjust recitation speed</small>
                  </div>
                  <div class="field">
                    <label>Auto-advance</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="auto" v-model="playMode"> Yes</label>
                      <label class="radio"><input type="radio" value="manual" v-model="playMode"> No (manual)</label>
                    </div>
                    <small class="field-hint">Automatically move to next verse</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 4: Saved Sessions -->
            <section class="sheet-section" v-if="isLoggedIn">
              <button class="sheet-toggle" @click="toggleSection('beginner_saved')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-save"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Saved sessions</span>
                    <span class="st-sub">Save, load, delete</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.beginner_saved }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.beginner_saved">
                <div class="field-stack">
                  <div class="field">
                    <label>Your saved sessions</label>
                    <select v-model="selectedSessionId" class="select">
                      <option value="">-- Select a session --</option>
                      <option v-for="s in savedSessions" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                    <small class="field-hint">Load previously saved sessions</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Login message for non-logged users -->
            <section class="sheet-section" v-else>
              <div class="sheet-content">
                <div class="field-stack">
                  <div class="field">
                    <div class="pill" style="text-align: center; padding: 16px;">
                      <i class="bi bi-person"></i>
                      <span>Login to save and load sessions</span>
                    </div>
                    <small class="field-hint">Create an account to save your progress</small>
                  </div>
                </div>
              </div>
            </section>

            <button class="start-btn" @click="startSession" :disabled="!canStartSession">
              <i class="bi bi-play-fill"></i> Start memorising
            </button>
          </div>

          <!-- Advanced Tab - without chaining wizard UI -->
          <div v-if="tab === 'advanced'" class="sheet">
            <!-- Section 1: What to Memorise -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-book"></i></span>
                  <span class="st-txt">
                    <span class="st-title">What to memorise</span>
                    <span class="st-sub">Choose surah and verses</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }"><i class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-stack">
                  <div class="field">
                    <label>Surah</label>
                    <select :value="chapterId" @change="onChapterChange" class="select">
                      <option :value="0">Choose a surah...</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.id }}. {{ c.name_simple }}</option>
                    </select>
                    <small class="field-hint">Select the surah you want to memorise</small>
                  </div>
                  <div class="field">
                    <label>Verses</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>to</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                    <small class="field-hint">Choose a range of verses to focus on</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 2: Audio Settings -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_playback')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-mic"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Audio settings</span>
                    <span class="st-sub">Reciter and repetition</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_playback }"><i class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_playback">
                <div class="field-stack">
                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                    <small class="field-hint">Choose your preferred Quran reciter</small>
                  </div>
                  <div class="field">
                    <label>Speed</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="0.75" v-model="speed"> 0.75x</label>
                      <label class="radio"><input type="radio" value="1" v-model="speed"> 1x</label>
                      <label class="radio"><input type="radio" value="1.25" v-model="speed"> 1.25x</label>
                      <label class="radio"><input type="radio" value="1.5" v-model="speed"> 1.5x</label>
                    </div>
                    <small class="field-hint">Adjust recitation speed</small>
                  </div>
                  <div class="field checkbox">
                    <label class="switch">
                      <input type="checkbox" v-model="repeatAndLoopAudio">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Loop and repeat each ayah</span>
                    </label>
                    <small class="field-hint">When enabled, repeats each ayah several times.</small>
                  </div>
                  <div class="field" v-if="repeatAndLoopAudio">
                    <label>Repeat count</label>
                    <select v-model="advancedRepeats" class="select">
                      <option v-for="n in repeatOptions" :key="'adv_rep_' + n" :value="n">{{ n }} {{ n === 1 ? 'time' : 'times' }}</option>
                    </select>
                    <small class="field-hint">How many times to repeat each ayah</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 3: Practice Mode -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_practice')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-stars"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Practice mode</span>
                    <span class="st-sub">Focus and recall</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_practice }"><i class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_practice">
                <div class="field-stack">
                  <div class="field">
                    <label>Auto-advance</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="auto" v-model="playMode"> Yes</label>
                      <label class="radio"><input type="radio" value="manual" v-model="playMode"> No (manual)</label>
                    </div>
                    <small class="field-hint">Automatically move to next verse</small>
                  </div>
                  <div class="field">
                    <label>Delay between ayahs</label>
                    <select v-model="delay" class="select">
                      <option v-for="d in delayOptions" :key="'adv_delay_' + d" :value="d">{{ d }}s</option>
                    </select>
                    <small class="field-hint">Breathing space between repetitions</small>
                  </div>
                  <div class="field checkbox">
                    <label class="switch">
                      <input type="checkbox" v-model="focusMode" :disabled="blurAdjacent">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Focus mode (dim other verses)</span>
                    </label>
                    <small class="field-hint">Reduce distraction by dimming non-active verses. Disabled while blur recall is active.</small>
                  </div>
                  <div class="field checkbox">
                    <label class="switch">
                      <input type="checkbox" v-model="blurAdjacent" :disabled="focusMode">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Blur non-active verses (active recall)</span>
                    </label>
                    <small class="field-hint">Test your memory by hiding non-active verses. Disabled while focus mode is active.</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 4: Saved Sessions -->
            <section class="sheet-section" v-if="isLoggedIn">
              <button class="sheet-toggle" @click="toggleSection('advanced_saved')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-save"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Saved sessions</span>
                    <span class="st-sub">Save, load, delete</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_saved }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_saved">
                <div class="field-stack">
                  <div class="field">
                    <label>Your saved sessions</label>
                    <select v-model="selectedSessionId" class="select">
                      <option value="">-- Select a session --</option>
                      <option v-for="s in savedSessions" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                    <small class="field-hint">Load previously saved sessions</small>
                  </div>
                </div>
              </div>
            </section>

            <!-- Login message for non-logged users -->
            <section class="sheet-section" v-else>
              <div class="sheet-content">
                <div class="field-stack">
                  <div class="field">
                    <div class="pill" style="text-align: center; padding: 16px;">
                      <i class="bi bi-person"></i>
                      <span>Login to save and load sessions</span>
                    </div>
                    <small class="field-hint">Create an account to save your progress</small>
                  </div>
                </div>
              </div>
            </section>

            <button class="start-btn" @click="startSession" :disabled="!canStartSession">
              <i class="bi bi-play-fill"></i> Start memorising
            </button>
          </div>

          <!-- Analytics Tab -->
          <div v-if="tab === 'analytics'" class="sheet">
            <div class="sheet-section" style="padding: 20px;">
              <h3 style="margin-top:0; font-size: 1.1rem; color: var(--accent);">Your Memorisation Stats</h3>
              <p class="analytics-help">These numbers are device-local summaries. Weekly bars show recent days.</p>
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
                  <i class="bi bi-fire"></i>
                  <div class="stat-value">{{ analytics.currentStreak }}</div>
                  <div class="stat-label">Day Streak</div>
                  <div class="stat-help">Consecutive days with at least one session.</div>
                </div>
                <div class="stat-card">
                  <i class="bi bi-check-circle"></i>
                  <div class="stat-value">{{ analytics.versesMastered }}</div>
                  <div class="stat-label">Mastered</div>
                  <div class="stat-help">Verses you’ve marked as strong and consistent.</div>
                </div>
                <div class="stat-card">
                  <i class="bi bi-repeat"></i>
                  <div class="stat-value">{{ analytics.totalRepetitions }}</div>
                  <div class="stat-label">Repetitions</div>
                  <div class="stat-help">Total verse repeats across all sessions.</div>
                </div>
                <div class="stat-card">
                  <i class="bi bi-calendar-check"></i>
                  <div class="stat-value">{{ analytics.sessionsCompleted }}</div>
                  <div class="stat-label">Sessions</div>
                  <div class="stat-help">How many times you finished a session run.</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="tools-footer">
          <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="resetControls"><i
              class="bi bi-arrow-counterclockwise"></i><span>Reset</span></button>
          <button class="tools-btn tools-btn-ghost tools-btn-soft" @click="showTools = false"><i
              class="bi bi-x-circle"></i><span>Close</span></button>
        </div>
      </aside>
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
                {{ ch.id }}. {{ ch.name_simple }} ({{ ch.verses_count }} verses)
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
          <button class="btn-primary" :class="{ 'btn-danger': confirmModal.tone === 'danger' }" @click="runConfirmAction">{{ confirmModal.confirmLabel }}</button>
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

const MODE_STORAGE_KEYS = {
  beginner: 'telawa.mode.beginner',
  advanced: 'telawa.mode.advanced'
}

const SESSION_STORAGE_KEYS = {
  beginner: 'telawa.sessionState.beginner',
  advanced: 'telawa.sessionState.advanced'
}

const DEFAULT_ALQURAN_RECITER = 'ar.alafasy'

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
    delay: 1,
    playMode: 'auto',
    repeats: 1,
    order: 'seq',
    focusMode: false,
    blurAdjacent: false,
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
    delay: 1,
    playMode: 'auto',
    repeats: 1,
    order: 'seq',
    focusMode: false,
    blurAdjacent: false,
    repeatAndLoopAudio: false,
    advancedRepeats: 1,
    chainingConfig: {
      step: 1,
      goal: 'memorise',
      style: 'sequential'
    },
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
      applyingChainingDefaults: false,
      fontDropdownOpen: false,
      verseFontSizes: {},
      defaultFontSize: 100,
      fontSizeStep: 10,
      minFontSize: 80,
      maxFontSize: 250,
      tajweedEnabled: false,
      beginner: createBeginnerState(),
      advanced: createAdvancedState(),
      // New chaining UI state
      showQueueViewer: false,
      queueViewCollapsed: true,
      currentChainStats: {
        totalEntries: 0,
        uniqueVerses: 0,
        repeatsPerVerse: 0,
        totalDuration: 0
      },
      chainViewMode: 'compact',
      manualChainControl: false,
      chainBookmarks: [],
      chainHistory: [],
      repeatGroups: [],

      // Arabic text word highlighting state
      currentWordIndex: -1,
      currentHighlightedVerseKey: null,
      wordTimestampsMap: new Map(),
      wordHighlightHandler: null,
      currentVerseWords: [],

      // UI State
      currentMode: 'beginner',
      theme: 'light',
      tab: 'beginner',
      showTools: false,
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
        totalVersesRead: 124,
        totalTimeSpent: 86,
        currentStreak: 5,
        versesMastered: 12,
        totalRepetitions: 450,
        sessionsCompleted: 15,
        weeklyVerses: [3, 5, 4, 7, 6, 8, 9],
        weeklyMinutes: [12, 18, 15, 24, 21, 27, 30]
      },
      playerVisible: false,
      playerCollapsed: true,
      playerMenuOpen: false,
      hasContinueSession: false,
      continueSessionLabel: '',
      continueSessionPayload: null,
      lastScrollY: 0,
      pendingDeleteId: '',

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
      repeats: 1,
      order: 'seq',
      blurAdjacent: false,
      focusMode: false,

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
      confettiActive: false,
      confettiSeed: 0,
      networkOnline: true,
      onboardingDismissed: false,
      onboardingStep: 1,
      restoredAudioState: null,

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
      repeatOptions: [1, 2, 3, 4, 5, 7, 10],
      rangeLoopDelay: 1,

      // Section open state - Expanded for consistency
      sectionOpen: {
        beginner_setup: true,
        beginner_audio: false,
        beginner_saved: false,
        advanced_setup: true,
        advanced_playback: false,
        advanced_practice: false,
        advanced_saved: false,
        analytics_overview: true,
        analytics_planner: true,
        analytics_weak: false
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
      quizSummaryActive: false
    }
  },

  computed: {
    appStyleVars() {
      return {
        '--ui-scale': this.uiScale,
        '--en-scale': this.enScale
      }
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

    sessionConfig() {
      return this.buildSessionConfig(this.currentMode)
    },

    hasVerses() {
      return this.currentConfig.verses?.length > 0
    },
    continueSessionMeta() {
      const payload = this.continueSessionPayload
      if (!payload) return 'Your ayah, queue position, settings, and player state are ready to restore.'
      const ayah = payload.activeVerseKey ? String(payload.activeVerseKey).split(':')[1] : null
      const minutesAgo = Math.max(0, Math.round((Date.now() - Number(payload.timestamp || 0)) / 60000))
      const timeLabel = minutesAgo < 1 ? 'saved just now' : `saved ${minutesAgo} min ago`
      return `Resume on ayah ${ayah || payload.config?.rangeStart || 1} with your player state intact, ${timeLabel}.`
    },

    hasSelectedSurah() {
      const chapterId = this.currentConfig.chapterId
      return chapterId && chapterId > 0
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

    focusMode: {
      get() { return this.currentConfig.focusMode },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.focusMode = val
        else this.advanced.focusMode = val
      }
    },

    blurAdjacent: {
      get() { return this.currentConfig.blurAdjacent },
      set(val) {
        if (this.currentMode === 'beginner') this.beginner.blurAdjacent = val
        else this.advanced.blurAdjacent = val
      }
    },

    visualMode() {
      if (this.blurAdjacent) return 'blur'
      if (this.focusMode) return 'focus'
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

    repeatAndLoopAudio: {
      get() { return this.advanced.repeatAndLoopAudio },
      set(val) { this.advanced.repeatAndLoopAudio = val }
    },

    advancedRepeats: {
      get() { return this.advanced.advancedRepeats },
      set(val) { this.advanced.advancedRepeats = val }
    },

    chainingConfig: {
      get() {
        return this.advanced.chainingConfig || { step: 1, goal: 'memorise', style: 'sequential' }
      },
      set(val) {
        this.advanced.chainingConfig = {
          step: 1,
          goal: 'memorise',
          style: 'sequential',
          ...(val || {})
        }
      }
    },

    beginnerRepeats: {
      get() { return this.beginner.repeats },
      set(val) { this.beginner.repeats = val }
    },

    totalVerses() {
      return Math.max(0, this.rangeEnd - this.rangeStart + 1)
    },

    currentPosition() {
      if (!this.activeKey) return 1
      const num = parseInt(this.activeKey.split(':')[1])
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

    showOnboarding() {
      const hasVersesInCurrentMode = this.hasVerses
      return !this.onboardingDismissed && !this.chapterId && !hasVersesInCurrentMode && !this.quizActive
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

    plannerKeyboardActive() {
      return this.showPlannerModal
    },

    canStartSession() {
      const config = this.sessionConfig
      return this.appReady &&
        this.isDataReady &&
        !!config.chapterId &&
        config.rangeStart > 0 &&
        config.rangeEnd >= config.rangeStart &&
        (!!this.verses.length || !!this.currentConfig.verses.length)
    },

    modeSummary() {
      return this.currentMode === 'beginner'
        ? 'Sequential flow, focus off, repetition 3x.'
        : 'Sequential flow, focus optional, repetition optional.'
    },

    currentSessionExplanation() {
      const repeatCount = this.currentMode === 'beginner'
        ? Number(this.beginnerRepeats || 1)
        : (this.repeatAndLoopAudio ? Number(this.advancedRepeats || 1) : 1)

      const practiceMode = this.blurAdjacent
        ? 'blur recall'
        : (this.focusMode ? 'focus mode' : 'open reading')

      const repeatLabel = repeatCount === 1 ? '1 repeat' : `${repeatCount} repeats`
      const modeLabel = this.currentMode === 'advanced' ? 'Advanced' : 'Beginner'

      return `${modeLabel} session in sequential order, ${repeatLabel} per ayah, ${practiceMode}.`
    },

    chainingStep() {
      return Math.max(1, Math.min(3, Number(this.chainingConfig.step || 1)))
    },

    chainingGoalLabel() {
      const labels = {
        memorise: 'Memorise',
        revise: 'Revise',
        test: 'Test'
      }
      return labels[this.chainingConfig.goal] || 'Memorise'
    },

    chainingStyleLabel() {
      return 'Build in order'
    },

    chainingGoalHint() {
      const hints = {
        memorise: 'Build the passage steadily with guided repetition.',
        revise: 'Move through the range with lighter support.',
        test: 'Hide support early and check your recall.'
      }
      return hints[this.chainingConfig.goal] || hints.memorise
    },

    chainingStepOneReady() {
      return !!this.chainingConfig.goal
    },

    chainingStepTwoReady() {
      return !!this.chapterId && this.rangeEnd >= this.rangeStart
    },

    chainingStepThreeReady() {
      return !!this.chainingConfig.style
    },

    chainingSummary() {
      const surah = this.currentChapter?.name_simple || (this.chapterId ? `Surah ${this.chapterId}` : 'Choose a surah')
      const range = this.chapterId ? `Ayahs ${this.rangeStart}-${this.rangeEnd}` : 'Choose a range'
      return `${this.chainingGoalLabel} · ${surah} · ${range} · ${this.chainingStyleLabel}`
    },

    etaSubtext() {
      if (!this.remainingAyahs) return 'Ready to complete'
      return `Review + repetition included`
    },

    etaLabel() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return '0 min'

      const repetitionCount = this.currentMode === 'beginner'
        ? (this.beginner.repeats || 1)
        : (this.repeatAndLoopAudio ? (this.advancedRepeats || 1) : 1)
      const avgAudioLengthPerAyah = 8
      const speedFactor = this.speed || 1
      const adjustedAudioLength = avgAudioLengthPerAyah / speedFactor
      const reviewTimePerAyah = this.visualMode === 'blur' ? 7 : 5
      let totalSeconds = 0

      remainingItems.forEach(item => {
        const verse = item.verse || item
        const verseLength = verse.arabic?.length || 100
        const verseComplexity = Math.min(2, Math.max(0.8, verseLength / 150))
        const audioTime = adjustedAudioLength * verseComplexity
        const verseTotal = (audioTime * repetitionCount) + reviewTimePerAyah
        totalSeconds += verseTotal
      })

      const delaySeconds = (this.delay || 1) * (remainingItems.length - 1)
      totalSeconds += delaySeconds
      const minutes = Math.max(0, Math.ceil(totalSeconds / 60))
      return `Audio time ≈ ${minutes} min`
    },

    etaLabelAudioOnly() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return '0 min'

      const repetitionCount = this.currentMode === 'beginner'
        ? (this.beginner.repeats || 1)
        : (this.repeatAndLoopAudio ? (this.advancedRepeats || 1) : 1)

      const avgAudioLengthPerAyah = 8
      const speedFactor = this.speed || 1
      const adjustedAudioLength = avgAudioLengthPerAyah / speedFactor

      let totalAudioSeconds = 0
      remainingItems.forEach(item => {
        const verse = item.verse || item
        const verseLength = verse.arabic?.length || 100
        const verseComplexity = Math.min(2, Math.max(0.8, verseLength / 150))
        totalAudioSeconds += adjustedAudioLength * verseComplexity * repetitionCount
      })

      const minutes = Math.max(0, Math.ceil(totalAudioSeconds / 60))
      return `Audio time ≈ ${minutes} min`
    },

    currentChainPhase() {
      return 0
    },

    toolsHeaderTitle() {
      if (this.tab === 'analytics') return 'Retention and plan'
      if (this.tab === 'advanced') return 'Advanced session'
      return 'Guided session setup'
    },

    contextLabel() {
      const surah = this.currentChapter?.name_simple || (this.chapterId ? `Surah ${this.chapterId}` : 'No surah')
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

    onboardingPrimaryLabel() {
      return 'Begin plan'
    },

    emptyPrimaryLabel() {
      return 'Begin plan'
    },

    nextActionDescription() {
      return 'Select a surah and verses to start memorising'
    }
  },

  async mounted() {
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
    this.initAudio()
    this.restoreAudioState()
    this.theme = document.documentElement.getAttribute('data-theme') || this.theme
    this.loadBookmarksPins(),
    this.setupWordClickHandler()
    this.showFirstTimeTips()
    this.loadContinueSessionPrompt()


    if (this.currentMode === 'advanced' && this.advanced.chapterId) {
      this.currentMode = 'advanced'
      this.tab = 'advanced'
      this.applyChainingGoalDefaults()
      await this.loadVerses()
    } else if (this.beginner.chapterId) {
      this.currentMode = 'beginner'
      this.tab = 'beginner'
      await this.loadVerses()
    }

    this.isBootstrapping = false
    this.appReady = true

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('beforeunload', this.persistAllState)
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true })
    document.addEventListener('click', this.handleClickOutside)
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
    document.removeEventListener('click', this.handleClickOutside)
  },

  watch: {
    theme: 'persistUiState',
    showTools: 'persistUiState',
    tab: 'persistUiState',
    chapterId: 'persistUiState',
    rangeStart: 'persistUiState',
    rangeEnd: 'persistUiState',
    reciterId: 'persistUiState',
    speed: 'persistUiState',
    delay: 'persistUiState',
    playMode: 'persistUiState',
    order: 'persistUiState',
    blurAdjacent: 'persistUiState',
    focusMode: 'persistUiState',
    showTranslation: 'persistUiState',
    showTransliteration: 'persistUiState',
    showWordByWord: 'persistUiState',
    wordByWordAudioEnabled: 'persistUiState',
    fontScale: 'persistUiState',
    quranFont: 'persistUiState',
    script: 'persistUiState',
    onboardingDismissed: 'persistUiState',
    activeKey: 'persistSessionState',
    queueIndex: 'persistSessionState',
    playerVisible: 'persistAudioState',
    isPlaying: 'persistAudioState',
    currentTime: 'persistAudioState',
    sectionOpen: { handler: 'persistUiState', deep: true },

    tajweedEnabled() {
      this.persistUiState()
    },

    activeVerseKey() {
      // Logic removed since blurring is now global
    },

    beginnerRepeats() {
      if (this.tab === 'beginner') this.rebuildQueue()
    },
    advancedRepeats() {
      if (this.tab === 'advanced' && this.repeatAndLoopAudio) this.rebuildQueue()
    },
    repeatAndLoopAudio() {
      if (this.tab === 'advanced') this.rebuildQueue()
    },
    focusMode(val) {
      if (val) this.blurAdjacent = false
    },
    blurAdjacent(val) {
      if (val) this.focusMode = false
    },
    'advanced.chainingConfig': {
      handler() {
        if (this.applyingChainingDefaults) return
        if (this.currentMode === 'advanced') {
          this.applyChainingGoalDefaults()
          this.persistUiState()
        }
      },
      deep: true
    },

    tab(newVal) {
      if (newVal === 'beginner' && this.currentMode !== 'beginner') {
        this.currentMode = 'beginner'
        if (!this.beginner.verses.length && this.beginner.chapterId) {
          this.loadVerses()
        }
      } else if (newVal === 'advanced' && this.currentMode !== 'advanced') {
        this.currentMode = 'advanced'
        if (!this.advanced.verses.length && this.advanced.chapterId) {
          this.loadVerses()
        }
      }
      this.persistUiState()
    }
  },

  methods: {
    setModeAndExplain(mode) {
      this.tab = mode
      this.currentMode = mode
      this.showTools = true

      if (mode === 'beginner') {
        this.beginnerRepeats = 3
        this.focusMode = false
        this.blurAdjacent = false
      } else {
        this.repeatAndLoopAudio = true
        this.advancedRepeats = Math.max(5, Number(this.advancedRepeats || 5))
        this.blurAdjacent = true
        this.focusMode = false
      }

      this.persistUiState()
    },
    cloneModeState(modeState) {
      return deepClone(modeState)
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
        theme: this.theme
      })
    },

    applySessionConfig(config) {
      if (!config) return
      const mode = config.mode || this.currentMode
      this.currentMode = mode
      this.tab = mode
      this.chapterId = Number(config.chapterId || 0)
      this.rangeStart = Number(config.rangeStart || 1)
      this.rangeEnd = Number(config.rangeEnd || this.rangeStart || 1)
      this.reciterId = typeof config.reciterId === 'string' && config.reciterId
        ? config.reciterId
        : DEFAULT_ALQURAN_RECITER
      this.speed = Number(config.speed || 1)
      this.delay = Number(config.delay || 1)
      this.playMode = config.playMode || 'auto'
      // Spaced-return/chaining UI removed; force sequential order.
      this.order = 'seq'
      this.focusMode = !!config.focusMode
      this.blurAdjacent = !!config.blurAdjacent
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
      if (mode === 'advanced') {
        this.chainingConfig = this.normaliseChainingConfig(config.chainingConfig || this.chainingConfig)
        this.repeatAndLoopAudio = !!config.repeatAndLoopAudio
        this.advancedRepeats = Number(config.advancedRepeats || 1)
      } else {
        this.beginnerRepeats = Number(config.repeats || 1)
      }
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
          merged.chainingConfig = this.normaliseChainingConfig(merged.chainingConfig)
          merged.chainingConfig.style = 'sequential'
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

    normaliseChainingConfig(config) {
      return {
        step: Math.max(1, Math.min(3, Number(config?.step || 1))),
        goal: ['memorise', 'revise', 'test'].includes(config?.goal) ? config.goal : 'memorise',
        style: 'sequential'
      }
    },

    setChainingGoal(goal) {
      this.chainingConfig = {
        ...this.chainingConfig,
        goal
      }
    },

    setChainingStyle(style) {
      this.chainingConfig = {
        ...this.chainingConfig,
        style
      }
    },

    setChainingStep(step) {
      const targetStep = Math.max(1, Math.min(3, Number(step || 1)))
      if (targetStep === 2 && !this.chainingStepOneReady) return
      if (targetStep === 3 && !this.chainingStepTwoReady) return
      this.chainingConfig = {
        ...this.chainingConfig,
        step: targetStep
      }
    },

    continueChainingStep() {
      if (this.chainingStep === 1) {
        this.setChainingStep(2)
        return
      }
      if (this.chainingStep === 2) {
        this.adjustRange()
        this.setChainingStep(3)
      }
    },

    applyChainingGoalDefaults() {
      if (this.currentMode !== 'advanced') return
      if (this.applyingChainingDefaults) return
      this.applyingChainingDefaults = true
      try {
        const config = this.normaliseChainingConfig(this.chainingConfig)
        const current = this.advanced.chainingConfig || {}
        const same =
          current.step === config.step &&
          current.goal === config.goal &&
          current.style === config.style

        if (!same) this.advanced.chainingConfig = config
        this.order = 'seq'
      } finally {
        this.applyingChainingDefaults = false
      }
    },

    startChainingSession() {
      this.currentMode = 'advanced'
      this.tab = 'advanced'
      this.applyChainingGoalDefaults()
      this.persistUiState()
      this.startSession()
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
        if (this.visualMode === 'blur') {
          event.preventDefault()
          this.blurAdjacent = false
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

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        this.focusMode = !this.focusMode
        return
      }

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        this.blurAdjacent = !this.blurAdjacent
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
      this.activeVerseKey = verse.key
      this.activeKey = verse.key
      this.$nextTick(() => {
        const el = document.querySelector(`.verse-card[data-verse-key="${verse.key}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    jumpToVerseIndex(index) {
      const collection = this.verses
      if (!collection.length) return
      const targetIndex = Math.max(0, Math.min(collection.length - 1, Number(index || 0)))
      const verse = collection[targetIndex]
      if (!verse) return
      this.activeVerseKey = verse.key
      this.activeKey = verse.key
      this.$nextTick(() => {
        const el = document.querySelector(`.verse-card[data-verse-key="${verse.key}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },

    handleWindowScroll() {
      const current = window.scrollY || 0
      this.playerCollapsed = current > this.lastScrollY && current > 120
      this.lastScrollY = current
    },

    buildContinueSessionPayload() {
      const verse = this.verses[this.activeVerseIndex >= 0 ? this.activeVerseIndex : this.queueIndex]?.key || this.activeVerseKey
      const source = this.currentMode === 'beginner' ? this.beginner : this.advanced
      return {
        timestamp: Date.now(),
        mode: this.currentMode,
        tab: this.tab,
        activeKey: verse || null,
        activeVerseKey: this.activeVerseKey || null,
        queueIndex: this.queueIndex || 0,
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
        if (!raw) return
        const payload = JSON.parse(raw)
        if (!payload?.config?.chapterId) return
        this.continueSessionPayload = payload
        this.hasContinueSession = true
        this.continueSessionLabel = `${payload.mode === 'advanced' ? 'Advanced' : 'Beginner'} · Surah ${payload.config.chapterId} · Ayahs ${payload.config.rangeStart}-${payload.config.rangeEnd}`
      } catch (e) { console.error(e) }
    },

    async continueLastSession() {
      const payload = this.continueSessionPayload
      if (!payload) return
      this.hasContinueSession = false
      this.currentMode = payload.mode || 'beginner'
      this.tab = payload.tab || this.currentMode
      const target = this.currentMode === 'beginner' ? 'beginner' : 'advanced'
      this[target] = {
        ...(target === 'beginner' ? createBeginnerState() : createAdvancedState()),
        ...this.cloneModeState(payload.config || {})
      }
      if (target === 'advanced') {
        this.advanced.chainingConfig = this.normaliseChainingConfig(this.advanced.chainingConfig)
      }
      this.applySessionConfig(this.buildSessionConfig(this.currentMode))
      await this.loadChapter()
      this.buildQueue()
      this.queueIndex = Number(payload.queueIndex || 0)
      this.activeKey = payload.activeKey || null
      this.activeVerseKey = payload.activeVerseKey || payload.activeKey || null
      this.playerVisible = !!payload.playerVisible
      this.restoredAudioState = {
        src: payload.audioSrc || '',
        currentTime: Number(payload.currentTime || 0),
        playerVisible: !!payload.playerVisible,
        speed: Number(payload.config?.speed || this.speed || 1),
        isPlaying: !!payload.isPlaying
      }
      this.applyRestoredAudioState()
      this.showBanner('Session restored', 'success', 2200)
    },

    restoreAudioState() {
      try {
        this.restoredAudioState = JSON.parse(localStorage.getItem('telawa.audioState') || 'null')
      } catch (e) { console.error(e) }
    },

    applyRestoredAudioState() {
      const state = this.restoredAudioState
      if (!state || !this.audioElement || !state.src) return
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
            }).catch(() => {})
          }
        } catch (e) {}
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

    // Show first-time user tips
    showFirstTimeTips() {
      if (!this.onboardingDismissed && !this.hasVerses) {
        setTimeout(() => {
          this.showBanner(
            '💡 Tip: Start with "Quick Plan" to create a personalized memorization schedule',
            'info',
            5000
          )
        }, 1000)

        setTimeout(() => {
          this.showBanner(
            '📖 Tip: Try the "Quickstart Demo" with Surah Al-Fatiha to see how it works',
            'info',
            8000
          )
        }, 6000)
      }
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
      this.tab = this.currentMode
      this.showTools = true
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
      this.tab = newMode
      this.persistUiState()
      this.showBanner(`Switched to ${newMode === 'beginner' ? 'Beginner' : 'Advanced'} Mode`, 'success', 2000)
    },
    updateTabAndSync(tabName) {
      this.tab = tabName
      this.currentMode = tabName === 'advanced' ? 'advanced' : 'beginner'
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
              // TODO: Seek to word position if possible
            }
          }
        }
      })
    },
    getRemainingTimeDetails() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return null

      const repetitionCount = this.currentMode === 'beginner'
        ? (this.beginner.repeats || 1)
        : (this.repeatAndLoopAudio ? (this.advancedRepeats || 1) : 1)

      const avgAudioLengthPerAyah = 8
      const speedFactor = this.speed || 1
      const reviewTimePerAyah = 5

      let totalAudioSeconds = 0
      let totalReviewSeconds = 0

      remainingItems.forEach(item => {
        const verse = item.verse || item
        const verseLength = verse.arabic?.length || 100
        const verseComplexity = Math.min(2, Math.max(0.8, verseLength / 150))

        totalAudioSeconds += (avgAudioLengthPerAyah / speedFactor) * verseComplexity * repetitionCount
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
        repetitionCount: repetitionCount
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
      this.tab = 'beginner'
      this.showPlannerModal = false
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
          surahName = found?.name_simple || `Surah ${surahId}`
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

        this.showBanner(`✓ Saved ${this.verses.length} verses from ${surahName} for offline reading!`, 'success', 3000)
        this.confettiActive = true
        setTimeout(() => { this.confettiActive = false }, 1200)
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

      // If data is not ready, return plain text
      if (!this.isDataReady) {
        return verse.arabic
      }

      // Tajweed takes priority
      if (this.tajweedEnabled) {
        if (verse.arabic_tajweed) {
          return this.normalizeTajweedMarkup(verse.arabic_tajweed)
        }
        return verse.arabic
      }

      // Word by word highlighting
      if (this.showWordByWord && this.wordByWordAudioEnabled && !this.tajweedEnabled) {
        return this.splitArabicIntoWords(verse)
      }

      return verse.arabic
    },

    // Add sanitize method
    sanitizeHtml(html) {
      if (!html) return ''
      // Remove any script tags
      return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
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
        .replace(/<\s*tajweed\b([^>]*)class=['"]?([a-zA-Z0-9_-]+)['"]?([^>]*)>/gi, '<span class="tajweed-mark tajweed-$2"$1$3>')
        .replace(/<\s*\/\s*tajweed\s*>/gi, '</span>')

      Object.entries(markerMap).forEach(([marker, className]) => {
        const escapedMarker = marker.replace('[', '\\[')
        normalized = normalized.replace(new RegExp(escapedMarker, 'g'), `<span class="tajweed-mark tajweed-${className}" data-tajweed="`)
      })

      normalized = normalized
        .replace(/\[/g, '">')
        .replace(/\]/g, '</span>')
        .replace(/data-tajweed="([^"]*)">/g, (fullMatch, meta) => {
          const cleanMeta = String(meta || '').replace(/"/g, '&quot;')
          return `data-tajweed="${cleanMeta}">`
        })
        .replace(/<\/span><\/span>/g, '</span>')

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

      // If we have word objects from API, use them
      if (verse.words && verse.words.length > 0) {
        let html = ''
        verse.words.forEach((word, idx) => {
          const isActive = this.currentHighlightedVerseKey === verse.key && this.currentWordIndex === idx
          const highlightClass = isActive ? 'highlighted' : ''

          html += `<word class="wbw-word ${highlightClass}" 
                     data-word-index="${idx}" 
                     data-verse-key="${verse.key}"
                     data-word-audio="${word.audio || ''}">
                ${word.ar}
              </word> `
        })
        return html
      }

      // Fallback: Split by spaces
      const words = verse.arabic.split(/\s+/)
      let html = ''
      words.forEach((word, idx) => {
        const isActive = this.currentHighlightedVerseKey === verse.key && this.currentWordIndex === idx
        const highlightClass = isActive ? 'highlighted' : ''

        html += `<word class="wbw-word ${highlightClass}" 
                   data-word-index="${idx}" 
                   data-verse-key="${verse.key}">
              ${word}
            </word> `
      })
      return html
    },

    async getWordTimings(verse, actualDuration = null) {
      if (!verse.words || verse.words.length === 0) {
        const arabicText = verse.arabic
        const words = arabicText.split(/\s+/).filter(w => w.trim().length > 0)
        const totalChars = arabicText.replace(/[^ء-ي]/g, '').length
        const totalDuration = actualDuration || Math.max(5, Math.min(45, totalChars * 0.12))

        const timestamps = []
        let currentTime = 0

        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          const wordChars = word.replace(/<[^>]+>/g, '').replace(/[^ء-ي]/g, '').length
          const wordDuration = (wordChars / totalChars) * totalDuration

          timestamps.push({
            index: i,
            start: currentTime,
            end: currentTime + wordDuration
          })
          currentTime += wordDuration
        }

        return timestamps
      }

      const cacheKey = `${verse.key}_${this.reciterId}`
      if (this.wordTimestampsMap.has(cacheKey)) {
        return this.wordTimestampsMap.get(cacheKey)
      }

      const timestamps = []
      const totalDuration = actualDuration || Math.max(5, Math.min(45, verse.arabic.replace(/[^ء-ي]/g, '').length * 0.12))
      const totalChars = verse.arabic.replace(/[^ء-ي]/g, '').length
      let currentTime = 0

      for (let i = 0; i < verse.words.length; i++) {
        const word = verse.words[i]
        const wordChars = word.ar.replace(/[^ء-ي]/g, '').length
        const wordDuration = (wordChars / totalChars) * totalDuration

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
      this.stopWordHighlighting()

      if (!this.showWordByWord || !this.wordByWordAudioEnabled) {
        return
      }

      this.currentHighlightedVerseKey = verse.key
      this.currentWordIndex = -1

      // Prefer word timings derived from the verse content and actual audio duration.
      const duration = Number(this.audioElement?.duration) || null
      const timestamps = await this.getWordTimings(verse, duration)
      if (!timestamps || !timestamps.length) return

      const updateHighlight = () => {
        if (!this.audioElement || !this.audioElement.currentTime || !this.isPlaying) return

        const currentTime = this.audioElement.currentTime
        let activeIndex = -1

        for (let i = 0; i < timestamps.length; i++) {
          if (currentTime >= timestamps[i].start && currentTime <= timestamps[i].end) {
            activeIndex = i
            break
          }
        }

        if (this.currentWordIndex !== activeIndex) {
          this.currentWordIndex = activeIndex
          this.updateWordHighlight(verse.key, activeIndex)
        }
      }

      this.wordHighlightHandler = updateHighlight
      this.audioElement.addEventListener('timeupdate', this.wordHighlightHandler)
    },

    updateWordHighlight(verseKey, activeIndex) {
      this.$nextTick(() => {
        // Find all word elements in the active verse
        const words = document.querySelectorAll(`.verse-card[data-verse-key="${verseKey}"] .wbw-word`)

        words.forEach((word, idx) => {
          if (idx === activeIndex) {
            word.classList.add('highlighted')
            // Scroll into view
            word.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          } else {
            word.classList.remove('highlighted')
          }
        })
      })
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
      if (this.audioElement && this.wordHighlightHandler) {
        this.audioElement.removeEventListener('timeupdate', this.wordHighlightHandler)
        this.wordHighlightHandler = null
      }
      this.currentWordIndex = -1
      this.currentHighlightedVerseKey = null

      document.querySelectorAll('.verse-arabic word.highlighted').forEach(word => {
        word.classList.remove('highlighted')
      })
    },

    // Audio methods
    initAudio() {
      this.audioElement = this.$refs.audio
      if (!this.audioElement) return

      this.audioElement.removeEventListener('timeupdate', this.audioTimeUpdate)
      this.audioElement.removeEventListener('ended', this.audioEnded)
      this.audioElement.removeEventListener('error', this.audioError)

      this.audioTimeUpdate = () => {
        this.currentTime = this.audioElement.currentTime
        this.duration = this.audioElement.duration
      }

      this.audioEnded = () => {
        this.isPlaying = false
        this.stopWordHighlighting()
        if (this.playMode === 'auto') {
          setTimeout(() => this.next(), (this.delay || 1) * 1000)
        }
      }

      this.audioError = (e) => {
        console.error('Audio error:', e)
        this.isPlaying = false
        this.stopWordHighlighting()
        this.showBanner('Audio playback error', 'error', 3000)
      }

      this.audioElement.addEventListener('timeupdate', this.audioTimeUpdate)
      this.audioElement.addEventListener('ended', this.audioEnded)
      this.audioElement.addEventListener('error', this.audioError)
    },

    async playVerse(verse) {
      if (!verse) {
        console.error('No verse provided')
        return
      }

      if (!verse.audio) {
        this.showBanner(`Audio not available for verse ${verse.number}`, 'info', 2000)
        return
      }

      // Toggle pause/play if re-selecting the currently active verse.
      if (this.activeKey === verse.key && this.audioElement?.src) {
        this.togglePlay()
        return
      }

      // Stop current playback and highlighting
      this.stopWordHighlighting()
      if (this.audioElement) {
        try { this.audioElement.pause() } catch (e) { }
      }

      this.activeKey = verse.key
      this.activeVerseKey = verse.key

      if (!this.audioElement) {
        this.audioElement = this.$refs.audio
        if (!this.audioElement) {
          this.showBanner('Audio system not ready', 'error', 3000)
          return
        }
        this.initAudio()
      }

      const audioUrl = this.normalizeAudioUrl(verse.audio)
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

            // Start word highlighting AFTER audio starts playing
            if (this.wordByWordAudioEnabled) {
              // Small delay to ensure audio is fully playing
              setTimeout(() => {
                this.startWordHighlighting(verse)
              }, 100)
            }
            resolve()
          } catch (err) {
            this.isPlaying = false
            reject(err)
          }
          this.audioElement.removeEventListener('canplay', canPlayHandler)
        }

        const errorHandler = (err) => {
          clearTimeout(timeout)
          this.isPlaying = false
          reject(err)
          this.audioElement.removeEventListener('error', errorHandler)
        }

        this.audioElement.addEventListener('canplay', canPlayHandler)
        this.audioElement.addEventListener('error', errorHandler, { once: true })
      }).catch(err => {
        console.error('playVerse failed:', err)
        this.isPlaying = false
        this.showBanner('Failed to play audio', 'error', 3000)
      })
    },

    togglePlay() {
      if (!this.audioElement?.src) return
      if (this.audioElement.paused) {
        this.audioElement.play()
        this.isPlaying = true
      } else {
        this.audioElement.pause()
        this.isPlaying = false
      }
    },

    applySpeed() {
      if (this.audioElement) this.audioElement.playbackRate = this.speed
    },

    next() {
      if (this.canNext) {
        this.sessionCompleted = false
        this.queueIndex++
        const entry = this.queue[this.queueIndex]
        const verseKey = entry?.verse?.key || entry?.key
        if (verseKey) {
          this.activeVerseKey = verseKey
          this.activeKey = verseKey
          this.$nextTick(() => {
            const el = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            this.$forceUpdate()
          })
        }
        const v = this.queue[this.queueIndex]
        if (v) {
          const verse = v.verse || v
          this.playVerse(verse)
        }
        return
      }
      this.handleSessionComplete()
    },

    prev() {
      if (!this.canPrev) return
      this.sessionCompleted = false
      this.queueIndex--
      const entry = this.queue[this.queueIndex]
      const verseKey = entry?.verse?.key || entry?.key
      if (verseKey) {
        this.activeVerseKey = verseKey
        this.activeKey = verseKey
        this.$nextTick(() => {
          this.$forceUpdate()
        })
      }
      const v = this.queue[this.queueIndex]
      if (v) {
        const verse = v.verse || v
        this.playVerse(verse)
      }
    },

    closePlayer() {
      this.flushPlaybackTime()
      this.stopWordHighlighting()
      if (this.audioElement) {
        this.audioElement.pause()
        this.audioElement.src = ''
      }
      this.playerVisible = false
      this.isPlaying = false
      this.playerMenuOpen = false
      this.persistAudioState()
    },

    async loadVerses() {
      if (!this.chapterId) return

      this.isDataReady = false

      try {
        const [audioRes, translationRes, translitRes, tajweedRes] = await Promise.all([
          getSurahEdition(this.chapterId, this.reciterId || DEFAULT_ALQURAN_RECITER),
          getSurahEdition(this.chapterId, 'en.asad'),
          getSurahEdition(this.chapterId, 'en.transliteration'),
          getSurahEditions(this.chapterId, this.reciterId || DEFAULT_ALQURAN_RECITER)
        ])

        const audioSurah = audioRes.data?.data
        const translationSurah = translationRes.data?.data
        const translitSurah = translitRes.data?.data
        const tajweedEdition = (tajweedRes.data?.data || []).find(entry => entry?.edition?.identifier === 'quran-tajweed')

        const audioAyahs = audioSurah?.ayahs || []
        const translationByNumber = new Map((translationSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const translitByNumber = new Map((translitSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const tajweedByNumber = new Map((tajweedEdition?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))

        const start = this.rangeStart
        const end = this.rangeEnd

        const mappedVerses = audioAyahs
          .filter(ayah => ayah.numberInSurah >= start && ayah.numberInSurah <= end)
          .map(ayah => {
            const key = `${this.chapterId}:${ayah.numberInSurah}`
            const transliteration = translitByNumber.get(ayah.numberInSurah) || ''
            const translation = translationByNumber.get(ayah.numberInSurah) || ''
            const arabicWords = String(ayah.text || '').split(/\s+/).filter(Boolean)
            const translitWords = String(transliteration).split(/\s+/).filter(Boolean)
            const translationWords = String(translation).split(/\s+/).filter(Boolean)

            return {
              key,
              number: ayah.numberInSurah,
              arabic: ayah.text || '',
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

        if (this.currentMode === 'beginner') {
          this.beginner.verses = mappedVerses
        } else {
          this.advanced.verses = mappedVerses
        }

        this.buildQueue()

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

    buildQueue() {
      const config = this.currentMode === 'beginner' ? this.beginner : this.advanced
      const verses = config.verses

      if (!verses || verses.length === 0) {
        this.queue = []
        this.queueIndex = 0
        return
      }

      // Get repetition count from current mode
      let rep = 1
      if (this.currentMode === 'beginner') {
        rep = this.beginner.repeats || 1
      } else if (this.currentMode === 'advanced') {
        rep = this.advanced.repeatAndLoopAudio ? (this.advanced.advancedRepeats || 1) : 1
      }

      const ord = 'seq'
      const q = []

      if (ord === 'seq') {
        for (let r = 0; r < rep; r++) {
          verses.forEach(verse => {
            q.push({ verse, repeatCount: r + 1, totalRepeats: rep })
          })
        }
      }

      this.queue = q
      this.queueIndex = 0

      // Save to current mode
      if (this.currentMode === 'beginner') {
        this.beginner.queue = q
        this.beginner.queueIndex = 0
      } else {
        this.advanced.queue = q
        this.advanced.queueIndex = 0
      }
    },

    estimateQueueDuration(queue) {
      const avgVerseDuration = 45
      return Math.ceil(queue.length * avgVerseDuration / 60)
    },

    rebuildQueue() {
      this.buildQueue()
    },

    async startSession() {
      const config = this.sessionConfig

      if (!config.chapterId || config.chapterId === 0) {
        this.showTools = true
        this.showBanner('Please select a surah first', 'info', 3000)
        return
      }

      if (!this.validateSettings()) {
        return
      }

      this.applySessionConfig(config)
      this.persistModeState(this.currentMode)
      this.persistUiState()

      const currentVerses = this.currentMode === 'beginner' ? this.beginner.verses : this.advanced.verses

      if (!currentVerses || currentVerses.length === 0) {
        await this.loadVerses()
      }

      const updatedVerses = this.currentMode === 'beginner'
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
      this.buildQueue()

      const builtQueue = this.currentMode === 'beginner'
        ? this.beginner.queue
        : this.advanced.queue

      if (!builtQueue || builtQueue.length === 0) {
        this.showBanner('Nothing to play. Check repeat/loop settings.', 'error')
        return
      }

      // Start from beginning
      this.queueIndex = 0
      const first = builtQueue[0]

      if (first && first.verse) {
        this.activeKey = first.verse.key
        this.activeVerseKey = first.verse.key
        await this.$nextTick()

        // Apply speed before playing
        if (this.audioElement) {
          this.audioElement.playbackRate = this.speed
        }

        await this.playVerse(first.verse)
      }

      // Close the offcanvas panel
      this.showTools = false

      // Show confirmation banner
      this.showBanner(`Session started with ${builtQueue.length} verses to memorize`, 'success', 2000)
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

    showBanner(message, kind = 'info', ttlMs = 3500, action = null) {
      if (this.bannerTimer) clearTimeout(this.bannerTimer)
      this.banner = { message, kind, at: Date.now(), actionKey: action?.key || '', actionLabel: action?.label || '' }
      this.bannerTimer = setTimeout(() => {
        if (this.banner && Date.now() - this.banner.at >= ttlMs) this.banner = null
      }, ttlMs + 50)
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
    },

    handleSessionComplete() {
      if (!this.verses.length) return
      this.sessionCompleted = true
      this.showBanner('Session complete', 'success', 4500)
    },

    handlePrimaryAction() {
      if (this.isPlaying) {
        if (this.audioElement) this.audioElement.pause()
        this.isPlaying = false
        return
      }
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner('Choose a valid surah and ayah range before starting.', 'info', 2600)
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

      if (config.rangeStart > config.rangeEnd) {
        errors.push('Invalid verse range')
      }

      if (this.currentMode === 'advanced' && config.repeatAndLoopAudio && config.advancedRepeats < 1) {
        errors.push('Repetition count must be at least 1')
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
      this.loadVerses()
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
      this.sectionOpen[key] = !this.sectionOpen[key]
    },

    // Persistence methods
    loadUiState() {
      try {
        const raw = localStorage.getItem('telawa.uiState')
        if (raw) {
          const state = JSON.parse(raw)
          this.theme = state.theme || this.theme
          this.tab = state.tab || this.tab
          this.currentMode = state.currentMode || 'beginner'
          this.showTranslation = state.showTranslation ?? this.showTranslation
          this.showTransliteration = state.showTransliteration ?? this.showTransliteration
          this.showWordByWord = state.showWordByWord ?? this.showWordByWord
          this.wordByWordAudioEnabled = state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
          this.fontScale = state.fontScale ?? this.fontScale
          this.uiScale = Number(state.uiScale ?? this.uiScale)
          this.enScale = Number(state.enScale ?? this.enScale)
          this.quranFont = state.quranFont || this.quranFont
          this.script = state.script || this.script
          this.sectionOpen = { ...this.sectionOpen, ...(state.sectionOpen || {}) }
          this.onboardingDismissed = state.onboardingDismissed ?? false
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
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord,
          wordByWordAudioEnabled: this.wordByWordAudioEnabled,
          fontScale: this.fontScale,
          uiScale: this.uiScale,
          enScale: this.enScale,
          quranFont: this.quranFont,
          script: this.script,
          sectionOpen: this.sectionOpen,
          onboardingDismissed: this.onboardingDismissed,
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
            target.activeKey = state.activeKey || null
            target.queueIndex = Number(state.queueIndex || 0)
            // Keep a parallel pointer for the rendered/highlighted verse.
            if (mode === this.currentMode) {
              this.activeVerseKey = state.activeVerseKey || state.activeKey || null
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
    },

    // Data loading methods
    async loadChapters() {
      try {
        const res = await axios.get('https://api.quran.com/api/v4/chapters', { params: { language: 'en' } })
        this.chapters = res.data?.chapters || []
        if (this.chapterId) await this.loadChapter()
      } catch (e) { console.error(e) }
    },

    async loadChapter() {
      const chapterId = this.chapterId
      if (!chapterId) {
        this.currentChapter = null
        return
      }
      this.currentChapter = this.chapters.find(c => c.id === chapterId)
      const max = this.currentChapter?.verses_count || 286

      if (this.currentMode === 'beginner') {
        this.beginner.rangeEnd = Math.min(this.beginner.rangeEnd, max)
        this.beginner.rangeStart = Math.max(1, this.beginner.rangeStart)
      } else {
        this.advanced.rangeEnd = Math.min(this.advanced.rangeEnd, max)
        this.advanced.rangeStart = Math.max(1, this.advanced.rangeStart)
      }
      await this.loadVerses()
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

    beginPlan() {
      this.onboardingDismissed = true
      this.showTools = true
    },

    setGoal(mode) {
      this.tab = mode;
      this.onboardingStep = 2;
    },

    startWithFatiha() {
      this.chapterId = 1;
      this.rangeStart = 1;
      this.rangeEnd = 7;
      this.onboardingDismissed = true;
      this.loadChapter();
    },

    openSetup() {
      this.onboardingDismissed = true;
      this.showTools = true;
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
      this.delay = 1
      if (this.currentMode === 'advanced') {
        this.repeatAndLoopAudio = false
        this.advancedRepeats = 1
        this.chainingConfig = { step: 1, goal: 'memorise', style: 'sequential' }
      } else {
        this.beginnerRepeats = 1
      }
      this.playMode = 'auto'
      this.order = 'seq'
      this.blurAdjacent = false
      this.focusMode = false
      this.applySpeed()
      this.rebuildQueue()
      this.persistAllState()
    },

    adjustRange() {
      const max = this.currentChapter?.verses_count || 286
      this.rangeStart = Math.max(1, Math.min(this.rangeStart, max))
      this.rangeEnd = Math.max(this.rangeStart, Math.min(this.rangeEnd, max))
      this.loadVerses()
    },

    onChapterChange(event) {
      this.chapterId = parseInt(event.target.value)
      this.loadChapter()
    },

    refreshVerses() { this.loadVerses() },

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
  --bg: #15110f;
  --surface: rgba(33, 27, 24, 0.88);
  --surface-strong: rgba(44, 36, 31, 0.94);
  --border: rgba(255, 235, 214, 0.10);
  --text: #f1e7dc;
  --text-muted: #bcae9f;
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

.onboarding-cta {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.cta-primary-large {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 40px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.cta-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(154, 103, 56, 0.3);
}

.cta-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 12px 24px;
  border-radius: 40px;
  cursor: pointer;
  transition: all 0.2s;
}

.cta-secondary:hover {
  background: var(--accent-light);
  border-color: var(--accent);
}

/* Onboarding Welcome Styles */
.onboarding-welcome {
  margin-bottom: 32px;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.onboarding-card {
  background: linear-gradient(135deg, var(--surface), var(--accent-light));
  border-radius: 24px;
  padding: 28px;
  border: 1px solid var(--accent-soft);
  text-align: center;
}

.onboarding-icon {
  font-size: 3rem;
  color: var(--accent);
  margin-bottom: 16px;
}

.onboarding-card h3 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  color: var(--text);
}

.onboarding-card > p {
  color: var(--text-muted);
  margin-bottom: 24px;
  font-size: 0.9rem;
}

.onboarding-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  padding: 12px 20px;
  border-radius: 16px;
  flex: 1;
  min-width: 160px;
  text-align: left;
}

.step-number {
  width: 32px;
  height: 32px;
  background: var(--accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
}

.step-content {
  display: flex;
  flex-direction: column;
}

.step-content strong {
  font-size: 0.85rem;
  color: var(--text);
}

.step-content span {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.step-arrow {
  color: var(--accent);
  font-size: 1.2rem;
}

.onboarding-tips {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.onboarding-tips .tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--surface);
  padding: 6px 14px;
  border-radius: 40px;
}

.onboarding-tips .tip i {
  color: var(--accent);
  font-size: 0.85rem;
}

/* Responsive */
@media (max-width: 768px) {
  .onboarding-steps {
    flex-direction: column;
  }

  .step-arrow {
    transform: rotate(90deg);
  }

  .step {
    width: 100%;
  }

  .onboarding-card {
    padding: 20px;
  }
}

/* Player Speed Controls */
.player-speed-controls {
  display: flex;
  gap: 4px;
  background: var(--accent-light);
  padding: 4px 8px;
  border-radius: 40px;
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

  .chaining-hero {
    flex-direction: column;
  }

  .chaining-progress,
  .chain-choice-grid,
  .chain-choice-grid-two {
    grid-template-columns: 1fr;
  }

  .chain-step-actions.split {
    flex-direction: column-reverse;
    align-items: stretch;
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
  padding: 4px 6px;
  margin: 2px;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 1.2rem;
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
.verse-arabic.tajweed-enabled .tajweed-ghn + .tajweed-mark {
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
  animation: tabPulse 0.3s ease-out;
}

@keyframes tabPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--accent);
  }

  50% {
    transform: scale(1.02);
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
  margin-top: 4px;
  line-height: 1.4;
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
  padding: 20px;
  transition: all 0.2s ease;
  border: 1px solid var(--border);
  position: relative;
  direction: ltr;
  overflow: hidden;
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

.verse-card.focus-mode {
  opacity: 0.38;
}

.verse-card.blurred {
  filter: blur(4px);
  opacity: 0.22;
  transform: scale(0.985);
  transition: filter 0.3s ease, transform 0.2s, box-shadow 0.2s, border-color 0.2s, opacity 0.2s ease;
}

.verse-card.blurred:hover {
  filter: blur(0px);
  opacity: 0.55;
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
  width: min(var(--tools-width), 100vw);
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
}

.tools-tabs button {
  flex: 1;
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
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
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

.sheet {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  padding: 16px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  margin-top: 4px;
  line-height: 1.4;
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
.verses-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 32px;
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

.chaining-setup {
  overflow: hidden;
}

.chaining-wizard {
  padding: 20px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg-elevated) 100%);
}

.chaining-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.chaining-kicker {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.chaining-hero h3 {
  margin-bottom: 6px;
  font-size: 1.3rem;
  color: var(--text);
}

.chaining-hero p {
  max-width: 46ch;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.chaining-progress-chip {
  white-space: nowrap;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid var(--accent-soft);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.76rem;
  font-weight: 600;
}

.chaining-progress {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.chain-progress-step {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.chain-progress-step span {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border-radius: 50%;
  background: var(--border);
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.chain-progress-step strong {
  display: block;
  font-size: 0.86rem;
  color: var(--text);
}

.chain-progress-step.active,
.chain-progress-step.done {
  border-color: var(--accent-soft);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.05);
}

.chain-progress-step.active span,
.chain-progress-step.done span {
  background: var(--accent);
  color: #fff;
}

.chain-progress-step.active {
  transform: translateY(-1px);
}

.chaining-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 18px;
}

.chain-step-copy h4 {
  margin-bottom: 4px;
  font-size: 1rem;
  color: var(--text);
}

.chain-step-copy p {
  font-size: 0.84rem;
  color: var(--text-muted);
}

.chain-choice-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.chain-choice-grid-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chain-choice-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.chain-choice-card strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-size: 0.92rem;
}

.chain-choice-card span {
  display: block;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.chain-choice-card:hover,
.chain-choice-card.active {
  border-color: var(--accent);
  box-shadow: 0 14px 28px rgba(154, 103, 56, 0.12);
  transform: translateY(-1px);
}

.chain-session-preview {
  background: var(--accent-light);
  border: 1px solid var(--accent-soft);
  border-radius: 16px;
  padding: 14px 16px;
}

.chain-preview-line {
  margin-bottom: 4px;
  color: var(--text);
  font-weight: 600;
  font-size: 0.84rem;
}

.chain-session-preview small {
  color: var(--text-muted);
}

.chain-step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.chain-step-actions.split {
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.chain-secondary-btn {
  min-width: 110px;
}

/* Chaining UI */
.chaining-viewer {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  margin-top: 24px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.chaining-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-elevated);
  cursor: pointer;
  transition: background 0.2s;
}

.chaining-header:hover {
  background: var(--accent-light);
}

.chaining-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--accent);
}

.chaining-title i {
  font-size: 1.2rem;
}

.chaining-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
}

.chaining-badge {
  background: var(--accent);
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.chaining-badge.alt {
  background: var(--border);
  color: var(--text);
}

.chaining-body {
  padding: 20px;
  border-top: 1px solid var(--border);
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg-body);
}

.chain-timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.chain-step {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 10px 16px;
  border-radius: 12px;
  min-width: 120px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.7;
}

/* Wizard Onboarding CSS */
.onboarding-wizard {
  padding: 40px;
  text-align: center;
}

.wizard-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  max-width: 600px;
  margin: 0 auto;
}

.wizard-choices {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.wizard-choice-btn {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--surface);
  border: 2px solid var(--border);
  padding: 24px;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  width: 100%;
}

.wizard-choice-btn:hover {
  border-color: var(--accent);
  background: var(--accent-light);
  transform: translateY(-2px);
}

.wizard-choice-btn.primary-choice {
  border-color: var(--accent);
  background: rgba(139, 94, 60, 0.05);
}

.wizard-choice-btn.primary-choice:hover {
  background: var(--accent-light);
}

.choice-icon {
  font-size: 2rem;
  color: var(--accent);
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-body);
  border-radius: 12px;
}

.choice-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.choice-text strong {
  font-size: 1.1rem;
  color: var(--text);
}

.choice-text span {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.wizard-back {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
  margin-top: -10px;
}

.wizard-back:hover {
  background: var(--border);
  color: var(--text);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}


.chain-step:hover {
  border-color: var(--accent);
  opacity: 1;
}

.chain-step.completed {
  border-color: var(--accent-soft);
  background: var(--accent-light);
  opacity: 0.8;
}

.chain-step.active {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
  opacity: 1;
  box-shadow: 0 4px 12px rgba(139, 94, 60, 0.2);
  transform: translateY(-2px);
}

.step-indicator {
  margin-right: 12px;
  font-size: 1.2rem;
}

.chain-step.completed .step-indicator {
  color: var(--accent);
}

.chain-step.active .step-indicator {
  color: white;
}

.step-content {
  display: flex;
  flex-direction: column;
}

.step-phase {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

.step-verse {
  font-weight: 600;
  font-size: 0.95rem;
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
  font-size: calc(0.82rem * var(--en-scale, 1));
  color: #5a6b63;
  line-height: 1.6;
  padding-top: 12px;
  margin-top: 10px;
  border-top: 1px solid var(--border);
  display: block;
  opacity: 0.92;
}

.verse-transliteration {
  font-size: calc(0.88rem * var(--en-scale, 1));
  color: var(--text-muted);
  font-style: italic;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  line-height: 1.5;
  opacity: 0.98;
}

.verse-words {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  direction: rtl;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.word-item {
  background: var(--accent-light);
  padding: 6px 12px;
  border-radius: 20px;
  display: inline-flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
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

/* Confetti */
.confetti {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 140;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -10px;
  width: 8px;
  height: 12px;
  border-radius: 3px;
  opacity: 0.9;
  animation: confetti-fall 1.35s ease-in forwards;
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

@keyframes confetti-fall {
  0% {
    transform: translateY(-20px) rotate(0deg);
    opacity: 0;
  }

  10% {
    opacity: 0.95;
  }

  100% {
    transform: translateY(110vh) rotate(480deg);
    opacity: 0;
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
  background: rgba(18, 18, 18, 0.9);
  border-left-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .sheet-section {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(30, 30, 40, 0.45);
}

[data-theme="dark"] .select,
[data-theme="dark"] .input {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.55);
}

[data-theme="dark"] .switch {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
}

[data-theme="dark"] .verse-translation {
  color: #a0a0b0;
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
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: var(--bg-body);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
  animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
  .continue-session-card {
    flex-direction: column;
    align-items: stretch;
  }

  .continue-session-btn,
  .btn-primary,
  .btn-secondary,
  .tools-btn,
  .player-btn,
  .toolbar-chip,
  .tools-tabs button {
    min-height: 44px;
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
    flex-wrap: wrap;
    gap: 12px;
  }

  .player-progress-wrap {
    order: 4;
    width: 100%;
  }

  .analytics-grid {
    grid-template-columns: 1fr;
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
}
</style>
