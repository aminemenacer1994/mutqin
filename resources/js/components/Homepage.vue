<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const mobileMenuOpen = ref(false);
const animatedWidth = ref(0);
const openFaq = ref(null);

const faqs = ref([
    {
        question: 'I forget verses I memorised years ago. Can Mutqin really help?',
        answer: "Yes and that's exactly what we built this for. Our system identifies weak verses based on your recall patterns and schedules revision to rebuild those foundations. Many users have recovered 'lost' juz within weeks.",
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
        answer: 'Life happens we get it. The algorithm adjusts when you return, prioritising the verses most at risk. No guilt, no punishments. Just a smart system that meets you where you are.',
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
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
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
}

onMounted(() => {
    progressTimer = window.setTimeout(() => {
        animatedWidth.value = 92;
    }, 300);
});

onBeforeUnmount(() => {
    if (progressTimer) window.clearTimeout(progressTimer);
    // Ensure scroll lock never persists if user navigates away with the menu open.
    setBodyScrollLock(false);
});
</script>

<template>
    <div class="landing-page">
        <div class="bg-pattern"></div>
        <div class="bg-gradient"></div>

        <!-- HERO SECTION -->
        <section class="hero-section">
            <div class="hero-ornament-left"></div>
            <div class="hero-ornament-right"></div>
            <div class="container">
                <div class="hero-grid">
                    <div class="hero-left">
                        <div class="hero-badge">
                            <span class="badge-dot"></span>
                            <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                        </div>
                        <h1 class="hero-title">
                            You memorised. <br />
                            <span class="highlight">Then you forgot.</span>
                        </h1>
                        <p class="hero-description">
                            We get it. Months maybe years of Hifz. Then life happened. Work. Kids. Exams. <br />
                            And slowly, those āyāt slipped away.
                        </p>
                        <div class="pain-solution">
                            <div class="pain">
                                <svg class="pain-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
                                </svg>
                                <span>The problem: No structured revision.</span>
                            </div>
                            <div class="solution">
                                <svg class="solution-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                <span>Our solution: A retention system that finds weak spots before you forget.</span>
                            </div>
                        </div>
                        <div class="hero-actions">
                            <button type="button" class="btn btn-primary btn-lg" @click="startJourney">Fix my retention →</button>
                            <button type="button" class="btn btn-outline btn-lg" @click="showDemo">See how it works</button>
                        </div>
                        <p class="no-credit">14-day free trial • No credit card • Cancel anytime</p>
                    </div>

                    <div class="hero-right">
                        <div class="dashboard-card">
                            <div class="dashboard-glow"></div>
                            <div class="card-header">
                                <div class="day-badge">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Day 127
                                </div>
                                <div class="retention-badge">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                        <path d="M2 17l10 5 10-5" />
                                        <path d="M2 12l10 5 10-5" />
                                    </svg>
                                    92% retained
                                </div>
                            </div>
                            <div class="surah-info">
                                <span class="surah-name">Surah Al-Baqarah</span>
                                <span class="ayah-range">Verses 1–286</span>
                            </div>
                            <div class="progress-section">
                                <div class="progress-label">
                                    <span>Retention strength</span>
                                    <strong>92%</strong>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" :style="{ width: animatedWidth + '%' }"></div>
                                </div>
                            </div>
                            <div class="revision-info">
                                <div class="revision-item">
                                    <span class="revision-label">Weak verses</span>
                                    <span class="revision-value">4 need review</span>
                                </div>
                                <div class="revision-item">
                                    <span class="revision-label">Today's revision</span>
                                    <span class="revision-value">12 verses</span>
                                </div>
                                <div class="revision-item">
                                    <span class="revision-label">Current streak</span>
                                    <span class="revision-value">37 days</span>
                                </div>
                            </div>
                            <div class="dashboard-note">“The best among you are those who learn the Qur'an and teach it.” ﷺ</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="scroll-prompt">↓ Keep scrolling this gets real ↓</div>
        </section>

        <!-- TESTIMONIALS SECTION -->
        <section class="testimonials-section">
            <div class="container">
                <div class="section-header text-center">
                    <div class="section-label">Real huffadh. Real results.</div>
                    <h2 class="section-title">What our community is saying</h2>
                </div>
                <div class="testimonials-grid">
                    <div class="testimonial-card">
                        <div class="testimonial-quote">"</div>
                        <p class="testimonial-text">
                            After 8 years of Hifz, I was forgetting faster than I could revise. Mutqin changed that. My retention went from 60% to 89% in 4 months. Alhamdulillah.
                        </p>
                        <div class="testimonial-author">— Abu Abdullah, Hafiz &amp; Teacher</div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-quote">"</div>
                        <p class="testimonial-text">
                            As a working mother of three, I barely had time to revise. Mutqin's 15-minute sessions fit perfectly into my day. I've finally stopped forgetting what I memorised years ago.
                        </p>
                        <div class="testimonial-author">— Fatima, Mother &amp; Hafiza</div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-quote">"</div>
                        <p class="testimonial-text">
                            I started my Hifz journey at university. Other apps overwhelmed me. Mutqin's gentle approach gave me confidence. I've now completed 5 juz and remember them all.
                        </p>
                        <div class="testimonial-author">— Aisha, University Student</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- DIFFERENCE SECTION -->
        <section class="difference-section">
            <div class="container">
                <div class="difference-header">
                    <div class="section-label">Here's what makes us different</div>
                    <h2 class="section-title">Other apps vs. Mutqin</h2>
                </div>
                <div class="difference-grid">
                    <div class="other-card">
                        <h3>Other apps</h3>
                        <ul>
                            <li>Focus on how FAST you memorise</li>
                            <li>Gamify the Qur'an with badges</li>
                            <li>Fixed revision intervals</li>
                            <li>You only realise after you forget</li>
                            <li>Show you how much you've "done"</li>
                        </ul>
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="Mutqin-card">
                        <h3>Mutqin</h3>
                        <ul>
                            <li>Focus on what you KEEP forever</li>
                            <li>No gamification sincere progress</li>
                            <li>Adaptive to YOUR recall</li>
                            <li>Flags weak verses BEFORE they fade</li>
                            <li>Shows what you're about to forget</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- HOW IT WORKS -->
        <section id="how-it-works" class="how-it-works">
            <div class="container">
                <div class="section-header text-center">
                    <div class="section-label">The Mutqin method</div>
                    <h2 class="section-title">Three steps. Zero forgetfulness.</h2>
                    <p class="section-subtitle">No fluff. No gimmicks. A system that actually works.</p>
                </div>
                <div class="steps-grid">
                    <div class="step-card">
                        <div class="step-number">01</div>
                        <div class="step-icon-wrapper">
                            <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                                <path d="M12 6v6l4 2" />
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        </div>
                        <h3>Tell us what you know</h3>
                        <p>Import your Hifz or start fresh. We don't judge weak spots we hunt them down so you can fix them.</p>
                        <div class="step-result">Personalised map of your forgetting risks</div>
                    </div>
                    <div class="step-card">
                        <div class="step-number">02</div>
                        <div class="step-icon-wrapper">
                            <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                                <path d="M12 8v4l3 3" />
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <h3>Revise 15 minutes daily</h3>
                        <p>Our algorithm serves verses JUST before you'd forget them. Not too early. Not too late.</p>
                        <div class="step-result">89% retention after 6 months*</div>
                    </div>
                    <div class="step-card">
                        <div class="step-number">03</div>
                        <div class="step-icon-wrapper">
                            <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        </div>
                        <h3>Never lose an ayah again</h3>
                        <p>Weak verses are flagged in advance. You'll always know what needs attention no surprises.</p>
                        <div class="step-result">Peace of mind. Your Hifz is protected.</div>
                    </div>
                </div>
                <div class="steps-note">*Based on beta user data (n=247). We guarantee improvement or your money back.</div>
            </div>
        </section>

        <!-- WHY Mutqin -->
        <section id="why-us" class="why-us">
            <div class="container">
                <div class="section-header text-center">
                    <div class="section-label">Why Mutqin?</div>
                    <h2 class="section-title">Because forgetting the Qur'an hurts.</h2>
                    <p class="section-subtitle">We've been there. Here's how we solve what others ignore.</p>
                </div>

                <div class="pain-points-grid">
                    <div class="pain-point">
                        <div class="pain-emoji">😰</div>
                        <div class="pain-question">"I don't know what I'm forgetting"</div>
                        <div class="our-solution">We flag weak verses BEFORE they fade. You'll see exactly what needs revision.</div>
                    </div>
                    <div class="pain-point">
                        <div class="pain-emoji">⏰</div>
                        <div class="pain-question">"I have no time for revision"</div>
                        <div class="our-solution">15 minutes a day. That's it. Our algorithm maximises every minute.</div>
                    </div>
                    <div class="pain-point">
                        <div class="pain-emoji">🎮</div>
                        <div class="pain-question">"Apps feel like games not serious"</div>
                        <div class="our-solution">No badges. No leaderboards. Just clear metrics and honest feedback.</div>
                    </div>
                    <div class="pain-point">
                        <div class="pain-emoji">📚</div>
                        <div class="pain-question">"I memorised years ago now it's gone"</div>
                        <div class="our-solution">Our system rebuilds weak foundations. You CAN get it back.</div>
                    </div>
                </div>

                <div class="guarantee-card">
                    <div class="guarantee-icon">🤲</div>
                    <div class="guarantee-text">
                        <h3>Our promise to you</h3>
                        <p>If your retention doesn't improve within 30 days, we'll refund every penny. No forms. No runaround. Just your money back.</p>
                        <span class="guarantee-small">Because we actually believe in what we built.</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- PRICING -->
        <section id="pricing" class="pricing-section">
            <div class="container">
                <div class="section-header text-center">
                    <div class="section-label">Fair pricing. No surprises.</div>
                    <h2 class="section-title">Invest in what matters</h2>
                    <p class="section-subtitle">14-day free trial • Cancel anytime • Full access during trial</p>
                </div>
                <div class="pricing-grid">
                    <div class="pricing-card">
                        <div class="plan-name">Monthly</div>
                        <div class="plan-price">$9.99 <span>/ month</span></div>
                        <div class="plan-price-gbp">≈ £7.99 / month</div>
                        <ul class="plan-features">
                            <li>Full retention engine</li>
                            <li>Unlimited verses &amp; surahs</li>
                            <li>Personalised revision</li>
                            <li>Progress analytics</li>
                        </ul>
                        <button type="button" class="btn btn-outline full-width" @click="startMonthly">Start free trial →</button>
                    </div>
                    <div class="pricing-card featured">
                        <div class="popular-badge">Best value</div>
                        <div class="plan-name">Annual</div>
                        <div class="plan-price">$79.99 <span>/ year</span></div>
                        <div class="plan-price-gbp">≈ £63.99 / year</div>
                        <div class="plan-savings">Save 33% • 2 months free</div>
                        <ul class="plan-features">
                            <li>Everything in Monthly</li>
                            <li>Priority support</li>
                            <li>Export progress reports</li>
                            <li>Family sharing (up to 3)</li>
                        </ul>
                        <button type="button" class="btn btn-primary full-width" @click="startAnnual">Start free trial →</button>
                    </div>
                    <div class="pricing-card">
                        <div class="plan-name">Lifetime</div>
                        <div class="plan-price">$249 <span>one time</span></div>
                        <div class="plan-price-gbp">≈ £199 one time</div>
                        <ul class="plan-features">
                            <li>Everything in Annual</li>
                            <li>Lifetime updates</li>
                            <li>Priority support forever</li>
                            <li>Family sharing (up to 5)</li>
                        </ul>
                        <button type="button" class="btn btn-outline full-width" @click="startLifetime">Start free trial →</button>
                    </div>
                </div>
                <div class="pricing-note">💳 All prices in USD. GBP approximate. Exact conversion at checkout.</div>
            </div>
        </section>

        <!-- FAQ -->
        <section id="faq" class="faq-section">
            <div class="container">
                <div class="section-header text-center">
                    <div class="section-label">Got questions?</div>
                    <h2 class="section-title">We've heard them all.</h2>
                    <p class="section-subtitle">Here are the ones we get asked most.</p>
                </div>
                <div class="faq-grid">
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
                    <p>
                        Still have questions?
                        <a href="#" @click.prevent="openContact">Reach out to our team →</a>
                        We respond within 24 hours, insha'Allah.
                    </p>
                </div>
            </div>
        </section>

        <!-- CONTACT -->
        <section id="contact" class="contact-section">
            <div class="container">
                <div class="contact-card">
                    <div class="contact-left">
                        <div class="contact-emoji">📬</div>
                        <h3>We'd love to hear from you</h3>
                        <p>Whether you have a question about Mutqin, need help with your Hifz journey, or just want to share your story our team is here for you.</p>
                        <div class="contact-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                            support@Mutqin.com
                        </div>
                        <div class="contact-detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Response within 24 hours
                        </div>
                        <div class="contact-dua">“And when My servants ask you concerning Me indeed I am near.” Qur'an 2:186</div>
                    </div>
                    <form class="contact-right" @submit.prevent="submitContact">
                        <input type="text" placeholder="Your name" class="form-input" required />
                        <input type="email" placeholder="Email address" class="form-input" required />
                        <textarea placeholder="How can we help?" rows="3" class="form-textarea" required></textarea>
                        <button type="submit" class="btn btn-primary">Send message →</button>
                    </form>
                </div>
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="footer">
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-brand">
                        <div class="footer-logo">Mutqin نور على نور</div>
                        <p class="footer-tagline">Preserving the Qur'an in hearts, one ayah at a time.</p>
                    </div>
                    <div class="footer-links-group">
                        <h4>Product</h4>
                        <a href="#how-it-works">How it works</a>
                        <a href="#why-us">Why us</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#faq">FAQ</a>
                    </div>
                    <div class="footer-links-group">
                        <h4>Support</h4>
                        <a href="#contact">Contact</a>
                        <a href="#">Help center</a>
                        <a href="#">Privacy policy</a>
                    </div>
                    <div class="footer-links-group">
                        <h4>Connect</h4>
                        <a href="#">support@Mutqin.com</a>
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
/* ============================================
   ELEVATED ISLAMIC LANDING PAGE
   Distinctive typography • Layered depth • Elegant icons
============================================ */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.landing-page {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #fdf9f2;
    color: #1a2e24;
    line-height: 1.5;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
}

/* Background depth */
.bg-pattern {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.15"><path d="M20,20 L80,20 L80,80 L20,80 Z" fill="none" stroke="%23A0784C" stroke-width="0.3"/><path d="M30,30 L70,30 L70,70 L30,70 Z" fill="none" stroke="%23A0784C" stroke-width="0.3"/><circle cx="50" cy="50" r="15" fill="none" stroke="%23A0784C" stroke-width="0.3"/></svg>');
    background-repeat: repeat;
    background-size: 60px;
    opacity: 0.08;
    pointer-events: none;
    z-index: 0;
}

.bg-gradient {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 0% 0%, rgba(160, 120, 76, 0.02), transparent);
    pointer-events: none;
    z-index: 0;
}

/* ========== NAVBAR ========== */
.navbar {
    position: fixed;
    top: 0;
    width: 100%;
    background: rgba(253, 249, 242, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(160, 120, 76, 0.1);
    z-index: 1000;
}

.nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 8px;
}

.logo-mark {
    font-size: 1.4rem;
    color: #a0784c;
}

.logo-text {
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: -0.3px;
    background: linear-gradient(135deg, #1a2e24, #a0784c);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
}

.nav-links-desktop {
    display: flex;
    gap: 32px;
}

.nav-link {
    text-decoration: none;
    color: #4a5b53;
    font-weight: 500;
    font-size: 0.85rem;
    transition: color 0.2s;
    cursor: pointer;
}

.nav-link:hover {
    color: #a0784c;
}

.mobile-menu-btn {
    display: none;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
}

.mobile-menu-btn span {
    width: 20px;
    height: 2px;
    background: #1a2e24;
}

.nav-links-mobile {
    position: fixed;
    top: 58px;
    left: -100%;
    width: 100%;
    height: calc(100vh - 58px);
    background: #fdf9f2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 30px 20px;
    transition: 0.3s ease;
    z-index: 999;
}

.nav-links-mobile.active {
    left: 0;
}

.nav-links-mobile .nav-link {
    font-size: 1rem;
    padding: 8px;
}

.desktop-cta,
.mobile-cta {
    display: block;
}

.btn {
    padding: 8px 22px;
    border-radius: 100px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.25s ease;
    border: none;
    font-family: inherit;
}

.btn-primary {
    background: #1e5a4a;
    color: white;
    box-shadow: 0 2px 8px rgba(30, 90, 74, 0.2);
}

.btn-primary:hover {
    background: #15483b;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 90, 74, 0.25);
}

.btn-outline {
    background: transparent;
    border: 1.5px solid rgba(160, 120, 76, 0.4);
    color: #a0784c;
}

.btn-outline:hover {
    background: rgba(160, 120, 76, 0.05);
    border-color: #a0784c;
}

.btn-lg {
    padding: 12px 28px;
    font-size: 0.95rem;
}

.full-width {
    width: 100%;
}

/* ========== HERO ========== */
.hero-section {
    padding: 120px 0 80px;
    position: relative;
    overflow: hidden;
}

.hero-ornament-left {
    position: absolute;
    left: -100px;
    top: 20%;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(160, 120, 76, 0.03), transparent);
    pointer-events: none;
}

.hero-ornament-right {
    position: absolute;
    right: -100px;
    bottom: 10%;
    width: 350px;
    height: 350px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(160, 120, 76, 0.03), transparent);
    pointer-events: none;
}

.hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
}

.hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(160, 120, 76, 0.08);
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #a0784c;
    margin-bottom: 28px;
    letter-spacing: 0.3px;
}

.badge-dot {
    width: 5px;
    height: 5px;
    background: #a0784c;
    border-radius: 50%;
}

.hero-title {
    font-size: clamp(2.2rem, 4.5vw, 3.5rem);
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: 24px;
    color: #1a2e24;
}

.highlight {
    color: #a0784c;
    position: relative;
    display: inline-block;
}

.highlight::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 0;
    width: 100%;
    height: 8px;
    background: rgba(160, 120, 76, 0.2);
    border-radius: 4px;
    z-index: -1;
}

.hero-description {
    font-size: 1rem;
    color: #5a6b63;
    margin-bottom: 28px;
    line-height: 1.65;
}

.pain-solution {
    background: rgba(160, 120, 76, 0.05);
    border-radius: 20px;
    padding: 20px 24px;
    margin: 28px 0;
}

.pain,
.solution {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
}

.pain {
    color: #a0784c;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(160, 120, 76, 0.15);
}

.solution {
    color: #1e5a4a;
}

.pain-icon,
.solution-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.hero-actions {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 18px;
}

.no-credit {
    font-size: 0.7rem;
    color: #8a9c93;
}

