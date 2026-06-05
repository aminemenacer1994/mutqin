<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const mobileMenuOpen = ref(false);
const animatedWidth = ref(0);
const openFaq = ref(null);
const showContactForm = ref(false);

const faqs = ref([
    {
        question: 'I forget verses I memorised years ago. Can Mutqin really help?',
        answer: "Yes — that's exactly what we built this for. Our system identifies weak verses based on your recall patterns and schedules precise revision to rebuild those foundations. Many users have recovered 'lost' juz within weeks.",
    },
    {
        question: 'How is this different from Anki or other flashcard apps?',
        answer: "Anki is generic spaced repetition. Mutqin is built specifically for Qur'an memorisation with features like ayah-level tracking, proper Arabic script, tajweed markers, and revision schedules designed by huffadh, not generalists.",
    },
    {
        question: 'I only have 10 minutes a day. Is that enough?',
        answer: "Yes. Our algorithm is optimised for micro-sessions. 10-15 minutes daily is enough to maintain most people's Hifz. We prioritise efficiency over volume.",
    },
    {
        question: 'What if I skip a few days?',
        answer: 'Life happens — we get it. The algorithm adjusts when you return, prioritising the verses most at risk. No guilt, no punishments. Just a smart system that meets you where you are.',
    },
    {
        question: 'Do I need to be tech-savvy to use this?',
        answer: "Not at all. The interface is clean and simple. If you can send an email, you can use Mutqin. We've tested it with users aged 12 to 75.",
    },
]);

let progressTimer = null;

function setBodyScrollLock(locked) {
    document.body.style.overflow = locked ? 'hidden' : '';
}

function toggleMobileMenu() {
    mobileMenuOpen.value = !mobileMenuOpen.value;
    setBodyScrollLock(mobileMenuOpen.value);
}

function closeMobileMenu() {
    mobileMenuOpen.value = false;
    setBodyScrollLock(false);
}

function toggleFaq(index) {
    openFaq.value = openFaq.value === index ? null : index;
}

