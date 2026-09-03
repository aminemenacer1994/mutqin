<?php

use App\Support\QuranMetadata;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Canonical (surah, ayah) identity registry for integrity / safe unique keys.
 * Does not store Arabic text — text remains in pinned fixtures + upstream editions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_verse_keys', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->unsignedSmallInteger('global_number');
            $table->string('verse_key', 16);
            $table->timestamps();

            $table->unique(['surah_number', 'ayah_number'], 'quran_verse_keys_surah_ayah_unique');
            $table->unique('global_number', 'quran_verse_keys_global_unique');
            $table->unique('verse_key', 'quran_verse_keys_verse_key_unique');
        });

        $rows = [];
        $now = now();
        for ($surah = 1; $surah <= 114; $surah++) {
            $ayahCount = QuranMetadata::ayahCount($surah) ?? 0;
            for ($ayah = 1; $ayah <= $ayahCount; $ayah++) {
                $rows[] = [
                    'surah_number' => $surah,
                    'ayah_number' => $ayah,
                    'global_number' => QuranMetadata::globalAyahNumber($surah, $ayah),
                    'verse_key' => "{$surah}:{$ayah}",
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                if (count($rows) >= 500) {
                    DB::table('quran_verse_keys')->insert($rows);
                    $rows = [];
                }
            }
        }
        if ($rows !== []) {
            DB::table('quran_verse_keys')->insert($rows);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_verse_keys');
    }
};
