"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["dashboard"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Dashboard.vue?vue&type=script&lang=js":
/*!**********************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Dashboard.vue?vue&type=script&lang=js ***!
  \**********************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scripts/api/learning */ "./resources/js/scripts/api/learning.js");
/* harmony import */ var _Dashboard_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Dashboard.css */ "./resources/js/views/Dashboard.css");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'UserDashboard',
  props: {
    auth: {
      type: Object,
      "default": function _default() {
        return {};
      }
    },
    initialData: {
      type: Object,
      "default": null
    }
  },
  data: function data() {
    var initial = this.sanitizePayload(this.initialData);
    return {
      data: initial,
      loading: !initial,
      error: false
    };
  },
  computed: {
    memorisationUrl: function memorisationUrl() {
      var _this$auth;
      return ((_this$auth = this.auth) === null || _this$auth === void 0 ? void 0 : _this$auth.memorisation_url) || '/memorisation';
    },
    ownerId: function ownerId() {
      var _this$auth2;
      return Number(((_this$auth2 = this.auth) === null || _this$auth2 === void 0 ? void 0 : _this$auth2.id) || 0);
    },
    greetingText: function greetingText() {
      var _this$data, _this$auth3, _this$auth4;
      var name = ((_this$data = this.data) === null || _this$data === void 0 || (_this$data = _this$data.welcome) === null || _this$data === void 0 ? void 0 : _this$data.first_name) || ((_this$auth3 = this.auth) === null || _this$auth3 === void 0 ? void 0 : _this$auth3.first_name) || String(((_this$auth4 = this.auth) === null || _this$auth4 === void 0 ? void 0 : _this$auth4.name) || '').split(/\s+/)[0] || this.t('dashboard.dear_friend');
      return this.t('dashboard.greeting', {
        name: name
      });
    },
    continueMessage: function continueMessage() {
      var _this$data2, _this$data3;
      var key = (_this$data2 = this.data) === null || _this$data2 === void 0 || (_this$data2 = _this$data2["continue"]) === null || _this$data2 === void 0 ? void 0 : _this$data2.message_key;
      if (key) {
        var translated = this.t("dashboard.".concat(key));
        if (translated && translated !== "dashboard.".concat(key)) return translated;
      }
      return ((_this$data3 = this.data) === null || _this$data3 === void 0 || (_this$data3 = _this$data3["continue"]) === null || _this$data3 === void 0 ? void 0 : _this$data3.message) || this.t('dashboard.msg_start_new');
    },
    continueCta: function continueCta() {
      var _this$data4, _this$data5;
      var key = (_this$data4 = this.data) === null || _this$data4 === void 0 || (_this$data4 = _this$data4["continue"]) === null || _this$data4 === void 0 ? void 0 : _this$data4.cta_key;
      if (key) {
        var translated = this.t("dashboard.".concat(key));
        if (translated && translated !== "dashboard.".concat(key)) return translated;
      }
      return ((_this$data5 = this.data) === null || _this$data5 === void 0 || (_this$data5 = _this$data5["continue"]) === null || _this$data5 === void 0 ? void 0 : _this$data5.cta_label) || this.t('dashboard.cta_start');
    },
    simpleStats: function simpleStats() {
      var _this$data6, _this$data7, _snap$memorised_ayahs, _snap$memorised_ayahs2, _snap$completed_sessi, _snap$completed_sessi2;
      var snap = ((_this$data6 = this.data) === null || _this$data6 === void 0 ? void 0 : _this$data6.snapshot) || {};
      var streak = Number(((_this$data7 = this.data) === null || _this$data7 === void 0 || (_this$data7 = _this$data7.retention) === null || _this$data7 === void 0 ? void 0 : _this$data7.streak_days) || 0);
      return [{
        key: 'memorised',
        value: Number((_snap$memorised_ayahs = (_snap$memorised_ayahs2 = snap.memorised_ayahs) === null || _snap$memorised_ayahs2 === void 0 ? void 0 : _snap$memorised_ayahs2.value) !== null && _snap$memorised_ayahs !== void 0 ? _snap$memorised_ayahs : 0),
        label: this.t('dashboard.stat_ayahs_kept')
      }, {
        key: 'sessions',
        value: Number((_snap$completed_sessi = (_snap$completed_sessi2 = snap.completed_sessions) === null || _snap$completed_sessi2 === void 0 ? void 0 : _snap$completed_sessi2.value) !== null && _snap$completed_sessi !== void 0 ? _snap$completed_sessi : 0),
        label: this.t('dashboard.stat_sittings')
      }, {
        key: 'streak',
        value: streak,
        label: this.t('dashboard.stat_days')
      }];
    },
    todayItems: function todayItems() {
      var _this$data8,
        _this = this,
        _this$data9;
      var items = [];
      var weaknesses = ((_this$data8 = this.data) === null || _this$data8 === void 0 || (_this$data8 = _this$data8.weaknesses) === null || _this$data8 === void 0 ? void 0 : _this$data8.items) || [];
      weaknesses.slice(0, 3).forEach(function (item, index) {
        items.push({
          key: "review-".concat(item.key || index),
          kindLabel: _this.t('dashboard.kind_review'),
          title: "".concat(item.surah_name, " \xB7 ").concat(_this.t('dashboard.ayah_n', {
            n: item.ayah_number
          })),
          detail: _this.weakExplain(item),
          when: _this.formatRelative(item.detected_at),
          whenIso: item.detected_at,
          href: item.href || _this.memorisationUrl,
          actionLabel: _this.t('dashboard.action_review')
        });
      });
      var activity = ((_this$data9 = this.data) === null || _this$data9 === void 0 ? void 0 : _this$data9.activity) || [];
      activity.slice(0, 3).forEach(function (item, index) {
        items.push({
          key: "activity-".concat(item.type || 'step', "-").concat(item.occurred_at || index),
          kindLabel: _this.t('dashboard.kind_recent'),
          title: item.title,
          detail: item.context || '',
          when: _this.formatAbsolute(item.occurred_at),
          whenIso: item.occurred_at,
          href: item.href || _this.memorisationUrl,
          actionLabel: _this.t('dashboard.open')
        });
      });
      return items.slice(0, 6);
    }
  },
  mounted: function mounted() {
    if (!this.data) {
      this.fetchDashboard();
    } else {
      this.fetchDashboard({
        quiet: true
      });
    }
  },
  methods: {
    sanitizePayload: function sanitizePayload(payload) {
      var _payload$meta;
      if (!payload || _typeof(payload) !== 'object') return null;
      var ownerId = Number((payload === null || payload === void 0 || (_payload$meta = payload.meta) === null || _payload$meta === void 0 ? void 0 : _payload$meta.owner_id) || 0);
      if (this.ownerId && ownerId && ownerId !== this.ownerId) {
        return null;
      }
      return payload;
    },
    weakExplain: function weakExplain(item) {
      var key = item === null || item === void 0 ? void 0 : item.explanation_key;
      if (key) {
        var translated = this.t("dashboard.".concat(key));
        if (translated && translated !== "dashboard.".concat(key)) return translated;
      }
      return (item === null || item === void 0 ? void 0 : item.explanation) || '';
    },
    ayahRangeLabel: function ayahRangeLabel(row) {
      if (!row) return '';
      var start = Number(row.ayah_start || 0);
      var end = Number(row.ayah_end || 0);
      if (start > 0 && end > 0) {
        return start === end ? this.t('dashboard.ayah_n', {
          n: start
        }) : this.t('dashboard.ayah_range', {
          start: start,
          end: end
        });
      }
      return '';
    },
    formatRelative: function formatRelative(value) {
      if (!value) return '';
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      var minutes = Math.round((Date.now() - date.getTime()) / 60000);
      if (minutes < 1) return this.t('dashboard.just_now');
      if (minutes < 60) return this.t('dashboard.minutes_ago', {
        n: minutes
      });
      var hours = Math.round(minutes / 60);
      if (hours < 24) return this.t('dashboard.hours_ago', {
        n: hours
      });
      var days = Math.round(hours / 24);
      if (days === 1) return this.t('dashboard.yesterday');
      if (days < 7) return this.t('dashboard.days_ago', {
        n: days
      });
      return this.formatAbsolute(value);
    },
    formatAbsolute: function formatAbsolute(value) {
      if (!value) return '';
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      var now = new Date();
      var yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      var time = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
      if (date.toDateString() === now.toDateString()) return this.t('dashboard.today_at', {
        time: time
      });
      if (date.toDateString() === yesterday.toDateString()) return this.t('dashboard.yesterday_at', {
        time: time
      });
      return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    reload: function reload() {
      this.fetchDashboard();
    },
    fetchDashboard: function fetchDashboard() {
      var _arguments = arguments,
        _this2 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var _ref, _ref$quiet, quiet, payload, _t, _t2;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              _ref = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : {}, _ref$quiet = _ref.quiet, quiet = _ref$quiet === void 0 ? false : _ref$quiet;
              if (!quiet) {
                _this2.loading = true;
              }
              _this2.error = false;
              _context.p = 1;
              _t = _this2;
              _context.n = 2;
              return _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__.learningApi.getDashboard(30);
            case 2:
              payload = _t.sanitizePayload.call(_t, _context.v);
              if (payload) {
                _context.n = 3;
                break;
              }
              throw new Error('Dashboard ownership check failed');
            case 3:
              _this2.data = payload;
              _context.n = 5;
              break;
            case 4:
              _context.p = 4;
              _t2 = _context.v;
              console.error('Dashboard load failed', _t2);
              _this2.error = !_this2.data;
            case 5:
              _context.p = 5;
              _this2.loading = false;
              return _context.f(5);
            case 6:
              return _context.a(2);
          }
        }, _callee, null, [[1, 4, 5, 6]]);
      }))();
    }
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Dashboard.vue?vue&type=template&id=1f79daf6":
/*!**************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Dashboard.vue?vue&type=template&id=1f79daf6 ***!
  \**************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");

var _hoisted_1 = {
  id: "mainContent",
  "class": "shell user-dashboard",
  tabindex: "-1"
};
var _hoisted_2 = {
  "class": "dash-stage"
};
var _hoisted_3 = {
  key: 0,
  "class": "dash-state",
  role: "status",
  "aria-live": "polite"
};
var _hoisted_4 = {
  key: 1,
  "class": "dash-state dash-state--error",
  role: "alert"
};
var _hoisted_5 = {
  "class": "dash-hero",
  "aria-labelledby": "dash-welcome-heading"
};
var _hoisted_6 = {
  "class": "dash-hero-copy"
};
var _hoisted_7 = {
  "class": "dash-kicker"
};
var _hoisted_8 = {
  id: "dash-welcome-heading"
};
var _hoisted_9 = ["aria-label"];
var _hoisted_10 = {
  "class": "dash-kicker dash-kicker--soft"
};
var _hoisted_11 = {
  "class": "dash-hero-action__title"
};
var _hoisted_12 = {
  "class": "dash-hero-action__message"
};
var _hoisted_13 = {
  key: 0,
  "class": "dash-hero-action__meta"
};
var _hoisted_14 = ["href"];
var _hoisted_15 = ["aria-label"];
var _hoisted_16 = {
  "class": "dash-today",
  "aria-labelledby": "dash-today-heading"
};
var _hoisted_17 = {
  "class": "dash-today__head"
};
var _hoisted_18 = {
  id: "dash-today-heading"
};
var _hoisted_19 = {
  key: 0,
  "class": "dash-empty"
};
var _hoisted_20 = ["href"];
var _hoisted_21 = {
  key: 1,
  "class": "dash-today-list"
};
var _hoisted_22 = {
  "class": "dash-today-item__copy"
};
var _hoisted_23 = {
  "class": "dash-today-item__kind"
};
var _hoisted_24 = {
  key: 0
};
var _hoisted_25 = ["datetime"];
var _hoisted_26 = ["href"];
function render(_ctx, _cache, $props, $setup, $data, $options) {
  var _$data$data$continue, _$data$data$continue2, _$data$data$continue3;
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("main", _hoisted_1, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [$data.loading && !$data.data ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.loading')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.loading_hint')), 1 /* TEXT */)])) : $data.error && !$data.data ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.load_error')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.load_error_hint')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "dash-primary-btn",
    onClick: _cache[0] || (_cache[0] = function () {
      return $options.reload && $options.reload.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.retry')), 1 /* TEXT */)])) : $data.data ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 2
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 1. Welcome + one next action "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_6, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_7, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.kicker')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h1", _hoisted_8, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.greetingText), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.supporting_message')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("aside", {
    "class": "dash-hero-action",
    "aria-label": _ctx.t('dashboard.next_step')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_10, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.next_step')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", _hoisted_11, [(_$data$data$continue = $data.data["continue"]) !== null && _$data$data$continue !== void 0 && _$data$data$continue.surah_name ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 0
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.data["continue"].surah_name) + " ", 1 /* TEXT */), $options.ayahRangeLabel($data.data["continue"]) ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 0
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)(" · " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.ayahRangeLabel($data.data["continue"])), 1 /* TEXT */)], 64 /* STABLE_FRAGMENT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 64 /* STABLE_FRAGMENT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 1
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.continueCta), 1 /* TEXT */)], 64 /* STABLE_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_12, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.continueMessage), 1 /* TEXT */), (_$data$data$continue2 = $data.data["continue"]) !== null && _$data$data$continue2 !== void 0 && _$data$data$continue2.last_ayah ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_13, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.last_ayah', {
    n: $data.data["continue"].last_ayah
  })), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
    "class": "dash-primary-btn",
    href: ((_$data$data$continue3 = $data.data["continue"]) === null || _$data$data$continue3 === void 0 ? void 0 : _$data$data$continue3.href) || $options.memorisationUrl
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.continueCta), 9 /* TEXT, PROPS */, _hoisted_14)], 8 /* PROPS */, _hoisted_9)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 2. Three plain numbers "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", {
    "class": "dash-stats",
    "aria-label": _ctx.t('dashboard.snapshot_title')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.simpleStats, function (stat) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: stat.key,
      "class": "dash-stat"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(stat.value), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(stat.label), 1 /* TEXT */)]);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_15), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" 3. Today: review + recent steps "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_16, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_17, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_18, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.today_title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.today_subtitle')), 1 /* TEXT */)]), !$options.todayItems.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_19, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.today_empty_title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.today_empty_message')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
    "class": "dash-secondary-btn",
    href: $options.memorisationUrl
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('dashboard.start_session')), 9 /* TEXT, PROPS */, _hoisted_20)])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_21, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.todayItems, function (item) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: item.key,
      "class": "dash-today-item"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_22, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_23, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.kindLabel), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.title), 1 /* TEXT */), item.detail ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_24, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.detail), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), item.when ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("time", {
      key: 1,
      datetime: item.whenIso
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.when), 9 /* TEXT, PROPS */, _hoisted_25)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), item.href ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("a", {
      key: 0,
      "class": "dash-text-link",
      href: item.href
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.actionLabel), 9 /* TEXT, PROPS */, _hoisted_26)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]);
  }), 128 /* KEYED_FRAGMENT */))]))])], 64 /* STABLE_FRAGMENT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])]);
}

/***/ }),

