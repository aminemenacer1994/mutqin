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
        <p class="referral__thanks-copy">{{ thanksDetail }}</p>
        <button type="button" class="referral__thanks-btn" @click="acknowledgeThanks">
          {{ t('referral.thanksDismiss') }}
        </button>
      </div>

      <div class="referral__reward" :aria-label="t('referral.rewardTitle')">
        <p class="referral__reward-kicker">{{ t('referral.rewardTitle') }}</p>
        <p class="referral__reward-body">{{ rewardBody }}</p>
        <p class="referral__reward-meta">
          <span>{{ rewardEarnedLabel }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ rewardRemainingLabel }}</span>
        </p>
      </div>

      <ol class="referral__steps" :aria-label="t('referral.howTitle')">
        <li>{{ t('referral.step1') }}</li>
        <li>{{ t('referral.step2') }}</li>
        <li>{{ step3Label }}</li>
      </ol>

      <div class="referral__panel">
        <div class="referral__link">
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
        </div>

        <div class="referral__share" role="group" :aria-label="t('referral.shareLabel')">
          <a
            class="referral__share-btn"
            :href="whatsappHref"
            target="_blank"
            rel="noopener noreferrer"
            @click="trackShare('whatsapp')"
          >
            <i class="bi bi-whatsapp" aria-hidden="true"></i>
            {{ t('referral.shareWhatsapp') }}
          </a>
          <button type="button" class="referral__share-btn" @click="onNativeShare">
            <i class="bi" :class="nativeIcon" aria-hidden="true"></i>
            {{ nativeLabel }}
          </button>
          <a
            v-if="emailHref"
            class="referral__share-btn"
            :href="emailHref"
            @click="trackShare('email')"
          >
            <i class="bi bi-envelope" aria-hidden="true"></i>
            {{ t('referral.shareEmail') }}
          </a>
        </div>
      </div>

      <dl class="referral__stats" :aria-label="t('referral.statsLabel')">
        <div class="referral__stat">
          <dt>{{ t('referral.statVisits') }}</dt>
          <dd>{{ stats.link_visits }}</dd>
        </div>
        <div class="referral__stat">
          <dt>{{ t('referral.statSignups') }}</dt>
          <dd>{{ stats.signups }}</dd>
        </div>
        <div class="referral__stat">
          <dt>{{ t('referral.statActivations') }}</dt>
          <dd>{{ stats.activations }}</dd>
        </div>
        <div class="referral__stat">
          <dt>{{ t('referral.statConversion') }}</dt>
          <dd>{{ conversionLabel }}</dd>
        </div>
      </dl>

      <p class="referral__note">{{ t('referral.privacyNote') }}</p>
    </section>
  </div>
</template>

