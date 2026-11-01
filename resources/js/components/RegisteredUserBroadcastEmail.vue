<template>
  <section class="waiting-analytics waiting-launch-email" aria-labelledby="registered-broadcast-title">
    <header class="waiting-analytics__head">
      <div>
        <h2 id="registered-broadcast-title">{{ t('admin.registered_users.broadcast_title') }}</h2>
        <p>{{ t('admin.registered_users.broadcast_lead') }}</p>
      </div>
      <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" :disabled="loading" @click="loadPreview">
        {{ t('admin.registered_users.broadcast_refresh') }}
      </button>
    </header>

    <p v-if="loading && !preview" role="status">{{ t('admin.registered_users.broadcast_loading') }}</p>
    <p v-else-if="error" role="alert">{{ t('admin.registered_users.broadcast_error') }}</p>

    <template v-else-if="preview">
      <p v-if="!preview.storage_ready" class="waiting-launch-email__warn" role="alert">
        {{ t('admin.registered_users.broadcast_storage_unavailable') }}
      </p>

      <div v-else class="waiting-analytics__summary">
        <div class="waiting-analytics__card">
          <span>{{ t('admin.registered_users.broadcast_eligible') }}</span>
          <strong>{{ preview.eligible }}</strong>
        </div>
        <div class="waiting-analytics__card">
          <span>{{ t('admin.registered_users.broadcast_sent') }}</span>
          <strong>{{ preview.deliveries.sent }}</strong>
        </div>
        <div class="waiting-analytics__card">
          <span>{{ t('admin.registered_users.broadcast_failed') }}</span>
          <strong>{{ preview.deliveries.failed }}</strong>
        </div>
        <div class="waiting-analytics__card">
          <span>{{ t('admin.registered_users.broadcast_skipped') }}</span>
          <strong>{{ skippedTotal }}</strong>
        </div>
      </div>

      <p class="waiting-analytics__note">
        {{ t('admin.registered_users.broadcast_campaign', { key: preview.campaign_key }) }}
      </p>

      <label class="waiting-launch-email__test">
        <span>{{ t('admin.registered_users.broadcast_test_email') }}</span>
        <input v-model.trim="testEmail" type="email" autocomplete="off" :placeholder="t('admin.registered_users.broadcast_test_placeholder')">
      </label>

      <div class="waiting-launch-email__actions">
        <button type="button" class="admin-btn admin-btn--ghost" :disabled="sending" @click="sendTest">
          {{ sending && sendMode === 'test' ? t('admin.registered_users.broadcast_sending') : t('admin.registered_users.broadcast_send_test') }}
        </button>
        <button
          type="button"
          class="admin-btn admin-btn--primary"
          :disabled="sending || !preview.storage_ready || preview.eligible < 1"
          @click="openProductionConfirm"
        >
          {{ t('admin.registered_users.broadcast_send_production') }}
        </button>
      </div>

      <p v-if="sendMessage" :class="sendError ? 'waiting-launch-email__warn' : 'waiting-analytics__note'" role="status">
        {{ sendMessage }}
      </p>
    </template>

    <div v-if="confirmOpen" class="admin-modal-root" role="dialog" aria-modal="true" :aria-label="t('admin.registered_users.broadcast_confirm_title')">
      <div class="admin-modal__backdrop" aria-hidden="true" @click="closeConfirm"></div>
      <div class="admin-modal">
        <header class="admin-modal__head">
          <h2>{{ t('admin.registered_users.broadcast_confirm_title') }}</h2>
        </header>
        <p class="admin-muted">{{ t('admin.registered_users.broadcast_confirm_body', { count: preview?.eligible ?? 0 }) }}</p>
        <label>
          <span>{{ t('admin.registered_users.broadcast_confirm_input') }}</span>
          <input v-model="confirmInput" type="number" min="0" inputmode="numeric">
        </label>
        <div class="admin-form__actions">
          <button type="button" class="admin-btn admin-btn--ghost" @click="closeConfirm">{{ t('admin.cancel') }}</button>
          <button type="button" class="admin-btn admin-btn--danger" :disabled="sending" @click="sendProduction">
            {{ sending ? t('admin.registered_users.broadcast_sending') : t('admin.registered_users.broadcast_confirm_send') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { useI18n } from 'vue-i18n'
import { adminApi } from '../scripts/api/admin'

export default {
  setup() {
    const { t } = useI18n()
    return { t }
  },
  data: () => ({
    preview: null,
    loading: false,
    error: false,
    sending: false,
    sendMode: '',
    sendMessage: '',
    sendError: false,
    testEmail: '',
    confirmOpen: false,
    confirmInput: '',
  }),
  computed: {
    skippedTotal() {
      if (!this.preview?.skipped) return 0
      return Object.values(this.preview.skipped).reduce((sum, n) => sum + Number(n || 0), 0)
    },
  },
  mounted() {
    this.loadPreview()
  },
  methods: {
    async loadPreview() {
      this.loading = true
      this.error = false
      try {
        this.preview = await adminApi.getRegisteredUserBroadcastPreview()
      } catch {
        this.error = true
      } finally {
        this.loading = false
      }
    },
    openProductionConfirm() {
      this.confirmInput = ''
      this.confirmOpen = true
    },
    closeConfirm() {
      if (this.sending) return
      this.confirmOpen = false
    },
    async sendTest() {
      const email = this.testEmail.trim()
      if (!email) {
        this.sendError = true
        this.sendMessage = this.t('admin.registered_users.broadcast_test_required')
        return
      }
      this.sending = true
      this.sendMode = 'test'
      this.sendMessage = ''
      this.sendError = false
      try {
        const result = await adminApi.sendRegisteredUserBroadcastEmail({
          confirm_send: true,
          test_email: email,
        })
        this.sendMessage = this.t('admin.registered_users.broadcast_test_queued', { email })
        this.preview = { ...this.preview, deliveries: result.deliveries }
      } catch {
        this.sendError = true
        this.sendMessage = this.t('admin.registered_users.broadcast_send_error')
      } finally {
        this.sending = false
        this.sendMode = ''
      }
    },
    async sendProduction() {
      const expected = Number(this.preview?.eligible ?? 0)
      if (Number(this.confirmInput) !== expected) {
        this.sendError = true
        this.sendMessage = this.t('admin.registered_users.broadcast_confirm_mismatch')
        return
      }
      this.sending = true
      this.sendMode = 'production'
      this.sendMessage = ''
      this.sendError = false
      try {
        const result = await adminApi.sendRegisteredUserBroadcastEmail({
          confirm_send: true,
          confirm_count: expected,
        })
        this.sendMessage = this.t('admin.registered_users.broadcast_production_queued', { count: result.queued })
        this.confirmOpen = false
        await this.loadPreview()
      } catch {
        this.sendError = true
        this.sendMessage = this.t('admin.registered_users.broadcast_send_error')
      } finally {
        this.sending = false
        this.sendMode = ''
      }
    },
  },
}
</script>

<style scoped>
.waiting-launch-email__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}
.waiting-launch-email__test {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 1rem;
  max-width: 24rem;
}
.waiting-launch-email__test input {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--admin-border, #d8e6dd);
}
.waiting-launch-email__warn {
  color: #9a3412;
  margin: 0.5rem 0 0;
}
</style>
