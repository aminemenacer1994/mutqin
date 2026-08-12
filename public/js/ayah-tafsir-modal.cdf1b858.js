"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["ayah-tafsir-modal"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahTafsirModal.vue?vue&type=script&lang=js":
/*!*********************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahTafsirModal.vue?vue&type=script&lang=js ***!
  \*********************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _scripts_api_tafsir__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scripts/api/tafsir */ "./resources/js/scripts/api/tafsir.js");
/* harmony import */ var _AppStatus_vue__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AppStatus.vue */ "./resources/js/components/AppStatus.vue");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'AyahTafsirModal',
  components: {
    AppStatus: _AppStatus_vue__WEBPACK_IMPORTED_MODULE_1__["default"]
  },
  props: {
    visible: {
      type: Boolean,
      "default": false
    },
    surahNumber: {
      type: Number,
      "default": 0
    },
    ayahNumber: {
      type: Number,
      "default": 0
    },
    surahName: {
      type: String,
      "default": ''
    },
    arabicText: {
      type: String,
      "default": ''
    },
    resourceId: {
      type: String,
      "default": ''
    }
  },
  emits: ['close'],
  data: function data() {
    return {
      loading: false,
      loadError: false,
      available: false,
      tafsir: null,
      lastFetchKey: ''
    };
  },
  computed: {
    contextBadge: function contextBadge() {
      var surah = this.surahName || this.t('memorisation.tafsir.surahFallback', {
        number: this.surahNumber
      });
      return this.t('memorisation.tafsir.contextBadge', {
        surah: surah,
        ayah: this.ayahNumber
      });
    },
    displayArabic: function displayArabic() {
      return String(this.arabicText || '').trim();
    },
    textDirection: function textDirection() {
      var _this$tafsir;
      var lang = String(((_this$tafsir = this.tafsir) === null || _this$tafsir === void 0 ? void 0 : _this$tafsir.language) || 'en').toLowerCase();
      if (lang.startsWith('ar') || lang.startsWith('ur') || lang.startsWith('fa')) return 'rtl';
      return 'ltr';
    },
    tafsirParagraphs: function tafsirParagraphs() {
      var _this$tafsir2;
      var raw = String(((_this$tafsir2 = this.tafsir) === null || _this$tafsir2 === void 0 ? void 0 : _this$tafsir2.tafsir_text) || '').trim();
      if (!raw) return [];
      if (raw.includes('\n\n')) {
        return raw.split(/\n{2,}/).map(function (part) {
          return part.trim();
        }).filter(Boolean);
      }
      return [raw];
    },
    tafsirSource: function tafsirSource() {
      var _this$tafsir3;
      return String(((_this$tafsir3 = this.tafsir) === null || _this$tafsir3 === void 0 ? void 0 : _this$tafsir3.tafsir_source) || '').trim();
    },
    fetchKey: function fetchKey() {
      if (!this.surahNumber || !this.ayahNumber) return '';
      return "".concat(this.resourceId || 'default', ":").concat(this.surahNumber, ":").concat(this.ayahNumber);
    }
  },
  watch: {
    visible: function visible(next) {
      if (next) {
        this.loadTafsir();
      } else {
        this.resetState();
      }
    },
    fetchKey: function fetchKey(next, prev) {
      if (this.visible && next && next !== prev) {
        this.loadTafsir();
      }
    }
  },
  methods: {
    t: function t(key, params) {
      return this.$t ? this.$t(key, params) : key;
    },
    close: function close() {
      this.$emit('close');
    },
    resetState: function resetState() {
      this.loading = false;
      this.loadError = false;
      this.available = false;
      this.tafsir = null;
      this.lastFetchKey = '';
    },
    loadTafsir: function loadTafsir() {
      var _this = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var key, _payload$tafsir, payload, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              if (!(!_this.surahNumber || !_this.ayahNumber)) {
                _context.n = 1;
                break;
              }
              _this.available = false;
              _this.tafsir = null;
              return _context.a(2);
            case 1:
              key = _this.fetchKey;
              if (!(key === _this.lastFetchKey && _this.tafsir && !_this.loadError)) {
                _context.n = 2;
                break;
              }
              return _context.a(2);
            case 2:
              _this.loading = true;
              _this.loadError = false;
              _this.available = false;
              _this.tafsir = null;
              _context.p = 3;
              _context.n = 4;
              return _scripts_api_tafsir__WEBPACK_IMPORTED_MODULE_0__["default"].getAyahTafsir({
                surah_number: _this.surahNumber,
                ayah_number: _this.ayahNumber,
                resource_id: _this.resourceId || undefined
              });
            case 4:
              payload = _context.v;
              _this.lastFetchKey = key;
              _this.available = !!(payload !== null && payload !== void 0 && payload.available) && !!(payload !== null && payload !== void 0 && (_payload$tafsir = payload.tafsir) !== null && _payload$tafsir !== void 0 && _payload$tafsir.tafsir_text);
              _this.tafsir = _this.available ? payload.tafsir : null;
              _context.n = 6;
              break;
            case 5:
              _context.p = 5;
              _t = _context.v;
              console.error('Failed to load tafsir', _t);
              _this.loadError = true;
              _this.available = false;
              _this.tafsir = null;
            case 6:
              _context.p = 6;
              _this.loading = false;
              return _context.f(6);
            case 7:
              return _context.a(2);
          }
        }, _callee, null, [[3, 5, 6, 7]]);
      }))();
    }
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahTafsirModal.vue?vue&type=template&id=1ae908d0":
/*!*************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahTafsirModal.vue?vue&type=template&id=1ae908d0 ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************/
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

