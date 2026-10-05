<?php

namespace App\Console\Commands;

use App\Support\MutqinDomains;
use App\Support\Seo\SeoCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Production-oriented SEO readiness checks for GSC / Bing.
 *
 * Default (no --live): catalog + config checks against this app (safe in CI).
 * --live: also HTTP-check marketing + app hosts (production or overrides).
 */
class SeoVerifyCommand extends Command
{
    protected $signature = 'mutqin:seo-verify
                            {--live : Also HTTP-check marketing/app hosts}
                            {--base= : Override marketing origin (default https://mutqin.ai)}
                            {--app-base= : Override app origin (default https://app.mutqin.ai)}
                            {--json : Emit machine-readable JSON}';

    protected $description = 'Verify Mutqin SEO readiness (robots, sitemap, canonicals, noindex, SSR).';

    /** @var list<array{name: string, status: string, detail: string}> */
    private array $results = [];

    public function handle(): int
    {
        $this->checkAppUrlHttps();
        $this->checkHostsConfigured();
        $this->checkVerificationTokens();
        $this->checkRobotsCatalog();
        $this->checkSitemapCatalog();
        $this->checkCanonicalSample();
        $this->checkPrivateNoindex();
        $this->checkLocalHttpDocuments();

        if ($this->option('live')) {
            $this->checkLiveHosts();
        }

        return $this->finish();
    }

    private function checkAppUrlHttps(): void
    {
        $url = rtrim((string) config('app.url'), '/');
        $scheme = parse_url($url, PHP_URL_SCHEME);
        $env = (string) app()->environment();
        $protected = in_array($env, ['production', 'prod'], true);

        if ($protected) {
            $ok = is_string($scheme) && strtolower($scheme) === 'https'
                && ! Str::contains(strtolower($url), ['localhost', '127.0.0.1']);
            $this->record(
                'app_url_https',
                $ok,
                $ok ? "APP_URL is HTTPS ({$url})." : "APP_URL must be public HTTPS in production (got {$url})."
            );

            return;
        }

        $this->record(
            'app_url_https',
            true,
            "APP_URL={$url} (non-production; HTTPS enforced when APP_ENV=production)."
        );
    }

    private function checkHostsConfigured(): void
    {
        $marketing = MutqinDomains::marketingHost();
        $app = MutqinDomains::appHost();
        $ok = $marketing !== '' && $app !== '';
        $this->record(
            'hosts_configured',
            $ok,
            $ok
                ? "Marketing={$marketing}; app={$app}."
                : 'MUTQIN_MARKETING_HOST / MUTQIN_APP_HOST must be set.'
        );
    }

    private function checkVerificationTokens(): void
    {
        $google = trim((string) config('seo.google_site_verification', ''));
        $bing = trim((string) config('seo.bing_site_verification', ''));

        if ($google === '' && $bing === '') {
            $this->record(
                'verification_tokens',
                true,
                'SEO_GOOGLE_SITE_VERIFICATION / SEO_BING_SITE_VERIFICATION unset (OK until you paste real tokens). Meta tags stay omitted.',
                warn: true
            );

            return;
        }

        $parts = [];
        if ($google !== '') {
            $parts[] = 'Google meta token set ('.strlen($google).' chars)';
        }
        if ($bing !== '') {
            $parts[] = 'Bing meta token set ('.strlen($bing).' chars)';
        }

        $this->record('verification_tokens', true, implode('; ', $parts).'.');
    }

    private function checkRobotsCatalog(): void
    {
        $robots = SeoCatalog::robotsTxt();
        $ok = str_contains($robots, 'Allow: /')
            && str_contains($robots, 'Disallow: /login')
            && str_contains($robots, 'Disallow: /admin')
            && str_contains($robots, 'Disallow: /memorisation')
            && str_contains($robots, 'Disallow: /dashboard')
            && str_contains($robots, 'Sitemap:')
            && str_contains($robots, '/sitemap.xml')
            && ! preg_match('/^Disallow:\s*\/\s*$/m', $robots);

        $this->record(
            'robots_catalog',
            (bool) $ok,
            $ok
                ? 'robots.txt allows public prefixes and blocks auth/product/admin; Sitemap line present.'
                : 'robots.txt catalog looks wrong (missing Allow/Disallow/Sitemap or Disallow: /).'
        );
    }

    private function checkSitemapCatalog(): void
    {
        $entries = SeoCatalog::sitemapEntries();
        $locs = array_column($entries, 'loc');
        $forbidden = ['/login', '/register', '/dashboard', '/admin', '/memorisation', '/billing', '/profile', '/api/', '/health', '/checkout'];
        $bad = [];
        foreach ($locs as $loc) {
            $path = parse_url($loc, PHP_URL_PATH) ?: '/';
            foreach ($forbidden as $needle) {
                if ($path === $needle || str_starts_with($path, rtrim($needle, '/').'/') || $path === rtrim($needle, '/')) {
                    $bad[] = $loc;
                    break;
                }
            }
        }

        $requiredSnippets = [
            '/',
            '/waiting-list',
            '/about',
            '/features',
            '/guides',
            '/tools',
            '/tools/quran-memorization-planner',
            '/guides/quran-memorization-techniques',
        ];
        $missing = [];
        foreach ($requiredSnippets as $snippet) {
            $found = false;
            foreach ($locs as $loc) {
                $path = parse_url($loc, PHP_URL_PATH) ?: '/';
                if ($snippet === '/' ? $path === '/' : $path === $snippet) {
                    $found = true;
                    break;
                }
            }
            if (! $found) {
                $missing[] = $snippet;
            }
        }

        $ok = $entries !== [] && $bad === [] && $missing === [];
        $detail = $ok
            ? count($entries).' sitemap URL(s); no private paths; core public pages present.'
            : 'Sitemap issues: '
                .($bad !== [] ? 'private='.implode(',', $bad).' ' : '')
                .($missing !== [] ? 'missing='.implode(',', $missing) : '');

        $this->record('sitemap_catalog', $ok, trim($detail));
    }

    private function checkCanonicalSample(): void
    {
        $home = SeoCatalog::forPath('/');
        $about = SeoCatalog::forPath('/about');
        $login = SeoCatalog::forPath('/login');

        $homeOk = $home->indexable
            && str_contains($home->canonical, '://')
            && $home->robots === 'index, follow';
        $aboutOk = $about->indexable && $about->robots === 'index, follow';
        $loginOk = ! $login->indexable && str_contains($login->robots, 'noindex');

        $split = MutqinDomains::hostsDifferForSeo();
        $hostNote = $split
            ? 'Split hosts enabled (marketing vs app canonicals).'
            : 'Single-host SEO URLs (local/tests or routing disabled).';

        $ok = $homeOk && $aboutOk && $loginOk;
        $this->record(
            'canonical_sample',
            $ok,
            $ok
                ? "Home/about indexable; login noindex. {$hostNote} Home canonical={$home->canonical}"
                : 'Canonical/robots sample failed for home, about, or login.'
        );
    }

    private function checkPrivateNoindex(): void
    {
        $paths = ['/login', '/register', '/dashboard', '/memorisation', '/admin', '/profile', '/billing'];
        $failures = [];
        foreach ($paths as $path) {
            $doc = SeoCatalog::forPath($path);
            if ($doc->indexable || ! str_contains($doc->robots, 'noindex')) {
                $failures[] = $path;
            }
        }

        $this->record(
            'private_noindex',
            $failures === [],
            $failures === []
                ? 'Auth/product/admin sample paths are noindex.'
                : 'Accidentally indexable: '.implode(', ', $failures)
        );
    }

    private function checkLocalHttpDocuments(): void
    {
        $samples = [
            ['/', true, 'Quran Memorization'],
            ['/waiting-list', true, null],
            ['/about', true, null],
            ['/features/ai-recite', true, 'AI'],
            ['/guides/quran-memorization-techniques', true, 'memorize'],
            ['/tools/quran-memorization-planner', true, 'planner'],
            ['/login', false, null],
            ['/robots.txt', null, 'Sitemap:'],
            ['/sitemap.xml', null, '<urlset'],
        ];

        $failures = [];
        foreach ($samples as [$path, $expectIndexable, $needle]) {
            $response = $this->getLocal($path);
            if ($response === null) {
                $failures[] = "{$path} (no response)";
                continue;
            }

            $status = $response->getStatusCode();
            $body = $response->getContent() ?: '';

            if ($path === '/robots.txt' || $path === '/sitemap.xml') {
                if ($status !== 200 || ($needle && ! str_contains($body, $needle))) {
                    $failures[] = "{$path} status={$status}";
                }
                continue;
            }

            if ($status !== 200) {
                $failures[] = "{$path} status={$status}";
                continue;
            }

            if (! preg_match('#<title>([^<]+)</title>#i', $body, $titleMatch)) {
                $failures[] = "{$path} missing <title>";
                continue;
            }

            if (! preg_match('#name="description"#i', $body)) {
                $failures[] = "{$path} missing description";
            }

            if (! preg_match('#rel="canonical"#i', $body)) {
                $failures[] = "{$path} missing canonical";
            }

            $robots = null;
            if (preg_match('#name="robots"\s+content="([^"]+)"#i', $body, $robotsMatch)
                || preg_match('#content="([^"]+)"\s+name="robots"#i', $body, $robotsMatch)) {
                $robots = strtolower($robotsMatch[1]);
            }

            if ($expectIndexable === true) {
                if ($robots !== null && str_contains($robots, 'noindex')) {
                    $failures[] = "{$path} unexpected noindex";
                }
                if ($needle && ! str_contains(strtolower($body), strtolower($needle))
                    && ! str_contains(strtolower($titleMatch[1]), strtolower($needle))) {
                    $failures[] = "{$path} missing expected content/title needle";
                }
                if (! str_contains($body, 'seo-ssr') && ! str_contains($body, '<h1')) {
                    $failures[] = "{$path} missing prerendered content markers";
                }
            }

            if ($expectIndexable === false && ($robots === null || ! str_contains($robots, 'noindex'))) {
                $failures[] = "{$path} missing noindex";
            }
        }

        $this->record(
            'local_http_documents',
            $failures === [],
            $failures === []
                ? 'Local routes return 200 with title/description/canonical; private sample is noindex; SSR markers present.'
                : 'Local document failures: '.implode('; ', array_slice($failures, 0, 8))
        );
    }

    private function checkLiveHosts(): void
    {
        $marketing = rtrim((string) ($this->option('base') ?: config('seo.verify.marketing_base')), '/');
        $app = rtrim((string) ($this->option('app-base') ?: config('seo.verify.app_base')), '/');
        $timeout = (int) config('seo.verify.timeout', 20);

        $checks = [
            [$marketing.'/robots.txt', 200, ['Allow: /', 'Sitemap:', 'Disallow: /login'], false],
            [$marketing.'/sitemap.xml', 200, ['<urlset', '/waiting-list', '/tools/'], false],
            [$marketing.'/', 200, ['<title>', 'rel="canonical"', 'name="description"'], true],
            [$marketing.'/waiting-list', 200, ['<title>', 'canonical'], true],
            [$app.'/about', 200, ['<title>', 'canonical', 'index, follow'], true],
            [$app.'/features/ai-recite', 200, ['<title>', 'application/ld+json'], true],
            [$app.'/guides/quran-memorization-techniques', 200, ['<title>', 'seo-ssr'], true],
            [$app.'/tools/quran-memorization-planner', 200, ['<title>', 'seo-ssr'], true],
            [$app.'/login', 200, ['noindex'], false],
            ['https://www.'.ltrim(parse_url($marketing, PHP_URL_HOST) ?: 'mutqin.ai', '.').'/', 301, [], false],
        ];

        $failures = [];
        foreach ($checks as [$url, $expectStatus, $needles, $requireIndex]) {
            try {
                $response = Http::timeout($timeout)
                    ->withHeaders(['User-Agent' => 'MutqinSeoVerify/1.0'])
                    ->withOptions(['allow_redirects' => false])
                    ->get($url);
            } catch (\Throwable $e) {
                $failures[] = "{$url} error: ".$e->getMessage();
                continue;
            }

            $status = $response->status();
            $body = $response->body();

            if ($expectStatus === 301) {
                if (! in_array($status, [301, 308], true)) {
                    $failures[] = "{$url} expected 301, got {$status}";
                }
                continue;
            }

            if ($status !== $expectStatus) {
                $failures[] = "{$url} expected {$expectStatus}, got {$status}";
                continue;
            }

            foreach ($needles as $needle) {
                if (! str_contains($body, $needle)) {
                    $failures[] = "{$url} missing {$needle}";
                }
            }

            if ($requireIndex && preg_match('#name="robots"\s+content="([^"]*noindex[^"]*)"#i', $body)) {
                $failures[] = "{$url} has noindex on public page";
            }
        }

        $this->record(
            'live_http',
            $failures === [],
            $failures === []
                ? "Live checks passed for {$marketing} and {$app}."
                : 'Live failures: '.implode('; ', array_slice($failures, 0, 10))
        );
    }

    /**
     * @return \Symfony\Component\HttpFoundation\Response|null
     */
    private function getLocal(string $path)
    {
        try {
            /** @var \Illuminate\Foundation\Http\Kernel $kernel */
            $kernel = app(\Illuminate\Contracts\Http\Kernel::class);
            $request = \Illuminate\Http\Request::create($path, 'GET');

            return $kernel->handle($request);
        } catch (\Throwable $e) {
            $this->warn("Local request failed for {$path}: ".$e->getMessage());

            return null;
        }
    }

    private function record(string $name, bool $pass, string $detail, bool $warn = false): void
    {
        $status = $pass ? ($warn ? 'WARN' : 'PASS') : 'FAIL';
        $this->results[] = [
            'name' => $name,
            'status' => $status,
            'detail' => $detail,
        ];
    }

    private function finish(): int
    {
        $failed = 0;
        $warned = 0;

        if ($this->option('json')) {
            foreach ($this->results as $row) {
                if ($row['status'] === 'FAIL') {
                    $failed++;
                }
                if ($row['status'] === 'WARN') {
                    $warned++;
                }
            }
            $this->line(json_encode([
                'ok' => $failed === 0,
                'failed' => $failed,
                'warned' => $warned,
                'checks' => $this->results,
            ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

            return $failed === 0 ? self::SUCCESS : self::FAILURE;
        }

        $this->newLine();
        $this->info('Mutqin SEO verification');
        $this->line(str_repeat('-', 72));

        foreach ($this->results as $row) {
            $label = str_pad($row['status'], 4);
            if ($row['status'] === 'PASS') {
                $this->line("<info>{$label}</info>  {$row['name']}: {$row['detail']}");
            } elseif ($row['status'] === 'WARN') {
                $this->warn("{$label}  {$row['name']}: {$row['detail']}");
                $warned++;
            } else {
                $this->error("{$label}  {$row['name']}: {$row['detail']}");
                $failed++;
            }
        }

        $this->line(str_repeat('-', 72));
        if ($failed === 0) {
            $this->info('Result: PASS'.($warned ? " ({$warned} warning(s))" : ''));
            $this->line('Manual next: verify DNS/meta in GSC + Bing, then submit https://mutqin.ai/sitemap.xml');
        } else {
            $this->error("Result: FAIL ({$failed} check(s))");
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
