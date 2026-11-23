<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Support\ParentFeatures;
use Illuminate\Http\Request;
use Illuminate\View\View;

class InvitationController extends Controller
{
    public function show(Request $request, string $token): View
    {
        ParentFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user !== null, 403);

        return view('parent.invitation', [
            'auth' => [
                'token' => $token,
                'email' => $user->email,
                'csrf_token' => csrf_token(),
                'api_url' => url('/api/parent'),
                'parent_url' => route('parent.dashboard'),
                'parent_features_enabled' => true,
            ],
        ]);
    }
}
