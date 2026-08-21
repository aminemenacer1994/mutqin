@if (config('app.show_demo_accounts'))
    <aside class="auth-tester-notice" role="note" aria-label="{{ __('ui.auth_demo_title') }}">
        <div class="auth-tester-notice__copy">
            <p class="auth-tester-notice__title">{{ __('ui.auth_demo_title') }}</p>
            <p class="auth-tester-notice__intro">{{ __('ui.auth_demo_intro') }}</p>
        </div>

        <button
            type="button"
            class="auth-tester-notice__fill auth-tester-notice__fill--primary"
            data-auth-fill-test-account
            data-auth-submit-after-fill
            data-test-email="layla.beginner@mutqin.test"
            data-test-password="DemoPass1!"
            data-default-label="{{ __('ui.auth_demo_use') }}"
        >
            {{ __('ui.auth_demo_use') }}
        </button>
    </aside>
@endif
