<template>
  <section class="info-page about-page">
    <div class="info-shell about-shell">
      <header class="info-header about-hero info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker">
            <i class="bi bi-book-half" aria-hidden="true"></i>
            {{ t('aboutUs.kicker') }}
          </span>
          <h1>{{ t('aboutUs.title') }}</h1>
          <ul class="info-highlights" :aria-label="t('aboutUs.highlightsAria')">
            <li v-for="item in highlights" :key="item.key">
              <i :class="item.icon" aria-hidden="true"></i>
              {{ item.label }}
            </li>
          </ul>
        </div>
        <div class="info-header-aside">
          <p>{{ t('aboutUs.heroDesc') }}</p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" href="/memorisation">
              <i class="bi bi-play-fill" aria-hidden="true"></i>
              {{ t('aboutUs.ctaPrimary') }}
            </a>
            <a class="info-btn info-btn--ghost" href="/our-mission">
              <i class="bi bi-compass" aria-hidden="true"></i>
              {{ t('aboutUs.ctaSecondary') }}
            </a>
          </div>
        </div>
      </header>

      <div class="about-pillars info-reveal" style="--d: 40ms">
        <article
          v-for="(pillar, index) in pillars"
          :key="pillar.key"
          class="about-pillar"
          :style="{ '--d': `${80 + index * 60}ms` }"
        >
          <div class="about-pillar-icon" aria-hidden="true">
            <i :class="pillar.icon"></i>
          </div>
          <div class="about-pillar-copy">
            <h2>{{ pillar.title }}</h2>
            <p>{{ pillar.desc }}</p>
          </div>
        </article>
      </div>

      <div class="about-block">
        <div class="about-block-head info-reveal" style="--d: 60ms">
          <span class="about-eyebrow">{{ t('aboutUs.coreEyebrow') }}</span>
          <h2 class="about-block-title">{{ t('aboutUs.coreTitle') }}</h2>
          <p class="about-block-lead">{{ t('aboutUs.coreLead') }}</p>
        </div>

        <div class="info-sections about-cards">
          <section
            v-for="(card, index) in coreCards"
            :key="card.key"
            class="info-section info-reveal"
            :style="{ '--d': `${100 + index * 60}ms` }"
          >
            <div class="info-section-head">
              <div class="info-icon" aria-hidden="true">
                <i :class="card.icon"></i>
              </div>
              <h3>{{ card.title }}</h3>
            </div>
            <p>{{ card.desc }}</p>
          </section>
        </div>
      </div>

      <div class="about-block about-flow-block">
        <div class="about-block-head info-reveal" style="--d: 80ms">
          <span class="about-eyebrow">{{ t('aboutUs.flowEyebrow') }}</span>
          <h2 class="about-block-title">{{ t('aboutUs.flowTitle') }}</h2>
          <p class="about-block-lead">{{ t('aboutUs.flowLead') }}</p>
        </div>

        <ol class="about-steps" :aria-label="t('aboutUs.flowTitle')">
          <li
            v-for="(step, index) in flowSteps"
            :key="step.key"
            class="about-step info-reveal"
            :style="{ '--d': `${120 + index * 70}ms` }"
          >
            <span class="about-step-index" aria-hidden="true">{{ index + 1 }}</span>
            <div class="about-step-body">
              <div class="about-step-head">
                <i :class="step.icon" aria-hidden="true"></i>
                <h3>{{ step.title }}</h3>
              </div>
              <p>{{ step.desc }}</p>
            </div>
          </li>
        </ol>
      </div>

      <div class="about-block">
        <div class="about-block-head info-reveal" style="--d: 100ms">
          <span class="about-eyebrow">{{ t('aboutUs.stayEyebrow') }}</span>
          <h2 class="about-block-title">{{ t('aboutUs.stayTitle') }}</h2>
          <p class="about-block-lead">{{ t('aboutUs.stayLead') }}</p>
        </div>

        <div class="about-benefits">
          <article
            v-for="(benefit, index) in stayBenefits"
            :key="benefit.key"
            class="about-benefit info-reveal"
            :style="{ '--d': `${140 + index * 60}ms` }"
          >
            <i :class="benefit.icon" aria-hidden="true"></i>
            <p>{{ benefit.desc }}</p>
          </article>
        </div>
      </div>

      <div class="about-closing info-reveal" style="--d: 180ms">
        <blockquote class="about-verse">
          <i class="bi bi-quote about-verse-mark" aria-hidden="true"></i>
          <p>{{ t('aboutUs.verse') }}</p>
          <cite>{{ t('aboutUs.verseRef') }}</cite>
        </blockquote>

        <nav class="about-related" :aria-label="t('aboutUs.exploreTitle')">
          <h2 class="about-related-title">{{ t('aboutUs.exploreTitle') }}</h2>
          <ul>
            <li v-for="link in exploreLinks" :key="link.key">
              <a :href="link.href" class="about-related-link">
                <span class="about-related-icon" aria-hidden="true">
                  <i :class="link.icon"></i>
                </span>
                <span class="about-related-copy">
                  <strong>{{ link.title }}</strong>
                  <span>{{ link.desc }}</span>
                </span>
                <i class="bi bi-arrow-right about-related-arrow" aria-hidden="true"></i>
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div class="info-actions info-reveal" style="--d: 240ms">
        <a class="info-btn info-btn--primary" href="/memorisation">
          <i class="bi bi-play-fill" aria-hidden="true"></i>
          {{ t('aboutUs.ctaPrimary') }}
        </a>
        <a class="info-btn info-btn--ghost" href="/pricing">
          <i class="bi bi-tag" aria-hidden="true"></i>
          {{ t('aboutUs.ctaPricing') }}
        </a>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'AboutUsPage',
  computed: {
    highlights() {
      return [
        { key: 'listen', icon: 'bi bi-earbuds', label: this.t('aboutUs.highlights.listen') },
        { key: 'repeat', icon: 'bi bi-mic', label: this.t('aboutUs.highlights.repeat') },
        { key: 'next', icon: 'bi bi-signpost-2', label: this.t('aboutUs.highlights.nextStep') },
      ];
    },
    pillars() {
      return [
        {
          key: 'flow',
          icon: 'bi bi-water',
          title: this.t('aboutUs.pillars.flowTitle'),
          desc: this.t('aboutUs.pillars.flowDesc'),
        },
        {
          key: 'revision',
          icon: 'bi bi-arrow-repeat',
          title: this.t('aboutUs.pillars.revisionTitle'),
          desc: this.t('aboutUs.pillars.revisionDesc'),
        },
        {
          key: 'consistency',
          icon: 'bi bi-calendar2-check',
          title: this.t('aboutUs.pillars.consistencyTitle'),
          desc: this.t('aboutUs.pillars.consistencyDesc'),
        },
      ];
    },
    coreCards() {
      return [
        {
          key: 'why',
          icon: 'bi bi-lightbulb',
          title: this.t('aboutUs.core.whyTitle'),
          desc: this.t('aboutUs.core.whyDesc'),
        },
        {
          key: 'what',
          icon: 'bi bi-sliders',
          title: this.t('aboutUs.core.whatTitle'),
          desc: this.t('aboutUs.core.whatDesc'),
        },
        {
          key: 'respect',
          icon: 'bi bi-shield-check',
          title: this.t('aboutUs.core.respectTitle'),
          desc: this.t('aboutUs.core.respectDesc'),
        },
      ];
    },
    flowSteps() {
      return [
        {
          key: 'pick',
          icon: 'bi bi-journal-bookmark',
          title: this.t('aboutUs.flow.steps.pickTitle'),
          desc: this.t('aboutUs.flow.steps.pickDesc'),
        },
        {
          key: 'listen',
          icon: 'bi bi-earbuds',
          title: this.t('aboutUs.flow.steps.listenTitle'),
          desc: this.t('aboutUs.flow.steps.listenDesc'),
        },
        {
          key: 'repeat',
          icon: 'bi bi-mic',
          title: this.t('aboutUs.flow.steps.repeatTitle'),
          desc: this.t('aboutUs.flow.steps.repeatDesc'),
        },
        {
          key: 'next',
          icon: 'bi bi-signpost-split',
          title: this.t('aboutUs.flow.steps.nextTitle'),
          desc: this.t('aboutUs.flow.steps.nextDesc'),
        },
      ];
    },
    stayBenefits() {
      return [
        {
          key: 'setup',
          icon: 'bi bi-lightning-charge',
          desc: this.t('aboutUs.stay.setup'),
        },
        {
          key: 'revision',
          icon: 'bi bi-bell',
          desc: this.t('aboutUs.stay.revision'),
        },
        {
          key: 'focus',
          icon: 'bi bi-eye',
          desc: this.t('aboutUs.stay.focus'),
        },
      ];
    },
    exploreLinks() {
      return [
        {
          key: 'mission',
          href: '/our-mission',
          icon: 'bi bi-compass',
          title: this.t('aboutUs.explore.missionTitle'),
          desc: this.t('aboutUs.explore.missionDesc'),
        },
        {
          key: 'pricing',
          href: '/pricing',
          icon: 'bi bi-tag',
          title: this.t('aboutUs.explore.pricingTitle'),
          desc: this.t('aboutUs.explore.pricingDesc'),
        },
        {
          key: 'support',
          href: '/donate',
          icon: 'bi bi-life-preserver',
          title: this.t('aboutUs.explore.supportTitle'),
          desc: this.t('aboutUs.explore.supportDesc'),
        },
      ];
    },
  },
};
</script>
