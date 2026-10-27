<?php

namespace App\Jobs;

use App\Mail\WaitingListLaunchMail;
use App\Models\WaitingListEmailDelivery;
use App\Models\WaitingListEntry;
use App\Support\MutqinLog;
use App\Support\TransactionalMail;
use App\Support\WaitingListEmailHash;
use App\Support\WaitingListUnsubscribe;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendWaitingListLaunchEmailJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [30, 120, 300, 900];

    public function __construct(
        public string $campaignKey,
        public ?int $entryId,
        public string $email,
        public string $name,
        public bool $isTest = false,
    ) {}

    public function handle(): void
    {
        $email = WaitingListEmailHash::normalize($this->email);
        $delivery = null;

        if (! $this->isTest) {
            $delivery = WaitingListEmailDelivery::query()
                ->where('campaign_key', $this->campaignKey)
                ->where('email_hash', WaitingListEmailHash::digest($email))
                ->first();

            if (! $delivery) {
                return;
            }

            if ($delivery->status === WaitingListEmailDelivery::STATUS_SENT) {
                return;
            }

            if ($delivery->status === WaitingListEmailDelivery::STATUS_SKIPPED) {
                return;
            }

            $entry = $this->entryId
                ? WaitingListEntry::query()->find($this->entryId)
                : null;

            if ($entry instanceof WaitingListEntry
                && ($entry->unsubscribed_at || $entry->bounced_at || $entry->marked_invalid_at)) {
                $delivery->update([
                    'status' => WaitingListEmailDelivery::STATUS_SKIPPED,
                    'skip_reason' => 'suppressed',
                ]);

                return;
            }
        }

        $platformUrl = TransactionalMail::homeUrl();
        $unsubscribeUrl = '';

        if ($this->isTest) {
            $unsubscribeUrl = $platformUrl.'/waiting-list/unsubscribe/preview';
        } elseif ($entry instanceof WaitingListEntry) {
            $unsubscribeUrl = WaitingListUnsubscribe::signedUrl($entry);
        }

        try {
            Mail::to($email)->send(new WaitingListLaunchMail(
                recipientName: trim($this->name) !== '' ? trim($this->name) : 'there',
                platformUrl: $platformUrl,
                unsubscribeUrl: $unsubscribeUrl,
            ));

            if ($delivery) {
                $delivery->update([
                    'status' => WaitingListEmailDelivery::STATUS_SENT,
                    'sent_at' => now(),
                    'attempts' => $delivery->attempts + 1,
                    'last_error' => null,
                ]);
            }

            MutqinLog::info('waiting_list.launch_email.sent', [
                'campaign_key' => $this->campaignKey,
                'email_hash' => WaitingListEmailHash::digest($email),
                'waiting_list_entry_id' => $this->entryId,
                'test' => $this->isTest,
            ]);
        } catch (Throwable $exception) {
            if ($delivery) {
                $delivery->update([
                    'status' => WaitingListEmailDelivery::STATUS_FAILED,
                    'attempts' => $delivery->attempts + 1,
                    'last_error' => mb_substr($exception->getMessage(), 0, 255),
                ]);
            }

            MutqinLog::error('waiting_list.launch_email.failed', [
                'campaign_key' => $this->campaignKey,
                'email_hash' => WaitingListEmailHash::digest($email),
                'waiting_list_entry_id' => $this->entryId,
                'test' => $this->isTest,
            ]);

            throw $exception;
        }
    }
}
