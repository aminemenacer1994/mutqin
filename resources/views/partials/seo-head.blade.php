@php
    $seo = $seo ?? \App\Support\Seo\SeoCatalog::forRequest(request());
@endphp
<title>{{ $seo->title }}</title>
<meta name="description" content="{{ $seo->description }}" data-mutqin-seo="1">
@if ($seo->keywords !== '')
<meta name="keywords" content="{{ $seo->keywords }}" data-mutqin-seo="1">
@endif
<meta name="robots" content="{{ $seo->robots }}" data-mutqin-seo="1">
@if ($googleVerification = trim((string) config('seo.google_site_verification', '')))
<meta name="google-site-verification" content="{{ $googleVerification }}">
@endif
@if ($bingVerification = trim((string) config('seo.bing_site_verification', '')))
<meta name="msvalidate.01" content="{{ $bingVerification }}">
@endif
<link rel="canonical" href="{{ $seo->canonical }}" data-mutqin-seo="1">
@foreach ($seo->hreflang as $alternate)
    <link rel="alternate" hreflang="{{ $alternate['hreflang'] }}" href="{{ $alternate['href'] }}" data-mutqin-seo="1">
@endforeach
<link rel="sitemap" type="application/xml" href="{{ \App\Support\Seo\SeoCatalog::absoluteUrl('/sitemap.xml', 'marketing') }}" data-mutqin-seo="1">
<meta property="og:type" content="{{ $seo->ogType }}" data-mutqin-seo="1">
<meta property="og:site_name" content="Mutqin" data-mutqin-seo="1">
<meta property="og:title" content="{{ $seo->ogTitle }}" data-mutqin-seo="1">
<meta property="og:description" content="{{ $seo->ogDescription }}" data-mutqin-seo="1">
<meta property="og:url" content="{{ $seo->ogUrl }}" data-mutqin-seo="1">
<meta property="og:image" content="{{ $seo->ogImage }}" data-mutqin-seo="1">
<meta property="og:image:width" content="{{ $seo->ogImageWidth }}" data-mutqin-seo="1">
<meta property="og:image:height" content="{{ $seo->ogImageHeight }}" data-mutqin-seo="1">
<meta property="og:image:alt" content="{{ $seo->ogImageAlt }}" data-mutqin-seo="1">
<meta property="og:locale" content="{{ $seo->ogLocale }}" data-mutqin-seo="1">
<meta name="twitter:card" content="{{ $seo->twitterCard }}" data-mutqin-seo="1">
<meta name="twitter:title" content="{{ $seo->twitterTitle }}" data-mutqin-seo="1">
<meta name="twitter:description" content="{{ $seo->twitterDescription }}" data-mutqin-seo="1">
<meta name="twitter:image" content="{{ $seo->twitterImage }}" data-mutqin-seo="1">
<meta name="twitter:image:alt" content="{{ $seo->ogImageAlt }}" data-mutqin-seo="1">
@if ($seo->jsonLd !== [])
<script type="application/ld+json" data-mutqin-seo="1">{!! json_encode([
    '@context' => 'https://schema.org',
    '@graph' => $seo->jsonLd,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
@endif
<script>
    window.mutqinSeo = @json($seo->toArray());
</script>
<style id="mutqin-seo-ssr">
  .seo-ssr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  html[data-mutqin-app-mounted] .seo-ssr {
    display: none;
  }
</style>
