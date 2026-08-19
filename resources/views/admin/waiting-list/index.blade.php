@extends('layouts.app')

@section('content')
    <section class="shell admin-page">
        <div class="admin-page-head">
            <div>
                <span class="profile-kicker">{{ __('admin.kicker') }}</span>
                <h1>{{ __('admin.waiting_list.title') }}</h1>
                <p>{{ __('admin.waiting_list.description') }}</p>
            </div>
            <div class="admin-filter-tabs">
                <a class="billing-secondary-btn" href="{{ route('admin.dashboard') }}">{{ __('admin.dashboard') }}</a>
                <a class="billing-secondary-btn" href="{{ route('admin.contact-messages.index') }}">{{ __('admin.waiting_list.contact_messages') }}</a>
            </div>
        </div>

        @if ($entries->isEmpty())
            <div class="profile-card">
                <p class="mb-0">{{ __('admin.waiting_list.empty') }}</p>
            </div>
        @else
            <div class="profile-card profile-card-wide">
                <div class="table-responsive">
                    <table class="table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th scope="col">{{ __('admin.waiting_list.name') }}</th>
                                <th scope="col">{{ __('admin.waiting_list.email') }}</th>
                                <th scope="col">{{ __('admin.waiting_list.joined') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($entries as $entry)
                                <tr>
                                    <td>{{ $entry->name }}</td>
                                    <td>
                                        <a href="mailto:{{ $entry->email }}">{{ $entry->email }}</a>
                                    </td>
                                    <td>
                                        <time datetime="{{ $entry->created_at?->toIso8601String() }}">
                                            {{ $entry->created_at?->format('j M Y, H:i') }}
                                        </time>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="admin-pagination">
                {{ $entries->links() }}
            </div>
        @endif
    </section>
@endsection