var _hoisted_1 = {
  "class": "modal-dialog modal-dialog-centered mutqin-modal-dialog ayah-tafsir-dialog"
};
var _hoisted_2 = {
  "class": "modal-content mutqin-modal-surface ayah-tafsir-modal",
  role: "dialog",
  "aria-modal": "true",
  "aria-labelledby": "ayahTafsirModalTitle"
};
var _hoisted_3 = {
  "class": "modal-header ayah-tafsir-header"
};
var _hoisted_4 = {
  "class": "ayah-tafsir-header-text"
};
var _hoisted_5 = {
  "class": "ayah-tafsir-header-row"
};
var _hoisted_6 = {
  id: "ayahTafsirModalTitle"
};
var _hoisted_7 = {
  "class": "ayah-tafsir-context"
};
var _hoisted_8 = ["aria-label"];
var _hoisted_9 = {
  "class": "modal-body ayah-tafsir-modal-body"
};
var _hoisted_10 = {
  "class": "ayah-tafsir-ayah-block",
  dir: "rtl",
  lang: "ar"
};
var _hoisted_11 = {
  "class": "ayah-tafsir-section-label"
};
var _hoisted_12 = {
  "class": "ayah-tafsir-ayah-text"
};
var _hoisted_13 = {
  "class": "ayah-tafsir-content-section"
};
var _hoisted_14 = ["dir", "lang"];
var _hoisted_15 = ["dir", "lang"];
function render(_ctx, _cache, $props, $setup, $data, $options) {
  var _component_AppStatus = (0,vue__WEBPACK_IMPORTED_MODULE_0__.resolveComponent)("AppStatus");
  return $props.visible ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 0,
    "class": "modal-overlay mutqin-modal-overlay ayah-tafsir-modal-overlay",
    onClick: _cache[1] || (_cache[1] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.close && $options.close.apply($options, arguments);
    }, ["self"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_1, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_6, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.tafsir.title')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_7, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.contextBadge), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "modal-close-btn",
    "aria-label": $options.t('common.close'),
    onClick: _cache[0] || (_cache[0] = function () {
      return $options.close && $options.close.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[2] || (_cache[2] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_8)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_9, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_10, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", _hoisted_11, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.tafsir.ayahLabel')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_12, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.displayArabic), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_13, [$data.loading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_AppStatus, {
    key: 0,
    variant: "loading",
    size: "sm",
    compact: "",
    title: $options.t('memorisation.tafsir.loading')
  }, null, 8 /* PROPS */, ["title"])) : $data.loadError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_AppStatus, {
    key: 1,
    variant: "error",
    size: "sm",
    title: $options.t('common.status.errorTitle'),
    description: $options.t('memorisation.tafsir.loadFailed'),
    "action-label": $options.t('common.retry'),
    onAction: $options.loadTafsir
  }, null, 8 /* PROPS */, ["title", "description", "action-label", "onAction"])) : !$data.available ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_AppStatus, {
    key: 2,
    variant: "empty",
    size: "sm",
    icon: "bi-journal-bookmark",
    title: $options.t('memorisation.tafsir.unavailableTitle'),
    description: $options.t('memorisation.tafsir.unavailable')
  }, null, 8 /* PROPS */, ["title", "description"])) : $data.tafsir ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 3
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "ayah-tafsir-text-scroll",
    dir: $options.textDirection,
    lang: $data.tafsir.language || 'en'
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.tafsirParagraphs, function (paragraph, index) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", {
      key: index,
      "class": "ayah-tafsir-paragraph"
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(paragraph), 1 /* TEXT */);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_14), $options.tafsirSource ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", {
    key: 0,
    "class": "ayah-tafsir-source",
    dir: $options.textDirection,
    lang: $data.tafsir.language || 'en'
  }, "— " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.tafsirSource), 9 /* TEXT, PROPS */, _hoisted_15)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 64 /* STABLE_FRAGMENT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])])])])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true);
}

/***/ }),

