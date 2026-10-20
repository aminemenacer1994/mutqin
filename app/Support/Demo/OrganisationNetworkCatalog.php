<?php

namespace App\Support\Demo;

use App\Support\Registration\RegistrationOrganisationDirectory;

/**
 * 10 teachers and 40 students across halaqa, madrassa, and school.
 *
 * Password for every account: OrganisationDemo1!
 */
final class OrganisationNetworkCatalog
{
    public const PASSWORD = 'OrganisationDemo1!';

    public const MARKER = 'cus_mutqin_org_network_';

    public const TEACHER_COUNT = 10;

    public const STUDENT_COUNT = 40;

    /**
     * @var array<string, array{teachers: int, students: int}>
     */
    public const ORG_COUNTS = [
        'halaqa' => ['teachers' => 3, 'students' => 12],
        'madrassa' => ['teachers' => 4, 'students' => 16],
        'school' => ['teachers' => 3, 'students' => 12],
    ];

    /**
     * @var list<string>
     */
    public const PROFILES = ['excellent', 'good', 'average', 'struggling', 'inactive', 'new'];

    /**
     * @var array<string, array{sessions: int, attempts: int, min: int, max: int}>
     */
    public const ACTIVITY = [
        'excellent' => ['sessions' => 12, 'attempts' => 6, 'min' => 90, 'max' => 98],
        'good' => ['sessions' => 10, 'attempts' => 5, 'min' => 80, 'max' => 89],
        'average' => ['sessions' => 8, 'attempts' => 5, 'min' => 65, 'max' => 79],
        'struggling' => ['sessions' => 7, 'attempts' => 6, 'min' => 42, 'max' => 64],
        'inactive' => ['sessions' => 5, 'attempts' => 3, 'min' => 48, 'max' => 63],
        'new' => ['sessions' => 2, 'attempts' => 1, 'min' => 70, 'max' => 76],
    ];

    /**
     * @var list<array{surah: int, from: int, to: int}>
     */
    public const PRACTICE_RANGES = [
        ['surah' => 1, 'from' => 1, 'to' => 7],
        ['surah' => 112, 'from' => 1, 'to' => 4],
        ['surah' => 113, 'from' => 1, 'to' => 5],
        ['surah' => 114, 'from' => 1, 'to' => 6],
        ['surah' => 108, 'from' => 1, 'to' => 3],
        ['surah' => 103, 'from' => 1, 'to' => 3],
    ];

    /**
     * @var array{surah: int, from: int, to: int}
     */
    public const OVERDUE_RANGE = ['surah' => 67, 'from' => 1, 'to' => 5];

    /**
     * @var array{surah: int, from: int, to: int}
     */
    public const SAVED_RANGE = ['surah' => 78, 'from' => 1, 'to' => 5];

    /**
     * @var array<string, list<string>>
     */
    private const TEACHER_NAMES = [
        'halaqa' => ['Yusuf Rahman', 'Amina Khalil', 'Ibrahim Sadiq'],
        'madrassa' => ['Fatima Zahra', 'Omar Faruq', 'Khadija Nur', 'Hassan Ali'],
        'school' => ['Maryam Yusuf', 'Bilal Ahmad', 'Zainab Karim'],
    ];

    /**
     * @var list<string>
     */
    private const STUDENT_NAMES = [
        'Adam Hussein', 'Amina Malik', 'Yusuf Karim', 'Fatima Noor',
        'Ibrahim Suleiman', 'Khadija Rahman', 'Omar Qureshi', 'Maryam Ali',
        'Hassan Zahra', 'Zainab Faruq', 'Hamza Yusuf', 'Hana Siddique',
        'Ismail Tariq', 'Aisha Khalil', 'Anas Ibrahim', 'Layla Hassan',
        'Musa Harun', 'Sara Jamil', 'Zayd Uthman', 'Noor Malik',
        'Idris Nasser', 'Hafsa Karim', 'Yahya Saleh', 'Ruqayyah Amin',
        'Dawud Rahman', 'Asma Qadir', 'Sami Farid', 'Sumayyah Adel',
        'Tariq Nabil', 'Salma Yusuf', 'Luqman Aziz', 'Dina Hassan',
        'Harun Rashid', 'Leena Omar', 'Anwar Sadiq', 'Yasmin Khalid',
        'Rami Adel', 'Iman Yusuf', 'Nabil Karim', 'Mariam Salih',
    ];

