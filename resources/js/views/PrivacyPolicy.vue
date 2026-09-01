<template>
  <section class="info-page privacy-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker">
            <i class="bi bi-shield-lock" aria-hidden="true"></i>
            {{ t('privacyPolicy.kicker') }}
          </span>
          <h1>{{ t('privacyPolicy.title') }}</h1>
        </div>
        <div class="info-header-aside">
          <p>{{ t('privacyPolicy.heroDesc') }}</p>
          <p class="privacy-meta">{{ updatedLine }}</p>
        </div>
      </header>

      <div class="info-sections">
        <section
          v-for="(section, index) in sections"
          :key="section.key"
          class="info-section info-reveal"
          :style="{ '--d': `${60 + index * 50}ms` }"
        >
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true">
              <i :class="section.icon"></i>
            </div>
            <h2>{{ section.title }}</h2>
          </div>
          <p>{{ section.body }}</p>
        </section>
      </div>

      <nav class="about-more info-reveal" style="--d: 280ms" :aria-label="t('privacyPolicy.relatedLabel')">
        <a href="/" class="info-inline-link">
          <i class="bi bi-house" aria-hidden="true"></i>
          {{ t('privacyPolicy.homeLink') }}
        </a>
        <a href="/about" class="info-inline-link">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          {{ t('privacyPolicy.aboutLink') }}
        </a>
        <a href="mailto:support@mutqin.ai" class="info-inline-link">
          <i class="bi bi-envelope" aria-hidden="true"></i>
          {{ t('privacyPolicy.contactLink') }}
        </a>
      </nav>
    </div>
  </section>
</template>

<script>
function readPrivacyConfig() {
  const raw = typeof window !== 'undefined' ? window.mutqinAudioPrivacy : null
  return {
    policyVersion: String(raw?.policy_version || '2026-09-01'),
    processorName: String(raw?.processor_name || 'Speechmatics'),
    retention: String(raw?.raw_recording_retention || 'temporary'),
    ttlHours: Number(raw?.temporary_ttl_hours) || 24,
  }
}

export default {
  name: 'PrivacyPolicyPage',
  computed: {
    config() {
      return readPrivacyConfig()
    },
    updatedLine() {
      return this.t('privacyPolicy.updated', { version: this.config.policyVersion })
    },
    retentionBody() {
      const mode = this.config.retention
      if (mode === 'never') {
        return this.t('privacyPolicy.retentionNever')
      }
      if (mode === 'retain') {
        return this.t('privacyPolicy.retentionRetain')
      }
      return this.t('privacyPolicy.retentionTemporary', { hours: this.config.ttlHours })
    },
    sections() {
      const processor = this.config.processorName
      return [
        {
          key: 'overview',
          icon: 'bi bi-journal-text',
          title: this.t('privacyPolicy.overviewTitle'),
          body: this.t('privacyPolicy.overviewBody'),
        },
        {
          key: 'microphone',
          icon: 'bi bi-mic',
          title: this.t('privacyPolicy.microphoneTitle'),
          body: this.t('privacyPolicy.microphoneBody', { processor }),
        },
        {
          key: 'processor',
          icon: 'bi bi-broadcast',
          title: this.t('privacyPolicy.processorTitle'),
          body: this.t('privacyPolicy.processorBody', { processor }),
        },
        {
          key: 'retention',
          icon: 'bi bi-hourglass-split',
          title: this.t('privacyPolicy.retentionTitle'),
          body: this.retentionBody,
        },
        {
          key: 'account',
          icon: 'bi bi-person-x',
          title: this.t('privacyPolicy.accountTitle'),
          body: this.t('privacyPolicy.accountBody'),
        },
        {
          key: 'nonAi',
          icon: 'bi bi-book',
          title: this.t('privacyPolicy.nonAiTitle'),
          body: this.t('privacyPolicy.nonAiBody'),
        },
      ]
    },
  },
}
</script>

<style scoped>
.privacy-meta {
  margin-top: 0.65rem;
  opacity: 0.8;
  font-size: 0.9rem;
}
</style>
