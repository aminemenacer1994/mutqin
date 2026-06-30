@extends('layouts.app')

@section('content')
    @php
        $memorisationAuth = [
            'check' => Auth::check(),
            'id' => Auth::id(),
            'email' => Auth::user()?->email,
            'name' => Auth::user()?->name,
            'subscription_tier' => Auth::user()?->subscription_tier ?? 'free',
            'subscription_status' => Auth::user()?->subscription_status ?? 'free',
            'has_paid_access' => Auth::user()?->hasPaidAccess() ?? false,
            'locale' => Auth::user()?->locale ?? 'en',
            'ai_recall_mode_enabled' => Auth::user()?->ai_recall_mode_enabled ?? false,
        ];
    @endphp

    <memorisation :auth='@json($memorisationAuth)'></memorisation>
@endsection
