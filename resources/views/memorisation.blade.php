@extends('layouts.app')

@section('content')
    @php
        $memorisationAuth = [
            'check' => Auth::check(),
            'id' => Auth::id(),
            'email' => Auth::user()?->email,
            'name' => Auth::user()?->name,
        ];
    @endphp

    <memorisation :auth='@json($memorisationAuth)'></memorisation>
@endsection
