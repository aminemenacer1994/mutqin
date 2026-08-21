@if (config('app.show_demo_accounts'))
    @php
        $demoAccounts = [
            [
                'title' => __('ui.auth_demo_account_beginner'),
                'desc' => __('ui.auth_demo_account_beginner_desc'),
                'email' => 'layla.beginner@mutqin.test',
            ],
            [
                'title' => __('ui.auth_demo_account_progress'),
                'desc' => __('ui.auth_demo_account_progress_desc'),
                'email' => 'omar.active@mutqin.test',
            ],
            [
                'title' => __('ui.auth_demo_account_review'),
                'desc' => __('ui.auth_demo_account_review_desc'),
                'email' => 'fatima.reviser@mutqin.test',
            ],
            [
                'title' => __('ui.auth_demo_account_continue'),
                'desc' => __('ui.auth_demo_account_continue_desc'),
                'email' => 'noah.paused@mutqin.test',
            ],
        ];
    @endphp

    <aside class="auth-tester-notice" role="note" aria-label="{{ __('ui.auth_demo_title') }}">
        <details class="auth-tester-notice__panel">
            <summary class="auth-tester-notice__toggle">
                <span class="auth-tester-notice__toggle-copy">
                    <span class="auth-tester-notice__title">{{ __('ui.auth_demo_title') }}</span>
                    <span class="auth-tester-notice__intro">{{ __($introKey ?? 'ui.auth_demo_intro') }}</span>
                </span>
                <span class="auth-tester-notice__chevron" aria-hidden="true"></span>
            </summary>

            <div class="auth-tester-notice__body">
                <ul class="auth-tester-notice__list">
                    @foreach ($demoAccounts as $account)
                        <li class="auth-tester-notice__item">
                            <div class="auth-tester-notice__copy">
                                <span class="auth-tester-notice__name">{{ $account['title'] }}</span>
                                <span class="auth-tester-notice__desc">{{ $account['desc'] }}</span>
                            </div>
                            <button
                                type="button"
                                class="auth-tester-notice__fill"
                                data-auth-fill-test-account
                                data-test-email="{{ $account['email'] }}"
                                data-test-password="DemoPass1!"
                            >
                                {{ __('ui.auth_demo_use') }}
                            </button>
                        </li>
                    @endforeach
                </ul>

                <p class="auth-tester-notice__hint">
                    {{ __('ui.auth_demo_password') }} <strong>DemoPass1!</strong>
                </p>
            </div>
        </details>
    </aside>
@endif
