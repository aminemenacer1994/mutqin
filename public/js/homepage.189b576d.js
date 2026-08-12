"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["homepage"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Homepage.vue?vue&type=script&lang=js":
/*!*********************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Homepage.vue?vue&type=script&lang=js ***!
  \*********************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");
/* harmony import */ var vue_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! vue-i18n */ "./node_modules/vue-i18n/dist/vue-i18n.mjs");
/* harmony import */ var _utils_theme__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/theme */ "./resources/js/utils/theme.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'OnboardingPage',
  setup: function setup() {
    var _useI18n = (0,vue_i18n__WEBPACK_IMPORTED_MODULE_2__.useI18n)(),
      t = _useI18n.t;
    // Theme management
    var currentTheme = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)((0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)());
    var setTheme = function setTheme(theme) {
      currentTheme.value = (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.setGlobalTheme)(theme);
    };
    var loadTheme = function loadTheme() {
      currentTheme.value = (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)();
      (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.setGlobalTheme)(currentTheme.value, {
        dispatchEvent: false
      });
    };
    var handleGlobalThemeChange = function handleGlobalThemeChange(event) {
      var _event$detail;
      currentTheme.value = (event === null || event === void 0 || (_event$detail = event.detail) === null || _event$detail === void 0 ? void 0 : _event$detail.theme) || (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)();
    };

    // Refs for scroll tracking
    var featuresSection = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(null);

    // Scroll methods
    var scrollToFeatures = function scrollToFeatures() {
      var _featuresSection$valu;
      (_featuresSection$valu = featuresSection.value) === null || _featuresSection$valu === void 0 || _featuresSection$valu.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    };
    var startFreeHref = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return window.mutqinAuthCheck ? '/memorisation' : '/register';
    });
    var contactForm = (0,vue__WEBPACK_IMPORTED_MODULE_0__.reactive)({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
    var contactErrors = (0,vue__WEBPACK_IMPORTED_MODULE_0__.reactive)({});
    var contactStatus = (0,vue__WEBPACK_IMPORTED_MODULE_0__.reactive)({
      type: '',
      message: ''
    });
    var contactSubmitting = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(false);
    var resetContactFeedback = function resetContactFeedback() {
      Object.keys(contactErrors).forEach(function (key) {
        return delete contactErrors[key];
      });
      contactStatus.type = '';
      contactStatus.message = '';
    };
    var badgeLabel = function badgeLabel(badge) {
      if (badge === 'pro') return t('homepage.badge.pro');
      if (badge === 'freeLimited') return t('homepage.badge.freeLimited');
      return t('homepage.badge.free');
    };
    var validateContact = function validateContact() {
      resetContactFeedback();
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactForm.name) contactErrors.name = t('homepage.contact.errors.name');
      if (!contactForm.email) {
        contactErrors.email = t('homepage.contact.errors.email');
      } else if (!emailPattern.test(contactForm.email)) {
        contactErrors.email = t('homepage.contact.errors.emailInvalid');
      }
      if (!contactForm.subject) contactErrors.subject = t('homepage.contact.errors.subject');
      if (!contactForm.message) contactErrors.message = t('homepage.contact.errors.message');
      return Object.keys(contactErrors).length === 0;
    };
    var submitContact = /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var _error$response, validationErrors, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              if (validateContact()) {
                _context.n = 1;
                break;
              }
              return _context.a(2);
            case 1:
              contactSubmitting.value = true;
              _context.p = 2;
              _context.n = 3;
              return window.axios.post('/api/contact', {
                name: contactForm.name,
                email: contactForm.email,
                subject: contactForm.subject,
                message: contactForm.message
              });
            case 3:
              contactStatus.type = 'success';
              contactStatus.message = t('homepage.contact.success');
              contactForm.name = '';
              contactForm.email = '';
              contactForm.subject = '';
              contactForm.message = '';
              _context.n = 5;
              break;
            case 4:
              _context.p = 4;
              _t = _context.v;
              validationErrors = (_t === null || _t === void 0 || (_error$response = _t.response) === null || _error$response === void 0 || (_error$response = _error$response.data) === null || _error$response === void 0 ? void 0 : _error$response.errors) || {};
              Object.entries(validationErrors).forEach(function (_ref2) {
                var _ref3 = _slicedToArray(_ref2, 2),
                  field = _ref3[0],
                  messages = _ref3[1];
                contactErrors[field] = Array.isArray(messages) ? messages[0] : messages;
              });
              contactStatus.type = 'error';
              contactStatus.message = Object.keys(validationErrors).length ? t('homepage.contact.errorFields') : t('homepage.contact.errorSend');
            case 5:
              _context.p = 5;
              contactSubmitting.value = false;
              return _context.f(5);
            case 6:
              return _context.a(2);
          }
        }, _callee, null, [[2, 4, 5, 6]]);
      }));
      return function submitContact() {
        return _ref.apply(this, arguments);
      };
    }();
    var floatingBadges = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return [{
        icon: 'bi bi-check-circle-fill',
        text: t('homepage.floatingBadges.tajweedScore')
      }, {
        icon: 'bi bi-graph-up',
        text: t('homepage.floatingBadges.weakVerses')
      }, {
        icon: 'bi bi-star-fill',
        text: t('homepage.floatingBadges.dailyMinutes')
      }];
    });
    var features = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return [{
        id: 'recitationReview',
        icon: 'bi bi-mic-fill',
        title: t('homepage.features.items.recitationReview.title'),
        badge: badgeLabel('free'),
        badgeType: '',
        description: t('homepage.features.items.recitationReview.description'),
        result: t('homepage.features.items.recitationReview.result')
      }, {
        id: 'smartMemorisation',
        icon: 'bi bi-lightning-charge-fill',
        title: t('homepage.features.items.smartMemorisation.title'),
        badge: badgeLabel('pro'),
        badgeType: 'pro',
        description: t('homepage.features.items.smartMemorisation.description'),
        result: t('homepage.features.items.smartMemorisation.result')
      }, {
        id: 'stackedMushaf',
        icon: 'bi bi-journal-bookmark-fill',
        title: t('homepage.features.items.stackedMushaf.title'),
        badge: badgeLabel('free'),
        badgeType: '',
        description: t('homepage.features.items.stackedMushaf.description'),
        result: t('homepage.features.items.stackedMushaf.result')
      }, {
        id: 'transitionTraining',
        icon: 'bi bi-link-45deg',
        title: t('homepage.features.items.transitionTraining.title'),
        badge: badgeLabel('pro'),
        badgeType: 'pro',
        description: t('homepage.features.items.transitionTraining.description'),
        result: t('homepage.features.items.transitionTraining.result')
      }, {
        id: 'recordingLibrary',
        icon: 'bi bi-collection-play',
        title: t('homepage.features.items.recordingLibrary.title'),
        badge: badgeLabel('freeLimited'),
        badgeType: '',
        description: t('homepage.features.items.recordingLibrary.description'),
        result: t('homepage.features.items.recordingLibrary.result')
      }, {
        id: 'reviewAnalytics',
        icon: 'bi bi-graph-up-arrow',
        title: t('homepage.features.items.reviewAnalytics.title'),
        badge: badgeLabel('pro'),
        badgeType: 'pro',
        description: t('homepage.features.items.reviewAnalytics.description'),
        result: t('homepage.features.items.reviewAnalytics.result')
      }];
    });
    var steps = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return [{
        id: 'record',
        title: t('homepage.steps.items.record.title'),
        description: t('homepage.steps.items.record.description'),
        icon: 'bi bi-mic-fill',
        microcopy: t('homepage.steps.items.record.microcopy')
      }, {
        id: 'review',
        title: t('homepage.steps.items.review.title'),
        description: t('homepage.steps.items.review.description'),
        icon: 'bi bi-stars',
        microcopy: t('homepage.steps.items.review.microcopy')
      }, {
        id: 'repeat',
        title: t('homepage.steps.items.repeat.title'),
        description: t('homepage.steps.items.repeat.description'),
        icon: 'bi bi-arrow-repeat',
        microcopy: t('homepage.steps.items.repeat.microcopy')
      }];
    });
    var faqItems = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return [{
        id: 'whatIsMutqin',
        question: t('homepage.faq.items.whatIsMutqin.question'),
        answer: t('homepage.faq.items.whatIsMutqin.answer')
      }, {
        id: 'howMemorisation',
        question: t('homepage.faq.items.howMemorisation.question'),
        answer: t('homepage.faq.items.howMemorisation.answer')
      }, {
        id: 'howAiFeedback',
        question: t('homepage.faq.items.howAiFeedback.question'),
        answer: t('homepage.faq.items.howAiFeedback.answer')
      }, {
        id: 'whatIsPro',
        question: t('homepage.faq.items.whatIsPro.question'),
        answer: t('homepage.faq.items.whatIsPro.answer')
      }, {
        id: 'howRevision',
        question: t('homepage.faq.items.howRevision.question'),
        answer: t('homepage.faq.items.howRevision.answer')
      }];
    });

    // Intersection Observer for animations
    var observerOptions = {
      threshold: 0.3,
      rootMargin: '0px'
    };
    (0,vue__WEBPACK_IMPORTED_MODULE_0__.onMounted)(function () {
      loadTheme();
      window.addEventListener('mutqin:theme-change', handleGlobalThemeChange);

      // Animate elements when they come into view
      var animatedElements = document.querySelectorAll('[data-aos]');
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);
      animatedElements.forEach(function (el) {
        return observer.observe(el);
      });
    });
    (0,vue__WEBPACK_IMPORTED_MODULE_0__.onUnmounted)(function () {
      window.removeEventListener('mutqin:theme-change', handleGlobalThemeChange);
    });
    return {
      t: t,
      currentTheme: currentTheme,
      startFreeHref: startFreeHref,
      setTheme: setTheme,
      featuresSection: featuresSection,
      scrollToFeatures: scrollToFeatures,
      floatingBadges: floatingBadges,
      features: features,
      steps: steps,
      faqItems: faqItems,
      contactForm: contactForm,
      contactErrors: contactErrors,
      contactStatus: contactStatus,
      contactSubmitting: contactSubmitting,
      submitContact: submitContact
    };
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Homepage.vue?vue&type=template&id=a027a5e6":
/*!*************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Homepage.vue?vue&type=template&id=a027a5e6 ***!
  \*************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");

var _hoisted_1 = ["data-theme"];
var _hoisted_2 = {
  "class": "hero"
};
var _hoisted_3 = {
  "class": "hero-container"
};
var _hoisted_4 = {
  "class": "hero-layout"
};
var _hoisted_5 = {
  "class": "hero-copy-column"
};
var _hoisted_6 = {
  "class": "hero-content",
  "data-aos": "fade-up"
};
var _hoisted_7 = {
  "class": "hero-badge"
};
var _hoisted_8 = {
  "class": "hero-title"
};
var _hoisted_9 = {
  "class": "hero-desc"
};
var _hoisted_10 = {
  "class": "card problem-solution"
};
var _hoisted_11 = {
  "class": "problem-text"
};
var _hoisted_12 = {
  "class": "solution-highlight"
};
var _hoisted_13 = {
  "class": "solution-text"
};
var _hoisted_14 = {
  "class": "hero-buttons"
};
var _hoisted_15 = ["href"];
var _hoisted_16 = {
  "class": "hero-visual-column"
};
var _hoisted_17 = {
  "class": "hero-image",
  "data-aos": "fade-left"
};
var _hoisted_18 = {
  "class": "card demo-card"
};
var _hoisted_19 = {
  "class": "demo-wave"
};
var _hoisted_20 = {
  id: "features",
  "class": "features-section",
  ref: "featuresSection"
};
var _hoisted_21 = {
  "class": "section-container"
};
var _hoisted_22 = {
  "class": "section-kicker"
};
var _hoisted_23 = {
  "class": "section-title"
};
var _hoisted_24 = {
  "class": "section-subtitle"
};
var _hoisted_25 = {
  "class": "features-grid row"
};
var _hoisted_26 = {
  "class": "feature-card h-100"
};
var _hoisted_27 = {
  "class": "feature-topline"
};
var _hoisted_28 = {
  "class": "feature-icon"
};
var _hoisted_29 = {
  id: "how-it-works",
  "class": "steps-section"
};
var _hoisted_30 = {
  "class": "section-container"
};
var _hoisted_31 = {
  "class": "section-kicker"
};
var _hoisted_32 = {
  "class": "section-title"
};
var _hoisted_33 = {
  "class": "section-subtitle"
};
var _hoisted_34 = {
  "class": "steps-grid"
};
var _hoisted_35 = ["data-aos-delay"];
var _hoisted_36 = {
  "class": "step-card h-100"
};
var _hoisted_37 = {
  "class": "step-head"
};
var _hoisted_38 = {
  "class": "step-number"
};
var _hoisted_39 = {
  id: "faq",
  "class": "faq-section"
};
var _hoisted_40 = {
  "class": "section-container"
};
var _hoisted_41 = {
  "class": "section-kicker"
};
var _hoisted_42 = {
  "class": "section-title"
};
var _hoisted_43 = {
  "class": "section-subtitle"
};
var _hoisted_44 = {
  "class": "faq-shell",
  "data-aos": "fade-up"
};
var _hoisted_45 = {
  "class": "accordion faq-accordion",
  id: "homepageFaq"
};
var _hoisted_46 = ["id"];
var _hoisted_47 = ["data-bs-target", "aria-expanded", "aria-controls"];
var _hoisted_48 = ["id", "aria-labelledby"];
var _hoisted_49 = {
  "class": "accordion-body"
};
var _hoisted_50 = {
  id: "contact",
  "class": "contact-section"
};
var _hoisted_51 = {
  "class": "section-container"
};
var _hoisted_52 = {
  "class": "contact-grid"
};
var _hoisted_53 = {
  "class": "contact-copy-column"
};
var _hoisted_54 = {
  "class": "contact-copy",
  "data-aos": "fade-up"
};
var _hoisted_55 = {
  "class": "section-title section-title-left"
};
var _hoisted_56 = {
  "class": "section-subtitle section-subtitle-left"
};
var _hoisted_57 = {
  "class": "contact-form-column"
};
var _hoisted_58 = {
  "class": "contact-card",
  "data-aos": "fade-up"
};
var _hoisted_59 = {
  "class": "contact-form-grid"
};
var _hoisted_60 = {
  "class": "contact-field"
};
var _hoisted_61 = {
  "class": "form-label",
  "for": "contactName"
};
var _hoisted_62 = {
  key: 0,
  "class": "invalid-feedback d-block"
};
var _hoisted_63 = {
  "class": "contact-field"
};
var _hoisted_64 = {
  "class": "form-label",
  "for": "contactEmail"
};
var _hoisted_65 = {
  key: 0,
  "class": "invalid-feedback d-block"
};
var _hoisted_66 = {
  "class": "form-label",
  "for": "contactSubject"
};
var _hoisted_67 = {
  key: 0,
  "class": "invalid-feedback d-block"
};
var _hoisted_68 = {
  "class": "form-label",
  "for": "contactMessage"
};
var _hoisted_69 = {
  key: 0,
  "class": "invalid-feedback d-block"
};
var _hoisted_70 = ["disabled"];
var _hoisted_71 = {
  "class": "footer"
};
var _hoisted_72 = {
  "class": "footer-container"
};
var _hoisted_73 = {
  "class": "footer-grid"
};
var _hoisted_74 = {
  "class": "footer-brand-column"
};
var _hoisted_75 = {
  "class": "footer-brand"
};
var _hoisted_76 = {
  "class": "footer-link-column"
};
var _hoisted_77 = {
  "class": "footer-links"
};
var _hoisted_78 = {
  href: "/pricing"
};
var _hoisted_79 = {
  href: "#"
};
var _hoisted_80 = {
  "class": "footer-link-column"
};
var _hoisted_81 = {
  "class": "footer-links"
};
var _hoisted_82 = {
  href: "#"
};
var _hoisted_83 = {
  href: "#"
};
var _hoisted_84 = {
  href: "#"
};
var _hoisted_85 = {
  "class": "footer-link-column"
};
var _hoisted_86 = {
  "class": "footer-links"
};
var _hoisted_87 = {
  href: "/about-us"
};
var _hoisted_88 = {
  href: "/our-mission"
};
var _hoisted_89 = {
  "class": "footer-social-column"
};
var _hoisted_90 = {
  "class": "footer-social"
};
var _hoisted_91 = {
  "class": "footer-bottom"
};
var _hoisted_92 = {
  "class": "footer-legal"
};
var _hoisted_93 = {
  href: "#"
};
var _hoisted_94 = {
  href: "#"
};
var _hoisted_95 = {
  href: "#"
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    "class": "vue-onboarding",
    "data-theme": $setup.currentTheme
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Hero Section "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_6, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_7, [_cache[8] || (_cache[8] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-moon-stars"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.badge')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h1", _hoisted_8, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.title')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_9, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.desc')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_10, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_11, [_cache[9] || (_cache[9] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-exclamation-triangle-fill"
  }, null, -1 /* CACHED */)), _cache[10] || (_cache[10] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)()), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.problem')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.problemText')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_12, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_13, [_cache[11] || (_cache[11] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-check-lg"
  }, null, -1 /* CACHED */)), _cache[12] || (_cache[12] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)()), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.solution')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.solutionText')), 1 /* TEXT */)])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_14, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
    href: $setup.startFreeHref,
    "class": "btn-primary hero-action-btn hero-action-btn--primary"
  }, [_cache[13] || (_cache[13] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-book-half"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.startFree')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_15), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    onClick: _cache[0] || (_cache[0] = function () {
      return $setup.scrollToFeatures && $setup.scrollToFeatures.apply($setup, arguments);
    }),
    "class": "btn-secondary hero-action-btn hero-action-btn--secondary"
  }, [_cache[14] || (_cache[14] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-arrow-down"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.hero.seeFeatures')), 1 /* TEXT */)])])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_16, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_17, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_18, [_cache[16] || (_cache[16] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-mic"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.demo.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.demo.quote')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_19, [_cache[15] || (_cache[15] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-soundwave"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.demo.recording')), 1 /* TEXT */)])]), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.floatingBadges, function (badge, idx) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      "class": "floating-card",
      key: idx,
      style: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeStyle)({
        animationDelay: "".concat(idx * 0.8, "s")
      })
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(badge.icon)
    }, null, 2 /* CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(badge.text), 1 /* TEXT */)], 4 /* STYLE */);
  }), 128 /* KEYED_FRAGMENT */))])])])])]), _cache[36] || (_cache[36] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "divider section-divider"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" ۞ "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Features Section "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_20, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_21, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_22, [_cache[17] || (_cache[17] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-soundwave"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.features.kicker')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_23, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.features.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_24, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.features.subtitle')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_25, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.features, function (feature) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      "class": "feature-grid-item col-md-4",
      key: feature.id,
      "data-aos": "zoom-in"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_26, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_27, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_28, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(feature.icon)
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(['feature-badge', feature.badgeType])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(feature.badge), 3 /* TEXT, CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(feature.title), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(feature.description), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(feature.result), 1 /* TEXT */)])]);
  }), 128 /* KEYED_FRAGMENT */))])])], 512 /* NEED_PATCH */), _cache[37] || (_cache[37] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "divider section-divider"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" ۞ "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" How It Works "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_29, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_30, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_31, [_cache[18] || (_cache[18] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-route"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.steps.kicker')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_32, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.steps.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_33, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.steps.subtitle')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_34, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.steps, function (step, idx) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      "class": "step-grid-item",
      key: step.id,
      "data-aos": "flip-up",
      "data-aos-delay": idx * 100
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_36, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_37, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_38, "0" + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(idx + 1), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)([step.icon, "step-icon"])
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(step.title), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(step.description), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(step.microcopy), 1 /* TEXT */)])], 8 /* PROPS */, _hoisted_35);
  }), 128 /* KEYED_FRAGMENT */))])])]), _cache[38] || (_cache[38] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "divider section-divider"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" ۞ "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_39, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_40, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_41, [_cache[19] || (_cache[19] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-question-circle"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.faq.kicker')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_42, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.faq.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_43, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.a_quick_overview_of_how_mutqin_supports_recitation')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_44, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_45, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.faqItems, function (item, idx) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      "class": "accordion-item",
      key: item.id
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", {
      "class": "accordion-header",
      id: "faq-heading-".concat(idx)
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["accordion-button", {
        collapsed: idx !== 0
      }]),
      type: "button",
      "data-bs-toggle": "collapse",
      "data-bs-target": "#faq-panel-".concat(idx),
      "aria-expanded": idx === 0 ? 'true' : 'false',
      "aria-controls": "faq-panel-".concat(idx)
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.question), 11 /* TEXT, CLASS, PROPS */, _hoisted_47)], 8 /* PROPS */, _hoisted_46), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
      id: "faq-panel-".concat(idx),
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["accordion-collapse collapse", {
        show: idx === 0
      }]),
      "aria-labelledby": "faq-heading-".concat(idx),
      "data-bs-parent": "#homepageFaq"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_49, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.answer), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_48)]);
  }), 128 /* KEYED_FRAGMENT */))])])])]), _cache[39] || (_cache[39] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "divider section-divider"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" ۞ "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-star-fill"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_50, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_51, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_52, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_53, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_54, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_55, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.contact.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_56, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.contact.extendedSubtitle')), 1 /* TEXT */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_57, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_58, [$setup.contactStatus.message ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 0,
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["contact-alert", $setup.contactStatus.type === 'success' ? 'contact-alert-success' : 'contact-alert-error']),
    role: "alert"
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.contactStatus.message), 3 /* TEXT, CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("form", {
    "class": "contact-form",
    onSubmit: _cache[5] || (_cache[5] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $setup.submitContact && $setup.submitContact.apply($setup, arguments);
    }, ["prevent"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_59, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_60, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_61, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.name')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "contactName",
    "onUpdate:modelValue": _cache[1] || (_cache[1] = function ($event) {
      return $setup.contactForm.name = $event;
    }),
    type: "text",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["form-control", {
      'is-invalid': $setup.contactErrors.name
    }]),
    autocomplete: "name"
  }, null, 2 /* CLASS */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.contactForm.name, void 0, {
    trim: true
  }]]), $setup.contactErrors.name ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_62, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.contactErrors.name), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_63, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_64, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.contact.email')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "contactEmail",
    "onUpdate:modelValue": _cache[2] || (_cache[2] = function ($event) {
      return $setup.contactForm.email = $event;
    }),
    type: "email",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["form-control", {
      'is-invalid': $setup.contactErrors.email
    }]),
    autocomplete: "email"
  }, null, 2 /* CLASS */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.contactForm.email, void 0, {
    trim: true
  }]]), $setup.contactErrors.email ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_65, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.contactErrors.email), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_66, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.contact.subject')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "contactSubject",
    "onUpdate:modelValue": _cache[3] || (_cache[3] = function ($event) {
      return $setup.contactForm.subject = $event;
    }),
    type: "text",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["form-control", {
      'is-invalid': $setup.contactErrors.subject
    }]),
    autocomplete: "off",
    required: ""
  }, null, 2 /* CLASS */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.contactForm.subject, void 0, {
    trim: true
  }]]), $setup.contactErrors.subject ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_67, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.contactErrors.subject), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_68, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.contact.message')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("textarea", {
    id: "contactMessage",
    "onUpdate:modelValue": _cache[4] || (_cache[4] = function ($event) {
      return $setup.contactForm.message = $event;
    }),
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["form-control contact-textarea", {
      'is-invalid': $setup.contactErrors.message
    }]),
    rows: "6"
  }, null, 2 /* CLASS */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $setup.contactForm.message, void 0, {
    trim: true
  }]]), $setup.contactErrors.message ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_69, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.contactErrors.message), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "submit",
    "class": "btn-primary contact-submit",
    disabled: $setup.contactSubmitting
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.contactSubmitting ? 'bi-arrow-repeat spin-icon' : 'bi-send'])
  }, null, 2 /* CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.contactSubmitting ? $setup.t('homepage.contact.sending') : $setup.t('homepage.contact.sendMessage')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_70)], 32 /* NEED_HYDRATION */)])])])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Footer - full width, bottom fixed position "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("footer", _hoisted_71, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_72, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_73, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_74, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_75, [_cache[20] || (_cache[20] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "footer-logo"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-moon-stars"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, "Mutqin")], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.focused_quran_memorisation_tools_for_recitation_ch')), 1 /* TEXT */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_76, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_77, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h4", null, [_cache[21] || (_cache[21] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-grid-3x3-gap-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.product')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
    href: "#features",
    onClick: _cache[6] || (_cache[6] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $setup.scrollToFeatures && $setup.scrollToFeatures.apply($setup, arguments);
    }, ["prevent"]))
  }, [_cache[22] || (_cache[22] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-mic"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.features')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_78, [_cache[23] || (_cache[23] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-tag-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.pricing')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_79, [_cache[24] || (_cache[24] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-compass"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.roadmap')), 1 /* TEXT */)])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_80, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_81, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h4", null, [_cache[25] || (_cache[25] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-book-half"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.resources')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_82, [_cache[26] || (_cache[26] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-pen-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.tajweed_guide')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_83, [_cache[27] || (_cache[27] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-lightbulb-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.memorization_tips')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_84, [_cache[28] || (_cache[28] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-question-circle"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.help_center')), 1 /* TEXT */)])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_85, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_86, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h4", null, [_cache[29] || (_cache[29] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-building"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.company')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_87, [_cache[30] || (_cache[30] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-info-circle-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.aboutUs')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
    href: "#contact",
    onClick: _cache[7] || (_cache[7] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function ($event) {
      var _ctx$document$getElem;
      return (_ctx$document$getElem = _ctx.document.getElementById('contact')) === null || _ctx$document$getElem === void 0 ? void 0 : _ctx$document$getElem.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, ["prevent"]))
  }, [_cache[31] || (_cache[31] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-chat-dots-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.contact')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_88, [_cache[32] || (_cache[32] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-heart"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('mission.kicker')), 1 /* TEXT */)])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_89, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_90, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h4", null, [_cache[33] || (_cache[33] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-share-fill"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.connect')), 1 /* TEXT */)]), _cache[34] || (_cache[34] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createStaticVNode)("<div class=\"social-icons\"><a href=\"#\" aria-label=\"Twitter\"><i class=\"bi bi-twitter-x\"></i></a><a href=\"#\" aria-label=\"Instagram\"><i class=\"bi bi-instagram\"></i></a><a href=\"#\" aria-label=\"YouTube\"><i class=\"bi bi-youtube\"></i></a><a href=\"#\" aria-label=\"Facebook\"><i class=\"bi bi-facebook\"></i></a></div>", 1))])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_91, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, [_cache[35] || (_cache[35] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-c-circle"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.tagline')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_92, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_93, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.privacy')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_94, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.footer.terms')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", _hoisted_95, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.all_rights_reserved')), 1 /* TEXT */)])])])])], 8 /* PROPS */, _hoisted_1);
}

/***/ }),

