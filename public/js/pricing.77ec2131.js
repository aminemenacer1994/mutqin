"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["pricing"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/PricingPage.vue?vue&type=script&lang=js":
/*!************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/PricingPage.vue?vue&type=script&lang=js ***!
  \************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");
/* harmony import */ var vue_i18n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! vue-i18n */ "./node_modules/vue-i18n/dist/vue-i18n.mjs");
/* harmony import */ var _utils_theme__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/theme */ "./resources/js/utils/theme.js");



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'PricingPage',
  setup: function setup() {
    var _document$querySelect;
    var _useI18n = (0,vue_i18n__WEBPACK_IMPORTED_MODULE_2__.useI18n)(),
      t = _useI18n.t;
    var currentTheme = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)((0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)());
    var billingCycle = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('annual');
    var csrfToken = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(((_document$querySelect = document.querySelector('meta[name="csrf-token"]')) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.getAttribute('content')) || '');
    var startFreeHref = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return window.mutqinAuthCheck ? '/memorisation' : '/register';
    });
    var handleGlobalThemeChange = function handleGlobalThemeChange(event) {
      var _event$detail;
      currentTheme.value = (event === null || event === void 0 || (_event$detail = event.detail) === null || _event$detail === void 0 ? void 0 : _event$detail.theme) || (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)();
    };
    (0,vue__WEBPACK_IMPORTED_MODULE_0__.onMounted)(function () {
      currentTheme.value = (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)();
      (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.setGlobalTheme)(currentTheme.value, {
        dispatchEvent: false
      });
      window.addEventListener('mutqin:theme-change', handleGlobalThemeChange);
    });
    (0,vue__WEBPACK_IMPORTED_MODULE_0__.onUnmounted)(function () {
      window.removeEventListener('mutqin:theme-change', handleGlobalThemeChange);
    });
    var comparisonValueClass = function comparisonValueClass(value) {
      if (value === true) return 'comparison-value comparison-value-included comparison-value-icon';
      if (value === false) return 'comparison-value comparison-value-excluded comparison-value-icon';
      return 'comparison-value comparison-value-limited';
    };
    var comparisonCell = function comparisonCell(value) {
      if (value === true) return {
        icon: 'bi-check-lg',
        label: ''
      };
      if (value === false) return {
        icon: 'bi-x-lg',
        label: ''
      };
      return {
        icon: '',
        label: String(value !== null && value !== void 0 ? value : '')
      };
    };
    var comparisonRows = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return [{
        id: 'savedSessions',
        feature: t('homepage.comparison.savedSessions'),
        free: '3',
        premium: '5',
        pro: t('homepage.comparison.unlimited')
      }, {
        id: 'focusMode',
        feature: t('homepage.comparison.focusMode'),
        free: true,
        premium: true,
        pro: true
      }, {
        id: 'blurMethod',
        feature: t('homepage.comparison.blurMethod'),
        free: false,
        premium: true,
        pro: true
      }, {
        id: 'chainingPractice',
        feature: t('homepage.comparison.chainingPractice'),
        free: false,
        premium: true,
        pro: true
      }, {
        id: 'aiRecitationReview',
        feature: t('homepage.comparison.aiRecitationReview'),
        free: false,
        premium: false,
        pro: true
      }, {
        id: 'offlineDownloads',
        feature: t('homepage.comparison.offlineDownloads'),
        free: false,
        premium: false,
        pro: true
      }];
    });
    var premiumDisplayPrice = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return billingCycle.value === 'annual' ? '1.50' : '2.99';
    });
    var proDisplayPrice = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return billingCycle.value === 'annual' ? '4.17' : '5.99';
    });
    var planCards = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      var isAnnual = billingCycle.value === 'annual';
      return [{
        id: 'free',
        name: t('homepage.free'),
        features: [t('homepage.planFeatures.savedSessions3'), t('homepage.planFeatures.basicAnalytics'), t('homepage.planFeatures.focusMode')],
        amount: '0',
        priceSuffix: '',
        billingNote: t('pricingPage.freeForever'),
        badge: '',
        badgeClass: '',
        featured: false,
        ctaType: 'link',
        ctaHref: startFreeHref.value,
        ctaLabel: t('homepage.start_free'),
        ctaClass: 'pricing-plan-cta--secondary'
      }, {
        id: 'premium',
        name: t('homepage.pricing.premium'),
        features: [t('homepage.planFeatures.savedSessions5'), t('homepage.planFeatures.blurringMethod'), t('homepage.planFeatures.chainingMethod'), t('homepage.planFeatures.manualSelfAssessment')],
        amount: premiumDisplayPrice.value,
        priceSuffix: t('homepage.pricing.perMonth'),
        billingNote: isAnnual ? t('pricingPage.billedAnnually', {
          amount: '17.99'
        }) : t('pricingPage.billedMonthly'),
        badge: isAnnual ? t('pricingPage.premiumDiscount') : t('homepage.most_useful'),
        badgeClass: isAnnual ? 'pricing-plan-badge--discount' : 'pricing-plan-badge--popular',
        featured: true,
        ctaType: 'form',
        checkoutPlan: isAnnual ? 'premium_yearly' : 'premium_monthly',
        ctaLabel: t('pricingPage.buyPremium'),
        ctaClass: 'pricing-plan-cta--primary'
      }, {
        id: 'pro',
        name: t('homepage.pro'),
        features: [t('homepage.planFeatures.savedSessionsUnlimited'), t('homepage.planFeatures.aiRecitation'), t('homepage.planFeatures.aiMemorisationChecker'), t('homepage.planFeatures.offlineDownloads')],
        amount: proDisplayPrice.value,
        priceSuffix: t('homepage.pricing.perMonth'),
        billingNote: isAnnual ? t('pricingPage.billedAnnually', {
          amount: '49.99'
        }) : t('pricingPage.billedMonthly'),
        badge: isAnnual ? t('pricingPage.proDiscount') : t('homepage.pricing.freeTrial'),
        badgeClass: isAnnual ? 'pricing-plan-badge--discount' : 'pricing-plan-badge--trial',
        featured: false,
        ctaType: 'form',
        checkoutPlan: isAnnual ? 'pro_yearly' : 'pro_monthly',
        ctaLabel: t('pricingPage.buyPro'),
        ctaClass: 'pricing-plan-cta--primary'
      }];
    });
    return {
      t: t,
      currentTheme: currentTheme,
      billingCycle: billingCycle,
      csrfToken: csrfToken,
      planCards: planCards,
      comparisonRows: comparisonRows,
      comparisonValueClass: comparisonValueClass,
      comparisonCell: comparisonCell
    };
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/PricingPage.vue?vue&type=template&id=376180a6":
/*!****************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/PricingPage.vue?vue&type=template&id=376180a6 ***!
  \****************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var _hoisted_1 = ["data-theme"];
var _hoisted_2 = {
  "class": "pricing-shell"
};
var _hoisted_3 = {
  "class": "pricing-hero"
};
var _hoisted_4 = {
  "class": "pricing-hero-subtitle"
};
var _hoisted_5 = {
  "class": "pricing-plans",
  "aria-label": "Plans"
};
var _hoisted_6 = {
  "class": "pricing-billing-wrap"
};
var _hoisted_7 = ["aria-label", "data-cycle"];
var _hoisted_8 = {
  "class": "pricing-billing-save"
};
var _hoisted_9 = {
  "class": "pricing-cards"
};
var _hoisted_10 = {
  "class": "pricing-plan-head"
};
var _hoisted_11 = {
  "class": "pricing-plan-price"
};
var _hoisted_12 = {
  "class": "pricing-plan-amount"
};
var _hoisted_13 = {
  key: 0,
  "class": "pricing-plan-period"
};
var _hoisted_14 = {
  key: 0,
  "class": "pricing-plan-billing-note"
};
var _hoisted_15 = {
  "class": "pricing-plan-features"
};
var _hoisted_16 = {
  "class": "pricing-plan-footer"
};
var _hoisted_17 = ["href"];
var _hoisted_18 = {
  key: 1,
  method: "POST",
  action: "/checkout"
};
var _hoisted_19 = ["value"];
var _hoisted_20 = ["value"];
var _hoisted_21 = {
  "class": "pricing-comparison",
  "aria-labelledby": "pricing-comparison-heading"
};
var _hoisted_22 = {
  id: "pricing-comparison-heading",
  "class": "pricing-section-title"
};
var _hoisted_23 = ["aria-label"];
var _hoisted_24 = {
  "class": "pricing-comparison-table"
};
var _hoisted_25 = {
  "class": "is-highlight"
};
var _hoisted_26 = {
  scope: "row"
};
var _hoisted_27 = {
  key: 1
};
var _hoisted_28 = {
  "class": "is-highlight"
};
var _hoisted_29 = {
  key: 1
};
var _hoisted_30 = {
  key: 1
};
var _hoisted_31 = ["aria-label"];
var _hoisted_32 = {
  "class": "pricing-comparison-card-feature"
};
var _hoisted_33 = {
  "class": "pricing-comparison-card-tiers"
};
var _hoisted_34 = {
  "class": "pricing-comparison-card-tier"
};
var _hoisted_35 = {
  key: 1
};
var _hoisted_36 = {
  "class": "pricing-comparison-card-tier is-highlight"
};
var _hoisted_37 = {
  key: 1
};
var _hoisted_38 = {
  "class": "pricing-comparison-card-tier"
};
var _hoisted_39 = {
  key: 1
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    "class": "pricing-page",
    "data-theme": $setup.currentTheme
  }, [_cache[5] || (_cache[5] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "pricing-bg",
    "aria-hidden": "true"
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "pricing-bg-orb pricing-bg-orb--one"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h1", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('pricingPage.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_4, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('pricingPage.subtitle')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_6, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "pricing-billing-toggle",
    role: "group",
    "aria-label": $setup.t('pricingPage.billingToggleLabel'),
    "data-cycle": $setup.billingCycle
  }, [_cache[2] || (_cache[2] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "pricing-billing-thumb",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-billing-option", {
      'is-active': $setup.billingCycle === 'monthly'
    }]),
    onClick: _cache[0] || (_cache[0] = function ($event) {
      return $setup.billingCycle = 'monthly';
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.monthly')), 3 /* TEXT, CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-billing-option", {
      'is-active': $setup.billingCycle === 'annual'
    }]),
    onClick: _cache[1] || (_cache[1] = function ($event) {
      return $setup.billingCycle = 'annual';
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.yearly')) + " ", 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_8, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('pricingPage.annualSavings')), 1 /* TEXT */)], 2 /* CLASS */)], 8 /* PROPS */, _hoisted_7)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_9, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.planCards, function (plan) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("article", {
      key: plan.id,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-plan-card", _defineProperty({
        'pricing-plan-card--featured': plan.featured
      }, "pricing-plan-card--".concat(plan.id), true)])
    }, [plan.badge ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-plan-badge", plan.badgeClass])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.badge), 3 /* TEXT, CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_10, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.name), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_11, [_cache[3] || (_cache[3] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": "pricing-plan-currency"
    }, "£", -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_12, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.amount), 1 /* TEXT */), plan.priceSuffix ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_13, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.priceSuffix), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), plan.billingNote ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_14, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.billingNote), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("ul", _hoisted_15, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)(plan.features, function (feature, idx) {
      return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
        key: "".concat(plan.id, "-").concat(idx)
      }, [_cache[4] || (_cache[4] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
        "class": "bi bi-check-lg",
        "aria-hidden": "true"
      }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(feature), 1 /* TEXT */)]);
    }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_16, [plan.ctaType === 'link' ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("a", {
      key: 0,
      href: plan.ctaHref,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-plan-cta", plan.ctaClass])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.ctaLabel), 11 /* TEXT, CLASS, PROPS */, _hoisted_17)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("form", _hoisted_18, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
      type: "hidden",
      name: "_token",
      value: $setup.csrfToken
    }, null, 8 /* PROPS */, _hoisted_19), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
      type: "hidden",
      name: "plan",
      value: plan.checkoutPlan
    }, null, 8 /* PROPS */, _hoisted_20), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "submit",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-plan-cta", plan.ctaClass])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.ctaLabel), 3 /* TEXT, CLASS */)]))])], 2 /* CLASS */);
  }), 128 /* KEYED_FRAGMENT */))])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_21, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_22, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.feature_comparison')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "pricing-comparison-table-wrap",
    role: "region",
    "aria-label": $setup.t('homepage.feature_comparison')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("table", _hoisted_24, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("thead", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("tr", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.featureColumn')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.free')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_25, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.premium')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pro')), 1 /* TEXT */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("tbody", null, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.comparisonRows, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("tr", {
      key: row.id
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_26, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.feature), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.comparisonValueClass(row.free))
    }, [$setup.comparisonCell(row.free).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.comparisonCell(row.free).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.comparisonCell(row.free).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_27, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.comparisonCell(row.free).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_28, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.comparisonValueClass(row.premium))
    }, [$setup.comparisonCell(row.premium).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.comparisonCell(row.premium).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.comparisonCell(row.premium).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_29, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.comparisonCell(row.premium).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.comparisonValueClass(row.pro))
    }, [$setup.comparisonCell(row.pro).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.comparisonCell(row.pro).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.comparisonCell(row.pro).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_30, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.comparisonCell(row.pro).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])]);
  }), 128 /* KEYED_FRAGMENT */))])])], 8 /* PROPS */, _hoisted_23), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "pricing-comparison-cards",
    role: "list",
    "aria-label": $setup.t('homepage.feature_comparison')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.comparisonRows, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("article", {
      key: "comparison-card-".concat(row.id),
      "class": "pricing-comparison-card",
      role: "listitem"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", _hoisted_32, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.feature), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dl", _hoisted_33, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_34, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.free')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.comparisonValueClass(row.free))
    }, [$setup.comparisonCell(row.free).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.comparisonCell(row.free).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.comparisonCell(row.free).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_35, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.comparisonCell(row.free).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_36, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.premium')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.comparisonValueClass(row.premium))
    }, [$setup.comparisonCell(row.premium).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.comparisonCell(row.premium).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.comparisonCell(row.premium).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_37, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.comparisonCell(row.premium).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_38, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pro')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.comparisonValueClass(row.pro))
    }, [$setup.comparisonCell(row.pro).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.comparisonCell(row.pro).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.comparisonCell(row.pro).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_39, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.comparisonCell(row.pro).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])])])]);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_31)])])], 8 /* PROPS */, _hoisted_1);
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

