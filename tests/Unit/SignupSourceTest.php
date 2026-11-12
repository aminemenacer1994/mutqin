<?php

namespace Tests\Unit;

use App\Support\Analytics\SignupSource;
use PHPUnit\Framework\TestCase;

class SignupSourceTest extends TestCase
{
    public function test_missing_source_is_unattributed_and_not_a_channel(): void
    {
        $source = SignupSource::classify(null, null, null);

        $this->assertSame('unattributed', $source['key']);
        $this->assertFalse($source['verified']);
    }

    public function test_known_channels_and_referral_codes_are_classified_once(): void
    {
        $this->assertSame('direct', SignupSource::classify('direct', null, null)['key']);
        $this->assertSame('whatsapp', SignupSource::classify('WhatsApp', null, null)['key']);
        $this->assertSame('instagram', SignupSource::classify('ig', null, null)['key']);
        $this->assertSame('organic_search', SignupSource::classify('google', 'organic', null)['key']);
        $this->assertSame('other', SignupSource::classify('google', 'cpc', null)['key']);
        $this->assertSame('Newsletter', SignupSource::classify('newsletter', 'email', null)['label']);
        $this->assertSame('referrals', SignupSource::classify('newsletter', 'email', 'halaqa')['key']);
    }
}
