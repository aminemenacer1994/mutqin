<template>
  <section class="info-page privacy-page privacy-page--document">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker">
            <i class="bi bi-shield-lock" aria-hidden="true"></i>
            {{ t('privacyPolicy.kicker') }}
          </span>
          <h1>{{ t('privacyPolicy.title') }}</h1>
          <p class="privacy-meta">{{ updatedLine }}</p>
        </div>
        <div class="info-header-aside">
          <p>{{ t('privacyPolicy.heroDesc') }}</p>
        </div>
      </header>

      <article class="privacy-document info-reveal" style="--d: 60ms">
        <section
          v-for="(section, index) in sections"
          :key="section.key"
          class="privacy-document__section"
        >
          <h2 :id="`privacy-section-${section.key}`">{{ section.title }}</h2>
          <p>{{ section.body }}</p>
        </section>
      </article>

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
          title: this.t('privacyPolicy.overviewTitle'),
          body: this.t('privacyPolicy.overviewBody'),
        },
        {
          key: 'microphone',
          title: this.t('privacyPolicy.microphoneTitle'),
          body: this.t('privacyPolicy.microphoneBody', { processor }),
        },
        {
          key: 'processor',
          title: this.t('privacyPolicy.processorTitle'),
          body: this.t('privacyPolicy.processorBody', { processor }),
        },
        {
          key: 'retention',
          title: this.t('privacyPolicy.retentionTitle'),
          body: this.retentionBody,
        },
        {
          key: 'account',
          title: this.t('privacyPolicy.accountTitle'),
          body: this.t('privacyPolicy.accountBody'),
        },
        {
          key: 'nonAi',
          title: this.t('privacyPolicy.nonAiTitle'),
          body: this.t('privacyPolicy.nonAiBody'),
        },
      ]
    },
  },
}
</script>

<style src="../styles/info-pages.css"></style>
<style scoped>
.privacy-page--document .info-shell {
  width: min(42rem, calc(100% - clamp(1.5rem, 5vw, 2.5rem)));
}

.privacy-meta {
  margin: 0.5rem 0 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.privacy-document {
  display: grid;
  gap: 0;
  padding: 0.25rem 0 0.5rem;
}

.privacy-document__section {
  padding: 1.15rem 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}

.privacy-document__section:first-child {
  border-top: 0;
  padding-top: 0.35rem;
}

.privacy-document__section h2 {
  margin: 0 0 0.55rem;
  color: var(--text);
  font-size: 1.08rem;
  line-height: 1.35;
  font-weight: 620;
  letter-spacing: -0.02em;
}

.privacy-document__section p {
  margin: 0;
  max-width: 65ch;
  color: var(--text-muted);
  font-size: 0.98rem;
  line-height: 1.65;
  font-weight: 450;
}
</style>
