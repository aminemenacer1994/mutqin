<article class="seo-ssr">
    <h1>{{ __('donation.page_title') }}</h1>
    <p>{{ __('donation.page_lead') }}</p>
    <form method="POST" action="{{ route('donate.checkout') }}">
        @csrf
        <label>
            {{ __('donation.amount_label') }}
            <input type="number" name="amount" min="5" max="10000" step="0.01" value="10" required>
        </label>
        @guest
            <label>
                {{ __('donation.email_label') }}
                <input type="email" name="email" autocomplete="email" maxlength="255">
            </label>
        @endguest
        <button type="submit">{{ __('donation.submit') }}</button>
    </form>
    <p><a href="{{ route('home') }}">{{ __('ui.home') }}</a> · <a href="{{ route('pricing') }}">{{ __('ui.pricing') }}</a></p>
</article>
