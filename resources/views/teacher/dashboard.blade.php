@extends('layouts.app')

@section('content')
    <teacher-dashboard :auth='@json($auth)'></teacher-dashboard>
@endsection
