// src/screens/AssignFlow/ReviewAssignmentScreen.js
// Step 3 of the Assign Exercises flow — confirm and submit assignment.

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import StepProgressBar from '../../components/assign/StepProgressBar';
import { ROUTES } from '../../constants/routes';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// ── Detail Grid Cell ─────────────────────────────────────────────────────────
const DetailCell = ({ icon, label, value }) => (
  <View style={detailStyles.cell}>
    <View style={detailStyles.iconWrap}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={detailStyles.label}>{label}</Text>
    <Text style={detailStyles.value}>{value}</Text>
  </View>
);

const detailStyles = StyleSheet.create({
  cell: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: fonts.xs, color: colors.textLight,
    marginBottom: 3,
  },
  value: {
    fontSize: fonts.sm, fontWeight: fonts.semibold,
    color: colors.textDark,
  },
});

// ── Success Modal ─────────────────────────────────────────────────────────────
const SuccessModal = ({ visible, clientName, onDone }) => {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.6);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[successStyles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[successStyles.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Green checkmark circle */}
          <View style={successStyles.iconCircle}>
            <Ionicons name="checkmark" size={36} color={colors.white} />
          </View>

          <Text style={successStyles.heading}>All Done!</Text>
          <Text style={successStyles.subtext}>
            Exercises assigned to{'\n'}
            <Text style={successStyles.clientName}>{clientName}</Text>
          </Text>

          <TouchableOpacity style={successStyles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={successStyles.doneBtnText}>Back to Library</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const successStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  heading: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    color: colors.textDark,
    marginBottom: 10,
  },
  subtext: {
    fontSize: fonts.md,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  clientName: {
    fontWeight: fonts.bold,
    color: colors.textDark,
  },
  doneBtn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.white,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const ReviewAssignmentScreen = ({ navigation, route }) => {
  const { selectedExercises = [], selectedClient, scheduleConfig = {} } = route.params ?? {};
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAssign = () => {
    // ── MOCK — Backend developer: replace this block only ────────────────────
    // TODO: call AssignmentService.assignExercises({ exercises: selectedExercises, clientId: selectedClient.id, schedule: scheduleConfig })
    // ─────────────────────────────────────────────────────────────────────────
    setShowSuccess(true);
  };

  const handleDone = () => {
    setShowSuccess(false);
    // Navigate all the way back to ExerciseLibrary and clear selection
    navigation.navigate(ROUTES.EXERCISES, { clearSelection: true });
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Assign Exercises</Text>
          <Text style={styles.subtitle}>
            {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
      </View>

      {/* ── Step Progress ────────────────────────────────────────────── */}
      <StepProgressBar currentStep={4} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Section Header ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Review Assignment</Text>
          <Text style={styles.sectionDesc}>Confirm all details before assigning</Text>
        </View>

        {/* ── Assigning To ─────────────────────────────────────────── */}
        <Text style={styles.cardLabel}>Assigning To</Text>
        <View style={styles.clientCard}>
          <View style={[styles.avatar, { backgroundColor: selectedClient?.avatarColor ?? '#6366F1' }]}>
            <Text style={styles.avatarText}>{selectedClient?.initials ?? '??'}</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{selectedClient?.name ?? '—'}</Text>
            <Text style={styles.clientCondition}>{selectedClient?.condition ?? '—'}</Text>
          </View>
          <View style={styles.exerciseCountBadge}>
            <Text style={styles.exerciseCountText}>{selectedExercises.length} ex.</Text>
          </View>
        </View>

        {/* ── Schedule Summary ─────────────────────────────────────── */}
        <Text style={[styles.cardLabel, { marginTop: 8 }]}>Schedule</Text>
        <View style={styles.scheduleCard}>
          <View style={styles.detailGrid}>
            <DetailCell
              icon="calendar-outline"
              label="Start Date"
              value={formatDate(scheduleConfig.startDate)}
            />
            <DetailCell
              icon="time-outline"
              label="Duration"
              value={scheduleConfig.duration ?? '—'}
            />
            <DetailCell
              icon="repeat-outline"
              label="Frequency"
              value={scheduleConfig.frequency ?? '—'}
            />
            <DetailCell
              icon="sunny-outline"
              label="Time"
              value={scheduleConfig.timeOfDay ?? '—'}
            />
          </View>
        </View>

        {/* ── Exercise Count Note ──────────────────────────────────── */}
        <View style={styles.noteRow}>
          <Ionicons name="barbell-outline" size={16} color={colors.primary} />
          <Text style={styles.noteText}>
            {selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} will be included in this program
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Actions ──────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.assignButton} onPress={handleAssign} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
          <Text style={styles.assignButtonText}>Assign Exercises</Text>
        </TouchableOpacity>
      </View>

      {/* ── Success Modal ───────────────────────────────────────────── */}
      <SuccessModal
        visible={showSuccess}
        clientName={selectedClient?.name ?? ''}
        onDone={handleDone}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl, color: colors.textDark, lineHeight: 26,
  },
  subtitle: { fontSize: fonts.xs, color: colors.textMedium, marginTop: 1 },

  scroll: { paddingHorizontal: 18, paddingTop: 20 },

  sectionHeader: { marginBottom: 22 },
  sectionTitle: {
    fontSize: fonts.lg, fontWeight: fonts.bold, color: colors.textDark, marginBottom: 4,
  },
  sectionDesc: { fontSize: fonts.sm, color: colors.textLight, lineHeight: 18 },

  cardLabel: {
    fontSize: fonts.sm, fontWeight: fonts.semibold,
    color: colors.textMedium, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Client card
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: fonts.sm, fontWeight: fonts.bold, color: colors.white,
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark, marginBottom: 3,
  },
  clientCondition: { fontSize: fonts.sm, color: colors.textLight },
  exerciseCountBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  exerciseCountText: {
    fontSize: fonts.xs, fontWeight: fonts.semibold, color: colors.primary,
  },

  // Schedule card
  scheduleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Note row
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    flex: 1, fontSize: fonts.sm, color: colors.primary, lineHeight: 18,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.cardBorder,
  },
  backButton: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  backButtonText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textMedium,
  },
  assignButton: {
    flex: 2, height: 50, borderRadius: 25,
    backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  assignButtonText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.white,
  },
});

export default ReviewAssignmentScreen;