function openContact() {
    closeMobileMenu();
    showContactForm.value = true;
    setTimeout(() => {
        document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function startJourney() {
    closeMobileMenu();
    alert("Start your 14-day free trial. No credit card required. Let's fix your retention together.");
}

function showDemo() {
    closeMobileMenu();
    alert('Watch how Mutqin finds your weak spots before you forget them. Request a demo: support@Mutqin.com');
}

function startMonthly() {
    closeMobileMenu();
    alert('Monthly plan: $9.99/month (≈ £7.99) • 14-day free trial • Cancel anytime');
}

function startAnnual() {
    closeMobileMenu();
    alert('Annual plan: $79.99/year (≈ £63.99) • Save 33% • 14-day free trial');
}

function startLifetime() {
    closeMobileMenu();
    alert('Lifetime plan: $249 one-time (≈ £199) • 14-day free trial • Never pay again');
}

function submitContact() {
    alert("Thank you for reaching out. We'll respond within 24 hours, insha'Allah.");
    showContactForm.value = false;
}

onMounted(() => {
    progressTimer = window.setTimeout(() => {
        animatedWidth.value = 92;
    }, 300);
});

onBeforeUnmount(() => {
    if (progressTimer) window.clearTimeout(progressTimer);
    setBodyScrollLock(false);
});
</script>

<template>
    <div class="landing-page">
        <!-- Decorative background elements -->
        <div class="bg-ornament"></div>
        <div class="bg-grid"></div>

        <!-- Navigation -->
        <nav class="navbar">
            <div class="container nav-container">
                <div class="logo">
                    <span class="logo-mark">۞</span>
                    <span class="logo-text">Mutqin</span>
                </div>
                <div class="nav-links-desktop">
                    <a href="#how-it-works" class="nav-link">Method</a>
                    <a href="#pricing" class="nav-link">Pricing</a>
                    <a href="#faq" class="nav-link">FAQ</a>
                    <button class="nav-link cta-btn" @click="startJourney">Start Free Trial</button>
                </div>
                <button class="mobile-menu-btn" @click="toggleMobileMenu">
                    <span></span><span></span><span></span>
                </button>
            </div>
            <div class="nav-links-mobile" :class="{ active: mobileMenuOpen }">
                <a href="#how-it-works" class="nav-link" @click="closeMobileMenu">Method</a>
                <a href="#pricing" class="nav-link" @click="closeMobileMenu">Pricing</a>
                <a href="#faq" class="nav-link" @click="closeMobileMenu">FAQ</a>
                <button class="nav-link cta-btn mobile" @click="startJourney">Start Free Trial</button>
            </div>
        </nav>

        <!-- HERO: Pain point + solution, no fluff -->
        <section class="hero">
            <div class="container hero-grid">
                <div class="hero-content">
                    <div class="arabic-calligraphy">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                    <h1 class="hero-title">
                        You memorised.<br>
                        <span class="pain-text">Then you forgot.</span>
                    </h1>
                    <div class="pain-box">
                        <div class="pain-item">
                            <span class="pain-icon">⚠️</span>
                            <span>Months of Hifz lost because life got busy.</span>
                        </div>
                        <div class="pain-item">
                            <span class="pain-icon">😔</span>
                            <span>No structured revision = weak verses fade.</span>
                        </div>
                        <div class="pain-item">
                            <span class="pain-icon">📉</span>
                            <span>Generic apps don't understand Qur'an retention.</span>
                        </div>
                    </div>
                    <div class="solution-statement">
                        <span class="solution-icon">✨</span>
                        <p>Mutqin: A precision system that finds weak verses <strong>before you forget them</strong> and schedules 15-min daily revision.</p>
                    </div>
                    <div class="hero-actions">
                        <button class="btn btn-primary btn-large" @click="startJourney">Fix My Retention →</button>
                        <button class="btn btn-outline btn-large" @click="showDemo">See How It Works</button>
                    </div>
                    <p class="hero-note">14-day free trial • No credit card • Cancel anytime</p>
                </div>

                <!-- Dashboard preview (screenshot placeholder) -->
                <div class="hero-preview">
                    <div class="preview-card">
                        <div class="preview-header">
                            <span class="preview-badge">📊 Live Dashboard</span>
                            <span class="preview-badge">92% Retention</span>
                        </div>
                        <div class="screenshot-placeholder">
                            <div class="mock-dashboard">
                                <div class="mock-surah">
                                    <span>Surah Al-Baqarah</span>
                                    <span>Verses 1–286</span>
                                </div>
                                <div class="mock-progress">
                                    <div class="mock-bar-fill" :style="{ width: animatedWidth + '%' }"></div>
                                </div>
                                <div class="mock-stats">
                                    <div><span>Weak verses</span><strong>4 need review</strong></div>
                                    <div><span>Today's revision</span><strong>12 verses</strong></div>
                                    <div><span>Current streak</span><strong>37 days</strong></div>
                                </div>
                            </div>
                        </div>
                        <div class="preview-caption">[ App Screenshot Placeholder — Real-time retention map ]</div>
                    </div>
                    <div class="trust-badge">Trusted by 3,200+ Huffadh worldwide</div>
                </div>
            </div>
        </section>

        <!-- Feature snapshot: Three clear steps -->
        <section id="how-it-works" class="steps-section">
            <div class="container">
                <div class="section-header">
                    <span class="section-tag">The Mutqin Method</span>
                    <h2>Three steps. Zero forgetfulness.</h2>
                    <p>No gamification. No noise. Just a system that works.</p>
                </div>
                <div class="steps-grid">
                    <div class="step-card">
                        <div class="step-number">1</div>
                        <div class="step-icon">📖</div>
                        <h3>Tell us what you know</h3>
                        <p>Import your Hifz or start fresh. We map your weak spots immediately.</p>
                        <div class="step-outcome">→ Personalised forgetting-risk map</div>
                    </div>
                    <div class="step-card">
                        <div class="step-number">2</div>
                        <div class="step-icon">⏱️</div>
                        <h3>Revise 15 min daily</h3>
                        <p>Our algorithm serves verses just before you'd forget them. Not too early, not too late.</p>
                        <div class="step-outcome">→ 89% retention after 6 months*</div>
                    </div>
                    <div class="step-card">
                        <div class="step-number">3</div>
                        <div class="step-icon">🛡️</div>
                        <h3>Never lose an ayah again</h3>
                        <p>Weak verses flagged in advance. No surprises, just peace of mind.</p>
                        <div class="step-outcome">→ Your Hifz is protected forever</div>
                    </div>
                </div>
                <p class="steps-footnote">*Based on beta user data (n=247). Guaranteed improvement or your money back.</p>
            </div>
        </section>

        <!-- Testimonials (real voices) -->
        <section class="testimonials">
            <div class="container">
                <div class="section-header">
                    <span class="section-tag">Real Huffadh</span>
                    <h2>What they're saying</h2>
                </div>
                <div class="testimonial-grid">
                    <div class="testimonial">
                        <div class="quote-mark">"</div>
                        <p>After 8 years of Hifz, I was forgetting faster than I could revise. Mutqin changed that. My retention went from 60% to 89% in 4 months. Alhamdulillah.</p>
                        <div class="author">— Abu Abdullah, Hafiz & Teacher</div>
                    </div>
                    <div class="testimonial">
                        <div class="quote-mark">"</div>
                        <p>As a working mother of three, I barely had time. Mutqin's 15-minute sessions fit perfectly. I've finally stopped forgetting what I memorised years ago.</p>
                        <div class="author">— Fatima, Mother & Hafiza</div>
                    </div>
                    <div class="testimonial">
                        <div class="quote-mark">"</div>
                        <p>Other apps overwhelmed me. Mutqin's gentle approach gave me confidence. I've now completed 5 juz and remember them all.</p>
                        <div class="author">— Aisha, University Student</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Screenshot placeholder row (additional) -->
        <section class="screenshot-showcase">
            <div class="container">
                <div class="screenshot-row">
                    <div class="screenshot-card">
                        <div class="screen-placeholder dark">
                            <div class="mock-ui">
                                <div class="mock-header">📋 Revision Queue</div>
                                <div class="mock-list">
                                    <div class="mock-item red">Al-Baqarah 2:15 ⚠️ Weak</div>
                                    <div class="mock-item amber">Al-Baqarah 2:22 🟡 Due soon</div>
                                    <div class="mock-item green">Al-Baqarah 2:37 ✅ Strong</div>
                                </div>
                            </div>
                        </div>
                        <p>🔍 Smart weak-spot detection</p>
                    </div>
                    <div class="screenshot-card">
                        <div class="screen-placeholder">
                            <div class="mock-ui">
                                <div class="mock-header">📈 Retention Graph</div>
                                <div class="mock-graph"></div>
                            </div>
                        </div>
                        <p>📊 Real progress metrics</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Why Mutqin vs others (no fluff) -->
        <section class="comparison">
            <div class="container">
                <div class="section-header">
                    <span class="section-tag">No comparison</span>
                    <h2>Other apps vs. Mutqin</h2>
                </div>
                <div class="compare-grid">
                    <div class="compare-card other">
                        <h3>Generic Apps</h3>
                        <ul>
                            <li>❌ Focus on how FAST you memorise</li>
                            <li>❌ Gamify the Qur'an with badges</li>
                            <li>❌ Fixed revision intervals</li>
                            <li>❌ You realise after you forget</li>
                        </ul>
                    </div>
                    <div class="vs">VS</div>
                    <div class="compare-card mutqin">
                        <h3>Mutqin</h3>
                        <ul>
                            <li>✅ Focus on what you KEEP forever</li>
                            <li>✅ No gamification — sincere progress</li>
                            <li>✅ Adaptive to YOUR recall</li>
                            <li>✅ Flags weak verses BEFORE they fade</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- Pricing (clear, straight) -->
        <section id="pricing" class="pricing">
            <div class="container">
                <div class="section-header">
                    <span class="section-tag">Fair pricing</span>
                    <h2>Invest in what matters</h2>
                    <p>14-day free trial • Cancel anytime</p>
                </div>
                <div class="pricing-grid">
                    <div class="pricing-card">
                        <div class="plan-name">Monthly</div>
                        <div class="price">$9.99 <span>/ month</span></div>
                        <ul>
                            <li>Full retention engine</li>
                            <li>Unlimited verses & surahs</li>
                            <li>Personalised revision</li>
                        </ul>
                        <button class="btn btn-outline full" @click="startMonthly">Start free trial →</button>
                    </div>
                    <div class="pricing-card featured">
                        <div class="popular">Best value</div>
                        <div class="plan-name">Annual</div>
                        <div class="price">$79.99 <span>/ year</span></div>
                        <div class="savings">Save 33% • 2 months free</div>
                        <ul>
                            <li>Everything in Monthly</li>
                            <li>Priority support</li>
                            <li>Family sharing (up to 3)</li>
                        </ul>
                        <button class="btn btn-primary full" @click="startAnnual">Start free trial →</button>
                    </div>
                    <div class="pricing-card">
                        <div class="plan-name">Lifetime</div>
                        <div class="price">$249 <span>one time</span></div>
                        <ul>
                            <li>Everything in Annual</li>
                            <li>Lifetime updates</li>
                            <li>Family sharing (up to 5)</li>
                        </ul>
                        <button class="btn btn-outline full" @click="startLifetime">Start free trial →</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- FAQ (direct answers) -->
        <section id="faq" class="faq">
            <div class="container">
                <div class="section-header">
                    <span class="section-tag">Questions</span>
                    <h2>Straight answers</h2>
                </div>
                <div class="faq-list">
                    <div v-for="(faq, i) in faqs" :key="i" class="faq-item" @click="toggleFaq(i)">
                        <div class="faq-question">
                            <span>{{ faq.question }}</span>
                            <svg :class="{ rotated: openFaq === i }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        <div class="faq-answer" :class="{ open: openFaq === i }">
                            <p>{{ faq.answer }}</p>
                        </div>
                    </div>
                </div>
                <div class="faq-footer">
                    <button class="btn-link" @click="openContact">Still have questions? Contact our team →</button>
                </div>
            </div>
        </section>

        <!-- Contact form (clean, no spam) -->
        <section id="contact-form" v-if="showContactForm" class="contact-section">
            <div class="container">
                <div class="contact-card">
                    <div class="contact-info">
                        <div class="contact-emoji">📬</div>
                        <h3>We're here for you</h3>
                        <p>Questions about Mutqin? Need help with your Hifz journey? Our team responds within 24 hours, insha'Allah.</p>
                        <div class="contact-detail">✉️ support@Mutqin.com</div>
                        <div class="contact-detail">⏱️ Response within 24h</div>
                        <div class="dua">“And when My servants ask you concerning Me — indeed I am near.” (Qur'an 2:186)</div>
                    </div>
                    <form class="contact-form" @submit.prevent="submitContact">
                        <input type="text" placeholder="Your name" required>
                        <input type="email" placeholder="Email address" required>
                        <textarea placeholder="How can we help?" rows="3" required></textarea>
                        <button type="submit" class="btn btn-primary">Send message →</button>
                        <button type="button" class="btn btn-outline" @click="showContactForm = false">Close</button>
                    </form>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="footer">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-brand">
                        <div class="footer-logo">Mutqin <span>نور على نور</span></div>
                        <p>Preserving the Qur'an in hearts, one ayah at a time.</p>
                    </div>
                    <div class="footer-links">
                        <a href="#how-it-works">Method</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#faq">FAQ</a>
                        <a href="#" @click.prevent="openContact">Contact</a>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>© 2025 Mutqin. Made with رحمة for the Ummah.</p>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
/* ------------------------------
   CLEAN, RESPECTFUL ISLAMIC DESIGN
   No fluff — high contrast, elegant, animations
------------------------------ */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.landing-page {
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    background: #FCF9F2;
    color: #1E2F2A;
    line-height: 1.5;
    scroll-behavior: smooth;
}

.container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
}

/* Background depth */
.bg-ornament {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 10% 20%, rgba(176, 136, 79, 0.02), transparent 70%);
    pointer-events: none;
    z-index: 0;
}

.bg-grid {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.12'%3E%3Cpath fill='none' stroke='%23B0884F' stroke-width='0.4' d='M10 10h80v80H10z'/%3E%3Cpath fill='none' stroke='%23B0884F' stroke-width='0.3' d='M25 25h50v50H25z'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 40px;
    pointer-events: none;
    opacity: 0.3;
    z-index: 0;
}

/* Navbar */
.navbar {
    position: sticky;
    top: 0;
    background: rgba(252, 249, 242, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(176, 136, 79, 0.15);
    z-index: 1000;
}

.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.3px;
}

.logo-mark {
    color: #B0884F;
    font-size: 1.6rem;
}

.logo-text {
    background: linear-gradient(135deg, #1E2F2A, #B0884F);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
}

.nav-links-desktop {
    display: flex;
    gap: 32px;
    align-items: center;
}

.nav-link {
    text-decoration: none;
    color: #3A4D45;
    font-weight: 500;
    font-size: 0.9rem;
    transition: color 0.2s;
    cursor: pointer;
    background: none;
    border: none;
}

.nav-link:hover {
    color: #B0884F;
}

.cta-btn {
    background: #1E5A4A;
    color: white;
    padding: 8px 20px;
    border-radius: 100px;
    font-weight: 600;
}

.cta-btn:hover {
    background: #15483b;
    color: white;
    transform: translateY(-1px);
}

.mobile-menu-btn {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
}

.mobile-menu-btn span {
    width: 22px;
    height: 2px;
    background: #1E2F2A;
}

.nav-links-mobile {
    position: fixed;
    top: 72px;
    left: -100%;
    width: 100%;
    background: #FCF9F2;
    flex-direction: column;
    gap: 20px;
    padding: 30px;
    transition: 0.3s;
    z-index: 999;
    box-shadow: 0 20px 30px -10px rgba(0,0,0,0.05);
}

.nav-links-mobile.active {
    left: 0;
}

/* Hero */
.hero {
    padding: 80px 0 100px;
    position: relative;
    z-index: 2;
}

.hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
}

.arabic-calligraphy {
    font-family: 'Amiri', 'Times New Roman', serif;
    font-size: 1.1rem;
    color: #B0884F;
    margin-bottom: 24px;
    letter-spacing: 1px;
}

.hero-title {
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 24px;
    color: #1E2F2A;
}

.pain-text {
    color: #B0884F;
    position: relative;
    display: inline-block;
}

.pain-box {
    background: rgba(176, 136, 79, 0.08);
    border-radius: 24px;
    padding: 20px;
    margin: 28px 0;
    border-left: 3px solid #B0884F;
}

.pain-item {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 0.95rem;
    padding: 8px 0;
    color: #2C423A;
}

.solution-statement {
    display: flex;
    gap: 12px;
    background: #E9F0EC;
    padding: 16px 20px;
    border-radius: 20px;
    margin: 24px 0;
    font-weight: 500;
}

.solution-icon {
    font-size: 1.5rem;
}

.hero-actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin: 28px 0 16px;
}

.btn {
    padding: 12px 28px;
    border-radius: 100px;
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: #1E5A4A;
    color: white;
    box-shadow: 0 4px 10px rgba(30, 90, 74, 0.2);
}

.btn-primary:hover {
    background: #134436;
    transform: translateY(-2px);
}

.btn-outline {
    background: transparent;
    border: 1.5px solid #B0884F;
    color: #B0884F;
}

.btn-outline:hover {
    background: rgba(176, 136, 79, 0.05);
}

.btn-large {
    padding: 14px 32px;
    font-size: 1rem;
}

.hero-note {
    font-size: 0.75rem;
    color: #6F8B7F;
}

/* Preview Card */
.hero-preview {
    position: relative;
}

.preview-card {
    background: white;
    border-radius: 32px;
    padding: 24px;
    box-shadow: 0 20px 35px -12px rgba(0,0,0,0.08);
    border: 1px solid rgba(176,136,79,0.2);
}

.preview-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}