    /**
     * @return list<array{
     *     key: string,
     *     type: string,
     *     name: string,
     *     group: string,
     *     teachers: list<array{key: string, name: string, email: string}>,
     *     students: list<array{key: string, name: string, email: string, number: int, profile: string, ordinal: int}>
     * }>
     */
    public static function networks(): array
    {
        $studentNumber = 0;
        $ordinals = [];
        $networks = [];

        foreach (self::ORG_COUNTS as $org => $counts) {
            $teachers = [];
            for ($i = 1; $i <= $counts['teachers']; $i++) {
                $teachers[] = [
                    'key' => "{$org}-teacher-{$i}",
                    'name' => self::TEACHER_NAMES[$org][$i - 1],
                    'email' => self::teacherEmail($org, $i),
                ];
            }

            $students = [];
            for ($i = 1; $i <= $counts['students']; $i++) {
                $studentNumber++;
                $profile = self::PROFILES[($studentNumber - 1) % count(self::PROFILES)];
                $ordinal = $ordinals[$profile] ?? 0;
                $ordinals[$profile] = $ordinal + 1;
                $students[] = [
                    'key' => sprintf('s%02d', $studentNumber),
                    'name' => self::STUDENT_NAMES[$studentNumber - 1],
                    'email' => self::studentEmail($org, $i),
                    'number' => $studentNumber,
                    'profile' => $profile,
                    'ordinal' => $ordinal,
                ];
            }

            $networks[] = [
                'key' => $org,
                'type' => $org,
                'name' => self::directoryName($org),
                'group' => RegistrationOrganisationDirectory::REGISTRATION_GROUP,
                'teachers' => $teachers,
                'students' => $students,
            ];
        }

        return $networks;
    }

    public static function teacherEmail(string $org, int $index): string
    {
        if ($org === 'halaqa' && $index === 1) {
            return 'org.demo.halaqa.teacher@example.com';
        }
        if ($org === 'madrassa' && $index === 1) {
            return 'org.demo.madrassa.teacher@example.com';
        }
        if ($org === 'madrassa' && $index === 2) {
            return 'org.demo.madrassa.coteacher@example.com';
        }
        if ($org === 'school' && $index === 1) {
            return 'org.demo.school.teacher@example.com';
        }

        return sprintf('org.demo.%s.teacher%d@example.com', $org, $index);
    }

    public static function studentEmail(string $org, int $index): string
    {
        return sprintf('org.demo.%s.student%d@example.com', $org, $index);
    }

    /**
     * @return list<string>
     */
    public static function emails(): array
    {
        $emails = [];
        foreach (self::networks() as $network) {
            foreach ($network['teachers'] as $teacher) {
                $emails[] = $teacher['email'];
            }
            foreach ($network['students'] as $student) {
                $emails[] = $student['email'];
            }
        }

        return array_values(array_unique($emails));
    }

    /**
     * @return array{surah: int, from: int, to: int}
     */
    public static function practiceRange(int $number): array
    {
        return self::PRACTICE_RANGES[($number - 1) % count(self::PRACTICE_RANGES)];
    }

    public static function markerFor(string $key): string
    {
        return self::MARKER.$key;
    }

    private static function directoryName(string $type): string
    {
        foreach (RegistrationOrganisationDirectory::entries() as $entry) {
            if ($entry['type'] === $type) {
                return $entry['name'];
            }
        }

        throw new \RuntimeException("Missing registration organisation for type [{$type}].");
    }
}
