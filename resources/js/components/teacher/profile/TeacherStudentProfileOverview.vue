<template>
  <div>
    <TeacherKpiGrid
      compact
      :cards="[
        { key: 'sessions', label: t('teacher.sessions'), value: metric('sessions'), icon: 'bi bi-play-circle', tone: 'teal' },
        { key: 'time', label: t('teacher.practice_time'), value: practiceTime, icon: 'bi bi-clock-history', tone: 'gold' },
        { key: 'mem', label: t('teacher.memorised'), value: metric('memorised_ayahs'), icon: 'bi bi-bookmark-heart', tone: 'accent' },
        { key: 'days', label: t('teacher.active_days'), value: metric('active_days'), icon: 'bi bi-calendar-check', tone: 'sky' },
      ]"
    />
    <div class="teacher-calendar" :aria-label="t('teacher.calendar')">
      <span
        v-for="day in profile.payload.calendar || []"
        :key="day.date"
        class="teacher-calendar__day"
        :class="{ 'is-active': day.active }"
        :title="day.date"
      ></span>
    </div>
    <form class="teacher-note" @submit.prevent="$emit('save-note')">
      <label class="teacher-field">
        <span>{{ t('teacher.note_kind') }}</span>
        <select :value="note.kind" @change="patchNote('kind', $event.target.value)">
          <option value="feedback">{{ t('teacher.feedback') }}</option>
          <option value="note">{{ t('teacher.private_note') }}</option>
        </select>
      </label>
      <label class="teacher-field teacher-field--wide">
        <span>{{ t('teacher.note_body') }}</span>
        <textarea :value="note.body" rows="3" maxlength="2000" @input="patchNote('body', $event.target.value)"></textarea>
      </label>
      <div class="teacher-note__actions">
        <button type="submit" class="dash-btn dash-btn--primary" :disabled="noteSaving">{{ t('teacher.save_note') }}</button>
      </div>
    </form>
    <ul v-if="profile.payload.notes?.length" class="teacher-list teacher-list--bordered">
      <li v-for="item in profile.payload.notes" :key="item.id">
        <strong>{{ item.kind === 'feedback' ? t('teacher.feedback') : t('teacher.private_note') }}</strong>
        <span>{{ item.body }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else :message="t('teacher.notes_empty')" />
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherKpiGrid from '../TeacherKpiGrid.vue'

export default {
  name: 'TeacherStudentProfileOverview',
  components: { TeacherEmpty, TeacherKpiGrid },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    note: { type: Object, required: true },
    noteSaving: { type: Boolean, default: false },
    metric: { type: Function, required: true },
    practiceTime: { type: String, required: true },
  },
  emits: ['update:note', 'save-note'],
  methods: {
    patchNote(key, value) {
      this.$emit('update:note', { ...this.note, [key]: value })
    },
  },
}
</script>
