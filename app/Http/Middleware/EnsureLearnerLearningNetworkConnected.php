<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Learning\LearnerConnectionGate;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Learner APIs that require an approved or pending class / institution link.
 */
class EnsureLearnerLearningNetworkConnected
{
    public function __construct(private readonly LearnerConnectionGate $connections) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $this->connections->abortUnlessConnected($user);

        return $next($request);
    }
}