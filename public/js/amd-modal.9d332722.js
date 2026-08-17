"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["amd-modal"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=script&lang=js":
/*!**********************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=script&lang=js ***!
  \**********************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _scripts_memorisationDetection_liveAutoFollow__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scripts/memorisationDetection/liveAutoFollow */ "./resources/js/scripts/memorisationDetection/liveAutoFollow.js");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

var AMD_FOCUSABLE_SELECTOR = ['a[href]', 'button:not([disabled])', 'textarea:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'].join(', ');
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'AiMemorisationDetectionModal',
  props: {
    open: {
      type: Boolean,
      "default": false
    },
    stage: {
      type: String,
      "default": 'ready'
    },
    title: {
      type: String,
      "default": 'Check your memorisation'
    },
    rangeLabel: {
      type: String,
      "default": ''
    },
    betaBadge: {
      type: String,
      "default": 'Beta'
    },
    disclaimer: {
      type: String,
      "default": ''
    },
    micStatus: {
      type: String,
      "default": 'ready'
    },
    micStatusLabel: {
      type: String,
      "default": 'Ready'
    },
    micGuidance: {
      type: String,
      "default": ''
    },
    liveHint: {
      type: String,
      "default": ''
    },
    recordingActiveLabel: {
      type: String,
      "default": 'Recording'
    },
    ayahHtml: {
      type: String,
      "default": ''
    },
    blurActive: {
      type: Boolean,
      "default": true
    },
    peeking: {
      type: Boolean,
      "default": false
    },
    difficulty: {
      type: Number,
      "default": 100
    },
    difficultyOptions: {
      type: Array,
      "default": function _default() {
        return [10, 25, 50, 75, 100];
      }
    },
    error: {
      type: String,
      "default": ''
    },
    busy: {
      type: Boolean,
      "default": false
    },
    endingSoon: {
      type: Boolean,
      "default": false
    },
    errorAction: {
      type: String,
      "default": 'retry'
    },
    closeLabel: {
      type: String,
      "default": 'Close'
    },
    toolsLabel: {
      type: String,
      "default": 'Memorisation tools'
    },
    blurLabel: {
      type: String,
      "default": 'Blur'
    },
    peekLabel: {
      type: String,
      "default": 'Peek'
    },
    stopLabel: {
      type: String,
      "default": 'Stop'
    },
    startLabel: {
      type: String,
      "default": 'Start recording'
    },
    startHint: {
      type: String,
      "default": 'Tap the red button, then recite from memory'
    },
    resetLabel: {
      type: String,
      "default": 'Reset'
    },
    peekHintLabel: {
      type: String,
      "default": 'Need a hint? Peek at the text'
    },
    difficultyLabel: {
      type: String,
      "default": 'Difficulty'
    },
    wordsShownLabel: {
      type: String,
      "default": 'Words shown'
    },
    textSizeLabel: {
      type: String,
      "default": 'Text size'
    },
    textSizeIncreaseLabel: {
      type: String,
      "default": 'Increase text size'
    },
    textSizeDecreaseLabel: {
      type: String,
      "default": 'Decrease text size'
    },
    peekHintShort: {
      type: String,
      "default": 'Hold to reveal'
    },
    wordsShownShort: {
      type: String,
      "default": 'Words shown'
    },
    textSizeShort: {
      type: String,
      "default": 'Text size'
    },
    elapsedLabel: {
      type: String,
      "default": '00:00'
    },
    elapsedTimerLabel: {
      type: String,
      "default": 'Recitation time'
    },
    elapsedTimerHint: {
      type: String,
      "default": 'How long this recitation has taken'
    },
    theme: {
      type: String,
      "default": ''
    },
    mistakeVisualActive: {
      type: Boolean,
      "default": false
    },
    mistakeVisualLabel: {
      type: String,
      "default": 'Mistake confirmed'
    },
    autoFollowLabel: {
      type: String,
      "default": 'Auto-follow'
    },
    autoFollowOnLabel: {
      type: String,
      "default": 'Auto-follow on'
    },
    autoFollowOffLabel: {
      type: String,
      "default": 'Auto-follow off'
    },
    autoFollowPausedLabel: {
      type: String,
      "default": 'Auto-follow paused'
    },
    autoFollowResumeLabel: {
      type: String,
      "default": 'Resume auto-follow'
    },
    autoFollowHint: {
      type: String,
      "default": 'Keep the active word near eye level'
    },
    completeTitle: {
      type: String,
      "default": 'Mā shā’ Allāh — check complete'
    },
    completeBody: {
      type: String,
      "default": 'You recalled this range successfully.'
    },
    sessionEndedLabel: {
      type: String,
      "default": 'Session complete'
    },
    sessionEndedBody: {
      type: String,
      "default": 'Returning to your next-step plan…'
    },
    testAgainLabel: {
      type: String,
      "default": 'Check again'
    },
    doneLabel: {
      type: String,
      "default": 'Done'
    },
    enableMicLabel: {
      type: String,
      "default": 'Enable microphone'
    },
    tryAgainLabel: {
      type: String,
      "default": 'Try again'
    },
    genericError: {
      type: String,
      "default": 'Something went wrong. Please try again.'
    },
    emptyAyahTitle: {
      type: String,
      "default": 'Ayah text not ready'
    },
    emptyAyahDesc: {
      type: String,
      "default": 'We could not show the ayah for this check. Close and try again.'
    }
  },
  emits: ['cancel', 'toggle-blur', 'peek-start', 'peek-end', 'reset', 'set-difficulty', 'start', 'stop', 'test-again', 'done', 'retry', 'enable-mic'],
  data: function data() {
    return {
      difficultyId: "amd-diff-".concat(Math.random().toString(36).slice(2, 9)),
      _htmlSyncTimer: null,
      _lastMushafHtml: '',
      _peekKeyHeld: false,
      fontScale: 1.12,
      minFontScale: 0.9,
      maxFontScale: 1.45,
      themeAttr: 'light',
      _themeObserver: null,
      _returnFocusEl: null,
      autoFollowEnabled: true,
      autoFollowPaused: false,
      _autoFollow: null,
      _activeWordIndex: null,
      _shellResizeObserver: null,
      _orientationHandler: null
    };
  },
  computed: {
    isComplete: function isComplete() {
      return this.stage === 'complete';
    },
    isError: function isError() {
      return this.stage === 'error';
    },
    isListening: function isListening() {
      return this.stage === 'listening' || this.stage === 'starting';
    },
    isStarting: function isStarting() {
      return this.stage === 'starting';
    },
    isProcessing: function isProcessing() {
      var stage = String(this.stage || '');
      return stage === 'processing' || stage === 'analysing';
    },
    // Keep gap/blur mask chrome through idle → record → stop → processing.
    // Never drop presentation classes on stage changes (that flashes full text).
    keepVisibilityMask: function keepVisibilityMask() {
      if (this.endingSoon || this.isProcessing) return true;
      return !this.isComplete;
    },
    isReady: function isReady() {
      if (this.endingSoon || this.isComplete || this.isListening) return false;
      if (this.isProcessing) return false;
      return ['ready', 'idle', 'paused', 'error'].includes(String(this.stage || 'ready'));
    },
    showAyahEmptyState: function showAyahEmptyState() {
      if (this.endingSoon || this.isComplete) return false;
      if (this.isListening || this.isStarting) return false;
      var html = String(this.ayahHtml || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
      return !html;
    },
    displayErrorMessage: function displayErrorMessage() {
      var text = String(this.error || '').trim();
      if (!text) return this.genericError;
      if (text.length > 180 || /stack|exception|traceback|sqlstate|http\/|status code|econn|enotfound|undefined is not|cannot read/i.test(text) || /[{}\[\]]/.test(text)) {
        return this.genericError;
      }
      return text;
    },
    canStop: function canStop() {
      if (this.endingSoon || this.isComplete) return false;
      // Keep Stop visible while listening/starting; Processing uses the handoff spinner.
      return this.isListening;
    },
    displayMicStatusLabel: function displayMicStatusLabel() {
      if (this.isProcessing || this.endingSoon) {
        return this.liveHint || 'Processing…';
      }
      // Record → Recording immediately (starting + listening). Keep one status pill only.
      if (this.stage === 'listening' || this.isStarting) {
        return this.recordingActiveLabel || this.micStatusLabel || 'Recording';
      }
      return this.micStatusLabel || 'Ready';
    },
    stopActionLabel: function stopActionLabel() {
      if (this.isProcessing || this.endingSoon) {
        return this.liveHint || 'Processing…';
      }
      if (this.stage === 'listening') {
        return this.stopLabel || 'Stop recording';
      }
      return this.stopLabel || 'Stop';
    },
    showInlineError: function showInlineError() {
      return !!this.error && !this.isComplete && ['need_access', 'unsupported', 'unavailable', 'denied'].includes(this.micStatusKey);
    },
    peekShortLabel: function peekShortLabel() {
      return this.peekLabel || 'Peek';
    },
    peekHintShortLabel: function peekHintShortLabel() {
      return this.peekHintShort || 'Hold to reveal';
    },
    wordsShownShortLabel: function wordsShownShortLabel() {
      return this.wordsShownShort || 'Words shown';
    },
    /** Hide% from parent → words-shown% for the select (0 / 25 / 50 / 75 / 90). */selectedShownPercent: function selectedShownPercent() {
      return this.hidePercentToShown(this.difficulty);
    },
    shownPercentOptions: function shownPercentOptions() {
      var _this = this;
      var hides = Array.isArray(this.difficultyOptions) && this.difficultyOptions.length ? this.difficultyOptions : [10, 25, 50, 75, 100];
      var shown = hides.map(function (hide) {
        return _this.hidePercentToShown(hide);
      });
      return _toConsumableArray(new Set(shown)).sort(function (a, b) {
        return a - b;
      });
    },
    autoFollowStatusLabel: function autoFollowStatusLabel() {
      if (!this.autoFollowEnabled) return this.autoFollowOffLabel || 'Auto-follow off';
      if (this.autoFollowPaused) return this.autoFollowPausedLabel || 'Auto-follow paused';
      return this.autoFollowOnLabel || 'Auto-follow on';
    },
    micStatusKey: function micStatusKey() {
      var raw = String(this.micStatus || 'ready').toLowerCase();
      if (raw === 'granted' || raw === 'prompt' || raw === 'unknown') return 'ready';
      if (raw === 'denied') return 'need_access';
      if (raw === 'unsupported') return 'unavailable';
      return raw;
    }
  },
  watch: {
    open: function open(isOpen) {
      var _this2 = this;
      if (isOpen) {
        this.captureReturnFocus();
        this.syncThemeAttr();
        this.ensureAutoFollowController();
        this.$nextTick(function () {
          _this2.bindAutoFollowShell();
          _this2.scheduleMushafHtml(_this2.ayahHtml, true);
          _this2.focusInitialElement();
        });
      } else {
        this.onPeekEnd();
        this.unbindAutoFollowShell();
        this.restoreReturnFocus();
      }
    },
    theme: function theme() {
      this.syncThemeAttr();
    },
    ayahHtml: function ayahHtml(html) {
      // Apply immediately so masked HTML is in the DOM before the next paint.
      // Delayed/stage-driven replaces caused a full-text flash on record start/stop.
      if (this.open) this.scheduleMushafHtml(html, true);
    },
    fontScale: function fontScale() {
      if (this.open) this.scheduleAutoFollow();
    }
  },
  mounted: function mounted() {
    var _this3 = this;
    this.syncThemeAttr();
    this.ensureAutoFollowController();
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this._themeObserver = new MutationObserver(function () {
        return _this3.syncThemeAttr();
      });
      this._themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }
    if (this.open) {
      this.captureReturnFocus();
      this.$nextTick(function () {
        _this3.bindAutoFollowShell();
        // v-if mount with :open="true" does not fire the open watcher — seed HTML here.
        _this3.scheduleMushafHtml(_this3.ayahHtml, true);
        _this3.focusInitialElement();
      });
    }
  },
  beforeUnmount: function beforeUnmount() {
    var _this$_autoFollow, _this$_autoFollow$dis;
    if (this._htmlSyncTimer) {
      clearTimeout(this._htmlSyncTimer);
      this._htmlSyncTimer = null;
    }
    if (this._themeObserver) {
      this._themeObserver.disconnect();
      this._themeObserver = null;
    }
    this.unbindAutoFollowShell();
    (_this$_autoFollow = this._autoFollow) === null || _this$_autoFollow === void 0 || (_this$_autoFollow$dis = _this$_autoFollow.dispose) === null || _this$_autoFollow$dis === void 0 || _this$_autoFollow$dis.call(_this$_autoFollow);
    this._autoFollow = null;
    this.onPeekEnd();
    if (this.open) this.restoreReturnFocus();
  },
  methods: {
    onStart: function onStart() {
      if (this.busy || this.endingSoon || this.isProcessing || this.isListening) return;
      this.$emit('start');
    },
    onStop: function onStop() {
      if (this.endingSoon || this.isProcessing || this.isComplete) return;
      if (!this.isListening) return;
      this.$emit('stop');
    },
    syncThemeAttr: function syncThemeAttr() {
      var _document$querySelect, _document, _document$querySelect2;
      if (typeof document === 'undefined') {
        this.themeAttr = 'light';
        return;
      }
      var fromProp = String(this.theme || '').trim();
      if (fromProp) {
        this.themeAttr = fromProp;
        return;
      }
      var fromApp = (_document$querySelect = (_document = document).querySelector) === null || _document$querySelect === void 0 || (_document$querySelect = _document$querySelect.call(_document, '.app')) === null || _document$querySelect === void 0 || (_document$querySelect2 = _document$querySelect.getAttribute) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.call(_document$querySelect, 'data-theme');
      this.themeAttr = fromApp || document.documentElement.getAttribute('data-theme') || 'light';
    },
    hidePercentToShown: function hidePercentToShown(hidePercent) {
      var hide = Number(hidePercent);
      if (!Number.isFinite(hide)) return 0;
      return hide >= 100 ? 0 : Math.max(0, Math.min(100, 100 - hide));
    },
    shownPercentToHide: function shownPercentToHide(shownPercent) {
      var shown = Number(shownPercent);
      if (!Number.isFinite(shown) || shown <= 0) return 100;
      return Math.max(0, Math.min(100, 100 - shown));
    },
    formatShownPercent: function formatShownPercent(hidePercent) {
      return "".concat(this.hidePercentToShown(hidePercent), "%");
    },
    increaseFontScale: function increaseFontScale() {
      this.fontScale = Math.min(this.maxFontScale, Math.round((this.fontScale + 0.08) * 100) / 100);
    },
    decreaseFontScale: function decreaseFontScale() {
      this.fontScale = Math.max(this.minFontScale, Math.round((this.fontScale - 0.08) * 100) / 100);
    },
    setMushafHtml: function setMushafHtml() {
      var html = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      // Explicit surface syncs (seed, tajweed toggle, complete) must replace DOM.
      this.scheduleMushafHtml(html, true);
    },
    ensureAutoFollowController: function ensureAutoFollowController() {
      var _this4 = this;
      if (this._autoFollow) return this._autoFollow;
      this._autoFollow = (0,_scripts_memorisationDetection_liveAutoFollow__WEBPACK_IMPORTED_MODULE_0__.createLiveAutoFollowController)({
        enabled: true,
        onPauseChange: function onPauseChange(_ref) {
          var paused = _ref.paused;
          _this4.autoFollowEnabled = true;
          _this4.autoFollowPaused = !!paused;
        },
        followNow: function followNow() {
          return _this4.scrollActiveIntoView(_this4.$refs.mushafSurface, {
            force: true
          });
        }
      });
      return this._autoFollow;
    },
    bindAutoFollowShell: function bindAutoFollowShell() {
      var _this5 = this;
      var shell = this.$refs.mushafShell;
      if (!shell) return;
      if (typeof ResizeObserver !== 'undefined') {
        var _this$_shellResizeObs, _this$_shellResizeObs2;
        (_this$_shellResizeObs = this._shellResizeObserver) === null || _this$_shellResizeObs === void 0 || (_this$_shellResizeObs2 = _this$_shellResizeObs.disconnect) === null || _this$_shellResizeObs2 === void 0 || _this$_shellResizeObs2.call(_this$_shellResizeObs);
        this._shellResizeObserver = new ResizeObserver(function () {
          return _this5.scheduleAutoFollow();
        });
        this._shellResizeObserver.observe(shell);
      }
      if (typeof window !== 'undefined') {
        this._orientationHandler = function () {
          return _this5.scheduleAutoFollow();
        };
        window.addEventListener('orientationchange', this._orientationHandler);
        window.addEventListener('resize', this._orientationHandler);
      }
    },
    unbindAutoFollowShell: function unbindAutoFollowShell() {
      var _this$_shellResizeObs3, _this$_shellResizeObs4;
      (_this$_shellResizeObs3 = this._shellResizeObserver) === null || _this$_shellResizeObs3 === void 0 || (_this$_shellResizeObs4 = _this$_shellResizeObs3.disconnect) === null || _this$_shellResizeObs4 === void 0 || _this$_shellResizeObs4.call(_this$_shellResizeObs3);
      this._shellResizeObserver = null;
      if (typeof window !== 'undefined' && this._orientationHandler) {
        window.removeEventListener('orientationchange', this._orientationHandler);
        window.removeEventListener('resize', this._orientationHandler);
      }
      this._orientationHandler = null;
    },
    onMushafShellScroll: function onMushafShellScroll() {
      var controller = this.ensureAutoFollowController();
      if (controller.isProgrammaticScroll) return;
      controller.onContainerScroll();
    },
    onToggleAutoFollow: function onToggleAutoFollow() {
      // Auto-follow is always on; resume if paused by a manual scroll.
      var controller = this.ensureAutoFollowController();
      if (this.autoFollowPaused) {
        controller.resume({
          followNow: true
        });
      }
      controller.setEnabled(true, {
        persist: true
      });
      this.autoFollowEnabled = true;
      if (!this.autoFollowPaused) this.scheduleAutoFollow({
        force: true
      });
    },
    onResumeAutoFollow: function onResumeAutoFollow() {
      this.ensureAutoFollowController().resume({
        followNow: true
      });
      this.autoFollowEnabled = true;
    },
    scheduleAutoFollow: function scheduleAutoFollow() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var controller = this.ensureAutoFollowController();
      controller.scheduleFollow({
        container: this.$refs.mushafShell,
        root: this.$refs.mushafSurface,
        activeIndex: this._activeWordIndex,
        force: !!options.force,
        reducedMotion: (0,_scripts_memorisationDetection_liveAutoFollow__WEBPACK_IMPORTED_MODULE_0__.prefersReducedMotion)()
      });
    },
    patchWordStatuses: function patchWordStatuses() {
      var _this6 = this;
      var patches = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      var el = this.$refs.mushafSurface;
      if (!el || !Array.isArray(patches) || !patches.length) return false;
      var controller = this.ensureAutoFollowController();
      var changed = false;
      var currentIndex = null;
      var prevActive = this._activeWordIndex;
      var _iterator = _createForOfIteratorHelper(patches),
        _step;
      try {
        var _loop = function _loop() {
            var _node, _node2, _node$querySelector, _node3;
            var patch = _step.value;
            var index = Number(patch === null || patch === void 0 ? void 0 : patch.index);
            if (!Number.isFinite(index)) return 0; // continue
            var node = controller.wordCache.get(index);
            if (!((_node = node) !== null && _node !== void 0 && _node.isConnected)) {
              node = el.querySelector("[data-recitation-word-index=\"".concat(index, "\"]"));
              if (node) controller.wordCache.set(index, node);
            }
            if (!((_node2 = node) !== null && _node2 !== void 0 && _node2.classList)) return 0; // continue
            var status = String(patch.status || 'notAttempted');
            var statusClass = "recitation-word-".concat(status);
            if (!node.classList.contains(statusClass)) {
              ;
              ['correct', 'partial', 'incorrect', 'omitted', 'notAttempted', 'pending'].forEach(function (name) {
                node.classList.remove("recitation-word-".concat(name));
              });
              node.classList.add(statusClass);
            }
            var shouldMask = patch.masked === true || patch.hidden === true;
            if (shouldMask) {
              node.classList.add('amd-word-hidden');
              node.setAttribute('aria-hidden', 'true');
              node.setAttribute('data-masked', '1');
            } else {
              node.classList.remove('amd-word-hidden');
              node.removeAttribute('aria-hidden');
              node.removeAttribute('data-masked');
            }
            node.classList.toggle('amd-word-revealed', !!patch.revealed);
            node.classList.toggle('amd-word-current', !!patch.current);
            node.classList.toggle('amd-word-peeked', !!patch.peeked);
            node.classList.toggle('tajweed-needs-review', status === 'incorrect' || status === 'partial');
            var tajweedActive = patch.tajweedActive != null ? !!patch.tajweedActive : !!patch.current;
            // Skip child-mark scans when the word has no tajweed markup.
            if (node.classList.contains('tajweed-segment-host') || (_node$querySelector = (_node3 = node).querySelector) !== null && _node$querySelector !== void 0 && _node$querySelector.call(_node3, '.tajweed-mark, .tajweed-segment')) {
              _this6.syncTajweedSegmentState(node, {
                active: tajweedActive,
                completed: status === 'correct',
                needsReview: status === 'incorrect' || status === 'partial'
              });
            } else {
              node.classList.toggle('is-tajweed-active', !!tajweedActive);
            }
            if (patch.current || tajweedActive) currentIndex = index;
            changed = true;
          },
          _ret;
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          _ret = _loop();
          if (_ret === 0) continue;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      if (currentIndex != null) {
        this._activeWordIndex = currentIndex;
        this.clearOtherActiveTajweedSegments(el, currentIndex);
      }
      // Follow only when the confirmed cursor moves — not on every status paint.
      if (changed && currentIndex != null && currentIndex !== prevActive) {
        this.scrollActiveIntoView(el);
      }
      return changed;
    },
    syncTajweedSegmentState: function syncTajweedSegmentState(node) {
      var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref2$active = _ref2.active,
        active = _ref2$active === void 0 ? false : _ref2$active,
        _ref2$completed = _ref2.completed,
        completed = _ref2$completed === void 0 ? false : _ref2$completed,
        _ref2$needsReview = _ref2.needsReview,
        needsReview = _ref2$needsReview === void 0 ? false : _ref2$needsReview;
      if (!(node !== null && node !== void 0 && node.querySelectorAll)) return;
      node.querySelectorAll('.tajweed-mark, .tajweed-segment').forEach(function (mark) {
        mark.classList.toggle('is-active', !!active);
        mark.classList.toggle('is-confirmed-active', !!active);
        mark.classList.toggle('is-completed', !!completed);
        mark.classList.toggle('needs-review', !!needsReview);
      });
      node.classList.toggle('tajweed-segment-host', node.querySelector('.tajweed-mark, .tajweed-segment') != null);
      node.classList.toggle('is-tajweed-active', !!active);
    },
    clearOtherActiveTajweedSegments: function clearOtherActiveTajweedSegments(root, activeIndex) {
      var _node4, _node5, _node$querySelectorAl, _node6;
      var prev = this._lastActiveTajweedIndex;
      this._lastActiveTajweedIndex = activeIndex;
      if (!Number.isFinite(prev) || prev === activeIndex) return;
      var controller = this.ensureAutoFollowController();
      var node = controller.wordCache.get(prev);
      if (!((_node4 = node) !== null && _node4 !== void 0 && _node4.isConnected) && root !== null && root !== void 0 && root.querySelector) {
        node = root.querySelector("[data-recitation-word-index=\"".concat(prev, "\"]"));
        if (node) controller.wordCache.set(prev, node);
      }
      if (!((_node5 = node) !== null && _node5 !== void 0 && _node5.classList)) {
        // Fallback only when cache misses — avoid full-tree scans on every tick.
        if (!(root !== null && root !== void 0 && root.querySelectorAll)) return;
        root.querySelectorAll('.amd-word-current, .is-tajweed-active').forEach(function (el) {
          var idx = Number(el.getAttribute('data-recitation-word-index'));
          if (idx === activeIndex) return;
          el.classList.remove('amd-word-current', 'is-tajweed-active');
          el.querySelectorAll('.tajweed-mark.is-active, .tajweed-mark.is-confirmed-active, .tajweed-segment.is-active, .tajweed-segment.is-confirmed-active').forEach(function (mark) {
            mark.classList.remove('is-active', 'is-confirmed-active');
          });
        });
        return;
      }
      node.classList.remove('amd-word-current', 'is-tajweed-active');
      (_node$querySelectorAl = (_node6 = node).querySelectorAll) === null || _node$querySelectorAl === void 0 || _node$querySelectorAl.call(_node6, '.tajweed-mark.is-active, .tajweed-mark.is-confirmed-active, .tajweed-segment.is-active, .tajweed-segment.is-confirmed-active').forEach(function (mark) {
        mark.classList.remove('is-active', 'is-confirmed-active');
      });
    },
    scheduleMushafHtml: function scheduleMushafHtml() {
      var _this$$refs$mushafSur,
        _this7 = this;
      var html = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var immediate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (this._htmlSyncTimer) clearTimeout(this._htmlSyncTimer);
      // Never rebuild the mushaf DOM mid-listening unless forced — patches handle status.
      var listening = this.stage === 'listening' || this.stage === 'starting';
      if (listening && !immediate && (_this$$refs$mushafSur = this.$refs.mushafSurface) !== null && _this$$refs$mushafSur !== void 0 && (_this$$refs$mushafSur = _this$$refs$mushafSur.childNodes) !== null && _this$$refs$mushafSur !== void 0 && _this$$refs$mushafSur.length) {
        this._htmlSyncTimer = null;
        return;
      }
      var apply = function apply() {
        var _el$childNodes;
        _this7._htmlSyncTimer = null;
        var el = _this7.$refs.mushafSurface;
        if (!el) return;
        var next = html || '';
        // Compare against the last pushed string — never read el.innerHTML (serialises the
        // whole mushaf and freezes longer ranges on every recognition tick).
        if (_this7._lastMushafHtml === next && (_el$childNodes = el.childNodes) !== null && _el$childNodes !== void 0 && _el$childNodes.length) return;
        el.innerHTML = next;
        _this7._lastMushafHtml = next;
        var controller = _this7.ensureAutoFollowController();
        controller.rebuildWordCache(el);
        _this7.decorateTajweedSegments(el);
        var current = el.querySelector('.amd-word-current');
        if (current) {
          var idx = Number(current.getAttribute('data-recitation-word-index'));
          if (Number.isFinite(idx)) _this7._activeWordIndex = idx;
          _this7.syncTajweedSegmentState(current, {
            active: true
          });
        }
        _this7.scrollActiveIntoView(el);
      };
      // Forced updates must paint in this tick — setTimeout(0) left a frame of
      // unmasked/stale mushaf during recording-state transitions.
      if (immediate) {
        apply();
        return;
      }
      this._htmlSyncTimer = setTimeout(apply, 0);
    },
    decorateTajweedSegments: function decorateTajweedSegments(root) {
      if (!(root !== null && root !== void 0 && root.querySelectorAll)) return;
      var colourByClass = {
        ham_wasl: '#7e8a97',
        slnt: '#7e8a97',
        ghn: '#2e9d62',
        idgh_ghn: '#2e9d62',
        iqlb: '#2e9d62',
        idgh_w_ghn: '#9b59b6',
        ikhf: '#9b59b6',
        ikhf_shfw: '#9b59b6',
        qlq: '#d98824',
        lqlq: '#d98824',
        madda_normal: '#d55245',
        madda_permissible: '#d55245',
        madda_necessary: '#d55245',
        madda_obligatory: '#d55245',
        madda_pbligatory: '#d55245',
        idghm_shfw: '#2b7bbb',
        idgh_shfw: '#2b7bbb',
        idgh_mus: '#2b7bbb'
      };
      root.querySelectorAll('.tajweed-mark, [class*="tajweed-"]').forEach(function (mark) {
        if (!(mark !== null && mark !== void 0 && mark.classList)) return;
        mark.classList.add('tajweed-segment');
        var hex = '';
        mark.classList.forEach(function (cls) {
          var key = String(cls).replace(/^tajweed-/, '');
          if (colourByClass[key]) hex = colourByClass[key];
        });
        if (hex) mark.style.setProperty('--tajweed-colour', hex);
      });
    },
    scrollActiveIntoView: function scrollActiveIntoView(root) {
      var _surface$closest;
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (typeof window === 'undefined') return;
      var surface = root || this.$refs.mushafSurface;
      var shell = this.$refs.mushafShell || (surface === null || surface === void 0 || (_surface$closest = surface.closest) === null || _surface$closest === void 0 ? void 0 : _surface$closest.call(surface, '.amd-mushaf-shell'));
      if (!surface || !shell) return;
      // Never use Element.scrollIntoView — it can scroll the underlying page.
      var controller = this.ensureAutoFollowController();
      controller.followActive({
        container: shell,
        root: surface,
        activeIndex: this._activeWordIndex,
        force: !!options.force,
        reducedMotion: (0,_scripts_memorisationDetection_liveAutoFollow__WEBPACK_IMPORTED_MODULE_0__.prefersReducedMotion)()
      });
    },
    captureReturnFocus: function captureReturnFocus() {
      var _this$$refs$overlay;
      if (typeof document === 'undefined') return;
      var active = document.activeElement;
      if (active instanceof HTMLElement && !((_this$$refs$overlay = this.$refs.overlay) !== null && _this$$refs$overlay !== void 0 && _this$$refs$overlay.contains(active))) {
        this._returnFocusEl = active;
      }
    },
    restoreReturnFocus: function restoreReturnFocus() {
      var target = this._returnFocusEl;
      this._returnFocusEl = null;
      if (!target || typeof target.focus !== 'function') return;
      if (typeof document !== 'undefined' && !document.contains(target)) return;
      try {
        target.focus({
          preventScroll: true
        });
      } catch (_) {
        try {
          target.focus();
        } catch (__) {/* ignore */}
      }
    },
    getFocusableElements: function getFocusableElements() {
      var root = this.$refs.dialog;
      if (!root || typeof root.querySelectorAll !== 'function') return [];
      return Array.from(root.querySelectorAll(AMD_FOCUSABLE_SELECTOR)).filter(function (el) {
        if (!(el instanceof HTMLElement)) return false;
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
        if (el.tabIndex < 0) return false;
        var style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
        if (style && (style.visibility === 'hidden' || style.display === 'none')) return false;
        return true;
      });
    },
    focusInitialElement: function focusInitialElement() {
      var _this$$refs$dialog, _this$$refs$dialog$qu;
      var title = (_this$$refs$dialog = this.$refs.dialog) === null || _this$$refs$dialog === void 0 || (_this$$refs$dialog$qu = _this$$refs$dialog.querySelector) === null || _this$$refs$dialog$qu === void 0 ? void 0 : _this$$refs$dialog$qu.call(_this$$refs$dialog, '#amdModalTitle');
      if (title && typeof title.focus === 'function') {
        title.focus({
          preventScroll: true
        });
        return;
      }
      var first = this.getFocusableElements()[0];
      if (first && typeof first.focus === 'function') first.focus({
        preventScroll: true
      });
    },
    trapFocus: function trapFocus(event) {
      if (!this.open || event.key !== 'Tab') return;
      var focusable = this.getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        this.focusInitialElement();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var active = typeof document !== 'undefined' ? document.activeElement : null;
      if (event.shiftKey) {
        var _this$$refs$dialog2;
        if (active === first || !((_this$$refs$dialog2 = this.$refs.dialog) !== null && _this$$refs$dialog2 !== void 0 && _this$$refs$dialog2.contains(active))) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    onOverlayKeydown: function onOverlayKeydown(event) {
      if (!this.open) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        this.onCancel();
        return;
      }
      this.trapFocus(event);
    },
    onCancel: function onCancel() {
      this.$emit('cancel');
    },
    onPeekStart: function onPeekStart() {
      if (this.isComplete) return;
      this._peekKeyHeld = true;
      this.$emit('peek-start');
    },
    onPeekEnd: function onPeekEnd() {
      if (!this._peekKeyHeld && !this.peeking) return;
      this._peekKeyHeld = false;
      this.$emit('peek-end');
    },
    onDifficultyChange: function onDifficultyChange(event) {
      var _event$target;
      // Select options are words-shown%; parent/API still use hide%.
      var shown = Number(event === null || event === void 0 || (_event$target = event.target) === null || _event$target === void 0 ? void 0 : _event$target.value);
      this.$emit('set-difficulty', this.shownPercentToHide(shown));
    }
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964 ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }

var _hoisted_1 = ["data-theme"];
var _hoisted_2 = {
  ref: "dialog",
  "class": "modal-dialog modal-dialog-centered mutqin-modal-dialog mutqin-modal-dialog--wide amd-dialog",
  role: "dialog",
  "aria-modal": "true",
  "aria-labelledby": "amdModalTitle"
};
var _hoisted_3 = {
  "class": "modal-content mutqin-modal-surface amd-modal amd-modal--mushaf amd-modal--test amd-modal--premium"
};
var _hoisted_4 = {
  "class": "amd-header amd-header--premium amd-header--sticky"
};
var _hoisted_5 = {
  "class": "amd-header-copy"
};
var _hoisted_6 = {
  "class": "amd-title-row"
};
var _hoisted_7 = {
  id: "amdModalTitle",
  "class": "amd-title amd-title--premium",
  tabindex: "-1"
};
var _hoisted_8 = ["title"];
var _hoisted_9 = {
  key: 0,
  "class": "amd-range amd-range--premium"
};
var _hoisted_10 = {
  key: 1,
  "class": "amd-disclaimer amd-disclaimer--row"
};
var _hoisted_11 = {
  "class": "amd-header-aside"
};
var _hoisted_12 = ["data-status", "title"];
var _hoisted_13 = {
  "class": "amd-mic-status__label"
};
var _hoisted_14 = ["aria-label"];
var _hoisted_15 = {
  "class": "amd-body amd-body--premium amd-body--scroll"
};
var _hoisted_16 = {
  key: 0,
  "class": "amd-tools-container"
};
var _hoisted_17 = ["aria-label"];
var _hoisted_18 = ["disabled", "aria-pressed", "aria-label", "title"];
var _hoisted_19 = ["for", "title"];
var _hoisted_20 = {
  "class": "visually-hidden"
};
var _hoisted_21 = ["id", "value", "aria-label"];
var _hoisted_22 = ["value"];
var _hoisted_23 = ["aria-label", "title", "data-running"];
var _hoisted_24 = {
  "class": "amd-tools-bar__timer-value"
};
var _hoisted_25 = {
  key: 0,
  "class": "amd-mistake-visual",
  role: "status",
  "aria-live": "polite"
};
var _hoisted_26 = {
  "class": "amd-mistake-visual__label"
};
var _hoisted_27 = {
  key: 1,
  "class": "amd-ayah-empty",
  role: "status"
};
var _hoisted_28 = {
  key: 1,
  "class": "amd-complete amd-complete--handoff",
  "aria-hidden": "true"
};
var _hoisted_29 = {
  key: 2,
  "class": "amd-complete amd-complete--premium amd-complete--body",
  role: "status",
  "aria-live": "assertive",
  "aria-atomic": "true"
};
var _hoisted_30 = {
  "class": "amd-complete__title"
};
var _hoisted_31 = {
  "class": "amd-complete__body"
};
var _hoisted_32 = {
  key: 3,
  "class": "amd-inline-error amd-inline-error--body",
  role: "alert"
};
var _hoisted_33 = {
  "class": "amd-footer amd-footer--sticky",
  "data-amd-footer": ""
};
var _hoisted_34 = {
  "class": "amd-footer__inner"
};
var _hoisted_35 = {
  key: 0,
  "class": "amd-start-wrap amd-start-wrap--inline amd-start-wrap--footer"
};
var _hoisted_36 = ["aria-label", "title", "disabled", "aria-busy"];
var _hoisted_37 = {
  "class": "amd-record-btn__label"
};
var _hoisted_38 = {
  key: 1,
  "class": "amd-footer__stop"
};
var _hoisted_39 = ["aria-label", "title", "disabled", "aria-busy"];
var _hoisted_40 = {
  "class": "amd-record-btn__label"
};
var _hoisted_41 = {
  key: 2,
  "class": "amd-complete__actions amd-complete__actions--footer"
};
var _hoisted_42 = {
  key: 3,
  "class": "amd-footer__error-actions"
};
var _hoisted_43 = {
  key: 4,
  "class": "amd-footer__spacer",
  "aria-hidden": "true"
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Teleport, {
    to: "body"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    ref: "overlay",
    "class": "modal-overlay mutqin-modal-overlay amd-overlay",
    "data-theme": $data.themeAttr,
    onClick: _cache[20] || (_cache[20] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onCancel && $options.onCancel.apply($options, arguments);
    }, ["self"])),
    onKeydown: _cache[21] || (_cache[21] = function () {
      return $options.onOverlayKeydown && $options.onOverlayKeydown.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_6, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_7, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.title), 1 /* TEXT */), $props.betaBadge ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", {
    key: 0,
    "class": "amd-beta-badge",
    title: $props.disclaimer || undefined
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.betaBadge), 9 /* TEXT, PROPS */, _hoisted_8)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), $props.rangeLabel ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_9, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.rangeLabel), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $props.disclaimer ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_10, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.disclaimer), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_11, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["amd-mic-status amd-mic-status--header", {
      'amd-mic-status--recording': $options.isListening,
      'amd-mic-status--starting': $options.isStarting
    }]),
    "data-status": $options.micStatusKey,
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    title: $props.disclaimer || undefined
  }, [_cache[22] || (_cache[22] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "amd-mic-dot",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_13, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.displayMicStatusLabel), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_12), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    "class": "amd-icon-btn amd-icon-btn--close",
    type: "button",
    "aria-label": $props.closeLabel,
    onClick: _cache[0] || (_cache[0] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onCancel && $options.onCancel.apply($options, arguments);
    }, ["stop"]))
  }, _toConsumableArray(_cache[23] || (_cache[23] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_14)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_15, [!$options.isComplete ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_16, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "amd-toolbar amd-toolbar--icons amd-toolbar--tools amd-tools-bar",
    role: "toolbar",
    "aria-label": $props.toolsLabel
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["amd-tools-bar__btn", {
      'is-active': $props.peeking
    }]),
    disabled: $options.isComplete,
    "aria-pressed": $props.peeking ? 'true' : 'false',
    "aria-label": $props.peekLabel,
    title: $props.peekHintLabel || $props.peekLabel,
    onMousedown: _cache[1] || (_cache[1] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekStart && $options.onPeekStart.apply($options, arguments);
    }, ["prevent"])),
    onMouseup: _cache[2] || (_cache[2] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    }, ["prevent"])),
    onMouseleave: _cache[3] || (_cache[3] = function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    }),
    onTouchstart: _cache[4] || (_cache[4] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekStart && $options.onPeekStart.apply($options, arguments);
    }, ["prevent"])),
    onTouchend: _cache[5] || (_cache[5] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    }, ["prevent"])),
    onTouchcancel: _cache[6] || (_cache[6] = function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    }),
    onKeydown: [_cache[7] || (_cache[7] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekStart && $options.onPeekStart.apply($options, arguments);
    }, ["prevent"]), ["space"])), _cache[8] || (_cache[8] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekStart && $options.onPeekStart.apply($options, arguments);
    }, ["prevent"]), ["enter"]))],
    onKeyup: [_cache[9] || (_cache[9] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    }, ["prevent"]), ["space"])), _cache[10] || (_cache[10] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    }, ["prevent"]), ["enter"]))],
    onBlur: _cache[11] || (_cache[11] = function () {
      return $options.onPeekEnd && $options.onPeekEnd.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[24] || (_cache[24] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-eye",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_18), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", {
    "class": "amd-tools-bar__shown",
    "for": $data.difficultyId,
    title: $props.wordsShownLabel
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_20, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.wordsShownLabel), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    id: $data.difficultyId,
    "class": "amd-tools-bar__select",
    value: $options.selectedShownPercent,
    "aria-label": $props.wordsShownLabel,
    onChange: _cache[12] || (_cache[12] = function () {
      return $options.onDifficultyChange && $options.onDifficultyChange.apply($options, arguments);
    })
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.shownPercentOptions, function (shown) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: "shown-".concat(shown),
      value: shown
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(shown) + "%", 9 /* TEXT, PROPS */, _hoisted_22);
  }), 128 /* KEYED_FRAGMENT */))], 40 /* PROPS, NEED_HYDRATION */, _hoisted_21)], 8 /* PROPS */, _hoisted_19), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "amd-tools-bar__timer",
    role: "timer",
    "aria-label": $props.elapsedTimerLabel,
    title: $props.elapsedTimerHint || $props.elapsedTimerLabel,
    "data-running": $options.isListening ? 'true' : 'false'
  }, [_cache[25] || (_cache[25] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-stopwatch",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_24, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.elapsedLabel), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_23)], 8 /* PROPS */, _hoisted_17)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    ref: "mushafShell",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["amd-mushaf-shell amd-mushaf-shell--premium amd-mushaf-shell--primary", {
      'is-blur-active': $props.blurActive && !$props.peeking && $options.keepVisibilityMask,
      'is-gap-mask': !$props.blurActive && !$props.peeking && $options.keepVisibilityMask,
      'is-peeking': $props.peeking && $options.keepVisibilityMask,
      'is-listening': $options.isListening,
      'is-ready': $options.isReady,
      'is-complete': $options.isComplete,
      'is-mistake-flash': $props.mistakeVisualActive
    }]),
    dir: "rtl",
    lang: "ar",
    onScrollPassive: _cache[13] || (_cache[13] = function () {
      return $options.onMushafShellScroll && $options.onMushafShellScroll.apply($options, arguments);
    })
  }, [$props.mistakeVisualActive ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_25, [_cache[26] || (_cache[26] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-exclamation-circle",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_26, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.mistakeVisualLabel), 1 /* TEXT */)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    ref: "mushafSurface",
    "class": "amd-mushaf-ayah amd-mushaf-ayah--premium",
    style: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeStyle)({
      '--amd-font-scale': $data.fontScale
    })
  }, null, 4 /* STYLE */), $options.showAyahEmptyState ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_27, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.emptyAyahTitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.emptyAyahDesc), 1 /* TEXT */)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 34 /* CLASS, NEED_HYDRATION */), $props.endingSoon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_28, _toConsumableArray(_cache[27] || (_cache[27] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "amd-complete__spinner",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])))) : $options.isComplete ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_29, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_30, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.completeTitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_31, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.completeBody), 1 /* TEXT */)])) : $options.isError || $options.showInlineError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_32, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.displayErrorMessage), 1 /* TEXT */)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("footer", _hoisted_33, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_34, [$options.isReady && !$options.isComplete && !$options.isError && !$options.showInlineError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_35, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["amd-record-btn amd-record-btn--inline", {
      'is-busy': $props.busy
    }]),
    "aria-label": $props.startLabel,
    title: $props.startHint || $props.startLabel,
    disabled: $props.busy,
    "aria-busy": $props.busy ? 'true' : 'false',
    onClick: _cache[14] || (_cache[14] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onStart && $options.onStart.apply($options, arguments);
    }, ["stop"]))
  }, [_cache[28] || (_cache[28] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "amd-record-btn__core",
    "aria-hidden": "true"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-mic-fill"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", _hoisted_37, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.startLabel), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_36)])) : $options.canStop ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_38, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["amd-record-btn amd-record-btn--inline amd-record-btn--stop", {
      active: $options.isListening,
      'is-busy': $props.endingSoon || $options.isProcessing
    }]),
    "aria-label": $options.stopActionLabel,
    title: $options.stopActionLabel,
    disabled: $props.endingSoon || $options.isProcessing,
    "aria-busy": $props.endingSoon || $options.isProcessing ? 'true' : 'false',
    onClick: _cache[15] || (_cache[15] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.onStop && $options.onStop.apply($options, arguments);
    }, ["stop"]))
  }, [_cache[29] || (_cache[29] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "amd-record-btn__core",
    "aria-hidden": "true"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-stop-fill"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", _hoisted_40, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.stopActionLabel), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_39)])) : $options.isComplete ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_41, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "btn-secondary",
    onClick: _cache[16] || (_cache[16] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function ($event) {
      return _ctx.$emit('test-again');
    }, ["stop"]))
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.testAgainLabel), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "btn-primary",
    onClick: _cache[17] || (_cache[17] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function ($event) {
      return _ctx.$emit('done');
    }, ["stop"]))
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.doneLabel), 1 /* TEXT */)])) : $options.isError || $options.showInlineError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_42, [$props.errorAction === 'enable-mic' ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 0,
    type: "button",
    "class": "btn-primary",
    onClick: _cache[18] || (_cache[18] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function ($event) {
      return _ctx.$emit('enable-mic');
    }, ["stop"]))
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.enableMicLabel), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 1,
    type: "button",
    "class": "btn-secondary",
    onClick: _cache[19] || (_cache[19] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function ($event) {
      return _ctx.$emit('retry');
    }, ["stop"]))
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($props.tryAgainLabel), 1 /* TEXT */))])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_43))])])])], 512 /* NEED_PATCH */)], 40 /* PROPS, NEED_HYDRATION */, _hoisted_1), [[vue__WEBPACK_IMPORTED_MODULE_0__.vShow, $props.open]])]);
}

/***/ }),

/***/ "./resources/js/components/AiMemorisationDetectionModal.vue":
/*!******************************************************************!*\
  !*** ./resources/js/components/AiMemorisationDetectionModal.vue ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _AiMemorisationDetectionModal_vue_vue_type_template_id_e7581964__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964 */ "./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964");
/* harmony import */ var _AiMemorisationDetectionModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AiMemorisationDetectionModal.vue?vue&type=script&lang=js */ "./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=script&lang=js");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;
const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_AiMemorisationDetectionModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_AiMemorisationDetectionModal_vue_vue_type_template_id_e7581964__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/components/AiMemorisationDetectionModal.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=script&lang=js":
/*!******************************************************************************************!*\
  !*** ./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=script&lang=js ***!
  \******************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AiMemorisationDetectionModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AiMemorisationDetectionModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AiMemorisationDetectionModal.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964":
/*!************************************************************************************************!*\
  !*** ./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964 ***!
  \************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AiMemorisationDetectionModal_vue_vue_type_template_id_e7581964__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AiMemorisationDetectionModal_vue_vue_type_template_id_e7581964__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AiMemorisationDetectionModal.vue?vue&type=template&id=e7581964");


/***/ })

}]);