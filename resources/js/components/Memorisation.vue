<template>
  <div class="app" :data-theme="theme">


    <!-- Main Content -->
    <div class="main" :class="{ 'tools-open': showTools }">

      <div class="content">
        <!-- Progress & CTA -->
        <div class="progress-row" v-if="currentChapter && verses.length">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <button class="cta-btn" @click="handlePrimaryAction">
            <span>{{ primaryLabel }}</span>
            <span>{{ primaryIcon }}</span>
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="!verses.length" class="empty">
          <div class="empty-card">
            <div class="empty-icon">﴿</div>
            <h3>Begin your journey</h3>
            <p>Select a surah, choose your range, and press Start.</p>
            <button class="outline-btn" @click="showTools = true">Open controls →</button>
          </div>
        </div>

        <!-- Verses -->
        <div v-else class="verses" :class="{ compact: compactMode }">
          <div v-for="verse in verses" :key="verse.key" class="verse" :class="{ active: activeKey === verse.key }">
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
        <div class="tools-head">
          <span class="tools-title">Controls</span>
          <button class="close-btn" @click="showTools = false">×</button>
        </div>
        <div class="tools-tabs">
          <button :class="{ active: tab === 'setup' }" @click="tab = 'setup'">Setup</button>
          <button :class="{ active: tab === 'playback' }" @click="tab = 'playback'">Playback</button>
          <button :class="{ active: tab === 'display' }" @click="tab = 'display'">Display</button>
        </div>
        <div class="tools-body">
          <!-- Setup Tab -->
          <div v-if="tab === 'setup'" class="group">
            <div class="field">
              <label>Surah</label>
              <select v-model="chapterId" @change="loadChapter" class="select">
                <option :value="0">Choose a surah...</option>
                <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.id }}. {{ c.name_simple }}</option>
              </select>
            </div>
            <div class="field">
              <label>Range</label>
              <div class="range">
                <input type="number" class="input" v-model.number="rangeStart" @change="adjustRange" min="1">
                <span>→</span>
                <input type="number" class="input" v-model.number="rangeEnd" @change="adjustRange" min="1">
              </div>
            </div>
            <div class="field">
              <label>Reciter</label>
              <select v-model="reciterId" @change="refreshVerses" class="select">
                <option v-for="r in reciters" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <div class="field">
              <label>Audio source</label>
              <select v-model="audioSource" @change="refreshVerses" class="select">
                <option value="qurancom">Quran.com</option>
                <option value="alquran">AlQuran Cloud</option>
              </select>
            </div>
            <div class="field" v-if="audioSource === 'alquran'">
              <label>AlQuran edition</label>
              <select v-model="alquranEdition" @change="refreshVerses" class="select">
                <option v-for="e in alquranAudioEditions" :key="e.identifier" :value="e.identifier">
                  {{ e.name }} ({{ e.identifier }})
                </option>
              </select>
            </div>
            <button class="primary-btn full" @click="startSession">▶ Start session</button>
          </div>

          <!-- Playback Tab -->
          <div v-if="tab === 'playback'" class="group">
            <div class="field">
              <label>Mode</label>
              <div class="toggle">
                <button :class="{ active: playMode === 'auto' }" @click="playMode = 'auto'">Auto</button>
                <button :class="{ active: playMode === 'manual' }" @click="playMode = 'manual'">Manual</button>
              </div>
            </div>
            <div class="field">
              <label>Speed <span class="value">{{ speed }}x</span></label>
              <input type="range" class="slider" min="0.5" max="1.5" step="0.1" v-model.number="speed"
                @input="applySpeed">
            </div>
            <div class="field">
              <label>Delay <span class="value">{{ delay }}s</span></label>
              <input type="range" class="slider" min="0" max="10" step="0.5" v-model.number="delay">
            </div>
            <div class="field">
              <label>Repeats <span class="value">{{ repeats }}</span></label>
              <input type="range" class="slider" min="1" max="10" step="1" v-model.number="repeats"
                @change="rebuildQueue">
            </div>
            <div class="field">
              <label>Order</label>
              <select v-model="order" @change="rebuildQueue" class="select">
                <option value="seq">Sequential</option>
                <option value="cum">Cumulative</option>
                <option value="rand">Random</option>
              </select>
            </div>
          </div>

          <!-- Display Tab -->
          <div v-if="tab === 'display'" class="group">
            <div class="field">
              <label>Script</label>
              <div class="toggle">
                <button :class="{ active: script === 'uthmani' }"
                  @click="script = 'uthmani'; refreshVerses()">Uthmani</button>
                <button :class="{ active: script === 'tajweed' }"
                  @click="script = 'tajweed'; refreshVerses()">Tajweed</button>
              </div>
            </div>
            <div class="field check">
              <label><input type="checkbox" v-model="showTranslation" @change="refreshVerses"> Translation</label>
            </div>
            <div class="field check">
              <label><input type="checkbox" v-model="showWordByWord" @change="refreshVerses"> Word by word</label>
            </div>
            <div class="field check">
              <label><input type="checkbox" v-model="compactMode"> Compact view</label>
            </div>
          </div>
        </div>
      </aside>
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
          <button class="player-menu-item" @click="tab = 'playback'; showTools = true; playerMenuOpen = false">
            <span class="pm-ico">↺</span>
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
          <div class="player-menu-row">
            <span class="pm-label">Audio</span>
            <select v-model="audioSource" @change="refreshVerses" class="pm-select">
              <option value="qurancom">Quran.com</option>
              <option value="alquran">AlQuran Cloud</option>
            </select>
          </div>
          <div class="player-menu-row" v-if="audioSource === 'alquran'">
            <span class="pm-label">Edition</span>
            <select v-model="alquranEdition" @change="refreshVerses" class="pm-select">
              <option v-for="e in alquranAudioEditions" :key="e.identifier" :value="e.identifier">
                {{ e.name }}
              </option>
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
      tab: 'setup',

      chapters: [],
      chapterId: 0,
      currentChapter: null,
      rangeStart: 1,
      rangeEnd: 7,

      reciters: [{ id: 7, name: 'Alafasy' }],
      reciterId: 7,
      audioSource: 'qurancom',
      alquranAudioEditions: [],
      alquranEdition: '',
      
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
      playerMenuOpen: false
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
    progressPercent() {
      if (!this.totalVerses) return 0
      return Math.round((this.currentPosition / this.totalVerses) * 100)
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
    }
  },
  mounted() {
    this.loadChapters()
    this.loadReciters()
    this.loadAlquranAudioEditions()
    this.initAudio()
    document.documentElement.setAttribute('data-theme', this.theme)
  },
  methods: {
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
    cycleTheme() {
      const themes = ['light', 'sepia', 'dark']
      const idx = themes.indexOf(this.theme)
      this.theme = themes[(idx + 1) % themes.length]
      document.documentElement.setAttribute('data-theme', this.theme)
    },
    async loadChapters() {
      try {
        const res = await axios.get('https://api.quran.com/api/v4/chapters', { params: { language: 'en' } })
        this.chapters = res.data?.chapters || []
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
      if (this.audioSource === 'alquran') await this.ensureAlquranEdition()
      const params = {
        per_page: 300,
        translations: this.showTranslation ? '131' : undefined,
        words: this.showWordByWord,
        audio: this.audioSource === 'qurancom' ? this.reciterId : undefined,
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

        if (this.audioSource === 'alquran' && this.alquranEdition) {
          try {
            const audioRes = await getSurahEdition(this.chapterId, this.alquranEdition)
            const ayahs = audioRes.data?.data?.ayahs || []
            const byNumberAudio = new Map(ayahs.map(a => [a.numberInSurah, a.audio]))
            this.verses = this.verses.map(v => ({ ...v, audio: byNumberAudio.get(v.number) || v.audio }))
          } catch (e) { console.error(e) }
        }

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
      } catch (e) { console.error(e) }
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
        }
      }
      this.queue = q
      this.queueIndex = 0
    },
    rebuildQueue() { this.buildQueue() },
    async startSession() {
      if (!this.chapterId) { this.showTools = true; return }
      if (!this.verses.length) await this.loadVerses()
      if (!this.verses.length) return
      if (!this.queue.length) this.buildQueue()
      this.queueIndex = 0
      const first = this.queue[0] || this.verses[0]
      this.showTools = false
      await this.$nextTick()
      if (first) this.playVerse(first)
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
    },
    playWordAudio(url) {
      if (!url) return
      const a = new Audio(url)
      a.play().catch(() => { })
    },
    initAudio() {
      this.audioElement = this.$refs.audio
      if (!this.audioElement) return
      this.audioElement.addEventListener('timeupdate', () => {
        this.currentTime = this.audioElement.currentTime
        this.duration = this.audioElement.duration
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
      })
      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false
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
  --bg: #f7f5f0;
  --surface: rgba(255, 255, 255, 0.9);
  --border: rgba(0, 0, 0, 0.06);
  --text: #1a1a2e;
  --text-muted: #6b6b80;
  --accent: #8b5e3c;
  --accent-light: rgba(139, 94, 60, 0.08);
  --radius: 14px;
  --font-ar: 'Amiri', 'Times New Roman', serif;
  --font-ui: -apple-system, 'Inter', sans-serif;
}

