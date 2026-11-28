<template>
  <section class="teacher-mushaf-manual" :aria-label="t('teacher.mushaf_manual_mark_title')">
    <p class="teacher-playback__hint">{{ t('teacher.mushaf_manual_mark_help') }}</p>
    <TeacherMushafMarkingWorkspace
      v-model:interaction-mode="interactionMode"
      :surah="surah"
      :ayah-from="ayahFrom"
      :ayah-to="ayahTo"
      :annotation-overlays="overlayMap"
      @select-word="openComposer"
    />
    <dialog v-if="composerOpen" ref="sheet" class="teacher-mushaf-manual__sheet" open @close="composerOpen = false">
      <form class="teacher-mushaf-manual__form" @submit.prevent="save">
        <h3>{{ t('teacher.mushaf_mode_marking') }}</h3>
        <p class="teacher-playback__hint">{{ t('teacher.ayah_n', { n: draft.ayah }) }} · {{ t('teacher.word_n', { n: draft.word_index + 1 }) }}</p>
        <label class="teacher-playback__field">
          <span>{{ t('teacher.mushaf_category_label') }}</span>
          <select v-model="draft.category" required>
            <option v-for="[id, key] in categoryOptions" :key="id" :value="id">{{ t(key) }}</option>
          </select>
        </label>
        <label class="teacher-playback__field">
          <span>{{ t('teacher.coaching_write') }}</span>
          <textarea v-model="draft.guidance" rows="2" maxlength="2000"></textarea>
        </label>
        <div class="teacher-playback__action-row">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="composerOpen = false">{{ t('teacher.playback_unsaved_cancel') }}</button>
          <button type="submit" class="btn btn-primary btn-sm" :disabled="saving">{{ saving ? t('teacher.saving') : t('teacher.coaching_send') }}</button>
        </div>
        <p v-if="error" class="teacher-playback__alert" role="alert">{{ error }}</p>
      </form>
    </dialog>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { MUSHAF_ANNOTATION_CATEGORIES } from '../../scripts/teacher/mushafAnnotationCategories'
import { buildMushafAnnotationOverlayMap } from '../../scripts/teacher/mushafAnnotationOverlays'
import TeacherMushafMarkingWorkspace from './TeacherMushafMarkingWorkspace.vue'

export default {
  name: 'TeacherMushafManualMarkPanel',
  components: { TeacherMushafMarkingWorkspace },
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], required: true },
    surah: { type: Number, required: true },
    ayahFrom: { type: Number, required: true },
    ayahTo: { type: Number, required: true },
  },
  data() {
    return {
      interactionMode: 'marking',
      categoryOptions: MUSHAF_ANNOTATION_CATEGORIES,
      annotations: [],
      composerOpen: false,
      saving: false,
      error: '',
      draft: { ayah: 0, word_index: 0, category: 'memorisation', guidance: '' },
    }
  },
  computed: {
    overlayMap() {
      return buildMushafAnnotationOverlayMap({
        surah: this.surah,
        manualAnnotations: this.annotations,
      })
    },
  },
  mounted() {
    this.reload()
  },
  methods: {
    async reload() {
      try {
        const { annotations } = await learningApi.listTeacherMushafAnnotations(this.studentId, {
          context_type: 'manual_live',
          context_id: 0,
        })
        this.annotations = Array.isArray(annotations) ? annotations : []
      } catch {
        this.annotations = []
      }
    },
    openComposer(selection) {
      this.draft = {
        ayah: selection.ayah,
        word_index: selection.word_index,
        category: 'memorisation',
        guidance: '',
      }
      this.composerOpen = true
      this.error = ''
    },
    async save() {
      this.saving = true
      this.error = ''
      try {
        const row = await learningApi.saveTeacherMushafAnnotation(this.studentId, {
          context_type: 'manual_live',
          context_id: 0,
          surah: this.surah,
          ayah: this.draft.ayah,
          word_index: this.draft.word_index,
          category: this.draft.category,
          guidance: this.draft.guidance,
          publish: '1',
        })
        this.annotations = [...this.annotations, row]
        this.composerOpen = false
      } catch (err) {
        this.error = err?.message || this.t('teacher.playback_load_failed')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>