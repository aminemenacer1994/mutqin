<template>
  <section class="parent-home parent-children-page">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-people"></i></span>
      <div>
        <h1>{{ t('parent.nav_children') }}</h1>
        <p>{{ t('parent.children_hint') }}</p>
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

    <ParentChildrenTable
      v-else
      :rows="children"
      :homework="homework"
      :loading="loading"
      @open-learning="$emit('open-learning', $event)"
      @open-progress="$emit('open-progress', $event)"
      @open-profile="$emit('open-profile', $event)"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import ConnectPrompt from '../ConnectPrompt.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import ParentChildrenTable from './ParentChildrenTable.vue'

export default {
  name: 'ParentFamilyChildren',
  components: { ConnectPrompt, TeacherEmpty, ParentChildrenTable },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['open-learning', 'open-progress', 'open-profile', 'open-messages', 'open-settings'],
}
</script>