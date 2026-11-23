@extends('layouts.app')

@section('content')
    <parent-link-redeem :auth='@json($auth)'></parent-link-redeem>
@endsection