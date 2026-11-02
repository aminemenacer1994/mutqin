<?php

namespace App\Support;

use App\Jobs\SendRegisteredUserBroadcastEmailJob;
use App\Jobs\SendWaitingListLaunchEmailJob;
use App\Models\RegisteredUserEmailDelivery;
use App\Models\User;
use App\Models\WaitingListEmailDelivery;
use App\Models\WaitingListEntry;
use App\Services\RegisteredUserBroadcastCampaignService;
use App\Services\WaitingListLaunchCampaignService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\PendingDispatch;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Shared delivery guard for registered-user and waiting-list campaigns.
 *
 * Bulk sends stay on the queue when a worker is running. A scheduler command
 * and the admin pump endpoint drain the same delivery rows when it is not,
 * so production does not depend on a localhost worker.
 */
final class BulkMailQueue
{
    public static function assertDeliverable(): void
    {
        if (! app()->environment('production', 'staging')) {
            return;
        }

        $mailer = strtolower(trim((string) config('mail.default', 'log')));
        $from = strtolower(trim((string) config('mail.from.address', '')));
        $key = trim((string) config('services.resend.key', ''));
        $placeholder = $from === '' || str_ends_with($from, '@example.com');
        $ok = in_array($mailer, ['resend', 'smtp'], true)
            && ! $placeholder
            && ($mailer !== 'resend' || $key !== '');

        if (! $ok) {
            throw ValidationException::withMessages([
                'campaign' => [__('admin.mail.not_configured')],
            ]);
        }
    }

    /**
     * sync/null drivers would send an entire list inside the HTTP request.
     * Park those jobs on the database queue instead. Async drivers stay put.
     */
    public static function queueConnection(): ?string
    {
        $name = (string) config('queue.default', 'database');
        $driver = (string) config("queue.connections.{$name}.driver", $name);

        if (in_array($driver, ['sync', 'null', 'deferred', 'background'], true)) {
            return 'database';
        }

        return null;
    }

    public static function route(PendingDispatch $dispatch): PendingDispatch
    {
        $connection = self::queueConnection();
        if (is_string($connection) && $connection !== '') {
            $dispatch->onConnection($connection);
        }

        return $dispatch;
    }

    public static function kickAfterResponse(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        app()->terminating(function (): void {
            try {
                Artisan::call('mutqin:deliver-campaign-email', [
                    '--limit' => 40,
                    '--max-seconds' => 25,
                ]);
            } catch (Throwable $exception) {
                MutqinLog::error('mail.campaign_deliver_kick_failed', [
                    'error' => self::safeError($exception),
                ]);
            }
        });
    }

    /**
     * Claim one delivery row so two workers cannot both send it.
     */
    public static function claim(Model $delivery): bool
    {
        $claimed = $delivery->newQuery()
            ->whereKey($delivery->getKey())
            ->where(function ($query): void {
                $query->whereIn('status', [
                    RegisteredUserEmailDelivery::STATUS_PENDING,
                    RegisteredUserEmailDelivery::STATUS_FAILED,
                ])->orWhere(function ($query): void {
                    $query->where('status', RegisteredUserEmailDelivery::STATUS_SENDING)
                        ->where('updated_at', '<=', now()->subMinutes(2));
                });
            })
            ->update([
                'status' => RegisteredUserEmailDelivery::STATUS_SENDING,
                'attempts' => DB::raw('attempts + 1'),
                'last_error' => null,
            ]);

        return $claimed === 1;
    }

    public static function safeError(Throwable $exception): string
    {
        $message = trim($exception->getMessage());
        $message = preg_replace('/\bre_[A-Za-z0-9_]+/', '[redacted]', $message) ?? '';
        $message = preg_replace('/Bearer\s+\S+/i', 'Bearer [redacted]', $message) ?? '';
        $message = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[email]', $message) ?? '';
        $message = trim($message);

        if ($message === '') {
            $message = 'Mail provider rejected the message.';
        }

        return mb_substr($message, 0, 255);
    }

