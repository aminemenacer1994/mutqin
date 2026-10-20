<template>
  <section class="dash-section dash-section--flat dash-reveal" aria-labelledby="learner-support-heading">
    <div class="dash-section__head dash-section__head--compact">
      <div class="dash-section__title">
        <span class="dash-section__icon dash-section__icon--review" aria-hidden="true"><i class="bi bi-person-workspace"></i></span>
        <div class="dash-section__title-copy">
          <h2 id="learner-support-heading">{{ t('teacher.support_title') }}</h2>
        </div>
      </div>
      <a v-if="support.teacher_dashboard_url" class="dash-text-link" :href="support.teacher_dashboard_url">{{ t('teacher.open') }}</a>
    </div>
    <div class="dash-section__body teacher-support">
      <p v-if="error" class="teacher-alert" role="alert">{{ error }}</p>
      <ul v-if="support.feedback?.length" class="teacher-list teacher-list--bordered">
        <li v-for="note in support.feedback" :key="note.id">
          <strong>{{ t('teacher.feedback') }}<template v-if="note.teacher_name"> · {{ note.teacher_name }}</template></strong>
          <span>{{ note.body }}</span>
        </li>
      </ul>
      <ul v-if="support.groups?.length" class="teacher-list teacher-list--bordered">
        <li v-for="group in support.groups" :key="group.id">
          <span>{{ group.name }}</span>
          <span>{{ group.status ? t(`teacher.status_${group.status}`) : t('teacher.not_joined') }}</span>
          <span class="teacher-actions">
            <button v-if="!group.membership_id || group.status === 'rejected'" type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('request-group', group)">{{ t('teacher.ask_join') }}</button>
            <button v-if="group.membership_id && !group.sharing && group.status !== 'rejected'" type="button" class="dash-btn dash-btn--primary dash-btn--sm" @click="$emit('grant-consent', group)">{{ t('teacher.allow_sharing') }}</button>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'LearnerTeacherSupport',
  mixins: [i18nMixin],
  props: {
    support: { type: Object, required: true },
    error: { type: String, default: '' },
  },
  emits: ['request-group', 'grant-consent'],
}
</script>
