<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminDashboardService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DashboardController extends Controller
{
    public function index(Request $request, AdminDashboardService $dashboard): Response
    {
        $user = $request->user();
        abort_unless($user !== null && $user->can('access-admin'), 403);

        $data = $dashboard->build($user, 30);

        return response()
            ->view('admin.dashboard', [
                'dashboard' => $data,
                'dashboardAuth' => [
                    'check' => true,
                    'id' => (int) $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'first_name' => $data['welcome']['first_name'] ?? null,
                    'locale' => $user->locale ?? 'en',
                    'csrf_token' => csrf_token(),
                    'admin_api_url' => url('/api/admin/dashboard'),
                    'contact_inbox_url' => route('admin.contact-messages.index'),
                    'login_url' => route('login'),
                ],
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}
