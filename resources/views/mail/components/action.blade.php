@php
    $url = (string) ($url ?? '');
    $label = (string) ($label ?? '');
    $fallbackIntro = (string) ($fallbackIntro ?? __('mail.fallback'));
    $bg = (string) ($bg ?? '#1f6b4f');
@endphp
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;border-collapse:collapse;">
    <tr>
        <td align="center" style="padding:0 0 16px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $url }}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="14%" stroke="f" fillcolor="{{ $bg }}">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">{{ $label }}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:320px;width:100%;border-collapse:collapse;">
                <tr>
                    <td align="center" bgcolor="{{ $bg }}" style="background-color:{{ $bg }};border-radius:12px;mso-hide:all;">
                        <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" style="display:block;padding:15px 24px;font-size:16px;line-height:1.25;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;border-radius:12px;text-align:center;">{{ $label }}</a>
                    </td>
                </tr>
            </table>
            <!--<![endif]-->
        </td>
    </tr>
    <tr>
        <td style="padding:14px 16px;border-radius:12px;background-color:#f4f7f5;border:1px solid #d8e6dd;">
            <p style="margin:0 0 8px;font-size:13px;line-height:1.45;color:#4a6358;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ $fallbackIntro }}</p>
            <p class="email-fallback" style="margin:0;font-size:12px;line-height:1.55;color:#1f6b4f;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;word-break:break-all;">{{ $url }}</p>
        </td>
    </tr>
</table>
