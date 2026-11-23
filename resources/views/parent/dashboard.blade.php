@extends('layouts.app')

@section('content')
    @if(app()->environment('local') && ! is_file(public_path('css/teacher-dashboard.css')))
        <div class="alert alert-warning border-0 rounded-3 mx-2 mx-md-0 mb-3" role="status">
            Parent workspace styles are missing. Run <code>npx mix</code>, then hard-refresh this page.
        </div>
    @endif
    <parent-dashboard :auth='@json($auth)'></parent-dashboard>
@endsection