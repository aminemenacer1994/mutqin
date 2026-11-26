@extends('layouts.app')

@push('head')
    <script>
        window.mutqinLandingPreview = true;
    </script>
@endpush

@section('content')
    <preview-demo-page
        :flash-error='@json(session("preview_demo_error"))'
        enter-url="{{ route('preview.demo.enter') }}"
        status-url="{{ route('preview.demo.status') }}"
        exit-url="{{ route('preview.demo.exit') }}"
    ></preview-demo-page>
@endsection