import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

var SCREEN_WIDTH = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────────────
// Mock exercise data
// ─────────────────────────────────────────────────────────────
const SESSION_EXERCISES = [
  {
    id: 1,
    name: 'Neck Rolls',
    sets: 3,
    reps: 10,
    restSeconds: 30,
    duration: null,
    instruction: 'Slowly roll your neck in full circles. Keep shoulders relaxed.',
    targetArea: 'Neck & Upper Shoulders',
    difficulty: 'Easy',
  },
  {
    id: 2,
    name: 'Shoulder Blade Squeeze',
    sets: 3,
    reps: 12,
    restSeconds: 30,
    duration: null,
    instruction: 'Pull shoulder blades together, hold 3 seconds. Keep chest open.',
    targetArea: 'Upper Back',
    difficulty: 'Easy',
  },
  {
    id: 3,
    name: 'Cat-Cow Stretch',
    sets: 2,
    reps: null,
    restSeconds: 20,
    duration: 45,
    instruction: 'On all fours, alternate between arching and rounding your spine.',
    targetArea: 'Spine & Core',
    difficulty: 'Easy',
  },
  {
    id: 4,
    name: 'Hip Flexor Stretch',
    sets: 2,
    reps: null,
    restSeconds: 30,
    duration: 40,
    instruction: 'Kneel on one knee, push hips forward gently. Hold the stretch.',
    targetArea: 'Hips & Lower Back',
    difficulty: 'Medium',
  },
  {
    id: 5,
    name: 'Seated Forward Bend',
    sets: 3,
    reps: null,
    restSeconds: 20,
    duration: 30,
    instruction: 'Sit tall, slowly reach toward toes. Do not force — feel the stretch.',
    targetArea: 'Hamstrings & Lower Back',
    difficulty: 'Easy',
  },
];

var TOTAL = SESSION_EXERCISES.length;
var TOTAL_SETS = SESSION_EXERCISES.reduce(function (acc, ex) { return acc + ex.sets; }, 0);

// ─────────────────────────────────────────────────────────────
// Circular countdown ring (SVG)
// ─────────────────────────────────────────────────────────────
var RING_DIAMETER = 120;
var RING_STROKE = 8;
var RING_RADIUS = (RING_DIAMETER - RING_STROKE) / 2;
var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * SVG circular countdown ring used for duration-based exercises.
 * @param {{ seconds: number, total: number }} props
 */
function CountdownRing({ seconds, total }) {
  var safeTotal = total > 0 ? total : 1;
  var progress = seconds / safeTotal;
  var strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={ringStyles.wrapper}>
      <Svg width={RING_DIAMETER} height={RING_DIAMETER}>
        {/* Track */}
        <Circle
          cx={RING_DIAMETER / 2}
          cy={RING_DIAMETER / 2}
          r={RING_RADIUS}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* Fill */}
        <Circle
          cx={RING_DIAMETER / 2}
          cy={RING_DIAMETER / 2}
          r={RING_RADIUS}
          stroke="rgba(255,255,255,1)"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE + ' ' + RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={
            'rotate(-90 ' + RING_DIAMETER / 2 + ' ' + RING_DIAMETER / 2 + ')'
          }
        />
      </Svg>
      <View style={ringStyles.overlay}>
        <Text style={ringStyles.seconds}>{seconds}</Text>
        <Text style={ringStyles.secondsLabel}>seconds</Text>
      </View>
    </View>
  );
}

var ringStyles = StyleSheet.create({
  wrapper: {
    width: RING_DIAMETER,
    height: RING_DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 16,
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    fontFamily: fonts.heading.regular,
    fontSize: 40,
    color: colors.textOnPrimary,
    lineHeight: 40 * 1.1,
  },
  secondsLabel: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});

// ─────────────────────────────────────────────────────────────
// Session Complete screen
// ─────────────────────────────────────────────────────────────

/**
 * Full-screen session-complete view with animated checkmark,
 * stats, pain check-in, and return-home button.
 * @param {{ navigation: object, elapsedMs: number }} props
 */
