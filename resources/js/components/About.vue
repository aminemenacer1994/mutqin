<template>
  <div class="page">

    <section class="hero">
      <span class="tag">Mutqin • Hifz Companion</span>

      <h1>
        A structured path to mastering the Qur’an
      </h1>

      <p>
        Mutqin is designed to help you memorise, revise, and retain the Qur’an with clarity and consistency —
        supported by intelligent guidance and gentle correction.
      </p>

      <div class="cta">
        <button class="primary">Begin Your Journey</button>
        <button class="secondary">Learn More</button>
      </div>
    </section>

    <section class="grid">

      <div class="card">
        <h3>Purpose</h3>
        <p>To make Qur’an memorisation structured, sustainable, and deeply personal.</p>
      </div>

      <div class="card">
        <h3>Approach</h3>
        <p>AI-supported learning that respects traditional teaching methods.</p>
      </div>

      <div class="card highlight">
        <h3>Outcome</h3>
        <p>Stronger retention, consistent revision, and improved accuracy.</p>
      </div>

    </section>

    <section class="verse">
      “Indeed, We have made the Qur’an easy to remember.” — 54:17
    </section>

  </div>
</template>

<style scoped>
.page{
  width:min(100%, 1100px);
  margin:auto;
  min-height:100dvh;
  padding:clamp(34px, 6vw, 64px) clamp(16px, 4vw, 24px);
  color:var(--text, #1f1a17);
  background:transparent;
  overflow-x:clip;
}

/* HERO */
.hero{
  text-align:center;
  margin-bottom:48px;
}

.tag{
  display:inline-block;
  padding:6px 12px;
  border-radius:999px;
  background:var(--accent-light, rgba(160, 120, 76, 0.1));
  color:var(--accent, #a0784c);
  font-size:12px;
  margin-bottom:16px;
}

.hero h1{
  font-size:clamp(34px, 7vw, 46px);
  line-height:1.1;
  letter-spacing:0;
  margin-bottom:16px;
  overflow-wrap:anywhere;
}

.hero p{
  max-width:650px;
  margin:auto;
  color:var(--text-muted, #6c6258);
  line-height:1.7;
}

/* CTA */
.cta{
  margin-top:25px;
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  justify-content:center;
}

button{
  min-width:44px;
  min-height:44px;
  padding:12px 18px;
  border-radius:8px;
  border:none;
  cursor:pointer;
  transition:0.2s ease;
  overflow-wrap:anywhere;
}

.primary{
  background:var(--accent, #a0784c);
  color:#fff;
  font-weight:600;
}

.secondary{
  background:var(--surface, rgba(255,255,255,0.96));
  color:var(--text, #1f1a17);
  border:1px solid var(--border, rgba(160, 120, 76, 0.12));
}

/* GRID */
.grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
  margin-top:28px;
}

.card{
  padding:18px;
  min-width:0;
  border-radius:16px;
  background:color-mix(in srgb, var(--surface-strong, #fff) 92%, var(--surface-elevated, #fffaf4));
  border:1px solid color-mix(in srgb, var(--accent, #a0784c) 12%, var(--border, rgba(160, 120, 76, 0.12)));
  backdrop-filter:blur(12px);
  transition:0.25s ease;
  box-shadow:var(--shadow-sm, 0 8px 24px rgba(0,0,0,0.06));
}

.card:hover{
  transform:translateY(-6px);
  border-color:color-mix(in srgb, var(--accent, #a0784c) 34%, var(--border, rgba(160, 120, 76, 0.12)));
}

.highlight{
  border-color:color-mix(in srgb, var(--accent, #a0784c) 44%, var(--border, rgba(160, 120, 76, 0.12)));
}

.verse{
  text-align:center;
  margin-top:40px;
  color:var(--text-muted, #6c6258);
  font-style:italic;
}

@media(max-width:900px){
  .grid{
    grid-template-columns:1fr;
  }

  .hero h1{
    font-size:clamp(30px, 8vw, 38px);
  }
}

@media(max-width:575.98px){
  .page{
    padding-inline:14px;
  }

  .cta{
    display:grid;
    grid-template-columns:1fr;
  }

  .cta button{
    width:100%;
  }

  .card{
    padding:18px;
  }
}
</style>