/***/ "./resources/js/utils/theme.js":
/*!*************************************!*\
  !*** ./resources/js/utils/theme.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cycleGlobalTheme: () => (/* binding */ cycleGlobalTheme),
/* harmony export */   getSavedTheme: () => (/* binding */ getSavedTheme),
/* harmony export */   normalizeThemeToken: () => (/* binding */ normalizeThemeToken),
/* harmony export */   setGlobalTheme: () => (/* binding */ setGlobalTheme),
/* harmony export */   toThemePreference: () => (/* binding */ toThemePreference)
/* harmony export */ });
var THEME_STORAGE_KEY = 'mutqin-theme';
var THEME_PREFERENCE_KEY = 'mutqin-theme-preference';
var THEME_COOKIE_KEY = 'mutqin_theme';
function normalizeThemeToken() {
  var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'light';
  var theme = String(value || 'light').toLowerCase();
  if (theme === 'dark' || theme === 'dark-mode') return 'dark';
  if (theme === 'sepia' || theme === 'sepia-mode') return 'sepia';
  return 'light';
}
function toThemePreference() {
  var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'light';
  var theme = normalizeThemeToken(value);
  if (theme === 'dark') return 'dark-mode';
  if (theme === 'sepia') return 'sepia-mode';
  return 'light-mode';
}
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_unused) {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_unused2) {}
}
function readCookieTheme() {
  if (typeof document === 'undefined') return null;
  var match = document.cookie.match(new RegExp("(?:^|; )".concat(THEME_COOKIE_KEY, "=([^;]*)")));
  return match ? decodeURIComponent(match[1]) : null;
}
function getSavedTheme() {
  var savedTheme = safeGet(THEME_STORAGE_KEY);
  if (savedTheme) return normalizeThemeToken(savedTheme);
  var savedPreference = safeGet(THEME_PREFERENCE_KEY);
  if (savedPreference) return normalizeThemeToken(savedPreference);
  if (typeof document !== 'undefined') {
    var htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme) return normalizeThemeToken(htmlTheme);
  }
  var cookieTheme = readCookieTheme();
  if (cookieTheme) return normalizeThemeToken(cookieTheme);
  if (typeof window !== 'undefined' && window.mutqinInitialTheme) {
    return normalizeThemeToken(window.mutqinInitialTheme);
  }
  return 'light';
}
function setGlobalTheme(theme) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _options$dispatchEven = options.dispatchEvent,
    dispatchEvent = _options$dispatchEven === void 0 ? true : _options$dispatchEven;
  var normalizedTheme = normalizeThemeToken(theme);
  var themePreference = toThemePreference(normalizedTheme);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.cookie = "".concat(THEME_COOKIE_KEY, "=").concat(themePreference, ";path=/;max-age=31536000;samesite=lax");
  }
  safeSet(THEME_STORAGE_KEY, normalizedTheme);
  safeSet(THEME_PREFERENCE_KEY, themePreference);
  if (dispatchEvent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mutqin:theme-change', {
      detail: {
        theme: normalizedTheme
      }
    }));
  }
  return normalizedTheme;
}
function cycleGlobalTheme() {
  var themes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ['light', 'dark'];
  var current = getSavedTheme();
  var idx = themes.indexOf(current);
  var next = themes[(idx + 1) % themes.length];
  return setGlobalTheme(next);
}

