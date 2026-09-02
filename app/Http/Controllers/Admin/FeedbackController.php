<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class FeedbackController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null && $user->can('access-admin'), 403);

        return response()
            ->view('admin.feedback.index', [
                'feedbackAuth' => [
                    'check' => true,
                    'id' => (int) $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'locale' => $user->locale ?? 'en',
                    'csrf_token' => csrf_token(),
                    'feedback_api_url' => url('/api/admin/feedback'),
                    'dashboard_url' => route('admin.dashboard'),
                    'contact_inbox_url' => route('admin.contact-messages.index'),
                ],
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }
}