/***/ "./resources/js/scripts/api/learning.js":
/*!**********************************************!*\
  !*** ./resources/js/scripts/api/learning.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createDebouncer: () => (/* binding */ createDebouncer),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   learningApi: () => (/* binding */ learningApi),
/* harmony export */   withRetry: () => (/* binding */ withRetry)
/* harmony export */ });
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ "./node_modules/axios/lib/axios.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }


/**
 * Backend-driven learning persistence client.
 *
 * Wraps the Sanctum-protected /api endpoints that replace localStorage as the
 * source of truth for authenticated users. Includes small debounce + retry
 * helpers so the UI never blocks on the network and autosaves are not spammy.
 */

function readCsrfToken() {
  var _document$head;
  var meta = typeof document !== 'undefined' ? (_document$head = document.head) === null || _document$head === void 0 ? void 0 : _document$head.querySelector('meta[name="csrf-token"]') : null;
  return (meta === null || meta === void 0 ? void 0 : meta.content) || '';
}
function readXsrfCookie() {
  if (typeof document === 'undefined') return '';
  var match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  if (!(match !== null && match !== void 0 && match[1])) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch (_) {
    return match[1];
  }
}
function syncCsrfHeaders() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var headers = _objectSpread({}, config.headers || {});
  var meta = readCsrfToken();
  var xsrf = readXsrfCookie();
  if (meta) headers['X-CSRF-TOKEN'] = meta;
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
  return _objectSpread(_objectSpread({}, config), {}, {
    headers: headers
  });
}
var csrfCookiePromise = null;
function ensureCsrfCookie() {
  return _ensureCsrfCookie.apply(this, arguments);
}
function _ensureCsrfCookie() {
  _ensureCsrfCookie = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee37() {
    var _ref5,
      _ref5$force,
      force,
      _args37 = arguments;
    return _regenerator().w(function (_context37) {
      while (1) switch (_context37.n) {
        case 0:
          _ref5 = _args37.length > 0 && _args37[0] !== undefined ? _args37[0] : {}, _ref5$force = _ref5.force, force = _ref5$force === void 0 ? false : _ref5$force;
          if (!(!force && readXsrfCookie())) {
            _context37.n = 1;
            break;
          }
          return _context37.a(2);
        case 1:
          if (!csrfCookiePromise) {
            csrfCookiePromise = axios__WEBPACK_IMPORTED_MODULE_0__["default"].get('/sanctum/csrf-cookie', {
              withCredentials: true
            })["catch"](function () {
              return null;
            })["finally"](function () {
              csrfCookiePromise = null;
            });
          }
          _context37.n = 2;
          return csrfCookiePromise;
        case 2:
          return _context37.a(2);
      }
    }, _callee37);
  }));
  return _ensureCsrfCookie.apply(this, arguments);
}
var http = axios__WEBPACK_IMPORTED_MODULE_0__["default"].create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json'
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});
http.interceptors.request.use(/*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(config) {
    var method;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          method = String(config.method || 'get').toLowerCase();
          if (!(['post', 'put', 'patch', 'delete'].includes(method) && !readXsrfCookie())) {
            _context.n = 1;
            break;
          }
          _context.n = 1;
          return ensureCsrfCookie();
        case 1:
          return _context.a(2, syncCsrfHeaders(config));
      }
    }, _callee);
  }));
  return function (_x) {
    return _ref.apply(this, arguments);
  };
}());
http.interceptors.response.use(function (response) {
  return response;
}, /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(error) {
    var _error$response;
    var config, status;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          config = error === null || error === void 0 ? void 0 : error.config;
          status = error === null || error === void 0 || (_error$response = error.response) === null || _error$response === void 0 ? void 0 : _error$response.status;
          if (!(status === 419 && config && !config.__csrfRetried)) {
            _context2.n = 2;
            break;
          }
          config.__csrfRetried = true;
          _context2.n = 1;
          return ensureCsrfCookie({
            force: true
          });
        case 1:
          return _context2.a(2, http.request(syncCsrfHeaders(config)));
        case 2:
          return _context2.a(2, Promise.reject(error));
      }
    }, _callee2);
  }));
  return function (_x2) {
    return _ref2.apply(this, arguments);
  };
}());
var csrf = readCsrfToken();
if (csrf) http.defaults.headers.common['X-CSRF-TOKEN'] = csrf;

/**
 * Debounce an async function. Calls are coalesced; the returned wrapper exposes
 * `.flush()` to run immediately and `.cancel()` to drop a pending call.
 */
function createDebouncer(fn) {
  var wait = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1500;
  var timer = null;
  var lastArgs = null;
  var run = function run() {
    timer = null;
    var args = lastArgs || [];
    lastArgs = null;
    return fn.apply(void 0, _toConsumableArray(args));
  };
  var debounced = function debounced() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, wait);
  };
  debounced.flush = function () {
    if (timer) {
      clearTimeout(timer);
      return run();
    }
    return undefined;
  };
  debounced.cancel = function () {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  debounced.pending = function () {
    return timer !== null;
  };
  return debounced;
}
var sleep = function sleep(ms) {
  return new Promise(function (resolve) {
    return setTimeout(resolve, ms);
  });
};
function isRetryable(error) {
  // Network errors (no response) and 5xx / 429 are worth retrying.
  if (!(error !== null && error !== void 0 && error.response)) return true;
  var status = error.response.status;
  return status >= 500 || status === 429;
}

