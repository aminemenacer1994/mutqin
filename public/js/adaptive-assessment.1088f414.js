"use strict";
(self["webpackChunk"] = self["webpackChunk"] || []).push([["adaptive-assessment"],{

/***/ "./resources/js/scripts/assessment/AdaptiveAssessmentService.js":
/*!**********************************************************************!*\
  !*** ./resources/js/scripts/assessment/AdaptiveAssessmentService.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AdaptiveAssessmentService: () => (/* binding */ AdaptiveAssessmentService),
/* harmony export */   answerCurrentQuestion: () => (/* binding */ answerCurrentQuestion),
/* harmony export */   buildAssessmentResultViewModel: () => (/* binding */ buildAssessmentResultViewModel),
/* harmony export */   clearAssessmentSession: () => (/* binding */ clearAssessmentSession),
/* harmony export */   completeAssessment: () => (/* binding */ completeAssessment),
/* harmony export */   createAssessmentSession: () => (/* binding */ createAssessmentSession),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   loadAssessmentSession: () => (/* binding */ loadAssessmentSession),
/* harmony export */   pauseAssessment: () => (/* binding */ pauseAssessment),
/* harmony export */   persistAssessmentSession: () => (/* binding */ persistAssessmentSession),
/* harmony export */   presentNextQuestion: () => (/* binding */ presentNextQuestion),
/* harmony export */   requestHint: () => (/* binding */ requestHint),
/* harmony export */   resumeAssessment: () => (/* binding */ resumeAssessment),
/* harmony export */   startAdaptiveCheck: () => (/* binding */ startAdaptiveCheck)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
/* harmony import */ var _AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AssessmentScoringService.js */ "./resources/js/scripts/assessment/AssessmentScoringService.js");
/* harmony import */ var _QuestionSelectionService_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./QuestionSelectionService.js */ "./resources/js/scripts/assessment/QuestionSelectionService.js");
/* harmony import */ var _LearnerMasteryService_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./LearnerMasteryService.js */ "./resources/js/scripts/assessment/LearnerMasteryService.js");
/* harmony import */ var _RecommendationPolicyService_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./RecommendationPolicyService.js */ "./resources/js/scripts/assessment/RecommendationPolicyService.js");
/* harmony import */ var _ReviewSchedulingService_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./ReviewSchedulingService.js */ "./resources/js/scripts/assessment/ReviewSchedulingService.js");
/* harmony import */ var _RecommendationEffectivenessService_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./RecommendationEffectivenessService.js */ "./resources/js/scripts/assessment/RecommendationEffectivenessService.js");
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * Adaptive assessment controller: start → present → answer → adapt → early stop → result VM.
 * State survives refresh via localStorage (hybrid with recommendation snapshot on the server).
 */









function storage() {
  var bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null;
  if (bridge !== null && bridge !== void 0 && bridge.getItem && bridge !== null && bridge !== void 0 && bridge.setItem) return bridge;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}
function emptySkills() {
  var _ref;
  return _ref = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_ref, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.BEGINNINGS, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.ENDINGS, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.FLUENCY, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY, 0.3), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY, 0.4), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_ref, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AUDIO_DEPENDENCY, 0.4), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SIMILAR_AYAH_CONFUSION, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION, 0.5), _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.CONFIDENCE_CALIBRATION, 0.5);
}

/**
 * @param {object} [partial]
 */
function createAssessmentSession() {
  var _partial$sourceSessio, _partial$recommendati;
  var partial = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var nowIso = partial.nowIso || new Date().toISOString();
  return {
    id: partial.id || "assess_".concat(Date.now()),
    status: partial.status || 'active',
    // active|paused|completed|abandoned
    startedAt: partial.startedAt || nowIso,
    updatedAt: nowIso,
    sourceSessionId: (_partial$sourceSessio = partial.sourceSessionId) !== null && _partial$sourceSessio !== void 0 ? _partial$sourceSessio : null,
    recommendationId: (_partial$recommendati = partial.recommendationId) !== null && _partial$recommendati !== void 0 ? _partial$recommendati : null,
    difficulty: Number(partial.difficulty) || _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.START_DIFFICULTY,
    questionsAsked: Number(partial.questionsAsked) || 0,
    consecutiveErrors: Number(partial.consecutiveErrors) || 0,
    recentTypes: Array.isArray(partial.recentTypes) ? partial.recentTypes : [],
    currentQuestion: partial.currentQuestion || null,
    currentPresentedAt: partial.currentPresentedAt || null,
    responses: Array.isArray(partial.responses) ? partial.responses : [],
    events: Array.isArray(partial.events) ? partial.events : [],
    skills: partial.skills && _typeof(partial.skills) === 'object' ? partial.skills : emptySkills(),
    context: partial.context || {},
    stoppedEarly: !!partial.stoppedEarly,
    result: partial.result || null
  };
}
function persistAssessmentSession(session) {
  var store = storage();
  if (!store) return false;
  try {
    store.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.ASSESSMENT_SESSION, JSON.stringify(session));
    return true;
  } catch (_unused) {
    return false;
  }
}
function loadAssessmentSession() {
  var store = storage();
  if (!store) return null;
  try {
    var raw = store.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.ASSESSMENT_SESSION);
    if (!raw) return null;
    return createAssessmentSession(JSON.parse(raw));
  } catch (_unused2) {
    return null;
  }
}
function clearAssessmentSession() {
  var store = storage();
  if (!store) return;
  try {
    store.removeItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.ASSESSMENT_SESSION);
  } catch (_unused3) {
    /* ignore */
  }
}
function pushEvent(session, type) {
  var payload = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var event = _objectSpread({
    type: type,
    at: new Date().toISOString()
  }, payload);
  session.events = [].concat(_toConsumableArray(session.events || []), [event]).slice(-200);
  return event;
}

/**
 * Start an adaptive check for the completed session range.
 *
 * @param {{
 *   verses: object[],
 *   sourceSessionId?: string|number|null,
 *   recommendationId?: string|number|null,
 *   sessionContext?: object,
 *   surahCatalog?: object[],
 *   masteryByKey?: Record<string, object>,
 *   rng?: () => number,
 * }} input
 */
function startAdaptiveCheck() {
  var _input$sourceSessionI, _input$recommendation;
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var masteryByKey = input.masteryByKey || (0,_LearnerMasteryService_js__WEBPACK_IMPORTED_MODULE_3__.loadMasteryMap)();
  var session = createAssessmentSession({
    sourceSessionId: (_input$sourceSessionI = input.sourceSessionId) !== null && _input$sourceSessionI !== void 0 ? _input$sourceSessionI : null,
    recommendationId: (_input$recommendation = input.recommendationId) !== null && _input$recommendation !== void 0 ? _input$recommendation : null,
    difficulty: _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.START_DIFFICULTY,
    context: {
      verses: (input.verses || []).map(summariseVerse),
      session: input.sessionContext || {},
      surahCatalog: input.surahCatalog || [],
      masteryByKey: masteryByKey
    }
  });
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.ADAPTIVE_CHECK_STARTED, {
    difficulty: session.difficulty,
    verseCount: session.context.verses.length
  });
  presentNextQuestion(session, input.rng);
  persistAssessmentSession(session);
  return session;
}
function summariseVerse(v) {
  return {
    key: v.key,
    surah: Number(v.surah || String(v.key || '').split(':')[0] || 0),
    ayah: Number(v.ayah || v.number || String(v.key || '').split(':')[1] || 0),
    arabic: v.arabic || v.text || '',
    surahName: v.surahName || v.chapterName || ''
  };
}

/**
 * @param {object} session
 * @param {() => number} [rng]
 */
function presentNextQuestion(session) {
  var _ctx$session, _ctx$session2, _ctx$session3, _ctx$session4, _ctx$session5;
  var rng = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Math.random;
  if (!session || session.status !== 'active') return session;
  var ctx = session.context || {};
  var question = (0,_QuestionSelectionService_js__WEBPACK_IMPORTED_MODULE_2__.selectNextQuestion)({
    verses: ctx.verses || [],
    difficulty: session.difficulty,
    recentTypes: session.recentTypes,
    masteryByKey: ctx.masteryByKey || {},
    sessionWeakAyahs: ((_ctx$session = ctx.session) === null || _ctx$session === void 0 ? void 0 : _ctx$session.weak_ayahs) || ((_ctx$session2 = ctx.session) === null || _ctx$session2 === void 0 ? void 0 : _ctx$session2.weakAyahs) || [],
    overdueKeys: ((_ctx$session3 = ctx.session) === null || _ctx$session3 === void 0 ? void 0 : _ctx$session3.overdueKeys) || [],
    sessionRange: ((_ctx$session4 = ctx.session) === null || _ctx$session4 === void 0 ? void 0 : _ctx$session4.range) || ((_ctx$session5 = ctx.session) === null || _ctx$session5 === void 0 ? void 0 : _ctx$session5.sessionRange) || null,
    surahCatalog: ctx.surahCatalog || [],
    rng: rng
  });
  if (!question) {
    return completeAssessment(session, {
      force: true
    });
  }
  session.currentQuestion = question;
  session.currentPresentedAt = new Date().toISOString();
  session.updatedAt = session.currentPresentedAt;
  session.recentTypes = [].concat(_toConsumableArray(session.recentTypes || []), [question.type]).slice(-6);
  session.questionsAsked = Number(session.questionsAsked || 0) + 1;
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.QUESTION_PRESENTED, {
    questionId: question.id,
    type: question.type,
    difficulty: question.difficulty,
    verseKey: question.verseKey
  });
  if (question.requiresAiRecite) {
    pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.AI_RECITE_REQUESTED, {
      questionId: question.id,
      verseKey: question.verseKey
    });
  }
  persistAssessmentSession(session);
  return session;
}

/**
 * @param {object} session
 * @param {{
 *   answer?: any,
 *   usedHint?: boolean,
 *   responseMs?: number,
 *   aiResult?: object|null,
 *   rng?: () => number,
 * }} response
 */
function answerCurrentQuestion(session) {
  var _response$answer;
  var response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!session || session.status !== 'active' || !session.currentQuestion) return session;
  var question = session.currentQuestion;
  var presentedAt = session.currentPresentedAt ? Date.parse(session.currentPresentedAt) : Date.now();
  var responseMs = Number.isFinite(Number(response.responseMs)) ? Number(response.responseMs) : Math.max(0, Date.now() - presentedAt);
  if (response.usedHint) {
    pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.HINT_REQUESTED, {
      questionId: question.id,
      verseKey: question.verseKey
    });
  }
  var scored = (0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.scoreItemResponse)(question, _objectSpread(_objectSpread({}, response), {}, {
    responseMs: responseMs
  }));
  var prevDifficulty = session.difficulty;
  session.skills = (0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.updateSkillEstimates)(session.skills, question, scored);
  if (scored.correct) session.consecutiveErrors = 0;else session.consecutiveErrors = Number(session.consecutiveErrors || 0) + 1;

  // Repeated error → one diagnostic confirmation (stay / drop difficulty)
  var needsDiagnostic = session.consecutiveErrors >= 2 && !scored.correct;
  session.difficulty = (0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.nextDifficulty)(session.difficulty, scored, {
    consecutiveErrors: session.consecutiveErrors
  });
  if (session.difficulty !== prevDifficulty) {
    pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.DIFFICULTY_CHANGED, {
      from: prevDifficulty,
      to: session.difficulty
    });
  }
  var item = _objectSpread(_objectSpread({
    questionId: question.id,
    verseKey: question.verseKey,
    type: question.type,
    difficulty: question.difficulty,
    skills: question.skills
  }, scored), {}, {
    answer: (_response$answer = response.answer) !== null && _response$answer !== void 0 ? _response$answer : null,
    aiResult: response.aiResult || null,
    needsDiagnostic: needsDiagnostic,
    question: question
  });
  session.responses = [].concat(_toConsumableArray(session.responses), [item]);
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.QUESTION_ANSWERED, {
    questionId: question.id,
    correct: scored.correct,
    partial: scored.partial
  });
  pushEvent(session, scored.correct ? _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.ANSWER_CORRECT : _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.ANSWER_INCORRECT, {
    questionId: question.id,
    verseKey: question.verseKey
  });

  // Detect skill weaknesses as they appear
  var _iterator = _createForOfIteratorHelper(question.skills || []),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _session$skills$skill;
      var skill = _step.value;
      if (((_session$skills$skill = session.skills[skill]) !== null && _session$skills$skill !== void 0 ? _session$skills$skill : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
        pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.SKILL_WEAKNESS_DETECTED, {
          skill: skill,
          value: session.skills[skill]
        });
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  session.currentQuestion = null;
  session.currentPresentedAt = null;
  session.updatedAt = new Date().toISOString();
  if ((0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.shouldStopEarly)({
    responses: session.responses,
    skills: session.skills,
    questionCount: session.questionsAsked
  })) {
    session.stoppedEarly = true;
    pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.ASSESSMENT_STOPPED_EARLY, {
      questionsAsked: session.questionsAsked
    });
    return completeAssessment(session);
  }
  if (session.questionsAsked >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.MAX_QUESTIONS) {
    return completeAssessment(session);
  }

  // After repeated errors, force a lower-difficulty diagnostic confirmation question
  if (needsDiagnostic) {
    session.difficulty = Math.max(_constants_js__WEBPACK_IMPORTED_MODULE_0__.DIFFICULTY.RECOGNITION, session.difficulty);
  }
  presentNextQuestion(session, response.rng);
  persistAssessmentSession(session);
  return session;
}

/**
 * Request a hint for the current question (does not advance).
 * @param {object} session
 */
function requestHint(session) {
  if (!(session !== null && session !== void 0 && session.currentQuestion)) return {
    session: session,
    hint: null
  };
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.HINT_REQUESTED, {
    questionId: session.currentQuestion.id
  });
  session.updatedAt = new Date().toISOString();
  persistAssessmentSession(session);
  return {
    session: session,
    hint: session.currentQuestion.hint || null
  };
}
function pauseAssessment(session) {
  if (!session) return session;
  session.status = 'paused';
  session.updatedAt = new Date().toISOString();
  persistAssessmentSession(session);
  return session;
}
function resumeAssessment(session) {
  if (!session) return session;
  if (session.status === 'paused') session.status = 'active';
  session.updatedAt = new Date().toISOString();
  if (!session.currentQuestion && session.status === 'active' && !session.result) {
    presentNextQuestion(session);
  }
  persistAssessmentSession(session);
  return session;
}

/**
 * @param {object} session
 * @param {{ force?: boolean, confidence?: string|null, baseRecommendation?: object|null }} [opts]
 */
