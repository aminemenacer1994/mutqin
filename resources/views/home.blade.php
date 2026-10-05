@extends('layouts.app')

@push('head')
    <link rel="preload" as="image" href="/images/landing/hero-center.jpg" fetchpriority="high">
@endpush

@section('content')
    <div>
        <homepage>
            @include('partials.seo-ssr-home')
        </homepage>
    </div>
@endsection