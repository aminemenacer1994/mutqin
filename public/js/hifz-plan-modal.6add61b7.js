"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["hifz-plan-modal"],{

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=script&lang=js":
/*!**************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=script&lang=js ***!
  \**************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _scripts_engine_hifz_session_engine__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scripts/engine/hifz_session_engine */ "./resources/js/scripts/engine/hifz_session_engine.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var STORAGE_KEY = _scripts_engine_hifz_session_engine__WEBPACK_IMPORTED_MODULE_0__.HIFZ_PLAN_STORAGE_KEY;
function createDefaultHifzDraft() {
  return {
    goal: 'balanced',
    dailyNewAyahs: {
      min: 3,
      max: 5
    },
    selectedSurah: '',
    selectedRange: {
      from: null,
      to: null
    },
    learningStyle: 'balanced',
    focusMode: 'mixed',
    supportLevel: 'standard',
    repetitionsPerAyah: 5,
    reciterId: '',
    playbackSpeed: 1
  };
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  name: 'HifzPlanCreatorModal',
  props: {
    visible: {
      type: Boolean,
      "default": false
    },
    reciters: {
      type: Array,
      "default": function _default() {
        return [];
      }
    },
    speedOptions: {
      type: Array,
      "default": function _default() {
        return [0.5, 1, 1.25, 1.5, 2];
      }
    }
  },
  emits: ['close', 'saved'],
  data: function data() {
    return {
      currentStep: 0,
      existingPlan: null,
      draft: createDefaultHifzDraft(),
      manualTouched: {
        surah: false,
        dailyAyahs: false,
        range: false,
        learningStyle: false,
        focusMode: false,
        supportLevel: false,
        playback: false
      },
      goalOptionDefs: [{
        value: 'light',
        range: {
          min: 1,
          max: 3
        },
        icon: 'bi bi-sunrise'
      }, {
        value: 'balanced',
        range: {
          min: 3,
          max: 5
        },
        icon: 'bi bi-compass'
      }, {
        value: 'intensive',
        range: {
          min: 5,
          max: 10
        },
        icon: 'bi bi-lightning-charge'
      }],
      learningStyleOptionDefs: [{
        value: 'light',
        icon: 'bi bi-feather'
      }, {
        value: 'balanced',
        icon: 'bi bi-sliders'
      }, {
        value: 'intensive',
        icon: 'bi bi-speedometer2'
      }],
      focusOptionDefs: [{
        value: 'newPriority',
        icon: 'bi bi-plus-circle'
      }, {
        value: 'revisionPriority',
        icon: 'bi bi-arrow-repeat'
      }, {
        value: 'mixed',
        icon: 'bi bi-shuffle'
      }, {
        value: 'weakAyahFocus',
        icon: 'bi bi-bullseye'
      }],
      supportOptionDefs: [{
        value: 'gentle',
        icon: 'bi bi-hand-thumbs-up'
      }, {
        value: 'standard',
        icon: 'bi bi-check2-circle'
      }, {
        value: 'highPrecision',
        icon: 'bi bi-shield-check'
      }],
      wizardStepKeys: ['goal', 'style', 'flow', 'support', 'playback', 'summary'],
      surahList: ['Al-Fatiha', 'Al-Baqarah', 'Aal-Imran', 'An-Nisa', 'Al-Maidah', 'Al-Anam', 'Al-Araf', 'Al-Anfal', 'At-Tawbah', 'Yunus', 'Hud', 'Yusuf', 'Ar-Rad', 'Ibrahim', 'Al-Hijr', 'An-Nahl', 'Al-Isra', 'Al-Kahf', 'Maryam', 'Ta-Ha', 'Al-Anbiya', 'Al-Hajj', 'Al-Muminun', 'An-Nur', 'Al-Furqan', 'Ash-Shuara', 'An-Naml', 'Al-Qasas', 'Al-Ankabut', 'Ar-Rum', 'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba', 'Fatir', 'Ya-Sin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Ghafir', 'Fussilat', 'Ash-Shuraa', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jathiyah', 'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf', 'Adh-Dhariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman', 'Al-Waqiah', 'Al-Hadid', 'Al-Mujadila', 'Al-Hashr', 'Al-Mumtahanah', 'As-Saff', 'Al-Jumuah', 'Al-Munafiqun', 'At-Taghabun', 'At-Talaq', 'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Maarij', 'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddaththir', 'Al-Qiyamah', 'Al-Insan', 'Al-Mursalat', 'An-Naba', 'An-Naziat', 'Abasa', 'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Inshiqaq', 'Al-Buruj', 'At-Tariq', 'Al-Ala', 'Al-Ghashiyah', 'Al-Fajr', 'Al-Balad', 'Ash-Shams', 'Al-Layl', 'Ad-Duha', 'Ash-Sharh', 'At-Tin', 'Al-Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-Adiyat', 'Al-Qariah', 'At-Takathur', 'Al-Asr', 'Al-Humazah', 'Al-Fil', 'Quraysh', 'Al-Maun', 'Al-Kawthar', 'Al-Kafirun', 'An-Nasr', 'Al-Masad', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas']
    };
  },
  computed: {
    steps: function steps() {
      var _this = this;
      return this.wizardStepKeys.map(function (key) {
        return {
          key: key,
          label: _this.t("hifzPlan.wizard.steps.".concat(key, ".label")),
          headline: _this.t("hifzPlan.wizard.steps.".concat(key, ".headline"))
        };
      });
    },
    goalOptions: function goalOptions() {
      var _this2 = this;
      return this.goalOptionDefs.map(function (def) {
        return _objectSpread(_objectSpread({}, def), {}, {
          title: _this2.t("hifzPlan.wizard.goals.".concat(def.value, ".title")),
          subtitle: _this2.t("hifzPlan.wizard.goals.".concat(def.value, ".subtitle")),
          detail: _this2.t("hifzPlan.wizard.goals.".concat(def.value, ".detail"))
        });
      });
    },
    learningStyleOptions: function learningStyleOptions() {
      var _this3 = this;
      return this.learningStyleOptionDefs.map(function (def) {
        return _objectSpread(_objectSpread({}, def), {}, {
          title: _this3.t("hifzPlan.wizard.styles.".concat(def.value, ".title")),
          subtitle: _this3.t("hifzPlan.wizard.styles.".concat(def.value, ".subtitle")),
          detail: _this3.t("hifzPlan.wizard.styles.".concat(def.value, ".detail"))
        });
      });
    },
    focusOptions: function focusOptions() {
      var _this4 = this;
      return this.focusOptionDefs.map(function (def) {
        return _objectSpread(_objectSpread({}, def), {}, {
          title: _this4.t("hifzPlan.wizard.focus.".concat(def.value, ".title")),
          subtitle: _this4.t("hifzPlan.wizard.focus.".concat(def.value, ".subtitle")),
          detail: _this4.t("hifzPlan.wizard.focus.".concat(def.value, ".detail"))
        });
      });
    },
    supportOptions: function supportOptions() {
      var _this5 = this;
      return this.supportOptionDefs.map(function (def) {
        return _objectSpread(_objectSpread({}, def), {}, {
          title: _this5.t("hifzPlan.wizard.support.".concat(def.value, ".title")),
          subtitle: _this5.t("hifzPlan.wizard.support.".concat(def.value, ".subtitle")),
          detail: _this5.t("hifzPlan.wizard.support.".concat(def.value, ".detail"))
        });
      });
    },
    selectedGoalOption: function selectedGoalOption() {
      var _this6 = this;
      return this.goalOptions.find(function (option) {
        return option.value === _this6.draft.goal;
      }) || this.goalOptions[1];
    },
    selectedLearningStyleOption: function selectedLearningStyleOption() {
      var _this7 = this;
      return this.learningStyleOptions.find(function (option) {
        return option.value === _this7.draft.learningStyle;
      }) || this.learningStyleOptions[1];
    },
    selectedFocusOption: function selectedFocusOption() {
      var _this8 = this;
      return this.focusOptions.find(function (option) {
        return option.value === _this8.draft.focusMode;
      }) || this.focusOptions[2];
    },
    selectedSupportOption: function selectedSupportOption() {
      var _this9 = this;
      return this.supportOptions.find(function (option) {
        return option.value === _this9.draft.supportLevel;
      }) || this.supportOptions[1];
    },
    reciterChoices: function reciterChoices() {
      var normalized = (this.reciters || []).map(function (reciter) {
        var _reciter$id;
        if (typeof reciter === 'string') {
          return {
            id: reciter,
            name: reciter,
            supportsWordHighlighting: true
          };
        }
        var id = String((_reciter$id = reciter === null || reciter === void 0 ? void 0 : reciter.id) !== null && _reciter$id !== void 0 ? _reciter$id : '');
        var name = String((reciter === null || reciter === void 0 ? void 0 : reciter.name) || (reciter === null || reciter === void 0 ? void 0 : reciter.label) || id);
        return id ? {
          id: id,
          name: name,
          supportsWordHighlighting: (reciter === null || reciter === void 0 ? void 0 : reciter.supportsWordHighlighting) !== false
        } : null;
      }).filter(Boolean);
      return normalized.length ? normalized : [{
        id: 'ar.alafasy',
        name: 'Alafasy',
        supportsWordHighlighting: true
      }];
    },
    recitersWithWordHighlight: function recitersWithWordHighlight() {
      return this.reciterChoices.filter(function (reciter) {
        return reciter.supportsWordHighlighting !== false;
      });
    },
    recitersAudioOnly: function recitersAudioOnly() {
      return this.reciterChoices.filter(function (reciter) {
        return reciter.supportsWordHighlighting === false;
      });
    },
    dailyGoalLabel: function dailyGoalLabel() {
      var _this$draft$dailyNewA;
      var exact = Number((_this$draft$dailyNewA = this.draft.dailyNewAyahs) === null || _this$draft$dailyNewA === void 0 ? void 0 : _this$draft$dailyNewA.exact);
      if (Number.isFinite(exact) && exact > 0) return "".concat(exact, " ayahs/day");
      return "".concat(this.selectedGoalOption.title, " (").concat(this.selectedGoalOption.subtitle, ")");
    },
    journeyForecast: function journeyForecast() {
      var _this$draft$dailyNewA2;
      return (0,_scripts_engine_hifz_session_engine__WEBPACK_IMPORTED_MODULE_0__.calculatePlanForecast)({
        goalSettings: {
          dailyNewAyahs: (_this$draft$dailyNewA2 = this.draft.dailyNewAyahs) !== null && _this$draft$dailyNewA2 !== void 0 && _this$draft$dailyNewA2.exact ? {
            exact: Number(this.draft.dailyNewAyahs.exact),
            min: Number(this.draft.dailyNewAyahs.exact),
            max: Number(this.draft.dailyNewAyahs.exact)
          } : this.selectedGoalOption.range
        },
        selectedSurah: this.draft.selectedSurah,
        selectedRange: this.draft.selectedRange,
        learningStyle: this.draft.learningStyle,
        focusMode: this.draft.focusMode
      });
    },
    forecastItems: function forecastItems() {
      var forecast = this.journeyForecast;
      return [{
        label: this.t('hifzPlan.wizard.forecast.totalAyahs'),
        value: forecast.totalAyahs.toLocaleString(),
        icon: 'bi-book'
      }, {
        label: this.t('hifzPlan.wizard.forecast.totalPages'),
        value: forecast.totalPages.toLocaleString(),
        icon: 'bi-file-earmark-text'
      }, {
        label: this.t('hifzPlan.wizard.forecast.totalHizb'),
        value: forecast.totalHizb.toLocaleString(),
        icon: 'bi-bookmarks'
      }, {
        label: this.t('hifzPlan.wizard.forecast.totalJuz'),
        value: forecast.totalJuz.toLocaleString(),
        icon: 'bi-journal-bookmark'
      }, {
        label: this.t('hifzPlan.wizard.forecast.dailyTarget'),
        value: this.t('hifzPlan.wizard.forecast.dailyTargetValue', {
          count: forecast.dailyTarget
        }),
        icon: 'bi-bullseye'
      }, {
        label: this.t('hifzPlan.wizard.forecast.estimatedDuration'),
        value: forecast.estimatedDuration,
        icon: 'bi-hourglass-split'
      }, {
        label: this.t('hifzPlan.wizard.forecast.estimatedCompletion'),
        value: forecast.estimatedCompletionDate,
        icon: 'bi-calendar-check'
      }];
    },
    summaryItems: function summaryItems() {
      var _this$reciterChoices$,
        _this0 = this,
        _this$draft$selectedR,
        _this$draft$selectedR2;
      var items = [{
        label: this.t('hifzPlan.wizard.forecast.dailyTarget'),
        value: this.dailyGoalLabel
      }, {
        label: this.t('hifzPlan.wizard.forecast.learningStyle'),
        value: this.selectedLearningStyleOption.title
      }, {
        label: this.t('hifzPlan.wizard.studyFlow'),
        value: this.selectedFocusOption.title
      }, {
        label: this.t('hifzPlan.wizard.forecast.supportLevel'),
        value: this.selectedSupportOption.title
      }, {
        label: this.t('hifzPlan.wizard.forecast.repeatsPerAyah'),
        value: "".concat(this.draft.repetitionsPerAyah, "x")
      }, {
        label: this.t('hifzPlan.wizard.reciterLabel'),
        value: ((_this$reciterChoices$ = this.reciterChoices.find(function (reciter) {
          return reciter.id === _this0.draft.reciterId;
        })) === null || _this$reciterChoices$ === void 0 ? void 0 : _this$reciterChoices$.name) || 'Alafasy'
      }, {
        label: this.t('hifzPlan.wizard.forecast.playbackSpeed'),
        value: "".concat(this.draft.playbackSpeed, "x")
      }, {
        label: this.t('hifzPlan.wizard.forecast.retentionReviews'),
        value: this.t('hifzPlan.wizard.forecast.retentionSchedule')
      }];
      if (this.draft.selectedSurah) items.splice(1, 0, {
        label: this.t('hifzPlan.surah'),
        value: this.draft.selectedSurah
      });
      if ((_this$draft$selectedR = this.draft.selectedRange) !== null && _this$draft$selectedR !== void 0 && _this$draft$selectedR.from && (_this$draft$selectedR2 = this.draft.selectedRange) !== null && _this$draft$selectedR2 !== void 0 && _this$draft$selectedR2.to) {
        items.splice(this.draft.selectedSurah ? 2 : 1, 0, {
          label: this.t('hifzPlan.wizard.ayahRange'),
          value: "".concat(this.draft.selectedRange.from, "-").concat(this.draft.selectedRange.to)
        });
      }
      return items;
    },
    hasValidDailyTarget: function hasValidDailyTarget() {
      var _this$draft$dailyNewA3, _this$draft$dailyNewA4, _this$draft$dailyNewA5;
      var exact = Number((_this$draft$dailyNewA3 = this.draft.dailyNewAyahs) === null || _this$draft$dailyNewA3 === void 0 ? void 0 : _this$draft$dailyNewA3.exact);
      var min = Number((_this$draft$dailyNewA4 = this.draft.dailyNewAyahs) === null || _this$draft$dailyNewA4 === void 0 ? void 0 : _this$draft$dailyNewA4.min);
      var max = Number((_this$draft$dailyNewA5 = this.draft.dailyNewAyahs) === null || _this$draft$dailyNewA5 === void 0 ? void 0 : _this$draft$dailyNewA5.max);
      return Number.isFinite(exact) && exact > 0 || Number.isFinite(min) && min > 0 || Number.isFinite(max) && max > 0;
    },
    hasValidRange: function hasValidRange() {
      var _this$draft$selectedR3, _this$draft$selectedR4;
      var from = Number(((_this$draft$selectedR3 = this.draft.selectedRange) === null || _this$draft$selectedR3 === void 0 ? void 0 : _this$draft$selectedR3.from) || 0);
      var to = Number(((_this$draft$selectedR4 = this.draft.selectedRange) === null || _this$draft$selectedR4 === void 0 ? void 0 : _this$draft$selectedR4.to) || 0);
      if (!from && !to) return true;
      if (!from || !to) return false;
      return to >= from;
    },
    canProceedFromCurrentStep: function canProceedFromCurrentStep() {
      return this.isStepComplete(this.currentStep);
    },
    canSavePlan: function canSavePlan() {
      return this.isStepComplete(this.steps.length - 1);
    },
    maxAccessibleStep: function maxAccessibleStep() {
      var _this1 = this;
      var firstIncomplete = this.steps.findIndex(function (_, index) {
        return !_this1.isStepComplete(index);
      });
      if (firstIncomplete === -1) return this.steps.length - 1;
      return Math.min(this.steps.length - 1, firstIncomplete);
    },
    wizardProgressPercent: function wizardProgressPercent() {
      var base = (this.currentStep + 1) / this.steps.length * 100;
      var bonus = this.canProceedFromCurrentStep ? 100 / this.steps.length * 0.35 : 0;
      return Math.max(20, Math.min(100, Math.round(base + bonus)));
    },
    stepValidationMessage: function stepValidationMessage() {
      var _this$steps$this$curr;
      var stepKey = (_this$steps$this$curr = this.steps[this.currentStep]) === null || _this$steps$this$curr === void 0 ? void 0 : _this$steps$this$curr.key;
      if (stepKey === 'goal') {
        if (!String(this.draft.selectedSurah || '').trim()) return '';
        if (!this.hasValidDailyTarget) return this.t('hifzPlan.wizard.validation.dailyTarget');
        if (!this.hasValidRange) return this.t('hifzPlan.wizard.validation.validRange');
      }
      if (stepKey === 'playback') {
        if (!Number(this.draft.repetitionsPerAyah)) return this.t('hifzPlan.wizard.validation.repeatsRequired');
        if (!String(this.draft.reciterId || '').trim()) return this.t('hifzPlan.wizard.validation.reciterRequired');
      }
      return '';
    }
  },
  watch: {
    visible: function visible(isVisible) {
      if (isVisible) this.prepareModal();
    }
  },
  mounted: function mounted() {
    if (this.visible) this.prepareModal();
  },
  methods: {
    createDefaultDraft: function createDefaultDraft() {
      return createDefaultHifzDraft();
    },
    prepareModal: function prepareModal() {
      var _this10 = this;
      this.currentStep = 0;
      this.existingPlan = this.loadExistingPlan();
      this.draft = this.planToDraft(this.existingPlan);
      if (!String(this.draft.reciterId || '').trim()) {
        var _this$reciterChoices$2;
        this.draft.reciterId = ((_this$reciterChoices$2 = this.reciterChoices[0]) === null || _this$reciterChoices$2 === void 0 ? void 0 : _this$reciterChoices$2.id) || 'ar.alafasy';
      }
      if (!this.speedOptions.includes(Number(this.draft.playbackSpeed))) {
        this.draft.playbackSpeed = 1;
      }
      this.manualTouched = {
        surah: false,
        dailyAyahs: false,
        range: false,
        learningStyle: false,
        focusMode: false,
        supportLevel: false,
        playback: false
      };
      this.$nextTick(function () {
        var _this10$$el, _this10$$el$querySele;
        var dialog = (_this10$$el = _this10.$el) === null || _this10$$el === void 0 || (_this10$$el$querySele = _this10$$el.querySelector) === null || _this10$$el$querySele === void 0 ? void 0 : _this10$$el$querySele.call(_this10$$el, '.hifz-plan-modal');
        if (dialog) dialog.focus({
          preventScroll: true
        });
      });
    },
    loadExistingPlan: function loadExistingPlan() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_unused) {
        return null;
      }
    },
    planToDraft: function planToDraft(plan) {
      var _this$goalOptions$fin, _this$goalOptions$fin2, _plan$goalSettings4, _plan$selectedRange, _plan$range, _plan$selectedRange2, _plan$range2, _plan$playback, _plan$playback2, _this$reciterChoices$3, _plan$playback3;
      if (!plan || _typeof(plan) !== 'object') return this.createDefaultDraft();
      var goal = ((_this$goalOptions$fin = this.goalOptions.find(function (option) {
        var _plan$goalSettings;
        return option.value === ((_plan$goalSettings = plan.goalSettings) === null || _plan$goalSettings === void 0 ? void 0 : _plan$goalSettings.goal);
      })) === null || _this$goalOptions$fin === void 0 ? void 0 : _this$goalOptions$fin.value) || ((_this$goalOptions$fin2 = this.goalOptions.find(function (option) {
        var _plan$goalSettings2, _plan$goalSettings3;
        var min = Number((_plan$goalSettings2 = plan.goalSettings) === null || _plan$goalSettings2 === void 0 || (_plan$goalSettings2 = _plan$goalSettings2.dailyNewAyahs) === null || _plan$goalSettings2 === void 0 ? void 0 : _plan$goalSettings2.min);
        var max = Number((_plan$goalSettings3 = plan.goalSettings) === null || _plan$goalSettings3 === void 0 || (_plan$goalSettings3 = _plan$goalSettings3.dailyNewAyahs) === null || _plan$goalSettings3 === void 0 ? void 0 : _plan$goalSettings3.max);
        return min === option.range.min && max === option.range.max;
      })) === null || _this$goalOptions$fin2 === void 0 ? void 0 : _this$goalOptions$fin2.value) || 'balanced';
      var selectedGoal = this.goalOptions.find(function (option) {
        return option.value === goal;
      }) || this.goalOptions[1];
      var exactDailyAyahs = Number((_plan$goalSettings4 = plan.goalSettings) === null || _plan$goalSettings4 === void 0 || (_plan$goalSettings4 = _plan$goalSettings4.dailyNewAyahs) === null || _plan$goalSettings4 === void 0 ? void 0 : _plan$goalSettings4.exact);
      return {
        goal: goal,
        dailyNewAyahs: Number.isFinite(exactDailyAyahs) && exactDailyAyahs > 0 ? {
          min: exactDailyAyahs,
          max: exactDailyAyahs,
          exact: exactDailyAyahs,
          label: "".concat(exactDailyAyahs, " ayahs/day")
        } : _objectSpread({}, selectedGoal.range),
        selectedSurah: plan.selectedSurah || plan.surah || '',
        selectedRange: {
          from: Number(((_plan$selectedRange = plan.selectedRange) === null || _plan$selectedRange === void 0 ? void 0 : _plan$selectedRange.from) || ((_plan$range = plan.range) === null || _plan$range === void 0 ? void 0 : _plan$range.from) || 0) || null,
          to: Number(((_plan$selectedRange2 = plan.selectedRange) === null || _plan$selectedRange2 === void 0 ? void 0 : _plan$selectedRange2.to) || ((_plan$range2 = plan.range) === null || _plan$range2 === void 0 ? void 0 : _plan$range2.to) || 0) || null
        },
        learningStyle: this.learningStyleOptions.some(function (option) {
          return option.value === plan.learningStyle;
        }) ? plan.learningStyle : 'balanced',
        focusMode: this.focusOptions.some(function (option) {
          return option.value === plan.focusMode;
        }) ? plan.focusMode : 'mixed',
        supportLevel: this.supportOptions.some(function (option) {
          var _plan$aiEvaluation;
          return option.value === ((_plan$aiEvaluation = plan.aiEvaluation) === null || _plan$aiEvaluation === void 0 ? void 0 : _plan$aiEvaluation.supportLevel);
        }) ? plan.aiEvaluation.supportLevel : 'standard',
        repetitionsPerAyah: Math.max(1, Math.min(10, Number(((_plan$playback = plan.playback) === null || _plan$playback === void 0 ? void 0 : _plan$playback.repetitionsPerAyah) || 5))),
        reciterId: String(((_plan$playback2 = plan.playback) === null || _plan$playback2 === void 0 ? void 0 : _plan$playback2.reciterId) || ((_this$reciterChoices$3 = this.reciterChoices[0]) === null || _this$reciterChoices$3 === void 0 ? void 0 : _this$reciterChoices$3.id) || 'ar.alafasy'),
        playbackSpeed: this.speedOptions.includes(Number((_plan$playback3 = plan.playback) === null || _plan$playback3 === void 0 ? void 0 : _plan$playback3.speed)) ? Number(plan.playback.speed) : 1
      };
    },
    selectGoal: function selectGoal(value) {
      var option = this.goalOptions.find(function (item) {
        return item.value === value;
      }) || this.goalOptions[1];
      this.draft.goal = option.value;
      this.draft.dailyNewAyahs = _objectSpread({}, option.range);
    },
    selectGoalManual: function selectGoalManual(value) {
      this.manualTouched.dailyAyahs = true;
      this.selectGoal(value);
    },
    setManualSurah: function setManualSurah(value) {
      this.manualTouched.surah = true;
      this.draft.selectedSurah = value || '';
    },
    setManualDailyAyahs: function setManualDailyAyahs(value) {
      this.manualTouched.dailyAyahs = true;
      var count = Number(value);
      if (!Number.isFinite(count) || count <= 0) {
        var option = this.selectedGoalOption;
        this.draft.dailyNewAyahs = _objectSpread({}, option.range);
        return;
      }
      this.applyDailyAyahCount(count);
    },
    setManualRangeBound: function setManualRangeBound(bound, value) {
      this.manualTouched.range = true;
      var nextRange = _objectSpread({}, this.draft.selectedRange || {
        from: null,
        to: null
      });
      var parsed = Number(value);
      nextRange[bound] = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      this.draft.selectedRange = nextRange;
    },
    selectLearningStyleManual: function selectLearningStyleManual(value) {
      this.manualTouched.learningStyle = true;
      this.draft.learningStyle = value;
    },
    selectFocusModeManual: function selectFocusModeManual(value) {
      this.manualTouched.focusMode = true;
      this.draft.focusMode = value;
    },
    selectSupportLevelManual: function selectSupportLevelManual(value) {
      this.manualTouched.supportLevel = true;
      this.draft.supportLevel = value;
    },
    setPlaybackField: function setPlaybackField(field, value) {
      this.manualTouched.playback = true;
      if (field === 'repetitionsPerAyah') {
        this.draft.repetitionsPerAyah = Math.max(1, Math.min(10, Number(value || 1)));
        return;
      }
      if (field === 'playbackSpeed') {
        var numeric = Number(value);
        this.draft.playbackSpeed = this.speedOptions.includes(numeric) ? numeric : 1;
        return;
      }
      if (field === 'reciterId') {
        var _this$reciterChoices$4;
        this.draft.reciterId = String(value || ((_this$reciterChoices$4 = this.reciterChoices[0]) === null || _this$reciterChoices$4 === void 0 ? void 0 : _this$reciterChoices$4.id) || 'ar.alafasy');
      }
    },
    applyDailyAyahCount: function applyDailyAyahCount(count) {
      var safeCount = Math.max(1, Math.min(10, Number(count || 0)));
      if (!Number.isFinite(safeCount)) return;
      this.draft.dailyNewAyahs = {
        min: safeCount,
        max: safeCount,
        exact: safeCount,
        label: "".concat(safeCount, " ayahs/day")
      };
      if (safeCount <= 3) this.draft.goal = 'light';else if (safeCount <= 5) this.draft.goal = 'balanced';else this.draft.goal = 'intensive';
    },
    isStepComplete: function isStepComplete(index) {
      var step = this.steps[index];
      if (!step) return false;
      if (step.key === 'goal') {
        return !!String(this.draft.selectedSurah || '').trim() && this.hasValidDailyTarget && this.hasValidRange;
      }
      if (step.key === 'style') return this.isStepComplete(0) && !!this.draft.learningStyle;
      if (step.key === 'flow') return this.isStepComplete(1) && !!this.draft.focusMode;
      if (step.key === 'support') return this.isStepComplete(2) && !!this.draft.supportLevel;
      if (step.key === 'playback') return this.isStepComplete(3) && Number(this.draft.repetitionsPerAyah) > 0 && !!String(this.draft.reciterId || '').trim();
      if (step.key === 'summary') return this.isStepComplete(4);
      return false;
    },
    isStepAccessible: function isStepAccessible(index) {
      return Number(index) <= this.maxAccessibleStep;
    },
    goToStep: function goToStep(index) {
      var nextIndex = Math.max(0, Math.min(this.steps.length - 1, Number(index || 0)));
      if (!this.isStepAccessible(nextIndex)) return;
      this.currentStep = nextIndex;
    },
    nextStep: function nextStep() {
      if (!this.canProceedFromCurrentStep) return;
      this.goToStep(this.currentStep + 1);
    },
    previousStep: function previousStep() {
      this.goToStep(this.currentStep - 1);
    },
    buildAiEvaluation: function buildAiEvaluation() {
      var support = this.draft.supportLevel;
      return {
        supportLevel: support,
        recitationChecker: support === 'standard' || support === 'highPrecision',
        memorisationChecker: true,
        precisionMode: support === 'highPrecision'
      };
    },
    buildPlanPayload: function buildPlanPayload() {
      var _this$draft$dailyNewA6, _this$existingPlan, _this$existingPlan2, _this$draft$selectedR5, _this$draft$selectedR6, _this$existingPlan3, _this$existingPlan4, _this$existingPlan5, _this$draft$selectedR7, _this$draft$selectedR8, _this$reciterChoices$5, _this$existingPlan6, _this$existingPlan7;
      var goalOption = this.selectedGoalOption;
      var now = new Date().toISOString();
      var dailyNewAyahs = (_this$draft$dailyNewA6 = this.draft.dailyNewAyahs) !== null && _this$draft$dailyNewA6 !== void 0 && _this$draft$dailyNewA6.exact ? {
        min: Number(this.draft.dailyNewAyahs.exact),
        max: Number(this.draft.dailyNewAyahs.exact),
        exact: Number(this.draft.dailyNewAyahs.exact),
        label: "".concat(Number(this.draft.dailyNewAyahs.exact), " ayahs/day")
      } : {
        min: goalOption.range.min,
        max: goalOption.range.max,
        label: goalOption.subtitle
      };
      var previousLifecycle = ((_this$existingPlan = this.existingPlan) === null || _this$existingPlan === void 0 ? void 0 : _this$existingPlan.lifecycle) || {};
      var lifecycleStatus = previousLifecycle.status || ((_this$existingPlan2 = this.existingPlan) === null || _this$existingPlan2 === void 0 ? void 0 : _this$existingPlan2.status) || 'active';
      var forecast = (0,_scripts_engine_hifz_session_engine__WEBPACK_IMPORTED_MODULE_0__.calculatePlanForecast)({
        goalSettings: {
          goal: goalOption.value,
          dailyNewAyahs: dailyNewAyahs
        },
        selectedSurah: this.draft.selectedSurah || '',
        selectedRange: {
          from: Number(((_this$draft$selectedR5 = this.draft.selectedRange) === null || _this$draft$selectedR5 === void 0 ? void 0 : _this$draft$selectedR5.from) || 0) || null,
          to: Number(((_this$draft$selectedR6 = this.draft.selectedRange) === null || _this$draft$selectedR6 === void 0 ? void 0 : _this$draft$selectedR6.to) || 0) || null
        },
        learningStyle: this.draft.learningStyle,
        focusMode: this.draft.focusMode
      });
      return {
        id: ((_this$existingPlan3 = this.existingPlan) === null || _this$existingPlan3 === void 0 ? void 0 : _this$existingPlan3.id) || "hifz-plan-".concat(Date.now()),
        status: lifecycleStatus === 'draft' ? 'active' : lifecycleStatus,
        lifecycle: {
          status: lifecycleStatus === 'draft' ? 'active' : lifecycleStatus,
          startedAt: previousLifecycle.startedAt || ((_this$existingPlan4 = this.existingPlan) === null || _this$existingPlan4 === void 0 ? void 0 : _this$existingPlan4.startedAt) || now,
          pausedAt: lifecycleStatus === 'paused' ? previousLifecycle.pausedAt || ((_this$existingPlan5 = this.existingPlan) === null || _this$existingPlan5 === void 0 ? void 0 : _this$existingPlan5.pausedAt) || now : null,
          updatedAt: now
        },
        goalSettings: {
          goal: goalOption.value,
          dailyNewAyahs: dailyNewAyahs
        },
        selectedSurah: this.draft.selectedSurah || '',
        selectedRange: {
          from: Number(((_this$draft$selectedR7 = this.draft.selectedRange) === null || _this$draft$selectedR7 === void 0 ? void 0 : _this$draft$selectedR7.from) || 0) || null,
          to: Number(((_this$draft$selectedR8 = this.draft.selectedRange) === null || _this$draft$selectedR8 === void 0 ? void 0 : _this$draft$selectedR8.to) || 0) || null
        },
        learningStyle: this.draft.learningStyle,
        focusMode: this.draft.focusMode,
        aiEvaluation: this.buildAiEvaluation(),
        playback: {
          repetitionsPerAyah: Math.max(1, Math.min(10, Number(this.draft.repetitionsPerAyah || 5))),
          reciterId: String(this.draft.reciterId || ((_this$reciterChoices$5 = this.reciterChoices[0]) === null || _this$reciterChoices$5 === void 0 ? void 0 : _this$reciterChoices$5.id) || 'ar.alafasy'),
          speed: Number(this.draft.playbackSpeed || 1)
        },
        spacedRetention: {
          enabled: true,
          intervalsDays: [1, 3, 7, 14, 30, 60],
          defaultIntervals: [{
            label: 'First review',
            afterDays: 1
          }, {
            label: 'Early retention',
            afterDays: 3
          }, {
            label: 'Weekly review',
            afterDays: 7
          }, {
            label: 'Two-week review',
            afterDays: 14
          }, {
            label: 'Monthly review',
            afterDays: 30
          }, {
            label: 'Long retention',
            afterDays: 60
          }]
        },
        forecast: forecast,
        progressSummary: ((_this$existingPlan6 = this.existingPlan) === null || _this$existingPlan6 === void 0 ? void 0 : _this$existingPlan6.progressSummary) || {
          completedAyahs: 0,
          completedReviews: 0,
          missedDays: 0,
          activityLog: []
        },
        createdAt: ((_this$existingPlan7 = this.existingPlan) === null || _this$existingPlan7 === void 0 ? void 0 : _this$existingPlan7.createdAt) || now,
        updatedAt: now
      };
    },
    savePlan: function savePlan() {
      if (!this.canSavePlan) return;
      var payload = this.buildPlanPayload();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      this.$emit('saved', payload);
      this.close();
    },
    close: function close() {
      this.$emit('close');
    }
  }
});

