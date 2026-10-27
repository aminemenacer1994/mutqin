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

        if ($schema->hasTable('waiting_list_email_deliveries')) {
            return;
        }

        $schema->create('waiting_list_email_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('campaign_key', 64);
            $table->char('email_hash', 64);
            $table->unsignedBigInteger('waiting_list_entry_id')->nullable();
            $table->string('status', 16)->default('pending');
            $table->string('skip_reason', 32)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('last_error', 255)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['campaign_key', 'email_hash']);
            $table->index(['campaign_key', 'status']);
            $table->index('waiting_list_entry_id');
        });
    }

    public function down(): void
    {
        $this->schema()->dropIfExists('waiting_list_email_deliveries');
    }
};
