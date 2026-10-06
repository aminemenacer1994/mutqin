@php
    $placeholderArticles = $placeholderArticles ?? \App\Support\Articles\PlaceholderArticles::all();
@endphp
<article class="seo-ssr">
    <h1>Qur'an Memorisation Resources &amp; Insights</h1>
    <p>Practical guides, memorisation techniques, revision strategies, and insights to help you strengthen your relationship with the Qur'an.</p>
    @foreach ($placeholderArticles as $article)
        @php
            $slug = (string) ($article['slug'] ?? $article['id'] ?? '');
        @endphp
        <section>
            <h2>{{ $article['title'] ?? '' }}</h2>
            <p>{{ $article['excerpt'] ?? '' }}</p>
            @if (! empty($article['image']))
                <img src="{{ $article['image'] }}" alt="{{ $article['imageAlt'] ?? ($article['title'] ?? '') }}" width="800" height="500">
            @endif
            @if ($slug !== '')
                <p><a href="{{ url('/articles') }}/{{ $slug }}">{{ $article['title'] ?? 'Read article' }}</a></p>
            @endif
        </section>
    @endforeach
    <p>
        <a href="/">Home</a> ·
        <a href="/articles">Articles &amp; guides</a> ·
        <a href="/guides">Hifz guides</a> ·
        <a href="/tools">Free Hifz tools</a>
    </p>
</article>
