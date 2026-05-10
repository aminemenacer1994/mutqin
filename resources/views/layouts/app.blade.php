<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Islamic Connect - Surat & Memorisation</title>
    <link rel="stylesheet" href="/css/app.css">
</head>
<body>
    <main class="shell">
        <header class="topbar">
            <strong>Islamic Connect</strong>
            <nav class="nav-links">
                <a href="/surat">Surat</a>
                <a href="/memorisation">Memorise</a>
                @auth
                    <form method="post" action="/logout">
                        @csrf
                        <button type="submit" class="btn">Logout</button>
                    </form>
                @else
                    <a href="/login">Login</a>
                    <a href="/register">Register</a>
                @endauth
            </nav>
        </header>
        @yield('content')
    </main>
    <script src="/js/app.js" defer></script>
</body>
</html>
