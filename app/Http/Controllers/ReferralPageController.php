<?php

namespace App\Http\Controllers;

use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReferralPageController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'verified']);
    }

    public function index(Request $request, ReferralService $referrals): Response
    {
        $user = $request->user();
        $stats = $referrals->statsFor($user);

        return response()
            ->view('referrals', [
                'referral' => [
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
                    'api_url' => url('/api/referrals'),
                    'acknowledge_url' => url('/api/referrals/acknowledge'),
                ],
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}
