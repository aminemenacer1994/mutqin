<?php

namespace App\Console\Commands;

use App\Support\QuranContentIntegrity;
use App\Support\QuranMetadata;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class QuranSyncVerseKeysCommand extends Command
{
    protected $signature = 'quran:sync-verse-keys {--force : Truncate and rebuild the registry}';

    protected $description = 'Sync quran_verse_keys identity registry from approved surah metadata';

    public function handle(): int
    {
        if (! Schema::hasTable('quran_verse_keys')) {
            $this->error('quran_verse_keys table missing — run migrations first.');

            return self::FAILURE;
        }

        $count = (int) DB::table('quran_verse_keys')->count();
        if ($count > 0 && ! $this->option('force')) {
            $this->info("quran_verse_keys already has {$count} rows (use --force to rebuild).");

            return self::SUCCESS;
        }

        if ($this->option('force')) {
            DB::table('quran_verse_keys')->delete();
        }

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

        $total = (int) DB::table('quran_verse_keys')->count();
        if ($total !== QuranContentIntegrity::TOTAL_AYAHS) {
            $this->error("Expected 6236 verse keys, got {$total}");

            return self::FAILURE;
        }

        $this->info("Synced {$total} quran_verse_keys.");

        return self::SUCCESS;
    }
}
