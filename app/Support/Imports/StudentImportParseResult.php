<?php

namespace App\Support\Imports;

final class StudentImportParseResult
{
    /**
     * @param  list<array{row_index: int, fields: array<string, mixed>, source: array<string, mixed>}>  $rows
     * @param  list<string>  $headings
     * @param  array<string, mixed>  $provenance
     */
    public function __construct(
        public readonly array $rows,
        public readonly array $headings = [],
        public readonly array $provenance = [],
        public readonly ?string $unsupportedReason = null,
    ) {}

    public function isUnsupported(): bool
    {
        return $this->unsupportedReason !== null;
    }
}