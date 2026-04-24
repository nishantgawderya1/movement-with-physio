// src/screens/exercises/ExerciseLibraryScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Exercise Library screen — Figma design.
// Backend dev: replace MOCK_EXERCISES with real API call.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import BottomTabBar from '../../components/BottomTabBar';
import { ROUTES } from '../../constants/routes';

// ── Mock data — replace with API calls ───────────────────────────────────────
const MOCK_EXERCISES = [
  {
    id: 1,
    name: 'Chin Tucks',
    description: 'Helps correct forward head posture',
    sets: 3,
    reps: 10,
    duration: 5,
    difficulty: 'Beginner',
    category: 'Neck',
    emoji: '🧘',
    emojiBg: '#D1FAE5',
  },
  {
    id: 2,
    name: 'Shoulder Blade Squeezes',
    description: 'Strengthens upper back muscles',
    sets: 3,
    reps: 12,
    duration: 6,
    difficulty: 'Beginner',
    category: 'Upper Back',
    emoji: '💪',
    emojiBg: '#FEF3C7',
  },
  {
    id: 3,
    name: 'Cat-Cow Stretch',
    description: 'Improves spinal flexibility',
    sets: 2,
    reps: 8,
    duration: 4,
    difficulty: 'Beginner',
    category: 'Lower Back',
    emoji: '🦾',
    emojiBg: '#FDE68A',
  },
  {
    id: 4,
    name: 'Elbow Flexion Stretch',
    description: 'Increases elbow range of motion',
    sets: 3,
    reps: 15,
    duration: 5,
    difficulty: 'Intermediate',
    category: 'Elbow',
    emoji: '🤸',
    emojiBg: '#BFDBFE',
  },
  {
    id: 5,
    name: 'Quad Stretch',
    description: 'Loosens tight quadriceps',
    sets: 2,
    reps: 10,
    duration: 4,
    difficulty: 'Beginner',
    category: 'Legs',
    emoji: '🦵',
    emojiBg: '#DDD6FE',
  },
  {
    id: 6,
    name: 'Hamstring Curl',
    description: 'Strengthens posterior leg muscles',
    sets: 3,
    reps: 12,
    duration: 7,
    difficulty: 'Intermediate',
    category: 'Legs',
    emoji: '🏋️',
    emojiBg: '#FCA5A5',
  },
];

const DIFFICULTY_CONFIG = {
  Beginner:     { bg: '#D1FAE5', text: '#059669' },
  Intermediate: { bg: '#DBEAFE', text: '#2563EB' },
  Advanced:     { bg: '#FEE2E2', text: '#DC2626' },
};