/**
 * Retry an async function with exponential backoff. Non-retryable errors
 * (e.g. 401/403/422) are rethrown immediately.
 */
function withRetry(_x3) {
  return _withRetry.apply(this, arguments);
}
function _withRetry() {
  _withRetry = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee38(fn) {
    var _ref3,
      _ref3$retries,
      retries,
      _ref3$baseDelay,
      baseDelay,
      attempt,
      _args38 = arguments,
      _t;
    return _regenerator().w(function (_context38) {
      while (1) switch (_context38.p = _context38.n) {
        case 0:
          _ref3 = _args38.length > 1 && _args38[1] !== undefined ? _args38[1] : {}, _ref3$retries = _ref3.retries, retries = _ref3$retries === void 0 ? 3 : _ref3$retries, _ref3$baseDelay = _ref3.baseDelay, baseDelay = _ref3$baseDelay === void 0 ? 800 : _ref3$baseDelay;
          attempt = 0; // eslint-disable-next-line no-constant-condition
        case 1:
          if (false) {}
          _context38.p = 2;
          _context38.n = 3;
          return fn();
        case 3:
          return _context38.a(2, _context38.v);
        case 4:
          _context38.p = 4;
          _t = _context38.v;
          attempt++;
          if (!(attempt > retries || !isRetryable(_t))) {
            _context38.n = 5;
            break;
          }
          throw _t;
        case 5:
          _context38.n = 6;
          return sleep(baseDelay * Math.pow(2, attempt - 1));
        case 6:
          _context38.n = 1;
          break;
        case 7:
          return _context38.a(2);
      }
    }, _callee38, null, [[2, 4]]);
  }));
  return _withRetry.apply(this, arguments);
}
var learningApi = {
  // Dashboard -------------------------------------------------------------
  getDashboard: function getDashboard() {
    var _arguments = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var days, safeDays, _yield$withRetry, data;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            days = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : 30;
            safeDays = days === 7 ? 7 : 30;
            _context3.n = 1;
            return withRetry(function () {
              return http.get('/dashboard', {
                params: {
                  days: safeDays
                },
                headers: {
                  'Cache-Control': 'no-cache',
                  Pragma: 'no-cache'
                }
              });
            });
          case 1:
            _yield$withRetry = _context3.v;
            data = _yield$withRetry.data;
            return _context3.a(2, data !== null && data !== void 0 && data.data && _typeof(data.data) === 'object' ? data.data : data);
        }
      }, _callee3);
    }))();
  },
  // Session ---------------------------------------------------------------
  getSession: function getSession() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var _data$session;
      var _yield$http$get, data;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return http.get('/session');
          case 1:
            _yield$http$get = _context4.v;
            data = _yield$http$get.data;
            return _context4.a(2, (_data$session = data === null || data === void 0 ? void 0 : data.session) !== null && _data$session !== void 0 ? _data$session : null);
        }
      }, _callee4);
    }))();
  },
  getCurrentSession: function getCurrentSession() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var _data$session2;
      var _yield$http$get2, data;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return http.get('/session/current');
          case 1:
            _yield$http$get2 = _context5.v;
            data = _yield$http$get2.data;
            return _context5.a(2, {
              session: (_data$session2 = data === null || data === void 0 ? void 0 : data.session) !== null && _data$session2 !== void 0 ? _data$session2 : null,
              unfinished: !!(data !== null && data !== void 0 && data.unfinished)
            });
        }
      }, _callee5);
    }))();
  },
  saveSession: function saveSession(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
      var _yield$http$post, data;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return http.post('/session', payload);
          case 1:
            _yield$http$post = _context6.v;
            data = _yield$http$post.data;
            return _context6.a(2, data);
        }
      }, _callee6);
    }))();
  },
  startSession: function startSession() {
    var _arguments2 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
      var payload, _yield$http$post2, data;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            payload = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : {};
            _context7.n = 1;
            return http.post('/session/start', payload);
          case 1:
            _yield$http$post2 = _context7.v;
            data = _yield$http$post2.data;
            return _context7.a(2, data);
        }
      }, _callee7);
    }))();
  },
  pauseSession: function pauseSession() {
    var _arguments3 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
      var payload, _yield$http$post3, data;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            payload = _arguments3.length > 0 && _arguments3[0] !== undefined ? _arguments3[0] : {};
            _context8.n = 1;
            return http.post('/session/pause', payload);
          case 1:
            _yield$http$post3 = _context8.v;
            data = _yield$http$post3.data;
            return _context8.a(2, data);
        }
      }, _callee8);
    }))();
  },
  resumeSession: function resumeSession() {
    var _arguments4 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
      var payload, _yield$http$post4, data;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            payload = _arguments4.length > 0 && _arguments4[0] !== undefined ? _arguments4[0] : {};
            _context9.n = 1;
            return http.post('/session/resume', payload);
          case 1:
            _yield$http$post4 = _context9.v;
            data = _yield$http$post4.data;
            return _context9.a(2, data);
        }
      }, _callee9);
    }))();
  },
  endSession: function endSession() {
    var _arguments5 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
      var payload, _yield$http$post5, data;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.n) {
          case 0:
            payload = _arguments5.length > 0 && _arguments5[0] !== undefined ? _arguments5[0] : {};
            _context0.n = 1;
            return http.post('/session/end', payload);
          case 1:
            _yield$http$post5 = _context0.v;
            data = _yield$http$post5.data;
            return _context0.a(2, data);
        }
      }, _callee0);
    }))();
  },
  discardOnboardingExampleSession: function discardOnboardingExampleSession() {
    var _arguments6 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
      var payload, _yield$http$post6, data;
      return _regenerator().w(function (_context1) {
        while (1) switch (_context1.n) {
          case 0:
            payload = _arguments6.length > 0 && _arguments6[0] !== undefined ? _arguments6[0] : {};
            _context1.n = 1;
            return http.post('/session', _objectSpread(_objectSpread({}, payload), {}, {
              action: 'discard_example'
            }));
          case 1:
            _yield$http$post6 = _context1.v;
            data = _yield$http$post6.data;
            return _context1.a(2, data);
        }
      }, _callee1);
    }))();
  },
  // Continue --------------------------------------------------------------
  getContinuePosition: function getContinuePosition() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
      var _data$position;
      var _yield$http$get3, data;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.n) {
          case 0:
            _context10.n = 1;
            return http.get('/continue');
          case 1:
            _yield$http$get3 = _context10.v;
            data = _yield$http$get3.data;
            return _context10.a(2, (_data$position = data === null || data === void 0 ? void 0 : data.position) !== null && _data$position !== void 0 ? _data$position : null);
        }
      }, _callee10);
    }))();
  },
  saveContinuePosition: function saveContinuePosition(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
      var _yield$http$post7, data;
      return _regenerator().w(function (_context11) {
        while (1) switch (_context11.n) {
          case 0:
            _context11.n = 1;
            return http.post('/continue', payload);
          case 1:
            _yield$http$post7 = _context11.v;
            data = _yield$http$post7.data;
            return _context11.a(2, data);
        }
      }, _callee11);
    }))();
  },
  // Progress --------------------------------------------------------------
  getProgress: function getProgress() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
      var _data$progress;
      var _yield$http$get4, data;
      return _regenerator().w(function (_context12) {
        while (1) switch (_context12.n) {
          case 0:
            _context12.n = 1;
            return http.get('/progress');
          case 1:
            _yield$http$get4 = _context12.v;
            data = _yield$http$get4.data;
            return _context12.a(2, (_data$progress = data === null || data === void 0 ? void 0 : data.progress) !== null && _data$progress !== void 0 ? _data$progress : []);
        }
      }, _callee12);
    }))();
  },
  saveProgress: function saveProgress(items) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13() {
      var _yield$http$post8, data;
      return _regenerator().w(function (_context13) {
        while (1) switch (_context13.n) {
          case 0:
            _context13.n = 1;
            return http.post('/progress', {
              items: items
            });
          case 1:
            _yield$http$post8 = _context13.v;
            data = _yield$http$post8.data;
            return _context13.a(2, data);
        }
      }, _callee13);
    }))();
  },
  // Private āyah notes & reflections --------------------------------------
  getAyahNotes: function getAyahNotes() {
    var _arguments7 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14() {
      var params, _yield$http$get5, data;
      return _regenerator().w(function (_context14) {
        while (1) switch (_context14.n) {
          case 0:
            params = _arguments7.length > 0 && _arguments7[0] !== undefined ? _arguments7[0] : {};
            _context14.n = 1;
            return http.get('/ayah-notes', {
              params: params
            });
          case 1:
            _yield$http$get5 = _context14.v;
            data = _yield$http$get5.data;
            return _context14.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.notes) ? data.notes : []);
        }
      }, _callee14);
    }))();
  },
  getAyahNoteCounts: function getAyahNoteCounts(surahNumber) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15() {
      var _yield$http$get6, data;
      return _regenerator().w(function (_context15) {
        while (1) switch (_context15.n) {
          case 0:
            _context15.n = 1;
            return http.get('/ayah-notes/counts', {
              params: {
                surah_number: Number(surahNumber)
              }
            });
          case 1:
            _yield$http$get6 = _context15.v;
            data = _yield$http$get6.data;
            return _context15.a(2, data !== null && data !== void 0 && data.counts && _typeof(data.counts) === 'object' ? data.counts : {});
        }
      }, _callee15);
    }))();
  },
  createAyahNote: function createAyahNote(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee16() {
      var _data$note;
      var _yield$http$post9, data;
      return _regenerator().w(function (_context16) {
        while (1) switch (_context16.n) {
          case 0:
            _context16.n = 1;
            return http.post('/ayah-notes', payload);
          case 1:
            _yield$http$post9 = _context16.v;
            data = _yield$http$post9.data;
            return _context16.a(2, (_data$note = data === null || data === void 0 ? void 0 : data.note) !== null && _data$note !== void 0 ? _data$note : null);
        }
      }, _callee16);
    }))();
  },
  updateAyahNote: function updateAyahNote(noteId, payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee17() {
      var _data$note2;
      var _yield$http$put, data;
      return _regenerator().w(function (_context17) {
        while (1) switch (_context17.n) {
          case 0:
            _context17.n = 1;
            return http.put("/ayah-notes/".concat(noteId), payload);
          case 1:
            _yield$http$put = _context17.v;
            data = _yield$http$put.data;
            return _context17.a(2, (_data$note2 = data === null || data === void 0 ? void 0 : data.note) !== null && _data$note2 !== void 0 ? _data$note2 : null);
        }
      }, _callee17);
    }))();
  },
  deleteAyahNote: function deleteAyahNote(noteId) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee18() {
      var _yield$http$delete, data;
      return _regenerator().w(function (_context18) {
        while (1) switch (_context18.n) {
          case 0:
            _context18.n = 1;
            return http["delete"]("/ayah-notes/".concat(noteId));
          case 1:
            _yield$http$delete = _context18.v;
            data = _yield$http$delete.data;
            return _context18.a(2, data);
        }
      }, _callee18);
    }))();
  },
  // Analytics -------------------------------------------------------------
  getAnalytics: function getAnalytics() {
    var _arguments8 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee19() {
      var _data$analytics;
      var params, _yield$http$get7, data;
      return _regenerator().w(function (_context19) {
        while (1) switch (_context19.n) {
          case 0:
            params = _arguments8.length > 0 && _arguments8[0] !== undefined ? _arguments8[0] : {};
            _context19.n = 1;
            return http.get('/analytics', {
              params: params
            });
          case 1:
            _yield$http$get7 = _context19.v;
            data = _yield$http$get7.data;
            return _context19.a(2, (_data$analytics = data === null || data === void 0 ? void 0 : data.analytics) !== null && _data$analytics !== void 0 ? _data$analytics : []);
        }
      }, _callee19);
    }))();
  },
  saveAnalytics: function saveAnalytics(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee20() {
      var _yield$http$post0, data;
      return _regenerator().w(function (_context20) {
        while (1) switch (_context20.n) {
          case 0:
            _context20.n = 1;
            return http.post('/analytics', payload);
          case 1:
            _yield$http$post0 = _context20.v;
            data = _yield$http$post0.data;
            return _context20.a(2, data);
        }
      }, _callee20);
    }))();
  },
  // Full-fidelity state blob (live persistence boundary) ------------------
  getState: function getState() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee21() {
      var _yield$http$get8, data;
      return _regenerator().w(function (_context21) {
        while (1) switch (_context21.n) {
          case 0:
            _context21.n = 1;
            return http.get('/state');
          case 1:
            _yield$http$get8 = _context21.v;
            data = _yield$http$get8.data;
            return _context21.a(2, data !== null && data !== void 0 ? data : {
              state: null,
              meta: {
                has_state: false
              }
            });
        }
      }, _callee21);
    }))();
  },
  saveState: function saveState(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee22() {
      var _yield$http$post1, data;
      return _regenerator().w(function (_context22) {
        while (1) switch (_context22.n) {
          case 0:
            _context22.n = 1;
            return http.post('/state', payload);
          case 1:
            _yield$http$post1 = _context22.v;
            data = _yield$http$post1.data;
            return _context22.a(2, data);
        }
      }, _callee22);
    }))();
  },
  // One-time legacy migration --------------------------------------------
  migrateLocalStorage: function migrateLocalStorage(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee23() {
      var _yield$http$post10, data;
      return _regenerator().w(function (_context23) {
        while (1) switch (_context23.n) {
          case 0:
            _context23.n = 1;
            return http.post('/migrate-local-storage', payload);
          case 1:
            _yield$http$post10 = _context23.v;
            data = _yield$http$post10.data;
            return _context23.a(2, data);
        }
      }, _callee23);
    }))();
  },
  // Personalised next-session recommendations -----------------------------
  getNextRecommendation: function getNextRecommendation() {
    var _arguments9 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee24() {
      var _data$recommendation;
      var params, _yield$http$get9, data;
      return _regenerator().w(function (_context24) {
        while (1) switch (_context24.n) {
          case 0:
            params = _arguments9.length > 0 && _arguments9[0] !== undefined ? _arguments9[0] : {};
            _context24.n = 1;
            return http.get('/recommendations/next', {
              params: params
            });
          case 1:
            _yield$http$get9 = _context24.v;
            data = _yield$http$get9.data;
            return _context24.a(2, (_data$recommendation = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation !== void 0 ? _data$recommendation : null);
        }
      }, _callee24);
    }))();
  },
  startRecommendedSession: function startRecommendedSession(recommendationId) {
    var _arguments0 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee25() {
      var settings, payload, sanitized, _yield$http$post11, data;
      return _regenerator().w(function (_context25) {
        while (1) switch (_context25.n) {
          case 0:
            settings = _arguments0.length > 1 && _arguments0[1] !== undefined ? _arguments0[1] : null;
            payload = {
              recommendation_id: recommendationId
            };
            sanitized = sanitizeRecommendationSettings(settings);
            if (sanitized) {
              payload.settings = sanitized;
            }
            _context25.n = 1;
            return http.post('/recommendations/start', payload);
          case 1:
            _yield$http$post11 = _context25.v;
            data = _yield$http$post11.data;
            return _context25.a(2, data);
        }
      }, _callee25);
    }))();
  },
  rejectRecommendation: function rejectRecommendation(recommendationId) {
    var _arguments1 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee26() {
      var choseOther, _yield$http$post12, data;
      return _regenerator().w(function (_context26) {
        while (1) switch (_context26.n) {
          case 0:
            choseOther = _arguments1.length > 1 && _arguments1[1] !== undefined ? _arguments1[1] : true;
            _context26.n = 1;
            return http.post('/recommendations/reject', {
              recommendation_id: recommendationId,
              chose_other: choseOther
            });
          case 1:
            _yield$http$post12 = _context26.v;
            data = _yield$http$post12.data;
            return _context26.a(2, data);
        }
      }, _callee26);
    }))();
  },
  submitRecommendationConfidence: function submitRecommendationConfidence(recommendationId, confidence) {
    var _arguments10 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee27() {
      var _data$recommendation2;
      var extras, _yield$http$post13, data;
      return _regenerator().w(function (_context27) {
        while (1) switch (_context27.n) {
          case 0:
            extras = _arguments10.length > 2 && _arguments10[2] !== undefined ? _arguments10[2] : {};
            _context27.n = 1;
            return http.post('/recommendations/confidence', {
              recommendation_id: recommendationId,
              confidence: confidence,
              plan_detail: extras !== null && extras !== void 0 && extras.plan_detail && _typeof(extras.plan_detail) === 'object' ? extras.plan_detail : undefined,
              ayah_range: extras !== null && extras !== void 0 && extras.ayah_range && _typeof(extras.ayah_range) === 'object' ? extras.ayah_range : undefined,
              focus_ayahs: Array.isArray(extras === null || extras === void 0 ? void 0 : extras.focus_ayahs) ? extras.focus_ayahs : undefined
            });
          case 1:
            _yield$http$post13 = _context27.v;
            data = _yield$http$post13.data;
            return _context27.a(2, (_data$recommendation2 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation2 !== void 0 ? _data$recommendation2 : null);
        }
      }, _callee27);
    }))();
  },
  saveRecommendationSettings: function saveRecommendationSettings(recommendationId, settings) {
    var _arguments11 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee28() {
      var _data$recommendation3;
      var reset, payload, _yield$http$post14, data;
      return _regenerator().w(function (_context28) {
        while (1) switch (_context28.n) {
          case 0:
            reset = _arguments11.length > 2 && _arguments11[2] !== undefined ? _arguments11[2] : false;
            payload = {
              recommendation_id: recommendationId,
              reset: !!reset
            };
            if (!reset) {
              payload.settings = sanitizeRecommendationSettings(settings) || {};
            }
            _context28.n = 1;
            return http.post('/recommendations/settings', payload);
          case 1:
            _yield$http$post14 = _context28.v;
            data = _yield$http$post14.data;
            return _context28.a(2, (_data$recommendation3 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation3 !== void 0 ? _data$recommendation3 : null);
        }
      }, _callee28);
    }))();
  },
  submitRecommendationAiAssessment: function submitRecommendationAiAssessment(recommendationId, assessment) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee29() {
      var _data$recommendation4;
      var colorCounts, _yield$http$post15, data;
      return _regenerator().w(function (_context29) {
        while (1) switch (_context29.n) {
          case 0:
            colorCounts = assessment !== null && assessment !== void 0 && assessment.color_counts && _typeof(assessment.color_counts) === 'object' ? assessment.color_counts : undefined;
            _context29.n = 1;
            return http.post('/recommendations/ai-assessment', {
              recommendation_id: recommendationId,
              result: assessment === null || assessment === void 0 ? void 0 : assessment.result,
              summary: (assessment === null || assessment === void 0 ? void 0 : assessment.summary) || undefined,
              weak_ayahs: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.weak_ayahs) ? assessment.weak_ayahs : undefined,
              sequence_errors: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.sequence_errors)) ? Number(assessment.sequence_errors) : undefined,
              missed_words: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.missed_words)) ? Number(assessment.missed_words) : undefined,
              pronunciation_issues: typeof (assessment === null || assessment === void 0 ? void 0 : assessment.pronunciation_issues) === 'boolean' ? assessment.pronunciation_issues : undefined,
              color_counts: colorCounts,
              plan_detail: assessment !== null && assessment !== void 0 && assessment.plan_detail && _typeof(assessment.plan_detail) === 'object' ? assessment.plan_detail : undefined,
              ayah_range: assessment !== null && assessment !== void 0 && assessment.ayah_range && _typeof(assessment.ayah_range) === 'object' ? assessment.ayah_range : undefined,
              focus_ayahs: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.focus_ayahs) ? assessment.focus_ayahs : undefined,
              settings: assessment !== null && assessment !== void 0 && assessment.settings && _typeof(assessment.settings) === 'object' ? sanitizeRecommendationSettings(assessment.settings) : undefined,
              average_accuracy: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.average_accuracy)) ? Number(assessment.average_accuracy) : undefined,
              accuracy_percent: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.accuracy_percent)) ? Number(assessment.accuracy_percent) : undefined,
              attempt_count: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.attempt_count)) ? Number(assessment.attempt_count) : undefined,
              weak_words: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.weak_words) ? assessment.weak_words : undefined,
              attempts: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.attempts) ? assessment.attempts.slice(0, 10).map(function (attempt, index) {
                var _attempt$attempt_numb, _attempt$accuracy, _attempt$accuracy2, _attempt$result;
                return {
                  attempt_number: Number((_attempt$attempt_numb = attempt === null || attempt === void 0 ? void 0 : attempt.attempt_number) !== null && _attempt$attempt_numb !== void 0 ? _attempt$attempt_numb : index + 1),
                  accuracy: Number.isFinite(Number((_attempt$accuracy = attempt === null || attempt === void 0 ? void 0 : attempt.accuracy) !== null && _attempt$accuracy !== void 0 ? _attempt$accuracy : attempt === null || attempt === void 0 ? void 0 : attempt.accuracyPercent)) ? Number((_attempt$accuracy2 = attempt.accuracy) !== null && _attempt$accuracy2 !== void 0 ? _attempt$accuracy2 : attempt.accuracyPercent) : undefined,
                  band: (attempt === null || attempt === void 0 ? void 0 : attempt.band) || undefined,
                  ayah_range: attempt !== null && attempt !== void 0 && attempt.ayah_range && _typeof(attempt.ayah_range) === 'object' ? attempt.ayah_range : undefined,
                  color_counts: attempt !== null && attempt !== void 0 && attempt.color_counts && _typeof(attempt.color_counts) === 'object' ? attempt.color_counts : undefined,
                  weak_words: Array.isArray(attempt === null || attempt === void 0 ? void 0 : attempt.weak_words) ? attempt.weak_words : undefined,
                  word_statuses: Array.isArray(attempt === null || attempt === void 0 ? void 0 : attempt.word_statuses) ? attempt.word_statuses.slice(0, 200) : Array.isArray(attempt === null || attempt === void 0 || (_attempt$result = attempt.result) === null || _attempt$result === void 0 ? void 0 : _attempt$result.wordStatuses) ? attempt.result.wordStatuses.slice(0, 200) : undefined,
                  plan_snapshot: attempt !== null && attempt !== void 0 && attempt.plan_snapshot && _typeof(attempt.plan_snapshot) === 'object' ? attempt.plan_snapshot : undefined
                };
              }) : undefined
            });
          case 1:
            _yield$http$post15 = _context29.v;
            data = _yield$http$post15.data;
            return _context29.a(2, (_data$recommendation4 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation4 !== void 0 ? _data$recommendation4 : null);
        }
      }, _callee29);
    }))();
  },
  getRecommendationHistory: function getRecommendationHistory() {
    var _arguments12 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee30() {
      var limit, _yield$http$get0, data;
      return _regenerator().w(function (_context30) {
        while (1) switch (_context30.n) {
          case 0:
            limit = _arguments12.length > 0 && _arguments12[0] !== undefined ? _arguments12[0] : 20;
            _context30.n = 1;
            return http.get('/recommendations/history', {
              params: {
                limit: Math.max(1, Math.min(50, Number(limit) || 20))
              }
            });
          case 1:
            _yield$http$get0 = _context30.v;
            data = _yield$http$get0.data;
            return _context30.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.history) ? data.history : []);
        }
      }, _callee30);
    }))();
  },
  createMemorisationAssessment: function createMemorisationAssessment(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee31() {
      var _yield$http$post16, data;
      return _regenerator().w(function (_context31) {
        while (1) switch (_context31.n) {
          case 0:
            _context31.n = 1;
            return http.post('/memorisation/assessments', payload);
          case 1:
            _yield$http$post16 = _context31.v;
            data = _yield$http$post16.data;
            return _context31.a(2, data);
        }
      }, _callee31);
    }))();
  },
  adjustMemorisationPracticePlan: function adjustMemorisationPracticePlan(planId, adjustments) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee32() {
      var _data$practice_plan;
      var _yield$http$patch, data;
      return _regenerator().w(function (_context32) {
        while (1) switch (_context32.n) {
          case 0:
            _context32.n = 1;
            return http.patch("/memorisation/practice-plans/".concat(planId), adjustments);
          case 1:
            _yield$http$patch = _context32.v;
            data = _yield$http$patch.data;
            return _context32.a(2, (_data$practice_plan = data === null || data === void 0 ? void 0 : data.practice_plan) !== null && _data$practice_plan !== void 0 ? _data$practice_plan : data);
        }
      }, _callee32);
    }))();
  },
  startMemorisationPracticePlan: function startMemorisationPracticePlan(planId) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee33() {
      var _yield$http$post17, data;
      return _regenerator().w(function (_context33) {
        while (1) switch (_context33.n) {
          case 0:
            _context33.n = 1;
            return http.post("/memorisation/practice-plans/".concat(planId, "/start"));
          case 1:
            _yield$http$post17 = _context33.v;
            data = _yield$http$post17.data;
            return _context33.a(2, data);
        }
      }, _callee33);
    }))();
  },
  completeMemorisationPracticePlan: function completeMemorisationPracticePlan(planId) {
    var _arguments13 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee34() {
      var _data$practice_plan2;
      var completion, _yield$http$post18, data;
      return _regenerator().w(function (_context34) {
        while (1) switch (_context34.n) {
          case 0:
            completion = _arguments13.length > 1 && _arguments13[1] !== undefined ? _arguments13[1] : {};
            _context34.n = 1;
            return http.post("/memorisation/practice-plans/".concat(planId, "/complete"), completion);
          case 1:
            _yield$http$post18 = _context34.v;
            data = _yield$http$post18.data;
            return _context34.a(2, (_data$practice_plan2 = data === null || data === void 0 ? void 0 : data.practice_plan) !== null && _data$practice_plan2 !== void 0 ? _data$practice_plan2 : data);
        }
      }, _callee34);
    }))();
  },
  retestMemorisationPracticePlan: function retestMemorisationPracticePlan(planId, payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee35() {
      var _yield$http$post19, data;
      return _regenerator().w(function (_context35) {
        while (1) switch (_context35.n) {
          case 0:
            _context35.n = 1;
            return http.post("/memorisation/practice-plans/".concat(planId, "/retest"), payload);
          case 1:
            _yield$http$post19 = _context35.v;
            data = _yield$http$post19.data;
            return _context35.a(2, data);
        }
      }, _callee35);
    }))();
  },
  submitRecommendationAdaptiveAssessment: function submitRecommendationAdaptiveAssessment(recommendationId, assessment) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee36() {
      var _data$recommendation5;
      var _yield$http$post20, data;
      return _regenerator().w(function (_context36) {
        while (1) switch (_context36.n) {
          case 0:
            _context36.n = 1;
            return http.post('/recommendations/adaptive-assessment', {
              recommendation_id: recommendationId,
              result: assessment === null || assessment === void 0 ? void 0 : assessment.result,
              summary: (assessment === null || assessment === void 0 ? void 0 : assessment.summary) || undefined,
              assessment_id: (assessment === null || assessment === void 0 ? void 0 : assessment.assessment_id) || undefined,
              weak_ayahs: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.weak_ayahs) ? assessment.weak_ayahs : undefined,
              sequence_errors: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.sequence_errors)) ? Number(assessment.sequence_errors) : undefined,
              missed_words: Number.isFinite(Number(assessment === null || assessment === void 0 ? void 0 : assessment.missed_words)) ? Number(assessment.missed_words) : undefined,
              pronunciation_issues: typeof (assessment === null || assessment === void 0 ? void 0 : assessment.pronunciation_issues) === 'boolean' ? assessment.pronunciation_issues : undefined,
              reason_codes: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.reason_codes) ? assessment.reason_codes : undefined,
              skills: assessment !== null && assessment !== void 0 && assessment.skills && _typeof(assessment.skills) === 'object' ? assessment.skills : undefined,
              skill_view: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.skill_view) ? assessment.skill_view : undefined,
              policy: assessment !== null && assessment !== void 0 && assessment.policy && _typeof(assessment.policy) === 'object' ? assessment.policy : undefined,
              responses: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.responses) ? assessment.responses : undefined,
              events: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.events) ? assessment.events : undefined,
              review: assessment !== null && assessment !== void 0 && assessment.review && _typeof(assessment.review) === 'object' ? assessment.review : undefined,
              snapshot: assessment !== null && assessment !== void 0 && assessment.snapshot && _typeof(assessment.snapshot) === 'object' ? assessment.snapshot : undefined,
              plan_detail: assessment !== null && assessment !== void 0 && assessment.plan_detail && _typeof(assessment.plan_detail) === 'object' ? assessment.plan_detail : undefined,
              ayah_range: assessment !== null && assessment !== void 0 && assessment.ayah_range && _typeof(assessment.ayah_range) === 'object' ? assessment.ayah_range : undefined,
              focus_ayahs: Array.isArray(assessment === null || assessment === void 0 ? void 0 : assessment.focus_ayahs) ? assessment.focus_ayahs : undefined
            });
          case 1:
            _yield$http$post20 = _context36.v;
            data = _yield$http$post20.data;
            return _context36.a(2, (_data$recommendation5 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation5 !== void 0 ? _data$recommendation5 : null);
        }
      }, _callee36);
    }))();
  }
};
function sanitizeRecommendationSettings(settings) {
  if (!settings || _typeof(settings) !== 'object') return null;
  var clean = {};
  var technique = String(settings.technique || '').toLowerCase().trim();
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor', 'chunking'].includes(technique)) clean.technique = technique;
  var complementary = String(settings.complementary_technique || '').toLowerCase().trim();
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor', 'chunking'].includes(complementary)) {
    clean.complementary_technique = complementary;
  }
  var tipTechnique = String(settings.tip_technique || '').toLowerCase().trim();
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor', 'chunking'].includes(tipTechnique)) {
    clean.tip_technique = tipTechnique;
  }
  if (settings.reciter) clean.reciter = String(settings.reciter);
  var speed = Number(settings.playback_speed);
  if (Number.isFinite(speed)) clean.playback_speed = Math.max(0.5, Math.min(1.5, Number(speed.toFixed(2))));
  var reps = Number(settings.repetitions);
  if (Number.isFinite(reps)) clean.repetitions = Math.max(1, Math.min(8, Math.round(reps)));
  if (settings.ayat_per_step != null && settings.ayat_per_step !== '') {
    var step = Number(settings.ayat_per_step);
    if (Number.isFinite(step)) clean.ayat_per_step = Math.max(1, Math.min(10, Math.round(step)));
  }
  if (typeof settings.focus_enabled === 'boolean') clean.focus_enabled = settings.focus_enabled;
  if (typeof settings.blur_enabled === 'boolean') clean.blur_enabled = settings.blur_enabled;
  if (typeof settings.talqin_enabled === 'boolean') clean.talqin_enabled = settings.talqin_enabled;
  if (typeof settings.chaining_enabled === 'boolean') clean.chaining_enabled = settings.chaining_enabled;
  if (typeof settings.anchor_mode_enabled === 'boolean') clean.anchor_mode_enabled = settings.anchor_mode_enabled;
  if (['linking', 'cumulative'].includes(String(settings.chaining_method || ''))) {
    clean.chaining_method = settings.chaining_method;
  }
  var chainingReps = Number(settings.chaining_repetitions);
  if (Number.isFinite(chainingReps)) clean.chaining_repetitions = Math.max(1, Math.min(5, Math.round(chainingReps)));
  var anchorCount = Number(settings.anchor_count);
  if (Number.isFinite(anchorCount)) clean.anchor_count = Math.max(1, Math.min(4, Math.round(anchorCount)));
  var weakSource = Array.isArray(settings.practice_weak_words) ? settings.practice_weak_words : Array.isArray(settings.weak_words) ? settings.weak_words : null;
  if (weakSource !== null && weakSource !== void 0 && weakSource.length) {
    clean.practice_weak_words = weakSource.slice(0, 12).map(function (word) {
      var _ref4, _word$ayahWordIndex;
      if (!word || _typeof(word) !== 'object') return null;
      var wordIndex = Number((_ref4 = (_word$ayahWordIndex = word.ayahWordIndex) !== null && _word$ayahWordIndex !== void 0 ? _word$ayahWordIndex : word.wordIndex) !== null && _ref4 !== void 0 ? _ref4 : word.index);
      if (!Number.isFinite(wordIndex) || wordIndex < 0) return null;
      return {
        text: String(word.text || word.word || word.ar || '').slice(0, 120),
        wordIndex: wordIndex,
        ayahNumber: Number.isFinite(Number(word.ayahNumber)) ? Number(word.ayahNumber) : undefined,
        surahId: Number.isFinite(Number(word.surahId)) ? Number(word.surahId) : undefined,
        verseKey: word.verseKey || word.ayahKey || undefined,
        reason: word.reason || word.status || undefined
      };
    }).filter(Boolean);
  }
  return Object.keys(clean).length ? clean : null;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (learningApi);

