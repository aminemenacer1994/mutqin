<?php

namespace App\Support\Analytics;

use Illuminate\Http\Request;

/** Bounded campaign labels. No click ids, emails, or full referrer URLs. */
final class Acquisition
{
    public const SESSION_KEY = 'mutqin_signup_acquisition';

    /**
     * @return array{utm_source: ?string, utm_medium: ?string, utm_campaign: ?string, referral_code: ?string, anonymous_id: ?string}
     */
    public static function empty(): array
    {
        return [
            'utm_source' => null,
            'utm_medium' => null,
            'utm_campaign' => null,
            'referral_code' => null,
            'anonymous_id' => null,
        ];
    }

    /**
     * @return array{utm_source: ?string, utm_medium: ?string, utm_campaign: ?string, referral_code: ?string, anonymous_id: ?string}
     */
    public static function fromRequest(Request $request): array
    {
        $stored = $request->hasSession() ? $request->session()->get(self::SESSION_KEY, []) : [];
        $stored = is_array($stored) ? $stored : [];

        return [
            'utm_source' => self::token($request->input('utm_source')) ?: self::token($stored['utm_source'] ?? null),
            'utm_medium' => self::token($request->input('utm_medium')) ?: self::token($stored['utm_medium'] ?? null),
            'utm_campaign' => self::token($request->input('utm_campaign')) ?: self::token($stored['utm_campaign'] ?? null),
            'referral_code' => self::token($request->input('ref'))
                ?: self::token($request->input('referral_code'))
                ?: self::token($stored['referral_code'] ?? null),
            'anonymous_id' => self::uuid($request->input('analytics_anonymous_id'))
                ?: self::uuid($stored['anonymous_id'] ?? null),
        ];
    }

    public static function remember(Request $request): void
    {
        if (! $request->hasSession()) {
            return;
        }

        $current = self::fromRequest($request);
        $existing = $request->session()->get(self::SESSION_KEY, []);
        $existing = is_array($existing) ? $existing : [];
        $next = self::empty();
        foreach ($next as $key => $unused) {
            $next[$key] = self::tokenOrUuid($key, $existing[$key] ?? null) ?: $current[$key];
        }

        $request->session()->put(self::SESSION_KEY, $next);
    }

    public static function token(mixed $value): ?string
    {
        $text = trim((string) $value);
        if ($text === '' || strlen($text) > 40) {
            return null;
        }
        if (preg_match('/[@\x{0600}-\x{06FF}]/u', $text) === 1) {
            return null;
        }
        if (preg_match('/^[\p{L}\p{N} _.,~+\-]+$/u', $text) !== 1) {
            return null;
        }

        return $text;
    }

    public static function uuid(mixed $value): ?string
    {
        $text = strtolower(trim((string) $value));
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $text) !== 1) {
            return null;
        }

        return $text;
    }

    private static function tokenOrUuid(string $key, mixed $value): ?string
    {
        return $key === 'anonymous_id' ? self::uuid($value) : self::token($value);
    }
}
