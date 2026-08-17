@if (app()->environment('local'))
    <aside
        class="auth-tester-notice"
        role="note"
        aria-label="Local testing account"
        data-auth-tester-notice
        data-test-email="layla.beginner@mutqin.test"
        data-test-password="DemoPass1!"
    >
        <div class="auth-tester-notice__row">
            <span class="auth-tester-notice__label">Local demo</span>
            <span class="auth-tester-notice__account">layla.beginner@mutqin.test</span>
            <button type="button" class="auth-tester-notice__fill" data-auth-fill-test-account>
                Fill
            </button>
        </div>

        <details class="auth-tester-notice__details">
            <summary>More accounts</summary>
            <p>
                Password <span class="auth-tester-notice__mono">DemoPass1!</span>
                · Guide <span class="auth-tester-notice__mono">docs/TESTER_GUIDE.md</span>
                · Seed <span class="auth-tester-notice__mono">php artisan migrate --seed</span>
            </p>
        </details>
    </aside>
@endif
