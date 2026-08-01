"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["admin-dashboard"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/AdminDashboard.vue?vue&type=script&lang=js":
/*!***************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/AdminDashboard.vue?vue&type=script&lang=js ***!
  \***************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scripts/api/admin */ "./resources/js/scripts/api/admin.js");
/* harmony import */ var _AdminDashboard_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AdminDashboard.css */ "./resources/js/views/AdminDashboard.css");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }


var emptyEdit = function emptyEdit() {
  return {
    name: '',
    email: '',
    password: '',
    locale: 'en',
    subscription_status: 'none'
  };
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'AdminDashboard',
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
      bootLoading: !initial,
      bootError: false,
      refreshing: false,
      tab: 'users',
      users: [],
      usersTotal: 0,
      usersLoading: false,
      usersError: false,
      usersRequestId: 0,
      searchTimer: null,
      filters: {
        q: '',
        status: '',
        activity: '',
        progress: ''
      },
      sortKey: 'last_active',
      sortDir: 'desc',
      selectedUserId: null,
      selectedIds: [],
      bulkStatus: 'active',
      bulkBusy: false,
      detail: null,
      detailLoading: false,
      detailError: false,
      detailRequestId: 0,
      detailCache: {},
      editForm: emptyEdit(),
      formSaving: false,
      formError: '',
      deletingUser: false,
      mobileDetailOpen: false,
      createOpen: false,
      createForm: emptyEdit(),
      createSaving: false,
      createError: '',
      inboxItems: [],
      inboxLoading: false,
      activityItems: [],
      activityLoading: false,
      subscriptionOptions: ['none', 'trialing', 'active', 'canceled', 'past_due']
    };
  },
  computed: {
    ownerId: function ownerId() {
      var _this$auth;
      return Number(((_this$auth = this.auth) === null || _this$auth === void 0 ? void 0 : _this$auth.id) || 0);
    },
    isSelfSelected: function isSelfSelected() {
      return !!this.selectedUserId && Number(this.selectedUserId) === this.ownerId;
    },
    tabs: function tabs() {
      var _this$data;
      var pending = Number(((_this$data = this.data) === null || _this$data === void 0 || (_this$data = _this$data.snapshot) === null || _this$data === void 0 || (_this$data = _this$data.pending_contacts) === null || _this$data === void 0 ? void 0 : _this$data.value) || this.inboxItems.length || 0);
      return [{
        key: 'users',
        label: this.t('admin.tab_users'),
        badge: this.usersTotal || null
      }, {
        key: 'inbox',
        label: this.t('admin.tab_inbox'),
        badge: pending || null
      }, {
        key: 'activity',
        label: this.t('admin.tab_activity'),
        badge: null
      }];
    },
    recentUnified: function recentUnified() {
      var _this$detail,
        _this = this,
        _this$detail2;
      var sessions = (((_this$detail = this.detail) === null || _this$detail === void 0 ? void 0 : _this$detail.recent_sessions) || []).slice(0, 4).map(function (row) {
        return {
          key: "s-".concat(row.id),
          label: _this.sessionLine(row),
          at: row.occurred_at
        };
      });
      var ai = (((_this$detail2 = this.detail) === null || _this$detail2 === void 0 ? void 0 : _this$detail2.recent_ai_checks) || []).slice(0, 3).map(function (row) {
        return {
          key: "a-".concat(row.id),
          label: _this.aiLine(row),
          at: row.occurred_at
        };
      });
      return [].concat(_toConsumableArray(sessions), _toConsumableArray(ai)).filter(function (row) {
        return row.at;
      }).sort(function (a, b) {
        return new Date(b.at) - new Date(a.at);
      }).slice(0, 6);
    }
  },
  mounted: function mounted() {
    this.boot();
  },
  beforeUnmount: function beforeUnmount() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  methods: {
    sanitizePayload: function sanitizePayload(payload) {
      var _payload$meta;
      if (!payload || _typeof(payload) !== 'object') return null;
      var owner = Number((payload === null || payload === void 0 || (_payload$meta = payload.meta) === null || _payload$meta === void 0 ? void 0 : _payload$meta.owner_id) || 0);
      if (this.ownerId && owner && owner !== this.ownerId) return null;
      return payload;
    },
    boot: function boot() {
      var _arguments = arguments,
        _this2 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var force, payload, sanitized, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              force = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : false;
              _this2.bootLoading = !_this2.data || force;
              _this2.bootError = false;
              _context.p = 1;
              if (!(!_this2.data || force)) {
                _context.n = 4;
                break;
              }
              _context.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(7);
            case 2:
              payload = _context.v;
              sanitized = _this2.sanitizePayload(payload);
              if (sanitized) {
                _context.n = 3;
                break;
              }
              throw new Error('owner mismatch');
            case 3:
              _this2.data = sanitized;
            case 4:
              _context.n = 5;
              return Promise.all([_this2.reloadUsers(), _this2.loadInbox()]);
            case 5:
              if (!_this2.selectedUserId && _this2.users[0] && window.matchMedia('(min-width: 960px)').matches) {
                _this2.selectUser(_this2.users[0].id, {
                  silentMobile: true
                });
              }
              _context.n = 7;
              break;
            case 6:
              _context.p = 6;
              _t = _context.v;
              console.error(_t);
              if (!_this2.data) _this2.bootError = true;
            case 7:
              _context.p = 7;
              _this2.bootLoading = false;
              return _context.f(7);
            case 8:
              return _context.a(2);
          }
        }, _callee, null, [[1, 6, 7, 8]]);
      }))();
    },
    refreshAll: function refreshAll() {
      var _this3 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var payload, sanitized;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              _this3.refreshing = true;
              _context2.p = 1;
              _context2.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(7);
            case 2:
              payload = _context2.v;
              sanitized = _this3.sanitizePayload(payload);
              if (sanitized) _this3.data = sanitized;
              _context2.n = 3;
              return Promise.all([_this3.reloadUsers(), _this3.loadInbox(), _this3.tab === 'activity' ? _this3.loadActivity() : Promise.resolve()]);
            case 3:
              if (!_this3.selectedUserId) {
                _context2.n = 4;
                break;
              }
              delete _this3.detailCache[_this3.selectedUserId];
              _context2.n = 4;
              return _this3.loadDetail(_this3.selectedUserId);
            case 4:
              _context2.p = 4;
              _this3.refreshing = false;
              return _context2.f(4);
            case 5:
              return _context2.a(2);
          }
        }, _callee2, null, [[1,, 4, 5]]);
      }))();
    },
    setTab: function setTab(tab) {
      this.tab = tab;
      if (tab === 'inbox') this.loadInbox();
      if (tab === 'activity' && !this.activityItems.length) this.loadActivity();
    },
    onSearchInput: function onSearchInput() {
      var _this4 = this;
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(function () {
        return _this4.reloadUsers();
      }, 220);
    },
    reloadUsers: function reloadUsers() {
      var _this5 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var requestId, result, _t2;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              requestId = ++_this5.usersRequestId;
              _this5.usersLoading = true;
              _this5.usersError = false;
              _context3.p = 1;
              _context3.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getUsers({
                limit: 200,
                q: _this5.filters.q,
                status: _this5.filters.status,
                sort: _this5.sortKey,
                dir: _this5.sortDir
              });
            case 2:
              result = _context3.v;
              if (!(requestId !== _this5.usersRequestId)) {
                _context3.n = 3;
                break;
              }
              return _context3.a(2);
            case 3:
              _this5.users = result.users;
              _this5.usersTotal = result.total;
              _this5.selectedIds = _this5.selectedIds.filter(function (id) {
                return _this5.users.some(function (row) {
                  return row.id === id;
                });
              });
              _context3.n = 6;
              break;
            case 4:
              _context3.p = 4;
              _t2 = _context3.v;
              if (!(requestId !== _this5.usersRequestId)) {
                _context3.n = 5;
                break;
              }
              return _context3.a(2);
            case 5:
              _this5.usersError = true;
            case 6:
              _context3.p = 6;
              if (requestId === _this5.usersRequestId) _this5.usersLoading = false;
              return _context3.f(6);
            case 7:
              return _context3.a(2);
          }
        }, _callee3, null, [[1, 4, 6, 7]]);
      }))();
    },
    toggleSelect: function toggleSelect(id) {
      if (this.selectedIds.includes(id)) {
        this.selectedIds = this.selectedIds.filter(function (row) {
          return row !== id;
        });
      } else {
        this.selectedIds = [].concat(_toConsumableArray(this.selectedIds), [id]);
      }
    },
    runBulkStatus: function runBulkStatus() {
      var _this6 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              if (_this6.selectedIds.length) {
                _context4.n = 1;
                break;
              }
              return _context4.a(2);
            case 1:
              _this6.bulkBusy = true;
              _context4.p = 2;
              _context4.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.bulkUsers({
                action: 'update_status',
                user_ids: _this6.selectedIds,
                subscription_status: _this6.bulkStatus
              });
            case 3:
              _this6.selectedIds = [];
              _context4.n = 4;
              return _this6.reloadUsers();
            case 4:
              if (!_this6.selectedUserId) {
                _context4.n = 5;
                break;
              }
              delete _this6.detailCache[_this6.selectedUserId];
              _context4.n = 5;
              return _this6.loadDetail(_this6.selectedUserId);
            case 5:
              _context4.p = 5;
              _this6.bulkBusy = false;
              return _context4.f(5);
            case 6:
              return _context4.a(2);
          }
        }, _callee4, null, [[2,, 5, 6]]);
      }))();
    },
    runBulkDelete: function runBulkDelete() {
      var _this7 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
        var deletedSelected;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.p = _context5.n) {
            case 0:
              if (_this7.selectedIds.length) {
                _context5.n = 1;
                break;
              }
              return _context5.a(2);
            case 1:
              if (window.confirm(_this7.t('admin.bulk_delete_confirm', {
                n: _this7.selectedIds.length
              }))) {
                _context5.n = 2;
                break;
              }
              return _context5.a(2);
            case 2:
              _this7.bulkBusy = true;
              _context5.p = 3;
              _context5.n = 4;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.bulkUsers({
                action: 'delete',
                user_ids: _this7.selectedIds
              });
            case 4:
              deletedSelected = _this7.selectedIds.includes(_this7.selectedUserId);
              _this7.selectedIds = [];
              if (deletedSelected) {
                _this7.selectedUserId = null;
                _this7.detail = null;
                _this7.mobileDetailOpen = false;
              }
              _context5.n = 5;
              return _this7.reloadUsers();
            case 5:
              _this7.refreshSnapshotQuiet();
            case 6:
              _context5.p = 6;
              _this7.bulkBusy = false;
              return _context5.f(6);
            case 7:
              return _context5.a(2);
          }
        }, _callee5, null, [[3,, 6, 7]]);
      }))();
    },
    refreshSnapshotQuiet: function refreshSnapshotQuiet() {
      var _this8 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        var payload, sanitized, _t3;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.p = _context6.n) {
            case 0:
              _context6.p = 0;
              _context6.n = 1;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(7);
            case 1:
              payload = _context6.v;
              sanitized = _this8.sanitizePayload(payload);
              if (sanitized) _this8.data = sanitized;
              _context6.n = 3;
              break;
            case 2:
              _context6.p = 2;
              _t3 = _context6.v;
            case 3:
              return _context6.a(2);
          }
        }, _callee6, null, [[0, 2]]);
      }))();
    },
    selectUser: function selectUser(id) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$silentMobile = _ref.silentMobile,
        silentMobile = _ref$silentMobile === void 0 ? false : _ref$silentMobile;
      var num = Number(id);
      if (!num) return;
      this.selectedUserId = num;
      this.formError = '';
      if (!silentMobile && window.matchMedia('(max-width: 959px)').matches) {
        this.mobileDetailOpen = true;
      }
      this.loadDetail(num);
    },
    closeMobileDetail: function closeMobileDetail() {
      this.mobileDetailOpen = false;
    },
    loadDetail: function loadDetail(id) {
      var _this9 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
        var requestId, detail, _t4;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.p = _context7.n) {
            case 0:
              if (!_this9.detailCache[id]) {
                _context7.n = 1;
                break;
              }
              _this9.detail = _this9.detailCache[id];
              _this9.hydrateEditForm(_this9.detail.user);
              _this9.detailLoading = false;
              _this9.detailError = false;
              return _context7.a(2);
            case 1:
              requestId = ++_this9.detailRequestId;
              _this9.detailLoading = true;
              _this9.detailError = false;
              _context7.p = 2;
              _context7.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getUser(id);
            case 3:
              detail = _context7.v;
              if (!(requestId !== _this9.detailRequestId)) {
                _context7.n = 4;
                break;
              }
              return _context7.a(2);
            case 4:
              _this9.detail = detail;
              _this9.detailCache[id] = detail;
              _this9.hydrateEditForm(detail === null || detail === void 0 ? void 0 : detail.user);
              _context7.n = 7;
              break;
            case 5:
              _context7.p = 5;
              _t4 = _context7.v;
              if (!(requestId !== _this9.detailRequestId)) {
                _context7.n = 6;
                break;
              }
              return _context7.a(2);
            case 6:
              _this9.detailError = true;
              _this9.detail = null;
            case 7:
              _context7.p = 7;
              if (requestId === _this9.detailRequestId) _this9.detailLoading = false;
              return _context7.f(7);
            case 8:
              return _context7.a(2);
          }
        }, _callee7, null, [[2, 5, 7, 8]]);
      }))();
    },
    hydrateEditForm: function hydrateEditForm() {
      var user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      this.editForm = {
        name: user.name || '',
        email: user.email || '',
        password: '',
        locale: user.locale || 'en',
        subscription_status: user.subscription_status || 'none'
      };
    },
    formErrorFrom: function formErrorFrom(error) {
      var _error$response, _error$response2;
      var errors = error === null || error === void 0 || (_error$response = error.response) === null || _error$response === void 0 || (_error$response = _error$response.data) === null || _error$response === void 0 ? void 0 : _error$response.errors;
      if (errors && _typeof(errors) === 'object') {
        var first = Object.values(errors).flat()[0];
        if (first) return String(first);
      }
      return (error === null || error === void 0 || (_error$response2 = error.response) === null || _error$response2 === void 0 || (_error$response2 = _error$response2.data) === null || _error$response2 === void 0 ? void 0 : _error$response2.message) || this.t('admin.form_error');
    },
    saveUser: function saveUser() {
      var _this0 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        var payload, result, _t5;
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.p = _context8.n) {
            case 0:
              if (_this0.selectedUserId) {
                _context8.n = 1;
                break;
              }
              return _context8.a(2);
            case 1:
              _this0.formSaving = true;
              _this0.formError = '';
              _context8.p = 2;
              payload = {
                name: _this0.editForm.name,
                email: _this0.editForm.email,
                locale: _this0.editForm.locale,
                subscription_status: _this0.editForm.subscription_status
              };
              if (_this0.editForm.password) payload.password = _this0.editForm.password;
              _context8.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.updateUser(_this0.selectedUserId, payload);
            case 3:
              result = _context8.v;
              if (result !== null && result !== void 0 && result.detail) {
                _this0.detail = result.detail;
                _this0.detailCache[_this0.selectedUserId] = result.detail;
                _this0.hydrateEditForm(result.detail.user);
              }
              _context8.n = 4;
              return _this0.reloadUsers();
            case 4:
              _context8.n = 6;
              break;
            case 5:
              _context8.p = 5;
              _t5 = _context8.v;
              _this0.formError = _this0.formErrorFrom(_t5);
            case 6:
              _context8.p = 6;
              _this0.formSaving = false;
              return _context8.f(6);
            case 7:
              return _context8.a(2);
          }
        }, _callee8, null, [[2, 5, 6, 7]]);
      }))();
    },
    deleteSelectedUser: function deleteSelectedUser() {
      var _this1 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
        var _t6;
        return _regenerator().w(function (_context9) {
          while (1) switch (_context9.p = _context9.n) {
            case 0:
              if (!(!_this1.selectedUserId || _this1.isSelfSelected)) {
                _context9.n = 1;
                break;
              }
              return _context9.a(2);
            case 1:
              if (window.confirm(_this1.t('admin.delete_user_confirm'))) {
                _context9.n = 2;
                break;
              }
              return _context9.a(2);
            case 2:
              _this1.deletingUser = true;
              _context9.p = 3;
              _context9.n = 4;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.deleteUser(_this1.selectedUserId);
            case 4:
              delete _this1.detailCache[_this1.selectedUserId];
              _this1.selectedUserId = null;
              _this1.detail = null;
              _this1.mobileDetailOpen = false;
              _context9.n = 5;
              return _this1.reloadUsers();
            case 5:
              _this1.refreshSnapshotQuiet();
              _context9.n = 7;
              break;
            case 6:
              _context9.p = 6;
              _t6 = _context9.v;
              _this1.formError = _this1.formErrorFrom(_t6);
            case 7:
              _context9.p = 7;
              _this1.deletingUser = false;
              return _context9.f(7);
            case 8:
              return _context9.a(2);
          }
        }, _callee9, null, [[3, 6, 7, 8]]);
      }))();
    },
    openCreateModal: function openCreateModal() {
      this.createOpen = true;
      this.createError = '';
      this.createForm = emptyEdit();
    },
    createUser: function createUser() {
      var _this10 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
        var created, _t7;
        return _regenerator().w(function (_context0) {
          while (1) switch (_context0.p = _context0.n) {
            case 0:
              _this10.createSaving = true;
              _this10.createError = '';
              _context0.p = 1;
              _context0.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.createUser(_objectSpread({}, _this10.createForm));
            case 2:
              created = _context0.v;
              _this10.createOpen = false;
              _context0.n = 3;
              return _this10.reloadUsers();
            case 3:
              _this10.refreshSnapshotQuiet();
              if (created !== null && created !== void 0 && created.id) {
                _this10.setTab('users');
                _this10.selectUser(created.id);
              }
              _context0.n = 5;
              break;
            case 4:
              _context0.p = 4;
              _t7 = _context0.v;
              _this10.createError = _this10.formErrorFrom(_t7);
            case 5:
              _context0.p = 5;
              _this10.createSaving = false;
              return _context0.f(5);
            case 6:
              return _context0.a(2);
          }
        }, _callee0, null, [[1, 4, 5, 6]]);
      }))();
    },
    loadInbox: function loadInbox() {
      var _this11 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
        return _regenerator().w(function (_context1) {
          while (1) switch (_context1.p = _context1.n) {
            case 0:
              _this11.inboxLoading = true;
              _context1.p = 1;
              _context1.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getContacts({
                status: 'pending',
                limit: 50
              });
            case 2:
              _this11.inboxItems = _context1.v;
            case 3:
              _context1.p = 3;
              _this11.inboxLoading = false;
              return _context1.f(3);
            case 4:
              return _context1.a(2);
          }
        }, _callee1, null, [[1,, 3, 4]]);
      }))();
    },
    loadActivity: function loadActivity() {
      var _this12 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
        return _regenerator().w(function (_context10) {
          while (1) switch (_context10.p = _context10.n) {
            case 0:
              _this12.activityLoading = true;
              _context10.p = 1;
              _context10.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getActivity(60);
            case 2:
              _this12.activityItems = _context10.v;
            case 3:
              _context10.p = 3;
              _this12.activityLoading = false;
              return _context10.f(3);
            case 4:
              return _context10.a(2);
          }
        }, _callee10, null, [[1,, 3, 4]]);
      }))();
    },
    resolveContact: function resolveContact(item) {
      var _this13 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
        var _this13$data;
        return _regenerator().w(function (_context11) {
          while (1) switch (_context11.n) {
            case 0:
              if (item !== null && item !== void 0 && item.id) {
                _context11.n = 1;
                break;
              }
              return _context11.a(2);
            case 1:
              _context11.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.resolveContact(item.id);
            case 2:
              _this13.inboxItems = _this13.inboxItems.filter(function (row) {
                return row.id !== item.id;
              });
              if ((_this13$data = _this13.data) !== null && _this13$data !== void 0 && (_this13$data = _this13$data.snapshot) !== null && _this13$data !== void 0 && _this13$data.pending_contacts) {
                _this13.data.snapshot.pending_contacts.value = Math.max(0, Number(_this13.data.snapshot.pending_contacts.value || 1) - 1);
              }
            case 3:
              return _context11.a(2);
          }
        }, _callee11);
      }))();
    },
    deleteContact: function deleteContact(item) {
      var _this14 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
        return _regenerator().w(function (_context12) {
          while (1) switch (_context12.n) {
            case 0:
              if (item !== null && item !== void 0 && item.id) {
                _context12.n = 1;
                break;
              }
              return _context12.a(2);
            case 1:
              if (window.confirm(_this14.t('admin.delete_contact_confirm'))) {
                _context12.n = 2;
                break;
              }
              return _context12.a(2);
            case 2:
              _context12.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.deleteContact(item.id);
            case 3:
              _this14.inboxItems = _this14.inboxItems.filter(function (row) {
                return row.id !== item.id;
              });
            case 4:
              return _context12.a(2);
          }
        }, _callee12);
      }))();
    },
    jumpToUser: function jumpToUser(userId) {
      if (!userId) return;
      this.setTab('users');
      this.selectUser(userId);
    },
    onConsoleKeydown: function onConsoleKeydown(event) {
      var _this15 = this;
      if (this.tab !== 'users' || this.createOpen) return;
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!this.users.length) return;
      event.preventDefault();
      var index = this.users.findIndex(function (row) {
        return row.id === _this15.selectedUserId;
      });
      var next = event.key === 'ArrowDown' ? Math.min(this.users.length - 1, (index < 0 ? -1 : index) + 1) : Math.max(0, (index < 0 ? 1 : index) - 1);
      this.selectUser(this.users[next].id, {
        silentMobile: true
      });
    },
    subscriptionLabel: function subscriptionLabel(key) {
      var map = {
        active: 'sub_active',
        trialing: 'sub_trialing',
        canceled: 'sub_canceled',
        past_due: 'sub_past_due',
        none: 'sub_none',
        free: 'sub_none'
      };
      var i18nKey = map[String(key || '').toLowerCase()] || null;
      return i18nKey ? this.t("admin.".concat(i18nKey)) : String(key || 'none');
    },
    activityTitle: function activityTitle(item) {
      if (!item) return '';
      if (item.type === 'user_joined') return item.user_name || item.user_email || this.t('admin.activity_type_user');
      var who = item.user_name || item.user_email || '';
      var place = item.surah_name || '';
      return [who, place].filter(Boolean).join(' · ') || this.t('admin.activity_fallback');
    },
    sessionLine: function sessionLine(row) {
      return row.surah_name || this.t('admin.filter_sessions');
    },
    aiLine: function aiLine(row) {
      var parts = [row.surah_name];
      if (row.accuracy_percent != null) parts.push(this.t('admin.accuracy', {
        n: Number(row.accuracy_percent)
      }));
      return parts.filter(Boolean).join(' · ') || this.t('admin.activity_type_ai');
    },
    formatRelative: function formatRelative(value) {
      if (!value) return '';
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      var minutes = Math.round((Date.now() - date.getTime()) / 60000);
      if (minutes < 1) return this.t('admin.just_now');
      if (minutes < 60) return this.t('admin.minutes_ago', {
        n: minutes
      });
      var hours = Math.round(minutes / 60);
      if (hours < 24) return this.t('admin.hours_ago', {
        n: hours
      });
      var days = Math.round(hours / 24);
      if (days === 1) return this.t('admin.yesterday');
      if (days < 8) return this.t('admin.days_ago', {
        n: days
      });
      return date.toLocaleDateString([], {
        day: 'numeric',
        month: 'short'
      });
    }
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/AdminDashboard.vue?vue&type=template&id=3d7b4864":
/*!*******************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/AdminDashboard.vue?vue&type=template&id=3d7b4864 ***!
  \*******************************************************************************************************************************************************************************************************************************************************************************/
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
  "class": "admin-console__shell"
};
var _hoisted_2 = {
  key: 0,
  "class": "admin-console__state",
  role: "status"
};
var _hoisted_3 = {
  key: 1,
  "class": "admin-console__state admin-console__state--error",
  role: "alert"
};
var _hoisted_4 = {
  "class": "admin-bar"
};
var _hoisted_5 = ["aria-label"];
var _hoisted_6 = ["aria-selected", "onClick"];
var _hoisted_7 = {
  key: 0
};
var _hoisted_8 = {
  "class": "admin-bar__actions"
};
var _hoisted_9 = ["aria-label"];
var _hoisted_10 = ["disabled", "aria-label"];
var _hoisted_11 = ["aria-label"];
var _hoisted_12 = {
  "class": "admin-list-pane"
};
var _hoisted_13 = {
  "class": "admin-toolbar"
};
var _hoisted_14 = ["placeholder"];
var _hoisted_15 = {
  value: ""
};
var _hoisted_16 = ["value"];
var _hoisted_17 = {
  key: 0,
  "class": "admin-bulkbar"
};
var _hoisted_18 = ["value"];
var _hoisted_19 = ["disabled"];
var _hoisted_20 = ["disabled"];
var _hoisted_21 = {
  key: 1,
  "class": "admin-empty"
};
var _hoisted_22 = {
  key: 2,
  "class": "admin-empty",
  role: "alert"
};
var _hoisted_23 = {
  key: 3,
  "class": "admin-empty"
};
var _hoisted_24 = ["aria-label"];
var _hoisted_25 = ["checked", "onChange"];
var _hoisted_26 = ["onClick"];
var _hoisted_27 = {
  "class": "admin-people__name"
};
var _hoisted_28 = {
  "class": "admin-people__meta"
};
var _hoisted_29 = {
  key: 0,
  "class": "admin-detail-empty"
};
var _hoisted_30 = {
  "class": "admin-detail__head"
};
var _hoisted_31 = {
  key: 0
};
var _hoisted_32 = {
  key: 0,
  "class": "admin-empty"
};
var _hoisted_33 = {
  key: 1,
  "class": "admin-empty",
  role: "alert"
};
var _hoisted_34 = {
  key: 2,
  "class": "admin-detail__body"
};
var _hoisted_35 = {
  "class": "admin-statstrip"
};
var _hoisted_36 = ["value"];
var _hoisted_37 = {
  key: 0,
  "class": "admin-form__error",
  role: "alert"
};
var _hoisted_38 = {
  "class": "admin-form__actions"
};
var _hoisted_39 = ["disabled"];
var _hoisted_40 = ["disabled"];
var _hoisted_41 = {
  "class": "admin-block"
};
var _hoisted_42 = {
  key: 0,
  "class": "admin-mini"
};
var _hoisted_43 = {
  key: 1,
  "class": "admin-muted"
};
var _hoisted_44 = {
  "class": "admin-panel"
};
var _hoisted_45 = {
  key: 0,
  "class": "admin-empty"
};
var _hoisted_46 = {
  key: 1,
  "class": "admin-empty"
};
var _hoisted_47 = {
  key: 2,
  "class": "admin-feed-list"
};
var _hoisted_48 = {
  "class": "admin-feed-card__main"
};
var _hoisted_49 = {
  "class": "admin-muted"
};
var _hoisted_50 = {
  "class": "admin-feed-card__actions"
};
var _hoisted_51 = ["onClick"];
var _hoisted_52 = ["onClick"];
var _hoisted_53 = {
  "class": "admin-panel"
};
var _hoisted_54 = {
  key: 0,
  "class": "admin-empty"
};
var _hoisted_55 = {
  key: 1,
  "class": "admin-empty"
};
var _hoisted_56 = {
  key: 2,
  "class": "admin-feed-list"
};
var _hoisted_57 = ["disabled", "onClick"];
var _hoisted_58 = {
  "class": "admin-feed-card__main"
};
var _hoisted_59 = {
  key: 0,
  "class": "admin-modal-root",
  role: "dialog",
  "aria-modal": "true"
};
var _hoisted_60 = ["aria-label"];
var _hoisted_61 = {
  "class": "admin-modal"
};
var _hoisted_62 = {
  "class": "admin-modal__head"
};
var _hoisted_63 = ["aria-label"];
var _hoisted_64 = {
  key: 0,
  "class": "admin-form__error",
  role: "alert"
};
var _hoisted_65 = {
  "class": "admin-form__actions"
};
var _hoisted_66 = ["disabled"];
function render(_ctx, _cache, $props, $setup, $data, $options) {
  var _$data$detail, _$data$detail2, _$data$detail3, _$data$detail$stats$m, _$data$detail$stats, _$data$detail$stats$s, _$data$detail$stats2, _$data$detail$stats3;
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("main", {
    id: "mainContent",
    "class": "admin-console",
    tabindex: "-1",
    onKeydown: _cache[24] || (_cache[24] = function () {
      return $options.onConsoleKeydown && $options.onConsoleKeydown.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_1, [$data.bootLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_2, _toConsumableArray(_cache[25] || (_cache[25] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "admin-spinner",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])))) : $data.bootError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn",
    onClick: _cache[0] || (_cache[0] = function ($event) {
      return $options.boot(true);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.retry')), 1 /* TEXT */)])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 2
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("nav", {
    "class": "admin-tabs",
    role: "tablist",
    "aria-label": _ctx.t('admin.console_tabs')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.tabs, function (item) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
      key: item.key,
      type: "button",
      role: "tab",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-tabs__btn", {
        'is-active': $data.tab === item.key
      }]),
      "aria-selected": $data.tab === item.key ? 'true' : 'false',
      onClick: function onClick($event) {
        return $options.setTab(item.key);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.label) + " ", 1 /* TEXT */), item.badge ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("em", _hoisted_7, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.badge), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 10 /* CLASS, PROPS */, _hoisted_6);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_5), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_8, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    "aria-label": _ctx.t('admin.add_user'),
    onClick: _cache[1] || (_cache[1] = function () {
      return $options.openCreateModal && $options.openCreateModal.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[26] || (_cache[26] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-person-plus",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_9), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    disabled: $data.refreshing,
    "aria-label": _ctx.t('admin.refresh'),
    onClick: _cache[2] || (_cache[2] = function () {
      return $options.refreshAll && $options.refreshAll.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi bi-arrow-clockwise", {
      'is-spinning': $data.refreshing
    }]),
    "aria-hidden": "true"
  }, null, 2 /* CLASS */)], 8 /* PROPS */, _hoisted_10)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" USERS "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", {
    "class": "admin-workspace",
    "aria-label": _ctx.t('admin.users_title')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_12, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_13, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[3] || (_cache[3] = function ($event) {
      return $data.filters.q = $event;
    }),
    type: "search",
    "class": "admin-toolbar__search",
    placeholder: _ctx.t('admin.users_search'),
    onInput: _cache[4] || (_cache[4] = function () {
      return $options.onSearchInput && $options.onSearchInput.apply($options, arguments);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_14), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.filters.q, void 0, {
    trim: true
  }]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[5] || (_cache[5] = function ($event) {
      return $data.filters.status = $event;
    }),
    "class": "admin-toolbar__select",
    onChange: _cache[6] || (_cache[6] = function () {
      return $options.reloadUsers && $options.reloadUsers.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_15, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_status_all')), 1 /* TEXT */), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.subscriptionOptions, function (status) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: status,
      value: status
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.subscriptionLabel(status)), 9 /* TEXT, PROPS */, _hoisted_16);
  }), 128 /* KEYED_FRAGMENT */))], 544 /* NEED_HYDRATION, NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.filters.status]])]), $data.selectedIds.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_17, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.selectedIds.length), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[7] || (_cache[7] = function ($event) {
      return $data.bulkStatus = $event;
    }),
    "class": "admin-toolbar__select"
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.subscriptionOptions, function (status) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: status,
      value: status
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.subscriptionLabel(status)), 9 /* TEXT, PROPS */, _hoisted_18);
  }), 128 /* KEYED_FRAGMENT */))], 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.bulkStatus]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--sm",
    disabled: $data.bulkBusy,
    onClick: _cache[8] || (_cache[8] = function () {
      return $options.runBulkStatus && $options.runBulkStatus.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_set_status')), 9 /* TEXT, PROPS */, _hoisted_19), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--danger admin-btn--sm",
    disabled: $data.bulkBusy,
    onClick: _cache[9] || (_cache[9] = function () {
      return $options.runBulkDelete && $options.runBulkDelete.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete')), 9 /* TEXT, PROPS */, _hoisted_20)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $data.usersLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_21, "…")) : $data.usersError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_22, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.retry')), 1 /* TEXT */)) : !$data.users.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_23, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.users_empty')), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", {
    key: 4,
    "class": "admin-people",
    role: "listbox",
    "aria-label": _ctx.t('admin.users_title')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.users, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: row.id,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-people__row", {
        'is-selected': $data.selectedUserId === row.id
      }])
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
      type: "checkbox",
      "class": "admin-people__check",
      checked: $data.selectedIds.includes(row.id),
      onChange: function onChange($event) {
        return $options.toggleSelect(row.id);
      },
      onClick: _cache[10] || (_cache[10] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {}, ["stop"]))
    }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_25), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "admin-people__hit",
      onClick: function onClick($event) {
        return $options.selectUser(row.id);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_27, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.name || row.email), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_28, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.subscriptionLabel(row.subscription_status)) + " · " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatRelative(row.last_activity_at) || '—'), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_26)], 2 /* CLASS */);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_24))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("aside", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-detail-pane", {
      'is-open': !!$data.selectedUserId && $data.mobileDetailOpen
    }])
  }, [!$data.selectedUserId ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_29, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.detail_empty')), 1 /* TEXT */)])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 1
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_30, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-link admin-detail__back",
    onClick: _cache[11] || (_cache[11] = function () {
      return $options.closeMobileDetail && $options.closeMobileDetail.apply($options, arguments);
    })
  }, "←"), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(((_$data$detail = $data.detail) === null || _$data$detail === void 0 || (_$data$detail = _$data$detail.user) === null || _$data$detail === void 0 ? void 0 : _$data$detail.name) || ((_$data$detail2 = $data.detail) === null || _$data$detail2 === void 0 || (_$data$detail2 = _$data$detail2.user) === null || _$data$detail2 === void 0 ? void 0 : _$data$detail2.email) || '…'), 1 /* TEXT */), (_$data$detail3 = $data.detail) !== null && _$data$detail3 !== void 0 && (_$data$detail3 = _$data$detail3.user) !== null && _$data$detail3 !== void 0 && _$data$detail3.name ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_31, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.detail.user.email), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])]), $data.detailLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_32, "…")) : $data.detailError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_33, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.retry')), 1 /* TEXT */)) : $data.detail ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_34, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_35, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)((_$data$detail$stats$m = (_$data$detail$stats = $data.detail.stats) === null || _$data$detail$stats === void 0 ? void 0 : _$data$detail$stats.memorised_ayahs) !== null && _$data$detail$stats$m !== void 0 ? _$data$detail$stats$m : 0), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_memorised')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)((_$data$detail$stats$s = (_$data$detail$stats2 = $data.detail.stats) === null || _$data$detail$stats2 === void 0 ? void 0 : _$data$detail$stats2.sessions_completed) !== null && _$data$detail$stats$s !== void 0 ? _$data$detail$stats$s : 0), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_sessions')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(((_$data$detail$stats3 = $data.detail.stats) === null || _$data$detail$stats3 === void 0 ? void 0 : _$data$detail$stats3.avg_ai_accuracy) != null ? _ctx.t('admin.accuracy', {
    n: $data.detail.stats.avg_ai_accuracy
  }) : '—'), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.ai_avg')), 1 /* TEXT */)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("form", {
    "class": "admin-form",
    onSubmit: _cache[17] || (_cache[17] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.saveUser && $options.saveUser.apply($options, arguments);
    }, ["prevent"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_name')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[12] || (_cache[12] = function ($event) {
      return $data.editForm.name = $event;
    }),
    type: "text",
    required: "",
    maxlength: "120"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.editForm.name, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_email')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[13] || (_cache[13] = function ($event) {
      return $data.editForm.email = $event;
    }),
    type: "email",
    required: "",
    maxlength: "255"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.editForm.email, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_subscription')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[14] || (_cache[14] = function ($event) {
      return $data.editForm.subscription_status = $event;
    })
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.subscriptionOptions, function (status) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: status,
      value: status
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.subscriptionLabel(status)), 9 /* TEXT, PROPS */, _hoisted_36);
  }), 128 /* KEYED_FRAGMENT */))], 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.editForm.subscription_status]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_password_optional')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[15] || (_cache[15] = function ($event) {
      return $data.editForm.password = $event;
    }),
    type: "password",
    minlength: "8",
    autocomplete: "new-password"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.editForm.password]])]), $data.formError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_37, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.formError), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_38, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--danger admin-btn--sm",
    disabled: $data.deletingUser || $options.isSelfSelected,
    onClick: _cache[16] || (_cache[16] = function () {
      return $options.deleteSelectedUser && $options.deleteSelectedUser.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete')), 9 /* TEXT, PROPS */, _hoisted_39), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "submit",
    "class": "admin-btn admin-btn--primary",
    disabled: $data.formSaving
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.formSaving ? _ctx.t('admin.saving') : _ctx.t('admin.save_user')), 9 /* TEXT, PROPS */, _hoisted_40)])], 32 /* NEED_HYDRATION */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("details", _hoisted_41, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("summary", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.activity_title')), 1 /* TEXT */), $options.recentUnified.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_42, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.recentUnified, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: row.key
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.label), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("time", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatRelative(row.at)), 1 /* TEXT */)]);
  }), 128 /* KEYED_FRAGMENT */))])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_43, "—"))])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 64 /* STABLE_FRAGMENT */))], 2 /* CLASS */)], 8 /* PROPS */, _hoisted_11), [[vue__WEBPACK_IMPORTED_MODULE_0__.vShow, $data.tab === 'users']]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" INBOX "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_44, [$data.inboxLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_45, "…")) : !$data.inboxItems.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_46, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.contacts_empty')), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_47, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.inboxItems, function (item) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: item.id,
      "class": "admin-feed-card"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_48, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.subject || item.email), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_49, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.name), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_50, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "admin-btn admin-btn--ghost admin-btn--sm",
      onClick: function onClick($event) {
        return $options.resolveContact(item);
      }
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.resolve')), 9 /* TEXT, PROPS */, _hoisted_51), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "admin-btn admin-btn--danger admin-btn--sm",
      onClick: function onClick($event) {
        return $options.deleteContact(item);
      }
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete')), 9 /* TEXT, PROPS */, _hoisted_52)])]);
  }), 128 /* KEYED_FRAGMENT */))]))], 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vShow, $data.tab === 'inbox']]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" ACTIVITY "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_53, [$data.activityLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_54, "…")) : !$data.activityItems.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_55, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.activity_empty')), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_56, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.activityItems.slice(0, 40), function (item, index) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: item.id || index
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "admin-feed-card admin-feed-card--button",
      disabled: !item.user_id,
      onClick: function onClick($event) {
        return $options.jumpToUser(item.user_id);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_58, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.activityTitle(item)), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("time", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatRelative(item.occurred_at)), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_57)]);
  }), 128 /* KEYED_FRAGMENT */))]))], 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vShow, $data.tab === 'activity']])], 64 /* STABLE_FRAGMENT */))]), $data.createOpen ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_59, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-modal__backdrop",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[18] || (_cache[18] = function ($event) {
      return $data.createOpen = false;
    })
  }, null, 8 /* PROPS */, _hoisted_60), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_61, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_62, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.add_user')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[19] || (_cache[19] = function ($event) {
      return $data.createOpen = false;
    })
  }, _toConsumableArray(_cache[27] || (_cache[27] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_63)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("form", {
    "class": "admin-form",
    onSubmit: _cache[23] || (_cache[23] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.createUser && $options.createUser.apply($options, arguments);
    }, ["prevent"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_name')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[20] || (_cache[20] = function ($event) {
      return $data.createForm.name = $event;
    }),
    type: "text",
    required: "",
    maxlength: "120"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.createForm.name, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_email')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[21] || (_cache[21] = function ($event) {
      return $data.createForm.email = $event;
    }),
    type: "email",
    required: "",
    maxlength: "255"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.createForm.email, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_password')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[22] || (_cache[22] = function ($event) {
      return $data.createForm.password = $event;
    }),
    type: "password",
    required: "",
    minlength: "8",
    autocomplete: "new-password"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.createForm.password]])]), $data.createError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_64, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.createError), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_65, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "submit",
    "class": "admin-btn admin-btn--primary",
    disabled: $data.createSaving
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.createSaving ? _ctx.t('admin.saving') : _ctx.t('admin.create_user')), 9 /* TEXT, PROPS */, _hoisted_66)])], 32 /* NEED_HYDRATION */)])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 32 /* NEED_HYDRATION */);
}

