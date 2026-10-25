<template>
  <div>
  <ul class="list-group list-group-flush teacher-records">
    <li v-for="(row, index) in visibleRows" :key="row.key ?? index" class="list-group-item teacher-records__item d-flex align-items-center gap-3">
      <span class="teacher-records__icon" :class="row.iconTone ? `teacher-records__icon--${row.iconTone}` : ''" aria-hidden="true">
        <i :class="row.icon || 'bi bi-dot'"></i>
      </span>
      <div class="teacher-records__copy">
        <a v-if="row.href" class="teacher-records__title teacher-records__link" :class="{ 'teacher-quran': row.quran }" :href="row.href">{{ row.title }}</a>
        <button v-else-if="row.reviewable || row.audio?.available || row.transcript" type="button" class="teacher-records__title teacher-records__title-button" :class="{ 'teacher-quran': row.quran }" @click="openEvidence(row, 'audio')">
          {{ row.title }}<i class="bi bi-play-circle" aria-hidden="true"></i>
        </button>
        <span v-else class="teacher-records__title" :class="{ 'teacher-quran': row.quran }">{{ row.title }}</span>
        <span v-if="row.hint" class="teacher-records__hint">{{ row.hint }}</span>
        <span v-if="row.arabicName" class="teacher-records__arabic-name" lang="ar" dir="rtl">{{ row.arabicName }}</span>
        <span v-if="row.arabicText" class="teacher-records__arabic" lang="ar" dir="rtl">{{ row.arabicText }}</span>
        <div v-if="row.audio?.available || row.transcript" class="teacher-records__evidence">
          <button v-if="row.audio?.available" type="button" class="teacher-records__evidence-button" @click="openEvidence(row, 'audio')">
            <i class="bi bi-volume-up" aria-hidden="true"></i>{{ t('teacher.student_recording') }}
          </button>
          <button v-if="row.transcript" type="button" class="teacher-records__evidence-button" @click="openEvidence(row, 'transcript')">
            <i class="bi bi-card-text" aria-hidden="true"></i>{{ t('teacher.student_transcript') }}
          </button>
        </div>
      </div>
      <div class="teacher-records__aside">
        <span
          v-if="row.badge"
          class="teacher-badge"
          :class="row.badgeTone ? `teacher-badge--${row.badgeTone}` : 'teacher-badge--muted'"
        >{{ row.badge }}</span>
        <span v-if="row.source" class="teacher-records__source">{{ row.source }}</span>
        <button
          v-if="row.actionLabel"
          type="button"
          class="btn btn-outline-secondary btn-sm dash-btn dash-btn--ghost dash-btn--sm"
          :aria-label="`${row.actionLabel}: ${row.title}`"
          :title="row.actionLabel"
          @click="$emit('action', row.actionPayload)"
        >
          <i class="bi bi-journal-plus" aria-hidden="true"></i>
          <span class="visually-hidden">{{ row.actionLabel }}</span>
        </button>
      </div>
    </li>
  </ul>
  <TeacherMore :remaining="rows.length - shown" :shown="shown" :initial="5" @more="shown += 5" @less="shown = 5" />
  <TeacherAudioDrawer :open="Boolean(activeEvidence)" :row="activeEvidence" :mode="evidenceMode" @close="activeEvidence = null" />
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherAudioDrawer from './TeacherAudioDrawer.vue'
import TeacherMore from './TeacherMore.vue'
export default {
  name: 'TeacherRecordList',
  components: { TeacherAudioDrawer, TeacherMore },
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['action'],
  data() {
    return { shown: 5, activeEvidence: null, evidenceMode: 'audio' }
  },
  computed: {
    visibleRows() {
      return this.rows.slice(0, this.shown)
    },
  },
  methods: {
    openEvidence(row, mode) {
      this.activeEvidence = row
      this.evidenceMode = mode
    },
  },
}
</script>