/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Dashboard.css":
/*!**************************************************************************************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Dashboard.css ***!
  \**************************************************************************************************************************************************************************/
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
___CSS_LOADER_EXPORT___.push([module.id, "/* Calm Hifz home — aligned with profile shell / hero language */\n\n.user-dashboard {\n  padding-block: calc(var(--nav-h, 72px) + 20px) 54px;\n  color: var(--text);\n}\n\n.dash-stage {\n  display: grid;\n  gap: 20px;\n}\n\n.dash-state {\n  display: grid;\n  gap: 0.55rem;\n  justify-items: start;\n  padding: clamp(20px, 3.5vw, 30px);\n  border-radius: 32px;\n  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));\n  background: var(--surface-strong);\n  color: var(--text-muted);\n}\n\n.dash-state strong {\n  color: var(--text);\n  font-size: 1.15rem;\n}\n\n.dash-state--error {\n  border-color: color-mix(in srgb, var(--danger) 35%, var(--border));\n}\n\n.dash-hero {\n  display: grid;\n  gap: 24px;\n  align-items: stretch;\n  position: relative;\n  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);\n  padding: clamp(20px, 3.5vw, 30px);\n  border-radius: 32px;\n  overflow: hidden;\n  background:\n    radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 14%, transparent), transparent 34%),\n    linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--surface-strong)) 0%, color-mix(in srgb, var(--surface-strong) 88%, transparent) 100%);\n  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));\n}\n\n.dash-hero::after {\n  content: \"\";\n  position: absolute;\n  right: -38px;\n  bottom: -68px;\n  width: 220px;\n  height: 220px;\n  border-radius: 50%;\n  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 68%);\n  pointer-events: none;\n}\n\n.dash-hero-copy,\n.dash-hero-action {\n  position: relative;\n  z-index: 1;\n  display: grid;\n  gap: 12px;\n  align-content: start;\n}\n\n.dash-kicker {\n  display: inline-flex;\n  align-items: center;\n  width: -moz-fit-content;\n  width: fit-content;\n  padding: 8px 12px;\n  border-radius: 999px;\n  background: var(--accent-light);\n  color: var(--accent-strong);\n  font-size: 12px;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n\n.dash-kicker--soft {\n  background: color-mix(in srgb, var(--surface) 70%, var(--accent-light));\n}\n\n.dash-hero-copy h1 {\n  margin: 0;\n  font-size: clamp(34px, 4.4vw, 52px);\n  line-height: 0.98;\n  letter-spacing: -0.05em;\n  font-weight: 700;\n}\n\n.dash-hero-copy > p {\n  max-width: 52ch;\n  margin: 0;\n  color: var(--text-muted);\n  line-height: 1.75;\n  font-size: 1.02rem;\n}\n\n.dash-hero-action {\n  padding: 18px;\n  border-radius: 24px;\n  background: color-mix(in srgb, var(--surface-strong) 88%, transparent);\n  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);\n  backdrop-filter: blur(14px);\n}\n\n.dash-hero-action__title {\n  font-size: clamp(22px, 2.4vw, 30px);\n  line-height: 1.15;\n  letter-spacing: -0.03em;\n  color: var(--text);\n}\n\n.dash-hero-action__message,\n.dash-hero-action__meta {\n  margin: 0;\n  color: var(--text-muted);\n  line-height: 1.65;\n}\n\n.dash-hero-action__meta {\n  font-size: 0.92rem;\n}\n\n.dash-primary-btn,\n.dash-secondary-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  min-height: 48px;\n  min-width: 170px;\n  padding: 0 18px;\n  border-radius: 10px;\n  font-weight: 800;\n  text-decoration: none;\n  cursor: pointer;\n  width: -moz-fit-content;\n  width: fit-content;\n  max-width: 100%;\n}\n\n.dash-primary-btn {\n  border: 1px solid var(--accent);\n  background: var(--accent);\n  color: var(--text-on-accent, #fff);\n}\n\n.dash-primary-btn:hover,\n.dash-primary-btn:focus-visible {\n  background: var(--accent-strong);\n  border-color: var(--accent-strong);\n  color: var(--text-on-accent, #fff);\n}\n\n.dash-secondary-btn {\n  border: 1px solid var(--border);\n  background: var(--surface);\n  color: var(--text);\n}\n\n.dash-secondary-btn:hover,\n.dash-secondary-btn:focus-visible {\n  border-color: var(--accent);\n  color: var(--accent-strong);\n}\n\n.dash-stats {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 12px;\n  padding: 8px 2px;\n}\n\n.dash-stat {\n  display: grid;\n  gap: 4px;\n  padding: 8px 4px;\n}\n\n.dash-stat strong {\n  font-size: clamp(1.8rem, 3.5vw, 2.4rem);\n  line-height: 1;\n  letter-spacing: -0.04em;\n  font-weight: 750;\n  font-variant-numeric: tabular-nums;\n  color: var(--text);\n}\n\n.dash-stat span {\n  color: var(--text-muted);\n  font-size: 0.95rem;\n  line-height: 1.4;\n}\n\n.dash-today {\n  display: grid;\n  gap: 16px;\n  padding-top: 4px;\n}\n\n.dash-today__head h2 {\n  margin: 0;\n  font-size: clamp(1.35rem, 2.4vw, 1.7rem);\n  letter-spacing: -0.03em;\n  font-weight: 700;\n}\n\n.dash-today__head p {\n  margin: 0.35rem 0 0;\n  color: var(--text-muted);\n  line-height: 1.65;\n  max-width: 56ch;\n}\n\n.dash-today-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  gap: 0;\n  border-top: 1px solid color-mix(in srgb, var(--border) 85%, transparent);\n}\n\n.dash-today-item {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 12px 18px;\n  align-items: start;\n  padding: 18px 2px;\n  border-bottom: 1px solid color-mix(in srgb, var(--border) 85%, transparent);\n}\n\n.dash-today-item__copy {\n  display: grid;\n  gap: 0.3rem;\n  min-width: 0;\n}\n\n.dash-today-item__kind {\n  color: var(--accent-strong);\n  font-size: 0.75rem;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n\n.dash-today-item__copy strong {\n  color: var(--text);\n  font-size: 1.05rem;\n  font-weight: 650;\n  line-height: 1.35;\n}\n\n.dash-today-item__copy p,\n.dash-today-item__copy time {\n  margin: 0;\n  color: var(--text-muted);\n  font-size: 0.92rem;\n  line-height: 1.55;\n}\n\n.dash-text-link {\n  color: var(--accent-strong);\n  font-weight: 750;\n  text-decoration: none;\n  white-space: nowrap;\n  padding-top: 1.35rem;\n}\n\n.dash-text-link:hover,\n.dash-text-link:focus-visible {\n  text-decoration: underline;\n}\n\n.dash-empty {\n  display: grid;\n  gap: 0.55rem;\n  justify-items: start;\n  padding: 8px 2px 4px;\n  color: var(--text-muted);\n}\n\n.dash-empty strong {\n  color: var(--text);\n  font-size: 1.05rem;\n}\n\n@media (max-width: 900px) {\n  .dash-hero {\n    grid-template-columns: 1fr;\n  }\n}\n\n@media (max-width: 640px) {\n  .user-dashboard {\n    padding-block: calc(var(--nav-h, 64px) + 12px) 40px;\n  }\n\n  .dash-stats {\n    grid-template-columns: 1fr;\n    gap: 4px;\n  }\n\n  .dash-stat {\n    display: grid;\n    grid-template-columns: auto 1fr;\n    align-items: baseline;\n    gap: 0.75rem;\n    padding: 12px 0;\n    border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);\n  }\n\n  .dash-stat:last-child {\n    border-bottom: 0;\n  }\n\n  .dash-stat strong {\n    font-size: 1.7rem;\n    min-width: 2.5rem;\n  }\n\n  .dash-today-item {\n    grid-template-columns: 1fr;\n    gap: 0.55rem;\n  }\n\n  .dash-text-link {\n    padding-top: 0;\n  }\n\n  .dash-primary-btn,\n  .dash-secondary-btn {\n    width: 100%;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .dash-primary-btn,\n  .dash-secondary-btn,\n  .dash-text-link {\n    transition: none !important;\n  }\n}\n", ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./resources/js/views/Dashboard.css":
/*!******************************************!*\
  !*** ./resources/js/views/Dashboard.css ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Dashboard_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./Dashboard.css */ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/Dashboard.css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Dashboard_css__WEBPACK_IMPORTED_MODULE_1__["default"], options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_Dashboard_css__WEBPACK_IMPORTED_MODULE_1__["default"].locals || {});

/***/ }),

