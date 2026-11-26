<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;
use JsonException;
use RuntimeException;

final class JsonStudentImportParser implements StudentImportParser
{
    public function key(): string
    {
        return 'json';
    }

    public function extensions(): array
    {
        return ['json'];
    }

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        $contents = file_get_contents($absolutePath);
        if ($contents === false) {
            throw new RuntimeException('Unable to read JSON file.');
        }

        try {
            $decoded = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new RuntimeException('JSON could not be parsed: '.$e->getMessage(), 0, $e);
        }

        $rows = [];
        $headings = [];
        $index = 0;

        if (array_is_list($decoded)) {
            foreach ($decoded as $item) {
                $index++;
                if (! is_array($item)) {
                    continue;
                }
                $rows[] = [
                    'row_index' => $index,
                    'fields' => $item,
                    'source' => ['parser' => $this->key(), 'filename' => $originalFilename, 'json_index' => $index],
                ];
                $headings = array_values(array_unique(array_merge($headings, array_keys($item))));
            }
        } elseif (is_array($decoded)) {
            $candidates = $decoded['students'] ?? $decoded['rows'] ?? $decoded['data'] ?? null;
            if (is_array($candidates)) {
                foreach ($candidates as $item) {
                    $index++;
                    if (! is_array($item)) {
                        continue;
                    }
                    $rows[] = [
                        'row_index' => $index,
                        'fields' => $item,
                        'source' => ['parser' => $this->key(), 'filename' => $originalFilename, 'json_index' => $index],
                    ];
                    $headings = array_values(array_unique(array_merge($headings, array_keys($item))));
                }
            } else {
                $rows[] = [
                    'row_index' => 1,
                    'fields' => $decoded,
                    'source' => ['parser' => $this->key(), 'filename' => $originalFilename, 'json_index' => 1],
                ];
                $headings = array_keys($decoded);
            }
        }

        return new StudentImportParseResult($rows, $headings, [
            'parser' => $this->key(),
            'filename' => $originalFilename,
        ]);
    }
}