@extends('layouts.app')

@push('head')
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