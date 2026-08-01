@extends('layouts.app')

@section('content')
    <admin-dashboard
        :auth='@json($dashboardAuth)'
        :initial-data='@json($dashboard)'
    ></admin-dashboard>
@endsection
