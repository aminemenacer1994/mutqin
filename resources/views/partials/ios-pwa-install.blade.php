{{--
  iPhone / iOS PWA install guide (login + register).
  Hidden by default; resources/js/pwa.js reveals it only when:
  iOS device + browser mode (not standalone) + not dismissed.
--}}
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
        <i class="bi bi-phone" aria-hidden="true"></i>
        <span>{{ __('ui.pwa_install_mutqin') }}</span>
    </button>
</div>

<div
    id="mutqin-ios-pwa-modal"
    class="modal-overlay mutqin-modal-overlay mutqin-ios-pwa__overlay"
    hidden
    data-ios-pwa-modal
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
                <ol class="mutqin-ios-pwa__steps">
                    <li>
                        <span class="mutqin-ios-pwa__step-num" aria-hidden="true">1</span>
                        <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_step_safari') }}</span>
                    </li>
                    <li>
                        <span class="mutqin-ios-pwa__step-num" aria-hidden="true">2</span>
                        <span class="mutqin-ios-pwa__step-copy">
                            {{ __('ui.pwa_install_step_share') }}
                            <i class="bi bi-box-arrow-up mutqin-ios-pwa__share-icon" aria-hidden="true" title="{{ __('ui.pwa_share_icon_title') }}"></i>
                        </span>
                    </li>
                    <li>
                        <span class="mutqin-ios-pwa__step-num" aria-hidden="true">3</span>
                        <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_step_add') }}</span>
                    </li>
                    <li>
                        <span class="mutqin-ios-pwa__step-num" aria-hidden="true">4</span>
                        <span class="mutqin-ios-pwa__step-copy">{{ __('ui.pwa_install_step_confirm') }}</span>
                    </li>
                </ol>
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
