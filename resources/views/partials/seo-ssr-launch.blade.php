<article class="seo-ssr">
    <nav aria-label="Breadcrumb">
        @foreach ($seoPage['breadcrumbs'] as $crumb)
            @if (! $loop->first) · @endif
            <a href="{{ $crumb['path'] }}">{{ $crumb['name'] }}</a>
        @endforeach
    </nav>
    <h1>{{ $seoPage['h1'] }}</h1>
    <p>{{ $seoPage['lede'] }}</p>
    @foreach ($seoPage['sections'] as $section)
        <h2>{{ $section['h2'] }}</h2>
        @foreach ($section['paragraphs'] as $paragraph)
            <p>{{ $paragraph }}</p>
        @endforeach
        @foreach ($section['subs'] ?? [] as $sub)
            <h3>{{ $sub['h3'] }}</h3>
            @foreach ($sub['paragraphs'] as $paragraph)
                <p>{{ $paragraph }}</p>
            @endforeach
        @endforeach
    @endforeach
    <nav>
        @foreach ($seoPage['links'] as $link)
            <a href="{{ $link['href'] }}">{{ $link['label'] }}</a>
        @endforeach
        <a href="{{ $seoPage['cta_primary']['href'] }}">{{ $seoPage['cta_primary']['label'] }}</a>
        <a href="{{ $seoPage['cta_secondary']['href'] }}">{{ $seoPage['cta_secondary']['label'] }}</a>
    </nav>
    @if (! empty($seoPage['tool']))
        <p>This page includes a free interactive tool you can use without creating an account.</p>
    @endif
</article>
