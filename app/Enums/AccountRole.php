<?php

namespace App\Enums;

enum AccountRole: string
{
    case Individual = 'individual';
    case Student = 'student';
    case Teacher = 'teacher';
    case Parent = 'parent';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function needsOrganisation(): bool
    {
        return $this === self::Student || $this === self::Teacher;
    }

    public function isSupplementalCapable(): bool
    {
        return $this === self::Parent;
    }
}
