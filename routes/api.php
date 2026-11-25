<?php

use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\FeedbackController as AdminFeedbackController;
use App\Http\Controllers\Api\Admin\GrowthController as AdminGrowthController;
use App\Http\Controllers\Api\Admin\RegisteredUserBroadcastController as AdminRegisteredUserBroadcastController;
use App\Http\Controllers\Api\Admin\WaitingListController as AdminWaitingListController;
use App\Http\Controllers\Api\ClientErrorController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\Learning\AchievementController;
use App\Http\Controllers\Api\Learning\AiReciteAttemptController;
use App\Http\Controllers\Api\Learning\AnalyticsController;
use App\Http\Controllers\Api\Learning\AyahNoteController;
use App\Http\Controllers\Api\Learning\ContinueController;
use App\Http\Controllers\Api\Learning\HifzPlanController;
use App\Http\Controllers\Api\Learning\LearnerCircleController;
use App\Http\Controllers\Api\Learning\LearnerClassInviteController;
use App\Http\Controllers\Api\Learning\LearnerGuardianController;
use App\Http\Controllers\Api\Learning\LearnerSupportController;
use App\Http\Controllers\Api\Learning\MigrateLocalStorageController;
use App\Http\Controllers\Api\Learning\MutashabihatController;
use App\Http\Controllers\Api\Learning\ProgressController;
use App\Http\Controllers\Api\Learning\RecommendationController;
use App\Http\Controllers\Api\Learning\RevisionReminderController;
use App\Http\Controllers\Api\Learning\SessionController;
use App\Http\Controllers\Api\Learning\StateSyncController;
use App\Http\Controllers\Api\Memorisation\MemorisationDetectionController;
use App\Http\Controllers\Api\Memorisation\MemorisationHistoryController;
use App\Http\Controllers\Api\Organisations\OrganisationInstitutionController;
use App\Http\Controllers\Api\Organisations\OrganisationMembershipController;
use App\Http\Controllers\Api\Parent\ParentAssistantController;
use App\Http\Controllers\Api\Parent\ParentChildController;
use App\Http\Controllers\Api\Parent\ParentDashboardController;
use App\Http\Controllers\Api\Parent\ParentInvitationController;
use App\Http\Controllers\Api\Parent\ParentMessageController;
use App\Http\Controllers\Api\Parent\ParentReportController;
use App\Http\Controllers\Api\ProductEventController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\Teacher\TeacherClassInviteController;
use App\Http\Controllers\Api\Teacher\TeacherDashboardController;
use App\Http\Controllers\Api\Teacher\TeacherGuardianController;
use App\Http\Controllers\Api\Teacher\TeacherMembershipTransferController;
use App\Http\Controllers\Api\Teacher\TeacherRecitationPlaybackController;
use App\Http\Controllers\AskMutqinCommandController;
use App\Http\Controllers\Auth\RegistrationOrganisationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ContactSubmissionController;
use App\Http\Controllers\Onboarding\ConnectionOnboardingController;
use App\Http\Controllers\ProfileController;
use App\Http\Middleware\ForwardMarketingClientErrors;
use Illuminate\Support\Facades\Route;

Route::post('/product-events', [ProductEventController::class, 'store'])
    ->middleware('throttle:60,1,api-product-events')
    ->name('api.product-events.store');

Route::post('/client-errors', [ClientErrorController::class, 'store'])
    ->middleware([ForwardMarketingClientErrors::class, 'throttle:20,1,api-client-errors'])
    ->name('api.client-errors.store');

Route::post('/stripe/webhook', [BillingController::class, 'webhook'])->name('stripe.webhook');
Route::post('/contact', [ContactSubmissionController::class, 'store'])
    ->middleware('throttle:5,1,api-contact')
    ->name('api.contact.store');

Route::middleware('throttle:120,1,api-public-catalog')->group(function () {
    Route::get('/registration/organisations', [RegistrationOrganisationController::class, 'index'])
        ->middleware('guest')
        ->name('api.registration.organisations');
    Route::get('/mutashabihat/catalog', [MutashabihatController::class, 'catalog'])
        ->name('api.mutashabihat.catalog');
    Route::get('/mutashabihat/for-ayah', [MutashabihatController::class, 'forAyah'])
        ->name('api.mutashabihat.for-ayah');
});

