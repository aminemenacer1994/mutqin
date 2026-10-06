<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__grid">
        <div class="footer__brand">
          <div class="footer__logo">
            <i class="bi bi-moon-stars" aria-hidden="true"></i>
            <h2>Mutqin</h2>
          </div>
          <p>{{ t('homepage.focused_quran_memorisation_tools_for_recitation_ch') }}</p>
        </div>
        <div class="footer__links">
          <h3>{{ t('homepage.footer.product') }}</h3>
          <a href="/#how-it-works">{{ t('homepage.footer.howItWorks') }}</a>
          <a href="/#features">{{ t('homepage.footer.features') }}</a>
          <a href="/pricing">{{ t('homepage.footer.pricing') }}</a>
          <a href="/articles">{{ t('homepage.footer.articles') }}</a>
        </div>
        <div class="footer__links">
          <h3>{{ t('homepage.footer.company') }}</h3>
          <a href="/#contact">{{ t('homepage.footer.contact') }}</a>
          <a href="/about">{{ t('homepage.footer.aboutUs') }}</a>
          <a href="/our-mission">{{ t('homepage.footer.ourMission') }}</a>
          <a href="/privacy">{{ t('homepage.footer.privacy') }}</a>
          <a href="/waiting-list">{{ t('homepage.footer.waitlist') }}</a>
        </div>
      </div>
      <div class="footer__bottom">
        <p class="footer__tagline">{{ t('homepage.footer.tagline') }}</p>
        <span class="footer__copy">{{ t('homepage.all_rights_reserved') }}</span>
      </div>
    </div>
  </footer>
</template>

<script>
import { useI18n } from 'vue-i18n'

export default {
  name: 'ArticlesFooter',
  setup() {
    const { t } = useI18n()
    return { t }
  },
}
</script>
