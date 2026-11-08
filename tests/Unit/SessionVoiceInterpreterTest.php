<?php

namespace Tests\Unit;

use App\Services\AskMutqin\CommandValidator;
use App\Services\AskMutqin\SessionVoiceInterpreter;
use PHPUnit\Framework\TestCase;

class SessionVoiceInterpreterTest extends TestCase
{
    private SessionVoiceInterpreter $interpreter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->interpreter = new SessionVoiceInterpreter(new CommandValidator());
    }

    public function test_full_fatiha_request(): void
    {
        $result = $this->interpreter->interpret(
            'I want to recite Surah Al-Fatiha from ayah 1 to ayah 5, I want the reciter to be Al-Sudais and I want this set repeated 3 times at slow speed, 0.5x.'
        );

        $this->assertTrue($result['ok']);
        $this->assertSame('recite', $result['command']['mode']);
        $this->assertSame('memorise', $result['command']['goal']);
        $this->assertSame(1, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
        $this->assertSame('ar.abdurrahmaansudais', $result['command']['reciter']);
        $this->assertSame(3, $result['command']['repetitions']);
        $this->assertSame(0.5, $result['command']['speed']);
    }

    public function test_baqarah_with_mishary_at_normal_speed(): void
    {
        $result = $this->interpreter->interpret(
            'Play Surah Al-Baqarah from verse 10 to 20 with Mishary at normal speed.'
        );

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['command']['surah']);
        $this->assertSame(10, $result['command']['start_ayah']);
        $this->assertSame(20, $result['command']['end_ayah']);
        $this->assertSame('ar.alafasy', $result['command']['reciter']);
        $this->assertSame(1.0, $result['command']['speed']);
        $this->assertNull($result['command']['repetitions']);
    }

    public function test_memorise_first_five_of_yasin(): void
    {
        $result = $this->interpreter->interpret('Help me memorise the first five ayahs of Surah Yasin.');

        $this->assertTrue($result['ok']);
        $this->assertSame('memorise', $result['command']['mode']);
        $this->assertSame(36, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
        $this->assertNull($result['command']['reciter']);
        $this->assertNull($result['command']['speed']);
    }

    public function test_revise_mulk_uses_defaults_for_the_range(): void
    {
        $result = $this->interpreter->interpret('I want to revise Surah Al-Mulk with three repetitions.');

        $this->assertTrue($result['ok']);
        $this->assertSame('revise', $result['command']['goal']);
        $this->assertSame(67, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
        $this->assertSame(3, $result['command']['repetitions']);
        $this->assertNull($result['command']['reciter']);
    }

    public function test_test_recitation_of_fatiha(): void
    {
        $result = $this->interpreter->interpret('Test my recitation of Surah Al-Fatiha.');

        $this->assertTrue($result['ok']);
        $this->assertSame('test', $result['command']['mode']);
        $this->assertSame('test', $result['command']['goal']);
        $this->assertSame(1, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
    }

    public function test_play_rahman_slowly_twice(): void
    {
        $result = $this->interpreter->interpret('Play Surah Ar-Rahman slowly, twice.');

        $this->assertTrue($result['ok']);
        $this->assertSame(55, $result['command']['surah']);
        $this->assertSame(0.5, $result['command']['speed']);
        $this->assertSame(2, $result['command']['repetitions']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
    }

    public function test_omitted_settings_keep_the_fatiha_default(): void
    {
        $result = $this->interpreter->interpret('Play Al-Fatiha with Al-Sudais.');

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
        $this->assertSame('ar.abdurrahmaansudais', $result['command']['reciter']);
        $this->assertNull($result['command']['speed']);
        $this->assertNull($result['command']['repetitions']);
    }

    public function test_reversed_range_is_not_swapped(): void
    {
        $result = $this->interpreter->interpret('Play Surah Al-Baqarah from ayah 20 to 10.');

        $this->assertFalse($result['ok']);
        $this->assertSame('reversed_range', $result['reason']);
        $this->assertSame(20, $result['clarification']['start_ayah']);
        $this->assertSame(10, $result['clarification']['end_ayah']);
        $this->assertSame(10, $result['clarification']['suggested_start']);
        $this->assertSame(20, $result['clarification']['suggested_end']);
    }

    public function test_reversed_range_can_be_confirmed_explicitly(): void
    {
        $result = $this->interpreter->interpret('Play Surah Al-Baqarah from ayah 20 to 10.', [
            'start_ayah' => 10,
            'end_ayah' => 20,
        ]);

        $this->assertTrue($result['ok']);
        $this->assertSame(10, $result['command']['start_ayah']);
        $this->assertSame(20, $result['command']['end_ayah']);
    }

    public function test_shared_reciter_name_asks_for_a_choice(): void
    {
        $result = $this->interpreter->interpret('Play Al-Fatiha with Husary.');

        $this->assertFalse($result['ok']);
        $this->assertSame('ambiguous_reciter', $result['reason']);
        $ids = array_column($result['clarification']['options'], 'id');
        $this->assertContains('ar.husary', $ids);
        $this->assertContains('ar.husarymujawwad', $ids);
    }

    public function test_reciter_choice_resolves_the_command(): void
    {
        $result = $this->interpreter->interpret('Play Al-Fatiha with Husary.', [
            'reciter' => 'ar.husarymujawwad',
        ]);

        $this->assertTrue($result['ok']);
        $this->assertSame('ar.husarymujawwad', $result['command']['reciter']);
    }

    public function test_unknown_surah_is_not_guessed(): void
    {
        $result = $this->interpreter->interpret('Play Surah Notasurah from ayah 1 to 2.');

        $this->assertFalse($result['ok']);
        $this->assertSame('unknown_surah', $result['reason']);
    }

    public function test_unknown_reciter_is_not_guessed(): void
    {
        $result = $this->interpreter->interpret('Play Al-Fatiha with the reciter Bob.');

        $this->assertFalse($result['ok']);
        $this->assertSame('unknown_reciter', $result['reason']);
    }

    public function test_unsupported_speed_lists_the_real_options(): void
    {
        $result = $this->interpreter->interpret('Play Al-Fatiha at 3x.');

        $this->assertFalse($result['ok']);
        $this->assertSame('unsupported_speed', $result['reason']);
        $this->assertSame([0.5, 0.75, 1.0, 1.25, 1.5, 2.0], $result['clarification']['supported']);
    }

    public function test_arabic_memorise_request(): void
    {
        $result = $this->interpreter->interpret('اريد ان احفظ اول خمس ايات من سورة يس');

        $this->assertTrue($result['ok'], json_encode($result));
        $this->assertSame('memorise', $result['command']['mode']);
        $this->assertSame(36, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
    }

    public function test_whole_surah_uses_the_real_ayah_count(): void
    {
        $result = $this->interpreter->interpret('Play the whole surah Al-Ikhlas.');

        $this->assertTrue($result['ok']);
        $this->assertSame(112, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(4, $result['command']['end_ayah']);
    }
}
