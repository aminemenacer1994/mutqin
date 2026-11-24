<?php

namespace App\Http\Controllers\Api\Organisations;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Http\Controllers\Controller;
use App\Models\Organisation;
use App\Models\OrganisationMembership;
use App\Models\User;
use App\Services\Organisations\OrganisationMembershipService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrganisationMembershipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $rows = OrganisationMembership::query()
            ->with('organisation:id,name,type')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (OrganisationMembership $row) => [
                'id' => $row->id,
                'status' => $row->status?->value ?? $row->status,
                'role' => $row->membership_role?->value ?? $row->membership_role,
                'organisation' => $row->organisation?->only(['id', 'name', 'type']),
                'active' => (int) $user->organisation_id === (int) $row->organisation_id,
            ])
            ->values()
            ->all();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request, OrganisationMembershipService $memberships): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'organisation_type' => ['required', 'string', Rule::in(OrganisationType::values())],
            'organisation_name' => ['required', 'string', 'max:120'],
            'role' => ['nullable', 'string', Rule::in([MembershipRole::Teacher->value, MembershipRole::Student->value])],
        ]);

        $role = MembershipRole::tryFrom((string) ($data['role'] ?? ''))
            ?? ($user->isTeacher() ? MembershipRole::Teacher : MembershipRole::Student);

        $result = $memberships->joinOrCreate(
            $user,
            OrganisationType::from($data['organisation_type']),
            (string) $data['organisation_name'],
            $role,
        );

        return response()->json([
            'organisation' => $result['organisation']->only(['id', 'name', 'type']),
            'membership' => [
                'id' => $result['membership']->id,
                'status' => $result['membership']->status?->value ?? $result['membership']->status,
            ],
            'created' => $result['created'],
        ], 201);
    }

    public function switchActive(Request $request, Organisation $organisation, OrganisationMembershipService $memberships): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $memberships->switchActive($user, $organisation);

        return response()->json([
            'organisation_id' => $user->fresh()->organisation_id,
        ]);
    }

    public function approve(Request $request, OrganisationMembership $membership, OrganisationMembershipService $memberships): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $row = $memberships->approve($user, $membership);

        return response()->json([
            'membership' => [
                'id' => $row->id,
                'status' => $row->status?->value ?? $row->status,
            ],
        ]);
    }

    public function reject(Request $request, OrganisationMembership $membership, OrganisationMembershipService $memberships): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        $row = $memberships->reject($user, $membership);

        return response()->json([
            'membership' => [
                'id' => $row->id,
                'status' => $row->status?->value ?? $row->status,
            ],
        ]);
    }

    public function pending(Request $request): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher() && $user->organisation_id, 403);

        $rows = OrganisationMembership::query()
            ->with('user:id,name,email')
            ->where('organisation_id', $user->organisation_id)
            ->where('status', MembershipStatus::Pending->value)
            ->orderBy('id')
            ->get()
            ->map(fn (OrganisationMembership $row) => [
                'id' => $row->id,
                'role' => $row->membership_role?->value ?? $row->membership_role,
                'user' => $row->user?->only(['id', 'name', 'email']),
            ])
            ->values()
            ->all();

        return response()->json(['data' => $rows]);
    }
}
