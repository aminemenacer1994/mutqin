<article class="seo-ssr">
    @php($earlyAccess = \App\Support\MutqinDomains::restrictMarketingHost(request()))
    <h1>Forgetting ayahs or unsure what to revise next?</h1>
    <p>A Quran memorisation app for Hifz, Mutqin helps when you’re forgetting ayahs or unsure what to revise next.</p>
    <p>Recite aloud. AI Recite can highlight possible mistakes to practise again. Mutqin is for beginners, children with guidance, returning adults and experienced Hifz students.</p>
    @if($earlyAccess)
        <p>Early access: access is opening in stages. <a href="/waiting-list">Join the waiting list</a> for an invitation.</p>
    @else
        <p>Available now: free to start. <a href="/memorisation">Start your first session</a>.</p>
    @endif

    <h2>Your first 10 minutes with Mutqin</h2>
    <p>Choose 1 to 3 ayahs. Listen, repeat and recite from memory. Mutqin saves your next step.</p>

    <h2>The essentials for steady Hifz</h2>
    <p>Learn a small range, practise your recall, then return at the right time.</p>
    <h3>Guided memorisation</h3>
    <p>Move through listening, following and reciting with a clear path for each ayah.</p>
    <h3>Listen, repeat, recite</h3>
    <p>Hide the text, join ayahs and repeat until recall feels stronger.</p>
    <h3>Spaced review</h3>
    <p>Return to memorised ayahs so Quran revision stays part of the journey, and follow your memorisation progress.</p>
    <h3>AI Recite</h3>
    <p>Recite aloud for AI recitation feedback on possible words or ayahs to practise again.</p>
    <h3>Mushaf layout</h3>
    <p>Read in a familiar Qur’an page, made for calm, focused practice.</p>
    <h3>Reading aids</h3>
    <p>Translation, transliteration, tajweed and tafseer stay nearby when you need them.</p>

    <h2>Built for the return.</h2>
    <p>A small range today and a clear reason to come back tomorrow. Mutqin helps make that rhythm easier to keep.</p>
    <h2>Questions about memorising with Mutqin</h2>
    <p>Mutqin is a Qur’an memorisation companion. It helps you listen, recite, review and return, and supports practice between lessons. It does not replace a teacher.</p>
    <nav aria-label="Explore Mutqin">
        <a href="/features">All features</a>
        <a href="/articles">Articles &amp; guides</a>
        <a href="/about">About us</a>
        <a href="/our-mission">Our mission</a>
        <a href="/privacy">Privacy</a>
        <a href="/waiting-list">Waiting list</a>
        <a href="/pricing">Pricing</a>
        <a href="/features/ai-recite">AI Recite</a>
        <a href="/features/mutashabihat">Mutashābihāt</a>
        <a href="/guides">Hifz guides</a>
        <a href="/guides/quran-memorization-for-beginners">Beginner plan</a>
        <a href="/guides/quran-memorization-techniques">How to memorize the Quran</a>
        <a href="/guides/hifz-revision">How to revise Hifz</a>
        <a href="/tools">Free Hifz tools</a>
        <a href="/tools/quran-memorization-planner">Quran memorization planner</a>
        <a href="/tools/hifz-progress-calculator">Hifz progress calculator</a>
        <a href="/tools/quran-memorization-test">Memorization test</a>
        <a href="/tools/find-an-ayah">Find an ayah</a>
    </nav>
</article>
