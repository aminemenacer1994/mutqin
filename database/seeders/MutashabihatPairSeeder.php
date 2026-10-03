<?php

namespace Database\Seeders;

use App\Models\MutashabihatPair;
use Illuminate\Database\Seeder;

class MutashabihatPairSeeder extends Seeder
{
    public function run(): void
    {
        $path = resource_path('data/mutashabihat_pairs.json');
        if (! is_readable($path)) {
            return;
        }

        $raw = json_decode((string) file_get_contents($path), true);
        if (! is_array($raw)) {
            return;
        }

        foreach ($raw as $entry) {
            $a = $entry['a'] ?? null;
            $b = $entry['b'] ?? null;
            if (! is_array($a) || ! is_array($b) || count($a) < 2 || count($b) < 2) {
                continue;
            }

            $surah1 = (int) $a[0];
            $ayah1 = (int) $a[1];
            $surah2 = (int) $b[0];
            $ayah2 = (int) $b[1];
            if ($surah1 < 1 || $surah2 < 1 || $ayah1 < 1 || $ayah2 < 1) {
                continue;
            }

            $vk1 = "{$surah1}:{$ayah1}";
            $vk2 = "{$surah2}:{$ayah2}";
            $pairKey = MutashabihatPair::buildPairKey($vk1, $vk2);

            MutashabihatPair::query()->updateOrCreate(
                ['pair_key' => $pairKey],
                [
                    'surah_number_1' => $surah1,
                    'ayah_number_1' => $ayah1,
                    'surah_number_2' => $surah2,
                    'ayah_number_2' => $ayah2,
                    'verse_key_1' => $vk1,
                    'verse_key_2' => $vk2,
                    'source' => 'mutashabihat_pairs.json',
                ],
            );
        }
    }
}