function completeAssessment(session) {
  var _ref2, _opts$confidence, _session$context, _session$context2, _session$context3, _session$context4;
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (!session) return session;
  if (session.status === 'completed' && session.result && !opts.force) return session;
  var nowIso = new Date().toISOString();
  var confidence = (_ref2 = (_opts$confidence = opts.confidence) !== null && _opts$confidence !== void 0 ? _opts$confidence : (_session$context = session.context) === null || _session$context === void 0 || (_session$context = _session$context.session) === null || _session$context === void 0 ? void 0 : _session$context.confidence) !== null && _ref2 !== void 0 ? _ref2 : null;
  var reasonCodes = (0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.detectReasonCodes)({
    skills: session.skills,
    session: ((_session$context2 = session.context) === null || _session$context2 === void 0 ? void 0 : _session$context2.session) || {},
    confidence: confidence,
    aiAssessment: extractAiFromResponses(session.responses),
    responses: session.responses,
    incomplete: !!((_session$context3 = session.context) !== null && _session$context3 !== void 0 && (_session$context3 = _session$context3.session) !== null && _session$context3 !== void 0 && _session$context3.incomplete)
  });
  var band = (0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.objectiveBand)(session.skills);
  var skillView = (0,_AssessmentScoringService_js__WEBPACK_IMPORTED_MODULE_1__.buildResultSkillView)(session.skills);
  var primaryWeakness = skillView.slice().sort(function (a, b) {
    return a.value - b.value;
  })[0];
  var primaryStrength = skillView.slice().sort(function (a, b) {
    return b.value - a.value;
  })[0];
  var verseKeys = _toConsumableArray(new Set(session.responses.map(function (r) {
    return r.verseKey;
  }).filter(Boolean)));
  var masteryMap = (0,_LearnerMasteryService_js__WEBPACK_IMPORTED_MODULE_3__.loadMasteryMap)();
  var reviewSnap = (0,_ReviewSchedulingService_js__WEBPACK_IMPORTED_MODULE_5__.buildReviewScheduleSnapshot)(verseKeys, masteryMap, reasonCodes, nowIso);
  masteryMap = (0,_LearnerMasteryService_js__WEBPACK_IMPORTED_MODULE_3__.applyAssessmentToMastery)(masteryMap, {
    responses: session.responses,
    skills: session.skills,
    confidence: confidence,
    reasonCodes: reasonCodes,
    nextReviewByKey: reviewSnap.byKey,
    nowIso: nowIso
  });
  (0,_LearnerMasteryService_js__WEBPACK_IMPORTED_MODULE_3__.saveMasteryMap)(masteryMap);
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.MASTERY_UPDATED, {
    keys: verseKeys
  });
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.REVIEW_SCHEDULED, {
    intervalDays: reviewSnap.intervalDays,
    nextReviewAt: reviewSnap.nextReviewAt
  });
  var effectiveness = (0,_RecommendationEffectivenessService_js__WEBPACK_IMPORTED_MODULE_6__.loadEffectivenessState)();
  var policyRec = (0,_RecommendationPolicyService_js__WEBPACK_IMPORTED_MODULE_4__.buildPolicyRecommendation)({
    reasonCodes: reasonCodes,
    confidence: confidence,
    objectiveBand: band,
    skills: session.skills,
    baseRecommendation: opts.baseRecommendation || ((_session$context4 = session.context) === null || _session$context4 === void 0 ? void 0 : _session$context4.baseRecommendation) || null,
    weakAyahs: weakAyahNumbers(session.responses),
    techniqueRank: effectiveness.techniqueScores
  });
  var orderedCodes = function () {
    var primary = (0,_RecommendationPolicyService_js__WEBPACK_IMPORTED_MODULE_4__.selectPrimaryReason)(policyRec.evidence_codes || reasonCodes);
    var rest = (policyRec.evidence_codes || reasonCodes).filter(function (c) {
      return c !== primary;
    });
    return primary ? [primary].concat(_toConsumableArray(rest)) : policyRec.evidence_codes || reasonCodes;
  }();
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.RECOMMENDATION_GENERATED, {
    reasonCodes: orderedCodes,
    primaryAction: policyRec.primary_action
  });
  var result = {
    completedAt: nowIso,
    stoppedEarly: !!session.stoppedEarly,
    questionsAsked: session.questionsAsked,
    objectiveBand: band,
    skills: session.skills,
    skillView: skillView,
    primaryWeakness: primaryWeakness,
    primaryStrength: primaryStrength,
    explanationKey: policyRec.explanation_key,
    reasonCodes: orderedCodes,
    primaryReason: orderedCodes[0] || null,
    recommendation: policyRec,
    review: reviewSnap,
    weakAyahs: weakAyahNumbers(session.responses),
    progressItems: (0,_LearnerMasteryService_js__WEBPACK_IMPORTED_MODULE_3__.toProgressPayload)(masteryMap, verseKeys),
    events: session.events,
    // Snapshot for hybrid server persistence
    snapshot: {
      assessment_id: session.id,
      source_session_id: session.sourceSessionId,
      recommendation_id: session.recommendationId,
      result: band,
      summary: null,
      skills: session.skills,
      skill_view: skillView,
      reason_codes: orderedCodes,
      responses: session.responses.map(function (r) {
        return {
          questionId: r.questionId,
          verseKey: r.verseKey,
          type: r.type,
          difficulty: r.difficulty,
          correct: r.correct,
          partial: r.partial,
          usedHint: r.usedHint,
          responseMs: r.responseMs,
          similarity: r.similarity
        };
      }),
      events: session.events,
      review: reviewSnap,
      policy: {
        goal: policyRec.goal,
        primary_action: policyRec.primary_action,
        explanation_key: policyRec.explanation_key,
        settings: policyRec.settings,
        evidence_codes: orderedCodes
      },
      weak_ayahs: weakAyahNumbers(session.responses),
      assessed_at: nowIso
    }
  };
  session.status = 'completed';
  session.result = result;
  session.currentQuestion = null;
  session.updatedAt = nowIso;
  pushEvent(session, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_EVENTS.ASSESSMENT_COMPLETED, {
    band: band,
    questionsAsked: session.questionsAsked,
    stoppedEarly: session.stoppedEarly
  });
  persistAssessmentSession(session);
  return session;
}
function extractAiFromResponses(responses) {
  var _last$aiResult, _last$aiResult2, _last$aiResult3, _last$aiResult4, _last$aiResult5, _last$aiResult6;
  var aiItems = (responses || []).filter(function (r) {
    return r.aiResult;
  });
  if (!aiItems.length) return null;
  var last = aiItems[aiItems.length - 1];
  return {
    result: ((_last$aiResult = last.aiResult) === null || _last$aiResult === void 0 ? void 0 : _last$aiResult.result) || (last.correct ? 'strong' : last.partial ? 'mixed' : 'weak'),
    missed_words: ((_last$aiResult2 = last.aiResult) === null || _last$aiResult2 === void 0 ? void 0 : _last$aiResult2.omissions) || ((_last$aiResult3 = last.aiResult) === null || _last$aiResult3 === void 0 ? void 0 : _last$aiResult3.missed_words) || 0,
    pronunciation_issues: !!((_last$aiResult4 = last.aiResult) !== null && _last$aiResult4 !== void 0 && _last$aiResult4.pronunciation_issues) || !!((_last$aiResult5 = last.aiResult) !== null && _last$aiResult5 !== void 0 && _last$aiResult5.hesitation),
    hesitation: (_last$aiResult6 = last.aiResult) !== null && _last$aiResult6 !== void 0 && _last$aiResult6.hesitation ? 1 : 0
  };
}
function weakAyahNumbers(responses) {
  var counts = new Map();
  var _iterator2 = _createForOfIteratorHelper(responses || []),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var r = _step2.value;
      if (r.correct) continue;
      var ayah = Number(String(r.verseKey || '').split(':')[1] || 0);
      if (!ayah) continue;
      counts.set(ayah, (counts.get(ayah) || 0) + 1);
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return _toConsumableArray(counts.entries()).sort(function (a, b) {
    return b[1] - a[1];
  }).map(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 1),
      ayah = _ref4[0];
    return ayah;
  });
}

/**
 * Build the beginner-friendly result view model for the completion modal.
 * Avoids making a generic percentage the main result.
 *
 * @param {object} session
 * @param {(key: string, params?: object) => string} [t]
 */
function buildAssessmentResultViewModel(session) {
  var _result$primaryWeakne, _result$primaryWeakne2, _result$primaryStreng, _result$primaryStreng2, _result$recommendatio, _result$recommendatio2, _result$primaryWeakne3, _result$snapshot, _result$recommendatio3, _result$recommendatio4, _result$review$interv, _result$review;
  var t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var result = session === null || session === void 0 ? void 0 : session.result;
  if (!result) return null;
  var translate = function translate(key, fallback, params) {
    if (!t) return fallback;
    var value = t("memorisation.postSession.adaptiveCheck.".concat(key), params);
    if (!value || value.includes('adaptiveCheck.')) return fallback;
    return value;
  };
  var weaknessLabel = translate("skills.".concat((_result$primaryWeakne = result.primaryWeakness) === null || _result$primaryWeakne === void 0 ? void 0 : _result$primaryWeakne.key), labelForSkill((_result$primaryWeakne2 = result.primaryWeakness) === null || _result$primaryWeakne2 === void 0 ? void 0 : _result$primaryWeakne2.key));
  var strengthLabel = translate("skills.".concat((_result$primaryStreng = result.primaryStrength) === null || _result$primaryStreng === void 0 ? void 0 : _result$primaryStreng.key), labelForSkill((_result$primaryStreng2 = result.primaryStrength) === null || _result$primaryStreng2 === void 0 ? void 0 : _result$primaryStreng2.key));
  var explanation = translate("explanations.".concat(result.explanationKey), defaultExplanation(result));
  var nextStep = translate("nextSteps.".concat((_result$recommendatio = result.recommendation) === null || _result$recommendatio === void 0 ? void 0 : _result$recommendatio.primary_action), defaultNextStep((_result$recommendatio2 = result.recommendation) === null || _result$recommendatio2 === void 0 ? void 0 : _result$recommendatio2.primary_action));
  var headlineKey = result.objectiveBand === 'strong' ? 'resultTitleStrong' : result.objectiveBand === 'weak' ? 'resultTitleWeak' : 'resultTitleMixed';
  var headline = translate(headlineKey, result.objectiveBand === 'strong' ? 'Looking good' : result.objectiveBand === 'weak' ? 'Needs another short review' : 'A little more practice will help');
  var weakAyahs = Array.isArray(result.weakAyahs) ? result.weakAyahs.filter(Boolean) : [];
  var detail = explanation;
  if (weakAyahs.length === 1) {
    detail = translate('resultWhyWeakAyah', "Verse ".concat(weakAyahs[0], " needs the most attention."), {
      ayah: weakAyahs[0]
    });
  } else if (weakAyahs.length > 1) {
    detail = translate('resultWhyWeakAyahs', "A few verses still need support.", {
      ayahs: weakAyahs.slice(0, 3).join(', '),
      count: weakAyahs.length
    });
  } else if (((_result$primaryWeakne3 = result.primaryWeakness) === null || _result$primaryWeakne3 === void 0 ? void 0 : _result$primaryWeakne3.band) === 'developing' && weaknessLabel) {
    detail = translate('resultWhyWeakness', "".concat(weaknessLabel, " still needs support."), {
      skill: weaknessLabel
    });
  }
  var responses = Array.isArray((_result$snapshot = result.snapshot) === null || _result$snapshot === void 0 ? void 0 : _result$snapshot.responses) ? result.snapshot.responses : [];
  var correctCount = responses.filter(function (r) {
    return r.correct;
  }).length;
  var partialCount = responses.filter(function (r) {
    return !r.correct && r.partial;
  }).length;
  var missedCount = Math.max(0, responses.length - correctCount - partialCount);
  var asked = Number(result.questionsAsked || responses.length || 0);
  var scoreLine = asked > 0 ? translate('resultScoreLine', "{correct} of {total} answered well", {
    correct: correctCount,
    total: asked,
    partial: partialCount,
    missed: missedCount
  }) : '';
  var skillRows = (result.skillView || []).map(function (s) {
    return _objectSpread(_objectSpread({}, s), {}, {
      label: translate("skills.".concat(s.key), labelForSkill(s.key)),
      bandLabel: translate("bands.".concat(s.band), s.band)
    });
  });

  // One short plain summary — no technique jargon dashboard.
  var summary = [detail, nextStep].filter(Boolean).join(' ');
  return {
    headline: headline,
    skillView: skillRows,
    explanation: explanation,
    nextStep: nextStep,
    summary: summary,
    why: detail,
    how: scoreLine,
    should: nextStep,
    strengthLabel: strengthLabel,
    weaknessLabel: weaknessLabel,
    primaryAction: ((_result$recommendatio3 = result.recommendation) === null || _result$recommendatio3 === void 0 ? void 0 : _result$recommendatio3.primary_action) || 'continue',
    primaryActionLabelKey: ((_result$recommendatio4 = result.recommendation) === null || _result$recommendatio4 === void 0 ? void 0 : _result$recommendatio4.primary_action_label_key) || 'continue',
    reasonCodes: result.reasonCodes || [],
    objectiveBand: result.objectiveBand,
    weakAyahs: weakAyahs,
    stoppedEarly: !!result.stoppedEarly,
    questionsAsked: asked,
    quizStats: {
      asked: asked,
      correct: correctCount,
      partial: partialCount,
      missed: missedCount,
      scoreLine: scoreLine
    },
    reviewIntervalDays: (_result$review$interv = (_result$review = result.review) === null || _result$review === void 0 ? void 0 : _result$review.intervalDays) !== null && _result$review$interv !== void 0 ? _result$review$interv : null,
    recommendation: result.recommendation,
    snapshot: result.snapshot,
    progressItems: result.progressItems
  };
}
function labelForSkill(key) {
  switch (key) {
    case 'recall':
      return 'Remembering the words';
    case 'ayahSequence':
      return 'Keeping the order';
    case 'textualPrecision':
      return 'Getting the words right';
    case 'independentRecitation':
      return 'Reciting without help';
    default:
      return key || '';
  }
}
function defaultExplanation(result) {
  if (result.objectiveBand === 'strong') {
    return 'This range feels steady.';
  }
  if (result.objectiveBand === 'weak') {
    return 'This range still needs a calm pass.';
  }
  return 'You are close — a little more support will help.';
}
function defaultNextStep(action) {
  switch (action) {
    case 'repeat_weak_ayahs':
      return 'Repeat the harder verses with more support.';
    case 'start_focused_review':
      return 'Do a short focused review.';
    case 'review_tomorrow':
      return 'Come back for a short review tomorrow.';
    default:
      return 'Continue to the next set.';
  }
}
var AdaptiveAssessmentService = {
  createAssessmentSession: createAssessmentSession,
  persistAssessmentSession: persistAssessmentSession,
  loadAssessmentSession: loadAssessmentSession,
  clearAssessmentSession: clearAssessmentSession,
  startAdaptiveCheck: startAdaptiveCheck,
  presentNextQuestion: presentNextQuestion,
  answerCurrentQuestion: answerCurrentQuestion,
  requestHint: requestHint,
  pauseAssessment: pauseAssessment,
  resumeAssessment: resumeAssessment,
  completeAssessment: completeAssessment,
  buildAssessmentResultViewModel: buildAssessmentResultViewModel
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AdaptiveAssessmentService);

/***/ }),

/***/ "./resources/js/scripts/assessment/AssessmentScoringService.js":
/*!*********************************************************************!*\
  !*** ./resources/js/scripts/assessment/AssessmentScoringService.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AssessmentScoringService: () => (/* binding */ AssessmentScoringService),
/* harmony export */   buildResultSkillView: () => (/* binding */ buildResultSkillView),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   detectReasonCodes: () => (/* binding */ detectReasonCodes),
/* harmony export */   nextDifficulty: () => (/* binding */ nextDifficulty),
/* harmony export */   objectiveBand: () => (/* binding */ objectiveBand),
/* harmony export */   scoreItemResponse: () => (/* binding */ scoreItemResponse),
/* harmony export */   shouldStopEarly: () => (/* binding */ shouldStopEarly),
/* harmony export */   updateSkillEstimates: () => (/* binding */ updateSkillEstimates)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
/* harmony import */ var _QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./QuestionValidationService.js */ "./resources/js/scripts/assessment/QuestionValidationService.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
/**
 * Scores diagnostic skills independently — never collapses to a single stored score.
 */




/**
 * @param {object} question
 * @param {{
 *   answer?: string|string[]|number|null,
 *   usedHint?: boolean,
 *   responseMs?: number,
 *   aiResult?: { result?: string, omissions?: number, insertions?: number, substitutions?: number, hesitation?: boolean, fluency?: number }|null,
 * }} response
 */
function scoreItemResponse(question) {
  var response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var usedHint = !!response.usedHint;
  var responseMs = Number(response.responseMs || 0);
  var slow = responseMs > _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.SLOW_RESPONSE_MS;
  var correct = false;
  var partial = false;
  var similarity = 0;
  var renderer = (question === null || question === void 0 ? void 0 : question.renderer) || 'mcq';
  if (renderer === 'ordering') {
    var expected = Array.isArray(question.expectedOrder) ? question.expectedOrder.map(function (x) {
      return _typeof(x) === 'object' ? x.key || x.label || x.text : x;
    }) : [];
    var answer = Array.isArray(response.answer) ? response.answer.map(function (x) {
      return _typeof(x) === 'object' ? x.key || x.label || x.text : x;
    }) : [];
    var scored = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.scoreOrdering)(answer, expected);
    correct = scored.correct;
    partial = scored.partial;
    similarity = scored.similarity;
  } else if (renderer === 'open') {
    var _scored = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.scoreOpenAnswer)(String(response.answer || ''), String(question.correctAnswer || ''));
    correct = _scored.correct;
    partial = _scored.partial;
    similarity = _scored.similarity;
  } else if (renderer === 'ai_recite') {
    var ai = response.aiResult || {};
    var result = String(ai.result || '').toLowerCase();
    if (result === 'strong') {
      correct = true;
      similarity = 1;
    } else if (result === 'mixed') {
      partial = true;
      similarity = 0.65;
    } else if (result === 'weak') {
      correct = false;
      similarity = 0.3;
    } else if (typeof ai.fluency === 'number') {
      similarity = Math.max(0, Math.min(1, ai.fluency));
      correct = similarity >= 0.85;
      partial = similarity >= 0.55 && !correct;
    }
  } else {
    // mcq / mcq_simple
    if (typeof response.answer === 'number' && Number.isFinite(question.correctIndex)) {
      correct = Number(response.answer) === Number(question.correctIndex);
      similarity = correct ? 1 : 0;
    } else {
      correct = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.textsMatch)(String(response.answer || ''), String(question.correctAnswer || ''));
      similarity = correct ? 1 : 0;
    }
  }
  return {
    correct: correct,
    partial: partial,
    similarity: similarity,
    usedHint: usedHint,
    responseMs: responseMs,
    slow: slow,
    supported: usedHint || slow || partial
  };
}

/**
 * Update running skill estimates (0–1) from one item.
 * Dependency skills increase when the learner relies on support.
 *
 * @param {Record<string, number>} skills
 * @param {object} question
 * @param {ReturnType<typeof scoreItemResponse>} scored
 */
