<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;

/**
 * Parses in-memory pasted text (no filesystem artifact).
 */
final class PastedTextStudentImportParser
{
    public function key(): string
    {
        return 'pasted_text';
    }

    public function parse(string $text): StudentImportParseResult
    {
        $temp = tempnam(sys_get_temp_dir(), 'mutqin_import_');
        if ($temp === false) {
            throw new \RuntimeException('Unable to create temporary file for pasted text.');
        }

        file_put_contents($temp, $text);
        try {
            $plain = new PlainTextStudentImportParser;
            $result = $plain->parse($temp, 'pasted.txt');
        } finally {
            @unlink($temp);
        }

        return new StudentImportParseResult(
            $result->rows,
            $result->headings,
            array_merge($result->provenance, ['parser' => $this->key(), 'filename' => 'pasted.txt']),
        );
    }
}