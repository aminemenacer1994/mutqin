# Email verification (Laravel + Resend)

Mutqin uses Laravel’s native email-verification flow (`MustVerifyEmail`, signed URLs, `verified` middleware) with [Resend](https://resend.com) as the production mail transport.

## Feature toggle

| Variable | Purpose |
|---|---|
| `AUTH_REQUIRE_EMAIL_VERIFICATION=true` (default) | New email/password sign-ups start unverified; `verified` middleware and the notice page are enforced. |
| `AUTH_REQUIRE_EMAIL_VERIFICATION=false` | Sign-ups are auto-verified; no verification emails are sent. Use this only for local convenience. |

Google OAuth and the demo pass **do not** use this gate: Google accounts with a provider-verified email get `email_verified_at` at sign-in; `POST /login/demo` and reserved tester mailboxes that sign in or register with `DemoPass1!` are verified in `EnsureDemoLoginAccount` / `EmailVerification::bypassesForDemo`.

## Production mail (Resend)

Set in Laravel Cloud / staging (never commit secrets):

```env
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=hello@mutqin.ai
MAIL_FROM_NAME=Mutqin
# Optional when From must stay noreply@ — monitored inbox preferred for placement:
# MAIL_REPLY_TO_ADDRESS=hello@mutqin.ai
RESEND_KEY=re_xxxxxxxx
AUTH_REQUIRE_EMAIL_VERIFICATION=true
```

`RESEND_API_KEY` is also accepted as an alias for `RESEND_KEY`.

Never commit `RESEND_KEY`.

Prefer **`hello@mutqin.ai`** (or another monitored address) over `noreply@` — Gmail/Outlook treat non-replyable senders as lower trust. When From is still `noreply@`, the app sets `Reply-To: hello@mutqin.ai` automatically unless `MAIL_REPLY_TO_ADDRESS` overrides it.

`mutqin:deploy-preflight` **fails production/staging** when `MAIL_MAILER` is still `log`/`array`, the Resend key is empty, or `MAIL_FROM_ADDRESS` is a placeholder (`@example.com`). Forgot-password and verification both use this transport — if Cloud still has the `.env.example` defaults, the UI shows “link sent” but no inbox message arrives.

If Laravel Cloud’s Resend integration injects the API key under a custom `key_name`, set that name to `RESEND_KEY` or `RESEND_API_KEY` (what `config/services.php` reads), or copy the value into one of those vars. Redeploy after every env change.

Local development can keep `MAIL_MAILER=log` (or `array` in PHPUnit) and enable the verification toggle only when testing the gate:

```env
MAIL_MAILER=log
AUTH_REQUIRE_EMAIL_VERIFICATION=true
```

After changing env vars: `php artisan config:clear && php artisan config:cache`.

## Domain verification (manual — DNS)

Before Resend can send from `Mutqin <hello@mutqin.ai>`, verify **`mutqin.ai`** in the Resend dashboard:

1. Resend → **Domains** → **Add domain** → enter `mutqin.ai`.
2. Add the **exact** DNS records Resend shows (typically SPF on `send.mutqin.ai`, DKIM on `resend._domainkey.mutqin.ai`, and DMARC on `_dmarc.mutqin.ai`). Record names/values change per account — copy them from the dashboard, do not guess.
3. Wait for DNS propagation, then click **Verify** in Resend until the domain status is **Verified**.
4. Confirm the sending address `hello@mutqin.ai` is allowed for that domain.

DNS is managed outside this repo. This document does **not** imply verification is complete until ops confirms it in Resend. Copy the **exact** SPF, DKIM, and DMARC values Resend displays — do not invent hostnames or TXT payloads.

### Inbox vs junk (deliverability)

`mutqin.ai` currently publishes **DMARC `p=quarantine`**. Any message that fails SPF/DKIM alignment is steered to junk — that is expected, not a Mutqin bug.

Checklist when resets land in spam:

1. In Gmail open the message → **Show original** → confirm **SPF: PASS**, **DKIM: PASS**, **DMARC: PASS**.
2. In Resend → Domains → `mutqin.ai` is **Verified** (green). Fix any missing DNS Resend still flags.
3. Laravel Cloud / `.env`: `MAIL_FROM_ADDRESS=hello@mutqin.ai` (not `noreply@`), `MAIL_FROM_NAME=Mutqin`, then redeploy.
4. Resend email **Insights** on a sample reset: no “shared tracking domain”, links stay on `app.mutqin.ai` / `mutqin.ai`.
5. Have recipients mark **Not spam** / move to Primary once — mailbox reputation recovers faster after first engagement.
6. Prefer the small `logo_email.png` mark (`MAIL_LOGO_URL` optional). Do not force the large `logo_main.png` into the MIME body.

Optional production asset override when `APP_URL` is not the public HTTPS origin:

```env
MAIL_LOGO_URL=https://app.mutqin.ai/images/logo_email.png
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
MAIL_FROM_ADDRESS=hello@mutqin.ai
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
3. Confirm email arrives from `Mutqin <hello@mutqin.ai>` in the **inbox** (not junk). If junk, use the deliverability checklist above.
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

1. Enable Resend (`MAIL_MAILER=resend`, `MAIL_FROM_ADDRESS=hello@mutqin.ai`, `MAIL_FROM_NAME=Mutqin`) after `mutqin.ai` is verified in Resend.
2. Request a reset for a **throwaway staging account** (or a test recipient mailbox you control).
3. Confirm the email arrives from `Mutqin <hello@mutqin.ai>` in the **inbox** (not junk).
4. Click **Reset password** → set a new password → land on memorisation (or the verification notice if still unverified).
5. Confirm the same link cannot be reused, and that reset does not verify or take over another account.
6. A 7th forgot-password request within a minute returns 429.

Do not commit real API keys or test passwords.
