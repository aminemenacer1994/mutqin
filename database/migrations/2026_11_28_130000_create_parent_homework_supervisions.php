<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_homework_supervisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('teacher_assignment_recipient_id');
            $table->foreign('teacher_assignment_recipient_id', 'parent_hw_supervision_recipient_fk')
                ->references('id')
                ->on('teacher_assignment_recipients')
                ->cascadeOnDelete();
            $table->timestamp('acknowledged_at');
            $table->timestamps();

            $table->unique(
                ['parent_user_id', 'teacher_assignment_recipient_id'],
                'parent_hw_supervision_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_homework_supervisions');
    }
};