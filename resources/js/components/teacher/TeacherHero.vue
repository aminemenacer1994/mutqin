<template>
  <header class="dash-reveal teacher-hero">
    <div class="teacher-hero__row">
      <div class="teacher-hero__identity">
        <span class="teacher-hero__mark" aria-hidden="true"><i class="bi bi-mortarboard"></i></span>
        <div class="teacher-hero__copy">
          <p class="teacher-hero__eyebrow">{{ t('teacher.workspace_label') }}</p>
          <h1 class="teacher-hero__title">{{ t('teacher.greeting', { name: firstName }) }}</h1>
          <p v-if="organisationName" class="teacher-meta">
            <i class="bi bi-building" aria-hidden="true"></i>
            {{ organisationName }}
          </p>
          <p v-else class="teacher-meta">{{ t('ui.connections_status_none') }}</p>
        </div>
      </div>
      <button type="button" class="btn btn-primary" data-sandbox-tour="teacher-new-assignment" @click="$emit('create-assignment')">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>{{ t('teacher.assign_task') }}
      </button>
    </div>
    <ConnectPrompt
      v-if="!organisationName"
      storage-key="mutqin_connect_prompt_teacher"
      :title="t('ui.connections_connect_title')"
      :body="t('ui.connections_prompt_teacher')"
      :status="t('ui.connections_status_none')"
    />
  </header>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import ConnectPrompt from '../ConnectPrompt.vue'

export default {
  name: 'TeacherHero',
  components: { ConnectPrompt },
  mixins: [i18nMixin],
  props: {
    firstName: { type: String, required: true },
    organisationName: { type: String, default: '' },
    studentCount: { type: Number, default: 0 },
    supportCount: { type: Number, default: 0 },
  },
  emits: ['open-students', 'open-attention', 'create-assignment'],
}
</script>
