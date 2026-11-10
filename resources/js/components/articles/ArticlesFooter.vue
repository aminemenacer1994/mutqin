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
          <a href="/features">{{ t('homepage.footer.howItWorks') }}</a>
          <a href="/#features">{{ t('homepage.footer.features') }}</a>
          <a href="/pricing">{{ t('homepage.footer.pricing') }}</a>
        </div>
        <div class="footer__links">
          <h3>{{ t('homepage.footer.resources') }}</h3>
          <a v-if="showArticles" href="/articles">{{ t('homepage.footer.articles') }}</a>
          <a href="/about">{{ t('homepage.footer.explanation') }}</a>
        </div>
        <div class="footer__links">
          <h3>{{ t('homepage.footer.company') }}</h3>
          <a href="/#contact">{{ t('homepage.footer.contact') }}</a>
          <a href="/about">{{ t('homepage.footer.aboutUs') }}</a>
          <a href="/privacy">{{ t('homepage.footer.privacy') }}</a>
        </div>
      </div>
      <div class="footer__bottom">
        <p class="footer__tagline">{{ t('homepage.footer.tagline') }}</p>
        <span class="footer__copy">{{ t('homepage.all_rights_reserved') }}</span>
        <nav class="footer__social" :aria-label="t('homepage.footer.connect')">
          <a
            v-for="link in socialLinks"
            :key="link.id"
            class="footer__social-link"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t(`homepage.footer.social.${link.id}`)"
          >
            <i class="bi" :class="link.icon" aria-hidden="true"></i>
          </a>
        </nav>
      </div>
    </div>
  </footer>
</template>

<script>
import { useI18n } from 'vue-i18n'

const socialLinks = [
  { id: 'instagram', href: 'https://www.instagram.com/mutqinai/', icon: 'bi-instagram' },
  { id: 'facebook', href: 'https://www.facebook.com/profile.php?id=61594103506759', icon: 'bi-facebook' },
  { id: 'linkedin', href: 'https://www.linkedin.com/company/146569969/', icon: 'bi-linkedin' },
  { id: 'youtube', href: 'https://www.youtube.com/@Mutqin-w7h', icon: 'bi-youtube' },
]

export default {
  name: 'ArticlesFooter',
  setup() {
    const { t } = useI18n()
    const showArticles = typeof window !== 'undefined' && window.mutqinShowArticles === true
    return { t, socialLinks, showArticles }
  },
}
</script>