/***/ }),

/***/ "./resources/js/scripts/api/admin.js":
/*!*******************************************!*\
  !*** ./resources/js/scripts/api/admin.js ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   adminApi: () => (/* binding */ adminApi)
/* harmony export */ });
/* harmony import */ var _learning__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./learning */ "./resources/js/scripts/api/learning.js");
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i["return"]) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }

var adminApi = {
  getDashboard: function getDashboard() {
    var _arguments = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
      var days, safeDays, _yield$withRetry, data;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            days = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : 30;
            safeDays = days === 7 ? 7 : 30;
            _context.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/dashboard', {
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
            _yield$withRetry = _context.v;
            data = _yield$withRetry.data;
            return _context.a(2, data !== null && data !== void 0 && data.data && _typeof(data.data) === 'object' ? data.data : data);
        }
      }, _callee);
    }))();
  },
  getUsers: function getUsers() {
    var _arguments2 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var _ref, _ref$limit, limit, _ref$q, q, _ref$status, status, _ref$activity, activity, _ref$progress, progress, _ref$sort, sort, _ref$dir, dir, _yield$withRetry2, data;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _ref = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : {}, _ref$limit = _ref.limit, limit = _ref$limit === void 0 ? 100 : _ref$limit, _ref$q = _ref.q, q = _ref$q === void 0 ? '' : _ref$q, _ref$status = _ref.status, status = _ref$status === void 0 ? '' : _ref$status, _ref$activity = _ref.activity, activity = _ref$activity === void 0 ? '' : _ref$activity, _ref$progress = _ref.progress, progress = _ref$progress === void 0 ? '' : _ref$progress, _ref$sort = _ref.sort, sort = _ref$sort === void 0 ? 'created' : _ref$sort, _ref$dir = _ref.dir, dir = _ref$dir === void 0 ? 'desc' : _ref$dir;
            _context2.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/users', {
                params: {
                  limit: limit,
                  q: q || undefined,
                  status: status || undefined,
                  activity: activity || undefined,
                  progress: progress || undefined,
                  sort: sort || undefined,
                  dir: dir || undefined
                }
              });
            });
          case 1:
            _yield$withRetry2 = _context2.v;
            data = _yield$withRetry2.data;
            return _context2.a(2, {
              users: Array.isArray(data === null || data === void 0 ? void 0 : data.users) ? data.users : [],
              total: Number((data === null || data === void 0 ? void 0 : data.total) || 0)
            });
        }
      }, _callee2);
    }))();
  },
  bulkUsers: function bulkUsers(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
      var _yield$http$post, data;
      return _regenerator().w(function (_context3) {
        while (1) switch (_context3.n) {
          case 0:
            _context3.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http.post('/admin/users/bulk', payload);
          case 1:
            _yield$http$post = _context3.v;
            data = _yield$http$post.data;
            return _context3.a(2, data && _typeof(data) === 'object' ? data : {
              updated: 0,
              deleted: 0,
              skipped: 0
            });
        }
      }, _callee3);
    }))();
  },
  getUser: function getUser(id) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var _yield$withRetry3, data;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            _context4.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get("/admin/users/".concat(id));
            });
          case 1:
            _yield$withRetry3 = _context4.v;
            data = _yield$withRetry3.data;
            return _context4.a(2, data && _typeof(data) === 'object' ? data : null);
        }
      }, _callee4);
    }))();
  },
  createUser: function createUser(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var _yield$http$post2, data;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http.post('/admin/users', payload);
          case 1:
            _yield$http$post2 = _context5.v;
            data = _yield$http$post2.data;
            return _context5.a(2, (data === null || data === void 0 ? void 0 : data.user) || null);
        }
      }, _callee5);
    }))();
  },
  updateUser: function updateUser(id, payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
      var _yield$http$patch, data;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http.patch("/admin/users/".concat(id), payload);
          case 1:
            _yield$http$patch = _context6.v;
            data = _yield$http$patch.data;
            return _context6.a(2, data && _typeof(data) === 'object' ? data : null);
        }
      }, _callee6);
    }))();
  },
  deleteUser: function deleteUser(id) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
      var _yield$http$delete, data;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            _context7.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http["delete"]("/admin/users/".concat(id));
          case 1:
            _yield$http$delete = _context7.v;
            data = _yield$http$delete.data;
            return _context7.a(2, !!(data !== null && data !== void 0 && data.deleted));
        }
      }, _callee7);
    }))();
  },
  deleteNote: function deleteNote(id) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
      var _yield$http$delete2, data;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            _context8.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http["delete"]("/admin/notes/".concat(id));
          case 1:
            _yield$http$delete2 = _context8.v;
            data = _yield$http$delete2.data;
            return _context8.a(2, !!(data !== null && data !== void 0 && data.deleted));
        }
      }, _callee8);
    }))();
  },
  getActivity: function getActivity() {
    var _arguments3 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
      var limit, _yield$withRetry4, data;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            limit = _arguments3.length > 0 && _arguments3[0] !== undefined ? _arguments3[0] : 100;
            _context9.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/activity', {
                params: {
                  limit: limit
                }
              });
            });
          case 1:
            _yield$withRetry4 = _context9.v;
            data = _yield$withRetry4.data;
            return _context9.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.activity) ? data.activity : []);
        }
      }, _callee9);
    }))();
  },
  getSessions: function getSessions() {
    var _arguments4 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
      var limit, _yield$withRetry5, data;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.n) {
          case 0:
            limit = _arguments4.length > 0 && _arguments4[0] !== undefined ? _arguments4[0] : 100;
            _context0.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/sessions', {
                params: {
                  limit: limit
                }
              });
            });
          case 1:
            _yield$withRetry5 = _context0.v;
            data = _yield$withRetry5.data;
            return _context0.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.sessions) ? data.sessions : []);
        }
      }, _callee0);
    }))();
  },
  getAiChecks: function getAiChecks() {
    var _arguments5 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
      var limit, _yield$withRetry6, data;
      return _regenerator().w(function (_context1) {
        while (1) switch (_context1.n) {
          case 0:
            limit = _arguments5.length > 0 && _arguments5[0] !== undefined ? _arguments5[0] : 100;
            _context1.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/ai-checks', {
                params: {
                  limit: limit
                }
              });
            });
          case 1:
            _yield$withRetry6 = _context1.v;
            data = _yield$withRetry6.data;
            return _context1.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.attempts) ? data.attempts : []);
        }
      }, _callee1);
    }))();
  },
  getNotes: function getNotes() {
    var _arguments6 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
      var limit, _yield$withRetry7, data;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.n) {
          case 0:
            limit = _arguments6.length > 0 && _arguments6[0] !== undefined ? _arguments6[0] : 100;
            _context10.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/notes', {
                params: {
                  limit: limit
                }
              });
            });
          case 1:
            _yield$withRetry7 = _context10.v;
            data = _yield$withRetry7.data;
            return _context10.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.notes) ? data.notes : []);
        }
      }, _callee10);
    }))();
  },
  getContacts: function getContacts() {
    var _arguments7 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
      var _ref2, _ref2$limit, limit, _ref2$status, status, _yield$withRetry8, data;
      return _regenerator().w(function (_context11) {
        while (1) switch (_context11.n) {
          case 0:
            _ref2 = _arguments7.length > 0 && _arguments7[0] !== undefined ? _arguments7[0] : {}, _ref2$limit = _ref2.limit, limit = _ref2$limit === void 0 ? 100 : _ref2$limit, _ref2$status = _ref2.status, status = _ref2$status === void 0 ? 'pending' : _ref2$status;
            _context11.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/contacts', {
                params: {
                  limit: limit,
                  status: status
                }
              });
            });
          case 1:
            _yield$withRetry8 = _context11.v;
            data = _yield$withRetry8.data;
            return _context11.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.contacts) ? data.contacts : []);
        }
      }, _callee11);
    }))();
  },
  resolveContact: function resolveContact(id) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
      var _yield$http$patch2, data;
      return _regenerator().w(function (_context12) {
        while (1) switch (_context12.n) {
          case 0:
            _context12.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http.patch("/admin/contacts/".concat(id, "/resolve"));
          case 1:
            _yield$http$patch2 = _context12.v;
            data = _yield$http$patch2.data;
            return _context12.a(2, (data === null || data === void 0 ? void 0 : data.contact) || null);
        }
      }, _callee12);
    }))();
  },
  deleteContact: function deleteContact(id) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13() {
      var _yield$http$delete3, data;
      return _regenerator().w(function (_context13) {
        while (1) switch (_context13.n) {
          case 0:
            _context13.n = 1;
            return _learning__WEBPACK_IMPORTED_MODULE_0__.http["delete"]("/admin/contacts/".concat(id));
          case 1:
            _yield$http$delete3 = _context13.v;
            data = _yield$http$delete3.data;
            return _context13.a(2, !!(data !== null && data !== void 0 && data.deleted));
        }
      }, _callee13);
    }))();
  }
};

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
/* harmony export */   http: () => (/* binding */ http),
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
  _ensureCsrfCookie = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee40() {
    var _ref5,
      _ref5$force,
      force,
      _args40 = arguments;
    return _regenerator().w(function (_context40) {
      while (1) switch (_context40.n) {
        case 0:
          _ref5 = _args40.length > 0 && _args40[0] !== undefined ? _args40[0] : {}, _ref5$force = _ref5.force, force = _ref5$force === void 0 ? false : _ref5$force;
          if (!(!force && readXsrfCookie())) {
            _context40.n = 1;
            break;
          }
          return _context40.a(2);
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
          _context40.n = 2;
          return csrfCookiePromise;
        case 2:
          return _context40.a(2);
      }
    }, _callee40);
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
  _withRetry = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee41(fn) {
    var _ref3,
      _ref3$retries,
      retries,
      _ref3$baseDelay,
      baseDelay,
      attempt,
      _args41 = arguments,
      _t;
    return _regenerator().w(function (_context41) {
      while (1) switch (_context41.p = _context41.n) {
        case 0:
          _ref3 = _args41.length > 1 && _args41[1] !== undefined ? _args41[1] : {}, _ref3$retries = _ref3.retries, retries = _ref3$retries === void 0 ? 3 : _ref3$retries, _ref3$baseDelay = _ref3.baseDelay, baseDelay = _ref3$baseDelay === void 0 ? 800 : _ref3$baseDelay;
          attempt = 0; // eslint-disable-next-line no-constant-condition
        case 1:
          if (false) {}
          _context41.p = 2;
          _context41.n = 3;
          return fn();
        case 3:
          return _context41.a(2, _context41.v);
        case 4:
          _context41.p = 4;
          _t = _context41.v;
          attempt++;
          if (!(attempt > retries || !isRetryable(_t))) {
            _context41.n = 5;
            break;
          }
          throw _t;
        case 5:
          _context41.n = 6;
          return sleep(baseDelay * Math.pow(2, attempt - 1));
        case 6:
          _context41.n = 1;
          break;
        case 7:
          return _context41.a(2);
      }
    }, _callee41, null, [[2, 4]]);
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
  getActivityLog: function getActivityLog() {
    var _arguments2 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
      var limit, _yield$withRetry2, data;
      return _regenerator().w(function (_context4) {
        while (1) switch (_context4.n) {
          case 0:
            limit = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : 100;
            _context4.n = 1;
            return withRetry(function () {
              return http.get('/dashboard/activity', {
                params: {
                  limit: limit
                },
                headers: {
                  'Cache-Control': 'no-cache',
                  Pragma: 'no-cache'
                }
              });
            });
          case 1:
            _yield$withRetry2 = _context4.v;
            data = _yield$withRetry2.data;
            return _context4.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.activity) ? data.activity : []);
        }
      }, _callee4);
    }))();
  },
  // Session ---------------------------------------------------------------
  getSession: function getSession() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
      var _data$session;
      var _yield$http$get, data;
      return _regenerator().w(function (_context5) {
        while (1) switch (_context5.n) {
          case 0:
            _context5.n = 1;
            return http.get('/session');
          case 1:
            _yield$http$get = _context5.v;
            data = _yield$http$get.data;
            return _context5.a(2, (_data$session = data === null || data === void 0 ? void 0 : data.session) !== null && _data$session !== void 0 ? _data$session : null);
        }
      }, _callee5);
    }))();
  },
  getCurrentSession: function getCurrentSession() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
      var _data$session2;
      var _yield$http$get2, data;
      return _regenerator().w(function (_context6) {
        while (1) switch (_context6.n) {
          case 0:
            _context6.n = 1;
            return http.get('/session/current');
          case 1:
            _yield$http$get2 = _context6.v;
            data = _yield$http$get2.data;
            return _context6.a(2, {
              session: (_data$session2 = data === null || data === void 0 ? void 0 : data.session) !== null && _data$session2 !== void 0 ? _data$session2 : null,
              unfinished: !!(data !== null && data !== void 0 && data.unfinished)
            });
        }
      }, _callee6);
    }))();
  },
  getSessionHistory: function getSessionHistory() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
      var _yield$http$get3, data;
      return _regenerator().w(function (_context7) {
        while (1) switch (_context7.n) {
          case 0:
            _context7.n = 1;
            return http.get('/sessions/history');
          case 1:
            _yield$http$get3 = _context7.v;
            data = _yield$http$get3.data;
            return _context7.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.sessions) ? data.sessions : []);
        }
      }, _callee7);
    }))();
  },
  getAiReciteAttempts: function getAiReciteAttempts() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
      var _yield$http$get4, data;
      return _regenerator().w(function (_context8) {
        while (1) switch (_context8.n) {
          case 0:
            _context8.n = 1;
            return http.get('/ai-recite-attempts');
          case 1:
            _yield$http$get4 = _context8.v;
            data = _yield$http$get4.data;
            return _context8.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.attempts) ? data.attempts : []);
        }
      }, _callee8);
    }))();
  },
  saveSession: function saveSession(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
      var _yield$http$post, data;
      return _regenerator().w(function (_context9) {
        while (1) switch (_context9.n) {
          case 0:
            _context9.n = 1;
            return http.post('/session', payload);
          case 1:
            _yield$http$post = _context9.v;
            data = _yield$http$post.data;
            return _context9.a(2, data);
        }
      }, _callee9);
    }))();
  },
  startSession: function startSession() {
    var _arguments3 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
      var payload, _yield$http$post2, data;
      return _regenerator().w(function (_context0) {
        while (1) switch (_context0.n) {
          case 0:
            payload = _arguments3.length > 0 && _arguments3[0] !== undefined ? _arguments3[0] : {};
            _context0.n = 1;
            return http.post('/session/start', payload);
          case 1:
            _yield$http$post2 = _context0.v;
            data = _yield$http$post2.data;
            return _context0.a(2, data);
        }
      }, _callee0);
    }))();
  },
  pauseSession: function pauseSession() {
    var _arguments4 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
      var payload, _yield$http$post3, data;
      return _regenerator().w(function (_context1) {
        while (1) switch (_context1.n) {
          case 0:
            payload = _arguments4.length > 0 && _arguments4[0] !== undefined ? _arguments4[0] : {};
            _context1.n = 1;
            return http.post('/session/pause', payload);
          case 1:
            _yield$http$post3 = _context1.v;
            data = _yield$http$post3.data;
            return _context1.a(2, data);
        }
      }, _callee1);
    }))();
  },
  resumeSession: function resumeSession() {
    var _arguments5 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
      var payload, _yield$http$post4, data;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.n) {
          case 0:
            payload = _arguments5.length > 0 && _arguments5[0] !== undefined ? _arguments5[0] : {};
            _context10.n = 1;
            return http.post('/session/resume', payload);
          case 1:
            _yield$http$post4 = _context10.v;
            data = _yield$http$post4.data;
            return _context10.a(2, data);
        }
      }, _callee10);
    }))();
  },
  endSession: function endSession() {
    var _arguments6 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
      var payload, _yield$http$post5, data;
      return _regenerator().w(function (_context11) {
        while (1) switch (_context11.n) {
          case 0:
            payload = _arguments6.length > 0 && _arguments6[0] !== undefined ? _arguments6[0] : {};
            _context11.n = 1;
            return http.post('/session/end', payload);
          case 1:
            _yield$http$post5 = _context11.v;
            data = _yield$http$post5.data;
            return _context11.a(2, data);
        }
      }, _callee11);
    }))();
  },
  discardOnboardingExampleSession: function discardOnboardingExampleSession() {
    var _arguments7 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
      var payload, _yield$http$post6, data;
      return _regenerator().w(function (_context12) {
        while (1) switch (_context12.n) {
          case 0:
            payload = _arguments7.length > 0 && _arguments7[0] !== undefined ? _arguments7[0] : {};
            _context12.n = 1;
            return http.post('/session', _objectSpread(_objectSpread({}, payload), {}, {
              action: 'discard_example'
            }));
          case 1:
            _yield$http$post6 = _context12.v;
            data = _yield$http$post6.data;
            return _context12.a(2, data);
        }
      }, _callee12);
    }))();
  },
  // Continue --------------------------------------------------------------
  getContinuePosition: function getContinuePosition() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13() {
      var _data$position;
      var _yield$http$get5, data;
      return _regenerator().w(function (_context13) {
        while (1) switch (_context13.n) {
          case 0:
            _context13.n = 1;
            return http.get('/continue');
          case 1:
            _yield$http$get5 = _context13.v;
            data = _yield$http$get5.data;
            return _context13.a(2, (_data$position = data === null || data === void 0 ? void 0 : data.position) !== null && _data$position !== void 0 ? _data$position : null);
        }
      }, _callee13);
    }))();
  },
  saveContinuePosition: function saveContinuePosition(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14() {
      var _yield$http$post7, data;
      return _regenerator().w(function (_context14) {
        while (1) switch (_context14.n) {
          case 0:
            _context14.n = 1;
            return http.post('/continue', payload);
          case 1:
            _yield$http$post7 = _context14.v;
            data = _yield$http$post7.data;
            return _context14.a(2, data);
        }
      }, _callee14);
    }))();
  },
  // Progress --------------------------------------------------------------
  getProgress: function getProgress() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15() {
      var _data$progress;
      var _yield$http$get6, data;
      return _regenerator().w(function (_context15) {
        while (1) switch (_context15.n) {
          case 0:
            _context15.n = 1;
            return http.get('/progress');
          case 1:
            _yield$http$get6 = _context15.v;
            data = _yield$http$get6.data;
            return _context15.a(2, (_data$progress = data === null || data === void 0 ? void 0 : data.progress) !== null && _data$progress !== void 0 ? _data$progress : []);
        }
      }, _callee15);
    }))();
  },
  saveProgress: function saveProgress(items) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee16() {
      var _yield$http$post8, data;
      return _regenerator().w(function (_context16) {
        while (1) switch (_context16.n) {
          case 0:
            _context16.n = 1;
            return http.post('/progress', {
              items: items
            });
          case 1:
            _yield$http$post8 = _context16.v;
            data = _yield$http$post8.data;
            return _context16.a(2, data);
        }
      }, _callee16);
    }))();
  },
  // Private āyah notes & reflections --------------------------------------
  getAyahNotes: function getAyahNotes() {
    var _arguments8 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee17() {
      var params, _yield$http$get7, data;
      return _regenerator().w(function (_context17) {
        while (1) switch (_context17.n) {
          case 0:
            params = _arguments8.length > 0 && _arguments8[0] !== undefined ? _arguments8[0] : {};
            _context17.n = 1;
            return http.get('/ayah-notes', {
              params: params
            });
          case 1:
            _yield$http$get7 = _context17.v;
            data = _yield$http$get7.data;
            return _context17.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.notes) ? data.notes : []);
        }
      }, _callee17);
    }))();
  },
  getAyahNoteCounts: function getAyahNoteCounts(surahNumber) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee18() {
      var _yield$http$get8, data;
      return _regenerator().w(function (_context18) {
        while (1) switch (_context18.n) {
          case 0:
            _context18.n = 1;
            return http.get('/ayah-notes/counts', {
              params: {
                surah_number: Number(surahNumber)
              }
            });
          case 1:
            _yield$http$get8 = _context18.v;
            data = _yield$http$get8.data;
            return _context18.a(2, data !== null && data !== void 0 && data.counts && _typeof(data.counts) === 'object' ? data.counts : {});
        }
      }, _callee18);
    }))();
  },
  createAyahNote: function createAyahNote(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee19() {
      var _data$note;
      var _yield$http$post9, data;
      return _regenerator().w(function (_context19) {
        while (1) switch (_context19.n) {
          case 0:
            _context19.n = 1;
            return http.post('/ayah-notes', payload);
          case 1:
            _yield$http$post9 = _context19.v;
            data = _yield$http$post9.data;
            return _context19.a(2, (_data$note = data === null || data === void 0 ? void 0 : data.note) !== null && _data$note !== void 0 ? _data$note : null);
        }
      }, _callee19);
    }))();
  },
  updateAyahNote: function updateAyahNote(noteId, payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee20() {
      var _data$note2;
      var _yield$http$put, data;
      return _regenerator().w(function (_context20) {
        while (1) switch (_context20.n) {
          case 0:
            _context20.n = 1;
            return http.put("/ayah-notes/".concat(noteId), payload);
          case 1:
            _yield$http$put = _context20.v;
            data = _yield$http$put.data;
            return _context20.a(2, (_data$note2 = data === null || data === void 0 ? void 0 : data.note) !== null && _data$note2 !== void 0 ? _data$note2 : null);
        }
      }, _callee20);
    }))();
  },
  deleteAyahNote: function deleteAyahNote(noteId) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee21() {
      var _yield$http$delete, data;
      return _regenerator().w(function (_context21) {
        while (1) switch (_context21.n) {
          case 0:
            _context21.n = 1;
            return http["delete"]("/ayah-notes/".concat(noteId));
          case 1:
            _yield$http$delete = _context21.v;
            data = _yield$http$delete.data;
            return _context21.a(2, data);
        }
      }, _callee21);
    }))();
  },
  // Analytics -------------------------------------------------------------
  getAnalytics: function getAnalytics() {
    var _arguments9 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee22() {
      var _data$analytics;
      var params, _yield$http$get9, data;
      return _regenerator().w(function (_context22) {
        while (1) switch (_context22.n) {
          case 0:
            params = _arguments9.length > 0 && _arguments9[0] !== undefined ? _arguments9[0] : {};
            _context22.n = 1;
            return http.get('/analytics', {
              params: params
            });
          case 1:
            _yield$http$get9 = _context22.v;
            data = _yield$http$get9.data;
            return _context22.a(2, (_data$analytics = data === null || data === void 0 ? void 0 : data.analytics) !== null && _data$analytics !== void 0 ? _data$analytics : []);
        }
      }, _callee22);
    }))();
  },
  saveAnalytics: function saveAnalytics(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee23() {
      var _yield$http$post0, data;
      return _regenerator().w(function (_context23) {
        while (1) switch (_context23.n) {
          case 0:
            _context23.n = 1;
            return http.post('/analytics', payload);
          case 1:
            _yield$http$post0 = _context23.v;
            data = _yield$http$post0.data;
            return _context23.a(2, data);
        }
      }, _callee23);
    }))();
  },
  // Full-fidelity state blob (live persistence boundary) ------------------
  getState: function getState() {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee24() {
      var _yield$http$get0, data;
      return _regenerator().w(function (_context24) {
        while (1) switch (_context24.n) {
          case 0:
            _context24.n = 1;
            return http.get('/state');
          case 1:
            _yield$http$get0 = _context24.v;
            data = _yield$http$get0.data;
            return _context24.a(2, data !== null && data !== void 0 ? data : {
              state: null,
              meta: {
                has_state: false
              }
            });
        }
      }, _callee24);
    }))();
  },
  saveState: function saveState(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee25() {
      var _yield$http$post1, data;
      return _regenerator().w(function (_context25) {
        while (1) switch (_context25.n) {
          case 0:
            _context25.n = 1;
            return http.post('/state', payload);
          case 1:
            _yield$http$post1 = _context25.v;
            data = _yield$http$post1.data;
            return _context25.a(2, data);
        }
      }, _callee25);
    }))();
  },
  // One-time legacy migration --------------------------------------------
  migrateLocalStorage: function migrateLocalStorage(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee26() {
      var _yield$http$post10, data;
      return _regenerator().w(function (_context26) {
        while (1) switch (_context26.n) {
          case 0:
            _context26.n = 1;
            return http.post('/migrate-local-storage', payload);
          case 1:
            _yield$http$post10 = _context26.v;
            data = _yield$http$post10.data;
            return _context26.a(2, data);
        }
      }, _callee26);
    }))();
  },
  // Personalised next-session recommendations -----------------------------
  getNextRecommendation: function getNextRecommendation() {
    var _arguments0 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee27() {
      var _data$recommendation;
      var params, _yield$http$get1, data;
      return _regenerator().w(function (_context27) {
        while (1) switch (_context27.n) {
          case 0:
            params = _arguments0.length > 0 && _arguments0[0] !== undefined ? _arguments0[0] : {};
            _context27.n = 1;
            return http.get('/recommendations/next', {
              params: params
            });
          case 1:
            _yield$http$get1 = _context27.v;
            data = _yield$http$get1.data;
            return _context27.a(2, (_data$recommendation = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation !== void 0 ? _data$recommendation : null);
        }
      }, _callee27);
    }))();
  },
  startRecommendedSession: function startRecommendedSession(recommendationId) {
    var _arguments1 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee28() {
      var settings, payload, sanitized, _yield$http$post11, data;
      return _regenerator().w(function (_context28) {
        while (1) switch (_context28.n) {
          case 0:
            settings = _arguments1.length > 1 && _arguments1[1] !== undefined ? _arguments1[1] : null;
            payload = {
              recommendation_id: recommendationId
            };
            sanitized = sanitizeRecommendationSettings(settings);
            if (sanitized) {
              payload.settings = sanitized;
            }
            _context28.n = 1;
            return http.post('/recommendations/start', payload);
          case 1:
            _yield$http$post11 = _context28.v;
            data = _yield$http$post11.data;
            return _context28.a(2, data);
        }
      }, _callee28);
    }))();
  },
  rejectRecommendation: function rejectRecommendation(recommendationId) {
    var _arguments10 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee29() {
      var choseOther, _yield$http$post12, data;
      return _regenerator().w(function (_context29) {
        while (1) switch (_context29.n) {
          case 0:
            choseOther = _arguments10.length > 1 && _arguments10[1] !== undefined ? _arguments10[1] : true;
            _context29.n = 1;
            return http.post('/recommendations/reject', {
              recommendation_id: recommendationId,
              chose_other: choseOther
            });
          case 1:
            _yield$http$post12 = _context29.v;
            data = _yield$http$post12.data;
            return _context29.a(2, data);
        }
      }, _callee29);
    }))();
  },
  submitRecommendationConfidence: function submitRecommendationConfidence(recommendationId, confidence) {
    var _arguments11 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee30() {
      var _data$recommendation2;
      var extras, _yield$http$post13, data;
      return _regenerator().w(function (_context30) {
        while (1) switch (_context30.n) {
          case 0:
            extras = _arguments11.length > 2 && _arguments11[2] !== undefined ? _arguments11[2] : {};
            _context30.n = 1;
            return http.post('/recommendations/confidence', {
              recommendation_id: recommendationId,
              confidence: confidence,
              plan_detail: extras !== null && extras !== void 0 && extras.plan_detail && _typeof(extras.plan_detail) === 'object' ? extras.plan_detail : undefined,
              ayah_range: extras !== null && extras !== void 0 && extras.ayah_range && _typeof(extras.ayah_range) === 'object' ? extras.ayah_range : undefined,
              focus_ayahs: Array.isArray(extras === null || extras === void 0 ? void 0 : extras.focus_ayahs) ? extras.focus_ayahs : undefined
            });
          case 1:
            _yield$http$post13 = _context30.v;
            data = _yield$http$post13.data;
            return _context30.a(2, (_data$recommendation2 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation2 !== void 0 ? _data$recommendation2 : null);
        }
      }, _callee30);
    }))();
  },
  saveRecommendationSettings: function saveRecommendationSettings(recommendationId, settings) {
    var _arguments12 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee31() {
      var _data$recommendation3;
      var reset, payload, _yield$http$post14, data;
      return _regenerator().w(function (_context31) {
        while (1) switch (_context31.n) {
          case 0:
            reset = _arguments12.length > 2 && _arguments12[2] !== undefined ? _arguments12[2] : false;
            payload = {
              recommendation_id: recommendationId,
              reset: !!reset
            };
            if (!reset) {
              payload.settings = sanitizeRecommendationSettings(settings) || {};
            }
            _context31.n = 1;
            return http.post('/recommendations/settings', payload);
          case 1:
            _yield$http$post14 = _context31.v;
            data = _yield$http$post14.data;
            return _context31.a(2, (_data$recommendation3 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation3 !== void 0 ? _data$recommendation3 : null);
        }
      }, _callee31);
    }))();
  },
  submitRecommendationAiAssessment: function submitRecommendationAiAssessment(recommendationId, assessment) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee32() {
      var _data$recommendation4;
      var colorCounts, _yield$http$post15, data;
      return _regenerator().w(function (_context32) {
        while (1) switch (_context32.n) {
          case 0:
            colorCounts = assessment !== null && assessment !== void 0 && assessment.color_counts && _typeof(assessment.color_counts) === 'object' ? assessment.color_counts : undefined;
            _context32.n = 1;
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
            _yield$http$post15 = _context32.v;
            data = _yield$http$post15.data;
            return _context32.a(2, (_data$recommendation4 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation4 !== void 0 ? _data$recommendation4 : null);
        }
      }, _callee32);
    }))();
  },
  getRecommendationHistory: function getRecommendationHistory() {
    var _arguments13 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee33() {
      var limit, _yield$http$get10, data;
      return _regenerator().w(function (_context33) {
        while (1) switch (_context33.n) {
          case 0:
            limit = _arguments13.length > 0 && _arguments13[0] !== undefined ? _arguments13[0] : 20;
            _context33.n = 1;
            return http.get('/recommendations/history', {
              params: {
                limit: Math.max(1, Math.min(50, Number(limit) || 20))
              }
            });
          case 1:
            _yield$http$get10 = _context33.v;
            data = _yield$http$get10.data;
            return _context33.a(2, Array.isArray(data === null || data === void 0 ? void 0 : data.history) ? data.history : []);
        }
      }, _callee33);
    }))();
  },
  createMemorisationAssessment: function createMemorisationAssessment(payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee34() {
      var _yield$http$post16, data;
      return _regenerator().w(function (_context34) {
        while (1) switch (_context34.n) {
          case 0:
            _context34.n = 1;
            return http.post('/memorisation/assessments', payload);
          case 1:
            _yield$http$post16 = _context34.v;
            data = _yield$http$post16.data;
            return _context34.a(2, data);
        }
      }, _callee34);
    }))();
  },
  adjustMemorisationPracticePlan: function adjustMemorisationPracticePlan(planId, adjustments) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee35() {
      var _data$practice_plan;
      var _yield$http$patch, data;
      return _regenerator().w(function (_context35) {
        while (1) switch (_context35.n) {
          case 0:
            _context35.n = 1;
            return http.patch("/memorisation/practice-plans/".concat(planId), adjustments);
          case 1:
            _yield$http$patch = _context35.v;
            data = _yield$http$patch.data;
            return _context35.a(2, (_data$practice_plan = data === null || data === void 0 ? void 0 : data.practice_plan) !== null && _data$practice_plan !== void 0 ? _data$practice_plan : data);
        }
      }, _callee35);
    }))();
  },
  startMemorisationPracticePlan: function startMemorisationPracticePlan(planId) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee36() {
      var _yield$http$post17, data;
      return _regenerator().w(function (_context36) {
        while (1) switch (_context36.n) {
          case 0:
            _context36.n = 1;
            return http.post("/memorisation/practice-plans/".concat(planId, "/start"));
          case 1:
            _yield$http$post17 = _context36.v;
            data = _yield$http$post17.data;
            return _context36.a(2, data);
        }
      }, _callee36);
    }))();
  },
  completeMemorisationPracticePlan: function completeMemorisationPracticePlan(planId) {
    var _arguments14 = arguments;
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee37() {
      var _data$practice_plan2;
      var completion, _yield$http$post18, data;
      return _regenerator().w(function (_context37) {
        while (1) switch (_context37.n) {
          case 0:
            completion = _arguments14.length > 1 && _arguments14[1] !== undefined ? _arguments14[1] : {};
            _context37.n = 1;
            return http.post("/memorisation/practice-plans/".concat(planId, "/complete"), completion);
          case 1:
            _yield$http$post18 = _context37.v;
            data = _yield$http$post18.data;
            return _context37.a(2, (_data$practice_plan2 = data === null || data === void 0 ? void 0 : data.practice_plan) !== null && _data$practice_plan2 !== void 0 ? _data$practice_plan2 : data);
        }
      }, _callee37);
    }))();
  },
  retestMemorisationPracticePlan: function retestMemorisationPracticePlan(planId, payload) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee38() {
      var _yield$http$post19, data;
      return _regenerator().w(function (_context38) {
        while (1) switch (_context38.n) {
          case 0:
            _context38.n = 1;
            return http.post("/memorisation/practice-plans/".concat(planId, "/retest"), payload);
          case 1:
            _yield$http$post19 = _context38.v;
            data = _yield$http$post19.data;
            return _context38.a(2, data);
        }
      }, _callee38);
    }))();
  },
  submitRecommendationAdaptiveAssessment: function submitRecommendationAdaptiveAssessment(recommendationId, assessment) {
    return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee39() {
      var _data$recommendation5;
      var _yield$http$post20, data;
      return _regenerator().w(function (_context39) {
        while (1) switch (_context39.n) {
          case 0:
            _context39.n = 1;
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
            _yield$http$post20 = _context39.v;
            data = _yield$http$post20.data;
            return _context39.a(2, (_data$recommendation5 = data === null || data === void 0 ? void 0 : data.recommendation) !== null && _data$recommendation5 !== void 0 ? _data$recommendation5 : null);
        }
      }, _callee39);
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

/***/ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/AdminDashboard.css":
/*!*******************************************************************************************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/AdminDashboard.css ***!
  \*******************************************************************************************************************************************************************************/
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
___CSS_LOADER_EXPORT___.push([module.id, "/* Admin ops console — shares user-dashboard tokens & look */\n.admin-console {\n  --dash-cream: #f2ebe3;\n  --dash-sand: #e8ded1;\n  --dash-ink: #3c3530;\n  --dash-muted: #6d6258;\n  --dash-line: rgba(60, 53, 48, 0.14);\n  --dash-soft: #faf6f1;\n  --dash-card: #fffdfb;\n  --dash-shadow: 0 1px 2px rgba(60, 53, 48, 0.05), 0 10px 24px rgba(60, 53, 48, 0.07);\n  --dash-shadow-soft: 0 1px 2px rgba(60, 53, 48, 0.04), 0 6px 14px rgba(60, 53, 48, 0.05);\n  --dash-ease: var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));\n  --dash-radius: 18px;\n  --dash-radius-sm: 12px;\n  --dash-font: var(--font-ui, \"Avenir Next\", \"Segoe UI\", sans-serif);\n  --dash-serif: \"Iowan Old Style\", \"Palatino Linotype\", Palatino, Georgia, \"Times New Roman\", serif;\n  --dash-danger: #8b4a3c;\n  min-height: calc(100vh - 4.5rem);\n  padding: 1.25rem 0 2.5rem;\n  color: var(--dash-ink);\n  font-family: var(--dash-font);\n  font-size: 0.92rem;\n  font-weight: 400;\n  line-height: 1.45;\n  background:\n    radial-gradient(80% 45% at 8% 0%, color-mix(in srgb, var(--dash-sand) 55%, transparent), transparent 68%),\n    var(--dash-cream);\n}\n\nhtml[data-theme=\"dark\"] .admin-console {\n  --dash-cream: #171411;\n  --dash-sand: #2a241f;\n  --dash-ink: #f0e7dc;\n  --dash-muted: #b7a99a;\n  --dash-line: rgba(240, 231, 220, 0.12);\n  --dash-soft: #1e1a16;\n  --dash-card: #221e1a;\n  --dash-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 28px rgba(0, 0, 0, 0.28);\n  --dash-shadow-soft: 0 1px 2px rgba(0, 0, 0, 0.24), 0 8px 16px rgba(0, 0, 0, 0.2);\n  --dash-danger: #e0a090;\n}\n\n.admin-console__shell {\n  width: 100%;\n  max-width: 960px;\n  margin-inline: auto;\n  padding-inline: clamp(1rem, 3vw, 1.35rem);\n  display: grid;\n  gap: 0.85rem;\n}\n\n.admin-console__state {\n  display: grid;\n  place-items: center;\n  gap: 0.55rem;\n  min-height: 8.5rem;\n  padding: 1.5rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow-soft);\n  color: var(--dash-muted);\n  text-align: center;\n}\n\n.admin-console__state--error { color: var(--dash-danger); }\n\n.admin-spinner {\n  width: 1.2rem;\n  height: 1.2rem;\n  border-radius: 50%;\n  border: 2px solid color-mix(in srgb, var(--dash-sand) 80%, transparent);\n  border-top-color: var(--dash-ink);\n  animation: admin-spin 0.7s linear infinite;\n}\n\n.is-spinning {\n  display: inline-block;\n  animation: admin-spin 0.8s linear infinite;\n}\n\n@keyframes admin-spin {\n  to { transform: rotate(360deg); }\n}\n\n.admin-console__top {\n  display: grid;\n  gap: 1rem;\n  padding: 1.15rem 1.2rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: linear-gradient(165deg, var(--dash-soft), var(--dash-card) 55%);\n  box-shadow: var(--dash-shadow);\n}\n\n@media (min-width: 720px) {\n  .admin-console__top {\n    grid-template-columns: minmax(0, 1fr) auto;\n    align-items: start;\n  }\n\n  .admin-kpis {\n    grid-column: 1 / -1;\n  }\n}\n\n.admin-console__eyebrow {\n  display: block;\n  margin: 0;\n  font-size: 0.72rem;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--dash-muted);\n}\n\n.admin-console__brand h1 {\n  margin: 0.3rem 0 0;\n  font-family: var(--dash-serif);\n  font-size: clamp(1.55rem, 3.2vw, 2rem);\n  font-weight: 500;\n  letter-spacing: -0.02em;\n  line-height: 1.15;\n  color: var(--dash-ink);\n}\n\n.admin-console__top-actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.45rem;\n}\n\n.admin-kpis {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0.65rem;\n}\n\n@media (min-width: 560px) {\n  .admin-kpis {\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }\n}\n\n@media (min-width: 900px) {\n  .admin-kpis {\n    grid-template-columns: repeat(5, minmax(0, 1fr));\n  }\n}\n\n.admin-kpi {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  box-shadow: var(--dash-shadow-soft);\n  padding: 0.8rem 0.85rem;\n  text-align: left;\n  cursor: pointer;\n  color: inherit;\n  font: inherit;\n  display: grid;\n  gap: 0.2rem;\n  transition: background 140ms var(--dash-ease), border-color 140ms var(--dash-ease);\n}\n\n.admin-kpi:hover,\n.admin-kpi:focus-visible {\n  background: var(--dash-card);\n  border-color: color-mix(in srgb, var(--dash-line) 55%, var(--dash-ink));\n}\n\n.admin-kpi strong {\n  font-size: 1.25rem;\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n  line-height: 1.1;\n  color: var(--dash-ink);\n}\n\n.admin-kpi span {\n  color: var(--dash-muted);\n  font-size: 0.72rem;\n  font-weight: 500;\n  line-height: 1.25;\n}\n\n.admin-tabs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.25rem;\n  padding: 0.22rem;\n  border: 1px solid var(--dash-line);\n  border-radius: 999px;\n  background: var(--dash-soft);\n  width: -moz-fit-content;\n  width: fit-content;\n  max-width: 100%;\n}\n\n.admin-tabs__btn {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--dash-muted);\n  border-radius: 999px;\n  padding: 0.4rem 0.85rem;\n  font: inherit;\n  font-size: 0.8rem;\n  font-weight: 500;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n}\n\n.admin-tabs__btn em {\n  font-style: normal;\n  font-size: 0.7rem;\n  padding: 0.05rem 0.4rem;\n  border-radius: 999px;\n  background: var(--dash-sand);\n  color: var(--dash-ink);\n}\n\n.admin-tabs__btn.is-active {\n  background: var(--dash-card);\n  color: var(--dash-ink);\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-workspace {\n  display: grid;\n  gap: 1rem;\n  min-height: min(68vh, 42rem);\n}\n\n@media (min-width: 960px) {\n  .admin-workspace {\n    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);\n    align-items: stretch;\n  }\n}\n\n.admin-list-pane,\n.admin-detail-pane,\n.admin-panel {\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow);\n  padding: 1.1rem 1.15rem;\n  min-width: 0;\n}\n\n.admin-list-pane {\n  display: grid;\n  grid-template-rows: auto auto auto 1fr;\n  gap: 0.75rem;\n  min-height: 20rem;\n}\n\n.admin-toolbar {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 0.5rem;\n}\n\n@media (min-width: 640px) {\n  .admin-toolbar {\n    grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr));\n  }\n}\n\n@media (min-width: 900px) {\n  .admin-toolbar {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n}\n\n.admin-toolbar__search,\n.admin-toolbar__select,\n.admin-form input,\n.admin-form select {\n  width: 100%;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  color: var(--dash-ink);\n  font: inherit;\n  font-size: 0.86rem;\n  padding: 0.55rem 0.75rem;\n}\n\n@media (min-width: 900px) {\n  .admin-toolbar__search {\n    flex: 1 1 12rem;\n    width: auto;\n    min-width: 10rem;\n  }\n\n  .admin-toolbar__select {\n    width: auto;\n    flex: 0 1 auto;\n    min-width: 8rem;\n  }\n}\n\n.admin-bulkbar {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.65rem 0.75rem;\n  border-radius: var(--dash-radius-sm);\n  border: 1px solid var(--dash-line);\n  background: var(--dash-soft);\n  font-size: 0.8rem;\n  color: var(--dash-ink);\n}\n\n.admin-bulkbar .admin-toolbar__select {\n  width: auto;\n  min-width: 7.5rem;\n  padding: 0.4rem 0.6rem;\n}\n\n.admin-table-meta {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: 0.55rem 0.85rem;\n  color: var(--dash-muted);\n  font-size: 0.78rem;\n}\n\n.admin-check {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  cursor: pointer;\n}\n\n.admin-table-wrap {\n  overflow: auto;\n  min-height: 0;\n  max-height: min(56vh, 34rem);\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  -webkit-overflow-scrolling: touch;\n}\n\n.admin-table {\n  width: 100%;\n  border-collapse: collapse;\n  min-width: 560px;\n}\n\n.admin-table th,\n.admin-table td {\n  padding: 0.65rem 0.55rem;\n  border-bottom: 1px solid var(--dash-line);\n  text-align: left;\n  vertical-align: top;\n}\n\n.admin-table th {\n  position: sticky;\n  top: 0;\n  z-index: 1;\n  background: var(--dash-soft);\n  color: var(--dash-muted);\n  font-size: 0.68rem;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n\n.admin-table tbody tr {\n  cursor: pointer;\n}\n\n.admin-table tbody tr:hover,\n.admin-table tbody tr.is-selected {\n  background: var(--dash-soft);\n}\n\n.admin-table__check { width: 2rem; }\n\n.admin-table__who {\n  display: grid;\n  gap: 0.12rem;\n}\n\n.admin-table__who strong {\n  font-size: 0.88rem;\n  font-weight: 550;\n  color: var(--dash-ink);\n}\n\n.admin-table__who span {\n  color: var(--dash-muted);\n  font-size: 0.74rem;\n  word-break: break-word;\n}\n\n.admin-num {\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n  font-size: 0.82rem;\n}\n\n.admin-pill {\n  display: inline-flex;\n  padding: 0.16rem 0.45rem;\n  border-radius: 999px;\n  border: 1px solid var(--dash-line);\n  background: var(--dash-soft);\n  color: var(--dash-muted);\n  font-size: 0.7rem;\n  font-weight: 500;\n}\n\n.admin-detail-pane {\n  display: none;\n  overflow: auto;\n  max-height: min(68vh, 42rem);\n}\n\n@media (min-width: 960px) {\n  .admin-detail-pane {\n    display: block;\n  }\n\n  .admin-detail__back {\n    display: none;\n  }\n}\n\n.admin-detail-pane.is-open {\n  display: block;\n  position: fixed;\n  inset: 0;\n  z-index: 70;\n  max-height: none;\n  border-radius: 0;\n  padding: 1.15rem 1.15rem 1.75rem;\n  overflow: auto;\n}\n\n@media (min-width: 960px) {\n  .admin-detail-pane.is-open {\n    position: static;\n    border-radius: var(--dash-radius);\n    padding: 1.1rem 1.15rem;\n  }\n}\n\n.admin-detail-empty {\n  display: grid;\n  place-items: center;\n  min-height: 12rem;\n  color: var(--dash-muted);\n  text-align: center;\n  padding: 1rem;\n}\n\n.admin-detail__head {\n  display: grid;\n  gap: 0.4rem;\n  margin-bottom: 0.9rem;\n  padding-bottom: 0.85rem;\n  border-bottom: 1px solid var(--dash-line);\n}\n\n.admin-detail__head h2 {\n  margin: 0;\n  font-family: var(--dash-serif);\n  font-size: 1.25rem;\n  font-weight: 500;\n}\n\n.admin-detail__head p {\n  margin: 0;\n  color: var(--dash-muted);\n  font-size: 0.84rem;\n  word-break: break-word;\n}\n\n.admin-detail__body {\n  display: grid;\n  gap: 1rem;\n}\n\n.admin-statstrip {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0.5rem;\n}\n\n@media (min-width: 480px) {\n  .admin-statstrip {\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }\n}\n\n.admin-statstrip > div {\n  padding: 0.65rem 0.7rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  display: grid;\n  gap: 0.12rem;\n}\n\n.admin-statstrip strong {\n  font-size: 1rem;\n  font-variant-numeric: tabular-nums;\n  color: var(--dash-ink);\n}\n\n.admin-statstrip span {\n  color: var(--dash-muted);\n  font-size: 0.68rem;\n  font-weight: 500;\n}\n\n.admin-detail__position {\n  margin: 0;\n  color: var(--dash-muted);\n  font-size: 0.84rem;\n}\n\n.admin-form {\n  display: grid;\n  gap: 0.75rem;\n}\n\n.admin-form__grid {\n  display: grid;\n  gap: 0.65rem;\n}\n\n@media (min-width: 520px) {\n  .admin-form__grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n\n  .admin-form__full {\n    grid-column: 1 / -1;\n  }\n}\n\n.admin-form label {\n  display: grid;\n  gap: 0.28rem;\n}\n\n.admin-form label > span {\n  color: var(--dash-muted);\n  font-size: 0.72rem;\n  font-weight: 600;\n}\n\n.admin-form__actions {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n  gap: 0.45rem;\n}\n\n.admin-form__error {\n  margin: 0;\n  color: var(--dash-danger);\n  font-size: 0.82rem;\n}\n\n.admin-form__ok {\n  margin: 0;\n  color: var(--dash-muted);\n  font-size: 0.82rem;\n}\n\n.admin-block {\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  padding: 0.65rem 0.8rem;\n}\n\n.admin-block summary {\n  cursor: pointer;\n  font-size: 0.72rem;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--dash-muted);\n}\n\n.admin-mini {\n  list-style: none;\n  margin: 0.55rem 0 0;\n  padding: 0;\n  display: grid;\n  gap: 0.4rem;\n}\n\n.admin-mini > li,\n.admin-mini__row {\n  display: flex;\n  justify-content: space-between;\n  gap: 0.65rem;\n  font-size: 0.8rem;\n}\n\n.admin-mini--stack {\n  flex-direction: column;\n}\n\n.admin-muted {\n  color: var(--dash-muted);\n  font-size: 0.8rem;\n  margin: 0.35rem 0 0;\n}\n\n.admin-danger {\n  padding: 0.85rem 0.9rem;\n  border-radius: var(--dash-radius-sm);\n  border: 1px solid color-mix(in srgb, var(--dash-danger) 28%, var(--dash-line));\n  background: color-mix(in srgb, var(--dash-danger) 6%, var(--dash-soft));\n}\n\n.admin-danger h3 {\n  margin: 0 0 0.3rem;\n  font-size: 0.78rem;\n  color: var(--dash-danger);\n}\n\n.admin-danger p {\n  margin: 0 0 0.65rem;\n  color: var(--dash-muted);\n  font-size: 0.8rem;\n}\n\n.admin-panel__head {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.65rem 1rem;\n  margin-bottom: 0.85rem;\n  padding-bottom: 0.75rem;\n  border-bottom: 1px solid var(--dash-line);\n}\n\n.admin-panel__head h2 {\n  margin: 0;\n  font-family: var(--dash-serif);\n  font-size: 1.2rem;\n  font-weight: 500;\n}\n\n.admin-feed-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  gap: 0.55rem;\n}\n\n.admin-feed-card {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  gap: 0.75rem;\n  padding: 0.85rem 0.9rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n}\n\n.admin-feed-card strong {\n  display: block;\n  font-size: 0.9rem;\n  font-weight: 500;\n  color: var(--dash-ink);\n}\n\n.admin-feed-card p {\n  margin: 0.2rem 0 0;\n  font-size: 0.8rem;\n  color: var(--dash-muted);\n}\n\n.admin-feed-card__actions {\n  display: inline-flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.4rem;\n}\n\n.admin-feed-card--button {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  width: 100%;\n  border: 1px solid var(--dash-line);\n  background: var(--dash-soft);\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr) auto;\n  align-items: start;\n  gap: 0.6rem;\n  padding: 0.85rem 0.9rem;\n  border-radius: var(--dash-radius-sm);\n}\n\n.admin-feed-card--button:hover:not(:disabled),\n.admin-feed-card--button:focus-visible:not(:disabled) {\n  background: var(--dash-card);\n  border-color: color-mix(in srgb, var(--dash-line) 55%, var(--dash-ink));\n}\n\n.admin-feed-card__main {\n  display: grid;\n  gap: 0.15rem;\n  min-width: 0;\n}\n\n.admin-type {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.16rem 0.42rem;\n  border-radius: 999px;\n  border: 1px solid var(--dash-line);\n  background: var(--dash-card);\n  color: var(--dash-muted);\n  font-size: 0.64rem;\n  font-weight: 600;\n  text-transform: uppercase;\n  white-space: nowrap;\n}\n\n.admin-filters {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n}\n\n.admin-empty {\n  margin: 0;\n  padding: 1.5rem 0.75rem;\n  text-align: center;\n  color: var(--dash-muted);\n  font-size: 0.86rem;\n}\n\n.admin-btn,\n.admin-icon-btn {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 1px solid transparent;\n  font: inherit;\n  cursor: pointer;\n  transition: background 140ms var(--dash-ease), border-color 140ms var(--dash-ease), color 140ms var(--dash-ease);\n}\n\n.admin-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.3rem;\n  min-height: 2.15rem;\n  padding: 0.4rem 0.95rem;\n  border-radius: 999px;\n  font-weight: 500;\n  font-size: 0.84rem;\n  background: var(--dash-card);\n  border-color: var(--dash-line);\n  color: var(--dash-ink);\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-btn--sm {\n  min-height: 1.85rem;\n  padding: 0.25rem 0.75rem;\n  font-size: 0.76rem;\n  font-weight: 450;\n}\n\n.admin-btn--ghost {\n  background: var(--dash-card);\n  border-color: var(--dash-line);\n  color: var(--dash-ink);\n  font-weight: 450;\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-btn--ghost:hover,\n.admin-btn--ghost:focus-visible,\n.admin-btn.is-active {\n  background: var(--dash-sand);\n  border-color: rgba(60, 53, 48, 0.2);\n  color: var(--dash-ink);\n}\n\nhtml[data-theme=\"dark\"] .admin-btn--ghost:hover,\nhtml[data-theme=\"dark\"] .admin-btn--ghost:focus-visible,\nhtml[data-theme=\"dark\"] .admin-btn.is-active {\n  border-color: var(--dash-line);\n}\n\n.admin-btn--primary {\n  background: var(--dash-ink);\n  color: var(--dash-cream);\n  border-color: var(--dash-ink);\n  box-shadow: none;\n}\n\n.admin-btn--primary:hover,\n.admin-btn--primary:focus-visible {\n  color: var(--dash-cream);\n  background: #2d2824;\n}\n\nhtml[data-theme=\"dark\"] .admin-btn--primary:hover,\nhtml[data-theme=\"dark\"] .admin-btn--primary:focus-visible {\n  background: #f7efe4;\n  color: #171411;\n  border-color: #f7efe4;\n}\n\n.admin-btn--danger {\n  background: transparent;\n  border-color: color-mix(in srgb, var(--dash-danger) 40%, var(--dash-line));\n  color: var(--dash-danger);\n  box-shadow: none;\n}\n\n.admin-btn--danger:hover,\n.admin-btn--danger:focus-visible {\n  background: color-mix(in srgb, var(--dash-danger) 8%, var(--dash-soft));\n}\n\n.admin-icon-btn {\n  display: inline-grid;\n  place-items: center;\n  width: 2.35rem;\n  height: 2.35rem;\n  border-radius: 999px;\n  border: 1px solid var(--dash-line);\n  background: var(--dash-card);\n  color: var(--dash-muted);\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-icon-btn:hover,\n.admin-icon-btn:focus-visible {\n  color: var(--dash-ink);\n  background: var(--dash-sand);\n}\n\n.admin-btn:disabled,\n.admin-icon-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.admin-link {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--dash-muted);\n  font: inherit;\n  font-size: 0.8rem;\n  font-weight: 500;\n  cursor: pointer;\n  text-decoration: none;\n  padding: 0.15rem 0 0;\n}\n\n.admin-link:hover,\n.admin-link:focus-visible {\n  color: var(--dash-ink);\n  text-decoration: underline;\n}\n\n.admin-modal-root {\n  position: fixed;\n  inset: 0;\n  z-index: 90;\n  display: grid;\n  place-items: center;\n  padding: 1rem;\n}\n\n.admin-modal__backdrop {\n  position: absolute;\n  inset: 0;\n  border: 0;\n  background: rgba(30, 24, 18, 0.42);\n  cursor: pointer;\n}\n\nhtml[data-theme=\"dark\"] .admin-modal__backdrop {\n  background: rgba(0, 0, 0, 0.55);\n}\n\n.admin-modal {\n  position: relative;\n  z-index: 1;\n  width: min(28rem, 100%);\n  max-height: min(90vh, 40rem);\n  overflow: auto;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow);\n  padding: 1.15rem 1.2rem;\n  display: grid;\n  gap: 0.9rem;\n}\n\n.admin-modal__head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n}\n\n.admin-modal__head h2 {\n  margin: 0;\n  font-family: var(--dash-serif);\n  font-size: 1.2rem;\n  font-weight: 500;\n}\n\n@media (max-width: 479px) {\n  .admin-btn__label {\n    display: none;\n  }\n\n  .admin-console__top {\n    padding: 1rem;\n  }\n\n  .admin-list-pane,\n  .admin-panel {\n    padding: 0.95rem;\n  }\n\n  .admin-feed-card--button {\n    grid-template-columns: auto minmax(0, 1fr);\n  }\n\n  .admin-feed-card--button time {\n    grid-column: 2;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .admin-spinner,\n  .is-spinning,\n  .admin-btn,\n  .admin-icon-btn,\n  .admin-kpi {\n    animation: none !important;\n    transition: none !important;\n  }\n}\n", ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./resources/js/views/AdminDashboard.css":
/*!***********************************************!*\
  !*** ./resources/js/views/AdminDashboard.css ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_AdminDashboard_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./AdminDashboard.css */ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./resources/js/views/AdminDashboard.css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_AdminDashboard_css__WEBPACK_IMPORTED_MODULE_1__["default"], options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_AdminDashboard_css__WEBPACK_IMPORTED_MODULE_1__["default"].locals || {});

/***/ }),

/***/ "./resources/js/views/AdminDashboard.vue":
/*!***********************************************!*\
  !*** ./resources/js/views/AdminDashboard.vue ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _AdminDashboard_vue_vue_type_template_id_3d7b4864__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AdminDashboard.vue?vue&type=template&id=3d7b4864 */ "./resources/js/views/AdminDashboard.vue?vue&type=template&id=3d7b4864");
/* harmony import */ var _AdminDashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AdminDashboard.vue?vue&type=script&lang=js */ "./resources/js/views/AdminDashboard.vue?vue&type=script&lang=js");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;
const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_2__["default"])(_AdminDashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_AdminDashboard_vue_vue_type_template_id_3d7b4864__WEBPACK_IMPORTED_MODULE_0__.render],['__file',"resources/js/views/AdminDashboard.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/views/AdminDashboard.vue?vue&type=script&lang=js":
/*!***********************************************************************!*\
  !*** ./resources/js/views/AdminDashboard.vue?vue&type=script&lang=js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AdminDashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AdminDashboard_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AdminDashboard.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/AdminDashboard.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/views/AdminDashboard.vue?vue&type=template&id=3d7b4864":
/*!*****************************************************************************!*\
  !*** ./resources/js/views/AdminDashboard.vue?vue&type=template&id=3d7b4864 ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AdminDashboard_vue_vue_type_template_id_3d7b4864__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_AdminDashboard_vue_vue_type_template_id_3d7b4864__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./AdminDashboard.vue?vue&type=template&id=3d7b4864 */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/views/AdminDashboard.vue?vue&type=template&id=3d7b4864");


/***/ })

}]);