/* Dashboard */
.dashboard-card {
    background: white;
    border-radius: 32px;
    padding: 32px;
    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(160, 120, 76, 0.12);
    position: relative;
    overflow: hidden;
}

.dashboard-glow {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(160, 120, 76, 0.06), transparent);
    pointer-events: none;
}

.card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(160, 120, 76, 0.1);
}

.day-badge,
.retention-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    padding: 5px 12px;
    border-radius: 100px;
}

.day-badge svg,
.retention-badge svg {
    width: 12px;
    height: 12px;
}

.day-badge {
    background: #eef4f1;
    color: #1e5a4a;
}

.retention-badge {
    background: rgba(160, 120, 76, 0.1);
    color: #a0784c;
}

.surah-name {
    font-size: 1.3rem;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: #1a2e24;
    display: block;
}

.ayah-range {
    font-size: 0.7rem;
    color: #8a9c93;
}

.progress-section {
    margin: 24px 0;
}

.progress-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 8px;
    color: #5a6b63;
}

.progress-bar {
    background: rgba(160, 120, 76, 0.1);
    border-radius: 100px;
    height: 6px;
    overflow: hidden;
}

.progress-fill {
    background: #a0784c;
    width: 0%;
    height: 100%;
    border-radius: 100px;
    transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.revision-info {
    display: flex;
    gap: 20px;
    margin: 24px 0 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(160, 120, 76, 0.1);
}

.revision-item {
    flex: 1;
}

.revision-label {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8a9c93;
    margin-bottom: 6px;
}

.revision-value {
    font-weight: 600;
    font-size: 0.85rem;
    color: #1a2e24;
}

.dashboard-note {
    font-size: 0.65rem;
    color: #a0784c;
    text-align: center;
    margin-top: 16px;
    font-style: italic;
    opacity: 0.8;
}

.scroll-prompt {
    text-align: center;
    margin-top: 60px;
    font-size: 0.7rem;
    letter-spacing: 2px;
    color: #a8b5aa;
}

/* ========== TESTIMONIALS ========== */
.testimonials-section {
    padding: 70px 0;
    background: rgba(160, 120, 76, 0.02);
}

.testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    margin-top: 48px;
}

