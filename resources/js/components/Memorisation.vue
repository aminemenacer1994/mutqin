<template>
  <div class="app" :data-theme="theme">
    <div v-if="banner" class="banner" :class="banner.kind">
      <span>{{ banner.message }}</span>
      <button class="banner-x" @click="banner = null" aria-label="Dismiss">×</button>
    </div>


    <!-- Main Content -->
    <div class="main" :class="{ 'tools-open': showTools }">

      <div class="content">
        <section v-if="showOnboarding" class="hero-card">
          <div class="hero-copy">
            <div class="hero-kicker">Focused hifz system</div>
            <h1 class="hero-title">Memorise and retain Quran intelligently.</h1>
            <p class="hero-sub">Structured memorisation, automatic revision, and retention tracking in one focused system.</p>
          </div>
          <div class="hero-flow">
            <div class="hero-step"><span>1</span><strong>Read</strong></div>
            <div class="hero-step"><span>2</span><strong>Repeat</strong></div>
            <div class="hero-step"><span>3</span><strong>Review</strong></div>
            <div class="hero-step"><span>4</span><strong>Retain</strong></div>
          </div>
          <div class="hero-points">
            <div class="hero-point"><i class="bi bi-shield-check"></i><span>Weak ayahs are tracked automatically.</span></div>
            <div class="hero-point"><i class="bi bi-clock-history"></i><span>Reviews appear before forgetting.</span></div>
            <div class="hero-point"><i class="bi bi-magic"></i><span>Sessions are generated automatically.</span></div>
          </div>
          <div class="hero-actions">
            <button class="cta cta-primary" @click="beginPlan"><i class="bi bi-play-circle"></i><span>{{ onboardingPrimaryLabel }}</span></button>
            <button class="cta cta-ghost" @click="showTools = true"><i class="bi bi-sliders"></i><span>Open setup</span></button>
          </div>
        </section>

        <div class="session-rail" v-if="currentChapter && verses.length">
          <div class="session-rail-top">
            <div class="session-rail-copy">
              <div class="session-rail-kicker">Current session</div>
              <div class="session-rail-title">{{ currentChapter.name_simple }}</div>
              <div class="session-rail-meta">Ayah {{ currentPosition }}/{{ totalVerses }} · Remaining {{ remainingAyahs }} · {{ sessionTypeInfo.label }} · {{ progressPercent }}%</div>
            </div>
            <div class="session-rail-actions">
              <button class="rail-btn rail-btn-ghost" @click="showTools = true"><i class="bi bi-layout-sidebar-inset"></i><span>Plan</span></button>
              <button class="rail-btn" @click="prev" :disabled="!canPrev"><i class="bi bi-skip-backward"></i><span>Prev</span></button>
              <button class="rail-btn rail-btn-primary" @click="handlePrimaryAction"><i class="bi" :class="isPlaying ? 'bi-pause-fill' : 'bi-play-fill'"></i><span>{{ railPrimaryLabel }}</span></button>
              <button class="rail-btn" @click="next" :disabled="!canNext"><i class="bi bi-skip-forward"></i><span>Next</span></button>
            </div>
          </div>
          <div class="session-rail-stats">
            <div class="rail-stat"><span>Session</span><strong>{{ sessionTypeInfo.label }}</strong></div>
            <div class="rail-stat"><span>Progress</span><strong>{{ progressPercent }}%</strong></div>
            <div class="rail-stat"><span>Remaining</span><strong>{{ remainingAyahs }}</strong></div>
            <div class="rail-stat"><span>ETA</span><strong>{{ etaLabel }}</strong></div>
          </div>
          <div class="progress-bar progress-bar-wide">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!verses.length && !showOnboarding" class="empty">
          <div class="empty-card">
            <div class="empty-icon">﴿</div>
            <h3>Begin your journey</h3>
            <p>{{ nextActionDescription }}</p>
            <div class="empty-actions">
              <button class="cta cta-primary" @click="beginPlan"><i class="bi bi-play-circle"></i><span>{{ emptyPrimaryLabel }}</span></button>
              <button class="cta cta-ghost" @click="showTools = true"><i class="bi bi-sliders"></i><span>Open setup</span></button>
            </div>
          </div>
        </div>

        <!-- Verses -->
        <div v-else class="verses" :class="{ compact: compactMode, focus: focusMode }">
          <div v-for="(verse, i) in verses" :key="verse.key" class="verse" :class="verseClasses(verse, i)">
            <div class="verse-head">
              <div class="verse-badge">
                <span class="verse-num">Ayah {{ verse.number }}</span>
                <span class="verse-ref">{{ verse.key }}</span>
              </div>
              <div class="verse-actions">
                <button class="action-btn" @click="playVerse(verse)">▶</button>
                <button class="action-btn" @click="setActive(verse.key)">◎</button>
              </div>
            </div>
            <div class="verse-arabic" dir="rtl" v-html="verse.arabic"></div>
            <div v-if="showTranslation && verse.translation" class="verse-translation">{{ verse.translation }}</div>
            <div v-if="showWordByWord && verse.words?.length" class="verse-words">
              <span v-for="(w, i) in verse.words" :key="i" class="word">
                <span class="word-ar" dir="rtl">{{ w.ar }}</span>
                <span class="word-en">{{ w.en }}</span>
                <button v-if="w.audio" class="word-play" @click="playWordAudio(w.audio)">🔊</button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tools Panel -->
      <aside class="tools" :class="{ open: showTools }">
        <div class="tools-top">
          <div class="tools-topbar">
            <div class="tools-title">{{ toolsHeaderTitle }}</div>
            <button class="tools-x" @click="showTools = false" aria-label="Close panel"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="tools-context">{{ contextLabel }}</div>
          <div class="tools-tabs">
            <button :class="{ active: tab === 'beginner' }" @click="tab = 'beginner'">Beginner</button>
            <button :class="{ active: tab === 'advanced' }" @click="tab = 'advanced'">Advanced</button>
            <button :class="{ active: tab === 'analytics' }" @click="tab = 'analytics'">Analytics</button>
          </div>
        </div>

        <div class="tools-body">
          <!-- Beginner Tab -->
          <div v-if="tab === 'beginner'" class="sheet">
            <section class="sheet-section sheet-section-guide">
              <div class="flow-strip">
                <div class="flow-step" :class="{ active: onboardingStep === 1 }">1. Read</div>
                <div class="flow-step" :class="{ active: onboardingStep === 2 }">2. Repeat</div>
                <div class="flow-step" :class="{ active: onboardingStep === 3 }">3. Review</div>
                <div class="flow-step" :class="{ active: onboardingStep === 4 }">4. Retain</div>
              </div>
              <div class="guide-copy">
                <div class="guide-title">{{ beginnerGuide.title }}</div>
                <div class="guide-sub">{{ beginnerGuide.text }}</div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('beginner_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico">A</span>
                  <span class="st-txt">
                    <span class="st-title">Setup</span>
                    <span class="st-sub">Surah, reciter, range</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.beginner_setup }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.beginner_setup">
                <div class="field-grid">
                  <div class="field">
                    <label>Surah</label>
                    <select v-model="chapterId" @change="loadChapter" class="select">
                      <option :value="0">Choose a surah...</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.id }}. {{ c.name_simple }}</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                  </div>
                </div>

                <div class="field">
                  <label>Ayah range</label>
                  <div class="range range-compact">
                    <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                    <span>to</span>
                    <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                  </div>
                </div>
                <div class="cta-row">
                  <button class="cta cta-primary" @click="beginPlan"><i class="bi bi-play-circle"></i><span>{{ beginnerPrimaryLabel }}</span></button>
                  <button class="cta cta-ghost" @click="tab='analytics'"><i class="bi bi-bar-chart"></i><span>See plan</span></button>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('beginner_playback')" type="button">
                <span class="st-left">
                  <span class="st-ico">B</span>
                  <span class="st-txt">
                    <span class="st-title">Playback</span>
                    <span class="st-sub">Speed, delay, repeats, mode</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.beginner_playback }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.beginner_playback">
                <div class="field-grid">
                  <div class="field">
                    <label>Speed</label>
                    <select v-model.number="speed" @change="applySpeed" class="select select-prominent">
                      <option v-for="s in speedOptions" :key="`sp-${s}`" :value="s">{{ s }}x</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Delay</label>
                    <select v-model.number="delay" class="select">
                      <option v-for="d in delayOptions" :key="`dl-${d}`" :value="d">{{ d }}s</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Repeat</label>
                    <select v-model.number="repeats" @change="rebuildQueue" class="select">
                      <option v-for="r in repeatOptions" :key="`rp-${r}`" :value="r">{{ r }}</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Mode</label>
                    <div class="radio-group radio-group-tight">
                      <label class="radio">
                        <input type="radio" value="auto" v-model="playMode">
                        <span>Auto</span>
                      </label>
                      <label class="radio">
                        <input type="radio" value="manual" v-model="playMode">
                        <span>Manual</span>
                      </label>
                      <label class="radio">
                        <input type="radio" value="loop" v-model="playMode">
                        <span>Loop</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Advanced Tab -->
          <div v-if="tab === 'advanced'" class="sheet">
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_setup')" type="button">
                <span class="st-left">
                  <span class="st-ico">🧭</span>
                  <span class="st-txt">
                    <span class="st-title">Setup</span>
                    <span class="st-sub">Surah • Range • Reciter • Playback</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_setup }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_setup">
                <div class="field-grid">
                  <div class="field">
                    <label>Surah</label>
                    <select v-model="chapterId" @change="loadChapter" class="select">
                      <option :value="0">Choose a surah...</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.id }}. {{ c.name_simple }}</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Study</label>
                    <select v-model="studyMode" class="select">
                      <option value="recite">Recite</option>
                      <option value="quiz">Quiz</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div class="field" v-if="studyMode === 'quiz'">
                    <label>Quiz type</label>
                    <select v-model="quizType" class="select">
                      <option value="mixed">Mixed</option>
                      <option value="flashcard">Flashcards</option>
                      <option value="mcq">Multiple choice</option>
                      <option value="audio_mcq">Audio choose</option>
                      <option value="blank">Fill blank</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Reciter</label>
                    <select v-model="reciterId" @change="refreshVerses" class="select">
                      <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                  </div>

                  <div class="field field-span-2">
                    <label>Ayah range</label>
                    <div class="range range-compact">
                      <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                      <span>to</span>
                      <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
                    </div>
                  </div>

                  <div class="field">
                    <label>Speed</label>
                    <select v-model.number="speed" @change="applySpeed" class="select select-prominent">
                      <option v-for="s in speedOptions" :key="`asp-${s}`" :value="s">{{ s }}x</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Delay</label>
                    <select v-model.number="delay" class="select">
                      <option v-for="d in delayOptions" :key="`adl-${d}`" :value="d">{{ d }}s</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Repeat</label>
                    <select v-model.number="repeats" @change="rebuildQueue" class="select">
                      <option v-for="r in repeatOptions" :key="`arp-${r}`" :value="r">{{ r }}</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Mode</label>
                    <div class="radio-group radio-group-tight">
                      
                  <label class="radio">
                    <input type="radio" value="auto" v-model="playMode">
                    <span>Auto</span>
                  </label>
                  <label class="radio">
                    <input type="radio" value="manual" v-model="playMode">
                    <span>Manual</span>
                  </label>
                  <label class="radio">
                    <input type="radio" value="loop" v-model="playMode">
                    <span>Loop</span>
                  </label>
                    </div>
                  </div>
                </div>

                <div class="cta-row">
                  <button class="cta cta-ghost" @click="tab='analytics'"><i class="bi bi-bar-chart"></i><span>See progress</span></button>
                  <button class="cta cta-primary" @click="startSession"><i class="bi bi-play-circle"></i><span>{{ advancedPrimaryLabel }}</span></button>
                </div>
              </div>
            </section>

            <section class="sheet-section sheet-section-accent">
              <button class="sheet-toggle" @click="toggleSection('advanced_practice')" type="button">
                <span class="st-left">
                  <span class="st-ico">✨</span>
                  <span class="st-txt">
                    <span class="st-title">Practice</span>
                    <span class="st-sub">Chaining • Focus • Looping</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_practice }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_practice">
                <div class="field-grid">
                  <div class="field">
                    <label>Chaining</label>
                    <select v-model="order" @change="rebuildQueue" class="select">
                      <option value="seq">Sequential</option>
                      <option value="cum">Cumulative</option>
                      <option value="rand">Random</option>
                      <option value="chain">A-A/B-B</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Loop delay</label>
                    <select v-model.number="rangeLoopDelay" class="select">
                      <option v-for="d in delayOptions" :key="`rld-${d}`" :value="d">{{ d }}s</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Blur context</label>
                    <label class="switch">
                      <input type="checkbox" v-model="blurAdjacent">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Reduce distraction</span>
                    </label>
                  </div>

                  <div class="field">
                    <label>Focus mode</label>
                    <label class="switch">
                      <input type="checkbox" v-model="focusMode">
                      <span class="switch-ui"></span>
                      <span class="switch-text">Highlight active ayah</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('advanced_saved')" type="button">
                <span class="st-left">
                  <span class="st-ico">💾</span>
                  <span class="st-txt">
                    <span class="st-title">Saved sessions</span>
                    <span class="st-sub">Save • Load • Delete</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.advanced_saved }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.advanced_saved">
                <div class="field">
                  <label>Saved sessions</label>
                  <select v-model="selectedSessionId" class="select">
                    <option value="">Select saved session…</option>
                    <option v-for="s in savedSessions" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                </div>

                <div class="action-grid-3">
                  <button class="mini-btn" :disabled="!selectedSessionId" @click="loadSession(selectedSessionId)"><i class="bi bi-folder2-open"></i><span>Load</span></button>
                  <button class="mini-btn danger" :disabled="!selectedSessionId" @click="deleteSession(selectedSessionId)"><i class="bi bi-trash3"></i><span>Delete</span></button>
                  <button class="mini-btn" @click="tab='analytics'"><i class="bi bi-graph-up"></i><span>Stats</span></button>
                </div>

                <div class="field">
                  <label>Save current</label>
                  <div class="row">
                    <input class="input" v-model.trim="sessionName" placeholder="Session name">
                    <button class="mini-btn" @click="saveSession">Save</button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Analytics Tab -->
          <div v-if="tab === 'analytics'" class="sheet">
            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('analytics_overview')" type="button">
                <span class="st-left">
                  <span class="st-ico">📊</span>
                  <span class="st-txt">
                    <span class="st-title">Overview</span>
                    <span class="st-sub">Due • Accuracy • Streak</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.analytics_overview }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.analytics_overview">
                <div class="stat-grid">
                  <div class="stat">
                    <div class="stat-k">Retention</div>
                    <div class="stat-v">{{ retentionStats.overallRetention }}%</div>
                    <div class="stat-s">Overall retention</div>
                  </div>
                  <div class="stat">
                    <div class="stat-k">Mastery</div>
                    <div class="stat-v">{{ retentionStats.surahMastery }}%</div>
                    <div class="stat-s">Current surah</div>
                  </div>
                  <div class="stat">
                    <div class="stat-k">Weak ayahs</div>
                    <div class="stat-v">{{ retentionStats.weakAyahs.length }}</div>
                    <div class="stat-s">Needs support</div>
                  </div>
                  <div class="stat">
                    <div class="stat-k">Weekly lift</div>
                    <div class="stat-v">{{ retentionStats.weeklyRetentionImprovement > 0 ? '+' : '' }}{{ retentionStats.weeklyRetentionImprovement }}%</div>
                    <div class="stat-s">Retention change</div>
                  </div>
                </div>

                <div class="field" style="margin-top:12px">
                  <label>Due by skill</label>
                  <div class="planner-row">
                    <div class="pill">Text: <strong>{{ stats.dueBySkill.recite_text }}</strong></div>
                    <div class="pill">Audio: <strong>{{ stats.dueBySkill.audio_recall }}</strong></div>
                    <div class="pill">Meaning: <strong>{{ stats.dueBySkill.meaning }}</strong></div>
                  </div>
                </div>

                <div class="cta-row">
                  <button class="cta cta-primary" @click="beginPlannerSession"><i class="bi bi-play-circle"></i><span>{{ plannerPrimaryCta }}</span></button>
                  <button class="cta cta-ghost" @click="tab='beginner'"><i class="bi bi-arrow-left-circle"></i><span>Back to setup</span></button>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('analytics_retention')" type="button">
                <span class="st-left">
                  <span class="st-ico"><i class="bi bi-journal-check"></i></span>
                  <span class="st-txt">
                    <span class="st-title">Retention</span>
                    <span class="st-sub">Read only</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.analytics_retention }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.analytics_retention">
                <div class="read-list">
                  <div class="read-row">
                    <span>Weak ayahs</span>
                    <strong>{{ weakAyahSummary }}</strong>
                  </div>
                  <div class="read-row">
                    <span>Weak word clusters</span>
                    <strong>{{ weakWordSummary }}</strong>
                  </div>
                  <div class="read-row">
                    <span>Forgetting trend</span>
                    <strong>{{ retentionStats.forgettingTrend }}</strong>
                  </div>
                  <div class="read-row">
                    <span>Weekly improvement</span>
                    <strong>{{ retentionStats.weeklyRetentionImprovement > 0 ? '+' : '' }}{{ retentionStats.weeklyRetentionImprovement }}%</strong>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('analytics_leeches')" type="button">
                <span class="st-left">
                  <span class="st-ico">🧲</span>
                  <span class="st-txt">
                    <span class="st-title">Leeches</span>
                    <span class="st-sub">Stuck cards</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.analytics_leeches }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.analytics_leeches">
                <div v-if="leeches.length === 0" class="empty-mini">
                  No leeches. Keep going.
                </div>
                <div v-else class="leech-list">
                  <div v-for="l in leeches" :key="l.key" class="leech">
                    <div class="leech-main">
                      <div class="leech-k">{{ l.verseKey }}</div>
                      <div class="leech-s">{{ l.skillLabel }} • lapses {{ l.lapses }}</div>
                    </div>
                    <button class="mini-btn" @click="unsuspendLeech(l.key)">Unsuspend</button>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section sheet-section-accent">
              <button class="sheet-toggle" @click="toggleSection('analytics_trends')" type="button">
                <span class="st-left">
                  <span class="st-ico">📈</span>
                  <span class="st-txt">
                    <span class="st-title">Trends</span>
                    <span class="st-sub">Last 14 days</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.analytics_trends }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.analytics_trends">
                <div class="chart">
                  <div class="chart-title">Grades per day</div>
                  <div class="bars">
                    <div v-for="(v,i) in stats.grades14d" :key="`g-${i}`" class="bar-col">
                      <div class="bar" :style="{ height: chartBarHeight(stats.grades14d, v) }"></div>
                    </div>
                  </div>
                </div>
                <div class="chart">
                  <div class="chart-title">Average quality</div>
                  <div class="bars bars-soft">
                    <div v-for="(v,i) in stats.avgQuality14d" :key="`q-${i}`" class="bar-col">
                      <div class="bar" :style="{ height: chartBarHeight(stats.avgQuality14d, v) }"></div>
                    </div>
                  </div>
                </div>
                <div class="chart">
                  <div class="chart-title">Weak ayah trend</div>
                  <div class="bars bars-danger">
                    <div v-for="(v,i) in retentionStats.weakTrend14d" :key="`w-${i}`" class="bar-col">
                      <div class="bar" :style="{ height: chartBarHeight(retentionStats.weakTrend14d, v) }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="sheet-section">
              <button class="sheet-toggle" @click="toggleSection('analytics_planner')" type="button">
                <span class="st-left">
                  <span class="st-ico">🗓</span>
                  <span class="st-txt">
                    <span class="st-title">Planner</span>
                    <span class="st-sub">Daily targets</span>
                  </span>
                </span>
                <span class="st-chev" :class="{ open: sectionOpen.analytics_planner }">⌄</span>
              </button>
              <div class="sheet-content" v-show="sectionOpen.analytics_planner">
                <div class="field">
                  <label>Daily goals</label>
                  <div class="planner-row">
                    <div class="pill">Ayah target: <strong>{{ planner.settings.newAyat }}</strong></div>
                    <div class="pill">Review target: <strong>{{ planner.settings.reviewCards }}</strong></div>
                    <div class="pill">Streak: <strong>{{ stats.streakDays }}</strong></div>
                  </div>
                </div>

                <div class="field">
                  <label>Planner settings</label>
                  <div class="planner-settings">
                    <div class="pill-input">
                      <span>New</span>
                      <input class="input" type="number" min="0" v-model.number="plannerState.settings.newAyat" @change="persistPlanner">
                    </div>
                    <div class="pill-input">
                      <span>Review</span>
                      <input class="input" type="number" min="0" v-model.number="plannerState.settings.reviewCards" @change="persistPlanner">
                    </div>
                    <div class="pill-input">
                      <span>Min</span>
                      <input class="input" type="number" min="5" v-model.number="plannerState.settings.dailyMinutes" @change="persistPlanner">
                    </div>
                    <div class="pill-input">
                      <span>Mode</span>
                      <select class="select" v-model="plannerState.settings.mode" @change="persistPlanner">
                        <option value="hybrid">Hybrid</option>
                        <option value="quiz">Quiz</option>
                        <option value="recite">Recite</option>
                      </select>
                    </div>
                    <div class="pill-input">
                      <span>From</span>
                      <input class="input" type="number" min="1" max="114" v-model.number="plannerState.settings.startSurah" @change="persistPlanner">
                    </div>
                    <div class="pill-input">
                      <span>To</span>
                      <input class="input" type="number" min="1" max="114" v-model.number="plannerState.settings.endSurah" @change="persistPlanner">
                    </div>
                  </div>
                </div>

                <div class="field">
                  <label>Why reviews are due</label>
                  <div class="read-list">
                    <div v-for="reason in reviewReasons" :key="reason" class="read-row">
                      <span>{{ reason }}</span>
                      <strong>Due</strong>
                    </div>
                  </div>
                </div>

                <div class="field">
                  <label>Today progress</label>
                  <div class="planner-row">
                    <div class="pill">Graded: <strong>{{ stats.gradedToday }}</strong></div>
                    <div class="pill">Listened: <strong>{{ stats.listenedAyatToday }}</strong></div>
                  </div>
                </div>
                <div class="field" v-if="todayPlan">
                  <label>Today plan</label>
                  <div class="planner-row">
                    <div class="pill">Type: <strong>{{ sessionTypeInfo.label }}</strong></div>
                    <div class="pill">Range: <strong>{{ todayPlan.rangeStart }}–{{ todayPlan.rangeEnd }}</strong></div>
                    <div class="pill">ETA: <strong>{{ todayPlanEtaLabel }}</strong></div>
                  </div>
                </div>
                <div class="tools-inline-actions">
                  <button class="tools-btn tools-btn-ghost" @click="generateTodayPlan"><i class="bi bi-magic"></i><span>Generate plan</span></button>
                  <button class="tools-btn tools-btn-primary" @click="applyTodayPlan"><i class="bi bi-play-circle"></i><span>Begin plan</span></button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="tools-footer">
          <button class="tools-btn tools-btn-ghost" @click="resetControls"><i class="bi bi-arrow-counterclockwise"></i><span>Reset</span></button>
          <button class="tools-btn tools-btn-ghost" @click="showTools = false"><i class="bi bi-x-circle"></i><span>Close</span></button>
          <button class="tools-btn tools-btn-primary" @click="footerPrimaryAction"><i class="bi bi-play-circle"></i><span>{{ footerPrimaryLabel }}</span></button>
        </div>
      </aside>
    </div>

    <div v-if="quizActive" class="quiz-overlay">
      <div class="quiz-card">
        <div class="quiz-top">
          <div class="quiz-title">Quiz</div>
          <button class="quiz-x" @click="stopQuiz">×</button>
        </div>
        <div class="quiz-meta">{{ quizIndex + 1 }} / {{ quizQueue.length }} • {{ quizCard?.key }}</div>

        <div class="quiz-body" v-if="quizCard">
          <div v-if="quizCard.type === 'flashcard'">
            <div class="quiz-prompt" dir="rtl" v-html="quizCard.arabic"></div>
            <button class="quiz-reveal" v-if="!quizRevealed" @click="quizRevealed = true">Show answer</button>
            <div v-if="quizRevealed" class="quiz-hint">{{ quizCard.translation || 'Grade yourself' }}</div>
          </div>

          <div v-else-if="quizCard.type === 'mcq'">
            <div class="quiz-prompt">Which ayah is this?</div>
            <div class="quiz-prompt" dir="rtl" v-html="quizCard.arabic"></div>
            <div class="quiz-options">
              <label v-for="opt in quizOptions" :key="opt.key" class="quiz-opt">
                <input type="radio" name="mcq" :value="opt.key" v-model="quizAnswer">
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <div v-else-if="quizCard.type === 'audio_mcq'">
            <div class="quiz-prompt">Listen, then choose the ayah</div>
            <button class="quiz-reveal" @click="playVerse(quizCard)">Replay audio</button>
            <div class="quiz-options">
              <label v-for="opt in quizOptions" :key="opt.key" class="quiz-opt">
                <input type="radio" name="amcq" :value="opt.key" v-model="quizAnswer">
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <div v-else>
            <div class="quiz-prompt">Fill the blank</div>
            <div class="quiz-prompt">{{ quizCard.prompt }}</div>
            <input class="input" v-model="quizAnswer" placeholder="Type missing word">
          </div>
        </div>

        <div class="quiz-actions">
          <button class="tools-btn tools-btn-ghost" @click="stopQuiz">Stop</button>
          <button class="tools-btn tools-btn-ghost" v-if="quizCard?.type === 'flashcard' && !quizRevealed" @click="quizRevealed = true">Reveal</button>
          <button class="tools-btn tools-btn-primary" v-if="quizCard?.type !== 'flashcard'" @click="submitQuiz()">Next</button>
          <div class="quiz-grade" v-else>
            <button class="qg" @click="submitQuiz(2)">Again</button>
            <button class="qg" @click="submitQuiz(3)">Hard</button>
            <button class="qg primary" @click="submitQuiz(4)">Good</button>
            <button class="qg" @click="submitQuiz(5)">Easy</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="confettiActive" class="confetti" :key="confettiSeed" aria-hidden="true">
      <span v-for="n in 26" :key="n" class="confetti-piece" :style="{
        left: (Math.random() * 100) + '%',
        background: ['#8b5e3c','#1f7a8c','#f4d35e','#ee964b','#2a9d8f'][n % 5],
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

      <div class="player-controls">
        <div class="player-time left">{{ formatTime(currentTime) }}</div>

        <div class="player-center">
          <button class="player-icon" @click="togglePlayerMenu" aria-label="Menu">⋯</button>
          <button class="player-icon" @click="applySpeed" aria-label="Speed">{{ speed }}x</button>
          <button class="player-icon" @click="prev" :disabled="!canPrev" aria-label="Previous">⏮</button>
          <button class="player-icon play" @click="togglePlay" aria-label="Play">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="player-icon" @click="next" :disabled="!canNext" aria-label="Next">⏭</button>
          <button class="player-icon" @click="closePlayer" aria-label="Close">×</button>
        </div>

        <div class="player-time right">{{ formatTime(duration) }}</div>
      </div>

      <div v-if="playerMenuOpen" class="player-menu-overlay" @click="playerMenuOpen = false">
        <div class="player-menu" @click.stop>
          <button class="player-menu-item" @click="downloadCurrentAudio">
            <span class="pm-ico">↓</span>
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
import { getEditions, getSurahEdition } from '../lib/quranApis'

