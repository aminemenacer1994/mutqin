<?php

namespace App\Support\Madani;

use App\Support\Mushaf\MushafLayoutRegistry;

/**
 * Open-mushaf pairing: odd page on the right, even page on the left.
 * Spreads are (1,2), (3,4), …, (603,604). Never emits 0 or 605.
 */
final class MadaniPagePair
{
    public static function clamp(int $page): int
    {
        return MushafLayoutRegistry::madaniV2()->clampPage($page);
    }

    private static function maxPage(): int
    {
        return MushafLayoutRegistry::madaniV2()->pageCount;
    }

    /**
     * @return array{right: int, left: int|null, pages: list<int>}
     */
    public static function spread(int $page): array
    {
        $page = self::clamp($page);
        $right = $page % 2 === 1 ? $page : $page - 1;
        $left = $right + 1;
        if ($left > self::maxPage()) {
            return [
                'right' => $right,
                'left' => null,
                'pages' => [$right],
            ];
        }

        return [
            'right' => $right,
            'left' => $left,
            'pages' => [$right, $left],
        ];
    }

    public static function previousSpread(int $page): ?int
    {
        $right = self::spread($page)['right'];

        return $right > 1 ? $right - 2 : null;
    }

    public static function nextSpread(int $page): ?int
    {
        $spread = self::spread($page);
        $last = $spread['left'] ?? $spread['right'];

        return $last < self::maxPage() ? $last + 1 : null;
    }

    public static function previousPage(int $page): ?int
    {
        $page = self::clamp($page);

        return $page > 1 ? $page - 1 : null;
    }

    public static function nextPage(int $page): ?int
    {
        $page = self::clamp($page);

        return $page < self::maxPage() ? $page + 1 : null;
    }
}
