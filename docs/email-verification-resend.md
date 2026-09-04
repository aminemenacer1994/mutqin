# Email verification (Laravel + Resend)

Mutqin uses Laravel’s native email-verification flow (`MustVerifyEmail`, signed URLs, `verified` middleware) with [Resend](https://resend.com) as the production mail transport.

## Feature toggle

| Variable | Purpose |
|---|---|
| `AUTH_REQUIRE_EMAIL_VERIFICATION=true` | New email/password sign-ups start unverified; `verified` middleware and the notice page are enforced. |
| `AUTH_REQUIRE_EMAIL_VERIFICATION=false` (default locally) | Sign-ups are auto-verified; no verification emails are sent. Demo login is unaffected either way. |

Google OAuth and demo login **do not** use this gate: Google accounts with a provider-verified email get `email_verified_at` at sign-in; demo accounts are verified in `EnsureDemoLoginAccount`.

## Production mail (Resend)

Set in Laravel Cloud / staging (never commit secrets):

```env
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=noreply@mutqin.ai
MAIL_FROM_NAME=Mutqin
RESEND_KEY=re_xxxxxxxx
AUTH_REQUIRE_EMAIL_VERIFICATION=true
```

`RESEND_API_KEY` is also accepted as an alias for `RESEND_KEY`.

Never commit `RESEND_KEY`.

Local development can keep `MAIL_MAILER=log` (or `array` in PHPUnit) and enable the verification toggle only when testing the gate:

```env
MAIL_MAILER=log
AUTH_REQUIRE_EMAIL_VERIFICATION=true
```

After changing env vars: `php artisan config:clear && php artisan config:cache`.

## Domain verification (manual — DNS)

Before Resend can send from `Mutqin <noreply@mutqin.ai>`, verify **`mutqin.ai`** in the Resend dashboard:

1. Resend → **Domains** → **Add domain** → enter `mutqin.ai`.
2. Add the **exact** DNS records Resend shows (typically SPF, DKIM, and optionally DMARC). Record names/values change per account — copy them from the dashboard, do not guess.
3. Wait for DNS propagation, then click **Verify** in Resend until the domain status is **Verified**.
4. Confirm the sending address `noreply@mutqin.ai` is allowed for that domain.

DNS is managed outside this repo. This document does **not** imply verification is complete until ops confirms it in Resend. Copy the **exact** SPF, DKIM, and DMARC values Resend displays — do not invent hostnames or TXT payloads.

Optional production asset override when `APP_URL` is not the public HTTPS origin:

```env
MAIL_LOGO_URL=https://app.mutqin.ai/images/logo_main.png
```

## Transactional email design

User-facing mail uses one shared Blade shell (`resources/views/mail/layout.blade.php`) plus small includes for the CTA and fallback URL. Notifications keep Laravel’s signed verification URL and password-reset token — they never mint a second auth token.

| Email | Notification | HTML + text views |
|---|---|---|
| Email verification | `App\Notifications\VerifyEmail` | `mail.verify-email` / `mail.text.verify-email` |
| Password reset | `App\Notifications\ResetPassword` | `mail.reset-password` / `mail.text.reset-password` |

There is no standalone welcome email and no extra account-security mail beyond these two flows. Copy lives in `lang/{en,fr,es}/mail.php` so the same templates serve those locales (other UI locales fall back to English until a `mail.php` is added). The user’s `locale` is applied via `HasLocalePreference`.

The shell is table-based (~560px), left-aligned, and inline-styled: Mutqin mark, heading, one short paragraph, CTA, fallback URL, one-line security note, and a `mutqin.ai` footer. Images are optional: the wordmark remains if the logo does not load.

## Inbox preview (local / staging only)

`php artisan mutqin:mail-preview` writes HTML/text samples or sends them through Resend. It is **disabled in production** even if `MAIL_PREVIEW_ENABLED=true`. Preview links are dummy URLs — they are not signed verification or reset tokens.

```env
MAIL_PREVIEW_ENABLED=true
MAIL_PREVIEW_RECIPIENTS=menacer72@gmail.com,med_amine-jsk@hotmail.com
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=noreply@mutqin.ai
MAIL_FROM_NAME=Mutqin
```

Those inboxes are **test recipients only**. Do not hard-code them into notifications or `MAIL_FROM_*`.

```bash
php artisan mutqin:mail-preview all --write=storage/app/mail-preview
php artisan mutqin:mail-preview all --send --locale=en
php artisan mutqin:mail-preview verify --to=menacer72@gmail.com --send
```

`--send` requires `MAIL_MAILER=resend` or `smtp` (PHPUnit may use `array`). `--write` is the default when `--send` is omitted.

## Flow summary

1. Register (email/password) → user is authenticated but `email_verified_at` is `null`.
2. Laravel sends `App\Notifications\VerifyEmail` via Resend.
3. User lands on `/email/verify` (notice + throttled resend).
4. Signed link `GET /email/verify/{id}/{hash}` marks verified once and redirects to `/memorisation`.
5. Password reset **never** sets `email_verified_at`.
6. Verification URLs/tokens are not logged (`SensitiveDataRedactor` redacts `signature` and `token` keys).

## Automated tests

```bash
php artisan test --filter=EmailVerificationTest
php artisan test --filter=TransactionalMailTemplateTest
php artisan test --filter=MailPreviewCommandTest
```

Also covered: `PasswordResetFlowTest`, `GoogleAuthControllerTest`, `ProfileControllerTest` (pending email change).

## Acceptance testing (staging)

Use personal inboxes **only as test recipients** — never as `MAIL_FROM_*` or hard-coded app logic:

| Inbox | Use |
|---|---|
| Gmail (`menacer72@gmail.com` for samples) | Delivery, **Verify email** CTA, redirect after verify |
| Outlook/Hotmail (`med_amine-jsk@hotmail.com` for samples) | Button + signed URL rendering in Outlook web/desktop |

Checklist:

1. Enable `AUTH_REQUIRE_EMAIL_VERIFICATION=true` and Resend on staging.
2. Register a **new** throwaway account (do not create permanent production users).
3. Confirm email arrives from `Mutqin <noreply@mutqin.ai>`.
4. Click **Verify email** → lands on memorisation; refresh → still verified.
5. Log out / log in → still verified; `/memorisation` loads.
6. Register another account, do **not** verify → `/memorisation` redirects to notice; resend works; 7th resend within a minute returns 429.
7. Layout: no horizontal scroll on a narrow phone, CTA + fallback URL both work, wordmark remains with images blocked, long display names wrap, dark-mode clients keep the card readable.

## Password reset (Laravel broker + Resend)

Forgot / reset uses Laravel’s native password broker (`password_reset_tokens`, 60-minute expiry, 60-second broker throttle) and the same Resend transport as verification. There is no second mail integration.

| Rule | Behaviour |
|---|---|
| Enumeration | Forgot-password always returns `passwords.sent`. Failed reset always returns `passwords.token`. |
| Recipients | Mail is sent only to the account’s stored `email` (never `pending_email`). |
| OAuth-only | Google accounts without `password_set_at` get the generic success response and no email. They set a password from Profile after Google sign-in. |
| Unverified | Reset is allowed; `email_verified_at` stays unchanged. |
| After success | Remember token rotated, other Sanctum tokens deleted, other DB sessions dropped, `url.intended` cleared. |
| Logging | Reset tokens, reset URLs, passwords, and auth headers are redacted. |

Branded mail: `App\Notifications\ResetPassword` → `mail.reset-password` (shared `mail.layout`). CTA is **Reset password**. The body states the link expiry and includes a fallback URL plus “If you didn't request this, ignore this email.”

```bash
php artisan test --filter=PasswordResetFlowTest
```

### Acceptance (staging)

Use personal inboxes **only as test recipients** — never as `MAIL_FROM_*` or hard-coded auth rules:

| Inbox | Use |
|---|---|
| Gmail | Delivery, **Reset password** CTA, reset completes |
| Outlook/Hotmail | Link rendering in Edge-style clients |

Checklist:

1. Enable Resend (`MAIL_MAILER=resend`, `MAIL_FROM_ADDRESS=noreply@mutqin.ai`, `MAIL_FROM_NAME=Mutqin`) after `mutqin.ai` is verified in Resend.
2. Request a reset for a **throwaway staging account** (or a test recipient mailbox you control).
3. Confirm the email arrives from `Mutqin <noreply@mutqin.ai>`.
4. Click **Reset password** → set a new password → land on memorisation (or the verification notice if still unverified).
5. Confirm the same link cannot be reused, and that reset does not verify or take over another account.
6. A 7th forgot-password request within a minute returns 429.

Do not commit real API keys or test passwords.
