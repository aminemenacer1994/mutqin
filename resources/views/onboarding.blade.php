@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Mutqin - AI-Powered Quran Memorization | Master Tajweed with Artificial Intelligence</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0a0e0c 0%, #0f1412 50%, #0a0e0c 100%);
            color: #e8f0ec;
            overflow-x: hidden;
        }

        /* Animated Background Pattern */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.05"><path fill="none" stroke="%234f9d8a" stroke-width="0.5" d="M20,20 L80,20 M20,40 L80,40 M20,60 L80,60 M20,80 L80,80 M40,20 L40,80 M60,20 L60,80 M80,20 L80,80"/><circle cx="50" cy="50" r="8" stroke="%234f9d8a" stroke-width="0.5" fill="none"/><path d="M50,42 L58,50 L50,58 L42,50 Z" fill="%234f9d8a" opacity="0.3"/></svg>');
            background-repeat: repeat;
            pointer-events: none;
            z-index: -1;
            animation: subtleMove 20s linear infinite;
        }

        @keyframes subtleMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(100px, 100px); }
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 10px;
        }

        ::-webkit-scrollbar-track {
            background: #0a0e0c;
        }

        ::-webkit-scrollbar-thumb {
            background: #4f9d8a;
            border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #3d7a6b;
        }

        /* Navigation */
        .navbar {
            position: fixed;
            top: 0;
            width: 100%;
            background: rgba(10, 14, 12, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(79, 157, 138, 0.2);
            z-index: 1000;
            padding: 1rem 0;
            transition: all 0.3s ease;
        }

        .nav-container {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            font-size: 2rem;
            color: #4f9d8a;
            animation: pulse 2s infinite;
        }

        .logo h1 {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #e8f0ec, #4f9d8a);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            align-items: center;
        }

        .nav-links a {
            color: #e8f0ec;
            text-decoration: none;
            transition: color 0.3s ease;
            font-weight: 500;
            position: relative;
        }

        .nav-links a::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: #4f9d8a;
            transition: width 0.3s ease;
        }

        .nav-links a:hover::after {
            width: 100%;
        }

        .nav-links a:hover {
            color: #4f9d8a;
        }

        .btn-nav {
            background: linear-gradient(135deg, #4f9d8a, #3d7a6b);
            padding: 0.5rem 1.5rem;
            border-radius: 40px;
            color: white !important;
            border: none;
            cursor: pointer;
        }

        .btn-nav::after {
            display: none;
        }

        .btn-nav:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(79, 157, 138, 0.3);
        }

        /* Hero Section */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            padding: 6rem 2rem 4rem;
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '۞';
            position: absolute;
            font-size: 30rem;
            opacity: 0.03;
            right: -10%;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            animation: rotate 60s linear infinite;
        }

        @keyframes rotate {
            from { transform: translateY(-50%) rotate(0deg); }
            to { transform: translateY(-50%) rotate(360deg); }
        }

        .hero-container {
            max-width: 1280px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
            position: relative;
            z-index: 1;
        }

        .hero-content h1 {
            font-size: 3.5rem;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #ffffff, #4f9d8a, #ffd966);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            animation: fadeInUp 0.8s ease;
        }

        .hero-content p {
            font-size: 1.2rem;
            color: #8ba39a;
            margin-bottom: 2rem;
            line-height: 1.6;
            animation: fadeInUp 0.8s ease 0.2s backwards;
        }

        .hero-buttons {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            animation: fadeInUp 0.8s ease 0.4s backwards;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .btn-primary {
            background: linear-gradient(135deg, #4f9d8a, #3d7a6b);
            color: white;
            padding: 1rem 2rem;
            border-radius: 40px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: none;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .btn-primary:hover::before {
            width: 300px;
            height: 300px;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(79, 157, 138, 0.3);
        }

        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(79, 157, 138, 0.3);
            color: #e8f0ec;
            padding: 1rem 2rem;
            border-radius: 40px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-secondary:hover {
            background: rgba(79, 157, 138, 0.2);
            transform: translateY(-2px);
        }

        .hero-stats {
            display: flex;
            gap: 2rem;
            margin-top: 3rem;
            animation: fadeInUp 0.8s ease 0.6s backwards;
        }

        .stat {
            text-align: center;
            position: relative;
        }

        .stat::before {
            content: '';
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 30px;
            height: 2px;
            background: #4f9d8a;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: 800;
            color: #4f9d8a;
            animation: countUp 2s ease;
        }

        .stat-label {
            font-size: 0.85rem;
            color: #8ba39a;
        }

        @keyframes countUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-image {
            position: relative;
            animation: fadeInRight 0.8s ease;
        }

        @keyframes fadeInRight {
            from {
                opacity: 0;
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .floating-card {
            position: absolute;
            background: rgba(20, 25, 23, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid rgba(79, 157, 138, 0.3);
            animation: float 3s ease-in-out infinite;
        }

        .floating-card:nth-child(1) {
            top: 10%;
            right: -10%;
        }

        .floating-card:nth-child(2) {
            bottom: 20%;
            left: -10%;
            animation-delay: 1s;
        }

        .floating-card:nth-child(3) {
            top: 40%;
            right: -15%;
            animation-delay: 2s;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }

        /* Quran Verse Ticker */
        .verse-ticker {
            background: rgba(79, 157, 138, 0.1);
            padding: 1rem 0;
            overflow: hidden;
            white-space: nowrap;
            border-top: 1px solid rgba(79, 157, 138, 0.2);
            border-bottom: 1px solid rgba(79, 157, 138, 0.2);
        }

        .ticker-content {
            display: inline-block;
            animation: ticker 30s linear infinite;
        }

        .ticker-content span {
            margin: 0 2rem;
            font-family: 'Amiri', serif;
            font-size: 1.1rem;
            color: #4f9d8a;
        }

        @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }

        /* Features Section */
        .features {
            padding: 5rem 2rem;
            background: rgba(0, 0, 0, 0.3);
        }

        .section-container {
            max-width: 1280px;
            margin: 0 auto;
        }

        .section-title {
            text-align: center;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            position: relative;
            display: inline-block;
            width: 100%;
        }

        .section-title::before,
        .section-title::after {
            content: '۞';
            color: #4f9d8a;
            font-size: 1.5rem;
            margin: 0 1rem;
            opacity: 0.5;
        }

        .section-subtitle {
            text-align: center;
            color: #8ba39a;
            margin-bottom: 3rem;
            font-size: 1.1rem;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .feature-card {
            background: rgba(20, 25, 23, 0.8);
            border-radius: 20px;
            padding: 2rem;
            transition: all 0.3s ease;
            border: 1px solid rgba(79, 157, 138, 0.2);
            position: relative;
            overflow: hidden;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(79, 157, 138, 0.1), transparent);
            transition: left 0.5s ease;
        }

        .feature-card:hover::before {
            left: 100%;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            border-color: rgba(79, 157, 138, 0.5);
            box-shadow: 0 10px 30px rgba(79, 157, 138, 0.2);
        }

        .feature-icon {
            font-size: 2.5rem;
            color: #4f9d8a;
            margin-bottom: 1.5rem;
            display: inline-block;
            animation: iconPulse 2s ease-in-out infinite;
        }

        @keyframes iconPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        .feature-card h3 {
            font-size: 1.3rem;
            margin-bottom: 1rem;
        }

        .feature-card p {
            color: #8ba39a;
            line-height: 1.6;
        }

        /* How It Works */
        .how-it-works {
            padding: 5rem 2rem;
        }

        .steps {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .step {
            text-align: center;
            position: relative;
        }

        .step:not(:last-child)::after {
            content: '→';
            position: absolute;
            right: -20px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 2rem;
            color: #4f9d8a;
            opacity: 0.5;
        }

.step-number {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #4f9d8a, #3d7a6b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0 auto 1.5rem;
            position: relative;
            animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(79, 157, 138, 0.5); }
            50% { box-shadow: 0 0 20px rgba(79, 157, 138, 0.8); }
        }

        .step h3 {
            margin-bottom: 0.5rem;
        }

        .step p {
            color: #8ba39a;
        }

        /* Testimonials */
        .testimonials {
            padding: 5rem 2rem;
            background: rgba(0, 0, 0, 0.3);
        }

        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .testimonial-card {
            background: rgba(20, 25, 23, 0.8);
            border-radius: 20px;
            padding: 2rem;
            border: 1px solid rgba(79, 157, 138, 0.2);
            transition: all 0.3s ease;
            position: relative;
        }

        .testimonial-card::before {
            content: '"';
            position: absolute;
            top: -20px;
            left: 20px;
            font-size: 5rem;
            color: #4f9d8a;
            opacity: 0.3;
            font-family: serif;
        }

        .testimonial-card:hover {
            transform: translateY(-5px);
            border-color: #4f9d8a;
        }

        .testimonial-text {
            font-style: italic;
            margin-bottom: 1.5rem;
            line-height: 1.6;
            position: relative;
            z-index: 1;
        }

        .testimonial-author {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .author-avatar {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #4f9d8a, #3d7a6b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            font-weight: 600;
        }

        .author-info h4 {
            font-size: 1rem;
            margin-bottom: 0.25rem;
        }

        .author-info p {
            font-size: 0.85rem;
            color: #8ba39a;
        }

        /* Pricing Section */
        .pricing {
            padding: 5rem 2rem;
        }

        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .pricing-card {
            background: rgba(20, 25, 23, 0.8);
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            border: 1px solid rgba(79, 157, 138, 0.2);
            transition: all 0.3s ease;
            position: relative;
        }

        .pricing-card.featured {
            border: 2px solid #4f9d8a;
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(79, 157, 138, 0.3);
        }

        .pricing-card.featured::before {
            content: '⭐ MOST POPULAR';
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #4f9d8a, #3d7a6b);
            padding: 0.25rem 1rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            white-space: nowrap;
        }

        .pricing-card:hover {
            transform: translateY(-10px);
            border-color: #4f9d8a;
        }

        .pricing-card.featured:hover {
            transform: scale(1.05) translateY(-10px);
        }

        .pricing-card h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }

        .price {
            font-size: 3rem;
            font-weight: 800;
            color: #4f9d8a;
            margin: 1.5rem 0;
        }

        .price span {
            font-size: 1rem;
            color: #8ba39a;
        }

        .pricing-features {
            list-style: none;
            margin: 1.5rem 0;
        }

        .pricing-features li {
            padding: 0.5rem 0;
            color: #8ba39a;
        }

        .pricing-features i {
            color: #4f9d8a;
            margin-right: 8px;
        }

        .pricing-card > .btn-secondary,
        .pricing-card > .btn-primary {
            width: 220px !important;
            min-width: 220px !important;
            max-width: 220px !important;
            height: 56px !important;
            min-height: 56px !important;
            max-height: 56px !important;
            padding: 0 1.5rem !important;
            display: inline-grid !important;
            place-items: center !important;
            justify-content: center !important;
            margin: 0 auto;
            border-radius: 16px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* CTA Section */
        .cta {
            padding: 5rem 2rem;
            background: linear-gradient(135deg, rgba(79, 157, 138, 0.1), rgba(61, 122, 107, 0.1));
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .cta::before {
            content: '۞';
            position: absolute;
            font-size: 20rem;
            opacity: 0.05;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            animation: rotate 30s linear infinite;
        }

        .cta h2 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            position: relative;
            z-index: 1;
        }

        .cta p {
            color: #8ba39a;
            margin-bottom: 2rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            position: relative;
            z-index: 1;
        }

        /* Footer */
        .footer {
            background: rgba(0, 0, 0, 0.5);
            padding: 3rem 2rem 1rem;
        }

        .footer-content {
            max-width: 1280px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .footer-section h4 {
            margin-bottom: 1rem;
            color: #4f9d8a;
            position: relative;
            display: inline-block;
        }

        .footer-section h4::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 30px;
            height: 2px;
            background: #4f9d8a;
        }

        .footer-section a {
            display: block;
            color: #8ba39a;
            text-decoration: none;
            margin-bottom: 0.5rem;
            transition: all 0.3s ease;
        }

        .footer-section a:hover {
            color: #4f9d8a;
            transform: translateX(5px);
        }

        .social-links {
            display: flex;
            gap: 1rem;
        }

        .social-links a {
            font-size: 1.5rem;
            transition: all 0.3s ease;
        }

        .social-links a:hover {
            transform: translateY(-3px) scale(1.1);
        }

        .footer-bottom {
            text-align: center;
            padding-top: 2rem;
            border-top: 1px solid rgba(79, 157, 138, 0.2);
            color: #8ba39a;
        }

        /* Responsive */

@keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
            }
        }

        /* Islamic Pattern Divider */
        .divider {
            text-align: center;
            padding: 2rem 0;
            color: #4f9d8a;
            font-size: 1.5rem;
            letter-spacing: 10px;
        }

        @media (max-width: 767.98px) {
            :root {
                --landing-grid: repeat(4, minmax(0, 1fr));
                --landing-gap: clamp(8px, 2.7vw, 14px);
                --landing-gutter: max(14px, env(safe-area-inset-left));
            }

            html {
                scroll-padding-top: 9rem;
            }

            body {
                overflow-x: visible;
            }

            .navbar {
                position: sticky;
                padding: max(10px, env(safe-area-inset-top)) var(--landing-gutter) 10px;
            }

            .nav-container {
                width: min(100%, 44rem);
                padding: 0;
                display: grid;
                grid-template-columns: var(--landing-grid);
                gap: 8px var(--landing-gap);
            }

            .logo {
                grid-column: 1 / span 2;
                min-width: 0;
                gap: 7px;
            }

            .logo-icon {
                font-size: 1.6rem;
            }

            .logo h1 {
                font-size: 1.15rem;
            }

            .nav-links {
                grid-column: 3 / -1;
                min-width: 0;
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 5px;
                align-items: stretch;
            }

            .nav-links a {
                min-width: 0;
                min-height: 42px;
                padding: 5px 3px;
                display: grid;
                place-items: center;
                text-align: center;
                font-size: clamp(0.62rem, 2.45vw, 0.76rem);
                line-height: 1.15;
                overflow-wrap: anywhere;
            }

            .nav-links .btn-nav {
                grid-column: 1 / -1;
                min-height: 44px;
                padding-inline: 10px;
            }

            .verse-ticker {
                padding-block: 0.7rem;
            }

            .hero,
            .features,
            .how-it-works,
            .testimonials,
            .pricing,
            .cta,
            .footer {
                padding-inline: var(--landing-gutter);
            }

            .hero {
                min-height: auto;
                padding-top: clamp(2.5rem, 11vw, 5rem);
                padding-bottom: clamp(3rem, 12vw, 5rem);
                overflow: visible;
            }

            .hero::before {
                right: -45%;
                font-size: 18rem;
            }

            .hero-container,
            .hero-content,
            .hero-buttons,
            .hero-stats,
            .section-container,
            .features-grid,
            .steps,
            .testimonials-grid,
            .pricing-grid,
            .footer-content {
                display: grid;
                grid-template-columns: var(--landing-grid);
                gap: var(--landing-gap);
                min-width: 0;
            }

            .hero-container > .hero-content,
            .hero-container > .hero-image,
            .hero-content > h1,
            .hero-content > p,
            .hero-content > .hero-buttons,
            .hero-content > .hero-stats,
            .section-container > .section-title,
            .section-container > .section-subtitle,
            .section-container > .features-grid,
            .section-container > .steps,
            .section-container > .testimonials-grid,
            .section-container > .pricing-grid {
                grid-column: 1 / -1;
                min-width: 0;
            }

            .hero-content h1 {
                margin-bottom: 0.8rem;
                font-size: clamp(2rem, 10vw, 3.25rem);
            }

            .hero-content p {
                margin-bottom: 0.8rem;
                font-size: clamp(0.92rem, 3.8vw, 1.1rem);
            }

            .hero-buttons {
                margin-top: 0.65rem;
            }

            .hero-buttons > a {
                grid-column: span 2;
                min-width: 0;
                min-height: 48px;
                padding: 10px;
                justify-content: center;
                text-align: center;
                line-height: 1.2;
            }

            .hero-stats {
                margin-top: 1.3rem;
            }

            .hero-stats > .stat {
                grid-column: span 1;
                min-width: 0;
            }

            .stat-number {
                font-size: clamp(1.25rem, 6vw, 1.8rem);
            }

            .stat-label {
                font-size: clamp(0.62rem, 2.5vw, 0.78rem);
                overflow-wrap: anywhere;
            }

            .hero-image {
                margin-top: 1rem;
            }

            .hero-image > div:first-child {
                min-height: clamp(240px, 72vw, 360px) !important;
                padding: clamp(1rem, 5vw, 2rem) !important;
            }

            .floating-card {
                max-width: min(68%, 15rem);
                padding: 0.65rem 0.8rem;
                font-size: clamp(0.72rem, 3vw, 0.88rem);
            }

            .floating-card:nth-child(1) {
                right: 8px;
            }

            .floating-card:nth-child(2) {
                left: 8px;
            }

            .floating-card:nth-child(3) {
                right: 8px;
            }

            .features,
            .how-it-works,
            .testimonials,
            .pricing,
            .cta {
                padding-top: clamp(3rem, 12vw, 5rem);
                padding-bottom: clamp(3rem, 12vw, 5rem);
            }

            .section-title {
                font-size: clamp(1.75rem, 8vw, 2.4rem);
            }

            .section-title::before,
            .section-title::after {
                margin-inline: 0.35rem;
                font-size: 1rem;
            }

            .section-subtitle {
                margin-bottom: 1.5rem;
                font-size: 0.94rem;
            }

            .features-grid > .feature-card,
            .steps > .step,
            .testimonials-grid > .testimonial-card {
                grid-column: span 2;
                min-width: 0;
            }

            .feature-card,
            .testimonial-card,
            .pricing-card {
                padding: clamp(1rem, 4vw, 1.6rem);
            }

            .feature-icon {
                margin-bottom: 0.65rem;
                font-size: 2rem;
            }

            .feature-card h3,
            .step h3 {
                font-size: clamp(1rem, 4vw, 1.2rem);
            }

            .feature-card p,
            .step p,
            .testimonial-text {
                font-size: clamp(0.78rem, 3vw, 0.94rem);
            }

            .steps {
                margin-top: 1.5rem;
            }

            .step:not(:last-child)::after {
                content: none;
            }

            .step-number {
                width: 54px;
                height: 54px;
                margin-bottom: 0.75rem;
                font-size: 1.35rem;
            }

            .testimonials-grid,
            .pricing-grid {
                margin-top: 1.5rem;
            }

            .testimonial-author {
                display: grid;
                grid-template-columns: 42px minmax(0, 1fr);
                gap: 8px;
            }

            .author-avatar {
                width: 42px;
                height: 42px;
            }

            .pricing-grid > .pricing-card {
                grid-column: 1 / -1;
                display: grid;
                grid-template-columns: var(--landing-grid);
                gap: 8px var(--landing-gap);
                text-align: start;
            }

            .pricing-card > h3,
            .pricing-card > .price {
                grid-column: span 2;
                align-self: center;
                margin: 0;
            }

            .pricing-card > .price {
                text-align: end;
                font-size: clamp(2rem, 9vw, 3rem);
            }

            .pricing-card > .pricing-features,
            .pricing-card > .btn-primary,
            .pricing-card > .btn-secondary {
                grid-column: 1 / -1;
            }

            .pricing-features {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 4px var(--landing-gap);
                margin: 0.5rem 0;
            }

            .pricing-features li {
                min-width: 0;
                padding: 0.35rem 0;
                font-size: clamp(0.76rem, 3vw, 0.9rem);
            }

            .pricing-card.featured,
            .pricing-card.featured:hover {
                transform: none;
            }

            .pricing-card > .btn-secondary,
            .pricing-card > .btn-primary {
                width: 100% !important;
                min-width: 0 !important;
                max-width: none !important;
                min-height: 48px !important;
            }

            .cta .section-container > h2,
            .cta .section-container > p,
            .cta .section-container > a {
                grid-column: 1 / -1;
                min-width: 0;
            }

            .cta h2 {
                font-size: clamp(1.8rem, 8vw, 2.4rem);
            }

            .cta .btn-primary {
                width: min(100%, 24rem);
                min-height: 48px;
                justify-self: center;
                justify-content: center;
                text-align: center;
            }

            .footer-content > .footer-section {
                grid-column: span 2;
                min-width: 0;
            }

            .footer-section:first-child,
            .footer-section:last-child {
                grid-column: 1 / -1;
            }

            .social-links {
                display: grid;
                grid-template-columns: repeat(5, minmax(44px, 1fr));
                gap: 6px;
            }

            .social-links a {
                min-width: 44px;
                min-height: 44px;
                display: grid;
                place-items: center;
                margin: 0;
            }
        }

        @media (min-width: 560px) and (max-width: 767.98px) {
                .features-grid > .feature-card,
                .testimonials-grid > .testimonial-card,
                .pricing-grid > .pricing-card {
                grid-column: span 2;
            }

            .pricing-grid > .pricing-card {
                display: block;
                text-align: center;
            }

            .pricing-card > .price {
                text-align: center;
                margin: 1rem 0;
            }

            .pricing-features {
                grid-template-columns: minmax(0, 1fr);
            }
        }

        @media (max-width: 349.98px) {
            .logo {
                grid-column: 1 / -1;
            }

            .nav-links {
                grid-column: 1 / -1;
            }

            .hero-buttons > a {
                grid-column: 1 / -1;
            }

            .features-grid > .feature-card,
            .testimonials-grid > .testimonial-card {
                grid-column: 1 / -1;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="logo">
                <span class="logo-icon">۞</span>
                <h1>Mutqin</h1>
            </div>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#testimonials">Testimonials</a>
                <a href="#pricing">Pricing</a>
                <a href="{{ route('onboarding') }}" class="btn-nav">Begin Your Journey</a>
            </div>
        </div>
    </nav>

    <!-- Quran Verse Ticker -->
    <div class="verse-ticker">
        <div class="ticker-content">
            <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            <span>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span>
            <span>إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ</span>
            <span>اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ</span>
            <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            <span>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</span>
            <span>إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ</span>
            <span>اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ</span>
        </div>
    </div>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <div class="hero-content">
                <h1>Master Quran Recitation with AI-Powered Precision</h1>
                <p>"And recite the Qur'an with measured recitation." (Surah Al-Muzzammil, 73:4)</p>
                <p>Join thousands of students perfecting their Tajweed and memorization with real-time AI feedback, personalized learning paths, and interactive tools designed to help you connect with the Word of Allah.</p>
                <div class="hero-buttons">
                    <a href="{{ route('onboarding') }}" class="btn-primary">
                        <i class="bi bi-rocket-takeoff"></i> Begin Your Journey
                    </a>
                    <a href="#features" class="btn-secondary">
                        <i class="bi bi-play-circle"></i> Watch Demo
                    </a>
                </div>
                <div class="hero-stats">
                    <div class="stat">
                        <div class="stat-number">10K+</div>
                        <div class="stat-label">Students Worldwide</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">98%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">50+</div>
                        <div class="stat-label">Countries</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">100K+</div>
                        <div class="stat-label">Recitations Analyzed</div>
                    </div>
                </div>
            </div>
            <div class="hero-image">
                <div style="background: linear-gradient(135deg, #4f9d8a, #3d7a6b); border-radius: 20px; padding: 2rem; text-align: center; min-height: 400px; display: flex; align-items: center; justify-content: center; flex-direction: column; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: rotate 20s linear infinite;"></div>
                    <i class="bi bi-book" style="font-size: 5rem; margin-bottom: 1rem; position: relative; z-index: 1;"></i>
                    <h3 style="margin-bottom: 1rem; position: relative; z-index: 1;">Interactive Learning Dashboard</h3>
                    <p style="color: rgba(255,255,255,0.8); position: relative; z-index: 1;">Real-time feedback & progress tracking</p>
                </div>
                <div class="floating-card">
                    <i class="bi bi-check-circle-fill" style="color: #4caf50;"></i>
                    <span>Tajweed Score: 94% ↑</span>
                </div>
                <div class="floating-card">
                    <i class="bi bi-graph-up" style="color: #4f9d8a;"></i>
                    <span>Memorization: 15 Juz</span>
                </div>
                <div class="floating-card">
                    <i class="bi bi-star-fill" style="color: #ffd966;"></i>
                    <span>Accuracy: Excellent</span>
                </div>
            </div>
        </div>
    </section>

    <div class="divider">✦ ۞ ✦</div>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="section-container">
            <h2 class="section-title">Powerful Features for Serious Learners</h2>
            <p class="section-subtitle">"He has taught him eloquence." (Surah Ar-Rahman, 55:4)</p>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-mic"></i>
                    </div>
                    <h3>AI Recitation Checker</h3>
                    <p>Get real-time feedback on your pronunciation, Tajweed rules, and recitation accuracy with our advanced AI system that analyzes every letter according to the rules of Tajweed.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-brain"></i>
                    </div>
                    <h3>Smart Memorization</h3>
                    <p>AI-powered memorization tracking that identifies weak verses and creates personalized review schedules based on your retention patterns and learning speed.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-journal-bookmark-fill"></i>
                    </div>
                    <h3>Interactive Mushaf</h3>
                    <p>Word-by-word highlighting with Tajweed color coding, multiple translations, and transliterations for deeper understanding and proper pronunciation.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-link"></i>
                    </div>
                    <h3>Memorization Techniques</h3>
                    <p>Multiple methods including linking, cumulative, anchor techniques, and spaced repetition to suit your unique learning style and goals.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-collection-play"></i>
                    </div>
                    <h3>Personal Library</h3>
                    <p>Save your recitations, AI analyses, track progress over time, and revisit past sessions to witness your improvement journey.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-graph-up"></i>
                    </div>
                    <h3>Progress Analytics</h3>
                    <p>Detailed insights into your learning journey with comprehensive analytics, performance metrics, and personalized recommendations for improvement.</p>
                </div>
            </div>
        </div>
    </section>

    <div class="divider">✦ ۞ ✦</div>

    <!-- How It Works -->
    <section id="how-it-works" class="how-it-works">
        <div class="section-container">
            <h2 class="section-title">How Mutqin Works</h2>
            <p class="section-subtitle">"Read! And your Lord is the Most Generous." (Surah Al-Alaq, 96:3)</p>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Choose Your Session</h3>
                    <p>Select surah, reciter, customize your learning preferences, and set your memorization goals for the session.</p>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <h3>Practice & Record</h3>
                    <p>Recite along with word highlighting, practice repetitions, and record yourself for AI analysis.</p>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Get AI Feedback</h3>
                    <p>Receive detailed analysis, personalized improvement tips, and track your progress over time.</p>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <h3>Review & Perfect</h3>
                    <p>Review weak areas, practice consistently, and perfect your recitation with ongoing guidance.</p>
                </div>
            </div>
        </div>
    </section>

    <div class="divider">✦ ۞ ✦</div>

    <!-- Testimonials -->
    <section id="testimonials" class="testimonials">
        <div class="section-container">
            <h2 class="section-title">What Our Students Say</h2>
            <p class="section-subtitle">"Allah will raise those who have believed among you and those who were given knowledge, by degrees." (Surah Al-Mujadila, 58:11)</p>
            <div class="testimonials-grid">
                <div class="testimonial-card">
                    <p class="testimonial-text">"Mutqin has transformed my Quran learning journey. The AI feedback is incredibly accurate and has helped me correct Tajweed mistakes I didn't even know I was making. May Allah reward the team immensely!"</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">A</div>
                        <div class="author-info">
                            <h4>Ahmed Khan</h4>
                            <p>Student since 2024 | 8 Juz Memorized</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card">
                    <p class="testimonial-text">"The memorization techniques and progress tracking have helped me memorize 5 Juz in just 3 months. Best investment in my spiritual journey! The AI identifies exactly where I need more practice."</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">F</div>
                        <div class="author-info">
                            <h4>Fatima Rahman</h4>
                            <p>Hafidha in progress | 15 Juz Completed</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card">
                    <p class="testimonial-text">"As a busy professional, Mutqin fits perfectly into my schedule. The AI analysis saves me hours of self-evaluation time and gives me confidence in my recitation during Salah."</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">O</div>
                        <div class="author-info">
                            <h4>Omar Hassan</h4>
                            <p>Working Professional | Daily Active User</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <div class="divider">✦ ۞ ✦</div>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing">
        <div class="section-container">
            <h2 class="section-title">Choose Your Plan</h2>
            <p class="section-subtitle">"And whatever you spend in good, it will be fully repaid to you." (Surah Al-Baqarah, 2:272)</p>
            <div class="pricing-grid">
                <div class="pricing-card">
                    <h3>Free Plan</h3>
                    <div class="price">$0<span>/month</span></div>
                    <ul class="pricing-features">
                        <li><i class="bi bi-check-circle-fill"></i> Basic recitation checker</li>
                        <li><i class="bi bi-check-circle-fill"></i> 3 surahs available</li>
                        <li><i class="bi bi-check-circle-fill"></i> Daily progress tracking</li>
                        <li><i class="bi bi-x-circle-fill"></i> AI memorization analysis</li>
                        <li><i class="bi bi-x-circle-fill"></i> Personal library</li>
                    </ul>
                    <a href="{{ route('onboarding') }}" class="btn-secondary">Start Free</a>
                </div>
                <div class="pricing-card featured">
                    <h3>Pro Plan</h3>
                    <div class="price">$9.99<span>/month</span></div>
                    <ul class="pricing-features">
                        <li><i class="bi bi-check-circle-fill"></i> Advanced AI recitation analysis</li>
                        <li><i class="bi bi-check-circle-fill"></i> Full Quran access</li>
                        <li><i class="bi bi-check-circle-fill"></i> AI memorization tracking</li>
                        <li><i class="bi bi-check-circle-fill"></i> Unlimited recordings</li>
                        <li><i class="bi bi-check-circle-fill"></i> Priority support</li>
                        <li><i class="bi bi-check-circle-fill"></i> Personalized learning path</li>
                    </ul>
                    <a href="{{ route('onboarding') }}" class="btn-primary">Start Free Trial</a>
                </div>
                <div class="pricing-card">
                    <h3>Family Plan</h3>
                    <div class="price">$19.99<span>/month</span></div>
                    <ul class="pricing-features">
                        <li><i class="bi bi-check-circle-fill"></i> Everything in Pro</li>
                        <li><i class="bi bi-check-circle-fill"></i> Up to 5 family members</li>
                        <li><i class="bi bi-check-circle-fill"></i> Shared progress tracking</li>
                        <li><i class="bi bi-check-circle-fill"></i> Group learning features</li>
                        <li><i class="bi bi-check-circle-fill"></i> Dedicated support</li>
                        <li><i class="bi bi-check-circle-fill"></i> Family dashboard</li>
                    </ul>
                    <a href="{{ route('onboarding') }}" class="btn-secondary">Get Started</a>
                </div>
            </div>
        </div>
    </section>

    <div class="divider">✦ ۞ ✦</div>

    <!-- CTA Section -->
    <section class="cta">
        <div class="section-container">
            <h2>Ready to Perfect Your Recitation?</h2>
            <p>"And the Messenger says, 'O my Lord, indeed my people have taken this Qur'an as a thing abandoned.'" (Surah Al-Furqan, 25:30)</p>
            <p>Don't let the Qur'an be abandoned. Start your journey today with Mutqin and join thousands of students already mastering Quran recitation with our AI-powered platform.</p>
            <a href="{{ route('onboarding') }}" class="btn-primary" style="font-size: 1.1rem;">
                <i class="bi bi-rocket-takeoff"></i> Begin Your Spiritual Journey
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>Mutqin</h4>
                <p style="color: #8ba39a;">AI-powered Quran memorization and recitation platform helping Muslims worldwide connect with the Word of Allah.</p>
            </div>
            <div class="footer-section">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#">Roadmap</a>
            </div>
            <div class="footer-section">
                <h4>Resources</h4>
                <a href="#">Tajweed Guide</a>
                <a href="#">Memorization Tips</a>
                <a href="#">Blog</a>
                <a href="#">Help Center</a>
            </div>
            <div class="footer-section">
                <h4>Company</h4>
                <a href="#">About Us</a>
                <a href="#">Our Mission</a>
                <a href="#">Contact</a>
                <a href="#">Islamic Scholars</a>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Cookie Policy</a>
            </div>
            <div class="footer-section">
                <h4>Connect</h4>
                <div class="social-links">
                    <a href="#"><i class="bi bi-twitter-x"></i></a>
                    <a href="#"><i class="bi bi-instagram"></i></a>
                    <a href="#"><i class="bi bi-youtube"></i></a>
                    <a href="#"><i class="bi bi-facebook"></i></a>
                    <a href="#"><i class="bi bi-telegram"></i></a>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2024 Mutqin. All rights reserved. "And remember the favor of Allah upon you and what has been revealed to you of the Book and wisdom." (Surah Al-Baqarah, 2:231)</p>
        </div>
    </footer>

    <script>
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Navbar background change on scroll
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(10, 14, 12, 0.98)';
                navbar.style.backdropFilter = 'blur(10px)';
            } else {
                navbar.style.background = 'rgba(10, 14, 12, 0.95)';
            }
        });

        // Animated counter for stats
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stats = document.querySelectorAll('.stat-number');
                    stats.forEach(stat => {
                        const finalValue = stat.innerText.replace('+', '');
                        let current = 0;
                        const increment = Math.ceil(finalValue / 50);
                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= finalValue) {
                                stat.innerText = finalValue + (stat.innerText.includes('+') ? '+' : '');
                                clearInterval(timer);
                            } else {
                                stat.innerText = current + (stat.innerText.includes('+') ? '+' : '');
                            }
                        }, 30);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const heroStats = document.querySelector('.hero-stats');
        if (heroStats) observer.observe(heroStats);
    </script>
</body>
</html>
