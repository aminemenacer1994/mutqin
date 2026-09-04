<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminDashboardResource;
use App\Models\AyahNote;
use App\Models\ContactSubmission;
use App\Models\User;
use App\Services\AdminDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class DashboardController extends Controller
{
    public function show(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $user = $this->admin($request);

        $days = (int) $request->query('days', 30);
        if (! in_array($days, [7, 30], true)) {
            $days = 30;
        }

        $fresh = $request->boolean('fresh');

        return (new AdminDashboardResource($dashboard->build($user, $days, $fresh)))
            ->response()
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Vary', 'Cookie');
    }

    public function users(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        $result = $dashboard->users([
            'limit' => (int) $request->query('limit', 20),
            'page' => (int) $request->query('page', 1),
            'per_page' => (int) $request->query('per_page', 20),
            'q' => $request->query('q'),
            'status' => $request->query('status'),
            'activity' => $request->query('activity'),
            'progress' => $request->query('progress'),
            'sessions' => $request->query('sessions'),
            'sort' => $request->query('sort'),
            'dir' => $request->query('dir'),
            'account' => $request->query('account'),
        ]);

        return response()
            ->json($result)
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function usersBulk(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $actor = $this->admin($request);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['update_status', 'delete'])],
            'user_ids' => ['required', 'array', 'min:1', 'max:100'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'subscription_status' => [
                'required_if:action,update_status',
                'nullable',
                'string',
                Rule::in(['none', 'trialing', 'active', 'canceled', 'past_due']),
            ],
        ]);

        return response()->json(
            $dashboard->bulkUsers(
                $actor,
                $validated['user_ids'],
                $validated['action'],
                $validated['subscription_status'] ?? null
            )
        );
    }

    public function userShow(Request $request, int $user, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);
        $model = $this->findUser($user);

        return response()
            ->json($dashboard->userDetail($model))
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function userStore(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', Password::defaults()],
            'locale' => ['nullable', 'string', Rule::in(['en', 'ar', 'fr', 'es', 'tr', 'id', 'ur'])],
            'subscription_status' => ['nullable', 'string', Rule::in(['none', 'trialing', 'active', 'canceled', 'past_due'])],
            'subscription_tier' => ['nullable', 'string', 'max:64'],
        ]);

        return response()->json([
            'user' => $dashboard->createUser($validated),
        ], 201);
    }

    public function userUpdate(Request $request, int $user, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);
        $model = $this->findUser($user);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($model->id)],
            'password' => ['nullable', 'string', Password::defaults()],
            'locale' => ['nullable', 'string', Rule::in(['en', 'ar', 'fr', 'es', 'tr', 'id', 'ur'])],
            'subscription_status' => ['nullable', 'string', Rule::in(['none', 'trialing', 'active', 'canceled', 'past_due'])],
            'subscription_tier' => ['nullable', 'string', 'max:64'],
        ]);

        return response()->json([
            'user' => $dashboard->updateUser($model, $validated),
            'detail' => $dashboard->userDetail($model->fresh()),
        ]);
    }

    public function userDestroy(Request $request, int $user, AdminDashboardService $dashboard): JsonResponse
    {
        $actor = $this->admin($request);
        $dashboard->deleteUser($actor, $this->findUser($user));

        return response()->json(['deleted' => true]);
    }

    public function userRestore(Request $request, int $user, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);
        $dashboard->restoreUser($this->findUser($user));

        return response()->json(['restored' => true]);
    }

    public function noteDestroy(Request $request, AyahNote $note, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);
        $dashboard->deleteNote($note);

        return response()->json(['deleted' => true]);
    }

    public function activity(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json([
                'activity' => $dashboard->activityLog((int) $request->query('limit', 100)),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function sessions(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json([
                'sessions' => $dashboard->sessions((int) $request->query('limit', 100)),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function aiChecks(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json([
                'attempts' => $dashboard->aiChecks((int) $request->query('limit', 100)),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function notes(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json([
                'notes' => $dashboard->notes((int) $request->query('limit', 100)),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function contacts(Request $request, AdminDashboardService $dashboard): JsonResponse
    {
        $this->admin($request);

        return response()
            ->json([
                'contacts' => $dashboard->contacts(
                    (int) $request->query('limit', 100),
                    (string) $request->query('status', 'pending')
                ),
            ])
            ->header('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    }

    public function resolveContact(
        Request $request,
        ContactSubmission $contactMessage,
        AdminDashboardService $dashboard
    ): JsonResponse {
        $this->admin($request);

        return response()->json([
            'contact' => $dashboard->resolveContact($contactMessage),
        ]);
    }

    public function destroyContact(
        Request $request,
        ContactSubmission $contactMessage,
        AdminDashboardService $dashboard
    ): JsonResponse {
        $this->admin($request);
        $dashboard->deleteContact($contactMessage);

        return response()->json(['deleted' => true]);
    }

    private function admin(Request $request): \App\Models\User
    {
        $user = $request->user();
        abort_unless($user !== null && $user->can('access-admin'), 403);

        return $user;
    }

    private function findUser(int $id): User
    {
        return User::query()->withTrashed()->findOrFail($id);
    }
}
