<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class StripeProvisionLiveCommandTest extends TestCase
{
    public function test_command_refuses_without_live_secret(): void
    {
        config(['services.stripe.secret_key' => 'sk_test_x']);

        $this->artisan('mutqin:stripe-provision-live')
            ->expectsOutputToContain('sk_live_')
            ->assertFailed();
    }

    public function test_command_provisions_prices_and_webhook(): void
    {
        config(['services.stripe.secret_key' => 'sk_live_test']);

        $priceCreates = 0;

        Http::fake(function ($request) use (&$priceCreates) {
            $url = (string) $request->url();
            $method = $request->method();

            if (str_contains($url, '/webhook_endpoints') && $method === 'GET') {
                return Http::response(['object' => 'list', 'data' => []], 200);
            }

            if (str_contains($url, '/webhook_endpoints') && $method === 'POST') {
                return Http::response(['id' => 'we_1', 'secret' => 'whsec_live_test'], 200);
            }

            if (str_contains($url, '/products') && $method === 'GET') {
                return Http::response([
                    'object' => 'list',
                    'data' => [
                        ['id' => 'prod_pro', 'name' => 'Mutqin Pro'],
                        ['id' => 'prod_prem', 'name' => 'Mutqin Premium'],
                    ],
                ], 200);
            }

            if (str_contains($url, '/prices') && $method === 'GET') {
                return Http::response(['object' => 'list', 'data' => []], 200);
            }

            if (str_contains($url, '/prices') && $method === 'POST') {
                $priceCreates++;
                $ids = [
                    1 => 'price_pro_m',
                    2 => 'price_pro_y',
                    3 => 'price_pre_m',
                    4 => 'price_pre_y',
                ];

                return Http::response(['id' => $ids[$priceCreates] ?? 'price_x'], 200);
            }

            return Http::response(['error' => ['message' => 'Unexpected '.$method.' '.$url]], 400);
        });

        $this->artisan('mutqin:stripe-provision-live')
            ->expectsOutputToContain('STRIPE_PRICE_PRO_MONTHLY=price_pro_m')
            ->expectsOutputToContain('STRIPE_WEBHOOK_SECRET=whsec_live_test')
            ->assertSuccessful();
    }
}
