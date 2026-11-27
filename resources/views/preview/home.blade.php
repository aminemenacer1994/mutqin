@extends('layouts.app')

@push('head')
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..600&family=Newsreader:opsz,wght@6..72,400..600&display=swap" media="print" onload="this.media='all'">
    <noscript>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..600&family=Newsreader:opsz,wght@6..72,400..600&display=swap">
    </noscript>
    <script>
        window.mutqinLandingPreview = true;
    </script>
@endpush

@section('content')
    <div>
        <homepage v-bind:landing-preview="true">
            @include('partials.seo-ssr-home')
        </homepage>
    </div>
@endsection