// ── Component ─────────────────────────────────────────────────────────────────
const ExerciseLibraryScreen = ({ navigation, route }) => {
  const [searchText,        setSearchText]        = useState('');
  const [activeFilter,      setActiveFilter]      = useState('All Exercises');
  const [selectedExercises, setSelectedExercises] = useState([]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Clear selection when returning from the assign flow with clearSelection param
  useFocusEffect(
    useCallback(() => {
      if (route.params?.clearSelection) {
        setSelectedExercises([]);
        // Reset the param so it doesn't re-fire on future focus events
        navigation.setParams({ clearSelection: false });
      }
    }, [route.params?.clearSelection]),
  );

  const toggleExercise = (exerciseId) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleAssignPress = () => {
    if (selectedExercises.length === 0) return;
    const exercisesToAssign = MOCK_EXERCISES.filter((e) => selectedExercises.includes(e.id));
    navigation.navigate(ROUTES.ASSIGN_FLOW, {
      screen: ROUTES.SELECT_CLIENT,
      params: { selectedExercises: exercisesToAssign },
    });
  };

  // Unique categories from mock data
  const categories = ['All Exercises', ...Array.from(new Set(MOCK_EXERCISES.map((e) => e.category)))];

  const filteredExercises = MOCK_EXERCISES.filter((e) => {
    const matchSearch =
      searchText.trim() === '' ||
      e.name.toLowerCase().includes(searchText.toLowerCase()) ||
      e.description.toLowerCase().includes(searchText.toLowerCase()) ||
      e.category.toLowerCase().includes(searchText.toLowerCase());

    const matchFilter = activeFilter === 'All Exercises' || e.category === activeFilter;

    return matchSearch && matchFilter;
  });

  const handleTabPress = (tabId) => {
    if (tabId === 'home') {
      navigation.navigate(ROUTES.DASHBOARD);
    } else if (tabId === 'clients') {
      navigation.navigate(ROUTES.CLIENTS);
    } else if (tabId === 'messages') {
      navigation.navigate(ROUTES.MESSAGES);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Exercise Library</Text>
          <Text style={styles.subtitle}>{MOCK_EXERCISES.length} Exercises Available</Text>
        </View>
        <TouchableOpacity
          style={[styles.assignBtn, selectedExercises.length === 0 && styles.assignBtnInactive]}
          onPress={handleAssignPress}
          activeOpacity={selectedExercises.length > 0 ? 0.85 : 1}
        >
          {selectedExercises.length > 0 && (
            <View style={styles.assignCountBadge}>
              <Text style={styles.assignCountText}>{selectedExercises.length}</Text>
            </View>
          )}
          <Text style={styles.assignBtnText}>
            {selectedExercises.length > 0 ? 'Assign' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search + Filter ─────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color={colors.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Exercise"
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={16} color={colors.textDark} />
          <Text style={styles.filterBtnText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Filter Tabs ─────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabsContainer}
        style={styles.filterTabsScroll}
      >
        {categories.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Exercise Cards ───────────────────────────────────────────── */}
      <Animated.ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {filteredExercises.map((exercise) => {
          const diffCfg = DIFFICULTY_CONFIG[exercise.difficulty] ?? { bg: '#F3F4F6', text: '#6B7280' };
          const isSelected = selectedExercises.includes(exercise.id);
          return (
            <TouchableOpacity
              key={exercise.id}
              style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
              onPress={() => toggleExercise(exercise.id)}
              activeOpacity={0.85}
            >

              {/* Top row: emoji icon + difficulty badge + selection check */}
              <View style={styles.cardTopRow}>
                <View style={[styles.emojiWrap, { backgroundColor: exercise.emojiBg }]}>
                  <Text style={styles.emojiText}>{exercise.emoji}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.difficultyBadge, { backgroundColor: diffCfg.bg }]}>
                    <Text style={[styles.difficultyText, { color: diffCfg.text }]}>{exercise.difficulty}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </View>
              </View>

              {/* Name + description */}
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDesc}>{exercise.description}</Text>

              {/* Sets × reps • duration */}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {exercise.sets} sets × {exercise.reps} reps
                </Text>
                <View style={styles.metaDot} />
                <Text style={[styles.metaText, styles.metaDuration]}>{exercise.duration} min</Text>
              </View>

              {/* Category tag */}
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{exercise.category}</Text>
              </View>

            </TouchableOpacity>
          );
        })}
        <View style={{ height: 16 }} />
      </Animated.ScrollView>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────── */}
      <BottomTabBar activeTab="exercise" onTabPress={handleTabPress} />

    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl,
    color: colors.textDark,
    lineHeight: 26,
  },
  subtitle: { fontSize: fonts.xs, color: colors.textMedium, marginTop: 1 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  assignBtnInactive: {
    backgroundColor: '#94A3B8',
  },
  assignBtnText: {
    fontSize: fonts.sm, fontWeight: fonts.semibold, color: colors.white,
  },
  assignCountBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  assignCountText: {
    fontSize: 10, fontWeight: fonts.bold, color: colors.primary,
  },

  // Search + Filter row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: colors.white,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: {
    flex: 1, fontSize: fonts.sm, color: colors.textDark, paddingVertical: 0,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 40, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  filterBtnText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.medium },

  // Category tabs
  filterTabsScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    maxHeight: 48,
  },
  filterTabsContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: fonts.sm, fontWeight: fonts.medium, color: colors.textMedium,
  },
  filterTabTextActive: {
    color: colors.white,
  },

  // Exercise list
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  emojiWrap: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  emojiText: { fontSize: 24 },
  difficultyBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  difficultyText: { fontSize: fonts.xs, fontWeight: fonts.semibold },

  exerciseName: {
    fontSize: fonts.md, fontWeight: fonts.semibold,
    color: colors.textDark, marginBottom: 4,
  },
  exerciseDesc: {
    fontSize: fonts.sm, color: colors.textMedium,
    marginBottom: 10, lineHeight: 18,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  metaText: { fontSize: fonts.sm, color: colors.textMedium },
  metaDot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: colors.textLight,
  },
  metaDuration: { color: colors.primary, fontWeight: fonts.semibold },

  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  categoryTagText: {
    fontSize: fonts.xs, color: colors.textMedium,
  },
});

export default ExerciseLibraryScreen;
