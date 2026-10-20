<template>
  <section class="teacher-stack">
    <button type="button" class="teacher-back" @click="$emit('back')">
      <i class="bi bi-arrow-left" aria-hidden="true"></i>
      {{ t('teacher.back_students') }}
    </button>

    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <TeacherPanel>
        <div class="teacher-profile-hero">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(profile.student.name) }}</span>
          <div class="teacher-profile-hero__copy">
            <h2>{{ profile.student.name }}</h2>
            <p>{{ profile.student.email }}</p>
            <p>
              {{ profile.student.organisation }}
              <span v-if="profile.student.groups?.length"> · {{ profile.student.groups.map((g) => g.name).join(', ') }}</span>
            </p>
          </div>
        </div>
      </TeacherPanel>

      <div class="teacher-tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          role="tab"
          class="teacher-tabs__tab"
          :class="{ 'is-active': section === tab }"
          :aria-selected="section === tab ? 'true' : 'false'"
          @click="$emit('change-section', tab)"
        >
          {{ t(`teacher.tab_${tab}`) }}
        </button>
      </div>

      <div class="dash-section dash-section--flat">
        <div class="dash-section__body">
          <TeacherStudentProfileOverview
            v-if="section === 'overview'"
            :profile="profile"
            :note="note"
            :note-saving="noteSaving"
            :metric="metric"
            :practice-time="practiceTime"
            @update:note="$emit('update:note', $event)"
            @save-note="$emit('save-note')"
          />
          <TeacherStudentProfilePractice
            v-else-if="section === 'practice'"
            :profile="profile"
            :session-label="sessionLabel"
            :format-when="formatWhen"
          />
          <TeacherStudentProfileWeak
            v-else-if="section === 'weak'"
            :profile="profile"
            :format-when="formatWhen"
          />
          <TeacherStudentProfileAi
            v-else-if="section === 'ai'"
            :profile="profile"
            :issue-label="issueLabel"
          />
          <TeacherStudentProfileRevision
            v-else
            :profile="profile"
            :comparisons="comparisons"
            :format-when="formatWhen"
          />
        </div>
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherPanel from './TeacherPanel.vue'
import TeacherStudentProfileAi from './profile/TeacherStudentProfileAi.vue'
import TeacherStudentProfileOverview from './profile/TeacherStudentProfileOverview.vue'
import TeacherStudentProfilePractice from './profile/TeacherStudentProfilePractice.vue'
import TeacherStudentProfileRevision from './profile/TeacherStudentProfileRevision.vue'
import TeacherStudentProfileWeak from './profile/TeacherStudentProfileWeak.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherEmpty,
    TeacherPanel,
    TeacherStudentProfileAi,
    TeacherStudentProfileOverview,
    TeacherStudentProfilePractice,
    TeacherStudentProfileRevision,
    TeacherStudentProfileWeak,
  },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, default: null },
    section: { type: String, required: true },
    tabs: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    note: { type: Object, required: true },
    noteSaving: { type: Boolean, default: false },
    metric: { type: Function, required: true },
    practiceTime: { type: String, required: true },
    comparisons: { type: Array, default: () => [] },
    studentInitial: { type: Function, required: true },
    sessionLabel: { type: Function, required: true },
    issueLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['back', 'change-section', 'update:note', 'save-note'],
}
</script>
