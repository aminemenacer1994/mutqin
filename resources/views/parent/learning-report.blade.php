<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Learning report {{ $report['period_label'] }}</title>
    <style>
        @page { size: A4; margin: 16mm; }
        body { font-family: Georgia, "Times New Roman", serif; color: #21180f; margin: 0; line-height: 1.45; }
        h1 { font-size: 28px; margin: 0 0 8px; }
        h2 { font-size: 18px; margin: 24px 0 8px; }
        p, li { font-size: 16px; }
        .meta { color: #5c4a3a; font-size: 14px; }
        .pill { display: inline-block; border: 1px solid #d9cbb8; border-radius: 999px; padding: 2px 8px; margin: 0 6px 6px 0; font-size: 14px; }
    </style>
</head>
<body>
    <p class="meta">Mutqin parent report</p>
    <h1>{{ $report['name'] }}</h1>
    <p class="meta">{{ $report['period_label'] }} · Prepared {{ \Illuminate\Support\Carbon::parse($report['generated_at'])->format('j M Y H:i') }} UTC</p>
    <p>{{ $report['narrative']['text'] }}</p>
    <p class="meta">{{ $report['narrative']['label'] }}. This is separate from teacher feedback.</p>

    @if(!empty($report['sources']))
        <p>
            @foreach($report['sources'] as $source)
                <span class="pill">{{ $source['label'] }}</span>
            @endforeach
        </p>
    @endif

    @if(is_array($report['assignments'] ?? null))
        <h2>Homework</h2>
        <p>{{ $report['assignments']['plain'] }}</p>
    @endif

    @if(is_array($report['activity'] ?? null))
        <h2>Practice</h2>
        <p>{{ $report['activity']['plain'] }}</p>
    @endif

    @if(is_array($report['goals'] ?? null))
        <h2>Learning goals</h2>
        <p>{{ $report['goals']['plain'] }}</p>
    @endif

    @if(is_array($report['comparison'] ?? null))
        <h2>Compared with the previous period</h2>
        <p>{{ $report['comparison']['plain'] }}</p>
    @endif

    @if(is_array($report['wording'] ?? null))
        <h2>Wording check</h2>
        <p>{{ $report['wording']['plain'] }}</p>
    @endif

    <h2>Needs attention</h2>
    @if(empty($report['attention']))
        <p>Nothing in the shared records is marked as needing extra attention.</p>
    @else
        <ul>
            @foreach($report['attention'] as $item)
                <li>{{ $item['label'] }}</li>
            @endforeach
        </ul>
    @endif

    @if(is_array($report['feedback'] ?? null) && !empty($report['feedback']['notes']))
        <h2>Teacher feedback</h2>
        @foreach($report['feedback']['notes'] as $note)
            <p>{{ $note['teacher'] }} wrote: “{{ $note['excerpt'] }}”</p>
        @endforeach
    @endif
</body>
</html>
