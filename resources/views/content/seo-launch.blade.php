@php
    $seoPage = $seoPage ?? \App\Support\Seo\SeoLaunchPages::forPath(request()->path());
    abort_unless($seoPage !== null, 404);
@endphp

@extends('layouts.app')

@section('content')
    <seo-launch-page>
        @include('partials.seo-ssr-launch', ['seoPage' => $seoPage])
    </seo-launch-page>
    <script>
        window.mutqinSeoPage = @json($seoPage);
    </script>
@endsection
