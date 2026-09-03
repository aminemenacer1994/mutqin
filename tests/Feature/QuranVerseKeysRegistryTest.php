<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class QuranVerseKeysRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_verse_keys_registry_has_unique_identities_and_full_count(): void
    {
        $this->assertTrue(Schema::hasTable('quran_verse_keys'));
        $this->assertSame(6236, (int) DB::table('quran_verse_keys')->count());

        $this->assertDatabaseHas('quran_verse_keys', [
            'surah_number' => 1,
            'ayah_number' => 1,
            'global_number' => 1,
            'verse_key' => '1:1',
        ]);
        $this->assertDatabaseHas('quran_verse_keys', [
            'surah_number' => 114,
            'ayah_number' => 6,
            'global_number' => 6236,
            'verse_key' => '114:6',
        ]);
        $this->assertDatabaseHas('quran_verse_keys', [
            'surah_number' => 2,
            'ayah_number' => 255,
            'verse_key' => '2:255',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        DB::table('quran_verse_keys')->insert([
            'surah_number' => 1,
            'ayah_number' => 1,
            'global_number' => 9999,
            'verse_key' => '1:1-dup',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
