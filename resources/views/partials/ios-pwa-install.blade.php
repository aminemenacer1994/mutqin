{{--
  Apple PWA install guide (login + register) — iPhone, iPad, and Mac.
  Hidden by default; resources/js/pwa.js reveals it for Apple devices
  (or ?ios_install=1) and selects Safari / Chrome / Edge / Firefox steps.
--}}
@php
    $installBrowsers = [
        'safari' => __('ui.pwa_install_browser_safari'),
        'chrome' => __('ui.pwa_install_browser_chrome'),
        'edge' => __('ui.pwa_install_browser_edge'),
        'firefox' => __('ui.pwa_install_browser_firefox'),
    ];
@endphp
<div
    id="mutqin-ios-pwa"
    class="mutqin-ios-pwa"
    hidden
    data-ios-pwa-root
>
    <button
        type="button"
        class="mutqin-ios-pwa__trigger"
        data-ios-pwa-open
        aria-haspopup="dialog"
        aria-controls="mutqin-ios-pwa-dialog"
    >
        <i class="bi bi-download" aria-hidden="true"></i>
        <span>{{ __('ui.pwa_install_mutqin') }}</span>
    </button>
</div>

<div
    id="mutqin-ios-pwa-modal"
    class="modal-overlay mutqin-modal-overlay mutqin-ios-pwa__overlay"
    hidden
    data-ios-pwa-modal
    data-ios-pwa-platform="touch"
>
    <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog mutqin-ios-pwa__dialog">
        <div
            id="mutqin-ios-pwa-dialog"
            class="modal-content mutqin-modal-surface mutqin-ios-pwa__surface"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mutqin-ios-pwa-title"
        >
            <div class="modal-header mutqin-ios-pwa__header">
                <div class="mutqin-ios-pwa__header-text">
                    <h2 id="mutqin-ios-pwa-title" class="mutqin-ios-pwa__title">{{ __('ui.pwa_install_title') }}</h2>
                    <p class="mutqin-ios-pwa__lede">{{ __('ui.pwa_install_lede') }}</p>
                </div>
                <button
                    type="button"
                    class="modal-close-btn mutqin-ios-pwa__close"
                    data-ios-pwa-close
                    aria-label="{{ __('ui.pwa_install_close') }}"
                >
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>
            </div>

            <div class="modal-body mutqin-ios-pwa__body">
                <div
                    class="mutqin-ios-pwa__browsers"
                    role="tablist"
                    aria-label="{{ __('ui.pwa_install_browsers_aria') }}"
                >
                    @foreach ($installBrowsers as $browserId => $browserLabel)
                        <button
                            type="button"
                            class="mutqin-ios-pwa__browser{{ $browserId === 'safari' ? ' is-active' : '' }}"
                            role="tab"
                            id="mutqin-ios-pwa-tab-{{ $browserId }}"
                            data-ios-pwa-browser="{{ $browserId }}"
                            aria-selected="{{ $browserId === 'safari' ? 'true' : 'false' }}"
                            aria-controls="mutqin-ios-pwa-panel-{{ $browserId }}"
                            tabindex="{{ $browserId === 'safari' ? '0' : '-1' }}"
                        >
                            {{ $browserLabel }}
                        </button>
                    @endforeach
                </div>

                <div class="mutqin-ios-pwa__panels">
                    {{-- Safari --}}
                    <div
                        id="mutqin-ios-pwa-panel-safari"
                        class="mutqin-ios-pwa__panel is-active"
                        role="tabpanel"
                        data-ios-pwa-panel="safari"
                        aria-labelledby="mutqin-ios-pwa-tab-safari"
                    >
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="touch">
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_safari_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">
                                    {{ __('ui.pwa_install_ios_safari_2') }}
                                    <i class="bi bi-box-arrow-up mutqin-ios-pwa__share-icon" aria-hidden="true" title="{{ __('ui.pwa_share_icon_title') }}"></i>
                                </span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_safari_3') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">4</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_safari_4') }}</span>
                            </li>
                        </ol>
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="mac" hidden>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_safari_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_safari_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_safari_3') }}</span>
                            </li>
                        </ol>
                    </div>

                    {{-- Chrome --}}
                    <div
                        id="mutqin-ios-pwa-panel-chrome"
                        class="mutqin-ios-pwa__panel"
                        role="tabpanel"
                        data-ios-pwa-panel="chrome"
                        aria-labelledby="mutqin-ios-pwa-tab-chrome"
                        hidden
                    >
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="touch">
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_chrome_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_chrome_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_chrome_3') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">4</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_chrome_4') }}</span>
                            </li>
                        </ol>
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="mac" hidden>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_chrome_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_chrome_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_chrome_3') }}</span>
                            </li>
                        </ol>
                    </div>

                    {{-- Edge --}}
                    <div
                        id="mutqin-ios-pwa-panel-edge"
                        class="mutqin-ios-pwa__panel"
                        role="tabpanel"
                        data-ios-pwa-panel="edge"
                        aria-labelledby="mutqin-ios-pwa-tab-edge"
                        hidden
                    >
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="touch">
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_edge_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_edge_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_edge_3') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">4</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_edge_4') }}</span>
                            </li>
                        </ol>
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="mac" hidden>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_edge_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_edge_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_edge_3') }}</span>
                            </li>
                        </ol>
                    </div>

                    {{-- Firefox --}}
                    <div
                        id="mutqin-ios-pwa-panel-firefox"
                        class="mutqin-ios-pwa__panel"
                        role="tabpanel"
                        data-ios-pwa-panel="firefox"
                        aria-labelledby="mutqin-ios-pwa-tab-firefox"
                        hidden
                    >
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="touch">
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_firefox_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_firefox_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_firefox_3') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">4</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_ios_firefox_4') }}</span>
                            </li>
                        </ol>
                        <ol class="mutqin-ios-pwa__steps" data-ios-pwa-steps="mac" hidden>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_firefox_1') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_firefox_2') }}</span>
                            </li>
                            <li>
                                <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                                <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_mac_firefox_3') }}</span>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>

            <div class="modal-footer mutqin-modal-footer mutqin-ios-pwa__footer">
                <div class="mutqin-modal-actions mutqin-modal-actions--end mutqin-ios-pwa__actions">
                    <button
                        type="button"
                        class="mutqin-modal-btn mutqin-modal-btn--secondary"
                        data-ios-pwa-dismiss
                    >
                        {{ __('ui.pwa_install_maybe_later') }}
                    </button>
                    <button
                        type="button"
                        class="mutqin-modal-btn mutqin-modal-btn--primary"
                        data-ios-pwa-close
                    >
                        {{ __('ui.pwa_install_got_it') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