/***/ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css":
/*!**************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css ***!
  \**************************************************************************************************************************************************************************************************************************************************************/
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
___CSS_LOADER_EXPORT___.push([module.id, ".pricing-page {\n  --pricing-card-surface: color-mix(in srgb, var(--surface-strong) 94%, transparent);\n  --pricing-card-border: color-mix(in srgb, var(--accent) 10%, var(--border));\n  --pricing-comparison-even: color-mix(in srgb, var(--accent-light) 20%, transparent);\n  --pricing-highlight: color-mix(in srgb, var(--accent-light) 44%, transparent);\n  position: relative;\n  overflow: hidden;\n  padding: clamp(1.5rem, 3vw, 2.25rem) 0 clamp(2.5rem, 5vw, 3.5rem);\n}\n.pricing-bg {\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n}\n.pricing-bg-orb--one {\n  position: absolute;\n  width: min(480px, 70vw);\n  height: min(480px, 70vw);\n  top: -10%;\n  right: -15%;\n  border-radius: 50%;\n  background: radial-gradient(circle, color-mix(in srgb, var(--accent-light) 80%, transparent), transparent 68%);\n}\n.pricing-shell {\n  position: relative;\n  z-index: 1;\n  width: min(72rem, calc(100% - clamp(1.25rem, 4vw, 2rem)));\n  margin: 0 auto;\n  display: grid;\n  gap: clamp(2rem, 4vw, 3rem);\n}\n.pricing-section-title {\n  margin: 0 0 1rem;\n  text-align: center;\n  font-size: clamp(1.25rem, 2.5vw, 1.55rem);\n  letter-spacing: -0.02em;\n}\n\n/* Hero */\n.pricing-hero {\n  text-align: center;\n  max-width: 32rem;\n  margin: 0 auto;\n  display: grid;\n  gap: 0.5rem;\n}\n.pricing-hero h1 {\n  margin: 0;\n  font-size: clamp(1.75rem, 4vw, 2.35rem);\n  line-height: 1.15;\n  letter-spacing: -0.035em;\n  font-weight: 760;\n}\n.pricing-hero-subtitle {\n  margin: 0;\n  color: var(--text-muted);\n  font-size: 0.98rem;\n}\n\n/* Plans */\n.pricing-plans {\n  display: grid;\n  gap: 1.25rem;\n}\n.pricing-billing-wrap {\n  display: flex;\n  justify-content: center;\n}\n.pricing-billing-toggle {\n  position: relative;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  width: min(100%, 20rem);\n  padding: 0.25rem;\n  border-radius: 999px;\n  border: 1px solid var(--border);\n  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);\n}\n.pricing-billing-thumb {\n  position: absolute;\n  top: 0.25rem;\n  bottom: 0.25rem;\n  left: 0.25rem;\n  width: calc(50% - 0.25rem);\n  border-radius: 999px;\n  background: var(--surface-strong);\n  box-shadow: var(--shadow-sm);\n  transition: transform 0.25s ease;\n  pointer-events: none;\n}\n.pricing-billing-toggle[data-cycle='annual'] .pricing-billing-thumb {\n  transform: translateX(100%);\n}\n.pricing-billing-option {\n  position: relative;\n  z-index: 1;\n  border: 0;\n  background: transparent;\n  color: var(--text-muted);\n  font-weight: 650;\n  font-size: 0.85rem;\n  min-height: 2.4rem;\n  padding: 0.4rem 0.75rem;\n  border-radius: 999px;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.35rem;\n}\n.pricing-billing-option.is-active {\n  color: var(--text);\n}\n.pricing-billing-save {\n  font-size: 0.6rem;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--accent-strong);\n  background: var(--accent-light);\n  border-radius: 999px;\n  padding: 0.15rem 0.38rem;\n}\n\n/* Cards */\n.pricing-cards {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 0.85rem;\n  align-items: stretch;\n}\n.pricing-plan-card {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n  padding: 1.25rem 1.15rem 1.1rem;\n  border-radius: 20px;\n  border: 1px solid var(--pricing-card-border);\n  background: var(--pricing-card-surface);\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.pricing-plan-card--featured {\n  border: 2px solid var(--accent);\n  box-shadow: var(--shadow-sm);\n}\n.pricing-plan-badge {\n  position: absolute;\n  top: -0.6rem;\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 0.22rem 0.65rem;\n  border-radius: 999px;\n  font-size: 0.65rem;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  white-space: nowrap;\n}\n.pricing-plan-badge--discount,\n.pricing-plan-badge--popular {\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  color: var(--text-on-accent);\n}\n.pricing-plan-badge--trial {\n  background: var(--accent-light);\n  color: var(--accent-strong);\n  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));\n}\n.pricing-plan-head h2 {\n  margin: 0.15rem 0 0;\n  font-size: 1.2rem;\n  letter-spacing: -0.02em;\n}\n.pricing-plan-price {\n  display: flex;\n  align-items: baseline;\n  gap: 0.05rem;\n  margin-top: 0.55rem;\n  color: var(--accent);\n  line-height: 1;\n}\n.pricing-plan-currency {\n  font-size: 1.1rem;\n  font-weight: 700;\n}\n.pricing-plan-amount {\n  font-size: clamp(1.85rem, 3.5vw, 2.25rem);\n  font-weight: 800;\n  letter-spacing: -0.04em;\n}\n.pricing-plan-period {\n  margin-left: 0.15rem;\n  font-size: 0.85rem;\n  color: var(--text-muted);\n  font-weight: 600;\n}\n.pricing-plan-billing-note {\n  margin: 0.35rem 0 0;\n  color: var(--text-muted);\n  font-size: 0.78rem;\n}\n.pricing-plan-features {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  gap: 0.45rem;\n  flex: 1;\n}\n.pricing-plan-features li {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.45rem;\n  font-size: 0.84rem;\n  line-height: 1.4;\n  color: var(--text-muted);\n}\n.pricing-plan-features i {\n  color: var(--accent);\n  font-size: 0.82rem;\n  margin-top: 0.15rem;\n  flex-shrink: 0;\n}\n.pricing-plan-footer {\n  margin-top: auto;\n}\n.pricing-plan-footer form {\n  margin: 0;\n}\n.pricing-plan-cta {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  min-height: 2.75rem;\n  border-radius: 999px;\n  border: 1px solid transparent;\n  font-weight: 700;\n  font-size: 0.88rem;\n  text-decoration: none;\n  cursor: pointer;\n  transition: opacity 0.15s ease;\n}\n.pricing-plan-cta--primary {\n  background: linear-gradient(135deg, var(--accent), var(--accent-strong));\n  color: var(--text-on-accent);\n}\n.pricing-plan-cta--secondary {\n  background: transparent;\n  color: var(--text);\n  border-color: var(--border);\n}\n.pricing-plan-cta:hover {\n  opacity: 0.92;\n}\n\n/* Comparison */\n.pricing-comparison {\n  padding: 1.15rem;\n  border-radius: 20px;\n  border: 1px solid var(--border);\n  background: var(--pricing-card-surface);\n}\n.pricing-comparison-table-wrap {\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n  border: 1px solid var(--border);\n  border-radius: 14px;\n}\n.pricing-comparison-table {\n  width: 100%;\n  border-collapse: collapse;\n  min-width: 560px;\n}\n.pricing-comparison-table thead th {\n  padding: 0.75rem 0.85rem;\n  font-size: 0.72rem;\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n  color: var(--text-muted);\n  border-bottom: 1px solid var(--border);\n  text-align: center;\n}\n.pricing-comparison-table thead th:first-child {\n  text-align: left;\n}\n.pricing-comparison-table thead th.is-highlight {\n  background: var(--pricing-highlight);\n  color: var(--accent-strong);\n}\n.pricing-comparison-table tbody th,\n.pricing-comparison-table tbody td {\n  padding: 0.72rem 0.85rem;\n  border-bottom: 1px solid var(--border);\n  vertical-align: middle;\n}\n.pricing-comparison-table tbody th {\n  font-weight: 600;\n  font-size: 0.86rem;\n  text-align: left;\n  width: 42%;\n}\n.pricing-comparison-table tbody td {\n  text-align: center;\n}\n.pricing-comparison-table tbody td.is-highlight {\n  background: color-mix(in srgb, var(--pricing-highlight) 50%, transparent);\n}\n.pricing-comparison-table tbody tr:nth-child(even) {\n  background: var(--pricing-comparison-even);\n}\n.pricing-comparison-table tbody tr:nth-child(even) td.is-highlight {\n  background: color-mix(in srgb, var(--pricing-highlight) 65%, var(--pricing-comparison-even));\n}\n.comparison-value {\n  min-width: 2.2rem;\n  min-height: 28px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.3rem;\n  border-radius: 999px;\n  padding: 0.28rem 0.55rem;\n  border: 1px solid var(--border);\n  font-size: 0.78rem;\n  font-weight: 700;\n}\n.comparison-value-included {\n  color: var(--accent-strong);\n  background: var(--accent-light);\n  border-color: transparent;\n}\n.comparison-value-excluded {\n  color: var(--danger-text);\n  background: var(--danger-bg);\n  border-color: transparent;\n}\n.comparison-value-limited {\n  color: var(--text);\n  background: var(--surface-strong);\n}\n.comparison-value-icon {\n  min-width: 2.2rem;\n  padding-inline: 0.5rem;\n}\n.pricing-comparison-cards {\n  display: none;\n  gap: 0.65rem;\n}\n.pricing-comparison-card {\n  padding: 0.85rem;\n  border-radius: 14px;\n  border: 1px solid var(--border);\n}\n.pricing-comparison-card-feature {\n  margin: 0 0 0.65rem;\n  font-size: 0.9rem;\n}\n.pricing-comparison-card-tiers {\n  display: grid;\n  gap: 0.5rem;\n  margin: 0;\n}\n.pricing-comparison-card-tier {\n  display: grid;\n  grid-template-columns: 5rem 1fr;\n  align-items: center;\n  gap: 0.5rem;\n}\n.pricing-comparison-card-tier.is-highlight {\n  padding: 0.45rem 0.55rem;\n  margin: -0.45rem -0.55rem;\n  border-radius: 10px;\n  background: var(--pricing-highlight);\n}\n.pricing-comparison-card-tier dt {\n  margin: 0;\n  font-size: 0.68rem;\n  font-weight: 700;\n  text-transform: uppercase;\n  color: var(--text-muted);\n}\n.pricing-comparison-card-tier dd {\n  margin: 0;\n}\n\n/* Responsive */\n@media (max-width: 991px) {\n.pricing-cards {\n    grid-template-columns: 1fr;\n    max-width: 22rem;\n    margin-inline: auto;\n}\n.pricing-plan-card--featured {\n    order: -1;\n}\n}\n@media (max-width: 767px) {\n.pricing-comparison-table-wrap {\n    display: none;\n}\n.pricing-comparison-cards {\n    display: grid;\n}\n.pricing-comparison {\n    padding: 0.85rem;\n}\n}\n@media (max-width: 480px) {\n.pricing-comparison-card-tier {\n    grid-template-columns: 1fr;\n    gap: 0.25rem;\n}\n}\n\n/* Dark theme */\n.pricing-page[data-theme='dark'] .pricing-plan-card,\n.pricing-page[data-theme='dark'] .pricing-comparison {\n  background: color-mix(in srgb, var(--surface-strong) 92%, transparent);\n  border-color: color-mix(in srgb, var(--accent) 14%, var(--border));\n}\n.pricing-page[data-theme='dark'] .pricing-hero-subtitle,\n.pricing-page[data-theme='dark'] .pricing-plan-billing-note,\n.pricing-page[data-theme='dark'] .pricing-plan-features li {\n  color: color-mix(in srgb, var(--text-muted) 88%, var(--text));\n}\n", ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_PricingPage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/vue-loader/dist/stylePostLoader.js!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./PricingPage.css?vue&type=style&index=0&lang=css */ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_PricingPage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_1__["default"], options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_PricingPage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_1__["default"].locals || {});

/***/ }),

