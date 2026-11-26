@extends('layouts.app')

@push('head')
    <script>
        window.mutqinLandingPreview = true;
    </script>
@endpush

@section('content')
    <preview-audience-page audience="parents"></preview-audience-page>
@endsection