/***/ }),

/***/ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* binding */ render)
/* harmony export */ });
/* harmony import */ var vue__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vue */ "./node_modules/vue/dist/vue.esm-bundler.js");

var _hoisted_1 = {
  key: 0,
  "class": "hifz-plan-modal-wrap"
};
var _hoisted_2 = {
  "class": "modal-dialog modal-dialog-centered modal-dialog-scrollable"
};
var _hoisted_3 = {
  "class": "modal-content"
};
var _hoisted_4 = {
  "class": "modal-header"
};
var _hoisted_5 = {
  "class": "hifz-plan-kicker"
};
var _hoisted_6 = {
  id: "hifzPlanCreatorTitle",
  "class": "modal-title"
};
var _hoisted_7 = {
  "class": "modal-body"
};
var _hoisted_8 = {
  "class": "hifz-plan-progress",
  "aria-label": "Plan setup progress"
};
var _hoisted_9 = {
  "class": "hifz-plan-progress-head"
};
var _hoisted_10 = {
  "class": "hifz-plan-progress-kicker"
};
var _hoisted_11 = {
  "class": "hifz-plan-progress-percent"
};
var _hoisted_12 = {
  "class": "hifz-plan-progress-bar",
  "aria-hidden": "true"
};
var _hoisted_13 = {
  "class": "hifz-plan-progress-steps"
};
var _hoisted_14 = ["aria-current"];
var _hoisted_15 = {
  key: 0,
  "class": "hifz-plan-validation-hint"
};
var _hoisted_16 = {
  key: 0,
  "class": "hifz-plan-step"
};
var _hoisted_17 = {
  "class": "hifz-plan-step-head"
};
var _hoisted_18 = {
  "class": "row g-3"
};
var _hoisted_19 = ["onClick"];
var _hoisted_20 = {
  "class": "hifz-plan-choice-icon"
};
var _hoisted_21 = {
  "class": "hifz-plan-manual-fields"
};
var _hoisted_22 = {
  "class": "row g-3"
};
var _hoisted_23 = {
  "class": "col-5"
};
var _hoisted_24 = {
  "class": "form-label",
  "for": "hifzPlanSurah"
};
var _hoisted_25 = ["value", "placeholder"];
var _hoisted_26 = {
  id: "hifzPlanSurahOptions"
};
var _hoisted_27 = ["value"];
var _hoisted_28 = {
  "class": "col-3"
};
var _hoisted_29 = {
  "class": "form-label",
  "for": "hifzPlanDailyAyahs"
};
var _hoisted_30 = ["value"];
var _hoisted_31 = {
  "class": "col-2"
};
var _hoisted_32 = {
  "class": "form-label",
  "for": "hifzPlanRangeFrom"
};
var _hoisted_33 = ["value"];
var _hoisted_34 = {
  "class": "col-2"
};
var _hoisted_35 = {
  "class": "form-label",
  "for": "hifzPlanRangeTo"
};
var _hoisted_36 = ["value"];
var _hoisted_37 = {
  key: 1,
  "class": "hifz-plan-step"
};
var _hoisted_38 = {
  "class": "hifz-plan-step-head"
};
var _hoisted_39 = {
  "class": "row g-3"
};
var _hoisted_40 = ["onClick"];
var _hoisted_41 = {
  "class": "hifz-plan-choice-icon"
};
var _hoisted_42 = {
  key: 2,
  "class": "hifz-plan-step"
};
var _hoisted_43 = {
  "class": "hifz-plan-step-head"
};
var _hoisted_44 = {
  "class": "row g-3"
};
var _hoisted_45 = ["onClick"];
var _hoisted_46 = {
  "class": "hifz-plan-choice-icon"
};
var _hoisted_47 = {
  key: 3,
  "class": "hifz-plan-step"
};
var _hoisted_48 = {
  "class": "hifz-plan-step-head"
};
var _hoisted_49 = {
  "class": "row g-3"
};
var _hoisted_50 = ["onClick"];
var _hoisted_51 = {
  "class": "hifz-plan-choice-icon"
};
var _hoisted_52 = {
  key: 4,
  "class": "hifz-plan-step"
};
var _hoisted_53 = {
  "class": "hifz-plan-step-head"
};
var _hoisted_54 = {
  "class": "row g-3"
};
var _hoisted_55 = {
  "class": "col-4"
};
var _hoisted_56 = {
  "class": "form-label",
  "for": "hifzPlanRepeats"
};
var _hoisted_57 = ["value"];
var _hoisted_58 = {
  "class": "col-4"
};
var _hoisted_59 = {
  "class": "form-label",
  "for": "hifzPlanReciter"
};
var _hoisted_60 = ["value"];
var _hoisted_61 = ["label"];
var _hoisted_62 = ["value"];
var _hoisted_63 = ["label"];
var _hoisted_64 = ["value"];
var _hoisted_65 = {
  "class": "col-4"
};
var _hoisted_66 = {
  "class": "form-label",
  "for": "hifzPlanSpeed"
};
var _hoisted_67 = ["value"];
var _hoisted_68 = ["value"];
var _hoisted_69 = {
  key: 5,
  "class": "hifz-plan-step"
};
var _hoisted_70 = {
  "class": "hifz-plan-step-head"
};
var _hoisted_71 = {
  "class": "hifz-forecast-grid",
  "aria-label": "Hifz Journey Forecast"
};
var _hoisted_72 = {
  "class": "hifz-forecast-icon"
};
var _hoisted_73 = {
  "class": "hifz-plan-summary mt-3"
};
var _hoisted_74 = {
  "class": "hifz-plan-summary-note"
};
var _hoisted_75 = {
  "class": "modal-footer"
};
var _hoisted_76 = ["disabled"];
var _hoisted_77 = ["disabled"];
var _hoisted_78 = ["disabled"];
function render(_ctx, _cache, $props, $setup, $data, $options) {
  var _$options$steps$$data;
  return $props.visible ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", _hoisted_1, [_cache[13] || (_cache[13] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "modal-backdrop fade show"
  }, null, -1 /* CACHED */)), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", {
    "class": "modal fade show d-block hifz-plan-modal",
    tabindex: "-1",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "hifzPlanCreatorTitle",
    onClick: _cache[11] || (_cache[11] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.close && $options.close.apply($options, arguments);
    }, ["self"])),
    onKeydown: _cache[12] || (_cache[12] = (0,vue__WEBPACK_IMPORTED_MODULE_0__.withKeys)((0,vue__WEBPACK_IMPORTED_MODULE_0__.withModifiers)(function () {
      return $options.close && $options.close.apply($options, arguments);
    }, ["prevent"]), ["esc"]))
  }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_2, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_3, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_4, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_5, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('memorisation.planner.hifzPlan')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h2", _hoisted_6, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.existingPlan ? _ctx.t('hifzPlan.wizard.editTitle') : _ctx.t('hifzPlan.wizard.createTitle')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "btn-close",
    "aria-label": "Close",
    onClick: _cache[0] || (_cache[0] = function () {
      return $options.close && $options.close.apply($options, arguments);
    })
  })]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_7, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_8, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_9, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", null, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_10, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.wizard.stepCounter', {
    current: $data.currentStep + 1,
    total: $options.steps.length
  })), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(((_$options$steps$$data = $options.steps[$data.currentStep]) === null || _$options$steps$$data === void 0 ? void 0 : _$options$steps$$data.headline) || _ctx.t('hifzPlan.wizard.yourPlan')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_11, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.wizardProgressPercent) + "%", 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_12, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", {
    style: (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeStyle)({
      width: "".concat($options.wizardProgressPercent, "%")
    })
  }, null, 4 /* STYLE */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_13, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.steps, function (item, index) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
      key: item.key,
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["hifz-plan-step-dot", {
        active: $data.currentStep === index,
        complete: $options.isStepComplete(index),
        locked: index !== $data.currentStep
      }]),
      "aria-current": $data.currentStep === index ? 'step' : null,
      disabled: true
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(index + 1), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("small", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.label), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_14);
  }), 128 /* KEYED_FRAGMENT */))]), $options.stepValidationMessage ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("p", _hoisted_15, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($options.stepValidationMessage), 1 /* TEXT */)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)]), $data.currentStep === 0 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_16, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_17, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.choose_your_daily_goal')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.choose_how_many_new_ayahs_you_want_to_learn_each_d')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_18, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.goalOptions, function (option) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: option.value,
      "class": "col-4"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["card h-100 hifz-plan-choice", {
        selected: $data.draft.goal === option.value
      }]),
      onClick: function onClick($event) {
        return $options.selectGoalManual(option.value);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_20, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(option.icon)
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.title), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("small", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.subtitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("em", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.detail), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_19)]);
  }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_21, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_22, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_23, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_24, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.surah')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "hifzPlanSurah",
    "class": "form-control",
    list: "hifzPlanSurahOptions",
    value: $data.draft.selectedSurah,
    placeholder: _ctx.t('hifzPlan.wizard.chooseSurahPlaceholder'),
    onInput: _cache[1] || (_cache[1] = function ($event) {
      return $options.setManualSurah($event.target.value);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_25), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("datalist", _hoisted_26, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($data.surahList, function (surah) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: surah,
      value: surah
    }, null, 8 /* PROPS */, _hoisted_27);
  }), 128 /* KEYED_FRAGMENT */))])]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_28, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_29, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.daily_ayahs')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "hifzPlanDailyAyahs",
    type: "number",
    min: "1",
    max: "10",
    "class": "form-control",
    value: $data.draft.dailyNewAyahs.exact || '',
    placeholder: "1-10",
    onInput: _cache[2] || (_cache[2] = function ($event) {
      return $options.setManualDailyAyahs($event.target.value);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_30)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_31, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_32, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.from')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "hifzPlanRangeFrom",
    type: "number",
    min: "1",
    "class": "form-control",
    value: $data.draft.selectedRange.from || '',
    onInput: _cache[3] || (_cache[3] = function ($event) {
      return $options.setManualRangeBound('from', $event.target.value);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_33)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_34, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_35, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.wizard.to')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "hifzPlanRangeTo",
    type: "number",
    min: "1",
    "class": "form-control",
    value: $data.draft.selectedRange.to || '',
    onInput: _cache[4] || (_cache[4] = function ($event) {
      return $options.setManualRangeBound('to', $event.target.value);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_36)])])])])) : $data.currentStep === 1 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_37, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_38, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.pick_your_learning_style')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.pick_the_pace_that_feels_realistic_for_your_daily_')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_39, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.learningStyleOptions, function (option) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: option.value,
      "class": "col-4"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["card h-100 hifz-plan-choice", {
        selected: $data.draft.learningStyle === option.value
      }]),
      onClick: function onClick($event) {
        return $options.selectLearningStyleManual(option.value);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_41, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(option.icon)
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.title), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("small", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.subtitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("em", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.detail), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_40)]);
  }), 128 /* KEYED_FRAGMENT */))])])) : $data.currentStep === 2 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_42, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_43, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.set_your_study_flow')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.tell_mutqin_what_to_focus_on_first_during_each_ses')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_44, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.focusOptions, function (option) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: option.value,
      "class": "col-6"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["card h-100 hifz-plan-choice hifz-plan-choice-wide", {
        selected: $data.draft.focusMode === option.value
      }]),
      onClick: function onClick($event) {
        return $options.selectFocusModeManual(option.value);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_46, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(option.icon)
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.title), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("small", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.subtitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("em", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.detail), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_45)]);
  }), 128 /* KEYED_FRAGMENT */))])])) : $data.currentStep === 3 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_47, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_48, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.choose_your_support_level')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.choose_how_much_checking_and_guidance_you_want_dur')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_49, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.supportOptions, function (option) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: option.value,
      "class": "col-4"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
      type: "button",
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["card h-100 hifz-plan-choice", {
        selected: $data.draft.supportLevel === option.value
      }]),
      onClick: function onClick($event) {
        return $options.selectSupportLevelManual(option.value);
      }
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_51, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(option.icon)
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.title), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("small", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.subtitle), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("em", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option.detail), 1 /* TEXT */)], 10 /* CLASS, PROPS */, _hoisted_50)]);
  }), 128 /* KEYED_FRAGMENT */))])])) : $data.currentStep === 4 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_52, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_53, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.set_your_playback')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.choose_how_many_repeats_which_reciter_and_the_play')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_54, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_55, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_56, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.repeats_per_ayah')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("input", {
    id: "hifzPlanRepeats",
    type: "number",
    min: "1",
    max: "10",
    "class": "form-control",
    value: $data.draft.repetitionsPerAyah,
    onInput: _cache[5] || (_cache[5] = function ($event) {
      return $options.setPlaybackField('repetitionsPerAyah', $event.target.value);
    })
  }, null, 40 /* PROPS, NEED_HYDRATION */, _hoisted_57)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_58, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_59, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.reciter')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    id: "hifzPlanReciter",
    "class": "form-select",
    value: $data.draft.reciterId,
    onChange: _cache[6] || (_cache[6] = function ($event) {
      return $options.setPlaybackField('reciterId', $event.target.value);
    })
  }, [$options.recitersWithWordHighlight.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("optgroup", {
    key: 0,
    label: _ctx.t('sessionSetup.recitersWithWordHighlight')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.recitersWithWordHighlight, function (reciter) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: reciter.id,
      value: reciter.id
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(reciter.name), 9 /* TEXT, PROPS */, _hoisted_62);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_61)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true), $options.recitersAudioOnly.length ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("optgroup", {
    key: 1,
    label: _ctx.t('sessionSetup.recitersAudioOnly')
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.recitersAudioOnly, function (reciter) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: reciter.id,
      value: reciter.id
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(reciter.name), 9 /* TEXT, PROPS */, _hoisted_64);
  }), 128 /* KEYED_FRAGMENT */))], 8 /* PROPS */, _hoisted_63)) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true)], 40 /* PROPS, NEED_HYDRATION */, _hoisted_60)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_65, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("label", _hoisted_66, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.playback_speed')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("select", {
    id: "hifzPlanSpeed",
    "class": "form-select",
    value: $data.draft.playbackSpeed,
    onChange: _cache[7] || (_cache[7] = function ($event) {
      return $options.setPlaybackField('playbackSpeed', $event.target.value);
    })
  }, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($props.speedOptions, function (option) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("option", {
      key: "speed-".concat(option),
      value: option
    }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(option) + "x", 9 /* TEXT, PROPS */, _hoisted_68);
  }), 128 /* KEYED_FRAGMENT */))], 40 /* PROPS, NEED_HYDRATION */, _hoisted_67)])])])) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("section", _hoisted_69, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_70, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("h3", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.your_hifz_journey_is_ready')), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.review_todays_pace_then_start_and_let_mutqin_guide')), 1 /* TEXT */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_71, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.forecastItems, function (item) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: item.label,
      "class": "hifz-forecast-card"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", _hoisted_72, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("i", {
      "class": (0,vue__WEBPACK_IMPORTED_MODULE_0__.normalizeClass)(["bi", item.icon])
    }, null, 2 /* CLASS */)]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.label), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.value), 1 /* TEXT */)]);
  }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_73, [((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(true), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)(vue__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.renderList)($options.summaryItems, function (item) {
    return (0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("div", {
      key: item.label,
      "class": "hifz-plan-summary-row"
    }, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("span", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.label), 1 /* TEXT */), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("strong", null, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(item.value), 1 /* TEXT */)]);
  }), 128 /* KEYED_FRAGMENT */))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("p", _hoisted_74, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('hifzPlan.when_you_start_the_timer_audio_and_ayah_highlighti')), 1 /* TEXT */)]))]), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("div", _hoisted_75, [(0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementVNode)("button", {
    type: "button",
    "class": "btn btn-outline-secondary",
    disabled: $data.currentStep === 0,
    onClick: _cache[8] || (_cache[8] = function () {
      return $options.previousStep && $options.previousStep.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('common.back')), 9 /* TEXT, PROPS */, _hoisted_76), $data.currentStep < $options.steps.length - 1 ? ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 0,
    type: "button",
    "class": "btn btn-primary",
    disabled: !$options.canProceedFromCurrentStep,
    onClick: _cache[9] || (_cache[9] = function () {
      return $options.nextStep && $options.nextStep.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)(_ctx.t('common.continue')), 9 /* TEXT, PROPS */, _hoisted_77)) : ((0,vue__WEBPACK_IMPORTED_MODULE_0__.openBlock)(), (0,vue__WEBPACK_IMPORTED_MODULE_0__.createElementBlock)("button", {
    key: 1,
    type: "button",
    "class": "btn btn-primary hifz-plan-save-btn",
    disabled: !$options.canSavePlan,
    onClick: _cache[10] || (_cache[10] = function () {
      return $options.savePlan && $options.savePlan.apply($options, arguments);
    })
  }, (0,vue__WEBPACK_IMPORTED_MODULE_0__.toDisplayString)($data.existingPlan ? _ctx.t('hifzPlan.wizard.savePlan') : _ctx.t('hifzPlan.wizard.startJourney')), 9 /* TEXT, PROPS */, _hoisted_78))])])])], 32 /* NEED_HYDRATION */)])) : (0,vue__WEBPACK_IMPORTED_MODULE_0__.createCommentVNode)("v-if", true);
}

