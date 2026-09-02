<?php

namespace App\Http\Controllers\Internal;

use App\Exceptions\ErrorTrackingProbeException;
use App\Http\Controllers\Controller;
use App\Support\ErrorReporting;
use Illuminate\Http\Request;

class ErrorTestController extends Controller
{
    public function __invoke(Request $request): never
    {
        if (! ErrorReporting::probeAllowed($request)) {
            abort(404);
        }

        throw new ErrorTrackingProbeException;
    }
}
