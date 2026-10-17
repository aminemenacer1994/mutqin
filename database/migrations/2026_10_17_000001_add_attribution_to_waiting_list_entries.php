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
        $missing = array_filter(
            ['attribution', 'first_source', 'last_source', 'last_campaign'],
            fn (string $column) => ! $schema->hasColumn('waiting_list_entries', $column)
        );
        $schema->table('waiting_list_entries', function (Blueprint $table) use ($missing): void {
            if (in_array('attribution', $missing, true)) {
                $table->json('attribution')->nullable();
            }
            if (in_array('first_source', $missing, true)) {
                $table->string('first_source', 32)->nullable();
            }
            if (in_array('last_source', $missing, true)) {
                $table->string('last_source', 32)->nullable();
            }
            if (in_array('last_campaign', $missing, true)) {
                $table->string('last_campaign', 100)->nullable();
            }
        });
    }

    public function down(): void
    {
        $this->schema()->table('waiting_list_entries', function (Blueprint $table): void {
            $table->dropColumn(['attribution', 'first_source', 'last_source', 'last_campaign']);
        });
    }
};
