@extends('layouts.app')

@section('content')
    <admin-growth :auth='@json($growthAuth)'></admin-growth>
@endsection