[data-theme="dark"] {
  --bg: #121212;
  --surface: rgba(30, 30, 40, 0.9);
  --border: rgba(255, 255, 255, 0.06);
  --text: #e8e8e8;
  --text-muted: #a0a0b0;
  --accent: #c49a6c;
  --accent-light: rgba(196, 154, 108, 0.1);
}

[data-theme="sepia"] {
  --bg: #f8f0e0;
  --surface: rgba(255, 248, 235, 0.9);
  --text: #3d2b1a;
  --text-muted: #7a684a;
  --accent: #c49a6c;
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
}

.app {
  min-height: 100vh;
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
  border-radius: 10px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  color: var(--text-muted);
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

/* Progress */
.progress-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.progress-bar {
  flex: 1;
  height: 3px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

.cta-btn {
  padding: 6px 18px;
  border-radius: 40px;
  background: var(--accent);
  border: none;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Empty */
.empty {
  padding: 40px 0;
}

.empty-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 32px;
  text-align: center;
  border: 1px solid var(--border);
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

.outline-btn {
  padding: 6px 16px;
  border-radius: 40px;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  cursor: pointer;
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
  background: var(--surface);
  border-radius: var(--radius);
  padding: 16px;
  border: 1px solid var(--border);
  transition: all 0.2s;
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
  font-size: 1.2rem;
  line-height: 1.7;
  text-align: right;
  direction: rtl;
  background: rgba(0, 0, 0, 0.02);
  padding: 10px;
  border-radius: 10px;
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
  top: 65px;
  right: 0;
  bottom: 0;
  width: 360px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  backdrop-filter: blur(10px);
  transform: translateX(100%);
  transition: transform 0.25s ease;
  z-index: 15;
  display: flex;
  flex-direction: column;
}

.tools.open {
  transform: translateX(0);
}

@media (max-width: 768px) {
  .tools {
    width: calc(100% - 32px);
    right: 16px;
    left: 16px;
    border-radius: var(--radius);
    transform: translateY(100%);
    top: auto;
    bottom: 16px;
    height: auto;
    max-height: 70vh;
  }
}

.tools-head {
  display: flex;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.tools-title {
  font-weight: 500;
  font-size: 0.85rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-muted);
}

.tools-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.tools-tabs button {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--text-muted);
}

.tools-tabs button.active {
  background: var(--accent-light);
  color: var(--accent);
}

.tools-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
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
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.select,
.input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
}

.range {
  display: flex;
  align-items: center;
  gap: 8px;
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
  background: var(--accent);
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
  background: var(--accent);
  border: none;
  color: white;
  cursor: pointer;
  font-weight: 450;
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
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
  padding: 8px 16px 10px;
  z-index: 25;
}

.player-progress {
  position: relative;
  height: 18px;
  cursor: pointer;
  margin-bottom: 6px;
}

.player-track {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.player-fill {
  position: absolute;
  top: 8px;
  left: 0;
  height: 2px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 2px;
}

.player-handle {
  position: absolute;
  top: 4px;
  width: 10px;
  height: 10px;
  background: rgba(0, 0, 0, 0.55);
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
  font-size: 14px;
  color: rgba(0, 0, 0, 0.55);
}

.player-time.right { text-align: right; }

.player-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.player-icon {
  background: transparent;
  border: none;
  padding: 6px;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.65);
}

.player-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.player-icon.play {
  font-size: 22px;
  color: rgba(0, 0, 0, 0.85);
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
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  padding: 8px;
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
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  text-align: left;
  border-radius: 8px;
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
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.pm-value {
  font-size: 13px;
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
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
  font-size: 13px;
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
