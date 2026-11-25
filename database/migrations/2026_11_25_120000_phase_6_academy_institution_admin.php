<?php

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('organisation_memberships', 'is_institution_admin')) {
            Schema::table('organisation_memberships', function (Blueprint $table) {
                $table->boolean('is_institution_admin')->default(false)->after('status');
                $table->index(['organisation_id', 'is_institution_admin'], 'org_memberships_org_admin_idx');
            });
        }

        if (! Schema::hasColumn('organisations', 'profile_summary')) {
            Schema::table('organisations', function (Blueprint $table) {
                $table->string('profile_summary', 500)->nullable()->after('name_canonical');
            });
        }

        if (Schema::hasTable('organisation_teacher_invitations')) {
            return;
        }

        Schema::create('organisation_teacher_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->string('invited_email', 255);
            $table->unsignedBigInteger('invited_by_user_id');
            $table->string('token_hash', 64);
            $table->string('status', 32)->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('sent_at');
            $table->timestamp('accepted_at')->nullable();
            $table->unsignedBigInteger('accepted_by_user_id')->nullable();
            $table->unsignedBigInteger('organisation_membership_id')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->unsignedBigInteger('revoked_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('invited_by_user_id', 'org_tch_inv_by_user_fk')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('accepted_by_user_id', 'org_tch_inv_accepted_user_fk')->references('id')->on('users')->nullOnDelete();
            $table->foreign('organisation_membership_id', 'org_tch_inv_membership_fk')->references('id')->on('organisation_memberships')->nullOnDelete();
            $table->foreign('revoked_by_user_id', 'org_tch_inv_revoked_user_fk')->references('id')->on('users')->nullOnDelete();

            $table->unique('token_hash', 'org_tch_inv_token_unique');
            $table->index(['organisation_id', 'invited_email', 'status'], 'org_teacher_inv_org_email_status_idx');
        });

        if (Schema::hasTable('organisation_admin_audit_logs')) {
            return;
        }

        Schema::create('organisation_admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64);
            $table->string('subject_type', 64)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['organisation_id', 'created_at'], 'org_admin_audit_org_created_idx');
        });

        $organisationIds = DB::table('organisation_memberships')
            ->where('membership_role', MembershipRole::Teacher->value)
            ->where('status', MembershipStatus::Approved->value)
            ->distinct()
            ->pluck('organisation_id');

        foreach ($organisationIds as $organisationId) {
            $firstId = DB::table('organisation_memberships')
                ->where('organisation_id', $organisationId)
                ->where('membership_role', MembershipRole::Teacher->value)
                ->where('status', MembershipStatus::Approved->value)
                ->orderBy('id')
                ->value('id');

            if ($firstId !== null) {
                DB::table('organisation_memberships')
                    ->where('id', $firstId)
                    ->update(['is_institution_admin' => true]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organisation_admin_audit_logs');
        Schema::dropIfExists('organisation_teacher_invitations');

        Schema::table('organisations', function (Blueprint $table) {
            $table->dropColumn('profile_summary');
        });

        Schema::table('organisation_memberships', function (Blueprint $table) {
            $table->dropIndex('org_memberships_org_admin_idx');
            $table->dropColumn('is_institution_admin');
        });
    }
};