.preview-badge {
    font-size: 0.7rem;
    background: #F0EDE5;
    padding: 4px 12px;
    border-radius: 20px;
}

.screenshot-placeholder {
    background: #F5F2EA;
    border-radius: 24px;
    padding: 20px;
    margin: 16px 0;
    min-height: 240px;
}

.mock-dashboard {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.mock-surah {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
}

.mock-progress {
    background: #E2DCD0;
    border-radius: 20px;
    height: 8px;
    overflow: hidden;
}

.mock-bar-fill {
    background: #B0884F;
    height: 100%;
    width: 0%;
    transition: width 1s ease;
    border-radius: 20px;
}

.mock-stats {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
}

.mock-stats div {
    font-size: 0.8rem;
}

.preview-caption {
    text-align: center;
    font-size: 0.7rem;
    color: #8FAA9E;
    margin-top: 12px;
}

.trust-badge {
    text-align: center;
    margin-top: 24px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #1E5A4A;
}

/* Steps */
.steps-section {
    padding: 80px 0;
    background: #FDFBF8;
}

.section-header {
    text-align: center;
    margin-bottom: 56px;
}

.section-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #B0884F;
    font-weight: 600;
}

.section-header h2 {
    font-size: 2rem;
    font-weight: 700;
    margin: 12px 0 8px;
    color: #1E2F2A;
}

