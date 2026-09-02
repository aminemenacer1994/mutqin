<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Support\Monitoring\MonitoringAccess;
use App\Support\MutqinLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Sentry\Severity;
use Sentry\State\Scope;

class AlertTestController extends Controller
{
    /**
     * Safe staging-only alert probe. Emits one structured log + optional Sentry
     * message tagged probe=true. Never available in production.
     */
    public function __invoke(Request $request): JsonResponse
    {
        if (! MonitoringAccess::alertProbeAllowed($request)) {
            abort(404);
        }

        $context = [
            'feature' => 'monitoring',
            'probe' => true,
            'kind' => 'alert_test',
            'environment' => app()->environment(),
        ];

        MutqinLog::warning('monitoring.alert_test', $context);

        $sentryDelivered = false;
        $dsn = trim((string) config('sentry.dsn', ''));
        if ($dsn !== '' && app()->bound('sentry') && function_exists('\\Sentry\\captureMessage')) {
            \Sentry\withScope(function (Scope $scope) use ($context): void {
                $scope->setTag('feature', 'monitoring');
                $scope->setTag('probe', 'true');
                $scope->setContext('monitoring', $context);
                \Sentry\captureMessage('Mutqin monitoring alert test', Severity::warning());
            });
            $sentryDelivered = true;
        }

        return response()->json([
            'status' => 'ok',
            'logged' => true,
            'sentry' => $sentryDelivered,
            'message' => 'Alert test emitted. Check staging logs / Sentry for monitoring.alert_test.',
        ]);
    }
}
