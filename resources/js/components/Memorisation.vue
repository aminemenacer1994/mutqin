<template>
  <div class="app" :data-theme="theme">
    <div v-if="banner" class="banner" :class="banner.kind">
      <span>{{ banner.message }}</span>
      <div class="banner-actions">
        <button v-if="banner.actionLabel" class="banner-action" @click="runBannerAction">{{ banner.actionLabel
          }}</button>
        <button class="banner-x" @click="banner = null" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>


    <!-- Main Content -->
    <div class="main" :class="{ 'tools-open': showTools }">

      <div class="content">
        <section v-if="showOnboarding" class="hero-card">
          <div class="hero-copy">
            <div class="hero-kicker">Focused hifz system</div>
            <h1 class="hero-title">Memorise and retain Quran intelligently.</h1>
            <p class="hero-sub">Structured memorisation, automatic revision, and retention tracking in one focused
              system.</p>
          </div>
          <div class="hero-flow">
            <div class="hero-step"><span>1</span><strong>Read</strong></div>
            <div class="hero-step"><span>2</span><strong>Repeat</strong></div>
            <div class="hero-step"><span>3</span><strong>Review</strong></div>
            <div class="hero-step"><span>4</span><strong>Retain</strong></div>
          </div>
          <div class="hero-points">
            <div class="hero-point"><i class="bi bi-shield-check"></i><span>Weak ayahs are tracked automatically.</span>
            </div>
            <div class="hero-point"><i class="bi bi-clock-history"></i><span>Reviews appear before forgetting.</span>
            </div>
            <div class="hero-point"><i class="bi bi-magic"></i><span>Sessions are generated automatically.</span></div>
          </div>
          <div class="hero-actions">
            <button class="cta cta-ghost" @click="tab = 'analytics'"><i class="bi bi-bar-chart"></i><span>See
                stats</span></button>
            <button class="cta cta-primary" @click="beginPlan"><i class="bi bi-play-circle"></i><span>{{
              onboardingPrimaryLabel }}</span></button>
            <button class="cta cta-ghost" @click="showTools = true"><i class="bi bi-sliders"></i><span>Open
                setup</span></button>
          </div>
        </section>

        <div class="session-rail" v-if="currentChapter && hasVerses">
          <div class="session-rail-top">
            <div class="session-rail-copy">
              <div class="session-rail-kicker">Current session</div>
              <div class="session-rail-title">{{ currentChapter.name_simple }}</div>
              <div class="session-rail-meta">Ayah {{ currentPosition }}/{{ totalVerses }} · Remaining {{ remainingAyahs
              }} · {{ sessionTypeInfo.label }} · {{ progressPercent }}%</div>
            </div>
            <div class="session-rail-actions">
              <button class="rail-btn rail-btn-ghost" @click="showTools = true">
                <i class="bi bi-layout-sidebar-inset"></i><span>Plan</span>
              </button>
              <button class="rail-btn rail-btn-primary" @click="handlePrimaryAction">
                <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
                <span>{{ railPrimaryLabel }}</span>
              </button>
            </div>
          </div>
          <div class="session-rail-stats">
            <div class="rail-stat"><span>Session</span><strong>{{ sessionTypeInfo.label }}</strong></div>
            <div class="rail-stat"><span>Progress</span><strong>{{ progressPercent }}%</strong></div>
            <div class="rail-stat"><span>Remaining</span><strong>{{ remainingAyahs }}</strong></div>
            <div class="rail-stat"><span>ETA</span><strong>{{ etaLabel }}</strong></div>
          </div>
          <div class="mode-indicator" v-if="currentMode === 'advanced' && repeatAndLoopAudio">
            <i class="bi bi-arrow-repeat"></i>
            Loop Mode: {{ advancedRepeats }}x per Ayah
          </div>
          <div class="progress-bar progress-bar-wide">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>

        <div v-if="hasVerses" class="reading-toolbar">
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
          </div>
          <div class="reading-toolbar-group">
            <div class="toolbar-font-wrap">
              <!-- <button class="toolbar-chip" :class="{ active: script === 'uthmani' || fontPickerOpen }"
                @click="toggleFontPicker">
                <i class="bi bi-file-earmark-richtext"></i><span>Quranic fonts</span>
              </button> -->
              <div v-if="fontPickerOpen" class="toolbar-font-menu">
                <button v-for="font in quranFontOptions" :key="font.value" class="toolbar-font-option"
                  :class="{ active: quranFont === font.value }" @click="setQuranFont(font.value)">
                  <span>{{ font.label }}</span>
                </button>
              </div>
            </div>
            <!-- <button class="toolbar-chip" :class="{ active: script === 'uthmani' }" @click="setScriptMode('uthmani')">
              <i class="bi bi-file-earmark-richtext"></i><span>Quranic text</span>
            </button> -->
            <button class="toolbar-chip" :class="{ active: script === 'tajweed' }" @click="setScriptMode('tajweed')">
              <i class="bi bi-palette"></i><span>Tajweed</span>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!hasVerses && !showOnboarding" class="empty">
          <div class="empty-card">
            <div class="empty-icon">﴿</div>
            <h3>Begin your journey</h3>
            <p>{{ nextActionDescription }}</p>
            <div class="empty-actions">
              <button class="cta cta-primary" @click="beginPlan"><i class="bi bi-play-circle"></i><span>{{
                emptyPrimaryLabel }}</span></button>
              <button class="cta cta-ghost" @click="showTools = true"><i class="bi bi-sliders"></i><span>Open
                  setup</span></button>
            </div>
          </div>
        </div>

        <!-- Verses Grid -->
        <!-- Replace the verses-grid section (around line 165) with this: -->
        <div v-else-if="hasVerses" class="verses-grid">
          <!-- Update the verse-card div to include data-verse-key -->
          <div v-for="verse in verses" :key="verse.key" class="verse-card" :data-verse-key="verse.key" :class="{
            active: activeVerseKey === verse.key,
            'focus-mode': focusMode && activeVerseKey !== verse.key,
            blurred: blurAdjacent && activeVerseKey !== verse.key && !isAdjacentVerse(verse)
          }">
            <div class="verse-header">
              <div class="verse-badges">
                <span class="verse-number">Ayah {{ verse.number }}</span>
                <span class="verse-ref">{{ verse.key }}</span>
              </div>

              <div class="verse-actions">
                <button class="verse-play-btn" @click="downloadOfflineVerses" title="Download for offline reading">
                  <i class="bi bi-save"></i>
                </button>
                <button class="verse-play-btn" @click="playVerse(verse)" title="Play verse">
                  <i class="bi bi-play"></i>
                </button>
              </div>
            </div>

            <div class="verse-arabic" dir="rtl" lang="ar" v-html="getHighlightedArabic(verse)"
              :class="{ 'word-highlight-enabled': wordByWordAudioEnabled }">
            </div>

            <!-- TRANSLATION -->
            <div v-if="showTranslation && verse.translation" class="verse-translation">
              {{ verse.translation }}
            </div>

            <div v-if="showTransliteration && verse.transliteration" class="verse-transliteration">
              {{ verse.transliteration }}
            </div>

            <!-- In the verse-words section (around line 165) -->
            <div v-if="showWordByWord && verse.words?.length" class="verse-words">
              <div v-for="(word, wi) in verse.words" :key="wi" class="word-item"
                :class="{ 'word-highlighted': isWordHighlighted(verse.key, wi) }" :data-word-index="wi"
                :data-verse-key="verse.key">
                <span class="word-arabic" dir="rtl">{{ word.ar }}</span>
                <span class="word-meaning">{{ word.en }}</span>
                <button v-if="word.audio && wordByWordAudioEnabled" class="word-audio-btn"
                  @click="playWordAudio(word.audio, `${verse.key}:${wi}`)">
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
            <button :class="{ active: tab === 'beginner' }" @click="tab = 'beginner'">Beginner</button>
            <button :class="{ active: tab === 'advanced' }" @click="tab = 'advanced'">Advanced</button>
          </div>
        </div>

        <div class="tools-body">
          <!-- Beginner Tab - Simplified -->
          <div v-if="tab === 'beginner'" class="sheet">
            <!-- Quick Setup Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('beginner_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-book"></i></span>
                  <span class="st-txt">
                    <span class="st-title">1. What to Memorise</span>
                    <span class="st-sub">Surah and verses</span>
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
                  </div>
                  <div class="field">
                    <label>Verses</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>to</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Audio Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('beginner_audio')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-mic"></i></span>
                  <span class="st-txt">
                    <span class="st-title">2. Audio Settings</span>
                    <span class="st-sub">Reciter and playback</span>
                  </span>
                </span>

              </button>
              <div class="sheet-content" v-show="sectionOpen.beginner_audio">
                <div class="field-stack">
                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                  </div>
                  <div class="field">
                    <label>Speed</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="0.75" v-model="speed"> 0.75x</label>
                      <label class="radio"><input type="radio" value="1" v-model="speed"> 1x</label>
                      <label class="radio"><input type="radio" value="1.25" v-model="speed"> 1.25x</label>
                      <label class="radio"><input type="radio" value="1.5" v-model="speed"> 1.5x</label>
                    </div>
                  </div>
                  <div class="field">
                    <label>Auto-advance</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="auto" v-model="playMode"> Yes</label>
                      <label class="radio"><input type="radio" value="manual" v-model="playMode"> No (manual)</label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Inside beginner tab, after Speed setting in Audio Settings section -->
            <div class="field">
              <label>Repetition Count</label>
              <select v-model="beginnerRepeats" class="select">
                <option v-for="n in repeatOptions" :key="n" :value="n">{{ n }} {{ n === 1 ? 'time' : 'times' }}</option>
              </select>
            </div>

            <button class="start-btn" @click="startSession" :disabled="!hasSelectedSurah">
              <i class="bi bi-play-fill"></i> Start Memorising
            </button>
          </div>

          <!-- Advanced Tab - Simplified -->
          <div v-if="tab === 'advanced'" class="sheet">
            <!-- Setup Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-compass"></i></span>
                  <span class="st-txt">
                    <span class="st-title">1. Session Setup</span>
                    <span class="st-sub">Surah and verses</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-stack">
                  <div class="field">
                    <label>Surah</label>
                    <select v-model="chapterId" @change="loadChapter" class="select">
                      <option :value="0">Choose a surah...</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.id }}. {{ c.name_simple }}</option>
                    </select>
                  </div>
                  <div class="field">
                    <label>Verses</label>
                    <div class="range range-single">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>to</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                  </div>
                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <!-- Playback Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_playback')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-repeat"></i></span>
                  <span class="st-txt">
                    <span class="st-title">2. Playback</span>
                    <span class="st-sub">Speed, repeats, mode</span>
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
                  </div>
                  <div class="field">
                    <label>Auto-advance</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio"><input type="radio" value="auto" v-model="playMode"> Yes</label>
                      <label class="radio"><input type="radio" value="manual" v-model="playMode"> No (manual)</label>
                    </div>
                  </div>
                  <div class="field">
                    <label>Delay between verses</label>
                    <select v-model.number="delay" class="select">
                      <option v-for="d in [0, 1, 2, 3, 5]" :key="d" :value="d">{{ d }} second{{ d !== 1 ? 's' : '' }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <div class="field">
              <label>Repetition Count</label>
              <select v-model="advancedRepeats" class="select">
                <option v-for="n in repeatOptions" :key="n" :value="n">{{ n }} {{ n === 1 ? 'time' : 'times' }}</option>
              </select>

              <input type="checkbox" v-model="repeatAndLoopAudio">
            </div>
            <div class="field checkbox">
              <label class="switch">
                <input type="checkbox" v-model="repeatAndLoopAudio">
                <span class="switch-ui"></span>
                <span class="switch-text">Repeat & Loop Audio (Āyah by Āyah)</span>
              </label>
              <small class="field-hint">Loop each ayah multiple times before advancing</small>
            </div>

            <!-- Practice Section -->
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_practice')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-stars"></i></span>
                  <span class="st-txt">
                    <span class="st-title">3. Practice Mode</span>
                    <span class="st-sub">Order and focus</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_practice }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_practice">
                <div class="field-stack">
                  <div class="field">
                    <label>Verse order</label>
                    <div class="radio-group">
                      <label class="radio"><input type="radio" value="seq" v-model="order"> Sequential
                        (1,2,3...)</label>
                      <label class="radio"><input type="radio" value="rand" v-model="order"> Random order</label>
                      <label class="radio"><input type="radio" value="cum" v-model="order"> Cumulative
                        (1,1-2,1-3...)</label>
                    </div>
                  </div>
                  <div class="field checkbox">
                    <label class="switch">
                      <input type="checkbox" v-model="focusMode">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Focus mode (dim other verses)</span>
                    </label>
                  </div>
                  <div class="field checkbox">
                    <label class="switch">
                      <input type="checkbox" v-model="blurAdjacent">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Blur non-active verses (active recall)</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <!-- Saved Sessions -->
            <!-- In advanced tab, wrap saved sessions section with v-if -->
            <section class="sheet-section" v-if="isLoggedIn">
              <button class="sheet-toggle" @click="toggleSection('advanced_saved')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-save"></i></span>
                  <span class="st-txt">
                    <span class="st-title">4. Saved Sessions</span>
                    <span class="st-sub">Save, load, delete</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_saved }"><i
                    class="bi bi-chevron-down"></i></span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_saved">
                <!-- existing saved sessions content -->
              </div>
            </section>

            <!-- Add a message for logged out users -->
            <section class="sheet-section" v-else>
              <div class="sheet-content">
                <div class="field-stack">
                  <div class="field">
                    <div class="pill" style="text-align: center; padding: 16px;">
                      <i class="bi bi-person"></i>
                      <span>Login to save and load sessions</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <button class="start-btn" @click="startSession" :disabled="!hasSelectedSurah">
              <i class="bi bi-play-fill"></i> Start Session
            </button>
          </div>
        </div>

        <div class="tools-footer">
          <button class="tools-btn tools-btn-ghost" @click="resetControls"><i
              class="bi bi-arrow-counterclockwise"></i><span>Reset</span></button>
          <button class="tools-btn tools-btn-ghost" @click="showTools = false"><i
              class="bi bi-x-circle"></i><span>Close</span></button>
          <!-- <button class="tools-btn tools-btn-primary" @click="footerPrimaryAction"><i
              class="bi bi-play-circle"></i><span>{{ footerPrimaryLabel }}</span></button> -->
        </div>
      </aside>
    </div>

    <!-- Replace the entire quiz-overlay div section with this -->
    <div v-if="quizActive" class="quiz-overlay">
      <div class="quiz-card">
        <div class="quiz-header">
          <div>
            <h3 class="quiz-title">Retention Check</h3>
            <p class="quiz-subtitle">{{ quizContextLabel }}</p>
          </div>
          <button class="quiz-close" @click="stopQuiz">×</button>
        </div>

        <!-- Quiz Progress -->
        <div class="quiz-progress" v-if="!quizComplete">
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" :style="{ width: ((quizIndex + 1) / quizQueue.length) * 100 + '%' }"></div>
          </div>
          <div class="quiz-stats">
            <span>{{ quizIndex + 1 }} / {{ quizQueue.length }}</span>
            <span>{{ quizCard?.type === 'flashcard' ? 'Flashcard' : quizCard?.type === 'mcq' ? 'Multiple Choice' :
              'Question' }}</span>
          </div>
        </div>

        <!-- Quiz Summary (Complete) -->
        <div v-if="quizComplete" class="quiz-summary">
          <div class="quiz-summary-icon">🎉</div>
          <h3>Session Complete!</h3>
          <div class="quiz-summary-stats">
            <div class="stat">
              <span class="stat-label">Score</span>
              <span class="stat-value">{{ quizScore }}/{{ quizQueue.length }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Accuracy</span>
              <span class="stat-value">{{ quizAccuracy }}%</span>
            </div>
          </div>
          <div class="quiz-summary-mistakes" v-if="quizMistakes.length">
            <p>Verses to review:</p>
            <div class="mistake-tags">
              <span v-for="m in quizMistakes" :key="m" class="mistake-tag">{{ m }}</span>
            </div>
          </div>
          <div class="quiz-actions">
            <button class="btn-outline" @click="stopQuiz">Close</button>
            <button class="btn-primary" @click="restartQuiz">Try Again</button>
          </div>
        </div>

        <!-- Quiz Card -->
        <div v-else-if="quizCard" class="quiz-body">
          <!-- Flashcard Type -->
          <div v-if="quizCard.type === 'flashcard'">
            <div class="quiz-question">Recite this verse:</div>
            <div class="quiz-arabic" dir="rtl" v-html="quizCard.arabic"></div>
            <button v-if="!quizRevealed" class="quiz-reveal-btn" @click="quizRevealed = true">
              <i class="bi bi-eye"></i> Reveal Answer
            </button>
            <div v-if="quizRevealed" class="quiz-answer">
              <div class="quiz-translation">{{ quizCard.translation }}</div>
              <div class="quiz-grade-buttons">
                <button class="grade-btn" @click="submitQuiz(2)">Again</button>
                <button class="grade-btn" @click="submitQuiz(3)">Hard</button>
                <button class="grade-btn primary" @click="submitQuiz(4)">Good</button>
                <button class="grade-btn" @click="submitQuiz(5)">Easy</button>
              </div>
            </div>
          </div>

          <!-- Multiple Choice Type -->
          <div v-else-if="quizCard.type === 'mcq'">
            <div class="quiz-question">Which verse matches this meaning?</div>
            <div class="quiz-prompt">{{ quizCard.prompt }}</div>
            <div class="quiz-options">
              <button v-for="opt in quizOptions" :key="opt.key" class="quiz-option"
                @click="submitQuiz(opt.key === quizCard.key ? 4 : 2)">
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Audio MCQ Type -->
          <div v-else-if="quizCard.type === 'audio_mcq'">
            <div class="quiz-question">Listen and choose the correct verse</div>
            <button class="quiz-play-audio" @click="playVerse(quizCard)">▶ Play Audio</button>
            <div class="quiz-options">
              <button v-for="opt in quizOptions" :key="opt.key" class="quiz-option"
                @click="submitQuiz(opt.key === quizCard.key ? 4 : 2)">
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Fill Blank Type -->
          <div v-else-if="quizCard.type === 'blank'">
            <div class="quiz-question">Fill in the missing word:</div>
            <div class="quiz-blank-prompt">{{ quizCard.prompt }}</div>
            <input type="text" v-model="quizAnswer" class="quiz-input" placeholder="Type your answer"
              @keyup.enter="submitQuiz()">
            <button class="btn-primary" @click="submitQuiz()">Submit</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="confettiActive" class="confetti" :key="confettiSeed" aria-hidden="true">
      <span v-for="n in 26" :key="n" class="confetti-piece" :style="{
        left: (Math.random() * 100) + '%',
        background: ['#8b5e3c', '#1f7a8c', '#f4d35e', '#ee964b', '#2a9d8f'][n % 5],
        transform: `rotate(${Math.random() * 360}deg)`,
        animationDelay: (Math.random() * 0.2) + 's'
      }"></span>
    </div>

    <!-- Audio Player -->
    <div class="player-bar" v-if="playerVisible">
      <div class="player-progress" @click="seek($event)">
        <div class="player-track"></div>
        <div class="player-fill" :style="{ width: seekPercent + '%' }"></div>
        <div class="player-handle" :style="{ left: seekPercent + '%' }"></div>
      </div>

      <div class="player-collapsed-meta" v-if="playerCollapsed">
        <div class="player-collapsed-copy">
          <div class="player-collapsed-title">{{ collapsedPlayerTitle }}</div>
          <div class="player-collapsed-sub">{{ collapsedPlayerSubtitle }}</div>
        </div>
        <button class="player-icon play" @click="togglePlay" aria-label="Play">
          <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
        </button>
      </div>

      <div class="player-controls" v-show="!playerCollapsed">
        <div class="player-time left">{{ formatTime(currentTime) }}</div>

        <div class="player-center">
          <button class="player-icon" @click="togglePlayerMenu" aria-label="Menu"><i
              class="bi bi-three-dots"></i></button>
          <button class="player-icon player-speed" @click="applySpeed" aria-label="Speed">{{ speed }}x</button>
          <button class="player-icon" @click="prev" :disabled="!canPrev" aria-label="Previous"><i
              class="bi bi-skip-backward-fill"></i></button>
          <button class="player-icon play" @click="togglePlay" aria-label="Play">
            <i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i>
          </button>
          <button class="player-icon" @click="next" :disabled="!canNext" aria-label="Next"><i
              class="bi bi-skip-forward-fill"></i></button>
          <button class="player-icon" @click="closePlayer" aria-label="Close"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="player-time right">{{ formatTime(duration) }}</div>
      </div>



      <div v-if="playerMenuOpen" class="player-menu-overlay" @click="playerMenuOpen = false">
        <div class="player-menu" @click.stop>
          <button class="player-menu-item" @click="downloadCurrentAudio">
            <span class="pm-ico"><i class="bi bi-download"></i></span>
            <span>Download</span>
          </button>
          <button class="player-menu-item" @click="tab = 'advanced'; showTools = true; playerMenuOpen = false">
            <span class="pm-ico"><i class="bi bi-arrow-repeat"></i></span>
            <span>Manage repeat settings</span>
          </button>
          <div class="player-menu-sep"></div>
          <div class="player-menu-row">
            <span class="pm-label">Speed</span>
            <input class="pm-range" type="range" min="0.5" max="1.5" step="0.1" v-model.number="speed"
              @input="applySpeed">
            <span class="pm-value">{{ speed }}x</span>
          </div>
          <div class="player-menu-row">
            <span class="pm-label">Reciter</span>
            <select v-model="reciterId" @change="updateAudioReciter" class="pm-select">
              <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <audio ref="audio" preload="auto" style="display:none"></audio>
  </div>