.section-header p {
    color: #5A786C;
}

.steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
}

.step-card {
    background: white;
    padding: 32px;
    border-radius: 28px;
    border: 1px solid rgba(176,136,79,0.1);
    transition: all 0.25s;
}

.step-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 30px -12px rgba(0,0,0,0.05);
}

.step-number {
    font-size: 0.7rem;
    font-weight: 700;
    color: #B0884F;
    margin-bottom: 16px;
}

.step-icon {
    font-size: 2rem;
    margin-bottom: 20px;
}

.step-card h3 {
    font-size: 1.2rem;
    margin-bottom: 10px;
}

.step-card p {
    color: #5A786C;
    font-size: 0.85rem;
    margin-bottom: 20px;
}

.step-outcome {
    font-size: 0.8rem;
    font-weight: 600;
    color: #1E5A4A;
    background: #ECF3EF;
    padding: 8px 12px;
    border-radius: 16px;
    display: inline-block;
}

.steps-footnote {
    text-align: center;
    margin-top: 48px;
    font-size: 0.7rem;
    color: #8FAA9E;
}

/* Testimonials */
.testimonials {
    padding: 80px 0;
    background: #FCF9F2;
}

.testimonial-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
}

.testimonial {
    background: white;
    padding: 32px;
    border-radius: 24px;
    border: 1px solid #EEE7DD;
}

