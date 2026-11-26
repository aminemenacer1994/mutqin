<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Reference PDFs for allowlisted preview reviewers only.
 */
class LandingPreviewReferenceController extends Controller
{
    private const FILES = [
        'business-model' => 'Mutqin_2.0_Business_Model.pdf',
        'business-plan' => 'Mutqin_2.0_Business_Plan.pdf',
    ];

    public function __invoke(string $file): BinaryFileResponse
    {
        $basename = self::FILES[$file] ?? null;
        if ($basename === null) {
            abort(404);
        }

        $path = base_path('docs/mutqin-2.0/reference/'.$basename);
        if (! File::isFile($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$basename.'"',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }
}
