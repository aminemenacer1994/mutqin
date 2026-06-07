<template>
    <div class="vue-onboarding" :data-theme="currentTheme">
      <!-- Quran Ticker -->
      <div class="verse-ticker">
        <div class="ticker-track">
          <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
          <span>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span>
          <span>إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ</span>
          <span>اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ</span>
          <span>رَبِّ زِدْنِي عِلْمًا</span>
          <span>وَأَحْسِنْ تَرْتِيلِي</span>
        </div>
      </div>
  
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-container">
          <div class="hero-content" data-aos="fade-up">
            <div class="hero-badge">
              <i class="bi bi-moon-stars"></i> AI-Powered Quran Learning
            </div>
            <h1 class="hero-title">You recite. But <span>do you know</span> where you're making mistakes?</h1>
            <p class="hero-desc">Mutqin listens to every letter. Instantly detects tajweed errors. Schedules perfect reviews. No guesswork.</p>
            
            <div class="problem-solution">
              <p class="problem-text"><i class="bi bi-exclamation-triangle-fill"></i> <strong>The problem:</strong> Years of repeating the same tajweed mistakes. Fading memorization. No one catches every error.</p>
              <div class="solution-highlight">
                <p class="solution-text"><i class="bi bi-check-lg"></i> <strong>The solution:</strong> AI pinpoints your exact makharij issues. Smart spaced repetition locks verses in memory. Real-time feedback after every recitation.</p>
              </div>
            </div>
            
            <div class="hero-buttons">
              <a href="/register" class="btn-primary"><i class="bi bi-book-half"></i> Start Free</a>
              <button @click="scrollToFeatures" class="btn-secondary"><i class="bi bi-arrow-down"></i> See Features</button>
            </div>
            
            <div class="hero-stats">
              <div class="stat-card" v-for="stat in stats" :key="stat.label">
                <div class="stat-number"><AnimatedCounter :target="stat.value" :duration="2000" />{{ stat.suffix }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
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
          <h2 class="section-title">Everything you need to master recitation</h2>
          <p class="section-subtitle">Clear tools. Real AI feedback. Zero fluff.</p>
          <div class="features-grid">
            <div class="feature-card" v-for="feature in features" :key="feature.title" data-aos="zoom-in">
              <div class="feature-icon"><i :class="feature.icon"></i></div>
              <h3>{{ feature.title }} <span :class="['feature-badge', feature.badgeType]">{{ feature.badge }}</span></h3>
              <p>{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>
  
      <div class="divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>
  
      <!-- How It Works -->
      <section id="how-it-works">
        <div class="section-container">
          <h2 class="section-title">Three steps to fluent recitation</h2>
          <div class="steps-grid">
            <div class="step-card" v-for="(step, idx) in steps" :key="idx" data-aos="flip-up" :data-aos-delay="idx * 100">
              <div class="step-number">{{ idx + 1 }}</div>
              <i :class="step.icon" class="step-icon"></i>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </div>
        </div>
      </section>
  
      <div class="divider"><i class="bi bi-star-fill"></i> ۞ <i class="bi bi-star-fill"></i></div>
  
      <!-- Testimonials -->
      <section id="testimonials" class="testimonials-section">
        <div class="section-container">
          <h2 class="section-title">Trusted by thousands</h2>
          <div class="testimonials-grid">
            <div class="testimonial-card" v-for="(testimonial, idx) in testimonials" :key="idx" data-aos="fade-up" :data-aos-delay="idx * 100">
              <i class="bi bi-chat-quote-fill"></i>
              <p>"{{ testimonial.quote }}"</p>
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
          <h2 class="section-title">Simple, transparent pricing</h2>
          <p class="section-subtitle">Start free. Upgrade when you want deeper memorisation tools.</p>
          <div class="pricing-grid">
            <!-- Freemium Plan -->
            <div class="pricing-card" data-aos="flip-right">
              <div class="pricing-icon"><i class="bi bi-flower1"></i></div>
              <h3>Free</h3>
              <div class="price">£0</div>
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
              <div class="pricing-icon"><i class="bi bi-stars"></i></div>
              <h3>Premium</h3>
              <div class="price">£2.99 <span>/month</span></div>
              <p class="pricing-alt">or £17.99 yearly</p>
              <ul class="pricing-features">
                <li v-for="feature in premiumFeatures" :key="feature">
                  <i class="bi bi-check-circle-fill"></i> {{ feature }}
                </li>
              </ul>
              <a href="/register" class="btn-primary">Try Premium <i class="bi bi-gift-fill"></i></a>
            </div>
            <!-- Pro Plan -->
            <div class="pricing-card" data-aos="flip-left">
              <div class="featured-tag"><i class="bi bi-gift-fill"></i> 7-DAY FREE TRIAL</div>
              <div class="pricing-icon"><i class="bi bi-gem"></i></div>
              <h3>Pro</h3>
              <div class="price">£5.99 <span>/month</span></div>
              <p class="pricing-alt">or £49.99 yearly</p>
              <ul class="pricing-features">
                <li v-for="feature in proFeatures" :key="feature">
                  <i class="bi bi-check-circle-fill"></i> {{ feature }}
                </li>
              </ul>
              <a href="/register" class="btn-secondary">Try Pro <i class="bi bi-arrow-right"></i></a>
            </div>
          </div>
        </div>
      </section>
  
      <!-- CTA Section -->
      <div class="cta-block">
        <div class="cta-icon"><i class="bi bi-heart-fill"></i></div>
        <h2>Stop repeating the same mistakes.</h2>
        <p>Get AI feedback that actually improves your tajweed and memorization — starting today.</p>
        <a href="/register" class="btn-primary"><i class="bi bi-person-badge"></i> Create Free Account</a>
      </div>
  
      <!-- Theme Switcher -->
      <div class="theme-switcher">
        <button @click="setTheme('light')" :class="{ active: currentTheme === 'light' }" aria-label="Light mode">
          <i class="bi bi-brightness-high-fill"></i>
        </button>
        <button @click="setTheme('dark')" :class="{ active: currentTheme === 'dark' }" aria-label="Dark mode">
          <i class="bi bi-moon-fill"></i>
        </button>
        <button @click="setTheme('sepia')" :class="{ active: currentTheme === 'sepia' }" aria-label="Sepia mode">
          <i class="bi bi-book-half"></i>
        </button>
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
              <p>AI that corrects your tajweed & locks memorization. Rooted in tradition, powered by innovation.</p>
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
  import { ref, onMounted, onUnmounted } from 'vue';
  
  // Animated Counter Component
  const AnimatedCounter = {
    props: { target: Number, duration: { type: Number, default: 2000 } },
    setup(props) {
      const current = ref(0);
      let animationId = null;
      
      onMounted(() => {
        const startTime = performance.now();
        const updateCounter = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / props.duration, 1);
          current.value = Math.floor(progress * props.target);
          if (progress < 1) {
            animationId = requestAnimationFrame(updateCounter);
          } else {
            current.value = props.target;
          }
        };
        animationId = requestAnimationFrame(updateCounter);
      });
      
      onUnmounted(() => {
        if (animationId) cancelAnimationFrame(animationId);
      });
      
      return { current };
    },
    template: '<span>{{ current }}</span>'
  };
  
  export default {
    name: 'OnboardingPage',
    components: { AnimatedCounter },
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
      
      // Data
      const stats = ref([
        { value: 15000, suffix: '+', label: 'Active Students' },
        { value: 94, suffix: '%', label: 'Tajweed Improvement' },
        { value: 280, suffix: 'k+', label: 'Errors Corrected' }
      ]);
      
      const floatingBadges = ref([
        { icon: 'bi bi-check-circle-fill', text: 'Tajweed score: +27%' },
        { icon: 'bi bi-graph-up', text: 'Weak verses auto-scheduled' },
        { icon: 'bi bi-star-fill', text: '15 min/day memorization' }
      ]);
      
      const features = ref([
        { icon: 'bi bi-mic', title: 'AI Recitation Checker', badge: 'Free', badgeType: '', description: 'Letter-by-letter Tajweed analysis, mistake heatmaps, instant audio feedback. 25 free checks/day.' },
        { icon: 'bi bi-brain', title: 'Smart Memorization', badge: 'Pro', badgeType: 'pro', description: 'Spaced repetition + forgetting curve AI. Tests weak verses before you forget.' },
        { icon: 'bi bi-journal-bookmark-fill', title: 'Interactive Mushaf', badge: 'Free', badgeType: '', description: 'Tajweed color-coding, tafsir, transliteration, audio from 5 renowned Qaris.' },
        { icon: 'bi bi-link', title: 'Memory Linking', badge: 'Pro', badgeType: 'pro', description: 'AI selects anchor/story method based on your retention style.' },
        { icon: 'bi bi-collection-play', title: 'Personal Library', badge: 'Free (limited)', badgeType: '', description: 'Save last 15 recordings + basic analytics. Pro: unlimited history.' },
        { icon: 'bi bi-graph-up', title: 'Weakness Analytics', badge: 'Pro', badgeType: 'pro', description: 'Heatmap of recurring errors, rule-based recommendations, monthly progress reports.' }
      ]);
      
      const steps = ref([
        { title: 'Record', description: 'Recite any verse directly in your browser.', icon: 'bi bi-mic' },
        { title: 'AI Analysis', description: 'Get letter‑level tajweed report within 3 seconds.', icon: 'bi bi-cpu' },
        { title: 'Fix & Review', description: 'Actionable corrections + smart revision scheduler.', icon: 'bi bi-check2-circle' }
      ]);
      
      const testimonials = ref([
        { quote: "Mutqin fixed my 'ض' in 2 weeks after 5 years of struggle. Alhamdulillah.", author: "Abdullah Khan", role: "12 Juz Memorized", initials: "AK" },
        { quote: "Spaced repetition saved my hifdh. I don't forget anymore. Essential for every hafidh.", author: "Fatima El-Sayed", role: "Hafidha in Progress", initials: "FE" },
        { quote: "As a tajweed teacher, I use Mutqin to track students' weak spots instantly.", author: "Ustadh Hisham", role: "Certified Qari", initials: "UH" }
      ]);
      
      const freeFeatures = ref([
        'Core memorisation planner',
        'Basic progress tracking',
        'Limited recitation checks'
      ]);

      const premiumFeatures = ref([
        'Unlimited memorisation planning',
        'Smart revision support',
        'Full progress history',
        '7-day free trial'
      ]);
      
      const proFeatures = ref([
        'Advanced recitation workflow',
        'Detailed analytics',
        'Priority feature access',
        '7-day free trial'
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
        stats,
        floatingBadges,
        features,
        steps,
        testimonials,
        freeFeatures,
        premiumFeatures,
        proFeatures
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
    --bg: #14110f;
    --surface: rgba(31, 27, 24, 0.92);
    --surface-strong: rgba(43, 37, 32, 0.96);
    --border: rgba(255, 236, 216, 0.16);
    --text: #f7ebdf;
    --text-muted: #d1c2b3;
    --accent: #d0a06b;
    --accent-strong: #efc18d;
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
    padding: 6rem 2rem 4rem;
    position: relative;
    overflow: hidden;
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
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5rem;
    align-items: center;
    position: relative;
    z-index: 1;
  }
  
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--accent-light);
    color: var(--accent);
    padding: 0.3rem 1rem;
    border-radius: 40px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }
  
  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 1.5rem;
    letter-spacing: -0.03em;
  }
  
  .hero-title span {
    color: var(--accent);
    border-bottom: 2px solid var(--accent);
  }
  
  .hero-desc {
    font-size: 1.1rem;
    color: var(--text-muted);
    margin-bottom: 2rem;
    line-height: 1.6;
  }
  
  .problem-solution {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 1.5rem;
    margin: 1.5rem 0;
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
  }
  
  .hero-stats {
    display: flex;
    gap: 2.5rem;
    margin-top: 2rem;
    flex-wrap: wrap;
  }
  
  .stat-card .stat-number {
    font-size: 2rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1.2;
  }
  
  .stat-card .stat-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  
  /* Hero Image */
  .hero-image {
    position: relative;
  }
  
  .demo-card {
    background: var(--surface-strong);
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
  .section-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 4rem 2rem;
  }
  
  .section-title {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--text);
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
    margin-bottom: 3rem;
    font-size: 1.1rem;
  }
  
  /* Features Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
    gap: 2rem;
  }
  
  .feature-card {
    background: var(--surface);
    backdrop-filter: blur(4px);
    border-radius: var(--radius);
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }
  
  .feature-icon {
    font-size: 2.5rem;
    color: var(--accent);
    margin-bottom: 1.2rem;
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
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-top: 2rem;
  }
  
  .step-card {
    text-align: center;
    padding: 1.5rem;
    background: var(--surface);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    transition: all 0.3s ease;
  }
  
  .step-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }
  
  .step-number {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    border-radius: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 800;
    color: white;
    margin: 0 auto 1rem;
    box-shadow: var(--shadow-md);
  }
  
  .step-icon {
    font-size: 2rem;
    color: var(--accent);
    margin: 0.5rem 0;
    display: inline-block;
  }
  
  /* Testimonials */
  .testimonials-section {
    background: var(--accent-wash);
  }
  
  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  .testimonial-card {
    background: var(--surface-strong);
    border-radius: var(--radius);
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
  }
  
  .testimonial-card i {
    font-size: 2rem;
    color: var(--accent);
    opacity: 0.6;
  }
  
  .testimonial-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
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
    gap: 2rem;
    max-width: 1180px;
    margin: 0 auto;
  }
  
  .pricing-card {
    background: var(--surface-strong);
    border-radius: 28px;
    padding: 2rem;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
    position: relative;
    text-align: center;
  }
  
  .pricing-icon {
    font-size: 2.5rem;
    color: var(--accent);
    margin-bottom: 1rem;
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
    font-weight: 800;
    color: var(--accent);
    margin: 1rem 0;
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
  
  /* CTA Block */
  .cta-block {
    max-width: 1000px;
    margin: 2rem auto 3rem;
    background: linear-gradient(135deg, var(--accent-wash), var(--surface-strong));
    border-radius: 48px;
    text-align: center;
    padding: 3rem;
    border: 1px solid var(--border);
  }
  
  .cta-icon {
    font-size: 3rem;
    color: var(--accent);
    margin-bottom: 1rem;
  }
  
  .cta-block h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  .cta-block p {
    margin-bottom: 1.5rem;
    color: var(--text-muted);
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
  
  /* Theme Switcher */
  .theme-switcher {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    gap: 8px;
    background: var(--surface-strong);
    padding: 8px 12px;
    border-radius: 60px;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
    z-index: 1000;
    backdrop-filter: blur(10px);
  }
  
  .theme-switcher button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .theme-switcher button.active {
    background: var(--accent);
    color: white;
  }
  
  .theme-switcher button:hover:not(.active) {
    background: var(--accent-light);
    color: var(--accent);
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
    .hero-title { font-size: 2.2rem; }
    .hero-stats { justify-content: center; }
    .steps-grid, .testimonials-grid, .pricing-grid { grid-template-columns: 1fr; }
    .pricing-card.featured { transform: scale(1); }
    .floating-card { display: none; }
    .section-title { font-size: 1.8rem; }
    .section-title::before,
    .section-title::after { display: none; }
    .section-container { padding: 2rem 1.2rem; }
    .theme-switcher { bottom: 10px; right: 10px; }
    .footer-grid { grid-template-columns: 1fr; text-align: center; }
    .footer-brand { max-width: 100%; text-align: center; }
    .footer-logo { justify-content: center; }
    .footer-links a { justify-content: center; }
    .social-icons { justify-content: center; }
    .problem-text, .solution-text { flex-direction: column; text-align: left; }
  }
  </style>
