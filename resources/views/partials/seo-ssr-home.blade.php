<article class="seo-ssr">
    @php($earlyAccess = \App\Support\MutqinDomains::restrictMarketingHost(request()))
    <h1>Forgetting ayahs or unsure what to revise next?</h1>
    <p>A disrupted revision rhythm can make it hard to know where to restart. Mutqin gives you a calm next step: start small, listen, repeat and recite aloud. <a href="/features/ai-recite">AI Recite</a> can flag possible mistakes to practise again.</p>
    <p>Mutqin is for beginners, children learning with a parent or teacher, adults returning after a pause, and experienced Hifz students.</p>
    @if($earlyAccess)
        <p><strong>Early access:</strong> access is opening in stages. <a href="/waiting-list">Join the waiting list</a> for an invitation.</p>
    @else
        <p><strong>Available now:</strong> start a free first session today. <a href="/memorisation">Start your first session</a>.</p>
    @endif
    <h2>Your first 10 minutes with Mutqin</h2>
    <p>Choose one to three ayahs. Listen, repeat and recite from memory. Mutqin saves your place and gives you a clear next step. Read the <a href="/guides/quran-memorization-for-beginners">beginner plan</a> or learn <a href="/guides/quran-memorization-techniques">how to memorize the Quran</a>.</p>
    <h2>Four distinct parts of your Hifz practice</h2>
    <p>Memorisation helps you learn new ayahs; revision helps you return to earlier work; AI Recite helps you notice what needs another careful pass; assessment shows what held and the clearest next step.</p>
    <h2>The essentials for steady Hifz</h2>
    <p>Guided memorisation, listen and repeat, spaced review, and AI Recite help you learn a small range, practise your recall, then return at the right time. Free tools include a <a href="/tools/quran-memorization-planner">Quran memorization planner</a>, <a href="/tools/hifz-progress-calculator">Hifz progress calculator</a>, <a href="/tools/quran-memorization-test">memorization test</a>, and <a href="/tools/find-an-ayah">Find an ayah</a>.</p>
    <h2>Questions about memorising with Mutqin</h2>
    <p>Mutqin is a Qur’an memorisation companion. It helps you listen, recite, review and return, and supports practice between lessons. It does not replace a teacher. Read <a href="/guides/hifz-revision">how to revise Hifz</a> or browse <a href="/guides">all Hifz guides</a>.</p>
    <nav>
        <a href="/waiting-list">Join the waiting list</a>
        <a href="/about">About</a>
        <a href="/pricing">Pricing</a>
        <a href="/privacy">Privacy</a>
        <a href="/features">Features</a>
        <a href="/features/ai-recite">AI Recite</a>
        <a href="/features/mutashabihat">Mutashābihāt</a>
        <a href="/guides">Hifz guides</a>
        <a href="/guides/quran-memorization-techniques">How to memorize</a>
        <a href="/guides/hifz-revision">How to revise</a>
        <a href="/tools">Free Hifz tools</a>
        <a href="/tools/quran-memorization-planner">Memorization planner</a>
        <a href="/tools/find-an-ayah">Find an ayah</a>
    </nav>
</article>
