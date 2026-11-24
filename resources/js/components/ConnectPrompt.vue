<template>
  <aside v-if="visible" class="connect-prompt" role="status">
    <div class="connect-prompt__copy">
      <strong>{{ title }}</strong>
      <p>{{ body }}</p>
      <p v-if="status" class="connect-prompt__status">{{ status }}</p>
    </div>
    <div class="connect-prompt__actions">
      <a class="btn btn-primary btn-sm" :href="href">{{ resolvedAction }}</a>
      <button type="button" class="btn btn-link btn-sm" @click="dismiss">{{ resolvedDismiss }}</button>
    </div>
  </aside>
</template>

<script>
import { i18nMixin } from '../mixins/i18nMixin'

export default {
  name: 'ConnectPrompt',
  mixins: [i18nMixin],
  props: {
    storageKey: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, default: '' },
    href: { type: String, default: '/onboarding/connections' },
    actionLabel: { type: String, default: '' },
    dismissLabel: { type: String, default: '' },
  },
  data() {
    return {
      dismissed: false,
    }
  },
  computed: {
    visible() {
      return !this.dismissed
    },
    resolvedAction() {
      return this.actionLabel || this.t('ui.connections_connect_action')
    },
    resolvedDismiss() {
      return this.dismissLabel || this.t('ui.connections_dismiss_prompt')
    },
  },
  created() {
    try {
      this.dismissed = window.localStorage.getItem(this.storageKey) === '1'
    } catch {
      this.dismissed = false
    }
  },
  methods: {
    dismiss() {
      this.dismissed = true
      try {
        window.localStorage.setItem(this.storageKey, '1')
      } catch {
        /* ignore */
      }
    },
  },
}
</script>
