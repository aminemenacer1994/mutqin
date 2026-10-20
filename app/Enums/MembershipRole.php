<?php

namespace App\Enums;

enum MembershipRole: string
{
    case Teacher = 'teacher';
    case Student = 'student';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