export default {
  name: 'TelawaApp',
  data() {
    return {
      theme: 'light',
      showTools: true,
      tab: 'beginner',

      chapters: [],
      chapterId: 0,
      currentChapter: null,
      rangeStart: 1,
      rangeEnd: 7,

      reciters: [{ id: 7, name: 'Alafasy' }],
      reciterId: 7,
      alquranAudioEditions: [],
      alquranEdition: '',

      speedOptions: [0.5, 0.75, 1, 1.25, 1.5],
      delayOptions: [0, 0.5, 1, 2, 3, 5, 7, 10],
      repeatOptions: [1, 2, 3, 4, 5, 7, 10],
      rangeLoopDelay: 1,
      blurAdjacent: false,
      focusMode: false,
      sessionName: '',
      savedSessions: [],
      selectedSessionId: '',
      studyMode: 'recite',
      quizActive: false,
      quizType: 'mixed',
      quizQueue: [],
      quizIndex: 0,
      quizCard: null,
      quizOptions: [],
      quizAnswer: '',
      quizRevealed: false,
      quizLastResult: null,
      hybridPendingKey: null,
      quizSkill: 'recite_text',
      confettiActive: false,
      confettiSeed: 0,
      sm2: {},
      events: [],
      plannerState: null,
      todayPlan: null,
      planRun: null,
      banner: null,
      metrics: null,
      onboardingDismissed: false,
      restoredAudioState: null,
      
      script: 'uthmani',
      showTranslation: true,
      showWordByWord: false,
      compactMode: false,

      playMode: 'auto',
      speed: 1,
      delay: 1,
      repeats: 1,
      order: 'seq',

      verses: [],
      activeKey: null,
      queue: [],
      queueIndex: 0,

      playerVisible: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,

      audioElement: null,
      lastAudioDebug: null,
      playerMenuOpen: false,
      sectionOpen: {
        beginner_setup: true,
        beginner_playback: true,
        advanced_setup: true,
        advanced_practice: true,
        advanced_saved: true,
        analytics_overview: true,
        analytics_retention: true,
        analytics_trends: true,
        analytics_planner: true
        ,analytics_leeches: false
      }
    }
  },
  computed: {
    themeIcon() {
      return this.theme === 'dark' ? '☾' : this.theme === 'sepia' ? '◐' : '☀'
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
    etaLabel() {
      const seconds = Math.max(0, this.remainingAyahs * this.estimateAyahSeconds())
      const minutes = Math.max(1, Math.ceil(seconds / 60))
      return `${minutes} min`
    },
    seekPercent() {
      if (!this.duration) return 0
      return (this.currentTime / this.duration) * 100
    },
    canPrev() {
      return this.queueIndex > 0
    },
    canNext() {
      return this.queueIndex < this.queue.length - 1
    },
    primaryLabel() {
      if (!this.chapterId) return 'Start'
      if (!this.verses.length) return 'Start'
      if (!this.isPlaying) return 'Continue'
      return 'Controls'
    },
    primaryIcon() {
      if (!this.chapterId) return '→'
      if (!this.verses.length) return '▶'
      if (!this.isPlaying) return '▶'
      return '⚙'
    },
    showOnboarding() {
      return !this.onboardingDismissed && !this.chapterId && !this.activeKey && !this.quizActive
    },
    onboardingStep() {
      if (!this.chapterId) return 1
      if (!this.activeKey) return 2
      if (this.sessionTypeInfo.key === 'revision') return 3
      return 4
    },
    beginnerGuide() {
      const map = {
        1: { title: 'Choose what to read', text: 'Pick a surah and ayah range first.' },
        2: { title: 'Build your repetition', text: 'Set speed, delay, and repeats.' },
        3: { title: 'Review before forgetting', text: 'Weak ayahs return automatically.' },
        4: { title: 'Track retention', text: 'Progress stays saved and guided.' }
      }
      return map[this.onboardingStep] || map[1]
    },
    onboardingPrimaryLabel() {
      return this.todayPlan ? 'Begin plan' : 'Open setup'
    },
    beginnerPrimaryLabel() {
      return this.todayPlan ? 'Begin plan' : 'Start memorising'
    },
    advancedPrimaryLabel() {
      return this.sessionTypeInfo.label === 'Revision' ? 'Start session' : this.sessionTypeInfo.label === 'Recovery' ? 'Continue chain' : 'Start session'
    },
    emptyPrimaryLabel() {
      return this.todayPlan ? 'Begin plan' : 'Start memorising'
    },
    railPrimaryLabel() {
      return this.isPlaying ? 'Pause' : this.sessionTypeInfo.label === 'Recovery' ? 'Continue chain' : 'Start session'
    },
    footerPrimaryLabel() {
      return this.tab === 'analytics' ? this.plannerPrimaryCta : this.tab === 'beginner' ? this.beginnerPrimaryLabel : this.advancedPrimaryLabel
    },
    plannerPrimaryCta() {
      return this.todayPlan ? 'Begin plan' : 'Generate plan'
    },
    nextActionDescription() {
      return this.todayPlan ? 'Your next guided session is ready.' : 'Choose a surah, set the range, then begin a focused session.'
    },
    sessionTypeInfo() {
      const plan = this.todayPlan
      if (plan?.sessionType) {
        const labels = {
          memorisation: { key: 'memorisation', label: 'Memorisation', tone: 'memorisation' },
          revision: { key: 'revision', label: 'Revision', tone: 'revision' },
          mixed: { key: 'mixed', label: 'Mixed', tone: 'mixed' },
          recovery: { key: 'recovery', label: 'Recovery', tone: 'recovery' }
        }
        return labels[plan.sessionType] || labels.memorisation
      }
      const weakCount = (plan?.reviewKeys || []).filter(key => {
        const text = this.sm2Get(this.sm2CardKey(key, 'recite_text'))
        const audio = this.sm2Get(this.sm2CardKey(key, 'audio_recall'))
        const meaning = this.sm2Get(this.sm2CardKey(key, 'meaning'))
        return (text.lapses || 0) >= 3 || (audio.lapses || 0) >= 3 || (meaning.lapses || 0) >= 3 || text.suspended || audio.suspended || meaning.suspended
      }).length
      if (weakCount && !plan?.newKeys?.length) return { key: 'recovery', label: 'Recovery', tone: 'recovery' }
      if (plan?.newKeys?.length && plan?.reviewKeys?.length) return { key: 'mixed', label: 'Mixed', tone: 'mixed' }
      if (plan?.reviewKeys?.length) return { key: 'revision', label: 'Revision', tone: 'revision' }
      if (plan?.newKeys?.length) return { key: 'memorisation', label: 'Memorisation', tone: 'memorisation' }
      return { key: 'memorisation', label: 'Memorisation', tone: 'memorisation' }
    },
    retentionStats() {
      const verseCount = this.verses.length || 1
      const scores = this.verses.map(v => {
        const cards = ['recite_text', 'audio_recall', 'meaning'].map(skill => this.sm2Get(this.sm2CardKey(v.key, skill)))
        const skillScore = cards.reduce((sum, card) => {
          const qualityWeight = Math.min(5, Math.max(0, (card.ef || 2.5) * 1.2))
          const intervalWeight = Math.min(5, Math.log2((card.interval || 0) + 1))
          const penalty = Math.min(3, (card.lapses || 0) * 0.5 + (card.suspended ? 1.5 : 0))
          return sum + Math.max(0, qualityWeight + intervalWeight - penalty)
        }, 0)
        return Math.min(100, Math.round((skillScore / 18) * 100))
      })
      const overallRetention = Math.round((scores.reduce((a, b) => a + b, 0) / verseCount) || 0)
      const surahMastery = overallRetention
      const weakAyahs = this.verses.filter((v, idx) => scores[idx] < 55).map(v => v.number)
      const weakClusters = this.buildWeakWordClusters(weakAyahs)
      const weakTrend14d = Array.from({ length: 14 }, (_, idx) => {
        const base = Math.max(0, weakAyahs.length - (13 - idx))
        return base
      })
      const prevWeek = this.stats.avgQuality14d.slice(0, 7).reduce((a, b) => a + b, 0) / 7 || 0
      const thisWeek = this.stats.avgQuality14d.slice(7).reduce((a, b) => a + b, 0) / 7 || 0
      const weeklyRetentionImprovement = Math.round((thisWeek - prevWeek) * 10)
      const forgettingTrend = weakAyahs.length > Math.max(2, Math.round(this.verses.length * 0.2)) ? 'Rising' : weakAyahs.length ? 'Stable' : 'Low'
      return { overallRetention, surahMastery, weakAyahs, weakClusters, weakTrend14d, weeklyRetentionImprovement, forgettingTrend }
    },
    weakAyahSummary() {
      if (!this.retentionStats.weakAyahs.length) return 'None'
      return this.retentionStats.weakAyahs.slice(0, 4).map(n => `Ayah ${n}`).join(', ')
    },
    weakWordSummary() {
      return this.retentionStats.weakClusters.length ? this.retentionStats.weakClusters.join(', ') : 'No clear cluster'
    },
    reviewReasons() {
      const reasons = []
      if (this.retentionStats.weakAyahs.length) reasons.push('weak recall detected')
      if (this.stats.dueNow > 0) reasons.push('review interval reached')
      if (this.order === 'chain' || this.sessionTypeInfo.key === 'recovery') reasons.push('chain instability detected')
      if (this.retentionStats.forgettingTrend === 'Rising') reasons.push('forgetting risk increased')
      return reasons.length ? reasons : ['review interval reached']
    },
    toolsHeaderTitle() {
      if (this.tab === 'analytics') return 'Retention and plan'
      if (this.tab === 'advanced') return 'Advanced session'
      return 'Guided session setup'
    },
    todayPlanEtaLabel() {
      const estimate = Number(this.todayPlan?.estimate?.capacityAyat || 0) * this.estimateAyahSeconds()
      return `${Math.max(1, Math.ceil(estimate / 60))} min`
    },
    stats() {
      const now = Date.now()
      const dayKey = this.dayKey(now)
      const events = this.events || []
      const today = events.filter(e => e.day === dayKey)

      const gradedToday = today.filter(e => e.type === 'sm2_grade').length
      const listenedAyatToday = today.filter(e => e.type === 'audio_play').length
      const qualities = today.filter(e => e.type === 'sm2_grade').map(e => e.quality)
      const avgQualityToday = qualities.length ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0

      const dueNow = this.verses.filter(v => (
        (this.sm2Get(this.sm2CardKey(v.key, 'recite_text')).due || 0) <= now ||
        (this.sm2Get(this.sm2CardKey(v.key, 'audio_recall')).due || 0) <= now ||
        (this.sm2Get(this.sm2CardKey(v.key, 'meaning')).due || 0) <= now
      )).length

      const dueBySkill = {
        recite_text: this.verses.filter(v => (this.sm2Get(this.sm2CardKey(v.key, 'recite_text')).due || 0) <= now).length,
        audio_recall: this.verses.filter(v => (this.sm2Get(this.sm2CardKey(v.key, 'audio_recall')).due || 0) <= now).length,
        meaning: this.verses.filter(v => (this.sm2Get(this.sm2CardKey(v.key, 'meaning')).due || 0) <= now).length
      }

      const grades14d = []
      const avgQuality14d = []
      for (let i = 13; i >= 0; i--) {
        const t = now - i * 24 * 60 * 60 * 1000
        const dk = this.dayKey(t)
        const d = events.filter(e => e.day === dk && e.type === 'sm2_grade')
        grades14d.push(d.length)
        const qs = d.map(x => x.quality)
        avgQuality14d.push(qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : 0)
      }

      const streakDays = this.computeStreak(events, now)

      return { dueNow, dueBySkill, gradedToday, listenedAyatToday, avgQualityToday, grades14d, avgQuality14d, streakDays }
    },
    planner() {
      return this.plannerState || { today: { newAyat: 5, reviewAyat: 10, quizCards: 15 } }
    },
    leeches() {
      const items = Object.entries(this.sm2 || {}).filter(([, v]) => v?.suspended)
      return items.map(([key, v]) => {
        const [verseKey, skill] = String(key).split('::')
        const skillLabel =
          skill === 'recite_text' ? 'Text' :
          skill === 'audio_recall' ? 'Audio' :
          skill === 'meaning' ? 'Meaning' :
          skill || 'Skill'
        return { key, verseKey, skill, skillLabel, lapses: v?.lapses || 0 }
      }).sort((a, b) => (b.lapses - a.lapses)).slice(0, 50)
    },
    contextLabel() {
      const surah = this.currentChapter?.name_simple || (this.chapterId ? `Surah ${this.chapterId}` : 'No surah')
      const range = this.chapterId ? `${this.rangeStart}-${this.rangeEnd}` : ''
      return `${surah}${range ? ` • ${range}` : ''} • ${this.sessionTypeInfo.label} • Next: ${this.footerPrimaryLabel}`
    }
  },
  mounted() {
    this.migrateLocalStorage()
    this.loadUiState()
    this.loadChapters()
    this.loadReciters()
    this.loadSavedSessions()
    this.loadSm2()
    this.loadEvents()
    this.loadPlanner()
    this.loadMetrics()
    this.initAudio()
    document.documentElement.setAttribute('data-theme', this.theme)
    window.addEventListener('beforeunload', this.persistAllState)
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.persistAllState)
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
    repeats: 'persistUiState',
    playMode: 'persistUiState',
    order: 'persistUiState',
    blurAdjacent: 'persistUiState',
    focusMode: 'persistUiState',
    studyMode: 'persistUiState',
    quizType: 'persistUiState',
    activeKey: 'persistSessionState',
    queueIndex: 'persistSessionState',
    playerVisible: 'persistAudioState',
    isPlaying: 'persistAudioState',
    currentTime: 'persistAudioState',
    sectionOpen: { handler: 'persistUiState', deep: true }
  },
  methods: {
    buildWeakWordClusters(weakAyahs) {
      const set = new Set(weakAyahs)
      const counts = {}
      this.verses
        .filter(v => set.has(v.number))
        .forEach(v => (v.words || []).forEach(word => {
          const token = this.normalizeTextForQuiz(word.en || word.ar).toLowerCase()
          if (!token || token.length < 3) return
          counts[token] = (counts[token] || 0) + 1
        }))
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([token]) => token)
    },
    loadUiState() {
      try {
        const raw = localStorage.getItem('telawa.uiState')
        if (!raw) return
        const state = JSON.parse(raw)
        this.theme = state.theme || this.theme
        this.showTools = state.showTools ?? this.showTools
        this.tab = state.tab || this.tab
        this.chapterId = state.chapterId || this.chapterId
        this.rangeStart = state.rangeStart || this.rangeStart
        this.rangeEnd = state.rangeEnd || this.rangeEnd
        this.reciterId = state.reciterId || this.reciterId
        this.speed = state.speed ?? this.speed
        this.delay = state.delay ?? this.delay
        this.repeats = state.repeats ?? this.repeats
        this.playMode = state.playMode || this.playMode
        this.order = state.order || this.order
        this.blurAdjacent = state.blurAdjacent ?? this.blurAdjacent
        this.focusMode = state.focusMode ?? this.focusMode
        this.studyMode = state.studyMode || this.studyMode
        this.quizType = state.quizType || this.quizType
        this.sectionOpen = { ...this.sectionOpen, ...(state.sectionOpen || {}) }
        this.onboardingDismissed = state.onboardingDismissed ?? false
      } catch (e) { console.error(e) }
      try {
        const raw = localStorage.getItem('telawa.sessionState')
        if (raw) {
          const state = JSON.parse(raw)
          this.activeKey = state.activeKey || this.activeKey
          this.queueIndex = Number(state.queueIndex || 0)
          this.planRun = state.planRun || null
        }
      } catch (e) { console.error(e) }
      try {
        const raw = localStorage.getItem('telawa.audioState')
        this.restoredAudioState = raw ? JSON.parse(raw) : null
      } catch (e) { console.error(e) }
    },
    persistUiState() {
      try {
        localStorage.setItem('telawa.uiState', JSON.stringify({
          theme: this.theme,
          showTools: this.showTools,
          tab: this.tab,
          chapterId: this.chapterId,
          rangeStart: this.rangeStart,
          rangeEnd: this.rangeEnd,
          reciterId: this.reciterId,
          speed: this.speed,
          delay: this.delay,
          repeats: this.repeats,
          playMode: this.playMode,
          order: this.order,
          blurAdjacent: this.blurAdjacent,
          focusMode: this.focusMode,
          studyMode: this.studyMode,
          quizType: this.quizType,
          sectionOpen: this.sectionOpen,
          onboardingDismissed: this.onboardingDismissed
        }))
      } catch (e) { console.error(e) }
    },
    persistSessionState() {
      try {
        localStorage.setItem('telawa.sessionState', JSON.stringify({
          activeKey: this.activeKey,
          queueIndex: this.queueIndex,
          planRun: this.planRun
        }))
      } catch (e) { console.error(e) }
    },
    persistAudioState() {
      try {
        localStorage.setItem('telawa.audioState', JSON.stringify({
          src: this.audioElement?.currentSrc || this.audioElement?.src || '',
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
    loadMetrics() {
      try {
        const raw = localStorage.getItem('telawa.metrics')
        this.metrics = raw ? JSON.parse(raw) : { avgAyahSeconds: 10 }
      } catch (e) {
        console.error(e)
        this.metrics = { avgAyahSeconds: 10 }
      }
    },
    persistMetrics() {
      try { localStorage.setItem('telawa.metrics', JSON.stringify(this.metrics)) } catch (e) { console.error(e) }
    },
    migrateLocalStorage() {
      const key = 'telawa.schemaVersion'
      const current = 1
      const v = Number(localStorage.getItem(key) || 0)
      if (v >= current) return
      // v0 -> v1: ensure objects exist, and cap event log size
      try {
        const eventsRaw = localStorage.getItem('telawa.events')
        if (eventsRaw) {
          const events = JSON.parse(eventsRaw)
          if (Array.isArray(events)) localStorage.setItem('telawa.events', JSON.stringify(events.slice(-2000)))
        }
      } catch {}
      localStorage.setItem(key, String(current))
    },
    dayKey(ts = Date.now()) {
      const d = new Date(ts)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    },
    loadEvents() {
      try {
        const raw = localStorage.getItem('telawa.events')
        this.events = raw ? JSON.parse(raw) : []
      } catch (e) {
        console.error(e)
        this.events = []
      }
    },
    showBanner(message, kind = 'info', ttlMs = 3500) {
      this.banner = { message, kind, at: Date.now() }
      setTimeout(() => {
        if (this.banner && Date.now() - this.banner.at >= ttlMs) this.banner = null
      }, ttlMs + 50)
    },
    logEvent(evt) {
      const safe = { ...evt, at: Date.now(), day: this.dayKey() }
      this.events = [...(this.events || []), safe].slice(-2000)
      try { localStorage.setItem('telawa.events', JSON.stringify(this.events)) } catch (e) { console.error(e) }
    },
    computeStreak(events, now) {
      const days = new Set(events.filter(e => e.type === 'sm2_grade').map(e => e.day))
      let streak = 0
      for (let i = 0; i < 365; i++) {
        const t = now - i * 24 * 60 * 60 * 1000
        const dk = this.dayKey(t)
        if (!days.has(dk)) break
        streak++
      }
      return streak
    },
    loadPlanner() {
      try {
        const raw = localStorage.getItem('telawa.planner')
        this.plannerState = raw ? JSON.parse(raw) : null
      } catch (e) {
        console.error(e)
        this.plannerState = null
      }
      if (!this.plannerState) {
        this.plannerState = {
          settings: {
            dailyMinutes: 20,
            newAyat: 5,
            reviewCards: 15,
            mode: 'hybrid',
            startSurah: 1,
            endSurah: 114,
            daysOff: []
          },
          today: { newAyat: 5, reviewAyat: 10, quizCards: 15 }
        }
        try { localStorage.setItem('telawa.planner', JSON.stringify(this.plannerState)) } catch (e) { console.error(e) }
      }
      this.loadTodayPlan()
    },
    loadTodayPlan() {
      try {
        const raw = localStorage.getItem('telawa.todayPlan')
        this.todayPlan = raw ? JSON.parse(raw) : null
      } catch (e) {
        console.error(e)
        this.todayPlan = null
      }
      if (this.todayPlan?.day !== this.dayKey()) this.todayPlan = null
      this.planRun = null
    },
    persistPlanner() {
      try { localStorage.setItem('telawa.planner', JSON.stringify(this.plannerState)) } catch (e) { console.error(e) }
    },
    persistTodayPlan() {
      try { localStorage.setItem('telawa.todayPlan', JSON.stringify(this.todayPlan)) } catch (e) { console.error(e) }
    },
    estimateAyahSeconds() {
      // heuristic: average ayah audio time + UI delay
      const base = Number(this.metrics?.avgAyahSeconds || 10)
      const speedFactor = Math.max(0.5, Number(this.speed) || 1)
      return (base / speedFactor) + (Number(this.delay) || 0)
    },
    estimateCapacityAyat(minutes) {
      const sec = Math.max(5, Number(minutes) || 0) * 60
      const per = Math.max(3, this.estimateAyahSeconds())
      return Math.max(1, Math.floor(sec / per))
    },
    generateTodayPlan() {
      const settings = this.plannerState?.settings || { dailyMinutes: 20, newAyat: 5, reviewCards: 15, mode: 'hybrid', startSurah: 1, endSurah: 114, daysOff: [] }
      const now = Date.now()

      const day = this.dayKey(now)
      const dayName = new Date(now).toLocaleDateString(undefined, { weekday: 'short' }).toLowerCase()
      if ((settings.daysOff || []).includes(dayName)) {
        this.todayPlan = { day, createdAt: now, off: true }
        this.persistTodayPlan()
        return Promise.resolve()
      }

      const progressRaw = localStorage.getItem('telawa.curriculumProgress')
      const progress = progressRaw ? JSON.parse(progressRaw) : { chapterId: settings.startSurah || 1, ayah: 1 }
      const startSurah = Number(settings.startSurah || 1)
      const endSurah = Number(settings.endSurah || 114)

      const fetchChapterVerses = async (chapterId) => {
        const params = {
          per_page: 300,
          translations: this.showTranslation ? '131' : undefined,
          words: false,
          audio: this.reciterId,
          fields: this.script === 'tajweed' ? 'text_uthmani_tajweed' : 'text_uthmani'
        }
        const res = await axios.get(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}`, { params })
        const all = res.data?.verses || []
        return all.map(v => ({
          key: v.verse_key,
          number: v.verse_number,
          arabic: v.text_uthmani_tajweed || v.text_uthmani || '',
          translation: v.translations?.[0]?.text || '',
          audio: this.normalizeAudioUrl(v.audio?.url || '')
        }))
      }

      return (async () => {
        // time-based capacity: cap total cards if dailyMinutes is small
        const capacityAyat = this.estimateCapacityAyat(settings.dailyMinutes)
        const reviewCap = Math.min(settings.reviewCards, Math.max(0, capacityAyat - settings.newAyat))
        const newCap = Math.min(settings.newAyat, capacityAyat)

        // Review: due cards across curriculum range
        const dueVerseKeys = []
        for (let ch = startSurah; ch <= endSurah && dueVerseKeys.length < reviewCap; ch++) {
          const verses = await fetchChapterVerses(ch)
          for (const v of verses) {
            const dueText = (this.sm2Get(this.sm2CardKey(v.key, 'recite_text')).due || 0) <= now
            const dueAudio = (this.sm2Get(this.sm2CardKey(v.key, 'audio_recall')).due || 0) <= now
            const dueMeaning = (this.sm2Get(this.sm2CardKey(v.key, 'meaning')).due || 0) <= now
            if (dueText || dueAudio || dueMeaning) dueVerseKeys.push(v.key)
            if (dueVerseKeys.length >= reviewCap) break
          }
        }

        // New: take next N ayat from progress pointer
        const newVerseKeys = []
        let ch = Math.max(startSurah, Math.min(endSurah, Number(progress.chapterId || startSurah)))
        let ayah = Number(progress.ayah || 1)
        while (newVerseKeys.length < newCap && ch <= endSurah) {
          const verses = await fetchChapterVerses(ch)
          const slice = verses.filter(v => v.number >= ayah)
          for (const v of slice) {
            newVerseKeys.push(v.key)
            if (newVerseKeys.length >= newCap) break
          }
          if (newVerseKeys.length >= newCap) {
            const last = verses.find(v => v.key === newVerseKeys[newVerseKeys.length - 1])
            const nextAyah = (last?.number || ayah) + 1
            if (nextAyah > verses.length) { ch += 1; ayah = 1 } else { ayah = nextAyah }
            break
          }
          ch += 1
          ayah = 1
        }

        const newProgress = { chapterId: ch > endSurah ? endSurah : ch, ayah }
        localStorage.setItem('telawa.curriculumProgress', JSON.stringify(newProgress))

        const quizKeys = [...dueVerseKeys, ...newVerseKeys]

        // segment plan by surah for execution
        const bySurah = new Map()
        for (const k of quizKeys) {
          const [s] = k.split(':')
          const sid = Number(s)
          if (!bySurah.has(sid)) bySurah.set(sid, [])
          bySurah.get(sid).push(k)
        }
        const segments = [...bySurah.entries()].sort((a, b) => a[0] - b[0]).map(([sid, keys]) => {
          const nums = keys.map(x => parseInt(x.split(':')[1])).filter(Boolean).sort((a, b) => a - b)
          return { chapterId: sid, keys, rangeStart: nums[0] || 1, rangeEnd: nums[nums.length - 1] || 1 }
        })

        const firstSeg = segments[0] || { chapterId: startSurah, rangeStart: 1, rangeEnd: 1, keys: [] }

        const weakReviewCount = dueVerseKeys.filter(key => {
          const text = this.sm2Get(this.sm2CardKey(key, 'recite_text'))
          const audio = this.sm2Get(this.sm2CardKey(key, 'audio_recall'))
          const meaning = this.sm2Get(this.sm2CardKey(key, 'meaning'))
          return (text.lapses || 0) >= 3 || (audio.lapses || 0) >= 3 || (meaning.lapses || 0) >= 3 || text.suspended || audio.suspended || meaning.suspended
        }).length
        const sessionType =
          weakReviewCount && !newVerseKeys.length ? 'recovery' :
          dueVerseKeys.length && newVerseKeys.length ? 'mixed' :
          dueVerseKeys.length ? 'revision' :
          'memorisation'

        this.todayPlan = {
          day,
          createdAt: now,
          chapterId: firstSeg.chapterId,
          rangeStart: firstSeg.rangeStart,
          rangeEnd: firstSeg.rangeEnd,
          phases: [
            { type: 'review', keys: dueVerseKeys },
            { type: 'new', keys: newVerseKeys }
          ],
          quizKeys,
          reviewKeys: dueVerseKeys,
          newKeys: newVerseKeys,
          sessionType,
          segments,
          estimate: { capacityAyat, reviewCap, newCap, secondsPerAyah: this.estimateAyahSeconds() }
        }
        this.persistTodayPlan()
      })()
    },
    async applyTodayPlan() {
      if (!this.todayPlan || this.todayPlan.day !== this.dayKey()) await this.generateTodayPlan()
      if (!this.todayPlan) return
      if (this.todayPlan.off) { this.showBanner('Day off (planner)', 'info'); return }

      this.planRun = { segmentIndex: 0 }
      await this.applyPlanSegment(0)
      if (this.todayPlan.segments?.[0]) {
        const seg = this.todayPlan.segments[0]
        this.showBanner(`Starting: Surah ${seg.chapterId} • Ayah ${seg.rangeStart}-${seg.rangeEnd}`, 'info', 4500)
      }
      this.showBanner('Today plan applied', 'success')

      const plannerMode =
        this.todayPlan.sessionType === 'memorisation' ? 'recite' :
        this.todayPlan.sessionType === 'revision' ? 'quiz' :
        'hybrid'
      this.studyMode = plannerMode
      if (this.todayPlan.sessionType === 'recovery') this.order = 'chain'
      this.quizType = 'mixed'
      this.showTools = false
      await this.$nextTick()
      this.startSession()
    },
    async applyPlanSegment(index) {
      const segs = this.todayPlan?.segments || []
      const seg = segs[index]
      if (!seg) return
      this.chapterId = seg.chapterId
      // Load full segment keys and show only them (avoid range reload races)
      const params = {
        per_page: 300,
        translations: this.showTranslation ? '131' : undefined,
        words: this.showWordByWord,
        audio: this.reciterId,
        fields: this.script === 'tajweed' ? 'text_uthmani_tajweed' : 'text_uthmani'
      }
      const res = await axios.get(`https://api.quran.com/api/v4/verses/by_chapter/${seg.chapterId}`, { params })
      const all = res.data?.verses || []
      const mapped = all.map(v => ({
        key: v.verse_key,
        number: v.verse_number,
        arabic: v.text_uthmani_tajweed || v.text_uthmani || '',
        translation: v.translations?.[0]?.text || '',
        audio: this.normalizeAudioUrl(v.audio?.url || ''),
        words: (v.words || []).map(w => ({
          ar: w.text_uthmani || w.text || '',
          en: w.translation?.text || '',
          audio: this.normalizeAudioUrl(w.audio_url)
        }))
      }))
      const byKey = new Map(mapped.map(v => [v.key, v]))
      const ordered = (seg.keys || []).map(k => byKey.get(k)).filter(Boolean)
      this.verses = ordered.length ? ordered : mapped
      const nums = this.verses.map(v => v.number).filter(Boolean).sort((a, b) => a - b)
      this.rangeStart = nums[0] || 1
      this.rangeEnd = nums[nums.length - 1] || this.rangeStart
      this.queue = [...this.verses]
      this.queueIndex = 0
      this.activeKey = this.queue[0]?.key || this.activeKey
    },
    openTodayReview() {
      this.tab = 'advanced'
      this.showTools = true
      this.studyMode = 'quiz'
      this.quizType = 'mixed'
    },
    openTodayHybrid() {
      this.tab = 'advanced'
      this.showTools = true
      this.studyMode = 'hybrid'
      this.quizType = 'mixed'
    },
    sparkPoints(values) {
      const arr = (values || []).map(v => Number(v) || 0)
      if (!arr.length) return ''
      const max = Math.max(...arr, 1)
      const min = Math.min(...arr, 0)
      const span = Math.max(1e-9, max - min)
      return arr.map((v, i) => {
        const x = (i / Math.max(1, arr.length - 1)) * 100
        const y = 28 - ((v - min) / span) * 26
        return `${x.toFixed(2)},${y.toFixed(2)}`
      }).join(' ')
    },
    chartBarHeight(values, value) {
      const arr = (values || []).map(v => Number(v) || 0)
      const max = Math.max(...arr, 1)
      const ratio = Math.max(0.08, (Number(value) || 0) / max)
      return `${Math.round(ratio * 64)}px`
    },
    loadSm2() {
      try {
        const raw = localStorage.getItem('telawa.sm2')
        this.sm2 = raw ? JSON.parse(raw) : {}
      } catch (e) {
        console.error(e)
        this.sm2 = {}
      }
    },
    persistSm2() {
      try { localStorage.setItem('telawa.sm2', JSON.stringify(this.sm2)) } catch (e) { console.error(e) }
    },
    resetSm2All() {
      if (!confirm('Reset all SM-2 progress?')) return
      this.sm2 = {}
      try { localStorage.setItem('telawa.sm2', JSON.stringify({})) } catch (e) { console.error(e) }
      this.showBanner('SM-2 reset', 'info')
    },
    unsuspendLeech(key) {
      const c = this.sm2Get(key)
      this.sm2[key] = { ...c, suspended: false, lapses: Math.max(0, (c.lapses || 0) - 2) }
      this.persistSm2()
      this.showBanner('Card unsuspended', 'success')
    },
    clearEvents() {
      if (!confirm('Clear analytics stats?')) return
      this.events = []
      try { localStorage.setItem('telawa.events', JSON.stringify([])) } catch (e) { console.error(e) }
      this.showBanner('Stats cleared', 'info')
    },
    exportData() {
      const payload = {
        schemaVersion: Number(localStorage.getItem('telawa.schemaVersion') || 1),
        sm2: this.sm2 || {},
        planner: this.plannerState || null,
        todayPlan: this.todayPlan || null,
        curriculumProgress: (() => {
          try { return JSON.parse(localStorage.getItem('telawa.curriculumProgress') || 'null') } catch { return null }
        })(),
        events: this.events || [],
        metrics: this.metrics || null
      }
      const text = JSON.stringify(payload)
      navigator.clipboard?.writeText(text).then(() => {
        this.showBanner('Export copied to clipboard', 'success')
      }).catch(() => {
        prompt('Copy this JSON', text)
      })
    },
    importData() {
      const text = prompt('Paste exported JSON')
      if (!text) return
      try {
        const payload = JSON.parse(text)
        if (payload.sm2) { this.sm2 = payload.sm2; localStorage.setItem('telawa.sm2', JSON.stringify(payload.sm2)) }
        if (payload.planner) { this.plannerState = payload.planner; localStorage.setItem('telawa.planner', JSON.stringify(payload.planner)) }
        if (payload.todayPlan) { this.todayPlan = payload.todayPlan; localStorage.setItem('telawa.todayPlan', JSON.stringify(payload.todayPlan)) }
        if (payload.curriculumProgress) localStorage.setItem('telawa.curriculumProgress', JSON.stringify(payload.curriculumProgress))
        if (payload.events) { this.events = payload.events.slice(-2000); localStorage.setItem('telawa.events', JSON.stringify(this.events)) }
        if (payload.metrics) { this.metrics = payload.metrics; localStorage.setItem('telawa.metrics', JSON.stringify(payload.metrics)) }
        this.showBanner('Import complete', 'success', 4500)
      } catch (e) {
        console.error(e)
        this.showBanner('Import failed: invalid JSON', 'error', 4500)
      }
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
      if (card.suspended && quality >= 4) {
        // allow "good" to unsuspend
        card.suspended = false
        card.lapses = Math.max(0, (card.lapses || 0) - 2)
      }
      if (card.suspended) {
        this.showBanner('Card is suspended (leech). Unsuspend from Analytics.', 'info', 4200)
        return
      }
      let ef = card.ef
      let reps = card.reps
      let interval = card.interval
      let lapses = card.lapses || 0

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
    normalizeTextForQuiz(s) {
      const text = String(s || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g, '') // Arabic diacritics
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return text
    },
    quizMakePrompt(verse) {
      const src = this.normalizeTextForQuiz(verse.translation || verse.arabic)
      const words = src.split(' ').filter(Boolean)
      if (words.length < 4) return { prompt: src, missing: '' }
      const idx = Math.max(1, Math.min(words.length - 2, Math.floor(Math.random() * (words.length - 2)) + 1))
      const missing = words[idx] || ''
      const prompt = words.map((w, i) => (i === idx ? '____' : w)).join(' ')
      return { prompt, missing }
    },
    toggleSection(key) {
      this.sectionOpen[key] = !this.sectionOpen[key]
    },
    resetControls() {
      this.rangeStart = 1
      this.rangeEnd = 7
      this.speed = 1
      this.delay = 1
      this.repeats = 1
      this.playMode = 'auto'
      this.order = 'seq'
      this.blurAdjacent = false
      this.focusMode = false
      this.rangeLoopDelay = 1
      this.selectedSessionId = ''
      this.sessionName = ''
      this.applySpeed()
      this.rebuildQueue()
      this.persistAllState()
    },
    beginPlan() {
      this.onboardingDismissed = true
      this.showTools = true
      if (this.todayPlan) this.tab = 'analytics'
      else this.tab = 'beginner'
    },
    beginPlannerSession() {
      this.onboardingDismissed = true
      if (this.todayPlan) this.applyTodayPlan()
      else this.generateTodayPlan().then(() => this.applyTodayPlan())
    },
    footerPrimaryAction() {
      if (this.tab === 'analytics') this.beginPlannerSession()
      else if (this.tab === 'beginner') this.beginPlanAndStart()
      else this.startSession()
    },
    beginPlanAndStart() {
      this.onboardingDismissed = true
      if (this.chapterId) this.startSession()
      else this.showTools = true
    },
    loadSavedSessions() {
      try {
        const raw = localStorage.getItem('telawa.savedSessions')
        this.savedSessions = raw ? JSON.parse(raw) : []
      } catch (e) {
        console.error(e)
        this.savedSessions = []
      }
    },
    persistSavedSessions() {
      try { localStorage.setItem('telawa.savedSessions', JSON.stringify(this.savedSessions)) } catch (e) { console.error(e) }
    },
    saveSession() {
      const name = (this.sessionName || '').trim()
      if (!name) return
      const payload = {
        id: String(Date.now()),
        name,
        savedAt: Date.now(),
        settings: {
          chapterId: this.chapterId,
          rangeStart: this.rangeStart,
          rangeEnd: this.rangeEnd,
          reciterId: this.reciterId,
          speed: this.speed,
          delay: this.delay,
          repeats: this.repeats,
          playMode: this.playMode,
          order: this.order,
          blurAdjacent: this.blurAdjacent,
          focusMode: this.focusMode,
          rangeLoopDelay: this.rangeLoopDelay
        }
      }
      this.savedSessions = [payload, ...this.savedSessions].slice(0, 20)
      this.persistSavedSessions()
      this.persistAllState()
      this.sessionName = ''
      this.selectedSessionId = payload.id
    },
    async loadSession(id) {
      const s = this.savedSessions.find(x => x.id === id)
      if (!s) return
      const set = s.settings || {}
      this.chapterId = set.chapterId || 0
      this.rangeStart = set.rangeStart || 1
      this.rangeEnd = set.rangeEnd || 7
      this.reciterId = set.reciterId || this.reciterId
      this.speed = set.speed ?? this.speed
      this.delay = set.delay ?? this.delay
      this.repeats = set.repeats ?? this.repeats
      this.playMode = set.playMode || this.playMode
      this.order = set.order || this.order
      this.blurAdjacent = set.blurAdjacent ?? this.blurAdjacent
      this.focusMode = set.focusMode ?? this.focusMode
      this.rangeLoopDelay = set.rangeLoopDelay ?? this.rangeLoopDelay

      await this.loadChapter()
      this.refreshVerses()
      this.applySpeed()
      this.persistAllState()
    },
    deleteSession(id) {
      this.savedSessions = this.savedSessions.filter(x => x.id !== id)
      if (this.selectedSessionId === id) this.selectedSessionId = ''
      this.persistSavedSessions()
    },
    togglePlayerMenu() {
      this.playerMenuOpen = !this.playerMenuOpen
    },
    downloadCurrentAudio() {
      const src = this.audioElement?.currentSrc || this.audioElement?.src
      if (!src) return
      const a = document.createElement('a')
      a.href = src
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.download = ''
      document.body.appendChild(a)
      a.click()
      a.remove()
      this.playerMenuOpen = false
    },
    async loadAlquranAudioEditions() {
      try {
        const res = await getEditions({ format: 'audio', type: 'versebyverse' })
        const list = res.data?.data || []
        this.alquranAudioEditions = list.map(e => ({
          identifier: e.identifier,
          name: e.englishName || e.name || e.identifier,
          language: e.language,
          type: e.type,
          format: e.format
        }))
        if (!this.alquranEdition && this.alquranAudioEditions.length) this.alquranEdition = this.alquranAudioEditions[0].identifier
      } catch (e) { console.error(e) }
    },
    async ensureAlquranEdition() {
      if (this.alquranEdition) return
      if (!this.alquranAudioEditions.length) await this.loadAlquranAudioEditions()
      if (!this.alquranEdition && this.alquranAudioEditions.length) this.alquranEdition = this.alquranAudioEditions[0].identifier
    },
    normalizeAudioUrl(url) {
      if (!url) return ''
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('/')) return `https://verses.quran.com${url}`
      if (/^[A-Za-z0-9_-]+\/mp3\//.test(url)) return `https://verses.quran.com/${url}`
      return url
    },
    formatTime(sec) {
      const t = Math.max(0, Math.floor(sec || 0))
      return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    },
    verseClasses(verse, idx) {
      const active = this.activeKey === verse.key
      if (!this.blurAdjacent && !this.focusMode) return { active }
      const activeIdx = this.verses.findIndex(v => v.key === this.activeKey)
      const isNeighbor = activeIdx >= 0 && Math.abs(idx - activeIdx) === 1
      const dim = this.focusMode && !active
      const blur = this.blurAdjacent && !active && !isNeighbor
      return { active, dim, blur }
    },
    cycleTheme() {
      const themes = ['light', 'sepia', 'dark']
      const idx = themes.indexOf(this.theme)
      this.theme = themes[(idx + 1) % themes.length]
      document.documentElement.setAttribute('data-theme', this.theme)
      this.persistUiState()
    },
    async loadChapters() {
      try {
        const res = await axios.get('https://api.quran.com/api/v4/chapters', { params: { language: 'en' } })
        this.chapters = res.data?.chapters || []
        if (this.chapterId) await this.loadChapter()
      } catch (e) { console.error(e) }
    },
    async loadReciters() {
      try {
        const res = await axios.get('https://api.quran.com/api/v4/resources/recitations', { params: { per_page: 30 } })
        const list = res.data?.recitations || []
        if (list.length) this.reciters = list.map(r => ({ id: r.id, name: r.reciter_name }))
      } catch (e) { console.error(e) }
    },
    async loadChapter() {
      if (!this.chapterId) { this.currentChapter = null; this.verses = []; return }
      this.onboardingDismissed = true
      this.currentChapter = this.chapters.find(c => c.id === this.chapterId)
      const max = this.currentChapter?.verses_count || 286
      this.rangeEnd = Math.min(this.rangeEnd, max)
      this.rangeStart = Math.max(1, this.rangeStart)
      await this.loadVerses()
    },
    adjustRange() {
      const max = this.currentChapter?.verses_count || 286
      this.rangeStart = Math.max(1, Math.min(this.rangeStart, max))
      this.rangeEnd = Math.max(this.rangeStart, Math.min(this.rangeEnd, max))
      this.loadVerses()
    },
    async loadVerses() {
      if (!this.chapterId) return
      const params = {
        per_page: 300,
        translations: this.showTranslation ? '131' : undefined,
        words: this.showWordByWord,
        audio: this.reciterId,
        fields: this.script === 'tajweed' ? 'text_uthmani_tajweed' : 'text_uthmani'
      }
      try {
        const res = await axios.get(`https://api.quran.com/api/v4/verses/by_chapter/${this.chapterId}`, { params })
        const all = res.data?.verses || []
        const start = this.rangeStart, end = this.rangeEnd
        this.verses = all.filter(v => v.verse_number >= start && v.verse_number <= end).map(v => ({
          key: v.verse_key,
          number: v.verse_number,
          arabic: v.text_uthmani_tajweed || v.text_uthmani || '',
          translation: v.translations?.[0]?.text || '',
          audio: this.normalizeAudioUrl(v.audio?.url || ''),
          words: (v.words || []).map(w => ({
            ar: w.text_uthmani || w.text || '',
            en: w.translation?.text || '',
            audio: this.normalizeAudioUrl(w.audio_url)
          }))
        }))

        if (this.script === 'tajweed') {
          try {
            const tajweedRes = await getSurahEdition(this.chapterId, 'quran-tajweed')
            const ayahs = tajweedRes.data?.data?.ayahs || []
            const byNumber = new Map(ayahs.map(a => [a.numberInSurah, a.text]))
            this.verses = this.verses.map(v => ({ ...v, arabic: byNumber.get(v.number) || v.arabic }))
          } catch (e) { console.error(e) }
        }

        if (this.verses.length && !this.activeKey) this.activeKey = this.verses[0].key
        this.buildQueue()
        if (this.restoredAudioState?.src && this.restoredAudioState?.src === (this.verses.find(v => v.key === this.activeKey)?.audio || this.restoredAudioState.src)) {
          this.playerVisible = !!this.restoredAudioState.playerVisible
          this.currentTime = Number(this.restoredAudioState.currentTime || 0)
        }
      } catch (e) {
        console.error(e)
        this.showBanner('Failed to load verses. Check connection.', 'error', 4500)
      }
    },
    refreshVerses() { this.loadVerses() },
    buildQueue() {
      const q = []
      const base = this.verses
      const rep = Math.max(1, this.repeats)
      const ord = this.order
      for (let r = 0; r < rep; r++) {
        if (ord === 'seq') q.push(...base)
        else if (ord === 'cum') {
          for (let i = 0; i < base.length; i++)
            for (let j = 0; j <= i; j++) q.push(base[j])
        } else if (ord === 'rand') {
          const shuffled = [...base]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          q.push(...shuffled)
        } else if (ord === 'chain') {
          // A → (A,B) → B → (B,C) → C ...
          for (let i = 0; i < base.length; i++) {
            const a = base[i]
            const b = base[i + 1]
            if (!a) continue
            q.push(a)
            if (b) q.push(a, b)
          }
        }
      }
      this.queue = q
      this.queueIndex = 0
    },
    rebuildQueue() { this.buildQueue() },
    async startSession() {
      this.onboardingDismissed = true
      if (!this.chapterId) { this.showTools = true; return }
      if (!this.verses.length) await this.loadVerses()
      if (!this.verses.length) { this.showBanner('No verses loaded yet', 'error'); this.showTools = true; return }
      if (this.studyMode === 'quiz') {
        this.startQuiz()
        this.showTools = false
        return
      }
      if (!this.queue.length) this.buildQueue()
      if (!this.queue.length) { this.showBanner('Nothing to play. Check range.', 'error'); this.showTools = true; return }
      this.queueIndex = 0
      const first = this.queue[0] || this.verses[0]
      this.showTools = false
      await this.$nextTick()
      if (first) this.playVerse(first)
      this.persistAllState()
    },
    startQuiz() {
      const now = Date.now()
      const skill = this.quizSkill || 'recite_text'
      const due = this.verses.filter(v => (this.sm2Get(this.sm2CardKey(v.key, skill)).due || 0) <= now)
      const rest = this.verses.filter(v => !due.includes(v))
      const base = [...due, ...rest]
      // de-duplicate and limit
      const seen = new Set()
      const pool = []
      for (const v of base) {
        if (seen.has(v.key)) continue
        seen.add(v.key)
        pool.push(v)
        if (pool.length >= 20) break
      }
      this.quizQueue = pool
      this.quizIndex = 0
      this.quizActive = true
      this.quizRevealed = false
      this.quizLastResult = null
      this.nextQuizCard()
    },
    nextQuizCard() {
      const verse = this.quizQueue[this.quizIndex]
      if (!verse) {
        this.quizActive = false
        if (this.studyMode !== 'hybrid') {
          this.triggerConfetti()
          this.showBanner('Quiz complete', 'success', 4500)
        }
        return
      }
      const type = this.quizType === 'mixed'
        ? (['flashcard', 'mcq', 'blank', 'audio_mcq'][this.quizIndex % 4])
        : this.quizType
      const skill =
        type === 'audio_mcq' ? 'audio_recall' :
        type === 'blank' ? 'meaning' :
        'recite_text'
      this.quizSkill = skill
      this.quizCard = { ...verse, type, skill }
      this.quizAnswer = ''
      this.quizOptions = []
      this.quizRevealed = type === 'flashcard' ? false : true
      this.quizLastResult = null
      if (type === 'mcq') {
        const options = new Set([verse.key])
        const idx = this.verses.findIndex(v => v.key === verse.key)
        const nearby = []
        for (let i = Math.max(0, idx - 6); i <= Math.min(this.verses.length - 1, idx + 6); i++) {
          if (i !== idx) nearby.push(this.verses[i].key)
        }
        while (options.size < 4 && nearby.length) {
          const pick = nearby.splice(Math.floor(Math.random() * nearby.length), 1)[0]
          options.add(pick)
        }
        while (options.size < 4 && this.verses.length > 3) {
          const pick = this.verses[Math.floor(Math.random() * this.verses.length)]
          options.add(pick.key)
        }
        this.quizOptions = [...options].sort(() => Math.random() - 0.5).map(k => {
          const v = this.verses.find(x => x.key === k)
          const n = v ? v.number : parseInt(k.split(':')[1])
          const snippet = this.normalizeTextForQuiz((v?.arabic || '').replace(/<[^>]+>/g, '')).slice(0, 36)
          return { key: k, label: `${k} • ${n} • ${snippet}`.trim() }
        })
      }
      if (type === 'audio_mcq') {
        const options = new Set([verse.key])
        const idx = this.verses.findIndex(v => v.key === verse.key)
        const nearby = []
        for (let i = Math.max(0, idx - 6); i <= Math.min(this.verses.length - 1, idx + 6); i++) {
          if (i !== idx) nearby.push(this.verses[i].key)
        }
        while (options.size < 4 && nearby.length) {
          const pick = nearby.splice(Math.floor(Math.random() * nearby.length), 1)[0]
          options.add(pick)
        }
        while (options.size < 4 && this.verses.length > 3) {
          const pick = this.verses[Math.floor(Math.random() * this.verses.length)]
          options.add(pick.key)
        }
        this.quizOptions = [...options].sort(() => Math.random() - 0.5).map(k => {
          const v = this.verses.find(x => x.key === k)
          const n = v ? v.number : parseInt(k.split(':')[1])
          return { key: k, label: `${k} • Ayah ${n}` }
        })
      }
      if (type === 'blank') {
        const { prompt, missing } = this.quizMakePrompt(verse)
        this.quizCard.prompt = prompt
        this.quizCard.missing = missing
      }
      if (type === 'audio_mcq') {
        // play audio cue
        setTimeout(() => this.playVerse(verse), 50)
      }
    },
    submitQuiz(qualityOverride = null) {
      const card = this.quizCard
      if (!card) return
      let quality = 4
      if (typeof qualityOverride === 'number') quality = qualityOverride
      else if (card.type === 'mcq' || card.type === 'audio_mcq') quality = this.quizAnswer === card.key ? 4 : 2
      else if (card.type === 'blank') {
        const a = this.normalizeTextForQuiz(this.quizAnswer).toLowerCase()
        const b = this.normalizeTextForQuiz(card.missing).toLowerCase()
        if (a && b && a === b) quality = 4
        else if (a && b && (b.startsWith(a) || a.startsWith(b))) quality = 3
        else quality = 2
      }
      const sm2Key = this.sm2CardKey(card.key, card.skill || this.quizSkill || 'recite_text')
      this.sm2Grade(sm2Key, quality)
      this.quizLastResult = { at: Date.now(), key: card.key, quality, skill: card.skill }
      this.quizIndex += 1
      this.nextQuizCard()
      if (this.studyMode === 'hybrid' && this.hybridPendingKey) {
        const pending = this.hybridPendingKey
        this.hybridPendingKey = null
        this.quizActive = false
        this.quizCard = null
        this.quizQueue = []
        this.quizIndex = 0
        setTimeout(() => {
          if (this.playMode === 'auto') this.next()
        }, (this.delay || 0) * 1000)
      }
    },
    stopQuiz() {
      this.quizActive = false
      this.quizCard = null
      this.quizQueue = []
      this.quizIndex = 0
      this.quizAnswer = ''
      this.quizOptions = []
      this.quizRevealed = false
      this.quizLastResult = null
      this.hybridPendingKey = null
    },
    triggerConfetti() {
      this.confettiSeed = (this.confettiSeed + 1) % 1000000
      this.confettiActive = true
      setTimeout(() => { this.confettiActive = false }, 1600)
    },
    setActive(key) { this.activeKey = key },
    playVerse(verse) {
      if (!verse.audio) { console.warn('Missing verse audio url', verse); return }
      this.activeKey = verse.key
      if (!this.audioElement) this.audioElement = this.$refs.audio
      if (!this.audioElement) return
      this.audioElement.src = verse.audio
      this.lastAudioDebug = { at: Date.now(), key: verse.key, src: verse.audio, phase: 'set-src' }
      this.audioElement.load()
      this.audioElement.playbackRate = this.speed
      this.audioElement.play().catch((e) => {
        console.error(e)
        this.lastAudioDebug = { at: Date.now(), key: verse.key, src: verse.audio, phase: 'play-catch', error: String(e?.message || e) }
        this.isPlaying = false
      })
      this.playerVisible = true
      this.isPlaying = true
      this.logEvent({ type: 'audio_play', key: verse.key })
      this.persistAudioState()
    },
    playWordAudio(url) {
      if (!url) return
      const a = new Audio(url)
      a.play().catch(() => { })
    },
    initAudio() {
      this.audioElement = this.$refs.audio
      if (!this.audioElement) return
      if (this.restoredAudioState?.src) {
        this.audioElement.src = this.restoredAudioState.src
        this.playerVisible = !!this.restoredAudioState.playerVisible
        this.currentTime = Number(this.restoredAudioState.currentTime || 0)
      }
      let lastSrc = null
      let startedAt = 0
      this.audioElement.addEventListener('play', () => {
        lastSrc = this.audioElement.currentSrc || this.audioElement.src
        startedAt = Date.now()
      })
      this.audioElement.addEventListener('timeupdate', () => {
        this.currentTime = this.audioElement.currentTime
        this.duration = this.audioElement.duration
      })
      this.audioElement.addEventListener('loadedmetadata', () => {
        if (this.restoredAudioState?.currentTime && Math.abs(this.audioElement.currentTime || 0) < 0.2) {
          try { this.audioElement.currentTime = Number(this.restoredAudioState.currentTime || 0) } catch (e) { console.error(e) }
        }
      })
      this.audioElement.addEventListener('error', () => {
        const err = this.audioElement?.error
        const payload = {
          src: this.audioElement?.src,
          currentSrc: this.audioElement?.currentSrc,
          code: err?.code,
          message: err?.message
        }
        console.error('Audio element error', payload)
        this.lastAudioDebug = { at: Date.now(), phase: 'audio-error', ...payload }
        if (this.playMode === 'auto' && this.studyMode !== 'quiz') {
          setTimeout(() => this.next(), 300)
        }
      })
      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false
        const src = this.audioElement.currentSrc || this.audioElement.src
        if (src && lastSrc === src && startedAt && this.duration && isFinite(this.duration) && this.duration > 1 && this.duration < 120) {
          const avg = Number(this.metrics?.avgAyahSeconds || 10)
          const nextAvg = avg * 0.9 + Number(this.duration) * 0.1
          this.metrics = { ...(this.metrics || {}), avgAyahSeconds: Number(nextAvg.toFixed(2)) }
          this.persistMetrics()
        }
        if (this.playMode === 'loop') {
          setTimeout(() => {
            this.audioElement.currentTime = 0
            this.audioElement.play().catch(() => {})
          }, (this.delay || 0) * 1000)
          return
        }
        if (this.studyMode === 'hybrid') {
          const key = this.activeKey
          const verse = this.verses.find(v => v.key === key)
          if (verse) {
            this.hybridPendingKey = key
            this.quizQueue = [verse]
            this.quizIndex = 0
            this.quizType = 'mixed'
            this.quizActive = true
            this.nextQuizCard()
            return
          }
        }
        if (this.playMode === 'auto') {
          setTimeout(() => this.next(), this.delay * 1000)
        }
      })
    },
    applySpeed() {
      if (this.audioElement) this.audioElement.playbackRate = this.speed
    },
    togglePlay() {
      if (!this.audioElement.src) return
      if (this.audioElement.paused) this.audioElement.play()
      else this.audioElement.pause()
    },
    skipBack() {
      if (this.audioElement) this.audioElement.currentTime = Math.max(0, this.audioElement.currentTime - 10)
    },
    skipFwd() {
      if (this.audioElement && this.duration) this.audioElement.currentTime = Math.min(this.duration, this.audioElement.currentTime + 10)
    },
    prev() {
      if (!this.canPrev) return
      this.queueIndex--
      const v = this.queue[this.queueIndex]
      if (v) this.playVerse(v)
    },
    next() {
      if (!this.canNext) return
      this.queueIndex++
      const v = this.queue[this.queueIndex]
      if (v) this.playVerse(v)
      else if (this.planRun && this.todayPlan?.segments?.length) {
        // move to next segment automatically
        const nextIndex = (this.planRun.segmentIndex || 0) + 1
        if (nextIndex < this.todayPlan.segments.length) {
          this.planRun.segmentIndex = nextIndex
          this.applyPlanSegment(nextIndex).then(() => {
            const first = this.queue[0]
            const seg = this.todayPlan.segments[nextIndex]
            if (seg) this.showBanner(`Next: Surah ${seg.chapterId} • Ayah ${seg.rangeStart}-${seg.rangeEnd}`, 'info', 4500)
            if (first) this.playVerse(first)
          })
        } else {
          this.showBanner('Plan complete for today', 'success', 4500)
        }
      }
    },
    seek(e) {
      if (!this.audioElement || !this.duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      this.audioElement.currentTime = percent * this.duration
    },
    updateAudioReciter() { this.loadVerses() },
    closePlayer() {
      if (this.audioElement) { this.audioElement.pause(); this.audioElement.src = '' }
      this.playerVisible = false
      this.isPlaying = false
      this.playerMenuOpen = false
      this.persistAudioState()
    },
    handlePrimaryAction() {
      if (!this.chapterId) this.showTools = true
      else if (!this.verses.length) this.startSession()
      else if (!this.audioElement?.src) this.startSession()
      else if (!this.isPlaying) this.togglePlay()
      else this.showTools = true
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
  --font-ar: 'Amiri', 'Times New Roman', serif;
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
    radial-gradient(circle at top left, rgba(255,255,255,0.55), transparent 34%),
    linear-gradient(180deg, rgba(255,255,255,0.12), transparent 30%);
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

.header-left {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
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
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.58));
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
  padding-right: 400px;
}

.content {
  max-width: 900px;
  margin: 0 auto;
}

.hero-card {
  margin-bottom: 16px;
  padding: 18px 18px 16px;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(255,255,255,0.94), rgba(245,236,226,0.92));
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
  background: rgba(255,255,255,0.62);
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
  background: rgba(255,255,255,0.58);
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
  background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.68));
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
  gap: 12px;
}

.verses.compact .verse {
  padding: 12px;
}

.verse {
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  border-radius: 18px;
  padding: 14px;
  border: 1px solid var(--border);
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  box-shadow: var(--shadow-sm);
}

.verse.active {
  border-left: 3px solid var(--accent);
  background: linear-gradient(180deg, var(--surface-strong), var(--accent-wash));
  box-shadow: var(--shadow-md);
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
  font-size: 1.12rem;
  line-height: 1.7;
  text-align: right;
  direction: rtl;
  background: linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08));
  padding: 10px;
  border-radius: 14px;
  margin: 8px 0;
}

.verse-translation {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.verse-words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.word {
  background: var(--accent-light);
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
}

.word-ar {
  font-family: var(--font-ar);
}

.word-en {
  color: var(--text-muted);
}

.word-play {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.65rem;
}

/* Tools Panel */
.tools {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 460px;
  background: linear-gradient(180deg, rgba(255,250,243,0.96), rgba(247,240,231,0.92));
  border-left: 1px solid var(--border);
  backdrop-filter: blur(14px);
  transform: translateX(100%);
  transition: transform 0.25s ease;
  z-index: 60;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg);
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
}

.tools-top {
  padding: 18px 18px 12px;
  border-bottom: 1px solid var(--border);
  background:
    radial-gradient(circle at top right, rgba(154,103,56,0.12), transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,0.25), transparent 100%);
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
  font-size: 0.92rem;
  font-weight: 450;
  letter-spacing: -0.2px;
  color: var(--text);
}

