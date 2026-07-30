<template>
  <section class="info-page support-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker"><i class="bi bi-life-preserver" aria-hidden="true"></i> Support</span>
          <h1>Support</h1>
          <ul class="info-highlights" aria-label="Support topics">
            <li><i class="bi bi-rocket-takeoff" aria-hidden="true"></i> Start</li>
            <li><i class="bi bi-person-circle" aria-hidden="true"></i> Account</li>
            <li><i class="bi bi-chat-dots" aria-hidden="true"></i> Contact</li>
          </ul>
        </div>
        <div class="info-header-aside">
          <p>
            Need a hand with practice, your account, or a session?
            Find quick answers here, or write to us anytime.
          </p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" href="/#contact">
              <i class="bi bi-envelope" aria-hidden="true"></i> Contact us
            </a>
            <a class="info-btn info-btn--ghost" href="/donate">
              <i class="bi bi-heart" aria-hidden="true"></i> Support the project
            </a>
          </div>
        </div>
      </header>

      <div class="info-sections">
        <section class="info-section info-reveal" style="--d: 40ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-play-circle"></i></div>
            <h2>Getting started</h2>
          </div>
          <p>Open Memorisation, pick a short passage, then listen and repeat.</p>
          <a class="info-inline-link" href="/memorisation">
            Go to Memorisation <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </a>
        </section>

        <section class="info-section info-reveal" style="--d: 80ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-person-circle"></i></div>
            <h2>Your account</h2>
          </div>
          <p>Sign in to keep your progress saved. Forgot your password? Use the reset link on the login page.</p>
          <a class="info-inline-link" href="/login">
            Sign in <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </a>
        </section>

        <section class="info-section info-reveal" style="--d: 120ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-journal-bookmark"></i></div>
            <h2>During a session</h2>
          </div>
          <p>Listen, follow the words, and repeat. When you finish, follow the suggested next step.</p>
        </section>

        <section class="info-section info-reveal" style="--d: 160ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-mic"></i></div>
            <h2>Checking your recitation</h2>
          </div>
          <p>
            Recite while Mutqin follows along. It is a practice helper,
            not a replacement for a teacher.
          </p>
        </section>

        <section class="info-section info-reveal" style="--d: 200ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-tools"></i></div>
            <h2>Something not working?</h2>
          </div>
          <p>Refresh once. If that fails, sign out and back in. For recitation, allow microphone access in your browser.</p>
        </section>

        <section class="info-section info-reveal" style="--d: 240ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-chat-heart"></i></div>
            <h2>Share feedback</h2>
          </div>
          <p>Tell us what helped, what felt unclear, or how we can make practice easier for you.</p>
          <a class="info-inline-link" href="/#contact">
            Write to us <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </a>
        </section>
      </div>

      <div class="info-actions info-reveal" style="--d: 280ms">
        <a class="info-btn info-btn--primary" href="/#contact">
          <i class="bi bi-envelope" aria-hidden="true"></i> Contact us
        </a>
        <a class="info-btn info-btn--ghost" href="/donate">
          <i class="bi bi-heart" aria-hidden="true"></i> Support the project
        </a>
      </div>
    </div>
  </section>
</template>

<script>
export default { name: 'DonationPage' };
</script>
