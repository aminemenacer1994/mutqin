@extends('layouts.app')

@section('content')
    <style>
        html,
        body,
        #app,
        #mainContent {
            overflow-x: hidden;
            overflow-y: auto !important;
            height: auto !important;
            max-height: none !important;
        }
        body {
            background: #f3efe6;
        }
    </style>
    <madani-spread
        :page='@json($page)'
        font-family="{{ $fontFamily }}"
        font-url="{{ $fontUrl }}"
    ></madani-spread>
@endsection
