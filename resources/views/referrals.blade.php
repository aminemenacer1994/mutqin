@extends('layouts.app')

@section('content')
    <referral-programme
        :initial='@json($referral)'
    ></referral-programme>
@endsection
