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

    public function test_messy_fatiha_request_is_lenient(): void
    {
        $result = $this->interpreter->interpret(
            'A place or a الفاتحة With the recital being a عبد الرحمن السديس Repeat it 13 times. And from the range I want it between a one In to a three. I want the range to be between the first air And the third air.'
        );

        $this->assertTrue($result['ok'], json_encode($result));
        $this->assertSame(1, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(3, $result['command']['end_ayah']);
        $this->assertSame('ar.abdurrahmaansudais', $result['command']['reciter']);
        $this->assertSame(10, $result['command']['repetitions']);
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

    public function test_natural_english_accepts_any_setting_order(): void
    {
        $phrases = [
            "I'd like to listen to Al-Fatiha with Sudais, three times, at half speed.",
            'Can you play the first ten verses of Al-Baqarah with Mishary?',
            "Let's revise Surah Yasin from ayah 5 to 15.",
            'Play Al-Mulk slowly, and repeat it twice.',
            'I want Sudais at 1.5 speed, repeating three times, Surah Ar-Rahman from verse 10 to 20.',
            'With Sudais, three repetitions, half speed, Surah Al-Fatiha from verse 1 to 5.',
            'Half speed, repeat three times, verses 1 to 5 of Al-Fatiha, played by Sudais.',
            'I want three repetitions at 0.5 speed, using Sudais, for the first five verses of Al-Fatiha.',
        ];
        $expected = [
            ['surah' => 1, 'start_ayah' => 1, 'end_ayah' => 5, 'reciter' => 'ar.abdurrahmaansudais', 'repetitions' => 3, 'speed' => 0.5],
            ['surah' => 2, 'start_ayah' => 1, 'end_ayah' => 10, 'reciter' => 'ar.alafasy', 'repetitions' => null, 'speed' => null],
            ['surah' => 36, 'start_ayah' => 5, 'end_ayah' => 15, 'reciter' => null, 'repetitions' => null, 'speed' => null],
            ['surah' => 67, 'start_ayah' => 1, 'end_ayah' => 5, 'reciter' => null, 'repetitions' => 2, 'speed' => 0.5],
            ['surah' => 55, 'start_ayah' => 10, 'end_ayah' => 20, 'reciter' => 'ar.abdurrahmaansudais', 'repetitions' => 3, 'speed' => 1.5],
            ['surah' => 1, 'start_ayah' => 1, 'end_ayah' => 5, 'reciter' => 'ar.abdurrahmaansudais', 'repetitions' => 3, 'speed' => 0.5],
            ['surah' => 1, 'start_ayah' => 1, 'end_ayah' => 5, 'reciter' => 'ar.abdurrahmaansudais', 'repetitions' => 3, 'speed' => 0.5],
            ['surah' => 1, 'start_ayah' => 1, 'end_ayah' => 5, 'reciter' => 'ar.abdurrahmaansudais', 'repetitions' => 3, 'speed' => 0.5],
        ];

        foreach ($phrases as $index => $phrase) {
            $result = $this->interpreter->interpret($phrase);
            $this->assertTrue($result['ok'], $phrase.' '.json_encode($result));
            foreach ($expected[$index] as $key => $value) {
                $this->assertSame($value, $result['command'][$key], $phrase.' '.$key);
            }
        }
    }

    public function test_phonetic_speech_errors_use_canonical_names(): void
    {
        $cases = [
            'Play Fatia with so days.' => [1, 'Al-Fatihah', 'ar.abdurrahmaansudais', 'Abdur-Rahman as-Sudais'],
            'Play Alpha Tia with So Days.' => [1, 'Al-Fatihah', 'ar.abdurrahmaansudais', 'Abdur-Rahman as-Sudais'],
            'Play Al Bakara from verse 10 to 20 with Mishary Alafasy.' => [2, 'Al-Baqarah', 'ar.alafasy', 'Mishari Rashid al-Afasy'],
            'Play Yaseen from ayah 5 to 15.' => [36, 'Ya-Sin', null, null],
            'Play Ar Rehman slowly twice.' => [55, 'Ar-Rahman', null, null],
        ];

        foreach ($cases as $phrase => $expected) {
            $result = $this->interpreter->interpret($phrase);
            $this->assertTrue($result['ok'], $phrase.' '.json_encode($result));
            $this->assertSame($expected[0], $result['command']['surah'], $phrase);
            $this->assertSame($expected[1], $result['command']['surah_name'], $phrase);
            $this->assertSame($expected[2], $result['command']['reciter'], $phrase);
            $this->assertSame($expected[3], $result['command']['reciter_label'], $phrase);
        }
    }

    public function test_mid_sentence_correction_uses_the_later_value(): void
    {
        $result = $this->interpreter->interpret(
            'Play Al-Fatiha three times, actually make it five, from verse 3 onwards with Sudais.'
        );

        $this->assertTrue($result['ok'], json_encode($result));
        $this->assertSame(1, $result['command']['surah']);
        $this->assertSame(5, $result['command']['repetitions']);
        $this->assertSame(3, $result['command']['start_ayah']);
        $this->assertSame(7, $result['command']['end_ayah']);
        $this->assertSame('ar.abdurrahmaansudais', $result['command']['reciter']);
    }

    public function test_filler_words_do_not_change_the_request(): void
    {
        $result = $this->interpreter->interpret(
            'Um, please can you play, you know, Surah Al-Mulk slowly.'
        );

        $this->assertTrue($result['ok'], json_encode($result));
        $this->assertSame(67, $result['command']['surah']);
        $this->assertSame(0.5, $result['command']['speed']);
    }

    public function test_ordinary_english_is_not_treated_as_a_surah(): void
    {
        $result = $this->interpreter->interpret('Please play slowly three times.');

        $this->assertTrue($result['ok'], json_encode($result));
        $this->assertSame(1, $result['command']['surah']);
        $this->assertSame(3, $result['command']['repetitions']);
        $this->assertSame(0.5, $result['command']['speed']);
        $this->assertNull($result['command']['reciter']);
    }

    public function test_misheard_kafirun_and_sudais_use_arabic_names(): void
    {
        $result = $this->interpreter->interpret(
            'I want to recite Sora till Cafrune . And I want the reciter to be . A Sudice .'
        );

        $this->assertTrue($result['ok'], json_encode($result));
        $this->assertSame(109, $result['command']['surah']);
        $this->assertSame('Al-Kafirun', $result['command']['surah_name']);
        $this->assertSame('الكافرون', $result['command']['surah_name_ar']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(5, $result['command']['end_ayah']);
        $this->assertSame('ar.abdurrahmaansudais', $result['command']['reciter']);
        $this->assertSame('عبد الرحمن السديس', $result['command']['reciter_label_ar']);

        $spoken = $this->interpreter->interpret('I want to recite surah al kafiroun and the reciter al sudaisi');
        $this->assertTrue($spoken['ok'], json_encode($spoken));
        $this->assertSame(109, $spoken['command']['surah']);
        $this->assertSame('الكافرون', $spoken['command']['surah_name_ar']);
        $this->assertSame('ar.abdurrahmaansudais', $spoken['command']['reciter']);
        $this->assertSame('عبد الرحمن السديس', $spoken['command']['reciter_label_ar']);
    }

    public function test_recognition_vocabulary_hints_arabic_names(): void
    {
        $vocab = $this->interpreter->recognitionVocabulary('ar');
        $kafirun = null;
        $sudais = null;
        foreach ($vocab as $row) {
            if ($row['content'] === 'الكافرون') {
                $kafirun = $row;
            }
            if ($row['content'] === 'عبد الرحمن السديس') {
                $sudais = $row;
            }
        }

        $this->assertNotNull($kafirun);
        $this->assertSame('surah', $kafirun['kind']);
        $this->assertContains('cafrune', $kafirun['sounds_like']);
        $this->assertContains('kafiroun', $kafirun['sounds_like']);
        $this->assertNotNull($sudais);
        $this->assertSame('reciter', $sudais['kind']);
        $this->assertContains('sudice', $sudais['sounds_like']);
        $this->assertContains('sudaisi', $sudais['sounds_like']);
    }

    public function test_whole_surah_uses_the_real_ayah_count(): void
    {
        $result = $this->interpreter->interpret('Play the whole surah Al-Ikhlas.');

        $this->assertTrue($result['ok']);
        $this->assertSame(112, $result['command']['surah']);
        $this->assertSame(1, $result['command']['start_ayah']);
        $this->assertSame(4, $result['command']['end_ayah']);
    }

    public function test_more_spoken_requests_resolve_without_guessing(): void
    {
        $cases = [
            'Play the last three ayahs of Al-Ikhlas.' => ['ok' => true, 'surah' => 112, 'start_ayah' => 2, 'end_ayah' => 4],
            'Listen to the entire Surah Al-Ikhlas with Sudais.' => ['ok' => true, 'surah' => 112, 'start_ayah' => 1, 'end_ayah' => 4, 'reciter' => 'ar.abdurrahmaansudais'],
            'Test me on Surah Al-Fatiha.' => ['ok' => true, 'surah' => 1, 'mode' => 'test', 'goal' => 'test'],
            'Memorise Surah Al-Nas from ayah 2 onwards at normal speed.' => ['ok' => true, 'surah' => 114, 'start_ayah' => 2, 'end_ayah' => 6, 'speed' => 1.0],
            'Revise Al-Falaq twice, fast.' => ['ok' => true, 'surah' => 113, 'repetitions' => 2, 'speed' => 1.5],
            'Play Surah Al-Fatiha from ayah 5 to ayah 2.' => ['ok' => false, 'reason' => 'reversed_range'],
            'Play Surah Al-Ikhlas from ayah 1 to ayah 9.' => ['ok' => false, 'reason' => 'invalid_range'],
            'Play Surah Al-Fatiha at 3x speed.' => ['ok' => false, 'reason' => 'unsupported_speed'],
            'Play Surah Al-Fatiha with Husary.' => ['ok' => false, 'reason' => 'ambiguous_reciter'],
            'Continue where I left off.' => ['ok' => true, 'resume' => true],
            'Continue my previous session.' => ['ok' => true, 'resume' => true],
            'Play Al Kawthar with Sudays.' => ['ok' => true, 'surah' => 108, 'reciter' => 'ar.abdurrahmaansudais'],
            'I said three times, actually make it one, Surah Al-Asr.' => ['ok' => true, 'surah' => 103, 'repetitions' => 1],
        ];

        foreach ($cases as $phrase => $expected) {
            $result = $this->interpreter->interpret($phrase);
            $this->assertSame($expected['ok'], $result['ok'], $phrase.' '.json_encode($result));
            if (! $expected['ok']) {
                $this->assertSame($expected['reason'], $result['reason'], $phrase);
                continue;
            }
            foreach ($expected as $key => $value) {
                if ($key === 'ok') {
                    continue;
                }
                $this->assertSame($value, $result['command'][$key] ?? null, $phrase.' '.$key);
            }
        }
    }

    public function test_english_speechmatics_vocabulary_uses_canonical_names(): void
    {
        $vocab = $this->interpreter->recognitionVocabulary('en');
        $byContent = [];
        foreach ($vocab as $row) {
            $byContent[$row['content']] = $row;
        }

        $this->assertSame('surah', $byContent['Al-Fatihah']['kind']);
        $this->assertContains('fatiha', $byContent['Al-Fatihah']['sounds_like']);
        $this->assertSame('surah', $byContent['Al-Baqarah']['kind']);
        $this->assertContains('baqarah', $byContent['Al-Baqarah']['sounds_like']);
        $this->assertSame('reciter', $byContent['Al-Sudais']['kind']);
        $this->assertContains('sudais', $byContent['Al-Sudais']['sounds_like']);
        $this->assertSame('reciter', $byContent['Mishary Alafasy']['kind']);
        $this->assertContains('alafasy', $byContent['Mishary Alafasy']['sounds_like']);
        $this->assertLessThanOrEqual(4, count($byContent['Al-Fatihah']['sounds_like']));
    }

    public function test_in_session_controls_do_not_start_al_fatiha(): void
    {
        $pause = $this->interpreter->interpret('Pause the recitation.');
        $this->assertTrue($pause['ok']);
        $this->assertSame('pause', $pause['command']['control']);

        $ayah = $this->interpreter->interpret('Go to ayah five.');
        $this->assertTrue($ayah['ok']);
        $this->assertSame('go_to_ayah', $ayah['command']['control']);
        $this->assertSame(5, $ayah['command']['ayah']);

        $speed = $this->interpreter->interpret('Play at half speed.');
        $this->assertTrue($speed['ok']);
        $this->assertSame('set_speed', $speed['command']['control']);
        $this->assertSame(0.5, $speed['command']['speed']);

        $reciter = $this->interpreter->interpret('Change to Mishary.');
        $this->assertTrue($reciter['ok']);
        $this->assertSame('set_reciter', $reciter['command']['control']);
        $this->assertSame('ar.alafasy', $reciter['command']['reciter']);

        $repeat = $this->interpreter->interpret('Repeat this ayah.');
        $this->assertTrue($repeat['ok']);
        $this->assertSame('repeat_ayah', $repeat['command']['control']);

        $session = $this->interpreter->interpret('Play Al-Fatiha with Sudais three times.');
        $this->assertTrue($session['ok']);
        $this->assertSame(1, $session['command']['surah']);
        $this->assertSame('ar.abdurrahmaansudais', $session['command']['reciter']);
        $this->assertSame(3, $session['command']['repetitions']);
        $this->assertArrayNotHasKey('control', $session['command']);
    }

    public function test_low_confidence_name_asks_for_confirmation(): void
    {
        $result = $this->interpreter->interpret('Play Al-Fatiha with Sudais.', [], [
            ['text' => 'Play', 'confidence' => 0.92],
            ['text' => 'Al-Fatiha', 'confidence' => 0.21],
            ['text' => 'with', 'confidence' => 0.88],
            ['text' => 'Sudais', 'confidence' => 0.9],
        ]);

        $this->assertFalse($result['ok']);
        $this->assertSame('low_confidence', $result['reason']);
        $this->assertSame(1, $result['clarification']['options'][0]['id']);

        $confirmed = $this->interpreter->interpret('Play Al-Fatiha with Sudais.', ['surah' => 1], [
            ['text' => 'Al-Fatiha', 'confidence' => 0.21],
            ['text' => 'Sudais', 'confidence' => 0.9],
        ]);
        $this->assertTrue($confirmed['ok'], json_encode($confirmed));
        $this->assertSame(1, $confirmed['command']['surah']);
        $this->assertSame('Al-Fatihah', $confirmed['command']['surah_name']);
    }
}
