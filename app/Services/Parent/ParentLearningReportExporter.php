<?php

namespace App\Services\Parent;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Str;

class ParentLearningReportExporter
{
    /**
     * @param  array<string, mixed>  $report
     */
    public function pdf(array $report): string
    {
        $html = view('parent.learning-report', ['report' => $report])->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * @param  array<string, mixed>  $report
     */
    public function filename(array $report): string
    {
        $child = Str::slug((string) ($report['name'] ?? 'child'), '-');
        if ($child === '') {
            $child = 'child';
        }
        $period = (string) ($report['period_start'] ?? 'period');

        return 'mutqin-report-'.$child.'-'.$period.'.pdf';
    }
}