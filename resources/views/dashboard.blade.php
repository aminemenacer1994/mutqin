@extends('layouts.app')

@section('content')
    @include('partials.preview-demo-banner')
    <user-dashboard
        :auth='@json($dashboardAuth)'
        :initial-data='@json($dashboard)'
    ></user-dashboard>
@endsection