.testimonial-card {
    background: white;
    padding: 32px;
    border-radius: 24px;
    border: 1px solid rgba(160, 120, 76, 0.1);
    transition: all 0.3s ease;
}

.testimonial-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 30px -12px rgba(0, 0, 0, 0.06);
}

.testimonial-quote {
    font-size: 3rem;
    color: #a0784c;
    font-family: Georgia, serif;
    line-height: 1;
    margin-bottom: 16px;
}

.testimonial-text {
    font-size: 0.9rem;
    color: #3d524a;
    line-height: 1.65;
    margin-bottom: 20px;
    font-style: italic;
}

.testimonial-author {
    font-size: 0.75rem;
    color: #8a9c93;
    letter-spacing: 0.3px;
}

/* ========== DIFFERENCE SECTION ========== */
.difference-section {
    padding: 70px 0;
}

.difference-header {
    text-align: center;
    margin-bottom: 56px;
}

.difference-grid {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 48px;
    flex-wrap: wrap;
}

.other-card,
.Mutqin-card {
    flex: 1;
    min-width: 280px;
    background: white;
    padding: 40px;
    border-radius: 28px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(160, 120, 76, 0.1);
}

.other-card h3,
.Mutqin-card h3 {
    font-size: 1.3rem;
    margin-bottom: 24px;
    letter-spacing: -0.3px;
}

