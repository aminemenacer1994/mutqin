"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["ayah-notes-modal"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahNotesModal.vue?vue&type=script&lang=js":
/*!********************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahNotesModal.vue?vue&type=script&lang=js ***!
  \********************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scripts/api/learning */ "./resources/js/scripts/api/learning.js");
/* harmony import */ var _AppStatus_vue__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AppStatus.vue */ "./resources/js/components/AppStatus.vue");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }


var BODY_MAX_LENGTH = 2000;
var NOTES_COLLAPSE_THRESHOLD = 3;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'AyahNotesModal',
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
    }
  },
  emits: ['close', 'changed', 'toast'],
  data: function data() {
    return {
      notes: [],
      loading: false,
      loadError: false,
      busy: false,
      draftTitle: '',
      draftBody: '',
      editingNoteId: null,
      formError: '',
      pendingDeleteNote: null,
      notesExpanded: true,
      /** When editing a legacy note over the limit, allow viewing full text until shortened. */
      allowOversizedDraft: false
    };
  },
  computed: {
    contextBadge: function contextBadge() {
      var surah = this.surahName || this.t('memorisation.ayahNotes.surahFallback', {
        number: this.surahNumber
      });
      return this.t('memorisation.ayahNotes.contextBadge', {
        surah: surah,
        ayah: this.ayahNumber
      });
    },
    draftLength: function draftLength() {
      return String(this.draftBody || '').length;
    },
    isOverLimit: function isOverLimit() {
      return this.draftLength > BODY_MAX_LENGTH;
    },
    isAtOrOverLimit: function isAtOrOverLimit() {
      return this.draftLength >= BODY_MAX_LENGTH;
    },
    formattedCharCount: function formattedCharCount() {
      var current = this.draftLength.toLocaleString();
      var max = BODY_MAX_LENGTH.toLocaleString();
      return "".concat(current, " / ").concat(max);
    },
    textareaMaxLength: function textareaMaxLength() {
      // Preserve oversized legacy notes while editing; block save until shortened.
      if (this.allowOversizedDraft && this.isOverLimit) return undefined;
      return BODY_MAX_LENGTH;
    },
    canSave: function canSave() {
      var body = String(this.draftBody || '').trim();
      return body.length > 0 && body.length <= BODY_MAX_LENGTH && !this.isOverLimit;
    }
  },
  watch: {
    visible: function visible(next) {
      var _this = this;
      if (next) {
        this.resetDraft();
        this.pendingDeleteNote = null;
        this.loadNotes();
        this.$nextTick(function () {
          return _this.focusComposerIfAppropriate();
        });
      } else {
        this.pendingDeleteNote = null;
      }
    },
    draftBody: function draftBody(next) {
      if (this.allowOversizedDraft && String(next || '').length <= BODY_MAX_LENGTH) {
        this.allowOversizedDraft = false;
      }
    }
  },
  methods: {
    t: function t(key, params) {
      return this.$t ? this.$t(key, params) : key;
    },
    shouldAutofocusComposer: function shouldAutofocusComposer() {
      if (typeof window === 'undefined') return false;
      try {
        var coarse = window.matchMedia('(pointer: coarse)').matches;
        var narrow = window.matchMedia('(max-width: 767.98px)').matches;
        return !(coarse || narrow);
      } catch (_) {
        return true;
      }
    },
    focusComposerIfAppropriate: function focusComposerIfAppropriate() {
      var _this$$refs$bodyInput, _this$$refs$bodyInput2;
      if (!this.shouldAutofocusComposer()) return;
      (_this$$refs$bodyInput = this.$refs.bodyInput) === null || _this$$refs$bodyInput === void 0 || (_this$$refs$bodyInput2 = _this$$refs$bodyInput.focus) === null || _this$$refs$bodyInput2 === void 0 || _this$$refs$bodyInput2.call(_this$$refs$bodyInput);
    },
    close: function close() {
      if (this.busy) return;
      if (this.pendingDeleteNote) {
        this.cancelDelete();
        return;
      }
      this.$emit('close');
    },
    resetDraft: function resetDraft() {
      this.draftTitle = '';
      this.draftBody = '';
      this.editingNoteId = null;
      this.formError = '';
      this.allowOversizedDraft = false;
    },
    cancelEdit: function cancelEdit() {
      this.resetDraft();
    },
    notifyToast: function notifyToast(message) {
      var kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'success';
      this.$emit('toast', {
        message: message,
        kind: kind
      });
    },
    formatNoteDate: function formatNoteDate(value) {
      if (!value) return '';
      try {
        return new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(value));
      } catch (_) {
        return String(value);
      }
    },
    noteTitle: function noteTitle(note) {
      var title = String((note === null || note === void 0 ? void 0 : note.title) || '').trim();
      if (title) return title;
      var body = String((note === null || note === void 0 ? void 0 : note.body) || '').trim().replace(/\s+/g, ' ');
      if (!body) return this.t('memorisation.ayahNotes.untitled');
      return body.length > 72 ? "".concat(body.slice(0, 72), "\u2026") : body;
    },
    notePreview: function notePreview(note) {
      var title = String((note === null || note === void 0 ? void 0 : note.title) || '').trim();
      var body = String((note === null || note === void 0 ? void 0 : note.body) || '').trim();
      if (!body) return '';
      // Untitled notes already show body as the title — skip duplicate preview.
      if (!title) return '';
      return body;
    },
    syncNotesExpandedDefault: function syncNotesExpandedDefault() {
      this.notesExpanded = this.notes.length <= NOTES_COLLAPSE_THRESHOLD;
    },
    toggleNotesExpanded: function toggleNotesExpanded() {
      this.notesExpanded = !this.notesExpanded;
    },
    loadNotes: function loadNotes() {
      var _this2 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              if (!(!_this2.surahNumber || !_this2.ayahNumber)) {
                _context.n = 1;
                break;
              }
              _this2.notes = [];
              _this2.loadError = false;
              _this2.syncNotesExpandedDefault();
              return _context.a(2);
            case 1:
              _this2.loading = true;
              _this2.loadError = false;
              _this2.formError = '';
              _context.p = 2;
              _context.n = 3;
              return _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__["default"].getAyahNotes({
                surah_number: _this2.surahNumber,
                ayah_number: _this2.ayahNumber
              });
            case 3:
              _this2.notes = _context.v;
              _this2.syncNotesExpandedDefault();
              _context.n = 5;
              break;
            case 4:
              _context.p = 4;
              _t = _context.v;
              console.error('Failed to load ayah notes', _t);
              _this2.loadError = true;
              _this2.notes = [];
              _this2.syncNotesExpandedDefault();
            case 5:
              _context.p = 5;
              _this2.loading = false;
              return _context.f(5);
            case 6:
              return _context.a(2);
          }
        }, _callee, null, [[2, 4, 5, 6]]);
      }))();
    },
    startEdit: function startEdit(note) {
      var _this3 = this;
      this.pendingDeleteNote = null;
      this.editingNoteId = note.id;
      this.draftTitle = note.title || '';
      this.draftBody = note.body || '';
      this.allowOversizedDraft = String(note.body || '').length > BODY_MAX_LENGTH;
      this.formError = this.allowOversizedDraft ? this.t('memorisation.ayahNotes.bodyMustShorten') : '';
      if (!this.notesExpanded) this.notesExpanded = true;
      this.$nextTick(function () {
        var _this3$$refs$bodyInpu, _this3$$refs$bodyInpu2;
        (_this3$$refs$bodyInpu = _this3.$refs.bodyInput) === null || _this3$$refs$bodyInpu === void 0 || (_this3$$refs$bodyInpu2 = _this3$$refs$bodyInpu.scrollIntoView) === null || _this3$$refs$bodyInpu2 === void 0 || _this3$$refs$bodyInpu2.call(_this3$$refs$bodyInpu, {
          block: 'nearest',
          behavior: 'smooth'
        });
        _this3.focusComposerIfAppropriate();
      });
    },
    saveDraft: function saveDraft() {
      var _this4 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var body, wasEditing, title, _error$response, _error$response2, message, _t2;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              body = String(_this4.draftBody || '').trim();
              if (!(!body || _this4.busy)) {
                _context2.n = 1;
                break;
              }
              return _context2.a(2);
            case 1:
              if (!(body.length > BODY_MAX_LENGTH)) {
                _context2.n = 2;
                break;
              }
              _this4.formError = _this4.t('memorisation.ayahNotes.bodyLimitReached');
              return _context2.a(2);
            case 2:
              _this4.busy = true;
              _this4.formError = '';
              wasEditing = !!_this4.editingNoteId;
              _context2.p = 3;
              title = String(_this4.draftTitle || '').trim() || null;
              if (!_this4.editingNoteId) {
                _context2.n = 5;
                break;
              }
              _context2.n = 4;
              return _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__["default"].updateAyahNote(_this4.editingNoteId, {
                title: title,
                body: body
              });
            case 4:
              _context2.n = 6;
              break;
            case 5:
              _context2.n = 6;
              return _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__["default"].createAyahNote({
                surah_number: _this4.surahNumber,
                ayah_number: _this4.ayahNumber,
                title: title,
                body: body
              });
            case 6:
              _this4.resetDraft();
              _context2.n = 7;
              return _this4.loadNotes();
            case 7:
              _this4.notifyToast(wasEditing ? _this4.t('memorisation.ayahNotes.updatedSuccess') : _this4.t('memorisation.ayahNotes.savedSuccess'), 'success');
              _this4.$emit('changed', {
                surahNumber: _this4.surahNumber,
                ayahNumber: _this4.ayahNumber,
                count: _this4.notes.length
              });
              _context2.n = 9;
              break;
            case 8:
              _context2.p = 8;
              _t2 = _context2.v;
              console.error('Failed to save ayah note', _t2);
              message = (_t2 === null || _t2 === void 0 || (_error$response = _t2.response) === null || _error$response === void 0 || (_error$response = _error$response.data) === null || _error$response === void 0 ? void 0 : _error$response.message) || (_t2 === null || _t2 === void 0 || (_error$response2 = _t2.response) === null || _error$response2 === void 0 || (_error$response2 = _error$response2.data) === null || _error$response2 === void 0 || (_error$response2 = _error$response2.errors) === null || _error$response2 === void 0 || (_error$response2 = _error$response2.body) === null || _error$response2 === void 0 ? void 0 : _error$response2[0]) || _this4.t('memorisation.ayahNotes.saveFailed');
              _this4.formError = message;
            case 9:
              _context2.p = 9;
              _this4.busy = false;
              return _context2.f(9);
            case 10:
              return _context2.a(2);
          }
        }, _callee2, null, [[3, 8, 9, 10]]);
      }))();
    },
    requestDelete: function requestDelete(note) {
      if (!(note !== null && note !== void 0 && note.id) || this.busy) return;
      this.pendingDeleteNote = note;
    },
    cancelDelete: function cancelDelete() {
      this.pendingDeleteNote = null;
    },
    confirmDelete: function confirmDelete() {
      var _this5 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var note, _t3;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              note = _this5.pendingDeleteNote;
              if (!(!(note !== null && note !== void 0 && note.id) || _this5.busy)) {
                _context3.n = 1;
                break;
              }
              return _context3.a(2);
            case 1:
              _this5.busy = true;
              _this5.formError = '';
              _context3.p = 2;
              _context3.n = 3;
              return _scripts_api_learning__WEBPACK_IMPORTED_MODULE_0__["default"].deleteAyahNote(note.id);
            case 3:
              if (_this5.editingNoteId === note.id) _this5.resetDraft();
              _this5.pendingDeleteNote = null;
              _context3.n = 4;
              return _this5.loadNotes();
            case 4:
              _this5.notifyToast(_this5.t('memorisation.ayahNotes.deletedSuccess'), 'success');
              _this5.$emit('changed', {
                surahNumber: _this5.surahNumber,
                ayahNumber: _this5.ayahNumber,
                count: _this5.notes.length
              });
              _context3.n = 6;
              break;
            case 5:
              _context3.p = 5;
              _t3 = _context3.v;
              console.error('Failed to delete ayah note', _t3);
              _this5.formError = _this5.t('memorisation.ayahNotes.deleteFailed');
            case 6:
              _context3.p = 6;
              _this5.busy = false;
              return _context3.f(6);
            case 7:
              return _context3.a(2);
          }
        }, _callee3, null, [[2, 5, 6, 7]]);
      }))();
    }
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahNotesModal.vue?vue&type=template&id=2f0a7454":
/*!************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahNotesModal.vue?vue&type=template&id=2f0a7454 ***!
  \************************************************************************************************************************************************************************************************************************************************************************************/
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
  "class": "modal-dialog modal-dialog-centered mutqin-modal-dialog ayah-notes-dialog"
};
var _hoisted_2 = {
  "class": "modal-content mutqin-modal-surface ayah-notes-modal",
  role: "dialog",
  "aria-modal": "true",
  "aria-labelledby": "ayahNotesModalTitle"
};
var _hoisted_3 = {
  "class": "modal-header ayah-notes-header"
};
var _hoisted_4 = {
  "class": "ayah-notes-header-text"
};
var _hoisted_5 = {
  "class": "ayah-notes-header-row"
};
var _hoisted_6 = {
  id: "ayahNotesModalTitle"
};
var _hoisted_7 = {
  "class": "ayah-notes-privacy-chip"
};
var _hoisted_8 = {
  "class": "ayah-notes-context"
};
var _hoisted_9 = ["aria-label"];
var _hoisted_10 = {
  "class": "modal-body ayah-notes-modal-body"
};
var _hoisted_11 = {
  "class": "ayah-notes-composer-head"
};
var _hoisted_12 = ["disabled"];
var _hoisted_13 = {
  "class": "ayah-notes-field"
};
var _hoisted_14 = ["placeholder", "disabled"];
var _hoisted_15 = {
  "class": "ayah-notes-field"
};
var _hoisted_16 = ["maxlength", "placeholder", "disabled", "aria-invalid", "aria-describedby"];
var _hoisted_17 = {
  key: 0,
  id: "ayahNotesBodyLimit",
  "class": "ayah-notes-limit-msg",
  role: "alert"
};
var _hoisted_18 = {
  key: 0,
  "class": "alert alert-danger ayah-notes-form-alert",
  role: "alert"
};
var _hoisted_19 = {
  "class": "ayah-notes-composer-actions"
};
var _hoisted_20 = ["disabled"];
var _hoisted_21 = {
  key: 0,
  "class": "ayah-notes-list-head"
};
var _hoisted_22 = {
  id: "ayahNotesListHeading"
};
var _hoisted_23 = {
  "class": "ayah-notes-list-count-inline"
};
var _hoisted_24 = ["aria-expanded", "aria-label"];
var _hoisted_25 = ["aria-labelledby"];
var _hoisted_26 = {
  key: 3,
  "class": "ayah-notes-list",
  role: "list"
};
var _hoisted_27 = {
  "class": "ayah-notes-item-main"
};
var _hoisted_28 = {
  "class": "ayah-notes-item-copy"
};
var _hoisted_29 = {
  "class": "ayah-notes-item-title-row"
};
var _hoisted_30 = {
  "class": "ayah-notes-item-title"
};
var _hoisted_31 = {
  key: 0,
  "class": "ayah-notes-editing-badge"
};
var _hoisted_32 = {
  key: 0,
  "class": "ayah-notes-item-body"
};
var _hoisted_33 = ["datetime"];
var _hoisted_34 = {
  "class": "ayah-notes-item-actions"
};
var _hoisted_35 = ["disabled", "onClick"];
var _hoisted_36 = ["disabled", "onClick"];
var _hoisted_37 = {
  "class": "modal-dialog modal-dialog-centered mutqin-modal-dialog ayah-notes-delete-dialog"
};
var _hoisted_38 = {
  "class": "modal-content mutqin-modal-surface confirm-modal ayah-notes-delete-modal",
  role: "dialog",
  "aria-modal": "true",
  "aria-labelledby": "ayahNotesDeleteTitle"
};
var _hoisted_39 = {
  "class": "modal-header"
};
var _hoisted_40 = {
  "class": "ayah-notes-delete-heading"
};
var _hoisted_41 = {
  id: "ayahNotesDeleteTitle"
};
var _hoisted_42 = ["aria-label", "disabled"];
var _hoisted_43 = {
  "class": "modal-body"
};
var _hoisted_44 = {
  "class": "confirm-copy"
};
var _hoisted_45 = {
  "class": "modal-footer mutqin-modal-footer"
};
var _hoisted_46 = {
  "class": "mutqin-modal-actions mutqin-modal-actions--end ayah-notes-delete-actions"
};
var _hoisted_47 = ["disabled"];
var _hoisted_48 = ["disabled"];
function render(_ctx, _cache, $props, $setup, $data, $options) {
  var _component_AppStatus = (0,vue__WEBPACK_IMPORTED_MODULE_0__.resolveComponent)("AppStatus");
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, [$props.visible ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 0,
    "class": "modal-overlay mutqin-modal-overlay ayah-notes-modal-overlay",
    onClick: _cache[8] || (_cache[8] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.close && $options.close.apply($options, arguments);
    }, ["self"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_1, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_6, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_7, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.privacyChip')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_8, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.contextBadge), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "modal-close-btn",
    "aria-label": $options.t('common.close'),
    onClick: _cache[0] || (_cache[0] = function () {
      return $options.close && $options.close.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[13] || (_cache[13] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_9)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_10, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["ayah-notes-composer", {
      'is-editing': !!$data.editingNoteId
    }])
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_11, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.editingNoteId ? $options.t('memorisation.ayahNotes.editingLabel') : $options.t('memorisation.ayahNotes.composeLabel')), 1 /* TEXT */), $data.editingNoteId ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 0,
    type: "button",
    "class": "ayah-notes-text-btn",
    disabled: $data.busy,
    onClick: _cache[1] || (_cache[1] = function () {
      return $options.cancelEdit && $options.cancelEdit.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('common.cancel')), 9 /* TEXT, PROPS */, _hoisted_12)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_13, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.titleLabel')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[2] || (_cache[2] = function ($event) {
      return $data.draftTitle = $event;
    }),
    type: "text",
    "class": "form-control ayah-notes-input",
    maxlength: "120",
    autocomplete: "off",
    enterkeyhint: "next",
    placeholder: $options.t('memorisation.ayahNotes.titlePlaceholder'),
    disabled: $data.busy
  }, null, 8 /* PROPS */, _hoisted_14), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.draftTitle]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_15, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.bodyLabel')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("textarea", {
    ref: "bodyInput",
    "onUpdate:modelValue": _cache[3] || (_cache[3] = function ($event) {
      return $data.draftBody = $event;
    }),
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["form-control ayah-notes-textarea", {
      'is-over-limit': $options.isOverLimit
    }]),
    rows: "4",
    maxlength: $options.textareaMaxLength,
    autocomplete: "off",
    enterkeyhint: "done",
    placeholder: $options.t('memorisation.ayahNotes.bodyPlaceholder'),
    disabled: $data.busy,
    "aria-invalid": $options.isOverLimit ? 'true' : 'false',
    "aria-describedby": $options.isAtOrOverLimit ? 'ayahNotesBodyLimit' : undefined,
    onKeydown: [_cache[4] || (_cache[4] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.saveDraft && $options.saveDraft.apply($options, arguments);
    }, ["meta", "prevent"]), ["enter"])), _cache[5] || (_cache[5] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.saveDraft && $options.saveDraft.apply($options, arguments);
    }, ["ctrl", "prevent"]), ["enter"]))]
  }, null, 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_16), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.draftBody]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["ayah-notes-char-count", {
      'is-limit': $options.isAtOrOverLimit
    }])
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formattedCharCount), 3 /* TEXT, CLASS */), $options.isAtOrOverLimit ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_17, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.bodyLimitReached')), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), $data.formError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_18, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.formError), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_19, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "btn btn-primary ayah-notes-save-btn",
    disabled: $data.busy || !$options.canSave,
    onClick: _cache[6] || (_cache[6] = function () {
      return $options.saveDraft && $options.saveDraft.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $data.editingNoteId ? 'bi-check-lg' : 'bi-send']),
    "aria-hidden": "true"
  }, null, 2 /* CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.editingNoteId ? $options.t('memorisation.ayahNotes.saveChanges') : $options.t('memorisation.ayahNotes.submitNote')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_20)])], 2 /* CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["ayah-notes-list-section", {
      'is-collapsed': !$data.notesExpanded && $data.notes.length > 0
    }])
  }, [$data.notes.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_21, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", _hoisted_22, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.yourNotes')) + " ", 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_23, "(" + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.notes.length) + ")", 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "ayah-notes-collapse-btn",
    "aria-expanded": $data.notesExpanded ? 'true' : 'false',
    "aria-controls": "ayahNotesListPanel",
    "aria-label": $data.notesExpanded ? $options.t('memorisation.ayahNotes.collapseNotes') : $options.t('memorisation.ayahNotes.expandNotes'),
    onClick: _cache[7] || (_cache[7] = function () {
      return $options.toggleNotesExpanded && $options.toggleNotesExpanded.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.notesExpanded ? $options.t('memorisation.ayahNotes.collapse') : $options.t('memorisation.ayahNotes.expand')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", $data.notesExpanded ? 'bi-chevron-up' : 'bi-chevron-down']),
    "aria-hidden": "true"
  }, null, 2 /* CLASS */)], 8 /* PROPS */, _hoisted_24)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    id: "ayahNotesListPanel",
    "class": "ayah-notes-list-panel",
    role: "region",
    "aria-labelledby": $data.notes.length ? 'ayahNotesListHeading' : undefined
  }, [$data.loading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_AppStatus, {
    key: 0,
    variant: "loading",
    size: "sm",
    compact: "",
    title: $options.t('memorisation.ayahNotes.loading')
  }, null, 8 /* PROPS */, ["title"])) : $data.loadError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_AppStatus, {
    key: 1,
    variant: "error",
    size: "sm",
    title: $options.t('common.status.errorTitle'),
    description: $options.t('memorisation.ayahNotes.loadFailed'),
    "action-label": $options.t('common.retry'),
    onAction: $options.loadNotes
  }, null, 8 /* PROPS */, ["title", "description", "action-label", "onAction"])) : !$data.notes.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(_component_AppStatus, {
    key: 2,
    variant: "empty",
    size: "sm",
    icon: "bi-journal-text",
    title: $options.t('memorisation.ayahNotes.emptyTitle'),
    description: $options.t('memorisation.ayahNotes.empty')
  }, null, 8 /* PROPS */, ["title", "description"])) : $data.notesExpanded ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_26, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.notes, function (note) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: note.id,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["ayah-notes-item", {
        'is-editing': $data.editingNoteId === note.id
      }])
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_27, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_28, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_29, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_30, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.noteTitle(note)), 1 /* TEXT */), $data.editingNoteId === note.id ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_31, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.editingBadge')), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), $options.notePreview(note) ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_32, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.notePreview(note)), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("time", {
      "class": "ayah-notes-item-time",
      datetime: note.updated_at || note.created_at
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatNoteDate(note.updated_at || note.created_at)), 9 /* TEXT, PROPS */, _hoisted_33)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_34, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "ayah-notes-item-action",
      disabled: $data.busy || !!$data.pendingDeleteNote || $data.editingNoteId === note.id,
      onClick: function onClick($event) {
        return $options.startEdit(note);
      }
    }, [_cache[14] || (_cache[14] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": "bi bi-pencil",
      "aria-hidden": "true"
    }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.edit')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_35), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "ayah-notes-item-action ayah-notes-item-action--danger",
      disabled: $data.busy || !!$data.pendingDeleteNote,
      onClick: function onClick($event) {
        return $options.requestDelete(note);
      }
    }, [_cache[15] || (_cache[15] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": "bi bi-trash3",
      "aria-hidden": "true"
    }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.delete')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_36)])])], 2 /* CLASS */);
  }), 128 /* KEYED_FRAGMENT */))])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 8 /* PROPS */, _hoisted_25)], 2 /* CLASS */)])])])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Teleport, {
    to: "body"
  }, [$props.visible && $data.pendingDeleteNote ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 0,
    "class": "modal-overlay mutqin-modal-overlay ayah-notes-delete-overlay",
    onClick: _cache[12] || (_cache[12] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.cancelDelete && $options.cancelDelete.apply($options, arguments);
    }, ["self"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_37, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_38, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_39, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_40, [_cache[16] || (_cache[16] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-exclamation-triangle-fill",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_41, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.deleteConfirmTitle')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "modal-close-btn",
    "aria-label": $options.t('common.close'),
    disabled: $data.busy,
    onClick: _cache[9] || (_cache[9] = function () {
      return $options.cancelDelete && $options.cancelDelete.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[17] || (_cache[17] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_42)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_43, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_44, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.deleteConfirm')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_45, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_46, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "mutqin-modal-btn mutqin-modal-btn--secondary",
    disabled: $data.busy,
    onClick: _cache[10] || (_cache[10] = function () {
      return $options.cancelDelete && $options.cancelDelete.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('common.cancel')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_47), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "mutqin-modal-btn mutqin-modal-btn--destructive",
    disabled: $data.busy,
    onClick: _cache[11] || (_cache[11] = function () {
      return $options.confirmDelete && $options.confirmDelete.apply($options, arguments);
    })
  }, [_cache[18] || (_cache[18] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-trash3",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.t('memorisation.ayahNotes.delete')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_48)])])])])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]))], 64 /* STABLE_FRAGMENT */);
}

/***/ }),

/***/ "./resources/js/components/AyahNotesModal.vue":
/*!****************************************************!*\
  !*** ./resources/js/components/AyahNotesModal.vue ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _AyahNotesModal_vue_vue_type_template_id_2f0a7454__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AyahNotesModal.vue?vue&type=template&id=2f0a7454 */ "./resources/js/components/AyahNotesModal.vue?vue&type=template&id=2f0a7454");
/* harmony import */ var _AyahNotesModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AyahNotesModal.vue?vue&type=script&lang=js */ "./resources/js/components/AyahNotesModal.vue?vue&type=script&lang=js");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;
const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_AyahNotesModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_AyahNotesModal_vue_vue_type_template_id_2f0a7454__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/components/AyahNotesModal.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/components/AyahNotesModal.vue?vue&type=script&lang=js":
/*!****************************************************************************!*\
  !*** ./resources/js/components/AyahNotesModal.vue?vue&type=script&lang=js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahNotesModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahNotesModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AyahNotesModal.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahNotesModal.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/components/AyahNotesModal.vue?vue&type=template&id=2f0a7454":
/*!**********************************************************************************!*\
  !*** ./resources/js/components/AyahNotesModal.vue?vue&type=template&id=2f0a7454 ***!
  \**********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahNotesModal_vue_vue_type_template_id_2f0a7454__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AyahNotesModal_vue_vue_type_template_id_2f0a7454__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AyahNotesModal.vue?vue&type=template&id=2f0a7454 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/AyahNotesModal.vue?vue&type=template&id=2f0a7454");


/***/ })

}]);