<?php

namespace App\Support;

/** Client attribution is an unverified claim; only a small, bounded vocabulary is stored. */
final class WaitingListAttribution
{
    public static function normalise(mixed $input): ?array
    {
        if (! is_array($input)) {
            return null;
        }

        $result = [];
        foreach (['first', 'last'] as $touch) {
            if (! isset($input[$touch]) || ! is_array($input[$touch])) {
                continue;
            }

            $value = [];
            foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as $key) {
                $raw = $input[$touch][$key] ?? null;
                $limit = $key === 'fbclid' ? 255 : 100;
                if (is_string($raw) && mb_strlen($raw) <= $limit && preg_match('/^[\pL\pN _.,~+\-]+$/u', $raw) && trim($raw) !== '') {
                    $value[$key] = trim($raw);
                }
            }
            $host = $input[$touch]['referrer_host'] ?? null;
            if (is_string($host) && strlen($host) <= 253 && preg_match('/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i', $host) && ! preg_match('/(^|\.)mutqin\.ai$/i', $host)) {
                $value['referrer_host'] = strtolower($host);
            }
            // An explicit touch, even with no campaign or referrer, represents direct traffic.
            $value['source'] = $value === [] && $input[$touch] !== [] ? 'unknown' : self::source($value);
            $result[$touch] = $value;
        }

        return $result ?: null;
    }

    private static function source(array $touch): string
    {
        $source = strtolower($touch['utm_source'] ?? '');
        $medium = strtolower($touch['utm_medium'] ?? '');
        $host = $touch['referrer_host'] ?? '';
        $instagram = $source !== '' ? in_array($source, ['instagram', 'ig'], true) : preg_match('/(^|[.])instagram\.com$/', $host);
        $facebook = $source !== '' ? in_array($source, ['facebook', 'fb', 'meta'], true) : preg_match('/(^|[.])(facebook\.com|fb\.com)$/', $host);
        if (($instagram || $facebook) && preg_match('/(^|[ _-])(paid|cpc|cpm|ppc|ads?)([ _-]|$)/', $medium)) {
            return 'meta_ads';
        }
        if ($instagram) {
            return 'instagram';
        }
        if ($facebook) {
            return 'facebook';
        }
        if (in_array($source, ['google', 'googleads', 'google_ads'], true) || ($source === '' && preg_match('/(^|[.])google\.[a-z.]+$/', $host))) {
            return 'google';
        }
        if ($source !== '') {
            return 'unknown';
        }
        if ($host !== '') {
            return 'referral';
        }
        if (count($touch) > 0) {
            return 'unknown';
        }

        return 'direct';
    }
}