/***/ "./resources/js/views/PricingPage.vue":
/*!********************************************!*\
  !*** ./resources/js/views/PricingPage.vue ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _PricingPage_vue_vue_type_template_id_376180a6__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./PricingPage.vue?vue&type=template&id=376180a6 */ "./resources/js/views/PricingPage.vue?vue&type=template&id=376180a6");
/* harmony import */ var _PricingPage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./PricingPage.vue?vue&type=script&lang=js */ "./resources/js/views/PricingPage.vue?vue&type=script&lang=js");
/* harmony import */ var _PricingPage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./PricingPage.css?vue&type=style&index=0&lang=css */ "./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;


const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__["default"])(_PricingPage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_PricingPage_vue_vue_type_template_id_376180a6__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/views/PricingPage.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/views/PricingPage.vue?vue&type=script&lang=js":
/*!********************************************************************!*\
  !*** ./resources/js/views/PricingPage.vue?vue&type=script&lang=js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_PricingPage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_PricingPage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./PricingPage.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/PricingPage.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/views/PricingPage.vue?vue&type=template&id=376180a6":
/*!**************************************************************************!*\
  !*** ./resources/js/views/PricingPage.vue?vue&type=template&id=376180a6 ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_PricingPage_vue_vue_type_template_id_376180a6__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_PricingPage_vue_vue_type_template_id_376180a6__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./PricingPage.vue?vue&type=template&id=376180a6 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/PricingPage.vue?vue&type=template&id=376180a6");


/***/ }),

/***/ "./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css":
/*!****************************************************************************!*\
  !*** ./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_style_loader_dist_cjs_js_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_PricingPage_css_vue_type_style_index_0_lang_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/style-loader/dist/cjs.js!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/vue-loader/dist/stylePostLoader.js!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./PricingPage.css?vue&type=style&index=0&lang=css */ "./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/PricingPage.css?vue&type=style&index=0&lang=css");


/***/ })

}]);