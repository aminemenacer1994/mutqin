<template>
  <section class="parent-home parent-children-page teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_children') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.children_hint') }}</p>
      </div>
    </header>

    <ConnectPrompt
      v-if="!children.length && !loading"
      storage-key="mutqin_connect_prompt_parent_children"
      :title="t('ui.connections_connect_title')"
      :body="t('ui.connections_prompt_parent')"
      :status="t('ui.connections_status_none')"
    />

    <section v-if="!children.length && !loading" class="parent-panel parent-home-empty">
      <TeacherEmpty illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
      <p class="parent-lead">{{ t('parent.home_empty_support') }}</p>
      <div class="parent-hub-actions">
        <button type="button" @click="$emit('open-messages', null)">
          <i class="bi bi-chat-heart" aria-hidden="true"></i>{{ t('parent.home_empty_action_messages') }}
        </button>
        <button type="button" @click="$emit('open-settings')">
          <i class="bi bi-gear" aria-hidden="true"></i>{{ t('parent.home_empty_action_settings') }}
        </button>
      </div>
    </section>

    <ParentSingleChildSummary
      v-else-if="children.length === 1"
      :child="children[0]"
      :homework="homework"
      :activity="activity"
      @open-learning="(id, assignmentId) => $emit('open-learning', id, assignmentId)"
      @open-progress="$emit('open-progress', $event)"
      @open-messages="$emit('open-messages', $event)"
      @open-profile="$emit('open-profile', $event)"
    />

    <ParentChildrenTable
      v-else
      :rows="children"
      :homework="homework"
      :loading="loading"
      @open-learning="(id, assignmentId) => $emit('open-learning', id, assignmentId)"
      @open-progress="$emit('open-progress', $event)"
      @open-messages="$emit('open-messages', $event)"
      @open-profile="$emit('open-profile', $event)"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import ConnectPrompt from '../ConnectPrompt.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import ParentChildrenTable from './ParentChildrenTable.vue'
import ParentSingleChildSummary from './ParentSingleChildSummary.vue'

export default {
  name: 'ParentFamilyChildren',
  components: { ConnectPrompt, TeacherEmpty, ParentChildrenTable, ParentSingleChildSummary },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    activity: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['open-learning', 'open-progress', 'open-profile', 'open-messages', 'open-settings'],
}
</script>