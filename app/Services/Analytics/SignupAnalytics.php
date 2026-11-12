<?php

namespace App\Services\Analytics;

use App\Models\User;
use App\Support\Analytics\Acquisition;
use App\Support\Analytics\ProductEventName;
use Illuminate\Http\Request;

/** Persist first-touch labels and the signup completion event. Does not throw. */
final class SignupAnalytics
{
    public function __construct(private readonly ProductEventRecorder $events) {}

    public function capture(User $user, Request $request, string $method): void
    {
        $acquisition = Acquisition::fromRequest($request);
        $fill = [];
        if ($acquisition['utm_source'] !== null && $user->signup_utm_source === null) {
            $fill['signup_utm_source'] = $acquisition['utm_source'];
        }
        if ($acquisition['utm_medium'] !== null && $user->signup_utm_medium === null) {
            $fill['signup_utm_medium'] = $acquisition['utm_medium'];
        }
        if ($acquisition['utm_campaign'] !== null && $user->signup_utm_campaign === null) {
            $fill['signup_utm_campaign'] = $acquisition['utm_campaign'];
        }
        if ($acquisition['referral_code'] !== null && $user->signup_referral_code === null) {
            $fill['signup_referral_code'] = $acquisition['referral_code'];
        }
        if ($fill !== []) {
            $user->forceFill($fill)->save();
        }

        $safeMethod = in_array($method, ['email', 'google', 'demo'], true) ? $method : 'email';
        $this->events->recordQuietly(
            ProductEventName::SIGNUP_COMPLETED,
            $user,
            $acquisition['anonymous_id'],
            'user:'.$user->id.':signup',
            ['method' => $safeMethod],
            $acquisition,
        );

        if ($user->signup_referral_code) {
            $this->events->recordQuietly(
                ProductEventName::REFERRAL_SIGNUP_COMPLETED,
                $user,
                $acquisition['anonymous_id'],
                'user:'.$user->id.':referral-signup',
                ['method' => $safeMethod],
                $acquisition,
            );
        }
    }
}