.tools-context {
  margin-top: 8px;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 400;
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
  font-size: 0.74rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.55);
  font-weight: 450;
  transition: background 140ms ease, color 140ms ease, transform 140ms ease;
}

.tools-tabs button.active {
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.84));
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
  padding: 14px 14px 104px;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sheet-section {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,248,242,0.62));
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
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,250,245,0.78));
  cursor: pointer;
  transition: background 140ms ease, transform 140ms ease;
}

[data-theme="dark"] .sheet-toggle {
  background: linear-gradient(180deg, rgba(30,30,40,0.85), rgba(30,30,40,0.45));
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
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tools-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--border);
  background: linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.78), rgba(255,255,255,0));
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

[data-theme="dark"] .tools-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(to top, rgba(18,18,18,0.98), rgba(18,18,18,0.78), rgba(18,18,18,0));
}

.tools-btn {
  flex: 1;
  padding: 9px 10px;
  border-radius: 15px;
  font-weight: 450;
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.68));
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
  padding: 10px 12px;
}

.guide-copy {
  padding: 0 12px 12px;
}

.guide-title {
  font-size: 0.8rem;
  font-weight: 500;
}

.guide-sub {
  margin-top: 4px;
  font-size: 0.72rem;
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

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field-span-2 {
  grid-column: 1 / -1;
}

.action-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

@media (max-width: 640px) {
  .field-grid,
  .action-grid-3,
  .radio-group-tight {
    grid-template-columns: 1fr;
  }

  .hero-flow,
  .session-rail-stats,
  .flow-strip {
    grid-template-columns: 1fr 1fr;
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
  .stat-grid { grid-template-columns: 1fr; }
}

.stat {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,250,243,0.62));
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
  font-size: 0.98rem;
  font-weight: 450;
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
  background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.68));
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
  background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,250,243,0.62));
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
  background: linear-gradient(180deg, rgba(139,94,60,0.95), rgba(139,94,60,0.32));
}

