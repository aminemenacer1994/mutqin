<template>
  <section class="info-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker">
            <i class="bi bi-compass" aria-hidden="true"></i>
            {{ t('mission.pageKicker') }}
          </span>
          <h1>{{ t('mission.title') }}</h1>
          <ul class="info-highlights" :aria-label="t('mission.highlightsAria')">
            <li><i class="bi bi-flag" aria-hidden="true"></i> {{ t('mission.highlights.begin') }}</li>
            <li><i class="bi bi-arrow-repeat" aria-hidden="true"></i> {{ t('mission.highlights.continue') }}</li>
            <li><i class="bi bi-heart" aria-hidden="true"></i> {{ t('mission.highlights.return') }}</li>
          </ul>
        </div>
        <div class="info-header-aside">
          <p>{{ t('mission.heroDesc') }}</p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" :href="primaryCtaHref" data-public-register="1">
              <i class="bi bi-play-fill" aria-hidden="true"></i> {{ primaryCtaLabel }}
            </a>
            <a class="info-btn info-btn--ghost" href="/#contact">
              <i class="bi bi-life-preserver" aria-hidden="true"></i> {{ t('mission.ctaGetHelp') }}
            </a>
          </div>
        </div>
      </header>

      <div class="info-sections">
        <section
          v-for="(section, index) in sections"
          :key="section.key"
          class="info-section info-reveal"
          :style="{ '--d': `${60 + index * 60}ms` }"
        >
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i :class="section.icon"></i></div>
            <h2>{{ section.title }}</h2>
          </div>
          <p>{{ section.desc }}</p>
        </section>
      </div>

      <div class="info-actions info-reveal" style="--d: 240ms">
        <a class="info-btn info-btn--primary" :href="primaryCtaHref" data-public-register="1">
          <i class="bi bi-play-fill" aria-hidden="true"></i> {{ primaryCtaLabel }}
        </a>
        <a class="info-btn info-btn--ghost" href="/#contact">
          <i class="bi bi-life-preserver" aria-hidden="true"></i> {{ t('mission.ctaGetHelp') }}
        </a>
      </div>
    </div>
  </section>
</template>

<script>
import { publicRegisterHref } from '../scripts/analytics/registerLinks.js';

export default {
  name: 'OurMissionPage',
  computed: {
    isAuthenticated() {
      return typeof window !== 'undefined' && Boolean(window.mutqinAuthCheck);
    },
    primaryCtaHref() {
      if (typeof window !== 'undefined' && window.mutqinRestrictMarketingHost) return '/';
      return this.isAuthenticated ? '/memorisation' : publicRegisterHref();
    },
    primaryCtaLabel() {
      return this.isAuthenticated ? this.t('mission.ctaStartSession') : this.t('homepage.hero.startFree');
    },
    sections() {
      return [
        {
          key: 'practise',
          icon: 'bi bi-bookmark-check',
          title: this.t('mission.sections.practise.title'),
          desc: this.t('mission.sections.practise.desc'),
        },
        {
          key: 'daily',
          icon: 'bi bi-calendar-check',
          title: this.t('mission.sections.daily.title'),
          desc: this.t('mission.sections.daily.desc'),
        },
        {
          key: 'respect',
          icon: 'bi bi-shield-check',
          title: this.t('mission.sections.respect.title'),
          desc: this.t('mission.sections.respect.desc'),
        },
      ];
    },
  },
};
</script>

<style src="../styles/info-pages.css"></style>
