<article class="seo-ssr">
    <nav aria-label="Breadcrumb">
        @foreach ($seoPage['breadcrumbs'] as $crumb)
            @if (! $loop->first) · @endif
            <a href="{{ $crumb['path'] }}">{{ $crumb['name'] }}</a>
        @endforeach
    </nav>
    <h1>{{ $seoPage['h1'] }}</h1>
    <p>{!! \App\Support\Seo\SeoProse::toHtml($seoPage['lede'] ?? '') !!}</p>
    @if (! empty($seoPage['author']) || ! empty($seoPage['published_at']))
        <p>
            @if (! empty($seoPage['author']))
                {{ $seoPage['author'] }}
            @endif
            @if (! empty($seoPage['published_at']))
                · Published {{ $seoPage['published_at'] }}
            @endif
            @if (! empty($seoPage['updated_at']) && ($seoPage['updated_at'] !== ($seoPage['published_at'] ?? null)))
                · Updated {{ $seoPage['updated_at'] }}
            @endif
        </p>
    @endif
    @foreach ($seoPage['sections'] as $section)
        <h2>{{ $section['h2'] }}</h2>
        @foreach ($section['paragraphs'] as $paragraph)
            <p>{!! \App\Support\Seo\SeoProse::toHtml($paragraph) !!}</p>
        @endforeach
        @foreach ($section['subs'] ?? [] as $sub)
            <h3>{{ $sub['h3'] }}</h3>
            @foreach ($sub['paragraphs'] as $paragraph)
                <p>{!! \App\Support\Seo\SeoProse::toHtml($paragraph) !!}</p>
            @endforeach
        @endforeach
    @endforeach
    @if (! empty($seoPage['related_feature']['href']))
        <p>
            <a href="{{ $seoPage['related_feature']['href'] }}">{{ $seoPage['related_feature']['label'] }}</a>
        </p>
    @endif
    @if (! empty($seoPage['related_guides']))
        <h2>Related guides</h2>
        <nav>
            @foreach ($seoPage['related_guides'] as $related)
                <a href="{{ $related['href'] }}">{{ $related['label'] }}</a>
            @endforeach
        </nav>
    @endif
    @if (! empty($seoPage['related_tools']))
        <h2>Related tools</h2>
        <nav>
            @foreach ($seoPage['related_tools'] as $related)
                <a href="{{ $related['href'] }}">{{ $related['label'] }}</a>
            @endforeach
        </nav>
    @endif
    @if (! empty($seoPage['related_features']))
        <h2>Related features</h2>
        <nav>
            @foreach ($seoPage['related_features'] as $related)
                <a href="{{ $related['href'] }}">{{ $related['label'] }}</a>
            @endforeach
        </nav>
    @endif
    @if (! empty($seoPage['related_articles']))
        <h2>Related guides</h2>
        <nav>
            @foreach ($seoPage['related_articles'] as $related)
                <a href="{{ $related['href'] }}">{{ $related['label'] }}</a>
            @endforeach
        </nav>
    @endif
    <nav>
        @foreach ($seoPage['links'] as $link)
            <a href="{{ $link['href'] }}">{{ $link['label'] }}</a>
        @endforeach
        <a href="{{ $seoPage['cta_primary']['href'] }}">{{ $seoPage['cta_primary']['label'] }}</a>
        <a href="{{ $seoPage['cta_secondary']['href'] }}">{{ $seoPage['cta_secondary']['label'] }}</a>
    </nav>
</article>
