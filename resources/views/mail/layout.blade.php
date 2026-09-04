<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('title', config('app.name'))</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a2e24;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7f5;padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;border:1px solid #d8e6dd;overflow:hidden;">
                <tr>
                    <td style="padding:28px 32px 12px;text-align:center;background:linear-gradient(180deg,#f7fbf8 0%,#ffffff 100%);">
                        <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#5f7a6d;">Mutqin</p>
                        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.35;font-weight:600;color:#123527;">@yield('heading', config('app.name'))</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 32px 28px;font-size:16px;line-height:1.6;color:#2b4338;">
                        @yield('content')
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 32px 28px;font-size:13px;line-height:1.5;color:#667a70;">
                        @yield('footer', __('mail.footer'))
                    </td>
                </tr>
            </table>
            <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8a9a92;">&copy; {{ date('Y') }} Mutqin</p>
        </td>
    </tr>
</table>
</body>
</html>
