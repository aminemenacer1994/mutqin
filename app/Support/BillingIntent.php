<?php

namespace App\Support;

use Illuminate\Http\Request;

final class BillingIntent
{
    public const SESSION_KEY = 'billing_intended_plan';

    public static function remember(?string $plan): void
    {
        $normalized = self::normalize($plan);
        if ($normalized === null) {
            return;
        }

        session()->put(self::SESSION_KEY, $normalized);
    }

    public static function rememberFromRequest(Request $request): void
    {
        self::remember($request->query('plan', $request->input('plan')));
    }

    public static function peek(): ?string
    {
        return self::normalize(session(self::SESSION_KEY));
    }

    public static function current(): ?string
    {
        return self::normalize(request()->query('plan')) ?? self::peek();
    }

    public static function forget(): void
    {
        session()->forget(self::SESSION_KEY);
    }

    /**
     * @return array<string, string>
     */
    public static function routeParams(): array
    {
        $plan = self::current();

        return $plan ? ['plan' => $plan] : [];
    }

    public static function normalize(mixed $plan): ?string
    {
        $key = strtolower(trim((string) $plan));
        if ($key === '' || $key === 'free') {
            return null;
        }

        $plans = config('billing.plans', []);

        return is_array($plans) && array_key_exists($key, $plans) ? $key : null;
    }
}
