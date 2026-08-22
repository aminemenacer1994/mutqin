@if (config('app.show_demo_accounts'))
    <aside class="auth-tester-notice" role="note" aria-label="{{ __('ui.auth_demo_title') }}">
        <div class="auth-tester-notice__copy">
            <p class="auth-tester-notice__title">{{ __('ui.auth_demo_title') }}</p>
            <p class="auth-tester-notice__intro">{{ __('ui.auth_demo_intro') }}</p>
        </div>

        <form method="POST" action="{{ route('login.demo') }}" class="auth-tester-notice__form">
            @csrf
            <button
                type="submit"
                class="auth-tester-notice__fill auth-tester-notice__fill--primary"
                data-default-label="{{ __('ui.auth_demo_use') }}"
            >
                {{ __('ui.auth_demo_use') }}
            </button>
        </form>
    </aside>
@endif
