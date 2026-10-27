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

        if (! $schema->hasTable('waiting_list_entries')) {
            return;
        }

        $missing = array_filter(
            ['unsubscribed_at', 'bounced_at', 'marked_invalid_at'],
            fn (string $column) => ! $schema->hasColumn('waiting_list_entries', $column)
        );

        if ($missing === []) {
            return;
        }

        $schema->table('waiting_list_entries', function (Blueprint $table) use ($missing): void {
            if (in_array('unsubscribed_at', $missing, true)) {
                $table->timestamp('unsubscribed_at')->nullable();
            }
            if (in_array('bounced_at', $missing, true)) {
                $table->timestamp('bounced_at')->nullable();
            }
            if (in_array('marked_invalid_at', $missing, true)) {
                $table->timestamp('marked_invalid_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        $schema = $this->schema();

        if (! $schema->hasTable('waiting_list_entries')) {
            return;
        }

        $schema->table('waiting_list_entries', function (Blueprint $table): void {
            $table->dropColumn(['unsubscribed_at', 'bounced_at', 'marked_invalid_at']);
        });
    }
};
