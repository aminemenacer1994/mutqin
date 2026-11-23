<template>
  <div class="user-dashboard teacher-dashboard" data-platform-shell="parent">
    <div class="container user-dashboard__shell teacher-dashboard__shell">
      <section class="teacher-pane">
        <header class="teacher-pane__head">
          <div>
            <h1 class="teacher-pane__title">{{ t('parent.invite_title') }}</h1>
            <p class="teacher-pane__hint">{{ t('parent.invite_hint') }}</p>
            <p class="teacher-meta mb-0">{{ auth.email }}</p>
          </div>
        </header>
        <div class="teacher-pane__body d-grid gap-2">
          <p v-if="notice" class="alert alert-success mb-0" role="status">{{ notice }}</p>
          <p v-if="error" class="alert alert-danger mb-0" role="alert">{{ error }}</p>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" :disabled="saving" @click="accept">{{ saving ? t('parent.loading') : t('parent.invite_accept') }}</button>
            <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="reject">{{ t('parent.invite_reject') }}</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { i18nMixin } from '../mixins/i18nMixin'

export default {
  name: 'ParentInvitation',
  mixins: [i18nMixin],
  props: {
    auth: { type: Object, required: true },
  },
  data() {
    return { saving: false, notice: '', error: '' }
  },
  methods: {
    async accept() {
      await this.submit('accept', 'parent.invite_accepted', this.auth.parent_url)
    },
    async reject() {
      await this.submit('reject', 'parent.invite_rejected', '/')
    },
    async submit(action, noticeKey, nextUrl) {
      this.saving = true
      this.error = ''
      try {
        await axios.post(`${this.auth.api_url}/invitations/${action}`, { token: this.auth.token })
        this.notice = this.t(noticeKey)
        window.location.assign(nextUrl)
      } catch (error) {
        this.error = error?.response?.data?.errors?.token?.[0] || this.t('parent.invite_failed')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>
