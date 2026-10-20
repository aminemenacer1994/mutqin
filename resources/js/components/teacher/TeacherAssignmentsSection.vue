<template>
  <section class="teacher-stack">
    <TeacherPanel :title="t('teacher.nav_assignments')">
      <form class="teacher-form" @submit.prevent="$emit('create')">
        <label class="teacher-field">
          <span>{{ t('teacher.kind') }}</span>
          <select :value="form.kind" @change="patch('kind', $event.target.value)">
            <option value="practice">{{ t('teacher.kind_practice') }}</option>
            <option value="ai_recite">{{ t('teacher.kind_ai') }}</option>
          </select>
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.target') }}</span>
          <select :value="form.target" @change="patch('target', $event.target.value)">
            <option value="student">{{ t('teacher.one_student') }}</option>
            <option value="group">{{ t('teacher.whole_group') }}</option>
          </select>
        </label>
        <label v-if="form.target === 'student'" class="teacher-field">
          <span>{{ t('teacher.student') }}</span>
          <select :value="form.student_id" required @change="patch('student_id', $event.target.value)">
            <option value="">{{ t('teacher.choose') }}</option>
            <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
          </select>
        </label>
        <label v-else class="teacher-field">
          <span>{{ t('teacher.group') }}</span>
          <select :value="form.learning_group_id" required @change="patch('learning_group_id', $event.target.value)">
            <option value="">{{ t('teacher.choose') }}</option>
            <option v-for="group in teachingGroups" :key="group.id" :value="String(group.id)">{{ group.name }}</option>
          </select>
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.surah') }}</span>
          <select :value="form.surah_number" @change="patch('surah_number', $event.target.value)">
            <option v-for="surah in surahs" :key="surah.number" :value="String(surah.number)">{{ surah.number }}. {{ surah.name }}</option>
          </select>
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.from') }}</span>
          <input :value="form.ayah_start" type="number" min="1" required @input="patch('ayah_start', Number($event.target.value))">
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.to') }}</span>
          <input :value="form.ayah_end" type="number" min="1" required @input="patch('ayah_end', Number($event.target.value))">
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.repetitions') }}</span>
          <input :value="form.repetition_target" type="number" min="1" max="50" @input="patch('repetition_target', Number($event.target.value))">
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.due') }}</span>
          <input :value="form.due_at" type="date" @input="patch('due_at', $event.target.value)">
        </label>
        <label class="teacher-field teacher-field--wide">
          <span>{{ t('teacher.feedback') }}</span>
          <textarea :value="form.feedback" rows="2" maxlength="2000" @input="patch('feedback', $event.target.value)"></textarea>
        </label>
        <div class="teacher-form__actions">
          <button type="submit" class="dash-btn dash-btn--primary" :disabled="saving">{{ t('teacher.assign') }}</button>
        </div>
      </form>
    </TeacherPanel>

    <TeacherEmpty v-if="!rows.length" icon="bi bi-journal-check" :message="t('teacher.assignments_empty')" />
    <article v-for="row in rows" :key="row.assignment.id" class="dash-section dash-section--flat">
      <div class="dash-section__body">
        <h2>{{ row.assignment.surah_name }} {{ row.assignment.ayah_start }}–{{ row.assignment.ayah_end }}</h2>
        <p>
          {{ row.assignment.kind === 'ai_recite' ? t('teacher.kind_ai') : t('teacher.kind_practice') }}
          <span v-if="row.group_name"> · {{ row.group_name }}</span>
        </p>
        <p v-if="row.assignment.feedback" class="teacher-feedback">{{ t('teacher.feedback') }}: {{ row.assignment.feedback }}</p>
        <ul class="teacher-list teacher-list--bordered">
          <li v-for="recipient in row.recipients" :key="recipient.id">
            <button type="button" class="teacher-list__btn" @click="$emit('open-student', recipient.student_id)">{{ recipient.student_name }}</button>
            <span>{{ t(`teacher.status_${recipient.status}`) }}</span>
            <span v-if="recipient.comparison?.available">{{ recipient.comparison.before.accuracy_percent }}% → {{ recipient.comparison.after.accuracy_percent }}%</span>
          </li>
        </ul>
        <TeacherEmpty v-if="!row.recipients.length" :message="t('teacher.no_authorised')" inline />
      </div>
    </article>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherPanel from './TeacherPanel.vue'

export default {
  name: 'TeacherAssignmentsSection',
  components: { TeacherEmpty, TeacherPanel },
  mixins: [i18nMixin],
  props: {
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    rows: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    teachingGroups: { type: Array, default: () => [] },
    surahs: { type: Array, default: () => [] },
  },
  emits: ['update:form', 'create', 'open-student'],
  methods: {
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
  },
}
</script>
