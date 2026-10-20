<?php

namespace App\Http\Middleware;

use App\Support\TeacherFeatures;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Teacher and student management routes are missing unless the flag is on.
 * A 404 does not confirm that the feature exists.
 */
class EnsureTeacherFeaturesEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        TeacherFeatures::abortUnlessEnabled();

        return $next($request);
    }
}
