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
              <a href="/register" class="btn-primary"><i class="bi bi-book-half"></i> Start Free</a>
              <button @click="scrollToFeatures" class="btn-secondary"><i class="bi bi-arrow-down"></i> See Features</button>
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
  
      <div class="divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>
  
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
  
      <div class="divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>
  
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
  
      <div class="divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>
  
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
  
      <div class="divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>
  
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
              <a href="/billing?plan=free" class="btn-secondary">Start Free <i class="bi bi-arrow-right"></i></a>
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
                <a href="/billing?plan=premium_monthly" class="btn-primary">Monthly <i class="bi bi-gift-fill"></i></a>
                <a href="/billing?plan=premium_yearly" class="btn-secondary">Yearly <i class="bi bi-calendar-check"></i></a>
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
                <a href="/billing?plan=pro_monthly" class="btn-primary">Monthly <i class="bi bi-gem"></i></a>
                <a href="/billing?plan=pro_yearly" class="btn-secondary">Yearly <i class="bi bi-calendar-check"></i></a>
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
                    <td><span :class="comparisonValueClass(row.free)">{{ row.free }}</span></td>
                    <td><span :class="comparisonValueClass(row.premium)">{{ row.premium }}</span></td>
                    <td><span :class="comparisonValueClass(row.pro)">{{ row.pro }}</span></td>
                  </tr>
                </tbody>
              </table>
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
              <a href="#"><i class="bi bi-journal-bookmark-fill"></i> Blog</a>
            </div>
            <div class="footer-links">
              <h4><i class="bi bi-building"></i> Company</h4>
              <a href="#"><i class="bi bi-info-circle-fill"></i> About Us</a>
              <a href="#"><i class="bi bi-chat-dots-fill"></i> Contact</a>
              <a href="#"><i class="bi bi-shield-check"></i> Islamic Scholars</a>
            </div>
            <div class="footer-social">
              <h4><i class="bi bi-share-fill"></i> Connect</h4>
              <div class="social-icons">
                <a href="#" aria-label="Twitter"><i class="bi bi-twitter-x"></i></a>
                <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
                <a href="#" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
                <a href="#" aria-label="Telegram"><i class="bi bi-telegram"></i></a>
                <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <p><i class="bi bi-c-circle"></i> 2025 Mutqin · "And recite the Quran with measured recitation." 🤍</p>
          </div>
        </div>
      </footer>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  
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

      const comparisonValueClass = (value) => {
        const text = String(value || '').toLowerCase();
        if (text.includes('not included')) return 'comparison-value comparison-value-muted';
        if (text.includes('unlimited') || text.includes('included')) return 'comparison-value comparison-value-included';
        return 'comparison-value comparison-value-limited';
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
        'Manual self-assessment recording'
      ]);
      
      const proFeatures = ref([
        'Full basic session setup',
        'Unlimited saved sessions',
        'All memorisation techniques included',
        'AI recitation',
        'AI memorisation checker',
        'Manual self-assessment recording + self recording',
        'Advanced analysis',
        'Download for offline listening'
      ]);

      const comparisonRows = ref([
        { feature: 'Session setup and ayah range tools', free: 'Included', premium: 'Included', pro: 'Included' },
        { feature: 'Saved sessions', free: '3', premium: '5', pro: 'Unlimited' },
        { feature: 'Stacked and Mushaf layouts', free: 'Included', premium: 'Included', pro: 'Included' },
        { feature: 'Focus mode', free: 'Included', premium: 'Included', pro: 'Included' },
        { feature: 'Blur memorisation method', free: 'Not included', premium: 'Included', pro: 'Included' },
        { feature: 'Chaining and transition practice', free: 'Not included', premium: 'Included', pro: 'Included' },
        { feature: 'Anchor mode', free: 'Not included', premium: 'Included', pro: 'Included' },
        { feature: 'Manual self-assessment recording', free: 'Not included', premium: 'Included', pro: 'Included' },
        { feature: 'AI recitation review', free: 'Not included', premium: 'Not included', pro: 'Included' },
        { feature: 'AI memorisation checker', free: 'Not included', premium: 'Not included', pro: 'Included' },
        { feature: 'Advanced review analytics', free: 'Not included', premium: 'Not included', pro: 'Included' },
        { feature: 'Offline audio downloads', free: 'Not included', premium: 'Not included', pro: 'Included' }
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
        setTheme,
        featuresSection,
        pricingSection,
        scrollToFeatures,
        scrollToPricing,
        comparisonValueClass,
        floatingBadges,
        features,
        steps,
        testimonials,
        freeFeatures,
        premiumFeatures,
        proFeatures,
        comparisonRows
      };
    }
  };
  </script>
  
  <style>
  /* CSS Variables - Warm Islamic Color Palette */
  :root {
    --bg: #f3eee6;
    --surface: rgba(255, 250, 243, 0.88);
    --surface-strong: rgba(255, 255, 255, 0.92);
    --border: rgba(78, 58, 38, 0.10);
    --text: #1f1a17;
    --text-muted: #6c6258;
    --accent: #9a6738;
    --accent-strong: #6e4726;
    --accent-soft: #d8c1a8;
    --accent-light: rgba(154, 103, 56, 0.10);
    --accent-wash: rgba(228, 211, 194, 0.42);
    --shadow-sm: 0 8px 20px rgba(63, 39, 18, 0.08);
    --shadow-md: 0 16px 36px rgba(63, 39, 18, 0.12);
    --shadow-lg: 0 28px 70px rgba(63, 39, 18, 0.16);
    --radius: 16px;
    --font-ar: 'Amiri', 'Noto Naskh Arabic', serif;
    --font-ui: "Inter", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  
  [data-theme="dark"] {
    --bg: #101114;
    --surface: rgba(25, 23, 21, 0.94);
    --surface-strong: rgba(32, 29, 26, 0.98);
    --border: rgba(255, 236, 216, 0.16);
    --text: #fff7ee;
    --text-muted: #d8cec2;
    --accent: #e0ad72;
    --accent-strong: #ffd19b;
    --accent-soft: #5f4530;
    --accent-light: rgba(208, 160, 107, 0.14);
    --accent-wash: rgba(208, 160, 107, 0.08);
    --shadow-sm: 0 10px 24px rgba(0, 0, 0, 0.28);
    --shadow-md: 0 18px 42px rgba(0, 0, 0, 0.34);
    --shadow-lg: 0 30px 80px rgba(0, 0, 0, 0.42);
  }
  
  [data-theme="sepia"] {
    --bg: #efe2cb;
    --surface: rgba(250, 241, 227, 0.88);
    --surface-strong: rgba(255, 248, 237, 0.94);
    --text: #352516;
    --text-muted: #75624f;
    --accent: #b8824e;
    --accent-strong: #8f6033;
    --accent-soft: #dcc3a6;
    --accent-light: rgba(184, 130, 78, 0.12);
    --accent-wash: rgba(221, 194, 162, 0.35);
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: var(--font-ui);
    background: var(--bg);
    color: var(--text);
    overflow-x: hidden;
    transition: background 0.3s ease, color 0.3s ease;
  }
  
  .vue-onboarding {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(circle at 12% 10%, rgba(154, 103, 56, 0.12), transparent 26%),
      var(--bg);
    color: var(--text);
  }

  [data-theme="dark"].vue-onboarding {
    background:
      radial-gradient(circle at 18% 8%, rgba(224, 173, 114, 0.12), transparent 28%),
      linear-gradient(180deg, #101114 0%, #15120f 100%);
  }
  
  /* Verse Ticker */
  .verse-ticker {
    background: var(--accent-wash);
    padding: 1rem 0;
    overflow: hidden;
    white-space: nowrap;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  
  .ticker-track {
    display: inline-block;
    animation: ticker 60s linear infinite;
  }
  
  .ticker-track span {
    margin: 0 2rem;
    font-family: var(--font-ar);
    font-size: 1.2rem;
    color: var(--accent);
  }
  
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  
  /* Hero Section */
  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding: 6.5rem 2.75rem 4rem;
    position: relative;
    overflow: hidden;
    color: var(--text);
  }
  
  .hero::before {
    content: '۞';
    position: absolute;
    font-size: 30rem;
    opacity: 0.03;
    right: -10%;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    animation: rotate 60s linear infinite;
    color: var(--accent);
  }
  
  @keyframes rotate {
    from { transform: translateY(-50%) rotate(0deg); }
    to { transform: translateY(-50%) rotate(360deg); }
  }
  
  .hero-container {
    max-width: 1320px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: color-mix(in srgb, var(--accent-light) 78%, var(--surface-strong));
    color: var(--accent);
    padding: 0.3rem 1rem;
    border-radius: 40px;
    font-size: 0.84rem;
    font-weight: 750;
    margin-bottom: 1.5rem;
  }
  
  .hero-title {
    font-size: clamp(2.8rem, 4.8vw, 4.4rem);
    font-weight: 780;
    line-height: 0.9;
    /* margin-bottom: 1.35rem; */
    letter-spacing: -0.065em;
  }
  
  .hero-title span {
    background: linear-gradient(135deg, var(--text), var(--accent-strong) 46%, var(--accent) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  
  .hero-desc {
    font-size: clamp(1rem, 2vw, 1.48rem);
    color: color-mix(in srgb, var(--text) 78%, var(--text-muted));
    margin-bottom: 1.8rem;
    line-height: 1.75;
    max-width: 820px;
    font-weight: 200;
  }

  [data-theme="dark"] .hero-title span {
    background: linear-gradient(135deg, #fff7ee, #ffd19b 62%, #e0ad72 100%);
    -webkit-background-clip: text;
    background-clip: text;
  }
  
  .problem-solution {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 1.25rem;
    margin: 1.15rem 0 1.25rem;
    border: 1px solid var(--border);
    backdrop-filter: blur(10px);
  }
  
  .problem-text, .solution-text {
    font-size: 0.95rem;
    color: var(--text-muted);
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  
  .problem-text i, .solution-text i {
    color: var(--accent);
    margin-top: 2px;
  }
  
  .problem-text strong, .solution-text strong {
    color: var(--accent-strong);
  }
  
  .solution-highlight {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  
  .hero-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 0.2rem;
  }
  
  /* Hero Image */
  .hero-image {
    position: relative;
  }
  
  .demo-card {
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    border-radius: 28px;
    padding: 2rem;
    text-align: center;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border);
  }
  
  .demo-card i {
    font-size: 3.5rem;
    color: var(--accent);
    margin-bottom: 1rem;
  }
  
  .demo-card p {
    color: var(--text-muted);
    margin: 0.5rem 0;
  }
  
  .demo-wave {
    background: var(--accent-light);
    border-radius: 60px;
    padding: 0.5rem 1rem;
    margin-top: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .demo-wave i {
    font-size: 1rem;
    margin-bottom: 0;
  }
  
  .floating-card {
    position: absolute;
    background: var(--surface-strong);
    backdrop-filter: blur(12px);
    border-radius: 60px;
    padding: 0.6rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.8rem;
    font-weight: 500;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    animation: float 3s ease-in-out infinite;
  }
  
  .floating-card i {
    font-size: 1rem;
  }
  
  .floating-card:nth-child(2) { top: 5%; right: -5%; }
  .floating-card:nth-child(3) { bottom: 15%; left: -8%; }
  .floating-card:nth-child(4) { top: 45%; right: -10%; }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  
  /* Divider */
  .divider {
    text-align: center;
    padding: 2rem 0;
    color: var(--accent);
    font-size: 1rem;
    letter-spacing: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  
  .divider i {
    font-size: 0.8rem;
    opacity: 0.6;
  }
  
  /* Section Styles */
  .features-section,
  .steps-section,
  .pricing-section {
    position: relative;
    overflow: hidden;
  }

  .features-section::before,
  .pricing-section::before {
    content: '';
    position: absolute;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent-light), transparent 70%);
    top: 12%;
    right: -160px;
    pointer-events: none;
  }

  .section-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 4.8rem 2.75rem;
    position: relative;
    z-index: 1;
  }

  .section-kicker {
    width: fit-content;
    margin: 0 auto 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--accent-light);
    color: var(--accent-strong);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.45rem 1rem;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  
  .section-title {
    text-align: center;
    font-size: clamp(2rem, 3vw, 3.1rem);
    font-weight: 760;
    margin-bottom: 0.85rem;
    color: var(--text);
    letter-spacing: -0.04em;
    line-height: 1.08;
  }
  
  .section-title::before,
  .section-title::after {
    content: '۞';
    color: var(--accent);
    font-size: 1.5rem;
    margin: 0 1rem;
    opacity: 0.5;
    display: inline-block;
  }
  
  .section-subtitle {
    text-align: center;
    color: var(--text-muted);
    margin-bottom: 2.6rem;
    font-size: 1.1rem;
    max-width: 680px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.65;
  }
  
  /* Features Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
    gap: 1.6rem;
  }
  
  .feature-card {
    background: linear-gradient(145deg, var(--surface-strong), var(--surface));
    backdrop-filter: blur(8px);
    border-radius: 30px;
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .feature-card::after {
    content: '';
    position: absolute;
    inset: auto 1.4rem 1.4rem 1.4rem;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent), transparent);
    opacity: 0.35;
  }
  
  .feature-card:hover {
    transform: translateY(-6px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }

  .feature-topline {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.7rem;
  }
  
  .feature-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 22px;
    background: var(--accent-light);
    font-size: 2rem;
    color: var(--accent);
  }

  .feature-card h3 {
    font-size: 1.35rem;
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
  }

  .feature-card p {
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: 1.25rem;
  }

  .feature-card strong {
    margin-top: auto;
    color: var(--accent-strong);
    font-size: 0.9rem;
  }
  
  .feature-badge {
    font-size: 0.7rem;
    background: var(--accent-light);
    border-radius: 40px;
    padding: 0.2rem 0.8rem;
    margin-left: 0.6rem;
    font-weight: 600;
    vertical-align: middle;
    color: var(--accent);
  }
  
  .feature-badge.pro {
    background: var(--accent);
    color: white;
  }
  
  /* Steps Grid */
  .steps-section {
    background:
      linear-gradient(90deg, transparent 0 31%, var(--border) 31% 31.2%, transparent 31.2% 65%, var(--border) 65% 65.2%, transparent 65.2%),
      var(--bg);
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.6rem;
    margin-top: 2rem;
  }
  
  .step-card {
    text-align: left;
    padding: 2rem;
    background: var(--surface-strong);
    border-radius: 30px;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
    min-height: 260px;
    box-shadow: var(--shadow-sm);
  }
  
  .step-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }
  
  .step-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .step-number {
    font-size: 3rem;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: -0.07em;
    opacity: 0.35;
  }
  
  .step-icon {
    width: 58px;
    height: 58px;
    border-radius: 20px;
    background: var(--accent-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    color: var(--accent);
  }

  .step-card h3 {
    font-size: 1.5rem;
    margin-bottom: 0.7rem;
  }

  .step-card p {
    color: var(--text-muted);
    line-height: 1.6;
    margin-bottom: 1.3rem;
  }

  .step-card span {
    display: inline-flex;
    border-top: 1px solid var(--border);
    padding-top: 0.9rem;
    color: var(--accent-strong);
    font-size: 0.85rem;
    font-weight: 700;
  }
  
  /* Testimonials */
  .testimonials-section {
    background:
      linear-gradient(135deg, var(--accent-wash), transparent 58%),
      var(--bg);
  }
  
  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.6rem;
  }
  
  .testimonial-card {
    background: var(--surface-strong);
    border-radius: 30px;
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
    box-shadow: var(--shadow-sm);
  }
  
  .testimonial-rating {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.2rem;
  }

  .testimonial-rating i {
    font-size: 0.95rem;
    color: var(--accent);
  }
  
  .testimonial-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
  }

  .testimonial-card > p {
    font-size: 1.05rem;
    line-height: 1.65;
  }

  .testimonial-proof {
    width: fit-content;
    margin-top: 1.1rem;
    border-radius: 999px;
    padding: 0.35rem 0.8rem;
    background: var(--accent-light);
    color: var(--accent-strong);
    font-size: 0.75rem;
    font-weight: 800;
  }
  
  .testimonial-author {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .author-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .author-info h4 {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }
  
  .author-info p {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  
  /* Pricing */
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.6rem;
    max-width: 1180px;
    margin: 0 auto;
    align-items: stretch;
  }

  .pricing-comparison {
    max-width: 1180px;
    margin: 2.5rem auto 0;
    background: color-mix(in srgb, var(--surface-strong) 92%, transparent);
    border: 1px solid var(--border);
    border-radius: 28px;
    padding: 1.35rem;
    box-shadow: var(--shadow-sm);
  }

  .comparison-header {
    text-align: center;
    margin-bottom: 1rem;
  }

  .comparison-header h3 {
    font-size: clamp(1.55rem, 2.4vw, 2rem);
    margin-bottom: 0.35rem;
    letter-spacing: -0.03em;
  }

  .comparison-header p {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .comparison-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: color-mix(in srgb, var(--surface) 70%, transparent);
  }

  .comparison-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    min-width: 720px;
  }

  .comparison-table thead th {
    text-align: left;
    padding: 0.9rem 1rem;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }

  .comparison-table thead th:not(:first-child) {
    text-align: center;
  }

  .comparison-table tbody th,
  .comparison-table tbody td {
    padding: 0.92rem 1rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  .comparison-table tbody th {
    font-weight: 600;
    color: var(--text);
    width: 42%;
    text-align: left;
  }

  .comparison-table tbody td {
    text-align: center;
    font-size: 0.92rem;
    color: var(--text);
    font-weight: 700;
  }

  .comparison-table tbody tr:nth-child(even) {
    background: rgba(154, 103, 56, 0.03);
  }

  .comparison-value {
    min-width: 7.8rem;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0.38rem 0.7rem;
    border: 1px solid var(--border);
    font-size: 0.82rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .comparison-value-included {
    color: var(--accent-strong);
    background: var(--accent-light);
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .comparison-value-limited {
    color: var(--text);
    background: var(--surface-strong);
  }

  .comparison-value-muted {
    color: var(--text-muted);
    background: transparent;
  }
  
  .pricing-card {
    background: var(--surface-strong);
    border-radius: 28px;
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
    position: relative;
    text-align: left;
    display: flex;
    flex-direction: column;
    min-height: 560px;
  }

  .pricing-card:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-md);
  }

  .plan-label {
    width: fit-content;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.35rem 0.8rem;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 800;
    margin-bottom: 1.4rem;
  }
  
  .pricing-icon {
    width: 60px;
    height: 60px;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-light);
    font-size: 2rem;
    color: var(--accent);
    margin-bottom: 1rem;
  }

  .pricing-card h3 {
    font-size: 1.5rem;
  }
  
  .pricing-card.featured {
    border: 2px solid var(--accent);
    transform: scale(1.02);
    box-shadow: var(--shadow-lg);
  }
  
  .featured-tag {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.25rem 1rem;
    border-radius: 40px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .price {
    font-size: 3rem;
    font-weight: 760;
    color: var(--accent);
    margin: 1rem 0 0.4rem;
    letter-spacing: -0.05em;
  }
  
  .price span {
    font-size: 1rem;
    color: var(--text-muted);
  }

  .pricing-alt {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: -0.5rem;
  }
  
  .pricing-features {
    list-style: none;
    margin: 1.5rem 0;
    text-align: left;
    flex: 1;
  }
  
  .pricing-features li {
    padding: 0.6rem 0;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  
  .pricing-features i.bi-check-circle-fill { color: var(--accent); font-size: 1rem; }
  .pricing-features i.bi-x-circle { color: #c9b6a0; font-size: 1rem; }

  .pricing-card .btn-primary,
  .pricing-card .btn-secondary {
    width: 100%;
    height: 52px;
    min-height: 52px;
    padding: 0 1rem;
    border-radius: 999px;
    font-size: 0.94rem;
  }

  [data-theme="dark"] .hero-badge,
  [data-theme="dark"] .section-kicker,
  [data-theme="dark"] .feature-badge,
  [data-theme="dark"] .testimonial-proof,
  [data-theme="dark"] .plan-label {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  [data-theme="dark"] .problem-solution,
  [data-theme="dark"] .feature-card,
  [data-theme="dark"] .step-card,
  [data-theme="dark"] .testimonial-card,
  [data-theme="dark"] .pricing-card,
  [data-theme="dark"] .demo-card {
    background: rgba(31, 27, 24, 0.96);
    border-color: rgba(255, 236, 216, 0.14);
  }

  [data-theme="dark"] .hero-desc,
  [data-theme="dark"] .problem-text,
  [data-theme="dark"] .solution-text,
  [data-theme="dark"] .feature-card p,
  [data-theme="dark"] .step-card p,
  [data-theme="dark"] .testimonial-card > p,
  [data-theme="dark"] .pricing-alt,
  [data-theme="dark"] .pricing-features li,
  [data-theme="dark"] .author-info p {
    color: #d8cabb;
  }

  [data-theme="dark"] .section-title,
  [data-theme="dark"] .hero-title,
  [data-theme="dark"] .step-card h3,
  [data-theme="dark"] .feature-card h3,
  [data-theme="dark"] .testimonial-card h4,
  [data-theme="dark"] .pricing-card h3,
  [data-theme="dark"] .comparison-header h3 {
    color: #f8efe3;
  }

  [data-theme="dark"] .pricing-comparison {
    background: rgba(31, 27, 24, 0.96);
    border-color: rgba(255, 236, 216, 0.14);
  }

  [data-theme="dark"] .comparison-table thead th,
  [data-theme="dark"] .comparison-header p {
    color: #d8cabb;
  }

  [data-theme="dark"] .comparison-table tbody th,
  [data-theme="dark"] .comparison-table tbody td {
    color: #f8efe3;
    border-bottom-color: rgba(255, 236, 216, 0.12);
  }

  [data-theme="dark"] .comparison-table tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.03);
  }

  [data-theme="dark"] .comparison-table-wrap {
    background: rgba(255, 255, 255, 0.025);
  }

  [data-theme="dark"] .comparison-value-included {
    color: #ffd19b;
    background: rgba(224, 173, 114, 0.13);
    border-color: rgba(224, 173, 114, 0.28);
  }

  [data-theme="dark"] .comparison-value-limited {
    color: #fff7ee;
    background: rgba(255, 255, 255, 0.06);
  }

  [data-theme="dark"] .comparison-value-muted {
    color: #a99c8e;
    border-color: rgba(255, 236, 216, 0.1);
  }

  .pricing-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .pricing-actions .btn-secondary,
  .pricing-card > .btn-secondary {
    background: color-mix(in srgb, var(--surface-strong) 88%, white);
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
  }

  .pricing-actions .btn-secondary:hover,
  .pricing-card > .btn-secondary:hover {
    color: var(--accent-strong);
    border-color: var(--accent);
    background: var(--accent-light);
  }

  [data-theme="dark"] .pricing-actions .btn-secondary,
  [data-theme="dark"] .pricing-card > .btn-secondary {
    background: rgba(255, 255, 255, 0.075);
    color: #f8efe3;
    border-color: rgba(255, 236, 216, 0.22);
  }

  [data-theme="dark"] .pricing-actions .btn-secondary:hover,
  [data-theme="dark"] .pricing-card > .btn-secondary:hover {
    background: rgba(224, 173, 114, 0.16);
    color: #ffd19b;
    border-color: rgba(224, 173, 114, 0.42);
  }
  
  /* CTA Block */
  .cta-block {
    max-width: 1000px;
    margin: 2rem auto 3rem;
    background:
      radial-gradient(circle at 12% 20%, rgba(255,255,255,0.3), transparent 24%),
      linear-gradient(135deg, #6e4726, #b97c44);
    border-radius: 40px;
    color: #fffaf4;
    padding: 3rem;
    border: 1px solid rgba(255, 255, 255, 0.22);
    box-shadow: var(--shadow-lg);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 2rem;
  }
  
  .cta-icon {
    width: 58px;
    height: 58px;
    border-radius: 20px;
    background: rgba(255,255,255,0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.7rem;
    color: white;
    margin-bottom: 1rem;
  }
  
  .cta-block h2 {
    font-size: clamp(2.2rem, 4.4vw, 3.5rem);
    margin-bottom: 1rem;
    letter-spacing: -0.05em;
  }
  
  .cta-block p {
    margin-bottom: 0;
    color: rgba(255,255,255,0.82);
    max-width: 600px;
    line-height: 1.65;
  }

  .cta-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .cta-actions .btn-primary {
    background: white;
    color: var(--accent-strong);
    height: 52px;
    min-height: 52px;
    padding: 0 1.2rem;
  }

  .cta-actions span {
    color: rgba(255,255,255,0.75);
    font-size: 0.85rem;
  }

  [data-theme="dark"] .cta-block {
    background:
      radial-gradient(circle at 12% 20%, rgba(255, 209, 155, 0.16), transparent 24%),
      linear-gradient(135deg, #1f1b18, #3a2b20 46%, #7d5435);
    border-color: rgba(255, 236, 216, 0.18);
  }

  [data-theme="dark"] .cta-block p,
  [data-theme="dark"] .cta-actions span {
    color: rgba(255, 247, 238, 0.78);
  }
  
  /* Buttons */
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    padding: 0.85rem 2rem;
    border-radius: 60px;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    text-decoration: none;
    cursor: pointer;
    border: none;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: white;
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .btn-secondary {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
  }
  
  .btn-secondary:hover {
    background: var(--accent-light);
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  
  /* Footer - Full Width, Bottom Fixed */
  .footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 3rem 2rem 1.5rem;
    margin-top: auto;
    width: 100%;
    bottom: 0;
    left: 0;
    right: 0;
  }
  
  .footer-container {
    max-width: 1280px;
    margin: 0 auto;
  }
  
  .footer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .footer-brand {
    max-width: 280px;
  }
  
  .footer-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1rem;
  }
  
  .footer-logo i {
    font-size: 1.8rem;
    color: var(--accent);
  }
  
  .footer-logo h3 {
    font-size: 1.3rem;
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }
  
  .footer-brand p {
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }
  
  .footer-links h4, .footer-social h4 {
    color: var(--accent);
    margin-bottom: 1rem;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .footer-links a {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    text-decoration: none;
    margin-bottom: 0.6rem;
    font-size: 0.85rem;
    transition: all 0.3s ease;
  }
  
  .footer-links a i {
    font-size: 0.8rem;
  }
  
  .footer-links a:hover {
    color: var(--accent);
    transform: translateX(5px);
  }
  
  .social-icons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .social-icons a {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--accent-light);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    font-size: 1.2rem;
    transition: all 0.3s ease;
    text-decoration: none;
  }
  
  .social-icons a:hover {
    background: var(--accent);
    color: white;
    transform: translateY(-3px);
  }
  
  .footer-bottom {
    text-align: center;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.8rem;
  }
  
  .footer-bottom i {
    margin-right: 4px;
  }
  
  /* AOS Animations */
  [data-aos] {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.2, 0.9, 0.4, 1.1);
  }
  [data-aos].aos-animate {
    opacity: 1;
    transform: translateY(0);
  }
  [data-aos="fade-up"] { transform: translateY(30px); }
  [data-aos="fade-left"] { transform: translateX(30px); }
  [data-aos="zoom-in"] { transform: scale(0.95); }
  [data-aos="zoom-in"].aos-animate { transform: scale(1); }
  [data-aos="flip-up"] { transform: rotateX(90deg); transform-origin: center; }
  [data-aos="flip-up"].aos-animate { transform: rotateX(0); }
  [data-aos="flip-right"] { transform: rotateY(90deg); }
  [data-aos="flip-right"].aos-animate { transform: rotateY(0); }
  [data-aos="flip-left"] { transform: rotateY(-90deg); }
  [data-aos="flip-left"].aos-animate { transform: rotateY(0); }
  
  /* Responsive */
  @media (max-width: 768px) {
    .hero-container {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 2rem;
    }
    .hero-title { font-size: clamp(3.6rem, 15vw, 5rem); }
    .hero { padding: 5rem 1.2rem 2.5rem; }
    .steps-grid, .testimonials-grid, .pricing-grid { grid-template-columns: 1fr; }
    .pricing-card.featured { transform: scale(1); }
    .pricing-card { min-height: auto; }
    .floating-card { display: none; }
    .section-title { font-size: 1.8rem; }
    .section-title::before,
    .section-title::after { display: none; }
    .section-container { padding: 3rem 1.2rem; }
    .feature-card, .step-card, .testimonial-card { min-height: auto; }
    .steps-section { background: var(--bg); }
    .cta-block {
      grid-template-columns: 1fr;
      margin: 1rem 1.2rem 2rem;
      padding: 2rem;
      border-radius: 30px;
    }
    .pricing-actions { grid-template-columns: 1fr; }
    .pricing-comparison { margin-top: 1.6rem; padding: 1rem; border-radius: 24px; }
    .footer-grid { grid-template-columns: 1fr; text-align: center; }
    .footer-brand { max-width: 100%; text-align: center; }
    .footer-logo { justify-content: center; }
    .footer-links a { justify-content: center; }
    .social-icons { justify-content: center; }
    .problem-text, .solution-text { flex-direction: column; text-align: left; }
  }
  </style>
