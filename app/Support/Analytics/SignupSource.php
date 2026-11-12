<?php

namespace App\Support\Analytics;

/**
 * One primary source per account, from values stored at registration.
 * An empty source is unattributed. It is not treated as Direct or WhatsApp.
 */
final class SignupSource
{
    /**
     * @return array{key: string, label: string, verified: bool}
     */
    public static function classify(?string $source, ?string $medium, ?string $referral): array
    {
        $sourceToken = self::token($source);
        $mediumToken = self::token($medium);
        $referralToken = self::token($referral);

        if ($referralToken !== '' || $mediumToken === 'referral' || in_array($sourceToken, ['referral', 'learner', 'invite'], true)) {
            return ['key' => 'referrals', 'label' => 'Referrals', 'verified' => true];
        }

        $channel = self::channel($sourceToken, $mediumToken);
        if ($channel !== null) {
            return $channel;
        }

        if ($sourceToken !== '') {
            return ['key' => 'other', 'label' => self::label($sourceToken), 'verified' => true];
        }

        if (in_array($mediumToken, ['direct', '(direct)', 'none', '(none)'], true)) {
            return ['key' => 'direct', 'label' => 'Direct', 'verified' => true];
        }

        return ['key' => 'unattributed', 'label' => 'Unattributed', 'verified' => false];
    }

    /**
     * @return array{key: string, label: string, verified: bool}|null
     */
    private static function channel(string $source, string $medium): ?array
    {
        if ($source === '') {
            return null;
        }

        if (in_array($source, ['direct', '(direct)', 'none', '(none)'], true)) {
            return ['key' => 'direct', 'label' => 'Direct', 'verified' => true];
        }

        if (in_array($source, ['instagram', 'ig'], true)) {
            return ['key' => 'instagram', 'label' => 'Instagram', 'verified' => true];
        }

        if (in_array($source, ['facebook', 'fb', 'meta'], true)) {
            return ['key' => 'facebook', 'label' => 'Facebook', 'verified' => true];
        }

        if (in_array($source, ['linkedin', 'linked-in', 'li'], true)) {
            return ['key' => 'linkedin', 'label' => 'LinkedIn', 'verified' => true];
        }

        if (in_array($source, ['whatsapp', 'whats-app', 'wa'], true)) {
            return ['key' => 'whatsapp', 'label' => 'WhatsApp', 'verified' => true];
        }

        $organic = ['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia', 'organic', 'search', 'seo', 'seo_tool'];
        if (in_array($source, $organic, true)) {
            if (in_array($medium, ['cpc', 'ppc', 'paid', 'paid_social', 'ads'], true)) {
                return ['key' => 'other', 'label' => self::label($source), 'verified' => true];
            }

            return ['key' => 'organic_search', 'label' => 'Organic search', 'verified' => true];
        }

        return null;
    }

    private static function token(?string $value): string
    {
        $text = strtolower(trim((string) $value));
        $text = str_replace([' ', '.'], ['-', ''], $text);

        return $text;
    }

    private static function label(string $token): string
    {
        $words = str_replace(['_', '-'], ' ', $token);

        return mb_convert_case($words, MB_CASE_TITLE, 'UTF-8');
    }
}
