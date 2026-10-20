<?php

namespace App\Http\Middleware;

use App\Support\TeacherFeatures;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Learner-facing teacher tasks on the practice dashboard.
 */
class EnsureLearnerTeacherSectionEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        TeacherFeatures::abortUnlessLearnerSectionEnabled();

        return $next($request);
    }
}