<script>
import { computed, onMounted, reactive, ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  canUseNativeShare,
  copyToClipboard,
  emailShareHref,
  shareOrCopy,
  whatsappShareHref,
} from '../scripts/referrals/referralShare.js'
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
      stats: {
        link_visits: Number(props.initial?.stats?.link_visits || 0),
        signups: Number(props.initial?.stats?.signups || 0),
        activations: Number(props.initial?.stats?.activations || 0),
        conversion_rate: props.initial?.stats?.conversion_rate ?? null,
      },
      reward: {
        per_activation: Number(props.initial?.reward?.per_activation || 3),
        total_ai_checks_earned: Number(props.initial?.reward?.total_ai_checks_earned || 0),
        bonus_remaining: Number(props.initial?.reward?.bonus_remaining || 0),
      },
      pendingThanks: Number(props.initial?.pending_thanks || 0),
    })

    const copied = ref(false)
    const shared = ref(false)

    const shareText = computed(() => t('referral.shareMessage', { url: state.inviteUrl }))
    const whatsappHref = computed(() => whatsappShareHref(shareText.value, ''))
    const emailHref = computed(() => emailShareHref({
      subject: t('referral.emailSubject'),
      body: shareText.value,
    }))
    const copyLabel = computed(() => (
      copied.value ? t('referral.copied') : t('referral.copyLink')
    ))
    const nativeLabel = computed(() => (
      shared.value ? t('referral.shared') : t('referral.shareNative')
    ))
    const nativeIcon = computed(() => (
      canUseNativeShare() ? 'bi-share' : 'bi-clipboard'
    ))
    const conversionLabel = computed(() => {
      const rate = state.stats.conversion_rate
      if (rate == null || Number.isNaN(Number(rate))) return t('referral.statConversionEmpty')
      return `${Math.round(Number(rate) * 100)}%`
    })
    const perActivation = computed(() => Math.max(0, Number(state.reward.per_activation || 0)))
    const step3Label = computed(() => t('referral.step3', { count: perActivation.value }))
    const rewardBody = computed(() => t('referral.rewardBody', { count: perActivation.value }))
    const rewardEarnedLabel = computed(() => t('referral.rewardEarned', {
      count: state.reward.total_ai_checks_earned,
    }))
    const rewardRemainingLabel = computed(() => t('referral.rewardRemaining', {
      count: state.reward.bonus_remaining,
    }))
    const thanksDetail = computed(() => t('referral.thanksBody', {
      count: perActivation.value,
    }))

    async function refresh() {
      try {
        const res = await window.axios.get(state.apiUrl)
        const data = res?.data || {}
        state.code = String(data.code || state.code)
        state.inviteUrl = String(data.url || state.inviteUrl)
        state.stats.link_visits = Number(data.stats?.link_visits || 0)
        state.stats.signups = Number(data.stats?.signups || 0)
        state.stats.activations = Number(data.stats?.activations || 0)
        state.stats.conversion_rate = data.stats?.conversion_rate ?? null
        state.reward.per_activation = Number(data.reward?.per_activation ?? state.reward.per_activation)
        state.reward.total_ai_checks_earned = Number(data.reward?.total_ai_checks_earned || 0)
        state.reward.bonus_remaining = Number(data.reward?.bonus_remaining || 0)
        state.pendingThanks = Number(data.pending_thanks || 0)
      } catch {
        /* keep SSR bootstrap */
      }
    }

    function trackShare(channel) {
      trackProductEvent(PRODUCT_EVENTS.REFERRAL_SHARED, {
        feature_id: channel,
        referral_code: state.code,
      }, { onceKey: `referral-share:${channel}:${state.code}` })
    }

    async function onCopy() {
      const result = await copyToClipboard(state.inviteUrl)
      if (result === 'copied') {
        copied.value = true
        trackShare('copy')
        window.setTimeout(() => { copied.value = false }, 2000)
      }
    }

    async function onNativeShare() {
      const result = await shareOrCopy({
        title: t('referral.shareTitle'),
        text: shareText.value,
        url: state.inviteUrl,
        clipboardText: state.inviteUrl,
      })
      if (result === 'shared') {
        shared.value = true
        trackShare('native')
        window.setTimeout(() => { shared.value = false }, 2000)
      }
      if (result === 'copied') {
        copied.value = true
        trackShare('copy')
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
      whatsappHref,
      emailHref,
      copyLabel,
      nativeLabel,
      nativeIcon,
      conversionLabel,
      step3Label,
      rewardBody,
      rewardEarnedLabel,
      rewardRemainingLabel,
      thanksDetail,
      onCopy,
      onNativeShare,
      acknowledgeThanks,
      trackShare,
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
  padding-block: 1.75rem 3rem;
  max-width: 38rem;
  color: var(--referral-ink);
}

.referral {
  display: grid;
  gap: 1.35rem;
}

.referral__header {
  display: grid;
  gap: 0.45rem;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid color-mix(in srgb, var(--referral-line) 70%, transparent);
}

.referral__title {
  margin: 0;
  color: var(--referral-ink);
  font-size: clamp(1.45rem, 2.6vw, 1.85rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.referral__lead {
  margin: 0;
  max-width: 34rem;
  color: var(--referral-muted);
  font-size: 0.98rem;
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
  color: inherit;
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

.referral__thanks-btn:hover {
  color: var(--success, #2d6a4f);
}

.referral__reward {
  display: grid;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent, #8b5e3c) 28%, var(--referral-line));
  background: color-mix(in srgb, var(--accent-light, rgba(139, 94, 60, 0.12)) 70%, var(--referral-panel));
}

.referral__reward-kicker {
  margin: 0;
  color: var(--accent-strong, #765035);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.referral__reward-body {
  margin: 0;
  color: var(--referral-ink);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
}

.referral__reward-meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
  color: var(--referral-muted);
  font-size: 0.84rem;
  line-height: 1.35;
}

.referral__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
  counter-reset: referral-step;
}

.referral__steps li {
  position: relative;
  padding-inline-start: 2.1rem;
  color: var(--referral-muted);
  font-size: 0.92rem;
  line-height: 1.4;
  counter-increment: referral-step;
}

.referral__steps li::before {
  content: counter(referral-step);
  position: absolute;
  inset-inline-start: 0;
  top: 0.05rem;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent, #8b5e3c) 16%, var(--referral-panel));
  color: var(--accent-strong, #765035);
  font-size: 0.75rem;
  font-weight: 700;
}

.referral__panel {
  display: grid;
  gap: 1rem;
  padding: 1.05rem 1.05rem 1.1rem;
  border-radius: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--referral-line) 88%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--referral-panel) 92%, var(--accent-light, rgba(139, 94, 60, 0.12))) 0%,
      var(--referral-panel) 42%
    );
}

.referral__label {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--referral-ink);
  font-size: 0.84rem;
  font-weight: 650;
  letter-spacing: 0.01em;
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
  border: 1px solid color-mix(in srgb, var(--referral-line) 92%, transparent);
  background: var(--referral-field);
  color: var(--referral-ink);
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  line-height: 1.35;
}

