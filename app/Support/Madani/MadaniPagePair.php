<?php

namespace App\Support\Madani;

/**
 * Open-mushaf pairing: odd page on the right, even page on the left.
 * Spreads are (1,2), (3,4), …, (603,604). Never emits 0 or 605.
 */
final class MadaniPagePair
{
    public static function clamp(int $page): int
    {
        return max(QpcV2PageAdapter::MIN_PAGE, min(QpcV2PageAdapter::MAX_PAGE, $page));
    }

    /**
     * @return array{right: int, left: int|null, pages: list<int>}
     */
    public static function spread(int $page): array
    {
        $page = self::clamp($page);
        $right = $page % 2 === 1 ? $page : $page - 1;
        $left = $right + 1;
        if ($left > QpcV2PageAdapter::MAX_PAGE) {
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

        return $right > QpcV2PageAdapter::MIN_PAGE ? $right - 2 : null;
    }

    public static function nextSpread(int $page): ?int
    {
        $spread = self::spread($page);
        $last = $spread['left'] ?? $spread['right'];

        return $last < QpcV2PageAdapter::MAX_PAGE ? $last + 1 : null;
    }

    public static function previousPage(int $page): ?int
    {
        $page = self::clamp($page);

        return $page > QpcV2PageAdapter::MIN_PAGE ? $page - 1 : null;
    }

    public static function nextPage(int $page): ?int
    {
        $page = self::clamp($page);

        return $page < QpcV2PageAdapter::MAX_PAGE ? $page + 1 : null;
    }
}
