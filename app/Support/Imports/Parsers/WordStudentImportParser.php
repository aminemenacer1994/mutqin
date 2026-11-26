<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Settings;
use RuntimeException;

final class WordStudentImportParser implements StudentImportParser
{
    public function key(): string
    {
        return 'word';
    }

    public function extensions(): array
    {
        return ['docx', 'doc'];
    }

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        $extension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

        if ($extension === 'doc') {
            return new StudentImportParseResult(
                [],
                [],
                ['parser' => $this->key(), 'filename' => $originalFilename],
                unsupportedReason: 'Legacy .doc (binary Word) is not supported. Save as .docx or export to CSV.',
            );
        }

        Settings::setZipClass(Settings::PCLZIP);
        Settings::setOutputEscapingEnabled(true);

        try {
            $phpWord = IOFactory::load($absolutePath);
        } catch (\Throwable $e) {
            throw new RuntimeException('DOCX could not be parsed safely: '.$e->getMessage(), 0, $e);
        }

        $textParts = [];
        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                if (method_exists($element, 'getText')) {
                    $chunk = trim((string) $element->getText());
                    if ($chunk !== '') {
                        $textParts[] = $chunk;
                    }
                }
            }
        }

        $text = trim(implode("\n", $textParts));
        if ($text === '') {
            return new StudentImportParseResult([], [], [
                'parser' => $this->key(),
                'filename' => $originalFilename,
            ]);
        }

        $plain = new PlainTextStudentImportParser;
        $temp = tempnam(sys_get_temp_dir(), 'mutqin_docx_');
        if ($temp === false) {
            throw new RuntimeException('Unable to stage DOCX text extract.');
        }
        file_put_contents($temp, $text);
        try {
            return $plain->parse($temp, $originalFilename);
        } finally {
            @unlink($temp);
        }
    }
}