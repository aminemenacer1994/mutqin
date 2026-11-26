<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportFieldAliases;
use App\Support\Imports\StudentImportParseResult;
use App\Support\Imports\StudentImportTabularExtractor;
use RuntimeException;

final class PlainTextStudentImportParser implements StudentImportParser
{
    public function key(): string
    {
        return 'plain_text';
    }

    public function extensions(): array
    {
        return ['txt', 'md', 'markdown'];
    }

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        $contents = file_get_contents($absolutePath);
        if ($contents === false) {
            throw new RuntimeException('Unable to read text file.');
        }

        $encoding = mb_detect_encoding($contents, ['UTF-8', 'ISO-8859-6', 'ISO-8859-1', 'Windows-1252'], true) ?: 'UTF-8';
        if ($encoding !== 'UTF-8') {
            $converted = mb_convert_encoding($contents, 'UTF-8', $encoding);
            if ($converted !== false) {
                $contents = $converted;
            }
        }

        $lines = preg_split("/\R/u", $contents) ?: [];
        $matrix = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $delimiter = str_contains($line, "\t") ? "\t" : (str_contains($line, '|') ? '|' : ',');
            $matrix[] = str_getcsv($line, $delimiter);
        }

        if ($matrix !== [] && self::firstRowLooksLikeHeader($matrix[0])) {
            $rows = StudentImportTabularExtractor::fromMatrix($matrix, [
                'parser' => $this->key(),
                'filename' => $originalFilename,
                'encoding' => $encoding,
            ]);

            return new StudentImportParseResult($rows, array_map('strval', $matrix[0]), [
                'parser' => $this->key(),
                'filename' => $originalFilename,
                'encoding' => $encoding,
            ]);
        }

        $rows = [];
        $rowIndex = 0;

        foreach ($lines as $lineNumber => $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $rowIndex++;
            if (str_contains($line, '|') || str_contains($line, "\t") || str_contains($line, ',')) {
                $delimiter = str_contains($line, "\t") ? "\t" : (str_contains($line, '|') ? '|' : ',');
                $cells = array_map('trim', str_getcsv($line, $delimiter));
                $fields = [];
                foreach ($cells as $i => $cell) {
                    $fields['column_'.($i + 1)] = $cell;
                }
            } else {
                $fields = ['text' => $line];
            }

            $rows[] = [
                'row_index' => $rowIndex,
                'fields' => $fields,
                'source' => [
                    'parser' => $this->key(),
                    'filename' => $originalFilename,
                    'line' => $lineNumber + 1,
                    'encoding' => $encoding,
                ],
            ];
        }

        return new StudentImportParseResult($rows, [], [
            'parser' => $this->key(),
            'filename' => $originalFilename,
            'encoding' => $encoding,
            'unstructured' => true,
        ]);
    }

    /**
     * @param  list<string>  $cells
     */
    private static function firstRowLooksLikeHeader(array $cells): bool
    {
        $matches = 0;
        foreach ($cells as $cell) {
            if (StudentImportFieldAliases::canonicalKey((string) $cell) !== null) {
                $matches++;
            }
        }

        return $matches > 0;
    }
}