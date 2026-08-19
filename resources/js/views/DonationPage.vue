<template>
  <section class="info-page support-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker">
            <i class="bi bi-life-preserver" aria-hidden="true"></i>
            {{ t('donate.kicker') }}
          </span>
          <h1>{{ t('donate.title') }}</h1>
          <ul class="info-highlights" :aria-label="t('donate.highlightsAria')">
            <li><i class="bi bi-rocket-takeoff" aria-hidden="true"></i> {{ t('donate.highlights.start') }}</li>
            <li><i class="bi bi-person-circle" aria-hidden="true"></i> {{ t('donate.highlights.account') }}</li>
            <li><i class="bi bi-chat-dots" aria-hidden="true"></i> {{ t('donate.highlights.contact') }}</li>
          </ul>
        </div>
        <div class="info-header-aside">
          <p>{{ t('donate.heroDesc') }}</p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" href="/#contact">
              <i class="bi bi-envelope" aria-hidden="true"></i> {{ t('donate.ctaContact') }}
            </a>
            <a class="info-btn info-btn--ghost" href="/memorisation">
              <i class="bi bi-play-fill" aria-hidden="true"></i> {{ t('donate.ctaStartPractising') }}
            </a>
          </div>
        </div>
      </header>

      <div class="info-sections">
        <section
          v-for="(section, index) in sections"
          :key="section.key"
          class="info-section info-reveal"
          :style="{ '--d': `${40 + index * 40}ms` }"
        >
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i :class="section.icon"></i></div>
            <h2>{{ section.title }}</h2>
          </div>
          <p>{{ section.desc }}</p>
          <a v-if="section.href" class="info-inline-link" :href="section.href">
            {{ section.link }} <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </a>
        </section>
      </div>

      <div class="info-actions info-reveal" style="--d: 280ms">
        <a class="info-btn info-btn--primary" href="/#contact">
          <i class="bi bi-envelope" aria-hidden="true"></i> {{ t('donate.ctaContact') }}
        </a>
        <a class="info-btn info-btn--ghost" href="/memorisation">
          <i class="bi bi-play-fill" aria-hidden="true"></i> {{ t('donate.ctaStartPractising') }}
        </a>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DonationPage',
  computed: {
    sections() {
      return [
        {
          key: 'gettingStarted',
          icon: 'bi bi-play-circle',
          title: this.t('donate.sections.gettingStarted.title'),
          desc: this.t('donate.sections.gettingStarted.desc'),
          href: '/memorisation',
          link: this.t('donate.sections.gettingStarted.link'),
        },
        {
          key: 'account',
          icon: 'bi bi-person-circle',
          title: this.t('donate.sections.account.title'),
          desc: this.t('donate.sections.account.desc'),
          href: '/login',
          link: this.t('donate.sections.account.link'),
        },
        {
          key: 'session',
          icon: 'bi bi-journal-bookmark',
          title: this.t('donate.sections.session.title'),
          desc: this.t('donate.sections.session.desc'),
        },
        {
          key: 'recitation',
          icon: 'bi bi-mic',
          title: this.t('donate.sections.recitation.title'),
          desc: this.t('donate.sections.recitation.desc'),
        },
        {
          key: 'troubleshooting',
          icon: 'bi bi-tools',
          title: this.t('donate.sections.troubleshooting.title'),
          desc: this.t('donate.sections.troubleshooting.desc'),
        },
        {
          key: 'feedback',
          icon: 'bi bi-chat-heart',
          title: this.t('donate.sections.feedback.title'),
          desc: this.t('donate.sections.feedback.desc'),
          href: '/#contact',
          link: this.t('donate.sections.feedback.link'),
        },
      ];
    },
  },
};
</script>