.other-card ul,
.Mutqin-card ul {
    list-style: none;
}

.other-card li,
.Mutqin-card li {
    padding: 12px 0;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(160, 120, 76, 0.08);
}

.vs-divider {
    font-size: 1.3rem;
    font-weight: 600;
    color: #a0784c;
    align-self: center;
    background: rgba(160, 120, 76, 0.1);
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 60px;
}

.Mutqin-card {
    border: 1px solid #a0784c;
    background: linear-gradient(135deg, white, rgba(160, 120, 76, 0.02));
}

/* ========== HOW IT WORKS ========== */
.how-it-works {
    padding: 70px 0;
    background: rgba(160, 120, 76, 0.02);
}

.steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    margin-top: 48px;
}

.step-card {
    background: white;
    border-radius: 28px;
    padding: 36px 28px;
    border: 1px solid rgba(160, 120, 76, 0.1);
    transition: all 0.3s ease;
}

.step-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 24px 36px -16px rgba(0, 0, 0, 0.08);
    border-color: rgba(160, 120, 76, 0.2);
}

.step-number {
    font-size: 0.7rem;
    font-weight: 600;
    color: #a0784c;
    letter-spacing: 2px;
    margin-bottom: 20px;
}

.step-icon-wrapper {
    width: 56px;
    height: 56px;
    background: rgba(160, 120, 76, 0.08);
    border-radius: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
}

