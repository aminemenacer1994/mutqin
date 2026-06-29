<template>
  <div class="vue-onboarding" :data-theme="currentTheme">
   

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content" data-aos="fade-up">
          <div class="hero-badge">
            <i class="bi bi-moon-stars"></i> AI-Powered Quran Learning
          </div>
          <h1 class="hero-title"><span>Memorise the Quran with a calmer, sharper practice loop.</span></h1>
          <p class="hero-desc">Mutqin brings your ayahs, recordings, AI checks, revision flow, and weak-spot insights into one focused workspace so every session ends with a clear next step.</p>
          
          <div class="problem-solution">
            <p class="problem-text"><i class="bi bi-exclamation-triangle-fill"></i> <strong>The problem:</strong> Memorisation breaks down when weak ayahs, recordings, and review plans live in separate places.</p>
            <div class="solution-highlight">
              <p class="solution-text"><i class="bi bi-check-lg"></i> <strong>The solution:</strong> Practise in small ranges, check recitation and recall, then review the exact ayahs that need attention.</p>
            </div>
          </div>
          
          <div class="hero-buttons">
            <a href="/memorisation" class="btn-secondary hero-action-btn"><i class="bi bi-book-half"></i> Start Free</a>
            <button @click="scrollToFeatures" class="btn-secondary hero-action-btn"><i class="bi bi-arrow-down"></i> See Features</button>
          </div>
          
        </div>
        
        <div class="hero-image" data-aos="fade-left">
          <div class="demo-card">
            <i class="bi bi-mic"></i>
            <h3>Live AI Analysis</h3>
            <p>"Ikhfa' weak — hold nasalization 2 beats."</p>
            <div class="demo-wave">
              <i class="bi bi-soundwave"></i>
              <span>Recording... → 96% accuracy</span>
            </div>
          </div>
          <div class="floating-card" v-for="(badge, idx) in floatingBadges" :key="idx" :style="{ animationDelay: `${idx * 0.8}s` }">
            <i :class="badge.icon"></i>
            <span>{{ badge.text }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- Features Section -->
    <section id="features" class="features-section" ref="featuresSection">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-soundwave"></i> Built for daily recitation</div>
        <h2 class="section-title">Everything you need to master recitation</h2>
        <p class="section-subtitle">From first recording to long-term revision, each tool closes a real feedback gap.</p>
        <div class="features-grid">
          <div class="feature-card" v-for="feature in features" :key="feature.title" data-aos="zoom-in">
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
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- How It Works -->
    <section id="how-it-works" class="steps-section">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-route"></i> The practice loop</div>
        <h2 class="section-title">Three steps to fluent recitation</h2>
        <p class="section-subtitle">A short loop you can repeat every day: recite, diagnose, review exactly what needs work.</p>
        <div class="steps-grid">
          <div class="step-card" v-for="(step, idx) in steps" :key="idx" data-aos="flip-up" :data-aos-delay="idx * 100">
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
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- Testimonials -->
    <section id="testimonials" class="testimonials-section">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-chat-heart"></i> Real learning signals</div>
        <h2 class="section-title">Trusted by focused students and teachers</h2>
        <div class="testimonials-grid">
          <div class="testimonial-card" v-for="(testimonial, idx) in testimonials" :key="idx" data-aos="fade-up" :data-aos-delay="idx * 100">
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
    </section>

    <div class="divider section-divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section" ref="pricingSection">
      <div class="section-container">
        <div class="section-kicker"><i class="bi bi-credit-card-2-front"></i> Pricing that scales with practice</div>
        <h2 class="section-title">Simple, transparent pricing</h2>
        <p class="section-subtitle">Start free. Upgrade only when you need deeper recitation feedback, history, and coaching tools.</p>
        <div class="pricing-grid">
          <!-- Freemium Plan -->
          <div class="pricing-card" data-aos="flip-right">
            <div class="plan-label">Starter</div>
            <div class="pricing-icon"><i class="bi bi-flower1"></i></div>
            <h3>Free</h3>
            <div class="price">£0</div>
            <p class="pricing-alt">For trying the workflow</p>
            <ul class="pricing-features">
              <li v-for="feature in freeFeatures" :key="feature">
                <i class="bi bi-check-circle-fill"></i>
                {{ feature }}
              </li>
            </ul>
            <a href="/register" class="btn-secondary">Start Free <i class="bi bi-arrow-right"></i></a>
          </div>
          <!-- Premium Plan -->
          <div class="pricing-card featured" data-aos="flip-left">
            <div class="featured-tag"><i class="bi bi-gift-fill"></i> 7-DAY FREE TRIAL</div>
            <div class="plan-label">Most useful</div>
            <div class="pricing-icon"><i class="bi bi-stars"></i></div>
            <h3>Premium</h3>
            <div class="price">£2.99 <span>/month</span></div>
            <p class="pricing-alt">or £17.99 yearly</p>
            <ul class="pricing-features">
              <li v-for="feature in premiumFeatures" :key="feature">
                <i class="bi bi-check-circle-fill"></i> {{ feature }}
              </li>
            </ul>
            <div class="pricing-actions">
              <form method="POST" action="/checkout">
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" value="premium_monthly">
                <button type="submit" class="btn-primary">Monthly <i class="bi bi-gift-fill"></i></button>
              </form>
              <form method="POST" action="/checkout">
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" value="premium_yearly">
                <button type="submit" class="btn-secondary">Yearly <i class="bi bi-calendar-check"></i></button>
              </form>
            </div>
          </div>
          <!-- Pro Plan -->
          <div class="pricing-card" data-aos="flip-left">
            <div class="featured-tag"><i class="bi bi-gift-fill"></i> 7-DAY FREE TRIAL</div>
            <div class="plan-label">Teacher-ready</div>
            <div class="pricing-icon"><i class="bi bi-gem"></i></div>
            <h3>Pro</h3>
            <div class="price">£5.99 <span>/month</span></div>
            <p class="pricing-alt">or £49.99 yearly</p>
            <ul class="pricing-features">
              <li v-for="feature in proFeatures" :key="feature">
                <i class="bi bi-check-circle-fill"></i> {{ feature }}
              </li>
            </ul>
            <div class="pricing-actions">
              <form method="POST" action="/checkout">
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" value="pro_monthly">
                <button type="submit" class="btn-primary">Monthly <i class="bi bi-gem"></i></button>
              </form>
              <form method="POST" action="/checkout">
                <input type="hidden" name="_token" :value="csrfToken">
                <input type="hidden" name="plan" value="pro_yearly">
                <button type="submit" class="btn-secondary">Yearly <i class="bi bi-calendar-check"></i></button>
              </form>
            </div>
          </div>
        </div>

        <div class="pricing-comparison">
          <div class="comparison-header">
            <h3>Feature comparison</h3>
            <p>Everything included in each subscription at a glance.</p>
          </div>
          <div class="comparison-table-wrap">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Premium</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparisonRows" :key="row.feature">
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
        <div class="section-kicker"><i class="bi bi-question-circle"></i> Common questions</div>
        <h2 class="section-title">Answers before you start</h2>
        <p class="section-subtitle">A quick overview of how Mutqin supports recitation, memorisation, and long-term retention.</p>
        <div class="faq-shell" data-aos="fade-up">
          <div class="accordion faq-accordion" id="homepageFaq">
            <div class="accordion-item" v-for="(item, idx) in faqItems" :key="item.question">
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
          <div class="contact-copy" data-aos="fade-up">
            <h2 class="section-title section-title-left">Tell us what you need help with</h2>
            <p class="section-subtitle section-subtitle-left">Questions about billing, memorisation workflows, or product feedback can come through here. We will keep the response simple and actionable.</p>
          </div>
          <div class="contact-card" data-aos="fade-up">
            <div v-if="contactStatus.message" class="contact-alert" :class="contactStatus.type === 'success' ? 'contact-alert-success' : 'contact-alert-error'" role="alert">
              {{ contactStatus.message }}
            </div>
            <form class="contact-form" @submit.prevent="submitContact">
              <div class="contact-form-grid">
                <div>
                  <label class="form-label" for="contactName">Name</label>
                  <input id="contactName" v-model.trim="contactForm.name" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.name }" autocomplete="name">
                  <div v-if="contactErrors.name" class="invalid-feedback d-block">{{ contactErrors.name }}</div>
                </div>
                <div>
                  <label class="form-label" for="contactEmail">Email</label>
                  <input id="contactEmail" v-model.trim="contactForm.email" type="email" class="form-control" :class="{ 'is-invalid': contactErrors.email }" autocomplete="email">
                  <div v-if="contactErrors.email" class="invalid-feedback d-block">{{ contactErrors.email }}</div>
                </div>
              </div>
              <div>
                <label class="form-label" for="contactSubject">Subject</label>
                <input id="contactSubject" v-model.trim="contactForm.subject" type="text" class="form-control" :class="{ 'is-invalid': contactErrors.subject }" autocomplete="off" required>
                <div v-if="contactErrors.subject" class="invalid-feedback d-block">{{ contactErrors.subject }}</div>
              </div>
              <div>
                <label class="form-label" for="contactMessage">Message</label>
                <textarea id="contactMessage" v-model.trim="contactForm.message" class="form-control contact-textarea" :class="{ 'is-invalid': contactErrors.message }" rows="6"></textarea>
                <div v-if="contactErrors.message" class="invalid-feedback d-block">{{ contactErrors.message }}</div>
              </div>
              <button type="submit" class="btn-primary contact-submit" :disabled="contactSubmitting">
                <i class="bi" :class="contactSubmitting ? 'bi-arrow-repeat spin-icon' : 'bi-send'"></i>
                {{ contactSubmitting ? 'Sending...' : 'Send Message' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <div class="cta-block">
      <div class="cta-copy">
        <div class="cta-icon"><i class="bi bi-heart-fill"></i></div>
        <h2>Turn weak ayahs into a clear review path.</h2>
        <p>Record a verse, review the highlighted issues, and keep the next session focused on what actually needs work.</p>
      </div>
      <div class="cta-actions">
        <a href="/register" class="btn-primary"><i class="bi bi-person-badge"></i> Create Free Account</a>
        <span>No card needed for Free.</span>
      </div>
    </div>

    <!-- Footer - full width, bottom fixed position -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">
              <i class="bi bi-moon-stars"></i>
              <h3>Mutqin</h3>
            </div>
            <p>Focused Quran memorisation tools for recitation checks, review planning, and steady daily practice.</p>
          </div>
          <div class="footer-links">
            <h4><i class="bi bi-grid-3x3-gap-fill"></i> Product</h4>
            <a href="#features" @click.prevent="scrollToFeatures"><i class="bi bi-mic"></i> Features</a>
            <a href="#pricing" @click.prevent="scrollToPricing"><i class="bi bi-tag-fill"></i> Pricing</a>
            <a href="#"><i class="bi bi-compass"></i> Roadmap</a>
          </div>
          <div class="footer-links">
            <h4><i class="bi bi-book-half"></i> Resources</h4>
            <a href="#"><i class="bi bi-pen-fill"></i> Tajweed Guide</a>
            <a href="#"><i class="bi bi-lightbulb-fill"></i> Memorization Tips</a>
            <a href="#"><i class="bi bi-question-circle"></i> Help Center</a>
          </div>
          <div class="footer-links">
            <h4><i class="bi bi-building"></i> Company</h4>
            <a href="/about-us"><i class="bi bi-info-circle-fill"></i> About Us</a>
            <a href="#contact" @click.prevent="document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"><i class="bi bi-chat-dots-fill"></i> Contact</a>
            <a href="/our-mission"><i class="bi bi-heart"></i> Our Mission</a>
          </div>
          <div class="footer-social">
            <h4><i class="bi bi-share-fill"></i> Connect</h4>
            <div class="social-icons">
              <a href="#" aria-label="Twitter"><i class="bi bi-twitter-x"></i></a>
              <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
              <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
              <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p><i class="bi bi-c-circle"></i> 2026 Mutqin · "And recite the Quran with measured recitation." 🤍</p>
          <div class="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">© All Rights Reserved</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';

export default {
  name: 'OnboardingPage',
  setup() {
    // Theme management
    const currentTheme = ref('light');
    
    const setTheme = (theme) => {
      currentTheme.value = theme;
      localStorage.setItem('mutqin-theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    };
    
    const loadTheme = () => {
      const saved = localStorage.getItem('mutqin-theme');
      if (saved && ['light', 'dark', 'sepia'].includes(saved)) {
        currentTheme.value = saved;
        document.documentElement.setAttribute('data-theme', saved);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      } else {
        setTheme('light');
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

    const validateContact = () => {
      resetContactFeedback();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!contactForm.name) contactErrors.name = 'Please enter your name.';
      if (!contactForm.email) {
        contactErrors.email = 'Please enter your email address.';
      } else if (!emailPattern.test(contactForm.email)) {
        contactErrors.email = 'Please enter a valid email address.';
      }
      if (!contactForm.subject) contactErrors.subject = 'Please enter a subject.';
      if (!contactForm.message) contactErrors.message = 'Please enter a message.';

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
        contactStatus.message = 'Your message has been sent successfully.';
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
          ? 'Please review the highlighted fields and try again.'
          : 'Unable to send message. Please try again.';
      } finally {
        contactSubmitting.value = false;
      }
    };
    
    // Data
    const floatingBadges = ref([
      { icon: 'bi bi-check-circle-fill', text: 'Tajweed score: +27%' },
      { icon: 'bi bi-graph-up', text: 'Weak verses auto-scheduled' },
      { icon: 'bi bi-star-fill', text: '15 min/day memorization' }
    ]);
    
    const features = ref([
      { icon: 'bi bi-mic-fill', title: 'AI Recitation Review', badge: 'Free', badgeType: '', description: 'Record an ayah and compare your attempt against the text with clear word-level feedback.', result: 'Spot the section to repeat next.' },
      { icon: 'bi bi-lightning-charge-fill', title: 'Smart Memorisation', badge: 'Pro', badgeType: 'pro', description: 'Use blur, chaining, anchors, and review signals to strengthen recall without clutter.', result: 'Practise the ayahs that need attention.' },
      { icon: 'bi bi-journal-bookmark-fill', title: 'Stacked & Mushaf Views', badge: 'Free', badgeType: '', description: 'Move between clean ayah cards and page-style mushaf layouts while keeping controls nearby.', result: 'Read, listen, and self-check in one flow.' },
      { icon: 'bi bi-link-45deg', title: 'Transition Training', badge: 'Pro', badgeType: 'pro', description: 'Build confidence between neighbouring ayahs with linking and cumulative repetition.', result: 'Reduce pauses between verses.' },
      { icon: 'bi bi-collection-play', title: 'Recording Library', badge: 'Free limited', badgeType: '', description: 'Save attempts by surah and ayah so older reviews remain easy to find.', result: 'Keep your recitation history organised.' },
      { icon: 'bi bi-graph-up-arrow', title: 'Review Analytics', badge: 'Pro', badgeType: 'pro', description: 'Track weak ayahs, repeated attempts, and review priority across your sessions.', result: 'Know what to fix before the next session.' }
    ]);
    
    const steps = ref([
      { title: 'Record', description: 'Recite the selected ayah or session directly in the browser.', icon: 'bi bi-mic-fill', microcopy: 'Fast self-checks without uploads' },
      { title: 'Review', description: 'See which words were strong, close, or missed after the recitation.', icon: 'bi bi-stars', microcopy: 'Clear feedback you can act on' },
      { title: 'Repeat', description: 'Use blur, chaining, anchors, and saved attempts to revisit weak ayahs.', icon: 'bi bi-arrow-repeat', microcopy: 'Practice follows your weak spots' }
    ]);
    
    const testimonials = ref([
      { quote: "Mutqin fixed my 'ض' in 2 weeks after 5 years of struggle. Alhamdulillah.", proof: 'Focused makharij feedback', author: "Abdullah Khan", role: "12 Juz Memorized", initials: "AK" },
      { quote: "Spaced repetition saved my hifdh. I don't forget anymore. Essential for every hafidh.", proof: 'Daily weak-verse review', author: "Fatima El-Sayed", role: "Hafidha in Progress", initials: "FE" },
      { quote: "As a tajweed teacher, I use Mutqin to track students' weak spots instantly.", proof: 'Teacher visibility', author: "Ustadh Hisham", role: "Certified Qari", initials: "UH" }
    ]);

    const faqItems = ref([
      { question: 'What is Mutqin?', answer: 'Mutqin is a Quran memorisation and recitation workspace that combines practice tools, recordings, review signals, and progress tracking in one place.' },
      { question: 'How does memorisation work?', answer: 'You choose a surah and ayah range, repeat in small blocks, and use practice tools like blur, chaining, and saved sessions to strengthen recall gradually.' },
      { question: 'How does AI feedback work?', answer: 'AI feedback listens after you practise, highlights likely weak or missed words, and gives you a clearer next repetition instead of a vague overall score.' },
      { question: 'What is Pro?', answer: 'Pro is the full Mutqin plan for students who want AI recitation review, AI memorisation checks, advanced analytics, unlimited saved sessions, and deeper planning tools.' },
      { question: 'How does revision work?', answer: 'Mutqin tracks weak ayahs, recent practice, and due reviews so you can revisit what is most likely to slip before it turns into a larger backlog.' }
    ]);
    
    const freeFeatures = ref([
      'Full basic session setup',
      '3 saved sessions',
      'Basic analytics',
      'Focus mode'
    ]);

    const premiumFeatures = ref([
      'Full basic session setup',
      '5 saved sessions',
      'Focus mode',
      'Blurring method',
      'Chaining method',
      'Anchor mode',
      'Basic analytics',
      'Manual self-assessment recording',
      'Structured Custom Hifz Plan',
      'Spaced Session Retention',
      'Adaptive Revision Scheduling',
      'Progress Tracking'
    ]);
    
    const proFeatures = ref([
      'Full basic session setup',
      'Unlimited saved sessions',
      'All memorisation techniques included',
      'AI recitation',
      'AI memorisation checker',
      'Manual self-assessment recording + self recording',
      'Advanced analysis',
      'Download for offline listening',
      'Structured Custom Hifz Plan',
      'Spaced Session Retention',
      'Voice Hifz Plan Builder',
      'Adaptive Revision Scheduling',
      'Progress Tracking'
    ]);

    const comparisonRows = ref([
      { feature: 'Session setup and ayah range tools', free: true, premium: true, pro: true },
      { feature: 'Saved sessions', free: '3', premium: '5', pro: 'Unlimited' },
      { feature: 'Stacked and Mushaf layouts', free: true, premium: true, pro: true },
      { feature: 'Focus mode', free: true, premium: true, pro: true },
      { feature: 'Blur memorisation method', free: false, premium: true, pro: true },
      { feature: 'Chaining and transition practice', free: false, premium: true, pro: true },
      { feature: 'Anchor mode', free: false, premium: true, pro: true },
      { feature: 'Manual self-assessment recording', free: false, premium: true, pro: true },
      { feature: 'AI recitation review', free: false, premium: false, pro: true },
      { feature: 'AI memorisation checker', free: false, premium: false, pro: true },
      { feature: 'Structured Custom Hifz Plan', free: false, premium: true, pro: true },
      { feature: 'Spaced Session Retention', free: false, premium: true, pro: true },
      { feature: 'Voice Hifz Plan Builder', free: false, premium: false, pro: true },
      { feature: 'Adaptive Revision Scheduling', free: false, premium: true, pro: true },
      { feature: 'Progress Tracking', free: true, premium: true, pro: true },
      { feature: 'Advanced review analytics', free: false, premium: false, pro: true },
      { feature: 'Offline audio downloads', free: false, premium: false, pro: true },
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