/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
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
___CSS_LOADER_EXPORT___.push([module.id, "\n.hifz-plan-modal-wrap[data-v-fa939e6c] {\n  position: fixed;\n  inset: 0;\n  z-index: 13000;\n  --plan-border: color-mix(in srgb, var(--accent) 18%, var(--border));\n  --plan-border-strong: color-mix(in srgb, var(--accent) 32%, var(--border));\n  --plan-surface: color-mix(in srgb, var(--surface-strong, #fff) 92%, var(--surface-elevated, var(--surface)));\n  --plan-surface-soft: color-mix(in srgb, var(--surface-soft, var(--surface)) 72%, var(--surface));\n  --plan-field: var(--field-bg, rgba(255, 255, 255, 0.9));\n  --plan-text: var(--text, #1f1a17);\n  --plan-muted: var(--text-muted, #6c6258);\n  --plan-accent: var(--accent, #9a6738);\n  --plan-accent-strong: var(--accent-strong, #6e4726);\n  --plan-accent-soft: var(--accent-light, rgba(154, 103, 56, 0.1));\n  --plan-overlay: var(--overlay, rgba(14, 12, 10, 0.32));\n}\n.hifz-plan-modal[data-v-fa939e6c] {\n  background: var(--plan-overlay);\n  overflow-y: auto;\n  overscroll-behavior: contain;\n  padding: max(0.75rem, env(safe-area-inset-top, 0px)) 0.75rem max(0.75rem, env(safe-area-inset-bottom, 0px));\n}\n.modal-dialog[data-v-fa939e6c] {\n  width: min(100%, 1240px);\n  margin-inline: auto;\n}\n.modal-content[data-v-fa939e6c] {\n  border: 1px solid var(--plan-border);\n  border-radius: 12px;\n  overflow: hidden;\n  background: var(--plan-surface);\n  box-shadow: var(--shadow-lg);\n  max-height: calc(100dvh - 1.5rem);\n}\n.modal-header[data-v-fa939e6c],\n.modal-footer[data-v-fa939e6c] {\n  border-color: color-mix(in srgb, var(--plan-border) 88%, transparent);\n  gap: 0.75rem;\n}\n.modal-header[data-v-fa939e6c] {\n  align-items: flex-start;\n}\n.modal-body[data-v-fa939e6c] {\n  overflow-y: auto;\n  -webkit-overflow-scrolling: touch;\n}\n.modal-footer[data-v-fa939e6c] {\n  position: sticky;\n  bottom: 0;\n  z-index: 2;\n  background: var(--plan-surface);\n  padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));\n}\n.hifz-plan-kicker[data-v-fa939e6c] {\n  display: block;\n  margin-bottom: 0.15rem;\n  color: var(--plan-accent);\n  font-size: 0.75rem;\n  font-weight: 700;\n  text-transform: uppercase;\n}\n.modal-title[data-v-fa939e6c] {\n  font-size: 1.35rem;\n  font-weight: 750;\n}\n.hifz-plan-manual-fields[data-v-fa939e6c] {\n  margin-top: 1rem;\n  padding: 0.95rem;\n  border: 1px solid color-mix(in srgb, var(--plan-border) 88%, transparent);\n  border-radius: 12px;\n  background: var(--plan-field);\n}\n.hifz-plan-manual-fields .form-label[data-v-fa939e6c] {\n  color: var(--plan-muted);\n  font-size: 0.76rem;\n  font-weight: 800;\n  text-transform: uppercase;\n}\n.hifz-plan-manual-fields .form-control[data-v-fa939e6c] {\n  border-color: var(--plan-border-strong);\n  background: var(--field-bg-strong, var(--plan-field));\n  color: var(--plan-text);\n  border-radius: 10px;\n}\n.hifz-plan-manual-fields .form-control[data-v-fa939e6c]:focus {\n  border-color: var(--plan-accent);\n  box-shadow: 0 0 0 0.18rem color-mix(in srgb, var(--plan-accent-soft) 76%, transparent);\n}\n.hifz-plan-progress[data-v-fa939e6c] {\n  display: grid;\n  gap: 0.85rem;\n  margin-bottom: 1.25rem;\n}\n.hifz-plan-progress-head[data-v-fa939e6c] {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 1rem;\n}\n.hifz-plan-progress-head strong[data-v-fa939e6c] {\n  display: block;\n  color: var(--plan-text);\n  font-size: 1rem;\n  font-weight: 760;\n}\n.hifz-plan-progress-kicker[data-v-fa939e6c],\n.hifz-plan-progress-percent[data-v-fa939e6c] {\n  color: var(--plan-muted);\n  font-size: 0.82rem;\n  font-weight: 700;\n  letter-spacing: 0.02em;\n  text-transform: uppercase;\n}\n.hifz-plan-progress-bar[data-v-fa939e6c] {\n  height: 0.5rem;\n  overflow: hidden;\n  border-radius: 999px;\n  background: var(--plan-accent-soft);\n}\n.hifz-plan-progress-bar span[data-v-fa939e6c] {\n  display: block;\n  height: 100%;\n  border-radius: inherit;\n  background: linear-gradient(90deg, var(--plan-accent-strong), color-mix(in srgb, var(--plan-accent) 46%, var(--text-on-accent, #fffaf5)));\n  transition: width 180ms ease;\n}\n.hifz-plan-progress-steps[data-v-fa939e6c] {\n  display: grid;\n  grid-template-columns: repeat(5, minmax(0, 1fr));\n  gap: 0.5rem;\n}\n.hifz-plan-progress-note[data-v-fa939e6c],\n.hifz-plan-summary-note[data-v-fa939e6c] {\n  margin: 0.4rem 0 0;\n  color: var(--plan-muted);\n  font-size: 0.82rem;\n}\n.hifz-plan-validation-hint[data-v-fa939e6c] {\n  margin: -0.2rem 0 0;\n  color: color-mix(in srgb, var(--plan-accent) 62%, #b77722);\n  font-size: 0.84rem;\n  font-weight: 700;\n}\n.hifz-plan-step-dot[data-v-fa939e6c] {\n  display: grid;\n  gap: 0.35rem;\n  justify-items: center;\n  min-width: 0;\n  min-height: 44px;\n  border: 0;\n  background: transparent;\n  color: var(--plan-muted);\n  font-size: 0.75rem;\n  transition: opacity 160ms ease, transform 160ms ease;\n}\n.hifz-plan-step-dot span[data-v-fa939e6c] {\n  width: 32px;\n  height: 32px;\n  display: inline-grid;\n  place-items: center;\n  border-radius: 999px;\n  border: 1px solid var(--plan-border-strong);\n  background: var(--plan-surface-soft);\n  font-weight: 700;\n}\n.hifz-plan-step-dot small[data-v-fa939e6c] {\n  max-width: 100%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.hifz-plan-step-dot.active span[data-v-fa939e6c],\n.hifz-plan-step-dot.complete span[data-v-fa939e6c] {\n  background: var(--plan-accent);\n  color: var(--text-on-accent, #fffaf5);\n  border-color: var(--plan-accent);\n}\n.hifz-plan-step-dot.active[data-v-fa939e6c] {\n  color: var(--plan-accent-strong);\n}\n.hifz-plan-step-dot.locked[data-v-fa939e6c] {\n  opacity: 0.55;\n}\n.hifz-plan-step-dot[data-v-fa939e6c]:disabled {\n  cursor: not-allowed;\n}\n.hifz-plan-step-head[data-v-fa939e6c] {\n  margin-bottom: 1rem;\n}\n.hifz-plan-step-head h3[data-v-fa939e6c] {\n  margin: 0;\n  font-size: 1.2rem;\n  font-weight: 740;\n}\n.hifz-plan-step-head p[data-v-fa939e6c] {\n  margin: 0.28rem 0 0;\n  color: var(--plan-muted);\n}\n.hifz-plan-choice[data-v-fa939e6c] {\n  width: 100%;\n  min-height: 176px;\n  padding: 1.15rem;\n  align-items: flex-start;\n  text-align: left;\n  border: 2px solid color-mix(in srgb, var(--plan-accent) 16%, var(--border));\n  border-radius: 12px;\n  background: var(--plan-field);\n  color: var(--plan-text);\n  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;\n}\n.hifz-plan-choice[data-v-fa939e6c]:hover {\n  transform: translateY(-3px);\n  border-color: color-mix(in srgb, var(--plan-accent) 42%, var(--border));\n  box-shadow: var(--shadow-md);\n}\n.hifz-plan-choice.selected[data-v-fa939e6c] {\n  transform: translateY(-4px) scale(1.01);\n  border-color: var(--plan-accent-strong);\n  background: linear-gradient(180deg, color-mix(in srgb, var(--plan-accent-soft) 44%, var(--plan-field)) 0%, var(--plan-field) 72%);\n  box-shadow: var(--shadow-lg), inset 0 0 0 1px color-mix(in srgb, var(--plan-accent) 28%, transparent);\n}\n.hifz-plan-choice-icon[data-v-fa939e6c] {\n  width: 52px;\n  height: 52px;\n  display: inline-grid;\n  place-items: center;\n  margin-bottom: 0.75rem;\n  border-radius: 10px;\n  background: var(--plan-accent-soft);\n  color: var(--plan-accent);\n  font-size: 1.35rem;\n}\n.hifz-plan-choice.selected .hifz-plan-choice-icon[data-v-fa939e6c] {\n  background: var(--plan-accent-strong);\n  color: var(--text-on-accent, #fffaf5);\n}\n.hifz-plan-choice strong[data-v-fa939e6c] {\n  overflow-wrap: anywhere;\n  font-size: 1.06rem;\n}\n.hifz-plan-choice small[data-v-fa939e6c] {\n  margin-top: 0.35rem;\n  color: var(--plan-text);\n  font-weight: 700;\n  line-height: 1.35;\n}\n.hifz-plan-choice em[data-v-fa939e6c] {\n  display: block;\n  margin-top: 0.55rem;\n  color: var(--plan-muted);\n  font-size: 0.82rem;\n  font-style: normal;\n  line-height: 1.45;\n}\n.hifz-plan-choice-wide[data-v-fa939e6c] {\n  min-height: 178px;\n}\n.hifz-forecast-grid[data-v-fa939e6c] {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 0.75rem;\n}\n.hifz-forecast-card[data-v-fa939e6c] {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr);\n  gap: 0.18rem 0.65rem;\n  align-items: center;\n  min-height: 84px;\n  padding: 0.9rem;\n  border: 1px solid var(--plan-border);\n  border-radius: 10px;\n  background: linear-gradient(180deg, color-mix(in srgb, var(--plan-surface-soft) 88%, transparent), var(--plan-field));\n}\n.hifz-forecast-icon[data-v-fa939e6c] {\n  grid-row: span 2;\n  width: 42px;\n  height: 42px;\n  display: inline-grid;\n  place-items: center;\n  border-radius: 10px;\n  background: var(--plan-accent-soft);\n  color: var(--plan-accent);\n  font-size: 1.15rem;\n}\n.hifz-forecast-card span[data-v-fa939e6c]:not(.hifz-forecast-icon) {\n  color: var(--plan-muted);\n  font-size: 0.78rem;\n  font-weight: 800;\n  text-transform: uppercase;\n}\n.hifz-forecast-card strong[data-v-fa939e6c] {\n  min-width: 0;\n  overflow-wrap: anywhere;\n  color: var(--plan-text);\n  font-size: 1rem;\n  line-height: 1.22;\n}\n.hifz-plan-summary[data-v-fa939e6c] {\n  display: grid;\n  gap: 0.75rem;\n}\n.hifz-plan-summary-row[data-v-fa939e6c] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  padding: 0.9rem 1rem;\n  border: 1px solid color-mix(in srgb, var(--plan-border) 88%, transparent);\n  border-radius: 10px;\n  background: color-mix(in srgb, var(--plan-surface-soft) 88%, transparent);\n}\n.hifz-plan-summary-row span[data-v-fa939e6c] {\n  color: var(--plan-muted);\n}\n.hifz-plan-summary-row strong[data-v-fa939e6c] {\n  text-align: right;\n}\n.hifz-plan-save-btn[data-v-fa939e6c] {\n  font-weight: 700;\n}\n.hifz-plan-modal .btn[data-v-fa939e6c],\n.hifz-plan-modal .btn-close[data-v-fa939e6c],\n.hifz-plan-choice[data-v-fa939e6c],\n.hifz-plan-step-dot[data-v-fa939e6c] {\n  min-width: 44px;\n  min-height: 44px;\n}\n.hifz-plan-modal .btn[data-v-fa939e6c] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.4rem;\n}\n\n", ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css":
/*!*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css ***!
  \*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_style_index_0_id_fa939e6c_scoped_true_lang_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/vue-loader/dist/stylePostLoader.js!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css */ "./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css");

            

var options = {};

options.insert = "head";
options.singleton = false;

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_style_index_0_id_fa939e6c_scoped_true_lang_css__WEBPACK_IMPORTED_MODULE_1__["default"], options);



