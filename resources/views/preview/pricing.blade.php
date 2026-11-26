@extends('layouts.app')

@push('head')
    <script>
        window.mutqinLandingPreview = true;
    </script>
@endpush

@section('content')
    <pricing-page v-bind:landing-preview="true">
        @include('partials.seo-ssr-pricing')
    </pricing-page>
@endsection