<template>
  <div class="container-fluid shell referral-page">
    <section class="referral" aria-labelledby="referralTitle">
      <header class="referral__header">
        <h1 id="referralTitle" class="referral__title">{{ t('referral.title') }}</h1>
        <p class="referral__lead">{{ t('referral.lead') }}</p>
      </header>

      <div
        v-if="pendingThanks > 0"
        class="referral__thanks"
        role="status"
      >
        <p class="referral__thanks-copy">{{ t('referral.thanksBody') }}</p>
        <button type="button" class="referral__thanks-btn" @click="acknowledgeThanks">
          {{ t('referral.thanksDismiss') }}
        </button>
      </div>

      <div class="referral__reward" :aria-label="t('referral.rewardTitle')">
        <p class="referral__reward-kicker">{{ t('referral.rewardTitle') }}</p>
        <p class="referral__reward-body">{{ rewardBody }}</p>
        <p class="referral__reward-detail">{{ t('referral.rewardDetail') }}</p>
        <p v-if="rewardActiveUntil" class="referral__reward-active">{{ rewardActiveUntil }}</p>
      </div>

      <div class="referral__how">
        <p class="referral__how-title">{{ t('referral.howTitle') }}</p>
        <ol class="referral__steps">
          <li>{{ t('referral.step1') }}</li>
          <li>{{ t('referral.step2') }}</li>
          <li>{{ step3Label }}</li>
        </ol>
      </div>

      <div class="referral__panel">
        <label class="referral__label" for="referralInviteUrl">{{ t('referral.yourLink') }}</label>
        <div class="referral__link-row">
          <input
            id="referralInviteUrl"
            class="referral__input"
            type="text"
            readonly
            :value="inviteUrl"
            @focus="$event.target.select()"
          >
          <button type="button" class="referral__copy" @click="onCopy">
            {{ copyLabel }}
          </button>
        </div>
        <p class="referral__hint">{{ t('referral.linkHint') }}</p>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { copyToClipboard } from '../scripts/referrals/referralShare.js'
import { PRODUCT_EVENTS, trackProductEvent } from '../scripts/analytics/productEvents.js'

export default {
  name: 'ReferralProgramme',
  props: {
    initial: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const { t } = useI18n()
    const state = reactive({
      code: String(props.initial?.code || ''),
      inviteUrl: String(props.initial?.url || ''),
      apiUrl: String(props.initial?.api_url || '/api/referrals'),
      acknowledgeUrl: String(props.initial?.acknowledge_url || '/api/referrals/acknowledge'),
      needed: Number(props.initial?.reward?.pro_signups_needed || 3),
      complimentaryUntil: props.initial?.reward?.complimentary_pro_until || null,
      pendingThanks: Number(props.initial?.pending_thanks || 0),
    })

    const copied = ref(false)

    const copyLabel = computed(() => (
      copied.value ? t('referral.copied') : t('referral.copyLink')
    ))
    const needed = computed(() => Math.max(1, Number(state.needed || 3)))
    const rewardBody = computed(() => t('referral.rewardBody', { count: needed.value }))
    const step3Label = computed(() => t('referral.step3', { count: needed.value }))
    const rewardActiveUntil = computed(() => {
      const raw = state.complimentaryUntil
      if (!raw) return ''
      try {
        const date = new Date(raw)
        if (Number.isNaN(date.getTime())) return ''
        return t('referral.rewardActiveUntil', {
          date: date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
        })
      } catch {
        return ''
      }
    })

    async function refresh() {
      try {
        const res = await window.axios.get(state.apiUrl)
        const data = res?.data || {}
        state.code = String(data.code || state.code)
        state.inviteUrl = String(data.url || state.inviteUrl)
        state.needed = Number(data.reward?.pro_signups_needed || state.needed)
        state.complimentaryUntil = data.reward?.complimentary_pro_until || null
        state.pendingThanks = Number(data.pending_thanks || 0)
      } catch {
        /* keep SSR bootstrap */
      }
    }

    async function onCopy() {
      const result = await copyToClipboard(state.inviteUrl)
      if (result === 'copied') {
        copied.value = true
        trackProductEvent(PRODUCT_EVENTS.REFERRAL_SHARED, {
          feature_id: 'copy',
          referral_code: state.code,
        }, { onceKey: `referral-share:copy:${state.code}` })
        window.setTimeout(() => { copied.value = false }, 2000)
      }
    }

    async function acknowledgeThanks() {
      try {
        await window.axios.post(state.acknowledgeUrl)
        state.pendingThanks = 0
      } catch {
        state.pendingThanks = 0
      }
    }

    onMounted(() => {
      refresh()
    })

    return {
      t,
      ...toRefs(state),
      copyLabel,
      rewardBody,
      step3Label,
      rewardActiveUntil,
      onCopy,
      acknowledgeThanks,
    }
  },
}
</script>

