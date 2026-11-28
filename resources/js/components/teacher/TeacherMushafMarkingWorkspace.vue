<template>
  <div class="teacher-mushaf-marking" :data-interaction-mode="interactionMode">
    <p v-if="loading" class="teacher-playback__hint" role="status">{{ t('teacher.loading_quran_text') }}</p>
  <MadaniSpread
    v-else-if="leaf.page"
    class="teacher-mushaf-marking__spread"
    :page="leaf.page"
    :font-family="leaf.fontFamily"
    :font-url="leaf.fontUrl"
    hide-dev-nav
    reader-mode
    :page-layout="pageLayout"
    :active-ayah="activeAyahKey"
    :annotation-overlays="annotationOverlays"
    :mushaf-interaction-mode="interactionMode"
    @select="onWordSelect"
  />
    <p v-else class="teacher-playback__hint">{{ t('teacher.madani_text_unavailable') }}</p>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import MadaniSpread from '../madani/MadaniSpread.vue'
import { loadMushafVersePageIndex } from '../../scripts/mushaf/qpcMadaniVersePage.js'
import { loadMadaniPageLeaf } from '../../scripts/mushaf/qpcMadaniPageData.js'
import { parseMushafWordLocation } from '../../scripts/teacher/mushafAnnotationOverlays.js'
import { MUSHAF_LAYOUT_MADANI_V2 } from '../../scripts/mushaf/mushafLayouts.js'
export default {
  name: 'TeacherMushafMarkingWorkspace',
  components: { MadaniSpread },
  mixins: [i18nMixin],
  props: {
    surah: { type: Number, required: true },
    ayahFrom: { type: Number, required: true },
    ayahTo: { type: Number, required: true },
    interactionMode: { type: String, default: 'reading' },
    annotationOverlays: { type: Object, default: () => ({}) },
    activeAyah: { type: Number, default: null },
    activeWordIndex: { type: Number, default: null },
  },
  emits: ['update:interactionMode', 'select-word'],
  data() {
    return {
      loading: false,
      leaf: { page: null, fontFamily: '', fontUrl: '' },
      loadToken: 0,
    }
  },
  computed: {
    activeAyahKey() {
      if (!this.activeAyah) return ''
      return `${this.surah}:${this.activeAyah}`
    },
    pageLayout() {
      if (typeof window !== 'undefined' && window.innerWidth < 900) return 'one'
      return 'two'
    },
  },
  watch: {
    surah: { immediate: true, handler() { this.loadLeaf() } },
    ayahFrom() { this.loadLeaf() },
  },
  methods: {
    async loadLeaf() {
      const surah = Number(this.surah)
      const ayah = Number(this.ayahFrom)
      if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(ayah) || ayah < 1) {
        this.leaf = { page: null, fontFamily: '', fontUrl: '' }
        return
      }
      const token = ++this.loadToken
      this.loading = true
      try {
        const index = await loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
        const verseKey = `${surah}:${ayah}`
        const pageNumber = Number(index?.[verseKey] || index?.get?.(verseKey))
        if (!pageNumber) {
          this.leaf = { page: null, fontFamily: '', fontUrl: '' }
          return
        }
        const loaded = await loadMadaniPageLeaf(pageNumber, MUSHAF_LAYOUT_MADANI_V2)
        if (token !== this.loadToken) return
        this.leaf = loaded || { page: null, fontFamily: '', fontUrl: '' }
      } catch {
        if (token === this.loadToken) this.leaf = { page: null, fontFamily: '', fontUrl: '' }
      } finally {
        if (token === this.loadToken) this.loading = false
      }
    },
    onWordSelect(location) {
      const parsed = parseMushafWordLocation(location)
      if (!parsed) return
      if (parsed.surah !== Number(this.surah)) return
      const from = Number(this.ayahFrom)
      const to = Math.max(from, Number(this.ayahTo || from))
      if (parsed.ayah < from || parsed.ayah > to) return
      this.$emit('select-word', {
        surah: parsed.surah,
        ayah: parsed.ayah,
        word_index: parsed.word_index,
        location,
      })
    },
  },
}
</script>