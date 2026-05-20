/**
 * AssessmentPanel — bottom-sheet panel that drives the therapist through
 * a snapshotted Assessment question-by-question during a video call.
 *
 * State machine (panelMode):
 *   'questions'  — showing one question at a time, Next/Skip controls
 *   'completing' — POST /complete is in flight
 *   'generating' — PDF worker is running, we're polling getPdf
 *   'ready'      — PDF URL is in hand; "View PDF" CTA visible
 *
 * Bottom-sheet behavior:
 *   - Default expanded height = ~32% of screen (clamped 240–360)
 *   - Tap the drag handle (or swipe down past 60px) → collapses to 40px
 *   - Tap the collapsed bar → re-expands
 *   - Animated.Value + PanResponder only; NO Reanimated dependency
 *
 * Per-question inputs:
 *   'text'        — TextInput
 *   'scale'       — row of 11 circles labeled 0–10
 *   'boolean'     — Yes/No pill buttons
 *   'multiselect' — wrap grid of toggleable option pills
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import {
  getAssessment,
  respond,
  complete,
  getPdf,
} from '../../services/assessmentService';

var SCREEN_HEIGHT = Dimensions.get('window').height;
var DEFAULT_EXPANDED = clamp(Math.round(SCREEN_HEIGHT * 0.32), 240, 360);
var COLLAPSED_HEIGHT = 44;
var POLL_INTERVAL_MS = 2000;
var POLL_TIMEOUT_MS = 30000;

// Phase 3B UI pass — parent (VideoCallScreen) needs these to compute the
// controls-bar offset and to seed its shared Animated.Value.
export { DEFAULT_EXPANDED, COLLAPSED_HEIGHT };

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

/**
 * @param {object} props
 * @param {string} props.assessmentId
 * @param {(result: { pdfUrl: string|null }) => void} [props.onComplete]
 * @param {number} [props.height] - override the default expanded height
 * @param {import('react-native').Animated.Value} [props.heightValue] - optional
 *   parent-controlled Animated.Value for the panel height. When provided, the
 *   parent can listen to it (e.g. to anchor the controls bar 12px above the
 *   panel). When omitted, the panel uses its own internal value as before.
 */
