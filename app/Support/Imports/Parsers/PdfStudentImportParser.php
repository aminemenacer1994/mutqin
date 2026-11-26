<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;
use RuntimeException;
use Smalot\PdfParser\Parser;

final class PdfStudentImportParser implements StudentImportParser
{
    public function key(): string
    {
        return 'pdf';
    }

    public function extensions(): array
    {
        return ['pdf'];
    }

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        if (! $this->looksLikePdf($absolutePath)) {
            throw new RuntimeException('File is not a valid PDF container.');
        }

        $parser = new Parser;
        try {
            $pdf = $parser->parseFile($absolutePath);
            $text = trim($pdf->getText());
        } catch (\Throwable $e) {
            return new StudentImportParseResult(
                [],
                [],
                ['parser' => $this->key(), 'filename' => $originalFilename],
                unsupportedReason: 'This PDF could not be parsed as text: '.$e->getMessage(),
            );
        }

        if ($text === '' || ! preg_match('/[\p{L}\p{N}]/u', $text)) {
            return new StudentImportParseResult(
                [],
                [],
                ['parser' => $this->key(), 'filename' => $originalFilename],
                unsupportedReason: 'This PDF has no extractable text (scanned/image-only). Export a text-based PDF or use CSV/XLSX.',
            );
        }

        $plain = new PlainTextStudentImportParser;
        $temp = tempnam(sys_get_temp_dir(), 'mutqin_pdf_');
        if ($temp === false) {
            throw new RuntimeException('Unable to stage PDF text extract.');
        }
        file_put_contents($temp, $text);
        try {
            $result = $plain->parse($temp, $originalFilename);
        } finally {
            @unlink($temp);
        }

        return new StudentImportParseResult(
            $result->rows,
            $result->headings,
            array_merge($result->provenance, [
                'parser' => $this->key(),
                'filename' => $originalFilename,
                'text_pdf' => true,
            ]),
        );
    }

    private function looksLikePdf(string $absolutePath): bool
    {
        $handle = fopen($absolutePath, 'rb');
        if ($handle === false) {
            return false;
        }
        $header = fread($handle, 5);
        fclose($handle);

        return $header === '%PDF-';
    }
}