@extends('layouts.app')

@section('content')
    @php
        $memorisationUser = Auth::user();
        $memorisationAuth = [
            'check' => Auth::check(),
            'id' => Auth::id(),
            'dashboard_url' => route('dashboard'),
            'locale' => Auth::user()?->locale ?? 'en',
            'theme' => Auth::check()
                ? \App\Support\Theme::normalizePreference($memorisationUser?->theme)
                : null,
        ];
    @endphp

    <hifz-examination :auth='@json($memorisationAuth)'></hifz-examination>
@endsection