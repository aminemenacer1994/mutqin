@php
    $text = (string) ($text ?? '');
@endphp
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;border-collapse:collapse;">
    <tr>
        <td style="padding:14px 16px;border-radius:12px;background-color:#faf8f5;border:1px solid #e8e0d4;">
            <p style="margin:0;font-size:13px;line-height:1.55;color:#6e645c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ $text }}</p>
        </td>
    </tr>
</table>
