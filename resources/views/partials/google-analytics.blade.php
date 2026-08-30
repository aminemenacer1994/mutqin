@php
    $gaId = trim((string) config('services.google_analytics.measurement_id'));
    $gaEnabled = (bool) config('services.google_analytics.enabled')
        && $gaId !== ''
        && (bool) preg_match('/^G-[A-Z0-9]+$/', $gaId)
        && ! request()->boolean('mutqin_embed');
@endphp
@if ($gaEnabled)
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id={{ $gaId }}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', @json($gaId));
    </script>
@endif
