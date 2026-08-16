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
    var billingCycle = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)('annual');
    var csrfToken = (0,vue__WEBPACK_IMPORTED_MODULE_0__.ref)(((_document$querySelect = document.querySelector('meta[name="csrf-token"]')) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.getAttribute('content')) || '');
    var startFreeHref = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return window.mutqinAuthCheck ? '/memorisation' : '/register';
    });
    (0,vue__WEBPACK_IMPORTED_MODULE_0__.onMounted)(function () {
      (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.setGlobalTheme)((0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)(), {
        dispatchEvent: false
      });
      window.addEventListener('mutqin:theme-change', handleThemeChange);
    });
    (0,vue__WEBPACK_IMPORTED_MODULE_0__.onUnmounted)(function () {
      window.removeEventListener('mutqin:theme-change', handleThemeChange);
    });
    function handleThemeChange() {
      (0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.setGlobalTheme)((0,_utils_theme__WEBPACK_IMPORTED_MODULE_1__.getSavedTheme)(), {
        dispatchEvent: false
      });
    }
    var valClass = function valClass(value) {
      if (value === true) return 'pricing-val pricing-val--yes pricing-val--icon';
      if (value === false) return 'pricing-val pricing-val--no pricing-val--icon';
      return 'pricing-val pricing-val--text';
    };
    var valCell = function valCell(value) {
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
    var premiumPrice = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return billingCycle.value === 'annual' ? '1.50' : '2.99';
    });
    var proPrice = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      return billingCycle.value === 'annual' ? '4.17' : '5.99';
    });
    var plans = (0,vue__WEBPACK_IMPORTED_MODULE_0__.computed)(function () {
      var annual = billingCycle.value === 'annual';
      return [{
        id: 'free',
        name: t('homepage.free'),
        amount: '0',
        period: '',
        note: t('pricingPage.freeForever'),
        badge: '',
        badgeClass: '',
        features: [t('homepage.planFeatures.savedSessions3'), t('homepage.planFeatures.basicAnalytics'), t('homepage.planFeatures.focusMode')],
        featured: false,
        ctaType: 'link',
        ctaHref: startFreeHref.value,
        ctaLabel: t('homepage.start_free'),
        ctaClass: 'pricing-btn--secondary'
      }, {
        id: 'premium',
        name: t('homepage.pricing.premium'),
        amount: premiumPrice.value,
        period: t('homepage.pricing.perMonth'),
        note: annual ? t('pricingPage.billedAnnually', {
          amount: '17.99'
        }) : t('pricingPage.billedMonthly'),
        badge: annual ? t('pricingPage.premiumDiscount') : t('homepage.most_useful'),
        badgeClass: 'pricing-badge--accent',
        features: [t('homepage.planFeatures.savedSessions5'), t('homepage.planFeatures.blurringMethod'), t('homepage.planFeatures.chainingMethod'), t('homepage.planFeatures.manualSelfAssessment')],
        featured: true,
        ctaType: 'form',
        checkoutPlan: annual ? 'premium_yearly' : 'premium_monthly',
        ctaLabel: t('pricingPage.buyPremium'),
        ctaClass: 'pricing-btn--primary'
      }, {
        id: 'pro',
        name: t('homepage.pro'),
        amount: proPrice.value,
        period: t('homepage.pricing.perMonth'),
        note: annual ? t('pricingPage.billedAnnually', {
          amount: '49.99'
        }) : t('pricingPage.billedMonthly'),
        badge: annual ? t('pricingPage.proDiscount') : t('pricingPage.trialBadge'),
        badgeClass: annual ? 'pricing-badge--accent' : 'pricing-badge--soft',
        features: [t('homepage.planFeatures.savedSessionsUnlimited'), t('homepage.planFeatures.aiRecitation'), t('homepage.planFeatures.aiMemorisationChecker'), t('homepage.planFeatures.offlineDownloads')],
        featured: false,
        ctaType: 'form',
        checkoutPlan: annual ? 'pro_yearly' : 'pro_monthly',
        ctaLabel: t('pricingPage.buyPro'),
        ctaClass: 'pricing-btn--primary'
      }];
    });
    return {
      t: t,
      billingCycle: billingCycle,
      csrfToken: csrfToken,
      plans: plans,
      comparisonRows: comparisonRows,
      valClass: valClass,
      valCell: valCell
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

var _hoisted_1 = {
  "class": "pricing-page"
};
var _hoisted_2 = {
  "class": "pricing-shell"
};
var _hoisted_3 = {
  "class": "pricing-hero"
};
var _hoisted_4 = {
  "class": "pricing-billing"
};
var _hoisted_5 = ["aria-label", "data-cycle"];
var _hoisted_6 = {
  "class": "pricing-billing-save"
};
var _hoisted_7 = {
  "class": "pricing-grid"
};
var _hoisted_8 = {
  "class": "pricing-card-head"
};
var _hoisted_9 = {
  "class": "pricing-card-title"
};
var _hoisted_10 = {
  "class": "pricing-price"
};
var _hoisted_11 = {
  "class": "pricing-price-amount"
};
var _hoisted_12 = {
  key: 0,
  "class": "pricing-price-period"
};
var _hoisted_13 = {
  key: 0,
  "class": "pricing-price-note"
};
var _hoisted_14 = {
  "class": "pricing-features"
};
var _hoisted_15 = {
  "class": "pricing-card-action"
};
var _hoisted_16 = ["href"];
var _hoisted_17 = {
  key: 1,
  method: "POST",
  action: "/checkout"
};
var _hoisted_18 = ["value"];
var _hoisted_19 = ["value"];
var _hoisted_20 = {
  "class": "pricing-compare",
  "aria-labelledby": "pricing-compare-heading"
};
var _hoisted_21 = {
  id: "pricing-compare-heading"
};
var _hoisted_22 = {
  "class": "pricing-table-wrap"
};
var _hoisted_23 = {
  "class": "pricing-table"
};
var _hoisted_24 = {
  "class": "col-premium"
};
var _hoisted_25 = {
  scope: "row"
};
var _hoisted_26 = {
  key: 1
};
var _hoisted_27 = {
  "class": "col-premium"
};
var _hoisted_28 = {
  key: 1
};
var _hoisted_29 = {
  key: 1
};
var _hoisted_30 = {
  "class": "pricing-compare-mobile"
};
var _hoisted_31 = {
  "class": "pricing-compare-mobile-head",
  "aria-hidden": "true"
};
var _hoisted_32 = {
  "class": "is-premium"
};
var _hoisted_33 = {
  "class": "pricing-compare-cells"
};
var _hoisted_34 = {
  "class": "pricing-compare-cell"
};
var _hoisted_35 = {
  key: 1
};
var _hoisted_36 = {
  "class": "pricing-compare-cell is-premium"
};
var _hoisted_37 = {
  key: 1
};
var _hoisted_38 = {
  "class": "pricing-compare-cell"
};
var _hoisted_39 = {
  key: 1
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_1, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h1", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('pricingPage.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('pricingPage.subtitle')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "pricing-billing-toggle",
    role: "group",
    "aria-label": $setup.t('pricingPage.billingToggleLabel'),
    "data-cycle": $setup.billingCycle
  }, [_cache[2] || (_cache[2] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": "pricing-billing-thumb",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)({
      'is-active': $setup.billingCycle === 'monthly'
    }),
    onClick: _cache[0] || (_cache[0] = function ($event) {
      return $setup.billingCycle = 'monthly';
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.monthly')), 3 /* TEXT, CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)({
      'is-active': $setup.billingCycle === 'annual'
    }),
    onClick: _cache[1] || (_cache[1] = function ($event) {
      return $setup.billingCycle = 'annual';
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.yearly')) + " ", 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_6, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('pricingPage.annualSavings')), 1 /* TEXT */)], 2 /* CLASS */)], 8 /* PROPS */, _hoisted_5)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_7, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.plans, function (plan) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("article", {
      key: plan.id,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-card", {
        'pricing-card--featured': plan.featured
      }])
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_8, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_9, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.name), 1 /* TEXT */), plan.badge ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-badge", plan.badgeClass])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.badge), 3 /* TEXT, CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_10, [_cache[3] || (_cache[3] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": "pricing-price-currency"
    }, "£", -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_11, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.amount), 1 /* TEXT */), plan.period ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_12, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.period), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), plan.note ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_13, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.note), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("ul", _hoisted_14, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)(plan.features, function (feature, idx) {
      return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
        key: "".concat(plan.id, "-").concat(idx)
      }, [_cache[4] || (_cache[4] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
        "class": "bi bi-check-lg",
        "aria-hidden": "true"
      }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(feature), 1 /* TEXT */)]);
    }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_15, [plan.ctaType === 'link' ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("a", {
      key: 0,
      href: plan.ctaHref,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-btn", plan.ctaClass])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.ctaLabel), 11 /* TEXT, CLASS, PROPS */, _hoisted_16)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("form", _hoisted_17, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
      type: "hidden",
      name: "_token",
      value: $setup.csrfToken
    }, null, 8 /* PROPS */, _hoisted_18), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
      type: "hidden",
      name: "plan",
      value: plan.checkoutPlan
    }, null, 8 /* PROPS */, _hoisted_19), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "submit",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["pricing-btn", plan.ctaClass])
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(plan.ctaLabel), 3 /* TEXT, CLASS */)]))])], 2 /* CLASS */);
  }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_20, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_21, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.feature_comparison')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_22, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("table", _hoisted_23, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("thead", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("tr", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.featureColumn')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.free')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_24, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.premium')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pro')), 1 /* TEXT */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("tbody", null, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.comparisonRows, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("tr", {
      key: row.id
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_25, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.feature), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.valClass(row.free))
    }, [$setup.valCell(row.free).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.valCell(row.free).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.valCell(row.free).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_26, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.valCell(row.free).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_27, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.valClass(row.premium))
    }, [$setup.valCell(row.premium).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.valCell(row.premium).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.valCell(row.premium).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_28, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.valCell(row.premium).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.valClass(row.pro))
    }, [$setup.valCell(row.pro).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.valCell(row.pro).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.valCell(row.pro).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_29, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.valCell(row.pro).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])]);
  }), 128 /* KEYED_FRAGMENT */))])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_30, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_31, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.free')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_32, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pricing.premium')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.t('homepage.pro')), 1 /* TEXT */)]), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($setup.comparisonRows, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: "m-".concat(row.id),
      "class": "pricing-compare-row"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.feature), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_33, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_34, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.valClass(row.free))
    }, [$setup.valCell(row.free).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.valCell(row.free).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.valCell(row.free).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_35, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.valCell(row.free).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_36, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.valClass(row.premium))
    }, [$setup.valCell(row.premium).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.valCell(row.premium).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.valCell(row.premium).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_37, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.valCell(row.premium).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_38, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($setup.valClass(row.pro))
    }, [$setup.valCell(row.pro).icon ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("i", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $setup.valCell(row.pro).icon]),
      "aria-hidden": "true"
    }, null, 2 /* CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $setup.valCell(row.pro).label ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_39, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($setup.valCell(row.pro).label), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])])]);
  }), 128 /* KEYED_FRAGMENT */))])])])]);
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
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;
const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_PricingPage_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_PricingPage_vue_vue_type_template_id_376180a6__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/views/PricingPage.vue"]])
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


/***/ })

}]);