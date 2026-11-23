<?php

namespace App\Http\Controllers\Api\Parent;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Parent\ParentInvitationService;
use App\Services\Parent\ParentLinkCodeService;
use App\Support\ParentFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentInvitationController extends Controller
{
    public function accept(Request $request, ParentInvitationService $invitations): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();
        $data = $request->validate([
            'token' => ['required', 'string', 'max:80'],
        ]);

        return response()->json($invitations->accept($this->user($request), $data['token'], $request));
    }

    public function reject(Request $request, ParentInvitationService $invitations): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();
        $data = $request->validate([
            'token' => ['required', 'string', 'max:80'],
        ]);
        $invitations->reject($this->user($request), $data['token'], $request);

        return response()->json(['status' => 'rejected']);
    }

    public function issueCode(Request $request, ParentLinkCodeService $codes): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();

        return response()->json($codes->issue($this->user($request)), 201);
    }

    public function redeemCode(Request $request, ParentLinkCodeService $codes): JsonResponse
    {
        ParentFeatures::abortUnlessEnabled();
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
        ]);

        return response()->json($codes->redeem($this->user($request), $data['code'], $request));
    }

    private function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);

        return $user;
    }
}
