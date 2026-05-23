<!doctype html>
<html lang="en" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Mutqin - Preserve Your Hifz</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    <style>
        /* Theme Variables */
        :root {
            --bg: #fdf9f2;
            --surface: rgba(255, 255, 255, 0.96);
            --surface-strong: #ffffff;
            --border: rgba(160, 120, 76, 0.12);
            --text: #1a2e24;
            --text-muted: #6b7f76;
            --accent: #a0784c;
            --accent-strong: #8b653b;
            --accent-light: rgba(160, 120, 76, 0.1);
            --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.04);
            --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 20px 40px -12px rgba(0, 0, 0, 0.1);
        }

        [data-theme="dark"] {
            --bg: #1a1a1a;
            --surface: rgba(30, 30, 30, 0.96);
            --surface-strong: #2a2a2a;
            --border: rgba(160, 120, 76, 0.2);
            --text: #e8e2d9;
            --text-muted: #a8b5aa;
            --accent: #c49a6c;
            --accent-strong: #d4aa7c;
            --accent-light: rgba(196, 154, 108, 0.15);
        }

        [data-theme="sepia"] {
            --bg: #f4ecd8;
            --surface: rgba(255, 248, 235, 0.96);
            --surface-strong: #fff8eb;
            --border: rgba(139, 94, 60, 0.15);
            --text: #3d2b1f;
            --text-muted: #8b7355;
            --accent: #b87333;
            --accent-strong: #9a5a2a;
            --accent-light: rgba(184, 115, 51, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            transition: background 0.3s ease, color 0.3s ease;
        }

        /* App Navbar */
        .app-navbar {
            background: var(--surface-strong);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 3px;
            position: sticky;
            top: 0;
            z-index: 1000;
        }

        [data-theme="dark"] .app-navbar {
            background: var(--surface-strong);
        }

        [data-theme="sepia"] .app-navbar {
            background: var(--surface-strong);
        }

        .navbar-shell {
            max-width: 1400px;
            margin: 0 auto;
            padding: 16px 32px;
        }

        .navbar-brand {
            padding: 0;
            margin-right: 48px;
        }

        .app-navbar-logo {
            height: 56px;
            width: auto;
        }

        .navbar-toggler {
            border: 1px solid var(--border);
            background: var(--surface);
            padding: 10px 14px;
            border-radius: 12px;
            color: var(--text);
            transition: all 0.2s ease;
        }

        .navbar-toggler:hover {
            background: var(--accent-light);
            border-color: var(--accent);
        }

        .navbar-toggler i {
            font-size: 22px;
        }

        .nav-links-desktop {
            display: flex;
            gap: 12px;
        }

        .nav-link {
            padding: 10px 20px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 15px;
            color: var(--text-muted);
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .nav-link:hover {
            color: var(--accent);
            background: var(--accent-light);
        }

        .nav-link.active {
            color: var(--accent);
            background: var(--accent-light);
            font-weight: 600;
        }

        .app-navbar-actions {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .app-theme-toggle {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .app-theme-toggle:hover {
            background: var(--accent-light);
            color: var(--accent);
            transform: rotate(15deg);
        }

        /* Dropdown Styles */
        .dropdown {
            position: relative;
            display: inline-block;
        }

        .app-user-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px 8px 12px;
            border-radius: 48px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .app-user-toggle:hover {
            border-color: var(--accent);
            background: var(--accent-light);
        }

        .app-user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 15px;
        }

        .dropdown-menu {
            position: absolute;
            top: calc(100% + 12px);
            right: 0;
            background: var(--surface-strong);
            border: 1px solid var(--border);
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
            padding: 8px;
            min-width: 220px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
            z-index: 1050;
        }

        .dropdown-menu.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            border-radius: 12px;
            padding: 12px 16px;
            color: var(--text);
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            background: none;
            border: none;
            font-size: 14px;
            font-weight: 500;
        }

        .dropdown-item i {
            font-size: 18px;
            width: 20px;
        }

        .dropdown-item:hover {
            background: var(--accent-light);
            color: var(--accent);
        }

        .dropdown-divider {
            height: 1px;
            margin: 8px 0;
            background: var(--border);
        }

        .shell {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 32px;
        }

        main.shell {
            min-height: calc(100vh - 70px);
            padding-top: 32px;
            padding-bottom: 32px;
        }

        /* Mobile styles */
        @media (max-width: 992px) {
            .navbar-shell {
                padding: 12px 20px;
            }
            
            .navbar-collapse {
                position: fixed;
                top: 66px;
                left: -100%;
                width: 100%;
                height: calc(100vh - 66px);
                background: var(--surface-strong);
                transition: left 0.3s ease;
                padding: 24px;
                z-index: 999;
                overflow-y: auto;
            }
            
            .navbar-collapse.show {
                left: 0;
            }
            
            .nav-links-desktop {
                flex-direction: column;
                width: 100%;
                gap: 8px;
            }
            
            .nav-link {
                padding: 14px 20px;
                font-size: 16px;
            }
            
            .app-navbar-actions {
                margin-left: auto;
            }
            
            .dropdown-menu {
                position: static;
                box-shadow: none;
                background: transparent;
                padding-left: 20px;
                margin-top: 8px;
                transform: none;
                border: none;
            }
            
            .dropdown-menu.show {
                opacity: 1;
                visibility: visible;
                transform: none;
            }
            
            .dropdown-item {
                padding: 12px 16px;
            }
        }

        @media (max-width: 768px) {
            .shell {
                padding: 0 20px;
            }
            
            main.shell {
                padding-top: 24px;
                padding-bottom: 24px;
            }
        }

        @media (max-width: 640px) {
            .navbar-shell {
                padding: 10px 16px;
            }
            
            .app-user-toggle span:not(.app-user-avatar) {
                display: none;
            }
            
            .app-user-toggle {
                padding: 6px 10px;
            }
            
            .app-user-avatar {
                width: 32px;
                height: 32px;
                font-size: 13px;
            }
            
            .shell {
                padding: 0 16px;
            }
            
            main.shell {
                padding-top: 20px;
                padding-bottom: 20px;
            }
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .auth-shell, .landing-page {
            animation: fadeIn 0.4s ease-out;
        }
    </style>
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
                        <!-- <button id="globalThemeToggle" class="btn app-theme-toggle" type="button" aria-label="Toggle theme">
                            <i class="bi bi-sun"></i>
                        </button> -->

                        @auth
                            <div class="dropdown" id="userDropdown">
                                <button class="btn app-user-toggle" type="button" id="dropdownToggle" aria-expanded="false">
                                    <span class="app-user-avatar">{{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}</span>
                                    <span>{{ Auth::user()->name ?? 'User' }}</span>
                                    <i class="bi bi-chevron-down"></i>
                                </button>
                                <ul class="dropdown-menu" id="dropdownMenu">
                                    <!-- <li>
                                        <a class="dropdown-item" href="/profile">
                                            <i class="bi bi-person"></i> Profile
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="/dashboard">
                                            <i class="bi bi-speedometer2"></i> Dashboard
                                        </a>
                                    </li>
                                    <li><hr class="dropdown-divider"></li> -->
                                    <li>
                                        <form method="POST" action="{{ route('logout') }}" id="logoutForm">
                                            @csrf
                                            <button type="submit" class="dropdown-item">
                                                <i class="bi bi-box-arrow-right"></i> Logout
                                            </button>
                                        </form>
                                    </li>
                                </ul>
                            </div>
                        @else
                            <div class="d-flex align-items-center gap-2">
                                <a class="nav-link" href="{{ route('login') }}">Login</a>
                                <a class="nav-link" href="{{ route('register') }}">Register</a>
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

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="{{ mix('js/app.js') }}" defer></script>
    
    <script>
        // Theme management
        (function() {
            const themes = ['light', 'dark', 'sepia'];
            const themeIcons = {
                light: 'bi-sun',
                dark: 'bi-moon-stars',
                sepia: 'bi-book-half'
            };
            
            function setTheme(theme) {
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('mutqin-theme', theme);
                
                const button = document.getElementById('globalThemeToggle');
                if (button) {
                    const icon = button.querySelector('i');
                    icon.className = `bi ${themeIcons[theme] || themeIcons.light}`;
                }
            }
            
            function cycleTheme() {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const currentIndex = themes.indexOf(current);
                const nextIndex = (currentIndex + 1) % themes.length;
                setTheme(themes[nextIndex]);
            }
            
            // Load saved theme
            const savedTheme = localStorage.getItem('mutqin-theme');
            if (savedTheme && themes.includes(savedTheme)) {
                setTheme(savedTheme);
            } else {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    setTheme('dark');
                } else {
                    setTheme('light');
                }
            }
            
            document.addEventListener('DOMContentLoaded', function() {
                const themeButton = document.getElementById('globalThemeToggle');
                if (themeButton) {
                    themeButton.addEventListener('click', cycleTheme);
                }
            });
        })();

        // Custom dropdown functionality
        (function() {
            document.addEventListener('DOMContentLoaded', function() {
                const dropdown = document.getElementById('userDropdown');
                const toggle = document.getElementById('dropdownToggle');
                const menu = document.getElementById('dropdownMenu');
                
                if (!dropdown || !toggle || !menu) return;
                
                function closeDropdown() {
                    menu.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                }
                
                function openDropdown() {
                    menu.classList.add('show');
                    toggle.setAttribute('aria-expanded', 'true');
                }
                
                function isDropdownOpen() {
                    return menu.classList.contains('show');
                }
                
                toggle.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (isDropdownOpen()) {
                        closeDropdown();
                    } else {
                        openDropdown();
                    }
                });
                
                document.addEventListener('click', function(e) {
                    if (!dropdown.contains(e.target)) {
                        closeDropdown();
                    }
                });
                
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && isDropdownOpen()) {
                        closeDropdown();
                    }
                });
                
                menu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            });
        })();
        
        // Handle mobile menu toggle
        (function() {
            document.addEventListener('DOMContentLoaded', function() {
                const toggler = document.querySelector('.navbar-toggler');
                const collapse = document.querySelector('.navbar-collapse');
                
                if (toggler && collapse) {
                    toggler.addEventListener('click', function() {
                        collapse.classList.toggle('show');
                        const expanded = collapse.classList.contains('show');
                        toggler.setAttribute('aria-expanded', expanded);
                    });
                    
                    const links = collapse.querySelectorAll('a');
                    links.forEach(link => {
                        link.addEventListener('click', function() {
                            collapse.classList.remove('show');
                            toggler.setAttribute('aria-expanded', 'false');
                        });
                    });
                }
            });
        })();
    </script>
</body>
</html>