/***/ "./resources/js/scripts/api/tafsir.js":
/*!********************************************!*\
  !*** ./resources/js/scripts/api/tafsir.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearAyahTafsirCache: () => (/* binding */ clearAyahTafsirCache),
/* harmony export */   clearTafsirCache: () => (/* binding */ clearTafsirCache),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getAyahTafsir: () => (/* binding */ getAyahTafsir),
/* harmony export */   getChapterTafsir: () => (/* binding */ getChapterTafsir)
/* harmony export */ });
/* harmony import */ var _learning__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./learning */ "./resources/js/scripts/api/learning.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

var ayahCache = new Map();
var chapterCache = new Map();
function ayahCacheKey(_ref) {
  var surah_number = _ref.surah_number,
    ayah_number = _ref.ayah_number,
    resource_id = _ref.resource_id;
  return "".concat(resource_id || 'default', ":").concat(surah_number, ":").concat(ayah_number);
}
function chapterCacheKey(_ref2) {
  var surah_number = _ref2.surah_number,
    resource_id = _ref2.resource_id;
  return "".concat(resource_id || 'default', ":chapter:").concat(surah_number);
}

/**
 * Fetch normalised tafsir for a single ayah via the Laravel service layer.
 */
function getAyahTafsir() {
  return _getAyahTafsir.apply(this, arguments);
}

/**
 * Fetch normalised English tafsir for a full surah via the Laravel service layer.
 */
