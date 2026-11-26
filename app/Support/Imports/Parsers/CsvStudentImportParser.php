<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;
use App\Support\Imports\StudentImportTabularExtractor;
use RuntimeException;

final class CsvStudentImportParser implements StudentImportParser
{
    public function key(): string
    {
        return 'csv';
    }

    public function extensions(): array
    {
        return ['csv'];
    }

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        $contents = file_get_contents($absolutePath);
        if ($contents === false) {
            throw new RuntimeException('Unable to read CSV file.');
        }

        $encoding = mb_detect_encoding($contents, ['UTF-8', 'UTF-16', 'ISO-8859-6', 'ISO-8859-1', 'Windows-1252'], true) ?: 'UTF-8';
        if ($encoding !== 'UTF-8') {
            $converted = mb_convert_encoding($contents, 'UTF-8', $encoding);
            if ($converted !== false) {
                $contents = $converted;
            }
        }

        $contents = preg_replace("/^\xEF\xBB\xBF/", '', $contents) ?? $contents;

        $handle = fopen('php://memory', 'r+');
        if ($handle === false) {
            throw new RuntimeException('Unable to open CSV buffer.');
        }
        fwrite($handle, $contents);
        rewind($handle);

        $delimiter = $this->detectDelimiter($contents);
        $matrix = [];
        while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
            $matrix[] = $data;
        }
        fclose($handle);

        if ($matrix === []) {
            return new StudentImportParseResult([], [], ['parser' => $this->key(), 'filename' => $originalFilename]);
        }

        $rows = StudentImportTabularExtractor::fromMatrix($matrix, [
            'parser' => $this->key(),
            'filename' => $originalFilename,
            'delimiter' => $delimiter,
            'encoding' => $encoding,
        ]);

        $headings = array_map('strval', $matrix[0] ?? []);

        return new StudentImportParseResult($rows, $headings, [
            'parser' => $this->key(),
            'filename' => $originalFilename,
            'delimiter' => $delimiter,
            'encoding' => $encoding,
        ]);
    }

    private function detectDelimiter(string $contents): string
    {
        $firstLine = strtok($contents, "\n") ?: '';
        $candidates = [',', ';', "\t", '|'];
        $best = ',';
        $bestCount = 0;
        foreach ($candidates as $delimiter) {
            $count = substr_count($firstLine, $delimiter);
            if ($count > $bestCount) {
                $best = $delimiter;
                $bestCount = $count;
            }
        }

        return $best;
    }
}