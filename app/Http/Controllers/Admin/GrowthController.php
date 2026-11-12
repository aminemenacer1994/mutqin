<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class GrowthController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null && $user->can('access-admin'), 403);

        return response()
            ->view('admin.growth', [
                'growthAuth' => [
                    'check' => true,
                    'name' => $user->name,
                    'csrf_token' => csrf_token(),
                    'api_url' => url('/api/admin/growth'),
                    'dashboard_url' => route('admin.dashboard'),
                ],
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}
