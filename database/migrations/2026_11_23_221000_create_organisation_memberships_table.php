<?php

use App\Enums\AccountRole;
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
        Schema::create('organisation_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->string('membership_role', 32);
            $table->string('status', 32)->default('pending');
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'organisation_id']);
            $table->index(['organisation_id', 'status']);
            $table->index(['user_id', 'status']);
        });

        $now = now();
        DB::table('users')
            ->whereNotNull('organisation_id')
            ->orderBy('id')
            ->chunkById(200, function ($users) use ($now): void {
                $rows = [];
                foreach ($users as $user) {
                    $role = $user->account_role === AccountRole::Teacher->value
                        ? MembershipRole::Teacher->value
                        : MembershipRole::Student->value;

                    $rows[] = [
                        'user_id' => $user->id,
                        'organisation_id' => $user->organisation_id,
                        'membership_role' => $role,
                        'status' => MembershipStatus::Approved->value,
                        'decided_by' => $user->id,
                        'decided_at' => $now,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('organisation_memberships')->insertOrIgnore($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('organisation_memberships');
    }
};
