<?php

namespace App\Support;

use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\App;

/**
 * Shared branding and preview helpers for Mutqin transactional mail.
 *
 * Production notifications never read preview recipients from this class.
 */
final class TransactionalMail
{
    public const TEMPLATES = ['verify', 'reset'];

    public static function brandName(): string
    {
        $name = trim((string) config('mail.brand.name', 'Mutqin'));

        return $name !== '' ? $name : 'Mutqin';
    }

    public static function homeUrl(): string
    {
        $configured = trim((string) config('mail.brand.home_url', ''));
        if ($configured !== '') {
            return $configured;
        }

        return 'https://mutqin.ai';
    }

    public static function homeHost(): string
    {
        $host = parse_url(self::homeUrl(), PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : 'mutqin.ai';
    }

    /**
     * Absolute logo URL for email clients (fallback when inline embed is unavailable).
     */
    public static function logoUrl(): string
    {
        $configured = trim((string) config('mail.brand.logo_url', ''));
        if ($configured !== '') {
            return $configured;
        }

        $base = rtrim((string) config('app.url'), '/');
        $host = parse_url($base, PHP_URL_HOST);
        $isLoopback = in_array($host, ['localhost', '127.0.0.1', '::1'], true);

        if ($isLoopback) {
            $base = rtrim((string) config('mail.brand.asset_url', 'https://app.mutqin.ai'), '/');
        }

        $url = $base.'/images/logo_email.png';

        $resolvedHost = parse_url($url, PHP_URL_HOST);
        $resolvedIsLoopback = in_array($resolvedHost, ['localhost', '127.0.0.1', '::1'], true);

        if (! $resolvedIsLoopback && str_starts_with($url, 'http://')) {
            return 'https://'.substr($url, 7);
        }

        return $url;
    }

    /**
     * Inline logo source for HTML mail.
     *
     * Prefer a small CID embed (Outlook/Gmail-safe, no remote fetch). Avoid
     * base64 data-URIs — they inflate the MIME part and hurt spam scores.
     */
    public static function logoSrc(mixed $message = null): string
    {
        $path = self::logoPath();
        $maxEmbedBytes = 20_480;

        if (is_object($message)
            && method_exists($message, 'embed')
            && is_file($path)
            && (int) filesize($path) > 0
            && (int) filesize($path) <= $maxEmbedBytes
        ) {
            return (string) $message->embed($path);
        }

        return self::logoUrl();
    }

    public static function logoPath(): string
    {
        $optimized = public_path('images/logo_email.png');

        return is_file($optimized)
            ? $optimized
            : public_path('images/logo_main.png');
    }

    /**
     * Replyable address for transactional mail (improves inbox placement).
     *
     * @return array{0: string, 1: string|null}|null
     */
    public static function replyTo(): ?array
    {
        $configured = trim((string) config('mail.reply_to.address', ''));
        $from = strtolower(trim((string) config('mail.from.address', '')));

        $address = $configured;
        if ($address === '' && (str_starts_with($from, 'noreply@') || str_starts_with($from, 'no-reply@'))) {
            $address = 'hello@mutqin.ai';
        }

        if ($address === '' || ! filter_var($address, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $name = trim((string) config('mail.reply_to.name', config('mail.from.name', 'Mutqin')));

        return [$address, $name !== '' ? $name : null];
    }

    /**
     * Dummy action URLs for local/staging layout previews. Never a signed
     * verification or password-reset token.
     *
     * @return array{verify: string, reset: string}
     */
    public static function previewActionUrls(): array
    {
        $base = rtrim((string) config('app.url'), '/');
        if ($base === '' || str_contains($base, 'localhost') || str_contains($base, '127.0.0.1')) {
            $base = 'https://app.mutqin.ai';
        }

        return [
            'verify' => $base.'/email/verify/0/preview',
            'reset' => $base.'/password/reset/preview-token?email=preview%40example.com',
        ];
    }

    /**
     * @return list<string>
     */
    public static function previewRecipients(): array
    {
        $configured = config('mail.preview.recipients', []);
        if (! is_array($configured)) {
            return [];
        }

        $emails = [];
        foreach ($configured as $recipient) {
            $email = strtolower(trim((string) $recipient));
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emails[] = $email;
            }
        }

        return array_values(array_unique($emails));
    }

    public static function previewEnabled(): bool
    {
        return (bool) config('mail.preview.enabled', false)
            && ! DatabaseDeploySafety::isProtectedEnvironment();
    }

    public static function localeFor(mixed $notifiable): string
    {
        if ($notifiable instanceof HasLocalePreference) {
            $locale = (string) $notifiable->preferredLocale();
            if ($locale !== '') {
                return $locale;
            }
        }

        return (string) app()->getLocale();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function message(mixed $notifiable, string $subjectKey, string $htmlView, string $textView, array $data): MailMessage
    {
        $locale = self::localeFor($notifiable);
        $previous = app()->getLocale();
        App::setLocale($locale);

        try {
            $message = (new MailMessage)
                ->subject(__($subjectKey))
                ->view([
                    'html' => $htmlView,
                    'text' => $textView,
                ], $data);

            $replyTo = self::replyTo();
            if ($replyTo !== null) {
                $message->replyTo($replyTo[0], $replyTo[1]);
            }

            return $message;
        } finally {
            App::setLocale($previous);
        }
    }
}