.step-icon {
    width: 28px;
    height: 28px;
    color: #a0784c;
}

.step-card h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 12px;
    letter-spacing: -0.3px;
}

.step-card p {
    font-size: 0.85rem;
    color: #5a6b63;
    line-height: 1.6;
    margin-bottom: 20px;
}

.step-result {
    font-size: 0.8rem;
    font-weight: 500;
    color: #1e5a4a;
    background: rgba(30, 90, 74, 0.06);
    padding: 10px 14px;
    border-radius: 16px;
}

.steps-note {
    text-align: center;
    margin-top: 48px;
    font-size: 0.7rem;
    color: #8a9c93;
}

/* ========== WHY US ========== */
.why-us {
    padding: 70px 0;
}

.pain-points-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin: 48px 0;
}

.pain-point {
    background: white;
    padding: 28px;
    border-radius: 24px;
    border-left: 4px solid #a0784c;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}

.pain-emoji {
    font-size: 2.2rem;
    margin-bottom: 12px;
}

.pain-question {
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 8px;
    color: #1a2e24;
}

.our-solution {
    font-size: 0.85rem;
    color: #5a6b63;
    line-height: 1.6;
}

.guarantee-card {
    background: linear-gradient(135deg, #1a2e24, #1e5a4a);
    border-radius: 28px;
    padding: 40px;
    display: flex;
    gap: 28px;
    align-items: center;
    flex-wrap: wrap;
    color: white;
}

.guarantee-icon {
    font-size: 3.5rem;
}

.guarantee-text h3 {
    font-size: 1.3rem;
    margin-bottom: 10px;
    font-weight: 600;
}

.guarantee-text p {
    opacity: 0.85;
    line-height: 1.6;
}

.guarantee-small {
    font-size: 0.7rem;
    opacity: 0.65;
    display: block;
    margin-top: 10px;
}

/* ========== PRICING ========== */
.pricing-section {
    padding: 70px 0;
    background: rgba(160, 120, 76, 0.02);
}

.pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    margin-top: 48px;
}

.pricing-card {
    background: white;
    border-radius: 28px;
    padding: 36px 28px;
    border: 1px solid rgba(160, 120, 76, 0.1);
    position: relative;
    transition: all 0.3s ease;
}

.pricing-card.featured {
    border: 2px solid #a0784c;
    transform: scale(1.02);
    box-shadow: 0 20px 35px -12px rgba(160, 120, 76, 0.15);
}

.popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #a0784c;
    color: white;
    padding: 5px 18px;
    border-radius: 100px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
}