/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_style_index_0_id_fa939e6c_scoped_true_lang_css__WEBPACK_IMPORTED_MODULE_1__["default"].locals || {});

/***/ }),

/***/ "./resources/js/components/HifzPlanCreatorModal.vue":
/*!**********************************************************!*\
  !*** ./resources/js/components/HifzPlanCreatorModal.vue ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _HifzPlanCreatorModal_vue_vue_type_template_id_fa939e6c_scoped_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true */ "./resources/js/components/HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true");
/* harmony import */ var _HifzPlanCreatorModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./HifzPlanCreatorModal.vue?vue&type=script&lang=js */ "./resources/js/components/HifzPlanCreatorModal.vue?vue&type=script&lang=js");
/* harmony import */ var _HifzPlanCreatorModal_vue_vue_type_style_index_0_id_fa939e6c_scoped_true_lang_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css */ "./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css");
/* harmony import */ var _Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./node_modules/vue-loader/dist/exportHelper.js */ "./node_modules/vue-loader/dist/exportHelper.js");




;


const __exports__ = /*#__PURE__*/(0,_Users_mohamedamine_Desktop_mutqin_node_modules_vue_loader_dist_exportHelper_js__WEBPACK_IMPORTED_MODULE_3__["default"])(_HifzPlanCreatorModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_1__["default"], [['render',_HifzPlanCreatorModal_vue_vue_type_template_id_fa939e6c_scoped_true__WEBPACK_IMPORTED_MODULE_0__.render],['__scopeId',"data-v-fa939e6c"],['__file',"resources/js/components/HifzPlanCreatorModal.vue"]])
/* hot reload */
if (false) {}


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (__exports__);

