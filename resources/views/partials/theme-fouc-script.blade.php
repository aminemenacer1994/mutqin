    <script>
      (function () {
        var modes = @json(\App\Support\Theme::clientCatalog());
        var defaultTheme = @json(\App\Support\Theme::DEFAULT);
        var userId = @json(Auth::id());
        var accountTheme = @json(
            Auth::check() && is_string(Auth::user()->theme) && Auth::user()->theme !== ''
                ? \App\Support\Theme::toDataTheme(Auth::user()->theme)
                : null
        );
        var storagePrefix = 'mutqin:theme';
        var byId = {};
        for (var i = 0; i < modes.length; i++) byId[modes[i].id] = modes[i];
        function normalize(value) {
          var raw = String(value || '').toLowerCase();
          if (raw === 'dark' || raw === 'dark-mode') return 'dark';
          if (raw === 'sepia' || raw === 'sepia-mode') return 'sepia';
          if (raw === 'light' || raw === 'light-mode') return 'light';
          if (byId[raw]) return raw;
          for (var j = 0; j < modes.length; j++) {
            if (modes[j].preference === raw) return modes[j].id;
          }
          return defaultTheme;
        }
        function readLocal(key) {
          try { return localStorage.getItem(key); } catch (e) { return null; }
        }
        function storageKey(owner) {
          return storagePrefix + ':' + (owner != null && String(owner).trim() !== '' ? String(owner) : 'guest');
        }
        function resolveTheme() {
          var guestKey = storageKey('guest');
          if (userId) {
            if (accountTheme) return normalize(accountTheme);
            return normalize(readLocal(storageKey(userId)))
              || normalize(readLocal(guestKey))
              || defaultTheme;
          }
          return normalize(readLocal(guestKey))
            || normalize(document.documentElement.getAttribute('data-theme'))
            || defaultTheme;
        }
        var theme = resolveTheme();
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.toggle('dark-mode', theme === 'dark');
        var chrome = byId[theme] || byId[defaultTheme];
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta && chrome) {
          meta.setAttribute('content', chrome.themeColor);
          meta.removeAttribute('media');
        }
        var scheme = document.querySelector('meta[name="color-scheme"]');
        if (scheme && chrome) scheme.setAttribute('content', chrome.colorScheme);
        if (chrome) document.documentElement.style.colorScheme = chrome.colorScheme;
      })();
    </script>