    /**
     * @param  'all'|'registered'|'waiting_list'  $only
     * @return array{processed: int, registered: array{pending: int, sent: int, failed: int, skipped: int}, waiting_list: array{pending: int, sent: int, failed: int, skipped: int}}
     */
    public static function deliverPending(int $limit = 25, int $maxSeconds = 15, string $only = 'all'): array
    {
        $deadline = microtime(true) + max(1, $maxSeconds);
        $remaining = max(1, $limit);
        $processed = 0;

        if ($only !== 'waiting_list' && $remaining > 0 && microtime(true) < $deadline) {
            try {
                $sent = self::deliverRegistered($remaining, $deadline);
                $processed += $sent;
                $remaining -= $sent;
            } catch (Throwable $exception) {
                MutqinLog::error('registered_users.broadcast_email.batch_failed', [
                    'error' => self::safeError($exception),
                ]);
            }
        }

        if ($only !== 'registered' && $remaining > 0 && microtime(true) < $deadline) {
            try {
                $processed += self::deliverWaiting($remaining, $deadline);
            } catch (Throwable $exception) {
                MutqinLog::error('waiting_list.launch_email.batch_failed', [
                    'error' => self::safeError($exception),
                ]);
            }
        }

        return [
            'processed' => $processed,
            'registered' => app(RegisteredUserBroadcastCampaignService::class)->deliveryCounts(),
            'waiting_list' => app(WaitingListLaunchCampaignService::class)->deliveryCounts(),
        ];
    }

    private static function deliverRegistered(int $limit, float $deadline): int
    {
        if (! Schema::hasTable('registered_user_email_deliveries')) {
            return 0;
        }

        $rows = self::dueDeliveries(RegisteredUserEmailDelivery::query(), $limit);
        $processed = 0;

        foreach ($rows as $row) {
            if (microtime(true) >= $deadline) {
                break;
            }

            $user = $row->user_id ? User::query()->find($row->user_id) : null;
            if (! $user instanceof User || trim((string) $user->email) === '') {
                $row->update([
                    'status' => RegisteredUserEmailDelivery::STATUS_SKIPPED,
                    'skip_reason' => 'missing',
                ]);
                $processed++;

                continue;
            }

            $email = WaitingListEmailHash::normalize((string) $user->email);
            if (WaitingListEmailHash::digest($email) !== (string) $row->email_hash) {
                $row->update([
                    'status' => RegisteredUserEmailDelivery::STATUS_SKIPPED,
                    'skip_reason' => 'mismatch',
                ]);
                $processed++;

                continue;
            }

            try {
                (new SendRegisteredUserBroadcastEmailJob(
                    (string) $row->campaign_key,
                    (int) $user->id,
                    $email,
                    (string) ($user->name ?? ''),
                    false,
                ))->handle();
            } catch (Throwable) {
                // The job already stored a sanitized last_error and will retry on the queue.
            }

            $processed++;
        }

        return $processed;
    }

    private static function deliverWaiting(int $limit, float $deadline): int
    {
        $connection = (new WaitingListEmailDelivery)->getConnectionName();
        if (! Schema::connection($connection)->hasTable('waiting_list_email_deliveries')) {
            return 0;
        }

        $rows = self::dueDeliveries(WaitingListEmailDelivery::query(), $limit);
        $processed = 0;

        foreach ($rows as $row) {
            if (microtime(true) >= $deadline) {
                break;
            }

            $entry = $row->waiting_list_entry_id
                ? WaitingListEntry::query()->find($row->waiting_list_entry_id)
                : null;

            if (! $entry instanceof WaitingListEntry || trim((string) $entry->email) === '') {
                $row->update([
                    'status' => WaitingListEmailDelivery::STATUS_SKIPPED,
                    'skip_reason' => 'missing',
                ]);
                $processed++;

                continue;
            }

            $email = WaitingListEmailHash::normalize((string) $entry->email);
            if (WaitingListEmailHash::digest($email) !== (string) $row->email_hash) {
                $row->update([
                    'status' => WaitingListEmailDelivery::STATUS_SKIPPED,
                    'skip_reason' => 'mismatch',
                ]);
                $processed++;

                continue;
            }

            try {
                (new SendWaitingListLaunchEmailJob(
                    (string) $row->campaign_key,
                    (int) $entry->id,
                    $email,
                    (string) ($entry->name ?? ''),
                    false,
                ))->handle();
            } catch (Throwable) {
                // Recorded on the delivery row.
            }

            $processed++;
        }

        return $processed;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<RegisteredUserEmailDelivery|WaitingListEmailDelivery>  $query
     * @return \Illuminate\Support\Collection<int, RegisteredUserEmailDelivery|WaitingListEmailDelivery>
     */
    private static function dueDeliveries($query, int $limit)
    {
        return $query
            ->where(function ($inner): void {
                $inner->where('status', RegisteredUserEmailDelivery::STATUS_PENDING)
                    ->orWhere(function ($stale): void {
                        $stale->where('status', RegisteredUserEmailDelivery::STATUS_SENDING)
                            ->where('updated_at', '<=', now()->subMinutes(2));
                    });
            })
            ->orderBy('id')
            ->limit($limit)
            ->get();
    }
}