function updateSkillEstimates(skills, question, scored) {
  var next = _objectSpread({}, skills);
  var probed = Array.isArray(question === null || question === void 0 ? void 0 : question.skills) ? question.skills : [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL];
  var alpha = 0.35;
  var target = scored.correct ? 1 : scored.partial ? 0.55 : 0.2;
  var _iterator = _createForOfIteratorHelper(probed),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _next$skill;
      var skill = _step.value;
      if (skill === _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY || skill === _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY || skill === _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AUDIO_DEPENDENCY) {
        continue;
      }
      var prev = clamp01((_next$skill = next[skill]) !== null && _next$skill !== void 0 ? _next$skill : 0.5);
      next[skill] = clamp01(prev + alpha * (target - prev));
    }

    // Dependencies: higher = more dependent (weaker independence)
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  if (scored.usedHint) {
    var _next$SKILLS$HINT_DEP;
    next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY] = clamp01(((_next$SKILLS$HINT_DEP = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY]) !== null && _next$SKILLS$HINT_DEP !== void 0 ? _next$SKILLS$HINT_DEP : 0.3) + 0.15);
  } else if (scored.correct) {
    var _next$SKILLS$HINT_DEP2;
    next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY] = clamp01(((_next$SKILLS$HINT_DEP2 = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY]) !== null && _next$SKILLS$HINT_DEP2 !== void 0 ? _next$SKILLS$HINT_DEP2 : 0.3) - 0.08);
  }
  if ((question === null || question === void 0 ? void 0 : question.hidePercent) >= 50 || (question === null || question === void 0 ? void 0 : question.renderer) === 'open' || question !== null && question !== void 0 && question.requiresAiRecite) {
    if (scored.correct && !scored.usedHint) {
      var _next$SKILLS$VISUAL_T, _next$SKILLS$INDEPEND;
      next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY] = clamp01(((_next$SKILLS$VISUAL_T = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY]) !== null && _next$SKILLS$VISUAL_T !== void 0 ? _next$SKILLS$VISUAL_T : 0.4) - 0.12);
      next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE] = clamp01(((_next$SKILLS$INDEPEND = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE]) !== null && _next$SKILLS$INDEPEND !== void 0 ? _next$SKILLS$INDEPEND : 0.5) + 0.12);
    } else if (!scored.correct) {
      var _next$SKILLS$VISUAL_T2, _next$SKILLS$INDEPEND2;
      next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY] = clamp01(((_next$SKILLS$VISUAL_T2 = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY]) !== null && _next$SKILLS$VISUAL_T2 !== void 0 ? _next$SKILLS$VISUAL_T2 : 0.4) + 0.12);
      next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE] = clamp01(((_next$SKILLS$INDEPEND2 = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE]) !== null && _next$SKILLS$INDEPEND2 !== void 0 ? _next$SKILLS$INDEPEND2 : 0.5) - 0.1);
    }
  }
  if (question !== null && question !== void 0 && question.requiresAiRecite && responseAiWeak(scored, question)) {
    var _next$SKILLS$SPOKEN_R, _next$SKILLS$FLUENCY;
    next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL] = clamp01(((_next$SKILLS$SPOKEN_R = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL]) !== null && _next$SKILLS$SPOKEN_R !== void 0 ? _next$SKILLS$SPOKEN_R : 0.5) - 0.15);
    next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.FLUENCY] = clamp01(((_next$SKILLS$FLUENCY = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.FLUENCY]) !== null && _next$SKILLS$FLUENCY !== void 0 ? _next$SKILLS$FLUENCY : 0.5) - 0.1);
  }
  if (question !== null && question !== void 0 && question.delayed) {
    var _next$SKILLS$DELAYED_, _next$SKILLS$DELAYED_2;
    next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION] = clamp01(((_next$SKILLS$DELAYED_ = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION]) !== null && _next$SKILLS$DELAYED_ !== void 0 ? _next$SKILLS$DELAYED_ : 0.5) + alpha * (target - ((_next$SKILLS$DELAYED_2 = next[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION]) !== null && _next$SKILLS$DELAYED_2 !== void 0 ? _next$SKILLS$DELAYED_2 : 0.5)));
  }
  return next;
}
function responseAiWeak(scored) {
  return !scored.correct && !scored.partial;
}

/**
 * Aggregate skill map into the four result-panel dimensions (labels, not a %).
 * @param {Record<string, number>} skills
 */
function buildResultSkillView() {
  var _skills$SKILLS$AYAH_S, _skills$SKILLS$TEXTUA, _skills$SKILLS$VISUAL;
  var skills = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var recall = average([skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL], skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.BEGINNINGS], skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.ENDINGS]]);
  var ayahSequence = clamp01((_skills$SKILLS$AYAH_S = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE]) !== null && _skills$SKILLS$AYAH_S !== void 0 ? _skills$SKILLS$AYAH_S : 0.5);
  var textualPrecision = clamp01((_skills$SKILLS$TEXTUA = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION]) !== null && _skills$SKILLS$TEXTUA !== void 0 ? _skills$SKILLS$TEXTUA : 0.5);
  var independentRecitation = average([skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE], skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL], 1 - ((_skills$SKILLS$VISUAL = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY]) !== null && _skills$SKILLS$VISUAL !== void 0 ? _skills$SKILLS$VISUAL : 0.4)]);
  var map = {
    recall: recall,
    ayahSequence: ayahSequence,
    textualPrecision: textualPrecision,
    independentRecitation: independentRecitation
  };
  return _constants_js__WEBPACK_IMPORTED_MODULE_0__.RESULT_SKILL_KEYS.map(function (key) {
    return {
      key: key,
      value: map[key],
      band: bandFor(map[key])
    };
  });
}

/**
 * Detect reason codes from session + quiz + AI + confidence evidence.
 * @param {{
 *   skills?: Record<string, number>,
 *   session?: object,
 *   confidence?: string|null,
 *   aiAssessment?: object|null,
 *   responses?: object[],
 *   incomplete?: boolean,
 * }} evidence
 * @returns {string[]}
 */
function detectReasonCodes() {
  var _skills$SKILLS$PHRASE, _skills$SKILLS$AYAH_S2, _skills$SKILLS$HINT_D, _skills$SKILLS$VISUAL2, _skills$SKILLS$AUDIO_, _skills$SKILLS$SPOKEN, _skills$SKILLS$SIMILA, _skills$SKILLS$DELAYE, _skills$SKILLS$PHRASE2;
  var evidence = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var codes = [];
  var skills = evidence.skills || {};
  var session = evidence.session || {};
  var confidence = String(evidence.confidence || '').toLowerCase();
  var ai = evidence.aiAssessment || null;
  var responses = Array.isArray(evidence.responses) ? evidence.responses : [];
  if (evidence.incomplete || session.incomplete || session.completed === false) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE);
  }
  if (((_skills$SKILLS$PHRASE = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL]) !== null && _skills$SKILLS$PHRASE !== void 0 ? _skills$SKILLS$PHRASE : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_RECALL);
  }
  if (((_skills$SKILLS$AYAH_S2 = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE]) !== null && _skills$SKILLS$AYAH_S2 !== void 0 ? _skills$SKILLS$AYAH_S2 : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS);
  }
  if (((_skills$SKILLS$HINT_D = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY]) !== null && _skills$SKILLS$HINT_D !== void 0 ? _skills$SKILLS$HINT_D : 0) > 0.55 || Number(session.hints_used || 0) >= 3) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_HINT_DEPENDENCY);
  }
  if (((_skills$SKILLS$VISUAL2 = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY]) !== null && _skills$SKILLS$VISUAL2 !== void 0 ? _skills$SKILLS$VISUAL2 : 0) > 0.55) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY);
  }
  if (((_skills$SKILLS$AUDIO_ = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AUDIO_DEPENDENCY]) !== null && _skills$SKILLS$AUDIO_ !== void 0 ? _skills$SKILLS$AUDIO_ : 0) > 0.55 || Number(session.replay_ratio || 0) >= 0.6) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.AUDIO_DEPENDENCY);
  }
  if (((_skills$SKILLS$SPOKEN = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL]) !== null && _skills$SKILLS$SPOKEN !== void 0 ? _skills$SKILLS$SPOKEN : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD || ai !== null && ai !== void 0 && ai.pronunciation_issues || Number((ai === null || ai === void 0 ? void 0 : ai.hesitation) || 0) > 0) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SPOKEN_HESITATION);
  }
  if (Number((ai === null || ai === void 0 ? void 0 : ai.missed_words) || 0) > 0 || responses.some(function (r) {
    return r.partial && !r.correct;
  })) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OMISSION_ERRORS);
  }
  if (((_skills$SKILLS$SIMILA = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SIMILAR_AYAH_CONFUSION]) !== null && _skills$SKILLS$SIMILA !== void 0 ? _skills$SKILLS$SIMILA : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SIMILAR_AYAH_CONFUSION);
  }
  if (((_skills$SKILLS$DELAYE = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION]) !== null && _skills$SKILLS$DELAYE !== void 0 ? _skills$SKILLS$DELAYE : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION);
  }
  var strongObjective = _constants_js__WEBPACK_IMPORTED_MODULE_0__.RESULT_SKILL_KEYS.every(function (k) {
    var _view$value;
    var view = buildResultSkillView(skills).find(function (s) {
      return s.key === k;
    });
    return ((_view$value = view === null || view === void 0 ? void 0 : view.value) !== null && _view$value !== void 0 ? _view$value : 0) >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.STRONG_SKILL_THRESHOLD;
  }) || String((ai === null || ai === void 0 ? void 0 : ai.result) || '') === 'strong';
  var weakObjective = ((_skills$SKILLS$PHRASE2 = skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL]) !== null && _skills$SKILLS$PHRASE2 !== void 0 ? _skills$SKILLS$PHRASE2 : 0.5) < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD || String((ai === null || ai === void 0 ? void 0 : ai.result) || '') === 'weak' || responses.filter(function (r) {
    return !r.correct;
  }).length >= Math.ceil(responses.length * 0.5);
  if (strongObjective) codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE);
  if (confidence === 'needs_practice') codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_CONFIDENCE);
  if (confidence === 'confident' && weakObjective) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OVERCONFIDENCE);
  }
  if (Array.isArray(session.overdueKeys) && session.overdueKeys.length) {
    codes.push(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.REVIEW_OVERDUE);
  }
  return _toConsumableArray(new Set(codes));
}

/**
 * Overall objective band for recommendation bridging (not shown as main %).
 * @param {Record<string, number>} skills
 * @returns {'strong'|'mixed'|'weak'}
 */
function objectiveBand() {
  var skills = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var view = buildResultSkillView(skills);
  var avg = average(view.map(function (s) {
    return s.value;
  }));
  if (avg >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.STRONG_SKILL_THRESHOLD) return 'strong';
  if (avg <= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) return 'weak';
  return 'mixed';
}

/**
 * Whether enough evidence exists to stop early.
 * @param {{ responses: object[], skills: Record<string, number>, questionCount: number }} state
 */
function shouldStopEarly() {
  var _state$responses;
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var count = Number(state.questionCount || ((_state$responses = state.responses) === null || _state$responses === void 0 ? void 0 : _state$responses.length) || 0);
  if (count < _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.MIN_QUESTIONS) return false;
  if (count >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.MAX_QUESTIONS) return true;
  var responses = state.responses || [];
  var recent = responses.slice(-3);
  if (recent.length < 3) return false;
  var allStrong = recent.every(function (r) {
    return r.correct && !r.usedHint && !r.slow;
  });
  var allWeak = recent.every(function (r) {
    return !r.correct;
  });
  var skills = state.skills || {};
  var evidence = average([skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL], skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE], skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION], skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE]]);
  if (allStrong && evidence >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.EARLY_STOP_CONFIDENCE) return true;
  if (allWeak && evidence <= 1 - _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.EARLY_STOP_CONFIDENCE) return true;
  return false;
}

/**
 * Next difficulty after a scored response.
 * @param {number} current
 * @param {ReturnType<typeof scoreItemResponse>} scored
 * @param {{ consecutiveErrors?: number }} [meta]
 */
function nextDifficulty(current, scored) {
  var meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var d = Math.max(1, Math.min(4, Number(current) || 2));
  if (scored.correct && !scored.usedHint && !scored.slow) {
    d = Math.min(4, d + 1);
  } else if (!scored.correct) {
    d = Math.max(1, d - 1);
  }
  // maintain on hint/slow correct — no change
  if (Number(meta.consecutiveErrors || 0) >= 2) {
    d = Math.max(1, d - 1);
  }
  return d;
}
function clamp01(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;
}
function average(values) {
  var nums = (values || []).map(Number).filter(function (n) {
    return Number.isFinite(n);
  });
  if (!nums.length) return 0.5;
  return clamp01(nums.reduce(function (a, b) {
    return a + b;
  }, 0) / nums.length);
}
function bandFor(value) {
  if (value >= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.STRONG_SKILL_THRESHOLD) return 'strong';
  if (value <= _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) return 'developing';
  return 'steady';
}
var AssessmentScoringService = {
  scoreItemResponse: scoreItemResponse,
  updateSkillEstimates: updateSkillEstimates,
  buildResultSkillView: buildResultSkillView,
  detectReasonCodes: detectReasonCodes,
  objectiveBand: objectiveBand,
  shouldStopEarly: shouldStopEarly,
  nextDifficulty: nextDifficulty
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AssessmentScoringService);

/***/ }),

/***/ "./resources/js/scripts/assessment/LearnerMasteryService.js":
/*!******************************************************************!*\
  !*** ./resources/js/scripts/assessment/LearnerMasteryService.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LearnerMasteryService: () => (/* binding */ LearnerMasteryService),
/* harmony export */   applyAssessmentToMastery: () => (/* binding */ applyAssessmentToMastery),
/* harmony export */   applySkillUpdate: () => (/* binding */ applySkillUpdate),
/* harmony export */   createDefaultMastery: () => (/* binding */ createDefaultMastery),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   loadMasteryMap: () => (/* binding */ loadMasteryMap),
/* harmony export */   normalizeMastery: () => (/* binding */ normalizeMastery),
/* harmony export */   saveMasteryMap: () => (/* binding */ saveMasteryMap),
/* harmony export */   toProgressPayload: () => (/* binding */ toProgressPayload)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/**
 * Per-user, per-ayah (or range) mastery records.
 * Values are bounded 0–1. Raw evidence is preserved for later recalculation.
 */



function storage() {
  var bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null;
  if (bridge !== null && bridge !== void 0 && bridge.getItem && bridge !== null && bridge !== void 0 && bridge.setItem) return bridge;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}
function clamp01(value) {
  var n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;
}

/**
 * @param {string} key e.g. "2:255"
 */
function createDefaultMastery(key) {
  var nowIso = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date().toISOString();
  var _String$split$map = String(key || '').split(':').map(Number),
    _String$split$map2 = _slicedToArray(_String$split$map, 2),
    surah = _String$split$map2[0],
    ayah = _String$split$map2[1];
  var base = {
    key: String(key || ''),
    surah: Number.isFinite(surah) ? surah : 0,
    ayah: Number.isFinite(ayah) ? ayah : 0,
    recallMastery: 0.5,
    sequenceMastery: 0.5,
    textualPrecision: 0.5,
    spokenAccuracy: 0.5,
    fluency: 0.5,
    independence: 0.5,
    visualDependency: 0.4,
    audioDependency: 0.4,
    hintDependency: 0.3,
    similarAyahMastery: 0.5,
    retentionStrength: 0.5,
    confidenceCalibration: 0.5,
    evidenceConfidence: 0.2,
    lastPractisedAt: null,
    lastTestedAt: null,
    nextReviewAt: nowIso,
    evidence: []
  };
  return base;
}

/**
 * @param {object} record
 */
function normalizeMastery(record) {
  var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var src = record && _typeof(record) === 'object' ? record : {};
  var defaults = createDefaultMastery(key || src.key || '');
  var out = _objectSpread(_objectSpread(_objectSpread({}, defaults), src), {}, {
    key: String(key || src.key || defaults.key)
  });
  var _iterator = _createForOfIteratorHelper(_constants_js__WEBPACK_IMPORTED_MODULE_0__.MASTERY_FIELDS),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _out$field;
      var field = _step.value;
      out[field] = clamp01((_out$field = out[field]) !== null && _out$field !== void 0 ? _out$field : defaults[field]);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  if (!Array.isArray(out.evidence)) out.evidence = [];
  return out;
}

/**
 * @returns {Record<string, object>}
 */
function loadMasteryMap() {
  var store = storage();
  if (!store) return {};
  try {
    var raw = store.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.MASTERY_MAP);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    if (!parsed || _typeof(parsed) !== 'object') return {};
    var out = {};
    for (var _i = 0, _Object$entries = Object.entries(parsed); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      out[key] = normalizeMastery(value, key);
    }
    return out;
  } catch (_unused) {
    return {};
  }
}

/**
 * @param {Record<string, object>} map
 */
function saveMasteryMap(map) {
  var store = storage();
  if (!store) return false;
  try {
    store.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.MASTERY_MAP, JSON.stringify(map || {}));
    return true;
  } catch (_unused2) {
    return false;
  }
}

/**
 * Map assessment skills → mastery fields and merge with EMA.
 *
 * @param {object} existing
 * @param {{
 *   skills: Record<string, number>,
 *   verseKey: string,
 *   evidenceEntry?: object,
 *   confidence?: string|null,
 *   nowIso?: string,
 *   nextReviewAt?: string|null,
 * }} update
 */
