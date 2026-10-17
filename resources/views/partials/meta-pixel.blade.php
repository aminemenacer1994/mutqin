<script>
(function () {
    var started = false;
    var granted = false;
    function permitted() {
        return window.mutqinMarketingConsent === true && navigator.globalPrivacyControl !== true;
    }
    function sync() {
        if (!permitted()) {
            if (started && granted && typeof window.fbq === 'function') window.fbq('consent', 'revoke');
            granted = false;
            return;
        }
        if (started) {
            if (!granted) {
                window.fbq('consent', 'grant');
                window.fbq('track', 'PageView');
                granted = true;
            }
            return;
        }
        started = true;
        granted = true;
        (function(f,b,e,v,n,t,s) {
            if(f.fbq) return;
            n=f.fbq=function(){n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)};
            if(!f._fbq) f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
            t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s);
        })(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', '969768972218630');
        window.fbq('track', 'PageView');
    }
    window.addEventListener('mutqin:marketing-consent', sync);
    sync();
})();
</script>
