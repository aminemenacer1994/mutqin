<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\RegisteredUserBroadcastCampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegisteredUserBroadcastController extends Controller
{
    public function preview(Request $request, RegisteredUserBroadcastCampaignService $campaign): JsonResponse
    {
        $this->superAdmin($request);

        $validated = $request->validate([
            'user_ids' => ['nullable', 'array', 'max:100'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);

        $userIds = isset($validated['user_ids']) ? array_values($validated['user_ids']) : null;

        return response()
            ->json($campaign->preview($userIds))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function status(Request $request, RegisteredUserBroadcastCampaignService $campaign): JsonResponse
    {
        $this->superAdmin($request);

        return response()
            ->json([
                'campaign_key' => $campaign->campaignKey(),
                'deliveries' => $campaign->deliveryCounts(),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function send(Request $request, RegisteredUserBroadcastCampaignService $campaign): JsonResponse
    {
        $this->superAdmin($request);

        $validated = $request->validate([
            'confirm_count' => ['nullable', 'integer', 'min:0'],
            'test_email' => ['nullable', 'string', 'max:255'],
            'confirm_send' => ['required', 'accepted'],
            'user_ids' => ['nullable', 'array', 'max:100'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);

        $testEmail = isset($validated['test_email']) ? trim((string) $validated['test_email']) : null;
        if ($testEmail === '') {
            $testEmail = null;
        }

        $userIds = isset($validated['user_ids']) ? array_values($validated['user_ids']) : null;
        $confirmCount = (int) ($validated['confirm_count'] ?? 0);

        $result = $campaign->dispatchSend(
            (int) $request->user()->id,
            $confirmCount,
            $testEmail,
            $userIds,
        );

        return response()->json($result);
    }

    private function superAdmin(Request $request)
    {
        $user = $request->user();
        abort_unless($user && $user->can('manage-registered-user-broadcast-email'), 403);

        return $user;
    }
}