function applySkillUpdate(existing) {
  var update = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var key = update.verseKey || (existing === null || existing === void 0 ? void 0 : existing.key) || '';
  var nowIso = update.nowIso || new Date().toISOString();
  var current = normalizeMastery(existing, key);
  var skills = update.skills || {};
  var alpha = 0.4;
  var mapping = [['recallMastery', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL]], ['sequenceMastery', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE]], ['textualPrecision', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION]], ['spokenAccuracy', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL]], ['fluency', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.FLUENCY]], ['independence', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE]], ['visualDependency', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY]], ['audioDependency', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AUDIO_DEPENDENCY]], ['hintDependency', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.HINT_DEPENDENCY]], ['similarAyahMastery', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SIMILAR_AYAH_CONFUSION]], ['retentionStrength', skills[_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION]]];
  for (var _i2 = 0, _mapping = mapping; _i2 < _mapping.length; _i2++) {
    var _mapping$_i = _slicedToArray(_mapping[_i2], 2),
      field = _mapping$_i[0],
      value = _mapping$_i[1];
    if (!Number.isFinite(Number(value))) continue;
    current[field] = clamp01(current[field] + alpha * (Number(value) - current[field]));
  }
  if (update.confidence === 'confident' || update.confidence === 'needs_practice') {
    var objective = average([current.recallMastery, current.sequenceMastery, current.textualPrecision, current.independence]);
    var reported = update.confidence === 'confident' ? 1 : 0.3;
    var gap = 1 - Math.abs(objective - reported);
    current.confidenceCalibration = clamp01(current.confidenceCalibration + alpha * (gap - current.confidenceCalibration));
  }
  current.evidenceConfidence = clamp01(Math.min(1, current.evidenceConfidence + 0.12));
  current.lastTestedAt = nowIso;
  current.lastPractisedAt = nowIso;
  if (update.nextReviewAt) current.nextReviewAt = update.nextReviewAt;
  if (update.evidenceEntry) {
    current.evidence = [].concat(_toConsumableArray(current.evidence || []), [update.evidenceEntry]).slice(-40);
  }
  return current;
}

/**
 * Apply assessment results across touched ayahs.
 * @param {Record<string, object>} map
 * @param {{
 *   responses: object[],
 *   skills: Record<string, number>,
 *   confidence?: string|null,
 *   nextReviewByKey?: Record<string, string>,
 *   nowIso?: string,
 * }} result
 */
function applyAssessmentToMastery(map) {
  var result = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var next = _objectSpread({}, map || {});
  var responses = Array.isArray(result.responses) ? result.responses : [];
  var keys = _toConsumableArray(new Set(responses.map(function (r) {
    var _r$question;
    return r.verseKey || ((_r$question = r.question) === null || _r$question === void 0 ? void 0 : _r$question.verseKey);
  }).filter(Boolean)));
  var nowIso = result.nowIso || new Date().toISOString();
  var _iterator2 = _createForOfIteratorHelper(keys),
    _step2;
  try {
    var _loop = function _loop() {
      var _result$nextReviewByK;
      var key = _step2.value;
      var itemResponses = responses.filter(function (r) {
        var _r$question2;
        return (r.verseKey || ((_r$question2 = r.question) === null || _r$question2 === void 0 ? void 0 : _r$question2.verseKey)) === key;
      });
      next[key] = applySkillUpdate(next[key] || createDefaultMastery(key, nowIso), {
        verseKey: key,
        skills: result.skills || {},
        confidence: result.confidence,
        nowIso: nowIso,
        nextReviewAt: ((_result$nextReviewByK = result.nextReviewByKey) === null || _result$nextReviewByK === void 0 ? void 0 : _result$nextReviewByK[key]) || null,
        evidenceEntry: {
          at: nowIso,
          skills: result.skills || {},
          responses: itemResponses.map(function (r) {
            var _r$question3, _r$question4;
            return {
              type: ((_r$question3 = r.question) === null || _r$question3 === void 0 ? void 0 : _r$question3.type) || r.type,
              correct: !!r.correct,
              partial: !!r.partial,
              usedHint: !!r.usedHint,
              difficulty: ((_r$question4 = r.question) === null || _r$question4 === void 0 ? void 0 : _r$question4.difficulty) || r.difficulty,
              similarity: r.similarity
            };
          }),
          reasonCodes: result.reasonCodes || []
        }
      });
    };
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      _loop();
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return next;
}

/**
 * Convert mastery records into progress API items (hybrid persistence).
 * @param {Record<string, object>} map
 * @param {string[]} keys
 */
function toProgressPayload(map) {
  var keys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var source = map || {};
  var list = keys || Object.keys(source);
  return list.map(function (key) {
    var m = normalizeMastery(source[key], key);
    var masteryLevel = Math.round(average([m.recallMastery, m.sequenceMastery, m.textualPrecision, m.independence]) * 100);
    return {
      surah_number: m.surah,
      ayah_number: m.ayah,
      mastery_level: masteryLevel,
      status: masteryLevel < 25 ? 'reviewing' : masteryLevel >= 80 ? 'mastered' : 'learning',
      metadata: {
        learnerMastery: m,
        next_review: m.nextReviewAt
      }
    };
  }).filter(function (row) {
    return row.surah_number > 0 && row.ayah_number > 0;
  });
}
function average(values) {
  var nums = (values || []).map(Number).filter(function (n) {
    return Number.isFinite(n);
  });
  if (!nums.length) return 0.5;
  return nums.reduce(function (a, b) {
    return a + b;
  }, 0) / nums.length;
}
var LearnerMasteryService = {
  createDefaultMastery: createDefaultMastery,
  normalizeMastery: normalizeMastery,
  loadMasteryMap: loadMasteryMap,
  saveMasteryMap: saveMasteryMap,
  applySkillUpdate: applySkillUpdate,
  applyAssessmentToMastery: applyAssessmentToMastery,
  toProgressPayload: toProgressPayload
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (LearnerMasteryService);

/***/ }),

/***/ "./resources/js/scripts/assessment/QuestionSelectionService.js":
/*!*********************************************************************!*\
  !*** ./resources/js/scripts/assessment/QuestionSelectionService.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuestionSelectionService: () => (/* binding */ QuestionSelectionService),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   pickQuestionType: () => (/* binding */ pickQuestionType),
/* harmony export */   prioritiseVerses: () => (/* binding */ prioritiseVerses),
/* harmony export */   selectNextQuestion: () => (/* binding */ selectNextQuestion),
/* harmony export */   skillsForQuestionType: () => (/* binding */ skillsForQuestionType)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
/* harmony import */ var _QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./QuestionValidationService.js */ "./resources/js/scripts/assessment/QuestionValidationService.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * Selects the minimum relevant question set for the learner.
 * Priority: weak/uncertain → session range → overdue review → strong interleaving.
 */




/**
 * @typedef {{
 *   key: string,
 *   surah: number,
 *   ayah: number,
 *   arabic: string,
 *   surahName?: string,
 * }} VerseRef
 */

/**
 * @param {VerseRef[]} verses
 * @param {{
 *   masteryByKey?: Record<string, object>,
 *   sessionWeakAyahs?: number[],
 *   overdueKeys?: string[],
 *   sessionRange?: { surah: number, from: number, to: number },
 * }} ctx
 * @returns {VerseRef[]}
 */
function prioritiseVerses(verses) {
  var ctx = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var list = Array.isArray(verses) ? _toConsumableArray(verses) : [];
  var mastery = ctx.masteryByKey || {};
  var weakSet = new Set((ctx.sessionWeakAyahs || []).map(Number));
  var overdue = new Set(ctx.overdueKeys || []);
  var range = ctx.sessionRange || null;
  var score = function score(v) {
    var _ref, _m$recallMastery;
    var s = 0;
    var m = mastery[v.key];
    var recall = Number((_ref = (_m$recallMastery = m === null || m === void 0 ? void 0 : m.recallMastery) !== null && _m$recallMastery !== void 0 ? _m$recallMastery : m === null || m === void 0 ? void 0 : m.masteryScore) !== null && _ref !== void 0 ? _ref : 0.5);
    if (weakSet.has(Number(v.ayah))) s += 100;
    if (recall < 0.45) s += 80;
    if (recall < 0.65) s += 40;
    if (overdue.has(v.key)) s += 60;
    if (range && Number(v.surah) === Number(range.surah) && Number(v.ayah) >= Number(range.from) && Number(v.ayah) <= Number(range.to)) {
      s += 30;
    }
    // Slight boost for strong content (interleaving) so it can appear sparsely
    if (recall >= 0.8) s += 5;
    return s;
  };
  return list.sort(function (a, b) {
    return score(b) - score(a);
  });
}

/**
 * Pick one question type for the current difficulty, avoiding recent repeats.
 * @param {number} difficulty
 * @param {string[]} recentTypes
 * @param {() => number} [rng]
 */
function pickQuestionType(difficulty) {
  var recentTypes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var rng = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Math.random;
  var level = Math.max(1, Math.min(4, Number(difficulty) || _constants_js__WEBPACK_IMPORTED_MODULE_0__.DIFFICULTY.GUIDED_RECALL));
  var pool = _toConsumableArray(_constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES_BY_DIFFICULTY[level] || _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES_BY_DIFFICULTY[2]);
  var fresh = pool.filter(function (t) {
    return !recentTypes.includes(t);
  });
  var choices = fresh.length ? fresh : pool;
  // Weight toward simple MCQ so the quick check feels tap-and-go.
  var mcqPreferred = new Set([_constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_WORD_OPTIONS, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SELECT_NEXT_PHRASE, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SURAH_IDENTIFICATION, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.COMPLETE_AYAH_REDUCED, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.PREVIOUS_NEXT_AYAH, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MATCH_BEGINNING_ENDING, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.BEGINNING_END_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_AYAH, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.HARAKAH_CHECK, _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION]);
  var weighted = [];
  var _iterator = _createForOfIteratorHelper(choices),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var type = _step.value;
      weighted.push(type);
      if (mcqPreferred.has(type)) weighted.push(type, type);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return weighted[Math.floor(rng() * weighted.length)] || _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_WORD_OPTIONS;
}

/**
 * Map question type → primary diagnostic skills probed.
 * @param {string} type
 * @returns {string[]}
 */
function skillsForQuestionType(type) {
  switch (type) {
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SURAH_IDENTIFICATION:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.BEGINNINGS, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_WORD_OPTIONS:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.COMPLETE_AYAH_REDUCED:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.COMPLETE_AYAH_OPEN:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SELECT_NEXT_PHRASE:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.BASIC_PHRASE_ORDERING:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.ARRANGE_AYAH_SEGMENTS:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MATCH_BEGINNING_ENDING:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.BEGINNING_END_RECALL:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.BEGINNINGS, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.ENDINGS];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.PREVIOUS_NEXT_AYAH:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_AYAH:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.CROSS_RANGE_SEQUENCE:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.AYAH_SEQUENCE];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUSHAF_HIDE_PARTIAL:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUSHAF_HIDE_HEAVY:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.VISUAL_TEXT_DEPENDENCY, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.RANDOM_START_CONTINUATION:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.AI_RECITE_NO_TEXT:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.PRONUNCIATION_FLUENCY:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SPOKEN_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.FLUENCY, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.INDEPENDENCE];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.HARAKAH_CHECK:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUTASHABIHAT_COMPARISON:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.SIMILAR_AYAH_CONFUSION, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.TEXTUAL_PRECISION];
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.DELAYED_RECALL:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.DELAYED_RETENTION, _constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL];
    default:
      return [_constants_js__WEBPACK_IMPORTED_MODULE_0__.SKILLS.PHRASE_RECALL];
  }
}

/**
 * Build a single validated question from verified verses.
 *
 * @param {{
 *   verses: VerseRef[],
 *   difficulty: number,
 *   type?: string,
 *   recentTypes?: string[],
 *   masteryByKey?: Record<string, object>,
 *   sessionWeakAyahs?: number[],
 *   overdueKeys?: string[],
 *   sessionRange?: object,
 *   surahCatalog?: { id: number, name: string }[],
 *   rng?: () => number,
 * }} input
 * @returns {object|null}
 */
function selectNextQuestion() {
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var verses = Array.isArray(input.verses) ? input.verses.filter(function (v) {
    return (v === null || v === void 0 ? void 0 : v.arabic) && (v === null || v === void 0 ? void 0 : v.key);
  }) : [];
  if (!verses.length) return null;
  var rng = typeof input.rng === 'function' ? input.rng : Math.random;
  var difficulty = Math.max(1, Math.min(4, Number(input.difficulty) || _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_LIMITS.START_DIFFICULTY));
  var prioritized = prioritiseVerses(verses, input);
  var type = input.type || pickQuestionType(difficulty, input.recentTypes || [], rng);

  // Try up to a few target verses until a valid question builds
  for (var attempt = 0; attempt < Math.min(6, prioritized.length); attempt += 1) {
    var target = prioritized[attempt];
    var built = buildQuestionForType({
      type: type,
      target: target,
      verses: prioritized,
      difficulty: difficulty,
      surahCatalog: input.surahCatalog || [],
      rng: rng
    });
    if (built) return built;
  }

  // Fallback: simple missing-word on the top priority verse
  var fallbackTarget = prioritized[0];
  return buildQuestionForType({
    type: _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_WORD_OPTIONS,
    target: fallbackTarget,
    verses: prioritized,
    difficulty: _constants_js__WEBPACK_IMPORTED_MODULE_0__.DIFFICULTY.RECOGNITION,
    surahCatalog: input.surahCatalog || [],
    rng: rng
  });
}

/**
 * @param {{
 *   type: string,
 *   target: VerseRef,
 *   verses: VerseRef[],
 *   difficulty: number,
 *   surahCatalog: { id: number, name: string }[],
 *   rng: () => number,
 * }} args
 */
