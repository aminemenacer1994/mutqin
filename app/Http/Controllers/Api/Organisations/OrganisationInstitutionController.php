<?php

namespace App\Http\Controllers\Api\Organisations;

use App\Http\Controllers\Controller;
use App\Models\OrganisationMembership;
use App\Models\OrganisationTeacherInvitation;
use App\Models\User;
use App\Services\Organisations\OrganisationInstitutionAccess;
use App\Services\Organisations\OrganisationInstitutionService;
use App\Services\Organisations\OrganisationTeacherInvitationService;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganisationInstitutionController extends Controller
{
    public function show(Request $request, OrganisationInstitutionService $institution): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json($institution->dashboard($user));
    }

    public function update(Request $request, OrganisationInstitutionService $institution, OrganisationInstitutionAccess $access): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        $organisation = $access->activeOrganisation($user);
        abort_unless($organisation !== null, 404);

        $data = $request->validate([
            'name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'profile_summary' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $updated = $institution->updateProfile(
            $user,
            $organisation,
            array_key_exists('name', $data) ? (string) ($data['name'] ?? '') : null,
            array_key_exists('profile_summary', $data) ? (string) ($data['profile_summary'] ?? '') : null,
            $request,
        );

        return response()->json([
            'organisation' => $updated->only(['id', 'name', 'type', 'profile_summary']),
        ]);
    }

    public function revokeStaff(
        Request $request,
        OrganisationMembership $membership,
        OrganisationInstitutionService $institution,
        OrganisationInstitutionAccess $access,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);
        abort_unless(
            $access->activeOrganisation($user) !== null
            && (int) $access->activeOrganisation($user)?->id === (int) $membership->organisation_id,
            403,
        );

        $row = $institution->revokeStaff($user, $membership, $request);

        return response()->json([
            'membership' => [
                'id' => $row->id,
                'status' => $row->status?->value ?? $row->status,
            ],
        ]);
    }

    public function setStaffAdmin(
        Request $request,
        OrganisationMembership $membership,
        OrganisationInstitutionService $institution,
        OrganisationInstitutionAccess $access,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);
        abort_unless(
            $access->activeOrganisation($user) !== null
            && (int) $access->activeOrganisation($user)?->id === (int) $membership->organisation_id,
            403,
        );

        $data = $request->validate([
            'admin' => ['required', 'boolean'],
        ]);

        $row = $institution->setInstitutionAdmin($user, $membership, (bool) $data['admin'], $request);

        return response()->json([
            'membership' => [
                'id' => $row->id,
                'is_institution_admin' => (bool) $row->is_institution_admin,
            ],
        ]);
    }

    public function storeTeacherInvitation(
        Request $request,
        OrganisationTeacherInvitationService $invitations,
        OrganisationInstitutionAccess $access,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        $organisation = $access->activeOrganisation($user);
        abort_unless($organisation !== null, 404);

        $data = $request->validate([
            'email' => ['required', 'string', 'max:255'],
        ]);

        $result = $invitations->invite($user, $organisation, (string) $data['email'], $request);

        return response()->json([
            'invitation' => [
                'id' => $result['invitation']->id,
                'email' => $result['invitation']->invited_email,
                'status' => $result['invitation']->status?->value ?? $result['invitation']->status,
                'expires_at' => $result['invitation']->expires_at?->toIso8601String(),
            ],
            'invite_url' => $result['invite_url'],
        ], 201);
    }

    public function revokeTeacherInvitation(
        Request $request,
        OrganisationTeacherInvitation $invitation,
        OrganisationTeacherInvitationService $invitations,
        OrganisationInstitutionAccess $access,
    ): JsonResponse {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);
        $organisation = $access->activeOrganisation($user);
        abort_unless($organisation !== null && (int) $organisation->id === (int) $invitation->organisation_id, 403);

        $row = $invitations->revoke($user, $invitation, $request);

        return response()->json([
            'invitation' => [
                'id' => $row->id,
                'status' => $row->status?->value ?? $row->status,
            ],
        ]);
    }

    public function acceptTeacherInvitation(Request $request, OrganisationTeacherInvitationService $invitations): JsonResponse
    {
        TeacherFeatures::abortUnlessEnabled();
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'token' => ['required', 'string', 'max:128'],
        ]);

        $result = $invitations->accept($user, (string) $data['token'], $request);

        return response()->json([
            'organisation' => $result['organisation']->only(['id', 'name', 'type']),
            'membership' => [
                'id' => $result['membership']->id,
                'status' => $result['membership']->status?->value ?? $result['membership']->status,
            ],
        ]);
    }
}