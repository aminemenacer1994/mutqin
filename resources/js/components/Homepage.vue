<template>
    <div>
      
  
      <!-- FULL WIDTH QURAN BANNER (directly below navbar) -->
      <div class="quran-full-banner">
        <div class="quran-banner-content">
          <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span> ✦
          <span>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span> ✦
          <span>رَبِّ زِدْنِي عِلْمًا</span> ✦
          <span>إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ</span> ✦
          <span>اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ</span> ✦
          <span>وَرَتِّلْهُ تَرْتِيلًا</span> ✦
          <span>وَالْحِسْنِ تَرْتِيلِي</span>
        </div>
      </div>
  
      <main class="shell">
        <!-- Hero Section -->
        <section class="hero">
          <div class="hero-grid">
            <div>
              <div style="background: var(--gold-light); display: inline-block; padding: 4px 16px; border-radius: 40px; font-size: 0.75rem; font-weight: 600;">📖 رَبَّنَا آتِنَا</div>
              <h1 class="hero-title">Memorize the Quran with <span>AI & classical techniques</span></h1>
              <p style="color: var(--text-muted); font-size: 1.1rem;">Chaining • Anchor method • Blur/Focus modes • Smart revision. Not just tajweed — real memorization power.</p>
              <div style="margin: 2rem 0; display: flex; gap: 1rem; flex-wrap: wrap;">
                <a href="#" class="btn-primary"><i class="bi bi-journal-bookmark-fill"></i> Start Memorizing</a>
                <a href="#" class="btn-secondary"><i class="bi bi-mic"></i> AI Recitation Check</a>
              </div>
              <div style="display: flex; gap: 2rem; margin-top: 1rem; flex-wrap: wrap;">
                <div><strong style="color: var(--accent);">🔗 Anchor mode</strong><br><span style="font-size: 0.8rem;">visual linking</span></div>
                <div><strong style="color: var(--accent);">⛓️ Chaining</strong><br><span style="font-size: 0.8rem;">verse connections</span></div>
                <div><strong style="color: var(--accent);">👁️ Blur/Focus</strong><br><span style="font-size: 0.8rem;">progressive recall</span></div>
              </div>
            </div>
            <div style="background: var(--surface-card); border-radius: var(--radius-lg); padding: 2rem; text-align: center; border: 1px solid var(--border);">
              <i class="bi bi-cpu" style="font-size: 3rem; color: var(--accent);"></i>
              <h3 style="margin: 1rem 0;">Two flagship AI tools</h3>
              <p style="margin: 0.5rem 0;"><i class="bi bi-mic-fill" style="color: var(--accent);"></i> <strong>AI Recitation Check</strong><br><span style="font-size: 0.85rem;">letter-level fluency feedback</span></p>
              <p style="margin: 0.5rem 0;"><i class="bi bi-brain" style="color: var(--accent);"></i> <strong>AI Memorization Check</strong><br><span style="font-size: 0.85rem;">predicts weak spots before you forget</span></p>
              <div style="background: var(--accent-light); border-radius: 50px; padding: 0.5rem; margin-top: 1rem; font-size: 0.85rem;">🧠 Smart forgetting curve scheduler</div>
            </div>
          </div>
        </section>
  
        <!-- Features Section (with proper alignment) -->
        <section id="features">
          <h2 class="section-title">Designed for hifdh & retention</h2>
          <p class="section-subtitle">Stacked mode + Mushaf mode • Your sessions, your goals</p>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon"><i class="bi bi-diagram-3"></i></div>
              <h3>Chaining Method <span class="badge">Core</span></h3>
              <p>Link verses like a story. AI remembers which ayah connects to the next — automatic recall triggers.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="bi bi-pin-angle-fill"></i></div>
              <h3>Anchor Mode <span class="badge badge-pro">Pro</span></h3>
              <p>Attach each verse to a mental image, location or emotion. AI suggests anchors based on surah theme.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="bi bi-eye-slash"></i></div>
              <h3>Blur / Focus Mode <span class="badge badge-pro">Pro</span></h3>
              <p>Progressive blurring of words. Train active recall without looking at full mushaf — builds strong memory.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="bi bi-mic"></i></div>
              <h3>AI Recitation Check <span class="badge">Free</span></h3>
              <p>Letter-level analysis to improve fluency. Main goal: strengthen memory anchoring through correct recitation. 25 free checks/day.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="bi bi-cpu"></i></div>
              <h3>AI Memorization Check <span class="badge badge-pro">Flagship</span></h3>
              <p>Predicts verses you're about to forget. Tests you before the forgetting curve hits. Smart revision scheduler.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="bi bi-collection-play"></i></div>
              <h3>Recording Library + Goals</h3>
              <p>Save self-assessments, set daily goals (juz/pages), track accuracy over time. Stacked + Mushaf modes available.</p>
            </div>
          </div>
        </section>
  
        <!-- Stacked vs Mushaf mode switcher -->
        <div style="background: var(--surface-card); border-radius: var(--radius-lg); padding: 2rem; margin: 1rem 0; text-align: center; border: 1px solid var(--border);">
          <div class="mode-switch">
            <button 
              class="mode-btn" 
              :class="{ active: activeMode === 'stacked' }"
              @click="activeMode = 'stacked'"
            >📚 Stacked Mode (line-by-line)</button>
            <button 
              class="mode-btn" 
              :class="{ active: activeMode === 'mushaf' }"
              @click="activeMode = 'mushaf'"
            >🕋 Mushaf Mode (full page)</button>
          </div>
          <p style="color: var(--text-muted);">Switch between modern stacked layout or authentic Madani mushaf. Both support tafsir, tajweed coloring & audio from renowned qaris.</p>
        </div>
  
        <!-- Memorization techniques (3 steps with detailed context) -->
        <section id="techniques">
          <h2 class="section-title">Memorization flow: from new verse to mastery</h2>
          <div class="steps-grid">
            <div class="step-card">
              <div class="step-number">1</div>
              <h3>🎯 Anchor & Chaining</h3>
              <p style="font-size: 0.9rem;">Build mental anchors (images/locations). Chain verses using keywords. AI picks anchor style based on your retention profile.</p>
              <div class="tech-icons"><i class="bi bi-image"></i> <i class="bi bi-link"></i> <i class="bi bi-brightness-alt-high"></i></div>
            </div>
            <div class="step-card">
              <div class="step-number">2</div>
              <h3>🎙️ Self-Assessment Recording</h3>
              <p style="font-size: 0.9rem;">Record yourself reciting from memory. AI checks both memorization accuracy & recitation fluency. Store in personal library.</p>
              <div class="tech-icons"><i class="bi bi-mic"></i> <i class="bi bi-journal-code"></i></div>
            </div>
            <div class="step-card">
              <div class="step-number">3</div>
              <h3>📊 Smart Revision + Analytics</h3>
              <p style="font-size: 0.9rem;">Personalized repetition scheduler. Weak verses pop up before you forget. Detailed heatmap of weak junctions.</p>
              <div class="tech-icons"><i class="bi bi-graph-up"></i> <i class="bi bi-calendar-week"></i></div>
            </div>
          </div>
        </section>
  
        <!-- Integrated recording library & goals -->
        <div style="background: var(--accent-light); border-radius: var(--radius-lg); padding: 2rem; margin: 1rem 0;">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
            <div>
              <h3><i class="bi bi-collection"></i> Your personal memorization library</h3>
              <p style="margin-top: 0.5rem;">Save every recording, track progress per surah, set session goals (pages/day).<br>Integrated with AI memorization check and analytics dashboard.</p>
            </div>
            <div><span class="badge badge-pro" style="background: var(--accent); padding: 0.4rem 1rem;">📈 Detailed Analytics</span></div>
          </div>
        </div>
  
        <!-- Testimonials -->
        <section id="testimonials">
          <h2 class="section-title">What hafidh & students say</h2>
          <div class="features-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
            <div class="feature-card">
              <i class="bi bi-chat-quote" style="font-size: 2rem; color: var(--accent);"></i>
              <p style="margin: 1rem 0;">“Chaining method changed everything. I memorized 2 juz in 3 weeks with anchor mode. AI reminds me exactly before I slip.”</p>
              <h4>— Yusuf M., half-hafidh</h4>
            </div>
            <div class="feature-card">
              <i class="bi bi-chat-quote" style="font-size: 2rem; color: var(--accent);"></i>
              <p style="margin: 1rem 0;">“Stacked mode + self-recording library helped me find my weak transitions. Finally a tool for hifdh, not just tajweed.”</p>
              <h4>— Amina K., teacher</h4>
            </div>
            <div class="feature-card">
              <i class="bi bi-chat-quote" style="font-size: 2rem; color: var(--accent);"></i>
              <p style="margin: 1rem 0;">“AI memorization check predicted I'd forget Al-i-Imran verses. Accurate. The scheduler is a blessing.”</p>
              <h4>— Ibrahim, full-time student</h4>
            </div>
          </div>
        </section>
  
        <!-- Pricing -->
        <section id="pricing">
          <h2 class="section-title">Simple for students, powerful for serious hifdh</h2>
          <div class="pricing-grid">
            <div class="feature-card">
              <h3>🌿 Memorizer Starter</h3>
              <div style="font-size: 2.2rem; font-weight: 800; color: var(--accent);">$0</div>
              <ul style="margin: 1rem 0; list-style: none; padding: 0;">
                <li style="margin: 0.5rem 0;">✓ AI Recitation (25/day)</li>
                <li style="margin: 0.5rem 0;">✓ Chaining + Basic Anchor</li>
                <li style="margin: 0.5rem 0;">✓ Recording library (15 saves)</li>
                <li style="margin: 0.5rem 0;">✓ Stacked mode</li>
              </ul>
              <a href="#" class="btn-secondary" style="width: 100%; justify-content: center; margin-top: auto;">Start Free</a>
            </div>
            <div class="feature-card" style="border: 2px solid var(--accent);">
              <h3>🔥 Full Hifdh <span class="badge badge-pro">Pro</span></h3>
              <div style="font-size: 2.2rem; font-weight: 800; color: var(--accent);">$9.99 <span style="font-size: 1rem;">/month</span></div>
              <ul style="margin: 1rem 0; list-style: none; padding: 0;">
                <li style="margin: 0.5rem 0;">✓ Unlimited AI Recitation + Memorization Check</li>
                <li style="margin: 0.5rem 0;">✓ Anchor mode, Blur/Focus, Smart Chaining AI</li>
                <li style="margin: 0.5rem 0;">✓ Unlimited recordings & analytics heatmap</li>
                <li style="margin: 0.5rem 0;">✓ Mushaf + Stacked mode, Goals & sessions</li>
                <li style="margin: 0.5rem 0;">✓ Forgetting curve scheduler (AI predictions)</li>
              </ul>
              <a href="#" class="btn-primary" style="width: 100%; justify-content: center; margin-top: auto;">Try 7 days free</a>
            </div>
          </div>
        </section>
  
        <!-- CTA -->
        <div style="background: linear-gradient(130deg, var(--accent-soft), var(--surface-card)); border-radius: 40px; padding: 3rem; text-align: center; margin: 2rem 0; border: 1px solid var(--border);">
          <div class="ayah-decoration">"وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا"</div>
          <h2 style="font-size: 2rem; margin-top: 0.5rem;">Set your hifdh goal today</h2>
          <p style="margin: 1rem 0;">Whether it's 1 page per week or 1 juz per month — Mutqin adapts to you.</p>
          <a href="#" class="btn-primary"><i class="bi bi-calendar-check"></i> Create free account</a>
        </div>
      </main>
  
      <!-- Footer -->
      <footer class="footer">
        <div class="shell">
          <div class="footer-links">
            <div class="footer-col">
              <h4 style="color: var(--accent); margin-bottom: 1rem;">Mutqin</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted);">AI for Quran memorization • Anchors • Chaining • Smart revision</p>
            </div>
            <div class="footer-col">
              <a href="#features" @click.prevent="scrollTo('features')">Features</a>
              <a href="#techniques" @click.prevent="scrollTo('techniques')">Techniques</a>
              <a href="#pricing" @click.prevent="scrollTo('pricing')">Pricing</a>
            </div>
            <div class="footer-col">
              <a href="#">Tajweed Guide</a>
              <a href="#">Blog</a>
              <a href="#">Support</a>
            </div>
            <div class="footer-col">
              <div style="display: flex; gap: 1rem;">
                <a href="#"><i class="bi bi-instagram" style="font-size: 1.3rem;"></i></a>
                <a href="#"><i class="bi bi-youtube" style="font-size: 1.3rem;"></i></a>
                <a href="#"><i class="bi bi-telegram" style="font-size: 1.3rem;"></i></a>
              </div>
            </div>
          </div>
          <div style="margin-top: 2rem; text-align: center; font-size: 0.75rem; border-top: 1px solid var(--border); padding-top: 1.5rem; color: var(--text-muted);">
            © 2025 Mutqin — وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ
          </div>
        </div>
      </footer>
    </div>
  </template>
  
  <script>
  export default {
    name: 'MutqinApp',
    data() {
      return {
        activeMode: 'stacked' // 'stacked' or 'mushaf'
      };
    },
    mounted() {
      // Apply prefers-color-scheme on mount
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
  
      // Watch for changes in color scheme preference
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      });
    },
    methods: {
      scrollTo(targetId) {
        const element = document.querySelector(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };
  </script>
  
  <style scoped>
  /* All styles from original go here */
  * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
  }
  
  :root {
      --bg: #fefaf2;
      --surface: rgba(255, 250, 240, 0.96);
      --surface-strong: #fffcf5;
      --surface-card: #ffffff;
      --border: rgba(139, 89, 48, 0.12);
      --border-strong: rgba(139, 89, 48, 0.22);
      --text: #2c2418;
      --text-muted: #7c6b53;
      --text-soft: #9e8b72;
      --accent: #b57c3c;
      --accent-deep: #8b5a2b;
      --accent-soft: #f2e5d4;
      --accent-light: rgba(181, 124, 60, 0.08);
      --gold: #d4af37;
      --gold-light: #f9eec1;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(74, 45, 22, 0.04);
      --shadow-md: 0 8px 24px rgba(74, 45, 22, 0.06);
      --shadow-lg: 0 20px 32px -12px rgba(0, 0, 0, 0.1);
      --radius-md: 20px;
      --radius-lg: 28px;
      --radius-xl: 36px;
      --font-ar: 'Amiri', serif;
      --font-ui: 'Inter', system-ui, sans-serif;
      --shell-max: 1320px;
      --gutter: clamp(16px, 4vw, 40px);
      --nav-h: 74px;
  }
  
  [data-theme="dark"] {
      --bg: #1f1a14;
      --surface: rgba(30, 26, 22, 0.96);
      --surface-strong: #26201a;
      --surface-card: #2b241e;
      --border: rgba(181, 124, 60, 0.2);
      --text: #f2e8dc;
      --text-muted: #b8a890;
      --accent: #cf9f6e;
      --accent-soft: #4a3a2a;
  }
  
  body {
      font-family: var(--font-ui);
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      font-size: 15px;
  }
  
  body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: radial-gradient(circle at 15% 30%, var(--accent-light) 1px, transparent 1px);
      background-size: 48px 48px;
      pointer-events: none;
      z-index: -1;
      opacity: 0.5;
  }
  
  /* Navbar */
  .app-navbar {
      background: var(--surface-strong);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 1000;
  }
  
  .navbar-shell {
      max-width: var(--shell-max);
      margin: 0 auto;
      padding: 12px var(--gutter);
      min-height: var(--nav-h);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
  }
  
  .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      font-family: var(--font-ar);
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--accent);
  }
  
  .brand-icon {
      font-size: 2rem;
      background: var(--accent-light);
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 60%;
  }
  
  /* Nav links in a row */
  .nav-links-desktop {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
  }
  
  .nav-link {
      padding: 8px 18px;
      border-radius: 40px;
      font-weight: 500;
      font-size: 0.9rem;
      color: var(--text-muted);
      transition: all 0.2s;
      text-decoration: none;
  }
  
  .nav-link:hover {
      color: var(--accent);
      background: var(--accent-light);
  }
  
  .app-navbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
  }
  
  .btn-primary {
      background: var(--accent);
      color: white;
      padding: 8px 22px;
      border-radius: 40px;
      font-weight: 600;
      text-decoration: none;
      transition: 0.2s;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
  }
  
  .btn-primary:hover {
      background: var(--accent-deep);
      transform: translateY(-2px);
  }
  
  .btn-secondary {
      border: 1px solid var(--border-strong);
      background: transparent;
      padding: 8px 22px;
      border-radius: 40px;
      color: var(--text);
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
  }
  
  /* Full-width Quran Banner below navbar */
  .quran-full-banner {
      background: linear-gradient(135deg, var(--accent-soft) 0%, #e7d8c4 100%);
      width: 100%;
      padding: 1rem 2rem;
      text-align: center;
      border-bottom: 1px solid var(--border);
      border-top: 1px solid var(--border);
      font-family: var(--font-ar);
      font-size: 1.25rem;
      color: var(--accent-deep);
      letter-spacing: 1px;
      overflow-x: auto;
      white-space: nowrap;
  }
  
  .quran-banner-content {
      display: inline-block;
      animation: scrollBanner 70s linear infinite;
  }
  
  .quran-banner-content span {
      margin: 0 2rem;
  }
  
  @keyframes scrollBanner {
      0% { transform: translateX(0); }
      100% { transform: translateX(-48%); }
  }
  
  .shell {
      max-width: var(--shell-max);
      margin: 0 auto;
      padding: 0 var(--gutter);
  }
  
  section {
      padding: 3.5rem 0;
  }
  
  .section-title {
      font-size: 2.4rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 0.8rem;
      font-family: var(--font-ar);
      color: var(--accent);
  }
  
  .section-subtitle {
      text-align: center;
      color: var(--text-muted);
      max-width: 680px;
      margin: 0 auto 2.5rem;
  }
  
  /* Hero */
  .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      align-items: center;
  }
  
  .hero-title {
      font-size: 3rem;
      font-weight: 800;
      line-height: 1.2;
      margin: 1rem 0;
  }
  
  .hero-title span {
      color: var(--accent);
      border-bottom: 3px solid var(--gold);
  }
  
  /* Feature Cards - aligned */
  .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
  }
  
  .feature-card {
      background: var(--surface-card);
      border-radius: var(--radius-md);
      padding: 1.8rem;
      border: 1px solid var(--border);
      transition: all 0.25s;
      height: 100%;
      display: flex;
      flex-direction: column;
  }
  
  .feature-card:hover {
      transform: translateY(-5px);
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
  }
  
  .feature-icon {
      font-size: 2.2rem;
      color: var(--accent);
      margin-bottom: 1rem;
  }
  
  .badge {
      background: var(--accent-light);
      border-radius: 30px;
      padding: 0.2rem 0.8rem;
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 0.6rem;
      vertical-align: middle;
  }
  
  .badge-pro {
      background: var(--accent);
      color: white;
  }
  
  /* Steps with techniques */
  .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
  }
  
  .step-card {
      background: var(--surface-card);
      border-radius: var(--radius-md);
      padding: 1.8rem;
      text-align: center;
      border: 1px solid var(--border);
      transition: all 0.25s;
  }
  
  .step-card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
  }
  
  .step-number {
      width: 64px;
      height: 64px;
      background: var(--accent);
      color: white;
      border-radius: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: bold;
      margin: 0 auto 1rem;
  }
  
  .tech-icons {
      display: flex;
      justify-content: center;
      gap: 0.6rem;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: var(--accent);
  }
  
  /* Mode switcher */
  .mode-switch {
      background: var(--surface-card);
      border-radius: 80px;
      padding: 0.4rem;
      display: inline-flex;
      gap: 0.5rem;
      border: 1px solid var(--border);
      margin-bottom: 1rem;
  }
  
  .mode-btn {
      padding: 0.5rem 1.5rem;
      border-radius: 60px;
      background: transparent;
      border: none;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s;
  }
  
  .mode-btn.active {
      background: var(--accent);
      color: white;
  }
  
  .pricing-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
      max-width: 900px;
      margin: 0 auto;
  }
  
  .footer {
      background: var(--surface-card);
      border-top: 1px solid var(--border);
      padding: 2rem 0;
      margin-top: 2rem;
  }
  
  .footer-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 2rem;
  }
  
  .footer-col a {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
  }
  
  .footer-col a:hover {
      color: var(--accent);
  }
  
  @media (max-width: 880px) {
      .hero-grid {
          grid-template-columns: 1fr;
      }
      .steps-grid {
          grid-template-columns: 1fr;
      }
      .pricing-grid {
          grid-template-columns: 1fr;
      }
      .navbar-shell {
          flex-direction: column;
          align-items: center;
      }
      .nav-links-desktop {
          justify-content: center;
      }
  }
  
  @media (max-width: 640px) {
      .hero-title {
          font-size: 2rem;
      }
      .section-title {
          font-size: 1.8rem;
      }
  }
  
  .ayah-decoration {
      font-family: var(--font-ar);
      font-size: 1.4rem;
      color: var(--accent);
      text-align: center;
      margin: 1rem 0;
  }
  </style>