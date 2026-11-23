<template>
  <section class="teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_messages') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.messages_hint') }}</p>
      </div>
    </header>
    <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherSectionPane v-else-if="!shared" :title="t('parent.nav_messages')" icon="bi bi-chat-dots" flat>
      <TeacherEmpty inline icon="bi bi-lock" :message="t('parent.permission_messages')" />
    </TeacherSectionPane>
    <TeacherSectionPane v-else :title="t('parent.overview_feedback')" hint="" icon="bi bi-chat-dots" flat>
      <TeacherEmpty v-if="!feedback.length" inline icon="bi bi-chat" :message="t('parent.feedback_empty')" />
      <ul v-else class="teacher-activity-list">
        <li v-for="item in feedback" :key="item.id">
          <button type="button" @click="$emit('select-child', item.child_id)">
            <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.teacher_name || item.child_name) }}</span>
            <span class="teacher-activity-list__copy">
              <strong>{{ item.teacher_name || t('parent.teacher_fallback') }}</strong>
              <small>{{ item.child_name }} · {{ formatWhen(item.at) }}</small>
              <small>{{ item.excerpt }}</small>
            </span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
    </TeacherSectionPane>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatWhen, initial } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

export default {
  name: 'ParentFamilyMessages',
  components: { ParentChildFilter, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
  },
  emits: ['select-child'],
  methods: { initial, formatWhen },
}
</script>
