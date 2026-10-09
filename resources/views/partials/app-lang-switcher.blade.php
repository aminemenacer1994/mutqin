@php
    $appLocale = $appLocale ?? app()->getLocale();
    $languageEndonyms = $languageEndonyms ?? [
        'en' => 'English',
        'fr' => 'Français',
        'ar' => 'العربية',
        'id' => 'Bahasa Indonesia',
        'tr' => 'Türkçe',
        'es' => 'Español',
        'ur' => 'اردو',
    ];
    $appLocaleOptions = $appLocaleOptions ?? [
        'en' => ['flag' => '🇬🇧', 'label' => 'EN'],
        'fr' => ['flag' => '🇫🇷', 'label' => 'FR'],
        'es' => ['flag' => '🇪🇸', 'label' => 'ES'],
    ];
    $activeLocaleOption = $activeLocaleOption ?? ($appLocaleOptions[$appLocale] ?? ['flag' => '🇬🇧', 'label' => strtoupper($appLocale)]);
@endphp
<div class="global-lang-switcher dropdown" aria-label="{{ __('ui.language_switcher') }}">
    <button class="btn app-lang-toggle lang-btn-group" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="{{ $activeLocaleOption['label'] }}">
        <span class="app-lang-flag" aria-hidden="true">{{ $activeLocaleOption['flag'] }}</span>
        <span class="app-lang-label">{{ $activeLocaleOption['label'] }}</span>
        <i class="bi bi-chevron-down app-lang-chevron" aria-hidden="true"></i>
    </button>
    <ul class="dropdown-menu dropdown-menu-end app-lang-menu">
        @foreach ($appLocaleOptions as $localeCode => $localeOption)
        <li>
            <button
                type="button"
                class="dropdown-item lang-btn"
                data-locale="{{ $localeCode }}"
                data-flag="{{ $localeOption['flag'] }}"
                data-label="{{ $localeOption['label'] }}"
            >
                <span class="lang-btn-flag" aria-hidden="true">{{ $localeOption['flag'] }}</span>
                <span class="lang-btn-label">{{ $localeOption['label'] }}</span>
            </button>
        </li>
        @endforeach
    </ul>
</div>
