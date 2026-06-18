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
  padding:clamp(48px, 8vw, 90px) clamp(16px, 4vw, 24px);
  color:#e5e7eb;
  background:#070b14;
  overflow-x:clip;
}

/* HERO */
.hero{
  text-align:center;
  margin-bottom:70px;
}

.tag{
  display:inline-block;
  padding:6px 12px;
  border-radius:999px;
  background:rgba(16,185,129,0.1);
  color:#10b981;
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
  opacity:0.7;
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
  background:#10b981;
  color:#04130d;
  font-weight:600;
}

.secondary{
  background:rgba(255,255,255,0.05);
  color:#e5e7eb;
  border:1px solid rgba(255,255,255,0.08);
}

/* GRID */
.grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
  margin-top:40px;
}

.card{
  padding:22px;
  min-width:0;
  border-radius:8px;
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  backdrop-filter:blur(12px);
  transition:0.25s ease;
}

.card:hover{
  transform:translateY(-6px);
  border-color:rgba(16,185,129,0.4);
}

.highlight{
  border-color:rgba(16,185,129,0.5);
}

.verse{
  text-align:center;
  margin-top:60px;
  opacity:0.5;
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