/***/ "./resources/js/views/Dashboard.vue":
/*!******************************************!*\
  !*** ./resources/js/views/Dashboard.vue ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _Dashboard_vue_vue_type_template_id_1f79daf6__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Dashboard.vue?vue&type=template&id=1f79daf6 */ "./resources/js/views/Dashboard.vue?vue&type=template&id=1f79daf6");
/* harmony import */ var _Dashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Dashboard.vue?vue&type=script&lang=js */ "./resources/js/views/Dashboard.vue?vue&type=script&lang=js");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;
const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_Dashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_Dashboard_vue_vue_type_template_id_1f79daf6__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/views/Dashboard.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/views/Dashboard.vue?vue&type=script&lang=js":
/*!******************************************************************!*\
  !*** ./resources/js/views/Dashboard.vue?vue&type=script&lang=js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Dashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Dashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./Dashboard.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Dashboard.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/views/Dashboard.vue?vue&type=template&id=1f79daf6":
/*!************************************************************************!*\
  !*** ./resources/js/views/Dashboard.vue?vue&type=template&id=1f79daf6 ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Dashboard_vue_vue_type_template_id_1f79daf6__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_Dashboard_vue_vue_type_template_id_1f79daf6__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./Dashboard.vue?vue&type=template&id=1f79daf6 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/Dashboard.vue?vue&type=template&id=1f79daf6");


/***/ })

}]);