function buildQuestionForType(args) {
  var type = args.type,
    target = args.target,
    verses = args.verses,
    difficulty = args.difficulty,
    surahCatalog = args.surahCatalog,
    rng = args.rng;
  if (!(target !== null && target !== void 0 && target.arabic)) return null;
  var poolTexts = verses.map(function (v) {
    return v.arabic;
  });
  var tokens = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.tokenizeVerifiedText)(target.arabic);
  var base = {
    id: "q_".concat(target.key, "_").concat(type, "_").concat(Date.now()),
    type: type,
    difficulty: difficulty,
    skills: skillsForQuestionType(type),
    verseKey: target.key,
    surah: Number(target.surah),
    ayah: Number(target.ayah),
    prompt: '',
    promptHtml: null,
    options: null,
    correctAnswer: null,
    correctIndex: null,
    segments: null,
    expectedOrder: null,
    hidePercent: null,
    requiresAiRecite: false,
    renderer: 'mcq',
    hint: null
  };
  switch (type) {
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SURAH_IDENTIFICATION:
      {
        var correctName = target.surahName || "Surah ".concat(target.surah);
        var names = new Set([correctName]);
        var _iterator2 = _createForOfIteratorHelper(surahCatalog),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var s = _step2.value;
            if (names.size >= 4) break;
            if (Number(s.id) !== Number(target.surah) && s.name) names.add(s.name);
          }
          // Pad from nearby surah numbers if catalog is thin
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
        var n = Number(target.surah);
        while (names.size < 4 && n > 1) {
          n -= 1;
          names.add("Surah ".concat(n));
        }
        n = Number(target.surah);
        while (names.size < 4 && n < 114) {
          n += 1;
          names.add("Surah ".concat(n));
        }
        var options = _toConsumableArray(names);
        for (var i = options.length - 1; i > 0; i -= 1) {
          var j = Math.floor(rng() * (i + 1));
          var _ref2 = [options[j], options[i]];
          options[i] = _ref2[0];
          options[j] = _ref2[1];
        }
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Which surah is this from?',
          promptHtml: target.arabic,
          options: options,
          correctAnswer: correctName,
          correctIndex: options.findIndex(function (o) {
            return o === correctName;
          }),
          renderer: 'mcq'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_WORD_OPTIONS:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.COMPLETE_AYAH_REDUCED:
      {
        if (tokens.length < 3) return null;
        var idx = Math.max(1, Math.min(tokens.length - 2, Math.floor(rng() * (tokens.length - 2)) + 1));
        var missing = tokens[idx];
        var promptTokens = tokens.map(function (t, i) {
          return i === idx ? '____' : t;
        });
        var built = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildDistractors)({
          correct: missing,
          poolTexts: poolTexts,
          mode: 'token',
          count: type === _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.COMPLETE_AYAH_REDUCED ? 3 : 4,
          rng: rng
        });
        if (!built.valid) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Which word is missing?',
          promptHtml: promptTokens.join(' '),
          options: built.options,
          correctAnswer: missing,
          correctIndex: built.correctIndex,
          renderer: 'mcq',
          hint: tokens.slice(Math.max(0, idx - 1), idx).join(' ')
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SELECT_NEXT_PHRASE:
      {
        var phrases = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.splitIntoPhrases)(target.arabic, 3);
        if (phrases.length < 2) return null;
        var correct = phrases[1];
        var _built = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildDistractors)({
          correct: correct,
          poolTexts: poolTexts,
          mode: 'phrase',
          count: 4,
          rng: rng
        });
        if (!_built.valid) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'What comes next?',
          promptHtml: phrases[0],
          options: _built.options,
          correctAnswer: correct,
          correctIndex: _built.correctIndex,
          renderer: 'mcq'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.BASIC_PHRASE_ORDERING:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.ARRANGE_AYAH_SEGMENTS:
      {
        var _phrases = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.splitIntoPhrases)(target.arabic, 3);
        if (_phrases.length < 2) return null;
        var shuffled = _toConsumableArray(_phrases);
        for (var _i = shuffled.length - 1; _i > 0; _i -= 1) {
          var _j = Math.floor(rng() * (_i + 1));
          var _ref3 = [shuffled[_j], shuffled[_i]];
          shuffled[_i] = _ref3[0];
          shuffled[_j] = _ref3[1];
        }
        // Ensure not already correct
        if (shuffled.every(function (p, i) {
          return p === _phrases[i];
        })) {
          if (shuffled.length >= 2) {
            var _ref4 = [shuffled[1], shuffled[0]];
            shuffled[0] = _ref4[0];
            shuffled[1] = _ref4[1];
          }
        }
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Put these in order',
          promptHtml: null,
          segments: shuffled,
          expectedOrder: _phrases,
          correctAnswer: _phrases.join(' | '),
          renderer: 'ordering'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MATCH_BEGINNING_ENDING:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.BEGINNING_END_RECALL:
      {
        if (tokens.length < 4) return null;
        var beginning = tokens.slice(0, Math.min(3, Math.ceil(tokens.length / 3))).join(' ');
        var ending = tokens.slice(-Math.min(3, Math.ceil(tokens.length / 3))).join(' ');
        var _built2 = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildDistractors)({
          correct: ending,
          poolTexts: poolTexts,
          mode: 'phrase',
          count: 4,
          rng: rng
        });
        if (!_built2.valid) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'How does this ayah end?',
          promptHtml: beginning + ' …',
          options: _built2.options,
          correctAnswer: ending,
          correctIndex: _built2.correctIndex,
          renderer: 'mcq'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.PREVIOUS_NEXT_AYAH:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MISSING_AYAH:
      {
        var _idx = verses.findIndex(function (v) {
          return v.key === target.key;
        });
        var next = verses[_idx + 1] || verses[_idx - 1];
        if (!next) return null;
        var askNext = type === _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.PREVIOUS_NEXT_AYAH || !verses[_idx - 1];
        var neighbour = askNext ? verses[_idx + 1] : verses[_idx - 1];
        if (!neighbour) return null;
        var _built3 = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildDistractors)({
          correct: neighbour.arabic,
          poolTexts: poolTexts,
          mode: 'full',
          count: 4,
          rng: rng
        });
        if (!_built3.valid) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: askNext ? 'Which ayah comes next?' : 'Which ayah comes before?',
          promptHtml: target.arabic,
          options: _built3.options,
          correctAnswer: neighbour.arabic,
          correctIndex: _built3.correctIndex,
          verseKey: neighbour.key,
          ayah: Number(neighbour.ayah),
          renderer: 'mcq'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUSHAF_HIDE_PARTIAL:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUSHAF_HIDE_HEAVY:
      {
        var hidePercent = type === _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUSHAF_HIDE_HEAVY ? rng() > 0.5 ? 100 : 75 : rng() > 0.5 ? 50 : 25;
        var hide = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildMushafHidePrompt)(target.arabic, hidePercent, rng);
        if (!hide.hiddenTokens.length) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'What are the hidden words?',
          promptHtml: hide.promptTokens.join(' '),
          hidePercent: hidePercent,
          correctAnswer: hide.original,
          hiddenTokens: hide.hiddenTokens,
          renderer: hidePercent >= 75 ? 'open' : 'open',
          hint: hidePercent <= 50 ? hide.hiddenTokens[0] : null
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.COMPLETE_AYAH_OPEN:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.RANDOM_START_CONTINUATION:
      {
        if (tokens.length < 4) return null;
        var startCount = Math.max(1, Math.floor(tokens.length * 0.35));
        var start = tokens.slice(0, startCount).join(' ');
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Continue from memory',
          promptHtml: start + ' …',
          correctAnswer: tokens.join(' '),
          renderer: 'open',
          hint: tokens[startCount] || null
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.AI_RECITE_NO_TEXT:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.PRONUNCIATION_FLUENCY:
      {
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Recite this ayah from memory',
          promptHtml: null,
          correctAnswer: target.arabic,
          requiresAiRecite: true,
          renderer: 'ai_recite',
          hint: tokens.slice(0, 2).join(' ')
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.HARAKAH_CHECK:
      {
        // Simpler renderer: show undiacritized options vs verified original snippet
        if (tokens.length < 2) return null;
        var focus = tokens[Math.floor(rng() * tokens.length)];
        var _built4 = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildDistractors)({
          correct: focus,
          poolTexts: poolTexts,
          mode: 'token',
          count: 3,
          rng: rng
        });
        if (!_built4.valid) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Which word is correct?',
          promptHtml: target.arabic,
          options: _built4.options,
          correctAnswer: focus,
          correctIndex: _built4.correctIndex,
          renderer: 'mcq_simple'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.MUTASHABIHAT_COMPARISON:
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION:
      {
        var others = verses.filter(function (v) {
          return v.key !== target.key;
        });
        if (!others.length) return null;
        var similar = others[Math.floor(rng() * others.length)];
        var _options = [target.arabic, similar.arabic];
        // Add more distractors if available
        var _iterator3 = _createForOfIteratorHelper(others),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var v = _step3.value;
            if (_options.length >= 4) break;
            if (!_options.includes(v.arabic)) _options.push(v.arabic);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
        for (var _i2 = _options.length - 1; _i2 > 0; _i2 -= 1) {
          var _j2 = Math.floor(rng() * (_i2 + 1));
          var _ref5 = [_options[_j2], _options[_i2]];
          _options[_i2] = _ref5[0];
          _options[_j2] = _ref5[1];
        }
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Which ayah matches?',
          promptHtml: (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.tokenizeVerifiedText)(target.arabic).slice(0, 3).join(' ') + ' …',
          options: _options,
          correctAnswer: target.arabic,
          correctIndex: _options.findIndex(function (o) {
            return o === target.arabic;
          }),
          renderer: 'mcq_simple'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.CROSS_RANGE_SEQUENCE:
      {
        if (verses.length < 3) return null;
        var slice = verses.slice(0, Math.min(4, verses.length));
        var keys = slice.map(function (v) {
          return v.key;
        });
        var _shuffled = _toConsumableArray(keys);
        for (var _i3 = _shuffled.length - 1; _i3 > 0; _i3 -= 1) {
          var _j3 = Math.floor(rng() * (_i3 + 1));
          var _ref6 = [_shuffled[_j3], _shuffled[_i3]];
          _shuffled[_i3] = _ref6[0];
          _shuffled[_j3] = _ref6[1];
        }
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Put these ayahs in order',
          segments: _shuffled.map(function (k) {
            var v = slice.find(function (x) {
              return x.key === k;
            });
            return {
              key: k,
              label: "".concat(k),
              text: (v === null || v === void 0 ? void 0 : v.arabic) || ''
            };
          }),
          expectedOrder: keys,
          correctAnswer: keys.join(','),
          renderer: 'ordering'
        });
      }
    case _constants_js__WEBPACK_IMPORTED_MODULE_0__.QUESTION_TYPES.DELAYED_RECALL:
      {
        if (tokens.length < 3) return null;
        var _missing = tokens[Math.floor(tokens.length / 2)];
        var _built5 = (0,_QuestionValidationService_js__WEBPACK_IMPORTED_MODULE_1__.buildDistractors)({
          correct: _missing,
          poolTexts: poolTexts,
          mode: 'token',
          count: 4,
          rng: rng
        });
        if (!_built5.valid) return null;
        return _objectSpread(_objectSpread({}, base), {}, {
          prompt: 'Which word belongs here?',
          promptHtml: tokens.map(function (t, i) {
            return i === Math.floor(tokens.length / 2) ? '____' : t;
          }).join(' '),
          options: _built5.options,
          correctAnswer: _missing,
          correctIndex: _built5.correctIndex,
          renderer: 'mcq_simple',
          delayed: true
        });
      }
    default:
      return null;
  }
}
var QuestionSelectionService = {
  prioritiseVerses: prioritiseVerses,
  pickQuestionType: pickQuestionType,
  skillsForQuestionType: skillsForQuestionType,
  selectNextQuestion: selectNextQuestion
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (QuestionSelectionService);

/***/ }),

/***/ "./resources/js/scripts/assessment/QuestionValidationService.js":
/*!**********************************************************************!*\
  !*** ./resources/js/scripts/assessment/QuestionValidationService.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   QuestionValidationService: () => (/* binding */ QuestionValidationService),
/* harmony export */   buildDistractors: () => (/* binding */ buildDistractors),
/* harmony export */   buildMushafHidePrompt: () => (/* binding */ buildMushafHidePrompt),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   normalizeQuranText: () => (/* binding */ normalizeQuranText),
/* harmony export */   scoreOpenAnswer: () => (/* binding */ scoreOpenAnswer),
/* harmony export */   scoreOrdering: () => (/* binding */ scoreOrdering),
/* harmony export */   splitIntoPhrases: () => (/* binding */ splitIntoPhrases),
/* harmony export */   textsMatch: () => (/* binding */ textsMatch),
/* harmony export */   tokenizeVerifiedText: () => (/* binding */ tokenizeVerifiedText),
/* harmony export */   validateUniqueCorrect: () => (/* binding */ validateUniqueCorrect)
/* harmony export */ });
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * Validates answers and builds distractors only from verified Qur'an tokens/phrases.
 * Never invents, rewrites, or verifies Qur'anic wording via generative AI.
 */

