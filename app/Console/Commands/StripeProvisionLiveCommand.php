<?php

namespace App\Console\Commands;

use App\Support\MutqinDomains;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class StripeProvisionLiveCommand extends Command
{
    protected $signature = 'mutqin:stripe-provision-live
                            {--write-env : Update STRIPE_PRICE_* and STRIPE_WEBHOOK_SECRET in .env}
                            {--dry-run : Show actions without calling Stripe}';

    protected $description = 'Create Live Stripe prices + webhook for Mutqin billing (requires sk_live_ in .env).';

    /**
     * @return array<string, array{product: string, amount: int, interval: string, env: string}>
     */
    private function planCatalog(): array
    {
        return [
            'pro_monthly' => [
                'product' => 'Mutqin Pro',
                'amount' => 599,
                'interval' => 'month',
                'env' => 'STRIPE_PRICE_PRO_MONTHLY',
            ],
            'pro_yearly' => [
                'product' => 'Mutqin Pro',
                'amount' => 5391,
                'interval' => 'year',
                'env' => 'STRIPE_PRICE_PRO_YEARLY',
            ],
            'premium_monthly' => [
                'product' => 'Mutqin Premium',
                'amount' => 999,
                'interval' => 'month',
                'env' => 'STRIPE_PRICE_PREMIUM_MONTHLY',
            ],
            'premium_yearly' => [
                'product' => 'Mutqin Premium',
                'amount' => 1799,
                'interval' => 'year',
                'env' => 'STRIPE_PRICE_PREMIUM_YEARLY',
            ],
        ];
    }

    /** @var list<string> */
    private array $webhookEvents = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
    ];

    public function handle(): int
    {
        $secret = trim((string) config('services.stripe.secret_key'));
        if ($secret === '') {
            $this->error('STRIPE_SECRET_KEY is empty.');

            return self::FAILURE;
        }

        if (! str_starts_with($secret, 'sk_live_')) {
            $this->error('STRIPE_SECRET_KEY must be a live key (sk_live_).');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $webhookUrl = 'https://'.MutqinDomains::appHost().'/api/stripe/webhook';
        $this->info('Stripe Live provisioning');
        $this->line('Webhook URL: '.$webhookUrl);

        $envUpdates = [];

        foreach ($this->planCatalog() as $planKey => $plan) {
            if ($dryRun) {
                $this->line("[dry-run] Would ensure price for {$planKey} ({$plan['amount']} gbp / {$plan['interval']})");
                continue;
            }

            $priceId = $this->ensurePrice($secret, $planKey, $plan);
            if ($priceId === null) {
                return self::FAILURE;
            }

            $envUpdates[$plan['env']] = $priceId;
            $this->info("{$planKey}: {$priceId}");
        }

        if ($dryRun) {
            $this->line('[dry-run] Would ensure webhook endpoint.');

            return self::SUCCESS;
        }

        $webhookSecret = $this->ensureWebhook($secret, $webhookUrl);
        if ($webhookSecret === null) {
            return self::FAILURE;
        }

        $envUpdates['STRIPE_WEBHOOK_SECRET'] = $webhookSecret;
        $this->info('Webhook signing secret captured (whsec_…).');

        $this->newLine();
        $this->line('Add to Laravel Cloud (and verify locally):');
        foreach ($envUpdates as $key => $value) {
            $this->line("{$key}={$value}");
        }

        if ($this->option('write-env')) {
            $this->writeEnvUpdates($envUpdates);
            $this->info('Updated .env with price IDs and webhook secret.');
            $this->warn('Run the same values on Laravel Cloud → Environment, then redeploy.');
        } else {
            $this->warn('Re-run with --write-env to persist these values in .env');
        }

        return self::SUCCESS;
    }

    /**
     * @param  array{product: string, amount: int, interval: string, env: string}  $plan
     */
    private function ensurePrice(string $secret, string $planKey, array $plan): ?string
    {
        $existing = $this->findPriceByMetadata($secret, $planKey);
        if ($existing !== null) {
            $this->line("Reusing existing price for {$planKey}: {$existing}");

            return $existing;
        }

        $productId = $this->ensureProduct($secret, $plan['product']);
        if ($productId === null) {
            return null;
        }

        $response = $this->stripePost($secret, 'prices', [
            'currency' => 'gbp',
            'unit_amount' => $plan['amount'],
            'recurring[interval]' => $plan['interval'],
            'product' => $productId,
            'metadata[mutqin_plan]' => $planKey,
        ]);

        $priceId = (string) ($response['id'] ?? '');
        if ($priceId === '') {
            $this->error("Failed to create price for {$planKey}.");

            return null;
        }

        return $priceId;
    }

    private function ensureProduct(string $secret, string $name): ?string
    {
        $products = $this->stripeGet($secret, 'products', ['active' => 'true', 'limit' => 100]);
        foreach ($products['data'] ?? [] as $product) {
            if (is_array($product) && ($product['name'] ?? '') === $name) {
                return (string) $product['id'];
            }
        }

        $response = $this->stripePost($secret, 'products', [
            'name' => $name,
            'metadata[mutqin]' => '1',
        ]);

        $id = (string) ($response['id'] ?? '');

        return $id !== '' ? $id : null;
    }

    private function findPriceByMetadata(string $secret, string $planKey): ?string
    {
        $prices = $this->stripeGet($secret, 'prices', ['active' => 'true', 'limit' => 100]);
        foreach ($prices['data'] ?? [] as $price) {
            if (! is_array($price)) {
                continue;
            }
            if (($price['metadata']['mutqin_plan'] ?? '') === $planKey) {
                return (string) ($price['id'] ?? '');
            }
        }

        return null;
    }

    private function ensureWebhook(string $secret, string $url): ?string
    {
        $endpoints = $this->stripeGet($secret, 'webhook_endpoints', ['limit' => 20]);
        foreach ($endpoints['data'] ?? [] as $endpoint) {
            if (! is_array($endpoint)) {
                continue;
            }
            if (($endpoint['url'] ?? '') === $url) {
                $secretValue = (string) ($endpoint['secret'] ?? '');
                if ($secretValue !== '') {
                    $this->line('Reusing existing webhook endpoint.');

                    return $secretValue;
                }

                $this->warn('Webhook exists but signing secret is not returned. Roll the endpoint secret in Stripe Dashboard → Webhooks → '.$url);

                return trim((string) config('services.stripe.webhook_secret')) ?: null;
            }
        }

        $payload = [
            'url' => $url,
            'description' => 'Mutqin billing (Live)',
        ];
        foreach ($this->webhookEvents as $index => $event) {
            $payload["enabled_events[{$index}]"] = $event;
        }

        $response = $this->stripePost($secret, 'webhook_endpoints', $payload);
        $secretValue = (string) ($response['secret'] ?? '');
        if ($secretValue === '') {
            $this->error('Webhook created but no signing secret was returned.');

            return null;
        }

        return $secretValue;
    }

    /**
     * @param  array<string, string>  $updates
     */
    private function writeEnvUpdates(array $updates): void
    {
        $path = base_path('.env');
        if (! is_file($path)) {
            $this->error('.env not found.');

            return;
        }

        $contents = file_get_contents($path);
        if ($contents === false) {
            $this->error('Could not read .env.');

            return;
        }

        foreach ($updates as $key => $value) {
            $line = $key.'='.$value;
            if (preg_match('/^'.preg_quote($key, '/').'=.*$/m', $contents)) {
                $contents = preg_replace('/^'.preg_quote($key, '/').'=.*$/m', $line, $contents) ?? $contents;
            } else {
                $contents = rtrim($contents)."\n".$line."\n";
            }
        }

        file_put_contents($path, $contents);
    }

    /**
     * @param  array<string, string|int>  $query
     * @return array<string, mixed>
     */
    private function stripeGet(string $secret, string $path, array $query = []): array
    {
        $response = Http::asForm()
            ->timeout(30)
            ->withToken($secret)
            ->acceptJson()
            ->get("https://api.stripe.com/v1/{$path}", $query);

        if (! $response->successful()) {
            $this->error($response->json('error.message') ?? 'Stripe request failed.');

            return [];
        }

        return $response->json() ?? [];
    }

    /**
     * @param  array<string, string|int>  $data
     * @return array<string, mixed>
     */
    private function stripePost(string $secret, string $path, array $data): array
    {
        $response = Http::asForm()
            ->timeout(30)
            ->withToken($secret)
            ->acceptJson()
            ->post("https://api.stripe.com/v1/{$path}", $data);

        if (! $response->successful()) {
            $this->error($response->json('error.message') ?? 'Stripe request failed.');

            return [];
        }

        return $response->json() ?? [];
    }
}
