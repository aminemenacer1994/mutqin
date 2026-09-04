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

DNS is managed outside this repo. This document does **not** imply verification is complete until ops confirms it in Resend.

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
```

Also covered: `PasswordResetFlowTest`, `GoogleAuthControllerTest`, `ProfileControllerTest` (pending email change).

## Acceptance testing (staging)

Use personal inboxes **only as test recipients** — never as `MAIL_FROM_*` or hard-coded app logic:

| Inbox | Use |
|---|---|
| Gmail | Delivery, CTA button, redirect after verify |
| Outlook/Hotmail | Signed URL rendering in Edge-style clients |

Checklist:

1. Enable `AUTH_REQUIRE_EMAIL_VERIFICATION=true` and Resend on staging.
2. Register a **new** throwaway account (do not create permanent production users).
3. Confirm email arrives from `Mutqin <noreply@mutqin.ai>`.
4. Click CTA → lands on memorisation; refresh → still verified.
5. Log out / log in → still verified; `/memorisation` loads.
6. Register another account, do **not** verify → `/memorisation` redirects to notice; resend works; 7th resend within a minute returns 429.

Do not commit real API keys or test passwords.
