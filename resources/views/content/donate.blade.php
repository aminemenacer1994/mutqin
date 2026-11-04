@extends('layouts.app')

@push('head')
    <style>
        /* Keep donate usable until the Vue island loads (same pattern as home). */
        donation-page > .seo-ssr {
            position: static;
            width: auto;
            height: auto;
            max-width: 40rem;
            margin: 0 auto;
            padding: clamp(2rem, 5vw, 3rem) 1.5rem 3rem;
            overflow: visible;
            clip: auto;
            white-space: normal;
            color: var(--text);
        }
        donation-page > .seo-ssr h1 {
            font-size: clamp(1.65rem, 4vw, 2.1rem);
            margin: 0 0 0.75rem;
        }
        donation-page > .seo-ssr p {
            line-height: 1.65;
            color: var(--text-muted);
        }
        donation-page > .seo-ssr form {
            margin-top: 1.25rem;
            display: grid;
            gap: 0.75rem;
        }
        donation-page > .seo-ssr label {
            display: grid;
            gap: 0.35rem;
            font-size: 0.88rem;
            font-weight: 600;
        }
        donation-page > .seo-ssr input[type="number"],
        donation-page > .seo-ssr input[type="email"] {
            padding: 0.65rem 0.75rem;
            border-radius: 0.75rem;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text);
        }
        donation-page > .seo-ssr button[type="submit"] {
            min-height: 2.75rem;
            border: 0;
            border-radius: 0.85rem;
            background: var(--accent);
            color: #fff;
            font-weight: 650;
            cursor: pointer;
        }
    </style>
@endpush

@section('content')
    @if (session('donation_status'))
        <div class="container-fluid shell">
            <div class="billing-alert billing-alert-success" role="status">{{ session('donation_status') }}</div>
        </div>
    @endif
    @if (session('donation_error'))
        <div class="container-fluid shell">
            <div class="billing-alert billing-alert-error" role="alert">{{ session('donation_error') }}</div>
        </div>
    @endif
    <donation-page>
        @include('partials.seo-ssr-donate')
    </donation-page>
@endsection
