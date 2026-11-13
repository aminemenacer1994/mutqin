<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function show(Request $request, ReferralService $referrals): JsonResponse
    {
        $stats = $referrals->statsFor($request->user());

        return response()->json([
            'code' => $stats['code'],
            'url' => $stats['url'],
            'stats' => [
                'link_visits' => $stats['link_visits'],
                'signups' => $stats['signups'],
                'activations' => $stats['activations'],
                'conversion_rate' => $stats['conversion_rate'],
            ],
            'reward' => $stats['reward'],
            'pending_thanks' => $stats['pending_thanks'],
        ]);
    }

    public function acknowledge(Request $request, ReferralService $referrals): JsonResponse
    {
        $count = $referrals->acknowledge($request->user());

        return response()->json([
            'acknowledged' => $count,
            'pending_thanks' => 0,
        ]);
    }
}
