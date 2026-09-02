@extends('layouts.app')

@section('content')
    <admin-feedback :auth='@json($feedbackAuth)'></admin-feedback>
@endsection
