<?php

namespace App\Enums;

enum OrganisationType: string
{
    case Halaqa = 'halaqa';
    case Madrassa = 'madrassa';
    case School = 'school';
    case Other = 'other';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
