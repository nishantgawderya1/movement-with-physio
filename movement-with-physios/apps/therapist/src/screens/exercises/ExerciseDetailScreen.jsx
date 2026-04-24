// screens/exercises/ExerciseDetailScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown when "View Exercise →" is tapped on an exercise card in the chat.
// Receives route.params.exercise = { id, name, sets, reps, duration, [description],
//                                    [difficulty], [category], [emoji], [emojiBg] }
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

const DIFFICULTY_CONFIG = {
  Beginner:     { bg: '#D1FAE5', text: '#059669' },
  Intermediate: { bg: '#DBEAFE', text: '#2563EB' },
  Advanced:     { bg: '#FEE2E2', text: '#DC2626' },
};

// Stat pill component
const StatPill = ({ icon, label, value, accent }) => (
  <View style={[styles.statPill, accent && styles.statPillAccent]}>
    <Text style={styles.statPillIcon}>{icon}</Text>
    <Text style={[styles.statPillValue, accent && styles.statPillValueAccent]}>{value}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

const ExerciseDetailScreen = ({ navigation, route }) => {
  // ── Pull exercise from params ─────────────────────────────────────────────
  const exercise = route?.params?.exercise ?? {
    name: 'Exercise',
    sets: 3,
    reps: 10,
    duration: '5 min',
    description: 'No description provided.',
    difficulty: 'Beginner',
    category: 'General',
    emoji: '🏋️',
    emojiBg: '#D1FAE5',
  };

  const diffCfg = DIFFICULTY_CONFIG[exercise.difficulty] ?? { bg: '#F3F4F6', text: '#6B7280' };

  // ── Entrance animations ───────────────────────────────────────────────────
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const iconBounce  = useRef(new Animated.Value(0.4)).current;
  const bodyFade    = useRef(new Animated.Value(0)).current;
  const bodySlide   = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Header slides in from top
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, speed: 16, bounciness: 6, useNativeDriver: true }),
    ]).start();

    // Emoji icon bounces in (slight delay)
    setTimeout(() => {
      Animated.spring(iconBounce, {
        toValue: 1,
        speed: 14,
        bounciness: 12,
        useNativeDriver: true,
      }).start();
    }, 100);

    // Body fades up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bodyFade,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(bodySlide, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
      ]).start();
    }, 180);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Exercise Detail
        </Text>
        {/* Right placeholder for symmetric layout */}
        <View style={{ width: 36 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroCard,
            { opacity: bodyFade, transform: [{ translateY: bodySlide }] },
          ]}
        >
          {/* Animated emoji illustration */}
          <Animated.View
            style={[
              styles.emojiWrap,
              { backgroundColor: exercise.emojiBg ?? '#D1FAE5' },
              { transform: [{ scale: iconBounce }] },
            ]}
          >
            <Text style={styles.emojiText}>{exercise.emoji ?? '🏋️'}</Text>
          </Animated.View>

          {/* Name */}
          <Text style={styles.exerciseName}>{exercise.name}</Text>

          {/* Difficulty + Category badges */}
          <View style={styles.badgeRow}>
            {exercise.difficulty && (
              <View style={[styles.badge, { backgroundColor: diffCfg.bg }]}>
                <Text style={[styles.badgeText, { color: diffCfg.text }]}>
                  {exercise.difficulty}
                </Text>
              </View>
            )}
            {exercise.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{exercise.category}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.statsRow,
            { opacity: bodyFade, transform: [{ translateY: bodySlide }] },
          ]}
        >
          <StatPill icon="🔁" label="Sets" value={exercise.sets ?? '—'} />
          <StatPill icon="💧" label="Reps" value={exercise.reps ?? '—'} />
          <StatPill icon="⏱️" label="Duration" value={exercise.duration ?? '—'} accent />
        </Animated.View>

        {/* ── Description card ──────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.sectionCard,
            { opacity: bodyFade, transform: [{ translateY: bodySlide }] },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>How to perform</Text>
          </View>
          <Text style={styles.description}>
            {exercise.description ??
              `Perform ${exercise.sets ?? 3} sets of ${exercise.reps ?? 10} repetitions with controlled, smooth movement. Rest 30–60 seconds between sets. Focus on form over speed.`}
          </Text>
        </Animated.View>

        {/* ── Tips card ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.sectionCard,
            { opacity: bodyFade, transform: [{ translateY: bodySlide }] },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccentBar, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.sectionTitle}>Tips</Text>
          </View>
          {[
            'Breathe steadily throughout each repetition.',
            'Stop if you feel sharp pain — contact your therapist.',
            'Stay hydrated and warm up before starting.',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder ?? '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fonts.md ?? 16,
    fontWeight: '700',
    color: colors.textDark,
    flex: 1,
    textAlign: 'center',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder ?? '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  emojiWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emojiText: {
    fontSize: 46,
  },
  exerciseName: {
    fontFamily: fontFamilies?.instrumentSerif ?? undefined,
    fontSize: (fonts.xl ?? 20) + 2,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: fonts.xs ?? 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryBadgeText: {
    fontSize: fonts.xs ?? 11,
    color: '#64748B',
    fontWeight: '600',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statPillAccent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  statPillIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statPillValue: {
    fontSize: fonts.md ?? 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  statPillValueAccent: {
    color: '#16A34A',
  },
  statPillLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section cards
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#22C55E',
  },
  sectionTitle: {
    fontSize: fonts.md ?? 16,
    fontWeight: '700',
    color: colors.textDark,
  },
  description: {
    fontSize: fonts.sm ?? 14,
    color: '#4B5563',
    lineHeight: 22,
  },

  // Tips
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  tipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginTop: 7,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: fonts.sm ?? 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});

export default ExerciseDetailScreen;
