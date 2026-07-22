<?php

namespace App\Support;

/**
 * Canonical Qur'an surah metadata used for recommendation logic.
 * Mirrors the frontend SURAH_AYAH_COUNTS / SURAH_NAMES source of truth.
 */
final class QuranMetadata
{
    /**
     * @var list<int>
     */
    public const AYAH_COUNTS = [
        7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
        135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
        54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11,
        11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25,
        22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6,
        3, 5, 4, 5, 6,
    ];

    /**
     * English transliterated names (index 0 = Surah 1).
     *
     * @var list<string>
     */
    public const NAMES = [
        'Al-Fatihah', 'Al-Baqarah', "Aal-Imran", 'An-Nisa', 'Al-Maidah', 'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus',
        'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha',
        'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur', 'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum',
        'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir',
        'Fussilat', 'Ash-Shuraa', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
        'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqiah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah',
        'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Maarij',
        'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa',
        'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-Ala', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad',
        'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat',
        'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Maun', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr',
        'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas',
    ];

    /**
     * Common English translated names.
     *
     * @var list<string>
     */
    public const TRANSLATED_NAMES = [
        'The Opening', 'The Cow', 'The Family of Imran', 'The Women', 'The Table Spread', 'The Cattle', 'The Heights', 'The Spoils of War', 'The Repentance', 'Jonah',
        'Hud', 'Joseph', 'The Thunder', 'Abraham', 'The Rocky Tract', 'The Bee', 'The Night Journey', 'The Cave', 'Mary', 'Ta-Ha',
        'The Prophets', 'The Pilgrimage', 'The Believers', 'The Light', 'The Criterion', 'The Poets', 'The Ant', 'The Stories', 'The Spider', 'The Romans',
        'Luqman', 'The Prostration', 'The Combined Forces', 'Sheba', 'The Originator', 'Ya Sin', 'Those Who Set The Ranks', 'The Letter Sad', 'The Troops', 'The Forgiver',
        'Explained in Detail', 'The Consultation', 'The Ornaments of Gold', 'The Smoke', 'The Crouching', 'The Wind-Curved Sandhills', 'Muhammad', 'The Victory', 'The Rooms', 'Qaf',
        'The Winnowing Winds', 'The Mount', 'The Star', 'The Moon', 'The Beneficent', 'The Event', 'The Iron', 'The Pleading Woman', 'The Exile', 'She That Is To Be Examined',
        'The Ranks', 'The Congregation', 'The Hypocrites', 'The Mutual Disillusion', 'The Divorce', 'The Prohibition', 'The Sovereignty', 'The Pen', 'The Reality', 'The Ascending Stairways',
        'Noah', 'The Jinn', 'The Enshrouded One', 'The Cloaked One', 'The Resurrection', 'Man', 'The Emissaries', 'The Tidings', 'Those Who Drag Forth', 'He Frowned',
        'The Overthrowing', 'The Cleaving', 'The Defrauding', 'The Sundering', 'The Mansions of the Stars', 'The Morning Star', 'The Most High', 'The Overwhelming', 'The Dawn', 'The City',
        'The Sun', 'The Night', 'The Morning Hours', 'The Relief', 'The Fig', 'The Clot', 'The Power', 'The Clear Proof', 'The Earthquake', 'The Courser',
        'The Calamity', 'The Rivalry in World Increase', 'The Declining Day', 'The Traducer', 'The Elephant', 'Quraysh', 'The Small Kindnesses', 'The Abundance', 'The Disbelievers', 'The Divine Support',
        'The Palm Fiber', 'The Sincerity', 'The Daybreak', 'Mankind',
    ];

    public static function ayahCount(int $surah): ?int
    {
        if ($surah < 1 || $surah > 114) {
            return null;
        }

        return self::AYAH_COUNTS[$surah - 1] ?? null;
    }

    public static function name(int $surah): ?string
    {
        if ($surah < 1 || $surah > 114) {
            return null;
        }

        return self::NAMES[$surah - 1] ?? null;
    }

    public static function translatedName(int $surah): ?string
    {
        if ($surah < 1 || $surah > 114) {
            return null;
        }

        return self::TRANSLATED_NAMES[$surah - 1] ?? null;
    }

    /**
     * @return array{id: int, name: string, translated_name: string, ayah_count: int}|null
     */
    public static function surah(int $surah): ?array
    {
        $count = self::ayahCount($surah);
        $name = self::name($surah);
        if ($count === null || $name === null) {
            return null;
        }

        return [
            'id' => $surah,
            'name' => $name,
            'translated_name' => self::translatedName($surah) ?? $name,
            'ayah_count' => $count,
        ];
    }

    /**
     * Next surah in the adaptive beginner path:
     * Al-Fatiha → An-Nas, then Juz ʿAmma descending (114→78), then Al-Baqarah.
     */
    public static function nextSurah(int $surah): ?array
    {
        if ($surah < 1 || $surah > 114) {
            return null;
        }

        // After Al-Fatiha, continue into Juz ʿAmma from An-Nas (not Al-Baqarah).
        if ($surah === 1) {
            return self::surah(114);
        }

        // Juz ʿAmma reverse: An-Nas → Al-Falaq → … → An-Naba.
        if ($surah >= 79 && $surah <= 114) {
            return self::surah($surah - 1);
        }

        // After An-Naba, begin Al-Baqarah in small adaptive chunks.
        if ($surah === 78) {
            return self::surah(2);
        }

        // Long-surah path: Al-Baqarah → … → Al-Mursalat, then stop (Juz ʿAmma already covered).
        if ($surah >= 2 && $surah < 77) {
            return self::surah($surah + 1);
        }

        return null;
    }

    public static function isValidAyah(int $surah, int $ayah): bool
    {
        $count = self::ayahCount($surah);

        return $count !== null && $ayah >= 1 && $ayah <= $count;
    }
}
