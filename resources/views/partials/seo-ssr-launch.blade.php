@php
    $isFeaturesHub = ($seoPage['id'] ?? '') === 'features-hub' || ($seoPage['path'] ?? '') === '/features';
@endphp

@if ($isFeaturesHub && ! empty($seoPage['showcase']))
    <div class="articles-page how-it-works-page">
        <section class="articles-hero" aria-labelledby="how-it-works-heading">
            <div class="wrap">
                <header class="section-head articles-hero__head">
                    <p class="section-kicker">{{ $seoPage['kicker'] ?? '' }}</p>
                    <h1 id="how-it-works-heading" class="articles-title">{{ $seoPage['h1'] ?? '' }}</h1>
                    <p class="section-sub">{!! \App\Support\Seo\SeoProse::toHtml($seoPage['lede'] ?? '') !!}</p>
                </header>
            </div>
        </section>
        <section class="articles-grid-section" aria-label="Mutqin walkthroughs">
            <div class="wrap">
                @php
                    $featuredTutorial = \App\Support\Seo\SeoLaunchPages::featuredTutorial();
                @endphp
                @if (is_array($featuredTutorial))
                    <article class="walkthrough-card walkthrough-card--featured">
                        <button type="button" class="walkthrough-card__hit" aria-label="Watch video: {{ $featuredTutorial['label'] }}">
                            <div class="walkthrough-card__media">
                                <img
                                    class="walkthrough-card__image"
                                    src="{{ $featuredTutorial['image'] }}"
                                    alt="{{ $featuredTutorial['image_alt'] }}"
                                    width="1280"
                                    height="720"
                                    loading="lazy"
                                    decoding="async"
                                >
                                @if (! empty($featuredTutorial['duration_label']))
                                    <p class="walkthrough-card__duration">{{ $featuredTutorial['duration_label'] }}</p>
                                @endif
                            </div>
                            <div class="walkthrough-card__body">
                                <h2 class="walkthrough-card__title">{{ $featuredTutorial['label'] }}</h2>
                                <p class="walkthrough-card__excerpt">{{ $featuredTutorial['summary'] }}</p>
                            </div>
                        </button>
                    </article>
                @endif
                <div class="articles-grid">
                    @foreach ($seoPage['showcase'] as $item)
                        <article class="walkthrough-card">
                            <button type="button" class="walkthrough-card__hit" aria-label="Watch video: {{ $item['label'] }}">
                                <div class="walkthrough-card__media">
                                    @if (! empty($item['image']))
                                        <img
                                            class="walkthrough-card__image"
                                            src="{{ $item['image'] }}"
                                            alt="{{ $item['image_alt'] ?? $item['label'] }}"
                                            width="800"
                                            height="450"
                                            loading="lazy"
                                            decoding="async"
                                        >
                                    @endif
                                    @if (! empty($item['duration_label']))
                                        <p class="walkthrough-card__duration">{{ $item['duration_label'] }}</p>
                                    @endif
                                </div>
                                <div class="walkthrough-card__body">
                                    @if (! empty($item['category']))
                                        <p class="walkthrough-card__category">{{ $item['category'] }}</p>
                                    @endif
                                    <h2 class="walkthrough-card__title">{{ $item['label'] }}</h2>
                                    <p class="walkthrough-card__excerpt">{{ $item['summary'] }}</p>
                                </div>
                            </button>
                        </article>
                    @endforeach
                </div>
            </div>
        </section>
    </div>
@else
    <article class="seo-ssr">
        <nav aria-label="Breadcrumb">
            @foreach ($seoPage['breadcrumbs'] as $crumb)
                @if (! $loop->first) · @endif
                <a href="{{ $crumb['path'] }}">{{ $crumb['name'] }}</a>
            @endforeach
        </nav>
        <h1>{{ $seoPage['h1'] }}</h1>
        <p>{!! \App\Support\Seo\SeoProse::toHtml($seoPage['lede'] ?? '') !!}</p>
        @if (! empty($seoPage['showcase']))
            <section aria-label="Mutqin walkthroughs">
                @foreach ($seoPage['showcase'] as $item)
                    <article>
                        @if (! empty($item['category']))
                            <p>{{ $item['category'] }}</p>
                        @endif
                        <h2><a href="{{ $item['href'] }}">{{ $item['label'] }}</a></h2>
                        <p>{{ $item['summary'] }}</p>
                        @if (! empty($item['image']))
                            <img src="{{ $item['image'] }}" alt="{{ $item['image_alt'] ?? $item['label'] }}" width="800" height="500">
                        @endif
                        <p><a href="{{ $item['href'] }}">{{ $item['label'] }}</a></p>
                    </article>
                @endforeach
            </section>
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
        <nav>
            @foreach ($seoPage['links'] as $link)
                <a href="{{ $link['href'] }}">{{ $link['label'] }}</a>
            @endforeach
            <a href="{{ $seoPage['cta_primary']['href'] }}">{{ $seoPage['cta_primary']['label'] }}</a>
            <a href="{{ $seoPage['cta_secondary']['href'] }}">{{ $seoPage['cta_secondary']['label'] }}</a>
        </nav>
        @if (! empty($seoPage['tool']))
            <h2>Interactive tool</h2>
            <p>This page includes a free interactive tool you can use without creating an account. Open the page in a browser to run the calculator, test, or finder above the explanatory sections.</p>
        @endif
        @if (! empty($seoPage['related_feature']['href']))
            <h2>Continue in Mutqin</h2>
            <p><a href="{{ $seoPage['related_feature']['href'] }}">{{ $seoPage['related_feature']['label'] }}</a></p>
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
        @if (! empty($seoPage['faqs']))
            <h2>FAQ</h2>
            @foreach ($seoPage['faqs'] as $faq)
                <h3>{{ $faq['q'] }}</h3>
                <p>{!! \App\Support\Seo\SeoProse::toHtml($faq['a'] ?? '') !!}</p>
            @endforeach
        @endif
        @if (! empty($seoPage['guide_index']['entries']))
            <h2>Browse guides</h2>
            @if (! empty($seoPage['guide_index']['categories']))
                <nav aria-label="Guide categories">
                    <a href="{{ $seoPage['guide_index']['all_href'] }}">All</a>
                    @foreach ($seoPage['guide_index']['categories'] as $category)
                        <a href="{{ $category['href'] }}">{{ $category['label'] }}</a>
                    @endforeach
                </nav>
            @endif
            <nav>
                @foreach ($seoPage['guide_index']['entries'] as $entry)
                    <a href="{{ $entry['href'] }}">{{ $entry['title'] }}</a>
                @endforeach
            </nav>
        @endif
    </article>
@endif
