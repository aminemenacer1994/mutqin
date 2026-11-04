<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function schema(): Builder
    {
        return Schema::connection(config('mutqin.waiting_list.database_connection'));
    }

    public function up(): void
    {
        $schema = $this->schema();
        if (! $schema->hasTable('waiting_list_entries') || $schema->hasColumn('waiting_list_entries', 'deleted_at')) {
            return;
        }

        $schema->table('waiting_list_entries', function (Blueprint $table): void {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        $schema = $this->schema();
        if (! $schema->hasTable('waiting_list_entries') || ! $schema->hasColumn('waiting_list_entries', 'deleted_at')) {
            return;
        }

        $schema->table('waiting_list_entries', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};