.plan-name {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 12px;
}

.plan-price {
    font-size: 2.2rem;
    font-weight: 700;
    color: #1a2e24;
}

.plan-price span {
    font-size: 0.85rem;
    font-weight: 400;
    color: #8a9c93;
}

.plan-price-gbp {
    font-size: 0.7rem;
    color: #a0784c;
    margin-bottom: 16px;
}

.plan-savings {
    font-size: 0.7rem;
    color: #a0784c;
    margin: 8px 0 16px;
}

.plan-features {
    list-style: none;
    margin: 28px 0 32px;
}

.plan-features li {
    padding: 10px 0;
    font-size: 0.85rem;
    color: #4a5b53;
    padding-left: 26px;
    position: relative;
}

.plan-features li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #a0784c;
    font-weight: 600;
}

.pricing-note {
    text-align: center;
    font-size: 0.7rem;
    color: #8a9c93;
    margin-top: 40px;
}

/* ========== FAQ ========== */
.faq-section {
    padding: 70px 0;
}

.faq-grid {
    max-width: 800px;
    margin: 48px auto 0;
}

.faq-item {
    background: white;
    border-radius: 20px;
    margin-bottom: 14px;
    border: 1px solid rgba(160, 120, 76, 0.1);
    cursor: pointer;
    transition: all 0.2s;
}

.faq-item:hover {
    border-color: rgba(160, 120, 76, 0.3);
}

.faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 28px;
    font-weight: 600;
    color: #1a2e24;
}

.faq-question svg {
    width: 18px;
    height: 18px;
    color: #a0784c;
    transition: transform 0.2s;
}

