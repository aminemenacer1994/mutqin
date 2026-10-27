<?php

namespace App\Support;

final class WaitingListEmailHash
{
    public static function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    public static function digest(string $email): string
    {
        return hash('sha256', self::normalize($email));
    }
}