// Backend-driven learning persistence (Sanctum SPA cookie auth, user scoped).
Route::middleware('auth:sanctum')->group(function () {
    Route::middleware('can:access-admin')->group(function () {
        Route::get('/admin/dashboard', [AdminDashboardController::class, 'show'])->name('api.admin.dashboard.show');
        Route::get('/admin/growth', [AdminGrowthController::class, 'show'])->name('api.admin.growth.show');
        Route::get('/admin/users', [AdminDashboardController::class, 'users'])->name('api.admin.users');
        Route::post('/admin/users', [AdminDashboardController::class, 'userStore'])->name('api.admin.users.store');
        Route::post('/admin/users/bulk', [AdminDashboardController::class, 'usersBulk'])->name('api.admin.users.bulk');
        Route::get('/admin/users/{user}', [AdminDashboardController::class, 'userShow'])->name('api.admin.users.show');
        Route::patch('/admin/users/{user}', [AdminDashboardController::class, 'userUpdate'])->name('api.admin.users.update');
        Route::delete('/admin/users/{user}', [AdminDashboardController::class, 'userDestroy'])->name('api.admin.users.destroy');
        Route::post('/admin/users/{user}/restore', [AdminDashboardController::class, 'userRestore'])->name('api.admin.users.restore');
        Route::delete('/admin/users/{user}/force', [AdminDashboardController::class, 'userForceDestroy'])->name('api.admin.users.force-destroy');
        Route::get('/admin/activity', [AdminDashboardController::class, 'activity'])->name('api.admin.activity');
        Route::get('/admin/sessions', [AdminDashboardController::class, 'sessions'])->name('api.admin.sessions');
        Route::get('/admin/ai-checks', [AdminDashboardController::class, 'aiChecks'])->name('api.admin.ai-checks');
        Route::get('/admin/notes', [AdminDashboardController::class, 'notes'])->name('api.admin.notes');
        Route::delete('/admin/notes/{note}', [AdminDashboardController::class, 'noteDestroy'])->name('api.admin.notes.destroy');
        Route::get('/admin/contacts', [AdminDashboardController::class, 'contacts'])->name('api.admin.contacts');
        Route::patch('/admin/contacts/{contactMessage}/resolve', [AdminDashboardController::class, 'resolveContact'])
            ->name('api.admin.contacts.resolve');
        Route::delete('/admin/contacts/{contactMessage}', [AdminDashboardController::class, 'destroyContact'])
            ->name('api.admin.contacts.destroy');
        Route::get('/admin/feedback', [AdminFeedbackController::class, 'index'])->name('api.admin.feedback.index');
        Route::get('/admin/feedback/metrics', [AdminFeedbackController::class, 'metrics'])->name('api.admin.feedback.metrics');
        Route::get('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'show'])->name('api.admin.feedback.show');
        Route::patch('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'update'])->name('api.admin.feedback.update');
        Route::delete('/admin/feedback/{feedback}', [AdminFeedbackController::class, 'destroy'])->name('api.admin.feedback.destroy');
        Route::get('/admin/feedback/{feedback}/screenshot', [AdminFeedbackController::class, 'screenshot'])->name('api.admin.feedback.screenshot');
        Route::get('/admin/waiting-list', [AdminWaitingListController::class, 'index'])->name('api.admin.waiting-list.index');
        Route::post('/admin/waiting-list/restore-archived', [AdminWaitingListController::class, 'restoreArchived'])
            ->name('api.admin.waiting-list.restore-archived');
        Route::get('/admin/waiting-list/export', [AdminWaitingListController::class, 'export'])->name('api.admin.waiting-list.export');
        Route::get('/admin/waiting-list/analytics', [AdminWaitingListController::class, 'analytics'])->name('api.admin.waiting-list.analytics');
        Route::middleware('can:manage-waitlist-launch-email')->group(function () {
            Route::get('/admin/waiting-list/launch-email/preview', [AdminWaitingListController::class, 'launchEmailPreview'])
                ->name('api.admin.waiting-list.launch-email.preview');
            Route::get('/admin/waiting-list/launch-email/status', [AdminWaitingListController::class, 'launchEmailStatus'])
                ->name('api.admin.waiting-list.launch-email.status');
            Route::post('/admin/waiting-list/launch-email/send', [AdminWaitingListController::class, 'launchEmailSend'])
                ->name('api.admin.waiting-list.launch-email.send');
            Route::post('/admin/waiting-list/launch-email/pump', [AdminWaitingListController::class, 'launchEmailPump'])
                ->name('api.admin.waiting-list.launch-email.pump');
        });
        Route::middleware('can:manage-registered-user-broadcast-email')->group(function () {
            Route::get('/admin/users/broadcast-email/preview', [AdminRegisteredUserBroadcastController::class, 'preview'])
                ->name('api.admin.users.broadcast-email.preview');
            Route::get('/admin/users/broadcast-email/status', [AdminRegisteredUserBroadcastController::class, 'status'])
                ->name('api.admin.users.broadcast-email.status');
            Route::post('/admin/users/broadcast-email/send', [AdminRegisteredUserBroadcastController::class, 'send'])
                ->name('api.admin.users.broadcast-email.send');
            Route::post('/admin/users/broadcast-email/pump', [AdminRegisteredUserBroadcastController::class, 'pump'])
                ->name('api.admin.users.broadcast-email.pump');
        });
        Route::get('/admin/waiting-list/{entry}', [AdminWaitingListController::class, 'show'])
            ->whereNumber('entry')
            ->name('api.admin.waiting-list.show');
        Route::patch('/admin/waiting-list/{entry}', [AdminWaitingListController::class, 'update'])
            ->whereNumber('entry')
            ->name('api.admin.waiting-list.update');
        Route::post('/admin/waiting-list/{entry}/restore', [AdminWaitingListController::class, 'restore'])
            ->whereNumber('entry')
            ->name('api.admin.waiting-list.restore');
        Route::delete('/admin/waiting-list/{entry}', [AdminWaitingListController::class, 'destroy'])
            ->whereNumber('entry')
            ->name('api.admin.waiting-list.destroy');
    });

    // Preferences remain available while waiting to verify email.
    Route::patch('/profile/locale', [ProfileController::class, 'updateLocale'])->name('api.profile.locale');
    Route::get('/profile/theme', [ProfileController::class, 'showTheme'])->name('api.profile.theme.show');
    Route::patch('/profile/theme', [ProfileController::class, 'updateTheme'])->name('api.profile.theme');
    Route::patch('/profile/onboarding', [ProfileController::class, 'updateOnboarding'])
        ->name('api.profile.onboarding');
    Route::get('/profile/ai-audio-consent', [ProfileController::class, 'showAiAudioConsent'])
        ->name('api.profile.ai-audio-consent.show');
    Route::patch('/profile/ai-audio-consent', [ProfileController::class, 'updateAiAudioConsent'])
        ->name('api.profile.ai-audio-consent.update');
    Route::get('/profile/ai-session-settings', [ProfileController::class, 'showAiSessionSettings'])
        ->name('api.profile.ai-session-settings.show');
    Route::patch('/profile/ai-session-settings', [ProfileController::class, 'updateAiSessionSettings'])
        ->name('api.profile.ai-session-settings.update');

    Route::middleware('verified')->group(function () {
        Route::post('/feedback', [FeedbackController::class, 'store'])
            ->middleware('throttle:10,1,api-feedback')
            ->name('api.feedback.store');

        Route::get('/dashboard', [DashboardController::class, 'show'])->name('api.dashboard.show');
        Route::get('/dashboard/progress', [DashboardController::class, 'progress'])->name('api.dashboard.progress');
        Route::get('/referrals', [ReferralController::class, 'show'])->name('api.referrals.show');
        Route::post('/referrals/acknowledge', [ReferralController::class, 'acknowledge'])
            ->middleware('throttle:30,1,api-referrals-ack')
            ->name('api.referrals.acknowledge');
        Route::get('/achievements', [AchievementController::class, 'index'])->name('api.achievements.index');
        Route::post('/achievements/acknowledge', [AchievementController::class, 'acknowledge'])
            ->middleware('throttle:30,1,api-achievements-ack')
            ->name('api.achievements.acknowledge');
        Route::patch('/achievements/settings', [AchievementController::class, 'updateSettings'])
            ->middleware('throttle:20,1,api-achievements-settings')
            ->name('api.achievements.settings');
        Route::get('/onboarding/connections', [ConnectionOnboardingController::class, 'state'])->name('api.onboarding.connections.show');
        Route::patch('/onboarding/connections', [ConnectionOnboardingController::class, 'update'])->name('api.onboarding.connections.update');

        Route::middleware('learner.teacher.section')->group(function () {
            Route::get('/me/circle', [LearnerCircleController::class, 'show'])->name('api.me.circle');
            Route::post('/me/groups/{group}/request', [LearnerSupportController::class, 'requestGroup'])->name('api.me.groups.request');
            Route::post('/me/memberships/{membership}/consent', [LearnerSupportController::class, 'grantConsent'])->name('api.me.memberships.consent');
            Route::post('/me/memberships/{membership}/reject', [LearnerSupportController::class, 'rejectMembership'])->name('api.me.memberships.reject');
            Route::post('/me/class-invites/preview', [LearnerClassInviteController::class, 'preview'])->middleware('throttle:20,1,api-me-class-invites-preview')->name('api.me.class-invites.preview');
            Route::post('/me/class-invites/redeem', [LearnerClassInviteController::class, 'redeem'])->middleware('throttle:10,1,api-me-class-invites-redeem')->name('api.me.class-invites.redeem');
            // Participants authorised in TeacherAssignmentMessageAudioService (teachers are not learning-network learners).
            Route::get('/task-messages/{note}/audio', [LearnerSupportController::class, 'assignmentMessageAudio'])->name('api.task-messages.audio');
        });

        Route::middleware(['learner.teacher.section', 'learner.learning.network'])->group(function () {
            Route::get('/me/support', [LearnerSupportController::class, 'show'])->name('api.me.support');
            Route::post('/me/assignments/{recipient}/start', [LearnerSupportController::class, 'startAssignment'])->name('api.me.assignments.start');
            Route::post('/me/assignments/{recipient}/complete', [LearnerSupportController::class, 'completeAssignment'])->name('api.me.assignments.complete');
            Route::post('/me/self-assessments', [LearnerSupportController::class, 'storeSelfAssessment'])->name('api.me.self-assessments.store');
            Route::get('/me/assignments/{recipient}/messages', [LearnerSupportController::class, 'assignmentMessages'])->name('api.me.assignments.messages.index');
            Route::post('/me/assignments/{recipient}/notes', [LearnerSupportController::class, 'storeAssignmentMessage'])->middleware('throttle:20,1,api-me-assignment-notes')->name('api.me.assignments.notes.store');
            Route::post('/me/teachers/{teacher}/messages', [LearnerSupportController::class, 'storeTeacherMessage'])->middleware('throttle:20,1,api-me-teacher-messages')->name('api.me.teachers.messages.store');
            Route::get('/me/teachers/{teacher}/messages', [LearnerSupportController::class, 'teacherMessages'])->name('api.me.teachers.messages.index');
        });

        Route::middleware('teacher.features')->group(function () {
            Route::get('/organisations/memberships', [OrganisationMembershipController::class, 'index'])->name('api.organisations.memberships.index');
            Route::post('/organisations/memberships', [OrganisationMembershipController::class, 'store'])->name('api.organisations.memberships.store');
            Route::get('/organisations/memberships/pending', [OrganisationMembershipController::class, 'pending'])->name('api.organisations.memberships.pending');
            Route::post('/organisations/{organisation}/switch', [OrganisationMembershipController::class, 'switchActive'])->name('api.organisations.switch');
            Route::post('/organisations/memberships/{membership}/approve', [OrganisationMembershipController::class, 'approve'])->name('api.organisations.memberships.approve');
            Route::post('/organisations/memberships/{membership}/reject', [OrganisationMembershipController::class, 'reject'])->name('api.organisations.memberships.reject');
            Route::get('/organisations/active/institution', [OrganisationInstitutionController::class, 'show'])->name('api.organisations.active.institution');
            Route::patch('/organisations/active/institution', [OrganisationInstitutionController::class, 'update'])->name('api.organisations.active.institution.update');
            Route::post('/organisations/active/staff/{membership}/revoke', [OrganisationInstitutionController::class, 'revokeStaff'])->name('api.organisations.active.staff.revoke');
            Route::post('/organisations/active/staff/{membership}/admin', [OrganisationInstitutionController::class, 'setStaffAdmin'])->name('api.organisations.active.staff.admin');
            Route::post('/organisations/active/teacher-invitations', [OrganisationInstitutionController::class, 'storeTeacherInvitation'])->middleware('throttle:10,1,api-org-teacher-invites')->name('api.organisations.active.teacher-invitations.store');
            Route::post('/organisations/active/teacher-invitations/{invitation}/revoke', [OrganisationInstitutionController::class, 'revokeTeacherInvitation'])->name('api.organisations.active.teacher-invitations.revoke');
            Route::post('/organisations/teacher-invitations/accept', [OrganisationInstitutionController::class, 'acceptTeacherInvitation'])->middleware('throttle:10,1,api-org-teacher-invites-accept')->name('api.organisations.teacher-invitations.accept');
        });

        Route::middleware('parent.features')->group(function () {
            Route::post('/me/guardians/{link}/approve', [LearnerGuardianController::class, 'approve'])->name('api.me.guardians.approve');
            Route::post('/me/guardians/{link}/reject', [LearnerGuardianController::class, 'reject'])->name('api.me.guardians.reject');
            Route::prefix('parent')->group(function () {
                Route::post('/assistant', [ParentAssistantController::class, 'ask'])->middleware('throttle:10,1,api-parent-assistant')->name('api.parent.assistant');
                Route::get('/reports', [ParentReportController::class, 'index'])->name('api.parent.reports.index');
                Route::get('/reports/{report}', [ParentReportController::class, 'show'])->whereNumber('report')->name('api.parent.reports.show');
                Route::get('/reports/{report}/download', [ParentReportController::class, 'download'])->whereNumber('report')->name('api.parent.reports.download');
                Route::get('/shell', [ParentDashboardController::class, 'shell'])->name('api.parent.shell');
                Route::get('/children/{student}', [ParentDashboardController::class, 'showChild'])->name('api.parent.children.show');
                Route::get('/children/{student}/assignments', [ParentChildController::class, 'assignments'])->name('api.parent.children.assignments');
                Route::get('/children/{student}/progress', [ParentChildController::class, 'progress'])->name('api.parent.children.progress');
                Route::get('/children/{student}/profile', [ParentChildController::class, 'profile'])->name('api.parent.children.profile');
                Route::get('/messages', [ParentMessageController::class, 'index'])->name('api.parent.messages.index');
                Route::get('/notification-preferences', [ParentMessageController::class, 'preferences'])->name('api.parent.notification-preferences.show');
                Route::put('/notification-preferences', [ParentMessageController::class, 'updatePreferences'])->name('api.parent.notification-preferences.update');
                Route::get('/messages/{teacher}/{student}', [ParentMessageController::class, 'show'])->whereNumber('teacher')->whereNumber('student')->name('api.parent.messages.show');
                Route::post('/messages/{teacher}/{student}', [ParentMessageController::class, 'store'])->whereNumber('teacher')->whereNumber('student')->middleware('throttle:20,1,api-parent-messages')->name('api.parent.messages.store');
                Route::post('/messages/{note}/report', [ParentMessageController::class, 'report'])->middleware('throttle:10,1,api-parent-messages-report')->name('api.parent.messages.report');
                Route::post('/invitations/accept', [ParentInvitationController::class, 'accept'])->middleware('throttle:10,1,api-parent-invitations-accept')->name('api.parent.invitations.accept');
                Route::post('/invitations/reject', [ParentInvitationController::class, 'reject'])->middleware('throttle:10,1,api-parent-invitations-reject')->name('api.parent.invitations.reject');
                Route::post('/link-codes', [ParentInvitationController::class, 'issueCode'])->middleware('throttle:5,1,api-parent-link-codes-store')->name('api.parent.link-codes.store');
                Route::post('/link-codes/redeem', [ParentInvitationController::class, 'redeemCode'])->middleware('throttle:8,1,api-parent-link-codes-redeem')->name('api.parent.link-codes.redeem');
            });
        });

        Route::middleware('teacher.features')->group(function () {
            Route::prefix('teacher')->group(function () {
                Route::get('/overview', [TeacherDashboardController::class, 'overview'])->name('api.teacher.overview');
                Route::get('/students', [TeacherDashboardController::class, 'students'])->name('api.teacher.students');
                Route::get('/attendance', [TeacherDashboardController::class, 'attendance'])->name('api.teacher.attendance');
                Route::post('/attendance/groups/{group}/lessons', [TeacherDashboardController::class, 'scheduleLesson'])->name('api.teacher.attendance.lessons.store');
                Route::put('/attendance/groups/{group}/students/{student}', [TeacherDashboardController::class, 'setAttendance'])->name('api.teacher.attendance.set');
                Route::get('/students/{student}', [TeacherDashboardController::class, 'show'])->name('api.teacher.students.show');
                Route::get('/students/{student}/guardians', [TeacherGuardianController::class, 'index'])->name('api.teacher.students.guardians');
                Route::post('/students/{student}/guardians/invitations', [TeacherGuardianController::class, 'store'])->middleware('throttle:10,1,api-teacher-guardian-invites')->name('api.teacher.students.guardians.invitations.store');
                Route::post('/students/{student}/guardians/links/{link}/revoke', [TeacherGuardianController::class, 'revokeLink'])->name('api.teacher.students.guardians.links.revoke');
                Route::post('/guardian-invitations/{invitation}/resend', [TeacherGuardianController::class, 'resend'])->middleware('throttle:10,1,api-teacher-guardian-resend')->name('api.teacher.guardian-invitations.resend');
                Route::post('/guardian-invitations/{invitation}/revoke', [TeacherGuardianController::class, 'revoke'])->name('api.teacher.guardian-invitations.revoke');
                Route::delete('/students/{student}', [TeacherDashboardController::class, 'deleteStudent'])->name('api.teacher.students.destroy');
                Route::get('/students/{student}/report', [TeacherDashboardController::class, 'report'])->name('api.teacher.students.report');
                Route::get('/students/{student}/messages', [TeacherDashboardController::class, 'studentMessages'])->name('api.teacher.students.messages');
                Route::post('/students/{student}/messages', [TeacherDashboardController::class, 'sendStudentMessage'])->middleware('throttle:20,1,api-teacher-student-messages')->name('api.teacher.students.messages.store');
                Route::delete('/students/{student}/messages/{note}', [TeacherDashboardController::class, 'deleteStudentMessage'])->name('api.teacher.students.messages.destroy');
                Route::get('/students/{student}/guardian-messages', [TeacherDashboardController::class, 'guardianMessages'])->name('api.teacher.students.guardian-messages');
                Route::post('/students/{student}/guardian-messages', [TeacherDashboardController::class, 'sendGuardianMessage'])->middleware('throttle:20,1,api-teacher-guardian-messages')->name('api.teacher.students.guardian-messages.store');
                Route::put('/students/{student}/attempts/{attempt}/assessment', [TeacherDashboardController::class, 'assessRecitation'])->name('api.teacher.students.attempts.assess');
                Route::get('/students/{student}/attempts/{attempt}/playback', [TeacherRecitationPlaybackController::class, 'show'])->whereNumber('attempt')->name('api.teacher.students.attempts.playback');
                Route::post('/students/{student}/attempts/{attempt}/playback/review', [TeacherRecitationPlaybackController::class, 'review'])->whereNumber('attempt')->name('api.teacher.students.attempts.playback.review');
                Route::post('/students/{student}/attempts/{attempt}/playback/feedback', [TeacherRecitationPlaybackController::class, 'feedback'])->whereNumber('attempt')->middleware('throttle:20,1,api-teacher-playback-feedback')->name('api.teacher.students.attempts.playback.feedback');
                Route::post('/students/{student}/attempts/{attempt}/playback/private-note', [TeacherRecitationPlaybackController::class, 'privateNote'])->whereNumber('attempt')->middleware('throttle:40,1,api-teacher-playback-private-note')->name('api.teacher.students.attempts.playback.private-note');
                Route::post('/students/{student}/attempts/{attempt}/playback/revision', [TeacherRecitationPlaybackController::class, 'revision'])->whereNumber('attempt')->name('api.teacher.students.attempts.playback.revision');
                Route::post('/students/{student}/attempts/{attempt}/playback/words', [TeacherRecitationPlaybackController::class, 'word'])->whereNumber('attempt')->middleware('throttle:30,1,api-teacher-playback-words')->name('api.teacher.students.attempts.playback.words');
                Route::delete('/students/{student}/attempts/{attempt}/playback/corrections/{correction}/audio', [TeacherRecitationPlaybackController::class, 'deleteWordAudio'])->whereNumber('attempt')->whereNumber('correction')->name('api.teacher.students.attempts.playback.corrections.audio.destroy');
                Route::post('/students/{student}/attempts/{attempt}/playback/segments', [TeacherRecitationPlaybackController::class, 'storeSegment'])->whereNumber('attempt')->middleware('throttle:30,1,api-teacher-playback-segments')->name('api.teacher.students.attempts.playback.segments.store');
                Route::patch('/students/{student}/attempts/{attempt}/playback/segments/{segment}', [TeacherRecitationPlaybackController::class, 'updateSegment'])->whereNumber('attempt')->whereNumber('segment')->name('api.teacher.students.attempts.playback.segments.update');
                Route::delete('/students/{student}/attempts/{attempt}/playback/segments/{segment}', [TeacherRecitationPlaybackController::class, 'deleteSegment'])->whereNumber('attempt')->whereNumber('segment')->name('api.teacher.students.attempts.playback.segments.destroy');
                Route::delete('/students/{student}/attempts/{attempt}/playback/segments/{segment}/audio', [TeacherRecitationPlaybackController::class, 'deleteSegmentAudio'])->whereNumber('attempt')->whereNumber('segment')->name('api.teacher.students.attempts.playback.segments.audio.destroy');
                Route::get('/word-coaching-corrections/{correction}/audio', [TeacherRecitationPlaybackController::class, 'correctionAudio'])->whereNumber('correction')->name('api.teacher.word-coaching-corrections.audio');
                Route::get('/feedback-segments/{segment}/audio', [TeacherRecitationPlaybackController::class, 'segmentAudio'])->whereNumber('segment')->name('api.teacher.feedback-segments.audio');
                Route::post('/students/{student}/reviews/{practicePlan}/complete', [TeacherDashboardController::class, 'completeReview'])->name('api.teacher.students.reviews.complete');
                Route::post('/students/{student}/notes', [TeacherDashboardController::class, 'storeNote'])->name('api.teacher.students.notes');
                Route::get('/students/{student}/private-notes', [TeacherDashboardController::class, 'privateNotes'])->name('api.teacher.students.private-notes.index');
                Route::post('/students/{student}/private-notes', [TeacherDashboardController::class, 'storePrivateNote'])->middleware('throttle:40,1,api-teacher-private-notes')->name('api.teacher.students.private-notes.store');
                Route::patch('/students/{student}/private-notes/{privateNote}', [TeacherDashboardController::class, 'updatePrivateNote'])->name('api.teacher.students.private-notes.update');
                Route::delete('/students/{student}/private-notes/{privateNote}', [TeacherDashboardController::class, 'destroyPrivateNote'])->name('api.teacher.students.private-notes.destroy');
                Route::post('/students/{student}/private-notes/{privateNote}/archive', [TeacherDashboardController::class, 'archivePrivateNote'])->name('api.teacher.students.private-notes.archive');
                Route::post('/students/{student}/private-notes/{privateNote}/unarchive', [TeacherDashboardController::class, 'unarchivePrivateNote'])->name('api.teacher.students.private-notes.unarchive');
                Route::post('/students/{student}/private-notes/{privateNote}/share', [TeacherDashboardController::class, 'sharePrivateNote'])->middleware('throttle:20,1,api-teacher-private-notes-share')->name('api.teacher.students.private-notes.share');
                Route::get('/groups', [TeacherDashboardController::class, 'groups'])->name('api.teacher.groups');
                Route::post('/groups', [TeacherDashboardController::class, 'storeGroup'])->name('api.teacher.groups.store');
                Route::get('/groups/{group}', [TeacherDashboardController::class, 'showGroup'])->name('api.teacher.groups.show');
                Route::post('/groups/{group}/join', [TeacherDashboardController::class, 'joinGroup'])->name('api.teacher.groups.join');
                Route::post('/memberships/{membership}/approve', [TeacherDashboardController::class, 'approveMembership'])->name('api.teacher.memberships.approve');
                Route::post('/memberships/{membership}/reject', [TeacherDashboardController::class, 'rejectMembership'])->name('api.teacher.memberships.reject');
                Route::post('/memberships/{membership}/remove', [TeacherDashboardController::class, 'removeMembership'])->name('api.teacher.memberships.remove');
                Route::post('/memberships/{membership}/transfer', [TeacherMembershipTransferController::class, 'store'])->name('api.teacher.memberships.transfer');
                Route::post('/groups/{group}/invitations', [TeacherClassInviteController::class, 'store'])->middleware('throttle:10,1,api-teacher-class-invites')->name('api.teacher.groups.invitations.store');
                Route::post('/group-invitations/{invitation}/revoke', [TeacherClassInviteController::class, 'revoke'])->name('api.teacher.group-invitations.revoke');
                Route::get('/assignments', [TeacherDashboardController::class, 'assignments'])->name('api.teacher.assignments');
                Route::post('/assignments', [TeacherDashboardController::class, 'storeAssignment'])->name('api.teacher.assignments.store');
                Route::put('/assignments/{assignment}', [TeacherDashboardController::class, 'updateAssignment'])->name('api.teacher.assignments.update');
                Route::delete('/assignments/{assignment}', [TeacherDashboardController::class, 'destroyAssignment'])->name('api.teacher.assignments.destroy');
                Route::post('/assignment-recipients/{recipient}/notes', [TeacherDashboardController::class, 'storeAssignmentMessage'])->name('api.teacher.assignment-recipients.notes.store');
                Route::delete('/notes/{note}', [TeacherDashboardController::class, 'destroyAssignmentMessage'])->name('api.teacher.notes.destroy');
                Route::post('/assignment-recipients/{recipient}/approve', [TeacherDashboardController::class, 'approveAssignmentRecipient'])->name('api.teacher.assignment-recipients.approve');
                Route::post('/assignment-recipients/{recipient}/correction', [TeacherDashboardController::class, 'requestAssignmentCorrection'])->name('api.teacher.assignment-recipients.correction');
                Route::get('/recitation-difficulties', [TeacherDashboardController::class, 'recitationDifficultyQueue'])->name('api.teacher.recitation-difficulties.queue');
                Route::get('/students/{student}/recitation-difficulties', [TeacherDashboardController::class, 'studentRecitationDifficulties'])->name('api.teacher.students.recitation-difficulties.index');
                Route::get('/students/{student}/recitation-difficulties/{spot}', [TeacherDashboardController::class, 'showStudentRecitationDifficulty'])->name('api.teacher.students.recitation-difficulties.show');
                Route::post('/students/{student}/recitation-difficulties/{spot}/review', [TeacherDashboardController::class, 'reviewStudentRecitationDifficulty'])->name('api.teacher.students.recitation-difficulties.review');
                Route::get('/learning-plans', [TeacherDashboardController::class, 'learningPlans'])->name('api.teacher.learning-plans.index');
                Route::post('/learning-plans', [TeacherDashboardController::class, 'storeLearningPlan'])->name('api.teacher.learning-plans.store');
                Route::put('/learning-plans/{plan}', [TeacherDashboardController::class, 'updateLearningPlan'])->name('api.teacher.learning-plans.update');
                Route::post('/learning-plans/{plan}/status', [TeacherDashboardController::class, 'setLearningPlanStatus'])->name('api.teacher.learning-plans.status');
                Route::post('/learning-plan-items/{item}/approve', [TeacherDashboardController::class, 'approveLearningPlanItem'])->name('api.teacher.learning-plan-items.approve');
                Route::post('/learning-plan-items/{item}/skip', [TeacherDashboardController::class, 'skipLearningPlanItem'])->name('api.teacher.learning-plan-items.skip');
                Route::post('/learning-plan-items/{item}/reschedule', [TeacherDashboardController::class, 'rescheduleLearningPlanItem'])->name('api.teacher.learning-plan-items.reschedule');
                Route::post('/students/{student}/revision-recommendations', [TeacherDashboardController::class, 'revisionRecommendations'])->name('api.teacher.students.revision-recommendations');
                Route::patch('/revision-recommendations/{recommendation}', [TeacherDashboardController::class, 'updateRevisionRecommendation'])->name('api.teacher.revision-recommendations.update');
                Route::post('/revision-recommendations/{recommendation}/accept', [TeacherDashboardController::class, 'acceptRevisionRecommendation'])->name('api.teacher.revision-recommendations.accept');
                Route::post('/revision-recommendations/{recommendation}/dismiss', [TeacherDashboardController::class, 'dismissRevisionRecommendation'])->name('api.teacher.revision-recommendations.dismiss');
                Route::post('/revision-recommendations/{recommendation}/assign', [TeacherDashboardController::class, 'assignRevisionRecommendation'])->name('api.teacher.revision-recommendations.assign');
                Route::get('/students/{student}/learning-plan-suggestions', [TeacherDashboardController::class, 'learningPlanSuggestions'])->name('api.teacher.students.learning-plan-suggestions');
                Route::get('/learning-plan-templates', [TeacherDashboardController::class, 'learningPlanTemplates'])->name('api.teacher.learning-plan-templates.index');
                Route::post('/learning-plan-templates', [TeacherDashboardController::class, 'storeLearningPlanTemplate'])->name('api.teacher.learning-plan-templates.store');
                Route::post('/learning-plan-templates/{template}/apply', [TeacherDashboardController::class, 'applyLearningPlanTemplate'])->name('api.teacher.learning-plan-templates.apply');
            });
        });
        Route::get('/dashboard/activity', [DashboardController::class, 'activity'])->name('api.dashboard.activity');

        Route::get('/session', [SessionController::class, 'show'])->name('api.session.show');
        Route::get('/session/current', [SessionController::class, 'current'])->name('api.session.current');
        Route::get('/sessions/history', [SessionController::class, 'history'])->name('api.sessions.history');
        Route::get('/sessions/{session}/analysis', [SessionController::class, 'analysis'])
            ->whereNumber('session')
            ->name('api.sessions.analysis');
        Route::post('/session', [SessionController::class, 'store'])->middleware('throttle:60,1,api-session')->name('api.session.store');
        Route::post('/session/start', [SessionController::class, 'start'])->middleware('throttle:60,1,api-session')->name('api.session.start');
        Route::post('/session/pause', [SessionController::class, 'pause'])->middleware('throttle:60,1,api-session')->name('api.session.pause');
        Route::post('/session/resume', [SessionController::class, 'resume'])->middleware('throttle:60,1,api-session')->name('api.session.resume');
        Route::post('/session/end', [SessionController::class, 'end'])->middleware('throttle:60,1,api-session')->name('api.session.end');

        Route::get('/ai-recite-attempts', [AiReciteAttemptController::class, 'index'])->name('api.ai-recite-attempts.index');
        Route::get('/ai-recite-attempts/stats', [AiReciteAttemptController::class, 'stats'])
            ->name('api.ai-recite-attempts.stats');
        Route::get('/ai-recite-attempts/{attempt}', [AiReciteAttemptController::class, 'show'])
            ->whereNumber('attempt')
            ->name('api.ai-recite-attempts.show');
        Route::post('/ai-recite-attempts/{attempt}/audio', [AiReciteAttemptController::class, 'storeAudio'])
            ->whereNumber('attempt')
            ->middleware('throttle:30,1,api-ai-recite-audio')
            ->name('api.ai-recite-attempts.audio.store');
        Route::get('/ai-recite-attempts/{attempt}/audio', [AiReciteAttemptController::class, 'audio'])
            ->whereNumber('attempt')
            ->name('api.ai-recite-attempts.audio');
        Route::patch('/ai-recite-attempts/{attempt}/peek', [AiReciteAttemptController::class, 'markPeek'])
            ->whereNumber('attempt')
            ->name('api.ai-recite-attempts.peek');

        Route::get('/continue', [ContinueController::class, 'show'])->name('api.continue.show');
        Route::post('/continue', [ContinueController::class, 'store'])->name('api.continue.store');

        Route::get('/progress', [ProgressController::class, 'index'])->name('api.progress.index');
        Route::post('/progress', [ProgressController::class, 'store'])->name('api.progress.store');

        Route::post('/mutashabihat/compare', [MutashabihatController::class, 'compare'])
            ->middleware('throttle:60,1,api-mutashabihat-compare')
            ->name('api.mutashabihat.compare');
        Route::get('/mutashabihat/progress', [MutashabihatController::class, 'progressIndex'])
            ->name('api.mutashabihat.progress.index');
        Route::post('/mutashabihat/confusion', [MutashabihatController::class, 'recordConfusion'])
            ->middleware('throttle:30,1,api-mutashabihat-confusion')
            ->name('api.mutashabihat.confusion.store');
        Route::post('/mutashabihat/practice', [MutashabihatController::class, 'recordPractice'])
            ->middleware('throttle:60,1,api-mutashabihat-practice')
            ->name('api.mutashabihat.practice.store');

        Route::get('/hifz-plan', [HifzPlanController::class, 'show'])->name('api.hifz-plan.show');
        Route::put('/hifz-plan', [HifzPlanController::class, 'upsert'])
            ->middleware('plan:premium')
            ->name('api.hifz-plan.upsert');
        Route::delete('/hifz-plan', [HifzPlanController::class, 'destroy'])
            ->middleware('plan:premium')
            ->name('api.hifz-plan.destroy');

        // Private per-āyah notes & reflections (user-scoped).
        Route::get('/ayah-notes/counts', [AyahNoteController::class, 'counts'])->name('api.ayah-notes.counts');
        Route::get('/ayah-notes', [AyahNoteController::class, 'index'])->name('api.ayah-notes.index');
        Route::post('/ayah-notes', [AyahNoteController::class, 'store'])->name('api.ayah-notes.store');
        Route::put('/ayah-notes/{ayahNote}', [AyahNoteController::class, 'update'])->name('api.ayah-notes.update');
        Route::delete('/ayah-notes/{ayahNote}', [AyahNoteController::class, 'destroy'])->name('api.ayah-notes.destroy');

        Route::get('/analytics', [AnalyticsController::class, 'index'])->name('api.analytics.index');
        Route::post('/analytics', [AnalyticsController::class, 'store'])->name('api.analytics.store');
        Route::get('/analytics/advanced', [AnalyticsController::class, 'advanced'])
            ->name('api.analytics.advanced');

        // Personalised next-session recommendations.
        Route::get('/recommendations/next', [RecommendationController::class, 'show'])->name('api.recommendations.next');
        Route::get('/recommendations/history', [RecommendationController::class, 'history'])->name('api.recommendations.history');
        Route::post('/recommendations/start', [RecommendationController::class, 'start'])->name('api.recommendations.start');
        Route::post('/recommendations/reject', [RecommendationController::class, 'reject'])->name('api.recommendations.reject');
        Route::post('/recommendations/confidence', [RecommendationController::class, 'confidence'])->name('api.recommendations.confidence');
        Route::post('/recommendations/settings', [RecommendationController::class, 'settings'])->name('api.recommendations.settings');
        Route::post('/recommendations/ai-assessment', [RecommendationController::class, 'aiAssessment'])
            ->middleware('plan:pro')
            ->name('api.recommendations.ai-assessment');
        Route::post('/recommendations/adaptive-assessment', [RecommendationController::class, 'adaptiveAssessment'])
            ->middleware('plan:premium')
            ->name('api.recommendations.adaptive-assessment');

        // AI Memorisation Detection — assessment, personalised plan, practice execution.
        Route::post('/memorisation/ask-mutqin/interpret', [AskMutqinCommandController::class, 'interpret'])
            ->middleware('throttle:ask-mutqin-interpret')
            ->name('memorisation.ask-mutqin.interpret');
        Route::post('/memorisation/ask-mutqin/interpret-session', [AskMutqinCommandController::class, 'interpretSession'])
            ->middleware('throttle:ask-mutqin-interpret')
            ->name('memorisation.ask-mutqin.interpret-session');
        Route::post('/memorisation/ask-mutqin/voice-metrics', [AskMutqinCommandController::class, 'recordVoiceMetrics'])
            ->middleware('throttle:ask-mutqin-interpret')
            ->name('memorisation.ask-mutqin.voice-metrics');

        Route::post('/memorisation/assessments', [MemorisationDetectionController::class, 'storeAssessment'])
            ->middleware(['throttle:20,1,api-memorisation-assessments'])
            ->name('api.memorisation.assessments.store');
        Route::post('/memorisation/assessments/failed', [MemorisationDetectionController::class, 'storeFailedAssessment'])
            ->middleware(['throttle:20,1,api-memorisation-assessments-failed'])
            ->name('api.memorisation.assessments.failed');
        Route::get('/memorisation/assessments', [MemorisationHistoryController::class, 'attemptIndex'])
            ->name('api.memorisation.assessments.index');
        Route::get('/memorisation/assessments/{assessment}', [MemorisationHistoryController::class, 'attemptShow'])
            ->name('api.memorisation.assessments.show');
        Route::get('/memorisation/sessions/history', [MemorisationHistoryController::class, 'sessionIndex'])
            ->name('api.memorisation.sessions.history');
        Route::get('/memorisation/weak-spots', [MemorisationHistoryController::class, 'weakSpots'])
            ->middleware('plan:pro')
            ->name('api.memorisation.weak-spots');
        Route::get('/memorisation/practice-plans', [MemorisationHistoryController::class, 'recommendations'])
            ->name('api.memorisation.practice-plans.index');
        Route::get('/memorisation/comparisons/lookup', [MemorisationHistoryController::class, 'comparisonLookup'])
            ->name('api.memorisation.comparisons.lookup');
        Route::get('/memorisation/comparisons/{comparison}', [MemorisationHistoryController::class, 'comparisonShow'])
            ->name('api.memorisation.comparisons.show');
        Route::get('/memorisation/history/dashboard', [MemorisationHistoryController::class, 'dashboard'])
            ->name('api.memorisation.history.dashboard');
        Route::patch('/memorisation/practice-plans/{practicePlan}', [MemorisationDetectionController::class, 'adjustPlan'])
            ->name('api.memorisation.practice-plans.adjust');
        Route::post('/memorisation/practice-plans/{practicePlan}/accept', [MemorisationDetectionController::class, 'acceptPlan'])
            ->name('api.memorisation.practice-plans.accept');
        Route::post('/memorisation/practice-plans/{practicePlan}/dismiss', [MemorisationDetectionController::class, 'dismissPlan'])
            ->name('api.memorisation.practice-plans.dismiss');
        Route::post('/memorisation/practice-plans/{practicePlan}/start', [MemorisationDetectionController::class, 'startPlan'])
            ->name('api.memorisation.practice-plans.start');
        Route::post('/memorisation/practice-plans/{practicePlan}/complete', [MemorisationDetectionController::class, 'completePlan'])
            ->name('api.memorisation.practice-plans.complete');
        Route::post('/memorisation/practice-plans/{practicePlan}/retest', [MemorisationDetectionController::class, 'retestPlan'])
            ->middleware(['plan:pro', 'throttle:20,1,api-memorisation-retest'])
            ->name('api.memorisation.practice-plans.retest');

        // Automated revision reminders (murājaʿah + teacher tasks).
        Route::get('/revision-reminders', [RevisionReminderController::class, 'index'])
            ->name('api.revision-reminders.index');
        Route::get('/revision-reminders/preferences', [RevisionReminderController::class, 'preferences'])
            ->name('api.revision-reminders.preferences');
        Route::patch('/revision-reminders/preferences', [RevisionReminderController::class, 'updatePreferences'])
            ->name('api.revision-reminders.preferences.update');
        Route::post('/revision-reminders/{revisionReminder}/snooze', [RevisionReminderController::class, 'snooze'])
            ->whereNumber('revisionReminder')
            ->name('api.revision-reminders.snooze');
        Route::post('/revision-reminders/{revisionReminder}/dismiss', [RevisionReminderController::class, 'dismiss'])
            ->whereNumber('revisionReminder')
            ->name('api.revision-reminders.dismiss');

        // Full-fidelity state blob used as the live persistence boundary.
        Route::get('/state', [StateSyncController::class, 'show'])->name('api.state.show');
        Route::post('/state', [StateSyncController::class, 'store'])
            ->middleware('throttle:30,1,api-state-store')
            ->name('api.state.store');

        Route::post('/migrate-local-storage', [MigrateLocalStorageController::class, 'store'])
            ->middleware('throttle:5,1,api-migrate-local-storage')
            ->name('api.migrate-local-storage');
    });
});