export default function AssessmentPanel({ assessmentId, onComplete, height, heightValue }) {
  var EXPANDED_HEIGHT = height || DEFAULT_EXPANDED;

  var [assessment, setAssessment] = useState(null);
  var [loading, setLoading] = useState(true);
  var [loadError, setLoadError] = useState(null);

  var [currentIdx, setCurrentIdx] = useState(0);
  var [currentAnswer, setCurrentAnswer] = useState(null);
  var [savingError, setSavingError] = useState(null);
  var [isSaving, setIsSaving] = useState(false);

  var [panelMode, setPanelMode] = useState('questions');
  var [pdfUrl, setPdfUrl] = useState(null);
  var [pollError, setPollError] = useState(null);

  // ── Bottom-sheet animation ──────────────────────────────────────
  // If the parent supplied a heightValue, use it (so the parent can listen
  // for height changes and anchor things to the panel's top). Otherwise
  // fall back to the panel's own internal value — preserves stand-alone use.
  var internalHeight = useRef(new Animated.Value(EXPANDED_HEIGHT)).current;
  var heightAnim = heightValue || internalHeight;
  var collapsedRef = useRef(false);

  function animateTo(toValue) {
    Animated.spring(heightAnim, {
      toValue: toValue,
      useNativeDriver: false,    // animating layout height — can't use native driver
      stiffness: 200,
      damping: 22,
      mass: 1,
    }).start();
  }

  function toggleCollapsed() {
    collapsedRef.current = !collapsedRef.current;
    animateTo(collapsedRef.current ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT);
  }

  var panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: function (_e, g) {
        // Capture clearly-downward gestures on the handle area only.
        return Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
      },
      onPanResponderMove: function (_e, g) {
        if (collapsedRef.current) return;
        var nextHeight = clamp(EXPANDED_HEIGHT - g.dy, COLLAPSED_HEIGHT, EXPANDED_HEIGHT);
        heightAnim.setValue(nextHeight);
      },
      onPanResponderRelease: function (_e, g) {
        if (collapsedRef.current && g.dy < -20) {
          collapsedRef.current = false;
          animateTo(EXPANDED_HEIGHT);
          return;
        }
        if (!collapsedRef.current && g.dy > 60) {
          collapsedRef.current = true;
          animateTo(COLLAPSED_HEIGHT);
          return;
        }
        animateTo(collapsedRef.current ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT);
      },
    })
  ).current;

  // ── Initial assessment load ─────────────────────────────────────
  useEffect(function () {
    var cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async function () {
      var resp = await getAssessment(assessmentId);
      if (cancelled) return;
      if (resp.success) {
        setAssessment(resp.data);
        // If responses exist already, jump to the first unanswered question.
        var qs = (resp.data && resp.data.questions) || [];
        var rs = (resp.data && resp.data.responses) || [];
        var answered = new Set(rs.map(function (r) { return r.questionId; }));
        var nextIdx = qs.findIndex(function (q) { return !answered.has(q.questionId); });
        setCurrentIdx(nextIdx >= 0 ? nextIdx : qs.length - 1);
        // If the assessment was already completed, jump straight to the
        // generating/ready states so we don't ask the therapist again.
        if (resp.data && resp.data.status === 'completed') {
          setPanelMode(resp.data.pdfKey ? 'ready' : 'generating');
        }
      } else {
        setLoadError(resp.error || 'Failed to load assessment');
      }
      setLoading(false);
    })();
    return function () { cancelled = true; };
  }, [assessmentId]);

  // ── Reset transient answer state when the question changes ──────
  useEffect(function () {
    if (!assessment) return;
    var q = assessment.questions[currentIdx];
    if (!q) return;
    var existing = (assessment.responses || []).find(function (r) { return r.questionId === q.questionId; });
    setCurrentAnswer(existing ? existing.answer : defaultAnswerFor(q));
    setSavingError(null);
  }, [assessment, currentIdx]);

  // ── PDF polling once we transition to 'generating' ──────────────
  useEffect(function () {
    if (panelMode !== 'generating') return;
    var cancelled = false;
    var elapsed = 0;
    var poll = async function () {
      if (cancelled) return;
      var resp = await getPdf(assessmentId);
      if (cancelled) return;
      if (resp.success && resp.data && resp.data.status === 'ready') {
        setPdfUrl(resp.data.url);
        setPanelMode('ready');
        if (typeof onComplete === 'function') {
          onComplete({ pdfUrl: resp.data.url });
        }
        return;
      }
      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        setPollError('PDF is taking longer than expected. Please retry from the bookings list.');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();
    return function () { cancelled = true; };
  }, [panelMode, assessmentId, onComplete]);

  // ── Save the current answer ─────────────────────────────────────
  async function saveCurrent() {
    if (!assessment) return false;
    var q = assessment.questions[currentIdx];
    setIsSaving(true);
    setSavingError(null);
    var resp = await respond(assessmentId, { questionId: q.questionId, answer: currentAnswer });
    setIsSaving(false);
    if (!resp.success) {
      setSavingError(resp.error || 'Could not save your answer');
      return false;
    }
    // Refresh local assessment.responses so re-visits don't re-prompt.
    setAssessment(resp.data || assessment);
    return true;
  }

  async function handleNext() {
    var saved = await saveCurrent();
    if (!saved) return;
    if (currentIdx < assessment.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Last question — complete the assessment and start polling for PDF.
      setPanelMode('completing');
      var resp = await complete(assessmentId);
      if (resp.success) {
        setPanelMode('generating');
      } else {
        setSavingError(resp.error || 'Could not complete assessment');
        setPanelMode('questions');
      }
    }
  }

  function handleSkip() {
    if (!assessment) return;
    if (currentIdx < assessment.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <Animated.View style={[styles.panel, { height: heightAnim }]}>
        <View style={styles.handle} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      </Animated.View>
    );
  }

  if (loadError) {
    return (
      <Animated.View style={[styles.panel, { height: heightAnim }]}>
        <View style={styles.handle} />
        <Text style={styles.errorText}>{loadError}</Text>
      </Animated.View>
    );
  }

  if (!assessment || !Array.isArray(assessment.questions) || assessment.questions.length === 0) {
    return (
      <Animated.View style={[styles.panel, { height: heightAnim }]}>
        <View style={styles.handle} />
        <Text style={styles.emptyText}>No assessment questions found.</Text>
      </Animated.View>
    );
  }

  var totalQuestions = assessment.questions.length;
  var question = assessment.questions[currentIdx];
  var isLast = currentIdx === totalQuestions - 1;
  var progress = (currentIdx + (panelMode === 'questions' ? 0 : 1)) / totalQuestions;

  return (
    <Animated.View style={[styles.panel, { height: heightAnim }]}>
      {/* Drag handle / collapsed strip */}
      <Pressable
        onPress={toggleCollapsed}
        {...panResponder.panHandlers}
        style={styles.handleArea}
      >
        <View style={styles.handle} />
        {collapsedRef.current ? (
          <Text style={styles.collapsedText}>
            Q {currentIdx + 1} of {totalQuestions} · tap to expand
          </Text>
        ) : null}
      </Pressable>

      {!collapsedRef.current && panelMode === 'questions' ? (
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.qCounter}>Q {currentIdx + 1} of {totalQuestions}</Text>
            <TouchableOpacity onPress={handleSkip} disabled={isLast || isSaving}>
              <Text style={[styles.skip, (isLast || isSaving) && styles.skipDisabled]}>Skip</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.questionText}>{question.questionText}</Text>

          <View style={styles.answerArea}>
            {renderAnswerInput(question, currentAnswer, setCurrentAnswer)}
          </View>

          {savingError ? <Text style={styles.errorText}>{savingError}</Text> : null}

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: (progress * 100) + '%' }]} />
          </View>

          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[styles.nextBtn, isSaving && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={isSaving}
            >
              <Text style={styles.nextBtnText}>
                {isSaving ? 'Saving…' : (isLast ? 'Complete Assessment' : 'Next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!collapsedRef.current && panelMode === 'completing' ? (
        <View style={styles.body}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyText}>Submitting assessment…</Text>
        </View>
      ) : null}

      {!collapsedRef.current && panelMode === 'generating' ? (
        <View style={styles.body}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyText}>Generating PDF…</Text>
          {pollError ? <Text style={styles.errorText}>{pollError}</Text> : null}
        </View>
      ) : null}

      {!collapsedRef.current && panelMode === 'ready' ? (
        <View style={styles.body}>
          <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
          <Text style={styles.emptyText}>Assessment complete.</Text>
          {pdfUrl ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={function () { Linking.openURL(pdfUrl); }}
            >
              <Text style={styles.nextBtnText}>View PDF</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

// ── Per-answer-type input renderers ───────────────────────────────
function defaultAnswerFor(question) {
  switch (question.answerType) {
    case 'text':        return '';
    case 'scale':       return null;
    case 'boolean':     return null;
    case 'multiselect': return [];
    default:            return '';
  }
}

function renderAnswerInput(question, value, onChange) {
  switch (question.answerType) {
    case 'text':
      return (
        <TextInput
          value={value || ''}
          onChangeText={onChange}
          placeholder="Type the answer"
          placeholderTextColor={colors.placeholder}
          style={styles.textInput}
        />
      );
    case 'scale': {
      var scale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      return (
        <View>
          <View style={styles.scaleRow}>
            {scale.map(function (n) {
              var selected = value === n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={function () { onChange(n); }}
                  style={[styles.scaleCircle, selected && styles.scaleCircleActive]}
                >
                  <Text style={[styles.scaleNum, selected && styles.scaleNumActive]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.scaleHint}>0 = no pain · 10 = worst pain</Text>
        </View>
      );
    }
    case 'boolean':
      return (
        <View style={styles.boolRow}>
          {[true, false].map(function (b) {
            var selected = value === b;
            return (
              <TouchableOpacity
                key={String(b)}
                onPress={function () { onChange(b); }}
                style={[styles.boolPill, selected && styles.pillActive]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                  {b ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    case 'multiselect': {
      var options = Array.isArray(question.options) ? question.options : [];
      var selected = Array.isArray(value) ? value : [];
      function toggle(opt) {
        if (selected.indexOf(opt) >= 0) {
          onChange(selected.filter(function (x) { return x !== opt; }));
        } else {
          onChange(selected.concat(opt));
        }
      }
      return (
        <View style={styles.multiRow}>
          {options.map(function (opt) {
            var on = selected.indexOf(opt) >= 0;
            return (
              <TouchableOpacity
                key={opt}
                onPress={function () { toggle(opt); }}
                style={[styles.multiPill, on && styles.pillActive]}
              >
                <Text style={[styles.pillText, on && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    default:
      return null;
  }
}

var styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
  },
  collapsedText: {
    marginTop: 4,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  body: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
    alignItems: 'stretch',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qCounter: { fontSize: fonts.sm, color: colors.textMedium, fontWeight: fonts.medium },
  skip:     { fontSize: fonts.sm, color: colors.primary, fontWeight: fonts.semibold },
  skipDisabled: { color: colors.textLight },
  questionText: { fontSize: fonts.md, color: colors.textDark, fontWeight: fonts.semibold },
  answerArea: { marginTop: 6 },

  textInput: {
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: fonts.sm, color: colors.textDark,
    backgroundColor: colors.inputBg,
  },

  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.2, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  scaleCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleNum: { fontSize: fonts.xs, color: colors.textDark, fontWeight: fonts.semibold },
  scaleNumActive: { color: colors.white },
  scaleHint: { marginTop: 6, fontSize: fonts.xs, color: colors.textLight, textAlign: 'center' },

  boolRow: { flexDirection: 'row', gap: 10 },
  boolPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', backgroundColor: colors.white,
  },

  multiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  multiPill: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },

  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.medium },
  pillTextActive: { color: colors.white, fontWeight: fonts.semibold },

  progressBar: {
    height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.primary },

  bottomRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  nextBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.primary,
  },
  nextBtnDisabled: { backgroundColor: colors.textLight },
  nextBtnText: { color: colors.white, fontWeight: fonts.semibold, fontSize: fonts.sm },

  errorText: { color: colors.error, fontSize: fonts.sm, marginTop: 4 },
  emptyText: { color: colors.textMedium, fontSize: fonts.sm, textAlign: 'center', marginTop: 6 },
});
