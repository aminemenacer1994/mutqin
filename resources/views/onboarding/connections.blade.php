@extends('layouts.app')

@section('content')
    <connection-onboarding :auth='@json($auth)'></connection-onboarding>
@endsection
