<template>
  <div class="user-dashboard teacher-dashboard" data-platform-shell="parent">
    <div class="container user-dashboard__shell teacher-dashboard__shell">
      <section class="teacher-pane">
        <header class="teacher-pane__head">
          <div>
            <h1 class="teacher-pane__title">{{ t('parent.code_redeem_title') }}</h1>
            <p class="teacher-pane__hint">{{ t('parent.code_redeem_hint') }}</p>
          </div>
        </header>
        <form class="teacher-pane__body d-grid gap-2" @submit.prevent="redeem">
          <p v-if="notice" class="alert alert-success mb-0" role="status">{{ notice }}</p>
          <p v-if="error" class="alert alert-danger mb-0" role="alert">{{ error }}</p>
          <label class="visually-hidden" for="parent-link-code">{{ t('parent.code_redeem_title') }}</label>
          <input id="parent-link-code" v-model="code" class="form-control" required maxlength="16" :disabled="saving" autocomplete="off">
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('parent.loading') : t('parent.code_redeem') }}</button>
        </form>
      </section>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { i18nMixin } from '../mixins/i18nMixin'

export default {
  name: 'ParentLinkRedeem',
  mixins: [i18nMixin],
  props: {
    auth: { type: Object, required: true },
  },
  data() {
    return { code: '', saving: false, notice: '', error: '' }
  },
  methods: {
    async redeem() {
      this.saving = true
      this.notice = ''
      this.error = ''
      try {
        await axios.post(`${this.auth.api_url}/link-codes/redeem`, { code: this.code })
        this.code = ''
        this.notice = this.t('parent.code_redeemed')
      } catch (error) {
        this.error = error?.response?.data?.errors?.code?.[0] || this.t('parent.code_failed')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>
