@php
    abort_unless(isset($seoPage) && is_array($seoPage), 404);
@endphp

@extends('layouts.app')

@section('content')
    <seo-launch-page>
        @include('partials.seo-ssr-article', ['seoPage' => $seoPage])
    </seo-launch-page>
    <script>
        window.mutqinSeoPage = @json($seoPage);
    </script>
@endsection