<style scoped>
.referral-page {
  --referral-ink: var(--text, #1f1a17);
  --referral-muted: var(--text-muted, #554c45);
  --referral-subtle: var(--text-subtle, #6a6158);
  --referral-line: var(--border-strong, var(--border, #d9cbb0));
  --referral-panel: var(--surface, #fff);
  --referral-field: var(--surface-soft, #f3e6d0);
  padding-block: 1.85rem 3rem;
  max-width: 34rem;
  color: var(--referral-ink);
}

.referral {
  display: grid;
  gap: 1.35rem;
}

.referral__header {
  display: grid;
  gap: 0.45rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid color-mix(in srgb, var(--referral-line) 65%, transparent);
}

.referral__title {
  margin: 0;
  font-size: clamp(1.45rem, 2.6vw, 1.8rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.referral__lead {
  margin: 0;
  max-width: 32rem;
  color: var(--referral-muted);
  font-size: 1rem;
  line-height: 1.5;
}

.referral__thanks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.7rem;
  border: 1px solid color-mix(in srgb, var(--success, #2d6a4f) 28%, transparent);
  background: var(--success-soft, rgba(45, 106, 79, 0.14));
  color: var(--success-strong, #245a42);
}

.referral__thanks-copy {
  margin: 0;
  flex: 1 1 14rem;
  font-size: 0.92rem;
  font-weight: 560;
  line-height: 1.4;
}

.referral__thanks-btn {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.16em;
  cursor: pointer;
  padding: 0.2rem 0;
}

.referral__reward {
  display: grid;
  gap: 0.35rem;
  padding: 0.95rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent, #8b5e3c) 28%, var(--referral-line));
  background: color-mix(in srgb, var(--accent-light, rgba(139, 94, 60, 0.12)) 65%, var(--referral-panel));
}

.referral__reward-kicker {
  margin: 0;
  color: var(--accent-strong, #765035);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.referral__reward-body {
  margin: 0;
  color: var(--referral-ink);
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.4;
}

.referral__reward-detail {
  margin: 0;
  color: var(--referral-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.referral__reward-active {
  margin: 0.15rem 0 0;
  color: var(--success-strong, #245a42);
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.35;
}

.referral__how {
  display: grid;
  gap: 0.55rem;
}

.referral__how-title {
  margin: 0;
  color: var(--referral-ink);
  font-size: 0.84rem;
  font-weight: 700;
}

.referral__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.5rem;
  counter-reset: referral-step;
}

.referral__steps li {
  position: relative;
  padding-inline-start: 2.05rem;
  color: var(--referral-muted);
  font-size: 0.92rem;
  line-height: 1.45;
  counter-increment: referral-step;
}

.referral__steps li::before {
  content: counter(referral-step);
  position: absolute;
  inset-inline-start: 0;
  top: 0.05rem;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent, #8b5e3c) 14%, var(--referral-panel));
  color: var(--accent-strong, #765035);
  font-size: 0.72rem;
  font-weight: 700;
}

.referral__panel {
  display: grid;
  gap: 0.4rem;
  padding: 1rem;
  border-radius: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--referral-line) 88%, transparent);
  background: var(--referral-panel);
}

.referral__label {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 650;
}

.referral__link-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.referral__input {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--referral-line) 90%, transparent);
  background: var(--referral-field);
  color: var(--referral-ink);
  padding: 0.7rem 0.85rem;
  font-size: 0.92rem;
}

.referral__input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent, #8b5e3c) 55%, var(--referral-line));
  box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent, #8b5e3c) 45%, transparent));
}

.referral__copy {
  flex: 0 0 auto;
  min-width: 5.5rem;
  border-radius: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--accent, #8b5e3c) 42%, transparent);
  background: linear-gradient(135deg, var(--accent, #8b5e3c), var(--accent-strong, #765035));
  color: #fff;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 650;
  cursor: pointer;
}

.referral__copy:hover {
  filter: brightness(1.04);
}

.referral__copy:focus-visible,
.referral__thanks-btn:focus-visible {
  outline: none;
  box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent, #8b5e3c) 45%, transparent));
}

.referral__hint {
  margin: 0.1rem 0 0;
  color: var(--referral-subtle);
  font-size: 0.84rem;
  line-height: 1.4;
}

:global(html[data-theme='dark']) .referral__copy {
  color: #1f1a17;
}
</style>