</template>

<script>
import axios from 'axios'
import { getEditions, getSurahEdition, getSurahTransliteration } from '../lib/quranApis'

export default {
  name: 'TelawaApp',
  props: {
    auth: { type: Object, default: () => ({ check: false, id: null }) }
  },
  data() {
    return {
      // Mode-specific state
      beginner: {
        chapterId: 0,
        rangeStart: 1,
        rangeEnd: 7,
        reciterId: 7,
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
      },
      advanced: {
        chapterId: 0,
        rangeStart: 1,
        rangeEnd: 7,
        reciterId: 7,
        speed: 1,
        delay: 1,
        playMode: 'auto',
        repeats: 1,
        order: 'seq',
        focusMode: false,
        blurAdjacent: false,
        repeatAndLoopAudio: false,
        advancedRepeats: 1,
        verses: [],
        activeKey: null,
        queue: [],
        queueIndex: 0,
        sessionActive: false
      },

      // Arabic text word highlighting state
      currentWordIndex: -1,
      currentHighlightedVerseKey: null,
      wordTimestampsMap: new Map(),
      wordHighlightHandler: null,
      currentVerseWords: [], // Store current verse's word spans

      // UI State
      currentMode: 'beginner',
      theme: 'light',
      tab: 'beginner',
      showTools: false,
      playerVisible: false,
      playerCollapsed: true,
      playerMenuOpen: false,

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
        { value: 'uthmanic', label: 'Uthmanic Hafs' },
        { value: 'amiri', label: 'Amiri Quran' },
        { value: 'naskh', label: 'Noto Naskh Arabic' },
        { value: 'scheherazade', label: 'Scheherazade New' },
        { value: 'lateef', label: 'Lateef' }
      ],
      showTranslation: true,
      showTransliteration: false,
      showWordByWord: false,
      wordByWordAudioEnabled: true,
      fontScale: 1,

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

      // Section open state
      sectionOpen: {
        beginner_setup: true,
        beginner_audio: false,
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
    currentConfig() {
      return this.currentMode === 'beginner' ? this.beginner : this.advanced
    },

    hasVerses() {
      return this.currentConfig.verses?.length > 0
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

    etaLabel() {
      const remainingQueue = (this.queue || []).slice(this.queueIndex).map(v => v?.key).filter(Boolean)
      const seconds = this.estimateKeysSeconds(remainingQueue)
      const minutes = Math.max(1, Math.ceil(seconds / 60))
      return `${minutes} min`
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
    }
  },

  async mounted() {
    this.migrateLocalStorage()
    this.loadUiState()
    await this.loadChapters()
    await this.loadReciters()
    this.loadSavedSessions()
    this.loadSm2()
    this.loadEvents()
    this.loadPlanner()
    this.loadMetrics()
    this.initAudio()
    this.theme = document.documentElement.getAttribute('data-theme') || this.theme
    this.loadBookmarksPins()

    if (this.currentMode === 'advanced' && this.advanced.chapterId) {
      this.currentMode = 'advanced'
      this.tab = 'advanced'
      await this.loadVerses()
    } else if (this.beginner.chapterId) {
      this.currentMode = 'beginner'
      this.tab = 'beginner'
      await this.loadVerses()
    }

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('beforeunload', this.persistAllState)
  },

  beforeUnmount() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('beforeunload', this.persistAllState)
    if (this.bannerTimer) clearTimeout(this.bannerTimer)
    this.flushPlaybackTime()
    this.stopWordHighlighting()
    this.persistAllState()
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

    beginnerRepeats() {
      if (this.tab === 'beginner') this.rebuildQueue()
    },
    advancedRepeats() {
      if (this.tab === 'advanced' && this.repeatAndLoopAudio) this.rebuildQueue()
    },
    repeatAndLoopAudio() {
      if (this.tab === 'advanced') this.rebuildQueue()
    },

    tab(newVal) {
      if (newVal === 'beginner' && this.currentMode !== 'beginner') {
        this.currentMode = 'beginner'
        if (this.beginner.chapterId && this.beginner.verses.length === 0) {
          this.loadVerses()
        }
      } else if (newVal === 'advanced' && this.currentMode !== 'advanced') {
        this.currentMode = 'advanced'
        if (this.advanced.chapterId && this.advanced.verses.length === 0) {
          this.loadVerses()
        }
      }
      this.persistUiState()
    }
  },

  methods: {
    async downloadOfflineVerses() {
      // Check if we have verses loaded
      if (!this.verses || !this.verses.length) {
        this.showBanner('Load a surah first before downloading', 'info', 3000);
        this.showTools = true;
        return;
      }

      try {
        // Get surah info from the first verse if chapterId is not set
        let surahId = this.chapterId;
        let surahName = this.currentChapter?.name_simple;

        if (!surahId && this.verses[0]?.key) {
          surahId = parseInt(this.verses[0].key.split(':')[0]);
          // Try to find surah name from chapters list
          const found = this.chapters.find(c => c.id === surahId);
          surahName = found?.name_simple || `Surah ${surahId}`;
        }

        if (!surahId) {
          this.showBanner('Could not identify surah', 'error', 3000);
          return;
        }

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
          verses: this.verses.map(v => ({
            key: v.key,
            number: v.number,
            arabic: v.arabic,
            translation: v.translation || '',
            transliteration: v.transliteration || '',
            audio: v.audio || ''
          }))
        };

        const storageKey = `offline_surah_${surahId}_${this.rangeStart}_${this.rangeEnd}`;
        localStorage.setItem(storageKey, JSON.stringify(offlineData));

        this.showBanner(`✓ Saved ${this.verses.length} verses from ${surahName} for offline reading!`, 'success', 3000);
        this.confettiActive = true;
        setTimeout(() => { this.confettiActive = false; }, 1200);

      } catch (err) {
        console.error('Download failed:', err);
        this.showBanner('Failed to download verses', 'error', 3000);
      }
    },
    splitArabicIntoWords(arabicText, verseKey) {
      if (!arabicText || !this.wordByWordAudioEnabled) {
        return arabicText
      }

      // First, protect tajweed tags by replacing them with placeholders
      const tajweedMatches = []
      let protectedText = arabicText.replace(/<tajweed[^>]*>.*?<\/tajweed>/gi, (match) => {
        const index = tajweedMatches.length
        tajweedMatches.push(match)
        return `__TAJWEED_${index}__`
      })

      // Split by spaces to get individual words
      const words = protectedText.split(/(\s+)/)

      let result = ''
      let wordIndex = 0

      for (let i = 0; i < words.length; i++) {
        let word = words[i]

        // Skip if it's only whitespace
        if (word.trim() === '') {
          result += word
          continue
        }

        // Restore any tajweed tags in this word
        let restoredWord = word
        let hasTajweed = false

        // Check if this word contains tajweed placeholders
        const tajweedRegex = /__TAJWEED_(\d+)__/g
        let match
        while ((match = tajweedRegex.exec(word)) !== null) {
          hasTajweed = true
          const tajweedIndex = parseInt(match[1])
          if (tajweedMatches[tajweedIndex]) {
            restoredWord = restoredWord.replace(`__TAJWEED_${tajweedIndex}__`, tajweedMatches[tajweedIndex])
          }
        }

        const isHighlighted = (this.currentWordIndex === wordIndex && this.currentHighlightedVerseKey === verseKey)
        const highlightClass = isHighlighted ? 'highlighted' : ''

        if (hasTajweed) {
          // For words with tajweed, we need to wrap the entire thing
          result += `<word data-verse="${verseKey}" data-word-index="${wordIndex}" class="${highlightClass}">${restoredWord}</word>`
        } else {
          result += `<word data-verse="${verseKey}" data-word-index="${wordIndex}" class="${highlightClass}">${restoredWord}</word>`
        }

        wordIndex++

        // Add space after word if not last and next is not whitespace
        if (i < words.length - 1 && words[i + 1] && words[i + 1].trim() !== '') {
          result += ' '
        }
      }

      return result
    },
    // ==================== ARABIC TEXT WORD SPLITTING ====================

    // Split Arabic text into individual word spans
    splitArabicIntoWords(arabicText, verseKey) {
      if (!arabicText || !this.wordByWordAudioEnabled) {
        return arabicText
      }

      // Split Arabic text by spaces, but preserve spans/tajweed tags
      // This regex matches words separated by spaces, including those with tajweed tags
      const words = arabicText.split(/(\s+)/)

      let result = ''
      let wordIndex = 0

      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        // Skip if it's only whitespace
        if (word.trim() === '') {
          result += word
          continue
        }

        // Check if this word has tajweed tags
        const hasTajweed = word.includes('<tajweed')

        if (hasTajweed) {
          // For tajweed text, we need to extract the inner text
          const match = word.match(/<tajweed[^>]*>(.*?)<\/tajweed>/)
          if (match) {
            const innerText = match[1]
            result += `<word data-verse="${verseKey}" data-word-index="${wordIndex}" class="${this.currentWordIndex === wordIndex && this.currentHighlightedVerseKey === verseKey ? 'highlighted' : ''}">${word}</word>`
            wordIndex++
          } else {
            result += `<word data-verse="${verseKey}" data-word-index="${wordIndex}" class="${this.currentWordIndex === wordIndex && this.currentHighlightedVerseKey === verseKey ? 'highlighted' : ''}">${word}</word>`
            wordIndex++
          }
        } else {
          // Regular text
          result += `<word data-verse="${verseKey}" data-word-index="${wordIndex}" class="${this.currentWordIndex === wordIndex && this.currentHighlightedVerseKey === verseKey ? 'highlighted' : ''}">${word}</word>`
          wordIndex++
        }

        // Add space after word if not last
        if (i < words.length - 1 && words[i + 1] && words[i + 1].trim() !== '') {
          result += ' '
        }
      }

      return result
    },

    getHighlightedArabic(verse) {
      if (!verse || !verse.arabic) return ''
      if (!this.wordByWordAudioEnabled) return verse.arabic

      // Store the split words for this verse
      const highlightedHtml = this.splitArabicIntoWords(verse.arabic, verse.key)
      return highlightedHtml
    },

    // ==================== WORD HIGHLIGHTING METHODS ====================

    async getWordTimings(verse) {
      if (!verse.words || verse.words.length === 0) {
        // Generate word timings from the Arabic text if word-by-word data isn't available
        const arabicText = verse.arabic
        const words = arabicText.split(/\s+/).filter(w => w.trim().length > 0)
        const totalChars = arabicText.replace(/[^ء-ي]/g, '').length
        const totalDuration = Math.max(5, Math.min(45, totalChars * 0.12))

        const timestamps = []
        let currentTime = 0

        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          const wordChars = word.replace(/<[^>]+>/g, '').replace(/[^ء-ي]/g, '').length
          const wordDuration = Math.max(0.2, (wordChars / totalChars) * totalDuration)

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
      const totalDuration = Math.max(5, Math.min(45, verse.arabic.replace(/[^ء-ي]/g, '').length * 0.12))
      const totalChars = verse.arabic.replace(/[^ء-ي]/g, '').length
      let currentTime = 0

      for (let i = 0; i < verse.words.length; i++) {
        const word = verse.words[i]
        const wordChars = word.ar.replace(/[^ء-ي]/g, '').length
        const wordDuration = Math.max(0.2, (wordChars / totalChars) * totalDuration)

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

    async startWordHighlighting(verse) {
      this.stopWordHighlighting()

      if (!this.wordByWordAudioEnabled) {
        return
      }

      this.currentHighlightedVerseKey = verse.key

      // Get word timings
      const timestamps = await this.getWordTimings(verse)

      if (!timestamps.length) return

      const updateHighlight = () => {
        if (!this.audioElement?.currentTime) return

        const currentTime = this.audioElement.currentTime
        let activeIndex = -1

        for (let i = 0; i < timestamps.length; i++) {
          const ts = timestamps[i]
          if (currentTime >= ts.start && currentTime <= ts.end) {
            activeIndex = i
            break
          }
        }

        if (this.currentWordIndex !== activeIndex) {
          this.currentWordIndex = activeIndex

          // Update the DOM directly for better performance
          this.updateWordHighlightInDOM(verse.key, activeIndex)
        }
      }

      this.wordHighlightHandler = updateHighlight
      this.audioElement.addEventListener('timeupdate', this.wordHighlightHandler)
    },

    updateWordHighlightInDOM(verseKey, activeWordIndex) {
      // Find all word elements in the current verse
      const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
      if (!verseCard) return

      // Find all word elements within the verse-arabic div
      const words = verseCard.querySelectorAll('.verse-arabic word')

      words.forEach((wordElement, index) => {
        if (index === activeWordIndex) {
          wordElement.classList.add('highlighted')
          // Optional: scroll the highlighted word into view
          if (this.wordByWordAudioEnabled) {
            wordElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          }
        } else {
          wordElement.classList.remove('highlighted')
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

      // Clear all highlights from DOM
      document.querySelectorAll('.verse-arabic word.highlighted').forEach(word => {
        word.classList.remove('highlighted')
      })
    },

    // ==================== AUDIO METHODS ====================

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

            // Start word highlighting after playback begins
            if (this.wordByWordAudioEnabled) {
              await this.startWordHighlighting(verse)
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

    prev() {
      if (!this.canPrev) return
      this.sessionCompleted = false
      this.queueIndex--
      const v = this.queue[this.queueIndex]
      if (v) this.playVerse(v)
    },

    next() {
      if (this.canNext) {
        this.sessionCompleted = false
        this.queueIndex++
        const v = this.queue[this.queueIndex]
        if (v) this.playVerse(v)
        return
      }
      this.handleSessionComplete()
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

    // ==================== VERSE METHODS ====================

    async loadVerses() {
      if (!this.chapterId) {
        console.warn('No chapterId set, skipping loadVerses')
        return
      }

      console.log('=== LOAD VERSES START ===')
      console.log('Chapter ID:', this.chapterId)
      console.log('Range:', this.rangeStart, '-', this.rangeEnd)
      console.log('Reciter ID:', this.reciterId)
      console.log('Current Mode:', this.currentMode)

      // Test if we can reach the API at all
      try {
        const testRes = await axios.get('https://api.quran.com/api/v4/chapters/1', { timeout: 5000 })
        console.log('API Connectivity Test: OK', testRes.status)
      } catch (testErr) {
        console.error('API Connectivity Test FAILED:', testErr.message)
        this.showBanner('Cannot reach Quran.com API. Check your internet or try a VPN.', 'error', 10000)
        return
      }

      const params = {
        per_page: 300,
        translations: this.shouldRequestTranslations() ? '131' : undefined,
        words: this.shouldRequestWords(),
        audio: this.reciterId,
        fields: 'text_uthmani,text_uthmani_tajweed,text_qpc_hafs'
      }

      console.log('Request params:', JSON.stringify(params, null, 2))

      try {
        const url = `https://api.quran.com/api/v4/verses/by_chapter/${this.chapterId}`
        console.log('Fetching:', url)

        const res = await axios.get(url, {
          params,
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })

        console.log('Response status:', res.status)
        console.log('Response headers:', res.headers)

        // Check if response has data
        if (!res.data) {
          console.error('Response has no data property')
          this.showBanner('Invalid response from server', 'error', 5000)
          return
        }

        console.log('Response data type:', typeof res.data)
        console.log('Response data keys:', Object.keys(res.data))

        const all = res.data?.verses || []
        console.log('All verses count:', all.length)

        if (all.length === 0) {
          console.error('API returned 0 verses for chapter:', this.chapterId)
          this.showBanner(`No verses found for Surah ${this.chapterId}. Try another surah.`, 'error', 5000)
          return
        }

        // Log first verse to check structure
        console.log('First verse sample:', JSON.stringify(all[0], null, 2))

        const start = this.rangeStart, end = this.rangeEnd
        console.log(`Filtering verses ${start}-${end}`)

        let mappedVerses = all.filter(v => v.verse_number >= start && v.verse_number <= end).map(v => {
          const audio = this.normalizeAudioUrl(v.audio?.url || '')
          console.log(`Verse ${v.verse_number} audio URL:`, audio || 'NO AUDIO')

          return {
            key: v.verse_key,
            number: v.verse_number,
            arabic: v.text_qpc_hafs || v.text_uthmani_tajweed || v.text_uthmani || '',
            translation: v.translations?.[0]?.text || '',
            transliteration: '',
            audio: audio,
            words: (v.words || []).map(w => ({
              ar: w.text_uthmani || w.text || '',
              en: w.translation?.text || '',
              tooltip: `${w.text_uthmani || w.text || ''} • ${w.translation?.text || ''}`.trim(),
              audio: this.normalizeAudioUrl(w.audio_url)
            }))
          }
        })

        console.log('Mapped verses count:', mappedVerses.length)

        if (mappedVerses.length === 0) {
          console.error('Filter returned 0 verses. Check range:', start, '-', end, 'vs available:', all.length)
          this.showBanner(`Range ${start}-${end} is outside this surah (has ${all.length} verses)`, 'error', 5000)
          return
        }

        // Log first mapped verse
        console.log('First mapped verse:', JSON.stringify(mappedVerses[0], null, 2))

        if (this.script === 'tajweed') {
          try {
            const tajweedRes = await getSurahEdition(this.chapterId, 'quran-tajweed')
            const ayahs = tajweedRes.data?.data?.ayahs || []
            const byNumber = new Map(ayahs.map(a => [a.numberInSurah, this.normalizeTajweedText(a.text)]))
            mappedVerses = mappedVerses.map(v => ({ ...v, arabic: byNumber.get(v.number) || v.arabic }))
          } catch (e) {
            console.error('Tajweed load failed:', e)
          }
        }

        // Assign verses
        if (this.currentMode === 'beginner') {
          this.beginner.verses = mappedVerses
          if (!this.beginner.activeKey && mappedVerses.length) {
            this.beginner.activeKey = mappedVerses[0].key
          }
          console.log('Beginner verses set:', this.beginner.verses.length)
        } else {
          this.advanced.verses = mappedVerses
          if (!this.advanced.activeKey && mappedVerses.length) {
            this.advanced.activeKey = mappedVerses[0].key
          }
          console.log('Advanced verses set:', this.advanced.verses.length)
        }

        // Update chapter info
        if (!this.currentChapter) {
          this.currentChapter = this.chapters.find(c => c.id === this.chapterId)
          console.log('Current chapter set to:', this.currentChapter?.name_simple)
        }

        this.buildQueue()
        console.log('Queue built with', this.queue.length, 'items')
        console.log('=== LOAD VERSES COMPLETE ===')

      } catch (e) {
        console.error('=== LOAD VERSES ERROR ===')
        console.error('Error type:', e.constructor.name)
        console.error('Error message:', e.message)
        console.error('Error code:', e.code)

        if (e.response) {
          console.error('Response status:', e.response.status)
          console.error('Response data:', e.response.data)
          console.error('Response headers:', e.response.headers)

          if (e.response.status === 404) {
            this.showBanner(`Surah ${this.chapterId} not found`, 'error', 5000)
          } else if (e.response.status === 429) {
            this.showBanner('Rate limited. Wait 30 seconds and try again.', 'error', 5000)
          } else {
            this.showBanner(`Server error ${e.response.status}`, 'error', 5000)
          }
        } else if (e.request) {
          console.error('No response received. Network issue?')
          console.error('Request:', e.request)
          this.showBanner('Network error. Check your connection or try VPN.', 'error', 8000)
        } else {
          console.error('Error config:', e.config)
          this.showBanner(`Error: ${e.message}`, 'error', 5000)
        }

        // Clear verses on error
        if (this.currentMode === 'beginner') {
          this.beginner.verses = []
        } else {
          this.advanced.verses = []
        }

        console.error('=== LOAD VERSES ERROR END ===')
      }
    },
    buildQueue() {
      console.log('=== BUILD QUEUE START ===')
      console.log('Current mode:', this.currentMode)

      // GET VERSES DIRECTLY - don't use computed property
      const verses = this.currentMode === 'beginner'
        ? this.beginner.verses
        : this.advanced.verses

      console.log('Verses count:', verses?.length)
      console.log('beginner.verses length:', this.beginner.verses?.length)
      console.log('advanced.verses length:', this.advanced.verses?.length)

      if (!verses || verses.length === 0) {
        console.error('No verses available to build queue')
        // Clear queues
        this.beginner.queue = []
        this.advanced.queue = []
        this.queue = []
        this.queueIndex = 0
        return
      }

      // Determine repeat count
      let rep = 1  // ALWAYS default to at least 1

      if (this.currentMode === 'beginner') {
        rep = this.beginner.repeats || 1
        console.log('Using beginner repeats:', rep)
      } else if (this.currentMode === 'advanced') {
        if (this.advanced.repeatAndLoopAudio) {
          rep = this.advanced.advancedRepeats || 1
          console.log('Using advanced loop repeats:', rep)
        } else {
          rep = 1
          console.log('Advanced loop not enabled, using 1 repeat')
        }
      }

      // Determine order
      const ord = this.order || 'seq'
      console.log('Order:', ord, '| Repeats:', rep, '| Verses source length:', verses.length)

      const q = []

      // Build queue based on order
      if (ord === 'seq') {
        for (let r = 0; r < rep; r++) {
          q.push(...verses)
        }
      } else if (ord === 'cum') {
        for (let r = 0; r < rep; r++) {
          for (let i = 0; i < verses.length; i++) {
            for (let j = 0; j <= i; j++) {
              q.push(verses[j])
            }
          }
        }
      } else if (ord === 'rand') {
        for (let r = 0; r < rep; r++) {
          const shuffled = [...verses]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          q.push(...shuffled)
        }
      } else {
        console.warn('Unknown order, defaulting to sequential')
        for (let r = 0; r < rep; r++) {
          q.push(...verses)
        }
      }

      console.log('Queue built with', q.length, 'items')

      // Store queue in BOTH the mode-specific and the current config
      if (this.currentMode === 'beginner') {
        this.beginner.queue = q
        this.beginner.queueIndex = 0
      } else {
        this.advanced.queue = q
        this.advanced.queueIndex = 0
      }

      // Also update the computed/reactive properties
      this.queue = q
      this.queueIndex = 0

      console.log('Queue assigned. this.queue.length:', this.queue?.length)
      console.log('=== BUILD QUEUE END ===')
    },

    rebuildQueue() {
      this.buildQueue()
    },

    async startSession() {
      console.log('=== START SESSION ===')
      console.log('chapterId:', this.chapterId)
      console.log('currentMode:', this.currentMode)

      // Check verses directly from the mode-specific storage
      const currentVerses = this.currentMode === 'beginner'
        ? this.beginner.verses
        : this.advanced.verses

      console.log('Direct verses check - length:', currentVerses?.length)
      console.log('Computed verses - length:', this.verses?.length)

      if (!this.chapterId || this.chapterId === 0) {
        this.showTools = true
        this.showBanner('Please select a surah first', 'info', 3000)
        return
      }

      if (!currentVerses || currentVerses.length === 0) {
        console.log('No verses found, calling loadVerses...')
        await this.loadVerses()
      }

      // Check again after loading
      const updatedVerses = this.currentMode === 'beginner'
        ? this.beginner.verses
        : this.advanced.verses

      console.log('After load - verses length:', updatedVerses?.length)

      if (!updatedVerses || updatedVerses.length === 0) {
        console.error('Still no verses after loading')
        this.showBanner('No verses loaded. Check your network connection.', 'error')
        return
      }

      if (!this.audioElement) {
        console.log('Initializing audio...')
        this.initAudio()
      }

      // Check queue directly
      const currentQueue = this.currentMode === 'beginner'
        ? this.beginner.queue
        : this.advanced.queue

      console.log('Current queue length:', currentQueue?.length)

      if (!currentQueue || currentQueue.length === 0) {
        console.log('Building queue...')
        this.buildQueue()
      }

      // Get queue again after building
      const builtQueue = this.currentMode === 'beginner'
        ? this.beginner.queue
        : this.advanced.queue

      console.log('Queue after build - length:', builtQueue?.length)

      if (!builtQueue || builtQueue.length === 0) {
        console.error('Queue is still empty!')
        this.showBanner('Nothing to play. Check repeat/loop settings.', 'error')
        return
      }

      console.log('Setting queue index to 0')
      this.queueIndex = 0

      const first = builtQueue[0]
      console.log('First queue item:', first?.key)

      if (first) {
        console.log('Playing first verse:', first.key)
        this.activeKey = first.key
        this.activeVerseKey = first.key
        await this.$nextTick()
        await this.playVerse(first)
      }

      this.showTools = false
      console.log('=== START SESSION COMPLETE ===')
    },

    // ==================== UTILITY METHODS ====================

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

    shouldRequestTranslations() {
      return !!(this.showTranslation || this.studyMode === 'quiz' || this.studyMode === 'hybrid' || this.quizActive)
    },

    shouldRequestWords() {
      return !!(this.showWordByWord || (this.quizActive && this.quizType === 'blank'))
    },

    normalizeTajweedText(text) {
      const raw = String(text || '')
      if (!raw) return ''
      if (raw.includes('<tajweed')) return raw
      const classMap = {
        h: 'ham_wasl', s: 'slnt', l: 'laam_shamsiyah', n: 'madda_normal',
        p: 'madda_permissible', m: 'madda_necessary', q: 'qlqla', o: 'madda_obligatory',
        c: 'ikhafa', f: 'ghunnah', w: 'idgham_wo_ghunnah', i: 'iqlab',
        a: 'idgham_ghunnah', u: 'idgham_shafawi', d: 'ikhafa_shafawi', b: 'waqf', g: 'ghunnah'
      }
      return raw.replace(/\[([a-z_]+)(?::[^\]]+)?\[([^\]]+)\]/gi, (_, code, inner) => {
        const klass = classMap[String(code).toLowerCase()] || String(code).toLowerCase()
        return `<tajweed class="${klass}">${inner}</tajweed>`
      }).replace(/\]/g, '')
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
      // Separate logic paths based on whether verses are loaded
      if (!this.chapterId || this.chapterId === 0) {
        this.showTools = true
        this.showBanner('Please select a surah first', 'info', 3000)
        return
      }

      if (!this.verses.length) {
        return this.startSession()
      }

      // For loaded verses - handle play/pause state
      this.handlePlayPause()
    },

    handlePlayPause() {
      if (this.isPlaying) {
        return this.togglePlay()
      }

      // Start or resume
      if (!this.audioElement?.src || this.audioElement.paused) {
        return this.startSession()
      }

      return this.togglePlay()
    },





    // ==================== UI METHODS ====================

    toggleReadingOption(kind) {
      if (kind === 'translation') this.showTranslation = !this.showTranslation
      if (kind === 'transliteration') this.showTransliteration = !this.showTransliteration
      if (kind === 'wbw') {
        this.showWordByWord = !this.showWordByWord
        // Reload verses to update the display
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

    togglePlayerMenu() {
      this.playerMenuOpen = !this.playerMenuOpen
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

    isAdjacentVerse(verse) {
      if (!this.activeVerseKey) return false
      const activeNumber = parseInt(this.activeVerseKey.split(':')[1])
      return Math.abs(verse.number - activeNumber) === 1
    },

    // ==================== PERSISTENCE METHODS ====================

    userStorageKey(suffix) {
      const uid = this.auth?.id || 'guest'
      return `telawa.${suffix}.${uid}`
    },

    loadBookmarksPins() {
      try { this.bookmarks = JSON.parse(localStorage.getItem(this.userStorageKey('bookmarks')) || '[]') } catch { this.bookmarks = [] }
      try { this.pins = JSON.parse(localStorage.getItem(this.userStorageKey('pins')) || '[]') } catch { this.pins = [] }
    },

    persistBookmarksPins() {
      try { localStorage.setItem(this.userStorageKey('bookmarks'), JSON.stringify((this.bookmarks || []).slice(0, 500))) } catch (e) { }
      try { localStorage.setItem(this.userStorageKey('pins'), JSON.stringify((this.pins || []).slice(0, 500))) } catch (e) { }
    },

    loadUiState() {
      try {
        const raw = localStorage.getItem('telawa.uiState')
        if (!raw) return
        const state = JSON.parse(raw)
        this.theme = state.theme || this.theme
        this.showTools = false
        this.tab = state.tab || this.tab
        this.currentMode = state.currentMode || 'beginner'

        if (state.beginner) this.beginner = { ...this.beginner, ...state.beginner }
        if (state.advanced) this.advanced = { ...this.advanced, ...state.advanced }

        this.showTranslation = state.showTranslation ?? this.showTranslation
        this.showTransliteration = state.showTransliteration ?? this.showTransliteration
        this.showWordByWord = state.showWordByWord ?? this.showWordByWord
        this.wordByWordAudioEnabled = state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
        this.fontScale = state.fontScale ?? this.fontScale
        this.quranFont = state.quranFont || this.quranFont
        this.script = state.script || this.script
        this.sectionOpen = { ...this.sectionOpen, ...(state.sectionOpen || {}) }
        this.onboardingDismissed = state.onboardingDismissed ?? false
      } catch (e) { console.error(e) }

      try {
        const raw = localStorage.getItem('telawa.sessionState')
        if (raw) {
          const state = JSON.parse(raw)
          this.activeKey = state.activeKey || this.activeKey
          this.queueIndex = Number(state.queueIndex || 0)
        }
      } catch (e) { console.error(e) }
    },

    persistUiState() {
      try {
        localStorage.setItem('telawa.uiState', JSON.stringify({
          theme: this.theme,
          showTools: this.showTools,
          tab: this.tab,
          currentMode: this.currentMode,
          beginner: {
            chapterId: this.beginner.chapterId,
            rangeStart: this.beginner.rangeStart,
            rangeEnd: this.beginner.rangeEnd,
            reciterId: this.beginner.reciterId,
            speed: this.beginner.speed,
            delay: this.beginner.delay,
            playMode: this.beginner.playMode,
            repeats: this.beginner.repeats,
            order: this.beginner.order,
            blurAdjacent: this.beginner.blurAdjacent,
            focusMode: this.beginner.focusMode
          },
          advanced: {
            chapterId: this.advanced.chapterId,
            rangeStart: this.advanced.rangeStart,
            rangeEnd: this.advanced.rangeEnd,
            reciterId: this.advanced.reciterId,
            speed: this.advanced.speed,
            delay: this.advanced.delay,
            playMode: this.advanced.playMode,
            repeats: this.advanced.repeats,
            order: this.advanced.order,
            blurAdjacent: this.advanced.blurAdjacent,
            focusMode: this.advanced.focusMode,
            repeatAndLoopAudio: this.advanced.repeatAndLoopAudio,
            advancedRepeats: this.advanced.advancedRepeats
          },
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord,
          wordByWordAudioEnabled: this.wordByWordAudioEnabled,
          fontScale: this.fontScale,
          quranFont: this.quranFont,
          script: this.script,
          sectionOpen: this.sectionOpen,
          onboardingDismissed: this.onboardingDismissed
        }))
      } catch (e) { console.error(e) }
    },

    persistSessionState() {
      try {
        localStorage.setItem('telawa.sessionState', JSON.stringify({
          activeKey: this.activeKey,
          queueIndex: this.queueIndex
        }))
      } catch (e) { console.error(e) }
    },

    persistAudioState() {
      try {
        localStorage.setItem('telawa.audioState', JSON.stringify({
          src: this.audioElement?.currentSrc || '',
          currentTime: this.currentTime || 0,
          playerVisible: this.playerVisible,
          speed: this.speed,
          isPlaying: this.isPlaying
        }))
      } catch (e) { console.error(e) }
    },

    persistAllState() {
      this.persistUiState()
      this.persistSessionState()
      this.persistAudioState()
      this.persistPlanner()
      this.persistTodayPlan()
      this.persistSm2()
    },

    // ==================== SIMPLIFIED PLACEHOLDER METHODS ====================

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
        const res = await axios.get('https://api.quran.com/api/v4/resources/recitations', { params: { per_page: 30 } })
        const list = res.data?.recitations || []
        if (list.length) this.reciters = list.map(r => ({ id: r.id, name: r.reciter_name }))
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
      if (!localStorage.getItem(key)) localStorage.setItem(key, '1')
    },

    dayKey(ts = Date.now()) {
      const d = new Date(ts)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },

    logEvent(evt) {
      const safe = { ...evt, at: Date.now(), day: this.dayKey() }
      this.events = [...(this.events || []), safe].slice(-2000)
      try { localStorage.setItem('telawa.events', JSON.stringify(this.events)) } catch (e) { console.error(e) }
    },

    sm2Get(key) {
      return this.sm2[key] || { ef: 2.5, interval: 0, reps: 0, due: 0, last: 0, lapses: 0, suspended: false }
    },

    sm2CardKey(verseKey, skill) {
      return `${verseKey}::${skill}`
    },

    sm2Grade(key, quality) {
      const now = Date.now()
      const card = this.sm2Get(key)
      let ef = card.ef, reps = card.reps, interval = card.interval, lapses = card.lapses || 0

      if (quality < 3) {
        reps = 0
        interval = 1
        lapses += 1
      } else {
        reps += 1
        if (reps === 1) interval = 1
        else if (reps === 2) interval = 6
        else interval = Math.round(interval * ef)
      }

      ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
      const due = now + interval * 24 * 60 * 60 * 1000
      const suspended = lapses >= 8
      this.sm2[key] = { ef, reps, interval, due, last: now, lapses, suspended }
      this.persistSm2()
      this.logEvent({ type: 'sm2_grade', key, quality, interval, ef })
    },

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
    },

    resetControls() {
      if (!confirm('Reset session settings?')) return
      this.rangeStart = 1
      this.rangeEnd = 7
      this.speed = 1
      this.delay = 1
      this.repeats = 1
      this.playMode = 'auto'
      this.order = 'seq'
      this.blurAdjacent = false
      this.focusMode = false
      this.applySpeed()
      this.rebuildQueue()
      this.persistAllState()
    },

    beginPlan() {
      this.onboardingDismissed = true
      this.showTools = true
    },

    updateAudioReciter() {
      this.wordTimestampsMap.clear()
      this.loadVerses()
    },

    downloadCurrentAudio() {
      const src = this.audioElement?.src
      if (!src) return
      const a = document.createElement('a')
      a.href = src
      a.download = ''
      a.click()
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

    setActiveVerse(key) {
      this.activeVerseKey = key
      this.activeKey = key
      this.$nextTick(() => {
        const el = document.querySelector(`.verse-card[data-verse-key="${key}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },

    refreshVerses() { this.loadVerses() },

    collectSimpleStats() {
      const sessionCount = this.savedSessions.length || 0
      const weak = Object.entries(this.sm2 || {}).filter(([, card]) => card && (card.lapses >= 3)).length
      this.simpleStats = {
        streak: 0,
        sessions: sessionCount,
        memorised: this.verses.length || 0,
        weak: weak
      }
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

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--text);
  background-image:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.55), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 30%);
}

.app {
  min-height: 100vh;
  animation: appFade 260ms ease-out;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 20;
}

/* Ensure tajweed styles work inside word tags */
.verse-arabic word {
  display: inline-block;
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

/* Preserve tajweed styling inside highlighted words */
.verse-arabic word.highlighted tajweed,
.verse-arabic word.highlighted .tajweed {
  color: inherit;
}

.verse-arabic.word-highlight-enabled {
  cursor: pointer;
}

/* Original tajweed styles - ensure they work */
.verse-arabic tajweed.ham_wasl,
.verse-arabic .ham_wasl {
  color: #9c27b0;
}

.verse-arabic tajweed.ghunnah,
.verse-arabic .ghunnah {
  color: #1f7a8c;
}

.verse-arabic tajweed.idgham_ghunnah,
.verse-arabic .idgham_ghunnah {
  color: #1f7a8c;
}

.verse-arabic tajweed.idgham_wo_ghunnah,
.verse-arabic .idgham_wo_ghunnah {
  color: #0f766e;
}

.verse-arabic tajweed.iqlab,
.verse-arabic .iqlab {
  color: #2563eb;
}

.verse-arabic tajweed.ikhafa,
.verse-arabic .ikhafa {
  color: #f59e0b;
}

.verse-arabic tajweed.qlqla,
.verse-arabic .qlqla,
.verse-arabic tajweed.qalqalah,
.verse-arabic .qalqalah {
  color: #ef4444;
}

.verse-arabic tajweed.madda_normal,
.verse-arabic .madda_normal,
.verse-arabic tajweed.madda_permissible,
.verse-arabic .madda_permissible,
.verse-arabic tajweed.madda_necessary,
.verse-arabic .madda_necessary {
  color: #8b5cf6;
}

.verse-arabic tajweed.idgham_shafawi,
.verse-arabic .idgham_shafawi,
.verse-arabic tajweed.ikhafa_shafawi,
.verse-arabic .ikhafa_shafawi {
  color: #db2777;
}

.verse-arabic tajweed.slnt,
.verse-arabic .slnt,
.verse-arabic tajweed.waqf,
.verse-arabic .waqf {
  color: #6b7280;
}

/* Add to your style section */
.verse-arabic word {
  display: inline-block;
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

.verse-arabic.word-highlight-enabled {
  cursor: pointer;
}

/* Add this to your style section - replace the existing .word-item.highlighted */
.word-item.word-highlighted {
  background: var(--accent) !important;
  color: white !important;
  transform: scale(1.05);
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(154, 103, 56, 0.4);
  position: relative;
  z-index: 2;
}

.word-item.word-highlighted .word-arabic,
.word-item.word-highlighted .word-meaning {
  color: white !important;
}

.word-item.word-highlighted .word-audio-btn {
  color: white !important;
  opacity: 1;
}

/* Mode Indicator */
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

.mode-indicator i {
  font-size: 0.75rem;
}

[data-theme="dark"] .mode-indicator {
  background: rgba(208, 160, 107, 0.12);
  border-color: rgba(208, 160, 107, 0.25);
}

.verse-translation {
  font-size: 0.85rem;
  color: #5a6b63;
  line-height: 1.6;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid var(--border);
  display: block;
}

[data-theme="dark"] .verse-translation {
  color: #a0a0b0;
}

[data-theme="sepia"] .verse-translation {
  color: #7a684a;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

/* Verses Grid */
.verses-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.verse-card {
  background: var(--surface);
  border-radius: 20px;
  padding: 24px;
  transition: all 0.2s ease;
  border: 1px solid var(--border);
  position: relative;
}

.verse-card.active {
  border-left: 4px solid var(--accent);
  background: var(--accent-light);
}

.verse-card.focus-mode {
  opacity: 0.4;
}

.verse-card.focus-mode.active {
  opacity: 1;
}

.verse-card.blurred {
  filter: blur(4px);
}

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
  font-size: 0.75rem;
  padding: 4px 12px;
  background: var(--accent-light);
  border-radius: 20px;
  color: var(--accent);
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

.start-btn {
  width: 100%;
  padding: 7px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  transition: all 0.2s;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.start-btn:disabled:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
}

.verse-play-btn,
.verse-focus-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.verse-play-btn:hover,
.verse-focus-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent);
}

.verse-arabic {
  font-family: var(--font-ar);
  font-size: 1.4rem;
  line-height: 1.8;
  text-align: right;
  direction: rtl;
  background: var(--bg-elevated);
  padding: 20px;
  border-radius: 16px;
  margin: 12px 0;
}



.verse-transliteration {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 8px;
}

.verse-words {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.word-item {
  background: var(--accent-light);
  padding: 6px 12px;
  border-radius: 20px;
  display: inline-flex;
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
}

.word-audio-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent);
  padding: 0 4px;
}

/* Navigation Bar */
.navigation-bar {
  position: sticky;
  bottom: 20px;
  margin-top: 24px;
  background: var(--surface);
  border-radius: 60px;
  padding: 12px 24px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border);
  backdrop-filter: blur(10px);
  z-index: 15;
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.nav-btn {
  padding: 10px 24px;
  border-radius: 40px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--accent-light);
  border-color: var(--accent);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-btn {
  width: 56px;
  height: 56px;
  border-radius: 56px;
  background: var(--accent-green, #2c5f4a);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  transition: transform 0.2s;
}

.play-btn:hover {
  transform: scale(1.02);
}

/* Simple Planner Styles */
.planner-simple {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.goal-item span {
  font-size: 0.8rem;
  color: var(--text);
}

.input-small {
  width: 80px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  text-align: center;
}

.today-plan {
  background: var(--accent-light);
  border-radius: 12px;
  padding: 12px;
  margin-top: 8px;
}

.plan-header {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 0.85rem;
}

.plan-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.plan-item span {
  color: var(--text-muted);
}

.planner-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-secondary {
  flex: 1;
  padding: 10px;
  border-radius: 40px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-primary {
  flex: 1;
  padding: 10px;
  border-radius: 40px;
  background: var(--accent-green, #2c5f4a);
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.weak-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.weak-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: var(--surface);
  border-radius: 10px;
  border: 1px solid var(--border);
}

.weak-ref {
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 500;
}

.weak-lapses {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-mark {
  font-size: 1.4rem;
  color: var(--accent);
}

.brand-name {
  font-weight: 500;
  font-size: 0.95rem;
}

.session-name {
  font-size: 0.85rem;
  font-weight: 450;
}

.session-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.header-right {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.58));
  border: 1px solid var(--border);
  cursor: pointer;
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

/* Main */
.main {
  transition: padding-right 0.25s ease;
  padding: 20px 24px 100px;
}

.main.tools-open {
  padding-right: var(--tools-width);
}

.main.tools-open .content {
  max-width: min(980px, calc(100vw - var(--tools-width) - 80px));
}

.content {
  max-width: 1120px;
  margin: 0 auto;
}

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

.toolbar-font-wrap {
  position: relative;
}

.toolbar-font-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 180px;
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: var(--shadow-md);
  z-index: 12;
}

.toolbar-font-option {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  text-align: left;
  font-size: 0.78rem;
  cursor: pointer;
}

.toolbar-font-option.active,
.toolbar-font-option:hover {
  background: var(--accent-light);
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
}

.toolbar-chip.active {
  background: var(--accent);
  color: #fff;
}

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

[data-theme="dark"] .session-rail {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(18, 18, 18, 0.86);
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

[data-theme="dark"] .rail-btn {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.46);
}

.rail-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-color: transparent;
  color: white;
  box-shadow: 0 12px 28px rgba(154, 103, 56, 0.28);
}

.rail-btn-ghost {
  background: transparent;
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

.cta-btn {
  padding: 6px 18px;
  border-radius: 40px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border: none;
  color: white;
  font-size: 0.74rem;
  font-weight: 450;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 14px 30px rgba(154, 103, 56, 0.24);
  transition: transform 140ms ease, box-shadow 140ms ease;
}

/* Empty */
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

/* Verses */
.verses {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.verses.compact .verse {
  padding: 12px;
}

.verse {
  transition: all 0.2s ease;
}

.verse.active {
  border-left: 3px solid var(--accent);
  background: var(--accent-light);
}

.verse-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.verse-badge {
  display: flex;
  gap: 8px;
  align-items: center;
}

.verse-num {
  font-size: 0.7rem;
  padding: 2px 8px;
  background: var(--accent-light);
  border-radius: 20px;
  color: var(--accent);
}

.verse-ref {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-family: monospace;
}

.verse-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
}

.verse-arabic {
  font-family: var(--font-ar);
  font-size: 1.7rem;
  line-height: 2.25;
  text-align: right;
  direction: rtl;
  margin: 12px 0 10px;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga" 1, "calt" 1;
  font-variant-ligatures: contextual common-ligatures;
  unicode-bidi: plaintext;
}

.verse-transliteration {
  font-size: 0.94rem;
  color: var(--text-muted);
  line-height: 1.8;
  margin-top: 6px;
}



.verse-words {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, max-content));
  gap: 10px 8px;
  margin-top: 10px;
  align-items: start;
}

.word {
  background: var(--accent-light);
  padding: 8px 10px 10px;
  border-radius: 16px;
  display: inline-grid;
  justify-items: center;
  gap: 3px;
  font-size: 0.72rem;
  position: relative;
  cursor: default;
  min-width: 84px;
}

.word.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 10px 24px rgba(154, 103, 56, 0.22);
}

.word-ar {
  font-family: var(--font-ar);
  font-size: 1.12rem;
  line-height: 1.7;
  color: var(--text);
}

.word-en {
  color: var(--text-muted);
  font-size: 0.66rem;
  line-height: 1.35;
  text-align: center;
  max-width: 100%;
  word-break: break-word;
}

.word-play {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  width: 22px;
  height: 22px;
  border: none;
  cursor: pointer;
  font-size: 0.62rem;
  display: grid;
  place-items: center;
  color: var(--accent);
  margin-top: 3px;
}

.word-tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  min-width: 132px;
  max-width: 220px;
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(24, 27, 33, 0.96);
  color: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 34px rgba(10, 12, 18, 0.24);
  white-space: normal;
  z-index: 8;
  animation: fadeLift 140ms ease-out;
}

.word-tooltip::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  transform: translateX(-50%) rotate(45deg);
  background: rgba(24, 27, 33, 0.96);
}

.word-tooltip-ar {
  font-family: var(--font-ar);
  font-size: 0.9rem;
  line-height: 1.7;
  text-align: right;
}

.word-tooltip-en {
  font-size: 0.72rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.82);
}

.verse-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.verse-footer-side {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.verse-tool-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--text-muted);
  box-shadow: var(--shadow-sm);
}

.verse-tool-btn.active {
  background: var(--accent);
  color: #fff;
}

.verse-arabic tajweed,
.verse-arabic .tajweed {
  font-family: inherit;
}

.verse-arabic tajweed.ham_wasl,
.verse-arabic .ham_wasl {
  color: #9c27b0;
}

.verse-arabic tajweed.ghunnah,
.verse-arabic .ghunnah {
  color: #1f7a8c;
}

.verse-arabic tajweed.idgham_ghunnah,
.verse-arabic .idgham_ghunnah {
  color: #1f7a8c;
}

.verse-arabic tajweed.idgham_wo_ghunnah,
.verse-arabic .idgham_wo_ghunnah {
  color: #0f766e;
}

.verse-arabic tajweed.iqlab,
.verse-arabic .iqlab {
  color: #2563eb;
}

.verse-arabic tajweed.ikhafa,
.verse-arabic .ikhafa {
  color: #f59e0b;
}

.verse-arabic tajweed.qlqla,
.verse-arabic .qlqla,
.verse-arabic tajweed.qalqalah,
.verse-arabic .qalqalah {
  color: #ef4444;
}

.verse-arabic tajweed.madda_normal,
.verse-arabic .madda_normal,
.verse-arabic tajweed.madda_permissible,
.verse-arabic .madda_permissible,
.verse-arabic tajweed.madda_necessary,
.verse-arabic .madda_necessary {
  color: #8b5cf6;
}

.verse-arabic tajweed.idgham_shafawi,
.verse-arabic .idgham_shafawi,
.verse-arabic tajweed.ikhafa_shafawi,
.verse-arabic .ikhafa_shafawi {
  color: #db2777;
}

.verse-arabic tajweed.slnt,
.verse-arabic .slnt,
.verse-arabic tajweed.waqf,
.verse-arabic .waqf {
  color: #6b7280;
}

/* Tools Panel */
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

[data-theme="dark"] .tools {
  background: rgba(18, 18, 18, 0.9);
  border-left-color: rgba(255, 255, 255, 0.08);
  box-shadow: -40px 0 120px rgba(0, 0, 0, 0.55);
}

.tools.open {
  transform: translateX(0);
}

@media (max-width: 768px) {
  .tools {
    left: 0;
    right: 0;
    width: 100%;
  }

  .main.tools-open {
    padding-right: 24px;
  }
}

@media (max-width: 1180px) {
  .main.tools-open {
    padding-right: 24px;
  }

  .main.tools-open .content {
    max-width: 1120px;
  }
}

.tools-top {
  padding: 18px 18px 12px;
  border-bottom: 1px solid var(--border);
  background:
    radial-gradient(circle at top right, rgba(154, 103, 56, 0.12), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 100%);
}

[data-theme="dark"] .tools-top {
  border-bottom-color: rgba(255, 255, 255, 0.08);
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

[data-theme="dark"] .tools-x {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(30, 30, 40, 0.35);
  color: rgba(255, 255, 255, 0.85);
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
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.tools-tabs button.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.84));
  box-shadow: var(--shadow-sm);
  color: rgba(0, 0, 0, 0.85);
}

[data-theme="dark"] .tools-tabs {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

[data-theme="dark"] .tools-tabs button {
  color: rgba(255, 255, 255, 0.7);
}

[data-theme="dark"] .tools-tabs button.active {
  background: rgba(30, 30, 40, 0.9);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
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

[data-theme="dark"] .sheet-section {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(30, 30, 40, 0.45);
}

.sheet-section-accent {
  border-color: rgba(154, 103, 56, 0.22);
  background: linear-gradient(180deg, rgba(154, 103, 56, 0.14), rgba(233, 214, 194, 0.26));
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

[data-theme="dark"] .sheet-toggle {
  background: linear-gradient(180deg, rgba(30, 30, 40, 0.85), rgba(30, 30, 40, 0.45));
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

[data-theme="dark"] .st-ico {
  background: rgba(196, 154, 108, 0.10);
  border-color: rgba(196, 154, 108, 0.14);
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

[data-theme="dark"] .st-chev {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.35);
  color: rgba(255, 255, 255, 0.75);
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

[data-theme="dark"] .tools-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(to top, rgba(18, 18, 18, 0.98), rgba(18, 18, 18, 0.78), rgba(18, 18, 18, 0));
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

.tools-btn span {
  white-space: nowrap;
}

[data-theme="dark"] .tools-btn {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 40, 0.45);
  color: rgba(255, 255, 255, 0.9);
}

.tools-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-color: rgba(0, 0, 0, 0.05);
  color: white;
  box-shadow: 0 18px 40px rgba(139, 94, 60, 0.32);
}

.flow-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 14px 0;
}

.guide-copy {
  padding: 0 14px 14px;
}

.guide-title {
  font-size: 1rem;
  font-weight: 700;
}

.guide-sub {
  margin-top: 4px;
  font-size: 0.84rem;
  color: var(--text-muted);
}

.flow-step {
  min-height: 30px;
  padding: 6px 8px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 10px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.flow-step.active {
  background: rgba(139, 94, 60, 0.12);
  color: var(--accent);
}

.field-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.action-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

@media (max-width: 640px) {

  .action-grid-3,
  .radio-group-tight {
    grid-template-columns: 1fr;
  }

  .hero-flow,
  .session-rail-stats,
  .flow-strip {
    grid-template-columns: 1fr 1fr;
  }

  .reading-toolbar {
    padding: 10px 12px;
  }

  .reading-toolbar-group {
    width: 100%;
  }

  .toolbar-chip {
    flex: 1 1 calc(50% - 8px);
    justify-content: center;
  }

  .verse {
    padding: 16px 14px;
  }

  .session-rail-top {
    grid-template-columns: 1fr;
  }

  .session-rail-actions {
    flex-wrap: wrap;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 520px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}

.stat {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 250, 243, 0.62));
  border-radius: 14px;
  padding: 10px;
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .stat {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.40);
}

.stat-k {
  font-size: 0.62rem;
  color: var(--text-muted);
  font-weight: 450;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-v {
  margin-top: 6px;
  font-size: 1.18rem;
  font-weight: 700;
  color: var(--text);
}

.stat-s {
  margin-top: 2px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.stat-cta {
  margin-top: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68));
  cursor: pointer;
  font-weight: 450;
  font-size: 11px;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

[data-theme="dark"] .stat-cta {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 40, 0.45);
  color: rgba(255, 255, 255, 0.9);
}

.chart {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 250, 243, 0.62));
  border-radius: 14px;
  padding: 10px;
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .chart {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.40);
}

.chart-title {
  font-weight: 450;
  color: var(--text);
  margin-bottom: 8px;
  font-size: 0.74rem;
}

.analytics-empty {
  display: grid;
  gap: 12px;
}

.analytics-empty-copy {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.skeleton-row {
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.06));
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.skeleton-card {
  height: 58px;
  border-radius: 16px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.06));
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

[data-theme="dark"] .skeleton-row,
[data-theme="dark"] .skeleton-card {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.08));
}

@keyframes shimmer {
  0% {
    background-position: 0% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

.bars {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 5px;
  align-items: end;
  min-height: 68px;
  padding-top: 6px;
}

.bar-col {
  display: flex;
  align-items: end;
  justify-content: center;
  min-height: 68px;
}

.bar {
  width: 100%;
  min-height: 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(139, 94, 60, 0.95), rgba(139, 94, 60, 0.32));
}

.bars-soft .bar {
  background: linear-gradient(180deg, rgba(31, 122, 140, 0.95), rgba(31, 122, 140, 0.30));
}

.bars-danger .bar {
  background: linear-gradient(180deg, rgba(190, 73, 73, 0.95), rgba(190, 73, 73, 0.28));
}

.planner-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.planner-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pill-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 249, 241, 0.62));
  box-shadow: var(--shadow-sm);
}

.pill-input-row {
  justify-content: space-between;
}

[data-theme="dark"] .pill-input {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.40);
}

.pill-input span {
  font-weight: 450;
  color: rgba(0, 0, 0, 0.6);
  min-width: 64px;
  font-size: 11px;
}

[data-theme="dark"] .pill-input span {
  color: rgba(255, 255, 255, 0.7);
}

.pill-input .input,
.pill-input .select {
  flex: 1;
  box-shadow: none;
  padding: 10px 10px;
  border-radius: 12px;
}

.empty-mini {
  color: var(--text-muted);
  font-weight: 400;
}

.leech-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leech {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 249, 241, 0.62));
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .leech {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.40);
}

.leech-k {
  font-weight: 450;
  font-size: 0.84rem;
}

.leech-s {
  color: var(--text-muted);
  font-weight: 400;
  font-size: 0.76rem;
}

.pill {
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(255, 250, 243, 0.62));
  font-weight: 450;
  color: rgba(0, 0, 0, 0.75);
  font-size: 11px;
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .pill {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.40);
  color: rgba(255, 255, 255, 0.85);
}

.tools-inline-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.read-list {
  display: grid;
  gap: 8px;
}

.read-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(78, 58, 38, 0.07);
  font-size: 0.76rem;
  align-items: center;
}

.read-row strong {
  font-weight: 500;
  text-align: right;
  overflow-wrap: anywhere;
}

.cta-row {
  display: flex;
  gap: 10px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.cta-row-split .cta {
  min-height: 46px;
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(250, 245, 239, 0.95));
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

[data-theme="dark"] .quiz-card {
  background: rgba(18, 18, 18, 0.92);
  border-color: rgba(255, 255, 255, 0.10);
}

.quiz-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .quiz-top {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.quiz-title-wrap {
  display: grid;
  gap: 4px;
}

.quiz-title {
  font-weight: 500;
  font-size: 1.05rem;
}

.quiz-title-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.quiz-x {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 20px;
}

[data-theme="dark"] .quiz-x {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 40, 0.5);
  color: rgba(255, 255, 255, 0.9);
}

.quiz-meta {
  padding: 14px 22px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quiz-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.73rem;
  box-shadow: var(--shadow-sm);
}

.quiz-body {
  padding: 18px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quiz-summary-title {
  font-size: 1.18rem;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.quiz-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}

.quiz-summary-skill-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.quiz-summary-skill,
.quiz-summary-explain {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .quiz-summary-skill,
[data-theme="dark"] .quiz-summary-explain {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
}

.quiz-summary-s {
  margin-top: 4px;
  font-size: 0.74rem;
  color: var(--text-muted);
  line-height: 1.45;
}

.quiz-summary-item {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 10px 10px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .quiz-summary-item {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
}

.quiz-summary-k {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 500;
}

.quiz-summary-v {
  margin-top: 6px;
  font-size: 1.08rem;
  font-weight: 500;
  color: var(--text);
}

.quiz-summary-mistakes {
  margin-top: 6px;
  display: grid;
  gap: 8px;
}

.quiz-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quiz-tag {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(190, 73, 73, 0.10);
  border: 1px solid rgba(190, 73, 73, 0.18);
  color: rgba(140, 30, 30, 0.9);
  font-weight: 500;
  font-size: 0.72rem;
}

[data-theme="dark"] .quiz-tag {
  background: rgba(190, 73, 73, 0.18);
  color: rgba(255, 255, 255, 0.86);
}

@media (max-width: 520px) {

  .quiz-summary-grid,
  .quiz-summary-skill-grid {
    grid-template-columns: 1fr;
  }

  .quiz-top,
  .quiz-body,
  .quiz-meta,
  .quiz-actions {
    padding-left: 16px;
    padding-right: 16px;
  }

  .quiz-grade,
  .quiz-actions {
    flex-direction: column;
  }
}

.quiz-prompt {
  font-size: 1.02rem;
  color: var(--text);
  line-height: 1.7;
}

.quiz-section-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.quiz-hint {
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.7;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-opt {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  font-size: 0.86rem;
  line-height: 1.55;
}

[data-theme="dark"] .quiz-opt {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
}

.quiz-actions {
  padding: 0 22px 22px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quiz-reveal {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-weight: 450;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

[data-theme="dark"] .quiz-reveal {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 40, 0.45);
  color: rgba(255, 255, 255, 0.9);
}

.quiz-action {
  min-height: 42px;
  padding: 9px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-weight: 450;
  font-size: 0.82rem;
  box-shadow: var(--shadow-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.quiz-action-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: white;
  border-color: rgba(0, 0, 0, 0.06);
}

.quiz-action-ghost {
  color: var(--text);
}

.quiz-grade {
  flex: 1;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.qg {
  min-height: 42px;
  padding: 9px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  font-weight: 450;
  font-size: 0.82rem;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.qg.primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-color: rgba(0, 0, 0, 0.06);
  color: white;
}

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

.banner.success {
  border-color: rgba(0, 150, 90, 0.25);
}

.banner.error {
  border-color: rgba(200, 0, 50, 0.25);
}

.banner.info {
  border-color: rgba(0, 0, 0, 0.10);
}

[data-theme="dark"] .banner {
  background: rgba(18, 18, 18, 0.88);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
}

[data-theme="dark"] .banner-action {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
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

[data-theme="dark"] .banner-x {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 40, 0.45);
  color: rgba(255, 255, 255, 0.9);
}

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
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
}

@keyframes fadeLift {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
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

.row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.mini-btn {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.68));
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--text);
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini-btn.danger {
  border-color: rgba(255, 0, 0, 0.2);
  color: #b00020;
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
}

[data-theme="dark"] .radio {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.25);
}

.radio input {
  margin: 0;
}

.checkline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.verses.focus .verse.dim {
  opacity: 0.22;
}

.verse.blur {
  filter: blur(4px);
  opacity: 0.38;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.field label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
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

[data-theme="dark"] .select,
[data-theme="dark"] .input {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.55);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.25);
}

.select:focus,
.input:focus {
  outline: none;
  border-color: rgba(139, 94, 60, 0.35);
  box-shadow: 0 0 0 4px rgba(139, 94, 60, 0.12), 0 10px 22px rgba(0, 0, 0, 0.06);
}

.select-prominent {
  border-color: rgba(139, 94, 60, 0.22);
  background: linear-gradient(180deg, rgba(139, 94, 60, 0.12), rgba(255, 255, 255, 0.92));
}

.range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-compact>* {
  flex: 1;
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

[data-theme="dark"] .range span {
  color: rgba(255, 255, 255, 0.35);
}

.radio-group {
  gap: 12px;
}

.radio {
  border-radius: 14px;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 400;
}

.radio-group-tight {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.radio-group-tight .radio {
  flex: 1 1 110px;
  justify-content: center;
}

.row .select {
  flex: 1;
}

.row .input,
.row .select,
.row .mini-btn {
  min-width: 0;
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
}

[data-theme="dark"] .switch {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.25);
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
}

[data-theme="dark"] .switch-ui {
  background: rgba(255, 255, 255, 0.14);
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
  transition: transform 0.15s ease, background 0.15s ease;
}

.switch input:checked+.switch-ui {
  background: rgba(139, 94, 60, 0.45);
}

.switch input:checked+.switch-ui::after {
  transform: translateX(18px);
}

.switch-text {
  font-size: 0.74rem;
  color: rgba(0, 0, 0, 0.72);
  font-weight: 400;
}

[data-theme="dark"] .switch-text {
  color: rgba(255, 255, 255, 0.82);
}

.range input {
  flex: 1;
}

.toggle {
  display: flex;
  gap: 8px;
}

.toggle button {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
}

.toggle button.active {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border-color: var(--accent);
  color: white;
}

.slider {
  width: 100%;
  height: 3px;
  -webkit-appearance: none;
  background: var(--border);
  border-radius: 3px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.value {
  color: var(--accent);
  margin-left: 4px;
}

.check label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
  text-transform: none;
}

.primary-btn {
  padding: 12px;
  border-radius: 40px;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  border: none;
  color: white;
  cursor: pointer;
  font-weight: 450;
  box-shadow: 0 16px 34px rgba(139, 94, 60, 0.26);
}

.full {
  width: 100%;
}

/* Audio Player */
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--surface);
  border-top: 1px solid var(--border);
  padding: 8px 16px;
}

.main.tools-open .player-bar {
  right: var(--tools-width);
}

.player-collapsed-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 42px 2px 0;
}

.player-collapsed-copy {
  min-width: 0;
}

.player-collapsed-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-collapsed-sub {
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-collapse {
  position: absolute;
  right: 12px;
  top: 6px;
  width: 34px;
  height: 28px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  display: grid;
  place-items: center;
  color: rgba(73, 58, 45, 0.76);
}

[data-theme="dark"] .player-collapse {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
  color: rgba(255, 255, 255, 0.85);
}

.player-progress {
  position: relative;
  height: 14px;
  cursor: pointer;
  margin-bottom: 4px;
}

.player-track {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(117, 101, 85, 0.16);
  border-radius: 2px;
}

.player-fill {
  position: absolute;
  top: 6px;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent-strong));
  border-radius: 2px;
}

.player-handle {
  position: absolute;
  top: 3px;
  width: 8px;
  height: 8px;
  background: var(--accent);
  box-shadow: 0 4px 14px rgba(154, 103, 56, 0.32);
  border-radius: 50%;
  transform: translateX(-50%);
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.player-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  color: rgba(73, 58, 45, 0.64);
}

.player-time.right {
  text-align: right;
}

.player-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-icon {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.66));
  border: 1px solid var(--border);
  padding: 6px;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  color: rgba(73, 58, 45, 0.76);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.player-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.player-icon.play {
  font-size: 18px;
  color: rgba(73, 58, 45, 0.92);
}

.player-menu-overlay {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 30;
}

.player-menu {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 58px;
  width: min(420px, calc(100vw - 24px));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 242, 234, 0.96));
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.14);
  padding: 10px;
}

.player-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
  text-align: left;
  border-radius: 12px;
  transition: background 140ms ease, transform 140ms ease;
}

.player-menu-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.pm-ico {
  width: 18px;
  text-align: center;
  color: rgba(0, 0, 0, 0.65);
}

.player-menu-sep {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 6px 2px;
}

.player-menu-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
}

.pm-label {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.65);
}

.pm-value {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.75);
  min-width: 40px;
  text-align: right;
}

.pm-range {
  width: 100%;
}

.pm-select {
  grid-column: 2 / span 2;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: white;
  font-size: 12px;
}

.icon-btn:hover,
.rail-btn:hover,
.cta-btn:hover,
.tools-x:hover,
.tools-tabs button:hover,
.sheet-toggle:hover,
.tools-btn:hover,
.stat-cta:hover,
.cta:hover,
.quiz-opt:hover,
.quiz-reveal:hover,
.qg:hover,
.mini-btn:hover,
.radio:hover,
.switch:hover,
.player-icon:hover,
.player-menu-item:hover {
  transform: translateY(-1px);
}

.icon-btn:hover,
.rail-btn:hover,
.tools-x:hover,
.tools-btn:hover,
.stat-cta:hover,
.cta:hover,
.quiz-opt:hover,
.quiz-reveal:hover,
.qg:hover,
.mini-btn:hover,
.radio:hover,
.switch:hover,
.player-icon:hover {
  box-shadow: var(--shadow-md);
}

.tools-tabs button:hover,
.sheet-toggle:hover,
.player-menu-item:hover {
  background: rgba(255, 255, 255, 0.76);
}

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
  .app-header {
    padding: 10px 16px;
  }

  .main {
    padding: 16px 16px 100px;
  }

  .main.tools-open {
    padding-right: 16px;
  }

  .main.tools-open .player-bar {
    right: 0;
  }

  .session-meta {
    display: none;
  }

  .player-row {
    gap: 8px;
  }

  .player-btn {
    padding: 4px 8px;
  }

  .player-select {
    display: none;
  }

  .player-controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  .verse-arabic {
    font-size: 1.2rem;
  }
}

@media (min-width: 1500px) {
  .content {
    max-width: 1220px;
  }

  .main.tools-open .content {
    max-width: min(1180px, calc(100vw - var(--tools-width) - 120px));
  }
}
</style>