.quote-mark {
    font-size: 3rem;
    color: #B0884F;
    font-family: serif;
    line-height: 1;
}

.testimonial p {
    margin: 16px 0;
    font-style: italic;
    color: #2C423A;
}

.author {
    font-size: 0.75rem;
    color: #8FAA9E;
}

/* Screenshot showcase */
.screenshot-showcase {
    padding: 60px 0;
    background: #FDFBF8;
}

.screenshot-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
}

.screenshot-card {
    text-align: center;
}

.screen-placeholder {
    background: #F0EDE5;
    border-radius: 28px;
    padding: 24px;
    min-height: 260px;
    margin-bottom: 16px;
    border: 1px dashed #B0884F;
}

.screen-placeholder.dark {
    background: #2C423A;
    color: white;
}

.mock-ui {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.mock-header {
    font-weight: 600;
    font-size: 0.9rem;
}

.mock-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mock-item {
    background: rgba(0,0,0,0.05);
    padding: 10px;
    border-radius: 12px;
    font-size: 0.8rem;
}

.mock-item.red { background: rgba(200, 70, 70, 0.1); border-left: 3px solid #c84747; }
.mock-item.amber { background: rgba(200, 150, 50, 0.1); border-left: 3px solid #c8962e; }
.mock-item.green { background: rgba(30, 90, 74, 0.1); border-left: 3px solid #1e5a4a; }

.mock-graph {
    height: 100px;
    background: linear-gradient(90deg, #B0884F 30%, #DBC7A9 70%);
    border-radius: 16px;
}

/* Comparison */
.comparison {
    padding: 80px 0;
    background: #FCF9F2;
}

.compare-grid {
    display: flex;
    justify-content: center;
    gap: 48px;
    align-items: stretch;
    flex-wrap: wrap;
}

.compare-card {
    flex: 1;
    background: white;
    padding: 40px;
    border-radius: 28px;
    min-width: 280px;
}

.compare-card.other {
    border: 1px solid #E2DCD0;
}

.compare-card.mutqin {
    border: 1px solid #B0884F;
    background: linear-gradient(145deg, white, #FEFAF5);
}

.compare-card h3 {
    font-size: 1.3rem;
    margin-bottom: 24px;
}

.compare-card ul {
    list-style: none;
}

.compare-card li {
    padding: 12px 0;
    border-bottom: 1px solid #EFEAE2;
}

.vs {
    font-weight: 800;
    font-size: 1.2rem;
    color: #B0884F;
    align-self: center;
    background: #F0EDE5;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 60px;
}

/* Pricing */
.pricing {
    padding: 80px 0;
    background: #FDFBF8;
}

.pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    margin-top: 48px;
}

.pricing-card {
    background: white;
    border-radius: 32px;
    padding: 36px 28px;
    border: 1px solid #EFEAE2;
    position: relative;
}

.pricing-card.featured {
    border: 2px solid #B0884F;
    transform: scale(1.02);
    box-shadow: 0 20px 30px -15px rgba(176,136,79,0.15);
}

.popular {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #B0884F;
    color: white;
    padding: 4px 16px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 600;
}

.plan-name {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 12px;
}

.price {
    font-size: 2rem;
    font-weight: 800;
    color: #1E2F2A;
}

.price span {
    font-size: 0.9rem;
    font-weight: normal;
    color: #8FAA9E;
}

.savings {
    font-size: 0.7rem;
    color: #1E5A4A;
    margin: 8px 0 20px;
}

.pricing-card ul {
    list-style: none;
    margin: 28px 0;
}

.pricing-card li {
    padding: 8px 0;
    font-size: 0.85rem;
    padding-left: 24px;
    position: relative;
}

.pricing-card li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: #B0884F;
    font-weight: 700;
}

.full {
    width: 100%;
}

/* FAQ */
.faq {
    padding: 80px 0;
    background: #FCF9F2;
}

.faq-list {
    max-width: 800px;
    margin: 0 auto;
}

.faq-item {
    background: white;
    border-radius: 20px;
    margin-bottom: 12px;
    border: 1px solid #EFEAE2;
    cursor: pointer;
}

.faq-question {
    display: flex;
    justify-content: space-between;
    padding: 20px 28px;
    font-weight: 600;
}

.faq-question svg {
    width: 18px;
    transition: transform 0.2s;
    color: #B0884F;
}

.faq-question svg.rotated {
    transform: rotate(180deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s;
    padding: 0 28px;
}

.faq-answer.open {
    max-height: 200px;
    padding: 0 28px 22px 28px;
}

.faq-answer p {
    color: #5A786C;
    font-size: 0.85rem;
}

.faq-footer {
    text-align: center;
    margin-top: 32px;
}

.btn-link {
    background: none;
    border: none;
    color: #B0884F;
    font-weight: 500;
    cursor: pointer;
}

/* Contact */
.contact-section {
    padding: 60px 0;
    background: #FDFBF8;
}

.contact-card {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 48px;
    background: white;
    border-radius: 32px;
    padding: 48px;
    border: 1px solid #EFEAE2;
}

.contact-emoji {
    font-size: 2.5rem;
    margin-bottom: 16px;
}

.contact-info h3 {
    font-size: 1.3rem;
    margin-bottom: 12px;
}

.contact-detail {
    margin: 16px 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
}

.dua {
    margin-top: 24px;
    font-style: italic;
    font-size: 0.75rem;
    color: #B0884F;
    border-top: 1px solid #EFEAE2;
    padding-top: 20px;
}

.contact-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.contact-form input, .contact-form textarea {
    padding: 14px 18px;
    border: 1px solid #E2DCD0;
    border-radius: 20px;
    font-family: inherit;
}

/* Footer */
.footer {
    background: #1E2F2A;
    color: #C8DCD2;
    padding: 56px 0 32px;
}

.footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 32px;
    margin-bottom: 48px;
}

.footer-logo {
    font-size: 1.2rem;
    font-weight: 700;
    color: white;
}

.footer-logo span {
    color: #B0884F;
}

.footer-links {
    display: flex;
    gap: 32px;
}

.footer-links a {
    color: #C8DCD2;
    text-decoration: none;
    font-size: 0.8rem;
}

.footer-bottom {
    text-align: center;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 32px;
    font-size: 0.7rem;
}

/* Responsive */
@media (max-width: 1000px) {
    .hero-grid, .steps-grid, .testimonial-grid, .pricing-grid, .screenshot-row {
        grid-template-columns: 1fr;
    }
    .compare-grid {
        flex-direction: column;
    }
    .vs {
        transform: rotate(90deg);
        margin: 20px auto;
    }
    .nav-links-desktop {
        display: none;
    }
    .mobile-menu-btn {
        display: flex;
    }
    .contact-card {
        grid-template-columns: 1fr;
    }
    .pricing-card.featured {
        transform: none;
    }
}
@media (max-width: 640px) {
    .container {
        padding: 0 20px;
    }
    .hero-actions {
        flex-direction: column;
    }
    .btn-large {
        width: 100%;
        text-align: center;
    }
}
</style>