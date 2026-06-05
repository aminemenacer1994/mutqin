@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Mutqin - AI-Powered Quran Memorization</title>
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
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 20% 50%, rgba(79, 157, 138, 0.1) 0%, transparent 50%);
            pointer-events: none;
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
            background: linear-gradient(135deg, #ffffff, #4f9d8a);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
        }

        .hero-content p {
            font-size: 1.2rem;
            color: #8ba39a;
            margin-bottom: 2rem;
            line-height: 1.6;
        }

        .hero-buttons {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
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
        }

        .stat {
            text-align: center;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: 800;
            color: #4f9d8a;
        }

        .stat-label {
            font-size: 0.85rem;
            color: #8ba39a;
        }

        .hero-image {
            position: relative;
        }

        .hero-image img {
            width: 100%;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
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
        }

        .feature-card:hover {
            transform: translateY(-5px);
            border-color: rgba(79, 157, 138, 0.5);
            box-shadow: 0 10px 30px rgba(79, 157, 138, 0.1);
        }

        .feature-icon {
            font-size: 2.5rem;
            color: #4f9d8a;
            margin-bottom: 1.5rem;
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
        }

        .step-number {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #4f9d8a, #3d7a6b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0 auto 1.5rem;
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
        }

        .testimonial-text {
            font-style: italic;
            margin-bottom: 1.5rem;
            line-height: 1.6;
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
        }

        .pricing-card.featured {
            border: 2px solid #4f9d8a;
            transform: scale(1.05);
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

        /* CTA Section */
        .cta {
            padding: 5rem 2rem;
            background: linear-gradient(135deg, rgba(79, 157, 138, 0.1), rgba(61, 122, 107, 0.1));
            text-align: center;
        }

        .cta h2 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .cta p {
            color: #8ba39a;
            margin-bottom: 2rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
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
        }

        .footer-section a {
            display: block;
            color: #8ba39a;
            text-decoration: none;
            margin-bottom: 0.5rem;
            transition: color 0.3s ease;
        }

        .footer-section a:hover {
            color: #4f9d8a;
        }

        .social-links {
            display: flex;
            gap: 1rem;
        }

        .social-links a {
            font-size: 1.5rem;
        }

        .footer-bottom {
            text-align: center;
            padding-top: 2rem;
            border-top: 1px solid rgba(79, 157, 138, 0.2);
            color: #8ba39a;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero-container {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .hero-content h1 {
                font-size: 2.5rem;
            }

            .hero-buttons {
                justify-content: center;
            }

            .hero-stats {
                justify-content: center;
            }

            .nav-links {
                display: none;
            }

            .section-title {
                font-size: 2rem;
            }

            .pricing-card.featured {
                transform: scale(1);
            }
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
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
                <a href="{{ route('onboarding') }}" class="btn-nav">Get Started</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-container">
            <div class="hero-content">
                <h1>Master Quran Recitation with AI-Powered Precision</h1>
                <p>Join thousands of students perfecting their Tajweed and memorization with real-time AI feedback, personalized learning paths, and interactive tools.</p>
                <div class="hero-buttons">
                    <a href="{{ route('onboarding') }}" class="btn-primary">
                        <i class="bi bi-rocket-takeoff"></i> Start Free Trial
                    </a>
                    <a href="#features" class="btn-secondary">
                        <i class="bi bi-play-circle"></i> Watch Demo
                    </a>
                </div>
                <div class="hero-stats">
                    <div class="stat">
                        <div class="stat-number">10K+</div>
                        <div class="stat-label">Active Students</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">98%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">50+</div>
                        <div class="stat-label">Countries</div>
                    </div>
                </div>
            </div>
            <div class="hero-image">
                <div style="background: linear-gradient(135deg, #4f9d8a, #3d7a6b); border-radius: 20px; padding: 2rem; text-align: center; min-height: 400px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                    <i class="bi bi-book" style="font-size: 5rem; margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 1rem;">Interactive Learning Dashboard</h3>
                    <p style="color: rgba(255,255,255,0.8);">Real-time feedback & progress tracking</p>
                </div>
                <div class="floating-card">
                    <i class="bi bi-check-circle-fill" style="color: #4caf50;"></i>
                    <span>Tajweed Score: 94%</span>
                </div>
                <div class="floating-card">
                    <i class="bi bi-graph-up" style="color: #4f9d8a;"></i>
                    <span>Memorization: 15 Juz</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="section-container">
            <h2 class="section-title">Powerful Features for Serious Learners</h2>
            <p class="section-subtitle">Everything you need to master Quran recitation and memorization</p>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-mic"></i>
                    </div>
                    <h3>AI Recitation Checker</h3>
                    <p>Get real-time feedback on your pronunciation, Tajweed rules, and recitation accuracy with our advanced AI system.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-brain"></i>
                    </div>
                    <h3>Smart Memorization</h3>
                    <p>AI-powered memorization tracking that identifies weak verses and creates personalized review schedules.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-journal-bookmark-fill"></i>
                    </div>
                    <h3>Interactive Mushaf</h3>
                    <p>Word-by-word highlighting with Tajweed color coding, translations, and transliterations for deeper understanding.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-link"></i>
                    </div>
                    <h3>Memorization Techniques</h3>
                    <p>Multiple methods including linking, cumulative, and anchor techniques to suit your learning style.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-collection-play"></i>
                    </div>
                    <h3>Personal Library</h3>
                    <p>Save your recitations, AI analyses, and track your progress over time in your personal library.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="bi bi-graph-up"></i>
                    </div>
                    <h3>Progress Analytics</h3>
                    <p>Detailed insights into your learning journey with comprehensive analytics and performance metrics.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="how-it-works">
        <div class="section-container">
            <h2 class="section-title">How Mutqin Works</h2>
            <p class="section-subtitle">Start your Quran learning journey in 3 simple steps</p>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Choose Your Session</h3>
                    <p>Select surah, reciter, and customize your learning preferences</p>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <h3>Practice & Record</h3>
                    <p>Recite along with word highlighting and record yourself</p>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Get AI Feedback</h3>
                    <p>Receive detailed analysis and personalized improvement tips</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials -->
    <section id="testimonials" class="testimonials">
        <div class="section-container">
            <h2 class="section-title">What Our Students Say</h2>
            <p class="section-subtitle">Join thousands of satisfied learners worldwide</p>
            <div class="testimonials-grid">
                <div class="testimonial-card">
                    <p class="testimonial-text">"Mutqin has transformed my Quran learning journey. The AI feedback is incredibly accurate and has helped me correct Tajweed mistakes I didn't even know I was making!"</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">A</div>
                        <div class="author-info">
                            <h4>Ahmed Khan</h4>
                            <p>Student since 2024</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card">
                    <p class="testimonial-text">"The memorization techniques and progress tracking have helped me memorize 5 Juz in just 3 months. Best investment in my spiritual journey!"</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">F</div>
                        <div class="author-info">
                            <h4>Fatima Rahman</h4>
                            <p>Hafidha in progress</p>
                        </div>
                    </div>
                </div>
                <div class="testimonial-card">
                    <p class="testimonial-text">"As a busy professional, Mutqin fits perfectly into my schedule. The AI analysis saves me hours of self-evaluation time."</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">O</div>
                        <div class="author-info">
                            <h4>Omar Hassan</h4>
                            <p>Working Professional</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing">
        <div class="section-container">
            <h2 class="section-title">Choose Your Plan</h2>
            <p class="section-subtitle">Start free and upgrade as you grow</p>
            <div class="pricing-grid">
                <div class="pricing-card">
                    <h3>Free</h3>
                    <div class="price">$0<span>/month</span></div>
                    <ul class="pricing-features">
                        <li><i class="bi bi-check"></i> Basic recitation checker</li>
                        <li><i class="bi bi-check"></i> 3 surahs available</li>
                        <li><i class="bi bi-check"></i> Daily progress tracking</li>
                        <li><i class="bi bi-x"></i> AI memorization analysis</li>
                        <li><i class="bi bi-x"></i> Personal library</li>
                    </ul>
                    <a href="{{ route('onboarding') }}" class="btn-secondary">Get Started</a>
                </div>
                <div class="pricing-card featured">
                    <h3>Pro</h3>
                    <div class="price">$9.99<span>/month</span></div>
                    <ul class="pricing-features">
                        <li><i class="bi bi-check"></i> Advanced AI recitation analysis</li>
                        <li><i class="bi bi-check"></i> Full Quran access</li>
                        <li><i class="bi bi-check"></i> AI memorization tracking</li>
                        <li><i class="bi bi-check"></i> Unlimited recordings</li>
                        <li><i class="bi bi-check"></i> Priority support</li>
                    </ul>
                    <a href="{{ route('onboarding') }}" class="btn-primary">Start Free Trial</a>
                </div>
                <div class="pricing-card">
                    <h3>Family</h3>
                    <div class="price">$19.99<span>/month</span></div>
                    <ul class="pricing-features">
                        <li><i class="bi bi-check"></i> Everything in Pro</li>
                        <li><i class="bi bi-check"></i> Up to 5 family members</li>
                        <li><i class="bi bi-check"></i> Shared progress tracking</li>
                        <li><i class="bi bi-check"></i> Group learning features</li>
                        <li><i class="bi bi-check"></i> Dedicated support</li>
                    </ul>
                    <a href="{{ route('onboarding') }}" class="btn-secondary">Get Started</a>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
        <div class="section-container">
            <h2>Ready to Perfect Your Recitation?</h2>
            <p>Join thousands of students already mastering Quran recitation with Mutqin's AI-powered platform.</p>
            <a href="{{ route('onboarding') }}" class="btn-primary" style="font-size: 1.1rem;">
                <i class="bi bi-rocket-takeoff"></i> Start Your Free Trial
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>Mutqin</h4>
                <p style="color: #8ba39a;">AI-powered Quran memorization and recitation platform.</p>
            </div>
            <div class="footer-section">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#how-it-works">How It Works</a>
            </div>
            <div class="footer-section">
                <h4>Company</h4>
                <a href="#">About Us</a>
                <a href="#">Blog</a>
                <a href="#">Contact</a>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
            </div>
            <div class="footer-section">
                <h4>Follow Us</h4>
                <div class="social-links">
                    <a href="#"><i class="bi bi-twitter-x"></i></a>
                    <a href="#"><i class="bi bi-instagram"></i></a>
                    <a href="#"><i class="bi bi-youtube"></i></a>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2024 Mutqin. All rights reserved.</p>
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
            } else {
                navbar.style.background = 'rgba(10, 14, 12, 0.95)';
            }
        });
    </script>
</body>
</html>