/***/ }),

/***/ "./resources/js/components/HifzPlanCreatorModal.vue?vue&type=script&lang=js":
/*!**********************************************************************************!*\
  !*** ./resources/js/components/HifzPlanCreatorModal.vue?vue&type=script&lang=js ***!
  \**********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_script_lang_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./HifzPlanCreatorModal.vue?vue&type=script&lang=js */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=script&lang=js");
 

/***/ }),

/***/ "./resources/js/components/HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true":
/*!****************************************************************************************************!*\
  !*** ./resources/js/components/HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true ***!
  \****************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   render: () => (/* reexport safe */ _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_template_id_fa939e6c_scoped_true__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var _node_modules_babel_loader_lib_index_js_clonedRuleSet_5_use_0_node_modules_vue_loader_dist_templateLoader_js_ruleSet_1_rules_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_template_id_fa939e6c_scoped_true__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!../../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true */ "./node_modules/babel-loader/lib/index.js??clonedRuleSet-5.use[0]!./node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=template&id=fa939e6c&scoped=true");


/***/ }),

/***/ "./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css":
/*!******************************************************************************************************************!*\
  !*** ./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css ***!
  \******************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_style_loader_dist_cjs_js_node_modules_css_loader_dist_cjs_js_clonedRuleSet_9_use_1_node_modules_vue_loader_dist_stylePostLoader_js_node_modules_postcss_loader_dist_cjs_js_clonedRuleSet_9_use_2_node_modules_vue_loader_dist_index_js_ruleSet_0_use_0_HifzPlanCreatorModal_vue_vue_type_style_index_0_id_fa939e6c_scoped_true_lang_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! -!../../../node_modules/style-loader/dist/cjs.js!../../../node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!../../../node_modules/vue-loader/dist/stylePostLoader.js!../../../node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!../../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css */ "./node_modules/style-loader/dist/cjs.js!./node_modules/css-loader/dist/cjs.js??clonedRuleSet-9.use[1]!./node_modules/vue-loader/dist/stylePostLoader.js!./node_modules/postcss-loader/dist/cjs.js??clonedRuleSet-9.use[2]!./node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./resources/js/components/HifzPlanCreatorModal.vue?vue&type=style&index=0&id=fa939e6c&scoped=true&lang=css");


/***/ })

}]);