.faq-question svg.rotated {
    transform: rotate(180deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    padding: 0 28px;
}

.faq-answer.open {
    max-height: 250px;
    padding: 0 28px 22px 28px;
}

.faq-answer p {
    color: #5a6b63;
    font-size: 0.85rem;
    line-height: 1.65;
}

.faq-footer {
    text-align: center;
    margin-top: 36px;
    font-size: 0.85rem;
}

.faq-footer a {
    color: #a0784c;
    text-decoration: none;
    font-weight: 500;
}

/* ========== CONTACT ========== */
.contact-section {
    padding: 70px 0;
    background: rgba(160, 120, 76, 0.02);
}

.contact-card {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 56px;
    background: white;
    border-radius: 32px;
    padding: 48px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(160, 120, 76, 0.1);
}

.contact-emoji {
    font-size: 2.5rem;
    margin-bottom: 16px;
}

.contact-left h3 {
    font-size: 1.3rem;
    margin-bottom: 12px;
    color: #1a2e24;
}

.contact-left p {
    color: #5a6b63;
    margin-bottom: 24px;
    line-height: 1.65;
}

.contact-detail {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 14px 0;
    font-size: 0.9rem;
    color: #1a2e24;
}

.contact-detail svg {
    width: 18px;
    height: 18px;
    color: #a0784c;
}

.contact-dua {
    margin-top: 24px;
    font-size: 0.75rem;
    color: #a0784c;
    font-style: italic;
    padding-top: 20px;
    border-top: 1px solid rgba(160, 120, 76, 0.1);
}

.contact-right {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-input,
.form-textarea {
    padding: 14px 18px;
    border: 1px solid rgba(160, 120, 76, 0.2);
    border-radius: 16px;
    font-family: inherit;
    font-size: 0.85rem;
    background: white;
    transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: #a0784c;
    box-shadow: 0 0 0 3px rgba(160, 120, 76, 0.1);
}

/* ========== FOOTER ========== */
.footer {
    background: #1a2e24;
    color: #c2d3cb;
    padding: 56px 0 32px;
}

.footer-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
    gap: 48px;
    margin-bottom: 48px;
}

.footer-logo {
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    margin-bottom: 10px;
}

.footer-tagline {
    font-size: 0.75rem;
    opacity: 0.7;
}

.footer-links-group h4 {
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
    margin-bottom: 18px;
}

.footer-links-group a {
    display: block;
    color: #c2d3cb;
    text-decoration: none;
    font-size: 0.75rem;
    margin-bottom: 10px;
    transition: opacity 0.2s;
}

.footer-links-group a:hover {
    opacity: 0.7;
}

.footer-bottom {
    text-align: center;
    padding-top: 32px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.65rem;
    opacity: 0.6;
}

/* ========== SECTION HEADERS ========== */
.section-header {
    text-align: center;
    margin-bottom: 48px;
}

.section-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #a0784c;
    margin-bottom: 12px;
}

.section-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #1a2e24;
}

.section-subtitle {
    color: #6b7f76;
    margin-top: 14px;
    font-size: 0.9rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 992px) {
    .hero-grid,
    .pricing-grid,
    .testimonials-grid {
        grid-template-columns: 1fr;
    }
    .steps-grid {
        grid-template-columns: 1fr;
        max-width: 450px;
        margin: 48px auto 0;
    }
    .nav-links-desktop,
    .desktop-cta {
        display: none;
    }
    .mobile-menu-btn {
        display: flex;
    }
    .pain-points-grid {
        grid-template-columns: 1fr;
    }
    .difference-grid {
        flex-direction: column;
        align-items: center;
    }
    .vs-divider {
        transform: rotate(90deg);
    }
    .contact-card {
        grid-template-columns: 1fr;
    }
    .footer-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .container {
        padding: 0 20px;
    }
    .hero-actions {
        flex-direction: column;
    }
    .btn-lg {
        width: 100%;
        text-align: center;
    }
    .pricing-card.featured {
        transform: none;
    }
    .footer-grid {
        grid-template-columns: 1fr;
        text-align: center;
    }
    .testimonials-grid {
        gap: 20px;
    }
    .section-title {
        font-size: 1.6rem;
    }
}

@media (max-width: 480px) {
    .hero-title {
        font-size: 1.8rem;
    }
    .dashboard-card {
        padding: 20px;
    }
    .revision-info {
        flex-direction: column;
        gap: 12px;
    }
    .pricing-card {
        padding: 24px 20px;
    }
}
</style>

