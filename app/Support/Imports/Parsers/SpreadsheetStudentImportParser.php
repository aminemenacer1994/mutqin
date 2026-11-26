<?php

namespace App\Support\Imports\Parsers;

use App\Support\Imports\StudentImportParseResult;
use App\Support\Imports\StudentImportTabularExtractor;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;
use PhpOffice\PhpSpreadsheet\Settings;
use RuntimeException;

final class SpreadsheetStudentImportParser implements StudentImportParser
{
    public function key(): string
    {
        return 'spreadsheet';
    }

    public function extensions(): array
    {
        return ['xlsx', 'xls', 'ods'];
    }

    public function parse(string $absolutePath, string $originalFilename): StudentImportParseResult
    {
        Settings::setLibXmlLoaderOptions(LIBXML_NONET | LIBXML_COMPACT);

        $reader = IOFactory::createReaderForFile($absolutePath);
        $reader->setReadDataOnly(true);
        $reader->setIncludeCharts(false);
        if (method_exists($reader, 'setReadEmptyCells')) {
            $reader->setReadEmptyCells(false);
        }

        $maxRows = max(1, (int) config('mutqin.student_import.max_spreadsheet_rows', 10000));
        $maxCols = max(1, (int) config('mutqin.student_import.max_spreadsheet_columns', 64));
        if (method_exists($reader, 'setReadFilter')) {
            $reader->setReadFilter(new class($maxRows, $maxCols) implements IReadFilter
            {
                public function __construct(private int $maxRows, private int $maxCols) {}

                public function readCell($columnAddress, $row, $worksheetName = ''): bool
                {
                    $columnIndex = Coordinate::columnIndexFromString((string) $columnAddress);

                    return $row <= $this->maxRows && $columnIndex <= $this->maxCols;
                }
            });
        }

        $spreadsheet = $reader->load($absolutePath);
        $spreadsheet->setActiveSheetIndex(0);
        $sheet = $spreadsheet->getActiveSheet();

        $sheetTitle = $sheet->getTitle();
        $matrix = $sheet->toArray(null, true, true, false);
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        if ($matrix === []) {
            return new StudentImportParseResult([], [], [
                'parser' => $this->key(),
                'filename' => $originalFilename,
            ]);
        }

        $rows = StudentImportTabularExtractor::fromMatrix($matrix, [
            'parser' => $this->key(),
            'filename' => $originalFilename,
            'sheet' => $sheetTitle,
        ]);

        return new StudentImportParseResult($rows, array_map('strval', $matrix[0] ?? []), [
            'parser' => $this->key(),
            'filename' => $originalFilename,
            'sheet' => $sheetTitle,
            'formula_execution' => false,
        ]);
    }
}