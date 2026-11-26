<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;

interface StudentImportParser
{
    public function key(): string;

    /**
     * @return list<string>
     */
    public function extensions(): array;

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult;
}