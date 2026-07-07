<template>
  <div class="vue-onboarding" :data-theme="currentTheme">
   

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-layout">
          <div class="hero-copy-column">
            <div class="hero-content" data-aos="fade-up">
              <div class="hero-badge">
                <i class="bi bi-moon-stars"></i> {{ t('homepage.hero.badge') }}
              </div>
              <h1 class="hero-title"><span>{{ t('homepage.hero.title') }}</span></h1>
              <p class="hero-desc">{{ t('homepage.hero.desc') }}</p>
              
              <div class="card problem-solution">
                <p class="problem-text"><i class="bi bi-exclamation-triangle-fill"></i> <strong>{{ t('homepage.hero.problem') }}</strong> {{ t('homepage.hero.problemText') }}</p>
                <div class="solution-highlight">
                  <p class="solution-text"><i class="bi bi-check-lg"></i> <strong>{{ t('homepage.hero.solution') }}</strong> {{ t('homepage.hero.solutionText') }}</p>
                </div>
              </div>
              
              <div class="hero-buttons">
                <a href="/memorisation" class="btn-secondary hero-action-btn"><i class="bi bi-book-half"></i> {{ t('homepage.hero.startFree') }}</a>
                <button @click="scrollToFeatures" class="btn-secondary hero-action-btn"><i class="bi bi-arrow-down"></i> {{ t('homepage.hero.seeFeatures') }}</button>
              </div>
            </div>
          </div>
          <div class="hero-visual-column">
            <div class="hero-image" data-aos="fade-left">
              <div class="card demo-card">
                <i class="bi bi-mic"></i>
                <h3>{{ t('homepage.demo.title') }}</h3>
                <p>{{ t('homepage.demo.quote') }}</p>
                <div class="demo-wave">
                  <i class="bi bi-soundwave"></i>
                  <span>{{ t('homepage.demo.recording') }}</span>
                </div>
              </div>
              <div class="floating-card" v-for="(badge, idx) in floatingBadges" :key="idx" :style="{ animationDelay: `${idx * 0.8}s` }">
                <i :class="badge.icon"></i>
                <span>{{ badge.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- Features Section -->
    <section id="features" class="features-section" ref="featuresSection">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-soundwave"></i> {{ t('homepage.features.kicker') }}</div>
        <h2 class="section-title">{{ t('homepage.features.title') }}</h2>
        <p class="section-subtitle">{{ t('homepage.features.subtitle') }}</p>
        <div class="features-grid row">
          <div class="feature-grid-item col-md-4" v-for="feature in features" :key="feature.id" data-aos="zoom-in">
            <div class="feature-card h-100">
              <div class="feature-topline">
                <div class="feature-icon"><i :class="feature.icon"></i></div>
                <span :class="['feature-badge', feature.badgeType]">{{ feature.badge }}</span>
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
              <strong>{{ feature.result }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- How It Works -->
    <section id="how-it-works" class="steps-section">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-route"></i> {{ t('homepage.steps.kicker') }}</div>
        <h2 class="section-title">{{ t('homepage.steps.title') }}</h2>
        <p class="section-subtitle">{{ t('homepage.steps.subtitle') }}</p>
        <div class="steps-grid">
          <div class="step-grid-item" v-for="(step, idx) in steps" :key="step.id" data-aos="flip-up" :data-aos-delay="idx * 100">
            <div class="step-card h-100">
              <div class="step-head">
                <div class="step-number">0{{ idx + 1 }}</div>
                <i :class="step.icon" class="step-icon"></i>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
              <span>{{ step.microcopy }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- Testimonials -->
    <section id="testimonials" class="testimonials-section">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-chat-heart"></i> {{ t('homepage.testimonials.kicker') }}</div>
        <h2 class="section-title">{{ t('homepage.testimonials.title') }}</h2>
        <div class="testimonials-grid">
          <div class="testimonial-grid-item" v-for="(testimonial, idx) in testimonials" :key="testimonial.id" data-aos="fade-up" :data-aos-delay="idx * 100">
            <div class="testimonial-card h-100">
              <div class="testimonial-rating">
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
              </div>
              <p>"{{ testimonial.quote }}"</p>
              <div class="testimonial-proof">{{ testimonial.proof }}</div>
              <div class="testimonial-author">
                <div class="author-avatar">{{ testimonial.initials }}</div>
                <div class="author-info">
                  <h4>{{ testimonial.author }}</h4>
                  <p>{{ testimonial.role }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section" ref="pricingSection">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-credit-card-2-front"></i> {{ t('homepage.pricing.kicker') }}</div>
        <h2 class="section-title">{{ t('homepage.pricing.title') }}</h2>
        <p class="section-subtitle">{{ t('homepage.start_free_upgrade_only_when_you_need_deeper_recit') }}</p>
        <div class="pricing-grid">
          <!-- Freemium Plan -->
          <div class="pricing-grid-item" data-aos="flip-right">
            <div class="pricing-card h-100">
              <div class="plan-label">{{ t('homepage.pricing.starter') }}</div>
              <div class="pricing-icon"><i class="bi bi-flower1"></i></div>
              <h3>{{ t('homepage.free') }}</h3>
              <div class="price">£0</div>
              <p class="pricing-alt">{{ t('homepage.for_trying_the_workflow') }}</p>
              <ul class="pricing-features">
                <li v-for="(feature, idx) in freeFeatures" :key="`free-${idx}`">
                  <i class="bi bi-check-circle-fill"></i>
                  {{ feature }}
                </li>
              </ul>
              <a href="/register" class="btn-secondary">{{ t('homepage.start_free') }} <i class="bi bi-arrow-right"></i></a>
            </div>
          </div>
          <!-- Premium Plan -->
          <div class="pricing-grid-item" data-aos="flip-left">
            <div class="pricing-card featured h-100">
              <div class="featured-tag"><i class="bi bi-gift-fill"></i> {{ t('homepage.pricing.freeTrial') }}</div>
              <div class="plan-label">{{ t('homepage.most_useful') }}</div>
              <div class="pricing-icon"><i class="bi bi-stars"></i></div>
              <h3>{{ t('homepage.pricing.premium') }}</h3>
              <div class="price">£2.99 <span>{{ t('homepage.pricing.perMonth') }}</span></div>
              <p class="pricing-alt">{{ t('homepage.pricing.premiumYearly') }}</p>
              <ul class="pricing-features">
                <li v-for="(feature, idx) in premiumFeatures" :key="`premium-${idx}`">
                  <i class="bi bi-check-circle-fill"></i> {{ feature }}
                </li>
              </ul>
              <div class="pricing-actions">
                <form method="POST" action="/checkout">
                  <input type="hidden" name="_token" :value="csrfToken">
                  <input type="hidden" name="plan" value="premium_monthly">
                  <button type="submit" class="btn-primary">{{ t('homepage.pricing.monthly') }} <i class="bi bi-gift-fill"></i></button>
                </form>
                <form method="POST" action="/checkout">
                  <input type="hidden" name="_token" :value="csrfToken">
                  <input type="hidden" name="plan" value="premium_yearly">
                  <button type="submit" class="btn-secondary">{{ t('homepage.pricing.yearly') }} <i class="bi bi-calendar-check"></i></button>
                </form>
              </div>
            </div>
          </div>
          <!-- Pro Plan -->
          <div class="pricing-grid-item" data-aos="flip-left">
            <div class="pricing-card h-100">
              <div class="featured-tag"><i class="bi bi-gift-fill"></i> {{ t('homepage.pricing.freeTrial') }}</div>
              <div class="plan-label">{{ t('homepage.teacher_ready') }}</div>
              <div class="pricing-icon"><i class="bi bi-gem"></i></div>
              <h3>{{ t('homepage.pro') }}</h3>
              <div class="price">£5.99 <span>{{ t('homepage.pricing.perMonth') }}</span></div>
              <p class="pricing-alt">{{ t('homepage.pricing.proYearly') }}</p>
              <ul class="pricing-features">
                <li v-for="(feature, idx) in proFeatures" :key="`pro-${idx}`">
                  <i class="bi bi-check-circle-fill"></i> {{ feature }}
                </li>
              </ul>
              <div class="pricing-actions">
                <form method="POST" action="/checkout">
                  <input type="hidden" name="_token" :value="csrfToken">
                  <input type="hidden" name="plan" value="pro_monthly">
                  <button type="submit" class="btn-primary">{{ t('homepage.pricing.monthly') }} <i class="bi bi-gem"></i></button>
                </form>
                <form method="POST" action="/checkout">
                  <input type="hidden" name="_token" :value="csrfToken">
                  <input type="hidden" name="plan" value="pro_yearly">
                  <button type="submit" class="btn-secondary">{{ t('homepage.pricing.yearly') }} <i class="bi bi-calendar-check"></i></button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div class="pricing-comparison">
          <div class="comparison-header">
            <h3>{{ t('homepage.feature_comparison') }}</h3>
            <p>{{ t('homepage.everything_included_in_each_subscription_at_a_glan') }}</p>
          </div>
          <div class="comparison-table-wrap">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>{{ t('homepage.pricing.featureColumn') }}</th>
                  <th>{{ t('homepage.free') }}</th>
                  <th>{{ t('homepage.pricing.premium') }}</th>
                  <th>{{ t('homepage.pro') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparisonRows" :key="row.id">
                  <th scope="row">{{ row.feature }}</th>
                  <td>
                    <span :class="comparisonValueClass(row.free)">
                      <i v-if="comparisonCell(row.free).icon" class="bi" :class="comparisonCell(row.free).icon" aria-hidden="true"></i>
                      <span v-if="comparisonCell(row.free).label">{{ comparisonCell(row.free).label }}</span>
                    </span>
                  </td>
                  <td>
                    <span :class="comparisonValueClass(row.premium)">
                      <i v-if="comparisonCell(row.premium).icon" class="bi" :class="comparisonCell(row.premium).icon" aria-hidden="true"></i>
                      <span v-if="comparisonCell(row.premium).label">{{ comparisonCell(row.premium).label }}</span>
                    </span>
                  </td>
                  <td>
                    <span :class="comparisonValueClass(row.pro)">
                      <i v-if="comparisonCell(row.pro).icon" class="bi" :class="comparisonCell(row.pro).icon" aria-hidden="true"></i>
                      <span v-if="comparisonCell(row.pro).label">{{ comparisonCell(row.pro).label }}</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <section id="faq" class="faq-section">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-question-circle"></i> {{ t('homepage.faq.kicker') }}</div>
        <h2 class="section-title">{{ t('homepage.faq.title') }}</h2>
        <p class="section-subtitle">{{ t('homepage.a_quick_overview_of_how_mutqin_supports_recitation') }}</p>
        <div class="faq-shell" data-aos="fade-up">
          <div class="accordion faq-accordion" id="homepageFaq">
            <div class="accordion-item" v-for="(item, idx) in faqItems" :key="item.id">
              <h3 class="accordion-header" :id="`faq-heading-${idx}`">
                <button
                  class="accordion-button"
                  :class="{ collapsed: idx !== 0 }"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="`#faq-panel-${idx}`"
                  :aria-expanded="idx === 0 ? 'true' : 'false'"
                  :aria-controls="`faq-panel-${idx}`"
                >
                  {{ item.question }}
                </button>
              </h3>
              <div
                :id="`faq-panel-${idx}`"
                class="accordion-collapse collapse"
                :class="{ show: idx === 0 }"
                :aria-labelledby="`faq-heading-${idx}`"
                data-bs-parent="#homepageFaq"
              >
                <div class="accordion-body">
                  {{ item.answer }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <section id="contact" class="contact-section">
      <div class="section-container">
        <div class="contact-grid">
          <div class="contact-copy-column">
            <div class="contact-copy" data-aos="fade-up">
              <h2 class="section-title section-title-left">{{ t('homepage.contact.title') }}</h2>
              <p class="section-subtitle section-subtitle-left">{{ t('homepage.contact.extendedSubtitle') }}</p>
            </div>
          </div>
          <div class="contact-form-column">
            <div class="contact-card" data-aos="fade-up">
              <div v-if="contactStatus.message" class="contact-alert" :class="contactStatus.type === 'success' ? 'contact-alert-success' : 'contact-alert-error'" role="alert">
                {{ contactStatus.message }}
              </div>
              <form class="contact-form" @submit.prevent="submitContact">
                <div class="contact-form-grid">
                  <div class="contact-field">
                    <label class="form-label" for="contactName">{{ t('homepage.name') }}</label>
                    <input id="contactName" v-model.trim="contactForm.name" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.name }" autocomplete="name">
                    <div v-if="contactErrors.name" class="invalid-feedback d-block">{{ contactErrors.name }}</div>
                  </div>
                  <div class="contact-field">
                    <label class="form-label" for="contactEmail">{{ t('homepage.contact.email') }}</label>
                    <input id="contactEmail" v-model.trim="contactForm.email" type="email" class="form-control" :class="{ 'is-invalid': contactErrors.email }" autocomplete="email">
                    <div v-if="contactErrors.email" class="invalid-feedback d-block">{{ contactErrors.email }}</div>
                  </div>
                </div>
                <div>
                  <label class="form-label" for="contactSubject">{{ t('homepage.contact.subject') }}</label>
                  <input id="contactSubject" v-model.trim="contactForm.subject" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.subject }" autocomplete="off" required>
                  <div v-if="contactErrors.subject" class="invalid-feedback d-block">{{ contactErrors.subject }}</div>
                </div>
                <div>
                  <label class="form-label" for="contactMessage">{{ t('homepage.contact.message') }}</label>
                  <textarea id="contactMessage" v-model.trim="contactForm.message" class="form-control contact-textarea" :class="{ 'is-invalid': contactErrors.message }" rows="6"></textarea>
                  <div v-if="contactErrors.message" class="invalid-feedback d-block">{{ contactErrors.message }}</div>
                </div>
                <button type="submit" class="btn-primary contact-submit" :disabled="contactSubmitting">
                  <i class="bi" :class="contactSubmitting ? 'bi-arrow-repeat spin-icon' : 'bi-send'"></i>
                  {{ contactSubmitting ? t('homepage.contact.sending') : t('homepage.contact.sendMessage') }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <div class="cta-block">
      <div class="cta-layout">
        <div class="cta-copy-column">
          <div class="cta-copy">
            <div class="cta-icon"><i class="bi bi-heart-fill"></i></div>
            <h2>{{ t('homepage.cta.title') }}</h2>
            <p>{{ t('homepage.record_a_verse_review_the_highlighted_issues_and_k') }}</p>
          </div>
        </div>
        <div class="cta-actions-column">
          <div class="cta-actions">
            <a href="/register" class="btn-primary"><i class="bi bi-person-badge"></i> {{ t('homepage.cta.button') }}</a>
            <span>{{ t('homepage.cta.note') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer - full width, bottom fixed position -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div class="footer-brand-column">
            <div class="footer-brand">
              <div class="footer-logo">
                <i class="bi bi-moon-stars"></i>
                <h3>Mutqin</h3>
              </div>
              <p>{{ t('homepage.focused_quran_memorisation_tools_for_recitation_ch') }}</p>
            </div>
          </div>
          <div class="footer-link-column">
            <div class="footer-links">
              <h4><i class="bi bi-grid-3x3-gap-fill"></i> {{ t('homepage.footer.product') }}</h4>
              <a href="#features" @click.prevent="scrollToFeatures"><i class="bi bi-mic"></i> {{ t('homepage.footer.features') }}</a>
              <a href="#pricing" @click.prevent="scrollToPricing"><i class="bi bi-tag-fill"></i> {{ t('homepage.footer.pricing') }}</a>
              <a href="#"><i class="bi bi-compass"></i> {{ t('homepage.roadmap') }}</a>
            </div>
          </div>
          <div class="footer-link-column">
            <div class="footer-links">
              <h4><i class="bi bi-book-half"></i> {{ t('homepage.footer.resources') }}</h4>
              <a href="#"><i class="bi bi-pen-fill"></i> {{ t('homepage.tajweed_guide') }}</a>
              <a href="#"><i class="bi bi-lightbulb-fill"></i> {{ t('homepage.memorization_tips') }}</a>
              <a href="#"><i class="bi bi-question-circle"></i> {{ t('homepage.help_center') }}</a>
            </div>
          </div>
          <div class="footer-link-column">
            <div class="footer-links">
              <h4><i class="bi bi-building"></i> {{ t('homepage.footer.company') }}</h4>
              <a href="/about-us"><i class="bi bi-info-circle-fill"></i> {{ t('homepage.footer.aboutUs') }}</a>
              <a href="#contact" @click.prevent="document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"><i class="bi bi-chat-dots-fill"></i> {{ t('homepage.footer.contact') }}</a>
              <a href="/our-mission"><i class="bi bi-heart"></i> {{ t('mission.kicker') }}</a>
            </div>
          </div>
          <div class="footer-social-column">
            <div class="footer-social">
              <h4><i class="bi bi-share-fill"></i> {{ t('homepage.footer.connect') }}</h4>
              <div class="social-icons">
                <a href="#" aria-label="Twitter"><i class="bi bi-twitter-x"></i></a>
                <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
                <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
                <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
              </div>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p><i class="bi bi-c-circle"></i> {{ t('homepage.footer.tagline') }}</p>
          <div class="footer-legal">
            <a href="#">{{ t('homepage.footer.privacy') }}</a>
            <a href="#">{{ t('homepage.footer.terms') }}</a>
            <a href="#">{{ t('homepage.all_rights_reserved') }}</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { reactive, ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'OnboardingPage',
  setup() {
    const { t } = useI18n();
    // Theme management
    const currentTheme = ref('light');
    
    const setTheme = (theme) => {
      const normalizedTheme = ['dark', 'sepia'].includes(theme) ? theme : 'light';
      currentTheme.value = normalizedTheme;
      localStorage.setItem('mutqin-theme', normalizedTheme);
      document.documentElement.setAttribute('data-theme', normalizedTheme);
    };
    
    const loadTheme = () => {
      const saved = localStorage.getItem('mutqin-theme');
      if (saved && ['light', 'dark', 'sepia'].includes(saved)) {
        currentTheme.value = saved;
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        setTheme(document.documentElement.getAttribute('data-theme') || 'light');
      }
    };
    
    // Refs for scroll tracking
    const featuresSection = ref(null);
    const pricingSection = ref(null);
    
    // Scroll methods
    const scrollToFeatures = () => {
      featuresSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    
    const scrollToPricing = () => {
      pricingSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');

    const comparisonValueClass = (value) => {
      if (value === true) return 'comparison-value comparison-value-included comparison-value-icon';
      if (value === false) return 'comparison-value comparison-value-excluded comparison-value-icon';
      return 'comparison-value comparison-value-limited';
    };

    const comparisonCell = (value) => {
      if (value === true) return { icon: 'bi-check-lg', label: '' };
      if (value === false) return { icon: 'bi-x-lg', label: '' };
      return { icon: '', label: String(value ?? '') };
    };

    const contactForm = reactive({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    const contactErrors = reactive({});
    const contactStatus = reactive({
      type: '',
      message: ''
    });
    const contactSubmitting = ref(false);

    const resetContactFeedback = () => {
      Object.keys(contactErrors).forEach((key) => delete contactErrors[key]);
      contactStatus.type = '';
      contactStatus.message = '';
    };

    const badgeLabel = (badge) => {
      if (badge === 'pro') return t('homepage.badge.pro');
      if (badge === 'freeLimited') return t('homepage.badge.freeLimited');
      return t('homepage.badge.free');
    };

    const validateContact = () => {
      resetContactFeedback();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!contactForm.name) contactErrors.name = t('homepage.contact.errors.name');
      if (!contactForm.email) {
        contactErrors.email = t('homepage.contact.errors.email');
      } else if (!emailPattern.test(contactForm.email)) {
        contactErrors.email = t('homepage.contact.errors.emailInvalid');
      }
      if (!contactForm.subject) contactErrors.subject = t('homepage.contact.errors.subject');
      if (!contactForm.message) contactErrors.message = t('homepage.contact.errors.message');

      return Object.keys(contactErrors).length === 0;
    };

    const submitContact = async () => {
      if (!validateContact()) return;

      contactSubmitting.value = true;

      try {
        await window.axios.post('/api/contact', {
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject,
          message: contactForm.message
        });

        contactStatus.type = 'success';
        contactStatus.message = t('homepage.contact.success');
        contactForm.name = '';
        contactForm.email = '';
        contactForm.subject = '';
        contactForm.message = '';
      } catch (error) {
        const validationErrors = error?.response?.data?.errors || {};
        Object.entries(validationErrors).forEach(([field, messages]) => {
          contactErrors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        contactStatus.type = 'error';
        contactStatus.message = Object.keys(validationErrors).length
          ? t('homepage.contact.errorFields')
          : t('homepage.contact.errorSend');
      } finally {
        contactSubmitting.value = false;
      }
    };

    const floatingBadges = computed(() => [
      { icon: 'bi bi-check-circle-fill', text: t('homepage.floatingBadges.tajweedScore') },
      { icon: 'bi bi-graph-up', text: t('homepage.floatingBadges.weakVerses') },
      { icon: 'bi bi-star-fill', text: t('homepage.floatingBadges.dailyMinutes') }
    ]);

    const features = computed(() => [
      { id: 'recitationReview', icon: 'bi bi-mic-fill', title: t('homepage.features.items.recitationReview.title'), badge: badgeLabel('free'), badgeType: '', description: t('homepage.features.items.recitationReview.description'), result: t('homepage.features.items.recitationReview.result') },
      { id: 'smartMemorisation', icon: 'bi bi-lightning-charge-fill', title: t('homepage.features.items.smartMemorisation.title'), badge: badgeLabel('pro'), badgeType: 'pro', description: t('homepage.features.items.smartMemorisation.description'), result: t('homepage.features.items.smartMemorisation.result') },
      { id: 'stackedMushaf', icon: 'bi bi-journal-bookmark-fill', title: t('homepage.features.items.stackedMushaf.title'), badge: badgeLabel('free'), badgeType: '', description: t('homepage.features.items.stackedMushaf.description'), result: t('homepage.features.items.stackedMushaf.result') },
      { id: 'transitionTraining', icon: 'bi bi-link-45deg', title: t('homepage.features.items.transitionTraining.title'), badge: badgeLabel('pro'), badgeType: 'pro', description: t('homepage.features.items.transitionTraining.description'), result: t('homepage.features.items.transitionTraining.result') },
      { id: 'recordingLibrary', icon: 'bi bi-collection-play', title: t('homepage.features.items.recordingLibrary.title'), badge: badgeLabel('freeLimited'), badgeType: '', description: t('homepage.features.items.recordingLibrary.description'), result: t('homepage.features.items.recordingLibrary.result') },
      { id: 'reviewAnalytics', icon: 'bi bi-graph-up-arrow', title: t('homepage.features.items.reviewAnalytics.title'), badge: badgeLabel('pro'), badgeType: 'pro', description: t('homepage.features.items.reviewAnalytics.description'), result: t('homepage.features.items.reviewAnalytics.result') }
    ]);

    const steps = computed(() => [
      { id: 'record', title: t('homepage.steps.items.record.title'), description: t('homepage.steps.items.record.description'), icon: 'bi bi-mic-fill', microcopy: t('homepage.steps.items.record.microcopy') },
      { id: 'review', title: t('homepage.steps.items.review.title'), description: t('homepage.steps.items.review.description'), icon: 'bi bi-stars', microcopy: t('homepage.steps.items.review.microcopy') },
      { id: 'repeat', title: t('homepage.steps.items.repeat.title'), description: t('homepage.steps.items.repeat.description'), icon: 'bi bi-arrow-repeat', microcopy: t('homepage.steps.items.repeat.microcopy') }
    ]);

    const testimonials = computed(() => [
      { id: 'abdullah', quote: t('homepage.testimonials.items.abdullah.quote'), proof: t('homepage.testimonials.items.abdullah.proof'), author: t('homepage.testimonials.items.abdullah.author'), role: t('homepage.testimonials.items.abdullah.role'), initials: t('homepage.testimonials.items.abdullah.initials') },
      { id: 'fatima', quote: t('homepage.testimonials.items.fatima.quote'), proof: t('homepage.testimonials.items.fatima.proof'), author: t('homepage.testimonials.items.fatima.author'), role: t('homepage.testimonials.items.fatima.role'), initials: t('homepage.testimonials.items.fatima.initials') },
      { id: 'hisham', quote: t('homepage.testimonials.items.hisham.quote'), proof: t('homepage.testimonials.items.hisham.proof'), author: t('homepage.testimonials.items.hisham.author'), role: t('homepage.testimonials.items.hisham.role'), initials: t('homepage.testimonials.items.hisham.initials') }
    ]);

    const faqItems = computed(() => [
      { id: 'whatIsMutqin', question: t('homepage.faq.items.whatIsMutqin.question'), answer: t('homepage.faq.items.whatIsMutqin.answer') },
      { id: 'howMemorisation', question: t('homepage.faq.items.howMemorisation.question'), answer: t('homepage.faq.items.howMemorisation.answer') },
      { id: 'howAiFeedback', question: t('homepage.faq.items.howAiFeedback.question'), answer: t('homepage.faq.items.howAiFeedback.answer') },
      { id: 'whatIsPro', question: t('homepage.faq.items.whatIsPro.question'), answer: t('homepage.faq.items.whatIsPro.answer') },
      { id: 'howRevision', question: t('homepage.faq.items.howRevision.question'), answer: t('homepage.faq.items.howRevision.answer') }
    ]);

    const freeFeatures = computed(() => [
      t('homepage.planFeatures.sessionSetup'),
      t('homepage.planFeatures.savedSessions3'),
      t('homepage.planFeatures.basicAnalytics'),
      t('homepage.planFeatures.focusMode')
    ]);

    const premiumFeatures = computed(() => [
      t('homepage.planFeatures.sessionSetup'),
      t('homepage.planFeatures.savedSessions5'),
      t('homepage.planFeatures.focusMode'),
      t('homepage.planFeatures.blurringMethod'),
      t('homepage.planFeatures.chainingMethod'),
      t('homepage.planFeatures.anchorMode'),
      t('homepage.planFeatures.basicAnalytics'),
      t('homepage.planFeatures.manualSelfAssessment'),
      // t('homepage.planFeatures.hifzPlan'),
      // t('homepage.planFeatures.spacedRetention'),
      // t('homepage.planFeatures.adaptiveRevision'),
      // t('homepage.planFeatures.progressTracking')
    ]);

    const proFeatures = computed(() => [
      t('homepage.planFeatures.sessionSetup'),
      t('homepage.planFeatures.savedSessionsUnlimited'),
      t('homepage.planFeatures.allTechniques'),
      t('homepage.planFeatures.aiRecitation'),
      t('homepage.planFeatures.aiMemorisationChecker'),
      t('homepage.planFeatures.manualSelfAssessmentPlus'),
      t('homepage.planFeatures.advancedAnalysis'),
      t('homepage.planFeatures.offlineDownloads'),
      // t('homepage.planFeatures.hifzPlan'),
      // t('homepage.planFeatures.spacedRetention'),
      // t('homepage.planFeatures.voiceHifzBuilder'),
      // t('homepage.planFeatures.adaptiveRevision'),
      // t('homepage.planFeatures.progressTracking')
    ]);

    const comparisonRows = computed(() => [
      { id: 'sessionSetup', feature: t('homepage.comparison.sessionSetup'), free: true, premium: true, pro: true },
      { id: 'savedSessions', feature: t('homepage.comparison.savedSessions'), free: '3', premium: '5', pro: t('homepage.comparison.unlimited') },
      { id: 'layouts', feature: t('homepage.comparison.layouts'), free: true, premium: true, pro: true },
      { id: 'focusMode', feature: t('homepage.comparison.focusMode'), free: true, premium: true, pro: true },
      { id: 'blurMethod', feature: t('homepage.comparison.blurMethod'), free: false, premium: true, pro: true },
      { id: 'chainingPractice', feature: t('homepage.comparison.chainingPractice'), free: false, premium: true, pro: true },
      { id: 'anchorMode', feature: t('homepage.comparison.anchorMode'), free: false, premium: true, pro: true },
      { id: 'manualRecording', feature: t('homepage.comparison.manualRecording'), free: false, premium: true, pro: true },
      { id: 'aiRecitationReview', feature: t('homepage.comparison.aiRecitationReview'), free: false, premium: false, pro: true },
      // { id: 'aiMemorisationChecker', feature: t('homepage.comparison.aiMemorisationChecker'), free: false, premium: false, pro: true },
      // { id: 'hifzPlan', feature: t('homepage.comparison.hifzPlan'), free: false, premium: true, pro: true },
      // { id: 'spacedRetention', feature: t('homepage.comparison.spacedRetention'), free: false, premium: true, pro: true },
      // { id: 'voiceHifzBuilder', feature: t('homepage.comparison.voiceHifzBuilder'), free: false, premium: false, pro: true },
      // { id: 'adaptiveRevision', feature: t('homepage.comparison.adaptiveRevision'), free: false, premium: true, pro: true },
      // { id: 'progressTracking', feature: t('homepage.comparison.progressTracking'), free: true, premium: true, pro: true },
      // { id: 'advancedAnalytics', feature: t('homepage.comparison.advancedAnalytics'), free: false, premium: false, pro: true },
      { id: 'offlineDownloads', feature: t('homepage.comparison.offlineDownloads'), free: false, premium: false, pro: true }
    ]);
    
    // Intersection Observer for animations
    const observerOptions = { threshold: 0.3, rootMargin: '0px' };
    
    onMounted(() => {
      loadTheme();
      
      // Animate elements when they come into view
      const animatedElements = document.querySelectorAll('[data-aos]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);
      
      animatedElements.forEach(el => observer.observe(el));
    });
    
    return {
      t,
      currentTheme,
      csrfToken,
      setTheme,
      featuresSection,
      pricingSection,
      scrollToFeatures,
      scrollToPricing,
      comparisonValueClass,
      comparisonCell,
      floatingBadges,
      features,
      steps,
      testimonials,
      faqItems,
      freeFeatures,
      premiumFeatures,
      proFeatures,
      comparisonRows,
      contactForm,
      contactErrors,
      contactStatus,
      contactSubmitting,
      submitContact
    };
  }
};
</script>

<style src="./Homepage.css"></style>
