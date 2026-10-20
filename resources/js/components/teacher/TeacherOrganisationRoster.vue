<template>
  <section class="teacher-roster" :aria-labelledby="headingId">
    <div class="teacher-roster__org">
      <h3 :id="headingId">{{ t('teacher.org_roster_title') }}</h3>
      <p v-if="organisation" class="teacher-roster__org-name">{{ organisation.name }}</p>
      <p v-if="organisation?.type" class="teacher-roster__org-type">{{ orgTypeLabel(organisation.type) }}</p>
      <TeacherEmpty v-else inline :message="t('teacher.org_none')" />
    </div>

    <div v-if="organisation" class="teacher-roster__columns">
      <div class="teacher-roster__column">
        <h4>{{ t('teacher.org_teachers_heading') }} <span class="teacher-roster__count">{{ teachers.length }}</span></h4>
        <TeacherEmpty v-if="!teachers.length" inline :message="t('teacher.org_teachers_empty')" />
        <ul v-else class="teacher-list teacher-list--bordered teacher-list--inset">
          <li v-for="member in teachers" :key="member.id">
            <span>
              {{ member.name }}
              <span v-if="member.is_you" class="dash-chip dash-chip--streak-soft">{{ t('teacher.org_you') }}</span>
            </span>
            <span>{{ member.email }}</span>
          </li>
        </ul>
      </div>

      <div class="teacher-roster__column">
        <h4>{{ t('teacher.org_students_heading') }} <span class="teacher-roster__count">{{ students.length }}</span></h4>
        <p class="teacher-roster__hint">{{ t('teacher.org_students_hint') }}</p>
        <TeacherEmpty v-if="!students.length" inline :message="t('teacher.org_students_empty')" />
        <ul v-else class="teacher-list teacher-list--bordered teacher-list--inset">
          <li v-for="student in students" :key="student.id">
            <button type="button" class="teacher-list__btn" @click="$emit('open-student', student.id)">{{ student.name }}</button>
            <span>{{ student.email }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
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
    orgTypeLabel(type) {
      const key = `teacher.org_type_${type}`
      const translated = this.t(key)
      return translated !== key ? translated : type
    },
  },
}
</script>
