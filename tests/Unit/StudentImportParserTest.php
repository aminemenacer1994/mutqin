<?php

namespace Tests\Unit;

use App\Support\Imports\Parsers\CsvStudentImportParser;
use App\Support\Imports\Parsers\PlainTextStudentImportParser;
use App\Support\Imports\Parsers\JsonStudentImportParser;
use App\Support\Imports\Parsers\PdfStudentImportParser;
use App\Support\Imports\Parsers\WordStudentImportParser;
use App\Support\Imports\StudentImportFieldAliases;
use App\Support\Imports\StudentImportFileSecurity;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StudentImportParserTest extends TestCase
{
    public function test_csv_parser_reads_utf8_and_arabic_headers(): void
    {
        $temp = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($temp, "البريد الإلكتروني,الاسم\nstudent@example.test,محمد أحمد\n");
        $result = (new CsvStudentImportParser)->parse($temp, 'roster.csv');
        @unlink($temp);

        $this->assertCount(1, $result->rows);
        $canonical = StudentImportFieldAliases::canonicalizeRow($result->rows[0]['fields']);
        $this->assertSame('student@example.test', $canonical['email']);
        $this->assertSame('محمد أحمد', $canonical['name']);
    }

    public function test_json_parser_accepts_students_wrapper(): void
    {
        $temp = tempnam(sys_get_temp_dir(), 'json');
        file_put_contents($temp, json_encode([
            'students' => [
                ['email' => 'a@example.test', 'name' => 'A'],
            ],
        ], JSON_THROW_ON_ERROR));
        $result = (new JsonStudentImportParser)->parse($temp, 'data.json');
        @unlink($temp);

        $this->assertCount(1, $result->rows);
        $this->assertSame('a@example.test', $result->rows[0]['fields']['email']);
    }

    public function test_pdf_parser_reports_image_only_pdfs(): void
    {
        $temp = tempnam(sys_get_temp_dir(), 'pdf');
        file_put_contents($temp, '%PDF-1.4\n');
        $result = (new PdfStudentImportParser)->parse($temp, 'scan.pdf');
        @unlink($temp);

        $this->assertTrue($result->isUnsupported());
        $this->assertNotNull($result->unsupportedReason);
    }

    public function test_word_parser_rejects_legacy_doc(): void
    {
        $temp = tempnam(sys_get_temp_dir(), 'doc');
        file_put_contents($temp, 'fake');
        $result = (new WordStudentImportParser)->parse($temp, 'roster.doc');
        @unlink($temp);

        $this->assertTrue($result->isUnsupported());
        $this->assertStringContainsString('.doc', (string) $result->unsupportedReason);
    }

    public function test_plain_text_parser_treats_first_line_as_header(): void
    {
        $temp = tempnam(sys_get_temp_dir(), 'txt');
        file_put_contents($temp, "email,name\nstudent@example.test,Plain Student\n");
        $result = (new PlainTextStudentImportParser)->parse($temp, 'paste.txt');
        @unlink($temp);

        $this->assertCount(1, $result->rows);
        $canonical = StudentImportFieldAliases::canonicalizeRow($result->rows[0]['fields']);
        $this->assertSame('student@example.test', $canonical['email']);
    }

    public function test_security_rejects_disallowed_extension(): void
    {
        $file = UploadedFile::fake()->create('payload.exe', 10, 'application/octet-stream');
        $this->expectException(ValidationException::class);
        (new StudentImportFileSecurity)->validateUpload($file);
    }
}