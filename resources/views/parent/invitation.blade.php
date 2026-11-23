@extends('layouts.app')

@section('content')
    <parent-invitation :auth='@json($auth)'></parent-invitation>
@endsection