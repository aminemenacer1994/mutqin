<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MutashabihatPair extends Model
{
    protected $fillable = [
        'surah_number_1',
        'ayah_number_1',
        'surah_number_2',
        'ayah_number_2',
        'verse_key_1',
        'verse_key_2',
        'pair_key',
        'source',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'surah_number_1' => 'integer',
            'ayah_number_1' => 'integer',
            'surah_number_2' => 'integer',
            'ayah_number_2' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function userProgress(): HasMany
    {
        return $this->hasMany(UserMutashabihatProgress::class);
    }

    public static function buildPairKey(string $verseKey1, string $verseKey2): string
    {
        $keys = [$verseKey1, $verseKey2];
        sort($keys, SORT_STRING);

        return implode('|', $keys);
    }
}
