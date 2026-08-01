@extends('layouts.app')

@section('content')
    <user-dashboard
        :auth='@json($dashboardAuth)'
        :initial-data='@json($dashboard)'
    ></user-dashboard>
@endsection
