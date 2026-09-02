@extends('layouts.app')

@section('content')
    <section class="shell admin-page">
        <div class="admin-page-head">
            <div>
                <span class="profile-kicker">{{ __('admin.kicker') }}</span>
                <h1>{{ __('admin.contact_messages.title') }}</h1>
                <p>{{ __('admin.contact_messages.description') }}</p>
            </div>
            <div class="admin-filter-tabs">
                <a class="billing-secondary-btn {{ $status !== 'resolved' ? 'admin-filter-active' : '' }}" href="{{ route('admin.contact-messages.index', ['status' => 'open']) }}">{{ __('admin.contact_messages.open') }}</a>
                <a class="billing-secondary-btn {{ $status === 'resolved' ? 'admin-filter-active' : '' }}" href="{{ route('admin.contact-messages.index', ['status' => 'resolved']) }}">{{ __('admin.contact_messages.resolved') }}</a>
                <a class="billing-secondary-btn" href="{{ route('admin.waiting-list.index') }}">{{ __('admin.contact_messages.waiting_list') }}</a>
                <a class="billing-secondary-btn" href="{{ route('admin.feedback.index') }}">{{ __('admin.contact_messages.feedback') }}</a>
            </div>
        </div>

        @if (session('contact_status'))
            <div class="billing-alert billing-alert-success">{{ session('contact_status') }}</div>
        @endif

        @if ($messages->isEmpty())
            <div class="profile-card">
                <p class="mb-0">{{ __('admin.contact_messages.empty') }}</p>
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
                                    <button type="submit" class="billing-primary-btn">{{ __('admin.contact_messages.resolve') }}</button>
                                </form>
                            @endif

                            <form method="POST" action="{{ route('admin.contact-messages.destroy', $message) }}" onsubmit="return confirm(@json(__('admin.contact_messages.delete_confirm')));">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="billing-secondary-btn">{{ __('admin.contact_messages.delete') }}</button>
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
