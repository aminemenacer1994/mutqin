<template>
  <section v-if="organisation" class="dash-section dash-section--flat teacher-roster" :aria-labelledby="headingId">
    <h2 :id="headingId" class="visually-hidden">{{ t('teacher.org_roster_team') }}</h2>
    <div class="dash-section__body dash-section__body--spacious">
      <div class="teacher-roster__columns">
        <div class="teacher-roster__column">
          <h4>{{ t('teacher.org_teachers_heading') }} <span class="teacher-roster__count">{{ teachers.length }}</span></h4>
          <TeacherEmpty v-if="!teachers.length" inline :message="t('teacher.org_teachers_empty')" />
          <div v-else class="teacher-grid teacher-grid--dense">
            <article v-for="member in teachers" :key="member.id" class="teacher-tile teacher-tile--static">
              <span class="teacher-list__avatar" aria-hidden="true">{{ studentInitial(member.name) }}</span>
              <span class="teacher-tile__copy">
                <strong>{{ member.name }}</strong>
                <span v-if="member.is_institution_admin" class="teacher-pill">{{ t('teacher.org_admin_badge') }}</span>
                <span v-if="member.is_you" class="teacher-pill teacher-pill--you">{{ t('teacher.org_you') }}</span>
              </span>
            </article>
          </div>
        </div>

        <div class="teacher-roster__column">
          <h4>{{ t('teacher.org_students_heading') }} <span class="teacher-roster__count">{{ students.length }}</span></h4>
          <TeacherEmpty v-if="!students.length" inline :message="t('teacher.org_students_empty')" />
          <div v-else class="teacher-grid teacher-grid--dense">
            <button
              v-for="student in students"
              :key="student.id"
              type="button"
              class="teacher-tile"
              @click="$emit('open-student', student.id)"
            >
              <span class="teacher-list__avatar" aria-hidden="true">{{ studentInitial(student.name) }}</span>
              <span class="teacher-tile__copy">
                <strong>{{ student.name }}</strong>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studentInitial } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'

export default {
  name: 'TeacherOrganisationRoster',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    organisation: { type: Object, default: null },
    teachers: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
  },
  emits: ['open-student'],
  data() {
    return {
      headingId: `teacher-org-roster-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  methods: {
    studentInitial,
  },
}
</script>
