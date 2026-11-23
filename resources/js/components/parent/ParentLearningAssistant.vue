<template>
  <section class="teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.assistant_title') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.assistant_hint') }}</p>
      </div>
    </header>

    <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    <p v-if="children.length" class="teacher-meta">{{ selectedId ? t('parent.showing_child') : t('parent.showing_family') }}</p>
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />

    <template v-else>
      <div class="parent-child-actions parent-assistant-prompts" role="group" :aria-label="t('parent.assistant_prompts')">
        <button
          v-for="item in prompts"
          :key="item.id"
          type="button"
          class="btn btn-outline-secondary"
          :disabled="sending"
          @click="askPrompt(item.id)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="teacher-direct-thread teacher-direct-thread--chat" role="log" :aria-label="t('parent.assistant_title')">
        <p v-if="!turns.length" class="teacher-meta">{{ t('parent.assistant_start') }}</p>
        <article v-for="turn in turns" :key="turn.id" class="teacher-direct-thread__bubble" :class="turn.role === 'parent' ? 'is-own' : 'is-student'">
          <p>{{ turn.text }}</p>
          <template v-if="turn.role === 'assistant'">
            <p v-if="turn.expanded && turn.showMore" class="teacher-meta">{{ turn.expanded }}</p>
            <button v-if="turn.expanded" type="button" class="btn btn-link" @click="turn.showMore = !turn.showMore">
              {{ turn.showMore ? t('parent.assistant_less') : t('parent.assistant_more') }}
            </button>
            <p v-if="turn.sources.length" class="teacher-meta">
              <span v-for="source in turn.sources" :key="source.kind" class="teacher-pill">{{ source.label }}</span>
            </p>
            <div v-if="turn.links.length" class="parent-child-actions">
              <button
                v-for="link in turn.links"
                :key="`${link.view}-${link.child_id}`"
                type="button"
                class="btn btn-outline-secondary"
                @click="$emit('open-link', link)"
              >
                {{ link.label }}
              </button>
            </div>
          </template>
        </article>
      </div>

      <p v-if="error" class="alert alert-danger" role="alert">
        {{ error }}
        <button type="button" class="btn btn-link" @click="retry">{{ t('parent.retry') }}</button>
      </p>

      <form class="teacher-direct-thread__composer" @submit.prevent="askText">
        <label class="visually-hidden" for="parent-assistant-question">{{ t('parent.assistant_placeholder') }}</label>
        <textarea
          id="parent-assistant-question"
          v-model="draft"
          class="form-control"
          rows="2"
          :placeholder="t('parent.assistant_placeholder')"
          :disabled="sending"
        ></textarea>
        <div class="teacher-direct-thread__composer-foot">
          <button type="submit" class="btn btn-primary" :disabled="sending || !draft.trim()">
            {{ sending ? t('parent.assistant_sending') : t('parent.assistant_send') }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

const FALLBACK_PROMPTS = [
  { id: 'progress', labelKey: 'parent.assistant_prompt_progress' },
  { id: 'practice', labelKey: 'parent.assistant_prompt_practice' },
  { id: 'homework', labelKey: 'parent.assistant_prompt_homework' },
  { id: 'feedback', labelKey: 'parent.assistant_prompt_feedback' },
  { id: 'routine', labelKey: 'parent.assistant_prompt_routine' },
  { id: 'month', labelKey: 'parent.assistant_prompt_month' },
]

export default {
  name: 'ParentLearningAssistant',
  components: { ParentChildFilter, TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select-child', 'open-link'],
  data() {
    return {
      draft: '',
      sending: false,
      error: '',
      turns: [],
      lastRequest: null,
      nextId: 1,
    }
  },
  computed: {
    prompts() {
      return FALLBACK_PROMPTS.map((item) => ({ id: item.id, label: this.t(item.labelKey) }))
    },
  },
  watch: {
    selectedId() {
      this.turns = []
      this.error = ''
    },
  },
  methods: {
    askPrompt(id) {
      const item = this.prompts.find((row) => row.id === id)
      this.lastRequest = { prompt: id, question: null, label: item?.label || id }
      this.submit()
    },
    askText() {
      const question = this.draft.trim()
      if (!question) return
      this.draft = ''
      this.lastRequest = { prompt: null, question, label: question }
      this.submit()
    },
    retry() {
      if (this.lastRequest) this.submit()
    },
    async submit() {
      const request = this.lastRequest
      if (!request || this.sending) return
      this.sending = true
      this.error = ''
      const asked = this.turns.some((turn) => turn.request === request)
      if (!asked) {
        this.turns.push({ id: this.nextId++, role: 'parent', text: request.label, request })
      }
      try {
        const data = await learningApi.askParentAssistant({
          prompt: request.prompt,
          question: request.question,
          childId: this.selectedId,
        })
        this.turns.push({
          id: this.nextId++,
          role: 'assistant',
          text: data.short || this.t('parent.assistant_unavailable'),
          expanded: data.expanded || '',
          showMore: false,
          sources: Array.isArray(data.sources) ? data.sources : [],
          links: Array.isArray(data.links) ? data.links : [],
        })
      } catch (error) {
        const status = error?.response?.status
        this.error = status === 429
          ? (error.response?.data?.message || this.t('parent.assistant_limit'))
          : this.t('parent.assistant_unavailable')
      } finally {
        this.sending = false
      }
    },
  },
}
</script>
