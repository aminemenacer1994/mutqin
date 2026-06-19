@extends('layouts.app')

@section('content')
    <section class="shell admin-page">
        <div class="admin-page-head">
            <div>
                <span class="profile-kicker">Admin</span>
                <h1>Contact Messages</h1>
                <p>Review inbound questions, resolve them when handled, or delete spam and duplicates.</p>
            </div>
            <div class="admin-filter-tabs">
                <a class="billing-secondary-btn {{ $status !== 'resolved' ? 'admin-filter-active' : '' }}" href="{{ route('admin.contact-messages.index', ['status' => 'open']) }}">Open</a>
                <a class="billing-secondary-btn {{ $status === 'resolved' ? 'admin-filter-active' : '' }}" href="{{ route('admin.contact-messages.index', ['status' => 'resolved']) }}">Resolved</a>
            </div>
        </div>

        @if (session('contact_status'))
            <div class="billing-alert billing-alert-success">{{ session('contact_status') }}</div>
        @endif

        @if ($messages->isEmpty())
            <div class="profile-card">
                <p class="mb-0">No contact messages in this view.</p>
            </div>
        @else
            <div class="admin-message-list">
                @foreach ($messages as $message)
                    <article class="profile-card admin-message-card">
                        <div class="admin-message-head">
                            <div>
                                <div class="admin-message-title-row">
                                    <h2>{{ $message->subject }}</h2>
                                    <span class="admin-message-status admin-message-status-{{ $message->status }}">{{ ucfirst($message->status) }}</span>
                                </div>
                                <p>{{ $message->name }} · <a href="mailto:{{ $message->email }}">{{ $message->email }}</a></p>
                            </div>
                            <small>{{ $message->created_at?->format('j M Y, H:i') }}</small>
                        </div>

                        <div class="admin-message-body">
                            {{ $message->message }}
                        </div>

                        <div class="admin-message-actions">
                            @if ($message->status !== 'resolved')
                                <form method="POST" action="{{ route('admin.contact-messages.resolve', $message) }}">
                                    @csrf
                                    @method('PATCH')
                                    <button type="submit" class="billing-primary-btn">Resolve</button>
                                </form>
                            @endif

                            <form method="POST" action="{{ route('admin.contact-messages.destroy', $message) }}" onsubmit="return confirm('Delete this contact message?');">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="billing-secondary-btn">Delete</button>
                            </form>
                        </div>
                    </article>
                @endforeach
            </div>

            <div class="admin-pagination">
                {{ $messages->links() }}
            </div>
        @endif
    </section>
@endsection
