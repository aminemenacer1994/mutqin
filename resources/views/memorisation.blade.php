@extends('layouts.app')

@section('content')
    <memorisation :auth='@json(['check' => Auth::check(), 'id' => Auth::id()])'></memorisation>
@endsection
