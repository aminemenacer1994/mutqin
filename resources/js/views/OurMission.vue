<template>
  <section class="info-page">
    <div class="info-shell">
      <header class="info-header info-reveal">
        <div class="info-header-copy">
          <span class="info-kicker"><i class="bi bi-compass" aria-hidden="true"></i> Mission</span>
          <h1>Our mission</h1>
          <ul class="info-highlights" aria-label="Mission focus">
            <li><i class="bi bi-flag" aria-hidden="true"></i> Begin</li>
            <li><i class="bi bi-arrow-repeat" aria-hidden="true"></i> Continue</li>
            <li><i class="bi bi-heart" aria-hidden="true"></i> Return calmly</li>
          </ul>
        </div>
        <div class="info-header-aside">
          <p>
            Help people start memorising, keep going, and come back each day,
            while still learning with a real teacher.
          </p>
          <div class="info-actions">
            <a class="info-btn info-btn--primary" href="/memorisation">
              <i class="bi bi-play-fill" aria-hidden="true"></i> Begin a session
            </a>
            <a class="info-btn info-btn--ghost" href="/donate">
              <i class="bi bi-heart" aria-hidden="true"></i> Support Mutqin
            </a>
          </div>
        </div>
      </header>

      <div class="info-sections">
        <section class="info-section info-reveal" style="--d: 60ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-bookmark-check"></i></div>
            <h2>Practise with care</h2>
          </div>
          <p>
            Listen, repeat, and check your recitation so what you memorise
            stays with you, not just for one sitting.
          </p>
        </section>

        <section class="info-section info-reveal" style="--d: 120ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-calendar-check"></i></div>
            <h2>Come back each day</h2>
          </div>
          <p>
            After every session you get a clear next step,
            so ayahs don’t fade between days.
          </p>
        </section>

        <section class="info-section info-reveal" style="--d: 180ms">
          <div class="info-section-head">
            <div class="info-icon" aria-hidden="true"><i class="bi bi-shield-check"></i></div>
            <h2>Respect first</h2>
          </div>
          <p>
            Getting it right matters more than going fast.
            Mutqin supports study with teachers, not instead of them.
          </p>
        </section>
      </div>

      <div class="info-actions info-reveal" style="--d: 240ms">
        <a class="info-btn info-btn--primary" href="/memorisation">
          <i class="bi bi-play-fill" aria-hidden="true"></i> Begin a session
        </a>
        <a class="info-btn info-btn--ghost" href="/donate">
          <i class="bi bi-heart" aria-hidden="true"></i> Support Mutqin
        </a>
      </div>
    </div>
  </section>
</template>

<script>
export default { name: 'OurMissionPage' };
</script>
