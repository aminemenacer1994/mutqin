<?php

namespace App\Support\Imports;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class StudentImportFileSecurity
{
    /**
     * @return array{extension: string, mime: string|null, sha256: string}
     */
    public function validateUpload(UploadedFile $file): array
    {
        $maxBytes = max(1, (int) config('mutqin.student_import.max_file_bytes', 10 * 1024 * 1024));
        $maxFiles = max(1, (int) config('mutqin.student_import.max_files_per_batch', 10));

        if ($file->getSize() === false || $file->getSize() > $maxBytes) {
            throw ValidationException::withMessages([
                'files' => 'Each import file must be at most '.number_format($maxBytes / 1024 / 1024, 1).' MB.',
            ]);
        }

        $originalName = $file->getClientOriginalName();
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $allowed = config('mutqin.student_import.allowed_extensions', []);
        if (! is_array($allowed) || ! in_array($extension, $allowed, true)) {
            throw ValidationException::withMessages([
                'files' => 'Unsupported file type .'.$extension.'. Allowed: '.implode(', ', $allowed),
            ]);
        }

        $path = $file->getRealPath();
        if ($path === false) {
            throw ValidationException::withMessages(['files' => 'Upload could not be read.']);
        }

        $mime = $this->detectMime($path);
        $this->assertMimeAllowed($extension, $mime);
        $this->assertNotExecutable($path, $extension);
        $this->scanWithClamAvIfConfigured($path);

        $sha256 = hash_file('sha256', $path);
        if ($sha256 === false) {
            throw ValidationException::withMessages(['files' => 'Upload checksum failed.']);
        }

        return [
            'extension' => $extension,
            'mime' => $mime,
            'sha256' => $sha256,
        ];
    }

    public function maxFilesPerBatch(): int
    {
        return max(1, (int) config('mutqin.student_import.max_files_per_batch', 10));
    }

    private function detectMime(string $path): ?string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo === false) {
            return null;
        }
        $mime = finfo_file($finfo, $path);
        finfo_close($finfo);

        return is_string($mime) ? $mime : null;
    }

    private function assertMimeAllowed(string $extension, ?string $mime): void
    {
        /** @var array<string, list<string>> $map */
        $map = config('mutqin.student_import.mime_map', []);
        $allowedMimes = $map[$extension] ?? null;
        if ($allowedMimes === null || $mime === null) {
            return;
        }

        if (! in_array($mime, $allowedMimes, true)) {
            throw ValidationException::withMessages([
                'files' => "File content type {$mime} does not match .{$extension}.",
            ]);
        }
    }

    private function assertNotExecutable(string $path, string $extension): void
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw ValidationException::withMessages(['files' => 'Upload could not be verified.']);
        }
        $magic = fread($handle, 4);
        fclose($handle);

        if ($magic === "\x7fELF" || $magic === "MZ\x90\x00" || $magic === '#!/') {
            throw ValidationException::withMessages(['files' => 'Executable uploads are not permitted.']);
        }

        $blocked = ['exe', 'bat', 'cmd', 'com', 'scr', 'js', 'jar', 'msi', 'dll', 'app', 'deb', 'rpm'];
        if (in_array($extension, $blocked, true)) {
            throw ValidationException::withMessages(['files' => 'This file type is blocked for security reasons.']);
        }
    }

    private function scanWithClamAvIfConfigured(string $path): void
    {
        $socket = (string) config('mutqin.student_import.clamav_socket', '');
        if ($socket === '') {
            return;
        }

        if (! file_exists($socket)) {
            return;
        }

        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open(['clamdscan', '--fdpass', $path], $descriptorSpec, $pipes);
        if (! is_resource($process)) {
            return;
        }
        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        if (str_contains(strtolower($output), 'found')) {
            throw ValidationException::withMessages(['files' => 'Upload failed malware screening.']);
        }
    }
}