@php
    $article = $article ?? [];
@endphp
<article class="seo-ssr">
    <nav aria-label="Breadcrumb">
        <a href="/">Home</a> ·
        <a href="/articles">Articles</a> ·
        <span>{{ $article['title'] ?? '' }}</span>
    </nav>
    <p>{{ $article['category'] ?? '' }}</p>
    <h1>{{ $article['title'] ?? '' }}</h1>
    <p>{{ $article['lede'] ?? $article['excerpt'] ?? '' }}</p>
    <p>
        Published {{ $article['publishedAt'] ?? '' }}
        @if (! empty($article['updatedAt']) && ($article['updatedAt'] !== ($article['publishedAt'] ?? null)))
            · Updated {{ $article['updatedAt'] }}
        @endif
        @if (! empty($article['readingMinutes']))
            · {{ $article['readingMinutes'] }} min read
        @endif
    </p>
    @if (! empty($article['image']))
        <img src="{{ $article['image'] }}" alt="{{ $article['imageAlt'] ?? ($article['title'] ?? '') }}" width="800" height="500">
    @endif
    @foreach ($article['sections'] ?? [] as $section)
        <h2>{{ $section['h2'] ?? '' }}</h2>
        @foreach ($section['paragraphs'] ?? [] as $paragraph)
            <p>{!! \App\Support\Seo\SeoProse::toHtml((string) $paragraph) !!}</p>
        @endforeach
        @foreach ($section['subs'] ?? [] as $sub)
            <h3>{{ $sub['h3'] ?? '' }}</h3>
            @foreach ($sub['paragraphs'] ?? [] as $paragraph)
                <p>{!! \App\Support\Seo\SeoProse::toHtml((string) $paragraph) !!}</p>
            @endforeach
        @endforeach
    @endforeach
    @if (! empty($article['path']))
        <p>
            <a href="https://wa.me/?text={{ rawurlencode(($article['title'] ?? '').' '.(\App\Support\Seo\SeoCatalog::absoluteUrl($article['path'], 'marketing'))) }}">WhatsApp</a>
        </p>
    @endif
    @if (! empty($article['related']))
        <h2>Related articles</h2>
        <nav>
            @foreach ($article['related'] as $related)
                <a href="{{ $related['href'] ?? '' }}">{{ $related['title'] ?? '' }}</a>
            @endforeach
        </nav>
    @endif
    <p><a href="/articles">All articles</a> · <a href="/guides">Hifz guides</a> · <a href="/tools">Free Hifz tools</a></p>
</article>