.referral__input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent, #8b5e3c) 55%, var(--referral-line));
  box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent, #8b5e3c) 45%, transparent));
}

.referral__copy {
  flex: 0 0 auto;
  min-width: 5.25rem;
  border-radius: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--accent, #8b5e3c) 42%, transparent);
  background: linear-gradient(135deg, var(--accent, #8b5e3c), var(--accent-strong, #765035));
  color: #fff;
  padding: 0.6rem 0.95rem;
  font-size: 0.88rem;
  font-weight: 650;
  cursor: pointer;
}

.referral__copy:hover {
  filter: brightness(1.04);
}

.referral__copy:focus-visible,
.referral__share-btn:focus-visible,
.referral__thanks-btn:focus-visible {
  outline: none;
  box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent, #8b5e3c) 45%, transparent));
}

.referral__share {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.referral__share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.35rem;
  border-radius: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--referral-line) 90%, transparent);
  background: color-mix(in srgb, var(--referral-panel) 78%, var(--referral-field));
  color: var(--referral-ink);
  text-decoration: none;
  padding: 0.45rem 0.8rem;
  font-size: 0.88rem;
  font-weight: 560;
  cursor: pointer;
}

.referral__share-btn .bi {
  color: var(--accent-strong, #765035);
  font-size: 1rem;
}

.referral__share-btn:hover {
  border-color: color-mix(in srgb, var(--accent, #8b5e3c) 40%, var(--referral-line));
  background: color-mix(in srgb, var(--accent-light, rgba(139, 94, 60, 0.12)) 55%, var(--referral-panel));
  color: var(--referral-ink);
}

.referral__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--referral-line) 85%, transparent);
  border-radius: 0.85rem;
  overflow: hidden;
  background: var(--referral-panel);
}

.referral__stat {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem 0.95rem;
  border-inline-end: 1px solid color-mix(in srgb, var(--referral-line) 70%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--referral-line) 70%, transparent);
}

.referral__stat:nth-child(2n) {
  border-inline-end: 0;
}

.referral__stat:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.referral__stat dt {
  margin: 0;
  color: var(--referral-subtle);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.referral__stat dd {
  margin: 0;
  color: var(--referral-ink);
  font-size: 1.28rem;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.referral__note {
  margin: 0;
  color: var(--referral-subtle);
  font-size: 0.84rem;
  line-height: 1.45;
}

@media (min-width: 640px) {
  .referral__stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .referral__stat {
    border-bottom: 0;
  }

  .referral__stat:nth-child(2n) {
    border-inline-end: 1px solid color-mix(in srgb, var(--referral-line) 70%, transparent);
  }

  .referral__stat:last-child {
    border-inline-end: 0;
  }
}

:global(html[data-theme='dark']) .referral__copy {
  color: #1f1a17;
}

:global(html[data-theme='dark']) .referral__thanks {
  color: var(--success-strong, #7fbea0);
  border-color: color-mix(in srgb, var(--success, #6aab88) 35%, transparent);
}
</style>