/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css":
/*!***********************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css ***!
  \***********************************************************************************************************************************************************************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0__);
// Imports

var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_0___default()(function(i){return i[1]});
// Module
___CSS_LOADER_EXPORT___.push([module.id, "/* Homepage-only tone extensions built on the shared app tokens. */\n.vue-onboarding {\n  --accent-soft: color-mix(in srgb, var(--accent) 30%, var(--surface-strong));\n  --accent-wash: color-mix(in srgb, var(--accent-light) 74%, transparent);\n  --homepage-card-surface: color-mix(in srgb, var(--surface-strong) 92%, transparent);\n  --homepage-card-surface-strong: color-mix(in srgb, var(--surface-strong) 95%, var(--surface-elevated));\n  --homepage-card-border: color-mix(in srgb, var(--accent) 14%, var(--border));\n  --homepage-card-border-strong: color-mix(in srgb, var(--accent) 22%, var(--border));\n  --homepage-muted-strong: color-mix(in srgb, var(--text-muted) 88%, var(--text));\n  --homepage-heading-strong: color-mix(in srgb, var(--text) 96%, var(--text-on-accent));\n  --homepage-comparison-even: color-mix(in srgb, var(--accent-light) 28%, transparent);\n  --homepage-contrast-sparkle: color-mix(in srgb, var(--text-on-accent) 18%, transparent);\n  --homepage-contrast-border: color-mix(in srgb, var(--text-on-accent) 18%, var(--border));\n  --homepage-contrast-bg: linear-gradient(135deg, color-mix(in srgb, var(--accent-strong) 78%, var(--surface-strong)), color-mix(in srgb, var(--accent) 74%, var(--surface-elevated)));\n  --homepage-contrast-bg-dark: linear-gradient(135deg, color-mix(in srgb, var(--surface-strong) 92%, var(--accent-strong)), color-mix(in srgb, var(--surface-elevated) 78%, var(--accent)));\n  --homepage-focus-ring: color-mix(in srgb, var(--accent) 18%, transparent);\n  --font-ar: 'Amiri', 'Noto Naskh Arabic', serif;\n  --font-ui: \"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif;\n}\n.vue-onboarding[data-theme=\"dark\"] {\n  --accent-soft: color-mix(in srgb, var(--accent) 34%, var(--surface-strong));\n  --accent-wash: color-mix(in srgb, var(--accent-light) 48%, transparent);\n  --homepage-card-surface: color-mix(in srgb, var(--surface-strong) 94%, var(--surface));\n  --homepage-card-surface-strong: color-mix(in srgb, var(--surface-strong) 96%, var(--surface-elevated));\n  --homepage-card-border: color-mix(in srgb, var(--text-on-accent) 10%, var(--border));\n  --homepage-card-border-strong: color-mix(in srgb, var(--accent) 26%, var(--border));\n  --homepage-comparison-even: color-mix(in srgb, var(--surface-soft) 52%, transparent);\n}\n.vue-onboarding[data-theme=\"sepia\"] {\n  --accent-soft: color-mix(in srgb, var(--accent) 28%, var(--surface-strong));\n  --accent-wash: color-mix(in srgb, var(--accent-light) 68%, transparent);\n}\n.vue-onboarding {\n  min-height: 100vh;\n  display: flex;\n  flex-direction: column;\n  background:\n    radial-gradient(circle at 12% 10%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 26%),\n    var(--bg);\n  color: var(--text);\n}\n.vue-onboarding[data-theme=\"dark\"] {\n  background:\n    radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 28%),\n    linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--surface) 82%, var(--bg)) 100%);\n}\n\n/* Hero Section - Smaller & Refined */\n.hero {\n  min-height: calc(100vh - 70px);\n  display: flex;\n  align-items: center;\n  padding: 2.5rem 2.5rem clamp(3.2rem, 5vw, 4.8rem);\n  position: relative;\n  overflow: hidden;\n  color: var(--text);\n}\n.hero::before {\n  content: '۞';\n  position: absolute;\n  font-size: 26rem;\n  opacity: 0.03;\n  right: -8%;\n  top: 52%;\n  transform: translateY(-50%);\n  pointer-events: none;\n  animation: rotate 70s linear infinite;\n  color: var(--accent);\n}\n@keyframes rotate {\nfrom { transform: translateY(-50%) rotate(0deg);\n}\nto { transform: translateY(-50%) rotate(360deg);\n}\n}\n.hero-container {\n  width: min(1280px, calc(100% - 2rem));\n  margin: 0 auto;\n  position: relative;\n  z-index: 1;\n}\n.hero-layout {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));\n  gap: clamp(1.25rem, 3vw, 2.5rem);\n  align-items: center;\n}\n.hero-copy-column,\n.hero-visual-column,\n.feature-grid-item,\n.step-grid-item,\n.testimonial-grid-item,\n.pricing-grid-item,\n.contact-copy-column,\n.contact-form-column,\n.cta-copy-column,\n.cta-actions-column,\n.footer-brand-column,\n.footer-link-column,\n.footer-social-column,\n.contact-field {\n  min-width: 0;\n}\n.hero-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  background: color-mix(in srgb, var(--accent-light) 78%, var(--surface-strong));\n  color: var(--accent);\n  padding: 0.3rem 1rem;\n  border-radius: 40px;\n  font-size: 0.82rem;\n  font-weight: 750;\n  margin-bottom: 1.4rem;\n}\n.hero-title {\n  font-size: clamp(2.45rem, 4.2vw, 3.85rem);\n  font-weight: 780;\n  line-height: 1.02;\n  letter-spacing: 0;\n  margin-bottom: 1.1rem;\n}\n.hero-title span {\n  background: linear-gradient(135deg, var(--text), var(--accent-strong) 46%, var(--accent) 100%);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n}\n.hero-desc {\n  font-size: clamp(1rem, 1.9vw, 1.32rem);\n  color: color-mix(in srgb, var(--text) 78%, var(--text-muted));\n  margin-bottom: 1.6rem;\n  line-height: 1.8;\n  max-width: 700px;\n  font-weight: 200;\n}\n.problem-solution {\n  background: var(--surface);\n  border-radius: var(--radius);\n  padding: 1.15rem;\n  margin: 1rem 0 1.2rem;\n  border: 1px solid var(--border);\n  backdrop-filter: blur(10px);\n}\n.problem-text, .solution-text {\n  font-size: 0.98rem;\n  color: var(--text-muted);\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  line-height: 1.8;\n}\n.problem-text i, .solution-text i {\n  color: var(--accent);\n  margin-top: 2px;\n}\n.problem-text strong, .solution-text strong {\n  color: var(--accent-strong);\n}\n.solution-highlight {\n  margin-top: 1rem;\n  padding-top: 1rem;\n  border-top: 1px solid var(--border);\n}\n.hero-buttons {\n  display: flex;\n  gap: 0.85rem;\n  flex-wrap: wrap;\n  justify-content: flex-start;\n  margin-top: 0.8rem;\n}\n.hero-action-btn {\n  flex: 1 1 220px;\n  width: 100%;\n  min-width: 0;\n  min-height: 56px;\n  padding: 0.95rem 1.5rem;\n  border-radius: 14px;\n  max-width: 280px;\n}\n.hero-buttons .hero-action-btn--primary {\n  box-shadow: var(--shadow-md);\n}\n.hero-buttons .hero-action-btn--secondary {\n  background: color-mix(in srgb, var(--accent-light) 70%, var(--surface-strong));\n  border-color: color-mix(in srgb, var(--accent) 34%, var(--border));\n  color: var(--accent-strong);\n}\n.hero-buttons .hero-action-btn--secondary:hover {\n  background: color-mix(in srgb, var(--accent-light) 88%, var(--surface-strong));\n  border-color: color-mix(in srgb, var(--accent) 52%, var(--border));\n  color: var(--accent-strong);\n}\n\n/* Hero Image */\n.hero-image {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: stretch;\n  gap: 0.9rem;\n  min-width: 0;\n  max-width: 100%;\n}\n.demo-card {\n  flex: 1 1 100%;\n  max-width: 100%;\n  background: linear-gradient(180deg, var(--surface-strong), var(--surface));\n  border-radius: 12px;\n  padding: 1.6rem;\n  text-align: center;\n  box-shadow: var(--shadow-lg);\n  border: 1px solid var(--border);\n}\n.demo-card i {\n  font-size: 3.5rem;\n  color: var(--accent);\n  margin-bottom: 1rem;\n}\n.demo-card p {\n  color: var(--text-muted);\n  margin: 0.5rem 0;\n}\n.demo-wave {\n  background: var(--accent-light);\n  border-radius: 60px;\n  padding: 0.5rem 1rem;\n  margin-top: 1rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n}\n.demo-wave i {\n  font-size: 1rem;\n  margin-bottom: 0;\n}\n.floating-card {\n  flex: 1 1 min(180px, 100%);\n  min-height: 56px;\n  max-width: 100%;\n  background: var(--surface-strong);\n  backdrop-filter: blur(12px);\n  border-radius: 20px;\n  padding: 0.6rem 1.2rem;\n  display: flex;\n  align-items: center;\n  gap: 0.6rem;\n  font-size: 0.8rem;\n  font-weight: 500;\n  box-shadow: var(--shadow-md);\n  border: 1px solid var(--border);\n  animation: float 3s ease-in-out infinite;\n}\n.floating-card i {\n  font-size: 1rem;\n}\n@keyframes float {\n0%, 100% { transform: translateY(0);\n}\n50% { transform: translateY(-6px);\n}\n}\n\n/* Divider */\n.divider {\n  text-align: center;\n  padding: 1.35rem 0;\n  color: var(--accent);\n  font-size: 1rem;\n  letter-spacing: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 12px;\n}\n.section-divider {\n  margin: 0 auto;\n  padding: clamp(0.8rem, 1.8vw, 1.3rem) 0;\n}\n.divider i {\n  font-size: 0.8rem;\n  opacity: 0.6;\n}\n\n/* Section Styles */\n.features-section,\n.steps-section,\n.pricing-section,\n.faq-section,\n.contact-section {\n  position: relative;\n  overflow: hidden;\n}\n.features-section::before,\n.pricing-section::before {\n  content: '';\n  position: absolute;\n  width: 420px;\n  height: 420px;\n  border-radius: 50%;\n  background: radial-gradient(circle, var(--accent-light), transparent 70%);\n  top: 12%;\n  right: -160px;\n  pointer-events: none;\n}\n.section-container {\n  max-width: 1280px;\n  margin: 0 auto;\n  padding: clamp(2.7rem, 4.4vw, 3.8rem) 2.2rem;\n  position: relative;\n  z-index: 1;\n}\n.section-title-left,\n.section-subtitle-left {\n  text-align: left;\n  margin-left: 0;\n  margin-right: 0;\n}\n.section-kicker {\n  width: -moz-fit-content;\n  width: fit-content;\n  margin: 0 auto 1rem;\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  background: var(--accent-light);\n  color: var(--accent-strong);\n  border: 1px solid var(--border);\n  border-radius: 999px;\n  padding: 0.45rem 1rem;\n  font-size: 0.78rem;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n.section-title {\n  text-align: center;\n  font-size: clamp(2rem, 3vw, 3.1rem);\n  font-weight: 760;\n  margin-bottom: 1rem;\n  color: var(--text);\n  letter-spacing: -0.04em;\n  line-height: 1.14;\n}\n.section-title::before,\n.section-title::after {\n  content: '۞';\n  color: var(--accent);\n  font-size: 1.5rem;\n  margin: 0 1rem;\n  opacity: 0.5;\n  display: inline-block;\n}\n.section-subtitle {\n  text-align: center;\n  color: var(--text-muted);\n  margin-bottom: 3rem;\n  font-size: 1.1rem;\n  max-width: 680px;\n  margin-left: auto;\n  margin-right: auto;\n  line-height: 1.88;\n}\n.pricing-section .section-subtitle {\n  margin-bottom: 0.85rem;\n}\n.pricing-account-note {\n  text-align: center;\n  color: var(--text-muted);\n  max-width: 720px;\n  margin: 0 auto 2.5rem;\n  font-size: 0.95rem;\n  line-height: 1.65;\n}\n\n/* Features Grid */\n.features-grid {\n  margin-top: 0;\n}\n.features-grid .feature-grid-item {\n  padding: 0.5rem;\n  margin-bottom: 1rem;\n}\n.feature-card {\n  background: linear-gradient(145deg, var(--surface-strong), var(--surface));\n  backdrop-filter: blur(8px);\n  border-radius: 30px;\n  padding: 1.65rem;\n  border: 1px solid var(--border);\n  transition: all 0.3s ease;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n}\n.feature-card::after {\n  content: '';\n  position: absolute;\n  inset: auto 1.4rem 1.4rem 1.4rem;\n  height: 4px;\n  border-radius: 999px;\n  background: linear-gradient(90deg, var(--accent), transparent);\n  opacity: 0.35;\n}\n.feature-card:hover {\n  transform: translateY(-6px);\n  border-color: var(--accent);\n  box-shadow: var(--shadow-md);\n}\n.feature-topline {\n  display: flex;\n  justify-content: space-between;\n  align-items: flex-start;\n  gap: 1rem;\n  margin-bottom: 1.2rem;\n}\n.feature-icon {\n  width: 64px;\n  height: 64px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 22px;\n  background: var(--accent-light);\n  font-size: 2rem;\n  color: var(--accent);\n}\n.feature-card h3 {\n  font-size: 1.35rem;\n  margin-bottom: 0.75rem;\n  letter-spacing: -0.02em;\n}\n.feature-card p {\n  color: var(--text-muted);\n  line-height: 1.6;\n  margin-bottom: 1.25rem;\n}\n.feature-card strong {\n  margin-top: auto;\n  color: var(--accent-strong);\n  font-size: 0.9rem;\n}\n.feature-badge {\n  font-size: 0.7rem;\n  background: var(--accent-light);\n  border-radius: 40px;\n  padding: 0.2rem 0.8rem;\n  margin-left: 0.6rem;\n  font-weight: 600;\n  vertical-align: middle;\n  color: var(--accent);\n}\n.feature-badge.pro {\n  background: var(--accent);\n  color: white;\n}\n\n/* Steps Grid */\n.steps-section {\n  background:\n    linear-gradient(90deg, transparent 0 31%, var(--border) 31% 31.2%, transparent 31.2% 65%, var(--border) 65% 65.2%, transparent 65.2%),\n    var(--bg);\n}\n.steps-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));\n  gap: 1rem;\n  margin-top: 1.4rem;\n}\n.step-card {\n  text-align: left;\n  padding: 1.65rem;\n  background: var(--surface-strong);\n  border-radius: 30px;\n  border: 1px solid var(--border);\n  transition: all 0.3s ease;\n  min-height: 0;\n  box-shadow: var(--shadow-sm);\n}\n.step-card:hover {\n  transform: translateY(-4px);\n  border-color: var(--accent);\n  box-shadow: var(--shadow-md);\n}\n.step-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 1.4rem;\n}\n.step-number {\n  font-size: 3rem;\n  font-weight: 800;\n  color: var(--accent);\n  letter-spacing: -0.07em;\n  opacity: 0.35;\n}\n.step-icon {\n  width: 58px;\n  height: 58px;\n  border-radius: 20px;\n  background: var(--accent-light);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.8rem;\n  color: var(--accent);\n}\n.step-card h3 {\n  font-size: 1.5rem;\n  margin-bottom: 0.7rem;\n}\n.step-card p {\n  color: var(--text-muted);\n  line-height: 1.6;\n  margin-bottom: 1.3rem;\n}\n.step-card span {\n  display: inline-flex;\n  border-top: 1px solid var(--border);\n  padding-top: 0.9rem;\n  color: var(--accent-strong);\n  font-size: 0.85rem;\n  font-weight: 700;\n}\n\n/* Testimonials */\n.testimonials-section {\n  background:\n    linear-gradient(135deg, var(--accent-wash), transparent 58%),\n    var(--bg);\n}\n.testimonials-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));\n  gap: 1rem;\n  margin-top: 0;\n}\n.testimonial-card {\n  background: var(--surface-strong);\n  border-radius: 30px;\n  padding: 1.65rem;\n  border: 1px solid var(--border);\n  transition: all 0.3s ease;\n  box-shadow: var(--shadow-sm);\n}\n.testimonial-rating {\n  display: flex;\n  gap: 0.25rem;\n  margin-bottom: 1.2rem;\n}\n.testimonial-rating i {\n  font-size: 0.95rem;\n  color: var(--accent);\n}\n.testimonial-card:hover {\n  transform: translateY(-3px);\n  box-shadow: var(--shadow-md);\n}\n.testimonial-card > p {\n  font-size: 1.05rem;\n  line-height: 1.65;\n}\n.testimonial-proof {\n  width: -moz-fit-content;\n  width: fit-content;\n  margin-top: 1.1rem;\n  border-radius: 999px;\n  padding: 0.35rem 0.8rem;\n  background: var(--accent-light);\n  color: var(--accent-strong);\n  font-size: 0.75rem;\n  font-weight: 800;\n}\n.testimonial-author {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  margin-top: 1rem;\n}\n.author-avatar {\n  width: 48px;\n  height: 48px;\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: white;\n  font-weight: 600;\n  font-size: 1rem;\n}\n.author-info h4 {\n  font-size: 1rem;\n  margin-bottom: 0.25rem;\n}\n.author-info p {\n  font-size: 0.8rem;\n  color: var(--text-muted);\n}\n\n/* Pricing */\n.pricing-grid {\n  max-width: 1180px;\n  margin: 0 auto;\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));\n  gap: 1rem;\n}\n.pricing-comparison {\n  max-width: 1180px;\n  margin: 3rem auto 0;\n  background: color-mix(in srgb, var(--surface-strong) 92%, transparent);\n  border: 1px solid var(--border);\n  border-radius: 28px;\n  padding: 1.35rem;\n  box-shadow: var(--shadow-sm);\n}\n.comparison-header {\n  text-align: center;\n  margin-bottom: 1rem;\n}\n.comparison-header h3 {\n  font-size: clamp(1.55rem, 2.4vw, 2rem);\n  margin-bottom: 0.35rem;\n  letter-spacing: -0.03em;\n}\n.comparison-header p {\n  color: var(--text-muted);\n  font-size: 0.95rem;\n}\n.comparison-table-wrap {\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n  border: 1px solid var(--border);\n  border-radius: 18px;\n  background: color-mix(in srgb, var(--surface) 70%, transparent);\n}\n.comparison-table {\n  width: 100%;\n  border-collapse: separate;\n  border-spacing: 0;\n  min-width: 640px;\n}\n.comparison-table thead th {\n  text-align: left;\n  padding: 0.9rem 1rem;\n  font-size: 0.82rem;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--text-muted);\n  border-bottom: 1px solid var(--border);\n}\n.comparison-table thead th:not(:first-child) {\n  text-align: center;\n}\n.comparison-table tbody th,\n.comparison-table tbody td {\n  padding: 0.92rem 1rem;\n  border-bottom: 1px solid var(--border);\n  vertical-align: middle;\n}\n.comparison-table tbody th {\n  font-weight: 600;\n  color: var(--text);\n  width: 42%;\n  text-align: left;\n}\n.comparison-table tbody td {\n  text-align: center;\n  font-size: 0.92rem;\n  color: var(--text);\n  font-weight: 700;\n}\n.comparison-table tbody tr:nth-child(even) {\n  background: var(--homepage-comparison-even);\n}\n.comparison-value {\n  min-width: 7.8rem;\n  min-height: 32px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.45rem;\n  border-radius: 999px;\n  padding: 0.38rem 0.7rem;\n  border: 1px solid var(--border);\n  font-size: 0.82rem;\n  font-weight: 800;\n  white-space: nowrap;\n}\n.comparison-value-included {\n  color: var(--accent-strong);\n  background: var(--accent-light);\n  border-color: color-mix(in srgb, var(--accent) 28%, transparent);\n}\n.comparison-value-excluded {\n  color: var(--danger-text);\n  background: var(--danger-bg);\n  border-color: color-mix(in srgb, var(--danger-text) 20%, var(--border));\n}\n.comparison-value-limited {\n  color: var(--text);\n  background: var(--surface-strong);\n}\n.comparison-value-icon {\n  min-width: 2.5rem;\n  padding-inline: 0.6rem;\n}\n.comparison-value i {\n  font-size: 1rem;\n}\n.comparison-cards {\n  display: none;\n  gap: 0.85rem;\n}\n.comparison-card {\n  padding: 1rem 1.05rem;\n  border-radius: 18px;\n  border: 1px solid var(--border);\n  background: color-mix(in srgb, var(--surface) 78%, transparent);\n  box-shadow: var(--shadow-sm);\n}\n.comparison-card-feature {\n  margin: 0 0 0.85rem;\n  font-size: 0.98rem;\n  line-height: 1.35;\n  color: var(--text);\n}\n.comparison-card-tiers {\n  display: grid;\n  gap: 0.65rem;\n  margin: 0;\n}\n.comparison-card-tier {\n  display: grid;\n  grid-template-columns: minmax(5.5rem, 34%) 1fr;\n  align-items: center;\n  gap: 0.65rem;\n}\n.comparison-card-tier dt {\n  margin: 0;\n  font-size: 0.72rem;\n  font-weight: 700;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--text-muted);\n}\n.comparison-card-tier dd {\n  margin: 0;\n  display: flex;\n  justify-content: flex-start;\n}\n.comparison-card-tier .comparison-value {\n  min-width: 0;\n  width: 100%;\n  justify-content: flex-start;\n}\n@media (max-width: 767px) {\n.comparison-table-wrap {\n    display: none;\n}\n.comparison-cards {\n    display: grid;\n}\n.pricing-comparison {\n    padding: 1.05rem;\n}\n}\n@media (max-width: 480px) {\n.comparison-card-tier {\n    grid-template-columns: 1fr;\n    gap: 0.35rem;\n}\n}\n.faq-shell,\n.contact-card {\n  background: color-mix(in srgb, var(--surface-strong) 92%, transparent);\n  border: 1px solid var(--border);\n  border-radius: 28px;\n  box-shadow: var(--shadow-sm);\n}\n.faq-shell {\n  max-width: 980px;\n  margin: 0 auto;\n  padding: 1.1rem;\n}\n.faq-accordion .accordion-item {\n  border: 0;\n  background: transparent;\n  overflow: hidden;\n  border-radius: 20px;\n  margin-bottom: 0.85rem;\n}\n.faq-accordion .accordion-item:last-child {\n  margin-bottom: 0;\n}\n.faq-accordion .accordion-button {\n  background: var(--surface-strong);\n  color: var(--text);\n  border: 1px solid var(--border);\n  border-radius: 20px;\n  box-shadow: none;\n  font-weight: 700;\n  padding: 1.15rem 1.25rem;\n}\n.faq-accordion .accordion-button:not(.collapsed) {\n  color: var(--accent-strong);\n  background: var(--accent-light);\n  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));\n}\n.faq-accordion .accordion-button:focus {\n  box-shadow: 0 0 0 0.2rem var(--homepage-focus-ring);\n}\n.faq-accordion .accordion-button::after {\n  filter: saturate(0.4);\n}\n.faq-accordion .accordion-body {\n  color: var(--text-muted);\n  line-height: 1.75;\n  padding: 1rem 1.25rem 1.35rem;\n}\n.contact-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));\n  gap: 1rem;\n  align-items: start;\n  margin-top: 0;\n}\n.contact-copy {\n  display: grid;\n  gap: 1.35rem;\n}\n.contact-card {\n  padding: 1.4rem;\n}\n.contact-form {\n  display: grid;\n  gap: 1rem;\n}\n.contact-form-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));\n  gap: 1rem;\n  margin-top: 0;\n}\n.contact-form .form-label {\n  margin-bottom: 0.45rem;\n  font-weight: 700;\n  color: var(--text);\n}\n.contact-form .form-control {\n  min-height: 52px;\n  border-radius: 16px;\n  border: 1px solid var(--border);\n  background: var(--surface-strong);\n  color: var(--text);\n  padding: 0.85rem 1rem;\n}\n.contact-form .form-control:focus {\n  border-color: var(--accent);\n  box-shadow: 0 0 0 0.2rem var(--homepage-focus-ring);\n}\n.contact-textarea {\n  min-height: 160px;\n  resize: vertical;\n}\n.contact-submit {\n  width: 100%;\n  min-height: 54px;\n}\n.contact-alert {\n  border-radius: 18px;\n  padding: 0.95rem 1rem;\n  margin-bottom: 1rem;\n  font-weight: 600;\n}\n.contact-alert-success {\n  background: var(--success-bg, rgba(24, 128, 86, 0.11));\n  color: var(--success-text, #146c46);\n  border: 1px solid color-mix(in srgb, var(--success-text, #146c46) 22%, var(--border));\n}\n.contact-alert-error {\n  background: var(--danger-bg, rgba(178, 59, 59, 0.1));\n  color: var(--danger-text, #913232);\n  border: 1px solid color-mix(in srgb, var(--danger-text, #913232) 20%, var(--border));\n}\n.spin-icon {\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\nfrom { transform: rotate(0deg);\n}\nto { transform: rotate(360deg);\n}\n}\n.pricing-card {\n  background: var(--surface-strong);\n  border-radius: 28px;\n  padding: 1.7rem;\n  border: 1px solid var(--border);\n  transition: all 0.3s ease;\n  position: relative;\n  text-align: left;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n.pricing-card:hover {\n  transform: translateY(-6px);\n  box-shadow: var(--shadow-md);\n}\n.plan-label {\n  width: -moz-fit-content;\n  width: fit-content;\n  border: 1px solid var(--border);\n  border-radius: 999px;\n  padding: 0.35rem 0.8rem;\n  color: var(--text-muted);\n  font-size: 0.75rem;\n  font-weight: 800;\n  margin-bottom: 1.4rem;\n}\n.pricing-icon {\n  width: 60px;\n  height: 60px;\n  border-radius: 22px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--accent-light);\n  font-size: 2rem;\n  color: var(--accent);\n  margin-bottom: 1rem;\n}\n.pricing-card h3 {\n  font-size: 1.5rem;\n}\n.pricing-card.featured {\n  border: 2px solid var(--accent);\n  transform: translateY(-2px);\n  box-shadow: var(--shadow-lg);\n}\n.featured-tag {\n  position: absolute;\n  top: -12px;\n  left: 50%;\n  transform: translateX(-50%);\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  color: var(--text-on-accent);\n  font-size: 0.7rem;\n  font-weight: 700;\n  padding: 0.25rem 1rem;\n  border-radius: 40px;\n  white-space: nowrap;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.price {\n  font-size: 3rem;\n  font-weight: 760;\n  color: var(--accent);\n  margin: 1rem 0 0.4rem;\n  letter-spacing: -0.05em;\n}\n.price span {\n  font-size: 1rem;\n  color: var(--text-muted);\n}\n.pricing-alt {\n  color: var(--text-muted);\n  font-size: 0.9rem;\n  margin-top: -0.5rem;\n}\n.pricing-features {\n  list-style: none;\n  margin: 1.25rem 0;\n  text-align: left;\n  flex: 1;\n}\n.pricing-features li {\n  padding: 0.6rem 0;\n  display: flex;\n  align-items: center;\n  gap: 0.6rem;\n  color: var(--text-muted);\n  font-size: 0.9rem;\n}\n.pricing-features i.bi-check-circle-fill { color: var(--accent); font-size: 1rem;\n}\n.pricing-card .btn-primary,\n.pricing-card .btn-secondary {\n  width: 100%;\n  height: 52px;\n  min-height: 52px;\n  padding: 0 1rem;\n  border-radius: 999px;\n  font-size: 0.94rem;\n}\n.vue-onboarding[data-theme=\"dark\"] .hero-badge,\n.vue-onboarding[data-theme=\"dark\"] .section-kicker,\n.vue-onboarding[data-theme=\"dark\"] .feature-badge,\n.vue-onboarding[data-theme=\"dark\"] .testimonial-proof,\n.vue-onboarding[data-theme=\"dark\"] .plan-label {\n  background: color-mix(in srgb, var(--surface-strong) 72%, transparent);\n  border-color: var(--homepage-card-border);\n}\n.vue-onboarding[data-theme=\"dark\"] .problem-solution,\n.vue-onboarding[data-theme=\"dark\"] .feature-card,\n.vue-onboarding[data-theme=\"dark\"] .step-card,\n.vue-onboarding[data-theme=\"dark\"] .testimonial-card,\n.vue-onboarding[data-theme=\"dark\"] .pricing-card,\n.vue-onboarding[data-theme=\"dark\"] .demo-card {\n  background: var(--homepage-card-surface-strong);\n  border-color: var(--homepage-card-border);\n}\n.vue-onboarding[data-theme=\"dark\"] .hero-desc,\n.vue-onboarding[data-theme=\"dark\"] .problem-text,\n.vue-onboarding[data-theme=\"dark\"] .solution-text,\n.vue-onboarding[data-theme=\"dark\"] .feature-card p,\n.vue-onboarding[data-theme=\"dark\"] .step-card p,\n.vue-onboarding[data-theme=\"dark\"] .testimonial-card > p,\n.vue-onboarding[data-theme=\"dark\"] .pricing-alt,\n.vue-onboarding[data-theme=\"dark\"] .pricing-features li,\n.vue-onboarding[data-theme=\"dark\"] .author-info p {\n  color: var(--homepage-muted-strong);\n}\n.vue-onboarding[data-theme=\"dark\"] .section-title,\n.vue-onboarding[data-theme=\"dark\"] .hero-title,\n.vue-onboarding[data-theme=\"dark\"] .step-card h3,\n.vue-onboarding[data-theme=\"dark\"] .feature-card h3,\n.vue-onboarding[data-theme=\"dark\"] .testimonial-card h4,\n.vue-onboarding[data-theme=\"dark\"] .pricing-card h3,\n.vue-onboarding[data-theme=\"dark\"] .comparison-header h3 {\n  color: var(--homepage-heading-strong);\n}\n.vue-onboarding[data-theme=\"dark\"] .pricing-comparison {\n  background: var(--homepage-card-surface-strong);\n  border-color: var(--homepage-card-border);\n}\n.vue-onboarding[data-theme=\"dark\"] .faq-shell,\n.vue-onboarding[data-theme=\"dark\"] .contact-card,\n.vue-onboarding[data-theme=\"dark\"] .faq-accordion .accordion-button,\n.vue-onboarding[data-theme=\"dark\"] .contact-form .form-control {\n  background: var(--homepage-card-surface-strong);\n  border-color: var(--homepage-card-border);\n}\n.vue-onboarding[data-theme=\"dark\"] .faq-accordion .accordion-button:not(.collapsed) {\n  background: color-mix(in srgb, var(--warning-bg) 86%, transparent);\n  color: var(--text);\n}\n.vue-onboarding[data-theme=\"dark\"] .faq-accordion .accordion-body {\n  color: var(--homepage-muted-strong);\n}\n.vue-onboarding[data-theme=\"dark\"] .contact-form .form-label {\n  color: var(--homepage-heading-strong);\n}\n.vue-onboarding[data-theme=\"dark\"] .contact-alert-success {\n  color: var(--success-text);\n}\n.vue-onboarding[data-theme=\"dark\"] .contact-alert-error {\n  color: var(--danger-text);\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-table thead th,\n.vue-onboarding[data-theme=\"dark\"] .comparison-header p {\n  color: var(--homepage-muted-strong);\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-table tbody th,\n.vue-onboarding[data-theme=\"dark\"] .comparison-table tbody td {\n  color: var(--homepage-heading-strong);\n  border-bottom-color: color-mix(in srgb, var(--border) 90%, transparent);\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-table tbody tr:nth-child(even) {\n  background: var(--homepage-comparison-even);\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-table-wrap {\n  background: color-mix(in srgb, var(--surface-soft) 48%, transparent);\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-value-included {\n  color: var(--accent);\n  background: color-mix(in srgb, var(--accent-light) 76%, transparent);\n  border-color: color-mix(in srgb, var(--accent) 28%, var(--border));\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-value-excluded {\n  color: var(--danger-text);\n  background: var(--danger-bg);\n  border-color: color-mix(in srgb, var(--danger-text) 20%, var(--border));\n}\n.vue-onboarding[data-theme=\"dark\"] .comparison-value-limited {\n  color: var(--text-on-accent);\n  background: color-mix(in srgb, var(--surface-strong) 74%, transparent);\n}\n.pricing-actions {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));\n  gap: 0.75rem;\n}\n.pricing-actions form {\n  min-width: 0;\n}\n.pricing-actions button {\n  width: 100%;\n}\n.pricing-actions .btn-secondary,\n.pricing-card > .btn-secondary {\n  background: color-mix(in srgb, var(--surface-strong) 88%, var(--surface));\n  color: var(--text);\n  border-color: color-mix(in srgb, var(--accent) 24%, var(--border));\n}\n.pricing-actions .btn-secondary:hover,\n.pricing-card > .btn-secondary:hover {\n  color: var(--accent-strong);\n  border-color: var(--accent);\n  background: var(--accent-light);\n}\n.vue-onboarding[data-theme=\"dark\"] .pricing-actions .btn-secondary,\n.vue-onboarding[data-theme=\"dark\"] .pricing-card > .btn-secondary {\n  background: color-mix(in srgb, var(--surface-strong) 82%, transparent);\n  color: var(--homepage-heading-strong);\n  border-color: var(--homepage-card-border-strong);\n}\n.vue-onboarding[data-theme=\"dark\"] .pricing-actions .btn-secondary:hover,\n.vue-onboarding[data-theme=\"dark\"] .pricing-card > .btn-secondary:hover {\n  background: color-mix(in srgb, var(--accent-light) 86%, transparent);\n  color: var(--accent);\n  border-color: color-mix(in srgb, var(--accent) 38%, var(--border));\n}\n\n/* CTA Block */\n.cta-block {\n  max-width: 1000px;\n  margin: 1.4rem auto 2.2rem;\n  background:\n    radial-gradient(circle at 12% 20%, var(--homepage-contrast-sparkle), transparent 24%),\n    var(--homepage-contrast-bg);\n  border-radius: 40px;\n  color: var(--text-on-accent);\n  padding: 2.35rem;\n  border: 1px solid var(--homepage-contrast-border);\n  box-shadow: var(--shadow-lg);\n}\n.cta-layout {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));\n  gap: 1rem;\n  align-items: center;\n}\n.cta-icon {\n  width: 58px;\n  height: 58px;\n  border-radius: 20px;\n  background: color-mix(in srgb, var(--text-on-accent) 16%, transparent);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 1.7rem;\n  color: var(--text-on-accent);\n  margin-bottom: 1rem;\n}\n.cta-block h2 {\n  font-size: clamp(2.2rem, 4.4vw, 3.5rem);\n  margin-bottom: 1rem;\n  letter-spacing: -0.05em;\n}\n.cta-block p {\n  margin-bottom: 0;\n  color: var(--text-on-accent-muted);\n  max-width: 600px;\n  line-height: 1.65;\n}\n.cta-actions {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 0.8rem;\n  width: min(100%, 320px);\n}\n.cta-actions .btn-primary {\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  border-color: color-mix(in srgb, var(--accent-strong) 84%, transparent);\n  color: var(--text-on-accent);\n  width: 100%;\n  height: 58px;\n  min-height: 58px;\n  padding: 1rem 1.65rem;\n}\n.cta-actions .btn-primary:hover {\n  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 90%, white 10%), var(--accent-strong));\n  border-color: color-mix(in srgb, var(--accent-strong) 90%, transparent);\n  color: var(--text-on-accent);\n}\n.cta-actions span {\n  color: var(--text-on-accent-muted);\n  font-size: 0.85rem;\n}\n.vue-onboarding[data-theme=\"dark\"] .cta-block {\n  background:\n    radial-gradient(circle at 12% 20%, color-mix(in srgb, var(--accent-light) 84%, transparent), transparent 24%),\n    var(--homepage-contrast-bg-dark);\n  border-color: color-mix(in srgb, var(--text-on-accent) 12%, var(--border));\n}\n.vue-onboarding[data-theme=\"dark\"] .cta-block p,\n.vue-onboarding[data-theme=\"dark\"] .cta-actions span {\n  color: var(--text-on-accent-muted);\n}\n\n/* Buttons */\n.btn-primary, .btn-secondary {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.6rem;\n  min-width: 44px;\n  min-height: 44px;\n  max-width: 100%;\n  padding: 0.85rem 1.35rem;\n  border-radius: 14px;\n  font-weight: 600;\n  font-size: 0.95rem;\n  transition: all 0.3s ease;\n  text-decoration: none;\n  cursor: pointer;\n  border: 1px solid transparent;\n  text-align: center;\n  overflow-wrap: anywhere;\n}\n.btn-primary {\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  color: var(--text-on-accent);\n}\n.btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: var(--shadow-md);\n}\n.btn-secondary {\n  background: transparent;\n  border: 1px solid var(--border);\n  color: var(--text);\n}\n.btn-secondary:hover {\n  background: var(--accent-light);\n  border-color: var(--accent);\n  transform: translateY(-1px);\n}\n\n/* Footer - Updated */\n.footer {\n  background: var(--surface);\n  border-top: 1px solid var(--border);\n  padding: 2.8rem 1.6rem 1.6rem;\n  margin-top: auto;\n  width: 100%;\n  bottom: 0;\n  left: 0;\n  right: 0;\n}\n.footer-container {\n  max-width: 1280px;\n  margin: 0 auto;\n}\n.footer-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));\n  gap: 1rem;\n  margin-bottom: 2.2rem;\n}\n.footer-brand {\n  max-width: 100%;\n}\n.footer-logo {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-bottom: 1rem;\n}\n.footer-logo i {\n  font-size: 1.8rem;\n  color: var(--accent);\n}\n.footer-logo h3 {\n  font-size: 1.3rem;\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  background-clip: text;\n  -webkit-background-clip: text;\n  color: transparent;\n}\n.footer-brand p {\n  color: var(--text-muted);\n  font-size: 0.85rem;\n  line-height: 1.5;\n}\n.footer-links h4, .footer-social h4 {\n  color: var(--accent);\n  margin-bottom: 1rem;\n  font-size: 1rem;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n.footer-links a {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  color: var(--text-muted);\n  text-decoration: none;\n  margin-bottom: 0.6rem;\n  font-size: 0.85rem;\n  transition: all 0.3s ease;\n}\n.footer-links a i {\n  font-size: 0.8rem;\n}\n.footer-links a:hover {\n  color: var(--accent);\n  transform: translateX(5px);\n}\n.social-icons {\n  display: flex;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.social-icons a {\n  width: 38px;\n  height: 38px;\n  border-radius: 50%;\n  background: var(--accent-light);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: var(--accent);\n  font-size: 1.2rem;\n  transition: all 0.3s ease;\n  text-decoration: none;\n}\n.social-icons a:hover {\n  background: var(--accent);\n  color: white;\n  transform: translateY(-3px);\n}\n.footer-bottom {\n  text-align: center;\n  padding-top: 1.5rem;\n  border-top: 1px solid var(--border);\n  color: var(--text-muted);\n  font-size: 0.8rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.8rem;\n  align-items: center;\n}\n.footer-bottom i {\n  margin-right: 4px;\n}\n.footer-legal {\n  display: flex;\n  gap: 1.5rem;\n  justify-content: center;\n  flex-wrap: wrap;\n}\n.footer-legal a {\n  color: var(--text-muted);\n  text-decoration: none;\n  font-size: 0.78rem;\n}\n.footer-legal a:hover {\n  color: var(--accent);\n}\n\n/* AOS Animations */\n[data-aos] {\n  opacity: 0;\n  transform: translateY(20px);\n  transition: all 0.6s cubic-bezier(0.2, 0.9, 0.4, 1.1);\n}\n[data-aos].aos-animate {\n  opacity: 1;\n  transform: translateY(0);\n}\n[data-aos=\"fade-up\"] { transform: translateY(30px);\n}\n[data-aos=\"fade-left\"] { transform: translateX(30px);\n}\n[data-aos=\"zoom-in\"] { transform: scale(0.95);\n}\n[data-aos=\"zoom-in\"].aos-animate { transform: scale(1);\n}\n[data-aos=\"flip-up\"] { transform: rotateX(90deg); transform-origin: center;\n}\n[data-aos=\"flip-up\"].aos-animate { transform: rotateX(0);\n}\n[data-aos=\"flip-right\"] { transform: rotateY(90deg);\n}\n[data-aos=\"flip-right\"].aos-animate { transform: rotateY(0);\n}\n[data-aos=\"flip-left\"] { transform: rotateY(-90deg);\n}\n[data-aos=\"flip-left\"].aos-animate { transform: rotateY(0);\n}\n\n/* Phone layout: keep every marketing section inside the viewport. */\n@media (max-width: 767.98px) {\n.vue-onboarding,\n  .hero,\n  .hero-container,\n  .hero-layout,\n  .hero-copy-column,\n  .hero-visual-column,\n  .hero-content,\n  .hero-image,\n  .section-container,\n  .features-grid,\n  .feature-grid-item,\n  .steps-grid,\n  .step-grid-item,\n  .testimonials-grid,\n  .testimonial-grid-item,\n  .pricing-grid,\n  .pricing-grid-item,\n  .pricing-comparison,\n  .comparison-cards,\n  .faq-shell,\n  .contact-card,\n  .contact-grid,\n  .contact-copy-column,\n  .contact-form-column,\n  .cta-block,\n  .cta-layout,\n  .footer-container,\n  .footer-grid {\n    box-sizing: border-box;\n    width: 100%;\n    max-width: 100%;\n    min-width: 0;\n}\n.hero {\n    min-height: 0;\n    padding: 1.25rem clamp(0.75rem, 3.8vw, 1rem) 2rem;\n    align-items: flex-start;\n}\n.hero::before {\n    right: 0;\n    top: 16%;\n    font-size: min(70vw, 15rem);\n    transform: none;\n    animation: none;\n}\n[data-aos=\"fade-left\"] {\n    transform: translateY(20px);\n}\n.features-section::before,\n  .pricing-section::before {\n    right: 0;\n    width: min(68vw, 220px);\n    height: min(68vw, 220px);\n}\n.hero-container {\n    margin: 0;\n}\n.hero-layout {\n    grid-template-columns: minmax(0, 1fr);\n    gap: 1rem;\n}\n.hero-badge {\n    max-width: 100%;\n    margin-bottom: 0.9rem;\n    white-space: normal;\n    overflow-wrap: break-word;\n}\n.hero-title {\n    margin-bottom: 0.8rem;\n    font-size: clamp(1.55rem, 7.5vw, 2.1rem);\n    line-height: 1.15;\n    font-weight: 620;\n    overflow-wrap: break-word;\n}\n.hero-desc {\n    margin-bottom: 1rem;\n    font-size: 1rem;\n    line-height: 1.65;\n}\n.problem-solution {\n    width: 100%;\n    max-width: 100%;\n    min-width: 0;\n    margin: 0.75rem 0 1rem;\n    padding: 0.9rem;\n    border-radius: 18px;\n}\n.problem-text,\n  .solution-text {\n    min-width: 0;\n    max-width: 100%;\n    font-size: 0.9rem;\n    line-height: 1.6;\n    white-space: normal;\n    overflow-wrap: break-word;\n}\n.hero-buttons {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 0.65rem;\n    width: 100%;\n}\n.hero-action-btn {\n    width: 100%;\n    max-width: none;\n    min-width: 0;\n    min-height: 48px;\n    padding: 0.8rem 1rem;\n}\n.demo-card,\n  .floating-card {\n    width: 100%;\n    min-width: 0;\n}\n.demo-card {\n    padding: 1.1rem;\n    border-radius: 18px;\n}\n.floating-card {\n    flex-basis: calc(50% - 0.45rem);\n    padding: 0.65rem 0.75rem;\n    border-radius: 15px;\n    overflow-wrap: break-word;\n}\n.section-container {\n    padding: 2rem clamp(0.75rem, 3.8vw, 1rem);\n}\n.section-kicker {\n    max-width: 100%;\n    padding-inline: 0.8rem;\n    text-align: center;\n    white-space: normal;\n    overflow-wrap: break-word;\n}\n.section-title {\n    font-size: clamp(1.7rem, 8.5vw, 2.25rem);\n    line-height: 1.15;\n    overflow-wrap: break-word;\n}\n.section-title::before,\n  .section-title::after {\n    margin-inline: 0.35rem;\n    font-size: 0.9rem;\n}\n.section-subtitle {\n    margin-bottom: 1.6rem;\n    font-size: 0.95rem;\n    line-height: 1.65;\n}\n.features-grid.row {\n    margin-inline: 0;\n}\n.features-grid .feature-grid-item {\n    padding: 0;\n    margin-bottom: 0.75rem;\n}\n.features-grid,\n  .steps-grid,\n  .testimonials-grid,\n  .pricing-grid,\n  .contact-grid,\n  .cta-layout,\n  .footer-grid {\n    grid-template-columns: minmax(0, 1fr);\n    gap: 0.8rem;\n}\n.feature-card,\n  .step-card,\n  .testimonial-card,\n  .pricing-card,\n  .contact-card,\n  .faq-shell,\n  .cta-block {\n    min-width: 0;\n    max-width: 100%;\n    padding: 1rem;\n    border-radius: 20px;\n}\n.feature-card p,\n  .step-card p,\n  .testimonial-card p,\n  .pricing-card,\n  .pricing-features li,\n  .contact-card,\n  .faq-accordion .accordion-body,\n  .cta-block,\n  .footer {\n    overflow-wrap: break-word;\n}\n.steps-section {\n    background: var(--bg);\n}\n.pricing-comparison {\n    margin-top: 1.2rem;\n    padding: 0.85rem;\n    border-radius: 20px;\n}\n.comparison-card {\n    min-width: 0;\n    padding: 0.85rem;\n}\n.comparison-card-tier {\n    min-width: 0;\n    grid-template-columns: minmax(4.5rem, 30%) minmax(0, 1fr);\n}\n.comparison-card-tier dd,\n  .comparison-card-tier .comparison-value {\n    min-width: 0;\n    max-width: 100%;\n    white-space: normal;\n    overflow-wrap: break-word;\n}\n.contact-form-grid {\n    grid-template-columns: minmax(0, 1fr);\n}\n.contact-field,\n  .contact-field input,\n  .contact-field textarea,\n  .contact-submit,\n  .pricing-actions,\n  .pricing-actions form,\n  .pricing-actions button,\n  .cta-actions,\n  .cta-actions a {\n    width: 100%;\n    max-width: 100%;\n    min-width: 0;\n}\n.pricing-actions,\n  .cta-actions {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 0.6rem;\n}\n.footer {\n    padding-inline: clamp(0.75rem, 3.8vw, 1rem);\n}\n.footer-container {\n    padding-inline: 0;\n}\n.footer-legal {\n    gap: 0.75rem;\n}\n}\n@media (max-width: 349.98px) {\n.floating-card,\n  .comparison-card-tier {\n    flex-basis: 100%;\n    grid-template-columns: minmax(0, 1fr);\n}\n}\n\n/* Strict four-column phone grid: sections keep deliberate composition. */\n@media (max-width: 767.98px) {\n.vue-onboarding {\n    --home-mobile-grid: repeat(4, minmax(0, 1fr));\n    --home-mobile-gap: clamp(10px, 2.6vw, 14px);\n    --home-mobile-section-pad-y: clamp(1.75rem, 6vw, 2.5rem);\n    --home-mobile-section-pad-x: clamp(1rem, 4.2vw, 1.25rem);\n    overflow-x: clip;\n}\n.hero-layout,\n  .problem-solution,\n  .hero-buttons,\n  .demo-card,\n  .features-grid,\n  .steps-grid,\n  .testimonials-grid,\n  .pricing-grid,\n  .pricing-actions,\n  .comparison-cards,\n  .contact-grid,\n  .contact-form-grid,\n  .cta-layout,\n  .cta-actions,\n  .footer-grid {\n    display: grid !important;\n    grid-template-columns: var(--home-mobile-grid) !important;\n    gap: var(--home-mobile-gap) !important;\n    min-width: 0;\n}\n.hero {\n    padding:\n      calc(var(--home-mobile-section-pad-y) * 0.85)\n      var(--home-mobile-section-pad-x)\n      var(--home-mobile-section-pad-y);\n}\n.section-container {\n    padding: var(--home-mobile-section-pad-y) var(--home-mobile-section-pad-x);\n}\n.section-divider {\n    margin-block: 0.35rem;\n    padding-inline: var(--home-mobile-section-pad-x);\n}\n.hero-copy-column,\n  .hero-visual-column {\n    grid-column: 1 / -1;\n    min-width: 0;\n}\n.hero-content {\n    display: grid;\n    gap: 0.85rem;\n}\n.problem-solution {\n    grid-template-columns: minmax(0, 1fr) !important;\n    gap: 0.75rem !important;\n    margin: 0.15rem 0 0.35rem;\n}\n.problem-solution > * {\n    grid-column: 1 / -1;\n    min-width: 0;\n}\n.problem-text,\n  .solution-text {\n    display: block;\n}\n.problem-text i,\n  .solution-text i {\n    margin-inline-end: 6px;\n}\n.hero-buttons {\n    grid-template-columns: minmax(0, 1fr) !important;\n    gap: 0.7rem !important;\n    margin-top: 0.15rem;\n}\n.hero-buttons > *,\n  .pricing-actions > *,\n  .cta-actions > * {\n    grid-column: 1 / -1;\n    min-width: 0;\n}\n.demo-card {\n    align-items: center;\n    text-align: start;\n    grid-template-columns: 3.25rem minmax(0, 1fr) !important;\n    gap: 0.55rem 0.75rem !important;\n    margin-top: 0.35rem;\n}\n.demo-card > .bi-mic {\n    grid-column: 1;\n    grid-row: 1 / span 2;\n    align-self: center;\n    justify-self: center;\n    margin: 0;\n    font-size: clamp(2.2rem, 10vw, 2.9rem);\n}\n.demo-card > h3 {\n    grid-column: 2 / -1;\n    grid-row: 1;\n    min-width: 0;\n    margin: 0;\n    line-height: 1.2;\n    word-break: normal;\n    overflow-wrap: normal;\n}\n.demo-card > p {\n    grid-column: 2 / -1;\n    grid-row: 2;\n    min-width: 0;\n    margin: 0;\n    line-height: 1.5;\n    word-break: normal;\n    overflow-wrap: break-word;\n}\n.demo-card > .demo-wave {\n    grid-column: 1 / -1;\n    grid-row: 3;\n    display: grid;\n    grid-template-columns: 44px minmax(0, 1fr);\n    justify-content: stretch;\n    margin: 0.15rem 0 0;\n    min-width: 0;\n}\n.hero-image {\n    display: grid;\n    gap: 0.7rem;\n}\n.floating-card {\n    grid-column: span 2;\n    min-width: 0;\n}\n.features-grid > .feature-grid-item,\n  .steps-grid > .step-grid-item,\n  .testimonials-grid > .testimonial-grid-item {\n    grid-column: 1 / -1;\n    width: auto !important;\n    max-width: none !important;\n    min-width: 0;\n    margin: 0 !important;\n}\n.feature-card,\n  .step-card,\n  .testimonial-card,\n  .pricing-card,\n  .contact-card,\n  .faq-shell,\n  .cta-block {\n    height: 100%;\n    padding: 1.1rem !important;\n}\n.feature-card,\n  .step-card,\n  .testimonial-card {\n    height: 100%;\n}\n.pricing-grid > .pricing-grid-item,\n  .pricing-grid > .pricing-card,\n  .comparison-cards > .comparison-card {\n    grid-column: 1 / -1;\n    min-width: 0;\n}\n.pricing-features {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 0.35rem 0;\n}\n.pricing-actions,\n  .cta-actions {\n    grid-template-columns: minmax(0, 1fr) !important;\n}\n.contact-copy-column,\n  .contact-form-column,\n  .cta-layout > :first-child,\n  .cta-layout > :last-child {\n    grid-column: 1 / -1;\n    min-width: 0;\n}\n.contact-form-grid > .contact-field {\n    grid-column: 1 / -1;\n}\n.cta-block {\n    margin-inline: var(--home-mobile-section-pad-x);\n    margin-block: 1rem 1.6rem;\n    width: auto;\n    max-width: none;\n    border-radius: 24px;\n}\n.cta-layout {\n    grid-template-columns: minmax(0, 1fr) !important;\n    gap: 1rem !important;\n}\n.cta-actions {\n    width: 100%;\n    max-width: none;\n}\n.footer {\n    padding-inline: var(--home-mobile-section-pad-x);\n    padding-block: 1.5rem 1.75rem;\n}\n.footer-grid > * {\n    grid-column: 1 / -1;\n    min-width: 0;\n}\n.footer-legal {\n    gap: 0.65rem;\n}\n}\n@media (min-width: 560px) and (max-width: 767.98px) {\n.features-grid > .feature-grid-item,\n  .steps-grid > .step-grid-item,\n  .testimonials-grid > .testimonial-grid-item {\n    grid-column: span 2;\n}\n.hero-buttons {\n    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;\n}\n.hero-buttons > * {\n    grid-column: auto;\n}\n.floating-card {\n    grid-column: span 2;\n}\n.pricing-features {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    gap: 8px 12px;\n}\n.footer-grid > * {\n    grid-column: span 2;\n}\n.footer-grid > :last-child:nth-child(odd) {\n    grid-column: 1 / -1;\n}\n}\n@media (max-width: 349.98px) {\n.floating-card,\n  .comparison-card-tier {\n    flex-basis: 100%;\n    grid-template-columns: minmax(0, 1fr);\n}\n.contact-copy-column,\n  .contact-form-column,\n  .cta-layout > :first-child,\n  .cta-layout > :last-child {\n    grid-column: 1 / -1;\n}\n}\n@media (max-width: 559.98px) {\n.contact-copy {\n    display: grid;\n    grid-template-columns: minmax(0, 1fr);\n    gap: 0.45rem;\n    align-items: start;\n}\n.contact-copy > .section-title,\n  .contact-copy > .section-subtitle {\n    grid-column: 1 / -1;\n    margin: 0;\n}\n}\n@media (max-width: 349.98px) {\n.contact-copy > .section-title,\n  .contact-copy > .section-subtitle {\n    grid-column: 1 / -1;\n}\n}\n\n\n/* mutqin-mobile-content-pass */\n@media (max-width: 767.98px) {\n.hero-title,\n  .section-title {\n    font-size: clamp(1.45rem, 7vw, 1.9rem) !important;\n    font-weight: 620 !important;\n    letter-spacing: -0.02em !important;\n    line-height: 1.2 !important;\n}\n.section-subtitle,\n  .hero-lead,\n  .feature-card p {\n    font-size: 0.95rem !important;\n    line-height: 1.55 !important;\n}\n.feature-card {\n    padding: 1rem !important;\n    border-radius: 18px !important;\n}\n}\n", ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Homepage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/vue-loader/dist/stylePostLoader.js!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./Homepage.css?vue&type=style&index=0&lang=css */ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Homepage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_1__["default"], options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Homepage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_1__["default"].locals || {});

