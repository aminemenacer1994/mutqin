<?php

namespace App\Http\Controllers\Onboarding;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\OrganisationType;
use App\Enums\ParentLinkStatus;
use App\Http\Controllers\Controller;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\OrganisationMembership;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Organisations\GroupMembershipService;
use App\Services\Organisations\LearningGroupInvitationService;
use App\Services\Organisations\OrganisationMembershipService;
use App\Services\Parent\ParentInvitationService;
use App\Services\Parent\ParentLinkCodeService;
use App\Support\AuthRedirect;
use App\Support\ParentFeatures;
use App\Support\Registration\OrganisationName;
use App\Support\Registration\OrganisationRegistrationCatalog;
use App\Support\TeacherFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class ConnectionOnboardingController extends Controller
{
    public function show(Request $request): View
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless(TeacherFeatures::enabled() || ParentFeatures::enabled(), 404);

        return view('onboarding.connections', [
            'auth' => [
                'name' => $user->name,
                'email' => $user->email,
                'account_role' => $user->account_role?->value,
                'organisation' => $user->organisation?->only(['id', 'name', 'type']),
                'preferred_platform' => $user->preferred_platform?->value,
                'connection_onboarding' => $user->connectionOnboardingState(),
                'teacher_features_enabled' => TeacherFeatures::enabled(),
                'parent_features_enabled' => ParentFeatures::enabled(),
                'organisation_catalog' => OrganisationRegistrationCatalog::options(),
                'api_url' => url('/api/onboarding/connections'),
                'home_url' => AuthRedirect::to($user),
                'csrf_token' => csrf_token(),
                'class_invite' => (string) $request->query('class_invite', ''),
            ],
        ]);
    }

    public function state(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json($this->payload($user));
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'step' => ['nullable', 'string', 'max:64'],
            'skip' => ['sometimes', 'boolean'],
            'finish' => ['sometimes', 'boolean'],
            'organisation_type' => ['nullable', 'string', Rule::in(OrganisationType::values())],
            'organisation_name' => ['nullable', 'string', 'max:120'],
            'group_name' => ['nullable', 'string', 'max:120'],
            'group_id' => ['nullable', 'integer'],
            'invite_code' => ['nullable', 'string', 'max:2048'],
            'create_class_invite' => ['sometimes', 'boolean'],
            'parent_link_code' => ['nullable', 'string', 'max:32'],
            'parent_invite_token' => ['nullable', 'string', 'max:64'],
            'issue_parent_code' => ['sometimes', 'boolean'],
            'membership_id' => ['nullable', 'integer'],
        ]);

        $extras = [];

        if (isset($data['name']) && trim($data['name']) !== '') {
            $user->forceFill(['name' => trim($data['name'])])->save();
        }

        $state = $user->connectionOnboardingState();
        $step = isset($data['step']) ? (string) $data['step'] : null;

        if (! empty($data['organisation_type']) && ! empty($data['organisation_name']) && TeacherFeatures::enabled()) {
            $role = $user->isTeacher() ? MembershipRole::Teacher : MembershipRole::Student;
            $result = app(OrganisationMembershipService::class)->joinOrCreate(
                $user->refresh(),
                OrganisationType::from($data['organisation_type']),
                (string) $data['organisation_name'],
                $role,
            );
            $extras['institution_result'] = [
                'status' => $result['membership']->status?->value ?? (string) $result['membership']->status,
                'created' => $result['created'],
                'organisation' => $result['organisation']->only(['id', 'name', 'type']),
            ];
            $step = $step ?: 'institution';
            $user = $user->refresh();
        }

        if (! empty($data['group_name']) && $user->isTeacher() && $user->organisation_id) {
            $group = LearningGroup::query()->firstOrCreate(
                [
                    'organisation_id' => $user->organisation_id,
                    'name_canonical' => OrganisationName::canonical($data['group_name']),
                ],
                [
                    'name' => OrganisationName::display($data['group_name']),
                ],
            );
            app(GroupMembershipService::class)->joinAsTeacher($user, $group);

            $issued = app(LearningGroupInvitationService::class)->issue($user, $group);
            $extras['class_invite'] = [
                'code' => $issued['code'],
                'invite_url' => $issued['invite_url'],
                'group' => $group->only(['id', 'name']),
            ];
            $step = $step ?: 'class';
        }

        if (! empty($data['create_class_invite']) && ! empty($data['group_id']) && $user->isTeacher()) {
            $group = LearningGroup::query()->findOrFail((int) $data['group_id']);
            $issued = app(LearningGroupInvitationService::class)->issue($user, $group);
            $extras['class_invite'] = [
                'code' => $issued['code'],
                'invite_url' => $issued['invite_url'],
                'group' => $group->only(['id', 'name']),
            ];
            $step = $step ?: 'invite';
        }

        if (! empty($data['invite_code']) && TeacherFeatures::enabled()) {
            $membership = app(LearningGroupInvitationService::class)->redeem(
                $user->refresh(),
                (string) $data['invite_code'],
            );
            $extras['joined_membership_id'] = $membership->id;
            $step = $step ?: 'class';
        }

        if (! empty($data['membership_id']) && TeacherFeatures::enabled()) {
            $membership = GroupMembership::query()->findOrFail((int) $data['membership_id']);
            app(GroupMembershipService::class)->grantAnalyticsConsent($user, $membership);
            $step = $step ?: 'consent';
        }

        if (ParentFeatures::enabled()) {
            if (! empty($data['parent_link_code']) && ($user->isStudent() || $user->account_role === null)) {
                app(ParentLinkCodeService::class)->redeem(
                    $user->refresh(),
                    (string) $data['parent_link_code'],
                    $request,
                );
                $step = $step ?: 'parent';
            }

            if (! empty($data['parent_invite_token']) && $user->isParent()) {
                app(ParentInvitationService::class)->accept(
                    $user->refresh(),
                    (string) $data['parent_invite_token'],
                    $request,
                );
                $step = $step ?: 'parent';
            }

            if (! empty($data['issue_parent_code']) && $user->isParent()) {
                $extras['parent_link_code'] = app(ParentLinkCodeService::class)->issue($user->refresh());
                $step = $step ?: 'parent';
            }
        }

        if ($step !== null && $step !== '') {
            if (! empty($data['skip'])) {
                $state['skipped'] = array_values(array_unique([...$state['skipped'], $step]));
            } else {
                $state['completed'] = array_values(array_unique([...$state['completed'], $step]));
            }
        }

        if (! empty($data['finish'])) {
            $state['finished'] = true;
        }

        $state['role'] = $user->fresh()->account_role?->value;
        $user->storeConnectionOnboarding($state);

        return response()->json(array_merge($this->payload($user->refresh()), $extras));
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        $orgMemberships = OrganisationMembership::query()
            ->with('organisation:id,name,type')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        $activeOrgMembership = $orgMemberships->first(
            fn (OrganisationMembership $row) => (int) $row->organisation_id === (int) $user->organisation_id
                && $row->status === MembershipStatus::Approved,
        );

        $pendingOrgMembership = $orgMemberships->first(
            fn (OrganisationMembership $row) => $row->status === MembershipStatus::Pending,
        );

        $institution = null;
        if ($activeOrgMembership?->organisation) {
            $institution = [
                'status' => MembershipStatus::Approved->value,
                'organisation' => $activeOrgMembership->organisation->only(['id', 'name', 'type']),
            ];
        } elseif ($pendingOrgMembership?->organisation) {
            $institution = [
                'status' => MembershipStatus::Pending->value,
                'organisation' => $pendingOrgMembership->organisation->only(['id', 'name', 'type']),
            ];
        }

        $groups = GroupMembership::query()
            ->with('learningGroup:id,name,organisation_id')
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (GroupMembership $row) => [
                'id' => $row->id,
                'status' => $row->status?->value ?? $row->status,
                'role' => $row->membership_role?->value ?? $row->membership_role,
                'consent' => $row->analytics_consent_status?->value ?? $row->analytics_consent_status,
                'group' => $row->learningGroup?->only(['id', 'name', 'organisation_id']),
            ])
            ->values()
            ->all();

        $taughtGroups = [];
        if ($user->isTeacher() && $user->organisation_id) {
            $taughtGroups = GroupMembership::query()
                ->with('learningGroup:id,name,organisation_id')
                ->where('user_id', $user->id)
                ->where('membership_role', MembershipRole::Teacher->value)
                ->where('status', MembershipStatus::Approved->value)
                ->whereHas('learningGroup', fn ($query) => $query->where('organisation_id', $user->organisation_id))
                ->orderByDesc('id')
                ->get()
                ->map(fn (GroupMembership $row) => [
                    'id' => $row->learning_group_id,
                    'name' => $row->learningGroup?->name,
                ])
                ->filter(fn (array $row) => $row['name'] !== null)
                ->values()
                ->all();
        }

        $guardians = ParentStudentLink::query()
            ->with('parent:id,name')
            ->where('student_user_id', $user->id)
            ->whereIn('status', [
                ParentLinkStatus::Pending->value,
                ParentLinkStatus::Approved->value,
            ])
            ->orderByDesc('id')
            ->get()
            ->map(fn (ParentStudentLink $link) => [
                'id' => $link->id,
                'status' => $link->status?->value ?? $link->status,
                'relationship' => $link->relationship,
                'parent_name' => $link->parent?->name,
            ])
            ->values()
            ->all();

        $children = ParentStudentLink::query()
            ->with('student:id,name')
            ->where('parent_user_id', $user->id)
            ->whereIn('status', [
                ParentLinkStatus::Pending->value,
                ParentLinkStatus::Approved->value,
            ])
            ->orderByDesc('id')
            ->get()
            ->map(fn (ParentStudentLink $link) => [
                'id' => $link->id,
                'status' => $link->status?->value ?? $link->status,
                'child_name' => $link->student?->name,
            ])
            ->values()
            ->all();

        return [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'account_role' => $user->account_role?->value,
                'organisation_id' => $user->organisation_id,
                'is_teacher' => $user->isTeacher(),
                'is_student' => $user->isStudent(),
                'is_parent' => $user->isParent(),
            ],
            'onboarding' => $user->connectionOnboardingState(),
            'institution' => $institution,
            'organisation_memberships' => $orgMemberships
                ->map(fn (OrganisationMembership $row) => [
                    'id' => $row->id,
                    'status' => $row->status?->value ?? $row->status,
                    'role' => $row->membership_role?->value ?? $row->membership_role,
                    'organisation' => $row->organisation?->only(['id', 'name', 'type']),
                    'active' => (int) $user->organisation_id === (int) $row->organisation_id,
                ])
                ->values()
                ->all(),
            'group_memberships' => $groups,
            'taught_groups' => $taughtGroups,
            'guardians' => $guardians,
            'children' => $children,
            'home_url' => AuthRedirect::to($user),
            'organisation_types' => OrganisationType::values(),
            'features' => [
                'teacher' => TeacherFeatures::enabled(),
                'parent' => ParentFeatures::enabled(),
            ],
        ];
    }
}
