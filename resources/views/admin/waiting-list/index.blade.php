@extends('layouts.app')

@section('content')
    <section class="shell admin-page">
        <div class="admin-page-head">
            <div>
                <span class="profile-kicker">Admin</span>
                <h1>Waiting List</h1>
                <p>People who signed up to be notified when Mutqin opens further access.</p>
            </div>
            <div class="admin-filter-tabs">
                <a class="billing-secondary-btn" href="{{ route('admin.dashboard') }}">Dashboard</a>
                <a class="billing-secondary-btn" href="{{ route('admin.contact-messages.index') }}">Contact messages</a>
            </div>
        </div>

        @if ($entries->isEmpty())
            <div class="profile-card">
                <p class="mb-0">No waiting-list entries yet.</p>
            </div>
        @else
            <div class="profile-card profile-card-wide">
                <div class="table-responsive">
                    <table class="table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Joined</th>
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
