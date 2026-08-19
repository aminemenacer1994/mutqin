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
            <a class="info-btn info-btn--primary" href="/memorisation">
              <i class="bi bi-play-fill" aria-hidden="true"></i> {{ t('mission.ctaStartSession') }}
            </a>
            <a class="info-btn info-btn--ghost" href="/donate">
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
        <a class="info-btn info-btn--primary" href="/memorisation">
          <i class="bi bi-play-fill" aria-hidden="true"></i> {{ t('mission.ctaStartSession') }}
        </a>
        <a class="info-btn info-btn--ghost" href="/donate">
          <i class="bi bi-life-preserver" aria-hidden="true"></i> {{ t('mission.ctaGetHelp') }}
        </a>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'OurMissionPage',
  computed: {
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
