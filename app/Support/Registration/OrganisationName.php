<?php

namespace App\Support\Registration;

/**
 * Canonical organisation names match on case and whitespace only.
 * Punctuation, hyphens and extra words stay distinct so similar names do not merge.
 */
final class OrganisationName
{
    public static function display(string $name): string
    {
        $name = trim($name);

        if (class_exists(\Normalizer::class)) {
            $normalized = \Normalizer::normalize($name, \Normalizer::FORM_C);
            if (is_string($normalized) && $normalized !== '') {
                $name = $normalized;
            }
        }

        $collapsed = preg_replace('/[\h\v]+/u', ' ', $name);

        return trim(is_string($collapsed) ? $collapsed : $name);
    }

    public static function canonical(string $name): string
    {
        return mb_strtolower(self::display($name), 'UTF-8');
    }
}