/***/ }),

/***/ "./resources/js/views/Homepage.vue":
/*!*****************************************!*\
  !*** ./resources/js/views/Homepage.vue ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _Homepage_vue_vue_type_template_id_a027a5e6__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Homepage.vue?vue&type=template&id=a027a5e6 */ "./resources/js/views/Homepage.vue?vue&type=template&id=a027a5e6");
/* harmony import */ var _Homepage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Homepage.vue?vue&type=script&lang=js */ "./resources/js/views/Homepage.vue?vue&type=script&lang=js");
/* harmony import */ var _Homepage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Homepage.css?vue&type=style&index=0&lang=css */ "./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;


const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__["default"])(_Homepage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_Homepage_vue_vue_type_template_id_a027a5e6__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/views/Homepage.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/views/Homepage.vue?vue&type=script&lang=js":
/*!*****************************************************************!*\
  !*** ./resources/js/views/Homepage.vue?vue&type=script&lang=js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Homepage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Homepage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./Homepage.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Homepage.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/views/Homepage.vue?vue&type=template&id=a027a5e6":
/*!***********************************************************************!*\
  !*** ./resources/js/views/Homepage.vue?vue&type=template&id=a027a5e6 ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Homepage_vue_vue_type_template_id_a027a5e6__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Homepage_vue_vue_type_template_id_a027a5e6__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./Homepage.vue?vue&type=template&id=a027a5e6 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Homepage.vue?vue&type=template&id=a027a5e6");


/***/ }),

/***/ "./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css":
/*!*************************************************************************!*\
  !*** ./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_style_loader_dist_cjs_js_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Homepage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/style-loader/dist/cjs.js!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/vue-loader/dist/stylePostLoader.js!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./Homepage.css?vue&type=style&index=0&lang=css */ "./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Homepage.css?vue&type=style&index=0&lang=css");


/***/ })

}]);