function SessionCompleteView({ navigation, elapsedMs }) {
  var scaleAnim = useRef(new Animated.Value(0)).current;
  var [selectedPain, setSelectedPain] = useState(null);
  var insets = useSafeAreaInsets();

  useEffect(function () {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  var elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
  var painLevels = [1, 3, 5, 7, 9];

  return (
    <ScrollView
      style={completeStyles.scroll}
      contentContainerStyle={[
        completeStyles.content,
        { paddingBottom: 40 + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated checkmark */}
      <Animated.View style={[completeStyles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark" size={48} color={colors.textOnPrimary} />
      </Animated.View>

      <Text style={completeStyles.title}>Session Complete!</Text>
      <Text style={completeStyles.subtitle}>Great work, Priya!</Text>

      {/* Stats row */}
      <View style={completeStyles.statsRow}>
        <View style={completeStyles.statChip}>
          <Text style={completeStyles.statValue}>{TOTAL}</Text>
          <Text style={completeStyles.statLabel}>Exercises</Text>
        </View>
        <View style={completeStyles.statChip}>
          <Text style={completeStyles.statValue}>{elapsedMinutes}min</Text>
          <Text style={completeStyles.statLabel}>Duration</Text>
        </View>
        <View style={completeStyles.statChip}>
          <Text style={completeStyles.statValue}>{TOTAL_SETS}</Text>
          <Text style={completeStyles.statLabel}>Sets Done</Text>
        </View>
      </View>

      {/* Pain check-in card */}
      <View style={completeStyles.painCard}>
        <Text style={completeStyles.painTitle}>How's your pain level now?</Text>
        <Text style={completeStyles.painSub}>vs 5/10 before session</Text>
        <View style={completeStyles.painRow}>
          {painLevels.map(function (level) {
            var isSelected = selectedPain === level;
            return (
              <Pressable
                key={level}
                style={[completeStyles.painCircle, isSelected && completeStyles.painCircleSelected]}
                onPress={function () { setSelectedPain(level); }}
              >
                <Text
                  style={[
                    completeStyles.painCircleText,
                    isSelected && completeStyles.painCircleTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Return home button */}
      <Pressable
        style={completeStyles.homeBtn}
        onPress={function () {
          navigation.reset({ index: 0, routes: [{ name: PATIENT_ROUTES.HOME }] });
        }}
      >
        <Text style={completeStyles.homeBtnText}>Save & Return Home</Text>
      </Pressable>
    </ScrollView>
  );
}

var completeStyles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xxl,
    color: colors.textDark,
    marginTop: 24,
    lineHeight: fonts.xxl * 1.35,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.lg,
    color: colors.textMedium,
    marginTop: 6,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.heading.semibold,
    fontSize: fonts.lg,
    color: colors.textDark,
  },
  statLabel: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textMedium,
    marginTop: 4,
  },
  painCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  painTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.md,
    color: colors.textDark,
    lineHeight: fonts.md * 1.35,
    marginBottom: 4,
  },
  painSub: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textMedium,
    marginBottom: 16,
  },
  painRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  painCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  painCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  painCircleText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: colors.textDark,
  },
  painCircleTextSelected: {
    color: colors.textOnPrimary,
  },
  homeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  homeBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: colors.textOnPrimary,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────
// Main SessionScreen
// ─────────────────────────────────────────────────────────────

/**
 * Exercise player screen for a guided physio session.
 * Supports rep-based and duration-based exercises, rest phases,
 * pause/resume, skip, and a completion summary view.
 *
 * @param {{ navigation: object }} props
 */
export default function SessionScreen({ navigation }) {
  var insets = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────
  var [currentIndex, setCurrentIndex] = useState(0);
  var [phase, setPhase] = useState('exercise'); // 'exercise' | 'rest' | 'complete'
  var [isPaused, setIsPaused] = useState(false);
  var [currentSet, setCurrentSet] = useState(1);
  var [timer, setTimer] = useState(
    SESSION_EXERCISES[0].duration !== null ? SESSION_EXERCISES[0].duration : 0
  );
  var [sessionStartTime] = useState(Date.now());
  var [elapsedLabel, setElapsedLabel] = useState('0 min');

  // Keep a ref in sync with timer state so interval callbacks can read the
  // latest value without being re-created on every tick.
  var timerRef = useRef(timer);
  useEffect(function () { timerRef.current = timer; }, [timer]);

  // Animated progress bar width (0–SCREEN_WIDTH)
  var progressAnim = useRef(new Animated.Value(0)).current;

  var exercise = SESSION_EXERCISES[currentIndex];
  var isRepBased = exercise.reps !== null;
  var isDurationBased = exercise.duration !== null;
  var nextExercise =
    currentIndex + 1 < TOTAL ? SESSION_EXERCISES[currentIndex + 1] : null;

  // ── Elapsed label updater ───────────────────────────────────
  useEffect(function () {
    var id = setInterval(function () {
      var elapsed = Date.now() - sessionStartTime;
      var mins = Math.floor(elapsed / 60000);
      setElapsedLabel(mins < 1 ? '< 1 min' : mins + ' min');
    }, 10000);
    return function () { clearInterval(id); };
  }, [sessionStartTime]);

  // ── Animated progress bar ───────────────────────────────────
  useEffect(
    function () {
      var targetFraction = TOTAL > 1 ? currentIndex / (TOTAL - 1) : 1;
      Animated.timing(progressAnim, {
        toValue: targetFraction,
        duration: 400,
        useNativeDriver: false,
      }).start();
    },
    [currentIndex]
  );

  // ── Duration countdown / rest countdown ────────────────────
  // We intentionally exclude `timer` from the dep array so the interval is
  // not recreated on every tick. The ref `timerRef` provides the live value.
  useEffect(
    function () {
      if (phase === 'complete') return;
      if (isPaused) return;

      if (phase === 'exercise' && isDurationBased) {
        if (timerRef.current <= 0) return;
        var id = setInterval(function () {
          setTimer(function (t) {
            var next = t - 1;
            timerRef.current = next;
            if (next <= 0) {
              clearInterval(id);
              handleExerciseComplete();
              return 0;
            }
            return next;
          });
        }, 1000);
        return function () { clearInterval(id); };
      }

      if (phase === 'rest') {
        if (timerRef.current <= 0) {
          advanceExercise();
          return;
        }
        var restId = setInterval(function () {
          setTimer(function (t) {
            var next = t - 1;
            timerRef.current = next;
            if (next <= 0) {
              clearInterval(restId);
              advanceExercise();
              return 0;
            }
            return next;
          });
        }, 1000);
        return function () { clearInterval(restId); };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, isPaused, currentIndex, isDurationBased]
  );

  // ── Logic functions ─────────────────────────────────────────
  function startRestTimer() {
    setTimer(exercise.restSeconds);
    setPhase('rest');
  }

  function advanceExercise() {
    var nextIndex = currentIndex + 1;
    if (nextIndex < TOTAL) {
      var nextEx = SESSION_EXERCISES[nextIndex];
      setCurrentIndex(nextIndex);
      setCurrentSet(1);
      setTimer(nextEx.duration !== null ? nextEx.duration : 0);
      setPhase('exercise');
    } else {
      setPhase('complete');
    }
  }

  function handleRepComplete() {
    if (currentSet < exercise.sets) {
      setCurrentSet(function (s) { return s + 1; });
      startRestTimer();
    } else {
      advanceExercise();
    }
  }

  function handleExerciseComplete() {
    if (currentSet < exercise.sets) {
      setCurrentSet(function (s) { return s + 1; });
      setTimer(exercise.duration);
      startRestTimer();
    } else {
      advanceExercise();
    }
  }

  function handleSkipExercise() {
    advanceExercise();
  }

  function handleSkipRest() {
    advanceExercise();
  }

  function handleBack() {
    Alert.alert(
      'End session?',
      'Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: function () { navigation.goBack(); },
        },
      ]
    );
  }

  // ── Complete phase ──────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <View style={styles.flex}>
        <SessionCompleteView
          navigation={navigation}
          elapsedMs={Date.now() - sessionStartTime}
        />
      </View>
    );
  }

  // ── Hero card content ───────────────────────────────────────
  function renderExerciseContent() {
    if (phase === 'rest') {
      return (
        <View style={styles.restContent}>
          <Text style={styles.restHeading}>Rest Time</Text>
          <Text style={styles.restTimer}>{timer}</Text>
          {nextExercise && (
            <Text style={styles.upNext}>Up next: {nextExercise.name}</Text>
          )}
          <Pressable style={styles.skipRestBtn} onPress={handleSkipRest}>
            <Text style={styles.skipRestText}>Skip Rest</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View>
        {/* Difficulty badge */}
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{exercise.difficulty}</Text>
        </View>


        {/* Name */}
        <Text style={styles.exerciseName}>{exercise.name}</Text>

        {/* Target area */}
        <View style={styles.targetRow}>
          <Ionicons name="locate-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.targetText}>{exercise.targetArea}</Text>
        </View>

        {/* Instruction */}
        <Text style={styles.instruction}>{exercise.instruction}</Text>

        {/* Set indicator */}
        <Text style={styles.setIndicator}>
          Set {currentSet} of {exercise.sets}
        </Text>

        {/* Rep-based */}
        {isRepBased && (
          <View>
            {/* Rep target display */}
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <Text style={{
                fontFamily: fonts.heading.semibold,
                fontSize: 52,
                color: '#FFFFFF',
                lineHeight: 56,
              }}>
                {exercise.reps}
              </Text>
              <Text style={{
                fontFamily: fonts.body.medium,
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                letterSpacing: 2,
                marginTop: 4,
              }}>
                REPS
              </Text>
            </View>

            {/* Single done button */}
            <Pressable
              onPress={handleRepComplete}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.6)',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 40,
                alignSelf: 'center',
              }}
            >
              <Text style={{
                fontFamily: fonts.body.semibold,
                fontSize: 15,
                color: '#FFFFFF',
                letterSpacing: 0.3,
              }}>
                Done — Set {currentSet} of {exercise.sets}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Duration-based */}
        {isDurationBased && (
          <CountdownRing seconds={timer} total={exercise.duration} />
        )}
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>
        <Text style={styles.sessionTitle}>Morning Mobility</Text>
        <Text style={styles.elapsedLabel}>{elapsedLabel}</Text>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          Exercise {currentIndex + 1} of {TOTAL}
        </Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* HERO CARD */}
      <View style={styles.heroCard}>{renderExerciseContent()}</View>

      {/* EXERCISE STRIP */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {SESSION_EXERCISES.map(function (ex, idx) {
          var isCompleted = idx < currentIndex;
          var isCurrent = idx === currentIndex;
          return (
            <View
              key={ex.id}
              style={[
                styles.stripPill,
                isCompleted && styles.stripPillCompleted,
                isCurrent && styles.stripPillCurrent,
              ]}
            >
              {isCompleted && (
                <Ionicons name="checkmark" size={11} color={colors.textOnPrimary} style={styles.stripCheck} />
              )}
              <Text
                style={[
                  styles.stripPillText,
                  isCompleted && styles.stripPillTextCompleted,
                  isCurrent && styles.stripPillTextCurrent,
                ]}
                numberOfLines={1}
              >
                {ex.name}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* FOOTER CONTROLS */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        {/* Pause / Resume */}
        <Pressable
          style={styles.footerBtn}
          onPress={function () { setIsPaused(function (p) { return !p; }); }}
        >
          <Ionicons
            name={isPaused ? 'play-circle' : 'pause-circle'}
            size={32}
            color={colors.primary}
          />
          <Text style={styles.footerBtnLabel}>
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </Pressable>

        {/* Skip */}
        <Pressable style={styles.footerBtn} onPress={handleSkipExercise}>
          <Ionicons name="play-skip-forward" size={28} color={colors.textMedium} />
          <Text style={styles.footerBtnLabel}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

var styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sessionTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.sm,
    color: colors.textDark,
    flex: 1,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.35,
  },
  elapsedLabel: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textMedium,
    width: 48,
    textAlign: 'right',
  },

  // Progress bar
  progressSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  progressLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textMedium,
    textAlign: 'right',
    marginBottom: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.primary,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    marginBottom: 12,
  },

  // Difficulty badge — frosted pill, always readable on teal
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  difficultyText: {
    fontFamily: fonts.body.semibold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Exercise name
  exerciseName: {
    fontFamily: fonts.heading.semibold,
    fontSize: 26,
    color: colors.textOnPrimary,
    lineHeight: 26 * 1.3,
    marginBottom: 8,
  },

  // Target area
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  targetText: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: 'rgba(255,255,255,0.8)',
  },

  // Instruction
  instruction: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // Set indicator
  setIndicator: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },

  // Rest content
  restContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restHeading: {
    fontFamily: fonts.heading.regular,
    fontSize: 22,
    color: colors.textOnPrimary,
    marginBottom: 8,
    lineHeight: 22 * 1.35,
  },
  restTimer: {
    fontFamily: fonts.heading.regular,
    fontSize: 48,
    color: colors.textOnPrimary,
    lineHeight: 52,
    marginBottom: 10,
  },
  upNext: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  skipRestBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 99,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  skipRestText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: colors.textOnPrimary,
  },

  // Exercise strip
  strip: {
    marginBottom: 4,
  },
  stripContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  stripPill: {
    flexDirection: 'row',
    width: 90,
    height: 36,
    borderRadius: 99,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 3,
  },
  stripPillCompleted: {
    backgroundColor: colors.primary,
  },
  stripPillCurrent: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  stripCheck: {
    flexShrink: 0,
  },
  stripPillText: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textMedium,
    flexShrink: 1,
  },
  stripPillTextCompleted: {
    color: colors.textOnPrimary,
  },
  stripPillTextCurrent: {
    color: colors.primary,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  footerBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
  footerBtnLabel: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textMedium,
  },
});
