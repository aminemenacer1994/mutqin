@php
    $article = $article ?? [];
    $slugify = static function (?string $value): string {
        $value = strtolower((string) $value);
        $value = preg_replace("/['’]+/u", '', $value) ?? '';
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';

        return trim($value, '-');
    };
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

    @foreach ($article['intro'] ?? [] as $paragraph)
        <p>{!! \App\Support\Seo\SeoProse::toHtml((string) $paragraph) !!}</p>
    @endforeach

    @if (! empty($article['introQuote']['arabic']))
        <figure>
            <blockquote lang="ar" dir="rtl"><p>{{ $article['introQuote']['arabic'] }}</p></blockquote>
            @if (! empty($article['introQuote']['translation']))
                <p>{{ $article['introQuote']['translation'] }}</p>
            @endif
            <p>
                {{ $article['introQuote']['reference'] ?? '' }}
                @if (! empty($article['introQuote']['sourceUrl']))
                    · <a href="{{ $article['introQuote']['sourceUrl'] }}" rel="noopener noreferrer">{{ $article['introQuote']['sourceLabel'] ?? 'Source' }}</a>
                @endif
            </p>
        </figure>
    @endif

    @foreach ($article['sections'] ?? [] as $section)
        @php
            $sectionId = (string) ($section['id'] ?? $slugify($section['h2'] ?? ''));
        @endphp
        <h2 id="{{ $sectionId }}">{{ $section['h2'] ?? '' }}</h2>
        @foreach ($section['paragraphs'] ?? [] as $paragraph)
            <p>{!! \App\Support\Seo\SeoProse::toHtml((string) $paragraph) !!}</p>
        @endforeach
        @foreach ($section['quotes'] ?? [] as $quote)
            @if (! empty($quote['arabic']))
                <figure>
                    <blockquote lang="ar" dir="rtl"><p>{{ $quote['arabic'] }}</p></blockquote>
                    @if (! empty($quote['translation']))
                        <p>{{ $quote['translation'] }}</p>
                    @endif
                    <p>
                        {{ $quote['reference'] ?? '' }}
                        @if (! empty($quote['sourceUrl']))
                            · <a href="{{ $quote['sourceUrl'] }}" rel="noopener noreferrer">{{ $quote['sourceLabel'] ?? 'Source' }}</a>
                        @endif
                    </p>
                    @if (! empty($quote['note']))
                        <p>{{ $quote['note'] }}</p>
                    @endif
                </figure>
            @endif
        @endforeach
        @if (! empty($section['image']['src']))
            <figure>
                <img src="{{ $section['image']['src'] }}" alt="{{ $section['image']['alt'] ?? ($section['h2'] ?? '') }}" width="800" height="500" loading="lazy">
                @if (! empty($section['image']['credit']))
                    <figcaption>Photo: {{ $section['image']['credit'] }} / Pexels</figcaption>
                @endif
            </figure>
        @endif
        @if (! empty($section['steps']))
            <ol>
                @foreach ($section['steps'] as $step)
                    <li>
                        <h3>{{ $step['title'] ?? '' }}</h3>
                        <p>{!! \App\Support\Seo\SeoProse::toHtml((string) ($step['body'] ?? '')) !!}</p>
                    </li>
                @endforeach
            </ol>
        @endif
        @if (! empty($section['sequence']['items']))
            <h3>{{ $section['sequence']['title'] ?? '' }}</h3>
            @if (! empty($section['sequence']['intro']))
                <p>{{ $section['sequence']['intro'] }}</p>
            @endif
            <ol>
                @foreach ($section['sequence']['items'] as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ol>
            @if (! empty($section['sequence']['outro']))
                <p>{{ $section['sequence']['outro'] }}</p>
            @endif
        @endif
        @if (! empty($section['comparison']))
            @if (! empty($section['comparison']['intro']))
                <p>{{ $section['comparison']['intro'] }}</p>
            @endif
            <h3>{{ $section['comparison']['left']['title'] ?? '' }}</h3>
            <p>{{ $section['comparison']['left']['body'] ?? '' }}</p>
            <h3>{{ $section['comparison']['right']['title'] ?? '' }}</h3>
            <p>{{ $section['comparison']['right']['body'] ?? '' }}</p>
        @endif
        @if (! empty($section['routine']))
            <ol>
                @foreach ($section['routine'] as $item)
                    <li>
                        <h3>{{ $item['title'] ?? '' }}</h3>
                        <p>{{ $item['body'] ?? '' }}</p>
                    </li>
                @endforeach
            </ol>
        @endif
        @foreach ($section['subs'] ?? [] as $sub)
            <h3>{{ $sub['h3'] ?? '' }}</h3>
            @foreach ($sub['paragraphs'] ?? [] as $paragraph)
                <p>{!! \App\Support\Seo\SeoProse::toHtml((string) $paragraph) !!}</p>
            @endforeach
            @foreach ($sub['quotes'] ?? [] as $quote)
                @if (! empty($quote['arabic']))
                    <figure>
                        <blockquote lang="ar" dir="rtl"><p>{{ $quote['arabic'] }}</p></blockquote>
                        @if (! empty($quote['translation']))
                            <p>{{ $quote['translation'] }}</p>
                        @endif
                        <p>
                            {{ $quote['reference'] ?? '' }}
                            @if (! empty($quote['sourceUrl']))
                                · <a href="{{ $quote['sourceUrl'] }}" rel="noopener noreferrer">{{ $quote['sourceLabel'] ?? 'Source' }}</a>
                            @endif
                        </p>
                        @if (! empty($quote['note']))
                            <p>{{ $quote['note'] }}</p>
                        @endif
                    </figure>
                @endif
            @endforeach
        @endforeach
        @foreach ($section['paragraphsAfter'] ?? [] as $paragraph)
            <p>{!! \App\Support\Seo\SeoProse::toHtml((string) $paragraph) !!}</p>
        @endforeach
    @endforeach

    @if (! empty($article['cta']['heading']))
        <aside>
            <h2>{{ $article['cta']['heading'] }}</h2>
            @if (! empty($article['cta']['body']))
                <p>{{ $article['cta']['body'] }}</p>
            @endif
            @if (! empty($article['cta']['href']) && ! empty($article['cta']['label']))
                <p><a href="{{ $article['cta']['href'] }}">{{ $article['cta']['label'] }}</a></p>
            @endif
        </aside>
    @endif

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