function _getAyahTafsir() {
  _getAyahTafsir = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var _ref3,
      surah_number,
      ayah_number,
      resource_id,
      surah,
      ayah,
      key,
      params,
      response,
      payload,
      _args = arguments;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _ref3 = _args.length > 0 && _args[0] !== undefined ? _args[0] : {}, surah_number = _ref3.surah_number, ayah_number = _ref3.ayah_number, resource_id = _ref3.resource_id;
          surah = Number(surah_number);
          ayah = Number(ayah_number);
          if (!(!surah || !ayah)) {
            _context.n = 1;
            break;
          }
          throw new Error('surah_number and ayah_number are required');
        case 1:
          key = ayahCacheKey({
            surah_number: surah,
            ayah_number: ayah,
            resource_id: resource_id
          });
          if (!ayahCache.has(key)) {
            _context.n = 2;
            break;
          }
          return _context.a(2, ayahCache.get(key));
        case 2:
          params = {
            surah_number: surah,
            ayah_number: ayah
          };
          if (resource_id) params.resource_id = resource_id;
          _context.n = 3;
          return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/quran/tafsir', {
            params: params
          });
        case 3:
          response = _context.v;
          payload = response.data || {};
          ayahCache.set(key, payload);
          return _context.a(2, payload);
      }
    }, _callee);
  }));
  return _getAyahTafsir.apply(this, arguments);
}
function getChapterTafsir() {
  return _getChapterTafsir.apply(this, arguments);
}
function _getChapterTafsir() {
  _getChapterTafsir = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var _ref4,
      surah_number,
      resource_id,
      surah,
      key,
      params,
      response,
      payload,
      _args2 = arguments;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          _ref4 = _args2.length > 0 && _args2[0] !== undefined ? _args2[0] : {}, surah_number = _ref4.surah_number, resource_id = _ref4.resource_id;
          surah = Number(surah_number);
          if (surah) {
            _context2.n = 1;
            break;
          }
          throw new Error('surah_number is required');
        case 1:
          key = chapterCacheKey({
            surah_number: surah,
            resource_id: resource_id
          });
          if (!chapterCache.has(key)) {
            _context2.n = 2;
            break;
          }
          return _context2.a(2, chapterCache.get(key));
        case 2:
          params = {
            surah_number: surah
          };
          if (resource_id) params.resource_id = resource_id;
          _context2.n = 3;
          return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/quran/tafsir', {
            params: params
          });
        case 3:
          response = _context2.v;
          payload = response.data || {};
          chapterCache.set(key, payload);
          return _context2.a(2, payload);
      }
    }, _callee2);
  }));
  return _getChapterTafsir.apply(this, arguments);
}
function clearAyahTafsirCache() {
  ayahCache.clear();
}
function clearTafsirCache() {
  ayahCache.clear();
  chapterCache.clear();
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  getAyahTafsir: getAyahTafsir,
  getChapterTafsir: getChapterTafsir,
  clearAyahTafsirCache: clearAyahTafsirCache,
  clearTafsirCache: clearTafsirCache
});

/***/ }),

/***/ "./resources/js/components/AyahTafsirModal.vue":
/*!*****************************************************!*\
  !*** ./resources/js/components/AyahTafsirModal.vue ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _AyahTafsirModal_vue_vue_type_template_id_1ae908d0__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AyahTafsirModal.vue?vue&type=template&id=1ae908d0 */ "./resources/js/components/AyahTafsirModal.vue?vue&type=template&id=1ae908d0");
/* harmony import */ var _AyahTafsirModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AyahTafsirModal.vue?vue&type=script&lang=js */ "./resources/js/components/AyahTafsirModal.vue?vue&type=script&lang=js");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;
const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_AyahTafsirModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_AyahTafsirModal_vue_vue_type_template_id_1ae908d0__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/components/AyahTafsirModal.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/components/AyahTafsirModal.vue?vue&type=script&lang=js":
/*!*****************************************************************************!*\
  !*** ./resources/js/components/AyahTafsirModal.vue?vue&type=script&lang=js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahTafsirModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahTafsirModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AyahTafsirModal.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahTafsirModal.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/components/AyahTafsirModal.vue?vue&type=template&id=1ae908d0":
/*!***********************************************************************************!*\
  !*** ./resources/js/components/AyahTafsirModal.vue?vue&type=template&id=1ae908d0 ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahTafsirModal_vue_vue_type_template_id_1ae908d0__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahTafsirModal_vue_vue_type_template_id_1ae908d0__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AyahTafsirModal.vue?vue&type=template&id=1ae908d0 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahTafsirModal.vue?vue&type=template&id=1ae908d0");


/***/ })

}]);