.bars-soft .bar {
  background: linear-gradient(180deg, rgba(31,122,140,0.95), rgba(31,122,140,0.30));
}

.bars-danger .bar {
  background: linear-gradient(180deg, rgba(190,73,73,0.95), rgba(190,73,73,0.28));
}

.planner-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.planner-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

@media (max-width: 520px) {
  .planner-settings { grid-template-columns: 1fr; }
}

.pill-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,249,241,0.62));
  box-shadow: var(--shadow-sm);
}

[data-theme="dark"] .pill-input {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.40);
}

.pill-input span {
  font-weight: 450;
  color: rgba(0, 0, 0, 0.6);
  min-width: 52px;
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
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,249,241,0.62));
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
  background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,250,243,0.62));
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
  background: rgba(255,255,255,0.58);
  border: 1px solid rgba(78, 58, 38, 0.07);
  font-size: 0.76rem;
}

.read-row strong {
  font-weight: 500;
}

.cta-row {
  display: flex;
  gap: 10px;
  margin-top: 2px;
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
  background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.68));
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
  width: min(520px, 100%);
  background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(250,245,239,0.95));
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
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] .quiz-top {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.quiz-title {
  font-weight: 500;
  font-size: 0.95rem;
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
  padding: 10px 16px 0;
  color: var(--text-muted);
  font-size: 0.76rem;
}

.quiz-body {
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-prompt {
  font-size: 0.96rem;
  color: var(--text);
}

.quiz-hint {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-opt {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

[data-theme="dark"] .quiz-opt {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(30, 30, 40, 0.45);
}

.quiz-actions {
  padding: 12px 16px 16px;
  display: flex;
  gap: 10px;
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
}

[data-theme="dark"] .quiz-reveal {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(30, 30, 40, 0.45);
  color: rgba(255, 255, 255, 0.9);
}

.quiz-grade {
  flex: 1;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.qg {
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
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

.banner.success { border-color: rgba(0, 150, 90, 0.25); }
.banner.error { border-color: rgba(200, 0, 50, 0.25); }
.banner.info { border-color: rgba(0, 0, 0, 0.10); }

[data-theme="dark"] .banner {
  background: rgba(18, 18, 18, 0.88);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
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
  box-shadow: 0 10px 20px rgba(0,0,0,0.12);
}

@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
  10% { opacity: 0.95; }
  100% { transform: translateY(110vh) rotate(480deg); opacity: 0; }
}

.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mini-btn {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.68));
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
  opacity: 0.35;
}

.verse.blur {
  filter: blur(2px);
  opacity: 0.55;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.62rem;
  font-weight: 450;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.select,
.input {
  padding: 8px 10px;
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

.range-compact > * {
  flex: 1;
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.row .select {
  flex: 1;
}

.switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
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

.switch input:checked + .switch-ui {
  background: rgba(139, 94, 60, 0.45);
}

.switch input:checked + .switch-ui::after {
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
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,242,234,0.96));
  border-top: 1px solid var(--border);
  backdrop-filter: blur(14px);
  padding: 6px 12px 8px;
  z-index: 25;
  box-shadow: 0 -20px 44px rgba(91, 74, 57, 0.12);
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
  display: grid;
  grid-template-columns: 56px 1fr 56px;
  align-items: center;
}

.player-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  color: rgba(73, 58, 45, 0.64);
}

.player-time.right { text-align: right; }

.player-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.player-icon {
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.66));
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
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,242,234,0.96));
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
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes railIn {
  0% { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes riseSoft {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
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
}
</style>
