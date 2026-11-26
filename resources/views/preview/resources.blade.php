@extends('layouts.app')

@push('head')
    <script>
        window.mutqinLandingPreview = true;
    </script>
@endpush

@section('content')
    <preview-resources-page></preview-resources-page>
@endsection