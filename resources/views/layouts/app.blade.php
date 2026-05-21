<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Mutqin</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
</head>
<body>
    <div id="app">
        <nav class="navbar navbar-expand-lg app-navbar">
            <div class="container-fluid shell navbar-shell">
                <a class="navbar-brand" href="/">
                    <img src="/images/logo.png" alt="Mutqin" class="app-navbar-logo">
                </a>

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <i class="bi bi-list"></i>
                </button>

                <div class="collapse navbar-collapse" id="navbarSupportedContent">
                    <div class="navbar-nav nav-links-desktop me-auto">
                        <a class="nav-link {{ request()->is('/') ? 'active' : '' }}" href="/">Home</a>
                        <a class="nav-link {{ request()->is('memorisation') ? 'active' : '' }}" href="/memorisation">Memorisation</a>
                    </div>

                    <div class="d-flex align-items-center gap-3 ms-auto app-navbar-actions">
                        <button id="globalThemeToggle" class="btn app-theme-toggle" type="button" aria-label="Toggle theme">
                            <i class="bi bi-sun"></i>
                        </button>

                        @auth
                            <div class="dropdown">
                                <button class="btn app-user-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <span class="app-user-avatar">{{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}</span>
                                    <span>{{ Auth::user()->name ?? 'User' }}</span>
                                    <i class="bi bi-chevron-down"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <form method="post" action="/logout">
                                            @csrf
                                            <button type="submit" class="dropdown-item">Logout</button>
                                        </form>
                                    </li>
                                </ul>
                            </div>
                        @else
                            <div class="d-flex align-items-center gap-2">
                                <a class="nav-link" href="/login">Login</a>
                                <a class="nav-link" href="/register">Register</a>
                            </div>
                        @endauth
                    </div>
                </div>
            </div>
        </nav>

        <main class="shell">
            @yield('content')
        </main>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" defer></script>
    <script src="{{ mix('js/app.js') }}" defer></script>
</body>
</html>