var TASHKEEL_RE = /[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g;
var NON_LETTER_RE = /(?:[\0-\x08\x0E-\x1F!-\/:-@\[-`\{-\x9F\xA1-\xA9\xAB-\xB1\xB4\xB6-\xB8\xBB\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u036F\u0375\u0378\u0379\u037E\u0380-\u0385\u0387\u038B\u038D\u03A2\u03F6\u0482-\u0489\u0530\u0557\u0558\u055A-\u055F\u0589-\u05CF\u05EB-\u05EE\u05F3-\u061F\u064B-\u065F\u066A-\u066D\u0670\u06D4\u06D6-\u06E4\u06E7-\u06ED\u06FD\u06FE\u0700-\u070F\u0711\u0730-\u074C\u07A6-\u07B0\u07B2-\u07BF\u07EB-\u07F3\u07F6-\u07F9\u07FB-\u07FF\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u083F\u0859-\u085F\u086B-\u086F\u0888\u0890-\u089F\u08CA-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962-\u0965\u0970\u0981-\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA-\u09BC\u09BE-\u09CD\u09CF-\u09DB\u09DE\u09E2-\u09E5\u09F2\u09F3\u09FA\u09FB\u09FD-\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A-\u0A58\u0A5D\u0A5F-\u0A65\u0A70\u0A71\u0A75-\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA-\u0ABC\u0ABE-\u0ACF\u0AD1-\u0ADF\u0AE2-\u0AE5\u0AF0-\u0AF8\u0AFA-\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A-\u0B3C\u0B3E-\u0B5B\u0B5E\u0B62-\u0B65\u0B70\u0B78-\u0B82\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BCF\u0BD1-\u0BE5\u0BF3-\u0C04\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C3E-\u0C57\u0C5B\u0C5E\u0C5F\u0C62-\u0C65\u0C70-\u0C77\u0C7F\u0C81-\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA-\u0CBC\u0CBE-\u0CDB\u0CDF\u0CE2-\u0CE5\u0CF0\u0CF3-\u0D03\u0D0D\u0D11\u0D3B\u0D3C\u0D3E-\u0D4D\u0D4F-\u0D53\u0D57\u0D62-\u0D65\u0D79\u0D80-\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DE5\u0DF0-\u0E00\u0E31\u0E34-\u0E3F\u0E47-\u0E4F\u0E5A-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EB1\u0EB4-\u0EBC\u0EBE\u0EBF\u0EC5\u0EC7-\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F01-\u0F1F\u0F34-\u0F3F\u0F48\u0F6D-\u0F87\u0F8D-\u0FFF\u102B-\u103E\u104A-\u104F\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109F\u10C6\u10C8-\u10CC\u10CE\u10CF\u10FB\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B-\u1368\u137D-\u137F\u1390-\u139F\u13F6\u13F7\u13FE-\u1400\u166D\u166E\u169B-\u169F\u16EB-\u16ED\u16F9-\u16FF\u1712-\u171E\u1732-\u173F\u1752-\u175F\u176D\u1771-\u177F\u17B4-\u17D6\u17D8-\u17DB\u17DD-\u17DF\u17EA-\u17EF\u17FA-\u180F\u181A-\u181F\u1879-\u187F\u1885\u1886\u18A9\u18AB-\u18AF\u18F6-\u18FF\u191F-\u1945\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19FF\u1A17-\u1A1F\u1A55-\u1A7F\u1A8A-\u1A8F\u1A9A-\u1AA6\u1AA8-\u1B04\u1B34-\u1B44\u1B4D-\u1B4F\u1B5A-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BFF\u1C24-\u1C3F\u1C4A-\u1C4C\u1C7E\u1C7F\u1C8B-\u1C8F\u1CBB\u1CBC\u1CC0-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1CFB-\u1CFF\u1DC0-\u1DFF\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FBD\u1FBF-\u1FC1\u1FC5\u1FCD-\u1FCF\u1FD4\u1FD5\u1FDC-\u1FDF\u1FED-\u1FF1\u1FF5\u1FFD-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u206F\u2072\u2073\u207A-\u207E\u208A-\u208F\u209D-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A-\u245F\u249C-\u24E9\u2500-\u2775\u2794-\u2BFF\u2CE5-\u2CEA\u2CEF-\u2CF1\u2CF4-\u2CFC\u2CFE\u2CFF\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D70-\u2D7F\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF-\u2E2E\u2E30-\u2FFF\u3001-\u3004\u3008-\u3020\u302A-\u3030\u3036\u3037\u303D-\u3040\u3097-\u309C\u30A0\u30FB\u3100-\u3104\u3130\u318F-\u3191\u3196-\u319F\u31C0-\u31EF\u3200-\u321F\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA48D-\uA4CF\uA4FE\uA4FF\uA60D-\uA60F\uA62C-\uA63F\uA66F-\uA67E\uA69E\uA69F\uA6F0-\uA716\uA720\uA721\uA789\uA78A\uA7DD-\uA7F0\uA802\uA806\uA80B\uA823-\uA82F\uA836-\uA83F\uA874-\uA881\uA8B4-\uA8CF\uA8DA-\uA8F1\uA8F8-\uA8FA\uA8FC\uA8FF\uA926-\uA92F\uA947-\uA95F\uA97D-\uA983\uA9B3-\uA9CE\uA9DA-\uA9DF\uA9E5\uA9FF\uAA29-\uAA3F\uAA43\uAA4C-\uAA4F\uAA5A-\uAA5F\uAA77-\uAA79\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAC3-\uAADA\uAADE\uAADF\uAAEB-\uAAF1\uAAF5-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB5B\uAB6A-\uAB6F\uABE3-\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB1E\uFB29\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBB2-\uFBD2\uFD3E-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFC-\uFE6F\uFE75\uFEFD\uFEFE\uFF00-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD06\uDD34-\uDD3F\uDD79-\uDD89\uDD8C-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEE0\uDEFC-\uDEFF\uDF24-\uDF2C\uDF4B-\uDF4F\uDF76-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDD6F\uDD7B\uDD8B\uDD93\uDD96\uDDA2\uDDB2\uDDBA\uDDBD-\uDDBF\uDDF4-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDF7F\uDF86\uDFB1\uDFBB-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56\uDC57\uDC77\uDC78\uDC9F-\uDCA6\uDCB0-\uDCDF\uDCF3\uDCF6-\uDCFA\uDD1C-\uDD1F\uDD3A-\uDD3F\uDD5A-\uDD7F\uDDB8-\uDDBB\uDDD0\uDDD1\uDE01-\uDE0F\uDE14\uDE18\uDE36-\uDE3F\uDE49-\uDE5F\uDE7F\uDEA0-\uDEBF\uDEC8\uDEE5-\uDEEA\uDEF0-\uDEFF\uDF36-\uDF3F\uDF56\uDF57\uDF73-\uDF77\uDF92-\uDFA8\uDFB0-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCF9\uDD24-\uDD2F\uDD3A-\uDD3F\uDD66-\uDD6E\uDD86-\uDE5F\uDE7F\uDEAA-\uDEAF\uDEB2-\uDEC1\uDEC8-\uDEFF\uDF28-\uDF2F\uDF46-\uDF50\uDF55-\uDF6F\uDF82-\uDFAF\uDFCC-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC00-\uDC02\uDC38-\uDC51\uDC70\uDC73\uDC74\uDC76-\uDC82\uDCB0-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDD02\uDD27-\uDD35\uDD40-\uDD43\uDD45\uDD46\uDD48-\uDD4F\uDD73-\uDD75\uDD77-\uDD82\uDDB3-\uDDC0\uDDC5-\uDDCF\uDDDB\uDDDD-\uDDE0\uDDF5-\uDDFF\uDE12\uDE2C-\uDE3E\uDE41-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEDF-\uDEEF\uDEFA-\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A-\uDF3C\uDF3E-\uDF4F\uDF51-\uDF5C\uDF62-\uDF7F\uDF8A\uDF8C\uDF8D\uDF8F\uDFB6\uDFB8-\uDFD0\uDFD2\uDFD4-\uDFFF]|\uD805[\uDC35-\uDC46\uDC4B-\uDC4F\uDC5A-\uDC5E\uDC62-\uDC7F\uDCB0-\uDCC3\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDAF-\uDDD7\uDDDC-\uDDFF\uDE30-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEAB-\uDEB7\uDEB9-\uDEBF\uDECA-\uDECF\uDEE4-\uDEFF\uDF1B-\uDF2F\uDF3C-\uDF3F\uDF47-\uDFFF]|\uD806[\uDC2C-\uDC9F\uDCF3-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD30-\uDD3E\uDD40\uDD42-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD1-\uDDE0\uDDE2\uDDE4-\uDDFF\uDE01-\uDE0A\uDE33-\uDE39\uDE3B-\uDE4F\uDE51-\uDE5B\uDE8A-\uDE9C\uDE9E-\uDEAF\uDEF9-\uDFBF\uDFE1-\uDFEF\uDFFA-\uDFFF]|\uD807[\uDC09\uDC2F-\uDC3F\uDC41-\uDC4F\uDC6D-\uDC71\uDC90-\uDCFF\uDD07\uDD0A\uDD31-\uDD45\uDD47-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8A-\uDD97\uDD99-\uDD9F\uDDAA-\uDDAF\uDDDC-\uDDDF\uDDEA-\uDEDF\uDEF3-\uDF01\uDF03\uDF11\uDF34-\uDF4F\uDF5A-\uDFAF\uDFB1-\uDFBF\uDFD5-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD812-\uD817\uD819\uD824-\uD82A\uD82D\uD82E\uD830-\uD832\uD836\uD83D\uD83F\uD87C\uD87D\uD87F\uD88E-\uDBFF][\uDC00-\uDFFF]|\uD80B[\uDC00-\uDF8F\uDFF1-\uDFFF]|\uD80D[\uDC30-\uDC40\uDC47-\uDC5F]|\uD810[\uDFFB-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD818[\uDC00-\uDCFF\uDD1E-\uDD2F\uDD3A-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDE6F\uDEBF\uDECA-\uDECF\uDEEE-\uDEFF\uDF30-\uDF3F\uDF44-\uDF4F\uDF5A\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDD3F\uDD6D-\uDD6F\uDD7A-\uDE3F\uDE97-\uDE9F\uDEB9\uDEBA\uDED4-\uDEFF\uDF4B-\uDF4F\uDF51-\uDF92\uDFA0-\uDFDF\uDFE2\uDFE4-\uDFF1\uDFF7-\uDFFF]|\uD823[\uDCD6-\uDCFE\uDD1F-\uDD7F\uDDF3-\uDFFF]|\uD82B[\uDC00-\uDFEF\uDFF4\uDFFC\uDFFF]|\uD82C[\uDD23-\uDD31\uDD33-\uDD4F\uDD53\uDD54\uDD56-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDFFF]|\uD833[\uDC00-\uDCEF\uDCFA-\uDFFF]|\uD834[\uDC00-\uDEBF\uDED4-\uDEDF\uDEF4-\uDF5F\uDF79-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD837[\uDC00-\uDEFF\uDF1F-\uDF24\uDF2B-\uDFFF]|\uD838[\uDC00-\uDC2F\uDC6E-\uDCFF\uDD2D-\uDD36\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDE8F\uDEAE-\uDEBF\uDEEC-\uDEEF\uDEFA-\uDFFF]|\uD839[\uDC00-\uDCCF\uDCEC-\uDCEF\uDCFA-\uDDCF\uDDEE\uDDEF\uDDFB-\uDEBF\uDEDF\uDEE3\uDEE6\uDEEE\uDEEF\uDEF5-\uDEFD\uDF00-\uDFDF\uDFE7\uDFEC\uDFEF\uDFFF]|\uD83A[\uDCC5\uDCC6\uDCD0-\uDCFF\uDD44-\uDD4A\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDC70\uDCAC\uDCB0\uDCB5-\uDD00\uDD2E\uDD3E-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDCFF\uDD0D-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEE0-\uDEFF]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEAE\uDEAF]|\uD87A[\uDFE1-\uDFEF]|\uD87B[\uDE5E-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDF4F]|\uD88D[\uDC7A-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/g;

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeQuranText(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(TASHKEEL_RE, '').replace(NON_LETTER_RE, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function tokenizeVerifiedText(text) {
  var normalized = normalizeQuranText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function textsMatch(a, b) {
  return normalizeQuranText(a) === normalizeQuranText(b);
}

/**
 * Split ayah into roughly equal phrase segments from verified tokens.
 * @param {string} text
 * @param {number} [parts=3]
 * @returns {string[]}
 */
function splitIntoPhrases(text) {
  var parts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
  var tokens = tokenizeVerifiedText(text);
  if (!tokens.length) return [];
  var segmentCount = Math.max(2, Math.min(parts, tokens.length));
  var size = Math.ceil(tokens.length / segmentCount);
  var phrases = [];
  for (var i = 0; i < tokens.length; i += size) {
    phrases.push(tokens.slice(i, i + size).join(' '));
  }
  return phrases.filter(Boolean);
}

/**
 * Build unique distractors from other verified ayah texts in the pool.
 * Guarantees at most one correct option after validation.
 *
 * @param {{
 *   correct: string,
 *   poolTexts: string[],
 *   mode?: 'token'|'phrase'|'full',
 *   count?: number,
 *   rng?: () => number,
 * }} opts
 * @returns {{ options: string[], correctIndex: number, valid: boolean, reason?: string }}
 */
function buildDistractors() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var correctRaw = String(opts.correct || '').trim();
  var correct = normalizeQuranText(correctRaw);
  var count = Math.max(2, Math.min(6, Number(opts.count) || 4));
  var mode = opts.mode || 'phrase';
  var rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  var pool = Array.isArray(opts.poolTexts) ? opts.poolTexts : [];
  if (!correct) {
    return {
      options: [],
      correctIndex: -1,
      valid: false,
      reason: 'empty_correct'
    };
  }

  /** @type {Set<string>} */
  var candidates = new Set();
  var _iterator = _createForOfIteratorHelper(pool),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var raw = _step.value;
      var text = String(raw || '');
      if (!text.trim()) continue;
      if (mode === 'token') {
        var _iterator2 = _createForOfIteratorHelper(tokenizeVerifiedText(text)),
          _step2;
        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var token = _step2.value;
            if (token && normalizeQuranText(token) !== correct) candidates.add(token);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      } else if (mode === 'full') {
        var n = normalizeQuranText(text);
        if (n && n !== correct) candidates.add(text.trim());
      } else {
        var _iterator3 = _createForOfIteratorHelper(splitIntoPhrases(text, 3)),
          _step3;
        try {
          for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
            var phrase = _step3.value;
            if (normalizeQuranText(phrase) !== correct) candidates.add(phrase);
          }
        } catch (err) {
          _iterator3.e(err);
        } finally {
          _iterator3.f();
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var distractors = [];
  var list = _toConsumableArray(candidates);
  var _loop = function _loop() {
      var idx = Math.floor(rng() * list.length);
      var _list$splice = list.splice(idx, 1),
        _list$splice2 = _slicedToArray(_list$splice, 1),
        picked = _list$splice2[0];
      var norm = normalizeQuranText(picked);
      if (!norm || norm === correct) return 0; // continue
      if (distractors.some(function (d) {
        return normalizeQuranText(d) === norm;
      })) return 0; // continue
      distractors.push(picked);
    },
    _ret;
  while (distractors.length < count - 1 && list.length) {
    _ret = _loop();
    if (_ret === 0) continue;
  }
  if (distractors.length < 1) {
    return {
      options: [],
      correctIndex: -1,
      valid: false,
      reason: 'insufficient_distractors'
    };
  }
  var options = [correctRaw || correct].concat(distractors);
  // Shuffle
  for (var i = options.length - 1; i > 0; i -= 1) {
    var j = Math.floor(rng() * (i + 1));
    var _ref = [options[j], options[i]];
    options[i] = _ref[0];
    options[j] = _ref[1];
  }
  var validation = validateUniqueCorrect(options, correct);
  if (!validation.valid) {
    return {
      options: [],
      correctIndex: -1,
      valid: false,
      reason: validation.reason
    };
  }
  return {
    options: options,
    correctIndex: validation.correctIndex,
    valid: true
  };
}

/**
 * Ensure exactly one option matches the correct answer after normalisation.
 * @param {string[]} options
 * @param {string} correctNormalized
 */
function validateUniqueCorrect(options, correctNormalized) {
  var correct = normalizeQuranText(correctNormalized);
  if (!correct || !Array.isArray(options) || options.length < 2) {
    return {
      valid: false,
      correctIndex: -1,
      reason: 'invalid_options'
    };
  }
  var matches = [];
  var seen = new Set();
  for (var i = 0; i < options.length; i += 1) {
    var n = normalizeQuranText(options[i]);
    if (!n) {
      return {
        valid: false,
        correctIndex: -1,
        reason: 'empty_option'
      };
    }
    if (seen.has(n)) {
      return {
        valid: false,
        correctIndex: -1,
        reason: 'duplicate_option'
      };
    }
    seen.add(n);
    if (n === correct) matches.push(i);
  }
  if (matches.length !== 1) {
    return {
      valid: false,
      correctIndex: -1,
      reason: matches.length === 0 ? 'no_correct' : 'ambiguous_correct'
    };
  }
  return {
    valid: true,
    correctIndex: matches[0],
    reason: null
  };
}

/**
 * Score an open (typed) answer against verified text.
 * @param {string} answer
 * @param {string} expected
 * @returns {{ correct: boolean, partial: boolean, similarity: number }}
 */
function scoreOpenAnswer(answer, expected) {
  var a = normalizeQuranText(answer);
  var e = normalizeQuranText(expected);
  if (!e) return {
    correct: false,
    partial: false,
    similarity: 0
  };
  if (!a) return {
    correct: false,
    partial: false,
    similarity: 0
  };
  if (a === e) return {
    correct: true,
    partial: false,
    similarity: 1
  };
  var aTokens = a.split(' ').filter(Boolean);
  var eTokens = e.split(' ').filter(Boolean);
  if (!eTokens.length) return {
    correct: false,
    partial: false,
    similarity: 0
  };
  var hit = 0;
  var used = new Set();
  var _iterator4 = _createForOfIteratorHelper(aTokens),
    _step4;
  try {
    var _loop2 = function _loop2() {
      var token = _step4.value;
      var idx = eTokens.findIndex(function (t, i) {
        return !used.has(i) && t === token;
      });
      if (idx >= 0) {
        used.add(idx);
        hit += 1;
      }
    };
    for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
      _loop2();
    }
  } catch (err) {
    _iterator4.e(err);
  } finally {
    _iterator4.f();
  }
  var similarity = hit / eTokens.length;
  return {
    correct: similarity >= 0.92,
    partial: similarity >= 0.55 && similarity < 0.92,
    similarity: Math.round(similarity * 100) / 100
  };
}

/**
 * Validate ordered segments against verified phrase order.
 * @param {string[]} answerOrder
 * @param {string[]} expectedOrder
 */
function scoreOrdering(answerOrder, expectedOrder) {
  var expected = (expectedOrder || []).map(normalizeQuranText);
  var answer = (answerOrder || []).map(normalizeQuranText);
  if (!expected.length || answer.length !== expected.length) {
    return {
      correct: false,
      partial: false,
      similarity: 0
    };
  }
  var correctPositions = 0;
  for (var i = 0; i < expected.length; i += 1) {
    if (answer[i] === expected[i]) correctPositions += 1;
  }
  var similarity = correctPositions / expected.length;
  return {
    correct: similarity === 1,
    partial: similarity >= 0.5 && similarity < 1,
    similarity: Math.round(similarity * 100) / 100
  };
}

/**
 * Hide a percentage of tokens for Mushaf-hide questions (from verified text only).
 * @param {string} text
 * @param {number} hidePercent 25|50|75|100
 * @param {() => number} [rng]
 */
function buildMushafHidePrompt(text) {
  var hidePercent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 50;
  var rng = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Math.random;
  var tokens = tokenizeVerifiedText(text);
  if (!tokens.length) {
    return {
      promptTokens: [],
      hiddenIndexes: [],
      hidePercent: 0,
      original: ''
    };
  }
  var pct = [25, 50, 75, 100].includes(Number(hidePercent)) ? Number(hidePercent) : 50;
  var hideCount = pct === 100 ? tokens.length : Math.max(1, Math.round(tokens.length * pct / 100));
  var indexes = tokens.map(function (_, i) {
    return i;
  });
  var hiddenIndexes = [];
  while (hiddenIndexes.length < hideCount && indexes.length) {
    var idx = Math.floor(rng() * indexes.length);
    hiddenIndexes.push(indexes.splice(idx, 1)[0]);
  }
  hiddenIndexes.sort(function (a, b) {
    return a - b;
  });
  var promptTokens = tokens.map(function (token, i) {
    return hiddenIndexes.includes(i) ? '____' : token;
  });
  return {
    promptTokens: promptTokens,
    hiddenIndexes: hiddenIndexes,
    hidePercent: pct,
    original: tokens.join(' '),
    hiddenTokens: hiddenIndexes.map(function (i) {
      return tokens[i];
    })
  };
}
var QuestionValidationService = {
  normalizeQuranText: normalizeQuranText,
  tokenizeVerifiedText: tokenizeVerifiedText,
  textsMatch: textsMatch,
  splitIntoPhrases: splitIntoPhrases,
  buildDistractors: buildDistractors,
  validateUniqueCorrect: validateUniqueCorrect,
  scoreOpenAnswer: scoreOpenAnswer,
  scoreOrdering: scoreOrdering,
  buildMushafHidePrompt: buildMushafHidePrompt
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (QuestionValidationService);

/***/ }),

/***/ "./resources/js/scripts/assessment/RecommendationEffectivenessService.js":
/*!*******************************************************************************!*\
  !*** ./resources/js/scripts/assessment/RecommendationEffectivenessService.js ***!
  \*******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RecommendationEffectivenessService: () => (/* binding */ RecommendationEffectivenessService),
/* harmony export */   computeDeltas: () => (/* binding */ computeDeltas),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   loadEffectivenessState: () => (/* binding */ loadEffectivenessState),
/* harmony export */   recordEffectiveness: () => (/* binding */ recordEffectiveness),
/* harmony export */   saveEffectivenessState: () => (/* binding */ saveEffectivenessState)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
/**
 * Tracks whether recommendations improved performance and ranks techniques per learner.
 */


function storage() {
  var bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null;
  if (bridge !== null && bridge !== void 0 && bridge.getItem && bridge !== null && bridge !== void 0 && bridge.setItem) return bridge;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

/**
 * @returns {{
 *   techniqueScores: Record<string, number>,
 *   history: object[],
 * }}
 */
function loadEffectivenessState() {
  var store = storage();
  if (!store) return {
    techniqueScores: {},
    history: []
  };
  try {
    var raw = store.getItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.EFFECTIVENESS);
    if (!raw) return {
      techniqueScores: {},
      history: []
    };
    var parsed = JSON.parse(raw);
    return {
      techniqueScores: parsed !== null && parsed !== void 0 && parsed.techniqueScores && _typeof(parsed.techniqueScores) === 'object' ? parsed.techniqueScores : {},
      history: Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.history) ? parsed.history : []
    };
  } catch (_unused) {
    return {
      techniqueScores: {},
      history: []
    };
  }
}
function saveEffectivenessState(state) {
  var store = storage();
  if (!store) return false;
  try {
    store.setItem(_constants_js__WEBPACK_IMPORTED_MODULE_0__.STORAGE_KEYS.EFFECTIVENESS, JSON.stringify({
      techniqueScores: (state === null || state === void 0 ? void 0 : state.techniqueScores) || {},
      history: ((state === null || state === void 0 ? void 0 : state.history) || []).slice(-60)
    }));
    return true;
  } catch (_unused2) {
    return false;
  }
}

/**
 * Compare prior vs new mastery / behaviour after a recommended session or review.
 *
 * @param {{
 *   recommendationId?: string|number|null,
 *   technique?: string,
 *   accepted?: boolean,
 *   adjusted?: boolean,
 *   priorSkills?: Record<string, number>,
 *   newSkills?: Record<string, number>,
 *   priorHints?: number,
 *   newHints?: number,
 *   priorRecallMs?: number,
 *   newRecallMs?: number,
 *   priorAiBand?: string,
 *   newAiBand?: string,
 *   delayedRetentionDelta?: number,
 * }} observation
 */
function recordEffectiveness() {
  var _observation$recommen;
  var observation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var state = loadEffectivenessState();
  var deltas = computeDeltas(observation);
  var improved = deltas.overall > 0.02;
  var declined = deltas.overall < -0.02;
  var technique = String(observation.technique || '').toLowerCase();
  if (technique) {
    var prev = Number(state.techniqueScores[technique] || 0);
    var delta = 0;
    if (observation.accepted === false || observation.adjusted) delta -= 0.05;
    if (improved) delta += 0.12;
    if (declined) delta -= 0.15;
    // Avoid rewarding techniques the learner immediately changed away from
    if (observation.adjusted && !improved) delta -= 0.08;
    state.techniqueScores[technique] = Math.round(Math.max(-1, Math.min(1, prev + delta)) * 100) / 100;
  }
  state.history.push({
    at: new Date().toISOString(),
    recommendationId: (_observation$recommen = observation.recommendationId) !== null && _observation$recommen !== void 0 ? _observation$recommen : null,
    technique: technique || null,
    accepted: observation.accepted !== false,
    adjusted: !!observation.adjusted,
    deltas: deltas,
    improved: improved
  });
  saveEffectivenessState(state);
  return state;
}

/**
 * @param {object} observation
 */
function computeDeltas() {
  var observation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var skillDelta = averageDelta(observation.priorSkills || {}, observation.newSkills || {});
  var hintDelta = safeNum(observation.priorHints) - safeNum(observation.newHints);
  var speedDelta = function () {
    var prior = safeNum(observation.priorRecallMs);
    var next = safeNum(observation.newRecallMs);
    if (!prior || !next) return 0;
    return (prior - next) / prior;
  }();
  var aiDelta = bandScore(observation.newAiBand) - bandScore(observation.priorAiBand);
  var retentionDelta = Number(observation.delayedRetentionDelta || 0);
  var overall = average([skillDelta, clamp(hintDelta / 5, -1, 1), clamp(speedDelta, -1, 1), clamp(aiDelta, -1, 1), clamp(retentionDelta, -1, 1)]);
  return {
    skillDelta: round2(skillDelta),
    hintReduction: round2(hintDelta),
    recallSpeedImprovement: round2(speedDelta),
    aiImprovement: round2(aiDelta),
    delayedRetention: round2(retentionDelta),
    overall: round2(overall)
  };
}
function averageDelta(prior, next) {
  var keys = _toConsumableArray(new Set([].concat(_toConsumableArray(Object.keys(prior)), _toConsumableArray(Object.keys(next)))));
  if (!keys.length) return 0;
  var deltas = keys.map(function (k) {
    var _next$k, _prior$k;
    return Number((_next$k = next[k]) !== null && _next$k !== void 0 ? _next$k : 0.5) - Number((_prior$k = prior[k]) !== null && _prior$k !== void 0 ? _prior$k : 0.5);
  });
  return deltas.reduce(function (a, b) {
    return a + b;
  }, 0) / deltas.length;
}
function bandScore(band) {
  var b = String(band || '').toLowerCase();
  if (b === 'strong') return 1;
  if (b === 'mixed') return 0.5;
  if (b === 'weak') return 0;
  return 0.5;
}
function safeNum(value) {
  var n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function average(values) {
  var nums = values.filter(function (n) {
    return Number.isFinite(n);
  });
  if (!nums.length) return 0;
  return nums.reduce(function (a, b) {
    return a + b;
  }, 0) / nums.length;
}
function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}
var RecommendationEffectivenessService = {
  loadEffectivenessState: loadEffectivenessState,
  saveEffectivenessState: saveEffectivenessState,
  recordEffectiveness: recordEffectiveness,
  computeDeltas: computeDeltas
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (RecommendationEffectivenessService);

/***/ }),

/***/ "./resources/js/scripts/assessment/RecommendationPolicyService.js":
/*!************************************************************************!*\
  !*** ./resources/js/scripts/assessment/RecommendationPolicyService.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   REASON_INTERVENTIONS: () => (/* binding */ REASON_INTERVENTIONS),
/* harmony export */   RecommendationPolicyService: () => (/* binding */ RecommendationPolicyService),
/* harmony export */   buildPolicyRecommendation: () => (/* binding */ buildPolicyRecommendation),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   resolveConflictCodes: () => (/* binding */ resolveConflictCodes),
/* harmony export */   sanitizeApprovedSettings: () => (/* binding */ sanitizeApprovedSettings),
/* harmony export */   selectPrimaryReason: () => (/* binding */ selectPrimaryReason)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
var _Object$freeze;
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * Deterministic recommendation policy from approved configs + reason codes.
 * LLMs may only phrase explanations from structured reason codes — never invent settings.
 */



/** @type {Record<string, { goal: string, technique: string, complementary?: string, settings: object, primaryAction: string, explanationKey: string }>} */
var REASON_INTERVENTIONS = Object.freeze((_Object$freeze = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_Object$freeze, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.RESUME,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.LISTEN_AND_REPEAT,
  settings: {
    playback_speed: 1,
    repetitions: 3
  },
  primaryAction: 'continue',
  explanationKey: 'sessionIncomplete'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_RECALL, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.LISTEN_AND_REPEAT,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.PHRASE_CHUNKS,
  settings: {
    playback_speed: 1.25,
    repetitions: 5,
    blur_enabled: false
  },
  primaryAction: 'repeat_weak_ayahs',
  explanationKey: 'lowRecall'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.SEQUENCE_CHAINING,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.PHRASE_CHUNKS,
  settings: {
    playback_speed: 1.25,
    repetitions: 4,
    chaining_enabled: true,
    chaining_method: 'linking'
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'sequenceErrors'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_HINT_DEPENDENCY, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ACTIVE_RECALL,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MEMORY_WORD_ANCHORS,
  settings: {
    playback_speed: 1,
    repetitions: 4,
    blur_enabled: true,
    hint_level: 'low'
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'highHintDependency'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MUSHAF_HIDING,
  settings: {
    playback_speed: 1,
    repetitions: 4,
    blur_enabled: true,
    text_visibility: 'progressive'
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'visualDependency'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.AUDIO_DEPENDENCY, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ACTIVE_RECALL,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.PHRASE_CHUNKS,
  settings: {
    playback_speed: 1,
    repetitions: 3,
    blur_enabled: true
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'audioDependency'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SPOKEN_HESITATION, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.PHRASE_CHUNKS,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.LISTEN_AND_REPEAT,
  settings: {
    playback_speed: 1.25,
    repetitions: 5,
    talqin_enabled: true,
    focus_enabled: true
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'spokenHesitation'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OMISSION_ERRORS, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REPEAT,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.LISTEN_AND_REPEAT,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ONE_AYAH_AT_A_TIME,
  settings: {
    playback_speed: 1.25,
    repetitions: 5,
    ayat_per_step: 1
  },
  primaryAction: 'repeat_weak_ayahs',
  explanationKey: 'omissionErrors'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SIMILAR_AYAH_CONFUSION, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.SIMILAR_AYAH_PRACTICE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MUTASHABIHAT_COMPARISON,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MEMORY_WORD_ANCHORS,
  settings: {
    playback_speed: 1,
    repetitions: 4,
    anchor_mode_enabled: true
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'similarAyahConfusion'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REVIEW,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ACTIVE_RECALL,
  settings: {
    playback_speed: 1,
    repetitions: 3,
    review_interval_days: 1
  },
  primaryAction: 'review_tomorrow',
  explanationKey: 'lowDelayedRetention'
}), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_Object$freeze, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.ADVANCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.PHRASE_CHUNKS,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MEMORY_WORD_ANCHORS,
  settings: {
    playback_speed: 1,
    repetitions: 2,
    focus_enabled: true
  },
  primaryAction: 'continue',
  explanationKey: 'highPerformance'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_CONFIDENCE, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.LISTEN_AND_REPEAT,
  settings: {
    playback_speed: 1.25,
    repetitions: 4
  },
  primaryAction: 'start_focused_review',
  explanationKey: 'lowConfidence'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OVERCONFIDENCE, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REINFORCE,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ACTIVE_RECALL,
  complementary: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ONE_AYAH_AT_A_TIME,
  settings: {
    playback_speed: 1.25,
    repetitions: 4,
    blur_enabled: true
  },
  primaryAction: 'repeat_weak_ayahs',
  explanationKey: 'overconfidence'
}), _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.REVIEW_OVERDUE, {
  goal: _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.REVIEW,
  technique: _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.ACTIVE_RECALL,
  settings: {
    playback_speed: 1,
    repetitions: 3
  },
  primaryAction: 'review_tomorrow',
  explanationKey: 'reviewOverdue'
})));

/** Conflict priority (first match wins among conflict pairs). */
var CONFLICT_PRIORITY = Object.freeze([_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OVERCONFIDENCE, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SPOKEN_HESITATION, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SIMILAR_AYAH_CONFUSION, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_RECALL, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OMISSION_ERRORS, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_HINT_DEPENDENCY, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.AUDIO_DEPENDENCY, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_CONFIDENCE, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.REVIEW_OVERDUE, _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE]);

/**
 * Resolve conflicts between confidence and objective evidence.
 * Confidence influences recommendations but never independently forces progression.
 *
 * @param {string[]} reasonCodes
 * @param {{ confidence?: string|null, objectiveBand?: string, spokenWeak?: boolean, textStrong?: boolean }} ctx
 * @returns {string[]}
 */
function resolveConflictCodes() {
  var reasonCodes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var ctx = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var codes = new Set(reasonCodes || []);
  var confidence = String(ctx.confidence || '').toLowerCase();
  var band = String(ctx.objectiveBand || '').toLowerCase();

  // Confident + weak objective → targeted reinforcement (keep OVERCONFIDENCE / weakness codes)
  if (confidence === 'confident' && (band === 'weak' || band === 'mixed')) {
    codes["delete"](_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE);
    codes.add(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OVERCONFIDENCE);
  }

  // Needs practice + strong result → short confidence-building, not full repeat
  if (confidence === 'needs_practice' && band === 'strong') {
    codes["delete"](_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_RECALL);
    codes.add(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_CONFIDENCE);
    // Prefer reinforce over full session repeat
  }

  // Strong text + weak AI Recite
  if (ctx.textStrong && ctx.spokenWeak) {
    codes.add(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SPOKEN_HESITATION);
  }

  // Strong immediate + poor historical retention → allow progression but early review
  if (band === 'strong' && codes.has(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION)) {
    codes.add(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE);
  }
  return _toConsumableArray(codes);
}

/**
 * Pick primary reason by priority.
 * @param {string[]} codes
 */
function selectPrimaryReason() {
  var codes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var _iterator = _createForOfIteratorHelper(CONFLICT_PRIORITY),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var code = _step.value;
      if (codes.includes(code)) return code;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return codes[0] || _constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE;
}

/**
 * Clamp settings to approved values only.
 * @param {object} settings
 */
function sanitizeApprovedSettings() {
  var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var out = {};
  var technique = String(settings.technique || '').toLowerCase();
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(technique)) {
    out.technique = technique;
  }
  var complementary = String(settings.complementary_technique || settings.complementary || '').toLowerCase();
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(complementary)) {
    out.complementary_technique = complementary;
  }
  var speed = Number(settings.playback_speed);
  if (Number.isFinite(speed)) {
    out.playback_speed = _constants_js__WEBPACK_IMPORTED_MODULE_0__.APPROVED_PLAYBACK_SPEEDS.reduce(function (best, s) {
      return Math.abs(s - speed) < Math.abs(best - speed) ? s : best;
    }, _constants_js__WEBPACK_IMPORTED_MODULE_0__.APPROVED_PLAYBACK_SPEEDS[2]);
  }
  var reps = Number(settings.repetitions);
  if (Number.isFinite(reps)) out.repetitions = Math.max(1, Math.min(8, Math.round(reps)));
  if (settings.ayat_per_step != null) {
    var step = Number(settings.ayat_per_step);
    if (Number.isFinite(step)) out.ayat_per_step = Math.max(1, Math.min(3, Math.round(step)));
  }
  for (var _i = 0, _arr = ['focus_enabled', 'blur_enabled', 'talqin_enabled', 'chaining_enabled', 'anchor_mode_enabled']; _i < _arr.length; _i++) {
    var flag = _arr[_i];
    if (typeof settings[flag] === 'boolean') out[flag] = settings[flag];
  }
  if (['linking', 'cumulative'].includes(String(settings.chaining_method || ''))) {
    out.chaining_method = settings.chaining_method;
  }
  if (settings.hint_level) out.hint_level = String(settings.hint_level);
  if (settings.text_visibility) out.text_visibility = String(settings.text_visibility);
  if (Number.isFinite(Number(settings.review_interval_days))) {
    out.review_interval_days = Math.max(1, Math.min(14, Math.round(Number(settings.review_interval_days))));
  }
  return out;
}

/**
 * Build one explainable next-session recommendation view model.
 *
 * @param {{
 *   reasonCodes: string[],
 *   confidence?: string|null,
 *   objectiveBand?: string,
 *   skills?: Record<string, number>,
 *   baseRecommendation?: object|null,
 *   weakAyahs?: number[],
 *   sessionRange?: { from: number, to: number },
 *   techniqueRank?: Record<string, number>,
 * }} input
 */
function buildPolicyRecommendation() {
  var _input$skills$spokenR, _input$skills, _input$skills$phraseR, _input$skills2, _input$skills$textual, _input$skills3;
  var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var codes = resolveConflictCodes(input.reasonCodes || [], {
    confidence: input.confidence,
    objectiveBand: input.objectiveBand,
    spokenWeak: ((_input$skills$spokenR = (_input$skills = input.skills) === null || _input$skills === void 0 ? void 0 : _input$skills.spokenRecall) !== null && _input$skills$spokenR !== void 0 ? _input$skills$spokenR : 0.5) < 0.45,
    textStrong: ((_input$skills$phraseR = (_input$skills2 = input.skills) === null || _input$skills2 === void 0 ? void 0 : _input$skills2.phraseRecall) !== null && _input$skills$phraseR !== void 0 ? _input$skills$phraseR : 0.5) >= 0.75 && ((_input$skills$textual = (_input$skills3 = input.skills) === null || _input$skills3 === void 0 ? void 0 : _input$skills3.textualPrecision) !== null && _input$skills$textual !== void 0 ? _input$skills$textual : 0.5) >= 0.7
  });
  var primary = selectPrimaryReason(codes);
  var intervention = REASON_INTERVENTIONS[primary] || REASON_INTERVENTIONS[_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE];

  // Avoid repeatedly recommending ineffective techniques for this learner
  var technique = intervention.technique;
  var rank = input.techniqueRank || {};
  if (technique && Number(rank[technique] || 0) < -0.25 && intervention.complementary) {
    technique = intervention.complementary;
  }
  // Map mutashabihat / ai_recite to approved session techniques
  if (technique === _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MUTASHABIHAT_COMPARISON) technique = _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.MEMORY_WORD_ANCHORS;
  if (technique === _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.AI_RECITE) technique = _constants_js__WEBPACK_IMPORTED_MODULE_0__.TECHNIQUES.LISTEN_AND_REPEAT;
  var settings = sanitizeApprovedSettings(_objectSpread({
    technique: technique,
    complementary_technique: intervention.complementary
  }, intervention.settings));
  var base = input.baseRecommendation && _typeof(input.baseRecommendation) === 'object' ? _objectSpread({}, input.baseRecommendation) : {};
  var isAdvance = intervention.goal === _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.ADVANCE;
  var isResume = intervention.goal === _constants_js__WEBPACK_IMPORTED_MODULE_0__.GOALS.RESUME;
  var type = isResume ? 'resume' : isAdvance ? base.type && !['revision', 'repeat_current_range'].includes(base.type) ? base.type : 'continue' : 'repeat_current_range';
  return _objectSpread(_objectSpread({}, base), {}, {
    type: type,
    session_mode: isAdvance ? 'new_learning' : 'revision',
    range_kind: isAdvance ? base.range_kind || 'new' : 'repeated',
    reason_code: primary.toLowerCase(),
    evidence_codes: codes,
    user_reason: null,
    settings: _objectSpread(_objectSpread(_objectSpread({}, base.settings || {}), settings), {}, {
      adaptations: codes,
      evidence_codes: codes,
      intended_outcome: intervention.goal
    }),
    goal: intervention.goal,
    primary_action: intervention.primaryAction,
    primary_action_label_key: actionLabelKey(intervention.primaryAction),
    explanation_key: intervention.explanationKey,
    weak_ayahs: Array.isArray(input.weakAyahs) ? input.weakAyahs : [],
    policy_version: 1
  });
}
function actionLabelKey(action) {
  switch (action) {
    case 'repeat_weak_ayahs':
      return 'repeatWeakAyahs';
    case 'start_focused_review':
      return 'startFocusedReview';
    case 'review_tomorrow':
      return 'reviewTomorrow';
    case 'continue':
      return 'continue';
    default:
      return 'continue';
  }
}
var RecommendationPolicyService = {
  REASON_INTERVENTIONS: REASON_INTERVENTIONS,
  resolveConflictCodes: resolveConflictCodes,
  selectPrimaryReason: selectPrimaryReason,
  sanitizeApprovedSettings: sanitizeApprovedSettings,
  buildPolicyRecommendation: buildPolicyRecommendation
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (RecommendationPolicyService);

/***/ }),

/***/ "./resources/js/scripts/assessment/ReviewSchedulingService.js":
/*!********************************************************************!*\
  !*** ./resources/js/scripts/assessment/ReviewSchedulingService.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ReviewSchedulingService: () => (/* binding */ ReviewSchedulingService),
/* harmony export */   buildReviewScheduleSnapshot: () => (/* binding */ buildReviewScheduleSnapshot),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   scheduleReview: () => (/* binding */ scheduleReview),
/* harmony export */   scheduleReviewsForKeys: () => (/* binding */ scheduleReviewsForKeys)
/* harmony export */ });
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants.js */ "./resources/js/scripts/assessment/constants.js");
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
/**
 * Schedules murājaʿah from retention strength and reason codes.
 */



/**
 * @param {number} retentionStrength 0–1
 * @param {string[]} reasonCodes
 * @param {string} [nowIso]
 * @returns {{ nextReviewAt: string, intervalDays: number }}
 */
function scheduleReview(retentionStrength) {
  var reasonCodes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var nowIso = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Date().toISOString();
  var codes = reasonCodes || [];
  var days = 3;
  if (codes.includes(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION) || codes.includes(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.REVIEW_OVERDUE)) {
    days = 1;
  } else if (codes.includes(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.LOW_RECALL) || codes.includes(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.OVERCONFIDENCE) || codes.includes(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS)) {
    days = 1;
  } else if (codes.includes(_constants_js__WEBPACK_IMPORTED_MODULE_0__.ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE)) {
    var strength = Number(retentionStrength);
    if (strength >= 0.85) days = 7;else if (strength >= 0.7) days = 3;else days = 2;
  } else {
    var _strength = Number(retentionStrength);
    if (!Number.isFinite(_strength) || _strength < 0.45) days = 1;else if (_strength < 0.65) days = 2;else if (_strength < 0.8) days = 3;else days = 7;
  }
  var next = new Date(nowIso);
  if (Number.isNaN(next.getTime())) {
    var fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + days);
    return {
      nextReviewAt: fallback.toISOString(),
      intervalDays: days
    };
  }
  next.setUTCDate(next.getUTCDate() + days);
  return {
    nextReviewAt: next.toISOString(),
    intervalDays: days
  };
}

/**
 * Build nextReviewByKey map for mastery updates.
 * @param {string[]} verseKeys
 * @param {Record<string, object>} masteryMap
 * @param {string[]} reasonCodes
 * @param {string} [nowIso]
 */
function scheduleReviewsForKeys(verseKeys) {
  var masteryMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var reasonCodes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var nowIso = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new Date().toISOString();
  var out = {};
  var _iterator = _createForOfIteratorHelper(verseKeys || []),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _masteryMap$key$reten, _masteryMap$key;
      var key = _step.value;
      var retention = Number((_masteryMap$key$reten = (_masteryMap$key = masteryMap[key]) === null || _masteryMap$key === void 0 ? void 0 : _masteryMap$key.retentionStrength) !== null && _masteryMap$key$reten !== void 0 ? _masteryMap$key$reten : 0.5);
      out[key] = scheduleReview(retention, reasonCodes, nowIso).nextReviewAt;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return out;
}

/**
 * Snapshot for recommendation / event store.
 */
function buildReviewScheduleSnapshot(verseKeys, masteryMap, reasonCodes) {
  var nowIso = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new Date().toISOString();
  var byKey = scheduleReviewsForKeys(verseKeys, masteryMap, reasonCodes, nowIso);
  var intervals = Object.keys(byKey).map(function (key) {
    var _masteryMap$key$reten2, _masteryMap$key2;
    var retention = Number((_masteryMap$key$reten2 = (_masteryMap$key2 = masteryMap[key]) === null || _masteryMap$key2 === void 0 ? void 0 : _masteryMap$key2.retentionStrength) !== null && _masteryMap$key$reten2 !== void 0 ? _masteryMap$key$reten2 : 0.5);
    return scheduleReview(retention, reasonCodes, nowIso);
  });
  var minDays = intervals.length ? Math.min.apply(Math, _toConsumableArray(intervals.map(function (i) {
    return i.intervalDays;
  }))) : scheduleReview(0.5, reasonCodes, nowIso).intervalDays;
  return {
    scheduledAt: nowIso,
    intervalDays: minDays,
    nextReviewAt: byKey[verseKeys === null || verseKeys === void 0 ? void 0 : verseKeys[0]] || scheduleReview(0.5, reasonCodes, nowIso).nextReviewAt,
    byKey: byKey,
    reasonCodes: _toConsumableArray(reasonCodes)
  };
}
var ReviewSchedulingService = {
  scheduleReview: scheduleReview,
  scheduleReviewsForKeys: scheduleReviewsForKeys,
  buildReviewScheduleSnapshot: buildReviewScheduleSnapshot
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ReviewSchedulingService);

/***/ }),

/***/ "./resources/js/scripts/assessment/adaptiveAssessmentBundle.js":
/*!*********************************************************************!*\
  !*** ./resources/js/scripts/assessment/adaptiveAssessmentBundle.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   answerCurrentQuestion: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.answerCurrentQuestion),
/* harmony export */   buildAssessmentResultViewModel: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.buildAssessmentResultViewModel),
/* harmony export */   clearAssessmentSession: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.clearAssessmentSession),
/* harmony export */   completeAssessment: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.completeAssessment),
/* harmony export */   loadAssessmentSession: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.loadAssessmentSession),
/* harmony export */   loadMasteryMap: () => (/* reexport safe */ _LearnerMasteryService__WEBPACK_IMPORTED_MODULE_1__.loadMasteryMap),
/* harmony export */   pauseAssessment: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.pauseAssessment),
/* harmony export */   recordEffectiveness: () => (/* reexport safe */ _RecommendationEffectivenessService__WEBPACK_IMPORTED_MODULE_2__.recordEffectiveness),
/* harmony export */   requestHint: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.requestHint),
/* harmony export */   resumeAssessment: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.resumeAssessment),
/* harmony export */   startAdaptiveCheck: () => (/* reexport safe */ _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__.startAdaptiveCheck)
/* harmony export */ });
/* harmony import */ var _AdaptiveAssessmentService__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AdaptiveAssessmentService */ "./resources/js/scripts/assessment/AdaptiveAssessmentService.js");
/* harmony import */ var _LearnerMasteryService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./LearnerMasteryService */ "./resources/js/scripts/assessment/LearnerMasteryService.js");
/* harmony import */ var _RecommendationEffectivenessService__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./RecommendationEffectivenessService */ "./resources/js/scripts/assessment/RecommendationEffectivenessService.js");
/**
 * Lazy-loaded adaptive assessment surface. Kept as a single async chunk so the
 * memorisation shell does not pay for quiz/assessment code until post-session
 * adaptive check opens.
 */




/***/ }),

/***/ "./resources/js/scripts/assessment/constants.js":
/*!******************************************************!*\
  !*** ./resources/js/scripts/assessment/constants.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   APPROVED_PLAYBACK_SPEEDS: () => (/* binding */ APPROVED_PLAYBACK_SPEEDS),
/* harmony export */   ASSESSMENT_EVENTS: () => (/* binding */ ASSESSMENT_EVENTS),
/* harmony export */   ASSESSMENT_LIMITS: () => (/* binding */ ASSESSMENT_LIMITS),
/* harmony export */   ASSESSMENT_REASON_CODES: () => (/* binding */ ASSESSMENT_REASON_CODES),
/* harmony export */   DIFFICULTY: () => (/* binding */ DIFFICULTY),
/* harmony export */   DIFFICULTY_LABELS: () => (/* binding */ DIFFICULTY_LABELS),
/* harmony export */   GOALS: () => (/* binding */ GOALS),
/* harmony export */   MASTERY_FIELDS: () => (/* binding */ MASTERY_FIELDS),
/* harmony export */   QUESTION_TYPES: () => (/* binding */ QUESTION_TYPES),
/* harmony export */   QUESTION_TYPES_BY_DIFFICULTY: () => (/* binding */ QUESTION_TYPES_BY_DIFFICULTY),
/* harmony export */   RESULT_SKILL_KEYS: () => (/* binding */ RESULT_SKILL_KEYS),
/* harmony export */   SKILLS: () => (/* binding */ SKILLS),
/* harmony export */   STORAGE_KEYS: () => (/* binding */ STORAGE_KEYS),
/* harmony export */   TECHNIQUES: () => (/* binding */ TECHNIQUES)
/* harmony export */ });
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * Adaptive memorisation assessment — shared constants.
 * Domain logic stays here; Vue only consumes view models.
 */

var DIFFICULTY = Object.freeze({
  RECOGNITION: 1,
  GUIDED_RECALL: 2,
  INDEPENDENT_RECALL: 3,
  PRECISION: 4
});
var DIFFICULTY_LABELS = Object.freeze({
  1: 'recognition',
  2: 'guided_recall',
  3: 'independent_recall',
  4: 'precision'
});

/** Question modes by difficulty. Core modes are interactive; precision uses simpler renderers. */
var QUESTION_TYPES = Object.freeze({
  // Recognition
  SURAH_IDENTIFICATION: 'surah_identification',
  MISSING_WORD_OPTIONS: 'missing_word_options',
  SELECT_NEXT_PHRASE: 'select_next_phrase',
  BASIC_PHRASE_ORDERING: 'basic_phrase_ordering',
  MATCH_BEGINNING_ENDING: 'match_beginning_ending',
  // Guided recall
  COMPLETE_AYAH_REDUCED: 'complete_ayah_reduced',
  PREVIOUS_NEXT_AYAH: 'previous_next_ayah',
  MUSHAF_HIDE_PARTIAL: 'mushaf_hide_partial',
  ARRANGE_AYAH_SEGMENTS: 'arrange_ayah_segments',
  BEGINNING_END_RECALL: 'beginning_end_recall',
  // Independent recall
  COMPLETE_AYAH_OPEN: 'complete_ayah_open',
  MISSING_AYAH: 'missing_ayah',
  RANDOM_START_CONTINUATION: 'random_start_continuation',
  MUSHAF_HIDE_HEAVY: 'mushaf_hide_heavy',
  AI_RECITE_NO_TEXT: 'ai_recite_no_text',
  // Precision / advanced (simpler renderers)
  HARAKAH_CHECK: 'harakah_check',
  MUTASHABIHAT_COMPARISON: 'mutashabihat_comparison',
  SIMILAR_AYAH_IDENTIFICATION: 'similar_ayah_identification',
  CROSS_RANGE_SEQUENCE: 'cross_range_sequence',
  DELAYED_RECALL: 'delayed_recall',
  PRONUNCIATION_FLUENCY: 'pronunciation_fluency'
});
var QUESTION_TYPES_BY_DIFFICULTY = Object.freeze(_defineProperty(_defineProperty(_defineProperty(_defineProperty({}, DIFFICULTY.RECOGNITION, [QUESTION_TYPES.MISSING_WORD_OPTIONS, QUESTION_TYPES.SELECT_NEXT_PHRASE, QUESTION_TYPES.SURAH_IDENTIFICATION, QUESTION_TYPES.MATCH_BEGINNING_ENDING]), DIFFICULTY.GUIDED_RECALL, [QUESTION_TYPES.COMPLETE_AYAH_REDUCED, QUESTION_TYPES.PREVIOUS_NEXT_AYAH, QUESTION_TYPES.BEGINNING_END_RECALL, QUESTION_TYPES.MUSHAF_HIDE_PARTIAL]), DIFFICULTY.INDEPENDENT_RECALL, [QUESTION_TYPES.MISSING_AYAH, QUESTION_TYPES.COMPLETE_AYAH_REDUCED, QUESTION_TYPES.PREVIOUS_NEXT_AYAH
// AI Recite is a separate completion CTA — never embed it mid-check (freezes the flow).
]), DIFFICULTY.PRECISION, [QUESTION_TYPES.HARAKAH_CHECK, QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION, QUESTION_TYPES.MUTASHABIHAT_COMPARISON, QUESTION_TYPES.CROSS_RANGE_SEQUENCE]));
var SKILLS = Object.freeze({
  PHRASE_RECALL: 'phraseRecall',
  AYAH_SEQUENCE: 'ayahSequence',
  BEGINNINGS: 'beginnings',
  ENDINGS: 'endings',
  TEXTUAL_PRECISION: 'textualPrecision',
  SPOKEN_RECALL: 'spokenRecall',
  FLUENCY: 'fluency',
  INDEPENDENCE: 'independence',
  HINT_DEPENDENCY: 'hintDependency',
  VISUAL_TEXT_DEPENDENCY: 'visualTextDependency',
  AUDIO_DEPENDENCY: 'audioDependency',
  SIMILAR_AYAH_CONFUSION: 'similarAyahConfusion',
  DELAYED_RETENTION: 'delayedRetention',
  CONFIDENCE_CALIBRATION: 'confidenceCalibration'
});

/** Result panel skills (user-facing, not a single %). */
var RESULT_SKILL_KEYS = Object.freeze(['recall', 'ayahSequence', 'textualPrecision', 'independentRecitation']);
var ASSESSMENT_REASON_CODES = Object.freeze({
  SESSION_INCOMPLETE: 'SESSION_INCOMPLETE',
  LOW_RECALL: 'LOW_RECALL',
  SEQUENCE_ERRORS: 'SEQUENCE_ERRORS',
  HIGH_HINT_DEPENDENCY: 'HIGH_HINT_DEPENDENCY',
  VISUAL_DEPENDENCY: 'VISUAL_DEPENDENCY',
  AUDIO_DEPENDENCY: 'AUDIO_DEPENDENCY',
  SPOKEN_HESITATION: 'SPOKEN_HESITATION',
  OMISSION_ERRORS: 'OMISSION_ERRORS',
  SIMILAR_AYAH_CONFUSION: 'SIMILAR_AYAH_CONFUSION',
  LOW_DELAYED_RETENTION: 'LOW_DELAYED_RETENTION',
  HIGH_PERFORMANCE: 'HIGH_PERFORMANCE',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  OVERCONFIDENCE: 'OVERCONFIDENCE',
  REVIEW_OVERDUE: 'REVIEW_OVERDUE'
});
var ASSESSMENT_EVENTS = Object.freeze({
  ADAPTIVE_CHECK_STARTED: 'adaptive_check_started',
  QUESTION_PRESENTED: 'question_presented',
  QUESTION_ANSWERED: 'question_answered',
  ANSWER_CORRECT: 'answer_correct',
  ANSWER_INCORRECT: 'answer_incorrect',
  HINT_REQUESTED: 'hint_requested',
  DIFFICULTY_CHANGED: 'difficulty_changed',
  ASSESSMENT_STOPPED_EARLY: 'assessment_stopped_early',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  AI_RECITE_REQUESTED: 'ai_recite_requested',
  SKILL_WEAKNESS_DETECTED: 'skill_weakness_detected',
  MASTERY_UPDATED: 'mastery_updated',
  RECOMMENDATION_GENERATED: 'recommendation_generated',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  RECOMMENDATION_ADJUSTED: 'recommendation_adjusted',
  REVIEW_SCHEDULED: 'review_scheduled',
  REVIEW_COMPLETED: 'review_completed'
});
var GOALS = Object.freeze({
  RESUME: 'resume',
  REPEAT: 'repeat',
  REINFORCE: 'reinforce',
  TEST: 'test',
  REVIEW: 'review',
  ADVANCE: 'advance',
  SIMILAR_AYAH_PRACTICE: 'similar_ayah_practice'
});
var TECHNIQUES = Object.freeze({
  LISTEN_AND_REPEAT: 'talqin',
  PHRASE_CHUNKS: 'focus',
  ONE_AYAH_AT_A_TIME: 'focus',
  SEQUENCE_CHAINING: 'chaining',
  MEMORY_WORD_ANCHORS: 'anchor',
  MUSHAF_HIDING: 'blur',
  ACTIVE_RECALL: 'blur',
  AI_RECITE: 'ai_recite',
  MUTASHABIHAT_COMPARISON: 'mutashabihat'
});
var APPROVED_PLAYBACK_SPEEDS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5]);
var ASSESSMENT_LIMITS = Object.freeze({
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 5,
  START_DIFFICULTY: DIFFICULTY.RECOGNITION,
  SLOW_RESPONSE_MS: 12000,
  EARLY_STOP_CONFIDENCE: 0.72,
  WEAK_SKILL_THRESHOLD: 0.45,
  STRONG_SKILL_THRESHOLD: 0.75
});
var MASTERY_FIELDS = Object.freeze(['recallMastery', 'sequenceMastery', 'textualPrecision', 'spokenAccuracy', 'fluency', 'independence', 'visualDependency', 'audioDependency', 'hintDependency', 'similarAyahMastery', 'retentionStrength', 'confidenceCalibration', 'evidenceConfidence']);
var STORAGE_KEYS = Object.freeze({
  ASSESSMENT_SESSION: 'mutqin.adaptiveAssessment.session',
  MASTERY_MAP: 'mutqin.adaptiveAssessment.mastery',
  EFFECTIVENESS: 'mutqin.adaptiveAssessment.effectiveness',
  EVENTS: 'mutqin.adaptiveAssessment.events'
});

/***/ })

}]);