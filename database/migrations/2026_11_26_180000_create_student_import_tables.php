<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_import_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('learning_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('initiated_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32);
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->unsignedInteger('rows_total')->default(0);
            $table->unsignedInteger('rows_valid')->default(0);
            $table->unsignedInteger('rows_invalid')->default(0);
            $table->unsignedInteger('rows_imported')->default(0);
            $table->text('error_summary')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('processing_started_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('importing_started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['organisation_id', 'initiated_by_user_id'], 'stu_imp_batches_org_initiator_idx');
            $table->index(['learning_group_id', 'status'], 'stu_imp_batches_group_status_idx');
            $table->index('expires_at', 'stu_imp_batches_expires_idx');
        });

        Schema::create('student_import_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_import_batch_id')->constrained()->cascadeOnDelete();
            $table->string('original_filename');
            $table->string('stored_path');
            $table->string('mime_type', 127)->nullable();
            $table->string('extension', 16);
            $table->unsignedBigInteger('size_bytes');
            $table->string('sha256', 64);
            $table->string('status', 32);
            $table->string('parser_key', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->json('provenance')->nullable();
            $table->timestamps();

            $table->index(['student_import_batch_id', 'status'], 'stu_imp_files_batch_status_idx');
        });

        Schema::create('student_import_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_import_batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_import_file_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('row_index');
            $table->string('status', 32);
            $table->json('normalized');
            $table->json('errors')->nullable();
            $table->json('source')->nullable();
            $table->foreignId('matched_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['student_import_batch_id', 'status'], 'stu_imp_rows_batch_status_idx');
            $table->unique(['student_import_batch_id', 'student_import_file_id', 'row_index'], 'stu_imp_rows_batch_file_row_uniq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_import_rows');
        Schema::dropIfExists('student_import_files');
        Schema::dropIfExists('student_import_batches');
    }
};