<?php

namespace App\Jobs;

use App\Mail\RegisteredUserBroadcastMail;
use App\Models\RegisteredUserEmailDelivery;
use App\Models\User;
use App\Support\BulkMailQueue;
use App\Support\MutqinLog;
use App\Support\TransactionalMail;
use App\Support\WaitingListEmailHash;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendRegisteredUserBroadcastEmailJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 45;

    /** @var list<int> */
    public array $backoff = [30, 120, 300, 900];

    public function __construct(
        public string $campaignKey,
        public ?int $userId,
        public string $email,
        public string $name,
        public bool $isTest = false,
    ) {}

    public function handle(): void
    {
        $email = WaitingListEmailHash::normalize($this->email);
        $delivery = null;

        if (! $this->isTest) {
            $delivery = RegisteredUserEmailDelivery::query()
                ->where('campaign_key', $this->campaignKey)
                ->where('email_hash', WaitingListEmailHash::digest($email))
                ->first();

            if (! $delivery) {
                return;
            }

            if ($delivery->status === RegisteredUserEmailDelivery::STATUS_SENT) {
                return;
            }

            if ($delivery->status === RegisteredUserEmailDelivery::STATUS_SKIPPED) {
                return;
            }

            $user = $this->userId ? User::query()->find($this->userId) : null;
            if ($user instanceof User && $user->email_verified_at === null) {
                $delivery->update([
                    'status' => RegisteredUserEmailDelivery::STATUS_SKIPPED,
                    'skip_reason' => 'unverified',
                ]);

                return;
            }

            if (! BulkMailQueue::claim($delivery)) {
                return;
            }
        }

        try {
            Mail::to($email)->send(new RegisteredUserBroadcastMail(
                recipientName: trim($this->name) !== '' ? trim($this->name) : 'there',
                platformUrl: TransactionalMail::homeUrl(),
            ));

            if ($delivery) {
                $delivery->update([
                    'status' => RegisteredUserEmailDelivery::STATUS_SENT,
                    'sent_at' => now(),
                    'last_error' => null,
                ]);
            }

            MutqinLog::info('registered_users.broadcast_email.sent', [
                'campaign_key' => $this->campaignKey,
                'email_hash' => WaitingListEmailHash::digest($email),
                'user_id' => $this->userId,
                'test' => $this->isTest,
            ]);
        } catch (Throwable $exception) {
            if ($delivery) {
                $delivery->update([
                    'status' => RegisteredUserEmailDelivery::STATUS_FAILED,
                    'last_error' => BulkMailQueue::safeError($exception),
                ]);
            }

            MutqinLog::error('registered_users.broadcast_email.failed', [
                'campaign_key' => $this->campaignKey,
                'email_hash' => WaitingListEmailHash::digest($email),
                'user_id' => $this->userId,
                'test' => $this->isTest,
            ]);

            throw $exception;
        }
    }
}
