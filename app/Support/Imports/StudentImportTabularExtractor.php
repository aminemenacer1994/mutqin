<?php

namespace App\Support\Imports;

/**
 * Converts tabular matrices into normalized row payloads.
 */
final class StudentImportTabularExtractor
{
    /**
     * @param  list<list<mixed>>  $matrix
     * @param  array<string, mixed>  $sourceBase
     * @return list<array{row_index: int, fields: array<string, mixed>, source: array<string, mixed>}>
     */
    public static function fromMatrix(array $matrix, array $sourceBase = [], int $headerRowIndex = 0): array
    {
        if ($matrix === []) {
            return [];
        }

        $headerRow = $matrix[$headerRowIndex] ?? [];
        $headers = [];
        foreach ($headerRow as $index => $cell) {
            $label = trim((string) $cell);
            if ($label === '') {
                $label = 'column_'.($index + 1);
            }
            $headers[$index] = $label;
        }

        $rows = [];
        $dataStart = $headerRowIndex + 1;
        for ($i = $dataStart, $count = count($matrix); $i < $count; $i++) {
            $line = $matrix[$i] ?? [];
            if (self::lineIsEmpty($line)) {
                continue;
            }

            $fields = [];
            foreach ($headers as $columnIndex => $headerName) {
                $fields[$headerName] = $line[$columnIndex] ?? null;
            }

            $rows[] = [
                'row_index' => $i + 1,
                'fields' => $fields,
                'source' => array_merge($sourceBase, [
                    'sheet_row' => $i + 1,
                ]),
            ];
        }

        return $rows;
    }

    /**
     * @param  list<mixed>  $line
     */
    private static function lineIsEmpty(array $line): bool
    {
        foreach ($line as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}