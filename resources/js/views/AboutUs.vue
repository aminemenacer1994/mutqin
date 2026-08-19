<template>
  <section class="info-page about-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker">
            <i class="bi bi-info-circle" aria-hidden="true"></i>
            {{ t('aboutUs.kicker') }}
          </span>
          <h1>{{ t('aboutUs.title') }}</h1>
        </div>
        <div class="info-header-aside">
          <p>{{ t('aboutUs.heroDesc') }}</p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" href="/our-mission">
              <i class="bi bi-compass" aria-hidden="true"></i>
              {{ t('aboutUs.ctaMission') }}
            </a>
            <a class="info-btn info-btn--ghost" href="/#how-it-works">
              <i class="bi bi-arrow-down-circle" aria-hidden="true"></i>
              {{ t('aboutUs.ctaFeatures') }}
            </a>
          </div>
        </div>
      </header>

      <div class="info-sections">
        <section
          v-for="(card, index) in sections"
          :key="card.key"
          class="info-section info-reveal"
          :style="{ '--d': `${60 + index * 60}ms` }"
        >
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true">
              <i :class="card.icon"></i>
            </div>
            <h2>{{ card.title }}</h2>
          </div>
          <p>{{ card.desc }}</p>
        </section>
      </div>

      <figure class="about-verse info-reveal" style="--d: 240ms">
        <div class="about-verse-mark" aria-hidden="true">۞</div>
        <blockquote lang="ar" dir="rtl" class="about-verse-ar">
          {{ t('aboutUs.verseArabic') }}
        </blockquote>
        <p v-if="showVerseTranslation" class="about-verse-en">{{ t('aboutUs.verse') }}</p>
        <figcaption class="about-verse-ref">{{ t('aboutUs.verseRef') }}</figcaption>
      </figure>

      <nav class="about-more info-reveal" style="--d: 280ms" :aria-label="t('aboutUs.exploreTitle')">
        <a
          v-for="link in moreLinks"
          :key="link.key"
          :href="link.href"
          class="info-inline-link"
        >
          <i :class="link.icon" aria-hidden="true"></i>
          {{ link.label }}
        </a>
      </nav>
    </div>
  </section>
</template>

<script>
export default {
  name: 'AboutUsPage',
  computed: {
    showVerseTranslation() {
      const locale = (typeof window !== 'undefined' && window.mutqinGetLocale?.())
        || document.documentElement.lang
        || 'en';
      return !['ar', 'ur'].includes(locale);
    },
    sections() {
      return [
        {
          key: 'purpose',
          icon: 'bi bi-bookmark-star-fill',
          title: this.t('aboutUs.core.purposeTitle'),
          desc: this.t('aboutUs.core.purposeDesc'),
        },
        {
          key: 'teachers',
          icon: 'bi bi-person-hearts',
          title: this.t('aboutUs.core.teachersTitle'),
          desc: this.t('aboutUs.core.teachersDesc'),
        },
        {
          key: 'limit',
          icon: 'bi bi-shield-check',
          title: this.t('aboutUs.core.limitTitle'),
          desc: this.t('aboutUs.core.limitDesc'),
        },
      ];
    },
    moreLinks() {
      return [
        {
          key: 'home',
          href: '/',
          icon: 'bi bi-house',
          label: this.t('aboutUs.explore.homeTitle'),
        },
        {
          key: 'mission',
          href: '/our-mission',
          icon: 'bi bi-compass',
          label: this.t('aboutUs.explore.missionTitle'),
        },
        {
          key: 'support',
          href: '/donate',
          icon: 'bi bi-life-preserver',
          label: this.t('aboutUs.explore.supportTitle'),
        },
      ];
    },
  },
};
</script>
