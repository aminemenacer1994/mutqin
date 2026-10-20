<template>
  <section class="teacher-stack">
    <TeacherPanel :title="t('teacher.nav_groups')">
      <form class="teacher-form" @submit.prevent="$emit('create')">
        <label class="teacher-field teacher-field--wide">
          <span>{{ t('teacher.group_name') }}</span>
          <input :value="groupName" type="text" maxlength="120" required @input="$emit('update:groupName', $event.target.value)">
        </label>
        <div class="teacher-form__actions">
          <button type="submit" class="dash-btn dash-btn--primary" :disabled="saving">{{ t('teacher.create_group') }}</button>
        </div>
      </form>
    </TeacherPanel>

    <TeacherEmpty v-if="!groups.length" icon="bi bi-collection" :message="t('teacher.groups_empty')" />
    <article v-for="group in groups" :key="group.id" class="dash-section dash-section--flat">
      <div class="dash-section__body">
        <div class="teacher-group__head">
          <h2>{{ group.name }}</h2>
          <button v-if="!group.teaches" type="button" class="dash-btn dash-btn--ghost" @click="$emit('join', group)">{{ t('teacher.teach_group') }}</button>
          <button v-else type="button" class="dash-btn dash-btn--ghost" @click="$emit('toggle', group)">
            {{ openGroupId === group.id ? t('teacher.hide') : t('teacher.manage') }}
          </button>
        </div>
        <p>{{ t('teacher.authorised_count', { n: group.authorised_students }) }} · {{ t('teacher.pending_count', { n: group.pending_requests }) }}</p>
        <template v-if="group.teaches && openGroupId === group.id && groupDetail">
          <p v-if="groupDetail.performance">
            {{ t('teacher.ai_rate') }}: {{ groupDetail.performance.ai_success_rate === null ? t('teacher.unavailable') : `${groupDetail.performance.ai_success_rate}%` }}
            · {{ t('teacher.sessions') }}: {{ groupDetail.performance.sessions }}
          </p>
          <h3>{{ t('teacher.requests') }}</h3>
          <TeacherEmpty v-if="!groupDetail.requests?.length" :message="t('teacher.requests_empty')" />
          <ul v-else class="teacher-list teacher-list--bordered">
            <li v-for="request in groupDetail.requests" :key="request.id">
              <span>{{ request.name }}</span>
              <span>{{ request.sharing ? t('teacher.sharing_yes') : t('teacher.sharing_no') }}</span>
              <span class="teacher-actions">
                <button type="button" class="dash-btn dash-btn--primary dash-btn--sm" :disabled="!request.sharing" @click="$emit('review', request, 'approve')">{{ t('teacher.approve') }}</button>
                <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('review', request, 'reject')">{{ t('teacher.reject') }}</button>
              </span>
            </li>
          </ul>
          <h3>{{ t('teacher.students_heading') }}</h3>
          <ul v-if="groupDetail.students?.length" class="teacher-list teacher-list--bordered">
            <li v-for="member in groupDetail.students" :key="member.id">
              <button v-if="member.sharing" type="button" class="teacher-list__btn" @click="$emit('open-student', member.user_id)">{{ member.name }}</button>
              <span v-else>{{ member.name }}</span>
              <span>{{ member.sharing ? t('teacher.sharing_yes') : t('teacher.sharing_no') }}</span>
              <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('review', member, 'remove')">{{ t('teacher.remove') }}</button>
            </li>
          </ul>
          <TeacherEmpty v-else :message="t('teacher.students_empty')" />
        </template>
      </div>
    </article>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherPanel from './TeacherPanel.vue'

export default {
  name: 'TeacherGroupsSection',
  components: { TeacherEmpty, TeacherPanel },
  mixins: [i18nMixin],
  props: {
    groups: { type: Array, default: () => [] },
    groupName: { type: String, default: '' },
    saving: { type: Boolean, default: false },
    openGroupId: { type: [Number, null], default: null },
    groupDetail: { type: Object, default: null },
  },
  emits: ['update:groupName', 'create', 'join', 'toggle', 'review', 'open-student'],
}
</script>
