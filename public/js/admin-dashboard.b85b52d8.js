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
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }


var emptyEdit = function emptyEdit() {
  return {
    name: '',
    email: '',
    subscription_status: 'none'
  };
};
var emptyCreate = function emptyCreate() {
  return {
    name: '',
    email: '',
    subscription_tier: 'none',
    note: ''
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
    var _initial$meta;
    var initial = this.sanitizePayload(this.initialData);
    return {
      data: initial,
      bootLoading: !initial,
      bootError: false,
      refreshing: false,
      chartDays: Number(initial === null || initial === void 0 || (_initial$meta = initial.meta) === null || _initial$meta === void 0 ? void 0 : _initial$meta.chart_days) === 7 ? 7 : 30,
      users: [],
      usersTotal: 0,
      usersPage: 1,
      usersPerPage: 25,
      usersTotalPages: 1,
      usersLoading: false,
      usersError: false,
      usersRequestId: 0,
      searchTimer: null,
      filters: {
        q: '',
        activity: '',
        progress: ''
      },
      sortKey: 'last_active',
      sortDir: 'desc',
      rowMenuId: null,
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
      editFormBaseline: emptyEdit(),
      formSaving: false,
      formError: '',
      deletingUser: false,
      drawerOpen: false,
      createOpen: false,
      createForm: emptyCreate(),
      createSaving: false,
      createError: '',
      deleteOpen: false,
      deleteConfirmName: '',
      confirmOpen: false,
      confirmKind: '',
      confirmRow: null,
      confirmBusy: false,
      toastMessage: '',
      toastTimer: null,
      subscriptionOptions: ['none', 'trialing', 'active', 'canceled', 'past_due'],
      tierOptions: ['none', 'free', 'pro']
    };
  },
  computed: {
    ownerId: function ownerId() {
      var _this$auth;
      return Number(((_this$auth = this.auth) === null || _this$auth === void 0 ? void 0 : _this$auth.id) || 0);
    },
    greetingName: function greetingName() {
      var _this$auth2, _this$data;
      var name = String(((_this$auth2 = this.auth) === null || _this$auth2 === void 0 ? void 0 : _this$auth2.name) || ((_this$data = this.data) === null || _this$data === void 0 || (_this$data = _this$data.meta) === null || _this$data === void 0 ? void 0 : _this$data.greeting_name) || '').trim();
      return name || this.t('admin.dear_friend');
    },
    isSelfSelected: function isSelfSelected() {
      return !!this.selectedUserId && Number(this.selectedUserId) === this.ownerId;
    },
    contactInboxUrl: function contactInboxUrl() {
      var _this$auth3, _this$data2;
      return ((_this$auth3 = this.auth) === null || _this$auth3 === void 0 ? void 0 : _this$auth3.contact_inbox_url) || ((_this$data2 = this.data) === null || _this$data2 === void 0 || (_this$data2 = _this$data2.contacts) === null || _this$data2 === void 0 ? void 0 : _this$data2.view_all_href) || '/admin/contact-messages';
    },
    snapshotCards: function snapshotCards() {
      var _this$data3, _snapshot$users_total, _snapshot$active_user, _snapshot$active_user2, _snapshot$active_user3, _snapshot$users_total2, _snapshot$users_total3, _snapshot$active_user4, _snapshot$active_user5, _snapshot$active_user6, _snapshot$memorised_a, _snapshot$memorised_a2, _snapshot$memorised_a3, _snapshot$sessions_co, _snapshot$sessions_co2, _snapshot$sessions_co3, _snapshot$pending_con, _snapshot$pending_con2, _snapshot$pending_con3;
      var snapshot = ((_this$data3 = this.data) === null || _this$data3 === void 0 ? void 0 : _this$data3.snapshot) || {};
      var usersTotal = Number(((_snapshot$users_total = snapshot.users_total) === null || _snapshot$users_total === void 0 ? void 0 : _snapshot$users_total.value) || 0);
      var activeShare = Number((_snapshot$active_user = (_snapshot$active_user2 = snapshot.active_users) === null || _snapshot$active_user2 === void 0 ? void 0 : _snapshot$active_user2.share_of_users) !== null && _snapshot$active_user !== void 0 ? _snapshot$active_user : usersTotal > 0 ? Number(((_snapshot$active_user3 = snapshot.active_users) === null || _snapshot$active_user3 === void 0 ? void 0 : _snapshot$active_user3.value) || 0) / usersTotal * 100 : 0);
      var activeTone = 'admin-kpi--active-mid';
      if (activeShare >= 50) activeTone = 'admin-kpi--active-high';else if (activeShare < 10) activeTone = 'admin-kpi--active-low';
      return [{
        key: 'users_total',
        label: this.t('admin.metric_users'),
        value: usersTotal,
        action: 'users',
        toneClass: 'admin-kpi--users',
        trendLabel: this.formatTrend((_snapshot$users_total2 = snapshot.users_total) === null || _snapshot$users_total2 === void 0 ? void 0 : _snapshot$users_total2.trend_percent),
        trendDir: this.trendDir((_snapshot$users_total3 = snapshot.users_total) === null || _snapshot$users_total3 === void 0 ? void 0 : _snapshot$users_total3.trend_percent)
      }, {
        key: 'active_users',
        label: this.t('admin.metric_active'),
        value: Number(((_snapshot$active_user4 = snapshot.active_users) === null || _snapshot$active_user4 === void 0 ? void 0 : _snapshot$active_user4.value) || 0),
        action: 'users_active',
        toneClass: activeTone,
        trendLabel: this.formatTrend((_snapshot$active_user5 = snapshot.active_users) === null || _snapshot$active_user5 === void 0 ? void 0 : _snapshot$active_user5.trend_percent),
        trendDir: this.trendDir((_snapshot$active_user6 = snapshot.active_users) === null || _snapshot$active_user6 === void 0 ? void 0 : _snapshot$active_user6.trend_percent)
      }, {
        key: 'memorised_ayahs',
        label: this.t('admin.metric_memorised'),
        value: Number(((_snapshot$memorised_a = snapshot.memorised_ayahs) === null || _snapshot$memorised_a === void 0 ? void 0 : _snapshot$memorised_a.value) || 0),
        action: 'users',
        toneClass: 'admin-kpi--memorised',
        trendLabel: this.formatTrend((_snapshot$memorised_a2 = snapshot.memorised_ayahs) === null || _snapshot$memorised_a2 === void 0 ? void 0 : _snapshot$memorised_a2.trend_percent),
        trendDir: this.trendDir((_snapshot$memorised_a3 = snapshot.memorised_ayahs) === null || _snapshot$memorised_a3 === void 0 ? void 0 : _snapshot$memorised_a3.trend_percent)
      }, {
        key: 'sessions_completed',
        label: this.t('admin.metric_sessions'),
        value: Number(((_snapshot$sessions_co = snapshot.sessions_completed) === null || _snapshot$sessions_co === void 0 ? void 0 : _snapshot$sessions_co.value) || 0),
        action: 'users',
        toneClass: 'admin-kpi--sessions',
        trendLabel: this.formatTrend((_snapshot$sessions_co2 = snapshot.sessions_completed) === null || _snapshot$sessions_co2 === void 0 ? void 0 : _snapshot$sessions_co2.trend_percent),
        trendDir: this.trendDir((_snapshot$sessions_co3 = snapshot.sessions_completed) === null || _snapshot$sessions_co3 === void 0 ? void 0 : _snapshot$sessions_co3.trend_percent)
      }, {
        key: 'pending_contacts',
        label: this.t('admin.metric_pending'),
        value: Number(((_snapshot$pending_con = snapshot.pending_contacts) === null || _snapshot$pending_con === void 0 ? void 0 : _snapshot$pending_con.value) || 0),
        action: 'inbox',
        toneClass: 'admin-kpi--pending',
        tooltip: this.t('admin.metric_pending_hint'),
        trendLabel: this.formatTrend((_snapshot$pending_con2 = snapshot.pending_contacts) === null || _snapshot$pending_con2 === void 0 ? void 0 : _snapshot$pending_con2.trend_percent),
        trendDir: this.trendDir((_snapshot$pending_con3 = snapshot.pending_contacts) === null || _snapshot$pending_con3 === void 0 ? void 0 : _snapshot$pending_con3.trend_percent)
      }];
    },
    allVisibleSelected: function allVisibleSelected() {
      var _this = this;
      return this.users.length > 0 && this.users.every(function (row) {
        return _this.selectedIds.includes(row.id);
      });
    },
    filtersActive: function filtersActive() {
      return this.activeFilterCount > 0;
    },
    activeFilterCount: function activeFilterCount() {
      var count = 0;
      if (this.filters.q) count += 1;
      if (this.filters.activity) count += 1;
      if (this.filters.progress) count += 1;
      if (this.sortKey !== 'last_active' || this.sortDir !== 'desc') count += 1;
      return count;
    },
    selectedListRow: function selectedListRow() {
      var _this2 = this;
      if (!this.selectedUserId) return null;
      return this.users.find(function (row) {
        return Number(row.id) === Number(_this2.selectedUserId);
      }) || null;
    },
    detailStats: function detailStats() {
      var _this$detail, _this$detail2, _ref, _ref2, _listRow$memorised_ay, _ref3, _ref4, _listRow$sessions_com, _ref5, _ref6, _listRow$ai_checks, _ref7, _ref8, _listRow$avg_ai_accur;
      var listRow = this.selectedListRow;
      var stats = ((_this$detail = this.detail) === null || _this$detail === void 0 ? void 0 : _this$detail.stats) || {};
      var user = ((_this$detail2 = this.detail) === null || _this$detail2 === void 0 ? void 0 : _this$detail2.user) || {};
      var memorised = Number((_ref = (_ref2 = (_listRow$memorised_ay = listRow === null || listRow === void 0 ? void 0 : listRow.memorised_ayahs) !== null && _listRow$memorised_ay !== void 0 ? _listRow$memorised_ay : stats.memorised_ayahs) !== null && _ref2 !== void 0 ? _ref2 : user.memorised_ayahs) !== null && _ref !== void 0 ? _ref : 0);
      var sessions = Number((_ref3 = (_ref4 = (_listRow$sessions_com = listRow === null || listRow === void 0 ? void 0 : listRow.sessions_completed) !== null && _listRow$sessions_com !== void 0 ? _listRow$sessions_com : stats.sessions_completed) !== null && _ref4 !== void 0 ? _ref4 : user.sessions_completed) !== null && _ref3 !== void 0 ? _ref3 : 0);
      var aiChecks = Number((_ref5 = (_ref6 = (_listRow$ai_checks = listRow === null || listRow === void 0 ? void 0 : listRow.ai_checks) !== null && _listRow$ai_checks !== void 0 ? _listRow$ai_checks : stats.ai_checks) !== null && _ref6 !== void 0 ? _ref6 : user.ai_checks) !== null && _ref5 !== void 0 ? _ref5 : 0);
      var accuracy = (_ref7 = (_ref8 = (_listRow$avg_ai_accur = listRow === null || listRow === void 0 ? void 0 : listRow.avg_ai_accuracy) !== null && _listRow$avg_ai_accur !== void 0 ? _listRow$avg_ai_accur : stats.avg_ai_accuracy) !== null && _ref8 !== void 0 ? _ref8 : user.avg_ai_accuracy) !== null && _ref7 !== void 0 ? _ref7 : null;
      return [{
        key: 's',
        value: sessions,
        label: this.t('admin.col_sessions')
      }, {
        key: 'm',
        value: memorised,
        label: this.t('admin.col_memorised')
      }, {
        key: 'ai',
        value: aiChecks,
        label: this.t('admin.chart_ai')
      }, {
        key: 'acc',
        value: accuracy != null ? this.t('admin.accuracy', {
          n: Number(accuracy)
        }) : '—',
        label: this.t('admin.col_accuracy')
      }];
    },
    detailSessions: function detailSessions() {
      var _this$detail3;
      return (((_this$detail3 = this.detail) === null || _this$detail3 === void 0 ? void 0 : _this$detail3.recent_sessions) || []).slice(0, 3);
    },
    detailAiChecks: function detailAiChecks() {
      var _this$detail4;
      return (((_this$detail4 = this.detail) === null || _this$detail4 === void 0 ? void 0 : _this$detail4.recent_ai_checks) || []).slice(0, 3);
    },
    confirmTitle: function confirmTitle() {
      if (this.confirmKind === 'reset') return this.t('admin.action_reset_password');
      if (this.confirmKind === 'deactivate') return this.t('admin.action_deactivate');
      return '';
    },
    confirmMessage: function confirmMessage() {
      var _this$confirmRow;
      var email = ((_this$confirmRow = this.confirmRow) === null || _this$confirmRow === void 0 ? void 0 : _this$confirmRow.email) || '';
      if (this.confirmKind === 'reset') {
        return this.t('admin.action_reset_password_confirm', {
          email: email
        });
      }
      if (this.confirmKind === 'deactivate') {
        return this.t('admin.action_deactivate_confirm', {
          email: email
        });
      }
      return '';
    },
    editFormDirty: function editFormDirty() {
      var baseline = this.editFormBaseline;
      return this.editForm.name !== baseline.name || this.editForm.email !== baseline.email || this.editForm.subscription_status !== baseline.subscription_status;
    },
    deleteTargetName: function deleteTargetName() {
      var _this$detail5, _this$selectedListRow;
      return ((_this$detail5 = this.detail) === null || _this$detail5 === void 0 || (_this$detail5 = _this$detail5.user) === null || _this$detail5 === void 0 ? void 0 : _this$detail5.name) || ((_this$selectedListRow = this.selectedListRow) === null || _this$selectedListRow === void 0 ? void 0 : _this$selectedListRow.name) || '';
    },
    deleteConfirmReady: function deleteConfirmReady() {
      var target = this.deleteTargetName;
      return target !== '' && this.deleteConfirmName === target;
    },
    pageNumbers: function pageNumbers() {
      var total = this.usersTotalPages;
      var current = this.usersPage;
      if (total <= 7) {
        return Array.from({
          length: total
        }, function (_, index) {
          return index + 1;
        });
      }
      var start = Math.max(1, current - 3);
      var end = Math.min(total, start + 6);
      start = Math.max(1, end - 6);
      return Array.from({
        length: end - start + 1
      }, function (_, index) {
        return start + index;
      });
    }
  },
  mounted: function mounted() {
    this.boot();
    document.addEventListener('click', this.onDocumentClick);
    document.addEventListener('keydown', this.onDocumentKeydown);
  },
  beforeUnmount: function beforeUnmount() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    document.removeEventListener('click', this.onDocumentClick);
    document.removeEventListener('keydown', this.onDocumentKeydown);
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
        _this3 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var force, _sanitized$meta, payload, sanitized, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              force = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : false;
              _this3.bootLoading = !_this3.data || force;
              _this3.bootError = false;
              _context.p = 1;
              if (!(!_this3.data || force)) {
                _context.n = 4;
                break;
              }
              _context.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(_this3.chartDays);
            case 2:
              payload = _context.v;
              sanitized = _this3.sanitizePayload(payload);
              if (sanitized) {
                _context.n = 3;
                break;
              }
              throw new Error('owner mismatch');
            case 3:
              _this3.data = sanitized;
              _this3.chartDays = Number(sanitized === null || sanitized === void 0 || (_sanitized$meta = sanitized.meta) === null || _sanitized$meta === void 0 ? void 0 : _sanitized$meta.chart_days) === 7 ? 7 : 30;
            case 4:
              _context.n = 5;
              return _this3.reloadUsers();
            case 5:
              _context.n = 7;
              break;
            case 6:
              _context.p = 6;
              _t = _context.v;
              console.error(_t);
              if (!_this3.data) _this3.bootError = true;
            case 7:
              _context.p = 7;
              _this3.bootLoading = false;
              return _context.f(7);
            case 8:
              return _context.a(2);
          }
        }, _callee, null, [[1, 6, 7, 8]]);
      }))();
    },
    refreshAll: function refreshAll() {
      var _this4 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var payload, sanitized, _sanitized$meta2;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              _this4.refreshing = true;
              _context2.p = 1;
              _context2.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(_this4.chartDays);
            case 2:
              payload = _context2.v;
              sanitized = _this4.sanitizePayload(payload);
              if (sanitized) {
                _this4.data = sanitized;
                _this4.chartDays = Number(sanitized === null || sanitized === void 0 || (_sanitized$meta2 = sanitized.meta) === null || _sanitized$meta2 === void 0 ? void 0 : _sanitized$meta2.chart_days) === 7 ? 7 : 30;
              }
              _context2.n = 3;
              return _this4.reloadUsers();
            case 3:
              if (!_this4.selectedUserId) {
                _context2.n = 4;
                break;
              }
              delete _this4.detailCache[_this4.selectedUserId];
              _context2.n = 4;
              return _this4.loadDetail(_this4.selectedUserId);
            case 4:
              _context2.p = 4;
              _this4.refreshing = false;
              return _context2.f(4);
            case 5:
              return _context2.a(2);
          }
        }, _callee2, null, [[1,, 4, 5]]);
      }))();
    },
    onKpiClick: function onKpiClick(metric) {
      var _this5 = this;
      if (metric.action === 'inbox' && this.contactInboxUrl) {
        window.location.href = this.contactInboxUrl;
        return;
      }
      if (metric.action === 'users_active') {
        this.filters.activity = 'active_7d';
        this.usersPage = 1;
        this.reloadUsers();
      } else if (metric.action === 'users') {
        this.clearFilters();
      }
      this.$nextTick(function () {
        var el = _this5.$refs.usersSection;
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    },
    onFilterChange: function onFilterChange() {
      this.usersPage = 1;
      this.reloadUsers();
    },
    onSearchInput: function onSearchInput() {
      var _this6 = this;
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(function () {
        _this6.usersPage = 1;
        _this6.reloadUsers();
      }, 220);
    },
    toggleSortDir: function toggleSortDir() {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      this.usersPage = 1;
      this.reloadUsers();
    },
    setSort: function setSort(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortDir = 'desc';
      }
      this.usersPage = 1;
      this.reloadUsers();
    },
    clearFilters: function clearFilters() {
      this.filters = {
        q: '',
        activity: '',
        progress: ''
      };
      this.sortKey = 'last_active';
      this.sortDir = 'desc';
      this.usersPage = 1;
      this.reloadUsers();
    },
    setChartDays: function setChartDays(days) {
      var _this7 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var _this7$data;
        var next, payload, sanitized;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              next = days === 7 ? 7 : 30;
              if (!(_this7.chartDays === next && (_this7$data = _this7.data) !== null && _this7$data !== void 0 && _this7$data.top_learners)) {
                _context3.n = 1;
                break;
              }
              return _context3.a(2);
            case 1:
              _this7.chartDays = next;
              _this7.refreshing = true;
              _context3.p = 2;
              _context3.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(next);
            case 3:
              payload = _context3.v;
              sanitized = _this7.sanitizePayload(payload);
              if (sanitized) _this7.data = sanitized;
            case 4:
              _context3.p = 4;
              _this7.refreshing = false;
              return _context3.f(4);
            case 5:
              return _context3.a(2);
          }
        }, _callee3, null, [[2,, 4, 5]]);
      }))();
    },
    formatTrend: function formatTrend(value) {
      if (value == null || Number.isNaN(Number(value))) return '';
      var n = Number(value);
      var arrow = n > 0 ? '↑' : n < 0 ? '↓' : '→';
      var abs = Math.abs(n);
      var shown = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
      return this.t('admin.trend_vs_last_week', {
        arrow: arrow,
        n: shown
      });
    },
    trendDir: function trendDir(value) {
      if (value == null || Number.isNaN(Number(value))) return '';
      var n = Number(value);
      if (n > 0) return 'up';
      if (n < 0) return 'down';
      return 'flat';
    },
    activityStatus: function activityStatus(row) {
      var at = row === null || row === void 0 ? void 0 : row.last_activity_at;
      if (!at) return 'inactive';
      var date = new Date(at);
      if (Number.isNaN(date.getTime())) return 'inactive';
      var days = (Date.now() - date.getTime()) / 86400000;
      if (days <= 7) return 'hot';
      if (days <= 30) return 'warm';
      return 'inactive';
    },
    activityStatusLabel: function activityStatusLabel(row) {
      var at = row === null || row === void 0 ? void 0 : row.last_activity_at;
      if (!at) return this.t('admin.status_never_sessioned');
      var date = new Date(at);
      if (Number.isNaN(date.getTime())) return this.t('admin.status_never_sessioned');
      var days = Math.floor((Date.now() - date.getTime()) / 86400000);
      if (days <= 0) return this.t('admin.status_active_today');
      return this.t('admin.status_active_n_days_ago', {
        n: days
      });
    },
    accuracyToneClass: function accuracyToneClass(value) {
      var n = Number(value);
      if (Number.isNaN(n)) return '';
      if (n >= 80) return 'admin-acc--high';
      if (n >= 60) return 'admin-acc--mid';
      return 'admin-acc--low';
    },
    sessionOutcomeKey: function sessionOutcomeKey(row) {
      if ((row === null || row === void 0 ? void 0 : row.status) === 'completed') return 'completed';
      return 'incomplete';
    },
    truncateId: function truncateId(id) {
      var text = String(id || '');
      if (text.length <= 10) return text;
      return "".concat(text.slice(0, 6), "\u2026").concat(text.slice(-2));
    },
    copyUserId: function copyUserId(id) {
      var _this8 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
        var text, _navigator, input, _t2;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.p = _context4.n) {
            case 0:
              text = String(id || '');
              if (text) {
                _context4.n = 1;
                break;
              }
              return _context4.a(2);
            case 1:
              _context4.p = 1;
              if (!((_navigator = navigator) !== null && _navigator !== void 0 && (_navigator = _navigator.clipboard) !== null && _navigator !== void 0 && _navigator.writeText)) {
                _context4.n = 3;
                break;
              }
              _context4.n = 2;
              return navigator.clipboard.writeText(text);
            case 2:
              _context4.n = 4;
              break;
            case 3:
              input = document.createElement('input');
              input.value = text;
              document.body.appendChild(input);
              input.select();
              document.execCommand('copy');
              document.body.removeChild(input);
            case 4:
              _this8.showToast(_this8.t('admin.copied'));
              _context4.n = 6;
              break;
            case 5:
              _context4.p = 5;
              _t2 = _context4.v;
              _this8.showToast(_this8.t('admin.form_error'));
            case 6:
              return _context4.a(2);
          }
        }, _callee4, null, [[1, 5]]);
      }))();
    },
    goToPage: function goToPage(page) {
      var next = Math.max(1, Math.min(this.usersTotalPages, Number(page) || 1));
      if (next === this.usersPage) return;
      this.usersPage = next;
      this.reloadUsers();
    },
    showToast: function showToast(message) {
      var _this9 = this;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastMessage = message;
      this.toastTimer = setTimeout(function () {
        _this9.toastMessage = '';
        _this9.toastTimer = null;
      }, 2500);
    },
    viewAsLearner: function viewAsLearner() {
      this.rowMenuId = null;
      window.open('/dashboard', '_blank');
    },
    exportVisibleUsersCsv: function exportVisibleUsersCsv() {
      var _this0 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
        var result, rows, headers, _escape, lines, blob, url, link, suffix, _t3;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.p = _context5.n) {
            case 0:
              _context5.p = 0;
              _context5.n = 1;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getUsers({
                page: 1,
                per_page: Math.min(500, Math.max(_this0.usersTotal || 25, 25)),
                q: _this0.filters.q,
                activity: _this0.filters.activity,
                progress: _this0.filters.progress,
                sort: _this0.sortKey,
                dir: _this0.sortDir
              });
            case 1:
              result = _context5.v;
              rows = result.users || [];
              headers = ['name', 'email', 'subscription_status', 'sessions_completed', 'memorised_ayahs', 'avg_ai_accuracy', 'last_activity_at'];
              _escape = function _escape(value) {
                return "\"".concat(String(value == null ? '' : value).replace(/"/g, '""'), "\"");
              };
              lines = [headers.join(',')].concat(_toConsumableArray(rows.map(function (row) {
                return headers.map(function (key) {
                  return _escape(row[key]);
                }).join(',');
              })));
              blob = new Blob([lines.join('\n')], {
                type: 'text/csv;charset=utf-8'
              });
              url = URL.createObjectURL(blob);
              link = document.createElement('a');
              suffix = _this0.filtersActive ? 'filtered' : 'all';
              link.href = url;
              link.download = "mutqin-users-".concat(suffix, "-").concat(rows.length, ".csv");
              link.click();
              URL.revokeObjectURL(url);
              _context5.n = 3;
              break;
            case 2:
              _context5.p = 2;
              _t3 = _context5.v;
              _this0.showToast(_this0.formErrorFrom(_t3));
            case 3:
              return _context5.a(2);
          }
        }, _callee5, null, [[0, 2]]);
      }))();
    },
    toggleRowMenu: function toggleRowMenu(id) {
      var num = Number(id);
      this.rowMenuId = this.rowMenuId === num ? null : num;
    },
    onDocumentClick: function onDocumentClick(event) {
      if (!this.rowMenuId) return;
      var target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('.admin-row-menu')) return;
      this.rowMenuId = null;
    },
    onDocumentKeydown: function onDocumentKeydown(event) {
      if (event.key !== 'Escape') return;
      if (this.confirmOpen) {
        this.closeConfirmModal();
        return;
      }
      if (this.deleteOpen) {
        this.closeDeleteModal();
        return;
      }
      if (this.createOpen) {
        this.createOpen = false;
        return;
      }
      if (this.drawerOpen) {
        this.closeDrawer();
        return;
      }
      this.rowMenuId = null;
    },
    askResetPassword: function askResetPassword(row) {
      this.rowMenuId = null;
      if (!(row !== null && row !== void 0 && row.id)) return;
      this.confirmKind = 'reset';
      this.confirmRow = row;
      this.confirmOpen = true;
    },
    askDeactivate: function askDeactivate(row) {
      this.rowMenuId = null;
      if (!(row !== null && row !== void 0 && row.id) || Number(row.id) === this.ownerId) return;
      this.confirmKind = 'deactivate';
      this.confirmRow = row;
      this.confirmOpen = true;
    },
    closeConfirmModal: function closeConfirmModal() {
      if (this.confirmBusy) return;
      this.confirmOpen = false;
      this.confirmKind = '';
      this.confirmRow = null;
    },
    runConfirmAction: function runConfirmAction() {
      var _this1 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6() {
        var _this1$confirmRow;
        return _regenerator().w(function (_context6) {
          while (1) switch (_context6.p = _context6.n) {
            case 0:
              if (!(!((_this1$confirmRow = _this1.confirmRow) !== null && _this1$confirmRow !== void 0 && _this1$confirmRow.id) || !_this1.confirmKind)) {
                _context6.n = 1;
                break;
              }
              return _context6.a(2);
            case 1:
              _this1.confirmBusy = true;
              _context6.p = 2;
              if (!(_this1.confirmKind === 'reset')) {
                _context6.n = 4;
                break;
              }
              _context6.n = 3;
              return _this1.resetPassword(_this1.confirmRow);
            case 3:
              _context6.n = 5;
              break;
            case 4:
              if (!(_this1.confirmKind === 'deactivate')) {
                _context6.n = 5;
                break;
              }
              _context6.n = 5;
              return _this1.deactivateAccount(_this1.confirmRow);
            case 5:
              _this1.confirmOpen = false;
              _this1.confirmKind = '';
              _this1.confirmRow = null;
            case 6:
              _context6.p = 6;
              _this1.confirmBusy = false;
              return _context6.f(6);
            case 7:
              return _context6.a(2);
          }
        }, _callee6, null, [[2,, 6, 7]]);
      }))();
    },
    resetPassword: function resetPassword(row) {
      var _this10 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7() {
        var password, _t4;
        return _regenerator().w(function (_context7) {
          while (1) switch (_context7.p = _context7.n) {
            case 0:
              if (row !== null && row !== void 0 && row.id) {
                _context7.n = 1;
                break;
              }
              return _context7.a(2);
            case 1:
              password = _this10.generateTempPassword();
              _context7.p = 2;
              _context7.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.updateUser(row.id, {
                password: password
              });
            case 3:
              _this10.showToast(_this10.t('admin.action_reset_password_done', {
                password: password
              }));
              _context7.n = 5;
              break;
            case 4:
              _context7.p = 4;
              _t4 = _context7.v;
              _this10.showToast(_this10.formErrorFrom(_t4));
            case 5:
              return _context7.a(2);
          }
        }, _callee7, null, [[2, 4]]);
      }))();
    },
    deactivateAccount: function deactivateAccount(row) {
      var _this11 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8() {
        var _t5;
        return _regenerator().w(function (_context8) {
          while (1) switch (_context8.p = _context8.n) {
            case 0:
              if (!(!(row !== null && row !== void 0 && row.id) || Number(row.id) === _this11.ownerId)) {
                _context8.n = 1;
                break;
              }
              return _context8.a(2);
            case 1:
              _context8.p = 1;
              _context8.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.updateUser(row.id, {
                subscription_status: 'canceled'
              });
            case 2:
              _context8.n = 3;
              return _this11.reloadUsers();
            case 3:
              if (!(_this11.selectedUserId === row.id)) {
                _context8.n = 4;
                break;
              }
              delete _this11.detailCache[row.id];
              _context8.n = 4;
              return _this11.loadDetail(row.id);
            case 4:
              _this11.showToast(_this11.t('admin.toast_saved'));
              _context8.n = 6;
              break;
            case 5:
              _context8.p = 5;
              _t5 = _context8.v;
              _this11.showToast(_this11.formErrorFrom(_t5));
            case 6:
              return _context8.a(2);
          }
        }, _callee8, null, [[1, 5]]);
      }))();
    },
    userInitials: function userInitials(name) {
      var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '?';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return "".concat(parts[0][0] || '').concat(parts[parts.length - 1][0] || '').toUpperCase();
    },
    editFieldDirty: function editFieldDirty(field) {
      return this.editForm[field] !== this.editFormBaseline[field];
    },
    onEditBlur: function onEditBlur() {
      if (!this.editFormDirty || this.formSaving) return;
      if (!this.editForm.name || !this.editForm.email) return;
      this.saveUser();
    },
    sessionOutcomeLabel: function sessionOutcomeLabel(row) {
      if ((row === null || row === void 0 ? void 0 : row.status) === 'completed') return this.t('admin.outcome_session_completed');
      return this.t('admin.outcome_session_incomplete');
    },
    tierLabel: function tierLabel(tier) {
      var key = String(tier || 'none').toLowerCase();
      if (key === 'free') return this.t('admin.tier_free');
      if (key === 'pro') return this.t('admin.tier_pro');
      return this.t('admin.sub_none');
    },
    subscriptionBadgeLabel: function subscriptionBadgeLabel(row) {
      if (!row) return this.t('admin.sub_none');
      var status = String(row.subscription_status || '').toLowerCase();
      var tier = String(row.subscription_tier || '').toLowerCase();
      if (status === 'active' || status === 'trialing' || status === 'pro' || tier === 'pro') {
        return this.t('admin.tier_pro');
      }
      if (status === 'free' || tier === 'free') return this.t('admin.tier_free');
      if (status === 'canceled') return this.t('admin.sub_canceled');
      if (status === 'past_due') return this.t('admin.sub_past_due');
      return this.t('admin.sub_none');
    },
    generateTempPassword: function generateTempPassword() {
      var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
      var out = '';
      var bytes = new Uint8Array(14);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
      } else {
        for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
      }
      for (var _i = 0; _i < bytes.length; _i += 1) {
        out += alphabet[bytes[_i] % alphabet.length];
      }
      return out;
    },
    reloadUsers: function reloadUsers() {
      var _this12 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
        var requestId, result, _t6;
        return _regenerator().w(function (_context9) {
          while (1) switch (_context9.p = _context9.n) {
            case 0:
              requestId = ++_this12.usersRequestId;
              _this12.usersLoading = true;
              _this12.usersError = false;
              _context9.p = 1;
              _context9.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getUsers({
                page: _this12.usersPage,
                per_page: _this12.usersPerPage,
                limit: _this12.usersPerPage,
                q: _this12.filters.q,
                activity: _this12.filters.activity,
                progress: _this12.filters.progress,
                sort: _this12.sortKey,
                dir: _this12.sortDir
              });
            case 2:
              result = _context9.v;
              if (!(requestId !== _this12.usersRequestId)) {
                _context9.n = 3;
                break;
              }
              return _context9.a(2);
            case 3:
              _this12.users = result.users;
              _this12.usersTotal = result.total;
              _this12.usersPage = result.page || _this12.usersPage;
              _this12.usersPerPage = result.per_page || _this12.usersPerPage;
              _this12.usersTotalPages = result.total_pages || 1;
              _this12.selectedIds = _this12.selectedIds.filter(function (id) {
                return _this12.users.some(function (row) {
                  return row.id === id;
                });
              });
              _this12.syncDetailStatsFromList();
              _context9.n = 6;
              break;
            case 4:
              _context9.p = 4;
              _t6 = _context9.v;
              if (!(requestId !== _this12.usersRequestId)) {
                _context9.n = 5;
                break;
              }
              return _context9.a(2);
            case 5:
              _this12.usersError = true;
            case 6:
              _context9.p = 6;
              if (requestId === _this12.usersRequestId) _this12.usersLoading = false;
              return _context9.f(6);
            case 7:
              return _context9.a(2);
          }
        }, _callee9, null, [[1, 4, 6, 7]]);
      }))();
    },
    syncDetailStatsFromList: function syncDetailStatsFromList() {
      var _row$avg_ai_accuracy, _ref9, _row$last_ai_check_at, _this$detail$user, _ref0, _row$last_activity_at, _this$detail$user2;
      var row = this.selectedListRow;
      if (!row || !this.detail) return;
      var nextStats = _objectSpread(_objectSpread({}, this.detail.stats || {}), {}, {
        memorised_ayahs: Number(row.memorised_ayahs || 0),
        sessions_completed: Number(row.sessions_completed || 0),
        learning_ayahs: Number(row.learning_ayahs || 0),
        ai_checks: Number(row.ai_checks || 0),
        avg_ai_accuracy: (_row$avg_ai_accuracy = row.avg_ai_accuracy) !== null && _row$avg_ai_accuracy !== void 0 ? _row$avg_ai_accuracy : null
      });
      var nextUser = _objectSpread(_objectSpread({}, this.detail.user || {}), {}, {
        memorised_ayahs: nextStats.memorised_ayahs,
        sessions_completed: nextStats.sessions_completed,
        learning_ayahs: nextStats.learning_ayahs,
        ai_checks: nextStats.ai_checks,
        avg_ai_accuracy: nextStats.avg_ai_accuracy,
        last_ai_check_at: (_ref9 = (_row$last_ai_check_at = row.last_ai_check_at) !== null && _row$last_ai_check_at !== void 0 ? _row$last_ai_check_at : (_this$detail$user = this.detail.user) === null || _this$detail$user === void 0 ? void 0 : _this$detail$user.last_ai_check_at) !== null && _ref9 !== void 0 ? _ref9 : null,
        last_activity_at: (_ref0 = (_row$last_activity_at = row.last_activity_at) !== null && _row$last_activity_at !== void 0 ? _row$last_activity_at : (_this$detail$user2 = this.detail.user) === null || _this$detail$user2 === void 0 ? void 0 : _this$detail$user2.last_activity_at) !== null && _ref0 !== void 0 ? _ref0 : null
      });
      this.detail = _objectSpread(_objectSpread({}, this.detail), {}, {
        user: nextUser,
        stats: nextStats
      });
      if (this.selectedUserId && this.detailCache[this.selectedUserId]) {
        this.detailCache[this.selectedUserId] = this.detail;
      }
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
    toggleSelectAll: function toggleSelectAll(event) {
      var _event$target;
      if (event !== null && event !== void 0 && (_event$target = event.target) !== null && _event$target !== void 0 && _event$target.checked) {
        this.selectedIds = this.users.map(function (row) {
          return row.id;
        });
      } else {
        this.selectedIds = [];
      }
    },
    selectedUsers: function selectedUsers() {
      var ids = new Set(this.selectedIds.map(function (id) {
        return Number(id);
      }));
      return this.users.filter(function (row) {
        return ids.has(Number(row.id));
      });
    },
    bulkSendEmail: function bulkSendEmail() {
      var emails = this.selectedUsers().map(function (row) {
        return String(row.email || '').trim();
      }).filter(Boolean);
      if (!emails.length) return;
      window.location.href = "mailto:?bcc=".concat(encodeURIComponent(emails.join(',')));
    },
    exportSelectedCsv: function exportSelectedCsv() {
      var rows = this.selectedUsers();
      if (!rows.length) return;
      var headers = ['id', 'name', 'email', 'subscription_status', 'memorised_ayahs', 'sessions_completed', 'avg_ai_accuracy', 'last_ai_check_at', 'last_activity_at'];
      var escape = function escape(value) {
        var text = value == null ? '' : String(value);
        return "\"".concat(text.replace(/"/g, '""'), "\"");
      };
      var lines = [headers.join(',')].concat(_toConsumableArray(rows.map(function (row) {
        return headers.map(function (key) {
          return escape(row[key]);
        }).join(',');
      })));
      var blob = new Blob([lines.join('\n')], {
        type: 'text/csv;charset=utf-8'
      });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = "mutqin-users-".concat(rows.length, ".csv");
      link.click();
      URL.revokeObjectURL(url);
    },
    runBulkStatus: function runBulkStatus() {
      var _this13 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0() {
        return _regenerator().w(function (_context0) {
          while (1) switch (_context0.p = _context0.n) {
            case 0:
              if (_this13.selectedIds.length) {
                _context0.n = 1;
                break;
              }
              return _context0.a(2);
            case 1:
              _this13.bulkBusy = true;
              _context0.p = 2;
              _context0.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.bulkUsers({
                action: 'update_status',
                user_ids: _this13.selectedIds,
                subscription_status: _this13.bulkStatus
              });
            case 3:
              _this13.selectedIds = [];
              _context0.n = 4;
              return _this13.reloadUsers();
            case 4:
              _this13.refreshSnapshotQuiet();
              if (!_this13.selectedUserId) {
                _context0.n = 5;
                break;
              }
              delete _this13.detailCache[_this13.selectedUserId];
              _context0.n = 5;
              return _this13.loadDetail(_this13.selectedUserId);
            case 5:
              _this13.showToast(_this13.t('admin.toast_saved'));
            case 6:
              _context0.p = 6;
              _this13.bulkBusy = false;
              return _context0.f(6);
            case 7:
              return _context0.a(2);
          }
        }, _callee0, null, [[2,, 6, 7]]);
      }))();
    },
    bulkDeactivate: function bulkDeactivate() {
      var _this14 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee1() {
        var ids;
        return _regenerator().w(function (_context1) {
          while (1) switch (_context1.p = _context1.n) {
            case 0:
              if (_this14.selectedIds.length) {
                _context1.n = 1;
                break;
              }
              return _context1.a(2);
            case 1:
              ids = _this14.selectedIds.filter(function (id) {
                return Number(id) !== _this14.ownerId;
              });
              if (ids.length) {
                _context1.n = 2;
                break;
              }
              _this14.showToast(_this14.t('admin.bulk_deactivate_self_blocked'));
              return _context1.a(2);
            case 2:
              if (window.confirm(_this14.t('admin.bulk_deactivate_confirm', {
                n: ids.length
              }))) {
                _context1.n = 3;
                break;
              }
              return _context1.a(2);
            case 3:
              _this14.bulkBusy = true;
              _context1.p = 4;
              _context1.n = 5;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.bulkUsers({
                action: 'update_status',
                user_ids: ids,
                subscription_status: 'canceled'
              });
            case 5:
              _this14.selectedIds = [];
              _context1.n = 6;
              return _this14.reloadUsers();
            case 6:
              _this14.refreshSnapshotQuiet();
              if (!_this14.selectedUserId) {
                _context1.n = 7;
                break;
              }
              delete _this14.detailCache[_this14.selectedUserId];
              _context1.n = 7;
              return _this14.loadDetail(_this14.selectedUserId);
            case 7:
              _this14.showToast(_this14.t('admin.toast_saved'));
            case 8:
              _context1.p = 8;
              _this14.bulkBusy = false;
              return _context1.f(8);
            case 9:
              return _context1.a(2);
          }
        }, _callee1, null, [[4,, 8, 9]]);
      }))();
    },
    refreshSnapshotQuiet: function refreshSnapshotQuiet() {
      var _this15 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee10() {
        var payload, sanitized, _t7;
        return _regenerator().w(function (_context10) {
          while (1) switch (_context10.p = _context10.n) {
            case 0:
              _context10.p = 0;
              _context10.n = 1;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getDashboard(7);
            case 1:
              payload = _context10.v;
              sanitized = _this15.sanitizePayload(payload);
              if (sanitized) _this15.data = sanitized;
              _context10.n = 3;
              break;
            case 2:
              _context10.p = 2;
              _t7 = _context10.v;
            case 3:
              return _context10.a(2);
          }
        }, _callee10, null, [[0, 2]]);
      }))();
    },
    selectUser: function selectUser(id) {
      var num = Number(id);
      if (!num) return;
      this.selectedUserId = num;
      this.formError = '';
      this.drawerOpen = true;
      this.loadDetail(num);
    },
    closeDrawer: function closeDrawer() {
      this.drawerOpen = false;
    },
    loadDetail: function loadDetail(id) {
      var _this16 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee11() {
        var requestId, detail, _t8;
        return _regenerator().w(function (_context11) {
          while (1) switch (_context11.p = _context11.n) {
            case 0:
              if (!_this16.detailCache[id]) {
                _context11.n = 1;
                break;
              }
              _this16.detail = _this16.detailCache[id];
              _this16.hydrateEditForm(_this16.detail.user);
              _this16.syncDetailStatsFromList();
              _this16.detailLoading = false;
              _this16.detailError = false;
              return _context11.a(2);
            case 1:
              requestId = ++_this16.detailRequestId;
              _this16.detailLoading = true;
              _this16.detailError = false;
              _context11.p = 2;
              _context11.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.getUser(id);
            case 3:
              detail = _context11.v;
              if (!(requestId !== _this16.detailRequestId)) {
                _context11.n = 4;
                break;
              }
              return _context11.a(2);
            case 4:
              _this16.detail = detail;
              _this16.detailCache[id] = detail;
              _this16.hydrateEditForm(detail === null || detail === void 0 ? void 0 : detail.user);
              _this16.syncDetailStatsFromList();
              _context11.n = 7;
              break;
            case 5:
              _context11.p = 5;
              _t8 = _context11.v;
              if (!(requestId !== _this16.detailRequestId)) {
                _context11.n = 6;
                break;
              }
              return _context11.a(2);
            case 6:
              _this16.detailError = true;
              _this16.detail = null;
            case 7:
              _context11.p = 7;
              if (requestId === _this16.detailRequestId) _this16.detailLoading = false;
              return _context11.f(7);
            case 8:
              return _context11.a(2);
          }
        }, _callee11, null, [[2, 5, 7, 8]]);
      }))();
    },
    hydrateEditForm: function hydrateEditForm() {
      var user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var form = {
        name: user.name || '',
        email: user.email || '',
        subscription_status: user.subscription_status || 'none'
      };
      this.editForm = _objectSpread({}, form);
      this.editFormBaseline = _objectSpread({}, form);
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
      var _this17 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee12() {
        var payload, result, _t9;
        return _regenerator().w(function (_context12) {
          while (1) switch (_context12.p = _context12.n) {
            case 0:
              if (!(!_this17.selectedUserId || !_this17.editFormDirty)) {
                _context12.n = 1;
                break;
              }
              return _context12.a(2);
            case 1:
              _this17.formSaving = true;
              _this17.formError = '';
              _context12.p = 2;
              payload = {
                name: _this17.editForm.name,
                email: _this17.editForm.email,
                subscription_status: _this17.editForm.subscription_status
              };
              _context12.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.updateUser(_this17.selectedUserId, payload);
            case 3:
              result = _context12.v;
              if (result !== null && result !== void 0 && result.detail) {
                _this17.detail = result.detail;
                _this17.detailCache[_this17.selectedUserId] = result.detail;
                _this17.hydrateEditForm(result.detail.user);
              }
              _context12.n = 4;
              return _this17.reloadUsers();
            case 4:
              _this17.showToast(_this17.t('admin.toast_saved'));
              _context12.n = 6;
              break;
            case 5:
              _context12.p = 5;
              _t9 = _context12.v;
              _this17.formError = _this17.formErrorFrom(_t9);
            case 6:
              _context12.p = 6;
              _this17.formSaving = false;
              return _context12.f(6);
            case 7:
              return _context12.a(2);
          }
        }, _callee12, null, [[2, 5, 6, 7]]);
      }))();
    },
    openDeleteModal: function openDeleteModal() {
      if (!this.selectedUserId || this.isSelfSelected) return;
      this.deleteConfirmName = '';
      this.formError = '';
      this.deleteOpen = true;
    },
    closeDeleteModal: function closeDeleteModal() {
      this.deleteOpen = false;
      this.deleteConfirmName = '';
      this.formError = '';
    },
    confirmDeleteUser: function confirmDeleteUser() {
      var _this18 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee13() {
        var _t0;
        return _regenerator().w(function (_context13) {
          while (1) switch (_context13.p = _context13.n) {
            case 0:
              if (!(!_this18.selectedUserId || !_this18.deleteConfirmReady)) {
                _context13.n = 1;
                break;
              }
              return _context13.a(2);
            case 1:
              _this18.deletingUser = true;
              _this18.formError = '';
              _context13.p = 2;
              _context13.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.deleteUser(_this18.selectedUserId);
            case 3:
              delete _this18.detailCache[_this18.selectedUserId];
              _this18.selectedUserId = null;
              _this18.detail = null;
              _this18.drawerOpen = false;
              _this18.closeDeleteModal();
              _context13.n = 4;
              return _this18.reloadUsers();
            case 4:
              _this18.refreshSnapshotQuiet();
              _this18.showToast(_this18.t('admin.toast_deleted'));
              _context13.n = 6;
              break;
            case 5:
              _context13.p = 5;
              _t0 = _context13.v;
              _this18.formError = _this18.formErrorFrom(_t0);
            case 6:
              _context13.p = 6;
              _this18.deletingUser = false;
              return _context13.f(6);
            case 7:
              return _context13.a(2);
          }
        }, _callee13, null, [[2, 5, 6, 7]]);
      }))();
    },
    deleteNote: function deleteNote(row) {
      var _this19 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee14() {
        var _this19$detail, _this19$detail2;
        return _regenerator().w(function (_context14) {
          while (1) switch (_context14.n) {
            case 0:
              if (row !== null && row !== void 0 && row.id) {
                _context14.n = 1;
                break;
              }
              return _context14.a(2);
            case 1:
              if (window.confirm(_this19.t('admin.delete_note_confirm'))) {
                _context14.n = 2;
                break;
              }
              return _context14.a(2);
            case 2:
              _context14.n = 3;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.deleteNote(row.id);
            case 3:
              if ((_this19$detail = _this19.detail) !== null && _this19$detail !== void 0 && _this19$detail.recent_notes) {
                _this19.detail.recent_notes = _this19.detail.recent_notes.filter(function (n) {
                  return n.id !== row.id;
                });
              }
              if ((_this19$detail2 = _this19.detail) !== null && _this19$detail2 !== void 0 && _this19$detail2.stats) {
                _this19.detail.stats.notes = Math.max(0, Number(_this19.detail.stats.notes || 1) - 1);
              }
              if (_this19.selectedUserId) _this19.detailCache[_this19.selectedUserId] = _this19.detail;
            case 4:
              return _context14.a(2);
          }
        }, _callee14);
      }))();
    },
    openCreateModal: function openCreateModal() {
      this.createOpen = true;
      this.createError = '';
      this.createForm = emptyCreate();
    },
    createUser: function createUser() {
      var _this20 = this;
      return _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee15() {
        var password, tier, subscriptionStatus, subscriptionTier, created, _t1;
        return _regenerator().w(function (_context15) {
          while (1) switch (_context15.p = _context15.n) {
            case 0:
              _this20.createSaving = true;
              _this20.createError = '';
              password = _this20.generateTempPassword();
              tier = String(_this20.createForm.subscription_tier || 'none').toLowerCase();
              subscriptionStatus = tier === 'pro' ? 'active' : 'none';
              subscriptionTier = tier === 'pro' ? 'pro' : tier === 'free' ? 'free' : 'none';
              _context15.p = 1;
              _context15.n = 2;
              return _scripts_api_admin__WEBPACK_IMPORTED_MODULE_0__.adminApi.createUser({
                name: _this20.createForm.name,
                email: _this20.createForm.email,
                subscription_status: subscriptionStatus,
                subscription_tier: subscriptionTier,
                password: password
              });
            case 2:
              created = _context15.v;
              _this20.createOpen = false;
              _this20.usersPage = 1;
              _context15.n = 3;
              return _this20.reloadUsers();
            case 3:
              if (created !== null && created !== void 0 && created.id) {
                _this20.users = [created].concat(_toConsumableArray(_this20.users.filter(function (row) {
                  return Number(row.id) !== Number(created.id);
                }))).slice(0, _this20.usersPerPage);
                _this20.selectUser(created.id);
              }
              _this20.refreshSnapshotQuiet();
              _this20.showToast(_this20.t('admin.toast_created', {
                password: password
              }));
              _context15.n = 5;
              break;
            case 4:
              _context15.p = 4;
              _t1 = _context15.v;
              _this20.createError = _this20.formErrorFrom(_t1);
            case 5:
              _context15.p = 5;
              _this20.createSaving = false;
              return _context15.f(5);
            case 6:
              return _context15.a(2);
          }
        }, _callee15, null, [[1, 4, 5, 6]]);
      }))();
    },
    jumpToUser: function jumpToUser(userId) {
      if (!userId) return;
      this.selectUser(userId);
    },
    onConsoleKeydown: function onConsoleKeydown(event) {
      var _this21 = this;
      if (this.createOpen || this.deleteOpen || this.confirmOpen || this.drawerOpen) return;
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!this.users.length) return;
      event.preventDefault();
      var index = this.users.findIndex(function (row) {
        return row.id === _this21.selectedUserId;
      });
      var next = event.key === 'ArrowDown' ? Math.min(this.users.length - 1, (index < 0 ? -1 : index) + 1) : Math.max(0, (index < 0 ? 1 : index) - 1);
      this.selectUser(this.users[next].id);
    },
    subscriptionLabel: function subscriptionLabel(key) {
      var map = {
        active: 'sub_active',
        trialing: 'sub_trialing',
        canceled: 'sub_canceled',
        past_due: 'sub_past_due',
        none: 'sub_none',
        free: 'tier_free',
        pro: 'tier_pro'
      };
      var i18nKey = map[String(key || '').toLowerCase()] || null;
      return i18nKey ? this.t("admin.".concat(i18nKey)) : String(key || 'none');
    },
    subscriptionPillClass: function subscriptionPillClass(rowOrKey) {
      if (rowOrKey && _typeof(rowOrKey) === 'object') {
        var _status = String(rowOrKey.subscription_status || '').toLowerCase();
        var tier = String(rowOrKey.subscription_tier || '').toLowerCase();
        var isPro = _status === 'pro' || tier === 'pro' || _status === 'active' || _status === 'trialing';
        if (isPro && (_status === 'active' || _status === 'trialing')) return 'admin-pill--active-pro';
        if (isPro) return 'admin-pill--pro';
        if (_status === 'free' || tier === 'free') return 'admin-pill--free';
        return 'admin-pill--none';
      }
      var status = String(rowOrKey || '').toLowerCase();
      if (status === 'active' || status === 'trialing') return 'admin-pill--active-pro';
      if (status === 'pro') return 'admin-pill--pro';
      if (status === 'free') return 'admin-pill--free';
      return 'admin-pill--none';
    },
    surahBarWidth: function surahBarWidth(row) {
      var percent = Number((row === null || row === void 0 ? void 0 : row.percent) || 0);
      if (percent <= 0) return '0%';
      return "".concat(Math.max(percent, 2), "%");
    },
    noteLine: function noteLine(row) {
      return [row.surah_name, this.t('admin.ayah_n', {
        n: row.ayah_number
      })].filter(Boolean).join(' · ');
    },
    formatItemRange: function formatItemRange(item) {
      var start = Number((item === null || item === void 0 ? void 0 : item.ayah_start) || (item === null || item === void 0 ? void 0 : item.ayah_number) || 0);
      var end = Number((item === null || item === void 0 ? void 0 : item.ayah_end) || 0);
      if (start > 0 && end > 0 && start !== end) return this.t('admin.ayah_range', {
        start: start,
        end: end
      });
      if (start > 0) return this.t('admin.ayah_single', {
        n: start
      });
      return '';
    },
    formatDateShort: function formatDateShort(value) {
      if (!value) return '';
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
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
  "class": "admin-console__top admin-reveal",
  style: {
    "--admin-delay": "0ms"
  }
};
var _hoisted_5 = {
  "class": "admin-console__brand"
};
var _hoisted_6 = {
  "class": "admin-eyebrow"
};
var _hoisted_7 = {
  "class": "admin-supporting"
};
var _hoisted_8 = {
  "class": "admin-console__top-actions"
};
var _hoisted_9 = ["aria-label"];
var _hoisted_10 = ["disabled", "aria-label"];
var _hoisted_11 = ["aria-label"];
var _hoisted_12 = ["title", "onClick"];
var _hoisted_13 = ["data-dir"];
var _hoisted_14 = ["aria-label"];
var _hoisted_15 = {
  "class": "admin-users__header"
};
var _hoisted_16 = {
  "class": "admin-users__title-block"
};
var _hoisted_17 = {
  "class": "admin-eyebrow"
};
var _hoisted_18 = {
  "class": "admin-users__title-row"
};
var _hoisted_19 = {
  "class": "admin-users__title"
};
var _hoisted_20 = {
  "class": "admin-users__count"
};
var _hoisted_21 = {
  "class": "admin-users__subtitle"
};
var _hoisted_22 = {
  "class": "admin-users__actions"
};
var _hoisted_23 = {
  "class": "admin-toolbar"
};
var _hoisted_24 = {
  "class": "admin-toolbar__search-wrap"
};
var _hoisted_25 = ["placeholder"];
var _hoisted_26 = {
  "class": "admin-toolbar__controls"
};
var _hoisted_27 = ["aria-label"];
var _hoisted_28 = {
  value: ""
};
var _hoisted_29 = {
  value: "today"
};
var _hoisted_30 = {
  value: "active_7d"
};
var _hoisted_31 = {
  value: "active_30d"
};
var _hoisted_32 = {
  value: "inactive_30d"
};
var _hoisted_33 = {
  value: "never"
};
var _hoisted_34 = ["aria-label"];
var _hoisted_35 = {
  value: ""
};
var _hoisted_36 = {
  value: "has"
};
var _hoisted_37 = {
  value: "none"
};
var _hoisted_38 = ["aria-label"];
var _hoisted_39 = {
  value: "last_active"
};
var _hoisted_40 = {
  value: "sessions"
};
var _hoisted_41 = {
  value: "accuracy"
};
var _hoisted_42 = {
  value: "memorised"
};
var _hoisted_43 = ["aria-pressed"];
var _hoisted_44 = {
  "class": "admin-results-count"
};
var _hoisted_45 = {
  key: 0,
  "class": "admin-bulkbar"
};
var _hoisted_46 = ["disabled"];
var _hoisted_47 = ["aria-label"];
var _hoisted_48 = ["value"];
var _hoisted_49 = ["disabled"];
var _hoisted_50 = ["disabled"];
var _hoisted_51 = ["disabled"];
var _hoisted_52 = {
  key: 1,
  "class": "admin-empty"
};
var _hoisted_53 = {
  key: 2,
  "class": "admin-empty",
  role: "alert"
};
var _hoisted_54 = ["aria-label"];
var _hoisted_55 = {
  "class": "admin-table"
};
var _hoisted_56 = {
  "class": "admin-table__check"
};
var _hoisted_57 = ["checked", "aria-label"];
var _hoisted_58 = {
  "class": "admin-col--desktop"
};
var _hoisted_59 = {
  "class": "admin-col--desktop"
};
var _hoisted_60 = {
  "class": "admin-col--desktop"
};
var _hoisted_61 = {
  key: 0
};
var _hoisted_62 = {
  colspan: "8",
  "class": "admin-table__empty"
};
var _hoisted_63 = ["onClick", "onKeydown"];
var _hoisted_64 = ["checked", "onChange"];
var _hoisted_65 = {
  "class": "admin-table__learner"
};
var _hoisted_66 = {
  "class": "admin-table__who"
};
var _hoisted_67 = ["title"];
var _hoisted_68 = ["title"];
var _hoisted_69 = {
  "class": "admin-num admin-col--desktop"
};
var _hoisted_70 = {
  "class": "admin-num"
};
var _hoisted_71 = {
  "class": "admin-num admin-col--desktop"
};
var _hoisted_72 = {
  key: 1,
  "class": "admin-dash"
};
var _hoisted_73 = {
  "class": "admin-num admin-col--desktop"
};
var _hoisted_74 = {
  key: 0
};
var _hoisted_75 = {
  key: 1,
  "class": "admin-dash"
};
var _hoisted_76 = {
  "class": "admin-table__status"
};
var _hoisted_77 = ["data-status", "title", "aria-label"];
var _hoisted_78 = ["aria-label", "aria-expanded", "onClick"];
var _hoisted_79 = {
  key: 0,
  "class": "admin-row-menu__panel",
  role: "menu"
};
var _hoisted_80 = ["onClick"];
var _hoisted_81 = ["href"];
var _hoisted_82 = ["disabled", "onClick"];
var _hoisted_83 = {
  key: 4,
  "class": "admin-pagination"
};
var _hoisted_84 = {
  "class": "admin-pagination__controls"
};
var _hoisted_85 = ["disabled"];
var _hoisted_86 = ["disabled", "onClick"];
var _hoisted_87 = ["disabled"];
var _hoisted_88 = ["aria-label"];
var _hoisted_89 = ["aria-label"];
var _hoisted_90 = {
  "class": "admin-drawer"
};
var _hoisted_91 = {
  "class": "admin-drawer__head"
};
var _hoisted_92 = {
  "class": "admin-drawer__identity"
};
var _hoisted_93 = {
  "class": "admin-avatar",
  "aria-hidden": "true"
};
var _hoisted_94 = {
  "class": "admin-drawer__titles"
};
var _hoisted_95 = {
  "class": "admin-inline-field__label"
};
var _hoisted_96 = {
  "class": "visually-hidden"
};
var _hoisted_97 = {
  "class": "admin-inline-field__label"
};
var _hoisted_98 = {
  "class": "visually-hidden"
};
var _hoisted_99 = {
  "class": "admin-drawer__meta"
};
var _hoisted_100 = ["data-status", "title", "aria-label"];
var _hoisted_101 = {
  "class": "admin-drawer__status-label"
};
var _hoisted_102 = ["disabled"];
var _hoisted_103 = {
  key: 0,
  "class": "admin-form__error",
  role: "alert"
};
var _hoisted_104 = ["aria-label"];
var _hoisted_105 = {
  "class": "admin-drawer__scroll"
};
var _hoisted_106 = {
  key: 0,
  "class": "admin-empty"
};
var _hoisted_107 = {
  key: 1,
  "class": "admin-empty",
  role: "alert"
};
var _hoisted_108 = {
  key: 2,
  "class": "admin-drawer__body"
};
var _hoisted_109 = ["aria-label"];
var _hoisted_110 = ["href"];
var _hoisted_111 = ["disabled"];
var _hoisted_112 = ["disabled"];
var _hoisted_113 = {
  "class": "admin-statstrip"
};
var _hoisted_114 = {
  "class": "admin-drawer-panel"
};
var _hoisted_115 = {
  key: 0,
  "class": "admin-muted"
};
var _hoisted_116 = {
  key: 1,
  "class": "admin-surah-list"
};
var _hoisted_117 = {
  "class": "admin-surah-progress__head"
};
var _hoisted_118 = {
  "class": "admin-surah-progress__name"
};
var _hoisted_119 = {
  "class": "admin-surah-progress__meta"
};
var _hoisted_120 = ["aria-valuenow", "aria-label"];
var _hoisted_121 = {
  "class": "admin-drawer-panel"
};
var _hoisted_122 = {
  key: 0,
  "class": "admin-muted"
};
var _hoisted_123 = {
  key: 1,
  "class": "admin-session-list"
};
var _hoisted_124 = {
  "class": "admin-session-list__line1"
};
var _hoisted_125 = {
  "class": "admin-session-list__kind"
};
var _hoisted_126 = {
  key: 0
};
var _hoisted_127 = {
  "class": "admin-session-list__line2"
};
var _hoisted_128 = ["data-outcome"];
var _hoisted_129 = {
  "class": "admin-session-list__line1"
};
var _hoisted_130 = {
  "class": "admin-session-list__kind"
};
var _hoisted_131 = {
  key: 0
};
var _hoisted_132 = {
  "class": "admin-session-list__line2"
};
var _hoisted_133 = {
  "class": "admin-drawer-panel admin-drawer-panel--meta"
};
var _hoisted_134 = {
  "class": "admin-account-info__list"
};
var _hoisted_135 = ["title"];
var _hoisted_136 = ["value"];
var _hoisted_137 = ["aria-label"];
var _hoisted_138 = ["aria-label"];
var _hoisted_139 = {
  "class": "admin-modal"
};
var _hoisted_140 = {
  "class": "admin-modal__head"
};
var _hoisted_141 = ["aria-label"];
var _hoisted_142 = ["value"];
var _hoisted_143 = {
  key: 0,
  "class": "admin-form__error",
  role: "alert"
};
var _hoisted_144 = {
  "class": "admin-form__actions"
};
var _hoisted_145 = ["disabled"];
var _hoisted_146 = ["aria-label"];
var _hoisted_147 = ["aria-label"];
var _hoisted_148 = {
  "class": "admin-modal admin-modal--delete"
};
var _hoisted_149 = {
  "class": "admin-modal__head"
};
var _hoisted_150 = ["aria-label"];
var _hoisted_151 = {
  "class": "admin-muted"
};
var _hoisted_152 = {
  key: 0,
  "class": "admin-form__error",
  role: "alert"
};
var _hoisted_153 = {
  "class": "admin-form__actions"
};
var _hoisted_154 = ["disabled"];
var _hoisted_155 = ["aria-label"];
var _hoisted_156 = ["aria-label"];
var _hoisted_157 = {
  "class": "admin-modal"
};
var _hoisted_158 = {
  "class": "admin-modal__head"
};
var _hoisted_159 = ["aria-label"];
var _hoisted_160 = {
  "class": "admin-muted"
};
var _hoisted_161 = {
  "class": "admin-form__actions"
};
var _hoisted_162 = ["disabled"];
var _hoisted_163 = {
  key: 3,
  "class": "admin-toast",
  role: "status",
  "aria-live": "polite"
};
function render(_ctx, _cache, $props, $setup, $data, $options) {
  var _$data$detail, _$options$selectedLis, _$data$detail2, _$data$detail3, _$data$detail4, _$data$detail5, _$data$detail$user, _$options$selectedLis2, _ref, _$data$detail$surah_p, _$data$detail$user2, _$data$detail$user3, _$data$detail$user4, _$data$detail$stats;
  return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("main", {
    id: "mainContent",
    "class": "admin-console",
    tabindex: "-1",
    onKeydown: _cache[62] || (_cache[62] = function () {
      return $options.onConsoleKeydown && $options.onConsoleKeydown.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_1, [$data.bootLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_2, [_cache[63] || (_cache[63] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "admin-spinner",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.loading')), 1 /* TEXT */)])) : $data.bootError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.load_error')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn",
    onClick: _cache[0] || (_cache[0] = function ($event) {
      return $options.boot(true);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.retry')), 1 /* TEXT */)])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 2
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_5, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_6, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.eyebrow')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h1", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.greeting', {
    name: $options.greetingName
  })), 1 /* TEXT */), _cache[64] || (_cache[64] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "admin-rule",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_7, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.supporting_message')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_8, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "admin-range",
    role: "group",
    "aria-label": _ctx.t('admin.days_range')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-btn admin-btn--ghost admin-btn--sm", {
      'is-active': $data.chartDays === 7
    }]),
    onClick: _cache[1] || (_cache[1] = function ($event) {
      return $options.setChartDays(7);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.days_7')), 3 /* TEXT, CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-btn admin-btn--ghost admin-btn--sm", {
      'is-active': $data.chartDays === 30
    }]),
    onClick: _cache[2] || (_cache[2] = function ($event) {
      return $options.setChartDays(30);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.days_30')), 3 /* TEXT, CLASS */)], 8 /* PROPS */, _hoisted_9), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    disabled: $data.refreshing,
    "aria-label": _ctx.t('admin.refresh'),
    onClick: _cache[3] || (_cache[3] = function () {
      return $options.refreshAll && $options.refreshAll.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi bi-arrow-clockwise", {
      'is-spinning': $data.refreshing
    }]),
    "aria-hidden": "true"
  }, null, 2 /* CLASS */)], 8 /* PROPS */, _hoisted_10)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "admin-kpis",
    "aria-label": _ctx.t('admin.snapshot_title')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.snapshotCards, function (metric, index) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
      key: metric.key,
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-kpi admin-reveal", metric.toneClass]),
      style: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeStyle)({
        '--admin-delay': "".concat(60 + index * 40, "ms")
      }),
      title: metric.tooltip || undefined,
      onClick: function onClick($event) {
        return $options.onKpiClick(metric);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(metric.value), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(metric.label), 1 /* TEXT */), metric.trendLabel ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("em", {
      key: 0,
      "class": "admin-kpi__trend",
      "data-dir": metric.trendDir
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(metric.trendLabel), 9 /* TEXT, PROPS */, _hoisted_13)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 14 /* CLASS, STYLE, PROPS */, _hoisted_12);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_11)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" USERS "), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", {
    ref: "usersSection",
    "class": "admin-users admin-reveal",
    style: {
      "--admin-delay": "120ms"
    },
    "aria-label": _ctx.t('admin.users_title')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_15, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_16, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_17, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.learners_title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_18, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_19, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.users_title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_20, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.usersTotal), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_21, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.users_subtitle')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_22, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--ghost admin-users__action",
    onClick: _cache[4] || (_cache[4] = function () {
      return $options.exportVisibleUsersCsv && $options.exportVisibleUsersCsv.apply($options, arguments);
    })
  }, [_cache[65] || (_cache[65] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-download",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.export_csv')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--primary admin-users__action",
    onClick: _cache[5] || (_cache[5] = function () {
      return $options.openCreateModal && $options.openCreateModal.apply($options, arguments);
    })
  }, [_cache[66] || (_cache[66] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-plus-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.add_user')), 1 /* TEXT */)])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_23, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_24, [_cache[67] || (_cache[67] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-search admin-toolbar__search-icon",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    ref: "searchInput",
    "onUpdate:modelValue": _cache[6] || (_cache[6] = function ($event) {
      return $data.filters.q = $event;
    }),
    type: "search",
    "class": "admin-toolbar__search",
    placeholder: _ctx.t('admin.users_search'),
    onInput: _cache[7] || (_cache[7] = function () {
      return $options.onSearchInput && $options.onSearchInput.apply($options, arguments);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_25), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.filters.q, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_26, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[8] || (_cache[8] = function ($event) {
      return $data.filters.activity = $event;
    }),
    "class": "admin-toolbar__select admin-toolbar__select--active",
    "aria-label": _ctx.t('admin.filter_last_active'),
    onChange: _cache[9] || (_cache[9] = function () {
      return $options.onFilterChange && $options.onFilterChange.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_28, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_all_time')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_29, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_active_today')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_30, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_active_7d')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_31, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_active_30d')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_32, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_inactive_30d')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_33, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_never')), 1 /* TEXT */)], 40 /* PROPS, NEED_HYDRATION */, _hoisted_27), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.filters.activity]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[10] || (_cache[10] = function ($event) {
      return $data.filters.progress = $event;
    }),
    "class": "admin-toolbar__select admin-toolbar__select--progress",
    "aria-label": _ctx.t('admin.filter_progress_all'),
    onChange: _cache[11] || (_cache[11] = function () {
      return $options.onFilterChange && $options.onFilterChange.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_35, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_progress_all')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_36, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_progress_has')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_37, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filter_progress_none')), 1 /* TEXT */)], 40 /* PROPS, NEED_HYDRATION */, _hoisted_34), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.filters.progress]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[12] || (_cache[12] = function ($event) {
      return $data.sortKey = $event;
    }),
    "class": "admin-toolbar__select admin-toolbar__select--sort",
    "aria-label": _ctx.t('admin.sort_last_active'),
    onChange: _cache[13] || (_cache[13] = function () {
      return $options.onFilterChange && $options.onFilterChange.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_39, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.sort_last_active')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_40, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.sort_sessions')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_41, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.sort_accuracy')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("option", _hoisted_42, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.sort_memorised')), 1 /* TEXT */)], 40 /* PROPS, NEED_HYDRATION */, _hoisted_38), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.sortKey]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-toolbar__sort-dir",
    "aria-pressed": $data.sortDir === 'asc' ? 'true' : 'false',
    onClick: _cache[14] || (_cache[14] = function () {
      return $options.toggleSortDir && $options.toggleSortDir.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.sortDir === 'asc' ? _ctx.t('admin.sort_asc') : _ctx.t('admin.sort_desc')), 9 /* TEXT, PROPS */, _hoisted_43), $options.activeFilterCount > 0 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 0,
    type: "button",
    "class": "admin-filter-badge",
    onClick: _cache[15] || (_cache[15] = function () {
      return $options.clearFilters && $options.clearFilters.apply($options, arguments);
    })
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filters_active_count', {
    n: $options.activeFilterCount
  })), 1 /* TEXT */), _cache[68] || (_cache[68] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */))])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_44, [$options.filtersActive ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 0
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.showing_x_of_y_filtered', {
    shown: $data.users.length,
    total: $data.usersTotal
  })), 1 /* TEXT */)], 64 /* STABLE_FRAGMENT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
    key: 1
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createTextVNode)((0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.showing_x_of_y', {
    shown: $data.users.length,
    total: $data.usersTotal
  })), 1 /* TEXT */)], 64 /* STABLE_FRAGMENT */))]), $data.selectedIds.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_45, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_selected', {
    n: $data.selectedIds.length
  })), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--sm",
    disabled: $data.bulkBusy,
    onClick: _cache[16] || (_cache[16] = function () {
      return $options.bulkSendEmail && $options.bulkSendEmail.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_send_email')), 9 /* TEXT, PROPS */, _hoisted_46), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[17] || (_cache[17] = function ($event) {
      return $data.bulkStatus = $event;
    }),
    "class": "admin-toolbar__select",
    "aria-label": _ctx.t('admin.bulk_change_subscription')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.subscriptionOptions, function (status) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: status,
      value: status
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.subscriptionLabel(status)), 9 /* TEXT, PROPS */, _hoisted_48);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_47), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.bulkStatus]]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--sm",
    disabled: $data.bulkBusy,
    onClick: _cache[18] || (_cache[18] = function () {
      return $options.runBulkStatus && $options.runBulkStatus.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_change_subscription')), 9 /* TEXT, PROPS */, _hoisted_49), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--sm",
    disabled: $data.bulkBusy,
    onClick: _cache[19] || (_cache[19] = function () {
      return $options.exportSelectedCsv && $options.exportSelectedCsv.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_export_csv')), 9 /* TEXT, PROPS */, _hoisted_50), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--danger admin-btn--sm",
    disabled: $data.bulkBusy,
    onClick: _cache[20] || (_cache[20] = function () {
      return $options.bulkDeactivate && $options.bulkDeactivate.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_deactivate')), 9 /* TEXT, PROPS */, _hoisted_51), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-link",
    onClick: _cache[21] || (_cache[21] = function ($event) {
      return $data.selectedIds = [];
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.bulk_clear')), 1 /* TEXT */)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $data.usersLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_52, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.drawer_loading')), 1 /* TEXT */)) : $data.usersError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_53, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.drawer_load_error')), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 3,
    "class": "admin-table-wrap",
    role: "listbox",
    "aria-label": _ctx.t('admin.users_title')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("table", _hoisted_55, [_cache[71] || (_cache[71] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("colgroup", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-check"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-learner"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-num admin-col-memorised admin-col--desktop"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-num admin-col-sessions"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-num admin-col-accuracy admin-col--desktop"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-date admin-col--desktop"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-status"
  }), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("col", {
    "class": "admin-col-actions"
  })], -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("thead", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("tr", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_56, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    type: "checkbox",
    checked: $options.allVisibleSelected,
    "aria-label": _ctx.t('admin.select_all'),
    onChange: _cache[22] || (_cache[22] = function () {
      return $options.toggleSelectAll && $options.toggleSelectAll.apply($options, arguments);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_57)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_learner')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_58, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-th-sort", {
      'is-active': $data.sortKey === 'memorised'
    }]),
    onClick: _cache[23] || (_cache[23] = function ($event) {
      return $options.setSort('memorised');
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_memorised')), 3 /* TEXT, CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-th-sort", {
      'is-active': $data.sortKey === 'sessions'
    }]),
    onClick: _cache[24] || (_cache[24] = function ($event) {
      return $options.setSort('sessions');
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_sessions')), 3 /* TEXT, CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_59, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-th-sort", {
      'is-active': $data.sortKey === 'accuracy'
    }]),
    onClick: _cache[25] || (_cache[25] = function ($event) {
      return $options.setSort('accuracy');
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_accuracy')), 3 /* TEXT, CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", _hoisted_60, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_last_ai')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_status')), 1 /* TEXT */), _cache[69] || (_cache[69] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("th", {
    "class": "admin-table__actions"
  }, null, -1 /* CACHED */))])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("tbody", null, [!$data.users.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("tr", _hoisted_61, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_62, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.users_empty')), 1 /* TEXT */), $options.filtersActive ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 0,
    type: "button",
    "class": "admin-link",
    onClick: _cache[26] || (_cache[26] = function () {
      return $options.clearFilters && $options.clearFilters.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.filters_clear')), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.users, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("tr", {
      key: row.id,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)({
        'is-selected': $data.selectedUserId === row.id,
        'has-menu-open': $data.rowMenuId === row.id
      }),
      tabindex: "0",
      onClick: function onClick($event) {
        return $options.selectUser(row.id);
      },
      onKeydown: (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function ($event) {
        return $options.selectUser(row.id);
      }, ["prevent"]), ["enter"])
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", {
      "class": "admin-table__check",
      onClick: _cache[27] || (_cache[27] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {}, ["stop"]))
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
      type: "checkbox",
      checked: $data.selectedIds.includes(row.id),
      onChange: function onChange($event) {
        return $options.toggleSelect(row.id);
      }
    }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_64)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_65, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_66, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", {
      title: row.name || _ctx.t('admin.unnamed')
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.name || _ctx.t('admin.unnamed')), 9 /* TEXT, PROPS */, _hoisted_67), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": "admin-table__email",
      title: row.email
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.email), 9 /* TEXT, PROPS */, _hoisted_68)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_69, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.memorised_ayahs), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_70, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.sessions_completed), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_71, [row.avg_ai_accuracy != null ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($options.accuracyToneClass(row.avg_ai_accuracy))
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.accuracy', {
      n: row.avg_ai_accuracy
    })), 3 /* TEXT, CLASS */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_72, "—"))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_73, [row.last_ai_check_at ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_74, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatDateShort(row.last_ai_check_at)), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_75, "—"))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", _hoisted_76, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": "admin-status-dot",
      "data-status": $options.activityStatus(row),
      title: $options.activityStatusLabel(row),
      "aria-label": $options.activityStatusLabel(row)
    }, null, 8 /* PROPS */, _hoisted_77)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("td", {
      "class": "admin-table__actions",
      onClick: _cache[30] || (_cache[30] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {}, ["stop"]))
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-row-menu", {
        'is-open': $data.rowMenuId === row.id
      }])
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": "admin-row-menu__btn",
      "aria-label": _ctx.t('admin.row_actions'),
      "aria-expanded": $data.rowMenuId === row.id ? 'true' : 'false',
      onClick: function onClick($event) {
        return $options.toggleRowMenu(row.id);
      }
    }, _toConsumableArray(_cache[70] || (_cache[70] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "aria-hidden": "true"
    }, "⋮", -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_78), $data.rowMenuId === row.id ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_79, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      role: "menuitem",
      onClick: function onClick($event) {
        return $options.askResetPassword(row);
      }
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_reset_password')), 9 /* TEXT, PROPS */, _hoisted_80), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
      role: "menuitem",
      href: "mailto:".concat(row.email),
      onClick: _cache[28] || (_cache[28] = function ($event) {
        return $data.rowMenuId = null;
      })
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_send_email')), 9 /* TEXT, PROPS */, _hoisted_81), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      role: "menuitem",
      "class": "is-danger",
      disabled: Number(row.id) === $options.ownerId || row.subscription_status === 'canceled',
      onClick: function onClick($event) {
        return $options.askDeactivate(row);
      }
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_deactivate')), 9 /* TEXT, PROPS */, _hoisted_82), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      role: "menuitem",
      onClick: _cache[29] || (_cache[29] = function () {
        return $options.viewAsLearner && $options.viewAsLearner.apply($options, arguments);
      })
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_view_as_learner')), 1 /* TEXT */)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 2 /* CLASS */)])], 42 /* CLASS, PROPS, NEED_HYDRATION */, _hoisted_63);
  }), 128 /* KEYED_FRAGMENT */))])])], 8 /* PROPS */, _hoisted_54)), $data.usersTotal > 0 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_83, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_84, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--ghost admin-btn--sm",
    disabled: $data.usersPage <= 1 || $data.usersLoading,
    onClick: _cache[31] || (_cache[31] = function ($event) {
      return $options.goToPage($data.usersPage - 1);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.pagination_prev')), 9 /* TEXT, PROPS */, _hoisted_85), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.pageNumbers, function (page) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
      key: page,
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-btn admin-btn--ghost admin-btn--sm admin-pagination__page", {
        'is-active': page === $data.usersPage
      }]),
      disabled: $data.usersLoading,
      onClick: function onClick($event) {
        return $options.goToPage(page);
      }
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(page), 11 /* TEXT, CLASS, PROPS */, _hoisted_86);
  }), 128 /* KEYED_FRAGMENT */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--ghost admin-btn--sm",
    disabled: $data.usersPage >= $data.usersTotalPages || $data.usersLoading,
    onClick: _cache[32] || (_cache[32] = function ($event) {
      return $options.goToPage($data.usersPage + 1);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.pagination_next')), 9 /* TEXT, PROPS */, _hoisted_87)])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 8 /* PROPS */, _hoisted_14)], 64 /* STABLE_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" User drawer (teleported to escape layout stacking) "), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Teleport, {
    to: "body"
  }, [$data.drawerOpen && $data.selectedUserId ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 0,
    "class": "admin-drawer-root",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": _ctx.t('admin.drawer_user_title')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-drawer__backdrop",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[33] || (_cache[33] = function () {
      return $options.closeDrawer && $options.closeDrawer.apply($options, arguments);
    })
  }, null, 8 /* PROPS */, _hoisted_89), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("aside", _hoisted_90, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_91, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_92, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_93, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.userInitials(((_$data$detail = $data.detail) === null || _$data$detail === void 0 || (_$data$detail = _$data$detail.user) === null || _$data$detail === void 0 ? void 0 : _$data$detail.name) || ((_$options$selectedLis = $options.selectedListRow) === null || _$options$selectedLis === void 0 ? void 0 : _$options$selectedLis.name))), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_94, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-inline-field", {
      'is-dirty': $options.editFieldDirty('name')
    }])
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_95, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_96, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_name')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[34] || (_cache[34] = function ($event) {
      return $data.editForm.name = $event;
    }),
    type: "text",
    maxlength: "120",
    "class": "admin-inline-field__input admin-inline-field__input--name",
    onBlur: _cache[35] || (_cache[35] = function () {
      return $options.onEditBlur && $options.onEditBlur.apply($options, arguments);
    })
  }, null, 544 /* NEED_HYDRATION, NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.editForm.name, void 0, {
    trim: true
  }]]), _cache[72] || (_cache[72] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-pencil admin-inline-field__icon",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */))])], 2 /* CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-inline-field", {
      'is-dirty': $options.editFieldDirty('email')
    }])
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_97, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_98, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_email')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[36] || (_cache[36] = function ($event) {
      return $data.editForm.email = $event;
    }),
    type: "email",
    maxlength: "255",
    "class": "admin-inline-field__input admin-inline-field__input--email",
    onBlur: _cache[37] || (_cache[37] = function () {
      return $options.onEditBlur && $options.onEditBlur.apply($options, arguments);
    })
  }, null, 544 /* NEED_HYDRATION, NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.editForm.email, void 0, {
    trim: true
  }]]), _cache[73] || (_cache[73] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-pencil admin-inline-field__icon",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */))])], 2 /* CLASS */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_99, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "admin-status-dot",
    "data-status": $options.activityStatus(((_$data$detail2 = $data.detail) === null || _$data$detail2 === void 0 ? void 0 : _$data$detail2.user) || $options.selectedListRow || {}),
    title: $options.activityStatusLabel(((_$data$detail3 = $data.detail) === null || _$data$detail3 === void 0 ? void 0 : _$data$detail3.user) || $options.selectedListRow || {}),
    "aria-label": $options.activityStatusLabel(((_$data$detail4 = $data.detail) === null || _$data$detail4 === void 0 ? void 0 : _$data$detail4.user) || $options.selectedListRow || {})
  }, null, 8 /* PROPS */, _hoisted_100), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_101, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.activityStatusLabel(((_$data$detail5 = $data.detail) === null || _$data$detail5 === void 0 ? void 0 : _$data$detail5.user) || $options.selectedListRow || {})), 1 /* TEXT */), $options.editFormDirty ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 0,
    type: "button",
    "class": "admin-btn admin-btn--primary admin-btn--sm",
    disabled: $data.formSaving,
    onClick: _cache[38] || (_cache[38] = function () {
      return $options.saveUser && $options.saveUser.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.formSaving ? _ctx.t('admin.saving') : _ctx.t('admin.save_user')), 9 /* TEXT, PROPS */, _hoisted_102)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), $data.formError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_103, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.formError), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn admin-drawer__close",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[39] || (_cache[39] = function () {
      return $options.closeDrawer && $options.closeDrawer.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[74] || (_cache[74] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_104)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_105, [$data.detailLoading ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_106, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.drawer_loading')), 1 /* TEXT */)) : $data.detailError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_107, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.drawer_load_error')), 1 /* TEXT */)) : $data.detail ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_108, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "admin-drawer__quick",
    role: "group",
    "aria-label": _ctx.t('admin.row_actions')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-quick-btn",
    onClick: _cache[40] || (_cache[40] = function ($event) {
      return $options.askResetPassword($data.detail.user || $options.selectedListRow);
    })
  }, [_cache[75] || (_cache[75] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-key",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_reset_password')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("a", {
    "class": "admin-quick-btn",
    href: "mailto:".concat(((_$data$detail$user = $data.detail.user) === null || _$data$detail$user === void 0 ? void 0 : _$data$detail$user.email) || ((_$options$selectedLis2 = $options.selectedListRow) === null || _$options$selectedLis2 === void 0 ? void 0 : _$options$selectedLis2.email) || '')
  }, [_cache[76] || (_cache[76] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-envelope",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_send_email')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_110), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-quick-btn admin-quick-btn--danger",
    disabled: $options.isSelfSelected || ((_ref = $data.detail.user || $options.selectedListRow) === null || _ref === void 0 ? void 0 : _ref.subscription_status) === 'canceled',
    onClick: _cache[41] || (_cache[41] = function ($event) {
      return $options.askDeactivate($data.detail.user || $options.selectedListRow);
    })
  }, [_cache[77] || (_cache[77] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-pause-circle",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.action_deactivate')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_111), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-quick-btn admin-quick-btn--danger",
    disabled: $data.deletingUser || $options.isSelfSelected,
    onClick: _cache[42] || (_cache[42] = function () {
      return $options.openDeleteModal && $options.openDeleteModal.apply($options, arguments);
    })
  }, [_cache[78] || (_cache[78] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-trash",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete_account')), 1 /* TEXT */)], 8 /* PROPS */, _hoisted_112)], 8 /* PROPS */, _hoisted_109), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_113, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.detailStats, function (stat) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: stat.key
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(stat.value), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(stat.label), 1 /* TEXT */)]);
  }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_114, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_surahs')), 1 /* TEXT */), !((_$data$detail$surah_p = $data.detail.surah_progress) !== null && _$data$detail$surah_p !== void 0 && _$data$detail$surah_p.length) ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_115, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_surahs_empty_soft')), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_116, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.detail.surah_progress, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: row.surah_number,
      "class": "admin-surah-progress"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_117, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_118, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.surah_name), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_119, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_surah_fraction', {
      practised: row.practised,
      total: row.total_ayahs
    })) + " · " + (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_surah_percent', {
      n: row.percent
    })), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
      "class": "admin-surah-progress__track",
      role: "progressbar",
      "aria-valuenow": row.percent,
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-label": row.surah_name
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-surah-progress__fill", {
        'is-zero': !row.percent
      }]),
      style: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeStyle)({
        width: $options.surahBarWidth(row)
      })
    }, null, 6 /* CLASS, STYLE */)], 8 /* PROPS */, _hoisted_120)]);
  }), 128 /* KEYED_FRAGMENT */))]))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_121, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_activity')), 1 /* TEXT */), !$options.detailSessions.length && !$options.detailAiChecks.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_122, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_activity_empty')), 1 /* TEXT */)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("ul", _hoisted_123, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.detailSessions, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: "s-".concat(row.id)
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_124, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_125, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.activity_type_session')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.surah_name || '—'), 1 /* TEXT */), $options.formatItemRange(row) ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_126, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatItemRange(row)), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_127, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
      "class": "admin-outcome",
      "data-outcome": $options.sessionOutcomeKey(row)
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.sessionOutcomeLabel(row)), 9 /* TEXT, PROPS */, _hoisted_128), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("time", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatDateShort(row.occurred_at) || $options.formatRelative(row.occurred_at)), 1 /* TEXT */)])]);
  }), 128 /* KEYED_FRAGMENT */)), ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.detailAiChecks, function (row) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("li", {
      key: "a-".concat(row.id)
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_129, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_130, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.activity_type_ai')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(row.surah_name || '—'), 1 /* TEXT */), $options.formatItemRange(row) ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", _hoisted_131, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatItemRange(row)), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_132, [row.accuracy_percent != null ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("span", {
      key: 0,
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)($options.accuracyToneClass(row.accuracy_percent))
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.accuracy', {
      n: Number(row.accuracy_percent)
    })), 3 /* TEXT, CLASS */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("time", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatDateShort(row.occurred_at) || $options.formatRelative(row.occurred_at)), 1 /* TEXT */)])]);
  }), 128 /* KEYED_FRAGMENT */))]))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("section", _hoisted_133, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dl", _hoisted_134, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_created_at')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatDateShort((_$data$detail$user2 = $data.detail.user) === null || _$data$detail$user2 === void 0 ? void 0 : _$data$detail$user2.created_at) || '—'), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.col_active')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", {
    title: $options.formatDateShort((_$data$detail$user3 = $data.detail.user) === null || _$data$detail$user3 === void 0 ? void 0 : _$data$detail$user3.last_activity_at) || undefined
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.formatRelative((_$data$detail$user4 = $data.detail.user) === null || _$data$detail$user4 === void 0 ? void 0 : _$data$detail$user4.last_activity_at) || '—'), 9 /* TEXT, PROPS */, _hoisted_135)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_subscription')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[43] || (_cache[43] = function ($event) {
      return $data.editForm.subscription_status = $event;
    }),
    "class": "admin-account-info__select",
    onChange: _cache[44] || (_cache[44] = function () {
      return $options.onEditBlur && $options.onEditBlur.apply($options, arguments);
    })
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.subscriptionOptions, function (status) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: status,
      value: status
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.subscriptionLabel(status)), 9 /* TEXT, PROPS */, _hoisted_136);
  }), 128 /* KEYED_FRAGMENT */))], 544 /* NEED_HYDRATION, NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.editForm.subscription_status]])])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dt", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.user_notes')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("dd", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.notes_written', {
    n: Number(((_$data$detail$stats = $data.detail.stats) === null || _$data$detail$stats === void 0 ? void 0 : _$data$detail$stats.notes) || 0)
  })), 1 /* TEXT */)])])])])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])])], 8 /* PROPS */, _hoisted_88)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)])), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Create modal "), $data.createOpen ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 0,
    "class": "admin-modal-root",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": _ctx.t('admin.drawer_create_title')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-modal__backdrop",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[45] || (_cache[45] = function ($event) {
      return $data.createOpen = false;
    })
  }, null, 8 /* PROPS */, _hoisted_138), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_139, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_140, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.drawer_create_title')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[46] || (_cache[46] = function ($event) {
      return $data.createOpen = false;
    })
  }, _toConsumableArray(_cache[79] || (_cache[79] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_141)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("form", {
    "class": "admin-form",
    onSubmit: _cache[52] || (_cache[52] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.createUser && $options.createUser.apply($options, arguments);
    }, ["prevent"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_name')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[47] || (_cache[47] = function ($event) {
      return $data.createForm.name = $event;
    }),
    type: "text",
    required: "",
    maxlength: "120"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.createForm.name, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_email')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[48] || (_cache[48] = function ($event) {
      return $data.createForm.email = $event;
    }),
    type: "email",
    required: "",
    maxlength: "255"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.createForm.email, void 0, {
    trim: true
  }]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.field_subscription_tier')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    "onUpdate:modelValue": _cache[49] || (_cache[49] = function ($event) {
      return $data.createForm.subscription_tier = $event;
    })
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.tierOptions, function (tier) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: tier,
      value: tier
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.tierLabel(tier)), 9 /* TEXT, PROPS */, _hoisted_142);
  }), 128 /* KEYED_FRAGMENT */))], 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelSelect, $data.createForm.subscription_tier]])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.add_user_note')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("textarea", {
    "onUpdate:modelValue": _cache[50] || (_cache[50] = function ($event) {
      return $data.createForm.note = $event;
    }),
    rows: "3",
    maxlength: "500"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.createForm.note, void 0, {
    trim: true
  }]])]), $data.createError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_143, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.createError), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_144, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--ghost",
    onClick: _cache[51] || (_cache[51] = function ($event) {
      return $data.createOpen = false;
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.cancel')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "submit",
    "class": "admin-btn admin-btn--primary",
    disabled: $data.createSaving
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.createSaving ? _ctx.t('admin.saving') : _ctx.t('admin.create_user')), 9 /* TEXT, PROPS */, _hoisted_145)])], 32 /* NEED_HYDRATION */)])], 8 /* PROPS */, _hoisted_137)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Delete confirm modal "), $data.deleteOpen ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 1,
    "class": "admin-modal-root",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": _ctx.t('admin.delete_user')
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-modal__backdrop",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[53] || (_cache[53] = function () {
      return $options.closeDeleteModal && $options.closeDeleteModal.apply($options, arguments);
    })
  }, null, 8 /* PROPS */, _hoisted_147), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_148, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_149, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete_user')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[54] || (_cache[54] = function () {
      return $options.closeDeleteModal && $options.closeDeleteModal.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[80] || (_cache[80] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_150)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_151, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete_user_prompt', {
    name: $options.deleteTargetName || _ctx.t('admin.unnamed')
  })), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.delete_type_name', {
    name: $options.deleteTargetName
  })), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.withDirectives)((0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    "onUpdate:modelValue": _cache[55] || (_cache[55] = function ($event) {
      return $data.deleteConfirmName = $event;
    }),
    type: "text",
    autocomplete: "off"
  }, null, 512 /* NEED_PATCH */), [[vue__WEBPACK_IMPORTED_MODULE_0__.vModelText, $data.deleteConfirmName, void 0, {
    trim: true
  }]])]), $data.formError ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_152, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.formError), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_153, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--ghost",
    onClick: _cache[56] || (_cache[56] = function () {
      return $options.closeDeleteModal && $options.closeDeleteModal.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.cancel')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--danger",
    disabled: $data.deletingUser || !$options.deleteConfirmReady,
    onClick: _cache[57] || (_cache[57] = function () {
      return $options.confirmDeleteUser && $options.confirmDeleteUser.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.deletingUser ? _ctx.t('admin.saving') : _ctx.t('admin.delete_user')), 9 /* TEXT, PROPS */, _hoisted_154)])])], 8 /* PROPS */, _hoisted_146)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Action confirm modal (reset / deactivate) "), $data.confirmOpen ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
    key: 2,
    "class": "admin-modal-root",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": $options.confirmTitle
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-modal__backdrop",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[58] || (_cache[58] = function () {
      return $options.closeConfirmModal && $options.closeConfirmModal.apply($options, arguments);
    })
  }, null, 8 /* PROPS */, _hoisted_156), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_157, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("header", _hoisted_158, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.confirmTitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-icon-btn",
    "aria-label": _ctx.t('admin.drawer_close'),
    onClick: _cache[59] || (_cache[59] = function () {
      return $options.closeConfirmModal && $options.closeConfirmModal.apply($options, arguments);
    })
  }, _toConsumableArray(_cache[81] || (_cache[81] = [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
    "class": "bi bi-x-lg",
    "aria-hidden": "true"
  }, null, -1 /* CACHED */)])), 8 /* PROPS */, _hoisted_159)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_160, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.confirmMessage), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_161, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "admin-btn admin-btn--ghost",
    onClick: _cache[60] || (_cache[60] = function () {
      return $options.closeConfirmModal && $options.closeConfirmModal.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('admin.cancel')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["admin-btn", $data.confirmKind === 'deactivate' ? 'admin-btn--danger' : 'admin-btn--primary']),
    disabled: $data.confirmBusy,
    onClick: _cache[61] || (_cache[61] = function () {
      return $options.runConfirmAction && $options.runConfirmAction.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.confirmBusy ? _ctx.t('admin.saving') : $options.confirmTitle), 11 /* TEXT, CLASS, PROPS */, _hoisted_162)])])], 8 /* PROPS */, _hoisted_155)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)(" Toast "), $data.toastMessage ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_163, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.toastMessage), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 32 /* NEED_HYDRATION */);
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
      var _ref, _ref$limit, limit, _ref$page, page, _ref$per_page, per_page, _ref$q, q, _ref$status, status, _ref$activity, activity, _ref$progress, progress, _ref$sessions, sessions, _ref$sort, sort, _ref$dir, dir, _yield$withRetry2, data;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.n) {
          case 0:
            _ref = _arguments2.length > 0 && _arguments2[0] !== undefined ? _arguments2[0] : {}, _ref$limit = _ref.limit, limit = _ref$limit === void 0 ? 20 : _ref$limit, _ref$page = _ref.page, page = _ref$page === void 0 ? 1 : _ref$page, _ref$per_page = _ref.per_page, per_page = _ref$per_page === void 0 ? 20 : _ref$per_page, _ref$q = _ref.q, q = _ref$q === void 0 ? '' : _ref$q, _ref$status = _ref.status, status = _ref$status === void 0 ? '' : _ref$status, _ref$activity = _ref.activity, activity = _ref$activity === void 0 ? '' : _ref$activity, _ref$progress = _ref.progress, progress = _ref$progress === void 0 ? '' : _ref$progress, _ref$sessions = _ref.sessions, sessions = _ref$sessions === void 0 ? '' : _ref$sessions, _ref$sort = _ref.sort, sort = _ref$sort === void 0 ? 'created' : _ref$sort, _ref$dir = _ref.dir, dir = _ref$dir === void 0 ? 'desc' : _ref$dir;
            _context2.n = 1;
            return (0,_learning__WEBPACK_IMPORTED_MODULE_0__.withRetry)(function () {
              return _learning__WEBPACK_IMPORTED_MODULE_0__.http.get('/admin/users', {
                params: {
                  limit: limit,
                  page: page,
                  per_page: per_page,
                  q: q || undefined,
                  status: status || undefined,
                  activity: activity || undefined,
                  progress: progress || undefined,
                  sessions: sessions || undefined,
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
              total: Number((data === null || data === void 0 ? void 0 : data.total) || 0),
              page: Number((data === null || data === void 0 ? void 0 : data.page) || page || 1),
              per_page: Number((data === null || data === void 0 ? void 0 : data.per_page) || per_page || 20),
              total_pages: Number((data === null || data === void 0 ? void 0 : data.total_pages) || 1)
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
___CSS_LOADER_EXPORT___.push([module.id, "/* Admin ops console — shares user-dashboard tokens & look */\n.admin-console {\n  --dash-cream: #f2ebe3;\n  --dash-sand: #e8ded1;\n  --dash-ink: #3c3530;\n  --dash-muted: #6d6258;\n  --dash-line: rgba(60, 53, 48, 0.14);\n  --dash-soft: #faf6f1;\n  --dash-card: #fffdfb;\n  --dash-shadow: 0 1px 2px rgba(60, 53, 48, 0.05), 0 10px 24px rgba(60, 53, 48, 0.07);\n  --dash-shadow-soft: 0 1px 2px rgba(60, 53, 48, 0.04), 0 6px 14px rgba(60, 53, 48, 0.05);\n  --dash-ease: var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));\n  --dash-radius: 18px;\n  --dash-radius-sm: 12px;\n  --dash-font: var(--font-ui, \"Avenir Next\", \"Segoe UI\", sans-serif);\n  --dash-serif: \"Iowan Old Style\", \"Palatino Linotype\", Palatino, Georgia, \"Times New Roman\", serif;\n  --dash-danger: #8b4a3c;\n  --admin-blue: #5b7c99;\n  --admin-green: #5f7d5a;\n  --admin-red: #8b4a3c;\n  --admin-gold: #d4a84b;\n  --admin-teal: #4f7c7a;\n  --admin-amber: #c4a35a;\n  /* Semantic tokens used by users table / drawer polish */\n  --border: var(--dash-line);\n  --border-accent: color-mix(in srgb, var(--admin-blue) 55%, var(--dash-line));\n  --border-danger: color-mix(in srgb, var(--dash-danger) 45%, var(--dash-line));\n  --surface-1: var(--dash-soft);\n  --surface-2: color-mix(in srgb, var(--dash-soft) 70%, var(--dash-card));\n  --text-primary: var(--dash-ink);\n  --text-secondary: color-mix(in srgb, var(--dash-ink) 78%, var(--dash-muted));\n  --text-muted: var(--dash-muted);\n  --text-danger: var(--dash-danger);\n  --text-success: var(--admin-green);\n  --text-warning: #9a7a2f;\n  --text-accent: var(--admin-blue);\n  --fill-accent: var(--dash-ink);\n  --fill-success: var(--admin-green);\n  --fill-warning: var(--admin-amber);\n  --fill-danger: var(--admin-red);\n  --on-accent: var(--dash-cream);\n  --bg-accent: color-mix(in srgb, var(--admin-blue) 14%, var(--dash-soft));\n  --bg-success: color-mix(in srgb, var(--admin-green) 16%, var(--dash-soft));\n  --bg-warning: color-mix(in srgb, var(--admin-gold) 20%, var(--dash-soft));\n  --bg-danger: color-mix(in srgb, var(--dash-danger) 12%, var(--dash-soft));\n  --radius: var(--dash-radius-sm);\n  min-height: calc(100vh - 4.5rem);\n  padding: 1.25rem 0 2.5rem;\n  color: var(--dash-ink);\n  font-family: var(--dash-font);\n  font-size: 0.92rem;\n  font-weight: 400;\n  line-height: 1.45;\n  width: 100%;\n  max-width: 100%;\n  overflow-x: clip;\n  box-sizing: border-box;\n  background:\n    radial-gradient(80% 45% at 8% 0%, color-mix(in srgb, var(--dash-sand) 55%, transparent), transparent 68%),\n    var(--dash-cream);\n}\n\n.admin-console *,\n.admin-console *::before,\n.admin-console *::after {\n  box-sizing: border-box;\n}\n\nhtml[data-theme=\"dark\"] .admin-console {\n  --dash-cream: #171411;\n  --dash-sand: #2a241f;\n  --dash-ink: #f0e7dc;\n  --dash-muted: #b7a99a;\n  --dash-line: rgba(240, 231, 220, 0.12);\n  --dash-soft: #1e1a16;\n  --dash-card: #221e1a;\n  --dash-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 28px rgba(0, 0, 0, 0.28);\n  --dash-shadow-soft: 0 1px 2px rgba(0, 0, 0, 0.24), 0 8px 16px rgba(0, 0, 0, 0.2);\n  --dash-danger: #e0a090;\n  --admin-blue: #8aa8c2;\n  --admin-green: #8faf8a;\n  --admin-red: #e0a090;\n  --admin-gold: #d4a84b;\n  --admin-teal: #7aa8a5;\n  --admin-amber: #d2b072;\n}\n\n.admin-console__shell {\n  width: 100%;\n  max-width: min(1120px, 100%);\n  margin-inline: auto;\n  padding-inline: clamp(0.75rem, 3vw, 1.35rem);\n  display: grid;\n  gap: 1rem;\n  min-width: 0;\n  overflow-x: clip;\n}\n\n.admin-console__state {\n  display: grid;\n  place-items: center;\n  gap: 0.55rem;\n  min-height: 8.5rem;\n  padding: 1.5rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow-soft);\n  color: var(--dash-muted);\n  text-align: center;\n}\n\n.admin-console__state--error { color: var(--dash-danger); }\n\n.admin-spinner {\n  width: 1.2rem;\n  height: 1.2rem;\n  border-radius: 50%;\n  border: 2px solid color-mix(in srgb, var(--dash-sand) 80%, transparent);\n  border-top-color: var(--dash-ink);\n  animation: admin-spin 0.7s linear infinite;\n}\n\n.is-spinning {\n  display: inline-block;\n  animation: admin-spin 0.8s linear infinite;\n}\n\n@keyframes admin-spin {\n  to { transform: rotate(360deg); }\n}\n\n@keyframes admin-rise {\n  from { opacity: 0; transform: translateY(6px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.admin-reveal {\n  animation: admin-rise 260ms var(--dash-ease) both;\n  animation-delay: var(--admin-delay, 0ms);\n}\n\n.admin-eyebrow {\n  display: inline-block;\n  margin: 0;\n  font-size: 0.72rem;\n  font-weight: 550;\n  letter-spacing: 0.07em;\n  text-transform: uppercase;\n  color: var(--dash-muted);\n}\n\n.admin-rule {\n  width: min(7.5rem, 45%);\n  height: 1px;\n  margin: 0.65rem 0 0;\n  background: linear-gradient(90deg, var(--dash-ink), transparent);\n  opacity: 0.35;\n}\n\n.admin-supporting {\n  margin: 0.7rem 0 0;\n  max-width: 36rem;\n  color: var(--dash-muted);\n  font-size: 0.88rem;\n  line-height: 1.4;\n}\n\n.admin-console__top {\n  display: grid;\n  gap: 1.1rem;\n  padding: 1.35rem 1.4rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: linear-gradient(165deg, var(--dash-soft), var(--dash-card) 55%);\n  box-shadow: var(--dash-shadow);\n}\n\n@media (min-width: 720px) {\n  .admin-console__top {\n    grid-template-columns: minmax(0, 1fr) auto;\n    align-items: start;\n  }\n\n  .admin-kpis {\n    grid-column: 1 / -1;\n  }\n}\n\n.admin-console__brand h1 {\n  margin: 0.35rem 0 0;\n  font-family: var(--dash-serif);\n  font-size: clamp(1.75rem, 4vw, 2.35rem);\n  font-weight: 500;\n  letter-spacing: -0.02em;\n  line-height: 1.12;\n  color: var(--dash-ink);\n}\n\n.admin-console__top-actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n\n.admin-kpis {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0.7rem;\n}\n\n@media (min-width: 720px) {\n  .admin-kpis {\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }\n}\n\n@media (min-width: 960px) {\n  .admin-kpis {\n    grid-template-columns: repeat(5, minmax(0, 1fr));\n  }\n}\n\n.admin-kpi {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  box-shadow: var(--dash-shadow-soft);\n  padding: 0.9rem 0.95rem;\n  min-height: 5.25rem;\n  text-align: left;\n  cursor: pointer;\n  color: inherit;\n  font: inherit;\n  display: grid;\n  gap: 0.25rem;\n  align-content: start;\n  position: relative;\n  overflow: hidden;\n  transition:\n    background-color 140ms var(--dash-ease),\n    border-color 140ms var(--dash-ease),\n    box-shadow 140ms var(--dash-ease),\n    transform 140ms var(--dash-ease);\n}\n\n.admin-kpi::before {\n  content: \"\";\n  position: absolute;\n  inset-block: 0;\n  inset-inline-start: 0;\n  width: 3px;\n  background: transparent;\n  transition: background 140ms var(--dash-ease);\n}\n\n.admin-kpi:hover,\n.admin-kpi:focus-visible {\n  background: var(--dash-card);\n  border-color: rgba(60, 53, 48, 0.22);\n  box-shadow: var(--dash-shadow);\n  outline: none;\n  transform: translateY(-1px);\n}\n\nhtml[data-theme=\"dark\"] .admin-kpi:hover,\nhtml[data-theme=\"dark\"] .admin-kpi:focus-visible {\n  border-color: rgba(240, 231, 220, 0.22);\n}\n\n.admin-kpi:active {\n  transform: translateY(0);\n}\n\n.admin-kpi strong {\n  font-family: var(--dash-serif);\n  font-size: 1.45rem;\n  font-weight: 500;\n  letter-spacing: -0.02em;\n  font-variant-numeric: tabular-nums;\n  line-height: 1.1;\n  color: var(--dash-ink);\n}\n\n.admin-kpi span {\n  color: var(--dash-muted);\n  font-size: 0.78rem;\n  font-weight: 450;\n  line-height: 1.3;\n}\n\n.admin-kpi__trend {\n  margin: 0.1rem 0 0;\n  font-style: normal;\n  font-size: 0.68rem;\n  font-weight: 500;\n  color: var(--dash-muted);\n}\n\n.admin-kpi__trend[data-dir=\"up\"] { color: var(--admin-green); }\n.admin-kpi__trend[data-dir=\"down\"] { color: var(--admin-red); }\n\n.admin-kpi--users::before { background: var(--admin-blue); }\n.admin-kpi--active-high::before,\n.admin-kpi--active-mid::before { background: var(--admin-green); }\n.admin-kpi--active-low::before { background: var(--admin-red); }\n.admin-kpi--memorised::before { background: var(--admin-gold); }\n.admin-kpi--sessions::before { background: var(--admin-teal); }\n.admin-kpi--pending::before { background: var(--admin-amber); }\n\n.admin-kpi--users,\n.admin-kpi--active-high,\n.admin-kpi--active-mid,\n.admin-kpi--active-low,\n.admin-kpi--memorised,\n.admin-kpi--sessions,\n.admin-kpi--pending {\n  background: var(--dash-soft);\n}\n\n.admin-range {\n  display: inline-flex;\n  flex-wrap: wrap;\n  gap: 0.25rem;\n  padding: 0.2rem;\n  border: 1px solid var(--dash-line);\n  border-radius: 999px;\n  background: var(--dash-soft);\n}\n\n.admin-range .admin-btn {\n  box-shadow: none;\n  border-color: transparent;\n  background: transparent;\n  min-height: 1.85rem;\n}\n\n.admin-range .admin-btn.is-active {\n  background: var(--dash-card);\n  color: var(--dash-ink);\n  border-color: transparent;\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-btn.is-active {\n  background: var(--dash-ink);\n  color: var(--dash-cream);\n  border-color: transparent;\n}\n\n.admin-top-learners {\n  grid-column: 1 / -1;\n  border-top: 1px solid var(--dash-line);\n  padding-top: 0.85rem;\n  display: grid;\n  gap: 0.55rem;\n}\n\n.admin-top-learners__head {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.55rem;\n}\n\n.admin-top-learners__head h2 {\n  margin: 0;\n  font-family: var(--dash-serif);\n  font-size: 1.05rem;\n  font-weight: 500;\n}\n\n.admin-top-learners__list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  gap: 0.35rem;\n}\n\n.admin-top-learners__row {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  width: 100%;\n  border: 0;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  gap: 0.35rem 0.85rem;\n  padding: 0.4rem 0.2rem;\n  border-radius: 8px;\n}\n\n.admin-top-learners__row:hover,\n.admin-top-learners__row:focus-visible {\n  background: var(--dash-soft);\n}\n\n.admin-top-learners__name {\n  font-weight: 500;\n  color: var(--dash-ink);\n}\n\n.admin-top-learners__meta {\n  color: var(--dash-muted);\n  font-size: 0.78rem;\n}\n\n.admin-users {\n  width: 100%;\n  max-width: 100%;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow);\n  padding: 1.25rem 1.35rem 1.2rem;\n  min-width: 0;\n  display: grid;\n  grid-template-rows: auto auto auto auto 1fr auto;\n  gap: 0;\n  min-height: min(68vh, 42rem);\n  overflow: hidden;\n}\n\n.admin-users__header {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 1rem;\n  padding: 0 0 1rem;\n  margin-bottom: 0.15rem;\n  border-bottom: 1px solid var(--dash-line);\n}\n\n.admin-users__title-row {\n  display: flex;\n  align-items: center;\n  gap: 0.55rem;\n  margin-top: 0.3rem;\n}\n\n.admin-users__title {\n  margin: 0;\n  font-family: var(--dash-serif);\n  font-size: clamp(1.2rem, 2.2vw, 1.4rem);\n  font-weight: 500;\n  letter-spacing: -0.015em;\n  color: var(--dash-ink);\n  line-height: 1.2;\n}\n\n.admin-users__count {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.22rem 0.65rem;\n  border-radius: 999px;\n  border: 1px solid var(--dash-line);\n  background: var(--dash-sand);\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);\n  color: var(--dash-ink);\n  font-size: 0.72rem;\n  font-weight: 500;\n}\n\nhtml[data-theme=\"dark\"] .admin-users__count {\n  box-shadow: none;\n  background: var(--dash-soft);\n}\n\n.admin-users__subtitle {\n  margin: 0.3rem 0 0;\n  font-size: 0.84rem;\n  color: var(--dash-muted);\n  line-height: 1.35;\n}\n\n.admin-users__actions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n}\n\n.admin-users__action {\n  font-size: 0.84rem;\n  min-height: 2.35rem;\n  height: auto;\n  display: inline-flex;\n  align-items: center;\n  gap: 0.4rem;\n  padding-inline: 1rem;\n}\n\n@media (max-width: 639px) {\n  .admin-users__header {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.75rem;\n    padding: 16px 0;\n    max-width: 100%;\n  }\n\n  .admin-users__title-block,\n  .admin-users__title-row {\n    max-width: 100%;\n    min-width: 0;\n  }\n\n  .admin-users__actions {\n    flex-direction: column;\n    align-items: stretch;\n    width: 100%;\n    max-width: 100%;\n  }\n\n  .admin-users__action {\n    width: 100%;\n    max-width: 100%;\n    height: 40px;\n    justify-content: center;\n  }\n}\n\n.admin-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.65rem;\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n  min-height: 48px;\n  padding: 1rem 0 0.35rem;\n  background: transparent;\n  border: 0;\n}\n\n.admin-toolbar__search-wrap {\n  position: relative;\n  flex: 1 1 200px;\n  min-width: min(200px, 100%);\n  max-width: 100%;\n}\n\n.admin-toolbar__search-icon {\n  position: absolute;\n  inset-inline-start: 0.7rem;\n  top: 50%;\n  transform: translateY(-50%);\n  font-size: 16px;\n  color: var(--text-muted);\n  pointer-events: none;\n}\n\n.admin-toolbar__controls {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 10px;\n  min-width: 0;\n}\n\n.admin-toolbar__select--sort,\n.admin-toolbar__select--progress {\n  width: 150px;\n  flex: 0 0 150px;\n}\n\n.admin-toolbar__select--active {\n  width: 150px;\n  flex: 0 0 150px;\n}\n\n.admin-toolbar__sort-dir {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  width: 4.75rem;\n  height: 2.35rem;\n  flex: 0 0 4.75rem;\n  border: 1px solid var(--dash-line);\n  border-radius: 999px;\n  background: var(--dash-soft);\n  color: var(--dash-ink);\n  font: inherit;\n  font-size: 0.84rem;\n  font-weight: 500;\n  cursor: pointer;\n  transition: background 140ms var(--dash-ease), border-color 140ms var(--dash-ease), box-shadow 140ms var(--dash-ease);\n}\n\n.admin-toolbar__sort-dir:hover,\n.admin-toolbar__sort-dir:focus-visible {\n  outline: none;\n  background: var(--dash-card);\n  border-color: rgba(60, 53, 48, 0.22);\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-filter-badge {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  border: 0;\n  background: transparent;\n  color: var(--text-accent);\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  padding: 0;\n  white-space: nowrap;\n}\n\n.admin-results-count {\n  margin: 12px 0 14px;\n  font-size: 12px;\n  color: var(--text-muted);\n}\n\n@media (max-width: 639px) {\n  .admin-toolbar {\n    flex-direction: column;\n    align-items: stretch;\n    min-height: 0;\n    gap: 8px;\n    overflow: hidden;\n  }\n\n  .admin-toolbar__search-wrap {\n    width: 100%;\n    flex: none;\n    min-width: 0;\n  }\n\n  .admin-toolbar__search {\n    height: 40px;\n    max-width: 100%;\n  }\n\n  .admin-toolbar__controls {\n    flex-wrap: nowrap;\n    overflow-x: auto;\n    overflow-y: hidden;\n    -webkit-overflow-scrolling: touch;\n    overscroll-behavior-x: contain;\n    width: 100%;\n    max-width: 100%;\n    min-width: 0;\n    scrollbar-width: none;\n    padding-bottom: 2px;\n  }\n\n  .admin-toolbar__controls::-webkit-scrollbar {\n    display: none;\n    width: 0;\n    height: 0;\n  }\n\n  .admin-toolbar__controls > * {\n    flex-shrink: 0;\n  }\n\n  .admin-toolbar__select--sort,\n  .admin-toolbar__select--progress,\n  .admin-toolbar__select--active {\n    width: 140px;\n    flex: 0 0 140px;\n  }\n}\n\n.admin-toolbar__check {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 13px;\n  color: var(--text-muted);\n  white-space: nowrap;\n  height: 36px;\n}\n\n.admin-toolbar__check input {\n  width: 16px;\n  height: 16px;\n}\n\n.admin-toolbar__search,\n.admin-toolbar__select,\n.admin-form input,\n.admin-form select,\n.admin-form textarea {\n  border: 1px solid var(--dash-line);\n  border-radius: 999px;\n  background: var(--dash-soft);\n  color: var(--dash-ink);\n  font: inherit;\n  font-size: 0.84rem;\n  padding: 0 0.9rem;\n  height: 2.35rem;\n  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);\n  transition: border-color 140ms var(--dash-ease), box-shadow 140ms var(--dash-ease), background 140ms var(--dash-ease);\n}\n\nhtml[data-theme=\"dark\"] .admin-toolbar__search,\nhtml[data-theme=\"dark\"] .admin-toolbar__select,\nhtml[data-theme=\"dark\"] .admin-form input,\nhtml[data-theme=\"dark\"] .admin-form select,\nhtml[data-theme=\"dark\"] .admin-form textarea {\n  box-shadow: none;\n}\n\n.admin-toolbar__search:hover,\n.admin-toolbar__select:hover {\n  background: var(--dash-card);\n}\n\n.admin-toolbar__search:focus,\n.admin-toolbar__select:focus,\n.admin-form input:focus,\n.admin-form select:focus,\n.admin-form textarea:focus {\n  outline: none;\n  border-color: rgba(60, 53, 48, 0.28);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow-soft);\n}\n\nhtml[data-theme=\"dark\"] .admin-toolbar__search:focus,\nhtml[data-theme=\"dark\"] .admin-toolbar__select:focus,\nhtml[data-theme=\"dark\"] .admin-form input:focus,\nhtml[data-theme=\"dark\"] .admin-form select:focus,\nhtml[data-theme=\"dark\"] .admin-form textarea:focus {\n  border-color: rgba(240, 231, 220, 0.28);\n}\n\n.admin-form input,\n.admin-form select,\n.admin-form textarea {\n  width: 100%;\n  height: auto;\n  padding: 0.55rem 0.75rem;\n}\n\n.admin-toolbar__search {\n  width: 100%;\n  padding-inline-start: 2.2rem;\n}\n\n.admin-toolbar__select {\n  width: auto;\n  flex: 0 0 auto;\n}\n\n.admin-bulkbar {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.65rem 0.75rem;\n  border-radius: var(--dash-radius-sm);\n  border: 1px solid var(--dash-line);\n  background: var(--dash-soft);\n  font-size: 0.8rem;\n  color: var(--dash-ink);\n}\n\n.admin-bulkbar .admin-toolbar__select {\n  width: auto;\n  min-width: 7.5rem;\n  padding: 0.4rem 0.6rem;\n}\n\n.admin-table-meta {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: 0.55rem 0.85rem;\n  color: var(--dash-muted);\n  font-size: 0.78rem;\n}\n\n.admin-table-meta .admin-btn {\n  margin-inline-start: auto;\n}\n\n.admin-check {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n  cursor: pointer;\n}\n\n.admin-table-wrap {\n  overflow: auto;\n  width: 100%;\n  max-width: 100%;\n  min-width: 0;\n  max-height: min(56vh, 34rem);\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  -webkit-overflow-scrolling: touch;\n  overscroll-behavior: contain;\n}\n\n.admin-table {\n  width: 100%;\n  max-width: 100%;\n  border-collapse: collapse;\n  table-layout: fixed;\n}\n\n.admin-col-check { width: 40px; }\n.admin-col-learner { width: auto; }\n.admin-col-num { width: 100px; }\n.admin-col-sessions { width: 100px; }\n.admin-col-date { width: 120px; }\n.admin-col-status { width: 40px; }\n.admin-col-actions { width: 40px; }\n\n.admin-table th,\n.admin-table td {\n  padding: 12px 16px;\n  border: 0;\n  border-bottom: 1px solid var(--border);\n  text-align: left;\n  vertical-align: middle;\n  font-size: 13px;\n  color: var(--text-secondary);\n}\n\n.admin-table th {\n  position: sticky;\n  top: 0;\n  z-index: 1;\n  background: color-mix(in srgb, var(--dash-soft) 88%, var(--dash-sand));\n  color: var(--dash-muted);\n  font-size: 0.68rem;\n  font-weight: 550;\n  letter-spacing: 0.07em;\n  text-transform: uppercase;\n  white-space: nowrap;\n}\n\n.admin-table tbody tr {\n  cursor: pointer;\n  min-height: 56px;\n  transition: background 140ms var(--dash-ease);\n  background: var(--dash-card);\n}\n\n.admin-table tbody tr:hover,\n.admin-table tbody tr.is-selected,\n.admin-table tbody tr.has-menu-open {\n  background: var(--dash-soft);\n}\n\n.admin-table tbody tr.is-selected {\n  box-shadow: inset 3px 0 0 var(--dash-ink);\n}\n\n.admin-table__check { width: 40px; }\n\n.admin-table__actions {\n  width: 40px;\n  position: relative;\n}\n\n.admin-table__empty {\n  text-align: center;\n  padding: 2.5rem 1rem !important;\n  color: var(--text-muted);\n}\n\n.admin-table__empty p {\n  margin: 0 0 0.5rem;\n  font-size: 13px;\n}\n\n@media (max-width: 639px) {\n  .admin-col--desktop,\n  .admin-table col.admin-col--desktop,\n  .admin-table th.admin-col--desktop,\n  .admin-table td.admin-col--desktop {\n    display: none !important;\n    width: 0 !important;\n    max-width: 0 !important;\n    padding: 0 !important;\n    border: 0 !important;\n    overflow: hidden;\n  }\n\n  .admin-col-check,\n  .admin-table__check { width: 36px; }\n  .admin-col-sessions { width: 72px; }\n  .admin-col-status,\n  .admin-table__status { width: 36px; }\n  .admin-col-actions,\n  .admin-table__actions { width: 36px; }\n\n  .admin-table th,\n  .admin-table td {\n    padding: 10px 8px;\n  }\n\n  .admin-table__who strong {\n    font-size: 13px;\n  }\n\n  .admin-table__email {\n    font-size: 11px;\n  }\n}\n\n.admin-th-sort {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 0;\n  background: transparent;\n  color: inherit;\n  font: inherit;\n  font-size: inherit;\n  font-weight: inherit;\n  letter-spacing: inherit;\n  text-transform: inherit;\n  padding: 0;\n  cursor: pointer;\n}\n\n.admin-th-sort.is-active {\n  color: var(--dash-ink);\n}\n\n.admin-dash {\n  color: var(--dash-muted);\n  opacity: 0.7;\n}\n\n.admin-row-menu {\n  position: relative;\n  display: flex;\n  justify-content: flex-end;\n}\n\n.admin-row-menu__btn {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--text-muted);\n  width: 32px;\n  height: 32px;\n  border-radius: 999px;\n  cursor: pointer;\n  opacity: 0;\n  pointer-events: none;\n  font-size: 1.05rem;\n  line-height: 1;\n  transition: opacity 120ms ease, background 120ms ease;\n}\n\n.admin-table tbody tr:hover .admin-row-menu__btn,\n.admin-table tbody tr.is-selected .admin-row-menu__btn,\n.admin-table tbody tr.has-menu-open .admin-row-menu__btn,\n.admin-row-menu.is-open .admin-row-menu__btn {\n  opacity: 1;\n  pointer-events: auto;\n}\n\n.admin-row-menu__btn:hover,\n.admin-row-menu__btn:focus-visible {\n  background: var(--surface-1);\n  color: var(--text-primary);\n}\n\n.admin-row-menu__panel {\n  position: absolute;\n  top: calc(100% + 0.2rem);\n  inset-inline-end: 0;\n  z-index: 5;\n  width: 180px;\n  padding: 0.25rem;\n  border: 1px solid var(--border);\n  border-radius: var(--radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow);\n  display: grid;\n  gap: 0;\n}\n\n.admin-row-menu__panel button,\n.admin-row-menu__panel a {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--text-primary);\n  font: inherit;\n  font-size: 13px;\n  text-align: start;\n  text-decoration: none;\n  height: 36px;\n  padding: 0 0.7rem;\n  border-radius: 8px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n}\n\n.admin-row-menu__panel button.is-danger {\n  color: var(--text-danger);\n}\n\n.admin-row-menu__panel button:hover:not(:disabled),\n.admin-row-menu__panel a:hover,\n.admin-row-menu__panel button:focus-visible,\n.admin-row-menu__panel a:focus-visible {\n  background: var(--surface-1);\n}\n\n.admin-row-menu__panel button:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n@media (hover: none) {\n  .admin-row-menu__btn {\n    opacity: 0.85;\n    pointer-events: auto;\n  }\n}\n\n.admin-table__learner {\n  min-width: 0;\n}\n\n.admin-table__who {\n  display: grid;\n  gap: 0.1rem;\n  min-width: 0;\n}\n\n.admin-table__who strong {\n  display: block;\n  min-width: 0;\n  font-size: 14px;\n  font-weight: 500;\n  color: var(--text-primary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.admin-table__status {\n  text-align: center;\n  vertical-align: middle;\n}\n\n.admin-table__status .admin-status-dot {\n  margin-inline: auto;\n}\n\n.admin-status-dot {\n  display: inline-block;\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n  border: 0;\n  flex-shrink: 0;\n  background: transparent;\n}\n\n.admin-status-dot[data-status=\"hot\"] {\n  background: var(--fill-success);\n}\n\n.admin-status-dot[data-status=\"warm\"] {\n  background: var(--fill-warning);\n}\n\n.admin-status-dot[data-status=\"inactive\"] {\n  background: var(--fill-danger);\n}\n\n.admin-pagination {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.65rem;\n  margin-top: 0.75rem;\n  padding-top: 0.65rem;\n  border-top: 1px solid var(--dash-line);\n  color: var(--dash-muted);\n  font-size: 0.8rem;\n}\n\n.admin-pagination__controls {\n  display: inline-flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.4rem;\n}\n\n.admin-pagination__goto {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.3rem;\n}\n\n.admin-pagination__page.is-active {\n  background: var(--dash-ink);\n  color: var(--dash-cream);\n  border-color: transparent;\n}\n\n.admin-table__email {\n  display: block;\n  max-width: 100%;\n  color: var(--text-muted);\n  font-size: 12px;\n  font-weight: 400;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.admin-num {\n  font-variant-numeric: tabular-nums;\n  white-space: nowrap;\n  font-size: 13px;\n}\n\n.admin-acc--high { color: var(--text-success); }\n.admin-acc--mid { color: var(--text-warning); }\n.admin-acc--low { color: var(--text-danger); }\n\n.admin-pill {\n  display: inline-flex;\n  align-items: center;\n  padding: 2px 10px;\n  border-radius: 999px;\n  border: 1px solid var(--border);\n  background: transparent;\n  color: var(--text-muted);\n  font-size: 10px;\n  font-weight: 500;\n  white-space: nowrap;\n}\n\n.admin-pill--muted,\n.admin-pill--none,\n.admin-pill--free {\n  border: 1px solid var(--border);\n  background: transparent;\n  color: var(--text-muted);\n}\n\n.admin-pill--pro {\n  border-color: transparent;\n  background: var(--bg-warning);\n  color: var(--text-warning);\n}\n\n.admin-pill--active,\n.admin-pill--active-pro {\n  border-color: transparent;\n  background: var(--bg-success);\n  color: var(--text-success);\n}\n\n.admin-drawer-root {\n  /* Mirror console tokens so teleported drawer keeps the theme */\n  --dash-cream: #f2ebe3;\n  --dash-sand: #e8ded1;\n  --dash-ink: #3c3530;\n  --dash-muted: #6d6258;\n  --dash-line: rgba(60, 53, 48, 0.14);\n  --dash-soft: #faf6f1;\n  --dash-card: #fffdfb;\n  --dash-shadow: 0 1px 2px rgba(60, 53, 48, 0.05), 0 10px 24px rgba(60, 53, 48, 0.07);\n  --dash-ease: var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));\n  --dash-radius: 18px;\n  --dash-radius-sm: 12px;\n  --dash-font: var(--font-ui, \"Avenir Next\", \"Segoe UI\", sans-serif);\n  --dash-serif: \"Iowan Old Style\", \"Palatino Linotype\", Palatino, Georgia, \"Times New Roman\", serif;\n  --dash-danger: #8b4a3c;\n  --admin-blue: #5b7c99;\n  --admin-green: #5f7d5a;\n  --admin-red: #8b4a3c;\n  --admin-gold: #d4a84b;\n  --admin-amber: #c4a35a;\n  --border: var(--dash-line);\n  --border-accent: color-mix(in srgb, var(--admin-blue) 55%, var(--dash-line));\n  --border-danger: color-mix(in srgb, var(--dash-danger) 45%, var(--dash-line));\n  --surface-1: var(--dash-soft);\n  --surface-2: color-mix(in srgb, var(--dash-soft) 70%, var(--dash-card));\n  --text-primary: var(--dash-ink);\n  --text-secondary: color-mix(in srgb, var(--dash-ink) 78%, var(--dash-muted));\n  --text-muted: var(--dash-muted);\n  --text-danger: var(--dash-danger);\n  --text-success: var(--admin-green);\n  --text-warning: #9a7a2f;\n  --text-accent: var(--admin-blue);\n  --fill-accent: var(--dash-ink);\n  --fill-success: var(--admin-green);\n  --fill-warning: var(--admin-amber);\n  --fill-danger: var(--admin-red);\n  --on-accent: var(--dash-cream);\n  --bg-accent: color-mix(in srgb, var(--admin-blue) 14%, var(--dash-soft));\n  --bg-success: color-mix(in srgb, var(--admin-green) 16%, var(--dash-soft));\n  --bg-warning: color-mix(in srgb, var(--admin-gold) 20%, var(--dash-soft));\n  --bg-danger: color-mix(in srgb, var(--dash-danger) 12%, var(--dash-soft));\n  --radius: var(--dash-radius-sm);\n  position: fixed;\n  inset: 0;\n  z-index: 9999;\n  pointer-events: none;\n  font-family: var(--dash-font);\n  color: var(--text-primary);\n}\n\nhtml[data-theme=\"dark\"] .admin-drawer-root {\n  --dash-cream: #171411;\n  --dash-sand: #2a241f;\n  --dash-ink: #f0e7dc;\n  --dash-muted: #b7a99a;\n  --dash-line: rgba(240, 231, 220, 0.12);\n  --dash-soft: #1e1a16;\n  --dash-card: #221e1a;\n  --dash-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 28px rgba(0, 0, 0, 0.28);\n  --dash-danger: #e0a090;\n  --admin-blue: #8aa8c2;\n  --admin-green: #8faf8a;\n  --admin-red: #e0a090;\n  --admin-gold: #d4a84b;\n  --admin-amber: #d2b072;\n  --text-warning: #d2b072;\n}\n\n.admin-drawer__backdrop {\n  position: fixed;\n  inset: 0;\n  z-index: 9998;\n  border: 0;\n  background: rgba(0, 0, 0, 0.4);\n  backdrop-filter: blur(2px);\n  cursor: pointer;\n  pointer-events: auto;\n}\n\n.admin-drawer {\n  position: fixed;\n  top: 0;\n  right: 0;\n  z-index: 9999;\n  width: min(480px, 100vw);\n  max-width: 100vw;\n  height: 100vh;\n  overflow: hidden;\n  border-inline-start: 1px solid var(--dash-line);\n  background:\n    linear-gradient(180deg, var(--dash-soft), var(--dash-card) 8rem);\n  box-shadow: var(--dash-shadow);\n  padding: 0;\n  display: flex;\n  flex-direction: column;\n  pointer-events: auto;\n  transform: translateX(0);\n  animation: admin-drawer-in 240ms var(--dash-ease);\n  font-family: var(--dash-font);\n}\n\n@keyframes admin-drawer-in {\n  from { transform: translateX(100%); }\n  to { transform: translateX(0); }\n}\n\n@media (max-width: 639px) {\n  .admin-drawer {\n    width: 100vw;\n    top: auto;\n    bottom: 0;\n    right: 0;\n    left: 0;\n    height: 100vh;\n    border-inline-start: 0;\n    border-top: 1px solid var(--border);\n    animation-name: admin-drawer-up;\n  }\n\n  @keyframes admin-drawer-up {\n    from { transform: translateY(100%); }\n    to { transform: translateY(0); }\n  }\n\n  .admin-statstrip {\n    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;\n  }\n\n  .admin-drawer__quick,\n  .admin-statstrip,\n  .admin-drawer-panel {\n    padding-inline: 14px;\n  }\n}\n\n.admin-drawer__head {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 0.75rem;\n  flex-shrink: 0;\n  min-height: 72px;\n  padding: 16px 20px;\n  border-bottom: 1px solid var(--border);\n  box-sizing: border-box;\n}\n\n@media (max-width: 639px) {\n  .admin-drawer__head {\n    min-height: 60px;\n    padding: 12px 16px;\n  }\n}\n\n.admin-drawer__identity {\n  display: flex;\n  align-items: flex-start;\n  gap: 0.75rem;\n  min-width: 0;\n  flex: 1;\n}\n\n.admin-avatar {\n  flex-shrink: 0;\n  width: 36px;\n  height: 36px;\n  border-radius: 50%;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--bg-accent);\n  border: 0;\n  color: var(--text-accent);\n  font-size: 14px;\n  font-weight: 500;\n  letter-spacing: 0.02em;\n}\n\n.admin-drawer__titles {\n  display: grid;\n  gap: 2px;\n  min-width: 0;\n  flex: 1;\n}\n\n.admin-drawer__meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  margin-top: 4px;\n  font-size: 12px;\n}\n\n.admin-drawer__status-label {\n  color: var(--text-muted);\n  font-size: 12px;\n}\n\n.admin-drawer__close {\n  width: 32px;\n  height: 32px;\n  flex-shrink: 0;\n}\n\n.admin-drawer__scroll {\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow-y: auto;\n  scrollbar-width: thin;\n}\n\n.admin-drawer__body {\n  display: block;\n}\n\n.admin-drawer__quick {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--border);\n}\n\n.admin-quick-btn {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  color: var(--dash-ink);\n  font: inherit;\n  font-size: 0.78rem;\n  font-weight: 500;\n  height: 2.55rem;\n  padding: 0 0.7rem;\n  display: inline-flex;\n  align-items: center;\n  gap: 0.4rem;\n  text-decoration: none;\n  cursor: pointer;\n  box-shadow: var(--dash-shadow-soft);\n  transition: background 140ms var(--dash-ease), border-color 140ms var(--dash-ease), box-shadow 140ms var(--dash-ease);\n}\n\n.admin-quick-btn i {\n  font-size: 1rem;\n}\n\n.admin-quick-btn:hover:not(:disabled),\n.admin-quick-btn:focus-visible {\n  background: var(--dash-card);\n  border-color: rgba(60, 53, 48, 0.22);\n  box-shadow: var(--dash-shadow);\n  outline: none;\n}\n\n.admin-quick-btn:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n.admin-quick-btn--danger {\n  color: var(--text-danger);\n}\n\n.admin-quick-btn--danger:hover:not(:disabled) {\n  border-color: var(--border-danger);\n}\n\n.admin-inline-field__label {\n  position: relative;\n  display: block;\n  min-width: 0;\n}\n\n.admin-inline-field__input {\n  width: 100%;\n  border: 1px solid transparent;\n  border-radius: var(--dash-radius-sm);\n  background: transparent;\n  color: var(--dash-ink);\n  font: inherit;\n  padding: 0.2rem 1.6rem 0.2rem 0.35rem;\n}\n\n.admin-inline-field__input--name {\n  font-size: 15px;\n  font-weight: 500;\n  color: var(--text-primary);\n  padding-block: 0;\n}\n\n.admin-inline-field__input--email {\n  color: var(--text-muted);\n  font-size: 12px;\n  padding-block: 0;\n}\n\n.admin-inline-field__icon {\n  position: absolute;\n  inset-inline-end: 0.35rem;\n  top: 50%;\n  transform: translateY(-50%);\n  color: var(--dash-muted);\n  font-size: 0.75rem;\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 120ms var(--dash-ease);\n}\n\n.admin-inline-field:hover .admin-inline-field__icon,\n.admin-inline-field:focus-within .admin-inline-field__icon,\n.admin-inline-field.is-dirty .admin-inline-field__icon {\n  opacity: 1;\n}\n\n.admin-inline-field__input:hover,\n.admin-inline-field__input:focus {\n  border-color: var(--dash-line);\n  background: var(--dash-soft);\n  outline: none;\n}\n\n.admin-inline-field--select {\n  min-width: 7.5rem;\n}\n\n.admin-notes-summary {\n  margin: 0;\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.55rem;\n  font-size: 13px;\n  color: var(--text-primary);\n}\n\n.admin-collapse {\n  border: 0;\n  border-bottom: 1px solid var(--border);\n  background: transparent;\n}\n\n.admin-collapse > summary {\n  list-style: none;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n  height: 44px;\n  padding: 0 20px;\n  cursor: pointer;\n  font-size: 12px;\n  font-weight: 500;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--text-muted);\n}\n\n.admin-collapse > summary::-webkit-details-marker {\n  display: none;\n}\n\n.admin-collapse > summary:hover {\n  background: var(--surface-1);\n}\n\n.admin-collapse__chevron {\n  transition: transform 200ms ease;\n  font-size: 14px;\n}\n\n.admin-collapse[open] > summary {\n  border-bottom: 1px solid var(--border);\n}\n\n.admin-collapse[open] > summary .admin-collapse__chevron {\n  transform: rotate(180deg);\n}\n\n.admin-collapse__body {\n  padding: 12px 20px 16px;\n  border-bottom: 1px solid var(--border);\n}\n\n.admin-session-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  gap: 0;\n}\n\n.admin-session-list > li {\n  padding: 10px 0;\n  border-bottom: 1px solid var(--border);\n}\n\n.admin-session-list > li:last-child {\n  border-bottom: 0;\n  padding-bottom: 0;\n}\n\n.admin-session-list > li:first-child {\n  padding-top: 0;\n}\n\n.admin-session-list__line1 {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.35rem;\n  font-size: 13px;\n  color: var(--text-primary);\n}\n\n.admin-session-list__line2 {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  margin-top: 0.25rem;\n  font-size: 11px;\n  color: var(--text-muted);\n}\n\n.admin-outcome {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.12rem 0.45rem;\n  border-radius: 999px;\n  border: 0;\n  font-size: 11px;\n  font-weight: 500;\n  white-space: nowrap;\n}\n\n.admin-outcome[data-outcome=\"completed\"] {\n  background: var(--bg-success);\n  color: var(--text-success);\n}\n\n.admin-outcome[data-outcome=\"incomplete\"] {\n  background: var(--bg-warning);\n  color: var(--text-warning);\n}\n\n.admin-account-info__list {\n  margin: 0;\n  display: grid;\n  gap: 0.75rem;\n}\n\n.admin-account-info__list > div {\n  display: grid;\n  gap: 0.15rem;\n}\n\n.admin-account-info__list dt {\n  margin: 0;\n  font-size: 11px;\n  font-weight: 500;\n  color: var(--text-muted);\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n}\n\n.admin-account-info__list dd {\n  margin: 0;\n  font-size: 13px;\n  color: var(--text-primary);\n}\n\n.admin-account-info__select {\n  display: block;\n  margin-top: 0.35rem;\n  width: 100%;\n  height: 32px;\n  border: 1px solid var(--border);\n  border-radius: var(--radius);\n  background: var(--surface-2);\n  color: var(--text-primary);\n  font: inherit;\n  font-size: 12px;\n}\n\n.admin-account-info__id {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.35rem;\n}\n\n.admin-icon-btn--sm {\n  width: 28px;\n  height: 28px;\n}\n\n.admin-statstrip {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 8px;\n  padding: 14px 16px;\n  border-bottom: 1px solid var(--border);\n}\n\n.admin-statstrip > div {\n  padding: 10px 8px;\n  border: 0;\n  border-radius: var(--radius);\n  background: var(--surface-1);\n  display: grid;\n  gap: 2px;\n  text-align: center;\n}\n\n.admin-statstrip strong {\n  font-size: 18px;\n  font-weight: 500;\n  font-variant-numeric: tabular-nums;\n  color: var(--text-primary);\n}\n\n.admin-statstrip span {\n  color: var(--text-muted);\n  font-size: 10px;\n  font-weight: 400;\n  margin-top: 2px;\n}\n\n.admin-drawer-panel {\n  padding: 14px 16px 16px;\n  border-bottom: 1px solid var(--border);\n}\n\n.admin-drawer-panel h3 {\n  margin: 0 0 10px;\n  font-size: 11px;\n  font-weight: 500;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--text-muted);\n}\n\n.admin-drawer-panel--meta {\n  border-bottom: 0;\n  padding-bottom: 20px;\n}\n\n.admin-session-list__kind {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.08rem 0.4rem;\n  border-radius: 999px;\n  background: var(--surface-1);\n  color: var(--text-muted);\n  font-size: 10px;\n  font-weight: 500;\n  text-transform: uppercase;\n  letter-spacing: 0.03em;\n}\n\n.admin-danger__warn {\n  margin: 0 0 0.75rem;\n  font-size: 12px;\n  color: var(--text-danger);\n}\n\n.admin-danger__btn {\n  width: 100%;\n  height: 36px;\n  background: var(--bg-danger);\n  color: var(--text-danger);\n  border: 1px solid var(--border-danger);\n}\n\n.admin-detail__position {\n  margin: 0;\n  color: var(--dash-muted);\n  font-size: 0.84rem;\n}\n\n.admin-form {\n  display: grid;\n  gap: 0.75rem;\n}\n\n.admin-form__grid {\n  display: grid;\n  gap: 0.65rem;\n}\n\n@media (min-width: 520px) {\n  .admin-form__grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n\n  .admin-form__full {\n    grid-column: 1 / -1;\n  }\n}\n\n.admin-form label {\n  display: grid;\n  gap: 0.28rem;\n}\n\n.admin-form label > span {\n  color: var(--dash-muted);\n  font-size: 0.72rem;\n  font-weight: 600;\n}\n\n.admin-form__actions {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n  gap: 0.45rem;\n}\n\n.admin-form__error {\n  margin: 0;\n  color: var(--dash-danger);\n  font-size: 0.82rem;\n}\n\n.admin-form__ok {\n  margin: 0;\n  color: var(--dash-muted);\n  font-size: 0.82rem;\n}\n\n.admin-block {\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  padding: 0.65rem 0.8rem;\n}\n\n.admin-block summary {\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  cursor: pointer;\n  font-size: 0.72rem;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--dash-muted);\n  list-style: none;\n}\n\n.admin-block summary::-webkit-details-marker {\n  display: none;\n}\n\n.admin-block__chevron {\n  flex-shrink: 0;\n  opacity: 0.6;\n  transform: rotate(-90deg);\n  transition: transform 160ms var(--dash-ease);\n}\n\n.admin-block[open] > summary .admin-block__chevron {\n  transform: rotate(0deg);\n}\n\n.admin-surah-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  display: grid;\n  gap: 12px;\n}\n\n.admin-surah-progress__head {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n  gap: 0.75rem;\n  margin-bottom: 0.3rem;\n}\n\n.admin-surah-progress__name {\n  font-size: 13px;\n  font-weight: 400;\n  color: var(--text-primary);\n}\n\n.admin-surah-progress__meta {\n  color: var(--text-muted);\n  font-size: 11px;\n  white-space: nowrap;\n  font-variant-numeric: tabular-nums;\n  text-align: end;\n}\n\n.admin-surah-progress__track {\n  height: 4px;\n  border-radius: 2px;\n  background: var(--surface-1);\n  overflow: hidden;\n}\n\n.admin-surah-progress__fill {\n  height: 100%;\n  min-width: 0;\n  border-radius: inherit;\n  background: var(--fill-accent);\n  transition: width 180ms var(--dash-ease);\n}\n\n.admin-surah-progress__fill.is-zero {\n  width: 0 !important;\n  min-width: 0;\n}\n\n.admin-mini {\n  list-style: none;\n  margin: 0.55rem 0 0;\n  padding: 0;\n  display: grid;\n  gap: 0.4rem;\n}\n\n.admin-mini > li,\n.admin-mini__row {\n  display: flex;\n  justify-content: space-between;\n  gap: 0.65rem;\n  font-size: 0.8rem;\n}\n\n.admin-mini--stack {\n  flex-direction: column;\n}\n\n.admin-muted {\n  color: var(--dash-muted);\n  font-size: 0.8rem;\n  margin: 0.35rem 0 0;\n}\n\n.admin-danger {\n  padding-top: 0.35rem;\n  border-top: 1px solid var(--dash-line);\n}\n\n.admin-danger p {\n  margin: 0.45rem 0 0;\n  color: var(--dash-muted);\n  font-size: 0.8rem;\n}\n\n.admin-form textarea {\n  width: 100%;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  color: var(--dash-ink);\n  font: inherit;\n  font-size: 0.86rem;\n  padding: 0.55rem 0.75rem;\n  resize: vertical;\n  min-height: 4.5rem;\n}\n\n.admin-modal--delete label {\n  display: grid;\n  gap: 0.35rem;\n}\n\n.admin-modal--delete label > span {\n  color: var(--dash-muted);\n  font-size: 0.82rem;\n}\n\n.admin-modal--delete input {\n  width: 100%;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-soft);\n  color: var(--dash-ink);\n  font: inherit;\n  font-size: 0.86rem;\n  padding: 0.55rem 0.75rem;\n}\n\n.admin-toast {\n  position: fixed;\n  inset-inline: 50% auto auto 50%;\n  transform: translateX(-50%);\n  bottom: 1.25rem;\n  z-index: 10100;\n  max-width: min(28rem, calc(100vw - 2rem));\n  padding: 0.75rem 1rem;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius-sm);\n  background: var(--dash-ink);\n  color: var(--dash-cream);\n  font-size: 0.84rem;\n  font-weight: 500;\n  box-shadow: var(--dash-shadow);\n  text-align: center;\n}\n\nhtml[data-theme=\"dark\"] .admin-toast {\n  background: var(--dash-card);\n  color: var(--dash-ink);\n  border-color: var(--dash-line);\n}\n\n.admin-empty {\n  margin: 0;\n  padding: 1.5rem 0.75rem;\n  text-align: center;\n  color: var(--dash-muted);\n  font-size: 0.86rem;\n}\n\n.admin-btn,\n.admin-icon-btn {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 1px solid transparent;\n  font: inherit;\n  cursor: pointer;\n  transition: background 140ms var(--dash-ease), border-color 140ms var(--dash-ease), color 140ms var(--dash-ease);\n}\n\n.admin-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.3rem;\n  min-height: 2.15rem;\n  padding: 0.4rem 0.95rem;\n  border-radius: 999px;\n  font-weight: 500;\n  font-size: 0.84rem;\n  background: var(--dash-card);\n  border-color: var(--dash-line);\n  color: var(--dash-ink);\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-btn--sm {\n  min-height: 1.85rem;\n  padding: 0.25rem 0.75rem;\n  font-size: 0.76rem;\n  font-weight: 450;\n}\n\n.admin-btn--ghost {\n  background: var(--dash-card);\n  border-color: var(--dash-line);\n  color: var(--dash-ink);\n  font-weight: 450;\n}\n\n.admin-btn--ghost:hover,\n.admin-btn--ghost:focus-visible {\n  background: var(--dash-sand);\n  border-color: rgba(60, 53, 48, 0.2);\n  color: var(--dash-ink);\n}\n\nhtml[data-theme=\"dark\"] .admin-btn--ghost:hover,\nhtml[data-theme=\"dark\"] .admin-btn--ghost:focus-visible,\nhtml[data-theme=\"dark\"] .admin-btn.is-active {\n  border-color: var(--dash-line);\n}\n\n.admin-btn--primary {\n  background: var(--dash-ink);\n  color: var(--dash-cream);\n  border-color: var(--dash-ink);\n  box-shadow: none;\n}\n\n.admin-btn--primary:hover,\n.admin-btn--primary:focus-visible {\n  color: var(--dash-cream);\n  background: #2d2824;\n}\n\nhtml[data-theme=\"dark\"] .admin-btn--primary:hover,\nhtml[data-theme=\"dark\"] .admin-btn--primary:focus-visible {\n  background: #f7efe4;\n  color: #171411;\n  border-color: #f7efe4;\n}\n\n.admin-btn--danger {\n  background: transparent;\n  border-color: color-mix(in srgb, var(--dash-danger) 40%, var(--dash-line));\n  color: var(--dash-danger);\n  box-shadow: none;\n}\n\n.admin-btn--danger:hover,\n.admin-btn--danger:focus-visible {\n  background: color-mix(in srgb, var(--dash-danger) 8%, var(--dash-soft));\n}\n\n.admin-icon-btn {\n  display: inline-grid;\n  place-items: center;\n  width: 2.35rem;\n  height: 2.35rem;\n  border-radius: 999px;\n  border: 1px solid var(--dash-line);\n  background: var(--dash-card);\n  color: var(--dash-muted);\n  box-shadow: var(--dash-shadow-soft);\n}\n\n.admin-icon-btn:hover,\n.admin-icon-btn:focus-visible {\n  color: var(--dash-ink);\n  background: var(--dash-sand);\n}\n\n.admin-btn:disabled,\n.admin-icon-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n\n.admin-link {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--text-accent, var(--dash-muted));\n  font: inherit;\n  font-size: 0.8rem;\n  font-weight: 500;\n  cursor: pointer;\n  text-decoration: underline;\n  text-underline-offset: 0.12em;\n  padding: 0.15rem 0 0;\n}\n\n.admin-link:hover,\n.admin-link:focus-visible {\n  color: var(--text-primary, var(--dash-ink));\n}\n\n.admin-modal-root {\n  position: fixed;\n  inset: 0;\n  z-index: 10050;\n  display: grid;\n  place-items: center;\n  padding: 1rem;\n}\n\n.admin-modal__backdrop {\n  position: absolute;\n  inset: 0;\n  border: 0;\n  background: rgba(30, 24, 18, 0.42);\n  cursor: pointer;\n}\n\nhtml[data-theme=\"dark\"] .admin-modal__backdrop {\n  background: rgba(0, 0, 0, 0.55);\n}\n\n.admin-modal {\n  position: relative;\n  z-index: 1;\n  width: min(28rem, 100%);\n  max-height: min(90vh, 40rem);\n  overflow: auto;\n  border: 1px solid var(--dash-line);\n  border-radius: var(--dash-radius);\n  background: var(--dash-card);\n  box-shadow: var(--dash-shadow);\n  padding: 1.15rem 1.2rem;\n  display: grid;\n  gap: 0.9rem;\n}\n\n.admin-modal__head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n}\n\n.admin-modal__head h2 {\n  margin: 0;\n  font-family: var(--dash-serif);\n  font-size: 1.2rem;\n  font-weight: 500;\n}\n\n@media (max-width: 639px) {\n  .admin-console {\n    padding: 0.75rem 0 1.75rem;\n  }\n\n  .admin-console__shell {\n    padding-inline: 12px;\n    gap: 0.75rem;\n  }\n\n  .admin-console__top {\n    padding: 0.9rem;\n    max-width: 100%;\n    min-width: 0;\n    overflow: hidden;\n  }\n\n  .admin-console__top-actions {\n    flex-wrap: wrap;\n    max-width: 100%;\n  }\n\n  .admin-kpis {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n\n  .admin-users {\n    padding: 0 12px 12px;\n    border-radius: 14px;\n  }\n\n  .admin-bulkbar {\n    max-width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n  }\n\n  .admin-bulkbar::-webkit-scrollbar {\n    display: none;\n  }\n\n  .admin-pagination {\n    max-width: 100%;\n  }\n\n  .admin-pagination__controls {\n    max-width: 100%;\n    overflow-x: auto;\n    -webkit-overflow-scrolling: touch;\n    scrollbar-width: none;\n  }\n\n  .admin-results-count {\n    margin: 8px 0 10px;\n  }\n}\n\n@media (max-width: 479px) {\n  .admin-btn__label {\n    display: none;\n  }\n\n  .admin-users__title {\n    font-size: 20px;\n  }\n\n  .admin-users__action .admin-btn__label,\n  .admin-users__action span {\n    display: inline;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .admin-spinner,\n  .is-spinning,\n  .admin-btn,\n  .admin-icon-btn,\n  .admin-kpi {\n    animation: none !important;\n    transition: none !important;\n  }\n}\n", ""]);
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