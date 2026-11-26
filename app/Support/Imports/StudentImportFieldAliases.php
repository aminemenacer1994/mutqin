<?php

namespace App\Support\Imports;

/**
 * Maps heterogeneous headers (including Arabic) onto canonical import fields.
 */
final class StudentImportFieldAliases
{
    /**
     * @var array<string, list<string>>
     */
    private const ALIASES = [
        'email' => [
            'email', 'e-mail', 'e_mail', 'mail', 'student email', 'student_email',
            'بريد', 'البريد', 'البريد الإلكتروني', 'بريد الطالب', 'ايميل', 'إيميل',
        ],
        'name' => [
            'name', 'student', 'student name', 'student_name', 'full name', 'full_name',
            'learner', 'pupil',
            'الاسم', 'اسم', 'اسم الطالب', 'الطالب', 'الاسم الكامل',
        ],
        'parent_email' => [
            'parent email', 'parent_email', 'guardian email', 'guardian_email',
            'parent', 'guardian', 'ولي الأمر', 'ولي الامر', 'بريد ولي الأمر',
        ],
        'phone' => [
            'phone', 'mobile', 'cell', 'telephone', 'tel', 'contact',
            'هاتف', 'جوال', 'رقم الجوال', 'رقم الهاتف',
        ],
        'notes' => [
            'notes', 'note', 'comments', 'comment', 'remarks',
            'ملاحظات', 'ملاحظة', 'تعليقات',
        ],
    ];

    /**
     * @param  array<string, mixed>  $rawRow
     * @return array<string, string|null>
     */
    public static function canonicalizeRow(array $rawRow): array
    {
        $normalizedHeaders = [];
        foreach ($rawRow as $header => $value) {
            $key = self::canonicalKey((string) $header);
            if ($key === null) {
                continue;
            }
            $stringValue = self::stringValue($value);
            if ($stringValue === null || $stringValue === '') {
                continue;
            }
            if (! array_key_exists($key, $normalizedHeaders) || $normalizedHeaders[$key] === null) {
                $normalizedHeaders[$key] = $stringValue;
            }
        }

        return [
            'email' => $normalizedHeaders['email'] ?? null,
            'name' => $normalizedHeaders['name'] ?? null,
            'parent_email' => $normalizedHeaders['parent_email'] ?? null,
            'phone' => $normalizedHeaders['phone'] ?? null,
            'notes' => $normalizedHeaders['notes'] ?? null,
        ];
    }

    public static function canonicalKey(string $header): ?string
    {
        $needle = self::normalizeHeader($header);
        if ($needle === '') {
            return null;
        }

        foreach (self::ALIASES as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($needle === self::normalizeHeader($alias)) {
                    return $canonical;
                }
            }
        }

        return null;
    }

    private static function normalizeHeader(string $header): string
    {
        $header = trim($header);
        $header = preg_replace('/[\x{200E}\x{200F}\x{202A}-\x{202E}\x{FEFF}]/u', '', $header) ?? $header;
        $header = mb_strtolower($header, 'UTF-8');
        $header = preg_replace('/[\s_\-:]+/u', ' ', $header) ?? $header;
        $header = preg_replace('/\s+/u', ' ', $header) ?? $header;

        return trim($header);
    }

    private static function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_scalar($value)) {
            $text = trim((string) $value);

            return $text === '' ? null : $text;
        }

        return null;
    }
}