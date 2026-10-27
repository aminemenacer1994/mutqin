@extends('layouts.app')

@section('content')
    <section class="shell profile-page">
        <div class="profile-card">
            <h1>{{ __('ui.waiting_list_unsubscribed_title') }}</h1>
            <p class="mb-0">{{ __('ui.waiting_list_unsubscribed_body') }}</p>
        </div>
    </section>
@endsection
