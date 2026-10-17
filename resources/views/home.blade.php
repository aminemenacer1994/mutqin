@extends('layouts.app')

@push('head')
    <link rel="preload" as="image" href="/images/landing/hero-center.jpg" fetchpriority="high">
    <style>
        /* Keep the server-rendered homepage usable until the Vue page loads. */
        homepage > .seo-ssr {
            position: static;
            width: auto;
            height: auto;
            max-width: 72rem;
            margin: 0 auto;
            padding: clamp(2.5rem, 6vw, 5rem) 1.5rem;
            overflow: visible;
            clip: auto;
            white-space: normal;
            color: var(--text);
        }
        homepage > .seo-ssr h1, homepage > .seo-ssr h2, homepage > .seo-ssr h3 {
            font-family: "Source Serif 4", Georgia, serif;
        }
        homepage > .seo-ssr h1 { max-width: 18ch; font-size: clamp(2.2rem, 5vw, 4rem); }
        homepage > .seo-ssr h2 { margin-top: 2.5rem; }
        homepage > .seo-ssr p { max-width: 65ch; line-height: 1.7; }
        homepage > .seo-ssr nav { display: flex; flex-wrap: wrap; gap: .75rem 1.5rem; margin-top: 2rem; }
    </style>
@endpush

@section('content')
    <div>
        <homepage>
            @include('partials.seo-ssr-home')
        </homepage>
    </div>
@endsection
