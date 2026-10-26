<?php

namespace App\Support\Demo;


/**
 * Closed list of teacher-demo identities.
 *
 * Reset and seed logic may touch these emails only, and only when the user
 * also carries the ownership marker. Nothing else is in scope.
 */
final class TeacherDemoCatalog
{
    public const PASSWORD = 'TeacherDemo1!';

    public const MARKER = 'cus_mutqin_teacher_demo_';

    public const HIGH_PERFORMER = 1;

    public const INTERVENTION = 6;

    public const PAUSED = 13;

    public const REPEATED = 21;

    public const NEW_EMPTY = 29;

    public const NEW_MINIMAL = 30;

    public const INTERVENTION_BEFORE = 68;

    public const INTERVENTION_AFTER = 90;

    public const INTERVENTION_FEEDBACK = 'Al-Ikhlas 1–4 improved after this recitation. Compare the check from before this task with the one after it.';

    public const PRIVATE_NOTE = 'This student repeats the same word in An-Nas 2. This note stays with the teacher.';

    /**
     * @var list<int>
     */
    public const INACTIVE = [26, 27, 28];

    /**
     * @var array<string, array{sessions: int, attempts: int, min: int, max: int}>
     */
    public const ACTIVITY = [
        'excellent' => ['sessions' => 22, 'attempts' => 10, 'min' => 90, 'max' => 98],
        'good' => ['sessions' => 16, 'attempts' => 8, 'min' => 80, 'max' => 89],
        'average' => ['sessions' => 12, 'attempts' => 6, 'min' => 65, 'max' => 79],
        'struggling' => ['sessions' => 10, 'attempts' => 8, 'min' => 40, 'max' => 64],
        'inactive' => ['sessions' => 8, 'attempts' => 4, 'min' => 48, 'max' => 63],
        'new' => ['sessions' => 0, 'attempts' => 0, 'min' => 72, 'max' => 72],
    ];

    /**
     * @var list<array{surah: int, from: int, to: int}>
     */
    public const PRACTICE_RANGES = [
        ['surah' => 1, 'from' => 1, 'to' => 7],
        ['surah' => 113, 'from' => 1, 'to' => 5],
        ['surah' => 114, 'from' => 1, 'to' => 6],
    ];

    /**
     * @var array{surah: int, from: int, to: int}
     */
    public const STORY_RANGE = ['surah' => 112, 'from' => 1, 'to' => 4];

    /**
     * @var array{surah: int, from: int, to: int}
     */
    public const OVERDUE_RANGE = ['surah' => 67, 'from' => 1, 'to' => 5];

    /**
     * @var array{surah: int, from: int, to: int}
     */
    public const PROGRESS_RANGE = ['surah' => 108, 'from' => 1, 'to' => 3];

    /**
     * @var array{surah: int, from: int, to: int}
     */
    public const PENDING_RANGE = ['surah' => 106, 'from' => 1, 'to' => 4];

    /**
     * @var list<string>
     */
    private const GROUP_KEYS = ['fajr', 'maghrib', 'year-1', 'year-2', 'class-7a', 'class-7b'];

    // Placeholder until the teacher supplies a different address. Never seed
    // over the existing personal student account.
    public const TEACHER_EMAIL = 'teacher.demo.amine@example.com';

    /** Previous demo identities are reset only when they carry the ownership marker. */
    public const LEGACY_TEACHER_EMAILS = [
        'teacher.demo.halaqa.fajr@example.com',
        'teacher.demo.halaqa.maghrib@example.com',
        'teacher.demo.madrassa@example.com',
        'teacher.demo.school.7a@example.com',
        'teacher.demo.school.7b@example.com',
    ];

    /**
     * @var array<string, int>
     */
    private const PROFILE_COUNTS = [
        'excellent' => 5,
        'good' => 7,
        'average' => 8,
        'struggling' => 5,
        'inactive' => 3,
        'new' => 2,
    ];

    /**
     * @var list<string>
     */
    private const STUDENT_NAMES = [
        'Adam Nasser', 'Ayah Malik', 'Yusuf Hussein', 'Fatima Qadir',
        'Ibrahim Adel', 'Khadija Saleh', 'Omar Amin', 'Maryam Rashid',
        'Hassan Tariq', 'Zainab Nabil', 'Hamza Suleiman', 'Hana Farid',
        'Ismail Jamil', 'Aisha Nur', 'Anas Khalil', 'Layla Rahman',
        'Musa Ali', 'Sara Zahra', 'Zayd Harun', 'Noor Sadiq',
        'Idris Malik', 'Hafsa Yusuf', 'Yahya Qureshi', 'Ruqayyah Hussein',
        'Dawud Ahmad', 'Asma Faruq', 'Sami Uthman', 'Sumayyah Karim',
        'Salma Ibrahim', 'Dina Salih',
    ];

    /**
     * @return list<array{key: string, type: string, name: string}>
     */
    public static function organisations(): array
    {
        return [['key' => 'halaqa', 'type' => 'halaqa', 'name' => 'Amine Menacer Demo Halaqa']];
    }

    /**
     * @return list<array{key: string, org: string, name: string}>
     */
    public static function groups(): array
    {
        return [
            ['key' => 'fajr', 'org' => 'halaqa', 'name' => 'Fajr Circle'],
            ['key' => 'maghrib', 'org' => 'halaqa', 'name' => 'Maghrib Circle'],
            ['key' => 'year-1', 'org' => 'halaqa', 'name' => 'Year One'],
            ['key' => 'year-2', 'org' => 'halaqa', 'name' => 'Year Two'],
            ['key' => 'class-7a', 'org' => 'halaqa', 'name' => 'Class 7A'],
            ['key' => 'class-7b', 'org' => 'halaqa', 'name' => 'Class 7B'],
        ];
    }

    /**
     * @return list<array{key: string, name: string, email: string, org: string, groups: list<string>}>
     */
    public static function teachers(): array
    {
        return [
            [
                'key' => 'amine',
                'name' => 'Amine Menacer',
                'email' => self::TEACHER_EMAIL,
                'org' => 'halaqa',
                'groups' => self::GROUP_KEYS,
            ],
        ];
    }

    /**
     * @return list<array{number: int, key: string, email: string, name: string, profile: string, ordinal: int, group: string}>
     */
    public static function students(): array
    {
        $students = [];
        $ordinals = [];
        $number = 0;

        foreach (self::PROFILE_COUNTS as $profile => $count) {
            for ($i = 0; $i < $count; $i++) {
                $number++;
                $ordinal = $ordinals[$profile] ?? 0;
                $ordinals[$profile] = $ordinal + 1;
                $students[] = [
                    'number' => $number,
                    'key' => sprintf('s%02d', $number),
                    'email' => sprintf('teacher.demo.student.%02d@example.com', $number),
                    'name' => self::STUDENT_NAMES[$number - 1],
                    'profile' => $profile,
                    'ordinal' => $ordinal,
                    'group' => self::GROUP_KEYS[($number - 1) % count(self::GROUP_KEYS)],
                ];
            }
        }

        return $students;
    }

    /**
     * @return list<string>
     */
    public static function emails(): array
    {
        return array_values(array_unique(array_merge(
            array_column(self::teachers(), 'email'),
            array_column(self::students(), 'email'),
            self::LEGACY_TEACHER_EMAILS,
        )));
    }

    public static function markerFor(string $key): string
    {
        return self::MARKER.$key;
    }
}
