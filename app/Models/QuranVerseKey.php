<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Canonical (surah, ayah) identity row — no Arabic text stored here.
 */
class QuranVerseKey extends Model
{
    protected $table = 'quran_verse_keys';

    protected $fillable = [
        'surah_number',
        'ayah_number',
        'global_number',
        'verse_key',
    ];

    protected function casts(): array
    {
        return [
            'surah_number' => 'integer',
            'ayah_number' => 'integer',
            'global_number' => 'integer',
        ];
    }
}
