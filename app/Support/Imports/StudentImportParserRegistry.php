<?php

namespace App\Support\Imports;

use App\Support\Imports\Parsers\CsvStudentImportParser;
use App\Support\Imports\Parsers\JsonStudentImportParser;
use App\Support\Imports\Parsers\PdfStudentImportParser;
use App\Support\Imports\Parsers\PlainTextStudentImportParser;
use App\Support\Imports\Parsers\SpreadsheetStudentImportParser;
use App\Support\Imports\Parsers\StudentImportParser;
use App\Support\Imports\Parsers\WordStudentImportParser;
use Illuminate\Http\UploadedFile;

final class StudentImportParserRegistry
{
    /**
     * @var list<StudentImportParser>
     */
    private array $parsers;

    public function __construct()
    {
        $this->parsers = [
            new CsvStudentImportParser,
            new JsonStudentImportParser,
            new PlainTextStudentImportParser,
            new SpreadsheetStudentImportParser,
            new WordStudentImportParser,
            new PdfStudentImportParser,
        ];
    }

    public function resolve(UploadedFile|string $file, ?string $originalFilename = null): ?StudentImportParser
    {
        $name = $originalFilename ?? ($file instanceof UploadedFile ? $file->getClientOriginalName() : (string) $file);
        $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        foreach ($this->parsers as $parser) {
            if (in_array($extension, $parser->extensions(), true)) {
                return $parser;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public function supportedExtensions(): array
    {
        $extensions = [];
        foreach ($this->parsers as $parser) {
            $extensions = array_merge($extensions, $parser->extensions());
        }

        return array_values(array_unique($extensions));
    }

    public function parseFile(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        $parser = $this->resolve($originalFilename);
        if ($parser === null) {
            return new StudentImportParseResult(
                [],
                [],
                ['filename' => $originalFilename],
                unsupportedReason: 'No parser is registered for this file type.',
            );
        }

        return $parser->parse($absolutePath, $originalFilename);
    }
}