<?php

namespace App\Support\Seo;

/**
 * Safe inline links for SEO prose: [anchor text](/path).
 */
final class SeoProse
{
    /**
     * Escape text, then turn [label](/relative-path) into crawlable anchors.
     */
    public static function toHtml(string $text): string
    {
        $escaped = e($text);

        return (string) preg_replace_callback(
            '/\[([^\]]+)\]\((\/[^)\s]+|[^)\s]+)\)/',
            static function (array $matches): string {
                $label = $matches[1];
                $href = html_entity_decode($matches[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');

                if ($label === '') {
                    return $matches[0];
                }

                if (! self::isSafeHref($href)) {
                    return $label;
                }

                return '<a href="'.e($href).'">'.$label.'</a>';
            },
            $escaped
        );
    }

    public static function isSafeHref(string $href): bool
    {
        if ($href === '' || ! str_starts_with($href, '/')) {
            return false;
        }

        if (str_starts_with($href, '//') || str_contains($href, ':') || str_contains($href, '\\')) {
            return false;
        }

        return (bool) preg_match('~^/[A-Za-z0-9/_\-.?=&%#]*$~', $href);
    }
}
