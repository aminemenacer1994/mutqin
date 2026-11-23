<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ParentInvitation;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Parent\ParentInvitationService;
use App\Support\ParentFeatures;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherGuardianController extends Controller
{
    public function index(Request $request, User $student, ParentInvitationService $invitations): JsonResponse
    {
        $this->assertEnabled();

        return response()->json($invitations->listForTeacher($this->teacher($request), $student));
    }

    public function store(Request $request, User $student, ParentInvitationService $invitations): JsonResponse
    {
        $this->assertEnabled();
        $data = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:64'],
        ]);

        $created = $invitations->invite(
            $this->teacher($request),
            $student,
            $data['email'],
            $data['relationship'] ?? null,
            $request,
        );

        return response()->json([
            'invitation' => $invitations->presentInvitation($created['invitation']),
            'invite_url' => $created['invite_url'],
        ], 201);
    }

    public function resend(Request $request, ParentInvitation $invitation, ParentInvitationService $invitations): JsonResponse
    {
        $this->assertEnabled();
        $created = $invitations->resend($this->teacher($request), $invitation, $request);

        return response()->json([
            'invitation' => $invitations->presentInvitation($created['invitation']),
            'invite_url' => $created['invite_url'],
        ]);
    }

    public function revoke(Request $request, ParentInvitation $invitation, ParentInvitationService $invitations): JsonResponse
    {
        $this->assertEnabled();
        $updated = $invitations->revoke($this->teacher($request), $invitation, $request);

        return response()->json([
            'invitation' => $invitations->presentInvitation($updated),
        ]);
    }

    public function revokeLink(Request $request, User $student, ParentStudentLink $link, ParentInvitationService $invitations): JsonResponse
    {
        $this->assertEnabled();
        $invitations->revokeLink($this->teacher($request), $student, $link, $request);

        return response()->json(['status' => 'revoked']);
    }

    private function assertEnabled(): void
    {
        TeacherFeatures::abortUnlessEnabled();
        ParentFeatures::abortUnlessEnabled();
    }

    private function teacher(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->isTeacher(), 403);

        return $user;
    }
}
