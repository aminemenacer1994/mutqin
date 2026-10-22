<template>
  <div>
  <ul class="list-group list-group-flush teacher-records">
    <li v-for="(row, index) in visibleRows" :key="row.key ?? index" class="list-group-item teacher-records__item d-flex align-items-center gap-3">
      <span class="teacher-records__icon" :class="row.iconTone ? `teacher-records__icon--${row.iconTone}` : ''" aria-hidden="true">
        <i :class="row.icon || 'bi bi-dot'"></i>
      </span>
      <div class="teacher-records__copy">
        <span class="teacher-records__title" :class="{ 'teacher-quran': row.quran }">{{ row.title }}</span>
        <span v-if="row.hint" class="teacher-records__hint">{{ row.hint }}</span>
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
          @click="$emit('action', row.actionPayload)"
        >
          {{ row.actionLabel }}
        </button>
      </div>
    </li>
  </ul>
  <TeacherMore :remaining="rows.length - shown" :shown="shown" :initial="5" @more="shown += 5" @less="shown = 5" />
  </div>
</template>

<script>
import TeacherMore from './TeacherMore.vue'
export default {
  name: 'TeacherRecordList',
  components: { TeacherMore },
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['action'],
  data() {
    return { shown: 5 }
  },
  computed: {
    visibleRows() {
      return this.rows.slice(0, this.shown)
    },
  },
}
</script>
