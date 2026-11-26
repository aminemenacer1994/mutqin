<?php

namespace App\Http\Controllers;

use App\Support\LandingPreviewAssets;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LandingPreviewAssetController extends Controller
{
    public function __invoke(string $asset): BinaryFileResponse
    {
        $basename = pathinfo($asset, PATHINFO_FILENAME);

        return LandingPreviewAssets::stream($basename);
    }
}
