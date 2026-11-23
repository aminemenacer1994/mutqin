<?php

namespace App\Support\Demo;

/**
 * Closed identities for the interconnected teacher, student and parent demo.
 * Reset and seed logic may touch these emails only, and only with the ownership marker.
 */
final class PlatformDemoCatalog
{
    public const MARKER_PREFIX = 'cus_mutqin_platform_demo_';

    public const ORGANISATION = 'Nur Platform Demo Halaqa';

    /**
     * @return list<array{key: string, name: string, email: string}>
     */
    public static function teachers(): array
    {
        return [
            ['key' => 't01', 'name' => 'Hana Yusuf', 'email' => 'platform.demo.teacher.01@mutqin.test'],
            ['key' => 't02', 'name' => 'Bilal Karim', 'email' => 'platform.demo.teacher.02@mutqin.test'],
            ['key' => 't03', 'name' => 'Maryam Noor', 'email' => 'platform.demo.teacher.03@mutqin.test'],
            ['key' => 't04', 'name' => 'Yusuf Adeel', 'email' => 'platform.demo.teacher.04@mutqin.test'],
            ['key' => 't05', 'name' => 'Layla Farid', 'email' => 'platform.demo.teacher.05@mutqin.test'],
        ];
    }

    /**
     * @return list<array{number: int, key: string, name: string, email: string, group: string, extra_group: ?string}>
     */
    public static function students(): array
    {
        $names = [
            'Adam Nasser', 'Ayah Malik', 'Yusuf Hussein', 'Fatima Qadir', 'Ibrahim Adel',
            'Khadija Saleh', 'Omar Amin', 'Maryam Rashid', 'Hassan Tariq', 'Zainab Nabil',
            'Hamza Suleiman', 'Hana Farid', 'Ismail Jamil', 'Aisha Nur', 'Anas Khalil',
        ];
        $students = [];
        foreach ($names as $index => $name) {
            $number = $index + 1;
            $group = match (true) {
                $number <= 5 => 'dawn',
                $number <= 10 => 'dusk',
                default => 'weekend',
            };
            $extra = match ($number) {
                1, 2, 11 => 'dusk',
                6 => 'weekend',
                default => null,
            };
            $students[] = [
                'number' => $number,
                'key' => sprintf('s%02d', $number),
                'name' => $name,
                'email' => sprintf('platform.demo.student.%02d@mutqin.test', $number),
                'group' => $group,
                'extra_group' => $extra,
            ];
        }

        return $students;
    }

    /**
     * Child numbers are 1-based student indexes.
     *
     * @return list<array{key: string, name: string, email: string, children: list<int>}>
     */
    public static function parents(): array
    {
        return [
            ['key' => 'p01', 'name' => 'Sara Qadir', 'email' => 'platform.demo.parent.01@mutqin.test', 'children' => [1, 2, 3]],
            ['key' => 'p02', 'name' => 'Omar Nabil', 'email' => 'platform.demo.parent.02@mutqin.test', 'children' => [4, 5]],
            ['key' => 'p03', 'name' => 'Amina Saleh', 'email' => 'platform.demo.parent.03@mutqin.test', 'children' => [6, 7, 8]],
            ['key' => 'p04', 'name' => 'Hassan Idris', 'email' => 'platform.demo.parent.04@mutqin.test', 'children' => [9, 10]],
            ['key' => 'p05', 'name' => 'Fatima Zahra', 'email' => 'platform.demo.parent.05@mutqin.test', 'children' => [11, 12]],
            ['key' => 'p06', 'name' => 'Ibrahim Sami', 'email' => 'platform.demo.parent.06@mutqin.test', 'children' => [13, 14, 15]],
            ['key' => 'p07', 'name' => 'Khadija Harun', 'email' => 'platform.demo.parent.07@mutqin.test', 'children' => [1, 6]],
            ['key' => 'p08', 'name' => 'Zayd Noor', 'email' => 'platform.demo.parent.08@mutqin.test', 'children' => [10, 15]],
        ];
    }

    /**
     * @return list<array{key: string, name: string, teachers: list<string>}>
     */
    public static function groups(): array
    {
        return [
            ['key' => 'dawn', 'name' => 'Dawn Circle', 'teachers' => ['t01', 't02']],
            ['key' => 'dusk', 'name' => 'Dusk Circle', 'teachers' => ['t01', 't03', 't05']],
            ['key' => 'weekend', 'name' => 'Weekend Circle', 'teachers' => ['t04', 't05']],
        ];
    }

    /**
     * @return list<string>
     */
    public static function emails(): array
    {
        return array_values(array_unique(array_merge(
            array_column(self::teachers(), 'email'),
            array_column(self::students(), 'email'),
            array_column(self::parents(), 'email'),
        )));
    }

    public static function markerFor(string $email): string
    {
        return self::MARKER_PREFIX.substr(hash('sha256', strtolower($email)), 0, 24);
    }
}
