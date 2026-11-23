<template>
  <section class="teacher-pane learner-circle" :aria-label="t('dashboard.circle_teachers_title')">
    <header class="teacher-pane__head">
      <div class="teacher-pane__titles">
        <h2 class="teacher-pane__title">{{ t('dashboard.circle_teachers_title') }}</h2>
      </div>
    </header>
    <div class="teacher-pane__body">
      <p v-if="!teachers.length" class="teacher-meta">{{ t('dashboard.circle_teachers_empty') }}</p>
      <ul v-else class="learner-circle__list">
        <li v-for="teacher in teachers" :key="teacher.id" class="learner-circle__teacher">
          <div class="learner-circle__copy">
            <strong>{{ teacher.name }}</strong>
            <p class="teacher-meta">{{ t('dashboard.circle_teacher_line') }}</p>
            <p v-if="teacher.can_message === false" class="teacher-meta">{{ t('dashboard.circle_message_blocked') }}</p>
            <button
              v-if="areaLabels(teacher).length"
              type="button"
              class="dash-text-link"
              @click="aboutTeacher = teacher"
            >{{ t('dashboard.circle_about') }}</button>
          </div>
          <div class="learner-circle__actions">
            <button v-if="teacher.can_message" type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('message', teacher.id)">
              {{ t('dashboard.circle_message') }}
            </button>
            <button v-if="showLearning" type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('learning')">
              {{ t('dashboard.circle_open_learning') }}
            </button>
          </div>
        </li>
      </ul>

      <h3 class="teacher-pane__title learner-circle__subhead">{{ t('dashboard.circle_guardians_title') }}</h3>
      <p v-if="!guardians.length" class="teacher-meta">{{ t('dashboard.circle_guardians_empty') }}</p>
      <ul v-else class="learner-circle__list">
        <li v-for="guardian in guardians" :key="guardian.id" class="learner-circle__guardian">
          <strong>{{ guardian.display_name || guardian.relationship }}</strong>
          <span class="teacher-fact">{{ guardian.relationship }}</span>
          <span v-if="guardian.name_hidden" class="teacher-fact">{{ t('dashboard.circle_guardian_name_hidden') }}</span>
          <span class="teacher-fact">{{ t('dashboard.circle_guardian_connected') }}</span>
        </li>
      </ul>
    </div>

    <DashModalRoot
      :open="Boolean(aboutTeacher)"
      labelled-by="learner-circle-about-title"
      root-class="parent-modal-root"
      panel-class="parent-modal"
      @close="aboutTeacher = null"
    >
      <header v-if="aboutTeacher" class="parent-modal__head">
        <div>
          <h2 id="learner-circle-about-title">{{ aboutTeacher.name }}</h2>
          <p>{{ t('dashboard.circle_about_title') }}</p>
        </div>
        <button type="button" class="parent-modal__close" :aria-label="t('common.close')" @click="aboutTeacher = null">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div v-if="aboutTeacher" class="parent-modal__body">
        <ul v-if="areaLabels(aboutTeacher).length" class="learner-circle__areas">
          <li v-for="area in areaLabels(aboutTeacher)" :key="area">{{ area }}</li>
        </ul>
        <p v-else class="parent-modal__quiet">{{ t('dashboard.circle_about_empty') }}</p>
      </div>
    </DashModalRoot>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import DashModalRoot from '../dashboard/DashModalRoot.vue'

const AREA_KEYS = {
  'Shared class': 'dashboard.student_area_class',
  Revision: 'parent.activity_revision',
  'New memorisation': 'dashboard.student_area_new',
  'Recent revision': 'dashboard.student_area_recent',
  Nazra: 'parent.activity_nazra',
  'Older revision': 'dashboard.student_area_older',
  Tajweed: 'dashboard.student_type_recitation',
  Hifz: 'parent.activity_hifz',
}

export default {
  name: 'LearnerCirclePanel',
  components: { DashModalRoot },
  mixins: [i18nMixin],
  props: {
    circle: { type: Object, default: null },
    showLearning: { type: Boolean, default: true },
  },
  emits: ['message', 'learning'],
  data() {
    return { aboutTeacher: null }
  },
  computed: {
    teachers() {
      return Array.isArray(this.circle?.teachers) ? this.circle.teachers : []
    },
    guardians() {
      return Array.isArray(this.circle?.guardians) ? this.circle.guardians : []
    },
  },
  methods: {
    areaLabels(teacher) {
      return (Array.isArray(teacher?.learning_areas) ? teacher.learning_areas : [])
        .map((area) => this.friendlyArea(area?.label))
        .filter(Boolean)
    },
    friendlyArea(label) {
      const key = AREA_KEYS[String(label || '').trim()]
      if (!key) return label
      const value = this.t(key)
      return value && value !== key ? value : label
    },
  },
}
</script>
